import type { Position } from "../../core/geo.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { LocatorView } from "../../core/views.ts";
import { hiddenTableOf, html, selectable, svg, textWidth } from "./shared.ts";
import { categoryColor, wordsFor } from "./words.ts";
import { roving } from "./focus.ts";
import { dotLegend, groupName, mapCanvas, mapFrame, placeRows, unplacedNote, withGeo, regionLabel } from "./map-shared.ts";

const MARKER = 5;
const LINE = 13;
const NOTE_LINE = 12;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/**
 * Candidate boxes for a label beside its marker, best first: right, left, above
 * and below, then the four corners, each clear of the marker by a few pixels.
 */
function candidates(at: Position, w: number, h: number): { box: Box; anchor: "start" | "end" | "middle"; x: number; y: number }[] {
  const [mx, my] = at;
  const gap = MARKER + 4;
  return [
    { box: { x: mx + gap, y: my - h / 2, w, h }, anchor: "start", x: mx + gap, y: my - h / 2 },
    { box: { x: mx - gap - w, y: my - h / 2, w, h }, anchor: "end", x: mx - gap, y: my - h / 2 },
    { box: { x: mx - w / 2, y: my - gap - h, w, h }, anchor: "middle", x: mx, y: my - gap - h },
    { box: { x: mx - w / 2, y: my + gap, w, h }, anchor: "middle", x: mx, y: my + gap },
    { box: { x: mx + gap - 2, y: my - gap - h + 2, w, h }, anchor: "start", x: mx + gap - 2, y: my - gap - h + 2 },
    { box: { x: mx - gap - w + 2, y: my - gap - h + 2, w, h }, anchor: "end", x: mx - gap + 2, y: my - gap - h + 2 },
    { box: { x: mx + gap - 2, y: my + gap - 2, w, h }, anchor: "start", x: mx + gap - 2, y: my + gap - 2 },
    { box: { x: mx - gap - w + 2, y: my + gap - 2, w, h }, anchor: "end", x: mx - gap + 2, y: my + gap - 2 },
  ];
}

/**
 * Draws the `locator` view: the land muted underneath, a marker on each place
 * and its name beside it, always on, with an optional second line. Labels are
 * placed greedily (right, left, above, below, then the corners) clear of every
 * marker, every placed label and the edges, and a name that fits nowhere is
 * left to the tooltip. A kind field colors the markers with a key. Every
 * marker is a keyboard stop, and a table behind the map lists the places.
 */
