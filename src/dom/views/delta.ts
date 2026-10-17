import { trueMinus } from "../../core/display.ts";
import { html } from "./shared.ts";

/**
 * The change badge shared by the KPI view and the headline: an arrow, a
 * signed percentage with one decimal, and an optional comparison label.
 * Direction and sentiment are data attributes, so color is never the only signal.
 */
export function deltaElement(doc: Document, change: number, goodWhen: "up" | "down", compareText: string | undefined, locale: string | undefined): HTMLElement {
  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const box = html(doc, "div", "fft-kpi-delta");
  box.dataset.direction = direction;
  box.dataset.sentiment = direction === "flat" ? "neutral" : direction === goodWhen ? "good" : "bad";
  const text = trueMinus(new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(change));
  const changeEl = html(doc, "span", "fft-kpi-change");
  if (direction !== "flat") {
    const arrow = html(doc, "span", undefined, direction === "up" ? "▲" : "▼");
    arrow.setAttribute("aria-hidden", "true");
    changeEl.append(arrow, " ");
  }
  changeEl.append(text);
  box.append(changeEl);
  if (compareText) box.append(html(doc, "span", "fft-kpi-compare", compareText));
  return box;
}
