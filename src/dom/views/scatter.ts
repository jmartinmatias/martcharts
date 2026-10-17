import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { ScatterView } from "../../core/views.ts";
import { referenceValues, resolveReferences } from "../../core/reference.ts";
import { linearScale } from "../layout.ts";
import { drawReferences } from "./reference.ts";
import { tickFormatter } from "./chart.ts";
import { buildTable, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const CHAR_WIDTH = 6;
/** Radius of the biggest bubble: a Fibonacci step. */
const MAX_BUBBLE = 21;

/**
 * Draws the `scatter` view: one dot per row placed by two numbers, with
 * hairline gridlines both ways and a title on each axis, since both are
 * values. Dots are 10px with a surface ring so overlaps stay legible, and each
 * carries a 26px hit area for hover and keyboard focus.
 */
export const renderScatter: ViewRenderer<ScatterView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { x: xField, y: yField, series, label, size } = ctx.view;
  const points: { row: Row; x: number; y: number; group: number; r: number }[] = [];
  const groups: string[] = [];
  for (const row of ctx.rows) {
    const x = readNumber(row[xField]);
    const y = readNumber(row[yField]);
    if (x === null || y === null) continue;
    const name = series ? String(row[series]) : "";
    if (!groups.includes(name)) groups.push(name);
    points.push({ row, x, y, group: groups.indexOf(name), r: 5 });
  }
  // Bubbles: area follows the size field (radius by square root), up to 21px; the biggest draw first so small ones stay on top.
  if (size) {
    const largest = Math.max(0, ...points.map((p) => readNumber(p.row[size]) ?? 0)) || 1;
    for (const p of points) p.r = Math.max(3, Math.sqrt(Math.max(0, readNumber(p.row[size]) ?? 0) / largest) * MAX_BUBBLE);
    points.sort((a, b) => b.r - a.r);
  }

  const references = resolveReferences(ctx.view, ctx.rows);
  const yValues = [...points.map((p) => p.y), ...referenceValues(references)];
  const xTicks = linearScale(points.map((p) => p.x), [0, 1], { includeZero: false }).ticks;
  const yTicks = linearScale(yValues, [1, 0], { includeZero: false }).ticks;
  const xText = tickFormatter(ctx, xField, xTicks);
  const yText = tickFormatter(ctx, yField, yTicks);
  const left = Math.max(28, Math.max(...yTicks.map((t) => yText(t).length)) * CHAR_WIDTH + 12);
  const margin = { top: 21, right: 13, bottom: 39, left };
  const width = Math.max(ctx.width, left + 89);
  const height = ctx.height;
  const plot = { x: margin.left, y: margin.top, w: width - margin.left - margin.right, h: height - margin.top - margin.bottom };
  const xs = linearScale(points.map((p) => p.x), [plot.x, plot.x + plot.w], { includeZero: false });
  const ys = linearScale(yValues, [plot.y + plot.h, plot.y], { includeZero: false });

  const wrap = html(doc, "div", "fft-chart");
  if ((series && groups.length > 1) || size) {
    const legend = html(doc, "ul", "fft-legend");
    if (series && groups.length > 1) {
      groups.forEach((group, i) => {
        const swatch = html(doc, "span", "fft-swatch");
        swatch.dataset.shape = "dot";
        swatch.style.background = ctx.color(i);
        swatch.setAttribute("aria-hidden", "true");
        const item = html(doc, "li");
        item.append(swatch, ctx.format(group, series));
        legend.append(item);
      });
    }
    if (size) legend.append(html(doc, "li", "fft-scatter-size", `Bubble size: ${ctx.label(size)}`));
    wrap.append(legend);
  }

  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Scatter chart of ${ctx.label(yField)} against ${ctx.label(xField)}`);
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
  drawReferences(doc, references, ys, plot, yText, refsBelow, refsAbove, { boxes: dotBoxes });
  chart.append(refsBelow);

  const dots = svg(doc, "g");
  const overlay = svg(doc, "g");
  const marks: SVGCircleElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const mark of marks) mark.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  points.forEach((point, i) => {
    const cx = xs(point.x);
    const cy = ys(point.y);
    const dot = svg(doc, "circle", { class: size ? "fft-point fft-point-bubble" : "fft-point", cx, cy, r: Math.round(point.r * 100) / 100, style: `--fft-i: ${i}` });
    dot.style.setProperty("fill", ctx.color(point.group));
    if (label) dot.setAttribute("data-label", String(point.row[label]));
    marks.push(dot);
    dots.append(dot);

    const name = label ? ctx.format(point.row[label], label) : series ? ctx.format(point.row[series], series) : "";
    const items: TooltipItem[] = [
      { label: ctx.label(xField), value: ctx.format(point.row[xField], xField) },
      { label: ctx.label(yField), value: ctx.format(point.row[yField], yField) },
    ];
    if (size) items.push({ label: ctx.label(size), value: ctx.format(point.row[size], size) });
    if (series) items.push({ label: ctx.label(series), value: ctx.format(point.row[series], series), color: ctx.color(point.group) });
    const hit = svg(doc, "circle", { class: "fft-point-hit", cx, cy, r: Math.max(13, point.r + 3), tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${name ? `${name}: ` : ""}${items.map((item) => `${item.label} ${item.value}`).join(", ")}`);
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
  chart.append(dots, refsAbove, overlay);
  roving([...overlay.children]);
  wrap.append(chart);

  const hidden = html(doc, "div", "fft-sr-only");
  const columns = [label, xField, yField, size, series].filter((f): f is string => Boolean(f));
  hidden.append(buildTable(ctx, points.map((p) => p.row), columns, false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
