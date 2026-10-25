import { formatValue } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { ViewContext, ViewRenderer } from "../../core/view-context.ts";
import type { KpiView } from "../../core/views.ts";
import { ICONS } from "../../core/icons.ts";
import { linePath } from "../layout.ts";
import { countable } from "../count-up.ts";
import { deltaElement } from "./delta.ts";
import { html, svg } from "./shared.ts";
import { targetLine } from "./target.ts";
import { ragFromValue } from "../../core/rag.ts";
import { ragPill } from "./rag-shared.ts";

/** Sparkline height in pixels: a Fibonacci step. */
const SPARK_HEIGHT = 34;

/**
 * Draws the `kpi` view: a label, the headline number, and the change against a
 * comparison as a signed percentage. The change carries an arrow and a sign,
 * so its color is never the only signal.
 *
 * Reads the first row. With `series`, reads the rows as a time series: the
 * headline is the last row, the comparison is the row before (unless
 * `compare` names a field), and a sparkline shows every row.
 */
export const renderKpi: ViewRenderer<KpiView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { value: field, compare, goodWhen = "up", label, series, x, target } = ctx.view;
  const rows = ctx.rows;
  const row = (series ? rows[rows.length - 1] : rows[0]) ?? {};
  const previous: Row | undefined = series ? rows[rows.length - 2] : undefined;
  const value = row[field];
  const hasFormat = ctx.spec.fields?.[field]?.format !== undefined;
  const show = (v: unknown) => (hasFormat ? ctx.format(v, field) : formatValue(v, { type: "number", compact: true }, ctx.spec.locale));
  const valueText = show(value);

  const box = html(doc, "div", "fft-kpi");
  const icon = ctx.view.icon ? ICONS[ctx.view.icon] : undefined;
  if (icon) {
    const tile = html(doc, "span", "fft-kpi-icon");
    tile.dataset.icon = ctx.view.icon;
    tile.setAttribute("aria-hidden", "true");
    const glyph = svg(doc, "svg", { width: 21, height: 21, viewBox: "0 0 24 24" });
    for (const d of icon) glyph.append(svg(doc, "path", { d }));
    tile.append(glyph);
    box.append(tile);
  }
  const number = html(doc, "div", "fft-kpi-value", valueText);
  countable(number, readNumber(value), show);
  box.append(html(doc, "div", "fft-kpi-label", label ?? ctx.label(field)), number);

  const now = readNumber(value);
  // With RAG thresholds, a pill says where the number stands: its shape and its words, never color alone.
  if (ctx.view.rag && now !== null) box.append(ragPill(doc, ragFromValue(now, ctx.view.rag), {}, "fft-kpi-rag"));
  const before = compare ? readNumber(row[compare]) : previous ? readNumber(previous[field]) : null;
  if (now !== null && before !== null && before !== 0) {
    const fallbackLabel = compare
      ? `vs ${ctx.label(compare)}`
      : x && previous
        ? `vs ${ctx.format(previous[x], x)}`
        : "vs previous period";
    box.append(deltaElement(doc, (now - before) / Math.abs(before), goodWhen, ctx.view.compareLabel ?? fallbackLabel, ctx.spec.locale));
  }
  // With a target, one plain line says where the latest stands: met, or how far it has to go (or, when lower is better, how far above).
  const line = targetLine(doc, "fft-kpi-target", now, target ? readNumber(row[target]) : null, goodWhen, show);
  if (line) box.append(line);
  if (series && rows.length > 1) box.append(sparkline(ctx, rows.map((r) => readNumber(r[field]))));
  ctx.el.append(box);
};

/** A quiet trend line in the de-emphasis ink, with the latest point in the accent. Shared with the `kpis` view. */
export function sparkline(ctx: ViewContext<{ type: string }>, values: (number | null)[], width = ctx.width): SVGSVGElement {
  const doc = ctx.el.ownerDocument;
  width = Math.max(55, width);
  const pad = 5;
  const present = values.filter((v): v is number => v !== null);
  const low = Math.min(...present);
  const high = Math.max(...present);
  const span = high - low || 1;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => (v === null ? null : { x: pad + i * step, y: SPARK_HEIGHT - pad - ((v - low) / span) * (SPARK_HEIGHT - pad * 2) }));
  const chart = svg(doc, "svg", { class: "fft-sparkline", width, height: SPARK_HEIGHT, viewBox: `0 0 ${width} ${SPARK_HEIGHT}` });
  chart.setAttribute("aria-hidden", "true");
  chart.append(svg(doc, "path", { class: "fft-spark-line", d: linePath(points), pathLength: 1 }));
  const last = points.findLast((p) => p !== null);
  if (last) chart.append(svg(doc, "circle", { class: "fft-spark-end", cx: last.x, cy: last.y, r: 3 }));
  return chart;
}
