/**
 * The headline: one big number above any view, with its change, the way
 * dashboards lead a chart with its key figure ("$2.86M, down 5.2%").
 *
 * @module
 */
import { readNumber } from "./formats.ts";
import type { OptionSchema } from "./registry.ts";
import type { Row } from "./types.ts";

/** How the headline turns the rows into one number. */
export type HeadlineAgg = "last" | "first" | "sum" | "avg" | "min" | "max";

/** `headline: { value, agg?, compare?, compareLabel?, goodWhen?, caption? }` on a widget spec. */
export interface HeadlineSpec {
  /** Field holding the number. */
  value: string;
  /** `last` (default) or `first` row, or `sum`, `avg`, `min`, `max` over every row. */
  agg?: HeadlineAgg;
  /** `"previous"` for the row before the one shown, or a field summarized the same way as the value. */
  compare?: string;
  /** Names the comparison after the change, for example "vs last year". Left out by default. */
  compareLabel?: string;
  /** Whether a rise is good news. Default `up`. */
  goodWhen?: "up" | "down";
  /** Small text under the number, for example "active customers". */
  caption?: string;
}

/** The headline's options, for validation, docs and agents. */
export const HEADLINE_OPTIONS: Record<string, OptionSchema> = {
  value: { type: "field", required: true, description: "Field holding the headline number." },
  agg: { type: "enum", values: ["last", "first", "sum", "avg", "min", "max"], default: "last", description: "Which row, or which summary of every row, to show." },
  compare: { type: "string", description: '"previous" for the row before the one shown, or a field summarized the same way, to show the change as a percentage.' },
  compareLabel: { type: "string", description: 'Names the comparison after the change, for example "vs last year".' },
  goodWhen: { type: "enum", values: ["up", "down"], default: "up", description: "Whether a rise is good news (revenue) or bad news (costs)." },
  caption: { type: "string", description: 'Small text under the number, for example "active customers".' },
};

/** One number from a field over the rows: the last or first row's value, or the sum, average, minimum or maximum. */
export function summarizeField(rows: Row[], field: string, agg: HeadlineAgg): number | null {
  if (agg === "last" || agg === "first") {
    const row = agg === "last" ? rows[rows.length - 1] : rows[0];
    return row ? readNumber(row[field]) : null;
  }
  const numbers = rows.map((row) => readNumber(row[field])).filter((n): n is number => n !== null);
  if (numbers.length === 0) return null;
  if (agg === "sum") return numbers.reduce((total, n) => total + n, 0);
  if (agg === "avg") return numbers.reduce((total, n) => total + n, 0) / numbers.length;
  return agg === "min" ? Math.min(...numbers) : Math.max(...numbers);
}

/** The headline number and the number it is compared with, from the rows a view draws. */
export function computeHeadline(headline: HeadlineSpec, rows: Row[]): { value: number | null; before: number | null } {
  const agg = headline.agg ?? "last";
  const value = summarizeField(rows, headline.value, agg);
  let before: number | null = null;
  if (headline.compare === "previous") {
    const index = agg === "first" ? 1 : rows.length - 2;
    const row = rows[index];
    before = row && rows.length > 1 ? readNumber(row[headline.value]) : null;
  } else if (headline.compare) {
    before = summarizeField(rows, headline.compare, agg);
  }
  return { value, before };
}
