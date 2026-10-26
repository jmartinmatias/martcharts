/**
 * Built-in view descriptors: what each view is and which options it reads.
 * The drawing code lives in `src/dom/views` and is attached in the browser,
 * so Node (the MCP server, tests) can validate specs without a DOM.
 *
 * @module
 */
import { readNumber } from "./formats.ts";
import { binValues, sturges } from "./scale.ts";
import { basemapNames, featureId, geoProblem, normalizeId, resolveGeo } from "./geo.ts";
import type { GeoCollection } from "./geo.ts";
import { ICON_NAMES } from "./icons.ts";
import { checkReference, REFERENCE_OPTION } from "./reference.ts";
import type { ReferenceMark } from "./reference.ts";
import type { Row } from "./types.ts";
import type { OptionSchema, ViewBlock } from "./registry.ts";
import { isRagValue, ragOf, ragStepProblems, worstOf } from "./rag.ts";
import { SHAPE_OPTIONS, SHAPE_VIEWS, shapeProblems } from "./shape.ts";

/** `{ type: "table", columns? }` */
export interface TableView {
  type: "table";
  /** Fields to show, in order. Defaults to every field in the rows. */
  columns?: string[];
  /** Headers sort the rows when clicked. Default true. */
  sortable?: boolean;
  /** A footer row summing each number column. Default false. */
  totals?: boolean;
  /** A search field above the table that keeps the rows matching what is typed. Default false. */
  search?: boolean;
  /** Rows shown at a time, with Previous and Next under the table. Default: the first 100, then Show more. */
  pageSize?: number;
  /** Draw every row at once, with no Show more. Default false. */
  showAll?: boolean;
  /** Keep the first column in place when the table scrolls sideways. Default false. */
  stickyFirst?: boolean;
  /** Text alignment per column, where the default (numbers right, text left) is not wanted. */
  align?: Record<string, "left" | "center" | "right">;
}

const ALIGNMENTS = ["left", "center", "right"];

/** `{ type: "list", label, detail?, value? }` */
export interface ListView {
  type: "list";
  label: string;
  detail?: string;
  value?: string;
}

/**
 * `{ type: "kpi", value, compare?, compareLabel?, goodWhen?, label?, series?, x? }`.
 * Reads the first row; with `series`, reads the rows as a time series instead.
 */
export interface KpiView {
  type: "kpi";
  value: string;
  compare?: string;
  compareLabel?: string;
  goodWhen?: "up" | "down";
  label?: string;
  series?: boolean;
  x?: string;
  icon?: string;
  target?: string;
  /** Thresholds that give the number a RAG status, shown as a pill with its shape and words beside it. */
  rag?: KpiRag;
}

/** `{ green, amber, goodWhen? }`: a headline number's RAG thresholds. */
export interface KpiRag {
  green: number;
  amber: number;
  goodWhen?: "up" | "down";
}

/** The kpi and kpis `rag` option: thresholds for a status pill beside the number. */
const KPI_RAG_OPTION: OptionSchema = {
  type: "object",
  description:
    'Thresholds that give the number a Red, Amber or Green status, shown as a small pill with its shape and words (On track, At risk, Off track) beside it: { "green": 40, "amber": 20 }, or { "green": 2, "amber": 5, "goodWhen": "down" } when less is better.',
};

/** Problems with a rag thresholds object at `path`. */
function checkKpiRag(value: unknown, path: string): string[] {
  if (value === undefined) return [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [`${path} must be an object such as { "green": 40, "amber": 20 }.`];
  // The transform's own checks, worded for this option: "rules[0].green" reads "rag.green".
  return ragStepProblems({ rules: [{ field: "value", ...(value as Record<string, unknown>) }] }).map((p) => p.replace(/^rules\[0\](\.|: )/, (_, sep: string) => (sep === "." ? `${path}.` : `${path}: `)));
}

/** One tile in a `kpis` row. */
export interface KpisItem {
  value: string;
  label?: string;
  compare?: string;
  compareLabel?: string;
  goodWhen?: "up" | "down";
  target?: string;
  /** Thresholds that give the tile a RAG status pill. */
  rag?: KpiRag;
}

/** `{ type: "kpis", items, series? }`: a row of stat tiles in one widget. */
export interface KpisView {
  type: "kpis";
  items: KpisItem[];
  series?: boolean;
}

/** `{ type: "area", x, y, stacked?, highlight?, endLabels? }` */
export interface AreaView {
  type: "area";
  x: string;
  y: string | string[];
  stacked?: boolean | "percent" | "stream";
  highlight?: string | string[];
  endLabels?: boolean;
  reference?: ReferenceMark[];
  /** As on the line view, for one unstacked area. */
  forecast?: string;
  band?: { low: string; high: string; label?: string };
  /** How the line and its wash run between points. */
  curve?: "linear" | "smooth" | "step";
  /** Short notes pinned to points of the chart. */
  annotations?: Annotation[];
}

/**
 * A short note pinned to one point of a bar, line or area chart: `x` names the
 * category or period, `y` (optional) the height to pin it at, `text` the words.
 */
export interface Annotation {
  x: unknown;
  y?: number;
  text: string;
}

/** `{ type: "meter", value, target, label? }`: one meter per row. */
export interface MeterView {
  type: "meter";
  value: string;
  target: string;
  label?: string;
}

/** `{ type: "donut", label, value, caption?, arc?, majority? }`: part-to-whole for up to 6 slices. */
export interface DonutView {
  type: "donut";
  label: string;
  value: string;
  caption?: string;
  /** "half" draws a semicircle open at the bottom, slices left to right in the order given: a parliament. */
  arc?: "full" | "half";
  /** On a half ring, a tick at the halfway point, labelled with the majority (more than half of the total). */
  majority?: boolean;
}

/** `{ type: "pie", label, value, labelPlace? }`: part-to-whole as a full disc, for up to 6 slices. */
export interface PieView {
  type: "pie";
  label: string;
  value: string;
  /** Where the slices are named: shares inside the slices with a legend (default), names and shares outside with leader lines, or the legend alone. */
  labelPlace?: "inside" | "outside" | "legend";
}

/** `{ type: "waterfall", label, value, totals?, endLabel? }`: a bridge from one total to another. */
export interface WaterfallView {
  type: "waterfall";
  label: string;
  value: string;
  totals?: string[];
  endLabel?: string;
  fit?: boolean;
  /** Step names to keep in color; the other steps step back. */
  highlight?: string | string[];
}

/** `{ type: "heatmap", x, y, value }`: one cell per x and y pair, shaded by value. */
export interface HeatmapView {
  type: "heatmap";
  x: string;
  y: string;
  value: string;
}

/** `{ type: "scatter", x, y, color?, label? }`: one dot per row, two numbers each. */
export interface ScatterView {
  type: "scatter";
  x: string;
  y: string;
  size?: string;
  /** Field that colors the dots by group. */
  color?: string;
  label?: string;
  reference?: ReferenceMark[];
  /** Field naming each dot's cluster: a soft hull gathers each cluster's dots, named at its middle, and colors the dots unless series is set. */
  cluster?: string;
  /** Write each dot's label beside it, where it does not land on another label. */
  labels?: boolean;
  /** Four quadrants split at x and y, each with a faint corner word. */
  quadrants?: Quadrants;
  /** Dot labels or groups to keep in color; the other dots step back. */
  highlight?: string | string[];
  /** Short notes pinned to dots, by label or x value. */
  annotations?: Annotation[];
}

/** `{ x, y, labels? }`: the lines that split a scatter into four, and the words in its corners, top-left first then clockwise. */
export interface Quadrants {
  x: number;
  y: number;
  labels?: string[];
}

/** The quadrants option's shape, as problems. */
function checkQuadrants(view: Record<string, unknown>): string[] {
  const q = view.quadrants;
  if (q === undefined) return [];
  if (!q || typeof q !== "object" || Array.isArray(q)) return ['quadrants must be an object such as { "x": 50, "y": 3, "labels": ["Monitor", "Act now", "Prepare", "Watch"] }.'];
  const { x, y, labels } = q as Record<string, unknown>;
  const problems: string[] = [];
  if (typeof x !== "number" || !Number.isFinite(x)) problems.push("quadrants.x must be a number: where the vertical split falls.");
  if (typeof y !== "number" || !Number.isFinite(y)) problems.push("quadrants.y must be a number: where the horizontal split falls.");
  if (labels !== undefined && !(Array.isArray(labels) && labels.length <= 4 && labels.every((l) => typeof l === "string"))) problems.push("quadrants.labels must be up to four strings: top-left, top-right, bottom-right, bottom-left.");
  return problems;
}

/**
 * `{ type: "anomalies", x, metric, value, expected?, low?, high?, flag? }`: one thin lane per metric over time,
 * its expected band behind the value line, and the days it stepped outside flagged.
 */
export interface AnomaliesView {
  type: "anomalies";
  x: string;
  metric: string;
  value: string;
  expected?: string;
  low?: string;
  high?: string;
  flag?: string;
}

/** `{ type: "bullet", label, value, target, ranges? }`: actual against target over qualitative bands, one row each. */
export interface BulletView {
  type: "bullet";
  label: string;
  value: string;
  target: string;
  ranges?: number[];
  /** A column holding each row's unit ("%", "€", "$"), for a scorecard whose rows measure different things. A "(%)" at the end of a row's name does the same. */
  unit?: string;
}

/** `{ type: "treemap", label, value, group? }`: part-to-whole for many categories. */
export interface TreemapView {
  type: "treemap";
  label: string;
  value: string;
  group?: string;
}

/** `{ type: "funnel", label, value }`: stages narrowing in order, with conversion between them. */
export interface FunnelView {
  type: "funnel";
  label: string;
  value: string;
}

/** `{ type: "calendar", date, value }`: one cell per day, weeks across and weekdays down. */
export interface CalendarView {
  type: "calendar";
  date: string;
  value: string;
}

/** `{ type: "ridgeline", value, group }`: one smooth distribution per group, overlapping. */
export interface RidgelineView {
  type: "ridgeline";
  value: string;
  group: string;
}

/** `{ type: "sankey", source, target, value }`: flows between stages as ribbons. */
export interface SankeyView {
  type: "sankey";
  source: string;
  target: string;
  value: string;
}

/** `{ type: "dumbbell", label, from, to, mark? }`: before and after per item on one axis (a range plot), or as arrows (an arrow plot). */
export interface DumbbellView {
  type: "dumbbell";
  label: string;
  from: string;
  to: string;
  /** "range" joins the two dots with a line (the default); "arrow" points from the first value to the second, colored up or down when they are two periods. */
  mark?: "range" | "arrow";
}

/** `{ type: "dot", label, value, highlight? }`: one or more measures per row as dots on one shared axis (a dot plot). */
export interface DotView {
  type: "dot";
  label: string;
  value: string | string[];
  highlight?: string | string[];
}

/** `{ type: "slope", label, from, to, highlight? }`: each item's move between two points, as a line across two columns. */
export interface SlopeView {
  type: "slope";
  label: string;
  from: string;
  to: string;
  highlight?: string | string[];
}

/** `{ type: "bump", x, series, value, highlight? }`: each series' rank in every period, as a smooth line. */
export interface BumpView {
  type: "bump";
  x: string;
  series: string;
  value: string;
  highlight?: string | string[];
}

/** `{ type: "marimekko", x, series, value }`: column widths by total, segments by share within each column. */
export interface MarimekkoView {
  type: "marimekko";
  x: string;
  series: string;
  value: string;
}

/** `{ type: "histogram", value, bins?, median?, countLabel? }`: how many rows fall in each range of a value. */
export interface HistogramView {
  type: "histogram";
  value: string;
  bins?: number;
  median?: boolean;
  countLabel?: string;
}

/** `{ type: "rings", label, value, target }`: concentric progress rings, one per goal. */
export interface RingsView {
  type: "rings";
  label: string;
  value: string;
  target: string;
}

/** `{ type: "timeline", label, start, end?, group?, today? }`: tasks as bars on a date axis, milestones as diamonds. */
export interface TimelineView {
  type: "timeline";
  label: string;
  start: string;
  end?: string;
  group?: string;
  today?: boolean | string;
  progress?: string;
}

/** Time of an ISO date string or timestamp, or null. */
export function timeOf(value: unknown): number | null {
  const time = typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : null;
}

/** `{ type: "waffle", label, value, total? }`: a 10 by 10 grid, each square one percent. */
export interface WaffleView {
  type: "waffle";
  label: string;
  value: string;
  total?: number;
}

/** `{ type: "variance", label, value, target, percent?, goodWhen? }`: actual against plan per row, as bars either side of zero. */
export interface VarianceView {
  type: "variance";
  label: string;
  value: string;
  target: string;
  percent?: boolean;
  goodWhen?: "up" | "down";
}

/** `{ type: "gauge", value, target?, min?, max?, label? }`: one number on a half-circle scale. */
export interface GaugeView {
  type: "gauge";
  value: string;
  target?: string;
  min?: number;
  max?: number;
  label?: string;
}

/** `{ type: "pareto", label, value, threshold? }`: the 80/20 view: sorted shares and their running total on one percent axis. */
export interface ParetoView {
  type: "pareto";
  label: string;
  value: string;
  threshold?: number;
}

/** `{ type: "boxplot", value, group? }`: quartiles, whiskers and outliers per group. */
export interface BoxplotView {
  type: "boxplot";
  value: string;
  group?: string;
}

/** `{ type: "likert", label, value }`: survey answers as diverging stacked bars centered on neutral. */
export interface LikertView {
  type: "likert";
  label: string;
  /** The response count fields, from one pole to the other. */
  value: string[];
}

/** `{ type: "candlestick", x, open, high, low, close, average? }`: price periods as wicks and bodies. */
export interface CandlestickView {
  type: "candlestick";
  x: string;
  open: string;
  high: string;
  low: string;
  close: string;
  average?: number;
}

/** `{ type: "sunburst", levels, value, caption? }`: a hierarchy as rings, children inside their parent's slice. */
export interface SunburstView {
  type: "sunburst";
  levels: string[];
  value: string;
  caption?: string;
}

/** `{ type: "icicle", levels, value }`: a hierarchy as columns of rectangles, each child splitting its parent's height. */
export interface IcicleView {
  type: "icicle";
  levels: string[];
  value: string;
}

/** `{ type: "chord", source, target, value }`: flows between groups as ribbons around a circle. */
export interface ChordView {
  type: "chord";
  source: string;
  target: string;
  value: string;
}

/** `{ type: "radar", label, y, max? }`: profiles across several attributes on one shared scale. */
export interface RadarView {
  type: "radar";
  label: string;
  y: string | string[];
  max?: number;
}

/** `{ type: "horizon", x, y, bands?, baseline?, baselineLabel? }`: many time series in thin rows, values folded into bands of deepening color. */
export interface HorizonView {
  type: "horizon";
  x: string;
  y: string | string[];
  bands?: number;
  baseline?: number;
  /** What the baseline stands for, such as "plan": the key, tooltips and guide then say above or below it. */
  baselineLabel?: string;
}

/** `{ type: "rose", label, y, max? }`: a polar area chart for a cycle, wedges true to their values by area. */
export interface RoseView {
  type: "rose";
  label: string;
  y: string | string[];
  max?: number;
}

/** `{ type: "beeswarm", value, group?, label? }`: one dot per row along a value axis, nudged apart. */
export interface BeeswarmView {
  type: "beeswarm";
  value: string;
  group?: string;
  label?: string;
}

/** `{ type: "bar", x, y, stacked?, lines?, highlight? }` */
export interface BarView {
  type: "bar";
  x: string;
  y: string | string[];
  lines?: string | string[];
  stacked?: boolean | "percent";
  highlight?: string | string[];
  reference?: ReferenceMark[];
  /** "lollipop" draws a thin stem and a dot in place of each bar. */
  mark?: "bar" | "lollipop";
  /** Which side of a target is good: "up" (revenue, the default) or "down" (wait times, costs). */
  goodWhen?: "up" | "down";
  /** Field drawn as a wider, quieter column behind each bar, for a comparison such as last year. One series only. */
  compare?: string;
  /** Short notes pinned to bars. */
  annotations?: Annotation[];
}

/**
 * `{ type: "hbar", label, value, stacked?, split?, shared?, highlight? }`: a ranking with values at the bar ends.
 * Several value fields draw grouped bars, stacked bars (`stacked`), or split bars (`split`: one column per measure).
 */
export interface HbarView {
  type: "hbar";
  label: string;
  value: string | string[];
  /** true stacks several value fields into one bar per row; "percent" stacks them as shares of 100%. */
  stacked?: boolean | "percent";
  /** With several value fields, one small column of bars per measure, side by side, each on its own scale. */
  split?: boolean;
  /** Split columns share one scale, so bars compare across columns too. */
  shared?: boolean;
  highlight?: string | string[];
  mark?: "bar" | "lollipop";
}

/** `{ type: "pyramid", label, left, right }`: two counts per band, as bars growing out from a center axis. */
export interface PyramidView {
  type: "pyramid";
  label: string;
  left: string;
  right: string;
}

/** The `mark` option shared by bar and hbar. */
const MARK_OPTION = {
  type: "enum",
  values: ["bar", "lollipop"],
  default: "bar",
  description: '"lollipop" draws a thin stem from the baseline and a dot at the value in place of each bar: the same reading with far less ink, for rankings of many similar values.',
} as const;

/** `{ type: "line", x, y, highlight?, endLabels? }` */
export interface LineView {
  type: "line";
  x: string;
  y: string | string[];
  highlight?: string | string[];
  endLabels?: boolean;
  reference?: ReferenceMark[];
  /** Field that is true on forecast rows: they draw dashed, in a shaded zone after the last actual. */
  forecast?: string;
  /** A shaded range behind the first line, such as a forecast's p10 to p90. */
  band?: { low: string; high: string; label?: string };
  /** How the lines run between points: straight (default), smooth or in steps. */
  curve?: "linear" | "smooth" | "step";
  /** A small symbol at every data point. */
  points?: boolean;
  /** True names the first series' highest and lowest points with a dot and their value. */
  peaks?: boolean;
  /** "log" draws the value axis logarithmically (ticks at powers of ten), for growth that multiplies. Positive values only. */
  scale?: "linear" | "log";
  /** Short notes pinned to points of the lines. */
  annotations?: Annotation[];
}

/** `{ type: "dual", x, y, y2, panels? }`: two measures on two panels sharing one x axis, each on its own scale. */
export interface DualView {
  type: "dual";
  x: string;
  y: string;
  y2: string;
  /** How each panel draws its measure, top then bottom. Default ["bar", "line"]. */
  panels?: [DualMark, DualMark];
  /** The texture of lines between points. */
  curve?: "linear" | "smooth" | "step";
  /** Short notes pinned to periods on the top panel. */
  annotations?: Annotation[];
}

export type DualMark = "bar" | "line";

/** Whether a forecast flag is set: true, 1, "true" or "yes". */
export function isForecast(value: unknown): boolean {
  return value === true || value === 1 || value === "true" || value === "yes";
}

/** Values a series axis must cover: every value, or the column sums when stacked (0 to 1 for percent stacks, half the sum either side of zero for streams). */
function seriesExtent(view: Record<string, unknown>, rows: Row[]): number[] {
  const fields = Array.isArray(view.y) ? view.y.map(String) : [String(view.y)];
  if (view.stacked === "percent") return [0, 1];
  if (view.stacked === "stream") {
    return rows.flatMap((row) => {
      const total = fields.reduce((sum, f) => sum + Math.max(0, readNumber(row[f]) ?? 0), 0);
      return [total / 2, -total / 2];
    });
  }
  if (view.stacked === true) {
    return rows.flatMap((row) => {
      const values = fields.map((f) => readNumber(row[f]) ?? 0);
      return [values.filter((v) => v > 0).reduce((a, b) => a + b, 0), values.filter((v) => v < 0).reduce((a, b) => a + b, 0)];
    });
  }
  const band = view.band as LineView["band"] | undefined;
  const banded = band ? [band.low, band.high] : [];
  // A comparison column behind the bars (last year) is on the same axis, so the panels cover it too.
  const compared = typeof view.compare === "string" ? [view.compare] : [];
  return rows.flatMap((row) => [...fields, ...banded, ...compared].map((f) => readNumber(row[f]))).filter((n): n is number => n !== null);
}

const highlightCategories: OptionSchema = {
  type: "any",
  description:
    'Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest.',
};
const highlightSeries: OptionSchema = {
  type: "any",
  description: 'Series field or fields to keep in color; every other series turns grey. Example: "revenue".',
};

/** Every number in the named fields across the rows: a view's extent, so small multiples share one scale. */
function numbersOf(rows: Row[], fields: unknown[]): number[] {
  return fields.flatMap((field) => (typeof field === "string" ? rows.map((row) => readNumber(row[field])) : [])).filter((n): n is number => n !== null);
}

/** Variance bars run from zero to actual minus plan, or to its share of plan with percent. */
function varianceExtent(view: Record<string, unknown>, rows: Row[]): number[] {
  return rows.flatMap((row) => {
    const [actual, plan] = [readNumber(row[view.value as string]), readNumber(row[view.target as string])];
    if (actual === null || plan === null) return [];
    return [0, view.percent ? (plan === 0 ? 0 : (actual - plan) / Math.abs(plan)) : actual - plan];
  });
}

/** A waterfall's axis spans every running total: steps add to it, total rows reset it. */
function waterfallExtent(view: Record<string, unknown>, rows: Row[]): number[] {
  const totals = new Set((Array.isArray(view.totals) ? view.totals : view.totals === undefined ? [] : [view.totals]).map(String));
  let running = 0;
  const out = [0];
  for (const row of rows) {
    const amount = readNumber(row[view.value as string]) ?? 0;
    running = totals.has(String(row[view.label as string])) ? amount : running + amount;
    out.push(running);
  }
  return out;
}

/** A histogram's axis is counts: the tallest bin, binned as the view bins. */
function histogramExtent(view: Record<string, unknown>, rows: Row[]): number[] {
  const values = numbersOf(rows, [view.value]);
  const bins = binValues(values, typeof view.bins === "number" ? view.bins : sturges(values.length));
  return [0, ...bins.map((bin) => bin.count)];
}

/** A bullet's axis reaches the actual, the target and the end of its last band. */
function bulletExtent(view: Record<string, unknown>, rows: Row[]): number[] {
  const last = Array.isArray(view.ranges) && typeof view.ranges[2] === "number" ? view.ranges[2] : 1.2;
  return rows.flatMap((row) => {
    const [actual, goal] = [readNumber(row[view.value as string]), readNumber(row[view.target as string])];
    return [0, ...(actual === null ? [] : [actual]), ...(goal === null ? [] : [goal, goal * last])];
  });
}

/** Adds a shape check to a block, after its own: for options declared on many views at once. */
function withChecks(block: ViewBlock, check: (view: Record<string, unknown>) => string[]): void {
  const own = block.validate;
  block.validate = (view) => [...(own ? own(view) : []), ...check(view)];
}

/** Which side of a target is good news, on every view that has a target. */
const GOOD_WHEN_OPTION: OptionSchema = {
  type: "enum",
  values: ["up", "down"],
  default: "up",
  description: 'Whether more is better ("up", as for revenue) or less is better ("down", as for wait times and costs). It decides which side of the target reads as met.',
};

const table: ViewBlock = {
  type: "table",
  description: "Rows and columns. The default view, and the one to use when people need exact values.",
  options: {
    columns: { type: "fields", description: "Fields to show, in order. Defaults to every field in the rows." },
    sortable: { type: "boolean", default: true, description: "Headers become buttons that sort the rows: ascending, then descending. Missing values stay last." },
    totals: { type: "boolean", default: false, description: "Adds a footer row summing each number column in its own format, over every row whatever the page or search shows. Percent columns stay blank, since summed shares mean nothing." },
    search: { type: "boolean", default: false, description: "A small search field above the table: typing keeps only the rows whose shown text matches, in any column, and says how many remain. For directories and long lists." },
    pageSize: { type: "number", description: "Rows shown at a time, with Previous and Next under the table (hidden while the rows fit on one page). Sorting or searching goes back to the first page. Leave out for the first 100 rows and a Show more button." },
    showAll: { type: "boolean", default: false, description: "Draws every row at once. By default a table without pages shows its first 100 rows and a Show more button that adds 100 at a time." },
    stickyFirst: { type: "boolean", default: false, description: "Keeps the first column in place while a wide table scrolls sideways, so every row keeps its name in view." },
    align: { type: "object", description: 'Text alignment per column, overriding the default of numbers right and text left: { "status": "center" }. Values: left, center, right.' },
  },
  validate(view) {
    const problems: string[] = [];
    if (view.pageSize !== undefined && !(typeof view.pageSize === "number" && Number.isInteger(view.pageSize) && view.pageSize >= 1)) problems.push("pageSize must be a whole number, 1 or more, for example 10.");
    if (view.align !== undefined) {
      const align = view.align;
      if (!align || typeof align !== "object" || Array.isArray(align)) problems.push('align must map columns to left, center or right, for example { "status": "center" }.');
      else for (const [field, value] of Object.entries(align)) if (!ALIGNMENTS.includes(String(value))) problems.push(`align.${field} must be left, center or right, not ${JSON.stringify(value)}.`);
    }
    return problems;
  },
};

const list: ViewBlock = {
  type: "list",
  description: "A stacked list: one line per row with a label, optional detail underneath, and an optional value on the right.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field for the main text of each item." },
    detail: { type: "field", kind: "category", description: "Field for the smaller line under the label." },
    value: { type: "field", kind: "number", description: "Field for the number on the right." },
  },
};

