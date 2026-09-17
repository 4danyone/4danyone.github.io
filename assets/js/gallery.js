/**
 * Thumbnail-driven video switcher used by the Comparisons and In the Wild
 * sections.
 *
 * Markup contract:
 *   <div data-gallery>
 *     <video data-gallery-stage></video>
 *     <button data-src="clip.mp4" data-poster="poster.jpg"
 *             data-preview="clip-pill.mp4" aria-pressed="false">…</button>
 *   </div>
 *
 * Adding a scene means adding one <button> — no JS change required.
 * data-preview is optional, per button: a button that carries one grows a
 * silent looping video of it under the pointer and under keyboard focus, and
 * the selected button keeps its looping — selection reads as the one picture
 * that is moving.
 *
 * An optional checkbox marked data-gallery-autonext, anywhere inside the
 * gallery, turns the stage into a reel: while checked, a clip that ends
 * selects the next pill in the selected pill's own panel (its tab group,
 * found by [role="tabpanel"]; the whole gallery when there are no panels),
 * wrapping at the end. Unchecked, the stage loops the current clip — the
 * checkbox and the stage's `loop` trade places, because `ended` never fires
 * on a looping video. A gallery without the checkbox keeps its markup loop.
 *
 * Three decisions here are about when bytes move, and all are invisible when
 * they work:
 *
 * - The stage stays empty until the gallery nears the viewport — one viewport
 *   out — then warms only its poster and metadata. Playback waits until at
 *   least 35% of the stage is visible and the document is in the foreground.
 *   Leaving that viewing area pauses at the current frame and cancels the next
 *   clip's prefetch; returning resumes unless the reader paused it themselves.
 *   Both galleries sit well below the fold, so a reader who never comes this
 *   far still costs nothing.
 *
 * - A preview starts FETCHING the moment the pointer enters but starts
 *   PLAYING a beat later, so the network hides inside the same delay that
 *   filters a pointer merely crossing the sheet. The still underneath is the
 *   preview's own first frame, so playback reads as the picture starting to
 *   move — never as a load. A click adopts the hover's already-playing video
 *   as the pinned one rather than restarting it.
 *
 * - While the reel is on, the next clip is fetched during the seconds the
 *   current one plays and held as a blob the stage is handed at the advance,
 *   so the cut is a cut — not two seconds of frozen poster over a network
 *   fetch, which is what deploying revealed. At most one clip is held, only
 *   autonext galleries hold any, and Data Saver holds none.
 *
 * At most two previews are alive at a time: the selected pill's, which stays,
 * and the pointer's, which leaving aborts and removes. Previews never take
 * clicks — pointer-events: none in the CSS; a preview that swallowed the
 * mousedown once cost every switch a second click, because unfocusing the
 * previous pill tore the pressed element out of the DOM mid-click. Cleanup is
 * scoped for the same reason: a blur or mouseleave only ever removes its own
 * thumb's preview. Touch (no hover to mean anything) and
 * prefers-reduced-motion get no previews at all.
 */

// How far ahead of arrival work starts, and how long a hover preview waits
// before moving. 150 ms swallows a crossing pointer and is usually enough for
// the first frames of a ~100 kB file to arrive on the connection the page
// warmed. A click waits for neither — selection is deliberate.
const NEAR = "100% 0px";
const PREVIEW_DELAY_MS = 150;
const PLAYBACK_VISIBLE_RATIO = 0.35;

export function initGallery(root = document) {
  root.querySelectorAll("[data-gallery]").forEach(setupGallery);
}

