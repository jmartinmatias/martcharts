// @vitest-environment jsdom
/**
 * Accessibility conformance: EN 301 549 v3.2.1 (the standard behind the
 * European Accessibility Act) requires WCAG 2.1 level AA for web content.
 * Every stored widget and a dashboard are rendered and checked with axe-core
 * against the WCAG 2.0, 2.1 and 2.2 A and AA rules. Contrast cannot be
 * measured in jsdom (no layout, no computed colors), so it is checked from the
 * theme tokens in contrast.test.ts instead.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { WidgetSpec } from "../core/types.ts";
import { createDashboard } from "./dashboard.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Serves /data/... from public/, as the dev server does. */
const localFetch = (async (input: RequestInfo | URL) => {
  const path = String(input).replace(/^https?:\/\/[^/]+/, "").split("?")[0] ?? "";
  try {
    const text = readFileSync(join("public", path), "utf8");
    return { ok: true, status: 200, json: async () => JSON.parse(text) } as Response;
  } catch {
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  }
}) as typeof fetch;

const stored: [string, WidgetSpec][] = readdirSync("widgets")
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => [name.slice(0, -".json".length), JSON.parse(readFileSync(join("widgets", name), "utf8")) as WidgetSpec]);

/** axe's findings for `root`, as "rule: target" lines, so a failure names what to fix. */
async function violations(root: Element): Promise<string[]> {
  const result = await axe.run(root, { runOnly: { type: "tag", values: TAGS }, rules: { "color-contrast": { enabled: false } } });
  return result.violations.flatMap((v) => v.nodes.map((node) => `${v.id}: ${node.target.join(" ")} (${v.help})`));
}

