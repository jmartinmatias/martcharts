/**
 * The Taller: elBulli's creative method, abstracted and applied to sales charts.
 *
 * Ferran Adrià's workshop invented by method rather than by luck. Taken one level above its craft, that method is a
 * handful of principles: know what exists, keep the essence and change the form, change the context, set opposites
 * against each other, play with what people expect, strip to what matters, combine what does not usually meet, and
 * judge every result twice: is it new, is it good. The Taller applies them to sales data. The essence of a chart is
 * the sales question it answers about its own numbers ("Which region has the most revenue?"). Seven sales moves
 * (decompose, reframe, distill, contrast, reveal, combine, reform) give that question a new form, and every version
 * is scored on five qualities (emphasis, surprise, honesty, detail, insight) and kept only when it is balanced, valid
 * and new. Crear es no copiar: to create is not to copy.
 *
 * Runs in Node and the browser: no DOM.
 *
 * @module
 */
import { checkPalette, deltaE, oklch } from "./color.ts";
import { describePalettes } from "./palettes.ts";
import { questionOf } from "./question.ts";
import type { QuestionKind } from "./question.ts";
import { getBlock } from "./registry.ts";
import { explainVariant } from "./taller-explain.ts";
import type { Row, StyleSpec, TransformSpec, ViewSpec, WidgetSpec } from "./types.ts";
import { hasErrors, validateSpec } from "./validate.ts";

/** The seven sales moves: what the Taller does to a chart's question to give it a new form. */
export type Move = "decompose" | "reframe" | "distill" | "contrast" | "reveal" | "combine" | "reform";
/** The five qualities a chart is balanced on. */
export type Quality = "emphasis" | "surprise" | "honesty" | "detail" | "insight";
export type Qualities = Record<Quality, number>;
/** Color emphasis: warm hues, cool hues, one item in a warm color with the rest in grey, or the standard palette. */
export type ColorEmphasis = "warm" | "cool" | "standout" | "standard";
/** Smooth (curves, washes, round marks) or sharp (bars, steps, dots, cells). */
export type Marks = "smooth" | "sharp";
/** The card a version is drawn on: a style preset, or the standard look. */
export type Look = "paper" | "glass" | "airy" | "default";
/** Who reads the chart, and when. */
export type Audience = "rep" | "manager" | "leadership";

/** Where a version comes from: the move, the question it answers, its form, and how it is drawn. */
export interface Lineage {
  move: Move;
  question: QuestionKind;
  form: string;
  color: ColorEmphasis;
  marks: Marks;
  look: Look;
}

/** Whether a chart is balanced, in one line. */
export interface Balance {
  ok: boolean;
  note: string;
}

/** One new version of a chart. Plain JSON, so a curated collection can be saved as it is. */
export interface Variant {
  spec: WidgetSpec;
  move: Move;
  lineage: Lineage;
  qualities: Qualities;
  balance: Balance;
  /** The sales question it answers, in plain words: "Which region has the most revenue?". */
  question: string;
  /** The chart in plain words: "Account portfolio as a dot swarm: each dot is one account". */
  title: string;
  /** How to read it, in a sentence or two a ten-year-old can follow. */
  explain: string;
  /** The seed that made it: the same chart and seed give the same versions again. */
  seed: number;
  /** How far the form departs from the original, 0 to 1: another family of view, new elements, a rare form. */
  novelty: number;
  /** How much the chart says, 0 to 1: balance, insight and honesty. */
  meaning: number;
}

/** How to steer the Taller. */
export interface TallerOptions {
  /** How many versions, at most. Default 6. Simple charts may give fewer. */
  count?: number;
  /** The same chart and seed always give the same versions. Default 1. */
  seed?: number;
  /** -1 calm (cool hues) to 1 bold (warm hues, one standout). Default 0: a mix. */
  color?: number;
  /** -1 smooth (curves, washes) to 1 sharp (bars, steps, dots). Default 0: a mix. */
  marks?: number;
  /** Only these moves. Default: all. */
  moves?: Move[];
  /** Who reads it: leans on the moves that serve that moment. Default: no lean. */
  audience?: Audience;
}

/** One creative principle and how the Taller applies it to sales data. */
export interface Principle {
  principle: string;
  sales: string;
  /** The sales move that carries it out, when one does. */
  move?: Move;
}

/** Each sales move: its name, what it does to a sales question, and the creative principle it comes from. */
export const MOVES: Record<Move, { label: string; does: string; principle: string }> = {
  decompose: { label: "Decompose", does: "Split the total into the parts that make it: regions, products, segments, or one small chart each.", principle: "Take the whole apart, keep it recognisable" },
  reframe: { label: "Reframe", does: "Measure the number against something else: a target, the average, the last period, or its share of the total.", principle: "Change the context" },
  distill: { label: "Distill", does: "Keep only what decides: the top few, the few that make most of the total, or one number with its trend.", principle: "Strip to the essential" },
  contrast: { label: "Contrast", does: "Set two states against each other: before and after, plan and actual, or one standout against the rest.", principle: "Opposites sharpen each other" },
  reveal: { label: "Reveal", does: "Show what the total hides: the spread behind an average, the outliers, the busiest days and hours.", principle: "Play with what people expect" },
  combine: { label: "Combine", does: "Join two views that rarely meet: bars with their target line, a headline number over a chart, two measures on one plane.", principle: "Combine what does not usually meet" },
  reform: { label: "Reform", does: "Ask the same question in a shape the dashboard has not used yet.", principle: "One new form opens a family" },
};

/** The method, one level above its craft: each principle, and what the Taller does with it on sales data. */
export const PRINCIPLES: Principle[] = [
  { principle: "Know what exists", sales: "Before making anything, the Taller reads the numbers (the measures, the regions, accounts or products they belong to, and time) and the chart that already shows them, so a new version is never a copy." },
  { principle: "Keep the essence, change the form", sales: "Every version uses the same numbers, never altered or invented, and says which sales question it answers: who has the most, are we on target, what changed." },
  ...(Object.keys(MOVES) as Move[]).map((move) => ({ principle: MOVES[move].principle, sales: `${MOVES[move].label}. ${MOVES[move].does}`, move })),
  { principle: "Serve the moment", sales: "A rep between calls, a manager in the weekly review and leadership at the quarterly review need different answers. Choosing who reads it leans on the moves that serve them." },
  { principle: "Balance before boldness", sales: "Five qualities: emphasis, surprise, honesty, detail and insight. A version where one of them shouts, or where nothing stands out and nothing can be learned, is turned away." },
  { principle: "Judge twice: is it new, is it good", sales: "New: how far a version departs from the original. Says: how balanced and insightful it is. Only versions that score on both are selected." },
  { principle: "Create apart from the everyday", sales: "The Taller makes versions without touching the dashboard. Only a chosen version is saved as a widget." },
  { principle: "Record where it came from", sales: "Each version keeps its move, its question and its form, and the same seed makes it again." },
];

