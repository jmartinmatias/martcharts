// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { explainChart } from "../../core/explain.ts";
import { questionOf } from "../../core/question.ts";
import { recommendCharts } from "../../core/recommend.ts";
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
const cx = (node: Element) => Number(node.getAttribute("cx"));

const ratings = [
  { product: "Enterprise", ease: 7.1, value: 6.2, support: 9.1 },
  { product: "Core", ease: 8.6, value: 8.1, support: 7.6 },
  { product: "Lite", ease: 8.9, value: 8.8, support: 6.4 },
];
const many: WidgetSpec["view"] = { type: "dot", label: "product", values: ["ease", "value", "support"] };
const oneOnly: WidgetSpec["view"] = { type: "dot", label: "product", values: "ease" };

describe("dot view (a dot plot)", () => {
  test("one row per data row, a hairline across each, and one dot per measure on one shared axis", async () => {
    await draw({ rows: ratings, view: many });
    expect(texts(".fft-dot-label")).toEqual(["Enterprise", "Core", "Lite"]);
    expect([all("line.fft-dot-line").length, all("circle.fft-dot-mark").length, all("line.fft-gridline").length > 1]).toEqual([3, 9, true]);
    // Every dot of one row shares its hairline's height, and a bigger value sits further right.
    const row = all(".fft-dot-row")[0] as SVGGElement;
    const dots = [...row.querySelectorAll("circle.fft-dot-mark")];
    const line = row.querySelector("line.fft-dot-line") as SVGLineElement;
    expect(dots.every((dot) => dot.getAttribute("cy") === line.getAttribute("y1"))).toBe(true);
    const rightmost = Math.max(...dots.map(cx));
    const support = dots.find((dot) => (dot as SVGElement).style.fill === "var(--fft-series-3)") as Element;
    expect(cx(support)).toBe(rightmost);
  });

  test("several measures take series colors with a dot legend, and write no values", async () => {
    await draw({ rows: ratings, view: many });
    expect(texts(".fft-legend li")).toEqual(["Ease", "Value", "Support"]);
    expect(all(".fft-legend .fft-swatch").map((s) => (s as HTMLElement).dataset.shape)).toEqual(["dot", "dot", "dot"]);
    expect(all(".fft-dot-value")).toEqual([]);
  });

  test("one measure has no legend and writes its value beside the dot", async () => {
    await draw({ rows: ratings, view: oneOnly });
    expect(all(".fft-legend")).toEqual([]);
    expect(texts(".fft-dot-value")).toEqual(["7.1", "8.6", "8.9"]);
    // The value sits just right of its dot.
    const dot = all("circle.fft-dot-mark")[0] as Element;
    expect(Number(all(".fft-dot-value")[0]?.getAttribute("x"))).toBeGreaterThan(cx(dot));
  });

  test("hovering or focusing a row shows every measure in the tooltip and dims the other rows", async () => {
    await draw({ rows: ratings, view: many, fields: { ease: { label: "Ease of use" } } });
    const hits = all(".fft-dot-hit");
    hits[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Core", "8.6Ease of use", "8.1Value", "7.6Support"]);
    expect([target.querySelector(".fft-dots")?.hasAttribute("data-active"), all(".fft-dot-row")[1]?.hasAttribute("data-active"), all(".fft-dot-row")[0]?.hasAttribute("data-active")]).toEqual([true, true, false]);
    hits[1]?.dispatchEvent(new Event("blur"));
    expect(target.querySelector(".fft-dots")?.hasAttribute("data-active")).toBe(false);
  });

  test("every row is a labelled keyboard stop (one tab stop, arrows between rows), and picks its row on Enter", async () => {
    await draw({ rows: ratings, view: oneOnly });
    const hits = all(".fft-dot-hit");
    expect(hits.map((hit) => hit.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
    expect(hits[2]?.getAttribute("aria-label")).toBe("Lite: Ease 8.9");
    const seen: Row[] = [];
    target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
    hits[2]?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(seen).toEqual([ratings[2]]);
  });

  test("highlight keeps the named rows in color and greys the rest", async () => {
    await draw({ rows: ratings, view: { ...oneOnly, highlight: "Lite" } });
    expect(all("circle.fft-dot-mark").map((dot) => (dot as SVGElement).style.fill)).toEqual(["var(--fft-deemphasis)", "var(--fft-deemphasis)", "var(--fft-series-1)"]);
  });

  test("a long name is cut with an ellipsis but kept whole for screen readers, and a missing value leaves no dot", async () => {
    const rows = [
      { product: "A very long product name that would otherwise eat the whole card width", ease: 7 },
      { product: "Core", ease: null },
    ];
    await draw({ rows, view: oneOnly });
    const labels = all(".fft-dot-label");
    expect(labels[0]?.textContent?.endsWith("…")).toBe(true);
    expect(labels[0]?.getAttribute("aria-label")).toBe(rows[0]?.product);
    expect([all("circle.fft-dot-mark").length, all(".fft-dot-hit")[1]?.getAttribute("aria-label")]).toEqual([1, "Core: no value"]);
  });

  test("a hidden table carries the label and every measure for assistive technology", async () => {
    await draw({ rows: ratings, view: many });
    expect(texts(".fft-sr-only th")).toEqual(["Product", "Ease", "Value", "Support"]);
  });

  test("small multiples share one axis through extent", async () => {
    const rows = [
      { region: "East", product: "Core", score: 2 },
      { region: "East", product: "Plus", score: 4 },
      { region: "West", product: "Core", score: 90 },
      { region: "West", product: "Plus", score: 95 },
    ];
    await draw({ rows, facet: { field: "region" }, view: { type: "dot", label: "product", values: "score" } });
    const panels = all(".fft-facet");
    expect(panels.length).toBe(2);
    const ticks = (panel: Element) => [...panel.querySelectorAll(".fft-tick")].map((t) => t.textContent);
    expect(ticks(panels[0] as Element)).toEqual(ticks(panels[1] as Element));
    // The shared legend is drawn by the widget, never once per panel.
    expect(all(".fft-facet .fft-legend")).toEqual([]);
  });

  test("validation wants a label and values, and warns past six measures or thirty rows", () => {
    const base = { data: { type: "inline", rows: ratings } } as unknown as WidgetSpec;
    expect(validateSpec({ ...base, view: { type: "dot", label: "product" } }).some((issue) => issue.level === "error" && issue.path === "view.values")).toBe(true);
    const crowded = { ...base, view: { type: "dot", label: "product", values: ["a", "b", "c", "d", "e", "f", "g"] } };
    expect(validateSpec(crowded, ratings).map((issue) => issue.message).join(" ")).toMatch(/7 dots per row/);
  });

  test("says what it answers and how to read it, and is recommended for a few measures of one kind per item", () => {
    const spec = (view: WidgetSpec["view"]): WidgetSpec => ({ locale: "en-US", data: { type: "inline", rows: ratings }, view, fields: { ease: { label: "Ease of use" } } });
    expect(questionOf(spec(many)).text).toBe("How do ease of use, value and support compare for each product?");
    expect(questionOf(spec(oneOnly)).text).toBe("Which product has the most ease of use?");
    expect(explainChart(spec(oneOnly), ratings)).toBe("Each row is one product. The further right the dot, the more ease of use. Here, Lite has the dot furthest right, with 8.9.");
    expect(explainChart(spec(many), ratings)).toBe(
      "Each row is one product, with one dot for each of ease of use, value and support. The further right a dot, the higher that value; dots far apart mean a big difference between them. Here, Lite is highest on ease of use, with 8.9, and Enterprise's dots sit furthest apart.",
    );
    const picks = recommendCharts(ratings);
    expect(picks.find((pick) => pick.type === "dot")?.view).toEqual({ type: "dot", label: "product", value: ["ease", "value", "support"] });
  });
});
