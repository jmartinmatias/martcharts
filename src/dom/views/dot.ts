import { readNumber } from "../../core/formats.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { DotView } from "../../core/views.ts";
import { linearScale } from "../layout.ts";
import { DEEMPHASIS, highlights, tickFormatter } from "./chart.ts";
import { buildTable, CHAR_WIDTH, fieldList, html, legendList, rowHeight, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

/** Dot radius: one measure gets a slightly bigger dot, several stay small so they can sit close. */
const RADIUS = { one: 6, many: 5 };
/** The widest a name column may grow, as a share of the card, before names are cut with an ellipsis. */
const NAME_SHARE = 0.38;

/** A name cut to `max` characters with an ellipsis, or whole when it fits. */
function clip(name: string, max: number): string {
  return name.length <= max ? name : `${name.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

/**
 * Draws the `dot` view, a dot plot: one row per data row with its name on the
 * left, a hairline across, and one dot per measure at its value on one shared
 * axis. One measure writes its value beside the dot; several take series
 * colors and a legend. `highlight` keeps the named rows in color and greys
 * the rest. Small multiples pass a shared extent, so every panel's axis agrees.
 */
export const renderDot: ViewRenderer<DotView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label } = ctx.view;
  const measures = fieldList(ctx.view.values);
  const picked = highlights(ctx.view.highlight);
  const rows = ctx.rows;
  // Rows tighten as the list grows: roomy up to 8, regular to 16, compact past that (the shared row scale).
  const LANE = rowHeight(rows.length);
  const values = rows.map((row) => measures.map((field) => readNumber(row[field])));
  const present = values.flat().filter((n): n is number => n !== null);
  if (ctx.extent) present.push(...ctx.extent);
  const single = measures.length === 1;
  const radius = single ? RADIUS.one : RADIUS.many;

  const names = rows.map((row) => ctx.format(row[label], label));
  const valueTexts = rows.map((row, i) => measures.map((field, m) => (values[i]?.[m] === null ? "" : ctx.format(row[field], field))));
  // Margins: names on the left (cut past a share of the card), the value beside a lone dot on the right.
  const maxChars = Math.max(4, Math.floor((ctx.width * NAME_SHARE) / CHAR_WIDTH));
  const shown = names.map((name) => clip(name, maxChars));
  const left = Math.max(34, Math.max(0, ...shown.map((n) => n.length)) * CHAR_WIDTH + 13);
  const valueRoom = single ? Math.max(0, ...valueTexts.map((t) => (t[0] ?? "").length)) * CHAR_WIDTH + radius + 13 : radius + 8;
  const margin = { top: 5, right: Math.max(13, valueRoom), bottom: 26, left };
  const width = Math.max(ctx.width, left + margin.right + 89);
  const plotBottom = margin.top + rows.length * LANE;
  const height = plotBottom + margin.bottom;
  const x = linearScale(present, [margin.left, width - margin.right], { includeZero: false });
  const tickText = tickFormatter(ctx, measures[0], x.ticks);
  const colorOf = (i: number, m: number) => (picked.length === 0 || picked.includes(String(rows[i]?.[label])) ? ctx.color(m) : DEEMPHASIS);

  const wrap = html(doc, "div", "fft-chart fft-dots");
  const key = single ? undefined : legendList(ctx, measures.map((field, m) => ({ label: ctx.label(field), color: ctx.color(m), shape: "dot" as const })));
  if (key) wrap.append(key);

  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Dot plot of ${measures.map((field) => ctx.label(field)).join(", ")} by ${ctx.label(label)}`);
  for (const tick of x.ticks) {
    const tx = x(tick);
    chart.append(svg(doc, "line", { class: "fft-gridline", x1: tx, x2: tx, y1: margin.top, y2: plotBottom }));
    const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: tx, y: plotBottom + 18, "text-anchor": "middle" });
    text.textContent = tickText(tick);
    chart.append(text);
  }

  const groups: SVGGElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const group of groups) group.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  rows.forEach((row, i) => {
    const cy = margin.top + i * LANE + LANE / 2;
    const name = names[i] ?? "";
    const group = svg(doc, "g", { class: "fft-dot-row", style: `--fft-i: ${i}` });
    const text = svg(doc, "text", { class: "fft-dot-label", x: margin.left - 13, y: cy, "text-anchor": "end", "dominant-baseline": "middle" });
    text.textContent = shown[i] ?? name;
    if (shown[i] !== name) text.setAttribute("aria-label", name);
    group.append(text);
    group.append(svg(doc, "line", { class: "fft-dot-line", x1: margin.left, x2: width - margin.right, y1: cy, y2: cy }));
    const items: TooltipItem[] = [];
    let anchor: SVGElement | undefined;
    // Dots in value order, the biggest first, so a smaller dot never hides under a bigger one that shares its spot.
    const order = measures.map((_, m) => m).filter((m) => values[i]?.[m] !== null).sort((a, b) => (values[i]?.[b] as number) - (values[i]?.[a] as number));
    for (const m of order) {
      const amount = values[i]?.[m] as number;
      const color = colorOf(i, m);
      const mark = svg(doc, "circle", { class: "fft-dot-mark", cx: x(amount), cy, r: radius });
      mark.style.setProperty("fill", color);
      group.append(mark);
      anchor = anchor ?? mark;
      items.push({ label: ctx.label(measures[m] as string), value: valueTexts[i]?.[m] ?? "", color });
    }
    if (single && order.length) {
      const amount = values[i]?.[0] as number;
      const value = svg(doc, "text", { class: "fft-dot-value", x: x(amount) + radius + 6, y: cy, "dominant-baseline": "middle" });
      value.textContent = valueTexts[i]?.[0] ?? "";
      group.append(value);
    }
    const hit = svg(doc, "rect", { class: "fft-dot-hit", x: 0, y: cy - LANE / 2, width, height: LANE, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${name}: ${items.length ? items.map((it) => `${it.label} ${it.value}`).join(", ") : "no value"}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const other of groups) other.removeAttribute("data-active");
      group.setAttribute("data-active", "");
      if (anchor) ctx.tooltip.show(anchor, name, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    selectable(hit, () => ctx.select(row));
    group.append(hit);
    groups.push(group);
    chart.append(group);
  });
  roving([...chart.querySelectorAll(".fft-dot-hit")]);
  wrap.append(chart);
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, rows, [label, ...measures], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
