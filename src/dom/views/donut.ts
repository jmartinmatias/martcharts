import { formatValue } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import { getPreset } from "../../core/presets.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { DonutView } from "../../core/views.ts";
import { arcPath } from "../layout.ts";
import { buildTable, figureSize, html, ringThickness, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";
import { countable } from "../count-up.ts";

/**
 * Draws the `donut` view: a ring of slices with a 2px gap between them, the
 * total in the middle, and a legend of each slice's value and share. Sizes are
 * Fibonacci steps: a 144px ring 13px thick, or 233px and 21px thick when wide.
 */
export const renderDonut: ViewRenderer<DonutView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, value, caption } = ctx.view;
  const slices: { row: Row; amount: number }[] = [];
  for (const row of ctx.rows) {
    const amount = readNumber(row[value]);
    if (amount !== null && amount > 0) slices.push({ row, amount });
  }
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  const share = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0 });
  const hasFormat = ctx.spec.fields?.[value]?.format !== undefined;
  const amountText = (n: number) => (hasFormat ? ctx.format(n, value) : formatValue(n, { type: "number", compact: true }, ctx.spec.locale));

  const size = figureSize(ctx.width);
  const thickness = ringThickness(size);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const round = getPreset(ctx.spec.style?.preset)?.marks?.sliceCaps === "round";
  // The gap is 2px of surface at the ring's centerline; round caps need room for themselves too.
  const gap = slices.length > 1 ? (2 + (round ? thickness : 0)) / r : 0;

  const wrap = html(doc, "div", "fft-donut");
  const figure = html(doc, "div", "fft-donut-figure");
  figure.style.width = `${size}px`;
  figure.style.height = `${size}px`;
  const ring = svg(doc, "svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}` });
  ring.setAttribute("role", "group");
  ring.setAttribute("aria-label", `Donut chart of ${ctx.label(value)} by ${ctx.label(label)}`);
  ring.append(svg(doc, "circle", { class: "fft-donut-track", cx: c, cy: c, r, "stroke-width": thickness }));

  const marks: SVGPathElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const mark of marks) mark.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  let angle = 0;
  slices.forEach((slice, i) => {
    const span = (slice.amount / total) * Math.PI * 2;
    const start = angle + Math.min(gap, span * 0.9) / 2;
    const end = angle + span - Math.min(gap, span * 0.9) / 2;
    angle += span;
    const d = slices.length === 1 ? `${arcPath(c, c, r, 0, Math.PI)}${arcPath(c, c, r, Math.PI, Math.PI * 2).replace(/^M[^A]+/, "")}` : arcPath(c, c, r, start, end);
    const mark = svg(doc, "path", { class: "fft-slice", d, "stroke-width": thickness, "stroke-linecap": round ? "round" : "butt", pathLength: 1, style: `--fft-i: ${i}` });
    mark.style.setProperty("stroke", ctx.color(i));
    marks.push(mark);
    ring.append(mark);

    const name = ctx.format(slice.row[label], label);
    const items: TooltipItem[] = [
      { label: ctx.label(value), value: amountText(slice.amount), color: ctx.color(i) },
      { label: "Share", value: share.format(slice.amount / total) },
    ];
    const hit = svg(doc, "path", { class: "fft-slice-hit", d, "stroke-width": thickness + 13, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${name}: ${items[0]?.value}, ${items[1]?.value}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const other of marks) other.removeAttribute("data-active");
      mark.setAttribute("data-active", "");
      ctx.tooltip.show(hit, name, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    selectable(hit, () => ctx.select(slice.row));
    ring.append(hit);
  });

  const center = html(doc, "div", "fft-donut-center");
  const totalEl = html(doc, "div", "fft-donut-total", amountText(total));
  countable(totalEl, total, amountText);
  center.append(totalEl, html(doc, "div", "fft-donut-caption", caption ?? ctx.label(value)));
  figure.append(ring, center);

  const legend = html(doc, "ul", "fft-donut-legend");
  slices.forEach((slice, i) => {
    const swatch = html(doc, "span", "fft-swatch");
    swatch.style.background = ctx.color(i);
    swatch.setAttribute("aria-hidden", "true");
    const item = html(doc, "li");
    item.append(
      swatch,
      html(doc, "span", "fft-donut-name", ctx.format(slice.row[label], label)),
      html(doc, "span", "fft-donut-value", amountText(slice.amount)),
      html(doc, "span", "fft-donut-share", share.format(slice.amount / total)),
    );
    legend.append(item);
  });

  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, slices.map((slice) => slice.row), [label, value], false));
  roving([...ring.querySelectorAll(".fft-slice-hit")]);
  wrap.append(figure, legend, hidden);
  ctx.el.append(wrap);
};
