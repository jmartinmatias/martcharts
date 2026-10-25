// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { textWidth } from "../layout.ts";
import { BASE_CSS } from "../styles.ts";
import { createWidget } from "../widget.ts";
import { fitLabel, nameColumn } from "./label-fit.ts";
import "./index.ts";

const catalog = (type: string) => JSON.parse(readFileSync(`catalog/${type}.json`, "utf8")) as WidgetSpec;
const rowsOf = (spec: WidgetSpec) => spec.data.rows as Row[];
const LONG = " and a very long continuation that no column could hold";

/**
 * The SVG row views: the field their names come from, and the class of the text that writes a name. Horizon names
 * its rows by series (fields), so its long-name case renames a field's label instead.
 */
const SVG_VIEWS: [type: string, field: (spec: WidgetSpec) => string | undefined, names: string][] = [
  ["dot", (s) => s.view.label as string, ".fft-dot-label"],
  ["dumbbell", (s) => s.view.label as string, ".fft-db-label"],
  ["slope", (s) => s.view.label as string, ".fft-slope-label"],
  ["bump", (s) => s.view.series as string, ".fft-bump-label"],
  ["variance", (s) => s.view.label as string, ".fft-var-label"],
  ["lifecycle", (s) => s.view.label as string, ".fft-lc-label"],
  ["pyramid", (s) => s.view.label as string, ".fft-pyr-label"],
  ["timeline", (s) => s.view.label as string, ".fft-gantt-label"],
  ["likert", (s) => s.view.label as string, ".fft-likert-question"],
  ["boxplot", (s) => s.view.group as string, ".fft-box-label"],
  ["ridgeline", (s) => s.view.group as string, ".fft-ridge-label"],
  ["beeswarm", (s) => s.view.group as string, ".fft-swarm-group"],
  ["anomalies", (s) => s.view.metric as string, ".fft-anom-name"],
  ["matrix", (s) => s.view.y as string, ".fft-mx-row"],
  ["horizon", () => undefined, ".fft-horizon-label"],
];

/** The HTML row views: the class of the element that writes a name. */
const HTML_VIEWS: [type: string, names: string][] = [
  ["hbar", ".fft-hbar-label"],
  ["bullet", ".fft-bullet-label"],
  ["meter", ".fft-meter-label"],
  ["funnel", ".fft-funnel-label"],
  ["strips", ".fft-strip-label"],
  ["board", ".fft-board-name"],
  ["history", ".fft-history-title"],
  ["whitespace", ".fft-ws-row"],
  ["list", ".fft-item-label"],
];

/** Classes set in bold (600) in the stylesheet, so their text is measured bold. */
const BOLD = /fft-(likert-question|lc-group|anom-name|slope-value|bump-rank|pyr-value)/;

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
  // jsdom has no layout: the card is 320px wide, a phone held upright.
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 320 });
});
afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
});

async function draw(spec: WidgetSpec) {
  target.replaceChildren();
  await createWidget(target, { ...spec, locale: "en-US" }).ready;
  return target.querySelector(".fft-widget") as HTMLElement;
}

/** How wide a text node draws: each tspan measured in its own weight, with the 5px step a tspan's dx adds. */
function drawnWidth(node: Element): number {
  const spans = [...node.querySelectorAll("tspan")];
  const parts = spans.length ? spans : [node];
  const weight = (el: Element) => (BOLD.test(el.getAttribute("class") ?? node.getAttribute("class") ?? "") ? 600 : 400);
  return parts.reduce((sum, el) => sum + textWidth(el.textContent ?? "", 11, weight(el)), 0) + Math.max(0, parts.length - 1) * 5;
}

/** Every name inside the drawing: its left and right edges, by its anchor, within 0 and the svg's width. */
function overflowing(card: HTMLElement, selector: string): string[] {
  const out: string[] = [];
  for (const node of card.querySelectorAll(`svg ${selector}`)) {
    if (node.closest(".fft-sr-only") || node.hasAttribute("transform")) continue;
    const svgWidth = Number(node.closest("svg")?.getAttribute("width"));
    const x = Number(node.getAttribute("x"));
    const w = drawnWidth(node);
    const anchor = node.getAttribute("text-anchor") ?? "start";
    const [from, to] = anchor === "end" ? [x - w, x] : anchor === "middle" ? [x - w / 2, x + w / 2] : [x, x + w];
    if (from < -1 || to > svgWidth + 1) out.push(`${node.textContent} [${Math.round(from)}, ${Math.round(to)}] of ${svgWidth}`);
  }
  return out;
}

