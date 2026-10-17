/**
 * Turning values and field names into display text.
 *
 * @module
 */
import { isMissing } from "./transforms.ts";
import { getBlock } from "./registry.ts";
import type { FieldSpec, FormatSpec } from "./types.ts";

/**
 * Formats one value for display.
 *
 * Missing values (null, undefined, NaN) become empty text. Without a format,
 * numbers get locale number formatting and everything else becomes plain text.
 *
 * @param format A format name such as `"percent"`, or `{ type, ...options }`.
 * @param locale BCP 47 locale; defaults to the runtime locale.
 * @throws `UnknownBlockError` when the format type is not registered.
 *
 * @example
 * formatValue(0.256, "percent", "en-US");                            // "26%"
 * formatValue(1234.5, { type: "currency", currency: "EUR" }, "en-US"); // "€1,234.50"
 */
export function formatValue(value: unknown, format?: FormatSpec, locale?: string): string {
  if (isMissing(value)) return "";
  if (format === undefined) {
    return typeof value === "number" ? trueMinus(getBlock("format", "number").format(value, {}, locale)) : String(value);
  }
  const { type, ...options } = typeof format === "string" ? { type: format } : format;
  const text = getBlock("format", type).format(value, options, locale);
  return typeof value === "number" ? trueMinus(text) : text;
}

/**
 * A signed number in print form: a true minus sign (−) in place of the hyphen, as wide as the plus it pairs with
 * and read aloud as "minus". Only a sign at the start or after a space or bracket: dates and ranges keep their hyphens.
 */
export function trueMinus(text: string): string {
  return text.replace(/(^|[\s(])-(?=[\d€$£¥.,])/g, "$1\u2212");
}

/** An `Intl.NumberFormat` whose output signs with the true minus, for views that format their own changes. */
export function minusFormat(format: Intl.NumberFormat): { format: (value: number) => string } {
  return { format: (value) => trueMinus(format.format(value)) };
}

/**
 * Formats one value as a DOM node: the format's rich element when it has one
 * (a badge pill, for example), otherwise a text node with `formatValue`.
 */
export function formatNode(value: unknown, format: FormatSpec | undefined, locale: string | undefined, doc: Document): Node {
  if (format !== undefined && !isMissing(value)) {
    const { type, ...options } = typeof format === "string" ? { type: format } : format;
    const block = getBlock("format", type);
    if (block.element) return block.element(value, options, locale, doc);
  }
  return doc.createTextNode(formatValue(value, format, locale));
}

/**
 * Turns a field name into a label: `unitPrice` becomes "Unit price",
 * `revenue_eur` becomes "Revenue eur". Names in capitals stay as they are.
 */
/** The time step a field name stands for: "day" for day, days or date, "week", "month", "quarter", "year", "hour"; undefined otherwise. */
export function timeStep(field: string): string | undefined {
  if (/^dates?$/i.test(field)) return "day";
  return /^(day|week|month|quarter|year|hour)s?$/i.exec(field)?.[1]?.toLowerCase();
}

export function humanize(field: string): string {
  if (field === field.toUpperCase()) return field;
  const words = field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase()
    // Sales abbreviations keep their capitals: "KPI", "NPS score", never "Kpi".
    .replace(/\b(kpi|nps|arr|mrr|roi|cac|ltv|sla)\b/g, (word) => word.toUpperCase());
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The label for a field: its `fields[name].label`, or the humanized name. */
export function fieldLabel(field: string, fields?: Record<string, FieldSpec>): string {
  return fields?.[field]?.label ?? humanize(field);
}
