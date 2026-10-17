import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { createLocalFetch } from "../mcp/store.ts";
import { checkPalette, oklch, parseHex } from "./color.ts";
import { describePalettes, getPalette, registerPalette, resolvePalette } from "./palettes.ts";
import { runPipeline } from "./pipeline.ts";
import type { WidgetSpec } from "./types.ts";

describe("palette library", () => {
  test("ships the house palettes and five acclaimed ones", () => {
    expect(describePalettes().map((p) => [p.name, p.label])).toEqual([
      ["50-shades", "50 Shades"],
      ["apple", "Apple"],
      ["bw", "B&W"],
      ["carbon", "IBM Carbon"],
      ["credit-agricole", "Crédit Agricole"],
      ["default", "Default"],
      ["observable-10", "Observable 10"],
      ["okabe-ito", "Okabe-Ito"],
      ["tableau-10", "Tableau 10"],
      ["tol-vibrant", "Paul Tol Vibrant"],
    ]);
  });

  const ACCLAIMED = ["okabe-ito", "tol-vibrant", "tableau-10", "carbon", "observable-10"];
  const lower = (list: string[] | undefined) => (list ?? []).map((c) => c.toLowerCase());

  test("the acclaimed palettes are their published colors, each with its source", () => {
    expect(lower(getPalette("okabe-ito")?.colors)).toEqual(["#e69f00", "#56b4e9", "#009e73", "#f0e442", "#0072b2", "#d55e00", "#cc79a7"]);
    expect(lower(getPalette("tableau-10")?.colors)).toEqual(["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"]);
    expect(lower(getPalette("observable-10")?.colors)).toEqual(["#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951", "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e", "#9498a0"]);
    expect(lower(getPalette("carbon")?.colors)).toEqual(["#6929c4", "#1192e8", "#005d5d", "#9f1853", "#fa4d56", "#520408", "#198038", "#002d9c"]);
    expect(lower(getPalette("carbon")?.darkColors)).toEqual(["#8a3ffc", "#33b1ff", "#007d79", "#ff7eb6", "#fa4d56", "#fff1f1", "#6fdc8c", "#4589ff"]);
    // Tol's six vibrant hues, ordered here so no two neighbours are alike.
    expect([...lower(getPalette("tol-vibrant")?.colors)].sort()).toEqual(["#0077bb", "#009988", "#33bbee", "#cc3311", "#ee3377", "#ee7733"]);
    expect(ACCLAIMED.every((name) => Boolean(getPalette(name)?.source))).toBe(true);
  });

  test("none of them fails the colorblind check on a light card", () => {
    const cvd = (name: string) => checkPalette(getPalette(name)?.colors ?? [], { mode: "light" }).checks.find((c) => c.name === "cvd")?.state;
    expect(ACCLAIMED.map(cvd).every((state) => state !== "fail")).toBe(true);
  });

  test("Paul Tol Vibrant, as ordered, passes lightness, colorfulness, colorblind and neighbour checks", () => {
    const states = checkPalette(getPalette("tol-vibrant")?.colors ?? [], { mode: "light" }).checks.filter((c) => c.name !== "contrast").map((c) => c.state);
    expect(states.every((state) => state === "pass")).toBe(true);
  });

  test("every palette has a light and a dark set of the same length", () => {
    expect(describePalettes().filter((p) => p.darkColors?.length !== p.colors.length).map((p) => p.name)).toEqual([]);
  });

  test("Apple's dark set is Apple's own dark appearance", () => {
    expect(getPalette("apple")?.darkColors).toEqual(["#0A84FF", "#30D158", "#BF5AF2", "#FF9F0A", "#40C8E0", "#FF453A", "#FFD60A", "#FF375F"]);
  });

  test("a palette registered without dark steps gets them derived", () => {
    registerPalette({ name: "test-trio", label: "Trio", description: "Three colors for the suite.", colors: ["#0b6e4f", "#f4d35e", "#7b2cbf"] });
    expect(getPalette("test-trio")?.darkColors?.length).toBe(3);
  });

  test("every shipped color is a hex color", () => {
    for (const { colors } of describePalettes()) for (const color of colors) expect(parseHex(color)).not.toBeNull();
  });

  test("50 shades runs from dark to light grey", () => {
    const greys = getPalette("50-shades")?.colors ?? [];
    expect(greys.length).toBe(8);
    expect(greys.every((c, i) => i === 0 || c > (greys[i - 1] as string))).toBe(true);
  });

  test("a registered palette can be used by name", () => {
    registerPalette({ name: "test-duo", label: "Duo", description: "Two colors for the suite.", colors: ["#123456", "#abcdef"] });
    expect(resolvePalette({ palette: "test-duo" })).toEqual(["#123456", "#abcdef"]);
  });
});

describe("resolvePalette", () => {
  test("a list of colors is used as it is", () => {
    expect(resolvePalette({ palette: ["#111111"] })).toEqual(["#111111"]);
  });

  test("a palette name wins over the preset's palette", () => {
    expect(resolvePalette({ palette: "apple", preset: "glass" })?.[0]).toBe("#007AFF");
  });

  test("without a palette, the preset's palette applies", () => {
    expect(resolvePalette({ preset: "glass" })?.[0]).toBe("#2a78d6");
  });

  test("with neither, there is no override", () => {
    expect([resolvePalette({}), resolvePalette(undefined), resolvePalette({ palette: "default" })]).toEqual([undefined, undefined, undefined]);
  });
});

describe("color meaning in sales", () => {
  test("no stored widget paints a losing outcome green, since green reads as good news", async () => {
    const LOSING = /^(lost|churned|missed|declined|failed|cancelled)$/i;
    const green = (hex: string) => oklch(hex)[2] >= 120 && oklch(hex)[2] < 180 && oklch(hex)[1] > 0.05;
    const fetch = createLocalFetch("public");
    const house = getPalette("default");
    const offenders: string[] = [];
    for (const name of readdirSync("widgets").filter((n) => n.endsWith(".json"))) {
      const spec = JSON.parse(readFileSync(join("widgets", name), "utf8")) as WidgetSpec;
      const field = typeof spec.view?.series === "string" ? spec.view.series : undefined;
      if (!field) continue;
      const rows = await runPipeline(spec, { fetch });
      const order = [...new Set(rows.map((row) => String(row[field])))];
      for (const palette of [resolvePalette(spec.style) ?? house?.colors ?? [], ...(resolvePalette(spec.style) ? [] : [house?.darkColors ?? []])]) {
        order.forEach((value, i) => {
          const color = palette[i % palette.length];
          if (LOSING.test(value) && color && green(color)) offenders.push(`${spec.id}: ${value} is ${color}`);
        });
      }
    }
    expect(offenders).toEqual([]);
  });
});