/** Who reads a chart, the moment they read it in, and the moves that serve that moment. */
export const AUDIENCES: Record<Audience, { label: string; moment: string; moves: Move[] }> = {
  rep: { label: "Sales rep", moment: "A quick look between calls: one clear answer, the standout first.", moves: ["distill", "contrast", "combine"] },
  manager: { label: "Sales manager", moment: "The weekly pipeline review: who is ahead, who is behind target, and why.", moves: ["reframe", "contrast", "decompose", "reveal"] },
  leadership: { label: "Leadership", moment: "The quarterly business review: the big picture, the mix, and where it is heading.", moves: ["reframe", "decompose", "distill", "reform"] },
};

/** The five qualities, in reading order. */
export const QUALITIES: Quality[] = ["emphasis", "surprise", "honesty", "detail", "insight"];
const DATE = /^\d{4}-\d{2}/;
const DAY = /^\d{4}-\d{2}-\d{2}/;
const TARGET_NAME = /target|plan|goal|budget|quota/i;

/** What a chart's data holds, read from its rows and the fields the chart already shows. */
export interface DataProfile {
  title: string;
  /** Number fields, those the chart already shows first. Targets and band edges are kept apart. */
  measures: string[];
  /** Text fields, those the chart already shows first. */
  categories: string[];
  /** Date fields. */
  times: string[];
  /** A number field that reads as a target, plan or budget. */
  target?: string;
  rows: number;
  distinct: Record<string, number>;
  negatives: boolean;
  /** The time field holds days, not months. */
  daily: boolean;
  /** The first two categories cross (most pairs exist, as regions by products do) rather than nest (accounts in segments). */
  crossed: boolean;
  /** The view type the chart arrived in. */
  view: string;
  /** The chart already stacks its measures as parts of one whole, so they add up. */
  stacked: boolean;
  /** Forecast and band options worth carrying into line and area versions. */
  fan: Record<string, unknown>;
}

/** The field names a spec's view and headline use, in the order they appear. */
function usedFields(spec: WidgetSpec): string[] {
  const view = spec.view ?? {};
  const out: string[] = [];
  const add = (value: unknown) => {
    for (const field of Array.isArray(value) ? value : [value]) if (typeof field === "string" && !out.includes(field)) out.push(field);
  };
  try {
    for (const [name, option] of Object.entries(getBlock("view", String(view.type)).options)) {
      if (option.type === "field" || option.type === "fields") add(view[name]);
    }
  } catch {
    // An unknown view still has fields: the rows say what they are.
  }
  if (spec.headline && typeof spec.headline === "object") add((spec.headline as { value?: unknown }).value);
  return out;
}

/** Reads the data: its fields by kind, how many rows and distinct values, and what the chart already shows. */
export function profileData(spec: WidgetSpec, rows: Row[]): DataProfile {
  const kinds = new Map<string, "number" | "date" | "category" | "flag">();
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (kinds.has(key) || value === null || value === undefined) continue;
      if (typeof value === "number") kinds.set(key, "number");
      else if (typeof value === "boolean") kinds.set(key, "flag");
      else if (typeof value === "string") kinds.set(key, DATE.test(value) ? "date" : "category");
    }
  }
  const view = spec.view ?? { type: "table" };
  const band = view.band as { low?: string; high?: string } | undefined;
  const aside = new Set([band?.low, band?.high].filter((f): f is string => typeof f === "string"));
  const used = usedFields(spec);
  const ordered = (kind: string) => {
    const all = [...kinds.entries()].filter(([, k]) => k === kind).map(([key]) => key);
    return [...used.filter((f) => all.includes(f)), ...all.filter((f) => !used.includes(f))];
  };
  const numbers = ordered("number").filter((f) => !aside.has(f));
  const target = numbers.find((f) => TARGET_NAME.test(f));
  const measures = numbers.filter((f) => f !== target);
  const categories = ordered("category");
  const times = ordered("date");
  const distinct: Record<string, number> = {};
  for (const key of kinds.keys()) distinct[key] = new Set(rows.map((row) => String(row[key]))).size;
  const [first, second] = categories;
  const pairs = first && second ? new Set(rows.map((row) => `${String(row[first])}\u0000${String(row[second])}`)).size : 0;
  const grid = first && second ? (distinct[first] ?? 0) * (distinct[second] ?? 0) : 0;
  const fan: Record<string, unknown> = {};
  if (typeof view.forecast === "string") fan.forecast = view.forecast;
  if (band) fan.band = band;
  return {
    title: spec.title ?? spec.id ?? "this chart",
    measures,
    categories,
    times,
    ...(target ? { target } : {}),
    rows: rows.length,
    distinct,
    negatives: rows.some((row) => measures.some((f) => typeof row[f] === "number" && (row[f] as number) < 0)),
    daily: times[0] !== undefined && rows.every((row) => typeof row[times[0] as string] !== "string" || DAY.test(String(row[times[0] as string]))),
    crossed: grid > 0 && pairs / grid >= 0.5,
    stacked: Boolean((spec.view as { stacked?: unknown } | undefined)?.stacked),
    view: String(view.type ?? "table"),
    fan,
  };
}

/** What a pattern adds beyond the view. */
interface Draft {
  view: ViewSpec;
  headline?: WidgetSpec["headline"];
  facet?: WidgetSpec["facet"];
  transform?: TransformSpec[];
  fields?: WidgetSpec["fields"];
}

interface Pattern {
  id: string;
  /** The form in plain words: "lollipops". */
  form: string;
  moves: Move[];
  marks: Marks;
  fits(d: DataProfile): boolean;
  make(d: DataProfile, spec: WidgetSpec): Draft;
}

const m1 = (d: DataProfile) => d.measures[0] as string;
const m2 = (d: DataProfile) => d.measures[1] as string;
const c1 = (d: DataProfile) => d.categories[0] as string;
const c2 = (d: DataProfile) => d.categories[1] as string;
const t1 = (d: DataProfile) => d.times[0] as string;
/** One row per category: a ranking or a part-to-whole. */
const perCategory = (d: DataProfile, min: number, max: number) => d.categories.length > 0 && d.measures.length > 0 && d.distinct[c1(d)] === d.rows && d.rows >= min && d.rows <= max;
/** One row per period: a time series. */
const perPeriod = (d: DataProfile, min = 3) => d.times.length > 0 && d.measures.length > 0 && d.distinct[t1(d)] === d.rows && d.rows >= min;
const positive = (d: DataProfile) => !d.negatives;
const PERIOD_WORD = /(19|20)\d\d|q[1-4]|before|after|previous|prior|last|current|this|start|end|from|to$/i;
/** The first two measures read as one measure at two times (revenue2025 and revenue2026, before and after). */
const periodPair = (d: DataProfile) => d.measures.length > 1 && PERIOD_WORD.test(m1(d)) && PERIOD_WORD.test(m2(d));
/** Several periods per category: long data, time by group. */
const timeByGroup = (d: DataProfile) => d.times.length > 0 && d.categories.length > 0 && d.measures.length > 0 && (d.distinct[t1(d)] ?? 0) < d.rows;
const twoLevels = (d: DataProfile) => d.categories.length > 1 && d.measures.length > 0 && (d.distinct[c1(d)] ?? 0) < d.rows;

