// @vitest-environment jsdom
/**
 * WP5: the radial, hierarchy and map views on the shared kit. Each draws from its catalog example with the
 * behaviours every view shares; highlight greys what is not named; a category keeps one color wherever the
 * widget knows it; the words these views write come from one place; and map legends travel with the card.
 */
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import type { Tooltip, ViewContext } from "../../core/view-context.ts";
import { createWidget } from "../widget.ts";
import { cardToSvg } from "../export.ts";
import { renderDonut } from "./donut.ts";
import { renderTreemap } from "./treemap.ts";
import { renderSymbols } from "./symbols.ts";
import { dotLegend } from "./map-shared.ts";
import { WORDS } from "./words.ts";
import "./index.ts";

const catalog = (type: string) => JSON.parse(readFileSync(`catalog/${type}.json`, "utf8")) as WidgetSpec;

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
});

async function draw(spec: WidgetSpec) {
  await createWidget(target, { locale: "en-US", ...spec, style: { ...spec.style, animate: false } } as WidgetSpec).ready;
  expect(target.querySelector(".fft-widget")?.getAttribute("data-state")).toBe("ready");
}
const all = (selector: string) => [...target.querySelectorAll(selector)];
const DEEMPHASIS = "var(--fft-deemphasis)";

/** The views this package moved onto the kit; xray is one card, so it has no marks to step through. */
const MARKED = ["donut", "pie", "rings", "gauge", "waffle", "treemap", "sunburst", "icicle", "chord", "sankey", "radar", "rose", "choropleth", "symbols", "locator"];

describe("every radial, hierarchy and map view keeps the shared behaviours", () => {
  test.each([...MARKED, "xray"])("%s has a table behind it for screen readers", async (type) => {
    await draw(catalog(type));
    const table = target.querySelector(".fft-sr-only table");
    expect(table).not.toBeNull();
    expect(table?.querySelectorAll("tr").length).toBeGreaterThan(1);
  });

  test.each(MARKED)("%s: its marks are one keyboard stop, arrows move along them, focus shows a tooltip and Enter picks the row", async (type) => {
    await draw(catalog(type));
    // The waffle's stops are its legend entries, which carry their own row.
    const stops = all('[tabindex="0"], [tabindex="-1"]').filter((node) => !node.closest(".fft-toolbar, .fft-base, .fft-table-wrap, .fft-header"));
    expect(stops.length).toBeGreaterThan(0);
    expect(stops.filter((node) => node.getAttribute("tabindex") === "0")).toHaveLength(1);
    const first = stops.find((node) => node.getAttribute("tabindex") === "0") as HTMLElement;
    first.dispatchEvent(new Event("focus"));
    expect(target.querySelector(".fft-tooltip-title")?.textContent ?? "").not.toBe("");
    const picked: Row[] = [];
    target.addEventListener("fft-select", (event) => picked.push((event as CustomEvent).detail.row));
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(picked).toHaveLength(1);
    if (stops.length > 1) {
      first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      expect(stops.filter((node) => node.getAttribute("tabindex") === "0")).toHaveLength(1);
    }
  });

  test.each(MARKED)("%s gives its marks an entrance order (--fft-i)", async (type) => {
    await draw(catalog(type));
    expect(all("[style*='--fft-i']").length).toBeGreaterThan(0);
  });

  test.each(["donut", "pie", "waffle", "treemap", "sunburst", "icicle", "chord", "sankey", "radar", "rose", "rings"])(
    "%s draws without a row: an empty state, never an error",
    async (type) => {
      const spec = catalog(type);
      await createWidget(target, { ...spec, data: { type: "inline", rows: [] } } as WidgetSpec).ready;
      expect(target.querySelector(".fft-widget")?.getAttribute("data-state")).toBe("empty");
    },
  );

  // A map with no rows still draws its land, every region greyed and keyed "No data", so a filter that empties it
  // leaves a map that says so rather than an empty card.
  test.each(["choropleth", "symbols", "locator"])("%s draws its land greyed when there is no row, with no scale to misread", async (type) => {
    const spec = catalog(type);
    await createWidget(target, { ...spec, data: { type: "inline", rows: [] } } as WidgetSpec).ready;
    expect(target.querySelector(".fft-widget")?.getAttribute("data-state")).toBe("ready");
    expect(target.querySelectorAll(".fft-map-land, .fft-map-region").length).toBeGreaterThan(20);
    expect(target.textContent).not.toMatch(/Infinity|NaN/);
  });

  test.each(["donut", "pie", "waffle", "treemap", "rings", "radar", "rose", "symbols", "locator"])("%s draws a single row", async (type) => {
    const spec = catalog(type);
    const rows = (spec.data.rows as Row[]).slice(0, 1);
    await draw({ ...spec, data: { type: "inline", rows } } as WidgetSpec);
    expect(target.querySelector(".fft-message")?.textContent ?? "").toBe("");
  });
});

