/**
 * Small DOM helpers shared by the built-in views. Every piece of data text
 * goes in through `textContent`, never as HTML.
 *
 * @module
 */
import { formatValue } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import type { FormatSpec, Row } from "../../core/types.ts";
import type { TooltipItem, ViewContext } from "../../core/view-context.ts";
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
/** Whether a format writes short figures (compact) with no decimals of its own, looking inside an in-cell bar. */
function compactOnly(format: FormatSpec | undefined): boolean {
  const own = typeof format === "object" ? format : undefined;
  const inner = own?.type === "bar" && typeof own.format === "object" ? (own.format as Record<string, unknown>) : own;
  return Boolean(inner?.compact) && typeof inner?.decimals !== "number";
}

/** One decimal when some figures show one and some do not ("€214K" above "€188.5K"); undefined when already even. */
function evenPlaces(texts: string[]): number | undefined {
  const shown = texts.map((text) => /\d[.,]\d/.test(text));
  return shown.some(Boolean) && !shown.every(Boolean) ? 1 : undefined;
}

/** The places a table or list column shares, so it lines up; undefined when it is even or not short figures. */
function sharedPlaces(ctx: ViewContext<{ type: string }>, rows: Row[], field: string): number | undefined {
  if (!compactOnly(ctx.spec.fields?.[field]?.format)) return undefined;
  return evenPlaces(rows.filter((row) => readNumber(row[field]) !== null).map((row) => ctx.format(row[field], field)));
}

/**
 * A formatter for a set of figures shown together (a legend, tiles, node totals), in one precision: short figures
 * that mix whole and one decimal all get one ("€660.1K", "€447.0K", "€97.6K"). The field's own format, or else
 * `fallback` (none: the plain number).
 */
export function evenFormat(ctx: ViewContext<{ type: string }>, field: string, values: number[], fallback?: FormatSpec): (n: number) => string {
  const format = ctx.spec.fields?.[field]?.format ?? fallback;
  const write = (n: number, places?: number) =>
    formatValue(n, places === undefined || format === undefined ? format : { ...(typeof format === "string" ? { type: format } : format), places }, ctx.spec.locale);
  const places = compactOnly(format) ? evenPlaces(values.map((n) => write(n))) : undefined;
  return (n) => write(n, places);
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
  speakShortFigures(hidden);
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

// ---- The shared drawing kit: one legend, one row behaviour, one hidden table, one share format ----

export { CHAR_WIDTH, DIM, endRoom, GAP, LABEL_COLUMN, labelColumn, ROW, rowHeight, textWidth } from "../layout.ts";

/** A swatch's shape, mirroring its marks: a square for bars and cells, a dot for points, a short line for lines, a ring for outlined marks. */
export type SwatchShape = "rect" | "dot" | "line" | "ring";

/** One legend key. */
export interface LegendEntry {
  /** The words beside the swatch. */
  label: string;
  /** CSS color of the swatch. */
  color: string;
  shape?: SwatchShape;
  /** A mark state the swatch mirrors: `miss` is a light fill outlined in the color (a bar below its target), `muted` a greyed key. */
  tone?: "miss" | "muted";
}

/**
 * The one legend every view uses: a row of keys whose swatches mirror their marks. Above the chart by default;
 * `place: "below"` for maps and scales. Returns undefined inside a small-multiples panel (the widget draws one
 * shared legend there) and when there is nothing to tell apart (`min` keys, 1 by default; pass 2 for series keys).
 */
export function legendList(ctx: ViewContext<{ type: string }>, entries: LegendEntry[], opts: { place?: "above" | "below"; min?: number } = {}): HTMLElement | undefined {
  if (ctx.inFacet || entries.length < (opts.min ?? 1)) return undefined;
  const doc = ctx.el.ownerDocument;
  const list = html(doc, "ul", "fft-legend");
  if (opts.place === "below") list.dataset.place = "below";
  for (const entry of entries) {
    const swatch = html(doc, "span", "fft-swatch");
    swatch.dataset.shape = entry.shape ?? "rect";
    swatch.setAttribute("aria-hidden", "true");
    if (entry.tone === "miss") {
      swatch.dataset.tone = "miss";
      swatch.style.background = `color-mix(in srgb, ${entry.color} 34%, var(--fft-surface))`;
      swatch.style.boxShadow = `inset 0 0 0 1px color-mix(in srgb, ${entry.color} 85%, var(--fft-text))`;
    } else if (entry.shape === "ring") {
      swatch.style.boxShadow = `inset 0 0 0 1.5px ${entry.color}`;
    } else swatch.style.background = entry.color;
    if (entry.tone === "muted") swatch.dataset.tone = "muted";
    const item = html(doc, "li");
    item.append(swatch, entry.label);
    list.append(item);
  }
  return list;
}

/** Percent of a whole, for shares in legends and tooltips: whole percents by default ("37%"), `digits` decimals at most. */
export function shareFormat(locale?: string, digits = 0): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: digits });
}