let target: HTMLElement;
beforeEach(() => {
  document.documentElement.lang = "en";
  document.body.innerHTML = "";
  target = document.createElement("main");
  document.body.append(target);
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("WCAG 2.1 AA (EN 301 549) with axe-core", () => {
  test("the check itself catches a nameless button and an unlabelled SVG role", async () => {
    target.innerHTML = '<button type="button"></button><svg role="img"></svg>';
    expect((await violations(target)).map((line) => line.split(":")[0])).toEqual(expect.arrayContaining(["button-name", "svg-img-alt"]));
  });

  test.each(stored)("widget %s draws, and has no violations", async (_id, spec) => {
    const widget = createWidget(target, spec, { fetch: localFetch, actions: ["expand", "csv", "image", "copy"] });
    await widget.ready;
    expect(widget.root.dataset.state).toBe("ready");
    expect(await violations(target)).toEqual([]);
  });

  test("a dashboard with a period control, a filter and sections has no violations", async () => {
    const widgets = Object.fromEntries(stored);
    const board = createDashboard(
      target,
      {
        id: "a11y",
        title: "Board",
        filters: [{ field: "region", label: "Region" }],
        range: { field: "month" },
        widgets: [{ section: "Revenue" }, { widget: "monthly-revenue", span: 2 }, { widget: "revenue-by-region" }, { section: "Customers" }, { widget: "top-customers" }],
      },
      { widgets, fetch: localFetch, actions: ["expand", "csv", "image", "copy"], sticky: true },
    );
    await board.ready;
    expect(await violations(target)).toEqual([]);
  });
});

/** Views that show their data as text already (a table, a list, numbers), so need no hidden table beside them. */
const TEXTUAL = new Set(["table", "list", "kpi", "kpis"]);
const styleSheet = readFileSync("src/dom/styles.ts", "utf8");

describe("structure and keyboard, for every stored widget", () => {
  test.each(stored)("%s: language, names, a data table and keyboard reach", async (_id, spec) => {
    const widget = createWidget(target, spec, { fetch: localFetch });
    await widget.ready;
    const root = widget.root;
    const body = root.querySelector(".fft-body") as HTMLElement;
    const problems: string[] = [];
    // 3.1.2: the widget's text is in the spec's language.
    if (spec.locale && root.getAttribute("lang") !== spec.locale) problems.push(`lang is ${root.getAttribute("lang")}, not ${spec.locale}`);
    // 1.1.1: every chart graphic has a name, or is hidden as decoration.
    for (const graphic of body.querySelectorAll("svg")) {
      const hidden = graphic.closest("[aria-hidden='true'], .fft-sr-only");
      if (!hidden && !graphic.getAttribute("aria-label") && !graphic.closest("[role='img'][aria-label]")) problems.push(`an svg.${graphic.getAttribute("class") ?? ""} has no name`);
    }
    // 1.3.1: the data is there as structure: a table or list, visible or for screen readers.
    const view = String(spec.view?.type);
    if (!TEXTUAL.has(view) && !body.querySelector(".fft-sr-only table, table, ol, ul, [role='list']")) problems.push(`${view} has no data table`);
    // 2.1.1: anything a pointer can inspect, the keyboard can reach.
    const pointable = body.querySelectorAll("[class*='hit'], .fft-day[data-step], .fft-cell, .fft-hbar, .fft-meter, .fft-bullet");
    if (pointable.length && !body.querySelector("[tabindex='0'], button, a[href], select")) problems.push(`${view} has marks to point at but none to tab to`);
    // 2.4.7: every focusable thing has a focus style.
    for (const node of root.querySelectorAll<HTMLElement>("[tabindex='0'], button")) {
      const name = node.getAttribute("class")?.split(" ")[0];
      if (name && !styleSheet.includes(`.${name}:focus-visible`) && !styleSheet.includes(`${name}:focus-visible`)) problems.push(`.${name} has no :focus-visible style`);
    }
    expect([...new Set(problems)]).toEqual([]);
  });
});

describe("content on hover or focus (1.4.13)", () => {
  const spec = stored.find(([id]) => id === "revenue-by-region")?.[1] as WidgetSpec;
  const tip = () => target.querySelector<HTMLElement>(".fft-tooltip") as HTMLElement;

  test("Escape dismisses a tooltip without moving focus, and stops there", async () => {
    const widget = createWidget(target, spec, { fetch: localFetch });
    await widget.ready;
    const mark = target.querySelector<HTMLElement>(".fft-hit") as HTMLElement;
    mark.focus();
    mark.dispatchEvent(new Event("focus"));
    const shown = !tip().hidden;
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    document.dispatchEvent(escape);
    expect([shown, tip().hidden, document.activeElement === mark, escape.defaultPrevented]).toEqual([true, true, true, true]);
  });

  test("in the expanded view, the first Escape takes the tooltip away and the second closes the dialog", async () => {
    const widget = createWidget(target, spec, { fetch: localFetch, actions: ["expand"] });
    await widget.ready;
    target.querySelector<HTMLButtonElement>('.fft-action[data-action="expand"]')?.click();
    const overlay = () => document.querySelector(".fft-overlay");
    await new Promise((resolve) => setTimeout(resolve, 0));
    const mark = overlay()?.querySelector<HTMLElement>(".fft-hit") as HTMLElement;
    mark.focus();
    mark.dispatchEvent(new Event("focus"));
    const bigTip = overlay()?.querySelector<HTMLElement>(".fft-tooltip") as HTMLElement;
    const escape = () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    escape();
    const afterFirst = [bigTip.hidden, Boolean(overlay())];
    escape();
    expect([afterFirst, Boolean(overlay())]).toEqual([[true, true], false]);
  });

  const mouse = (el: Element, type: string) => el.dispatchEvent(new PointerEvent(type, { pointerType: "mouse", pointerId: 1 }));
  const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

  test("a tooltip stays while the mouse moves from the mark onto it, and goes when the mouse leaves it", async () => {
    const widget = createWidget(target, spec, { fetch: localFetch });
    await widget.ready;
    const mark = target.querySelector<HTMLElement>(".fft-hit") as HTMLElement;
    mouse(mark, "pointerenter");
    mouse(mark, "pointerleave");
    mouse(tip(), "pointerenter");
    await settle();
    const kept = !tip().hidden;
    mouse(tip(), "pointerleave");
    expect([kept, tip().hidden]).toEqual([true, true]);
  });

  test("a mouse that leaves a mark for anywhere else lets the tooltip go after a moment", async () => {
    const widget = createWidget(target, spec, { fetch: localFetch });
    await widget.ready;
    const mark = target.querySelector<HTMLElement>(".fft-hit") as HTMLElement;
    mouse(mark, "pointerenter");
    mouse(mark, "pointerleave");
    const lingering = !tip().hidden;
    await settle();
    expect([lingering, tip().hidden]).toEqual([true, true]);
  });

  test("the tooltip can take the pointer, so it can be hovered", () => {
    const block = styleSheet.slice(styleSheet.indexOf(".fft-tooltip {"), styleSheet.indexOf("}", styleSheet.indexOf(".fft-tooltip {")));
    expect(block).not.toContain("pointer-events: none");
  });
});

describe("color is never the only signal (1.4.1)", () => {
  const byId = Object.fromEntries(stored);

  test("candlesticks: up candles are hollow and down candles filled, and the legend shows the same", async () => {
    const widget = createWidget(target, byId["share-price"] as WidgetSpec, { fetch: localFetch });
    await widget.ready;
    const swatches = [...target.querySelectorAll<HTMLElement>(".fft-legend .fft-swatch")].slice(0, 2).map((s) => s.dataset.shape);
    expect(swatches).toEqual(["hollow", "rect"]);
    expect(styleSheet).toMatch(/\.fft-candle\[data-tone="up"\] \.fft-candle-body \{[^}]*fill: var\(--fft-ring, var\(--fft-surface\)\)/);
  });

  test("horizon: values above the baseline rise from each row's foot, those below hang from its top", async () => {
    const widget = createWidget(target, byId["region-plan-horizon"] as WidgetSpec, { fetch: localFetch });
    await widget.ready;
    const ys = (selector: string) => [...(target.querySelector(selector)?.getAttribute("d") ?? "").matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => Number(m[2]));
    const row = target.querySelector('.fft-horizon-row[data-series="South"] .fft-horizon-track');
    const top = Number(row?.getAttribute("y"));
    const bottom = top + Number(row?.getAttribute("height"));
    const up = ys('.fft-horizon-row[data-series="South"] path[data-sign="up"]');
    const down = ys('.fft-horizon-row[data-series="South"] path[data-sign="down"]');
    expect([Math.max(...up), Math.min(...down)]).toEqual([bottom, top]);
    expect([...target.querySelectorAll(".fft-horizon-key-text")].map((t) => t.textContent).slice(0, 2)).toEqual(["Above plan, rising", "Below plan, hanging"]);
  });
});

describe("focus not obscured (2.4.11)", () => {
  test("a pinned filter row reserves its height on the page, so a focused card never hides beneath it", async () => {
    let measure: (() => void) | undefined;
    const original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(callback: () => void) {
        measure = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    try {
      const board = createDashboard(target, { widgets: [{ section: "A" }, { widget: "revenue-kpi" }, { section: "B" }] }, { widgets: Object.fromEntries(stored), fetch: localFetch, sticky: true });
      await board.ready;
      Object.defineProperty(target.querySelector(".fft-filters"), "offsetHeight", { configurable: true, value: 96 });
      measure?.();
      const page = document.documentElement.style.getPropertyValue("--fft-filters-height");
      board.destroy();
      expect([page, document.documentElement.style.getPropertyValue("--fft-filters-height")]).toEqual(["96px", ""]);
      expect(styleSheet).toMatch(/:root:has\(\.fft-dashboard\[data-sticky\]\) \{ scroll-padding-top: calc\(var\(--fft-filters-height/);
    } finally {
      globalThis.ResizeObserver = original;
    }
  });
});

describe("the filter row reads in one direction (1.3.2, 2.4.3)", () => {
  const rule = (selector: string) => styleSheet.slice(styleSheet.indexOf(`${selector} {`), styleSheet.indexOf("}", styleSheet.indexOf(`${selector} {`)));

  test("the section links take their own line, starting at the left edge with everything else", () => {
    const nav = rule(".fft-board-nav");
    expect([nav.includes("flex: 1 0 100%"), nav.includes("justify-content: flex-start"), nav.includes("margin-left: auto"), nav.includes("flex-end")]).toEqual([true, true, false, false]);
  });
});

describe("focus order (2.4.3)", () => {
  test("within a card, Tab reaches the toolbar first, then the chart, and the ghost ref last, as they read top to bottom", async () => {
    const spec = stored.find(([id]) => id === "revenue-by-region")?.[1] as WidgetSpec;
    const widget = createWidget(target, spec, { fetch: localFetch, actions: ["expand", "csv"] });
    await widget.ready;
    const order = [...widget.root.querySelectorAll<HTMLElement>("button, [tabindex='0']")].filter((el) => !el.hidden).map((el) => el.getAttribute("class")?.split(" ")[0]);
    expect([order[0], order.at(-1), order.indexOf("fft-hit") > order.lastIndexOf("fft-action")]).toEqual(["fft-action", "fft-widget-ref", true]);
  });
});

describe("a pressed toggle shows its state by more than color (1.4.1, 1.4.11)", () => {
  const rule = (selector: string) => styleSheet.slice(styleSheet.indexOf(`${selector} {`), styleSheet.indexOf("}", styleSheet.indexOf(`${selector} {`)));

  test("the chosen period carries an accent bar along its foot", () => {
    expect(rule('.fft-range button[aria-pressed="true"]')).toContain("inset 0 -2px 0 var(--fft-accent)");
  });

  test("the chosen section turns semibold, each chip reserving that width so nothing shifts", async () => {
    const board = createDashboard(target, { id: "t", widgets: [{ section: "One" }, { widget: "revenue-kpi" }, { section: "Two" }] }, { widgets: Object.fromEntries(stored), fetch: localFetch });
    await board.ready;
    const chips = [...target.querySelectorAll<HTMLButtonElement>(".fft-board-nav button")];
    expect(chips.map((chip) => chip.dataset.label === chip.textContent)).toEqual([true, true, true]);
    expect(rule('.fft-board-nav button[aria-pressed="true"]')).toContain("font-weight: 600");
    // Its alt text is empty, so a screen reader still hears the label once.
    expect(rule(".fft-board-nav button::after")).toContain('content: attr(data-label) / "";');
  });
});

describe("the expanded view keeps focus inside while open (2.1.2, 2.4.3)", () => {
  test("Tab from the last control comes back to the first, and Shift+Tab from the first goes to the last", async () => {
    const spec = stored.find(([id]) => id === "revenue-by-region")?.[1] as WidgetSpec;
    const widget = createWidget(target, spec, { fetch: localFetch, actions: ["expand", "csv"] });
    await widget.ready;
    target.querySelector<HTMLButtonElement>('.fft-action[data-action="expand"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const overlay = document.querySelector(".fft-overlay") as HTMLElement;
    const stops = [...overlay.querySelectorAll<HTMLElement>("button:not([disabled]), [tabindex='0'], select, a[href]")].filter((el) => !el.hidden && !el.closest("[hidden]"));
    const tab = (shiftKey: boolean) => document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true }));
    stops.at(-1)?.focus();
    tab(false);
    const wrappedForward = document.activeElement === stops[0];
    tab(true);
    expect([stops.length > 1, wrappedForward, document.activeElement === stops.at(-1)]).toEqual([true, true, true]);
    document.querySelector<HTMLButtonElement>(".fft-overlay-close")?.click();
  });
});