describe("highlight keeps the named categories in color and greys the rest", () => {
  test("donut and pie: the named slice keeps its color, the others step back, the legend agrees", async () => {
    for (const type of ["donut", "pie"]) {
      target.innerHTML = "";
      await draw({ ...catalog(type), view: { ...catalog(type).view, highlight: "Enterprise" } } as WidgetSpec);
      const marks = all(type === "donut" ? ".fft-slice" : ".fft-pie-slice") as SVGElement[];
      const paint = marks.map((mark) => mark.style.getPropertyValue(type === "donut" ? "stroke" : "fill"));
      expect([type, paint.filter((p) => p === DEEMPHASIS).length]).toEqual([type, marks.length - 1]);
      expect(paint[0]).not.toBe(DEEMPHASIS);
      const swatches = all(".fft-donut-legend .fft-swatch") as HTMLElement[];
      expect(swatches.filter((s) => s.style.background === DEEMPHASIS)).toHaveLength(swatches.length - 1);
    }
  });

  test("treemap: naming a tile or a whole group keeps it in color", async () => {
    const spec = catalog("treemap");
    const rows = spec.data.rows as Row[];
    await draw({ ...spec, view: { ...spec.view, highlight: rows[0]?.name } } as WidgetSpec);
    const tiles = all(".fft-tile") as SVGElement[];
    expect(tiles.filter((t) => t.style.fill !== DEEMPHASIS)).toHaveLength(1);
    target.innerHTML = "";
    await draw({ ...spec, view: { ...spec.view, highlight: "Enterprise" } } as WidgetSpec);
    const lit = (all(".fft-tile") as SVGElement[]).filter((t) => t.style.fill !== DEEMPHASIS).length;
    expect(lit).toBe(rows.filter((row) => row.segment === "Enterprise").length);
  });

  test("sunburst and icicle: naming a family keeps it and everything inside it", async () => {
    await draw({ ...catalog("sunburst"), view: { ...catalog("sunburst").view, highlight: "Platform" } } as WidgetSpec);
    const segs = all(".fft-sun-seg") as SVGElement[];
    const lit = segs.filter((s) => s.style.fill !== DEEMPHASIS).map((s) => s.dataset.path ?? "");
    expect(lit.length).toBeGreaterThan(1);
    expect(lit.every((path) => path.startsWith("Platform"))).toBe(true);
    target.innerHTML = "";
    await draw({ ...catalog("icicle"), view: { ...catalog("icicle").view, highlight: "East" } } as WidgetSpec);
    const cells = (all(".fft-ice:not([data-root])") as SVGElement[]).filter((c) => c.style.fill !== DEEMPHASIS).map((c) => c.dataset.path ?? "");
    expect(cells.length).toBeGreaterThan(1);
    expect(cells.every((path) => path.startsWith("East"))).toBe(true);
  });

  test("chord, sankey and radar: the named group, flow end or profile stays in color", async () => {
    await draw({ ...catalog("chord"), view: { ...catalog("chord").view, highlight: "Starter" } } as WidgetSpec);
    const arcs = all(".fft-chord-arc") as SVGElement[];
    expect(arcs.filter((a) => a.style.fill !== DEEMPHASIS).map((a) => a.dataset.group)).toEqual(["Starter"]);
    target.innerHTML = "";
    await draw({ ...catalog("sankey"), view: { ...catalog("sankey").view, highlight: "Search" } } as WidgetSpec);
    const ribbons = all(".fft-ribbon") as SVGElement[];
    const lit = ribbons.filter((r) => r.style.fill !== DEEMPHASIS);
    expect(lit.length).toBeGreaterThan(0);
    expect(lit.length).toBeLessThan(ribbons.length);
    target.innerHTML = "";
    await draw({ ...catalog("radar"), view: { ...catalog("radar").view, highlight: "us" } } as WidgetSpec);
    const shapes = all(".fft-radar-shape") as SVGElement[];
    expect(shapes.map((s) => s.style.getPropertyValue("--fft-radar-color") === DEEMPHASIS)).toEqual([false, true]);
  });

  test("choropleth: the named regions keep their shade and the others go grey", async () => {
    await draw({ ...catalog("choropleth"), view: { ...catalog("choropleth").view, highlight: ["DE", "FR"] } } as WidgetSpec);
    const shaded = all(".fft-map-region:not(.fft-map-region-empty)");
    const muted = all(".fft-map-region[data-muted]");
    expect(shaded.length - muted.length).toBe(2);
    expect(muted.length).toBeGreaterThan(0);
  });

  test("symbols: naming a group keeps its circles in color", async () => {
    await draw({ ...catalog("symbols"), view: { ...catalog("symbols").view, highlight: "West" } } as WidgetSpec);
    const circles = all(".fft-map-symbol") as SVGElement[];
    const rows = catalog("symbols").data.rows as Row[];
    expect(circles.filter((c) => c.style.fill !== DEEMPHASIS)).toHaveLength(rows.filter((row) => row.region === "West").length);
  });
});

