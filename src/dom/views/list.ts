import type { ViewRenderer } from "../../core/view-context.ts";
import type { ListView } from "../../core/views.ts";
import { columnContext, html, selectable } from "./shared.ts";
import { roving } from "./focus.ts";

/** Draws the `list` view: label and optional detail on the left, optional value on the right. */
export const renderList: ViewRenderer<ListView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, detail, value } = ctx.view;
  const list = html(doc, "ul", "fft-list");
  const extra = value ? columnContext(ctx, ctx.rows, [value]).get(value) : undefined;
  for (const row of ctx.rows) {
    const item = html(doc, "li", "fft-item");
    item.tabIndex = 0;
    const text = html(doc, "div", "fft-item-text");
    text.append(html(doc, "span", "fft-item-label", ctx.format(row[label], label)));
    if (detail) text.append(html(doc, "span", "fft-item-detail", ctx.format(row[detail], detail)));
    item.append(text);
    if (value) {
      const valueEl = html(doc, "span", "fft-item-value");
      valueEl.append(ctx.cell(row[value], value, extra));
      item.append(valueEl);
    }
    selectable(item, () => ctx.select(row));
    list.append(item);
  }
  roving([...list.children]);
  ctx.el.append(list);
};
