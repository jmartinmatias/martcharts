/**
 * The reading layer's other languages, registered by explain-words.ts when it loads. explain.ts and question.ts write
 * English themselves and ask here for French and German; when nothing is registered they stay in English.
 *
 * The register lives on `globalThis` under a shared symbol, so a separate bundle can add the languages to another one:
 * the lite drop-in build leaves French and German out, and `martcharts-reading.iife.js`, loaded beside it, brings them
 * back.
 *
 * @module
 */
import type { Row, WidgetSpec } from "./types.ts";
import type { Lang } from "./words.ts";

/** French and German builders for the reading guide and the question. */
export interface ReadingLanguages {
  explainIn(lang: Exclude<Lang, "en">, spec: WidgetSpec, rows?: Row[]): string;
  questionIn(lang: Exclude<Lang, "en">, spec: WidgetSpec, rows: Row[], kind: string): string;
}

const KEY = Symbol.for("martcharts.reading-languages");
type Holder = { [KEY]?: ReadingLanguages };

/** Adds French and German to the reading layer, in this bundle and any other on the page. */
export function registerReadingLanguages(languages: ReadingLanguages): void {
  (globalThis as Holder)[KEY] = languages;
}

/** The French and German builders, when some bundle on the page brought them. */
export function readingLanguages(): ReadingLanguages | undefined {
  return (globalThis as Holder)[KEY];
}
