// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

/** Draws a spec split into small multiples by `panel`, and returns each panel's body. */
async function panels(rows: Row[], view: WidgetSpec["view"], shared = true): Promise<HTMLElement[]> {
  const target = document.createElement("div");
  document.body.append(target);
  await createWidget(target, { locale: "en-US", data: { type: "inline", rows }, facet: { field: "panel", columns: 2, ...(shared ? {} : { shared: false }) }, view } as WidgetSpec).ready;
  return [...target.querySelectorAll<HTMLElement>(".fft-facet-body")];
}

describe("small multiples share one scale", () => {
  test("heatmap: the same number takes the same shade in a panel whose range is far smaller; one key for the grid", async () => {
    const rows = [
      { panel: "A", day: "Mon", hour: "9", n: 10 },
      { panel: "A", day: "Mon", hour: "10", n: 100 },
      { panel: "B", day: "Mon", hour: "9", n: 10 },
      { panel: "B", day: "Mon", hour: "10", n: 20 },
    ];
    const [a, b] = await panels(rows, { type: "heatmap", x: "hour", y: "day", value: "n" });
    const step = (p: HTMLElement | undefined, i: number) => p?.querySelectorAll(".fft-cell:not(.fft-cell-empty)")[i]?.getAttribute("data-step");
    expect(step(a, 0)).toBe(step(b, 0));
    // 20 is near the bottom of the shared 10 to 100 range, not the top of its own 10 to 20.
    expect(Number(step(b, 1))).toBeLessThan(Number(step(a, 1)));
    expect(document.querySelectorAll(".fft-heat-legend")).toHaveLength(1);
  });

  test("heatmap: panels that keep their own scales each keep their own key", async () => {
    const rows = [
      { panel: "A", day: "Mon", hour: "9", n: 10 },
      { panel: "B", day: "Mon", hour: "9", n: 20 },
    ];
    await panels(rows, { type: "heatmap", x: "hour", y: "day", value: "n" }, false);
    expect(document.querySelectorAll(".fft-heat-legend")).toHaveLength(2);
  });

  test("calendar: the same daily figure takes the same shade in both panels", async () => {
    const rows = [
      { panel: "A", date: "2026-10-05", n: 10 },
      { panel: "A", date: "2026-10-06", n: 100 },
      { panel: "B", date: "2026-10-05", n: 10 },
      { panel: "B", date: "2026-10-06", n: 20 },
    ];
    const [a, b] = await panels(rows, { type: "calendar", date: "date", value: "n" });
    const steps = (p: HTMLElement | undefined) => [...(p?.querySelectorAll(".fft-day[data-step]") ?? [])].map((d) => d.getAttribute("data-step"));
    expect(steps(a)[0]).toBe(steps(b)[0]);
    expect(Number(steps(b)[1])).toBeLessThan(Number(steps(a)[1]));
    expect(document.querySelectorAll(".fft-heat-legend")).toHaveLength(1);
  });

  test("funnel: the same count is the same width in both panels, while each share stays its own", async () => {
    const rows = [
      { panel: "A", stage: "Visits", n: 1000 },
      { panel: "A", stage: "Signups", n: 500 },
      { panel: "B", stage: "Visits", n: 500 },
      { panel: "B", stage: "Signups", n: 250 },
    ];
    const [a, b] = await panels(rows, { type: "funnel", label: "stage", value: "n" });
    const widths = (p: HTMLElement | undefined) => [...(p?.querySelectorAll<HTMLElement>(".fft-funnel-bar") ?? [])].map((bar) => bar.style.width);
    // 500 is half the widest first stage in both panels.
    expect(widths(a)).toEqual(["100%", "50%"]);
    expect(widths(b)[0]).toBe("50%");
    expect(b?.querySelector(".fft-funnel-share")?.textContent).toBe("100%");
  });

  test("ridgeline: one value axis, and the same group draws the same ridge in both panels", async () => {
    const same = [3, 4, 5, 5, 6, 7];
    const rows = [
      ...same.map((v) => ({ panel: "A", team: "Ops", v })),
      ...[40, 50, 60].map((v) => ({ panel: "A", team: "Sales", v })),
      ...same.map((v) => ({ panel: "B", team: "Ops", v })),
    ];
    const [a, b] = await panels(rows, { type: "ridgeline", value: "v", group: "team" });
    const ticks = (p: HTMLElement | undefined) => [...(p?.querySelectorAll(".fft-tick-x") ?? [])].map((t) => t.textContent);
    expect(ticks(a)).toEqual(ticks(b));
    // Ops is the first lane in both panels, so its ridge line's heights must match point for point.
    const heights = (p: HTMLElement | undefined) => [...(p?.querySelector(".fft-ridge-line")?.getAttribute("d") ?? "").matchAll(/,(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
    expect(heights(a).length).toBeGreaterThan(10);
    expect(heights(a)).toEqual(heights(b));
  });

  test("matrix: the same size draws the same circle in a panel whose largest is smaller; one key for the grid", async () => {
    const rows = [
      { panel: "A", q: "Q1", topic: "AML", n: 10 },
      { panel: "A", q: "Q2", topic: "AML", n: 40 },
      { panel: "B", q: "Q1", topic: "AML", n: 10 },
      { panel: "B", q: "Q2", topic: "AML", n: 20 },
    ];
    const [a, b] = await panels(rows, { type: "matrix", x: "q", y: "topic", size: "n" });
    const radii = (p: HTMLElement | undefined) => [...(p?.querySelectorAll(".fft-mx-dot") ?? [])].map((c) => Number(c.getAttribute("r")));
    expect(radii(a)[0]).toBeCloseTo(radii(b)[0] as number, 5);
    expect(radii(b)[1]).toBeLessThan(radii(a)[1] as number);
    expect(document.querySelectorAll(".fft-mx-keys")).toHaveLength(1);
  });

  test("horizon: one band size, so the same distance fills the same bands in both panels", async () => {
    const rows = [
      { panel: "A", m: "2026-01", v: 10 },
      { panel: "A", m: "2026-02", v: 90 },
      { panel: "B", m: "2026-01", v: 10 },
      { panel: "B", m: "2026-02", v: 20 },
    ];
    const [a, b] = await panels(rows, { type: "horizon", x: "m", y: "v" });
    // Panel B never reaches past the first band of the shared step, where on its own scale it would fill all three.
    const bands = (p: HTMLElement | undefined) => new Set([...(p?.querySelectorAll(".fft-horizon-band") ?? [])].map((band) => band.getAttribute("data-band")));
    expect([...bands(b)]).toEqual(["0"]);
    expect(bands(a).size).toBeGreaterThan(1);
    expect(document.querySelectorAll(".fft-horizon-key")).toHaveLength(1);
  });
});
