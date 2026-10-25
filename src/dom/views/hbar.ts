import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewContext, ViewRenderer } from "../../core/view-context.ts";
import type { HbarView } from "../../core/views.ts";
import { DEEMPHASIS, highlights } from "./chart.ts";
import { activeGroup, endRoom, fieldList, hiddenTableOf, html, legendList, rowHit, shareFormat, textWidth } from "./shared.ts";
import { roving } from "./focus.ts";

/** A bar's share of the track, as a CSS width: 0% for nothing, missing values or a zero scale. */
const widthOf = (amount: number | null, max: number) => `${amount === null || amount <= 0 || max === 0 ? 0 : Math.round((amount / max) * 1000) / 10}%`;

/** A key above the bars: one square per series, in its color. Only when there is more than one series. */

/**
 * Draws the `hbar` view: one row per data row with the label on the left, a
 * bar from zero, and the value at the bar's end. Built from HTML so long
 * labels stay crisp, wrap-free and readable by assistive technology.
 * One series means one color; `highlight` keeps named rows in color and greys the rest.
 * With `mark: "lollipop"` each bar is a thin stem ending in a dot at the value.
 *
 * Several value fields draw grouped bars: one thin bar per field in every row, each
 * with its value at its end and a key above. `stacked` joins them into one bar per row,
 * the total at the end (or shares of 100% with "percent"). `split` gives each field its
 * own column of bars, headed by its label and scaled on its own largest value (or one
 * shared scale with `shared`), so measures in different units read side by side.
 */
export const renderHbar: ViewRenderer<HbarView> = (ctx) => {
  const series = fieldList(ctx.view.value);
  if (series.length > 1 && !ctx.view.split && ctx.view.stacked) return renderStacked(ctx, series);
  if (series.length > 1 && ctx.view.split) return renderSplit(ctx, series);
  if (series.length > 1) return renderGrouped(ctx, series);
  renderSingle(ctx, series[0] ?? "");
};

/** The classic ranking: one bar per row, in one color. */
function renderSingle(ctx: ViewContext<HbarView>, value: string): void {
  const doc = ctx.el.ownerDocument;
  const { label } = ctx.view;
  const picked = highlights(ctx.view.highlight);
  const amounts = ctx.rows.map((row) => readNumber(row[value]));
  const max = Math.max(0, ...amounts.filter((n): n is number => n !== null), ...(ctx.extent ?? []));

  const lollipop = ctx.view.mark === "lollipop";
  const list = html(doc, "ol", "fft-hbars");
  if (lollipop) list.dataset.mark = "lollipop";
  const rows: Element[] = [];
  const active = activeGroup(list, ctx.tooltip);
  ctx.rows.forEach((row, i) => {
    const amount = amounts[i] ?? null;
    const name = ctx.format(row[label], label);
    const valueText = ctx.format(row[value], value);
    const on = picked.length === 0 || picked.includes(String(row[label]));

    const item = html(doc, "li", "fft-hbar");
    item.style.setProperty("--fft-i", String(i));
    const track = html(doc, "div", "fft-hbar-track");
    const fill = html(doc, "div", "fft-hbar-fill");
    const share = widthOf(amount, max);
    fill.style.width = share;
    const hue = ctx.colorOf?.(row[label]) ?? ctx.color(0);
    fill.style.background = on ? hue : DEEMPHASIS;
    fill.style.setProperty("--fft-bar-color", on ? hue : DEEMPHASIS);
    track.append(fill);
    if (lollipop) {
      const dot = html(doc, "span", "fft-hbar-dot");
      dot.style.left = share;
      dot.style.background = on ? hue : DEEMPHASIS;
      track.append(dot);
    }
    item.append(nameLabel(doc, name), track, html(doc, "span", "fft-hbar-value", valueText));
    rows.push(rowHit(ctx, { node: item, row, name, items: [{ label: ctx.label(value), value: valueText, color: on ? hue : DEEMPHASIS }], anchor: track, group: active }));
    // One measure is read as the name and its figure alone: "North: €1,200".
    item.setAttribute("aria-label", `${name}: ${valueText || "no value"}`);
    list.append(item);
  });
  roving(rows);
  // Screen readers get the figures as a table too, as for every other row view.
  ctx.el.append(list, hiddenTableOf(ctx, ctx.rows, [label, value]));
}

/**
 * One thin bar with its value at its end: the fill runs over a track shortened by the room the longest label needs,
 * and the label sits where the fill ends, so the longest bar's number still fits inside the column.
 */
