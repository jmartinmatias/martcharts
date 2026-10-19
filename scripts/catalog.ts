/**
 * Writes the chart catalog: one self-contained spec per view in catalog/<view>.json
 * (data inlined, transforms already applied, so it draws anywhere with no server),
 * a page that draws them all (catalog/index.html), and docs/catalog.md with what each
 * view is for, the data it needs, and a spec to copy. Run with: npm run catalog
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describeBlocks, describeChart, hasErrors, needsText, runPipeline, validateSpec } from "../src/core/index.ts";
import type { Row, WidgetSpec } from "../src/core/index.ts";
import { createLocalFetch } from "../src/mcp/store.ts";

const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const fetchLocal = createLocalFetch(root("public"));

/** Rows shown in the doc's copy-paste spec; the JSON file keeps them all. */
const DOC_ROWS = 6;

async function examples(): Promise<Map<string, WidgetSpec[]>> {
  const byView = new Map<string, WidgetSpec[]>();
  for (const file of (await readdir(root("widgets"))).filter((f) => f.endsWith(".json")).sort()) {
    const spec = JSON.parse(await readFile(root(`widgets/${file}`), "utf8")) as WidgetSpec;
    const list = byView.get(spec.view.type) ?? [];
    list.push(spec);
    byView.set(spec.view.type, list);
  }
  return byView;
}

/** The example with its rows inlined and its transforms already run: one file, no server, no fetch. */
async function selfContained(spec: WidgetSpec): Promise<{ spec: WidgetSpec; rows: Row[] }> {
  const rows = await runPipeline(spec, { fetch: fetchLocal });
  const { transform: _transform, ...rest } = spec;
  return { spec: { ...rest, data: { type: "inline", rows } }, rows };
}

/** Pretty JSON, but one line per data row so long datasets stay readable. */
function stringify(spec: WidgetSpec, maxRows = Infinity): string {
  const rows = spec.data.rows as Row[];
  const shown = rows.slice(0, maxRows);
  const marker = "__ROWS__";
  const text = JSON.stringify({ ...spec, data: { type: "inline", rows: marker } }, null, 2);
  const body = shown.map((row) => `      ${JSON.stringify(row)}`).join(",\n");
  return text.replace(`"${marker}"`, `[\n${body}\n    ]`);
}

const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

const byView = await examples();
const views = describeBlocks("view");
await mkdir(root("catalog"), { recursive: true });

const index: string[] = [
  "| View | What it is | Example question it answers | Data it needs | Spec |",
  "| --- | --- | --- | --- | --- |",
];
const sections: string[] = [];
const cards: { type: string; title: string }[] = [];

