import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { DashboardSpec } from "../core/dashboard.ts";
import { runPipeline } from "../core/pipeline.ts";
import { getBlock } from "../core/registry.ts";
import type { Row, WidgetSpec } from "../core/types.ts";
import { validateSpec } from "../core/validate.ts";
import { createLocalFetch } from "../mcp/store.ts";

/**
 * The domain dashboards' numbers agree across cards, and their filters reach the cards. Every figure is worked out
 * twice: once from the raw data files, once through the cards' own pipelines, exactly as the page draws them.
 */
const fetch = createLocalFetch("public");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(`${dir}/${f}`).isDirectory() ? walk(`${dir}/${f}`) : f.endsWith(".json") ? [`${dir}/${f}`] : []));
const widgets: Record<string, WidgetSpec> = {};
for (const file of walk("widgets")) {
  const spec = JSON.parse(readFileSync(file, "utf8")) as WidgetSpec;
  if (spec.id) widgets[spec.id] = spec;
}
const data = <T = Row>(name: string) => JSON.parse(readFileSync(`public/data/${name}`, "utf8")) as T[];
const board = (id: string) => JSON.parse(readFileSync(`dashboards/${id}.json`, "utf8")) as DashboardSpec;
const card = (id: string) => runPipeline(widgets[id] as WidgetSpec, { fetch });
const sum = (rows: Row[], field: string) => rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
const last = <T>(list: T[]) => list[list.length - 1] as T;
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1);

describe("commercial cockpit: the numbers agree", () => {
  const clients = data("clients.json");
  const book = sum(clients, "revenue");

  test("revenue year to date is one figure: the headline, the products, the bridge's end and the bankers' books", async () => {
    const headline = last(await card("cc-headline-kpis"));
    const products = sum(await card("cc-product-revenue"), "revenue");
    const bridge = sum(await card("cc-revenue-bridge"), "amount");
    const books = sum(await card("cc-rm-books"), "revenue");
    for (const figure of [Number(headline.revenueYtd), products, bridge, books]) near(figure, book);
    // January to October of each client's monthly revenue is its year to date.
    near(sum(data("client-activity.json").filter((r) => String(r.month).startsWith("2026")), "revenue"), book);
  });

  // The twelve-month revenue-and-trades chart left the board (noise plan: four revenue cards at most), and its test with it.

  test("assets under management are summed from the clients, on the headline, the map and the books", async () => {
    const aum = sum(clients, "aum");
    near(Number(last(await card("cc-headline-kpis")).aum), aum);
    near(sum(await card("cc-aum-by-country"), "aum"), aum);
    near(sum(await card("cc-rm-books"), "aum"), aum);
  });

  test("cross-sell potential is one figure on the headline, the cross-sell map and the call list's clients", async () => {
    const potential = sum(data("holdings.json").filter((h) => h.state === "Opportunity"), "potential");
    near(Number(last(await card("cc-headline-kpis")).potential), potential);
    near(sum((await card("cc-whitespace")).filter((r) => r.state === "Opportunity"), "potential"), potential);
    near(sum(clients, "crossSellPotential"), potential);
  });

  test("the pipeline cards add up to the deals, and new money to the monthly activity", async () => {
    const deals = data("deals.json");
    const open = deals.filter((d) => d.open === 1);
    near(sum(await card("cc-pipeline-target"), "weighted"), sum(open, "weighted"));
    // The close-month bar left the board (noise plan: one pipeline view by banker, not two).
    const rates = await card("cc-win-rate");
    const books = data("pipeline-by-book.json");
    expect(sum(books, "won")).toBe(deals.filter((d) => d.stage === "Won").length);
    expect(sum(books, "decided")).toBe(deals.filter((d) => d.stage === "Won" || d.stage === "Lost").length);
    // The win-rate target is 35% for every banker, whatever the filter, because it is kept as a count of deals.
    for (const row of rates) near(Number(row.winRateTarget) * 1000, 350);
    near(sum(await card("cc-new-money-target"), "newMoney"), sum(data("client-activity.json").filter((r) => String(r.month).startsWith("2026")), "netNewMoney"));
    // The funnel counts every deal at qualified, and the won ones at the end.
    const funnel = Object.fromEntries((await card("cc-deal-funnel")).map((r) => [r.stage, r.deals]));
    expect([funnel.Qualified, funnel.Won]).toEqual([deals.length, deals.filter((d) => d.stage === "Won").length]);
  });

  test("the call list is the ten clients with the highest call score, each with a reason and a next step", async () => {
    const list = await card("cc-call-list");
    const expected = [...clients].sort((a, b) => Number(b.callScore) - Number(a.callScore)).slice(0, 10);
    expect(list.map((r) => r.name)).toEqual(expected.map((r) => r.name));
    for (const row of list) expect([row.name, Boolean(row.callReason), Boolean(row.nextAction)]).toEqual([row.name, true, true]);
  });

  test("anomalies this month are counted once, by the tracker; the headline leaves them to it", async () => {
    // The anomaly watch tiles left the board (noise plan: they repeated the tracker and showed zeros).
    const daily = data("metrics-daily.json");
    const month = String(last(daily.map((r) => String(r.date)).sort())).slice(0, 7);
    const flagged = daily.filter((r) => r.flag === true && String(r.date).startsWith(month)).length;
    expect((await card("cc-anomaly-tracker")).filter((r) => r.flag === true && String(r.date).startsWith(month)).length).toBe(flagged);
    const items = (widgets["cc-headline-kpis"]?.view.items ?? []) as { value: string }[];
    expect(items.map((item) => item.value)).not.toContain("anomalies");
  });

  test("fees, campaigns and paths add up to the files they replace", async () => {
    near(sum(await card("cc-fees-variance"), "fees"), sum(clients, "fees"));
    const campaigns = data("campaigns.json");
    near(sum(await card("cc-campaign-return"), "revenue"), sum(campaigns, "revenue"));
    const funnel = await card("cc-campaign-funnel");
    expect(funnel.map((r) => r.stage)).toEqual(["Targeted", "Contacted", "Responded", "Converted"]);
    expect(Number(funnel[0]?.clients)).toBe(sum(campaigns, "targeted"));
    expect((await card("cc-cross-sell-paths")).map((r) => [r.from, r.to, r.clients])).toEqual(data("cross-sell-paths.json").map((r) => [r.from, r.to, r.clients]));
  });
});

