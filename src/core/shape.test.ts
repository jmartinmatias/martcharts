import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { applyTransforms, runPipeline } from "./pipeline.ts";
import { blockTypes, getBlock } from "./registry.ts";
import { foldRows, OTHER_LABEL, SHAPE_VIEWS, shapeRows } from "./shape.ts";
import type { Row, WidgetSpec } from "./types.ts";
import { validateSpec } from "./validate.ts";
import "./views.ts";

const clients: Row[] = [
  { client: "Aster", revenue: 120, cost: 40, target: 100 },
  { client: "Birch", revenue: 300, cost: 90, target: 250 },
  { client: "Cedar", revenue: 80, cost: 30, target: 90 },
  { client: "Dahlia", revenue: 210, cost: 70, target: 200 },
  { client: "Elm", revenue: 45, cost: 20, target: 60 },
];

describe("sort, limit and other give what the transforms give", () => {
  // Each view with the option names it reads: the label field and the measure it ranks by.
  const cases: [string, Record<string, unknown>][] = [
    ["hbar", { label: "client", value: "revenue" }],
    ["bar", { x: "client", y: "revenue" }],
    ["donut", { label: "client", value: "revenue" }],
    ["dot", { label: "client", value: "revenue" }],
    ["bullet", { label: "client", value: "revenue", target: "target" }],
    ["list", { label: "client", value: "revenue" }],
  ];
  test.each(cases)("%s: sort by value and keep the top 3", (type, options) => {
    const view = { type, ...options, sort: "value", limit: 3 };
    const viaTransforms = applyTransforms(clients, [
      { type: "sort", field: "revenue", order: "desc" },
      { type: "limit", count: 3 },
    ]);
    expect(shapeRows(view, clients)).toEqual(viaTransforms);
  });

  test.each(cases)("%s: smallest first with order asc, A to Z by label", (type, options) => {
    expect(shapeRows({ type, ...options, sort: "value", order: "asc" }, clients)).toEqual(applyTransforms(clients, [{ type: "sort", field: "revenue", order: "asc" }]));
    const label = String(options.label ?? options.x);
    expect(shapeRows({ type, ...options, sort: "label" }, [...clients].reverse()).map((row) => row[label])).toEqual(["Aster", "Birch", "Cedar", "Dahlia", "Elm"]);
  });
});

describe("other", () => {
  test("folds the rows past the limit into one last row, numbers summed, so the parts still add up", () => {
    const rows = shapeRows({ type: "donut", label: "client", value: "revenue", sort: "value", limit: 2, other: true }, clients);
    expect(rows.map((row) => row.client)).toEqual(["Birch", "Dahlia", OTHER_LABEL]);
    expect(rows[2]).toEqual({ client: "Other", revenue: 245, cost: 90, target: 250 });
    const total = (list: Row[]) => list.reduce((sum, row) => sum + (row.revenue as number), 0);
    expect(total(rows)).toBe(total(clients));
  });

  test("takes a name of its own, and shaping twice changes nothing", () => {
    const view = { type: "hbar", label: "client", value: "revenue", sort: "value", limit: 2, other: "All other clients" };
    const once = shapeRows(view, clients);
    expect(once.at(-1)?.client).toBe("All other clients");
    expect(shapeRows(view, once)).toEqual(once);
  });

  test("a field that differs across the folded rows is dropped, one that agrees is kept", () => {
    expect(foldRows([{ name: "a", region: "East", n: 1, owner: "X" }, { name: "b", region: "East", n: 2, owner: "Y" }], "name", "Other")).toEqual({ name: "Other", region: "East", n: 3 });
  });
});

