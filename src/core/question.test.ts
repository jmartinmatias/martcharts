import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { questionOf } from "./question.ts";
import type { WidgetSpec } from "./types.ts";

const widgets = new Map(
  readdirSync("widgets")
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join("widgets", name), "utf8")) as WidgetSpec)
    .map((spec) => [spec.id as string, spec]),
);
const ask = (id: string) => questionOf(widgets.get(id) as WidgetSpec);

describe("questionOf", () => {
  test("a ranking asks who has the most, in the chart's own words", () => {
    const spec: WidgetSpec = { data: { type: "inline", rows: [] }, view: { type: "bar", x: "region", y: "revenue" } };
    expect(questionOf(spec)).toEqual({ kind: "rank", text: "Which region has the most revenue?" });
    expect(ask("feature-adoption").text).toBe("Which feature has the most accounts using it?");
    expect(ask("ticket-causes").text).toBe("Which few causes drive most of the tickets?");
    expect(ask("top-customers").text).toBe("Which customer has the most revenue?");
  });

  test("a target, a budget or a goal asks who is above or below it", () => {
    expect(ask("revenue-vs-target")).toEqual({ kind: "target", text: "Is revenue on target, month by month?" });
    expect(ask("response-time-by-team").text).toBe("Which team is above or below target on median minutes?");
    expect(ask("opex-variance").text).toBe("Which department is above or below budget?");
    expect(ask("region-targets").text).toBe("Which region is above or below target?");
    expect(ask("kpi-scorecard").text).toBe("Which KPI is above or below target?");
    expect(ask("nps-gauge").text).toBe("Is NPS above or below goal?");
    expect(ask("monthly-revenue").text).toBe("Is revenue on track to hit target?");
  });

  test("time asks how it is moving, or where it is heading when there is a forecast", () => {
    expect(ask("gross-profit")).toEqual({ kind: "trend", text: "How is gross profit moving, month by month?" });
    expect(ask("revenue-forecast")).toEqual({ kind: "forecast", text: "Where is revenue heading next?" });
    expect(ask("region-panels").text).toBe("How is revenue moving, month by month, in each region?");
    expect(ask("traffic-stream").text).toBe("Which part is growing, week by week?");
    expect(ask("product-mix-trend").text).toBe("How is the share of each of the 6 parts changing, month by month?");
    expect(ask("product-ranking").text).toBe("How does the ranking of products change, month by month?");
    expect(ask("revenue-kpi")).toEqual({ kind: "target", text: "Is monthly revenue on target?" });
    expect(ask("churn-kpi")).toEqual({ kind: "number", text: "Is monthly churn going up or down?" });
    expect(ask("new-customers-kpi").text).toBe("Are customers won going up or down?");
  });

  test("a whole asks what share comes from each part", () => {
    expect(ask("revenue-by-segment")).toEqual({ kind: "mix", text: "What share of revenue comes from each segment?" });
    expect(ask("customer-treemap").text).toBe("What share of revenue comes from each customer?");
    expect(ask("product-region-sunburst").text).toBe("Which product brings the most revenue, and from which region?");
    expect(ask("region-product-mix").text).toBe("How big is each region, and how is it split by product?");
    expect(ask("product-share").text).toBe("How is each region split between Core and Plus?");
    expect(ask("revenue-mix").text).toBe("Which region has the most in all, and what is it made of?");
  });

  test("two values per row ask how they changed, or how big the gap is", () => {
    expect(ask("region-yoy")).toEqual({ kind: "change", text: "How did each region change from Q3 2025 to Q3 2026?" });
    expect(ask("region-win-rate").text).toBe("How did each region change from H1 2026 to H2 2026?");
    expect(questionOf({ data: { type: "inline", rows: [] }, view: { type: "dumbbell", label: "region", from: "revenue", to: "cost" } })).toEqual({
      kind: "compare",
      text: "How big is the gap between revenue and cost for each region?",
    });
    expect(ask("revenue-by-region").text).toBe("How do revenue and cost compare for each region?");
    expect(ask("revenue-bridge").text).toBe("What took Q2 revenue to Q3 revenue?");
  });

  test("spread, relation, flow and rhythm each get their own question", () => {
    expect(ask("deal-histogram")).toEqual({ kind: "spread", text: "How spread out is deal value?" });
    expect(ask("deal-boxplot").text).toBe("How spread out is deal value in each region?");
    expect(ask("account-portfolio")).toEqual({ kind: "relation", text: "Does gross margin go up as revenue growth goes up?" });
    expect(ask("deal-scatter").text).toBe("Does deal value go up as days to close go up?");
    expect(ask("signup-funnel")).toEqual({ kind: "flow", text: "Where do people drop out, step by step?" });
    expect(ask("traffic-sankey").text).toBe("Where do visits flow, and how much goes each way?");
    expect(ask("order-calendar")).toEqual({ kind: "rhythm", text: "Which days have the most orders?" });
    expect(ask("visits-by-hour").text).toBe("Which hours are busiest?");
    expect(ask("ticket-heatmap").text).toBe("Which time and day have the most tickets?");
  });

  test("profiles, tables, surveys and plans", () => {
    expect(ask("product-compare")).toEqual({ kind: "profile", text: "How do our product and market average compare, attribute by attribute?" });
    expect(ask("region-heat-table")).toEqual({ kind: "detail", text: "How did each region do, Apr to Sep?" });
    expect(ask("deal-pipeline").text).toBe("What are the exact numbers for each deal, and which has the highest amount?");
    expect(ask("employee-survey").text).toBe("How do people answer each question?");
    expect(ask("launch-plan").text).toBe("When does each task start and end?");
  });

  test("a table without listed columns reads them from the rows, and bars in its cells point at that measure", () => {
    const rows = [{ region: "North", revenue: 1, cost: 2 }];
    const table: WidgetSpec = { data: { type: "inline", rows }, view: { type: "table" } };
    const barred: WidgetSpec = { ...table, fields: { revenue: { format: { type: "bar" } } } };
    expect(questionOf(table, rows).text).toBe("What are the exact numbers for each region?");
    expect(questionOf(barred, rows)).toEqual({ kind: "detail", text: "What are the exact numbers for each region, and which has the highest revenue?" });
    expect(questionOf({ ...barred, view: { type: "table", columns: ["region", "revenue"] } }, rows)).toEqual({ kind: "rank", text: "Which region has the highest revenue?" });
  });

  test("labels of several words are never forced into a plural", () => {
    const fields = { from: { label: "Plan they left" }, to: { label: "Plan they joined" }, why: { label: "Reason given" } };
    const base = { data: { type: "inline" as const, rows: [] }, fields };
    expect(questionOf({ ...base, view: { type: "marimekko", x: "from", series: "to", value: "customers" } }).text).toBe("How big is each plan they left, and how is it split by plan they joined?");
    expect(questionOf({ ...base, view: { type: "pareto", label: "why", value: "tickets" } }).text).toBe("Which reason given drives the most tickets?");
    expect(questionOf({ ...base, view: { type: "rose", label: "why", y: ["a", "b"] } }).text).toBe("Which reason given is busiest?");
    expect(questionOf({ ...base, view: { type: "bump", x: "month", series: "why", value: "tickets" } }).text).toBe("How does the ranking by reason given change, month by month?");
  });

  test("a generic measure (amount, value, total) reads as the highest, and as a share of the whole", () => {
    const base = { data: { type: "inline" as const, rows: [] }, fields: { value: { label: "Deal value" } } };
    expect(questionOf({ ...base, view: { type: "bar", x: "deal", y: "amount" } }).text).toBe("Which deal has the highest amount?");
    expect(questionOf({ ...base, view: { type: "hbar", label: "region", value: "value" } }).text).toBe("Which region has the highest deal value?");
    expect(questionOf({ ...base, view: { type: "donut", label: "deal", value: "amount" } }).text).toBe("What share of the amount comes from each deal?");
    expect(questionOf({ ...base, view: { type: "donut", label: "region", value: "revenue" } }).text).toBe("What share of revenue comes from each region?");
  });

  test("a measure that is a period (Q3 2025, a month column) reads as what happened in that period", () => {
    const base = { data: { type: "inline" as const, rows: [] }, fields: { q3_2025: { label: "Q3 2025" }, "2026-04": { label: "Apr" } } };
    expect(questionOf({ ...base, view: { type: "bar", x: "region", y: "q3_2025" } }).text).toBe("Which region had the most in Q3 2025?");
    expect(questionOf({ ...base, view: { type: "hbar", label: "region", value: "2026-04" } }).text).toBe("Which region had the most in Apr?");
    expect(questionOf({ ...base, view: { type: "donut", label: "region", value: "q3_2025" } }).text).toBe("What share of the Q3 2025 total comes from each region?");
    expect(questionOf({ ...base, view: { type: "pareto", label: "region", value: "q3_2025" } }).text).toBe("Which few regions drive most of the Q3 2025 total?");
    expect(questionOf({ ...base, view: { type: "histogram", value: "q3_2025" } }).text).toBe("How spread out are the values in Q3 2025?");
  });

  test("a headline number with a target asks whether it is on target", () => {
    const spec: WidgetSpec = { data: { type: "inline", rows: [] }, fields: { revenue: { label: "Monthly revenue" } }, view: { type: "kpi", value: "revenue", target: "target" } };
    expect(questionOf(spec)).toEqual({ kind: "target", text: "Is monthly revenue on target?" });
  });

  test("a row of numbers names them when there are few", () => {
    const spec: WidgetSpec = { data: { type: "inline", rows: [] }, view: { type: "kpis", items: [{ value: "web" }, { value: "app" }] } };
    expect(questionOf(spec).text).toBe("Where do web and app stand right now?");
  });

  test("every stored widget asks one plain question that ends with a question mark", () => {
    for (const [id, spec] of widgets) {
      const { text } = questionOf(spec);
      expect([id, /^[A-Z].{10,110}\?$/.test(text)]).toEqual([id, true]);
      expect([id, /\b(undefined|null|NaN)\b|\s{2}/.test(text)]).toEqual([id, false]);
    }
  });
});
