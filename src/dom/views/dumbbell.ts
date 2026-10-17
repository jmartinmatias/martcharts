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

/**
 * Draws the `dumbbell` view: per row, a muted dot for the before value and an
 * accent dot for the after value, joined by a hairline, all on one shared axis
 * so the direction and size of each change read at a glance. Two different
 * measures (revenue and cost) are not a before and an after: each dot then takes
 * a series color, and the tooltip gives the gap instead of a change.
 */
export const renderDumbbell: ViewRenderer<DumbbellView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, from, to } = ctx.view;
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

  const wrap = html(doc, "div", "fft-chart");
  const legend = html(doc, "ul", "fft-legend");
  for (const [field, cls] of [
    [from, "fft-db-key-from"],
    [to, "fft-db-key-to"],
  ] as const) {
    const swatch = html(doc, "span", `fft-swatch ${cls}`);
    swatch.dataset.shape = "dot";
    swatch.setAttribute("aria-hidden", "true");
    const color = cls === "fft-db-key-to" ? toColor : fromColor;
    if (color) swatch.style.background = color;
    const item = html(doc, "li");
    item.append(swatch, ctx.label(field));
    legend.append(item);
  }
  wrap.append(legend);

  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Dumbbell chart of ${ctx.label(from)} and ${ctx.label(to)} by ${ctx.label(label)}`);
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
    const text = svg(doc, "text", { class: "fft-db-label", x: margin.left - 13, y: cy, "text-anchor": "end", "dominant-baseline": "middle" });
    text.textContent = name;
    chart.append(text);
    chart.append(svg(doc, "line", { class: "fft-db-line", x1: x(a), x2: x(b), y1: cy, y2: cy }));
    const before = svg(doc, "circle", { class: "fft-db-from", cx: x(a), cy, r: 5 });
    if (fromColor) before.style.setProperty("fill", fromColor);
    chart.append(before);
    const after = svg(doc, "circle", { class: "fft-db-to", cx: x(b), cy, r: 5 });
    after.style.setProperty("fill", toColor);
    chart.append(after);
    const items: TooltipItem[] = [
      { label: ctx.label(from), value: ctx.format(row[from], from), ...(fromColor ? { color: fromColor } : {}) },
      { label: ctx.label(to), value: ctx.format(row[to], to), color: toColor },
      ...(periods ? (a !== 0 ? [{ label: "Change", value: change.format((b - a) / Math.abs(a)) }] : []) : [{ label: "Gap", value: ctx.format(Math.abs(a - b), to) }]),
    ];
    const hit = svg(doc, "rect", { class: "fft-db-hit", x: 0, y: cy - ROW / 2, width, height: ROW, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${name}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const show = () => ctx.tooltip.show(after, name, items);
    hit.addEventListener("pointerenter", show);
    hit.addEventListener("focus", show);
    hit.addEventListener("pointerleave", () => ctx.tooltip.hide());
    hit.addEventListener("blur", () => ctx.tooltip.hide());
    selectable(hit, () => ctx.select(row));
    chart.append(hit);
  });
  roving([...chart.querySelectorAll(".fft-db-hit")]);
  wrap.append(chart);
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, rows, [label, from, to], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
