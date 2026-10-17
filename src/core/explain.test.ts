import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { explainChart } from "./explain.ts";
import { describeBlocks } from "./registry.ts";
import "./index.ts";
import type { WidgetSpec } from "./types.ts";

const spec = (view: Record<string, unknown>, fields: WidgetSpec["fields"] = {}): WidgetSpec => ({ data: { type: "inline", rows: [] }, view: view as WidgetSpec["view"], fields });

describe("explainChart", () => {
  test("says what each mark is and what bigger means, with the chart's own field names", () => {
    const text = explainChart(spec({ type: "bar", x: "region", y: "revenue" }, { revenue: { label: "Revenue" } }));
    expect(text).toBe("Each bar is one region. The taller the bar, the more revenue.");
  });

  test("adds what the options change: colors per series, a dashed forecast, bubble sizes", () => {
    expect(explainChart(spec({ type: "line", x: "month", y: ["revenue", "cost"] }))).toContain("Each color is one line: revenue or cost.");
    expect(explainChart(spec({ type: "line", x: "month", y: "revenue", forecast: "f", band: { low: "lo", high: "hi" } }))).toContain("The dashed part is a forecast");
    expect(explainChart(spec({ type: "scatter", x: "growth", y: "margin", size: "revenue", label: "account" }))).toContain("Bigger dots mean more revenue.");
  });

  test("every built-in view has its own explanation, not a generic one", () => {
    const generic = explainChart(spec({ type: "made-up-view" }));
    const missing = describeBlocks("view").map((b) => b.type).filter((type) => explainChart(spec({ type })) === generic);
    expect(missing).toEqual([]);
  });

  test("speaks plainly about every stored widget: short sentences, no kitchen words", () => {
    const banned = /\b(dish|plate|plating|sauce|soup|kitchen|chef|recipe|tweezers|biberon|crunchy|salty|umami|bitter|fatty|acid|spherif|foam|taste)\w*/i;
    for (const file of readdirSync("widgets").filter((name) => name.endsWith(".json"))) {
      const widget = JSON.parse(readFileSync(`widgets/${file}`, "utf8")) as WidgetSpec;
      const text = explainChart(widget);
      expect([file, banned.test(text)]).toEqual([file, false]);
      expect([file, text.split(". ").length <= 4, text.length < 360]).toEqual([file, true, true]);
    }
  });

  test("given the rows, it adds one concrete example from the data", () => {
    const sales = [
      { region: "North", revenue: 1200 },
      { region: "East", revenue: 2000 },
      { region: "South", revenue: 900 },
    ];
    const money = { revenue: { label: "Revenue", format: { type: "currency", currency: "EUR", decimals: 0 } } } as WidgetSpec["fields"];
    expect(explainChart({ ...spec({ type: "bar", x: "region", y: "revenue" }, money), locale: "en-US" }, sales)).toBe("Each bar is one region. The taller the bar, the more revenue. Here, East is the tallest, with €2,000.");
    expect(explainChart({ ...spec({ type: "hbar", label: "region", value: "revenue" }, money), locale: "en-US" }, sales)).toContain("Here, East is the longest, with €2,000.");
    const months = [{ month: "2026-07", v: 10 }, { month: "2026-08", v: 14 }, { month: "2026-09", v: 21 }];
    const dated = { month: { format: { type: "date", style: "month" } } } as WidgetSpec["fields"];
    expect(explainChart({ ...spec({ type: "line", x: "month", y: "v" }, dated), locale: "en-US" }, months)).toContain("Here, it went from 10 in Jul 2026 to 21 in Sep 2026.");
    const slices = [{ p: "Core", r: 75 }, { p: "Plus", r: 25 }];
    expect(explainChart({ ...spec({ type: "donut", label: "p", value: "r" }), locale: "en-US" }, slices)).toContain("Here, Core is the biggest slice, with 75% of the whole.");
  });

  test("without rows, or with nothing to compare, it gives the general guide only", () => {
    const bar = spec({ type: "bar", x: "region", y: "revenue" });
    expect(explainChart(bar)).toBe(explainChart(bar, []));
    expect(explainChart(bar, [{ region: "North", revenue: null }])).toBe(explainChart(bar));
  });

  test("more charts point at their standout: the darkest square, the biggest drop, the biggest move, the most agreed answer", () => {
    const at = (view: Record<string, unknown>, rows: Record<string, unknown>[]) => explainChart({ ...spec(view), locale: "en-US" }, rows);
    expect(at({ type: "heatmap", x: "hour", y: "day", value: "n" }, [{ hour: "9", day: "Mon", n: 4 }, { hour: "10", day: "Tue", n: 9 }])).toContain("Here, the darkest square is day Tue and hour 10, at 9.");
    expect(at({ type: "funnel", label: "step", value: "n" }, [{ step: "Visit", n: 1000 }, { step: "Signup", n: 200 }, { step: "Paid", n: 150 }])).toContain("Here, the biggest drop is from Visit to Signup: 80% stop there.");
    expect(at({ type: "slope", label: "region", from: "q2", to: "q3" }, [{ region: "North", q2: 10, q3: 12 }, { region: "East", q2: 10, q3: 25 }])).toContain("Here, East moved the most, from 10 to 25.");
    expect(at({ type: "likert", label: "q", responses: ["no", "meh", "yes"] }, [{ q: "Pay", no: 6, meh: 2, yes: 2 }, { q: "Team", no: 1, meh: 2, yes: 7 }])).toContain("Here, the most agreed question is Team: 70% agree.");
    expect(at({ type: "meter", value: "v", target: "t", label: "name" }, [{ name: "A", v: 12, t: 10 }, { name: "B", v: 5, t: 10 }])).toContain("Here, 1 of 2 has reached its goal.");
    expect(at({ type: "icicle", levels: ["region", "product"], value: "v" }, [{ region: "East", product: "x", v: 6 }, { region: "West", product: "x", v: 4 }])).toContain("Here, East is the biggest group, with 60% of the total.");
    expect(at({ type: "histogram", value: "size" }, [1, 2, 2, 3, 3, 3, 8].map((size) => ({ size })))).toMatch(/Here, the most common range is .+, which happened \d+ times\./);
  });

  test("two-value, mix, range, target and rank charts say what their parts are", () => {
    const at = (view: Record<string, unknown>, rows: Record<string, unknown>[], fields: WidgetSpec["fields"] = {}) => explainChart({ ...spec(view, fields), locale: "en-US" }, rows);
    const pair = at({ type: "dumbbell", label: "region", from: "revenue", to: "cost" }, [{ region: "East", revenue: 30, cost: 20 }, { region: "West", revenue: 10, cost: 8 }]);
    expect(pair).toBe("Each row has two dots: revenue and cost. The line between them is the gap. Here, East has the biggest gap: 30 against 20.");
    expect(at({ type: "marimekko", x: "from", series: "to", value: "n" }, [], { from: { label: "Plan they left" }, to: { label: "Plan they joined" } })).toBe(
      "Each column is one plan they left: the wider the column, the bigger its total, and its colored parts show how it splits by plan they joined.",
    );
    expect(at({ type: "histogram", value: "orders" }, [])).toBe("Each bar is one range of orders. The taller the bar, the more often a value in that range happened; the dashed line is the middle value.");
    expect(at({ type: "variance", label: "region", value: "revenue", target: "target" }, [])).toContain("how far one region is from its target");
    expect(at({ type: "bump", x: "month", series: "region", value: "v" }, [{ month: "1", region: "A", v: 3 }, { month: "1", region: "B", v: 2 }, { month: "2", region: "A", v: 1 }, { month: "2", region: "B", v: 4 }])).toBe(
      "Each line is one region's rank, month by month. Higher on the chart means a better rank; lines crossing mean places swapped. Here, B moved up the most, from 2nd to 1st.",
    );
  });

  test("still more charts point at their standout, from steps and boxes to gauges, stacks, streams and price days", () => {
    const at = (view: Record<string, unknown>, rows: Record<string, unknown>[]) => explainChart({ ...spec(view), locale: "en-US" }, rows);
    expect(at({ type: "waterfall", label: "step", value: "v" }, [{ step: "Start", v: 100 }, { step: "New deals", v: 40 }, { step: "Churn", v: -55 }])).toContain("Here, the biggest step is Churn, at -55.");
    expect(at({ type: "boxplot", value: "v", group: "g" }, [1, 2, 3, 10, 11, 12].map((v, i) => ({ g: i < 3 ? "A" : "B", v })))).toContain("Here, B has the highest middle value, 11.");
    expect(at({ type: "variance", label: "r", value: "v", target: "budget" }, [{ r: "North", v: 105, budget: 100 }, { r: "South", v: 70, budget: 100 }])).toContain("Here, South is furthest from its budget: 70 against 100.");
    expect(at({ type: "marimekko", x: "region", series: "p", value: "v" }, [{ region: "East", p: "a", v: 5 }, { region: "East", p: "b", v: 5 }, { region: "West", p: "a", v: 3 }])).toContain("Here, East is the widest column, with 10.");
    expect(at({ type: "gauge", value: "v", target: "t" }, [{ v: 42, t: 50 }])).toContain("Here, the needle is at 42, short of the goal of 50.");
    expect(at({ type: "bar", x: "region", y: ["a", "b"], stacked: true }, [{ region: "East", a: 5, b: 6 }, { region: "West", a: 4, b: 2 }])).toContain("Here, East has the tallest bar, with 11 in all.");
    expect(at({ type: "area", x: "week", y: ["a", "b"], stacked: "stream" }, [{ week: "1", a: 5, b: 1 }, { week: "2", a: 6, b: 2 }])).toContain("Here, a is the thickest band overall.");
    expect(at({ type: "candlestick", x: "day", open: "o", high: "h", low: "l", close: "c" }, [{ day: "1", o: 10, h: 12, l: 9, c: 11 }, { day: "2", o: 11, h: 11, l: 9, c: 10 }, { day: "3", o: 10, h: 13, l: 10, c: 12 }])).toContain("Here, 2 of 3 days went up.");
  });

  test("the last charts point at their standout too: flows, profiles, dots, goals, tasks, lists and big numbers", () => {
    const at = (view: Record<string, unknown>, rows: Record<string, unknown>[]) => explainChart({ ...spec(view), locale: "en-US" }, rows);
    expect(at({ type: "sankey", source: "from", target: "to", value: "n" }, [{ from: "Search", to: "Pricing", n: 40 }, { from: "Email", to: "Home", n: 10 }])).toContain("Here, the thickest band goes from Search to Pricing, with 40.");
    expect(at({ type: "chord", source: "from", target: "to", value: "n" }, [{ from: "Starter", to: "Growth", n: 120 }, { from: "Pro", to: "Growth", n: 18 }])).toContain("Here, the thickest band joins Starter and Growth, with 120.");
    expect(at({ type: "radar", label: "attribute", y: ["us", "market"] }, [{ attribute: "Speed", us: 8, market: 6 }, { attribute: "Price", us: 6, market: 7 }])).toContain("Here, the highest score is Speed, at 8.");
    expect(at({ type: "beeswarm", value: "v", label: "deal" }, [{ deal: "Acme", v: 9 }, { deal: "Bolt", v: 4 }])).toContain("Here, the dot furthest right is Acme, at 9.");
    expect(at({ type: "beeswarm", value: "size", label: "deal" }, [])).toContain("Each dot is one deal, placed by its size.");
    expect(at({ type: "rings", label: "p", value: "v", target: "t" }, [{ p: "Core", v: 9, t: 10 }, { p: "Plus", v: 5, t: 10 }])).toContain("Here, Core is closest to its goal, at 90%.");
    expect(at({ type: "bullet", label: "kpi", value: "v", target: "t" }, [{ kpi: "Leads", v: 12, t: 10 }, { kpi: "Calls", v: 8, t: 10 }, { kpi: "Deals", v: 11, t: 10 }])).toContain("Here, 2 of 3 have passed their goal.");
    expect(at({ type: "timeline", label: "task", start: "s", end: "e", progress: "p" }, [{ task: "Build", s: "2026-08-01", e: "2026-10-01", p: 0.5 }, { task: "Launch", s: "2026-11-01", e: "2026-11-02", p: 0 }])).toContain("Here, the longest task is Build.");
    expect(at({ type: "kpi", value: "v" }, [{ v: 10 }, { v: 12 }])).toContain("Here, it is 12, up from 10.");
    expect(at({ type: "list", label: "name", value: "v" }, [{ name: "Aurora", v: 9 }, { name: "Bell", v: 7 }])).toContain("Here, Aurora is at the top, with 9.");
  });

  test("tables, percent stacks, ridgelines and lines with several series get an example too", () => {
    const at = (view: Record<string, unknown>, rows: Record<string, unknown>[]) => explainChart({ ...spec(view), locale: "en-US" }, rows);
    expect(at({ type: "line", x: "m", y: ["revenue", "cost"] }, [{ m: "Jan", revenue: 10, cost: 8 }, { m: "Feb", revenue: 14, cost: 9 }])).toContain("Here, revenue went from 10 in Jan to 14 in Feb.");
    expect(at({ type: "bar", x: "region", y: ["core", "plus"], stacked: "percent" }, [{ region: "East", core: 65, plus: 35 }, { region: "West", core: 50, plus: 50 }])).toContain("Here, the largest share is core in East, at 65%.");
    expect(at({ type: "area", x: "m", y: ["a", "b"], stacked: "percent" }, [{ m: "Jan", a: 50, b: 50 }, { m: "Feb", a: 30, b: 70 }])).toContain("Here, by Feb, b has the largest share, at 70%.");
    expect(at({ type: "ridgeline", value: "v", group: "g" }, [1, 2, 3, 10, 11, 12].map((v, i) => ({ g: i < 3 ? "A" : "B", v })))).toContain("Here, B sits furthest right, with a middle value of 11.");
    expect(at({ type: "table" }, [{ region: "North", revenue: 12, cost: 5 }, { region: "East", revenue: 20, cost: 9 }])).toContain("Here, East is the top row by revenue, at 20.");
    // A table of months points at the latest month.
    expect(at({ type: "table" }, [{ region: "North", "2026-08": 9, "2026-09": 14 }, { region: "East", "2026-08": 12, "2026-09": 11 }])).toContain("Here, North is the top row in 2026-09, at 14.");
  });
});

