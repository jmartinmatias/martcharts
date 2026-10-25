import { describe, expect, test } from "vitest";
import { explainChart } from "./explain.ts";
import { createVariants, profileData } from "./taller.ts";
import type { Variant } from "./taller.ts";
import type { Row, WidgetSpec } from "./types.ts";
import { hasErrors, validateSpec } from "./validate.ts";

/** Median minutes to a first reply per team, against a 1 hour target where lower is better. */
const teams: Row[] = [
  { team: "Technical", minutes: 95 },
  { team: "Data", minutes: 77 },
  { team: "SMB", minutes: 64 },
  { team: "Partners", minutes: 51 },
  { team: "Billing", minutes: 42 },
  { team: "Security", minutes: 33 },
  { team: "Onboarding", minutes: 28 },
  { team: "Enterprise", minutes: 18 },
];
const goal = { value: 60, label: "1 hour target" };
const responseTime: WidgetSpec = {
  id: "response-time-by-team",
  title: "First response time by team",
  data: { type: "inline", rows: teams },
  fields: { team: { label: "Team" }, minutes: { label: "Median minutes", format: { type: "number" } } },
  view: { type: "bar", x: "team", y: "minutes", mark: "lollipop", goodWhen: "down", reference: [goal] },
};
const { goodWhen: _goodWhen, reference: _reference, ...plainView } = responseTime.view;
const untargeted: WidgetSpec = { ...responseTime, view: plainView as WidgetSpec["view"] };

/** Every version across a few seeds. */
const across = (spec: WidgetSpec, rows: Row[], seeds = [1, 2, 3, 4, 5, 6], count = 8) => seeds.flatMap((seed) => createVariants(spec, rows, { seed, count }));
/** A version that draws a dashed line labelled as a target. */
const targeted = (v: Variant) => Array.isArray(v.spec.view?.reference) && (v.spec.view.reference as { label?: string }[]).some((r) => /target|plan|goal|budget|quota/i.test(r.label ?? ""));

describe("profileData reads a dashed target line", () => {
  test("keeps the target line and which side of it is good news", () => {
    const data = profileData(responseTime, teams);
    expect([data.targetLine, data.goodWhen]).toEqual([goal, "down"]);
  });

  test("an average line, a chart without a target, or a target on a stacked total is no target for one measure", () => {
    const average: WidgetSpec = { ...untargeted, view: { ...untargeted.view, reference: [{ field: "minutes", agg: "avg", label: "Average" }] } };
    const parts = [{ month: "2026-01", core: 50, plus: 30 }, { month: "2026-02", core: 55, plus: 35 }];
    const stacked: WidgetSpec = { data: { type: "inline", rows: parts }, view: { type: "bar", x: "month", y: ["core", "plus"], stacked: true, reference: [{ value: 80, label: "Target" }] } };
    expect([profileData(average, teams).targetLine, profileData(untargeted, teams).targetLine, profileData(stacked, parts).targetLine]).toEqual([undefined, undefined, undefined]);
  });
});

