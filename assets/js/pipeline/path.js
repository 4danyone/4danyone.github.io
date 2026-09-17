/**
 * The camera path — the thing that makes this one scene rather than four
 * widgets.
 *
 * Progress through the storyboard maps to a position along a path of
 * keyframes. The four acts are camera moves, not page sections, so the
 * keyframes below *are* the storyboard:
 *
 *   act 1  the one real camera, alone — no ring, no figure
 *   act 2  pull back and up until the whole ring reads, figure with it
 *   act 3  the same shot; the planes change to the generated views
 *   act 4  the same shot again; the reconstruction replaces the skeleton
 *
 * Keyframes are polar around the rig centre rather than absolute points —
 * azimuth, multiples of the rig's own radius, height above its floor — so
 * they hold for any scene the exporter writes, whatever its rig's size or
 * azimuth phase.
 *
 * The stage owns easing and the actual camera; this module owns *where*, and
 * reports `stage` — the continuous storyboard position every window in
 * stage.js is expressed on.
 */
import { Vector3 } from "../vendor/three.module.js";
import { inputCameraHome } from "./input-pose.js";
import { clamp, mix, shortestDegrees, smoothstep } from "./math.js";

/**
 * The keyframes are act 1 to act 4 in order — position is the only index they
 * need, and the comment above each says which it is.
 *
 * azimuth  degrees around the rig centre; 90° is the anchor camera's side
 * radius   multiples of the rig radius
 * height   metres above the floor
 * target   metres above the floor to look at
 * at       where to aim between the input camera (0) and the rig centre (1).
 *          Defaults to 1, which is every act but the first. Act 1's subject is
 *          the input camera, but aiming *at* it centres the handset and swings
 *          the frustum it carries off to one side; a little lead centres the
 *          whole assembly instead
 * fov      degrees, vertical
 */
const KEYFRAMES = [
  // Act 1 is a shot of the one real camera and nothing else — no ring, no
  // figure — so the camera aims at it rather than at the empty centre.
  //
  // Outside the ring, and that is not a free choice. The image rectangle hangs
  // in front of the camera with its face pointing back out the way the camera
  // came, so it reads correctly only from outside; from within the ring the
  // reader sees its back and the video is mirrored. Standing outside also keeps
  // act 1 on the same side as act 2, so the move between them is a short walk
  // rather than a swing through the rectangle's own plane, which is where it
  // goes edge-on and briefly disappears.
  //
  // Composed around the camera rather than the other way round: its bearing is
  // fixed by what its video shows (see `input-pose.js`), and this keyframe is
  // free.
  //
  // 12.5° below the input camera's own 97.5° bearing, and the sign of that gap is
  // the whole composition. A camera seen from a bearing *above* its own falls to
  // the right of frame and points up-left; from below, it falls to the left and
  // points up-right. It was 12.5° above, and this is the mirror of that — same
  // distance off the camera's normal, other side.
  //
  // 12.5° is also comfortably clear of 7.5° and 187.5°, where the reader would be
  // coplanar with the image rectangle and it would vanish edge-on.
  //
  // No `hold` any more. It existed because scroll used to drive the steps, so
  // act 1 would start retreating on the first pixel of movement and never be a
  // still frame of its own subject. Steps are clicked now and the camera parks
  // exactly on this keyframe, so act 1 is still by construction — and a hold
  // would only make the first half of every transition *out* of it go nowhere.
  { azimuth: 85, radius: 1.75, height: 1.55, target: 0.95, at: 0.18, fov: 40 },
  // The same bearing as act 1, and every act after it. All four share one, which
  // is what makes the move out of act 1 a pure zoom — no orbit, by request — so
  // the bearing cannot be chosen for act 1 alone. Framing the one real camera on
  // the left therefore reframes acts 2 to 4 as well, and it should: it is one
  // continuous shot and the camera has no business changing sides inside it.
  { azimuth: 85, radius: 2.95, height: 3.85, target: 0.95, fov: 38 },
  // Identical to act 2, as act 4 is. The camera moves exactly once in this
  // section — out of act 1 — and then holds while the *content* of the ring
  // changes underneath it: conditioning renders, then generated views, then the
  // reconstruction they produced. A 66 degree walk round the rig used to sit
  // here, and it was answering a question nobody asked: the reader is being
  // shown what the planes show, not a different side of the same arrangement.
  { azimuth: 85, radius: 2.95, height: 3.85, target: 0.95, fov: 38 },
  { azimuth: 85, radius: 2.95, height: 3.85, target: 0.95, fov: 38 },
];

