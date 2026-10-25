/**
 * The lite drop-in build: what a page needs to show charts and dashboards, and nothing for making them.
 *
 * Built to `dist/martcharts-lite.js` (ES module) and `dist/martcharts-lite.iife.js` (classic script, exposed as
 * `window.MartCharts`) by `npm run build:lib`. It registers `<fft-widget>` on load and sizes chart iframes, like the
 * full build, and leaves out the editor, the composer, the Taller, the palette picker and the chart guide. Use it on
 * pages that only display charts; use `martcharts.iife.js` where people make or edit them.
 *
 * ```html
 * <script src="martcharts-lite.iife.js"></script>
 * <fft-widget src="/widgets/revenue-by-region.json"></fft-widget>
 * ```
 *
 * @module
 */
import { defineWidgetElement } from "./dom/element.ts";
import type { FftWidgetElement } from "./dom/element.ts";
import { listenForEmbedHeights } from "./dom/embed.ts";
import "./dom/views/index.ts";

export { createWidget } from "./dom/widget.ts";
export type { SelectDetail, Widget, WidgetOptions } from "./dom/widget.ts";
export { defineWidgetElement } from "./dom/element.ts";
export type { FftWidgetElement } from "./dom/element.ts";
export { createDashboard } from "./dom/dashboard.ts";
export type { Dashboard, DashboardOptions } from "./dom/dashboard.ts";
export { HEIGHT_MESSAGE, listenForEmbedHeights, mountEmbed, postHeights } from "./dom/embed.ts";
export type { Embedded } from "./dom/embed.ts";
export { cardToPng, cardToSvg, download, toDelimited } from "./dom/export.ts";
export type { WidgetAction } from "./dom/export.ts";
export { applyStyle, ensureStyles } from "./dom/styles.ts";
export { baseWidget } from "./core/base.ts";
export { fork } from "./core/fork.ts";
export { runPipeline } from "./core/pipeline.ts";
export { hasErrors, validateSpec } from "./core/validate.ts";
export { explainChart } from "./core/explain.ts";
export { blockTypes, describeBlocks, getBlock, hasBlock, registerFormat, registerSource, registerTransform, registerView, setRenderer } from "./core/registry.ts";
export { formatValue } from "./core/display.ts";
export { wordsFor } from "./core/words.ts";
export { widgetRef } from "./core/ref.ts";
export type { DataSpec, FieldSpec, FormatSpec, Row, StyleSpec, TransformSpec, ViewSpec, WidgetSpec } from "./core/types.ts";
export type { DashboardSpec } from "./core/dashboard.ts";

declare global {
  interface HTMLElementTagNameMap {
    "fft-widget": FftWidgetElement;
  }
}

if (typeof customElements !== "undefined") defineWidgetElement();
// A page that loads the bundle sizes its chart iframes (embed.html) to their content, with no script of its own.
if (typeof window !== "undefined") listenForEmbedHeights(window);
