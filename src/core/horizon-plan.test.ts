import { describe, expect, test } from "vitest";
import { explainChart } from "./explain.ts";
import { questionOf } from "./question.ts";
import type { WidgetSpec } from "./types.ts";
import "./index.ts";

/** Four days of two rows against plan: A above it every day, B mostly under it. */
const rows = [
  { day: "2026-07-01", a: 10, b: -30 },
  { day: "2026-07-02", a: 50, b: -5 },
  { day: "2026-07-03", a: 90, b: 20 },
  { day: "2026-07-04", a: 30, b: 0 },
];
const horizon = (extra: Record<string, unknown> = {}): WidgetSpec => ({
  locale: "en-US",
  data: { type: "inline", rows },
  fields: { day: { format: { type: "date", style: "day" } } },
  view: { type: "horizon", x: "day", y: ["a", "b"], ...extra },
});

describe("a horizon against a named baseline", () => {
  test("the guide reads in its words: above plan, below it, and how far", () => {
    expect(explainChart(horizon({ baselineLabel: "plan" }), rows)).toBe(
      "Each row is one of A or B, day by day. Values above plan rise from the bottom of the row, and values below it hang from its top; the stronger the shade, the further from plan. Here, A was above plan on all 4 days, the most, and the furthest below was B on Jul 1, 30 under.",
    );
  });

  test("without a name it says the baseline, with the same example", () => {
    expect(explainChart(horizon(), rows)).toContain("Here, A was above the baseline on all 4 days, the most, and the furthest below was B on Jul 1, 30 under it.");
  });

  test("when no row ever falls below, it says so, and a tie for the most days claims no winner", () => {
    const up = rows.map((r) => ({ ...r, b: Math.abs(r.b) + 1 }));
    expect(explainChart({ ...horizon({ baselineLabel: "plan" }), data: { type: "inline", rows: up } }, up)).toContain("Here, A and B were above plan on all 4 days, and no row fell below it.");
  });

  test("the question asks how each row is doing against plan", () => {
    expect(questionOf(horizon({ baselineLabel: "plan" }), rows).text).toBe("How is each of the 2 rows doing against plan, day by day?");
  });
});