/**
 * What each act says, for the timeline under the stage.
 *
 * Every title names an action, because each act *is* a step being performed and
 * not a topic being covered — "Video Capturing", not "Monocular input". A reader
 * scanning four actions sees a procedure; four exhibits read as a gallery. Only
 * the first is literally a gerund; the rest are nominalised verbs, which is the
 * register the field writes in. This comment claimed all four were gerunds for
 * some time, which was true of one.
 *
 * Step 2 is the field's own name for that stage, and this project's: the data it
 * draws comes out of `hmr4d/`, so calling it anything else on the page would put
 * the page out of step with what produced it. It also says *motion*, which
 * matters — the step recovers a pose for every frame of the clip, and a single
 * recovered pose would be useless to everything downstream. "Skeleton
 * Extraction" sat here first and read
 * as static, and as lifting out something already present rather than solving for
 * it. What the reader can actually see is still named in the sentence below.
 *
 * Capitalised as titles rather than as sentences, because that is what they are:
 * they name the steps of a method and sit in a switcher, not in prose.
 *
 * Bodies are one or two sentences, and every one of them is on screen at once on
 * a wide viewport, so they have to be short enough to scan as a row rather than
 * read as a column.
 *
 * Step 2 names the camera rig as well as the skeleton, because both arrive in
 * that act — the rig is what step 3 then uses, but it is placed here, and the
 * copy should describe what the reader is looking at rather than the tidiest
 * division of labour. The per-camera skeleton renders sit in step 2 by the
 * same rule: WINDOW.conditioning opens mid-act-2, so they are on screen
 * before step 3 begins, and step 3's screen shows them already giving way to
 * generated video — its caption starts from the model, not the render.
 */
export const ACTS = [
  {
    title: "Video Capturing",
    body: "The input is a single casually captured video. The camera is uncalibrated and its motion unknown.",
  },
  {
    title: "Human Motion Recovery",
    body: "The video is lifted into a moving 3D skeleton in world space. Virtual cameras ring it, each rendering the skeleton.",
  },
  {
    title: "Multiview Video Generation",
    body: "A video model turns each camera's skeleton render into a photorealistic video, synchronised across the ring.",
  },
  {
    title: "4DGS Reconstruction",
    body: "The generated views act as a virtual capture rig. A 4DGS model is fit to them, enabling free-viewpoint rendering.",
  },
];

export function createCameraPath(rig) {
  const centre = new Vector3(rig?.centre?.[0] ?? 0, 0, rig?.centre?.[2] ?? 0);
  const radius = rig?.radius ?? 3;

  // What each keyframe looks at, resolved once. Every act but the first aims at
  // the rig centre, because that is where its subject stands. Act 1 has no
  // subject there — the ring and the figure have not arrived — so aiming at the
  // centre would frame an empty floor with the one thing on screen off at the
  // edge. It aims at the input camera instead.
  const inputHome = inputCameraHome(rig);
  const lookPoints = KEYFRAMES.map((keyframe) => {
    const rigPoint = new Vector3(centre.x, keyframe.target, centre.z);
    const lead = keyframe.at ?? 1;
    return lead >= 1 ? rigPoint : inputHome.clone().lerp(rigPoint, lead);
  });

  // Reused across calls rather than allocated per frame. sample() therefore
  // returns *borrowed* vectors that the next call overwrites — copy them, do
  // not keep them.
  const position = new Vector3();
  const target = new Vector3();

  /**
   * @param {number} progress 0…1 across the whole section
   * @returns {{position: Vector3, target: Vector3, fov: number, stage: number}}
   *   position and target are reused between calls; copy before storing.
   */
  function sample(progress) {
    const clamped = clamp(progress, 0, 1);
    const scaled = clamped * (KEYFRAMES.length - 1);
    const index = Math.min(Math.floor(scaled), KEYFRAMES.length - 2);
    const local = smoothstep(scaled - index);

    const from = KEYFRAMES[index];
    const to = KEYFRAMES[index + 1];

    // Interpolate the azimuth the short way round, so a path from 350° to 10°
    // sweeps 20° rather than 340°.
    const azimuth = from.azimuth + shortestDegrees(to.azimuth - from.azimuth) * local;
    const distance = mix(from.radius, to.radius, local) * radius;
    const height = mix(from.height, to.height, local);

    const radians = (azimuth * Math.PI) / 180;
    position.set(
      centre.x + distance * Math.cos(radians),
      height,
      centre.z + distance * Math.sin(radians),
    );
    target.lerpVectors(lookPoints[index], lookPoints[index + 1], local);

    return {
      position,
      target,
      fov: mix(from.fov, to.fov, local),
      // Continuous position along the storyboard: 0 at the first keyframe, 1 at
      // the second, and so on. Every window in `stage.js` is expressed on this,
      // and nothing else here is read — `act`, `actProgress` and `progress` were
      // all returned as well, and were left over from when a caption tracked the
      // act and scroll position drove the section.
      stage: index + local,
    };
  }

  return { sample };
}
