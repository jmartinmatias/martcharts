// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

/**
 * WP4: the cartesian and grid views on the shared kit. Every view draws its catalog example with the behaviours all
 * views share, panels of small multiples share one scale, and the options the contract declared (highlight, colors,
 * annotations, reference, extent) reach the marks.
 */

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

async function drawSpec(spec: WidgetSpec) {
  await createWidget(target, { locale: "en-US", ...spec }).ready;
  expect(target.querySelector(".fft-widget")?.getAttribute("data-state")).toBe("ready");
}

const all = (selector: string, root: ParentNode = target) => [...root.querySelectorAll(selector)];
const texts = (selector: string, root: ParentNode = target) => all(selector, root).map((node) => node.textContent);
const catalog = (type: string) => JSON.parse(readFileSync(`catalog/${type}.json`, "utf8")) as WidgetSpec;

const VIEWS = ["bar", "line", "area", "scatter", "histogram", "waterfall", "pareto", "candlestick", "dual", "heatmap", "calendar", "marimekko", "table"];

describe("every cartesian and grid view keeps the shared behaviours", () => {
  test.each(VIEWS)("%s: a hidden table, one tab stop, a tooltip on focus, select on Enter, and staggered entry", async (type) => {
    await drawSpec(catalog(type));
    const body = target.querySelector(".fft-body") as HTMLElement;
    // The numbers as a table for screen readers (the table view is itself the table).
    if (type !== "table") expect(body.querySelector(".fft-sr-only table")).not.toBeNull();
    // Roving focus: the marks are one tab stop, the arrows move between them.
    const stops = all("[tabindex='0']", body).filter((node) => !node.closest(".fft-sr-only") && !node.matches("button, input, .fft-table-wrap"));
    const marks = all("[tabindex]", body).filter((node) => !node.closest(".fft-sr-only") && !node.matches("button, input, .fft-table-wrap"));
    expect(marks.length).toBeGreaterThan(1);
    expect(stops).toHaveLength(1);
    const first = stops[0] as HTMLElement;
    // Every view animates its entry: marks staggered with --fft-i, or lines drawn along their length.
    expect(target.querySelector("[style*='--fft-i'], path[pathLength]")).not.toBeNull();
    // A tooltip follows focus (the table view's rows select without one).
    first.dispatchEvent(new Event("focus"));
    if (type !== "table") expect(texts(".fft-tooltip-title").join("")).not.toBe("");
    // Enter picks the row.
    const seen: Row[] = [];
    target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(seen.length).toBe(1);
  });
});

describe("small multiples share one scale", () => {
  const regions = [
    { region: "North", x: 1, y: 10, step: "Start", amount: 100, value: 3 },
    { region: "North", x: 2, y: 20, step: "Gain", amount: 20, value: 4 },
    { region: "North", x: 3, y: 15, step: "End", amount: 120, value: 5 },
    { region: "South", x: 1, y: 300, step: "Start", amount: 900, value: 30 },
    { region: "South", x: 2, y: 400, step: "Gain", amount: 300, value: 31 },
    { region: "South", x: 3, y: 500, step: "End", amount: 1200, value: 32 },
    { region: "South", x: 4, y: 450, step: "Loss", amount: -50, value: 33 },
  ];
  const topTick = (panel: Element) => [...panel.querySelectorAll(".fft-tick-y")].map((t) => t.textContent).at(-1);

  test("scatter: both panels run their value axis to the same top", async () => {
    await draw({ rows: regions, facet: { field: "region" }, view: { type: "scatter", x: "x", y: "y" } });
    const tops = all(".fft-facet").map(topTick);
    expect(tops).toHaveLength(2);
    expect(tops[0]).toBe(tops[1]);
  });

  test("histogram: both panels count on the same axis", async () => {
    await draw({ rows: regions, facet: { field: "region" }, view: { type: "histogram", value: "value", bins: 2 } });
    const tops = all(".fft-facet").map(topTick);
    expect(tops[0]).toBe(tops[1]);
  });

  test("waterfall: both panels' bridges stand on the same scale", async () => {
    await draw({ rows: regions, facet: { field: "region" }, view: { type: "waterfall", label: "step", value: "amount", totals: ["Start", "End"] } });
    const tops = all(".fft-facet").map(topTick);
    expect(tops[0]).toBe(tops[1]);
  });

  test("scatter, marimekko and candlestick leave their legends to the widget's one shared legend", async () => {
    const rows = [
      { region: "North", seg: "A", x: 1, y: 2, product: "Core", value: 5, day: "2026-01-05", o: 1, h: 3, l: 0.5, c: 2 },
      { region: "North", seg: "B", x: 2, y: 3, product: "Plus", value: 3, day: "2026-01-06", o: 2, h: 4, l: 1, c: 3 },
      { region: "South", seg: "A", x: 3, y: 1, product: "Core", value: 4, day: "2026-01-05", o: 3, h: 3.5, l: 2, c: 2.5 },
      { region: "South", seg: "B", x: 4, y: 5, product: "Plus", value: 6, day: "2026-01-06", o: 2.5, h: 5, l: 2, c: 4 },
    ];
    for (const view of [
      { type: "scatter", x: "x", y: "y", series: "seg" },
      { type: "marimekko", x: "seg", series: "product", value: "value" },
      { type: "candlestick", x: "day", open: "o", high: "h", low: "l", close: "c" },
    ]) {
      target.innerHTML = "";
      await draw({ rows, facet: { field: "region" }, view });
      expect([view.type, all(".fft-facet .fft-legend").length]).toEqual([view.type, 0]);
    }
  });
});

