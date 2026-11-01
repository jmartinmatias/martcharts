/**
 * The board's lede: figures read against their targets and past values, signed by which side is good, then counted,
 * with the best and the worst named.
 */
import { describe, expect, test } from "vitest";
import { ledeOf, readingsOf } from "./lede.ts";
import type { LedeCard } from "./lede.ts";
import { validateDashboard } from "./dashboard.ts";
import type { WidgetSpec } from "./types.ts";

const card = (key: string, spec: Partial<WidgetSpec>, rows: Record<string, unknown>[]): LedeCard => ({ key, spec: { data: { type: "inline", rows }, ...spec } as WidgetSpec, rows });

const meter = card("region-targets", { title: "Target attainment", view: { type: "meter", label: "region", value: "revenue", target: "target", compare: "august" } }, [
  { region: "East", revenue: 110, target: 100, august: 100 },
  { region: "West", revenue: 80, target: 100, august: 90 },
]);
const costs = card("opex", { title: "Costs against budget", view: { type: "variance", label: "dept", value: "actual", target: "budget", goodWhen: "down" } }, [
  { dept: "Sales", actual: 120, budget: 100 },
  { dept: "IT", actual: 90, budget: 100 },
]);

describe("readingsOf", () => {
  test("a meter reads each row against its target and its ghost, in the card's words", () => {
    const said = readingsOf(meter).map((r) => `${r.subject}: ${r.said}`);
    expect(said).toEqual(["East: 10% above target", "East: up 10% since August", "West: 20% below target", "West: down 11.1% since August"]);
  });

  test("goodWhen down turns over budget into the bad side, and names the line the card draws", () => {
    const [sales, it] = readingsOf(costs);
    expect(sales).toMatchObject({ subject: "Sales", said: "20% above budget" });
    expect(sales?.score).toBeCloseTo(-0.2);
    expect(it?.score).toBeCloseTo(0.1);
  });

  test("a KPI row over time compares the last month with the one before, by its date", () => {
    const kpis = card("glance", { title: "At a glance", view: { type: "kpis", series: true, items: [{ value: "churn", goodWhen: "down" }] } }, [
      { month: "2026-08", churn: 50 },
      { month: "2026-09", churn: 40 },
    ]);
    const [churn] = readingsOf(kpis);
    expect(churn?.said).toMatch(/^down 20% since Aug/);
    expect(churn?.score).toBeCloseTo(0.2);
  });

  test("a forecast reads its chance of reaching plan against even odds", () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ revenue: i }));
    const [odds] = readingsOf(card("q4", { title: "Q4 outcomes", view: { type: "outcomes", value: "revenue", target: 75, targetLabel: "plan" } }, rows));
    expect(odds).toMatchObject({ subject: "Q4 outcomes", said: "5 of 20 outcomes reach plan" });
    expect(odds?.score).toBeCloseTo(-0.25);
  });

  test("a card with nothing to be read against gives nothing: a ranking is not a judgment", () => {
    expect(readingsOf(card("rank", { view: { type: "bar", x: "region", y: "revenue" } }, [{ region: "East", revenue: 3 }]))).toEqual([]);
  });

  test("speaks French and German", () => {
    const fr = readingsOf({ ...meter, spec: { ...meter.spec, locale: "fr-FR" } });
    expect(fr[0]?.said).toMatch(/au-dessus de l'objectif$/);
    const de = readingsOf({ ...meter, spec: { ...meter.spec, locale: "de-DE" } });
    expect(de[2]?.said).toMatch(/unter dem Ziel$/);
    expect(de[1]?.said).toMatch(/seit August$/);
  });
});

describe("ledeOf", () => {
  test("counts the figures on course and names the worst, and the best from another card", () => {
    const lede = ledeOf([meter, costs]);
    expect(lede).toMatchObject({ onCourse: 3, of: 6 });
    // West's 20% short ties Sales' 20% over budget: the first card keeps it.
    expect(lede?.bad).toMatchObject({ key: "region-targets", subject: "West", said: "20% below target" });
    // East's 10% over target ties IT's 10% under budget; the best comes from the other card than the worst.
    expect(lede?.good).toMatchObject({ key: "opex", subject: "IT", said: "10% below budget" });
  });

  test("a capacity is a ceiling: room under it says nothing, passing it is the bad side", () => {
    const capacity = card("rm", { title: "Clients per banker", view: { type: "bullet", label: "rm", value: "clients", target: "capacity" } }, [
      { rm: "Ana", clients: 30, capacity: 40 },
      { rm: "Ben", clients: 44, capacity: 40 },
    ]);
    const said = readingsOf(capacity);
    expect(said).toHaveLength(1);
    expect(said[0]).toMatchObject({ subject: "Ben", said: "10% above capacity" });
    expect(said[0]?.score).toBeCloseTo(-0.1);
  });

  test("is the same for the same data, whatever the order of equal readings", () => {
    expect(ledeOf([meter, costs])).toEqual(ledeOf([meter, costs]));
  });

  test("a board with fewer than two figures to judge has no lede", () => {
    expect(ledeOf([card("one", { view: { type: "gauge", value: "nps", target: "goal" } }, [{ nps: 40, goal: 50 }])])).toBeUndefined();
    expect(ledeOf([])).toBeUndefined();
  });

  test("the same figure on two cards counts once", () => {
    const twice = card("again", { title: "Again", view: { type: "meter", label: "region", value: "revenue", target: "target" } }, [{ region: "East", revenue: 110, target: 100 }, { region: "North", revenue: 100, target: 100 }]);
    expect(ledeOf([meter, twice])?.of).toBe(5);
  });

  test("lede is a known board option, true or false", () => {
    expect(validateDashboard({ lede: false, widgets: [] })).toEqual([]);
    expect(validateDashboard({ lede: "no", widgets: [] }).map((i) => i.path)).toEqual(["lede"]);
  });
});
