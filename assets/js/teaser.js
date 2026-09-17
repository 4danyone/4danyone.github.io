/**
 * Starts the hero teaser once the page's small files have had the wire.
 *
 * Markup contract: one `<video data-teaser>` with a `poster`, `controls` and
 * `preload="none"`, and *no* `autoplay` — this module is what plays it. With
 * scripting off the hero is the poster and a play button, which is the film
 * as content rather than as motion; that trade is deliberate, and the reason
 * is below.
 *
 * The teaser is the page's one heavyweight (~35 MB), and `autoplay` fetched
 * it from the first parse. On a cold load over one HTTP/2 connection the
 * server floods it down without regard for the client's priorities, and
 * every small file queues behind it: measured on the deployed site over a
 * throttled line, the stylesheets took 4 s, a five-kilobyte main.js took
 * 16 s, and the Overview — whose whole boot is ~1.3 MB — never went live in
 * 45 s. Held back until the Overview settles (`is-live` or `is-static`), the
 * critical bytes own the wire for the first seconds and the film then
 * streams into an idle connection; the reader sees its poster meanwhile,
 * which is the film's own first frame. A ceiling keeps a pathological boot —
 * retries can pause for seconds — from holding the film hostage.
 *
 * Reduced motion: never auto-played. The reader has said what they want
 * about things that move on their own; the poster and the controls remain.
 */

const SETTLED = ["is-live", "is-static"];
const CEILING_MS = 4000;

export function initTeaser(root = document) {
  const video = root.querySelector("video[data-teaser]");
  if (!video) return;

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let observer;
  let ceiling;
  const start = () => {
    observer?.disconnect();
    clearTimeout(ceiling);
    video.play().catch(() => {
      // Autoplay refused (an unmuted state, a policy) — the poster and the
      // controls are already the fallback, so there is nothing to repair.
    });
  };

  const pipeline = root.querySelector("[data-pipeline]");
  const settled = () => SETTLED.some((cls) => pipeline.classList.contains(cls));
  if (!pipeline || settled()) {
    start();
    return;
  }

  ceiling = setTimeout(start, CEILING_MS);
  observer = new MutationObserver(() => {
    if (settled()) start();
  });
  observer.observe(pipeline, { attributes: true, attributeFilter: ["class"] });
}
