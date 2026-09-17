/**
 * The one camera that actually existed.
 *
 * Twenty-four frustums on the ring are inventions — the method's whole claim is
 * that no second camera was ever present. This is the exception: a single
 * handheld camera, drawn apart from the ring so it cannot be mistaken for one
 * of them, playing the video the pipeline started from.
 *
 * It used to be implied instead, by tinting the ring camera nearest the input
 * viewpoint gold. That was the wrong thing to say: `cam22` is a generated view
 * like the other twenty-three and happens to look most like the source, which
 * is not the same as being it. Marking a real camera as real, and letting the
 * generated ones all look alike, is the honest version.
 *
 * Its **intrinsics are real** — GVHMR's assumed camera, 27.5° by 47.1°, so the
 * frustum's shape is the one the method reasoned with. Its **pose is not**: the
 * transform from the canonical world the rig lives in back to the input view is
 * not saved anywhere in the pipeline output. So it is placed plausibly, at the
 * subject's front and outside the ring, and the code says so rather than
 * implying a measurement.
 *
 * The drift is the same admission in motion: a real handheld shot is never
 * still, and a camera that is perfectly locked reads as another rig member.
 */
import {
  DoubleSide,
  Group,
  Mesh,
  Vector3,
} from "../vendor/three.module.js";
import { NO_GLOW_LAYER } from "./bloom.js";
import { LINE_WIDTH, NEEDLE_DEPTH } from "./cameras.js";
import { tokenColor } from "./convert.js";
import {
  frameRadius,
  roundedCornerAnchors,
  roundedOutline,
  roundedPlaneGeometry,
} from "./rounded.js";
import { createFatLines } from "./fat-lines.js";
import { inputCameraHome } from "./input-pose.js";
import { createPhone } from "./phone.js";
import { createPlaneMaterial } from "./plane-material.js";

/** See the note where the handset is built. */
const PHONE_SCALE = 2.6;
/** Handheld drift: centimetres and fractions of a degree, never repeating. */
const SWAY = { x: 0.021, y: 0.014, z: 0.012 };
const SWAY_RATE = { x: 0.37, y: 0.53, z: 0.29 };
const TILT = 0.011;

