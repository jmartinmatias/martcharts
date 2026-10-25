import { formatValue } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { KpisView } from "../../core/views.ts";
import { countable } from "../count-up.ts";
import { deltaElement } from "./delta.ts";
import { sparkline } from "./kpi.ts";
import { html } from "./shared.ts";
import { targetLine } from "./target.ts";
import { ragFromValue } from "../../core/rag.ts";
import { ragPill } from "./rag-shared.ts";

/**
 * Draws the `kpis` view: one strip of stat tiles separated by hairlines, each
 * with a label, the value (short form unless the field has a format) and its
 * change. In series mode values come from the last row, changes compare with
 * the row before, and every tile carries a sparkline.
 */
export const renderKpis: ViewRenderer<KpisView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { items, series } = ctx.view;
  const rows = ctx.rows;
  const row = (series ? rows[rows.length - 1] : rows[0]) ?? {};
  const before = rows.length > 1 ? (series ? rows[rows.length - 2] : rows[1]) : undefined;
  const strip = html(doc, "div", "fft-stats");
  const tileWidth = Math.max(89, Math.floor(ctx.width / Math.max(1, items.length)) - 21);
  for (const item of items) {
    const field = item.value;
    const tile = html(doc, "div", "fft-stat");
    const hasFormat = ctx.spec.fields?.[field]?.format !== undefined;
    const value = row[field];
    const show = (v: unknown) => (hasFormat ? ctx.format(v, field) : formatValue(v, { type: "number", compact: true }, ctx.spec.locale));
    const number = html(doc, "div", "fft-stat-value", show(value));
    countable(number, readNumber(value), show);
    tile.append(html(doc, "div", "fft-stat-label", item.label ?? ctx.label(field)), number);
    const compare = item.compare ?? (series ? "previous" : undefined);
    const now = readNumber(value);
    // With RAG thresholds, a pill says where the tile stands: its shape and its words, never color alone.
    if (item.rag && now !== null) tile.append(ragPill(doc, ragFromValue(now, item.rag), {}, "fft-stat-rag"));
    const then = compare === "previous" ? (before ? readNumber(before[field]) : null) : compare ? readNumber(row[compare]) : null;
    if (now !== null && then !== null && then !== 0) {
      tile.append(deltaElement(doc, (now - then) / Math.abs(then), item.goodWhen ?? "up", item.compareLabel, ctx.spec.locale));
    }
    // With a target, the same plain line as a single headline number: met, or how far to go.
    const line = targetLine(doc, "fft-stat-target", now, item.target ? readNumber(row[item.target]) : null, item.goodWhen ?? "up", show);
    if (line) tile.append(line);
    if (series && rows.length > 1) tile.append(sparkline(ctx, rows.map((r) => readNumber(r[field])), tileWidth));
    strip.append(tile);
  }
  ctx.el.append(strip);
};
