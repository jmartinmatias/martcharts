import { readNumber } from "../../core/formats.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { MeterView } from "../../core/views.ts";
import { activeGroup, hiddenTableOf, html, roving, rowHit, shareFormat } from "./shared.ts";
import { checkMark, standing } from "./target.ts";

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
  const percent = shareFormat(ctx.spec.locale);
  const list = html(doc, "div", "fft-meters");
  list.setAttribute("role", "list");
  const group = activeGroup(list, ctx.tooltip);
  const hits: Element[] = [];
  ctx.rows.forEach((row, i) => {
    const value = readNumber(row[valueField]);
    const target = readNumber(row[targetField]);
    const ratio = value !== null && target !== null && target !== 0 ? value / target : null;
    const name = labelField ? ctx.format(row[labelField], labelField) : ctx.label(valueField);
    const percentText = ratio === null ? "" : percent.format(ratio);

    const meter = html(doc, "div", "fft-meter");
    meter.setAttribute("role", "listitem");
    meter.style.setProperty("--fft-i", String(i));
    if (ratio !== null && ratio > 1) meter.dataset.over = "true";
    const { met, text: stand } = standing(ctx, value, target, valueField);
    if (met) meter.dataset.met = "true";
    const head = html(doc, "div", "fft-meter-head");
    const percentEl = html(doc, "span", "fft-meter-percent", percentText);
    if (met) percentEl.prepend(checkMark(doc));
    const nameNode = html(doc, "span", "fft-meter-label", name);
    // A name longer than its line ends in an ellipsis (CSS); the pointer's title and the meter's aria-label keep it whole.
    nameNode.title = name;
    head.append(nameNode, percentEl);
    const track = html(doc, "div", "fft-meter-track");
    track.setAttribute("role", "meter");
    track.setAttribute("aria-valuemin", "0");
    if (value !== null) track.setAttribute("aria-valuenow", String(value));
    if (target !== null) track.setAttribute("aria-valuemax", String(target));
    track.setAttribute("aria-label", ratio === null ? name : `${name}: ${percentText} of target, ${stand.charAt(0).toLowerCase()}${stand.slice(1)}`);
    const fill = html(doc, "div", "fft-meter-fill");
    const fixed = labelField ? ctx.colorOf?.(row[labelField]) : ctx.colorOf?.(valueField);
    if (fixed) fill.style.background = fixed;
    fill.style.width = `${ratio === null ? 0 : Math.round(Math.min(1, Math.max(0, ratio)) * 1000) / 10}%`;
    track.append(fill);
    const foot = html(doc, "div", "fft-meter-foot");
    foot.append(html(doc, "span", "fft-meter-value", `${ctx.format(row[valueField], valueField)} of ${ctx.format(row[targetField], targetField)}`));
    if (stand) foot.append(html(doc, "span", "fft-meter-gap", stand));
    meter.append(head, track, foot);
    // The tooltip says what the meter shows in figures: the value, the target, the attainment and what is left.
    const items = [
      { label: ctx.label(valueField), value: ctx.format(row[valueField], valueField) },
      { label: ctx.label(targetField), value: ctx.format(row[targetField], targetField) },
      ...(percentText ? [{ label: "Of target", value: percentText }] : []),
      ...(stand && !met ? [{ label: "Where it stands", value: stand }] : []),
    ];
    hits.push(rowHit(ctx, { node: meter, row, name, items, anchor: track, group }));
    list.append(meter);
  });
  roving(hits);
  ctx.el.append(list, hiddenTableOf(ctx, ctx.rows, [labelField ?? "", valueField, targetField]));
};
