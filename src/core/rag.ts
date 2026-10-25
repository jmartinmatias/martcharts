/**
 * RAG reporting: Red, Amber and Green statuses, plus N for no data. Pure functions, no DOM, so the same rules run in
 * the browser, in Node and over MCP.
 *
 * A status never relies on its color: each one has its own shape and its own words.
 *
 * - G: a filled circle, "On track"
 * - A: a triangle, "At risk"
 * - R: a square, "Off track"
 * - N: a hollow circle, "No data"
 *
 * Words and shapes can be overridden per spec.
 *
 * @module
 */

import { wordsFor, WORDS_EN } from "./words.ts";

/** A RAG status: Red, Amber, Green, or N for no data. */
export type Rag = "R" | "A" | "G" | "N";

/** Every status, worst first: the order boards sort and count in. */
export const RAG_ORDER: readonly Rag[] = ["R", "A", "G", "N"];

/** What each status says in words, so it reads without its color: the English set (see `ragWord` for a locale's own). */
export const RAG_WORDS: Readonly<Record<Rag, string>> = WORDS_EN.rag;

/** The shapes a status can take. A filled circle, a triangle and a square tell G, A and R apart without color. */
export type RagShape = "circle" | "triangle" | "square" | "ring" | "diamond";

/** Each status's default shape. */
export const RAG_SHAPES: Readonly<Record<Rag, RagShape>> = { G: "circle", A: "triangle", R: "square", N: "ring" };

const ALIASES: Record<string, Rag> = {
  r: "R",
  red: "R",
  "off track": "R",
  "off-track": "R",
  a: "A",
  amber: "A",
  yellow: "A",
  orange: "A",
  "at risk": "A",
  "at-risk": "A",
  g: "G",
  green: "G",
  "on track": "G",
  "on-track": "G",
  n: "N",
  grey: "N",
  gray: "N",
  "no data": "N",
  // The French and German status words read back too.
  conforme: "G",
  "à surveiller": "A",
  "a surveiller": "A",
  "hors trajectoire": "R",
  "aucune donnée": "N",
  "im plan": "G",
  "gefährdet": "A",
  "nicht im plan": "R",
  "keine daten": "N",
  none: "N",
  "n/a": "N",
  na: "N",
};

/**
 * Reads any status as R, A, G or N: the letters, red, amber or green (or yellow), grey, or the status words, in any
 * case. Anything else, including a missing value, is N, no data.
 */
export function ragOf(value: unknown): Rag {
  if (typeof value !== "string") return "N";
  return ALIASES[value.trim().toLowerCase()] ?? "N";
}

/** True when a value reads as a status: R, A, G, N or one of their names. Missing and blank values do not count. */
export function isRagValue(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "" && ALIASES[value.trim().toLowerCase()] !== undefined;
}

/** Thresholds that turn a number into a status. */
export interface RagThresholds {
  /** At or past this value the status is G. */
  green: number;
  /** At or past this value (but short of green) it is A; short of it, R. */
  amber: number;
  /** "up" (default) when more is better, as for revenue; "down" when less is better, as for days overdue. */
  goodWhen?: "up" | "down";
}

