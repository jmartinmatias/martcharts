/**
 * The Taller: elBulli's creative method, applied to charts.
 *
 * Ferran Adrià's kitchen invented by method rather than by luck: an audit of
 * what a dish is made of, then a systematic variation of its techniques,
 * tools, temperatures, textures and plating, always guarded by taste. The
 * Taller does the same with a widget. The dish is a spec; its ingredients are
 * the fields of the rows it draws, and they are never altered or invented.
 * `createVariants` cooks a menu of new dishes from them, scores each on five
 * tastes (salty, acid, bitter, fatty, umami), and keeps only the balanced,
 * valid ones. Crear es no copiar: the menu never repeats the original, nor
 * itself.
 *
 * Runs in Node and the browser: no DOM.
 *
 * @module
 */
import { checkPalette, deltaE, oklch } from "./color.ts";
import { describePalettes } from "./palettes.ts";
import { getBlock } from "./registry.ts";
import { explainVariant } from "./taller-explain.ts";
import type { Row, StyleSpec, TransformSpec, ViewSpec, WidgetSpec } from "./types.ts";
import { hasErrors, validateSpec } from "./validate.ts";

/** The elBulli creative methods the Taller cooks with. */
export type Method = "association" | "adaptation" | "deconstruction" | "minimalism" | "change-of-state" | "technique-concept" | "sensory";
/** The five tastes a plate is balanced on. */
export type Taste = "salty" | "acid" | "bitter" | "fatty" | "umami";
export type Tastes = Record<Taste, number>;
/** Color temperature and emphasis: warm hues, cool hues, a hot highlight on a cold plate, or the house palette. */
export type Temperature = "hot" | "cold" | "contrast" | "room";
/** Soft (curves, washes, round marks) or crunchy (bars, steps, dots, cells). */
export type Texture = "soft" | "crunchy";
/** The plate: paper is white, airy is empty, glass is cold, default is the house plate. */
export type Plate = "white" | "empty" | "cold" | "house";
/** Utensils: tweezers place precisely, the squeeze bottle dresses finely, the knife cuts, the spoon fills. */
export type Tool = "tweezers" | "squeeze bottle" | "knife" | "spoon";

/** Where a variant comes from: every choice the kitchen made. */
export interface Lineage {
  method: Method;
  technique: string;
  tools: Tool[];
  temperature: Temperature;
  texture: Texture;
  plating: Plate;
}

/** Whether a plate is balanced, in one line. */
export interface Balance {
  ok: boolean;
  note: string;
}

/** One dish on the menu. Plain JSON, so a curated collection can be saved as it is. */
export interface Variant {
  spec: WidgetSpec;
  method: Method;
  lineage: Lineage;
  tastes: Tastes;
  balance: Balance;
  /** The dish in the kitchen's words, for the creating side: "Deconstructed revenue mix: a waffle, cold, crunchy, on a white plate". */
  menu: string;
  /** The chart in plain words, for results: "Account portfolio as a dot swarm: each dot is one row". */
  title: string;
  /** How to read it, in a sentence or two a ten-year-old can follow. */
  explain: string;
  /** The seed that cooked it: the same dish and seed give the same menu again. */
  seed: number;
  /** How far the form departs from the source, 0 to 1: another family of view, a new technique, new tools. */
  novelty: number;
  /** How much the plate says, 0 to 1: balance, depth (umami) and honesty (bitter). */
  meaning: number;
}

/** How to steer the kitchen. */
export interface TallerOptions {
  /** How many dishes, at most. Default 6. Simple dishes may give fewer. */
  count?: number;
  /** The same dish and seed always give the same menu. Default 1. */
  seed?: number;
  /** -1 cold to 1 hot. Default 0: a mix. */
  temperature?: number;
  /** -1 soft to 1 crunchy. Default 0: a mix. */
  texture?: number;
  /** Only these methods. Default: all. */
  methods?: Method[];
}

/** One kitchen term and what it means for a chart. */
export interface Equivalent {
  group: string;
  kitchen: string;
  chart: string;
}

