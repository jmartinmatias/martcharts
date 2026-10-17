import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { CalendarView } from "../../core/views.ts";
import { quantize } from "../layout.ts";
import { DAY, dayOf, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const STEPS = 7;

/**
 * Draws the `calendar` view: one cell per day, weeks as columns starting on
 * Monday, weekdays as rows, shaded on the 7-step blue scale. Months are
 * labelled above their first week, and a legend shows the range.
 */
export const renderCalendar: ViewRenderer<CalendarView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { date, value } = ctx.view;
  const days = new Map<number, { row: Row; amount: number | null }>();
  for (const row of ctx.rows) {
    const day = dayOf(row[date]);
    if (day !== null) days.set(day, { row, amount: readNumber(row[value]) });
  }
  const keys = [...days.keys()];
  const first = Math.min(...keys);
  const last = Math.max(...keys);
  const numbers = [...days.values()].map((d) => d.amount).filter((n): n is number => n !== null);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const weekday = (day: number) => (new Date(day * DAY).getUTCDay() + 6) % 7;
  const start = first - weekday(first);
  const weeks = Math.floor((last - start) / 7) + 1;

  const left = 34;
  const top = 21;
  const gap = 2;
  const cell = Math.max(8, Math.min(21, Math.floor((ctx.width - left) / weeks) - gap));
  const width = left + weeks * (cell + gap);
  const height = top + 7 * (cell + gap);
  const locale = ctx.spec.locale;
  const longDate = new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const monthName = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const weekdayName = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });

  const wrap = html(doc, "div", "fft-heat");
  const chart = svg(doc, "svg", { class: "fft-calendar", width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Calendar of ${ctx.label(value)} by day`);
  // Weekday labels on Monday, Wednesday and Friday rows (1970-01-05 was a Monday).
  for (const row of [0, 2, 4]) {
    const text = svg(doc, "text", { class: "fft-cal-weekday", x: left - 5, y: top + row * (cell + gap) + cell / 2, "text-anchor": "end", "dominant-baseline": "middle" });
    text.textContent = weekdayName.format(new Date((4 + row) * DAY));
    chart.append(text);
  }
  for (let day = first; day <= last; day++) {
    const column = Math.floor((day - start) / 7);
    const x = left + column * (cell + gap);
    const y = top + weekday(day) * (cell + gap);
    const when = new Date(day * DAY);
    if (day === first || when.getUTCDate() === 1) {
      const label = svg(doc, "text", { class: "fft-cal-month", x, y: top - 8 });
      label.textContent = monthName.format(when);
      chart.append(label);
    }
    const entry = days.get(day);
    const rect = svg(doc, "rect", { class: "fft-day", x, y, width: cell, height: cell, rx: 2, style: `--fft-i: ${column}` });
    if (entry && entry.amount !== null) {
      rect.dataset.step = String(quantize(entry.amount, min, max, STEPS));
      const dayText = longDate.format(when);
      const amountText = ctx.format(entry.row[value], value);
      rect.setAttribute("tabindex", "0");
      rect.setAttribute("role", "img");
      rect.setAttribute("aria-label", `${dayText}: ${amountText}`);
      const show = () => ctx.tooltip.show(rect, dayText, [{ label: ctx.label(value), value: amountText }]);
      rect.addEventListener("pointerenter", show);
      rect.addEventListener("focus", show);
      rect.addEventListener("pointerleave", () => ctx.tooltip.hide());
      rect.addEventListener("blur", () => ctx.tooltip.hide());
      const row = entry.row;
      selectable(rect, () => ctx.select(row));
    } else {
      rect.classList.add("fft-day-empty");
    }
    chart.append(rect);
  }

  const legend = html(doc, "div", "fft-heat-legend");
  const ramp = html(doc, "div", "fft-heat-ramp");
  ramp.setAttribute("aria-hidden", "true");
  for (let step = 1; step <= STEPS; step++) {
    const swatch = html(doc, "div");
    swatch.dataset.step = String(step);
    ramp.append(swatch);
  }
  legend.append(html(doc, "span", undefined, ctx.format(min, value)), ramp, html(doc, "span", undefined, ctx.format(max, value)));
  // Weeks run across, days down: left and right move a week, up and down a day.
  roving([...chart.querySelectorAll(".fft-day[data-step]")], { across: 7, down: 1 });
  wrap.append(chart, legend);
  ctx.el.append(wrap);
};
