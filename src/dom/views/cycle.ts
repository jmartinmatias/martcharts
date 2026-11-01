import { cyclePanels, cycleStandout } from "../../core/cycle.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { CycleView } from "../../core/views.ts";
import { linearScale } from "../layout.ts";
import { tickFormatter } from "./chart.ts";
import { activeGroup, fillHeight, hiddenTable, html, roving, rowHit, svg, textWidth } from "./shared.ts";
import { wordsFor } from "./words.ts";

const GAP = 8;

/**
 * Draws the `cycle` view, a cycle plot: one small panel per day of the week (or month of the year), side by side on
 * one value axis. In each panel a thin line runs through that day's readings week after week, and a dark bar across
 * it marks the day's average. The bars read the rhythm (Mondays are busiest); the lines read the trend inside each
 * day (every Monday busier than the last), two things one long line mixes together.
 */
export const renderCycle: ViewRenderer<CycleView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { x, value } = ctx.view;
  const { by, panels } = cyclePanels(ctx.rows, x, value, ctx.view.by, ctx.spec.locale);
  const words = wordsFor(ctx);
  const all = panels.flatMap((p) => p.readings.map((r) => r.value));
  const standout = cycleStandout(panels);

  const probe = linearScale(all, [0, 1], { includeZero: all.every((v) => v >= 0) });
  const tickText = tickFormatter(ctx, value, probe.ticks);
  const left = Math.ceil(Math.max(...probe.ticks.map((t) => textWidth(tickText(t), 11)), 13)) + 8;
  const width = Math.max(ctx.width, left + panels.length * 21);
  const margin = { top: 8, right: 2, bottom: 39, left };
  const height = ctx.inFacet || ctx.spec.style?.height ? ctx.height : fillHeight(ctx, ctx.height, 8, Math.max(ctx.height, 377));
  const plotBottom = height - margin.bottom;
  const y = linearScale(all, [plotBottom, margin.top], { includeZero: all.every((v) => v >= 0) });
  const panelW = (width - margin.left - margin.right - GAP * Math.max(0, panels.length - 1)) / Math.max(1, panels.length);

  const wrap = html(doc, "div", "fft-chart fft-cycle");
  if (!ctx.inFacet && !ctx.spec.style?.height) wrap.dataset.fill = "";
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", words.aria.cycle(ctx.label(value), by === "weekday"));
  for (const tick of y.ticks) {
    const ty = y(tick);
    chart.append(svg(doc, "line", { class: "fft-gridline", x1: margin.left, x2: width - margin.right, y1: ty, y2: ty }));
    const label = svg(doc, "text", { class: "fft-tick fft-tick-y", x: margin.left - 8, y: ty + 4, "text-anchor": "end" });
    label.textContent = tickText(tick);
    chart.append(label);
  }

  const overlay = svg(doc, "g");
  const active = activeGroup(wrap, ctx.tooltip);
  const hits: Element[] = [];
  const said: string[][] = [];
  const color = ctx.color(0);
  // An average reads in whole units unless the readings are small (a rating of 4.2).
  const round = (n: number) => (Math.abs(n) >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
  // Names shorten to their first letter where panels are too narrow for "Mon" (a phone's seven panels).
  const narrow = panels.some((p) => textWidth(p.short, 11) > panelW - 2);
  panels.forEach((panel, i) => {
    const x0 = margin.left + i * (panelW + GAP);
    const group = svg(doc, "g", { class: "fft-cycle-panel", style: `--fft-i: ${i}` });
    group.append(svg(doc, "rect", { class: "fft-cycle-bg", x: x0, y: margin.top, width: panelW, height: plotBottom - margin.top }));
    const inner = Math.min(4, panelW / 6);
    const step = panel.readings.length > 1 ? (panelW - inner * 2) / (panel.readings.length - 1) : 0;
    const points = panel.readings.map((r, k) => `${Math.round((x0 + inner + k * step) * 100) / 100},${Math.round(y(r.value) * 100) / 100}`);
    if (points.length > 1) {
      const line = svg(doc, "path", { class: "fft-cycle-line", d: `M${points.join("L")}` });
      line.style.setProperty("stroke", color);
      group.append(line);
    } else if (panel.readings.length === 1) {
      const dot = svg(doc, "circle", { class: "fft-cycle-dot", cx: x0 + panelW / 2, cy: y(panel.first), r: 3 });
      dot.style.setProperty("fill", color);
      group.append(dot);
    }
    const my = Math.round(y(panel.mean) * 100) / 100;
    group.append(svg(doc, "line", { class: "fft-cycle-mean", x1: x0, x2: x0 + panelW, y1: my, y2: my }));
    const name = svg(doc, "text", { class: "fft-cycle-name", x: x0 + panelW / 2, y: plotBottom + 16, "text-anchor": "middle" });
    name.textContent = narrow ? panel.short.charAt(0).toUpperCase() : panel.short;
    if (standout && panel === standout.high) name.dataset.high = "";
    const mean = svg(doc, "text", { class: "fft-cycle-value", x: x0 + panelW / 2, y: plotBottom + 31, "text-anchor": "middle" });
    mean.textContent = ctx.format(round(panel.mean), value);
    // A mean too wide for its panel is left to the tooltip.
    if (textWidth(mean.textContent ?? "", 10) > panelW + GAP - 2) mean.textContent = "";
    group.append(name, mean);
    chart.append(group);

    const items: TooltipItem[] = [
      { label: words.average, value: ctx.format(round(panel.mean), value), color },
      ...(panel.readings.length > 1 ? [{ label: words.firstToLast, value: `${ctx.format(panel.first, value)} → ${ctx.format(panel.last, value)}` }] : []),
      { label: words.count, value: new Intl.NumberFormat(ctx.spec.locale).format(panel.readings.length) },
    ];
    said.push([panel.long, items[0]?.value ?? "", panel.readings.length > 1 ? (items[1]?.value ?? "") : "", items.at(-1)?.value ?? ""]);
    const hit = svg(doc, "rect", { class: "fft-cycle-hit", x: x0 - GAP / 2, y: margin.top, width: panelW + GAP, height: height - margin.top });
    hits.push(rowHit(ctx, { node: hit, row: panel.readings.at(-1)?.row ?? {}, name: panel.long, items, active: group, group: active }));
    overlay.append(hit);
  });
  chart.append(overlay);
  roving(hits);
  wrap.append(chart, hiddenTable(doc, [by === "weekday" ? words.weekday : words.month, words.average, words.firstToLast, words.count], said));
  ctx.el.append(wrap);
};
