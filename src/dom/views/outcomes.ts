import { OUTCOME_DOTS, outcomeOdds, outcomeValues, quantileDots } from "../../core/outcomes.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { OutcomesView } from "../../core/views.ts";
import { linearScale } from "../layout.ts";
import { tickFormatter } from "./chart.ts";
import { activeGroup, fillHeight, hiddenTable, html, legendList, roving, rowHit, svg } from "./shared.ts";
import { edgeAnchor, edgeX } from "./label-fit.ts";
import { wordsFor } from "./words.ts";

/**
 * Draws the `outcomes` view, a quantile dot plot: a forecast's many possible results (simulation runs, scenarios) cut
 * into twenty equally likely outcomes, one dot each, stacked where they fall on the value axis. With a target, the dots
 * on its good side are filled and the rest are rings, and the line above says how many reach it, "7 in 20": a chance
 * counted, not a band to interpret.
 */
export const renderOutcomes: ViewRenderer<OutcomesView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const words = wordsFor(ctx);
  const field = ctx.view.value;
  const n = Math.max(5, Math.min(100, Math.round(ctx.view.dots ?? OUTCOME_DOTS)));
  const sorted = outcomeValues(ctx.rows, field);
  const dots = quantileDots(sorted, n);
  const target = typeof ctx.view.target === "number" ? ctx.view.target : undefined;
  const down = ctx.view.goodWhen === "down";
  const odds = outcomeOdds(sorted, dots, target, ctx.view.goodWhen);
  const targetName = target === undefined ? "" : `${ctx.view.targetLabel ?? words.target.toLowerCase()} ${ctx.format(target, field)}`.trim();
  const meets = (v: number) => target === undefined || (down ? v <= target : v >= target);

  const wrap = html(doc, "div", "fft-outcomes");
  if (!ctx.inFacet && !ctx.spec.style?.height) wrap.dataset.fill = "";
  // The key counts each side, so the chance reads off it (Reaches plan · 7); the sentence is the takeaway's to say.
  const reach = odds.reach ?? 0;
  const key = target === undefined ? undefined : legendList(ctx, [{ label: `${words.reaches(targetName, down)} · ${reach}`, color: ctx.color(0), shape: "dot" }, { label: `${words.fallsShort(targetName, down)} · ${n - reach}`, color: "var(--fft-text-secondary)", shape: "ring" }]);
  if (key) wrap.append(key);

  const width = ctx.width;
  const margin = { top: target === undefined ? 8 : 21, right: 8, bottom: 36, left: 8 };
  const plotW = width - margin.left - margin.right;
  const domain = [...dots, ...(target === undefined ? [] : [target])];
  // The axis keeps half the largest dot clear of either edge, so the end dots are whole.
  const inset = 17;
  const x = linearScale(domain, [margin.left + inset, width - margin.right - inset], { includeZero: false });
  // The largest dot whose tallest stack still fits the height the card gives: up to 34px, at least 6px.
  const room = (ctx.inFacet || ctx.spec.style?.height ? ctx.height : fillHeight(ctx, ctx.height, 89, 377)) - margin.top - margin.bottom;
  // Columns line up on the target: its line is a column edge, so every dot that reaches it sits on its side, whole.
  const origin = target === undefined ? margin.left : x(target);
  const binOf = (v: number, d: number) => {
    if (target === undefined) return Math.round((x(v) - origin) / d);
    // A value exactly on the target belongs to its good side: right of the line when up is good, left when down is.
    if (v === target) return down ? -1 : 0;
    return Math.floor((x(v) - origin) / d);
  };
  const stacks = (d: number) => {
    const bins = new Map<number, number>();
    return dots.map((v) => {
      const bin = binOf(v, d);
      const k = bins.get(bin) ?? 0;
      bins.set(bin, k + 1);
      return { bin, k };
    });
  };
  let d = Math.min(34, Math.floor(plotW / 8));
  while (d > 6 && Math.max(...stacks(d).map((s) => s.k + 1)) * d > room) d--;
  const placed = stacks(d);
  const tallest = Math.max(1, ...placed.map((s) => s.k + 1));
  const height = margin.top + tallest * d + margin.bottom;
  const plotBottom = margin.top + tallest * d;

  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", words.aria.outcomes(ctx.label(field), n));
  const tickText = tickFormatter(ctx, field, x.ticks);
  chart.append(svg(doc, "line", { class: "fft-baseline", x1: margin.left, x2: width - margin.right, y1: plotBottom, y2: plotBottom }));
  for (const tick of x.ticks) {
    const tx = x(tick);
    if (tx < margin.left - 1 || tx > width - margin.right + 1) continue;
    const word = tickText(tick);
    const anchor = edgeAnchor(tx, word, width);
    const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: edgeX(tx, anchor, width), y: plotBottom + 16, "text-anchor": anchor });
    text.textContent = word;
    chart.append(text);
  }
  const title = svg(doc, "text", { class: "fft-axis-title", x: width - margin.right, y: height - 3, "text-anchor": "end" });
  title.textContent = ctx.label(field);
  chart.append(title);
  if (target !== undefined) {
    const tx = Math.round(x(target) * 100) / 100;
    chart.append(svg(doc, "line", { class: "fft-outcomes-target", x1: tx, x2: tx, y1: margin.top - 8, y2: plotBottom }));
    const anchor = edgeAnchor(tx, targetName, width);
    const label = svg(doc, "text", { class: "fft-outcomes-target-label", x: edgeX(tx, anchor, width), y: margin.top - 11, "text-anchor": anchor });
    label.textContent = targetName.charAt(0).toUpperCase() + targetName.slice(1);
    chart.append(label);
  }

  const active = activeGroup(wrap, ctx.tooltip);
  const hits: Element[] = [];
  const color = ctx.color(0);
  const r = Math.max(2, d / 2 - 1.5);
  dots.forEach((v, i) => {
    const { bin, k } = placed[i] as { bin: number; k: number };
    const cx = Math.round((origin + (target === undefined ? bin * d : (bin + 0.5) * d)) * 100) / 100;
    const cy = Math.round((plotBottom - d / 2 - k * d) * 100) / 100;
    const dot = svg(doc, "circle", { class: "fft-outcome", cx, cy, r: Math.round(r * 100) / 100, style: `--fft-i: ${i}` });
    if (meets(v)) dot.style.setProperty("fill", color);
    else dot.dataset.miss = "";
    const items = [
      { label: ctx.label(field), value: ctx.format(Math.round(v), field), ...(meets(v) ? { color } : {}) },
      ...(target === undefined ? [] : [{ label: words.target, value: meets(v) ? words.reaches(targetName, down) : words.fallsShort(targetName, down) }]),
    ];
    hits.push(rowHit(ctx, { node: dot, row: {}, name: words.outcomeOf(i + 1, n), items, group: active }));
    chart.append(dot);
  });
  roving(hits);
  wrap.append(chart, hiddenTable(doc, ["#", ctx.label(field), ...(target === undefined ? [] : [words.target])], dots.map((v, i) => [String(i + 1), ctx.format(Math.round(v), field), ...(target === undefined ? [] : [meets(v) ? words.reaches(targetName, down) : words.fallsShort(targetName, down)])])));
  ctx.el.append(wrap);
};
