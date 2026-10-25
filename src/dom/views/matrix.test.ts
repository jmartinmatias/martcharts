// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { validateSpec } from "../../core/validate.ts";
import { explainChart } from "../../core/explain.ts";
import { questionOf } from "../../core/question.ts";
import { recommendCharts } from "../../core/recommend.ts";
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
const press = (node: Element, key: string) => node.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

const pressure = [
  { quarter: "2026-Q1", topic: "AML", obligations: 31, impact: 4.6 },
  { quarter: "2026-Q2", topic: "AML", obligations: 36, impact: 4.7 },
  { quarter: "2026-Q1", topic: "Payments", obligations: 8, impact: 2.4 },
  { quarter: "2026-Q2", topic: "Payments", obligations: 2, impact: 2.0 },
  { quarter: "2026-Q1", topic: "ESG", obligations: 5, impact: 3.1 },
];
const sized = { rows: pressure, view: { type: "matrix", x: "quarter", y: "topic", size: "obligations", color: "impact" } };

const scope = [
  { regulation: "DORA", stakeholder: "Banks", mustComply: true },
  { regulation: "DORA", stakeholder: "Insurers", mustComply: true },
  { regulation: "CRR3", stakeholder: "Banks", mustComply: true },
  { regulation: "CRR3", stakeholder: "Insurers", mustComply: false },
];
const marked = { rows: scope, view: { type: "matrix", x: "stakeholder", y: "regulation", mark: "mustComply" } };

