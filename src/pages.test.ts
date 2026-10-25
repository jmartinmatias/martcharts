// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
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
    expect([...doc.querySelectorAll(".site-look-menu [data-look-key]")].map((g) => g.getAttribute("data-look-key"))).toEqual(["theme", "preset"]);
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
    for (const band of [/\.site-bar::before \{[^}]*/, /\.fft-dashboard\[data-sticky\] \.fft-filters::before \{[^}]*/]) {
      const rule = band.exec(nav)?.[0] ?? "";
      expect(rule).toMatch(/left: calc\(50% - 50vw\);\s*right: calc\(50% - 50vw\)/);
    }
  });

  test("a grid of examples never grows wider than its page: its column is bounded, so long code scrolls inside its box", () => {
    // An unbounded grid column takes the min-content width of the longest code line, and the cards run off the page.
    const css = readFileSync("examples/drop-in.html", "utf8");
    expect(css).toMatch(/\.examples \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    expect(css).toMatch(/\.snippet pre \{[^}]*overflow-x: auto/);
  });

  test("the menu bar keeps Home and Look off the window's edges, even when the page column fills the window", () => {
    const css = readFileSync("demo/site-nav.css", "utf8");
    expect(css).toMatch(/\.site-bar \{[^}]*padding:[^;]*calc\(16px - \(100vw - 100%\) \/ 2\)[^;]*calc\(16px - \(100vw - 100%\) \/ 2\)/);
  });
});
