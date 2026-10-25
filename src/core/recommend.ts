/**
 * Which chart for these rows? Reads the shape of the data (how many rows, which
 * fields hold numbers, categories or dates, how many distinct values, names such
 * as "target" or "open") and ranks the views that suit it, each with a filled
 * view block ready to draw and one sentence on why it fits.
 *
 * @module
 */
import { guessBasemap } from "./geo.ts";
import type { Row, ViewSpec } from "./types.ts";

/** One recommended chart. */
export interface ChartPick {
  type: string;
  /** A complete view block for these rows. */
  view: ViewSpec;
  /** 0 to 100: how well the chart suits the data's shape. */
  score: number;
  /** Why it fits, in one sentence. */
  why: string;
}

const DATE = /^\d{4}-\d{2}/;
const DAY = /^\d{4}-\d{2}-\d{2}/;
const TARGET = /^(target|plan|planned|budget|goal|quota|forecast)$|(^|[_\s-])(target|plan|budget|goal|quota)$/i;
const SOURCE = /^(source|from|origin)$/i;
const DESTINATION = /^(target|to|destination)$/i;

interface Shape {
  rows: Row[];
  numbers: string[];
  categories: string[];
  dates: string[];
  distinct: (field: string) => number;
  values: (field: string) => number[];
}

/** Fields by kind, from the first row that has a value for each. Booleans count as categories. */
function shapeOf(rows: Row[]): Shape {
  const kinds = new Map<string, "number" | "category" | "date">();
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (kinds.has(key) || value === null || value === undefined) continue;
      if (typeof value === "number") kinds.set(key, "number");
      else if (typeof value === "string") kinds.set(key, DATE.test(value) ? "date" : "category");
      else if (typeof value === "boolean") kinds.set(key, "category");
    }
  }
  const of = (kind: string) => [...kinds].filter(([, k]) => k === kind).map(([key]) => key);
  const counts = new Map<string, number>();
  return {
    rows,
    numbers: of("number"),
    categories: of("category"),
    dates: of("date"),
    distinct: (field) => {
      if (!counts.has(field)) counts.set(field, new Set(rows.map((row) => String(row[field]))).size);
      return counts.get(field) ?? 0;
    },
    values: (field) => rows.map((row) => row[field]).filter((value): value is number => typeof value === "number"),
  };
}

type Rule = (shape: Shape) => Omit<ChartPick, "type"> | undefined;

const named = (fields: string[], pattern: RegExp) => fields.find((field) => pattern.test(field));
const nonNegative = (shape: Shape, field: string) => shape.values(field).every((value) => value >= 0);
/** Whether following the flows from source to target can come back to where it started. */
function loops(rows: Row[], source: string, target: string): boolean {
  const next = new Map<string, Set<string>>();
  for (const row of rows) {
    const from = String(row[source]);
    if (!next.has(from)) next.set(from, new Set());
    next.get(from)!.add(String(row[target]));
  }
  const state = new Map<string, "open" | "done">();
  const visit = (node: string): boolean => {
    if (state.get(node) === "open") return true;
    if (state.get(node) === "done") return false;
    state.set(node, "open");
    for (const to of next.get(node) ?? []) if (visit(to)) return true;
    state.set(node, "done");
    return false;
  };
  return [...next.keys()].some(visit);
}

