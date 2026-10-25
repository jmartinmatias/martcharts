import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { StripsView } from "../../core/views.ts";
import { allocate } from "../layout.ts";
import { buildTable, fieldList, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const CHAR_WIDTH = 6;
/** One square: 8px of color and a 2px gap. */
const SIDE = 8;
const PITCH = 10;
/** Round numbers a square may stand for, smallest first. */
const UNITS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];

/** The plural of a unit word: provision to provisions, clause to clauses, article to articles. */
export const pluralUnit = (unit: string) => (/[^aeiou]y$/.test(unit) ? `${unit.slice(0, -1)}ies` : /(s|x|ch|sh)$/.test(unit) ? `${unit}es` : `${unit}s`);

/**
 * Draws the `strips` view: one row per data row with a strip of small squares,
 * one per unit, filled part by part in order, each part its series color, and
 * the total with the first part's share at the end. When the longest strip
 * would not fit, every square stands for the smallest round number of units
 * that fits, and a note under the chart says so. A `per` field adds a density.
 */
export const renderStrips: ViewRenderer<StripsView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, per } = ctx.view;
  const parts = fieldList(ctx.view.parts);
  const unit = typeof ctx.view.unit === "string" && ctx.view.unit.trim() ? ctx.view.unit.trim() : "provision";
  const units = pluralUnit(unit);
  const share = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0 });
  const density = new Intl.NumberFormat(ctx.spec.locale, { maximumFractionDigits: 1 });
  const perName = per ? ctx.label(per).toLowerCase().replace(/s$/, "") : "";
  const counts = ctx.rows.map((row) => parts.map((field) => Math.max(0, readNumber(row[field]) ?? 0)));
  const totals = counts.map((c) => c.reduce((a, b) => a + b, 0));
  const maxTotal = Math.max(0, ...totals);
  const names = ctx.rows.map((row) => ctx.format(row[label], label));
  const first = parts[0] as string;

  // Room for the strip: the card less the label column and the figures at the end.
  const labelW = Math.max(34, Math.min(ctx.width * 0.34, Math.max(...names.map((n) => n.length)) * CHAR_WIDTH + 8));
  const endTexts = ctx.rows.map((row, i) => {
    const total = ctx.format(totals[i], first);
    const part = parts.length > 1 && (totals[i] ?? 0) > 0 ? share.format((counts[i]?.[0] ?? 0) / (totals[i] as number)) : "";
    const perValue = per ? readNumber(row[per]) : null;
    const dense = per && perValue ? `${density.format((totals[i] ?? 0) / perValue)} per ${perName}` : "";
    return { total, part, dense };
  });
  const endW = Math.max(...endTexts.map((t) => (t.total.length + (t.part ? t.part.length + 3 : 0)) * CHAR_WIDTH)) + 8;
  const capacity = Math.max(10, Math.floor((ctx.width - labelW - endW - 16) / PITCH));
  const perSquare = UNITS.find((u) => Math.ceil(maxTotal / u) <= capacity) ?? UNITS.at(-1) ?? 1;
  const squares = Math.max(1, ...totals.map((t) => Math.round(t / perSquare)));
  const stripW = squares * PITCH - (PITCH - SIDE);

  const wrap = html(doc, "div", "fft-strips");
  wrap.style.setProperty("--fft-strip-label", `${Math.round(labelW)}px`);
  if (parts.length > 1 && !ctx.inFacet) {
    const legend = html(doc, "ul", "fft-legend");
    parts.forEach((field, i) => {
      const swatch = html(doc, "span", "fft-swatch");
      swatch.dataset.shape = "rect";
      swatch.style.background = ctx.color(i);
      swatch.setAttribute("aria-hidden", "true");
      const item = html(doc, "li");
      item.append(swatch, ctx.label(field));
      legend.append(item);
    });
    wrap.append(legend);
  }
  const list = html(doc, "div", "fft-strip-rows");
  list.setAttribute("role", "list");
  const rows: HTMLElement[] = [];
  const deactivate = () => {
    list.removeAttribute("data-active");
    for (const row of rows) row.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  ctx.rows.forEach((row, i) => {
    const total = totals[i] ?? 0;
    const count = counts[i] ?? [];
    const n = total > 0 ? Math.max(1, Math.round(total / perSquare)) : 0;
    const perPart = allocate(count, n);
    const item = html(doc, "div", "fft-strip");
    item.setAttribute("role", "listitem");
    item.tabIndex = 0;
    item.style.setProperty("--fft-i", String(i));
    const strip = svg(doc, "svg", { class: "fft-strip-squares", width: stripW, height: SIDE, viewBox: `0 0 ${stripW} ${SIDE}` });
    strip.setAttribute("aria-hidden", "true");
    let k = 0;
    perPart.forEach((m, p) => {
      for (let q = 0; q < m; q++, k++) {
        const rect = svg(doc, "rect", { class: "fft-strip-sq", x: k * PITCH, y: 0, width: SIDE, height: SIDE, rx: 1.5, "data-part": p, style: `--fft-k: ${k}` });
        rect.style.setProperty("fill", ctx.color(p));
        strip.append(rect);
      }
    });
    const end = html(doc, "span", "fft-strip-end");
    const text = endTexts[i] as { total: string; part: string; dense: string };
    end.append(html(doc, "span", "fft-strip-total", text.total));
    if (text.part) end.append(html(doc, "span", "fft-strip-share", `${text.part} ${ctx.label(first).toLowerCase()}`));
    if (text.dense) end.append(html(doc, "span", "fft-strip-density", text.dense));
    item.append(html(doc, "span", "fft-strip-label", names[i] ?? ""), strip, end);

    const items: TooltipItem[] = parts.map((field, p) => ({ label: ctx.label(field), value: ctx.format(row[field], field), color: ctx.color(p) }));
    if (parts.length > 1) items.push({ label: "Total", value: text.total });
    if (text.part) items.push({ label: `${ctx.label(first)} share`, value: text.part });
    if (text.dense) items.push({ label: "Density", value: text.dense });
    item.setAttribute("aria-label", `${names[i]}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const activate = () => {
      list.setAttribute("data-active", "");
      for (const other of rows) other.removeAttribute("data-active");
      item.setAttribute("data-active", "");
      ctx.tooltip.show(strip, names[i] ?? "", items);
    };
    item.addEventListener("pointerenter", activate);
    item.addEventListener("focus", activate);
    item.addEventListener("pointerleave", deactivate);
    item.addEventListener("blur", deactivate);
    selectable(item, () => ctx.select(row));
    rows.push(item);
    list.append(item);
  });
  roving(rows);
  wrap.append(list);
  const note = html(doc, "p", "fft-strips-note", perSquare === 1 ? `One square is one ${unit}.` : `One square is ${ctx.format(perSquare, first)} ${units}; strips are rounded to the nearest square.`);
  wrap.append(note);
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, ctx.rows as Row[], [label, ...parts, ...(per ? [per] : [])], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
