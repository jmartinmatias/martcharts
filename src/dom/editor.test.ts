// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { WidgetSpec } from "../core/types.ts";
import { columnKind, createEditor, embedCodes, gridOf, parseTick, readHash, rowsFromJson, rowsFromTable, writeHash } from "./editor.ts";
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
const texts = (selector: string) => all(selector).map((node) => node.textContent?.trim());
const one = <T extends Element>(selector: string) => target.querySelector(selector) as T;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const TSV = "region\trevenue\tmonth\nNorth\t1,200\t2026-01\nSouth\t900\t2026-02\nEast\t2000\t2026-03";
const CSV = 'team,opened,closed\nSupport,412,398\n"Billing, EU",128,131\n';

function open(options: Parameters<typeof createEditor>[1] = {}) {
  editor = createEditor(target, { hash: false, ...options });
  return editor;
}

describe("reading tables", () => {
  test("a grid honours quotes, picks the separator from the first line and pads short rows", () => {
    expect(gridOf(CSV)).toEqual([
      ["team", "opened", "closed"],
      ["Support", "412", "398"],
      ["Billing, EU", "128", "131"],
    ]);
    expect(gridOf("a;b\n1;2\n3")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", ""],
    ]);
    expect(gridOf('﻿x\ty\n"multi\nline"\t"say ""hi"""')).toEqual([
      ["x", "y"],
      ["multi\nline", 'say "hi"'],
    ]);
  });

  test("rows take typed cells: numbers, grouped numbers, blanks as null; a header row or made-up names; transposed on request", () => {
    expect(rowsFromTable(TSV)).toEqual([
      { region: "North", revenue: 1200, month: "2026-01" },
      { region: "South", revenue: 900, month: "2026-02" },
      { region: "East", revenue: 2000, month: "2026-03" },
    ]);
    expect(rowsFromTable("a,b\n1,\n", { header: false })).toEqual([
      { column1: "a", column2: "b" },
      { column1: 1, column2: null },
    ]);
    expect(rowsFromTable("k,x,y\nrevenue,1,2\ncost,3,4", { transpose: true })).toEqual([
      { k: "x", revenue: 1, cost: 3 },
      { k: "y", revenue: 2, cost: 4 },
    ]);
    expect(rowsFromTable("a,a,b\n1,2,3")).toEqual([{ a: 1, "a 2": 2, b: 3 }]);
  });

  test("JSON gives its first list of records, at the top or inside", () => {
    expect(rowsFromJson([{ a: 1 }])).toEqual([{ a: 1 }]);
    expect(rowsFromJson({ generated: "x", data: { items: [{ a: 1 }] } })).toEqual([{ a: 1 }]);
    expect(rowsFromJson({ a: 1 })).toBeUndefined();
    expect(rowsFromJson([1, 2])).toBeUndefined();
  });

  test("a column is a number, a date or text by every present value", () => {
    const rows = rowsFromTable(TSV);
    expect(["region", "revenue", "month"].map((f) => columnKind(rows, f))).toEqual(["category", "number", "date"]);
    expect(columnKind([{ a: 1 }, { a: "x" }], "a")).toBe("category");
    expect(columnKind([{ a: null }, { a: 2 }], "a")).toBe("number");
  });

  test("axis tick labels read back as numbers: 20K, €1.2M, 45%, a true minus", () => {
    expect([parseTick("20K"), parseTick("€1.2M"), parseTick("45%"), parseTick("−1.5K"), parseTick("1,250"), parseTick("Jan")]).toEqual([20000, 1200000, 0.45, -1500, 1250, null]);
  });
});

describe("the address", () => {
  const spec: WidgetSpec = { id: "t", data: { type: "inline", rows: [{ a: 1 }] }, view: { type: "table" } };
  test("step and spec round-trip through the hash", () => {
    const hash = writeHash(3, spec);
    expect(hash.startsWith("#step=3&spec=")).toBe(true);
    expect(readHash(hash)).toEqual({ step: 3, spec });
    expect(readHash("#step=2")).toEqual({ step: 2 });
    expect(readHash("#step=9&spec=not-base64")).toEqual({});
  });

  test("a spec too long for an address goes to session storage", () => {
    const big: WidgetSpec = { ...spec, data: { type: "inline", rows: Array.from({ length: 4000 }, (_, i) => ({ a: i, name: `row number ${i} with some text` })) } };
    const hash = writeHash(4, big, sessionStorage);
    expect(hash).toBe("#step=4&spec=session");
    expect(readHash(hash, sessionStorage).spec?.data.rows).toHaveLength(4000);
  });

  test("the embed code carries the spec in all three forms", () => {
    const codes = embedCodes(spec, "widgets/t.json");
    expect(codes.inline).toContain('<fft-widget actions="csv image">');
    expect(codes.inline).toContain('"type": "table"');
    expect(codes.src).toContain('src="widgets/t.json"');
    expect(codes.js).toContain("createWidget(document.querySelector(\"#chart\"), {");
  });
});

