/**
 * The drop-in build: everything in `martcharts`, with `<fft-widget>` already registered.
 *
 * Built to `dist/martcharts.js` (ES module) and `dist/martcharts.iife.js` (classic script,
 * exposed as `window.MartCharts`) by `npm run build:lib`. Neither needs a bundler or Node:
 *
 * ```html
 * <script src="martcharts.iife.js"></script>
 * <fft-widget src="/widgets/revenue-by-region.json"></fft-widget>
 * ```
 *
 * @module
 */
import { defineWidgetElement } from "./dom/element.ts";
import type { FftWidgetElement } from "./dom/element.ts";

export * from "./index.ts";

declare global {
  interface HTMLElementTagNameMap {
    "fft-widget": FftWidgetElement;
  }
  interface Window {
    /** The classic-script build (`martcharts.iife.js`) puts the whole API here. */
    MartCharts?: typeof import("./index.ts");
  }
}

if (typeof customElements !== "undefined") defineWidgetElement();
