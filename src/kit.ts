/**
 * `martcharts/kit`: the drawing kit, for custom views and hosts that build their own surfaces.
 *
 * - The built-in renderers (`renderBar`, `renderLine` and the rest), to draw one view inside your own `render`.
 * - Layout and geometry: scales, ticks, bars, arcs, stacks, treemaps, swarms, Sankey links, label fitting.
 * - `html` and `svg` element helpers, the shared table, legend and hit-testing helpers custom views use.
 * - Styles: the base CSS and the style tokens.
 * - The editor and composer plumbing: hash state, row readers, the saved-board store.
 *
 * Importing it attaches the built-in renderers, as `martcharts` does.
 *
 * @module
 */
import "./dom/views/index.ts";

export { renderArea, renderBar, renderBeeswarm, renderBoxplot, renderBullet, renderBump, renderCalendar, renderCandlestick, renderChord, renderDonut, renderDumbbell, renderFunnel, renderGauge, renderHbar, renderHeatmap, renderHistogram, renderHorizon, renderIcicle, renderKpi, renderKpis, renderLikert, renderLine, renderList, renderMarimekko, renderMeter, renderPareto, renderRadar, renderRidgeline, renderRings, renderRose, renderSankey, renderScatter, renderSlope, renderSunburst, renderTable, renderTimeline, renderTreemap, renderVariance, renderWaffle, renderWaterfall } from "./dom/views/index.ts";
export { allocate, arcPath, areaPath, bandPath, bands, barPath, binValues, CHAR_WIDTH, density, DIM, dodge, endRoom, fitLabels, GAP, goldenHeight, LABEL_COLUMN, labelColumn, layoutBars, layoutSankey, layoutStacked, layoutWaterfall, linearScale, linePath, niceTicks, PHI, polar, quantile, quantize, ROW, rowHeight, sectorPath, spread, squarify, swarm, textWidth } from "./dom/layout.ts";
export type { Band, BarOptions, BarRect, LinearScale } from "./dom/layout.ts";
export { sturges } from "./core/scale.ts";
export type { Bin } from "./core/scale.ts";
export { activeGroup, buildTable, hiddenTableOf, html, legendList, rowHit, selectable, shareFormat, svg } from "./dom/views/shared.ts";
export type { ActiveGroup, LegendEntry, RowHitOptions, SwatchShape } from "./dom/views/shared.ts";
export { applyStyle, BASE_CSS, ensureStyles, paletteSize } from "./dom/styles.ts";
export { svgToPng, toDelimited } from "./dom/export.ts";
export { fromBase64Url, HEIGHT_MESSAGE, toBase64Url } from "./dom/embed.ts";
export { columnKind, ensureEditorStyles, gridOf, readHash, rowsFromJson, rowsFromTable, STRINGS as EDITOR_STRINGS, writeHash } from "./dom/editor.ts";
export { boardFromHash, boardToHash } from "./dom/composer.ts";
export { addChartToBoard, localBoardStore } from "./dom/board-store.ts";
export type { BoardStore, SavedBoard, SavedChart } from "./dom/board-store.ts";
export { ICON_NAMES, ICONS } from "./core/icons.ts";
