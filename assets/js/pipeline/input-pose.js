/**
 * Where the one real camera stands.
 *
 * Its own module because two things need it and they must not disagree: the
 * camera itself (`input-camera.js`) and the camera path (`path.js`), whose
 * first act is a shot *of* it and therefore has to aim there.
 *
 * Splitting it out is not only about duplication. `path.js` importing
 * `input-camera.js` dragged in the handset, the glTF loader and its two
 * helpers — the camera path transitively depending on a model loader, to read
 * three numbers. This file imports one vector class and nothing else.
 */
import { Vector3 } from "../vendor/three.module.js";

/**
 * Where it stands: just off `cam22`, outside the ring.
 *
 * The azimuth is not a free parameter, and treating it as one was a mistake
 * worth recording. It was moved to 142.5° purely to keep the frustum out of the
 * timeline column — a real framing problem, solved by breaking something the
 * reader can check. The video on this camera's image rectangle shows the
 * subject from a particular direction, and `cam22` at 90° is *the ring position
 * nearest the input viewpoint*: that was verified by projecting the skeleton
 * through it and registering the result against the source frame. Standing the
 * camera fifty degrees away from the view it is playing is a contradiction on
 * screen, whatever it does for the composition.
 *
 * So: 97.5°, the gap next to `cam22`. Off the ring's 15° spacing rather than on
 * it, because out here at 1.15× the rig radius, sitting on a ring bearing parks
 * this camera directly behind that frustum and the two overlap.
 *
 * Framing is then act 1's problem rather than this file's, which is the right
 * place for it: act 1 has its own keyframe and aims here (see `path.js`), so
 * the shot can be composed around wherever the camera honestly belongs. What
 * the move out of act 1 still has to respect is that the reader sweeps past
 * this bearing around 49% of the way through the section — so the fade-out in
 * `stage.js` finishes before then, or the rectangle passes straight across the
 * figure.
 *
 * Height stays below the rig's 1.804 m: framing a standing person head to toe
 * means holding the phone low, and it keeps the one real camera off the rig's
 * plane, which is the point of not matching them.
 */
const STANDOFF = 1.15;
const HEIGHT = 1.15;
/** Degrees. The gap beside `cam22` (90°) — see the note above. */
const AZIMUTH = 97.5;

/**
 * Where this camera stands, in world space.
 *
 * Exported because act 1 is now a shot *of* it — `path.js` has to aim there,
 * and two copies of these three constants would drift apart the first time one
 * of them is tuned.
 *
 * @param {{centre?: number[], radius?: number}} rig
 */
export function inputCameraHome(rig) {
  const azimuth = (AZIMUTH * Math.PI) / 180;
  const radius = (rig?.radius ?? 3) * STANDOFF;
  return new Vector3(
    (rig?.centre?.[0] ?? 0) + radius * Math.cos(azimuth),
    HEIGHT,
    (rig?.centre?.[2] ?? 0) + radius * Math.sin(azimuth),
  );
}