/** The catalog example with every name made far too long for any column. */
function longNames(spec: WidgetSpec, field: string | undefined): WidgetSpec {
  if (!field) {
    // Horizon names its rows by field: a long label on every series.
    const series = (Array.isArray(spec.view.y) ? spec.view.y : [spec.view.y]).map(String);
    return { ...spec, fields: { ...spec.fields, ...Object.fromEntries(series.map((f) => [f, { ...spec.fields?.[f], label: `${f}${LONG}` }])) } };
  }
  return { ...spec, data: { type: "inline", rows: rowsOf(spec).map((row) => ({ ...row, [field]: `${String(row[field])}${LONG}` })) } };
}

describe("names fit their column at 320px", () => {
  test.each(SVG_VIEWS)("%s: the catalog example's names stay inside the card", async (type, _field, names) => {
    const card = await draw(catalog(type));
    expect([type, card.querySelectorAll(`svg ${names}`).length > 0]).toEqual([type, true]);
    expect([type, overflowing(card, names)]).toEqual([type, []]);
  });

  test.each(SVG_VIEWS)("%s: names too long for any column end in an ellipsis, stay inside, and keep the whole name for screen readers", async (type, field, names) => {
    const spec = catalog(type);
    const card = await draw(longNames(spec, field(spec)));
    const drawn = [...card.querySelectorAll(`svg ${names}`)].filter((node) => !node.closest(".fft-sr-only"));
    expect([type, drawn.length > 0]).toEqual([type, true]);
    expect([type, overflowing(card, names)]).toEqual([type, []]);
    const cut = drawn.filter((node) => (node.textContent ?? "").includes("…"));
    expect([type, cut.length > 0]).toEqual([type, true]);
    // The whole name is still said: on the label itself, and on the row's own stop.
    for (const node of cut) expect([type, (node.getAttribute("aria-label") ?? "").includes(LONG.trim())]).toEqual([type, true]);
    const stops = [...card.querySelectorAll('[tabindex="0"]')].map((node) => node.getAttribute("aria-label") ?? "");
    expect([type, stops.some((label) => label.includes(LONG.trim()))]).toEqual([type, true]);
  });

  test.each(HTML_VIEWS)("%s: a long name ends in an ellipsis in the stylesheet, and keeps its whole name for the pointer and screen readers", async (type, names) => {
    const rule = BASE_CSS.split("\n").filter((line) => line.includes(`${names} {`) || line.startsWith(`${names} {`));
    expect([type, rule.some((line) => /text-overflow: ellipsis/.test(line) && /white-space: nowrap/.test(line))]).toEqual([type, true]);
    const spec = catalog(type);
    const field = (spec.view.label ?? spec.view.title ?? spec.view.row) as string;
    const card = await draw({ ...spec, data: { type: "inline", rows: rowsOf(spec).map((row) => ({ ...row, [field]: `${String(row[field])}${LONG}` })) } });
    const node = card.querySelector(names) as HTMLElement;
    // The full name is reachable: in the element's text (cut by CSS) or its title, and on the row's aria-label.
    expect([type, `${node.textContent ?? ""} ${node.title}`.includes(LONG.trim())]).toEqual([type, true]);
    if (type !== "list") {
      const stops = [...card.querySelectorAll('[tabindex="0"]')].map((n) => n.getAttribute("aria-label") ?? "");
      expect([type, stops.some((label) => label.includes(LONG.trim()))]).toEqual([type, true]);
    }
  });
});

