import { describe, expect, test } from "vitest";
import { aliasUse, canonicalName, normalizeView, OPTION_ALIASES } from "./aliases.ts";
import { getBlock } from "./registry.ts";
import type { Row, WidgetSpec } from "./types.ts";
import { validateSpec } from "./validate.ts";
import "./views.ts";

const spec = (view: Record<string, unknown>, extra: Record<string, unknown> = {}): WidgetSpec => ({ data: { type: "inline", rows: [] }, view: view as WidgetSpec["view"], ...extra });
const warnings = (s: WidgetSpec, rows?: Row[]) => validateSpec(s, rows).filter((i) => i.level === "warning").map((i) => `${i.path}: ${i.message}`);
const errors = (s: WidgetSpec, rows?: Row[]) => validateSpec(s, rows).filter((i) => i.level === "error").map((i) => i.path);

describe("one name per concept, one concept per name", () => {
  // Same-kind renames move the value as it is; the three that change kind (line peaks, choropleth codes) have their own tests.
  test.each(OPTION_ALIASES.filter((a) => !a.toCanonical).map((a) => [a.view, a.legacy, a.canonical] as const))("%s: the older %s reads as %s", (view, legacy, canonical) => {
    const old = { type: view, [legacy]: "f" };
    expect(normalizeView(old)).toEqual({ type: view, [canonical]: "f" });
    // The canonical name is left as it is, and a view already in canonical names comes back as the same object.
    const written = { type: view, [canonical]: "f" };
    expect(normalizeView(written)).toBe(written);
    expect(canonicalName(view, legacy)).toBe(canonical);
  });

  test("a canonical name already present wins, so nothing written is lost", () => {
    expect(normalizeView({ type: "dot", label: "p", values: ["a"], value: ["b"] })).toEqual({ type: "dot", label: "p", value: ["b"] });
  });

  test("line labels \"peaks\" is now peaks: true", () => {
    expect(normalizeView({ type: "line", labels: "peaks" })).toEqual({ type: "line", peaks: true });
    expect(normalizeView({ type: "line", labels: "none" })).toEqual({ type: "line", peaks: false });
  });

  test("choropleth labels (true, false, \"codes\" or \"none\") is now codes: true or false", () => {
    expect(normalizeView({ type: "choropleth", labels: "none" })).toEqual({ type: "choropleth", codes: false });
    expect(normalizeView({ type: "choropleth", labels: false })).toEqual({ type: "choropleth", codes: false });
    expect(normalizeView({ type: "choropleth", labels: "codes" })).toEqual({ type: "choropleth", codes: true });
    expect(normalizeView({ type: "choropleth", labels: true })).toEqual({ type: "choropleth", codes: true });
  });

  test("pie labels is now labelPlace, and dual marks is now panels", () => {
    expect(normalizeView({ type: "pie", labels: "outside" })).toEqual({ type: "pie", labelPlace: "outside" });
    expect(normalizeView({ type: "dual", marks: ["bar", "line"] })).toEqual({ type: "dual", panels: ["bar", "line"] });
  });

  test("labels keeps one meaning: names written beside the marks, true or false, on scatter", () => {
    const scatter = { type: "scatter", x: "a", y: "b", labels: true };
    expect(normalizeView(scatter)).toBe(scatter);
    expect(getBlock("view", "scatter").options.labels?.type).toBe("boolean");
    for (const type of ["pie", "line", "choropleth"]) expect([type, getBlock("view", type).options.labels]).toEqual([type, undefined]);
  });

  test("mark keeps one meaning: how each item is drawn (bar, hbar, dumbbell); no view has marks", () => {
    expect(getBlock("view", "matrix").options.mark).toBeUndefined();
    expect(getBlock("view", "dual").options.marks).toBeUndefined();
    for (const type of ["bar", "hbar", "dumbbell"]) expect(getBlock("view", type).options.mark?.type).toBe("enum");
  });

  test("views without renamed options, and odd input, pass through untouched", () => {
    const bar = { type: "bar", x: "a", y: "b", value: "c" };
    expect(normalizeView(bar)).toBe(bar);
    expect(normalizeView(null as unknown as { type: string })).toBe(null);
  });

  test("target keeps both senses: a goal on bullet and a destination on sankey", () => {
    expect(OPTION_ALIASES.some((a) => a.legacy === "target" || a.canonical === "target")).toBe(false);
  });
});

