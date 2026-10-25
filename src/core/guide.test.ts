import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { chartGuide, chartsFor, dataContract, guideMarkdown, PURPOSES, rowsToCsv, switchChart, switchOptions } from "./guide.ts";
import type { Purpose } from "./guide.ts";
import { blockTypes } from "./registry.ts";
import type { Row, WidgetSpec } from "./types.ts";
import { hasErrors, validateSpec } from "./validate.ts";
import "./views.ts";

const catalog = (type: string) => JSON.parse(readFileSync(new URL(`../../catalog/${type}.json`, import.meta.url), "utf8")) as WidgetSpec;
const rowsOf = (spec: WidgetSpec) => spec.data.rows as Row[];

describe("every chart has a guide", () => {
  test.each(blockTypes("view"))("%s: jobs, uses, how it is built", (type) => {
    const guide = chartGuide(type);
    expect(guide).toBeDefined();
    expect(Object.values(guide?.purposes ?? {})).toContain(3);
    for (const purpose of Object.keys(guide?.purposes ?? {})) expect(Object.keys(PURPOSES)).toContain(purpose);
    expect(guide?.bestFor.length).toBeGreaterThan(0);
    expect(guide?.avoidFor.length).toBeGreaterThan(0);
    expect(guide?.build).toMatch(/\.$/);
  });

  test("every job has a chart that is best at it", () => {
    for (const purpose of Object.keys(PURPOSES) as Purpose[]) expect([purpose, chartsFor(purpose)[0]?.score]).toEqual([purpose, 3]);
  });
});

describe("dataContract", () => {
  test("names each column, its kind and the option that draws it", () => {
    const spec = catalog("bar");
    const contract = dataContract(spec);
    expect(contract.grain).toBe("category");
    expect(contract.columns.map((c) => [c.name, c.kind, c.roles])).toEqual([
      ["region", "category", ["x"]],
      ["Core", "number", ["y"]],
      ["Plus", "number", ["y"]],
      ["total", "number", []],
    ]);
    expect(contract.columns[0]?.required).toBe(true);
    expect(contract.warnings).toEqual([]);
  });

  test("every catalog example fits its own chart", () => {
    for (const type of blockTypes("view")) expect([type, dataContract(catalog(type)).warnings]).toEqual([type, []]);
  });

  test("says what does not fit: repeated categories, text for numbers, negatives in a donut", () => {
    const rows = [
      { region: "East", revenue: 5 },
      { region: "East", revenue: -2 },
    ];
    const donut: WidgetSpec = { data: { type: "inline", rows }, view: { type: "donut", label: "region", value: "revenue" } };
    const warnings = dataContract(donut).warnings.join(" ");
    expect(warnings).toMatch(/"region" repeats/);
    expect(warnings).toMatch(/negative/);
    const wrong: WidgetSpec = { data: { type: "inline", rows }, view: { type: "hbar", label: "region", value: "region" } };
    expect(dataContract(wrong).warnings.join(" ")).toMatch(/value needs numbers/);
  });
});

describe("switchChart", () => {
  test("bar to hbar keeps the columns and is better for ranking", () => {
    const s = switchChart(catalog("bar"), "hbar");
    expect(s.fit).toBe("fits");
    expect(s.verdict).toBe("better");
    expect(s.view).toMatchObject({ type: "hbar", label: "region", value: "Core" });
    expect(s.gains).toContain("rank");
  });

  test("donut to waffle does the same job", () => {
    const s = switchChart(catalog("donut"), "waffle");
    expect([s.fit, s.verdict]).toEqual(["fits", "same"]);
    expect(s.assessment).toMatch(/share of one whole/);
  });

  test("line to bar is a trade-off: each month's amount for the trend", () => {
    const s = switchChart(catalog("line"), "bar");
    expect(s.verdict).toBe("trade-off");
    expect(s.losses).toContain("trend");
  });

  test("not possible: no second category for a heatmap, no prices for a candlestick, no dates for a calendar", () => {
    expect(switchChart(catalog("donut"), "heatmap").fit).toBe("no");
    expect(switchChart(catalog("line"), "candlestick").assessment).toMatch(/open, high, low and close/);
    expect(switchChart(catalog("bar"), "calendar").fit).toBe("no");
  });

  test("an unknown chart says which exist", () => {
    expect(switchChart(catalog("bar"), "sparkline").assessment).toMatch(/no chart "sparkline"/);
  });

  test("every switch that fits is a valid spec", () => {
    for (const type of blockTypes("view")) {
      const spec = catalog(type);
      for (const s of switchOptions(spec)) {
        if (s.fit === "no") continue;
        expect([type, s.to, hasErrors(validateSpec({ ...spec, view: s.view }, rowsOf(spec)))]).toEqual([type, s.to, false]);
      }
    }
  });

  test("switchOptions puts the switches that fit and help first", () => {
    const options = switchOptions(catalog("bar"));
    expect(options[0]?.to).toBe("hbar");
    const fits = options.map((s) => s.fit);
    expect(fits.indexOf("no")).toBeGreaterThan(fits.lastIndexOf("fits"));
  });
});

describe("plain text", () => {
  test("CSV quotes what needs it", () => {
    expect(rowsToCsv([{ a: "x, y", b: 1 }, { a: 'say "hi"', b: null }])).toBe('a,b\n"x, y",1\n"say ""hi""",');
  });

  test("the Markdown guide has the table, the data and the switches", () => {
    const text = guideMarkdown(catalog("waterfall"));
    for (const heading of ["## What it is for", "## The data it needs", "## This example's columns", "## The data drawing it now", "## The spec", "## The same data as another chart"]) expect(text).toContain(heading);
    expect(text).toContain("```csv\nstep,amount");
  });
});
