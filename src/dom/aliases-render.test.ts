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

/** The drawn body of a spec, with generated ids blanked so two draws compare. */
async function drawn(rows: Row[], view: Record<string, unknown>, extra: Record<string, unknown> = {}): Promise<string> {
  target.innerHTML = "";
  const widget = createWidget(target, { locale: "en-US", data: { type: "inline", rows }, view, ...extra } as unknown as WidgetSpec);
  await widget.ready;
  expect(target.querySelector(".fft-widget")?.getAttribute("data-state")).toBe("ready");
  const html = target.querySelector(".fft-body")?.innerHTML ?? "";
  widget.destroy();
  return html.replace(/id="[^"]*"/g, 'id=""').replace(/url\(#[^)]*\)/g, "url(#)");
}

const products = [
  { product: "Core", ease: 7, value: 8, support: 6, a: 3, b: 4 },
  { product: "Plus", ease: 8, value: 6, support: 9, a: 5, b: 1 },
];

describe("a canonical name draws exactly what the older one did", () => {
  test("dot: value and values", async () => {
    expect(await drawn(products, { type: "dot", label: "product", value: ["ease", "support"] })).toBe(await drawn(products, { type: "dot", label: "product", values: ["ease", "support"] }));
  });
  test("strips: value and parts", async () => {
    expect(await drawn(products, { type: "strips", label: "product", value: ["a", "b"] })).toBe(await drawn(products, { type: "strips", label: "product", parts: ["a", "b"] }));
  });
  test("likert: value and responses", async () => {
    expect(await drawn(products, { type: "likert", label: "product", value: ["a", "b", "ease"] })).toBe(await drawn(products, { type: "likert", label: "product", responses: ["a", "b", "ease"] }));
  });
  test("scatter: color and series", async () => {
    const rows = [{ g: "A", x: 1, y: 2 }, { g: "B", x: 2, y: 3 }];
    expect(await drawn(rows, { type: "scatter", x: "x", y: "y", color: "g" })).toBe(await drawn(rows, { type: "scatter", x: "x", y: "y", series: "g" }));
  });
  test("matrix: flag and mark", async () => {
    const rows = [{ r: "DORA", s: "Banks", must: true }, { r: "DORA", s: "Insurers", must: false }];
    expect(await drawn(rows, { type: "matrix", x: "s", y: "r", flag: "must" })).toBe(await drawn(rows, { type: "matrix", x: "s", y: "r", mark: "must" }));
  });
  test("locator: color and kind", async () => {
    const rows = [{ c: "FR", n: "Paris", k: "HQ" }, { c: "DE", n: "Berlin", k: "Sales" }];
    expect(await drawn(rows, { type: "locator", geo: "europe", id: "c", label: "n", color: "k" })).toBe(await drawn(rows, { type: "locator", geo: "europe", id: "c", label: "n", kind: "k" }));
  });
  test('choropleth: labels "none" and false', async () => {
    const rows = [{ c: "FR", v: 3 }, { c: "DE", v: 5 }];
    expect(await drawn(rows, { type: "choropleth", geo: "europe", id: "c", value: "v", labels: "none" })).toBe(await drawn(rows, { type: "choropleth", geo: "europe", id: "c", value: "v", labels: false }));
  });
});

describe("spec.colors", () => {
  test("a named category keeps its color on a donut; the others take the palette", async () => {
    const rows = [{ s: "Enterprise", v: 5 }, { s: "SMB", v: 3 }];
    target.innerHTML = "";
    const widget = createWidget(target, { data: { type: "inline", rows }, view: { type: "donut", label: "s", value: "v" }, colors: { SMB: "rgb(1, 2, 3)" } } as WidgetSpec);
    await widget.ready;
    const strokes = [...target.querySelectorAll<SVGElement>(".fft-slice")].map((slice) => slice.style.stroke);
    expect(strokes).toEqual(["var(--fft-series-1)", "rgb(1, 2, 3)"]);
    widget.destroy();
  });
});
