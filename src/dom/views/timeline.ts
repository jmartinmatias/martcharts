import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { TimelineView } from "../../core/views.ts";
import { fitLabels } from "../layout.ts";
import { buildTable, DAY, dayOf, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const CHAR_WIDTH = 6;
const ROW = 34;
const BAR = 13;

/**
 * Draws the `timeline` view: one row per task, a rounded bar from its start to
 * its end on a shared date axis, or a diamond for a milestone. Months are
 * ticked along the top (the first and every January with the year), and an
 * optional accent line marks today. Groups color the bars.
 */
export const renderTimeline: ViewRenderer<TimelineView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, start, end, group, today, progress } = ctx.view;
  const percent = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0 });
  /** Share done, 0 to 1; values above 1 are percentages. */
  const doneOf = (row: Row) => {
    const value = progress ? readNumber(row[progress]) : null;
    return value === null ? null : Math.max(0, Math.min(1, value > 1 ? value / 100 : value));
  };
  const groups: string[] = [];
  const tasks: { row: Row; from: number; to: number | null; name: string; g: number }[] = [];
  for (const row of ctx.rows) {
    const from = dayOf(row[start]);
    if (from === null) continue;
    const key = group ? String(row[group]) : "";
    if (!groups.includes(key)) groups.push(key);
    tasks.push({ row, from, to: end ? dayOf(row[end]) : null, name: ctx.format(row[label], label), g: groups.indexOf(key) });
  }
  const days = tasks.flatMap((t) => (t.to === null ? [t.from] : [t.from, t.to]));
  const first = Math.min(...days);
  const last = Math.max(...days);
  const pad = Math.max(1, Math.round((last - first) * 0.03));
  const lo = first - pad;
  const hi = last + pad;

  const left = Math.max(55, Math.max(...tasks.map((t) => t.name.length)) * CHAR_WIDTH + 13);
  // With progress, the right margin holds the "100%" after a bar that ends at the edge.
  const margin = { top: 34, right: progress ? 41 : 13, bottom: 8, left };
  const width = Math.max(ctx.width, left + 144);
  const height = margin.top + tasks.length * ROW + margin.bottom;
  const plotW = width - margin.left - margin.right;
  const x = (day: number) => margin.left + ((day - lo) / (hi - lo)) * plotW;
  const bottom = height - margin.bottom;

  const wrap = html(doc, "div", "fft-chart");
  if (group && groups.length > 1) {
    const legend = html(doc, "ul", "fft-legend");
    groups.forEach((name, i) => {
      const swatch = html(doc, "span", "fft-swatch");
      swatch.dataset.shape = "rect";
      swatch.style.background = ctx.color(i);
      swatch.setAttribute("aria-hidden", "true");
      const item = html(doc, "li");
      item.append(swatch, ctx.format(name, group));
      legend.append(item);
    });
    wrap.append(legend);
  }
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Timeline of ${ctx.label(label)} from ${ctx.label(start)}${end ? ` to ${ctx.label(end)}` : ""}`);

  // Month ticks; quarters only when months would crowd.
  const locale = ctx.spec.locale;
  const monthName = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const monthYear = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" });
  const months: number[] = [];
  const cursor = new Date(lo * DAY);
  for (let y = cursor.getUTCFullYear(), m = cursor.getUTCMonth(); ; m++) {
    const day = Date.UTC(y, m, 1) / DAY;
    if (day > hi) break;
    if (day >= lo) months.push(day);
  }
  // A gridline per month; labels where they fit (the first and every January with the year).
  const tickText = months.map((day, i) => {
    const when = new Date(day * DAY);
    return (i === 0 || when.getUTCMonth() === 0 ? monthYear : monthName).format(when);
  });
  for (const day of months) chart.append(svg(doc, "line", { class: "fft-gridline", x1: x(day), x2: x(day), y1: margin.top - 8, y2: bottom }));
  for (const i of fitLabels(months.map((day, k) => ({ x: x(day) + 4, width: (tickText[k] ?? "").length * CHAR_WIDTH, anchor: "start" as const })))) {
    const text = svg(doc, "text", { class: "fft-tick fft-gantt-tick", x: x(months[i] as number) + 4, y: 13 });
    text.textContent = tickText[i] ?? "";
    chart.append(text);
  }

  const longDate = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const dateText = (row: Row, field: string, day: number) => (ctx.spec.fields?.[field]?.format !== undefined ? ctx.format(row[field], field) : longDate.format(new Date(day * DAY)));
  const rows: SVGGElement[] = [];
  const hits: Element[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const row of rows) row.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  tasks.forEach((task, i) => {
    const cy = margin.top + i * ROW + ROW / 2;
    const color = ctx.color(task.g);
    const g = svg(doc, "g", { class: "fft-gantt", style: `--fft-i: ${i}` });
    const name = svg(doc, "text", { class: "fft-gantt-label", x: margin.left - 13, y: cy, "text-anchor": "end", "dominant-baseline": "middle" });
    name.textContent = task.name;
    g.append(name);
    let anchor: SVGElement;
    if (task.to === null) {
      const mx = x(task.from);
      anchor = svg(doc, "path", { class: "fft-gantt-milestone", d: `M${mx},${cy - 7}L${mx + 7},${cy}L${mx},${cy + 7}L${mx - 7},${cy}Z` });
    } else {
      const x0 = x(Math.min(task.from, task.to));
      const barWidth = Math.max(3, Math.abs(x(task.to) - x(task.from)));
      anchor = svg(doc, "rect", { class: "fft-gantt-bar", x: x0, y: cy - BAR / 2, width: barWidth, height: BAR, rx: 4 });
      const done = doneOf(task.row);
      if (done !== null) {
        // The bar becomes a faint track, filled solid as far as the work is done.
        anchor.setAttribute("data-tracked", "");
        if (done > 0) {
          const fill = svg(doc, "rect", { class: "fft-gantt-done", x: x0, y: cy - BAR / 2, width: barWidth * done, height: BAR, rx: 4, "data-progress": Math.round(done * 100) / 100 });
          fill.style.fill = color;
          g.append(fill);
        }
        const note = svg(doc, "text", { class: "fft-gantt-progress", x: x0 + barWidth + 8, y: cy, "dominant-baseline": "middle" });
        note.textContent = percent.format(done);
        g.append(note);
      }
    }
    anchor.style.fill = color;
    g.insertBefore(anchor, g.querySelector(".fft-gantt-done, .fft-gantt-progress"));

    const items: TooltipItem[] = [{ label: ctx.label(start), value: dateText(task.row, start, task.from), color }];
    if (task.to !== null && end) {
      const length = task.to - task.from;
      items.push({ label: ctx.label(end), value: dateText(task.row, end, task.to) }, { label: "Duration", value: `${length} ${Math.abs(length) === 1 ? "day" : "days"}` });
    }
    if (group) items.push({ label: ctx.label(group), value: ctx.format(task.row[group], group) });
    const done = doneOf(task.row);
    if (done !== null && task.to !== null) items.push({ label: "Progress", value: percent.format(done) });
    const hit = svg(doc, "rect", { class: "fft-gantt-hit", x: 0, y: cy - ROW / 2, width, height: ROW, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${task.name}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const other of rows) other.removeAttribute("data-active");
      g.setAttribute("data-active", "");
      ctx.tooltip.show(anchor, task.name, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    const row = task.row;
    selectable(hit, () => ctx.select(row));
    g.append(hit);
    chart.append(g);
    rows.push(g);
    hits.push(hit);
  });

  const now = today === true ? dayOf(new Date()) : typeof today === "string" ? dayOf(today) : null;
  if (now !== null && now >= lo && now <= hi) {
    const tx = x(now);
    chart.append(svg(doc, "line", { class: "fft-gantt-today", x1: tx, x2: tx, y1: margin.top - 6, y2: bottom }));
    const text = svg(doc, "text", { class: "fft-gantt-today-label", x: tx, y: margin.top - 10, "text-anchor": "middle" });
    text.textContent = "Today";
    chart.append(text);
  }

  roving(hits);
  wrap.append(chart);
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, tasks.map((t) => t.row), [label, start, ...(end ? [end] : []), ...(group ? [group] : [])], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
