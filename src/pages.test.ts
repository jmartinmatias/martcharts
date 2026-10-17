// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

/** The demo's pages, each with the name its navigation gives it. */
const PAGES = [
  ["index.html", "Gallery"],
  ["taller.html", "Taller"],
  ["selected.html", "Selected"],
] as const;

const read = (file: string) => new DOMParser().parseFromString(readFileSync(file, "utf8"), "text/html");

describe("every page goes to every page", () => {
  test.each(PAGES)("%s has the same row: Gallery, Taller, Selected and Playground, its own page marked", (file, own) => {
    const doc = read(file);
    const nav = doc.querySelector('nav.site-nav[aria-label="Pages"]');
    const items = [...(nav?.querySelectorAll("a, button") ?? [])];
    expect(items.map((item) => item.textContent?.trim())).toEqual(["Gallery", "Taller", "Selected", "Playground"]);
    // Links go to the other pages; the Playground is a dialog on the gallery, so elsewhere it opens it there.
    const target = (item: Element) => item.getAttribute("href") ?? `#${item.id}`;
    expect(items.map(target)).toEqual(["./index.html", "./taller.html", "./selected.html", file === "index.html" ? "#open-playground" : "./index.html#playground"]);
    expect(items.filter((item) => item.getAttribute("aria-current") === "page").map((item) => item.textContent?.trim())).toEqual([own]);
    expect(doc.querySelector('link[rel="stylesheet"][href="/demo/site-nav.css"]')).not.toBeNull();
  });

  test("the old one-way back links are gone", () => {
    for (const [file] of PAGES) expect([file, read(file).querySelectorAll("a.back, a.page-link").length]).toEqual([file, 0]);
  });
});
