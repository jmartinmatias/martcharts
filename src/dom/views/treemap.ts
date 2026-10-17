import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { TreemapView } from "../../core/views.ts";
import { squarify } from "../layout.ts";
import { buildTable, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

/**
 * Draws the `treemap` view: squarified tiles sized by value with a 2px surface
 * gap between them. Large saturated blocks would shout, so each tile is a soft
 * tint of its color with a crisp 3px edge of the full color along the top,
 * which carries the identity. One color for every tile, or one per group.
 * Names and values use the text colors and appear only when they fit.
 */
export const renderTreemap: ViewRenderer<TreemapView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, value, group } = ctx.view;
  const kept: { row: Row; amount: number; group: number }[] = [];
  const groups: string[] = [];
  for (const row of ctx.rows) {
    const amount = readNumber(row[value]);
    if (amount === null || amount <= 0) continue;
    const name = group ? String(row[group]) : "";
    if (!groups.includes(name)) groups.push(name);
    kept.push({ row, amount, group: groups.indexOf(name) });
  }
  const total = kept.reduce((sum, k) => sum + k.amount, 0);
  const share = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0 });

  const wrap = html(doc, "div", "fft-chart");
  if (group && groups.length > 1) {
    const legend = html(doc, "ul", "fft-legend");
    groups.forEach((name, i) => {
      const swatch = html(doc, "span", "fft-swatch");
      swatch.style.background = ctx.color(i);
      swatch.setAttribute("aria-hidden", "true");
      const item = html(doc, "li");
      item.append(swatch, ctx.format(name, group));
      legend.append(item);
    });
    wrap.append(legend);
  }

  const width = ctx.width;
  const height = ctx.height;
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Treemap of ${ctx.label(value)} by ${ctx.label(label)}`);
  const tiles = squarify(kept.map((k) => k.amount), 0, 0, width, height);

  const marks = svg(doc, "g");
  const overlay = svg(doc, "g");
  const rects: SVGRectElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const r of rects) r.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  kept.forEach((k, i) => {
    const t = tiles[i];
    if (!t || t.width <= 0 || t.height <= 0) return;
    const box = { x: t.x + 1, y: t.y + 1, width: Math.max(0, t.width - 2), height: Math.max(0, t.height - 2) };
    const rect = svg(doc, "rect", { class: "fft-tile", ...box, rx: 3, style: `--fft-i: ${i}` });
    rect.style.setProperty("fill", ctx.color(k.group));
    rects.push(rect);
    marks.append(rect);
    const edge = svg(doc, "rect", { class: "fft-tile-edge", x: box.x, y: box.y, width: box.width, height: Math.min(3, box.height), rx: 1.5 });
    edge.style.setProperty("fill", ctx.color(k.group));
    marks.append(edge);

    const name = ctx.format(k.row[label], label);
    const amountText = ctx.format(k.row[value], value);
    const fitsName = box.width >= Math.max(55, name.length * 6.5 + 13) && box.height >= 21;
    if (fitsName) {
      const nameText = svg(doc, "text", { class: "fft-tile-name", x: box.x + 8, y: box.y + 21 });
      nameText.textContent = name;
      marks.append(nameText);
      if (box.height >= 47 && box.width >= amountText.length * 6.5 + 13) {
        const valueText = svg(doc, "text", { class: "fft-tile-value", x: box.x + 8, y: box.y + 37 });
        valueText.textContent = amountText;
        marks.append(valueText);
      }
    }

    const items: TooltipItem[] = [
      { label: ctx.label(value), value: amountText },
      { label: "Share", value: share.format(k.amount / total) },
    ];
    if (group) items.push({ label: ctx.label(group), value: ctx.format(k.row[group], group), color: ctx.color(k.group) });
    const hit = svg(doc, "rect", { class: "fft-tile-hit", ...box, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${name}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const r of rects) r.removeAttribute("data-active");
      rect.setAttribute("data-active", "");
      ctx.tooltip.show(hit, name, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    selectable(hit, () => ctx.select(k.row));
    overlay.append(hit);
  });
  chart.append(marks, overlay);
  roving([...overlay.children]);
  wrap.append(chart);

  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, kept.map((k) => k.row), [label, value, ...(group ? [group] : [])], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
