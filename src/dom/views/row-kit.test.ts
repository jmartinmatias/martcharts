// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

/** The row views that draw on the shared kit (WP3), each with its catalog example. */
const VIEWS = ["hbar", "dot", "dumbbell", "slope", "bump", "variance", "bullet", "meter", "funnel", "strips", "lifecycle", "pyramid", "timeline", "likert", "boxplot", "ridgeline", "horizon", "beeswarm", "list", "board", "history", "anomalies", "whitespace", "matrix"];
/** A list is itself the readable content, so it carries no second, hidden copy and no tooltip. */
const PLAIN = new Set(["list"]);

const catalog = (type: string) => JSON.parse(readFileSync(`catalog/${type}.json`, "utf8")) as WidgetSpec;
const rowsOf = (spec: WidgetSpec) => spec.data.rows as Row[];

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
});

async function draw(spec: WidgetSpec) {
  target.replaceChildren();
  await createWidget(target, { ...spec, locale: "en-US" }).ready;
  return target.querySelector(".fft-widget") as HTMLElement;
}

describe("every row view carries the shared behaviours", () => {
  test.each(VIEWS)("%s: drawn from its catalog example, readable by keyboard and screen reader", async (type) => {
    const card = await draw(catalog(type));
    expect([type, card.getAttribute("data-state"), card.querySelector(".fft-message")?.textContent ?? ""]).toEqual([type, "ready", ""]);
    const body = card.querySelector(".fft-body") as HTMLElement;
    // Keyboard: at least one mark takes focus, and Enter on it reports the row.
    const stops = [...body.querySelectorAll<HTMLElement | SVGElement>('[tabindex="0"]')].filter((node) => !node.closest(".fft-sr-only"));
    expect([type, stops.length > 0]).toEqual([type, true]);
    const picked: unknown[] = [];
    target.addEventListener("fft-select", (event) => picked.push((event as CustomEvent).detail.row));
    const stop = stops.find((node) => node.getAttribute("role") !== "region") as Element;
    stop.dispatchEvent(new Event("focus"));
    stop.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect([type, picked.length]).toEqual([type, 1]);
    if (PLAIN.has(type)) return;
    // Screen readers get the data as a table; sighted readers get a tooltip on focus.
    expect([type, body.querySelectorAll(".fft-sr-only table").length > 0]).toEqual([type, true]);
    expect([type, (card.querySelector(".fft-tooltip-title")?.textContent ?? "").length > 0]).toEqual([type, true]);
    // Marks come in one after another: every view staggers its entrance.
    expect([type, body.innerHTML.includes("--fft-i")]).toEqual([type, true]);
  });

  test.each(VIEWS)("%s: one row draws without an error", async (type) => {
    const spec = catalog(type);
    const card = await draw({ ...spec, data: { type: "inline", rows: rowsOf(spec).slice(0, 1) } });
    expect([type, card.getAttribute("data-state")]).toEqual([type, "ready"]);
  });
});

describe("highlight steps the other rows back", () => {
  test.each([
    ["dumbbell", ".fft-db-row"],
    ["pyramid", ".fft-pyr-row"],
    ["funnel", ".fft-funnel-row"],
    ["strips", ".fft-strip"],
  ])("%s keeps the named row in color", async (type, rowClass) => {
    const spec = catalog(type);
    const label = String(spec.view.label);
    const first = String(rowsOf(spec)[0]?.[label]);
    const card = await draw({ ...spec, view: { ...spec.view, highlight: first } });
    const rows = [...card.querySelectorAll(rowClass)];
    expect(rows.length).toBeGreaterThan(1);
    expect(rows[0]?.hasAttribute("data-muted")).toBe(false);
    expect(rows.slice(1).every((row) => row.hasAttribute("data-muted"))).toBe(true);
  });

  test("with no highlight, nothing is muted", async () => {
    const card = await draw(catalog("funnel"));
    expect(card.querySelectorAll("[data-muted]")).toHaveLength(0);
  });
});

describe("small multiples", () => {
  /** A catalog example split in two panels by a made-up field, every other row in each. */
  const faceted = (type: string): WidgetSpec => {
    const spec = catalog(type);
    const rows = rowsOf(spec).map((row, i) => ({ ...row, panel: i % 2 ? "B" : "A" }));
    return { ...spec, data: { type: "inline", rows }, facet: { field: "panel" } };
  };

  test.each(["dot", "strips", "timeline", "dumbbell", "matrix", "board", "history"])("%s draws no legend of its own inside a panel", async (type) => {
    const card = await draw(faceted(type));
    expect(card.querySelectorAll(".fft-facet").length).toBe(2);
    expect([type, card.querySelectorAll(".fft-facet .fft-legend").length]).toEqual([type, 0]);
  });

  test.each(["dumbbell", "boxplot", "beeswarm", "slope"])("%s panels read one shared scale when the widget passes one", async (type) => {
    // Rendered directly, as the widget does inside a panel: once alone, once with a shared extent ten times wider.
    const spec = catalog(type);
    const { getBlock } = await import("../../core/registry.ts");
    const render = getBlock("view", type).render as NonNullable<ReturnType<typeof getBlock<"view">>["render"]>;
    const values = rowsOf(spec).flatMap((row) => Object.values(row)).filter((v): v is number => typeof v === "number");
    /** How far the marks (dots, bars, boxes, lines) spread across the chart, in pixels, along both axes. */
    const spread = (extent?: number[]) => {
      const el = document.createElement("div");
      target.append(el);
      render({
        el,
        rows: rowsOf(spec),
        view: spec.view,
        spec: { ...spec, locale: "en-US" },
        width: 600,
        height: 300,
        label: (field) => field,
        format: (value) => String(value),
        cell: (value) => document.createTextNode(String(value)),
        color: (i) => `var(--fft-series-${i + 1})`,
        tooltip: { show() {}, hide() {} },
        select() {},
        ...(extent ? { extent } : {}),
      });
      const marks = [...el.querySelectorAll("circle, line:not(.fft-gridline):not(.fft-baseline):not([class*='axis']), rect:not([class$='-hit'])")];
      const along = (names: string[]) => {
        const numbers = marks.flatMap((mark) => names.map((name) => Number(mark.getAttribute(name)))).filter((n) => Number.isFinite(n) && n !== 0);
        return numbers.length ? Math.max(...numbers) - Math.min(...numbers) : 0;
      };
      return [along(["cx", "x", "x1", "x2"]), along(["cy", "y", "y1", "y2"])] as const;
    };
    const alone = spread();
    const shared = spread([Math.max(...values) * 10]);
    // On a scale stretched toward the shared extent, the same marks crowd into less room along the value axis:
    // across for dumbbells, swarms and boxes, up and down for slopes. (A swarm may stack taller as it crowds.)
    expect([type, shared[0] < alone[0] || shared[1] < alone[1]]).toEqual([type, true]);
  });
});
