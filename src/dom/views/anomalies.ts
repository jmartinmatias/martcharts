import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { TooltipItem, ViewRenderer } from "../../core/view-context.ts";
import { isForecast } from "../../core/views.ts";
import type { AnomaliesView } from "../../core/views.ts";
import { bandPath, evenLabels, linearScale, linePath, spread } from "../layout.ts";
import type { LabelBox } from "../layout.ts";
import { ROW, activeGroup, hiddenTableOf, html, legendList, roving, rowHit, svg, textWidth } from "./shared.ts";
import { fitLabel, writeLabel } from "./label-fit.ts";
import { wordsFor } from "./words.ts";

const LANE: number = ROW.roomy;
const GAP = 5;
const AXIS = 26;
/** Air inside a lane above and below its band, so the line never touches the lane's edge. */
const INSET = 4;

interface Lane {
  name: string;
  text: string;
  rows: (Row | undefined)[];
  flagged: number;
  latest: Row | undefined;
}

/**
 * Draws the `anomalies` view: one thin lane per metric, the lanes with the
 * most anomalies first. Each lane shows the expected band as a faint fill,
 * the expected value as a hairline, the actual as a line, and every flagged
 * reading as a filled dot in the alert color with a halo. The lane ends with
 * the metric's name, its latest value and a count ("3 anomalies", or "none"
 * quietly). The flagged readings are the keyboard stops, each with a tooltip
 * of value, expected, band and whether it was flagged.
 */
