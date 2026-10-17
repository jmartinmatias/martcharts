/**
 * Text templates: titles, subtitles, footers and headline captions can name
 * values from the rows a view draws, so the words follow the data through
 * filters and time ranges.
 *
 * - `{first:field}`, `{last:field}`: the first or last row's value.
 * - `{sum:field}`, `{avg:field}`, `{min:field}`, `{max:field}`: a summary of the field.
 * - `{count}`: the number of rows.
 *
 * Values use the field's format (summaries fall back to short numbers).
 *
 * @module
 */
import { formatValue } from "./display.ts";
import { summarizeField } from "./headline.ts";
import type { FieldSpec, Row } from "./types.ts";

const TOKEN = /\{(first|last|sum|avg|min|max):([^{}:]+)\}|\{count\}/g;

/** Each template in `text` that names a field, with the field it names. */
export function templateRefs(text: string): { token: string; field: string }[] {
  return [...text.matchAll(TOKEN)].flatMap((match) => (match[2] ? [{ token: match[0], field: match[2] }] : []));
}

/** The fields a text's templates name, each once, in order. */
export function templateFields(text: string): string[] {
  return [...new Set(templateRefs(text).map((ref) => ref.field))];
}

/** True when `text` holds at least one template. */
export function hasTemplate(text: string): boolean {
  return [...text.matchAll(TOKEN)].length > 0;
}

/** `text` with every template replaced by its value from `rows`. Unknown words in braces are left alone. */
export function fillTemplate(text: string, rows: Row[], fields: Record<string, FieldSpec> | undefined, locale?: string): string {
  return text.replace(TOKEN, (_match, agg: string | undefined, field: string | undefined) => {
    if (!agg || !field) return new Intl.NumberFormat(locale).format(rows.length);
    const format = fields?.[field]?.format;
    if (agg === "first" || agg === "last") {
      const row = agg === "first" ? rows[0] : rows[rows.length - 1];
      return row ? formatValue(row[field], format, locale) : "";
    }
    const value = summarizeField(rows, field, agg as "sum" | "avg" | "min" | "max");
    return value === null ? "" : formatValue(value, format ?? { type: "number", compact: true }, locale);
  });
}