const kpi: ViewBlock = {
  type: "kpi",
  description: "One headline number with its change against a comparison. Reads the first row, or with series the last row, plus a sparkline.",
  options: {
    value: { type: "field", kind: "number", required: true, description: "Field holding the headline number." },
    compare: { type: "field", kind: "number", description: "Field holding the value to compare against, for example last period." },
    compareLabel: { type: "string", description: 'Names the comparison, for example "vs last month".' },
    goodWhen: { type: "enum", values: ["up", "down"], default: "up", description: "Whether an increase is good news (revenue) or bad news (costs, churn)." },
    label: { type: "string", description: "Text above the number. Defaults to the value field's label." },
    series: {
      type: "boolean",
      default: false,
      description: "Read the rows as a time series: the headline is the last row, the change is against the row before (unless compare is set), and a sparkline shows every row.",
    },
    x: { type: "field", kind: "date", description: 'With series, the field naming each period, used to label the comparison ("vs Aug 2026").' },
    icon: { type: "enum", values: ICON_NAMES, description: "A line icon on a soft tile beside the number." },
    target: {
      type: "field",
      kind: "number",
      description: "Field holding the target. A line under the number says where the latest stands: a check and Target met, or how far it has to go (with goodWhen down, how far above the target it is).",
    },
    rag: KPI_RAG_OPTION,
  },
  validate: (view) => checkKpiRag(view.rag, "rag"),
};

const kpis: ViewBlock = {
  type: "kpis",
  description: "A row of stat tiles in one widget, each with a label, value and change: the calm way to show a handful of headline numbers. With series, reads the rows as a time series and adds a sparkline per tile.",
  options: {
    items: {
      type: "array",
      required: true,
      description: 'Tiles, each { value, label?, compare?, compareLabel?, goodWhen?, target?, rag? }. compare is a field or "previous" (the row before); target is a field, and the tile then says where it stands (Target met, or how far to go); rag is { green, amber, goodWhen? } and adds a Red, Amber or Green status pill. Example: [{ "value": "revenue", "compare": "previous", "target": "target" }].',
    },
    series: { type: "boolean", default: false, description: "Read the rows as a time series: values from the last row, compared with the row before, plus a sparkline per tile." },
  },
  validate(view) {
    const items = view.items;
    if (!Array.isArray(items)) return [];
    if (items.length === 0) return ["items needs at least one entry."];
    return items.flatMap((item: Partial<KpisItem> | null, i) => {
      if (!item || typeof item.value !== "string" || !item.value) return [`items[${i}] needs a value field.`];
      const problems = item.goodWhen !== undefined && item.goodWhen !== "up" && item.goodWhen !== "down" ? [`items[${i}].goodWhen must be up or down.`] : [];
      return [...problems, ...checkKpiRag(item.rag, `items[${i}].rag`)];
    });
  },
};

/** The forecast fan options, shared by line and area. */
const FORECAST_OPTION = {
  type: "field",
  kind: "category",
  description: "Field that is true on forecast rows. From the last actual on, lines draw dashed in a softly shaded zone labelled Forecast, and the tooltip marks those rows.",
} as const;
const BAND_OPTION = {
  type: "any",
  description:
    'A shaded range behind the first line, for a forecast fan or any low to high spread: { "low": "p10", "high": "p90", "label": "80% range" }. Give the last actual row low and high equal to its value, so the fan opens from it. The ends are labelled and the tooltip gives the range.',
} as const;

/** The curve option shared by line and area: the texture of the line between its points. */
const CURVE_OPTION = {
  type: "enum",
  values: ["linear", "smooth", "step"],
  default: "linear",
  description:
    '"smooth" curves through every point without ever swinging past one (a monotone curve), for a soft, calm trend; "step" holds each value until halfway to the next, for amounts that change in jumps such as prices or headcount. Stacked and stream areas keep their own shapes.',
} as const;

/** The notes option shared by bar, line and area: short texts pinned to points of the chart. */
const ANNOTATIONS_OPTION: OptionSchema = {
  type: "array",
  description:
    'Short notes pinned to points of the chart, each { "x": <category or period>, "y"?: <value>, "text": "…" }. Without y the note sits on the value there. Each note is a few words beside a small dot, with a thin leader to it; on a narrow card the notes become numbered markers with the texts listed under the chart. Example: [{ "x": "2026-03", "text": "Price rise" }].',
};

/** Each note needs an x and a text; y, when given, is a number. */
function checkAnnotations(view: Record<string, unknown>): string[] {
  const notes = view.annotations;
  if (notes === undefined) return [];
  if (!Array.isArray(notes)) return ['annotations must be a list of notes, for example [{ "x": "2026-03", "text": "Price rise" }].'];
  return notes.flatMap((note, i) => {
    const n = (note ?? {}) as Partial<Annotation>;
    const problems: string[] = [];
    if (n.x === undefined || n.x === null || n.x === "") problems.push(`annotations[${i}] needs an x: the category or period the note points at.`);
    if (typeof n.text !== "string" || !n.text.trim()) problems.push(`annotations[${i}] needs a text.`);
    if (n.y !== undefined && typeof n.y !== "number") problems.push(`annotations[${i}].y must be a number.`);
    return problems;
  });
}

