/**
 * Names that fit their column: measured for San Francisco with the kit's `textWidth`, cut with an ellipsis when
 * they are longer than the room, the full name kept for assistive technology and the pointer's title. Shared by
 * the row views (dot, dumbbell, slope, bump, lifecycle, timeline, matrix…), so a long name never runs off a card.
 *
 * @module
 */
import { GAP, labelColumn, textWidth } from "../layout.ts";
import { SVG_NS } from "./shared.ts";

/** `text` cut to fit `room` px at `size` px and `weight`, ending in an ellipsis; whole when it fits. */
export function fitLabel(text: string, room: number, size = 11, weight = 400): string {
  if (textWidth(text, size, weight) <= room) return text;
  const chars = [...text];
  let keep = chars.length - 1;
  while (keep > 1 && textWidth(`${chars.slice(0, keep).join("").trimEnd()}…`, size, weight) > room) keep--;
  return `${chars.slice(0, Math.max(1, keep)).join("").trimEnd()}…`;
}

/**
 * Writes `shown` into a label; when it was cut from `full`, the whole name goes into aria-label (and a title on HTML
 * labels), so a screen reader gets it. On SVG rows the row's tooltip already carries the whole name.
 */
export function writeLabel(node: Element, shown: string, full: string): void {
  node.textContent = shown;
  if (shown === full) return;
  node.setAttribute("aria-label", full);
  if (node.namespaceURI !== SVG_NS) (node as HTMLElement).title = full;
}

/** A name column for a row view: its width (the kit's `labelColumn`) and every name fitted to it. */
export interface NameColumn {
  /** Width of the column in px, from the card's left edge; names end `GAP.m` before it. */
  width: number;
  /** Each name as drawn: whole, or cut with an ellipsis. */
  shown: string[];
  /** The x where right-aligned names end. */
  end: number;
}

/**
 * The column a list of names needs on a card `cardWidth` wide: the longest name plus a gap, between 34px and 34%
 * of the card (or `max`), each name cut to the room that leaves.
 */
export function nameColumn(names: string[], cardWidth: number, opts: { min?: number; max?: number; size?: number; weight?: number } = {}): NameColumn {
  const size = opts.size ?? 11;
  const width = labelColumn(names, cardWidth, { min: opts.min, max: opts.max, size });
  // Half a pixel of slack: the column is rounded, the measure is not.
  const room = Math.max(8, width - GAP.l + 0.5);
  return { width, end: width - GAP.m, shown: names.map((name) => fitLabel(name, room, size, opts.weight ?? 400)) };
}

/**
 * How a label centred on `x` should anchor so it stays inside a drawing `width` wide: "middle" where it fits, "start"
 * when it would spill past the left edge, "end" when it would spill past the right one (the last tick of an axis).
 */
export function edgeAnchor(x: number, text: string, width: number, size = 11, weight = 400): "start" | "middle" | "end" {
  const half = textWidth(text, size, weight) / 2;
  if (x + half > width - 1) return "end";
  if (x - half < 1) return "start";
  return "middle";
}

/** The x to write a label at for its anchor: pulled to the edge it anchors on, so an end label ends at the edge. */
export function edgeX(x: number, anchor: "start" | "middle" | "end", width: number): number {
  return anchor === "end" ? Math.min(x, width - 1) : anchor === "start" ? Math.max(x, 1) : x;
}