/** A bare context for drawing a renderer directly, with a widget's category colors. */
function context<V extends { type: string }>(el: HTMLElement, view: V, rows: Row[], colors: Record<string, string>): ViewContext<V> {
  const tooltip: Tooltip = { show() {}, hide() {} };
  return {
    el,
    rows,
    view,
    spec: { locale: "en-US", data: { type: "inline", rows }, view },
    width: 600,
    height: 320,
    label: (field) => field,
    format: (value) => String(value ?? ""),
    cell: (value) => el.ownerDocument.createTextNode(String(value ?? "")),
    color: (i) => `var(--fft-series-${i + 1})`,
    colorOf: (category) => colors[String(category)] ?? "var(--fft-series-9)",
    tooltip,
    select() {},
  };
}

describe("a category keeps one color wherever the widget knows it", () => {
  test("a donut and a treemap on one board paint the same segment the same color, whatever its order", () => {
    const colors = { Enterprise: "rgb(0, 170, 102)", "Mid-market": "rgb(204, 102, 0)", "Small business": "rgb(51, 102, 204)" };
    const donutRows = [
      { segment: "Small business", revenue: 3 },
      { segment: "Enterprise", revenue: 5 },
    ];
    const treemapRows = [
      { name: "A", segment: "Enterprise", revenue: 4 },
      { name: "B", segment: "Mid-market", revenue: 2 },
      { name: "C", segment: "Small business", revenue: 1 },
    ];
    const a = document.createElement("div");
    const b = document.createElement("div");
    document.body.append(a, b);
    renderDonut(context(a, { type: "donut", label: "segment", value: "revenue" }, donutRows, colors));
    renderTreemap(context(b, { type: "treemap", label: "name", value: "revenue", group: "segment" }, treemapRows, colors));
    const slices = [...a.querySelectorAll<SVGElement>(".fft-slice")].map((s) => s.style.stroke);
    const tiles = [...b.querySelectorAll<SVGElement>(".fft-tile")].map((t) => t.style.fill);
    expect(slices).toEqual([colors["Small business"], colors.Enterprise]);
    expect(tiles).toEqual([colors.Enterprise, colors["Mid-market"], colors["Small business"]]);
  });

  test("symbols color their groups by the widget's colors, the key too", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const rows = [
      { state: "CA", customers: 10, region: "West" },
      { state: "NY", customers: 5, region: "Northeast" },
    ];
    renderSymbols(context(el, { type: "symbols", geo: "us-states", id: "state", size: "customers", color: "region" }, rows, { West: "rgb(18, 52, 86)", Northeast: "rgb(171, 205, 239)" }));
    expect([...el.querySelectorAll<SVGElement>(".fft-map-symbol")].map((c) => c.style.fill)).toEqual(["rgb(18, 52, 86)", "rgb(171, 205, 239)"]);
  });
});

describe("words and legends", () => {
  test("the words these views write come from one record", async () => {
    await draw(catalog("donut"));
    (target.querySelector(".fft-slice-hit") as SVGElement).dispatchEvent(new Event("focus"));
    expect([...target.querySelectorAll(".fft-tooltip-row")].map((row) => row.textContent).some((text) => text?.endsWith(WORDS.share))).toBe(true);
    target.innerHTML = "";
    const choropleth = catalog("choropleth");
    await draw(choropleth);
    expect(target.querySelector(".fft-map-legend-empty")?.textContent).toBe(WORDS.noData);
  });

  test("a map's group key steps aside inside a small-multiples panel", () => {
    const el = document.createElement("div");
    const ctx = context(el, { type: "symbols" }, [], {});
    expect(dotLegend(ctx, [{ name: "West", color: "#000" }])).toBeInstanceOf(HTMLElement);
    expect(dotLegend({ ...ctx, inFacet: true }, [{ name: "West", color: "#000" }])).toBeUndefined();
  });

  test.each(["choropleth", "symbols", "locator"])("%s: the full-card picture carries the map's key", async (type) => {
    await draw(catalog(type));
    const card = target.querySelector(".fft-widget") as HTMLElement;
    const { markup } = cardToSvg(card, "#fff");
    // Every piece of text in the map's keys (names, ends of the scale, size values) is in the picture.
    const keyTexts = [...card.querySelectorAll(".fft-map-wrap :is(.fft-map-legend, .fft-legend, .fft-map-keys) :is(li, span, text)")]
      .filter((node) => node.tagName === "LI" || node.children.length === 0)
      .map((node) => node.textContent?.trim() ?? "")
      .filter(Boolean);
    expect(keyTexts.length).toBeGreaterThan(0);
    for (const text of keyTexts) expect([text, markup.includes(text.replace(/&/g, "&amp;"))]).toEqual([text, true]);
  });
});
