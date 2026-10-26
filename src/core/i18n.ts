/**
 * A spec's own words in other languages. A widget or a dashboard may carry `i18n: { fr: {...}, de: {...} }`: for
 * each language, the same shape as the spec, holding only its words (a title, a field's label, a section's name).
 * Drawn in that language (a locale such as fr-FR or de-CH), the words are laid over the spec's own before anything
 * reads it; the data, the fields' formats and every other setting stay as written, and the spec keeps `i18n`, so a
 * copied or exported spec still speaks all its languages.
 *
 * Arrays are laid over item by item (a board's widgets, a view's reference lines), so an override names the items it
 * changes and leaves the others as `{}`.
 *
 * @module
 */
import type { Issue } from "./types.ts";

/** The languages a spec may add words in, besides the one it is written in. */
export const I18N_LANGUAGES = ["fr", "de", "en"] as const;
export type I18nLanguage = (typeof I18N_LANGUAGES)[number];

/** A language's words, in the spec's own shape: strings, or objects and arrays of them. */
export type I18nWords = { [key: string]: I18nValue };
type I18nValue = string | I18nWords | I18nValue[];

/** The language of a locale, when a spec can carry words for it: fr-FR is fr, de-CH is de. */
export function i18nLanguage(locale: string | undefined): I18nLanguage | undefined {
  const lang = (locale ?? "").toLowerCase().split(/[-_]/)[0];
  return (I18N_LANGUAGES as readonly string[]).includes(lang ?? "") ? (lang as I18nLanguage) : undefined;
}

/** A map of words: every value a string. */
function isWordMap(value: unknown): value is Record<string, string> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.values(value as object).every((v) => typeof v === "string");
}

/** Lays one value over another: words replace words, objects merge key by key, arrays item by item. */
function lay(base: unknown, over: unknown): unknown {
  if (typeof over === "string") return over;
  if (Array.isArray(over)) {
    if (!Array.isArray(base)) return base;
    return base.map((item, i) => (i < over.length ? lay(item, over[i]) : item));
  }
  if (over && typeof over === "object") {
    if (!base || typeof base !== "object" || Array.isArray(base)) return base;
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [key, value] of Object.entries(over as Record<string, unknown>)) {
      if (key in out) out[key] = lay(out[key], value);
      // A field's or a filter's words for its values may be new in a language: a map of words, never a setting.
      else if (key === "values" && isWordMap(value)) out[key] = value;
    }
    return out;
  }
  return base;
}

/**
 * The spec in a locale's language: its `i18n` words for that language laid over its own. Unchanged when it has none
 * for that language. Only what the spec already has is replaced: a word for a key it lacks is left out, so a
 * translation can never add a setting.
 */
export function localizeSpec<T extends object>(spec: T, locale: string | undefined): T {
  const lang = i18nLanguage(locale);
  const words = lang ? (spec as { i18n?: Partial<Record<I18nLanguage, I18nWords>> }).i18n?.[lang] : undefined;
  if (!words) return spec;
  const { i18n, ...rest } = spec as T & { i18n?: unknown };
  return { ...(lay(rest, words) as T), i18n } as T;
}

/** Problems with an `i18n` block: an unknown language, or a leaf that is not words. */
export function checkI18n(i18n: unknown, path = "i18n"): Issue[] {
  if (i18n === undefined) return [];
  const issues: Issue[] = [];
  if (!i18n || typeof i18n !== "object" || Array.isArray(i18n)) {
    return [{ level: "error", path, message: "i18n is an object of languages, such as { \"fr\": { \"title\": \"…\" } }." }];
  }
  const walk = (value: unknown, at: string) => {
    if (typeof value === "string") return;
    if (Array.isArray(value)) return value.forEach((item, i) => walk(item, `${at}[${i}]`));
    if (value && typeof value === "object") return Object.entries(value).forEach(([key, item]) => walk(item, `${at}.${key}`));
    issues.push({ level: "error", path: at, message: "i18n holds words only: strings, in objects and arrays shaped like the spec." });
  };
  for (const [lang, words] of Object.entries(i18n as Record<string, unknown>)) {
    if (!(I18N_LANGUAGES as readonly string[]).includes(lang)) {
      issues.push({ level: "error", path: `${path}.${lang}`, message: `i18n languages are ${I18N_LANGUAGES.join(", ")}.` });
      continue;
    }
    if (!words || typeof words !== "object" || Array.isArray(words)) {
      issues.push({ level: "error", path: `${path}.${lang}`, message: "Each language's words are an object shaped like the spec." });
      continue;
    }
    walk(words, `${path}.${lang}`);
  }
  return issues;
}
