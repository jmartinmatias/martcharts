import { minusFormat } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { SlopeView } from "../../core/views.ts";
import { dodge } from "../layout.ts";
import { highlights } from "./chart.ts";
import { buildTable, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const CHAR_WIDTH = 6;
/** Closest two labels on one side may sit: one 11px line plus breathing room. */
const LABEL_GAP = 14;
/** Widest the slopes get: past this, lines flatten and change is harder to see. */
const MAX_SPAN = 377;

/**
 * Draws the `slope` view: per row, a line from its earlier value in the left
 * column to its later value in the right one, on one shared scale. Rises take
 * the up color and falls the down color, though the slope alone already says
 * which way each went. Labels give name and value at both ends and are nudged
 * apart when they would collide.
 */
export const renderSlope: ViewRenderer<SlopeView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, from, to } = ctx.view;
  const picked = highlights(ctx.view.highlight);
  const rows = ctx.rows.filter((row) => readNumber(row[from]) !== null && readNumber(row[to]) !== null);
  const items = rows.map((row) => {
    const a = readNumber(row[from]) as number;
    const b = readNumber(row[to]) as number;
    return {
      row,
      a,
      b,
      name: ctx.format(row[label], label),
      fromText: ctx.format(row[from], from),
      toText: ctx.format(row[to], to),
      direction: b > a ? "up" : b < a ? "down" : "flat",
      on: picked.length === 0 || picked.includes(String(row[label])),
    };
  });
  const change = minusFormat(new Intl.NumberFormat(ctx.spec.locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" }));

  const labelWidth = (side: "from" | "to") => Math.max(34, ...items.map((it) => (it.name.length + 1 + (side === "from" ? it.fromText : it.toText).length) * CHAR_WIDTH)) + 13;
  const top = 34;
  const bottom = 13;
  const height = Math.max(ctx.height, top + bottom + items.length * LABEL_GAP);
  const width = Math.max(ctx.width, labelWidth("from") + labelWidth("to") + 89);
  const room = width - labelWidth("from") - labelWidth("to");
  const span = Math.min(room, MAX_SPAN);
  const left = labelWidth("from") + (room - span) / 2;
  const right = left + span;
  const plotBottom = height - bottom;
  // A tight scale: with no ticks to round, the highest value sits on the top line and the lowest on the bottom.
  const values = items.flatMap((it) => [it.a, it.b]);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const y = (v: number) => (hi === lo ? (top + plotBottom) / 2 : plotBottom - ((v - lo) / (hi - lo)) * (plotBottom - top));
  const fromY = dodge(items.map((it) => y(it.a)), LABEL_GAP, top, plotBottom);
  const toY = dodge(items.map((it) => y(it.b)), LABEL_GAP, top, plotBottom);

  const wrap = html(doc, "div", "fft-chart");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Slope chart of ${ctx.label(label)} from ${ctx.label(from)} to ${ctx.label(to)}`);
  for (const [x, field, anchor] of [
    [left, from, "end"],
    [right, to, "start"],
  ] as const) {
    chart.append(svg(doc, "line", { class: "fft-slope-axis", x1: x, x2: x, y1: top - 8, y2: plotBottom + 8 }));
    const head = svg(doc, "text", { class: "fft-slope-head", x, y: 13, "text-anchor": anchor });
    head.textContent = ctx.label(field);
    chart.append(head);
  }

  const groups: SVGGElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const group of groups) group.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  const tspans = (text: SVGTextElement, parts: [string, string][]) => {
    for (const [cls, content] of parts) {
      const span = svg(doc, "tspan", { class: cls });
      span.textContent = content;
      text.append(span);
    }
  };
  // Muted rows first, so the highlighted ones draw on top.
  const order = items.map((_, i) => i).sort((p, q) => Number(items[p]?.on) - Number(items[q]?.on));
  const hits: Element[] = [];
  items.forEach((it, i) => {
    const group = svg(doc, "g", { class: "fft-slope", "data-direction": it.direction, style: `--fft-i: ${i}` });
    if (!it.on) group.setAttribute("data-muted", "");
    const y1 = y(it.a);
    const y2 = y(it.b);
    const d = `M${left},${y1}L${right},${y2}`;
    group.append(svg(doc, "path", { class: "fft-slope-line", d, pathLength: 1 }));
    const end = svg(doc, "circle", { class: "fft-slope-dot", cx: right, cy: y2, r: 4 });
    group.append(svg(doc, "circle", { class: "fft-slope-dot", cx: left, cy: y1, r: 4 }), end);
    const before = svg(doc, "text", { class: "fft-slope-label fft-slope-label-from", x: left - 10, y: fromY[i] ?? y1, "text-anchor": "end", "dominant-baseline": "middle" });
    tspans(before, [
      ["fft-slope-name", it.name],
      ["fft-slope-value", it.fromText],
    ]);
    before.lastElementChild?.setAttribute("dx", "5");
    const after = svg(doc, "text", { class: "fft-slope-label fft-slope-label-to", x: right + 10, y: toY[i] ?? y2, "dominant-baseline": "middle" });
    tspans(after, [
      ["fft-slope-value", it.toText],
      ["fft-slope-name", it.name],
    ]);
    after.lastElementChild?.setAttribute("dx", "5");
    group.append(before, after);

    const tips: TooltipItem[] = [
      { label: ctx.label(from), value: it.fromText },
      { label: ctx.label(to), value: it.toText },
      ...(it.a !== 0 ? [{ label: "Change", value: change.format((it.b - it.a) / Math.abs(it.a)) }] : []),
    ];
    const hit = svg(doc, "path", { class: "fft-slope-hit", d, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${it.name}: ${tips.map((tip) => `${tip.label} ${tip.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const other of groups) other.removeAttribute("data-active");
      group.setAttribute("data-active", "");
      ctx.tooltip.show(end, it.name, tips);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    const row: Row = it.row;
    selectable(hit, () => ctx.select(row));
    group.append(hit);
    groups.push(group);
    hits.push(hit);
  });
  for (const i of order) chart.append(groups[i] as SVGGElement);
  roving(hits);
  wrap.append(chart);
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, rows, [label, from, to], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