describe("validation reads the spec as written", () => {
  test("a canonical name validates, and a wrong kind is reported under that name", () => {
    expect(errors(spec({ type: "dot", label: "p", value: ["a", "b"] }))).toEqual([]);
    expect(errors(spec({ type: "strips", label: "n", value: ["mandatory", "optional"] }))).toEqual([]);
    expect(errors(spec({ type: "matrix", x: "q", y: "t", flag: "must" }))).toEqual([]);
    expect(errors(spec({ type: "choropleth", geo: "europe", id: "c", value: "v", codes: false }))).toEqual([]);
    expect(errors(spec({ type: "scatter", x: "a", y: "b", color: 3 }))).toEqual(["view.color"]);
  });

  test("an older name warns once, saying what it is now called, still works, and a problem keeps its name", () => {
    const said = warnings(spec({ type: "scatter", x: "a", y: "b", series: "g" }));
    expect(said).toEqual(['view.series: "series" is now called "color". "series" still works.']);
    expect(errors(spec({ type: "scatter", x: "a", y: "b", series: "g" }))).toEqual([]);
    expect(errors(spec({ type: "scatter", x: "a", y: "b", series: 3 }))).toEqual(["view.series"]);
    expect(warnings(spec({ type: "likert", label: "q", responses: ["a", "b"] }))).toHaveLength(1);
    expect(warnings(spec({ type: "locator", geo: "europe", id: "c", label: "n", kind: "k" }))).toHaveLength(1);
    expect(warnings(spec({ type: "line", x: "m", y: "v", labels: "peaks" }))).toEqual(['view.labels: "labels" is now called "peaks". "labels" still works.']);
    expect(warnings(spec({ type: "scatter", x: "a", y: "b", color: "g" }))).toEqual([]);
  });

  test("footer is now note, and still works", () => {
    expect(warnings(spec({ type: "bar", x: "a", y: "b" }, { footer: "Q3 only" }))).toEqual(['footer: "footer" is now called "note". "footer" still works.']);
    expect(warnings(spec({ type: "bar", x: "a", y: "b" }, { note: "Q3 only" }))).toEqual([]);
    expect(errors(spec({ type: "bar", x: "a", y: "b" }, { note: 3 }))).toEqual(["note"]);
  });

  test("data checks run on the view as drawn, whichever name was used", () => {
    const rows = ["a", "b", "c", "d"].map((g, i) => ({ g, x: i, y: i }));
    const groups = (view: Record<string, unknown>) => warnings(spec(view), rows).filter((w) => /4 groups/.test(w));
    expect(groups({ type: "scatter", x: "x", y: "y", color: "g" })).toHaveLength(1);
    expect(groups({ type: "scatter", x: "x", y: "y", series: "g" })).toHaveLength(1);
  });

  test("aliasUse lists canonical and older spellings", () => {
    expect(aliasUse({ type: "dot", value: "a" })).toEqual({ canonical: [["value", "values"]], deprecated: [] });
    expect(aliasUse({ type: "dot", values: "a" })).toEqual({ canonical: [], deprecated: [["values", "value"]] });
  });
});

describe("spec-level colors and tooltip", () => {
  test("colors map category values to CSS colors", () => {
    expect(errors(spec({ type: "donut", label: "a", value: "b" }, { colors: { Enterprise: "#2f6fdb", SMB: "teal", Other: "var(--brand)" } }))).toEqual([]);
    expect(errors(spec({ type: "donut", label: "a", value: "b" }, { colors: ["#fff"] }))).toEqual(["colors"]);
    expect(errors(spec({ type: "donut", label: "a", value: "b" }, { colors: { A: 3, B: "", C: "red; background: x" } }))).toEqual(["colors.A", "colors.B", "colors.C"]);
  });

  test("tooltip is a template or a title and body", () => {
    const at = (tooltip: unknown) => validateSpec(spec({ type: "bar", x: "a", y: "b" }, { tooltip })).map((i) => `${i.level} ${i.path}`);
    expect(at("Revenue: {revenue}")).toEqual([]);
    expect(at({ title: "{name}", body: "Revenue: {revenue}" })).toEqual([]);
    expect(at("  ")).toEqual(["error tooltip"]);
    expect(at(5)).toEqual(["error tooltip"]);
    expect(at({})).toEqual(["error tooltip"]);
    expect(at({ title: 3 })).toEqual(["error tooltip.title"]);
    expect(at({ body: "x", footer: "y" })).toEqual(["warning tooltip.footer"]);
  });
});

