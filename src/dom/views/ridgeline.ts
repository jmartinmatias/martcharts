import { readNumber } from "../../core/formats.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { RidgelineView } from "../../core/views.ts";
import { density, linearScale, quantile } from "../layout.ts";
import { tickFormatter } from "./chart.ts";
import { roving } from "./focus.ts";
import { html, selectable, svg } from "./shared.ts";

const CHAR_WIDTH = 6;
const ROW = 55;
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
  const low = Math.min(...all);
  const high = Math.max(...all);
  const pad = (high - low || 1) * 0.15;
  // Amounts that are never negative (sizes, counts, revenue) must not grow tails below zero.
  const start = low >= 0 ? Math.max(0, low - pad) : low - pad;
  const end = high + pad;
  const grid = Array.from({ length: GRID }, (_, i) => start + ((end - start) * i) / (GRID - 1));
  const curves = groups.map((name) => density(values.get(name) ?? [], grid));
  const peak = Math.max(...curves.flat()) || 1;
  const ridgeHeight = ROW * 1.618;

  const labels = groups.map((name) => ctx.format(name, group));
  const ticks = linearScale(grid, [0, 1], { includeZero: low >= 0 && start === 0 }).ticks;
  const tickText = tickFormatter(ctx, value, ticks);
  const left = Math.max(34, Math.max(...labels.map((l) => l.length)) * CHAR_WIDTH + 13);
  const margin = { top: Math.ceil(ridgeHeight - ROW) + 5, right: 13, bottom: 39, left };
  const width = Math.max(ctx.width, left + 144);
  const height = margin.top + groups.length * ROW + margin.bottom;
  const x = linearScale(grid, [margin.left, width - margin.right], { includeZero: low >= 0 && start === 0 });
  const plotBottom = margin.top + groups.length * ROW;

  const wrap = html(doc, "div", "fft-chart");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Ridgeline of ${ctx.label(value)} by ${ctx.label(group)}`);
  for (const tick of x.ticks) {
    const tx = x(tick);
    chart.append(svg(doc, "line", { class: "fft-gridline", x1: tx, x2: tx, y1: 0, y2: plotBottom }));
    const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: tx, y: plotBottom + 18, "text-anchor": "middle" });
    text.textContent = tickText(tick);
    chart.append(text);
  }
  const title = svg(doc, "text", { class: "fft-axis-title", x: width - margin.right, y: height - 3, "text-anchor": "end" });
  title.textContent = ctx.label(value);
  chart.append(title);

  const overlay = svg(doc, "g");
  const ridges: SVGGElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const r of ridges) r.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  groups.forEach((name, g) => {
    const base = margin.top + (g + 1) * ROW;
    const points = grid.map((v, i) => `${Math.round(x(v) * 100) / 100},${Math.round((base - ((curves[g]?.[i] ?? 0) / peak) * ridgeHeight) * 100) / 100}`);
    const line = `M${points.join("L")}`;
    const area = `${line}L${x(grid[GRID - 1] as number)},${base}L${x(grid[0] as number)},${base}Z`;
    const ridge = svg(doc, "g", { class: "fft-ridge", style: `--fft-i: ${g}` });
    ridge.append(svg(doc, "path", { class: "fft-ridge-mask", d: area }));
    const wash = svg(doc, "path", { class: "fft-ridge-area", d: area });
    wash.style.setProperty("fill", ctx.color(0));
    const stroke = svg(doc, "path", { class: "fft-ridge-line", d: line });
    stroke.style.setProperty("stroke", ctx.color(0));
    ridge.append(wash, stroke, svg(doc, "line", { class: "fft-baseline", x1: margin.left, x2: width - margin.right, y1: base, y2: base }));
    ridges.push(ridge);
    chart.append(ridge);
    const label = svg(doc, "text", { class: "fft-ridge-label", x: margin.left - 13, y: base - 5, "text-anchor": "end" });
    label.textContent = labels[g] ?? "";
    chart.append(label);

    const list = values.get(name) ?? [];
    const items: TooltipItem[] = [
      { label: "Median", value: ctx.format(quantile(list, 0.5), value) },
      { label: "Middle half", value: `${ctx.format(quantile(list, 0.25), value)} to ${ctx.format(quantile(list, 0.75), value)}` },
      { label: "Count", value: String(list.length) },
    ];
    const hit = svg(doc, "rect", { class: "fft-ridge-hit", x: 0, y: base - ROW, width, height: ROW, role: "img" });
    hit.setAttribute("aria-label", `${labels[g]}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const r of ridges) r.removeAttribute("data-active");
      ridge.setAttribute("data-active", "");
      ctx.tooltip.show(hit, labels[g] ?? "", items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    const firstRow = ctx.rows.find((row) => String(row[group]) === name);
    if (firstRow) selectable(hit, () => ctx.select(firstRow));
    overlay.append(hit);
  });
  chart.append(overlay);
  roving([...overlay.children]);
  wrap.append(chart);
  ctx.el.append(wrap);
};
