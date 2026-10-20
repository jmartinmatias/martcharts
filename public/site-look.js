/*
 * The site's look, shared by every page: the theme (auto, light or dark) and the style preset (Glass unless
 * changed; also default, airy, paper). Picked on any page, kept in localStorage, applied on the next page before it
 * paints: data-theme and data-look on the root drive the page backdrop (demo/site-look.css). Pages built from
 * <fft-widget> tags get the preset through each tag's preset attribute; the demo's own pages read it with
 * window.siteLook.get().
 */
(() => {
  const KEY = "martcharts:look";
  /** The look before anyone picks one: Glass, following the system theme. */
  const DEFAULTS = { theme: "auto", preset: "glass" };
  const root = document.documentElement;
  const read = () => {
    try {
      return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || "{}") || {}) };
    } catch {
      return { ...DEFAULTS };
    }
  };
  const write = (look) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(look));
    } catch {
      // Private windows and blocked storage: the look still applies to this page.
    }
  };
  const applyTheme = (theme) => {
    if (!theme || theme === "auto") {
      delete root.dataset.theme;
      root.style.colorScheme = "";
    } else {
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
    }
  };
  const applyPreset = (preset) => {
    root.dataset.look = preset || "default";
    for (const el of document.querySelectorAll("fft-widget")) {
      if (preset && preset !== "default") el.setAttribute("preset", preset);
      else el.removeAttribute("preset");
    }
  };
  /** Marks the page's own Theme and Style switches, where it has them. */
  const mark = (look) => {
    for (const [id, value] of [["theme", look.theme || "auto"], ["preset", look.preset || "default"]]) {
      for (const b of document.querySelectorAll(`#${id} button[data-value]`)) b.setAttribute("aria-pressed", String(b.dataset.value === value));
    }
  };
  const apply = (look) => {
    applyTheme(look.theme);
    applyPreset(look.preset);
    mark(look);
  };
  /** On a narrow screen the nav scrolls sideways: bring the current page into view. */
  const showCurrent = () => {
    const nav = document.querySelector(".site-nav");
    const current = nav?.querySelector('[aria-current="page"]');
    if (nav && current && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, current.offsetLeft + current.offsetWidth - nav.clientWidth + 34);
  };

  // Before the first paint: theme and backdrop. The tags and switches wait for the page to be parsed.
  const first = read();
  applyTheme(first.theme);
  root.dataset.look = first.preset || "default";
  window.siteLook = {
    get: read,
    set(patch) {
      const next = { ...read(), ...patch };
      write(next);
      apply(next);
      return next;
    },
  };
  const start = () => {
    apply(read());
    showCurrent();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  // Another tab changed the look: follow it.
  window.addEventListener("storage", (event) => event.key === KEY && apply(read()));
})();
