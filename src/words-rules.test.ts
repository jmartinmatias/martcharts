import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { LEGEND_SENTENCE, MAX_SENTENCES, MAX_WORDS, sentencesOf, wordCount } from "./core/concise.ts";
import { explainChart } from "./core/explain.ts";
import type { Row, WidgetSpec } from "./core/types.ts";
import "./core/views.ts";

/**
 * Low noise in the words: every card says its period and scope in a short subtitle that never repeats its title or
 * describes its marks, names its source once and nowhere else, and gets a reading guide of three sentences at most.
 */
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(`${dir}/${f}`).isDirectory() ? walk(`${dir}/${f}`) : f.endsWith(".json") ? [`${dir}/${f}`] : []));
const WIDGETS = walk("widgets").map((file) => [file, JSON.parse(readFileSync(file, "utf8")) as WidgetSpec] as const);
const CATALOG = readdirSync("catalog").filter((f) => f.endsWith(".json")).map((f) => [f, JSON.parse(readFileSync(`catalog/${f}`, "utf8")) as WidgetSpec] as const);

/** Words a title and a subtitle may share without one repeating the other. */
const STOP = new Set("a an the and or of to in on by for with at as is are its it this that from per each vs than into over under up down out off".split(" "));
/** Words of a text, templates such as {first:month} counting as one word. */
/** Words as read once templates are filled: a token such as {first:asOf} becomes a date, three words ("Oct 24, 2026"). */
const words = (text = "") => text.replace(/\{[^}]*\}/g, "X X X").split(/\s+/).filter(Boolean);
/** The words that carry meaning, plural and possessive endings dropped, so "client", "clients" and "client's" match. */
const meaning = (text = "") =>
  new Set(
    text
      .replace(/\{[^}]*\}/g, " ")
      .toLowerCase()
      .split(/[^a-z0-9€%]+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map((w) => w.replace(/'s$|s$/, "")),
  );
/** Words that describe the marks or their colours: the chart already shows them. */
const MARKS = /\b(dots?|bars?|colou?red|shaded|sized|slices?|squares?|circles?|green|amber|blue|orange|grey|gray)\b/i;

describe("card text", () => {
  test.each(WIDGETS)("%s: a short title, and a subtitle with only the period and scope", (_file, spec) => {
    expect(words(spec.title).length).toBeLessThanOrEqual(7);
    expect(words(spec.subtitle).length).toBeLessThanOrEqual(14);
    const title = meaning(spec.title);
    expect([...meaning(spec.subtitle)].filter((w) => title.has(w))).toEqual([]);
    expect(spec.subtitle ?? "").not.toMatch(MARKS);
  });

  test.each(WIDGETS)("%s: one source, said once, with no file path", (_file, spec) => {
    expect(typeof spec.source?.name).toBe("string");
    expect(spec.note ?? spec.footer ?? "").not.toMatch(/^\s*Source:/);
    const said = [spec.title, spec.subtitle, spec.description, spec.note ?? spec.footer, spec.byline, spec.source?.name].filter(Boolean).join(" ");
    expect(said).not.toMatch(/\/data\/|\.json\b|\.csv\b/);
    expect((said.match(/fictional|for illustration/gi) ?? []).length).toBeLessThanOrEqual(1);
  });
});

describe("reading guides", () => {
  test.each(CATALOG)("%s: three sentences and sixty words at most, in every language, and never the legend", (_file, spec) => {
    for (const locale of ["en-US", "fr-FR", "de-DE"]) {
      const text = explainChart({ ...spec, locale }, spec.data.rows as Row[]);
      const sentences = sentencesOf(text);
      expect([locale, sentences.length <= MAX_SENTENCES, wordCount(text) <= MAX_WORDS]).toEqual([locale, true, true]);
      expect([locale, sentences.filter((sentence) => LEGEND_SENTENCE.test(sentence))]).toEqual([locale, []]);
    }
  });

  test("the rules see what they are meant to: a legend sentence and an abbreviation", () => {
    expect(LEGEND_SENTENCE.test("Each color is one sales region.")).toBe(true);
    expect(LEGEND_SENTENCE.test("The key under the chart shows the scale.")).toBe(true);
    expect(LEGEND_SENTENCE.test("This card shows the key numbers.")).toBe(false);
    expect(sentencesOf("Here, Dr. M. Keller is off track. Next one.")).toHaveLength(2);
  });
});

describe("the README", () => {
  const readme = readFileSync("README.md", "utf8");

  test("stays short: 150 lines at most, with link-outs for the rest", () => {
    expect(readme.split("\n").filter((line, i, all) => i < all.length - 1 || line).length).toBeLessThanOrEqual(150);
  });

  test("keeps its tables to short cells, 140 characters at most", () => {
    const long = readme
      .split("\n")
      .filter((line) => line.startsWith("|"))
      .flatMap((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
      .filter((cell) => cell.length > 140);
    expect(long).toEqual([]);
  });

  test("its page count is the site's, set by the docs script from the navigation", () => {
    const nav = /<nav class="site-nav"[^>]*>([\s\S]*?)<\/nav>/.exec(readFileSync("index.html", "utf8"))?.[1] ?? "";
    const pages = (nav.match(/<(a|button)\b/g) ?? []).length;
    expect(readme).toContain(`<!-- pages -->${pages}<!-- /pages -->`);
    expect(readme).not.toMatch(/\b(eleven|twelve|thirteen) pages\b/i);
  });
});
