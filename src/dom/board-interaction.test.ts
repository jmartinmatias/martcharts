// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { validateDashboard } from "../core/dashboard.ts";
import type { DashboardSpec } from "../core/dashboard.ts";
import type { Row, WidgetSpec } from "../core/types.ts";
import { createLocalFetch } from "../mcp/store.ts";
import { asOfText, createDashboard } from "./dashboard.ts";
import type { Dashboard } from "./dashboard.ts";
import "./views/index.ts";

/** The commercial cockpit, whose client card and story follow the client clicked anywhere else. */
const cockpit = JSON.parse(readFileSync("dashboards/commercial-cockpit.json", "utf8")) as DashboardSpec;
const stored: Record<string, WidgetSpec> = {};
for (const file of readdirSync("widgets/commercial").filter((f) => f.endsWith(".json"))) {
  const spec = JSON.parse(readFileSync(`widgets/commercial/${file}`, "utf8")) as WidgetSpec;
  stored[spec.id as string] = spec;
}
const history = JSON.parse(readFileSync("public/data/client-history.json", "utf8")) as Row[];
const localFetch = createLocalFetch("public");

/** A small board: two widgets with a region, one without, and a month range. */
const rows = [
  { region: "East", segment: "Retail", month: "2026-08", revenue: 120 },
  { region: "West", segment: "Retail", month: "2026-09", revenue: 90 },
  { region: "East", segment: "Corporate", month: "2026-10", revenue: 200 },
];
const small: DashboardSpec = {
  id: "small",
  title: "Small board",
  asOf: "2026-10-25",
  filters: [{ field: "region", label: "Region" }],
  range: { field: "month" },
  widgets: [
    { section: "Revenue" },
    { widget: "by-region" },
    { widget: "by-segment" },
    { section: "People" },
    { widget: "headcount" },
  ],
};
const smallWidgets: Record<string, WidgetSpec> = {
  "by-region": { title: "By region", data: { type: "inline", rows }, view: { type: "hbar", label: "region", value: "revenue" } },
  "by-segment": { title: "By segment", data: { type: "inline", rows }, view: { type: "hbar", label: "segment", value: "revenue" } },
  headcount: { title: "Headcount", data: { type: "inline", rows: [{ team: "Ops", people: 4 }, { team: "Sales", people: 6 }] }, view: { type: "hbar", label: "team", value: "people" } },
};

let target: HTMLElement;
let board: Dashboard | undefined;
beforeEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
  target = document.createElement("div");
  document.body.append(target);
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});
afterEach(() => {
  board?.destroy();
  board = undefined;
  vi.unstubAllGlobals();
});

const slot = (id: string) => target.querySelector(`.fft-cell-slot[data-widget="${id}"]`) as HTMLElement;
const title = (id: string) => slot(id).querySelector(".fft-title")?.textContent ?? "";
const note = (id: string) => slot(id).querySelector(":scope > .fft-unfiltered")?.textContent ?? null;

