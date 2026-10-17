import { describe, expect, test } from "vitest";
import { parseHex } from "./color.ts";
import { describePalettes, getPalette, registerPalette, resolvePalette } from "./palettes.ts";

describe("palette library", () => {
  test("ships the default, black and white, 50 shades, Credit Agricole and Apple palettes", () => {
    expect(describePalettes().map((p) => [p.name, p.label])).toEqual([
      ["50-shades", "50 Shades"],
      ["apple", "Apple"],
      ["bw", "B&W"],
      ["credit-agricole", "Crédit Agricole"],
      ["default", "Default"],
    ]);
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
    expect(resolvePalette({ preset: "glass" })?.[0]).toBe("#3987e5");
  });

  test("with neither, there is no override", () => {
    expect([resolvePalette({}), resolvePalette(undefined), resolvePalette({ palette: "default" })]).toEqual([undefined, undefined, undefined]);
  });
});