function setupGallery(gallery) {
  const stage = gallery.querySelector("[data-gallery-stage]");
  const thumbs = [...gallery.querySelectorAll("[data-src]")];
  if (!stage || !thumbs.length) return;

  const previews = setupPreviews(thumbs);
  const auto = gallery.querySelector("[data-gallery-autonext]");
  const reel = auto ? setupReelPrefetch() : null;
  let stageInView = typeof IntersectionObserver !== "function";
  let wantsPlayback = true;
  let internalPauseEvents = 0;
  let advanceWhenVisible = false;

  const selected = () =>
    thumbs.find((t) => t.getAttribute("aria-pressed") === "true");

  // The reel's next hop: the following pill in the selected pill's own panel
  // (its tab group, found by [role="tabpanel"]; the whole gallery when there
  // are no panels), wrapping at the end. Shared by the advance itself and by
  // the prefetch running ahead of it — the two must never disagree about
  // where the reel goes.
  function nextOf(thumb) {
    if (!thumb) return null;
    const scope = thumb.closest('[role="tabpanel"]');
    const pool = scope ? thumbs.filter((t) => scope.contains(t)) : thumbs;
    const next = pool[(pool.indexOf(thumb) + 1) % pool.length];
    return next && next !== thumb ? next : null;
  }

  const canPlay = () => stageInView && !document.hidden;

  function pauseInternally() {
    if (stage.paused) return;
    internalPauseEvents += 1;
    stage.pause();
  }

  function warmNext() {
    if (!reel || !auto.checked || !canPlay() || stage.paused) return;
    const next = nextOf(selected());
    if (next) reel.warm(next.dataset.src);
  }

  function playIfAllowed() {
    if (!canPlay() || !wantsPlayback || !stage.getAttribute("src")) return;
    stage.play().catch(() => {});
  }

  function syncPlaybackVisibility() {
    if (!canPlay()) {
      pauseInternally();
      reel?.cancel();
      return;
    }

    if (advanceWhenVisible && auto?.checked && wantsPlayback) {
      advanceWhenVisible = false;
      const next = nextOf(selected());
      if (next) {
        show(next);
        return;
      }
    }

    advanceWhenVisible = false;
    playIfAllowed();
  }

  function show(thumb) {
    wantsPlayback = true;
    advanceWhenVisible = false;
    thumbs.forEach((candidate) =>
      candidate.setAttribute("aria-pressed", String(candidate === thumb)),
    );

    // Poster is swapped first so the frame never flashes empty while the new
    // clip loads — and it stays visible if the clip is missing entirely.
    if (thumb.dataset.poster) stage.poster = thumb.dataset.poster;
    // The prefetch may already hold this clip's bytes; a blob URL plays the
    // moment it is handed over, which is what makes the advance a cut.
    if (!stage.paused) internalPauseEvents += 1;
    stage.src = reel?.take(thumb.dataset.src) ?? thumb.dataset.src;
    stage.load();
    previews.pin(thumb);
    playIfAllowed();
  }

  stage.addEventListener("loadeddata", playIfAllowed);
  stage.addEventListener("play", () => {
    wantsPlayback = true;
    // A play request can arrive from native media controls while the page is
    // being hidden. Keep the intent, but never let it start background work.
    if (!canPlay()) pauseInternally();
  });
  stage.addEventListener("pause", () => {
    if (internalPauseEvents) {
      internalPauseEvents -= 1;
      return;
    }
    // A pause while the player is viewable came from the reader. Remember it
    // so a scroll away and back does not unexpectedly restart the clip.
    if (canPlay() && !stage.ended) {
      wantsPlayback = false;
      reel?.cancel();
    }
  });
  // The moment playback really begins its successor is known, and the seconds
  // this one spends playing are when the next one's bytes may move.
  stage.addEventListener("playing", warmNext);
  gallery.addEventListener("click", (event) => {
    const thumb = event.target.closest("[data-src]");
    if (!thumb || !thumbs.includes(thumb)) return;
    show(thumb);
    // A click means "show me this one", so bring the stage back into view if
    // the sheet has carried the reader away from it — `nearest` makes this a
    // no-op whenever it is already on screen. The frame, not the bare video,
    // so the panel labels come with it.
    (stage.closest(".gallery__frame, .frame") ?? stage).scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest",
    });
  });

  if (auto) {
    const syncLoop = () => (stage.loop = !auto.checked);
    syncLoop();
    auto.addEventListener("change", () => {
      syncLoop();
      // Checked mid-clip: the next hop only became worth having now.
      if (auto.checked) {
        warmNext();
      } else {
        advanceWhenVisible = false;
        reel.cancel();
      }
    });
    stage.addEventListener("ended", () => {
      if (!auto.checked) return;
      if (!canPlay()) {
        advanceWhenVisible = true;
        return;
      }
      const next = nextOf(selected());
      // No scroll here, unlike a click: the reel advancing must never move
      // the page under a reader who has drifted off to browse the sheet.
      if (next) show(next);
    });
  }

  if (typeof IntersectionObserver === "function") {
    const playbackObserver = new IntersectionObserver(
      ([entry]) => {
        stageInView =
          entry.isIntersecting &&
          entry.intersectionRatio >= PLAYBACK_VISIBLE_RATIO;
        syncPlaybackVisibility();
      },
      { threshold: [0, PLAYBACK_VISIBLE_RATIO] },
    );
    playbackObserver.observe(stage);
  }
  document.addEventListener("visibilitychange", syncPlaybackVisibility);

  // The first clip is selected only once the gallery nears the viewport.
  // No clip can be clicked before this fires: the buttons are inside the
  // observed element, so anything hoverable means it already has.
  const first =
    thumbs.find((t) => t.getAttribute("aria-pressed") === "true") ?? thumbs[0];
  if (typeof IntersectionObserver !== "function") {
    show(first);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      show(first);
    },
    { rootMargin: NEAR },
  );
  observer.observe(gallery);
}

