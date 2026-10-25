// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { validateSpec } from "../../core/validate.ts";
import { createWidget } from "../widget.ts";
import { unitStep } from "./strips.ts";
import "./index.ts";

/**
 * Scale: what 5,000 rows cost each view that used to draw one node or more per row, and the guardrails that keep a
 * huge number from asking for a huge drawing. Budgets are generous (jsdom on a busy machine); the node counts are the
 * real check, since they do not depend on the machine.
 */
afterEach(() => {
  document.body.innerHTML = "";
});

async function drawTimed(spec: Omit<WidgetSpec, "data"> & { rows: Row[] }) {
  const { rows, ...rest } = spec;
  const target = document.createElement("div");
  document.body.append(target);
  const start = performance.now();
  await createWidget(target, { locale: "en-US", data: { type: "inline", rows }, ...rest } as WidgetSpec).ready;
  const ms = performance.now() - start;
  return { target, ms, nodes: target.querySelectorAll("*").length, state: target.querySelector(".fft-widget")?.getAttribute("data-state") };
}

const warnings = (spec: WidgetSpec, rows: Row[]) => validateSpec(spec, rows).filter((issue) => issue.level === "warning").map((issue) => issue.message);
const many = (n: number, make: (i: number) => Row) => Array.from({ length: n }, (_, i) => make(i));
/** A small, fixed pseudo-random sequence, so every run draws the same dots. */
const noise = (i: number) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;

describe("strips never ask for more squares than a chart can hold", () => {
  test("the unit step grows by 1, 2, 2.5 and 5 times powers of ten, to any size", () => {
    expect(unitStep(50, 60)).toBe(1);
    expect(unitStep(412, 60)).toBe(10);
    expect(unitStep(1e12, 60)).toBe(2e10);
    expect(Math.ceil(1e12 / unitStep(1e12, 60))).toBeLessThanOrEqual(60);
    expect(unitStep(Number.MAX_SAFE_INTEGER, 10)).toBeGreaterThan(0);
  });

  test("a count of 1e12 draws quickly, in under 2,500 nodes, and says what one square stands for", async () => {
    const rows = [
      { name: "Huge", mandatory: 6e11, optional: 4e11 },
      { name: "Small", mandatory: 30, optional: 12 },
    ];
    const { ms, nodes, target, state } = await drawTimed({ rows, view: { type: "strips", label: "name", value: ["mandatory", "optional"] } });
    expect(state).toBe("ready");
    expect(nodes).toBeLessThan(2500);
    expect(ms).toBeLessThan(1500);
    expect(target.querySelector(".fft-strips-note")?.textContent).toMatch(/square/i);
    expect(target.textContent).not.toMatch(/NaN|Infinity|undefined/);
  });

  test("twenty rows of large counts stay under about 2,000 squares in all", async () => {
    const rows = many(20, (i) => ({ name: `Rule ${i}`, mandatory: 900 + i * 37, optional: 300 }));
    const { target } = await drawTimed({ rows, view: { type: "strips", label: "name", value: ["mandatory", "optional"] } });
    expect(target.querySelectorAll(".fft-strip-sq").length).toBeLessThanOrEqual(2100);
  });
});

