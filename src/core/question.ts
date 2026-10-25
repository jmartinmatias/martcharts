/**
 * The sales question a chart answers, in one plain sentence built from the
 * chart's own field names: "Which region has the most revenue?", "Is revenue
 * on target, month by month?". It is the part of a chart a new version must
 * keep: the numbers and the question stay, the form may change.
 *
 * @module
 */
import { humanize } from "./display.ts";
import type { Row, WidgetSpec } from "./types.ts";

/** What kind of question a chart answers. */
export type QuestionKind =
  | "rank"
  | "target"
  | "trend"
  | "forecast"
  | "mix"
  | "compare"
  | "change"
  | "spread"
  | "relation"
  | "flow"
  | "rhythm"
  | "profile"
  | "number"
  | "detail"
  | "opinion"
  | "schedule";

/** A chart's question: its kind and the sentence. */
export interface Question {
  kind: QuestionKind;
  text: string;
}

type View = Record<string, unknown> & { type: string };

const one = (value: unknown): string | undefined => (typeof value === "string" && value ? value : Array.isArray(value) && typeof value[0] === "string" ? value[0] : undefined);
const many = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : typeof value === "string" && value ? [value] : []);

/** Names that are abbreviations, so they keep their capitals. */
const ABBREVIATIONS: Record<string, string> = { kpi: "KPI", nps: "NPS" };
/** Fields that name rows without saying what the rows are. */
const GENERIC = /^(name|title|label|id|item)$/i;
/** Fields that hold time. */
const TIME = /^(month|week|day|date|year|quarter|period|hour|time)$/i;
/** Labels that say a number is a target. */
const TARGET = /target|plan|goal|budget|quota/i;
/** Field names that read as one measure at two times: q3_2025 and q3_2026, h1 and h2, before and after. */
const PERIOD = /(19|20)\d\d|\b[qh][1-4]\b|before|after|previous|prior|last|current|start|end/i;
/** Measures named by a generic word: they read as "the highest amount" and "a share of the amount". */
const GENERIC_MEASURE = /\b(amount|value|total|count|number|sum|score)$/i;
/** Fields that name the steps of a pipeline. */
const STAGE = /^(stage|step|phase)s?$/i;
/** Whether the rows shrink from one to the next, as a pipeline's stages do (at least three of them). */
const shrinking = (rows: Row[], field: string) => rows.length >= 3 && rows.every((row, i) => i === 0 || Number(row[field]) <= Number(rows[i - 1]?.[field]));
/** Column names that are months: 2026-04. */
const MONTH_COLUMN = /^\d{4}-\d{2}$/;

/** A field's name in the middle of a sentence: "revenue", "accounts using it", but "NPS", "Q3 2025" and "Core" keep their capitals. */
function nameOf(field: string, spec: WidgetSpec): string {
  if (ABBREVIATIONS[field.toLowerCase()]) return ABBREVIATIONS[field.toLowerCase()] as string;
  const label = spec.fields?.[field]?.label || humanize(field);
  return /^[a-z]/.test(field) && /^[A-Z][a-z]*\b/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
}

/** What each row is: the field's own name, or for a generic field ("name"), the noun in the title ("Revenue by customer", "Top customers"). */
function entityOf(field: string, spec: WidgetSpec): string {
  if (!GENERIC.test(field)) return nameOf(field, spec);
  const title = String(spec.title ?? "").toLowerCase();
  const by = /\bby ([a-z]+)$/.exec(title)?.[1];
  if (by) return by;
  const last = /([a-z]+)$/.exec(title)?.[1];
  return last && last.length > 3 ? singular(last) : "entry";
}

