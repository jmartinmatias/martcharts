import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { OPTION_ALIASES } from "./aliases.ts";
import { canonicalSpec, canonicalView, readable } from "./canonical.ts";
import { describeChart } from "./catalog.ts";
import { explainChart } from "./explain.ts";
import { dataContract, switchChart } from "./guide.ts";
import { questionOf } from "./question.ts";
import { recommendCharts } from "./recommend.ts";
import { suggestView } from "./suggest.ts";
import { createVariants } from "./taller.ts";
import type { Row, WidgetSpec } from "./types.ts";
import { validateSpec } from "./validate.ts";
import "./views.ts";

/** Every stored widget, the ones in sub-folders (commercial/, health/) too. */
function storedWidgets(dir = "widgets"): { file: string; spec: WidgetSpec }[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return storedWidgets(path);
    return name.endsWith(".json") ? [{ file: path, spec: JSON.parse(readFileSync(path, "utf8")) as WidgetSpec }] : [];
  });
}

/** The inline widget specs dashboards carry in their cells. */
function dashboardSpecs(): { file: string; spec: WidgetSpec }[] {
  return readdirSync("dashboards")
    .filter((name) => name.endsWith(".json"))
    .flatMap((name) => {
      const board = JSON.parse(readFileSync(join("dashboards", name), "utf8")) as { widgets: { spec?: WidgetSpec }[] };
      return board.widgets.filter((cell) => cell.spec).map((cell) => ({ file: `dashboards/${name}`, spec: cell.spec as WidgetSpec }));
    });
}

const DEPRECATED = /is now called/;

describe("stored specs speak the canonical names", () => {
  test("no stored widget or dashboard spec raises a deprecation warning", () => {
    const all = [...storedWidgets(), ...dashboardSpecs()];
    expect(all.length).toBeGreaterThan(100);
    const warned = all.flatMap(({ file, spec }) => validateSpec(spec).filter((issue) => DEPRECATED.test(issue.message)).map((issue) => `${file}: ${issue.message}`));
    expect(warned).toEqual([]);
  });

  test("no stored view writes a renamed option under its older name", () => {
    const legacy = OPTION_ALIASES.filter((alias) => alias.deprecated && alias.canonical !== alias.legacy);
    const found = storedWidgets().flatMap(({ file, spec }) =>
      legacy.filter((alias) => spec.view?.type === alias.view && (spec.view as Record<string, unknown>)[alias.legacy] !== undefined).map((alias) => `${file}: ${alias.view}.${alias.legacy}`),
    );
    expect(found).toEqual([]);
  });
});

const ratings: Row[] = [
  { product: "Core", ease: 7.1, value: 8.2, support: 6.4 },
  { product: "Plus", ease: 8.3, value: 7.4, support: 8.4 },
  { product: "Lite", ease: 8.9, value: 8.8, support: 6.4 },
];
const inline = (view: WidgetSpec["view"], rows: Row[] = ratings): WidgetSpec => ({ locale: "en-US", data: { type: "inline", rows }, view });
const asLegacy = inline({ type: "dot", label: "product", values: ["ease", "support"] });
const asCanonical = inline({ type: "dot", label: "product", value: ["ease", "support"] });

describe("the text layers read either spelling the same way", () => {
  test("explain and question say the same for canonical and older names", () => {
    expect(explainChart(asCanonical, ratings)).toBe(explainChart(asLegacy, ratings));
    expect(explainChart(asCanonical, ratings)).toMatch(/ease/i);
    expect(questionOf(asCanonical, ratings)).toEqual(questionOf(asLegacy, ratings));
  });

  test("the data contract shows the canonical name, the older one noted", () => {
    const contract = dataContract(asCanonical);
    const need = contract.needs.find((n) => n.option === "value");
    expect(need?.description).toMatch(/Also accepts `values`/);
    expect(contract.needs.some((n) => n.option === "values")).toBe(false);
    expect(contract.columns.find((c) => c.name === "ease")?.roles).toEqual(["value"]);
    expect(contract.warnings).toEqual([]);
    expect(dataContract(asLegacy).columns.find((c) => c.name === "ease")?.roles).toEqual(["value"]);
  });

  test("describeChart lists canonical names and keeps the older one as an also-accepts note", () => {
    const entry = describeChart("matrix");
    const flag = entry.needs.find((n) => n.option === "flag");
    expect(flag?.alsoAccepts).toEqual(["mark"]);
    expect(entry.needs.some((n) => n.option === "mark")).toBe(false);
    expect(describeChart("scatter").needs.map((n) => n.option)).toContain("color");
    expect(describeChart("scatter").needs.map((n) => n.option)).not.toContain("series");
  });

  test("the Taller reads a canonical spec and hands its versions back in canonical names", () => {
    const variants = createVariants(asCanonical, ratings, { count: 6, seed: 3 });
    expect(variants.length).toBeGreaterThan(0);
    for (const variant of variants) {
      const view = variant.spec.view as Record<string, unknown>;
      for (const alias of OPTION_ALIASES.filter((a) => a.deprecated && a.view === view.type)) expect([view.type, alias.legacy, view[alias.legacy]]).toEqual([view.type, alias.legacy, undefined]);
    }
  });
});

describe("generated views are written in canonical names", () => {
  test("suggestView fills a dot plot's measures under value, never values", () => {
    expect(suggestView("dot", ratings)).toMatchObject({ type: "dot", label: "product", value: ["ease", "value"] });
    expect(suggestView("dot", ratings)).not.toHaveProperty("values");
  });

  test("switchChart hands back a canonical view, drawn from the same columns", () => {
    const bars = inline({ type: "hbar", label: "product", value: ["ease", "support"] });
    const to = switchChart(bars, "dot");
    expect(to.fit).not.toBe("no");
    expect(to.view).toMatchObject({ type: "dot", label: "product" });
    expect(to.view).toHaveProperty("value");
    expect(to.view).not.toHaveProperty("values");
  });

  test("recommendCharts writes every pick in canonical names", () => {
    const picks = recommendCharts(ratings, { limit: 99 });
    for (const pick of picks) {
      const view = pick.view as Record<string, unknown>;
      for (const alias of OPTION_ALIASES.filter((a) => a.deprecated && a.canonical !== a.legacy && a.view === pick.type)) expect([pick.type, view[alias.legacy]]).toEqual([pick.type, undefined]);
    }
  });

  test("canonicalView and readable are each other's inverse, and leave other views alone", () => {
    const legacy = { type: "scatter", x: "a", y: "b", series: "c" };
    expect(canonicalView(legacy)).toEqual({ type: "scatter", x: "a", y: "b", color: "c" });
    expect(readable(canonicalSpec(inline(legacy))).view).toEqual(legacy);
    const bar = { type: "bar", x: "a", y: "b" };
    expect(canonicalView(bar)).toBe(bar);
  });
});
