/**
 * Color science for palettes: perceptual lightness and chroma (OKLab, OKLCH),
 * colorblind simulation (Machado, Oliveira and Fernandes 2009), WCAG contrast,
 * and a palette check that says, in numbers, whether a set of series colors
 * can be told apart.
 *
 * The thresholds match the house data-viz rules: lightness inside the mode's
 * band, chroma at least 0.10, adjacent colors at least 8 apart under
 * simulated red-green colorblindness (6 to 8 needs direct labels), at least 15
 * apart for everyone else, and 3:1 contrast against the surface.
 *
 * @module
 */

/** A color as sRGB channels from 0 to 1. */
export type Rgb = [number, number, number];

/** Reads `#rrggbb` or `#rgb` (the # is optional). Anything else gives null. */
export function parseHex(hex: string): Rgb | null {
  const raw = hex.trim().replace(/^#/, "");
  const full = /^[0-9a-f]{3}$/i.test(raw) ? [...raw].map((c) => c + c).join("") : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as Rgb;
}

/** Writes channels from 0 to 1 as `#rrggbb`. */
export function toHex([r, g, b]: Rgb): string {
  const byte = (c: number) => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function linear(hex: string): Rgb {
  const rgb = parseHex(hex);
  if (!rgb) throw new Error(`Not a hex color: "${hex}".`);
  return rgb.map(toLinear) as Rgb;
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = linear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

function oklabFromLinear([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab: perceptual lightness L (0 to 1) and the a, b color axes. */
export function oklab(hex: string): Rgb {
  return oklabFromLinear(linear(hex));
}

/** OKLCH: perceptual lightness, chroma (colorfulness) and hue in degrees. */
export function oklch(hex: string): [number, number, number] {
  const [L, a, b] = oklab(hex);
  return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
}

/** Kinds of color vision deficiency that can be simulated. */
export type Deficiency = "protan" | "deutan" | "tritan";

// Machado, Oliveira and Fernandes (2009), severity 1.0, applied to linear RGB.
const MACHADO: Record<Deficiency, number[][]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function simulateLinear(rgb: Rgb, kind: Deficiency): Rgb {
  const m = MACHADO[kind];
  const clamp = (c: number) => Math.max(0, Math.min(1, c));
  return m.map((row) => clamp((row[0] ?? 0) * rgb[0] + (row[1] ?? 0) * rgb[1] + (row[2] ?? 0) * rgb[2])) as Rgb;
}

/** Perceptual distance between two colors (OKLab ΔE × 100), optionally as a person with `kind` deficiency sees them. */
export function deltaE(a: string, b: string, kind?: Deficiency): number {
  const pa = oklabFromLinear(kind ? simulateLinear(linear(a), kind) : linear(a));
  const pb = oklabFromLinear(kind ? simulateLinear(linear(b), kind) : linear(b));
  return 100 * Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
}

/** One line of a palette check. `value` is the measured figure when there is one. */
export interface PaletteCheck {
  name: "format" | "lightness" | "chroma" | "cvd" | "normal" | "contrast";
  label: string;
  state: "pass" | "warn" | "fail";
  value: number | null;
  message: string;
}

/** The result of `checkPalette`. `ok` is false when any check fails; warnings keep it true. */
export interface PaletteReport {
  ok: boolean;
  checks: PaletteCheck[];
}

const BAND = { light: [0.43, 0.77], dark: [0.48, 0.67] } as const;
const SURFACE = { light: "#fcfcfb", dark: "#1a1a19" } as const;
const CHROMA_FLOOR = 0.1;
const CVD_TARGET = 8;
const CVD_FLOOR = 6;
const NORMAL_FLOOR = 15;
const CONTRAST_MIN = 3;

/**
 * Checks whether series colors, in this order, can be told apart. Adjacent
 * colors are compared, as they sit side by side in bars, stacks and legends.
 *
 * @param opts.mode Which lightness band applies.
 * @param opts.surface The chart background. Defaults to the house light or dark surface.
 *
 * @example
 * const report = checkPalette(["#2a78d6", "#eb6834", "#1baf7a"], { mode: "light" });
 * report.checks.find((c) => c.name === "cvd"); // { state: "pass", value: 15.4, ... }
 */
export function checkPalette(colors: string[], opts: { mode: "light" | "dark"; surface?: string }): PaletteReport {
  const bad = colors.find((c) => !parseHex(c));
  if (bad !== undefined) {
    return { ok: false, checks: [{ name: "format", label: "Hex colors", state: "fail", value: null, message: `Only hex colors can be checked: "${bad}".` }] };
  }
  const surface = opts.surface ?? SURFACE[opts.mode];
  const [low, high] = BAND[opts.mode];
  const checks: PaletteCheck[] = [];

  const offBand = colors.filter((c) => {
    const L = oklch(c)[0];
    return L < low || L > high;
  });
  checks.push({
    name: "lightness",
    label: "Lightness band",
    state: offBand.length ? "fail" : "pass",
    value: null,
    message: offBand.length ? `Too light or too dark for this background: ${offBand.join(", ")}.` : `Every color sits between L ${low} and ${high}.`,
  });

  const dull = colors.filter((c) => oklch(c)[1] < CHROMA_FLOOR);
  checks.push({
    name: "chroma",
    label: "Colorfulness",
    state: dull.length ? "fail" : "pass",
    value: null,
    message: dull.length ? `Reads as grey, so hue cannot tell it apart: ${dull.join(", ")}.` : "Every color is vivid enough to read as a hue.",
  });

  const pairs = colors.slice(1).map((c, i) => [colors[i] as string, c] as const);
  let cvd = Number.POSITIVE_INFINITY;
  let cvdPair = "";
  let normal = Number.POSITIVE_INFINITY;
  let normalPair = "";
  for (const [a, b] of pairs) {
    for (const kind of ["protan", "deutan"] as const) {
      const d = deltaE(a, b, kind);
      if (d < cvd) [cvd, cvdPair] = [d, `${a} and ${b}`];
    }
    const d = deltaE(a, b);
    if (d < normal) [normal, normalPair] = [d, `${a} and ${b}`];
  }
  const round = (n: number) => Math.round(n * 10) / 10;
  if (pairs.length === 0) {
    checks.push({ name: "cvd", label: "Colorblind separation", state: "pass", value: null, message: "One color: nothing to tell apart." });
    checks.push({ name: "normal", label: "Neighbour separation", state: "pass", value: null, message: "One color: nothing to tell apart." });
  } else {
    checks.push({
      name: "cvd",
      label: "Colorblind separation",
      state: cvd >= CVD_TARGET ? "pass" : cvd >= CVD_FLOOR ? "warn" : "fail",
      value: round(cvd),
      message:
        cvd >= CVD_TARGET
          ? `Closest neighbours under red-green colorblindness are ${round(cvd)} apart (8 or more is the target).`
          : cvd >= CVD_FLOOR
            ? `${cvdPair} are only ${round(cvd)} apart under red-green colorblindness: add direct labels.`
            : `${cvdPair} look alike under red-green colorblindness (${round(cvd)}, below 6): reorder or replace one.`,
    });
    checks.push({
      name: "normal",
      label: "Neighbour separation",
      state: normal >= NORMAL_FLOOR ? "pass" : "fail",
      value: round(normal),
      message: normal >= NORMAL_FLOOR ? `Closest neighbours are ${round(normal)} apart (15 or more needed).` : `${normalPair} are too alike even with full color vision (${round(normal)}, below 15).`,
    });
  }

  const faint = colors.filter((c) => contrast(c, surface) < CONTRAST_MIN);
  checks.push({
    name: "contrast",
    label: "Contrast on background",
    state: faint.length ? "warn" : "pass",
    value: null,
    message: faint.length ? `Below 3:1 on the background, so keep values readable with labels or the table: ${faint.join(", ")}.` : "Every color reaches 3:1 on the background.",
  });

  return { ok: checks.every((c) => c.state !== "fail"), checks };
}
