// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { hasErrors, validateSpec } from "../../core/validate.ts";
import { choroplethChange } from "../../core/views.ts";
import { createWidget } from "../widget.ts";
import { divergingFill, divergingStep } from "./choropleth.ts";
import "./index.ts";

const stored = (id: string) => JSON.parse(readFileSync(`widgets/${id}.json`, "utf8")) as WidgetSpec;

let target: HTMLElement;
let width = 640;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
});
afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
});

async function draw(spec: WidgetSpec) {
  target.replaceChildren();
  await createWidget(target, { locale: "en-US", ...spec }).ready;
  return target.querySelector(".fft-widget") as HTMLElement;
}
const focus = (node: Element) => node.dispatchEvent(new Event("focus"));
const tooltip = () => [...target.querySelectorAll(".fft-tooltip-row")].map((row) => row.textContent);

const sales: Row[] = [
  { country: "FR", revenue: 120, lastYear: 100 },
  { country: "DE", revenue: 80, lastYear: 100 },
  { country: "ES", revenue: 50, lastYear: 50 },
  { country: "IT", revenue: 90, lastYear: 60 },
];
const map = (view: Record<string, unknown>): WidgetSpec => ({ data: { type: "inline", rows: sales }, view: { type: "choropleth", geo: "europe", id: "country", value: "revenue", ...view } });

describe("the shaded map against the previous period", () => {
  test("the change is a percent of the previous value, or the difference; none without both numbers or from zero", () => {
    const view = { value: "revenue", previous: "lastYear" };
    expect(choroplethChange(view, sales[0] as Row)).toBeCloseTo(0.2);
    expect(choroplethChange({ ...view, change: "difference" }, sales[1] as Row)).toBe(-20);
    expect(choroplethChange(view, { revenue: 5, lastYear: 0 })).toBeNull();
    expect(choroplethChange(view, { revenue: 5 })).toBeNull();
  });

  test("with previous, every region's tooltip and name give the previous value and the change", async () => {
    await draw(map({ previous: "lastYear" }));
    const france = [...target.querySelectorAll(".fft-map-region[role=img]")].find((r) => r.getAttribute("aria-label")?.startsWith("France")) as Element;
    expect(france.getAttribute("aria-label")).toContain("change +20%");
    focus(france);
    expect(tooltip()).toEqual(["120Revenue", "100Previous", "+20%Change"]);
    const spain = [...target.querySelectorAll(".fft-map-region[role=img]")].find((r) => r.getAttribute("aria-label")?.startsWith("Spain")) as Element;
    focus(spain);
    expect(tooltip()).toContain("No changeChange");
  });

  test('show "change" shades by the change on a diverging scale: rises one way, falls the other, none in the middle', async () => {
    await draw(map({ previous: "lastYear", show: "change" }));
    const step = (code: string) => [...target.querySelectorAll(".fft-map-region[data-change]")].find((r) => r.getAttribute("aria-label")?.startsWith(code))?.getAttribute("data-change");
    // Italy rose most (+50%), Germany fell (−20%), Spain held.
    expect([step("Italy"), step("Germany"), step("Spain")]).toEqual(["3", "-2", "0"]);
    // The sequential steps are not used: the regions carry their diverging fill.
    expect(target.querySelectorAll(".fft-map-region[data-step]")).toHaveLength(0);
    const legend = target.querySelector(".fft-map-legend") as HTMLElement;
    expect([legend.querySelector(".fft-map-legend-min")?.textContent, legend.querySelector(".fft-map-legend-max")?.textContent]).toEqual(["−50%", "+50%"]);
    expect(legend.querySelectorAll(".fft-map-ramp-change > div")).toHaveLength(7);
  });

  test("the diverging scale: three steps either side, the up color for rises and the down color for falls", () => {
    expect([divergingStep(0.5, 0.5), divergingStep(-0.1, 0.5), divergingStep(0, 0.5)]).toEqual([3, -1, 0]);
    expect(divergingFill(2)).toContain("--fft-up");
    expect(divergingFill(-3)).toContain("--fft-down");
  });

  test('show "change" without previous, or previous on a category map, does not validate', () => {
    expect(hasErrors(validateSpec(map({ show: "change" }), sales))).toBe(true);
    expect(hasErrors(validateSpec({ ...map({ previous: "lastYear" }), view: { type: "choropleth", geo: "europe", id: "country", category: "country", previous: "lastYear" } }, sales))).toBe(true);
    expect(hasErrors(validateSpec(map({ previous: "lastYear", show: "change" }), sales))).toBe(false);
  });
});