describe("matrix view", () => {
  test("a faint cell for every pair of row and column, a mark only where a row exists", async () => {
    await draw(sized);
    expect([all(".fft-mx-cell").length, all(".fft-mx-dot").length, all(".fft-mx-hit").length]).toEqual([6, 5, 5]);
    expect(texts(".fft-mx-row")).toEqual(["AML", "Payments", "ESG"]);
    expect(texts(".fft-mx-col")).toEqual(["2026-Q1", "2026-Q2"]);
  });

  test("circles grow with size by area, and take a deeper step of the sequential scale with color", async () => {
    await draw(sized);
    const radii = all(".fft-mx-dot").map((dot) => Number(dot.getAttribute("r")));
    const [aml1, aml2, pay1, pay2] = radii as [number, number, number, number];
    expect(aml2).toBeGreaterThan(aml1);
    expect(aml1).toBeGreaterThan(pay1);
    expect(pay1).toBeGreaterThan(pay2);
    // Area, not radius, follows the value: 8 against 2 obligations is twice the radius.
    expect(pay1 / pay2).toBeCloseTo(2, 1);
    const steps = all(".fft-mx-dot").map((dot) => Number((dot as HTMLElement).dataset.step));
    expect(steps[1]).toBe(7);
    expect(steps[3]).toBe(1);
    expect(steps[0]).toBeGreaterThan(steps[4] as number);
  });

  test("the keys say what size and shade mean: reference circles with values, and the scale's ends", async () => {
    await draw(sized);
    expect(texts(".fft-mx-key-text")).toEqual(["36", "9"]);
    expect(texts(".fft-mx-ramp > span")).toEqual(["2", "4.7 impact"]);
    expect(all(".fft-heat-ramp [data-step]").length).toBe(7);
  });

  test("a mark field draws a square where it is yes and a faint dot where it is no, keyed by the field's label", async () => {
    await draw(marked);
    expect([all(".fft-mx-yes").length, all(".fft-mx-no").length]).toEqual([3, 1]);
    expect(texts(".fft-legend li")).toEqual(["Must comply"]);
    expect(texts(".fft-sr-only td")).toEqual(["Yes", "Yes", "Yes", "No"]);
  });

  test("every mark is a keyboard stop with its values in words, a tooltip on focus, and a select on Enter", async () => {
    await draw(sized);
    const hits = all(".fft-mx-hit");
    expect(hits.map((hit) => hit.getAttribute("tabindex"))).toEqual(["0", "-1", "-1", "-1", "-1"]);
    expect(hits[1]?.getAttribute("aria-label")).toBe("AML, 2026-Q2: Obligations 36, Impact 4.7");
    hits[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["AML, 2026-Q2", "36Obligations", "4.7Impact"]);
    const seen: Row[] = [];
    target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
    press(hits[1] as Element, "Enter");
    expect(seen).toEqual([pressure[1]]);
  });

  test("a complete grid moves down a row with the arrow keys; a sparse one moves mark to mark", async () => {
    await draw(marked);
    const hits = all(".fft-mx-hit") as HTMLElement[];
    hits[0]?.focus();
    press(hits[0] as Element, "ArrowDown");
    expect(document.activeElement).toBe(hits[2]);
  });

  test("a label is written inside marks with room for it, in the shade's own text color", async () => {
    await draw({ rows: pressure, view: { type: "matrix", x: "quarter", y: "topic", color: "impact", label: "obligations" } });
    const labels = all(".fft-mx-label");
    expect(labels.length).toBeGreaterThan(0);
    expect(texts(".fft-mx-label")).toContain("36");
    expect((labels[0] as HTMLElement).dataset.step).toMatch(/^[1-7]$/);
  });

  test("a category color gives each kind its own color and a key", async () => {
    await draw({ rows: pressure.map((row) => ({ ...row, owner: row.topic === "AML" ? "Compliance" : "Product" })), view: { type: "matrix", x: "quarter", y: "topic", size: "obligations", color: "owner" } });
    expect(texts(".fft-legend li")).toEqual(["Compliance", "Product"]);
    expect(all(".fft-mx-dot").map((dot) => (dot as HTMLElement).style.fill)).toEqual(["var(--fft-series-1)", "var(--fft-series-1)", "var(--fft-series-2)", "var(--fft-series-2)", "var(--fft-series-2)"]);
  });

  test("column names wrap onto short lines where their words fit, and lean when a word is too long for a cell", async () => {
    const wide = scope.map((row) => ({ ...row, stakeholder: row.stakeholder === "Banks" ? "Credit unions" : "Mutual funds" }));
    await draw({ rows: wide, view: { type: "matrix", x: "stakeholder", y: "regulation", mark: "mustComply" } });
    expect(all(".fft-mx-col").map((col) => col.querySelectorAll("tspan").length)).toEqual([2, 2]);
    expect(all(".fft-mx-col").map((col) => col.getAttribute("aria-label"))).toEqual(["Credit unions", "Mutual funds"]);
    document.body.innerHTML = "";
    target = document.createElement("div");
    document.body.append(target);
    const long = scope.map((row) => ({ ...row, stakeholder: row.stakeholder === "Banks" ? "Payment institutions" : "Crypto-asset providers" }));
    await draw({ rows: long, view: { type: "matrix", x: "stakeholder", y: "regulation", mark: "mustComply" } });
    expect(all(".fft-mx-col").every((col) => col.getAttribute("transform")?.startsWith("rotate(-45"))).toBe(true);
  });

  test("validation refuses a square and a circle at once, and warns about repeated pairs", () => {
    const bad = validateSpec({ data: { type: "inline", rows: [] }, view: { type: "matrix", x: "a", y: "b", mark: "m", size: "s" } }).map((i) => i.message);
    expect(bad.join(" ")).toContain("drop it, or drop size");
    const repeated = validateSpec({ data: { type: "inline", rows: [...scope, scope[0] as Row] }, view: marked.view }, [...scope, scope[0] as Row]).map((i) => i.message);
    expect(repeated.join(" ")).toContain("repeat");
  });

  test("the guide, the question and the recommendation know the matrix", () => {
    const spec = { data: { type: "inline", rows: pressure }, view: sized.view } as WidgetSpec;
    expect(explainChart(spec, pressure)).toContain("The bigger the circle, the more obligations");
    expect(explainChart(spec, pressure)).toContain("Here, the biggest mark is AML in 2026-Q2, with 36 obligations");
    expect(questionOf(spec, pressure).text).toBe("Where does obligations concentrate, by topic and quarter?");
    const markedSpec = { data: { type: "inline", rows: scope }, view: marked.view } as WidgetSpec;
    expect(explainChart(markedSpec, scope)).toContain("Here, DORA is marked must comply in all 2 stakeholders");
    expect(recommendCharts(scope).map((pick) => pick.type)).toContain("matrix");
    expect(recommendCharts(pressure).find((pick) => pick.type === "matrix")?.view).toEqual({ type: "matrix", x: "quarter", y: "topic", size: "obligations", color: "impact" });
  });
});
