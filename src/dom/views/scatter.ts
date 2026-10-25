import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { Annotation, ScatterView } from "../../core/views.ts";
import { referenceValues, resolveReferences } from "../../core/reference.ts";
import { CHAR_WIDTH, hullPath, linearScale } from "../layout.ts";
import { drawReferences } from "./reference.ts";
import { DEEMPHASIS, drawNotes, highlights, pinNotes, tickFormatter } from "./chart.ts";
import { hiddenTableOf, html, legendList, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";
import { wordsFor } from "./words.ts";

/** Radius of the biggest bubble: a Fibonacci step. */
const MAX_BUBBLE = 21;

/**
 * Past this many dots a scatter draws dense: one path per color holds every dot, a single hit layer over the plot finds
 * the nearest dot through a grid index, and one probe mark stands in for the dot under the pointer or the keyboard.
 * 5,000 dots drawn one circle and one hit area each took 1.9s and 30,000 nodes.
 */
export const DENSE_POINTS = 1000;

/** The rows a dense scatter lists for screen readers: the first ones, with a line saying how many there are in all. */
const DENSE_TABLE_ROWS = 100;

/** Options the scatter block declares (and validates) that its core type does not list yet. */
interface ScatterExtras {
  highlight?: string | string[];
  annotations?: Annotation[];
}

/**
 * Draws the `scatter` view: one dot per row placed by two numbers, with
 * hairline gridlines both ways and a title on each axis, since both are
 * values. Dots are 10px with a surface ring so overlaps stay legible, and each
 * carries a 26px hit area for hover and keyboard focus.
 *
 * Dots take their group's color (fixed per category through `colors`, else the
 * palette in order), `highlight` keeps the named dots or groups in color and
 * greys the rest, panels of small multiples share one value axis, and
 * `annotations` pin short notes to dots, named by label or x value.
 */
export const renderScatter: ViewRenderer<ScatterView & ScatterExtras> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { x: xField, y: yField, series, label, size, cluster } = ctx.view;
  // Dots take the series' color, or, without a series, their cluster's: the hulls and the dots then say the same thing.
  const colorField = series ?? cluster;
  const points: { row: Row; x: number; y: number; group: number; cluster: number; r: number }[] = [];
  const groups: string[] = [];
  const clusters: string[] = [];
  for (const row of ctx.rows) {
    const x = readNumber(row[xField]);
    const y = readNumber(row[yField]);
    if (x === null || y === null) continue;
    const name = colorField ? String(row[colorField]) : "";
    if (!groups.includes(name)) groups.push(name);
    const member = cluster ? String(row[cluster]) : "";
    if (!clusters.includes(member)) clusters.push(member);
    points.push({ row, x, y, group: groups.indexOf(name), cluster: clusters.indexOf(member), r: 5 });
  }
  // A category keeps its fixed color (the spec's colors) wherever it appears; the rest follow the palette in order.
  const groupColor = (g: number) => (colorField ? ctx.colorOf?.(groups[g]) : undefined) ?? ctx.color(g);
  const clusterColor = (c: number) => (cluster ? ctx.colorOf?.(clusters[c]) : undefined) ?? ctx.color(c);
  // Emphasis: a dot stays in color when highlight names its label or its group; the rest step back.
  const picked = highlights(ctx.view.highlight);
  const isOn = (point: (typeof points)[number]) =>
    picked.length === 0 || (label !== undefined && picked.includes(String(point.row[label]))) || (colorField !== undefined && picked.includes(String(point.row[colorField])));
  // Bubbles: area follows the size field (radius by square root), up to 21px; the biggest draw first so small ones stay on top.
  if (size) {
    const largest = Math.max(0, ...points.map((p) => readNumber(p.row[size]) ?? 0)) || 1;
    for (const p of points) p.r = Math.max(3, Math.sqrt(Math.max(0, readNumber(p.row[size]) ?? 0) / largest) * MAX_BUBBLE);
    points.sort((a, b) => b.r - a.r);
  }

  const references = resolveReferences(ctx.view, ctx.rows);
  // Quadrants: the two splits stretch each axis so both lines are always in view.
  const quadrants = ctx.view.quadrants && typeof ctx.view.quadrants.x === "number" && typeof ctx.view.quadrants.y === "number" ? ctx.view.quadrants : undefined;
  // Small multiples pass the value axis every panel shares, so the panels compare.
  const yValues = [...points.map((p) => p.y), ...referenceValues(references), ...(quadrants ? [quadrants.y] : []), ...(ctx.extent ?? [])];
  const xValues = [...points.map((p) => p.x), ...(quadrants ? [quadrants.x] : [])];
  const xTicks = linearScale(xValues, [0, 1], { includeZero: false }).ticks;
  const yTicks = linearScale(yValues, [1, 0], { includeZero: false }).ticks;
  const xText = tickFormatter(ctx, xField, xTicks);
  const yText = tickFormatter(ctx, yField, yTicks);
  const left = Math.max(28, Math.max(...yTicks.map((t) => yText(t).length)) * CHAR_WIDTH + 12);
  const margin = { top: 21, right: 13, bottom: 39, left };
  const width = Math.max(ctx.width, left + 89);
  const height = ctx.height;
  const plot = { x: margin.left, y: margin.top, w: width - margin.left - margin.right, h: height - margin.top - margin.bottom };
  const xs = linearScale(xValues, [plot.x, plot.x + plot.w], { includeZero: false });
  /** Which quadrant a point falls in, top-left first then clockwise, as the labels are given. */
  const quadrantOf = (px: number, py: number): number => (quadrants ? (py >= quadrants.y ? (px < quadrants.x ? 0 : 1) : px >= quadrants.x ? 2 : 3) : -1);
  const quadrantName = (px: number, py: number): string => {
    const i = quadrantOf(px, py);
    return i < 0 ? "" : quadrants?.labels?.[i] ?? wordsFor(ctx).quadrants[i]!;
  };
  const ys = linearScale(yValues, [plot.y + plot.h, plot.y], { includeZero: false });

  const wrap = html(doc, "div", "fft-chart");
  if ((colorField && groups.length > 1) || size) {
    // One legend per chart (none in a small-multiples panel: the widget draws a shared one).
    const keys = colorField && groups.length > 1 ? groups.map((group, i) => ({ label: ctx.format(group, colorField), color: groupColor(i), shape: "dot" as const })) : [];
    const legend = legendList(ctx, keys, { min: 0 });
    if (legend) {
      if (size) legend.append(html(doc, "li", "fft-scatter-size", wordsFor(ctx).bubbleSize(ctx.label(size))));
      wrap.append(legend);
    }
  }

  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", wordsFor(ctx).aria.scatter(ctx.label(yField), ctx.label(xField)));
  for (const tick of ys.ticks) {
    const ty = ys(tick);
    chart.append(svg(doc, "line", { class: tick === ys.ticks[0] ? "fft-baseline" : "fft-gridline", x1: plot.x, x2: plot.x + plot.w, y1: ty, y2: ty }));
    const text = svg(doc, "text", { class: "fft-tick fft-tick-y", x: plot.x - 8, y: ty, "text-anchor": "end", "dominant-baseline": "middle" });
    text.textContent = yText(tick);
    chart.append(text);
  }
  for (const tick of xs.ticks) {
    const tx = xs(tick);
    // Zero is the line that matters when an axis runs from loss to gain: draw it as a baseline.
    chart.append(svg(doc, "line", { class: tick === 0 && xs.ticks[0] !== 0 ? "fft-baseline" : "fft-gridline", x1: tx, x2: tx, y1: plot.y, y2: plot.y + plot.h }));
    const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: tx, y: plot.y + plot.h + 18, "text-anchor": "middle" });
    text.textContent = xText(tick);
    chart.append(text);
  }
  const xTitle = svg(doc, "text", { class: "fft-axis-title", x: plot.x + plot.w, y: height - 3, "text-anchor": "end" });
  xTitle.textContent = ctx.label(xField);
  const yTitle = svg(doc, "text", { class: "fft-axis-title", x: 0, y: 11, "text-anchor": "start" });
  yTitle.textContent = ctx.label(yField);
  chart.append(xTitle, yTitle);
  const refsBelow = svg(doc, "g");
  const refsAbove = svg(doc, "g");
  const dotBoxes = points.map((p) => ({ x: xs(p.x) - p.r, y: ys(p.y) - p.r, width: p.r * 2, height: p.r * 2 }));
  if (quadrants) {
    // Two hairlines split the plot; a faint word sits in each corner, clear of the axes.
    const splits = svg(doc, "g", { class: "fft-quadrants" });
    splits.setAttribute("aria-hidden", "true");
    const [qx, qy] = [xs(quadrants.x), ys(quadrants.y)];
    splits.append(svg(doc, "line", { class: "fft-quadrant-line", x1: qx, x2: qx, y1: plot.y, y2: plot.y + plot.h }));
    splits.append(svg(doc, "line", { class: "fft-quadrant-line", x1: plot.x, x2: plot.x + plot.w, y1: qy, y2: qy }));
    const corners: [number, number, string][] = [
      [plot.x + 6, plot.y + 13, "start"],
      [plot.x + plot.w - 6, plot.y + 13, "end"],
      [plot.x + plot.w - 6, plot.y + plot.h - 6, "end"],
      [plot.x + 6, plot.y + plot.h - 6, "start"],
    ];
    (quadrants.labels ?? []).forEach((word, i) => {
      const corner = corners[i];
      if (!corner || !word) return;
      const text = svg(doc, "text", { class: "fft-quadrant-label", x: corner[0], y: corner[1], "text-anchor": corner[2] });
      text.textContent = word;
      splits.append(text);
    });
    chart.append(refsBelow, splits);
  } else chart.append(refsBelow);

  // Clusters: a soft hull round each one's dots, in the cluster's color (its own, or a quiet grey when the dots are colored by series), its name at the middle.
  if (cluster) {
    const hulls = svg(doc, "g", { class: "fft-cluster-hulls" });
    clusters.forEach((name, c) => {
      const members = points.filter((p) => p.cluster === c);
      if (!members.length) return;
      const placed = members.map((p) => ({ x: xs(p.x), y: ys(p.y) }));
      const pad = Math.max(13, ...members.map((p) => p.r + 8));
      const color = series ? "var(--fft-text-secondary)" : clusterColor(c);
      const hull = svg(doc, "path", { class: "fft-cluster-hull", d: hullPath(placed, pad), "data-cluster": name });
      hull.style.setProperty("fill", color);
      hull.style.setProperty("stroke", color);
      const cx = placed.reduce((sum, p) => sum + p.x, 0) / placed.length;
      const cy = placed.reduce((sum, p) => sum + p.y, 0) / placed.length;
      const text = svg(doc, "text", { class: "fft-cluster-label", x: Math.round(cx * 100) / 100, y: Math.round(cy * 100) / 100, "text-anchor": "middle", "dominant-baseline": "middle" });
      text.textContent = ctx.format(name, cluster);
      text.style.setProperty("fill", color);
      hulls.append(hull, text);
    });
    chart.append(hulls);
  }

  const dots = svg(doc, "g");
  const overlay = svg(doc, "g");
  const marks: SVGCircleElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const mark of marks) mark.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  // Notes pinned to dots: by the dot's label, or its x value; a note with y sits at that height over the dot's x.
  const pinned = pinNotes(
    ctx.view.annotations,
    (note: Annotation) => points.findIndex((p) => (label !== undefined && String(p.row[label]) === String(note.x)) || String(p.x) === String(note.x)),
    (note: Annotation, i) => {
      const point = points[i] as (typeof points)[number];
      return { x: xs(point.x), y: typeof note.y === "number" ? ys(note.y) : ys(point.y) };
    },
  );
  const dense = points.length > DENSE_POINTS;
  /** What a dot says: its name, then each measure, as the tooltip and as its accessible name. */
  const describe = (point: (typeof points)[number], i: number, color: string) => {
    const name = label ? ctx.format(point.row[label], label) : colorField ? ctx.format(point.row[colorField], colorField) : "";
    const items: TooltipItem[] = [
      { label: ctx.label(xField), value: ctx.format(point.row[xField], xField) },
      { label: ctx.label(yField), value: ctx.format(point.row[yField], yField) },
    ];
    if (size) items.push({ label: ctx.label(size), value: ctx.format(point.row[size], size) });
    if (series) items.push({ label: ctx.label(series), value: ctx.format(point.row[series], series), color });
    if (cluster) items.push({ label: ctx.label(cluster), value: ctx.format(point.row[cluster], cluster), ...(series ? {} : { color }) });
    if (quadrants) items.push({ label: wordsFor(ctx).quadrant, value: quadrantName(point.x, point.y) });
    for (const pin of pinned) if (pin.i === i) items.push({ label: wordsFor(ctx).note, value: pin.text });
    return { name, items, said: `${name ? `${name}: ` : ""}${items.map((item) => `${item.label} ${item.value}`).join(", ")}` };
  };
  if (dense) drawDense();
  else points.forEach((point, i) => {
    const cx = xs(point.x);
    const cy = ys(point.y);
    const on = isOn(point);
    const color = on ? groupColor(point.group) : DEEMPHASIS;
    const dot = svg(doc, "circle", { class: size ? "fft-point fft-point-bubble" : "fft-point", cx, cy, r: Math.round(point.r * 100) / 100, style: `--fft-i: ${i}` });
    dot.style.setProperty("fill", color);
    if (!on) dot.dataset.muted = "true";
    if (label) dot.setAttribute("data-label", String(point.row[label]));
    marks.push(dot);
    dots.append(dot);

    const { name, items, said } = describe(point, i, color);
    const hit = svg(doc, "circle", { class: "fft-point-hit", cx, cy, r: Math.max(13, point.r + 3), tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", said);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const mark of marks) mark.removeAttribute("data-active");
      dot.setAttribute("data-active", "");
      ctx.tooltip.show(hit, name, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    selectable(hit, () => ctx.select(point.row));
    overlay.append(hit);
  });
  /**
   * The dense drawing: one path per color (and one more for greyed dots), each dot a closed arc, so 5,000 dots are a
   * handful of nodes. One transparent layer over the plot takes the pointer and the keyboard: a grid index finds the
   * dot nearest the pointer, a single probe circle marks it, and the arrow keys walk the dots left to right.
   */
  function drawDense() {
    const paths = new Map<string, string[]>();
    points.forEach((point) => {
      const color = isOn(point) ? groupColor(point.group) : DEEMPHASIS;
      const r = Math.round(point.r * 100) / 100;
      const [cx, cy] = [Math.round(xs(point.x) * 100) / 100, Math.round(ys(point.y) * 100) / 100];
      const list = paths.get(color) ?? [];
      list.push(`M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0`);
      paths.set(color, list);
    });
    for (const [color, d] of paths) {
      const path = svg(doc, "path", { class: size ? "fft-point fft-point-bubble fft-point-dense" : "fft-point fft-point-dense", d: d.join("") });
      path.style.setProperty("fill", color);
      if (color === DEEMPHASIS) path.dataset.muted = "true";
      dots.append(path);
    }
    // A grid of 21px buckets over the plot: the nearest dot is in the pointer's bucket or one next to it.
    const CELL = 21;
    const buckets = new Map<string, number[]>();
    points.forEach((point, i) => {
      const key = `${Math.floor(xs(point.x) / CELL)},${Math.floor(ys(point.y) / CELL)}`;
      const list = buckets.get(key) ?? [];
      list.push(i);
      buckets.set(key, list);
    });
    const nearest = (px: number, py: number): number => {
      const [bx, by] = [Math.floor(px / CELL), Math.floor(py / CELL)];
      let best = -1;
      let bestDistance = Infinity;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const i of buckets.get(`${bx + dx},${by + dy}`) ?? []) {
            const point = points[i] as (typeof points)[number];
            const distance = Math.hypot(xs(point.x) - px, ys(point.y) - py) - point.r;
            if (distance < bestDistance) [best, bestDistance] = [i, distance];
          }
        }
      }
      return bestDistance <= 13 ? best : -1;
    };
    const probe = svg(doc, "circle", { class: "fft-point fft-point-probe", r: 0, cx: 0, cy: 0 });
    probe.setAttribute("aria-hidden", "true");
    const layer = svg(doc, "rect", { class: "fft-point-layer", x: plot.x, y: plot.y, width: plot.w, height: plot.h, tabindex: 0, role: "img" });
    layer.setAttribute("aria-label", wordsFor(ctx).denseScatter(points.length));
    const spoken = html(doc, "span", "fft-sr-only");
    spoken.setAttribute("aria-live", "polite");
    // Left to right, then bottom to top: the order the arrow keys walk.
    const order = points.map((_, i) => i).sort((a, b) => (points[a] as (typeof points)[number]).x - (points[b] as (typeof points)[number]).x || (points[a] as (typeof points)[number]).y - (points[b] as (typeof points)[number]).y);
    let current = -1;
    const show = (i: number) => {
      current = i;
      const point = points[i] as (typeof points)[number];
      const color = isOn(point) ? groupColor(point.group) : DEEMPHASIS;
      probe.setAttribute("cx", String(xs(point.x)));
      probe.setAttribute("cy", String(ys(point.y)));
      probe.setAttribute("r", String(Math.max(5, point.r + 1)));
      probe.style.setProperty("fill", color);
      wrap.setAttribute("data-active", "");
      const { name, items, said } = describe(point, i, color);
      ctx.tooltip.show(probe, name, items);
      spoken.textContent = said;
    };
    const hide = () => {
      current = -1;
      probe.setAttribute("r", "0");
      wrap.removeAttribute("data-active");
      ctx.tooltip.hide();
    };
    const at = (event: PointerEvent | MouseEvent) => {
      const box = chart.getBoundingClientRect();
      const scale = box.width ? width / box.width : 1;
      return nearest((event.clientX - box.left) * scale, (event.clientY - box.top) * scale);
    };
    layer.addEventListener("pointermove", (event) => {
      const i = at(event as PointerEvent);
      if (i >= 0) show(i);
      else hide();
    });
    layer.addEventListener("pointerleave", hide);
    layer.addEventListener("click", (event) => {
      const i = at(event as MouseEvent);
      if (i >= 0) ctx.select((points[i] as (typeof points)[number]).row);
    });
    layer.addEventListener("focus", () => show(order[0] as number));
    layer.addEventListener("blur", hide);
    layer.addEventListener("keydown", (event) => {
      const key = (event as KeyboardEvent).key;
      const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageDown: 10, PageUp: -10 }[key];
      if (step !== undefined) {
        event.preventDefault();
        const position = Math.max(0, Math.min(order.length - 1, order.indexOf(current) + step));
        show(order[position] as number);
      } else if (key === "Home" || key === "End") {
        event.preventDefault();
        show(order[key === "Home" ? 0 : order.length - 1] as number);
      } else if ((key === "Enter" || key === " ") && current >= 0) {
        event.preventDefault();
        ctx.select((points[current] as (typeof points)[number]).row);
      }
    });
    overlay.append(probe, layer);
    wrap.append(spoken);
  }

  chart.append(dots);
  // The notes keep clear of the dots; reference labels, drawn after, keep clear of both.
  const noteList = drawNotes(doc, chart, pinned, plot, ctx.width, dotBoxes);
  drawReferences(doc, references, ys, plot, yText, refsBelow, refsAbove, { boxes: dotBoxes });
  chart.append(refsAbove);
  if (label && ctx.view.labels) {
    // Always-on names beside the dots, biggest dots first, each skipped when it would land on an earlier name or a dot.
    const names = svg(doc, "g", { class: "fft-point-labels" });
    names.setAttribute("aria-hidden", "true");
    const taken: { x: number; y: number; width: number; height: number }[] = points.map((p) => ({ x: xs(p.x) - p.r, y: ys(p.y) - p.r, width: p.r * 2, height: p.r * 2 }));
    const clash = (a: { x: number; y: number; width: number; height: number }) => taken.some((b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y);
    for (const point of points) {
      const text = ctx.format(point.row[label], label);
      if (!text) continue;
      const width = text.length * CHAR_WIDTH;
      const [cx, cy] = [xs(point.x), ys(point.y)];
      // Right of the dot first, then left, then above, then below: the first spot that is free and inside the plot.
      // A dot on the plot's top edge may lend its name a few pixels of the top margin.
      const spots: [number, number, string][] = [
        [cx + point.r + 4, cy + 4, "start"],
        [cx - point.r - 4, cy + 4, "end"],
        [cx, cy - point.r - 4, "middle"],
        [cx, cy + point.r + 13, "middle"],
      ];
      for (const [x, y, anchor] of spots) {
        const box = { x: anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2, y: y - 11, width, height: 13 };
        if (box.x < plot.x || box.x + box.width > plot.x + plot.w || box.y < plot.y - 8 || box.y + box.height > plot.y + plot.h || clash(box)) continue;
        const node = svg(doc, "text", { class: "fft-point-label", x, y, "text-anchor": anchor });
        node.textContent = text;
        names.append(node);
        taken.push(box);
        break;
      }
    }
    chart.append(names);
  }
  chart.append(overlay);
  if (!dense) roving([...overlay.children]);
  wrap.append(chart);
  if (noteList) wrap.append(noteList);
  if (!points.length) wrap.append(html(doc, "p", "fft-empty-note", wordsFor(ctx).noRowBoth(ctx.label(xField), ctx.label(yField))));

  const columns = [label, xField, yField, size, series, cluster].filter((f): f is string => Boolean(f));
  // A dense scatter lists its first rows for screen readers and says how many there are; the keyboard walks them all.
  const listed = dense ? points.slice(0, DENSE_TABLE_ROWS) : points;
  wrap.append(hiddenTableOf(ctx, quadrants ? listed.map((p) => ({ ...p.row, [wordsFor(ctx).quadrant]: quadrantName(p.x, p.y) })) : listed.map((p) => p.row), quadrants ? [...columns, wordsFor(ctx).quadrant] : columns));
  ctx.el.append(wrap);
};
