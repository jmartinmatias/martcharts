import { trueMinus } from "../../core/display.ts";
import { html } from "./shared.ts";

/** How a change is said: relative to where it started (+13.8%), or, for a share, in percentage points (+7 pts). */
export type DeltaUnit = "relative" | "points";

/** The short word for percentage points: pts in English and French, Pp. in German. */
function pointsWord(locale: string | undefined): string {
  return /^de\b/i.test(locale ?? "") ? "Pp." : "pts";
}

/**
 * The change badge shared by the KPI view and the headline: an arrow, a
 * signed percentage with one decimal, and an optional comparison label.
 * With `unit: "points"`, `change` is the difference of two shares (0.07) and reads +7 pts.
 * Direction and sentiment are data attributes, so color is never the only signal.
 */
export function deltaElement(doc: Document, change: number, goodWhen: "up" | "down", compareText: string | undefined, locale: string | undefined, unit: DeltaUnit = "relative"): HTMLElement {
  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const box = html(doc, "div", "fft-kpi-delta");
  box.dataset.direction = direction;
  box.dataset.sentiment = direction === "flat" ? "neutral" : direction === goodWhen ? "good" : "bad";
  if (unit === "points") box.dataset.unit = "points";
  const text =
    unit === "points"
      ? `${trueMinus(new Intl.NumberFormat(locale, { maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(Math.round(change * 1000) / 10))} ${pointsWord(locale)}`
      : trueMinus(new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(change));
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
