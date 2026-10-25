import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { HistoryView } from "../../core/views.ts";
import { buildTable, DAY, dayOf, html, legendList, selectable } from "./shared.ts";
import { roving } from "./focus.ts";

const DEFAULT_LIMIT = 30;

interface Event {
  row: Row;
  day: number;
  /** The month as a key, so a label is written where it changes. */
  month: string;
}

/**
 * Draws the `history` view: a vertical timeline of events, newest first. Each
 * event is a dot on a hairline rail, colored by its kind, with its date, title,
 * an amount on the right and a note underneath; the month is written wherever
 * it changes. A group field makes one list per value under its own heading, so
 * several clients' stories read side by side. Rows past the limit fold into
 * one "n more" line.
 */
export const renderHistory: ViewRenderer<HistoryView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { date, title, kind, note, amount, group } = ctx.view;
  const limit = typeof ctx.view.limit === "number" && ctx.view.limit >= 1 ? Math.floor(ctx.view.limit) : DEFAULT_LIMIT;
  const newestFirst = ctx.view.order !== "asc";
  const locale = ctx.spec.locale;
  const monthYear = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const dayMonth = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const dateText = (row: Row, day: number) => (ctx.spec.fields?.[date]?.format !== undefined ? ctx.format(row[date], date) : dayMonth.format(new Date(day * DAY)));

  const events: Event[] = [];
  for (const row of ctx.rows) {
    const day = dayOf(row[date]);
    if (day === null) continue;
    const when = new Date(day * DAY);
    events.push({ row, day, month: `${when.getUTCFullYear()}-${when.getUTCMonth()}` });
  }
  events.sort((a, b) => (newestFirst ? b.day - a.day : a.day - b.day));

  // Kinds in order of first appearance (newest first), each with a color and the first letter as its glyph.
  const kinds: string[] = [];
  if (kind) for (const event of events) if (!kinds.includes(String(event.row[kind]))) kinds.push(String(event.row[kind]));
  const kindText = (value: string) => ctx.format(value, kind);
  // A kind keeps one color wherever it appears when the spec fixes colors per category.
  const kindColor = (k: number) => ctx.colorOf?.(kinds[k]) ?? ctx.color(k);
  const colorOf = (event: Event) => (kind ? kindColor(kinds.indexOf(String(event.row[kind]))) : ctx.color(0));

  const groups: string[] = [];
  // Groups keep the order the data gives them (first appearance), whatever the events' order inside each.
  if (group) for (const row of ctx.rows) if (!groups.includes(String(row[group]))) groups.push(String(row[group]));

  const wrap = html(doc, "div", "fft-history-wrap");
  const key = kind ? legendList(ctx, kinds.map((value, i) => ({ label: kindText(value), color: kindColor(i), shape: "dot" as const })), { min: 2 }) : undefined;
  if (key) {
    wrap.append(key);
  }

  const stops: HTMLElement[] = [];
  const deactivate = () => ctx.tooltip.hide();
  const drawList = (list: Event[]) => {
    const rail = html(doc, "ol", "fft-history");
    let lastMonth = "";
    list.slice(0, limit).forEach((event, i) => {
      if (event.month !== lastMonth) {
        // The month heads its events as an item of its own, so a screen reader hears it where it changes too.
        rail.append(html(doc, "li", "fft-history-month", monthYear.format(new Date(event.day * DAY))));
        lastMonth = event.month;
      }
      const { row } = event;
      const color = colorOf(event);
      const item = html(doc, "li", "fft-history-event");
      item.style.setProperty("--fft-i", String(i));
      item.tabIndex = 0;
      const dot = html(doc, "span", "fft-history-dot", kind ? kindText(String(row[kind])).charAt(0).toUpperCase() : "");
      dot.style.background = color;
      dot.setAttribute("aria-hidden", "true");
      const body = html(doc, "div", "fft-history-body");
      const line = html(doc, "div", "fft-history-line");
      const when = dateText(row, event.day);
      line.append(html(doc, "span", "fft-history-date", when), html(doc, "span", "fft-history-title", ctx.format(row[title], title)));
      const sum = amount ? readNumber(row[amount]) : null;
      if (sum !== null && amount) line.append(html(doc, "span", "fft-history-amount", ctx.format(row[amount], amount)));
      body.append(line);
      const noteText = note && row[note] !== undefined && row[note] !== null && row[note] !== "" ? ctx.format(row[note], note) : "";
      if (noteText) body.append(html(doc, "p", "fft-history-note", noteText));
      item.append(dot, body);

      const items: TooltipItem[] = [{ label: ctx.label(date), value: when }];
      if (kind) items.push({ label: ctx.label(kind), value: kindText(String(row[kind])), color });
      if (sum !== null && amount) items.push({ label: ctx.label(amount), value: ctx.format(row[amount], amount) });
      item.setAttribute("aria-label", `${when}: ${ctx.format(row[title], title)}${kind ? `, ${kindText(String(row[kind]))}` : ""}${sum !== null && amount ? `, ${ctx.format(row[amount], amount)}` : ""}${noteText ? `. ${noteText}` : ""}`);
      const show = () => ctx.tooltip.show(dot, ctx.format(row[title], title), items);
      item.addEventListener("pointerenter", show);
      item.addEventListener("focus", show);
      item.addEventListener("pointerleave", deactivate);
      item.addEventListener("blur", deactivate);
      selectable(item, () => ctx.select(row));
      stops.push(item);
      rail.append(item);
    });
    if (list.length > limit) {
      // An ordinary list item: a list may only hold items, so the count of the rest is one too.
      rail.append(html(doc, "li", "fft-history-more", `${list.length - limit} more`));
    }
    return rail;
  };

  if (group && groups.length > 1) {
    for (const value of groups) {
      const section = html(doc, "section", "fft-history-group");
      section.append(html(doc, "h4", "fft-history-heading", ctx.format(value, group)));
      section.append(drawList(events.filter((event) => String(event.row[group]) === value)));
      wrap.append(section);
    }
  } else wrap.append(drawList(events));
  roving(stops);

  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, events.map((event) => event.row), [date, title, ...(kind ? [kind] : []), ...(amount ? [amount] : []), ...(note ? [note] : [])], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