/** The Diccionario: every kitchen term the Taller uses and its chart equivalent. */
export const DICTIONARY: Equivalent[] = [
  { group: "Ingredients", kitchen: "Products", chart: "The fields in the rows: measures (numbers), categories (names), time (dates), hierarchy levels. Never altered or invented." },
  { group: "Ingredients", kitchen: "The main product", chart: "The fields the dish already shows: the Taller cooks around them first." },
  { group: "Techniques", kitchen: "Deconstruction", chart: "Take a whole apart: stacked into small multiples, a donut into a waffle, a sunburst into an icicle, many series into horizon rows." },
  { group: "Techniques", kitchen: "Spherification", chart: "Values become dots: lollipops, a beeswarm, a scatter, dumbbells." },
  { group: "Techniques", kitchen: "Foam", chart: "Light, airy washes: a smooth area, a streamgraph." },
  { group: "Techniques", kitchen: "Reduction", chart: "Concentrate the flavor: a Pareto, boxes and whiskers, the top five." },
  { group: "Techniques", kitchen: "Infusion", chart: "A headline or a reference line soaked into a chart." },
  { group: "Tools", kitchen: "Tweezers (pinzas)", chart: "Precise placement: direct labels, end labels, one highlighted item, a reference label." },
  { group: "Tools", kitchen: "Squeeze bottle (biberón)", chart: "Fine dressing: 2px lines, sparklines, reference lines, dashed forecast strokes, thin lollipop stems." },
  { group: "Tools", kitchen: "Knife", chart: "Sharp cuts: bars, bins, cells." },
  { group: "Tools", kitchen: "Spoon and ladle", chart: "Fills: areas, donuts, tiles." },
  { group: "Soups and sauces", kitchen: "A sauce", chart: "The liquid elements: an area wash, a stream, a forecast band, heat cells. A dish rarely needs more than one." },
  { group: "Temperatures", kitchen: "Hot", chart: "Warm hues (reds, oranges, yellows), drawn from the palette library and checked for colorblind readers." },
  { group: "Temperatures", kitchen: "Cold", chart: "Cool hues (greens, blues, purples), quiet." },
  { group: "Temperatures", kitchen: "Hot on cold", chart: "One item highlighted in a warm color, the rest stepped back to grey." },
  { group: "Textures", kitchen: "Soft", chart: "Smooth curves, rounded marks, washes, airy space." },
  { group: "Textures", kitchen: "Crunchy", chart: "Bars, steps, sharp corners, dots, dense cells, compact spacing." },
  { group: "Plating", kitchen: "The plate", chart: "The preset: paper is the white plate, airy the empty plate, glass the cold plate, default the house plate." },
  { group: "Plating", kitchen: "The first bite", chart: "A headline number above the chart." },
  { group: "Tastes", kitchen: "Salty", chart: "Emphasis that brings out the data: a headline, a highlight, bold values. Too salty: everything shouts." },
  { group: "Tastes", kitchen: "Acid", chart: "Freshness and surprise: an unexpected but fitting form, or a precise annotation that cuts through." },
  { group: "Tastes", kitchen: "Bitter", chart: "Honesty: negatives, variance, targets missed, uncertainty. Small doses, never hidden." },
  { group: "Tastes", kitchen: "Fatty", chart: "Richness and ink: fills, stacks, many marks. Carries flavor, gets heavy fast." },
  { group: "Tastes", kitchen: "Umami", chart: "Depth of insight: comparison, reference, forecast, the story that completes the dish." },
  { group: "Methods", kitchen: "Association", chart: "Combine two techniques: bars with their target line, a headline over a chart." },
  { group: "Methods", kitchen: "Adaptation", chart: "A classic served in a new form." },
  { group: "Methods", kitchen: "Minimalism", chart: "Strip to the essence: lollipops, one number with its sparkline, a list." },
  { group: "Methods", kitchen: "Change of state", chart: "Chart to table, table to chart, time to distribution." },
  { group: "Methods", kitchen: "Technique-concept", chart: "A technique becomes the idea: spherification, foam, reduction, infusion." },
  { group: "Methods", kitchen: "Sensory and playful", chart: "Forms that invite exploration, such as a dial or a flowing stream, always keyboard friendly and calm under reduced motion." },
];

/** Each method's name on the menu. */
export const METHODS: Record<Method, { label: string; adjective: string }> = {
  association: { label: "Association", adjective: "Paired" },
  adaptation: { label: "Adaptation", adjective: "Reimagined" },
  deconstruction: { label: "Deconstruction", adjective: "Deconstructed" },
  minimalism: { label: "Minimalism", adjective: "Essential" },
  "change-of-state": { label: "Change of state", adjective: "Transformed" },
  "technique-concept": { label: "Technique-concept", adjective: "Concentrated" },
  sensory: { label: "Sensory", adjective: "Playful" },
};

const TASTES: Taste[] = ["salty", "acid", "bitter", "fatty", "umami"];
const DATE = /^\d{4}-\d{2}/;
const DAY = /^\d{4}-\d{2}-\d{2}/;
const TARGET_NAME = /target|plan|goal|budget|quota/i;

/** What a dish is made of, read from its rows and the fields it already shows. */
export interface Dish {
  title: string;
  /** Number fields, those the dish already shows first. Targets and band edges are kept apart. */
  measures: string[];
  /** Text fields, those the dish already shows first. */
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
  /** The view type the dish arrived in. */
  view: string;
  /** Forecast and band options worth carrying into line and area dishes. */
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
    // An unknown view still has ingredients: the rows say what they are.
  }
  if (spec.headline && typeof spec.headline === "object") add((spec.headline as { value?: unknown }).value);
  return out;
}

/** Reads the dish: its ingredients by kind, how many rows and distinct values, and what it already shows. */
export function profileDish(spec: WidgetSpec, rows: Row[]): Dish {
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
    title: spec.title ?? spec.id ?? "the dish",
    measures,
    categories,
    times,
    ...(target ? { target } : {}),
    rows: rows.length,
    distinct,
    negatives: rows.some((row) => measures.some((f) => typeof row[f] === "number" && (row[f] as number) < 0)),
    daily: times[0] !== undefined && rows.every((row) => typeof row[times[0] as string] !== "string" || DAY.test(String(row[times[0] as string]))),
    crossed: grid > 0 && pairs / grid >= 0.5,
    view: String(view.type ?? "table"),
    fan,
  };
}

/** What a recipe adds to the plate beyond the view. */
interface Course {
  view: ViewSpec;
  headline?: WidgetSpec["headline"];
  facet?: WidgetSpec["facet"];
  transform?: TransformSpec[];
  fields?: WidgetSpec["fields"];
}

interface Recipe {
  id: string;
  /** The form on the menu: "lollipops". */
  form: string;
  /** The kitchen technique: "spherification". */
  technique: string;
  methods: Method[];
  texture: Texture;
  tools: Tool[];
  fits(d: Dish): boolean;
  cook(d: Dish, spec: WidgetSpec): Course;
}

const m1 = (d: Dish) => d.measures[0] as string;
const m2 = (d: Dish) => d.measures[1] as string;
const c1 = (d: Dish) => d.categories[0] as string;
const c2 = (d: Dish) => d.categories[1] as string;
const t1 = (d: Dish) => d.times[0] as string;
/** One row per category: a ranking or a part-to-whole. */
const perCategory = (d: Dish, min: number, max: number) => d.categories.length > 0 && d.measures.length > 0 && d.distinct[c1(d)] === d.rows && d.rows >= min && d.rows <= max;
/** One row per period: a time series. */
const perPeriod = (d: Dish, min = 3) => d.times.length > 0 && d.measures.length > 0 && d.distinct[t1(d)] === d.rows && d.rows >= min;
const positive = (d: Dish) => !d.negatives;
const PERIOD_WORD = /(19|20)\d\d|q[1-4]|before|after|previous|prior|last|current|this|start|end|from|to$/i;
/** The first two measures read as one measure at two times (revenue2025 and revenue2026, before and after). */
const periodPair = (d: Dish) => d.measures.length > 1 && PERIOD_WORD.test(m1(d)) && PERIOD_WORD.test(m2(d));
/** Several periods per category: long data, time by group. */
const timeByGroup = (d: Dish) => d.times.length > 0 && d.categories.length > 0 && d.measures.length > 0 && (d.distinct[t1(d)] ?? 0) < d.rows;
const twoLevels = (d: Dish) => d.categories.length > 1 && d.measures.length > 0 && (d.distinct[c1(d)] ?? 0) < d.rows;

