/**
 * The handset the input camera is drawn as.
 *
 * This was procedural — an extruded rounded rectangle with a camera plateau
 * and three circles for lenses. It had the right dimensions and the wrong
 * everything else: no chamfer catching a highlight, no antenna band, no
 * lens rings, so it read as a phone-shaped object rather than a phone. At the
 * scale it is drawn (see `PHONE_SCALE` in `input-camera.js`) that gap is
 * visible, and the point of the object is to say "someone stood here holding
 * a phone" without the reader having to be told.
 *
 * So it is a real model now: "iPhone 17 Pro" by Ranguel, CC BY 4.0 — see
 * `assets/models/README.md` for provenance, the attribution obligation, and
 * the exact commands that took it from 8.9 MB to 246 KB. That makes it the
 * second vendor exception in the repository, and `GLTFLoader` the file that
 * pays for it; the argument is recorded in `assets/js/vendor/README.md`.
 *
 * Two things the model needs that this scene does not otherwise have:
 *
 * - **A world to reflect.** Its materials are physically based and mostly
 *   metal, and metal with nothing to reflect is black. The stage builds one
 *   studio (`environment.js`) and hands the prefiltered map here. Assigned per
 *   material, never to `scene.environment`: nothing else on this stage is lit
 *   and nothing else should start being lit by accident.
 * - **Its own axes discovered rather than assumed.** The alignment below
 *   measures the model instead of hardcoding a quaternion off a Sketchfab
 *   export's node chain: longest extent is the phone's length, shortest is its
 *   thickness, and the camera lenses say which face is the back. Swap the glb
 *   for another handset and it still lands the right way up.
 *
 * The screen shows the source video, because the phone is filming: a
 * viewfinder showing what the frustum in front of it is pointed at says "in
 * use" more cheaply than any amount of surface detail. It is our own plane
 * laid over the model's OLED mesh rather than a texture swapped into the
 * model's material — the material carries a `KHR_texture_transform`, so the
 * video would have inherited whatever UV offset the wallpaper needed.
 */
import {
  Box3,
  DirectionalLight,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  ShapeGeometry,
  Vector3,
} from "../vendor/three.module.js";
import { GLTFLoader } from "../vendor/loaders/GLTFLoader.js";
import { NO_GLOW_LAYER } from "./bloom.js";
import { roundedRectShape } from "./rounded.js";
import { createViewfinder } from "./viewfinder.js";

const MODEL_URL = new URL("../../models/iphone-17-pro.glb", import.meta.url);

/** Body length in metres. The model is scaled to this, whatever it shipped as. */
const BODY_LENGTH = 0.1476;
/**
 * The two landmarks the alignment steers by. They have to be parts that sit
 * decisively off-centre, which is why this is `Camera_Lens` and not the whole
 * rear cluster: `Camera_filter` is one mesh spanning the entire body, so its
 * centre is the body's centre and the sign it yields is noise. Reading it as a
 * landmark is what stood the first build of this on its head.
 */
const LENS_MATERIAL = /^Camera_Lens$/;
/** The lit screen mesh: says which face is the front, and where the video goes. */
const SCREEN_MATERIAL = /^OLED$/;
/**
 * How much of the display mesh the picture fills. The display already stops
 * short of the body, so borrowing another 4.5% on top of that read as a picture
 * sitting inside the screen rather than as the screen.
 */
const SCREEN_FILL = 1;
/**
 * Corner radius as a fraction of the picture's *width*. A phone's display
 * corners are famously round — about a sixth of the width — and squaring them
 * off is what made the video read as a rectangle stuck on top of the handset
 * instead of as the handset's screen.
 */
const SCREEN_RADIUS = 0.16;
/** Curve segments per corner. Four is plenty at the size this is ever drawn. */
const CORNER_SEGMENTS = 6;

const AXES = ["x", "y", "z"];

/**
 * The viewfinder's geometry: a rounded rectangle carrying UVs that fill it with
 * `aspect` without distorting it.
 *
 * Two things have to be fixed up. `ShapeGeometry` writes each vertex's own XY
 * as its UV, which is metres rather than 0…1, so the picture would be sampled
 * from a few thousandths of one corner of the frame. And the screen is 0.49
 * wide-to-tall against the video's 0.56, so mapping one onto the other squeezes
 * the picture by an eighth — visible on a face. Both are handled here by
 * centre-cropping the *shorter* axis, which is what a phone's own camera
 * preview does with a frame that does not match its screen.
 *
 * The crop is baked into the geometry rather than set as `texture.repeat`,
 * because the texture is the same object the frustum's image plane samples and
 * that one wants the whole frame.
 */
function screenGeometry(width, height, aspect) {
  const geometry = new ShapeGeometry(
    roundedRectShape(width, height, width * SCREEN_RADIUS),
    CORNER_SEGMENTS,
  );
  const uv = geometry.attributes.uv;
  const screenAspect = width / height;
  const scaleU = screenAspect > aspect ? 1 : aspect / screenAspect;
  const scaleV = screenAspect > aspect ? screenAspect / aspect : 1;
  for (let i = 0; i < uv.count; i += 1) {
    const u = uv.getX(i) / width + 0.5;
    const v = uv.getY(i) / height + 0.5;
    uv.setXY(i, 0.5 + (u - 0.5) / scaleU, 0.5 + (v - 0.5) / scaleV);
  }
  uv.needsUpdate = true;
  return geometry;
}