/** The pattern library: each form the Taller knows, what data it needs, and how it draws the chart's own fields. */
const PATTERNS: Pattern[] = [
  {
    id: "lollipops",
    form: "lollipops",
    moves: ["distill", "reform"],
    marks: "sharp",
    fits: (d) => perCategory(d, 3, 30),
    make: (d) => ({ view: { type: "hbar", label: c1(d), value: m1(d), mark: "lollipop" } }),
  },
  {
    id: "bars",
    form: "bars",
    moves: ["reform"],
    marks: "sharp",
    fits: (d) => perCategory(d, 2, 24),
    make: (d) => ({ view: { type: "bar", x: c1(d), y: m1(d) } }),
  },
  {
    id: "donut",
    form: "a donut",
    moves: ["decompose"],
    marks: "smooth",
    fits: (d) => perCategory(d, 2, 6) && positive(d),
    make: (d) => ({ view: { type: "donut", label: c1(d), value: m1(d) } }),
  },
  {
    id: "waffle",
    form: "a waffle of 100 squares",
    moves: ["decompose"],
    marks: "sharp",
    fits: (d) => perCategory(d, 2, 6) && positive(d),
    make: (d) => ({ view: { type: "waffle", label: c1(d), value: m1(d) } }),
  },
  {
    id: "treemap",
    form: "a treemap",
    moves: ["decompose", "reform"],
    marks: "sharp",
    fits: (d) => perCategory(d, 4, 40) && positive(d),
    make: (d) => ({ view: { type: "treemap", label: c1(d), value: m1(d) } }),
  },
  {
    id: "pareto",
    form: "a Pareto",
    moves: ["distill", "reveal"],
    marks: "sharp",
    fits: (d) => perCategory(d, 4, 30) && positive(d),
    make: (d) => ({ view: { type: "pareto", label: c1(d), value: m1(d) } }),
  },
  {
    id: "top-five",
    form: "the top five",
    moves: ["distill"],
    marks: "sharp",
    fits: (d) => perCategory(d, 8, 200),
    make: (d, spec) => ({
      view: { type: "hbar", label: c1(d), value: m1(d) },
      transform: [...(spec.transform ?? []), { type: "sort", field: m1(d), order: "desc" }, { type: "limit", count: 5 }],
    }),
  },
  {
    id: "average-line",
    form: "bars with their average line",
    moves: ["reframe", "combine"],
    marks: "sharp",
    fits: (d) => perCategory(d, 3, 24),
    make: (d) => ({ view: { type: "bar", x: c1(d), y: m1(d), reference: [{ field: m1(d), agg: "avg", label: "Average" }] } }),
  },
  {
    id: "table-bars",
    form: "a table with bars in its cells",
    moves: ["combine"],
    marks: "sharp",
    fits: (d) => d.measures.length > 0 && d.categories.length > 0 && d.rows <= 30,
    make: (d, spec) => ({
      view: { type: "table", sortable: true },
      fields: { ...spec.fields, [m1(d)]: { ...spec.fields?.[m1(d)], format: { type: "bar", ...(spec.fields?.[m1(d)]?.format ? { format: spec.fields[m1(d)]?.format } : {}) } } },
    }),
  },
  {
    id: "list",
    form: "a short list",
    moves: ["distill"],
    marks: "smooth",
    fits: (d) => perCategory(d, 2, 12),
    make: (d) => ({ view: { type: "list", label: c1(d), value: m1(d) } }),
  },
  {
    id: "headline-bars",
    form: "a headline number over bars",
    moves: ["combine"],
    marks: "sharp",
    fits: (d) => perCategory(d, 2, 24),
    make: (d) => ({ view: { type: "hbar", label: c1(d), value: m1(d) }, headline: { value: m1(d), agg: "sum" } }),
  },
  {
    id: "target-line",
    form: "bars with their target line",
    moves: ["reframe", "combine"],
    marks: "sharp",
    fits: (d) => perCategory(d, 2, 24) && d.target !== undefined,
    make: (d) => ({ view: { type: "bar", x: c1(d), y: m1(d), lines: d.target as string } }),
  },
  {
    id: "variance",
    form: "a variance against target",
    moves: ["reframe", "contrast"],
    marks: "sharp",
    fits: (d) => perCategory(d, 2, 24) && d.target !== undefined,
    make: (d) => ({ view: { type: "variance", label: c1(d), value: m1(d), target: d.target as string } }),
  },
  {
    id: "bullet",
    form: "bullet bars",
    moves: ["reframe"],
    marks: "sharp",
    fits: (d) => perCategory(d, 2, 12) && d.target !== undefined,
    make: (d) => ({ view: { type: "bullet", label: c1(d), value: m1(d), target: d.target as string } }),
  },
  {
    id: "dumbbell",
    form: "dumbbells from one measure to the other",
    moves: ["contrast"],
    marks: "sharp",
    fits: (d) => perCategory(d, 2, 20) && d.measures.length > 1,
    make: (d) => ({ view: { type: "dumbbell", label: c1(d), from: m1(d), to: m2(d) } }),
  },
  {
    id: "slope",
    form: "slopes",
    moves: ["contrast"],
    marks: "smooth",
    fits: (d) => perCategory(d, 2, 16) && periodPair(d),
    make: (d) => {
      // From the earliest period to the latest, whatever order the chart lists them in: April to September, not April to May.
      const periods = d.measures.filter((m) => PERIOD_WORD.test(m)).sort();
      const [from, to] = periods.length > 1 ? [periods[0], periods.at(-1)] : [m1(d), m2(d)].sort();
      return { view: { type: "slope", label: c1(d), from: from as string, to: to as string } };
    },
  },
  {
    id: "radar",
    form: "a radar profile",
    moves: ["reform"],
    marks: "smooth",
    fits: (d) => perCategory(d, 3, 10) && positive(d),
    make: (d) => ({ view: { type: "radar", label: c1(d), y: d.measures.slice(0, 3) } }),
  },
  {
    id: "line",
    form: "a line",
    moves: ["reform"],
    marks: "smooth",
    fits: (d) => perPeriod(d),
    make: (d) => ({ view: { type: "line", x: t1(d), y: d.measures.slice(0, 4), ...d.fan } }),
  },
  {
    id: "washes",
    form: "smooth washes",
    moves: ["reform"],
    marks: "smooth",
    fits: (d) => perPeriod(d) && d.measures.length <= 2,
    make: (d) => ({ view: { type: "area", x: t1(d), y: d.measures.slice(0, 2), curve: "smooth", ...d.fan } }),
  },
  {
    id: "steps",
    form: "steps",
    moves: ["reform"],
    marks: "sharp",
    fits: (d) => perPeriod(d, 4),
    make: (d) => ({ view: { type: "line", x: t1(d), y: d.measures.slice(0, 3), curve: "step", ...d.fan } }),
  },
  {
    id: "time-bars",
    form: "bars in time",
    moves: ["reform"],
    marks: "sharp",
    fits: (d) => perPeriod(d) && d.rows <= 40,
    make: (d) => ({ view: { type: "bar", x: t1(d), y: m1(d) } }),
  },
  {
    id: "time-lollipops",
    form: "lollipops in time",
    moves: ["distill", "reform"],
    marks: "sharp",
    fits: (d) => perPeriod(d) && d.rows <= 40,
    make: (d) => ({ view: { type: "bar", x: t1(d), y: m1(d), mark: "lollipop" } }),
  },
  {
    id: "headline-line",
    form: "a headline number over a line",
    moves: ["combine"],
    marks: "smooth",
    fits: (d) => perPeriod(d),
    make: (d) => ({ view: { type: "line", x: t1(d), y: m1(d), ...d.fan }, headline: { value: m1(d), agg: "last", compare: "previous" } }),
  },
  {
    id: "stream",
    form: "a streamgraph",
    moves: ["decompose", "reveal"],
    marks: "smooth",
    fits: (d) => perPeriod(d, 6) && d.measures.length >= 3 && positive(d),
    make: (d) => ({ view: { type: "area", x: t1(d), y: d.measures.slice(0, 8), stacked: "stream" } }),
  },
  {
    id: "horizon",
    form: "horizon rows",
    moves: ["decompose", "reveal"],
    marks: "sharp",
    fits: (d) => perPeriod(d, 8) && d.measures.length >= 2,
    make: (d) => ({ view: { type: "horizon", x: t1(d), y: d.measures.slice(0, 8) } }),
  },
  {
    id: "shares",
    form: "a mix in shares",
    moves: ["reframe", "decompose"],
    marks: "smooth",
    fits: (d) => perPeriod(d) && d.measures.length >= 2 && positive(d),
    make: (d) => ({ view: { type: "area", x: t1(d), y: d.measures.slice(0, 6), stacked: "percent" } }),
  },
  {
    id: "spark",
    form: "one number with its sparkline",
    moves: ["distill"],
    marks: "smooth",
    fits: (d) => perPeriod(d),
    make: (d) => ({ view: { type: "kpi", value: m1(d), x: t1(d), series: true } }),
  },
  {
    id: "numbers",
    form: "a row of numbers",
    moves: ["distill"],
    marks: "smooth",
    fits: (d) => d.measures.length >= 2 && (perPeriod(d, 1) || d.rows === 1),
    make: (d) => ({ view: { type: "kpis", items: d.measures.slice(0, 3).map((value) => ({ value })) } }),
  },
  {
    id: "calendar",
    form: "a calendar of days",
    moves: ["reveal"],
    marks: "sharp",
    fits: (d) => perPeriod(d, 28) && d.daily,
    make: (d) => ({ view: { type: "calendar", date: t1(d), value: m1(d) } }),
  },
  {
    id: "rose",
    form: "a rose dial",
    moves: ["reveal", "reform"],
    marks: "smooth",
    fits: (d) => (perPeriod(d, 6) || perCategory(d, 6, 24)) && d.rows <= 24 && positive(d),
    // Wedges stack only numbers that add up: the parts the chart already stacked. Otherwise one measure, never
    // revenue on top of a customer count or a profit on top of the revenue it comes from.
    make: (d) => ({ view: { type: "rose", label: d.times[0] ?? c1(d), y: d.stacked ? d.measures.slice(0, 4) : m1(d) } }),
  },
  {
    id: "histogram",
    form: "a histogram",
    moves: ["reveal"],
    marks: "sharp",
    fits: (d) => d.measures.length > 0 && d.rows >= 12,
    make: (d) => ({ view: { type: "histogram", value: m1(d) } }),
  },
  {
    id: "beeswarm",
    form: "a swarm of dots",
    moves: ["reveal"],
    marks: "sharp",
    fits: (d) => d.measures.length > 0 && d.rows >= 8 && d.rows <= 400,
    make: (d) => {
      const group = d.categories.find((c) => (d.distinct[c] ?? 0) >= 2 && (d.distinct[c] ?? 0) <= 6);
      // The field that names each row (an account, a deal), so every dot says what it is.
      const label = d.categories.find((c) => d.distinct[c] === d.rows);
      return { view: { type: "beeswarm", value: m1(d), ...(group ? { group } : {}), ...(label ? { label } : {}) } };
    },
  },
  {
    id: "boxplot",
    form: "boxes and whiskers",
    moves: ["reveal", "distill"],
    marks: "sharp",
    fits: (d) => d.measures.length > 0 && d.rows >= 8 && d.categories.some((c) => (d.distinct[c] ?? 0) >= 2 && (d.distinct[c] ?? 0) <= 8 && (d.distinct[c] ?? 0) < d.rows),
    make: (d) => ({ view: { type: "boxplot", value: m1(d), group: d.categories.find((c) => (d.distinct[c] ?? 0) >= 2 && (d.distinct[c] ?? 0) <= 8 && (d.distinct[c] ?? 0) < d.rows) as string } }),
  },
  {
    id: "scatter",
    form: "a scatter of two measures",
    moves: ["combine", "reveal"],
    marks: "sharp",
    fits: (d) => d.measures.length > 1 && d.rows >= 5,
    make: (d) => ({ view: { type: "scatter", x: m1(d), y: m2(d), ...(d.categories[0] ? { label: c1(d) } : {}) } }),
  },
  {
    id: "small-multiples",
    form: "small multiples",
    moves: ["decompose"],
    marks: "sharp",
    fits: (d) => ((twoLevels(d) && d.crossed) || (timeByGroup(d) && !twoLevels(d))) && (d.distinct[c1(d)] ?? 0) <= 8 && d.rows <= 240,
    make: (d) =>
      timeByGroup(d) && !twoLevels(d)
        ? { view: { type: "line", x: t1(d), y: m1(d) }, facet: { field: c1(d) } }
        : { view: { type: "bar", x: c2(d), y: m1(d) }, facet: { field: c1(d) } },
  },
  {
    id: "sunburst",
    form: "a sunburst",
    moves: ["decompose", "reform"],
    marks: "smooth",
    fits: (d) => twoLevels(d) && positive(d) && (d.distinct[c1(d)] ?? 0) <= 8,
    make: (d) => ({ view: { type: "sunburst", levels: [c1(d), c2(d)], value: m1(d) } }),
  },
  {
    id: "icicle",
    form: "an icicle",
    moves: ["decompose"],
    marks: "sharp",
    fits: (d) => twoLevels(d) && positive(d) && (d.distinct[c1(d)] ?? 0) <= 8,
    make: (d) => ({ view: { type: "icicle", levels: [c1(d), c2(d)], value: m1(d) } }),
  },
  {
    id: "heatmap",
    form: "a heat table of cells",
    moves: ["reveal", "reform"],
    marks: "sharp",
    // Up to 6 columns, so every column heading has room on a card.
    fits: (d) => twoLevels(d) && d.crossed && (d.distinct[c2(d)] ?? 0) <= 6,
    make: (d) => ({ view: { type: "heatmap", x: c2(d), y: c1(d), value: m1(d) } }),
  },
  {
    id: "marimekko",
    form: "a marimekko of size and mix",
    moves: ["combine", "decompose"],
    marks: "sharp",
    fits: (d) => twoLevels(d) && d.crossed && positive(d) && (d.distinct[c1(d)] ?? 0) <= 8 && (d.distinct[c2(d)] ?? 0) <= 8,
    make: (d) => ({ view: { type: "marimekko", x: c1(d), series: c2(d), value: m1(d) } }),
  },
  {
    id: "bump",
    form: "a bump of ranks",
    moves: ["reframe"],
    marks: "smooth",
    fits: (d) => timeByGroup(d) && (d.distinct[c1(d)] ?? 0) >= 3 && (d.distinct[c1(d)] ?? 0) <= 10,
    make: (d) => ({ view: { type: "bump", x: t1(d), series: c1(d), value: m1(d) } }),
  },
];

