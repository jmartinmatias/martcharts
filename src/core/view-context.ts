/**
 * What a view renderer receives. Types only, so the core stays usable in Node
 * (the MCP server) where there is no DOM.
 *
 * @module
 */
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
  /** Shows the tooltip next to `anchor`. All text is inserted as text, never as HTML. */
  show(anchor: Element, title: string, items: TooltipItem[]): void;
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
