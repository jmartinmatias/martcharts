import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { TreemapView } from "../../core/views.ts";
import { squarify } from "../layout.ts";
import { evenFormat, hiddenTableOf, html, legendList, selectable, shareFormat, svg, textWidth } from "./shared.ts";
import { categoryColor, emphasis, wordsFor } from "./words.ts";
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
  const share = shareFormat(ctx.spec.locale);
  // A group keeps its color wherever it appears; highlight names tiles or whole groups, and the rest step back.
  const groupColor = (i: number) => categoryColor(ctx, groups[i], i);
  const lit = emphasis(ctx);
  const tileColor = (k: { row: Row; group: number }) =>
    lit.lit(k.row[label]) || (group !== undefined && lit.any && lit.lit(k.row[group])) ? groupColor(k.group) : lit.paint(k.row[label], groupColor(k.group));

  const wrap = html(doc, "div", "fft-chart");
  if (group) {
    const key = legendList(ctx, groups.map((name, i) => ({ label: ctx.format(name, group), color: groupColor(i) })), { min: 2 });
    if (key) wrap.append(key);
  }

  const width = ctx.width;
  const height = ctx.height;
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", wordsFor(ctx).aria.treemap(ctx.label(value), ctx.label(label)));
  const tiles = squarify(kept.map((k) => k.amount), 0, 0, width, height);

  const marks = svg(doc, "g");
  const overlay = svg(doc, "g");
  const rects: SVGRectElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const r of rects) r.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  // The tiles' figures in one precision, so they read as one set.
  const amountOf = evenFormat(ctx, value, kept.map((k) => readNumber(k.row[value]) ?? 0));
  kept.forEach((k, i) => {
    const t = tiles[i];
    if (!t || t.width <= 0 || t.height <= 0) return;
    const box = { x: t.x + 1, y: t.y + 1, width: Math.max(0, t.width - 2), height: Math.max(0, t.height - 2) };
    const rect = svg(doc, "rect", { class: "fft-tile", ...box, rx: 2, style: `--fft-i: ${i}` });
    const color = tileColor(k);
    rect.style.setProperty("fill", color);
    rects.push(rect);
    marks.append(rect);
    const edge = svg(doc, "rect", { class: "fft-tile-edge", x: box.x, y: box.y, width: box.width, height: Math.min(3, box.height), rx: 1.5 });
    edge.style.setProperty("fill", color);
    marks.append(edge);

    const name = ctx.format(k.row[label], label);
    const amountText = amountOf(readNumber(k.row[value]) ?? 0);
    const fitsName = box.width >= Math.max(55, textWidth(name, 13) + 13) && box.height >= 21;
    if (fitsName) {
      const nameText = svg(doc, "text", { class: "fft-tile-name", x: box.x + 8, y: box.y + 21 });
      nameText.textContent = name;
      marks.append(nameText);
      if (box.height >= 47 && box.width >= textWidth(amountText, 11, 600) + 13) {
        const valueText = svg(doc, "text", { class: "fft-tile-value", x: box.x + 8, y: box.y + 37 });
        valueText.textContent = amountText;
        marks.append(valueText);
      }
    }

    const items: TooltipItem[] = [
      { label: ctx.label(value), value: amountText },
      { label: wordsFor(ctx).share, value: share.format(k.amount / total) },
    ];
    if (group) items.push({ label: ctx.label(group), value: ctx.format(k.row[group], group), color: groupColor(k.group) });
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

  wrap.append(hiddenTableOf(ctx, kept.map((k) => k.row), [label, value, ...(group ? [group] : [])]));
  ctx.el.append(wrap);
};
