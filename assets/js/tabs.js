/**
 * Accessible tab switcher.
 *
 * Bound today by the In the Wild sheet, whose category tabs are written in
 * this contract by .dev/tools/build_in_the_wild.py. The module predates that
 * sheet — it was written for a tabbed section since deleted, and waited here
 * for the next switcher. Do not go looking for its markup in `#overview` —
 * that section is named for what it shows the reader, and its step switcher
 * is its own code.
 *
 * Markup contract:
 *   <div class="tabs" data-tabs>
 *     <div class="tabs__track" data-tabs-track>        (this level optional)
 *       <div class="tabs__rail" data-tabs-rail>
 *         <ul role="tablist">
 *           <li><button role="tab" aria-controls="PANEL_ID">…</button></li>
 *         </ul>
 *       </div>
 *     </div>
 *     <div class="tabs__panels">
 *       <div class="tabs__panel" id="PANEL_ID" role="tabpanel">…</div>
 *     </div>
 *   </div>
 *
 * With data-tabs-track and data-tabs-rail present, an indicator pill is
 * created in the rail and slid under the active tab, the track scrolls to
 * keep that tab in view, and a scrolled track fades the edge that has more
 * row beyond it — the same segmented-control manner as the Overview step
 * switcher, whose steps.js is where each of those measures was worked out.
 * Without them the tablist is plain buttons and none of that runs.
 *
 * Nothing is hidden until this binds: the no-JS page shows every panel
 * stacked, and `hidden` on the inactive ones is applied here at runtime.
 *
 * Any <video> inside a panel is played while its panel is active and paused
 * otherwise, so hidden clips never burn decode time — which is also what
 * parks a selected pill's looping preview while its tab is away.
 */
export function initTabs(root = document) {
  root.querySelectorAll("[data-tabs]").forEach(setupTabGroup);
}

function setupTabGroup(group) {
  const tabs = [...group.querySelectorAll('[role="tab"]')];
  if (!tabs.length) return;

  const slider = setupSlider(group);

  const panelFor = (tab) =>
    group.querySelector(`#${CSS.escape(tab.getAttribute("aria-controls"))}`);

  function select(tab, { focus = false } = {}) {
    slider?.point(tab);
    tabs.forEach((candidate) => {
      const isActive = candidate === tab;
      candidate.setAttribute("aria-selected", String(isActive));
      // Only the active tab stays in the tab order; arrow keys move between them.
      candidate.tabIndex = isActive ? 0 : -1;

      const panel = panelFor(candidate);
      if (!panel) return;
      panel.toggleAttribute("data-active", isActive);
      panel.hidden = !isActive;

      panel.querySelectorAll("video").forEach((video) => {
        if (isActive) {
          video.currentTime = 0;
          // Autoplay can be refused (e.g. battery saver) — not an error worth surfacing.
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    });

    if (focus) tab.focus();
  }

  group.addEventListener("click", (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab && tabs.includes(tab)) select(tab);
  });

  group.addEventListener("keydown", (event) => {
    const current = tabs.indexOf(document.activeElement);
    if (current === -1) return;

    const offsets = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next;

    if (event.key in offsets) {
      next = (current + offsets[event.key] + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    select(tabs[next], { focus: true });
  });

  select(tabs.find((tab) => tab.getAttribute("aria-selected") === "true") ?? tabs[0]);
}

/**
 * The sliding pill, for a group whose markup opts in. A lean port of the
 * step switcher's measures — see steps.js for why each is the way it is.
 */
function setupSlider(group) {
  const track = group.querySelector("[data-tabs-track]");
  const rail = group.querySelector("[data-tabs-rail]");
  if (!track || !rail) return null;

  const indicator = document.createElement("span");
  indicator.className = "tabs__indicator";
  indicator.setAttribute("aria-hidden", "true");
  rail.prepend(indicator);

  let current = null;
  let settled = false; // the first point() must place, not slide from zero

  function measure({ smooth = true } = {}) {
    if (!current) return;
    // Rects, not offsetLeft: offsets are measured against whichever ancestor
    // happens to be positioned, which is a fact about the stylesheet.
    const railBox = rail.getBoundingClientRect();
    const tabBox = current.getBoundingClientRect();
    const start = tabBox.left - railBox.left;
    if (!settled) indicator.style.transition = "none";
    rail.style.setProperty("--indicator-x", `${Math.round(start)}px`);
    rail.style.setProperty("--indicator-w", `${Math.round(tabBox.width)}px`);
    if (!settled) {
      void indicator.offsetWidth; // commit the jump before transitions return
      indicator.style.transition = "";
      settled = true;
    }

    // Only the track scrolls, and only horizontally — scrollIntoView would
    // let the browser pick which ancestors to move, including the page.
    const wanted = start - (track.clientWidth - tabBox.width) / 2;
    const limit = Math.max(track.scrollWidth - track.clientWidth, 0);
    track.scrollTo({
      left: Math.min(Math.max(wanted, 0), limit),
      behavior:
        smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "smooth"
          : "auto",
    });
  }

  // Fade whichever edge has more row beyond it — what scroll paddles would
  // say, without two more controls. A row that fits fades neither edge.
  const FADE = "2rem";
  let fades = "";
  function syncFades() {
    const slack = track.scrollWidth - track.clientWidth;
    const start = slack > 1 && track.scrollLeft > 1 ? FADE : "0px";
    const end = slack > 1 && track.scrollLeft < slack - 1 ? FADE : "0px";
    if (`${start} ${end}` === fades) return;
    fades = `${start} ${end}`;
    track.style.setProperty("--fade-start", start);
    track.style.setProperty("--fade-end", end);
  }
  track.addEventListener("scroll", syncFades, { passive: true });

  const observer = new ResizeObserver(() => {
    measure({ smooth: false });
    syncFades();
  });
  observer.observe(track);
  // Fonts change the width of every label, and the indicator's only job is
  // to be exactly as wide as a word.
  document.fonts?.ready.then(() => measure({ smooth: false }));

  return {
    point(tab) {
      current = tab;
      measure();
    },
  };
}
