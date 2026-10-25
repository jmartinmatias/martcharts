import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { BeeswarmView } from "../../core/views.ts";
import { linearScale, swarm } from "../layout.ts";
import { tickFormatter } from "./chart.ts";
import { activeGroup, hiddenTableOf, html, roving, rowHit, svg } from "./shared.ts";
import { edgeAnchor, edgeX, nameColumn, writeLabel } from "./label-fit.ts";

const RADIUS = 4;

/**
 * Draws the `beeswarm` view: one dot per row along a value axis, nudged
 * perpendicular to it so no two overlap, with one labelled row per group.
 * Rows carry the group's identity, so every dot can share one color.
 */
export const renderBeeswarm: ViewRenderer<BeeswarmView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { value, group, label } = ctx.view;
  const points: { row: Row; amount: number; group: number }[] = [];
  const groups: string[] = [];
  for (const row of ctx.rows) {
    const amount = readNumber(row[value]);
    if (amount === null) continue;
    const name = group ? String(row[group]) : "";
    if (!groups.includes(name)) groups.push(name);
    points.push({ row, amount, group: groups.indexOf(name) });
  }

  // Small multiples pass a shared extent, so every panel draws on the same scale.
  const domain = [...points.map((p) => p.amount), ...(ctx.extent ?? [])];
  const ticks = linearScale(domain, [0, 1], { includeZero: false }).ticks;
  const tickText = tickFormatter(ctx, value, ticks);
  const groupLabels = groups.map((name) => (group ? ctx.format(name, group) : ""));
  // Group names in a measured column, cut with an ellipsis past a third of the card.
  const column = group ? nameColumn(groupLabels, ctx.width) : undefined;
  const left = column ? column.width + 8 : 13;
  const margin = { top: 8, right: 13, bottom: 39, left };
  const width = Math.max(ctx.width, left + 144);
  const plotWidth = width - margin.left - margin.right;
  const x = linearScale(domain, [margin.left, margin.left + plotWidth], { includeZero: false });

  // Offsets per group first, so each row can be as tall as its swarm needs.
  const offsets = new Map<Row, number>();
  const rowHeights = groups.map((_, g) => {
    const members = points.filter((p) => p.group === g);
    const dy = swarm(members.map((p) => x(p.amount)), RADIUS + 0.5);
    members.forEach((p, i) => offsets.set(p.row, dy[i] ?? 0));
    return Math.max(34, 2 * Math.max(0, ...dy.map(Math.abs)) + 2 * RADIUS + 13);
  });
  const rowTops = rowHeights.map((_, g) => margin.top + rowHeights.slice(0, g).reduce((a, b) => a + b, 0));
  const plotHeight = rowHeights.reduce((a, b) => a + b, 0);
  const height = margin.top + plotHeight + margin.bottom;

  const wrap = html(doc, "div", "fft-chart");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Beeswarm of ${ctx.label(value)}${group ? ` by ${ctx.label(group)}` : ""}`);
  for (const tick of x.ticks) {
    const tx = x(tick);
    chart.append(svg(doc, "line", { class: "fft-gridline", x1: tx, x2: tx, y1: margin.top, y2: margin.top + plotHeight }));
    const word = tickText(tick);
    const anchor = edgeAnchor(tx, word, width);
    const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: edgeX(tx, anchor, width), y: margin.top + plotHeight + 18, "text-anchor": anchor });
    text.textContent = word;
    chart.append(text);
  }
  chart.append(svg(doc, "line", { class: "fft-baseline", x1: margin.left, x2: margin.left + plotWidth, y1: margin.top + plotHeight, y2: margin.top + plotHeight }));
  const title = svg(doc, "text", { class: "fft-axis-title", x: margin.left + plotWidth, y: height - 3, "text-anchor": "end" });
  title.textContent = ctx.label(value);
  chart.append(title);
  groups.forEach((_, g) => {
    const top = rowTops[g] ?? 0;
    if (g > 0) chart.append(svg(doc, "line", { class: "fft-gridline", x1: 0, x2: margin.left + plotWidth, y1: top, y2: top }));
    if (group && column) {
      const text = svg(doc, "text", { class: "fft-swarm-group", x: column.end, y: top + (rowHeights[g] ?? 0) / 2, "text-anchor": "end", "dominant-baseline": "middle" });
      writeLabel(text, column.shown[g] ?? "", groupLabels[g] ?? "");
      chart.append(text);
    }
  });

  const dots = svg(doc, "g");
  const overlay = svg(doc, "g");
  const marks: SVGCircleElement[] = [];
  const hits: Element[] = [];
  const active = activeGroup(wrap, ctx.tooltip);
  points.forEach((point, i) => {
    const cx = x(point.amount);
    const cy = (rowTops[point.group] ?? 0) + (rowHeights[point.group] ?? 0) / 2 + (offsets.get(point.row) ?? 0);
    const dot = svg(doc, "circle", { class: "fft-bee", cx, cy, r: RADIUS, style: `--fft-i: ${i}` });
    dot.style.setProperty("fill", (group ? ctx.colorOf?.(point.row[group]) : undefined) ?? ctx.color(0));
    marks.push(dot);
    dots.append(dot);
    const name = label ? ctx.format(point.row[label], label) : "";
    const items: TooltipItem[] = [{ label: ctx.label(value), value: ctx.format(point.row[value], value) }];
    if (group) items.push({ label: ctx.label(group), value: ctx.format(point.row[group], group) });
    const hit = svg(doc, "circle", { class: "fft-bee-hit", cx, cy, r: 9 });
    hits.push(rowHit(ctx, { node: hit, row: point.row, name, items, active: dot, group: active }));
    // A dot with no name is read by its values alone.
    if (!name) hit.setAttribute("aria-label", items.map((it) => `${it.label} ${it.value}`).join(", "));
    overlay.append(hit);
  });
  chart.append(dots, overlay);
  roving(hits);
  wrap.append(chart);
  wrap.append(hiddenTableOf(ctx, points.map((p) => p.row), [label, value, group].filter((f): f is string => Boolean(f))));
  ctx.el.append(wrap);
};
