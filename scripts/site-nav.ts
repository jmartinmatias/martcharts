/**
 * The site's navigation, one source for every page: seven items, the page you are on marked, and one Look menu (theme
 * and style together) at the end of the bar. The catalog generators write it into their pages; the hand-written pages
 * get it from this script:
 *
 *   node scripts/site-nav.ts        rewrites the bar in every hand-written page
 *
 * src/pages.test.ts checks that every page carries exactly what `navBar` writes for it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** The seven items, in order: where each goes from the site root, and the one line its title gives. */
export const NAV = [
  { label: "Home", href: "index.html", title: "What martcharts is, and where to start" },
  { label: "Dashboards", href: "dashboards.html", title: "Four worked dashboards: sales, commercial, client health and regulatory" },
  { label: "Editor", href: "editor.html", title: "A chart from a table, without writing JSON; or edit any chart's JSON directly" },
  { label: "Composer", href: "composer.html", title: "Lay saved charts out into a dashboard" },
  { label: "Catalog", href: "catalog/index.html", title: "Every chart type, what it needs, and a spec to copy" },
  { label: "Embed", href: "examples/drop-in.html", title: "Every way to put a chart on a page" },
  { label: "Lab", href: "lab.html", title: "Experiments: new versions of any chart, and the ones worth keeping" },
] as const;

export type NavLabel = (typeof NAV)[number]["label"];

/**
 * Every page of the site, the nav item it belongs to, and the prefix its links take from where it sits. The Lab's
 * two experiments mark Lab; the data guide is the Catalog's second tab.
 */
export const PAGES: { file: string; current: NavLabel; up: "./" | "../" }[] = [
  { file: "index.html", current: "Home", up: "./" },
  { file: "dashboards.html", current: "Dashboards", up: "./" },
  { file: "editor.html", current: "Editor", up: "./" },
  { file: "composer.html", current: "Composer", up: "./" },
  { file: "catalog/index.html", current: "Catalog", up: "../" },
  { file: "catalog/guide.html", current: "Catalog", up: "../" },
  { file: "examples/drop-in.html", current: "Embed", up: "../" },
  { file: "lab.html", current: "Lab", up: "./" },
  { file: "taller.html", current: "Lab", up: "./" },
  { file: "selected.html", current: "Lab", up: "./" },
];

/** The style presets offered in the Look menu, as the library names them, with the word shown. */
const STYLES = [
  ["glass", "Glass"],
  ["default", "Plain"],
  ["airy", "Airy"],
  ["paper", "Paper"],
] as const;
/** The languages charts and dashboards read in, each named in its own language. */
const LANGUAGES = [
  ["en", "English"],
  ["fr", "Français"],
  ["de", "Deutsch"],
] as const;
const THEMES = [
  ["auto", "Auto"],
  ["light", "Light"],
  ["dark", "Dark"],
] as const;

const group = (key: string, label: string, options: readonly (readonly [string, string])[]) =>
  `<div class="site-look-group" role="group" aria-label="${label}" data-look-key="${key}"><span class="site-look-label" aria-hidden="true">${label}</span>${options
    .map(([value, text]) => `<button type="button" data-look-value="${value}" aria-pressed="false">${text}</button>`)
    .join("")}</div>`;

/** The bar for one page: the seven links, the current one marked, and the Look menu. Indented to sit in a page. */
export function navBar(current: NavLabel, up: "./" | "../", indent = "    "): string {
  const links = NAV.map((item) => {
    const marked = item.label === current ? ' aria-current="page"' : "";
    return `${indent}    <a href="${up}${item.href}"${marked} title="${item.title}">${item.label}</a>`;
  }).join("\n");
  return [
    `${indent}<div class="site-bar">`,
    `${indent}  <nav class="site-nav" aria-label="Pages">`,
    links,
    `${indent}  </nav>`,
    `${indent}  <details class="site-look-menu">`,
    `${indent}    <summary>Look</summary>`,
    `${indent}    <div class="site-look-panel">${group("theme", "Theme", THEMES)}${group("preset", "Style", STYLES)}${group("lang", "Language", LANGUAGES)}</div>`,
    `${indent}  </details>`,
    `${indent}</div>`,
  ].join("\n");
}

/** The Catalog's two tabs, Charts and Data guide, as links between its two pages; the one shown marked. */
export function catalogTabs(current: "charts" | "guide", indent = "  "): string {
  const tab = (key: string, href: string, label: string) => `<a href="${href}"${key === current ? ' aria-current="page"' : ""}>${label}</a>`;
  return `${indent}<nav class="site-tabs" aria-label="Catalog">${tab("charts", "index.html", "Charts")}${tab("guide", "guide.html", "Data guide")}</nav>`;
}

/** The bar block as it sits in a page: from `<div class="site-bar">` to its closing tag, or a bare old `<nav>`. */
const BAR = /^([ \t]*)(?:<div class="site-bar">[\s\S]*?<\/details>\n[ \t]*<\/div>|<nav class="site-nav" aria-label="Pages">[\s\S]*?<\/nav>)/m;

/** A page with its bar replaced by the one `navBar` writes for it. */
export function withNav(html: string, current: NavLabel, up: "./" | "../"): string {
  const match = BAR.exec(html);
  if (!match) throw new Error("No site bar to replace");
  return html.replace(BAR, (_whole, indent: string) => navBar(current, up, indent).replace(/^[ \t]*/, indent));
}

/** The pages the catalog scripts write; every other page is hand-written and rewritten here. */
export const GENERATED = new Set(["catalog/index.html", "catalog/guide.html"]);

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
  for (const page of PAGES) {
    if (GENERATED.has(page.file)) continue;
    const file = root(page.file);
    writeFileSync(file, withNav(readFileSync(file, "utf8"), page.current, page.up));
  }
  console.log(`Wrote the site bar into ${PAGES.length - GENERATED.size} pages`);
}