const singular = (noun: string) => (/ies$/.test(noun) ? `${noun.slice(0, -3)}y` : /(ch|sh|x|ss)es$/.test(noun) ? noun.slice(0, -2) : /[^s]s$/.test(noun) ? noun.slice(0, -1) : noun);
/** The plural of a one-word noun ("region" to "regions"); undefined for several words, which read badly forced into a plural. */
const plural = (noun: string): string | undefined => (/\s/.test(noun) ? undefined : /[^aeiou]y$/.test(noun) ? `${noun.slice(0, -1)}ies` : /(s|x|ch|sh)$/.test(noun) ? `${noun}es` : `${noun}s`);
/** Whether a measure reads as plural: "orders", "people", "customers won", but not "revenue", "NPS" or "deal value". */
export const isPlural = (name: string) => {
  const words = name.split(" ");
  return [words[0] ?? "", words.at(-1) ?? ""].some((word) => /^people$/i.test(word) || (/[^s]s$/.test(word) && word !== word.toUpperCase()));
};
const be = (name: string) => (isPlural(name) ? "are" : "is");
/** "A", "A and B", "A, B and C". */
const list = (names: string[]) => (names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);
/** "month by month", from the time field. */
const step = (field: string, spec: WidgetSpec) => {
  const name = nameOf(field, spec).toLowerCase();
  return `${name} by ${name}`;
};
const isTime = (field: string | undefined) => Boolean(field && TIME.test(field));
/** A measure named after a period (q3_2025, a 2026-04 column): it reads as "in Q3 2025", "the Q3 2025 total". */
const isPeriod = (field: string) => PERIOD.test(field) || MONTH_COLUMN.test(field);
/** "the most revenue", but "the highest amount". */
const most = (measure: string) => `${GENERIC_MEASURE.test(measure) ? "highest" : "most"} ${measure}`;
/** "revenue", but "the amount". */
const whole = (measure: string) => (GENERIC_MEASURE.test(measure) ? `the ${measure}` : measure);
/** Where lower is better: "which departments stayed within budget?", singular for several words ("which sales rep"). */
const stayedWithin = (entity: string, goal: string) => {
  const plurals = plural(entity);
  return plurals ? `which ${plurals} stayed within ${goal}?` : `which ${entity} stayed within ${goal}?`;
};

/**
 * The sales question a chart answers, worded from its own fields. Used next to a chart, and by the Taller, where
 * every new version keeps the original's numbers and says which question it answers. The rows, when given, name a
 * table's columns when the spec does not list them.
 */