export function createInputCamera({ cameras, video, rig, environment }) {
  const intrinsics = cameras.input ?? cameras.cameras[0];
  const tint = tokenColor("--frustum-input", "#63e6be");

  const centre = new Vector3(rig?.centre?.[0] ?? 0, 0, rig?.centre?.[2] ?? 0);
  const home = inputCameraHome(rig);
  const target = new Vector3(centre.x, 1.0, centre.z);

  const group = new Group();
  group.name = "input-camera";

  // The image rectangle is drawn the same size as the ring's, which takes a
  // calculation rather than a shared constant: this camera has its own
  // intrinsics (27.5° against the rig's 24.4°), so at a shared depth it would
  // draw a visibly larger plane — it used to, by a third. Shortening the
  // frustum instead keeps its *shape* honest, which is the part that carries
  // the real measurement, and truncating a needle's length is already the
  // licence `NEEDLE_DEPTH` takes.
  //
  // One ratio serves both axes because every camera here, real or virtual, is
  // square-pixel and 2160×3840. Should that stop being true, this matches the
  // horizontal and lets the vertical fall where it may.
  const ring = cameras.cameras[0];
  const planeDistance = (NEEDLE_DEPTH * intrinsics.fx * ring.width) / (ring.fx * intrinsics.width);
  const halfX = (planeDistance * intrinsics.width) / (2 * intrinsics.fx);
  const halfY = (planeDistance * intrinsics.height) / (2 * intrinsics.fy);

  // Frustum rays, image rectangle, and the phone body behind the lens — one
  // ribbon buffer for all of it, in the scene's own line language.
  // Rounded, and with the same radius rule as the ring's — it is the same kind
  // of frame and has to be built from the same numbers, or the one camera that
  // is real reads as a different sort of object.
  const radius = frameRadius(halfX * 2, halfY * 2);
  const outline = roundedOutline(halfX, halfY, radius, -planeDistance);
  const segments = [];
  roundedCornerAnchors(halfX, halfY, radius, -planeDistance).forEach((anchor) =>
    segments.push([0, 0, 0], anchor),
  );
  outline.forEach((point, i) => segments.push(point, outline[(i + 1) % outline.length]));

  const lines = createFatLines(segments.length / 2, { width: LINE_WIDTH });
  for (let i = 0; i < segments.length; i += 2) {
    const [ax, ay, az] = segments[i];
    const [bx, by, bz] = segments[i + 1];
    lines.setSegment(i / 2, ax, ay, az, bx, by, bz);
    lines.setColor(i / 2, tint.r, tint.g, tint.b);
  }
  lines.commit();
  lines.commitColors();
  // Off the glow pass, like the ring's wireframes and for the ring's reasons —
  // see the long note in cameras.js. The glow buffer omits the video plane, so
  // a glowing frame haloed the picture it frames and the rays washed a soft
  // band across it. Ribbons at LINE_WIDTH are legible by width, not by glow.
  lines.mesh.layers.set(NO_GLOW_LAYER);
  group.add(lines.mesh);

  const planeGeometry = roundedPlaneGeometry(halfX * 2, halfY * 2, radius);
  const planeMaterial = createPlaneMaterial({ color: tint });
  planeMaterial.side = DoubleSide;
  const plane = new Mesh(planeGeometry, planeMaterial);
  plane.position.z = -planeDistance;
  plane.frustumCulled = false;
  plane.layers.set(NO_GLOW_LAYER);
  group.add(plane);

  // A real handset behind the lens — see phone.js for the model and what it
  // costs.
  //
  // No rotation needed: phone.js aligns the model so its lenses face -Z and its
  // screen +Z, which is already the camera's own convention, so it looks at the
  // subject and shows its display to the operator without help.
  //
  // Drawn oversized, and deliberately. At true scale a 15 cm handset seen from
  // act 2's vantage is twenty pixels — too small for any model, procedural or
  // photoscanned, to read as anything but a smudge. The frustum in front of it
  // is already schematic (its image plane hangs at an arbitrary distance), so a
  // symbol at symbol scale is consistent; a correctly sized invisible one would
  // not be more honest, just less use.
  const phone = createPhone({
    environment,
    screen: video.poster ?? null,
    // Its own frame, not the rig's — the screen crops to what this camera shot.
    aspect: intrinsics.width / intrinsics.height,
  });
  phone.group.scale.setScalar(PHONE_SCALE);
  phone.group.position.z = 0.02 * PHONE_SCALE;
  group.add(phone.group);

  const detachTexture = video.onTexture(texture => {
    planeMaterial.uniforms.uMap.value = texture;
    planeMaterial.uniforms.uColor.value.set(0xffffff);
    phone.setScreen(texture);
  });

  const position = new Vector3();
  // `Object3D.lookAt` aims +Z at its argument, but a camera frustum is built
  // down -Z — the OpenGL convention the rest of this scene uses. Aiming at the
  // subject therefore points the frustum away from it. Looking at the subject's
  // mirror image through the camera turns it round.
  const away = new Vector3();

  return {
    group,
    // The handset is the only lit thing in the scene; the stage adds these.
    lights: phone.lights,
    setSize: lines.setSize,

    /**
     * @param {number} seconds wall clock, for the drift
     * @param {number} amount 0 absent, 1 fully present
     */
    update(seconds, amount) {
      group.visible = amount > 0.002;
      lines.material.uniforms.uOpacity.value = amount;
      planeMaterial.uniforms.uOpacity.value = amount;
      phone.setOpacity(amount);
      /**
       * This camera occludes while it is fully present — the rule the skeleton
       * and the handset already follow, arrived at here from a third direction.
       *
       * The ring's tiles and wireframes draw at renderOrder 1 and 2, which
       * exists to order a frustum *against its own picture* and is applied to
       * the whole ring for want of anywhere else to put it. The consequence
       * reaches outside the ring: everything it owns paints after everything
       * this camera owns, whatever the distances, so the one real camera —
       * standing outside the ring at 1.15 rig radii, nearer the reader than
       * most of it — came out with ring frames drawn across its face.
       *
       * Painter's order cannot fix this, because there is no fixed answer:
       * yaw is unclamped and the idle drift keeps turning, so the reader can
       * take the viewpoint anywhere, and this camera is sometimes the nearest
       * thing in the scene and sometimes the farthest. Depth answers per pixel
       * and per frame, which is what the question actually needs. The handset
       * inside this same group was the counter-example the whole time: its
       * materials write depth, so ring lines never crossed *it*, only the frame
       * and picture in front of it.
       *
       * Off again the moment it starts to fade, for the skeleton's reason — a
       * ghost that still occludes cuts holes in whatever is dissolving in
       * behind it, and this camera leaves as the ring collapses into act 4.
       */
      const solid = amount > 0.999;
      lines.material.depthWrite = solid;
      planeMaterial.depthWrite = solid;
      if (!group.visible) return;

      // Three incommensurate rates, so the sway never lands on a beat.
      position.set(
        home.x + Math.sin(seconds * SWAY_RATE.x * Math.PI * 2) * SWAY.x,
        home.y + Math.sin(seconds * SWAY_RATE.y * Math.PI * 2) * SWAY.y,
        home.z + Math.sin(seconds * SWAY_RATE.z * Math.PI * 2) * SWAY.z,
      );
      group.position.copy(position);
      away.copy(position).multiplyScalar(2).sub(target);
      group.lookAt(away);
      // A hand rolls as well as translates, and without this the camera reads
      // as sliding on a rail.
      group.rotateZ(Math.sin(seconds * 0.41 * Math.PI * 2) * TILT);
    },

    dispose() {
      detachTexture();
      phone.dispose();
      lines.dispose();
      planeGeometry.dispose();
      planeMaterial.dispose();
    },
  };
}