describe("shared options, declared on the views that lacked them", () => {
  test.each(["pie", "donut", "treemap", "scatter", "dumbbell", "pyramid", "funnel", "waterfall", "strips", "lifecycle", "matrix", "choropleth"])("%s takes highlight", (type) => {
    expect(getBlock("view", type).options.highlight).toBeDefined();
  });
  test.each(["hbar", "dot", "dumbbell", "histogram", "boxplot", "strips"])("%s takes reference lines, checked for shape", (type) => {
    expect(getBlock("view", type).options.reference).toBeDefined();
    expect(getBlock("view", type).validate?.({ type, reference: [{ label: "no value" }] }).join(" ")).toMatch(/reference\[0\] needs a value/);
  });
  test.each(["bullet", "meter", "rings", "gauge"])("%s takes goodWhen", (type) => {
    expect(getBlock("view", type).options.goodWhen?.values).toEqual(["up", "down"]);
  });
  test.each(["scatter", "dual"])("%s takes annotations", (type) => {
    expect(getBlock("view", type).options.annotations).toBeDefined();
  });
});

describe("panel scales: every view with a value axis gives an extent", () => {
  const extent = (type: string, view: Record<string, unknown>, rows: Row[]) => {
    const fn = getBlock("view", type).extent;
    expect(fn, type).toBeDefined();
    const values = fn!({ type, ...view }, rows);
    return [Math.min(...values), Math.max(...values)];
  };

  test("scatter spans y", () => expect(extent("scatter", { x: "x", y: "y" }, [{ x: 1, y: 4 }, { x: 2, y: -2 }])).toEqual([-2, 4]));
  test("dumbbell and slope span both ends", () => {
    const rows = [{ a: 3, b: 9 }, { a: 1, b: 2 }];
    expect(extent("dumbbell", { from: "a", to: "b" }, rows)).toEqual([1, 9]);
    expect(extent("slope", { from: "a", to: "b" }, rows)).toEqual([1, 9]);
  });
  test("variance spans actual minus plan from zero, or its share", () => {
    const rows = [{ v: 120, t: 100 }, { v: 70, t: 100 }];
    expect(extent("variance", { value: "v", target: "t" }, rows)).toEqual([-30, 20]);
    expect(extent("variance", { value: "v", target: "t", percent: true }, rows)).toEqual([-0.3, 0.2]);
  });
  test("waterfall spans every running total, totals resetting it", () => {
    const rows = [{ l: "Start", v: 100 }, { l: "Up", v: 50 }, { l: "Down", v: -80 }, { l: "Mid", v: 70 }, { l: "Up2", v: 10 }];
    expect(extent("waterfall", { label: "l", value: "v", totals: ["Start", "Mid"] }, rows)).toEqual([0, 150]);
  });
  test("histogram spans the counts", () => {
    const rows = [1, 1, 1, 2, 9].map((v) => ({ v }));
    const [low, high] = extent("histogram", { value: "v", bins: 2 }, rows);
    expect([low, high]).toEqual([0, 4]);
  });
  test("boxplot and beeswarm span the values", () => {
    const rows = [{ v: 3 }, { v: 12 }];
    expect(extent("boxplot", { value: "v" }, rows)).toEqual([3, 12]);
    expect(extent("beeswarm", { value: "v" }, rows)).toEqual([3, 12]);
  });
  test("candlestick spans low to high", () => expect(extent("candlestick", { low: "l", high: "h" }, [{ l: 5, h: 9 }, { l: 4, h: 7 }])).toEqual([4, 9]));
  test("bullet reaches the end of its last band", () => expect(extent("bullet", { value: "v", target: "t" }, [{ v: 50, t: 100 }])).toEqual([0, 120]));
  test("meter spans value and target", () => expect(extent("meter", { value: "v", target: "t" }, [{ v: 50, t: 80 }])).toEqual([50, 80]));
  test("strips span each row's total", () => expect(extent("strips", { value: ["a", "b"] }, [{ a: 3, b: 4 }, { a: 10, b: 0 }])).toEqual([7, 10]));
});