/** The band must name its low and high fields. */
function checkBand(view: Record<string, unknown>): string[] {
  const band = view.band as Record<string, unknown> | undefined;
  return band === undefined || (typeof band === "object" && band !== null && typeof band.low === "string" && typeof band.high === "string")
    ? []
    : ['band needs low and high fields, for example { "low": "p10", "high": "p90", "label": "80% range" }.'];
}

const area: ViewBlock = {
  type: "area",
  extent: seriesExtent,
  description:
    "A line with a soft filled area down to zero, for a trend where the amount itself matters. Best with one or two series, or stacked: composition over time, each series a band on top of the ones before. As a stream, the bands flow around a center line, for how a mix shifts over time.",
  options: {
    x: { type: "field", kind: "date", required: true, description: "Field for the ordered axis, usually a date or period." },
    y: { type: "fields", kind: "number", required: true, description: "Field or fields for the values. Each field is one series." },
    stacked: {
      type: "any",
      default: false,
      description:
        'true stacks the series as bands, each on top of the ones before, so the top edge is the total; "percent" stacks them as shares of 100%; "stream" is a streamgraph: smooth bands centered on a middle line, each named inside itself, with no value axis since only thickness carries meaning (the tooltip has the numbers). Negative values count as zero.',
    },
    highlight: highlightSeries,
    endLabels: { type: "boolean", default: true, description: "Write each series' last value at its end, for up to 4 series. Hidden automatically when two ends would collide." },
    reference: REFERENCE_OPTION,
    forecast: { ...FORECAST_OPTION, description: `${FORECAST_OPTION.description} On an area the forecast's wash is fainter too. Unstacked areas only.` },
    band: BAND_OPTION,
    curve: CURVE_OPTION,
    annotations: ANNOTATIONS_OPTION,
  },
  validate(view) {
    const stacked = view.stacked;
    const problems = stacked === undefined || stacked === true || stacked === false || stacked === "percent" || stacked === "stream" ? [] : ['stacked must be true, false, "percent" or "stream".'];
    if (stacked && (view.forecast !== undefined || view.band !== undefined)) problems.push("forecast and band draw on an unstacked area: drop stacked, or use a line.");
    return [...problems, ...checkBand(view), ...checkReference(view), ...checkAnnotations(view)];
  },
};

const meter: ViewBlock = {
  type: "meter",
  extent: (view, rows) => numbersOf(rows, [view.value, view.target]),
  description: "Progress against a target, one meter per row: attainment as a percentage, a bar that fills to the target, and where it stands in plain words: a check and Target met, or how far it has to go (€22K to go).",
  options: {
    value: { type: "field", kind: "number", required: true, description: "Field holding the current amount." },
    target: { type: "field", kind: "number", required: true, description: "Field holding the target amount." },
    label: { type: "field", kind: "category", description: "Field naming each meter, for example a region. Defaults to the value field's label." },
    goodWhen: GOOD_WHEN_OPTION,
  },
};

const waterfall: ViewBlock = {
  type: "waterfall",
  extent: waterfallExtent,
  description: "A bridge: how a total moves to another through increases and decreases, each floating from the running total, with totals standing on zero.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each step." },
    value: { type: "field", kind: "number", required: true, description: "Field with each step's change, or the amount for total rows." },
    totals: { type: "any", description: 'Labels of rows that are totals (drawn from zero, resetting the running total), for example ["Q2 revenue"].' },
    endLabel: { type: "string", description: 'Adds a final total bar with this label, for example "Q3 revenue".' },
    fit: {
      type: "boolean",
      default: false,
      description: "Fit the axis to the running totals instead of starting at zero, so small changes stay visible. Totals then rise from the axis floor.",
    },
    highlight: highlightCategories,
  },
};

const heatmap: ViewBlock = {
  type: "heatmap",
  extent: (view, rows) => numbersOf(rows, [view.value]),
  description: "A grid of cells shaded on one blue scale from light (low) to dark (high), for patterns across two categories such as weekday by hour.",
  options: {
    x: { type: "field", kind: "category", required: true, description: "Field for the columns." },
    y: { type: "field", kind: "category", required: true, description: "Field for the rows." },
    value: { type: "field", kind: "number", required: true, description: "Field that shades each cell." },
  },
};

const scatter: ViewBlock = {
  type: "scatter",
  extent: (view, rows) => numbersOf(rows, [view.y]),
  description: "One dot per row placed by two numbers, to show how they relate. An optional group field colors the dots, up to 3 groups; an optional size field turns it into a bubble chart.",
  options: {
    x: { type: "field", kind: "number", required: true, description: "Numeric field along the horizontal axis." },
    y: { type: "field", kind: "number", required: true, description: "Numeric field along the vertical axis." },
    size: { type: "field", kind: "number", description: "Field sizing each dot by area, making a bubble chart: four times the value, twice the radius. Bigger bubbles are drawn first." },
    color: { type: "field", kind: "category", description: "Field that groups the dots by color. Up to 3 groups stay distinct." },
    label: { type: "field", kind: "category", description: "Field naming each dot in its tooltip." },
    reference: REFERENCE_OPTION,
    cluster: {
      type: "field",
      kind: "category",
      description:
        "Field naming each dot's cluster, such as a segment found by analysis. A soft, rounded hull gathers each cluster's dots and carries its name at the middle, so the areas read as regions of the plot; the dots take the cluster's color unless color is set. Up to 6 clusters.",
    },
    labels: { type: "boolean", default: false, description: "Write each dot's label beside it, skipping names that would land on another, so the standouts are named on the chart itself." },
    quadrants: {
      type: "object",
      description:
        'Splits the plot into four at a value of x and of y, with a faint word in each corner: { "x": 50, "y": 3, "labels": ["Monitor", "Act now", "Prepare", "Watch"] } (top-left first, then clockwise). For priority grids such as pressure against impact.',
    },
    highlight: highlightCategories,
    annotations: ANNOTATIONS_OPTION,
  },
  validate: (view) => [...checkReference(view), ...checkQuadrants(view)],
  checkData(view, rows) {
    const messages: string[] = [];
    if (typeof view.color === "string") {
      const groups = new Set(rows.map((row) => String(row[view.color as string]))).size;
      if (groups > 3) messages.push(`${groups} groups. Only 3 scatter colors stay distinct for colorblind readers: fold the rest into "Other" or split the chart.`);
    }
    if (typeof view.cluster === "string") {
      const clusters = new Set(rows.map((row) => String(row[view.cluster as string]))).size;
      if (clusters > 6) messages.push(`${clusters} clusters. Past 6 the hulls overlap and the colors blur: merge the smallest clusters.`);
    }
    return messages;
  },
};

const bullet: ViewBlock = {
  type: "bullet",
  extent: bulletExtent,
  description: "Actual against target, one compact row per item: a value bar and a target tick over three qualitative bands (poor, fair, good). A met target carries a check by its number; the tooltip says what is left to go. A dense alternative to gauges.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each row." },
    value: { type: "field", kind: "number", required: true, description: "Field with the actual amount." },
    target: { type: "field", kind: "number", required: true, description: "Field with the target amount." },
    ranges: {
      type: "array",
      default: [0.6, 0.9, 1.2],
      description: "Where the three bands end, as multiples of the target: poor up to the first, fair up to the second, good up to the third.",
    },
    unit: { type: "field", kind: "category", description: "Field with each row's unit (%, €, $), for rows that measure different things. A name ending in \"(%)\" does the same." },
    goodWhen: GOOD_WHEN_OPTION,
  },
  validate(view) {
    const ranges = view.ranges;
    if (ranges === undefined) return [];
    const ok = Array.isArray(ranges) && ranges.length === 3 && ranges.every((r, i) => typeof r === "number" && r > 0 && (i === 0 || r > (ranges[i - 1] as number)));
    return ok ? [] : ["ranges must be three increasing positive numbers, for example [0.6, 0.9, 1.2]."];
  },
};

const treemap: ViewBlock = {
  type: "treemap",
  description: "Part-to-whole for many categories: tiles sized by value, kept close to square. Use it where a donut would need more than 6 slices.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each tile." },
    value: { type: "field", kind: "number", required: true, description: "Field sizing each tile. Zero and negative values are left out." },
    group: { type: "field", kind: "category", description: "Field that colors related tiles alike, up to 8 groups. Without it every tile shares one color." },
    highlight: highlightCategories,
  },
  checkData(view, rows) {
    if (typeof view.group !== "string") return [];
    const groups = new Set(rows.map((row) => String(row[view.group as string]))).size;
    return groups > 8 ? [`${groups} groups but only 8 colors, so colors would repeat. Fold small groups into "Other".`] : [];
  },
};

const funnel: ViewBlock = {
  type: "funnel",
  extent: (view, rows) => numbersOf(rows, [view.value]),
  description: "Stages in order as centered bars narrowing from the first, with the conversion rate from each stage to the next and each stage's share of the first.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each stage." },
    value: { type: "field", kind: "number", required: true, description: "Field with how many reached each stage." },
    highlight: highlightCategories,
  },
};

const calendar: ViewBlock = {
  type: "calendar",
  extent: (view, rows) => numbersOf(rows, [view.value]),
  description: "A calendar heatmap: one cell per day, weeks as columns from Monday, shaded on one blue scale. For daily patterns such as sales or tickets across months.",
  options: {
    date: { type: "field", kind: "date", required: true, description: "Field with each day's date, as YYYY-MM-DD or a timestamp." },
    value: { type: "field", kind: "number", required: true, description: "Field that shades each day." },
  },
};

const ridgeline: ViewBlock = {
  type: "ridgeline",
  extent: (view, rows) => numbersOf(rows, [view.value]),
  description: "One smooth distribution curve per group on a shared axis, overlapping like a mountain range: how values spread in each group, for example deal sizes by region.",
  options: {
    value: { type: "field", kind: "number", required: true, description: "Numeric field whose distribution is drawn." },
    group: { type: "field", kind: "category", required: true, description: "Field giving each group its own ridge." },
  },
  checkData(view, rows) {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(String(row[view.group as string]), (counts.get(String(row[view.group as string])) ?? 0) + 1);
    const thin = [...counts].filter(([, n]) => n < 5).map(([name]) => name);
    return thin.length ? [`Groups with fewer than 5 values give unreliable curves: ${thin.join(", ")}. A beeswarm shows every point instead.`] : [];
  },
};

const sankey: ViewBlock = {
  type: "sankey",
  description: "Flows between stages as ribbons as thick as their volume, for example traffic source to landing page to outcome. Each origin's flows keep its color downstream.",
  options: {
    highlight: highlightCategories,
    source: { type: "field", kind: "category", required: true, description: "Field naming where each flow starts." },
    target: { type: "field", kind: "category", required: true, description: "Field naming where each flow ends." },
    value: { type: "field", kind: "number", required: true, description: "Field with each flow's volume." },
  },
  checkData(view, rows) {
    const origins = new Set(rows.map((row) => String(row[view.source as string])));
    for (const row of rows) origins.delete(String(row[view.target as string]));
    return origins.size > 8 ? [`${origins.size} starting points but only 8 colors, so flow colors would repeat. Group small sources into "Other".`] : [];
  },
};

const dumbbell: ViewBlock = {
  type: "dumbbell",
  extent: (view, rows) => numbersOf(rows, [view.from, view.to]),
  description:
    'Before and after per item on one shared axis: a muted dot for before, an accent dot for after, joined by a line (a range plot). With mark "arrow" the line becomes an arrow from the first value to the second (an arrow plot), blue when it rose and red when it fell. For this year against last year, by region.',
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each row." },
    from: { type: "field", kind: "number", required: true, description: "Field with the before value." },
    to: { type: "field", kind: "number", required: true, description: "Field with the after value." },
    mark: {
      type: "enum",
      values: ["range", "arrow"],
      default: "range",
      description:
        '"range" joins the two dots with a plain line, the gap between them. "arrow" points from the from value to the to value, so direction reads at a glance; between two periods a rise takes the up color and a fall the down color, keyed Rose and Fell.',
    },
    highlight: highlightCategories,
    reference: REFERENCE_OPTION,
  },
};

const dot: ViewBlock = {
  type: "dot",
  extent: (view, rows) => fieldList(view.value).flatMap((field) => rows.map((row) => readNumber(row[field]))).filter((n): n is number => n !== null),
  description:
    "A dot plot: one row per item and one dot per measure on one shared axis, with a hairline across each row. Several measures sit side by side in their series colors, so a row's spread and the ranking on any measure both read at once. For scores, rates or prices by item, with far less ink than bars.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each row." },
    value: { type: "fields", kind: "number", required: true, description: "Field or fields placed as dots on the axis. Each field is one series with its own color; one field writes its value beside the dot." },
    highlight: highlightCategories,
    reference: REFERENCE_OPTION,
  },
  checkData(view, rows) {
    const fields = fieldList(view.value);
    const messages: string[] = [];
    if (fields.length > 6) messages.push(`${fields.length} dots per row crowd a dot plot. Keep 6 or fewer measures, or use a table.`);
    if (rows.length > 30) messages.push(`${rows.length} rows. Past 30 the rows get thin and the axis far away: filter or limit to the rows that matter.`);
    return messages;
  },
};

/** One name or a list of names, as a list (the view's fields options take either). */
function fieldList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return value === undefined || value === null ? [] : [String(value)];
}

const slope: ViewBlock = {
  type: "slope",
  extent: (view, rows) => numbersOf(rows, [view.from, view.to]),
  description: "Each item's move between two points in time, as a line from a left column to a right one on one shared scale. Rises and falls take the up and down colors, and the steepest lines are the biggest movers. For rank and change between two periods.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each row." },
    from: { type: "field", kind: "number", required: true, description: "Field with the earlier value (left column)." },
    to: { type: "field", kind: "number", required: true, description: "Field with the later value (right column)." },
    highlight: highlightCategories,
  },
  checkData(_view, rows) {
    return rows.length > 13 ? [`${rows.length} rows crowd a slope chart. Keep the 13 that matter most (limit or filter), or use a dumbbell.`] : [];
  },
};

const bump: ViewBlock = {
  type: "bump",
  description: "Rank over time: in every period the series are ranked by value (highest first), and each series is one smooth line through its ranks, named at both ends. Shows who overtook whom, for example product ranking by month. Takes long data: one row per period and series.",
  options: {
    x: { type: "field", kind: "date", required: true, description: "Field with the period, such as a month. Periods keep the order of the rows." },
    series: { type: "field", kind: "category", required: true, description: "Field naming the series being ranked, such as a product." },
    value: { type: "field", kind: "number", required: true, description: "Field the ranking is by; the highest value ranks 1." },
    highlight: { type: "any", description: 'Series name or names to keep in color; every other series turns grey. Example: "Platform".' },
  },
  checkData(view, rows) {
    const series = new Set(rows.map((row) => String(row[view.series as string])));
    return series.size > 8 ? [`${series.size} series but only 8 colors. Highlight the few that matter, or fold the rest into "Other".`] : [];
  },
};

