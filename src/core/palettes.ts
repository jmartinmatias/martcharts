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
  /** The same series stepped for dark backgrounds, when the palette has its own dark steps. */
  darkColors?: string[];
  /** Where the colors come from, when they belong to someone else's brand or system. */
  source?: string;
}

const palettes = new Map<string, NamedPalette>();

/** Adds or replaces a palette. */
export function registerPalette(palette: NamedPalette): void {
  if (!palette.name) throw new Error("A palette needs a name.");
  palettes.set(palette.name, palette);
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
  description: "Apple's system colors (light appearance), ordered for the widest colorblind separation. Vivid; yellow and orange need labels on white.",
  colors: ["#007AFF", "#34C759", "#AF52DE", "#FF9500", "#30B0C7", "#FF3B30", "#FFCC00", "#FF2D55"],
  source: "Apple Human Interface Guidelines system colors, light appearance.",
});
