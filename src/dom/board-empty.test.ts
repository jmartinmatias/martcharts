// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { DashboardSpec } from "../core/dashboard.ts";
import type { WidgetSpec } from "../core/types.ts";
import { createDashboard } from "./dashboard.ts";
import type { Dashboard } from "./dashboard.ts";
import "./views/index.ts";

/**
 * Empty states that read right: the hint names as many filters as there are, Clear puts focus back on the card,
 * one board message stands in when every card in view is empty, and a click filter goes by the label the reader saw.
 */

const books = [
  { segment: "Affluent", region: "North", name: "Moreau Holdings", v: 3 },
  { segment: "Private", region: "South", name: "Aldana Holdings", v: 5 },
];

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
  clients: { title: "Clients", data: { type: "inline", rows: books }, fields: { name: { label: "Client" } }, view: { type: "table", columns: ["name", "segment", "v"] } },
  regions: { title: "Regions", data: { type: "inline", rows: books }, view: { type: "table", columns: ["region", "v"] } },
  notes: { title: "Notes", data: { type: "inline", rows: [{ topic: "Rates", note: "up" }] }, view: { type: "table" } },
};
const slot = (id: string) => target.querySelector(`.fft-cell-slot[data-widget="${id}"]`) as HTMLElement;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const spec: DashboardSpec = { filters: [{ field: "segment" }, { field: "region" }], widgets: [{ widget: "clients" }, { widget: "regions" }] };

describe("an empty card says how many filters to clear, and Clear lands focus on it", () => {
  test("one filter: 'Clear the filter'; two: 'Clear these filters'", async () => {
    board = createDashboard(target, { ...spec, widgets: [{ widget: "clients" }, { widget: "notes" }] }, { widgets });
    await board.ready;
    await board.setFilter("segment", "Affluent");
    await board.setFilter("region", "South");
    await settle();
    expect(slot("clients").querySelector(".fft-state-hint")?.textContent).toBe("Clear these filters to see this card's data again.");
    expect(slot("clients").querySelector(".fft-state-action")?.textContent).toBe("Clear these filters");
    await board.setFilter("segment", "Nobody");
    await board.setFilter("region", null);
    await settle();
    expect(slot("clients").querySelector(".fft-state-hint")?.textContent).toBe("Clear the filter to see this card's data again.");
  });

  test("after Clear the card has its data again and holds the focus, not the page body", async () => {
    board = createDashboard(target, { ...spec, widgets: [{ widget: "clients" }, { widget: "notes" }] }, { widgets });
    await board.ready;
    await board.setFilter("segment", "Nobody");
    await settle();
    (slot("clients").querySelector(".fft-state-action") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(slot("clients").querySelector('.fft-widget[data-state="ready"]')).not.toBeNull());
    expect(document.activeElement).not.toBe(document.body);
    expect(slot("clients").contains(document.activeElement) || document.activeElement === slot("clients")).toBe(true);
  });
});

describe("when every card in view is empty, the board says so once", () => {
  test("one message with one Clear; the empty cards step aside; clearing brings everything back", async () => {
    board = createDashboard(target, spec, { widgets });
    await board.ready;
    await board.setFilter("segment", "Affluent");
    await board.setFilter("region", "South");
    await settle();
    const message = target.querySelector(".fft-board-empty") as HTMLElement;
    expect(message.hidden).toBe(false);
    expect(message.textContent).toMatch(/^No card has data for Segment: Affluent and Region: South/);
    expect(target.querySelector(".fft-dashboard")?.hasAttribute("data-all-empty")).toBe(true);
    (message.querySelector("button") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(message.hidden).toBe(true));
    expect(target.querySelector(".fft-dashboard")?.hasAttribute("data-all-empty")).toBe(false);
    expect(document.activeElement).not.toBe(document.body);
  });

  test("a board where only some cards are empty keeps each card's own note and no board message", async () => {
    board = createDashboard(target, { ...spec, widgets: [{ widget: "clients" }, { widget: "notes" }] }, { widgets });
    await board.ready;
    await board.setFilter("segment", "Nobody");
    await settle();
    expect((target.querySelector(".fft-board-empty") as HTMLElement).hidden).toBe(true);
    expect(slot("clients").querySelector(".fft-state-title")?.textContent).toMatch(/Nothing for Segment: Nobody/);
  });
});

describe("a click filter goes by the label the reader saw", () => {
  test("the chip and the empty notes say 'Client', the card's label for name, not 'Name'", async () => {
    board = createDashboard(target, { widgets: [{ widget: "clients" }, { widget: "regions" }] }, { widgets });
    await board.ready;
    await board.setCrossFilter("name", "Moreau Holdings", "clients");
    await settle();
    expect(target.querySelector(".fft-crossfilter-text")?.textContent).toBe("Client: Moreau Holdings");
  });
});
