// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../core/types.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

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

// The West panel lists Plus before Core and has no Services: colors must still follow the product, not the row order.
const mix = [
  { region: "East", product: "Core", revenue: 214 },
  { region: "East", product: "Plus", revenue: 98 },
  { region: "East", product: "Services", revenue: 26 },
  { region: "West", product: "Plus", revenue: 87 },
  { region: "West", product: "Core", revenue: 96 },
];

describe("multiple donuts and pies (facet)", () => {
  test("one donut per region, each category in the same color in every panel, and one legend of categories above the grid", async () => {
    await draw({ rows: mix, facet: { field: "region" }, view: { type: "donut", label: "product", value: "revenue" } });
    expect(texts(".fft-facet-title")).toEqual(["East", "West"]);
    const panels = all(".fft-facet").map((panel) => [...panel.querySelectorAll<SVGPathElement>("path.fft-slice")].map((s) => s.style.stroke));
    expect(panels).toEqual([
      ["var(--fft-series-1)", "var(--fft-series-2)", "var(--fft-series-3)"],
      ["var(--fft-series-2)", "var(--fft-series-1)"],
    ]);
    expect(all(".fft-facet .fft-donut-legend").length).toBe(0);
    expect(texts(".fft-facet-legend li")).toEqual(["Core", "Plus", "Services"]);
    expect(all(".fft-facet-legend .fft-swatch").map((s) => [(s as HTMLElement).dataset.shape, (s as HTMLElement).style.background])).toEqual([
      ["dot", "var(--fft-series-1)"],
      ["dot", "var(--fft-series-2)"],
      ["dot", "var(--fft-series-3)"],
    ]);
  });

  test("each panel keeps its own total in the middle", async () => {
    await draw({ rows: mix, facet: { field: "region" }, view: { type: "donut", label: "product", value: "revenue" } });
    expect(texts(".fft-donut-total")).toEqual(["338", "183"]);
  });

  test("multiple pies share colors the same way, and their inside labels stay", async () => {
    await draw({ rows: mix, facet: { field: "region" }, view: { type: "pie", label: "product", value: "revenue" } });
    const panels = all(".fft-facet").map((panel) => [...panel.querySelectorAll<SVGPathElement>("path.fft-pie-slice")].map((s) => s.style.fill));
    expect(panels).toEqual([
      ["var(--fft-series-1)", "var(--fft-series-2)", "var(--fft-series-3)"],
      ["var(--fft-series-2)", "var(--fft-series-1)"],
    ]);
    expect([all(".fft-facet .fft-donut-legend").length, texts(".fft-facet-legend li")]).toEqual([0, ["Core", "Plus", "Services"]]);
    expect(texts(".fft-pie-label").length).toBeGreaterThan(0);
  });

  test("a faceted bar chart with several series keeps its series legend, untouched", async () => {
    const rows = [
      { region: "East", m: "Jan", sales: 1, cost: 2 },
      { region: "West", m: "Jan", sales: 3, cost: 1 },
    ];
    await draw({ rows, facet: { field: "region" }, view: { type: "bar", x: "m", y: ["sales", "cost"] } });
    expect(texts(".fft-facet-legend li")).toEqual(["Sales", "Cost"]);
    expect((all(".fft-facet-legend .fft-swatch")[0] as HTMLElement).dataset.shape).toBe("rect");
  });

  test("a faceted single-series bar chart draws no legend at all, as before", async () => {
    const rows = [
      { region: "East", m: "Jan", sales: 1 },
      { region: "West", m: "Jan", sales: 3 },
    ];
    await draw({ rows, facet: { field: "region" }, view: { type: "bar", x: "m", y: "sales" } });
    expect(all(".fft-facet-legend").length).toBe(0);
  });
});
