import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { BoxplotView } from "../../core/views.ts";
import { fitLabels, linearScale, quantile } from "../layout.ts";
import { tickFormatter } from "./chart.ts";
import { activeGroup, hiddenTableOf, html, ROW, roving, rowHit, svg, textWidth } from "./shared.ts";
import { edgeAnchor, edgeX, nameColumn, writeLabel } from "./label-fit.ts";
import { wordsFor } from "./words.ts";

/** Row height and box height: Fibonacci steps. */
const LANE: number = ROW.tall;
const BOX = 21;
const CAP = 8;

/**
 * Draws the `boxplot` view: per group, on one shared axis, a soft box from the
 * first to the third quartile with a strong median line, thin capped whiskers
 * to the furthest values within 1.5 box-widths of the box (Tukey's rule), and
 * hollow dots for the outliers beyond.
 */
export const renderBoxplot: ViewRenderer<BoxplotView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { value, group } = ctx.view;
  const names: string[] = [];
  const byGroup = new Map<string, { values: number[]; rows: Row[] }>();
  for (const row of ctx.rows) {
    const v = readNumber(row[value]);
    if (v === null) continue;
    const name = group ? String(row[group]) : "";
    if (!byGroup.has(name)) {
      byGroup.set(name, { values: [], rows: [] });
      names.push(name);
    }
    byGroup.get(name)?.values.push(v);
    byGroup.get(name)?.rows.push(row);
  }
  const boxes = names.map((name) => {
    const values = [...(byGroup.get(name)?.values ?? [])].sort((a, b) => a - b);
    const q1 = quantile(values, 0.25);
    const median = quantile(values, 0.5);
    const q3 = quantile(values, 0.75);
    const reach = 1.5 * (q3 - q1);
    const inside = values.filter((v) => v >= q1 - reach && v <= q3 + reach);
    return { name, values, q1, median, q3, low: Math.min(...inside), high: Math.max(...inside), outliers: values.filter((v) => v < q1 - reach || v > q3 + reach), rows: byGroup.get(name)?.rows ?? [] };
  });

  const all = boxes.flatMap((b) => b.values);
  // Small multiples pass a shared extent, so every panel draws on the same scale.
  all.push(...(ctx.extent ?? []));
  const ticks = linearScale(all, [0, 1], { includeZero: false }).ticks;
  const tickText = tickFormatter(ctx, value, ticks);
  // Group names in a measured column, cut with an ellipsis past a third of the card.
  const column = group ? nameColumn(names.map((n) => ctx.format(n, group)), ctx.width) : undefined;
  const left = column ? column.width + 13 : 13;
  const width = Math.max(ctx.width, left + 144);
  const height = boxes.length * LANE + 26;
  const plotBottom = boxes.length * LANE;
  const x = linearScale(all, [left, width - 13], { includeZero: false });
  const show = (v: number) => ctx.format(v, value);

  const wrap = html(doc, "div", "fft-chart");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", wordsFor(ctx).aria.boxplot(ctx.label(value), group ? ctx.label(group) : undefined));
  for (const tick of x.ticks) chart.append(svg(doc, "line", { class: "fft-gridline", x1: x(tick), x2: x(tick), y1: 0, y2: plotBottom }));
  for (const i of fitLabels(x.ticks.map((tick) => ({ x: x(tick), width: textWidth(tickText(tick)) })))) {
    const tick = x.ticks[i] as number;
    const word = tickText(tick);
    const anchor = edgeAnchor(x(tick), word, width);
    const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: edgeX(x(tick), anchor, width), y: plotBottom + 18, "text-anchor": anchor });
    text.textContent = word;
    chart.append(text);
  }

  const groups: SVGGElement[] = [];
  const hits: Element[] = [];
  const active = activeGroup(wrap, ctx.tooltip);
  const color = ctx.color(0);
  boxes.forEach((b, i) => {
    const cy = i * LANE + LANE / 2;
    const g = svg(doc, "g", { class: "fft-box", style: `--fft-i: ${i}; --fft-box-color: ${(group ? ctx.colorOf?.(b.name) : undefined) ?? color}` });
    if (group && column) {
      const label = svg(doc, "text", { class: "fft-box-label", x: column.end, y: cy, "text-anchor": "end", "dominant-baseline": "middle" });
      const full = ctx.format(b.name, group);
      writeLabel(label, column.shown[i] ?? full, full);
      g.append(label);
    }
    g.append(
      svg(doc, "line", { class: "fft-box-whisker fft-box-whisker-low", x1: x(b.q1), x2: x(b.low), y1: cy, y2: cy }),
      svg(doc, "line", { class: "fft-box-whisker fft-box-whisker-high", x1: x(b.q3), x2: x(b.high), y1: cy, y2: cy }),
      svg(doc, "line", { class: "fft-box-whisker", x1: x(b.low), x2: x(b.low), y1: cy - CAP / 2, y2: cy + CAP / 2 }),
      svg(doc, "line", { class: "fft-box-whisker", x1: x(b.high), x2: x(b.high), y1: cy - CAP / 2, y2: cy + CAP / 2 }),
    );
    const body = svg(doc, "rect", { class: "fft-box-body", x: x(b.q1), y: cy - BOX / 2, width: Math.max(1, x(b.q3) - x(b.q1)), height: BOX, rx: 3 });
    g.append(body, svg(doc, "line", { class: "fft-box-median", x1: x(b.median), x2: x(b.median), y1: cy - BOX / 2, y2: cy + BOX / 2 }));
    for (const v of b.outliers) g.append(svg(doc, "circle", { class: "fft-box-outlier", cx: x(v), cy, r: 3.5 }));

    const items: TooltipItem[] = [
      { label: wordsFor(ctx).median, value: show(b.median), color },
      { label: wordsFor(ctx).middleHalf, value: wordsFor(ctx).between(show(b.q1), show(b.q3)) },
      { label: wordsFor(ctx).range, value: wordsFor(ctx).between(show(b.low), show(b.high)) },
      { label: wordsFor(ctx).values, value: new Intl.NumberFormat(ctx.spec.locale).format(b.values.length) },
      ...(b.outliers.length ? [{ label: wordsFor(ctx).outliers, value: new Intl.NumberFormat(ctx.spec.locale).format(b.outliers.length) }] : []),
    ];
    const title = group ? ctx.format(b.name, group) : ctx.label(value);
    const hit = svg(doc, "rect", { class: "fft-box-hit", x: 0, y: i * LANE, width, height: LANE });
    // Picking a box reports its first row: the box stands for all of them.
    hits.push(rowHit(ctx, { node: hit, row: b.rows[0] ?? {}, name: title, items, anchor: body, active: g, group: active }));
    g.append(hit);
    chart.append(g);
    groups.push(g);
  });
  roving(hits);
  wrap.append(chart);
  wrap.append(hiddenTableOf(ctx, ctx.rows, [...(group ? [group] : []), value]));
  ctx.el.append(wrap);
};
