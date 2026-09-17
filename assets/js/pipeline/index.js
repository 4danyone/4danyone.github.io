/**
 * Interactive pipeline visualization — one continuous 3D scene, driven by the
 * step switcher under it.
 *
 * Markup contract:
 *   <div class="pipeline" data-pipeline data-pipeline-scene="SCENE_ID">
 *     <div class="pipeline__fallback">…poster and plain video list…</div>
 *   </div>
 *
 * SCENE_ID names a folder under assets/data/ (skeleton.json, cameras.json) and
 * under assets/videos/overview/. Everything else — camera count, frame count,
 * frame rate, ring radius — comes from those files. Nothing here may hardcode
 * them: they differ between scenes.
 *
 * Progressive enhancement, in the repo's usual shape but for WebGL: the
 * fallback in the markup is the real content and is visible from the first
 * paint. This module *adds* a canvas on top and sets `.is-live`, which is what
 * hides the fallback. Every failure path — no WebGL2, no three.js, bad data,
 * reduced-motion-plus-no-context — leaves `.is-live` off, so the reader keeps
 * the fallback instead of getting a blank rectangle.
 *
 * Those paths also stamp `.is-static`. Wherever `@media (scripting: enabled)`
 * matches, layout.css holds the stage's viewport from the first paint — on a
 * networked load this module arrives well after layout, and the section
 * snapping from ordinary flow to a full viewport moved the whole page under
 * the reader — and `is-static` is the release that hands the space back once
 * it is known no canvas is coming.
 *
 * Boot is eager, rendering is lazy: three.js and the scene data start
 * fetching as soon as this module runs — alongside the teaser, which is the
 * only thing above the section — and the render loop only runs while the
 * section is on screen. The boot used to wait on an IntersectionObserver at
 * 150% margin, but the section sits about 1.3 viewports down the page, so
 * the observer fired at load on every realistic window: a deferral that
 * never deferred, deleted in favour of the behaviour it was already
 * producing.
 */

// Delays before each boot attempt. A first failure is usually not the device
// saying no but the network saying not-yet: on a cold load the module graph
// and the scene data race the teaser's megabytes for one connection, and a
// starved fetch must read as "boot a moment later", never as a page that
// quietly gave up the canvas — measured live, where one lost stream was
// collapsing the section for good. By the second pause the teaser has
// buffered and the contention is gone. Modern engines re-fetch a failed
// module on the next import(); one that still caches the failure just fails
// fast into the fallback, where it would have landed anyway.
const BOOT_ATTEMPT_DELAYS_MS = [0, 2000, 7000];

export function initPipeline(root = document) {
  root.querySelectorAll("[data-pipeline]").forEach(setupPipeline);
}

function setupPipeline(element) {
  const scene = element.dataset.pipelineScene;
  // Refusing is no longer silent: layout.css reserves the stage's viewport
  // from the first paint wherever scripting is enabled, and `is-static` is
  // what hands that space back to ordinary flow.
  if (!scene || !supportsWebGL2() || isLowPower()) {
    element.classList.add("is-static");
    return;
  }

  boot(element, scene);
}

