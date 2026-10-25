// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { explainChart } from "../../core/explain.ts";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { validateSpec } from "../../core/validate.ts";
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

const clients: Row[] = [
  { name: "A", risk: 2, ret: 0.02, group: "Core", aum: 10 },
  { name: "B", risk: 2.5, ret: 0.025, group: "Core", aum: 20 },
  { name: "C", risk: 3, ret: 0.02, group: "Core", aum: 15 },
  { name: "D", risk: 6, ret: 0.09, group: "Growth", aum: 30 },
  { name: "E", risk: 6.5, ret: 0.1, group: "Growth", aum: 25 },
  { name: "F", risk: 4, ret: -0.03, group: "At risk", aum: 5 },
];
const view = { type: "scatter", x: "risk", y: "ret", label: "name", cluster: "group" };

describe("scatter clusters", () => {
  test("one soft hull per cluster, named at its middle, behind the dots", async () => {
    await draw({ rows: clients, view });
    expect(all(".fft-cluster-hull").map((hull) => hull.getAttribute("data-cluster"))).toEqual(["Core", "Growth", "At risk"]);
    expect(texts(".fft-cluster-label")).toEqual(["Core", "Growth", "At risk"]);
    for (const hull of all(".fft-cluster-hull")) expect(hull.getAttribute("d")).toMatch(/^M.*Z$/);
    const hulls = target.querySelector(".fft-cluster-hulls") as Element;
    const firstDot = target.querySelector("circle.fft-point-hit") as Element;
    expect(hulls.compareDocumentPosition(firstDot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("without a series, dots and hulls take the cluster's color, keyed in the legend", async () => {
    await draw({ rows: clients, view });
    expect(texts(".fft-legend li")).toEqual(["Core", "Growth", "At risk"]);
    const hulls = all(".fft-cluster-hull") as SVGElement[];
    expect(hulls.map((hull) => hull.style.fill)).toEqual(["var(--fft-series-1)", "var(--fft-series-2)", "var(--fft-series-3)"]);
  });

  test("with a series, the dots keep the series' colors and the hulls go quiet grey", async () => {
    await draw({ rows: clients.map((row, i) => ({ ...row, side: i % 2 ? "Buy" : "Hold" })), view: { ...view, series: "side" } });
    expect(texts(".fft-legend li")).toEqual(["Hold", "Buy"]);
    expect((all(".fft-cluster-hull") as SVGElement[]).every((hull) => hull.style.fill === "var(--fft-text-secondary)")).toBe(true);
  });

  test("works with bubbles, puts the cluster in every tooltip and the hidden table", async () => {
    await draw({ rows: clients, view: { ...view, size: "aum" } });
    expect(all(".fft-cluster-hull")).toHaveLength(3);
    // Bubbles draw biggest first, so the first stop is D, the largest, in Growth.
    (all(".fft-point-hit")[0] as SVGElement).dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row").at(-1)).toBe("GrowthGroup");
    expect(texts(".fft-sr-only thead th")).toContain("Group");
  });

  test("warns past six clusters, and the guide explains the shaded areas", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ risk: i, ret: i, group: `G${i}` }));
    expect(validateSpec({ data: { type: "inline", rows: many }, view }, many).map((issue) => issue.message).join(" ")).toMatch(/8 clusters/);
    expect(explainChart({ data: { type: "inline", rows: clients }, view }, clients)).toContain("Each soft shaded area gathers one group");
  });
});