/** The recipe book: each form the Taller knows, what it needs, and how it cooks the dish's own fields. */
const RECIPES: Recipe[] = [
  {
    id: "lollipops",
    form: "lollipops",
    technique: "spherification",
    methods: ["minimalism", "technique-concept"],
    texture: "crunchy",
    tools: ["squeeze bottle", "tweezers"],
    fits: (d) => perCategory(d, 3, 30),
    cook: (d) => ({ view: { type: "hbar", label: c1(d), value: m1(d), mark: "lollipop" } }),
  },
  {
    id: "bars",
    form: "bars",
    technique: "knife cuts",
    methods: ["change-of-state", "adaptation"],
    texture: "crunchy",
    tools: ["knife"],
    fits: (d) => perCategory(d, 2, 24),
    cook: (d) => ({ view: { type: "bar", x: c1(d), y: m1(d) } }),
  },
  {
    id: "donut",
    form: "a donut",
    technique: "rounding",
    methods: ["adaptation"],
    texture: "soft",
    tools: ["spoon"],
    fits: (d) => perCategory(d, 2, 6) && positive(d),
    cook: (d) => ({ view: { type: "donut", label: c1(d), value: m1(d) } }),
  },
  {
    id: "waffle",
    form: "a waffle of 100 squares",
    technique: "deconstruction",
    methods: ["deconstruction"],
    texture: "crunchy",
    tools: ["knife"],
    fits: (d) => perCategory(d, 2, 6) && positive(d),
    cook: (d) => ({ view: { type: "waffle", label: c1(d), value: m1(d) } }),
  },
  {
    id: "treemap",
    form: "a treemap",
    technique: "tiling",
    methods: ["adaptation", "deconstruction"],
    texture: "crunchy",
    tools: ["knife", "spoon"],
    fits: (d) => perCategory(d, 4, 40) && positive(d),
    cook: (d) => ({ view: { type: "treemap", label: c1(d), value: m1(d) } }),
  },
  {
    id: "pareto",
    form: "a Pareto",
    technique: "reduction",
    methods: ["technique-concept"],
    texture: "crunchy",
    tools: ["knife", "squeeze bottle"],
    fits: (d) => perCategory(d, 4, 30) && positive(d),
    cook: (d) => ({ view: { type: "pareto", label: c1(d), value: m1(d) } }),
  },
  {
    id: "top-five",
    form: "the top five, reduced",
    technique: "reduction",
    methods: ["technique-concept", "minimalism"],
    texture: "crunchy",
    tools: ["knife", "tweezers"],
    fits: (d) => perCategory(d, 8, 200),
    cook: (d, spec) => ({
      view: { type: "hbar", label: c1(d), value: m1(d) },
      transform: [...(spec.transform ?? []), { type: "sort", field: m1(d), order: "desc" }, { type: "limit", count: 5 }],
    }),
  },
  {
    id: "average-line",
    form: "bars infused with their average",
    technique: "infusion",
    methods: ["technique-concept", "association"],
    texture: "crunchy",
    tools: ["knife", "squeeze bottle", "tweezers"],
    fits: (d) => perCategory(d, 3, 24),
    cook: (d) => ({ view: { type: "bar", x: c1(d), y: m1(d), reference: [{ field: m1(d), agg: "avg", label: "Average" }] } }),
  },
  {
    id: "table-bars",
    form: "a table with bars in its cells",
    technique: "change of state",
    methods: ["change-of-state", "minimalism"],
    texture: "crunchy",
    tools: ["knife"],
    fits: (d) => d.measures.length > 0 && d.categories.length > 0 && d.rows <= 30,
    cook: (d, spec) => ({
      view: { type: "table", sortable: true },
      fields: { ...spec.fields, [m1(d)]: { ...spec.fields?.[m1(d)], format: { type: "bar", ...(spec.fields?.[m1(d)]?.format ? { format: spec.fields[m1(d)]?.format } : {}) } } },
    }),
  },
  {
    id: "list",
    form: "a short list",
    technique: "plating by hand",
    methods: ["minimalism"],
    texture: "soft",
    tools: ["tweezers"],
    fits: (d) => perCategory(d, 2, 12),
    cook: (d) => ({ view: { type: "list", label: c1(d), value: m1(d) } }),
  },
  {
    id: "headline-bars",
    form: "a first bite over bars",
    technique: "infusion",
    methods: ["association"],
    texture: "crunchy",
    tools: ["knife", "tweezers"],
    fits: (d) => perCategory(d, 2, 24),
    cook: (d) => ({ view: { type: "hbar", label: c1(d), value: m1(d) }, headline: { value: m1(d), agg: "sum" } }),
  },
  {
    id: "target-line",
    form: "bars with their target line",
    technique: "pairing",
    methods: ["association"],
    texture: "crunchy",
    tools: ["knife", "squeeze bottle"],
    fits: (d) => perCategory(d, 2, 24) && d.target !== undefined,
    cook: (d) => ({ view: { type: "bar", x: c1(d), y: m1(d), lines: d.target as string } }),
  },
  {
    id: "variance",
    form: "a variance against target",
    technique: "contrast of flavors",
    methods: ["change-of-state", "technique-concept"],
    texture: "crunchy",
    tools: ["knife", "tweezers"],
    fits: (d) => perCategory(d, 2, 24) && d.target !== undefined,
    cook: (d) => ({ view: { type: "variance", label: c1(d), value: m1(d), target: d.target as string } }),
  },
  {
    id: "bullet",
    form: "bullet bars",
    technique: "layering",
    methods: ["adaptation"],
    texture: "crunchy",
    tools: ["knife", "tweezers"],
    fits: (d) => perCategory(d, 2, 12) && d.target !== undefined,
    cook: (d) => ({ view: { type: "bullet", label: c1(d), value: m1(d), target: d.target as string } }),
  },
  {
    id: "dumbbell",
    form: "dumbbells from one measure to the other",
    technique: "pairing",
    methods: ["association"],
    texture: "crunchy",
    tools: ["squeeze bottle", "tweezers"],
    fits: (d) => perCategory(d, 2, 20) && d.measures.length > 1,
    cook: (d) => ({ view: { type: "dumbbell", label: c1(d), from: m1(d), to: m2(d) } }),
  },
  {
    id: "slope",
    form: "slopes",
    technique: "a thin stroke",
    methods: ["adaptation"],
    texture: "soft",
    tools: ["squeeze bottle"],
    fits: (d) => perCategory(d, 2, 16) && periodPair(d),
    cook: (d) => {
      // From the earlier period to the later one, whatever order the dish lists them in.
      const [from, to] = [m1(d), m2(d)].sort();
      return { view: { type: "slope", label: c1(d), from: from as string, to: to as string } };
    },
  },
  {
    id: "radar",
    form: "a radar profile",
    technique: "a taste wheel",
    methods: ["adaptation"],
    texture: "soft",
    tools: ["squeeze bottle"],
    fits: (d) => perCategory(d, 3, 10) && positive(d),
    cook: (d) => ({ view: { type: "radar", label: c1(d), y: d.measures.slice(0, 3) } }),
  },
  {
    id: "line",
    form: "a line",
    technique: "a thin stroke",
    methods: ["change-of-state", "adaptation"],
    texture: "soft",
    tools: ["squeeze bottle"],
    fits: (d) => perPeriod(d),
    cook: (d) => ({ view: { type: "line", x: t1(d), y: d.measures.slice(0, 4), ...d.fan } }),
  },
  {
    id: "foam",
    form: "a foam of smooth washes",
    technique: "foam",
    methods: ["technique-concept"],
    texture: "soft",
    tools: ["spoon", "squeeze bottle"],
    fits: (d) => perPeriod(d) && d.measures.length <= 2,
    cook: (d) => ({ view: { type: "area", x: t1(d), y: d.measures.slice(0, 2), curve: "smooth", ...d.fan } }),
  },
  {
    id: "steps",
    form: "steps",
    technique: "knife cuts",
    methods: ["change-of-state"],
    texture: "crunchy",
    tools: ["knife", "squeeze bottle"],
    fits: (d) => perPeriod(d, 4),
    cook: (d) => ({ view: { type: "line", x: t1(d), y: d.measures.slice(0, 3), curve: "step", ...d.fan } }),
  },
  {
    id: "time-bars",
    form: "bars in time",
    technique: "knife cuts",
    methods: ["adaptation"],
    texture: "crunchy",
    tools: ["knife"],
    fits: (d) => perPeriod(d) && d.rows <= 40,
    cook: (d) => ({ view: { type: "bar", x: t1(d), y: m1(d) } }),
  },
  {
    id: "time-lollipops",
    form: "lollipops in time",
    technique: "spherification",
    methods: ["technique-concept", "minimalism"],
    texture: "crunchy",
    tools: ["squeeze bottle", "tweezers"],
    fits: (d) => perPeriod(d) && d.rows <= 40,
    cook: (d) => ({ view: { type: "bar", x: t1(d), y: m1(d), mark: "lollipop" } }),
  },
  {
    id: "headline-line",
    form: "a first bite over a line",
    technique: "infusion",
    methods: ["association"],
    texture: "soft",
    tools: ["squeeze bottle", "tweezers"],
    fits: (d) => perPeriod(d),
    cook: (d) => ({ view: { type: "line", x: t1(d), y: m1(d), ...d.fan }, headline: { value: m1(d), agg: "last", compare: "previous" } }),
  },
  {
    id: "stream",
    form: "a streamgraph",
    technique: "foam",
    methods: ["technique-concept", "sensory"],
    texture: "soft",
    tools: ["spoon", "tweezers"],
    fits: (d) => perPeriod(d, 6) && d.measures.length >= 3 && positive(d),
    cook: (d) => ({ view: { type: "area", x: t1(d), y: d.measures.slice(0, 8), stacked: "stream" } }),
  },
  {
    id: "horizon",
    form: "horizon rows",
    technique: "deconstruction",
    methods: ["deconstruction"],
    texture: "crunchy",
    tools: ["knife"],
    fits: (d) => perPeriod(d, 8) && d.measures.length >= 2,
    cook: (d) => ({ view: { type: "horizon", x: t1(d), y: d.measures.slice(0, 8) } }),
  },
  {
    id: "shares",
    form: "a mix in shares",
    technique: "emulsion",
    methods: ["adaptation"],
    texture: "soft",
    tools: ["spoon"],
    fits: (d) => perPeriod(d) && d.measures.length >= 2 && positive(d),
    cook: (d) => ({ view: { type: "area", x: t1(d), y: d.measures.slice(0, 6), stacked: "percent" } }),
  },
  {
    id: "spark",
    form: "one number with its sparkline",
    technique: "reduction to the essence",
    methods: ["minimalism"],
    texture: "soft",
    tools: ["squeeze bottle"],
    fits: (d) => perPeriod(d),
    cook: (d) => ({ view: { type: "kpi", value: m1(d), x: t1(d), series: true } }),
  },
  {
    id: "numbers",
    form: "a row of numbers",
    technique: "reduction to the essence",
    methods: ["minimalism"],
    texture: "soft",
    tools: ["tweezers"],
    fits: (d) => d.measures.length >= 2 && (perPeriod(d, 1) || d.rows === 1),
    cook: (d) => ({ view: { type: "kpis", items: d.measures.slice(0, 3).map((value) => ({ value })) } }),
  },
  {
    id: "calendar",
    form: "a calendar of days",
    technique: "change of state",
    methods: ["change-of-state", "sensory"],
    texture: "crunchy",
    tools: ["knife"],
    fits: (d) => perPeriod(d, 28) && d.daily,
    cook: (d) => ({ view: { type: "calendar", date: t1(d), value: m1(d) } }),
  },
  {
    id: "rose",
    form: "a rose dial",
    technique: "a dial",
    methods: ["sensory", "adaptation"],
    texture: "soft",
    tools: ["spoon"],
    fits: (d) => (perPeriod(d, 6) || perCategory(d, 6, 24)) && d.rows <= 24 && positive(d),
    cook: (d) => ({ view: { type: "rose", label: d.times[0] ?? c1(d), y: d.measures.slice(0, 3) } }),
  },
  {
    id: "histogram",
    form: "a histogram",
    technique: "knife cuts into bins",
    methods: ["change-of-state"],
    texture: "crunchy",
    tools: ["knife"],
    fits: (d) => d.measures.length > 0 && d.rows >= 12,
    cook: (d) => ({ view: { type: "histogram", value: m1(d) } }),
  },
  {
    id: "beeswarm",
    form: "a swarm of dots",
    technique: "spherification",
    methods: ["technique-concept", "sensory"],
    texture: "crunchy",
    tools: ["tweezers"],
    fits: (d) => d.measures.length > 0 && d.rows >= 8 && d.rows <= 400,
    cook: (d) => {
      const group = d.categories.find((c) => (d.distinct[c] ?? 0) >= 2 && (d.distinct[c] ?? 0) <= 6);
      return { view: { type: "beeswarm", value: m1(d), ...(group ? { group } : {}) } };
    },
  },
  {
    id: "boxplot",
    form: "boxes and whiskers",
    technique: "reduction",
    methods: ["technique-concept"],
    texture: "crunchy",
    tools: ["knife", "squeeze bottle"],
    fits: (d) => d.measures.length > 0 && d.rows >= 8 && d.categories.some((c) => (d.distinct[c] ?? 0) >= 2 && (d.distinct[c] ?? 0) <= 8 && (d.distinct[c] ?? 0) < d.rows),
    cook: (d) => ({ view: { type: "boxplot", value: m1(d), group: d.categories.find((c) => (d.distinct[c] ?? 0) >= 2 && (d.distinct[c] ?? 0) <= 8 && (d.distinct[c] ?? 0) < d.rows) as string } }),
  },
  {
    id: "scatter",
    form: "a scatter of two measures",
    technique: "spherification",
    methods: ["technique-concept", "association"],
    texture: "crunchy",
    tools: ["tweezers"],
    fits: (d) => d.measures.length > 1 && d.rows >= 5,
    cook: (d) => ({ view: { type: "scatter", x: m1(d), y: m2(d), ...(d.categories[0] ? { label: c1(d) } : {}) } }),
  },
  {
    id: "small-multiples",
    form: "small multiples",
    technique: "deconstruction",
    methods: ["deconstruction"],
    texture: "crunchy",
    tools: ["knife"],
    fits: (d) => ((twoLevels(d) && d.crossed) || (timeByGroup(d) && !twoLevels(d))) && (d.distinct[c1(d)] ?? 0) <= 8 && d.rows <= 240,
    cook: (d) =>
      timeByGroup(d) && !twoLevels(d)
        ? { view: { type: "line", x: t1(d), y: m1(d) }, facet: { field: c1(d) } }
        : { view: { type: "bar", x: c2(d), y: m1(d) }, facet: { field: c1(d) } },
  },
  {
    id: "sunburst",
    form: "a sunburst",
    technique: "rounding",
    methods: ["adaptation"],
    texture: "soft",
    tools: ["spoon"],
    fits: (d) => twoLevels(d) && positive(d) && (d.distinct[c1(d)] ?? 0) <= 8,
    cook: (d) => ({ view: { type: "sunburst", levels: [c1(d), c2(d)], value: m1(d) } }),
  },
  {
    id: "icicle",
    form: "an icicle",
    technique: "deconstruction",
    methods: ["deconstruction"],
    texture: "crunchy",
    tools: ["knife"],
    fits: (d) => twoLevels(d) && positive(d) && (d.distinct[c1(d)] ?? 0) <= 8,
    cook: (d) => ({ view: { type: "icicle", levels: [c1(d), c2(d)], value: m1(d) } }),
  },
  {
    id: "heatmap",
    form: "a heat table of cells",
    technique: "change of state",
    methods: ["change-of-state"],
    texture: "crunchy",
    tools: ["knife"],
    // Up to 6 columns, so every column heading has room on a card.
    fits: (d) => twoLevels(d) && d.crossed && (d.distinct[c2(d)] ?? 0) <= 6,
    cook: (d) => ({ view: { type: "heatmap", x: c2(d), y: c1(d), value: m1(d) } }),
  },
  {
    id: "marimekko",
    form: "a marimekko of size and mix",
    technique: "pairing",
    methods: ["association"],
    texture: "crunchy",
    tools: ["knife", "spoon"],
    fits: (d) => twoLevels(d) && d.crossed && positive(d) && (d.distinct[c1(d)] ?? 0) <= 8 && (d.distinct[c2(d)] ?? 0) <= 8,
    cook: (d) => ({ view: { type: "marimekko", x: c1(d), series: c2(d), value: m1(d) } }),
  },
  {
    id: "bump",
    form: "a bump of ranks",
    technique: "a thin stroke",
    methods: ["adaptation"],
    texture: "soft",
    tools: ["squeeze bottle", "tweezers"],
    fits: (d) => timeByGroup(d) && (d.distinct[c1(d)] ?? 0) >= 3 && (d.distinct[c1(d)] ?? 0) <= 10,
    cook: (d) => ({ view: { type: "bump", x: t1(d), series: c1(d), value: m1(d) } }),
  },
];

