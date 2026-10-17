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
    if (typeOf(field) !== "bar") continue;
    // chars: the longest number in the column, so every cell's number takes that width and the bars line up.
    out.set(field, {
      max: Math.max(0, ...rows.map((row) => Math.abs(readNumber(row[field]) ?? 0))) || 1,
      chars: Math.max(1, ...rows.map((row) => ctx.format(row[field], field).length)),
    });
  }
  return out;
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
