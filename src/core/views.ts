/**
 * Built-in view descriptors: what each view is and which options it reads.
 * The drawing code lives in `src/dom/views` and is attached in the browser,
 * so Node (the MCP server, tests) can validate specs without a DOM.
 *
 * @module
 */
import { readNumber } from "./formats.ts";
import { ICON_NAMES } from "./icons.ts";
import { checkReference, REFERENCE_OPTION } from "./reference.ts";
import type { ReferenceMark } from "./reference.ts";
import type { Row } from "./types.ts";
import type { OptionSchema, ViewBlock } from "./registry.ts";

/** `{ type: "table", columns? }` */
export interface TableView {
  type: "table";
  /** Fields to show, in order. Defaults to every field in the rows. */
  columns?: string[];
  /** Headers sort the rows when clicked. Default true. */
  sortable?: boolean;
  /** A footer row summing each number column. Default false. */
  totals?: boolean;
}

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
}

/** One tile in a `kpis` row. */
export interface KpisItem {
  value: string;
  label?: string;
  compare?: string;
  compareLabel?: string;
  goodWhen?: "up" | "down";
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
}

/** `{ type: "meter", value, target, label? }`: one meter per row. */
export interface MeterView {
  type: "meter";
  value: string;
  target: string;
  label?: string;
}

/** `{ type: "donut", label, value, caption? }`: part-to-whole for up to 6 slices. */
export interface DonutView {
  type: "donut";
  label: string;
  value: string;
  caption?: string;
}

/** `{ type: "waterfall", label, value, totals?, endLabel? }`: a bridge from one total to another. */
export interface WaterfallView {
  type: "waterfall";
  label: string;
  value: string;
  totals?: string[];
  endLabel?: string;
  fit?: boolean;
}

/** `{ type: "heatmap", x, y, value }`: one cell per x and y pair, shaded by value. */
export interface HeatmapView {
  type: "heatmap";
  x: string;
  y: string;
  value: string;
}

/** `{ type: "scatter", x, y, series?, label? }`: one dot per row, two numbers each. */
export interface ScatterView {
  type: "scatter";
  x: string;
  y: string;
  size?: string;
  series?: string;
  label?: string;
  reference?: ReferenceMark[];
}

