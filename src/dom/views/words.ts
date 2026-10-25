/**
 * The words every view writes itself (tooltip rows, keys, notes), from the one words module in the widget's language
 * (see core/words.ts), and the emphasis the views share: `highlight` keeps the named categories in their color and greys the rest,
 * and a category keeps one color wherever it appears when the widget knows its colors (`ctx.colorOf`).
 *
 * @module
 */
import type { ViewContext } from "../../core/view-context.ts";
import { wordsFor as coreWordsFor, WORDS_EN } from "../../core/words.ts";
import type { LocaleSource, Words } from "../../core/words.ts";
import { DEEMPHASIS, highlights } from "./chart.ts";

/** The English words: for helpers that have no view to ask, and as the fallback. */
export const WORDS: Words = WORDS_EN;

export type { Words };

/** The words a view writes, in its widget's language: French for a "fr-…" locale, German for "de-…", English otherwise. */
export function wordsFor(ctx: LocaleSource): Words {
  return coreWordsFor(ctx);
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
