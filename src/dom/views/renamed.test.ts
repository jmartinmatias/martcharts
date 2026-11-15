// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

beforeEach(() => {
  document.body.innerHTML = "";
});

const months: Row[] = [
  { month: "2026-07", revenue: 1100, goal: 1200, churn: 3.1 },
  { month: "2026-08", revenue: 1180, goal: 1200, churn: 2.9 },
  { month: "2026-09", revenue: 1284, goal: 1250, churn: 2.7 },
];
const bridge: Row[] = [
  { step: "Q2 revenue", value: 1000 },
  { step: "New deals", value: 240 },
  { step: "Churn", value: -90 },
];

/** The drawn widget as HTML, with the per-widget id counter taken out so two widgets can be compared. */
async function drawn(view: Record<string, unknown>, rows: Row[]): Promise<string> {
  const host = document.createElement("div");
  document.body.append(host);
  const widget = createWidget(host, { title: "Same", locale: "en-US", data: { type: "inline", rows }, view } as unknown as WidgetSpec);
  await widget.ready;
  expect(widget.root.dataset.state).toBe("ready");
  const html = widget.root.outerHTML.replace(/fft-\d+/g, "fft-N");
  widget.destroy();
  host.remove();
  return html;
}

const cases: { name: string; rows: Row[]; old: Record<string, unknown>; now: Record<string, unknown>; without: Record<string, unknown> }[] = [
  {
    name: "kpi label and series",
    rows: months,
    old: { type: "kpi", value: "revenue", x: "month", target: "goal", label: "Monthly revenue", series: true },
    now: { type: "kpi", value: "revenue", x: "month", target: "goal", caption: "Monthly revenue", sparkline: true },
    without: { type: "kpi", value: "revenue", x: "month", target: "goal" },
  },
  {
    name: "kpis series and items[].label",
    rows: months,
    old: { type: "kpis", series: true, items: [{ value: "revenue", label: "Revenue", target: "goal" }, { value: "churn", label: "Churn", goodWhen: "down" }] },
    now: { type: "kpis", sparkline: true, items: [{ value: "revenue", caption: "Revenue", target: "goal" }, { value: "churn", caption: "Churn", goodWhen: "down" }] },
    without: { type: "kpis", items: [{ value: "revenue", target: "goal" }, { value: "churn", goodWhen: "down" }] },
  },
  {
    name: "gauge label",
    rows: months,
    old: { type: "gauge", value: "revenue", target: "goal", label: "Net revenue" },
    now: { type: "gauge", value: "revenue", target: "goal", caption: "Net revenue" },
    without: { type: "gauge", value: "revenue", target: "goal" },
  },
  {
    name: "table totals",
    rows: months,
    old: { type: "table", totals: true },
    now: { type: "table", showTotals: true },
    without: { type: "table" },
  },
  {
    name: "waterfall totals as one label",
    rows: bridge,
    old: { type: "waterfall", label: "step", value: "value", totals: "Q2 revenue", endLabel: "Q3 revenue" },
    now: { type: "waterfall", label: "step", value: "value", totals: ["Q2 revenue"], endLabel: "Q3 revenue" },
    without: { type: "waterfall", label: "step", value: "value", endLabel: "Q3 revenue" },
  },
];

describe("old option names draw exactly what the new names draw", () => {
  for (const { name, rows, old, now, without } of cases) {
    test(name, async () => {
      const [before, after, plain] = [await drawn(old, rows), await drawn(now, rows), await drawn(without, rows)];
      // The option matters (the drawing changes without it), and the old spelling draws the same thing as the new one.
      expect([after === plain, before === after]).toEqual([false, true]);
    });
  }
});
