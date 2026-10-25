import { formatValue } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { IcicleView } from "../../core/views.ts";
import { fieldList, hiddenTableOf, html, selectable, shareFormat, svg, textWidth } from "./shared.ts";
import { categoryColor, emphasis, WORDS } from "./words.ts";
import { roving } from "./focus.ts";

const GAP = 2;
/** Height the typical leaf should get: one line of name and a little air. */
const LEAF_ROOM = 24;
/** Tint per level: the top level strongest, each level below lighter, like the treemap's tiles. */
const DEPTH_TINT = [0.32, 0.22, 0.15, 0.1];

interface Node {
  name: string;
  path: string;
  /** The raw values along the path, for highlight to match. */
  keys: string[];
  depth: number;
  value: number;
  children: Map<string, Node>;
  parent?: Node;
  row: Row;
  color: number;
  /** Top and bottom as shares of the full height. */
  start: number;
  end: number;
}

/** `text` cut to fit `width` pixels with an ellipsis, or empty when not even three characters fit. */
function fit(text: string, width: number): string {
  if (textWidth(text) <= width) return text;
  for (let keep = text.length - 1; keep >= 2; keep--) {
    const cut = `${text.slice(0, keep)}…`;
    if (textWidth(cut) <= width) return cut;
  }
  return "";
}

/**
 * Draws the `icicle` view: a hierarchy laid flat. A narrow column holds the
 * total, then each level gets a column, left to right; every child splits its
 * parent's height by value, so a row through the chart reads as one lineage.
 * Cells are light tints of their family's color with a crisp 3px edge of the
 * full color on the left, names and values in the text colors where they fit.
 * Pointing at a cell lights it and its parents.
 */
