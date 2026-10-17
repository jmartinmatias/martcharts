import { readNumber } from "../../core/formats.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { MeterView } from "../../core/views.ts";
import { html, selectable } from "./shared.ts";
import { checkMark, standing } from "./target.ts";
import { roving } from "./focus.ts";

/**
 * Draws the `meter` view: one meter per row, with a label, attainment as a
 * percentage, "value of target", and a bar on a lighter track of the same hue.
 * Over target, the bar stops at the end of the track and the percentage says how far over.
 * Each meter says where it stands in target words: a met target carries a check and
 * "Target met", a missed one how far it has to go ("€22K to go"), so 94% and 103% never look alike.
 */
export const renderMeter: ViewRenderer<MeterView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { value: valueField, target: targetField, label: labelField } = ctx.view;
  const percent = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0 });
  const list = html(doc, "div", "fft-meters");
  list.setAttribute("role", "list");
  for (const row of ctx.rows) {
    const value = readNumber(row[valueField]);
    const target = readNumber(row[targetField]);
    const ratio = value !== null && target !== null && target !== 0 ? value / target : null;
    const name = labelField ? ctx.format(row[labelField], labelField) : ctx.label(valueField);
    const percentText = ratio === null ? "" : percent.format(ratio);

    const meter = html(doc, "div", "fft-meter");
    meter.setAttribute("role", "listitem");
    if (ratio !== null && ratio > 1) meter.dataset.over = "true";
    const { met, text: stand } = standing(ctx, value, target, valueField);
    if (met) meter.dataset.met = "true";
    const head = html(doc, "div", "fft-meter-head");
    const percentEl = html(doc, "span", "fft-meter-percent", percentText);
    if (met) percentEl.prepend(checkMark(doc));
    head.append(html(doc, "span", "fft-meter-label", name), percentEl);
    const track = html(doc, "div", "fft-meter-track");
    track.setAttribute("role", "meter");
    track.setAttribute("aria-valuemin", "0");
    if (value !== null) track.setAttribute("aria-valuenow", String(value));
    if (target !== null) track.setAttribute("aria-valuemax", String(target));
    track.setAttribute("aria-label", ratio === null ? name : `${name}: ${percentText} of target, ${stand.charAt(0).toLowerCase()}${stand.slice(1)}`);
    const fill = html(doc, "div", "fft-meter-fill");
    fill.style.width = `${ratio === null ? 0 : Math.round(Math.min(1, Math.max(0, ratio)) * 1000) / 10}%`;
    track.append(fill);
    const foot = html(doc, "div", "fft-meter-foot");
    foot.append(html(doc, "span", "fft-meter-value", `${ctx.format(row[valueField], valueField)} of ${ctx.format(row[targetField], targetField)}`));
    if (stand) foot.append(html(doc, "span", "fft-meter-gap", stand));
    meter.append(head, track, foot);
    meter.tabIndex = 0;
    selectable(meter, () => ctx.select(row));
    list.append(meter);
  }
  roving([...list.children]);
  ctx.el.append(list);
};
