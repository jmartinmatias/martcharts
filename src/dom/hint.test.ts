// @vitest-environment jsdom
/**
 * The reading key: one quiet line on a chart form a reader may not know, how to read it; none on the forms everyone
 * reads, the author's own line or none when the spec says so, in the card's language, and out of the way while the
 * full guide is open.
 */
import { afterEach, describe, expect, test } from "vitest";
import { hintOf } from "../core/hint.ts";
import type { WidgetSpec } from "../core/types.ts";
import { validateSpec } from "../core/validate.ts";
import { WORDS_EN, wordsFor } from "../core/words.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

const spec = (view: Record<string, unknown>, extra: Partial<WidgetSpec> = {}) => ({ data: { type: "inline", rows: [] }, view, ...extra }) as unknown as WidgetSpec;
const hint = () => document.querySelector<HTMLElement>(".fft-hint");

afterEach(() => document.body.replaceChildren());

describe("hintOf", () => {
  test("unfamiliar forms carry one short line; familiar ones none", () => {
    for (const type of ["boxplot", "cycle", "marimekko", "dumbbell", "slope", "chord", "radar", "heatmap", "waterfall", "treemap", "sankey", "horizon", "ridgeline", "beeswarm", "bump", "sunburst", "icicle", "rose", "likert", "pareto"]) {
      const line = hintOf(spec({ type }));
      expect(line, type).not.toBe("");
      expect(line.split(" ").length, type).toBeLessThanOrEqual(20);
    }
    for (const type of ["bar", "hbar", "line", "area", "kpi", "kpis", "pie", "donut", "table", "meter"]) expect(hintOf(spec({ type })), type).toBe("");
  });

  test("outcomes count against the named target, or say only what a dot is", () => {
    expect(hintOf(spec({ type: "outcomes", value: "v" }))).toBe("Each dot is one equally likely outcome.");
    expect(hintOf(spec({ type: "outcomes", value: "v", target: 4.2e6, targetLabel: "plan" }))).toBe("Each dot is one equally likely outcome; the key counts each side of the line.");
  });

  test("variants read their own way: an arrow is a change, a cycle of months runs year by year", () => {
    expect(hintOf(spec({ type: "dumbbell", mark: "arrow" }))).toMatch(/^Each arrow/);
    expect(hintOf(spec({ type: "cycle", x: "day", by: "month" }))).toMatch(/per month/);
    const days = Array.from({ length: 21 }, (_, i) => ({ day: `2026-04-${String(i + 1).padStart(2, "0")}`, v: i }));
    expect(hintOf(spec({ type: "cycle", x: "day", value: "v" }), days)).toMatch(/per weekday/);
    expect(hintOf(spec({ type: "cycle", x: "day", value: "v" }), days.slice(0, 3))).toMatch(/per month/);
  });

  test("the spec's own line wins, and false keeps it off", () => {
    expect(hintOf(spec({ type: "bar" }, { hint: "Taller is better." }))).toBe("Taller is better.");
    expect(hintOf(spec({ type: "boxplot" }, { hint: false }))).toBe("");
    expect(validateSpec(spec({ type: "bar", x: "a", y: "b" }, { hint: false })).filter((i) => /hint/.test(String(i.message)))).toEqual([]);
  });

  test("French and German have a line for every form English has", () => {
    for (const lang of ["fr-FR", "de-DE"]) {
      expect(Object.keys(wordsFor(lang).hint.types).sort()).toEqual(Object.keys(WORDS_EN.hint.types).sort());
    }
    expect(hintOf(spec({ type: "boxplot" }, { locale: "fr-FR" }))).toMatch(/^La boîte/);
    expect(hintOf(spec({ type: "outcomes", target: 1, targetLabel: "Plan" }, { locale: "de-DE" }))).toMatch(/zählt jede Seite der Linie\.$/);
  });
});

describe("on the card", () => {
  const box = [{ g: "A", v: 1 }, { g: "A", v: 3 }, { g: "A", v: 9 }, { g: "B", v: 2 }, { g: "B", v: 5 }];
  const boxplot = (extra: Partial<WidgetSpec> = {}) => ({ title: "Spread", data: { type: "inline", rows: box }, view: { type: "boxplot", label: "g", value: "v" }, ...extra }) as WidgetSpec;

  test("shows under the header with its small label", async () => {
    await createWidget(document.body, boxplot()).ready;
    expect(hint()?.hidden).toBe(false);
    expect(hint()?.closest(".fft-header")).not.toBeNull();
    expect(hint()?.querySelector(".fft-hint-label")?.textContent).toBe("How to read");
    expect(hint()?.textContent).toMatch(/The box holds the middle half/);
  });

  test("is absent on a bar chart and when the spec turns it off", async () => {
    await createWidget(document.body, { data: { type: "inline", rows: box }, view: { type: "bar", x: "g", y: "v" } } as WidgetSpec).ready;
    expect(hint()?.hidden).toBe(true);
    document.body.replaceChildren();
    await createWidget(document.body, boxplot({ hint: false })).ready;
    expect(hint()?.hidden).toBe(true);
  });

  test("steps aside while the full guide is open", async () => {
    await createWidget(document.body, boxplot(), { guide: true }).ready;
    expect(document.querySelector<HTMLElement>(".fft-guide")?.hidden).toBe(false);
    expect(hint()?.hidden).toBe(true);
  });
});
