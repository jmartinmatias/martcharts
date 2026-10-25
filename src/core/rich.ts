/**
 * Rich tooltips: a small, safe markup for `spec.tooltip`. The template is read once into runs of text, and the data
 * only ever fills those runs as text, so nothing from a row is ever read as markup, let alone as HTML.
 *
 * - `**bold**` writes the words between in bold.
 * - A new line in the template starts a new line in the tooltip.
 * - `{field}` is the row's value in the field's own format.
 * - `{field|percent}` (or `number`, `currency`, `date`, `text`...) writes it in that format instead.
 * - `{field|bar}` draws a small bar, its length the value's share of the largest in the chart.
 * - `{count}`, `{sum:field}` and the other summary tokens of titles work too.
 *
 * @module
 */
import type { Row } from "./types.ts";

/** One piece of a tooltip line: text (bold or not), or a small bar. */
export type RichRun = { text: string; bold?: boolean } | { bar: number; negative?: boolean };

/** What the reader needs from the widget. */
export interface RichContext {
  /** A value in its field's own format. */
  format(value: unknown, field: string): string;
  /** A value in a named format, such as "percent". */
  formatAs(value: unknown, format: string): string;
  /** The largest absolute value of a field in the chart's rows, for bars. */
  max(field: string): number;
  /** A summary token such as `{sum:revenue}` or `{count}`, filled from all the rows; the token itself when unknown. */
  summarize(token: string): string;
}

/** True when a template uses the rich markup (bold, a named format or a bar), so it reads as runs, not label and value. */
export function isRich(template: string): boolean {
  return template.includes("**") || /\{[^{}|]+\|[^{}]+\}/.test(template);
}

const TOKEN = /\{([^{}]+)\}/g;

/** The template filled from one row, as lines of runs. Data fills text runs only; it is never parsed. */
export function richLines(template: string, row: Row, ctx: RichContext): RichRun[][] {
  return template
    .split(/\r?\n/)
    .map((line) => richLine(line, row, ctx))
    .filter((runs) => runs.some((run) => ("text" in run ? run.text.trim() !== "" : true)));
}

function richLine(line: string, row: Row, ctx: RichContext): RichRun[] {
  const runs: RichRun[] = [];
  let bold = false;
  // Split on ** first: the parts between toggle bold. Tokens inside a part are filled with data as text.
  line.split("**").forEach((part, i) => {
    if (i > 0) bold = !bold;
    let at = 0;
    for (const match of part.matchAll(TOKEN)) {
      const before = part.slice(at, match.index);
      if (before) runs.push(text(before, bold));
      runs.push(...token(match[1] as string, row, ctx, bold));
      at = (match.index ?? 0) + match[0].length;
    }
    const rest = part.slice(at);
    if (rest) runs.push(text(rest, bold));
  });
  return runs;
}

const text = (value: string, bold: boolean): RichRun => (bold ? { text: value, bold: true } : { text: value });

function token(inner: string, row: Row, ctx: RichContext, bold: boolean): RichRun[] {
  const bar = inner.indexOf("|");
  const field = (bar >= 0 ? inner.slice(0, bar) : inner).trim();
  const format = bar >= 0 ? inner.slice(bar + 1).trim() : "";
  if (!(field in row)) {
    // Not a field of this row: a summary token ({count}, {sum:revenue}), or words in braces left as written.
    return [text(ctx.summarize(`{${inner}}`), bold)];
  }
  const value = row[field];
  if (format === "bar") {
    const amount = typeof value === "number" ? value : Number(value);
    const max = ctx.max(field);
    if (!Number.isFinite(amount) || !(max > 0)) return [];
    return [{ bar: Math.min(1, Math.abs(amount) / max), ...(amount < 0 ? { negative: true } : {}) }];
  }
  return [text(format ? ctx.formatAs(value, format) : ctx.format(value, field), bold)];
}