/** A number from a number or a numeric string, else null. */
function numberOf(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/[,\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * A number's status against thresholds.
 *
 * - goodWhen up: a value ≥ green is G, ≥ amber is A, anything lower is R.
 * - goodWhen down: a value ≤ green is G, ≤ amber is A, anything higher is R.
 *
 * A missing value is N.
 */
export function ragFromValue(value: unknown, { green, amber, goodWhen = "up" }: RagThresholds): Rag {
  const n = numberOf(value);
  if (n === null) return "N";
  if (goodWhen === "down") return n <= green ? "G" : n <= amber ? "A" : "R";
  return n >= green ? "G" : n >= amber ? "A" : "R";
}

/** How good a status is: G 2, A 1, R 0. No data has no score (null). */
export function ragScore(status: Rag): number | null {
  return status === "G" ? 2 : status === "A" ? 1 : status === "R" ? 0 : null;
}

/** The worst of several statuses, ignoring no data; N when every one is N (or there are none). */
export function worstOf(statuses: readonly unknown[]): Rag {
  let worst: Rag = "N";
  for (const value of statuses) {
    const status = ragOf(value);
    if (status === "N") continue;
    if (worst === "N" || (ragScore(status) as number) < (ragScore(worst) as number)) worst = status;
  }
  return worst;
}

/** Which way a status moved from one period to the next. */
export type RagTrend = "improved" | "worse" | "same";

/** improved (A to G, R to A), worse (G to A), or same. A move to or from no data is "same": nothing to compare. */
export function ragTrend(previous: unknown, current: unknown): RagTrend {
  const [before, now] = [ragScore(ragOf(previous)), ragScore(ragOf(current))];
  if (before === null || now === null || before === now) return "same";
  return now > before ? "improved" : "worse";
}

/** Sort key, worst first: R 0, A 1, G 2, N 3. */
export function ragRank(status: Rag): number {
  return RAG_ORDER.indexOf(status);
}

/** A status's words, from a spec's own `words` (keyed R, A, G, N) or the defaults. */
export function ragWord(status: Rag, words?: unknown, locale?: string): string {
  const own = words && typeof words === "object" ? (words as Record<string, unknown>)[status] : undefined;
  return typeof own === "string" && own ? own : wordsFor(locale).rag[status];
}

/** A status's shape, from a spec's own `shapes` (keyed R, A, G, N) or the defaults. */
export function ragShape(status: Rag, shapes?: unknown): RagShape {
  const own = shapes && typeof shapes === "object" ? (shapes as Record<string, unknown>)[status] : undefined;
  return typeof own === "string" && (["circle", "triangle", "square", "ring", "diamond"] as string[]).includes(own) ? (own as RagShape) : RAG_SHAPES[status];
}

/**
 * The SVG path of a shape in a `size` box, centered, with its optical weight balanced: a triangle is a little larger
 * than a square so both look the same size. The ring is drawn as a stroked circle by the caller (fill none).
 */
export function ragShapePath(shape: RagShape, size = 12): string {
  const c = size / 2;
  const f = (n: number) => Math.round(n * 100) / 100;
  switch (shape) {
    case "square": {
      const s = size * 0.36;
      return `M${f(c - s)} ${f(c - s)}H${f(c + s)}V${f(c + s)}H${f(c - s)}Z`;
    }
    case "triangle": {
      const h = size * 0.46;
      return `M${f(c)} ${f(c - h)}L${f(c + h * 1.06)} ${f(c + h * 0.78)}H${f(c - h * 1.06)}Z`;
    }
    case "diamond": {
      const s = size * 0.46;
      return `M${f(c)} ${f(c - s)}L${f(c + s)} ${f(c)}L${f(c)} ${f(c + s)}L${f(c - s)} ${f(c)}Z`;
    }
    default: {
      // circle and ring: a full circle as two arcs.
      const r = size * (shape === "ring" ? 0.34 : 0.4);
      return `M${f(c - r)} ${f(c)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0Z`;
    }
  }
}

/** Counts of each status in a list of values, plus the total with data. */
export function ragCounts(values: readonly unknown[]): Record<Rag, number> & { total: number } {
  const counts = { R: 0, A: 0, G: 0, N: 0, total: 0 };
  for (const value of values) {
    const status = ragOf(value);
    counts[status]++;
    if (status !== "N") counts.total++;
  }
  return counts;
}

/** One rule of the `rag` transform: a number field and the thresholds that turn it into a status. */
export interface RagRule extends RagThresholds {
  field: string;
  /** Name of the status column. Defaults to the field's name plus Rag (revenue → revenueRag). */
  as?: string;
}

/** The `rag` transform's step. */
export interface RagStep {
  type: "rag";
  rules: RagRule[];
  /** Name of a column holding the worst status of all the rules. */
  overall?: string;
}

/** Problems with a `rag` step's shape, one message each. */
export function ragStepProblems(step: Record<string, unknown>): string[] {
  const rules = step.rules;
  if (!Array.isArray(rules) || rules.length === 0) return ['rules needs at least one { "field", "green", "amber" }.'];
  const problems: string[] = [];
  rules.forEach((rule: unknown, i) => {
    if (!rule || typeof rule !== "object") return problems.push(`rules[${i}] must be an object such as { "field": "nps", "green": 40, "amber": 20 }.`);
    const { field, green, amber, goodWhen, as } = rule as Record<string, unknown>;
    if (typeof field !== "string" || !field) problems.push(`rules[${i}] needs a field.`);
    if (typeof green !== "number" || !Number.isFinite(green)) problems.push(`rules[${i}].green must be a number.`);
    if (typeof amber !== "number" || !Number.isFinite(amber)) problems.push(`rules[${i}].amber must be a number.`);
    if (goodWhen !== undefined && goodWhen !== "up" && goodWhen !== "down") problems.push(`rules[${i}].goodWhen must be up or down.`);
    if (as !== undefined && (typeof as !== "string" || !as)) problems.push(`rules[${i}].as must be a field name.`);
    if (typeof green === "number" && typeof amber === "number") {
      const down = goodWhen === "down";
      if (down ? amber < green : amber > green) problems.push(`rules[${i}]: amber must sit ${down ? "above" : "below"} green, since ${down ? "less" : "more"} is better.`);
    }
    return undefined;
  });
  if (step.overall !== undefined && (typeof step.overall !== "string" || !step.overall)) problems.push("overall must be the name of the column to write.");
  return problems;
}

/** Applies a `rag` step: a status column per rule, and the worst of them in `overall` when asked. Leaves its input alone. */
export function applyRag(rows: Record<string, unknown>[], step: RagStep): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = { ...row };
    const statuses: Rag[] = [];
    for (const rule of step.rules) {
      const status = ragFromValue(row[rule.field], rule);
      out[rule.as ?? `${rule.field}Rag`] = status;
      statuses.push(status);
    }
    if (step.overall) out[step.overall] = worstOf(statuses);
    return out;
  });
}
