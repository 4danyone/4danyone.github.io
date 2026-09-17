/**
 * The step switcher under the scene: four tabs in a pill, one description.
 *
 * It has been three things. A caption line said what was happening. A vertical
 * rail down the right said where in the method that was, but fought the 3D scene
 * for space — the input camera's bearing was chosen twice over to keep its image
 * rectangle from sliding behind it. A row of four cards under the canvas fixed
 * that and showed all four descriptions at once, which turned out to be three
 * paragraphs of competition for the one the reader is actually on.
 *
 * So: the titles are a switcher, and only the current step explains itself. What
 * that buys is the description getting the full width and the reader's whole
 * attention, and the four titles reading as one control rather than four
 * columns of text.
 *
 * The indicator is a single element that slides. Its width and offset are
 * measured from the active tab and written to CSS custom properties, which is
 * the only way to animate between four different widths — four separate
 * backgrounds cross-fading cannot move, and moving is what says "these are
 * positions in one sequence" rather than "these are four buttons".
 *
 * Measured, therefore re-measured: after fonts load, on resize, and whenever the
 * active tab changes. A pill sized against a fallback font is wrong by about a
 * character and a half, which is very visible on a shape whose whole job is to
 * line up with a word.
 *
 * ARIA is the page's existing tablist contract — the same shape `tabs.js`
 * documents for the Overview switcher, so both switchers behave alike for a
 * keyboard or a screen reader. Arrow keys select rather than only moving focus,
 * because the panel is a sentence and there is nothing to be gained by making
 * the reader press twice.
 *
 * The autoplay switch is not a convenience. Autoplay is what demonstrates the
 * sequence to a reader who never thinks to click, and content that moves on its
 * own has to be stoppable — so the control is the price of having autoplay at
 * all rather than an extra.
 */
import { clamp } from "./math.js";