describe("scatter takes the contract's options", () => {
  const accounts = [
    { name: "Acme", growth: 0.1, margin: 0.3, segment: "Enterprise" },
    { name: "Birch", growth: 0.2, margin: 0.2, segment: "SMB" },
    { name: "Cobalt", growth: 0.05, margin: 0.4, segment: "Enterprise" },
  ];

  test("highlight keeps the named dots in color and greys the rest", async () => {
    await draw({ rows: accounts, view: { type: "scatter", x: "growth", y: "margin", label: "name", highlight: "Birch" } as WidgetSpec["view"] });
    const muted = all("circle.fft-point").map((dot) => [dot.getAttribute("data-label"), (dot as SVGElement).dataset.muted === "true"]);
    expect(muted).toEqual([
      ["Acme", true],
      ["Birch", false],
      ["Cobalt", true],
    ]);
    expect((all("circle.fft-point")[0] as SVGElement).style.fill).toBe("var(--fft-deemphasis)");
  });

  test("highlight can name a whole group", async () => {
    await draw({ rows: accounts, view: { type: "scatter", x: "growth", y: "margin", label: "name", series: "segment", highlight: "Enterprise" } as WidgetSpec["view"] });
    expect(all("circle.fft-point[data-muted]").map((dot) => dot.getAttribute("data-label"))).toEqual(["Birch"]);
  });

  test("a category keeps its fixed color from the spec's colors, in the dots and the legend", async () => {
    await draw({ rows: accounts, colors: { SMB: "#d4552b" }, view: { type: "scatter", x: "growth", y: "margin", label: "name", series: "segment" } } as Omit<WidgetSpec, "data"> & { rows: Row[] });
    const birch = all("circle.fft-point").find((dot) => dot.getAttribute("data-label") === "Birch") as SVGElement;
    expect(birch.style.fill).toBe("rgb(212, 85, 43)");
    const swatches = all(".fft-legend .fft-swatch").map((s) => (s as HTMLElement).style.background);
    expect(swatches).toContain("rgb(212, 85, 43)");
  });

  test("annotations pin a note to a dot by its label, the note in its tooltip too", async () => {
    await draw({ rows: accounts, style: { width: 640 }, view: { type: "scatter", x: "growth", y: "margin", label: "name", annotations: [{ x: "Cobalt", text: "Best margin" }] } as WidgetSpec["view"] } as Omit<WidgetSpec, "data"> & { rows: Row[] });
    const dot = all(".fft-note-dot")[0] as SVGElement;
    const cobalt = all("circle.fft-point").find((p) => p.getAttribute("data-label") === "Cobalt") as SVGElement;
    expect([dot.getAttribute("cx"), dot.getAttribute("cy")]).toEqual([String(Math.round(Number(cobalt.getAttribute("cx")) * 100) / 100), String(Math.round(Number(cobalt.getAttribute("cy")) * 100) / 100)]);
    const words = texts(".fft-note-text, .fft-notes li").join(" ");
    expect(words).toContain("Best margin");
    const hit = all(".fft-point-hit").find((h) => h.getAttribute("aria-label")?.startsWith("Cobalt")) as SVGElement;
    expect(hit.getAttribute("aria-label")).toContain("Note Best margin");
  });

  test("with no row holding both numbers, the scatter says so", async () => {
    await draw({ rows: [{ name: "Acme", growth: "n/a", margin: null }], view: { type: "scatter", x: "growth", y: "margin", label: "name" } });
    expect(texts(".fft-empty-note")).toEqual(["No row has both Growth and Margin."]);
  });
});

