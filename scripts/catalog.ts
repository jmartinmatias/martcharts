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
import { SEARCH_WORDS } from "../src/core/search-words.ts";
import { catalogTabs, navBar } from "./site-nav.ts";
import { placedRef } from "../src/core/ref.ts";
import { PLACES } from "../demo/routes.ts";

/** A ref the search box offers as an example: one the catalog shows today (its bar chart's). */
const EXAMPLE_REF = placedRef(PLACES.catalog, "product-share");

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
const cards: { type: string; summary: string; question: string; needs: string }[] = [];

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
  cards.push({ type: view.type, summary: entry.summary, question: entry.question ?? "", needs: entry.needs.filter((n) => n.required).map((n) => `${n.option}: ${n.holds}${n.many ? "+" : ""}`).join(", ") });

  index.push(`| [\`${view.type}\`](#${view.type}) | ${cell(entry.summary)} | ${cell(entry.question ?? "")} | ${needs} | [${view.type}.json](../catalog/${view.type}.json) |`);
  sections.push(`**Answers**: ${entry.question}`, "");
  sections.push(`**How to read it**: ${entry.howToRead}`, "");
  const more = rows.length > DOC_ROWS ? ` The spec below shows ${DOC_ROWS} of its ${rows.length} rows; the [full file](../catalog/${view.type}.json) has them all.` : "";
  sections.push(`**Drop it in**: \`<fft-widget src="catalog/${view.type}.json"></fft-widget>\`, or paste the spec into \`createWidget(el, spec)\`, a \`<script type="application/json">\` inside \`<fft-widget>\`, or MCP \`fft_create_widget\` (\`fft_describe_chart { "type": "${view.type}" }\` hands an agent this spec).${more} Source widget: [widgets/${example.id}.json](../widgets/${example.id}.json).`, "");
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
  '<script src="martcharts.iife.js"></script>  <!-- your copy of dist/martcharts.iife.js; installing is in frameworks.md -->',
  '<fft-widget src="catalog/bar.json" actions="csv image"></fft-widget>',
  "```",
  "",
  "Not sure which chart? `recommendCharts(rows)` (or MCP `fft_suggest_charts`) ranks the ones that suit your data, each with a filled view. Or swap the data for yours: keep the `view` block, change `data` (`inline` rows, a `url`, or a `fn` in code) so each row has the fields the view names. `validateSpec(spec, rows)` says what is missing. In a bundler, `import { createWidget } from \"martcharts\"` instead. Agents do the same through the MCP server ([mcp.md](mcp.md)): `fft_describe_chart` lists this catalog, or returns one entry with its starter spec, `fft_validate_spec` checks a spec, `fft_create_widget` saves one.",
  "",
  "## Index",
  "",
  ...index,
  ...sections,
  "",
].join("\n");
await writeFile(root("docs/catalog.md"), doc);

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Catalog · martcharts</title>
  <!-- Generated by npm run catalog. Needs dist/ from npm run build:lib. -->
  <script src="../dist/martcharts-lite.iife.js"></script>
  <link rel="stylesheet" href="../demo/site-nav.css">
  <link rel="stylesheet" href="../demo/site-look.css">
  <script src="../site-look.js"></script>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif; margin: 0 auto; max-width: 1248px; padding: 24px 16px; background: Canvas; color: CanvasText; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr)); gap: 34px 21px; }
    /* Each entry: its name, what it is for, the data it needs and the copy buttons sit tight together, then the live chart; a rule and a wide gap part one entry from the next. */
    .card { display: flex; flex-direction: column; gap: 5px; padding-top: 21px; border-top: 1px solid var(--line, color-mix(in srgb, CanvasText 12%, transparent)); }
    .card fft-widget { display: block; margin-top: 8px; }
    .card[hidden] { display: none; }
    .card h2 { font: 600 14px/1.4 ui-monospace, monospace; margin: 0; }
    .card p { font-size: 13px; line-height: 1.45; margin: 0; opacity: .8; }
    .needs { font: 12px/1.4 ui-monospace, monospace; }
    .tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 3px 0 0; font-size: 12px; }
    button { font: inherit; font-size: 12px; padding: 4px 10px; border-radius: 6px; border: 1px solid color-mix(in srgb, CanvasText 25%, transparent); background: transparent; color: inherit; cursor: pointer; min-height: 28px; }
    button:hover { background: color-mix(in srgb, CanvasText 8%, transparent); }
    input { font: inherit; padding: 8px 10px; width: 100%; max-width: 420px; box-sizing: border-box; border-radius: 8px; border: 1px solid color-mix(in srgb, CanvasText 25%, transparent); background: Canvas; color: inherit; }
    .count { font-size: 13px; opacity: .7; margin-left: 8px; }
    .ref-hits { margin: 0 0 21px; padding: 0; list-style: none; font-size: 14px; line-height: 1.6; }
    .ref-hits code { font: 12px ui-monospace, "SF Mono", Menlo, monospace; letter-spacing: 0.06em; }
  </style>