async function boot(element, scene) {
  // Says "WebGL is coming". The fallback's job is to serve a reader who will
  // never get a canvas; while one is actively on its way, a list of videos they
  // are about to lose is noise — and on a cold load, fetching three.js and the
  // scene data takes long enough to read it. The class also reserves the live
  // height, so nothing jumps when the canvas arrives.
  element.classList.add("is-booting");
  // One line answering "why is this figure sitting in a full viewport". It is
  // created here rather than written in the markup and hidden by CSS, because
  // markup outlives scripts and a "Loading…" that can outlive the load is a
  // lie in waiting; made here, it exists exactly while the boot is underway
  // and every exit below removes it.
  const loading = document.createElement("p");
  loading.className = "caption pipeline__loading";
  loading.textContent = "Loading the interactive scene…";
  element.querySelector(".pipeline__fallback .figure")?.after(loading);

  // Giving up releases the reserved frame, so it is saved for the one
  // conclusion that has to move the page: no canvas is ever coming.
  const surrender = () => {
    loading.remove();
    element.classList.remove("is-booting");
    element.classList.add("is-static");
  };

  for (const [attempt, delay] of BOOT_ATTEMPT_DELAYS_MS.entries()) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      const [{ createStage }, data] = await Promise.all([
        import("./stage.js"),
        loadScene(scene),
      ]);
      const stage = createStage(element, data, {
        // The same recovery as a failed boot, just later: drop `is-live` and the
        // fallback — a poster and a plain list of videos — comes back on its own.
        // Without it the reader keeps a canvas that has stopped drawing, which is
        // the blank rectangle this whole arrangement exists to prevent.
        onFail(error) {
          element.classList.remove("is-live", "is-booting");
          element.classList.add("is-static");
          console.error("[pipeline] stopped after starting, fallback restored", error);
          stage.dispose();
        },
      });
      if (!stage) {
        // A deliberate refusal, not a fetch that lost a race — retrying would
        // ask the same question and get the same answer.
        surrender();
        return;
      }
      // One state replacing another, not a second one arriving. `is-booting` used
      // to be left on here: every rule it drives is written as a pair with
      // `is-live`, and the fallback it hides is hidden wholesale once the canvas
      // is up, so the leftover was invisible — which is the argument for removing
      // it rather than against. A class that means "still loading" outliving the
      // load is a trap for the next rule written against it.
      loading.remove();
      element.classList.replace("is-booting", "is-live");
      return;
    } catch (error) {
      if (attempt < BOOT_ATTEMPT_DELAYS_MS.length - 1) {
        console.warn(`[pipeline] boot attempt ${attempt + 1} failed, retrying`, error);
        continue;
      }
      // Leaving `.is-live` off is the whole recovery: the fallback is already on
      // screen. Surface the reason anyway — a silent failure here looks
      // identical to a reader who simply has WebGL disabled.
      surrender();
      console.error("[pipeline] failed to start, keeping the fallback", error);
    }
  }
}

async function loadScene(scene) {
  const base = `assets/data/${scene}`;
  const [skeleton, cameras] = await Promise.all([
    fetchJSON(`${base}/skeleton.json`),
    fetchJSON(`${base}/cameras.json`),
  ]);

  // Cheap contract checks. The page and the exporter have to agree, and a
  // mismatch here produces a scene that looks subtly wrong rather than one
  // that fails, which is far more expensive to debug later.
  if (skeleton.up_axis !== "y" || cameras.up_axis !== "y") {
    throw new Error(`expected a Y-up scene, got ${skeleton.up_axis}/${cameras.up_axis}`);
  }
  if (cameras.camera_space !== "opengl" || cameras.extrinsics !== "c2w") {
    throw new Error(
      `cameras.json must be c2w/opengl, got ${cameras.extrinsics}/${cameras.camera_space}`,
    );
  }
  if (!skeleton.num_frames || !skeleton.joints?.length) {
    throw new Error("skeleton.json has no frames");
  }

  return { scene, skeleton, cameras, base };
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  return response.json();
}

/**
 * Devices that would run this badly are better served by not running it.
 *
 * The section decodes two 1056x1280 videos and draws ~50 transparent objects
 * with a postprocessing pass; on a weak phone that is a stuttering scene *and*
 * a hot battery, when the fallback below it — a poster and a list of the same
 * videos — says the same thing at a fraction of the cost. Both signals are
 * advisory and absent in some browsers, so the test is deliberately narrow:
 * only refuse when a browser positively reports a small machine.
 */
function isLowPower() {
  const memory = navigator.deviceMemory;
  const cores = navigator.hardwareConcurrency;
  return (memory !== undefined && memory < 4) || (cores !== undefined && cores < 4);
}

function supportsWebGL2() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}
