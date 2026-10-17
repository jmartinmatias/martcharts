import { describe, expect, test } from "vitest";
import { explainChart } from "./explain.ts";
import { createVariants, profileData } from "./taller.ts";
import type { Variant } from "./taller.ts";
import type { Row, WidgetSpec } from "./types.ts";
import { hasErrors, validateSpec } from "./validate.ts";

/** A year of monthly costs against a flat budget: 9 months stayed within it and 3 went over (Mar, Jun and Sep). */
const costs: Row[] = [48000, 47000, 52000, 49000, 46000, 51000, 45000, 48500, 53000, 47500, 46500, 44000].map((cost, i) => ({
  month: `2026-${String(i + 1).padStart(2, "0")}`,
  cost,
  budget: 50000,
  invoices: 120 + i * 3,
}));
const euros = { type: "currency", currency: "EUR" } as const;
const fields: WidgetSpec["fields"] = { month: { label: "Month", format: { type: "date", style: "month" } }, cost: { label: "Cost", format: euros }, budget: { label: "Budget", format: euros }, invoices: { label: "Invoices", format: "number" } };
const costVsBudget: WidgetSpec = {
  id: "cost-vs-budget",
  title: "Monthly cost against budget",
  locale: "en-US",
  data: { type: "inline", rows: costs },
  fields,
  view: { type: "bar", x: "month", y: "cost", lines: "budget", goodWhen: "down" },
};
const { goodWhen: _goodWhen, ...upView } = costVsBudget.view;
/** The same chart without goodWhen: higher is better, as for revenue. */
const unjudged: WidgetSpec = { ...costVsBudget, view: upView as WidgetSpec["view"] };

/** Every version across a few seeds. */
const across = (spec: WidgetSpec, rows: Row[], seeds = [1, 2, 3, 4, 5, 6, 7, 8], count = 12) => seeds.flatMap((seed) => createVariants(spec, rows, { seed, count }));
/** Which side is good news, wherever a version draws its target field: bars with the line, one number, or the tile that carries it. */
const sides = (v: Variant): unknown[] => {
  const view = (v.spec.view ?? {}) as Record<string, unknown>;
  if ((view.type === "bar" && view.lines) || (view.type === "kpi" && view.target) || view.type === "variance") return [view.goodWhen];
  if (view.type === "kpis") return (view.items as { target?: unknown; goodWhen?: unknown }[]).filter((item) => item.target).map((item) => item.goodWhen);
  return [];
};
const judging = (v: Variant) => sides(v).length > 0;

describe("bars against a budget where lower is better", () => {
  test("the guide says a bar under the line stayed within the budget, and an outlined bar went over it", () => {
    const text = explainChart(costVsBudget, costs);
    expect(text).toContain("The line is the budget. Lower is better here: a bar under the line stayed within the budget, and an outlined bar went over it.");
    expect(text).not.toContain("beat");
  });

  test("the example counts the months that stayed within the budget", () => {
    expect(explainChart(costVsBudget, costs)).toContain("Here, cost stayed within the budget in 9 of 12 months.");
  });

  test("lollipops say the same, with a dot for a bar", () => {
    const lollipops: WidgetSpec = { ...costVsBudget, view: { ...costVsBudget.view, mark: "lollipop" } };
    expect(explainChart(lollipops, costs)).toContain("Lower is better here: a stick with a dot under the line stayed within the budget.");
  });

  test("without goodWhen, higher is better and the words stay as they were", () => {
    expect(explainChart(unjudged, costs)).toContain(
      "The line is the budget: a bar that reaches past it beat the budget, and an outlined bar fell short. Here, cost beat the budget in 3 of 12 months.",
    );
  });
});

