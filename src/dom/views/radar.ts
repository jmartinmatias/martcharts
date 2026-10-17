import { readNumber } from "../../core/formats.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { RadarView } from "../../core/views.ts";
import { niceTicks, polar, sectorPath } from "../layout.ts";
import { tickFormatter } from "./chart.ts";
import { buildTable, fieldList, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const FULL = Math.PI * 2;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Draws the `radar` view: one spoke per row around a circle, polygon rings for
 * one shared scale from zero, and per series a soft shape with a crisp 2px
 * outline and a dot on each spoke. Pointing at a spoke compares every series
 * on that attribute. Up to 3 series stay readable.
 */
export const renderRadar: ViewRenderer<RadarView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label } = ctx.view;
  const series = fieldList(ctx.view.y);
  const rows = ctx.rows;
  const n = rows.length;
  const values = rows.flatMap((row) => series.map((field) => readNumber(row[field]) ?? 0));
  const ticks = niceTicks(0, Math.max(ctx.view.max ?? 0, ...values, 1), 4).filter((t) => t > 0);
  const max = ctx.view.max ?? ticks.at(-1) ?? 1;
  const tickText = tickFormatter(ctx, series[0], ticks);

  const width = Math.max(ctx.width, 233);
  const height = Math.min(Math.max(ctx.height, 233), 377, width);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 34;
  const angle = (i: number) => (i * FULL) / Math.max(1, n);
  const at = (r: number, i: number) => {
    const p = polar(cx, cy, r, angle(i));
    return { x: round2(p.x), y: round2(p.y) };
  };
  const shape = (r: (i: number) => number) => `${rows.map((_, i) => `${i === 0 ? "M" : "L"}${at(r(i), i).x},${at(r(i), i).y}`).join("")}Z`;

  const wrap = html(doc, "div", "fft-chart fft-radar");
  if (series.length > 1) {
    const legend = html(doc, "ul", "fft-legend");
    series.forEach((field, s) => {
      const swatch = html(doc, "span", "fft-swatch");
      swatch.dataset.shape = "line";
      swatch.style.background = ctx.color(s);
      swatch.setAttribute("aria-hidden", "true");
      const item = html(doc, "li");
      item.append(swatch, ctx.label(field));
      legend.append(item);
    });
    wrap.append(legend);
  }
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Radar chart of ${series.map((f) => ctx.label(f)).join(", ")} across ${ctx.label(label)}`);

  // Ring values sit half a spoke round from the first spoke, in the gap, clear of every data point.
  const gap = Math.PI / Math.max(1, n);
  for (const tick of ticks) {
    chart.append(svg(doc, "path", { class: "fft-radar-ring", d: shape(() => (tick / max) * radius) }));
    const spot = polar(cx, cy, (tick / max) * radius, gap);
    const mark = svg(doc, "text", { class: "fft-radar-tick", x: round2(spot.x), y: round2(spot.y), dx: 3, "dominant-baseline": "middle" });
    mark.textContent = tickText(tick);
    chart.append(mark);
  }
  const spokes = rows.map((row, i) => {
    const end = at(radius, i);
    const spoke = svg(doc, "line", { class: "fft-radar-spoke", x1: cx, y1: cy, x2: end.x, y2: end.y });
    chart.append(spoke);
    const place = at(radius + 13, i);
    const sin = Math.sin(angle(i));
    const cos = Math.cos(angle(i));
    const text = svg(doc, "text", {
      class: "fft-radar-axis",
      x: place.x,
      y: place.y + (cos > 0.3 ? -3 : cos < -0.3 ? 8 : 0),
      "text-anchor": sin > 0.3 ? "start" : sin < -0.3 ? "end" : "middle",
      "dominant-baseline": "middle",
    });
    text.textContent = ctx.format(row[label], label);
    chart.append(text);
    return spoke;
  });
  series.forEach((field, s) => {
    const path = svg(doc, "path", { class: "fft-radar-shape", d: shape((i) => ((readNumber(rows[i]?.[field]) ?? 0) / max) * radius), "data-series": field });
    path.style.setProperty("--fft-radar-color", ctx.color(s));
    chart.append(path);
    rows.forEach((row, i) => {
      const p = at(((readNumber(row[field]) ?? 0) / max) * radius, i);
      const dot = svg(doc, "circle", { class: "fft-radar-dot", cx: p.x, cy: p.y, r: 3.5, "data-series": field });
      dot.style.fill = ctx.color(s);
      chart.append(dot);
    });
  });

  const hits: Element[] = [];
  const half = Math.PI / Math.max(1, n);
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const spoke of spokes) spoke.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  rows.forEach((row, i) => {
    const name = ctx.format(row[label], label);
    const items: TooltipItem[] = series.map((field, s) => ({ label: ctx.label(field), value: ctx.format(row[field], field), color: ctx.color(s) }));
    const hit = svg(doc, "path", { class: "fft-radar-hit", d: sectorPath(cx, cy, 0.01, radius + 13, angle(i) - half, angle(i) + half), tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${name}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      spokes.forEach((spoke, k) => spoke.toggleAttribute("data-active", k === i));
      ctx.tooltip.show(spokes[i] ?? hit, name, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    selectable(hit, () => ctx.select(row));
    hits.push(hit);
  });
  const overlay = svg(doc, "g");
  overlay.append(...hits);
  chart.append(overlay);
  roving(hits);
  wrap.append(chart);
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, rows, [label, ...series], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
