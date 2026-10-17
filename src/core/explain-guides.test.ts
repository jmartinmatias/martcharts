import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createLocalFetch } from "../mcp/store.ts";
import { explainChart } from "./explain.ts";
import { runPipeline } from "./pipeline.ts";
import "./index.ts";
import type { WidgetSpec } from "./types.ts";

const spec = (view: Record<string, unknown>, fields: WidgetSpec["fields"] = {}): WidgetSpec => ({ data: { type: "inline", rows: [] }, view: view as WidgetSpec["view"], fields, locale: "en-US" });

describe("explainChart, sharper examples", () => {
  test("a rose names its busiest time with its number, and which ring brings more, when one does", () => {
    const at = (view: Record<string, unknown>, rows: Record<string, unknown>[]) => explainChart(spec(view), rows);
    const hours = [
      { hour: "08:00", Desktop: 520, Mobile: 760 },
      { hour: "12:00", Desktop: 1550, Mobile: 350 },
      { hour: "21:00", Desktop: 120, Mobile: 1660 },
    ];
    const twoRings = { type: "rose", label: "hour", y: ["Desktop", "Mobile"] };
    expect(at(twoRings, hours)).toContain("Here, 12:00 is the busiest hour, with 1,900 in all; Mobile brings more than Desktop in 2 of 3 hours.");
    const evenings = hours.map((r) => ({ ...r, Mobile: r.Desktop + 10 }));
    expect(at(twoRings, evenings)).toContain("Here, 12:00 is the busiest hour, with 3,110 in all; Mobile brings more than Desktop in every hour.");
    // One ring: just the busiest time; three rings: the one that brings the most.
    expect(at({ type: "rose", label: "month", y: "orders" }, [{ month: "Jan", orders: 10 }, { month: "Feb", orders: 30 }, { month: "Mar", orders: 20 }])).toContain("Here, Feb is the busiest month, with 30.");
    const days = [
      { day: "Fri", web: 5, app: 9, store: 1 },
      { day: "Sat", web: 8, app: 6, store: 4 },
      { day: "Sun", web: 2, app: 7, store: 3 },
    ];
    expect(at({ type: "rose", label: "day", y: ["web", "app", "store"] }, days)).toContain("Here, Sat is the busiest day, with 18 in all; app brings the most in 2 of 3 days.");
  });

  test("a rose of plain categories has a biggest slice, not a busiest one, and ties are named together or left out", () => {
    const at = (view: Record<string, unknown>, rows: Record<string, unknown>[]) => explainChart(spec(view), rows);
    expect(at({ type: "rose", label: "reason", y: "n" }, [{ reason: "Price", n: 12 }, { reason: "Speed", n: 7 }, { reason: "Support", n: 4 }])).toContain("Here, Price is the biggest slice, with 12.");
    // Two hours tie for busiest, and each ring leads once: no ring is said to bring more.
    const tied = [
      { hour: "10:00", Desktop: 40, Mobile: 40 },
      { hour: "12:00", Desktop: 100, Mobile: 50 },
      { hour: "13:00", Desktop: 50, Mobile: 100 },
    ];
    const twoRings = { type: "rose", label: "hour", y: ["Desktop", "Mobile"] };
    expect(at(twoRings, tied)).toContain("Here, 12:00 and 13:00 are the busiest hours, with 150 each.");
    // Every hour the same: no busiest hour, but the ring that leads every hour is still worth saying.
    const flat = ["01:00", "02:00", "03:00", "04:00"].map((hour) => ({ hour, Desktop: 40, Mobile: 60 }));
    expect(at(twoRings, flat)).toContain("Here, Mobile brings more than Desktop in every hour.");
    const empty = ["01:00", "02:00", "03:00"].map((hour) => ({ hour, Desktop: 0, Mobile: 0 }));
    expect(at(twoRings, empty)).toBe(explainChart(spec(twoRings)));
  });

  test("a chord says which way the biggest move goes and, when some went back, what the band gained overall", () => {
    const people = { customers: { label: "Customers" } };
    const at = (rows: Record<string, unknown>[], amount = "customers") => explainChart(spec({ type: "chord", source: "from", target: "to", value: amount }, people), rows);
    expect(at([{ from: "Starter", to: "Growth", customers: 120 }, { from: "Growth", to: "Starter", customers: 30 }, { from: "Pro", to: "Growth", customers: 18 }])).toContain(
      "Here, the biggest move is from Starter to Growth: 120 customers; 30 went the other way, so Growth gained 90 from Starter.",
    );
    expect(at([{ from: "Starter", to: "Growth", customers: 120 }, { from: "Pro", to: "Growth", customers: 18 }])).toContain("Here, the biggest move is from Starter to Growth: 120 customers.");
    // As drawn: repeated moves add up, and staying on the same plan is not a move.
    expect(at([{ from: "Starter", to: "Growth", customers: 70 }, { from: "Starter", to: "Growth", customers: 50 }, { from: "Growth", to: "Growth", customers: 500 }])).toContain(
      "Here, the biggest move is from Starter to Growth: 120 customers.",
    );
    // A plain value field adds no word after the number.
    expect(at([{ from: "Starter", to: "Growth", n: 120 }, { from: "Pro", to: "Growth", n: 18 }], "n")).toContain("Here, the biggest move is from Starter to Growth: 120.");
  });

  test("a chord with tied moves names them together, and says nothing when nothing moved", () => {
    const people = { customers: { label: "Customers" } };
    const view = { type: "chord", source: "from", target: "to", value: "customers" };
    const at = (rows: Record<string, unknown>[]) => explainChart(spec(view, people), rows);
    expect(at([{ from: "Starter", to: "Growth", customers: 50 }, { from: "Growth", to: "Starter", customers: 50 }, { from: "Pro", to: "Growth", customers: 9 }])).toContain(
      "Here, the biggest moves are between Starter and Growth: 50 customers each way.",
    );
    expect(at([{ from: "Starter", to: "Growth", customers: 50 }, { from: "Pro", to: "Enterprise", customers: 50 }])).toContain(
      "Here, the biggest moves are from Starter to Growth and from Pro to Enterprise, with 50 customers each.",
    );
    expect(at([{ from: "Starter", to: "Growth", customers: 0 }, { from: "Pro", to: "Pro", customers: 9 }])).toBe(explainChart(spec(view, people)));
  });

  test("a table of trends says how many rows grew from start to finish, and who grew most, in the total's own format", () => {
    const money = { type: "currency", currency: "EUR", compact: true };
    const trends: WidgetSpec = {
      ...spec({ type: "table", columns: ["region", "trend", "total"] }, { trend: { format: "spark" }, total: { format: money } }),
      transform: [{ type: "aggregate", groupBy: "region", measures: [{ op: "list", field: "revenue", as: "trend" }, { op: "sum", field: "revenue", as: "total" }] }],
    };
    const rows = [
      { region: "East", trend: [52000, 58000, 65000], total: 175000 },
      { region: "North", trend: [44000, 45000, 48000], total: 137000 },
      { region: "South", trend: [33000, 36000, 31000], total: 100000 },
    ];
    expect(explainChart(trends, rows)).toContain("Here, 2 of 3 regions grew from start to finish, and East grew the most, from €52K to €65K.");
    expect(explainChart(trends, rows.slice(0, 2))).toContain("Here, every region grew from start to finish, and East grew the most, from €52K to €65K.");
  });

  test("a table of trends without totals reads its plain points, says who fell most when none grew, and leaves out ties", () => {
    const at = (rows: Record<string, unknown>[], columns = ["region", "trend"]) => explainChart(spec({ type: "table", columns }), rows);
    expect(at([{ region: "East", trend: [5, 9] }, { region: "West", trend: [6, 7] }])).toContain("Here, every region grew from start to finish, and East grew the most, from 5 to 9.");
    expect(at([{ region: "East", trend: [9, 5] }, { region: "West", trend: [7, 6] }])).toContain("Here, no region grew from start to finish, and East fell the most, from 9 to 5.");
    expect(at([{ region: "East", trend: [5, 9] }, { region: "West", trend: [6, 10] }])).toContain("Here, every region grew from start to finish.");
    // Flat trends say nothing about growth: the top row by total speaks instead.
    expect(at([{ region: "East", trend: [5, 5], total: 10 }, { region: "West", trend: [6, 6], total: 12 }], ["region", "trend", "total"])).toContain("Here, West is the top row by total, at 12.");
  });

  test("a table of trends with a column of gaps against target still counts who is above target first", () => {
    const fields = { gap: { label: "vs target", format: { type: "delta" } } };
    const rows = [
      { region: "East", trend: [5, 9], gap: 3 },
      { region: "West", trend: [6, 7], gap: -1 },
    ];
    expect(explainChart(spec({ type: "table", columns: ["region", "trend", "gap"] }, fields), rows)).toContain("Here, 1 of 2 regions is above target: East.");
  });

  test("the stored hour rose, plan chord and trends table each say their sharper sentence", async () => {
    const expected: Record<string, string> = {
      "visits-by-hour": "Here, 12:00 is the busiest hour, with 1,900 in all; Mobile brings more than Desktop in 15 of 24 hours.",
      "plan-moves": "Here, the biggest move is from Starter to Growth: 120 customers; 30 went the other way, so Growth gained 90 from Starter.",
      "region-trends": "Here, every region grew from start to finish, and East grew the most, from €52K to €65K.",
    };
    const fetch = createLocalFetch("public");
    for (const [id, sentence] of Object.entries(expected)) {
      const widget = JSON.parse(readFileSync(`widgets/${id}.json`, "utf8")) as WidgetSpec;
      const text = explainChart(widget, await runPipeline(widget, { fetch }));
      expect([id, text.slice(text.indexOf("Here, "))]).toEqual([id, sentence]);
    }
  });
});
