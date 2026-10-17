import { describe, expect, test } from "vitest";
import { baseWidget } from "./base.ts";
import { hasErrors, validateSpec } from "./validate.ts";
import type { WidgetSpec } from "./types.ts";

const good: WidgetSpec = {
  title: "Revenue by region",
  data: { type: "inline", rows: [{ region: "North", revenue: 120 }] },
  transform: [{ type: "sort", field: "revenue", order: "desc" }],
  fields: { revenue: { label: "Revenue", format: { type: "currency", currency: "EUR" } } },
  view: { type: "bar", x: "region", y: "revenue" },
  style: { theme: "dark", height: 200 },
};

function messages(spec: unknown, rows?: Record<string, unknown>[]) {
  return validateSpec(spec, rows).map((i) => `${i.level} ${i.path}: ${i.message}`);
}

describe("validateSpec", () => {
  test("a correct spec has no issues", () => {
    expect(validateSpec(good)).toEqual([]);
  });

  test("the vanilla base widget is valid", () => {
    expect(validateSpec(baseWidget)).toEqual([]);
  });

  test("something that is not an object is rejected", () => {
    expect(messages("bar chart")).toEqual(["error spec: A widget spec must be an object with at least data and view."]);
  });

  test("missing data and view are both reported", () => {
    expect(messages({ title: "x" })).toEqual([
      'error data: Every widget needs data, for example { "type": "inline", "rows": [] }.',
      'error view: Every widget needs a view, for example { "type": "table" }.',
    ]);
  });

  test("area stacking takes true, percent or stream, and names them when it gets anything else", () => {
    const area = (stacked: unknown) => messages({ ...good, view: { type: "area", x: "region", y: "revenue", stacked } });
    expect(area("stream")).toEqual([]);
    expect(area("sideways")).toEqual(['error view: stacked must be true, false, "percent" or "stream".']);
  });

  test("an unknown view type names the views that exist", () => {
    const [only, ...rest] = messages({ ...good, view: { type: "pie" } });
    expect(rest).toEqual([]);
    expect(only).toMatch(/^error view\.type: Unknown view "pie"\. Available: .*\bbar\b.*\btable\b.*\.$/);
  });

  test("a missing required option is reported with what it is for", () => {
    expect(messages({ ...good, view: { type: "bar", y: "revenue" } })).toEqual([
      "error view.x: Required. Field for the categories along the horizontal axis.",
    ]);
  });

  test("an option of the wrong kind is reported", () => {
    expect(messages({ ...good, transform: [{ type: "limit", count: "5" }] })).toEqual(["error transform[0].count: Must be a number."]);
  });

  test("an enum option outside its values lists the allowed ones", () => {
    expect(messages({ ...good, transform: [{ type: "sort", field: "revenue", order: "up" }] })).toEqual([
      "error transform[0].order: Must be one of asc, desc.",
    ]);
  });

  test("fields options accept one name or a list of names", () => {
    expect(validateSpec({ ...good, view: { type: "line", x: "region", y: ["revenue", "cost"] } })).toEqual([]);
    expect(messages({ ...good, view: { type: "line", x: "region", y: [1] } })).toEqual([
      "error view.y: Must be a field name or a list of field names.",
    ]);
  });

  test("a block's own checks are reported at the block", () => {
    expect(messages({ ...good, transform: [{ type: "aggregate", measures: [{ op: "sum" }] }] })).toEqual([
      "error transform[0]: measures[0] needs a field for sum.",
    ]);
  });

  test("transform must be a list", () => {
    expect(messages({ ...good, transform: { type: "sort" } })).toEqual(["error transform: Must be a list of steps."]);
  });

  test("an unknown format in fields is reported", () => {
    const [only, ...rest] = messages({ ...good, fields: { revenue: { format: "money" } } });
    expect(rest).toEqual([]);
    expect(only).toMatch(/^error fields\.revenue\.format: Unknown format "money"\. Available: .*\bcurrency\b.*\bpercent\b.*\.$/);
  });

  test("bad style values are reported", () => {
    expect(messages({ ...good, style: { theme: "blue", height: -5, palette: 7 } })).toEqual([
      "error style.theme: Must be one of auto, light, dark.",
      "error style.palette: Must be a list of CSS colors or a palette name.",
      "error style.height: Must be a positive number of pixels.",
    ]);
  });

  test("with rows, view fields missing from the data are warnings that list the real fields", () => {
    expect(messages({ ...good, view: { type: "bar", x: "region", y: "revnue" } }, [{ region: "North", revenue: 1 }])).toEqual([
      'warning view.y: Field "revnue" is not in the data. Fields: region, revenue.',
    ]);
  });

  test("more series than palette colors is a warning, since colors would repeat", () => {
    const nine = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
    expect(messages({ ...good, view: { type: "line", x: "region", y: nine } })).toEqual([
      'warning view.y: 9 series but only 8 colors, so colors would repeat. Fold the smallest series into an "Other" series or split the chart.',
    ]);
    expect(messages({ ...good, view: { type: "line", x: "region", y: ["a", "b", "c"] }, style: { palette: ["red", "blue"] } })).toEqual([
      'warning view.y: 3 series but only 2 colors, so colors would repeat. Fold the smallest series into an "Other" series or split the chart.',
    ]);
  });

  test("style.palette takes a list of colors or the name of a library palette", () => {
    expect(validateSpec({ ...good, style: { palette: "apple" } })).toEqual([]);
    expect(validateSpec({ ...good, style: { palette: ["#111111", "tomato"] } })).toEqual([]);
    const [only] = messages({ ...good, style: { palette: "pastel" } });
    expect(only).toMatch(/^error style\.palette: Unknown palette "pastel"\. Available: .*\bapple\b.*\bbw\b/);
  });

  test("style.preset must name a registered preset", () => {
    expect(validateSpec({ ...good, style: { preset: "glass" } })).toEqual([]);
    const [only, ...rest] = messages({ ...good, style: { preset: "neon" } });
    expect(rest).toEqual([]);
    expect(only).toMatch(/^error style\.preset: Unknown preset "neon"\. Available: .*\bdefault\b.*\bglass\b.*\.$/);
  });

  test("a donut with more than 6 slices warns, since slices that thin are hard to compare", () => {
    const rows = ["a", "b", "c", "d", "e", "f", "g"].map((k) => ({ k, v: 1 }));
    expect(messages({ ...good, view: { type: "donut", label: "k", value: "v" } }, rows)).toEqual([
      'warning view: 7 slices. Past 6 they get hard to compare: fold the smallest into "Other", or use a bar chart.',
    ]);
  });

  test("a donut warns about rows it has to leave out", () => {
    const rows = [{ k: "a", v: 3 }, { k: "b", v: 0 }, { k: "c", v: -2 }];
    expect(messages({ ...good, view: { type: "donut", label: "k", value: "v" } }, rows)).toEqual([
      "warning view: 2 rows with zero, negative or missing values are left out of the donut.",
    ]);
  });

  test("a headline needs a value field and known options", () => {
    expect(validateSpec({ ...good, headline: { value: "revenue", agg: "sum", compare: "previous", goodWhen: "up", caption: "total" } })).toEqual([]);
    expect(messages({ ...good, headline: { agg: "median" } })).toEqual([
      "error headline.value: Required. Field holding the headline number.",
      "error headline.agg: Must be one of last, first, sum, avg, min, max.",
    ]);
  });

  test("with rows, a headline field missing from the data is a warning", () => {
    expect(messages({ ...good, headline: { value: "revnue" } }, [{ region: "North", revenue: 1 }])).toEqual([
      'warning headline.value: Field "revnue" is not in the data. Fields: region, revenue.',
    ]);
  });

  test("a scatter with more than 3 groups warns, since only 3 colors stay distinct", () => {
    const rows = ["a", "b", "c", "d"].map((g, i) => ({ g, x: i, y: i }));
    expect(messages({ ...good, view: { type: "scatter", x: "x", y: "y", series: "g" } }, rows)).toEqual([
      'warning view: 4 groups. Only 3 scatter colors stay distinct for colorblind readers: fold the rest into "Other" or split the chart.',
    ]);
  });

  test("a slope chart with more than 13 rows warns, since the labels crowd", () => {
    const rows = Array.from({ length: 14 }, (_, i) => ({ name: `R${i}`, a: i, b: i + 1 }));
    expect(messages({ ...good, view: { type: "slope", label: "name", from: "a", to: "b" } }, rows)).toEqual([
      "warning view: 14 rows crowd a slope chart. Keep the 13 that matter most (limit or filter), or use a dumbbell.",
    ]);
  });

  test("a bump chart with more than 8 series warns, since colors would repeat", () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({ m: "Jan", s: `S${i}`, v: i }));
    expect(messages({ ...good, view: { type: "bump", x: "m", series: "s", value: "v" } }, rows)).toEqual([
      'warning view: 9 series but only 8 colors. Highlight the few that matter, or fold the rest into "Other".',
    ]);
  });

  test("a marimekko with more than 8 series warns, since colors would repeat", () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({ r: "A", s: `S${i}`, v: 1 }));
    expect(messages({ ...good, view: { type: "marimekko", x: "r", series: "s", value: "v" } }, rows)).toEqual([
      'warning view: 9 series but only 8 colors. Fold the smallest into "Other".',
    ]);
  });

  test("a histogram of fewer than 5 values warns, since bins that sparse mislead", () => {
    const rows = [1, 2, 3].map((v) => ({ v }));
    expect(messages({ ...good, view: { type: "histogram", value: "v" } }, rows)).toEqual([
      "warning view: Only 3 values: too few for a histogram. A beeswarm or table shows each one.",
    ]);
  });

  test("a field that should hold numbers but holds none is a data warning", () => {
    const rows = [{ region: "North", revenue: 1 }];
    expect(messages({ ...good, view: { type: "hbar", label: "region", value: "region" } }, rows)).toEqual([
      'warning view.value: Field "region" holds no numbers, but this option needs a numeric field. Number fields: revenue.',
    ]);
  });

  test("rings with more than 5 rows warn, since inner rings get too small to read", () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({ g: `G${i}`, v: 1, t: 2 }));
    expect(messages({ ...good, view: { type: "rings", label: "g", value: "v", target: "t" } }, rows)).toEqual([
      "warning view: 6 rings: inner rings get too small past 5. Use a meter or bullet view for longer lists.",
    ]);
  });

  test("a timeline task that ends before it starts is a data warning", () => {
    const rows = [{ t: "A", s: "2026-02-01", e: "2026-01-01" }, { t: "B", s: "2026-01-01", e: "2026-01-05" }];
    expect(messages({ ...good, view: { type: "timeline", label: "t", start: "s", end: "e" } }, rows)).toEqual([
      "warning view: 1 task ends before it starts: A.",
    ]);
  });

  test("a waffle with more than 8 categories warns, since colors would repeat", () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({ s: `S${i}`, v: 1 }));
    expect(messages({ ...good, view: { type: "waffle", label: "s", value: "v" } }, rows)).toEqual([
      'warning view: 9 categories but only 8 colors. Fold the smallest into "Other".',
    ]);
  });

  test("a text template naming a field not in the data is a data warning", () => {
    expect(messages({ ...good, subtitle: "{first:monht} to {last:month}" }, [{ region: "North", month: "2026-09", revenue: 1 }])).toEqual([
      'warning subtitle: {first:monht} names a field not in the data. Fields: region, month, revenue.',
    ]);
  });

  test("a box plot group with fewer than 5 values warns, since its quartiles mean little", () => {
    const rows = [...[1, 2, 3, 4, 5].map((v) => ({ g: "A", v })), { g: "B", v: 1 }, { g: "B", v: 2 }];
    expect(messages({ ...good, view: { type: "boxplot", value: "v", group: "g" } }, rows)).toEqual([
      "warning view: Groups with fewer than 5 values give shaky quartiles: B. A beeswarm shows every point instead.",
    ]);
  });

  test("a bin step needs a field, and bins must be a whole number of at least 1", () => {
    expect(messages({ ...good, transform: [{ type: "bin", field: "revenue", bins: 0 }] })).toEqual(["error transform[0]: bins must be a whole number of at least 1."]);
  });

  test("a candlestick row whose high or low does not contain its open and close is a data warning", () => {
    const rows = [{ d: "Mon", o: 10, h: 9, l: 8, c: 9.5 }, { d: "Tue", o: 10, h: 12, l: 9, c: 11 }];
    expect(messages({ ...good, view: { type: "candlestick", x: "d", open: "o", high: "h", low: "l", close: "c" } }, rows)).toEqual([
      "warning view: 1 row has a high below its open or close, or a low above them: Mon.",
    ]);
  });

  test("a sunburst with more than 8 top-level values warns, since colors would repeat", () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({ p: `P${i}`, r: "x", v: 1 }));
    expect(messages({ ...good, view: { type: "sunburst", levels: ["p", "r"], value: "v" } }, rows)).toEqual([
      'warning view: 9 top-level values but only 8 colors. Fold the smallest into "Other".',
    ]);
  });

  test("a chord with more than 8 groups warns, since colors would repeat", () => {
    const rows = Array.from({ length: 9 }, (_, i) => ({ s: `G${i}`, t: `G${(i + 1) % 9}`, v: 1 }));
    expect(messages({ ...good, view: { type: "chord", source: "s", target: "t", value: "v" } }, rows)).toEqual([
      'warning view: 9 groups but only 8 colors. Fold the smallest into "Other".',
    ]);
  });

  test("a radar warns with fewer than 3 axes or more than 3 series", () => {
    const two = [{ a: "x", s1: 1 }, { a: "y", s1: 2 }];
    expect(messages({ ...good, view: { type: "radar", label: "a", y: "s1" } }, two)).toEqual([
      "warning view: A radar needs at least 3 axes to make a shape; with 2, use a bar chart.",
    ]);
    const four = ["w", "x", "y", "z"].map((a) => ({ a, s1: 1, s2: 2, s3: 3, s4: 4 }));
    expect(messages({ ...good, view: { type: "radar", label: "a", y: ["s1", "s2", "s3", "s4"] } }, four)).toEqual([
      "warning view: 4 series overlap into a tangle on a radar; keep 3 or fewer, or use small multiples.",
    ]);
  });

  test("a facet needs a field, and a missing facet field is a data warning", () => {
    expect(validateSpec({ ...good, facet: { field: "region", columns: 2 } })).toEqual([]);
    expect(messages({ ...good, facet: { columns: 0 } })).toEqual(["error facet.field: Required. Field that splits the rows into one panel per value.", "error facet.columns: Must be a whole number, 1 or more."]);
    expect(messages({ ...good, facet: { field: "regon" } }, [{ region: "North", revenue: 1 }])).toEqual([
      'warning facet.field: Field "regon" is not in the data. Fields: region, revenue.',
    ]);
  });

  test("a KPI icon must come from the icon set", () => {
    expect(validateSpec({ ...good, view: { type: "kpi", value: "revenue", icon: "users" } })).toEqual([]);
    const [only] = messages({ ...good, view: { type: "kpi", value: "revenue", icon: "unicorn" } });
    expect(only).toMatch(/^error view\.icon: Must be one of .*\busers\b/);
  });

  test("reference marks need a value, a field, or a from-to band", () => {
    expect(validateSpec({ ...good, view: { ...good.view, reference: [{ value: 10, label: "Target" }, { field: "revenue", agg: "avg" }, { from: 1, to: 2 }] } })).toEqual([]);
    expect(messages({ ...good, view: { ...good.view, reference: [{ label: "Oops" }] } })).toEqual([
      "error view: reference[0] needs a value, a field, or from and to.",
    ]);
  });

  test("a KPI row needs a list of items, each naming a value field", () => {
    expect(validateSpec({ ...good, view: { type: "kpis", items: [{ value: "revenue" }, { value: "revenue", compare: "previous", goodWhen: "down" }] } })).toEqual([]);
    expect(messages({ ...good, view: { type: "kpis", items: [] } })).toEqual(["error view: items needs at least one entry."]);
    expect(messages({ ...good, view: { type: "kpis", items: [{ label: "x" }, { value: "revenue", goodWhen: "sideways" }] } })).toEqual([
      "error view: items[0] needs a value field.",
      "error view: items[1].goodWhen must be up or down.",
    ]);
  });

  test("hasErrors ignores warnings", () => {
    expect(hasErrors([{ level: "warning", path: "view.y", message: "x" }])).toBe(false);
    expect(hasErrors([{ level: "error", path: "view.y", message: "x" }])).toBe(true);
  });
});

describe("area extent for small multiples", () => {
  test("a stream spans half of each column's total either side of the center line", async () => {
    const { getBlock } = await import("./registry.ts");
    const rows = [{ m: "Jan", a: 10, b: 30 }, { m: "Feb", a: 50, b: 30 }];
    const extent = getBlock("view", "area").extent?.({ type: "area", x: "m", y: ["a", "b"], stacked: "stream" }, rows);
    expect([Math.min(...(extent ?? [])), Math.max(...(extent ?? []))]).toEqual([-40, 40]);
  });
});