describe("versions keep the target", () => {
  test("bars of a chart with a dashed target keep the target and which side is good news", () => {
    const kept = across(responseTime, teams).filter(targeted);
    expect(kept.length).toBeGreaterThan(0);
    expect(kept.every((v) => JSON.stringify(v.spec.view?.reference) === JSON.stringify([goal]) && v.spec.view?.goodWhen === "down")).toBe(true);
    // Sideways bars cannot draw a dashed line, so they never carry one.
    expect(across(responseTime, teams).filter((v) => v.spec.view?.type === "hbar" && "reference" in (v.spec.view ?? {}))).toEqual([]);
  });

  test("a target line and an average line are different shapes, so the average never crowds the target out", () => {
    for (const seed of [1, 2, 3, 4]) {
      const versions = createVariants(responseTime, teams, { seed, count: 8 });
      expect([seed, versions.some(targeted), versions.some((v) => JSON.stringify(v.spec.view?.reference ?? []).includes('"Average"'))]).toEqual([seed, true, true]);
    }
  });

  test("those versions ask about the target and read in target terms", () => {
    const kept = across(responseTime, teams).filter(targeted);
    expect([...new Set(kept.map((v) => v.question))]).toEqual(["Which teams meet the 1 hour target?"]);
    expect(kept.every((v) => v.lineage.question === "target")).toBe(true);
    for (const v of kept) {
      expect(explainChart(v.spec, teams)).toContain("Here, 5 of 8 teams meet the 1 hour target, and 3 miss it: Technical, Data and SMB.");
      // One sentence now names the line and how to read it.
      expect(explainChart(v.spec, teams)).toContain("lower is better here");
      // The version's own short guide names the line, never calls it an average.
      expect([v.explain.includes("The dashed line is the 1 hour target"), v.explain.includes("average")]).toEqual([true, false]);
    }
  });

  test("a chart without a target never gains one", () => {
    const average: WidgetSpec = { ...untargeted, view: { ...untargeted.view, reference: [{ field: "minutes", agg: "avg", label: "Average" }] } };
    for (const spec of [untargeted, average]) {
      const versions = across(spec, teams);
      expect(versions.length).toBeGreaterThan(0);
      expect(versions.filter((v) => targeted(v) || v.spec.view?.goodWhen !== undefined).map((v) => v.title)).toEqual([]);
    }
  });

  test("every version is still valid", () => {
    for (const spec of [responseTime, untargeted]) {
      for (const v of across(spec, teams)) expect([v.title, hasErrors(validateSpec(v.spec, teams))]).toEqual([v.title, false]);
    }
  });

  test("over time, bars and lollipops in time keep the target and ask whether it is met, month by month", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, "0")}`, revenue: 1000 + i * 40 }));
    const spec: WidgetSpec = { id: "monthly", title: "Monthly revenue", data: { type: "inline", rows }, view: { type: "line", x: "month", y: "revenue", reference: [{ value: 1200, label: "Target" }] } };
    const kept = across(spec, rows, [1, 2, 3, 4, 5, 6, 7, 8], 12).filter((v) => v.spec.view?.type === "bar" && targeted(v));
    expect(new Set(kept.map((v) => v.spec.view?.mark ?? "bar"))).toEqual(new Set(["bar", "lollipop"]));
    expect([...new Set(kept.map((v) => v.question))]).toEqual(["Is revenue on target, month by month?"]);
    // No goodWhen on the original, so none on the versions: higher is better by default.
    expect(kept.some((v) => "goodWhen" in (v.spec.view ?? {}))).toBe(false);
  });

  test("bars against a dashed target become lollipops with their target line", () => {
    const bars: WidgetSpec = { ...responseTime, view: { type: "bar", x: "team", y: "minutes", goodWhen: "down", reference: [goal] } };
    const lollipops = across(bars, teams).filter((v) => v.spec.view?.mark === "lollipop" && v.spec.view?.type === "bar");
    expect(lollipops.length).toBeGreaterThan(0);
    expect(lollipops.every((v) => targeted(v) && v.spec.view?.goodWhen === "down" && v.question === "Which teams meet the 1 hour target?")).toBe(true);
    expect(explainChart(lollipops[0]?.spec as WidgetSpec, teams)).toContain("a dot under it meets it, and a hollow dot went over.");
  });

  test("a variance of costs against their budget keeps lower is better, so under budget reads as good news", () => {
    const costs: Row[] = ["Sales", "Marketing", "R&D", "Support", "G&A"].map((department, i) => ({ department, actual: 300 + i * 40, budget: 320 + i * 30 }));
    const spec: WidgetSpec = { id: "opex", title: "Operating costs against budget", data: { type: "inline", rows: costs }, view: { type: "bar", x: "department", y: "actual", lines: "budget", goodWhen: "down" } };
    const variances = across(spec, costs, [1, 2, 3, 4, 5, 6, 7, 8], 12).filter((v) => v.spec.view?.type === "variance");
    expect(variances.length).toBeGreaterThan(0);
    expect(variances.every((v) => v.spec.view?.goodWhen === "down" && explainChart(v.spec, costs).includes("Below the budget is better."))).toBe(true);
  });
});

describe("the essence leads", () => {
  test("a chart that asks about its target gets a version that still asks it, on every seed and with six versions", () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const questions = createVariants(responseTime, teams, { seed, count: 6 }).map((v) => v.question);
      expect([seed, questions.includes("Which teams meet the 1 hour target?")]).toEqual([seed, true]);
    }
  });
});
