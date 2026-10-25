import { readNumber } from "../../core/formats.ts";
import { fitLabel } from "./label-fit.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { BulletView } from "../../core/views.ts";
import { activeGroup, hiddenTableOf, html, roving, rowHit, shareFormat, svg } from "./shared.ts";
import { checkMark, standing } from "./target.ts";
import { wordsFor } from "./words.ts";

const DEFAULT_RANGES = [0.6, 0.9, 1.2];
const pct = (fraction: number) => `${Math.round(Math.max(0, Math.min(1, fraction)) * 10000) / 100}%`;

/**
 * Draws the `bullet` view: per row, three qualitative bands (poor, fair, good,
 * ending at multiples of the target), a value bar through the middle, and a
 * target tick. Geometry is in percentages, so bullets stretch with the card.
 * A met target carries a check by its number; a missed one says what is left to go.
 */
export const renderBullet: ViewRenderer<BulletView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, value, target } = ctx.view;
  const ranges = Array.isArray(ctx.view.ranges) && ctx.view.ranges.length === 3 ? ctx.view.ranges : DEFAULT_RANGES;
  const share = shareFormat(ctx.spec.locale);
  const list = html(doc, "div", "fft-bullets");
  list.setAttribute("role", "list");
  // Pointing at a bullet steps the others back, as every row view does.
  const active = activeGroup(list, ctx.tooltip);
  const hits: Element[] = [];
  ctx.rows.forEach((row, i) => {
    const actual = readNumber(row[value]);
    const goal = readNumber(row[target]);
    const name = ctx.format(row[label], label);
    const domain = Math.max(actual ?? 0, (goal ?? 0) * (ranges[2] ?? 1.2), goal ?? 0) || 1;

    const item = html(doc, "div", "fft-bullet");
    item.setAttribute("role", "listitem");
    item.style.setProperty("--fft-i", String(i));
    const chart = svg(doc, "svg", { height: 21, preserveAspectRatio: "none" });
    chart.setAttribute("aria-hidden", "true");
    let start = 0;
    ranges.forEach((end, band) => {
      const stop = goal === null ? 0 : (end * goal) / domain;
      chart.append(svg(doc, "rect", { class: "fft-bullet-band", "data-band": band + 1, x: pct(start), y: 0, width: pct(stop - start), height: 21 }));
      start = stop;
    });
    const bar = svg(doc, "rect", { class: "fft-bullet-value", x: 0, y: 7, width: pct((actual ?? 0) / domain), height: 7, rx: 1 });
    const fixed = ctx.colorOf?.(row[label]);
    if (fixed) bar.style.setProperty("fill", fixed);
    chart.append(bar);
    if (goal !== null) {
      const x = pct(goal / domain);
      chart.append(svg(doc, "line", { class: "fft-bullet-target", x1: x, x2: x, y1: 2, y2: 19 }));
    }
    const valueText = ctx.format(row[value], value);
    const { met, text: stand } = standing(ctx, actual, goal, value);
    const number = html(doc, "span", "fft-bullet-number", valueText);
    if (met) {
      item.dataset.met = "true";
      number.prepend(checkMark(doc));
    }
    // A name longer than its column (at most 30% of the card) is cut between words, never inside a parenthesis; the
    // pointer's title and the row's aria-label keep it whole. CSS ellipsis stays as the last resort.
    const nameNode = html(doc, "span", "fft-bullet-label", fitLabel(name, Math.max(55, ctx.width * 0.3) - 4, 13));
    nameNode.title = name;
    item.append(nameNode, chart, number);
    const attainment = actual !== null && goal ? share.format(actual / goal) : "";
    const items = [
      { label: ctx.label(value), value: valueText },
      { label: ctx.label(target), value: ctx.format(row[target], target) },
      ...(attainment ? [{ label: wordsFor(ctx).ofTarget, value: attainment }] : []),
      ...(stand && !met && actual !== null && goal !== null ? [{ label: wordsFor(ctx).toGoTitle, value: ctx.format(goal - actual, value) }] : []),
    ];
    hits.push(rowHit(ctx, { node: item, row, name, items, anchor: chart, group: active }));
    // Read aloud: the figures, then where it stands in words ("€22K to go" is said by the standing, not twice).
    const said = items.filter((it) => it.label !== wordsFor(ctx).toGoTitle).map((it) => `${it.label} ${it.value}`);
    item.setAttribute("aria-label", `${name}: ${[...said, ...(stand ? [`${stand.charAt(0).toLowerCase()}${stand.slice(1)}`] : [])].join(", ")}`);
    list.append(item);
  });
  roving(hits);
  ctx.el.append(list, hiddenTableOf(ctx, ctx.rows, [label, value, target]));
};
