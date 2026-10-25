// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

/**
 * Hostile data, every chart: each catalog example drawn eight ways its rows can go wrong in real life. None may throw,
 * show an error, or print NaN, Infinity or undefined. A huge count once ran strips out of memory.
 */
const FILES = readdirSync("catalog").filter((file) => file.endsWith(".json")).sort();
const specOf = (file: string) => JSON.parse(readFileSync(`catalog/${file}`, "utf8")) as WidgetSpec;

const isDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}/.test(value);
const mapNumbers = (rows: Row[], fn: (n: number, i: number) => unknown) => rows.map((row, i) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "number" ? fn(v, i) : v])));

/** The eight ways: missing numbers, negatives, huge numbers, very long names, many rows, one row, all equal, dates out of order. */
const SHAPES: Record<string, (rows: Row[]) => Row[]> = {
  missing: (rows) => mapNumbers(rows, (n, i) => (i % 2 ? null : n)),
  negative: (rows) => mapNumbers(rows, (n) => -Math.abs(n)),
  huge: (rows) => mapNumbers(rows, (n) => n * 1e12),
  longLabels: (rows) => rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "string" && !isDate(v) ? `${v} ${"with a much longer name than anyone planned for".repeat(2)}`.slice(0, 80) : v]))),
  many: (rows) => Array.from({ length: 500 }, (_, i) => rows[i % rows.length] as Row).map((row, i) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "number" ? v + (i % 7) : v]))),
  one: (rows) => rows.slice(0, 1),
  equal: (rows) => mapNumbers(rows, () => 7),
  reversed: (rows) => [...rows].reverse(),
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("every chart survives hostile data", () => {
  test.each(FILES)("%s, drawn eight ways", async (file) => {
    const spec = specOf(file);
    const base = spec.data.rows as Row[];
    for (const [shape, make] of Object.entries(SHAPES)) {
      const target = document.createElement("div");
      document.body.append(target);
      const widget = createWidget(target, { ...spec, data: { type: "inline", rows: make(base) } } as WidgetSpec);
      await widget.ready;
      const card = target.querySelector(".fft-widget");
      const state = card?.getAttribute("data-state");
      const body = target.querySelector(".fft-body")?.textContent ?? "";
      expect([file, shape, state === "ready" || state === "empty"]).toEqual([file, shape, true]);
      expect([file, shape, /\bNaN\b|Infinity|undefined/.test(body)]).toEqual([file, shape, false]);
      widget.destroy();
      target.remove();
    }
  });
});
