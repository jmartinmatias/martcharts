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

/** Two metrics over five days: Fees steps out twice (above, then below), Trades never. */
const readings: Row[] = [
  ...["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"].map((date, i) => ({
    date,
    metric: "Trades",
    value: 100 + i,
    expected: 100 + i,
    low: 90 + i,
    high: 110 + i,
    flag: false,
  })),
  { date: "2026-10-01", metric: "Fees", value: 50, expected: 50, low: 45, high: 55, flag: false },
  { date: "2026-10-02", metric: "Fees", value: 70, expected: 50, low: 45, high: 55, flag: true },
  { date: "2026-10-03", metric: "Fees", value: 51, expected: 50, low: 45, high: 55, flag: false },
  { date: "2026-10-04", metric: "Fees", value: 30, expected: 50, low: 45, high: 55, flag: true },
  { date: "2026-10-05", metric: "Fees", value: 52, expected: 50, low: 45, high: 55, flag: false },
];
const view = { type: "anomalies", x: "date", metric: "metric", value: "value", expected: "expected", low: "low", high: "high", flag: "flag" };

describe("anomalies view", () => {
  test("one lane per metric, the lane with the most anomalies first, each with its band, expected and line", async () => {
    await draw({ rows: readings, view });
    expect(all(".fft-anom-lane").map((lane) => lane.getAttribute("data-metric"))).toEqual(["Fees", "Trades"]);
    expect([all(".fft-anom-band").length, all(".fft-anom-expected").length, all(".fft-anom-line").length]).toEqual([2, 2, 2]);
  });

  test("flagged readings are alert dots with a halo, and the lanes end with the latest value and a count", async () => {
    await draw({ rows: readings, view });
    expect([all(".fft-anom-flag").length, all(".fft-anom-halo").length]).toEqual([2, 2]);
    expect(texts(".fft-anom-name")).toEqual(["Fees", "Trades"]);
    expect(texts(".fft-anom-latest")).toEqual(["52", "104"]);
    expect(texts(".fft-anom-count text")).toEqual(["2 anomalies", "none"]);
    expect(all(".fft-anom-count").map((pill) => pill.getAttribute("data-none"))).toEqual(["false", "true"]);
  });

  test("each anomaly is a keyboard stop whose tooltip says the value, the band and which side it fell", async () => {
    await draw({ rows: readings, view });
    const hits = all(".fft-anom-hit") as SVGElement[];
    expect(hits.map((hit) => hit.getAttribute("tabindex"))).toEqual(["0", "-1"]);
    hits[1]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row")).toEqual(["30Value", "50Expected", "45 to 55Expected band", "Below the bandAnomaly"]);
    expect(hits[0]?.getAttribute("aria-label")).toMatch(/^Fees, .*Above the band$/);
  });

  test("without a flag field, readings outside the band are the anomalies", async () => {
    const { flag: _flag, ...unflagged } = view;
    await draw({ rows: readings.map(({ flag: _f, ...row }) => row), view: unflagged });
    expect(all(".fft-anom-flag")).toHaveLength(2);
  });

  test("a key names the band, the line and the anomaly dots, and the hidden table lists the flagged readings", async () => {
    await draw({ rows: readings, view });
    expect(texts(".fft-anom-key li")).toEqual(["Expected band", "Value", "Anomaly"]);
    expect(all(".fft-sr-only tbody tr")).toHaveLength(2);
  });

  test("validation wants both ends of the band, and warns when nothing is flagged", () => {
    const rows = readings.map((row) => ({ ...row, flag: false }));
    const half = validateSpec({ data: { type: "inline", rows }, view: { ...view, high: undefined } as never }, rows);
    expect(half.map((issue) => issue.message).join(" ")).toMatch(/needs both low and high/);
    const quiet = validateSpec({ data: { type: "inline", rows }, view }, rows);
    expect(quiet.map((issue) => issue.message).join(" ")).toMatch(/No reading is flagged/);
  });

  test("the guide names the worst measure and when it last stepped out; the question asks which and when", () => {
    const spec: WidgetSpec = { data: { type: "inline", rows: readings }, view };
    const words = explainChart(spec, readings);
    expect(words).toContain("Each thin lane is one metric");
    expect(words).toContain("Here, 2 readings were flagged across 1 of 2 measures; Fees stepped out most, 2 times");
    expect(questionOf(spec, readings).text).toMatch(/stepped out of their expected range, and when\?$/);
  });

  test("recommended for readings per metric over time with a flag", () => {
    expect(recommendCharts(readings).map((pick) => pick.type)).toContain("anomalies");
  });
});
