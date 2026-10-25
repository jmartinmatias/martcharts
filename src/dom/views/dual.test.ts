// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { explainChart } from "../../core/explain.ts";
import { questionOf } from "../../core/question.ts";
import { recommendCharts } from "../../core/recommend.ts";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { hasErrors, validateSpec } from "../../core/validate.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
});

async function draw(spec: Omit<WidgetSpec, "data"> & { rows: Row[] }) {
  const { rows, ...rest } = spec;
  await createWidget(target, { locale: "en-US", data: { type: "inline", rows }, ...rest } as WidgetSpec).ready;
  expect(target.querySelector(".fft-widget")?.getAttribute("data-state")).toBe("ready");
}

const all = (selector: string) => [...target.querySelectorAll(selector)];
const texts = (selector: string) => all(selector).map((node) => node.textContent);

const months = [
  { month: "2026-01", revenue: 870000, churn: 0.04 },
  { month: "2026-02", revenue: 900000, churn: 0.038 },
  { month: "2026-03", revenue: 960000, churn: 0.037 },
  { month: "2026-04", revenue: 1010000, churn: 0.036 },
];
const fields = { revenue: { label: "Revenue", format: { type: "currency", currency: "EUR", compact: true } }, churn: { label: "Churn", format: { type: "percent", decimals: 1 } } };
const spec = { rows: months, fields, view: { type: "dual", x: "month", y: "revenue", y2: "churn" } };

describe("dual view", () => {
  test("two panels, each captioned with its measure: bars above, a line below, and the periods named once under the lower panel", async () => {
    await draw(spec);
    expect(texts(".fft-dual-caption")).toEqual(["Revenue", "Churn"]);
    expect(all(".fft-bar").length).toBe(4);
    expect(all("path.fft-line").length).toBe(1);
    const labels = texts(".fft-tick-x");
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.at(-1)).toBe("2026-04");
    // No legend: the captions name the measures.
    expect(all(".fft-legend").length).toBe(0);
  });

  test("each panel reads on its own scale and in its own unit: euros above, percent below, bars from zero", async () => {
    await draw(spec);
    const panels = all(".fft-dual-panel").map((panel) => [...panel.querySelectorAll(".fft-tick-y")].map((t) => t.textContent ?? ""));
    expect(panels[0]?.every((t) => t.startsWith("€"))).toBe(true);
    expect(panels[0]).toContain("€0");
    expect(panels[1]?.every((t) => t.endsWith("%"))).toBe(true);
    expect(panels[1]).not.toContain("0.0%");
  });

  test("the bottom panel's line ends with its last value, as a line chart does", async () => {
    await draw(spec);
    expect(texts(".fft-end-label")).toEqual(["3.6%"]);
  });

  test("pointing at a period lights it on both panels and one tooltip gives both values", async () => {
    await draw(spec);
    const hits = all(".fft-hit");
    expect(hits.length).toBe(4);
    hits[2]?.dispatchEvent(new Event("focus"));
    expect(target.querySelector(".fft-marks[data-index='2']")?.hasAttribute("data-active")).toBe(true);
    expect(target.querySelector(".fft-crosshair")?.hasAttribute("hidden")).toBe(false);
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["2026-03", "€960KRevenue", "3.7%Churn"]);
    expect(hits[2]?.getAttribute("aria-label")).toBe("2026-03: Revenue €960K, Churn 3.7%");
  });

  test("marks choose bars or lines per panel; two lines run edge to edge", async () => {
    await draw({ ...spec, view: { ...spec.view, marks: ["line", "line"] } });
    expect(all(".fft-bar").length).toBe(0);
    expect(all("path.fft-line").length).toBe(2);
    expect(all(".fft-tick-x")[0]?.getAttribute("text-anchor")).toBe("start");
  });

  test("the same numbers wait in a table for screen readers", async () => {
    await draw(spec);
    expect(texts(".fft-sr-only th")).toEqual(["Month", "Revenue", "Churn"]);
  });

  test("validation: marks must be two of bar or line, and the two measures must differ", () => {
    const base = { data: { type: "inline", rows: months }, view: { type: "dual", x: "month", y: "revenue", y2: "churn" } };
    expect(hasErrors(validateSpec(base, months))).toBe(false);
    expect(validateSpec({ ...base, view: { ...base.view, marks: ["bar"] } }, months).map((i) => i.message).join(" ")).toMatch(/two of "bar" or "line"/);
    expect(validateSpec({ ...base, view: { ...base.view, y2: "revenue" } }, months).map((i) => i.message).join(" ")).toMatch(/same field/);
  });

  test("the guide says to read the shapes, not the crossings, and the example says where each measure went", () => {
    const whole = { locale: "en-US", data: { type: "inline", rows: months }, fields, view: spec.view } as WidgetSpec;
    const text = explainChart(whole, months);
    expect(text).toContain("revenue on top and churn below, each with its own scale, so look at the shapes, not at whether they cross.");
    expect(text).toContain("Here, revenue went from €870K in 2026-01 to €1M in 2026-04, and churn from 4.0% to 3.6%, moving in opposite directions.");
    expect(questionOf(whole).text).toBe("Do revenue and churn move together, month by month?");
  });

  test("recommended for two measures over time whose scales are too far apart to share an axis", () => {
    const pick = recommendCharts(months, { limit: 10 }).find((p) => p.type === "dual");
    expect(pick?.view).toEqual({ type: "dual", x: "month", y: "revenue", y2: "churn", marks: ["bar", "line"] });
    const alike = months.map(({ month, revenue }) => ({ month, revenue, cost: revenue * 0.7 }));
    expect(recommendCharts(alike, { limit: 10 }).find((p) => p.type === "dual")).toBeUndefined();
  });
});
