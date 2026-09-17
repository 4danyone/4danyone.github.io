/**
 * Sticky mini-nav: reveals itself once the hero scrolls away and highlights
 * the section currently in view.
 *
 * Markup contract:
 *   <header class="topbar" data-topbar>
 *     <a class="topbar__link" href="#section-id" data-topbar-also="id id…">…</a>
 *   </header>
 *   <section data-topbar-trigger>…</section>
 *
 * data-topbar-trigger marks the hero: the bar stays hidden until that
 * element's bottom edge scrolls past the top of the viewport, and pins
 * outright when the attribute (or IntersectionObserver) is missing.
 *
 * data-topbar-also is optional: further section ids the link stands for, so
 * one entry can cover a run of sections — Demo lands on #demo and stays lit
 * through #in-the-wild. The list assumes link order matches section order,
 * which everything about this bar already did.
 */
export function initTopbar(root = document) {
  const topbar = root.querySelector("[data-topbar]");
  if (!topbar) return;

  const hero = root.querySelector("[data-topbar-trigger]");
  const links = [...topbar.querySelectorAll(".topbar__link")];
  const linkOf = new Map(); // section element -> the link that stands for it
  for (const link of links) {
    const ids = [
      link.getAttribute("href"),
      ...(link.dataset.topbarAlso ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => `#${id}`),
    ];
    for (const id of ids) {
      const section = root.querySelector(id);
      if (section) linkOf.set(section, link);
    }
  }
  const sections = [...linkOf.keys()];

  // Pin the bar as soon as the hero's bottom edge passes the top of the viewport.
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => topbar.classList.toggle("is-pinned", !entry.isIntersecting),
      { threshold: 0 },
    ).observe(hero);
  } else {
    topbar.classList.add("is-pinned");
  }

  if (!sections.length || !("IntersectionObserver" in window)) return;

  const visible = new Set();
  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }

      // With several sections on screen, the topmost one wins.
      const active = sections.find((section) => visible.has(section));
      links.forEach((link) =>
        link.classList.toggle(
          "is-active",
          Boolean(active) && linkOf.get(active) === link,
        ),
      );
    },
    { rootMargin: "-20% 0px -60% 0px" },
  );

  sections.forEach((section) => spy.observe(section));
}
