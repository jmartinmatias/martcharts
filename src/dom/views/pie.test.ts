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

const segments = [
  { segment: "Enterprise", revenue: 660_100 },
  { segment: "Mid-market", revenue: 447_000 },
  { segment: "Small business", revenue: 97_600 },
];
const fields = { revenue: { label: "Revenue", format: { type: "currency", currency: "EUR", decimals: 0 } } };
const spec = { rows: segments, fields, view: { type: "pie", label: "segment", value: "revenue" } };

describe("pie view", () => {
  test("one wedge per row, from the center to the rim, in palette order, with no ring and no center total", async () => {
    await draw(spec);
    const wedges = all("path.fft-pie-slice") as SVGPathElement[];
    expect(wedges.map((w) => w.style.fill)).toEqual(["var(--fft-series-1)", "var(--fft-series-2)", "var(--fft-series-3)"]);
    // A wedge starts at the center (116.5,116.5: jsdom has no width, so the disc takes the 233px step) and goes out to the rim.
    expect(wedges[0]?.getAttribute("d")).toMatch(/^M116\.5,116\.5L116\.5,1A/);
    expect([all(".fft-donut-track").length, all(".fft-donut-total").length]).toEqual([0, 0]);
  });

  test("shares are written on the slices wide enough to hold them; a sliver stays bare", async () => {
    await draw({ ...spec, rows: [...segments, { segment: "Other", revenue: 12_000 }] });
    expect(texts(".fft-pie-label")).toEqual(["54%", "37%", "8%"]);
  });

  test("the legend lists each slice with its value and share, as a donut's does", async () => {
    await draw(spec);
    expect(all(".fft-donut-legend li").map((li) => [...li.querySelectorAll("span")].map((s) => s.textContent).filter(Boolean))).toEqual([
      ["Enterprise", "€660,100", "55%"],
      ["Mid-market", "€447,000", "37%"],
      ["Small business", "€97,600", "8%"],
    ]);
  });

  test('labels "outside" names every slice beside the disc on a leader line, pushed apart so none overlap, and drops the legend', async () => {
    await draw({ ...spec, rows: [...segments, { segment: "Public sector", revenue: 30_000 }], view: { ...spec.view, labels: "outside" } });
    expect(texts(".fft-pie-name")).toEqual(["Enterprise 53%", "Mid-market 36%", "Small business 8%", "Public sector 2%"]);
    expect([all(".fft-pie-leader").length, all(".fft-donut-legend").length, all(".fft-pie-label").length]).toEqual([4, 0, 0]);
    // The two thin slices sit on the left side close together: their labels keep at least a line apart.
    const ys = (all(".fft-pie-name") as SVGTextElement[]).map((t) => Number(t.getAttribute("y")));
    expect(Math.abs((ys[3] as number) - (ys[2] as number))).toBeGreaterThanOrEqual(15);
    // Labels on the right read rightward, labels on the left leftward.
    expect((all(".fft-pie-name") as SVGTextElement[]).map((t) => t.getAttribute("text-anchor"))).toEqual(["start", "end", "end", "end"]);
  });

  test('labels "legend" leaves the disc bare and keeps the legend', async () => {
    await draw({ ...spec, view: { ...spec.view, labels: "legend" } });
    expect([all(".fft-pie-label").length, all(".fft-pie-name").length, all(".fft-donut-legend li").length]).toEqual([0, 0, 3]);
  });

  test("rows with zero or negative values are left out, and validation says so", async () => {
    const rows = [...segments, { segment: "Refunds", revenue: -5 }, { segment: "None", revenue: 0 }];
    await draw({ ...spec, rows });
    expect(all("path.fft-pie-slice").length).toBe(3);
    const messages = validateSpec({ data: { type: "inline", rows }, view: spec.view } as WidgetSpec, rows).map((i) => i.message);
    expect(messages).toContain("2 rows with zero, negative or missing values are left out of the pie.");
  });

  test("more than six slices warns", () => {
    const rows = "ABCDEFG".split("").map((segment, i) => ({ segment, revenue: 10 + i }));
    const messages = validateSpec({ data: { type: "inline", rows }, view: spec.view } as WidgetSpec, rows).map((i) => i.message);
    expect(messages.join(" ")).toMatch(/7 slices/);
  });

  test("a wedge is a keyboard stop that names itself and shows value and share on focus; a click picks its row", async () => {
    await draw(spec);
    const seen: Row[] = [];
    target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
    // Wedges are one roving stop: the first takes the Tab, the arrows move between them.
    const wedge = all("path.fft-pie-slice")[1] as SVGPathElement;
    expect(all("path.fft-pie-slice").map((w) => w.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
    expect(wedge.getAttribute("aria-label")).toBe("Mid-market: €447,000, 37%");
    wedge.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Mid-market", "€447,000Revenue", "37%Share"]);
    wedge.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(seen).toEqual([segments[1]]);
  });

  test("a hidden table carries the data for screen readers", async () => {
    await draw(spec);
    expect(texts(".fft-sr-only th")).toEqual(["Segment", "Revenue"]);
  });

  test("the guide, the question and the recommender know the pie", () => {
    const full: WidgetSpec = { locale: "en-US", data: { type: "inline", rows: segments }, fields, view: spec.view };
    expect(explainChart(full, segments)).toBe("The circle is the whole. Each slice is one segment: the wider the slice, the bigger its share of revenue. Here, Enterprise is the biggest slice, with 55% of the whole.");
    expect(questionOf(full, segments).text).toBe("What share of revenue comes from each segment?");
    expect(recommendCharts(segments).map((pick) => pick.type)).toContain("pie");
  });
});
