// @vitest-environment jsdom
/**
 * The noise rules: what a card must not say twice, or say in a way that costs attention. One test per rule, so a
 * change that brings the noise back fails here with the rule's name.
 */
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../core/types.ts";
import { BASE_CSS } from "./styles.ts";
import { fitLabel } from "./views/label-fit.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

const catalog = (type: string) => JSON.parse(readFileSync(`catalog/${type}.json`, "utf8")) as WidgetSpec;

let target: HTMLElement;
afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
  document.body.innerHTML = "";
});

async function drawAt(spec: WidgetSpec, width: number) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
  target = document.createElement("div");
  document.body.append(target);
  await createWidget(target, { locale: "en-US", ...spec }).ready;
  return target;
}
const all = (selector: string) => [...target.querySelectorAll(selector)];
const texts = (selector: string) => all(selector).map((node) => node.textContent ?? "");

describe("words are never broken inside", () => {
  test("no label, name, head or caption rule lets a word break mid-word or hyphenate", () => {
    // Messages and long values (an error's path, a long id on the card's back) may still break where they must.
    const rules = BASE_CSS.split("\n").filter((line) => /(label|name|head|title|caption|col)[^{]*\{/.test(line) && !/fft-message|fft-back-value/.test(line));
    expect(rules.length).toBeGreaterThan(20);
    for (const rule of rules) expect([rule.slice(0, 60), /hyphens:\s*auto|overflow-wrap:\s*(break-word|anywhere)|word-break:\s*break-all/.test(rule)]).toEqual([rule.slice(0, 60), false]);
    expect(BASE_CSS).not.toMatch(/hyphens:\s*auto/);
  });

  test("a scorecard too narrow for a header word turns its headers upright, each whole", async () => {
    await drawAt(catalog("ragboard"), 343);
    const heads = all(".fft-rag-head");
    expect(heads.length).toBeGreaterThan(2);
    expect(heads.every((th) => th.classList.contains("fft-rag-head-lean"))).toBe(true);
    // The words are the dimension's whole label, in one span, never split.
    expect(heads.some((th) => th.textContent === "Business development")).toBe(true);
    expect(heads.every((th) => (th as HTMLElement).title === th.textContent)).toBe(true);
  });

  test("a cut name ends at a word, never inside a parenthesis", () => {
    expect(fitLabel("Operational resilience", 90)).toBe("Operational…");
    expect(fitLabel("Gross margin (net)", 85)).toBe("Gross margin…");
    expect(fitLabel("Aldana Holdings", 300)).toBe("Aldana Holdings");
  });
});

describe("one number, said once", () => {
  test("a pie never states a share twice: on its slice or in the legend, not both", async () => {
    await drawAt(catalog("pie"), 640);
    const onSlices = texts(".fft-pie-label");
    const inLegend = texts(".fft-donut-share").filter(Boolean);
    expect(onSlices.length).toBeGreaterThan(0);
    expect(inLegend.filter((share) => onSlices.includes(share))).toEqual([]);
  });

  test("a waterfall whose bars carry their values draws no value axis, only a baseline", async () => {
    await drawAt(catalog("waterfall"), 640);
    expect(all("rect.fft-step").length).toBe(all(".fft-step-label").length);
    expect(texts(".fft-tick-y")).toEqual([]);
    expect(all(".fft-gridline")).toHaveLength(0);
    expect(all(".fft-baseline").length).toBeGreaterThan(0);
  });

  test("a pyramid whose bars carry their counts draws no ticks or gridlines", async () => {
    await drawAt(catalog("pyramid"), 640);
    expect(all(".fft-pyr-value").length).toBeGreaterThan(0);
    expect([all(".fft-gridline").length, all(".fft-tick").length]).toEqual([0, 0]);
  });

  test("a line's end label is left out when the headline already states that last value", async () => {
    const rows: Row[] = [
      { month: "2026-07", revenue: 100 },
      { month: "2026-08", revenue: 120 },
      { month: "2026-09", revenue: 150 },
    ];
    await drawAt({ data: { type: "inline", rows }, headline: { value: "revenue" }, view: { type: "line", x: "month", y: "revenue" } }, 640);
    expect(all(".fft-end-label")).toHaveLength(0);
    await drawAt({ data: { type: "inline", rows }, view: { type: "line", x: "month", y: "revenue" } }, 640);
    expect(texts(".fft-end-label")).toEqual(["150"]);
  });

  test("a met target shows its check, not the words; screen readers still hear them", async () => {
    await drawAt(catalog("meter"), 640);
    expect(texts(".fft-meter-gap").filter((t) => /met/i.test(t))).toEqual([]);
    const met = all(".fft-meter[data-met]");
    for (const meter of met) expect(meter.querySelector(".fft-meter-track")?.getAttribute("aria-label")).toMatch(/target met/i);
  });
});

describe("marks that would repeat themselves", () => {
  test("a matrix draws nothing in a no cell", async () => {
    await drawAt(catalog("matrix"), 640);
    expect(all(".fft-mx-no")).toHaveLength(0);
  });

  test("anomaly lanes that all have one flag carry no count pill; lanes that differ do", async () => {
    const day = (d: number) => `2026-10-${String(d).padStart(2, "0")}`;
    const rows = ["Trades", "Logins"].flatMap((metric) => [1, 2, 3, 4].map((d) => ({ date: day(d), metric, value: d === 3 ? 9 : 1, flag: d === 3 })));
    await drawAt({ data: { type: "inline", rows }, view: { type: "anomalies", x: "date", metric: "metric", value: "value", flag: "flag" } }, 640);
    expect(all(".fft-anom-count")).toHaveLength(0);
    const uneven = rows.map((row) => (row.metric === "Logins" && row.date === day(2) ? { ...row, value: 8, flag: true } : row));
    await drawAt({ data: { type: "inline", rows: uneven }, view: { type: "anomalies", x: "date", metric: "metric", value: "value", flag: "flag" } }, 640);
    expect(all(".fft-anom-count")).toHaveLength(2);
  });

  test("bump and pareto lines draw dots only at their ends until pointed at", async () => {
    await drawAt(catalog("bump"), 640);
    const lines = all(".fft-bump");
    for (const line of lines) expect(line.querySelectorAll(".fft-bump-dot:not([data-mid])").length).toBe(2);
    expect(BASE_CSS).toMatch(/\.fft-bump-dot\[data-mid\][^{]*\{ opacity: 0/);
    await drawAt(catalog("pareto"), 640);
    expect(all(".fft-pareto-dot:not([data-mid])")).toHaveLength(2);
  });
});

describe("chrome that costs attention", () => {
  test("entrance staggers are capped: no item waits more than 610ms", () => {
    const delays = [...BASE_CSS.matchAll(/animation-delay: ([^;}]+)/g)].map((m) => m[1]?.trim() ?? "");
    expect(delays.length).toBeGreaterThan(40);
    for (const delay of delays) expect([delay, /^min\(.*, (\d+)ms\)$/.test(delay) && Number(/, (\d+)ms\)$/.exec(delay)?.[1]) <= 610]).toEqual([delay, true]);
  });

  test("the widget ref is always in sight, never only on hover: people name a chart by it", () => {
    expect(BASE_CSS).not.toMatch(/\.fft-widget-ref \{[^}]*opacity: 0/);
    expect(BASE_CSS).not.toMatch(/:hover \.fft-widget-ref[^{]*\{ opacity/);
  });

  test.each(["scatter", "line", "bar", "histogram", "area", "beeswarm"])("%s draws at most 5 value gridlines per axis on a card under 480px", async (type) => {
    await drawAt(catalog(type), 386);
    const svgs = all("svg").filter((node) => node.querySelector(".fft-gridline"));
    expect(svgs.length).toBeGreaterThan(0);
    for (const chart of svgs) {
      const lines = [...chart.querySelectorAll("line.fft-gridline")];
      // Value gridlines run across the plot: horizontal for a y axis, vertical for an x axis. Beeswarm's group
      // separators are not value gridlines, so only the vertical ones count there.
      const across = lines.filter((line) => line.getAttribute("y1") === line.getAttribute("y2")).length;
      const down = lines.filter((line) => line.getAttribute("x1") === line.getAttribute("x2")).length;
      expect([type, type === "beeswarm" ? down : Math.max(across, down)]).toEqual([type, Math.min(5, type === "beeswarm" ? down : Math.max(across, down))]);
    }
  });
});
