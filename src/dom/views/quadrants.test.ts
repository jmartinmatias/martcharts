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
const num = (node: Element | undefined, attr: string) => Number(node?.getAttribute(attr));

const rules = [
  { name: "DORA", pressure: 86, impact: 5 },
  { name: "AI Act", pressure: 92, impact: 5 },
  { name: "ESAP", pressure: 35, impact: 2 },
  { name: "SFDR 2", pressure: 63, impact: 4 },
  { name: "ELTIF 2", pressure: 29, impact: 2 },
  { name: "FiDA", pressure: 40, impact: 4 },
];
const quadrants = { x: 60, y: 3.5, labels: ["Prepare", "Act now", "Monitor", "Watch"] };
const view: WidgetSpec["view"] = { type: "scatter", x: "pressure", y: "impact", label: "name", quadrants };

describe("scatter quadrants", () => {
  test("two dashed hairlines split the plot at the x and y given, and four faint words sit in the corners", async () => {
    await draw({ rows: rules, view });
    const lines = all("line.fft-quadrant-line");
    expect(lines).toHaveLength(2);
    const [vertical, horizontal] = lines as [SVGLineElement, SVGLineElement];
    expect(num(vertical, "x1")).toBe(num(vertical, "x2"));
    expect(num(horizontal, "y1")).toBe(num(horizontal, "y2"));
    expect(texts(".fft-quadrant-label")).toEqual(["Prepare", "Act now", "Monitor", "Watch"]);
    // A dot right of the vertical line has more pressure than 60; one above the horizontal line has more impact than 3.5.
    const dots = all("circle.fft-point");
    const aiAct = dots.find((d) => d.getAttribute("data-label") === "AI Act");
    const esap = dots.find((d) => d.getAttribute("data-label") === "ESAP");
    expect(num(aiAct, "cx") > num(vertical, "x1") && num(aiAct, "cy") < num(horizontal, "y1")).toBe(true);
    expect(num(esap, "cx") < num(vertical, "x1") && num(esap, "cy") > num(horizontal, "y1")).toBe(true);
  });

  test("the split stretches the axes to keep both lines in view", async () => {
    await draw({ rows: rules.filter((r) => r.pressure > 60), view });
    const vertical = all("line.fft-quadrant-line")[0] as SVGLineElement;
    const ticks = all(".fft-tick-x").map((t) => Number(t.getAttribute("x")));
    expect(num(vertical, "x1")).toBeGreaterThanOrEqual(Math.min(...ticks));
  });

  test("tooltips name the quadrant, and the hidden table gains a Quadrant column", async () => {
    await draw({ rows: rules, view });
    const hits = all(".fft-point-hit");
    hits[1]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row").at(-1)).toBe("Act nowQuadrant");
    expect(texts(".fft-sr-only th")).toEqual(["Name", "Pressure", "Impact", "Quadrant"]);
    expect(texts(".fft-sr-only tbody tr:nth-child(3) td").at(-1)).toBe("Watch");
    expect(texts(".fft-sr-only tbody tr:nth-child(6) td").at(-1)).toBe("Prepare");
  });

  test("labels: true writes the names beside the dots, skipping a name that would land on another", async () => {
    await draw({ rows: rules, view: { ...view, labels: true } });
    const names = texts(".fft-point-label");
    expect(names).toContain("AI Act");
    expect(names).toContain("ESAP");
    expect(names.length).toBeLessThanOrEqual(rules.length);
    // The two dots at impact 5 sit close: at most one name each, none twice.
    expect(new Set(names).size).toBe(names.length);
    target.replaceChildren();
    await draw({ rows: rules, view: { type: "scatter", x: "pressure", y: "impact", label: "name" } });
    expect(all(".fft-point-label")).toEqual([]);
  });

  test("without quadrants nothing changes: no lines, no corner words, no Quadrant column", async () => {
    await draw({ rows: rules, view: { type: "scatter", x: "pressure", y: "impact", label: "name" } });
    expect([all(".fft-quadrant-line").length, all(".fft-quadrant-label").length]).toEqual([0, 0]);
    expect(texts(".fft-sr-only th")).toEqual(["Name", "Pressure", "Impact"]);
  });

  test("validation checks the shape of quadrants", () => {
    const spec = (q: unknown): WidgetSpec => ({ data: { type: "inline", rows: rules }, view: { type: "scatter", x: "pressure", y: "impact", quadrants: q } });
    const messages = (q: unknown) => validateSpec(spec(q), rules).filter((i) => i.level === "error").map((i) => `${i.path} ${i.message}`).join(" ");
    expect(messages([60, 3.5])).toMatch(/view\.quadrants Must be an object/);
    expect(messages({ x: "60", y: 3.5 })).toMatch(/quadrants\.x must be a number/);
    expect(messages({ x: 60, y: 3.5, labels: ["a", "b", "c", "d", "e"] })).toMatch(/quadrants\.labels must be up to four strings/);
    expect(messages(quadrants)).toBe("");
  });

  test("the guide names the corners and the standouts", () => {
    const spec: WidgetSpec = { data: { type: "inline", rows: rules }, view: { ...view, labels: true } };
    const guide = explainChart(spec, rules);
    expect(guide).toMatch(/The dashed lines cut the chart into four corners, named Prepare, Act now, Monitor and Watch/);
    expect(guide).toMatch(/says what to do about it, and the standouts carry their names\./);
    expect(explainChart(spec).split(". ").length).toBeLessThanOrEqual(4);
    const plain: WidgetSpec = { data: { type: "inline", rows: rules }, view: { type: "scatter", x: "pressure", y: "impact", label: "name", labels: true } };
    expect(explainChart(plain, rules)).toMatch(/The standouts carry their names on the chart\./);
  });
});