describe("shaping", () => {
  test("stacked bars and strips rank by their total; others by the first measure", () => {
    const rows = [
      { region: "East", core: 10, plus: 50 },
      { region: "West", core: 30, plus: 5 },
    ];
    expect(shapeRows({ type: "bar", x: "region", y: ["core", "plus"], stacked: true, sort: "value" }, rows).map((r) => r.region)).toEqual(["East", "West"]);
    expect(shapeRows({ type: "bar", x: "region", y: ["core", "plus"], sort: "value" }, rows).map((r) => r.region)).toEqual(["West", "East"]);
    expect(shapeRows({ type: "strips", label: "region", value: ["core", "plus"], sort: "value" }, rows).map((r) => r.region)).toEqual(["East", "West"]);
  });

  test("missing numbers go last, and ties keep the data's order", () => {
    const rows = [{ k: "a", v: null }, { k: "b", v: 5 }, { k: "c", v: 5 }, { k: "d", v: 9 }];
    expect(shapeRows({ type: "hbar", label: "k", value: "v", sort: "value" }, rows).map((r) => r.k)).toEqual(["d", "b", "c", "a"]);
  });

  test("small multiples keep a top N per panel", () => {
    const rows = ["East", "West"].flatMap((region) => clients.map((row) => ({ ...row, region })));
    const shaped = shapeRows({ type: "hbar", label: "client", value: "revenue", sort: "value", limit: 2 }, rows, "region");
    expect(shaped.map((r) => `${r.region} ${r.client}`)).toEqual(["East Birch", "East Dahlia", "West Birch", "West Dahlia"]);
  });

  test("the pipeline shapes after the transforms, and leaves views without the options alone", async () => {
    const spec = { data: { type: "inline", rows: clients }, transform: [{ type: "filter", field: "revenue", op: ">", value: 50 }], view: { type: "hbar", label: "client", value: "revenue", sort: "value", limit: 2 } };
    expect((await runPipeline(spec)).map((r) => r.client)).toEqual(["Birch", "Dahlia"]);
    expect(await runPipeline({ data: { type: "inline", rows: clients }, view: { type: "hbar", label: "client", value: "revenue" } })).toEqual(clients);
    expect(await runPipeline({ data: { type: "inline", rows: clients }, view: { type: "sankey", source: "a", target: "b", value: "c", limit: 1 } })).toEqual(clients);
  });

  test("a canonical name is read through the aliases: strips ranked by value written as value", () => {
    const rows = [{ law: "A", must: 1, may: 1 }, { law: "B", must: 5, may: 5 }];
    expect(shapeRows({ type: "strips", label: "law", value: ["must", "may"], sort: "value", limit: 1 }, rows).map((r) => r.law)).toEqual(["B"]);
  });
});

describe("validation", () => {
  const spec = (view: Record<string, unknown>): WidgetSpec => ({ data: { type: "inline", rows: clients }, view: { type: "hbar", label: "client", value: "revenue", ...view } as WidgetSpec["view"] });
  const errors = (view: Record<string, unknown>) => validateSpec(spec(view), clients).filter((i) => i.level === "error").map((i) => i.message);

  test("limit is a whole number, other needs a limit, sort takes value, label or none", () => {
    expect(errors({ sort: "value", order: "asc", limit: 3, other: true })).toEqual([]);
    expect(errors({ limit: 0 }).join(" ")).toMatch(/whole number/);
    expect(errors({ other: true }).join(" ")).toMatch(/set limit too/);
    expect(errors({ other: "", limit: 2 }).join(" ")).toMatch(/other must be/);
    expect(errors({ sort: "biggest" }).length).toBeGreaterThan(0);
  });

  test("every category view declares sort, order, limit and other; views with their own sort keep it", () => {
    for (const type of SHAPE_VIEWS) for (const name of ["sort", "order", "limit", "other"]) expect([type, name in getBlock("view", type).options]).toEqual([type, true]);
    expect(getBlock("view", "whitespace").options.sort?.values).toContain("potential");
    expect(getBlock("view", "ragboard").options.sort?.values).toContain("worst");
  });

  test("ragboard only lists statuses", () => {
    const rows = [{ c: "A", s: "R" }];
    const board = (only: unknown) => validateSpec({ data: { type: "inline", rows }, view: { type: "ragboard", label: "c", dimensions: ["s"], only } } as WidgetSpec, rows).filter((i) => i.level === "error");
    expect(board(["R", "A"])).toEqual([]);
    expect(board(["Red"]).length).toBe(1);
    expect(board([]).length).toBe(1);
  });
});

