// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import type { WidgetSpec } from "../../core/types.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

/** The gallery's monthly status trend (W-CAV4): seven clients over six months. */
const spec = JSON.parse(readFileSync("widgets/rag-status-trend.json", "utf8")) as WidgetSpec;

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
  document.body.innerHTML = "";
});

async function drawAt(width: number) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
  const target = document.createElement("div");
  document.body.append(target);
  await createWidget(target, spec).ready;
  const table = target.querySelector(".fft-ragtrend-table") as HTMLTableElement;
  const cols = [...table.querySelectorAll("col")].map((col) => parseFloat(col.style.width));
  return { target, table, cols, periods: cols.slice(1, -1), tableWidth: parseFloat(table.style.width) };
}

describe("ragtrend on a phone", () => {
  test.each([320, 343, 390, 480, 900])("at %ipx every monthly cell is the same width, and the table fits the card", async (width) => {
    const { periods, tableWidth, target } = await drawAt(width);
    expect(periods).toHaveLength(6);
    expect(new Set(periods).size).toBe(1);
    expect(periods[0]).toBeGreaterThanOrEqual(21);
    expect(tableWidth).toBeLessThanOrEqual(width);
    // Every mark is the same size too.
    const sizes = [...target.querySelectorAll(".fft-ragtrend-cell .fft-rag-glyph")].map((g) => g.getAttribute("width"));
    expect(new Set(sizes).size).toBe(1);
  });

  test("the table is laid out by its columns, not its content: headings never widen a column", async () => {
    const { table } = await drawAt(343);
    expect(table.querySelectorAll("col").length).toBe(8);
    for (const th of table.querySelectorAll(".fft-ragtrend-period")) expect(th.querySelector(".fft-ragtrend-period-text") ?? th.childElementCount === 1).toBeTruthy();
  });

  test("names stay on one line with the full name in the title, and the current status shrinks to its shape on a narrow card", async () => {
    const { target, table } = await drawAt(343);
    const names = [...target.querySelectorAll(".fft-ragtrend-name")] as HTMLElement[];
    expect(names.every((n) => n.title === n.textContent)).toBe(true);
    expect(table.hasAttribute("data-narrow")).toBe(true);
    expect(target.querySelectorAll(".fft-ragtrend-end .fft-rag-pill[data-compact]").length).toBe(names.length);
    const wide = await drawAt(900);
    expect(wide.table.hasAttribute("data-narrow")).toBe(false);
  });
});
