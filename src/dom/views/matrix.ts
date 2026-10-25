import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import { isYes } from "../../core/views.ts";
import type { MatrixView } from "../../core/views.ts";
import { quantize, wrapLabels } from "../layout.ts";
import { hiddenTable, html, selectable, svg } from "./shared.ts";
import { roving } from "./focus.ts";

/** Rough width of one character of 11px text, for sizing margins without measuring. */
const CHAR_WIDTH = 6;
/** Steps in the sequential scale, shared with heat cells and the choropleth. */
const STEPS = 7;
const MIN_CELL = 21;
const MAX_CELL = 55;

/**
 * Draws the `matrix` view: a grid with the y values down and the x values
 * across, and one mark where a row sits at their crossing. The mark is a circle
 * sized by `size` (area true to value), shaded by `color` (the seven-step scale
 * for a number, one color per kind for a category), or a square where `mark`
 * says yes and a faint dot where it says no. A pair with no row is an empty cell.
 * Column headers wrap onto short lines, or lean when even that will not fit.
 */
export const renderMatrix: ViewRenderer<MatrixView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { x, y, size, color, mark, label } = ctx.view;
  const columns: string[] = [];
  const lines: string[] = [];
  const cells = new Map<string, Row>();
  for (const row of ctx.rows) {
    const cx = String(row[x]);
    const cy = String(row[y]);
    if (!columns.includes(cx)) columns.push(cx);
    if (!lines.includes(cy)) lines.push(cy);
    const key = JSON.stringify([cy, cx]);
    if (!cells.has(key)) cells.set(key, row);
  }
  const sample = (key: string, field: string) => {
    for (const row of ctx.rows) if (String(row[field]) === key) return ctx.format(row[field], field);
    return key;
  };
  const colNames = columns.map((column) => sample(column, x));
  const rowNames = lines.map((line) => sample(line, y));

  // Color: a number when every present value reads as one, otherwise one color per kind.
  const colorValues = color ? ctx.rows.map((row) => readNumber(row[color])) : [];
  const numericColor = Boolean(color) && colorValues.some((v) => v !== null) && ctx.rows.every((row) => row[color as string] == null || row[color as string] === "" || readNumber(row[color as string]) !== null);
  const kinds: string[] = [];
  if (color && !numericColor) for (const row of ctx.rows) if (!kinds.includes(String(row[color]))) kinds.push(String(row[color]));
  const present = colorValues.filter((v): v is number => v !== null);
  const [cmin, cmax] = [Math.min(...present), Math.max(...present)];
  const sizes = size ? ctx.rows.map((row) => readNumber(row[size])) : [];
  const smax = Math.max(0, ...sizes.filter((v): v is number => v !== null));

  // Geometry: square cells, as wide as the card allows between 21px and 55px.
  const left = Math.max(34, Math.min(ctx.width * 0.38, Math.max(...rowNames.map((n) => n.length)) * CHAR_WIDTH + 13));
  const right = 8;
  const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor((ctx.width - left - right) / columns.length)));
  const width = Math.max(ctx.width, left + cell * columns.length + right);
  const widest = Math.max(...colNames.map((n) => n.length)) * CHAR_WIDTH;
  const wrapped = widest > cell - 4 ? wrapLabels(colNames, cell - 4) : undefined;
  const leaning = widest > cell - 4 && !wrapped;
  const headLines = wrapped ? Math.max(...wrapped.map((w) => w.length)) : 1;
  const top = leaning ? Math.min(89, Math.round(widest * 0.72) + 13) : 13 * headLines + 8;
  const height = top + lines.length * cell + 5;
  const rmax = cell / 2 - 3;

  const wrap = html(doc, "div", "fft-matrix");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  const measure = size ?? (numericColor ? color : undefined);
  chart.setAttribute("aria-label", `Matrix of ${measure ? ctx.label(measure) : mark ? ctx.label(mark) : "rows"} by ${ctx.label(y)} and ${ctx.label(x)}`);

  // Headers: row names on the left, column names above (wrapped, or leaning when long).
  rowNames.forEach((name, i) => {
    const text = svg(doc, "text", { class: "fft-mx-row", x: left - 8, y: top + i * cell + cell / 2, "text-anchor": "end", "dominant-baseline": "middle" });
    text.textContent = name;
    chart.append(text);
  });
  colNames.forEach((name, i) => {
    const cx = left + i * cell + cell / 2;
    if (leaning) {
      const text = svg(doc, "text", { class: "fft-mx-col", x: cx + 4, y: top - 8, "text-anchor": "start", transform: `rotate(-45 ${cx + 4} ${top - 8})` });
      text.textContent = name;
      chart.append(text);
      return;
    }
    const text = svg(doc, "text", { class: "fft-mx-col", x: cx, y: top - 8 - 13 * (headLines - 1), "text-anchor": "middle" });
    const parts = wrapped?.[i] ?? [name];
    if (parts.length === 1) text.textContent = name;
    else {
      text.setAttribute("aria-label", name);
      parts.forEach((part, n) => {
        const span = svg(doc, "tspan", { x: cx, dy: n === 0 ? 0 : 13 });
        span.textContent = part;
        text.append(span);
      });
    }
    chart.append(text);
  });

  const hits: SVGElement[] = [];
  const marks: SVGElement[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const m of marks) m.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  const fillOf = (row: Row, node: SVGElement) => {
    if (numericColor && color) {
      const v = readNumber(row[color]);
      if (v !== null) {
        node.dataset.step = String(quantize(v, cmin, cmax, STEPS));
        return;
      }
    }
    const kind = color && !numericColor ? kinds.indexOf(String(row[color])) : 0;
    node.style.setProperty("fill", ctx.color(Math.max(0, kind)));
  };
  lines.forEach((line, r) => {
    columns.forEach((column, c) => {
      const x0 = left + c * cell;
      const y0 = top + r * cell;
      const cx = x0 + cell / 2;
      const cy = y0 + cell / 2;
      chart.append(svg(doc, "rect", { class: "fft-mx-cell", x: x0 + 1, y: y0 + 1, width: cell - 2, height: cell - 2, rx: 3 }));
      const row = cells.get(JSON.stringify([line, column]));
      if (!row) return;
      const items: TooltipItem[] = [];
      let node: SVGElement | undefined;
      let room = 0;
      if (mark) {
        const yes = isYes(row[mark]);
        items.push({ label: ctx.label(mark), value: yes ? "Yes" : "No" });
        if (yes) {
          const side = Math.round(cell * 0.56);
          node = svg(doc, "rect", { class: "fft-mx-yes", x: cx - side / 2, y: cy - side / 2, width: side, height: side, rx: Math.min(4, side / 4) });
          fillOf(row, node);
          room = side;
        } else node = svg(doc, "circle", { class: "fft-mx-no", cx, cy, r: 1.5 });
      } else {
        const amount = size ? readNumber(row[size]) : null;
        const r = size ? (amount !== null && amount > 0 && smax > 0 ? Math.max(2, rmax * Math.sqrt(amount / smax)) : 0) : rmax * 0.62;
        if (size) items.push({ label: ctx.label(size), value: ctx.format(row[size], size) });
        if (r > 0) {
          node = svg(doc, "circle", { class: "fft-mx-dot", cx, cy, r: Math.round(r * 10) / 10 });
          fillOf(row, node);
          room = r * 1.6;
        }
      }
      if (color) items.push({ label: ctx.label(color), value: ctx.format(row[color], color) });
      if (label) items.push({ label: ctx.label(label), value: ctx.format(row[label], label) });
      if (node) {
        node.style.setProperty("--fft-i", String(r * columns.length + c));
        chart.append(node);
        marks.push(node);
        // The label fits inside when the mark has room for its characters.
        const labelText = label ? ctx.format(row[label], label) : "";
        if (labelText && room >= labelText.length * 5 + 6) {
          const text = svg(doc, "text", { class: "fft-mx-label", x: cx, y: cy, "text-anchor": "middle", "dominant-baseline": "central" });
          if (node.dataset.step) text.dataset.step = node.dataset.step;
          text.textContent = labelText;
          chart.append(text);
        }
      }
      const name = `${rowNames[r]}, ${colNames[c]}`;
      const hit = svg(doc, "rect", { class: "fft-mx-hit", x: x0, y: y0, width: cell, height: cell, tabindex: 0, role: "img" });
      hit.setAttribute("aria-label", `${name}: ${items.map((it) => `${it.label} ${it.value}`).join(", ") || "present"}`);
      const anchor = node ?? hit;
      const activate = () => {
        wrap.setAttribute("data-active", "");
        for (const m of marks) m.removeAttribute("data-active");
        node?.setAttribute("data-active", "");
        ctx.tooltip.show(anchor, name, items);
      };
      hit.addEventListener("pointerenter", activate);
      hit.addEventListener("focus", activate);
      hit.addEventListener("pointerleave", deactivate);
      hit.addEventListener("blur", deactivate);
      selectable(hit, () => ctx.select(row));
      chart.append(hit);
      hits.push(hit);
    });
  });
  // A complete grid moves by rows with up and down; a sparse one moves mark to mark.
  roving(hits, hits.length === columns.length * lines.length ? { down: columns.length } : {});
  wrap.append(chart);

  // Keys: what size, shade, color and squares mean.
  const keys = html(doc, "div", "fft-mx-keys");
  if (size && smax > 0) {
    const key = html(doc, "div", "fft-mx-sizekey");
    const rSmall = Math.max(2, rmax * Math.sqrt(0.25));
    const w = Math.round(rmax * 2 + 8);
    const svgKey = svg(doc, "svg", { width: w + 55, height: Math.round(rmax * 2 + 4), viewBox: `0 0 ${w + 55} ${Math.round(rmax * 2 + 4)}` });
    svgKey.setAttribute("aria-hidden", "true");
    const base = rmax * 2 + 2;
    svgKey.append(svg(doc, "circle", { class: "fft-mx-key-ring", cx: rmax + 2, cy: base - rmax, r: rmax }));
    svgKey.append(svg(doc, "circle", { class: "fft-mx-key-ring", cx: rmax + 2, cy: base - rSmall, r: rSmall }));
    for (const [r, v] of [
      [rmax, smax],
      [rSmall, smax / 4],
    ] as const) {
      svgKey.append(svg(doc, "line", { class: "fft-mx-key-line", x1: rmax + 2, x2: w + 2, y1: base - r * 2, y2: base - r * 2 }));
      const text = svg(doc, "text", { class: "fft-mx-key-text", x: w + 5, y: base - r * 2, "dominant-baseline": "middle" });
      text.textContent = ctx.format(v, size);
      svgKey.append(text);
    }
    key.append(svgKey, html(doc, "span", undefined, ctx.label(size)));
    keys.append(key);
  }
  if (numericColor && color && present.length) {
    const legend = html(doc, "div", "fft-heat-legend fft-mx-ramp");
    const ramp = html(doc, "div", "fft-heat-ramp");
    ramp.setAttribute("aria-hidden", "true");
    for (let step = 1; step <= STEPS; step++) {
      const swatch = html(doc, "div");
      swatch.dataset.step = String(step);
      ramp.append(swatch);
    }
    legend.append(html(doc, "span", undefined, ctx.format(cmin, color)), ramp, html(doc, "span", undefined, `${ctx.format(cmax, color)} ${ctx.label(color).toLowerCase()}`));
    keys.append(legend);
  }
  if (kinds.length || mark) {
    const legend = html(doc, "ul", "fft-legend");
    if (mark) {
      const swatch = html(doc, "span", "fft-swatch");
      swatch.setAttribute("aria-hidden", "true");
      swatch.style.background = ctx.color(0);
      const item = html(doc, "li");
      item.append(swatch, ctx.label(mark));
      legend.append(item);
    }
    kinds.forEach((kind, i) => {
      const swatch = html(doc, "span", "fft-swatch");
      swatch.dataset.shape = mark ? "rect" : "dot";
      swatch.setAttribute("aria-hidden", "true");
      swatch.style.background = ctx.color(i);
      const item = html(doc, "li");
      item.append(swatch, color ? sample(kind, color) : kind);
      legend.append(item);
    });
    keys.append(legend);
  }
  if (keys.childElementCount) wrap.append(keys);

  // The grid as a table for screen readers: one row per line, one column per column.
  const cellText = (row: Row | undefined) => {
    if (!row) return "";
    if (mark) return isYes(row[mark]) ? "Yes" : "No";
    const bits = [size, color, label].filter((f): f is string => Boolean(f)).map((f) => ctx.format(row[f], f));
    return bits.join(", ") || "Yes";
  };
  wrap.append(hiddenTable(doc, [ctx.label(y), ...colNames], lines.map((line, r) => [rowNames[r] as string, ...columns.map((column) => cellText(cells.get(JSON.stringify([line, column]))))])));
  ctx.el.append(wrap);
};
