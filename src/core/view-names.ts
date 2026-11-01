/**
 * What other chart tools call a chart, and what martcharts calls it. Someone arriving from a spreadsheet or another
 * charting tool writes "column chart", "stacked bars", "range plot" or "d3-arrow-plot"; the validator answers with the
 * view that draws it and a starter view to paste, instead of a list of every view name.
 *
 * @module
 */
import { getBlock } from "./registry.ts";
import type { OptionSchema } from "./registry.ts";

/** A view and the settings that make it the chart asked for: "stacked columns" is a bar view with `stacked: true`. */
export interface ViewMatch {
  type: string;
  set?: Record<string, unknown>;
}

const bar: ViewMatch = { type: "bar" };
const hbar: ViewMatch = { type: "hbar" };

/** Common names, normalized (lower case, words split by spaces, no "d3", no trailing "chart", "plot" kept where it names the form). */
const NAMES: Record<string, ViewMatch> = {
  column: bar, columns: bar, "vertical bar": bar, "vertical bars": bar,
  "grouped column": bar, "grouped columns": bar, "multiple columns": bar, "clustered column": bar,
  "stacked column": { type: "bar", set: { stacked: true } }, "stacked columns": { type: "bar", set: { stacked: true } },
  "stacked column 100": { type: "bar", set: { stacked: "percent" } },
  bars: hbar, barchart: hbar, "horizontal bar": hbar, "horizontal bars": hbar, "grouped bars": hbar, "bars grouped": hbar,
  "stacked bars": { type: "hbar", set: { stacked: true } }, "bars stacked": { type: "hbar", set: { stacked: true } },
  "split bars": { type: "hbar", set: { split: true } }, "bars split": { type: "hbar", set: { split: true } },
  "bullet bars": { type: "bullet" }, "bars bullet": { type: "bullet" },
  lollipop: { type: "bar", set: { mark: "lollipop" } },
  lines: { type: "line" }, "multiple lines": { type: "line" }, "line graph": { type: "line" }, spline: { type: "line", set: { curve: "smooth" } }, step: { type: "line", set: { curve: "step" } },
  "area chart": { type: "area" }, "stacked area": { type: "area", set: { stacked: true } }, "stacked areas": { type: "area", set: { stacked: true } },
  "dot plot": { type: "dot" }, dots: { type: "dot" },
  "range plot": { type: "dumbbell" }, range: { type: "dumbbell" }, "arrow plot": { type: "dumbbell", set: { mark: "arrow" } }, arrow: { type: "dumbbell", set: { mark: "arrow" } },
  slopegraph: { type: "slope" }, "slope graph": { type: "slope" },
  pies: { type: "pie" }, "multiple pies": { type: "pie" }, donuts: { type: "donut" }, "multiple donuts": { type: "donut" }, doughnut: { type: "donut" },
  "election donut": { type: "donut", set: { arc: "half", majority: true } }, parliament: { type: "donut", set: { arc: "half", majority: true } }, "half donut": { type: "donut", set: { arc: "half" } },
  scatterplot: { type: "scatter" }, "scatter plot": { type: "scatter" }, bubble: { type: "scatter" }, bubbles: { type: "scatter" },
  tables: { type: "table" }, grid: { type: "table" },
  map: { type: "choropleth" }, "choropleth map": { type: "choropleth" }, "maps choropleth": { type: "choropleth" },
  "symbol map": { type: "symbols" }, "maps symbols": { type: "symbols" }, "bubble map": { type: "symbols" }, "proportional symbol map": { type: "symbols" },
  "locator map": { type: "locator" }, "pin map": { type: "locator" },
  bridge: { type: "waterfall" }, "heat map": { type: "heatmap" }, "tree map": { type: "treemap" }, mosaic: { type: "marimekko" },
  gantt: { type: "timeline" }, "big number": { type: "kpi" }, number: { type: "kpi" }, scorecard: { type: "kpis" },
  "box plot": { type: "boxplot" }, "box and whisker": { type: "boxplot" }, "spider": { type: "radar" }, "population pyramid": { type: "pyramid" },
};

/** "D3-Bars-Stacked", "stacked_bars" and "Stacked bars chart" all read as "stacked bars". */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/^d3[-_ ]?/, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/ (chart|charts|graph)$/, "").trim();
}

/** The view another tool's chart name stands for, when it is a known name. */
export function viewForName(name: string): ViewMatch | undefined {
  const key = normalizeName(name);
  return NAMES[key] ?? NAMES[key.replace(/s$/, "")];
}

/** A placeholder for a field option, by what it holds: "<category>", "<number>", "<date>". */
function placeholder(option: OptionSchema): string {
  return option.kind ? `<${option.kind} field>` : "<field>";
}

/** A view to paste: the type, its required fields as placeholders, and the settings that make the chart asked for. */
export function starterView(match: ViewMatch): Record<string, unknown> {
  const view: Record<string, unknown> = { type: match.type };
  try {
    for (const [key, option] of Object.entries(getBlock("view", match.type).options)) {
      if (option.required && (option.type === "field" || option.type === "fields")) view[key] = option.type === "fields" ? [placeholder(option)] : placeholder(option);
    }
  } catch {
    // An unknown view has no options to list; the type alone still helps.
  }
  return { ...view, ...match.set };
}
