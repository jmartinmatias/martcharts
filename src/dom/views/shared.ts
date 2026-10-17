/**
 * Small DOM helpers shared by the built-in views. Every piece of data text
 * goes in through `textContent`, never as HTML.
 *
 * @module
 */
import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { ViewContext } from "../../core/view-context.ts";
import { roving } from "./focus.ts";

export const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Size of a round figure (donut, rings, waffle, sunburst) for the space it has:
 * Fibonacci steps of 144px, 233px from 480px wide, and 377px from 900px wide
 * (an expanded widget, for example).
 */
export function figureSize(width: number): 144 | 233 | 377 {
  return width >= 900 ? 377 : width >= 480 ? 233 : 144;
}

/** Ring thickness that goes with a figure size: 13, 21 or 34px. */
export function ringThickness(size: number): number {
  return size >= 377 ? 34 : size >= 233 ? 21 : 13;
}

/** One day in milliseconds. */
export const DAY = 86_400_000;

/** Day number (days since 1970-01-01, UTC) from an ISO date (YYYY-MM-DD...), a timestamp or a Date, or null. */
export function dayOf(value: unknown): number | null {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split("-").map(Number) as [number, number, number];
    return Math.floor(Date.UTC(y, m - 1, d) / DAY);
  }
  if (typeof value === "number" || value instanceof Date) {
    const time = value instanceof Date ? value.getTime() : value;
    return Number.isFinite(time) ? Math.floor(time / DAY) : null;
  }
  return null;
}

/** Creates an HTML element with a class and optional text. */
export function html<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Creates an SVG element with attributes. */
export function svg<K extends keyof SVGElementTagNameMap>(doc: Document, tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const node = doc.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  return node;
}

/**
 * A category label under an axis: one line, or one tspan per line when it wraps. A wrapped label keeps its whole
 * name for screen readers, which would run the lines together.
 */
export function categoryLabel(doc: Document, attrs: Record<string, string | number>, name: string, lines?: string[], lineHeight = 13): SVGTextElement {
  const text = svg(doc, "text", attrs);
  if (!lines) {
    text.textContent = name;
    return text;
  }
  text.setAttribute("aria-label", name);
  for (const [n, line] of lines.entries()) {
    const span = svg(doc, "tspan", { x: attrs.x ?? 0, dy: n === 0 ? 0 : lineHeight });
    span.textContent = line;
    text.append(span);
  }
  return text;
}

/** Makes an element pick its row on click, Enter or Space. */
export function selectable(node: Element, select: () => void): void {
  node.addEventListener("click", select);
  node.addEventListener("keydown", (event) => {
    const key = (event as KeyboardEvent).key;
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      select();
    }
  });
}

/** Every field found in any row, in order of first appearance. */
export function allFields(rows: Row[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) for (const key of Object.keys(row)) seen.add(key);
  return [...seen];
}

/** One name or a list of names, as a list. */
export function fieldList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return value === undefined || value === null ? [] : [String(value)];
}

/** True when every present value in the column reads as a number, and at least one is present. */
export function isNumericColumn(rows: Row[], field: string): boolean {
  let present = 0;
  for (const row of rows) {
    const value = row[field];
    if (value === null || value === undefined || value === "") continue;
    if (readNumber(value) === null) return false;
    present++;
  }
  return present > 0;
}

/**
 * Builds a `<table>` of rows. Number columns get `fft-num` for right alignment.
 * With `interactive`, each body row can be focused and selected.
 */
/** Column context for cell formats that need it: the largest absolute value for `bar` columns, so bars share one scale, and one min and max across all `heat` columns. */
/**
 * One decimal for every short figure in a column when some have one and some do not ("€214K" above "€188.5K"), so
 * the column lines up; undefined when the column is already even, or its numbers are not short (compact).
 */
