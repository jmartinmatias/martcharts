import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { WaterfallView } from "../../core/views.ts";
import { bands, CHAR_WIDTH, layoutWaterfall, linearScale, textWidth } from "../layout.ts";
import { highlights } from "./chart.ts";
import { hiddenTableOf, html, selectable, svg, fillHeight } from "./shared.ts";
import { edgeAnchor, edgeX, fitLabel } from "./label-fit.ts";
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
  // Every bar writes its own value, so a value axis would only say the numbers twice: no tick labels and no
  // gridlines, a quiet baseline only, and the room an axis would take goes to the bars.
  const margin = { top: 21, right: 5, bottom: 26, left: 5 };
  const width = Math.max(ctx.width, margin.left + 89);
  // Step names wrap onto up to three lines under their bar, so every step keeps its name; only when a name still does
  // not fit its slot do the names thin out to every nth.
  const slotRoom = (width - margin.left - margin.right) / Math.max(1, steps.length) - 6;
  const wrapName = (name: string): string[] => {
    const lines: string[] = [];
    for (const word of name.split(/\s+/)) {
      const last = lines[lines.length - 1];
      if (last !== undefined && textWidth(`${last} ${word}`, 11 * 1.06) <= slotRoom) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    return lines;
  };
  const wrapped = names.map(wrapName);
  const wraps = wrapped.every((lines) => lines.length <= 3 && lines.every((line) => textWidth(line, 11 * 1.06) <= slotRoom));
  const nameLines = wraps ? Math.max(1, ...wrapped.map((lines) => lines.length)) : 1;
  margin.bottom += (nameLines - 1) * 13;
  // Names too long to wrap lean at 40 degrees instead, every one still named, as long as a slot is a line tall.
  const leans = !wraps && slotRoom + 6 >= 13 && !ctx.inFacet;
  const longestName = Math.max(0, ...names.map((name) => textWidth(name, 11 * 1.06)));
  if (leans) margin.bottom += Math.ceil(longestName * Math.sin(Math.PI * 40 / 180)) - 8;
  // The first name leans down and left past its bar: the plot moves right to make room for it (up to a quarter of
  // the card), so it is read whole rather than cut.
  if (leans) {
    const firstRun = textWidth(names[0] ?? "", 11 * 1.06) * Math.cos((Math.PI * 40) / 180);
    const firstCenter = margin.left + (width - margin.left - margin.right) / Math.max(1, steps.length) / 2;
    const need = Math.ceil(firstRun - (firstCenter + 4) + 12);
    if (need > 0) margin.left += Math.min(need, Math.round(width * 0.25));
  }
  const height = ctx.inFacet || ctx.spec.style?.height ? ctx.height : fillHeight(ctx, ctx.height, 8, Math.max(ctx.height, Math.round(width * 0.75)));
  const plot = { x: margin.left, y: margin.top, w: width - margin.left - margin.right, h: height - margin.top - margin.bottom };
  const y = linearScale(levels, [plot.y + plot.h, plot.y], { includeZero: !fit });
  const floor = y.domain[0];
  const slots = bands(steps.length, plot.x, plot.w);
  const barWidth = Math.max(1, Math.min(34, (slots[0]?.width ?? 0) * 0.618));

  const wrap = html(doc, "div", "fft-chart");
  if (!ctx.inFacet && !ctx.spec.style?.height) wrap.dataset.fill = "";
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", wordsFor(ctx).aria.waterfall(ctx.label(value), ctx.label(label)));

  const base = y(fit ? floor : Math.max(floor, Math.min(0, y.domain[1])));
  chart.append(svg(doc, "line", { class: "fft-baseline", x1: plot.x, x2: plot.x + plot.w, y1: base, y2: base }));

  const widest = Math.max(...names.map((name) => name.length)) * CHAR_WIDTH + 8;
  const every = wraps || leans ? 1 : Math.max(1, Math.ceil((steps.length * widest) / plot.w));
  const marks = svg(doc, "g");
  const overlay = svg(doc, "g");
  const captions: { node: SVGTextElement; x: number; half: number; up: boolean }[] = [];
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
    // A rise writes its value above its bar, a fall under it (the bar's own direction), so neighbours rarely meet.
    const words = step.kind === "total" ? ctx.format(step.end, value) : signed(change);
    const under = step.kind !== "total" && change < 0 && bottom + 15 <= plot.y + plot.h;
    const caption = svg(doc, "text", { class: "fft-step-label", x: slot.center, y: under ? bottom + 13 : top - 5, "text-anchor": "middle" });
    caption.textContent = words;
    captions.push({ node: caption, x: slot.center, half: textWidth(words) / 2 + 2, up: !under });
    marks.append(caption);

    const next = slots[i + 1];
    if (next) {
      const level = y(step.end);
      marks.append(svg(doc, "line", { class: "fft-connector", x1: x + barWidth, x2: next.center - barWidth / 2, y1: level, y2: level }));
    }
    if (i % every === 0) {
      const word = names[i] ?? "";
      const anchor = edgeAnchor(slot.center, word, width);
      const lines = wraps ? (wrapped[i] ?? [word]) : [word];
      const ty = plot.y + plot.h + (leans ? 13 : 18);
      // The first and last names keep inside the card: anchored by their widest line, as a single line is.
      const widestLine = lines.reduce((a, b) => (textWidth(b) > textWidth(a) ? b : a), "");
      const lineAnchor = edgeAnchor(slot.center, widestLine, width);
      const lineX = edgeX(slot.center, lineAnchor, width);
      const text = leans
        ? svg(doc, "text", { class: "fft-tick fft-tick-x", x: slot.center + 4, y: ty, "text-anchor": "end", transform: `rotate(-40 ${slot.center + 4} ${ty})` })
        : svg(doc, "text", { class: "fft-tick fft-tick-x", x: wraps ? lineX : edgeX(slot.center, anchor, width), y: ty, "text-anchor": wraps ? lineAnchor : anchor });
      // A leaning name runs down and to the left of its bar; near the card's left edge it is cut to the room there.
      if (leans) text.textContent = fitLabel(word, (slot.center + 4) / Math.cos((Math.PI * 40) / 180) - 4, 11 * 1.06);
      else if (lines.length === 1) text.textContent = word;
      else
        lines.forEach((line, k) => {
          const span = svg(doc, "tspan", { x: lineX, dy: k === 0 ? 0 : 13 });
          span.textContent = line;
          text.append(span);
        });
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
  separateCaptions(captions, plot.y - margin.top + 11, height - 2);
  chart.append(marks, overlay);
  roving([...overlay.children]);
  wrap.append(chart);

  const tableRows: Row[] = steps.map((step, i) => ({ [label]: names[i], [value]: step.kind === "total" ? step.end : step.end - step.start }));
  wrap.append(hiddenTableOf(ctx, tableRows, [label, value]));
  ctx.el.append(wrap);
};

/**
 * Moves a value label that would overprint its left neighbour one line further from its bar (up for a rise, down
 * for a fall), within the chart. Labels are 11px, so a line is 13px.
 */
export function separateCaptions(captions: { node: SVGTextElement; x: number; half: number; up: boolean }[], top: number, bottom: number): void {
  const line = 13;
  for (let i = 1; i < captions.length; i++) {
    const self = captions[i]!;
    for (let tries = 0; tries < 3; tries++) {
      const y = Number(self.node.getAttribute("y"));
      const hit = captions.slice(0, i).some((other) => {
        const oy = Number(other.node.getAttribute("y"));
        return Math.abs(other.x - self.x) < other.half + self.half && Math.abs(oy - y) < line;
      });
      if (!hit) break;
      const moved = self.up ? y - line : y + line;
      if (moved < top || moved > bottom) break;
      self.node.setAttribute("y", String(moved));
    }
  }
}