export const renderAnomalies: ViewRenderer<AnomaliesView> = (ctx) => {
  const doc = ctx.el.ownerDocument;
  const { x, metric, value, expected, low, high, flag } = ctx.view;
  const banded = Boolean(low && high);
  const flaggedRow = (row: Row): boolean => {
    if (flag) return isForecast(row[flag]);
    if (!banded) return false;
    const [v, lo, hi] = [readNumber(row[value]), readNumber(row[low as string]), readNumber(row[high as string])];
    return v !== null && lo !== null && hi !== null && (v < lo || v > hi);
  };
  // Periods in order, and one lane per metric, the lanes sorted by how many readings were flagged.
  const dates = [...new Set(ctx.rows.map((row) => String(row[x])))].sort();
  const dateIndex = new Map(dates.map((d, i) => [d, i]));
  const byMetric = new Map<string, Lane>();
  for (const row of ctx.rows) {
    const name = String(row[metric]);
    let lane = byMetric.get(name);
    if (!lane) {
      lane = { name, text: ctx.format(row[metric], metric), rows: Array.from({ length: dates.length }, () => undefined), flagged: 0, latest: undefined };
      byMetric.set(name, lane);
    }
    const i = dateIndex.get(String(row[x])) ?? -1;
    if (i >= 0) lane.rows[i] = row;
    if (flaggedRow(row)) lane.flagged++;
  }
  const lanes = [...byMetric.values()].sort((a, b) => b.flagged - a.flagged);
  for (const lane of lanes) lane.latest = [...lane.rows].reverse().find((row) => row && readNumber(row[value]) !== null);
  const sameCount = lanes.every((lane) => lane.flagged === lanes[0]?.flagged);

  // The right column: the longest name or "latest · n anomalies", within two fifths of the card.
  const countText = (n: number) => (n === 0 ? "none" : n === 1 ? "1 anomaly" : `${n} anomalies`);
  const latestText = (lane: Lane) => (lane.latest ? ctx.format(lane.latest[value], value) : "");
  // Measured: the name in bold, or the latest value beside its count pill, whichever is wider.
  const pillWidth = (words: string) => textWidth(words, 10, 600) + 10;
  const latestRoom = (lane: Lane) => (latestText(lane) ? textWidth(latestText(lane)) + 8 : 0) + pillWidth(countText(lane.flagged));
  const widest = Math.max(...lanes.map((lane) => Math.max(textWidth(lane.text, 11, 600), latestRoom(lane))));
  const side = Math.min(Math.max(89, widest + 21), Math.floor(ctx.width * 0.4));
  const width = Math.max(ctx.width, side + 144);
  const plot = { x: 0, w: width - side - 13 };
  const lanesHeight = lanes.length * LANE + Math.max(0, lanes.length - 1) * GAP;
  const height = lanesHeight + AXIS;
  const slots = spread(dates.length, plot.x, plot.w);
  const at = (i: number) => slots[i]?.center ?? 0;

  const wrap = html(doc, "div", "fft-chart fft-anomalies");
  const chart = svg(doc, "svg", { width, height, viewBox: `0 0 ${width} ${height}` });
  chart.setAttribute("role", "group");
  chart.setAttribute("aria-label", wordsFor(ctx).aria.anomalies(lanes.length, ctx.label(x)));
  const hits: Element[] = [];
  // Pointing at a flagged reading lights its lane and steps the others back.
  const active = activeGroup(wrap, ctx.tooltip);
  const flaggedRows: Row[] = [];

  lanes.forEach((lane, l) => {
    const top = l * (LANE + GAP);
    const bottom = top + LANE;
    const group = svg(doc, "g", { class: "fft-anom-lane", "data-metric": lane.name, style: `--fft-i: ${l}` });
    group.append(svg(doc, "rect", { class: "fft-anom-track", x: plot.x, y: top, width: plot.w, height: LANE, rx: 2 }));
    const reading = (row: Row | undefined, field: string | undefined) => (row && field ? readNumber(row[field]) : null);
    const covered = lane.rows.flatMap((row) => [reading(row, value), reading(row, expected), reading(row, low), reading(row, high)]).filter((v): v is number => v !== null);
    // Each lane on its own scale, fitted to its readings: the shape matters here, not the amounts.
    const y = linearScale(covered, [bottom - INSET, top + INSET], { includeZero: false, nice: false });
    if (banded) {
      const upper = lane.rows.flatMap((row, i) => (reading(row, high) !== null && reading(row, low) !== null ? [{ x: at(i), y: y(reading(row, high) as number) }] : []));
      const lower = lane.rows.flatMap((row, i) => (reading(row, high) !== null && reading(row, low) !== null ? [{ x: at(i), y: y(reading(row, low) as number) }] : []));
      if (upper.length) group.append(svg(doc, "path", { class: "fft-anom-band", d: bandPath(upper, lower) }));
    }
    if (expected) {
      const points = lane.rows.map((row, i) => (reading(row, expected) !== null ? { x: at(i), y: y(reading(row, expected) as number) } : null));
      group.append(svg(doc, "path", { class: "fft-anom-expected", d: linePath(points) }));
    }
    const line = svg(doc, "path", { class: "fft-anom-line", d: linePath(lane.rows.map((row, i) => (reading(row, value) !== null ? { x: at(i), y: y(reading(row, value) as number) } : null))) });
    line.style.setProperty("stroke", ctx.colorOf?.(lane.name) ?? ctx.color(0));
    group.append(line);

    // Flagged readings: a halo and a filled dot in the alert color, each a keyboard stop with the reading's story.
    lane.rows.forEach((row, i) => {
      if (!row || !flaggedRow(row)) return;
      const v = reading(row, value);
      if (v === null) return;
      flaggedRows.push(row);
      const cx = at(i);
      const cy = y(v);
      group.append(svg(doc, "circle", { class: "fft-anom-halo", cx, cy, r: 7 }), svg(doc, "circle", { class: "fft-anom-flag", cx, cy, r: 3.5 }));
      const dateText = ctx.format(row[x], x);
      const items: TooltipItem[] = [{ label: ctx.label(value), value: ctx.format(row[value], value), color: "var(--fft-down)" }];
      if (expected && reading(row, expected) !== null) items.push({ label: ctx.label(expected), value: ctx.format(row[expected], expected) });
      if (banded && reading(row, low) !== null && reading(row, high) !== null) items.push({ label: wordsFor(ctx).expectedBand, value: wordsFor(ctx).between(ctx.format(row[low as string], low), ctx.format(row[high as string], high)) });
      const lo = reading(row, low);
      const hi = reading(row, high);
      const side = lo !== null && v < lo ? wordsFor(ctx).belowBand : hi !== null && v > hi ? wordsFor(ctx).aboveBand : wordsFor(ctx).flagged;
      items.push({ label: wordsFor(ctx).anomaly, value: side });
      const hit = svg(doc, "circle", { class: "fft-anom-hit", cx, cy, r: 11 });
      hits.push(rowHit(ctx, { node: hit, row, name: `${lane.text}, ${dateText}`, items, active: group, group: active }));
      group.append(hit);
    });

    // The lane's words: its name, then its latest value and how many readings were flagged.
    const textX = plot.x + plot.w + 13;
    const name = svg(doc, "text", { class: "fft-anom-name", x: textX, y: top + 13 });
    // A name longer than the column ends in an ellipsis; its aria-label keeps it whole.
    writeLabel(name, fitLabel(lane.text, side - 21, 11, 600), lane.text);
    const latest = svg(doc, "text", { class: "fft-anom-latest", x: textX, y: top + 27 });
    latest.textContent = latestText(lane);
    group.append(name, latest);
    // The count pill tells the lanes apart: when every lane has the same count of one or none, it would say the same
    // thing on every lane, so it is left out (the flagged readings stay in the hidden table and each dot's label).
    if (!sameCount || lane.flagged > 1) {
      const pillX = textX + (latestText(lane) ? textWidth(latestText(lane)) + 8 : 0);
      const words = countText(lane.flagged);
      const pill = svg(doc, "g", { class: "fft-anom-count", "data-none": lane.flagged === 0 ? "true" : "false" });
      const wide = pillWidth(words);
      pill.append(svg(doc, "rect", { x: pillX, y: top + 18, width: Math.round(wide), height: 13, rx: 6.5 }));
      const pillText = svg(doc, "text", { x: pillX + wide / 2, y: top + 24.5, "text-anchor": "middle", "dominant-baseline": "middle" });
      pillText.textContent = words;
      pill.append(pillText);
      group.append(pill);
    }
    chart.append(group);
  });

  // Period labels under the lanes, thinned to an even rhythm, the first and last always named.
  const xLabels = dates.map((d) => ctx.format(lanes[0]?.rows[dateIndex.get(d) ?? -1]?.[x] ?? d, x));
  const anchorOf = (i: number) => (dates.length < 2 ? "middle" : i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle");
  const widestLabel = Math.max(...xLabels.map((text) => textWidth(text))) + 8;
  const box = (i: number): LabelBox => ({ x: at(i), width: textWidth(xLabels[i] ?? ""), anchor: anchorOf(i) });
  for (const i of evenLabels(dates.length, Math.ceil((dates.length * widestLabel) / Math.max(1, plot.w)), box)) {
    const text = svg(doc, "text", { class: "fft-tick fft-tick-x", x: at(i), y: lanesHeight + 18, "text-anchor": anchorOf(i) });
    text.textContent = xLabels[i] ?? "";
    chart.append(text);
  }
  roving(hits);
  wrap.append(chart);

  // The key: what the band and the dots mean, in a few words.
  // The key, above the lanes like every row view's: the band, the line and the flag, each its own swatch class.
  const keys = [
    ...(banded ? [{ label: wordsFor(ctx).expectedBand, color: "", shape: "rect" as const, cls: "fft-anom-key-band" }] : []),
    { label: ctx.label(value), color: ctx.color(0), shape: "line" as const, cls: "fft-anom-key-line" },
    { label: wordsFor(ctx).anomaly, color: "", shape: "dot" as const, cls: "fft-anom-key-flag" },
  ];
  const key = legendList(ctx, keys);
  if (key) {
    key.classList.add("fft-anom-key");
    key.querySelectorAll<HTMLElement>(".fft-swatch").forEach((swatch, i) => {
      swatch.classList.add(keys[i]?.cls ?? "");
      if (!keys[i]?.color) swatch.style.removeProperty("background");
    });
    wrap.prepend(key);
  }

  const columns = [x, metric, value, expected, low, high].filter((f): f is string => Boolean(f));
  wrap.append(hiddenTableOf(ctx, flaggedRows.length ? flaggedRows : ctx.rows, columns));
  ctx.el.append(wrap);
};