function endBar(doc: Document, share: string, background: string, text: string, room: number): HTMLElement {
  const bar = html(doc, "div", "fft-hbar-bar");
  const run = html(doc, "div", "fft-hbar-run");
  run.style.setProperty("--fft-end-room", `${Math.round(room)}px`);
  const fill = html(doc, "div", "fft-hbar-fill");
  fill.style.width = share;
  fill.style.background = background;
  const end = html(doc, "span", "fft-hbar-end", text);
  end.style.left = share;
  run.append(fill, end);
  bar.append(run);
  return bar;
}

/** A row's name: it ends in an ellipsis when longer than its column (CSS), and the pointer's title keeps it whole. */
function nameLabel(doc: Document, name: string): HTMLElement {
  const node = html(doc, "span", "fft-hbar-label", name);
  node.title = name;
  return node;
}

/** What the rows of a grouped, stacked or split chart share: emphasis, the active-row dance, and the hidden table. */
function frame(ctx: ViewContext<HbarView>, series: string[], mode: "grouped" | "stacked" | "split") {
  const doc = ctx.el.ownerDocument;
  const picked = highlights(ctx.view.highlight);
  const on = (row: Row) => picked.length === 0 || picked.includes(String(row[ctx.view.label]));
  // A muted row keeps a hint of each series' hue, so its greys still say which is which.
  const hue = (s: number) => ctx.colorOf?.(series[s]) ?? ctx.colorOf?.(ctx.label(series[s] as string)) ?? ctx.color(s);
  const color = (s: number, lit = true) => (lit ? hue(s) : `color-mix(in srgb, ${hue(s)} 30%, ${DEEMPHASIS})`);
  const wrap = html(doc, "div", "fft-hbar-wrap");
  const key = mode === "split" ? undefined : legendList(ctx, series.map((field, s) => ({ label: ctx.label(field), color: color(s) })));
  if (key) wrap.append(key);
  const list = html(doc, "ol", "fft-hbars");
  list.dataset.mode = mode;
  const items: Element[] = [];
  const group = activeGroup(list, ctx.tooltip);
  /** Lights `item` and points the tooltip at one part of it: a stacked segment names itself alone. */
  const activate = (item: Element, anchor: Element, title: string, lines: TooltipItem[]) => {
    group.on(item);
    ctx.tooltip.show(anchor, title, lines);
  };
  /** Wires one row: focus, tooltip, dimming and select, through the kit. */
  const wire = (item: HTMLElement, row: Row, name: string, lines: TooltipItem[], anchor: Element, said?: string) => {
    items.push(rowHit(ctx, { node: item, row, name, items: lines, anchor, group, said }));
  };
  const finish = () => {
    roving(items);
    wrap.append(list, hiddenTableOf(ctx, ctx.rows, [ctx.view.label, ...series]));
    ctx.el.append(wrap);
  };
  return { doc, on, color, list, activate, wire, finish };
}

/** Grouped bars: in every row, one thin bar per series, its value at its end, all on one shared scale. */
function renderGrouped(ctx: ViewContext<HbarView>, series: string[]): void {
  const { doc, on, color, list, wire, finish } = frame(ctx, series, "grouped");
  const { label } = ctx.view;
  const amounts = ctx.rows.map((row) => series.map((field) => readNumber(row[field])));
  const max = Math.max(0, ...amounts.flat().filter((n): n is number => n !== null), ...(ctx.extent ?? []));
  // Every bar leaves room for the longest value written at a bar's end, so the longest bar's label is never cut.
  const room = endRoom(ctx.rows.flatMap((row) => series.map((field) => ctx.format(row[field], field))));
  ctx.rows.forEach((row, i) => {
    const name = ctx.format(row[label], label);
    const lit = on(row);
    const item = html(doc, "li", "fft-hbar");
    item.style.setProperty("--fft-i", String(i));
    const group = html(doc, "div", "fft-hbar-group");
    const lines: TooltipItem[] = [];
    series.forEach((field, s) => {
      const amount = amounts[i]?.[s] ?? null;
      const text = ctx.format(row[field], field);
      group.append(endBar(doc, widthOf(amount, max), color(s, lit), text, room));
      lines.push({ label: ctx.label(field), value: text, color: color(s, lit) });
    });
    item.append(nameLabel(doc, name), group);
    wire(item, row, name, lines, group);
    list.append(item);
  });
  finish();
}

