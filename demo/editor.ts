/**
 * The editor page: a thin shell around `createEditor`. The catalog's specs give the chart-type grid its live
 * thumbnails, the demo's data files are the samples, and the site's look (theme, preset) applies to the live chart.
 *
 * Edit JSON is the old gallery's playground: paste or edit any chart's spec, Apply, and the four steps carry on from
 * it. The address can open a chart straight away:
 *   editor.html?widget=<id>    a stored widget (from a dashboard card's "Edit in editor"), its data loaded in
 *   editor.html?spec=<json>    a spec in the address (a Taller version)
 *   editor.html?json=1         the JSON panel open
 */
import { createEditor, runPipeline } from "../src/index.ts";
import type { WidgetSpec } from "../src/index.ts";
import { PLACES } from "./routes.ts";
import { lookStyle, siteLocale } from "./look.ts";

/** One self-contained spec per view, written by `npm run catalog`. */
const catalog = import.meta.glob<WidgetSpec>("../catalog/*.json", { eager: true, import: "default" });
const examples: Record<string, WidgetSpec> = {};
for (const [path, spec] of Object.entries(catalog)) {
  const type = path.split("/").pop()?.replace(/\.json$/, "");
  if (type) examples[type] = spec;
}
/** Every stored widget, for ?widget=<id>. */
const stored = import.meta.glob<WidgetSpec>("../widgets/**/*.json", { eager: true, import: "default" });
const widgetById = (id: string) => Object.values(stored).find((spec) => spec.id === id);

const $ = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T;

// ---- The editor ----
document.body.dataset.fftPlace = PLACES.editor;
const editor = createEditor($("#editor"), {
  // The editor's own words in the site's language, from the first draw (the page's lang is set only once it has loaded).
  locale: siteLocale() ?? "en-US",
  examples,
  samples: [
    { label: "Tickets by team", url: "/examples/tickets.csv" },
    { label: "Monthly revenue", url: "/data/monthly.json" },
    { label: "Customers", url: "/data/customers.json" },
    { label: "Daily orders", url: "/data/daily-orders.json" },
    { label: "Sales by region and product", url: "/data/sales.json" },
  ],
  srcOf: (spec) => `widgets/${spec.id ?? "chart"}.json`,
  // The published site serves the embed page with the drop-in examples; a full address, so the code works anywhere.
  embedHref: new URL("examples/embed.html", location.href).href,
  // The live chart draws in the site's Look, as the dashboards do; the spec you copy stays free of it.
  previewStyle: lookStyle,
  // And in the site's language: numbers, dates and words; never written into the spec.
  previewLocale: siteLocale,
});
// The Look menu's style: redraw the live chart in it, here, without reloading.
window.addEventListener("martcharts:look", (event) => {
  event.preventDefault();
  void editor.restyle();
});
// A new language: the editor's own words were written in the old one, so the page reloads. Nothing is lost: the step
// and the chart are kept in the address.
window.addEventListener("martcharts:lang", (event) => {
  event.preventDefault();
  location.reload();
});

// ---- Edit JSON ----
const panel = $<HTMLDetailsElement>("#json-panel");
const text = $<HTMLTextAreaElement>("#json-text");
const status = $("#json-status");
const showCurrent = () => {
  text.value = JSON.stringify(editor.spec, null, 2);
  status.textContent = "";
};

/** A spec with its rows read in, so the editor's steps (which work on a table) can take it from here. */
async function inlined(spec: WidgetSpec): Promise<WidgetSpec> {
  if (spec.data?.type === "inline") return spec;
  const rows = await runPipeline({ data: spec.data });
  return { ...spec, data: { type: "inline", rows } };
}

async function apply(spec: WidgetSpec) {
  try {
    editor.setSpec(await inlined(spec));
    showCurrent();
    status.textContent = "Applied.";
  } catch (error) {
    status.textContent = `Could not apply: ${error instanceof Error ? error.message : String(error)}`;
  }
}

$("#json-apply").addEventListener("click", () => {
  let spec: WidgetSpec;
  try {
    spec = JSON.parse(text.value) as WidgetSpec;
  } catch (error) {
    status.textContent = `Not valid JSON: ${error instanceof Error ? error.message : String(error)}`;
    return;
  }
  void apply(spec);
});
$("#json-reload").addEventListener("click", showCurrent);
panel.addEventListener("toggle", () => {
  if (panel.open && !text.value) showCurrent();
});

// ---- What the address asks for ----
const params = new URLSearchParams(location.search);
const widgetId = params.get("widget");
const specText = params.get("spec");
if (params.has("json") || widgetId || specText) panel.open = true;
if (widgetId) {
  const spec = widgetById(widgetId);
  if (spec) void apply(spec);
  else status.textContent = `No chart called "${widgetId}".`;
} else if (specText) {
  try {
    void apply(JSON.parse(specText) as WidgetSpec);
  } catch {
    status.textContent = "The spec in the address is not valid JSON.";
  }
}
