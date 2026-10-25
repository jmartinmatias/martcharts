// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, test } from "vitest";
import { canonicalName } from "../core/aliases.ts";
import { describeBlocks, getBlock } from "../core/registry.ts";
import type { WidgetSpec } from "../core/types.ts";
import { createEditor } from "./editor.ts";
import type { Editor } from "./editor.ts";
import "./views/index.ts";

let target: HTMLElement;
let editor: Editor | undefined;
beforeEach(() => {
  editor?.destroy();
  editor = undefined;
  document.body.innerHTML = "";
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState(null, "", "#");
  target = document.createElement("div");
  document.body.append(target);
});

const all = (selector: string) => [...target.querySelectorAll(selector)];
const one = <T extends Element>(selector: string) => target.querySelector(selector) as T;
const change = (node: Element, value: string) => {
  (node as HTMLInputElement).value = value;
  node.dispatchEvent(new Event("change"));
};

/** Opens the editor on a spec, on the Refine tab of step 3. */
function refine(spec: WidgetSpec, tab = 1): Editor {
  editor = createEditor(target, { hash: false });
  editor.setSpec(spec);
  editor.go(3);
  (all(".fft-ed-tab")[tab] as HTMLButtonElement).click();
  return editor;
}
const inline = (rows: Record<string, unknown>[], view: Record<string, unknown>, extra: Partial<WidgetSpec> = {}): WidgetSpec =>
  ({ data: { type: "inline", rows }, view, ...extra }) as WidgetSpec;

const catalog = readdirSync("catalog").filter((file) => file.endsWith(".json"));

describe("Refine covers every view", () => {
  test("there is a catalog example for every registered view", () => {
    expect(catalog.map((file) => file.replace(/\.json$/, "")).sort()).toEqual(describeBlocks("view").map((view) => view.type).sort());
  });

  test.each(catalog)("%s: the form opens without error and every required option has a control", (file) => {
    const spec = JSON.parse(readFileSync(`catalog/${file}`, "utf8")) as WidgetSpec;
    refine(spec);
    const form = one(".fft-ed-form");
    expect(form).not.toBeNull();
    const options = getBlock("view", spec.view.type).options;
    const required = Object.entries(options).filter(([, option]) => option.required).map(([name]) => canonicalName(spec.view.type, name));
    const shown = all("[data-option]").map((node) => (node as HTMLElement).dataset.option);
    for (const name of required) expect([spec.view.type, name, shown.includes(name)]).toEqual([spec.view.type, name, true]);
  });
});

describe("canonical names", () => {
  const ratings = [
    { product: "Core", ease: 7, value: 8, support: 6 },
    { product: "Plus", ease: 8, value: 7, support: 9 },
  ];

  test("a dot plot written with the older values opens filled, and an edit writes value", () => {
    const ed = refine(inline(ratings, { type: "dot", label: "product", values: ["ease", "value"] }));
    const group = one("[data-option='value']");
    expect(group).not.toBeNull();
    const boxes = [...group.querySelectorAll<HTMLInputElement>(".fft-ed-check input")];
    const checked = boxes.filter((box) => box.checked).map((box) => box.parentElement?.textContent);
    expect(checked).toEqual(["Ease", "Value"]);
    const support = boxes.find((box) => box.parentElement?.textContent === "Support") as HTMLInputElement;
    support.checked = true;
    support.dispatchEvent(new Event("change"));
    expect(ed.spec.view.value).toEqual(["ease", "value", "support"]);
    expect(ed.spec.view.values).toBeUndefined();
  });

  test("the same chart written with the canonical name opens the same way", () => {
    refine(inline(ratings, { type: "dot", label: "product", value: ["ease", "value"] }));
    const checked = [...one("[data-option='value']").querySelectorAll<HTMLInputElement>(".fft-ed-check input")].filter((box) => box.checked);
    expect(checked).toHaveLength(2);
  });
});

