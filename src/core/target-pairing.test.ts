import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import { createLocalFetch } from "../mcp/store.ts";
import { runPipeline } from "./pipeline.ts";
import { createVariants, profileData } from "./taller.ts";
import type { Variant } from "./taller.ts";
import type { Row, WidgetSpec } from "./types.ts";
import { hasErrors, validateSpec } from "./validate.ts";

const TARGET_NAME = /target|plan|goal|budget|quota/i;

/** Every version across a few seeds. */
const across = (spec: WidgetSpec, rows: Row[], seeds = [1, 2, 3, 4, 5, 6], count = 8) => seeds.flatMap((seed) => createVariants(spec, rows, { seed, count }));

/**
 * Each measure a version reads against a target field, as [measure, target]: bars or lines with a target line, one
 * number, a variance, a bullet or a meter with its target, the tile that carries one, or a share of the target reached.
 */
const pairs = (v: Variant, original: WidgetSpec): [string, string][] => {
  const view = (v.spec.view ?? {}) as Record<string, unknown>;
  const out: [string, string][] = [];
  const first = [view.y].flat()[0];
  for (const line of [view.lines].flat()) if (typeof line === "string" && TARGET_NAME.test(line)) out.push([String(first), line]);
  if (typeof view.target === "string" && typeof view.value === "string") out.push([view.value, view.target]);
  if (view.type === "kpis" && Array.isArray(view.items)) {
    for (const item of view.items as { value?: unknown; target?: unknown }[]) if (typeof item.target === "string") out.push([String(item.value), item.target]);
  }
  const own = JSON.stringify(original.transform ?? []);
  for (const step of v.spec.transform ?? []) {
    const calc = step as { type?: unknown; op?: unknown; left?: unknown; right?: unknown };
    if (calc.type === "calc" && calc.op === "divide" && typeof calc.right === "string" && TARGET_NAME.test(calc.right) && !own.includes(JSON.stringify(step))) out.push([String(calc.left), calc.right]);
  }
  return out;
};

describe("stored widgets pair a target only with its own measure", () => {
  const ids = ["churn-kpi", "new-customers-kpi", "gross-profit", "region-margins", "revenue-vs-target", "revenue-kpi", "q3-at-a-glance"];
  const specs = new Map<string, WidgetSpec>();
  const rowsOf = new Map<string, Row[]>();
  beforeAll(async () => {
    const fetch = createLocalFetch("public");
    for (const id of ids) {
      const spec = JSON.parse(readFileSync(join("widgets", `${id}.json`), "utf8")) as WidgetSpec;
      specs.set(id, spec);
      rowsOf.set(id, await runPipeline(spec, { fetch }));
    }
  });
  const load = (id: string) => [specs.get(id) as WidgetSpec, rowsOf.get(id) ?? []] as const;

  test("a churn percent, a customer count, a profit or a table of revenue never reads against the revenue target or a ratio named for it", () => {
    // Their rows hold revenue's monthly target (or, in the table, a gap as a share of it): another unit or scale, never shown with these measures.
    for (const id of ["churn-kpi", "new-customers-kpi", "gross-profit", "region-margins"]) {
      const [spec, rows] = load(id);
      expect([id, profileData(spec, rows).target]).toEqual([id, undefined]);
      const versions = across(spec, rows);
      expect([id, versions.length > 0]).toEqual([id, true]);
      expect([id, versions.flatMap((v) => pairs(v, spec).map((pair) => `${v.title}: ${pair.join(" against ")}`))]).toEqual([id, []]);
    }
  });

  test("a chart that already pairs revenue with its target keeps target versions, even when the target field has no format", () => {
    for (const id of ["revenue-vs-target", "revenue-kpi", "q3-at-a-glance"]) {
      const [spec, rows] = load(id);
      const data = profileData(spec, rows);
      expect([id, data.measures[0], data.target]).toEqual([id, "revenue", "target"]);
      const found = across(spec, rows).flatMap((v) => pairs(v, spec));
      expect([id, found.length > 0]).toEqual([id, true]);
      expect([id, [...new Set(found.map((pair) => pair.join(" against ")))]]).toEqual([id, ["revenue against target"]]);
    }
  });
});

