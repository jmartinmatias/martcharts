// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { DashboardSpec } from "../core/dashboard.ts";
import type { WidgetSpec } from "../core/types.ts";
import { categoryField } from "../core/view-context.ts";
import { createDashboard } from "./dashboard.ts";
import type { Dashboard } from "./dashboard.ts";
import "./views/index.ts";

/**
 * Clicks that lead somewhere: a click on a row filters by the name a reader sees, never an internal id; the line under
 * the filter row speaks only of the row's own filters; and a printout holds every folded section and every tab.
 */

const clients = [
  { id: "c39", name: "Moreau Holdings", segment: "Affluent", v: 3 },
  { id: "c12", name: "Aldana Holdings", segment: "Private", v: 5 },
];

describe("a click filters by the shown name, never an internal id", () => {
  test("a table whose rows carry an id and a name filters by the name, shown or not", () => {
    expect(categoryField({ type: "table", columns: ["name", "segment", "v"] }, clients[0]!)).toBe("name");
    // The id is the first column of the row, and no columns are named: still the name.
    expect(categoryField({ type: "table" }, clients[0]!)).toBe("name");
  });

  test("a list filters by its label; an id column ending in Id loses to a company name", () => {
    expect(categoryField({ type: "list", label: "name" }, clients[0]!)).toBe("name");
    expect(categoryField({ type: "table" }, { clientId: "c39", company: "Moreau Holdings", v: 1 })).toBe("company");
    expect(categoryField({ type: "table" }, { client_id: "c39", desk: "Benelux", v: 1 })).toBe("desk");
  });

  test("an id is used only when nothing else names the row; a view's own category option still wins", () => {
    expect(categoryField({ type: "table" }, { id: "c39", v: 1 })).toBe("id");
    // A map names its regions by code on purpose: its id option is honoured.
    expect(categoryField({ type: "choropleth", id: "country", value: "v" }, { country: "FR", name: "France", v: 1 })).toBe("country");
  });
});

let target: HTMLElement;
let board: Dashboard | undefined;
beforeEach(() => {
  document.body.innerHTML = "";
  history.replaceState(null, "", "/");
  target = document.createElement("div");
  document.body.append(target);
});
afterEach(() => {
  board?.destroy();
  board = undefined;
  vi.unstubAllGlobals();
});

const widgets: Record<string, WidgetSpec> = {
  clients: { title: "Clients", data: { type: "inline", rows: clients }, view: { type: "table", columns: ["name", "segment", "v"] } },
  regions: { title: "Regions", data: { type: "inline", rows: [{ region: "North", v: 1 }, { region: "South", v: 2 }] }, view: { type: "table" } },
  notes: { title: "Notes", data: { type: "inline", rows: [{ topic: "Rates", note: "up" }] }, view: { type: "table" } },
};
const slot = (id: string) => target.querySelector(`.fft-cell-slot[data-widget="${id}"]`) as HTMLElement;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("the line under the filter row speaks only of the row's filters", () => {
  test("a click on a client is left out of the line; a row filter that misses cards is in it", async () => {
    const spec: DashboardSpec = { filters: [{ field: "segment" }], widgets: [{ widget: "clients" }, { widget: "regions" }] };
    board = createDashboard(target, spec, { widgets });
    await board.ready;
    await board.setCrossFilter("name", "Moreau Holdings", "clients");
    await settle();
    const line = () => target.querySelector(".fft-unreached") as HTMLElement;
    expect(line().hidden).toBe(true);
    expect(line().textContent).not.toMatch(/Name/);
    await board.setFilter("segment", "Affluent");
    await settle();
    expect(line().hidden).toBe(false);
    expect(line().textContent).toMatch(/Segment/);
    expect(line().textContent).not.toMatch(/Name/);
    // The card the click cannot reach still says so on its own pill, for a reader who points at it.
    expect(slot("regions").querySelector(".fft-unfiltered")?.textContent).toMatch(/Name/);
  });
});

describe("a printout holds every folded section and every tab", () => {
  test("beforeprint draws and shows a folded section's cards, the state line says so, and afterprint folds it again", async () => {
    const spec: DashboardSpec = {
      title: "Book",
      widgets: [{ section: "Now" }, { widget: "clients" }, { section: "Reference", collapsed: true }, { widget: "notes" }],
    };
    board = createDashboard(target, spec, { widgets });
    await board.ready;
    expect(slot("notes").hidden).toBe(true);
    expect(slot("notes").querySelector(".fft-widget")).toBeNull();
    window.dispatchEvent(new Event("beforeprint"));
    await vi.waitFor(() => expect(slot("notes").querySelector('.fft-widget[data-state="ready"]')).not.toBeNull());
    expect(slot("notes").hidden).toBe(false);
    await vi.waitFor(() => expect(target.querySelector(".fft-print-state")?.textContent).toMatch(/Printed: every section/));
    window.dispatchEvent(new Event("afterprint"));
    expect(slot("notes").hidden).toBe(true);
    await vi.waitFor(() => expect(target.querySelector(".fft-print-state")?.textContent).not.toMatch(/Printed/));
    // Opened again on screen, its card is the one already drawn.
    (target.querySelector(".fft-section-toggle") as HTMLButtonElement).click();
    await settle();
    expect(slot("notes").hidden).toBe(false);
    expect(slot("notes").querySelectorAll(".fft-widget")).toHaveLength(1);
  });

  test("a board in tabs prints every tab, each section heading kept for its page break, then shows the open tab again", async () => {
    const spec: DashboardSpec = {
      sections: "tabs",
      widgets: [{ section: "Clients" }, { widget: "clients" }, { section: "Regions" }, { widget: "regions" }, { section: "Notes" }, { widget: "notes" }],
    };
    board = createDashboard(target, spec, { widgets });
    await board.ready;
    const visible = () => [...target.querySelectorAll(".fft-cell-slot")].filter((node) => !(node as HTMLElement).hidden).map((node) => (node as HTMLElement).dataset.widget);
    expect(visible()).toEqual(["clients"]);
    window.dispatchEvent(new Event("beforeprint"));
    await settle();
    expect(visible()).toEqual(["clients", "regions", "notes"]);
    const headings = [...target.querySelectorAll(".fft-board-section")].filter((node) => !(node as HTMLElement).hidden).map((node) => node.textContent);
    expect(headings.join(" ")).toMatch(/Clients.*Regions.*Notes/);
    window.dispatchEvent(new Event("afterprint"));
    expect(visible()).toEqual(["clients"]);
  });
});
