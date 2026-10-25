/**
 * The words the radial, hierarchy and map views write themselves (tooltip rows, keys, notes), in one place to
 * translate, and the emphasis they share: `highlight` keeps the named categories in their color and greys the rest,
 * and a category keeps one color wherever it appears when the widget knows its colors (`ctx.colorOf`).
 *
 * @module
 */
import type { ViewContext } from "../../core/view-context.ts";
import { DEEMPHASIS, highlights } from "./chart.ts";

/** Every word these views write on their own. Keyed by meaning, so a translation replaces values only. */
export const WORDS = {
  share: "Share",
  total: "Total",
  noData: "No data",
  majority: "Majority",
  crossesMajority: "Crosses it",
  crossesMajorityAria: "crosses the majority",
  seats: "seats",
  sends: "Sends",
  receives: "Receives",
  shareOfAll: "Share of all moves",
  to: "to",
  from: "From",
  of: "of",
  inside: "Inside",
  ofParent: "Of",
  ofTotal: "Of total",
  ofTarget: "Of target",
  target: "Target",
  goal: "Goal",
  toGo: "to go",
  met: "Target met",
  notPlaced: (count: number) => `${count} row${count === 1 ? "" : "s"} could not be placed on the map.`,
  noGeometry: "No map geometry to draw.",
  other: "Other",
  region: "Region",
  circleSize: (field: string, biggest: string) => `Circle size: ${field}. The biggest circle is ${biggest}.`,
  majorityLabel: (seats: string) => `Majority ${seats}`,
  scale: "Scale",
  held: "Held",
  notHeld: "Not held",
  products: "Products",
  unknown: "unknown",
  flags: "Flags",
  nextActions: "Next best actions",
  // Maps against the previous period.
  previous: "Previous",
  change: "Change",
  noChange: "No change",
  changeScale: (field: string) => `Change in ${field}`,
  // RAG scorecards and trends.
  overall: "Overall",
  now: "Now",
  count: "Count",
  status: "Status",
  was: "Was",
  why: "Why",
  noReading: "No reading",
  lastPeriod: "Last period",
  better: "Better",
  worse: "Worse",
  /** What a cell says to screen readers when it moved: ", better than last period (At risk)". */
  movedSince: (better: boolean, before: string) => `, ${better ? "better" : "worse"} than last period (${before})`,
  noStatus: "no data",
  /** The line under a scorecard showing only some statuses: "and 33 on track", or "and 4 at risk, 33 on track". */
  andMore: (parts: string[]) => `and ${parts.join(", ")}`,
  rowsByStatus: (count: number) => `${count} ${count === 1 ? "row" : "rows"} by overall status`,
} as const;

export type Words = typeof WORDS;

/** The words a widget writes: the built-in set for now; a locale's own set can be returned here later. */
export function wordsFor(_ctx: ViewContext<{ type: string }>): Words {
  return WORDS;
}

/** What `highlight` asks of a view: whether a category stays in color, and the color it then wears. */
export interface Emphasis {
  /** True when nothing is highlighted, or this category is one of those named. */
  lit(category: unknown): boolean;
  /** The category's color when lit, the grey that steps back otherwise. */
  paint(category: unknown, color: string): string;
  /** True when the view names anything to highlight. */
  any: boolean;
}

/** Reads `view.highlight`: a name or a list of names, matched against a category's raw value or its text. */
export function emphasis(ctx: ViewContext<{ type: string; highlight?: unknown }>): Emphasis {
  const picked = highlights(ctx.view.highlight);
  const lit = (category: unknown) => picked.length === 0 || picked.includes(String(category));
  return { lit, paint: (category, color) => (lit(category) ? color : DEEMPHASIS), any: picked.length > 0 };
}

/** A category's color: its own when the widget knows the colors of its categories, otherwise the palette's color at `index`. */
export function categoryColor(ctx: ViewContext<{ type: string }>, category: unknown, index: number): string {
  return ctx.colorOf?.(category) ?? ctx.color(index);
}
