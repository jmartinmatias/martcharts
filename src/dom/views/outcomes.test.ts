// @vitest-environment jsdom
/**
 * Outcomes, a quantile dot plot: many simulated results cut into twenty equally likely dots, filled where they reach
 * the target, so the chance is counted rather than read off a band.
 */
import { afterEach, describe, expect, test } from "vitest";
import { explainChart } from "../../core/explain.ts";
import { outcomeOdds, quantileDots } from "../../core/outcomes.ts";
import type { WidgetSpec } from "../../core/types.ts";
import { validateSpec } from "../../core/validate.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

// 100 runs from 1 to 100: the twenty dots sit at the middle of each 5%.
const rows = Array.from({ length: 100 }, (_, i) => ({ run: i + 1, total: i + 1 }));
const spec = (view: Record<string, unknown> = {}): WidgetSpec => ({ locale: "en-US", data: { type: "inline", rows }, fields: { total: { label: "Total" } }, view: { type: "outcomes", value: "total", ...view } }) as WidgetSpec;

afterEach(() => document.body.replaceChildren());

describe("quantile dots", () => {
  test("twenty equally likely outcomes, and how many reach the target", () => {
    const sorted = rows.map((r) => r.total);
    const dots = quantileDots(sorted);
    expect(dots).toHaveLength(20);
    expect(dots[0]).toBeCloseTo(3.475);
    expect(outcomeOdds(sorted, dots, 71)).toMatchObject({ reach: 6, of: 20 });
    expect(outcomeOdds(sorted, dots, 71, "down").reach).toBe(14);
  });
});

describe("the outcomes view", () => {
  test("twenty dots, filled on the target's good side and rings on the other, counted in the key", async () => {
    await createWidget(document.body, spec({ target: 71, targetLabel: "plan" })).ready;
    expect(document.querySelectorAll(".fft-outcome")).toHaveLength(20);
    expect(document.querySelectorAll(".fft-outcome[data-miss]")).toHaveLength(14);
    expect([...document.querySelectorAll(".fft-legend li")].map((li) => li.textContent)).toEqual(["Reaches plan 71 · 6", "Short of plan 71 · 14"]);
    // The line is a column edge: every filled dot whole on its right, every ring whole on its left.
    const line = Number(document.querySelector(".fft-outcomes-target")?.getAttribute("x1"));
    for (const dot of document.querySelectorAll(".fft-outcome")) {
      const [cx, r] = [Number(dot.getAttribute("cx")), Number(dot.getAttribute("r"))];
      if (dot.hasAttribute("data-miss")) expect(cx + r).toBeLessThanOrEqual(line);
      else expect(cx - r).toBeGreaterThanOrEqual(line);
    }
  });

  test("every dot is in the drawing, none cut at the edges, and a stop for keys with its value", async () => {
    await createWidget(document.body, spec({ target: 71 })).ready;
    const width = Number(document.querySelector(".fft-outcomes svg")?.getAttribute("width"));
    for (const dot of document.querySelectorAll(".fft-outcome")) {
      const [cx, r] = [Number(dot.getAttribute("cx")), Number(dot.getAttribute("r"))];
      expect(cx - r).toBeGreaterThanOrEqual(0);
      expect(cx + r).toBeLessThanOrEqual(width);
    }
    document.querySelectorAll(".fft-outcome")[19]?.dispatchEvent(new Event("focus"));
    expect(document.querySelector(".fft-tooltip-title, .fft-tooltip h4, .fft-tooltip strong")?.textContent).toMatch(/Outcome 20 of 20/);
  });

  test("its guide counts the chance, and dots must be 5 to 100", () => {
    expect(explainChart(spec({ target: 71, targetLabel: "plan" }), rows)).toMatch(/6 of 20 equally likely outcomes reach the plan of 71, about a 30% chance/);
    expect(explainChart({ ...spec({ target: 71 }), locale: "fr-FR" }, rows)).toMatch(/6 issues également probables sur 20 atteignent/);
    expect(validateSpec(spec({ dots: 3 })).map((p) => p.message).join(" ")).toMatch(/dots must be a whole number from 5 to 100/);
  });
});
