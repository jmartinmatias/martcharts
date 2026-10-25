import { ICONS } from "../core/icons.ts";

/** The placeholder silhouettes a loading widget can show. */
export type SkeletonShape = "bars" | "rows" | "stat" | "ring" | "plot" | "lanes" | "grid" | "map";

/**
 * Every built-in view and the silhouette that stands in for it: columns for bars, labelled rows for row views,
 * lanes for views that run along a time axis row by row, a grid for cell views, a ring for round figures, a tile
 * map for maps, and a soft area for charts drawn on two axes. Views registered later get the generic plot.
 */
const SHAPES: Record<string, SkeletonShape> = {
  // Columns.
  bar: "bars", waterfall: "bars", histogram: "bars", pareto: "bars", candlestick: "bars", marimekko: "bars",
  // Labelled rows.
  table: "rows", list: "rows", ragboard: "grid", ragtrend: "grid", hbar: "rows", meter: "rows", bullet: "rows", funnel: "rows", dumbbell: "rows", dot: "rows",
  variance: "rows", likert: "rows", pyramid: "rows", strips: "rows", history: "rows", board: "rows",
  // Rows along a time or value axis.
  timeline: "lanes", lifecycle: "lanes", horizon: "lanes", ridgeline: "lanes", boxplot: "lanes", anomalies: "lanes", beeswarm: "lanes",
  // Cells.
  heatmap: "grid", calendar: "grid", waffle: "grid", matrix: "grid", whitespace: "grid", treemap: "grid", icicle: "grid",
  // Numbers.
  kpi: "stat", kpis: "stat", xray: "stat",
  // Round figures.
  donut: "ring", pie: "ring", rings: "ring", gauge: "ring", sunburst: "ring", chord: "ring", radar: "ring", rose: "ring",
  // Maps.
  choropleth: "map", symbols: "map", locator: "map",
  // Two axes.
  line: "plot", area: "plot", scatter: "plot", slope: "plot", bump: "plot", dual: "plot", sankey: "plot",
};

/** Bar heights for the bars skeleton, as percentages: an uneven skyline, so it reads as a chart. */
const SKYLINE = [55, 34, 89, 61, 76, 47, 100, 68];
/** Where each lane of the lanes skeleton starts and ends, as percentages of the axis. */
const LANES: [number, number][] = [[0, 55], [13, 76], [34, 89], [21, 62], [47, 100]];
/** Tiles left out of the map skeleton, so its edge is ragged like a coastline. */
const GAPS = new Set([0, 1, 5, 6, 7, 13, 27, 28, 33, 34]);

const SVG_NS = "http://www.w3.org/2000/svg";

/** Which silhouette stands in for a view while its data loads. Views not listed get the generic plot. */
export function skeletonShape(viewType: string): SkeletonShape {
  return SHAPES[viewType] ?? "plot";
}

/**
 * A quiet, pulsing placeholder in the shape of the view about to draw. Chart
 * shapes take the chart's own height so nothing moves when the data arrives.
 * It is decoration only: hidden from assistive technology.
 */
export function buildSkeleton(doc: Document, shape: SkeletonShape, height: number): HTMLElement {
  const box = doc.createElement("div");
  box.className = "fft-skeleton";
  box.dataset.shape = shape;
  box.setAttribute("aria-hidden", "true");
  const piece = (className?: string) => {
    const span = doc.createElement("span");
    if (className) span.className = className;
    return span;
  };
  if (shape === "bars") {
    for (const percent of SKYLINE) {
      const bar = piece();
      bar.style.height = `${percent}%`;
      box.append(bar);
    }
  } else if (shape === "rows") {
    for (let i = 0; i < 5; i++) {
      const row = piece("fft-skel-row");
      row.append(piece(), piece());
      box.append(row);
    }
  } else if (shape === "lanes") {
    // Each lane a bar starting somewhere along the axis, like tasks or stages on a timeline.
    for (const [from, to] of LANES) {
      const lane = piece("fft-skel-lane");
      const run = piece();
      run.style.marginLeft = `${from}%`;
      run.style.width = `${to - from}%`;
      lane.append(piece(), run);
      box.append(lane);
    }
  } else if (shape === "grid") {
    for (let i = 0; i < 24; i++) box.append(piece());
  } else if (shape === "map") {
    // A loose block of tiles, a few left out, so it reads as a tile map.
    for (let i = 0; i < 35; i++) {
      const tile = piece();
      if (GAPS.has(i)) tile.style.visibility = "hidden";
      box.append(tile);
    }
  } else if (shape === "stat") {
    box.append(piece(), piece());
  } else if (shape === "ring") {
    box.append(piece());
  } else {
    const plot = doc.createElementNS(SVG_NS, "svg");
    plot.setAttribute("viewBox", "0 0 100 100");
    plot.setAttribute("preserveAspectRatio", "none");
    const wash = doc.createElementNS(SVG_NS, "path");
    wash.setAttribute("d", "M0,72 C13,64 21,48 34,52 S55,30 68,34 S89,18 100,21 L100,100 L0,100 Z");
    plot.append(wash);
    box.append(plot);
  }
  if (shape === "bars" || shape === "plot" || shape === "ring" || shape === "map") box.style.height = `${height}px`;
  return box;
}

const EMPTY_GLYPH = ["M4 4v16h16", "M8 16v-2", "M12 16v-5", "M16 16v-3"];

/** A small round badge with a line icon: the bare chart for "empty", the alert triangle for errors. */
export function stateIcon(doc: Document, name: "empty" | "alert"): HTMLElement {
  const badge = doc.createElement("span");
  badge.className = "fft-state-icon";
  badge.dataset.icon = name;
  badge.setAttribute("aria-hidden", "true");
  const glyph = doc.createElementNS(SVG_NS, "svg");
  glyph.setAttribute("viewBox", "0 0 24 24");
  for (const d of name === "alert" ? (ICONS.alert ?? []) : EMPTY_GLYPH) {
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    glyph.append(path);
  }
  badge.append(glyph);
  return badge;
}
