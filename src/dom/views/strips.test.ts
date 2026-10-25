// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { explainChart } from "../../core/explain.ts";
import { questionOf } from "../../core/question.ts";
import { recommendCharts } from "../../core/recommend.ts";
import { validateSpec } from "../../core/validate.ts";
import { createWidget } from "../widget.ts";
import { pluralUnit } from "./strips.ts";
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

const small = [
  { name: "IPR", mandatory: 12, recommended: 3, optional: 1, pages: 8 },
  { name: "CCD2", mandatory: 6, recommended: 2, optional: 2, pages: 5 },
];
const big = [
  { name: "CRR3", mandatory: 351, recommended: 38, optional: 23, pages: 420 },
  { name: "DORA", mandatory: 221, recommended: 58, optional: 33, pages: 79 },
];
const view = { type: "strips", label: "name", parts: ["mandatory", "recommended", "optional"], per: "pages" };

describe("strips view", () => {
  test("one square per unit, colored part by part in order, when the strips fit", async () => {
    await draw({ rows: small, view });
    const rows = all(".fft-strip");
    expect(rows.length).toBe(2);
    const squares = [...(rows[0]?.querySelectorAll(".fft-strip-sq") ?? [])];
    expect(squares.length).toBe(16);
    expect(squares.map((sq) => (sq as HTMLElement).dataset.part)).toEqual([...Array(12).fill("0"), ...Array(3).fill("1"), "2"]);
    expect((squares[0] as HTMLElement).style.fill).toBe("var(--fft-series-1)");
    expect((squares[15] as HTMLElement).style.fill).toBe("var(--fft-series-3)");
    expect(texts(".fft-strips-note")).toEqual(["One square is one provision."]);
    expect(texts(".fft-legend li")).toEqual(["Mandatory", "Recommended", "Optional"]);
  });

  test("the total, the first part's share and the density are written at the end", async () => {
    await draw({ rows: small, view });
    expect(texts(".fft-strip-total")).toEqual(["16", "10"]);
    expect(texts(".fft-strip-share")).toEqual(["75% mandatory", "60% mandatory"]);
    expect(texts(".fft-strip-density")).toEqual(["2 per page", "2 per page"]);
  });

  test("long strips scale: one square stands for a round number of units, said under the chart, and strips round to it", async () => {
    await draw({ rows: big, view });
    const note = texts(".fft-strips-note")[0] ?? "";
    const per = Number(/One square is (\d+) provisions/.exec(note)?.[1]);
    expect(per).toBeGreaterThan(1);
    expect(note).toContain("rounded to the nearest square");
    const counts = all(".fft-strip").map((row) => row.querySelectorAll(".fft-strip-sq").length);
    expect(counts).toEqual([Math.round(412 / per), Math.round(312 / per)]);
    // The parts still add up to the strip, largest remainder first.
    const parts = [...(all(".fft-strip")[1]?.querySelectorAll(".fft-strip-sq") ?? [])].map((sq) => (sq as HTMLElement).dataset.part);
    expect(parts.filter((p) => p === "0").length).toBeGreaterThan(parts.filter((p) => p === "1").length);
    expect(texts(".fft-strip-density")).toEqual(["1 per page", "3.9 per page"]);
  });

  test("each row is a keyboard stop that says its parts, the share and the density, with a tooltip on focus and a select on Enter", async () => {
    await draw({ rows: small, view });
    const rows = all(".fft-strip");
    expect(rows.map((row) => row.getAttribute("tabindex"))).toEqual(["0", "-1"]);
    expect(rows[0]?.getAttribute("aria-label")).toBe("IPR: Mandatory 12, Recommended 3, Optional 1, Total 16, Mandatory share 75%, Density 2 per page");
    rows[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["CCD2", "6Mandatory", "2Recommended", "2Optional", "10Total", "60%Mandatory share", "2 per pageDensity"]);
    const seen: Row[] = [];
    target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
    press(rows[1] as Element, "Enter");
    expect(seen).toEqual([small[1]]);
  });

  test("one part needs no legend or share; the unit word is used in the note and pluralized", async () => {
    await draw({ rows: [{ team: "Risk", clauses: 7 }], view: { type: "strips", label: "team", parts: "clauses", unit: "clause" } });
    expect(all(".fft-legend").length).toBe(0);
    expect(all(".fft-strip-share").length).toBe(0);
    expect(texts(".fft-strips-note")).toEqual(["One square is one clause."]);
    expect([pluralUnit("clause"), pluralUnit("policy"), pluralUnit("provision")]).toEqual(["clauses", "policies", "provisions"]);
  });

  test("a hidden table carries the label, every part and the denominator", async () => {
    await draw({ rows: small, view });
    expect(texts(".fft-sr-only th")).toEqual(["Name", "Mandatory", "Recommended", "Optional", "Pages"]);
  });

  test("data checks warn about negative counts, and the guide, question and recommendation know the strips", () => {
    const rows = [{ name: "X", mandatory: -1, recommended: 2 }];
    const issues = validateSpec({ data: { type: "inline", rows }, view: { type: "strips", label: "name", parts: ["mandatory", "recommended"] } }, rows).map((i) => i.message);
    expect(issues.join(" ")).toContain("negative");
    const spec = { data: { type: "inline", rows: big }, view } as WidgetSpec;
    expect(explainChart(spec, big)).toContain("each small square is one provision");
    expect(explainChart(spec, big)).toContain("Here, CRR3 has the most provisions: 412, 85% of them mandatory; that is 1.0 per page.");
    expect(questionOf({ ...spec, title: "Provisions by regulation" }, big).text).toBe("How many provisions does each regulation have, and how many are mandatory?");
    expect(recommendCharts(big)[0]?.view).toEqual({ type: "strips", label: "name", value: ["mandatory", "recommended", "optional"], per: "pages" });
  });
});
