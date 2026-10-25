import { minusFormat } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { DumbbellView } from "../../core/views.ts";
import { linearScale } from "../layout.ts";
import { tickFormatter } from "./chart.ts";
import { buildTable, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const CHAR_WIDTH = 6;
const ROW = 34;
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
  const values = rows.flatMap((row) => [readNumber(row[from]) as number, readNumber(row[to]) as number]);
  const ticks = linearScale(values, [0, 1], { includeZero: false }).ticks;
  const tickText = tickFormatter(ctx, to, ticks);
  const names = rows.map((row) => ctx.format(row[label], label));
  const left = Math.max(34, Math.max(...names.map((n) => n.length)) * CHAR_WIDTH + 13);
  const margin = { top: 5, right: 13, bottom: 26, left };
  const width = Math.max(ctx.width, left + 144);
  const height = margin.top + rows.length * ROW + margin.bottom;
  const x = linearScale(values, [margin.left, width - margin.right], { includeZero: false });
  const change = minusFormat(new Intl.NumberFormat(ctx.spec.locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" }));
  const periods = PERIOD.test(from) || PERIOD.test(to);
  const fromColor = periods ? undefined : ctx.color(0);
  const toColor = periods ? ctx.color(0) : ctx.color(1);
  const directionOf = (a: number, b: number): Direction => (b > a ? "up" : b < a ? "down" : "flat");
  const directions = rows.map((row) => directionOf(readNumber(row[from]) as number, readNumber(row[to]) as number));

  const wrap = html(doc, "div", "fft-chart");
  if (arrow) wrap.dataset.mark = "arrow";
  const legend = html(doc, "ul", "fft-legend");
  const key = (cls: string, shape: "dot" | "line", text: string, color?: string) => {
    const swatch = html(doc, "span", `fft-swatch ${cls}`);
    swatch.dataset.shape = shape;
    swatch.setAttribute("aria-hidden", "true");
    if (color) swatch.style.background = color;
    const item = html(doc, "li");
    item.append(swatch, text);
    legend.append(item);
  };
  key("fft-db-key-from", "dot", ctx.label(from), fromColor);
  if (arrow && periods) {
    // Arrows between two periods are keyed by what they say: rose or fell, each only when it happened.
    if (directions.includes("up")) key("fft-db-key-up", "line", "Rose");
    if (directions.includes("down")) key("fft-db-key-down", "line", "Fell");
  } else key("fft-db-key-to", arrow ? "line" : "dot", ctx.label(to), toColor);
  wrap.append(legend);

  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `${arrow ? "Arrow plot" : "Dumbbell chart"} of ${ctx.label(from)} and ${ctx.label(to)} by ${ctx.label(label)}`);
  const plotBottom = margin.top + rows.length * ROW;
  for (const tick of x.ticks) {
    const tx = x(tick);
    chart.append(svg(doc, "line", { class: "fft-gridline", x1: tx, x2: tx, y1: margin.top, y2: plotBottom }));
    const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: tx, y: plotBottom + 18, "text-anchor": "middle" });
    text.textContent = tickText(tick);
    chart.append(text);
  }
  rows.forEach((row, i) => {
    const cy = margin.top + i * ROW + ROW / 2;
    const a = readNumber(row[from]) as number;
    const b = readNumber(row[to]) as number;
    const name = names[i] ?? "";
    const direction = directions[i] ?? "flat";
    const group = svg(doc, "g", { class: "fft-db-row", style: `--fft-i: ${i}` });
    if (arrow) group.dataset.direction = direction;
    const text = svg(doc, "text", { class: "fft-db-label", x: margin.left - 13, y: cy, "text-anchor": "end", "dominant-baseline": "middle" });
    text.textContent = name;
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
    const hit = svg(doc, "rect", { class: "fft-db-hit", x: 0, y: cy - ROW / 2, width, height: ROW, tabindex: 0, role: "img" });
    const said = arrow && periods && direction !== "flat" ? `, ${direction === "up" ? "rose" : "fell"}` : "";
    hit.setAttribute("aria-label", `${name}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}${said}`);
    const show = () => ctx.tooltip.show(anchor, name, items);
    hit.addEventListener("pointerenter", show);
    hit.addEventListener("focus", show);
    hit.addEventListener("pointerleave", () => ctx.tooltip.hide());
    hit.addEventListener("blur", () => ctx.tooltip.hide());
    selectable(hit, () => ctx.select(row));
    group.append(hit);
    chart.append(group);
  });
  roving([...chart.querySelectorAll(".fft-db-hit")]);
  wrap.append(chart);
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, rows, [label, from, to], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
