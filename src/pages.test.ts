// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { BASE_CSS } from "./dom/styles.ts";

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

describe("44 px targets on phones", () => {
  test("come from the demo's site-nav.css, so the library keeps its touch rule and title width for other hosts", () => {
    const demo = readFileSync("demo/site-nav.css", "utf8");
    expect(demo).toContain("html .fft-action { width: 44px; height: 44px;");
    expect(demo).toContain("html .fft-widget[data-actions] .fft-title { padding-right: 136px; }");
    expect(BASE_CSS).not.toContain("padding-right: 136px");
    expect(BASE_CSS).toContain("@media (pointer: coarse) {\n  .fft-range button, .fft-board-nav button { min-height: 34px;");
  });
});
