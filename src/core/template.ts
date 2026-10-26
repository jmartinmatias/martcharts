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
  let emptied = false;
  const filled = text.replace(TOKEN, (_match, agg: string | undefined, field: string | undefined) => {
    if (!agg || !field) return new Intl.NumberFormat(locale).format(rows.length);
    const format = fields?.[field]?.format;
    let value = "";
    if (agg === "first" || agg === "last") {
      const row = agg === "first" ? rows[0] : rows[rows.length - 1];
      value = row ? formatValue(row[field], format, locale) : "";
    } else {
      const summary = summarizeField(rows, field, agg as "sum" | "avg" | "min" | "max");
      value = summary === null ? "" : formatValue(summary, format ?? { type: "number", compact: true }, locale);
    }
    if (value) return value;
    emptied = true;
    return GAP;
  });
  return emptied ? tidy(filled) : filled;
}

/** Marks where a template had no value, so tidying removes only what joined that value to the sentence. */
const GAP = "\u0000";

/** Separators a template's value usually sits beside. */
const SEP = String.raw`(?:,|;|·|—|–|-|:)`;

/**
 * Text after a template had no value (its rows were filtered away): no separator left at either end or doubled in
 * the middle, single spaces, and a capital where the sentence now starts. "{last:quarter}, against the quarter
 * before" with no rows reads "Against the quarter before", not ", against the quarter before".
 */
export function tidy(text: string): string {
  const original = text.replaceAll(GAP, "").replace(/\s{2,}/g, " ").trim();
  let out = text
    // The word that led into a missing value goes with it ("since {first:month}", "depuis {first:mois}").
    .replace(new RegExp(String.raw`(?<![\p{L}\p{N}])(?:${CONNECTORS})\s*${GAP}`, "giu"), GAP)
    .replaceAll(GAP, "")
    .replace(/\(\s*\)/g, "")
    .replace(new RegExp(String.raw`\s*${SEP}\s*(?=${SEP})`, "g"), "")
    .replace(new RegExp(String.raw`^\s*${SEP}+\s*`), "")
    .replace(new RegExp(String.raw`\s*${SEP}+\s*$`), "")
    .replace(/\s{2,}/g, " ")
    .trim();
  // Nothing left worth reading: no text at all, rather than a stray word.
  if (out.replace(/[^\p{L}\p{N}]/gu, "").length < 3) out = "";
  return out && out !== original ? out.charAt(0).toLocaleUpperCase() + out.slice(1) : out;
}

/** Words that only join a value to the sentence, in the three languages the kit writes. */
const CONNECTORS = ["since", "to", "from", "until", "in", "of", "on", "at", "by", "vs", "against", "and", "depuis", "à", "au", "de", "du", "jusqu'à", "contre", "et", "seit", "bis", "von", "vom", "im", "gegen", "und"]
  .map((word) => word.replace(/'/g, "['’]"))
  .join("|");