/** Views the Taller can steer with `highlight`, for one standout item against the rest in grey. */
const HIGHLIGHTABLE = new Set(["bar", "hbar", "line", "area"]);
/** Views whose colors follow the categories rather than the series. */
const BY_CATEGORY = new Set(["donut", "waffle", "treemap", "sunburst", "icicle", "marimekko", "pareto"]);
/** Families of views: a version in another family than the original brings surprise. */
const FAMILY: Record<string, string> = {
  bar: "rank", hbar: "rank", list: "rank", pareto: "rank", bullet: "target", variance: "target",
  line: "time", area: "time", kpi: "number", kpis: "number", calendar: "time", horizon: "time", bump: "time",
  donut: "whole", waffle: "whole", treemap: "whole", sunburst: "hierarchy", icicle: "hierarchy", marimekko: "whole",
  histogram: "spread", beeswarm: "spread", boxplot: "spread", ridgeline: "spread",
  scatter: "relation", dumbbell: "relation", slope: "relation", radar: "profile", rose: "cycle",
  table: "table", heatmap: "table", sankey: "flow", funnel: "flow", chord: "flow", waterfall: "change",
};
/** Forms that surprise on any table: rare and playful. */
const RARE = new Set(["rose", "horizon", "icicle", "beeswarm", "waffle", "marimekko", "calendar", "sunburst", "radar", "chord"]);


