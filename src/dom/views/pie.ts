import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { PieView } from "../../core/views.ts";
import { dodge, polar } from "../layout.ts";
import { evenFormat, figureSize, hiddenTableOf, html, selectable, shareFormat, svg, textWidth } from "./shared.ts";
import { WORDS } from "./words.ts";
import { roving } from "./focus.ts";
import { slicesOf, sliceColor, sliceLegend } from "./donut.ts";
import type { Slice } from "./donut.ts";

/** Lines of outside labels keep this much air between them. */
const LABEL_GAP = 15;
/** How far out along a slice's middle its inside label sits, as a share of the radius. */
const INSIDE_AT = 0.62;

/** SVG path of a wedge of a disc centered at (cx, cy): out to the rim, along it clockwise, and back to the center. */
function wedgePath(cx: number, cy: number, r: number, start: number, end: number): string {
  if (end - start >= Math.PI * 2 - 1e-6) {
    const a = polar(cx, cy, r, 0);
    const b = polar(cx, cy, r, Math.PI);
    return `M${a.x},${a.y}A${r},${r} 0 1 1 ${b.x},${b.y}A${r},${r} 0 1 1 ${a.x},${a.y}Z`;
  }
  const large = end - start > Math.PI ? 1 : 0;
  const a = polar(cx, cy, r, start);
  const b = polar(cx, cy, r, end);
  return `M${cx},${cy}L${a.x},${a.y}A${r},${r} 0 ${large} 1 ${b.x},${b.y}Z`;
}

/**
 * Draws the `pie` view: a full disc of up to 6 slices from twelve o'clock
 * clockwise, hairline gaps between them, and, by default, each share written
 * on its slice (thin slices skip theirs) with a legend of names, values and
 * shares. `labels: "outside"` names the slices beside the disc on short leader
 * lines instead, and `"legend"` leaves the disc bare. Sizes are Fibonacci steps,
 * as the donut's are, and the same category keeps its color across small multiples.
 */
export const renderPie: ViewRenderer<PieView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label, value } = ctx.view;
  const labels = ctx.view.labels ?? "inside";
  const slices = slicesOf(ctx.rows, value);
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  const share = shareFormat(ctx.spec.locale);
  const amountText = evenFormat(ctx, value, slices.map((slice) => slice.amount), { type: "number", compact: true });
  const color = (i: number) => sliceColor(ctx, label, slices[i] as Slice, i);
  const names = slices.map((slice) => ctx.format(slice.row[label], label));
  const shares = slices.map((slice) => share.format(slice.amount / total));

  const size = figureSize(ctx.width);
  const r = size / 2 - 1;
  const c = size / 2;
  // Outside labels need room beside the disc: the longest name and share, plus a leader and air.
  const outside = labels === "outside";
  const room = outside ? Math.max(...names.map((name, i) => textWidth(`${name} ${shares[i] as string}`))) + 21 : 0;
  const width = size + room * 2;

  const wrap = html(doc, "div", "fft-donut fft-pie");
  const figure = html(doc, "div", "fft-donut-figure fft-pie-figure");
  figure.style.width = `${width}px`;
  figure.style.height = `${size}px`;
  const disc = svg(doc, "svg", { width, height: size, viewBox: `${-room} 0 ${width} ${size}` });
  disc.setAttribute("role", "group");
  disc.setAttribute("aria-label", `Pie chart of ${ctx.label(value)} by ${ctx.label(label)}`);

  const marks: SVGPathElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const mark of marks) mark.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  const mids: number[] = [];
  let angle = 0;
  slices.forEach((slice, i) => {
    const span = (slice.amount / total) * Math.PI * 2;
    const mid = angle + span / 2;
    mids.push(mid);
    const d = wedgePath(c, c, r, angle, angle + span);
    angle += span;
    const mark = svg(doc, "path", { class: "fft-pie-slice", d, tabindex: 0, role: "img", style: `--fft-i: ${i}` });
    mark.style.setProperty("fill", color(i));
    const name = names[i] as string;
    const items: TooltipItem[] = [
      { label: ctx.label(value), value: amountText(slice.amount), color: color(i) },
      { label: WORDS.share, value: shares[i] as string },
    ];
    mark.setAttribute("aria-label", `${name}: ${items[0]?.value}, ${items[1]?.value}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const other of marks) other.removeAttribute("data-active");
      mark.setAttribute("data-active", "");
      ctx.tooltip.show(mark, name, items);
    };
    mark.addEventListener("pointerenter", activate);
    mark.addEventListener("focus", activate);
    mark.addEventListener("pointerleave", deactivate);
    mark.addEventListener("blur", deactivate);
    selectable(mark, () => ctx.select(slice.row));
    marks.push(mark);
    disc.append(mark);
  });

  if (labels === "inside") {
    // A share goes on its slice only where the slice is wide enough to hold it at the label's radius.
    slices.forEach((slice, i) => {
      const span = (slice.amount / total) * Math.PI * 2;
      const text = shares[i] as string;
      if (span * r * INSIDE_AT < textWidth(text, 10, 600) + 8 || span < 0.3) return;
      const at = polar(c, c, r * INSIDE_AT, mids[i] as number);
      const node = svg(doc, "text", { class: "fft-pie-label", x: at.x, y: at.y, "text-anchor": "middle", "dominant-baseline": "central", style: `--fft-i: ${i}` });
      node.textContent = text;
      node.setAttribute("aria-hidden", "true");
      disc.append(node);
    });
  }

  if (outside) {
    // Names sit beside the disc at their slice's angle, pushed apart on each side so none overlap, on short leader lines.
    const right = slices.map((_, i) => Math.sin(mids[i] as number) >= 0);
    const wanted = slices.map((_, i) => polar(c, c, r + 13, mids[i] as number).y);
    const placed = [...wanted];
    for (const side of [true, false]) {
      const index = slices.map((_, i) => i).filter((i) => right[i] === side);
      const ys = dodge(index.map((i) => wanted[i] as number), LABEL_GAP, 6, size - 6);
      index.forEach((i, k) => (placed[i] = ys[k] as number));
    }
    slices.forEach((_, i) => {
      const from = polar(c, c, r + 2, mids[i] as number);
      const bend = polar(c, c, r + 10, mids[i] as number);
      const y = placed[i] as number;
      const x = right[i] ? c + r + 18 : c - r - 18;
      disc.append(svg(doc, "path", { class: "fft-pie-leader", d: `M${from.x},${from.y}L${bend.x},${y}L${x - (right[i] ? 3 : -3)},${y}`, style: `--fft-i: ${i}` }));
      const text = svg(doc, "text", { class: "fft-pie-name", x, y, "text-anchor": right[i] ? "start" : "end", "dominant-baseline": "central", style: `--fft-i: ${i}` });
      text.textContent = names[i] as string;
      const pct = svg(doc, "tspan", { class: "fft-pie-name-share" });
      pct.textContent = ` ${shares[i]}`;
      text.append(pct);
      text.setAttribute("aria-hidden", "true");
      disc.append(text);
    });
  }

  figure.append(disc);
  const hidden = hiddenTableOf(ctx, slices.map((slice) => slice.row), [label, value]);
  roving(marks);
  // Outside labels already name every slice; inside small multiples the widget draws one legend for every panel.
  const legend = outside || ctx.inFacet ? [] : [sliceLegend(ctx, label, slices, total, color, amountText, share)];
  wrap.append(figure, ...legend, hidden);
  ctx.el.append(wrap);
};
