import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { HeatmapView } from "../../core/views.ts";
import { quantize } from "../layout.ts";
import { activeGroup, hiddenTable, html, selectable, textWidth } from "./shared.ts";
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
  const sample = (key: string, field: string) => {
    for (const row of ctx.rows) if (String(row[field]) === key) return ctx.format(row[field], field);
    return key;
  };
  // Every cell the same size, from the card and never from its content: the row names take what the longest needs
  // (up to a third of the card), the columns share the rest equally, between a tappable 21px and 89px. Narrower than
  // that, the grid keeps 21px cells and scrolls sideways inside its card.
  const GAP = 2;
  const nameW = Math.round(Math.min(Math.max(34, ...lines.map((line) => textWidth(sample(line, y)) + 9)), ctx.width * 0.34));
  const cell = Math.max(21, Math.min(89, Math.floor((ctx.width - nameW - GAP * columns.length) / Math.max(1, columns.length))));
  grid.style.gridTemplateColumns = `${nameW}px repeat(${columns.length}, ${cell}px)`;
  grid.style.setProperty("--fft-heat-cell", `${cell}px`);
  const scrolls = nameW + (cell + GAP) * columns.length > ctx.width + 1;
  if (scrolls) wrap.dataset.scrolls = "";
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", `Heatmap of ${ctx.label(value)} by ${ctx.label(y)} and ${ctx.label(x)}`);
  grid.append(html(doc, "div", "fft-heat-corner"));
  for (const column of columns) grid.append(html(doc, "div", "fft-heat-col", sample(column, x)));
  // While one cell is pointed at, the others step back, as every view's marks do.
  const group = activeGroup(grid, ctx.tooltip);
  let order = 0;
  for (const line of lines) {
    const rowName = sample(line, y);
    const nameCell = html(doc, "div", "fft-heat-row", rowName);
    nameCell.title = rowName;
    grid.append(nameCell);
    for (const column of columns) {
      const row = cells.get(JSON.stringify([line, column]));
      const amount = row ? readNumber(row[value]) : null;
      const box = html(doc, "div", "fft-cell");
      // Cells fade in reading order: row by row, left to right.
      box.style.setProperty("--fft-i", String(order++));
      const columnName = sample(column, x);
      if (row && amount !== null) {
        const text = ctx.format(row[value], value);
        box.dataset.step = String(quantize(amount, min, max, STEPS));
        // A number too wide for its cell is left to the tooltip and the screen reader, so it never spills.
        if (textWidth(text, 11, 500) + 6 <= cell) box.textContent = text;
        else box.dataset.quiet = "";
        box.tabIndex = 0;
        box.setAttribute("aria-label", `${rowName}, ${columnName}: ${text}`);
        const show = () => {
          group.on(box);
          ctx.tooltip.show(box, `${rowName}, ${columnName}`, [{ label: ctx.label(value), value: text }]);
        };
        box.addEventListener("pointerenter", show);
        box.addEventListener("focus", show);
        box.addEventListener("pointerleave", () => group.off());
        box.addEventListener("blur", () => group.off());
        selectable(box, () => ctx.select(row));
      } else {
        box.classList.add("fft-cell-empty");
      }
      grid.append(box);
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
  // With no number at all there is no range to key: say so instead of a scale from Infinity to -Infinity.
  if (numbers.length) wrap.append(grid, legend, table);
  else wrap.append(grid, html(doc, "p", "fft-empty-note", `No cell has a number in ${ctx.label(value)}.`), table);
  ctx.el.append(wrap);
};
