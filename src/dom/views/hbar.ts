import { readNumber } from "../../core/formats.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { HbarView } from "../../core/views.ts";
import { DEEMPHASIS, highlights } from "./chart.ts";
import { html, selectable } from "./shared.ts";
import { roving } from "./focus.ts";

/**
 * Draws the `hbar` view: one row per data row with the label on the left, a
 * bar from zero, and the value at the bar's end. Built from HTML so long
 * labels stay crisp, wrap-free and readable by assistive technology.
 * One series means one color; `highlight` keeps named rows in color and greys the rest.
 */
export const renderHbar: ViewRenderer<HbarView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, value } = ctx.view;
  const picked = highlights(ctx.view.highlight);
  const amounts = ctx.rows.map((row) => readNumber(row[value]));
  const max = Math.max(0, ...amounts.filter((n): n is number => n !== null));

  const list = html(doc, "ol", "fft-hbars");
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
    fill.style.width = `${amount === null || amount <= 0 || max === 0 ? 0 : Math.round((amount / max) * 1000) / 10}%`;
    fill.style.background = on ? ctx.color(0) : DEEMPHASIS;
    fill.style.setProperty("--fft-bar-color", on ? ctx.color(0) : DEEMPHASIS);
    track.append(fill);
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
};
