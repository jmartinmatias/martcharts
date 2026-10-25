import { minusFormat } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { DumbbellView } from "../../core/views.ts";
import { linearScale } from "../layout.ts";
import { highlights, tickFormatter } from "./chart.ts";
import { activeGroup, hiddenTableOf, html, legendList, roving, rowHeight, rowHit, svg } from "./shared.ts";
import { edgeAnchor, edgeX, nameColumn, writeLabel } from "./label-fit.ts";

/** Field names that read as a moment in time (q3_2025, h1, last, before): such a pair is a before and an after. */
const PERIOD = /(19|20)\d\d|\b[qh][1-4]\b|before|after|previous|prior|last|current|start|end/i;
/** The arrowhead: its length along the row and half its width, in pixels. Crisp at a 2px stroke. */
const HEAD = { length: 8, half: 4 };
/** How a row moved: its arrow's color and its legend key. */
type Direction = "up" | "down" | "flat";

/** The arrowhead at `tip`, pointing right when `dir` is positive and left when negative. */
function headPath(tip: number, cy: number, dir: 1 | -1): string {
  const base = tip - dir * HEAD.length;
  return `M${tip},${cy}L${base},${cy - HEAD.half}L${base},${cy + HEAD.half}Z`;
}

/**
 * Draws the `dumbbell` view: per row, a muted dot for the before value and an
 * accent dot for the after value, joined by a hairline, all on one shared axis
 * so the direction and size of each change read at a glance (a range plot).
 * Two different measures (revenue and cost) are not a before and an after: each
 * dot then takes a series color, and the tooltip gives the gap instead of a change.
 * With `mark: "arrow"` the line becomes an arrow from the before dot to the after
 * value (an arrow plot): between two periods it takes the up color when it rose
 * and the down color when it fell, and the legend keys Rose and Fell.
 */
