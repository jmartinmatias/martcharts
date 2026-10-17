import { readNumber } from "../../core/formats.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { RoseView } from "../../core/views.ts";
import { niceTicks, polar, sectorPath } from "../layout.ts";
import { tickFormatter } from "./chart.ts";
import { buildTable, fieldList, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const FULL = Math.PI * 2;
const CHAR_WIDTH = 6;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Draws the `rose` view: a polar area chart. One equal wedge per row, clockwise
 * from twelve o'clock, so a cycle (hours, months) wraps round as it does in
 * life. Radii grow with the square root of the value, so each wedge's area,
 * not its reach, tells the amount; several series stack outward, each ring
 * adding its own area. Rings mark the scale, names thin out evenly round a
 * crowded dial (12 at most, like a clock face), and wedges reveal clockwise.
 */
export const renderRose: ViewRenderer<RoseView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label } = ctx.view;
  const series = fieldList(ctx.view.y);
  const rows = ctx.rows;
  const n = rows.length;
  const values = rows.map((row) => series.map((field) => Math.max(0, readNumber(row[field]) ?? 0)));
  const totals = values.map((list) => list.reduce((a, b) => a + b, 0));
  const ticks = niceTicks(0, Math.max(ctx.view.max ?? 0, ...totals, 1), 3).filter((t) => t > 0);
  const max = ctx.view.max ?? ticks.at(-1) ?? 1;
  const tickText = tickFormatter(ctx, series[0], ticks);

  const width = Math.max(ctx.width, 233);
  const height = Math.min(Math.max(ctx.height, 233), 377, width);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 26;
  const reach = (value: number) => radius * Math.sqrt(Math.min(value, max) / max);
  const step = FULL / Math.max(1, n);

  const wrap = html(doc, "div", "fft-chart fft-rose");
  if (series.length > 1) {
    const legend = html(doc, "ul", "fft-legend");
    series.forEach((field, s) => {
      const swatch = html(doc, "span", "fft-swatch");
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
  chart.setAttribute("aria-label", `Rose chart of ${series.map((f) => ctx.label(f)).join(", ")} by ${ctx.label(label)}`);

  for (const tick of ticks) chart.append(svg(doc, "circle", { class: "fft-rose-ring", cx, cy, r: round2(reach(tick)) }));

  // Wedges, inner series first, so the stack builds outward.
  const wedges: SVGGElement[] = rows.map((_, i) => {
    const group = svg(doc, "g", { class: "fft-rose-wedge", style: `--fft-i: ${i}` });
    let below = 0;
    series.forEach((field, s) => {
      const v = values[i]?.[s] ?? 0;
      if (v <= 0) return;
      const seg = svg(doc, "path", {
        class: "fft-rose-seg",
        d: sectorPath(cx, cy, reach(below), reach(below + v), i * step, (i + 1) * step),
        "data-series": field,
        "data-index": i,
      });
      seg.style.fill = ctx.color(s);
      group.append(seg);
      below += v;
    });
    chart.append(group);
    return group;
  });

  // Ring values down the twelve o'clock edge, on a halo so they read over any wedge.
  for (const tick of ticks) {
    const mark = svg(doc, "text", { class: "fft-rose-tick", x: round2(cx - 4), y: round2(cy - reach(tick)), "text-anchor": "end", "dominant-baseline": "middle" });
    mark.textContent = tickText(tick);
    chart.append(mark);
  }

  // Names round the outside: at most 12, as on a clock face, every k-th when they would crowd, k dividing the count so the gaps stay even.
  const names = rows.map((row) => ctx.format(row[label], label));
  const room = (radius + 13) * step;
  const need = Math.max(...names.map((name) => name.length * CHAR_WIDTH + 13));
  const every = Array.from({ length: n }, (_, k) => k + 1).find((k) => n % k === 0 && k * room >= need && n / k <= 12) ?? n;
  names.forEach((name, i) => {
    if (i % every !== 0) return;
    const middle = (i + 0.5) * step;
    const place = polar(cx, cy, radius + 13, middle);
    const sin = Math.sin(middle);
    const cos = Math.cos(middle);
    const text = svg(doc, "text", {
      class: "fft-rose-axis",
      x: round2(place.x),
      y: round2(place.y + (cos > 0.3 ? -2 : cos < -0.3 ? 6 : 0)),
      "text-anchor": sin > 0.3 ? "start" : sin < -0.3 ? "end" : "middle",
      "dominant-baseline": "middle",
    });
    text.textContent = name;
    chart.append(text);
  });

  // Tooltip anchors: a point past each wedge's outer edge and its name, at its middle. Top-half wedges show the tooltip
  // above the dial and bottom-half ones below it, so it never covers the wedge pointed at, its name or the scale.
  const anchors = rows.map((_, i) => {
    const middle = (i + 0.5) * step;
    const spot = polar(cx, cy, radius + 21, middle);
    const anchor = svg(doc, "circle", { class: "fft-rose-anchor", cx: round2(spot.x), cy: round2(spot.y), r: 0.5 });
    chart.append(anchor);
    return { anchor, below: Math.cos(middle) < 0 };
  });

  const hits: Element[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const wedge of wedges) wedge.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  rows.forEach((row, i) => {
    const name = names[i] ?? "";
    const items: TooltipItem[] = series.map((field, s) => ({ label: ctx.label(field), value: ctx.format(row[field], field), color: ctx.color(s) }));
    if (series.length > 1) items.push({ label: "Total", value: ctx.format(totals[i] ?? 0, series[0]) });
    const hit = svg(doc, "path", { class: "fft-rose-hit", d: sectorPath(cx, cy, 0.01, radius + 8, i * step, (i + 1) * step), tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${name}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      wedges.forEach((wedge, k) => wedge.toggleAttribute("data-active", k === i));
      const spot = anchors[i];
      ctx.tooltip.show(spot?.anchor ?? hit, name, items, { below: spot?.below ?? false });
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