export function createSteps({ acts, onSelect, onAutoplay, status }) {
  const root = document.createElement("div");
  root.className = "pipeline__steps";

  const bar = document.createElement("div");
  bar.className = "pipeline__steps-bar";

  const platter = document.createElement("div");
  platter.className = "pipeline__steps-platter";

  // Scrolls when the four labels are wider than the viewport.
  const track = document.createElement("div");
  track.className = "pipeline__steps-track";
  // The scrolled content, and the indicator's containing block. Positioning the
  // indicator against the scroller itself would work in most browsers and be
  // ambiguous in the spec; against an ordinary element inside it, "the same
  // coordinates as the tabs" is simply true.
  const rail = document.createElement("div");
  rail.className = "pipeline__steps-rail";

  const indicator = document.createElement("span");
  indicator.className = "pipeline__steps-indicator";
  indicator.setAttribute("aria-hidden", "true");
  // The countdown rides under the active label rather than in a bar of its own.
  // One shared track below the row was tried and read as a separate widget: it
  // put the readout somewhere other than the thing it is counting down.
  const dwell = document.createElement("span");
  dwell.className = "pipeline__steps-dwell";
  indicator.append(dwell);

  const list = document.createElement("ul");
  list.className = "pipeline__steps-list";
  list.setAttribute("role", "tablist");
  list.setAttribute("aria-label", "Pipeline steps");

  const panels = document.createElement("div");
  panels.className = "pipeline__steps-panels";

  const items = acts.map((act, index) => {
    const item = document.createElement("li");
    item.className = "pipeline__steps-item";
    item.setAttribute("role", "presentation");

    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "pipeline__steps-tab";
    tab.setAttribute("role", "tab");
    tab.id = `pipeline-step-tab-${index}`;

    const number = document.createElement("span");
    number.className = "pipeline__steps-index";
    // Literal, like the Overview switcher's — these number the steps of a method,
    // not the sections of the page, so a CSS counter would be the wrong source.
    //
    // Unpadded, unlike that switcher's 01/02/03, and the difference is structural
    // rather than a lapse. Zero-padding exists to give numerals a common width so
    // a column of them lines up; the Overview switcher is a stacked list, where
    // that is exactly what happens. This is a row. Nothing sits under anything,
    // so the zero aligns nothing and is two glyphs doing one glyph's work at
    // 12px — while costing width on the one control that runs out of it.
    number.textContent = String(index + 1);
    const label = document.createElement("span");
    label.className = "pipeline__steps-label";
    label.textContent = act.title;
    tab.append(number, label);

    const panel = document.createElement("p");
    panel.className = "pipeline__steps-panel";
    panel.id = `pipeline-step-panel-${index}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    panel.textContent = act.body;
    tab.setAttribute("aria-controls", panel.id);

    tab.addEventListener("click", () => onSelect(index));
    item.append(tab);
    list.append(item);
    panels.append(panel);
    return { item, tab, panel };
  });

  // Roving tabIndex with automatic activation, matching the Overview switcher.
  list.addEventListener("keydown", (event) => {
    const current = items.findIndex((entry) => entry.tab === document.activeElement);
    if (current === -1) return;
    const offsets = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next;
    if (event.key in offsets) {
      next = (current + offsets[event.key] + items.length) % items.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = items.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    items[next].tab.focus();
    onSelect(next);
  });

  /**
   * The autoplay control: a label and a switch, the same capsule-and-knob
   * form the In the Wild section uses for its Autoplay Next option — one
   * mechanism for "keep advancing on its own" across the page. The switch
   * governs the tour's advance, not the videos; those never stop, which is
   * why the earlier Play/Pause button was the wrong words for this.
   */
  const option = document.createElement("label");
  option.className = "pipeline__steps-option";
  option.append(document.createTextNode("Autoplay"));
  const switchEl = document.createElement("input");
  switchEl.type = "checkbox";
  switchEl.className = "pipeline__steps-switch";
  switchEl.setAttribute("role", "switch");
  switchEl.addEventListener("change", () => onAutoplay(switchEl.checked));
  option.append(switchEl);

  const controls = document.createElement("div");
  controls.className = "pipeline__steps-controls";
  if (status) controls.append(status);
  controls.append(option);

  rail.append(indicator, list);
  track.append(rail);
  platter.append(track);
  bar.append(controls, platter);
  root.append(bar, panels);

  let playing = true;
  let active = -1;

  function paintTransport() {
    // Reflect, do not fire: assigning `checked` does not emit `change`, so
    // state pushed from the stage (a tab click stopping autoplay) cannot echo
    // back through onAutoplay.
    switchEl.checked = playing;
  }

  /**
   * Point the indicator at the active tab, and bring that tab into view if the
   * row is scrolled. Also the one place the row's text extent — first tab's
   * numeral to last tab's label — is published, for the description below to
   * align its edges to; it changes exactly when the indicator's width does
   * (fonts, resize), so the two share a measurement pass.
   *
   * Rects rather than `offsetLeft`, because `offsetLeft` is measured against
   * whichever ancestor happens to be positioned and that is a fact about the
   * stylesheet, not about this module.
   */
  function measure({ smooth = true } = {}) {
    if (items.length) {
      const firstText = items[0].tab.firstElementChild.getBoundingClientRect();
      const lastText = items[items.length - 1].tab.lastElementChild.getBoundingClientRect();
      root.style.setProperty("--steps-text-width", `${Math.round(lastText.right - firstText.left)}px`);
    }
    const entry = items[active];
    if (!entry) return;
    const railBox = rail.getBoundingClientRect();
    const tabBox = entry.tab.getBoundingClientRect();
    // Both rects are viewport-relative, so the difference already has the
    // scroll offset in it.
    const start = tabBox.left - railBox.left;
    root.style.setProperty("--indicator-x", `${Math.round(start)}px`);
    root.style.setProperty("--indicator-w", `${Math.round(tabBox.width)}px`);

    // Only the track scrolls, and only horizontally. `scrollIntoView` would let
    // the browser pick which ancestors to move, and one of this element's
    // ancestors is a full-viewport scene the page snaps to.
    const wanted = start - (track.clientWidth - tabBox.width) / 2;
    const limit = Math.max(track.scrollWidth - track.clientWidth, 0);
    track.scrollTo({
      left: clamp(wanted, 0, limit),
      behavior:
        smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "smooth"
          : "auto",
    });
  }

  /**
   * Fade whichever edge has more row beyond it.
   *
   * This is what a pair of scroll arrows would have been for, and it says the
   * same thing without adding two more controls to a bar that already has five.
   * A row that fits fades neither edge; a row scrolled to its end stops fading
   * the end it has arrived at, so the fade is only ever a promise that there is
   * something there.
   */
  const FADE = "2rem";
  let fades = "";
  function syncFades() {
    const slack = track.scrollWidth - track.clientWidth;
    // A pixel of tolerance: fractional layout means scrollLeft rarely lands on
    // its limit exactly, and a permanently half-faded edge looks like a bug.
    const start = slack > 1 && track.scrollLeft > 1 ? FADE : "0px";
    const end = slack > 1 && track.scrollLeft < slack - 1 ? FADE : "0px";
    // Called every frame, so it writes only when something actually changed —
    // and every frame because there is no one moment when this is knowable.
    // Reading it once on the first update caught the track before it had its
    // width, left both edges at zero, and then nothing ever asked again: the
    // row does not resize and an unscrolled row fires no scroll event.
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
  // Fonts change the width of every label, and the indicator's only job is to
  // be exactly as wide as a word.
  document.fonts?.ready.then(() => measure({ smooth: false }));

  paintTransport();

  return {
    element: root,

    /** Reflects state the stage owns — it also stops autoplay on a pick. */
    setAutoplay(on) {
      playing = on;
      paintTransport();
      if (!on) root.style.setProperty("--dwell", "0");
    },

    /**
     * @param {number} step index of the current step
     * @param {number} progress 0…1 through this step's autoplay dwell, 0 when
     *   autoplay is off or the camera is still moving
     */
    update(step, progress) {
      root.style.setProperty("--dwell", String(clamp(progress, 0, 1)));
      syncFades();
      if (step === active) return;
      const first = active === -1;
      active = step;
      items.forEach((entry, index) => {
        const isActive = index === step;
        entry.tab.setAttribute("aria-selected", String(isActive));
        entry.tab.tabIndex = isActive ? 0 : -1;
        entry.panel.toggleAttribute("data-active", isActive);
        // Kept in the DOM so the panel stack keeps the height of the tallest and
        // nothing jumps between steps; hidden from assistive technology and from
        // the tab order so only the current one is reachable.
        entry.panel.setAttribute("aria-hidden", String(!isActive));
        entry.panel.inert = !isActive;
      });
      // The first paint should not animate from nowhere.
      measure({ smooth: !first });
    },

    dispose() {
      track.removeEventListener("scroll", syncFades);
      observer.disconnect();
      root.remove();
    },
  };
}