/** Views the Taller can steer with `highlight` for a hot item on a cold plate. */
const HIGHLIGHTABLE = new Set(["bar", "hbar", "line", "area"]);
/** Views whose colors follow the categories rather than the series. */
const BY_CATEGORY = new Set(["donut", "waffle", "treemap", "sunburst", "icicle", "marimekko", "pareto"]);
/** Families of views: a variant in another family than the dish brings acid (surprise). */
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

const PLATES: Record<Plate, { preset?: string; words: string }> = {
  white: { preset: "paper", words: "on a white plate" },
  empty: { preset: "airy", words: "on an empty plate" },
  cold: { preset: "glass", words: "on a cold plate" },
  house: { words: "on the house plate" },
};
const TEMPERATURE_WORDS: Record<Temperature, string> = { hot: "hot", cold: "cold", contrast: "hot on cold", room: "at room temperature" };

/** A small seeded random generator (mulberry32): the same seed, the same menu. */
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
function pantry(): Record<"warm" | "cool", string[]> {
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
 * neighbour checks. Null when the pantry cannot make one that safe.
 */
export function temperaturePalette(kind: "hot" | "cold", size: number, seed = 1): string[] | null {
  const pool = pantry()[kind === "hot" ? "warm" : "cool"];
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
function colorsNeeded(view: ViewSpec, d: Dish): number {
  const y = view.y;
  if (BY_CATEGORY.has(String(view.type))) {
    const field = Array.isArray(view.levels) ? String(view.levels[0]) : String(view.label ?? view.series ?? view.x ?? "");
    return d.distinct[field] ?? 1;
  }
  return Array.isArray(y) ? y.length : 1;
}

/** The ink a spec puts down and the extras it carries, scored on the five tastes from 0 to 1. */
export function tasteOf(spec: WidgetSpec, rows: Row[], source?: WidgetSpec): Tastes {
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
  const [salty, acid, bitter, fatty, umami] = base[type] ?? [0.25, 0.2, 0.1, 0.3, 0.3];
  const t: Tastes = { salty, acid, bitter, fatty, umami };
  const headline = spec.headline as { compare?: unknown } | undefined;
  if (headline) {
    t.salty += 0.25;
    t.umami += headline.compare ? 0.2 : 0.1;
  }
  if (view.highlight) t.salty += 0.2;
  if (Array.isArray(view.reference) && view.reference.length) {
    t.umami += 0.2;
    t.bitter += 0.05;
  }
  if (view.lines) {
    t.umami += 0.2;
    t.bitter += 0.15;
  }
  if (view.forecast || view.band) {
    t.umami += 0.25;
    t.bitter += 0.2;
  }
  if (spec.facet) {
    t.umami += 0.15;
    t.acid += 0.1;
    t.fatty += 0.1;
  }
  if (view.stacked === "stream") {
    t.fatty += 0.15;
    t.acid += 0.25;
  } else if (view.stacked) t.fatty += 0.15;
  if (view.mark === "lollipop") {
    t.fatty -= 0.2;
    t.acid += 0.1;
  }
  if (view.curve === "smooth" || view.curve === "step") t.acid += 0.05;
  if (Array.isArray(view.y) && view.y.length > 1) t.umami += 0.15;
  const marks = rows.length * (Array.isArray(view.y) ? view.y.length : 1);
  if (marks > 200) t.fatty += 0.3;
  else if (marks > 60) t.fatty += 0.15;
  const formats = Object.values(spec.fields ?? {}).map((f) => (typeof f?.format === "object" ? (f.format as { type?: string }).type : f?.format));
  if (formats.includes("bar")) t.salty += 0.1;
  if (formats.includes("delta")) t.bitter += 0.15;
  if (formats.includes("heat")) t.fatty += 0.1;
  const negatives = rows.some((row) => Object.values(row).some((v) => typeof v === "number" && v < 0));
  if (negatives && ["bar", "variance", "line", "waterfall", "horizon", "table"].includes(type)) t.bitter += 0.15;
  if ((spec.transform?.length ?? 0) > (source?.transform?.length ?? spec.transform?.length ?? 0)) {
    t.fatty -= 0.1;
    t.salty += 0.05;
  }
  if (source) {
    const sourceType = String(source.view?.type ?? "table");
    if ((FAMILY[type] ?? type) !== (FAMILY[sourceType] ?? sourceType)) t.acid += 0.2;
    if (RARE.has(type) && type !== sourceType) t.acid += 0.1;
  }
  t.fatty += 0.2 * Math.max(0, saucesOf(spec) - 1);
  for (const taste of TASTES) t[taste] = Math.round(Math.max(0, Math.min(1, t[taste])) * 100) / 100;
  return t;
}

/** The liquid elements on the plate: washes, streams, bands and heat cells. */
export function saucesOf(spec: WidgetSpec): number {
  const view = spec.view ?? {};
  let sauces = 0;
  if (view.type === "area") sauces += 1;
  if (view.band) sauces += 1;
  if (view.type === "heatmap" || view.type === "calendar") sauces += 1;
  const formats = Object.values(spec.fields ?? {}).map((f) => (typeof f?.format === "object" ? (f.format as { type?: string }).type : f?.format));
  if (formats.includes("heat")) sauces += 1;
  return sauces;
}

/** What each taste means for a chart: the names results go by, so a reader never needs the kitchen words. */
export const TASTE_MEANINGS: Record<Taste, string> = { salty: "Emphasis", acid: "Surprise", bitter: "Honesty", fatty: "Ink", umami: "Insight" };

const TOO: Record<Taste, string> = {
  salty: "everything shouts",
  acid: "it surprises more than it explains",
  bitter: "it shows only what went wrong",
  fatty: "it is heavy to read",
  umami: "it tries to say too much at once",
};

/**
 * Whether a plate is balanced: no taste dominating, none the dish needs missing, at most one sauce. The note is in
 * chart words (emphasis, surprise, honesty, ink, insight), since it is read next to the chart.
 */
export function balanceOf(tastes: Tastes, sauces = 0): Balance {
  const sorted = [...TASTES].sort((a, b) => tastes[b] - tastes[a]);
  const [top, second] = sorted as [Taste, Taste];
  const plain = (taste: Taste) => TASTE_MEANINGS[taste].toLowerCase();
  if (sauces > 1) return { ok: false, note: "too much ink: two filled layers" };
  if (tastes[top] >= 0.9 && tastes[top] - tastes[second] >= 0.35) return { ok: false, note: `too much ${plain(top)}: ${TOO[top]}` };
  const total = TASTES.reduce((sum, taste) => sum + tastes[taste], 0);
  if (total < 0.9) return { ok: false, note: "too plain: it needs emphasis or insight" };
  if (tastes.umami < 0.15 && tastes.salty < 0.2) return { ok: false, note: "too plain: nothing stands out and nothing to learn" };
  const hint = tastes.fatty >= 0.7 ? ", with a lot of ink" : tastes.salty >= 0.75 ? ", with strong emphasis" : "";
  return { ok: true, note: `balanced: mostly ${plain(top)} and ${plain(second)}${hint}` };
}

const METHOD_WORDS: Record<Method, string> = {
  association: "two ideas combined",
  adaptation: "a new chart type",
  deconstruction: "split into parts",
  minimalism: "stripped back",
  "change-of-state": "a new format",
  "technique-concept": "one clear idea",
  sensory: "a playful shape",
};
const TECHNIQUE_WORDS: Record<string, string> = {
  spherification: "dots",
  foam: "smooth fills",
  reduction: "only what matters most",
  "reduction to the essence": "just the number",
  infusion: "an extra guide",
  "knife cuts": "bars and steps",
  "knife cuts into bins": "ranges",
  rounding: "a round shape",
  tiling: "tiles",
  pairing: "two values side by side",
  "a thin stroke": "thin lines",
  "change of state": "a new format",
  "contrast of flavors": "above or below target",
  layering: "layers",
  "a taste wheel": "spokes",
  "a dial": "a clock dial",
  emulsion: "shares of 100%",
  "plating by hand": "a simple list",
  deconstruction: "split into parts",
};
const TEMPERATURE_PLAIN: Record<Temperature, string> = { hot: "warm colors", cold: "cool colors", contrast: "one standout color", room: "standard colors" };
const TEXTURE_PLAIN: Record<Texture, string> = { soft: "soft curves", crunchy: "sharp marks" };
const PLATE_PLAIN: Record<Plate, string> = { white: "light card", empty: "borderless card", cold: "dark glass card", house: "standard card" };

/** A variant's lineage in chart words, for a result card: the marks, the colors, the card. */
export function plainTags(variant: Pick<Variant, "lineage" | "spec">): string[] {
  const { lineage, spec } = variant;
  const tools: Record<Tool, string> = {
    tweezers: spec.view?.highlight ? "shows one standout" : "labels placed precisely",
    "squeeze bottle": "thin lines",
    knife: "blocky shapes",
    spoon: "filled shapes",
  };
  const tags = [
    METHOD_WORDS[lineage.method],
    TECHNIQUE_WORDS[lineage.technique] ?? "a new form",
    ...lineage.tools.map((tool) => tools[tool]),
    TEMPERATURE_PLAIN[lineage.temperature],
    TEXTURE_PLAIN[lineage.texture],
    PLATE_PLAIN[lineage.plating],
  ];
  return [...new Set(tags)];
}

/** The shape of a dish, ignoring plating and temperature: two variants with one shape are one dish. */
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

/** A short, safe widget id for a variant, so each one wears its own ghost ref. */
function variantId(spec: WidgetSpec, recipe: string): string {
  const base = (spec.id ?? "dish").toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40);
  return `${base}-taller-${recipe}`.slice(0, 64).replace(/-+$/, "");
}

/** Lower case for the menu, unless the word is all capitals (an acronym). */
const lowerFirst = (text: string) => (/^[A-Z]{2}/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1));