const marimekko: ViewBlock = {
  type: "marimekko",
  description: "A mosaic: one column per category, as wide as its total, split into segments by each series' share of that column. Shows market size and mix at once, for example revenue by region and product. Takes long data: one row per column and series.",
  options: {
    x: { type: "field", kind: "category", required: true, description: "Field naming each column, such as a region. Columns keep the order of the rows." },
    series: { type: "field", kind: "category", required: true, description: "Field naming the segments inside each column, such as a product." },
    value: { type: "field", kind: "number", required: true, description: "Numeric field sizing the segments; a column's width is the sum of its values." },
  },
  checkData(view, rows) {
    const series = new Set(rows.map((row) => String(row[view.series as string])));
    return series.size > 8 ? [`${series.size} series but only 8 colors. Fold the smallest into "Other".`] : [];
  },
};

const histogram: ViewBlock = {
  type: "histogram",
  extent: histogramExtent,
  description: "A distribution as touching bars: the value's range is cut into bins on round edges, and each bar counts the rows in its bin. A dashed line marks the median. For how deal sizes, order values or response times spread.",
  options: {
    value: { type: "field", kind: "number", required: true, description: "Numeric field to bin." },
    bins: { type: "number", description: "About how many bins to use; edges snap to round numbers, so the exact count can differ. Defaults to Sturges' rule (1 + log2 of the row count)." },
    median: { type: "boolean", default: true, description: "Draw a dashed line at the median." },
    countLabel: { type: "string", default: "Count", description: 'Name for the counts in the tooltip, for example "Deals".' },
    reference: REFERENCE_OPTION,
  },
  checkData(view, rows) {
    const n = rows.filter((row) => readNumber(row[view.value as string]) !== null).length;
    return n < 5 ? [`Only ${n} values: too few for a histogram. A beeswarm or table shows each one.`] : [];
  },
};

const rings: ViewBlock = {
  type: "rings",
  description: "Concentric progress rings, one per row from the outside in, each filled to its share of target; past the target a second lap shows how far over. A legend gives each attainment and where it stands: a check and Target met, or how far it has to go. For a few goals at a glance, up to 5.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each goal." },
    value: { type: "field", kind: "number", required: true, description: "Field with the amount reached." },
    target: { type: "field", kind: "number", required: true, description: "Field with the goal amount." },
    goodWhen: GOOD_WHEN_OPTION,
  },
  checkData(_view, rows) {
    return rows.length > 5 ? [`${rows.length} rings: inner rings get too small past 5. Use a meter or bullet view for longer lists.`] : [];
  },
};

const timeline: ViewBlock = {
  type: "timeline",
  description: "A Gantt-style timeline: one row per task with a bar from its start to its end date, a diamond for milestones (no end), month ticks along the top and an optional today line. For project plans, launches and contracts.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each task." },
    start: { type: "field", kind: "date", required: true, description: "Field with each task's start date, as YYYY-MM-DD or a timestamp." },
    end: { type: "field", kind: "date", description: "Field with each task's end date. A row without one is drawn as a milestone." },
    group: { type: "field", kind: "category", description: "Field that colors tasks by team or phase, up to 8 groups." },
    progress: { type: "field", kind: "number", description: "Field with each task's share done, from 0 to 1 (values above 1 are read as percentages). Fills the bar that far and labels it after the bar." },
    today: { type: "any", description: 'true for a line at today\'s date, or a YYYY-MM-DD date for the line. Shown only when it falls inside the plan.' },
  },
  checkData(view, rows) {
    const late = rows.filter((row) => {
      const from = timeOf(row[view.start as string]);
      const to = view.end ? timeOf(row[view.end as string]) : null;
      return from !== null && to !== null && to < from;
    });
    if (late.length === 0) return [];
    const names = late.map((row) => String(row[view.label as string])).join(", ");
    return [late.length === 1 ? `1 task ends before it starts: ${names}.` : `${late.length} tasks end before they start: ${names}.`];
  },
};

const waffle: ViewBlock = {
  type: "waffle",
  description: "Part to whole as a 10 by 10 grid where each square is one percent, filled category by category in reading order, with a legend of values and shares. Easier to count than a pie. With total, the share of a whole: 62 of 100 squares filled.",
  options: {
    highlight: highlightCategories,
    label: { type: "field", kind: "category", required: true, description: "Field naming each category." },
    value: { type: "field", kind: "number", required: true, description: "Field with each category's amount. Zero and negative values are left out." },
    total: { type: "number", description: "The whole the values are part of, when they do not add up to it; the rest of the grid stays empty. Example: 100 for percentages." },
  },
  checkData(view, rows) {
    return rows.length > 8 ? [`${rows.length} categories but only 8 colors. Fold the smallest into "Other".`] : [];
  },
};

const variance: ViewBlock = {
  type: "variance",
  extent: varianceExtent,
  description: "Variance against plan, as in financial reporting: per row a bar from a zero line to actual minus plan, right when over and left when under, colored good or bad and labelled with its sign. For budget against actual, or results against target.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each row, such as a department." },
    value: { type: "field", kind: "number", required: true, description: "Field with the actual amount." },
    target: { type: "field", kind: "number", required: true, description: "Field with the plan, budget or target." },
    percent: { type: "boolean", default: false, description: "Show the variance as a share of plan (+8%) instead of an amount." },
    goodWhen: { type: "enum", values: ["up", "down"], default: "up", description: 'Whether being over plan is good ("up", as for revenue) or bad ("down", as for costs).' },
  },
};

const gauge: ViewBlock = {
  type: "gauge",
  description: "One headline number on a half-circle scale: an arc filled from min to the value, a tick at the target, the number large inside the arc and the scale's ends below; with a target, a line under the arc says where it stands (Target met, or how far to go). Reads the first row. For a single KPI with a known range, such as NPS or utilization.",
  options: {
    value: { type: "field", kind: "number", required: true, description: "Field holding the number." },
    target: { type: "field", kind: "number", description: "Field holding the target, marked with a tick." },
    min: { type: "number", default: 0, description: "Start of the scale." },
    max: { type: "number", description: "End of the scale. Defaults to a round number above the value and the target." },
    label: { type: "string", description: "Caption under the number. Defaults to the value field's label." },
    goodWhen: GOOD_WHEN_OPTION,
  },
};

const pareto: ViewBlock = {
  type: "pareto",
  description: "The 80/20 view: categories sorted largest first as bars of their share of the total, a line through the running total, and a dashed line at the threshold. Bars up to the crossing (the vital few) stay in color. One percent axis, no second scale. For causes of tickets, defects or churn.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each category." },
    value: { type: "field", kind: "number", required: true, description: "Field with each category's count or amount. Zero and negative values are left out." },
    threshold: { type: "number", default: 0.8, description: "Running-total share that marks the vital few, from 0 to 1." },
  },
  validate(view) {
    const t = view.threshold;
    return t === undefined || (typeof t === "number" && t > 0 && t <= 1) ? [] : ["threshold must be a share between 0 and 1, such as 0.8."];
  },
};

const boxplot: ViewBlock = {
  type: "boxplot",
  extent: (view, rows) => numbersOf(rows, [view.value]),
  description: "A box plot per group on one shared axis: a box over the middle half of the values (first to third quartile), a line at the median, whiskers to the furthest values within 1.5 box-widths, and dots for outliers beyond. For comparing spreads compactly, such as deal size by region.",
  options: {
    value: { type: "field", kind: "number", required: true, description: "Numeric field whose spread is drawn." },
    group: { type: "field", kind: "category", description: "Field giving each group its own box. Without it, all rows make one box." },
    reference: REFERENCE_OPTION,
  },
  checkData(view, rows) {
    if (!view.group) return [];
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(String(row[view.group as string]), (counts.get(String(row[view.group as string])) ?? 0) + 1);
    const thin = [...counts].filter(([, n]) => n < 5).map(([name]) => name);
    return thin.length ? [`Groups with fewer than 5 values give shaky quartiles: ${thin.join(", ")}. A beeswarm shows every point instead.`] : [];
  },
};

const likert: ViewBlock = {
  type: "likert",
  description: "Survey answers as diverging stacked bars: one bar per question, its responses in order from one pole to the other, centered on the neutral middle so disagreement grows left and agreement right. Shares disagreeing and agreeing are written at each end. Takes one row per question with a count field per response.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field with each question." },
    value: { type: "fields", kind: "number", required: true, description: 'Count fields for the responses, in order from the negative pole to the positive, for example ["strongly_disagree", "disagree", "neutral", "agree", "strongly_agree"]. An odd count puts the middle one at the center.' },
  },
  validate(view) {
    const responses = view.value;
    return Array.isArray(responses) && responses.length < 2 ? ["value needs at least two response fields, from one pole to the other."] : [];
  },
};

const candlestick: ViewBlock = {
  type: "candlestick",
  extent: (view, rows) => numbersOf(rows, [view.low, view.high]),
  description: "Prices per period as candles: a thin wick from low to high around a body from open to close, in the up color when the period closed higher and the down color when lower. An optional moving average of the close smooths the trend. For share prices, exchange rates and commodities.",
  options: {
    x: { type: "field", kind: "date", required: true, description: "Field with the period, such as a trading day." },
    open: { type: "field", kind: "number", required: true, description: "Field with the opening price." },
    high: { type: "field", kind: "number", required: true, description: "Field with the highest price." },
    low: { type: "field", kind: "number", required: true, description: "Field with the lowest price." },
    close: { type: "field", kind: "number", required: true, description: "Field with the closing price." },
    average: { type: "number", description: "Periods in a moving average of the close, drawn as a line; for example 5 for a trading week." },
  },
  checkData(view, rows) {
    const value = (row: Row, key: string) => readNumber(row[view[key] as string]);
    const broken = rows.filter((row) => {
      const o = value(row, "open");
      const h = value(row, "high");
      const l = value(row, "low");
      const c = value(row, "close");
      return o !== null && h !== null && l !== null && c !== null && (h < Math.max(o, c) || l > Math.min(o, c));
    });
    if (broken.length === 0) return [];
    const names = broken.map((row) => String(row[view.x as string])).join(", ");
    return [`${broken.length === 1 ? "1 row has" : `${broken.length} rows have`} a high below its open or close, or a low above them: ${names}.`];
  },
};

const sunburst: ViewBlock = {
  type: "sunburst",
  description: "A hierarchy as rings: the inner ring splits the total by the first level, each outer ring splits its parent's slice by the next level, in lighter tints of the parent's color. The total sits in the middle. For two or three levels of part-to-whole, such as revenue by product and region.",
  options: {
    highlight: highlightCategories,
    levels: { type: "fields", kind: "category", required: true, description: 'Fields from the top level down, one ring each, for example ["product", "region"]. Up to 3.' },
    value: { type: "field", kind: "number", required: true, description: "Field sizing the slices. Zero and negative values are left out." },
    caption: { type: "string", description: "Text under the total in the middle. Defaults to the value field's label." },
  },
  validate(view) {
    const levels = view.levels;
    return Array.isArray(levels) && levels.length > 3 ? ["levels takes at most 3 fields; deeper rings get too thin to read."] : [];
  },
  checkData(view, rows) {
    const top = Array.isArray(view.levels) ? String(view.levels[0]) : String(view.levels);
    const count = new Set(rows.map((row) => String(row[top]))).size;
    return count > 8 ? [`${count} top-level values but only 8 colors. Fold the smallest into "Other".`] : [];
  },
};

const icicle: ViewBlock = {
  type: "icicle",
  description:
    "A hierarchy laid flat: a column for the total, then one per level left to right, each child splitting its parent's height by value, in lighter tints of its family's color. Rectangles compare and label more easily than rings, so it takes deeper hierarchies than the sunburst. Pointing at a cell lights its family and gives its share of each level.",
  options: {
    highlight: highlightCategories,
    levels: { type: "fields", kind: "category", required: true, description: 'Fields from the top level down, one column each, for example ["region", "product", "plan"]. Up to 4.' },
    value: { type: "field", kind: "number", required: true, description: "Field sizing the cells. Zero and negative values are left out." },
  },
  validate(view) {
    const levels = view.levels;
    return Array.isArray(levels) && levels.length > 4 ? ["levels takes at most 4 fields; deeper columns get too narrow to read."] : [];
  },
  checkData(view, rows) {
    const top = Array.isArray(view.levels) ? String(view.levels[0]) : String(view.levels);
    const count = new Set(rows.map((row) => String(row[top]))).size;
    return count > 8 ? [`${count} top-level values but only 8 colors. Fold the smallest into "Other".`] : [];
  },
};

const chord: ViewBlock = {
  type: "chord",
  description: "Flows between groups around a circle: each group an arc as long as everything it sends and receives, each flow a ribbon from its sender to its receiver, in the sender's color. For exchanges within one set, such as customers moving between plans or staff moving between teams.",
  options: {
    highlight: highlightCategories,
    source: { type: "field", kind: "category", required: true, description: "Field naming where each flow comes from." },
    target: { type: "field", kind: "category", required: true, description: "Field naming where each flow goes." },
    value: { type: "field", kind: "number", required: true, description: "Field with each flow's size." },
  },
  checkData(view, rows) {
    const groups = new Set(rows.flatMap((row) => [String(row[view.source as string]), String(row[view.target as string])]));
    return groups.size > 8 ? [`${groups.size} groups but only 8 colors. Fold the smallest into "Other".`] : [];
  },
};

const radar: ViewBlock = {
  type: "radar",
  extent: (view, rows) => [...numbersOf(rows, Array.isArray(view.y) ? view.y : [view.y]), ...(typeof view.max === "number" ? [view.max] : [])],
  description: "Profiles across several attributes: one spoke per row, rings for one shared scale from zero, and a soft shape per series. For comparing up to 3 profiles, such as a product against the market on speed, price and support.",
  options: {
    highlight: highlightCategories,
    label: { type: "field", kind: "category", required: true, description: "Field naming each spoke, such as an attribute." },
    y: { type: "fields", kind: "number", required: true, description: "Field or fields with the scores; each field is one shape. Up to 3 stay readable." },
    max: { type: "number", description: "End of the scale. Defaults to a round number at or above the highest score." },
  },
  checkData(view, rows) {
    const series = Array.isArray(view.y) ? view.y.length : 1;
    const out: string[] = [];
    if (rows.length < 3) out.push(`A radar needs at least 3 axes to make a shape; with ${rows.length}, use a bar chart.`);
    if (series > 3) out.push(`${series} series overlap into a tangle on a radar; keep 3 or fewer, or use small multiples.`);
    return out;
  },
};

const beeswarm: ViewBlock = {
  type: "beeswarm",
  extent: (view, rows) => numbersOf(rows, [view.value]),
  description: "A distribution: one dot per row along a value axis, nudged apart so none overlap, optionally one row per group. Shows spread and outliers an average hides.",
  options: {
    value: { type: "field", kind: "number", required: true, description: "Numeric field along the axis." },
    group: { type: "field", kind: "category", description: "Field giving each group its own labelled row." },
    label: { type: "field", kind: "category", description: "Field naming each dot in its tooltip." },
  },
};

const donut: ViewBlock = {
  type: "donut",
  categories: (view) => String(view.label),
  description: "Part-to-whole at a glance: a ring of up to 6 slices with the total in the middle and a legend of values and shares. Compare close values with a bar chart instead.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each slice." },
    value: { type: "field", kind: "number", required: true, description: "Field with each slice's amount. Zero, negative and missing values are left out." },
    caption: { type: "string", description: "Text under the total in the middle. Defaults to the value field's label, or to \"seats\" when the value field is seats." },
    arc: {
      type: "enum",
      values: ["full", "half"],
      default: "full",
      description: '"half" draws a semicircle open at the bottom with the slices from left to right in the order given: an election donut, seats by party in the order they sit.',
    },
    majority: { type: "boolean", default: false, description: "On a half ring, a thin tick at the halfway point labelled Majority and the seats it takes (more than half of the total); the slice that crosses it says so in its tooltip." },
    highlight: highlightCategories,
  },
  validate(view) {
    return view.majority && view.arc !== "half" ? ['majority marks a half ring: set arc to "half" too.'] : [];
  },
  checkData(view, rows) {
    return checkSlices(view, rows, "donut");
  },
};