/** The data-active dance: one active mark at a time, the others stepping back to `--fft-dim` through the stylesheet. */
export interface ActiveGroup {
  /** Marks `node` active (and the group as having one), clearing the previous one. */
  on(node: Element): void;
  /** Clears the active mark and hides the tooltip, if one was given. */
  off(): void;
}

/**
 * The data-active state of a group of marks: `wrap` carries `data-active` while one mark does, so the stylesheet
 * can dim the rest with `.x[data-active] .mark:not([data-active]) { opacity: var(--fft-dim) }`.
 */
export function activeGroup(wrap: Element, tooltip?: { hide(): void }): ActiveGroup {
  let current: Element | undefined;
  return {
    on(node) {
      if (current && current !== node) current.removeAttribute("data-active");
      current = node;
      wrap.setAttribute("data-active", "");
      node.setAttribute("data-active", "");
    },
    off() {
      current?.removeAttribute("data-active");
      current = undefined;
      wrap.removeAttribute("data-active");
      tooltip?.hide();
    },
  };
}

/** What makes one row (or mark) of a view reachable: its name, its tooltip lines and where the tooltip points. */
export interface RowHitOptions {
  /** The element that takes focus and the pointer: a list item, or a transparent SVG rect over the row. */
  node: HTMLElement | SVGElement;
  /** The data row, reported through `ctx.select` on click, Enter or Space. */
  row: Row;
  /** The row's name: the tooltip title and the start of its aria-label. */
  name: string;
  items: TooltipItem[];
  /** The element the tooltip points at; the node itself by default. */
  anchor?: Element;
  /** The element that carries `data-active`; the node by default (often its row group). */
  active?: Element;
  /** The group whose other marks dim while this one is active. */
  group: ActiveGroup;
  /** Extra words at the end of the aria-label, such as ", crosses the majority". */
  said?: string;
}

/**
 * Wires one row the way every row view does: focusable (tabindex 0; role img on SVG), an aria-label of its name and
 * tooltip lines, the tooltip on pointer and focus, the rest dimmed meanwhile, and `ctx.select` on click, Enter or
 * Space. Call `roving(nodes)` once the rows are drawn so arrow keys move between them.
 */
export function rowHit(ctx: ViewContext<{ type: string }>, opts: RowHitOptions): HTMLElement | SVGElement {
  const { node, row, name, items, group } = opts;
  node.setAttribute("tabindex", "0");
  if (node.namespaceURI === SVG_NS) node.setAttribute("role", "img");
  node.setAttribute("aria-label", `${name}: ${items.map((item) => `${item.label} ${item.value || "no value"}`).join(", ")}${opts.said ?? ""}`);
  const show = () => {
    group.on(opts.active ?? node);
    ctx.tooltip.show(opts.anchor ?? node, name, items);
  };
  node.addEventListener("pointerenter", show);
  node.addEventListener("focus", show);
  node.addEventListener("pointerleave", () => group.off());
  node.addEventListener("blur", () => group.off());
  selectable(node, () => ctx.select(row));
  return node;
}

/** The arrow-key order over a view's rows, once they are drawn: re-exported so views need one import. */
export { roving };

/**
 * The table behind a chart, for screen readers only (WCAG 1.3.1): the rows it draws, in the columns it reads, in
 * the fields' own formats. Repeated or empty column names are dropped.
 */
export function hiddenTableOf(ctx: ViewContext<{ type: string }>, rows: Row[], columns: string[]): HTMLElement {
  const hidden = html(ctx.el.ownerDocument, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, rows, columns.filter((field, i) => field && columns.indexOf(field) === i), false));
  speakShortFigures(hidden);
  return hidden;
}

/** A short figure: digits, a decimal mark, digits, then a magnitude (K, M, B, Mio., Mrd., k). */
const SHORT_FIGURE = /\d[.,]\d+\s?(?:K|M|B|T|k|Md|Mio\.?|Mrd\.?|Bn|bn)(?![\p{L}])/u;

/**
 * Read aloud, a short figure says no zeros it does not need: "€820K", not "€820.00K". A format's fixed decimals line
 * figures up on screen, which a listener does not see. Only cells holding a short figure change.
 */
function speakShortFigures(hidden: HTMLElement): void {
  for (const cell of hidden.querySelectorAll("td, th")) {
    const text = cell.textContent ?? "";
    if (SHORT_FIGURE.test(text) && cell.children.length === 0) cell.textContent = trimZeros(text);
  }
}

/** A short figure without trailing zeros after its decimal mark: "€820.00K" reads "€820K", "€1.20M" reads "€1.2M". */
export function trimZeros(text: string): string {
  return text.replace(/(\d)([.,])(\d*?)0+(?=\D|$)/g, (_all, lead: string, mark: string, kept: string) => (kept ? `${lead}${mark}${kept}` : lead));
}
