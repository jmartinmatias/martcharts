import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewContext, ViewRenderer } from "../../core/view-context.ts";
import type { HbarView } from "../../core/views.ts";
import { DEEMPHASIS, highlights } from "./chart.ts";
import { buildTable, fieldList, html, selectable } from "./shared.ts";
import { roving } from "./focus.ts";

/** A bar's share of the track, as a CSS width: 0% for nothing, missing values or a zero scale. */
const widthOf = (amount: number | null, max: number) => `${amount === null || amount <= 0 || max === 0 ? 0 : Math.round((amount / max) * 1000) / 10}%`;

/** A key above the bars: one square per series, in its color. Only when there is more than one series. */
function key(ctx: ViewContext<HbarView>, series: string[], color: (s: number) => string): HTMLElement {
  const doc = ctx.el.ownerDocument;
  const list = html(doc, "ul", "fft-legend");
  series.forEach((field, s) => {
    const swatch = html(doc, "span", "fft-swatch");
    swatch.dataset.shape = "rect";
    swatch.style.background = color(s);
    swatch.setAttribute("aria-hidden", "true");
    const item = html(doc, "li");
    item.append(swatch, ctx.label(field));
    list.append(item);
  });
  return list;
}

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
  const rows: HTMLElement[] = [];
  const deactivate = () => {
    list.removeAttribute("data-active");
    for (const row of rows) row.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  ctx.rows.forEach((row, i) => {
    const amount = amounts[i] ?? null;
    const name = ctx.format(row[label], label);
    const valueText = ctx.format(row[value], value);
    const on = picked.length === 0 || picked.includes(String(row[label]));

    const item = html(doc, "li", "fft-hbar");
    item.tabIndex = 0;
    item.style.setProperty("--fft-i", String(i));
    item.setAttribute("aria-label", `${name}: ${valueText || "no value"}`);
    const track = html(doc, "div", "fft-hbar-track");
    const fill = html(doc, "div", "fft-hbar-fill");
    const share = widthOf(amount, max);
    fill.style.width = share;
    fill.style.background = on ? ctx.color(0) : DEEMPHASIS;
    fill.style.setProperty("--fft-bar-color", on ? ctx.color(0) : DEEMPHASIS);
    track.append(fill);
    if (lollipop) {
      const dot = html(doc, "span", "fft-hbar-dot");
      dot.style.left = share;
      dot.style.background = on ? ctx.color(0) : DEEMPHASIS;
      track.append(dot);
    }
    item.append(html(doc, "span", "fft-hbar-label", name), track, html(doc, "span", "fft-hbar-value", valueText));

    const activate = () => {
      list.setAttribute("data-active", "");
      for (const other of rows) other.removeAttribute("data-active");
      item.setAttribute("data-active", "");
      ctx.tooltip.show(track, name, [{ label: ctx.label(value), value: valueText, color: on ? ctx.color(0) : DEEMPHASIS }]);
    };
    item.addEventListener("pointerenter", activate);
    item.addEventListener("focus", activate);
    item.addEventListener("pointerleave", deactivate);
    item.addEventListener("blur", deactivate);
    selectable(item, () => ctx.select(row));
    rows.push(item);
    list.append(item);
  });
  roving(rows);
  ctx.el.append(list);
}

/** What the rows of a grouped, stacked or split chart share: emphasis, the active-row dance, and the hidden table. */
function frame(ctx: ViewContext<HbarView>, series: string[], mode: "grouped" | "stacked" | "split") {
  const doc = ctx.el.ownerDocument;
  const picked = highlights(ctx.view.highlight);
  const on = (row: Row) => picked.length === 0 || picked.includes(String(row[ctx.view.label]));
  // A muted row keeps a hint of each series' hue, so its greys still say which is which.
  const color = (s: number, lit = true) => (lit ? ctx.color(s) : `color-mix(in srgb, ${ctx.color(s)} 30%, ${DEEMPHASIS})`);
  const wrap = html(doc, "div", "fft-hbar-wrap");
  if (mode !== "split" && !ctx.inFacet) wrap.append(key(ctx, series, color));
  const list = html(doc, "ol", "fft-hbars");
  list.dataset.mode = mode;
  const items: HTMLElement[] = [];
  const deactivate = () => {
    list.removeAttribute("data-active");
    for (const item of items) item.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  const activate = (item: HTMLElement, anchor: Element, title: string, lines: TooltipItem[]) => {
    list.setAttribute("data-active", "");
    for (const other of items) other.removeAttribute("data-active");
    item.setAttribute("data-active", "");
    ctx.tooltip.show(anchor, title, lines);
  };
  const finish = () => {
    roving(items);
    wrap.append(list);
    const hidden = html(doc, "div", "fft-sr-only");
    hidden.append(buildTable(ctx, ctx.rows, [ctx.view.label, ...series], false));
    wrap.append(hidden);
    ctx.el.append(wrap);
  };
  return { doc, on, color, list, items, activate, deactivate, finish };
}

/** Grouped bars: in every row, one thin bar per series, its value at its end, all on one shared scale. */
function renderGrouped(ctx: ViewContext<HbarView>, series: string[]): void {
  const { doc, on, color, list, items, activate, deactivate, finish } = frame(ctx, series, "grouped");
  const { label } = ctx.view;
  const amounts = ctx.rows.map((row) => series.map((field) => readNumber(row[field])));
  const max = Math.max(0, ...amounts.flat().filter((n): n is number => n !== null), ...(ctx.extent ?? []));
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
      const bar = html(doc, "div", "fft-hbar-bar");
      const fill = html(doc, "div", "fft-hbar-fill");
      fill.style.width = widthOf(amount, max);
      fill.style.background = color(s, lit);
      bar.append(fill, html(doc, "span", "fft-hbar-end", text));
      group.append(bar);
      lines.push({ label: ctx.label(field), value: text, color: color(s, lit) });
    });
    item.setAttribute("aria-label", `${name}: ${lines.map((line) => `${line.label} ${line.value || "no value"}`).join(", ")}`);
    item.append(html(doc, "span", "fft-hbar-label", name), group);
    const show = () => activate(item, group, name, lines);
    item.addEventListener("pointerenter", show);
    item.addEventListener("focus", show);
    item.addEventListener("pointerleave", deactivate);
    item.addEventListener("blur", deactivate);
    selectable(item, () => ctx.select(row));
    items.push(item);
    list.append(item);
  });
  finish();
}