/**
 * Cooks a menu from one dish. Each variant keeps the dish's data, transforms and fields (the ingredients) and
 * changes its form, technique, tools, temperature, texture and plating. Every one is scored on the five tastes and
 * kept only if balanced, valid (`validateSpec` with no errors), colorblind safe, and new: never the original's
 * shape, never another variant's.
 */
export function createVariants(spec: WidgetSpec, rows: Row[], options: TallerOptions = {}): Variant[] {
  const count = Math.max(1, Math.min(24, options.count ?? 6));
  const random = seeded(options.seed ?? 1);
  const temperature = Math.max(-1, Math.min(1, options.temperature ?? 0));
  const texture = Math.max(-1, Math.min(1, options.texture ?? 0));
  const allowed = new Set<Method>(options.methods?.length ? options.methods : (Object.keys(METHODS) as Method[]));
  const dish = profileDish(spec, rows);

  // Every recipe the dish can take, once per method it belongs to, weighed by the requested texture and a seeded pinch.
  const wanted: Texture | null = texture > 0.2 ? "crunchy" : texture < -0.2 ? "soft" : null;
  const candidates = RECIPES.filter((recipe) => recipe.fits(dish)).flatMap((recipe) =>
    recipe.methods
      .filter((method) => allowed.has(method))
      .map((method) => ({ recipe, method, weight: (wanted && recipe.texture === wanted ? Math.abs(texture) : 0) + (RARE.has(recipe.id) ? 0.1 : 0) + random() })),
  );
  candidates.sort((a, b) => b.weight - a.weight);

  const pickTemperature = (view: ViewSpec): Temperature => {
    const roll = random() * 2 - 1 + temperature;
    if (roll > 0.55) return "hot";
    if (roll < -0.55) return "cold";
    if (HIGHLIGHTABLE.has(String(view.type)) && random() < 0.5) return "contrast";
    return random() < 0.5 ? (random() < 0.5 + temperature / 2 ? "hot" : "cold") : "room";
  };
  const pickPlate = (temp: Temperature, feel: Texture): Plate => {
    const roll = random();
    if (temp === "cold" && roll < 0.5) return "cold";
    if (feel === "soft" && roll < 0.6) return "empty";
    if (feel === "crunchy" && roll < 0.6) return "white";
    return roll < 0.8 ? "house" : feel === "soft" ? "empty" : "white";
  };

  const sourceShape = shapeOf(spec);
  const shapes = new Set<string>([sourceShape]);
  const perMethod = new Map<Method, number>();
  const usedRecipes = new Set<string>();
  const menu: Variant[] = [];
  for (const { recipe, method } of candidates) {
    if (menu.length >= count) break;
    if (usedRecipes.has(recipe.id) || (perMethod.get(method) ?? 0) >= Math.max(2, Math.ceil(count / 3))) continue;
    const course = recipe.cook(dish, spec);
    const view: ViewSpec = { ...course.view };
    const feel: Texture = view.type === "line" || view.type === "area" ? (view.curve === "step" ? "crunchy" : wanted === "crunchy" && !view.curve && !view.stacked ? "crunchy" : recipe.texture) : recipe.texture;
    if ((view.type === "line" || view.type === "area") && !view.curve && !view.stacked && !view.forecast) view.curve = feel === "soft" ? "smooth" : "step";

    // Temperature: a warm or cool palette from the library, or one hot item on a cold plate, or the house palette.
    let temp = pickTemperature(view);
    const style: StyleSpec = {};
    if (temp === "contrast") {
      const highlight = hotItem(view, rows, dish);
      const hot = temperaturePalette("hot", 1, (options.seed ?? 1) + menu.length);
      if (highlight && hot) {
        view.highlight = highlight;
        style.palette = Array.isArray(view.y) && view.y.length > 1 ? (temperaturePalette("hot", view.y.length, (options.seed ?? 1) + menu.length) ?? hot) : hot;
      } else temp = "room";
    }
    if (temp === "hot" || temp === "cold") {
      const palette = temperaturePalette(temp, colorsNeeded(view, dish), (options.seed ?? 1) + menu.length);
      if (palette) style.palette = palette;
      else temp = "room";
    }
    const plate = pickPlate(temp, feel);
    const preset = PLATES[plate].preset;
    if (preset) style.preset = preset;
    if (feel === "crunchy" && random() < 0.5) style.density = "compact";

    const { id: _id, facet: _facet, headline: _headline, style: _style, ...rest } = spec;
    const variant: WidgetSpec = {
      ...rest,
      id: variantId(spec, recipe.id),
      view,
      ...(course.headline ? { headline: course.headline } : {}),
      ...(course.facet ? { facet: course.facet } : {}),
      ...(course.transform ? { transform: course.transform } : {}),
      ...(course.fields ? { fields: course.fields } : {}),
      ...(Object.keys(style).length ? { style } : {}),
    };

    // Crear es no copiar: a new shape every time, and in the dish's own view at least two changes of form.
    const shape = shapeOf(variant);
    if (shapes.has(shape)) continue;
    if (view.type === spec.view?.type && !newForm(variant, spec)) continue;
    // Hygiene: valid, and a colorblind-safe palette when it brings its own.
    if (hasErrors(validateSpec(variant, rows))) continue;
    if (Array.isArray(style.palette) && style.palette.length > 1) {
      const cvd = checkPalette(style.palette, { mode: "light" }).checks.find((check) => check.name === "cvd")?.state;
      if (cvd === "fail") continue;
    }
    const tastes = tasteOf(variant, rows, spec);
    const balance = balanceOf(tastes, saucesOf(variant));
    if (!balance.ok) continue;

    shapes.add(shape);
    usedRecipes.add(recipe.id);
    perMethod.set(method, (perMethod.get(method) ?? 0) + 1);
    const adjective = method === "technique-concept" ? techniqueAdjective(recipe.technique) : METHODS[method].adjective;
    menu.push({
      spec: variant,
      method,
      lineage: { method, technique: recipe.technique, tools: toolsOf(recipe, view, variant), temperature: temp, texture: feel, plating: plate },
      tastes,
      balance,
      menu: `${adjective} ${lowerFirst(dish.title)}: ${recipe.form}, ${TEMPERATURE_WORDS[temp]}, ${feel}, ${PLATES[plate].words}`,
      ...explainVariant(variant, dish.title),
      seed: options.seed ?? 1,
      novelty: noveltyOf(variant, spec),
      meaning: meaningOf(tastes, balance),
    });
  }
  return menu;
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
 * Whether a variant served in its dish's own view is a new dish: it needs a new technique (mark, curve or
 * stacking) or two new elements (lines, reference, highlight, headline, facet, extra steps, cell formats).
 * Garnish taken away is not creating.
 */
