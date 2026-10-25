import { formatValue } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { SunburstView } from "../../core/views.ts";
import { countable } from "../count-up.ts";
import { sectorPath } from "../layout.ts";
import { fieldList, figureSize, hiddenTableOf, html, selectable, shareFormat, svg } from "./shared.ts";
import { categoryColor, emphasis, WORDS } from "./words.ts";
import { roving } from "./focus.ts";

const FULL = Math.PI * 2;
/** Tint per ring: the top level at full color, each level below lighter. */
const DEPTH_OPACITY = [1, 0.62, 0.38];
const round2 = (n: number) => Math.round(n * 100) / 100;

interface Node {
  name: string;
  path: string[];
  /** The raw values along the path, for highlight to match. */
  keys: string[];
  value: number;
  children: Map<string, Node>;
  row: Row;
  color: number;
  start: number;
  end: number;
}

/**
 * Draws the `sunburst` view: the inner ring splits the total by the first
 * level, and each ring outward splits its parent's slice by the next level, in
 * lighter tints of the top-level color so the family reads at a glance. Sized
 * like the donut (144px, or 233px when there is room), with the total in the
 * middle and a legend of the top level.
 */
export const renderSunburst: ViewRenderer<SunburstView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const levels = fieldList(ctx.view.levels).slice(0, 3);
  const { value } = ctx.view;
  const root: Node = { name: "", path: [], keys: [], value: 0, children: new Map(), row: {}, color: 0, start: 0, end: FULL };
  for (const row of ctx.rows) {
    const amount = readNumber(row[value]);
    if (amount === null || amount <= 0) continue;
    root.value += amount;
    let node = root;
    levels.forEach((field, depth) => {
      const key = String(row[field]);
      let child = node.children.get(key);
      if (!child) {
        const name = ctx.format(row[field], field);
        child = { name, path: [...node.path, name], keys: [...node.keys, key], value: 0, children: new Map(), row, color: depth === 0 ? node.children.size : node.color, start: 0, end: 0 };
        node.children.set(key, child);
      }
      child.value += amount;
      node = child;
    });
  }
  // Angles: each child takes its share of its parent's slice, in data order.
  const place = (node: Node) => {
    let angle = node.start;
    for (const child of node.children.values()) {
      child.start = angle;
      child.end = angle + ((node.end - node.start) * child.value) / (node.value || 1);
      angle = child.end;
      place(child);
    }
  };
  place(root);

  const hasFormat = ctx.spec.fields?.[value]?.format !== undefined;
  const amountText = (n: number) => (hasFormat ? ctx.format(n, value) : formatValue(n, { type: "number", compact: true }, ctx.spec.locale));
  const share = shareFormat(ctx.spec.locale);
  // A top-level slice keeps its color wherever it appears; highlight names any level, and the families not named step back.
  const lit = emphasis(ctx);
  const familyColor = (node: Node) => {
    const own = categoryColor(ctx, node.keys[0], node.color);
    return lit.any && !node.keys.some((key) => lit.lit(key)) ? lit.paint(undefined, own) : own;
  };
  const size = figureSize(ctx.width);
  const c = size / 2;
  // A wide hole: the total and its caption sit inside it, clear of the rings.
  const hole = Math.round(size * 0.3);
  const ring = (c - 2 - hole) / Math.max(1, levels.length);

  const wrap = html(doc, "div", "fft-donut fft-sun");
  const figure = html(doc, "div", "fft-donut-figure");
  figure.style.width = `${size}px`;
  figure.style.height = `${size}px`;
  const chart = svg(doc, "svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Sunburst of ${ctx.label(value)} by ${levels.map((field) => ctx.label(field)).join(", then ")}`);

  const segments: SVGPathElement[] = [];
  const hits: Element[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const seg of segments) seg.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  let order = 0;
  const draw = (node: Node, depth: number, parent: Node | undefined) => {
    for (const child of node.children.values()) {
      const d = sectorPath(c, c, hole + depth * ring, hole + (depth + 1) * ring, child.start, child.end);
      const path = child.path.join(", ");
      const seg = svg(doc, "path", { class: "fft-sun-seg", d, "data-depth": depth, "data-path": path, "data-start": round2(child.start), "data-end": round2(child.end), "data-share": round2(child.value / root.value), style: `--fft-i: ${order++}` });
      seg.style.fill = familyColor(child);
      seg.style.fillOpacity = String(DEPTH_OPACITY[depth] ?? 0.38);
      chart.append(seg);
      segments.push(seg);
      const items: TooltipItem[] = [
        { label: ctx.label(value), value: amountText(child.value), color: familyColor(child) },
        { label: `${WORDS.share} ${WORDS.of} ${WORDS.total.toLowerCase()}`, value: share.format(child.value / root.value) },
        ...(parent ? [{ label: `${WORDS.share} ${WORDS.of} ${parent.name}`, value: share.format(child.value / parent.value) }] : []),
      ];
      const hit = svg(doc, "path", { class: "fft-sun-hit", d, "data-path": path, tabindex: 0, role: "img" });
      hit.setAttribute("aria-label", `${path}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
      const activate = () => {
        wrap.setAttribute("data-active", "");
        // The slice, its ancestors and its descendants stay lit: the family of what is pointed at.
        for (const other of segments) {
          const p = other.dataset.path ?? "";
          other.toggleAttribute("data-active", p === path || p.startsWith(`${path}, `) || path.startsWith(`${p}, `));
        }
        ctx.tooltip.show(hit, path, items);
      };
      hit.addEventListener("pointerenter", activate);
      hit.addEventListener("focus", activate);
      hit.addEventListener("pointerleave", deactivate);
      hit.addEventListener("blur", deactivate);
      const row = child.row;
      selectable(hit, () => ctx.select(row));
      hits.push(hit);
      draw(child, depth + 1, child);
    }
  };
  draw(root, 0, undefined);
  const overlay = svg(doc, "g");
  overlay.append(...hits);
  chart.append(overlay);

  const center = html(doc, "div", "fft-donut-center");
  const total = html(doc, "div", "fft-donut-total fft-sun-total", amountText(root.value));
  countable(total, root.value, amountText);
  center.append(total, html(doc, "div", "fft-donut-caption", ctx.view.caption ?? ctx.label(value)));
  figure.append(chart, center);

  const legend = html(doc, "ul", "fft-donut-legend");
  for (const top of root.children.values()) {
    const swatch = html(doc, "span", "fft-swatch");
    swatch.style.background = familyColor(top);
    swatch.setAttribute("aria-hidden", "true");
    const item = html(doc, "li");
    item.append(swatch, html(doc, "span", "fft-donut-name", top.name), html(doc, "span", "fft-donut-value", amountText(top.value)), html(doc, "span", "fft-donut-share", share.format(top.value / root.value)));
    legend.append(item);
  }
  roving(hits);
  const hidden = hiddenTableOf(ctx, ctx.rows, [...levels, value]);
  wrap.append(figure, legend, hidden);
  ctx.el.append(wrap);
};