/** `{ type: "bullet", label, value, target, ranges? }`: actual against target over qualitative bands, one row each. */
export interface BulletView {
  type: "bullet";
  label: string;
  value: string;
  target: string;
  ranges?: number[];
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

/** `{ type: "dumbbell", label, from, to }`: before and after per item on one axis. */
export interface DumbbellView {
  type: "dumbbell";
  label: string;
  from: string;
  to: string;
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
function timeOf(value: unknown): number | null {
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

/** `{ type: "likert", label, responses }`: survey answers as diverging stacked bars centered on neutral. */
export interface LikertView {
  type: "likert";
  label: string;
  responses: string[];
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
}

/** `{ type: "hbar", label, value, highlight? }`: a ranking with values at the bar ends. */
export interface HbarView {
  type: "hbar";
  label: string;
  value: string;
  highlight?: string | string[];
}

/** `{ type: "line", x, y, highlight?, endLabels? }` */
export interface LineView {
  type: "line";
  x: string;
  y: string | string[];
  highlight?: string | string[];
  endLabels?: boolean;
  reference?: ReferenceMark[];
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
  return rows.flatMap((row) => fields.map((f) => readNumber(row[f]))).filter((n): n is number => n !== null);
}

const highlightCategories: OptionSchema = {
  type: "any",
  description: 'Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"].',
};
const highlightSeries: OptionSchema = {
  type: "any",
  description: 'Series field or fields to keep in color; every other series turns grey. Example: "revenue".',
};

const table: ViewBlock = {
  type: "table",
  description: "Rows and columns. The default view, and the one to use when people need exact values.",
  options: {
    columns: { type: "fields", description: "Fields to show, in order. Defaults to every field in the rows." },
    sortable: { type: "boolean", default: true, description: "Headers become buttons that sort the rows: ascending, then descending. Missing values stay last." },
    totals: { type: "boolean", default: false, description: "Adds a footer row summing each number column in its own format. Percent columns stay blank, since summed shares mean nothing." },
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
  },
};

const kpis: ViewBlock = {
  type: "kpis",
  description: "A row of stat tiles in one widget, each with a label, value and change: the calm way to show a handful of headline numbers. With series, reads the rows as a time series and adds a sparkline per tile.",
  options: {
    items: {
      type: "array",
      required: true,
      description: 'Tiles, each { value, label?, compare?, compareLabel?, goodWhen? }. compare is a field or "previous" (the row before). Example: [{ "value": "revenue", "compare": "previous" }].',
    },
    series: { type: "boolean", default: false, description: "Read the rows as a time series: values from the last row, compared with the row before, plus a sparkline per tile." },
  },
  validate(view) {
    const items = view.items;
    if (!Array.isArray(items)) return [];
    if (items.length === 0) return ["items needs at least one entry."];
    return items.flatMap((item: Partial<KpisItem> | null, i) => {
      if (!item || typeof item.value !== "string" || !item.value) return [`items[${i}] needs a value field.`];
      return item.goodWhen !== undefined && item.goodWhen !== "up" && item.goodWhen !== "down" ? [`items[${i}].goodWhen must be up or down.`] : [];
    });
  },
};

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
  },
  validate(view) {
    const stacked = view.stacked;
    const problems = stacked === undefined || stacked === true || stacked === false || stacked === "percent" || stacked === "stream" ? [] : ['stacked must be true, false, "percent" or "stream".'];
    return [...problems, ...checkReference(view)];
  },
};

const meter: ViewBlock = {
  type: "meter",
  description: "Progress against a target, one meter per row: attainment as a percentage and a bar that fills to the target.",
  options: {
    value: { type: "field", kind: "number", required: true, description: "Field holding the current amount." },
    target: { type: "field", kind: "number", required: true, description: "Field holding the target amount." },
    label: { type: "field", kind: "category", description: "Field naming each meter, for example a region. Defaults to the value field's label." },
  },
};

const waterfall: ViewBlock = {
  type: "waterfall",
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
  },
};

const heatmap: ViewBlock = {
  type: "heatmap",
  description: "A grid of cells shaded on one blue scale from light (low) to dark (high), for patterns across two categories such as weekday by hour.",
  options: {
    x: { type: "field", kind: "category", required: true, description: "Field for the columns." },
    y: { type: "field", kind: "category", required: true, description: "Field for the rows." },
    value: { type: "field", kind: "number", required: true, description: "Field that shades each cell." },
  },
};

const scatter: ViewBlock = {
  type: "scatter",
  description: "One dot per row placed by two numbers, to show how they relate. An optional group field colors the dots, up to 3 groups; an optional size field turns it into a bubble chart.",
  options: {
    x: { type: "field", kind: "number", required: true, description: "Numeric field along the horizontal axis." },
    y: { type: "field", kind: "number", required: true, description: "Numeric field along the vertical axis." },
    size: { type: "field", kind: "number", description: "Field sizing each dot by area, making a bubble chart: four times the value, twice the radius. Bigger bubbles are drawn first." },
    series: { type: "field", kind: "category", description: "Field that groups the dots by color. Up to 3 groups stay distinct." },
    label: { type: "field", kind: "category", description: "Field naming each dot in its tooltip." },
    reference: REFERENCE_OPTION,
  },
  validate: checkReference,
  checkData(view, rows) {
    if (typeof view.series !== "string") return [];
    const groups = new Set(rows.map((row) => String(row[view.series as string]))).size;
    return groups > 3 ? [`${groups} groups. Only 3 scatter colors stay distinct for colorblind readers: fold the rest into "Other" or split the chart.`] : [];
  },
};

