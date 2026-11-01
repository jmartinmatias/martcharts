// @vitest-environment jsdom
/**
 * The takeaway line: a chart's standout in one sentence under its subtitle, written from its rows, shown when the spec
 * or the host asks and otherwise kept for screen readers, so no chart is only a picture.
 */
import { afterEach, describe, expect, test } from "vitest";
import { takeawayOf } from "../core/explain.ts";
import type { WidgetSpec } from "../core/types.ts";
import { validateSpec } from "../core/validate.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

const rows = [
  { region: "North", revenue: 120 },
  { region: "East", revenue: 340 },
  { region: "South", revenue: 90 },
];
const bars = (extra: Partial<WidgetSpec> = {}): WidgetSpec => ({ title: "Revenue by region", data: { type: "inline", rows }, view: { type: "bar", x: "region", y: "revenue" }, ...extra });
const line = () => document.querySelector<HTMLElement>(".fft-takeaway");

afterEach(() => document.body.replaceChildren());

describe("takeawayOf", () => {
  test("names the standout without the guide's 'Here,'", () => {
    const said = takeawayOf(bars(), rows);
    expect(said).toMatch(/^East /);
    expect(said).not.toMatch(/Here/);
  });

  test("says nothing for a single number, a table's sort order, or no rows", () => {
    expect(takeawayOf({ data: { type: "inline", rows }, view: { type: "kpi", value: "revenue" } } as WidgetSpec, rows)).toBe("");
    expect(takeawayOf({ data: { type: "inline", rows }, view: { type: "table" } } as WidgetSpec, rows)).toBe("");
    expect(takeawayOf(bars(), [])).toBe("");
  });

  test("speaks French without its 'Ici,'", () => {
    const said = takeawayOf(bars({ locale: "fr-FR" }), rows);
    expect(said).toMatch(/East/);
    expect(said).not.toMatch(/^Ici/);
  });
});

describe("the card's line", () => {
  test("is for screen readers only by default, and describes the card", async () => {
    await createWidget(document.body, bars()).ready;
    expect(line()?.hidden).toBe(false);
    expect(line()?.classList.contains("fft-sr-only")).toBe(true);
    expect(document.querySelector(".fft-widget")?.getAttribute("aria-describedby")).toBe(line()?.id);
  });

  test("shows when the host turns takeaways on, unless the spec says false", async () => {
    await createWidget(document.body, bars(), { takeaway: true }).ready;
    expect(line()?.classList.contains("fft-sr-only")).toBe(false);
    document.body.replaceChildren();
    await createWidget(document.body, bars({ takeaway: false }), { takeaway: true }).ready;
    expect(line()?.classList.contains("fft-sr-only")).toBe(true);
  });

  test("takes the spec's own words, templates filled", async () => {
    await createWidget(document.body, bars({ takeaway: "East leads again." })).ready;
    expect(line()?.textContent).toBe("East leads again.");
    expect(line()?.classList.contains("fft-sr-only")).toBe(false);
  });

  test("is a known spec field", () => {
    expect(validateSpec(bars({ takeaway: true })).filter((issue) => /takeaway/.test(String(issue.message ?? issue)))).toEqual([]);
  });
});

describe("wording alone under a title", () => {
  test("a line names its measure instead of 'it'", () => {
    const spec = { data: { type: "inline", rows: [] }, view: { type: "line", x: "month", y: "revenue" } } as unknown as WidgetSpec;
    expect(takeawayOf(spec, [{ month: "2026-01", revenue: 1 }, { month: "2026-02", revenue: 2 }])).toMatch(/^Revenue went from/);
  });

  test("one row left after a filter is named, not counted", () => {
    const spec = { data: { type: "inline", rows: [] }, view: { type: "meter", label: "region", value: "revenue", target: "goal" } } as unknown as WidgetSpec;
    expect(takeawayOf(spec, [{ region: "East", revenue: 5, goal: 4 }])).toBe("East has reached its goal.");
  });
});
