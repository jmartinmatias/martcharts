// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { explainChart } from "../../core/explain.ts";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { validateSpec } from "../../core/validate.ts";
import { logScale } from "../layout.ts";
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

const rows = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"].map((month, i) => ({ month, revenue: [120, 90, 175, 150, 160, 170][i] as number }));

describe("line symbols (points)", () => {
  test("points true draws a dot at every reading but the last, which the end dot already marks", async () => {
    await draw({ rows, view: { type: "line", x: "month", y: "revenue", points: true } });
    expect(all(".fft-point-dot").length).toBe(5);
    expect(all(".fft-point-dot")[0]?.getAttribute("style")).toContain("var(--fft-series-1)");
    expect(explainChart({ data: { type: "inline", rows }, view: { type: "line", x: "month", y: "revenue", points: true } } as WidgetSpec)).toContain("Each dot on a line is one reading.");
  });

  test("readings closer than 8px keep no symbols", async () => {
    const many = Array.from({ length: 120 }, (_, i) => ({ day: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`, v: i }));
    await draw({ rows: many, view: { type: "line", x: "day", y: "v", points: true } });
    expect(all(".fft-point-dot").length).toBe(0);
  });

  test("forecast readings are hollow", async () => {
    const fan = rows.map((row, i) => ({ ...row, f: i >= 4 }));
    await draw({ rows: fan, view: { type: "line", x: "month", y: "revenue", points: true, forecast: "f" } });
    expect(all(".fft-point-dot[data-forecast]").length).toBe(1);
  });
});

describe("peak labels", () => {
  test("labels peaks marks the highest and lowest reading with a dot and writes their values, high above and low below", async () => {
    await draw({ rows, view: { type: "line", x: "month", y: "revenue", labels: "peaks" } });
    expect(all(".fft-peak-dot").length).toBe(2);
    expect(texts(".fft-peak-label[data-peak='high']")).toEqual(["175"]);
    expect(texts(".fft-peak-label[data-peak='low']")).toEqual(["90"]);
    const high = all(".fft-peak-dot[data-peak='high']")[0];
    const low = all(".fft-peak-dot[data-peak='low']")[0];
    expect(num(all(".fft-peak-label[data-peak='high']")[0], "y")).toBeLessThan(num(high, "cy"));
    expect(num(all(".fft-peak-label[data-peak='low']")[0], "y")).toBeGreaterThan(num(low, "cy"));
  });

  test("a peak on the plot's edge takes its label beside it, not over the line", async () => {
    await draw({ rows: rows.map((row) => ({ ...row, revenue: row.revenue === 175 ? 200 : row.revenue })), view: { type: "line", x: "month", y: "revenue", labels: "peaks" } });
    const high = all(".fft-peak-dot[data-peak='high']")[0];
    const label = all(".fft-peak-label[data-peak='high']")[0];
    expect(num(label, "x")).toBeGreaterThan(num(high, "cx"));
    expect(Math.abs(num(label, "y") - num(high, "cy"))).toBeLessThan(6);
  });

  test("a peak at the line's end keeps its dot but leaves the value to the end label", async () => {
    const rising = rows.map((row, i) => ({ ...row, revenue: 100 + i * 10 }));
    await draw({ rows: rising, view: { type: "line", x: "month", y: "revenue", labels: "peaks" } });
    expect(all(".fft-peak-dot").length).toBe(2);
    expect(texts(".fft-peak-label")).toEqual(["100"]);
    expect(texts(".fft-end-label")).toEqual(["150"]);
  });

  test("a flat line has no peaks", async () => {
    await draw({ rows: rows.map((row) => ({ ...row, revenue: 5 })), view: { type: "line", x: "month", y: "revenue", labels: "peaks" } });
    expect(all(".fft-peak-dot").length).toBe(0);
  });
});

describe("bar compare columns", () => {
  const years = [
    { region: "North", revenue: 120, lastYear: 100 },
    { region: "South", revenue: 80, lastYear: 140 },
    { region: "East", revenue: 150, lastYear: null },
  ];
  const fields = { lastYear: { label: "Last year" } };

  test("a wider, quieter column stands behind each bar that has a comparison, keyed by its label", async () => {
    await draw({ rows: years, fields, view: { type: "bar", x: "region", y: "revenue", compare: "lastYear" } });
    const ghosts = all(".fft-bar-compare");
    expect(ghosts.length).toBe(2);
    expect(texts(".fft-legend li")).toEqual(["Revenue", "Last year"]);
    // Behind: drawn before the bar in the same group; wider: its path spans more than the bar's.
    const group = target.querySelector(".fft-marks[data-index='0']");
    expect(group?.firstElementChild?.classList.contains("fft-bar-compare")).toBe(true);
    const span = (d: string) => {
      const xs = [...d.matchAll(/[ML]([\d.]+),/g)].map((m) => Number(m[1]));
      const hs = [...d.matchAll(/H([\d.]+)/g)].map((m) => Number(m[1]));
      return Math.max(...xs, ...hs) - Math.min(...xs, ...hs);
    };
    expect(span(ghosts[0]?.getAttribute("d") ?? "")).toBeGreaterThan(span(group?.querySelector(".fft-bar")?.getAttribute("d") ?? ""));
  });

  test("the axis covers the comparison, and the tooltip gives it", async () => {
    await draw({ rows: years, fields, view: { type: "bar", x: "region", y: "revenue", compare: "lastYear" } });
    const ticks = texts(".fft-tick-y").map(Number);
    expect(Math.max(...ticks)).toBeGreaterThanOrEqual(150);
    all(".fft-hit")[1]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row")).toEqual(["80Revenue", "140Last year"]);
    expect(texts(".fft-sr-only th")).toEqual(["Region", "Revenue", "Last year"]);
  });

  test("compare needs one series of plain bars, and the guide names it", () => {
    const base = { data: { type: "inline", rows: years }, fields, view: { type: "bar", x: "region", y: ["revenue", "lastYear"], compare: "lastYear" } };
    expect(validateSpec(base, years).map((i) => i.message).join(" ")).toMatch(/compare draws behind one series/);
    expect(validateSpec({ ...base, view: { ...base.view, y: "revenue", stacked: true } }, years).map((i) => i.message).join(" ")).toMatch(/compare draws behind one series/);
    expect(explainChart({ ...base, view: { ...base.view, y: "revenue" } } as WidgetSpec)).toContain("The wider grey bar behind each one is last year, to compare against.");
  });
});

describe("log scale", () => {
  test("logScale puts ticks at powers of ten, with 2 and 5 steps over a short range", () => {
    expect(logScale([1, 1000], [0, 1]).ticks).toEqual([1, 10, 100, 1000]);
    expect(logScale([3, 40], [0, 1]).ticks).toEqual([1, 2, 5, 10, 20, 50, 100]);
    const scale = logScale([1, 100], [100, 0]);
    expect([scale(1), scale(10), scale(100)]).toEqual([100, 50, 0]);
  });

  test("scale log draws the axis by tens and leaves non-positive readings out, with a warning", async () => {
    const growth = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"].map((month, i) => ({ month, users: [10, 100, 1000, 0, 10000][i] as number }));
    await draw({ rows: growth, view: { type: "line", x: "month", y: "users", scale: "log", endLabels: false } });
    expect(texts(".fft-tick-y")).toEqual(["10", "100", "1K", "10K"]);
    // Equal multiplicative steps land on equal pixel steps.
    const ys = texts(".fft-tick-y").map((_, i) => num(all(".fft-tick-y")[i], "y"));
    expect(ys[0]! - ys[1]!).toBeCloseTo(ys[1]! - ys[2]!, 5);
    // The zero reading breaks the line: two segments in the path.
    expect((target.querySelector("path.fft-line")?.getAttribute("d") ?? "").split("M").length - 1).toBe(2);
    const warnings = validateSpec({ data: { type: "inline", rows: growth }, view: { type: "line", x: "month", y: "users", scale: "log" } }, growth);
    expect(warnings.map((i) => `${i.level}:${i.message}`).join(" ")).toMatch(/warning:1 rows have a zero or negative value/);
    expect(explainChart({ data: { type: "inline", rows: growth }, view: { type: "line", x: "month", y: "users", scale: "log" } } as WidgetSpec)).toContain("The axis grows by tens");
  });
});
