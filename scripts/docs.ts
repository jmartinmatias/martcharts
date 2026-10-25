/**
 * Writes docs/blocks.md from the block registry, so the reference always
 * matches the code, and sets the view count wherever the docs say it
 * (between <!-- views --> and <!-- /views --> markers). Run with: npm run docs
 */
import { readFile, writeFile } from "node:fs/promises";
import { canonicalName, describeBlocks, describePresets, FACET_OPTIONS, HEADLINE_OPTIONS } from "../src/core/index.ts";
import { checkPalette, describePalettes } from "../src/color.ts";
import { alsoAccepts } from "../src/core/canonical.ts";
import type { BlockKind, OptionSchema } from "../src/core/index.ts";

const SECTIONS: { kind: BlockKind; title: string; slot: string }[] = [
  { kind: "source", title: "Data sources", slot: "`data: { type, ...options }`" },
  { kind: "transform", title: "Transforms", slot: "`transform: [{ type, ...options }, ...]`, applied in order" },
  { kind: "format", title: "Formats", slot: '`fields.<name>.format: "type"` or `{ type, ...options }`' },
  { kind: "view", title: "Views", slot: "`view: { type, ...options }`" },
];

function kindText(option: OptionSchema): string {
  if (option.type === "enum") return option.values?.map((v) => `\`${v}\``).join(", ") ?? "enum";
  const expects = option.kind ? ` (${option.kind})` : "";
  if (option.type === "field") return `field name${expects}`;
  if (option.type === "fields") return `field name or list${expects}`;
  return option.type;
}

const cell = (text: string) => text.replace(/\|/g, "\\|");

const lines = [
  "# Block reference",
  "",
  "Generated from the block registry by `npm run docs`. Do not edit by hand.",
  "",
  "Every slot in a widget spec takes a block: an object whose `type` picks the block and whose other keys are its options.",
  "Register your own blocks with `registerSource`, `registerTransform`, `registerFormat` and `registerView` (see [api.md](api.md#extending)).",
];

for (const { kind, title, slot } of SECTIONS) {
  lines.push("", `## ${title}`, "", `Slot: ${slot}.`);
  for (const block of describeBlocks(kind)) {
    lines.push("", `### \`${block.type}\``, "", block.description, "");
    const options = Object.entries(block.options);
    if (options.length === 0) {
      lines.push("No options.");
      continue;
    }
    lines.push("| Option | Type | Required | Default | Description |", "| --- | --- | --- | --- | --- |");
    for (const [name, option] of options) {
      const fallback = option.default === undefined ? "" : `\`${JSON.stringify(option.default)}\``;
      // Views list each option by its canonical name; an older spelling that still works is noted after the description.
      const shown = kind === "view" ? canonicalName(block.type, name) : name;
      const older = kind === "view" ? [...new Set([...alsoAccepts(block.type, shown), ...(shown !== name ? [name] : [])])] : [];
      const note = older.length ? ` Also accepts ${older.map((o) => `\`${o}\``).join(", ")}, the older name.` : "";
      lines.push(`| \`${shown}\` | ${kindText(option)} | ${option.required ? "yes" : ""} | ${fallback} | ${cell(option.description)}${note} |`);
    }
  }
}

lines.push("", "## Headline", "", "Slot: `headline: { value, ...options }` on the spec. One big number above any view, with its change and a caption.", "");
lines.push("| Option | Type | Required | Default | Description |", "| --- | --- | --- | --- | --- |");
for (const [name, option] of Object.entries(HEADLINE_OPTIONS)) {
  const fallback = option.default === undefined ? "" : `\`${JSON.stringify(option.default)}\``;
  lines.push(`| \`${name}\` | ${kindText(option)} | ${option.required ? "yes" : ""} | ${fallback} | ${cell(option.description)} |`);
}

lines.push("", "## Facet (small multiples)", "", "Slot: `facet: { field, ...options }` on the spec. Draws the view once per value of the field, in a grid of panels on one shared scale.", "");
lines.push("| Option | Type | Required | Default | Description |", "| --- | --- | --- | --- | --- |");
for (const [name, option] of Object.entries(FACET_OPTIONS)) {
  const fallback = option.default === undefined ? "" : `\`${JSON.stringify(option.default)}\``;
  lines.push(`| \`${name}\` | ${kindText(option)} | ${option.required ? "yes" : ""} | ${fallback} | ${cell(option.description)} |`);
}

lines.push("", "## Style presets", "", 'Slot: `style.preset`. A spec\'s own `style.tokens` and `style.palette` still win over the preset. Register more with `registerPreset` (see [api.md](api.md#style-presets)).', "");
lines.push("| Preset | Look |", "| --- | --- |");
for (const preset of describePresets()) lines.push(`| \`${preset.name}\` | ${cell(preset.description)} |`);

lines.push("", "## Palettes", "", 'Slot: `style.palette`, as a name or a list of colors. "Checks" is `checkPalette` on a light background: fails mean series cannot be told apart by color alone (see [api.md](api.md#palettes)).', "");
lines.push("| Palette | Name | Colors | Checks (light) | Notes |", "| --- | --- | --- | --- | --- |");
for (const palette of describePalettes()) {
  const report = checkPalette(palette.colors, { mode: "light" });
  const failed = report.checks.filter((c) => c.state === "fail").map((c) => c.label.toLowerCase());
  const verdict = failed.length ? `fails ${failed.join(", ")}` : "passes";
  lines.push(`| ${palette.label} | \`${palette.name}\` | ${palette.colors.map((c) => `\`${c}\``).join(" ")} | ${verdict} | ${cell(palette.description)}${palette.source ? ` Source: ${cell(palette.source)}` : ""} |`);
}

await writeFile(new URL("../docs/blocks.md", import.meta.url), `${lines.join("\n")}\n`);
console.error("Wrote docs/blocks.md");

// The view count, wherever the hand-written docs give it: the number between the markers follows the registry.
const VIEW_COUNT = describeBlocks("view").length;
// The page count follows the site's own navigation: one entry per page in the row at the top of every page.
const PAGE_COUNT = sitePageCount(await readFile(new URL("../index.html", import.meta.url), "utf8"));
for (const file of ["../README.md", "../docs/api.md", "../docs/accessibility.md", "../docs/features.md"]) {
  const url = new URL(file, import.meta.url);
  const text = await readFile(url, "utf8");
  const next = text
    .replace(/<!-- views -->\d+<!-- \/views -->/g, `<!-- views -->${VIEW_COUNT}<!-- /views -->`)
    .replace(/<!-- pages -->\d+<!-- \/pages -->/g, `<!-- pages -->${PAGE_COUNT}<!-- /pages -->`);
  if (next !== text) {
    await writeFile(url, next);
    console.error(`Set the view and page counts in ${file.slice(3)} to ${VIEW_COUNT} and ${PAGE_COUNT}`);
  }
}

/** How many pages the site's menu has: the links in the navigation row of the home page (the Look menu sits outside it). */
function sitePageCount(html: string): number {
  const nav = /<nav class="site-nav"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? "";
  return (nav.match(/<(a|button)\b/g) ?? []).length;
}