describe("waterfall, histogram, dual and the grids take the rest", () => {
  test("waterfall: highlight keeps the named steps and greys the others", async () => {
    await draw({
      rows: [
        { step: "Q2", amount: 100 },
        { step: "New deals", amount: 30 },
        { step: "Churn", amount: -10 },
        { step: "Q3", amount: 120 },
      ],
      view: { type: "waterfall", label: "step", value: "amount", totals: ["Q2", "Q3"], highlight: "Churn" } as WidgetSpec["view"],
    });
    expect(all(".fft-step").map((bar) => (bar as SVGElement).dataset.muted === "true")).toEqual([true, true, false, true]);
  });

  test("histogram: a reference value draws a dashed vertical with its label, and the axis stretches to show it", async () => {
    const rows = [1, 2, 2, 3, 3, 3, 4].map((v) => ({ v }));
    await draw({ rows, view: { type: "histogram", value: "v", median: false, reference: [{ value: 10, label: "Limit" }] } as WidgetSpec["view"] });
    const line = target.querySelector("line.fft-ref") as SVGLineElement;
    expect(line.getAttribute("x1")).toBe(line.getAttribute("x2"));
    expect(texts(".fft-ref-label")).toEqual(["Limit 10"]);
    // The limit sits at the right edge of the plot, past every bin.
    const bars = all(".fft-hist-hit").map((hit) => Number(hit.getAttribute("x")) + Number(hit.getAttribute("width")));
    expect(Number(line.getAttribute("x1"))).toBeGreaterThan(Math.max(...bars));
  });

  test("dual: a note pins to a period of the top panel and joins its tooltip", async () => {
    const rows = [
      { month: "2026-01", revenue: 100, churn: 0.04 },
      { month: "2026-02", revenue: 120, churn: 0.035 },
      { month: "2026-03", revenue: 90, churn: 0.05 },
    ];
    await draw({ rows, style: { width: 640 }, view: { type: "dual", x: "month", y: "revenue", y2: "churn", annotations: [{ x: "2026-03", text: "Price rise" }] } as WidgetSpec["view"] } as Omit<WidgetSpec, "data"> & { rows: Row[] });
    expect(all(".fft-note-dot")).toHaveLength(1);
    expect(texts(".fft-note-text, .fft-notes li").join(" ")).toContain("Price rise");
    const hit = all(".fft-hit")[2] as SVGElement;
    expect(hit.getAttribute("aria-label")).toContain("Note Price rise");
  });

  test("heatmap: pointing at a cell steps the others back, and cells carry their entry order", async () => {
    await draw({
      rows: [
        { day: "Mon", hour: "9", n: 1 },
        { day: "Mon", hour: "10", n: 3 },
        { day: "Tue", hour: "9", n: 2 },
        { day: "Tue", hour: "10", n: 4 },
      ],
      view: { type: "heatmap", x: "hour", y: "day", value: "n" },
    });
    const cells = all(".fft-heatmap .fft-cell") as HTMLElement[];
    expect(cells.map((cell) => cell.style.getPropertyValue("--fft-i"))).toEqual(["0", "1", "2", "3"]);
    cells[1]?.dispatchEvent(new Event("pointerenter"));
    expect([target.querySelector(".fft-heatmap")?.hasAttribute("data-active"), cells[1]?.hasAttribute("data-active")]).toEqual([true, true]);
    cells[1]?.dispatchEvent(new Event("pointerleave"));
    expect(target.querySelector(".fft-heatmap")?.hasAttribute("data-active")).toBe(false);
  });

  test("heatmap and calendar with nothing to place say what is missing", async () => {
    await draw({ rows: [{ day: "Mon", hour: "9", n: null }], view: { type: "heatmap", x: "hour", y: "day", value: "n" } });
    expect(texts(".fft-empty-note")).toEqual(["No cell has a number in N."]);
    target.innerHTML = "";
    await draw({ rows: [{ when: "soon", n: 3 }], view: { type: "calendar", date: "when", value: "n" } });
    expect(texts(".fft-empty-note")).toEqual(["No row has a date in When."]);
  });

  test("table rows carry their entry order", async () => {
    await draw({ rows: [{ a: 1 }, { a: 2 }, { a: 3 }], view: { type: "table" } });
    expect(all(".fft-table tbody tr").map((tr) => (tr as HTMLElement).style.getPropertyValue("--fft-i"))).toEqual(["0", "1", "2"]);
  });
});
