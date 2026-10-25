import { readNumber } from "../../core/formats.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { DotView } from "../../core/views.ts";
import { linearScale } from "../layout.ts";
import { DEEMPHASIS, highlights, tickFormatter } from "./chart.ts";
import { activeGroup, endRoom, fieldList, hiddenTableOf, html, legendList, roving, rowHeight, rowHit, svg } from "./shared.ts";
import { nameColumn, writeLabel } from "./label-fit.ts";

/** Dot radius: one measure gets a slightly bigger dot, several stay small so they can sit close. */
const RADIUS = { one: 6, many: 5 };

/**
 * Draws the `dot` view, a dot plot: one row per data row with its name on the
 * left, a hairline across, and one dot per measure at its value on one shared
 * axis. One measure writes its value beside the dot; several take series
 * colors and a legend. `highlight` keeps the named rows in color and greys
 * the rest. Small multiples pass a shared extent, so every panel's axis agrees.
 */
export const renderDot: ViewRenderer<DotView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label } = ctx.view;
  const measures = fieldList(ctx.view.values);
  const picked = highlights(ctx.view.highlight);
  const rows = ctx.rows;
  // Rows tighten as the list grows: roomy up to 8, regular to 16, compact past that (the shared row scale).
  const LANE = rowHeight(rows.length);
  const values = rows.map((row) => measures.map((field) => readNumber(row[field])));
  const present = values.flat().filter((n): n is number => n !== null);
  if (ctx.extent) present.push(...ctx.extent);
  const single = measures.length === 1;
  const radius = single ? RADIUS.one : RADIUS.many;

  const names = rows.map((row) => ctx.format(row[label], label));
  const valueTexts = rows.map((row, i) => measures.map((field, m) => (values[i]?.[m] === null ? "" : ctx.format(row[field], field))));
  // Margins: the names' measured column on the left (cut with an ellipsis past a third of the card), the value beside a lone dot on the right.
  const column = nameColumn(names, ctx.width);
  const shown = column.shown;
  const left = column.width + 8;
  const valueRoom = single ? endRoom(valueTexts.map((t) => t[0] ?? "")) + radius : radius + 8;
  const margin = { top: 5, right: Math.max(13, valueRoom), bottom: 26, left };
  const width = Math.max(ctx.width, left + margin.right + 89);
  const plotBottom = margin.top + rows.length * LANE;
  const height = plotBottom + margin.bottom;
  const x = linearScale(present, [margin.left, width - margin.right], { includeZero: false });
  const tickText = tickFormatter(ctx, measures[0], x.ticks);
  const colorOf = (i: number, m: number) => (picked.length === 0 || picked.includes(String(rows[i]?.[label])) ? ctx.color(m) : DEEMPHASIS);

  const wrap = html(doc, "div", "fft-chart fft-dots");
  const key = single ? undefined : legendList(ctx, measures.map((field, m) => ({ label: ctx.label(field), color: ctx.color(m), shape: "dot" as const })));
  if (key) wrap.append(key);

  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Dot plot of ${measures.map((field) => ctx.label(field)).join(", ")} by ${ctx.label(label)}`);
  for (const tick of x.ticks) {
    const tx = x(tick);
    chart.append(svg(doc, "line", { class: "fft-gridline", x1: tx, x2: tx, y1: margin.top, y2: plotBottom }));
    const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: tx, y: plotBottom + 18, "text-anchor": "middle" });
    text.textContent = tickText(tick);
    chart.append(text);
  }

  const active = activeGroup(wrap, ctx.tooltip);
  const hits: Element[] = [];
  rows.forEach((row, i) => {
    const cy = margin.top + i * LANE + LANE / 2;
    const name = names[i] ?? "";
    const group = svg(doc, "g", { class: "fft-dot-row", style: `--fft-i: ${i}` });
    const text = svg(doc, "text", { class: "fft-dot-label", x: column.end, y: cy, "text-anchor": "end", "dominant-baseline": "middle" });
    writeLabel(text, shown[i] ?? name, name);
    group.append(text);
    group.append(svg(doc, "line", { class: "fft-dot-line", x1: margin.left, x2: width - margin.right, y1: cy, y2: cy }));
    const items: TooltipItem[] = [];
    let anchor: SVGElement | undefined;
    // Dots in value order, the biggest first, so a smaller dot never hides under a bigger one that shares its spot.
    const order = measures.map((_, m) => m).filter((m) => values[i]?.[m] !== null).sort((a, b) => (values[i]?.[b] as number) - (values[i]?.[a] as number));
    for (const m of order) {
      const amount = values[i]?.[m] as number;
      const color = colorOf(i, m);
      const mark = svg(doc, "circle", { class: "fft-dot-mark", cx: x(amount), cy, r: radius });
      mark.style.setProperty("fill", color);
      group.append(mark);
      anchor = anchor ?? mark;
      items.push({ label: ctx.label(measures[m] as string), value: valueTexts[i]?.[m] ?? "", color });
    }
    if (single && order.length) {
      const amount = values[i]?.[0] as number;
      const value = svg(doc, "text", { class: "fft-dot-value", x: x(amount) + radius + 6, y: cy, "dominant-baseline": "middle" });
      value.textContent = valueTexts[i]?.[0] ?? "";
      group.append(value);
    }
    const hit = svg(doc, "rect", { class: "fft-dot-hit", x: 0, y: cy - LANE / 2, width, height: LANE });
    hits.push(rowHit(ctx, { node: hit, row, name, items: items.length ? items : [{ label: ctx.label(measures[0] as string), value: "" }], anchor: anchor ?? text, active: group, group: active }));
    group.append(hit);
    chart.append(group);
  });
  roving(hits);
  wrap.append(chart);
  wrap.append(hiddenTableOf(ctx, rows, [label, ...measures]));
  ctx.el.append(wrap);
};
