// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { explainChart } from "../../core/explain.ts";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { validateSpec } from "../../core/validate.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
});

async function draw(spec: Omit<WidgetSpec, "data"> & { rows: Row[] }) {
  const { rows, ...rest } = spec;
  await createWidget(target, { locale: "en-US", data: { type: "inline", rows }, ...rest } as WidgetSpec).ready;
  expect(target.querySelector(".fft-widget")?.getAttribute("data-state")).toBe("ready");
}

const all = (selector: string) => [...target.querySelectorAll(selector)];
const texts = (selector: string) => all(selector).map((node) => node.textContent);

const seats = [
  { party: "Green Alliance", seats: 72 },
  { party: "Social Democrats", seats: 168 },
  { party: "Liberal Centre", seats: 95 },
  { party: "Civic Union", seats: 184 },
  { party: "National Front", seats: 81 },
];
const spec = { rows: seats, view: { type: "donut", label: "party", value: "seats", arc: "half", majority: true } };

describe("election donut (arc half)", () => {
  test("a half ring: the first slice starts at nine o'clock and the last ends at three, so the figure is about half as tall as it is wide", async () => {
    await draw(spec);
    const slices = all("path.fft-slice") as SVGPathElement[];
    expect(slices.length).toBe(5);
    // In jsdom the figure takes the 233px step: a ring 21px thick, radius 106, centered at x 116.5 and, under the
    // majority label's 18px, y 134.5. Nine o'clock is x 10.5; three o'clock is x 222.5.
    expect(slices[0]?.getAttribute("d")).toMatch(/^M10\.5,13[34]/);
    expect(slices[4]?.getAttribute("d")).toMatch(/222\.5,13[34]/);
    const figure = target.querySelector(".fft-donut-figure") as HTMLElement;
    expect([figure.dataset.arc, figure.style.width, figure.style.height]).toEqual(["half", "233px", "146px"]);
    expect(all("path.fft-donut-track").length).toBe(1);
    expect(target.querySelector(".fft-donut svg")?.getAttribute("aria-label")).toBe("Half donut chart of Seats by Party");
  });

  test("the center reads N seats when the value field counts seats", async () => {
    await draw(spec);
    expect([...texts(".fft-donut-total"), ...texts(".fft-donut-caption")]).toEqual(["600", "seats"]);
  });

  test("majority draws a tick at the top labelled with the seats it takes, and the crossing slice says so", async () => {
    await draw(spec);
    const tick = target.querySelector(".fft-donut-majority") as SVGLineElement;
    expect([tick.getAttribute("x1"), tick.getAttribute("x2")]).toEqual(["116.5", "116.5"]);
    expect(texts(".fft-donut-majority-label")).toEqual(["Majority 301"]);
    // 72 + 168 = 240, then Liberal Centre takes the running total past 301.
    const hits = all("path.fft-slice-hit");
    expect(hits.map((h) => h.getAttribute("aria-label"))).toEqual([
      "Green Alliance: 72, 12%",
      "Social Democrats: 168, 28%",
      "Liberal Centre: 95, 16%, crosses the majority",
      "Civic Union: 184, 31%",
      "National Front: 81, 14%",
    ]);
    hits[2]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row")).toEqual(["95Seats", "16%Share", "Crosses itMajority"]);
  });

  test("without majority there is no tick and the ring sits at the top of its box", async () => {
    await draw({ rows: seats, view: { type: "donut", label: "party", value: "seats", arc: "half" } });
    expect([all(".fft-donut-majority").length, (target.querySelector(".fft-donut-figure") as HTMLElement).style.height]).toEqual([0, "128px"]);
  });

  test("a full donut is unchanged: a circle track, slices from twelve o'clock, the value's label under the total", async () => {
    await draw({ rows: seats, view: { type: "donut", label: "party", value: "seats" } });
    expect([all("circle.fft-donut-track").length, all(".fft-donut-majority").length, ...texts(".fft-donut-caption")]).toEqual([1, 0, "Seats"]);
    expect((target.querySelector(".fft-donut-figure") as HTMLElement).style.height).toBe("233px");
  });

  test("majority on a full ring is an error, since the halfway point is only a place on a half ring", () => {
    const issues = validateSpec({ data: { type: "inline", rows: seats }, view: { type: "donut", label: "party", value: "seats", majority: true } } as WidgetSpec, seats);
    expect(issues.map((i) => i.message)).toContain('majority marks a half ring: set arc to "half" too.');
  });

  test("the guide reads the half ring left to right and names the halfway mark", () => {
    const full: WidgetSpec = { locale: "en-US", data: { type: "inline", rows: seats }, view: spec.view };
    expect(explainChart(full, seats)).toBe(
      "The half ring is the whole, read from left to right. Each slice is one party: the wider the slice, the more seats. The small line at the top is the halfway mark: whoever reaches it from the left has a majority. Here, Civic Union is the biggest slice, with 31% of the whole, not enough for a majority of 301 on its own.",
    );
  });
});
