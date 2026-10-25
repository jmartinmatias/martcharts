import { normalizeId, SEQUENTIAL_STEPS, sequentialStep } from "../../core/geo.ts";
import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import { choroplethChange } from "../../core/views.ts";
import type { ChoroplethView } from "../../core/views.ts";
import { hiddenTableOf, html, selectable, svg } from "./shared.ts";
import { categoryColor, emphasis, WORDS } from "./words.ts";
import { roving } from "./focus.ts";
import { dotLegend, groupName, labelFits, mapFrame, unplacedNote, withGeo } from "./map-shared.ts";

/** Steps of the diverging scale either side of no change: three shades of fall, three of rise. */
const DIVERGING = 3;

/** A change's step on the diverging scale, from −3 (the biggest fall) to +3 (the biggest rise), 0 for none. */
export function divergingStep(change: number, reach: number): number {
  if (change === 0 || reach <= 0) return 0;
  return Math.sign(change) * Math.min(DIVERGING, Math.max(1, Math.ceil((Math.abs(change) / reach) * DIVERGING)));
}

/** The fill of a diverging step: the up color for rises, the down color for falls, deeper the bigger; a quiet grey for none. */
export function divergingFill(step: number): string {
  if (step === 0) return "color-mix(in oklab, var(--fft-muted) 22%, var(--fft-surface))";
  const share = [0, 34, 62, 92][Math.abs(step)] ?? 92;
  return `color-mix(in oklab, var(${step > 0 ? "--fft-up" : "--fft-down"}) ${share}%, var(--fft-surface))`;
}

/**
 * Draws the `choropleth` view: every region of the geometry, shaded on the
 * seven-step sequential scale by its row's value (weakest tint for the lowest,
 * strongest for the highest), grey where no row names it, with a scale under
 * the map from the lowest value to the highest. Tile grids write each region's
 * code inside it; real shapes get their code where it fits. Each shaded
 * region is a keyboard stop with a tooltip, and a table behind the map
 * lists every row for screen readers. With `category` in place of `value`,
 * regions take one series color per category and the scale becomes a key.
 */
