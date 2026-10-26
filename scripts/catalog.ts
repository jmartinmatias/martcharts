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
import { typeSummary } from "../src/core/type-words.ts";
import { FIND_JS } from "./find.ts";
import { catalogTabs, navBar } from "./site-nav.ts";
import { placedRef } from "../src/core/ref.ts";
import { kindWord } from "../src/core/option-words.ts";
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
const cards: { type: string; summary: string; question: string; needs: string; needsFr: string; needsDe: string }[] = [];

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
  const required = entry.needs.filter((n) => n.required);
  // The same line in French and German: the option names stay as written (they are code), what they hold is in words.
  const needsIn = (lang: "fr" | "de") =>
    `${lang === "fr" ? "il faut" : "braucht"} ${required.map((n) => `${n.option}${lang === "fr" ? " : " : ": "}${kindWord(n.holds, lang)}${n.many ? "+" : ""}`).join(", ") || (lang === "fr" ? "n'importe quelles lignes" : "beliebige Zeilen")}`;
  cards.push({ type: view.type, summary: entry.summary, question: entry.question ?? "", needs: required.map((n) => `${n.option}: ${n.holds}${n.many ? "+" : ""}`).join(", "), needsFr: needsIn("fr"), needsDe: needsIn("de") });

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
/** An element's French and German, as attributes the site's language script swaps in (no inline script: CSP). */
const inLanguages = (fr?: string, de?: string) => `${fr ? ` data-fr="${escape(fr)}"` : ""}${de ? ` data-de="${escape(de)}"` : ""}`;

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
    body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif; box-sizing: border-box; margin: 0 auto; max-width: 1280px; padding: 24px 16px; background: Canvas; color: CanvasText; }
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
    .none { margin: 0 0 21px; font-size: 14px; }
    .none button { margin-left: 8px; }
    /* The chart a ref led to: ringed for a moment, so the eye lands on it. */
    .card.found { outline: 2px solid var(--site-link, AccentColor); outline-offset: 8px; border-radius: 2px; }
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
  <p class="none" id="none" role="status" hidden><span id="none-words"></span> <button type="button" id="clear">Clear search</button></p>
  <div class="grid">
${cards
  .map(
    (c) => `    <section class="card" id="${c.type}" data-search="${escape(`${c.type} ${c.summary} ${typeSummary(c.type, "fr") ?? ""} ${typeSummary(c.type, "de") ?? ""} ${c.needs} ${SEARCH_WORDS[c.type] ?? ""}`.toLowerCase())}" data-more="${escape(c.question.toLowerCase())}">
      <h2>${c.type}</h2>
      <p${inLanguages(typeSummary(c.type, "fr"), typeSummary(c.type, "de"))}>${escape(c.summary)}</p>
      <p class="needs"${inLanguages(c.needsFr, c.needsDe)}>needs ${escape(c.needs || "any rows")}</p>
      <div class="tools"><button type="button" data-copy="spec" data-type="${c.type}">Copy spec</button><button type="button" data-copy="tag" data-type="${c.type}">Copy tag</button><a href="guide.html#c-${c.type}">Data and switches</a></div>
      <fft-widget src="${c.type}.json" actions="info csv image explain expand"></fft-widget>
    </section>`,
  )
  .join("\n")}
  </div>
  <script>
${FIND_JS}
    const find = document.getElementById("find");
    const count = document.getElementById("count");
    const none = document.getElementById("none");
    const noneWords = document.getElementById("none-words");
    const cards = [...document.querySelectorAll(".card")].map((el) => ({ el, keywords: tokens(el.dataset.search), everything: tokens(el.dataset.search + " " + el.dataset.more) }));
    // A ref (W-AM22) names one chart in one place on the site: the index (docs/refs.json) says which and where.
    const hits = document.getElementById("ref-hits");
    function showAll() {
      for (const card of cards) card.el.hidden = false;
      hits.hidden = true;
      none.hidden = true;
      count.textContent = "";
    }
    // A ref led to a chart on this page: clear the search, then bring the card into view and onto the keyboard.
    function showHere(hash) {
      find.value = "";
      showAll();
      const card = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!card) return;
      history.replaceState(null, "", hash);
      card.tabIndex = -1;
      card.classList.add("found");
      card.scrollIntoView({ block: "start", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      card.focus({ preventScroll: true });
      setTimeout(() => card.classList.remove("found"), 2400);
    }
    function filterWords(text) {
      hits.hidden = true;
      const words = tokens(text);
      if (!words.length) return showAll();
      const shown = new Set(matchWords(words, cards));
      for (const card of cards) card.el.hidden = !shown.has(card);
      count.textContent = T("{0} of {1}", shown.size, cards.length);
      noneWords.textContent = T("No chart matches \u201c{0}\u201d.", text.trim());
      none.hidden = shown.size > 0;
    }
    // The ref's charts are the result: the grid steps aside until one is chosen or the search is cleared.
    function showRef(result) {
      for (const card of cards) card.el.hidden = true;
      hits.replaceChildren(...refItems(result, "../", showHere));
      hits.hidden = false;
      none.hidden = true;
      count.textContent = "";
    }
    let typed = 0;
    // Words filter at once; text shaped like a ref then asks the index, and shows the chart it names if there is one.
    find.addEventListener("input", () => {
      const turn = ++typed;
      const text = find.value;
      const read = readRef(text);
      if (!read || !read.sure) filterWords(text);
      if (!read) return;
      lookUpRef(text, "../").then((result) => {
        if (turn !== typed) return;
        if (result) showRef(result);
        else if (read.sure) filterWords(text);
      });
    });
    document.getElementById("clear").addEventListener("click", () => {
      find.value = "";
      showAll();
      find.focus();
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
        button.textContent = T("Copied");
      } catch {
        button.textContent = T("Copy failed");
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