/** Union box of every mesh whose material name matches, or null if none do. */
function partBox(model, pattern) {
  const box = new Box3();
  let found = false;
  model.traverse((child) => {
    if (!child.isMesh || !pattern.test(child.material?.name ?? "")) return;
    box.union(new Box3().setFromObject(child));
    found = true;
  });
  return found ? box : null;
}

/**
 * Rotate `model` so its length runs +Y and its screen faces +Z, by measuring it.
 *
 * Three questions, three measurements. Which axis is which comes from the
 * extents — on a phone that is never ambiguous. Which end is the top comes
 * from the camera lenses, which are at the top of every handset ever made.
 * Which face is the front comes from the display. Nothing here is a constant
 * copied out of one exporter's node chain, so a different glb still lands the
 * right way up.
 *
 * @param {Object3D} model unparented, so every box below is in its own space
 * @returns {boolean} false if the model has no lens or no display to steer by
 */
function align(model) {
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());

  // Longest extent is the phone's length, shortest is its thickness.
  const byExtent = [...AXES].sort((a, b) => size[a] - size[b]);
  const thin = byExtent[0];
  const long = byExtent[2];

  const lens = partBox(model, LENS_MATERIAL);
  const screen = partBox(model, SCREEN_MATERIAL);
  if (!lens || !screen) return false;

  const up = new Vector3();
  up[long] = Math.sign(lens.getCenter(new Vector3())[long] - centre[long]) || 1;
  const front = new Vector3();
  front[thin] = Math.sign(screen.getCenter(new Vector3())[thin] - centre[thin]) || 1;

  const right = new Vector3().crossVectors(up, front);

  // Columns map world axes to model axes; the transpose is the inverse, which
  // is the way we want to travel.
  const rotation = new Matrix4().makeBasis(right, up, front).transpose();
  model.applyMatrix4(rotation);

  // Re-measure in the new pose and put the body's centre on the origin.
  const placed = new Box3().setFromObject(model);
  model.position.sub(placed.getCenter(new Vector3()));
  return true;
}

/**
 * @param {object} options
 * @param {Texture} options.environment prefiltered studio map, from the stage
 * @param {Texture|null} options.screen what the viewfinder shows
 * @param {number} options.aspect that picture's width over its height, for the
 *   crop. Defaults to portrait 9:16, which is what a phone shoots.
 * @returns {{group: Group, lights: Object3D[], setScreen: Function, setOpacity: Function, dispose: Function}}
 */
