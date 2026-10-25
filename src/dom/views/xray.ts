import { formatValue } from "../../core/display.ts";
import { readNumber } from "../../core/formats.ts";
import type { ViewRenderer } from "../../core/view-context.ts";
import type { XrayView } from "../../core/views.ts";
import { sparkline } from "./kpi.ts";
import { fieldList, hiddenTableOf, html, shareFormat, svg } from "./shared.ts";
import { wordsFor } from "./words.ts";
import { auditTools } from "./xray-audit.ts";

/** Values that read as "held": true, 1, "true", "yes", "y". */
const held = (value: unknown): boolean => value === true || value === 1 || /^(true|yes|y|held|holds)$/i.test(String(value ?? ""));

/** A list field's value as strings, or none. */
const listOf = (value: unknown): string[] => (Array.isArray(value) ? value.map((v) => String(v)) : []);

/**
 * Draws the `xray` view: one client on one card, from the first row. The name
 * and a detail line, a grid of key facts, the products held as pills, a
 * share-of-wallet meter, a small trend with its ends written, quiet warning
 * flags and a short checklist of next best actions. Every part is optional and
 * stacks in that order, so the card reads top to bottom on a phone.
 */
export const renderXray: ViewRenderer<XrayView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const row = ctx.rows[0] ?? {};
  const { label, detail, wallet, trend, flags, actions } = ctx.view;
  const facts = fieldList(ctx.view.facts).slice(0, 6);
  const holdings = fieldList(ctx.view.holdings);
  const name = ctx.format(row[label], label);

  const card = html(doc, "div", "fft-xray");
  const head = html(doc, "div", "fft-xray-head");
  head.append(html(doc, "h4", "fft-xray-name", name));
  if (detail && row[detail] !== undefined && row[detail] !== null && row[detail] !== "") head.append(html(doc, "p", "fft-xray-detail", ctx.format(row[detail], detail)));
  card.append(head);

  if (facts.length) {
    const grid = html(doc, "dl", "fft-xray-facts");
    grid.style.setProperty("--fft-xray-facts", String(Math.min(3, facts.length)));
    for (const field of facts) {
      const fact = html(doc, "div", "fft-xray-fact");
      const hasFormat = ctx.spec.fields?.[field]?.format !== undefined;
      const value = row[field];
      // A year (sinceYear, 2014) is a label, not an amount: no thousands separator.
      const isYear = typeof value === "number" && Number.isInteger(value) && value >= 1800 && value <= 2200 && /year/i.test(field);
      const text = isYear && !hasFormat ? String(value) : hasFormat || typeof value !== "number" ? ctx.format(value, field) : formatValue(value, Number.isInteger(value) && Math.abs(value) < 10000 ? { type: "number" } : { type: "number", compact: true }, ctx.spec.locale);
      fact.append(html(doc, "dt", "fft-xray-fact-label", ctx.label(field)), html(doc, "dd", "fft-xray-fact-value", text || "–"));
      grid.append(fact);
    }
    card.append(grid);
  }

  if (holdings.length) {
    const count = holdings.filter((field) => held(row[field])).length;
    const section = html(doc, "div", "fft-xray-section");
    const title = html(doc, "div", "fft-xray-title");
    title.append(html(doc, "span", undefined, wordsFor(ctx).products), html(doc, "span", "fft-xray-title-count", `${count} ${wordsFor(ctx).of} ${holdings.length}`));
    const strip = html(doc, "ul", "fft-xray-holdings");
    strip.setAttribute("aria-label", `${wordsFor(ctx).products}: ${count} ${wordsFor(ctx).of} ${holdings.length} ${wordsFor(ctx).held.toLowerCase()}`);
    for (const field of holdings) {
      const has = held(row[field]);
      const pill = html(doc, "li", "fft-xray-pill", ctx.label(field));
      if (has) {
        pill.dataset.held = "";
        pill.style.setProperty("--fft-xray-color", ctx.color(0));
      }
      pill.setAttribute("aria-label", `${ctx.label(field)}: ${(has ? wordsFor(ctx).held : wordsFor(ctx).notHeld).toLowerCase()}`);
      strip.append(pill);
    }
    section.append(title, strip);
    card.append(section);
  }

  if (wallet) {
    const share = readNumber(row[wallet]);
    const ratio = share === null ? null : Math.max(0, Math.min(1, share > 1 ? share / 100 : share));
    const percent = shareFormat(ctx.spec.locale);
    const section = html(doc, "div", "fft-xray-section fft-xray-wallet");
    const title = html(doc, "div", "fft-xray-title");
    title.append(html(doc, "span", undefined, ctx.label(wallet)), html(doc, "span", "fft-xray-title-count fft-xray-wallet-percent", ratio === null ? "–" : percent.format(ratio)));
    const track = html(doc, "div", "fft-xray-track");
    track.setAttribute("role", "meter");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "1");
    if (ratio !== null) track.setAttribute("aria-valuenow", String(ratio));
    track.setAttribute("aria-label", `${ctx.label(wallet)}: ${ratio === null ? wordsFor(ctx).unknown : percent.format(ratio)}`);
    const fill = html(doc, "div", "fft-xray-fill");
    fill.style.width = `${ratio === null ? 0 : Math.round(ratio * 1000) / 10}%`;
    fill.style.background = ctx.color(0);
    track.append(fill);
    section.append(title, track);
    card.append(section);
  }

  if (trend) {
    const values = listOf(row[trend]).map((v) => readNumber(v));
    const present = values.filter((v): v is number => v !== null);
    if (present.length > 1) {
      const section = html(doc, "div", "fft-xray-section fft-xray-trend");
      const title = html(doc, "div", "fft-xray-title");
      const show = (v: number) => (ctx.spec.fields?.[trend]?.format !== undefined ? ctx.format(v, trend) : formatValue(v, { type: "number", compact: true }, ctx.spec.locale));
      const [first, last] = [present[0] as number, present.at(-1) as number];
      const change = first !== 0 ? new Intl.NumberFormat(ctx.spec.locale, { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }).format((last - first) / Math.abs(first)) : "";
      title.append(html(doc, "span", undefined, ctx.label(trend)), html(doc, "span", "fft-xray-title-count", `${show(first)} → ${show(last)}${change ? ` (${change})` : ""}`));
      const chart = sparkline(ctx, values, Math.max(89, ctx.width - 2));
      chart.setAttribute("aria-hidden", "true");
      section.append(title, chart);
      card.append(section);
    }
  }

  if (flags) {
    const list = listOf(row[flags]);
    if (list.length) {
      const strip = html(doc, "ul", "fft-xray-flags");
      strip.setAttribute("aria-label", wordsFor(ctx).flags);
      for (const text of list) {
        const pill = html(doc, "li", "fft-badge fft-xray-flag");
        pill.dataset.tone = "warning";
        const dot = html(doc, "span", "fft-badge-dot");
        dot.setAttribute("aria-hidden", "true");
        pill.append(dot, text);
        strip.append(pill);
      }
      card.append(strip);
    }
  }

  if (actions) {
    const list = listOf(row[actions]);
    if (list.length) {
      const section = html(doc, "div", "fft-xray-section");
      section.append(html(doc, "div", "fft-xray-title", wordsFor(ctx).nextActions));
      const steps = html(doc, "ol", "fft-xray-actions");
      for (const text of list) {
        const item = html(doc, "li", "fft-xray-action");
        const circle = svg(doc, "svg", { class: "fft-xray-check", viewBox: "0 0 16 16", width: 16, height: 16, "aria-hidden": "true" });
        circle.append(svg(doc, "circle", { cx: 8, cy: 8, r: 6.5 }), svg(doc, "path", { d: "M5 8.5l2 2 4-5" }));
        item.append(circle, html(doc, "span", undefined, text));
        steps.append(item);
      }
      section.append(steps);
      card.append(section);
    }
  }

  // The wallet audit: "Audit wallet" and "Copy strategy" for the client shown, when the spec names its sources.
  if (ctx.view.audit) card.append(auditTools(ctx, row));

  card.append(hiddenTableOf(ctx, [row], [label, ...(detail ? [detail] : []), ...facts, ...(wallet ? [wallet] : [])]));
  ctx.el.append(card);
};