describe("regulatory landscape: the numbers agree, or say why they differ", () => {
  const rules = data("regulations.json");
  const TODAY = "2026-10-25";

  test("rules in force: the KPI counts status today", async () => {
    // The stage funnel left the board (noise plan: the lifecycle shows the same stages), so there is no second count to reconcile.
    const kpi = Number((await card("reg-in-force-kpi"))[0]?.count);
    expect(kpi).toBe(rules.filter((r) => ["In force", "Applies"].includes(String(r.status))).length);
    expect(TODAY).toBe("2026-10-25");
  });

  test("the split series add back up to the landscape's own", async () => {
    const pressure = data("regulatory-pressure.json").filter((r) => r.forecast === false);
    expect((await card("reg-consultations-kpi")).map((r) => [r.month, r.consultationsOpen])).toEqual(pressure.map((r) => [r.month, r.consultationsOpen]));
    expect((await card("reg-obligations-dual")).map((r) => [r.month, r.newObligations, r.pressureIndex])).toEqual(pressure.map((r) => [r.month, r.newObligations, r.pressureIndex]));
    const activity = data("regulatory-activity.json");
    near(sum(await card("reg-pressure-matrix"), "obligations"), sum(activity, "obligations"));
  });

  test("the next 90 days: the list shows every deadline, each with an owner and its readiness", async () => {
    // The deadlines tile left the board (noise plan: the 90-day calendar is shown once, as the list).
    const list = await card("reg-next-90");
    const due = data("regulatory-deadlines.json").filter((d) => Number(d.daysLeft) >= 0 && Number(d.daysLeft) <= 90);
    expect(list.map((r) => r.date)).toEqual([...list.map((r) => r.date)].sort());
    expect(list).toHaveLength(due.length);
    for (const row of list) expect([row.regulation, Boolean(row.owner), ["Done", "In progress", "Not started"].includes(String(row.readiness))]).toEqual([row.regulation, true, true]);
    // Every deadline belongs to a tracked rule, on its own topic and jurisdiction.
    for (const row of due) expect([row.regulation, rules.find((r) => r.id === row.id)?.topic]).toEqual([row.regulation, row.topic]);
  });

  test("the country map and the stakeholder matrix count the tracked rules", async () => {
    const eu = rules.filter((r) => r.jurisdiction === "EU").length;
    const map = Object.fromEntries((await card("reg-rules-by-country")).map((r) => [r.country, r.regulations]));
    for (const country of ["FR", "DE", "LU", "IT"]) expect(map[country]).toBe(eu);
    expect(map.GB).toBe(19 + rules.filter((r) => r.jurisdiction === "GB").length);
    // The stakeholder sankey left the board (noise plan: one "who must comply" card).
    expect(new Set((await card("reg-stakeholder-matrix")).map((r) => r.regulation)).size).toBe(15);
  });
});

