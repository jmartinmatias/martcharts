import { readNumber } from "../../core/formats.ts";
import { fitLabel } from "./label-fit.ts";
import { sequentialStep } from "../../core/geo.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import { WHITESPACE_STATES } from "../../core/views.ts";
import type { WhitespaceView } from "../../core/views.ts";
import { activeGroup, hiddenTable, html, labelColumn, legendList, roving, rowHit, textWidth } from "./shared.ts";
import { wordsFor } from "./words.ts";

/** A column narrower than this, in pixels, turns its header on its side. */
const TIGHT = 55;

type State = "holds" | "opportunity" | "none";

interface Line {
  key: string;
  name: string;
  /** Cells by column key. */
  cells: Map<string, { row: Row; state: State | undefined; score: number | null; value: number | null }>;
  holds: number;
  open: number;
  potential: number;
}

/**
 * Draws the `whitespace` view, the cross-sell map: a grid with one row per client
 * and one column per product. A held product is a filled square, an opportunity an
 * outlined one whose tint strengthens with its score, a client not eligible for a
 * product a faint dot, and a pair with no row stays blank. Each row ends with its
 * penetration and the potential still open; each column with how many hold it and how
 * many could. Built from HTML, so names stay crisp and the grid reflows with the card.
 */

export const renderWhitespace: ViewRenderer<WhitespaceView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { row: rowField, column: columnField, state: stateField, score: scoreField, value: valueField } = ctx.view;
  // Held products in one hue; a product with a fixed color keeps it in its own column.
  const held = ctx.color(0);
  const names = (Array.isArray(ctx.view.states) && ctx.view.states.length === 3 ? ctx.view.states : WHITESPACE_STATES).map(String);
  const stateOf = (value: unknown): State | undefined => {
    const text = String(value);
    return text === names[0] ? "holds" : text === names[1] ? "opportunity" : text === names[2] ? "none" : undefined;
  };

  const columns: { key: string; name: string; holds: number; open: number }[] = [];
  const lines: Line[] = [];
  for (const row of ctx.rows) {
    const cKey = String(row[columnField]);
    let column = columns.find((c) => c.key === cKey);
    if (!column) {
      column = { key: cKey, name: ctx.format(row[columnField], columnField), holds: 0, open: 0 };
      columns.push(column);
    }
    const lKey = String(row[rowField]);
    let line = lines.find((l) => l.key === lKey);
    if (!line) {
      line = { key: lKey, name: ctx.format(row[rowField], rowField), cells: new Map(), holds: 0, open: 0, potential: 0 };
      lines.push(line);
    }
    const state = stateOf(row[stateField]);
    const score = scoreField ? readNumber(row[scoreField]) : null;
    const value = valueField ? readNumber(row[valueField]) : null;
    line.cells.set(cKey, { row, state, score, value });
    if (state === "holds") {
      line.holds++;
      column.holds++;
    } else if (state === "opportunity") {
      line.open++;
      column.open++;
      line.potential += value ?? 0;
    }
  }
  const eligible = (line: Line) => line.holds + line.open;
  const sort = ctx.view.sort ?? "potential";
  if (sort === "potential") lines.sort((a, b) => b.potential - a.potential || b.open - a.open);
  else if (sort === "penetration") lines.sort((a, b) => (eligible(a) ? a.holds / eligible(a) : 1) - (eligible(b) ? b.holds / eligible(b) : 1) || b.open - a.open);
  // limit keeps the first rows in that order (the most to win, by default), whatever a filter leaves, and says how many more.
  const limit = typeof ctx.view.limit === "number" && ctx.view.limit > 0 ? Math.floor(ctx.view.limit) : 0;
  const hidden = limit && lines.length > limit ? lines.splice(limit).length : 0;

  const scores = ctx.rows.map((row) => (scoreField ? readNumber(row[scoreField]) : null)).filter((n): n is number => n !== null);
  const [low, high] = scores.length ? [Math.min(...scores), Math.max(...scores)] : [0, 100];
  const money = (n: number) => (valueField ? ctx.format(n, valueField) : String(n));
  const hasValue = Boolean(valueField) && lines.some((line) => line.potential > 0);

  const wrap = html(doc, "div", "fft-ws");
  // The legend: the three states as the marks themselves.
  if (!ctx.inFacet) {
    const states = ["holds", "opportunity", "none"] as const;
    const legend = legendList(ctx, states.map((state, i) => ({ label: names[i] ?? "", color: state === "holds" ? held : "" })));
    if (legend) {
      legend.classList.add("fft-ws-legend");
      legend.querySelectorAll<HTMLElement>(".fft-swatch").forEach((swatch, i) => {
        const state = states[i] as (typeof states)[number];
        swatch.classList.add("fft-ws-swatch");
        swatch.dataset.state = state;
        if (state !== "holds") swatch.style.removeProperty("background");
        if (state === "opportunity") swatch.style.setProperty("--fft-ws-color", held);
      });
      wrap.append(legend);
    }
  }

  const grid = html(doc, "div", "fft-ws-grid");
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", wordsFor(ctx).aria.whitespace(ctx.label(columnField), ctx.label(rowField)));
  // The name column is as wide as the longest name, measured, up to a third of the card; longer names end in an ellipsis.
  const nameWidth = labelColumn(lines.map((line) => line.name), ctx.width, { min: 55, size: 13 });
  grid.style.gridTemplateColumns = `minmax(55px, ${nameWidth}px) repeat(${columns.length}, minmax(21px, 1fr)) max-content`;
  // The narrowest the grid can be: the names' floor, a tappable 21px per product and the row ends' figures. On a
  // card narrower than that, the cells keep their size and the grid scrolls sideways, never squeezing a cell.
  const endTexts = lines.flatMap((line) => [wordsFor(ctx).outOf(String(line.holds), String(eligible(line))), ...(hasValue && line.potential > 0 ? [money(line.potential)] : []), hasValue ? wordsFor(ctx).heldToWin : wordsFor(ctx).held]);
  const floor = 55 + columns.length * 23 + Math.max(...endTexts.map((text) => textWidth(text, 11, 600))) + 13;
  if (floor > ctx.width) wrap.dataset.scrolls = "";
  // Narrow columns turn their names on their side, so every product keeps its full name.
  const perColumn = (ctx.width - 89 - (hasValue ? 89 : 55)) / Math.max(1, columns.length);
  if (perColumn < TIGHT) grid.dataset.tight = "";
  grid.append(html(doc, "div", "fft-ws-corner"));
  for (const column of columns) {
    const head = html(doc, "div", "fft-ws-col");
    head.append(html(doc, "span", "fft-ws-col-name", column.name));
    grid.append(head);
  }
  grid.append(html(doc, "div", "fft-ws-head-sum", hasValue ? wordsFor(ctx).heldToWin : wordsFor(ctx).held));

  const cells: Element[] = [];
  const active = activeGroup(grid, ctx.tooltip);
  lines.forEach((line, i) => {
    // Cut between words to the measured name column (less its padding), never inside a word that would fit whole.
    const rowName = html(doc, "div", "fft-ws-row", fitLabel(line.name, nameWidth - 10, 11));
    rowName.title = line.name;
    grid.append(rowName);
    for (const column of columns) {
      const entry = line.cells.get(column.key);
      const cell = html(doc, "div", "fft-ws-cell");
      cell.style.setProperty("--fft-i", String(i));
      if (!entry || !entry.state) {
        cell.dataset.state = "empty";
        grid.append(cell);
        continue;
      }
      cell.dataset.state = entry.state;
      const mark = html(doc, "span", "fft-ws-mark");
      mark.setAttribute("aria-hidden", "true");
      if (entry.state === "holds") mark.style.background = ctx.colorOf?.(column.name) ?? held;
      if (entry.state === "opportunity") {
        mark.style.setProperty("--fft-ws-color", ctx.colorOf?.(column.name) ?? held);
        if (entry.score !== null) mark.dataset.step = String(sequentialStep(entry.score, Math.min(0, low), Math.max(high, low + 1)));
      }
      cell.append(mark);
      const stateName = entry.state === "holds" ? names[0] : entry.state === "opportunity" ? names[1] : names[2];
      const items: TooltipItem[] = [{ label: ctx.label(stateField), value: stateName ?? "" }];
      if (entry.state === "opportunity" && entry.score !== null && scoreField) items.push({ label: ctx.label(scoreField), value: ctx.format(entry.row[scoreField], scoreField) });
      if (entry.state !== "none" && entry.value !== null && valueField) items.push({ label: entry.state === "holds" ? ctx.label(valueField) : wordsFor(ctx).potential, value: ctx.format(entry.row[valueField], valueField) });
      // A labelled mark: the label says what the square only shows (aria-label needs a role on a div).
      cell.setAttribute("role", "img");
      cells.push(rowHit(ctx, { node: cell, row: entry.row, name: `${line.name} · ${column.name}`, items, group: active }));
      cell.setAttribute("aria-label", `${line.name}, ${column.name}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
      grid.append(cell);
    }
    const sum = html(doc, "div", "fft-ws-sum");
    const count = html(doc, "span", "fft-ws-count", wordsFor(ctx).outOf(String(line.holds), String(eligible(line))));
    sum.append(count);
    if (hasValue) sum.append(html(doc, "span", "fft-ws-potential", line.potential > 0 ? money(line.potential) : "–"));
    sum.setAttribute("role", "img");
    sum.setAttribute("aria-label", `${line.name}: ${wordsFor(ctx).holdsOf(String(line.holds), String(eligible(line)))}${hasValue && line.potential > 0 ? `, ${wordsFor(ctx).toWinAmount(money(line.potential))}` : ""}`);
    grid.append(sum);
  });
  // The column foot: how many hold it, how many could.
  grid.append(html(doc, "div", "fft-ws-foot-label", wordsFor(ctx).holdCould));
  for (const column of columns) {
    const foot = html(doc, "div", "fft-ws-foot");
    foot.append(html(doc, "span", "fft-ws-foot-holds", String(column.holds)), html(doc, "span", "fft-ws-foot-open", String(column.open)));
    foot.setAttribute("role", "img");
    foot.setAttribute("aria-label", `${column.name}: ${wordsFor(ctx).holdCouldOf(String(column.holds), String(column.open))}`);
    grid.append(foot);
  }
  grid.append(html(doc, "div", "fft-ws-corner"));
  // A complete grid moves by rows with up and down; a sparse one moves cell to cell.
  roving(cells, cells.length === lines.length * columns.length ? { down: columns.length } : {});
  wrap.append(grid);
  if (hidden) wrap.append(html(doc, "p", "fft-ws-more", wordsFor(ctx).andMoreRows(hidden, ctx.label(rowField).toLowerCase())));

  wrap.append(
    hiddenTable(
      doc,
      [ctx.label(rowField), ...columns.map((c) => c.name), wordsFor(ctx).held, ...(hasValue ? [wordsFor(ctx).toWin] : [])],
      lines.map((line) => [
        line.name,
        ...columns.map((c) => {
          const entry = line.cells.get(c.key);
          return entry?.state === "holds" ? (names[0] ?? "") : entry?.state === "opportunity" ? (names[1] ?? "") : entry?.state === "none" ? (names[2] ?? "") : "";
        }),
        wordsFor(ctx).outOf(String(line.holds), String(eligible(line))),
        ...(hasValue ? [line.potential > 0 ? money(line.potential) : ""] : []),
      ]),
    ),
  );
  ctx.el.append(wrap);
};
