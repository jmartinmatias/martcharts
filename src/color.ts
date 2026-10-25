/**
 * `martcharts/color`: colour science and palettes.
 *
 * - OKLab and OKLCH conversions, contrast, luminance and ΔE, and `checkPalette`, which tests a palette for
 *   contrast and colour-blind separation.
 * - The named palettes: list them, read one, resolve a style's palette, register your own (also in `martcharts`).
 * - `createPalettePicker`, the palette chooser the editor uses, for your own settings pages.
 *
 * No DOM except the picker, which needs a document only when it is created.
 *
 * @module
 */
export { checkPalette, contrast, deltaE, luminance, oklab, oklch, parseHex, toHex } from "./core/color.ts";
export type { Deficiency, PaletteCheck, PaletteReport, Rgb } from "./core/color.ts";
export { describePalettes, getPalette, paletteNames, registerPalette, resolvePalette } from "./core/palettes.ts";
export type { NamedPalette } from "./core/palettes.ts";
export { createPalettePicker } from "./dom/palette-picker.ts";
export type { PalettePicker, PalettePickerOptions } from "./dom/palette-picker.ts";
