import { readNumber } from "../../core/formats.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { MeterView } from "../../core/views.ts";
import { html, selectable } from "./shared.ts";
import { roving } from "./focus.ts";

/**
 * Draws the `meter` view: one meter per row, with a label, attainment as a
 * percentage, "value of target", and a bar on a lighter track of the same hue.
 * Over target, the bar stops at the end of the track and the percentage says how far over.
 */
export const renderMeter: ViewRenderer<MeterView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { value: valueField, target: targetField, label: labelField } = ctx.view;
  const percent = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0 });
  const list = html(doc, "div", "fft-meters");
  for (const row of ctx.rows) {
    const value = readNumber(row[valueField]);
    const target = readNumber(row[targetField]);
    const ratio = value !== null && target !== null && target !== 0 ? value / target : null;
    const name = labelField ? ctx.format(row[labelField], labelField) : ctx.label(valueField);
    const percentText = ratio === null ? "" : percent.format(ratio);

    const meter = html(doc, "div", "fft-meter");
    if (ratio !== null && ratio > 1) meter.dataset.over = "true";
    const head = html(doc, "div", "fft-meter-head");
    head.append(html(doc, "span", "fft-meter-label", name), html(doc, "span", "fft-meter-percent", percentText));
    const track = html(doc, "div", "fft-meter-track");
    track.setAttribute("role", "meter");
    track.setAttribute("aria-valuemin", "0");
    if (value !== null) track.setAttribute("aria-valuenow", String(value));
    if (target !== null) track.setAttribute("aria-valuemax", String(target));
    track.setAttribute("aria-label", ratio === null ? name : `${name}: ${percentText} of target`);
    const fill = html(doc, "div", "fft-meter-fill");
    fill.style.width = `${ratio === null ? 0 : Math.round(Math.min(1, Math.max(0, ratio)) * 1000) / 10}%`;
    track.append(fill);
    const detail = html(doc, "div", "fft-meter-value", `${ctx.format(row[valueField], valueField)} of ${ctx.format(row[targetField], targetField)}`);
    meter.append(head, track, detail);
    meter.tabIndex = 0;
    selectable(meter, () => ctx.select(row));
    list.append(meter);
  }
  roving([...list.children]);
  ctx.el.append(list);
};
