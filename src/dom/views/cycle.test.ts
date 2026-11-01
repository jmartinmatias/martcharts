// @vitest-environment jsdom
/**
 * The cycle plot: dated readings folded into one panel per day of the week (or month), each with its own line and its
 * average, so the weekly rhythm and the trend inside each day read apart.
 */
import { afterEach, describe, expect, test } from "vitest";
import { cyclePanels, cycleStandout } from "../../core/cycle.ts";
import { explainChart } from "../../core/explain.ts";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

// Four weeks from Monday 5 January 2026: weekdays near 100 and growing, weekends near 40.
const rows: Row[] = Array.from({ length: 28 }, (_, i) => {
  const date = new Date(Date.UTC(2026, 0, 5 + i));
  const weekend = i % 7 >= 5;
  return { day: date.toISOString().slice(0, 10), orders: (weekend ? 40 : 100) + Math.floor(i / 7) * 5 + (i % 7 === 2 ? 20 : 0) };
});
const spec = (extra: Record<string, unknown> = {}): WidgetSpec => ({ locale: "en-US", data: { type: "inline", rows }, fields: { orders: { label: "Orders" } }, view: { type: "cycle", x: "day", value: "orders", ...extra } }) as WidgetSpec;

afterEach(() => document.body.replaceChildren());

describe("cyclePanels", () => {
  test("daily dates fold Monday to Sunday, each panel in date order with its average", () => {
    const { by, panels } = cyclePanels(rows, "day", "orders", undefined, "en-US");
    expect(by).toBe("weekday");
    expect(panels.map((p) => p.short)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(panels[2]?.mean).toBe(127.5);
    expect(panels[0]?.readings.map((r) => r.date)).toEqual(["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26"]);
    expect(cycleStandout(panels)).toMatchObject({ high: { long: "Wednesday" }, low: { long: "Saturday" }, grew: 7 });
  });

  test("monthly dates fold January to December", () => {
    const months = ["2024-01", "2024-02", "2025-01", "2025-02"].map((month, i) => ({ month, v: i }));
    expect(cyclePanels(months, "month", "v", undefined, "en-US").panels.map((p) => [p.short, p.readings.length])).toEqual([["Jan", 2], ["Feb", 2]]);
  });
});

describe("the cycle view", () => {
  test("one panel, one line and one average bar per day, the strongest day's name set apart", async () => {
    await createWidget(document.body, spec()).ready;
    expect(document.querySelectorAll(".fft-cycle-panel")).toHaveLength(7);
    expect(document.querySelectorAll(".fft-cycle-line")).toHaveLength(7);
    expect(document.querySelectorAll(".fft-cycle-mean")).toHaveLength(7);
    expect(document.querySelector(".fft-cycle-name[data-high]")?.textContent).toBe("Wed");
  });

  test("each panel is a stop for keys and the tooltip: its average, first to last, and how many readings", async () => {
    await createWidget(document.body, spec()).ready;
    const hit = document.querySelectorAll(".fft-cycle-hit")[2];
    expect(hit?.hasAttribute("tabindex")).toBe(true);
    hit?.dispatchEvent(new Event("focus"));
    expect([...document.querySelectorAll(".fft-tooltip-row")].map((row) => row.textContent)).toEqual(["128Average", "120 → 135First to last", "4Count"]);
  });

  test("its guide reads the rhythm and the trend, in English, French and German", () => {
    expect(explainChart(spec(), rows)).toMatch(/Wednesdays are highest, averaging 128 orders, and Saturdays lowest, at 48; every day grew over the period\./);
    expect(explainChart({ ...spec(), locale: "fr-FR" }, rows)).toMatch(/la plus haute le mercredi/);
    expect(explainChart({ ...spec(), locale: "de-DE" }, rows)).toMatch(/am Mittwoch am höchsten/);
  });
});