export const renderLocator: ViewRenderer<LocatorView> = (ctx) =>
  withGeo(ctx, ctx.view.geo, (collection) => {
    const doc = ctx.el.ownerDocument;
    const { label, note, color: kind } = ctx.view;
    const key = ctx.view.key ?? "id";
    const frame = collection ? mapFrame(ctx, collection, key) : undefined;
    if (!frame) {
      ctx.el.append(html(doc, "p", "fft-map-note", wordsFor(ctx).noGeometry));
      return;
    }
    const { width, height, projection } = frame;
    const { placed, unplaced } = placeRows(ctx.rows, ctx.view, projection, (row) => ctx.format(row[label], label));
    const kinds: string[] = [];
    const kindKeys: unknown[] = [];
    const kindOf = (row: Record<string, unknown>) => {
      if (!kind) return 0;
      const text = groupName(row[kind], (v) => ctx.format(v, kind), wordsFor(ctx));
      if (!kinds.includes(text)) {
        kinds.push(text);
        kindKeys.push(row[kind]);
      }
      return kinds.indexOf(text);
    };
    // A kind keeps its color wherever it appears.
    const kindColor = (i: number) => categoryColor(ctx, kind ? kindKeys[i] : undefined, i);

    const wrap = html(doc, "div", "fft-chart fft-map-wrap");
    const canvas = mapCanvas(doc, width, height, wordsFor(ctx).aria.locator(ctx.label(label)), collection, projection.shapes, new Set(placed.flatMap((p) => (p.shape ? [p.shape.id] : []))));
    const markers = svg(doc, "g", { class: "fft-map-markers" });
    const labels = svg(doc, "g", { class: "fft-map-place-labels" });
    labels.setAttribute("aria-hidden", "true");
    // Every marker is an obstacle for every label; placed labels are obstacles for the next ones.
    const taken: Box[] = placed.map((p) => ({ x: p.x - MARKER - 2, y: p.y - MARKER - 2, w: (MARKER + 2) * 2, h: (MARKER + 2) * 2 }));
    const inside = (box: Box) => box.x >= 0 && box.y >= 0 && box.x + box.w <= width && box.y + box.h <= height;
    const marks: SVGCircleElement[] = [];
    const deactivate = () => {
      wrap.removeAttribute("data-active");
      for (const mark of marks) mark.removeAttribute("data-active");
      ctx.tooltip.hide();
    };
    placed.forEach((p, i) => {
      const group = kindOf(p.row);
      const noteText = note ? ctx.format(p.row[note], note) : "";
      const w = Math.max(textWidth(p.name, 11, 600), textWidth(noteText, 10)) + 2;
      const h = LINE + (noteText ? NOTE_LINE : 0);
      const spot = candidates([p.x, p.y], w, h).find((c) => inside(c.box) && !taken.some((t) => overlaps(t, c.box)));
      if (spot) {
        taken.push(spot.box);
        const text = svg(doc, "text", { class: "fft-map-place", x: spot.x, y: spot.y + LINE - 3, "text-anchor": spot.anchor });
        const name = svg(doc, "tspan", { class: "fft-map-place-name" });
        name.textContent = p.name;
        text.append(name);
        if (noteText) {
          const second = svg(doc, "tspan", { class: "fft-map-place-note", x: spot.x, dy: NOTE_LINE });
          second.textContent = noteText;
          text.append(second);
        }
        labels.append(text);
      }
      const marker = svg(doc, "circle", { class: "fft-map-marker", cx: p.x, cy: p.y, r: MARKER, tabindex: 0, role: "img", style: `--fft-i: ${i}` });
      marker.style.setProperty("fill", kindColor(group));
      const items: TooltipItem[] = [];
      if (noteText) items.push({ label: ctx.label(note as string), value: noteText });
      if (kind) items.push({ label: ctx.label(kind), value: kinds[group] as string, color: kindColor(group) });
      if (p.shape && regionLabel(ctx, p.shape) !== p.name) items.push({ label: wordsFor(ctx).region, value: regionLabel(ctx, p.shape) });
      marker.setAttribute("aria-label", items.length ? `${p.name}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}` : p.name);
      const activate = () => {
        wrap.setAttribute("data-active", "");
        for (const other of marks) other.removeAttribute("data-active");
        marker.setAttribute("data-active", "");
        ctx.tooltip.show(marker, p.name, items);
      };
      marker.addEventListener("pointerenter", activate);
      marker.addEventListener("focus", activate);
      marker.addEventListener("pointerleave", deactivate);
      marker.addEventListener("blur", deactivate);
      selectable(marker, () => ctx.select(p.row));
      marks.push(marker);
      markers.append(marker);
    });
    canvas.append(labels, markers);
    roving(marks);

    wrap.append(canvas);
    const kindKey = kind && kinds.length > 1 ? dotLegend(ctx, kinds.map((text, i) => ({ name: text, color: kindColor(i) }))) : undefined;
    if (kindKey) wrap.append(kindKey);
    const unplacedText = unplacedNote(doc, unplaced, wordsFor(ctx));
    if (unplacedText) wrap.append(unplacedText);
    const columns = [label, note ?? "", kind ?? "", ctx.view.id ?? ""].filter((c, i, all) => c && all.indexOf(c) === i);
    wrap.append(hiddenTableOf(ctx, ctx.rows, columns));
    ctx.el.append(wrap);
  });
