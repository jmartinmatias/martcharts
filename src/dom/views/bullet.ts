import { readNumber } from "../../core/formats.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { BulletView } from "../../core/views.ts";
import { html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const DEFAULT_RANGES = [0.6, 0.9, 1.2];
const pct = (fraction: number) => `${Math.round(Math.max(0, Math.min(1, fraction)) * 10000) / 100}%`;

/**
 * Draws the `bullet` view: per row, three qualitative bands (poor, fair, good,
 * ending at multiples of the target), a value bar through the middle, and a
 * target tick. Geometry is in percentages, so bullets stretch with the card.
 */
export const renderBullet: ViewRenderer<BulletView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, value, target } = ctx.view;
  const ranges = Array.isArray(ctx.view.ranges) && ctx.view.ranges.length === 3 ? ctx.view.ranges : DEFAULT_RANGES;
  const share = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0 });
  const list = html(doc, "div", "fft-bullets");
  ctx.rows.forEach((row, i) => {
    const actual = readNumber(row[value]);
    const goal = readNumber(row[target]);
    const name = ctx.format(row[label], label);
    const domain = Math.max(actual ?? 0, (goal ?? 0) * (ranges[2] ?? 1.2), goal ?? 0) || 1;

    const item = html(doc, "div", "fft-bullet");
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
    item.append(html(doc, "span", "fft-bullet-label", name), chart, html(doc, "span", "fft-bullet-number", valueText));
    const attainment = actual !== null && goal ? share.format(actual / goal) : "";
    const items = [
      { label: ctx.label(value), value: valueText },
      { label: ctx.label(target), value: ctx.format(row[target], target) },
      ...(attainment ? [{ label: "Of target", value: attainment }] : []),
    ];
    item.setAttribute("aria-label", `${name}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const show = () => ctx.tooltip.show(chart, name, items);
    item.addEventListener("pointerenter", show);
    item.addEventListener("focus", show);
    item.addEventListener("pointerleave", () => ctx.tooltip.hide());
    item.addEventListener("blur", () => ctx.tooltip.hide());
    selectable(item, () => ctx.select(row));
    list.append(item);
  });
  roving([...list.children]);
  ctx.el.append(list);
};
