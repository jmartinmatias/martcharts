// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { STATIC_PATHS } from "../scripts/site-pages.ts";

/** The site's pages, each with the name its navigation gives it, and the prefix its links take from where it sits. */
const PAGES = [
  ["index.html", "Gallery", "./"],
  ["taller.html", "Taller", "./"],
  ["selected.html", "Selected", "./"],
  ["editor.html", "Editor", "./"],
  ["commercial.html", "Commercial", "./"],
  ["health.html", "Client health", "./"],
  ["regulatory.html", "Regulatory", "./"],
  ["catalog/index.html", "Catalog", "../"],
  ["catalog/guide.html", "Data guide", "../"],
  ["examples/drop-in.html", "Drop-in", "../"],
] as const;

const read = (file: string) => new DOMParser().parseFromString(readFileSync(file, "utf8"), "text/html");

describe("every page goes to every page", () => {
  test.each(PAGES)("%s has the same row: Gallery, Taller, Selected, Playground, Editor, Commercial, Client health, Regulatory, Catalog, Data guide and Drop-in, its own page marked", (file, own, up) => {
    const doc = read(file);
    const nav = doc.querySelector('nav.site-nav[aria-label="Pages"]');
    const items = [...(nav?.querySelectorAll("a, button") ?? [])];
    expect(items.map((item) => item.textContent?.trim())).toEqual(["Gallery", "Taller", "Selected", "Playground", "Editor", "Commercial", "Client health", "Regulatory", "Catalog", "Data guide", "Drop-in"]);
    // Links go to the other pages; the Playground is a dialog on the gallery, so elsewhere it opens it there.
    const target = (item: Element) => item.getAttribute("href") ?? `#${item.id}`;
    expect(items.map(target)).toEqual([
      `${up}index.html`,
      `${up}taller.html`,
      `${up}selected.html`,
      file === "index.html" ? "#open-playground" : `${up}index.html#playground`,
      `${up}editor.html`,
      `${up}commercial.html`,
      `${up}health.html`,
      `${up}regulatory.html`,
      `${up}catalog/index.html`,
      `${up}catalog/guide.html`,
      `${up}examples/drop-in.html`,
    ]);
    expect(items.filter((item) => item.getAttribute("aria-current") === "page").map((item) => item.textContent?.trim())).toEqual([own]);
    // The pinned nav, and the look picked on any page (theme and style, Glass by default), on every page.
    const root = up === "./" ? "/" : up;
    expect(doc.querySelector(`link[rel="stylesheet"][href="${root}demo/site-nav.css"]`)).not.toBeNull();
    expect(doc.querySelector(`link[rel="stylesheet"][href="${root}demo/site-look.css"]`)).not.toBeNull();
    expect(doc.querySelector(`script[src="${root}site-look.js"]`)).not.toBeNull();
  });

  test("the old one-way back links are gone", () => {
    for (const [file] of PAGES) expect([file, read(file).querySelectorAll("a.back, a.page-link").length]).toEqual([file, 0]);
  });

  test("the published site carries every page: built by vite, or copied as a static page with what it loads", () => {
    const config = readFileSync("vite.config.ts", "utf8");
    const built = [...config.matchAll(/new URL\("\.\/([^"]+\.html)"/g)].map((m) => m[1]);
    const published = (file: string) => built.includes(file) || STATIC_PATHS.some((path) => file === path || file.startsWith(`${path}/`));
    expect(PAGES.map(([file]) => [file, published(file)])).toEqual(PAGES.map(([file]) => [file, true]));
    // What the static pages load comes along with them.
    for (const file of ["catalog/index.html", "catalog/guide.html", "examples/drop-in.html"]) {
      const doc = read(file);
      const local = [...doc.querySelectorAll("script[src], link[rel=stylesheet][href]")]
        .map((node) => node.getAttribute("src") ?? node.getAttribute("href") ?? "")
        .filter((ref) => ref.startsWith("../"))
        .map((ref) => ref.slice(3));
      for (const ref of local) expect([file, ref, published(ref) || ref === "site-look.js"]).toEqual([file, ref, true]);
    }
  });
});
