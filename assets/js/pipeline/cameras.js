/**
 * The virtual light stage: twenty-four camera frustums arranged in a ring.
 *
 * The three settings below were not guessed. They came out of rendering the
 * real rig against the real skeleton before any of this existed
 * (`.dev/probes/preview_ring.py`), and each fixes a specific failure:
 *
 *   NEEDLE_DEPTH — at the true 3 m the frustums reach the subject and the ring
 *     becomes a solid cylinder of crossing lines. At 0.8 m, about a quarter of
 *     the radius, it resolves into twenty-four countable markers. Truncating
 *     length is legitimate; widening the angle is not, because the 24.4° is the
 *     real optics and a fatter frustum would misrepresent them.
 *
 *   the filled plane — bare wireframes give the eye nothing to land on and the
 *     far half of the ring criss-crosses the near half. Filling the image
 *     rectangle, even faintly, flips it: it reads as *screens arranged around a
 *     subject*, the wireframe recedes to a frame, and the needle becomes the
 *     screen's tether back to its camera position. In Phase 2 these planes
 *     carry the generated video, which is what they are for.
 *
 *   depth fade — dimming by distance to the viewer separates the two halves of
 *     the ring without hiding either.
 *
 * Camera count and geometry come from cameras.json. Adding a camera is a data
 * change, never a code change here.
 */
import {
  DoubleSide,
  Group,
  Color,
  Mesh,
} from "../vendor/three.module.js";
import { NO_GLOW_LAYER } from "./bloom.js";
import { createFatLines } from "./fat-lines.js";
import { createPlaneMaterial } from "./plane-material.js";
import {
  frameRadius,
  roundedCornerAnchors,
  roundedOutline,
  roundedPlaneGeometry,
} from "./rounded.js";
import { clamp } from "./math.js";
import { matrixFromCamera, planeHalfExtents, positionFromCamera, tokenColor } from "./convert.js";

/**
 * Exported because the input camera matches its image rectangle to these, and
 * has to do it by calculation: it carries different intrinsics, so the same
 * depth would draw a different-sized plane. See `input-camera.js`.
 */
export const NEEDLE_DEPTH = 0.8;
const PLANE_OPACITY = 0.17;
/**
 * Depth cue: near cameras read stronger than far ones, so the ring has a front
 * and a back rather than being twenty-four tiles at one brightness.
 *
 * Two curves, one per surface, because the tile and the frustum drawn around it
 * are two different kinds of mark and want different amounts of it.
 *
 * The window is metres from the *eye*, and the eye only ever stands in one place
 * while the ring is up — acts 2, 3 and 4 share a keyframe at 2.95 rig radii, and
 * dragging changes the bearing, not the distance. From there the twenty-four
 * cameras span 6.21 m to 12.02 m, which is the span both curves are read over.
 *
 * PLANE is sized to that span. It used to be the LINE numbers below, which put
 * the span in the wrong part of the ramp at both ends: the nearest tile started
 * already faded and topped out at 0.56, and everything past 10.5 m — half the
 * ring — clamped to 0.034, which is not a depth cue but a deletion. Now 0.97 at
 * the front and 0.59 at the back: the near tiles are opaque photographs, and the
 * back of the ring is a shade behind them rather than a ghost of them.
 *
 * LINE keeps the old, much steeper numbers. A tile is what the reader is being
 * asked to look at, so it should be legible right round the ring; a wireframe is
 * the scaffolding it hangs on, and twenty-four of them at tile brightness read as
 * the outlines being the subject. Widening PLANE without widening LINE was one
 * number being asked to do two jobs.
 */
const PLANE_FADE = { near: 6.0, far: 13.0, floor: 0.62, curve: 1.1 };
const LINE_FADE = { near: 5.0, far: 11.5, floor: 0.14, curve: 1.6 };

