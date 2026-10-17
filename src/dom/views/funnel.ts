import { readNumber } from "../../core/formats.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { FunnelView } from "../../core/views.ts";
import { html, selectable } from "./shared.ts";
import { roving } from "./focus.ts";

/**
 * Draws the `funnel` view: one centered bar per stage, as wide as its share
 * of the first stage, with the conversion from each stage to the next between
 * them. Values and shares are text, so the drop-off reads without the bars.
 */
export const renderFunnel: ViewRenderer<FunnelView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, value } = ctx.view;
  const amounts = ctx.rows.map((row) => readNumber(row[value]));
  const first = amounts[0] ?? null;
  const base = first !== null && first > 0 ? first : Math.max(0, ...amounts.filter((n): n is number => n !== null)) || 1;
  const pct = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0 });

  const funnel = html(doc, "div", "fft-funnel");
  funnel.setAttribute("role", "list");
  ctx.rows.forEach((row, i) => {
    const amount = amounts[i] ?? null;
    const name = ctx.format(row[label], label);
    const valueText = ctx.format(row[value], value);
    const ofFirst = amount === null ? "" : pct.format(amount / base);

    const item = html(doc, "div", "fft-funnel-row");
    item.setAttribute("role", "listitem");
    item.tabIndex = 0;
    item.style.setProperty("--fft-i", String(i));
    const track = html(doc, "div", "fft-funnel-track");
    const bar = html(doc, "div", "fft-funnel-bar");
    bar.style.width = `${amount === null || amount <= 0 ? 0 : Math.round(Math.min(1, amount / base) * 1000) / 10}%`;
    track.append(bar);
    const numbers = html(doc, "span", "fft-funnel-nums");
    numbers.append(html(doc, "span", "fft-funnel-value", valueText), html(doc, "span", "fft-funnel-share", ofFirst));
    item.append(html(doc, "span", "fft-funnel-label", name), track, numbers);

    const previous = i > 0 ? (amounts[i - 1] ?? null) : null;
    const ofPrevious = amount !== null && previous ? pct.format(amount / previous) : "";
    const items = [
      { label: ctx.label(value), value: valueText },
      ...(ofPrevious ? [{ label: "Of previous stage", value: ofPrevious }] : []),
      { label: "Of first stage", value: ofFirst },
    ];
    item.setAttribute("aria-label", `${name}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const show = () => ctx.tooltip.show(bar, name, items);
    item.addEventListener("pointerenter", show);
    item.addEventListener("focus", show);
    item.addEventListener("pointerleave", () => ctx.tooltip.hide());
    item.addEventListener("blur", () => ctx.tooltip.hide());
    selectable(item, () => ctx.select(row));
    funnel.append(item);

    const next = amounts[i + 1];
    if (i < ctx.rows.length - 1 && amount && next !== undefined && next !== null) {
      // The step-to-step rate is in the next stage's label ("Of previous stage"), so the arrow between them is visual only.
      const step = html(doc, "div", "fft-funnel-step", `${pct.format(next / amount)} →`);
      step.setAttribute("aria-hidden", "true");
      funnel.append(step);
    }
  });
  roving([...funnel.querySelectorAll(".fft-funnel-row")]);
  ctx.el.append(funnel);
};
