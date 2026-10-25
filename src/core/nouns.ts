/**
 * What a row is, in English: the noun a reading guide or a question calls each row ("regulation", "client"), and a
 * field's label unless another field shares it. Shared by the English reading layer (explain.ts, question.ts) and
 * the French and German one (explain-words.ts), and kept apart from the latter so English needs nothing else.
 *
 * @module
 */
import { fieldLabel, humanize } from "./display.ts";
import type { WidgetSpec } from "./types.ts";

/** Fields that name rows without saying what the rows are. */
export const GENERIC_FIELD = /^(name|title|label|id|item|key)$/i;

/** Nouns that say what a row is, singular: found in a title or description, they name the rows better than "entry". */
const KNOWN_NOUNS = new Set(
  (
    "account action application bank branch campaign category city client company contract country customer deal department " +
    "employee event feature firm fund invoice issue market member metric office order partner person plan portfolio product " +
    "project provision region regulation rep rule segment state stakeholder store supplier task team ticket topic user vendor"
  ).split(" "),
);

/** Words that follow "each" without naming a thing ("each one", "each month by month"). */
const NOT_NOUNS = /^(.{1,2}|one|other|and|the|its|their|for|from|with|into|onto|time|row|column|month|week|day|year|quarter|single|every)$/;

/** "regulations" to "regulation", "companies" to "company". */
export const singular = (noun: string) => (/ies$/.test(noun) ? `${noun.slice(0, -3)}y` : /(ch|sh|x|ss)es$/.test(noun) ? noun.slice(0, -2) : /[^s]s$/.test(noun) ? noun.slice(0, -1) : noun);

/**
 * What one row is, in English, for a field that says nothing by its name ("name", "title"): its own label when the
 * author gave one ("Regulation"), else the noun the card's words use ("Where each regulation stands", "Client x-ray",
 * "A client's events"), else the fallback ("entry"). Any other field is named by itself.
 */
export function entityNoun(field: string | undefined, spec: WidgetSpec, fallback = "entry"): string {
  if (!field) return fallback;
  const label = spec.fields?.[field]?.label;
  if (!GENERIC_FIELD.test(field)) return nameIn(field, spec);
  if (label && !GENERIC_FIELD.test(label)) return /^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
  const words = [spec.title, spec.subtitle, spec.description].map((text) => String(text ?? "").toLowerCase());
  for (const text of words) {
    const each = /\beach ([a-z]+)\b/.exec(text)?.[1];
    if (each && !NOT_NOUNS.test(each)) return singular(each);
  }
  // "Revenue by customer", "Provisions by regulation": the rows are what the title ends "by".
  const by = /\bby ([a-z]+)$/.exec(words[0] ?? "")?.[1];
  if (by && !NOT_NOUNS.test(by)) return singular(by);
  for (const text of words) {
    for (const word of text.match(/[a-z]+/g) ?? []) if (KNOWN_NOUNS.has(singular(word))) return singular(word);
  }
  return fallback;
}

/** A field's name in the middle of an English sentence: "revenue", but "North" and "NPS" keep their capitals. */
function nameIn(field: string, spec: WidgetSpec): string {
  const short = ({ kpi: "KPI", nps: "NPS" } as Record<string, string>)[field.toLowerCase()];
  if (short && !spec.fields?.[field]?.label) return short;
  const label = fieldLabel(field, spec.fields);
  return /^[a-z]/.test(field) && /^[A-Z][a-z]*\b/.test(label) ? label[0]?.toLowerCase() + label.slice(1) : label;
}

/**
 * A field's label, unless another field shares it: then neither label can say which is which, and the field's own
 * name in words does ("stakeholder", where both the stakeholder and the flag are labelled "Must comply"). Undefined
 * when the label is the field's alone.
 */
export function distinctLabel(field: string, spec: WidgetSpec, others: (string | undefined)[]): string | undefined {
  const label = spec.fields?.[field]?.label;
  if (!label) return undefined;
  const clash = others.some((other) => other && other !== field && spec.fields?.[other]?.label === label);
  return clash ? humanize(field).toLowerCase() : undefined;
}

/**
 * What one row is, from the card's own words alone (its title and description, never a field's label): the client a
 * history is about, where the event field's label ("Event") names the dots, not whose story it is.
 */
export function cardNoun(spec: WidgetSpec, fallback = "entry"): string {
  return entityNoun("name", { ...spec, fields: {} }, fallback);
}