describe("versions with a target field keep which side is good news", () => {
  test("lollipops with the budget line, one number with its sparkline and a row of numbers all keep lower is better", () => {
    const kept = across(costVsBudget, costs).filter(judging);
    // Bars with the budget line are the original's own shape, so they come from a single number (below).
    const forms = new Set(kept.map((v) => `${String(v.spec.view?.type)}${v.spec.view?.mark === "lollipop" ? " lollipop" : ""}`));
    expect([...forms]).toEqual(expect.arrayContaining(["bar lollipop", "kpi", "kpis"]));
    expect(kept.filter((v) => sides(v).some((side) => side !== "down")).map((v) => v.title)).toEqual([]);
  });

  test("a single number, a row of numbers or a variance that says lower is better passes it on with its target", () => {
    const kpi: WidgetSpec = { ...costVsBudget, view: { type: "kpi", value: "cost", x: "month", series: true, target: "budget", goodWhen: "down" } };
    const kpis: WidgetSpec = { ...costVsBudget, view: { type: "kpis", series: true, items: [{ value: "cost", target: "budget", goodWhen: "down" }, { value: "invoices" }] } };
    const variance: WidgetSpec = { ...costVsBudget, view: { type: "variance", label: "month", value: "cost", target: "budget", goodWhen: "down" } };
    for (const spec of [kpi, kpis, variance]) {
      expect([spec.view?.type, profileData(spec, costs).goodWhen]).toEqual([spec.view?.type, "down"]);
      const kept = across(spec, costs).filter(judging);
      expect([spec.view?.type, kept.some((v) => v.spec.view?.type === "bar")]).toEqual([spec.view?.type, true]);
      expect([spec.view?.type, kept.filter((v) => sides(v).some((side) => side !== "down")).map((v) => v.title)]).toEqual([spec.view?.type, []]);
    }
  });

  test("a tile that says lower is better without a target passes nothing on", () => {
    // Revenue carries the target, and churn's lower is better is about churn alone.
    const rows = costs.map((row, i) => ({ month: row.month, revenue: 90000 + i * 1000, target: 95000, churn: 0.04 - i * 0.001 }));
    const glance: WidgetSpec = { title: "At a glance", data: { type: "inline", rows }, view: { type: "kpis", series: true, items: [{ value: "revenue", target: "target" }, { value: "churn", goodWhen: "down" }] } };
    expect(profileData(glance, rows).goodWhen).toBeUndefined();
    expect(across(glance, rows).filter((v) => sides(v).some((side) => side !== undefined)).map((v) => v.title)).toEqual([]);
  });

  test("bullet bars, which tick a bar that reaches the target, are never made where lower is better", () => {
    const bullets = (spec: WidgetSpec) => across(spec, costs).filter((v) => v.spec.view?.type === "bullet").length;
    expect([bullets(costVsBudget), bullets(unjudged) > 0]).toEqual([0, true]);
  });

  test("a chart without goodWhen never gains one", () => {
    const versions = across(unjudged, costs);
    expect(versions.filter(judging).length).toBeGreaterThan(0);
    expect(versions.filter((v) => JSON.stringify(v.spec.view).includes("goodWhen")).map((v) => v.title)).toEqual([]);
  });

  test("every version is still valid", () => {
    for (const spec of [costVsBudget, unjudged]) {
      for (const v of across(spec, costs)) expect([v.title, hasErrors(validateSpec(v.spec, costs))]).toEqual([v.title, false]);
    }
  });
});

/** Monthly revenue by product, in euros: parts of one whole. */
const products: Row[] = Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, "0")}`, software: 1000 + i * 40, hardware: 600 + i * 10, services: 400 + i * 20 }));
const target = { value: 1200, label: "Target" };
const revenueBars: WidgetSpec = {
  id: "monthly-software",
  title: "Monthly software revenue",
  data: { type: "inline", rows: products },
  fields: { software: { label: "Software", format: euros }, hardware: { label: "Hardware", format: euros }, services: { label: "Services", format: euros } },
  view: { type: "bar", x: "month", y: "software", reference: [target] },
};
/** A line or area version that draws the first measure on its own axis: not stacked, not a stream or shares. */
const ownAxis = (v: Variant) => ["line", "area"].includes(String(v.spec.view?.type)) && !v.spec.view?.stacked;

describe("line versions keep a dashed target", () => {
  test("lines and washes of a chart with a dashed target keep it, and need no goodWhen since lines mark no misses", () => {
    const lines = across(revenueBars, products).filter(ownAxis);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.filter((v) => JSON.stringify(v.spec.view?.reference) !== JSON.stringify([target])).map((v) => v.title)).toEqual([]);
    expect(lines.some((v) => "goodWhen" in (v.spec.view ?? {}))).toBe(false);
    for (const v of lines) expect(explainChart(v.spec, products)).toContain("The dashed line is the target.");
  });

  test("stacked layers, streams, shares and horizon rows never carry it", () => {
    const all: WidgetSpec = { ...revenueBars, view: { type: "line", x: "month", y: ["software", "hardware", "services"], reference: [target] } };
    const versions = across(all, products);
    expect(versions.some(ownAxis)).toBe(true);
    const stacked = versions.filter((v) => v.spec.view?.stacked || v.spec.view?.type === "horizon");
    expect(stacked.length).toBeGreaterThan(0);
    expect(stacked.filter((v) => "reference" in (v.spec.view ?? {})).map((v) => v.title)).toEqual([]);
  });

  test("a chart without a dashed target never gains one", () => {
    const { reference: _reference, ...plain } = revenueBars.view;
    const lines = across({ ...revenueBars, view: plain as WidgetSpec["view"] }, products).filter(ownAxis);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.filter((v) => "reference" in (v.spec.view ?? {})).map((v) => v.title)).toEqual([]);
  });

  test("every version is still valid", () => {
    for (const v of across(revenueBars, products)) expect([v.title, hasErrors(validateSpec(v.spec, products))]).toEqual([v.title, false]);
  });
});
