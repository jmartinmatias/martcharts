import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { RingsView } from "../../core/views.ts";
import { arcPath } from "../layout.ts";
import { figureSize, hiddenTableOf, html, ringThickness, selectable, shareFormat, svg } from "./shared.ts";
import { categoryColor, wordsFor } from "./words.ts";
import { roving } from "./focus.ts";
import { checkMark, standing } from "./target.ts";

const GAP = 3;
const FULL = Math.PI * 2;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** An arc for `share` of a turn from twelve o'clock. A whole turn is two half arcs: one arc that ends where it starts draws nothing. */
function ringPath(c: number, r: number, share: number): string {
  if (share < 1) return arcPath(c, c, r, 0, share * FULL);
  return `${arcPath(c, c, r, 0, Math.PI)}${arcPath(c, c, r, Math.PI, FULL).replace(/^M[^A]+/, "")}`;
}

/**
 * Draws the `rings` view: one progress ring per row, outermost first, each a
 * faint track of its color with an arc filled to value over target, starting
 * at twelve o'clock. Past the target the ring closes and a second lap, lifted
 * by a soft shadow, shows how far over. Sizes are Fibonacci steps: a 144px
 * figure with 13px rings, or 233px with 21px rings when there is room.
 */
export const renderRings: ViewRenderer<RingsView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, value, target } = ctx.view;
  const goals: { row: Row; amount: number; goal: number; ratio: number }[] = [];
  for (const row of ctx.rows) {
    const amount = readNumber(row[value]);
    const goal = readNumber(row[target]);
    if (amount === null || goal === null || goal <= 0) continue;
    goals.push({ row, amount, goal, ratio: Math.max(0, amount / goal) });
  }
  const percent = shareFormat(ctx.spec.locale);

  const size = figureSize(ctx.width);
  const c = size / 2;
  // Thinner rings when there are many, so the innermost keeps a readable hole.
  const thickness = Math.min(ringThickness(size), Math.floor((c - 13) / Math.max(1, goals.length)) - GAP);

  const wrap = html(doc, "div", "fft-rings");
  const figure = html(doc, "div", "fft-rings-figure");
  const chart = svg(doc, "svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", wordsFor(ctx).aria.rings(ctx.label(value), ctx.label(target)));
  const groups: SVGGElement[] = [];
  const hits: Element[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const group of groups) group.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  const legend = html(doc, "ul", "fft-rings-legend");
  goals.forEach((g, i) => {
    const r = c - thickness / 2 - i * (thickness + GAP);
    const color = categoryColor(ctx, g.row[label], i);
    const group = svg(doc, "g", { class: "fft-ring", style: `--fft-i: ${i}; --fft-ring-color: ${color}` });
    group.append(svg(doc, "circle", { class: "fft-ring-track", cx: c, cy: c, r, "stroke-width": thickness }));
    const filled = Math.min(1, g.ratio);
    if (filled > 0) {
      group.append(svg(doc, "path", { class: "fft-ring-arc", d: ringPath(c, r, filled), "stroke-width": thickness, pathLength: 1, "data-ratio": round2(filled) }));
    }
    if (g.ratio > 1) {
      const over = Math.min(1, g.ratio - 1);
      group.append(svg(doc, "path", { class: "fft-ring-lap", d: ringPath(c, r, over), "stroke-width": thickness, "data-ratio": round2(g.ratio - 1) }));
    }
    const name = ctx.format(g.row[label], label);
    const attainment = percent.format(g.ratio);
    const items: TooltipItem[] = [
      { label: ctx.label(value), value: ctx.format(g.row[value], value), color },
      { label: ctx.label(target), value: ctx.format(g.row[target], target) },
      { label: wordsFor(ctx).ofTarget, value: attainment },
    ];
    const hit = svg(doc, "circle", { class: "fft-ring-hit", cx: c, cy: c, r, "stroke-width": thickness + GAP, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${name}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const other of groups) other.removeAttribute("data-active");
      group.setAttribute("data-active", "");
      ctx.tooltip.show(hit, name, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    const row = g.row;
    selectable(hit, () => ctx.select(row));
    group.append(hit);
    chart.append(group);
    groups.push(group);
    hits.push(hit);

    const swatch = html(doc, "span", "fft-swatch");
    swatch.style.background = color;
    swatch.setAttribute("aria-hidden", "true");
    const item = html(doc, "li");
    // Where the goal stands, in target words: a check and "Target met", or how far it has to go.
    const { met, text: stand } = standing(ctx, readNumber(g.row[value]), readNumber(g.row[target]), value);
    if (met) item.dataset.met = "true";
    const percentEl = html(doc, "span", "fft-rings-percent", attainment);
    if (met) percentEl.prepend(checkMark(doc));
    item.append(swatch, html(doc, "span", "fft-rings-name", name), percentEl, html(doc, "span", "fft-rings-value", `${ctx.format(g.row[value], value)} ${wordsFor(ctx).of} ${ctx.format(g.row[target], target)}`));
    // A met goal says so once, with its check; the words stay for screen readers. A miss says what is left to go.
    if (stand && !met) item.append(html(doc, "span", "fft-rings-gap", stand));
    else if (stand) item.append(html(doc, "span", "fft-sr-only", stand));
    legend.append(item);
  });
  figure.append(chart);
  roving(hits);
  const hidden = hiddenTableOf(ctx, goals.map((g) => g.row), [label, value, target]);
  wrap.append(figure, legend, hidden);
  ctx.el.append(wrap);
};
