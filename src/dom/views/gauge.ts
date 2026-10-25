import { formatValue } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { GaugeView } from "../../core/views.ts";
import { countable } from "../count-up.ts";
import { arcPath, niceTicks, polar } from "../layout.ts";
import { hiddenTableOf, html, roving, selectable, shareFormat, svg } from "./shared.ts";
import { WORDS } from "./words.ts";
import { checkMark, standing } from "./target.ts";

const HALF = Math.PI / 2;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Draws the `gauge` view: a half-circle track from min (left) to max (right),
 * an arc in the accent filled to the value, a tick at the target, the number
 * large inside the arc and the scale's ends below. One accent, no needle, no
 * traffic-light bands. Sized in Fibonacci steps: 233px wide with a 21px arc,
 * or 377px with a 34px arc when there is room.
 */
export const renderGauge: ViewRenderer<GaugeView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { value: field, target, min = 0 } = ctx.view;
  const row = ctx.rows[0] ?? {};
  const value = readNumber(row[field]);
  const goal = target ? readNumber(row[target]) : null;
  const max = ctx.view.max ?? niceTicks(min, Math.max(value ?? min, goal ?? min, min + 1) * 1.2).at(-1) ?? min + 1;
  const ratio = (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min || 1)));
  const hasFormat = ctx.spec.fields?.[field]?.format !== undefined;
  const show = (v: unknown) => (hasFormat ? ctx.format(v, field) : formatValue(v, { type: "number", compact: true }, ctx.spec.locale));

  const width = ctx.width >= 480 ? 377 : 233;
  const thickness = width >= 377 ? 34 : 21;
  const c = width / 2;
  const r = c - thickness / 2 - 2;
  const height = c + 34;
  const angle = (share: number) => -HALF + share * Math.PI;

  const wrap = html(doc, "div", "fft-gauge");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Gauge of ${ctx.label(field)} from ${show(min)} to ${show(max)}`);
  chart.style.setProperty("--fft-gauge-color", ctx.color(0));
  const track = arcPath(c, c, r, -HALF, HALF);
  chart.append(svg(doc, "path", { class: "fft-gauge-track", d: track, "stroke-width": thickness }));
  if (value !== null && ratio(value) > 0) {
    chart.append(svg(doc, "path", { class: "fft-gauge-arc", d: arcPath(c, c, r, -HALF, angle(ratio(value))), "stroke-width": thickness, pathLength: 1, "data-ratio": round2(ratio(value)), style: "--fft-i: 0" }));
  }
  if (goal !== null) {
    const inner = polar(c, c, r - thickness / 2 - 3, angle(ratio(goal)));
    const outer = polar(c, c, r + thickness / 2 + 3, angle(ratio(goal)));
    chart.append(svg(doc, "line", { class: "fft-gauge-target", x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, "data-ratio": round2(ratio(goal)) }));
    // The tick says what it is, just inside the arc, reading toward the center so it stays clear of the number.
    const at = polar(c, c, r - thickness / 2 - 13, angle(ratio(goal)));
    const side = ratio(goal) < 0.4 ? "start" : ratio(goal) > 0.6 ? "end" : "middle";
    const name = svg(doc, "text", { class: "fft-gauge-goal", x: at.x, y: at.y, "text-anchor": side, "dominant-baseline": "middle" });
    name.textContent = `${target ? ctx.label(target) : WORDS.target} ${show(goal)}`;
    chart.append(name);
  }
  const number = svg(doc, "text", { class: "fft-gauge-value", x: c, y: c - 6, "text-anchor": "middle" });
  number.textContent = show(row[field]);
  const caption = svg(doc, "text", { class: "fft-gauge-caption", x: c, y: c + 15, "text-anchor": "middle" });
  caption.textContent = ctx.view.label ?? ctx.label(field);
  chart.append(number, caption);
  for (const [v, x] of [
    [min, c - r],
    [max, c + r],
  ] as const) {
    const end = svg(doc, "text", { class: "fft-gauge-scale", x, y: c + 26, "text-anchor": "middle" });
    end.textContent = show(v);
    chart.append(end);
  }

  const items: TooltipItem[] = [{ label: ctx.label(field), value: show(row[field]), color: ctx.color(0) }];
  if (target && goal !== null) {
    items.push({ label: ctx.label(target), value: hasFormat || ctx.spec.fields?.[target]?.format ? ctx.format(row[target], target) : show(goal) });
    if (value !== null && goal !== 0) items.push({ label: WORDS.ofTarget, value: shareFormat(ctx.spec.locale).format(value / goal) });
  }
  const hit = svg(doc, "path", { class: "fft-gauge-hit", d: track, "stroke-width": thickness + 8, tabindex: 0, role: "img" });
  hit.setAttribute("aria-label", items.map((it) => `${it.label} ${it.value}`).join(", "));
  const showTip = () => ctx.tooltip.show(hit, ctx.view.label ?? ctx.label(field), items);
  hit.addEventListener("pointerenter", showTip);
  hit.addEventListener("focus", showTip);
  hit.addEventListener("pointerleave", () => ctx.tooltip.hide());
  hit.addEventListener("blur", () => ctx.tooltip.hide());
  selectable(hit, () => ctx.select(row));
  chart.append(hit);
  // One stop, but on the same roving footing as every other view: arrow keys and Home and End land on it.
  roving([hit]);
  wrap.append(chart);
  // Where the number stands against its goal, in target words, under the gauge.
  const { met, text: stand } = standing(ctx, value, goal, field);
  if (stand) {
    const line = html(doc, "p", "fft-gauge-standing", stand);
    if (met) {
      line.dataset.met = "true";
      line.prepend(checkMark(doc));
    }
    wrap.append(line);
    hit.setAttribute("aria-label", `${hit.getAttribute("aria-label")}, ${stand.charAt(0).toLowerCase()}${stand.slice(1)}`);
  }
  wrap.append(hiddenTableOf(ctx, [row], [field, ...(target ? [target] : [])]));
  ctx.el.append(wrap);
  // The number counts up with the entrance, like the other headline numbers.
  countable(number as unknown as HTMLElement, value, show);
};
