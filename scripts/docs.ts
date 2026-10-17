/**
 * Writes docs/blocks.md from the block registry, so the reference always
 * matches the code. Run with: npm run docs
 */
import { writeFile } from "node:fs/promises";
import { checkPalette, describeBlocks, describePalettes, describePresets, FACET_OPTIONS, HEADLINE_OPTIONS } from "../src/core/index.ts";
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
      lines.push(`| \`${name}\` | ${kindText(option)} | ${option.required ? "yes" : ""} | ${fallback} | ${cell(option.description)} |`);
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
