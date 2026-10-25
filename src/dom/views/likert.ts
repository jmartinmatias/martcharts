import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import type { LikertView } from "../../core/views.ts";
import { buildTable, fieldList, html, ROW, selectable, shareFormat, svg } from "./shared.ts";
import { roving } from "./focus.ts";

const LANE: number = ROW.tall;
const BAR = 21;
const GAP = 2;
/** Room beyond each end for the "20%" and "60%" labels. */
const END = 41;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Draws the `likert` view: per question, its responses as one stacked bar in
 * order from the negative pole to the positive, centered on the neutral
 * middle, so disagreement grows left of the center line and agreement right.
 * Colors diverge from a grey neutral: the down hue for the negative side, the
 * up hue for the positive, strongest at the poles. The question sits above its
 * bar, so long questions fit any width.
 */
export const renderLikert: ViewRenderer<LikertView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { label } = ctx.view;
  const responses = fieldList(ctx.view.responses);
  const mid = (responses.length - 1) / 2;
  const toneOf = (i: number) => (i < mid ? "neg" : i > mid ? "pos" : "neutral");
  const strength = (i: number) => (i === mid ? 1 : 0.45 + 0.55 * (Math.abs(i - mid) / (mid || 1)));
  const colorOf = (i: number) => (i < mid ? "var(--fft-down)" : i > mid ? "var(--fft-up)" : "var(--fft-deemphasis)");
  const percent = shareFormat(ctx.spec.locale);

  const questions = ctx.rows.map((row) => {
    const counts = responses.map((field) => Math.max(0, readNumber(row[field]) ?? 0));
    const total = counts.reduce((a, b) => a + b, 0) || 1;
    const shares = counts.map((c) => c / total);
    const neg = shares.reduce((sum, s, i) => (i < mid ? sum + s : sum), 0);
    const pos = shares.reduce((sum, s, i) => (i > mid ? sum + s : sum), 0);
    const neutral = shares.reduce((sum, s, i) => (i === mid ? sum + s : sum), 0);
    return { row, shares, neg, pos, left: neg + neutral / 2, right: pos + neutral / 2 };
  });
  const reach = Math.max(0.01, ...questions.flatMap((q) => [q.left, q.right]));

  const wrap = html(doc, "div", "fft-chart");
  const legend = html(doc, "ul", "fft-legend");
  responses.forEach((field, i) => {
    const swatch = html(doc, "span", "fft-swatch");
    swatch.dataset.shape = "rect";
    swatch.style.background = colorOf(i);
    swatch.style.opacity = String(strength(i));
    swatch.setAttribute("aria-hidden", "true");
    const item = html(doc, "li");
    item.append(swatch, ctx.label(field));
    legend.append(item);
  });
  // Inside a small-multiples panel the widget draws one shared legend.
  if (!ctx.inFacet) wrap.append(legend);

  const width = Math.max(ctx.width, 233);
  const height = questions.length * LANE + 8;
  const center = width / 2;
  const scale = (width / 2 - 13 - END) / reach;
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", `Survey responses by ${ctx.label(label)}, centered on neutral`);

  const segments: SVGRectElement[] = [];
  const hits: Element[] = [];
  const deactivate = () => {
    wrap.removeAttribute("data-active");
    for (const seg of segments) seg.removeAttribute("data-active");
    ctx.tooltip.hide();
  };
  questions.forEach((q, r) => {
    const top = r * LANE;
    const question = svg(doc, "text", { class: "fft-likert-question", x: 13, y: top + 13 });
    question.textContent = ctx.format(q.row[label], label);
    chart.append(question);
    const barTop = top + 21;
    let cursor = center - q.left * scale;
    const start = cursor;
    q.shares.forEach((share, i) => {
      const w = share * scale;
      const x0 = cursor;
      cursor += w;
      if (share <= 0) return;
      const seg = svg(doc, "rect", { class: "fft-likert-seg", x: x0 + GAP / 2, y: barTop, width: Math.max(0.5, w - GAP), height: BAR, rx: 2, "data-share": round2(share), "data-tone": toneOf(i), "data-index": i });
      seg.style.fill = colorOf(i);
      seg.style.fillOpacity = String(strength(i));
      // Questions fade in one after another.
      seg.style.setProperty("--fft-i", String(r));
      chart.append(seg);
      segments.push(seg);
      const field = responses[i] as string;
      const name = ctx.format(q.row[label], label);
      const items: TooltipItem[] = [
        { label: ctx.label(field), value: ctx.format(q.row[field], field), color: colorOf(i) },
        { label: "Share", value: percent.format(share) },
      ];
      const hit = svg(doc, "rect", { class: "fft-likert-hit", x: x0, y: top, width: Math.max(1, w), height: LANE, tabindex: 0, role: "img" });
      hit.setAttribute("aria-label", `${name}, ${items.map((it) => `${it.label} ${it.value}`).join(", ")}`);
      const activate = () => {
        wrap.setAttribute("data-active", "");
        // The same response lights up in every question, for comparing down the column.
        for (const other of segments) other.toggleAttribute("data-active", other.dataset.index === String(i));
        ctx.tooltip.show(seg, name, items);
      };
      hit.addEventListener("pointerenter", activate);
      hit.addEventListener("focus", activate);
      hit.addEventListener("pointerleave", deactivate);
      hit.addEventListener("blur", deactivate);
      const row: Row = q.row;
      selectable(hit, () => ctx.select(row));
      hits.push(hit);
    });
    const neg = svg(doc, "text", { class: "fft-likert-end fft-likert-neg", x: start - 6, y: barTop + BAR / 2, "text-anchor": "end", "dominant-baseline": "middle" });
    neg.textContent = percent.format(q.neg);
    const pos = svg(doc, "text", { class: "fft-likert-end fft-likert-pos", x: cursor + 6, y: barTop + BAR / 2, "dominant-baseline": "middle" });
    pos.textContent = percent.format(q.pos);
    // The center line runs through the bar only, so it never crosses the question above it.
    chart.append(neg, pos, svg(doc, "line", { class: "fft-likert-center", x1: center, x2: center, y1: barTop - 5, y2: barTop + BAR + 5 }));
  });
  const overlay = svg(doc, "g");
  overlay.append(...hits);
  chart.append(overlay);
  roving(hits);
  wrap.append(chart);
  const hidden = html(doc, "div", "fft-sr-only");
  hidden.append(buildTable(ctx, ctx.rows, [label, ...responses], false));
  wrap.append(hidden);
  ctx.el.append(wrap);
};
