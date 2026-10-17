import { readNumber } from "../../core/formats.ts";
import { compareValues, isMissing } from "../../core/transforms.ts";
import type { Row } from "../../core/types.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { TableView } from "../../core/views.ts";
import { allFields, buildTable, fieldList, html, isNumericColumn } from "./shared.ts";

/**
 * Draws the `table` view: one row per data row, one column per field. Headers
 * are sort buttons (ascending, then descending, missing values last, the
 * direction in `aria-sort`), and `totals` adds a footer row of sums that
 * sorting never moves.
 */
export const renderTable: ViewRenderer<TableView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const columns = ctx.view.columns ? fieldList(ctx.view.columns) : allFields(ctx.rows);
  const sortable = ctx.view.sortable !== false;
  let sort: { field: string; direction: 1 | -1 } | undefined;
  const wrap = html(doc, "div", "fft-table-wrap");

  const sorted = (): Row[] => {
    if (!sort) return ctx.rows;
    const { field, direction } = sort;
    return [...ctx.rows].sort((a, b) => {
      if (isMissing(a[field])) return isMissing(b[field]) ? 0 : 1;
      if (isMissing(b[field])) return -1;
      return compareValues(a[field], b[field]) * direction;
    });
  };

  const draw = (focus?: string) => {
    const table = buildTable(ctx, sorted(), columns, true);
    if (sortable) {
      table.querySelectorAll("thead th").forEach((th, i) => {
        const field = columns[i] as string;
        const button = html(doc, "button", "fft-sort", th.textContent ?? "");
        button.type = "button";
        th.replaceChildren(button);
        if (sort?.field === field) th.setAttribute("aria-sort", sort.direction > 0 ? "ascending" : "descending");
        button.addEventListener("click", () => {
          sort = sort?.field === field ? { field, direction: sort.direction > 0 ? -1 : 1 } : { field, direction: 1 };
          draw(field);
        });
      });
    }
    if (ctx.view.totals) table.append(totalsRow());
    wrap.replaceChildren(table);
    if (focus !== undefined) (table.querySelectorAll<HTMLButtonElement>("thead .fft-sort")[columns.indexOf(focus)])?.focus();
  };

  const totalsRow = () => {
    const foot = html(doc, "tfoot");
    const tr = html(doc, "tr");
    columns.forEach((field, i) => {
      const format = ctx.spec.fields?.[field]?.format;
      const type = typeof format === "string" ? format : format?.type;
      const summable = isNumericColumn(ctx.rows, field) && type !== "percent";
      const td = html(doc, "td", summable ? "fft-num" : undefined);
      if (summable) td.textContent = ctx.format(ctx.rows.reduce((sum, row) => sum + (readNumber(row[field]) ?? 0), 0), field);
      else if (i === 0) td.textContent = "Total";
      tr.append(td);
    });
    foot.append(tr);
    return foot;
  };

  draw();
  ctx.el.append(wrap);
};
