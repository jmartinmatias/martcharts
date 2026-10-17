import { describe, expect, test } from "vitest";
import { createVariants } from "./taller.ts";
import type { Row, WidgetSpec } from "./types.ts";

const kpis: Row[] = [
  { kpi: "Revenue", actual: 1284000, target: 1300000 },
  { kpi: "New customers", actual: 66, target: 60 },
  { kpi: "Net promoter score", actual: 42, target: 50 },
];
const scorecard: WidgetSpec = {
  title: "Q3 scorecard",
  subtitle: "Actual against target, with poor, fair and good bands",
  footer: "Bands end at 60%, 90% and 120% of target",
  description: "Each headline KPI against its quarterly target, on poor, fair and good bands. New customers beat it by 10%.",
  data: { type: "inline", rows: kpis },
  view: { type: "bullet", label: "kpi", value: "actual", target: "target" },
};

describe("a version's words describe its own form", () => {
  test("copy that says how the original draws is cut back to what it counts, or dropped", () => {
    const versions = createVariants(scorecard, kpis, { count: 6 });
    expect(versions.length).toBeGreaterThan(0);
    for (const v of versions) {
      expect([v.spec.subtitle, v.spec.footer, v.spec.description]).toEqual(["Actual against target", undefined, "New customers beat it by 10%."]);
    }
  });

  test("a subtitle that opens on its form, and copy with no form words at all, are dropped and kept whole", () => {
    const rows: Row[] = ["A", "B", "C", "D"].map((region, i) => ({ region, revenue: 100 - i * 10 }));
    const base: WidgetSpec = { title: "Revenue", data: { type: "inline", rows }, view: { type: "bar", x: "region", y: "revenue" } };
    const [ringed] = createVariants({ ...base, subtitle: "Inner ring by region", footer: "Source: finance ledger" }, rows, { count: 1 });
    const [plain] = createVariants({ ...base, subtitle: "Median minutes to a first reply, September 2026" }, rows, { count: 1 });
    expect([ringed?.spec.subtitle, ringed?.spec.footer, plain?.spec.subtitle]).toEqual([undefined, "Source: finance ledger", "Median minutes to a first reply, September 2026"]);
  });
});
