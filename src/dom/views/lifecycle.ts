import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { LifecycleView } from "../../core/views.ts";
import { fitLabels } from "../layout.ts";
import { buildTable, DAY, dayOf, fieldList, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const CHAR_WIDTH = 6;
const ROW = 30;
const GROUP_ROW = 24;

/** How deep a stage's tint is: the first stage light, the last full. */
export function stageTint(index: number, count: number): number {
  if (count <= 1) return 1;
  return Math.round((0.3 + 0.7 * (index / (count - 1))) * 100) / 100;
}

/**
 * Draws the `lifecycle` view: one row per item on a shared date axis. From each
 * stage's date to the next runs a segment in a deepening tint of the first
 * series color, a tick marks every stage date, and the last reached stage runs
 * on faintly to the edge while its next date is unknown. Groups get a heading
 * row, a status is written as a pill at the row's end, impact sets the row's
 * thickness, and an accent line marks today. Months or years tick along the
 * top as the span needs.
 */
export const renderLifecycle: ViewRenderer<LifecycleView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, group, status, impact, today } = ctx.view;
  const stages = fieldList(ctx.view.stages);
  const locale = ctx.spec.locale;
  const now = today === true ? dayOf(new Date()) : typeof today === "string" ? dayOf(today) : null;

  interface Item {
    row: Row;
    name: string;
    days: (number | null)[];
    kind: "group" | "row";
  }
  const items: Item[] = [];
  const groups: string[] = [];
  const rowsOf = new Map<string, Row[]>();
  for (const row of ctx.rows) {
    const days = stages.map((field) => dayOf(row[field]));
    if (days.every((d) => d === null)) continue;
    const key = group ? String(row[group]) : "";
    if (!groups.includes(key)) groups.push(key);
    rowsOf.set(key, [...(rowsOf.get(key) ?? []), row]);
  }
  for (const key of groups) {
    const rows = rowsOf.get(key) ?? [];
    if (group && groups.length > 1 && rows[0]) items.push({ row: rows[0], name: ctx.format(rows[0][group], group), days: [], kind: "group" });
    for (const row of rows) items.push({ row, name: ctx.format(row[label], label), days: stages.map((field) => dayOf(row[field])), kind: "row" });
  }
  const drawn = items.filter((it) => it.kind === "row");
  const allDays = drawn.flatMap((it) => it.days.filter((d): d is number => d !== null));
  if (now !== null) allDays.push(now);
  const first = Math.min(...allDays);
  const last = Math.max(...allDays);
  const pad = Math.max(7, Math.round((last - first) * 0.04));
  const lo = first - pad;
  const hi = last + pad;

  const statusTexts = status ? drawn.map((it) => ctx.format(it.row[status], status)) : [];
  const statusW = status ? Math.max(0, ...statusTexts.map((t) => t.length)) * CHAR_WIDTH + 12 : 0;
  const left = Math.max(55, Math.min(ctx.width * 0.34, Math.max(...items.map((it) => it.name.length)) * CHAR_WIDTH + 13));
  const margin = { top: 34, right: status ? statusW + 13 : 13, bottom: 8, left };
  const width = Math.max(ctx.width, left + margin.right + 144);
  const heights = items.map((it) => (it.kind === "group" ? GROUP_ROW : ROW));
  const height = margin.top + heights.reduce((a, b) => a + b, 0) + margin.bottom;
  const plotW = width - margin.left - margin.right;
  const plotRight = margin.left + plotW;
  const x = (day: number) => margin.left + ((day - lo) / (hi - lo)) * plotW;
  const bottom = height - margin.bottom;
  const thickness = (row: Row) => {
    const value = impact ? readNumber(row[impact]) : null;
    return value === null ? 11 : 5 + 2 * Math.max(1, Math.min(5, value));
  };

  const wrap = html(doc, "div", "fft-chart fft-lifecycle");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Lifecycle of ${ctx.label(label)} from ${ctx.label(stages[0] as string)} to ${ctx.label(stages.at(-1) as string)}`);

  // The date axis: a gridline per month with labels where they fit, or Januaries alone with the year over long spans.
  const monthName = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const monthYear = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" });
  const yearName = new Intl.DateTimeFormat(locale, { year: "numeric", timeZone: "UTC" });
  const months: number[] = [];
  const cursor = new Date(lo * DAY);
  for (let y = cursor.getUTCFullYear(), m = cursor.getUTCMonth(); ; m++) {
    const day = Date.UTC(y, m, 1) / DAY;
    if (day > hi) break;
    if (day >= lo) months.push(day);
  }
  const yearly = months.length > 30;
  const ticks = yearly ? months.filter((day) => new Date(day * DAY).getUTCMonth() === 0) : months;
  const tickText = ticks.map((day, i) => {
    const when = new Date(day * DAY);
    return yearly ? yearName.format(when) : (i === 0 || when.getUTCMonth() === 0 ? monthYear : monthName).format(when);
  });
  for (const day of ticks) chart.append(svg(doc, "line", { class: "fft-gridline", x1: x(day), x2: x(day), y1: margin.top - 8, y2: bottom }));
  for (const i of fitLabels(ticks.map((day, k) => ({ x: x(day) + 4, width: (tickText[k] ?? "").length * CHAR_WIDTH, anchor: "start" as const })))) {
    const text = svg(doc, "text", { class: "fft-tick fft-lc-tick-label", x: x(ticks[i] as number) + 4, y: 13 });
    text.textContent = tickText[i] ?? "";
    chart.append(text);
  }

  const longDate = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const dateText = (row: Row, field: string, day: number) => (ctx.spec.fields?.[field]?.format !== undefined ? ctx.format(row[field], field) : longDate.format(new Date(day * DAY)));
  const color = ctx.color(0);
  const lanes: SVGGElement[] = [];
  const hits: Element[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const lane of lanes) lane.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  let cursorY = margin.top;
  let n = 0;
  items.forEach((item) => {
    const rowH = item.kind === "group" ? GROUP_ROW : ROW;
    const cy = cursorY + rowH / 2;
    cursorY += rowH;
    if (item.kind === "group") {
      const heading = svg(doc, "text", { class: "fft-lc-group", x: margin.left - 13, y: cy + 4, "text-anchor": "end" });
      heading.textContent = item.name;
      chart.append(heading);
      chart.append(svg(doc, "line", { class: "fft-lc-group-rule", x1: margin.left, x2: plotRight, y1: cy + 4, y2: cy + 4 }));
      return;
    }
    const th = thickness(item.row);
    const g = svg(doc, "g", { class: "fft-lc-lane", style: `--fft-i: ${n++}` });
    const name = svg(doc, "text", { class: "fft-lc-label", x: margin.left - 13, y: cy, "text-anchor": "end", "dominant-baseline": "middle" });
    name.textContent = item.name;
    g.append(name);
    let anchor: SVGElement | undefined;
    item.days.forEach((day, s) => {
      if (day === null) return;
      const next = item.days.slice(s + 1).find((d): d is number => d !== null);
      const x0 = x(day);
      if (next !== undefined) {
        const seg = svg(doc, "rect", { class: "fft-lc-seg", x: x0, y: cy - th / 2, width: Math.max(2, x(next) - x0), height: th, "data-stage": s, "fill-opacity": stageTint(s, stages.length) });
        seg.style.setProperty("fill", color);
        g.append(seg);
        anchor ??= seg;
      } else if (x0 < plotRight - 1) {
        // The last reached stage runs on, faintly, until its next date is known.
        const open = svg(doc, "rect", { class: "fft-lc-open", x: x0, y: cy - th / 2, width: plotRight - x0, height: th, "data-stage": s });
        open.style.setProperty("fill", color);
        open.style.setProperty("stroke", color);
        g.append(open);
        anchor ??= open;
      }
      g.append(svg(doc, "line", { class: "fft-lc-tick", x1: x0, x2: x0, y1: cy - th / 2 - 3, y2: cy + th / 2 + 3 }));
    });
    if (status) {
      const text = statusTexts[drawn.indexOf(item)] ?? "";
      const pillW = text.length * CHAR_WIDTH + 12;
      const px = plotRight + 8;
      g.append(svg(doc, "rect", { class: "fft-lc-status", x: px, y: cy - 8, width: pillW, height: 16, rx: 8 }));
      const pill = svg(doc, "text", { class: "fft-lc-status-text", x: px + pillW / 2, y: cy, "text-anchor": "middle", "dominant-baseline": "central" });
      pill.textContent = text;
      g.append(pill);
    }
    const tooltip: TooltipItem[] = [];
    stages.forEach((field, s) => {
      const day = item.days[s];
      if (day !== null && day !== undefined) tooltip.push({ label: ctx.label(field), value: dateText(item.row, field, day), color: `color-mix(in srgb, ${color} ${Math.round(stageTint(s, stages.length) * 100)}%, var(--fft-surface))` });
    });
    if (now !== null) {
      const coming = stages.map((field, s) => ({ field, day: item.days[s] })).find((stage) => stage.day !== null && stage.day !== undefined && stage.day > now);
      if (coming) {
        const days = (coming.day as number) - now;
        tooltip.push({ label: "Next", value: `${ctx.label(coming.field)} in ${days} ${days === 1 ? "day" : "days"}` });
      }
    }
    if (status) tooltip.push({ label: ctx.label(status), value: ctx.format(item.row[status], status) });
    if (impact) tooltip.push({ label: ctx.label(impact), value: ctx.format(item.row[impact], impact) });
    const hit = svg(doc, "rect", { class: "fft-lc-hit", x: 0, y: cy - rowH / 2, width, height: rowH, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${item.name}: ${tooltip.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const other of lanes) other.removeAttribute("data-active");
      g.setAttribute("data-active", "");
      ctx.tooltip.show(anchor ?? hit, item.name, tooltip);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    const row = item.row;
    selectable(hit, () => ctx.select(row));
    g.append(hit);
    chart.append(g);
    lanes.push(g);
    hits.push(hit);
  });

  if (now !== null && now >= lo && now <= hi) {
    const tx = x(now);
    chart.append(svg(doc, "line", { class: "fft-gantt-today", x1: tx, x2: tx, y1: margin.top - 6, y2: bottom }));
    const text = svg(doc, "text", { class: "fft-gantt-today-label", x: tx, y: margin.top - 10, "text-anchor": "middle" });
    text.textContent = "Today";
    chart.append(text);
  }
  roving(hits);
  wrap.append(chart);

  // The key: each stage's tint, and what a thicker row means.
  if (!ctx.inFacet) {
    const legend = html(doc, "ul", "fft-legend fft-lc-key");
    stages.forEach((field, s) => {
      const swatch = html(doc, "span", "fft-swatch");
      swatch.dataset.shape = "rect";
      swatch.style.background = `color-mix(in srgb, ${color} ${Math.round(stageTint(s, stages.length) * 100)}%, var(--fft-surface))`;
      swatch.setAttribute("aria-hidden", "true");
      const li = html(doc, "li");
      li.append(swatch, ctx.label(field));
      legend.append(li);
    });
    const open = html(doc, "span", "fft-swatch fft-lc-key-open");
    open.setAttribute("aria-hidden", "true");
    open.style.setProperty("--fft-lc-color", color);
    const li = html(doc, "li");
    li.append(open, "Still running");
    legend.append(li);
    wrap.append(legend);
    if (impact) wrap.append(html(doc, "p", "fft-lc-note", `Thicker rows: higher ${ctx.label(impact).toLowerCase()}.`));
  }
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, drawn.map((it) => it.row), [label, ...stages, ...(status ? [status] : []), ...(group ? [group] : []), ...(impact ? [impact] : [])], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