/** A small seeded random generator (mulberry32): the same seed, the same versions. */
function seeded(seed: number): () => number {
  let a = Math.floor(seed) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Warm hues (reds, oranges, yellows, pinks) or cool ones (greens, teals, blues, purples). */
const warmth = (hue: number): "warm" | "cool" | "mid" => (hue < 95 || hue >= 330 ? "warm" : hue >= 150 && hue < 300 ? "cool" : "mid");

/** Every vivid color in the palette library that reads well on a light card, by warmth. */
function vividColors(): Record<"warm" | "cool", string[]> {
  const seen = new Set<string>();
  const out: Record<"warm" | "cool", string[]> = { warm: [], cool: [] };
  for (const palette of describePalettes()) {
    for (const color of palette.colors) {
      const hex = color.toLowerCase();
      if (seen.has(hex)) continue;
      seen.add(hex);
      const [l, c, h] = oklch(hex);
      if (c < 0.1 || l < 0.46 || l > 0.74) continue;
      const kind = warmth(h);
      if (kind !== "mid") out[kind].push(hex);
    }
  }
  return out;
}

/**
 * A palette of `size` warm or cool colors from the library, every neighbour apart for colorblind readers and
 * for everyone: built greedily from a seeded start and kept only if `checkPalette` passes its colorblind and
 * neighbour checks. Null when the library cannot make one that safe.
 */
export function huePalette(kind: "warm" | "cool", size: number, seed = 1): string[] | null {
  const pool = vividColors()[kind];
  if (pool.length === 0) return null;
  const n = Math.max(1, Math.min(6, size));
  const random = seeded(seed);
  const starts = [...pool].sort((a, b) => oklch(b)[1] - oklch(a)[1]);
  const offset = Math.floor(random() * Math.min(3, starts.length));
  for (let k = 0; k < starts.length; k++) {
    const chosen = [starts[(k + offset) % starts.length] as string];
    while (chosen.length < n) {
      const last = chosen.at(-1) as string;
      const next = pool
        .filter((c) => !chosen.includes(c))
        .map((c) => ({ c, score: Math.min(deltaE(c, last, "deutan"), deltaE(c, last) / 2, ...chosen.map((x) => deltaE(c, x))) }))
        .sort((a, b) => b.score - a.score)[0];
      if (!next) break;
      chosen.push(next.c);
    }
    if (chosen.length < n) return null;
    const report = checkPalette(chosen, { mode: "light" });
    const state = (name: string) => report.checks.find((check) => check.name === name)?.state;
    if (state("cvd") !== "fail" && state("normal") !== "fail" && state("lightness") !== "fail" && state("chroma") !== "fail") return chosen;
  }
  return null;
}

/** How many colors a view paints: its series, or its categories for part-to-whole views. */
function colorsNeeded(view: ViewSpec, d: DataProfile): number {
  const y = view.y;
  if (BY_CATEGORY.has(String(view.type))) {
    const field = Array.isArray(view.levels) ? String(view.levels[0]) : String(view.label ?? view.series ?? view.x ?? "");
    return d.distinct[field] ?? 1;
  }
  return Array.isArray(y) ? y.length : 1;
}

/** What a spec draws and the extras it carries, scored on the five qualities from 0 to 1. */
export function qualitiesOf(spec: WidgetSpec, rows: Row[], source?: WidgetSpec): Qualities {
  const view = spec.view ?? { type: "table" };
  const type = String(view.type);
  const base: Record<string, [number, number, number, number, number]> = {
    kpi: [0.7, 0.1, 0.1, 0.05, 0.3], kpis: [0.6, 0.15, 0.1, 0.1, 0.35], table: [0.15, 0.05, 0.25, 0.2, 0.35], list: [0.25, 0.05, 0.1, 0.1, 0.2],
    bar: [0.3, 0.1, 0.1, 0.4, 0.25], hbar: [0.35, 0.1, 0.1, 0.35, 0.25], line: [0.2, 0.15, 0.15, 0.15, 0.35], area: [0.2, 0.15, 0.1, 0.45, 0.3],
    donut: [0.3, 0.15, 0.05, 0.4, 0.2], waffle: [0.3, 0.3, 0.05, 0.45, 0.2], treemap: [0.25, 0.25, 0.05, 0.55, 0.2], pareto: [0.3, 0.25, 0.3, 0.4, 0.45],
    histogram: [0.15, 0.25, 0.25, 0.4, 0.35], beeswarm: [0.15, 0.35, 0.25, 0.3, 0.35], boxplot: [0.15, 0.3, 0.4, 0.2, 0.4],
    scatter: [0.15, 0.3, 0.2, 0.25, 0.45], dumbbell: [0.25, 0.3, 0.3, 0.2, 0.45], slope: [0.25, 0.35, 0.3, 0.15, 0.45],
    variance: [0.35, 0.25, 0.6, 0.3, 0.45], bullet: [0.3, 0.2, 0.4, 0.3, 0.45], sunburst: [0.25, 0.35, 0.05, 0.5, 0.3], icicle: [0.25, 0.35, 0.05, 0.5, 0.35],
    heatmap: [0.2, 0.3, 0.2, 0.55, 0.35], marimekko: [0.2, 0.4, 0.1, 0.55, 0.35], horizon: [0.2, 0.45, 0.35, 0.45, 0.4], calendar: [0.2, 0.4, 0.15, 0.5, 0.3],
    rose: [0.25, 0.5, 0.05, 0.45, 0.25], radar: [0.2, 0.4, 0.1, 0.35, 0.35], bump: [0.25, 0.35, 0.2, 0.2, 0.4],
  };
  const [emphasis, surprise, honesty, detail, insight] = base[type] ?? [0.25, 0.2, 0.1, 0.3, 0.3];
  const t: Qualities = { emphasis, surprise, honesty, detail, insight };
  const headline = spec.headline as { compare?: unknown } | undefined;
  if (headline) {
    t.emphasis += 0.25;
    t.insight += headline.compare ? 0.2 : 0.1;
  }
  if (view.highlight) t.emphasis += 0.2;
  if (Array.isArray(view.reference) && view.reference.length) {
    t.insight += 0.2;
    t.honesty += 0.05;
  }
  if (view.lines) {
    t.insight += 0.2;
    t.honesty += 0.15;
  }
  if (view.forecast || view.band) {
    t.insight += 0.25;
    t.honesty += 0.2;
  }
  if (spec.facet) {
    t.insight += 0.15;
    t.surprise += 0.1;
    t.detail += 0.1;
  }
  if (view.stacked === "stream") {
    t.detail += 0.15;
    t.surprise += 0.25;
  } else if (view.stacked) t.detail += 0.15;
  if (view.mark === "lollipop") {
    t.detail -= 0.2;
    t.surprise += 0.1;
  }
  if (view.curve === "smooth" || view.curve === "step") t.surprise += 0.05;
  if (Array.isArray(view.y) && view.y.length > 1) t.insight += 0.15;
  const marks = rows.length * (Array.isArray(view.y) ? view.y.length : 1);
  if (marks > 200) t.detail += 0.3;
  else if (marks > 60) t.detail += 0.15;
  const formats = Object.values(spec.fields ?? {}).map((f) => (typeof f?.format === "object" ? (f.format as { type?: string }).type : f?.format));
  if (formats.includes("bar")) t.emphasis += 0.1;
  if (formats.includes("delta")) t.honesty += 0.15;
  if (formats.includes("heat")) t.detail += 0.1;
  const negatives = rows.some((row) => Object.values(row).some((v) => typeof v === "number" && v < 0));
  if (negatives && ["bar", "variance", "line", "waterfall", "horizon", "table"].includes(type)) t.honesty += 0.15;
  if ((spec.transform?.length ?? 0) > (source?.transform?.length ?? spec.transform?.length ?? 0)) {
    t.detail -= 0.1;
    t.emphasis += 0.05;
  }
  if (source) {
    const sourceType = String(source.view?.type ?? "table");
    if ((FAMILY[type] ?? type) !== (FAMILY[sourceType] ?? sourceType)) t.surprise += 0.2;
    if (RARE.has(type) && type !== sourceType) t.surprise += 0.1;
  }
  t.detail += 0.2 * Math.max(0, fillsOf(spec) - 1);
  for (const quality of QUALITIES) t[quality] = Math.round(Math.max(0, Math.min(1, t[quality])) * 100) / 100;
  return t;
}

/** The filled layers a chart carries: washes, streams, bands and shaded cells. */
export function fillsOf(spec: WidgetSpec): number {
  const view = spec.view ?? {};
  let fills = 0;
  if (view.type === "area") fills += 1;
  if (view.band) fills += 1;
  if (view.type === "heatmap" || view.type === "calendar") fills += 1;
  const formats = Object.values(spec.fields ?? {}).map((f) => (typeof f?.format === "object" ? (f.format as { type?: string }).type : f?.format));
  if (formats.includes("heat")) fills += 1;
  return fills;
}

const TOO: Record<Quality, string> = {
  emphasis: "everything shouts",
  surprise: "it surprises more than it explains",
  honesty: "it shows only what went wrong",
  detail: "it is heavy to read",
  insight: "it tries to say too much at once",
};

/**
 * Whether a chart is balanced: no quality dominating, none it needs missing, at most one filled layer. The note is
 * read next to the chart.
 */
export function balanceOf(qualities: Qualities, fills = 0): Balance {
  const [top, second] = [...QUALITIES].sort((a, b) => qualities[b] - qualities[a]) as [Quality, Quality];
  if (fills > 1) return { ok: false, note: "too much detail: two filled layers" };
  if (qualities[top] >= 0.9 && qualities[top] - qualities[second] >= 0.35) return { ok: false, note: `too much ${top}: ${TOO[top]}` };
  const total = QUALITIES.reduce((sum, quality) => sum + qualities[quality], 0);
  if (total < 0.9) return { ok: false, note: "too plain: it needs emphasis or insight" };
  if (qualities.insight < 0.15 && qualities.emphasis < 0.2) return { ok: false, note: "too plain: nothing stands out and nothing to learn" };
  const hint = qualities.detail >= 0.7 ? ", with a lot of detail" : qualities.emphasis >= 0.75 ? ", with strong emphasis" : "";
  return { ok: true, note: `balanced: mostly ${top} and ${second}${hint}` };
}

const COLOR_PLAIN: Record<ColorEmphasis, string> = { warm: "warm colors", cool: "cool colors", standout: "one standout color", standard: "standard colors" };
const MARKS_PLAIN: Record<Marks, string> = { smooth: "smooth curves", sharp: "sharp marks" };
const LOOK_PLAIN: Record<Look, string> = { paper: "paper card", airy: "open layout, no card", glass: "glass card", default: "standard card" };

/** A version's lineage in plain words, for a result card: the move, what it adds, the colors, the marks and the card. */
export function plainTags(variant: Pick<Variant, "lineage" | "spec">): string[] {
  const { lineage, spec } = variant;
  const view = spec.view ?? {};
  const extras = [
    view.highlight ? "shows one standout" : "",
    spec.headline ? "headline number" : "",
    view.lines || (Array.isArray(view.reference) && view.reference.length > 0) ? "reference line" : "",
    spec.facet ? "one small chart each" : "",
  ].filter(Boolean);
  return [...new Set([MOVES[lineage.move].label.toLowerCase(), ...extras, COLOR_PLAIN[lineage.color], MARKS_PLAIN[lineage.marks], LOOK_PLAIN[lineage.look]])];
}

/** The shape of a chart, ignoring its colors and card: two versions with one shape are the same version. */
function shapeOf(spec: WidgetSpec): string {
  const view = spec.view ?? {};
  const fields = Object.entries(spec.fields ?? {})
    .map(([name, field]) => `${name}:${typeof field?.format === "object" ? (field.format as { type?: string }).type : (field?.format ?? "")}`)
    .sort();
  return JSON.stringify({
    type: view.type,
    mark: view.mark ?? "bar",
    curve: view.curve ?? "linear",
    stacked: view.stacked ?? false,
    lines: view.lines ?? null,
    reference: Array.isArray(view.reference) && view.reference.length > 0,
    highlight: Boolean(view.highlight),
    headline: Boolean(spec.headline),
    facet: (spec.facet as { field?: string } | undefined)?.field ?? null,
    steps: spec.transform?.length ?? 0,
    formats: fields.filter((f) => /:(bar|delta|heat)$/.test(f)),
  });
}

/** A short, safe widget id for a version, so each one wears its own ghost ref. */
function variantId(spec: WidgetSpec, pattern: string): string {
  const base = (spec.id ?? "chart").toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40);
  return `${base}-taller-${pattern}`.slice(0, 64).replace(/-+$/, "");
}