/** 1 at `near` and nearer, easing to `floor` at `far` and beyond. */
function depthFade(distance, fade) {
  const t = (fade.far - distance) / (fade.far - fade.near);
  return Math.pow(clamp(t, fade.floor, 1), fade.curve);
}
// Idle cameras top out below 1 so there is headroom left for the picked one to
// actually look picked — `SELECTED_LIFT` and `HOVER_LIFT` are both 1/this, and
// hover has nothing else to work with (selection at least dims the other
// twenty-three). That is the whole of its job now. It was originally set here
// because additive blending plus bloom clipped a frustum to white where its own
// lines crossed; the frustums are alpha-blended and off the glow pass, so
// neither of those is true any more and the value survives on the other reason.
const IDLE_CEILING = 0.62;
// A tile carrying video needs far less opacity than a flat grey placeholder to
// read at the same strength. It used to be held below 1 so the ring would sit
// inside the scene rather than on top of it, and that job has moved: the depth
// fade this multiplies into is what puts the ring in the scene, and it is doing
// it at the back where the effect belongs. Holding the ceiling down as well only
// veiled the near tiles, which are the ones the reader is being asked to look
// at. With alpha blending these are photographs; at 1 they are opaque ones.
const PLANE_VIDEO_OPACITY = 1;
const SELECTED_LIFT = 1 / IDLE_CEILING;
// Hover has to read as "this is pressable" at a glance, from across the ring
// and against twenty-three neighbours that are already lit. 1.25 was a nudge
// nobody noticed; this takes the hovered frustum to full while the rest stay at
// IDLE_CEILING, which is the same contrast selection uses.
const HOVER_LIFT = 1 / IDLE_CEILING;
const DIM_WHEN_SELECTED = 0.55;
// Hover also tints the wireframe, so the cue survives a frustum that is already
// bright because it happens to be close to the viewer.
const HOVER_TINT = "--frustum-hover";
/**
 * Frustum wireframes, in CSS pixels. Picked cameras get BOLD_WIDTH.
 *
 * Exported, like NEEDLE_DEPTH, because the input camera draws its frame at
 * this same weight — and that is the point: the ring and the one real camera
 * are the same kind of object drawn at the same weight, so the only thing
 * distinguishing them is colour and position. A thinner ring read as a faint
 * background diagram rather than as twenty-four cameras, and a second copy of
 * the number would unmatch them the first time one was tuned.
 */
export const LINE_WIDTH = 1.75;
const BOLD_WIDTH = 3.5;
/**
 * How far the picked camera's own image plane steps aside.
 *
 * Selecting a camera swings the viewer round behind it, so the reader is now
 * looking *through* that camera at the subject — and its screen is directly in
 * the way. Its content is in the detail panel by then, so the plane fades and
 * leaves the outline, which is the part that says where you are standing.
 */
const SELECTED_PLANE_FADE = 0.12;

/**
 * No camera on this ring is special.
 *
 * `cam22` used to be tinted gold as "the position nearest the input viewpoint",
 * which said the wrong thing: it is a generated view like the other twenty-three
 * and merely happens to resemble the source most. The real input camera is now
 * drawn separately, off the ring — see input-camera.js — which is where that
 * distinction belongs.
 */
/** Conditioning tiles carry their own colour; the shader must not retint them. */
const WHITE = new Color(0xffffff);

/**
 * @param {object} cameras parsed cameras.json
 * @param {object} [options]
 * @param {object} [options.atlas] createAtlas() result; when present each plane
 *   shows its own generated view instead of a flat tint
 */
/** Bake a cell's sub-rectangle into a plane geometry's UVs. */
function applyUvRect(geometry, rect) {
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, rect.x + uv.getX(i) * rect.width, rect.y + uv.getY(i) * rect.height);
  }
  uv.needsUpdate = true;
}

