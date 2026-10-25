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
const num = (node: Element | undefined, attr: string) => Number(node?.getAttribute(attr));

const regions = [
  { region: "North", fy2025: 200, fy2026: 278 },
  { region: "South", fy2025: 240, fy2026: 204 },
  { region: "West", fy2025: 150, fy2026: 150 },
];
const years = { fy2025: { label: "Last year" }, fy2026: { label: "This year" } };
const arrows: WidgetSpec["view"] = { type: "dumbbell", label: "region", from: "fy2025", to: "fy2026", mark: "arrow" };

describe("dumbbell with mark arrow (an arrow plot)", () => {
  test("each row is an arrow from the before dot to the after value: a shaft, and a head whose tip is the after value", async () => {
    await draw({ rows: regions, view: arrows, fields: years });
    expect([all("circle.fft-db-from").length, all("line.fft-db-shaft").length, all("path.fft-db-head").length, all("circle.fft-db-to").length]).toEqual([3, 3, 2, 0]);
    const rows = all(".fft-db-row");
    const north = rows[0] as SVGGElement;
    const head = north.querySelector("path.fft-db-head") as SVGPathElement;
    const from = north.querySelector("circle.fft-db-from") as SVGCircleElement;
    const shaft = north.querySelector("line.fft-db-shaft") as SVGLineElement;
    // The head's tip (the path's first point) sits right of the before dot for a rise, and the shaft runs from the dot toward it.
    const tip = Number(/^M([\d.]+),/.exec(head.getAttribute("d") ?? "")?.[1]);
    expect(tip).toBeGreaterThan(num(from, "cx"));
    expect([num(shaft, "x1"), num(shaft, "x2") < tip && num(shaft, "x2") > num(from, "cx")]).toEqual([num(from, "cx"), true]);
    // A fall points the other way.
    const south = rows[1] as SVGGElement;
    const southTip = Number(/^M([\d.]+),/.exec(south.querySelector("path.fft-db-head")?.getAttribute("d") ?? "")?.[1]);
    expect(southTip).toBeLessThan(num(south.querySelector("circle.fft-db-from") as Element, "cx"));
  });

  test("between two periods, rises take the up color and falls the down color, keyed Rose and Fell; no move is a hollow ring", async () => {
    await draw({ rows: regions, view: arrows, fields: years });
    expect(all(".fft-db-row").map((row) => (row as HTMLElement).dataset.direction)).toEqual(["up", "down", "flat"]);
    expect(texts(".fft-legend li")).toEqual(["Last year", "Rose", "Fell"]);
    expect(all(".fft-legend .fft-swatch").map((s) => s.className)).toEqual(["fft-swatch fft-db-key-from", "fft-swatch fft-db-key-up", "fft-swatch fft-db-key-down"]);
    expect([all("circle.fft-db-still").length, all(".fft-db-row")[2]?.querySelector("path.fft-db-head")]).toEqual([1, null]);
    expect(target.querySelector(".fft-chart")?.getAttribute("data-mark")).toBe("arrow");
  });

  test("the legend keys only the directions that happened", async () => {
    await draw({ rows: regions.slice(0, 1), view: arrows, fields: years });
    expect(texts(".fft-legend li")).toEqual(["Last year", "Rose"]);
  });

  test("the tooltip gives before, after and the change, and the row's label says which way it went", async () => {
    await draw({ rows: regions, view: arrows, fields: years });
    const hits = all(".fft-db-hit");
    hits[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["South", "240Last year", "204This year", "−15.0%Change"]);
    expect(hits.map((hit) => hit.getAttribute("aria-label"))).toEqual([
      "North: Last year 200, This year 278, Change +39.0%, rose",
      "South: Last year 240, This year 204, Change −15.0%, fell",
      "West: Last year 150, This year 150, Change 0.0%",
    ]);
  });

  test("two different measures are not a rise or a fall: the arrow takes the second measure's series color and the legend names it", async () => {
    await draw({ rows: [{ region: "North", revenue: 278, cost: 190 }], view: { ...arrows, from: "revenue", to: "cost" } });
    expect(texts(".fft-legend li")).toEqual(["Revenue", "Cost"]);
    expect((all("path.fft-db-head")[0] as SVGElement).style.fill).toBe("var(--fft-series-2)");
    expect((all("line.fft-db-shaft")[0] as SVGElement).style.stroke).toBe("var(--fft-series-2)");
    expect(all(".fft-db-row")[0]?.hasAttribute("data-direction")).toBe(true);
    all(".fft-db-hit")[0]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row")).toEqual(["278Revenue", "190Cost", "88Gap"]);
  });

  test("the default mark is unchanged: two dots joined by a line, no arrow parts", async () => {
    await draw({ rows: regions, view: { type: "dumbbell", label: "region", from: "fy2025", to: "fy2026" }, fields: years });
    expect([all("circle.fft-db-from").length, all("circle.fft-db-to").length, all("line.fft-db-line").length, all("path.fft-db-head").length]).toEqual([3, 3, 3, 0]);
    expect(texts(".fft-legend li")).toEqual(["Last year", "This year"]);
  });

  test("validation knows the mark's two values, and the guide reads the arrow", () => {
    const spec = (view: WidgetSpec["view"]): WidgetSpec => ({ locale: "en-US", data: { type: "inline", rows: regions }, view, fields: years });
    expect(validateSpec(spec({ ...arrows, mark: "dashed" }), regions).some((issue) => issue.level === "error" && issue.path === "view.mark")).toBe(true);
    expect(explainChart(spec(arrows), regions)).toBe("Each row is an arrow from last year to this year. A blue arrow rose and a red one fell; the longer the arrow, the bigger the change. Here, 1 of 3 regions went up, and North moved the most, from 200 to 278.");
  });
});