function sharedPlaces(ctx: ViewContext<{ type: string }>, rows: Row[], field: string): number | undefined {
  const format = ctx.spec.fields?.[field]?.format;
  const own = typeof format === "object" ? format : undefined;
  const inner = own?.type === "bar" && typeof own.format === "object" ? (own.format as Record<string, unknown>) : own;
  if (!inner?.compact || typeof inner.decimals === "number") return undefined;
  const shown = rows.filter((row) => readNumber(row[field]) !== null).map((row) => /\d[.,]\d/.test(ctx.format(row[field], field)));
  return shown.some(Boolean) && !shown.every(Boolean) ? 1 : undefined;
}

export function columnContext(ctx: ViewContext<{ type: string }>, rows: Row[], columns: string[]): Map<string, Record<string, unknown>> {
  const out = new Map<string, Record<string, unknown>>();
  const typeOf = (field: string) => {
    const format = ctx.spec.fields?.[field]?.format;
    return typeof format === "string" ? format : format?.type;
  };
  // Heat columns share one range across the table, so one shade means one value everywhere.
  const heatFields = columns.filter((field) => typeOf(field) === "heat");
  const heatValues = heatFields.flatMap((field) => rows.map((row) => readNumber(row[field])).filter((n): n is number => n !== null));
  for (const field of heatFields) out.set(field, { min: Math.min(...heatValues), max: Math.max(...heatValues) });
  for (const field of columns) {
    const places = sharedPlaces(ctx, rows, field);
    if (typeOf(field) !== "bar") {
      if (places !== undefined) out.set(field, { places });
      continue;
    }
    // chars: the longest number in the column, so every cell's number takes that width and the bars line up.
    out.set(field, {
      max: Math.max(0, ...rows.map((row) => Math.abs(readNumber(row[field]) ?? 0))) || 1,
      // With shared places, a whole figure gains its ".0".
      chars: Math.max(1, ...rows.map((row) => ctx.format(row[field], field)).map((text) => text.length + (places && !/\d[.,]\d/.test(text) ? 2 : 0))),
      ...(places !== undefined ? { places } : {}),
    });
  }
  return out;
}

/**
 * A table for screen readers only (WCAG 1.3.1): a header row, then one row per entry whose first cell names it.
 * For views whose data is not plain rows of fields, such as a grid or a summary per group.
 */
export function hiddenTable(doc: Document, headers: string[], rows: string[][]): HTMLElement {
  const hidden = html(doc, "div", "fft-sr-only");
  const table = html(doc, "table");
  const head = html(doc, "tr");
  for (const text of headers) {
    const th = html(doc, "th", undefined, text);
    th.setAttribute("scope", "col");
    head.append(th);
  }
  table.append(head);
  for (const cells of rows) {
    const tr = html(doc, "tr");
    cells.forEach((text, i) => {
      const cell = html(doc, i === 0 ? "th" : "td", undefined, text);
      if (i === 0) cell.setAttribute("scope", "row");
      tr.append(cell);
    });
    table.append(tr);
  }
  hidden.append(table);
  return hidden;
}

export function buildTable(ctx: ViewContext<{ type: string }>, rows: Row[], columns: string[], interactive: boolean): HTMLTableElement {
  const doc = ctx.el.ownerDocument;
  const table = html(doc, "table", "fft-table");
  const numeric = new Set(columns.filter((field) => isNumericColumn(rows, field)));
  const headRow = html(doc, "tr");
  for (const field of columns) {
    const th = html(doc, "th", numeric.has(field) ? "fft-num" : undefined, ctx.label(field));
    th.scope = "col";
    headRow.append(th);
  }
  const head = html(doc, "thead");
  head.append(headRow);
  const body = html(doc, "tbody");
  const extras = columnContext(ctx, rows, columns);
  for (const row of rows) {
    const tr = html(doc, "tr");
    for (const field of columns) {
      const td = html(doc, "td", numeric.has(field) ? "fft-num" : undefined);
      td.append(ctx.cell(row[field], field, extras.get(field)));
      tr.append(td);
    }
    if (interactive) {
      tr.tabIndex = 0;
      selectable(tr, () => ctx.select(row));
    }
    body.append(tr);
  }
  if (interactive) roving([...body.children]);
  table.append(head, body);
  return table;
}
