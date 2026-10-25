import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { describeBlocks } from "./core/index.ts";

/** The docs say how many views there are, and list them all: these keep them honest as views are added. */
const VIEWS = describeBlocks("view").map((view) => view.type);
const read = (file: string) => readFileSync(file, "utf8");

describe("the docs follow the registry", () => {
  test("every view count written in the docs is the real one", () => {
    for (const file of ["README.md", "docs/api.md", "docs/accessibility.md"]) {
      const counts = [...read(file).matchAll(/<!-- views -->(\d+)<!-- \/views -->/g)].map((m) => Number(m[1]));
      expect([file, counts.length > 0, counts.every((n) => n === VIEWS.length)]).toEqual([file, true, true]);
    }
    expect(read("docs/catalog.md")).toContain(`${VIEWS.length} views.`);
    expect(read("catalog/index.html")).toContain(`${VIEWS.length} chart types.`);
    expect(read("catalog/guide.html")).toContain(`For each of the ${VIEWS.length} charts`);
  });

  test("no hand-written count is left behind", () => {
    for (const file of ["README.md", "docs/api.md", "docs/accessibility.md", "docs/catalog.md"]) {
      const bare = read(file).replace(/<!-- views -->\d+<!-- \/views -->/g, "").match(/\b\d{2} (built-in )?views\b/g) ?? [];
      expect([file, bare.filter((text) => !text.startsWith(String(VIEWS.length)))]).toEqual([file, []]);
    }
  });

  test("Which view? names every view exactly once", () => {
    const readme = read("README.md");
    const table = readme.slice(readme.indexOf("## Which view?"), readme.indexOf("Charts follow fixed rules:"));
    const named = [...table.matchAll(/`([a-z]+)`/g)].map((m) => m[1] as string).filter((name) => VIEWS.includes(name));
    const counts = new Map<string, number>();
    for (const name of named) counts.set(name, (counts.get(name) ?? 0) + 1);
    expect(VIEWS.filter((view) => counts.get(view) !== 1).map((view) => [view, counts.get(view) ?? 0])).toEqual([]);
  });

  test("blocks.md and catalog.md list every registered view", () => {
    const blocks = read("docs/blocks.md");
    const catalog = read("docs/catalog.md");
    expect(VIEWS.filter((view) => !blocks.includes(`### \`${view}\``))).toEqual([]);
    expect(VIEWS.filter((view) => !catalog.includes(`## \`${view}\``))).toEqual([]);
  });

  test("blocks.md lists options by their canonical names and notes the older ones", () => {
    const blocks = read("docs/blocks.md");
    const dot = blocks.slice(blocks.indexOf("### `dot`"), blocks.indexOf("###", blocks.indexOf("### `dot`") + 5));
    expect(dot).toContain("| `value` |");
    expect(dot).toContain("Also accepts `values`, the older name.");
  });
});