export function questionOf(spec: WidgetSpec, rows: Row[] = []): Question {
  const view = (spec.view ?? { type: "table" }) as View;
  const name = (field: string) => nameOf(field, spec);
  const ask = (kind: QuestionKind, text: string): Question => ({ kind, text: text.charAt(0).toUpperCase() + text.slice(1) });
  const series = many(view.y);
  const facet = (spec.facet as { field?: string } | undefined)?.field;
  const targetLine = Boolean(view.lines) || (Array.isArray(view.reference) && view.reference.some((r) => TARGET.test(String((r as { label?: unknown }).label ?? ""))));
  // Lower is better (costs, churn): the question is whether it stayed within or under the target.
  const down = view.goodWhen === "down";
  // A target field by its own name when it reads as one ("budget", "plan"), else plain "target".
  const goalName = (field: string) => (TARGET.test(field) || TARGET.test(spec.fields?.[field]?.label ?? "") ? name(field) : "target");

  switch (view.type) {
    case "bar":
    case "hbar":
    case "list": {
      const label = one(view.type === "bar" ? view.x : view.label);
      const value = one(view.type === "bar" ? view.y : view.value);
      if (!label || !value) break;
      const entity = entityOf(label, spec);
      if (series.length > 1 && view.stacked === "percent") return ask("mix", `how is each ${entity} split between ${list(series.map(name))}?`);
      if (series.length > 1 && view.stacked) return ask("mix", `which ${entity} has the most in all, and what is it made of?`);
      if (series.length > 1) return ask("compare", `how do ${list(series.map(name))} compare for each ${entity}?`);
      // Stages whose numbers only shrink are a pipeline: the question is where they drop out, not which stage is biggest.
      const known = rows.length ? rows : spec.data?.type === "inline" ? ((spec.data as { rows?: Row[] }).rows ?? []) : [];
      if (STAGE.test(label) && shrinking(known, value)) return ask("flow", `where ${isPlural(name(value)) ? "do" : "does"} ${name(value)} drop out, ${entity} by ${entity}?`);
      // A named dashed target is the question itself: "Which teams meet the 1 hour target?"
      const goal = !isTime(label) && Array.isArray(view.reference) ? (view.reference as { label?: unknown }[]).find((r) => TARGET.test(String(r.label ?? "")))?.label : undefined;
      if (typeof goal === "string") {
        const named = goal.replace(/^[A-Z][a-z]*\b/, (word) => word.toLowerCase());
        const plurals = plural(entity);
        return ask("target", plurals ? `which ${plurals} meet the ${named}?` : `which ${entity} meets the ${named}?`);
      }
      // A target field where lower is better (costs against a budget): who stayed within it, in its own name.
      const budget = one(view.lines);
      if (budget && down) return ask("target", isTime(label) ? `did ${name(value)} stay within ${goalName(budget)}, ${step(label, spec)}?` : stayedWithin(entity, goalName(budget)));
      if (targetLine) return isTime(label) ? ask("target", `is ${name(value)} on target, ${step(label, spec)}?`) : ask("target", `which ${entity} is above or below target on ${name(value)}?`);
      if (isTime(label)) return ask("trend", `how ${be(name(value))} ${name(value)} moving, ${step(label, spec)}?`);
      return ask("rank", isPeriod(value) ? `which ${entity} had the most in ${name(value)}?` : `which ${entity} has the ${most(name(value))}?`);
    }
    case "pareto": {
      const [label, value] = [one(view.label), one(view.value)];
      if (!label || !value) break;
      const plurals = plural(entityOf(label, spec));
      const total = isPeriod(value) ? `${name(value)} total` : name(value);
      return plurals ? ask("rank", `which few ${plurals} drive most of the ${total}?`) : ask("rank", `which ${entityOf(label, spec)} drives the most ${name(value)}?`);
      break;
    }
    case "line":
    case "area": {
      const x = one(view.x);
      if (!x || !series.length) break;
      const first = name(series[0] as string);
      if (view.forecast) return ask("forecast", `where ${be(first)} ${first} heading next?`);
      if (view.stacked === "percent") return ask("mix", series.length > 3 ? `how is the share of each of the ${series.length} parts changing, ${step(x, spec)}?` : `how is the share of ${list(series.map(name))} changing, ${step(x, spec)}?`);
      if (view.stacked === "stream") return ask("mix", `which part is growing, ${step(x, spec)}?`);
      if (view.stacked) return ask("mix", `how is the total moving, ${step(x, spec)}, and what is it made of?`);
      if (targetLine) return ask("target", `${be(first)} ${first} on track to hit target?`);
      const each = facet ? `, in each ${name(facet)}` : "";
      if (series.length > 3) return ask("trend", `how is each of the ${series.length} lines moving, ${step(x, spec)}${each}?`);
      const what = list(series.map(name));
      return ask("trend", `how ${series.length > 1 ? "are" : be(what)} ${what} moving, ${step(x, spec)}${each}?`);
    }
    case "kpi": {
      const value = one(view.value);
      const target = one(view.target);
      if (value && target) return ask("target", down ? `${be(name(value))} ${name(value)} under ${goalName(target)}?` : `${be(name(value))} ${name(value)} on target?`);
      if (value) return ask("number", `${be(name(value))} ${name(value)} going up or down?`);
      break;
    }
    case "kpis": {
      const items = (Array.isArray(view.items) ? view.items : []).map((item) => one((item as { value?: unknown }).value)).filter((v): v is string => Boolean(v));
      return ask("number", items.length && items.length <= 3 ? `where do ${list(items.map(name))} stand right now?` : "where do the key numbers stand right now?");
    }
    case "donut":
    case "pie":
    case "waffle":
    case "treemap": {
      const [label, value] = [one(view.label), one(view.value)];
      if (label && value) return ask("mix", `what share of ${isPeriod(value) ? `the ${name(value)} total` : whole(name(value))} comes from each ${entityOf(label, spec)}?`);
      break;
    }
    case "sunburst":
    case "icicle": {
      const [outer, inner] = many(view.levels);
      const value = one(view.value);
      if (outer && inner && value) return ask("mix", `which ${name(outer)} brings the most ${name(value)}, and from which ${name(inner)}?`);
      break;
    }
    case "marimekko": {
      const [x, part] = [one(view.x), one(view.series)];
      if (x && part) return ask("mix", `how big is each ${name(x)}, and how is it split by ${name(part)}?`);
      break;
    }
    case "dumbbell":
    case "slope": {
      const [label, from, to] = [one(view.label), one(view.from), one(view.to)];
      if (!label || !from || !to) break;
      if (PERIOD.test(from) && PERIOD.test(to)) return ask("change", `how did each ${entityOf(label, spec)} change from ${name(from)} to ${name(to)}?`);
      return ask("compare", `how big is the gap between ${name(from)} and ${name(to)} for each ${entityOf(label, spec)}?`);
    }
    case "waterfall": {
      const start = many(view.totals)[0];
      const end = one(view.endLabel);
      if (start && end) return ask("change", `what took ${start} to ${end}?`);
      return ask("change", "what added to the total, and what took away from it?");
    }
    case "variance":
    case "bullet":
    case "meter":
    case "rings": {
      const [label, target] = [one(view.label), one(view.target)];
      if (label && target && down) return ask("target", stayedWithin(entityOf(label, spec), name(target)));
      if (label && target) return ask("target", `which ${entityOf(label, spec)} is above or below ${name(target)}?`);
      break;
    }
    case "gauge": {
      const [value, target] = [one(view.value), one(view.target)];
      if (value && target) return ask("target", `${be(name(value))} ${name(value)} above or below ${name(target)}?`);
      break;
    }
    case "histogram":
    case "beeswarm":
    case "boxplot":
    case "ridgeline": {
      const value = one(view.value);
      const group = one(view.group);
      if (!value) break;
      const what = isPeriod(value) ? `are the values in ${name(value)}` : `${be(name(value))} ${name(value)}`;
      return ask("spread", `how spread out ${what}${group ? ` in each ${name(group)}` : ""}?`);
    }
    case "scatter": {
      const [x, y] = [one(view.x), one(view.y)];
      if (x && y) return ask("relation", `${isPlural(name(y)) ? "do" : "does"} ${name(y)} go up as ${name(x)} ${isPlural(name(x)) ? "go" : "goes"} up?`);
      break;
    }
    case "funnel": {
      const value = one(view.value);
      if (value) return ask("flow", `where ${isPlural(name(value)) ? "do" : "does"} ${name(value)} drop out, step by step?`);
      break;
    }
    case "sankey":
    case "chord": {
      const value = one(view.value);
      if (value) return ask("flow", `where ${isPlural(name(value)) ? "do" : "does"} ${name(value)} flow, and how much goes each way?`);
      break;
    }
    case "calendar": {
      const value = one(view.value);
      if (value) return ask("rhythm", `which days have the most ${name(value)}?`);
      break;
    }
    case "rose": {
      const label = one(view.label);
      if (!label) break;
      const plurals = plural(name(label));
      if (series.length === 1) return plurals ? ask("rhythm", `which ${plurals} have the most ${name(series[0] as string)}?`) : ask("rhythm", `which ${name(label)} has the most ${name(series[0] as string)}?`);
      return plurals ? ask("rhythm", `which ${plurals} are busiest?`) : ask("rhythm", `which ${name(label)} is busiest?`);
    }
    case "heatmap": {
      const [x, y, value] = [one(view.x), one(view.y), one(view.value)];
      if (x && y && value) return ask("rhythm", `which ${name(x).toLowerCase()} and ${name(y).toLowerCase()} have the most ${name(value)}?`);
      break;
    }
    case "horizon": {
      const x = one(view.x);
      const against = typeof view.baselineLabel === "string" && view.baselineLabel.trim() ? ` against ${view.baselineLabel.trim()}` : "";
      if (x) return ask("trend", `how is each of the ${series.length} rows doing${against}, ${step(x, spec)}?`);
      break;
    }
    case "bump": {
      const [x, part] = [one(view.x), one(view.series)];
      if (!x || !part) break;
      const plurals = plural(name(part));
      return ask("rank", plurals ? `how does the ranking of ${plurals} change, ${step(x, spec)}?` : `how does the ranking by ${name(part)} change, ${step(x, spec)}?`);
      break;
    }
    case "radar": {
      const label = one(view.label);
      if (label && series.length) return ask("profile", `how do ${list(series.map(name))} compare, ${name(label)} by ${name(label)}?`);
      break;
    }
    case "candlestick": {
      const x = one(view.x);
      if (x) return ask("trend", `how did ${String(spec.title ?? "the price").toLowerCase()} move each ${name(x).toLowerCase()}, from open to close?`);
      break;
    }
    case "likert": {
      const label = one(view.label);
      if (label) return ask("opinion", `how do people answer each ${name(label)}?`);
      break;
    }
    case "timeline": {
      const label = one(view.label);
      if (label) return ask("schedule", `when does each ${name(label)} start and end?`);
      break;
    }
    case "table": {
      const columns = many(view.columns).length ? many(view.columns) : Object.keys(rows[0] ?? {});
      const first = columns[0];
      if (!first) break;
      // A column of gaps against a target (a delta named for it) makes the table about the target.
      const gapToTarget = columns.find((c) => {
        const format = spec.fields?.[c]?.format;
        return (typeof format === "object" ? (format as { type?: string }).type : format) === "delta" && (TARGET.test(c) || TARGET.test(spec.fields?.[c]?.label ?? ""));
      });
      if (gapToTarget && gapToTarget !== first) return ask("target", `which ${entityOf(first, spec)} is above or below target?`);
      const barred = columns.find((c) => {
        const format = spec.fields?.[c]?.format;
        return (typeof format === "object" ? (format as { type?: string }).type : format) === "bar";
      });
      if (barred && barred !== first && columns.length === 2) return ask("rank", `which ${entityOf(first, spec)} has the highest ${name(barred)}?`);
      if (barred && barred !== first) return ask("detail", `what are the exact numbers for each ${entityOf(first, spec)}, and which has the highest ${name(barred)}?`);
      const months = columns.filter((c) => MONTH_COLUMN.test(c));
      if (months.length >= 3) return ask("detail", `how did each ${entityOf(first, spec)} do, ${name(months[0] as string)} to ${name(months.at(-1) as string)}?`);
      return ask("detail", `what are the exact numbers for each ${entityOf(first, spec)}?`);
    }
  }
  return ask("detail", `what does ${String(spec.title ?? "this chart").toLowerCase()} show?`);
}