const bullet: ViewBlock = {
  type: "bullet",
  description: "Actual against target, one compact row per item: a value bar and a target tick over three qualitative bands (poor, fair, good). A dense alternative to gauges.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each row." },
    value: { type: "field", kind: "number", required: true, description: "Field with the actual amount." },
    target: { type: "field", kind: "number", required: true, description: "Field with the target amount." },
    ranges: {
      type: "array",
      default: [0.6, 0.9, 1.2],
      description: "Where the three bands end, as multiples of the target: poor up to the first, fair up to the second, good up to the third.",
    },
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
  },
  checkData(view, rows) {
    if (typeof view.group !== "string") return [];
    const groups = new Set(rows.map((row) => String(row[view.group as string]))).size;
    return groups > 8 ? [`${groups} groups but only 8 colors, so colors would repeat. Fold small groups into "Other".`] : [];
  },
};

const funnel: ViewBlock = {
  type: "funnel",
  description: "Stages in order as centered bars narrowing from the first, with the conversion rate from each stage to the next and each stage's share of the first.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each stage." },
    value: { type: "field", kind: "number", required: true, description: "Field with how many reached each stage." },
  },
};

const calendar: ViewBlock = {
  type: "calendar",
  description: "A calendar heatmap: one cell per day, weeks as columns from Monday, shaded on one blue scale. For daily patterns such as sales or tickets across months.",
  options: {
    date: { type: "field", kind: "date", required: true, description: "Field with each day's date, as YYYY-MM-DD or a timestamp." },
    value: { type: "field", kind: "number", required: true, description: "Field that shades each day." },
  },
};

const ridgeline: ViewBlock = {
  type: "ridgeline",
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
  description: "Before and after per item on one shared axis: a muted dot for before, an accent dot for after, joined by a line. For this year against last year, by region.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each row." },
    from: { type: "field", kind: "number", required: true, description: "Field with the before value." },
    to: { type: "field", kind: "number", required: true, description: "Field with the after value." },
  },
};

const slope: ViewBlock = {
  type: "slope",
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
  description: "A distribution as touching bars: the value's range is cut into bins on round edges, and each bar counts the rows in its bin. A dashed line marks the median. For how deal sizes, order values or response times spread.",
  options: {
    value: { type: "field", kind: "number", required: true, description: "Numeric field to bin." },
    bins: { type: "number", description: "About how many bins to use; edges snap to round numbers, so the exact count can differ. Defaults to Sturges' rule (1 + log2 of the row count)." },
    median: { type: "boolean", default: true, description: "Draw a dashed line at the median." },
    countLabel: { type: "string", default: "Count", description: 'Name for the counts in the tooltip, for example "Deals".' },
  },
  checkData(view, rows) {
    const n = rows.filter((row) => readNumber(row[view.value as string]) !== null).length;
    return n < 5 ? [`Only ${n} values: too few for a histogram. A beeswarm or table shows each one.`] : [];
  },
};

const rings: ViewBlock = {
  type: "rings",
  description: "Concentric progress rings, one per row from the outside in, each filled to its share of target; past the target a second lap shows how far over. A legend gives each attainment. For a few goals at a glance, up to 5.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each goal." },
    value: { type: "field", kind: "number", required: true, description: "Field with the amount reached." },
    target: { type: "field", kind: "number", required: true, description: "Field with the goal amount." },
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
  description: "One headline number on a half-circle scale: an arc filled from min to the value, a tick at the target, the number large inside the arc and the scale's ends below. Reads the first row. For a single KPI with a known range, such as NPS or utilization.",
  options: {
    value: { type: "field", kind: "number", required: true, description: "Field holding the number." },
    target: { type: "field", kind: "number", description: "Field holding the target, marked with a tick." },
    min: { type: "number", default: 0, description: "Start of the scale." },
    max: { type: "number", description: "End of the scale. Defaults to a round number above the value and the target." },
    label: { type: "string", description: "Caption under the number. Defaults to the value field's label." },
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
  description: "A box plot per group on one shared axis: a box over the middle half of the values (first to third quartile), a line at the median, whiskers to the furthest values within 1.5 box-widths, and dots for outliers beyond. For comparing spreads compactly, such as deal size by region.",
  options: {
    value: { type: "field", kind: "number", required: true, description: "Numeric field whose spread is drawn." },
    group: { type: "field", kind: "category", description: "Field giving each group its own box. Without it, all rows make one box." },
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
    responses: { type: "fields", kind: "number", required: true, description: 'Count fields for the responses, in order from the negative pole to the positive, for example ["strongly_disagree", "disagree", "neutral", "agree", "strongly_agree"]. An odd count puts the middle one at the center.' },
  },
  validate(view) {
    const responses = view.responses;
    return Array.isArray(responses) && responses.length < 2 ? ["responses needs at least two fields, from one pole to the other."] : [];
  },
};

