import { readNumber } from "../../core/formats.ts";
import { getPreset } from "../../core/presets.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewContext, ViewRenderer } from "../../core/view-context.ts";
import type { DonutView } from "../../core/views.ts";
import { arcPath } from "../layout.ts";
import { buildTable, evenFormat, figureSize, html, ringThickness, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";
import { countable } from "../count-up.ts";

/** One slice of a donut or pie: its row and its positive amount. */
export interface Slice {
  row: Row;
  amount: number;
}

/** The rows a donut or pie can draw: those with a positive amount, in the order given. */
export function slicesOf(rows: Row[], value: string): Slice[] {
  const slices: Slice[] = [];
  for (const row of rows) {
    const amount = readNumber(row[value]);
    if (amount !== null && amount > 0) slices.push({ row, amount });
  }
  return slices;
}

/** A slice's color: its category's color inside small multiples (the same in every panel), otherwise the palette in order. */
export function sliceColor(ctx: ViewContext<{ type: string }>, label: string, slice: Slice, index: number): string {
  return ctx.colorOf?.(slice.row[label]) ?? ctx.color(index);
}

/** The legend a donut and a pie share: a swatch, the name, the value and the share, one line per slice. */
export function sliceLegend(ctx: ViewContext<{ type: string }>, label: string, slices: Slice[], total: number, color: (i: number) => string, amountText: (n: number) => string, share: Intl.NumberFormat): HTMLElement {
  const doc = ctx.el.ownerDocument;
  const legend = html(doc, "ul", "fft-donut-legend");
  slices.forEach((slice, i) => {
    const swatch = html(doc, "span", "fft-swatch");
    swatch.style.background = color(i);
    swatch.setAttribute("aria-hidden", "true");
    const item = html(doc, "li");
    item.append(
      swatch,
      html(doc, "span", "fft-donut-name", ctx.format(slice.row[label], label)),
      html(doc, "span", "fft-donut-value", amountText(slice.amount)),
      html(doc, "span", "fft-donut-share", share.format(slice.amount / total)),
    );
    legend.append(item);
  });
  return legend;
}

/** Field names that count seats, so a bare half ring can say "seats" under its total. */
const SEATS = /seat/i;
/** Room over a half ring for the majority label: one line of 11px text and a little air. */
const MAJORITY_ROOM = 18;

/**
 * Draws the `donut` view: a ring of slices with a 2px gap between them, the
 * total in the middle, and a legend of each slice's value and share. Sizes are
 * Fibonacci steps: a 144px ring 13px thick, or 233px and 21px thick when wide.
 * With `arc: "half"` the ring is a semicircle open at the bottom, its slices
 * laid left to right in the order given (a parliament), and `majority` marks
 * the halfway point with a tick and the seats a majority takes (more than half).
 */
export const renderDonut: ViewRenderer<DonutView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, value, caption } = ctx.view;
  const half = ctx.view.arc === "half";
  const majority = half && ctx.view.majority === true;
  const slices = slicesOf(ctx.rows, value);
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  const share = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0 });
  // The legend's figures in one precision, so they line up.
  const amountText = evenFormat(ctx, value, slices.map((slice) => slice.amount), { type: "number", compact: true });
  const color = (i: number) => sliceColor(ctx, label, slices[i] as Slice, i);

  const size = figureSize(ctx.width);
  const thickness = ringThickness(size);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const round = getPreset(ctx.spec.style?.preset)?.marks?.sliceCaps === "round";
  // The gap is 2px of surface at the ring's centerline; round caps need room for themselves too.
  const gap = slices.length > 1 ? (2 + (round ? thickness : 0)) / r : 0;
  // A half ring runs from nine o'clock over the top to three o'clock; a full one all the way round from twelve.
  const sweep = half ? Math.PI : Math.PI * 2;
  const origin = half ? -Math.PI / 2 : 0;
  // The half ring's box: the top of the ring (plus the majority label's line) down to its open base.
  const top = majority ? MAJORITY_ROOM : 0;
  const cy = c + top;
  const height = half ? cy + thickness / 2 + 1 : size;

  const wrap = html(doc, "div", "fft-donut");
  const figure = html(doc, "div", "fft-donut-figure");
  figure.style.width = `${size}px`;
  figure.style.height = `${height}px`;
  if (half) figure.dataset.arc = "half";
  const ring = svg(doc, "svg", { width: size, height, viewBox: `0 0 ${size} ${height}` });
  ring.setAttribute("role", "group");
  ring.setAttribute("aria-label", `${half ? "Half donut" : "Donut"} chart of ${ctx.label(value)} by ${ctx.label(label)}`);
  if (half) ring.append(svg(doc, "path", { class: "fft-donut-track", d: arcPath(c, cy, r, origin, origin + sweep), "stroke-width": thickness }));
  else ring.append(svg(doc, "circle", { class: "fft-donut-track", cx: c, cy, r, "stroke-width": thickness }));

  // The slice that crosses the halfway point: the one whose running total first reaches a majority.
  const needed = Math.floor(total / 2) + 1;
  let running = 0;
  const crossing = majority ? slices.findIndex((slice) => (running += slice.amount) >= needed) : -1;

  const marks: SVGPathElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const mark of marks) mark.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  let angle = origin;
  slices.forEach((slice, i) => {
    const span = (slice.amount / total) * sweep;
    const start = angle + Math.min(gap, span * 0.9) / 2;
    const end = angle + span - Math.min(gap, span * 0.9) / 2;
    angle += span;
    const d =
      slices.length === 1 && !half ? `${arcPath(c, cy, r, 0, Math.PI)}${arcPath(c, cy, r, Math.PI, Math.PI * 2).replace(/^M[^A]+/, "")}` : arcPath(c, cy, r, start, end);
    const mark = svg(doc, "path", { class: "fft-slice", d, "stroke-width": thickness, "stroke-linecap": round ? "round" : "butt", pathLength: 1, style: `--fft-i: ${i}` });
    mark.style.setProperty("stroke", color(i));
    marks.push(mark);
    ring.append(mark);

    const name = ctx.format(slice.row[label], label);
    const items: TooltipItem[] = [
      { label: ctx.label(value), value: amountText(slice.amount), color: color(i) },
      { label: "Share", value: share.format(slice.amount / total) },
      ...(i === crossing ? [{ label: "Majority", value: "Crosses it" }] : []),
    ];
    const hit = svg(doc, "path", { class: "fft-slice-hit", d, "stroke-width": thickness + 13, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${name}: ${items[0]?.value}, ${items[1]?.value}${i === crossing ? ", crosses the majority" : ""}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const other of marks) other.removeAttribute("data-active");
      mark.setAttribute("data-active", "");
      ctx.tooltip.show(hit, name, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    selectable(hit, () => ctx.select(slice.row));
    ring.append(hit);
  });

  if (majority) {
    // A hairline through the ring at twelve o'clock, and the seats a majority takes written above it.
    const reach = thickness / 2 + 4;
    ring.append(svg(doc, "line", { class: "fft-donut-majority", x1: c, x2: c, y1: cy - r - reach, y2: cy - r + reach }));
    const text = svg(doc, "text", { class: "fft-donut-majority-label", x: c, y: 11, "text-anchor": "middle" });
    text.textContent = `Majority ${amountText(needed)}`;
    ring.append(text);
  }

  const center = html(doc, "div", "fft-donut-center");
  const totalEl = html(doc, "div", "fft-donut-total", amountText(total));
  countable(totalEl, total, amountText);
  center.append(totalEl, html(doc, "div", "fft-donut-caption", caption ?? (half && SEATS.test(value) ? "seats" : ctx.label(value))));
  figure.append(ring, center);

  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, slices.map((slice) => slice.row), [label, value], false));
  roving([...ring.querySelectorAll(".fft-slice-hit")]);
  // Inside small multiples the widget draws one legend for every panel.
  wrap.append(figure, ...(ctx.inFacet ? [] : [sliceLegend(ctx, label, slices, total, color, amountText, share)]), hidden);
  ctx.el.append(wrap);
};
