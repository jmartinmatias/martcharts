/**
 * The palette library: named sets of series colors a widget can use with
 * `style: { palette: "apple" }`, alongside a plain list of colors.
 *
 * Shipped palettes are not all equal for telling series apart: `checkPalette`
 * reports honestly on each. The greys (B&W, 50 Shades) are for single-series
 * charts, emphasis and print, not for many series.
 *
 * @module
 */
import { darkSteps } from "./color.ts";
import { getPreset } from "./presets.ts";
import type { StyleSpec } from "./types.ts";

/** A named set of series colors. */
export interface NamedPalette {
  /** The name used in specs: `style.palette: "<name>"`. */
  name: string;
  /** Display name, for pickers. */
  label: string;
  /** One sentence on the palette and when it suits. */
  description: string;
  /** Hex colors in series order. */
  colors: string[];
  /** The same series stepped for dark backgrounds. Derived by `darkSteps` when a palette is registered without them. */
  darkColors?: string[];
  /** True when the dark steps were derived here rather than published with the palette. */
  darkDerived?: boolean;
  /** Where the colors come from, when they belong to someone else's brand or system. */
  source?: string;
}

const palettes = new Map<string, NamedPalette>();

/** Adds or replaces a palette. Every palette gets a light and a dark set: missing dark steps are derived. */
export function registerPalette(palette: NamedPalette): void {
  if (!palette.name) throw new Error("A palette needs a name.");
  const own = palette.darkColors?.length === palette.colors.length;
  palettes.set(palette.name, own ? palette : { ...palette, darkColors: darkSteps(palette.colors), darkDerived: true });
}

/** Looks up a palette by name. */
export function getPalette(name: string): NamedPalette | undefined {
  return palettes.get(name);
}

/** Registered palette names, sorted. */
export function paletteNames(): string[] {
  return [...palettes.keys()].sort();
}

/** Every palette, sorted by name. JSON-safe. */
export function describePalettes(): NamedPalette[] {
  return paletteNames().map((name) => palettes.get(name) as NamedPalette);
}

/**
 * The series colors a style asks for, or `undefined` to keep the theme's own
 * light and dark steps. Order of precedence: `style.palette` (a list, or a
 * library name other than "default"), then the preset's palette.
 */
export function resolvePalette(style: StyleSpec | undefined): string[] | undefined {
  const own = style?.palette;
  if (Array.isArray(own)) return own;
  if (typeof own === "string" && own !== "default") return getPalette(own)?.colors;
  return getPreset(style?.preset)?.palette;
}

registerPalette({
  name: "default",
  label: "Default",
  description: "The validated house palette, with its own dark-mode steps. Choosing it removes any palette override.",
  colors: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
  darkColors: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
});

registerPalette({
  name: "bw",
  label: "B&W",
  description: "Black to light grey, for print and monochrome reports. Best with one series, or with labels on every series.",
  colors: ["#111111", "#4d4d4d", "#808080", "#b3b3b3"],
});

registerPalette({
  name: "50-shades",
  label: "50 Shades",
  description: "Eight greys from charcoal to silver, for quiet context or highlighting one series in color against the rest.",
  colors: ["#1f1f1f", "#383838", "#525252", "#6b6b6b", "#858585", "#9e9e9e", "#b8b8b8", "#d1d1d1"],
});

registerPalette({
  name: "credit-agricole",
  label: "Crédit Agricole",
  description: "The bank's green, teal and red identity with a neutral grey, ordered so neighbours stay apart for colorblind readers.",
  colors: ["#006C4D", "#00969A", "#E30613", "#6E7378"],
  source: "Approximate logo colors from public logo databases (coloropedia.com, whatthelogo.com); confirm against official brand assets. The grey is a neutral addition.",
});

registerPalette({
  name: "apple",
  label: "Apple",
  description: "Apple's system colors, light and dark appearances, ordered for the widest colorblind separation. Vivid; yellow and orange need labels on white.",
  colors: ["#007AFF", "#34C759", "#AF52DE", "#FF9500", "#30B0C7", "#FF3B30", "#FFCC00", "#FF2D55"],
  darkColors: ["#0A84FF", "#30D158", "#BF5AF2", "#FF9F0A", "#40C8E0", "#FF453A", "#FFD60A", "#FF375F"],
  source: "Apple Human Interface Guidelines system colors (iOS 13 to 18), light and dark appearances.",
});

// Five acclaimed palettes, colors exactly as published. Each one's checkPalette report is honest about its trade-offs.

registerPalette({
  name: "okabe-ito",
  label: "Okabe-Ito",
  description: "The colorblind-safe standard of science publishing: seven hues that stay distinct under every common color vision deficiency. Orange, sky blue and yellow are light, so give them labels on white.",
  colors: ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7"],
  source: "Okabe and Ito, Color Universal Design (2008); popularised by Wong, Nature Methods 8, 441 (2011). Black is left out, as it reads as text.",
});

registerPalette({
  name: "tol-vibrant",
  label: "Paul Tol Vibrant",
  description: "Paul Tol's vibrant qualitative scheme, designed for colorblind readers and screens. Ordered here so no two neighbours are alike; orange and cyan want labels on white.",
  colors: ["#EE7733", "#0077BB", "#EE3377", "#33BBEE", "#CC3311", "#009988"],
  source: "Paul Tol, Colour Schemes (SRON technical note, 2021), vibrant scheme. The grey for missing data is left out.",
});

registerPalette({
  name: "tableau-10",
  label: "Tableau 10",
  description: "Tableau's default since 2016: ten calm, slightly muted hues tuned to look balanced together, a safe choice for business dashboards with many series.",
  colors: ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"],
  source: "Tableau 10 by Maureen Stone (2016), as published in d3-scale-chromatic (schemeTableau10).",
});

registerPalette({
  name: "carbon",
  label: "IBM Carbon",
  description: "IBM Carbon's categorical palette, in its strict published sequence for the widest contrast between neighbours, with Carbon's own steps for dark themes.",
  colors: ["#6929c4", "#1192e8", "#005d5d", "#9f1853", "#fa4d56", "#520408", "#198038", "#002d9c"],
  darkColors: ["#8a3ffc", "#33b1ff", "#007d79", "#ff7eb6", "#fa4d56", "#fff1f1", "#6fdc8c", "#4589ff"],
  source: "IBM Carbon Design System, data visualization categorical palette (first 8 of 14, light and dark themes), from @carbon/colors tokens and carbon-charts.",
});

registerPalette({
  name: "observable-10",
  label: "Observable 10",
  description: "Observable Plot's default since 2024: ten bright, friendly hues designed for the web, balanced in lightness so no series shouts over the rest.",
  colors: ["#4269d0", "#efb118", "#ff725c", "#6cc5b0", "#3ca951", "#ff8ab7", "#a463f2", "#97bbf5", "#9c6b4e", "#9498a0"],
  source: "Observable 10, as published in d3-scale-chromatic (schemeObservable10).",
});