/** The first number field and the others on a similar scale (typical sizes within 10x), up to `max`: series that can share one axis. */
function peers(shape: Shape, max: number): string[] {
  const size = (field: string) => {
    const sorted = shape.values(field).map(Math.abs).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  const [first, ...rest] = shape.numbers.filter((field) => !TARGET.test(field));
  if (!first) return [];
  const base = size(first);
  return [first, ...rest.filter((field) => {
    const other = size(field);
    return base === 0 ? other === 0 : other / base <= 10 && other / base >= 0.1;
  })].slice(0, max);
}

const falling = (values: number[]) => values.length >= 3 && values.every((value, i) => i === 0 || value <= values[i - 1]!);

/** The first category column whose values are all codes on one built-in basemap, with that basemap's name. */
function onBasemap(shape: Shape): { id: string; geo: string } | undefined {
  for (const id of shape.categories) {
    const geo = guessBasemap(shape.rows.map((row) => row[id]));
    if (geo) return { id, geo };
  }
  return undefined;
}

/** One rule per view, each returning a score and view when the data suits it. */
const RULES: Record<string, Rule> = {
  // With a target among the numbers, a gauge reads the one against the other better than separate tiles.
  kpis: ({ rows, numbers }) => (rows.length === 1 && numbers.length >= 2 ? { score: named(numbers, TARGET) ? 80 : 95, view: { type: "kpis", items: numbers.slice(0, 4).map((value) => ({ value })) }, why: "One row of several numbers: a row of headline tiles." } : undefined),
  kpi: ({ rows, numbers, dates }) => {
    const [value] = numbers;
    if (!value) return undefined;
    if (rows.length === 1) return { score: 90, view: { type: "kpi", value }, why: "One row: a single number to watch." };
    const [x] = dates;
    return x && rows.length >= 3 ? { score: 55, view: { type: "kpi", value, x }, why: `The latest ${value}, its change and a sparkline of its history.` } : undefined;
  },
  candlestick: ({ numbers, dates }) => {
    const pick = (name: string) => numbers.find((field) => field.toLowerCase() === name);
    const [open, high, low, close] = ["open", "high", "low", "close"].map(pick);
    const [x] = dates;
    return x && open && high && low && close ? { score: 99, view: { type: "candlestick", x, open, high, low, close }, why: "Open, high, low and close per period: price candles." } : undefined;
  },
  bullet: (shape) => {
    const target = named(shape.numbers, TARGET);
    const value = shape.numbers.find((field) => field !== target);
    const [label] = shape.categories;
    return target && value && label && shape.rows.length <= 15 ? { score: 92, view: { type: "bullet", label, value, target }, why: `Each ${label}'s ${value} against its ${target}.` } : undefined;
  },
  variance: (shape) => {
    const target = named(shape.numbers, TARGET);
    const value = shape.numbers.find((field) => field !== target);
    const [label] = shape.categories;
    return target && value && label ? { score: 80, view: { type: "variance", label, value, target }, why: `How far each ${label} lands above or below its ${target}.` } : undefined;
  },
  sankey: (shape) => {
    const source = named(shape.categories, SOURCE);
    const target = named(shape.categories, DESTINATION);
    const [value] = shape.numbers;
    if (!value || shape.categories.length < 2) return undefined;
    if (source && target) {
      // Flows that come back around cannot be drawn left to right as a sankey; a chord draws them.
      return { score: loops(shape.rows, source, target) ? 45 : 90, view: { type: "sankey", source, target, value }, why: `Flows from ${source} to ${target}, as thick as their ${value}.` };
    }
    const [a, b] = shape.categories as [string, string];
    return { score: 40, view: { type: "sankey", source: a, target: b, value }, why: `How ${value} flows from each ${a} to each ${b}.` };
  },
  line: (shape) => {
    const [x] = shape.dates;
    const y = peers(shape, 3);
    if (!x || !y.length || shape.rows.length < 3) return undefined;
    return { score: 90, view: { type: "line", x, y: y.length === 1 ? y[0] : y }, why: `${y.join(", ")} over ${x}: a trend.` };
  },
  area: ({ rows, numbers, dates }) => {
    const [x] = dates;
    const [y] = numbers;
    return x && y && rows.length >= 3 ? { score: 60, view: { type: "area", x, y }, why: `${y} over ${x}, where the amount itself matters.` } : undefined;
  },
  calendar: (shape) => {
    const date = shape.dates.find((field) => shape.rows.every((row) => typeof row[field] !== "string" || DAY.test(row[field] as string)));
    const [value] = shape.numbers;
    return date && value && shape.distinct(date) >= 28 ? { score: 72, view: { type: "calendar", date, value }, why: `One value per day across ${shape.distinct(date)} days: daily patterns.` } : undefined;
  },
  bump: (shape) => {
    const [x] = shape.dates;
    const series = shape.categories.find((field) => shape.distinct(field) >= 3 && shape.distinct(field) <= 10);
    const [value] = shape.numbers;
    return x && series && value && shape.distinct(x) >= 3 ? { score: 68, view: { type: "bump", x, series, value }, why: `How each ${series} ranks by ${value}, period by period.` } : undefined;
  },
  funnel: (shape) => {
    const [label] = shape.categories;
    const [value] = shape.numbers;
    if (!label || !value || shape.rows.length > 8 || shape.distinct(label) !== shape.rows.length) return undefined;
    const values = shape.values(value);
    if (!falling(values)) return undefined;
    // A ranking sorted largest first also falls; a funnel names its steps, or loses most of what entered.
    const stepped = /stage|step|phase|funnel/i.test(label);
    const steep = values[values.length - 1]! <= values[0]! * 0.25;
    return stepped || steep ? { score: stepped ? 88 : 60, view: { type: "funnel", label, value }, why: `${value} shrinks step by step: where people drop out.` } : undefined;
  },
  bar: (shape) => {
    const [x] = shape.categories;
    if (!x || !shape.numbers.length) return undefined;
    const count = shape.distinct(x);
    if (count > 12) return undefined;
    const y = peers(shape, 3);
    return { score: shape.dates.length ? 70 : 85, view: { type: "bar", x, y: y.length === 1 ? y[0] : y }, why: `${y.join(" and ")} compared across ${count} ${x} values.` };
  },
  hbar: (shape) => {
    const [label] = shape.categories;
    const [value] = shape.numbers;
    if (!label || !value) return undefined;
    const count = shape.distinct(label);
    const long = shape.rows.some((row) => String(row[label]).length > 12);
    // Long names with two or three comparable measures: grouped bars, one thin bar per measure in each row.
    const y = long ? peers(shape, 3) : [value];
    const grouped = y.length > 1;
    return {
      score: count > 12 || long ? 88 : 72,
      view: { type: "hbar", label, value: grouped ? y : value },
      why: grouped ? `${y.join(" and ")} side by side for each of ${count} ${label} values, with room for long names.` : `A ranking of ${count} ${label} values by ${value}${long ? ", with room for long names" : ""}.`,
    };
  },
  donut: (shape) => {
    const [label] = shape.categories;
    const [value] = shape.numbers;
    return label && value && shape.distinct(label) <= 6 && shape.distinct(label) === shape.rows.length && nonNegative(shape, value) ? { score: 62, view: { type: "donut", label, value }, why: `Each ${label}'s share of the total ${value}.` } : undefined;
  },
  pie: (shape) => {
    const [label] = shape.categories;
    const [value] = shape.numbers;
    return label && value && shape.distinct(label) <= 6 && shape.distinct(label) === shape.rows.length && nonNegative(shape, value) ? { score: 58, view: { type: "pie", label, value }, why: `Each ${label}'s share of ${value}, as wedges of one disc.` } : undefined;
  },
  treemap: (shape) => {
    const [label] = shape.categories;
    const [value] = shape.numbers;
    return label && value && shape.distinct(label) > 6 && nonNegative(shape, value) ? { score: 58, view: { type: "treemap", label, value, ...(shape.categories[1] ? { group: shape.categories[1] } : {}) }, why: `Many parts of one total ${value}, as nested rectangles.` } : undefined;
  },
  heatmap: (shape) => {
    const [x, y] = shape.categories;
    const [value] = shape.numbers;
    return x && y && value && shape.distinct(x) >= 3 && shape.distinct(y) >= 3 ? { score: 70, view: { type: "heatmap", x, y, value }, why: `${value} for every ${x} and ${y} pair, as a shaded grid.` } : undefined;
  },
  scatter: ({ rows, numbers, categories }) => {
    const [x, y, size] = numbers;
    return x && y && rows.length >= 8 ? { score: 75, view: { type: "scatter", x, y, ...(size ? { size } : {}), ...(categories[0] ? { label: categories[0] } : {}) }, why: `Whether ${y} rises with ${x}, one dot per row.` } : undefined;
  },
  histogram: ({ rows, numbers }) => {
    const [value] = numbers;
    return value && rows.length >= 20 ? { score: 70, view: { type: "histogram", value }, why: `How ${rows.length} values of ${value} spread out.` } : undefined;
  },
  boxplot: (shape) => {
    const [value] = shape.numbers;
    const group = shape.categories.find((field) => shape.distinct(field) >= 2 && shape.distinct(field) <= 8);
    return value && group && shape.rows.length >= 20 ? { score: 66, view: { type: "boxplot", value, group }, why: `How ${value} spreads within each ${group}, outliers included.` } : undefined;
  },
  timeline: (shape) => {
    const [label] = shape.categories;
    const [start, end] = shape.dates;
    const progress = shape.numbers.find((field) => shape.values(field).every((value) => value >= 0 && value <= 1));
    const group = shape.categories.find((field) => field !== label && shape.distinct(field) < shape.rows.length);
    return label && start && end && shape.distinct(label) === shape.rows.length
      ? { score: 96, view: { type: "timeline", label, start, end, ...(group ? { group } : {}), ...(progress ? { progress } : {}) }, why: `Each ${label} as a bar from ${start} to ${end}: a schedule.` }
      : undefined;
  },
  gauge: ({ rows, numbers }) => {
    const target = named(numbers, TARGET);
    const value = numbers.find((field) => field !== target);
    return rows.length === 1 && value && target ? { score: 93, view: { type: "gauge", value, target }, why: `One ${value} against its ${target}, on a dial.` } : undefined;
  },
  meter: (shape) => {
    const target = named(shape.numbers, TARGET);
    const value = shape.numbers.find((field) => field !== target);
    const [label] = shape.categories;
    return target && value && shape.rows.length > 1 && shape.rows.length <= 8 ? { score: 82, view: { type: "meter", value, target, ...(label ? { label } : {}) }, why: `How far each ${label ?? "row"} has come toward its ${target}.` } : undefined;
  },
  rings: (shape) => {
    const target = named(shape.numbers, TARGET);
    const value = shape.numbers.find((field) => field !== target);
    const [label] = shape.categories;
    return target && value && label && shape.rows.length <= 5 ? { score: 70, view: { type: "rings", label, value, target }, why: `Progress to ${target} as rings, one per ${label}.` } : undefined;
  },
  dumbbell: (shape) => {
    const [label] = shape.categories;
    const [from, to] = shape.numbers;
    return label && from && to && shape.numbers.length === 2 && !named(shape.numbers, TARGET) && shape.rows.length <= 15 && shape.distinct(label) === shape.rows.length
      ? { score: 78, view: { type: "dumbbell", label, from, to }, why: `Each ${label}'s change from ${from} to ${to}, as a gap between two dots.` }
      : undefined;
  },
  slope: (shape) => {
    const [label] = shape.categories;
    const [from, to] = shape.numbers;
    return label && from && to && shape.numbers.length === 2 && !named(shape.numbers, TARGET) && shape.rows.length <= 10 && shape.distinct(label) === shape.rows.length
      ? { score: 74, view: { type: "slope", label, from, to }, why: `Who rose and who fell between ${from} and ${to}.` }
      : undefined;
  },
  radar: (shape) => {
    const [label] = shape.categories;
    const y = shape.numbers.slice(0, 3);
    return label && y.length >= 2 && shape.rows.length >= 4 && shape.rows.length <= 10 && shape.distinct(label) === shape.rows.length && !shape.dates.length
      ? { score: 60, view: { type: "radar", label, y }, why: `${y.join(" and ")} as profiles across ${shape.rows.length} attributes.` }
      : undefined;
  },
  waterfall: (shape) => {
    const [label] = shape.categories;
    const [value] = shape.numbers;
    return label && value && shape.values(value).some((v) => v < 0) && shape.values(value).some((v) => v > 0) && shape.rows.length <= 15
      ? { score: 84, view: { type: "waterfall", label, value }, why: `Gains and losses in ${value} adding up step by step.` }
      : undefined;
  },
  pareto: (shape) => {
    const [label] = shape.categories;
    const [value] = shape.numbers;
    return label && value && shape.numbers.length === 1 && shape.distinct(label) >= 5 && nonNegative(shape, value) && !shape.dates.length
      ? { score: 64, view: { type: "pareto", label, value }, why: `Which few ${label} values make up most of the ${value}.` }
      : undefined;
  },
  beeswarm: (shape) => {
    const [value] = shape.numbers;
    const group = shape.categories.find((field) => shape.distinct(field) >= 2 && shape.distinct(field) <= 6);
    return value && shape.rows.length >= 15 && shape.rows.length <= 400 ? { score: 64, view: { type: "beeswarm", value, ...(group ? { group } : {}) }, why: `Every ${value} as a dot, so spread and outliers show.` } : undefined;
  },
  ridgeline: (shape) => {
    const [value] = shape.numbers;
    const group = shape.categories.find((field) => shape.distinct(field) >= 3 && shape.distinct(field) <= 8);
    return value && group && shape.rows.length >= 30 ? { score: 58, view: { type: "ridgeline", value, group }, why: `The shape of ${value} in each ${group}, stacked like ridges.` } : undefined;
  },
  marimekko: (shape) => {
    const [x, series] = shape.categories;
    const [value] = shape.numbers;
    return x && series && value && shape.distinct(x) <= 8 && shape.distinct(series) <= 6 && nonNegative(shape, value) ? { score: 62, view: { type: "marimekko", x, series, value }, why: `How big each ${x} is, and how it splits by ${series}.` } : undefined;
  },
  sunburst: (shape) => {
    const levels = shape.categories.slice(0, 3);
    const [value] = shape.numbers;
    return levels.length >= 2 && value && nonNegative(shape, value) ? { score: 57, view: { type: "sunburst", levels, value }, why: `${value} split by ${levels.join(", then ")}, as rings.` } : undefined;
  },
  icicle: (shape) => {
    const levels = shape.categories.slice(0, 3);
    const [value] = shape.numbers;
    return levels.length >= 2 && value && nonNegative(shape, value) ? { score: 55, view: { type: "icicle", levels, value }, why: `${value} split by ${levels.join(", then ")}, laid flat.` } : undefined;
  },
  chord: (shape) => {
    const source = named(shape.categories, SOURCE);
    const target = named(shape.categories, DESTINATION);
    const [value] = shape.numbers;
    if (!source || !target || !value) return undefined;
    // A chord suits flows that come back around, such as customers moving between plans; a one-way chain is a sankey.
    return loops(shape.rows, source, target) ? { score: 88, view: { type: "chord", source, target, value }, why: `Flows that go back and forth between the same groups.` } : undefined;
  },
  horizon: (shape) => {
    const [x] = shape.dates;
    return x && shape.numbers.length >= 4 && shape.rows.length >= 10 ? { score: 66, view: { type: "horizon", x, y: shape.numbers.slice(0, 12) }, why: `${shape.numbers.length} series over ${x}, each in its own thin band.` } : undefined;
  },
  dot: (shape) => {
    // Two to five measures of one kind per item (scores, rates): dots on one axis show each row's spread and every ranking.
    const [label] = shape.categories;
    const measures = shape.numbers.filter((field) => !TARGET.test(field));
    if (!label || measures.length < 2 || measures.length > 5 || shape.rows.length < 2 || shape.rows.length > 30 || shape.distinct(label) !== shape.rows.length) return undefined;
    const spans = measures.map((field) => shape.values(field)).filter((values) => values.length).map((values) => [Math.min(...values), Math.max(...values)] as const);
    const low = Math.min(...spans.map(([a]) => a));
    const high = Math.max(...spans.map(([, b]) => b));
    // The measures must share a scale: every one's range covers at least a fifth of the whole, or the small ones vanish.
    const shared = high > low && spans.every(([a, b]) => (b - a) / (high - low) >= 0.2);
    return shared ? { score: 64, view: { type: "dot", label, values: measures }, why: `${measures.length} measures per ${label} as dots on one axis, each row's spread in view.` } : undefined;
  },
  dual: (shape) => {
    // Two measures over time on scales too far apart to share one axis (revenue and churn): one panel each.
    const [x] = shape.dates;
    const [y] = peers(shape, 1);
    const y2 = shape.numbers.find((field) => field !== y && !TARGET.test(field) && !peers(shape, shape.numbers.length).includes(field));
    if (!x || !y || !y2 || shape.rows.length < 3) return undefined;
    const amount = nonNegative(shape, y) ? "bar" : "line";
    return { score: 72, view: { type: "dual", x, y, y2, marks: [amount, "line"] }, why: `${y} and ${y2} over ${x}, in different units: a panel each, no second axis.` };
  },
  table: ({ rows }) => (rows.length ? { score: 20, view: { type: "table" }, why: "Exact values, row by row." } : undefined),
  pyramid: (shape) => {
    // Two counts named for the two sides of a population (women and men, female and male) across ordered bands.
    const [label] = shape.categories;
    const left = named(shape.numbers, /^(women|female|females|girls|f)$/i);
    const right = named(shape.numbers, /^(men|male|males|boys|m)$/i);
    return label && left && right && shape.rows.length >= 3 && shape.rows.length <= 30 && shape.distinct(label) === shape.rows.length && nonNegative(shape, left) && nonNegative(shape, right)
      ? { score: 90, view: { type: "pyramid", label, left, right }, why: `${left} and ${right} back to back across ${shape.rows.length} ${label} bands.` }
      : undefined;
  },
  // A column of country or state codes that all sit on one built-in basemap: shade the map, or size circles on it.
  choropleth: (shape) => {
    const placed = onBasemap(shape);
    const [value] = shape.numbers;
    return placed && value && shape.distinct(placed.id) === shape.rows.length
      ? { score: 86, view: { type: "choropleth", geo: placed.geo, id: placed.id, value }, why: `${value} by ${placed.id}, shaded on a map.` }
      : undefined;
  },
  symbols: (shape) => {
    const placed = onBasemap(shape);
    const [size] = shape.numbers;
    return placed && size && nonNegative(shape, size) ? { score: 62, view: { type: "symbols", geo: placed.geo, id: placed.id, size }, why: `${size} as circles on a map, one per ${placed.id}.` } : undefined;
  },
  // Two categories crossed, one row per pair: marks sized by a count and shaded by a second measure, or a square per yes.
  matrix: (shape) => {
    const flags = shape.categories.filter((field) => shape.rows.every((row) => typeof row[field] === "boolean" || row[field] == null));
    const names = shape.categories.filter((field) => !flags.includes(field) && shape.distinct(field) >= 2);
    if (names.length < 2 || shape.rows.length < 4) return undefined;
    // Periods (quarters, months) go across; the other category down.
    const period = names.find((field) => /quarter|month|year|period|week|date/i.test(field) || shape.rows.every((row) => /^\d{4}/.test(String(row[field]))));
    const x = period ?? (names[1] as string);
    const y = names.find((field) => field !== x) as string;
    if (shape.distinct(x) * shape.distinct(y) < shape.rows.length) return undefined;
    const measures = shape.numbers.filter((field) => !TARGET.test(field));
    const [mark] = flags.filter((field) => shape.rows.some((row) => row[field] === true));
    if (mark && measures.length === 0) return { score: 70, view: { type: "matrix", x, y, mark }, why: `A square for every ${y} and ${x} where ${mark} is yes.` };
    const [size, color] = measures;
    if (!size || !nonNegative(shape, size)) return undefined;
    return { score: 60, view: { type: "matrix", x, y, size, ...(color ? { color } : {}) }, why: `${size}${color ? ` and ${color}` : ""} for every ${y} and ${x}, as marks on one grid.` };
  },
  // Whole counts in parts named for how binding they are: squares to count, colored by part.
  strips: (shape) => {
    const [label] = shape.categories;
    const parts = shape.numbers.filter((field) => /mandatory|binding|required|recommended|optional|provision|obligation|clause|article/i.test(field) && nonNegative(shape, field) && shape.values(field).every(Number.isInteger));
    if (!label || parts.length < 2 || shape.rows.length > 20 || shape.distinct(label) !== shape.rows.length) return undefined;
    const per = shape.numbers.find((field) => /page|article|word/i.test(field) && !parts.includes(field));
    return { score: 86, view: { type: "strips", label, parts, ...(per ? { per } : {}) }, why: `One square per ${parts.join(", ")} for each ${label}, so the counts can be counted and compared.` };
  },
  // Several dates per row in lifecycle order: each row's stages on one date axis.
  lifecycle: (shape) => {
    const [label] = shape.categories;
    if (!label || shape.dates.length < 2 || shape.rows.length > 30 || shape.distinct(label) !== shape.rows.length) return undefined;
    // Stages in the order their dates fall: where rows have both, the one that comes first more often goes first; otherwise the column order stands.
    const before = (a: string, b: string) =>
      shape.rows.reduce((sum, row) => {
        const [da, db] = [row[a], row[b]];
        return typeof da === "string" && typeof db === "string" ? sum + Math.sign(da.localeCompare(db)) : sum;
      }, 0);
    const stages = shape.dates.map((field, i) => ({ field, i })).sort((a, b) => before(a.field, b.field) || a.i - b.i).map((s) => s.field);
    const status = shape.categories.find((field) => /status|stage|state|phase/i.test(field));
    const group = shape.categories.find((field) => field !== label && field !== status && /topic|group|team|area|domain|category/i.test(field));
    const impact = shape.numbers.find((field) => /impact|severity|priority/i.test(field));
    return { score: 76, view: { type: "lifecycle", label, stages, ...(group ? { group } : {}), ...(status ? { status } : {}), ...(impact ? { impact } : {}), today: true }, why: `Where each ${label} stands, from ${stages[0]} to ${stages.at(-1)}, on one date axis.` };
  },
  // Long rows of client, product and a held / opportunity / not eligible state: the cross-sell map.
  whitespace: (shape) => {
    const state = shape.categories.find((field) => {
      const values = new Set(shape.rows.map((row) => String(row[field])));
      return values.size >= 2 && values.size <= 3 && [...values].every((v) => /^(holds?|held|opportunity|open|not eligible|ineligible)$/i.test(v));
    });
    if (!state) return undefined;
    const [row, column] = shape.categories.filter((field) => field !== state);
    if (!row || !column || shape.rows.length < 4) return undefined;
    const score = named(shape.numbers, /propensity|score|likelihood|probability/i);
    const value = shape.numbers.find((field) => field !== score && /potential|revenue|value|fees/i.test(field)) ?? shape.numbers.find((field) => field !== score);
    return { score: 88, view: { type: "whitespace", row, column, state, ...(score ? { score } : {}), ...(value ? { value } : {}) }, why: `Which ${row} could take which ${column}, held cells filled and open ones outlined.` };
  },
  // One row with a name, a few numbers and true/false product columns: a client's card.
  xray: (shape) => {
    if (shape.rows.length !== 1) return undefined;
    const row = shape.rows[0] as Row;
    const [label] = shape.categories;
    const booleans = Object.keys(row).filter((key) => typeof row[key] === "boolean");
    const facts = shape.numbers.filter((field) => !/share|wallet|propensity/i.test(field)).slice(0, 6);
    if (!label || facts.length < 2) return undefined;
    const wallet = named(shape.numbers, /share.?of.?wallet|wallet/i);
    return { score: 66, view: { type: "xray", label, facts, ...(booleans.length ? { holdings: booleans } : {}), ...(wallet ? { wallet } : {}) }, why: `${label}'s card: the key numbers${booleans.length ? ", the products held" : ""}${wallet ? " and the share of wallet" : ""}.` };
  },
  // Dated events with a short text each: a story, newest first.
  history: (shape) => {
    const [date] = shape.dates.filter((field) => shape.rows.every((row) => DAY.test(String(row[field] ?? ""))));
    const title = shape.categories.find((field) => /^(title|event|what|summary|subject|activity)$/i.test(field)) ?? shape.categories.find((field) => shape.distinct(field) >= shape.rows.length * 0.8);
    if (!date || !title || shape.rows.length < 3 || shape.rows.length > 400) return undefined;
    const kind = shape.categories.find((field) => field !== title && /^(kind|type|category|channel)$/i.test(field));
    const amount = shape.numbers.find((field) => /amount|value|revenue|fees|volume/i.test(field)) ?? shape.numbers[0];
    const note = shape.categories.find((field) => field !== title && field !== kind && /^(note|notes|detail|details|comment|description)$/i.test(field));
    return { score: 74, view: { type: "history", date, title, ...(kind ? { kind } : {}), ...(note ? { note } : {}), ...(amount ? { amount } : {}) }, why: `What happened and when, newest first${kind ? `, each ${kind} in its color` : ""}.` };
  },
};

/**
 * The views that suit `rows`, best first, each with a filled view block.
 * Only built-in views are considered; `limit` caps the list (default 5).
 */
export function recommendCharts(rows: Row[], options: { limit?: number } = {}): ChartPick[] {
  const shape = shapeOf(rows);
  const picks: ChartPick[] = [];
  for (const [type, rule] of Object.entries(RULES)) {
    const pick = rule(shape);
    if (pick) picks.push({ type, ...pick });
  }
  return picks.sort((a, b) => b.score - a.score).slice(0, options.limit ?? 5);
}