describe("follow: a card that shows what was clicked elsewhere", () => {
  test("the spec reads: follow takes a field, an optional key it maps to and a default", () => {
    expect(validateDashboard(cockpit)).toEqual([]);
    const bad = { widgets: [{ widget: "a", follow: { as: "client" } }, { widget: "b", follow: { field: "name", as: "" } }, { section: "S", follow: { field: "name" } }] };
    expect(validateDashboard(bad).map((issue) => issue.path)).toEqual(["widgets[0].follow.field", "widgets[1].follow.as", "widgets[2].follow"]);
  });

  test("clicking a client in the revenue ranking turns the x-ray and the story to that client, names included", async () => {
    board = createDashboard(target, cockpit, { widgets: stored, fetch: localFetch });
    await board.ready;
    // Before anything is picked, both cards show the client their specs name.
    expect(title("cc-client-xray")).toBe("Client x-ray: Aldana Holdings");
    expect(title("cc-client-story")).toBe("Aldana Holdings, the story so far");
    await board.setCrossFilter("name", "Zanetti Foods", "cc-revenue-pareto");
    await vi.waitFor(() => expect(title("cc-client-xray")).toBe("Client x-ray: Zanetti Foods"));
    expect(title("cc-client-story")).toBe("Zanetti Foods, the story so far");
    const xray = board.widgets.get("cc-client-xray");
    const story = board.widgets.get("cc-client-story");
    await vi.waitFor(() => expect(xray?.rows.map((row) => row.name)).toEqual(["Zanetti Foods"]));
    // The story keys on client, not name: the follow maps the field, and every event is that client's.
    await vi.waitFor(() => expect(story?.rows.length).toBe(history.filter((row) => row.client === "Zanetti Foods").length));
    expect(new Set(story?.rows.map((row) => row.client))).toEqual(new Set(["Zanetti Foods"]));
    // Neither says it is unfiltered by the click: following it is how they take it.
    expect([note("cc-client-xray"), note("cc-client-story")]).toEqual([null, null]);
    // Clearing the click brings the written client back.
    await board.setCrossFilter(null);
    await vi.waitFor(() => expect(title("cc-client-story")).toBe("Aldana Holdings, the story so far"));
  }, 30_000);

  test("a click made on the following card itself does not move it", async () => {
    board = createDashboard(target, cockpit, { widgets: stored, fetch: localFetch });
    await board.ready;
    await board.setCrossFilter("name", "Aldana Holdings", "cc-client-xray");
    expect(title("cc-client-xray")).toBe("Client x-ray: Aldana Holdings");
  }, 30_000);
});

describe("Not filtered by: cards a filter cannot reach say so", () => {
  test("the note sits exactly on the cards whose data lacks the field, and only while the filter is set", async () => {
    board = createDashboard(target, small, { widgets: smallWidgets });
    await board.ready;
    expect(target.querySelectorAll(".fft-unfiltered")).toHaveLength(0);
    await board.setFilter("region", "East");
    await vi.waitFor(() => expect(note("headcount")).toBe("Not filtered by Region"));
    expect([note("by-region"), note("by-segment")]).toEqual([null, null]);
    // A period and a click filter join the same note.
    await board.setRange("3M");
    await board.setCrossFilter("segment", "Retail", "by-segment");
    await vi.waitFor(() => expect(note("headcount")).toBe("Not filtered by Region, Period or Segment"));
    expect(note("by-segment")).toBeNull();
    await board.setFilter("region", null);
    await board.setRange("All");
    await board.setCrossFilter(null);
    await vi.waitFor(() => expect(target.querySelectorAll(".fft-unfiltered")).toHaveLength(0));
  });

  test("the cockpit's segment filter marks the cards without a segment, and none with one", async () => {
    board = createDashboard(target, cockpit, { widgets: stored, fetch: localFetch });
    await board.ready;
    await board.setFilter("segment", "Private");
    const ids = cockpit.widgets.flatMap((cell) => (cell.widget ? [cell.widget] : []));
    const fieldsOf = async (id: string) => {
      const spec = stored[id] as WidgetSpec;
      const url = String(spec.data.url ?? "");
      const data = spec.data.type === "inline" ? (spec.data.rows as Row[]) : url ? ((await (await localFetch(url)).json()) as Row[]) : [];
      return new Set(data.flatMap((row) => Object.keys(row)));
    };
    const lacking: string[] = [];
    for (const id of ids) if (!(await fieldsOf(id)).has("segment")) lacking.push(id);
    await vi.waitFor(() => expect(ids.filter((id) => note(id) !== null).sort()).toEqual(lacking.sort()));
    expect(note(lacking[0] as string)).toBe("Not filtered by Segment");
  }, 30_000);
});

