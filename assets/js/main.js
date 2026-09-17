/**
 * Entry point. Each feature lives in its own module and is a no-op when the
 * markup it looks for is absent, so sections can be added to or removed from
 * index.html without touching this file.
 */
import { initClipboard } from "./clipboard.js";
import { initGallery } from "./gallery.js";
import { initPipeline } from "./pipeline/index.js";
import { initTabs } from "./tabs.js";
import { initTeaser } from "./teaser.js";
import { initTopbar } from "./topbar.js";

function main() {
  initTopbar();
  initTabs();
  initGallery();
  initClipboard();
  // Boots eagerly — its section is barely over a viewport down, so deferral
  // never deferred (pipeline/index.js says the rest); only rendering waits.
  initPipeline();
  // After the pipeline, which stamps the classes the teaser waits on.
  initTeaser();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main, { once: true });
} else {
  main();
}
