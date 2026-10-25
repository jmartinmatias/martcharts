import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { PyramidView } from "../../core/views.ts";
import { linearScale } from "../layout.ts";
import { highlights, tickFormatter } from "./chart.ts";
import { activeGroup, hiddenTableOf, html, roving, rowHeight, rowHit, svg, textWidth } from "./shared.ts";
import { fitLabel, writeLabel } from "./label-fit.ts";

/** The gap between the two halves and their labels. */
const GUTTER = 8;

/**
 * Draws the `pyramid` view: one row per band, its two counts as bars growing out
 * from a center axis on one shared scale, the left field leftward and the right
 * field rightward. Each half is headed by its field, in its color, so the two
 * sides need no legend; every bar writes its value at its end, and a hairline
 * grid with a few ticks under each half gives the scale.
 */
export const renderPyramid: ViewRenderer<PyramidView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, left, right } = ctx.view;
  const rows = ctx.rows;
  const sizeOf = (value: unknown) => Math.max(0, readNumber(value) ?? 0);
  const lefts = rows.map((row) => sizeOf(row[left]));
  const rights = rows.map((row) => sizeOf(row[right]));
  const present = [...lefts, ...rights, ...(ctx.extent ?? []).map((n) => Math.max(0, n))];
  const scale = linearScale(present, [0, 1], { includeZero: true });
  const max = Math.max(...scale.ticks, 1);
  const ticks = scale.ticks.filter((tick) => tick > 0);
  const tickText = tickFormatter(ctx, right, scale.ticks);

  const names = rows.map((row) => ctx.format(row[label], label));
  const leftText = rows.map((row) => ctx.format(row[left], left));
  const rightText = rows.map((row) => ctx.format(row[right], right));
  // Values at the bar ends are bold; names in the middle are not.
  const longest = (texts: string[], weight = 600) => Math.max(0, ...texts.map((text) => textWidth(text, 11, weight)));
  // Dense pyramids (many age bands) take thinner rows, so twenty bands still fit a card.
  const LANE = rowHeight(rows.length, "regular");
  // The middle column holds the names: as wide as the longest, at most a quarter of the card; longer names are cut.
  const center = Math.max(34, Math.min(longest(names, 400) + GUTTER * 2, Math.max(55, ctx.width * 0.25)));
  const shown = names.map((name) => fitLabel(name, center - GUTTER * 2 + 0.5));
  // Room for the value at a bar's end: the longest written here, or the largest the shared scale allows, so panels of
  // small multiples keep the same pixels per unit.
  const top = Math.max(0, ...present);
  const margin = { top: 21, bottom: 26, left: longest([...leftText, ctx.format(top, left)]) + GUTTER + 5, right: longest([...rightText, ctx.format(top, right)]) + GUTTER + 5 };
  const width = Math.max(ctx.width, margin.left + margin.right + center + 144);
  const half = (width - margin.left - margin.right - center) / 2;
  const height = margin.top + rows.length * LANE + margin.bottom;
  const mid = margin.left + half + center / 2;
  const leftEdge = mid - center / 2;
  const rightEdge = mid + center / 2;
  const span = (value: number) => (value / max) * half;
  // A pyramid reads as a silhouette: its bars nearly touch, with square corners whatever the preset's bar radius.
  const rx = 2;
  const sideColor = (field: string, i: number) => ctx.colorOf?.(field) ?? ctx.colorOf?.(ctx.label(field)) ?? ctx.color(i);
  const [leftColor, rightColor] = [sideColor(left, 0), sideColor(right, 1)];

  const wrap = html(doc, "div", "fft-chart fft-pyramid");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Pyramid of ${ctx.label(left)} and ${ctx.label(right)} by ${ctx.label(label)}`);

  // Each half's heading, in its color, over the bars it names.
  for (const [field, color, x, anchor] of [
    [left, leftColor, leftEdge, "end"],
    [right, rightColor, rightEdge, "start"],
  ] as const) {
    const head = svg(doc, "text", { class: "fft-pyr-head", x, y: 11, "text-anchor": anchor, "dominant-baseline": "middle" });
    const swatch = svg(doc, "rect", { class: "fft-pyr-swatch", x: anchor === "end" ? x - 8 : x, y: 7, width: 8, height: 8, rx: 2 });
    swatch.style.setProperty("fill", color);
    head.textContent = ctx.label(field);
    head.setAttribute("x", String(anchor === "end" ? x - 13 : x + 13));
    chart.append(swatch, head);
  }

  const plotTop = margin.top;
  const plotBottom = margin.top + rows.length * LANE;
  // Gridlines mirror either side of the center, labelled under the plot; the center axis is the baseline.
  for (const tick of ticks) {
    for (const [x, anchor] of [
      [leftEdge - span(tick), "middle"],
      [rightEdge + span(tick), "middle"],
    ] as const) {
      chart.append(svg(doc, "line", { class: "fft-gridline", x1: x, x2: x, y1: plotTop, y2: plotBottom }));
      const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x, y: plotBottom + 18, "text-anchor": anchor });
      text.textContent = tickText(tick);
      chart.append(text);
    }
  }
  chart.append(svg(doc, "line", { class: "fft-baseline", x1: leftEdge, x2: leftEdge, y1: plotTop, y2: plotBottom }), svg(doc, "line", { class: "fft-baseline", x1: rightEdge, x2: rightEdge, y1: plotTop, y2: plotBottom }));

  const hits: Element[] = [];
  const active = activeGroup(wrap, ctx.tooltip);
  // highlight keeps the named rows in color and steps the rest back to grey, as on hbar and dot.
  const picked = highlights((ctx.view as { highlight?: unknown }).highlight);
  const muted = (row: Row) => picked.length > 0 && !picked.includes(String(row[label]));
  rows.forEach((row, i) => {
    const top = plotTop + i * LANE;
    const barTop = top + 1;
    const barHeight = LANE - 2 * (barTop - top);
    const cy = top + LANE / 2;
    const group = svg(doc, "g", { class: "fft-pyr-row", style: `--fft-i: ${i}` });
    if (muted(row)) group.dataset.muted = "";
    const name = svg(doc, "text", { class: "fft-pyr-label", x: mid, y: cy, "text-anchor": "middle", "dominant-baseline": "middle" });
    writeLabel(name, shown[i] ?? "", names[i] ?? "");
    group.append(name);
    const l = span(lefts[i] ?? 0);
    const r = span(rights[i] ?? 0);
    const leftBar = svg(doc, "rect", { class: "fft-pyr-bar", "data-side": "left", x: leftEdge - l, y: barTop, width: l, height: barHeight, rx });
    leftBar.style.setProperty("fill", leftColor);
    const rightBar = svg(doc, "rect", { class: "fft-pyr-bar", "data-side": "right", x: rightEdge, y: barTop, width: r, height: barHeight, rx });
    rightBar.style.setProperty("fill", rightColor);
    const leftValue = svg(doc, "text", { class: "fft-pyr-value", x: leftEdge - l - 5, y: cy, "text-anchor": "end", "dominant-baseline": "middle" });
    leftValue.textContent = leftText[i] ?? "";
    const rightValue = svg(doc, "text", { class: "fft-pyr-value", x: rightEdge + r + 5, y: cy, "text-anchor": "start", "dominant-baseline": "middle" });
    rightValue.textContent = rightText[i] ?? "";
    group.append(leftBar, rightBar, leftValue, rightValue);

    const total = (lefts[i] ?? 0) + (rights[i] ?? 0);
    const items: TooltipItem[] = [
      { label: ctx.label(left), value: leftText[i] ?? "", color: leftColor },
      { label: ctx.label(right), value: rightText[i] ?? "", color: rightColor },
      { label: "Total", value: ctx.format(total, right) },
    ];
    const hit = svg(doc, "rect", { class: "fft-pyr-hit", x: 0, y: top, width, height: LANE });
    hits.push(rowHit(ctx, { node: hit, row, name: names[i] ?? "", items, anchor: name, active: group, group: active }));
    group.append(hit);
    chart.append(group);
  });
  roving(hits);
  wrap.append(chart);
  wrap.append(hiddenTableOf(ctx, rows, [label, left, right]));
  ctx.el.append(wrap);
};
