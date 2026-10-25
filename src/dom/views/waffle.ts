import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { WaffleView } from "../../core/views.ts";
import { allocate } from "../layout.ts";
import { evenFormat, figureSize, hiddenTableOf, html, selectable, shareFormat, svg } from "./shared.ts";
import { categoryColor, emphasis, WORDS } from "./words.ts";
import { roving } from "./focus.ts";

const SIDE = 10;
const GAP = 3;

/**
 * Draws the `waffle` view: a 10 by 10 grid where each square is one percent,
 * shared out by largest remainder so the squares always add up to 100, filled
 * category by category in reading order. Sized like the donut: 144px, or 233px
 * when there is room. Hovering a square or focusing a legend entry lights up
 * that category.
 */
export const renderWaffle: ViewRenderer<WaffleView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, value } = ctx.view;
  const parts: { row: Row; amount: number }[] = [];
  for (const row of ctx.rows) {
    const amount = readNumber(row[value]);
    if (amount !== null && amount > 0) parts.push({ row, amount });
  }
  const sum = parts.reduce((total, part) => total + part.amount, 0);
  const whole = Math.max(sum, ctx.view.total ?? 0);
  const counts = allocate([...parts.map((p) => p.amount), whole - sum], SIDE * SIDE);
  const share = shareFormat(ctx.spec.locale);
  const lit = emphasis(ctx);
  // The legend's figures in one precision, so they line up.
  const even = evenFormat(ctx, value, parts.map((part) => part.amount), { type: "number", compact: true });
  const amountText = (part: { row: Row; amount: number }) => even(part.amount);

  const size = figureSize(ctx.width);
  const cell = (size - GAP * (SIDE - 1)) / SIDE;
  const wrap = html(doc, "div", "fft-waffle");
  const chart = svg(doc, "svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Waffle chart of ${ctx.label(value)} by ${ctx.label(label)}, each square one percent`);
  const square = (k: number, cls: string) =>
    svg(doc, "rect", { class: cls, x: (k % SIDE) * (cell + GAP), y: Math.floor(k / SIDE) * (cell + GAP), width: cell, height: cell, rx: 2, style: `--fft-k: ${k}` });

  const groups: SVGGElement[] = [];
  const firsts: SVGRectElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const group of groups) group.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  const legend = html(doc, "ul", "fft-waffle-legend");
  const entries: HTMLElement[] = [];
  let k = 0;
  parts.forEach((part, i) => {
    const name = ctx.format(part.row[label], label);
    const group = svg(doc, "g", { class: "fft-waffle-group", "data-label": String(part.row[label]), style: `--fft-i: ${i}` });
    const color = lit.paint(part.row[label], categoryColor(ctx, part.row[label], i));
    const items: TooltipItem[] = [
      { label: ctx.label(value), value: amountText(part), color },
      { label: WORDS.share, value: share.format(part.amount / whole) },
    ];
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const other of groups) other.removeAttribute("data-active");
      group.setAttribute("data-active", "");
      const anchor = firsts[i];
      if (anchor) ctx.tooltip.show(anchor, name, items);
    };
    for (let n = 0; n < (counts[i] ?? 0); n++, k++) {
      const rect = square(k, "fft-waffle-cell");
      rect.setAttribute("data-label", String(part.row[label]));
      rect.style.setProperty("fill", color);
      rect.addEventListener("pointerenter", activate);
      if (n === 0) firsts[i] = rect;
      group.append(rect);
    }
    chart.append(group);
    groups.push(group);

    const swatch = html(doc, "span", "fft-swatch");
    swatch.style.background = color;
    swatch.setAttribute("aria-hidden", "true");
    const entry = html(doc, "li");
    entry.tabIndex = 0;
    entry.setAttribute("aria-label", `${name}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    entry.append(swatch, html(doc, "span", "fft-waffle-name", name), html(doc, "span", "fft-waffle-value", amountText(part)), html(doc, "span", "fft-waffle-share", share.format(part.amount / whole)));
    entry.addEventListener("pointerenter", activate);
    entry.addEventListener("pointerleave", deactivate);
    entry.addEventListener("focus", activate);
    entry.addEventListener("blur", deactivate);
    const row = part.row;
    selectable(entry, () => ctx.select(row));
    legend.append(entry);
    entries.push(entry);
  });
  for (; k < SIDE * SIDE; k++) chart.append(square(k, "fft-waffle-empty"));
  chart.addEventListener("pointerleave", deactivate);
  roving(entries);

  const hidden = hiddenTableOf(ctx, parts.map((p) => p.row), [label, value]);
  wrap.append(chart, legend, hidden);
  ctx.el.append(wrap);
};
