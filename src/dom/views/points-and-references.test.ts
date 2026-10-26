// @vitest-environment jsdom
import { beforeEach, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
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
}
const deltas = () => [...target.querySelectorAll(".fft-kpi-change")].map((node) => node.textContent?.replace(/\s+/g, " ").trim());

const quarters = [
  { q: "Q3", share: 0.48, clients: 60 },
  { q: "Q4", share: 0.55, clients: 60 },
];

test("a share tile says its change in percentage points: 48% to 55% is +7 pts, not +14.6%", async () => {
  await draw({ rows: quarters, fields: { share: { format: { type: "percent" } } }, view: { type: "kpis", series: true, items: [{ value: "share" }] } });
  expect(deltas()).toEqual(["▲ +7 pts"]);
});

test("points read in the widget's language, and delta: relative asks for the relative change", async () => {
  await draw({ locale: "de-DE", rows: quarters, fields: { share: { format: { type: "percent" } } }, view: { type: "kpis", series: true, items: [{ value: "share" }] } });
  expect(deltas()).toEqual(["▲ +7 Pp."]);
  target.innerHTML = "";
  await draw({ rows: quarters, fields: { share: { format: { type: "percent" } } }, view: { type: "kpis", series: true, items: [{ value: "share", delta: "relative" }] } });
  expect(deltas()).toEqual(["▲ +14.6%"]);
});

test("a count keeps its relative change", async () => {
  await draw({ rows: [{ n: 29 }, { n: 33 }], view: { type: "kpis", series: true, items: [{ value: "n" }] } });
  expect(deltas()).toEqual(["▲ +13.8%"]);
});

test("an average line draws over two bars or more, and steps aside over one, as when a filter leaves one", async () => {
  const view = { type: "bar", x: "region", y: "revenue", reference: [{ field: "revenue", agg: "avg", label: "Average" }] };
  await draw({ rows: [{ region: "East", revenue: 340 }, { region: "North", revenue: 278 }], view });
  const two = target.querySelectorAll("line.fft-ref").length;
  target.innerHTML = "";
  await draw({ rows: [{ region: "North", revenue: 278 }], view });
  const one = target.querySelectorAll("line.fft-ref").length;
  expect([two > 0, one]).toEqual([true, 0]);
});

test("a fixed target line still draws over one bar", async () => {
  await draw({ rows: [{ region: "North", revenue: 278 }], view: { type: "bar", x: "region", y: "revenue", reference: [{ value: 300, label: "Target" }] } });
  expect(target.querySelectorAll("line.fft-ref").length).toBeGreaterThan(0);
});