describe("client health: the counts agree", () => {
  const health = data("client-health.json");
  const count = (status: string) => health.filter((r) => r.overallRag === status).length;

  test("the overview and the reds count the same clients", async () => {
    // The bankers' books and the moves sankey left the board (noise plan: the reds heatmap and the quarter trail say it).
    const quarter = last(await card("health-on-track"));
    expect([quarter.Red, quarter.Amber, quarter.Green]).toEqual([count("R"), count("A"), count("G")]);
    const reds = await card("health-reds");
    const perspectives = ["clientSuccess", "bizDev", "coverage", "relationship"];
    expect(sum(reds, "red")).toBe(perspectives.reduce((total, p) => total + health.filter((r) => r[`${p}Rag`] === "R").length, 0));
  });

  test("the scorecards show only the clients off track or at risk, and say so", async () => {
    for (const p of ["clientSuccess", "bizDev", "coverage", "relationship"]) {
      // Every client stays in the data, so the summary counts the whole book; the scorecard lists the reds and ambers
      // and folds the rest into "and 33 on track".
      const rows = await card(`health-${p}-board`);
      expect([p, rows.length]).toEqual([p, health.length]);
      expect(widgets[`health-${p}-board`]?.view.only).toEqual(["R", "A"]);
      expect(widgets[`health-${p}-board`]?.subtitle).toMatch(/^Off track or at risk, worst first/);
    }
  });
});

describe("filters reach the cards", () => {
  /** A filter scopes a card when the card's raw rows carry its field, as the dashboard decides. */
  async function reach(id: string) {
    const spec = board(id);
    const ids = spec.widgets.flatMap((cell) => (cell.widget ? [cell.widget] : []));
    const fields = new Map<string, Set<string>>();
    for (const wid of ids) {
      const w = widgets[wid] as WidgetSpec;
      const rows = (await getBlock("source", w.data.type).load(w.data, { fetch })) as Row[];
      fields.set(wid, new Set(rows.flatMap((row) => Object.keys(row))));
    }
    return (spec.filters ?? []).map((filter) => ({ field: filter.field, total: ids.length, missed: ids.filter((wid) => !fields.get(wid)?.has(filter.field)) }));
  }

  // The cards no filter can reach, and why: each holds firm-wide or reference data with no client, segment or rule in it.
  const EXEMPT: Record<string, string[]> = {
    // Digital adoption cohorts, the model allocation and the daily anomaly metrics are firm-wide.
    "commercial-cockpit": ["cc-adoption-cohorts", "cc-adoption-curves", "cc-allocation-drift", "cc-allocation-bands", "cc-anomaly-tracker", "cc-complaints-calendar"],
    // Every card carries topic and jurisdiction: the pressure index now rides on the obligations card, which does.
    "regulatory-landscape": [],
    // The thresholds and the roll-up rules are reference tables.
    "client-health": ["health-thresholds", "health-rollups"],
  };

  test.each(Object.keys(EXEMPT))("%s: every filter reaches at least 75% of the cards, and misses only the listed ones", async (id) => {
    for (const { field, total, missed } of await reach(id)) {
      expect([field, [...missed].sort()]).toEqual([field, [...(EXEMPT[id] as string[])].sort()]);
      expect((total - missed.length) / total).toBeGreaterThanOrEqual(0.75);
    }
  });

  test.each(Object.keys(EXEMPT))("%s: every card validates against its own rows with no warning, and none is empty", async (id) => {
    for (const cell of board(id).widgets) {
      if (!cell.widget) continue;
      const spec = widgets[cell.widget] as WidgetSpec;
      const rows = await runPipeline(spec, { fetch });
      expect([cell.widget, rows.length > 0, validateSpec(spec, rows)]).toEqual([cell.widget, true, []]);
    }
  });
});
