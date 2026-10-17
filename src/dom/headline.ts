import { formatValue } from "../core/display.ts";
import { computeHeadline } from "../core/headline.ts";
import { fillTemplate } from "../core/template.ts";
import type { Row, WidgetSpec } from "../core/types.ts";
import { countable } from "./count-up.ts";
import { deltaElement } from "./views/delta.ts";

/**
 * Fills the headline element from the spec and the rows the view draws.
 * Hides it when the spec has no headline or the number cannot be computed.
 */
export function renderHeadline(el: HTMLElement, spec: WidgetSpec, rows: Row[]): void {
  el.replaceChildren();
  const headline = spec.headline;
  const { value, before } = headline && rows.length ? computeHeadline(headline, rows) : { value: null, before: null };
  if (!headline || value === null) {
    el.hidden = true;
    return;
  }
  const doc = el.ownerDocument;
  const format = spec.fields?.[headline.value]?.format;
  const line = doc.createElement("div");
  line.className = "fft-headline-line";
  const number = doc.createElement("span");
  number.className = "fft-headline-value";
  const show = (n: number) => formatValue(n, format ?? { type: "number", compact: true }, spec.locale);
  number.textContent = show(value);
  countable(number, value, show);
  line.append(number);
  if (before !== null && before !== 0) {
    line.append(deltaElement(doc, (value - before) / Math.abs(before), headline.goodWhen ?? "up", headline.compareLabel, spec.locale));
  }
  el.append(line);
  if (headline.caption) {
    const caption = doc.createElement("div");
    caption.className = "fft-headline-caption";
    caption.textContent = fillTemplate(headline.caption, rows, spec.fields, spec.locale);
    el.append(caption);
  }
  el.hidden = false;
}