describe("Copy link: the view as it is, in one address", () => {
  test("the copied link holds the section, filters, period and click filter, and opens the board exactly so", async () => {
    const copied: string[] = [];
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: async (text: string) => void copied.push(text) } });
    board = createDashboard(target, small, { widgets: smallWidgets, hash: true });
    await board.ready;
    board.setSection("Revenue");
    await board.setFilter("region", "East");
    await board.setRange("3M");
    await board.setCrossFilter("segment", "Corporate", "by-segment");
    const shared = vi.fn();
    board.root.addEventListener("fft-share", shared);
    const button = [...target.querySelectorAll<HTMLButtonElement>(".fft-board-tool")].find((b) => b.textContent === "Copy link") as HTMLButtonElement;
    button.click();
    await vi.waitFor(() => expect(copied).toHaveLength(1));
    expect(button.textContent).toBe("Link copied");
    expect(shared.mock.calls[0]?.[0].detail.copied).toBe(true);
    const link = new URL(copied[0] as string);
    expect(link.hash).toMatch(/^#small-revenue&cf=.+&f=.+&p=3M$/);
    board.destroy();
    board = undefined;

    // A fresh board opened on that address comes back with the same view.
    window.history.replaceState(null, "", `/${link.hash}`);
    document.body.innerHTML = "";
    target = document.createElement("div");
    document.body.append(target);
    board = createDashboard(target, small, { widgets: smallWidgets, hash: true });
    await board.ready;
    expect(board.crossFilter()).toEqual({ field: "segment", value: "Corporate", source: "by-segment" });
    expect((target.querySelector(".fft-filter select") as HTMLSelectElement).selectedOptions[0]?.textContent).toBe("East");
    expect(target.querySelector('.fft-range button[aria-pressed="true"]')?.textContent).toBe("3M");
    expect(target.querySelector(".fft-dashboard")?.getAttribute("data-section")).toBe("small-revenue");
    await vi.waitFor(() => expect(board?.widgets.get("by-region")?.rows.map((row) => row.region)).toEqual(["East"]));
  });

  test("without an address to keep, there is no copy button; Print is always there", async () => {
    board = createDashboard(target, small, { widgets: smallWidgets });
    await board.ready;
    expect([...target.querySelectorAll(".fft-board-tool")].map((b) => b.textContent)).toEqual(["Print"]);
  });
});

describe("Print and as-of", () => {
  test("the print stylesheet hides the controls, lays cards one per row, unbroken, and breaks the page per section", () => {
    createDashboard(target, small, { widgets: smallWidgets }).destroy();
    const css = document.getElementById("fft-board-styles")?.textContent ?? "";
    const print = css.slice(css.indexOf("@media print"));
    expect(print).toContain(".fft-filters");
    expect(print).toMatch(/\.fft-dashboard-grid \{ display: block/);
    expect(print).toMatch(/\.fft-cell-slot \{[^}]*break-inside: avoid/);
    expect(print).toMatch(/\.fft-board-section \{[^}]*break-before: page/);
    expect(print).toMatch(/\.fft-print-state \{ display: block/);
  });

  test("the printed state line says what the page shows, and the header says when the data was true", async () => {
    board = createDashboard(target, small, { widgets: smallWidgets });
    await board.ready;
    const state = () => target.querySelector(".fft-print-state")?.textContent ?? "";
    expect(state()).toContain("Small board");
    expect(state()).toContain("Period: All");
    await board.setFilter("region", "West");
    await vi.waitFor(() => expect(state()).toContain("Region: West"));
    expect(target.querySelector(".fft-dashboard-asof")?.textContent).toMatch(/^As of .*2026$/);
    expect(state()).toMatch(/As of .*2026/);
  });

  test("asOf reads a date, words with {latest}, or plain words", async () => {
    expect(asOfText("2026-10-25", "")).toMatch(/^As of (25 Oct 2026|Oct 25, 2026)$/);
    expect(asOfText("Data to {latest}", "2026-10")).toBe(`Data to ${new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 9, 1)))}`);
    expect(asOfText("Data to {latest}", "")).toBe("");
    expect(asOfText("Weekly close", "")).toBe("Weekly close");
    expect(validateDashboard({ asOf: 3, widgets: [] }).map((issue) => issue.path)).toEqual(["asOf"]);
    // {latest} is the newest month across the widgets with the range field.
    board = createDashboard(target, { ...small, asOf: "Data to {latest}" }, { widgets: smallWidgets });
    await board.ready;
    await vi.waitFor(() => expect(target.querySelector(".fft-dashboard-asof")?.textContent).toBe(asOfText("Data to {latest}", "2026-10")));
  });
});
