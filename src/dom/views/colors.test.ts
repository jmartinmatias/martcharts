// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

/**
 * Fixed per-category colors (`spec.colors`) reach every row and cartesian view whose colors name categories or
 * series. Each view's catalog example is given one marker color for every value and field it holds; the marker must
 * then be drawn somewhere in the chart.
 *
 * Left out by design, because their colors carry a meaning of their own: heatmap, calendar and horizon (a scale
 * of value), variance, waterfall and candlestick (good and bad, rise and fall), and table (badge formats).
 */
const VIEWS = [
  "bar", "line", "area", "hbar", "dot", "dumbbell", "slope", "bump", "bullet", "meter", "funnel", "strips", "pyramid",
  "boxplot", "beeswarm", "ridgeline", "histogram", "pareto", "dual", "anomalies", "lifecycle", "whitespace", "scatter",
  "timeline", "marimekko",
];
const MARK = "rgb(1, 2, 3)";
const catalog = (type: string) => JSON.parse(readFileSync(`catalog/${type}.json`, "utf8")) as WidgetSpec;

afterEach(() => {
  document.body.innerHTML = "";
});

/** Every value and field name in the rows, each mapped to the marker. */
function everything(rows: Row[]): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const row of rows) {
    for (const [field, value] of Object.entries(row)) {
      colors[field] = MARK;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") colors[String(value)] = MARK;
    }
  }
  return colors;
}

describe("one legend for every row and cartesian view", () => {
  const RENDERERS = ["anomalies", "candlestick", "dumbbell", "likert", "lifecycle", "matrix", "whitespace", "chart", "hbar", "dot", "strips", "timeline", "board", "history", "scatter", "pareto", "marimekko"];
  test.each(RENDERERS)("%s builds its legend with legendList, never by hand", (name) => {
    const source = readFileSync(`src/dom/views/${name}.ts`, "utf8");
    expect([name, /html\(doc, "ul", "fft-legend/.test(source)]).toEqual([name, false]);
  });
});

describe("fixed colors reach every view that colors by category or series", () => {
  test.each(VIEWS)("%s", async (type) => {
    const spec = catalog(type);
    const target = document.createElement("div");
    document.body.append(target);
    await createWidget(target, { ...spec, locale: "en-US", colors: everything(spec.data.rows as Row[]) }).ready;
    const body = target.querySelector(".fft-body") as HTMLElement;
    const styled = [...body.querySelectorAll<HTMLElement | SVGElement>("[style]")].map((node) => node.getAttribute("style") ?? "");
    expect([type, styled.some((style) => style.includes(MARK) || style.includes("#010203"))]).toEqual([type, true]);
  });
});
