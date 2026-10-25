import { readNumber } from "../../core/formats.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { RidgelineView } from "../../core/views.ts";
import { density, linearScale, quantile } from "../layout.ts";
import { tickFormatter } from "./chart.ts";
import { activeGroup, hiddenTable, html, ROW, roving, rowHit, svg } from "./shared.ts";
import { sharedRange } from "./facet-key.ts";
import { edgeAnchor, edgeX, nameColumn, writeLabel } from "./label-fit.ts";
import { wordsFor } from "./words.ts";

const LANE: number = ROW.tall;
const GRID = 89;

/**
 * Draws the `ridgeline` view: one smooth distribution per group (a kernel
 * density estimate), stacked on a shared axis and overlapping like a mountain
 * range. Each ridge is masked with the surface first so the rows in front
 * cleanly cover the rows behind; the tooltip gives the median, the middle half
 * and the count.
 */
export const renderRidgeline: ViewRenderer<RidgelineView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { value, group } = ctx.view;
  const groups: string[] = [];
  const values = new Map<string, number[]>();
  for (const row of ctx.rows) {
    const amount = readNumber(row[value]);
    if (amount === null) continue;
    const name = String(row[group]);
    if (!values.has(name)) {
      groups.push(name);
      values.set(name, []);
    }
    values.get(name)?.push(amount);
  }
  const all = [...values.values()].flat();
  // Small multiples share one value axis: the range covers every panel's values.
  const [low, high] = sharedRange(all, ctx.extent);
  const pad = (high - low || 1) * 0.15;
  // Amounts that are never negative (sizes, counts, revenue) must not grow tails below zero.
  const start = low >= 0 ? Math.max(0, low - pad) : low - pad;
  const end = high + pad;
  const grid = Array.from({ length: GRID }, (_, i) => start + ((end - start) * i) / (GRID - 1));
  // Small multiples share one density height too: one bandwidth from every panel's values, and one height per unit of
  // density (a ridge at full height would be every value in one place), so the same spread draws the same shape everywhere.
  const shared = ctx.extent?.length ? ctx.extent : undefined;
  const bandwidth = shared ? silverman(shared) : undefined;
  const curves = groups.map((name) => density(values.get(name) ?? [], grid, bandwidth));
  const peak = bandwidth ? 0.618 / (bandwidth * Math.sqrt(2 * Math.PI)) : Math.max(...curves.flat()) || 1;
  const ridgeHeight = LANE * 1.618;

  const labels = groups.map((name) => ctx.format(name, group));
  const ticks = linearScale(grid, [0, 1], { includeZero: low >= 0 && start === 0 }).ticks;
  const tickText = tickFormatter(ctx, value, ticks);
  // Group names in a measured column, cut with an ellipsis past a third of the card.
  const column = nameColumn(labels, ctx.width);
  const left = column.width + 8;
  const margin = { top: Math.ceil(ridgeHeight - LANE) + 5, right: 13, bottom: 39, left };
  const width = Math.max(ctx.width, left + 144);
  const height = margin.top + groups.length * LANE + margin.bottom;
  const x = linearScale(grid, [margin.left, width - margin.right], { includeZero: low >= 0 && start === 0 });
  const plotBottom = margin.top + groups.length * LANE;

  const wrap = html(doc, "div", "fft-chart");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", wordsFor(ctx).aria.ridgeline(ctx.label(value), ctx.label(group)));
  for (const tick of x.ticks) {
    const tx = x(tick);
    chart.append(svg(doc, "line", { class: "fft-gridline", x1: tx, x2: tx, y1: 0, y2: plotBottom }));
    const word = tickText(tick);
    const anchor = edgeAnchor(tx, word, width);
    const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: edgeX(tx, anchor, width), y: plotBottom + 18, "text-anchor": anchor });
    text.textContent = word;
    chart.append(text);
  }
  const title = svg(doc, "text", { class: "fft-axis-title", x: width - margin.right, y: height - 3, "text-anchor": "end" });
  title.textContent = ctx.label(value);
  chart.append(title);

  const overlay = svg(doc, "g");
  const ridges: SVGGElement[] = [];
  const active = activeGroup(wrap, ctx.tooltip);
  const hits: Element[] = [];
  const summary: string[][] = [];
  groups.forEach((name, g) => {
    const base = margin.top + (g + 1) * LANE;
    const points = grid.map((v, i) => `${Math.round(x(v) * 100) / 100},${Math.round((base - Math.min(1, (curves[g]?.[i] ?? 0) / peak) * ridgeHeight) * 100) / 100}`);
    const line = `M${points.join("L")}`;
    const area = `${line}L${x(grid[GRID - 1] as number)},${base}L${x(grid[0] as number)},${base}Z`;
    const ridge = svg(doc, "g", { class: "fft-ridge", style: `--fft-i: ${g}` });
    ridge.append(svg(doc, "path", { class: "fft-ridge-mask", d: area }));
    const wash = svg(doc, "path", { class: "fft-ridge-area", d: area });
    const hue = ctx.colorOf?.(name) ?? ctx.color(0);
    wash.style.setProperty("fill", hue);
    const stroke = svg(doc, "path", { class: "fft-ridge-line", d: line });
    stroke.style.setProperty("stroke", hue);
    ridge.append(wash, stroke, svg(doc, "line", { class: "fft-baseline", x1: margin.left, x2: width - margin.right, y1: base, y2: base }));
    ridges.push(ridge);
    chart.append(ridge);
    const label = svg(doc, "text", { class: "fft-ridge-label", x: column.end, y: base - 5, "text-anchor": "end" });
    writeLabel(label, column.shown[g] ?? "", labels[g] ?? "");
    chart.append(label);

    const list = values.get(name) ?? [];
    const items: TooltipItem[] = [
      { label: wordsFor(ctx).median, value: ctx.format(quantile(list, 0.5), value) },
      { label: wordsFor(ctx).middleHalf, value: wordsFor(ctx).between(ctx.format(quantile(list, 0.25), value), ctx.format(quantile(list, 0.75), value)) },
      { label: wordsFor(ctx).count, value: new Intl.NumberFormat(ctx.spec.locale).format(list.length) },
    ];
    summary.push([labels[g] ?? name, ...items.map((it) => it.value)]);
    const hit = svg(doc, "rect", { class: "fft-ridge-hit", x: 0, y: base - LANE, width, height: LANE });
    // Picking a ridge reports its group's first row.
    const firstRow = ctx.rows.find((row) => String(row[group]) === name) ?? {};
    hits.push(rowHit(ctx, { node: hit, row: firstRow, name: labels[g] ?? "", items, active: ridge, group: active }));
    overlay.append(hit);
  });
  chart.append(overlay);
  roving(hits);
  wrap.append(chart, hiddenTable(doc, [ctx.label(group), wordsFor(ctx).median, wordsFor(ctx).middleHalf, wordsFor(ctx).count], summary));
  ctx.el.append(wrap);
};

/** Silverman's rule of thumb: the bandwidth `density` would choose for these values. */
function silverman(values: number[]): number {
  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const sd = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n);
  return 1.06 * sd * n ** -0.2 || 1;
}
