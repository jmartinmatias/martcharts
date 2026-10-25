import { readNumber } from "../../core/formats.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { SymbolsView } from "../../core/views.ts";
import { evenFormat, hiddenTableOf, html, selectable, svg, textWidth } from "./shared.ts";
import { categoryColor, emphasis, wordsFor } from "./words.ts";
import { roving } from "./focus.ts";
import { dotLegend, groupName, mapCanvas, mapFrame, placeRows, unplacedNote, withGeo, regionLabel } from "./map-shared.ts";

/** Radius of the biggest circle: a Fibonacci step, smaller on a narrow card. */
const MAX_RADIUS = 34;

/**
 * Draws the `symbols` view: the land muted underneath, and one circle per row
 * on its region or at its coordinates, its area true to the size field (radius
 * by square root). The biggest draw first so the small ones stay on top; a
 * color field groups them with a key, and a size key under the map shows the
 * biggest circle and a quarter of it with their values. Every circle is a
 * keyboard stop with a tooltip, and a table behind the map lists the rows.
 */
export const renderSymbols: ViewRenderer<SymbolsView> = (ctx) =>
  withGeo(ctx, ctx.view.geo, (collection) => {
    const doc = ctx.el.ownerDocument;
    const { size, label, color } = ctx.view;
    const key = ctx.view.key ?? "id";
    const frame = collection ? mapFrame(ctx, collection, key) : undefined;
    if (!frame) {
      ctx.el.append(html(doc, "p", "fft-map-note", wordsFor(ctx).noGeometry));
      return;
    }
    const { width, height, projection } = frame;
    const name = (row: Record<string, unknown>) => (label ? ctx.format(row[label], label) : "");
    const { placed, unplaced } = placeRows(ctx.rows, ctx.view, projection, name);
    const sized = placed
      .map((p) => ({ ...p, amount: readNumber(p.row[size]) ?? 0 }))
      .filter((p) => p.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    // Small multiples pass one extent, so a circle of one size means one amount in every panel.
    const largest = Math.max(sized[0]?.amount ?? 0, ...(ctx.extent ?? []).filter((n) => n > 0)) || 1;
    // On a tile grid the biggest circle covers about a tile; on real shapes, a share of the map's short side.
    const maxRadius = Math.max(8, Math.min(MAX_RADIUS, collection?.grid ? projection.scale * 0.62 : Math.min(width, height) / 8));
    const radius = (amount: number) => Math.max(3, Math.sqrt(amount / largest) * maxRadius);
    const groups: string[] = [];
    const groupKeys: unknown[] = [];
    const groupOf = (row: Record<string, unknown>) => {
      if (!color) return 0;
      const text = groupName(row[color], (v) => ctx.format(v, color), wordsFor(ctx));
      if (!groups.includes(text)) {
        groups.push(text);
        groupKeys.push(row[color]);
      }
      return groups.indexOf(text);
    };
    // A group keeps its color wherever it appears; highlight keeps the named places (by name, code or group) in color.
    const lit = emphasis(ctx);
    const groupColor = (i: number) => categoryColor(ctx, color ? groupKeys[i] : undefined, i);
    const placeLit = (row: Record<string, unknown>) =>
      !lit.any || (label !== undefined && lit.lit(row[label])) || (ctx.view.id !== undefined && lit.lit(row[ctx.view.id])) || (color !== undefined && lit.lit(row[color]));
    // The field's own format, in one precision across the key and the tooltips; plain numbers otherwise.
    const amountText = evenFormat(ctx, size, sized.map((p) => p.amount));

    const wrap = html(doc, "div", "fft-chart fft-map-wrap");
    const canvas = mapCanvas(doc, width, height, wordsFor(ctx).aria.symbols(ctx.label(size), label ? ctx.label(label) : undefined), collection, projection.shapes);
    const layer = svg(doc, "g", { class: "fft-map-symbols" });
    const marks: SVGCircleElement[] = [];
    const deactivate = () => {
      wrap.removeAttribute("data-active");
      for (const mark of marks) mark.removeAttribute("data-active");
      ctx.tooltip.hide();
    };
    sized.forEach((p, i) => {
      const group = groupOf(p.row);
      const r = radius(p.amount);
      const circle = svg(doc, "circle", { class: "fft-map-symbol", cx: p.x, cy: p.y, r, tabindex: 0, role: "img", style: `--fft-i: ${i}` });
      const paint = placeLit(p.row) ? groupColor(group) : lit.paint(undefined, "");
      circle.style.setProperty("fill", paint);
      circle.style.setProperty("stroke", paint);
      const title = p.name || p.shape?.name || "";
      const items: TooltipItem[] = [{ label: ctx.label(size), value: amountText(p.amount), color: paint }];
      if (color) items.push({ label: ctx.label(color), value: groups[group] as string });
      if (p.shape && p.name && p.name !== regionLabel(ctx, p.shape)) items.push({ label: wordsFor(ctx).region, value: regionLabel(ctx, p.shape) });
      circle.setAttribute("aria-label", `${title}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
      const activate = () => {
        wrap.setAttribute("data-active", "");
        for (const other of marks) other.removeAttribute("data-active");
        circle.setAttribute("data-active", "");
        ctx.tooltip.show(circle, title, items);
      };
      circle.addEventListener("pointerenter", activate);
      circle.addEventListener("focus", activate);
      circle.addEventListener("pointerleave", deactivate);
      circle.addEventListener("blur", deactivate);
      selectable(circle, () => ctx.select(p.row));
      marks.push(circle);
      layer.append(circle);
    });
    canvas.append(layer);
    roving(marks);

    const keys = html(doc, "div", "fft-map-keys");
    const groupKey = color && groups.length > 1 ? dotLegend(ctx, groups.map((text, i) => ({ name: text, color: groupColor(i) }))) : undefined;
    if (groupKey) keys.append(groupKey);
    // The size key: the biggest circle and one a quarter of its area, bottom-aligned, each with its value.
    if (sized.length) {
      const big = radius(largest);
      const small = radius(largest / 4);
      const textRoom = Math.max(textWidth(amountText(largest)), textWidth(amountText(largest / 4))) + 13;
      const keyWidth = big * 2 + textRoom + 8;
      const keyHeight = big * 2 + 4;
      const sizeKey = svg(doc, "svg", { class: "fft-map-sizekey", width: keyWidth, height: keyHeight, viewBox: `0 0 ${keyWidth} ${keyHeight}` });
      sizeKey.setAttribute("role", "img");
      sizeKey.setAttribute("aria-label", wordsFor(ctx).circleSize(ctx.label(size), amountText(largest)));
      const cx = big + 2;
      const bottom = keyHeight - 2;
      for (const [r, amount] of [
        [big, largest],
        [small, largest / 4],
      ] as const) {
        const cy = bottom - r;
        sizeKey.append(svg(doc, "circle", { class: "fft-map-sizekey-ring", cx, cy, r }));
        const top = cy - r;
        sizeKey.append(svg(doc, "line", { class: "fft-map-sizekey-line", x1: cx, x2: cx + big + 6, y1: top, y2: top }));
        const text = svg(doc, "text", { class: "fft-map-sizekey-text", x: cx + big + 9, y: top, "dominant-baseline": "central" });
        text.textContent = amountText(amount);
        sizeKey.append(text);
      }
      const sizeItem = html(doc, "div", "fft-map-sizekey-wrap");
      sizeItem.append(sizeKey, html(doc, "span", "fft-map-sizekey-caption", ctx.label(size)));
      keys.append(sizeItem);
    }

    const columns = [ctx.view.id ?? label ?? "", label && label !== ctx.view.id ? label : "", size, color ?? ""].filter((c, i, all) => c && all.indexOf(c) === i);
    const hidden = hiddenTableOf(ctx, ctx.rows, columns);
    wrap.append(canvas, keys);
    const note = unplacedNote(doc, unplaced, wordsFor(ctx));
    if (note) wrap.append(note);
    wrap.append(hidden);
    ctx.el.append(wrap);
  });
