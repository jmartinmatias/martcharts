import { ragOf, ragRank, ragTrend, ragWord } from "../../core/rag.ts";
import type { Rag } from "../../core/rag.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import { periodTime } from "../../core/views.ts";
import type { RagtrendView } from "../../core/views.ts";
import { roving } from "./focus.ts";
import { ragColor, ragLegend, ragMark, ragPill, srText } from "./rag-shared.ts";
import type { RagLook } from "./rag-shared.ts";
import { html, selectable } from "./shared.ts";

/** Writes a time back as a period in the same pattern as the data's own: 2026-Q1, 2026-03 or 2026-03-31. */
function periodText(time: number, like: string): string {
  const date = new Date(time);
  const [y, m, d] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
  const pad = (n: number) => String(n).padStart(2, "0");
  if (/Q[1-4]$/i.test(like)) return `${y}${like.includes("-") ? "-" : ""}Q${Math.floor((m - 1) / 3) + 1}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(like)) return `${y}-${pad(m)}-${pad(d)}`;
  return `${y}-${pad(m)}`;
}

/** One entity's run of statuses, period by period. */
interface Run {
  name: string;
  /** The rows by period key: the last row wins when a period repeats. */
  byPeriod: Map<string, Row>;
  current: Rag;
  first: Row;
}

/**
 * Draws the `ragtrend` view: one row per entity and one cell per period holding its status's shape, in its color. A
 * tick at a cell's left edge marks where the status changed, and the tooltip gives the previous status and the note of
 * why it moved. Each row ends with its current status as a pill; rows come worst-current first. Inside small multiples
 * every panel keeps the same periods.
 */
export const renderRagtrend: ViewRenderer<RagtrendView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const view = ctx.view;
  const look: RagLook = { words: view.words, shapes: view.shapes };
  const word = (status: Rag) => ragWord(status, look.words);
  const { label, period, status: statusField, note } = view;

  // Periods in order: by time when they read as dates or quarters, else as first seen. Small multiples add the
  // periods of the other panels, so every panel has the same columns.
  const keys = [...new Set(ctx.rows.map((row) => String(row[period] ?? "")))].filter(Boolean);
  const dated = keys.length > 0 && keys.every((key) => periodTime(key) !== null);
  if (dated && ctx.extent?.length) for (const time of ctx.extent) {
    const key = periodText(time, keys[0] as string);
    if (!keys.includes(key)) keys.push(key);
  }
  if (dated) keys.sort((a, b) => (periodTime(a) as number) - (periodTime(b) as number));

  const runs = new Map<string, Run>();
  for (const row of ctx.rows) {
    const name = ctx.format(row[label], label);
    const run = runs.get(name) ?? { name, byPeriod: new Map(), current: "N" as Rag, first: row };
    run.byPeriod.set(String(row[period] ?? ""), row);
    runs.set(name, run);
  }
  const statusOf = (run: Run, key: string): Rag => {
    const row = run.byPeriod.get(key);
    return row ? ragOf(row[statusField]) : "N";
  };
  for (const run of runs.values()) {
    const last = [...keys].reverse().find((key) => run.byPeriod.has(key) && statusOf(run, key) !== "N");
    run.current = last ? statusOf(run, last) : "N";
  }
  const reds = (run: Run) => keys.filter((key) => statusOf(run, key) === "R").length;
  const ordered = [...runs.values()].sort((a, b) => ragRank(a.current) - ragRank(b.current) || reds(b) - reds(a));

  const wrap = html(doc, "div", "fft-ragtrend");
  const seen = new Set<Rag>();
  for (const run of ordered) for (const key of keys) seen.add(statusOf(run, key));
  if (!ctx.inFacet) wrap.append(ragLegend(doc, seen, look));

  const scroller = html(doc, "div", "fft-rag-scroll");
  const table = html(doc, "table", "fft-ragtrend-table");
  table.style.setProperty("--fft-rag-periods", String(keys.length));
  const head = html(doc, "thead");
  const headRow = html(doc, "tr");
  const corner = html(doc, "th", "fft-rag-corner", ctx.label(label));
  corner.scope = "col";
  headRow.append(corner);
  // Period headings: every one is there for screen readers; on screen, every nth, so the words never collide.
  const room = Math.max(1, Math.floor((ctx.width * 0.6) / Math.max(1, keys.length)));
  const longest = Math.max(...keys.map((key) => ctx.format(key, period).length)) * 6;
  const every = Math.max(1, Math.ceil(longest / room));
  keys.forEach((key, k) => {
    const th = html(doc, "th", "fft-ragtrend-period");
    th.scope = "col";
    const text = ctx.format(key, period);
    if (k % every === 0) th.textContent = text;
    else th.append(srText(doc, text));
    headRow.append(th);
  });
  const nowHead = html(doc, "th", "fft-ragtrend-now", "Now");
  nowHead.scope = "col";
  headRow.append(nowHead);
  head.append(headRow);
  table.append(head);

  const body = html(doc, "tbody");
  const cells: HTMLElement[] = [];
  const rowsOut: HTMLElement[] = [];
  const deactivate = () => {
    table.removeAttribute("data-active");
    for (const tr of rowsOut) tr.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  ordered.forEach((run, i) => {
    const tr = html(doc, "tr", "fft-ragtrend-row");
    tr.style.setProperty("--fft-i", String(i));
    const name = html(doc, "th", "fft-rag-name", run.name);
    name.scope = "row";
    tr.append(name);
    let before: Rag | undefined;
    keys.forEach((key) => {
      const row = run.byPeriod.get(key);
      const status = statusOf(run, key);
      const td = html(doc, "td", "fft-ragtrend-cell");
      td.dataset.rag = status;
      const changed = before !== undefined && row !== undefined && ragTrend(before, status) !== "same";
      const why = changed && note && row ? ctx.format(row[note], note) : "";
      if (row) td.append(ragMark(doc, status, look, 12));
      if (changed) td.dataset.changed = ragTrend(before as Rag, status);
      const said = row ? `${ctx.format(key, period)}: ${word(status)}${changed ? `, was ${word(before as Rag)}${why ? `. ${why}` : ""}` : ""}` : `${ctx.format(key, period)}: no reading`;
      td.append(srText(doc, said));
      const items: TooltipItem[] = [{ label: "Status", value: row ? word(status) : "No reading", color: ragColor(status) }];
      if (changed) items.push({ label: "Was", value: word(before as Rag), color: ragColor(before as Rag) });
      if (why) items.push({ label: "Why", value: why });
      const show = () => {
        table.setAttribute("data-active", "");
        for (const other of rowsOut) other.removeAttribute("data-active");
        tr.setAttribute("data-active", "");
        ctx.tooltip.show(td, `${run.name}, ${ctx.format(key, period)}`, items);
      };
      td.addEventListener("pointerenter", show);
      td.addEventListener("focus", show);
      td.addEventListener("pointerleave", deactivate);
      td.addEventListener("blur", deactivate);
      if (row) selectable(td, () => ctx.select(row));
      cells.push(td);
      tr.append(td);
      if (row && status !== "N") before = status;
    });
    const now = html(doc, "td", "fft-ragtrend-end");
    now.append(ragPill(doc, run.current, look));
    tr.append(now);
    rowsOut.push(tr);
    body.append(tr);
  });
  table.append(body);
  roving(cells, { down: keys.length });
  scroller.append(table);
  wrap.append(scroller);
  ctx.el.append(wrap);
};
