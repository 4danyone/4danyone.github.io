/** Loading and autoplay recovery chrome; no media policy here. */
export function createMediaStatus(onRetry) {
  const element = document.createElement("div");
  element.className = "pipeline__media-status caption";
  const message = document.createElement("span");
  message.setAttribute("role", "status");
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "button button--ghost";
  retry.textContent = "Play videos";
  retry.addEventListener("click", onRetry);
  element.append(message, retry);
  return {
    element,
    update(state) {
      const text = {
        loading: "Loading videos…",
        starting: "Preparing playback…",
        buffering: "Preparing playback…",
        blocked: "Ready to play.",
        static: "Videos unavailable. Showing previews.",
      }[state] ?? "";
      message.textContent = text;
      retry.hidden = state !== "blocked";
      element.hidden = !text;
    },
    dispose() { retry.removeEventListener("click", onRetry); element.remove(); },
  };
}
