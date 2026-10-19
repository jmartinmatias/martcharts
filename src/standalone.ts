/**
 * The drop-in build: everything in `fft-widgets`, with `<fft-widget>` already registered.
 *
 * Built to `dist/fft-widgets.js` (ES module) and `dist/fft-widgets.iife.js` (classic script,
 * exposed as `window.FFTWidgets`) by `npm run build:lib`. Neither needs a bundler or Node:
 *
 * ```html
 * <script src="fft-widgets.iife.js"></script>
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
    /** The classic-script build (`fft-widgets.iife.js`) puts the whole API here. */
    FFTWidgets?: typeof import("./index.ts");
  }
}

if (typeof customElements !== "undefined") defineWidgetElement();