/** Slices a donut or pie can draw, and what it warns about: past 6 they get hard to compare, and rows with no positive value are left out. */
function checkSlices(view: Record<string, unknown>, rows: Row[], noun: string): string[] {
  const kept = rows.filter((row) => {
    const v = readNumber(row[view.value as string]);
    return v !== null && v > 0;
  }).length;
  const messages: string[] = [];
  if (kept > 6) messages.push(`${kept} slices. Past 6 they get hard to compare: fold the smallest into "Other", or use a bar chart.`);
  if (kept < rows.length) messages.push(`${rows.length - kept} rows with zero, negative or missing values are left out of the ${noun}.`);
  return messages;
}

const pie: ViewBlock = {
  type: "pie",
  categories: (view) => String(view.label),
  description: "Part-to-whole as a full disc: up to 6 slices from twelve o'clock clockwise, each wide in proportion to its share, with the shares written on the slices and a legend of values. Use a donut when the total matters too, and a bar chart to compare close shares.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each slice." },
    value: { type: "field", kind: "number", required: true, description: "Field with each slice's amount. Zero, negative and missing values are left out." },
    labelPlace: {
      type: "enum",
      values: ["inside", "outside", "legend"],
      default: "inside",
      description: '"inside" writes each share on its slice (thin slices skip theirs) with a legend of names and values; "outside" writes names and shares beside the disc on short leader lines, with no legend; "legend" leaves the disc bare.',
    },
    highlight: highlightCategories,
  },
  checkData(view, rows) {
    return checkSlices(view, rows, "pie");
  },
};

const bar: ViewBlock = {
  type: "bar",
  extent: seriesExtent,
  description: "Vertical bars comparing amounts across categories. Several y fields draw grouped bars.",
  options: {
    x: { type: "field", kind: "category", required: true, description: "Field for the categories along the horizontal axis." },
    y: { type: "fields", kind: "number", required: true, description: "Field or fields for bar heights. Each field is one series." },
    lines: {
      type: "fields",
      kind: "number",
      description: "Field or fields drawn as lines over the bars, on the same axis, for example a target. Never a second axis. Under one target line (a field named target, plan, goal, budget or quota), bars on the wrong side of it (see goodWhen) are drawn outlined and keyed Below target.",
    },
    stacked: {
      type: "any",
      default: false,
      description: 'true stacks the series into one column per category (part-to-whole); "percent" stacks them as shares of 100%.',
    },
    highlight: highlightCategories,
    reference: REFERENCE_OPTION,
    mark: MARK_OPTION,
    goodWhen: {
      type: "enum",
      values: ["up", "down"],
      default: "up",
      description: 'Which side of a target is good news: "up" for revenue, "down" for wait times and costs. Under one target (a lines field or a reference line labeled target, plan, goal, budget or quota), a bar on the wrong side is drawn outlined and keyed Below or Over the target.',
    },
    compare: {
      type: "field",
      kind: "number",
      description: "Field drawn as a wider, quieter column behind each bar, on the same axis, for a comparison such as last year or the plan. The key names it by its label and the tooltip gives its value. One y series, unstacked.",
    },
    annotations: ANNOTATIONS_OPTION,
  },
  validate(view) {
    const stacked = view.stacked;
    const problems = stacked === undefined || stacked === true || stacked === false || stacked === "percent" ? [] : ['stacked must be true, false or "percent".'];
    if (view.mark === "lollipop" && stacked) problems.push("A lollipop shows one dot per value, so it cannot stack: drop stacked, or use bars.");
    if (view.compare !== undefined && (stacked || (Array.isArray(view.y) && view.y.length > 1))) problems.push("compare draws behind one series of plain bars: drop stacked, or keep one y field.");
    return [...problems, ...checkReference(view), ...checkAnnotations(view)];
  },
};

/** Values an hbar's scale must cover: every value, or the row sums when stacked (0 to 1 for percent stacks). */
function hbarExtent(view: Record<string, unknown>, rows: Row[]): number[] {
  const fields = Array.isArray(view.value) ? view.value.map(String) : [String(view.value)];
  if (view.stacked === "percent") return [0, 1];
  if (view.stacked === true) return rows.map((row) => fields.reduce((sum, f) => sum + Math.max(0, readNumber(row[f]) ?? 0), 0));
  return rows.flatMap((row) => fields.map((f) => readNumber(row[f]))).filter((n): n is number => n !== null);
}

const hbar: ViewBlock = {
  type: "hbar",
  extent: hbarExtent,
  description:
    "Horizontal bars for rankings and long labels: label on the left, bar, value at the end. Sort the rows first for a ranking. Several value fields draw grouped bars, one thin bar per field in each row; stacked joins them into one bar per row, and split gives each field its own column of bars.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each bar." },
    value: { type: "fields", kind: "number", required: true, description: "Field or fields with each bar's amount. Bars start at zero. Several fields draw one bar per field in each row (grouped), stacked into one bar with stacked, or in separate columns with split." },
    stacked: {
      type: "any",
      default: false,
      description: 'With several value fields: true stacks them into one bar per row, its total at the end (part-to-whole); "percent" stacks them as shares of 100%.',
    },
    split: {
      type: "boolean",
      default: false,
      description: "With several value fields: one small column of bars per field, side by side, the label written once on the left and each column headed by its field. Each column has its own scale, so measures in different units sit together.",
    },
    shared: { type: "boolean", default: false, description: "Split columns share one scale, so a bar compares across columns too. Only for fields in the same unit." },
    highlight: highlightCategories,
    mark: MARK_OPTION,
    reference: REFERENCE_OPTION,
  },
  validate(view) {
    const stacked = view.stacked;
    const problems = stacked === undefined || stacked === true || stacked === false || stacked === "percent" ? [] : ['stacked must be true, false or "percent".'];
    if (view.split && stacked) problems.push("Split bars give each field its own column, so they cannot stack: drop split, or drop stacked.");
    if (view.mark === "lollipop" && Array.isArray(view.value) && view.value.length > 1) problems.push("A lollipop draws one dot per row: give value one field, or use bars for several.");
    return problems;
  },
};

const pyramid: ViewBlock = {
  type: "pyramid",
  extent: (view, rows) => rows.flatMap((row) => [readNumber(row[view.left as string]), readNumber(row[view.right as string])]).filter((n): n is number => n !== null),
  description:
    "A population pyramid: one row per band (an age group, a tenure band), with two counts as bars growing out from a center axis on one shared scale, the left count leftward and the right count rightward. The shape says where the two sides differ. Rows draw in the order given, top to bottom.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each band, in order from top to bottom, such as the age group." },
    left: { type: "field", kind: "number", required: true, description: "Field with the count drawn leftward, such as women." },
    right: { type: "field", kind: "number", required: true, description: "Field with the count drawn rightward, such as men." },
    highlight: highlightCategories,
  },
  checkData(view, rows) {
    const negative = rows.filter((row) => (readNumber(row[view.left as string]) ?? 0) < 0 || (readNumber(row[view.right as string]) ?? 0) < 0).length;
    const out: string[] = [];
    if (negative) out.push(`${negative} rows have negative counts; a pyramid draws sizes, so they are drawn as zero.`);
    if (rows.length > 30) out.push(`${rows.length} bands crowd a pyramid; group them into 30 or fewer.`);
    return out;
  },
};

const line: ViewBlock = {
  type: "line",
  extent: seriesExtent,
  description: "Lines showing change over an ordered axis, usually time. Several y fields draw several lines.",
  options: {
    x: { type: "field", kind: "date", required: true, description: "Field for the ordered axis, usually a date or period." },
    y: { type: "fields", kind: "number", required: true, description: "Field or fields for line values. Each field is one series." },
    highlight: highlightSeries,
    endLabels: { type: "boolean", default: true, description: "Write each series' last value at its end, for up to 4 series. Hidden automatically when two ends would collide." },
    reference: REFERENCE_OPTION,
    forecast: FORECAST_OPTION,
    band: BAND_OPTION,
    curve: CURVE_OPTION,
    points: { type: "boolean", default: false, description: "A small symbol at every data point, in the line's color, so each reading is a mark of its own. Left out where points would sit closer than 8px." },
    peaks: {
      type: "boolean",
      default: false,
      description: "Marks the first series' highest and lowest points with a dot and writes their values beside them, clear of the end label.",
    },
    scale: {
      type: "enum",
      values: ["linear", "log"],
      default: "linear",
      description: '"log" draws the value axis logarithmically, ticks at powers of ten (with 2 and 5 steps when it spans little), so steady growth reads as a straight line and small and large series share one chart. Positive values only: others are left out.',
    },
    annotations: ANNOTATIONS_OPTION,
  },
  validate(view) {
    return [...checkBand(view), ...checkReference(view), ...checkAnnotations(view)];
  },
  checkData(view, rows) {
    if (view.scale !== "log") return [];
    const fields = Array.isArray(view.y) ? view.y.map(String) : [String(view.y)];
    const bad = rows.filter((row) => fields.some((f) => (readNumber(row[f]) ?? 1) <= 0)).length;
    return bad ? [`${bad} rows have a zero or negative value, which a log scale cannot place; they are left out.`] : [];
  },
};

const dual: ViewBlock = {
  type: "dual",
  description:
    "Two measures with different units, such as revenue and churn, one above the other on two panels that share one time axis, each on its own scale. The honest form of a dual-axis chart: a second axis invites false crossings, where two lines meet only because of how the axes were drawn; two panels let the reader compare the shapes and read each value against its own axis. Pointing at a period lights it up on both panels.",
  options: {
    x: { type: "field", kind: "date", required: true, description: "Field for the shared axis, usually a date or period." },
    y: { type: "field", kind: "number", required: true, description: "Measure on the top panel." },
    y2: { type: "field", kind: "number", required: true, description: "Measure on the bottom panel, in its own unit." },
    panels: {
      type: "array",
      values: ["bar", "line"],
      itemLabels: ["Top panel", "Bottom panel"],
      default: ["bar", "line"],
      description: 'How each panel draws its measure, top then bottom: "bar" for amounts (from zero) or "line" for rates and levels. Example: ["bar", "line"].',
    },
    curve: CURVE_OPTION,
    annotations: ANNOTATIONS_OPTION,
  },
  validate(view) {
    const panels = view.panels;
    const ok = panels === undefined || (Array.isArray(panels) && panels.length === 2 && panels.every((m) => m === "bar" || m === "line"));
    const problems = ok ? [] : ['panels must be two of "bar" or "line", top then bottom, for example ["bar", "line"].'];
    if (typeof view.y === "string" && view.y === view.y2) problems.push("y and y2 are the same field: a dual draws two different measures.");
    return problems;
  },
  checkData(_view, rows) {
    return rows.length < 2 ? [`A dual needs at least 2 periods to show two shapes; with ${rows.length}, show the numbers instead.`] : [];
  },
};

const horizon: ViewBlock = {
  type: "horizon",
  extent: (view, rows) => [...numbersOf(rows, Array.isArray(view.y) ? view.y : [view.y]), ...(typeof view.baseline === "number" ? [view.baseline] : [])],
  description:
    "Many time series at once, each in a thin row: values are measured from a baseline and folded into bands of deepening color, blue above and red below, so a dozen series fit where one line chart would. For spotting which series run hot or cold, and when. Pointing at a period lists every series there.",
  options: {
    x: { type: "field", kind: "date", required: true, description: "Field for the ordered axis, usually a date." },
    y: { type: "fields", kind: "number", required: true, description: "Field or fields, one row each, such as a region's revenue against plan." },
    bands: { type: "number", default: 3, description: "How many shades each side folds into, 1 to 5. More bands pack more range into a row but read less exactly." },
    baseline: { type: "number", default: 0, description: "The value rows are measured from, such as 0 for a difference or the plan for a raw amount." },
    baselineLabel: {
      type: "string",
      description: 'What the baseline stands for, in a word or two, such as "plan" or "target". The key then reads "Above plan, rising", pointing at a day says "€6.5K above plan", and the guide counts the days above it.',
    },
  },
  validate(view) {
    const bands = view.bands;
    return bands === undefined || (Number.isInteger(bands) && (bands as number) >= 1 && (bands as number) <= 5) ? [] : ["bands must be a whole number from 1 to 5."];
  },
  checkData(_view, rows) {
    return rows.length < 2 ? [`A horizon needs at least 2 periods to draw a shape; with ${rows.length}, show the number instead.`] : [];
  },
};

const rose: ViewBlock = {
  type: "rose",
  extent: (view, rows) => [...numbersOf(rows, Array.isArray(view.y) ? view.y : [view.y]), ...(typeof view.max === "number" ? [view.max] : [])],
  description:
    "A polar area chart (a Nightingale rose) for a cycle that wraps round, such as hours of the day or months of the year: one equal wedge per row, clockwise from twelve o'clock, its area true to its value. Several fields stack outward, each ring adding its own area. For plain ranking, a bar chart reads more exactly.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each wedge, in cycle order, such as the hour or the month." },
    y: { type: "fields", kind: "number", required: true, description: "Field or fields with the values; each field is one ring of the stack. Up to 4 stay readable." },
    max: { type: "number", description: "Total the outer ring stands for. Defaults to a round number at or above the largest wedge." },
  },
  checkData(view, rows) {
    const series = Array.isArray(view.y) ? view.y.length : 1;
    const out: string[] = [];
    if (rows.length < 3) out.push(`A rose needs at least 3 wedges to read as a cycle; with ${rows.length}, use a bar chart.`);
    if (series > 4) out.push(`${series} rings crowd a rose; keep 4 or fewer, or use small multiples.`);
    return out;
  },
};

/** What the map views accept as geometry: a built-in basemap's name, an inline GeoJSON FeatureCollection, or its address. */
export type GeoOption = string | GeoCollection;

/** `{ type: "choropleth", geo, id, value, key?, codes?, min?, max? }`: regions shaded by a value. */
export interface ChoroplethView {
  type: "choropleth";
  geo: GeoOption;
  id: string;
  /** The number that shades each region, on the sequential scale. One of value and category. */
  value?: string;
  /** The category that colors each region, one series color per value, with a key. One of value and category. */
  category?: string;
  key?: string;
  /** Write each region's code inside it, where it fits. Default true. */
  codes?: boolean;
  min?: number;
  max?: number;
  /** The same measure in the previous period: the tooltip gives the change, and `show: "change"` shades by it. */
  previous?: string;
  /** What the shade says: the value (the default) or its change since `previous`, on a diverging scale. */
  show?: "value" | "change";
  /** How a change is told: as a percent of the previous value (the default) or as the difference. */
  change?: "percent" | "difference";
}

/**
 * A region's change since the previous period, as the choropleth tells it: the percent of the previous value, or the
 * difference. Null without both numbers, or for a percent from zero.
 */
