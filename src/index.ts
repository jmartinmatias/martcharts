/**
 * fft-widgets: one universal widget block.
 *
 * Describe a widget as a spec (data, transform, fields, view, style), draw it
 * with `createWidget` or the `<fft-widget>` tag, and fork it into new widgets
 * with `fork`. Extend it by registering new sources, transforms, formats and views.
 *
 * Importing this module attaches the built-in renderers. In Node, import
 * `fft-widgets/core` instead: it has everything except drawing.
 *
 * @module
 */
export * from "./core/index.ts";

export { createWidget } from "./dom/widget.ts";
export type { SelectDetail, Widget, WidgetOptions } from "./dom/widget.ts";
export { defineWidgetElement } from "./dom/element.ts";
export { createPalettePicker } from "./dom/palette-picker.ts";
export { createDashboard } from "./dom/dashboard.ts";
export type { Dashboard, DashboardOptions } from "./dom/dashboard.ts";
export { download, svgToPng, toDelimited } from "./dom/export.ts";
export type { WidgetAction } from "./dom/export.ts";
export type { PalettePicker, PalettePickerOptions } from "./dom/palette-picker.ts";
export type { FftWidgetElement } from "./dom/element.ts";
export { applyStyle, BASE_CSS, ensureStyles, paletteSize } from "./dom/styles.ts";
export { arcPath, areaPath, bands, barPath, goldenHeight, layoutBars, layoutStacked, layoutWaterfall, linearScale, linePath, niceTicks, PHI, polar, quantize, squarify, swarm, layoutSankey, density, quantile, dodge, binValues, allocate, bandPath, spread, fitLabels, sectorPath } from "./dom/layout.ts";
export type { Band, BarOptions, BarRect, LinearScale } from "./dom/layout.ts";
export { renderKpis, renderRidgeline } from "./dom/views/index.ts";
export { renderArea, renderBar, renderBeeswarm, renderBoxplot, renderBullet, renderBump, renderCalendar, renderCandlestick, renderChord, renderDonut, renderDumbbell, renderSankey, renderFunnel, renderGauge, renderTreemap, renderHbar, renderHeatmap, renderHistogram, renderHorizon, renderIcicle, renderKpi, renderLikert, renderLine, renderList, renderMarimekko, renderMeter, renderPareto, renderRadar, renderRings, renderRose, renderScatter, renderSlope, renderSunburst, renderTable, renderTimeline, renderVariance, renderWaffle, renderWaterfall } from "./dom/views/index.ts";
export { buildTable, html, selectable, svg } from "./dom/views/shared.ts";
export { WIDGET_REF, widgetRef } from "./core/ref.ts";
export { explainChart } from "./core/explain.ts";
