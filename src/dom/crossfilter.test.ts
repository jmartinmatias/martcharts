// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { validateDashboard } from "../core/dashboard.ts";
import type { DashboardSpec } from "../core/dashboard.ts";
import type { Row, WidgetSpec } from "../core/types.ts";
import { categoryField, fillRowTemplate } from "../core/view-context.ts";
import { createDashboard } from "./dashboard.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

const sales = [
  { region: "North", revenue: 120, owner: "Ana" },
  { region: "South", revenue: 90, owner: "Ben" },
  { region: "East", revenue: 200, owner: "Cleo" },
];
const deals = [
  { deal: "D-1", region: "East", amount: 5 },
  { deal: "D-2", region: "North", amount: 7 },
  { deal: "D-3", region: "East", amount: 9 },
];
const widgets: Record<string, WidgetSpec> = {
  ranking: { title: "Revenue by region", data: { type: "inline", rows: sales }, view: { type: "hbar", label: "region", value: "revenue" } },
  deals: { title: "Deals", data: { type: "inline", rows: deals }, view: { type: "table", columns: ["deal", "region", "amount"] } },
  months: { title: "Months", data: { type: "inline", rows: [{ month: "Jan", v: 1 }, { month: "Feb", v: 2 }] }, view: { type: "table" } },
};
const board: DashboardSpec = { title: "Sales", widgets: [{ widget: "ranking" }, { widget: "deals" }, { widget: "months" }] };

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  history.replaceState(null, "", "/");
  target = document.createElement("div");
  document.body.append(target);
});

const slot = (id: string) => target.querySelector(`.fft-cell-slot[data-widget="${id}"]`) as HTMLElement;
const rowsOf = (id: string) => [...slot(id).querySelectorAll(".fft-table:not(.fft-sr-only *) tbody tr")].map((tr) => tr.querySelector("td")?.textContent);
const bar = (name: string) => [...slot("ranking").querySelectorAll<HTMLElement>(".fft-hbar")].find((item) => item.querySelector(".fft-hbar-label")?.textContent === name) as HTMLElement;
const chip = () => target.querySelector<HTMLButtonElement>(".fft-crossfilter") ?? ({ hidden: true } as HTMLButtonElement);

describe("cross-filtering a dashboard", () => {
  test("a click on East filters every other widget with a region to East, and leaves the rest alone", async () => {
    const dash = createDashboard(target, board, { widgets });
    await dash.ready;
    bar("East").click();
    await vi.waitFor(() => expect(rowsOf("deals")).toEqual(["D-1", "D-3"]));
    expect(rowsOf("months")).toEqual(["Jan", "Feb"]);
    expect(dash.crossFilter()).toEqual({ field: "region", value: "East", source: "ranking" });
  });

  test("the clicked chart keeps its data and lights the value up", async () => {
    const dash = createDashboard(target, board, { widgets });
    await dash.ready;
    bar("East").click();
    await vi.waitFor(() => expect(dash.widgets.get("ranking")?.spec.view.highlight).toBe("East"));
    expect(slot("ranking").querySelectorAll(".fft-hbar")).toHaveLength(3);
  });

  test("a chip names the filter; clicking it clears the filter and every widget comes back", async () => {
    const dash = createDashboard(target, board, { widgets });
    await dash.ready;
    expect(chip().hidden).toBe(true);
    bar("East").click();
    await vi.waitFor(() => expect(chip().hidden).toBe(false));
    expect([chip().querySelector(".fft-crossfilter-text")?.textContent, chip().getAttribute("aria-label")]).toEqual(["Region: East", "Clear filter Region: East"]);
    chip().click();
    await vi.waitFor(() => expect([rowsOf("deals"), dash.widgets.get("ranking")?.spec.view.highlight]).toEqual([["D-1", "D-2", "D-3"], undefined]));
    expect([chip().hidden, dash.crossFilter()]).toEqual([true, null]);
  });

  test("Escape clears it, and so does clicking the same mark again", async () => {
    const dash = createDashboard(target, board, { widgets });
    await dash.ready;
    bar("East").click();
    await vi.waitFor(() => expect(dash.crossFilter()).not.toBeNull());
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await vi.waitFor(() => expect(dash.crossFilter()).toBeNull());
    bar("North").click();
    await vi.waitFor(() => expect(rowsOf("deals")).toEqual(["D-2"]));
    bar("North").click();
    await vi.waitFor(() => expect(dash.crossFilter()).toBeNull());
    await vi.waitFor(() => expect(rowsOf("deals")).toEqual(["D-1", "D-2", "D-3"]));
  });

  test("a table row filters the charts too, on its first text column", async () => {
    const dash = createDashboard(target, { widgets: [{ widget: "deals" }, { widget: "ranking" }] }, { widgets });
    await dash.ready;
    (slot("deals").querySelector(".fft-table tbody tr") as HTMLElement).click();
    await vi.waitFor(() => expect(dash.crossFilter()?.field).toBe("deal"));
    // The ranking has no deal field, so it is left alone.
    expect(slot("ranking").querySelectorAll(".fft-hbar")).toHaveLength(3);
  });

  test("the board fires fft-crossfilter with the filter, and null when it clears", async () => {
    const dash = createDashboard(target, board, { widgets });
    await dash.ready;
    const seen: unknown[] = [];
    dash.root.addEventListener("fft-crossfilter", (event) => seen.push((event as CustomEvent).detail));
    await dash.setCrossFilter("region", "South");
    await dash.setCrossFilter(null);
    expect(seen).toEqual([{ field: "region", value: "South" }, null]);
  });

  test("crossFilter: false on the board or in the options turns clicks back into plain selections", async () => {
    for (const [spec, options] of [
      [{ ...board, crossFilter: false }, {}],
      [board, { crossFilter: false }],
    ] as const) {
      target.replaceChildren();
      const dash = createDashboard(target, spec, { widgets, ...options });
      await dash.ready;
      bar("East").click();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect([dash.crossFilter(), rowsOf("deals")]).toEqual([null, ["D-1", "D-2", "D-3"]]);
      dash.destroy();
    }
  });

  test("with hash on, the filter lives in the address and a reload opens the board filtered", async () => {
    const dash = createDashboard(target, board, { widgets, hash: true });
    await dash.ready;
    bar("East").click();
    await vi.waitFor(() => expect(location.hash).toContain("cf="));
    const address = location.hash;
    expect(JSON.parse(decodeURIComponent(address.slice(address.indexOf("cf=") + 3)))).toEqual(["region", "East", "ranking"]);
    dash.destroy();
    target.replaceChildren();
    const again = createDashboard(target, board, { widgets, hash: true });
    await again.ready;
    expect([again.crossFilter(), rowsOf("deals")]).toEqual([{ field: "region", value: "East", source: "ranking" }, ["D-1", "D-3"]]);
    await again.setCrossFilter(null);
    expect(location.hash).toBe("");
  });

  test("the section and the filter share the address", async () => {
    const spec: DashboardSpec = { id: "b", widgets: [{ section: "Top" }, { widget: "ranking" }, { section: "Detail" }, { widget: "deals" }] };
    const dash = createDashboard(target, spec, { widgets, hash: true });
    await dash.ready;
    dash.setSection("Detail");
    await dash.setCrossFilter("region", "North");
    expect(location.hash.startsWith("#b-detail&cf=")).toBe(true);
    await dash.setCrossFilter(null);
    expect(location.hash).toBe("#b-detail");
  });

  test("validation: crossFilter is true or false", () => {
    expect(validateDashboard({ widgets: [], crossFilter: "yes" }).map((issue) => issue.path)).toEqual(["crossFilter"]);
    expect(validateDashboard({ widgets: [], crossFilter: false })).toEqual([]);
  });
});