export function createPhone({ environment, screen = null, aspect = 9 / 16 } = {}) {
  const group = new Group();
  group.name = "phone";
  // Nothing is on screen until the model arrives; the frustum in front of it
  // already carries the meaning, so a missing handset degrades to "no handset"
  // rather than to a placeholder that has to be explained.
  group.visible = false;
  // Inner group, holding only the scale that normalises whatever the glb shipped
  // as down to `BODY_LENGTH`. The outer one stays free for the caller, which
  // scales the handset up for legibility and would otherwise be fighting this.
  const frame = new Group();
  group.add(frame);

  // One light, for the moving highlight. The environment does the rest, and a
  // second light would only wash out the contrast that makes metal look metal.
  const key = new DirectionalLight(0xffffff, 1.6);
  key.position.set(0.6, 1.0, 0.8);

  const screenMaterial = new MeshBasicMaterial({
    color: screen ? 0xffffff : 0x11131a,
    map: screen,
    transparent: true,
  });

  /**
   * The camera app over the video — see viewfinder.js. A screen playing a video
   * is a phone watching one; a screen with a record button on it is a phone
   * taking one, which is what act 1 is about.
   */
  const uiMaterial = new MeshBasicMaterial({ transparent: true, depthWrite: false });

  /**
   * Each material's full-strength opacity, and whether it writes depth when it
   * is at that strength. The handset is the one solid object in the scene, so
   * most of these do write — see `applyOpacity` for why that has to stop the
   * moment it starts fading.
   *
   * @type {Array<{material: Material, opacity: number, depthWrite: boolean}>}
   */
  const fading = [
    { material: screenMaterial, opacity: 1, depthWrite: screenMaterial.depthWrite },
    { material: uiMaterial, opacity: 1, depthWrite: uiMaterial.depthWrite },
  ];
  let opacity = 0;
  let disposed = false;
  let screenMesh = null;
  let uiMesh = null;
  const meshes = [];

  new GLTFLoader().load(
    MODEL_URL.href,
    (gltf) => {
      if (disposed) return;
      const model = gltf.scene;
      if (!align(model)) {
        console.warn("[pipeline] handset model has no lens or display to orient by");
        return;
      }

      let screenBox = null;
      model.traverse((child) => {
        if (!child.isMesh) return;
        meshes.push(child);
        // Off the glow layer with everything else that is a picture rather than
        // a line — bloom is for the wireframes.
        child.layers.set(NO_GLOW_LAYER);

        const material = child.material;
        if (!material || fading.some((entry) => entry.material === material)) return;

        // Refraction makes three re-render the scene into a transmission
        // buffer every frame. For two lens covers on an object this size that
        // is a whole extra pass to tint 200 pixels; plain alpha is
        // indistinguishable here and free.
        if (material.transmission > 0) {
          material.transmission = 0;
          material.opacity = Math.min(material.opacity, 0.45);
        }
        material.envMap = environment;
        material.envMapIntensity = 1;
        material.transparent = true;
        material.needsUpdate = true;
        fading.push({ material, opacity: material.opacity, depthWrite: material.depthWrite });

        if (SCREEN_MATERIAL.test(material.name ?? "")) {
          screenBox = new Box3().setFromObject(child);
        }
      });

      // Measured while `model` is still unparented, and it has to stay that
      // way. `Box3.setFromObject` walks world matrices, so the moment the model
      // is inside a group the stage has already placed and rotated in the
      // world, this returns world coordinates — and feeding a world z back in
      // as a local one threw the viewfinder metres away from the handset.
      //
      // The bug was invisible in `.dev/probes/phone.html`, where the phone sits
      // at the origin untransformed and world and local agree. Anything
      // measured here belongs above `frame.add`.
      const bounds = new Box3().setFromObject(model);

      // The viewfinder. Its *extent* comes from the OLED mesh, but its *depth*
      // comes from the whole body, because the model puts a cover glass in
      // front of the display and that glass is drawn as tinted black — sitting
      // between them would show the video through a 45% smoked filter, which
      // looks exactly like a screen that is off. Alignment put the front on +Z,
      // so the body's own front face is the one surface nothing else is in
      // front of.
      if (screenBox) {
        const size = screenBox.getSize(new Vector3());
        const centre = screenBox.getCenter(new Vector3());
        screenMesh = new Mesh(
          screenGeometry(size.x * SCREEN_FILL, size.y * SCREEN_FILL, aspect),
          screenMaterial,
        );
        screenMesh.position.set(centre.x, centre.y, bounds.max.z + 0.00015);
        screenMesh.layers.set(NO_GLOW_LAYER);

        // Its own geometry, because the video's carries a centre-crop in its
        // UVs and the interface must not be cropped with it — the record button
        // is only in the middle if the whole texture is on the whole screen.
        // Passing the screen's own aspect makes `screenGeometry` a plain 0…1
        // mapping.
        const screenAspect = size.x / size.y;
        uiMaterial.map = createViewfinder(screenAspect);
        uiMesh = new Mesh(
          screenGeometry(size.x * SCREEN_FILL, size.y * SCREEN_FILL, screenAspect),
          uiMaterial,
        );
        uiMesh.position.set(centre.x, centre.y, screenMesh.position.z + 0.0004);
        uiMesh.layers.set(NO_GLOW_LAYER);
        // Ordered explicitly, not left to the transparent sort. Both planes are
        // transparent and a fraction of a millimetre apart, so which one three
        // decides is nearer is a floating-point coin toss — and the video is
        // opaque, so losing that toss paints the interface out completely.
        uiMesh.renderOrder = 2;
        screenMesh.renderOrder = 1;
      }

      // Only now, once every measurement is taken.
      frame.add(model);
      if (screenMesh) frame.add(screenMesh);
      if (uiMesh) frame.add(uiMesh);

      const length = bounds.getSize(new Vector3()).y;
      frame.scale.setScalar(BODY_LENGTH / length);

      // Whatever fade the stage had asked for while this was in flight.
      applyOpacity(opacity);
    },
    undefined,
    (error) => console.warn("[pipeline] handset model unavailable", error),
  );

  function applyOpacity(value) {
    group.visible = value > 0.002 && frame.children.length > 0;
    // Depth only while solid. The handset occludes by writing depth — which is
    // what keeps the ring's wireframes, drawn last whatever their distance,
    // from crossing over it — and a half-faded object that still wrote depth
    // would keep punching that hole while you could see straight through it.
    const solid = value > 0.999;
    fading.forEach((entry) => {
      entry.material.opacity = entry.opacity * value;
      entry.material.depthWrite = entry.depthWrite && solid;
    });
  }

  return {
    group,
    lights: [key],

    setScreen(texture) {
      screenMaterial.map = texture;
      screenMaterial.color.set(0xffffff);
      screenMaterial.needsUpdate = true;
    },

    setOpacity(value) {
      opacity = value;
      applyOpacity(value);
    },

    dispose() {
      disposed = true;
      meshes.forEach((mesh) => mesh.geometry.dispose());
      screenMesh?.geometry.dispose();
      uiMesh?.geometry.dispose();
      uiMaterial.map?.dispose();
      fading.forEach((entry) => entry.material.dispose());
    },
  };
}
