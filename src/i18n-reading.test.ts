/**
 * French and German readings ("How to read it" and the card's question) speak the chart's own words: the values a
 * field translates (Nord for North) and the field names, never the English the data or the field keys are written in.
 *
 * @module
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { explainChart } from "./core/explain.ts";
import { localizeSpec } from "./core/i18n.ts";
import { runPipeline } from "./core/pipeline.ts";
import { questionOf } from "./core/question.ts";
import type { WidgetSpec } from "./core/types.ts";
import { createLocalFetch } from "./mcp/store.ts";
import "./core/explain-words.ts";

const widgets: WidgetSpec[] = readdirSync("widgets", { recursive: true })
  .map(String)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(`widgets/${file}`, "utf8")) as WidgetSpec);

/** English words a field key falls back to, when the author gave no label (they must never show in French or German). */
const KEYS = /\b(Revenue|Cost|Target|Source|Profit|Amount|Share)\b/;

/** The English values a localized spec translates, longest first, so "Mid-market" is checked before "Market". */
function translatedValues(spec: WidgetSpec): string[] {
  const out = new Set<string>();
  for (const field of Object.values(spec.fields ?? {})) {
    for (const [english, word] of Object.entries(field?.values ?? {})) if (english !== word && /[A-Za-z]{3,}/.test(english)) out.add(english);
  }
  return [...out].sort((a, b) => b.length - a.length);
}

describe.each(["fr-FR", "de-DE"])("readings in %s", (locale) => {
  const lang = locale.slice(0, 2) as "fr" | "de";
  // The words for values live in each language's translation, so a widget counts once it is laid over in this one.
  const worded = widgets.filter((spec) => spec.data?.type === "url" && Object.values(localizeSpec({ ...spec, locale }, locale).fields ?? {}).some((field) => field?.values));

  test.each(worded.map((spec) => [spec.id ?? spec.title, spec] as const))("%s reads its values and fields in the language", async (_id, written) => {
    const spec = localizeSpec({ ...written, locale }, locale);
    const rows = await runPipeline(spec, { fetch: createLocalFetch("public") });
    const said = `${questionOf(spec, rows).text} ${explainChart(spec, rows)}`;
    // An English value standing as a word of its own; a value equal to its translation (Segment) is allowed.
    const leaked = translatedValues(spec).filter((english) => {
      const word = spec.fields && Object.values(spec.fields).map((f) => f?.values?.[english]).find(Boolean);
      return word !== english && new RegExp(`(^|[^\\p{L}])${english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "u").test(said);
    });
    // On a leak the whole reading is shown, so the sentence that let English through is plain to see.
    expect([lang, leaked, leaked.length || KEYS.test(said) ? said : ""]).toEqual([lang, [], ""]);
  });
});
