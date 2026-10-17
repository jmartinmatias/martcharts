import { describe, expect, test } from "vitest";
import { checkPalette, contrast, darkSteps, fromOklch, oklch, parseHex } from "./color.ts";

const DEFAULT_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const check = (report: ReturnType<typeof checkPalette>, name: string) => report.checks.find((c) => c.name === name);

describe("parseHex", () => {
  test("reads six and three digit hex, with or without #", () => {
    expect(parseHex("#ff8000")).toEqual([1, 128 / 255, 0]);
    expect(parseHex("0f0")).toEqual([0, 1, 0]);
  });

  test("anything else is null", () => {
    expect([parseHex("red"), parseHex("#12345"), parseHex("")]).toEqual([null, null, null]);
  });
});

describe("contrast", () => {
  test("black on white is 21:1", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  test("mid grey on white is about 4.48:1", () => {
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });
});

describe("oklch", () => {
  test("white has full lightness and no chroma", () => {
    const [L, C] = oklch("#ffffff");
    expect(L).toBeCloseTo(1, 3);
    expect(C).toBeCloseTo(0, 3);
  });
});

describe("checkPalette", () => {
  // Expected figures come from the data-viz skill's reference validator, an independent implementation.
  test("the default light palette passes with its documented worst adjacent separations", () => {
    const report = checkPalette(DEFAULT_LIGHT, { mode: "light" });
    expect(check(report, "cvd")?.value).toBeCloseTo(9.1, 1);
    expect(check(report, "normal")?.value).toBeCloseTo(19.6, 1);
    expect(report.checks.map((c) => [c.name, c.state])).toEqual([
      ["lightness", "pass"],
      ["chroma", "pass"],
      ["cvd", "pass"],
      ["normal", "pass"],
      ["contrast", "warn"],
    ]);
    expect(report.ok).toBe(true);
  });

  test("the glass preset palette clears colorblind separation on its dark surface", () => {
    const glass = ["#3987e5", "#c98500", "#199e70", "#d95926", "#9085e9", "#e66767", "#008300", "#d55181"];
    const report = checkPalette(glass, { mode: "dark", surface: "#1f2a29" });
    expect(check(report, "cvd")?.value).toBeCloseTo(8.4, 1);
    expect(check(report, "cvd")?.state).toBe("pass");
  });

  test("greys fail the chroma check: they cannot tell series apart by hue", () => {
    const report = checkPalette(["#111111", "#555555", "#999999"], { mode: "light" });
    expect(check(report, "chroma")?.state).toBe("fail");
    expect(report.ok).toBe(false);
  });

  test("CVD separation below the 6 floor fails", () => {
    // From the reference run: #a5d65a next to #ff8a65 measures 5.8 deutan, below the 6 floor.
    const report = checkPalette(["#a5d65a", "#ff8a65"], { mode: "dark", surface: "#1f2a29" });
    expect(check(report, "cvd")?.state).toBe("fail");
  });

  test("a color that is not hex is reported, not guessed", () => {
    const report = checkPalette(["#2a78d6", "tomato"], { mode: "light" });
    expect(report.ok).toBe(false);
    expect(report.checks[0]).toEqual({ name: "format", label: "Hex colors", state: "fail", value: null, message: 'Only hex colors can be checked: "tomato".' });
  });

  test("one color has no neighbours to compare", () => {
    const report = checkPalette(["#2a78d6"], { mode: "light" });
    expect(check(report, "cvd")?.state).toBe("pass");
  });
});

describe("fromOklch", () => {
  test("turns OKLCH back into the same hex, and pulls an out-of-gamut color in by giving up chroma", () => {
    const [l, c, h] = oklch("#2a78d6");
    expect(fromOklch(l, c, h)).toBe("#2a78d6");
    const vivid = fromOklch(0.6, 0.5, 30);
    expect(parseHex(vivid)).not.toBeNull();
    expect(oklch(vivid)[1]).toBeLessThan(0.5);
  });
});

describe("darkSteps", () => {
  test("keeps each hue and moves lightness into the dark band", () => {
    const light = ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7"];
    const dark = darkSteps(light);
    expect(dark.length).toBe(light.length);
    expect(checkPalette(dark, { mode: "dark" }).checks.find((c) => c.name === "lightness")?.state).toBe("pass");
    dark.forEach((color, i) => expect(Math.abs(oklch(color)[2] - oklch(light[i] as string)[2])).toBeLessThan(6));
  });

  test("greys flip, so the first series stays the most prominent on a dark card", () => {
    const dark = darkSteps(["#111111", "#4d4d4d", "#808080", "#b3b3b3"]);
    const lightness = dark.map((c) => oklch(c)[0]);
    expect(lightness.every((l, i) => i === 0 || l < (lightness[i - 1] as number))).toBe(true);
    expect(contrast(dark.at(-1) as string, "#1a1a19")).toBeGreaterThan(1.5);
  });

  test("eight greys stay eight distinct greys when they flip", () => {
    const dark = darkSteps(["#1f1f1f", "#383838", "#525252", "#6b6b6b", "#858585", "#9e9e9e", "#b8b8b8", "#d1d1d1"]);
    expect(new Set(dark).size).toBe(8);
  });
});