describe("the contract matches the renderers", () => {
  /** Renderer files that read highlight, by the view types they draw. */
  const drawn: Record<string, string[]> = { chart: ["bar", "line", "area"] };
  const reads = readdirSync("src/dom/views")
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .filter((file) => /view\.highlight|emphasis\(ctx|highlights\(\s*(ctx\.)?view|highlights\(\(ctx\.view/.test(readFileSync(`src/dom/views/${file}`, "utf8")))
    .flatMap((file) => drawn[file.replace(/\.ts$/, "")] ?? [file.replace(/\.ts$/, "")])
    .filter((type) => blockTypes("view").includes(type));

  test.each(reads)("%s reads highlight, and declares it", (type) => {
    expect(getBlock("view", type).options.highlight).toBeDefined();
  });

  test("the scan finds the views it should", () => {
    expect(reads).toEqual(expect.arrayContaining(["chord", "sankey", "sunburst", "icicle", "radar", "waffle", "symbols", "hbar", "donut"]));
  });
});

describe("panel scales", () => {
  const examples: [string, Record<string, unknown>, Row[], number[]][] = [
    ["heatmap", { x: "d", y: "h", value: "n" }, [{ d: "Mon", h: 1, n: 4 }, { d: "Tue", h: 1, n: 9 }], [4, 9]],
    ["calendar", { date: "day", value: "n" }, [{ day: "2026-01-01", n: 2 }, { day: "2026-01-02", n: 7 }], [2, 7]],
    ["funnel", { label: "s", value: "n" }, [{ s: "a", n: 100 }, { s: "b", n: 40 }], [100, 40]],
    ["ridgeline", { value: "v", group: "g" }, [{ v: 3, g: "a" }, { v: 8, g: "b" }], [3, 8]],
    ["choropleth", { geo: "europe", id: "c", value: "v", max: 50 }, [{ c: "FR", v: 10 }, { c: "DE", v: 20 }], [10, 20, 50]],
    ["symbols", { geo: "europe", id: "c", size: "v" }, [{ c: "FR", v: 10 }, { c: "DE", v: 20 }], [10, 20]],
    ["matrix", { x: "q", y: "t", size: "n" }, [{ q: "Q1", t: "A", n: 3 }, { q: "Q2", t: "A", n: 6 }], [3, 6]],
    ["radar", { label: "p", y: ["a", "b"], max: 10 }, [{ p: "x", a: 2, b: 5 }], [2, 5, 10]],
    ["rose", { label: "m", y: "n" }, [{ m: "Jan", n: 4 }, { m: "Feb", n: 6 }], [4, 6]],
    ["horizon", { x: "d", y: ["a", "b"], baseline: 1 }, [{ d: "2026-01", a: 2, b: -3 }], [2, -3, 1]],
  ];
  test.each(examples)("%s has a panel extent covering its numbers", (type, options, rows, expected) => {
    const extent = getBlock("view", type).extent;
    expect(extent).toBeDefined();
    expect([...(extent?.({ type, ...options }, rows) ?? [])].sort((a, b) => a - b)).toEqual([...expected].sort((a, b) => a - b));
  });
});

describe("data checks count per panel", () => {
  test("the gallery's donuts by region raise no slice warning: each panel has three", () => {
    const spec = JSON.parse(readFileSync("widgets/revenue-donuts-by-region.json", "utf8")) as WidgetSpec;
    const rows = spec.data.rows as Row[];
    const warnings = validateSpec(spec, rows).filter((i) => i.level === "warning").map((i) => i.message);
    expect(warnings.filter((m) => /slices/.test(m))).toEqual([]);
    // Without the facet the same rows are one donut of many slices, and say so.
    const { facet: _facet, ...flat } = spec;
    expect(validateSpec(flat as WidgetSpec, rows).some((i) => /slices/.test(i.message))).toBe(true);
  });

  test("a warning only some panels raise names them", () => {
    const rows = [
      ...["a", "b", "c", "d", "e", "f", "g", "h"].map((label) => ({ region: "East", label, v: 1 })),
      ...["a", "b"].map((label) => ({ region: "West", label, v: 1 })),
    ];
    const spec = { data: { type: "inline", rows }, facet: { field: "region" }, view: { type: "donut", label: "label", value: "v" } } as WidgetSpec;
    const slices = validateSpec(spec, rows).filter((i) => /slices/.test(i.message)).map((i) => i.message);
    expect(slices).toEqual([expect.stringMatching(/^In East: 8 slices/)]);
  });
});
