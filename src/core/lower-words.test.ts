import { describe, expect, test } from "vitest";
import { explainChart } from "./explain.ts";
import { questionOf } from "./question.ts";
import { explainVariant } from "./taller-explain.ts";
import type { Row, WidgetSpec } from "./types.ts";

/** Cost by department against a budget: lower is better, so a department under its budget is good news. */
const departments: Row[] = ["Sales", "Marketing", "R&D", "Support", "Finance", "HR"].map((department, i) => ({ department, cost: 300 + i * 40, budget: 400, plan: 380 }));
const euros = { type: "currency", currency: "EUR" } as const;
const fields: WidgetSpec["fields"] = { cost: { label: "Cost", format: euros }, budget: { label: "Budget", format: euros }, plan: { label: "Plan", format: euros }, actual: { label: "Actual", format: euros } };
const chart = (view: Record<string, unknown>, title = "Cost by department"): WidgetSpec => ({ title, locale: "en-US", data: { type: "inline", rows: departments }, fields, view: view as WidgetSpec["view"] });
/** The same view without goodWhen: higher is better, as for revenue. */
const up = (spec: WidgetSpec): WidgetSpec => {
  const { goodWhen: _goodWhen, ...view } = spec.view as Record<string, unknown>;
  return { ...spec, view: view as WidgetSpec["view"] };
};

const costBars = chart({ type: "bar", x: "department", y: "cost", lines: "budget", goodWhen: "down" });
const costVariance = chart({ type: "variance", label: "department", value: "actual", target: "budget", goodWhen: "down" }, "Operating costs against budget");
const churnFields: WidgetSpec["fields"] = { churn: { label: "Monthly churn", format: { type: "percent", decimals: 1 } }, cost: { label: "Monthly cost", format: euros } };
const churnKpi: WidgetSpec = { title: "Customer churn", data: { type: "inline", rows: [] }, fields: churnFields, view: { type: "kpi", value: "churn", series: true, x: "month", target: "target", goodWhen: "down" } };
const tiles = (items: Record<string, unknown>[]): WidgetSpec => ({ title: "At a glance", data: { type: "inline", rows: [] }, fields: churnFields, view: { type: "kpis", items } as WidgetSpec["view"] });

describe("questions where lower is better", () => {
  test("bars against a budget field ask who stayed within it, in the budget's own name", () => {
    expect(questionOf(costBars)).toEqual({ kind: "target", text: "Which departments stayed within budget?" });
    expect(questionOf(chart({ ...costBars.view, lines: "plan" })).text).toBe("Which departments stayed within plan?");
  });

  test("a row name of several words stays singular, as for a named target line", () => {
    const reps = chart({ type: "bar", x: "sales_rep", y: "cost", lines: "budget", goodWhen: "down" });
    expect(questionOf(reps).text).toBe("Which sales rep stayed within budget?");
  });

  test("bars over time ask whether it stayed within the budget, month by month", () => {
    const months = chart({ type: "bar", x: "month", y: "cost", lines: "budget", goodWhen: "down" }, "Monthly cost");
    expect(questionOf(months)).toEqual({ kind: "target", text: "Did cost stay within budget, month by month?" });
  });

  test("a variance of costs against budget asks who stayed within it", () => {
    expect(questionOf(costVariance)).toEqual({ kind: "target", text: "Which departments stayed within budget?" });
  });

  test("one number with a target asks whether it is under it", () => {
    expect(questionOf(churnKpi)).toEqual({ kind: "target", text: "Is monthly churn under target?" });
    const cost: WidgetSpec = { ...churnKpi, view: { type: "kpi", value: "cost", target: "budget", goodWhen: "down" } };
    expect(questionOf(cost).text).toBe("Is monthly cost under budget?");
  });

  test("without goodWhen, every question stays as it was", () => {
    expect(questionOf(up(costBars)).text).toBe("Which department is above or below target on cost?");
    expect(questionOf(up(chart({ type: "bar", x: "month", y: "cost", lines: "budget", goodWhen: "down" }))).text).toBe("Is cost on target, month by month?");
    expect(questionOf(up(costVariance)).text).toBe("Which department is above or below budget?");
    expect(questionOf(up(churnKpi)).text).toBe("Is monthly churn on target?");
  });
});

describe("taller version cards where lower is better", () => {
  test("a variance says a bar to the left stayed under its budget, and one to the right went over", () => {
    expect(explainVariant(costVariance, "Operating costs").explain).toBe("A bar to the left means actual stayed under its budget; to the right means it went over.");
  });

  test("without goodWhen, a variance reads as before", () => {
    expect(explainVariant(up(costVariance), "Operating costs").explain).toBe("A bar to the right means actual beat its target; to the left means it fell short.");
  });
});

describe("headline number guides where lower is better", () => {
  test("one number says the line under it tells whether it stayed under its target", () => {
    expect(explainChart(churnKpi)).toBe(
      "The big number is monthly churn. The small arrow says whether it went up or down since last time, and the line under it says whether it stayed under its target.",
    );
    expect(explainChart(up(churnKpi))).toContain("and the line under it says whether it reached its target.");
  });

  test("a row of tiles says it for the churn tile that carries the target", () => {
    expect(explainChart(tiles([{ value: "revenue" }, { value: "churn", target: "cap", goodWhen: "down" }]))).toBe(
      "Each tile is one key number, with a small arrow that says whether it went up or down since last time. A line under a tile says whether it stayed under its target.",
    );
  });

  test("tiles with both kinds of target name both sides", () => {
    expect(explainChart(tiles([{ value: "revenue", target: "goal" }, { value: "churn", target: "cap", goodWhen: "down" }]))).toContain(
      "A line under a tile says whether it reached its target, or stayed under it where lower is better.",
    );
  });

  test("a churn tile without a target changes nothing", () => {
    expect(explainChart(tiles([{ value: "revenue", target: "goal" }, { value: "churn", goodWhen: "down" }]))).toContain("A line under a tile says whether it reached its target.");
  });
});
