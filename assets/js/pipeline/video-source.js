/** One owned video resource. No scene clock or visibility policy lives here.
 *
 * Fetch the complete short loop before decoding. Paused <video preload=auto>
 * is only a hint and can stop fetching after metadata on mobile browsers.
 * Blob URLs make readiness independent of that heuristic and avoid network
 * seeks once the synchronized group starts. URLs and requests live exactly
 * as long as this resource; none are shared with the optional detail panel.
 */
const IDLE_TIMEOUT_MS = 30000;
const DECODE_TIMEOUT_MS = 10000;

function cancellable(promise, signals, timeoutMs) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      signals.forEach(signal => signal?.removeEventListener("abort", aborted));
    };
    const finish = (callback, value) => { cleanup(); callback(value); };
    const aborted = () => finish(reject, new DOMException("Media operation cancelled", "AbortError"));
    const timer = setTimeout(() => finish(reject, new Error("Video decoder timed out")), timeoutMs);
    signals.forEach(signal => signal?.addEventListener("abort", aborted, { once: true }));
    promise.then(value => finish(resolve, value), error => finish(reject, error));
    if (signals.some(signal => signal?.aborted)) aborted();
  });
}

export function createVideoSource(src) {
  const element = document.createElement("video");
  element.muted = true;
  element.loop = true;
  element.playsInline = true;
  element.preload = "auto";
  // Original URL remains useful for diagnostics after src becomes a blob URL.
  element.dataset.mediaSource = src;
  const lifetime = new AbortController();
  const listeners = new Set();
  let state = "loading";
  let error = null;
  let url = null;
  let idleTimer = 0;
  const emit = () => listeners.forEach(listener => listener());

  function pause() {
    element.pause();
    element.playbackRate = 1;
  }

  function fail(reason) {
    if (state === "failed" || state === "disposed") return;
    error = reason;
    state = "failed";
    clearTimeout(idleTimer);
    lifetime.abort();
    pause();
    console.warn(`[pipeline] video unavailable: ${src}`, reason);
    emit();
  }

  // Each awaited decoder event unregisters on success, error, abort or timeout.
  async function waitFor(event, satisfied, signal) {
    if (satisfied()) return;
    let done;
    let failed;
    const eventPromise = new Promise((resolve, reject) => {
      done = resolve;
      failed = () => reject(new Error(`Video decode failed: ${src}`));
      element.addEventListener(event, done);
      element.addEventListener("error", failed);
    });
    try {
      await cancellable(eventPromise, [lifetime.signal, signal], DECODE_TIMEOUT_MS);
    } finally {
      element.removeEventListener(event, done);
      element.removeEventListener("error", failed);
    }
  }

  async function load() {
    const touch = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => fail(new Error(`No download progress: ${src}`)), IDLE_TIMEOUT_MS);
    };
    try {
      touch();
      const response = await fetch(src, { signal: lifetime.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${src}`);
      const reader = response.body.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        touch();
      }
      clearTimeout(idleTimer);
      lifetime.signal.throwIfAborted();
      url = URL.createObjectURL(new Blob(chunks, { type: "video/mp4" }));
      element.src = url;
      element.load();
      await waitFor("canplay", () => element.readyState >= 3);
      lifetime.signal.throwIfAborted();
      state = "ready";
      emit();
      return element;
    } catch (reason) {
      fail(reason);
      throw reason;
    } finally { clearTimeout(idleTimer); }
  }

  const onError = () => fail(new Error(element.error?.message || `Cannot decode ${src}`));
  element.addEventListener("error", onError);
  const ready = load();
  // Rendering and the group may subscribe after a synchronous fetch failure.
  ready.catch(() => {});

  return {
    element,
    ready,
    get state() { return state; },
    get error() { return error; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    fail,
    pause,
    async play(signal) {
      await cancellable(element.play(), [lifetime.signal, signal], DECODE_TIMEOUT_MS);
    },
    async seek(seconds, signal) {
      if (state !== "ready") return;
      signal?.throwIfAborted();
      const target = ((seconds % element.duration) + element.duration) % element.duration;
      if (!element.seeking && Math.abs(element.currentTime - target) < 0.0005) return;
      element.currentTime = target;
      await waitFor("seeked", () => !element.seeking, signal);
    },
    dispose() {
      if (state === "disposed") return;
      state = "disposed";
      lifetime.abort();
      clearTimeout(idleTimer);
      listeners.clear();
      element.removeEventListener("error", onError);
      pause();
      element.removeAttribute("src");
      element.load();
      if (url) URL.revokeObjectURL(url);
    },
  };
}