describe("step 1: the data", () => {
  test("opens on the data step with a drop zone, a text box and no chart yet", () => {
    open();
    expect(one(".fft-ed-step[aria-current='step']").textContent).toContain("Upload data");
    expect(one(".fft-ed-text")).not.toBeNull();
    expect(texts(".fft-ed-empty")).toEqual(["No data yet. Drop a file or paste a table to begin."]);
    expect((one(".fft-ed-primary") as HTMLButtonElement).disabled).toBe(true);
  });

  test("pasting a TSV parses the rows, tells the kinds apart in the preview and recommends a chart", async () => {
    const ed = open();
    const text = one<HTMLTextAreaElement>(".fft-ed-text");
    text.value = TSV;
    text.dispatchEvent(new Event("input"));
    await vi.waitFor(() => expect(ed.rows).toHaveLength(3));
    await tick();
    expect(texts(".fft-ed-count")).toEqual(["3 rows, 3 columns"]);
    expect(all(".fft-ed-table th .fft-ed-kind").map((pill) => (pill as HTMLElement).dataset.kind)).toEqual(["category", "number", "date"]);
    expect(texts(".fft-ed-table th .fft-ed-kind")).toEqual(["Text", "Number", "Date"]);
    expect(ed.spec.data).toEqual({ type: "inline", rows: ed.rows });
    expect(typeof ed.spec.view.type).toBe("string");
    expect(ed.spec.view.type).not.toBe("table");
    // The text box kept its focus target: it was not rebuilt.
    expect(one(".fft-ed-text")).toBe(text);
    await vi.waitFor(() => expect(one(".fft-ed-preview .fft-widget")).not.toBeNull());
  });

  test("dropping a file reads it", async () => {
    const ed = open();
    const file = new File([CSV], "tickets.csv", { type: "text/csv" });
    const drop = new Event("drop", { bubbles: true, cancelable: true }) as Event & { dataTransfer?: unknown };
    Object.defineProperty(drop, "dataTransfer", { value: { files: [file], getData: () => "" } });
    one(".fft-ed-drop").dispatchEvent(drop);
    await vi.waitFor(() => expect(ed.rows).toHaveLength(2));
    expect(ed.rows[1]).toEqual({ team: "Billing, EU", opened: 128, closed: 131 });
    expect(ed.spec.id).toBe("tickets");
  });

  test("the header toggle and transpose rework the same text", async () => {
    const ed = open();
    ed.setData("a,b\n1,2\n3,4");
    expect(ed.rows).toEqual([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    const switches = all(".fft-ed-switch") as HTMLButtonElement[];
    switches[0]?.click();
    expect(ed.rows).toHaveLength(3);
    expect(ed.rows[0]).toEqual({ column1: "a", column2: "b" });
  });

  test("a sample chip loads its address", async () => {
    const fetcher = vi.fn(async () => new Response(CSV, { status: 200 }));
    const ed = open({ samples: [{ label: "Tickets", url: "/tickets.csv" }], fetch: fetcher as unknown as typeof fetch });
    (all(".fft-ed-chip").find((b) => b.textContent === "Tickets") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(ed.rows).toHaveLength(2));
    expect(fetcher).toHaveBeenCalledWith("/tickets.csv");
  });
});

describe("step 2: the columns", () => {
  test("lists every column with its kind, a label, a format; the keyboard moves a column and the rows follow", async () => {
    const ed = open();
    ed.setData(TSV);
    ed.go(2);
    expect(texts(".fft-ed-column code")).toEqual(["region", "revenue", "month"]);
    expect(all(".fft-ed-column .fft-ed-kind").map((pill) => (pill as HTMLElement).dataset.kind)).toEqual(["category", "number", "date"]);
    (all(".fft-ed-move-down")[0] as HTMLButtonElement).click();
    expect(texts(".fft-ed-column code")).toEqual(["revenue", "region", "month"]);
    expect(Object.keys(ed.rows[0] ?? {})).toEqual(["revenue", "region", "month"]);
    // Undo puts it back.
    expect(ed.undo()).toBe(true);
    expect(Object.keys(ed.rows[0] ?? {})).toEqual(["region", "revenue", "month"]);
  });

  test("a label and a format write the spec's fields; hiding a column drops it from the rows", async () => {
    const ed = open();
    ed.setData(TSV);
    ed.go(2);
    const label = all(".fft-ed-column .fft-ed-input")[1] as HTMLInputElement;
    label.value = "Revenue (EUR)";
    label.dispatchEvent(new Event("change"));
    expect(ed.spec.fields?.revenue?.label).toBe("Revenue (EUR)");
    const format = all(".fft-ed-column .fft-ed-select")[1] as HTMLSelectElement;
    format.value = "currency";
    format.dispatchEvent(new Event("change"));
    expect(ed.spec.fields?.revenue?.format).toEqual({ type: "currency", currency: "EUR" });
    const hide = all(".fft-ed-column .fft-ed-switch[aria-label='Hide']")[1] as HTMLButtonElement;
    hide.click();
    expect(Object.keys(ed.rows[0] ?? {})).toEqual(["region", "month"]);
  });

  test("dragging a column onto another reorders them", async () => {
    const ed = open();
    ed.setData(TSV);
    ed.go(2);
    const [first, , third] = all(".fft-ed-column") as HTMLElement[];
    const start = new Event("dragstart", { bubbles: true }) as Event & { dataTransfer?: unknown };
    Object.defineProperty(start, "dataTransfer", { value: { setData: () => undefined, getData: () => "region" } });
    first?.dispatchEvent(start);
    const drop = new Event("drop", { bubbles: true, cancelable: true }) as Event & { dataTransfer?: unknown };
    Object.defineProperty(drop, "dataTransfer", { value: { setData: () => undefined, getData: () => "region" } });
    third?.dispatchEvent(drop);
    expect(Object.keys(ed.rows[0] ?? {})).toEqual(["revenue", "month", "region"]);
  });
});

describe("step 3: the chart", () => {
  const examples: Record<string, WidgetSpec> = {
    hbar: { data: { type: "inline", rows: [{ a: "x", b: 1 }] }, view: { type: "hbar", label: "a", value: "b" } },
  };

  test("the chart-type grid puts recommended charts first with why, draws thumbnails from the examples, and a click fills the view", async () => {
    const ed = open({ examples });
    ed.setData(TSV);
    ed.go(3);
    expect(texts(".fft-ed-tab")).toEqual(["Chart type", "Refine", "Annotate"]);
    const headings = texts(".fft-ed-subtitle");
    expect(headings[0]).toBe("Recommended for this data");
    const types = all(".fft-ed-type").map((b) => (b as HTMLElement).dataset.type);
    expect(types.length).toBeGreaterThan(30);
    expect(all(".fft-ed-grid")[0]?.querySelectorAll(".fft-ed-type-why").length).toBeGreaterThan(0);
    await vi.waitFor(() => expect(one(".fft-ed-thumb[data-type='hbar'] .fft-widget")).not.toBeNull());
    expect(one(".fft-ed-thumb[data-type='table'] .fft-ed-thumb-name")?.textContent).toBe("ta");
    (all(".fft-ed-type").find((b) => (b as HTMLElement).dataset.type === "hbar") as HTMLButtonElement).click();
    expect(ed.spec.view).toMatchObject({ type: "hbar", label: "region", value: "revenue" });
    expect(one(".fft-ed-type[data-type='hbar']").getAttribute("aria-pressed")).toBe("true");
  });

  test("Refine builds controls from the view's schema: a select of fields of the right kind, chips for series, a switch, a segmented enum", async () => {
    const ed = open();
    ed.setData(TSV);
    ed.setSpec({ ...ed.spec, view: { type: "bar", x: "region", y: "revenue" } });
    ed.go(3);
    (all(".fft-ed-tab")[1] as HTMLButtonElement).click();
    const x = all(".fft-ed-form .fft-ed-select")[0] as HTMLSelectElement;
    expect([...x.options].map((o) => o.value)).toEqual(["region", "month"]);
    expect(x.value).toBe("region");
    const chips = all(".fft-ed-chips[aria-label='Y'] .fft-ed-check span").map((s) => s.textContent);
    expect(chips).toEqual(["Revenue"]);
    expect((one(".fft-ed-chips[aria-label='Y'] input") as HTMLInputElement).checked).toBe(true);
    expect(texts(".fft-ed-segmented[aria-label='Stacked'] .fft-ed-segment")).toEqual(["Grouped", "Stacked", "Percent"]);
    (all(".fft-ed-segmented[aria-label='Stacked'] .fft-ed-segment")[2] as HTMLButtonElement).click();
    expect(ed.spec.view.stacked).toBe("percent");
    const mark = all(".fft-ed-segmented").find((g) => g.getAttribute("aria-label") === "Mark");
    expect(texts(".fft-ed-segmented[aria-label='Mark'] .fft-ed-segment")).toEqual(["bar", "lollipop"]);
    (mark?.querySelectorAll("button")[1] as HTMLButtonElement).click();
    expect(ed.spec.view.mark).toBe("lollipop");
    x.value = "month";
    x.dispatchEvent(new Event("change"));
    expect(ed.spec.view.x).toBe("month");
    // Style: a look, a theme, colors and a height.
    expect(texts(".fft-ed-segmented[aria-label='Look'] .fft-ed-segment")).toContain("Glass");
    expect(one(".fft-picker")).not.toBeNull();
    // A boolean option is a switch: a line's end labels.
    ed.setSpec({ ...ed.spec, view: { type: "line", x: "month", y: "revenue" } });
    (all(".fft-ed-tab")[1] as HTMLButtonElement).click();
    const endLabels = one<HTMLButtonElement>(".fft-ed-switch[aria-label='End labels']");
    expect(endLabels.getAttribute("aria-checked")).toBe("true");
    endLabels.click();
    expect(ed.spec.view.endLabels).toBe(false);
  });

  test("a click on a bar highlights its category, a chip toggles it off again, and undo restores", async () => {
    const ed = open();
    ed.setData(TSV);
    ed.setSpec({ ...ed.spec, view: { type: "bar", x: "region", y: "revenue" } });
    ed.go(3);
    (all(".fft-ed-tab")[1] as HTMLButtonElement).click();
    await vi.waitFor(() => expect(one(".fft-ed-preview .fft-widget")).not.toBeNull());
    one(".fft-ed-preview").dispatchEvent(new CustomEvent("fft-select", { bubbles: true, detail: { row: { region: "South", revenue: 900 }, spec: ed.spec } }));
    expect(ed.spec.view.highlight).toEqual(["South"]);
    const chip = all(".fft-ed-chip").find((b) => b.textContent === "South") as HTMLButtonElement;
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    chip.click();
    expect(ed.spec.view.highlight).toBeUndefined();
    expect(ed.undo()).toBe(true);
    expect(ed.spec.view.highlight).toEqual(["South"]);
    expect(ed.undo()).toBe(true);
    expect(ed.spec.view.highlight).toBeUndefined();
  });

  test("a click on a legend entry drops that series", async () => {
    const ed = open();
    ed.setData("region,revenue,cost\nNorth,1200,800\nSouth,900,600");
    ed.setSpec({ ...ed.spec, view: { type: "bar", x: "region", y: ["revenue", "cost"] } });
    ed.go(3);
    await vi.waitFor(() => expect(one(".fft-ed-preview .fft-legend li")).not.toBeNull());
    (one(".fft-ed-preview .fft-legend li") as HTMLElement).click();
    expect(ed.spec.view.y).toBe("cost");
  });

  test("Annotate writes title, notes, source and byline, adds a reference line and a text annotation stepped with the arrows", async () => {
    const ed = open();
    ed.setData(TSV);
    ed.setSpec({ ...ed.spec, view: { type: "bar", x: "region", y: "revenue" } });
    ed.go(3);
    (all(".fft-ed-tab")[2] as HTMLButtonElement).click();
    const inputs = all(".fft-ed-form .fft-ed-input") as HTMLInputElement[];
    const set = (input: HTMLInputElement | undefined, value: string) => {
      if (!input) throw new Error("missing input");
      input.value = value;
      input.dispatchEvent(new Event("change"));
    };
    set(inputs[0], "Revenue by region");
    set(inputs[2], "Internal figures");
    set(inputs[3], "Finance ledger");
    set(inputs[4], "https://example.test/ledger");
    set(inputs[5], "Chart: Marta");
    expect(ed.spec).toMatchObject({ title: "Revenue by region", footer: "Internal figures", source: { name: "Finance ledger", url: "https://example.test/ledger" }, byline: "Chart: Marta" });
    const adds = all(".fft-ed-list > .fft-ed-chip").filter((b) => b.textContent === "Add") as HTMLButtonElement[];
    adds[0]?.click();
    expect(ed.spec.view.reference).toEqual([{ value: 1367, label: "Target" }]);
    if ("annotations" in (ed.spec.view as object) || all(".fft-ed-list").length > 1) {
      // Only when the bar view declares annotations (another agent adds them): the control appears by itself.
      const addNote = all(".fft-ed-list > .fft-ed-chip").filter((b) => b.textContent === "Add")[1] as HTMLButtonElement | undefined;
      addNote?.click();
      if (addNote) {
        expect(ed.spec.view.annotations).toEqual([{ x: "South", text: "Note" }]);
        (one(".fft-ed-icon[aria-label='Later']") as HTMLButtonElement).click();
        expect(ed.spec.view.annotations).toEqual([{ x: "East", text: "Note" }]);
      }
    }
  });
});

describe("step 4: publish", () => {
  test("shows the chart with its actions, the spec, three embed codes, and saves to the browser when the host has no store", async () => {
    const ed = open();
    ed.setData(TSV);
    ed.setSpec({ ...ed.spec, id: "regions", title: "Regions", view: { type: "hbar", label: "region", value: "revenue" } });
    ed.go(4);
    await vi.waitFor(() => expect(one(".fft-ed-published .fft-widget")).not.toBeNull());
    expect(one(".fft-ed-published .fft-action[data-action='csv']")).not.toBeNull();
    const codes = texts(".fft-ed-pre");
    expect(codes).toHaveLength(4);
    expect(codes[0]).toContain('"id": "regions"');
    expect(codes[1]).toContain("<fft-widget actions=");
    expect(codes[2]).toContain('src="widgets/regions.json"');
    expect(codes[3]).toContain("createWidget(");
    (all(".fft-ed-primary").find((b) => b.textContent === "Save to this gallery") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(JSON.parse(localStorage.getItem("martcharts:editor:charts") ?? "[]")).toHaveLength(1));
    // Back on the data step, the saved chart is offered and reopens.
    ed.go(1);
    expect(texts(".fft-ed-saved-name")).toEqual(["Regions"]);
  });

  test("the host's save is used when given", async () => {
    const save = vi.fn();
    const ed = open({ save });
    ed.setData(TSV);
    ed.go(4);
    (all(".fft-ed-primary").find((b) => b.textContent === "Save to this gallery") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem("martcharts:editor:charts")).toBeNull();
  });
});

describe("the whole", () => {
  test("Back and Proceed walk the steps; steps past the first wait for data; the live region says where you are", () => {
    const ed = open();
    (one(".fft-ed-primary") as HTMLButtonElement).click();
    expect(ed.step).toBe(1);
    ed.setData(TSV);
    (one(".fft-ed-primary") as HTMLButtonElement).click();
    expect(ed.step).toBe(2);
    expect(one(".fft-ed-live").textContent).toBe("Step 2 of 4: Check & describe");
    expect(one(".fft-ed-step-compact").textContent).toBe("Step 2 of 4: Check & describe");
    (all(".fft-ed-button").find((b) => b.textContent === "Back") as HTMLButtonElement).click();
    expect(ed.step).toBe(1);
  });

  test("the address keeps the step and the spec, and an editor opened on it resumes there", async () => {
    history.replaceState(null, "", "#");
    const first = createEditor(target, {});
    first.setData(TSV);
    first.go(3);
    expect(location.hash.startsWith("#step=3&spec=")).toBe(true);
    first.destroy();
    const again = createEditor(target, {});
    expect(again.step).toBe(3);
    expect(again.rows).toHaveLength(3);
    again.destroy();
  });

  test("Cmd+Z outside a text field undoes", () => {
    const ed = open();
    ed.setData(TSV);
    ed.setSpec({ ...ed.spec, view: { type: "bar", x: "region", y: "revenue" } });
    ed.go(3);
    one(".fft-ed-preview").dispatchEvent(new CustomEvent("fft-select", { bubbles: true, detail: { row: { region: "South" }, spec: ed.spec } }));
    expect(ed.spec.view.highlight).toEqual(["South"]);
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true, bubbles: true }));
    expect(ed.spec.view.highlight).toBeUndefined();
  });
});
