import { describe, expect, test } from "vitest";
import { checkPalette } from "./color.ts";
import { describePresets, getPreset, registerPreset } from "./presets.ts";

describe("style presets", () => {
  test("ships default, glass, airy and paper, each described", () => {
    const presets = describePresets();
    expect(presets.map((p) => p.name)).toEqual(["airy", "default", "glass", "paper"]);
    expect(presets.every((p) => p.description.length > 20)).toBe(true);
  });

  test("the shipped palettes have 8 colors", () => {
    expect([getPreset("glass")?.palette?.length, getPreset("airy")?.palette?.length, getPreset("paper")?.palette?.length]).toEqual([8, 8, 8]);
  });

  test("paper's palette passes the colorblind checks on its own warm surface", () => {
    const palette = getPreset("paper")?.palette ?? [];
    expect(palette).toHaveLength(8);
    const report = checkPalette(palette, { mode: "light", surface: "#fbf8f3" });
    expect([report.ok, report.checks.find((c) => c.name === "cvd")?.state, report.checks.find((c) => c.name === "normal")?.state]).toEqual([true, "pass", "pass"]);
  });

  test("a registered preset can be looked up", () => {
    registerPreset({ name: "test-mono", description: "One-color test preset for the suite.", css: "& { --fft-accent: #000; }" });
    expect(getPreset("test-mono")?.css).toContain("--fft-accent");
  });

  test("an unknown name gives undefined", () => {
    expect(getPreset("nope")).toBeUndefined();
  });
});