/**
 * Makes new versions of one chart. Each keeps the chart's data, transforms and fields (its numbers) and changes the
 * form through one of the seven sales moves, with its colors, marks and card. Every version says which sales
 * question it answers, is scored on the five qualities, and is kept only if balanced, valid (`validateSpec` with no
 * errors), colorblind safe, and new: never the original's shape, never another version's.
 */
export function createVariants(spec: WidgetSpec, rows: Row[], options: TallerOptions = {}): Variant[] {
  const count = Math.max(1, Math.min(24, options.count ?? 6));
  const random = seeded(options.seed ?? 1);
  const color = Math.max(-1, Math.min(1, options.color ?? 0));
  const marks = Math.max(-1, Math.min(1, options.marks ?? 0));
  const allowed = new Set<Move>(options.moves?.length ? options.moves : (Object.keys(MOVES) as Move[]));
  const served = new Set<Move>(options.audience ? AUDIENCES[options.audience].moves : []);
  const data = profileData(spec, rows);

  // Every pattern the data can take, once per move it carries out, weighed by the requested marks, the audience and a seeded random share.
  const wanted: Marks | null = marks > 0.2 ? "sharp" : marks < -0.2 ? "smooth" : null;
  const candidates = PATTERNS.filter((pattern) => pattern.fits(data)).flatMap((pattern) =>
    pattern.moves
      .filter((move) => allowed.has(move))
      .map((move) => ({ pattern, move, weight: (wanted && pattern.marks === wanted ? Math.abs(marks) : 0) + (served.has(move) ? 1 : 0) + (RARE.has(pattern.id) ? 0.1 : 0) + random() })),
  );
  candidates.sort((a, b) => b.weight - a.weight);

  const pickColor = (view: ViewSpec): ColorEmphasis => {
    const roll = random() * 2 - 1 + color;
    if (roll > 0.55) return "warm";
    if (roll < -0.55) return "cool";
    if (HIGHLIGHTABLE.has(String(view.type)) && random() < 0.5) return "standout";
    return random() < 0.5 ? (random() < 0.5 + color / 2 ? "warm" : "cool") : "standard";
  };
  const pickLook = (tone: ColorEmphasis, feel: Marks): Look => {
    const roll = random();
    if (tone === "cool" && roll < 0.5) return "glass";
    if (feel === "smooth" && roll < 0.6) return "airy";
    if (feel === "sharp" && roll < 0.6) return "paper";
    return roll < 0.8 ? "default" : feel === "smooth" ? "airy" : "paper";
  };

  const shapes = new Set<string>([shapeOf(spec)]);
  const perMove = new Map<Move, number>();
  const usedPatterns = new Set<string>();
  const versions: Variant[] = [];
  for (const { pattern, move } of candidates) {
    if (versions.length >= count) break;
    if (usedPatterns.has(pattern.id) || (perMove.get(move) ?? 0) >= Math.max(2, Math.ceil(count / 3))) continue;
    const draft = pattern.make(data, spec);
    const view: ViewSpec = { ...draft.view };
    const feel: Marks = view.type === "line" || view.type === "area" ? (view.curve === "step" ? "sharp" : wanted === "sharp" && !view.curve && !view.stacked ? "sharp" : pattern.marks) : pattern.marks;
    if ((view.type === "line" || view.type === "area") && !view.curve && !view.stacked && !view.forecast) view.curve = feel === "smooth" ? "smooth" : "step";

    // Color: warm or cool hues from the palette library, one standout item against grey, or the standard palette.
    let tone = pickColor(view);
    const style: StyleSpec = {};
    if (tone === "standout") {
      const item = standoutItem(view, rows, data);
      const warm = huePalette("warm", 1, (options.seed ?? 1) + versions.length);
      if (item && warm) {
        view.highlight = item;
        style.palette = Array.isArray(view.y) && view.y.length > 1 ? (huePalette("warm", view.y.length, (options.seed ?? 1) + versions.length) ?? warm) : warm;
      } else tone = "standard";
    }
    if (tone === "warm" || tone === "cool") {
      const palette = huePalette(tone, colorsNeeded(view, data), (options.seed ?? 1) + versions.length);
      if (palette) style.palette = palette;
      else tone = "standard";
    }
    const look = pickLook(tone, feel);
    if (look !== "default") style.preset = look;
    if (feel === "sharp" && random() < 0.5) style.density = "compact";

    const { id: _id, facet: _facet, headline: _headline, style: _style, ...rest } = spec;
    const variant: WidgetSpec = {
      ...rest,
      id: variantId(spec, pattern.id),
      view,
      ...(draft.headline ? { headline: draft.headline } : {}),
      ...(draft.facet ? { facet: draft.facet } : {}),
      ...(draft.transform ? { transform: draft.transform } : {}),
      ...(draft.fields ? { fields: draft.fields } : {}),
      ...(Object.keys(style).length ? { style } : {}),
    };

    // Crear es no copiar: a new shape every time, and in the original's own view at least two changes of form.
    const shape = shapeOf(variant);
    if (shapes.has(shape)) continue;
    if (view.type === spec.view?.type && !newForm(variant, spec)) continue;
    // Hygiene: valid, and a colorblind-safe palette when it brings its own.
    if (hasErrors(validateSpec(variant, rows))) continue;
    if (Array.isArray(style.palette) && style.palette.length > 1) {
      const cvd = checkPalette(style.palette, { mode: "light" }).checks.find((check) => check.name === "cvd")?.state;
      if (cvd === "fail") continue;
    }
    const qualities = qualitiesOf(variant, rows, spec);
    const balance = balanceOf(qualities, fillsOf(variant));
    if (!balance.ok) continue;

    shapes.add(shape);
    usedPatterns.add(pattern.id);
    perMove.set(move, (perMove.get(move) ?? 0) + 1);
    const question = questionOf(variant, rows);
    versions.push({
      spec: variant,
      move,
      lineage: { move, question: question.kind, form: pattern.form, color: tone, marks: feel, look },
      qualities,
      balance,
      question: question.text,
      // The field that names each row (an account, a deal) lets a title say what every row or dot is.
      ...explainVariant(variant, data.title, data.categories.find((c) => data.distinct[c] === data.rows)),
      seed: options.seed ?? 1,
      novelty: noveltyOf(variant, spec),
      meaning: meaningOf(qualities, balance),
    });
  }
  return versions;
}

