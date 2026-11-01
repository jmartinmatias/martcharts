// @vitest-environment jsdom
/**
 * The ghost (`compare`): where a bar, a meter or a line stood before, drawn quieter behind today's mark, keyed, and
 * said in the tooltip with the change since, so what moved reads without a second chart.
 */
import { afterEach, describe, expect, test } from "vitest";
import type { WidgetSpec } from "../../core/types.ts";
import { validateSpec } from "../../core/validate.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

const rows = [
  { stage: "New", now: 120, before: 100 },
  { stage: "Won", now: 30, before: 40 },
];
const draw = async (spec: Partial<WidgetSpec>) => (await createWidget(document.body, { locale: "en-US", data: { type: "inline", rows }, ...spec } as WidgetSpec).ready, document.body);
const tooltip = () => [...document.querySelectorAll(".fft-tooltip-row")].map((row) => row.textContent);

afterEach(() => document.body.replaceChildren());

describe("hbar ghost", () => {
  test("a quieter bar behind each bar, on one scale with the bars, a key, and the change in the tooltip", async () => {
    await draw({ fields: { before: { label: "Last month" } }, view: { type: "hbar", label: "stage", value: "now", compare: "before" } });
    const ghosts = [...document.querySelectorAll<HTMLElement>(".fft-hbar-ghost")];
    expect(ghosts.map((g) => g.style.width)).toEqual(["83.3%", "33.3%"]);
    expect([...document.querySelectorAll(".fft-legend li")].map((li) => li.textContent)).toEqual(["Now", "Last month"]);
    document.querySelectorAll(".fft-hbar")[1]?.dispatchEvent(new Event("focus"));
    expect(tooltip()).toEqual(["30Now", "40Last month", "−25%Change"]);
    expect(document.querySelectorAll(".fft-hbar")[1]?.getAttribute("aria-label")).toBe("Won: 30, −25% since last month");
  });

  test("one value field only", () => {
    const problems = validateSpec({ data: { type: "inline", rows }, view: { type: "hbar", label: "stage", value: ["now", "before"], compare: "before" } } as WidgetSpec);
    expect(problems.map((p) => p.message).join(" ")).toMatch(/compare draws behind one bar per row/);
  });
});

describe("meter ghost", () => {
  test("a tick where the meter stood before, a key, and the change since", async () => {
    await draw({ data: { type: "inline", rows: [{ region: "East", now: 90, goal: 100, before: 60 }] }, fields: { before: { label: "August" } }, view: { type: "meter", label: "region", value: "now", target: "goal", compare: "before" } });
    expect(document.querySelector<HTMLElement>(".fft-meter-ghost")?.style.left).toBe("60%");
    expect(document.querySelector(".fft-legend")?.textContent).toBe("August");
    expect(document.querySelector(".fft-meter-track")?.getAttribute("aria-label")).toMatch(/\+50% since august$/);
  });
});

describe("line ghost", () => {
  test("a quiet grey line behind the first series, keyed, with the change in the tooltip", async () => {
    await draw({ data: { type: "inline", rows: [{ m: "2026-01", now: 10, ly: 8 }, { m: "2026-02", now: 12, ly: 12 }] }, fields: { ly: { label: "Last year" } }, view: { type: "line", x: "m", y: "now", compare: "ly" } });
    expect(document.querySelector(".fft-line-ghost")?.getAttribute("d")).toMatch(/^M/);
    expect([...document.querySelectorAll(".fft-legend li")].map((li) => li.textContent)).toContain("Last year");
    document.querySelectorAll(".fft-hit")[0]?.dispatchEvent(new Event("focus"));
    expect(tooltip()).toContain("+25%Change");
  });
});
