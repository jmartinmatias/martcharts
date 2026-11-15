import { readdir, readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { createLocalFetch } from "../mcp/store.ts";
import { validateDashboard } from "./dashboard.ts";
import { runPipeline } from "./pipeline.ts";
import { describeBlocks } from "./registry.ts";
import { upgradeView } from "./renamed.ts";
import type { WidgetSpec } from "./types.ts";
import { forkWidget, validateSpec } from "./validate.ts";

const data = { type: "inline", rows: [{ month: "2026-08", revenue: 10, goal: 12, Q: "Start" }] };
const spec = (view: Record<string, unknown>): WidgetSpec => ({ data, view: view as WidgetSpec["view"] });
const deprecations = (view: Record<string, unknown>) =>
  validateSpec(spec(view))
    .filter((issue) => issue.message.startsWith("Deprecated"))
    .map((issue) => `${issue.level} ${issue.path}: ${issue.message}`);

describe("old option names", () => {
  test("each old name gives exactly one warning, at the old name, naming the new one", () => {
    expect(deprecations({ type: "kpi", value: "revenue", label: "Revenue", series: true })).toEqual([
      "warning view.label: Deprecated: write caption instead of label. The old name still works for now.",
      "warning view.series: Deprecated: write sparkline instead of series. The old name still works for now.",
    ]);
    expect(deprecations({ type: "kpis", series: true, items: [{ value: "revenue", label: "Revenue" }, { value: "goal", label: "Goal" }, { value: "revenue" }] })).toEqual([
      "warning view.series: Deprecated: write sparkline instead of series. The old name still works for now.",
      "warning view.items[0].label: Deprecated: write caption instead of label. The old name still works for now.",
      "warning view.items[1].label: Deprecated: write caption instead of label. The old name still works for now.",
    ]);
    expect(deprecations({ type: "gauge", value: "revenue", label: "Revenue" })).toEqual([
      "warning view.label: Deprecated: write caption instead of label. The old name still works for now.",
    ]);
    expect(deprecations({ type: "table", totals: true })).toEqual(["warning view.totals: Deprecated: write showTotals instead of totals. The old name still works for now."]);
    expect(deprecations({ type: "waterfall", label: "Q", value: "revenue", totals: "Start" })).toEqual(['warning view.totals: Deprecated form: write ["Start"]. This form still works for now.']);
  });

  test("an old name is only a warning: no errors, and nothing else is reported", () => {
    for (const view of [
      { type: "kpi", value: "revenue", label: "Revenue", series: true, x: "month" },
      { type: "kpis", series: true, items: [{ value: "revenue", label: "Revenue" }] },
      { type: "gauge", value: "revenue", target: "goal", label: "Revenue" },
      { type: "table", totals: true },
      { type: "waterfall", label: "Q", value: "revenue", totals: "Start" },
    ]) {
      const issues = validateSpec(spec(view), data.rows);
      expect([view.type, issues.length, issues.every((issue) => issue.level === "warning" && issue.message.startsWith("Deprecated"))]).toEqual([view.type, issues.length, true]);
    }
  });

  test("the new names give no warnings at all", () => {
    for (const view of [
      { type: "kpi", value: "revenue", caption: "Revenue", sparkline: true, x: "month" },
      { type: "kpis", sparkline: true, items: [{ value: "revenue", caption: "Revenue" }] },
      { type: "gauge", value: "revenue", target: "goal", caption: "Revenue" },
      { type: "table", showTotals: true },
      { type: "waterfall", label: "Q", value: "revenue", totals: ["Start"] },
    ]) {
      expect([view.type, validateSpec(spec(view), data.rows)]).toEqual([view.type, []]);
    }
  });

  test("upgradeView moves old names to new ones, and leaves a view with none untouched", () => {
    const current = { type: "kpi", value: "revenue", caption: "Revenue" };
    expect(upgradeView(current).view).toBe(current);
    expect(upgradeView({ type: "kpi", value: "revenue", label: "Revenue", series: true }).view).toEqual({ type: "kpi", value: "revenue", caption: "Revenue", sparkline: true });
    expect(upgradeView({ type: "kpis", series: false, items: [{ value: "a", label: "A" }, { value: "b" }] }).view).toEqual({ type: "kpis", sparkline: false, items: [{ value: "a", caption: "A" }, { value: "b" }] });
    expect(upgradeView({ type: "table", totals: true }).view).toEqual({ type: "table", showTotals: true });
    expect(upgradeView({ type: "waterfall", label: "Q", value: "v", totals: 2025 }).view).toEqual({ type: "waterfall", label: "Q", value: "v", totals: [2025] });
  });

  test("with both names set the new one wins and the old one is dropped, with one warning that says so", () => {
    const view = { type: "gauge", value: "revenue", label: "Old", caption: "New" };
    expect(upgradeView(view).view).toEqual({ type: "gauge", value: "revenue", caption: "New" });
    expect(deprecations(view)).toEqual(["warning view.label: Deprecated name of caption, which is also set, so label is ignored. Remove label."]);
  });

  test("an old name with a wrong value is an error reported at the name the spec used", () => {
    const issues = validateSpec(spec({ type: "gauge", value: "revenue", label: 5 }));
    expect(issues.map((issue) => `${issue.level} ${issue.path}: ${issue.message}`)).toEqual([
      "warning view.label: Deprecated: write caption instead of label. The old name still works for now.",
      "error view.label: Must be text.",
    ]);
  });

  test("a waterfall's totals is a list of row labels", () => {
    const errors = (totals: unknown) => validateSpec(spec({ type: "waterfall", label: "Q", value: "revenue", totals })).filter((issue) => issue.level === "error").map((issue) => issue.message);
    expect([errors(["Start", 2025]), errors(true), errors([{}])]).toEqual([[], ["Must be a list."], ['totals must be a list of row labels, for example ["Q2 revenue"].']]);
  });

  test("a waterfall's totals that used to mean no totals (null, false, 0, empty text) still draws none", () => {
    const issues = (totals: unknown) => validateSpec(spec({ type: "waterfall", label: "Q", value: "revenue", totals })).map((issue) => `${issue.level} ${issue.path}: ${issue.message}`);
    expect([null, false, 0, ""].map((totals) => [upgradeView({ type: "waterfall", label: "Q", value: "v", totals }).view.totals, issues(totals)])).toEqual([
      [null, []],
      [[], ["warning view.totals: Deprecated form: write []. This form still works for now."]],
      [[], ["warning view.totals: Deprecated form: write []. This form still works for now."]],
      [[], ["warning view.totals: Deprecated form: write []. This form still works for now."]],
    ]);
  });

  test("forkWidget: within one type the name the patch writes wins; across a type change old names arrive as new ones", () => {
    const view = (base: Record<string, unknown>, patch: Record<string, unknown>) => forkWidget(spec(base), { view: patch });
    // A patch in the old name onto a spec in the new name (the stored widgets) takes effect, and the reverse too.
    expect(view({ type: "kpi", value: "revenue", caption: "Stored" }, { label: "Patched" }).spec.view).toEqual({ type: "kpi", value: "revenue", label: "Patched" });
    expect(view({ type: "kpi", value: "revenue", label: "Stored" }, { caption: "Patched" }).spec.view).toEqual({ type: "kpi", value: "revenue", caption: "Patched" });
    expect(view({ type: "table", showTotals: true }, { totals: false }).spec.view).toEqual({ type: "table", totals: false });
    expect(view({ type: "kpi", value: "revenue", caption: "Stored" }, { label: null }).spec.view).toEqual({ type: "kpi", value: "revenue" });
    // A kpi's caption and sparkline reach a gauge and a kpis row whichever name the kpi used.
    for (const kpi of [
      { type: "kpi", value: "revenue", label: "Rev", series: true },
      { type: "kpi", value: "revenue", caption: "Rev", sparkline: true },
    ]) {
      expect([view(kpi, { type: "gauge" }).spec.view, view(kpi, { type: "kpis", items: [{ value: "revenue", label: "R" }] }).spec.view]).toEqual([
        { type: "gauge", value: "revenue", caption: "Rev" },
        { type: "kpis", sparkline: true, items: [{ value: "revenue", caption: "R" }] },
      ]);
    }
    // Text meant as a caption never lands in a waterfall's label, which names a field.
    expect(view({ type: "kpi", value: "revenue", label: "Rev" }, { type: "waterfall" })).toEqual({ spec: spec({ type: "waterfall", value: "revenue" }), dropped: ["caption"] });
  });

  test("describeBlocks names each old option and the one to write instead", () => {
    const renamed = Object.fromEntries(describeBlocks("view").flatMap((block) => (block.renamed ? [[block.type, block.renamed]] : [])));
    expect(renamed).toEqual({
      gauge: { label: "caption" },
      kpi: { label: "caption", series: "sparkline" },
      kpis: { series: "sparkline", "items[].label": "caption" },
      table: { totals: "showTotals" },
      waterfall: { totals: "totals" },
    });
  });
});

describe("the stored widgets and dashboards", () => {
  const root = new URL("../../", import.meta.url);
  const readJson = async (dir: string) =>
    Promise.all((await readdir(new URL(dir, root))).filter((name) => name.endsWith(".json")).map(async (name) => [name, JSON.parse(await readFile(new URL(`${dir}/${name}`, root), "utf8"))] as const));

  test("every stored widget validates against its own rows with no warnings", async () => {
    const fetch = createLocalFetch(new URL("public", root).pathname);
    const widgets = await readJson("widgets");
    const found: string[] = [];
    for (const [name, widget] of widgets) {
      const rows = await runPipeline(widget, { fetch });
      for (const issue of validateSpec(widget, rows)) found.push(`${name} ${issue.level} ${issue.path}: ${issue.message}`);
    }
    expect([widgets.length > 0, found]).toEqual([true, []]);
  });

  test("every stored dashboard validates with no warnings", async () => {
    const dashboards = await readJson("dashboards");
    const found = dashboards.flatMap(([name, dashboard]) => validateDashboard(dashboard).map((issue) => `${name} ${issue.level} ${issue.path}: ${issue.message}`));
    expect([dashboards.length > 0, found]).toEqual([true, []]);
  });
});