/** Stacked bars: one bar per row made of colored parts, the total at its end; percent stacks are shares of 100%. */
function renderStacked(ctx: ViewContext<HbarView>, series: string[]): void {
  const { doc, on, color, list, items, activate, deactivate, finish } = frame(ctx, series, "stacked");
  const { label } = ctx.view;
  const percent = ctx.view.stacked === "percent";
  const share = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0 });
  const parts = ctx.rows.map((row) => series.map((field) => Math.max(0, readNumber(row[field]) ?? 0)));
  const totals = parts.map((values) => values.reduce((sum, v) => sum + v, 0));
  const max = percent ? 1 : Math.max(0, ...totals, ...(ctx.extent ?? []));
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
    const totalText = percent ? share.format(total > 0 ? 1 : 0) : ctx.format(total, series[0]);
    item.setAttribute("aria-label", `${name}: ${lines.map((line) => `${line.label} ${line.value}`).join(", ")}${percent ? "" : `, total ${totalText}`}`);
    item.append(html(doc, "span", "fft-hbar-label", name), track, html(doc, "span", "fft-hbar-value", totalText));
    const show = () => activate(item, track, name, lines);
    item.addEventListener("pointerenter", show);
    item.addEventListener("focus", show);
    item.addEventListener("pointerleave", deactivate);
    item.addEventListener("blur", deactivate);
    selectable(item, () => ctx.select(row));
    items.push(item);
    list.append(item);
  });
  finish();
}

/** Split bars: one column of bars per series, each headed by its label and scaled on its own largest value. */
function renderSplit(ctx: ViewContext<HbarView>, series: string[]): void {
  const { doc, on, color, list, items, activate, deactivate, finish } = frame(ctx, series, "split");
  const { label } = ctx.view;
  const amounts = ctx.rows.map((row) => series.map((field) => readNumber(row[field])));
  const own = series.map((_, s) => Math.max(0, ...amounts.map((values) => values[s]).filter((n): n is number => n !== null)));
  const all = Math.max(0, ...own, ...(ctx.extent ?? []));
  const maxOf = (s: number) => (ctx.view.shared ? all : (own[s] ?? 0));
  list.style.setProperty("--fft-splits", String(series.length));
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
    item.append(html(doc, "span", "fft-hbar-label", name));
    const lines: TooltipItem[] = [];
    series.forEach((field, s) => {
      const amount = amounts[i]?.[s] ?? null;
      const text = ctx.format(row[field], field);
      const bar = html(doc, "div", "fft-hbar-bar");
      const fill = html(doc, "div", "fft-hbar-fill");
      fill.style.width = widthOf(amount, maxOf(s));
      fill.style.background = color(s, lit);
      bar.append(fill, html(doc, "span", "fft-hbar-end", text));
      item.append(bar);
      lines.push({ label: ctx.label(field), value: text, color: color(s, lit) });
    });
    item.setAttribute("aria-label", `${name}: ${lines.map((line) => `${line.label} ${line.value || "no value"}`).join(", ")}`);
    const show = () => activate(item, item, name, lines);
    item.addEventListener("pointerenter", show);
    item.addEventListener("focus", show);
    item.addEventListener("pointerleave", deactivate);
    item.addEventListener("blur", deactivate);
    selectable(item, () => ctx.select(row));
    items.push(item);
    list.append(item);
  });
  finish();
}