for (const view of views) {
  const example = byView.get(view.type)?.[0];
  const built = example ? await selfContained(example) : undefined;
  const entry = describeChart(view.type, built?.spec);
  const needs = needsText(entry);

  sections.push("", `## \`${view.type}\``, "", entry.description, "");
  if (entry.needs.length) {
    sections.push("**Data it needs**: one row per mark, with these fields (names are yours; the view options point at them).", "");
    sections.push("| Option | Field holds | Required | What it is |", "| --- | --- | --- | --- |");
    for (const need of entry.needs) {
      sections.push(`| \`${need.option}\` | ${need.holds}${need.many ? " (one or more)" : ""} | ${need.required ? "yes" : ""} | ${cell(need.description)} |`);
    }
    sections.push("");
  }
  if (entry.settings.length) sections.push(`**Settings**: ${entry.settings.map((name) => `\`${name}\``).join(", ")}. All options with defaults are in [blocks.md](blocks.md#${view.type}).`, "");

  if (!example || !built) {
    index.push(`| [\`${view.type}\`](#${view.type}) | ${cell(entry.summary)} | | ${needs} | |`);
    continue;
  }
  const { spec, rows } = built;
  const issues = validateSpec(spec, rows);
  if (hasErrors(issues)) throw new Error(`catalog/${view.type}.json does not validate: ${JSON.stringify(issues)}`);
  await writeFile(root(`catalog/${view.type}.json`), `${stringify(spec)}\n`);
  cards.push({ type: view.type, title: spec.title ?? view.type });

  index.push(`| [\`${view.type}\`](#${view.type}) | ${cell(entry.summary)} | ${cell(entry.question ?? "")} | ${needs} | [${view.type}.json](../catalog/${view.type}.json) |`);
  sections.push(`**Answers**: ${entry.question}`, "");
  sections.push(`**How to read it**: ${entry.howToRead}`, "");
  const more = rows.length > DOC_ROWS ? ` The spec below shows ${DOC_ROWS} of its ${rows.length} rows; the [full file](../catalog/${view.type}.json) has them all.` : "";
  sections.push(`**Drop it in**: \`<fft-widget src="catalog/${view.type}.json"></fft-widget>\`, or paste the spec into \`createWidget(el, spec)\`, a \`<script type="application/json">\` inside \`<fft-widget>\`, or MCP \`fft_create_widget\` (\`fft_get_chart { "type": "${view.type}" }\` hands an agent this spec).${more} Source widget: [widgets/${example.id}.json](../widgets/${example.id}.json).`, "");
  sections.push("```json", stringify(spec, DOC_ROWS), "```");
}

const doc = [
  "# Chart catalog",
  "",
  "Generated by `npm run catalog` from the view registry and the example widgets. Do not edit by hand.",
  "",
  `${views.length} views. Every one has a self-contained spec in [catalog/](../catalog/): the data is inlined and already reshaped, so it draws in any page with no server.`,
  "Open [catalog/index.html](../catalog/index.html) through any static server to see them all.",
  "",
  "## Use one in any project",
  "",
  "```html",
  '<script src="https://cdn.jsdelivr.net/npm/fft-widgets/dist/fft-widgets.iife.js"></script>  <!-- or your own copy of dist/ -->',
  '<fft-widget src="catalog/bar.json" actions="csv image"></fft-widget>',
  "```",
  "",
  "Swap the data for yours: keep the `view` block, change `data` (`inline` rows, a `url`, or a `fn` in code) so each row has the fields the view names. `validateSpec(spec, rows)` says what is missing. In a bundler, `import { createWidget } from \"fft-widgets\"` instead. Agents do the same through the MCP server ([mcp.md](mcp.md)): `fft_list_charts` lists this catalog, `fft_get_chart` returns one entry with its starter spec, `fft_validate_spec` checks a spec, `fft_create_widget` saves one.",
  "",
  "## Index",
  "",
  ...index,
  ...sections,
  "",
].join("\n");
await writeFile(root("docs/catalog.md"), doc);

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Chart catalog</title>
  <!-- Generated by npm run catalog. Needs dist/ from npm run build:lib. -->
  <script src="../dist/fft-widgets.iife.js"></script>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, sans-serif; margin: 0 auto; max-width: 1200px; padding: 24px 16px; background: Canvas; color: CanvasText; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
    h2 { font: 600 13px/1.4 ui-monospace, monospace; margin: 0 0 6px; opacity: .7; }
  </style>
</head>
<body>
  <h1>Chart catalog</h1>
  <p>${cards.length} views, each one tag: <code>&lt;fft-widget src="&lt;view&gt;.json"&gt;</code>. What each needs: <a href="../docs/catalog.md">docs/catalog.md</a>.</p>
  <div class="grid">
${cards.map((c) => `    <section id="${c.type}"><h2>${c.type}</h2><fft-widget src="${c.type}.json" actions="csv image copy"></fft-widget></section>`).join("\n")}
  </div>
</body>
</html>
`;
await writeFile(root("catalog/index.html"), page);
console.log(`Wrote docs/catalog.md, catalog/index.html and ${cards.length} specs in catalog/`);
