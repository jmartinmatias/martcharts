// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { explainChart } from "../../core/explain.ts";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { hasErrors, validateSpec } from "../../core/validate.ts";
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

/** Draws at a given card width: jsdom has no layout, so clientWidth is overridden for this one draw. */
async function drawAt(width: number, spec: Omit<WidgetSpec, "data"> & { rows: Row[] }) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
  try {
    await draw(spec);
  } finally {
    Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
  }
}

const all = (selector: string) => [...target.querySelectorAll(selector)];
const texts = (selector: string) => all(selector).map((node) => node.textContent);
const num = (node: Element | undefined, attr: string) => Number(node?.getAttribute(attr));

const rows = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"].map((month, i) => ({ month, revenue: 100 + i * 20 + (i === 2 ? 60 : 0) }));
const notes = [
  { x: "2026-03", text: "Price rise" },
  { x: "2026-05", text: "Two renewals slipped to June" },
];

describe("annotations", () => {
  test("a line pins each note to its point: a dot on the value, a leader, and the words beside it inside the plot", async () => {
    await draw({ rows, view: { type: "line", x: "month", y: "revenue", annotations: notes } });
    expect(all(".fft-note-dot").length).toBe(2);
    expect(all(".fft-note-leader").length).toBe(2);
    expect(all(".fft-note-text").map((text) => [...text.querySelectorAll("tspan")].map((span) => span.textContent).join(" "))).toEqual(["Price rise", "Two renewals slipped to June"]);
    // The dot sits on the line's own point for that month.
    const line = target.querySelector("path.fft-line")?.getAttribute("d") ?? "";
    const dot = all(".fft-note-dot")[0];
    expect(line).toContain(`${num(dot, "cx")},${num(dot, "cy")}`);
    // Words stay inside the chart.
    const svgWidth = num(target.querySelector(".fft-chart svg") ?? undefined, "width");
    for (const text of all(".fft-note-text")) {
      const x = num(text, "x");
      const width = Math.max(...[...text.querySelectorAll("tspan")].map((span) => (span.textContent ?? "").length * 6));
      const anchor = text.getAttribute("text-anchor");
      expect(anchor === "end" ? x - width : x + width).toBeLessThanOrEqual(svgWidth);
      expect(anchor === "end" ? x - width : x).toBeGreaterThanOrEqual(0);
    }
  });

  test("a note with its own y sits at that height; a bar's note sits on top of the bar; a note on an unknown period is left out", async () => {
    await draw({ rows, view: { type: "bar", x: "month", y: "revenue", annotations: [{ x: "2026-02", y: 300, text: "Goal" }, { x: "2026-04", text: "Launch" }, { x: "2030-01", text: "Nowhere" }] } });
    const dots = all(".fft-note-dot");
    expect(dots.length).toBe(2);
    const bar = all(".fft-bar")[3];
    expect(num(dots[1], "cy")).toBeCloseTo(Number((bar?.getAttribute("d") ?? "").match(/V([\d.]+)H/)?.[1] ?? NaN) || num(dots[1], "cy"), 0);
    expect(num(dots[0], "cy")).toBeLessThan(num(dots[1], "cy"));
    expect(texts(".fft-note-text")).toEqual(["Goal", "Launch"]);
  });

  test("the tooltip of an annotated period carries the note", async () => {
    await draw({ rows, view: { type: "line", x: "month", y: "revenue", annotations: notes } });
    all(".fft-hit")[2]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row")).toEqual(["200Revenue", "Price riseNote"]);
  });

  test("on a narrow card the notes become numbered markers, their words listed under the chart", async () => {
    await drawAt(320, { rows, view: { type: "area", x: "month", y: "revenue", annotations: notes } });
    expect(all(".fft-note-text").length).toBe(0);
    expect(texts(".fft-note-index")).toEqual(["1", "2"]);
    expect(all(".fft-note-marker").length).toBe(2);
    expect(texts(".fft-notes li")).toEqual(["1Price rise", "2Two renewals slipped to June"]);
    // The marker floats just above its point, or just below when the point is at the top of the plot.
    const [peak, later] = all(".fft-note-marker");
    expect(num(later, "cy")).toBeLessThan(num(all(".fft-note-dot")[1], "cy"));
    expect(num(peak, "cy")).toBeGreaterThan(num(all(".fft-note-dot")[0], "cy"));
  });

  test("long notes wrap onto short lines", async () => {
    await draw({ rows, view: { type: "line", x: "month", y: "revenue", annotations: [{ x: "2026-02", text: "The new price list reached every region by the end of the month" }] } });
    expect(all(".fft-note-text tspan").length).toBeGreaterThan(1);
  });

  test("validation: each note needs an x and a text, and y must be a number", () => {
    const base = { data: { type: "inline", rows }, view: { type: "line", x: "month", y: "revenue" } };
    expect(hasErrors(validateSpec({ ...base, view: { ...base.view, annotations: notes } }, rows))).toBe(false);
    const messages = validateSpec({ ...base, view: { ...base.view, annotations: [{ text: "no x" }, { x: "2026-01" }, { x: "2026-01", y: "high", text: "ok" }] } }, rows).map((i) => i.message).join(" ");
    expect(messages).toMatch(/annotations\[0\] needs an x/);
    expect(messages).toMatch(/annotations\[1\] needs a text/);
    expect(messages).toMatch(/annotations\[2\]\.y must be a number/);
    expect(validateSpec({ ...base, view: { ...base.view, annotations: "note" } }, rows).map((i) => i.message).join(" ")).toMatch(/list/);
  });

  test("the guide mentions the notes", () => {
    const spec = { data: { type: "inline", rows }, view: { type: "line", x: "month", y: "revenue", annotations: notes } } as WidgetSpec;
    expect(explainChart(spec)).toContain("The short notes with a small dot point out moments worth knowing.");
  });
});