describe("the RAG scorecard showing only what needs attention", () => {
  const rows: Row[] = [
    { client: "Aster", a: "R", b: "G" },
    { client: "Birch", a: "A", b: "G" },
    { client: "Cedar", a: "G", b: "G" },
    { client: "Dune", a: "G", b: "G" },
    { client: "Elm", a: "G", b: "A" },
  ];
  const board = (view: Record<string, unknown> = {}): WidgetSpec => ({ data: { type: "inline", rows }, view: { type: "ragboard", label: "client", dimensions: ["a", "b"], ...view } });

  test('only: ["R", "A"] shows those rows and folds the rest into one line, while the summary still counts every row', async () => {
    await draw(board({ only: ["R", "A"] }));
    expect([...target.querySelectorAll(".fft-rag-name-text")].map((n) => n.textContent)).toEqual(["Aster", "Birch", "Elm"]);
    expect(target.querySelector(".fft-rag-fold")?.textContent).toBe("and 2 on track");
    expect([...target.querySelectorAll(".fft-rag-sum-count")].map((n) => n.textContent)).toEqual(["1", "2", "2"]);
  });

  test("with only the red rows, the fold names every status left out with its count", async () => {
    await draw(board({ only: ["R"] }));
    expect(target.querySelector(".fft-rag-fold")?.textContent).toBe("and 2 at risk, 2 on track");
  });

  test("without only, there is no fold line", async () => {
    await draw(board());
    expect(target.querySelector(".fft-rag-fold")).toBeNull();
  });
});

describe("every cell of a grid is the same size, from the card, at phone and desktop widths", () => {
  test.each([320, 390, 900])("RAG scorecard at %ipx: equal status columns, every mark one size, the table fits or keeps a tappable cell", async (w) => {
    width = w;
    const card = await draw(stored("rag-scorecard"));
    const table = card.querySelector(".fft-rag-table") as HTMLTableElement;
    const cols = [...table.querySelectorAll("col")].map((col) => parseFloat(col.style.width));
    const cells = cols.slice(1);
    expect(new Set(cells).size).toBe(1);
    expect(cells[0]).toBeGreaterThanOrEqual(30);
    const tableWidth = parseFloat(table.style.width);
    expect(tableWidth <= w || cells[0] === 30).toBe(true);
    const marks = [...table.querySelectorAll(".fft-rag-cell .fft-rag-glyph")].map((g) => g.getAttribute("width"));
    expect(new Set(marks).size).toBe(1);
    // Names stay on one line, whole in the title.
    for (const name of table.querySelectorAll(".fft-rag-name")) expect((name as HTMLElement).title).toContain(name.querySelector(".fft-rag-name-text")?.textContent ?? "");
  });

  test.each([320, 390, 900])("waffle at %ipx: one hundred squares of one size, the figure no wider than the card", async (w) => {
    width = w;
    const card = await draw(JSON.parse(readFileSync("catalog/waffle.json", "utf8")) as WidgetSpec);
    const svg = card.querySelector(".fft-waffle svg") as SVGSVGElement;
    const squares = [...svg.querySelectorAll("rect")];
    expect(squares).toHaveLength(100);
    expect(new Set(squares.map((r) => `${r.getAttribute("width")}x${r.getAttribute("height")}`)).size).toBe(1);
    expect(Number(svg.getAttribute("width"))).toBeLessThanOrEqual(w);
  });
});

describe("small multiples share one scale on the radial and map views", () => {
  test("radar: every panel's rings stand for the same values", async () => {
    const rows: Row[] = [
      { team: "East", attr: "Speed", score: 2 },
      { team: "East", attr: "Care", score: 3 },
      { team: "East", attr: "Price", score: 2 },
      { team: "West", attr: "Speed", score: 9 },
      { team: "West", attr: "Care", score: 8 },
      { team: "West", attr: "Price", score: 7 },
    ];
    await draw({ data: { type: "inline", rows }, facet: { field: "team" }, view: { type: "radar", label: "attr", y: "score" } } as WidgetSpec);
    const ticks = [...target.querySelectorAll(".fft-facet")].map((panel) => [...panel.querySelectorAll(".fft-radar-tick")].map((t) => t.textContent).join(","));
    expect(ticks).toHaveLength(2);
    expect(ticks[0]).not.toBe("");
    expect(ticks[0]).toBe(ticks[1]);
  });

  test("symbols: a circle of one size means one amount in every panel", async () => {
    const rows: Row[] = [
      { region: "North", state: "WA", clients: 10 },
      { region: "South", state: "TX", clients: 100 },
    ];
    await draw({ data: { type: "inline", rows }, facet: { field: "region" }, view: { type: "symbols", geo: "us-states", id: "state", size: "clients" } } as WidgetSpec);
    const radii = [...target.querySelectorAll(".fft-facet")].map((panel) => Number(panel.querySelector("circle.fft-map-symbol")?.getAttribute("r")));
    // North's 10 clients draw smaller than South's 100, though each is its own panel's biggest.
    expect(radii[0]).toBeLessThan(radii[1] as number);
  });
});
