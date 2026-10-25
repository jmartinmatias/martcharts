import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { SankeyView } from "../../core/views.ts";
import { layoutSankey } from "../layout.ts";
import { evenFormat, hiddenTableOf, html, selectable, shareFormat, svg } from "./shared.ts";
import { categoryColor, emphasis, wordsFor } from "./words.ts";
import { roving } from "./focus.ts";

const NODE_WIDTH = 13;

/**
 * Draws the `sankey` view: nodes in columns, ribbons as thick as their flow.
 * Color follows the origin: each first-column node gets a palette color and
 * every flow descending from it keeps that color, while later nodes stay
 * neutral. Names and totals sit beside the nodes, on the inside of the edges.
 */
export const renderSankey: ViewRenderer<SankeyView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { source, target, value } = ctx.view;
  const flows: { row: Row; source: string; target: string; value: number }[] = [];
  for (const row of ctx.rows) {
    const amount = readNumber(row[value]);
    if (amount === null || amount <= 0) continue;
    flows.push({ row, source: String(row[source]), target: String(row[target]), value: amount });
  }
  const width = ctx.width;
  const height = ctx.height;
  const layout = layoutSankey(flows, width, height, { nodeWidth: NODE_WIDTH, gap: 8 });
  const lastColumn = Math.max(0, ...layout.nodes.map((n) => n.column));

  // Color follows the origin: first-column nodes in palette order, then each node inherits from its biggest inflow.
  const origin = new Map<string, number>();
  const rootOf = new Map<string, string>();
  layout.nodes.filter((n) => n.column === 0).forEach((n, i) => {
    origin.set(n.name, i);
    rootOf.set(n.name, n.name);
  });
  for (const node of [...layout.nodes].sort((a, b) => a.column - b.column)) {
    if (origin.has(node.name)) continue;
    const biggest = flows.filter((f) => f.target === node.name).sort((a, b) => b.value - a.value)[0];
    origin.set(node.name, biggest ? (origin.get(biggest.source) ?? 0) : 0);
    rootOf.set(node.name, biggest ? (rootOf.get(biggest.source) ?? biggest.source) : node.name);
  }
  // An origin keeps its color wherever it appears; highlight keeps the named nodes, and the flows through them, in color.
  const lit = emphasis(ctx);
  const originColor = (name: string) => categoryColor(ctx, rootOf.get(name) ?? name, origin.get(name) ?? 0);
  const flowLit = (from: string, to: string) => !lit.any || lit.lit(from) || lit.lit(to) || lit.lit(rootOf.get(from));
  const outTotal = (name: string) => flows.filter((f) => f.source === name).reduce((s, f) => s + f.value, 0);
  const share = shareFormat(ctx.spec.locale);

  const wrap = html(doc, "div", "fft-chart");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", wordsFor(ctx).aria.sankey(ctx.label(value), ctx.label(source), ctx.label(target)));
  const ribbons = svg(doc, "g");
  const overlay = svg(doc, "g");
  const marks: SVGPathElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const m of marks) m.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  layout.links.forEach((link, i) => {
    const flow = flows[i] as (typeof flows)[number];
    const half = link.thickness / 2;
    const mid = (link.x0 + link.x1) / 2;
    const d = `M${link.x0},${link.y0 - half}C${mid},${link.y0 - half} ${mid},${link.y1 - half} ${link.x1},${link.y1 - half}L${link.x1},${link.y1 + half}C${mid},${link.y1 + half} ${mid},${link.y0 + half} ${link.x0},${link.y0 + half}Z`;
    const name = `${link.source}→${link.target}`;
    const ribbon = svg(doc, "path", { class: "fft-ribbon", d, style: `--fft-i: ${i}` });
    ribbon.dataset.flow = name;
    ribbon.style.setProperty("fill", flowLit(link.source, link.target) ? originColor(link.source) : lit.paint(undefined, ""));
    marks.push(ribbon);
    ribbons.append(ribbon);
    const items: TooltipItem[] = [
      { label: ctx.label(value), value: ctx.format(flow.row[value], value) },
      { label: `${wordsFor(ctx).ofParent} ${link.source}`, value: share.format(link.value / (outTotal(link.source) || 1)) },
    ];
    const hit = svg(doc, "path", { class: "fft-ribbon-hit", d, tabindex: 0, role: "img" });
    hit.dataset.flow = name;
    hit.setAttribute("aria-label", `${link.source} ${wordsFor(ctx).to} ${link.target}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
    const activate = () => {
      wrap.setAttribute("data-active", "");
      for (const m of marks) m.removeAttribute("data-active");
      ribbon.setAttribute("data-active", "");
      ctx.tooltip.show(hit, `${link.source} → ${link.target}`, items);
    };
    hit.addEventListener("pointerenter", activate);
    hit.addEventListener("focus", activate);
    hit.addEventListener("pointerleave", deactivate);
    hit.addEventListener("blur", deactivate);
    selectable(hit, () => ctx.select(flow.row));
    overlay.append(hit);
  });
  const nodes = svg(doc, "g");
  // The node totals in one precision, so they read as one set.
  const totalOf = evenFormat(ctx, value, layout.nodes.filter((node) => node.height >= 30).map((node) => node.value));
  layout.nodes.forEach((node, i) => {
    const rect = svg(doc, "rect", { class: "fft-node", x: node.x, y: node.y, width: NODE_WIDTH, height: Math.max(1, node.height), rx: 2, style: `--fft-i: ${i}` });
    const nodeLit = !lit.any || lit.lit(node.name) || lit.lit(rootOf.get(node.name));
    rect.style.setProperty("fill", node.column === 0 && nodeLit ? originColor(node.name) : node.column === 0 ? lit.paint(undefined, "") : "var(--fft-total)");
    nodes.append(rect);
    const onLeft = node.column === lastColumn && lastColumn > 0;
    const x = onLeft ? node.x - 8 : node.x + NODE_WIDTH + 8;
    const anchor = onLeft ? "end" : "start";
    const nameText = svg(doc, "text", { class: "fft-node-label", x, y: node.y + node.height / 2 - (node.height >= 30 ? 6 : 0), "text-anchor": anchor, "dominant-baseline": "middle" });
    nameText.textContent = node.name;
    nodes.append(nameText);
    if (node.height >= 30) {
      const valueText = svg(doc, "text", { class: "fft-node-value", x, y: node.y + node.height / 2 + 8, "text-anchor": anchor, "dominant-baseline": "middle" });
      valueText.textContent = totalOf(node.value);
      nodes.append(valueText);
    }
  });
  chart.append(ribbons, nodes, overlay);
  roving([...overlay.children]);
  wrap.append(chart);
  wrap.append(hiddenTableOf(ctx, flows.map((f) => f.row), [source, target, value]));
  ctx.el.append(wrap);
};
