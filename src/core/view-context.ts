/**
 * What a view renderer receives. Types only, so the core stays usable in Node
 * (the MCP server) where there is no DOM.
 *
 * @module
 */
import { normalizeView } from "./aliases.ts";
import type { Row, ViewSpec, WidgetSpec } from "./types.ts";

/** One line in a tooltip: a value and the series it belongs to. */
export interface TooltipItem {
  /** Series or field label, shown secondary. */
  label: string;
  /** Formatted value, shown strong. */
  value: string;
  /** Series color for the short line key beside the label. */
  color?: string;
}

/** The single tooltip each widget owns. */
export interface Tooltip {
  /** Shows the tooltip above `anchor`, or below it with `below`. All text is inserted as text, never as HTML. */
  show(anchor: Element, title: string, items: TooltipItem[], options?: { below?: boolean }): void;
  hide(): void;
}

/** Everything a view needs to draw itself. */
export interface ViewContext<V extends { type: string } = ViewSpec> {
  /** Empty container to draw into. */
  el: HTMLElement;
  /** Rows after every transform ran. Never empty: the widget shows its own empty state. */
  rows: Row[];
  /** This view's options. */
  view: V;
  /** The whole widget spec, for anything else a view wants to read. */
  spec: WidgetSpec;
  /** Width available in pixels. */
  width: number;
  /** Chart height in pixels: `style.height`, or the width divided by the golden ratio (180 to 320). */
  height: number;
  /** Human label for a field (`fields[name].label`, or the name turned into words). */
  label(field: string): string;
  /** Formats a value with the field's format, or a sensible default. */
  format(value: unknown, field?: string): string;
  /** Like `format`, but as a node, so rich formats (such as badge pills) can render. Use it for table cells and list values. */
  /** `extra` adds column context under the field's own format options, such as `max` for the `bar` format. */

  cell(value: unknown, field?: string, extra?: Record<string, unknown>): Node;
  /** CSS color for series number `index` (0-based), from the palette in fixed order. */
  color(index: number): string;
  /**
   * The fixed color of one category value, for views that color by category: the value's color in `spec.colors`, and
   * inside small multiples (see `ViewBlock.categories`) the same palette color in every panel. Undefined (or absent)
   * means no fixed color: the view falls back to `color(i)`.
   */
  colorOf?(category: unknown): string | undefined;
  /** The widget's tooltip. */
  tooltip: Tooltip;
  /** Reports that the viewer picked a row. The widget fires an `fft-select` event with it. */
  select(row: Row): void;
  /** Extra values the value axis must cover, so panels of small multiples share one scale. */
  extent?: number[];
  /** True inside a small-multiples panel: the widget draws one shared legend, so views skip their own. */
  inFacet?: boolean;
}

/**
 * Draws a view. May return a cleanup function, which runs before the next
 * render and when the widget is destroyed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ViewRenderer<V extends { type: string } = any> = (ctx: ViewContext<V>) => void | (() => void);

/** View options that name the category a mark stands for, in the order a click looks for them. */
export const CATEGORY_OPTIONS = ["label", "x", "id", "row", "y", "group", "series", "stage", "column"] as const;

/** True for a value that names a category rather than measuring something: text that is not a bare number, or a yes/no. */
function isCategoryValue(value: unknown): boolean {
  return (typeof value === "string" && value.trim() !== "" && !/^-?\d+(\.\d+)?$/.test(value.trim())) || typeof value === "boolean";
}

/**
 * The field a picked row stands for: the first of the view's category options (`label`, `x`, `id`, `row`, `y`...)
 * naming one field that holds a category in the row, or else the row's first text field (a table row). Undefined
 * when the row has no category at all. Dashboards cross-filter on it; tooltip templates find their row by it.
 */
export function categoryField(view: { type: string; [option: string]: unknown }, row: Row): string | undefined {
  // Read through the aliases, so a scatter colored with the canonical `color` cross-filters on it like one using `series`.
  const named = normalizeView(view);
  for (const option of CATEGORY_OPTIONS) {
    const field = named[option];
    if (typeof field === "string" && field in row && isCategoryValue(row[field])) return field;
  }
  return Object.keys(row).find((key) => isCategoryValue(row[key]));
}

const ROW_TOKEN = /\{([^{}:]+)\}/g;

/**
 * A tooltip template filled from one row: `{field}` is that row's value in the field's own format, and the summary
 * tokens (`{sum:field}`, `{count}`...) are filled first by `summarize`, as in titles. Words in braces that name no
 * field are left alone.
 */
export function fillRowTemplate(text: string, row: Row, format: (value: unknown, field: string) => string, summarize: (text: string) => string = (t) => t): string {
  return summarize(text).replace(ROW_TOKEN, (match, field: string) => (field in row ? format(row[field], field) : match));
}