describe("profileData reads the target only for the measure it belongs to", () => {
  const months = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);
  const rows: Row[] = months.map((month, i) => ({ month, newCustomers: 40 + i, revenue: 900000 + i * 10000, target: 950000 }));
  const euros = { type: "currency", currency: "EUR" } as const;

  test("a target in another format, or unformatted and of another size, is no target for the first measure", () => {
    const counted: WidgetSpec = { data: { type: "inline", rows }, view: { type: "line", x: "month", y: "newCustomers" } };
    const formatted: WidgetSpec = { ...counted, fields: { newCustomers: { format: "number" }, target: { format: euros } } };
    expect([profileData(counted, rows).target, profileData(formatted, rows).target]).toEqual([undefined, undefined]);
  });

  test("a target in the first measure's format, or unformatted and of a similar size, is its target", () => {
    const plain: WidgetSpec = { data: { type: "inline", rows }, view: { type: "line", x: "month", y: "revenue" } };
    const formatted: WidgetSpec = { ...plain, fields: { revenue: { format: euros }, target: { format: euros } } };
    expect([profileData(plain, rows).target, profileData(formatted, rows).target]).toEqual(["target", "target"]);
  });

  test("the target the chart itself pairs with its measure is kept, whatever its format", () => {
    const fields: WidgetSpec["fields"] = { revenue: { format: euros } };
    const kpi: WidgetSpec = { data: { type: "inline", rows }, fields, view: { type: "kpi", value: "revenue", x: "month", series: true, target: "target" } };
    const bars: WidgetSpec = { data: { type: "inline", rows }, fields, view: { type: "bar", x: "month", y: "revenue", lines: "target" } };
    expect([profileData(kpi, rows).target, profileData(bars, rows).target]).toEqual(["target", "target"]);
  });
});

describe("a row of numbers pairs the target with the tile that carries it", () => {
  const months = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);
  /** Orders come first in each row, but the target is revenue's: all three unformatted and of a similar size. */
  const sales: Row[] = months.map((month, i) => ({ month, orders: 400 + i * 5, revenue: 900 + i * 10, target: 950 }));
  /** Invoices come first in each row, but the budget is cost's, where lower is better. */
  const costs: Row[] = months.map((month, i) => ({ month, invoices: 120 + i * 3, cost: 48000 + ((i * 1700) % 6000), budget: 50000 }));
  const euros = { type: "currency", currency: "EUR" } as const;

  test("the targeted tile's value leads the measures, wherever it sits in the rows or the tiles", () => {
    for (const items of [
      [{ value: "revenue", target: "target" }, { value: "orders" }],
      [{ value: "orders" }, { value: "revenue", target: "target" }],
    ]) {
      const spec: WidgetSpec = { data: { type: "inline", rows: sales }, view: { type: "kpis", series: true, items } };
      const data = profileData(spec, sales);
      expect([data.measures[0], data.target]).toEqual(["revenue", "target"]);
      const found = across(spec, sales).flatMap((v) => pairs(v, spec));
      expect(found.length).toBeGreaterThan(0);
      expect([...new Set(found.map((pair) => pair.join(" against ")))]).toEqual(["revenue against target"]);
    }
  });

  test("its target and its lower is better travel together to that tile's measure", () => {
    const spec: WidgetSpec = {
      data: { type: "inline", rows: costs },
      fields: { invoices: { format: "number" }, cost: { format: euros }, budget: { format: euros } },
      view: { type: "kpis", series: true, items: [{ value: "invoices" }, { value: "cost", target: "budget", goodWhen: "down" }] },
    };
    const data = profileData(spec, costs);
    expect([data.measures[0], data.target, data.goodWhen]).toEqual(["cost", "budget", "down"]);
    const versions = across(spec, costs);
    const found = versions.flatMap((v) => pairs(v, spec));
    expect(found.length).toBeGreaterThan(0);
    expect([...new Set(found.map((pair) => pair.join(" against ")))]).toEqual(["cost against budget"]);
    for (const v of versions) expect([v.title, hasErrors(validateSpec(v.spec, costs))]).toEqual([v.title, false]);
  });
});
