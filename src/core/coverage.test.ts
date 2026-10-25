/**
 * The guard that keeps every view fully wired: no view ships with only a renderer. For each registered view, its
 * catalog example must read in plain words, ask a question of its own, have a guide entry and a place in the Taller,
 * and a view filled from its own rows must validate. A new view fails here until every layer knows it.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { explainChart } from "./explain.ts";
import { chartGuide } from "./guide.ts";
import { questionOf } from "./question.ts";
import { blockTypes } from "./registry.ts";
import { suggestView } from "./suggest.ts";
import { BASE_QUALITIES, FAMILY } from "./taller.ts";
import type { Row, WidgetSpec } from "./types.ts";
import { hasErrors, validateSpec } from "./validate.ts";
import "./views.ts";

const VIEWS = blockTypes("view");
const example = (type: string) => JSON.parse(readFileSync(`catalog/${type}.json`, "utf8")) as WidgetSpec;
const rowsOf = (spec: WidgetSpec) => spec.data.rows as Row[];
const made = (type: string): WidgetSpec => ({ data: { type: "inline", rows: [] }, view: { type } });

describe("every view is wired through every layer", () => {
  test("there are views to check, and every one has a catalog example", () => {
    expect(VIEWS.length).toBeGreaterThan(50);
    expect(VIEWS.filter((type) => !existsSync(`catalog/${type}.json`))).toEqual([]);
  });

  test("its example reads in its own words, not the generic guide", () => {
    const generic = explainChart(made("made-up-view"));
    expect(VIEWS.filter((type) => explainChart(example(type), rowsOf(example(type))) === generic)).toEqual([]);
  });

  test("its example asks a question of its own", () => {
    const generic = questionOf(made("made-up-view")).text;
    expect(VIEWS.filter((type) => questionOf(example(type), rowsOf(example(type))).text === generic)).toEqual([]);
  });

  test("it has a guide entry: what it is good and bad at", () => {
    expect(VIEWS.filter((type) => !chartGuide(type))).toEqual([]);
  });

  test("it has a Taller family and base qualities", () => {
    expect(VIEWS.filter((type) => !FAMILY[type])).toEqual([]);
    expect(VIEWS.filter((type) => !BASE_QUALITIES[type])).toEqual([]);
    for (const [type, scores] of Object.entries(BASE_QUALITIES)) expect([type, scores.every((s) => s >= 0 && s <= 1)]).toEqual([type, true]);
  });

  test("no explanation names a color: marks are read by side, shape and fill, since the palette flips with the theme", () => {
    const colors = /\b(red|green|blue|grey|gray|orange|yellow|purple|pink|black|white)\b/i;
    expect(VIEWS.filter((type) => colors.test(explainChart(example(type), rowsOf(example(type)))))).toEqual([]);
  });

  test("highlight is read aloud: the named marks stand out and the rest step back", () => {
    const rows = [{ region: "North", revenue: 1 }, { region: "East", revenue: 2 }];
    const bar = explainChart({ data: { type: "inline", rows }, view: { type: "bar", x: "region", y: "revenue", highlight: "East" } });
    expect(bar).toContain("East stands out; the rest step back.");
    const line = explainChart({ data: { type: "inline", rows: [] }, fields: { cost: { label: "Cost" } }, view: { type: "line", x: "month", y: ["revenue", "cost"], highlight: ["revenue", "cost"] } });
    expect(line).toContain("revenue and cost stand out; the rest step back.");
    expect(explainChart({ data: { type: "inline", rows }, view: { type: "bar", x: "region", y: "revenue" } })).not.toContain("stand");
  });

  test("a view filled from its own example's rows validates", () => {
    const broken = VIEWS.filter((type) => {
      const rows = rowsOf(example(type));
      const view = suggestView(type, rows);
      return hasErrors(validateSpec({ data: { type: "inline", rows }, view }, rows));
    });
    expect(broken).toEqual([]);
  });
});
