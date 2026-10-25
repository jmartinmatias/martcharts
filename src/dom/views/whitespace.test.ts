// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { explainChart } from "../../core/explain.ts";
import { questionOf } from "../../core/question.ts";
import { recommendCharts } from "../../core/recommend.ts";
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

const holdings = [
  { client: "Aldana", product: "Custody", state: "Holds", propensity: null, value: 100 },
  { client: "Aldana", product: "Lending", state: "Opportunity", propensity: 80, value: 40 },
  { client: "Aldana", product: "Pension", state: "Not eligible", propensity: null, value: null },
  { client: "Keller", product: "Custody", state: "Holds", propensity: null, value: 20 },
  { client: "Keller", product: "Lending", state: "Opportunity", propensity: 20, value: 10 },
  { client: "Keller", product: "Pension", state: "Opportunity", propensity: 60, value: 5 },
  { client: "Nordvik", product: "Custody", state: "Holds", propensity: null, value: 300 },
  { client: "Nordvik", product: "Lending", state: "Holds", propensity: null, value: 50 },
  { client: "Nordvik", product: "Pension", state: "Not eligible", propensity: null, value: null },
];
const view: WidgetSpec["view"] = { type: "whitespace", row: "client", column: "product", state: "state", score: "propensity", value: "value" };

describe("whitespace view (the cross-sell map)", () => {
  test("one cell per client and product, each in its state: filled, outlined or a dot", async () => {
    await draw({ rows: holdings, view });
    const states = all(".fft-ws-cell").map((cell) => cell.getAttribute("data-state"));
    expect(states.filter((s) => s === "holds").length).toBe(4);
    expect(states.filter((s) => s === "opportunity").length).toBe(3);
    expect(states.filter((s) => s === "none").length).toBe(2);
    expect(texts(".fft-ws-col-name")).toEqual(["Custody", "Lending", "Pension"]);
  });

  test("rows sort with the most to win first, and each ends with its penetration and potential", async () => {
    await draw({ rows: holdings, view });
    expect(texts(".fft-ws-row")).toEqual(["Aldana", "Keller", "Nordvik"]);
    expect(texts(".fft-ws-count")).toEqual(["1 of 2", "1 of 3", "2 of 2"]);
    expect(texts(".fft-ws-potential")).toEqual(["40", "15", "–"]);
  });

  test("penetration sort puts the least covered first; none keeps the rows as given", async () => {
    await draw({ rows: holdings, view: { ...view, sort: "penetration" } });
    expect(texts(".fft-ws-row")).toEqual(["Keller", "Aldana", "Nordvik"]);
    target.replaceChildren();
    await draw({ rows: [...holdings].reverse(), view: { ...view, sort: "none" } });
    expect(texts(".fft-ws-row")).toEqual(["Nordvik", "Keller", "Aldana"]);
  });

  test("an opportunity's tint follows its score, strongest for the most likely", async () => {
    await draw({ rows: holdings, view });
    const steps = all('.fft-ws-cell[data-state="opportunity"] .fft-ws-mark').map((mark) => Number(mark.getAttribute("data-step")));
    // Aldana's lending (80) tints more than Keller's lending (20) and pension (60).
    expect(steps[0]).toBeGreaterThan(steps[1] as number);
    expect(steps[2]).toBeGreaterThan(steps[1] as number);
  });

  test("each column ends with how many hold it and how many could", async () => {
    await draw({ rows: holdings, view });
    expect(texts(".fft-ws-foot-holds")).toEqual(["3", "1", "0"]);
    expect(texts(".fft-ws-foot-open")).toEqual(["0", "2", "1"]);
  });

  test("the legend names the three states and the tooltip gives state, score and value", async () => {
    await draw({ rows: holdings, view });
    expect(texts(".fft-ws-legend li")).toEqual(["Holds", "Opportunity", "Not eligible"]);
    const open = all('.fft-ws-cell[data-state="opportunity"]')[0] as HTMLElement;
    open.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-title")).toEqual(["Aldana · Lending"]);
    expect(texts(".fft-tooltip-row")).toEqual(["OpportunityState", "80Propensity", "40Potential"]);
    expect(open.getAttribute("aria-label")).toBe("Aldana, Lending: State Opportunity, Propensity 80, Potential 40");
  });

  test("cells are one keyboard stop with arrows between them, and Enter picks the row", async () => {
    await draw({ rows: holdings, view });
    const cells = all(".fft-ws-cell:not([data-state=empty])") as HTMLElement[];
    expect(cells.map((c) => c.tabIndex)).toEqual([0, ...cells.slice(1).map(() => -1)]);
    const seen: Row[] = [];
    target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
    cells[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(seen).toEqual([holdings[0]]);
    cells[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.activeElement).toBe(cells[3]);
  });

  test("other names for the states work, and unknown ones warn", () => {
    const rows = [
      { c: "A", p: "X", s: "yes" },
      { c: "A", p: "Y", s: "maybe" },
      { c: "B", p: "X", s: "no" },
    ];
    const ok: WidgetSpec = { data: { type: "inline", rows }, view: { type: "whitespace", row: "c", column: "p", state: "s", states: ["yes", "maybe", "no"] } };
    expect(validateSpec(ok, rows)).toEqual([]);
    const bad: WidgetSpec = { data: { type: "inline", rows }, view: { type: "whitespace", row: "c", column: "p", state: "s" } };
    expect(validateSpec(bad, rows).map((i) => [i.level, i.message.slice(0, 40)])).toEqual([["warning", "3 state values (yes, maybe, no) match no"]]);
    const wrong: WidgetSpec = { data: { type: "inline", rows }, view: { type: "whitespace", row: "c", column: "p", state: "s", states: ["yes", "yes"] } };
    expect(validateSpec(wrong, rows).some((i) => i.level === "error" && /three different names/.test(i.message))).toBe(true);
  });

  test("a hidden table lays the map out as rows and columns for screen readers", async () => {
    await draw({ rows: holdings, view });
    const table = target.querySelector(".fft-sr-only table") as HTMLTableElement;
    expect([...table.querySelectorAll("tr")].length).toBe(4);
    expect([...(table.querySelectorAll("tr")[1]?.children ?? [])].map((c) => c.textContent)).toEqual(["Aldana", "Holds", "Opportunity", "Not eligible", "1 of 2", "40"]);
  });

  test("the guide, the question and the recommendation read the map as cross-sell", () => {
    const spec: WidgetSpec = { data: { type: "inline", rows: holdings }, view, fields: { client: { label: "Client" }, product: { label: "Product" } } };
    expect(explainChart(spec, holdings)).toMatch(/Each row is one client and each column one product/);
    expect(explainChart(spec, holdings)).toMatch(/Here, 4 cells are held and 3 are open; Aldana has the most to win, 40\./);
    expect(questionOf(spec).text).toBe("Which clients could take more products, and which ones first?");
    const pick = recommendCharts(holdings).find((p) => p.type === "whitespace");
    expect(pick?.view).toEqual({ type: "whitespace", row: "client", column: "product", state: "state", score: "propensity", value: "value" });
  });

  test("narrow cards turn the column names on their side", async () => {
    // jsdom has no layout: give elements a phone-card width for this one draw.
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 260 });
    try {
      await draw({ rows: holdings, view });
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    }
    expect((target.querySelector(".fft-ws-grid") as HTMLElement).hasAttribute("data-tight")).toBe(true);
    target.replaceChildren();
    await draw({ rows: holdings, view });
    expect((target.querySelector(".fft-ws-grid") as HTMLElement).hasAttribute("data-tight")).toBe(false);
  });
});