const unit = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 100) / 100;

/**
 * How far a variant's form departs from its source, 0 to 1: another family of view counts most, then another view
 * in the same family, then each structural change (mark, curve, stacking, lines, reference, highlight, headline,
 * facet, extra steps, cell formats), and a rare form on top.
 */
export function noveltyOf(variant: WidgetSpec, source: WidgetSpec): number {
  const [vt, st] = [String(variant.view?.type ?? "table"), String(source.view?.type ?? "table")];
  let score = (FAMILY[vt] ?? vt) !== (FAMILY[st] ?? st) ? 0.45 : vt !== st ? 0.2 : 0;
  score += (0.35 * formChanges(variant, source)) / (Object.keys(JSON.parse(shapeOf(source))).length - 1);
  if (RARE.has(vt) && vt !== st) score += 0.2;
  return unit(score);
}

/**
 * Whether a version in the original's own view is new: it needs a new form (mark, curve or stacking) or two new
 * elements (lines, reference, highlight, headline, facet, extra steps, cell formats). Taking extras away is not
 * creating.
 */
function newForm(variant: WidgetSpec, source: WidgetSpec): boolean {
  const form = (s: WidgetSpec) => JSON.stringify([s.view?.mark ?? "bar", s.view?.curve ?? "linear", s.view?.stacked ?? false]);
  if (form(variant) !== form(source)) return true;
  const cellFormats = (s: WidgetSpec) =>
    Object.values(s.fields ?? {}).some((f) => ["bar", "delta", "heat"].includes(String(typeof f?.format === "object" ? (f.format as { type?: string }).type : f?.format)));
  const extras = (s: WidgetSpec) => [
    Boolean(s.view?.lines),
    Array.isArray(s.view?.reference) && s.view.reference.length > 0,
    Boolean(s.view?.highlight),
    Boolean(s.headline),
    Boolean(s.facet),
    (s.transform?.length ?? 0) > (source.transform?.length ?? 0),
    cellFormats(s),
  ];
  const [mine, theirs] = [extras(variant), extras(source)];
  return mine.filter((on, i) => on && !theirs[i]).length >= 2;
}

