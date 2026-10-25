import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import { BOARD_LIMIT } from "../../core/views.ts";
import type { BoardView } from "../../core/views.ts";
import { activeGroup, hiddenTableOf, html, legendList, rowHit } from "./shared.ts";
import { roving } from "./focus.ts";

/** The column items land in when their stage is not among the stages listed. */
const OTHER = "Other";

/**
 * Draws the `board` view: one column per stage, headed by the stage's name and
 * its count, with each item as a quiet card (its name, a smaller detail line,
 * a value on the right, and a colored dot when a group field keys the colors).
 * Past the limit a column folds its remaining cards into a "+ n more" line
 * that opens them in place. Columns scroll sideways on a narrow card, the
 * right edge fading while more wait there. Every card is a keyboard stop with
 * a tooltip naming each field, and a table behind the board lists every row.
 */
export const renderBoard: ViewRenderer<BoardView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, stage, group, value, detail } = ctx.view;
  const limit = typeof ctx.view.limit === "number" && ctx.view.limit >= 1 ? Math.floor(ctx.view.limit) : BOARD_LIMIT;
  const listed = Array.isArray(ctx.view.stages) ? ctx.view.stages.map(String) : undefined;

  // Columns in the order given, or of first appearance; unlisted stages gather under Other.
  const columns = new Map<string, Row[]>();
  for (const name of listed ?? []) columns.set(name, []);
  for (const row of ctx.rows) {
    const raw = row[stage];
    const name = raw === null || raw === undefined || raw === "" ? OTHER : ctx.format(raw, stage);
    const key = listed && !listed.includes(name) ? OTHER : name;
    if (!columns.has(key)) columns.set(key, []);
    columns.get(key)!.push(row);
  }

  // Groups keep the order of first appearance, so the key and the dots agree.
  const groups: string[] = [];
  const groupOf = (row: Row) => {
    if (!group) return -1;
    const name = ctx.format(row[group], group);
    if (!groups.includes(name)) groups.push(name);
    return groups.indexOf(name);
  };
  for (const row of ctx.rows) groupOf(row);

  // A group keeps one color wherever it appears when the spec fixes colors per category.
  const groupColor = (g: number) => ctx.colorOf?.(groups[g]) ?? ctx.color(g);
  const wrap = html(doc, "div", "fft-board-wrap");
  const key = group ? legendList(ctx, groups.map((name, i) => ({ label: name, color: groupColor(i), shape: "dot" as const })), { min: 2 }) : undefined;
  if (key) wrap.append(key);

  const scroller = html(doc, "div", "fft-board-scroll");
  const boardEl = html(doc, "div", "fft-board");
  boardEl.setAttribute("role", "group");
  boardEl.setAttribute("aria-label", `Board of ${ctx.label(label)} by ${ctx.label(stage)}`);
  boardEl.style.setProperty("--fft-columns", String(columns.size));
  const cards: Element[] = [];
  const count = new Intl.NumberFormat(ctx.spec.locale);
  const active = activeGroup(boardEl, ctx.tooltip);

  let index = 0;
  for (const [name, rows] of columns) {
    const column = html(doc, "section", "fft-board-column");
    const head = html(doc, "h4", "fft-board-head");
    head.append(html(doc, "span", "fft-board-stage", name), html(doc, "span", "fft-board-count", count.format(rows.length)));
    head.setAttribute("aria-label", `${name}: ${rows.length} ${rows.length === 1 ? "item" : "items"}`);
    column.append(head);
    const list = html(doc, "ol", "fft-board-cards");
    rows.forEach((row, i) => {
      const card = html(doc, "li", "fft-board-card");
      card.style.setProperty("--fft-i", String(index++));
      if (i >= limit) card.hidden = true;
      const g = groupOf(row);
      const title = html(doc, "span", "fft-board-title");
      if (g >= 0) {
        const dot = html(doc, "span", "fft-board-dot");
        dot.style.background = groupColor(g);
        dot.setAttribute("aria-hidden", "true");
        title.append(dot);
      }
      const nameText = ctx.format(row[label], label);
      const nameNode = html(doc, "span", "fft-board-name", nameText);
      // A name longer than its card ends in an ellipsis (CSS); the pointer's title and the card's aria-label keep it whole.
      nameNode.title = nameText;
      title.append(nameNode);
      card.append(title);
      const amount = value ? readNumber(row[value]) : null;
      const valueText = value && amount !== null ? ctx.format(row[value], value) : "";
      if (valueText) title.append(html(doc, "span", "fft-board-value", valueText));
      const detailText = detail ? ctx.format(row[detail], detail) : "";
      if (detailText) card.append(html(doc, "span", "fft-board-detail", detailText));
      const items: TooltipItem[] = [{ label: ctx.label(stage), value: name }];
      if (g >= 0 && group) items.push({ label: ctx.label(group), value: groups[g] as string, color: groupColor(g) });
      if (valueText && value) items.push({ label: ctx.label(value), value: valueText });
      if (detailText && detail) items.push({ label: ctx.label(detail), value: detailText });
      cards.push(rowHit(ctx, { node: card, row, name: nameText, items, group: active }));
      list.append(card);
    });
    column.append(list);
    if (rows.length > limit) {
      const more = html(doc, "button", "fft-board-more", `+ ${count.format(rows.length - limit)} more`);
      more.type = "button";
      more.setAttribute("aria-expanded", "false");
      more.addEventListener("click", () => {
        const open = more.getAttribute("aria-expanded") === "true";
        for (const card of [...list.children].slice(limit) as HTMLElement[]) card.hidden = open;
        more.setAttribute("aria-expanded", String(!open));
        more.textContent = open ? `+ ${count.format(rows.length - limit)} more` : "Show fewer";
      });
      column.append(more);
    }
    boardEl.append(column);
  }
  roving(cards);
  scroller.append(boardEl);
  wrap.append(scroller);

  // More columns to the right: the edge fades as a cue to swipe, as a wide table's does.
  const edge = () => scroller.toggleAttribute("data-more", scroller.scrollWidth - scroller.clientWidth > 1 && scroller.scrollLeft < scroller.scrollWidth - scroller.clientWidth - 1);
  scroller.addEventListener("scroll", edge, { passive: true });
  edge();

  wrap.append(hiddenTableOf(ctx, ctx.rows, [label, stage, group, value, detail].filter((f): f is string => Boolean(f))));
  ctx.el.append(wrap);
};
