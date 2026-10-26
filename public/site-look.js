/*
 * The site's look, shared by every page: the theme (auto, light or dark) and the style preset (Glass unless
 * changed; also default, airy, paper). Picked on any page, kept in localStorage, applied on the next page before it
 * paints: data-theme and data-look on the root drive the page backdrop (demo/site-look.css). Pages built from
 * <fft-widget> tags get the preset through each tag's preset attribute; the demo's own pages read it with
 * window.siteLook.get().
 *
 * The language works the same way: English, French or German, picked in the Look menu, kept in localStorage
 * (martcharts:lang) and in the address (?lang=fr), which wins, so a shared link opens in its language. Charts and
 * dashboards follow it (<fft-widget> tags through their locale attribute, the demo's own pages through
 * window.siteLook.get().lang); the site's own menu and page text stay in English.
 */
(() => {
  const KEY = "martcharts:look";
  const LANG_KEY = "martcharts:lang";
  /** The languages offered, with the locale charts are drawn in. */
  const LOCALES = { en: "en-US", fr: "fr-FR", de: "de-DE" };
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
  const storedLang = () => {
    try {
      const value = localStorage.getItem(LANG_KEY);
      return value && Object.hasOwn(LOCALES, value) ? value : "en";
    } catch {
      return "en";
    }
  };
  const writeLang = (lang) => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // Blocked storage: the address still carries it.
    }
  };
  /** The language: the address's (?lang=fr) when it names one, which is then kept; else the one picked before. */
  const readLang = () => {
    const asked = new URLSearchParams(location.search).get("lang");
    if (asked && Object.hasOwn(LOCALES, asked.toLowerCase())) {
      const lang = asked.toLowerCase();
      if (lang !== storedLang()) writeLang(lang);
      return lang;
    }
    return storedLang();
  };
  /** The address carries a chosen language (?lang=fr), so a copied or shared link opens in it; English needs none. */
  const keepInAddress = (lang) => {
    const url = new URL(location.href);
    if (lang === "en") url.searchParams.delete("lang");
    else url.searchParams.set("lang", lang);
    if (url.href !== location.href) history.replaceState(history.state, "", url);
  };
  /** The French and German reading guides, for pages on the lite bundle (the full one carries them). */
  const loadReading = (lang) => {
    if (lang === "en" || document.querySelector("script[data-site-reading]")) return;
    const lite = document.querySelector('script[src*="martcharts-lite.iife.js"]');
    if (!lite) return;
    const reading = document.createElement("script");
    reading.src = lite.getAttribute("src").replace("martcharts-lite.iife.js", "martcharts-reading.iife.js");
    reading.dataset.siteReading = "";
    document.head.append(reading);
  };
  /** <fft-widget> tags draw in the language: a locale attribute over the spec's own, removed for English. */
  const applyLang = (lang) => {
    for (const el of document.querySelectorAll("fft-widget")) {
      if (lang === "en") el.removeAttribute("locale");
      else el.setAttribute("locale", LOCALES[lang]);
    }
    loadReading(lang);
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
    for (const [key, value] of [["theme", look.theme || "auto"], ["preset", look.preset || "default"], ["lang", look.lang || "en"]]) {
      for (const b of document.querySelectorAll(`[data-look-key="${key}"] button[data-look-value]`)) b.setAttribute("aria-pressed", String(b.dataset.lookValue === value));
    }
  };
  const apply = (look) => {
    applyTheme(look.theme);
    applyPreset(look.preset);
    applyLang(look.lang || "en");
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
  let lang = readLang();
  keepInAddress(lang);
  const current = () => ({ ...read(), lang });
  window.siteLook = {
    get: current,
    /** The locale charts draw in: undefined for English, so specs keep their own (all of them English). */
    locale: () => (lang === "en" ? undefined : LOCALES[lang]),
    set(patch) {
      const { lang: nextLang, ...look } = patch;
      if (nextLang && Object.hasOwn(LOCALES, nextLang)) {
        lang = nextLang;
        writeLang(lang);
        keepInAddress(lang);
      }
      if (Object.keys(look).length) write({ ...read(), ...look });
      const next = current();
      apply(next);
      return next;
    },
  };
  /**
   * The Look menu in the site bar: a theme applies at once (the page and its charts follow the root's data-theme). A
   * style changes how charts are drawn: the page hears it as a cancelable "martcharts:look" event and restyles its
   * charts in place (calling preventDefault); a page that does not, and has no <fft-widget> tags, reloads in the new style.
   */
  const wireMenu = () => {
    for (const b of document.querySelectorAll("[data-look-key] button[data-look-value]")) {
      b.addEventListener("click", () => {
        const key = b.closest("[data-look-key]").dataset.lookKey;
        const before = current();
        const next = window.siteLook.set({ [key]: b.dataset.lookValue });
        // A language redraws charts and boards: the page hears "martcharts:lang" and redraws in place
        // (preventDefault); one that does not, and has no <fft-widget> tags (which follow by themselves), reloads.
        if (key === "lang") {
          if (before.lang === next.lang) return;
          const handled = !window.dispatchEvent(new CustomEvent("martcharts:lang", { detail: next, cancelable: true }));
          if (!handled && !document.querySelector("fft-widget")) location.reload();
          return;
        }
        if (key !== "preset" || before.preset === next.preset) return;
        const handled = !window.dispatchEvent(new CustomEvent("martcharts:look", { detail: next, cancelable: true }));
        if (!handled && !document.querySelector("fft-widget")) location.reload();
      });
    }
    // Escape or a click elsewhere closes the menu.
    const menu = document.querySelector(".site-look-menu");
    if (!menu) return;
    document.addEventListener("click", (event) => {
      if (menu.open && !menu.contains(event.target)) menu.removeAttribute("open");
    });
    menu.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !menu.open) return;
      menu.removeAttribute("open");
      menu.querySelector("summary").focus();
    });
  };
  const start = () => {
    apply(current());
    wireMenu();
    showCurrent();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  // Another tab changed the look: follow it.
  window.addEventListener("storage", (event) => event.key === KEY && apply(current()));
})();
