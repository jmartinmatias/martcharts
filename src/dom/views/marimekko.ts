import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { MarimekkoView } from "../../core/views.ts";
import { buildTable, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const CHAR_WIDTH = 6.5;
const GAP = 2;

interface Column {
  key: string;
  text: string;
  total: number;
  cells: Map<string, { row: Row; amount: number }>;
}

/**
 * Draws the `marimekko` view: one column per category, as wide as its share of
 * the grand total, split top to bottom into each series' share of that column.
 * Like the treemap, segments are soft tints with a crisp edge of the full color
 * along the top, so text stays in the text colors. Shares are written inside
 * segments only where they fit; columns carry their name and total below.
 */
export const renderMarimekko: ViewRenderer<MarimekkoView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { x, series, value } = ctx.view;
  const columns: Column[] = [];
  const names: string[] = [];
  for (const row of ctx.rows) {
    const amount = readNumber(row[value]);
    if (amount === null || amount <= 0) continue;
    const key = JSON.stringify(row[x]);
    let column = columns.find((c) => c.key === key);
    if (!column) {
      column = { key, text: ctx.format(row[x], x), total: 0, cells: new Map() };
      columns.push(column);
    }
    const name = String(row[series]);
    if (!names.includes(name)) names.push(name);
    const cell = column.cells.get(name);
    column.cells.set(name, { row: cell?.row ?? row, amount: (cell?.amount ?? 0) + amount });
    column.total += amount;
  }
  const grand = columns.reduce((sum, c) => sum + c.total, 0);
  const percent = new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0 });

  const wrap = html(doc, "div", "fft-chart");
  if (names.length > 1) {
    const legend = html(doc, "ul", "fft-legend");
    names.forEach((name, i) => {
      const swatch = html(doc, "span", "fft-swatch");
      swatch.dataset.shape = "rect";
      swatch.style.background = ctx.color(i);
      swatch.setAttribute("aria-hidden", "true");
      const item = html(doc, "li");
      item.append(swatch, ctx.format(name, series));
      legend.append(item);
    });
    wrap.append(legend);
  }

  const width = ctx.width;
  const height = ctx.height;
  const top = 0;
  const plotH = height - 39;
  const usableW = width - GAP * Math.max(0, columns.length - 1);
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Marimekko chart of ${ctx.label(value)} by ${ctx.label(x)} and ${ctx.label(series)}`);

  const groups: SVGGElement[] = [];
  const hits: Element[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const group of groups) group.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  let left = 0;
  columns.forEach((column, c) => {
    const w = (usableW * column.total) / grand;
    const present = names.filter((name) => column.cells.has(name));
    const usableH = plotH - GAP * Math.max(0, present.length - 1);
    let y = top;
    for (const name of present) {
      const cell = column.cells.get(name) as { row: Row; amount: number };
      const s = names.indexOf(name);
      const h = (usableH * cell.amount) / column.total;
      const box = { x: left, y, width: w, height: h };
      const group = svg(doc, "g", { class: "fft-mekko", style: `--fft-i: ${c}` });
      const seg = svg(doc, "rect", { class: "fft-mekko-seg", ...box, rx: 2, "data-column": String(cell.row[x]), "data-series": name });
      seg.style.setProperty("fill", ctx.color(s));
      const edge = svg(doc, "rect", { class: "fft-mekko-edge", x: box.x, y: box.y, width: w, height: Math.min(3, h), rx: 1.5 });
      edge.style.setProperty("fill", ctx.color(s));
      group.append(seg, edge);

      const shown = ctx.format(name, series);
      const share = percent.format(cell.amount / column.total);
      const room = (text: string) => text.length * CHAR_WIDTH + 16;
      if (w >= Math.max(room(shown), room(share)) && h >= 39) {
        const nameText = svg(doc, "text", { class: "fft-mekko-name", x: box.x + 8, y: box.y + 19 });
        nameText.textContent = shown;
        const shareText = svg(doc, "text", { class: "fft-mekko-share", x: box.x + 8, y: box.y + 34 });
        shareText.textContent = share;
        group.append(nameText, shareText);
      } else if (w >= room(share) && h >= 23) {
        const shareText = svg(doc, "text", { class: "fft-mekko-share", x: box.x + 8, y: box.y + 17 });
        shareText.textContent = share;
        group.append(shareText);
      }

      const title = `${column.text}, ${shown}`;
      const items: TooltipItem[] = [
        { label: ctx.label(value), value: ctx.format(cell.row[value], value), color: ctx.color(s) },
        { label: `Share of ${column.text}`, value: share },
        { label: "Share of total", value: percent.format(cell.amount / grand) },
      ];
      const hit = svg(doc, "rect", { class: "fft-mekko-hit", ...box, tabindex: 0, role: "img" });
      hit.setAttribute("aria-label", `${title}: ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
      const activate = () => {
        wrap.setAttribute("data-active", "");
        for (const other of groups) other.removeAttribute("data-active");
        group.setAttribute("data-active", "");
        ctx.tooltip.show(hit, title, items);
      };
      hit.addEventListener("pointerenter", activate);
      hit.addEventListener("focus", activate);
      hit.addEventListener("pointerleave", deactivate);
      hit.addEventListener("blur", deactivate);
      const row = cell.row;
      selectable(hit, () => ctx.select(row));
      group.append(hit);
      chart.append(group);
      groups.push(group);
      hits.push(hit);
      y += h + GAP;
    }
    // Column name and total below, centred, when they fit the column.
    const totalText = ctx.format(column.total, value);
    if (w >= Math.max(column.text.length, totalText.length) * CHAR_WIDTH) {
      const label = svg(doc, "text", { class: "fft-mekko-column", x: left + w / 2, y: plotH + 18, "text-anchor": "middle" });
      const nameSpan = svg(doc, "tspan", { class: "fft-mekko-column-name" });
      nameSpan.textContent = column.text;
      const totalSpan = svg(doc, "tspan", { class: "fft-mekko-column-total", x: left + w / 2, dy: 15 });
      totalSpan.textContent = totalText;
      label.append(nameSpan, totalSpan);
      chart.append(label);
    }
    left += w + GAP;
  });
  roving(hits);
  wrap.append(chart);
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, ctx.rows, [x, series, value], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
