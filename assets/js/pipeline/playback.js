/** The Overview's only playback policy and animation clock.
 *
 * loading -> paused -> starting -> playing
 * Any active state can be suspended; failed resources leave the group.
 * A new operation cancels the previous one before touching any decoder.
 * Rendering continues during loading, but `time` and the tour dwell do not.
 */
export function createPlayback(sources, { fps, onChange = () => {} }) {
  let state = "loading";
  let active = false;
  let time = 0;
  let operation = null;
  let lastAlignment = -Infinity;
  const available = () => sources.filter(source => source.state === "ready");
  const pause = () => sources.forEach(source => source.pause());
  const setState = next => {
    if (state === next) return;
    state = next;
    onChange(state);
  };

  function cancel() {
    operation?.abort();
    operation = null;
    pause();
  }

  async function start() {
    if (operation || !active || state === "disposed") return;
    const task = new AbortController();
    operation = task;
    pause();
    setState("starting");
    try {
      await Promise.all(available().map(async source => {
        try { await source.seek(time, task.signal); }
        catch (error) { if (!task.signal.aborted) source.fail(error); }
      }));
      if (task.signal.aborted) return;
      let blocked = false;
      // All play() calls happen in this same turn, before awaiting any decoder.
      await Promise.all(available().map(async source => {
        try { await source.play(task.signal); }
        catch (error) {
          if (task.signal.aborted) return;
          if (error.name === "NotAllowedError") blocked = true;
          else source.fail(error);
        }
      }));
      if (task.signal.aborted) return;
      lastAlignment = performance.now();
      if (blocked) { pause(); setState("blocked"); }
      else setState(available().length ? "playing" : "static");
    } finally {
      if (operation === task) operation = null;
    }
  }

  function reconcile() {
    if (state === "disposed" || operation) return;
    if (sources.some(source => source.state === "loading")) return;
    if (!available().length) { setState("static"); return; }
    if (!active) { setState("paused"); return; }
    if (state === "buffering" && available().some(source => source.element.readyState < 3)) return;
    if (state !== "playing" && state !== "blocked") void start();
  }
  const unsubscribe = sources.map(source => source.subscribe(reconcile));

  return {
    get state() { return state; },
    get time() { return time; },
    get playing() { return state === "playing"; },
    setActive(value) {
      if (state === "disposed" || active === value) return;
      active = value;
      if (!active) {
        // Keep the last frame the scene actually drew, not a partially advanced
        // decoder clock observed after visibilitychange.
        cancel();
        setState(sources.some(source => source.state === "loading") ? "loading" : "paused");
      } else reconcile();
    },
    retry() {
      if (state === "blocked") { setState("paused"); reconcile(); }
    },
    tick() {
      reconcile();
      if (state !== "playing") return;
      const group = available();
      if (!group.length) return;
      // Buffer/decoder interruptions hold the entire clock group. Seeking at a
      // native loop boundary is transient: let it finish before comparing time.
      if (group.some(source => source.element.seeking)) return;
      if (group.some(source => source.element.paused || source.element.readyState < 3)) {
        cancel();
        setState("buffering");
        return;
      }
      const leader = group[0].element;
      const drift = video => {
        const delta = (leader.currentTime % video.duration) - video.currentTime;
        return delta - video.duration * Math.round(delta / video.duration);
      };
      if (performance.now() - lastAlignment > 1000 && group.some(source => Math.abs(drift(source.element)) > 0.3)) {
        // Large discontinuities are repaired while the scene holds its frame,
        // never by issuing new follower seeks on successive render frames.
        void start();
        return;
      }
      time = leader.currentTime;
      group.slice(1).forEach(source => {
        const offset = drift(source.element);
        const rate = Math.abs(offset) <= 2 / fps ? 1 : 1 + Math.sign(offset) * 0.04;
        if (source.element.playbackRate !== rate) source.element.playbackRate = rate;
      });
    },
    dispose() {
      if (state === "disposed") return;
      cancel();
      unsubscribe.forEach(remove => remove());
      setState("disposed");
    },
  };
}
