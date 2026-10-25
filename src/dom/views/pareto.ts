import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { ParetoView } from "../../core/views.ts";
import { bands, barPath, CHAR_WIDTH, fitLabels, layoutBars, LINE_HEIGHT, linearScale, linePath, wrapLabels } from "../layout.ts";
import { DEEMPHASIS } from "./chart.ts";
import { drawReferences } from "./reference.ts";
import { categoryLabel, hiddenTableOf, html, legendList, selectable, shareFormat, svg } from "./shared.ts";
import { roving } from "./focus.ts";
import { wordsFor } from "./words.ts";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Draws the `pareto` view: categories sorted largest first, each a bar of its
 * share of the total, with a neutral line through the running total and a
 * dashed line at the threshold, all on one 0 to 100% axis (no second scale).
 * Bars up to the crossing, the vital few, keep the accent; the rest go grey.
 */
export const renderPareto: ViewRenderer<ParetoView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, value, threshold = 0.8 } = ctx.view;
  // The measure keeps its fixed color; a vital cause with its own fixed color keeps that.
  const hue = ctx.colorOf?.(value) ?? ctx.colorOf?.(ctx.label(value)) ?? ctx.color(0);
  const items = ctx.rows
    .map((row) => ({ row, amount: readNumber(row[value]) ?? 0 }))
    .filter((it) => it.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const total = items.reduce((sum, it) => sum + it.amount, 0) || 1;
  let running = 0;
  const shares = items.map((it) => {
    running += it.amount;
    return { ...it, share: it.amount / total, cumulative: running / total, name: ctx.format(it.row[label], label) };
  });
  const crossing = shares.findIndex((it) => it.cumulative >= threshold - 1e-9);
  const vital = crossing < 0 ? shares.length : crossing + 1;
  const percent = shareFormat(ctx.spec.locale);
  const tickText = (v: number) => percent.format(v);

  const wrap = html(doc, "div", "fft-chart");
  const legend = legendList(ctx, [
    { label: wordsFor(ctx).share, shape: "rect", color: hue },
    { label: wordsFor(ctx).runningTotal, shape: "line", color: "var(--fft-text-secondary)" },
  ]);
  if (legend) wrap.append(legend);

  const ticks = linearScale([0, 1], [1, 0], { includeZero: true }).ticks;
  const left = Math.max(28, Math.max(...ticks.map((t) => tickText(t).length)) * CHAR_WIDTH + 12);
  const width = Math.max(ctx.width, left + 144);
  const height = ctx.height;
  // Names that would be thinned out wrap onto short lines instead, so every cause the guide names is on the chart.
  const room = width - left - 13;
  const widest = Math.max(...shares.map((it) => it.name.length)) * CHAR_WIDTH + 8;
  const wrapped = shares.length <= 12 && shares.length * widest > room ? wrapLabels(shares.map((it) => it.name), room / shares.length - 4, CHAR_WIDTH) : undefined;
  const bottom = 26 + (wrapped ? (Math.max(...wrapped.map((lines) => lines.length)) - 1) * LINE_HEIGHT : 0);
  const plot = { x: left, y: 13, w: room, h: height - 13 - bottom };
  const y = linearScale([0, 1], [plot.y + plot.h, plot.y], { includeZero: true });
  const slots = bands(shares.length, plot.x, plot.w);

  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", wordsFor(ctx).aria.pareto(ctx.label(value), ctx.label(label)));
  for (const tick of y.ticks) {
    const ty = y(tick);
    chart.append(svg(doc, "line", { class: tick === 0 ? "fft-baseline" : "fft-gridline", x1: plot.x, x2: plot.x + plot.w, y1: ty, y2: ty }));
    const text = svg(doc, "text", { class: "fft-tick fft-tick-y", x: plot.x - 8, y: ty, "text-anchor": "end", "dominant-baseline": "middle" });
    text.textContent = tickText(tick);
    chart.append(text);
  }
  // Category labels, wrapped as above, or else thinned, then skipped when they would still come within 8px of the last one drawn.
  const every = wrapped ? 1 : Math.max(1, Math.ceil((shares.length * widest) / plot.w));
  const candidates = slots.map((_, i) => i).filter((i) => i % every === 0);
  const drawn = wrapped ? candidates.map((_, k) => k) : fitLabels(candidates.map((i) => ({ x: slots[i]?.center ?? 0, width: (shares[i]?.name ?? "").length * CHAR_WIDTH })));
  for (const k of drawn) {
    const i = candidates[k] as number;
    chart.append(categoryLabel(doc, { class: "fft-tick fft-tick-x", x: slots[i]?.center ?? 0, y: plot.y + plot.h + 18, "text-anchor": "middle" }, shares[i]?.name ?? "", wrapped?.[i], LINE_HEIGHT));
  }

  const below = svg(doc, "g");
  const above = svg(doc, "g");
  chart.append(below);
  const groups = slots.map((_, i) => svg(doc, "g", { class: "fft-marks fft-pareto", style: `--fft-i: ${i}` }));
  const rects = layoutBars([shares.map((it) => it.share)], slots, y, { maxWidth: 34 });
  for (const rect of rects) {
    const it = shares[rect.index];
    if (!it) continue;
    const bar = svg(doc, "path", { class: "fft-bar fft-pareto-bar", d: barPath(rect, 4), "data-share": round2(it.share) });
    const isVital = rect.index < vital;
    if (isVital) bar.setAttribute("data-vital", "");
    bar.style.setProperty("fill", isVital ? (ctx.colorOf?.(it.row[label]) ?? hue) : DEEMPHASIS);
    groups[rect.index]?.append(bar);
  }
  chart.append(...groups);
  const points = shares.map((it, i) => ({ x: slots[i]?.center ?? 0, y: y(it.cumulative) }));
  chart.append(svg(doc, "path", { class: "fft-pareto-line", d: linePath(points), pathLength: 1 }));
  shares.forEach((it, i) => {
    const point = points[i] as { x: number; y: number };
    chart.append(svg(doc, "circle", { class: "fft-pareto-dot", cx: point.x, cy: point.y, r: 4, "data-cumulative": round2(it.cumulative) }));
  });
  drawReferences(doc, [{ kind: "line", value: threshold }], y, plot, tickText, below, above, { lines: [points], boxes: rects });
  chart.append(above);

  const overlay = svg(doc, "g");
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const group of groups) group.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  slots.forEach((slot, i) => {
    const it = shares[i];
    if (!it) return;
    const items: TooltipItem[] = [
      { label: ctx.label(value), value: ctx.format(it.row[value], value), color: i < vital ? (ctx.colorOf?.(it.row[label]) ?? hue) : DEEMPHASIS },
      { label: wordsFor(ctx).share, value: percent.format(it.share) },
      { label: wordsFor(ctx).runningTotal, value: percent.format(it.cumulative) },
    ];
    const hit = svg(doc, "rect", { class: "fft-hit", x: slot.start, y: plot.y, width: slot.width, height: plot.h, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${it.name}: ${items.map((item) => `${item.label} ${item.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const group of groups) group.removeAttribute("data-active");
      groups[i]?.setAttribute("data-active", "");
      ctx.tooltip.show(hit, it.name, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    const row: Row = it.row;
    selectable(hit, () => ctx.select(row));
    overlay.append(hit);
  });
  chart.append(overlay);
  roving([...overlay.children]);
  wrap.append(chart);
  if (!shares.length) wrap.append(html(doc, "p", "fft-empty-note", wordsFor(ctx).nonePositive(ctx.label(label).toLowerCase(), ctx.label(value).toLowerCase())));
  wrap.append(hiddenTableOf(ctx, shares.map((it) => it.row), [label, value]));
  ctx.el.append(wrap);
};