export const renderDumbbell: ViewRenderer<DumbbellView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, from, to } = ctx.view;
  const arrow = ctx.view.mark === "arrow";
  const rows = ctx.rows.filter((row) => readNumber(row[from]) !== null && readNumber(row[to]) !== null);
  // Rows tighten as the list grows: roomy up to 8, regular to 16, compact past that (the shared row scale).
  const LANE = rowHeight(rows.length);
  const values = rows.flatMap((row) => [readNumber(row[from]) as number, readNumber(row[to]) as number]);
  // Small multiples pass a shared extent, so every panel draws on the same scale.
  values.push(...(ctx.extent ?? []));
  const ticks = linearScale(values, [0, 1], { includeZero: false }).ticks;
  const tickText = tickFormatter(ctx, to, ticks);
  const names = rows.map((row) => ctx.format(row[label], label));
  // The names' measured column, cut with an ellipsis past a third of the card.
  const column = nameColumn(names, ctx.width);
  const left = column.width + 8;
  const margin = { top: 5, right: 13, bottom: 26, left };
  const width = Math.max(ctx.width, left + 144);
  const height = margin.top + rows.length * LANE + margin.bottom;
  const x = linearScale(values, [margin.left, width - margin.right], { includeZero: false });
  const change = minusFormat(new Intl.NumberFormat(ctx.spec.locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" }));
  const periods = PERIOD.test(from) || PERIOD.test(to);
  const fixed = (field: string) => ctx.colorOf?.(field) ?? ctx.colorOf?.(ctx.label(field));
  const fromColor = periods ? fixed(from) : (fixed(from) ?? ctx.color(0));
  const toColor = periods ? (fixed(to) ?? ctx.color(0)) : (fixed(to) ?? ctx.color(1));
  const directionOf = (a: number, b: number): Direction => (b > a ? "up" : b < a ? "down" : "flat");
  const directions = rows.map((row) => directionOf(readNumber(row[from]) as number, readNumber(row[to]) as number));

  const wrap = html(doc, "div", "fft-chart");
  if (arrow) wrap.dataset.mark = "arrow";
  const entries: { cls: string; shape: "dot" | "line"; label: string; color: string }[] = [];
  const key = (cls: string, shape: "dot" | "line", text: string, color?: string) => entries.push({ cls, shape, label: text, color: color ?? "" });
  key("fft-db-key-from", "dot", ctx.label(from), fromColor);
  if (arrow && periods) {
    // Arrows between two periods are keyed by what they say: rose or fell, each only when it happened.
    if (directions.includes("up")) key("fft-db-key-up", "line", "Rose");
    if (directions.includes("down")) key("fft-db-key-down", "line", "Fell");
  } else key("fft-db-key-to", arrow ? "line" : "dot", ctx.label(to), toColor);
  // The shared legend, above the chart; keys without a color of their own take it from their class.
  const legend = legendList(ctx, entries);
  legend?.querySelectorAll<HTMLElement>(".fft-swatch").forEach((swatch, i) => {
    swatch.classList.add(entries[i]?.cls ?? "");
    if (!entries[i]?.color) swatch.style.removeProperty("background");
  });
  if (legend) wrap.append(legend);

  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `${arrow ? "Arrow plot" : "Dumbbell chart"} of ${ctx.label(from)} and ${ctx.label(to)} by ${ctx.label(label)}`);
  const plotBottom = margin.top + rows.length * LANE;
  for (const tick of x.ticks) {
    const tx = x(tick);
    chart.append(svg(doc, "line", { class: "fft-gridline", x1: tx, x2: tx, y1: margin.top, y2: plotBottom }));
    const word = tickText(tick);
    const anchor = edgeAnchor(tx, word, width);
    const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: edgeX(tx, anchor, width), y: plotBottom + 18, "text-anchor": anchor });
    text.textContent = word;
    chart.append(text);
  }
  // highlight keeps the named rows in color and steps the rest back to grey, as on hbar and dot.
  const picked = highlights((ctx.view as { highlight?: unknown }).highlight);
  const muted = (row: Row) => picked.length > 0 && !picked.includes(String(row[label]));
  // Pointing at a row lights it and steps the others back.
  wrap.classList.add("fft-dumbbell");
  const active = activeGroup(wrap, ctx.tooltip);
  const hits: Element[] = [];
  rows.forEach((row, i) => {
    const cy = margin.top + i * LANE + LANE / 2;
    const a = readNumber(row[from]) as number;
    const b = readNumber(row[to]) as number;
    const name = names[i] ?? "";
    const direction = directions[i] ?? "flat";
    const group = svg(doc, "g", { class: "fft-db-row", style: `--fft-i: ${i}` });
    if (arrow) group.dataset.direction = direction;
    if (muted(row)) group.dataset.muted = "";
    const text = svg(doc, "text", { class: "fft-db-label", x: column.end, y: cy, "text-anchor": "end", "dominant-baseline": "middle" });
    writeLabel(text, column.shown[i] ?? name, name);
    group.append(text);
    let anchor: SVGElement;
    if (arrow) {
      // The arrow's color: up or down between periods, else the second measure's series color.
      const stroke = periods ? undefined : toColor;
      const dir: 1 | -1 = b >= a ? 1 : -1;
      // The shaft stops at the head's base, so the head's tip is the exact after value.
      const shaftEnd = direction === "flat" ? x(b) : x(b) - dir * (HEAD.length - 1);
      const shaft = svg(doc, "line", { class: "fft-db-shaft", x1: x(a), x2: Math.abs(shaftEnd - x(a)) < 1 ? x(a) : shaftEnd, y1: cy, y2: cy });
      if (stroke) shaft.style.setProperty("stroke", stroke);
      group.append(shaft);
      const before = svg(doc, "circle", { class: "fft-db-from", cx: x(a), cy, r: 5 });
      if (fromColor) before.style.setProperty("fill", fromColor);
      group.append(before);
      if (direction === "flat") {
        // No move: a hollow ring at the shared value says it stayed put.
        const still = svg(doc, "circle", { class: "fft-db-still", cx: x(b), cy, r: 5 });
        group.append(still);
        anchor = still;
      } else {
        const head = svg(doc, "path", { class: "fft-db-head", d: headPath(x(b), cy, dir) });
        if (stroke) head.style.setProperty("fill", stroke);
        group.append(head);
        anchor = head;
      }
    } else {
      group.append(svg(doc, "line", { class: "fft-db-line", x1: x(a), x2: x(b), y1: cy, y2: cy }));
      const before = svg(doc, "circle", { class: "fft-db-from", cx: x(a), cy, r: 5 });
      if (fromColor) before.style.setProperty("fill", fromColor);
      group.append(before);
      const after = svg(doc, "circle", { class: "fft-db-to", cx: x(b), cy, r: 5 });
      after.style.setProperty("fill", toColor);
      group.append(after);
      anchor = after;
    }
    const items: TooltipItem[] = [
      { label: ctx.label(from), value: ctx.format(row[from], from), ...(fromColor ? { color: fromColor } : {}) },
      { label: ctx.label(to), value: ctx.format(row[to], to), ...(arrow && periods ? {} : { color: toColor }) },
      ...(periods ? (a !== 0 ? [{ label: "Change", value: change.format((b - a) / Math.abs(a)) }] : []) : [{ label: "Gap", value: ctx.format(Math.abs(a - b), to) }]),
    ];
    const hit = svg(doc, "rect", { class: "fft-db-hit", x: 0, y: cy - LANE / 2, width, height: LANE });
    const said = arrow && periods && direction !== "flat" ? `, ${direction === "up" ? "rose" : "fell"}` : "";
    hits.push(rowHit(ctx, { node: hit, row, name, items, anchor, active: group, group: active, said }));
    group.append(hit);
    chart.append(group);
  });
  roving(hits);
  wrap.append(chart);
  wrap.append(hiddenTableOf(ctx, rows, [label, from, to]));
  ctx.el.append(wrap);
};
