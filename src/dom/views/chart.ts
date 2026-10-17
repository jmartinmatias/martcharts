/**
 * The `bar` and `line` views. They share axes, gridlines, the legend, the
 * hover and focus layer, and the hidden data table, and differ only in marks.
 *
 * @module
 */
import { formatValue } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import { getPreset } from "../../core/presets.ts";
import { referenceValues, resolveReferences, type ResolvedReference } from "../../core/reference.ts";
import { drawReferences, type LabelObstacles } from "./reference.ts";
import type { FormatSpec } from "../../core/types.ts";
import type { TooltipItem, ViewContext, ViewRenderer } from "../../core/view-context.ts";
import { isForecast } from "../../core/views.ts";
import type { AreaView, BarView, LineView } from "../../core/views.ts";
import { bandPath, bands, barPath, curveArea, curveLine, fitLabels, layoutBars, layoutStacked, LINE_HEIGHT, linearScale, linePath, smoothBands, spread, wrapLabels } from "../layout.ts";
import type { LabelBox } from "../layout.ts";
import { buildTable, categoryLabel, fieldList, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

type Kind = "bar" | "line" | "area";

const KIND_NAMES: Record<Kind, string> = { bar: "Bar", line: "Line", area: "Area" };
/** Pixels of band a stream label needs: its 11px text and a little air. */
const STREAM_LABEL_ROOM = 15;

/** Gradient ids must be unique in the page, so every chart draw takes a fresh one. */
let gradients = 0;

/** Rough width of one character of 11px tick text, for spacing labels without measuring. */
const CHAR_WIDTH = 6;

/**
 * Tick labels: round and shortened (20K, $1.2M), in the first series' format
 * family. Pass the ticks to label: decimals are added (up to 3) only until
 * every label is distinct, so 1,050 and 1,100 never both read "1.1K".
 */
export function tickFormatter(ctx: ViewContext<{ type: string }>, field: string | undefined, ticks: number[] = []): (value: number) => string {
  const raw: FormatSpec | undefined = field ? ctx.spec.fields?.[field]?.format : undefined;
  const format = typeof raw === "string" ? { type: raw } : raw;
  if (!format || format.type === "number" || format.type === "currency") {
    const style: Intl.NumberFormatOptions =
      format?.type === "currency" ? { style: "currency", currency: typeof format.currency === "string" ? format.currency : "USD" } : {};
    // The fewest decimals that write every tick exactly (1.25M, never a rounded 1.3M), and so tell them apart.
    const compact = (digits: number) => new Intl.NumberFormat(ctx.spec.locale, { ...style, notation: "compact", maximumFractionDigits: digits });
    const precise = ticks.map((tick) => compact(3).format(tick));
    let formatter = compact(3);
    for (const digits of [1, 2, 3]) {
      formatter = compact(digits);
      const labels = ticks.map((tick) => formatter.format(tick));
      if (new Set(labels).size === labels.length && labels.every((label, i) => label === precise[i])) break;
    }
    return (value) => formatter.format(value);
  }
  return (value) => formatValue(value, format, ctx.spec.locale);
}

/** Grey for marks that step back when `highlight` names something else. */
export const DEEMPHASIS = "var(--fft-deemphasis)";

/** The `highlight` option as a list of strings. */
export function highlights(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  return (Array.isArray(value) ? value : [value]).map(String);
}

/** Field names that hold a target, plan or budget. */
const TARGET = /target|plan|goal|budget|quota/i;
/** A bar's light fill when it falls short of its target: a third of its color on the card. */
const missFill = (color: string) => `color-mix(in srgb, ${color} 34%, var(--fft-surface))`;
/** Its outline, the miss's only edge: leaning toward the text color keeps it at 3:1 on any page, light or dark. */
const missEdge = (color: string) => `color-mix(in srgb, ${color} 85%, var(--fft-text))`;

/** A legend key: a series, a line, or a mark state such as a bar that missed its target. */
interface LegendEntry {
  field: string;
  color: string;
  shape: "rect" | "line" | "dot";
  /** The words, when they are not the field's label ("Below target"). */
  label?: string;
  /** A mark state the swatch mirrors, as the marks do: `miss` is a light fill outlined in the color. */
  tone?: "miss";
}

/** A legend whose keys mirror their marks: a square for bars, a dot for lollipops, a short line for lines. */
function legend(ctx: ViewContext<{ type: string }>, entries: LegendEntry[]): HTMLElement {
  const doc = ctx.el.ownerDocument;
  const list = html(doc, "ul", "fft-legend");
  for (const entry of entries) {
    const swatch = html(doc, "span", "fft-swatch");
    swatch.dataset.shape = entry.shape;
    if (entry.tone === "miss") {
      swatch.dataset.tone = "miss";
      swatch.style.background = missFill(entry.color);
      swatch.style.boxShadow = `inset 0 0 0 1px ${missEdge(entry.color)}`;
    } else swatch.style.background = entry.color;
    swatch.setAttribute("aria-hidden", "true");
    const item = html(doc, "li");
    item.append(swatch, entry.label ?? ctx.label(entry.field));
    list.append(item);
  }
  return list;
}

function renderCartesian(ctx: ViewContext<BarView | LineView | AreaView>, kind: Kind): void {
  // Bars and areas encode amount by size, so their axis must start at zero.
  const fromZero = kind !== "line";
  const doc = ctx.el.ownerDocument;
  const { rows, view } = ctx;
  const series = fieldList(view.y);
  // Emphasis: bars highlight categories, lines and areas highlight series.
  const picked = highlights(view.highlight);
  const categoryOn = (i: number) => kind !== "bar" || picked.length === 0 || picked.includes(String(rows[i]?.[view.x]));
  const seriesOn = (s: number) => kind === "bar" || picked.length === 0 || picked.includes(series[s] as string);
  const seriesColor = (s: number) => (seriesOn(s) ? ctx.color(s) : DEEMPHASIS);
  // A muted category of grouped bars keeps a hint of each series' hue, so its two greys still say which is which.
  const mutedColor = (s: number) => (series.length > 1 ? `color-mix(in srgb, ${ctx.color(s)} 30%, ${DEEMPHASIS})` : DEEMPHASIS);
  const raw = series.map((field) => rows.map((row) => readNumber(row[field])));
  // Combo: extra series drawn as lines over the bars, on the same axis (never a second one).
  const overlayFields = kind === "bar" ? fieldList((view as BarView).lines) : [];
  const overlayValues = overlayFields.map((field) => rows.map((row) => readNumber(row[field])));
  const overlayColor = (k: number) => ctx.color(series.length + k);
  // A single series under one target, a lines field or a dashed reference line: a bar on the wrong side of it is a miss.
  // Below it is the wrong side, or above it when lower is better (goodWhen down, as for wait times).
  const goalField = kind === "bar" && series.length === 1 && overlayFields.length === 1 && TARGET.test(overlayFields[0] as string) ? overlayFields[0] : undefined;
  const goalLine =
    kind === "bar" && series.length === 1 && !goalField
      ? resolveReferences(view, rows).find((ref): ref is Extract<ResolvedReference, { kind: "line" }> => ref.kind === "line" && TARGET.test(String(ref.label ?? "")))
      : undefined;
  const lowerIsBetter = kind === "bar" && (view as BarView).goodWhen === "down";
  const missed = (i: number) => {
    const [amount, goal] = [raw[0]?.[i], goalField ? overlayValues[0]?.[i] : goalLine?.value];
    return amount !== null && amount !== undefined && goal !== null && goal !== undefined && (lowerIsBetter ? amount > goal : amount < goal);
  };
  // The miss key's words: "Below target", "Over 1 hour target".
  const goalName = goalField ? ctx.label(goalField).toLowerCase() : String(goalLine?.label ?? "").replace(/^[A-Z][a-z]*\b/, (word) => word.toLowerCase());
  const stacked = kind === "bar" ? (view as BarView).stacked : kind === "area" ? (view as AreaView).stacked : undefined;
  const percent = stacked === "percent";
  // Streams center each column on the middle line: the stack starts half its total below zero.
  const stream = kind === "area" && stacked === "stream";
  // Forecast fans (lines and unstacked areas): forecast rows draw dashed from the last actual on, over a shaded low to high band.
  const fanView = kind === "line" || (kind === "area" && !stacked) ? (view as LineView | AreaView) : undefined;
  // The line's texture: straight, smooth or stepped. Stacked bands keep straight edges, so their lines match them.
  const curve = fanView?.curve ?? "linear";
  const forecastField = fanView?.forecast;
  const forecastAt = forecastField ? rows.findIndex((row) => isForecast(row[forecastField])) : -1;
  const band = fanView?.band;
  const bandLow = band ? rows.map((row) => readNumber(row[band.low])) : [];
  const bandHigh = band ? rows.map((row) => readNumber(row[band.high])) : [];
  const banded = rows.map((_, i) => i).filter((i) => bandLow[i] != null && bandHigh[i] != null);
  const bandEnd = banded.at(-1) ?? -1;
  const bandEnds = bandEnd >= 0 && bandLow[bandEnd] !== bandHigh[bandEnd] ? [bandHigh[bandEnd] as number, bandLow[bandEnd] as number] : [];
  // Percent stacks draw each value as its share of the column's total.
  const columnTotal = (i: number) => raw.reduce((sum, seriesValues) => sum + Math.abs(seriesValues[i] ?? 0), 0);
  const values = percent ? raw.map((seriesValues) => seriesValues.map((v, i) => (v === null || columnTotal(i) === 0 ? null : v / columnTotal(i)))) : raw;
  const positiveTotal = (i: number) => values.reduce((sum, seriesValues) => sum + Math.max(0, seriesValues[i] ?? 0), 0);
  const floor = (i: number) => (stream ? -positiveTotal(i) / 2 : 0);
  // Stacked axes span the column sums, upward and downward; other charts span the values.
  // Streams get a little air either side, for the curves' swing between points.
  const present = stream
    ? rows.flatMap((_, i) => [positiveTotal(i) * 0.52, -positiveTotal(i) * 0.52])
    : stacked
    ? rows.flatMap((_, i) => {
        const column = values.map((seriesValues) => seriesValues[i] ?? 0);
        return [column.filter((v) => v > 0).reduce((a, b) => a + b, 0), column.filter((v) => v < 0).reduce((a, b) => a + b, 0)];
      })
    : values.flat().filter((v): v is number => v !== null);
  present.push(...overlayValues.flat().filter((v): v is number => v !== null));
  present.push(...banded.flatMap((i) => [bandLow[i] as number, bandHigh[i] as number]));
  // Small multiples pass a shared extent, so every panel draws on the same scale.
  if (ctx.extent) present.push(...ctx.extent);
  // Reference lines and bands stretch the axis so they are always in view.
  const references = resolveReferences(view, rows);
  present.push(...referenceValues(references));
  const xLabels = rows.map((row) => ctx.format(row[view.x], view.x));
  const labelTicks = linearScale(present, [1, 0], { includeZero: fromZero }).ticks;
  // Stacked areas: each series' top edge is the running total of the series up to it.
  const tops =
    stacked && kind === "area" ? values.map((_, s) => rows.map((_, i) => values.slice(0, s + 1).reduce((sum, seriesValues) => sum + Math.max(0, seriesValues[i] ?? 0), floor(i)))) : null;
  const tickText = percent ? (v: number) => formatValue(v, "percent", ctx.spec.locale) : tickFormatter(ctx, series[0], labelTicks);

  // End labels: each line's last value at its end, for up to 4 series (only the highlighted ones when set).
  const endLabels =
    kind !== "bar" && !stream && (view as LineView).endLabels !== false && series.length <= 4
      ? series.map((field, s) => {
          if (!seriesOn(s)) return null;
          const index = raw[s]?.findLastIndex((v) => v !== null) ?? -1;
          return index < 0 ? null : { s, index, text: ctx.format(rows[index]?.[field], field) };
        })
      : [];
  const bandEndText = bandEnds.map((v) => ctx.format(v, series[0]));
  const endRoom = Math.max(0, ...[...endLabels.map((label) => label?.text), ...bandEndText].map((text) => (text ? text.length * CHAR_WIDTH + 13 : 0)));

  const wrap = html(doc, "div", "fft-chart");
  const markShape: LegendEntry["shape"] = kind !== "bar" ? "line" : (view as BarView).mark === "lollipop" ? "dot" : "rect";
  const legendEntries = [
    ...series.map((field, s) => ({ field, color: seriesColor(s), shape: markShape })),
    ...overlayFields.map((field, k) => ({ field, color: overlayColor(k), shape: "line" as const })),
    ...(rows.some((_, i) => missed(i)) ? [{ field: series[0] as string, color: seriesColor(0), shape: markShape, label: `${lowerIsBetter ? "Over" : "Below"} ${goalName}`, tone: "miss" as const }] : []),
  ];
  if (legendEntries.length > 1 && !ctx.inFacet) wrap.append(legend(ctx, legendEntries));

  // Margins: room for the widest tick label on the left and category labels below.
  const left = stream ? 13 : Math.max(28, Math.max(...labelTicks.map((t) => tickText(t).length)) * CHAR_WIDTH + 12);
  const margin = { top: 8, right: kind === "bar" ? 5 : Math.max(13, endRoom), bottom: 26, left };
  const width = Math.max(ctx.width, left + margin.right + 40);
  // A few bars whose names would be thinned out wrap them onto short lines instead, every name read under its bar.
  const widest = Math.max(...xLabels.map((label) => label.length)) * CHAR_WIDTH + 8;
  const room = width - margin.left - margin.right;
  const slotRoom = room / rows.length - 4;
  const overflow = kind === "bar" && rows.length <= 12 && rows.length * widest > room;
  const dated = rows.every((row) => /^\d{4}-\d{2}/.test(String(row[view.x])));
  let wrapped = overflow ? wrapLabels(xLabels, slotRoom) : undefined;
  // Dates name their year once, then again only where it changes: "Oct 2025", "Nov", "Dec", "Jan 2026".
  const yearOnce = (lines: string[][]) => lines.map((own, i) => (i > 0 && own.length > 1 && own.at(-1) === lines[i - 1]?.at(-1) ? own.slice(0, -1) : own));
  if (wrapped && dated) wrapped = yearOnce(wrapped);
  // Months too tight for their year still all show: the month under every bar, and the year, where it changes, may
  // spill into the empty room beside it, as long as no neighbour also carries one.
  if (!wrapped && overflow && dated) {
    const split = yearOnce(xLabels.map((label) => (/\s\S+$/.test(label) ? [label.replace(/\s\S+$/, ""), label.slice(label.lastIndexOf(" ") + 1)] : [label])));
    const fits = split.every((lines, i) => (lines[0] ?? "").length * CHAR_WIDTH <= slotRoom && (lines.length < 2 || ((lines[1] ?? "").length * CHAR_WIDTH <= slotRoom * 2 && (split[i - 1]?.length ?? 1) < 2 && (split[i + 1]?.length ?? 1) < 2)));
    if (fits) wrapped = split;
  }
  if (wrapped) margin.bottom += (Math.max(...wrapped.map((lines) => lines.length)) - 1) * LINE_HEIGHT;
  const height = ctx.height;
  const plot = { x: margin.left, y: margin.top, w: width - margin.left - margin.right, h: height - margin.top - margin.bottom };
  const y = linearScale(present, [plot.y + plot.h, plot.y], { includeZero: fromZero, nice: !stream });
  // Bars sit in bands; lines and areas run edge to edge, one point per row, as time series do.
  const slots = kind === "bar" ? bands(rows.length, plot.x, plot.w) : spread(rows.length, plot.x, plot.w);

  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `${stream ? "Streamgraph" : `${KIND_NAMES[kind]} chart`} of ${series.map(ctx.label).join(", ")} by ${ctx.label(view.x)}`);

  // Gridlines and y ticks: hairlines, recessive. A stream has none: only thickness means anything there.
  const axis = svg(doc, "g");
  for (const tick of stream ? [] : y.ticks) {
    const ty = y(tick);
    const isBase = fromZero ? tick === 0 : tick === y.ticks[0];
    axis.append(svg(doc, "line", { class: isBase ? "fft-baseline" : "fft-gridline", x1: plot.x, x2: plot.x + plot.w, y1: ty, y2: ty }));
    const label = svg(doc, "text", { class: "fft-tick fft-tick-y", x: plot.x - 8, y: ty, "text-anchor": "end", "dominant-baseline": "middle" });
    label.textContent = tickText(tick);
    axis.append(label);
  }
  // Category labels, wrapped as above, or else thinned to every nth, then any that would still come within 8px of the
  // last one drawn are skipped.
  const every = wrapped ? 1 : Math.max(1, Math.ceil((rows.length * widest) / plot.w));
  // Edge-to-edge series align their first and last labels inward, so they never spill out of the chart.
  const anchorOf = (i: number) => (kind === "bar" || rows.length < 2 ? "middle" : i === 0 ? "start" : i === rows.length - 1 ? "end" : "middle");
  // A thinned axis still names its last category or period, giving up the label before it if the two would touch.
  const last = rows.length - 1;
  const candidates = slots.map((_, i) => i).filter((i) => i % every === 0 || i === last);
  const boxes: LabelBox[] = candidates.map((i) => ({ x: slots[i]?.center ?? 0, width: (xLabels[i] ?? "").length * CHAR_WIDTH, anchor: anchorOf(i) }));
  for (const k of wrapped ? candidates.map((_, k) => k) : fitLabels(boxes, { keepLast: true })) {
    const i = candidates[k] as number;
    axis.append(categoryLabel(doc, { class: "fft-tick fft-tick-x", x: slots[i]?.center ?? 0, y: plot.y + plot.h + 18, "text-anchor": anchorOf(i) }, xLabels[i] ?? "", wrapped?.[i], LINE_HEIGHT));
  }
  chart.append(axis);
  const refsBelow = svg(doc, "g");
  const refsAbove = svg(doc, "g");
  chart.append(refsBelow);
  // What the reference labels keep clear of, collected as the marks are laid out.
  const obstacles: Required<LabelObstacles> = { lines: [], boxes: [] };

  // Marks.
  const markGroups: SVGGElement[] = slots.map((_, i) => svg(doc, "g", { class: "fft-marks", "data-index": i, style: `--fft-i: ${i}` }));
  const overlay = svg(doc, "g");
  const crosshair = svg(doc, "line", { class: "fft-crosshair", y1: plot.y, y2: plot.y + plot.h, x1: 0, x2: 0, hidden: "" });
  if (kind === "bar") {
    const marks = getPreset(ctx.spec.style?.preset)?.marks ?? {};
    const radius = marks.barRadius === "full" ? Number.POSITIVE_INFINITY : (marks.barRadius ?? 4);
    const lollipop = (view as BarView).mark === "lollipop";
    for (const rect of stacked ? layoutStacked(values, slots, y) : layoutBars(values, slots, y)) {
      if (lollipop) {
        // A stem from the baseline and a dot at the value, centered where the bar would stand.
        const cx = rect.x + rect.width / 2;
        const base = rect.negative ? rect.y : rect.y + rect.height;
        const tip = rect.negative ? rect.y + rect.height : rect.y;
        const color = categoryOn(rect.index) ? ctx.color(rect.series) : mutedColor(rect.series);
        const stem = svg(doc, "line", { class: "fft-lolli-stem", x1: cx, x2: cx, y1: base, y2: tip });
        stem.style.setProperty("stroke", color);
        const dot = svg(doc, "circle", { class: "fft-lolli-dot", cx, cy: tip, r: 5 });
        if (missed(rect.index)) {
          // On the wrong side of its target: a hollow dot, the light fill and outline a missed bar has.
          dot.dataset.tone = "miss";
          dot.style.setProperty("fill", missFill(color));
          dot.style.setProperty("stroke", missEdge(color));
        } else dot.style.setProperty("fill", color);
        obstacles.boxes.push({ ...rect, x: cx - 5, width: 10 });
        markGroups[rect.index]?.append(stem, dot);
        continue;
      }
      if (marks.barTrack) {
        const track = { ...rect, y: plot.y, height: plot.h, negative: false };
        markGroups[rect.index]?.append(svg(doc, "path", { class: "fft-bar-track", d: barPath(track, radius) }));
      }
      obstacles.boxes.push(rect);
      const bar = svg(doc, "path", { class: "fft-bar", d: barPath(rect, radius) });
      const fill = categoryOn(rect.index) ? ctx.color(rect.series) : mutedColor(rect.series);
      if (missed(rect.index)) {
        // Short of its target: a light fill outlined in the bar's own color, so the miss reads by shape too.
        bar.dataset.tone = "miss";
        bar.style.setProperty("fill", missFill(fill));
        bar.style.setProperty("stroke", missEdge(fill));
      } else bar.style.setProperty("fill", fill);
      if (rect.negative) bar.setAttribute("data-negative", "");
      markGroups[rect.index]?.append(bar);
    }
    chart.append(...markGroups);
    overlayValues.forEach((lineValues, k) => {
      const points = lineValues.map((v, i) => (v === null ? null : { x: slots[i]?.center ?? 0, y: y(v) }));
      obstacles.lines.push(points);
      const path = svg(doc, "path", { class: "fft-line", d: linePath(points), pathLength: 1 });
      path.style.setProperty("stroke", overlayColor(k));
      path.dataset.series = overlayFields[k] ?? "";
      chart.append(path);
      for (const point of points) {
        if (!point) continue;
        const dot = svg(doc, "circle", { class: "fft-dot", cx: point.x, cy: point.y, r: 4 });
        dot.style.setProperty("fill", overlayColor(k));
        chart.append(dot);
      }
    });
  } else {
    // The forecast zone: a faint wash from the last actual to the end, under a small Forecast label.
    if (forecastAt >= 0) {
      const from = forecastAt > 0 ? (slots[forecastAt - 1]?.center ?? plot.x) : plot.x;
      chart.append(svg(doc, "rect", { class: "fft-forecast-zone", x: from, y: plot.y, width: Math.max(0, plot.x + plot.w - from), height: plot.h }));
      if (forecastAt > 0) chart.append(svg(doc, "line", { class: "fft-forecast-divider", x1: from, x2: from, y1: plot.y, y2: plot.y + plot.h }));
      // The notes keep inside the zone: one that does not fit gives way (the tooltip still names the range), except
      // Forecast itself, which then aligns to the zone's end.
      const room = plot.x + plot.w - from - 13;
      const notes = ["Forecast", ...(band?.label ? [`Shaded: ${band.label}`] : [])];
      notes.forEach((note, k) => {
        // Forecast is set in spaced capitals, a little wider per character than the note under it.
        const fits = note.length * (k === 0 ? 7.5 : CHAR_WIDTH) <= room;
        if (!fits && k > 0) return;
        const text = svg(doc, "text", {
          class: k === 0 ? "fft-forecast-label" : "fft-forecast-label fft-forecast-note",
          x: fits ? from + 8 : plot.x + plot.w - 5,
          y: plot.y + 13 + k * 14,
          "text-anchor": fits ? "start" : "end",
        });
        text.textContent = note;
        chart.append(text);
      });
    }
    // Grey series first, so highlighted ones draw on top. Washes sit behind every line.
    const washes = svg(doc, "g");
    chart.append(washes);
    if (banded.length) {
      const at = (list: (number | null)[]) => banded.map((i) => ({ x: slots[i]?.center ?? 0, y: y(list[i] as number) }));
      const shade = svg(doc, "path", { class: "fft-band", d: bandPath(at(bandHigh), at(bandLow)) });
      shade.style.setProperty("fill", seriesColor(0));
      washes.append(shade);
    }
    const order = series.map((_, s) => s).sort((a, b) => Number(seriesOn(a)) - Number(seriesOn(b)));
    const edge = (s: number) => rows.map((_, i) => ({ x: slots[i]?.center ?? 0, y: y(tops?.[s]?.[i] ?? 0) }));
    if (stream) drawStream(chart, washes, { series, label: ctx.label, slots, plot, edge, base: rows.map((_, i) => ({ x: slots[i]?.center ?? 0, y: y(floor(i)) })), color: seriesColor });
    (stream ? [] : order).forEach((s) => {
      const seriesValues = values[s] ?? [];
      const points = tops ? edge(s) : seriesValues.map((v, i) => (v === null ? null : { x: slots[i]?.center ?? 0, y: y(v) }));
      obstacles.lines.push(points);
      if (kind === "area" && tops) {
        const lower = s === 0 ? rows.map((_, i) => ({ x: slots[i]?.center ?? 0, y: y(0) })) : edge(s - 1);
        const band = svg(doc, "path", { class: "fft-area", d: bandPath(edge(s), lower), "data-stacked": "" });
        band.style.setProperty("fill", seriesColor(s));
        washes.append(band);
      } else if (kind === "area") {
        // With a forecast, the wash splits at the last actual: the forecast's part is fainter, a value not yet real.
        const floorY = y(Math.max(y.domain[0], Math.min(0, y.domain[1])));
        const wash = svg(doc, "path", { class: "fft-area", d: curveArea(forecastAt > 0 ? points.map((p, i) => (i < forecastAt ? p : null)) : points, floorY, curve) });
        if (forecastAt === 0) wash.setAttribute("data-forecast", "");
        if (getPreset(ctx.spec.style?.preset)?.marks?.areaGradient) {
          const id = `fft-gradient-${++gradients}`;
          const gradient = svg(doc, "linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 });
          for (const [offset, opacity] of [["0", "0.34"], ["1", "0"]]) {
            const stop = svg(doc, "stop", { offset: offset as string, "stop-opacity": opacity as string });
            stop.style.setProperty("stop-color", seriesColor(s));
            gradient.append(stop);
          }
          const defs = svg(doc, "defs");
          defs.append(gradient);
          chart.append(defs);
          wash.setAttribute("fill", `url(#${id})`);
          wash.setAttribute("data-gradient", "");
        } else {
          wash.style.setProperty("fill", seriesColor(s));
        }
        washes.append(wash);
        if (forecastAt > 0) {
          const ahead = svg(doc, "path", { class: "fft-area", d: curveArea(points.map((p, i) => (i >= forecastAt - 1 ? p : null)), floorY, curve), "data-forecast": "" });
          const gradient = wash.getAttribute("fill");
          if (gradient) {
            ahead.setAttribute("fill", gradient);
            ahead.setAttribute("data-gradient", "");
          } else {
            ahead.style.setProperty("fill", seriesColor(s));
          }
          washes.append(ahead);
        }
      }
      // Actuals solid; forecasts dashed, picking up from the last actual so the two meet.
      const solid = forecastAt < 0 ? points : points.map((p, i) => (i < forecastAt ? p : null));
      const ahead = forecastAt < 0 ? [] : points.map((p, i) => (i >= forecastAt - 1 ? p : null));
      if (solid.some(Boolean)) {
        const line = svg(doc, "path", { class: "fft-line", d: curveLine(solid, curve), pathLength: 1 });
        line.style.setProperty("stroke", seriesColor(s));
        line.dataset.series = series[s] ?? "";
        chart.append(line);
      }
      if (ahead.some(Boolean)) {
        const line = svg(doc, "path", { class: "fft-line", d: curveLine(ahead, curve), "data-forecast": "" });
        line.style.setProperty("stroke", seriesColor(s));
        line.dataset.series = series[s] ?? "";
        chart.append(line);
      }
      const last = points.findLast((p) => p !== null);
      if (last) {
        const dot = svg(doc, "circle", { class: "fft-dot fft-end", cx: last.x, cy: last.y, r: 4 });
        // A forecast ends on a hollow dot: a value not yet real.
        if (ahead.some(Boolean)) {
          dot.setAttribute("data-forecast", "");
          dot.style.setProperty("fill", "var(--fft-ring, var(--fft-surface))");
          dot.style.setProperty("stroke", seriesColor(s));
        } else {
          dot.style.setProperty("fill", seriesColor(s));
        }
        chart.append(dot);
      }
    });
    // End labels only when no two would collide; otherwise the legend and tooltip carry the values.
    const placed = endLabels.flatMap((label) => {
      const v = label ? values[label.s]?.[label.index] : null;
      const at = label && tops ? tops[label.s]?.[label.index] : v;
      return label && v !== null && v !== undefined && at !== null && at !== undefined ? [{ ...label, x: slots[label.index]?.center ?? 0, y: y(at) }] : [];
    });
    const sorted = [...placed].sort((a, b) => a.y - b.y);
    const collides = sorted.some((label, i) => i > 0 && label.y - (sorted[i - 1] as { y: number }).y < 13);
    const taken: number[] = [];
    if (!collides) {
      for (const label of placed) {
        const text = svg(doc, "text", { class: "fft-end-label", x: label.x + 8, y: label.y, "dominant-baseline": "middle" });
        text.textContent = label.text;
        chart.append(text);
        taken.push(label.y);
      }
    }
    // The band's two ends, in quieter ink, wherever they clear the line's own end label.
    bandEnds.forEach((v, k) => {
      const ty = y(v);
      if (taken.some((t) => Math.abs(t - ty) < 13)) return;
      taken.push(ty);
      const text = svg(doc, "text", { class: "fft-band-label", x: (slots[bandEnd]?.center ?? 0) + 8, y: ty, "dominant-baseline": "middle" });
      text.textContent = bandEndText[k] ?? "";
      chart.append(text);
    });
    chart.append(crosshair);
  }
  drawReferences(doc, references, y, plot, tickText, refsBelow, refsAbove, obstacles);
  chart.append(refsAbove, overlay);

  // Hover and focus: one hit area per category, taller and wider than any mark.
  const hoverDots = svg(doc, "g");
  chart.append(hoverDots);
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const group of markGroups) group.removeAttribute("data-active");
    crosshair.setAttribute("hidden", "");
    hoverDots.replaceChildren();
    ctx.tooltip.hide();
  };
  slots.forEach((slot, i) => {
    const row = rows[i] ?? {};
    const items: TooltipItem[] = series.map((field, s) => ({ label: ctx.label(field), value: ctx.format(row[field], field), color: categoryOn(i) ? seriesColor(s) : mutedColor(s) }));
    if (stacked) items.push({ label: "Total", value: ctx.format(raw.reduce((sum, seriesValues) => sum + (seriesValues[i] ?? 0), 0), series[0]) });
    const low = bandLow[i];
    const high = bandHigh[i];
    if (band && low != null && high != null && low !== high) items.push({ label: band.label ?? "Range", value: `${ctx.format(low, series[0])} to ${ctx.format(high, series[0])}` });
    const title = forecastField && isForecast(row[forecastField]) ? `${xLabels[i] ?? ""} (forecast)` : (xLabels[i] ?? "");
    overlayFields.forEach((field, k) => items.push({ label: ctx.label(field), value: ctx.format(row[field], field), color: overlayColor(k) }));
    const hit = svg(doc, "rect", { class: "fft-hit", x: slot.start, y: plot.y, width: slot.width, height: plot.h, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${title}: ${items.map((item) => `${item.label} ${item.value || "no value"}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      markGroups[i]?.setAttribute("data-active", "");
      if (kind !== "bar") {
        crosshair.setAttribute("x1", String(slot.center));
        crosshair.setAttribute("x2", String(slot.center));
        crosshair.removeAttribute("hidden");
        hoverDots.replaceChildren();
        values.forEach((seriesValues, s) => {
          const v = seriesValues[i];
          if (v === null || v === undefined || stream) return;
          const dot = svg(doc, "circle", { class: "fft-dot", cx: slot.center, cy: y(tops?.[s]?.[i] ?? v), r: 4 });
          dot.style.setProperty("fill", seriesColor(s));
          hoverDots.append(dot);
        });
      }
      ctx.tooltip.show(hit, title, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    selectable(hit, () => ctx.select(row));
    overlay.append(hit);
  });

  roving([...overlay.querySelectorAll(".fft-hit")]);
  wrap.append(chart);
  // The same numbers as a table, for screen readers.
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, rows, [view.x, ...series, ...(band ? [band.low, band.high] : [])], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
}

/**
 * A streamgraph's layers: smooth bands from the base edge up, each named inside
 * itself where it runs thick enough for its name across the name's whole width.
 */
function drawStream(
  chart: SVGSVGElement,
  washes: SVGGElement,
  layout: {
    series: string[];
    label: (field: string) => string;
    slots: { center: number }[];
    plot: { x: number; w: number };
    edge: (s: number) => { x: number; y: number }[];
    base: { x: number; y: number }[];
    color: (s: number) => string;
  },
) {
  const doc = chart.ownerDocument;
  const { series, label: nameOf, slots, plot, edge, base, color } = layout;
  const edges = [base, ...series.map((_, s) => edge(s))];
  smoothBands(edges).forEach((d, s) => {
    const band = svg(doc, "path", { class: "fft-area", d, "data-stacked": "", "data-stream": "", "data-series": series[s] ?? "" });
    band.style.setProperty("fill", color(s));
    washes.append(band);
  });
  const centers = slots.map((slot) => slot.center);
  series.forEach((field, s) => {
    const upper = edges[s + 1] ?? [];
    const lower = edges[s] ?? [];
    const thick = upper.map((p, i) => (lower[i]?.y ?? p.y) - p.y);
    // Thickness across a label's width: the thinnest of a point and its neighbours.
    const room = thick.map((t, i) => Math.min(thick[i - 1] ?? t, t, thick[i + 1] ?? t));
    // The roomiest point wins, leaning toward the middle so near-ties never pin a name to an edge.
    const middleX = plot.x + plot.w / 2;
    const score = room.map((r, i) => (r < STREAM_LABEL_ROOM ? -1 : r * (1 - (0.3 * Math.abs((centers[i] ?? middleX) - middleX)) / (plot.w / 2 || 1))));
    const best = score.indexOf(Math.max(...score));
    if (best < 0 || (score[best] ?? -1) < 0) return;
    const name = nameOf(field);
    const half = (name.length * CHAR_WIDTH) / 2 + 5;
    const x = Math.min(Math.max(centers[best] ?? 0, plot.x + half), plot.x + plot.w - half);
    // The band's middle at x, read off the straight run between the two nearest points.
    const middle = upper.map((p, i) => (p.y + (lower[i]?.y ?? p.y)) / 2);
    const j = Math.max(0, Math.min(centers.length - 2, centers.findLastIndex((c) => c <= x)));
    const span = (centers[j + 1] ?? 0) - (centers[j] ?? 0);
    const f = span > 0 ? (x - (centers[j] ?? 0)) / span : 0;
    const yMid = (middle[j] ?? 0) + f * ((middle[j + 1] ?? middle[j] ?? 0) - (middle[j] ?? 0));
    const label = svg(doc, "text", { class: "fft-stream-label", x, y: yMid, "text-anchor": "middle", "dominant-baseline": "middle" });
    label.textContent = name;
    chart.append(label);
  });
}

/** Draws the `bar` view: grouped vertical bars from a zero baseline. */
export const renderBar: ViewRenderer<BarView> = (ctx) => renderCartesian(ctx, "bar");

/** Draws the `line` view: one 2px line per series, with gaps where values are missing. */
export const renderLine: ViewRenderer<LineView> = (ctx) => renderCartesian(ctx, "line");

/** Draws the `area` view: lines with a 10% wash down to a zero baseline. */
export const renderArea: ViewRenderer<AreaView> = (ctx) => renderCartesian(ctx, "area");
