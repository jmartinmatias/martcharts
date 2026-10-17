import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { CandlestickView } from "../../core/views.ts";
import { bands, fitLabels, linearScale, linePath } from "../layout.ts";
import { tickFormatter } from "./chart.ts";
import { buildTable, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const CHAR_WIDTH = 6;
/** Widest a candle body gets: a Fibonacci step, so candles stay thin marks. */
const BODY = 13;

/**
 * Draws the `candlestick` view: per period, a thin wick from low to high and a
 * body from open to close, in the up color when the period closed at or above
 * its open and the down color when below. A legend names the two, so color is
 * never the only key. `average` adds a moving average of the close as a line.
 */
export const renderCandlestick: ViewRenderer<CandlestickView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { x: xField, open, high, low, close, average } = ctx.view;
  const periods = ctx.rows.flatMap((row) => {
    const o = readNumber(row[open]);
    const h = readNumber(row[high]);
    const l = readNumber(row[low]);
    const c = readNumber(row[close]);
    return o === null || h === null || l === null || c === null ? [] : [{ row, o, h, l, c, text: ctx.format(row[xField], xField) }];
  });
  const change = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" });
  const means =
    average && average > 1
      ? periods.map((_, i) => (i + 1 < average ? null : periods.slice(i + 1 - average, i + 1).reduce((sum, p) => sum + p.c, 0) / average))
      : [];

  const wrap = html(doc, "div", "fft-chart");
  const legend = html(doc, "ul", "fft-legend");
  const keys: [string, string, string][] = [
    ["Up", "var(--fft-up)", "rect"],
    ["Down", "var(--fft-down)", "rect"],
    ...(means.length ? ([[`${average}-period average`, "var(--fft-text-secondary)", "line"]] as [string, string, string][]) : []),
  ];
  for (const [name, color, shape] of keys) {
    const swatch = html(doc, "span", "fft-swatch");
    swatch.dataset.shape = shape;
    swatch.style.background = color;
    swatch.setAttribute("aria-hidden", "true");
    const item = html(doc, "li");
    item.append(swatch, name);
    legend.append(item);
  }
  wrap.append(legend);

  const extent = periods.flatMap((p) => [p.l, p.h]);
  const ticks = linearScale(extent, [1, 0], { includeZero: false }).ticks;
  const tickText = tickFormatter(ctx, close, ticks);
  const left = Math.max(28, Math.max(...ticks.map((t) => tickText(t).length)) * CHAR_WIDTH + 12);
  const width = Math.max(ctx.width, left + 144);
  const height = ctx.height;
  const plot = { x: left, y: 8, w: width - left - 13, h: height - 8 - 26 };
  const y = linearScale(extent, [plot.y + plot.h, plot.y], { includeZero: false });
  const slots = bands(periods.length, plot.x, plot.w);
  const bodyWidth = Math.max(1, Math.min(BODY, (slots[0]?.width ?? BODY) * 0.62));

  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Candlestick chart of ${ctx.label(close)} by ${ctx.label(xField)}`);
  for (const tick of y.ticks) {
    const ty = y(tick);
    chart.append(svg(doc, "line", { class: "fft-gridline", x1: plot.x, x2: plot.x + plot.w, y1: ty, y2: ty }));
    const text = svg(doc, "text", { class: "fft-tick fft-tick-y", x: plot.x - 8, y: ty, "text-anchor": "end", "dominant-baseline": "middle" });
    text.textContent = tickText(tick);
    chart.append(text);
  }
  for (const i of fitLabels(periods.map((p, k) => ({ x: slots[k]?.center ?? 0, width: p.text.length * CHAR_WIDTH })), { keepLast: true })) {
    const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: slots[i]?.center ?? 0, y: plot.y + plot.h + 18, "text-anchor": "middle" });
    text.textContent = periods[i]?.text ?? "";
    chart.append(text);
  }

  const candles: SVGGElement[] = [];
  const hits: Element[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const candle of candles) candle.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  periods.forEach((p, i) => {
    const center = slots[i]?.center ?? 0;
    const tone = p.c >= p.o ? "up" : "down";
    const g = svg(doc, "g", { class: "fft-candle", "data-tone": tone, style: `--fft-i: ${i}` });
    const top = y(Math.max(p.o, p.c));
    const body = svg(doc, "rect", { class: "fft-candle-body", x: center - bodyWidth / 2, y: top, width: bodyWidth, height: Math.max(1, y(Math.min(p.o, p.c)) - top), rx: 1 });
    g.append(svg(doc, "line", { class: "fft-candle-wick", x1: center, x2: center, y1: y(p.h), y2: y(p.l) }), body);
    chart.append(g);
    candles.push(g);

    // Candles are read by role, whatever the fields are called.
    const items: TooltipItem[] = [
      { label: "Open", value: ctx.format(p.row[open], open) },
      { label: "High", value: ctx.format(p.row[high], high) },
      { label: "Low", value: ctx.format(p.row[low], low) },
      { label: "Close", value: ctx.format(p.row[close], close), color: `var(--fft-${tone})` },
      ...(p.o !== 0 ? [{ label: "Change", value: change.format((p.c - p.o) / Math.abs(p.o)) }] : []),
    ];
    const slot = slots[i] as { start: number; width: number };
    const hit = svg(doc, "rect", { class: "fft-candle-hit", x: slot.start, y: plot.y, width: slot.width, height: plot.h, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${p.text}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const other of candles) other.removeAttribute("data-active");
      g.setAttribute("data-active", "");
      ctx.tooltip.show(body, p.text, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    const row: Row = p.row;
    selectable(hit, () => ctx.select(row));
    hits.push(hit);
  });
  if (means.length) {
    const points = means.map((m, i) => (m === null ? null : { x: slots[i]?.center ?? 0, y: y(m) }));
    chart.append(svg(doc, "path", { class: "fft-candle-average", d: linePath(points), pathLength: 1 }));
  }
  const overlay = svg(doc, "g");
  overlay.append(...hits);
  chart.append(overlay);
  roving(hits);
  wrap.append(chart);
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, periods.map((p) => p.row), [xField, open, high, low, close], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
