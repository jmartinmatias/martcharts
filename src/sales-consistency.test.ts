/**
 * The Sales dashboard tells one story: its revenue cards show September 2026, whose revenue is the last month of
 * public/data/monthly.json, split by region as public/data/sales.json says. A reader comparing two cards must never
 * find two numbers for the same thing, or the regions in two orders.
 */
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

type Row = Record<string, unknown>;
const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const widget = (id: string) => json(`widgets/${id}.json`);
const rows = (id: string): Row[] => widget(id).data.rows;
const sumBy = (list: Row[], key: string, value: string) => {
  const out = new Map<string, number>();
  for (const row of list) out.set(String(row[key]), (out.get(String(row[key])) ?? 0) + Number(row[value]));
  return out;
};

const monthly: Row[] = json("public/data/monthly.json");
const september = Number(monthly.at(-1)?.revenue);
const byRegion = sumBy(json("public/data/sales.json").data.items, "region", "revenue");
const order = [...byRegion].sort((a, b) => b[1] - a[1]).map(([region]) => region);

test("every region card gives each region the same September revenue, and together they make September's", () => {
  expect([...byRegion.values()].reduce((a, b) => a + b, 0)).toBe(september);
  const scorecard = new Map(rows("region-scorecard").map((r) => [String(r.region), Number(r.revenue)]));
  const yoy = new Map(rows("region-yoy").map((r) => [String(r.region), Number(r.q3_2026)]));
  const mix = sumBy(rows("region-product-mix"), "region", "revenue");
  const trends = new Map(rows("region-trends").filter((r) => r.month === "2026-09").map((r) => [String(r.region), Number(r.revenue)]));
  for (const [region, revenue] of byRegion) {
    expect([region, scorecard.get(region), yoy.get(region), mix.get(region), trends.get(region)]).toEqual([region, revenue, revenue, revenue, revenue]);
  }
});

test("the regions read in one order, by revenue, on every card that lists them", () => {
  for (const id of ["region-scorecard", "region-yoy"]) expect([id, rows(id).map((r) => r.region)]).toEqual([id, order]);
  expect([...new Set(rows("region-product-mix").map((r) => r.region))]).toEqual(order);
});

test("revenue split by source, by product, and the August to September bridge all land on September's revenue", () => {
  expect(rows("revenue-sources").reduce((a, r) => a + Number(r.revenue), 0)).toBe(september);
  expect(rows("product-targets").reduce((a, r) => a + Number(r.revenue), 0)).toBe(september);
  const bridge = rows("revenue-bridge");
  expect(bridge[0]?.amount).toBe(monthly.at(-2)?.revenue);
  expect(bridge.reduce((a, r) => a + Number(r.amount), 0)).toBe(september);
  expect(rows("kpi-scorecard").find((r) => String(r.kpi).startsWith("Revenue"))?.actual).toBe(september);
});

test("each month of the regional trends adds up to that month's revenue", () => {
  const months = sumBy(rows("region-trends"), "month", "revenue");
  for (const [month, total] of months) expect([month, total]).toEqual([month, monthly.find((r) => r.month === month)?.revenue]);
});

test("no revenue card calls a month a quarter, and the headline tile rounds revenue so it matches the chart beside it", () => {
  for (const id of ["revenue-sources", "revenue-bridge", "kpi-scorecard", "revenue-by-region", "region-product-mix", "region-scorecard", "region-targets", "product-targets", "region-yoy"]) {
    const { title, subtitle } = widget(id);
    expect([id, /Q[1-4]/.test(`${title} ${subtitle}`)]).toEqual([id, false]);
  }
  expect(widget("q3-at-a-glance").fields.revenue.format).toMatchObject({ compact: true, decimals: 2 });
});
