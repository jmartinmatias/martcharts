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

test("one target and one cost: the regions' targets and costs add up to September's, so 'target met' and gross profit agree", () => {
  const items: Row[] = json("public/data/sales.json").data.items;
  const total = (field: string) => items.reduce((sum, row) => sum + Number(row[field]), 0);
  const last = monthly.at(-1) as Row;
  expect([total("target"), total("cost")]).toEqual([Number(last.target), Number(last.cost)]);
  const scorecard = new Map(rows("kpi-scorecard").map((r) => [String(r.kpi), r]));
  expect(Number(scorecard.get("Revenue (€)")?.target)).toBe(Number(last.target));
  expect(Number(scorecard.get("Gross margin (%)")?.actual)).toBe(Math.round(((september - Number(last.cost)) / september) * 100));
  // Each region's margin on the scorecard is its own revenue less cost.
  const cost = sumBy(items, "region", "cost");
  for (const r of rows("region-scorecard")) {
    const region = String(r.region);
    const revenue = byRegion.get(region) ?? 0;
    expect([region, r.margin]).toEqual([region, Math.round(((revenue - (cost.get(region) ?? 0)) / revenue) * 100) / 100]);
  }
});

test("a card that a filter can narrow never names a fixed count or 'all regions' in its words, and draws no average over one bar", () => {
  const region = widget("revenue-by-region");
  expect(region.headline.caption).not.toMatch(/all regions/i);
  expect(region.view.reference ?? []).toEqual([]);
  expect(json("widgets/commercial/cc-call-list.json").subtitle).not.toMatch(/\b(ten|10)\b/i);
  expect(json("widgets/commercial/cc-revenue-pareto.json").subtitle).not.toMatch(/\btop \d+/i);
});

test("a share's tile shows no relative change: +13.8% beside 55% would read as points", () => {
  const items = json("widgets/health/health-on-track.json").view.items as Row[];
  expect(items.find((item) => item.value === "onTrack")?.compare).toBeUndefined();
});

test("the cockpit's headline moves differ by segment, and the last month is each client's figure on the client list", () => {
  const activity: Row[] = json("public/data/client-activity.json");
  const months = [...new Set(activity.map((r) => String(r.month)))].sort();
  const [before, now] = months.slice(-2) as [string, string];
  const move = (list: Row[], field: string) => {
    const at = (month: string) => list.filter((r) => r.month === month).reduce((sum, r) => sum + Number(r[field]), 0);
    return Math.round(((at(now) - at(before)) / Math.abs(at(before))) * 1000) / 10;
  };
  for (const field of ["aum", "netNewMoney", "potential"]) {
    const bySegment = new Set(["Private", "Affluent", "Corporate", "Institutional"].map((segment) => move(activity.filter((r) => r.segment === segment), field)));
    expect([field, bySegment.size > 1]).toEqual([field, true]);
  }
  const clients = new Map((json("public/data/clients.json") as Row[]).map((c) => [String(c.name), c]));
  for (const r of activity.filter((row) => row.month === now)) expect([r.client, r.aum]).toEqual([r.client, clients.get(String(r.client))?.aum]);
});
