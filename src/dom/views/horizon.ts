import { readNumber } from "../../core/formats.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { HorizonView } from "../../core/views.ts";
import { areaPath, evenLabels, spread } from "../layout.ts";
import type { LabelBox } from "../layout.ts";
import { tickFormatter } from "./chart.ts";
import { fieldList, hiddenTableOf, html, ROW, roving, rowHit, svg, textWidth } from "./shared.ts";
import type { ActiveGroup } from "./shared.ts";
import { nameColumn, writeLabel } from "./label-fit.ts";

const LANE: number = ROW.roomy;
const GAP = 2;
const AXIS = 26;
/** Multiples a band's step rounds up to, within each power of ten: steps such as 30 or 250, never an odd 37. */
const ROUND = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** The smallest round number at or above `value`. */
function roundUp(value: number): number {
  if (!(value > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  return (ROUND.find((m) => m * power >= value - 1e-9) ?? 10) * power;
}

type Sign = "up" | "down";

/** A band's shade: deeper the further it sits from the baseline, mixed with the card so it stays opaque. */
const shade = (sign: Sign, band: number, count: number) =>
  `color-mix(in srgb, var(--fft-${sign}) ${Math.round(8 + (90 * (band + 1)) / count)}%, var(--fft-ring, var(--fft-surface)))`;

/**
 * Draws the `horizon` view: one thin row per series. Each value's distance
 * from the baseline is cut into bands one round step tall, and the bands are
 * folded down into the row, each deeper in color than the one below: blue
 * rising from the row's foot for above the baseline, red hanging from its top
 * for below, so the side reads by position as well as color. A series that crosses the baseline is
 * split exactly there, so the two colors never overlap. A key names the step,
 * and pointing at a period lists every series there.
 */
export const renderHorizon: ViewRenderer<HorizonView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { x } = ctx.view;
  const series = fieldList(ctx.view.y);
  const rows = ctx.rows;
  const count = Math.min(5, Math.max(1, Math.round(ctx.view.bands ?? 3)));
  const base = ctx.view.baseline ?? 0;
  const values = series.map((field) => rows.map((row) => readNumber(row[field])));
  const reach = Math.max(0, ...values.flat().flatMap((v) => (v === null ? [] : [Math.abs(v - base)])));
  const step = roundUp(reach / count);
  const valueText = tickFormatter(ctx, series[0], [base, ...Array.from({ length: count + 1 }, (_, k) => base + k * step)]);

  const names = series.map((field) => ctx.label(field));
  // Series names in a measured column, cut with an ellipsis past a third of the card.
  const column = nameColumn(names, ctx.width);
  const left = column.width + 5;
  const width = Math.max(ctx.width, left + 144);
  const plot = { x: left, w: width - left - 13 };
  const rowsHeight = series.length * LANE + Math.max(0, series.length - 1) * GAP;
  const height = rowsHeight + AXIS;
  const slots = spread(rows.length, plot.x, plot.w);

  const wrap = html(doc, "div", "fft-chart fft-horizon");
  // The key: which side is which, and what one shade is worth.
  const key = html(doc, "div", "fft-horizon-key");
  // A named baseline ("plan") reads in its own words; otherwise the key gives its value.
  const named = ctx.view.baselineLabel?.trim();
  const baseText = named || valueText(base);
  for (const [sign, text] of [["up", `Above ${baseText}, rising`], ["down", `Below ${baseText}, hanging`]] as const) {
    const ramp = html(doc, "span", "fft-horizon-ramp");
    ramp.setAttribute("aria-hidden", "true");
    for (let k = 0; k < count; k++) {
      const swatch = html(doc, "span", "fft-horizon-swatch");
      swatch.style.background = shade(sign, k, count);
      ramp.append(swatch);
    }
    key.append(html(doc, "span", "fft-horizon-key-text", text), ramp);
  }
  key.append(html(doc, "span", "fft-horizon-key-text", `Each shade ${tickFormatter(ctx, series[0], [step])(step)}`));
  wrap.append(key);

  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Horizon chart of ${names.join(", ")} by ${ctx.label(x)}`);

  series.forEach((field, s) => {
    const top = s * (LANE + GAP);
    const bottom = top + LANE;
    const group = svg(doc, "g", { class: "fft-horizon-row", "data-series": field, style: `--fft-i: ${s}` });
    group.append(svg(doc, "rect", { class: "fft-horizon-track", x: plot.x, y: top, width: plot.w, height: LANE, rx: 2 }));
    // Distances from the baseline, with a point added wherever the series crosses it.
    const points: { x: number; d: number }[] = [];
    rows.forEach((_, i) => {
      const v = values[s]?.[i];
      if (v === null || v === undefined) return;
      const d = v - base;
      const at = slots[i]?.center ?? 0;
      const previous = points.at(-1);
      if (previous && previous.d * d < 0) {
        const t = previous.d / (previous.d - d);
        points.push({ x: previous.x + t * (at - previous.x), d: 0 });
      }
      points.push({ x: at, d });
    });
    for (const sign of ["up", "down"] as const) {
      for (let k = 0; k < count; k++) {
        const portion = points.map((p) => Math.min(step, Math.max(0, (sign === "up" ? p.d : -p.d) - k * step)));
        if (!portion.some((v) => v > 0)) continue;
        // Only the stretches where this band holds something, each closed at the zero points either side. Above the
        // baseline rises from the row's foot and below hangs from its top, so the side reads without color (WCAG 1.4.1).
        const edge = sign === "up" ? bottom : top;
        const reach = sign === "up" ? -LANE : LANE;
        const shape = points.map((p, i) =>
          (portion[i] ?? 0) > 0 || (portion[i - 1] ?? 0) > 0 || (portion[i + 1] ?? 0) > 0 ? { x: p.x, y: edge + ((portion[i] ?? 0) / step) * reach } : null,
        );
        const band = svg(doc, "path", { class: "fft-horizon-band", d: areaPath(shape, edge), "data-series": field, "data-sign": sign, "data-band": k });
        band.style.setProperty("fill", shade(sign, k, count));
        group.append(band);
      }
    }
    const label = svg(doc, "text", { class: "fft-horizon-label", x: column.end, y: top + LANE / 2, "text-anchor": "end", "dominant-baseline": "middle" });
    writeLabel(label, column.shown[s] ?? field, names[s] ?? field);
    group.append(label);
    chart.append(group);
  });

  // Period labels under the rows, thinned, the first and last always named.
  const xLabels = rows.map((row) => ctx.format(row[x], x));
  const anchorOf = (i: number) => (rows.length < 2 ? "middle" : i === 0 ? "start" : i === rows.length - 1 ? "end" : "middle");
  const widest = Math.max(...xLabels.map((text) => textWidth(text))) + 8;
  // An even rhythm: every gap the same but the closing one.
  const box = (i: number): LabelBox => ({ x: slots[i]?.center ?? 0, width: textWidth(xLabels[i] ?? ""), anchor: anchorOf(i) });
  for (const i of evenLabels(rows.length, Math.ceil((rows.length * widest) / plot.w), box)) {
    const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: slots[i]?.center ?? 0, y: rowsHeight + 18, "text-anchor": anchorOf(i) });
    text.textContent = xLabels[i] ?? "";
    chart.append(text);
  }

  // Pointing at a period: a hairline down every row, and the values of every series there.
  const crosshair = svg(doc, "line", { class: "fft-crosshair", y1: 0, y2: rowsHeight, x1: 0, x2: 0, hidden: "" });
  chart.append(crosshair);
  const overlay = svg(doc, "g");
  // The active period is a hairline down every row, not one row lit: an active group that moves the crosshair.
  const period: ActiveGroup = {
    on(node) {
      wrap.setAttribute("data-active", "");
      const center = (node as SVGElement).dataset.center ?? "0";
      crosshair.setAttribute("x1", center);
      crosshair.setAttribute("x2", center);
      crosshair.removeAttribute("hidden");
    },
    off() {
      wrap.removeAttribute("data-active");
      crosshair.setAttribute("hidden", "");
      ctx.tooltip.hide();
    },
  };
  const hits: Element[] = [];
  slots.forEach((slot, i) => {
    const row = rows[i] ?? {};
    const items: TooltipItem[] = series.map((field, s) => {
      const v = values[s]?.[i];
      // Against a named baseline, how far from it and which side: "€6.5K above plan", "On plan".
      const away = v === null || v === undefined ? undefined : v === base ? `On ${named}` : `${ctx.format(Math.abs(v - base), field)} ${v > base ? "above" : "below"} ${named}`;
      return { label: names[s] ?? field, value: named && away ? away : ctx.format(row[field], field), ...(v === null || v === undefined || v === base ? {} : { color: `var(--fft-${v > base ? "up" : "down"})` }) };
    });
    const hit = svg(doc, "rect", { class: "fft-horizon-hit", x: slot.start, y: 0, width: slot.width, height: rowsHeight, "data-center": slot.center });
    hits.push(rowHit(ctx, { node: hit, row, name: xLabels[i] ?? "", items, group: period }));
    overlay.append(hit);
  });
  chart.append(overlay);
  roving(hits);
  wrap.append(chart);
  wrap.append(hiddenTableOf(ctx, rows, [x, ...series]));
  ctx.el.append(wrap);
};
