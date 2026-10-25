import { ragCounts, ragOf, ragRank, ragTrend, ragWord, RAG_ORDER, worstOf } from "../../core/rag.ts";
import type { Rag, RagTrend } from "../../core/rag.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { RagboardView } from "../../core/views.ts";
import { roving } from "./focus.ts";
import { ragColor, ragMark, srText } from "./rag-shared.ts";
import type { RagLook } from "./rag-shared.ts";
import { fieldList, html, selectable } from "./shared.ts";

/** The column key of the overall (worst-of) status. */
const OVERALL = "\u0000overall";

/** One row of the board, its statuses read once. */
interface Line {
  row: Row;
  name: string;
  statuses: Rag[];
  previous: (Rag | undefined)[];
  overall: Rag;
}

/**
 * Draws the `ragboard` view, the RAG scorecard: a summary strip that counts each status, then a table with one row per
 * entity and one status cell per dimension (the worst of them first, as Overall). Each cell shows its status's shape,
 * says its words to screen readers, and carries an arrow in its corner when it improved or got worse since the last
 * period. A footer counts each column's statuses. Rows come worst first.
 */
export const renderRagboard: ViewRenderer<RagboardView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const view = ctx.view;
  const look: RagLook = { words: view.words, shapes: view.shapes };
  const word = (status: Rag) => ragWord(status, look.words);
  const dims = fieldList(view.dimensions);
  const previousOf = (view.previous && typeof view.previous === "object" ? view.previous : {}) as Record<string, string>;
  const overall = view.overall !== false;
  const label = view.label;

  const lines: Line[] = ctx.rows.map((row) => {
    const statuses = dims.map((field) => ragOf(row[field]));
    const previous = dims.map((field) => (previousOf[field] ? ragOf(row[previousOf[field] as string]) : undefined));
    return { row, name: ctx.format(row[label], label), statuses, previous, overall: worstOf(statuses) };
  });
  const order = view.sort ?? "worst";
  const reds = (line: Line) => line.statuses.filter((s) => s === "R").length;
  const ambers = (line: Line) => line.statuses.filter((s) => s === "A").length;
  if (order === "worst") lines.sort((a, b) => ragRank(a.overall) - ragRank(b.overall) || reds(b) - reds(a) || ambers(b) - ambers(a));
  else if (order === "name") lines.sort((a, b) => a.name.localeCompare(b.name, ctx.spec.locale));

  // The columns: Overall first (the one to act on), then each dimension.
  const columns = [...(overall ? [{ key: OVERALL, title: "Overall" }] : []), ...dims.map((field) => ({ key: field, title: ctx.label(field) }))];
  const statusAt = (line: Line, c: number): Rag => (overall ? (c === 0 ? line.overall : (line.statuses[c - 1] as Rag)) : (line.statuses[c] as Rag));
  const previousAt = (line: Line, c: number): Rag | undefined => {
    const d = overall ? c - 1 : c;
    if (d < 0) return line.previous.some((p) => p !== undefined) ? worstOf(line.previous) : undefined;
    return line.previous[d];
  };

  const wrap = html(doc, "div", "fft-ragboard");

  // The summary: how many of each status across every cell of every dimension, and its share.
  const counts = ragCounts(lines.flatMap((line) => line.statuses));
  const rowCounts = ragCounts(lines.map((line) => line.overall));
  const share = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0 });
  const summary = html(doc, "ul", "fft-rag-summary");
  summary.setAttribute("aria-label", `${lines.length} ${lines.length === 1 ? "row" : "rows"} by overall status`);
  for (const status of RAG_ORDER) {
    const n = overall ? rowCounts[status] : counts[status];
    const total = overall ? rowCounts.total : counts.total;
    if (status === "N" && n === 0) continue;
    const item = html(doc, "li", "fft-rag-sum");
    item.dataset.rag = status;
    item.append(ragMark(doc, status, look, 14), html(doc, "span", "fft-rag-sum-count", String(n)), html(doc, "span", "fft-rag-sum-word", word(status)));
    if (status !== "N" && total > 0) item.append(html(doc, "span", "fft-rag-sum-share", share.format(n / total)));
    summary.append(item);
  }
  wrap.append(summary);

  const scroller = html(doc, "div", "fft-rag-scroll");
  const table = html(doc, "table", "fft-rag-table");
  table.style.setProperty("--fft-rag-cols", String(columns.length));
  const head = html(doc, "thead");
  const headRow = html(doc, "tr");
  const corner = html(doc, "th", "fft-rag-corner", ctx.label(label));
  corner.scope = "col";
  headRow.append(corner);
  columns.forEach((column) => {
    const th = html(doc, "th", column.key === OVERALL ? "fft-rag-head fft-rag-head-overall" : "fft-rag-head", column.title);
    th.scope = "col";
    headRow.append(th);
  });
  head.append(headRow);
  table.append(head);

  const cells: HTMLElement[] = [];
  const rowsOut: HTMLElement[] = [];
  const deactivate = () => {
    table.removeAttribute("data-active");
    for (const tr of rowsOut) tr.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  const arrow: Record<RagTrend, string> = { improved: "↑", worse: "↓", same: "" };

  // Rows, gathered under their group's heading when there is one, groups in order of their first row.
  const groupField = view.group;
  const groups = new Map<string, Line[]>();
  for (const line of lines) {
    const key = groupField ? ctx.format(line.row[groupField], groupField) : "";
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }
  let i = 0;
  for (const [groupName, members] of groups) {
    const body = html(doc, "tbody");
    if (groupField) {
      const tr = html(doc, "tr", "fft-rag-group");
      const th = html(doc, "th", undefined, groupName || "Other");
      th.scope = "colgroup";
      th.colSpan = columns.length + 1;
      tr.append(th);
      body.append(tr);
    }
    for (const line of members) {
      const tr = html(doc, "tr", "fft-rag-row");
      tr.style.setProperty("--fft-i", String(i++));
      const name = html(doc, "th", "fft-rag-name");
      name.scope = "row";
      name.append(html(doc, "span", "fft-rag-name-text", line.name));
      if (view.note) {
        const note = ctx.format(line.row[view.note], view.note);
        if (note) name.append(html(doc, "span", "fft-rag-note", note));
      }
      tr.append(name);
      columns.forEach((column, c) => {
        const status = statusAt(line, c);
        const before = previousAt(line, c);
        const trend = before === undefined ? "same" : ragTrend(before, status);
        const td = html(doc, "td", "fft-rag-cell");
        td.dataset.rag = status;
        if (column.key === OVERALL) td.dataset.overall = "";
        td.append(ragMark(doc, status, look, 14));
        if (trend !== "same") {
          td.dataset.trend = trend;
          const mark = html(doc, "span", "fft-rag-trend", arrow[trend]);
          mark.setAttribute("aria-hidden", "true");
          td.append(mark);
        }
        const change = trend === "same" ? "" : `, ${trend === "improved" ? "better" : "worse"} than last period (${word(before as Rag)})`;
        td.append(srText(doc, `${word(status)}${change}`));
        const items: TooltipItem[] = [{ label: column.title, value: word(status), color: ragColor(status) }];
        if (before !== undefined) items.push({ label: "Last period", value: word(before), color: ragColor(before) });
        if (trend !== "same") items.push({ label: "Change", value: trend === "improved" ? "Better" : "Worse" });
        const show = () => {
          table.setAttribute("data-active", "");
          for (const other of rowsOut) other.removeAttribute("data-active");
          tr.setAttribute("data-active", "");
          ctx.tooltip.show(td, line.name, items);
        };
        td.addEventListener("pointerenter", show);
        td.addEventListener("focus", show);
        td.addEventListener("pointerleave", deactivate);
        td.addEventListener("blur", deactivate);
        selectable(td, () => ctx.select(line.row));
        cells.push(td);
        tr.append(td);
      });
      rowsOut.push(tr);
      body.append(tr);
    }
    table.append(body);
  }

  // The footer: each column's count of off track, at risk and on track, shapes and figures.
  const foot = html(doc, "tfoot");
  const footRow = html(doc, "tr", "fft-rag-foot");
  const footHead = html(doc, "th", undefined, "Count");
  footHead.scope = "row";
  footRow.append(footHead);
  columns.forEach((_, c) => {
    const tally = ragCounts(lines.map((line) => statusAt(line, c)));
    const td = html(doc, "td", "fft-rag-tally");
    const said: string[] = [];
    for (const status of ["R", "A", "G"] as Rag[]) {
      if (!tally[status]) continue;
      const part = html(doc, "span", "fft-rag-tally-part");
      part.dataset.rag = status;
      part.setAttribute("aria-hidden", "true");
      part.append(ragMark(doc, status, look, 9), String(tally[status]));
      td.append(part);
      said.push(`${tally[status]} ${word(status).toLowerCase()}`);
    }
    td.append(srText(doc, said.join(", ") || "no data"));
    footRow.append(td);
  });
  foot.append(footRow);
  table.append(foot);

  roving(cells, { down: columns.length });
  scroller.append(table);
  wrap.append(scroller);
  ctx.el.append(wrap);
};
