import { readNumber } from "../../core/formats.ts";
import { compareValues, isMissing } from "../../core/transforms.ts";
import type { Row } from "../../core/types.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { TableView } from "../../core/views.ts";
import { allFields, buildTable, fieldList, html, isNumericColumn } from "./shared.ts";
import { wordsFor } from "./words.ts";

/**
 * Draws the `table` view: one row per data row, one column per field. Headers
 * are sort buttons (ascending, then descending, missing values last, the
 * direction in `aria-sort`), and `totals` adds a footer row of sums that
 * sorting never moves. Three quiet extras for long tables, each only there when
 * asked for: `search` keeps the rows whose shown text matches and counts them
 * aloud, `pageSize` turns the rows into pages with Previous and Next, and
 * `stickyFirst` pins the first column while the rest scrolls sideways.
 */
export const renderTable: ViewRenderer<TableView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const columns = ctx.view.columns ? fieldList(ctx.view.columns) : allFields(ctx.rows);
  const sortable = ctx.view.sortable !== false;
  const pageSize = typeof ctx.view.pageSize === "number" && ctx.view.pageSize >= 1 ? Math.floor(ctx.view.pageSize) : 0;
  const align = ctx.view.align && typeof ctx.view.align === "object" ? ctx.view.align : {};
  let sort: { field: string; direction: 1 | -1 } | undefined;
  let query = "";
  let page = 0;
  const wrap = html(doc, "div", "fft-table-wrap");
  if (ctx.view.stickyFirst) wrap.dataset.sticky = "";
  const count = new Intl.NumberFormat(ctx.spec.locale);

  // The rows the viewer sees: those matching the search (on the text each cell shows), in sort order.
  const matching = (): Row[] => {
    const needle = query.trim().toLowerCase();
    const kept = needle ? ctx.rows.filter((row) => columns.some((field) => ctx.format(row[field], field).toLowerCase().includes(needle))) : ctx.rows;
    if (!sort) return kept;
    const { field, direction } = sort;
    return [...kept].sort((a, b) => {
      if (isMissing(a[field])) return isMissing(b[field]) ? 0 : 1;
      if (isMissing(b[field])) return -1;
      return compareValues(a[field], b[field]) * direction;
    });
  };

  // Search: a field, the count of rows it leaves ("12 of 56 rows"), and a line for when it leaves none.
  const tools = html(doc, "div", "fft-table-tools");
  const input = html(doc, "input", "fft-table-search");
  const found = html(doc, "span", "fft-table-count");
  const empty = html(doc, "p", "fft-table-empty", wordsFor(ctx).table.noMatch);
  empty.hidden = true;
  if (ctx.view.search) {
    input.type = "search";
    input.placeholder = wordsFor(ctx).table.search;
    input.autocomplete = "off";
    input.setAttribute("aria-label", wordsFor(ctx).table.searchIn(ctx.spec.title ?? wordsFor(ctx).table.theTable));
    found.setAttribute("aria-live", "polite");
    found.hidden = true;
    input.addEventListener("input", () => {
      query = input.value;
      page = 0;
      draw();
    });
    tools.append(input, found);
  }

  // Pages: Previous, "1–10 of 56", Next; only while there is more than one page.
  const pager = html(doc, "nav", "fft-pager");
  pager.setAttribute("aria-label", wordsFor(ctx).table.pages);
  pager.hidden = true;
  const previous = html(doc, "button", "fft-pager-button", wordsFor(ctx).table.previous);
  const next = html(doc, "button", "fft-pager-button", wordsFor(ctx).table.next);
  const where = html(doc, "span", "fft-pager-where");
  where.setAttribute("aria-live", "polite");
  if (pageSize) {
    previous.type = "button";
    next.type = "button";
    previous.setAttribute("aria-label", wordsFor(ctx).table.previousPage);
    next.setAttribute("aria-label", wordsFor(ctx).table.nextPage);
    const turn = (step: number) => () => {
      page += step;
      draw();
      // A button that just went dark hands focus to the other one, so the keyboard never drops out of the pager.
      if (step > 0 && next.disabled) previous.focus();
      if (step < 0 && previous.disabled) next.focus();
    };
    previous.addEventListener("click", turn(-1));
    next.addEventListener("click", turn(1));
    pager.append(previous, where, next);
  }

  const draw = (focus?: string) => {
    const rows = matching();
    const pages = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
    page = Math.min(page, pages - 1);
    const shown = pageSize ? rows.slice(page * pageSize, (page + 1) * pageSize) : rows;
    const table = buildTable(ctx, shown, columns, true);
    // Rows fade in top to bottom on the first draw, as every view's marks do.
    table.querySelectorAll<HTMLElement>("tbody tr").forEach((tr, i) => tr.style.setProperty("--fft-i", String(i)));
    if (sortable) {
      table.querySelectorAll("thead th").forEach((th, i) => {
        const field = columns[i] as string;
        const button = html(doc, "button", "fft-sort", th.textContent ?? "");
        button.type = "button";
        th.replaceChildren(button);
        if (sort?.field === field) th.setAttribute("aria-sort", sort.direction > 0 ? "ascending" : "descending");
        button.addEventListener("click", () => {
          sort = sort?.field === field ? { field, direction: sort.direction > 0 ? -1 : 1 } : { field, direction: 1 };
          page = 0;
          draw(field);
        });
      });
    }
    for (const [field, side] of Object.entries(align)) {
      const i = columns.indexOf(field);
      if (i < 0) continue;
      for (const cell of table.querySelectorAll<HTMLElement>(`tr > :nth-child(${i + 1})`)) cell.style.textAlign = String(side);
    }
    if (ctx.view.totals) table.append(totalsRow());
    wrap.replaceChildren(table);
    if (focus !== undefined) (table.querySelectorAll<HTMLButtonElement>("thead .fft-sort")[columns.indexOf(focus)])?.focus();

    if (ctx.view.search) {
      const searching = query.trim() !== "";
      found.textContent = wordsFor(ctx).table.rowsShown(count.format(rows.length), count.format(ctx.rows.length));
      found.hidden = !searching;
      empty.hidden = rows.length > 0;
      wrap.hidden = rows.length === 0;
    }
    if (pageSize) {
      pager.hidden = pages <= 1;
      previous.disabled = page === 0;
      next.disabled = page >= pages - 1;
      where.textContent = rows.length ? wordsFor(ctx).table.pageRange(count.format(page * pageSize + 1), count.format(Math.min(rows.length, (page + 1) * pageSize)), count.format(rows.length)) : "";
    }
    edge();
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
      else if (i === 0) td.textContent = wordsFor(ctx).table.total;
      tr.append(td);
    });
    foot.append(tr);
    return foot;
  };

  // A table wider than its card scrolls sideways: while more columns wait to the right, that edge fades out as a cue to swipe.
  // Without sort buttons nothing inside takes focus, so the scrolling box itself becomes a labelled stop (WCAG 2.1.1).
  const edge = () => {
    const overflows = wrap.scrollWidth - wrap.clientWidth > 1;
    wrap.toggleAttribute("data-more", overflows && wrap.scrollLeft < wrap.scrollWidth - wrap.clientWidth - 1);
    if (overflows && !sortable) {
      wrap.tabIndex = 0;
      wrap.setAttribute("role", "region");
      wrap.setAttribute("aria-label", wordsFor(ctx).table.scrollSideways(ctx.spec.title ?? wordsFor(ctx).table.tableWord));
    } else if (wrap.hasAttribute("role")) {
      wrap.removeAttribute("tabindex");
      wrap.removeAttribute("role");
      wrap.removeAttribute("aria-label");
    }
  };
  wrap.addEventListener("scroll", edge, { passive: true });

  if (ctx.view.search) ctx.el.append(tools);
  ctx.el.append(wrap, empty);
  if (pageSize) ctx.el.append(pager);
  draw();
};
