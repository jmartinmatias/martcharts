// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { explainChart } from "../../core/explain.ts";
import { questionOf } from "../../core/question.ts";
import { recommendCharts } from "../../core/recommend.ts";
import { validateSpec } from "../../core/validate.ts";
import { createWidget } from "../widget.ts";
import { stageTint } from "./lifecycle.ts";
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
const press = (node: Element, key: string) => node.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

const rules = [
  { name: "DORA", topic: "Resilience", status: "Applies", impact: 5, proposed: "2020-09-24", adopted: "2022-11-28", inForce: "2023-01-16", applies: "2025-01-17" },
  { name: "PSD3", topic: "Payments", status: "Adopted", impact: 4, proposed: "2023-06-28", adopted: "2026-03-18", inForce: null, applies: null },
  { name: "FiDA", topic: "Payments", status: "Consultation", impact: 2, proposed: "2023-06-28", adopted: null, inForce: null, applies: null },
];
const view = { type: "lifecycle", label: "name", stages: ["proposed", "adopted", "inForce", "applies"], group: "topic", status: "status", impact: "impact", today: "2026-10-25" };

describe("lifecycle view", () => {
  test("one lane per row: a segment from each stage to the next, a faint open run after the last known stage, a tick per date", async () => {
    await draw({ rows: rules, view });
    const lanes = all(".fft-lc-lane");
    expect(lanes.length).toBe(3);
    expect(lanes.map((lane) => lane.querySelectorAll(".fft-lc-seg").length)).toEqual([3, 1, 0]);
    expect(lanes.map((lane) => lane.querySelectorAll(".fft-lc-open").length)).toEqual([1, 1, 1]);
    expect(lanes.map((lane) => lane.querySelectorAll(".fft-lc-tick").length)).toEqual([4, 2, 1]);
    expect(texts(".fft-lc-label")).toEqual(["DORA", "PSD3", "FiDA"]);
  });

  test("stages deepen in tint from first to last, and the open run reaches the plot's right edge", async () => {
    await draw({ rows: rules, view });
    const segs = [...(all(".fft-lc-lane")[0]?.querySelectorAll(".fft-lc-seg") ?? [])];
    expect(segs.map((seg) => Number(seg.getAttribute("fill-opacity")))).toEqual([0.3, 0.53, 0.77]);
    expect([stageTint(0, 4), stageTint(3, 4), stageTint(0, 1)]).toEqual([0.3, 1, 1]);
    const open = all(".fft-lc-open")[1] as SVGRectElement;
    const svg = target.querySelector(".fft-lifecycle svg") as SVGSVGElement;
    const width = Number(svg.getAttribute("width"));
    expect(Number(open.getAttribute("x")) + Number(open.getAttribute("width"))).toBeLessThan(width);
    expect(Number(open.getAttribute("width"))).toBeGreaterThan(10);
  });

  test("groups head their rows, statuses sit in pills at the end, and impact sets the thickness", async () => {
    await draw({ rows: rules, view });
    expect(texts(".fft-lc-group")).toEqual(["Resilience", "Payments"]);
    expect(texts(".fft-lc-status-text")).toEqual(["Applies", "Adopted", "Consultation"]);
    const heights = all(".fft-lc-lane").map((lane) => Number((lane.querySelector(".fft-lc-seg, .fft-lc-open") as Element).getAttribute("height")));
    expect(heights).toEqual([15, 13, 9]);
    expect(texts(".fft-lc-note")).toEqual(["Thicker rows: higher impact."]);
  });

  test("today is marked, and the key names every stage and the open run", async () => {
    await draw({ rows: rules, view });
    expect(texts(".fft-gantt-today-label")).toEqual(["Today"]);
    expect(texts(".fft-lc-key li")).toEqual(["Proposed", "Adopted", "In force", "Applies", "Still running"]);
  });

  test("each lane is a keyboard stop that reads its dates, what comes next, its status and impact; Enter selects", async () => {
    await draw({ rows: [{ ...rules[1], inForce: "2027-01-10" }, rules[0] as Row], view });
    const hits = all(".fft-lc-hit");
    expect(hits.map((hit) => hit.getAttribute("tabindex"))).toEqual(["0", "-1"]);
    expect(hits[0]?.getAttribute("aria-label")).toBe("PSD3: Proposed Jun 28, 2023, Adopted Mar 18, 2026, In force Jan 10, 2027, Next In force in 77 days, Status Adopted, Impact 4");
    hits[0]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-title")).toEqual(["PSD3"]);
    expect(texts(".fft-tooltip-row")).toContain("In force in 77 daysNext");
    const seen: Row[] = [];
    target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
    press(hits[1] as Element, "Enter");
    expect(seen).toEqual([rules[0]]);
  });

  test("a long span ticks by year; a short one by month", async () => {
    await draw({ rows: rules, view });
    expect(texts(".fft-lc-tick-label").every((t) => /^\d{4}$/.test(t ?? ""))).toBe(true);
    document.body.innerHTML = "";
    target = document.createElement("div");
    document.body.append(target);
    await draw({ rows: [{ name: "A", s1: "2026-01-05", s2: "2026-03-20", s3: "2026-05-01" }], view: { type: "lifecycle", label: "name", stages: ["s1", "s2", "s3"] } });
    expect(texts(".fft-lc-tick-label")[0]).toBe("Jan 2026");
  });

  test("rows with no date at all are left out, and the hidden table carries label, stages, status, group and impact", async () => {
    await draw({ rows: [...rules, { name: "Ghost", topic: "Payments", status: "Idea", impact: 1, proposed: null, adopted: null, inForce: null, applies: null }], view });
    expect(all(".fft-lc-lane").length).toBe(3);
    expect(texts(".fft-sr-only th").slice(0, 8)).toEqual(["Name", "Proposed", "Adopted", "In force", "Applies", "Status", "Topic", "Impact"]);
  });

  test("validation wants two stages and a real today; data checks flag dates out of order", () => {
    const issues = validateSpec({ data: { type: "inline", rows: [] }, view: { type: "lifecycle", label: "n", stages: "a", today: "soon" } }).map((i) => i.message);
    expect(issues.join(" ")).toContain("at least two date fields");
    expect(issues.join(" ")).toContain("YYYY-MM-DD");
    const rows = [{ n: "X", a: "2026-02-01", b: "2025-01-01" }];
    const warnings = validateSpec({ data: { type: "inline", rows }, view: { type: "lifecycle", label: "n", stages: ["a", "b"] } }, rows).map((i) => i.message);
    expect(warnings.join(" ")).toContain("out of order: X");
  });

  test("the guide, the question and the recommendation know the lifecycle", () => {
    const spec = { data: { type: "inline", rows: rules }, view } as WidgetSpec;
    expect(explainChart(spec, rules)).toContain("Each colored stretch is one stage, proposed, adopted, in force and applies in turn");
    expect(explainChart(spec, rules)).toContain("The upright line is today, the word at the end of a row is its status, a thicker row means a higher impact.");
    expect(explainChart(spec, rules)).toContain("Here, 1 of 3 names has reached applies. PSD3 moved last, to adopted on 2026-03-18.");
    // A field called name says nothing about what the rows are: they are entries, unless the title says ("… by regulation").
    expect(questionOf(spec, rules).text).toBe("Where does each entry stand, from proposed to applies?");
    expect(questionOf({ ...spec, title: "Status by regulation" }, rules).text).toBe("Where does each regulation stand, from proposed to applies?");
    const pick = recommendCharts(rules).find((p) => p.type === "lifecycle");
    expect(pick?.view).toEqual({ type: "lifecycle", label: "name", stages: ["proposed", "adopted", "inForce", "applies"], group: "topic", status: "status", impact: "impact", today: true });
  });
});