</head>
<body data-fft-place="catalog">
${navBar("Catalog", "../", "  ")}
${catalogTabs("charts")}
  <header class="page">
    <h1>Catalog</h1>
    <p>${cards.length} chart types. Each is one tag, <code>&lt;fft-widget src="&lt;type&gt;.json"&gt;</code>, with its data built in and a spec to copy.</p>
  </header>
  <p><label for="find">Find a chart by name, question, data or ref (W-…)</label><br><input id="find" type="search" placeholder="trend, share, date, ${EXAMPLE_REF}…" autocomplete="off"><span class="count" id="count" aria-live="polite"></span></p>
  <ul class="ref-hits" id="ref-hits" aria-live="polite" hidden></ul>
  <div class="grid">
${cards
  .map(
    (c) => `    <section class="card" id="${c.type}" data-search="${escape(`${c.type} ${c.summary} ${c.question} ${c.needs} ${SEARCH_WORDS[c.type] ?? ""}`.toLowerCase())}">
      <h2>${c.type}</h2>
      <p>${escape(c.summary)}</p>
      <p class="needs">needs ${escape(c.needs || "any rows")}</p>
      <div class="tools"><button type="button" data-copy="spec" data-type="${c.type}">Copy spec</button><button type="button" data-copy="tag" data-type="${c.type}">Copy tag</button><a href="guide.html#c-${c.type}">Data and switches</a></div>
      <fft-widget src="${c.type}.json" actions="info csv image explain expand"></fft-widget>
    </section>`,
  )
  .join("\n")}
  </div>
  <script>
    const find = document.getElementById("find");
    const count = document.getElementById("count");
    const cards = [...document.querySelectorAll(".card")];
    // A ref (W-AM22) names one chart in one place on the site: the index (docs/refs.json) says which and where.
    const hits = document.getElementById("ref-hits");
    let index;
    async function findRef(text) {
      const ref = text.trim().toUpperCase();
      if (!/^W-[0-9A-Z]{4}$/.test(ref)) {
        hits.hidden = true;
        return false;
      }
      index = index || (await fetch("../docs/refs.json").then((r) => r.json()).catch(() => []));
      const found = index.filter((entry) => entry.ref === ref || entry.formerly === ref);
      count.textContent = "";
      hits.replaceChildren(...(found.length ? found.map((entry) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = "../" + entry.url;
        link.textContent = (entry.title || entry.key) + ", " + entry.where;
        const code = document.createElement("code");
        code.textContent = entry.ref + " ";
        item.append(code, link);
        if (entry.ref !== ref) item.prepend(ref + " is now ");
        return item;
      }) : [Object.assign(document.createElement("li"), { textContent: "No chart on the site has the ref " + ref + "." })]));
      hits.hidden = false;
      return true;
    }
    find.addEventListener("input", async () => {
      if (await findRef(find.value)) return;
      const words = find.value.toLowerCase().split(/\\s+/).filter(Boolean);
      let shown = 0;
      for (const card of cards) {
        card.hidden = !words.every((word) => card.dataset.search.includes(word));
        if (!card.hidden) shown++;
      }
      count.textContent = words.length ? shown + " of " + cards.length : "";
    });
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-copy]");
      if (!button) return;
      const type = button.dataset.type;
      const text = button.dataset.copy === "tag"
        ? '<fft-widget src="catalog/' + type + '.json"></fft-widget>'
        : await (await fetch(type + ".json")).text();
      const label = button.textContent;
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
      } catch {
        button.textContent = "Copy failed";
      }
      setTimeout(() => (button.textContent = label), 1200);
    });
  </script>
</body>
</html>
`;
const external = externalScript(page, "catalog.js");
await writeFile(root("catalog/catalog.js"), `${external.code}\n`);
await writeFile(root("catalog/index.html"), external.html);
console.log(`Wrote docs/catalog.md, catalog/index.html and ${cards.length} specs in catalog/`);

/**
 * Moves a page's inline script into its own file next to it: the published site's Content-Security-Policy allows
 * scripts from the site only ("script-src 'self'"), so an inline script would be silently skipped there.
 */
function externalScript(html: string, file: string): { html: string; code: string } {
  let code = "";
  const out = html.replace(/<script>\n([\s\S]*?)\n {2}<\/script>/, (_match, body: string) => {
    code = body.replace(/^ {4}/gm, "");
    return `<script src="${file}" defer></script>`;
  });
  return { html: out, code };
}