export function createCameraRing(cameras, { atlas = null } = {}) {
  const idle = tokenColor("--frustum-idle", "#74c0fc");
  const hover = tokenColor(HOVER_TINT, "#a5d8ff");

  const group = new Group();
  group.name = "camera-ring";
  const entries = [];

  cameras.cameras.forEach((camera, index) => {
    const tint = idle;
    const half = planeHalfExtents(camera, NEEDLE_DEPTH);

    const node = new Group();
    node.applyMatrix4(matrixFromCamera(camera));
    node.matrixAutoUpdate = false;

    // Local space: the camera sits at the origin looking down -Z (OpenGL), so
    // the image rectangle is a plane at z = -depth and the needle is four rays
    // out to its corners.
    //
    // The rectangle is rounded, like every other framed picture on the page, so
    // the rays land on the middle of each corner arc rather than on the corner
    // the rectangle no longer has — see `rounded.js`.
    const radius = frameRadius(half.x * 2, half.y * 2);
    const outline = roundedOutline(half.x, half.y, radius, -NEEDLE_DEPTH);

    const segments = [];
    roundedCornerAnchors(half.x, half.y, radius, -NEEDLE_DEPTH).forEach((anchor) =>
      segments.push([0, 0, 0], anchor),
    );
    outline.forEach((point, i) => segments.push(point, outline[(i + 1) % outline.length]));
    // A stub behind the apex reads as the camera body and keeps a frustum
    // visible when it is edge-on and its rectangle collapses to a line.
    segments.push([0, 0, 0], [0, 0, 0.12]);

    /**
     * Ordinary alpha blending, not additive — and off the glow pass. Two
     * separate faults, both of them the wireframe being drawn *over the picture*
     * by machinery that assumed there was nothing behind it.
     *
     * **Additive made the overlap milky.** `dst = line + picture`. Against the
     * black field that is exactly alpha blending, because black adds nothing —
     * which is why it went unnoticed for as long as a tile was a 25%-opacity
     * ghost. Against an opaque photograph it sums: the line loses its blue, the
     * picture under it comes out pale, and the two together read as a soft band
     * rather than as a line on top of an image. `plane-material.js` reached this
     * same conclusion about the tiles themselves — "the photographs came out
     * milky" — when act 3 stopped matting them onto black. The wireframe was left
     * behind on that migration. `input-camera.js` has always alpha-blended, which
     * is why its frame sits cleanly on its own video and this one did not.
     *
     * Nothing changes over the black field: with `dst = 0` the two blend modes
     * are the same arithmetic. Only the overlap moves.
     *
     * **The glow pass could not occlude.** It renders with `NO_GLOW_LAYER`
     * disabled, so in that buffer the tile is absent and the wireframe the tile
     * hides in the real render is still there. Its blur is added over the
     * finished frame, so a line crossing a tile left a paler, softer trail on it.
     * `+ glow` cannot be occluded by something the glow pass was told to skip.
     * The frame lies on the picture's edge and haloed the border; the four rays
     * cross the picture's face and washed a band through it.
     *
     * The rays were briefly kept glowing on the argument that they hang in empty
     * space. They do not — they run from the apex to the corners of the picture,
     * and half their length is over it.
     *
     * The glow is not missed. Bloom's job here is making a 1px line legible, and
     * these are screen-space ribbons at LINE_WIDTH — they are legible because
     * they are drawn that wide. The skeleton and the ground still glow, and they
     * are what the glow was for; the input camera's frame has since followed
     * this same migration, for these same reasons, in input-camera.js.
     */
    const lines = createFatLines(segments.length / 2, { width: LINE_WIDTH });
    /**
     * Drawn after both tiles, and this is what "the rays go dull where they
     * cross the picture" actually was.
     *
     * Every material in this scene sets `depthWrite: false`, so nothing writes a
     * depth buffer and there is no depth arbitration to appeal to — the whole
     * ring is painter's order. Inside a camera's node that order was: base plane
     * and wireframe together at renderOrder 0, sorted against each other by
     * distance, then the conditioning tile at 1, always last. So the tile painted
     * over the wireframe, and a ray crossing it survived only at
     * `1 - tileOpacity`: dull, desaturated, and blurred by the picture laid on
     * top of it, while the same ray a pixel outside the tile stayed full blue.
     * The frame escaped it by sitting exactly on the tile's edge, with half its
     * width outside — which is why the border stayed crisp while the four rays
     * did not, and why the two looked like different bugs.
     *
     * Raising the tiles to opaque is what made it obvious; at a 0.4 tile most of
     * the ray still came through.
     *
     * A wireframe over its own image plane is the reading a frustum wants
     * anyway — it is the frame that says where the picture is — and the frame
     * has been drawn that way all along by accident of geometry. This makes the
     * rays agree with it.
     */
    lines.mesh.renderOrder = 2;
    for (let i = 0; i < segments.length; i += 2) {
      const [ax, ay, az] = segments[i];
      const [bx, by, bz] = segments[i + 1];
      lines.setSegment(i / 2, ax, ay, az, bx, by, bz);
      lines.setColor(i / 2, tint.r, tint.g, tint.b);
    }
    lines.commit();
    lines.commitColors();
    lines.mesh.layers.set(NO_GLOW_LAYER);
    node.add(lines.mesh);

    const planeGeometry = roundedPlaneGeometry(half.x * 2, half.y * 2, radius);
    // The generated views are matted onto black with no alpha channel to
    // ship; the plane's shader recovers one from the picture itself, so the
    // subject sits on its tile cleanly — see plane-material.js.
    // The texture is attached later, once the video has a frame — see
    // attachAtlas below. Until then (and forever, if the video never loads)
    // the plane renders as the flat tint, which is a legible ring in its own
    // right rather than a hole where a video should be.
    const map = null;
    // The geometry's UVs span the unit square; remap them onto this
    // camera's cell so every plane can share the one texture.
    if (atlas) applyUvRect(planeGeometry, atlas.uvRect(index));
    const planeMaterial = createPlaneMaterial({
      color: tint,
      maskOffset: atlas?.maskOffset ?? 0,
    });
    planeMaterial.side = DoubleSide;
    const plane = new Mesh(planeGeometry, planeMaterial);
    plane.position.z = -NEEDLE_DEPTH;
    plane.frustumCulled = false;
    // Drawn, but never blurred into the glow — see bloom.js.
    plane.layers.set(NO_GLOW_LAYER);
    node.add(plane);

    group.add(node);
    entries.push({
      index,
      camera,
      node,
      plane,
      lines,
      planeMaterial,
      planeGeometry,
      planeSize: { width: half.x * 2, height: half.y * 2, radius },
      map,
      tint,
      segmentCount: segments.length / 2,
      tintApplied: null,
      worldPosition: positionFromCamera(camera),
      // Where this camera sits around the ring, for swinging the view toward
      // it when it is picked.
      azimuth: Math.atan2(
        positionFromCamera(camera).z - (cameras.rig?.centre?.[2] ?? 0),
        positionFromCamera(camera).x - (cameras.rig?.centre?.[0] ?? 0),
      ),
    });
  });

  /**
   * Per-frame depth fade, scaled by how present the ring is meant to be.
   *
   * Both in one call because the fade is recomputed every frame and would
   * otherwise overwrite whatever a separate presence setter had just written —
   * the ring would pop in fully lit instead of resolving.
   *
   * @param {Vector3} viewerPosition
   * @param {number} presence 0 → the ring is absent, 1 → fully drawn
   */
  function update(viewerPosition, presence = 1, state = {}) {
    const visible = presence > 0.002;
    group.visible = visible;
    if (!visible) return;

    const { selected = -1, hovered = -1, focus = 0, conditioning = 0, matte = 0 } = state;

    entries.forEach((entry, i) => {
      const isSelected = i === selected;
      const isHovered = i === hovered;

      const distance = entry.worldPosition.distanceTo(viewerPosition);
      let fade = depthFade(distance, PLANE_FADE) * presence;
      let fadeLine = depthFade(distance, LINE_FADE) * presence;

      // A picked camera is exempt from the depth fade. The fade exists to
      // separate the near half of the ring from the far half when nothing is
      // picked — but picking one deliberately moves the viewer to the opposite
      // side so its screen faces them, which lands it at maximum distance. Left
      // faded it would come out dimmer than the cameras it was picked over.
      if (isSelected) {
        fade = Math.max(fade, presence * focus);
        fadeLine = Math.max(fadeLine, presence * focus);
      }


      // Selection reads by contrast, not by absolute brightness: the picked
      // camera goes to full while the rest are pushed down. Brightening the
      // picked one alone would not register against twenty-three neighbours
      // that are already glowing. The dim must skip the selected camera —
      // applying it to everything and lifting the picked one back up nets out
      // to almost no contrast, which is what happened the first time.
      const dim = selected >= 0 && !isSelected ? 1 - DIM_WHEN_SELECTED * focus : 1;
      const lift = isSelected ? 1 + (SELECTED_LIFT - 1) * focus : isHovered ? HOVER_LIFT : 1;

      const strength = Math.min(fade * dim * lift, 1);
      const tint = isHovered && !isSelected ? hover : entry.tint;
      if (!entry.tintApplied || !entry.tintApplied.equals(tint)) {
        for (let k = 0; k < entry.segmentCount; k += 1) {
          entry.lines.setColor(k, tint.r, tint.g, tint.b);
        }
        entry.lines.commitColors();
        entry.tintApplied = tint.clone();
      }

      const strengthLine = Math.min(fadeLine * IDLE_CEILING * dim * lift, 1);
      // Thicker rather than a second overlaid copy: the ribbons are already
      // screen-space, so width is one uniform.
      const boldAmount = isSelected ? focus : isHovered ? 0.5 : 0;
      entry.lines.material.uniforms.uOpacity.value = strengthLine;
      entry.lines.material.uniforms.uWidth.value =
        LINE_WIDTH + (BOLD_WIDTH - LINE_WIDTH) * boldAmount;

      // The picked camera's plane steps aside; you are looking through it now.
      const planeStep = isSelected ? 1 - (1 - SELECTED_PLANE_FADE) * focus : 1;
      entry.planeMaterial.uniforms.uOpacity.value =
        strength * (entry.map ? PLANE_VIDEO_OPACITY : PLANE_OPACITY) *
        (1 - conditioning) * planeStep;
      entry.planeMaterial.uniforms.uMatte.value = matte;
      if (entry.conditioning) {
        entry.conditioning.material.uniforms.uOpacity.value =
          strength * PLANE_VIDEO_OPACITY * conditioning;
        entry.conditioning.mesh.visible = conditioning > 0.002;
      }
    });
  }

  /** The plane meshes, in camera order — what the raycaster tests against. */
  const targets = entries.map((entry) => entry.plane);

  /**
   * Switch the planes from flat tint to live video.
   *
   * The views arrive matted onto black with no alpha channel to encode or
   * ship; the plane shader recovers one from the picture, so the subject
   * sits on its tile rather than in a black rectangle — see plane-material.js.
   */
  function attachAtlas(texture) {
    entries.forEach((entry) => {
      entry.map = texture;
      entry.planeMaterial.uniforms.uMap.value = texture;
      entry.planeMaterial.uniforms.uColor.value.set(0xffffff);
    });
  }

  /**
   * A second plane per camera, showing the conditioning skeleton the video
   * model was given. It sits a hair in front of the generated view and
   * crossfades against it, which is the whole demonstration: this stick figure
   * went in, that person came out, from this viewpoint.
   *
   * A separate mesh rather than a shader mixing two textures — two materials
   * with complementary opacities is less code and lets the depth fade and
   * selection logic stay written once.
   */
  /**
   * @param {Texture} texture the conditioning atlas
   * @param {(index: number) => object} uvRect its cell rects — *its own*, not
   *   the generated atlas's. The two grids differ (the generated one carries
   *   masks in a second block of rows), so cloning the view plane's geometry
   *   samples the wrong place: every tile comes out half-height and half the
   *   ring repeats the other half's content.
   */
  function attachConditioning(texture, uvRect) {
    entries.forEach((entry, index) => {
      if (entry.conditioning) {
        entry.conditioning.material.uniforms.uMap.value = texture;
        return;
      }
      // `entry.planeSize` rather than the geometry's own `parameters`: these are
      // rounded rectangles now, and `ShapeGeometry` does not record what it was
      // asked for the way `PlaneGeometry` does.
      const geometry = roundedPlaneGeometry(
        entry.planeSize.width,
        entry.planeSize.height,
        entry.planeSize.radius,
      );
      if (uvRect) applyUvRect(geometry, uvRect(index));
      const material = createPlaneMaterial({ color: WHITE });
      material.side = DoubleSide;
      material.uniforms.uMap.value = texture;
      const mesh = new Mesh(geometry, material);
      mesh.position.copy(entry.plane.position);
      mesh.position.z += 0.004;
      mesh.frustumCulled = false;
      mesh.renderOrder = 1;
      mesh.layers.set(NO_GLOW_LAYER);
      entry.node.add(mesh);
      entry.conditioning = { mesh, material, geometry };
    });
  }

  /** Ribbons are sized in pixels, so they need the canvas size. */
  function setSize(width, height) {
    entries.forEach((entry) => entry.lines.setSize(width, height));
  }

  return {
    group,
    entries,
    targets,
    setSize,
    attachAtlas,
    attachConditioning,
    update,
    dispose() {
      entries.forEach((entry) => {
        entry.lines.dispose();
        entry.planeGeometry.dispose();
        entry.planeMaterial.dispose();
        entry.conditioning?.geometry.dispose();
        entry.conditioning?.material.dispose();
      });
    },
  };
}
