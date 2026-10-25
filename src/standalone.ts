/**
 * The drop-in build: the whole API in one file, with `<fft-widget>` already registered.
 *
 * Built to `dist/martcharts.js` (ES module) and `dist/martcharts.iife.js` (classic script, exposed as
 * `window.MartCharts`) by `npm run build:lib`. Neither needs a bundler or Node. Unlike the package's front door,
 * `martcharts`, which holds the few names most pages need, this build carries everything: the front door and
 * `martcharts/core`, `martcharts/kit`, `martcharts/color`, `martcharts/geo` and `martcharts/taller`, so a page with
 * one script tag reaches any of it as `MartCharts.<name>`.
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
import { listenForEmbedHeights } from "./dom/embed.ts";

export * from "./core/index.ts";
export * from "./index.ts";
export * from "./kit.ts";
export * from "./color.ts";
export * from "./geo.ts";
export * from "./taller.ts";

declare global {
  interface HTMLElementTagNameMap {
    "fft-widget": FftWidgetElement;
  }
  interface Window {
    /** The classic-script build (`martcharts.iife.js`) puts the whole API here. */
    MartCharts?: typeof import("./standalone.ts");
  }
}

if (typeof customElements !== "undefined") defineWidgetElement();
// A page that loads the bundle sizes its chart iframes (embed.html) to their content, with no script of its own.
if (typeof window !== "undefined") listenForEmbedHeights(window);
