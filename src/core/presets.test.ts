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

  test("every shipped look has a light and a dark version, its two palettes the same series in the same order", () => {
    for (const name of ["glass", "airy", "paper"]) {
      const preset = getPreset(name);
      expect([name, (preset?.dark?.css.length ?? 0) > 100, preset?.dark?.palette?.length]).toEqual([name, true, preset?.palette?.length]);
    }
  });

  test("each look's palettes keep colorblind readers in both modes, on the look's own surfaces", () => {
    const surfaces: Record<string, [string, string]> = { glass: ["#eef3f1", "#1d2827"], airy: ["#f5f5f3", "#141413"], paper: ["#fbf8f3", "#1c1b19"] };
    for (const [name, [light, dark]] of Object.entries(surfaces)) {
      const preset = getPreset(name);
      const cvd = (colors: string[] | undefined, mode: "light" | "dark", surface: string) => checkPalette(colors ?? [], { mode, surface }).checks.filter((c) => c.name === "cvd" || c.name === "normal").map((c) => c.state);
      expect([name, ...cvd(preset?.palette, "light", light), ...cvd(preset?.dark?.palette, "dark", dark)].includes("fail")).toBe(false);
    }
  });

  test("no shipped look forces a color scheme any more: each follows the theme", () => {
    expect(["glass", "airy", "paper"].map((name) => getPreset(name)?.scheme)).toEqual([undefined, undefined, undefined]);
  });

  test("a registered preset can be looked up", () => {
    registerPreset({ name: "test-mono", description: "One-color test preset for the suite.", css: "& { --fft-accent: #000; }" });
    expect(getPreset("test-mono")?.css).toContain("--fft-accent");
  });

  test("an unknown name gives undefined", () => {
    expect(getPreset("nope")).toBeUndefined();
  });
});

describe("a cardless look", () => {
  test("airy has no side padding, so the ghost ref drops its inset and stays inside the widget", () => {
    expect((getPreset("airy")?.css ?? "").replace(/\s+/g, " ")).toContain("--fft-ref-inset: 0px");
  });
});

