/**
 * The detail panel: the picked camera's generated view, at full resolution.
 *
 * Deliberately *not* fed from the atlas. The atlas tiles are 176×320 and matted
 * onto black, which is right for the ring and wrong here — at panel size the
 * downscale shows, and the invented background is the interesting part of a
 * generated view, not something to hide. So this loads the unmatted 704×1280
 * encode instead.
 *
 * One video element, reused. Twenty-four preloaded elements is the thing the
 * atlas exists to avoid, and it would be no better in the DOM than in the
 * scene: the reader only ever looks at one.
 */
const FADE_MS = 220;

export function createPanel({ scene, videoBase }) {
  const root = document.createElement("figure");
  root.className = "pipeline__panel";
  root.hidden = true;

  const video = document.createElement("video");
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";
  video.className = "pipeline__panel-video";

  const caption = document.createElement("figcaption");
  caption.className = "pipeline__panel-caption";

  root.append(video, caption);

  let current = -1;
  let hideTimer = 0;

  function show(entry) {
    if (!entry) {
      hide();
      return;
    }
    if (entry.index === current) return;
    current = entry.index;

    window.clearTimeout(hideTimer);
    const src = `${videoBase}/${scene}/gen_cam${entry.camera.label}.mp4`;
    if (!video.src.endsWith(src)) {
      video.src = src;
      video.load();
    }
    // Every one of them is generated, and none is closer to the truth than
    // another — the real camera is drawn separately, off the ring.
    caption.textContent = `Camera ${entry.camera.label} — generated`;

    root.hidden = false;
    // Next frame, so the transition has an initial state to animate from.
    requestAnimationFrame(() => root.classList.add("is-visible"));
    video.play().catch(() => {});
  }

  function hide() {
    if (current < 0) return;
    current = -1;
    root.classList.remove("is-visible");
    video.pause();
    // Stay in the layout until the fade finishes, then leave it entirely so it
    // is not a focus stop or a screen-reader stop while invisible.
    hideTimer = window.setTimeout(() => {
      root.hidden = true;
    }, FADE_MS);
  }

  return {
    element: root,
    show,
    hide,
    pause() {
      video.pause();
    },
    resume() {
      if (current >= 0) video.play().catch(() => {});
    },
    dispose() {
      window.clearTimeout(hideTimer);
      video.pause();
      video.removeAttribute("src");
      video.load();
      root.remove();
    },
  };
}
