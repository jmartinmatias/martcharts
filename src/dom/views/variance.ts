import { minusFormat } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { VarianceView } from "../../core/views.ts";
import { buildTable, CHAR_WIDTH, html, ROW, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const LANE: number = ROW.roomy;
const BAR = 21;
const RADIUS = 2;

/** A horizontal bar from `from` to `to`, rounded only at its data end (`to`). */
function varianceBar(from: number, to: number, y: number): string {
  const r = Math.min(RADIUS, Math.abs(to - from), BAR / 2);
  const dir = to >= from ? 1 : -1;
  const edge = to - dir * r;
  return `M${from},${y}H${edge}A${r},${r} 0 0 ${dir > 0 ? 1 : 0} ${to},${y + r}V${y + BAR - r}A${r},${r} 0 0 ${dir > 0 ? 1 : 0} ${edge},${y + BAR}H${from}Z`;
}

/**
 * Draws the `variance` view: per row, a bar from a zero line to actual minus
 * plan, right when over plan and left when under, as in financial reporting.
 * Bars are colored by whether the variance is good or bad (`goodWhen`), and
 * every variance is written with its sign, so color is never the only signal.
 */
export const renderVariance: ViewRenderer<VarianceView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, value, target, percent = false, goodWhen = "up" } = ctx.view;
  const share = minusFormat(new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }));
  const items = ctx.rows.flatMap((row) => {
    const actual = readNumber(row[value]);
    const plan = readNumber(row[target]);
    if (actual === null || plan === null) return [];
    const delta = actual - plan;
    const relative = plan !== 0 ? delta / Math.abs(plan) : null;
    const signed = `${delta > 0 ? "+" : delta < 0 ? "\u2212" : ""}${ctx.format(Math.abs(delta), value)}`;
    return [{ row, delta, relative, measure: percent ? (relative ?? 0) : delta, signed, rel: relative === null ? "" : share.format(relative), name: ctx.format(row[label], label) }];
  });
  const text = (it: (typeof items)[number]) => (percent ? it.rel : it.signed);

  const low = Math.min(0, ...items.map((it) => it.measure));
  const high = Math.max(0, ...items.map((it) => it.measure));
  const labelRoom = Math.max(...items.map((it) => text(it).length)) * CHAR_WIDTH + 8;
  const left = Math.max(55, Math.max(...items.map((it) => it.name.length)) * CHAR_WIDTH + 21);
  const width = Math.max(ctx.width, left + 144);
  const height = items.length * LANE + 8;
  // Room for a value label beyond each end that has bars.
  const plotLeft = left + (low < 0 ? labelRoom : 0);
  const plotRight = width - 13 - (high > 0 ? labelRoom : 0);
  const x = (v: number) => (high === low ? (plotLeft + plotRight) / 2 : plotLeft + ((v - low) / (high - low)) * (plotRight - plotLeft));
  const zero = x(0);

  const wrap = html(doc, "div", "fft-chart");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Variance of ${ctx.label(value)} against ${ctx.label(target)} by ${ctx.label(label)}`);
  const groups: SVGGElement[] = [];
  const hits: Element[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const group of groups) group.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  items.forEach((it, i) => {
    const top = 4 + i * LANE;
    const cy = top + LANE / 2;
    const tone = it.delta === 0 ? "even" : (it.delta > 0) === (goodWhen === "up") ? "good" : "bad";
    const g = svg(doc, "g", { class: "fft-var", "data-tone": tone, style: `--fft-i: ${i}` });
    const name = svg(doc, "text", { class: "fft-var-label", x: left - 21, y: cy, "text-anchor": "end", "dominant-baseline": "middle" });
    name.textContent = it.name;
    g.append(name);
    const end = x(it.measure);
    let anchor: SVGElement = name;
    if (it.measure !== 0) {
      anchor = svg(doc, "path", { class: "fft-var-bar", d: varianceBar(zero, end, cy - BAR / 2) });
      g.append(anchor);
    }
    const after = it.measure >= 0;
    const note = svg(doc, "text", { class: "fft-var-value", x: after ? end + 6 : end - 6, y: cy, "text-anchor": after ? "start" : "end", "dominant-baseline": "middle" });
    note.textContent = text(it);
    g.append(note);

    const tips: TooltipItem[] = [
      { label: ctx.label(value), value: ctx.format(it.row[value], value) },
      { label: ctx.label(target), value: ctx.format(it.row[target], target) },
      { label: "Variance", value: it.signed },
      ...(it.rel ? [{ label: `vs ${ctx.label(target).toLowerCase()}`, value: it.rel }] : []),
    ];
    const hit = svg(doc, "rect", { class: "fft-var-hit", x: 0, y: top, width, height: LANE, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${it.name}: ${tips.map((tip) => `${tip.label} ${tip.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const other of groups) other.removeAttribute("data-active");
      g.setAttribute("data-active", "");
      ctx.tooltip.show(anchor, it.name, tips);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    const row: Row = it.row;
    selectable(hit, () => ctx.select(row));
    g.append(hit);
    chart.append(g);
    groups.push(g);
    hits.push(hit);
  });
  chart.append(svg(doc, "line", { class: "fft-var-zero", x1: zero, x2: zero, y1: 0, y2: height }));
  roving(hits);
  wrap.append(chart);
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, items.map((it) => it.row), [label, value, target], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
