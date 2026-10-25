/**
 * Scale keys in small multiples. When the panels share one scale (`ctx.extent` is set), the key is the same for
 * every panel, so only the first panel draws it; with no shared scale each panel keys its own range.
 *
 * @module
 */
import type { ViewContext } from "../../core/view-context.ts";

/**
 * True when this panel should draw its scale key: always outside small multiples, always when the panels keep
 * their own scales, and otherwise only for the first panel of this view in the grid. The panel that draws it
 * marks itself, so the panels drawn after it know.
 */
export function drawsScaleKey(ctx: ViewContext<{ type: string }>): boolean {
  if (!ctx.inFacet || !ctx.extent?.length) return true;
  const grid = ctx.el.closest(".fft-facets");
  if (!grid) return true;
  const mark = `${ctx.view.type}`;
  if (grid.querySelector(`[data-facet-key="${mark}"]`)) return false;
  ctx.el.dataset.facetKey = mark;
  return true;
}

/** The low and high of some numbers, widened by the shared extent when panels share one scale. */
export function sharedRange(own: number[], extent: number[] | undefined): [number, number] {
  const all = extent?.length ? [...own, ...extent] : own;
  return [Math.min(...all), Math.max(...all)];
}