function newForm(variant: WidgetSpec, source: WidgetSpec): boolean {
  const technique = (s: WidgetSpec) => JSON.stringify([s.view?.mark ?? "bar", s.view?.curve ?? "linear", s.view?.stacked ?? false]);
  if (technique(variant) !== technique(source)) return true;
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

/** How much a plate says, 0 to 1: balanced first, then depth (umami), honesty (bitter) and evenness across the tastes, less a heavy hand of fat. */
export function meaningOf(tastes: Tastes, balance: Balance): number {
  const values = TASTES.map((taste) => tastes[taste]);
  const evenness = 1 - (Math.max(...values) - Math.min(...values));
  return unit((balance.ok ? 0.3 : 0) + 0.4 * tastes.umami + 0.15 * tastes.bitter + 0.15 * evenness - (tastes.fatty > 0.7 ? 0.1 : 0));
}

/** Variants ranked by novelty, by meaning, or by both (their mean, the default), highest first. Returns a new list. */
export function rankVariants(variants: Variant[], by: "novelty" | "meaning" | "both" = "both"): Variant[] {
  const score = (v: Variant) => (by === "novelty" ? v.novelty : by === "meaning" ? v.meaning : (v.novelty + v.meaning) / 2);
  return [...variants].sort((x, y) => score(y) - score(x) || x.menu.localeCompare(y.menu));
}

/** The item to make hot on a cold plate: the largest category, or the series that ends highest. */
function hotItem(view: ViewSpec, rows: Row[], d: Dish): string | null {
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

/** The menu word for a technique used as the concept. */
function techniqueAdjective(technique: string): string {
  if (technique === "spherification") return "Spherified";
  if (technique === "foam") return "Foamed";
  if (technique.startsWith("reduction")) return "Reduced";
  if (technique === "infusion") return "Infused";
  return "Concentrated";
}

/** The utensils a plate needed, from the recipe and what the kitchen added. */
function toolsOf(recipe: Recipe, view: ViewSpec, spec: WidgetSpec): Tool[] {
  const tools = new Set<Tool>(recipe.tools);
  if (view.highlight || spec.headline) tools.add("tweezers");
  if (view.curve === "smooth" || view.forecast || Array.isArray(view.reference)) tools.add("squeeze bottle");
  return [...tools];
}