const candlestick: ViewBlock = {
  type: "candlestick",
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

const chord: ViewBlock = {
  type: "chord",
  description: "Flows between groups around a circle: each group an arc as long as everything it sends and receives, each flow a ribbon from its sender to its receiver, in the sender's color. For exchanges within one set, such as customers moving between plans or staff moving between teams.",
  options: {
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
  description: "Profiles across several attributes: one spoke per row, rings for one shared scale from zero, and a soft shape per series. For comparing up to 3 profiles, such as a product against the market on speed, price and support.",
  options: {
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
  description: "A distribution: one dot per row along a value axis, nudged apart so none overlap, optionally one row per group. Shows spread and outliers an average hides.",
  options: {
    value: { type: "field", kind: "number", required: true, description: "Numeric field along the axis." },
    group: { type: "field", kind: "category", description: "Field giving each group its own labelled row." },
    label: { type: "field", kind: "category", description: "Field naming each dot in its tooltip." },
  },
};

const donut: ViewBlock = {
  type: "donut",
  description: "Part-to-whole at a glance: a ring of up to 6 slices with the total in the middle and a legend of values and shares. Compare close values with a bar chart instead.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each slice." },
    value: { type: "field", kind: "number", required: true, description: "Field with each slice's amount. Zero, negative and missing values are left out." },
    caption: { type: "string", description: "Text under the total in the middle. Defaults to the value field's label." },
  },
  checkData(view, rows) {
    const kept = rows.filter((row) => {
      const v = readNumber(row[view.value as string]);
      return v !== null && v > 0;
    }).length;
    const messages: string[] = [];
    if (kept > 6) messages.push(`${kept} slices. Past 6 they get hard to compare: fold the smallest into "Other", or use a bar chart.`);
    if (kept < rows.length) messages.push(`${rows.length - kept} rows with zero, negative or missing values are left out of the donut.`);
    return messages;
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
      description: "Field or fields drawn as lines over the bars, on the same axis, for example a target. Never a second axis.",
    },
    stacked: {
      type: "any",
      default: false,
      description: 'true stacks the series into one column per category (part-to-whole); "percent" stacks them as shares of 100%.',
    },
    highlight: highlightCategories,
    reference: REFERENCE_OPTION,
  },
  validate(view) {
    const stacked = view.stacked;
    const problems = stacked === undefined || stacked === true || stacked === false || stacked === "percent" ? [] : ['stacked must be true, false or "percent".'];
    return [...problems, ...checkReference(view)];
  },
};

const hbar: ViewBlock = {
  type: "hbar",
  description: "Horizontal bars for rankings and long labels: label on the left, bar, value at the end. Sort the rows first for a ranking.",
  options: {
    label: { type: "field", kind: "category", required: true, description: "Field naming each bar." },
    value: { type: "field", kind: "number", required: true, description: "Field with each bar's amount. Bars start at zero." },
    highlight: highlightCategories,
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
  },
  validate: checkReference,
};

export const builtinViews: ViewBlock[] = [table, list, kpi, kpis, bar, hbar, line, area, meter, bullet, donut, treemap, funnel, waterfall, heatmap, calendar, scatter, beeswarm, ridgeline, sankey, dumbbell, slope, bump, marimekko, histogram, rings, timeline, waffle, variance, gauge, pareto, boxplot, likert, candlestick, sunburst, chord, radar];