/** How many things about the form differ between two specs, the view type aside: mark, curve, stacking, lines and so on. */
function formChanges(a: WidgetSpec, b: WidgetSpec): number {
  const [x, y] = [JSON.parse(shapeOf(a)) as Record<string, unknown>, JSON.parse(shapeOf(b)) as Record<string, unknown>];
  return Object.keys(x).filter((key) => key !== "type" && JSON.stringify(x[key]) !== JSON.stringify(y[key])).length;
}

/** How much a chart says, 0 to 1: balanced first, then insight, honesty and evenness across the qualities, less heavy detail. */
export function meaningOf(qualities: Qualities, balance: Balance): number {
  const values = QUALITIES.map((quality) => qualities[quality]);
  const evenness = 1 - (Math.max(...values) - Math.min(...values));
  return unit((balance.ok ? 0.3 : 0) + 0.4 * qualities.insight + 0.15 * qualities.honesty + 0.15 * evenness - (qualities.detail > 0.7 ? 0.1 : 0));
}

/** Variants ranked by novelty, by meaning, or by both (their mean, the default), highest first. Returns a new list. */
export function rankVariants(variants: Variant[], by: "novelty" | "meaning" | "both" = "both"): Variant[] {
  const score = (v: Variant) => (by === "novelty" ? v.novelty : by === "meaning" ? v.meaning : (v.novelty + v.meaning) / 2);
  return [...variants].sort((x, y) => score(y) - score(x) || x.title.localeCompare(y.title));
}

/** The item to make the standout: the largest category, or the series that ends highest. */
function standoutItem(view: ViewSpec, rows: Row[], d: DataProfile): string | null {
  const type = String(view.type);
  if (type === "bar" || type === "hbar") {
    const label = String(type === "bar" ? view.x : view.label);
    const value = String(type === "bar" ? (Array.isArray(view.y) ? view.y[0] : view.y) : view.value);
    if (d.distinct[label] !== rows.length) return null;
    const top = [...rows].sort((a, b) => Number(b[value] ?? 0) - Number(a[value] ?? 0))[0];
    return top ? String(top[label]) : null;
  }
  if ((type === "line" || type === "area") && Array.isArray(view.y) && view.y.length > 1) {
    const last = rows.at(-1) ?? {};
    return [...view.y].map(String).sort((a, b) => Number(last[b] ?? 0) - Number(last[a] ?? 0))[0] ?? null;
  }
  return null;
}
