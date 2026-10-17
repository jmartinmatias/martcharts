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
    expect(at({ type: "heatmap", x: "hour", y: "day", value: "n" }, [{ hour: "9", day: "Mon", n: 4 }, { hour: "10", day: "Tue", n: 9 }])).toContain("Here, the strongest square is day Tue and hour 10, at 9.");
    expect(at({ type: "funnel", label: "step", value: "n" }, [{ step: "Visit", n: 1000 }, { step: "Signup", n: 200 }, { step: "Paid", n: 150 }])).toContain("Here, the biggest drop is from Visit to Signup: 80% stop there.");
    expect(at({ type: "slope", label: "region", from: "q2", to: "q3" }, [{ region: "North", q2: 10, q3: 12 }, { region: "East", q2: 10, q3: 25 }])).toContain("Here, every region went up, and East moved the most, from 10 to 25.");
    expect(at({ type: "likert", label: "q", responses: ["no", "meh", "yes"] }, [{ q: "Pay", no: 6, meh: 2, yes: 2 }, { q: "Team", no: 1, meh: 2, yes: 7 }])).toContain("Here, the most agreed question is “Team”: 70% agree, and the least agreed is “Pay”: 20% agree.");
    expect(at({ type: "likert", label: "q", responses: ["no", "meh", "yes"] }, [{ q: "Team", no: 1, meh: 2, yes: 7 }])).toContain("Here, the most agreed question is “Team”: 70% agree.");
    expect(at({ type: "meter", value: "v", target: "t", label: "name" }, [{ name: "A", v: 12, t: 10 }, { name: "B", v: 5, t: 10 }])).toContain("Here, 1 of 2 has reached its goal.");
    expect(at({ type: "icicle", levels: ["region", "product"], value: "v" }, [{ region: "East", product: "x", v: 6 }, { region: "West", product: "x", v: 4 }])).toContain("Here, East is the biggest group, with 60% of the total.");
    expect(at({ type: "histogram", value: "size" }, [1, 2, 2, 3, 3, 3, 8].map((size) => ({ size })))).toMatch(/Here, the most common range is .+, which happened \d+ times\./);
  });

  test("two-value, mix, range, target and rank charts say what their parts are", () => {
    const at = (view: Record<string, unknown>, rows: Record<string, unknown>[], fields: WidgetSpec["fields"] = {}) => explainChart({ ...spec(view, fields), locale: "en-US" }, rows);
    const pair = at({ type: "dumbbell", label: "region", from: "revenue", to: "cost" }, [{ region: "East", revenue: 30, cost: 20 }, { region: "West", revenue: 10, cost: 8 }]);
    expect(pair).toBe("Each row has two dots: revenue and cost. The line between them is the gap. Here, revenue is higher than cost for every region, and East has the biggest gap: 30 against 20.");
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
    expect(at({ type: "waterfall", label: "step", value: "v" }, [{ step: "Start", v: 100 }, { step: "New deals", v: 40 }, { step: "Churn", v: -55 }])).toContain("Here, it went from 100 (Start) to 85 (the end): New deals added the most, 40, and Churn took the most away, 55.");
    expect(at({ type: "boxplot", value: "v", group: "g" }, [1, 2, 3, 10, 11, 12].map((v, i) => ({ g: i < 3 ? "A" : "B", v })))).toContain("Here, B has the highest middle value, 11.");
    expect(at({ type: "variance", label: "region", value: "v", target: "budget" }, [{ region: "North", v: 105, budget: 100 }, { region: "South", v: 70, budget: 100 }])).toContain(
      "Here, 1 of 2 regions is over its budget, and South is furthest from it: 70 against 100.",
    );
    expect(at({ type: "variance", label: "region", value: "v", target: "budget" }, [{ region: "North", v: 105, budget: 100 }, { region: "West", v: 130, budget: 100 }, { region: "South", v: 90, budget: 100 }])).toContain(
      "Here, 2 of 3 regions are over their budget, and West is furthest from it: 130 against 100.",
    );
    expect(at({ type: "variance", label: "region", value: "v", target: "budget" }, [{ region: "North", v: 95, budget: 100 }])).toContain("Here, every region is at or under its budget, and North is furthest from it: 95 against 100.");
    expect(at({ type: "marimekko", x: "region", series: "p", value: "v" }, [{ region: "East", p: "a", v: 5 }, { region: "East", p: "b", v: 5 }, { region: "West", p: "a", v: 3 }])).toContain("Here, East is the widest column, with 10.");
    expect(at({ type: "gauge", value: "v", target: "t" }, [{ v: 42, t: 50 }])).toContain("Here, the needle is at 42, short of the goal of 50.");
    expect(at({ type: "bar", x: "region", y: ["a", "b"], stacked: true }, [{ region: "East", a: 5, b: 6 }, { region: "West", a: 4, b: 2 }])).toContain("Here, East has the tallest bar, with 11 in all.");
    expect(at({ type: "area", x: "week", y: ["a", "b"], stacked: "stream" }, [{ week: "1", a: 5, b: 1 }, { week: "2", a: 6, b: 2 }])).toContain("Here, a grew the most, from 5 in the week of 1 to 6 in the week of 2, and is the thickest band overall.");
    expect(at({ type: "candlestick", x: "day", open: "o", high: "h", low: "l", close: "c" }, [{ day: "1", o: 10, h: 12, l: 9, c: 11 }, { day: "2", o: 11, h: 11, l: 9, c: 10 }, { day: "3", o: 10, h: 13, l: 10, c: 12 }])).toContain("Here, 2 of 3 days went up.");
  });

  test("candles are read by their shape, never by color alone, in the chart's own time step, with the average line explained", () => {
    const guide = (view: Record<string, unknown>) => explainChart({ data: { type: "inline", rows: [] }, view: { type: "candlestick", open: "o", high: "h", low: "l", close: "c", ...view } });
    expect(guide({ x: "day", average: 5 })).toBe(
      "Each candle is one day. The thick box goes from the opening price to the closing price and the thin line from the lowest to the highest. Hollow candles went up, filled candles went down. The line is the average of the last 5 closing prices.",
    );
    expect(guide({ x: "week" })).toBe("Each candle is one week. The thick box goes from the opening price to the closing price and the thin line from the lowest to the highest. Hollow candles went up, filled candles went down.");
    expect(guide({ x: "week" })).not.toMatch(/blue|red/i);
    const weeks = [{ week: "1", o: 10, h: 12, l: 9, c: 11 }, { week: "2", o: 11, h: 11, l: 9, c: 10 }];
    expect(explainChart({ data: { type: "inline", rows: [] }, view: { type: "candlestick", x: "week", open: "o", high: "h", low: "l", close: "c" } }, weeks)).toContain("Here, 1 of 2 weeks went up.");
  });

  test("the last charts point at their standout too: flows, profiles, dots, goals, tasks, lists and big numbers", () => {
    const at = (view: Record<string, unknown>, rows: Record<string, unknown>[]) => explainChart({ ...spec(view), locale: "en-US" }, rows);
    expect(at({ type: "sankey", source: "from", target: "to", value: "n" }, [{ from: "Search", to: "Pricing", n: 40 }, { from: "Email", to: "Home", n: 10 }])).toContain("Here, the thickest band goes from Search to Pricing, with 40.");
    expect(at({ type: "chord", source: "from", target: "to", value: "n" }, [{ from: "Starter", to: "Growth", n: 120 }, { from: "Pro", to: "Growth", n: 18 }])).toContain("Here, the thickest band joins Starter and Growth, with 120.");
    expect(at({ type: "radar", label: "attribute", y: ["us", "market"] }, [{ attribute: "Speed", us: 8, market: 6 }, { attribute: "Price", us: 6, market: 7 }])).toContain("Here, us is ahead of market on 1 of 2 attributes, most on Speed (8 against 6), and behind on Price (6 against 7).");
    expect(at({ type: "beeswarm", value: "v", label: "deal" }, [{ deal: "Acme", v: 9 }, { deal: "Bolt", v: 4 }])).toContain("Here, the dot furthest right is Acme, at 9.");
    expect(at({ type: "beeswarm", value: "size", label: "deal" }, [])).toContain("Each dot is one deal, placed by its size.");
    expect(at({ type: "rings", label: "p", value: "v", target: "t" }, [{ p: "Core", v: 9, t: 10 }, { p: "Plus", v: 5, t: 10 }])).toContain("Here, Core is closest to its goal, at 90%.");
    expect(at({ type: "bullet", label: "kpi", value: "v", target: "t" }, [{ kpi: "Leads", v: 12, t: 10 }, { kpi: "Calls", v: 8, t: 10 }, { kpi: "Deals", v: 11, t: 10 }])).toContain("Here, 2 of 3 have passed their goal.");
    expect(at({ type: "timeline", label: "task", start: "s", end: "e", progress: "p" }, [{ task: "Build", s: "2026-08-01", e: "2026-10-01", p: 0.5 }, { task: "Launch", s: "2026-11-01", e: "2026-11-02", p: 0 }])).toContain("Here, no task is done yet and 1 is under way; the longest, Build, is 50% done.");
    expect(at({ type: "kpi", value: "v" }, [{ v: 10 }, { v: 12 }])).toContain("Here, it is 12, up from 10.");
    expect(at({ type: "list", label: "name", value: "v" }, [{ name: "Aurora", v: 9 }, { name: "Bell", v: 7 }])).toContain("Here, Aurora is at the top, with 9.");
    expect(at({ type: "list", label: "name", value: "revenue" }, [])).toContain("Each line is one entry, with its revenue on the right.");
  });

  test("tables, percent stacks, ridgelines and lines with several series get an example too", () => {
    const at = (view: Record<string, unknown>, rows: Record<string, unknown>[]) => explainChart({ ...spec(view), locale: "en-US" }, rows);
    expect(at({ type: "line", x: "m", y: ["revenue", "cost"] }, [{ m: "Jan", revenue: 10, cost: 8 }, { m: "Feb", revenue: 14, cost: 9 }])).toContain("Here, revenue went from 10 in Jan to 14 in Feb.");
    expect(at({ type: "bar", x: "region", y: ["core", "plus"], stacked: "percent" }, [{ region: "East", core: 65, plus: 35 }, { region: "West", core: 50, plus: 50 }])).toContain("Here, the largest share is core in East, at 65%.");
    expect(at({ type: "area", x: "m", y: ["a", "b"], stacked: "percent" }, [{ m: "Jan", a: 50, b: 50 }, { m: "Feb", a: 30, b: 70 }])).toContain("Here, b grew its share the most, from 50% in Jan to 70% in Feb, and is now the largest share.");
    expect(at({ type: "ridgeline", value: "v", group: "g" }, [1, 2, 3, 10, 11, 12].map((v, i) => ({ g: i < 3 ? "A" : "B", v })))).toContain("Here, B sits furthest right, with a middle value of 11.");
    expect(at({ type: "table" }, [{ region: "North", revenue: 12, cost: 5 }, { region: "East", revenue: 20, cost: 9 }])).toContain("Here, East is the top row by revenue, at 20.");
    // A table of months points at the latest month.
    expect(at({ type: "table" }, [{ region: "North", "2026-08": 9, "2026-09": 14 }, { region: "East", "2026-08": 12, "2026-09": 11 }])).toContain("Here, 1 of 2 regions grew from 2026-08 to 2026-09, and North grew the most, from 9 to 14.");
  });

  test("color scales are described the same way in light and dark themes, never as darker, which flips on a dark card", () => {
    const at = (view: Record<string, unknown>, rows: Record<string, unknown>[] = []) => explainChart({ ...spec(view), locale: "en-US" }, rows);
    const texts = [
      explainChart({ ...spec({ type: "calendar", date: "day", value: "orders" }, { day: { format: { type: "date" } } }), locale: "en-US" }, [{ day: "2026-09-15", orders: 225 }, { day: "2026-09-16", orders: 100 }]),
      at({ type: "heatmap", x: "hour", y: "day", value: "n" }, [{ hour: "9", day: "Mon", n: 4 }]),
      at({ type: "horizon", x: "day", y: ["a", "b"] }, [{ day: "1", a: 1, b: -1 }]),
      at({ type: "made-up-view" }),
    ];
    expect(texts.filter((t) => /\bdark(er|est)\b/i.test(t))).toEqual([]);
    expect(texts[0]).toContain("The stronger the color, the more orders; the key under the chart shows the scale. Here, the top day is Sep 15, 2026, with 225.");
  });

  test("bars with a target line say what the line is and how many periods beat it", () => {
    const view = { type: "bar", x: "month", y: "revenue", lines: "target" };
    const rows = [
      { month: "Jul", revenue: 10, target: 9 },
      { month: "Aug", revenue: 8, target: 9 },
      { month: "Sep", revenue: 12, target: 11 },
    ];
    expect(explainChart({ ...spec(view), locale: "en-US" }, rows)).toBe(
      "Each bar is one month. The taller the bar, the more revenue. The line is the target: a bar that reaches past it beat the target, and an outlined bar fell short. Here, revenue beat the target in 2 of 3 months.",
    );
  });

  test("a dashed target line is named, bars are counted against it, and a line says whether it ended past it", () => {
    const teams = [
      { team: "Technical", minutes: 95 },
      { team: "Billing", minutes: 40 },
      { team: "Sales", minutes: 70 },
      { team: "Onboarding", minutes: 50 },
    ];
    const lollipops = explainChart({ ...spec({ type: "bar", x: "team", y: "minutes", mark: "lollipop", reference: [{ value: 60, label: "1 hour target" }] }), locale: "en-US" }, teams);
    expect(lollipops).toContain("The dashed line is the 1 hour target.");
    expect(lollipops).toContain("Here, 2 of 4 teams are above the 1 hour target, and Technical has the highest dot, with 95.");
    const months = [
      { month: "Oct", revenue: 820, cost: 600 },
      { month: "Sep", revenue: 1284, cost: 700 },
    ];
    const line = explainChart({ ...spec({ type: "line", x: "month", y: ["revenue", "cost"], reference: [{ value: 1200, label: "Target" }] }), locale: "en-US" }, months);
    expect(line).toContain("The dashed line is the target.");
    expect(line).toContain("Here, revenue went from 820 in Oct to 1,284 in Sep, past the target of 1,200.");
    const average = explainChart({ ...spec({ type: "bar", x: "team", y: "minutes", reference: [{ field: "minutes", agg: "avg", label: "Average" }] }), locale: "en-US" }, teams);
    expect(average).not.toContain("target");
  });

  test("a headline number with a target says what the line under it means, and where the latest ended", () => {
    const view = { type: "kpi", value: "revenue", series: true, x: "month", target: "target" };
    const rows = [
      { month: "Aug", revenue: 1100, target: 1150 },
      { month: "Sep", revenue: 1284, target: 1200 },
    ];
    expect(explainChart({ ...spec(view), locale: "en-US" }, rows)).toBe(
      "The big number is revenue. The small arrow says whether it went up or down since last time, and the line under it says whether it reached its target. Here, it is 1,284, up from 1,100, past its target of 1,200.",
    );
    expect(explainChart({ ...spec({ ...view, goodWhen: "down" }), locale: "en-US" }, rows)).toContain("Here, it is 1,284, up from 1,100, above its target of 1,200.");
  });

  test("a row of tiles says what a tile's target line means, only when a tile has one", () => {
    const tiles = (items: Record<string, unknown>[]) => explainChart({ ...spec({ type: "kpis", items }), locale: "en-US" });
    expect(tiles([{ value: "revenue", target: "target" }, { value: "profit" }])).toBe(
      "Each tile is one key number, with a small arrow that says whether it went up or down since last time. A line under a tile says whether it reached its target.",
    );
    expect(tiles([{ value: "revenue" }])).not.toContain("target");
  });

  test("a pipeline of shrinking stages says how many made it from the first stage to the last", () => {
    const rows = [
      { stage: "New leads", leads: 1240 },
      { stage: "Contacted", leads: 870 },
      { stage: "Won", leads: 96 },
    ];
    expect(explainChart({ ...spec({ type: "hbar", label: "stage", value: "leads" }), locale: "en-US" }, rows)).toContain("Here, 96 of 1,240 leads made it from New leads to Won (8%).");
  });

  test("a forecast says where the line is heading, and how sure it is, after where it has been", () => {
    const view = { type: "line", x: "month", y: "revenue", forecast: "forecast", band: { low: "low", high: "high", label: "80% range" } };
    const rows = [
      { month: "Oct", revenue: 820 },
      { month: "Sep", revenue: 1284 },
      { month: "Dec", revenue: 1400, low: 1250, high: 1550, forecast: true },
      { month: "Mar", revenue: 1500, low: 1200, high: 1800, forecast: true },
    ];
    expect(explainChart({ ...spec(view), locale: "en-US" }, rows)).toContain(
      "Here, it went from 820 in Oct to 1,284 in Sep, and is expected to reach 1,500 by Mar, most likely between 1,200 and 1,800.",
    );
    const noBand = explainChart({ ...spec({ ...view, band: undefined }), locale: "en-US" }, rows);
    expect(noBand).toContain("and is expected to reach 1,500 by Mar.");
  });

  test("a scatter answers whether the two numbers move together, in plain words, before naming the highest dot", () => {
    const at = (rows: Record<string, unknown>[]) =>
      explainChart({ ...spec({ type: "scatter", x: "days", y: "value", label: "deal" }, { days: { label: "Days to close" }, value: { label: "Deal value" } }), locale: "en-US" }, rows);
    const rising = Array.from({ length: 8 }, (_, i) => ({ deal: `D${i}`, days: 10 + i * 10, value: 50 + i * 20 }));
    expect(at(rising)).toContain("Here, when days to close go up, deal value clearly goes up too. D7 sits highest, with the most deal value.");
    const loose = [10, 20, 30, 40, 50, 60, 70, 80].map((days, i) => ({ deal: `D${i}`, days, value: [60, 40, 90, 50, 70, 110, 60, 100][i] }));
    expect(at(loose)).toContain("Here, more days to close tends to come with more deal value, but not always.");
    const flat = [10, 20, 30, 40, 50, 60, 70, 80].map((days, i) => ({ deal: `D${i}`, days, value: [70, 40, 90, 60, 50, 80, 40, 70][i] }));
    expect(at(flat)).toContain("Here, days to close and deal value barely move together.");
    const falling = rising.map((row) => ({ ...row, value: 300 - (row.value as number) }));
    expect(at(falling)).toContain("Here, when days to close go up, deal value clearly goes down.");
  });

  test("a Pareto says how few causes make up most of the total, and names them", () => {
    const rows = [
      { cause: "Billing questions", tickets: 286 },
      { cause: "Login problems", tickets: 412 },
      { cause: "Slow pages", tickets: 198 },
      { cause: "Integrations", tickets: 121 },
      { cause: "Exports", tickets: 77 },
      { cause: "Notifications", tickets: 52 },
      { cause: "Permissions", tickets: 38 },
      { cause: "Other", tickets: 26 },
    ];
    const at = (view: Record<string, unknown>) => explainChart({ ...spec(view), locale: "en-US" }, rows);
    expect(at({ type: "pareto", label: "cause", value: "tickets" })).toContain(
      "Here, 4 of 8 causes make up 84% of the tickets: Login problems, Billing questions, Slow pages and Integrations.",
    );
    expect(at({ type: "pareto", label: "cause", value: "tickets", threshold: 0.5 })).toContain("Here, 2 of 8 causes make up 58% of the tickets: Login problems and Billing questions.");
    const lopsided = [{ cause: "Login", tickets: 900 }, { cause: "Other", tickets: 100 }, { cause: "Rest", tickets: 50 }];
    expect(explainChart({ ...spec({ type: "pareto", label: "cause", value: "tickets" }), locale: "en-US" }, lopsided)).toContain("Here, Login alone makes up 86% of the tickets.");
  });

  test("comparisons count first: how many went up, or for how many one value beats the other, then the biggest", () => {
    const at = (view: Record<string, unknown>, rows: Record<string, unknown>[]) => explainChart({ ...spec(view), locale: "en-US" }, rows);
    const years = [{ region: "North", q3_2025: 270, q3_2026: 278 }, { region: "South", q3_2025: 240, q3_2026: 204 }, { region: "East", q3_2025: 291, q3_2026: 338 }];
    expect(at({ type: "dumbbell", label: "region", from: "q3_2025", to: "q3_2026" }, years)).toContain("Here, 2 of 3 regions went up, and East moved the most, from 291 to 338.");
    const money = [{ region: "North", revenue: 278, cost: 190 }, { region: "East", revenue: 338, cost: 247 }, { region: "West", revenue: 205, cost: 210 }];
    expect(at({ type: "bar", x: "region", y: ["revenue", "cost"] }, money)).toContain("Here, revenue is higher than cost for 2 of 3 regions, and East has the biggest gap: 338 against 247.");
    expect(at({ type: "bar", x: "region", y: ["revenue", "cost", "profit"] }, money.map((r) => ({ ...r, profit: 1 })))).toContain("the tallest bar is East's revenue");
  });

  test("a bridge says where it started and landed, what added the most and what took the most away", () => {
    const rows = [
      { step: "Q2 revenue", amount: 1180000 },
      { step: "New customers", amount: 142000 },
      { step: "Upsell", amount: 58000 },
      { step: "Churn", amount: -84000 },
      { step: "Discounts", amount: -33000 },
    ];
    const at = (extra: Record<string, unknown>, data = rows) => explainChart({ ...spec({ type: "waterfall", label: "step", value: "amount", totals: ["Q2 revenue"], ...extra }), locale: "en-US" }, data);
    expect(at({ endLabel: "Q3 revenue" })).toContain("Here, it went from 1,180,000 (Q2 revenue) to 1,263,000 (Q3 revenue): New customers added the most, 142,000, and Churn took the most away, 84,000.");
    expect(at({ endLabel: "Q3 revenue" }, rows.slice(0, 3))).toContain("Here, it went from 1,180,000 (Q2 revenue) to 1,380,000 (Q3 revenue): New customers added the most, 142,000.");
  });

  test("a mix over time names the part that grew the most, and the leader when it is another part", () => {
    const at = (view: Record<string, unknown>, rows: Record<string, unknown>[]) => explainChart({ ...spec(view), locale: "en-US" }, rows);
    const weeks = [{ week: "Mar 30", paid: 50, search: 10 }, { week: "Sep 21", paid: 52, search: 30 }];
    expect(at({ type: "area", x: "week", y: ["paid", "search"], stacked: "stream" }, weeks)).toContain(
      "Here, search grew the most, from 10 in the week of Mar 30 to 30 in the week of Sep 21; paid is still the thickest band overall.",
    );
    const days = [{ day: "Sep 1", orders: 10 }, { day: "Sep 15", orders: 25 }];
    expect(at({ type: "line", x: "day", y: "orders" }, days)).toContain("Here, it went from 10 on Sep 1 to 25 on Sep 15.");
    const mix = [{ m: "Jan", core: 70, plus: 20, add: 10 }, { m: "Sep", core: 55, plus: 20, add: 25 }];
    expect(at({ type: "area", x: "m", y: ["core", "plus", "add"], stacked: "percent" }, mix)).toContain("Here, add grew its share the most, from 10% in Jan to 25% in Sep; core is still the largest share, at 55%.");
  });

  test("a table of months laid sideways says how many rows grew from the first month to the last, and who grew most", () => {
    const fields = { "2026-04": { label: "Apr" }, "2026-09": { label: "Sep" } };
    const rows = [
      { region: "East", "2026-04": 52, "2026-09": 65 },
      { region: "North", "2026-04": 44, "2026-09": 48 },
    ];
    expect(explainChart({ ...spec({ type: "table" }, fields), locale: "en-US" }, rows)).toContain("Here, every region grew from Apr to Sep, and East grew the most, from 52 to 65.");
    const falling = rows.map((r) => ({ ...r, "2026-09": (r["2026-04"] as number) - 5 }));
    expect(explainChart({ ...spec({ type: "table" }, fields), locale: "en-US" }, falling)).toContain("Here, East is the top row in Sep, at 47.");
  });

  test("a heat table of months says what its rows, columns and shading mean", () => {
    const heat = { type: "heat" };
    const view = { type: "table", columns: ["region", "2026-04", "2026-05", "2026-06"] };
    const fields = { region: { label: "Region" }, "2026-04": { format: heat }, "2026-05": { format: heat }, "2026-06": { format: heat } };
    expect(explainChart({ ...spec(view, fields), locale: "en-US" })).toBe(
      "Each row is one region and each column one month. The stronger the shade, the bigger the number. Click a column heading to sort by it.",
    );
  });

  test("a table with a column of gaps against target counts and names who is above it", () => {
    const fields = { vsTarget: { label: "vs target", format: { type: "delta" } } };
    const rows = [
      { region: "Central", revenue: 259, vsTarget: 0.036 },
      { region: "North", revenue: 278, vsTarget: 0.03 },
      { region: "West", revenue: 205, vsTarget: -0.068 },
      { region: "East", revenue: 338, vsTarget: -0.081 },
    ];
    const at = (data: Record<string, unknown>[]) => explainChart({ ...spec({ type: "table", columns: ["region", "revenue", "vsTarget"] }, fields), locale: "en-US" }, data);
    expect(at(rows)).toContain("Here, 2 of 4 regions are above target: Central and North.");
    expect(at(rows.map((r) => ({ ...r, vsTarget: -Math.abs(r.vsTarget) - 0.01 })))).toContain("Here, every region is below target.");
  });

  test("a calendar names the weekly rhythm first: the busiest and quietest weekdays on average, then the top day", () => {
    // Four weeks from Monday 2026-09-07: weekdays 150 (Wednesdays 170), weekends 50, and one peak day.
    const rows = Array.from({ length: 28 }, (_, i) => {
      const day = new Date(Date.UTC(2026, 8, 7 + i));
      const weekday = day.getUTCDay();
      const orders = weekday === 0 || weekday === 6 ? 50 : weekday === 3 ? 170 : 150;
      return { day: day.toISOString().slice(0, 10), orders: i === 8 ? 225 : orders };
    });
    const at = (data: Record<string, unknown>[]) => explainChart({ ...spec({ type: "calendar", date: "day", value: "orders" }), locale: "en-US" }, data);
    expect(at(rows)).toContain("Here, weekdays are much busier than weekends: Wednesday averages the most, 170, and Saturday the least, 50. The top day was 2026-09-15, with 225.");
    expect(at(rows.slice(0, 10))).toContain("Here, the top day is 2026-09-15, with 225.");
  });

  test("a spread names the group that varies the most, by its middle half, after the highest middle value", () => {
    const rows = [
      ...[40, 50, 60, 70, 80].map((v) => ({ region: "North", value: v })),
      ...[100, 108, 110, 112, 120].map((v) => ({ region: "East", value: v })),
    ];
    expect(explainChart({ ...spec({ type: "boxplot", value: "value", group: "region" }), locale: "en-US" }, rows)).toContain(
      "Here, East has the highest middle value, 110. North varies the most: its middle half runs from 50 to 70.",
    );
    expect(explainChart({ ...spec({ type: "ridgeline", value: "value", group: "region" }), locale: "en-US" }, rows)).toContain(
      "Here, East sits furthest right, with a middle value of 110. North varies the most: its middle half runs from 50 to 70.",
    );
    const both = [...[10, 11, 12].map((v) => ({ region: "North", value: v })), ...[60, 100, 140].map((v) => ({ region: "East", value: v }))];
    expect(explainChart({ ...spec({ type: "boxplot", value: "value", group: "region" }), locale: "en-US" }, both)).toContain(
      "Here, East has the highest middle value, 100, and varies the most: its middle half runs from 80 to 120.",
    );
  });

  test("a dot swarm by group compares the groups first, then names the biggest single dot", () => {
    const rows = [
      { deal: "N1", region: "North", value: 40 },
      { deal: "N2", region: "North", value: 60 },
      { deal: "S1", region: "South", value: 20 },
      { deal: "S2", region: "South", value: 180 },
      { deal: "S3", region: "South", value: 30 },
      { deal: "E1", region: "East", value: 100 },
      { deal: "E2", region: "East", value: 120 },
    ];
    expect(explainChart({ ...spec({ type: "beeswarm", value: "value", group: "region", label: "deal" }), locale: "en-US" }, rows)).toContain(
      "Here, East's dots sit furthest right, with a middle value of 110, and the dot furthest right of all is S2, at 180.",
    );
  });

  test("a plan with progress says how much is done and under way, and how far along the longest task is", () => {
    const rows = [
      { task: "Research", start: "2026-08-03", end: "2026-08-28", done: 1 },
      { task: "Design", start: "2026-08-24", end: "2026-09-25", done: 1 },
      { task: "Build", start: "2026-09-21", end: "2026-11-13", done: 0.55 },
      { task: "Beta", start: "2026-11-09", end: "2026-11-27", done: 0 },
      { task: "Launch day", start: "2026-11-30" },
    ];
    const at = (view: Record<string, unknown>) => explainChart({ ...spec({ type: "timeline", label: "task", start: "start", end: "end", ...view }), locale: "en-US" }, rows);
    expect(at({ progress: "done" })).toContain("Here, 2 of 4 tasks are done and 1 is under way; the longest, Build, is 55% done.");
    expect(at({})).toContain("Here, the longest task is Build.");
  });

  test("a radar of two series counts where the first leads, then names its biggest lead and its biggest gap", () => {
    const fields = { us: { label: "Our product" }, market: { label: "Market average" } };
    const rows = [
      { attribute: "Speed", us: 8.6, market: 6.9 },
      { attribute: "Support", us: 8.2, market: 6.4 },
      { attribute: "Price", us: 6.1, market: 7.4 },
    ];
    const at = (data: Record<string, unknown>[]) => explainChart({ ...spec({ type: "radar", label: "attribute", y: ["us", "market"] }, fields), locale: "en-US" }, data);
    expect(at(rows)).toContain("Here, our product is ahead of market average on 2 of 3 attributes, most on Support (8.2 against 6.4), and behind on Price (6.1 against 7.4).");
    expect(at(rows.slice(0, 2))).toContain("Here, our product is ahead of market average on every attribute, most on Support (8.2 against 6.4).");
    expect(explainChart({ ...spec({ type: "radar", label: "attribute", y: ["us"] }, fields), locale: "en-US" }, rows)).toContain("Here, the highest score is Speed, at 8.6.");
  });

  test("no guide names a hue or a dark shade: presets recolor and dark themes flip, so marks are read by side, shape and fill", () => {
    const guide = (view: Record<string, unknown>) => explainChart({ ...spec(view), locale: "en-US" });
    expect(guide({ type: "variance", label: "department", value: "actual", target: "budget", goodWhen: "down" })).toBe(
      "Each bar shows how far one department is from its budget: to the right when above it, to the left when below, with the gap written beside it. Below the budget is better. The longer the bar, the bigger the gap.",
    );
    expect(guide({ type: "variance", label: "region", value: "revenue", target: "target" })).toContain(" Above the target is better.");
    expect(guide({ type: "bullet", label: "kpi", value: "actual", target: "target" })).toBe("The solid bar is the real number and the thin line is the goal. The shaded bands behind show poor, fair and good.");
    expect(guide({ type: "horizon", x: "day", y: ["a", "b"] })).toBe(
      "Each row is one of A or B, day by day. Values above the baseline rise from the bottom of the row, and values below hang from its top; the stronger the shade, the further away it is.",
    );
    const views = ["variance", "bullet", "horizon", "candlestick", "heatmap", "calendar", "waterfall", "kpi", "bar", "line"];
    const all = views.map((type) => guide({ type, x: "day", y: ["a", "b"], label: "l", value: "v", target: "t", open: "o", high: "h", low: "l", close: "c" }));
    expect(all.filter((t) => /\b(blue|red|green|orange|purple|pink|dark)\b/i.test(t))).toEqual([]);
  });

  test("proofread: entries not names, small multiples, changes between periods, sorting only when on", () => {
    const at = (view: Record<string, unknown>, rows: Record<string, unknown>[] = [], extra: Partial<WidgetSpec> = {}) => explainChart({ ...spec(view), locale: "en-US", ...extra }, rows);
    expect(at({ type: "treemap", label: "name", value: "revenue" })).toContain("Each box is one entry.");
    const panels = at({ type: "area", x: "month", y: "revenue" }, [{ region: "North", month: "Jan", revenue: 1 }, { region: "West", month: "Feb", revenue: 9 }], { facet: { field: "region" } });
    expect(panels).toContain("There is one small chart for each region, all on the same scale.");
    expect(panels).not.toContain("Here,");
    const years = at({ type: "dumbbell", label: "region", from: "q3_2025", to: "q3_2026" }, [{ region: "East", q3_2025: 291, q3_2026: 338 }]);
    expect(years).toContain("The line between them is the change.");
    expect(years).toContain("Here, East moved the most, from 291 to 338.");
    // Sorting is on unless a table turns it off.
    expect(at({ type: "table" })).toContain("Click a column heading to sort by it.");
    expect(at({ type: "table", sortable: false })).not.toContain("sort");
  });
});

