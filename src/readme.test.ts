/**
 * The README's counts and lists, read against the registry and the MCP server, so the front page cannot drift from the code.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { describeBlocks, describePalettes, describePresets, ICON_NAMES, validateSpec } from "./core/index.ts";
import type { BlockKind } from "./core/index.ts";

const readme = readFileSync("README.md", "utf8");
const server = readFileSync("src/mcp/server.ts", "utf8");

const types = (kind: BlockKind) => describeBlocks(kind).map((block) => block.type).sort();
const views = types("view");
/** Bare names in backticks (`bar`, `50-shades`), not option snippets such as `"stacked": true`. */
const ticked = (text: string) => [...text.matchAll(/`([a-z0-9][a-z0-9-]*)`/g)].map((m) => m[1]!);
const unique = (names: string[]) => [...new Set(names)].sort();

/** The README table row whose first cell is `label`. */
function row(label: string): string {
  const line = readme.split("\n").find((l) => l.startsWith(`| ${label} |`));
  if (!line) throw new Error(`README has no "${label}" row`);
  return line.slice(label.length + 4);
}

/** The view types a row names in plain words, such as "on bar, hbar, line and area". */
const namedViews = (text: string) => views.filter((view) => new RegExp(`\\b${view}\\b`).test(text));
const viewsWith = (option: string) => describeBlocks("view").filter((block) => option in block.options).map((block) => block.type).sort();

describe("README", () => {
  test("every view count is the number of registered views", () => {
    const counts = [...readme.matchAll(/\b(\d+) (?:of them|views|built-in views)\b/g)].map((m) => Number(m[1]));
    expect(counts.length).toBeGreaterThan(0);
    expect(new Set(counts)).toEqual(new Set([views.length]));
  });

  test("Which view? names every registered view, and only views besides the headline, the bin transform and cell formats", () => {
    const section = readme.split("## Which view?")[1]!.split("\n## ")[0]!;
    const names = unique(ticked(section.split("\n").filter((line) => line.startsWith("| ")).join("\n")));
    expect(views.filter((view) => !names.includes(view))).toEqual([]);
    expect(names.filter((name) => !views.includes(name))).toEqual(["badge", "bin", "headline", "spark"]);
  });

  test("the sources, transforms, formats, presets and palettes it lists are exactly the built-in ones", () => {
    expect(unique(ticked(row("Data sources")))).toEqual(types("source"));
    // `list` is an aggregate measure, named in passing.
    expect(unique(ticked(row("Transforms")))).toEqual(unique([...types("transform"), "list"]));
    expect(unique(ticked(row("Formats")))).toEqual(types("format"));
    expect(unique(ticked(row("Style presets")))).toEqual(describePresets().map((preset) => preset.name).sort());
    expect(unique(ticked(row("Palettes")))).toEqual(describePalettes().map((palette) => palette.name).sort());
  });

  test("the views it names for an option are the views that take it", () => {
    expect(namedViews(row("Emphasis"))).toEqual(viewsWith("highlight"));
    expect(namedViews(row("Reference marks"))).toEqual(viewsWith("reference"));
    expect(namedViews(row("Line texture"))).toEqual(viewsWith("curve"));
  });

  test("the icon count matches the icon set", () => {
    const [, first, more] = row("KPI icons").match(/`"icon": "([a-z]+)"` and (\d+) more/) ?? [];
    expect(ICON_NAMES).toContain(first);
    expect(Number(more)).toBe(ICON_NAMES.length - 1);
  });

  test("the MCP tools and resources it names are the ones the server registers", () => {
    const section = readme.split("## The MCP server")[1]!.split("\n## ")[0]!;
    const registered = unique([...server.matchAll(/registerTool\(\s*"(fft_\w+)"/g)].map((m) => m[1]!));
    expect(unique([...section.matchAll(/`(fft_\w+)`/g)].map((m) => m[1]!))).toEqual(registered);
    const resources = unique([...server.matchAll(/"(fft:\/\/[^"]+)"/g)].map((m) => m[1]!.replace("{id}", "<id>")));
    expect(unique([...section.matchAll(/`(fft:\/\/[^`]+)`/g)].map((m) => m[1]!))).toEqual(resources);
  });

  test("its JSON widget spec is valid", () => {
    const blocks = [...readme.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => JSON.parse(m[1]!));
    expect(blocks.length).toBeGreaterThan(0);
    for (const spec of blocks) expect(validateSpec(spec)).toEqual([]);
  });
});
