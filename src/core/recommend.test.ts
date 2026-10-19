import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { recommendCharts } from "./recommend.ts";
import { hasErrors, validateSpec } from "./validate.ts";
import type { Row, WidgetSpec } from "./types.ts";

const types = (rows: Row[]) => recommendCharts(rows).map((pick) => pick.type);

describe("recommendCharts", () => {
  test("one row of numbers is headline tiles; with a target, a gauge", () => {
    expect(types([{ revenue: 1, churn: 2 }])[0]).toBe("kpis");
    expect(types([{ nps: 42, goal: 50 }])[0]).toBe("gauge");
  });

  test("a number over dates is a line first", () => {
    const rows = ["2026-01", "2026-02", "2026-03", "2026-04"].map((month, i) => ({ month, revenue: 100 + i }));
    expect(recommendCharts(rows)[0]).toMatchObject({ type: "line", view: { type: "line", x: "month", y: "revenue" } });
  });

  test("open, high, low and close are candles", () => {
    const rows = ["2026-01-01", "2026-01-02", "2026-01-03"].map((day) => ({ day, open: 1, high: 2, low: 0.5, close: 1.5 }));
    expect(types(rows)[0]).toBe("candlestick");
  });

  test("start and end dates are a timeline", () => {
    expect(types([{ task: "A", start: "2026-01-01", end: "2026-02-01" }, { task: "B", start: "2026-01-15", end: "2026-03-01" }])[0]).toBe("timeline");
  });

  test("named steps that shrink are a funnel, but a ranking sorted largest first is not", () => {
    expect(types([{ stage: "Visit", n: 1000 }, { stage: "Sign up", n: 300 }, { stage: "Pay", n: 40 }])[0]).toBe("funnel");
    expect(types([{ region: "East", revenue: 300 }, { region: "North", revenue: 280 }, { region: "South", revenue: 250 }])).not.toContain("funnel");
  });

  test("from and to with a value are a flow; between the same groups, a chord", () => {
    expect(types([{ from: "Search", to: "Signup", visits: 5 }, { from: "Ads", to: "Left", visits: 3 }])[0]).toBe("sankey");
    expect(types([{ from: "Pro", to: "Starter", n: 5 }, { from: "Starter", to: "Pro", n: 3 }])[0]).toBe("chord");
  });

  test("many values of one number show their spread", () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({ deal: (i * 37) % 100 }));
    expect(types(rows)).toEqual(expect.arrayContaining(["histogram", "beeswarm"]));
  });

  test("no rows, no picks; limit caps the list", () => {
    expect(recommendCharts([])).toEqual([]);
    expect(recommendCharts([{ a: "x", b: 1 }, { a: "y", b: 2 }], { limit: 2 })).toHaveLength(2);
  });

  test("on every catalog example, each pick is a valid spec, and the chart chosen by hand is usually among the top five", () => {
    let found = 0;
    const files = readdirSync("catalog").filter((file) => file.endsWith(".json"));
    for (const file of files) {
      const spec = JSON.parse(readFileSync(`catalog/${file}`, "utf8")) as WidgetSpec;
      const rows = spec.data.rows as Row[];
      const picks = recommendCharts(rows);
      for (const pick of picks) expect([file, pick.type, hasErrors(validateSpec({ data: { type: "inline", rows }, view: pick.view }, rows))]).toEqual([file, pick.type, false]);
      if (picks.some((pick) => pick.type === spec.view.type)) found++;
    }
    // 26 of 40 when written; the rest are style alternatives (rose, waffle, list) over the same shapes.
    expect(found).toBeGreaterThanOrEqual(24);
  });
});

test("a flow through several steps is a sankey, not a chord: a chain is not a loop", () => {
  const rows = [
    { from: "Search", to: "Pricing", visits: 5 },
    { from: "Pricing", to: "Signed up", visits: 2 },
    { from: "Pricing", to: "Left", visits: 3 },
  ];
  expect(types(rows)[0]).toBe("sankey");
  expect(types(rows)).not.toContain("chord");
});
