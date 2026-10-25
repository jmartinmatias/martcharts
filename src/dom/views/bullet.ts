import { readNumber } from "../../core/formats.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { BulletView } from "../../core/views.ts";
import { hiddenTableOf, html, roving, selectable, shareFormat, svg } from "./shared.ts";
import { checkMark, standing } from "./target.ts";

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
  ctx.rows.forEach((row, i) => {
    const actual = readNumber(row[value]);
    const goal = readNumber(row[target]);
    const name = ctx.format(row[label], label);
    const domain = Math.max(actual ?? 0, (goal ?? 0) * (ranges[2] ?? 1.2), goal ?? 0) || 1;

    const item = html(doc, "div", "fft-bullet");
    item.setAttribute("role", "listitem");
    item.tabIndex = 0;
    item.style.setProperty("--fft-i", String(i));
    const chart = svg(doc, "svg", { height: 21, preserveAspectRatio: "none" });
    chart.setAttribute("aria-hidden", "true");
    let start = 0;
    ranges.forEach((end, band) => {
      const stop = goal === null ? 0 : (end * goal) / domain;
      chart.append(svg(doc, "rect", { class: "fft-bullet-band", "data-band": band + 1, x: pct(start), y: 0, width: pct(stop - start), height: 21 }));
      start = stop;
    });
    chart.append(svg(doc, "rect", { class: "fft-bullet-value", x: 0, y: 7, width: pct((actual ?? 0) / domain), height: 7, rx: 1 }));
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
    item.append(html(doc, "span", "fft-bullet-label", name), chart, number);
    const attainment = actual !== null && goal ? share.format(actual / goal) : "";
    const items = [
      { label: ctx.label(value), value: valueText },
      { label: ctx.label(target), value: ctx.format(row[target], target) },
      ...(attainment ? [{ label: "Of target", value: attainment }] : []),
      ...(stand && !met && actual !== null && goal !== null ? [{ label: "To go", value: ctx.format(goal - actual, value) }] : []),
    ];
    const said = items.filter((it) => it.label !== "To go").map((it) => `${it.label} ${it.value}`);
    item.setAttribute("aria-label", `${name}: ${[...said, ...(stand ? [`${stand.charAt(0).toLowerCase()}${stand.slice(1)}`] : [])].join(", ")}`);
    const show = () => ctx.tooltip.show(chart, name, items);
    item.addEventListener("pointerenter", show);
    item.addEventListener("focus", show);
    item.addEventListener("pointerleave", () => ctx.tooltip.hide());
    item.addEventListener("blur", () => ctx.tooltip.hide());
    selectable(item, () => ctx.select(row));
    list.append(item);
  });
  roving([...list.children]);
  ctx.el.append(list, hiddenTableOf(ctx, ctx.rows, [label, value, target]));
};
