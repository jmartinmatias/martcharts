import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { HeatmapView } from "../../core/views.ts";
import { quantize } from "../layout.ts";
import { hiddenTable, html, selectable } from "./shared.ts";
import { roving } from "./focus.ts";

/** Steps in the sequential scale. */
const STEPS = 7;

/**
 * Draws the `heatmap` view: a grid with one cell per x and y pair, shaded on
 * a 7-step single-hue scale from the lowest value to the highest. Values sit
 * inside the cells in white or ink, whichever the shade needs, and a legend
 * strip shows the range. Built from HTML, so labels stay crisp.
 */
export const renderHeatmap: ViewRenderer<HeatmapView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { x, y, value } = ctx.view;
  const columns: string[] = [];
  const lines: string[] = [];
  const cells = new Map<string, Row>();
  for (const row of ctx.rows) {
    const cx = String(row[x]);
    const cy = String(row[y]);
    if (!columns.includes(cx)) columns.push(cx);
    if (!lines.includes(cy)) lines.push(cy);
    cells.set(JSON.stringify([cy, cx]), row);
  }
  const numbers = ctx.rows.map((row) => readNumber(row[value])).filter((n): n is number => n !== null);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);

  const wrap = html(doc, "div", "fft-heat");
  const grid = html(doc, "div", "fft-heatmap");
  grid.style.gridTemplateColumns = `max-content repeat(${columns.length}, minmax(21px, 1fr))`;
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", `Heatmap of ${ctx.label(value)} by ${ctx.label(y)} and ${ctx.label(x)}`);
  grid.append(html(doc, "div", "fft-heat-corner"));
  const sample = (key: string, field: string) => {
    for (const row of ctx.rows) if (String(row[field]) === key) return ctx.format(row[field], field);
    return key;
  };
  for (const column of columns) grid.append(html(doc, "div", "fft-heat-col", sample(column, x)));
  for (const line of lines) {
    const rowName = sample(line, y);
    grid.append(html(doc, "div", "fft-heat-row", rowName));
    for (const column of columns) {
      const row = cells.get(JSON.stringify([line, column]));
      const amount = row ? readNumber(row[value]) : null;
      const cell = html(doc, "div", "fft-cell");
      const columnName = sample(column, x);
      if (row && amount !== null) {
        const text = ctx.format(row[value], value);
        cell.dataset.step = String(quantize(amount, min, max, STEPS));
        cell.textContent = text;
        cell.tabIndex = 0;
        cell.setAttribute("aria-label", `${rowName}, ${columnName}: ${text}`);
        const show = () => ctx.tooltip.show(cell, `${rowName}, ${columnName}`, [{ label: ctx.label(value), value: text }]);
        cell.addEventListener("pointerenter", show);
        cell.addEventListener("focus", show);
        cell.addEventListener("pointerleave", () => ctx.tooltip.hide());
        cell.addEventListener("blur", () => ctx.tooltip.hide());
        selectable(cell, () => ctx.select(row));
      } else {
        cell.classList.add("fft-cell-empty");
      }
      grid.append(cell);
    }
  }

  const legend = html(doc, "div", "fft-heat-legend");
  const ramp = html(doc, "div", "fft-heat-ramp");
  ramp.setAttribute("aria-hidden", "true");
  for (let step = 1; step <= STEPS; step++) {
    const swatch = html(doc, "div");
    swatch.dataset.step = String(step);
    ramp.append(swatch);
  }
  legend.append(html(doc, "span", undefined, ctx.format(min, value)), ramp, html(doc, "span", undefined, ctx.format(max, value)));
  const focusable = [...grid.querySelectorAll(".fft-cell:not(.fft-cell-empty)")];
  // A complete grid moves by rows with up and down; a sparse one moves cell to cell.
  roving(focusable, focusable.length === columns.length * lines.length ? { down: columns.length } : {});
  // The grid as a table for screen readers: one row per line, one column per column.
  const table = hiddenTable(
    doc,
    [ctx.label(y), ...columns.map((column) => sample(column, x))],
    lines.map((line) => [
      sample(line, y),
      ...columns.map((column) => {
        const row = cells.get(JSON.stringify([line, column]));
        return row ? ctx.format(row[value], value) : "";
      }),
    ]),
  );
  wrap.append(grid, legend, table);
  ctx.el.append(wrap);
};
