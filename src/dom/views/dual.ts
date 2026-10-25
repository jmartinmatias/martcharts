import { readNumber } from "../../core/formats.ts";
import { getPreset } from "../../core/presets.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { Annotation, DualMark, DualView } from "../../core/views.ts";
import { bands, barPath, CHAR_WIDTH, curveLine, evenLabels, layoutBars, linearScale, spread } from "../layout.ts";
import type { LabelBox, LinearScale } from "../layout.ts";
import { drawNotes, pinNotes, tickFormatter } from "./chart.ts";
import { categoryLabel, hiddenTableOf, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";
import { wordsFor } from "./words.ts";

/** Room above each panel for its caption (the measure's name), and the air between the two panels. */
const CAPTION = 18;
const GAP = 13;
/** Ticks per panel: each is short, so three or four lines keep it readable without crowding. */
const TICKS = 4;

/**
 * Draws the `dual` view: two measures one above the other on two panels that
 * share one x axis, each panel on its own scale with its own tick labels and
 * the measure's name as a caption at its top-left. Bars grow from zero; lines
 * fit their own range. One hit area per period spans both panels, so pointing
 * at a month lights it up on both and one tooltip gives both values. The
 * honest form of a dual-axis chart: no second axis, so no false crossings.
 * `annotations` pin short notes to periods on the top panel, at its measure's
 * value there (or at the note's own y on that panel's scale).
 */
export const renderDual: ViewRenderer<DualView & { annotations?: Annotation[] }> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { rows, view } = ctx;
  const fields = [view.y, view.y2] as const;
  const marks: [DualMark, DualMark] = Array.isArray(view.panels) && view.panels.length === 2 ? view.panels : ["bar", "line"];
  const curve = view.curve ?? "linear";
  const values = fields.map((field) => rows.map((row) => readNumber(row[field])));
  const xLabels = rows.map((row) => ctx.format(row[view.x], view.x));
  const present = values.map((list) => list.filter((v): v is number => v !== null));
  // Tick labels first, to know how wide the left margin must be for both panels.
  const tickTexts = fields.map((field, p) => {
    const ticks = linearScale(present[p] ?? [], [1, 0], { includeZero: marks[p] === "bar", count: TICKS }).ticks;
    return { ticks, text: tickFormatter(ctx, field, ticks) };
  });
  const left = Math.max(28, ...tickTexts.flatMap(({ ticks, text }) => ticks.map((t) => text(t).length * CHAR_WIDTH + 12)));
  const margin = { top: 5, right: 13, bottom: 26, left };
  const width = Math.max(ctx.width, left + margin.right + 40);
  // Two panels in the room of one chart and a little more, so the pair stays near the card's usual proportions.
  const panelHeight = Math.max(55, Math.round((ctx.height + 55 - margin.top - margin.bottom - GAP - 2 * CAPTION) / 2));
  const height = margin.top + 2 * (CAPTION + panelHeight) + GAP + margin.bottom;
  const plotX = margin.left;
  const plotW = width - margin.left - margin.right;
  const panels = [0, 1].map((p) => {
    const top = margin.top + CAPTION + p * (CAPTION + panelHeight + GAP);
    const bar = marks[p] === "bar";
    const scale: LinearScale = linearScale(present[p] ?? [], [top + panelHeight, top], { includeZero: bar, count: TICKS });
    return { top, bottom: top + panelHeight, bar, scale, color: ctx.colorOf?.(fields[p]) ?? ctx.colorOf?.(ctx.label(fields[p] as string)) ?? ctx.color(p), field: fields[p] as string, tickText: tickTexts[p]?.text ?? ((v: number) => String(v)) };
  });
  // Bars sit in bands; with lines only, the points run edge to edge as a time series does.
  const anyBar = marks.includes("bar");
  const slots = anyBar ? bands(rows.length, plotX, plotW) : spread(rows.length, plotX, plotW);

  const wrap = html(doc, "div", "fft-chart fft-dual");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", wordsFor(ctx).aria.dual(ctx.label(view.y), ctx.label(view.y2), ctx.label(view.x)));

  const markGroups = slots.map((_, i) => svg(doc, "g", { class: "fft-marks", "data-index": i, style: `--fft-i: ${i}` }));
  const crosshair = svg(doc, "line", { class: "fft-crosshair", y1: panels[0]?.top ?? 0, y2: panels[1]?.bottom ?? 0, x1: 0, x2: 0, hidden: "" });
  const hoverDots = svg(doc, "g");
  const preset = getPreset(ctx.spec.style?.preset)?.marks ?? {};
  const radius = preset.barRadius === "full" ? Number.POSITIVE_INFINITY : (preset.barRadius ?? 4);

  panels.forEach((panel, p) => {
    const axis = svg(doc, "g", { class: "fft-dual-panel", "data-panel": p + 1 });
    // The caption: the measure's name, in its color's company, so the panel needs no legend.
    const caption = svg(doc, "text", { class: "fft-dual-caption", x: plotX, y: panel.top - 6 });
    caption.textContent = ctx.label(panel.field);
    axis.append(caption);
    for (const tick of panel.scale.ticks) {
      const ty = panel.scale(tick);
      const isBase = panel.bar ? tick === 0 : tick === panel.scale.ticks[0];
      axis.append(svg(doc, "line", { class: isBase ? "fft-baseline" : "fft-gridline", x1: plotX, x2: plotX + plotW, y1: ty, y2: ty }));
      const label = svg(doc, "text", { class: "fft-tick fft-tick-y", x: plotX - 8, y: ty, "text-anchor": "end", "dominant-baseline": "middle" });
      label.textContent = panel.tickText(tick);
      axis.append(label);
    }
    chart.append(axis);
    const list = values[p] ?? [];
    if (panel.bar) {
      for (const rect of layoutBars([list], slots, panel.scale)) {
        const bar = svg(doc, "path", { class: "fft-bar", d: barPath(rect, radius) });
        bar.style.setProperty("fill", panel.color);
        if (rect.negative) bar.setAttribute("data-negative", "");
        markGroups[rect.index]?.append(bar);
      }
    } else {
      const points = list.map((v, i) => (v === null ? null : { x: slots[i]?.center ?? 0, y: panel.scale(v) }));
      const line = svg(doc, "path", { class: "fft-line", d: curveLine(points, curve), pathLength: 1 });
      line.style.setProperty("stroke", panel.color);
      line.dataset.series = panel.field;
      chart.append(line);
      const last = points.findLast((point) => point !== null);
      if (last) {
        const dot = svg(doc, "circle", { class: "fft-dot fft-end", cx: last.x, cy: last.y, r: 4 });
        dot.style.setProperty("fill", panel.color);
        chart.append(dot);
        // The last value at the line's end, as a line chart writes it.
        const index = points.lastIndexOf(last);
        const text = svg(doc, "text", { class: "fft-end-label", x: last.x + 8, y: last.y, "dominant-baseline": "middle" });
        text.textContent = ctx.format(rows[index]?.[panel.field], panel.field);
        if (last.x + 8 + text.textContent.length * CHAR_WIDTH <= width) chart.append(text);
      }
    }
  });
  chart.append(...markGroups);

  // Period labels once, under the lower panel, thinned to an even rhythm that always names the last one.
  const widest = Math.max(...xLabels.map((label) => label.length)) * CHAR_WIDTH + 8;
  const anchorOf = (i: number) => (anyBar || rows.length < 2 ? "middle" : i === 0 ? "start" : i === rows.length - 1 ? "end" : "middle");
  const box = (i: number): LabelBox => ({ x: slots[i]?.center ?? 0, width: (xLabels[i] ?? "").length * CHAR_WIDTH, anchor: anchorOf(i) });
  const baseY = (panels[1]?.bottom ?? 0) + 18;
  for (const i of evenLabels(rows.length, Math.ceil((rows.length * widest) / plotW), box)) {
    chart.append(categoryLabel(doc, { class: "fft-tick fft-tick-x", x: slots[i]?.center ?? 0, y: baseY, "text-anchor": anchorOf(i) }, xLabels[i] ?? ""));
  }
  // Notes pinned to periods of the top panel: beside their point on a wide card, numbered and listed under it on a narrow one.
  const top = panels[0];
  const pinned = top
    ? pinNotes(
        view.annotations,
        (note: Annotation) => rows.findIndex((row, i) => String(row[view.x]) === String(note.x) || xLabels[i] === String(note.x)),
        (note: Annotation, i) => {
          const v = typeof note.y === "number" ? note.y : values[0]?.[i];
          return v === null || v === undefined ? null : { x: slots[i]?.center ?? 0, y: top.scale(v) };
        },
      )
    : [];
  const noteList = top ? drawNotes(doc, chart, pinned, { x: plotX, y: top.top, w: plotW, h: top.bottom - top.top }, ctx.width) : undefined;
  chart.append(crosshair, hoverDots);

  // One hit area per period, spanning both panels: pointing at a month lights it up above and below.
  const overlay = svg(doc, "g");
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const group of markGroups) group.removeAttribute("data-active");
    crosshair.setAttribute("hidden", "");
    hoverDots.replaceChildren();
    ctx.tooltip.hide();
  };
  slots.forEach((slot, i) => {
    const row = rows[i] ?? {};
    const items: TooltipItem[] = panels.map((panel) => ({ label: ctx.label(panel.field), value: ctx.format(row[panel.field], panel.field), color: panel.color }));
    for (const pin of pinned) if (pin.i === i) items.push({ label: wordsFor(ctx).note, value: pin.text });
    const title = xLabels[i] ?? "";
    const hit = svg(doc, "rect", { class: "fft-hit", x: slot.start, y: panels[0]?.top ?? 0, width: slot.width, height: (panels[1]?.bottom ?? 0) - (panels[0]?.top ?? 0), tabindex: 0, role: "img" });
    hit.setAttribute("aria-label", `${title}: ${items.map((item) => `${item.label} ${item.value || "no value"}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      markGroups[i]?.setAttribute("data-active", "");
      crosshair.setAttribute("x1", String(slot.center));
      crosshair.setAttribute("x2", String(slot.center));
      crosshair.removeAttribute("hidden");
      hoverDots.replaceChildren();
      panels.forEach((panel, p) => {
        const v = values[p]?.[i];
        if (panel.bar || v === null || v === undefined) return;
        const dot = svg(doc, "circle", { class: "fft-dot", cx: slot.center, cy: panel.scale(v), r: 4 });
        dot.style.setProperty("fill", panel.color);
        hoverDots.append(dot);
      });
      ctx.tooltip.show(hit, title, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    selectable(hit, () => ctx.select(row));
    overlay.append(hit);
  });
  chart.append(overlay);
  roving([...overlay.querySelectorAll(".fft-hit")]);
  wrap.append(chart);
  if (noteList) wrap.append(noteList);
  wrap.append(hiddenTableOf(ctx, rows, [view.x, view.y, view.y2]));
  ctx.el.append(wrap);
};
