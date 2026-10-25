import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { WaterfallView } from "../../core/views.ts";
import { bands, CHAR_WIDTH, layoutWaterfall, linearScale } from "../layout.ts";
import { highlights, tickFormatter } from "./chart.ts";
import { hiddenTableOf, html, selectable, svg } from "./shared.ts";
import { edgeAnchor, edgeX } from "./label-fit.ts";
import { roving } from "./focus.ts";
import { wordsFor } from "./words.ts";

/**
 * Draws the `waterfall` view: totals stand on zero, every other step floats
 * from the running total by its change, and hairline connectors carry the
 * running total from one bar to the next. Increases and decreases use the
 * diverging up and down colors, and every bar is labelled, with a sign on
 * changes, so direction never rests on color alone.
 *
 * `highlight` keeps the named steps in color and greys the rest; panels of
 * small multiples share one value axis.
 */
export const renderWaterfall: ViewRenderer<WaterfallView & { highlight?: string | string[] }> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, value, endLabel } = ctx.view;
  const totals = new Set((Array.isArray(ctx.view.totals) ? ctx.view.totals : ctx.view.totals ? [ctx.view.totals] : []).map(String));
  const rows: Row[] = ctx.rows;
  const steps = layoutWaterfall(
    rows.map((row) => ({ value: readNumber(row[value]), total: totals.has(String(row[label])) })),
    Boolean(endLabel),
  );
  const names = [...rows.map((row) => ctx.format(row[label], label)), ...(endLabel ? [endLabel] : [])];
  const signed = (n: number) => (n > 0 ? `+${ctx.format(n, value)}` : ctx.format(n, value));
  // Emphasis: the named steps keep their color, the rest step back (the end total follows its own name, endLabel).
  const picked = highlights(ctx.view.highlight);
  const isOn = (i: number) => picked.length === 0 || picked.includes(i < rows.length ? String(rows[i]?.[label]) : String(endLabel));

  // With fit, the axis spans only the running totals (totals then rise from the axis floor); otherwise it starts at zero.
  const fit = ctx.view.fit === true;
  const levels = steps.flatMap((step) => (fit && step.kind === "total" ? [step.end] : [step.start, step.end]));
  if (fit) {
    // Headroom below the lowest level, half the range, so totals still read as bars rather than slivers.
    const low = Math.min(...levels);
    levels.push(low - (Math.max(...levels) - low) / 2);
  }
  // Small multiples pass the levels every panel must cover, so the panels share one scale.
  if (ctx.extent && !fit) levels.push(...ctx.extent);
  const rough = linearScale(levels, [1, 0], { includeZero: !fit }).ticks;
  const tickText = tickFormatter(ctx, value, rough);
  const left = Math.max(28, Math.max(...rough.map((t) => tickText(t).length)) * CHAR_WIDTH + 12);
  const margin = { top: 21, right: 5, bottom: 26, left };
  const width = Math.max(ctx.width, left + 89);
  const height = ctx.height;
  const plot = { x: margin.left, y: margin.top, w: width - margin.left - margin.right, h: height - margin.top - margin.bottom };
  const y = linearScale(levels, [plot.y + plot.h, plot.y], { includeZero: !fit });
  const floor = y.domain[0];
  const slots = bands(steps.length, plot.x, plot.w);
  const barWidth = Math.max(1, Math.min(34, (slots[0]?.width ?? 0) * 0.618));

  const wrap = html(doc, "div", "fft-chart");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", wordsFor(ctx).aria.waterfall(ctx.label(value), ctx.label(label)));

  for (const tick of y.ticks) {
    const ty = y(tick);
    chart.append(svg(doc, "line", { class: tick === (fit ? floor : 0) ? "fft-baseline" : "fft-gridline", x1: plot.x, x2: plot.x + plot.w, y1: ty, y2: ty }));
    const text = svg(doc, "text", { class: "fft-tick fft-tick-y", x: plot.x - 8, y: ty, "text-anchor": "end", "dominant-baseline": "middle" });
    text.textContent = tickText(tick);
    chart.append(text);
  }

  const widest = Math.max(...names.map((name) => name.length)) * CHAR_WIDTH + 8;
  const every = Math.max(1, Math.ceil((steps.length * widest) / plot.w));
  const marks = svg(doc, "g");
  const overlay = svg(doc, "g");
  steps.forEach((step, i) => {
    const slot = slots[i];
    if (!slot) return;
    const low = step.kind === "total" && fit ? floor : Math.min(step.start, step.end);
    const top = y(Math.max(step.start, step.end));
    const bottom = y(low);
    const x = slot.center - barWidth / 2;
    const bar = svg(doc, "rect", { class: "fft-step", x, y: top, width: barWidth, height: Math.max(1, bottom - top), rx: 2, style: `--fft-i: ${i}` });
    bar.dataset.kind = step.kind;
    if (!isOn(i)) bar.dataset.muted = "true";
    marks.append(bar);

    const change = step.end - step.start;
    const caption = svg(doc, "text", { class: "fft-step-label", x: slot.center, y: top - 5, "text-anchor": "middle" });
    caption.textContent = step.kind === "total" ? ctx.format(step.end, value) : signed(change);
    marks.append(caption);

    const next = slots[i + 1];
    if (next) {
      const level = y(step.end);
      marks.append(svg(doc, "line", { class: "fft-connector", x1: x + barWidth, x2: next.center - barWidth / 2, y1: level, y2: level }));
    }
    if (i % every === 0) {
      const word = names[i] ?? "";
      const anchor = edgeAnchor(slot.center, word, width);
      const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: edgeX(slot.center, anchor, width), y: plot.y + plot.h + 18, "text-anchor": anchor });
      text.textContent = word;
      chart.append(text);
    }

    const items: TooltipItem[] =
      step.kind === "total"
        ? [{ label: wordsFor(ctx).total, value: ctx.format(step.end, value) }]
        : [
            { label: wordsFor(ctx).change, value: signed(change) },
            { label: wordsFor(ctx).runningTotal, value: ctx.format(step.end, value) },
          ];
    const hit = svg(doc, "rect", { class: "fft-hit", x: slot.start, y: plot.y, width: slot.width, height: plot.h, tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${names[i]}: ${items.map((item) => `${item.label} ${item.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      bar.setAttribute("data-active", "");
      ctx.tooltip.show(hit, names[i] ?? "", items);
    };
    const deactivate = () => {
      wrap.removeAttribute("data-active");
      bar.removeAttribute("data-active");
      ctx.tooltip.hide();
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    const row = rows[i];
    if (row) selectable(hit, () => ctx.select(row));
    overlay.append(hit);
  });
  chart.append(marks, overlay);
  roving([...overlay.children]);
  wrap.append(chart);

  const tableRows: Row[] = steps.map((step, i) => ({ [label]: names[i], [value]: step.kind === "total" ? step.end : step.end - step.start }));
  wrap.append(hiddenTableOf(ctx, tableRows, [label, value]));
  ctx.el.append(wrap);
};
