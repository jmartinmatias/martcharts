import { normalizeId, SEQUENTIAL_STEPS, sequentialStep } from "../../core/geo.ts";
import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { ChoroplethView } from "../../core/views.ts";
import { buildTable, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";
import { dotLegend, groupName, labelFits, mapFrame, unplacedNote, withGeo } from "./map-shared.ts";

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
      ctx.el.append(html(doc, "p", "fft-map-note", "No map geometry to draw."));
      return;
    }
    const { width, height, projection } = mapFrame(ctx, collection, key);
    const byCode = new Map<string, Row>();
    for (const row of ctx.rows) byCode.set(normalizeId(row[id]), row);
    const amounts = value ? ctx.rows.map((row) => readNumber(row[value])).filter((n): n is number => n !== null) : [];
    const min = typeof ctx.view.min === "number" ? ctx.view.min : Math.min(...amounts);
    const max = typeof ctx.view.max === "number" ? ctx.view.max : Math.max(...amounts);
    // Categories keep the order of first appearance, so the key and the regions agree.
    const groups: string[] = [];
    const groupOf = (row: Row): number => {
      if (!category) return -1;
      const name = groupName(row[category], (v) => ctx.format(v, category));
      if (!groups.includes(name)) groups.push(name);
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
      const group = row && category ? groupOf(row) : -1;
      const region = svg(doc, "path", { class: "fft-map-region", d: shape.path, style: `--fft-i: ${i}` });
      const step = amount === null ? 0 : sequentialStep(amount, min, max);
      if (!row || (value && amount === null) || (category && group < 0)) {
        region.classList.add("fft-map-region-empty");
        empty = true;
        region.setAttribute("aria-hidden", "true");
      } else {
        if (value) region.dataset.step = String(step);
        else {
          region.classList.add("fft-map-region-group");
          region.style.setProperty("fill", ctx.color(group));
        }
        region.setAttribute("tabindex", "0");
        region.setAttribute("role", "img");
        const text = value ? ctx.format(row[value], value) : (groups[group] as string);
        region.setAttribute("aria-label", `${shape.name}: ${text}`);
        const activate = () => {
          wrap.setAttribute("data-active", "");
          for (const other of marks) other.removeAttribute("data-active");
          region.setAttribute("data-active", "");
          ctx.tooltip.show(region, shape.name, [{ label: ctx.label(field), value: text, ...(category ? { color: ctx.color(group) } : {}) }]);
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
          if (step) label.dataset.step = String(step);
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
    const legend = category ? dotLegend(doc, groups.map((name, i) => ({ name, color: ctx.color(i) }))) : html(doc, "div", "fft-heat-legend fft-map-legend");
    legend.classList.add("fft-map-legend");
    if (value) {
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
      none.append(swatch, "No data");
      if (category) {
        const item = html(doc, "li");
        item.append(none);
        legend.append(item);
      } else legend.append(none);
    }

    const hidden = html(doc, "div", "fft-sr-only");
    hidden.append(buildTable(ctx, ctx.rows, [id, field], false));
    wrap.append(canvas, legend);
    const note = unplacedNote(doc, unplaced);
    if (note) wrap.append(note);
    wrap.append(hidden);
    ctx.el.append(wrap);
  });
