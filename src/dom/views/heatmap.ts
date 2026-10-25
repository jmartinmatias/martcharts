import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { HeatmapView } from "../../core/views.ts";
import { quantize } from "../layout.ts";
import { activeGroup, hiddenTable, html, selectable, svg as svgNode, textWidth } from "./shared.ts";
import { drawsScaleKey, sharedRange } from "./facet-key.ts";
import { roving } from "./focus.ts";
import { wordsFor } from "./words.ts";

/** Steps in the sequential scale. */
const STEPS = 7;

/** Past this many cells a heatmap draws dense: one SVG path per shade instead of one box per cell. */
export const DENSE_CELLS = 1500;

/** Lines a dense heatmap lists for screen readers. */
const DENSE_TABLE_LINES = 30;

/** At most about this many cells in that table, however many columns there are. */
const DENSE_TABLE_CELLS = 1000;

/**
 * Draws the `heatmap` view: a grid with one cell per x and y pair, shaded on
 * a 7-step single-hue scale from the lowest value to the highest. Values sit
 * inside the cells in white or ink, whichever the shade needs, and a legend
 * strip shows the range. Built from HTML, so labels stay crisp.
 */
export const renderHeatmap: ViewRenderer<HeatmapView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { x, y, value } = ctx.view;
  // Columns and lines in order of first appearance, each with the text it shows, found once (not once per cell:
  // 5,000 cells once took 25 million lookups).
  const columnText = new Map<string, string>();
  const lineText = new Map<string, string>();
  const cells = new Map<string, Row>();
  for (const row of ctx.rows) {
    const cx = String(row[x]);
    const cy = String(row[y]);
    if (!columnText.has(cx)) columnText.set(cx, ctx.format(row[x], x));
    if (!lineText.has(cy)) lineText.set(cy, ctx.format(row[y], y));
    cells.set(JSON.stringify([cy, cx]), row);
  }
  const columns = [...columnText.keys()];
  const lines = [...lineText.keys()];
  const numbers = ctx.rows.map((row) => readNumber(row[value])).filter((n): n is number => n !== null);
  // Small multiples share one color scale: every panel shades the same number the same.
  const [min, max] = sharedRange(numbers, ctx.extent);

  const wrap = html(doc, "div", "fft-heat");
  const grid = html(doc, "div", "fft-heatmap");
  const sample = (key: string, field: string) => (field === x ? columnText.get(key) : lineText.get(key)) ?? key;
  if (columns.length * lines.length > DENSE_CELLS && numbers.length) return drawDense();
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
  grid.setAttribute("aria-label", wordsFor(ctx).aria.heatmap(ctx.label(value), ctx.label(y), ctx.label(x)));
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
  if (numbers.length) wrap.append(grid, ...(drawsScaleKey(ctx) ? [legend] : []), table);
  else wrap.append(grid, html(doc, "p", "fft-empty-note", wordsFor(ctx).noCellNumber(ctx.label(value))), table);
  ctx.el.append(wrap);

  /**
   * The dense drawing, past 1,500 cells: an SVG with one path per shade (every cell of that step a small rectangle in
   * it), names thinned so they never collide, one transparent layer that finds the cell under the pointer by
   * arithmetic, and one probe outline that the arrow keys move. 5,000 cells drawn as boxes once took 60,000 nodes.
   */
  function drawDense() {
    const legendFor = () => {
      const strip = html(doc, "div", "fft-heat-legend");
      const ramp = html(doc, "div", "fft-heat-ramp");
      ramp.setAttribute("aria-hidden", "true");
      for (let step = 1; step <= STEPS; step++) {
        const swatch = html(doc, "div");
        swatch.dataset.step = String(step);
        ramp.append(swatch);
      }
      strip.append(html(doc, "span", undefined, ctx.format(min, value)), ramp, html(doc, "span", undefined, ctx.format(max, value)));
      return strip;
    };
    const nameW = Math.round(Math.min(Math.max(34, ...lines.slice(0, 200).map((line) => textWidth(sample(line, y)) + 9)), ctx.width * 0.3));
    const cellW = Math.max(3, Math.min(21, (ctx.width - nameW) / Math.max(1, columns.length)));
    const cellH = Math.max(3, Math.min(21, cellW));
    const top = 21;
    const width = Math.ceil(nameW + cellW * columns.length);
    const height = Math.ceil(top + cellH * lines.length);
    const chart = svgNode(doc, "svg", { class: "fft-heat-dense", width, height, viewBox: `0 0 ${width} ${height}` });
    chart.setAttribute("role", "group");
    chart.setAttribute("aria-label", wordsFor(ctx).aria.heatmap(ctx.label(value), ctx.label(y), ctx.label(x)));
    const steps: string[][] = Array.from({ length: STEPS }, () => []);
    const r = (n: number) => Math.round(n * 100) / 100;
    lines.forEach((line, li) => {
      columns.forEach((column, ci) => {
        const row = cells.get(JSON.stringify([line, column]));
        const amount = row ? readNumber(row[value]) : null;
        if (amount === null) return;
        const step = quantize(amount, min, max, STEPS);
        steps[step - 1]?.push(`M${r(nameW + ci * cellW)},${r(top + li * cellH)}h${r(cellW - 0.5)}v${r(cellH - 0.5)}h${r(-(cellW - 0.5))}z`);
      });
    });
    steps.forEach((d, i) => {
      if (!d.length) return;
      const path = svgNode(doc, "path", { class: "fft-heat-step", d: d.join("") });
      path.dataset.step = String(i + 1);
      chart.append(path);
    });
    // Names, thinned to one every so many lines or columns so 11px text never overlaps.
    const everyLine = Math.max(1, Math.ceil(13 / cellH));
    lines.forEach((line, li) => {
      if (li % everyLine) return;
      const text = svgNode(doc, "text", { class: "fft-heat-dense-row", x: nameW - 5, y: r(top + li * cellH + cellH / 2), "text-anchor": "end", "dominant-baseline": "central" });
      text.textContent = sample(line, y);
      chart.append(text);
    });
    const widest = Math.max(...columns.map((column) => textWidth(sample(column, x)))) + 8;
    const everyColumn = Math.max(1, Math.ceil(widest / cellW));
    columns.forEach((column, ci) => {
      if (ci % everyColumn) return;
      const text = svgNode(doc, "text", { class: "fft-heat-dense-col", x: r(nameW + ci * cellW), y: 13, "text-anchor": "start" });
      text.textContent = sample(column, x);
      chart.append(text);
    });
    const probe = svgNode(doc, "rect", { class: "fft-heat-probe", x: 0, y: 0, width: 0, height: 0 });
    probe.setAttribute("aria-hidden", "true");
    const layer = svgNode(doc, "rect", { class: "fft-heat-layer", x: nameW, y: top, width: cellW * columns.length, height: cellH * lines.length, tabindex: 0, role: "img" });
    layer.setAttribute("aria-label", wordsFor(ctx).denseHeatmap(lines.length * columns.length));
    const spoken = html(doc, "span", "fft-sr-only");
    spoken.setAttribute("aria-live", "polite");
    let at: [number, number] = [-1, -1];
    const show = (li: number, ci: number) => {
      at = [li, ci];
      probe.setAttribute("x", String(r(nameW + ci * cellW)));
      probe.setAttribute("y", String(r(top + li * cellH)));
      probe.setAttribute("width", String(r(cellW)));
      probe.setAttribute("height", String(r(cellH)));
      const [line, column] = [lines[li] as string, columns[ci] as string];
      const row = cells.get(JSON.stringify([line, column]));
      const text = row ? ctx.format(row[value], value) : wordsFor(ctx).noData;
      const title = `${sample(line, y)}, ${sample(column, x)}`;
      ctx.tooltip.show(probe, title, [{ label: ctx.label(value), value: text }]);
      spoken.textContent = `${title}: ${text}`;
    };
    const hide = () => {
      at = [-1, -1];
      probe.setAttribute("width", "0");
      ctx.tooltip.hide();
    };
    const cellAt = (event: MouseEvent): [number, number] => {
      const box = chart.getBoundingClientRect();
      const scale = box.width ? width / box.width : 1;
      const ci = Math.floor(((event.clientX - box.left) * scale - nameW) / cellW);
      const li = Math.floor(((event.clientY - box.top) * scale - top) / cellH);
      return [li, ci];
    };
    const inside = ([li, ci]: [number, number]) => li >= 0 && ci >= 0 && li < lines.length && ci < columns.length;
    layer.addEventListener("pointermove", (event) => {
      const spot = cellAt(event as MouseEvent);
      if (inside(spot)) show(...spot);
      else hide();
    });
    layer.addEventListener("pointerleave", hide);
    layer.addEventListener("click", (event) => {
      const spot = cellAt(event as MouseEvent);
      const row = inside(spot) ? cells.get(JSON.stringify([lines[spot[0]], columns[spot[1]]])) : undefined;
      if (row) ctx.select(row);
    });
    layer.addEventListener("focus", () => show(0, 0));
    layer.addEventListener("blur", hide);
    layer.addEventListener("keydown", (event) => {
      const key = (event as KeyboardEvent).key;
      const move = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[key];
      if (move) {
        event.preventDefault();
        const [li, ci] = at[0] < 0 ? [0, 0] : at;
        show(Math.max(0, Math.min(lines.length - 1, li + (move[0] as number))), Math.max(0, Math.min(columns.length - 1, ci + (move[1] as number))));
      } else if ((key === "Enter" || key === " ") && at[0] >= 0) {
        event.preventDefault();
        const row = cells.get(JSON.stringify([lines[at[0]], columns[at[1]]]));
        if (row) ctx.select(row);
      }
    });
    chart.append(probe, layer);
    const scroller = html(doc, "div", "fft-heat-scroll");
    scroller.append(chart);
    // Screen readers get the first lines as a table, and the count of the rest; the keyboard walks every cell.
    const shown = lines.slice(0, Math.max(1, Math.min(DENSE_TABLE_LINES, Math.floor(DENSE_TABLE_CELLS / Math.max(1, columns.length)))));
    const table = hiddenTable(
      doc,
      [ctx.label(y), ...columns.map((column) => sample(column, x))],
      shown.map((line) => [sample(line, y), ...columns.map((column) => {
        const row = cells.get(JSON.stringify([line, column]));
        return row ? ctx.format(row[value], value) : "";
      })]),
    );
    wrap.append(scroller, ...(drawsScaleKey(ctx) ? [legendFor()] : []), spoken, table);
    ctx.el.append(wrap);
  }
};
