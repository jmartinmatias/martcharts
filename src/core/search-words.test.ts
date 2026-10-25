import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { blockTypes } from "./registry.ts";
import { SEARCH_WORDS } from "./search-words.ts";
import "./views.ts";

describe("everyday search words", () => {
  test("every chart type has some, and no word list names a chart that does not exist", () => {
    expect(blockTypes("view").filter((type) => !SEARCH_WORDS[type])).toEqual([]);
    expect(Object.keys(SEARCH_WORDS).filter((type) => !blockTypes("view").includes(type))).toEqual([]);
  });

  test.each([
    ["pipeline", "funnel"],
    ["traffic light", "ragboard"],
    ["cross-sell", "whitespace"],
    ["kanban", "board"],
    ["gantt", "timeline"],
    ["map", "choropleth"],
  ])("searching %s finds %s in the catalog and the Data guide", (words, type) => {
    for (const [file, id] of [["catalog/index.html", type], ["catalog/guide.html", `c-${type}`]] as const) {
      const page = readFileSync(file, "utf8");
      const search = new RegExp(`id="${id}"[^>]*data-search="([^"]*)"`).exec(page)?.[1] ?? "";
      expect([file, words.split(" ").every((w) => search.includes(w))]).toEqual([file, true]);
    }
  });
});
