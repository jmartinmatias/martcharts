import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { LifecycleView } from "../../core/views.ts";
import { fitLabels } from "../layout.ts";
import { DAY, ROW, activeGroup, dayOf, fieldList, hiddenTableOf, html, legendList, roving, rowHit, svg, textWidth } from "./shared.ts";
import { DEEMPHASIS, highlights } from "./chart.ts";
import { edgeAnchor, edgeX, fitLabel, nameColumn, writeLabel } from "./label-fit.ts";
import { wordsFor } from "./words.ts";

const LANE: number = ROW.roomy;
const GROUP_ROW: number = ROW.group;

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
  const pillWidth = (text: string) => textWidth(text, 10, 600) + 12;
  const pillsW = status ? Math.max(0, ...statusTexts.map(pillWidth)) : 0;
  // The names' measured column (group headings in bold too), cut with an ellipsis past a third of the card.
  const boldest = Math.max(0, ...items.filter((it) => it.kind === "group").map((it) => Math.ceil(textWidth(it.name, 11, 600)) + 9));
  const column = nameColumn(items.filter((it) => it.kind === "row").map((it) => it.name), ctx.width, { min: Math.max(55, Math.min(boldest, ctx.width * 0.34)) });
  const headings = items.map((it) => (it.kind === "group" ? fitLabel(it.name, column.width - 8, 11, 600) : ""));
  const left = column.width + 8;
  // On a narrow card the names, the status pills and a 144px plot do not all fit: the status shrinks to a dot (its
  // words stay in the tooltip and the row's label) and the plot may narrow to 89px, so the chart never outgrows the card.
  const compactStatus = Boolean(status) && left + pillsW + 13 + 144 > ctx.width;
  const statusW = compactStatus ? 10 : pillsW;
  const margin = { top: 34, right: status ? statusW + 13 : 13, bottom: 8, left };
  const width = Math.max(ctx.width, left + margin.right + 89);
  const heights = items.map((it) => (it.kind === "group" ? GROUP_ROW : LANE));
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
  chart.setAttribute("aria-label", wordsFor(ctx).aria.lifecycle(ctx.label(label), ctx.label(stages[0] as string), ctx.label(stages.at(-1) as string)));

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
  for (const i of fitLabels(ticks.map((day, k) => ({ x: x(day) + 4, width: textWidth(tickText[k] ?? ""), anchor: "start" as const })))) {
    const text = svg(doc, "text", { class: "fft-tick fft-lc-tick-label", x: x(ticks[i] as number) + 4, y: 13 });
    text.textContent = tickText[i] ?? "";
    chart.append(text);
  }

  const longDate = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const dateText = (row: Row, field: string, day: number) => (ctx.spec.fields?.[field]?.format !== undefined ? ctx.format(row[field], field) : longDate.format(new Date(day * DAY)));
  const base = ctx.colorOf?.(stages[0]) ?? ctx.color(0);
  const lanes: SVGGElement[] = [];
  const hits: Element[] = [];
  const active = activeGroup(wrap, ctx.tooltip);
  // highlight keeps the named rows in color and steps the rest back to grey, as on hbar and dot.
  const picked = highlights((ctx.view as { highlight?: unknown }).highlight);
  let cursorY = margin.top;
  let n = 0;
  items.forEach((item, k) => {
    const rowH = item.kind === "group" ? GROUP_ROW : LANE;
    const cy = cursorY + rowH / 2;
    cursorY += rowH;
    if (item.kind === "group") {
      const heading = svg(doc, "text", { class: "fft-lc-group", x: column.end, y: cy + 4, "text-anchor": "end" });
      writeLabel(heading, headings[k] ?? item.name, item.name);
      chart.append(heading);
      chart.append(svg(doc, "line", { class: "fft-lc-group-rule", x1: margin.left, x2: plotRight, y1: cy + 4, y2: cy + 4 }));
      return;
    }
    const th = thickness(item.row);
    const muted = picked.length > 0 && !picked.includes(String(item.row[label]));
    const color = muted ? DEEMPHASIS : base;
    const g = svg(doc, "g", { class: "fft-lc-lane", style: `--fft-i: ${n++}` });
    if (muted) g.dataset.muted = "";
    const name = svg(doc, "text", { class: "fft-lc-label", x: column.end, y: cy, "text-anchor": "end", "dominant-baseline": "middle" });
    writeLabel(name, fitLabel(item.name, column.width - 7.5), item.name);
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
      const px = plotRight + 8;
      if (compactStatus) {
        const dot = svg(doc, "circle", { class: "fft-lc-status fft-lc-status-dot", cx: px + 5, cy, r: 5 });
        const title = svg(doc, "title");
        title.textContent = text;
        dot.append(title);
        g.append(dot);
      } else {
        const pillW = pillWidth(text);
        g.append(svg(doc, "rect", { class: "fft-lc-status", x: px, y: cy - 8, width: pillW, height: 16, rx: 8 }));
        const pill = svg(doc, "text", { class: "fft-lc-status-text", x: px + pillW / 2, y: cy, "text-anchor": "middle", "dominant-baseline": "central" });
        pill.textContent = text;
        g.append(pill);
      }
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
        tooltip.push({ label: wordsFor(ctx).next, value: wordsFor(ctx).nextIn(ctx.label(coming.field), wordsFor(ctx).days(days)) });
      }
    }
    if (status) tooltip.push({ label: ctx.label(status), value: ctx.format(item.row[status], status) });
    if (impact) tooltip.push({ label: ctx.label(impact), value: ctx.format(item.row[impact], impact) });
    const hit = svg(doc, "rect", { class: "fft-lc-hit", x: 0, y: cy - rowH / 2, width, height: rowH });
    hits.push(rowHit(ctx, { node: hit, row: item.row, name: item.name, items: tooltip, anchor: anchor ?? name, active: g, group: active }));
    g.append(hit);
    chart.append(g);
    lanes.push(g);
  });

  if (now !== null && now >= lo && now <= hi) {
    const tx = x(now);
    chart.append(svg(doc, "line", { class: "fft-gantt-today", x1: tx, x2: tx, y1: margin.top - 6, y2: bottom }));
    const anchor = edgeAnchor(tx, wordsFor(ctx).today, width, 10, 600);
    const text = svg(doc, "text", { class: "fft-gantt-today-label", x: edgeX(tx, anchor, width), y: margin.top - 10, "text-anchor": anchor });
    text.textContent = wordsFor(ctx).today;
    chart.append(text);
  }
  roving(hits);
  wrap.append(chart);

  // The key: each stage's tint, and what a thicker row means.
  if (!ctx.inFacet) {
    const tints = stages.map((field, s) => ({ label: ctx.label(field), color: `color-mix(in srgb, ${base} ${Math.round(stageTint(s, stages.length) * 100)}%, var(--fft-surface))` }));
    const legend = legendList(ctx, [...tints, { label: wordsFor(ctx).stillRunning, color: "" }]);
    if (legend) {
      legend.classList.add("fft-lc-key");
      const open = legend.querySelectorAll<HTMLElement>(".fft-swatch")[stages.length];
      if (open) {
        open.classList.add("fft-lc-key-open");
        open.style.removeProperty("background");
        open.style.setProperty("--fft-lc-color", base);
      }
      // Above the lanes, as every row view's key.
      wrap.prepend(legend);
    }
    if (impact) wrap.append(html(doc, "p", "fft-lc-note", wordsFor(ctx).thickerRows(ctx.label(impact).toLowerCase())));
  }
  wrap.append(hiddenTableOf(ctx, drawn.map((it) => it.row), [label, ...stages, ...(status ? [status] : []), ...(group ? [group] : []), ...(impact ? [impact] : [])]));
  ctx.el.append(wrap);
};
