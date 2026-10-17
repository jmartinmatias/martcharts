import { formatValue } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { ChordView } from "../../core/views.ts";
import { polar, sectorPath } from "../layout.ts";
import { buildTable, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const FULL = Math.PI * 2;
/** Gap between neighbouring group arcs, in radians. */
const PAD = 0.04;
const BAND = 13;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

interface Flow {
  from: string;
  to: string;
  value: number;
  row: Row;
  from0: number;
  from1: number;
  to0: number;
  to1: number;
}

/**
 * Draws the `chord` view: each group an arc around the circle, as long as all
 * it sends and receives, and each flow a ribbon from a slice of its sender's
 * arc to a slice of its receiver's, curving through the middle, in the
 * sender's color. Pointing at a group lights up its ribbons.
 */
export const renderChord: ViewRenderer<ChordView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { source, target, value } = ctx.view;
  const groups: string[] = [];
  const names = new Map<string, string>();
  const flows: Flow[] = [];
  for (const row of ctx.rows) {
    const amount = readNumber(row[value]);
    const from = String(row[source]);
    const to = String(row[target]);
    if (amount === null || amount <= 0 || from === to) continue;
    for (const [key, field] of [
      [from, source],
      [to, target],
    ] as const) {
      if (!names.has(key)) {
        names.set(key, ctx.format(row[field], field));
        groups.push(key);
      }
    }
    const same = flows.find((f) => f.from === from && f.to === to);
    if (same) same.value += amount;
    else flows.push({ from, to, value: amount, row, from0: 0, from1: 0, to0: 0, to1: 0 });
  }
  const moves = flows.reduce((sum, f) => sum + f.value, 0) || 1;
  const sent = (g: string) => flows.filter((f) => f.from === g).reduce((sum, f) => sum + f.value, 0);
  const received = (g: string) => flows.filter((f) => f.to === g).reduce((sum, f) => sum + f.value, 0);
  // Each arc: its outgoing slices first (in group order), then its incoming ones.
  const scale = (FULL - PAD * groups.length) / (moves * 2);
  const arcs = new Map<string, { start: number; end: number }>();
  let angle = 0;
  for (const g of groups) {
    const start = angle;
    for (const to of groups) {
      for (const f of flows.filter((x) => x.from === g && x.to === to)) {
        f.from0 = angle;
        angle += f.value * scale;
        f.from1 = angle;
      }
    }
    for (const from of groups) {
      for (const f of flows.filter((x) => x.to === g && x.from === from)) {
        f.to0 = angle;
        angle += f.value * scale;
        f.to1 = angle;
      }
    }
    arcs.set(g, { start, end: angle });
    angle += PAD;
  }

  const hasFormat = ctx.spec.fields?.[value]?.format !== undefined;
  const amountText = (n: number) => (hasFormat ? ctx.format(n, value) : formatValue(n, { type: "number", compact: true }, ctx.spec.locale));
  const share = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0 });
  const width = Math.max(ctx.width, 233);
  const height = Math.min(Math.max(ctx.height, 233), 377, width);
  const cx = width / 2;
  const cy = height / 2;
  const outer = Math.min(cx, cy) - 34;
  const inner = outer - BAND;
  const r = inner - 2;
  const colorOf = (g: string) => ctx.color(groups.indexOf(g));

  const wrap = html(doc, "div", "fft-chart fft-chord");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Chord diagram of ${ctx.label(value)} from ${ctx.label(source)} to ${ctx.label(target)}`);
  const ribbons: SVGPathElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const ribbon of ribbons) ribbon.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  const light = (match: (f: Flow) => boolean) => {
    wrap.setAttribute("data-active", "");
    flows.forEach((f, i) => ribbons[i]?.toggleAttribute("data-active", match(f)));
  };
  const hits: Element[] = [];

  for (const f of flows) {
    const at = (a: number) => {
      const point = polar(cx, cy, r, a);
      return { x: Math.round(point.x * 100) / 100, y: Math.round(point.y * 100) / 100 };
    };
    const p = at;
    const [a0, a1, b0, b1] = [p(f.from0), p(f.from1), p(f.to0), p(f.to1)];
    const big = (span: number) => (span > Math.PI ? 1 : 0);
    const d = `M${a0.x},${a0.y}A${r},${r} 0 ${big(f.from1 - f.from0)} 1 ${a1.x},${a1.y}Q${cx},${cy} ${b0.x},${b0.y}A${r},${r} 0 ${big(f.to1 - f.to0)} 1 ${b1.x},${b1.y}Q${cx},${cy} ${a0.x},${a0.y}Z`;
    const flowName = `${names.get(f.from)} to ${names.get(f.to)}`;
    const ribbon = svg(doc, "path", { class: "fft-chord-ribbon", d, "data-flow": flowName });
    ribbon.style.fill = colorOf(f.from);
    chart.append(ribbon);
    ribbons.push(ribbon);
    const items: TooltipItem[] = [
      { label: ctx.label(value), value: amountText(f.value), color: colorOf(f.from) },
      { label: "Share of all moves", value: share.format(f.value / moves) },
    ];
    const hit = svg(doc, "path", { class: "fft-chord-hit", d, "data-flow": flowName, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${flowName}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const activate = () => {
      light((x) => x === f);
      ctx.tooltip.show(hit, flowName, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    const row = f.row;
    selectable(hit, () => ctx.select(row));
    hits.push(hit);
  }

  for (const g of groups) {
    const arc = arcs.get(g) as { start: number; end: number };
    const name = names.get(g) ?? g;
    const band = svg(doc, "path", { class: "fft-chord-arc", d: sectorPath(cx, cy, inner, outer, arc.start, arc.end), "data-group": g, "data-start": round3(arc.start), "data-end": round3(arc.end) });
    band.style.fill = colorOf(g);
    chart.append(band);
    const mid = (arc.start + arc.end) / 2;
    const at = polar(cx, cy, outer + 8, mid);
    const label = svg(doc, "text", { class: "fft-chord-label", x: at.x, y: at.y, "text-anchor": Math.sin(mid) >= 0 ? "start" : "end", "dominant-baseline": "middle" });
    label.textContent = name;
    chart.append(label);
    const items: TooltipItem[] = [
      { label: "Sends", value: amountText(sent(g)), color: colorOf(g) },
      { label: "Receives", value: amountText(received(g)) },
    ];
    const hit = svg(doc, "path", { class: "fft-chord-arc-hit", d: sectorPath(cx, cy, inner - 3, outer + 5, arc.start, arc.end), "data-group": g, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${name}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const activate = () => {
      light((f) => f.from === g || f.to === g);
      ctx.tooltip.show(hit, name, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    hits.push(hit);
  }
  const overlay = svg(doc, "g");
  overlay.append(...hits);
  chart.append(overlay);
  roving(hits);
  wrap.append(chart);
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, ctx.rows, [source, target, value], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
