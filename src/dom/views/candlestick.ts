import { timeStep, minusFormat } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { CandlestickView } from "../../core/views.ts";
import { bands, CHAR_WIDTH, fitLabels, linearScale, linePath } from "../layout.ts";
import { tickFormatter } from "./chart.ts";
import { hiddenTableOf, html, legendList, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";
import { wordsFor } from "./words.ts";

/** Widest a candle body gets: a Fibonacci step, so candles stay thin marks. */
const BODY = 13;

/**
 * Draws the `candlestick` view: per period, a thin wick from low to high and a
 * body from open to close, in the up color when the period closed at or above
 * its open (hollow) and the down color when below (filled). A legend names the two, so color is
 * never the only key. `average` adds a moving average of the close as a line.
 */
/** Dates written as days, 2026-08-17. */
const DAY = /^\d{4}-\d{2}-\d{2}/;

/**
 * Labels for trading days, week by week as price charts do: each week's first trading day, every week or every nth
 * week so they fit (`fits` says whether a set does), the year only on the first label and where it changes ("Aug 17,
 * 2026", "Aug 24", "Aug 31"). Undefined when the periods are not dated days.
 */
function dayLabels(days: string[], locale: string | undefined, fits: (labels: [number, string][]) => boolean): [number, string][] | undefined {
  if (!days.length || !days.every((day) => DAY.test(day))) return undefined;
  const date = (day: string) => new Date(`${day.slice(0, 10)}T00:00:00Z`);
  // A new week starts when the weekday (Monday first) does not move forward.
  const weekday = (day: string) => (date(day).getUTCDay() + 6) % 7;
  const starts = days.map((_, i) => i).filter((i) => i === 0 || weekday(days[i] as string) <= weekday(days[i - 1] as string));
  const monthDay = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  const full = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const every = (step: number): [number, string][] => {
    let year = "";
    return starts
      .filter((_, k) => k % step === 0)
      .map((i) => {
        const day = days[i] as string;
        const own = day.slice(0, 4);
        const label = own === year ? monthDay.format(date(day)) : full.format(date(day));
        year = own;
        return [i, label];
      });
  };
  // Every week, or every other week, and so on, until they all fit.
  let step = 1;
  while (step < starts.length && !fits(every(step))) step++;
  return every(step);
}

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
  const change = minusFormat(new Intl.NumberFormat(ctx.spec.locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" }));
  const means =
    average && average > 1
      ? periods.map((_, i) => (i + 1 < average ? null : periods.slice(i + 1 - average, i + 1).reduce((sum, p) => sum + p.c, 0) / average))
      : [];

  const wrap = html(doc, "div", "fft-chart");
  const keys: [string, string, string][] = [
    [wordsFor(ctx).up, "var(--fft-up)", "hollow"],
    [wordsFor(ctx).down, "var(--fft-down)", "rect"],
    // Named in the chart's own time step ("5-day average"), or as an average of the last points.
    ...(means.length ? ([[wordsFor(ctx).movingAverage(average as number, timeStep(xField) ?? "point"), "var(--fft-text-secondary)", "line"]] as [string, string, string][]) : []),
  ];
  // Up is hollow and down filled, as on the candles, so direction reads without color (WCAG 1.4.1). The shared
  // legend has no hollow square, so that one swatch is restyled after; inside a panel there is no legend at all.
  const legend = legendList(ctx, keys.map(([name, color, shape]) => ({ label: name, color, shape: shape === "line" ? ("line" as const) : ("rect" as const) })));
  legend?.querySelectorAll<HTMLElement>(".fft-swatch").forEach((swatch, i) => {
    const [, color, shape] = keys[i] ?? [];
    if (shape !== "hollow" || !color) return;
    swatch.dataset.shape = "hollow";
    swatch.style.removeProperty("background");
    swatch.style.boxShadow = `inset 0 0 0 1.5px ${color}`;
  });
  if (legend) wrap.append(legend);

  // Small multiples pass every panel's lows and highs, so the panels share one price axis.
  const extent = [...periods.flatMap((p) => [p.l, p.h]), ...(ctx.extent ?? [])];
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
  chart.setAttribute("aria-label", wordsFor(ctx).aria.candlestick(ctx.label(close), ctx.label(xField)));
  for (const tick of y.ticks) {
    const ty = y(tick);
    chart.append(svg(doc, "line", { class: "fft-gridline", x1: plot.x, x2: plot.x + plot.w, y1: ty, y2: ty }));
    const text = svg(doc, "text", { class: "fft-tick fft-tick-y", x: plot.x - 8, y: ty, "text-anchor": "end", "dominant-baseline": "middle" });
    text.textContent = tickText(tick);
    chart.append(text);
  }
  const fits = (labels: [number, string][]) => fitLabels(labels.map(([i, label]) => ({ x: slots[i]?.center ?? 0, width: label.length * CHAR_WIDTH }))).length === labels.length;
  for (const [i, label] of dayLabels(periods.map((p) => String(p.row[xField] ?? "")), ctx.spec.locale, fits) ?? []) {
    const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: slots[i]?.center ?? 0, y: plot.y + plot.h + 18, "text-anchor": "middle" });
    text.textContent = label;
    chart.append(text);
  }
  if (!DAY.test(String(periods[0]?.row[xField] ?? ""))) {
    for (const i of fitLabels(periods.map((p, k) => ({ x: slots[k]?.center ?? 0, width: p.text.length * CHAR_WIDTH })), { keepLast: true })) {
      const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: slots[i]?.center ?? 0, y: plot.y + plot.h + 18, "text-anchor": "middle" });
      text.textContent = periods[i]?.text ?? "";
      chart.append(text);
    }
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
      { label: wordsFor(ctx).open, value: ctx.format(p.row[open], open) },
      { label: wordsFor(ctx).high, value: ctx.format(p.row[high], high) },
      { label: wordsFor(ctx).low, value: ctx.format(p.row[low], low) },
      { label: wordsFor(ctx).close, value: ctx.format(p.row[close], close), color: `var(--fft-${tone})` },
      ...(p.o !== 0 ? [{ label: wordsFor(ctx).change, value: change.format((p.c - p.o) / Math.abs(p.o)) }] : []),
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
  if (!periods.length) wrap.append(html(doc, "p", "fft-empty-note", wordsFor(ctx).noPricePeriod));
  wrap.append(hiddenTableOf(ctx, periods.map((p) => p.row), [xField, open, high, low, close]));
  ctx.el.append(wrap);
};
