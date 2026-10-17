/**
 * Reference marks: a target line or a normal range drawn across a chart's
 * value axis, for example `{ value: 1200000, label: "Target" }`, a line
 * computed from a field, or a band `{ from, to, label }`.
 *
 * @module
 */
import { summarizeField } from "./headline.ts";
import type { HeadlineAgg } from "./headline.ts";
import type { OptionSchema } from "./registry.ts";
import type { Row } from "./types.ts";

/** One reference mark. Give `value`, or `field` (with `agg`), for a line; `from` and `to` for a band. */
export interface ReferenceMark {
  value?: number;
  field?: string;
  agg?: HeadlineAgg;
  from?: number;
  to?: number;
  label?: string;
}

/** The `reference` option shared by bar, line, area and scatter views. */
export const REFERENCE_OPTION: OptionSchema = {
  type: "array",
  description:
    'Target lines and bands across the value axis. Each item is { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; default avg), or { from, to, label } for a band. Example: [{ "value": 1200000, "label": "Target" }].',
};

/** Checks a view's `reference` list. One message per bad item. */
export function checkReference(view: Record<string, unknown>): string[] {
  const marks = view.reference;
  if (!Array.isArray(marks)) return [];
  return marks.flatMap((mark, i) => {
    const m = (mark ?? {}) as ReferenceMark;
    const ok = typeof m.value === "number" || typeof m.field === "string" || (typeof m.from === "number" && typeof m.to === "number");
    return ok ? [] : [`reference[${i}] needs a value, a field, or from and to.`];
  });
}

/** A reference mark resolved against the rows. */
export type ResolvedReference = { kind: "line"; value: number; label?: string } | { kind: "band"; from: number; to: number; label?: string };

/** Resolves a view's reference marks against its rows, dropping any that cannot be computed. */
export function resolveReferences(view: { reference?: unknown }, rows: Row[]): ResolvedReference[] {
  const marks = Array.isArray(view.reference) ? (view.reference as ReferenceMark[]) : [];
  return marks.flatMap((mark): ResolvedReference[] => {
    if (typeof mark.from === "number" && typeof mark.to === "number") return [{ kind: "band", from: mark.from, to: mark.to, label: mark.label }];
    const value = typeof mark.value === "number" ? mark.value : typeof mark.field === "string" ? summarizeField(rows, mark.field, mark.agg ?? "avg") : null;
    return value === null ? [] : [{ kind: "line", value, label: mark.label }];
  });
}

/** Every value the axis must cover to show the reference marks. */
export function referenceValues(references: ResolvedReference[]): number[] {
  return references.flatMap((ref) => (ref.kind === "line" ? [ref.value] : [ref.from, ref.to]));
}
