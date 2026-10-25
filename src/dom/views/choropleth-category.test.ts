// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { explainChart } from "../../core/explain.ts";
import { questionOf } from "../../core/question.ts";
import { suggestView } from "../../core/suggest.ts";
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

const transposition = [
  { country: "FR", status: "Transposed" },
  { country: "DE", status: "In progress" },
  { country: "ES", status: "Transposed" },
  { country: "IT", status: "Late" },
];
const view: WidgetSpec["view"] = { type: "choropleth", geo: "europe", id: "country", category: "status" };

describe("choropleth by category", () => {
  test("regions take one series color per category, in order of first appearance, and the rest stay grey", async () => {
    await draw({ rows: transposition, view });
    const colored = all(".fft-map-region-group") as SVGElement[];
    expect(colored).toHaveLength(4);
    const fill = (name: string) => colored.find((r) => r.getAttribute("aria-label")?.startsWith(name))?.style.fill;
    expect([fill("France"), fill("Germany"), fill("Spain"), fill("Italy")]).toEqual(["var(--fft-series-1)", "var(--fft-series-2)", "var(--fft-series-1)", "var(--fft-series-3)"]);
    expect(all(".fft-map-region[data-step]")).toHaveLength(0);
    expect(all(".fft-map-region-empty")).toHaveLength(37);
    expect(all(".fft-map-region-label-group")).toHaveLength(4);
  });

  test("the legend is a key of the categories plus No data, not a scale", async () => {
    await draw({ rows: transposition, view });
    expect(texts("ul.fft-map-legend li")).toEqual(["Transposed", "In progress", "Late", "No data"]);
    expect(all(".fft-heat-ramp")).toEqual([]);
  });

  test("tooltips and labels say the category, and the hidden table lists id and category", async () => {
    await draw({ rows: transposition, view });
    const italy = all(".fft-map-region-group").find((r) => r.getAttribute("aria-label")?.startsWith("Italy")) as Element;
    expect(italy.getAttribute("aria-label")).toBe("Italy: Late");
    italy.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Italy", "LateStatus"]);
    expect(texts(".fft-sr-only th")).toEqual(["Country", "Status"]);
  });

  test("by value nothing changes: shaded steps and a scale", async () => {
    await draw({ rows: [{ country: "FR", n: 3 }, { country: "DE", n: 9 }], view: { type: "choropleth", geo: "europe", id: "country", value: "n" } });
    expect(all(".fft-map-region[data-step]")).toHaveLength(2);
    expect(all(".fft-heat-ramp div")).toHaveLength(7);
    expect(all(".fft-map-region-group")).toEqual([]);
  });

  test("validation wants value or category, never both; more than 8 categories warns", () => {
    const spec = (v: Record<string, unknown>): WidgetSpec => ({ data: { type: "inline", rows: transposition }, view: { type: "choropleth", geo: "europe", id: "country", ...v } });
    const errors = (v: Record<string, unknown>) => validateSpec(spec(v), transposition).filter((i) => i.level === "error").map((i) => i.message).join(" ");
    expect(errors({})).toMatch(/value \(a number, shaded\) or category/);
    expect(errors({ value: "n", category: "status" })).toMatch(/not both/);
    expect(errors({ category: "status" })).toBe("");
    const many = Array.from({ length: 9 }, (_, i) => ({ country: ["FR", "DE", "ES", "IT", "PT", "NL", "BE", "AT", "PL"][i], status: `S${i}` }));
    expect(validateSpec(spec({ category: "status" }), many).map((i) => i.message).join(" ")).toMatch(/9 categories but only 8 colors/);
  });

  test("suggestView still fills a value when nothing names the field, so switches to the map keep working", () => {
    // Three codes at least: two letters twice could be anything, three on one grid are a map.
    const rows = [{ country: "FR", revenue: 3 }, { country: "DE", revenue: 9 }, { country: "ES", revenue: 5 }];
    expect(suggestView("choropleth", rows)).toEqual({ type: "choropleth", id: "country", value: "revenue", geo: "europe" });
  });

  test("the words follow: the question, the guide and the example count the categories", () => {
    const spec: WidgetSpec = { data: { type: "inline", rows: transposition }, view };
    expect(questionOf(spec, transposition).text).toBe("Which status is each country, on the map?");
    const guide = explainChart(spec, transposition);
    // The key is on the map: the guide no longer points at it.
    expect(guide).toMatch(/colored by its status; a faded region has no data/);
    expect(guide).not.toMatch(/the key/);
    expect(guide).toMatch(/Here, 2 of 4 countries are Transposed, and 1 In progress\./);
  });
});