export function choroplethChange(view: { value?: unknown; previous?: unknown; change?: unknown }, row: Row): number | null {
  if (typeof view.value !== "string" || typeof view.previous !== "string") return null;
  const [now, before] = [readNumber(row[view.value]), readNumber(row[view.previous])];
  if (now === null || before === null) return null;
  if (view.change === "difference") return now - before;
  return before === 0 ? null : (now - before) / Math.abs(before);
}

/** `{ type: "symbols", geo?, id? | lat? lon?, size, label?, color? }`: circles sized by a value, placed on a map. */
export interface SymbolsView {
  type: "symbols";
  geo?: GeoOption;
  id?: string;
  lat?: string;
  lon?: string;
  size: string;
  label?: string;
  color?: string;
  key?: string;
}

/** `{ type: "locator", geo?, id? | lat? lon?, label, note?, color? }`: named markers on a map. */
export interface LocatorView {
  type: "locator";
  geo?: GeoOption;
  id?: string;
  lat?: string;
  lon?: string;
  label: string;
  note?: string;
  /** Field that colors the markers by kind, with a key. */
  color?: string;
  key?: string;
}

const GEO_OPTION = (required: boolean): OptionSchema => ({
  type: "any",
  required,
  description: `The map's geometry: a built-in basemap by name (${basemapNames().join(", ")}: tile grids keyed by country or state code), an inline GeoJSON FeatureCollection whose features carry an id, or the address of a GeoJSON file to fetch.`,
});
const KEY_OPTION: OptionSchema = { type: "string", default: "id", description: "The feature property that holds each region's id in your own GeoJSON (feature.id is read too). Built-in basemaps use their codes." };
const ID_OPTION = (what: string): OptionSchema => ({ type: "field", kind: "category", description: `Field with the region code that places each ${what}: a country or state code on a built-in basemap, or the feature id in your GeoJSON. Use lat and lon instead for coordinates.` });
const LAT_OPTION: OptionSchema = { type: "field", kind: "number", description: "Field with each row's latitude, for placing by coordinates on your own GeoJSON (not on a built-in grid)." };
const LON_OPTION: OptionSchema = { type: "field", kind: "number", description: "Field with each row's longitude, paired with lat." };

/** Problems with how a map places its rows: by id, or by lat and lon, never both or neither. */
function placementProblems(view: Record<string, unknown>, required: boolean): string[] {
  const byId = typeof view.id === "string" && view.id !== "";
  const byPoint = typeof view.lat === "string" || typeof view.lon === "string";
  const problems: string[] = [];
  if (byId && byPoint) problems.push("Place rows by id (a region code) or by lat and lon, not both.");
  if (byPoint && !(typeof view.lat === "string" && typeof view.lon === "string")) problems.push("lat and lon go together: name both fields.");
  if (!byId && !byPoint && required) problems.push("Say where each row goes: id (a region code on the basemap) or lat and lon.");
  if (byPoint && typeof view.geo === "string" && resolveGeo(view.geo)?.grid) problems.push(`The ${view.geo} basemap is a tile grid with no coordinates: place rows by id (its codes) instead of lat and lon.`);
  const geo = geoProblem(view.geo);
  if (geo) problems.push(geo);
  return problems;
}

/** Rows whose id names no region on the geometry at hand, as one warning. */
function unplacedRows(view: Record<string, unknown>, rows: Row[]): string[] {
  const collection = resolveGeo(view.geo);
  const field = typeof view.id === "string" ? view.id : undefined;
  if (!collection || !field) return [];
  const key = typeof view.key === "string" ? view.key : "id";
  const known = new Set(collection.features.map((feature) => normalizeId(featureId(feature, key))));
  const lost = rows.map((row) => normalizeId(row[field])).filter((code) => code && !known.has(code));
  if (!lost.length) return [];
  const sample = [...new Set(lost)].slice(0, 3).join(", ");
  return [`${lost.length} row${lost.length === 1 ? "" : "s"} name${lost.length === 1 ? "s" : ""} no region on the map (${sample}${lost.length > 3 ? ", …" : ""}): check the codes against the basemap, or they stay unplaced.`];
}

const choropleth: ViewBlock = {
  type: "choropleth",
  drawsEmpty: true,
  extent: (view, rows) =>
    view.show === "change"
      ? rows.map((row) => choroplethChange(view, row)).filter((n): n is number => n !== null)
      : [...numbersOf(rows, [view.value]), ...[view.min, view.max].filter((n): n is number => typeof n === "number")],
  description:
    "A map with each region shaded by its value, from the weakest tint to the strongest, with a scale under it: revenue by country, share by state. Regions with no row stay grey and are keyed No data. Built-in tile grids (europe, us-states) give every region the same size, so small countries read as well as big ones; your own GeoJSON draws true shapes.",
  options: {
    geo: GEO_OPTION(true),
    id: { type: "field", kind: "category", required: true, description: "Field with each row's region code: a country or state code on a built-in basemap (FR, TX), or the feature id in your GeoJSON." },
    value: { type: "field", kind: "number", description: "Field that shades each region on the sequential scale. Rows with no number stay grey. Give value or category, not both." },
    category: {
      type: "field",
      kind: "category",
      description: "Field that colors each region by its category instead, one series color per value with a key: a transposition status, a supervisor, a regime. Up to 8 categories stay distinct.",
    },
    key: KEY_OPTION,
    codes: { type: "boolean", default: true, description: "Write each region's code inside it, where it fits." },
    min: { type: "number", description: "Value of the weakest tint. Defaults to the lowest value." },
    max: { type: "number", description: "Value of the strongest tint. Defaults to the highest value." },
    previous: {
      type: "field",
      kind: "number",
      description: 'Field with the same measure in the previous period, such as last year\'s revenue. Each region\'s tooltip then gives the change, and show "change" shades by it.',
    },
    show: {
      type: "enum",
      values: ["value", "change"],
      default: "value",
      description: '"change" shades each region by its change since previous on a diverging scale: up one way, down the other, no change in the middle. Needs previous.',
    },
    change: { type: "enum", values: ["percent", "difference"], default: "percent", description: "How a change is told: as a percent of the previous value, or as the difference in the value's own unit." },
    highlight: highlightCategories,
  },
  validate(view) {
    const problems = [...placementProblems(view, false)];
    if (view.show === "change" && !(typeof view.previous === "string" && view.previous !== "")) problems.push('show "change" needs previous: the field with the previous period\'s value.');
    if (typeof view.previous === "string" && view.previous !== "" && !(typeof view.value === "string" && view.value !== "")) problems.push("previous compares a value: give value, not category.");
    const [byValue, byCategory] = [typeof view.value === "string" && view.value !== "", typeof view.category === "string" && view.category !== ""];
    if (!byValue && !byCategory) problems.push("Say what colors the regions: value (a number, shaded) or category (a name, one color each).");
    if (byValue && byCategory) problems.push("Give value or category, not both: a region is shaded by a number or colored by a category.");
    if (typeof view.min === "number" && typeof view.max === "number" && view.max <= view.min) problems.push("max must be greater than min.");
    return problems;
  },
  checkData(view, rows) {
    const field = String(view.id);
    const codes = rows.map((row) => normalizeId(row[field])).filter(Boolean);
    const warnings = unplacedRows(view, rows);
    if (new Set(codes).size < codes.length) warnings.push(`Some ${field} codes repeat: a region takes one value, so sum the rows first with an aggregate step.`);
    if (typeof view.category === "string") {
      const groups = new Set(rows.map((row) => String(row[view.category as string] ?? ""))).size;
      if (groups > 8) warnings.push(`${groups} categories but only 8 colors, so map colors would repeat. Fold the rare ones into "Other".`);
    }
    return warnings;
  },
};

const symbols: ViewBlock = {
  type: "symbols",
  drawsEmpty: true,
  extent: (view, rows) => numbersOf(rows, [view.size]),
  description:
    "A map with a circle on each place, its area true to a value: customers by state, volume by port. Places sit on a region of a basemap (by code) or at coordinates on your own GeoJSON; a color field groups them with a key, and a size key shows what the circles mean.",
  options: {
    highlight: highlightCategories,
    geo: GEO_OPTION(false),
    id: ID_OPTION("circle"),
    lat: LAT_OPTION,
    lon: LON_OPTION,
    size: { type: "field", kind: "number", required: true, description: "Field that sizes each circle, by area. Zero and missing values draw nothing." },
    label: { type: "field", kind: "category", description: "Field naming each place in its tooltip. Defaults to the region's name, or the id." },
    color: { type: "field", kind: "category", description: "Field that colors the circles by group, with a key." },
    key: KEY_OPTION,
  },
  validate(view) {
    const problems = placementProblems(view, true);
    if (typeof view.lat === "string" && !view.geo) problems.push("Coordinates need a map under them: give geo a GeoJSON FeatureCollection or its address.");
    return problems;
  },
  checkData(view, rows) {
    const warnings = unplacedRows(view, rows);
    if (rows.length > 150) warnings.push(`${rows.length} circles crowd a map: sum them by region first, or filter.`);
    return warnings;
  },
};

const locator: ViewBlock = {
  type: "locator",
  drawsEmpty: true,
  description:
    "A small, clean map that says where things are: a marker and an always-on name for each place, such as offices, stores or sites, with a second line of detail if there is one. Places sit on a region of a basemap (by code) or at coordinates on your own GeoJSON; a kind field colors the markers with a key.",
  options: {
    geo: GEO_OPTION(false),
    id: ID_OPTION("marker"),
    lat: LAT_OPTION,
    lon: LON_OPTION,
    label: { type: "field", kind: "category", required: true, description: "Field with each place's name, written beside its marker." },
    note: { type: "field", kind: "category", description: "Field with a second, smaller line under the name, such as a city or a headcount." },
    color: { type: "field", kind: "category", description: "Field that colors the markers by kind, with a key." },
    key: KEY_OPTION,
  },
  validate(view) {
    const problems = placementProblems(view, true);
    if (typeof view.lat === "string" && !view.geo) problems.push("Coordinates need a map under them: give geo a GeoJSON FeatureCollection or its address.");
    return problems;
  },
  checkData(view, rows) {
    const warnings = unplacedRows(view, rows);
    if (rows.length > 30) warnings.push(`${rows.length} named places crowd a locator map; keep about 30 or fewer, or use symbols.`);
    return warnings;
  },
};

// ---- Regulatory landscape: a mark matrix, unit strips and stage lifecycles ----

/** `{ type: "matrix", x, y, size?, color?, flag?, label? }`: one mark per x and y pair on a grid, sized, shaded or ticked by value. */
export interface MatrixView {
  type: "matrix";
  x: string;
  y: string;
  size?: string;
  color?: string;
  /** A yes/no field: a filled square where it is yes. */
  flag?: string;
  label?: string;
  /** Row or column values to keep in color; the other marks step back. */
  highlight?: string | string[];
}

/** `{ type: "strips", label, value, per?, unit? }`: one square per unit in a strip per row, colored by part. */
export interface StripsView {
  type: "strips";
  label: string;
  /** The count field or fields, one part each, in the order drawn. */
  value: string | string[];
  per?: string;
  unit?: string;
}

/** `{ type: "lifecycle", label, stages, group?, today?, status?, impact? }`: each row's stages as segments on one date axis. */
export interface LifecycleView {
  type: "lifecycle";
  label: string;
  stages: string | string[];
  group?: string;
  today?: boolean | string;
  status?: string;
  impact?: string;
  /** Rows to keep in color, by label; the other rows step back. */
  highlight?: string | string[];
}

/** Whether a value reads as a yes: true, 1, "true", "yes", "y", "x", "required" or "must". */
export function isYes(value: unknown): boolean {
  return value === true || value === 1 || (typeof value === "string" && /^(true|yes|y|x|required|must)$/i.test(value.trim()));
}

const matrix: ViewBlock = {
  type: "matrix",
  extent: (view, rows) => numbersOf(rows, [view.size ?? view.color]),
  description:
    "A mark matrix (a punchcard): one mark per pair of x and y, sized by a value, shaded by another, or a square where a flag is yes. Rows are the y values, columns the x values; a pair with no row is an empty cell. For regulatory pressure per topic per quarter (size and shade), or who must comply with which rule (a square per yes).",
  options: {
    x: { type: "field", kind: "category", required: true, description: "Field for the columns: quarters, stakeholders, stages." },
    y: { type: "field", kind: "category", required: true, description: "Field for the rows: topics, regulations, teams." },
    size: { type: "field", kind: "number", description: "Field that sizes each circle, by area, against the largest value." },
    color: {
      type: "field",
      kind: "category",
      description: "Field that shades each mark: a number takes the seven-step scale from lowest to highest (with a scale under the grid), a category takes one color per value (with a key).",
    },
    flag: { type: "field", kind: "category", description: 'A yes/no field (true, 1, "yes", "x"): a filled square where it is yes, an empty cell where it is no. For who must comply.' },
    label: { type: "field", kind: "category", description: "Field (text or a number) written inside marks big enough to hold it; always in the tooltip." },
    highlight: highlightCategories,
  },
  validate(view) {
    return view.flag && view.size ? ["flag draws a square for every yes; drop it, or drop size."] : [];
  },
  checkData(view, rows) {
    const [x, y] = [String(view.x), String(view.y)];
    const pairs = new Set(rows.map((row) => `${String(row[x])}\u0000${String(row[y])}`));
    const columns = new Set(rows.map((row) => String(row[x]))).size;
    const lines = new Set(rows.map((row) => String(row[y]))).size;
    const messages: string[] = [];
    if (pairs.size < rows.length) messages.push(`${rows.length - pairs.size} pairs of ${x} and ${y} repeat: a cell takes one row, so sum them first with an aggregate step.`);
    if (columns > 24) messages.push(`${columns} columns crowd the grid. Keep the 24 that matter most, or roll periods up.`);
    if (lines > 30) messages.push(`${lines} rows crowd the grid. Keep the 30 that matter most (limit or filter).`);
    return messages;
  },
};

const strips: ViewBlock = {
  type: "strips",
  extent: (view, rows) => rows.map((row) => fieldList(view.value).reduce((sum, field) => sum + Math.max(0, readNumber(row[field]) ?? 0), 0)),
  description:
    "Unit strips: one row per item with a strip of small squares, one per unit, colored part by part in order (mandatory, recommended, optional), the total and the first part's share at the end. When totals run long, one square stands for a round number of units, said under the chart. A per field adds a density: provisions per page. For how many provisions a regulation has and how binding they are.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each row." },
    value: { type: "fields", kind: "number", required: true, description: "Field or fields with each part's count, in the order they are drawn. The first part's share of the total is written at the end." },
    per: { type: "field", kind: "number", description: "Field with a denominator, such as pages: the density (units per one of them) is written at the end and in the tooltip." },
    unit: { type: "string", default: "provision", description: "What one unit is, in the singular, for the note under the chart and the tooltip." },
    highlight: highlightCategories,
    reference: REFERENCE_OPTION,
  },
  checkData(view, rows) {
    const parts = Array.isArray(view.value) ? view.value.map(String) : [String(view.value)];
    const negative = rows.filter((row) => parts.some((field) => (readNumber(row[field]) ?? 0) < 0)).length;
    const messages: string[] = [];
    if (negative) messages.push(`${negative} ${negative === 1 ? "row has" : "rows have"} a negative count: squares cannot show less than nothing, so those parts are left out.`);
    if (rows.length > 20) messages.push(`${rows.length} rows make a long chart. Keep the 20 that matter most (limit or filter).`);
    return messages;
  },
};

