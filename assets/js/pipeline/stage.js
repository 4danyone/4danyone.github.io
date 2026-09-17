/**
 * Assembles the scene and runs the loop.
 *
 * Loaded through a dynamic import the moment index.js runs — the boot is
 * eager, so these bytes travel beside the teaser's. What import() still buys
 * is not deferral but failure isolation: a fetch that loses the race for the
 * connection is a catchable error index.js can retry, never a broken page.
 *
 * Everything scene-shaped lives in a sibling module — ground, skeleton, camera
 * ring, bloom, camera path, drag offset. This file owns only the parts that
 * have to know about all of them: the renderer, the frame loop, and the mapping
 * from storyboard progress to what each element is doing at that moment.
 */
import {
  Fog,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "../vendor/three.module.js";
import { ATLAS_GRID, createAtlas } from "./atlas.js";
import { createBloom, NO_GLOW_LAYER } from "./bloom.js";
import { createFlight } from "./flight.js";
import { clamp, easeIn, shortestRadians, smoothstep } from "./math.js";
import { createCameraRing } from "./cameras.js";
import { createEnvironment } from "./environment.js";
import { createGround } from "./ground.js";
import { createHull, loadHull } from "./hull.js";
import { createInputCamera } from "./input-camera.js";
import { createOrbitOffset } from "./orbit.js";
import { createPanel } from "./panel.js";
import { createPlayback } from "./playback.js";
import { createMediaStatus } from "./media-status.js";
import { ACTS, createCameraPath } from "./path.js";
import { createPicker } from "./pick.js";
import { createSkeleton } from "./skeleton.js";
import { createSteps } from "./steps.js";

const MAX_PIXEL_RATIO = 2;
const FOG_NEAR = 6;
const FOG_FAR = 22;
// This section's own shelf under assets/videos/, beside the teaser, the
// comparisons and the In the Wild clips — every other entry there is named for
// the section it belongs to, and a scene id that starts with a platform name
// ("douyin/…") sitting at the top level read as a fourth kind of thing. Scenes
// that are not the current hero stay on the shelf: swapping one in is then a
// markup edit, not a re-export.
const VIDEO_BASE = "assets/videos/overview";
const IMAGE_BASE = "assets/images";
// How fast the selection highlight and the swing toward a picked camera ease.
const FOCUS_RATE = 3.2;
const SWING_RATE = 2.4;

/**
 * Everything that separates act 1 from act 2 is gated on `sample.stage` — the
 * continuous position along the storyboard, 0 at the first keyframe and 1 at
 * the second — rather than on raw scroll.
 *
 * Raw scroll stopped being usable when act 1 got a hold: the first keyframe now
 * owns the first half of its span without moving, so a scroll fraction no
 * longer says where in the *storyboard* the reader is. `stage` sits at exactly
 * 0 for the whole held shot, which is what makes "nothing but the input camera
 * until the camera starts to move" a single readable condition.
 */
/**
 * Where the ring converges as act 4 arrives: the middle of the subject, not the
 * floor under it. The reconstruction is a standing figure, and a ring that folds
 * into its feet reads as falling over rather than as being absorbed.
 */
const COLLAPSE_PIVOT_Y = 1.0;

/**
 * How much larger the subject is drawn than the rig says it is.
 *
 * The skeleton, the shell and the reconstruction are all authored at life size
 * against a three-metre rig, and at that ratio the person the section is about
 * reads as a detail inside the apparatus rather than the point of it. The ring
 * cannot come in to compensate — it already spans the frame — so the subject
 * goes out.
 *
 * All three scale together and about the floor, so they stay registered with
 * each other and keep their feet on the turntable. What it costs is literal
 * scale against the ring: the frustums are still aimed at where the subject is,
 * but the subject is no longer exactly the size those cameras would have seen.
 * That is a fair trade for a diagram — nobody is measuring the figure against
 * the rig — and it is the one place in this section where the geometry is
 * deliberately not the data's.
 */
const SUBJECT_SCALE = 1.25;

/**
 * Every arrival and departure in the scene, as a window on one axis.
 *
 * That axis is `sample.stage`, which runs 0 to 3 — one unit per keyframe — and
 * is what `path.js` documents as the coordinate for anything happening *during*
 * a move. Five of these windows were written against `sample.progress` instead,
 * which is 0 to 1 across the whole section, so half the scene's timing had to be
 * divided by three in the reader's head before it could be compared with the
 * other half. Worse, the two are not proportional: `stage` has the keyframe's own
 * ease folded into it, so `progress` 0.86 is stage 2.619, not 2.58. The numbers
 * below are those conversions, exact to four places; nothing was retimed.
 *
 * Reading them as a storyboard, top to bottom: the figure and the ring arrive
 * across act 1-to-2, the conditioning renders give way to generated views across
 * 2-to-3, and 3-to-4 does four things at once — the shell dissolves, the
 * reconstruction fades up, the views are cut to the subject alone, and the ring
 * folds inward and goes.
 */
const WINDOW = {
  figure: [0.08, 0.65],
  ring: [0.12, 0.9],
  conditioning: [1.2417, 1.7583],
  hullOut: [2.352, 2.8548],
  collapse: [2.05, 2.8],
  matte: [2.53, 2.9145],
  render: [2.619, 2.9603],
  rigGone: [2.3, 2.95],
};

/**
 * Seconds a step is held before autoplay moves on, and how long the move takes.
 *
 * The dwell is the source clip's own length rather than a round number, so every
 * step shows exactly one complete cycle of the motion. Five seconds would cut a
 * 4.84-second loop mid-stride and the second pass through would start from a
 * different phase each time.
 */
const STEP_MOVE = 1.2;

export function createStage(element, { scene: sceneId, skeleton, cameras, base }, { onFail } = {}) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let disposed = false;
  const stage = document.createElement("div");
  stage.className = "pipeline__stage";
  const canvas = document.createElement("canvas");
  canvas.className = "pipeline__canvas";
  stage.append(canvas);

  element.append(stage);

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch (error) {
    stage.remove();
    throw error;
  }
  renderer.setClearColor(0x000000, 1);

  const scene = new Scene();
  scene.fog = new Fog(0x000000, FOG_NEAR, FOG_FAR);

  const camera = new PerspectiveCamera(38, 1, 0.05, 100);
  // Sees everything; the bloom pass is what temporarily stops seeing the
  // photographic surfaces.
  camera.layers.enable(NO_GLOW_LAYER);
  const bloom = createBloom(renderer);

  // One video for all twenty-four planes — see atlas.js for why twenty-four
  // elements is not an option.
  const atlas = createAtlas({
    src: `${VIDEO_BASE}/${sceneId}/tiles_generated.mp4`,
    poster: `${IMAGE_BASE}/pipeline/${sceneId}-tiles.jpg`,
    ...ATLAS_GRID,
    // Views on top, their foreground masks underneath — see atlas.js. Act 3
    // shows the views as the model produced them; act 4 cuts to the subject
    // alone, which is what the reconstruction was fit from.
    masked: true,
  });

  // A prefiltered studio for the handset, which is the only physically based
  // thing left in the scene: its materials are mostly metal, and metal with
  // nothing to reflect is black. The floor used to share it and no longer does.
  const environment = createEnvironment(renderer);

  // Reads the rig straight from the data rather than from the `centre` vector
  // further down: the shell is added from an async callback and the billboard
  // from a branch, so binding this to a declaration order would be a trap.
  const rigX = cameras.rig?.centre?.[0] ?? 0;
  const rigZ = cameras.rig?.centre?.[2] ?? 0;

  // The subject's whole sweep off the rig centre — every joint of every frame,
  // at drawn scale. The turntable sizes itself from this (ground.js). Feet
  // alone are not enough: act 4's reconstruction slides across its billboard
  // by the body's full excursion, and the joker walk stepped visibly off a
  // plate sized by a fraction alone.
  let subjectRadius = 0;
  for (const frame of skeleton.joints) {
    for (const joint of frame) {
      subjectRadius = Math.max(subjectRadius, Math.hypot(joint[0] - rigX, joint[2] - rigZ));
    }
  }
  subjectRadius *= SUBJECT_SCALE;

  const ground = createGround(cameras.rig, { subjectRadius });
  const ring = createCameraRing(cameras, { atlas });
  const figure = createSkeleton(skeleton);
  scene.add(ground.group, ring.group, figure.group);
  // Scaled about the floor under the rig centre, so the feet stay on it: a group
  // scaled about its own origin would lift or sink the figure by whatever the
  // centre is offset by.
  const subjectPivot = (group, ownY = 0) => {
    group.scale.setScalar(SUBJECT_SCALE);
    group.position.set(
      rigX * (1 - SUBJECT_SCALE),
      ownY * SUBJECT_SCALE,
      rigZ * (1 - SUBJECT_SCALE),
    );
  };
  subjectPivot(figure.group);

  // 2.3 MB of point cloud, fetched after the scene is already running. It is
  // context, not content: the section is complete without it, so it must never
  // hold up the first frame.
  let hull = null;
  loadHull(base).then(
    (data) => {
      if (disposed) return;
      hull = createHull(data);
      subjectPivot(hull.points);
      scene.add(hull.points);
    },
    (error) => console.warn("[pipeline] body shell unavailable", error),
  );

  // The conditioning renders: the stick figures the video model was actually
  // given. Act 3 crossfades each plane between this and its generated view,
  // which is the difference between demonstrating the method and describing it.
  const conditioningAtlas = createAtlas({
    src: `${VIDEO_BASE}/${sceneId}/tiles_skeleton.mp4`,
    poster: `${IMAGE_BASE}/pipeline/${sceneId}-tiles-skeleton.jpg`,
    ...ATLAS_GRID,
  });
  conditioningAtlas.onTexture(texture => ring.attachConditioning(texture, conditioningAtlas.uvRect));
  atlas.onTexture(texture => ring.attachAtlas(texture));

  const path = createCameraPath(cameras.rig);
  const orbit = createOrbitOffset(canvas, { reducedMotion });

  const panel = createPanel({ scene: sceneId, videoBase: VIDEO_BASE });
  const picker = createPicker({
    canvas,
    ring,
    onChange: (entry) => {
      if (entry) panel.show(entry);
      else panel.hide();
      orbit.notifyActivity();
    },
  });
  // Left of the canvas, vertically centred. It reads as "the video you are
  // looking at" — the view of whichever camera the reader picked.
  stage.append(panel.element);

  // The step switcher under the scene, and the only way through this section
  // that is not autoplay — which also makes it the only way a keyboard reaches
  // the steps at all.
  const mediaStatus = createMediaStatus(() => playback.retry());
  const steps = createSteps({
    status: mediaStatus.element,
    acts: ACTS,
    // Picking a step is a deliberate choice about what to look at, so it also
    // stops autoplay — otherwise the scene walks away from what the reader just
    // asked for a few seconds later.
    onSelect: (index) => goToStep(index, { manual: true }),
    onAutoplay: (on) => setAutoplay(on),
  });
  stage.append(steps.element);

  // Act 4: the 4D Gaussian render, on the camera path it was rendered from.
  const renderVideo = createAtlas({
    // The RGB-only sibling remains the no-WebGL fallback in index.html. The
    // live billboard alone fetches this stacked texture video.
    src: `${VIDEO_BASE}/${sceneId}/render_4dgs_atlas.mp4`,
    // Unlike the ordinary fallback still, this poster carries the same 1x2
    // RGB + RMBG matte layout as the video so the billboard keeps an explicit
    // alpha before the first video frame has decoded.
    poster: `${IMAGE_BASE}/pipeline/${sceneId}-render-atlas.jpg`,
    columns: 1,
    rows: 1,
    masked: true,
  });
  const flight = createFlight({
    orbit: cameras.orbit,
    video: renderVideo,
    centre: cameras.rig?.centre,
  });
  // The billboard's group already sits at the subject's mid-height, so its own
  // origin has to be carried up by the same factor for the scale to happen about
  // the floor rather than about its middle.
  if (flight) {
    subjectPivot(flight.group, flight.target.y);
    flight.group.position.x = flight.target.x;
    flight.group.position.z = flight.target.z;

    scene.add(flight.group);
  }

  // The one camera that really existed, drawn off the ring. Act 1 is a shot of
  // it and nothing else.
  const inputVideo = createAtlas({
    src: `${VIDEO_BASE}/${sceneId}/source.mp4`,
    poster: `${IMAGE_BASE}/pipeline/${sceneId}-source.jpg`,
    columns: 1,
    rows: 1,
  });
  const inputCamera = createInputCamera({
    cameras,
    video: inputVideo,
    rig: cameras.rig,
    environment: environment.texture,
  });
  scene.add(inputCamera.group);
  // The handset is the only lit object here; everything else is unlit by
  // design, so this light affects nothing but it.
  inputCamera.lights.forEach((light) => scene.add(light));

  const centre = new Vector3(cameras.rig?.centre?.[0] ?? 0, 0, cameras.rig?.centre?.[2] ?? 0);
  const eye = new Vector3();
  const look = new Vector3();

  let width = 0;
  let height = 0;
  const playback = createPlayback(
    [atlas, conditioningAtlas, renderVideo, inputVideo].map(asset => asset.media),
    { fps: skeleton.fps, onChange(state) {
      element.dataset.playbackState = state;
      mediaStatus.update(state);
      if (state === "playing") panel.resume();
      else panel.pause();
    } },
  );
  element.dataset.playbackState = playback.state;
  mediaStatus.update(playback.state);
  let running = false;
  let animationFrame = 0;
  let inView = false;
  let lastTime = 0;
  // Eased rather than switched: `focus` drives the highlight, `swing` carries
  // the view round toward whichever camera is picked. Both settle back to zero
  // when nothing is selected.
  let focus = 0;
  let swing = 0;
  /** Accumulated turntable angle, radians, and the render sweep it last saw. */
  let discSpin = 0;
  let lastSweep = null;

  function resize() {
    const rect = stage.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(rect.width));
    const nextHeight = Math.max(1, Math.round(rect.height));
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    bloom.setSize(width, height, pixelRatio);
    // Ribbon widths are in CSS pixels, so every fat-line material needs the
    // canvas size to convert them — see fat-lines.js.
    ring.setSize(width, height);
    figure.setSize(width, height, pixelRatio);
    inputCamera.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  // Which step is showing, and where the camera has got to on its way there.
  // `progress` is the same 0…1 the scroll used to supply, so every curve in the
  // frame loop below is untouched; it now eases between the four step positions
  // instead of tracking a scrollbar.
  let step = 0;
  let progress = 0;
  let moveFrom = 0;
  let moveAt = 1;
  // Seconds the current step has been settled. Autoplay counts from the end of
  // the move, not the start, so every step gets its full dwell on screen rather
  // than spending a fifth of it arriving.
  let settled = 0;
  // Off under `prefers-reduced-motion`: content that moves on its own is the
  // exact thing that preference is asking not to happen, and the button is there
  // for anyone who wants it anyway.
  let autoplay = !reducedMotion;
  const lastStep = ACTS.length - 1;
  const stepDwell = skeleton.num_frames / skeleton.fps;
  // The stage owns the flag and starts it off under `prefers-reduced-motion`, so
  // the button is told rather than left to assume. Has to come *after* the `let`
  // above: it read the flag from beside the timeline's own construction at first,
  // which is above this block, and a `let` read before its declaration throws.
  steps.setAutoplay(autoplay);
  // Whether the stage mostly fills the viewport — the narrative gate, set by
  // its own observer beside the battery gate below. The dwell counts only
  // while this is true.
  let watching = false;
  function goToStep(next, { manual = false } = {}) {
    const clamped = clamp(next, 0, lastStep);
    if (manual) setAutoplay(false);
    // Step 1 is a composed shot of a single object, and a reader who has dragged
    // the scene somewhere cannot get that composition back — the path returns to
    // the keyframe but the drag offset rides on top of it. Asking for step 1 is
    // the one unambiguous request to see the opening frame again, so it takes the
    // offset with it.
    //
    // Ahead of the early return below, so it works when the reader is already on
    // step 1: that is exactly when someone who has pushed the scene around clicks
    // it, and doing nothing would read as a dead button.
    if (clamped !== step) {
      step = clamped;
      moveFrom = progress;
      moveAt = reducedMotion ? 1 : 0;
      settled = 0;
    }
    // After the step change, never before it. Changing step is what the reader
    // asked for and restoring the framing is the extra; ordering it first meant
    // anything going wrong in here took the whole click with it, which is a
    // failure mode worth designing out even once the immediate cause is gone.
    // Given the same duration as the camera's own walk, so the framing arrives
    // whole rather than continuing to settle after the camera has stopped.
    if (clamped === 0) orbit.recentre(reducedMotion ? 1 / 60 : STEP_MOVE);
    // The idle auto-rotate is deliberately *not* reset here. It is what keeps a
    // held shot alive, and acts 2 to 4 are one held shot — stopping it for four
    // seconds at every step change turned one continuous scene back into a
    // sequence of stills.
  }

  function setAutoplay(on) {
    if (on === autoplay) return;
    autoplay = on;
    settled = 0;
    steps.setAutoplay(on);
  }

  function advance(delta) {
    const target = step / lastStep;
    if (moveAt < 1) {
      moveAt = Math.min(moveAt + delta / STEP_MOVE, 1);
      progress = moveFrom + (target - moveFrom) * smoothstep(moveAt);
      return;
    }
    progress = target;
    if (!autoplay || !watching || !playback.playing) return;
    settled += delta;
    if (settled >= stepDwell) {
      settled = 0;
      // Wraps. A reader arriving mid-sequence still gets to see all four, which
      // is what autoplay is for; the button is how they stop it.
      goToStep(step === lastStep ? 0 : step + 1);
    }
  }

  /**
   * One frame. Throwing out of here used to end the section: the next frame is
   * scheduled at the bottom, so an exception stopped the loop for good — and by
   * then `is-live` has already hidden the fallback, so the reader was left with a
   * blank rectangle. That is the one outcome this section is written to avoid,
   * and it was only ever guarded on the way in.
   *
   * The likeliest way to hit it is not a bug in here at all. Browsers cache ES
   * modules aggressively, so a reader can end up running a new `stage.js` against
   * a sibling module held from an earlier visit; the first call into anything
   * that has since gained a method throws, and the scene goes dark.
   */
  function draw(time) {
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0.016;
    lastTime = time;

    playback.tick();
    resize();
    orbit.update(delta);
    picker.setCamera(camera);

    // Where the reader is in the method, and what that implies for the scene, is
    // worked out first: the picking gate, the selection and the camera all read
    // from it.
    //
    // This used to be `scrollProgress(element)` — the section was four viewports
    // tall and scrolling moved through the steps. Steps are chosen now, by the
    // cards or by autoplay, and the section is one viewport that the page snaps
    // to. Nothing downstream changed, because everything downstream was already
    // a function of `progress`; only where the number comes from did.
    advance(delta);
    const sample = path.sample(progress);

    // The ring holds at full through act 4. It used to recede, which made sense
    // when act 4 flew the camera onto the recorded orbit; now that acts 3 and 4
    // are the same shot, dimming the generated views would be changing
    // something the reader was told stays put.
    // Resolves across act 2 and then, over the 3-to-4 boundary, draws in toward
    // the middle and goes. That collapse is the argument act 4 is making: the
    // twenty-four generated videos are not scenery beside the reconstruction,
    // they are what it was fit from, and showing them fold into it says so
    // without a caption. Act 4 is then the reconstruction alone, on its
    // turntable, which is the one thing that shot is about.
    const collapse = easeIn(sample.stage, ...WINDOW.collapse);
    const rigGone = easeIn(sample.stage, ...WINDOW.rigGone);
    const ringPresence = easeIn(sample.stage, ...WINDOW.ring) * (1 - rigGone);

    // What a camera plane shows is decided by what that act has actually
    // produced, not by what looks good. Through act 2 the rig exists and the
    // model has not run yet, so every plane shows the conditioning skeleton it
    // is about to be given; the crossfade to the generated views happens at the
    // act 2 to act 3 boundary, which is the moment the timeline claims it does.
    //
    // This was inverted at first — generated views during act 2 and a brief
    // skeleton pulse during act 3 — which showed the output before the input
    // and made the crossfade read as an effect rather than a step.
    const conditioning = 1 - easeIn(sample.stage, ...WINDOW.conditioning);

    // Act 3 only — see pick.js. Gated on the same values that decide what the
    // planes are showing, so what is clickable and what is on screen can never
    // disagree. Must run before `selected` is read: turning picking off clears
    // the selection.
    // One curve for the whole of act 4: how far the reconstruction has taken
    // over. It fades the render in, fades the skeleton and shell out, and folds
    // the ring away — and with the ring goes picking, because the planes it
    // targets are mid-collapse.
    const renderAmount = flight ? easeIn(sample.stage, ...WINDOW.render) : 0;
    picker.setEnabled(playback.playing && conditioning < 0.02 && ringPresence > 0.9 && renderAmount < 0.02);
    // The idle auto-rotate exists to show the *ring* is three-dimensional, so it
    // has no business running before the ring is there: act 1 is a still life of
    // one camera, and a scene that creeps round it reads as drift rather than as
    // depth. It also stands down whenever a camera is picked — the selection
    // swings that camera nearest the screen, and a rotation carrying on
    // afterwards would walk the reader straight back off it.
    orbit.setDrifting(sample.stage > 0.5 && picker.state.selected < 0);

    // Reduced motion means the *state change* still happens, it just does not
    // animate: the highlight and the swing snap to their destination instead of
    // easing there. A reader who asked for no motion should still see which
    // camera they picked, immediately.
    const selected = picker.state.selected;
    const wantFocus = selected >= 0 ? 1 : 0;
    focus = reducedMotion ? wantFocus : focus + (wantFocus - focus) * Math.min(1, FOCUS_RATE * delta);

    // The group clock is held at frame zero while loading and at the last
    // drawn frame while suspended or aligning. Geometry never free-runs on
    // wall time while its corresponding video is still a poster.
    const frameIndex = Math.floor(playback.time * skeleton.fps) % skeleton.num_frames;

    // The drag offset is applied around the rig centre, not the camera's own
    // axis, so dragging orbits the subject rather than swivelling in place —
    // which is what "drag to look around a light stage" should mean.
    const yaw = orbit.state.yaw + orbit.state.drift;
    const offset = eye.copy(sample.position).sub(centre);
    const radius = Math.hypot(offset.x, offset.z);
    const pathAzimuth = Math.atan2(offset.z, offset.x);

    // Swing round behind the picked camera, so it sits between the reader and
    // the subject — nearest the screen. Viewer, camera and subject end up
    // collinear, which is what makes the three things agree: the 3D figure is
    // seen from that camera's direction, the video in the panel shows the same
    // direction, and the frustum framing it is pointing the way the reader is
    // looking.
    //
    // The first version swung to the *opposite* side so the camera's screen
    // faced the reader. That put the reader's viewpoint 180° away from the view
    // they had just asked for.
    //
    // `yaw` comes off because the reader's drag offset now persists — it used
    // to spring back to zero, so leaving it out was harmless. It is not any
    // more: the eye ends up at `pathAzimuth + yaw + swing`, so a swing computed
    // without it lands short by exactly however far the reader had dragged.
    const wanted =
      selected >= 0
        ? shortestRadians(ring.entries[selected].azimuth - pathAzimuth - yaw) * 0.92
        : 0;
    swing = reducedMotion ? wanted : swing + (wanted - swing) * Math.min(1, SWING_RATE * delta);

    // Act 4 used to ride the render's own orbit: the reader was placed wherever
    // the frame currently on screen had been shot from, so the reconstruction
    // and the ring swept past each other in permanent agreement.
    //
    // It never worked. `azimuthForFrame` returned *radians* and this arithmetic
    // is in *degrees*, so the ±pi it handed back was read as ±3 degrees and the
    // camera was parked near 0 degrees rather than the path's 110 — except on the
    // frames where the lookup failed, which put it back at 110. The result was a
    // 110-degree jump to the diagonal and back on every loop of the clip.
    //
    // Not repaired, because the reason for it has gone too: the ring it was
    // agreeing with is removed by act 4 now, so there is nothing left to stay in
    // step with. The camera holds and the reconstruction turns on its turntable,
    // which is what a turntable is for.
    //
    // Anything restoring this needs `azimuths` back in `flight.js` and needs to
    // convert.
    const baseAzimuth = pathAzimuth + yaw + swing;
    const lift = Math.max(0.15, sample.position.y + orbit.state.pitch * radius * 0.6);
    eye.set(
      centre.x + radius * Math.cos(baseAzimuth),
      lift,
      centre.z + radius * Math.sin(baseAzimuth),
    );

    look.copy(sample.target);
    camera.position.copy(eye);
    camera.lookAt(look);

    // Acts 3 and 4 are one shot with one substitution in it: the render fades
    // up exactly as the skeleton and shell fade out, in place. The two curves
    // are complements of each other so the swap happens at a fixed total, and
    // the reader's eye has nothing to track but the change itself.
    flight?.update(eye, renderAmount);

    // The ring cuts its backgrounds away as the reconstruction arrives. Act 3
    // shows what the video model produced; act 4 shows the twenty-four masked
    // subjects the 4D Gaussians were actually fit from, so the ring and the
    // thing in the middle are describing the same step.
    const matte = easeIn(sample.stage, ...WINDOW.matte);



    // The path's own field of view throughout. Easing onto the render's 42.1°
    // was right when the camera stood on the recorded pose and the plane had to
    // fill the frame exactly; from the standoff it would just magnify.
    if (Math.abs(camera.fov - sample.fov) > 0.01) {
      camera.fov = sample.fov;
      camera.updateProjectionMatrix();
    }

    // Act 1 opens *on* the skeleton — it is the subject of that act, so it is
    // already there when the reader arrives rather than fading up from black.
    // The floor follows almost immediately, and the ring resolves across act 2.
    // The 3D skeleton comes up while the input panel is still on screen, so
    // act 1 reads as a handoff rather than a cut: for a moment the reader has
    // the detection on the left and the lifted skeleton in space beside it.
    // The skeleton and the shell also stand down for the render. They are the
    // *input* to the reconstruction; leaving them lit over the top of it would
    // say the two are alternatives rather than a sequence.
    figure.setOpacity(easeIn(sample.stage, ...WINDOW.figure) * (1 - renderAmount));
    // The grid is always on. It used to fade up over the first 14% of scroll,
    // which was a scene resolving out of black as the reader arrived — but step 1
    // parks at exactly progress 0 now, so that curve evaluated to zero and left
    // the opening shot with no floor at all. There is no "arriving" any more;
    // every step is a composed frame, and this one has a floor in it.
    //
    // The turntable still arrives with the figure that stands on it — see
    // ground.js.
    // The floor's spokes and rings are the rig's own diagram — where the
    // cameras stand and how far out. They leave with the cameras, so act 4 is
    // the reconstruction on its turntable and nothing else.
    // Turn the plate with the reconstruction standing on it.
    //
    // The render is a camera orbiting a subject that never moves, so played on a
    // billboard in front of a still reader the subject is what appears to turn —
    // and until now the floor under it did not, which left act 4 as a figure
    // spinning on a plate that was not. The reader's own idle drift was the only
    // thing moving the plate, at a twentieth the speed and in no fixed relation.
    //
    // Driven by the render's frame rather than by wall time, so if the video
    // stalls or is still loading the plate stalls with it and they never come
    // apart. Differences are taken the short way round, which is what carries the
    // turn continuously through the loop: the clip covers 340 degrees, so its last
    // frame to its first is a +20 degree step rather than a jump home.
    //
    // Scaled by `renderAmount` so the plate is still while act 3 is on screen and
    // eases up to the render's own rate as act 4 arrives — an accumulated angle
    // rather than a scaled one, so easing in never puts the two out of phase.
    //
    // `rotation.z`, not `.y`: the plate is laid flat by a -90 degree turn about X,
    // which puts its local Z along world up.
    if (flight) {
      const renderFrame = renderVideo.media.state === "ready"
        ? Math.floor(renderVideo.currentTime * skeleton.fps) % flight.numFrames : 0;
      const sweep = flight.sweepForFrame(renderFrame);
      if (lastSweep !== null && playback.playing) {
        discSpin += shortestRadians(sweep - lastSweep) * renderAmount;
      }
      lastSweep = sweep;
      ground.setSpin(discSpin);
    }

    ground.setOpacity(1 - rigGone, easeIn(sample.stage, ...WINDOW.figure));
    // Scaled about the subject rather than the world origin, which is where the
    // reconstruction stands — the ring has to converge on *it*, not on the floor
    // beneath it. The children hold world coordinates, so scaling the group and
    // translating by the pivot's complement is the whole transform.
    const shrink = 1 - collapse * 0.94;
    ring.group.scale.setScalar(shrink);
    ring.group.position.set(
      centre.x * (1 - shrink),
      COLLAPSE_PIVOT_Y * (1 - shrink),
      centre.z * (1 - shrink),
    );
    ring.update(eye, ringPresence, {
      selected,
      hovered: picker.state.hovered,
      focus,
      conditioning,
      matte,
    });

    // Appears as the camera pulls back out of act 1, in the spot the reader
    // just vacated, and leaves over the 2-to-3 boundary: once the generated
    // views arrive the method has moved past the thing it started from, and
    // leaving it there would suggest it is still contributing.
    //
    // Drift is on wall time, not the video clock — a hand does not hold still
    // between frames, and it should keep moving even when the reader does not.
    inputCamera.update(
      time / 1000,
      // Through acts 1 to 3, then out with the ring.
      //
      // It stays that long because the section's claim is that one ordinary
      // video is where all of this came from, and the claim is worth restating
      // beside each thing the video turns into. Act 4 is where it stops being
      // worth it: the reconstruction is the whole subject of that shot, and by
      // then the reader has been told where it came from three times.
      //
      // Fades where it stands rather than retreating. The ring collapses inward
      // because it is converging on the thing it produced; the input camera
      // produced that too, but it is outside the ring and pulling it to the
      // centre would draw a line the method does not have.
      1 - rigGone,
    );

    if (hull) {
      hull.setFrame(frameIndex);
      // The shell belongs to act 3, and only to act 3.
      //
      // It arrives with the generated views — over the same window the planes
      // cross from conditioning skeletons to generated frames — because that is
      // when a volume starts being implied: twenty-four views of a person carve
      // one out. Then it leaves ahead of the reconstruction, so act 4 is the
      // 4D Gaussians alone rather than Gaussians wearing the hull they were
      // carved from.
      //
      // Nothing about the shell is decorative, which is why it is absent from
      // acts 1 and 2: before the views exist there is nothing to carve it from.
      hull.setOpacity(
        easeIn(sample.stage, ...WINDOW.conditioning) * (1 - easeIn(sample.stage, ...WINDOW.hullOut)),
      );
    }

    // Playback is tied to time, not to scroll: the subject should keep moving
    // while the reader is still, or a paused figure reads as a broken video.
    figure.setFrame(frameIndex);

    // The *chosen* step, not the camera's: a tab should light up the moment it
    // is clicked, not halfway through the move it starts. The second number is
    // how far through this step's dwell autoplay has counted, which is what the
    // indicator fills with.
    steps.update(step, autoplay && moveAt >= 1 ? settled / stepDwell : 0);

    bloom.render(scene, camera);
  }

  function frame(time) {
    if (!running) return;
    try {
      draw(time);
    } catch (error) {
      // Stop rather than retry. Whatever this is will be just as broken next
      // frame, and sixty exceptions a second buries the one that matters. The
      // caller puts the fallback back.
      running = false;
      onFail?.(error);
      return;
    }
    animationFrame = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = 0;
    animationFrame = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(animationFrame);
  }

  // Intersection controls rendering; the group owns every media transition.
  // Cancellation also prevents a pending start from reviving a hidden page.
  function updateVisibility() {
    const visible = inView && !document.hidden;
    playback.setActive(visible);
    if (visible) start();
    else { stop(); panel.pause(); }
  }
  function onPageHide() {
    playback.setActive(false);
    stop();
    panel.pause();
  }
  const observer = new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting);
    updateVisibility();
  }, { rootMargin: "20% 0px" });
  observer.observe(element);
  document.addEventListener("visibilitychange", updateVisibility);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", updateVisibility);

  // The narrative gate, beside the battery gate above and deliberately not
  // the same test: that one asks "is drawing worth the power" and starts a
  // 20% margin early so the scene arrives already moving; this one asks "is
  // anyone watching the show". Counting the dwell from the pre-roll meant the
  // tour advanced as soon as a sliver of the section crossed the viewport —
  // a reader lingering over the hero's teaser arrived at act 2 or 3, and the
  // opening act had played to nobody. At 0.6 of a section exactly one
  // viewport tall, "watching" means the stage owns most of the screen. First
  // sight is act 1 from its first second; leaving mid-tour holds the
  // countdown where it is, and coming back resumes it rather than rewinding.
  const watchObserver = new IntersectionObserver(
    (entries) => {
      watching = entries.some((entry) => entry.intersectionRatio >= 0.6);
    },
    { threshold: [0.6] },
  );
  watchObserver.observe(element);

  // Scrolling used to reset the idle countdown, on the reasoning that scrolling
  // *was* interacting with the scene: the section was four viewports tall and
  // scroll position chose the step. It has not been that for a while. The steps
  // are clicked, the section is one viewport, and scrolling is the reader moving
  // through the page rather than touching anything here.
  //
  // Left in, it read as a bug, and a bad one. Acts 2 to 4 are a held shot, so the
  // idle drift is the only movement the viewpoint has — and a scroll fires events
  // continuously, pinning the countdown at zero for as long as the reader keeps
  // moving and a second beyond. The scene visibly stopped whenever the page was
  // scrolled, which is the opposite of what the drift is for.
  window.addEventListener("resize", resize, { passive: true });

  // Watch the stage's own box, not just the window.
  //
  // The section only reaches its real height once index.js adds `.is-live`,
  // which happens *after* this function returns — so the first measurement was
  // taken against the pre-live layout and, with nothing but a window resize to
  // correct it, stayed wrong for the life of the page. A stale aspect maps a
  // narrower field of view onto a wider viewport, which stretches everything
  // horizontally: the figure comes out short and wide and the camera ring
  // flattens into an ellipse.
  const observer2 =
    typeof ResizeObserver === "function" ? new ResizeObserver(() => resize()) : null;
  observer2?.observe(stage);

  resize();
  updateVisibility();

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      playback.dispose();
      mediaStatus.dispose();
      document.removeEventListener("visibilitychange", updateVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", updateVisibility);
      observer.disconnect();
      watchObserver.disconnect();
      observer2?.disconnect();
      window.removeEventListener("resize", resize);
      picker.dispose();
      panel.dispose();
      steps.dispose();
      atlas.dispose();
      conditioningAtlas.dispose();
      renderVideo.dispose();
      inputVideo.dispose();
      inputCamera.dispose();
      flight?.dispose();
      orbit.dispose();
      ground.dispose();
      hull?.dispose();
      ring.dispose();
      figure.dispose();
      bloom.dispose();
      environment.dispose();
      renderer.dispose();
      stage.remove();
    },
  };
}
