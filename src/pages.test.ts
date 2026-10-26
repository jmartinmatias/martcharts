// @vitest-environment jsdom
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { describe, expect, test } from "vitest";
import { STATIC_PATHS } from "../scripts/site-pages.ts";
import { NAV, PAGES, navBar } from "../scripts/site-nav.ts";

const read = (file: string) => new DOMParser().parseFromString(readFileSync(file, "utf8"), "text/html");
/** The pages vite builds, from its config. */
const BUILT = [...readFileSync("vite.config.ts", "utf8").matchAll(/new URL\("\.\/([^"]+\.html)"/g)].map((m) => m[1] as string);
const published = (file: string) => BUILT.includes(file) || STATIC_PATHS.some((path) => file === path || file.startsWith(`${path}/`));
/** The old addresses that now send a visitor on, each to its Dashboards tab. */
const MOVED = [
  ["commercial.html", "./dashboards.html?board=commercial"],
  ["health.html", "./dashboards.html?board=health"],
  ["regulatory.html", "./dashboards.html?board=regulatory"],
] as const;

describe("one menu on every page", () => {
  test("seven items, in order: Home, Dashboards, Editor, Composer, Catalog, Embed, Lab", () => {
    expect(NAV.map((item) => item.label)).toEqual(["Home", "Dashboards", "Editor", "Composer", "Catalog", "Embed", "Lab"]);
  });

  test.each(PAGES)("$file carries the bar written for it: the seven links, $current marked, and the Look menu", ({ file, current, up }) => {
    const html = readFileSync(file, "utf8");
    // Exactly the bar scripts/site-nav.ts writes (catalog pages from the generators, the rest from the script itself).
    const written = navBar(current, up, "").replace(/^\s+/gm, "");
    const bar = /<div class="site-bar">[\s\S]*?<\/details>\s*<\/div>/.exec(html)?.[0].replace(/^\s+/gm, "");
    expect(bar).toBe(written);
    const doc = read(file);
    const links = [...doc.querySelectorAll('nav.site-nav[aria-label="Pages"] a')];
    expect(links.map((a) => a.textContent?.trim())).toEqual(NAV.map((item) => item.label));
    expect(links.map((a) => a.getAttribute("href"))).toEqual(NAV.map((item) => `${up}${item.href}`));
    expect(links.filter((a) => a.getAttribute("aria-current") === "page").map((a) => a.textContent)).toEqual([current]);
    // One Look menu, theme and style together, the same on every page.
    expect(doc.querySelectorAll(".site-look-menu").length).toBe(1);
    expect([...doc.querySelectorAll(".site-look-menu [data-look-key]")].map((g) => g.getAttribute("data-look-key"))).toEqual(["theme", "preset", "lang"]);
    // No page keeps a theme or style switch of its own.
    expect(doc.querySelectorAll("#theme, #preset").length).toBe(0);
    // The pinned bar's styles and the look, on every page.
    const root = up === "./" ? "/" : up;
    expect(doc.querySelector(`link[rel="stylesheet"][href="${root}demo/site-nav.css"]`)).not.toBeNull();
    expect(doc.querySelector(`link[rel="stylesheet"][href="${root}demo/site-look.css"]`)).not.toBeNull();
    expect(doc.querySelector(`script[src="${root}site-look.js"]`)).not.toBeNull();
  });

  test.each(PAGES)("$file has one header and the martcharts name", ({ file }) => {
    const doc = read(file);
    expect(doc.querySelectorAll("h1").length).toBe(1);
    expect(doc.title).toMatch(/martcharts/);
    expect(readFileSync(file, "utf8")).not.toMatch(/FFT Widgets/);
  });

  test("the Catalog's two pages are its two tabs, each marked on its own page", () => {
    for (const [file, shown] of [
      ["catalog/index.html", "Charts"],
      ["catalog/guide.html", "Data guide"],
    ] as const) {
      const tabs = [...read(file).querySelectorAll('nav.site-tabs[aria-label="Catalog"] a')];
      expect([file, tabs.map((a) => a.getAttribute("href")), tabs.filter((a) => a.getAttribute("aria-current") === "page").map((a) => a.textContent)]).toEqual([file, ["index.html", "guide.html"], [shown]]);
    }
  });
});

describe("the published site", () => {
  test("carries every page: built by vite, or copied as a static page", () => {
    for (const { file } of PAGES) expect([file, published(file)]).toEqual([file, true]);
    for (const [file] of MOVED) expect([file, published(file)]).toEqual([file, true]);
  });

  test("every local link and asset on every page resolves to a file the site serves", () => {
    const pages = [...PAGES.map((page) => page.file), ...MOVED.map(([file]) => file), "examples/embed.html"];
    const missing: string[] = [];
    for (const file of pages) {
      const refs = [...read(file).querySelectorAll("a[href], link[href], script[src]")].map((node) => node.getAttribute("href") ?? node.getAttribute("src") ?? "");
      for (const ref of refs) {
        if (!ref || /^(https?:|mailto:|data:|#)/.test(ref) || ref.includes("${")) continue;
        const path = ref.split(/[?#]/)[0] as string;
        if (!path) continue;
        // A root address (/demo/site-nav.css, /site-look.js) is the repo root or public/; a relative one is the page's folder.
        const target = path.startsWith("/") ? path.slice(1) : normalize(join(dirname(file), path));
        // The bundles in dist/ are built by npm run build:lib and published with the static pages.
        const served = existsSync(target) || existsSync(join("public", target)) || BUILT.includes(target) || (STATIC_PATHS as readonly string[]).includes(target);
        if (!served) missing.push(`${file} -> ${ref}`);
      }
    }
    expect(missing).toEqual([]);
  });

  // The built site itself, when npm run build:site has run: every local link and asset in every page is a file there.
  test.skipIf(!existsSync("dist-demo/index.html"))("in the built site, every page's local links and assets are files it serves", async () => {
    const { readdirSync, statSync } = await import("node:fs");
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? (name === "docs" ? [] : walk(join(dir, name))) : name.endsWith(".html") ? [join(dir, name)] : []));
    const missing: string[] = [];
    for (const file of walk("dist-demo")) {
      for (const match of readFileSync(file, "utf8").matchAll(/(?:href|src)="([^"]+)"/g)) {
        const ref = match[1] as string;
        if (/^(https?:|mailto:|data:|#|javascript)/.test(ref) || ref.includes("${") || ref.includes("&lt;")) continue;
        const path = ref.split(/[?#]/)[0] as string;
        if (!path) continue;
        const target = path.startsWith("/") ? join("dist-demo", path) : normalize(join(dirname(file), path));
        if (!existsSync(target)) missing.push(`${file} -> ${ref}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test.each(MOVED)("%s sends a visitor on to %s, keeping the board's state from the hash", (file, to) => {
    const doc = read(file);
    expect(doc.documentElement.dataset.movedTo).toBe(to);
    expect(doc.querySelector('meta[http-equiv="refresh"]')?.getAttribute("content")).toContain(to);
    expect(doc.querySelector(`a[href="${to}"]`)).not.toBeNull();
    expect(doc.querySelector('script[src="/demo/redirect.ts"]')).not.toBeNull();
    expect(readFileSync("demo/redirect.ts", "utf8")).toContain("location.hash");
  });

  test("the old gallery address goes on: its sections to the Sales tab, its playground to the Editor's JSON panel", () => {
    const home = readFileSync("demo/home.ts", "utf8");
    expect(home).toContain("./dashboards.html?board=sales#");
    expect(home).toContain("./editor.html?json=1");
    expect(home).toContain("./editor.html?spec=");
  });

  test("pages that only show charts load the lite bundle; the embed page brings French and German in when its chart asks", () => {
    for (const file of ["examples/embed.html", "examples/drop-in.html", "catalog/index.html", "catalog/guide.html"]) {
      const sources = [...read(file).querySelectorAll("script[src]")].map((node) => node.getAttribute("src"));
      expect([file, sources.includes("../dist/martcharts-lite.iife.js"), sources.includes("../dist/martcharts.iife.js")]).toEqual([file, true, false]);
    }
    expect(readFileSync("examples/embed.js", "utf8")).toContain("../dist/martcharts-reading.iife.js");
  });

  test("no page runs an inline script: the published site's policy allows scripts from the site only", () => {
    // Data blocks (type="application/json") are not scripts and stay; anything that runs must come from a file.
    const files = [...PAGES.map((page) => page.file), ...MOVED.map(([file]) => file), "examples/embed.html"];
    for (const file of files) {
      const inline = [...read(file).querySelectorAll("script:not([src])")].filter((node) => node.getAttribute("type") !== "application/json" && (node.textContent ?? "").trim());
      expect([file, inline.length]).toEqual([file, 0]);
    }
  });

  test("no site style lays a page-wide wash, and the bands under the menu are one window-wide box each", () => {
    // A spread shadow reaches every way: on the nav it once laid a 78% wash over the whole site. A frosted box only as
    // wide as the column showed square edges with Home and Look against them.
    for (const file of ["demo/site-look.css", "demo/site-nav.css", "demo/site-page.css"]) {
      const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      expect([file, /box-shadow:[^;]*\d+vmax/.test(css)]).toEqual([file, false]);
    }
    const nav = readFileSync("demo/site-nav.css", "utf8");
    expect(/\.site-bar::before \{[^}]*/.exec(nav)?.[0]).toMatch(/left: 0;\s*right: 0/);
    expect(/\.fft-dashboard\[data-sticky\] \.fft-filters::before \{[^}]*/.exec(nav)?.[0]).toMatch(/left: calc\(50% - 50vw\);\s*right: calc\(50% - 50vw\)/);
  });

  test("a grid of examples never grows wider than its page: its column is bounded, so long code scrolls inside its box", () => {
    // An unbounded grid column takes the min-content width of the longest code line, and the cards run off the page.
    const css = readFileSync("examples/drop-in.html", "utf8");
    expect(css).toMatch(/\.examples \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    expect(css).toMatch(/\.snippet pre \{[^}]*overflow-x: auto/);
  });

  test("the menu bar is the same on every page: pinned to the window, one 1248px column, 16px from the edges", () => {
    const css = readFileSync("demo/site-nav.css", "utf8");
    const bar = /\.site-bar \{[^}]*\}/.exec(css)?.[0] ?? "";
    expect(bar).toMatch(/position: fixed;\s*top: 0;\s*left: 0;\s*right: 0;/);
    expect(bar).toMatch(/max\(calc\(16px \+ env\(safe-area-inset-right, 0px\)\), calc\(\(100% - 1248px\) \/ 2\)\)/);
    expect(css).toMatch(/html body \{ padding-top: calc\(var\(--site-nav-height\)/);
    // No page may restyle the bar's place on its own.
    for (const page of ["index.html", "dashboards.html", "editor.html", "composer.html", "lab.html", "catalog/index.html", "catalog/guide.html", "examples/drop-in.html"]) {
      expect([page, /\.site-bar\s*\{/.test(readFileSync(page, "utf8"))]).toEqual([page, false]);
    }
  });

  test("pinned under the menu, the filter band and the bar read as one: one hairline, and tabs are segmented tracks", () => {
    const nav = readFileSync("demo/site-nav.css", "utf8");
    expect(nav).toMatch(/:root:has\(\.fft-dashboard\[data-sticky\] \.fft-filters\[data-stuck\]\) \.site-bar::before \{ border-bottom-color: transparent; \}/);
    expect(nav).toMatch(/\.site-tabs \{[^}]*border-radius: 10px;[^}]*background:/);
    expect(readFileSync("dashboards.html", "utf8")).not.toMatch(/\.board-tabs \{[^}]*border: 1px/);
  });

  test("the dashboard's chrome has the kit's radii and type sizes: the scale is defined on the dashboard, not only on cards", async () => {
    const { BASE_CSS } = await import("./dom/styles.ts");
    expect(BASE_CSS).toMatch(/\.fft-widget, \.fft-overlay, \.fft-dashboard \{[^}]*--fft-radius-l:[^}]*--fft-radius-pill:[^}]*--fft-fs-xs:/);
    expect(readFileSync("demo/site-nav.css", "utf8")).toMatch(/body \.fft-dashboard\[data-sticky\] \.fft-filters \{ background: none;/);
  });

  test("rows that scroll sideways fade on the side with more, and not at all when everything fits", () => {
    const css = readFileSync("demo/site-nav.css", "utf8");
    expect(css).toMatch(/@property --site-fade-r \{[^}]*initial-value: 0px/);
    expect(css).toMatch(/\.site-nav, \.board-tabs \{[^}]*animation-timeline: scroll\(self inline\)/);
  });

  test("every page's head is the same: one title size and one intro style, set once for the site", () => {
    const css = readFileSync("demo/site-nav.css", "utf8");
    expect(css).toMatch(/html body h1 \{[^}]*font-size: 28px; font-weight: 650;/);
    expect(css).toMatch(/html body h1 \+ p \{[^}]*font-size: 16px;/);
  });

  test("the Editor and the Composer draw in the site's Look and follow the Look menu without a reload, like Home and the dashboards", () => {
    for (const page of ["demo/editor.ts", "demo/composer.ts"]) {
      const code = readFileSync(page, "utf8");
      expect([page, code.includes("previewStyle: lookStyle"), /addEventListener\("martcharts:look"[\s\S]*preventDefault\(\)[\s\S]*restyle\(\)/.test(code)]).toEqual([page, true, true]);
    }
    for (const page of ["editor.html", "composer.html"]) expect(readFileSync(page, "utf8")).toContain("scrollbar-gutter: stable");
  });

  test("the pages with their own body (Embed, Catalog, Data guide) sit in every page's column: 1280px, border-box", () => {
    expect(readFileSync("examples/drop-in.html", "utf8")).toMatch(/body \{[^}]*box-sizing: border-box; margin: 0 auto; max-width: 1280px;/);
    for (const script of ["scripts/catalog.ts", "scripts/guide.ts"]) {
      expect([script, /body \{[^}]*box-sizing: border-box; margin: 0 auto; max-width: 1280px;/.test(readFileSync(script, "utf8"))]).toEqual([script, true]);
    }
  });

  test("one link colour for the site's own links, readable on every backdrop, and pill buttons in the Look menu and catalog", () => {
    const css = readFileSync("demo/site-nav.css", "utf8");
    expect(css).toMatch(/:root \{ --site-link: #1d63b8; \}/);
    expect(css).toMatch(/:root\[data-theme="dark"\] \{ --site-link: #6aa8f0; \}/);
    expect(css).toMatch(/a\.strip-link \{\s*color: var\(--site-link\)/);
    expect(/\.site-look-group button \{[^}]*\}/.exec(css)?.[0]).toMatch(/border-radius: 999px/);
    expect(/html body \.tools > button \{[^}]*\}/.exec(css)?.[0]).toMatch(/border-radius: 999px/);
    expect(readFileSync("demo/home.ts", "utf8")).not.toMatch(/style\.cssText/);
  });

  test("every board says its date the same way, and no board card adds a byline beside the board's source", () => {
    for (const file of ["gallery", "commercial-cockpit", "client-health", "regulatory-landscape"]) {
      const asOf = JSON.parse(readFileSync(`dashboards/${file}.json`, "utf8")).asOf as string;
      expect([file, /^Data to (\{latest\}|[A-Z][a-z]+ \d{4})$/.test(asOf)]).toEqual([file, true]);
    }
    const bylines = readdirSync("widgets", { recursive: true })
      .map(String)
      .filter((file) => file.endsWith(".json") && "byline" in JSON.parse(readFileSync(`widgets/${file}`, "utf8")));
    expect(bylines).toEqual([]);
  });
});