const lifecycle: ViewBlock = {
  type: "lifecycle",
  description:
    "Stage swimlanes: one row per item on a shared date axis, each stage drawn from its date to the next in a deepening tint of one hue, a tick at every stage date, and the last reached stage running on faintly while its next date is unknown. A today line, a status pill at the row's end, and an impact that sets the row's thickness. For where each regulation stands, from proposal to application.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each row." },
    stages: {
      type: "fields",
      kind: "date",
      required: true,
      description: "Date fields in lifecycle order, such as proposed, adopted, inForce, applies. A later date may be missing: the row then runs on from its last known stage.",
    },
    group: { type: "field", kind: "category", description: "Field that gathers rows under a heading, such as topic." },
    today: { type: "any", description: "true for a line at today's date, or a YYYY-MM-DD date for the line. Shown when it falls inside the span." },
    status: { type: "field", kind: "category", description: "Field written as a small pill at the row's end, such as In force or Consultation." },
    impact: { type: "field", kind: "number", description: "Field from 1 to 5 that sets each row's thickness: the higher the impact, the thicker the row." },
    highlight: highlightCategories,
  },
  validate(view) {
    const stages = Array.isArray(view.stages) ? view.stages : typeof view.stages === "string" ? [view.stages] : [];
    const today = view.today;
    const problems = stages.length < 2 ? ['stages needs at least two date fields in order, such as ["proposed", "adopted"].'] : [];
    if (today !== undefined && today !== true && today !== false && !(typeof today === "string" && /^\d{4}-\d{2}-\d{2}/.test(today))) problems.push("today must be true or a YYYY-MM-DD date.");
    return problems;
  },
  checkData(view, rows) {
    const stages = Array.isArray(view.stages) ? view.stages.map(String) : [String(view.stages)];
    const out = rows.filter((row) => {
      const days = stages.map((field) => timeOf(row[field])).filter((d): d is number => d !== null);
      return days.some((d, i) => i > 0 && d < (days[i - 1] as number));
    });
    const messages: string[] = [];
    if (out.length) messages.push(`${out.length} ${out.length === 1 ? "row has" : "rows have"} stage dates out of order: ${out.map((row) => String(row[view.label as string])).join(", ")}.`);
    if (rows.some((row) => stages.every((field) => timeOf(row[field]) === null))) messages.push("Some rows have no stage date at all and are left out.");
    if (rows.length > 30) messages.push(`${rows.length} rows make a long chart. Keep the 30 that matter most (limit or filter), or facet by group.`);
    return messages;
  },
};

/** The three states a whitespace cell can be in, in order: held, open to sell, not for this client. */
export const WHITESPACE_STATES = ["Holds", "Opportunity", "Not eligible"] as const;

/** `{ type: "whitespace", row, column, state, states?, score?, value?, sort? }`: the cross-sell map, one cell per client and product. */
export interface WhitespaceView {
  type: "whitespace";
  row: string;
  column: string;
  state: string;
  /** The names the state field uses for held, opportunity and not eligible, in that order. Default Holds, Opportunity, Not eligible. */
  states?: [string, string, string];
  /** Number field, 0 to 100: how likely the opportunity is; tints an opportunity cell. */
  score?: string;
  /** Number field: revenue where held, potential where open; written in the tooltip and summed at the row's end. */
  value?: string;
  /** Row order: by potential (most to sell first), by penetration (least covered first), or as given. */
  sort?: "potential" | "penetration" | "none";
  /** Show only this many rows, the first in the sort order, and say how many more there are. */
  limit?: number;
}

/** `{ type: "xray", label, detail?, facts?, holdings?, wallet?, trend?, flags?, actions? }`: one client on one card. */
export interface XrayView {
  type: "xray";
  label: string;
  detail?: string;
  facts?: string | string[];
  holdings?: string | string[];
  wallet?: string;
  trend?: string;
  flags?: string;
  actions?: string;
  /** The wallet audit: "Audit wallet" and "Copy strategy" on the card, reading these sources for the client shown. */
  audit?: XrayAudit;
}

/** A source the wallet audit reads: a data spec, plus the field that names the client in its rows. */
export type XrayAuditSource = { type: string; match?: string; [option: string]: unknown };

/** `audit: { key?, currency?, sources? }`: where the x-ray finds the rest of the client's wallet. */
export interface XrayAudit {
  /** Field of the card's row naming the client, matched against each source. Defaults to the label. */
  key?: string;
  /** Currency of the money fields, such as "EUR". Defaults to the currency of the first fact formatted as one. */
  currency?: string;
  sources?: { holdings?: XrayAuditSource; history?: XrayAuditSource; activity?: XrayAuditSource; health?: XrayAuditSource; deals?: XrayAuditSource; thresholds?: XrayAuditSource };
}

/** `{ type: "history", date, title, kind?, note?, amount?, group?, limit?, order? }`: what happened, newest first. */
export interface HistoryView {
  type: "history";
  date: string;
  title: string;
  kind?: string;
  note?: string;
  amount?: string;
  group?: string;
  limit?: number;
  order?: "desc" | "asc";
}

const whitespace: ViewBlock = {
  type: "whitespace",
  description:
    "The cross-sell map (whitespace analysis): one cell per client and product, filled where the client holds the product, outlined where it is an opportunity (tinted by how likely), blank where the client is not eligible. Each row ends with its penetration (3 of 8) and the revenue still to win; each column ends with how many hold it and how many could. Rows sort with the most to sell first.",
  options: {
    row: { type: "field", kind: "category", required: true, description: "Field naming each row, usually the client." },
    column: { type: "field", kind: "category", required: true, description: "Field naming each column, usually the product." },
    state: { type: "field", kind: "category", required: true, description: "Field saying whether the row holds the column, could (an opportunity), or is not eligible. See states." },
    states: {
      type: "array",
      default: [...WHITESPACE_STATES],
      description: 'The three values the state field uses, in order: held, opportunity, not eligible. Default ["Holds", "Opportunity", "Not eligible"].',
    },
    score: { type: "field", kind: "number", description: "Field with how likely each opportunity is, 0 to 100 (a propensity). An opportunity cell's tint strengthens with it." },
    value: { type: "field", kind: "number", description: "Field with the money in each cell: revenue where held, potential where open. Written in the tooltip; the open cells' sum ends each row." },
    sort: {
      type: "enum",
      values: ["potential", "penetration", "none"],
      default: "potential",
      description: 'Row order: "potential" puts the rows with the most to win first, "penetration" the least covered first, "none" keeps the rows as given.',
    },
    limit: { type: "number", description: "Show only this many rows, the first in the sort order, with a line saying how many more there are. Applied after filters, so a filtered book still shows its own top rows." },
  },
  validate(view) {
    const states = view.states;
    if (states === undefined) return [];
    const ok = Array.isArray(states) && states.length === 3 && states.every((s) => typeof s === "string" && s) && new Set(states).size === 3;
    return ok ? [] : ['states must be three different names, in order: held, opportunity, not eligible. Example: ["Holds", "Opportunity", "Not eligible"].'];
  },
  checkData(view, rows) {
    const names = (Array.isArray(view.states) && view.states.length === 3 ? view.states : WHITESPACE_STATES).map(String);
    const field = String(view.state);
    const unknown = new Set(rows.map((row) => String(row[field])).filter((s) => !names.includes(s)));
    const warnings: string[] = [];
    if (unknown.size) warnings.push(`${unknown.size} state value${unknown.size === 1 ? "" : "s"} (${[...unknown].slice(0, 3).join(", ")}) match none of ${names.join(", ")}: those cells stay blank. Name the values with states.`);
    const columns = new Set(rows.map((row) => String(row[view.column as string]))).size;
    if (columns > 16) warnings.push(`${columns} columns crowd the map; keep about 16 products or fewer, or group them.`);
    return warnings;
  },
};

const xray: ViewBlock = {
  type: "xray",
  description:
    "A client x-ray: one client on one card, from its first row. The name and a detail line, a grid of key facts, the products it holds as pills (held in color, not held outlined), a share-of-wallet meter, a small trend, quiet warning flags and a short list of next best actions. For a client page, a pre-meeting brief or a relationship manager's cockpit.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field with the client's name." },
    detail: { type: "field", kind: "category", description: "Field for the line under the name, such as the segment or the relationship manager." },
    facts: { type: "fields", kind: "number", description: "Up to six fields shown as small labelled figures: assets, revenue, products held, client since." },
    holdings: { type: "fields", kind: "category", description: "True/false fields, one per product, drawn as a strip of named pills: held in color, not held outlined." },
    wallet: { type: "field", kind: "number", description: "Field with the share of wallet, 0 to 1, drawn as a meter with its percent." },
    trend: { type: "field", kind: "category", description: "Field whose value is a list of numbers (revenue by month, say), drawn as a small trend with its first and last values written." },
    flags: { type: "field", kind: "category", description: 'Field whose value is a list of short warnings, shown as quiet amber pills: ["No contact in 90 days", "Fee leakage"].' },
    actions: { type: "field", kind: "category", description: "Field whose value is a list of next best actions, shown as a short checklist." },
    audit: {
      type: "object",
      description:
        'The wallet audit: adds "Audit wallet" (risks, opportunities, coverage and standing, each figure traced to its field) and "Copy strategy" (a 30, 60 and 90-day account strategy as Markdown) to the card. { "key"?: field naming the client, "currency"?: "EUR", "sources": { "holdings", "history", "activity", "health", "deals", "thresholds": each a data spec such as { "type": "url", "url": "/data/holdings.json" }, with "match" naming the client field when it is not "client" or "name" } }. Sources load when the audit is first opened.',
    },
  },
  validate(view) {
    const some = ["facts", "holdings", "wallet", "trend"].some((name) => {
      const value = view[name];
      return value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && !value.length);
    });
    const problems = some ? [] : ["An x-ray needs something to show besides the name: facts, holdings, wallet or trend."];
    if (Array.isArray(view.facts) && view.facts.length > 6) problems.push(`${view.facts.length} facts are too many for one card; keep six or fewer.`);
    const audit = view.audit as Record<string, unknown> | undefined;
    if (audit !== undefined) {
      if (!audit || typeof audit !== "object" || Array.isArray(audit)) problems.push('audit must be an object such as { "sources": { "holdings": { "type": "url", "url": "/data/holdings.json" } } }.');
      else {
        const sources = audit.sources as Record<string, unknown> | undefined;
        const known = ["holdings", "history", "activity", "health", "deals", "thresholds"];
        if (sources !== undefined && (typeof sources !== "object" || sources === null || Array.isArray(sources))) problems.push("audit.sources must be an object of data specs.");
        else
          for (const [name, source] of Object.entries(sources ?? {})) {
            if (!known.includes(name)) problems.push(`audit.sources.${name} is not a source the audit reads: ${known.join(", ")}.`);
            else if (!source || typeof source !== "object" || typeof (source as { type?: unknown }).type !== "string") problems.push(`audit.sources.${name} must be a data spec with a type, such as { "type": "url", "url": "/data/${name}.json" }.`);
          }
      }
    }
    return problems;
  },
  checkData(view, rows) {
    const row = rows[0];
    if (!row) return [];
    const warnings: string[] = [];
    for (const name of ["trend", "flags", "actions"]) {
      const field = view[name];
      if (typeof field !== "string" || !field) continue;
      const value = row[field];
      if (value !== undefined && value !== null && !Array.isArray(value)) warnings.push(`${name} points at "${field}", whose value is not a list; it needs one (${name === "trend" ? "numbers" : "short texts"}).`);
    }
    if (rows.length > 1) warnings.push(`${rows.length} rows, but an x-ray shows one client: the first row. Filter to one, or use a table.`);
    return warnings;
  },
};

const history: ViewBlock = {
  type: "history",
  description:
    "A client's story as a vertical timeline: one event per row with its date, title, an optional second line and an amount, newest first, a dot per event colored by kind with a key, and the month written wherever it changes. With a group field, one list per client under its own heading. For meetings, calls, trades, campaigns and complaints in one scroll.",
  options: {
    date: { type: "field", kind: "date", required: true, description: "Field with when the event happened." },
    title: { type: "field", kind: "category", required: true, description: "Field with the event in a few words." },
    kind: { type: "field", kind: "category", description: "Field with the kind of event (Meeting, Call, Trade); each kind takes a color and a letter, keyed." },
    note: { type: "field", kind: "category", description: "Field with a second, smaller line under the title." },
    amount: { type: "field", kind: "number", description: "Field with an amount to write at the right of the event, where there is one." },
    group: { type: "field", kind: "category", description: "Field that splits the events into one list per value (one per client), each under its own heading." },
    limit: { type: "number", default: 30, description: "Events shown per list before a line says how many more there are." },
    order: { type: "enum", values: ["desc", "asc"], default: "desc", description: '"desc" puts the newest event first (the default), "asc" tells the story from the start.' },
  },
  validate(view) {
    const limit = view.limit;
    return limit === undefined || (typeof limit === "number" && Number.isInteger(limit) && limit >= 1) ? [] : ["limit must be a whole number, 1 or more."];
  },
  checkData(view, rows) {
    const field = String(view.date);
    const undated = rows.filter((row) => !/^\d{4}-\d{2}-\d{2}/.test(String(row[field] ?? "")) && !(row[field] instanceof Date) && typeof row[field] !== "number").length;
    return undated ? [`${undated} row${undated === 1 ? " has" : "s have"} no readable date in "${field}" (YYYY-MM-DD) and ${undated === 1 ? "is" : "are"} left out.`] : [];
  },
};

const anomalies: ViewBlock = {
  type: "anomalies",
  description:
    "An anomaly tracker: one thin lane per metric over time, the band it was expected to stay in as a faint fill, the expected value as a hairline, the actual as a line, and every day it stepped outside the band as a flagged dot. The lanes with the most anomalies come first, each ending with its latest value and a count. For watching a dozen measures at once and seeing which ones need a look.",
  options: {
    x: { type: "field", kind: "date", required: true, description: "Field with the date or period of each reading." },
    metric: { type: "field", kind: "category", required: true, description: "Field naming the measure each row belongs to; each measure is one lane." },
    value: { type: "field", kind: "number", required: true, description: "Field with the reading." },
    expected: { type: "field", kind: "number", description: "Field with the value expected that day, drawn as a hairline through the band." },
    low: { type: "field", kind: "number", description: "Field with the bottom of the expected band. Needs high too." },
    high: { type: "field", kind: "number", description: "Field with the top of the expected band. Needs low too." },
    flag: {
      type: "field",
      kind: "category",
      description: "Field that is true on anomalous readings (true, 1, \"yes\"). Flagged readings draw as filled dots in the alert color. Without it, readings outside the band are flagged.",
    },
  },
  validate(view) {
    const hasLow = typeof view.low === "string" && view.low !== "";
    const hasHigh = typeof view.high === "string" && view.high !== "";
    return hasLow !== hasHigh ? ["The expected band needs both low and high."] : [];
  },
  checkData(view, rows) {
    const messages: string[] = [];
    const dates = new Set(rows.map((row) => String(row[view.x as string]))).size;
    if (dates < 2) messages.push(`Only ${dates} period: the tracker needs readings over time to show a lane.`);
    const flagged = (row: Row) => {
      if (typeof view.flag === "string") return isForecast(row[view.flag]);
      const [v, lo, hi] = [readNumber(row[view.value as string]), readNumber(row[view.low as string]), readNumber(row[view.high as string])];
      return v !== null && lo !== null && hi !== null && (v < lo || v > hi);
    };
    if (rows.length && !rows.some(flagged)) messages.push("No reading is flagged, so this draws as plain lanes: check the flag field, or the band.");
    const lanes = new Set(rows.map((row) => String(row[view.metric as string]))).size;
    if (lanes > 16) messages.push(`${lanes} metrics: past about 16 lanes the tracker gets long. Keep the ones that matter, or split it.`);
    return messages;
  },
};

