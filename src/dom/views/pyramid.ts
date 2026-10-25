import { readNumber } from "../../core/formats.ts";
import { getPreset } from "../../core/presets.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { PyramidView } from "../../core/views.ts";
import { linearScale } from "../layout.ts";
import { tickFormatter } from "./chart.ts";
import { buildTable, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

/** Rough width of one character of 11px text, for reserving room without measuring. */
const CHAR_WIDTH = 6;
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
  const longest = (texts: string[]) => Math.max(0, ...texts.map((text) => text.length)) * CHAR_WIDTH;
  // Dense pyramids (many age bands) take thinner rows, so twenty bands still fit a card.
  const ROW = rows.length > 16 ? 18 : rows.length > 10 ? 21 : 26;
  const center = Math.max(34, longest(names) + GUTTER * 2);
  // Room for the value at a bar's end: the longest written here, or the largest the shared scale allows, so panels of
  // small multiples keep the same pixels per unit.
  const top = Math.max(0, ...present);
  const margin = { top: 21, bottom: 26, left: longest([...leftText, ctx.format(top, left)]) + GUTTER + 5, right: longest([...rightText, ctx.format(top, right)]) + GUTTER + 5 };
  const width = Math.max(ctx.width, margin.left + margin.right + center + 144);
  const half = (width - margin.left - margin.right - center) / 2;
  const height = margin.top + rows.length * ROW + margin.bottom;
  const mid = margin.left + half + center / 2;
  const leftEdge = mid - center / 2;
  const rightEdge = mid + center / 2;
  const span = (value: number) => (value / max) * half;
  const radius = getPreset(ctx.spec.style?.preset)?.marks?.barRadius;
  const rx = radius === "full" ? ROW : (radius ?? 2);
  const [leftColor, rightColor] = [ctx.color(0), ctx.color(1)];

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
  const plotBottom = margin.top + rows.length * ROW;
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

  const hits: SVGElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const hit of hits) hit.parentElement?.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  rows.forEach((row, i) => {
    const top = plotTop + i * ROW;
    const barTop = top + Math.max(2, Math.round(ROW * 0.15));
    const barHeight = ROW - 2 * (barTop - top);
    const cy = top + ROW / 2;
    const group = svg(doc, "g", { class: "fft-pyr-row", style: `--fft-i: ${i}` });
    const name = svg(doc, "text", { class: "fft-pyr-label", x: mid, y: cy, "text-anchor": "middle", "dominant-baseline": "middle" });
    name.textContent = names[i] ?? "";
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
    const hit = svg(doc, "rect", { class: "fft-pyr-hit", x: 0, y: top, width, height: ROW, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${names[i] ?? ""}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const show = () => {
      wrap.setAttribute("data-active", "");
      for (const other of hits) other.parentElement?.removeAttribute("data-active");
      group.setAttribute("data-active", "");
      ctx.tooltip.show(name, names[i] ?? "", items);
    };
    hit.addEventListener("pointerenter", show);
    hit.addEventListener("focus", show);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    selectable(hit, () => ctx.select(row));
    group.append(hit);
    hits.push(hit);
    chart.append(group);
  });
  roving(hits);
  wrap.append(chart);
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, rows, [label, left, right], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
