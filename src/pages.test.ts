// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

/** The site's pages, each with the name its navigation gives it, and the prefix its links take from where it sits. */
const PAGES = [
  ["index.html", "Gallery", "./"],
  ["taller.html", "Taller", "./"],
  ["selected.html", "Selected", "./"],
  ["catalog/index.html", "Catalog", "../"],
  ["examples/drop-in.html", "Drop-in", "../"],
] as const;

const read = (file: string) => new DOMParser().parseFromString(readFileSync(file, "utf8"), "text/html");

describe("every page goes to every page", () => {
  test.each(PAGES)("%s has the same row: Gallery, Taller, Selected, Playground, Catalog and Drop-in, its own page marked", (file, own, up) => {
    const doc = read(file);
    const nav = doc.querySelector('nav.site-nav[aria-label="Pages"]');
    const items = [...(nav?.querySelectorAll("a, button") ?? [])];
    expect(items.map((item) => item.textContent?.trim())).toEqual(["Gallery", "Taller", "Selected", "Playground", "Catalog", "Drop-in"]);
    // Links go to the other pages; the Playground is a dialog on the gallery, so elsewhere it opens it there.
    const target = (item: Element) => item.getAttribute("href") ?? `#${item.id}`;
    expect(items.map(target)).toEqual([
      `${up}index.html`,
      `${up}taller.html`,
      `${up}selected.html`,
      file === "index.html" ? "#open-playground" : `${up}index.html#playground`,
      `${up}catalog/index.html`,
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
});
