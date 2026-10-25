import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { StripsView } from "../../core/views.ts";
import { allocate } from "../layout.ts";
import { activeGroup, fieldList, hiddenTableOf, html, legendList, roving, rowHit, shareFormat, svg, textWidth } from "./shared.ts";
import { nameColumn, writeLabel } from "./label-fit.ts";
import { highlights } from "./chart.ts";
import { wordsFor } from "./words.ts";

/** One square: 8px of color and a 2px gap. */
const SIDE = 8;
const PITCH = 10;
/** Round numbers a square may stand for, smallest first. */
/** The most squares one chart draws: past this, a square stands for more units. */
const MAX_SQUARES = 2000;
const UNITS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];

/**
 * How many units one square stands for: the smallest round step (1, 2, 2.5 or 5 times a power of ten, the familiar
 * steps first) that fits the biggest total into `capacity` squares. Any total fits, however large, so a strip never
 * asks for more squares than a row can hold (a total of 1e12 once asked for a trillion).
 */
export function unitStep(maxTotal: number, capacity: number): number {
  const fits = (u: number) => Math.ceil(maxTotal / u) <= capacity;
  const familiar = UNITS.find(fits);
  if (familiar !== undefined) return familiar;
  for (let power = 4; power < 300; power++) {
    for (const k of [1, 2, 2.5, 5]) {
      const u = k * 10 ** power;
      if (fits(u)) return u;
    }
  }
  return Number.MAX_VALUE;
}

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
  const unit = typeof ctx.view.unit === "string" && ctx.view.unit.trim() ? ctx.view.unit.trim() : wordsFor(ctx).provision;
  const units = wordsFor(ctx).unitPlural(unit, 2);
  const share = shareFormat(ctx.spec.locale);
  const density = new Intl.NumberFormat(ctx.spec.locale, { maximumFractionDigits: 1 });
  const perName = per ? ctx.label(per).toLowerCase().replace(/s$/, "") : "";
  const counts = ctx.rows.map((row) => parts.map((field) => Math.max(0, readNumber(row[field]) ?? 0)));
  const totals = counts.map((c) => c.reduce((a, b) => a + b, 0));
  const maxTotal = Math.max(0, ...totals);
  const names = ctx.rows.map((row) => ctx.format(row[label], label));
  const first = parts[0] as string;

  // Room for the strip: the card less the label column and the figures at the end.
  const column = nameColumn(names, ctx.width);
  const labelW = column.width;
  const endTexts = ctx.rows.map((row, i) => {
    const total = ctx.format(totals[i], first);
    const part = parts.length > 1 && (totals[i] ?? 0) > 0 ? share.format((counts[i]?.[0] ?? 0) / (totals[i] as number)) : "";
    const perValue = per ? readNumber(row[per]) : null;
    const dense = per && perValue ? wordsFor(ctx).perUnit(density.format((totals[i] ?? 0) / perValue), perName) : "";
    return { total, part, dense };
  });
  // The end column holds the total, the share and the density side by side: room for the longest of the three together.
  const shareWord = parts.length > 1 ? ` ${ctx.label(first).toLowerCase()}` : "";
  const endW = Math.max(...endTexts.map((t) => textWidth(t.total, 11, 600) + (t.part ? textWidth(`${t.part}${shareWord}`) + 8 : 0) + (t.dense ? textWidth(t.dense) + 8 : 0))) + 13;
  // A row holds what the card has room for, and the whole chart never more than about 2,000 squares.
  const capacity = Math.max(10, Math.min(Math.floor((ctx.width - labelW - endW - 16) / PITCH), Math.floor(MAX_SQUARES / Math.max(1, ctx.rows.length))));
  const perSquare = unitStep(Number.isFinite(maxTotal) ? maxTotal : 0, capacity);
  const squares = Math.max(1, ...totals.map((t) => Math.round(t / perSquare)));
  const stripW = squares * PITCH - (PITCH - SIDE);

  const wrap = html(doc, "div", "fft-strips");
  wrap.style.setProperty("--fft-strip-label", `${Math.round(labelW)}px`);
  const partColor = (p: number) => ctx.colorOf?.(parts[p]) ?? ctx.colorOf?.(ctx.label(parts[p] as string)) ?? ctx.color(p);
  const key = legendList(ctx, parts.map((field, i) => ({ label: ctx.label(field), color: partColor(i) })), { min: 2 });
  if (key) wrap.append(key);
  const list = html(doc, "div", "fft-strip-rows");
  list.setAttribute("role", "list");
  const rows: Element[] = [];
  const active = activeGroup(list, ctx.tooltip);
  // highlight keeps the named rows in color and steps the rest back to grey, as on hbar and dot.
  const picked = highlights((ctx.view as { highlight?: unknown }).highlight);
  const muted = (row: Row) => picked.length > 0 && !picked.includes(String(row[label]));
  ctx.rows.forEach((row, i) => {
    const total = totals[i] ?? 0;
    const count = counts[i] ?? [];
    const n = total > 0 ? Math.max(1, Math.round(total / perSquare)) : 0;
    const perPart = allocate(count, n);
    const item = html(doc, "div", "fft-strip");
    if (muted(row)) item.dataset.muted = "";
    item.setAttribute("role", "listitem");
    item.style.setProperty("--fft-i", String(i));
    const strip = svg(doc, "svg", { class: "fft-strip-squares", width: stripW, height: SIDE, viewBox: `0 0 ${stripW} ${SIDE}` });
    strip.setAttribute("aria-hidden", "true");
    let k = 0;
    perPart.forEach((m, p) => {
      for (let q = 0; q < m; q++, k++) {
        const rect = svg(doc, "rect", { class: "fft-strip-sq", x: k * PITCH, y: 0, width: SIDE, height: SIDE, rx: 1.5, "data-part": p, style: `--fft-k: ${k}` });
        rect.style.setProperty("fill", partColor(p));
        strip.append(rect);
      }
    });
    const end = html(doc, "span", "fft-strip-end");
    const text = endTexts[i] as { total: string; part: string; dense: string };
    end.append(html(doc, "span", "fft-strip-total", text.total));
    if (text.part) end.append(html(doc, "span", "fft-strip-share", `${text.part} ${ctx.label(first).toLowerCase()}`));
    if (text.dense) end.append(html(doc, "span", "fft-strip-density", text.dense));
    const nameNode = html(doc, "span", "fft-strip-label");
    writeLabel(nameNode, column.shown[i] ?? names[i] ?? "", names[i] ?? "");
    item.append(nameNode, strip, end);

    const items: TooltipItem[] = parts.map((field, p) => ({ label: ctx.label(field), value: ctx.format(row[field], field), color: partColor(p) }));
    if (parts.length > 1) items.push({ label: wordsFor(ctx).total, value: text.total });
    if (text.part) items.push({ label: wordsFor(ctx).partShare(ctx.label(first)), value: text.part });
    if (text.dense) items.push({ label: wordsFor(ctx).density, value: text.dense });
    rows.push(rowHit(ctx, { node: item, row, name: names[i] ?? "", items, anchor: strip, group: active }));
    list.append(item);
  });
  roving(rows);
  wrap.append(list);
  const note = html(doc, "p", "fft-strips-note", perSquare === 1 ? wordsFor(ctx).oneSquare(unit) : wordsFor(ctx).squaresOf(ctx.format(perSquare, first), units));
  wrap.append(note);
  wrap.append(hiddenTableOf(ctx, ctx.rows as Row[], [label, ...parts, ...(per ? [per] : [])]));
  ctx.el.append(wrap);
};
