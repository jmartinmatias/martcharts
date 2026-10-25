import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { BumpView } from "../../core/views.ts";
import { fitLabels } from "../layout.ts";
import { DEEMPHASIS, highlights } from "./chart.ts";
import { buildTable, CHAR_WIDTH, html, ROW, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

/** Height of one rank row: a Fibonacci step, enough for a label and a ringed dot. */
const LANE: number = ROW.roomy;

interface Point {
  period: number;
  rank: number;
  row: Row;
}

/** A smooth bump path: each step leaves and arrives level, so rank changes read as S-curves. */
function bumpPath(points: { x: number; y: number }[]): string {
  return points
    .map((p, i) => {
      if (i === 0) return `M${p.x},${p.y}`;
      const prev = points[i - 1] as { x: number; y: number };
      const mid = (prev.x + p.x) / 2;
      return `C${mid},${prev.y} ${mid},${p.y} ${p.x},${p.y}`;
    })
    .join("");
}

/**
 * Draws the `bump` view: in every period the series are ranked by value,
 * highest first, and each series is one smooth line through its ranks. Every
 * line is named at both ends with its rank there, so identity never rests on
 * color alone and no separate legend is needed.
 */
export const renderBump: ViewRenderer<BumpView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { x, series, value } = ctx.view;
  const picked = highlights(ctx.view.highlight);

  const periods: { key: string; text: string }[] = [];
  const names: string[] = [];
  const byPeriod = new Map<string, { name: string; amount: number; row: Row }[]>();
  for (const row of ctx.rows) {
    const amount = readNumber(row[value]);
    if (amount === null) continue;
    const key = JSON.stringify(row[x]);
    const name = String(row[series]);
    if (!byPeriod.has(key)) {
      byPeriod.set(key, []);
      periods.push({ key, text: ctx.format(row[x], x) });
    }
    if (!names.includes(name)) names.push(name);
    byPeriod.get(key)?.push({ name, amount, row });
  }
  const points = new Map<string, Point[]>(names.map((name) => [name, []]));
  periods.forEach((period, p) => {
    const ranked = [...(byPeriod.get(period.key) ?? [])].sort((a, b) => b.amount - a.amount);
    ranked.forEach((entry, i) => points.get(entry.name)?.push({ period: p, rank: i + 1, row: entry.row }));
  });

  const nameWidth = Math.max(...names.map((name) => ctx.format(name, series).length)) + 3;
  const nameRoom = nameWidth * CHAR_WIDTH + 13;
  // In a narrow card the left labels shrink to the rank alone; the names stay on the right.
  const compact = ctx.width < nameRoom * 2 + 144;
  const margin = { top: 13, bottom: 26, left: compact ? (String(names.length).length + 1) * CHAR_WIDTH + 13 : nameRoom, right: nameRoom };
  const width = Math.max(ctx.width, margin.left + margin.right + 89);
  const height = Math.max(ctx.height, margin.top + margin.bottom + names.length * LANE);
  const plotW = width - margin.left - margin.right;
  const rowGap = (height - margin.top - margin.bottom) / Math.max(1, names.length);
  const px = (p: number) => (periods.length > 1 ? margin.left + (p * plotW) / (periods.length - 1) : margin.left + plotW / 2);
  const py = (rank: number) => margin.top + (rank - 0.5) * rowGap;

  const wrap = html(doc, "div", "fft-chart");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Bump chart of ${ctx.label(series)} rank by ${ctx.label(value)} over ${ctx.label(x)}`);
  periods.forEach((_, p) => chart.append(svg(doc, "line", { class: "fft-gridline", x1: px(p), x2: px(p), y1: margin.top, y2: height - margin.bottom })));
  // Period labels where they fit, always including the last.
  for (const p of fitLabels(periods.map((period, i) => ({ x: px(i), width: period.text.length * CHAR_WIDTH })), { keepLast: true })) {
    const label = svg(doc, "text", { class: "fft-tick fft-tick-x", x: px(p), y: height - 8, "text-anchor": "middle" });
    label.textContent = periods[p]?.text ?? "";
    chart.append(label);
  }

  const groups: SVGGElement[] = [];
  const hits: Element[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const group of groups) group.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  const label = (cls: string, at: { x: number; y: number }, anchor: "start" | "end", parts: [string, string][]) => {
    const text = svg(doc, "text", { class: `fft-bump-label ${cls}`, x: at.x, y: at.y, "text-anchor": anchor, "dominant-baseline": "middle" });
    parts.forEach(([partClass, content], i) => {
      const span = svg(doc, "tspan", { class: partClass });
      if (i > 0) span.setAttribute("dx", "5");
      span.textContent = content;
      text.append(span);
    });
    return text;
  };
  names.forEach((name, s) => {
    const track = points.get(name) ?? [];
    const first = track[0];
    const last = track.at(-1);
    if (!first || !last) return;
    const on = picked.length === 0 || picked.includes(name);
    const color = on ? ctx.color(s) : DEEMPHASIS;
    const shown = ctx.format(name, series);
    const group = svg(doc, "g", { class: "fft-bump", "data-series": name, style: `--fft-i: ${s}` });
    if (!on) group.setAttribute("data-muted", "");
    const coords = track.map((point) => ({ x: px(point.period), y: py(point.rank) }));
    const d = bumpPath(coords);
    const line = svg(doc, "path", { class: "fft-bump-line", d, pathLength: 1 });
    line.style.stroke = color;
    group.append(line);
    let end: SVGCircleElement | undefined;
    for (const at of coords) {
      end = svg(doc, "circle", { class: "fft-bump-dot", cx: at.x, cy: at.y, r: 4 });
      end.style.fill = color;
      group.append(end);
    }
    const start = coords[0] as { x: number; y: number };
    const finish = coords.at(-1) as { x: number; y: number };
    group.append(
      label("fft-bump-label-from", { x: start.x - 10, y: start.y }, "end", compact ? [["fft-bump-rank", String(first.rank)]] : [
        ["fft-bump-name", shown],
        ["fft-bump-rank", String(first.rank)],
      ]),
      label("fft-bump-label-to", { x: finish.x + 10, y: finish.y }, "start", [
        ["fft-bump-rank", String(last.rank)],
        ["fft-bump-name", shown],
      ]),
    );

    const lastText = periods[last.period]?.text ?? "";
    const tips: TooltipItem[] = [
      { label: periods[first.period]?.text ?? "", value: `#${first.rank}` },
      ...(track.length > 1 ? [{ label: lastText, value: `#${last.rank}` }] : []),
      { label: ctx.label(value), value: ctx.format(last.row[value], value), color },
    ];
    const hit = svg(doc, "path", { class: "fft-bump-hit", d: track.length > 1 ? d : `${d}h0.01`, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${shown}: ${tips.map((tip) => `${tip.label} ${tip.value}`).join(", ")}`);
    const anchor = end as SVGCircleElement;
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const other of groups) other.removeAttribute("data-active");
      group.setAttribute("data-active", "");
      ctx.tooltip.show(anchor, shown, tips);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    const latest = last.row;
    selectable(hit, () => ctx.select(latest));
    group.append(hit);
    groups.push(group);
    hits.push(hit);
  });
  // Muted series first, so the highlighted ones draw on top.
  for (const group of [...groups].sort((a, b) => Number(!a.hasAttribute("data-muted")) - Number(!b.hasAttribute("data-muted")))) chart.append(group);
  roving(hits);
  wrap.append(chart);
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, ctx.rows, [x, series, value], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