/**
 * One clip fetched ahead while the reel plays, kept as a blob and handed to
 * the stage at the advance. A blob rather than a warmed HTTP cache because
 * Safari's media loader does not reliably return to the page cache for its
 * range requests — a held blob is instant in every browser, and it is one
 * mosaic (~1.5 MB), not a library. The URL the stage is playing stays alive
 * until the following advance replaces it; revoked sooner, the element's own
 * later range reads against it would fail.
 */
function setupReelPrefetch() {
  let want = null; // the src being fetched or held — at most one
  let controller = null;
  let held = null; // blob URL ready to hand over
  let live = null; // blob URL the stage is playing now

  const cancel = () => {
    controller?.abort();
    controller = null;
    want = null;
    if (held) URL.revokeObjectURL(held);
    held = null;
  };

  const warm = (src) => {
    if (want === src || navigator.connection?.saveData) return;
    cancel();
    controller = new AbortController();
    want = src;
    fetch(src, { signal: controller.signal })
      .then((response) =>
        response.ok
          ? response.blob()
          : Promise.reject(new Error(String(response.status))),
      )
      .then((blob) => {
        if (want === src) held = URL.createObjectURL(blob);
      })
      // A lost prefetch just means the advance pays the network price the way
      // it did before prefetching existed.
      .catch(() => {});
  };

  const take = (src) => {
    if (want !== src || !held) {
      // A click can select a different clip while another is warming, or the
      // wanted clip can still be in flight. The stage's own request wins;
      // keeping the speculative request would download the same bytes twice.
      cancel();
      return null;
    }
    if (live) URL.revokeObjectURL(live);
    live = held;
    held = null;
    want = null;
    return live;
  };

  return { warm, take, cancel };
}

function setupPreviews(thumbs) {
  const enabled = () =>
    matchMedia("(hover: hover)").matches &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;

  let pinned = null; // { thumb, video } — the selected pill's, kept looping
  let hovered = null; // { thumb, video, timer } — the pointer's

  const spawn = (thumb) => {
    const video = document.createElement("video");
    video.className = "gallery__thumb-preview";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto"; // the fetch is the point: it runs during the delay
    video.setAttribute("aria-hidden", "true"); // it duplicates the img beside it
    video.addEventListener(
      "playing",
      () => video.classList.add("is-playing"),
      { once: true },
    );
    video.src = thumb.dataset.preview;
    thumb.append(video);
    return video;
  };

  const discard = (entry) => {
    if (!entry) return;
    clearTimeout(entry.timer);
    entry.video.pause();
    entry.video.removeAttribute("src"); // abort an in-flight fetch
    entry.video.load();
    entry.video.remove();
  };

  const enter = (thumb) => {
    if (hovered?.thumb === thumb || pinned?.thumb === thumb) return;
    discard(hovered);
    hovered = null;
    if (!enabled()) return;
    const video = spawn(thumb);
    hovered = {
      thumb,
      video,
      timer: setTimeout(() => video.play().catch(() => {}), PREVIEW_DELAY_MS),
    };
  };

  const leave = (thumb) => {
    if (hovered?.thumb !== thumb) return; // never someone else's — see header
    discard(hovered);
    hovered = null;
  };

  const pin = (thumb) => {
    if (pinned?.thumb === thumb) return;
    discard(pinned);
    pinned = null;
    if (!enabled() || !thumb.dataset.preview) return;
    // Reached by the reel advancing while this pill's tab is away: a preview
    // in a hidden panel would decode invisibly, so the pill keeps its still.
    if (thumb.closest("[hidden]")) return;
    if (hovered?.thumb === thumb) {
      // Adopt the video already playing under the pointer: the click that
      // selected this pill must not restart its picture.
      clearTimeout(hovered.timer);
      pinned = { thumb: hovered.thumb, video: hovered.video };
      hovered = null;
      pinned.video.play().catch(() => {}); // if the hover delay had not elapsed
    } else {
      const video = spawn(thumb);
      video.play().catch(() => {});
      pinned = { thumb, video };
    }
  };

  for (const thumb of thumbs) {
    if (!thumb.dataset.preview) continue;
    thumb.addEventListener("mouseenter", () => enter(thumb));
    thumb.addEventListener("mouseleave", () => leave(thumb));
    thumb.addEventListener("focus", () => enter(thumb));
    thumb.addEventListener("blur", () => leave(thumb));
  }

  return { pin };
}