describe("controls for the newer options", () => {
  const regs = [
    { name: "DORA", proposed: "2020-09-24", adopted: "2022-12-14", applies: "2025-01-17", topic: "Resilience" },
    { name: "MiCA", proposed: "2020-09-24", adopted: "2023-05-31", applies: "2024-12-30", topic: "Markets" },
  ];

  test("ordered fields: the arrows and a drag set the order of a lifecycle's stages", () => {
    const ed = refine(inline(regs, { type: "lifecycle", label: "name", stages: ["proposed", "adopted", "applies"] }));
    const items = () => all("[data-option='stages'] .fft-ed-order-item").map((node) => (node as HTMLElement).dataset.field);
    expect(items()).toEqual(["proposed", "adopted", "applies"]);
    (one("[data-option='stages'] .fft-ed-order-item .fft-ed-move-down") as HTMLButtonElement).click();
    expect(ed.spec.view.stages).toEqual(["adopted", "proposed", "applies"]);
    const [first, , third] = all("[data-option='stages'] .fft-ed-order-item") as HTMLElement[];
    const start = new Event("dragstart", { bubbles: true });
    Object.defineProperty(start, "dataTransfer", { value: { setData: () => undefined, getData: () => "adopted" } });
    first?.dispatchEvent(start);
    const drop = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(drop, "dataTransfer", { value: { setData: () => undefined, getData: () => "adopted" } });
    third?.dispatchEvent(drop);
    expect(ed.spec.view.stages).toEqual(["proposed", "applies", "adopted"]);
  });

  test("today: a switch, and a date when the line belongs elsewhere", () => {
    const ed = refine(inline(regs, { type: "lifecycle", label: "name", stages: ["proposed", "adopted"] }));
    const sw = one<HTMLButtonElement>("[data-option='today'] .fft-ed-switch");
    sw.click();
    expect(ed.spec.view.today).toBe(true);
    change(one("[data-option='today'] input[type='date']"), "2026-06-30");
    expect(ed.spec.view.today).toBe("2026-06-30");
  });

  test("map geometry: a select of the built-in basemaps, or an address", () => {
    const rows = [
      { country: "FR", revenue: 5 },
      { country: "DE", revenue: 7 },
    ];
    const ed = refine(inline(rows, { type: "choropleth", geo: "europe", id: "country", value: "revenue" }));
    const select = one<HTMLSelectElement>("[data-option='geo'] select");
    expect([...select.options].map((o) => o.value)).toEqual(expect.arrayContaining(["europe", "us-states"]));
    expect(select.value).toBe("europe");
    const url = one<HTMLInputElement>("[data-option='geo'] .fft-ed-geo-url");
    expect(url.hidden).toBe(true);
    change(select, "\u0000url");
    expect(url.hidden).toBe(false);
    change(url, "https://example.org/regions.geojson");
    expect(ed.spec.view.geo).toBe("https://example.org/regions.geojson");
  });

  test("a choropleth's labels are a word: codes or none", () => {
    const ed = refine(inline([{ country: "FR", revenue: 5 }], { type: "choropleth", geo: "europe", id: "country", value: "revenue" }));
    const none = all("[data-option='labels'] .fft-ed-segment").find((b) => b.textContent === "None") as HTMLButtonElement;
    none.click();
    expect(ed.spec.view.labels).toBe("none");
  });

  test("quadrants: where the plot splits, and a word in each corner", () => {
    const rows = [
      { name: "A", pressure: 20, impact: 2 },
      { name: "B", pressure: 80, impact: 4 },
    ];
    const ed = refine(inline(rows, { type: "scatter", x: "pressure", y: "impact", label: "name" }));
    const inputs = all("[data-option='quadrants'] input") as HTMLInputElement[];
    change(inputs[0] as Element, "50");
    change(inputs[1] as Element, "3");
    change(inputs[3] as Element, "Act now");
    expect(ed.spec.view.quadrants).toEqual({ x: 50, y: 3, labels: ["", "Act now", "", ""] });
  });

  test("RAG thresholds on a KPI: on track from, at risk from, and which way is good", () => {
    const ed = refine(inline([{ nps: 32 }], { type: "kpi", value: "nps" }));
    const inputs = all("[data-option='rag'] input") as HTMLInputElement[];
    change(inputs[0] as Element, "40");
    change(inputs[1] as Element, "20");
    expect(ed.spec.view.rag).toEqual({ green: 40, amber: 20 });
    (all("[data-option='rag'] .fft-ed-segment").find((b) => b.textContent === "Lower") as HTMLButtonElement).click();
    expect(ed.spec.view.rag).toEqual({ green: 40, amber: 20, goodWhen: "down" });
  });

  test("status rules: adding one writes a rag step with thresholds from the data", () => {
    const rows = [10, 20, 30, 40, 50, 60].map((n, i) => ({ client: `C${i}`, nps: n }));
    const ed = refine(inline(rows, { type: "table" }));
    (one(".fft-ed-rag-add") as HTMLButtonElement).click();
    const step = ed.spec.transform?.find((s) => s.type === "rag") as unknown as { rules: { field: string; green: number; amber: number }[] };
    expect(step.rules).toHaveLength(1);
    expect(step.rules[0]?.field).toBe("nps");
    expect((step.rules[0]?.green ?? 0) > (step.rules[0]?.amber ?? 0)).toBe(true);
  });

  test("fixed colors: a color per category, written to the spec and cleared again", () => {
    const rows = [
      { region: "East", revenue: 5 },
      { region: "West", revenue: 7 },
    ];
    const ed = refine(inline(rows, { type: "hbar", label: "region", value: "revenue" }));
    const east = one<HTMLInputElement>(".fft-ed-color-input[aria-label='Fixed colors: East']");
    change(east, "#2f6fdb");
    expect((ed.spec as unknown as { colors: Record<string, string> }).colors).toEqual({ East: "#2f6fdb" });
    (one(".fft-ed-color-clear[aria-label='Clear: East']") as HTMLButtonElement).click();
    expect((ed.spec as unknown as { colors?: Record<string, string> }).colors?.East).toBeUndefined();
  });

  test("the tooltip template: written by hand or a field at a time", () => {
    const rows = [{ region: "East", revenue: 5 }];
    const ed = refine(inline(rows, { type: "hbar", label: "region", value: "revenue" }), 2);
    (all(".fft-ed-insert").find((b) => b.textContent === "{region}") as HTMLButtonElement).click();
    expect((ed.spec as unknown as { tooltip: string }).tooltip).toBe("{region}");
    change(one(".fft-ed-tooltip"), "{region} made {revenue}");
    expect((ed.spec as unknown as { tooltip: string }).tooltip).toBe("{region} made {revenue}");
    change(one(".fft-ed-tooltip"), "");
    expect((ed.spec as unknown as { tooltip?: string }).tooltip).toBeUndefined();
  });

  test("a scorecard's overall column: the worst, none, or a stored roll-up", () => {
    const rows = [{ client: "Aster", nps: "G", tickets: "A", health: "A" }];
    const ed = refine(inline(rows, { type: "ragboard", label: "client", dimensions: ["nps", "tickets"] }));
    const select = one<HTMLSelectElement>("[data-option='overall'] select");
    change(select, "health");
    expect(ed.spec.view.overall).toBe("health");
    change(select, "\u0000none");
    expect(ed.spec.view.overall).toBe(false);
  });
});