describe("categoryField: the field a click filters on", () => {
  const cases: [string, Record<string, unknown>, Row, string | undefined][] = [
    ["hbar and donut: label", { type: "hbar", label: "region", value: "revenue" }, { region: "East", revenue: 3 }, "region"],
    ["bar: x", { type: "bar", x: "month", y: "revenue" }, { month: "2026-03", revenue: 3 }, "month"],
    ["choropleth: id", { type: "choropleth", id: "country", value: "aum" }, { country: "LU", aum: 3 }, "country"],
    ["whitespace: row", { type: "whitespace", row: "client", column: "product", state: "state" }, { client: "Aldana", product: "FX", state: "Holds" }, "client"],
    ["matrix: x before y", { type: "matrix", x: "quarter", y: "topic" }, { quarter: "2026-Q1", topic: "AML" }, "quarter"],
    ["a number-only option is skipped", { type: "scatter", x: "risk", y: "return", label: "client" }, { risk: 3, return: 0.1, client: "Keller" }, "client"],
    ["table: the first text column", { type: "table" }, { amount: 5, deal: "D-1", region: "East" }, "deal"],
    ["nothing to filter on", { type: "kpi", value: "v" }, { v: 3 }, undefined],
  ];
  test.each(cases)("%s", (_name, view, row, field) => {
    expect(categoryField(view as { type: string }, row)).toBe(field);
  });
});

describe("tooltip templates", () => {
  const spec = (tooltip: unknown): WidgetSpec =>
    ({
      locale: "en-US",
      data: { type: "inline", rows: sales },
      fields: { revenue: { format: { type: "currency", currency: "EUR" } } },
      view: { type: "hbar", label: "region", value: "revenue" },
      tooltip,
    }) as WidgetSpec;
  const tipRows = () => [...target.querySelectorAll(".fft-tooltip-row")].map((row) => [row.querySelector(".fft-tooltip-label")?.textContent, row.querySelector(".fft-tooltip-value")?.textContent]);

  test("each line fills from the mark's row; 'Label: value' lines read like built-in rows", async () => {
    await createWidget(target, spec("Revenue: {revenue}\nOwner: {owner}\n{count} regions in all")).ready;
    target.querySelectorAll<HTMLElement>(".fft-hbar")[2]?.dispatchEvent(new Event("focus"));
    expect(target.querySelector(".fft-tooltip-title")?.textContent).toBe("East");
    expect(tipRows()).toEqual([
      ["Revenue", "€200.00"],
      ["Owner", "Cleo"],
      ["3 regions in all", ""],
    ]);
  });

  test("an object sets the title as well", async () => {
    await createWidget(target, spec({ title: "{region}, run by {owner}", body: "Revenue: {revenue}" })).ready;
    target.querySelectorAll<HTMLElement>(".fft-hbar")[0]?.dispatchEvent(new Event("focus"));
    expect(target.querySelector(".fft-tooltip-title")?.textContent).toBe("North, run by Ana");
  });

  test("no template, no change", async () => {
    await createWidget(target, spec(undefined)).ready;
    target.querySelectorAll<HTMLElement>(".fft-hbar")[0]?.dispatchEvent(new Event("focus"));
    expect(tipRows()).toEqual([["Revenue", "€120.00"]]);
  });

  test("fillRowTemplate leaves words that name no field alone", () => {
    expect(fillRowTemplate("{region} {nope}", { region: "East" }, (value) => String(value))).toBe("East {nope}");
  });
});