/** `{ type: "board", label, stage, stages?, group?, value?, detail?, limit? }`: a status board, one column per stage. */
export interface BoardView {
  type: "board";
  label: string;
  stage: string;
  stages?: string[];
  group?: string;
  value?: string;
  detail?: string;
  limit?: number;
}

/** The default number of cards a board column shows before folding the rest. */
export const BOARD_LIMIT = 8;

const board: ViewBlock = {
  type: "board",
  description:
    "A status board: one column per stage with its count in the header, and the items in it as quiet cards, so where everything stands reads at a glance. For things moving through a lifecycle: regulations by status, deals by stage, tickets by state. A group field colors a dot on each card with a key; a value field writes a number on each card; past the limit a column folds the rest into one line that opens on a click.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each card." },
    stage: { type: "field", kind: "category", required: true, description: "Field with each item's stage: one column per distinct value, in the order of stages or of first appearance." },
    stages: {
      type: "array",
      description: 'The columns in order, such as ["Proposal", "Adopted", "In force"]. A listed stage with no item still shows, empty; an item whose stage is not listed goes to a last column named Other.',
    },
    group: { type: "field", kind: "category", description: "Field that colors a dot on each card by group, with a key. Up to 8 groups stay distinct." },
    value: { type: "field", kind: "number", description: "Field written on each card, such as impact or amount, in the field's format." },
    detail: { type: "field", kind: "category", description: "Field for a smaller line under the card's name, such as the issuer or the owner." },
    limit: { type: "number", default: BOARD_LIMIT, description: "How many cards a column shows before folding the rest into a + n more line. The line opens the rest in place." },
  },
  validate(view) {
    const problems: string[] = [];
    if (view.stages !== undefined && !(Array.isArray(view.stages) && view.stages.length > 0 && view.stages.every((s) => typeof s === "string"))) problems.push('stages must be a list of stage names, such as ["Proposal", "Adopted", "In force"].');
    if (view.limit !== undefined && !(typeof view.limit === "number" && Number.isInteger(view.limit) && view.limit >= 1)) problems.push("limit must be a whole number, 1 or more.");
    return problems;
  },
  checkData(view, rows) {
    const warnings: string[] = [];
    const stages = new Set(rows.map((row) => String(row[view.stage as string] ?? "")));
    if (stages.size > 8) warnings.push(`${stages.size} stages make a wide board: keep about 8 or fewer, or fold the rare ones together.`);
    if (typeof view.group === "string") {
      const groups = new Set(rows.map((row) => String(row[view.group as string] ?? ""))).size;
      if (groups > 8) warnings.push(`${groups} groups but only 8 colors, so dot colors would repeat. Fold the rare ones into "Other".`);
    }
    return warnings;
  },
};

// ---- RAG reporting: a status scorecard and status over time ----

/**
 * `{ type: "ragboard", label, dimensions, previous?, overall?, sort?, group?, note? }`: one row per entity, one RAG
 * cell per dimension, worst first.
 */
export interface RagboardView {
  type: "ragboard";
  label: string;
  dimensions: string | string[];
  /** Each dimension's previous-period field, for the trend arrows: { "health": "healthLast" }. */
  previous?: Record<string, string>;
  /** true for the worst of the dimensions, false for none, or a status field with the model's own roll-up. */
  overall?: boolean | string;
  sort?: "worst" | "name" | "none";
  group?: string;
  note?: string;
  /** The statuses to show rows for, such as ["R", "A"]: the rest fold into one line, "and 33 on track". */
  only?: ("R" | "A" | "G" | "N")[];
  words?: Record<string, string>;
  shapes?: Record<string, string>;
}

/** `{ type: "ragtrend", label, period, status, note? }`: each entity's status period by period. */
export interface RagtrendView {
  type: "ragtrend";
  label: string;
  period: string;
  status: string;
  note?: string;
  words?: Record<string, string>;
  shapes?: Record<string, string>;
}

const RAG_WORDS_OPTION: OptionSchema = { type: "object", description: 'Words per status, keyed R, A, G, N, in place of Off track, At risk, On track and No data. Example: { "G": "Healthy", "A": "Watch", "R": "Escalate" }.' };
const RAG_SHAPES_OPTION: OptionSchema = { type: "object", description: "Shape per status, keyed R, A, G, N: circle, triangle, square, ring or diamond. Keep them different, so status never rests on color." };

/** How many values in a field are not a status (R, A, G, N, or their names), with a few of them. */
function nonRag(rows: Row[], field: string): { count: number; sample: string[] } {
  const odd = rows.map((row) => row[field]).filter((v) => v !== null && v !== undefined && v !== "" && !isRagValue(v)).map(String);
  return { count: odd.length, sample: [...new Set(odd)].slice(0, 3) };
}

const ragboard: ViewBlock = {
  type: "ragboard",
  description:
    "A RAG scorecard: one row per entity (a client, a relationship manager, a deal) and one Red, Amber or Green cell per dimension, worst first, with an overall column holding each row's worst status. Each status has its own shape and words (a filled circle On track, a triangle At risk, a square Off track), so it never rests on color. An arrow in a cell's corner says it improved or got worse since the last period; a strip above counts the statuses and a footer counts them per column.",
  options: {
    only: {
      type: "array",
      description: 'The statuses to show rows for, such as ["R", "A"] for what needs attention: the other rows fold into one line under the table ("and 33 on track"), so the counts still add up.',
    },
    label: { type: "field", kind: "category", required: true, description: "Field naming each row: the client, the relationship manager or the deal." },
    dimensions: {
      type: "fields",
      kind: "category",
      required: true,
      description: "Status fields, one column each, holding R, A, G or N (or red, amber, green, grey). The rag transform turns numbers into them.",
    },
    previous: {
      type: "object",
      description: 'Each dimension\'s previous-period status field, for the trend arrows: { "health": "healthLast", "pipeline": "pipelineLast" }.',
    },
    overall: {
      type: "any",
      default: true,
      description: 'A first column with each row\'s overall status, the one to act on: true for the worst of its dimensions, false for none, or a status field holding a roll-up your model already worked out (for example "two reds make red").',
    },
    sort: { type: "enum", values: ["worst", "name", "none"], default: "worst", description: "Rows worst first (by overall status, then the number of reds and ambers), by name, or as given." },
    group: { type: "field", kind: "category", description: "Field that gathers rows under headings, such as segment or perspective." },
    note: { type: "field", kind: "category", description: "Field written small under each name, such as the action owner or the next step." },
    words: RAG_WORDS_OPTION,
    shapes: RAG_SHAPES_OPTION,
  },
  validate(view) {
    const problems: string[] = [];
    const only = view.only;
    if (only !== undefined && !(Array.isArray(only) && only.length > 0 && only.every((status) => typeof status === "string" && /^(R|A|G|N)$/.test(status)))) {
      problems.push('only must list statuses to show, from "R", "A", "G" and "N", such as ["R", "A"].');
    }
    if (view.overall !== undefined && typeof view.overall !== "boolean" && !(typeof view.overall === "string" && view.overall !== "")) problems.push("overall must be true, false or the name of a status field.");
    const prev = view.previous;
    if (prev !== undefined && (!prev || typeof prev !== "object" || Array.isArray(prev) || Object.values(prev).some((v) => typeof v !== "string"))) {
      problems.push('previous must map each dimension field to its previous-period field, such as { "health": "healthLast" }.');
    }
    return problems;
  },
  checkData(view, rows) {
    const dims = Array.isArray(view.dimensions) ? view.dimensions.map(String) : [String(view.dimensions)];
    const warnings: string[] = [];
    for (const field of dims) {
      const { count, sample } = nonRag(rows, field);
      if (count) warnings.push(`${count} value${count === 1 ? "" : "s"} in "${field}" ${count === 1 ? "is" : "are"} not a status (${sample.join(", ")}): use R, A, G or N, or turn numbers into statuses with the rag transform. They show as no data.`);
    }
    if (dims.length > 10) warnings.push(`${dims.length} dimensions make a wide scorecard: keep about 8 that matter.`);
    // With only, the scorecard lists just those statuses and folds the rest into one line: count the rows it lists.
    const only = Array.isArray(view.only) ? view.only.map(String) : undefined;
    const overallOf = (row: Row) => (typeof view.overall === "string" && view.overall ? ragOf(row[view.overall]) : worstOf(dims.map((field) => ragOf(row[field]))));
    const listed = only ? rows.filter((row) => only.includes(overallOf(row))).length : rows.length;
    if (listed > 40) warnings.push(`${listed} rows make a long scorecard: filter to the ones that need attention, show only some statuses, or group them.`);
    return warnings;
  },
};

const ragtrend: ViewBlock = {
  type: "ragtrend",
  description:
    "RAG status over time: one row per entity and one small mark per period, shaped and colored by its status (a filled circle On track, a triangle At risk, a square Off track). A tick marks each period where the status changed, and the note of why it moved sits in the tooltip; the current status ends the row as a pill. Rows come worst-current first.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each row: the client, the relationship manager or the deal." },
    period: { type: "field", kind: "date", required: true, description: "Field with each row's period: a month, a quarter or a review date, in order." },
    status: { type: "field", kind: "category", required: true, description: "Field with the status in that period: R, A, G or N (or red, amber, green, grey)." },
    note: { type: "field", kind: "category", description: "Field saying why the status moved, shown in the tooltip of the period where it changed." },
    words: RAG_WORDS_OPTION,
    shapes: RAG_SHAPES_OPTION,
  },
  // Every panel of small multiples keeps the same periods: their times, when the periods are dates.
  extent(view, rows) {
    const times = rows.map((row) => periodTime(row[view.period as string])).filter((t): t is number => t !== null);
    return times.length === rows.length ? times : [];
  },
  checkData(view, rows) {
    const warnings: string[] = [];
    const { count, sample } = nonRag(rows, String(view.status));
    if (count) warnings.push(`${count} value${count === 1 ? "" : "s"} in "${String(view.status)}" ${count === 1 ? "is" : "are"} not a status (${sample.join(", ")}): use R, A, G or N. They show as no data.`);
    const pairs = new Set(rows.map((row) => `${String(row[view.label as string])}\u0000${String(row[view.period as string])}`));
    if (pairs.size < rows.length) warnings.push(`${rows.length - pairs.size} rows repeat an entity and period: the last one wins.`);
    const periods = new Set(rows.map((row) => String(row[view.period as string]))).size;
    if (periods > 24) warnings.push(`${periods} periods make a long row: roll them up to months or quarters.`);
    return warnings;
  },
};

/** A period's time in ms when it reads as a date (2026-03, 2026-03-31) or a quarter (2026-Q1), else null. */
export function periodTime(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const quarter = /^(\d{4})-?Q([1-4])$/i.exec(value.trim());
  if (quarter) return Date.UTC(Number(quarter[1]), (Number(quarter[2]) - 1) * 3, 1);
  const date = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(value.trim());
  return date ? Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3] ?? 1)) : null;
}

// Views that took a reference or annotation list check its shape too, on top of their own rules.
for (const block of [hbar, dot, dumbbell, histogram, boxplot, strips]) withChecks(block, checkReference);
for (const block of [dual]) withChecks(block, checkAnnotations);

/** Adds data checks to a view, after its own. */
function withDataChecks(block: ViewBlock, check: (view: Record<string, unknown>, rows: Row[]) => string[]): void {
  const own = block.checkData;
  block.checkData = (view, rows) => [...(own ? own(view, rows) : []), ...check(view, rows)];
}

/**
 * Volume: past these sizes a view still draws, but slowly and too densely to read. Each warning says what to do
 * instead: show fewer (limit), sum them up (aggregate), or group a measure into bands (bin). A table with pages, or a
 * ranking that already keeps its top rows, is fine at any size.
 */
export const VOLUME = { table: 200, categories: 50, points: 2000, cells: 1500, linePoints: 1000 } as const;
const many = (n: number) => n.toLocaleString("en-US");
withDataChecks(table, (view, rows) =>
  rows.length > VOLUME.table && typeof view.pageSize !== "number" && view.showAll !== true
    ? [`${many(rows.length)} rows make a long table: it shows the first 100 with a Show more button. Turn pages with pageSize, keep the top rows with limit, or sum them with an aggregate step.`]
    : [],
);
for (const block of [bar, hbar]) {
  withDataChecks(block, (view, rows) => {
    const key = String(block.type === "bar" ? view.x : view.label);
    const categories = new Set(rows.map((row) => String(row[key]))).size;
    return categories > VOLUME.categories && typeof view.limit !== "number"
      ? [`${many(categories)} categories make thin bars that cannot be read. Keep the top ones with limit (and other to fold the rest), or sum them with an aggregate step.`]
      : [];
  });
}
withDataChecks(scatter, (_view, rows) =>
  rows.length > VOLUME.points ? [`${many(rows.length)} points overlap into a cloud. Sum them with an aggregate step, group a measure into bands with bin, or keep a sample with limit.`] : [],
);
withDataChecks(heatmap, (view, rows) => {
  const cells = new Set(rows.map((row) => `${String(row[view.x as string])}\u0000${String(row[view.y as string])}`)).size;
  return rows.length > VOLUME.cells
    ? [`${many(rows.length)} cells${cells < rows.length ? ` (${many(cells)} distinct)` : ""}: sum them with an aggregate step by the two axes, or group the axes into bands with bin.`]
    : [];
});
withDataChecks(line, (view, rows) => {
  const fields = Array.isArray(view.y) ? view.y : [view.y];
  const points = rows.filter((row) => fields.some((field) => readNumber(row[String(field)]) !== null)).length;
  return points > VOLUME.linePoints ? [`${many(points)} points a series is more than a line can show: sum them by period with an aggregate step, or keep a recent window with limit.`] : [];
});

// Sort, top N and "Other" on every category view: declared once here, applied once after the transforms (see shape.ts).
const SHAPED: Record<string, ViewBlock> = { bar, hbar, dot, dumbbell, slope, donut, pie, treemap, waffle, variance, bullet, meter, rings, strips, list };
for (const type of SHAPE_VIEWS) {
  const block = SHAPED[type] as ViewBlock;
  for (const [name, option] of Object.entries(SHAPE_OPTIONS)) if (!(name in block.options)) block.options[name] = option;
  withChecks(block, shapeProblems);
}

export const builtinViews: ViewBlock[] = [table, list, kpi, kpis, bar, hbar, line, area, meter, bullet, donut, treemap, funnel, waterfall, heatmap, calendar, scatter, beeswarm, ridgeline, sankey, dumbbell, slope, bump, marimekko, histogram, rings, timeline, waffle, variance, gauge, pareto, boxplot, likert, candlestick, sunburst, chord, radar, rose, horizon, icicle, dot, pyramid, dual, choropleth, symbols, locator, pie, matrix, strips, lifecycle, whitespace, xray, history, anomalies, board, ragboard, ragtrend];