export const renderChoropleth: ViewRenderer<ChoroplethView> = (ctx) =>
  withGeo(ctx, ctx.view.geo, (collection) => {
    const doc = ctx.el.ownerDocument;
    const { id, category } = ctx.view;
    // Shaded by a number, or colored by a category: one of the two names the field.
    const value = category ? undefined : ctx.view.value;
    const key = ctx.view.key ?? "id";
    if (!collection) {
      ctx.el.append(html(doc, "p", "fft-map-note", WORDS.noGeometry));
      return;
    }
    const { width, height, projection } = mapFrame(ctx, collection, key);
    // A category keeps its color wherever it appears; highlight keeps the named regions (by code, name or category) in
    // their shade, and the others step back to grey.
    const lit = emphasis(ctx);
    const groupColor = (i: number) => categoryColor(ctx, groupKeys[i], i);
    const groupKeys: unknown[] = [];
    const byCode = new Map<string, Row>();
    for (const row of ctx.rows) byCode.set(normalizeId(row[id]), row);
    const amounts = value ? ctx.rows.map((row) => readNumber(row[value])).filter((n): n is number => n !== null) : [];
    // Small multiples pass one extent for every panel, so each panel shades on the same scale.
    const shared = ctx.extent ?? [];
    const min = typeof ctx.view.min === "number" ? ctx.view.min : Math.min(...amounts, ...shared);
    const max = typeof ctx.view.max === "number" ? ctx.view.max : Math.max(...amounts, ...shared);
    // Against the previous period: each region's change, and, with show "change", a diverging shade of it.
    const previous = value && ctx.view.previous ? ctx.view.previous : undefined;
    const byChange = Boolean(previous) && ctx.view.show === "change";
    const changeOf = (row: Row) => choroplethChange(ctx.view, row);
    const changes = previous ? ctx.rows.map(changeOf).filter((n): n is number => n !== null) : [];
    const reach = Math.max(0, ...changes.map(Math.abs), ...(byChange ? shared.map(Math.abs) : [])) || 1;
    const percentChange = ctx.view.change !== "difference";
    const signed = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
    const changeText = (n: number) => (percentChange ? signed.format(n).replace("-", "−") : `${n > 0 ? "+" : ""}${ctx.format(n, value)}`);
    // Categories keep the order of first appearance, so the key and the regions agree.
    const groups: string[] = [];
    const groupOf = (row: Row): number => {
      if (!category) return -1;
      const name = groupName(row[category], (v) => ctx.format(v, category));
      if (!groups.includes(name)) {
        groups.push(name);
        groupKeys.push(row[category]);
      }
      return groups.indexOf(name);
    };
    for (const row of ctx.rows) groupOf(row);
    const field = (value ?? category) as string;
    const known = new Set(projection.shapes.map((shape) => normalizeId(shape.id)));
    const unplaced = ctx.rows.filter((row) => !known.has(normalizeId(row[id]))).length;

    const wrap = html(doc, "div", "fft-chart fft-map-wrap");
    const canvas = svg(doc, "svg", { class: "fft-map", width, height, viewBox: `0 0 ${width} ${height}` });
    if (collection.grid) canvas.classList.add("fft-map-grid");
    canvas.setAttribute("role", "group");
    canvas.setAttribute("aria-label", `Map of ${ctx.label(field)} by ${ctx.label(id)}`);
    const regions = svg(doc, "g", { class: "fft-map-regions" });
    const labels = svg(doc, "g", { class: "fft-map-labels" });
    labels.setAttribute("aria-hidden", "true");
    const marks: SVGPathElement[] = [];
    let empty = false;
    const deactivate = () => {
      wrap.removeAttribute("data-active");
      for (const mark of marks) mark.removeAttribute("data-active");
      ctx.tooltip.hide();
    };
    projection.shapes.forEach((shape, i) => {
      const row = byCode.get(normalizeId(shape.id));
      const amount = row && value ? readNumber(row[value]) : null;
      const delta = row && previous ? changeOf(row) : null;
      const group = row && category ? groupOf(row) : -1;
      const region = svg(doc, "path", { class: "fft-map-region", d: shape.path, style: `--fft-i: ${i}` });
      const step = byChange || amount === null ? 0 : sequentialStep(amount, min, max);
      const swing = byChange && delta !== null ? divergingStep(delta, reach) : null;
      if (!row || (value && amount === null) || (category && group < 0) || (byChange && swing === null)) {
        region.classList.add("fft-map-region-empty");
        empty = true;
        region.setAttribute("aria-hidden", "true");
      } else {
        const on = !lit.any || lit.lit(row[id]) || lit.lit(shape.id) || lit.lit(shape.name) || (category !== undefined && lit.lit(row[category]));
        if (!on) region.dataset.muted = "";
        if (swing !== null) {
          region.dataset.change = String(swing);
          region.style.setProperty("fill", on ? divergingFill(swing) : lit.paint(undefined, ""));
        } else if (value) region.dataset.step = String(step);
        else {
          region.classList.add("fft-map-region-group");
          region.style.setProperty("fill", on ? groupColor(group) : lit.paint(undefined, ""));
        }
        region.setAttribute("tabindex", "0");
        region.setAttribute("role", "img");
        const text = value ? ctx.format(row[value], value) : (groups[group] as string);
        // Against the previous period: the previous value and the change, in the tooltip and for screen readers.
        const versus = previous
          ? [
              { label: WORDS.previous, value: ctx.format(row[previous], previous) || "–" },
              { label: WORDS.change, value: delta === null ? "–" : delta === 0 ? WORDS.noChange : changeText(delta) },
            ]
          : [];
        region.setAttribute("aria-label", `${shape.name}: ${[text, ...versus.map((line) => `${line.label.toLowerCase()} ${line.value}`)].join(", ")}`);
        const activate = () => {
          wrap.setAttribute("data-active", "");
          for (const other of marks) other.removeAttribute("data-active");
          region.setAttribute("data-active", "");
          ctx.tooltip.show(region, shape.name, [{ label: ctx.label(field), value: text, ...(category ? { color: groupColor(group) } : {}) }, ...versus]);
        };
        region.addEventListener("pointerenter", activate);
        region.addEventListener("focus", activate);
        region.addEventListener("pointerleave", deactivate);
        region.addEventListener("blur", deactivate);
        selectable(region, () => ctx.select(row));
        marks.push(region);
      }
      regions.append(region);
      // The region's code, inside it, where there is room: tiles always have room for two letters.
      if (ctx.view.labels !== false) {
        const code = shape.id || shape.name;
        if (code && labelFits(shape, code)) {
          const label = svg(doc, "text", { class: "fft-map-region-label", x: shape.centroid[0], y: shape.centroid[1], "text-anchor": "middle", "dominant-baseline": "central" });
          if (region.hasAttribute("data-muted")) label.dataset.muted = "";
          // On the diverging shade the code takes the text color, or white on the two strongest steps either side.
          if (swing !== null) label.style.setProperty("fill", Math.abs(swing) >= 2 ? "#fff" : "var(--fft-text)");
          else if (step) label.dataset.step = String(step);
          else if (group >= 0) label.classList.add("fft-map-region-label-group");
          else label.classList.add("fft-map-region-label-empty");
          label.textContent = code;
          labels.append(label);
        }
      }
    });
    canvas.append(regions, labels);
    roving(marks);

    // The scale: seven swatches from the weakest tint to the strongest, the lowest and highest values at its ends;
    // or, by category, a key of dots, one per category in its color.
    const legend = category ? (dotLegend(ctx, groups.map((name, i) => ({ name, color: groupColor(i) }))) ?? html(doc, "ul", "fft-legend")) : html(doc, "div", "fft-heat-legend fft-map-legend");
    legend.classList.add("fft-map-legend");
    if (byChange) {
      // The diverging key: the biggest fall at one end, no change in the middle, the biggest rise at the other.
      const ramp = html(doc, "div", "fft-heat-ramp fft-map-ramp-change");
      ramp.setAttribute("aria-hidden", "true");
      for (let swing = -DIVERGING; swing <= DIVERGING; swing++) {
        const swatch = html(doc, "div");
        swatch.style.background = divergingFill(swing);
        ramp.append(swatch);
      }
      legend.setAttribute("aria-label", WORDS.changeScale(ctx.label(value as string)));
      legend.append(html(doc, "span", "fft-map-legend-min", changeText(-reach)), ramp, html(doc, "span", "fft-map-legend-max", changeText(reach)));
    } else if (value && Number.isFinite(min) && Number.isFinite(max)) {
      // With no numbers at all (a filter left the map empty) there is no scale to show: only the "No data" key.
      const ramp = html(doc, "div", "fft-heat-ramp");
      ramp.setAttribute("aria-hidden", "true");
      for (let step = 1; step <= SEQUENTIAL_STEPS; step++) {
        const swatch = html(doc, "div");
        swatch.dataset.step = String(step);
        ramp.append(swatch);
      }
      legend.append(html(doc, "span", "fft-map-legend-min", ctx.format(min, value)), ramp, html(doc, "span", "fft-map-legend-max", ctx.format(max, value)));
    }
    if (empty) {
      const none = html(doc, "span", "fft-map-legend-empty");
      const swatch = html(doc, "span", "fft-swatch fft-map-swatch-empty");
      swatch.setAttribute("aria-hidden", "true");
      none.append(swatch, WORDS.noData);
      if (category) {
        const item = html(doc, "li");
        item.append(none);
        legend.append(item);
      } else legend.append(none);
    }

    const hidden = hiddenTableOf(ctx, ctx.rows, previous ? [id, field, previous] : [id, field]);
    // Inside a small-multiples panel a category key is drawn once for all panels; the scale stays, since each panel shades on it.
    wrap.append(canvas, ...(category && ctx.inFacet ? [] : [legend]));
    const note = unplacedNote(doc, unplaced);
    if (note) wrap.append(note);
    wrap.append(hidden);
    ctx.el.append(wrap);
  });
