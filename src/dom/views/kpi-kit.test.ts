// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
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

const months = [
  { month: "2026-07", revenue: 100, churn: 0.04 },
  { month: "2026-08", revenue: 120, churn: 0.035 },
  { month: "2026-09", revenue: 140, churn: 0.031 },
];

describe("kpi on the kit", () => {
  test("a missing number shows a quiet dash, read aloud as No value", async () => {
    await draw({ rows: [{ revenue: null }], view: { type: "kpi", value: "revenue" } });
    const value = target.querySelector(".fft-kpi-value") as HTMLElement;
    expect([value.textContent, value.hasAttribute("data-empty"), value.getAttribute("aria-label")]).toEqual(["—", true, "No value"]);
  });

  test("a series sparkline's readings reach screen readers as a hidden table, period by period", async () => {
    await draw({ rows: months, view: { type: "kpi", value: "revenue", series: true, x: "month" } });
    const table = target.querySelector(".fft-sr-only table") as HTMLTableElement;
    expect([...table.querySelectorAll("th")].slice(0, 2).map((th) => th.textContent)).toEqual(["Month", "Revenue"]);
    expect(table.querySelectorAll("tbody tr")).toHaveLength(3);
  });

  test("a fixed color in spec.colors paints the trend's latest point", async () => {
    await draw({ rows: months, colors: { Revenue: "#2f6fdb" }, view: { type: "kpi", value: "revenue", series: true, x: "month" } } as never);
    const end = target.querySelector(".fft-spark-end") as SVGElement;
    expect(end.style.fill).toBe("rgb(47, 111, 219)");
  });

  test("one reading draws no line, and keeps the tile's height", async () => {
    await draw({ rows: [{ month: "2026-07", revenue: null }, { month: "2026-08", revenue: 5 }], view: { type: "kpi", value: "revenue", series: true } });
    const spark = target.querySelector(".fft-sparkline") as SVGElement;
    expect([spark.hasAttribute("data-empty"), spark.querySelectorAll("path").length]).toEqual([true, 0]);
  });
});

describe("kpis on the kit", () => {
  test("tiles with a missing number show the dash; the others keep their figures", async () => {
    await draw({ rows: [{ a: 5, b: null }], view: { type: "kpis", items: [{ value: "a" }, { value: "b" }] } });
    const values = [...target.querySelectorAll(".fft-stat-value")].map((n) => [n.textContent, n.hasAttribute("data-empty")]);
    expect(values).toEqual([["5", false], ["—", true]]);
  });

  test("series tiles share one hidden table, a column per tile", async () => {
    await draw({ rows: months, view: { type: "kpis", series: true, items: [{ value: "revenue" }, { value: "churn" }] } });
    const heads = [...target.querySelectorAll(".fft-sr-only table th")].map((th) => th.textContent);
    expect(heads.slice(0, 2)).toEqual(["Revenue", "Churn"]);
  });

  test("a RAG pill still sits by the figure", async () => {
    await draw({ rows: [{ nps: 12 }], view: { type: "kpis", items: [{ value: "nps", rag: { green: 40, amber: 20 } }] } });
    expect(target.querySelector(".fft-stat-rag")?.textContent).toMatch(/Off track/);
  });
});