describe("the name column is measured, not counted", () => {
  test("a column of short names is narrower than one of long names, and both stay within a third of the card", () => {
    const short = nameColumn(["East", "West"], 640);
    const long = nameColumn(["Enterprise customers", "Mid-market"], 640);
    expect(short.width).toBeLessThan(long.width);
    expect([short.width >= 34, long.width <= 640 * 0.34]).toEqual([true, true]);
    expect([short.shown, long.shown]).toEqual([["East", "West"], ["Enterprise customers", "Mid-market"]]);
  });

  test("narrow letters take less room than wide ones of the same count", () => {
    expect(nameColumn(["illi"], 640).width).toBeLessThan(nameColumn(["MWMW"], 640).width);
  });

  test("a cut name ends in an ellipsis and fits its room", () => {
    const cut = fitLabel(`Northern region${LONG}`, 80);
    expect(cut.endsWith("…")).toBe(true);
    expect(textWidth(cut)).toBeLessThanOrEqual(80);
    expect(fitLabel("East", 80)).toBe("East");
  });
});

describe("highlight on lifecycle and matrix", () => {
  test("lifecycle keeps the named rows in color and greys the rest", async () => {
    const spec = catalog("lifecycle");
    const name = String(rowsOf(spec)[0]?.[spec.view.label as string]);
    const card = await draw({ ...spec, view: { ...spec.view, highlight: name } });
    const lanes = [...card.querySelectorAll(".fft-lc-lane")];
    const lit = lanes.filter((lane) => !lane.hasAttribute("data-muted"));
    expect(lit.length).toBe(1);
    expect(lit[0]?.querySelector(".fft-lc-label")?.getAttribute("aria-label") ?? lit[0]?.querySelector(".fft-lc-label")?.textContent).toContain(name.slice(0, 3));
    const segments = [...card.querySelectorAll(".fft-lc-lane[data-muted] :is(.fft-lc-seg, .fft-lc-open)")] as SVGElement[];
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.every((seg) => seg.style.fill === "var(--fft-deemphasis)")).toBe(true);
  });

  test("matrix keeps a named row, or a named column, in color", async () => {
    const spec = catalog("matrix");
    const rows = rowsOf(spec);
    const [x, y] = [spec.view.x as string, spec.view.y as string];
    const line = String(rows[0]?.[y]);
    const byRow = await draw({ ...spec, view: { ...spec.view, highlight: line } });
    const marks = [...byRow.querySelectorAll(":is(.fft-mx-dot, .fft-mx-yes)")] as SVGElement[];
    const lit = marks.filter((m) => !m.hasAttribute("data-muted"));
    expect(lit.length).toBeGreaterThan(0);
    expect(lit.length).toBeLessThan(marks.length);
    expect(marks.filter((m) => m.hasAttribute("data-muted")).every((m) => m.style.fill === "var(--fft-deemphasis)")).toBe(true);
    expect([...byRow.querySelectorAll(".fft-mx-row[data-muted]")].length).toBe(new Set(rows.map((row) => String(row[y]))).size - 1);

    const column = String(rows[0]?.[x]);
    const byColumn = await draw({ ...spec, view: { ...spec.view, highlight: column } });
    const litColumn = [...byColumn.querySelectorAll(":is(.fft-mx-dot, .fft-mx-yes):not([data-muted])")];
    expect(litColumn.length).toBeGreaterThan(0);
    expect(litColumn.length).toBeLessThan(byColumn.querySelectorAll(":is(.fft-mx-dot, .fft-mx-yes)").length);
  });
});

describe("shared hover", () => {
  test.each(["dumbbell", "bullet", "history", "anomalies"])("%s: pointing at a row steps the others back", async (type) => {
    const card = await draw(catalog(type));
    const stops = [...card.querySelectorAll('[tabindex="0"]')].filter((node) => !node.closest(".fft-sr-only") && node.getAttribute("role") !== "region");
    stops[0]?.dispatchEvent(new Event("focus"));
    expect([type, card.querySelector('[data-active] [data-active], [data-active][data-active]') !== null, card.querySelector(".fft-body [data-active]") !== null]).toEqual([type, true, true]);
    stops[0]?.dispatchEvent(new Event("blur"));
    expect([type, card.querySelector(".fft-body [data-active]")]).toEqual([type, null]);
  });
});
