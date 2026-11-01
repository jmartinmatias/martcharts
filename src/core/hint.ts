/**
 * The reading key: one short line on a chart form a reader may not know (a cycle plot, a box plot, a chord), saying
 * how to read it before they have to ask. Familiar forms (bars, lines, pies, numbers, tables) carry none, so the line
 * stays rare enough to be read. The full "How to read it" guide (explain.ts) says more, in the chart's own field names;
 * this line is the form's rule alone, in the card's language.
 *
 * A spec's `hint` overrides it: a string is the author's own line, `false` keeps it off.
 *
 * @module
 */
import { readable } from "./canonical.ts";
import { cycleFor } from "./cycle.ts";
import type { Row, WidgetSpec } from "./types.ts";
import { wordsFor } from "./words.ts";

/** The reading key for a spec's chart, or "" when its form needs none or the spec turned it off. */
export function hintOf(written: WidgetSpec, rows: Row[] = []): string {
  if (written.hint === false) return "";
  if (typeof written.hint === "string") return written.hint.trim();
  const spec = readable(written);
  const view = (spec.view ?? {}) as Record<string, unknown> & { type?: string };
  const words = wordsFor(spec.locale).hint;
  const type = String(view.type ?? "");
  if (type === "outcomes") {
    const label = typeof view.targetLabel === "string" && view.targetLabel.trim() ? view.targetLabel.trim() : undefined;
    return words.outcomes(typeof view.target === "number" ? (label ?? words.target) : undefined, view.goodWhen === "down");
  }
  const x = typeof view.x === "string" ? view.x : "";
  const variant =
    type === "dumbbell" && view.mark === "arrow" ? "dumbbell.arrow"
    // A cycle reads weekdays or months as the view does: as asked, else weekdays once there are two weeks of days.
    : type === "cycle" && (view.by === "month" || (view.by === undefined && (rows.length ? cycleFor(rows, x) === "month" : /month/i.test(x)))) ? "cycle.month"
    : type;
  return words.types[variant] ?? "";
}
