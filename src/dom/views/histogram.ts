import { readNumber } from "../../core/formats.ts";
import { referenceValues, resolveReferences } from "../../core/reference.ts";
import { sturges } from "../../core/scale.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { HistogramView } from "../../core/views.ts";
import { barPath, binValues, CHAR_WIDTH, linearScale, quantile } from "../layout.ts";
import { tickFormatter } from "./chart.ts";
import { drawVerticalReferences } from "./reference.ts";
import { hiddenTable, html, selectable, shareFormat, svg } from "./shared.ts";
import { roving } from "./focus.ts";

/**
 * Draws the `histogram` view: the value's range cut into bins on round edges,
 * one bar per bin counting its rows. Bars touch but for a 2px gap, so the
 * distribution reads as one shape, and labels sit on the bin edges rather than
 * under the bars. A dashed line marks the median.
 *
 * `reference` marks thresholds on the value axis (a policy limit, a target
 * size) as dashed verticals or shaded columns; panels of small multiples share
 * one count axis.
 */
export const renderHistogram: ViewRenderer<HistogramView & { reference?: unknown }> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { value, median = true, countLabel = "Count" } = ctx.view;
  const values = ctx.rows.map((row) => readNumber(row[value])).filter((n): n is number => n !== null);
  const bins = binValues(values, ctx.view.bins ?? sturges(values.length));
  const edges = bins.length ? [bins[0]?.start as number, ...bins.map((bin) => bin.end)] : [];
  const edgeText = tickFormatter(ctx, value, edges);
  const share = shareFormat(ctx.spec.locale);
  const references = resolveReferences(ctx.view, ctx.rows);

  // Small multiples pass the tallest count of any panel, so every panel's bars stand on one scale.
  const counts = [...bins.map((bin) => bin.count), ...(ctx.extent ?? [])];
  const yTicks = linearScale(counts, [1, 0], { includeZero: true }).ticks.filter(Number.isInteger);
  const left = Math.max(21, Math.max(...yTicks.map((t) => String(t).length)) * CHAR_WIDTH + 12);
  const margin = { top: 21, right: 13, bottom: 26, left };
  const width = Math.max(ctx.width, left + 144);
  const height = ctx.height;
  const plot = { x: margin.left, y: margin.top, w: width - margin.left - margin.right, h: height - margin.top - margin.bottom };
  const base = plot.y + plot.h;
  const y = linearScale(counts, [base, plot.y], { includeZero: true });
  // The value axis spans the bins, stretched to show any reference mark outside them.
  const marks = referenceValues(references);
  const low = Math.min(edges[0] ?? 0, ...marks);
  const high = Math.max(edges.at(-1) ?? 1, ...marks);
  const xs = (v: number) => plot.x + ((v - low) / (high - low || 1)) * plot.w;

  const wrap = html(doc, "div", "fft-chart");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Histogram of ${ctx.label(value)}`);
  for (const tick of y.ticks.filter(Number.isInteger)) {
    const ty = y(tick);
    chart.append(svg(doc, "line", { class: tick === 0 ? "fft-baseline" : "fft-gridline", x1: plot.x, x2: plot.x + plot.w, y1: ty, y2: ty }));
    const label = svg(doc, "text", { class: "fft-tick fft-tick-y", x: plot.x - 8, y: ty, "text-anchor": "end", "dominant-baseline": "middle" });
    label.textContent = String(tick);
    chart.append(label);
  }
  // Edge labels, thinned to every other (or more) when they would collide; the outer edges always show.
  const widest = Math.max(...edges.map((edge) => edgeText(edge).length)) * CHAR_WIDTH + 8;
  const every = Math.max(1, Math.ceil((edges.length * widest) / plot.w));
  edges.forEach((edge, i) => {
    if (i % every !== 0 && i !== edges.length - 1) return;
    const label = svg(doc, "text", { class: "fft-tick fft-tick-x", x: xs(edge), y: base + 18, "text-anchor": "middle" });
    label.textContent = edgeText(edge);
    chart.append(label);
  });
  const refsBelow = svg(doc, "g");
  const refsAbove = svg(doc, "g");
  chart.append(refsBelow);

  const groups: SVGGElement[] = [];
  const hits: Element[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const group of groups) group.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  bins.forEach((bin, i) => {
    const x0 = xs(bin.start);
    const x1 = xs(bin.end);
    const group = svg(doc, "g", { class: "fft-hist", style: `--fft-i: ${i}` });
    if (bin.count > 0) {
      const top = y(bin.count);
      const bar = svg(doc, "path", {
        class: "fft-bar fft-hist-bar",
        d: barPath({ series: 0, index: i, x: x0 + 1, y: top, width: Math.max(1, x1 - x0 - 2), height: base - top, value: bin.count, negative: false }, 4),
        "data-count": bin.count,
      });
      bar.style.setProperty("fill", ctx.color(0));
      group.append(bar);
    }
    const range = `${edgeText(bin.start)} to ${edgeText(bin.end)}`;
    const items: TooltipItem[] = [
      { label: countLabel, value: String(bin.count), color: ctx.color(0) },
      { label: "Share", value: share.format(values.length ? bin.count / values.length : 0) },
    ];
    const hit = svg(doc, "rect", { class: "fft-hist-hit", x: x0, y: plot.y, width: x1 - x0, height: plot.h, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${range}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const other of groups) other.removeAttribute("data-active");
      group.setAttribute("data-active", "");
      ctx.tooltip.show(group.querySelector(".fft-hist-bar") ?? hit, range, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    const inBin = ctx.rows.filter((row) => {
      const v = readNumber(row[value]);
      return v !== null && v >= bin.start && (v < bin.end || i === bins.length - 1);
    });
    selectable(hit, () => {
      if (inBin[0]) ctx.select(inBin[0]);
    });
    group.append(hit);
    groups.push(group);
    hits.push(hit);
    chart.append(group);
  });

  if (median && values.length) {
    const middle = quantile(values, 0.5);
    const mx = xs(middle);
    chart.append(svg(doc, "line", { class: "fft-ref", x1: mx, x2: mx, y1: plot.y - 5, y2: base }));
    const onLeft = mx > plot.x + plot.w / 2;
    const label = svg(doc, "text", { class: "fft-ref-label", x: onLeft ? mx - 5 : mx + 5, y: plot.y - 8, "text-anchor": onLeft ? "end" : "start" });
    label.textContent = `Median ${ctx.format(middle, value)}`;
    chart.append(label);
  }
  drawVerticalReferences(doc, references, xs, plot, (v) => ctx.format(v, value), refsBelow, refsAbove);
  chart.append(refsAbove);

  roving(hits);
  wrap.append(chart);
  if (!values.length) wrap.append(html(doc, "p", "fft-empty-note", `No row has a number in ${ctx.label(value)}.`));
  // The bins as a table for assistive technology.
  wrap.append(hiddenTable(doc, [ctx.label(value), countLabel], bins.map((bin) => [`${edgeText(bin.start)} to ${edgeText(bin.end)}`, String(bin.count)])));
  ctx.el.append(wrap);
};
