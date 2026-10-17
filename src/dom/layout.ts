/**
 * Chart geometry: ticks, scales, bands, bar shapes and line paths.
 * Pure functions with no DOM, so custom chart views can reuse them.
 *
 * Proportions follow Fibonacci framing: bars at most 21px wide, a bar group
 * fills 1/φ (0.618) of its band, a 2px gap between neighbours, 4px rounding at
 * the data end and square at the baseline, and charts φ times wider than tall.
 *
 * @module
 */
import { binValues, niceTicks } from "../core/scale.ts";

// Round ticks and bins live in the core (transforms use them too); drawing code keeps importing them from here.
export { binValues, niceTicks };
export type { Bin } from "../core/scale.ts";

/** The golden ratio, φ. */
export const PHI = (1 + Math.sqrt(5)) / 2;

/** Default chart height for a width: width / φ, kept between 180 and 320 pixels. */
export function goldenHeight(width: number): number {
  return Math.min(320, Math.max(180, Math.round(width / PHI)));
}

/** Rounds away floating point noise such as 0.30000000000000004. */
function tidy(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

/** Writes a coordinate for SVG with at most 2 decimals. */
function px(value: number): string {
  return String(tidy(value, 2));
}

/** A function from data value to pixel, with the domain it covers and its tick values. */
export interface LinearScale {
  (value: number): number;
  domain: [number, number];
  ticks: number[];
}

/**
 * A linear scale whose domain is the nice tick range around `values`.
 *
 * @param range Pixel positions for the domain's low and high ends. For a y axis pass `[bottom, top]`.
 * @param opts.includeZero Stretch the domain to include 0. Always true for bars, which must start at zero.
 * @param opts.nice Round the domain out to the outer ticks (the default). False fits it to the values exactly, for charts with no value axis.
 */
export function linearScale(values: number[], range: [number, number], opts: { includeZero: boolean; count?: number; nice?: boolean }): LinearScale {
  let low = values.length ? Math.min(...values) : 0;
  let high = values.length ? Math.max(...values) : 1;
  if (opts.includeZero) {
    low = Math.min(low, 0);
    high = Math.max(high, 0);
  }
  const ticks = niceTicks(low, high, opts.count);
  const domain: [number, number] = opts.nice === false ? [low, high] : [ticks[0] ?? low, ticks[ticks.length - 1] ?? high];
  const [r0, r1] = range;
  const span = domain[1] - domain[0] || 1;
  const scale = (value: number) => r0 + ((value - domain[0]) / span) * (r1 - r0);
  return Object.assign(scale, { domain, ticks });
}

/** One equal slice of the horizontal axis for one category. */
export interface Band {
  start: number;
  width: number;
  center: number;
}

/** Splits `width` pixels starting at `x` into `count` equal bands. */
export function bands(count: number, x: number, width: number): Band[] {
  const size = count > 0 ? width / count : 0;
  return Array.from({ length: count }, (_, i) => {
    const start = x + i * size;
    return { start, width: size, center: start + size / 2 };
  });
}

/** Where one bar goes. `y` is the top edge, `height` always positive. */
export interface BarRect {
  series: number;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  negative: boolean;
  /** False for a stacked segment under another one: it stays square at both ends. */
  cap?: boolean;
}

/** Bar sizing. Defaults: 21px widest, 2px between grouped bars, a group fills at most 1/φ (0.618) of its band. */
export interface BarOptions {
  maxWidth?: number;
  gap?: number;
  fill?: number;
}

/**
 * Places grouped bars.
 *
 * @param values `values[series][category]`. `null` draws nothing.
 * @param bandList One band per category, from `bands()`.
 * @param scale The y scale. Bars grow from its zero (or the nearest domain edge).
 */
export function layoutBars(values: (number | null)[][], bandList: Band[], scale: LinearScale, opts: BarOptions = {}): BarRect[] {
  const { maxWidth = 21, gap = 2, fill = 1 / PHI } = opts;
  const seriesCount = values.length;
  const baseline = scale(Math.max(scale.domain[0], Math.min(0, scale.domain[1])));
  const rects: BarRect[] = [];
  bandList.forEach((band, index) => {
    const barWidth = Math.max(1, Math.min(maxWidth, (band.width * fill - gap * (seriesCount - 1)) / seriesCount));
    const groupWidth = seriesCount * barWidth + gap * (seriesCount - 1);
    const groupStart = band.center - groupWidth / 2;
    values.forEach((seriesValues, series) => {
      const value = seriesValues[index];
      if (value === null || value === undefined) return;
      const end = scale(value);
      rects.push({
        series,
        index,
        x: groupStart + series * (barWidth + gap),
        y: Math.min(end, baseline),
        width: barWidth,
        height: Math.abs(end - baseline),
        value,
        negative: value < 0,
      });
    });
  });
  return rects;
}

/** SVG path for a bar, rounded at the data end (top, or bottom when negative) and square at the baseline. */
export function barPath(rect: BarRect, radius = 4): string {
  const { x, y, width: w, height: h } = rect;
  if (rect.cap === false) {
    return rect.negative ? `M${px(x)},${px(y)}V${px(y + h)}H${px(x + w)}V${px(y)}Z` : `M${px(x)},${px(y + h)}V${px(y)}H${px(x + w)}V${px(y + h)}Z`;
  }
  const r = Math.min(radius, w / 2, h / 2);
  if (rect.negative) {
    const end = y + h;
    return `M${px(x)},${px(y)}V${px(end - r)}Q${px(x)},${px(end)} ${px(x + r)},${px(end)}H${px(x + w - r)}Q${px(x + w)},${px(end)} ${px(x + w)},${px(end - r)}V${px(y)}Z`;
  }
  const base = y + h;
  return `M${px(x)},${px(base)}V${px(y + r)}Q${px(x)},${px(y)} ${px(x + r)},${px(y)}H${px(x + w - r)}Q${px(x + w)},${px(y)} ${px(x + w)},${px(y + r)}V${px(base)}Z`;
}

/** SVG path through points, starting a new segment after each `null` so gaps in the data stay visible. */
export function linePath(points: ({ x: number; y: number } | null)[]): string {
  let d = "";
  let pen = false;
  for (const point of points) {
    if (!point) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${px(point.x)},${px(point.y)}`;
    pen = true;
  }
  return d;
}

/**
 * SVG path for the filled area under a line: each unbroken run of points is
 * closed down to `baseline`. Runs of a single point draw nothing.
 */
export function areaPath(points: ({ x: number; y: number } | null)[], baseline: number): string {
  let d = "";
  let run: { x: number; y: number }[] = [];
  const flush = () => {
    if (run.length > 1) {
      const first = run[0] as { x: number; y: number };
      const last = run[run.length - 1] as { x: number; y: number };
      d += `M${run.map((p) => `${px(p.x)},${px(p.y)}`).join("L")}L${px(last.x)},${px(baseline)}L${px(first.x)},${px(baseline)}Z`;
    }
    run = [];
  };
  for (const point of points) {
    if (point) run.push(point);
    else flush();
  }
  flush();
  return d;
}

/** How a line runs between its points: straight, smooth without ever swinging past a point, or in steps. */
export type Curve = "linear" | "smooth" | "step";

type XY = { x: number; y: number };

/** Unbroken runs of points, split at the gaps. */
function runsOf(points: (XY | null)[]): XY[][] {
  const out: XY[][] = [[]];
  for (const point of points) {
    if (point) (out.at(-1) as XY[]).push(point);
    else if ((out.at(-1) as XY[]).length) out.push([]);
  }
  return out.filter((run) => run.length > 0);
}

/**
 * A curve through every point of a run, as "x,y" then cubic segments, with Steffen's monotone tangents: each
 * segment stays between its two ends, so a smooth line never shows a value the data does not have.
 */
function monotone(run: XY[]): string {
  const n = run.length;
  const slope = (i: number) => {
    const a = run[i] as XY;
    const b = run[i + 1] as XY;
    return b.x === a.x ? 0 : (b.y - a.y) / (b.x - a.x);
  };
  const tangents = run.map((_, i) => {
    if (i === 0) return slope(0);
    if (i === n - 1) return slope(n - 2);
    const [s0, s1] = [slope(i - 1), slope(i)];
    const h0 = (run[i] as XY).x - (run[i - 1] as XY).x;
    const h1 = (run[i + 1] as XY).x - (run[i] as XY).x;
    const p = (s0 * h1 + s1 * h0) / (h0 + h1 || 1);
    return (Math.sign(s0) + Math.sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p));
  });
  const at = (p: XY) => `${px(p.x)},${px(p.y)}`;
  let d = at(run[0] as XY);
  for (let i = 0; i < n - 1; i++) {
    const a = run[i] as XY;
    const b = run[i + 1] as XY;
    const third = (b.x - a.x) / 3;
    d += `C${px(a.x + third)},${px(a.y + (tangents[i] ?? 0) * third)} ${px(b.x - third)},${px(b.y - (tangents[i + 1] ?? 0) * third)} ${at(b)}`;
  }
  return d;
}

/** A run as steps: each value held until halfway to the next, so every turn is a right angle. */
function stepped(run: XY[]): XY[] {
  return run.flatMap((p, i) => {
    const next = run[i + 1];
    if (!next) return [p];
    const mid = (p.x + next.x) / 2;
    return [p, { x: mid, y: p.y }, { x: mid, y: next.y }];
  });
}

/** SVG path for a line in the given curve, broken at gaps like `linePath`. */
export function curveLine(points: (XY | null)[], curve: Curve = "linear"): string {
  if (curve === "linear") return linePath(points);
  return runsOf(points)
    .map((run) => (run.length < 2 || curve === "step" ? linePath(curve === "step" ? stepped(run) : run) : `M${monotone(run)}`))
    .join("");
}

/** SVG path for the area under a line in the given curve, each run closed down to `baseline`. */
export function curveArea(points: (XY | null)[], baseline: number, curve: Curve = "linear"): string {
  if (curve === "linear") return areaPath(points, baseline);
  return runsOf(points)
    .filter((run) => run.length > 1)
    .map((run) => {
      const first = run[0] as XY;
      const last = run.at(-1) as XY;
      const top = curve === "step" ? stepped(run).map((p) => `${px(p.x)},${px(p.y)}`).join("L") : monotone(run);
      return `M${top}L${px(last.x)},${px(baseline)}L${px(first.x)},${px(baseline)}Z`;
    })
    .join("");
}

/** A point on a circle, with angle 0 at twelve o'clock and angles growing clockwise. */
export function polar(cx: number, cy: number, r: number, angle: number): { x: number; y: number } {
  return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) };
}

/** SVG path for a circular arc from `start` to `end` (radians, clockwise from twelve o'clock). */
export function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const a = polar(cx, cy, r, start);
  const b = polar(cx, cy, r, end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M${px(a.x)},${px(a.y)}A${px(r)},${px(r)} 0 ${large} 1 ${px(b.x)},${px(b.y)}`;
}

/**
 * Places stacked bars: one column per category, series stacked from zero in
 * order, positives upward and negatives downward, with a 2px surface gap
 * between touching segments. Only the outermost segment of each direction is
 * the `cap`, rounded at its data end.
 */
export function layoutStacked(values: (number | null)[][], bandList: Band[], scale: LinearScale, opts: BarOptions = {}): BarRect[] {
  const { maxWidth = 21, gap = 2, fill = 1 / PHI } = opts;
  const rects: BarRect[] = [];
  bandList.forEach((band, index) => {
    const width = Math.max(1, Math.min(maxWidth, band.width * fill));
    const x = band.center - width / 2;
    let up = 0;
    let down = 0;
    const column: BarRect[] = [];
    let topUp: BarRect | undefined;
    let topDown: BarRect | undefined;
    values.forEach((seriesValues, series) => {
      const value = seriesValues[index];
      if (value === null || value === undefined) return;
      if (value >= 0) {
        const top = scale(up + value);
        const bottom = scale(up) - (topUp ? gap : 0);
        topUp = { series, index, x, width, y: top, height: Math.max(0, bottom - top), value, negative: false, cap: false };
        column.push(topUp);
        up += value;
      } else {
        const top = scale(down) + (topDown ? gap : 0);
        const bottom = scale(down + value);
        topDown = { series, index, x, width, y: top, height: Math.max(0, bottom - top), value, negative: true, cap: false };
        column.push(topDown);
        down += value;
      }
    });
    if (topUp) topUp.cap = true;
    if (topDown) topDown.cap = true;
    rects.push(...column);
  });
  return rects;
}

/** One bar of a waterfall: from `start` to `end`, an increase, a decrease, or a total standing on zero. */
export interface WaterfallStep {
  start: number;
  end: number;
  kind: "up" | "down" | "total";
}

/**
 * Turns waterfall rows into bars. A total stands on zero and resets the running
 * total to its value; any other row floats from the running total by its change.
 * With `appendEnd`, a final total bar shows where the running total ends.
 */
export function layoutWaterfall(steps: { value: number | null; total?: boolean }[], appendEnd: boolean): WaterfallStep[] {
  let running = 0;
  const out: WaterfallStep[] = [];
  for (const step of steps) {
    const value = step.value ?? 0;
    if (step.total) {
      running = value;
      out.push({ start: 0, end: value, kind: "total" });
    } else {
      const start = running;
      running += value;
      out.push({ start, end: running, kind: value < 0 ? "down" : "up" });
    }
  }
  if (appendEnd) out.push({ start: 0, end: running, kind: "total" });
  return out;
}

/** Maps a value in `[min, max]` onto steps 1 to `steps`, for sequential color scales. A flat range sits in the middle step. */
export function quantize(value: number, min: number, max: number, steps: number): number {
  if (max === min) return Math.ceil(steps / 2);
  const t = (value - min) / (max - min);
  return Math.min(steps, Math.max(1, Math.floor(t * steps) + 1));
}

/** A tile from `squarify`. */
export interface Tile {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Squarified treemap layout (Bruls, Huizing and van Wijk): tiles with area
 * proportional to value, laid out in rows along the shorter side so they stay
 * close to square. Returns one tile per value, in input order. Zero and
 * negative values get empty tiles.
 */
export function squarify(values: number[], x: number, y: number, width: number, height: number): Tile[] {
  const tiles: Tile[] = values.map(() => ({ x, y, width: 0, height: 0 }));
  const total = values.reduce((sum, v) => sum + (v > 0 ? v : 0), 0);
  if (total <= 0 || width <= 0 || height <= 0) return tiles;
  const scale = (width * height) / total;
  const items = values
    .map((v, index) => ({ index, area: v > 0 ? v * scale : 0 }))
    .filter((item) => item.area > 0)
    .sort((a, b) => b.area - a.area);

  const box = { x, y, width, height };
  const worst = (row: { area: number }[], side: number) => {
    const sum = row.reduce((s, item) => s + item.area, 0);
    const max = Math.max(...row.map((item) => item.area));
    const min = Math.min(...row.map((item) => item.area));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };
  const place = (row: { index: number; area: number }[]) => {
    const sum = row.reduce((s, item) => s + item.area, 0);
    if (box.width >= box.height) {
      // A column on the left, as wide as the row's area needs.
      const columnWidth = sum / box.height;
      let cursor = box.y;
      for (const item of row) {
        const h = item.area / columnWidth;
        tiles[item.index] = { x: box.x, y: cursor, width: columnWidth, height: h };
        cursor += h;
      }
      box.x += columnWidth;
      box.width -= columnWidth;
    } else {
      // A row along the top.
      const rowHeight = sum / box.width;
      let cursor = box.x;
      for (const item of row) {
        const w = item.area / rowHeight;
        tiles[item.index] = { x: cursor, y: box.y, width: w, height: rowHeight };
        cursor += w;
      }
      box.y += rowHeight;
      box.height -= rowHeight;
    }
  };

  let row: { index: number; area: number }[] = [];
  for (const item of items) {
    const side = Math.min(box.width, box.height);
    if (row.length === 0 || worst([...row, item], side) <= worst(row, side)) {
      row.push(item);
    } else {
      place(row);
      row = [item];
    }
  }
  if (row.length) place(row);
  return tiles;
}

/**
 * Beeswarm offsets: given dot positions along one axis, a perpendicular offset
 * for each so that no two dots of `radius` overlap. Dots are placed left to
 * right, each at the smallest offset from the centre line that clears every
 * dot already placed. Returns offsets in input order.
 */
export function swarm(positions: number[], radius: number): number[] {
  const diameter = radius * 2;
  const offsets = positions.map(() => 0);
  const placed: { x: number; y: number }[] = [];
  const order = positions.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  for (const { x, i } of order) {
    const near = placed.filter((p) => Math.abs(p.x - x) < diameter);
    const candidates = [0];
    for (const p of near) {
      const dy = Math.sqrt(diameter * diameter - (p.x - x) ** 2);
      candidates.push(p.y + dy, p.y - dy);
    }
    candidates.sort((a, b) => Math.abs(a) - Math.abs(b));
    const y = candidates.find((c) => near.every((p) => Math.hypot(p.x - x, p.y - c) >= diameter - 1e-6)) ?? 0;
    placed.push({ x, y });
    offsets[i] = y;
  }
  return offsets;
}

/** A node placed by `layoutSankey`. */
export interface SankeyNode {
  name: string;
  column: number;
  value: number;
  x: number;
  y: number;
  height: number;
}

/** A ribbon placed by `layoutSankey`: from (x0, y0) on the source's right edge to (x1, y1) on the target's left edge, centrelines. */
export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  thickness: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Sankey layout. Columns follow each node's longest path from a source; a
 * node is as tall as the larger of its inflow and outflow, on one scale that
 * makes the fullest column fit; a few barycentre passes reorder each column to
 * cut crossings; ribbons stack on their nodes in the order of their far ends.
 * Self links and non-positive values are ignored; cycles cannot push a node
 * past the last column.
 */
export function layoutSankey(
  input: { source: string; target: string; value: number }[],
  width: number,
  height: number,
  opts: { nodeWidth?: number; gap?: number; iterations?: number } = {},
): { nodes: SankeyNode[]; links: SankeyLink[] } {
  const { nodeWidth = 13, gap = 8, iterations = 3 } = opts;
  const links = input.filter((l) => l.value > 0 && l.source !== l.target);
  const names: string[] = [];
  for (const l of links) for (const n of [l.source, l.target]) if (!names.includes(n)) names.push(n);
  const column = new Map(names.map((n) => [n, 0]));
  for (let pass = 0; pass < names.length; pass++) {
    let changed = false;
    for (const l of links) {
      const next = (column.get(l.source) ?? 0) + 1;
      if (next > (column.get(l.target) ?? 0) && next < names.length) {
        column.set(l.target, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const sum = (list: { value: number }[]) => list.reduce((s, l) => s + l.value, 0);
  const nodes: SankeyNode[] = names.map((name) => ({
    name,
    column: column.get(name) ?? 0,
    value: Math.max(sum(links.filter((l) => l.target === name)), sum(links.filter((l) => l.source === name))),
    x: 0,
    y: 0,
    height: 0,
  }));
  const columns = Math.max(...nodes.map((n) => n.column)) + 1;
  const byColumn = Array.from({ length: columns }, (_, c) => nodes.filter((n) => n.column === c));
  const scale = Math.min(...byColumn.map((list) => (height - gap * (list.length - 1)) / (sum(list) || 1)));
  for (const n of nodes) {
    n.height = n.value * scale;
    n.x = columns > 1 ? (n.column * (width - nodeWidth)) / (columns - 1) : 0;
  }
  const find = (name: string) => nodes.find((n) => n.name === name) as SankeyNode;
  const stack = (list: SankeyNode[]) => {
    const total = sum(list.map((n) => ({ value: n.height }))) + gap * (list.length - 1);
    let y = (height - total) / 2;
    for (const n of list) {
      n.y = y;
      y += n.height + gap;
    }
  };
  byColumn.forEach(stack);
  const centre = (n: SankeyNode) => n.y + n.height / 2;
  const weighted = (n: SankeyNode, side: "in" | "out") => {
    const related = links.filter((l) => (side === "in" ? l.target : l.source) === n.name);
    const weight = sum(related);
    return weight ? related.reduce((s, l) => s + centre(find(side === "in" ? l.source : l.target)) * l.value, 0) / weight : centre(n);
  };
  for (let pass = 0; pass < iterations; pass++) {
    for (let c = 1; c < columns; c++) {
      byColumn[c]?.sort((a, b) => weighted(a, "in") - weighted(b, "in"));
      stack(byColumn[c] ?? []);
    }
    for (let c = columns - 2; c >= 0; c--) {
      byColumn[c]?.sort((a, b) => weighted(a, "out") - weighted(b, "out"));
      stack(byColumn[c] ?? []);
    }
  }
  const outOffset = new Map(names.map((n) => [n, 0]));
  const inOffset = new Map(names.map((n) => [n, 0]));
  const placed: SankeyLink[] = links.map((l) => ({ ...l, thickness: l.value * scale, x0: 0, y0: 0, x1: 0, y1: 0 }));
  const ordered = [...placed].sort((a, b) => centre(find(a.target)) - centre(find(b.target)) || centre(find(a.source)) - centre(find(b.source)));
  for (const l of ordered) {
    const s = find(l.source);
    const offset = outOffset.get(s.name) ?? 0;
    l.x0 = s.x + nodeWidth;
    l.y0 = s.y + offset + l.thickness / 2;
    outOffset.set(s.name, offset + l.thickness);
  }
  for (const l of [...placed].sort((a, b) => centre(find(a.source)) - centre(find(b.source)))) {
    const t = find(l.target);
    const offset = inOffset.get(t.name) ?? 0;
    l.x1 = t.x;
    l.y1 = t.y + offset + l.thickness / 2;
    inOffset.set(t.name, offset + l.thickness);
  }
  return { nodes, links: placed };
}

/**
 * Kernel density estimate with a Gaussian kernel: a smooth version of a
 * histogram, evaluated at each point of `grid`. The bandwidth defaults to
 * Silverman's rule of thumb (1.06 × standard deviation × n^-1/5).
 */
export function density(values: number[], grid: number[], bandwidth?: number): number[] {
  const n = values.length;
  if (n === 0) return grid.map(() => 0);
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  const h = bandwidth ?? (1.06 * sd * n ** -0.2 || 1);
  const norm = 1 / (n * h * Math.sqrt(2 * Math.PI));
  return grid.map((x) => norm * values.reduce((s, v) => s + Math.exp(-0.5 * ((x - v) / h) ** 2), 0));
}

/** The `p` quantile (0 to 1) of numbers, interpolating linearly between neighbours. */
export function quantile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return Number.NaN;
  const position = (sorted.length - 1) * Math.min(1, Math.max(0, p));
  const low = Math.floor(position);
  const high = Math.ceil(position);
  const a = sorted[low] as number;
  const b = sorted[high] as number;
  return a + (b - a) * (position - low);
}

/**
 * Nudges label positions apart so neighbours sit at least `gap` apart, keeping
 * their order and staying inside min..max. Colliding labels form a group that
 * centres on the middle of where its labels wanted to be, so nothing drifts
 * further than it must. Returns the positions in input order.
 */
export function dodge(positions: number[], gap: number, min: number, max: number): number[] {
  type Group = { top: number; items: { y: number; i: number }[] };
  const place = (group: Group) => {
    const span = (group.items.length - 1) * gap;
    const middle = group.items.reduce((sum, item) => sum + item.y, 0) / group.items.length;
    group.top = Math.min(max - span, Math.max(min, middle - span / 2));
  };
  const groups: Group[] = positions
    .map((y, i) => ({ y, i }))
    .sort((a, b) => a.y - b.y)
    .map((item) => ({ top: item.y, items: [item] }));
  groups.forEach(place);
  for (let k = 1; k < groups.length; ) {
    const above = groups[k - 1] as Group;
    const below = groups[k] as Group;
    if (above.top + above.items.length * gap > below.top) {
      above.items.push(...below.items);
      groups.splice(k, 1);
      place(above);
      k = Math.max(1, k - 1);
    } else {
      k++;
    }
  }
  const out = [...positions];
  for (const group of groups) group.items.forEach((item, j) => (out[item.i] = group.top + j * gap));
  return out;
}

/**
 * Shares `total` whole units among values in proportion, by largest
 * remainder: each gets the floor of its exact share, and the units left over
 * go to the largest fractions (earlier values win ties). Always sums to
 * `total` unless every value is zero or negative.
 */
export function allocate(values: number[], total: number): number[] {
  const kept = values.map((v) => Math.max(0, v));
  const sum = kept.reduce((a, b) => a + b, 0);
  if (sum === 0) return kept.map(() => 0);
  const exact = kept.map((v) => (v / sum) * total);
  const units = exact.map(Math.floor);
  let left = total - units.reduce((a, b) => a + b, 0);
  const order = exact.map((v, i) => ({ i, rest: v - Math.floor(v) })).sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    units[i] = (units[i] ?? 0) + 1;
    left -= 1;
  }
  return units;
}

/** SVG path for a filled band: along `upper` left to right, back along `lower` right to left, closed. */
export function bandPath(upper: { x: number; y: number }[], lower: { x: number; y: number }[]): string {
  if (upper.length === 0) return "";
  const forward = upper.map((p) => `${px(p.x)},${px(p.y)}`).join("L");
  const back = [...lower].reverse().map((p) => `${px(p.x)},${px(p.y)}`).join("L");
  return `M${forward}L${back}Z`;
}

type Point = { x: number; y: number };

/**
 * Catmull-Rom handles for each segment of a curve through `points`. They are
 * linear in the points, so the curve of a sum is the sum of the curves: a layer
 * of constant thickness stays parallel to the edge below it.
 */
function handles(points: Point[]): [Point, Point][] {
  return points.slice(1).map((p2, i) => {
    const p1 = points[i] as Point;
    const p0 = points[i - 1] ?? p1;
    const p3 = points[i + 2] ?? p2;
    return [
      { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
    ];
  });
}

/** Writes a smooth curve through `points`, forwards or backwards, without its leading M. */
function curve(points: Point[], segments: [Point, Point][], backwards = false): string {
  const at = (p: Point) => `${px(p.x)},${px(p.y)}`;
  if (!backwards) return at(points[0] as Point) + segments.map(([a, b], i) => `C${at(a)} ${at(b)} ${at(points[i + 1] as Point)}`).join("");
  return (
    at(points.at(-1) as Point) +
    segments
      .map((_, k) => {
        const i = segments.length - 1 - k;
        const [a, b] = segments[i] as [Point, Point];
        return `C${at(b)} ${at(a)} ${at(points[i] as Point)}`;
      })
      .join("")
  );
}

/**
 * Smooth bands between consecutive edges of a stack, bottom edge first (up the
 * screen from there): band k fills between edges k and k + 1. Curves pass
 * through every point. Each edge's handles stay on their own side of the edge
 * below, so no band ever folds over its neighbour between points.
 */
export function smoothBands(edges: Point[][]): string[] {
  const all = edges.map(handles);
  for (let e = 1; e < all.length; e++) {
    const below = all[e - 1] as [Point, Point][];
    all[e] = (all[e] as [Point, Point][]).map(([a, b], i) => {
      const [la, lb] = below[i] as [Point, Point];
      return [{ x: a.x, y: Math.min(a.y, la.y) }, { x: b.x, y: Math.min(b.y, lb.y) }];
    });
  }
  return edges.slice(1).map((upper, k) => {
    const lower = edges[k] as Point[];
    if (upper.length === 0) return "";
    return `M${curve(upper, all[k + 1] as [Point, Point][])}L${curve(lower, all[k] as [Point, Point][], true)}Z`;
  });
}

/**
 * Places `count` points edge to edge across `width`: the first on `x`, the last
 * on `x + width`. Each owns the space halfway to its neighbours (its hover
 * band). A single point sits in the middle. Time series use this; bars use `bands`.
 */
export function spread(count: number, x: number, width: number): Band[] {
  if (count === 1) return [{ start: x, width, center: x + width / 2 }];
  const step = count > 1 ? width / (count - 1) : 0;
  // Each point owns the space halfway to its neighbours, clipped to the plot: the end points own only the inner half.
  return Array.from({ length: count }, (_, i) => {
    const center = x + i * step;
    const start = Math.max(x, center - step / 2);
    return { start, width: Math.min(x + width, center + step / 2) - start, center };
  });
}

/** A text label along an axis: its anchor point, width, and which way it grows from the anchor. */
export interface LabelBox {
  x: number;
  width: number;
  anchor?: "start" | "middle" | "end";
}

/** The height of one line of a wrapped category label, and the most lines a label may take. */
export const LINE_HEIGHT = 13;
const MAX_LINES = 3;

/**
 * Category labels broken at spaces onto at most three lines no wider than `room`, so a few long names ("Net promoter
 * score") can all be read under their bars. Undefined when any one will not fit: the axis then thins its labels.
 */
export function wrapLabels(labels: string[], room: number, charWidth = 6): string[][] | undefined {
  const max = Math.floor(room / charWidth);
  const wrapped: string[][] = [];
  for (const label of labels) {
    const lines: string[] = [];
    for (const word of label.split(/\s+/).filter(Boolean)) {
      const line = lines.at(-1);
      if (line !== undefined && `${line} ${word}`.length <= max) lines[lines.length - 1] = `${line} ${word}`;
      else lines.push(word);
    }
    if (lines.length > MAX_LINES || lines.some((line) => line.length > max)) return undefined;
    wrapped.push(lines);
  }
  return wrapped;
}

/**
 * Which labels to draw so none comes within `gap` of the one before: greedily
 * from the first, by each label's real extent (its anchor decides which way
 * it grows). With `keepLast`, earlier labels are dropped until the last fits,
 * so an axis always shows where it ends. Returns the indices to draw.
 */
export function fitLabels(labels: LabelBox[], opts: { gap?: number; keepLast?: boolean } = {}): number[] {
  const gap = opts.gap ?? 8;
  const span = (label: LabelBox): [number, number] => {
    const left = label.anchor === "start" ? label.x : label.anchor === "end" ? label.x - label.width : label.x - label.width / 2;
    return [left, left + label.width];
  };
  const kept: number[] = [];
  let right = Number.NEGATIVE_INFINITY;
  labels.forEach((label, i) => {
    const [left, end] = span(label);
    if (left >= right + gap) {
      kept.push(i);
      right = end;
    }
  });
  const last = labels.length - 1;
  if (opts.keepLast && last >= 0 && kept.at(-1) !== last) {
    const [left] = span(labels[last] as LabelBox);
    while (kept.length && span(labels[kept.at(-1) as number] as LabelBox)[1] + gap > left) kept.pop();
    kept.push(last);
  }
  return kept;
}

/**
 * SVG path for a ring slice between radii `r0` (inner) and `r1` (outer), from
 * angle `start` to `end` (radians, clockwise from twelve o'clock): out along
 * the outer arc, then back along the inner one.
 */
export function sectorPath(cx: number, cy: number, r0: number, r1: number, start: number, end: number): string {
  const large = end - start > Math.PI ? 1 : 0;
  const a = polar(cx, cy, r1, start);
  const b = polar(cx, cy, r1, end);
  const c = polar(cx, cy, r0, end);
  const d = polar(cx, cy, r0, start);
  return `M${px(a.x)},${px(a.y)}A${px(r1)},${px(r1)} 0 ${large} 1 ${px(b.x)},${px(b.y)}L${px(c.x)},${px(c.y)}A${px(r0)},${px(r0)} 0 ${large} 0 ${px(d.x)},${px(d.y)}Z`;
}
