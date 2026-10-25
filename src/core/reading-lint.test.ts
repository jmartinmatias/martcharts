import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { humanize } from "./display.ts";
import { explainChart } from "./explain.ts";
import { questionOf } from "./question.ts";
import type { Row, WidgetSpec } from "./types.ts";
import "./views.ts";

/**
 * A lint over the reading layers: every catalog example's explanation and question, in English, French and German,
 * read as a careful editor would. No doubled words, no color names, no "undefined" or empty brackets, no field ids
 * leaking (camelCase or snake_case), a full stop or question mark at the end, a guide of four sentences at most and
 * one or two for the example, and in French and German no English words beyond the author's own (titles, labels,
 * data) and roughly as many sentences as the English says.
 */
const FILES = readdirSync("catalog").filter((file) => file.endsWith(".json")).sort();
const CATALOG = FILES.map((file) => [file.replace(/\.json$/, ""), JSON.parse(readFileSync(`catalog/${file}`, "utf8")) as WidgetSpec] as const);
const LOCALES = { en: "en-US", fr: "fr-FR", de: "de-DE" } as const;
type Lang = keyof typeof LOCALES;

const rowsOf = (spec: WidgetSpec) => spec.data.rows as Row[];
const withLocale = (spec: WidgetSpec, lang: Lang): WidgetSpec => ({ ...spec, locale: LOCALES[lang] });

/** Every word the spec's author wrote or the data holds: titles, labels, field names in words, values, option strings. */
function authorWords(spec: WidgetSpec): Set<string> {
  const texts: string[] = [spec.title ?? "", spec.subtitle ?? "", spec.description ?? "", spec.footer ?? ""];
  for (const [field, settings] of Object.entries(spec.fields ?? {})) texts.push(field, humanize(field), settings.label ?? "");
  const walk = (value: unknown) => {
    if (typeof value === "string") texts.push(value, humanize(value));
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") for (const [key, inner] of Object.entries(value)) { texts.push(key, humanize(key)); walk(inner); }
  };
  walk(spec.view);
  for (const row of rowsOf(spec)) walk(row);
  return new Set(texts.flatMap((text) => text.toLowerCase().match(/[\p{L}]+/gu) ?? []));
}

/** The author's own strings, longest first, so they can be blanked out before counting sentences. */
function authorStrings(spec: WidgetSpec): string[] {
  const strings = new Set<string>();
  const walk = (value: unknown) => {
    if (typeof value === "string" && value.length > 1) strings.add(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  for (const row of rowsOf(spec)) walk(row);
  for (const settings of Object.values(spec.fields ?? {})) if (settings.label) strings.add(settings.label);
  return [...strings].sort((a, b) => b.length - a.length);
}

/** Sentences, with the author's strings blanked so "Dr. M. Keller" or "Login problems." cannot split one. */
function sentences(text: string, spec: WidgetSpec): string[] {
  let plain = text;
  for (const s of authorStrings(spec)) plain = plain.split(s).join("X");
  // Abbreviated months and units ("oct. 2025", "Mio. €", "Sept.)") never end a sentence: the next word is not a capital.
  return plain.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ„«"“X])/u).filter((s) => s.trim());
}

/** English words that have no business in a French or German sentence of the library's own. */
const ENGLISH = new Set(
  "the and of each with more here which how what where when from by is are were has have had bar bars line lines dot dots chart biggest highest lowest most than this that its their there up down against between every per would one two only into over under after before".split(" "),
);
const COLORS: Record<Lang, RegExp> = {
  en: /\b(red|green|amber|blue|yellow|orange|grey|gray|purple|pink|darker|lighter)\b/i,
  fr: /\b(rouge|vert|verte|bleu|bleue|jaune|orange|gris|grise|violet|foncé|foncée)\b/i,
  de: /\b(rot|grün|gelb|blau|grau|orange|lila|dunkel|dunkler|heller)\b/i,
};

function lint(text: string, spec: WidgetSpec, lang: Lang, end: "." | "?"): string[] {
  const problems: string[] = [];
  const words = authorWords(spec);
  // Blank the author's strings first: data may hold a color ("Green Alliance") or a doubled word of its own.
  let own = text;
  for (const s of authorStrings(spec)) own = own.split(s).join("X");
  if (!text.trim()) problems.push("empty");
  if (!text.trim().endsWith(end)) problems.push(`does not end with "${end}"`);
  const doubled = /(?<!\p{L})(\p{L}{2,})\s+\1(?!\p{L})/iu.exec(own);
  if (doubled) problems.push(`doubled word "${doubled[1]}"`);
  const color = COLORS[lang].exec(own);
  if (color) problems.push(`color word "${color[1]}"`);
  if (/\bundefined\b|\bNaN\b|Infinity|\bnull\b|\(\s*\)|\[\s*\]/.test(text)) problems.push("undefined, NaN or empty brackets");
  const ids = /\b[a-z]+[A-Z][A-Za-z]*\b|\b[a-z]+_[a-z0-9_]+\b/.exec(own);
  if (ids) problems.push(`field id "${ids[0]}"`);
  if (lang !== "en") {
    const english = (own.toLowerCase().match(/[\p{L}]+/gu) ?? []).filter((word) => ENGLISH.has(word) && !words.has(word));
    if (english.length) problems.push(`English words: ${[...new Set(english)].join(", ")}`);
  }
  return problems;
}

describe("the reading layers read cleanly, in English, French and German", () => {
  for (const lang of ["en", "fr", "de"] as const) {
    test.each(CATALOG)(`${lang}: %s explains itself without a slip`, (_, spec) => {
      const local = withLocale(spec, lang);
      const full = explainChart(local, rowsOf(spec));
      const guide = explainChart(local);
      expect([lint(full, spec, lang, "."), sentences(guide, spec).length <= 4, sentences(full, spec).length - sentences(guide, spec).length <= 2]).toEqual([[], true, true]);
    });

    test.each(CATALOG)(`${lang}: %s asks its question without a slip`, (_, spec) => {
      const question = questionOf(withLocale(spec, lang), rowsOf(spec)).text;
      expect(lint(question, spec, lang, "?")).toEqual([]);
    });
  }

  test.each(CATALOG)("fr and de say about as much as the English for %s: within one sentence", (_, spec) => {
    const count = (lang: Lang) => sentences(explainChart(withLocale(spec, lang), rowsOf(spec)), spec).length;
    const en = count("en");
    expect([Math.abs(count("fr") - en) <= 1, Math.abs(count("de") - en) <= 1]).toEqual([true, true]);
  });

  test("French and German ask the same kind of question as English", () => {
    for (const [, spec] of CATALOG) {
      const kind = questionOf(spec, rowsOf(spec)).kind;
      expect([questionOf(withLocale(spec, "fr"), rowsOf(spec)).kind, questionOf(withLocale(spec, "de"), rowsOf(spec)).kind]).toEqual([kind, kind]);
    }
  });
});