/** Stacked bars: one bar per row made of colored parts, the total at its end; percent stacks are shares of 100%. */
function renderStacked(ctx: ViewContext<HbarView>, series: string[]): void {
  const { doc, on, color, list, activate, wire, finish } = frame(ctx, series, "stacked");
  const { label } = ctx.view;
  const percent = ctx.view.stacked === "percent";
  const share = shareFormat(ctx.spec.locale);
  const parts = ctx.rows.map((row) => series.map((field) => Math.max(0, readNumber(row[field]) ?? 0)));
  const totals = parts.map((values) => values.reduce((sum, v) => sum + v, 0));
  const max = percent ? 1 : Math.max(0, ...totals, ...(ctx.extent ?? []));
  // About how wide the track is: the card less the label column, so a share is only written where it fits.
  const trackPx = Math.max(144, ctx.width * 0.55);
  ctx.rows.forEach((row, i) => {
    const name = ctx.format(row[label], label);
    const lit = on(row);
    const total = totals[i] ?? 0;
    const item = html(doc, "li", "fft-hbar");
    item.style.setProperty("--fft-i", String(i));
    const track = html(doc, "div", "fft-hbar-track fft-hbar-stack");
    const lines: TooltipItem[] = [];
    series.forEach((field, s) => {
      const amount = parts[i]?.[s] ?? 0;
      const fraction = percent ? (total > 0 ? amount / total : 0) : amount;
      const seg = html(doc, "div", "fft-hbar-seg");
      seg.style.width = widthOf(fraction, max);
      seg.style.background = color(s, lit);
      // Percent stacks write each share inside its part, where the part is wide enough to hold the figure.
      if (percent && total > 0) {
        const shareText = share.format(amount / total);
        if ((amount / total) * trackPx >= textWidth(shareText, 10, 600) + 8) seg.append(html(doc, "span", "fft-hbar-seg-text", shareText));
      }
      const line: TooltipItem = { label: ctx.label(field), value: `${ctx.format(row[field], field)}${total > 0 ? ` (${share.format(amount / total)})` : ""}`, color: color(s, lit) };
      lines.push(line);
      // Pointing at one part names it alone; the row's focus names every part.
      seg.addEventListener("pointerenter", (event) => {
        event.stopPropagation();
        activate(item, seg, name, [line]);
      });
      seg.addEventListener("pointerleave", () => activate(item, track, name, lines));
      track.append(seg);
    });
    const totalText = ctx.format(total, series[0]);
    // A percent stack's end would only ever say 100%, so the shares are written inside the parts instead.
    item.append(nameLabel(doc, name), track, ...(percent ? [] : [html(doc, "span", "fft-hbar-value", totalText)]));
    wire(item, row, name, lines, track, percent ? "" : `, total ${totalText}`);
    list.append(item);
  });
  finish();
}

/** Split bars: one column of bars per series, each headed by its label and scaled on its own largest value. */
function renderSplit(ctx: ViewContext<HbarView>, series: string[]): void {
  const { doc, on, color, list, wire, finish } = frame(ctx, series, "split");
  const { label } = ctx.view;
  const amounts = ctx.rows.map((row) => series.map((field) => readNumber(row[field])));
  const own = series.map((_, s) => Math.max(0, ...amounts.map((values) => values[s]).filter((n): n is number => n !== null)));
  const all = Math.max(0, ...own, ...(ctx.extent ?? []));
  const maxOf = (s: number) => (ctx.view.shared ? all : (own[s] ?? 0));
  list.style.setProperty("--fft-splits", String(series.length));
  // Each column keeps room for its own longest value, so its longest bar's label is never cut.
  const rooms = series.map((field) => endRoom(ctx.rows.map((row) => ctx.format(row[field], field))));
  // The heading row names each column once, where its bars start.
  const head = html(doc, "li", "fft-hbar fft-hbar-head");
  head.setAttribute("aria-hidden", "true");
  head.append(html(doc, "span", "fft-hbar-label"));
  series.forEach((field, s) => {
    const title = html(doc, "span", "fft-hbar-col-title");
    const swatch = html(doc, "span", "fft-swatch");
    swatch.dataset.shape = "rect";
    swatch.style.background = color(s);
    title.append(swatch, ctx.label(field));
    head.append(title);
  });
  list.append(head);
  ctx.rows.forEach((row, i) => {
    const name = ctx.format(row[label], label);
    const lit = on(row);
    const item = html(doc, "li", "fft-hbar");
    item.style.setProperty("--fft-i", String(i));
    item.append(nameLabel(doc, name));
    const lines: TooltipItem[] = [];
    series.forEach((field, s) => {
      const amount = amounts[i]?.[s] ?? null;
      const text = ctx.format(row[field], field);
      item.append(endBar(doc, widthOf(amount, maxOf(s)), color(s, lit), text, rooms[s] ?? 0));
      lines.push({ label: ctx.label(field), value: text, color: color(s, lit) });
    });
    wire(item, row, name, lines, item);
    list.append(item);
  });
  finish();
}