describe("volume warnings say what to do instead", () => {
  test("a table over 200 rows without pages", () => {
    const rows = many(300, (i) => ({ client: `C${i}`, revenue: i }));
    expect(warnings({ data: { type: "inline", rows }, view: { type: "table" } } as WidgetSpec, rows).join(" ")).toMatch(/300 rows.*Show more.*pageSize.*limit.*aggregate/);
    expect(warnings({ data: { type: "inline", rows }, view: { type: "table", pageSize: 25 } } as WidgetSpec, rows).join(" ")).not.toMatch(/rows make a long table/);
  });

  test.each(["bar", "hbar"])("%s over 50 categories without limit", (type) => {
    const rows = many(60, (i) => ({ product: `P${i}`, revenue: i }));
    const view = type === "bar" ? { type, x: "product", y: "revenue" } : { type, label: "product", value: "revenue" };
    expect(warnings({ data: { type: "inline", rows }, view } as WidgetSpec, rows).join(" ")).toMatch(/60 categories.*limit.*aggregate/);
    expect(warnings({ data: { type: "inline", rows }, view: { ...view, limit: 10 } } as WidgetSpec, rows).join(" ")).not.toMatch(/categories make thin bars/);
  });

  test("a scatter over 2,000 points", () => {
    const rows = many(2500, (i) => ({ x: i, y: noise(i) }));
    expect(warnings({ data: { type: "inline", rows }, view: { type: "scatter", x: "x", y: "y" } } as WidgetSpec, rows).join(" ")).toMatch(/2,500 points.*aggregate.*bin.*limit/);
  });

  test("a heatmap over 1,500 cells", () => {
    const rows = many(2000, (i) => ({ day: `D${i % 100}`, hour: `H${Math.floor(i / 100)}`, n: i }));
    expect(warnings({ data: { type: "inline", rows }, view: { type: "heatmap", x: "day", y: "hour", value: "n" } } as WidgetSpec, rows).join(" ")).toMatch(/2,000 cells.*aggregate.*bin/);
  });

  test("a line over 1,000 points a series", () => {
    const rows = many(1200, (i) => ({ t: `2026-01-01T${String(i).padStart(5, "0")}`, v: i }));
    expect(warnings({ data: { type: "inline", rows }, view: { type: "line", x: "t", y: "v" } } as WidgetSpec, rows).join(" ")).toMatch(/1,200 points.*aggregate.*limit/);
  });
});

describe("a long table shows its first 100 rows and a Show more button", () => {
  const rows = many(5000, (i) => ({ client: `Client ${String(i).padStart(4, "0")}`, revenue: 5000 - i }));

  test("5,000 rows: 100 shown, the rest a click away, quickly", async () => {
    const { target, ms, nodes } = await drawTimed({ rows, view: { type: "table", search: true } });
    expect(target.querySelectorAll("tbody tr").length).toBe(100);
    const button = target.querySelector(".fft-table-more-button") as HTMLButtonElement;
    expect(button.textContent).toBe("Show 100 more");
    expect(target.querySelector(".fft-table-more-note")?.textContent).toBe("100 of 5,000 rows shown");
    expect(ms).toBeLessThan(3000);
    expect(nodes).toBeLessThan(2000);
    button.click();
    expect(target.querySelectorAll("tbody tr").length).toBe(200);
    // Searching starts over from the first 100 of what matches.
    const input = target.querySelector(".fft-table-search") as HTMLInputElement;
    input.value = "Client 1";
    input.dispatchEvent(new Event("input"));
    expect(target.querySelectorAll("tbody tr").length).toBe(100);
    expect(target.querySelector(".fft-table-more-note")?.textContent).toBe("100 of 1,000 rows shown");
  });

  test("pages, showAll and short tables have no Show more", async () => {
    const paged = await drawTimed({ rows, view: { type: "table", pageSize: 25 } });
    expect([paged.target.querySelectorAll("tbody tr").length, paged.target.querySelector(".fft-table-more")]).toEqual([25, null]);
    const all = await drawTimed({ rows: rows.slice(0, 300), view: { type: "table", showAll: true } });
    expect(all.target.querySelectorAll("tbody tr").length).toBe(300);
    const short = await drawTimed({ rows: rows.slice(0, 40), view: { type: "table" } });
    expect((short.target.querySelector(".fft-table-more") as HTMLElement).hidden).toBe(true);
  });

  test("Show more speaks French on a French page", async () => {
    const { target } = await drawTimed({ locale: "fr-FR", rows: rows.slice(0, 250), view: { type: "table" } } as never);
    expect(target.querySelector(".fft-table-more-button")?.textContent).toBe("Afficher 100 de plus");
  });
});