export const renderIcicle: ViewRenderer<IcicleView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const levels = fieldList(ctx.view.levels).slice(0, 4);
  const { value } = ctx.view;
  const root: Node = { name: WORDS.total, path: "", keys: [], depth: 0, value: 0, children: new Map(), row: {}, color: 0, start: 0, end: 1 };
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
        child = {
          name,
          path: node.path ? `${node.path}/${name}` : name,
          keys: [...node.keys, key],
          depth: depth + 1,
          value: 0,
          children: new Map(),
          parent: node,
          row,
          color: depth === 0 ? node.children.size : node.color,
          start: 0,
          end: 0,
        };
        node.children.set(key, child);
      }
      child.value += amount;
      node = child;
    });
  }
  // Each child takes its share of its parent's height, in data order.
  const all: Node[] = [];
  const place = (node: Node) => {
    all.push(node);
    let at = node.start;
    for (const child of node.children.values()) {
      child.start = at;
      child.end = at + ((node.end - node.start) * child.value) / (node.value || 1);
      at = child.end;
      place(child);
    }
  };
  place(root);

  const hasFormat = ctx.spec.fields?.[value]?.format !== undefined;
  const amountText = (n: number) => (hasFormat ? ctx.format(n, value) : formatValue(n, { type: "number", compact: true }, ctx.spec.locale));
  const share = shareFormat(ctx.spec.locale);
  // A family keeps its top level's color wherever it appears; highlight names any level, and the families not named step back.
  const lit = emphasis(ctx);
  const familyColor = (node: Node) => {
    const own = categoryColor(ctx, node.keys[0], node.color);
    return lit.any && !node.keys.some((key) => lit.lit(key)) ? lit.paint(undefined, own) : own;
  };

  // Tall enough that the typical leaf gets a line for its name (24px), up to 610px.
  const leaves = all.filter((node) => node.children.size === 0 && node.depth > 0).map((node) => node.value).sort((a, b) => a - b);
  const typical = leaves[Math.floor(leaves.length / 2)] ?? root.value;
  const width = Math.max(ctx.width, 233);
  const height = Math.round(Math.min(610, Math.max(ctx.height, (LEAF_ROOM * root.value) / (typical || 1))));
  // The total's column is narrow; the levels share the rest equally.
  const rootWidth = Math.min(89, Math.max(55, width * 0.16));
  const levelWidth = (width - rootWidth) / Math.max(1, levels.length);
  const columnX = (depth: number) => (depth === 0 ? 0 : rootWidth + (depth - 1) * levelWidth);
  const columnW = (depth: number) => (depth === 0 ? rootWidth : levelWidth);

  const wrap = html(doc, "div", "fft-chart fft-icicle");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Icicle chart of ${ctx.label(value)} by ${levels.map((f) => ctx.label(f)).join(", then ")}`);

  const cells = new Map<Node, { group: SVGGElement; rect: SVGRectElement }>();
  const hits: Element[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const { group, rect } of cells.values()) {
      group.removeAttribute("data-active");
      rect.removeAttribute("data-active");
    }
    ctx.tooltip.hide();
  };
  all.forEach((node, i) => {
    const x = columnX(node.depth);
    const w = columnW(node.depth) - GAP;
    const y = node.start * height;
    const h = (node.end - node.start) * height - GAP;
    if (h < 1) return;
    const group = svg(doc, "g", { class: "fft-ice-cell", style: `--fft-i: ${node.depth}` });
    const rect = svg(doc, "rect", { class: "fft-ice", x, y, width: w, height: h, rx: 2, "data-depth": node.depth, "data-path": node.path });
    if (node.depth === 0) rect.setAttribute("data-root", "");
    else {
      rect.style.setProperty("fill", familyColor(node));
      rect.style.setProperty("fill-opacity", String(DEPTH_TINT[node.depth - 1] ?? 0.1));
    }
    group.append(rect);
    if (node.depth > 0) {
      const edge = svg(doc, "rect", { class: "fft-ice-edge", x, y, width: 3, height: h });
      edge.style.setProperty("fill", familyColor(node));
      group.append(edge);
    }
    // Name, then value under it, each only where it fits.
    const inset = node.depth > 0 ? 11 : 8;
    const name = h >= 21 ? fit(node.name, w - inset - 5) : "";
    if (name) {
      const text = svg(doc, "text", { class: "fft-ice-name", x: x + inset, y: y + (h >= 38 ? 16 : h / 2), "dominant-baseline": "middle" });
      text.textContent = name;
      group.append(text);
      const amount = h >= 38 ? fit(amountText(node.value), w - inset - 5) : "";
      if (amount) {
        const line = svg(doc, "text", { class: "fft-ice-value", x: x + inset, y: y + 31, "dominant-baseline": "middle" });
        line.textContent = amount;
        group.append(line);
      }
    }
    chart.append(group);
    cells.set(node, { group, rect });

    const items: TooltipItem[] = [{ label: ctx.label(value), value: amountText(node.value), ...(node.depth > 0 ? { color: familyColor(node) } : {}) }];
    if (node.parent && node.parent.depth > 0) items.push({ label: `${WORDS.share} ${WORDS.of} ${node.parent.name}`, value: share.format(node.value / (node.parent.value || 1)) });
    if (node.depth > 0) items.push({ label: `${WORDS.share} ${WORDS.of} ${WORDS.total.toLowerCase()}`, value: share.format(node.value / (root.value || 1)) });
    const title = node.depth === 0 ? WORDS.total : node.path.split("/").join(" / ");
    const hit = svg(doc, "rect", { class: "fft-ice-hit", x, y, width: w, height: h, tabindex: 0, role: "img", "data-path": node.path, style: `--fft-i: ${i}` });
    hit.setAttribute("aria-label", `${title}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      const lineage = new Set<Node>();
      for (let at: Node | undefined = node; at; at = at.parent) lineage.add(at);
      for (const [other, cell] of cells) {
        cell.group.toggleAttribute("data-active", lineage.has(other));
        cell.rect.toggleAttribute("data-active", lineage.has(other));
      }
      ctx.tooltip.show(hit, title, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    selectable(hit, () => ctx.select(node.row));
    hits.push(hit);
  });
  const overlay = svg(doc, "g");
  overlay.append(...hits);
  chart.append(overlay);
  roving(hits);
  wrap.append(chart);
  wrap.append(hiddenTableOf(ctx, ctx.rows, [...levels, value]));
  ctx.el.append(wrap);
};
