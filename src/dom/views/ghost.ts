/**
 * The ghost a view draws behind its marks (`compare`: last period, last year, the plan): a quieter shape where the
 * value stood, so what moved reads at a glance; and the words for it, what it was and the change since.
 *
 * @module
 */
import { trueMinus } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewContext } from "../../core/view-context.ts";
import { pointsWord } from "./delta.ts";
import { wordsFor } from "./words.ts";

/** The ghost's outline: secondary text, strong enough to read across a colored bar and on its grey track alike. */
export const GHOST_EDGE = "var(--fft-text-secondary)";

/** True when a field is shown as a percent, so its change is said in points. */
function isShare(ctx: ViewContext<{ type: string }>, field: string): boolean {
  const format = ctx.spec.fields?.[field]?.format;
  return format === "percent" || (typeof format === "object" && format !== null && (format as { type?: string }).type === "percent");
}

/** The change from `before` to `now`, signed: "+12%", or "+3 pts" when the field is a percent. Empty when unknown. */
export function ghostChange(ctx: ViewContext<{ type: string }>, now: number | null, before: number | null, field: string): string {
  if (now === null || before === null) return "";
  if (isShare(ctx, field)) {
    return `${trueMinus(new Intl.NumberFormat(ctx.spec.locale, { maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(Math.round((now - before) * 1000) / 10))} ${pointsWord(ctx.spec.locale)}`;
  }
  if (before === 0) return "";
  return trueMinus(new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }).format((now - before) / Math.abs(before)));
}

/** The tooltip lines a ghost adds: what it was (named by the compare field's label), and the change since. */
export function ghostLines(ctx: ViewContext<{ type: string }>, row: Row, field: string, compare: string | undefined): TooltipItem[] {
  if (!compare) return [];
  const before = readNumber(row[compare]);
  if (before === null) return [];
  const lines: TooltipItem[] = [{ label: ctx.label(compare), value: ctx.format(row[compare], compare), color: GHOST_EDGE }];
  const change = ghostChange(ctx, readNumber(row[field]), before, field);
  if (change) lines.push({ label: wordsFor(ctx).change, value: change });
  return lines;
}