describe("a scatter of thousands of dots draws dense", () => {
  const rows = many(5000, (i) => ({ name: `Deal ${i}`, size: Math.round(noise(i) * 1000), days: Math.round(noise(i + 7) * 90), region: ["East", "West", "North"][i % 3] }));

  test("5,000 dots: one path per color, a single hit layer, fewer than 12,000 nodes", async () => {
    const { target, ms, nodes } = await drawTimed({ rows, view: { type: "scatter", x: "size", y: "days", label: "name", color: "region" } });
    expect(target.querySelectorAll(".fft-point-dense").length).toBe(3);
    expect(target.querySelectorAll(".fft-point-hit").length).toBe(0);
    expect(target.querySelectorAll(".fft-point-layer").length).toBe(1);
    expect(nodes).toBeLessThan(12000);
    expect(ms).toBeLessThan(5000);
  });

  test("the keyboard walks the dots, the tooltip follows, and Enter picks one", async () => {
    const { target } = await drawTimed({ rows, view: { type: "scatter", x: "size", y: "days", label: "name" } });
    const picked: Row[] = [];
    target.addEventListener("fft-select", (event) => picked.push((event as CustomEvent).detail.row));
    const layer = target.querySelector(".fft-point-layer") as SVGElement;
    expect(layer.getAttribute("aria-label")).toMatch(/5,000 dots/);
    layer.dispatchEvent(new Event("focus"));
    const first = target.querySelector(".fft-tooltip-title")?.textContent;
    layer.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    const second = target.querySelector(".fft-tooltip-title")?.textContent;
    expect(first).toMatch(/^Deal \d+$/);
    expect(second).not.toBe(first);
    layer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(picked).toHaveLength(1);
    expect(String(picked[0]?.name)).toBe(second);
  });

  test("a few hundred dots still draw one circle and one hit area each", async () => {
    const { target } = await drawTimed({ rows: rows.slice(0, 300), view: { type: "scatter", x: "size", y: "days" } });
    expect(target.querySelectorAll(".fft-point-hit").length).toBe(300);
  });
});

describe("a heatmap of thousands of cells draws dense", () => {
  const rows = many(5000, (i) => ({ day: `Day ${String(i % 100).padStart(3, "0")}`, hour: `Slot ${String(Math.floor(i / 100)).padStart(2, "0")}`, orders: Math.round(noise(i) * 500) }));

  test("5,000 cells: one path per shade and a single hit layer", async () => {
    const { target, ms, nodes } = await drawTimed({ rows, view: { type: "heatmap", x: "day", y: "hour", value: "orders" } });
    expect(target.querySelectorAll(".fft-heat-step").length).toBeLessThanOrEqual(7);
    expect(target.querySelectorAll(".fft-cell").length).toBe(0);
    expect(nodes).toBeLessThan(2500);
    expect(ms).toBeLessThan(3000);
  });

  test("the arrow keys move across and down and Enter picks the cell", async () => {
    const { target } = await drawTimed({ rows, view: { type: "heatmap", x: "day", y: "hour", value: "orders" } });
    const picked: Row[] = [];
    target.addEventListener("fft-select", (event) => picked.push((event as CustomEvent).detail.row));
    const layer = target.querySelector(".fft-heat-layer") as SVGElement;
    layer.dispatchEvent(new Event("focus"));
    expect(target.querySelector(".fft-tooltip-title")?.textContent).toBe("Slot 00, Day 000");
    layer.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    layer.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(target.querySelector(".fft-tooltip-title")?.textContent).toBe("Slot 01, Day 001");
    layer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect([picked[0]?.hour, picked[0]?.day]).toEqual(["Slot 01", "Day 001"]);
  });

  test("a small heatmap keeps its boxes, numbers inside", async () => {
    const { target } = await drawTimed({ rows: rows.slice(0, 200), view: { type: "heatmap", x: "day", y: "hour", value: "orders" } });
    expect(target.querySelectorAll(".fft-cell").length).toBe(200);
  });
});
