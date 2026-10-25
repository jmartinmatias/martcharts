// @vitest-environment jsdom
/**
 * A dashboard for keyboard and screen-reader users: one tab stop per card, focus that comes back to the mark after
 * a click filter and its clearing, one polite announcement per change, and skip links to the filters and sections.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { DashboardSpec } from "../core/dashboard.ts";
import type { Row, WidgetSpec } from "../core/types.ts";
import { createLocalFetch } from "../mcp/store.ts";
import { createDashboard } from "./dashboard.ts";
import type { Dashboard } from "./dashboard.ts";
import "./views/index.ts";

const rows: Row[] = [];
for (const [region, base] of [["East", 120], ["West", 90], ["North", 60]] as const) {
  for (let m = 1; m <= 6; m++) rows.push({ region, month: `2026-0${m}`, revenue: base + m * 5 });
}
const notes: Row[] = [{ topic: "Pricing", owner: "Ana" }, { topic: "Service", owner: "Ben" }];

/** Three cards: revenue by region, revenue by month, and notes that carry neither field (no filter reaches them). */
const widgets: Record<string, WidgetSpec> = {
  byRegion: {
    title: "Revenue by region",
    data: { type: "inline", rows },
    transform: [{ type: "aggregate", groupBy: "region", measures: [{ op: "sum", field: "revenue" }] }],
    view: { type: "hbar", label: "region", value: "revenue" },
  },
  byMonth: {
    title: "Revenue by month",
    data: { type: "inline", rows },
    transform: [{ type: "aggregate", groupBy: "month", measures: [{ op: "sum", field: "revenue" }] }],
    view: { type: "bar", x: "month", y: "revenue" },
  },
  notes: { title: "Open notes", data: { type: "inline", rows: notes }, view: { type: "table", sortable: false } },
};
const spec: DashboardSpec = {
  id: "a11y",
  title: "Sales",
  range: { field: "month" },
  filters: [{ field: "region", label: "Region" }],
  widgets: [{ section: "Revenue" }, { widget: "byRegion" }, { widget: "byMonth" }, { section: "Notes" }, { widget: "notes" }],
};

let target: HTMLElement;
let board: Dashboard | undefined;
beforeEach(() => {
  document.documentElement.lang = "en";
  document.body.innerHTML = "";
  target = document.createElement("main");
  document.body.append(target);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => {
  board?.destroy();
  board = undefined;
  vi.unstubAllGlobals();
});

async function open(): Promise<Dashboard> {
  board = createDashboard(target, spec, { widgets });
  await board.ready;
  return board;
}
const slot = (id: string) => target.querySelector<HTMLElement>(`.fft-cell-slot[data-widget="${id}"]`) as HTMLElement;
const press = (node: Element, key: string) => node.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
const live = () => target.querySelector(".fft-board-live")?.textContent ?? "";
const active = () => document.activeElement as HTMLElement | null;
/** Everything a Tab press can land on in the board. */
const tabStops = (root: Element) =>
  [...root.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]")].filter(
    (node) => !(node as HTMLButtonElement).disabled && !node.closest("[hidden]") && (node.getAttribute("tabindex") === null || Number(node.getAttribute("tabindex")) >= 0),
  );

describe("one tab stop per card", () => {
  test("each card is one stop, named by its title; nothing inside a card is a stop until focus goes in", async () => {
    await open();
    const cards = [...target.querySelectorAll<HTMLElement>(".fft-cell-slot")];
    expect(cards.map((card) => [card.getAttribute("tabindex"), card.getAttribute("role"), card.getAttribute("aria-label")])).toEqual([
      ["0", "group", "Revenue by region"],
      ["0", "group", "Revenue by month"],
      ["0", "group", "Open notes"],
    ]);
    expect(cards.every((card) => document.getElementById(card.getAttribute("aria-describedby") ?? "")?.textContent?.includes("Enter"))).toBe(true);
    expect(tabStops(target).filter((node) => node.closest(".fft-widget"))).toEqual([]);
  });

  test("Enter goes into a card, its marks rove with the arrows, Tab reaches its tools, and Escape comes back out", async () => {
    await open();
    const card = slot("byRegion");
    card.focus();
    press(card, "Enter");
    expect(active()?.classList.contains("fft-hbar")).toBe(true);
    expect(active()?.getAttribute("aria-label")).toMatch(/^East/);
    // Inside, the card's own stops are back: the marks' entry (and its tools, when it has any).
    expect(tabStops(card)).toContain(active());
    press(active() as HTMLElement, "ArrowDown");
    expect(active()?.getAttribute("aria-label")).toMatch(/^West/);
    // The first Escape dismisses the mark's tooltip, the next comes back out to the card.
    press(active() as HTMLElement, "Escape");
    press(active() as HTMLElement, "Escape");
    expect(active()).toBe(card);
    // Out again, the card is one stop.
    active()?.blur();
    await Promise.resolve();
    expect(tabStops(card).filter((node) => node !== card)).toEqual([]);
  });

  test("a redraw while focus is elsewhere keeps the card's inside out of the order", async () => {
    const dash = await open();
    await dash.setFilter("region", "East");
    await Promise.resolve();
    expect(tabStops(target).filter((node) => node.closest(".fft-widget"))).toEqual([]);
  });

  test("cardStops: false leaves every control a stop of its own", async () => {
    board = createDashboard(target, spec, { widgets, cardStops: false });
    await board.ready;
    expect(slot("byRegion").hasAttribute("tabindex")).toBe(false);
    expect(tabStops(target).filter((node) => node.closest(".fft-widget")).length).toBeGreaterThan(0);
  });
});

describe("focus after a click filter", () => {
  /** Goes into the region card, moves to West, and presses Enter on it: a click filter on West. */
  async function filterOnWest() {
    const card = slot("byRegion");
    card.focus();
    press(card, "Enter");
    press(active() as HTMLElement, "ArrowDown");
    press(active() as HTMLElement, "Enter");
    await vi.waitFor(() => expect(board?.crossFilter()).toEqual({ field: "region", value: "West", source: "byRegion" }));
    await vi.waitFor(() => expect(active()?.getAttribute("aria-label")).toMatch(/^West/));
    return card;
  }

  test("focus stays on the mark that set it, in its redrawn card", async () => {
    await open();
    const card = await filterOnWest();
    expect(card.contains(active())).toBe(true);
    expect(active()?.getAttribute("tabindex")).toBe("0");
  });

  test("clearing with Escape brings focus back to that mark", async () => {
    await open();
    await filterOnWest();
    // The focused mark shows its tooltip: the first Escape dismisses it, the next clears the click filter.
    press(active() as HTMLElement, "Escape");
    expect(board?.crossFilter()).not.toBeNull();
    press(active() as HTMLElement, "Escape");
    await vi.waitFor(() => expect(board?.crossFilter()).toBeNull());
    await vi.waitFor(() => expect(active()?.getAttribute("aria-label")).toMatch(/^West/));
    expect(slot("byRegion").contains(active())).toBe(true);
  });

  test("clearing with the chip brings focus back to that mark, not to the page", async () => {
    await open();
    await filterOnWest();
    const chip = target.querySelector<HTMLButtonElement>(".fft-crossfilter") as HTMLButtonElement;
    chip.focus();
    chip.click();
    await vi.waitFor(() => expect(board?.crossFilter()).toBeNull());
    await vi.waitFor(() => expect(active()?.getAttribute("aria-label")).toMatch(/^West/));
    expect(active()).not.toBe(document.body);
  });

  test("when the mark is gone, the clear leaves focus on the filter row", async () => {
    const dash = await open();
    await filterOnWest();
    // A row filter that drops West takes the mark away before the click filter is cleared.
    await dash.setFilter("region", "East");
    const chip = target.querySelector<HTMLButtonElement>(".fft-crossfilter") as HTMLButtonElement;
    chip.click();
    await vi.waitFor(() => expect(dash.crossFilter()).toBeNull());
    await vi.waitFor(() => expect(active()?.classList.contains("fft-filters")).toBe(true));
  });
});

describe("each change said once, politely", () => {
  test("the live region is polite and atomic, and the first load says nothing", async () => {
    await open();
    const region = target.querySelector(".fft-board-live") as HTMLElement;
    expect([region.getAttribute("role"), region.getAttribute("aria-live"), region.getAttribute("aria-atomic")]).toEqual(["status", "polite", "true"]);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(live()).toBe("");
  });

  test("a filter set and cleared, with how many cards it reached", async () => {
    await open();
    const select = target.querySelector<HTMLSelectElement>(".fft-filter select") as HTMLSelectElement;
    select.value = String([...select.options].findIndex((o) => o.textContent === "East") - 1);
    select.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(live()).toBe("Region: East. 2 of 3 cards updated."));
    select.value = "";
    select.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(live()).toBe("Region filter cleared. All 3 cards updated."));
  });

  test("the period, the click filter and the section each say what changed", async () => {
    const dash = await open();
    await dash.setRange("3M");
    await vi.waitFor(() => expect(live()).toBe("Period: 3M. 2 of 3 cards updated."));
    await dash.setRange("All");
    await vi.waitFor(() => expect(live()).toBe("Period: All. All 3 cards updated."));
    await dash.setCrossFilter("region", "North", "byRegion");
    await vi.waitFor(() => expect(live()).toBe("Region: North. 2 of 3 cards updated."));
    await dash.setCrossFilter(null);
    await vi.waitFor(() => expect(live()).toBe("Region filter cleared. All 3 cards updated."));
    dash.setSection("Notes");
    await vi.waitFor(() => expect(live()).toBe("Notes: 1 card shown."));
    dash.setSection(null);
    await vi.waitFor(() => expect(live()).toBe("All sections: 3 cards shown."));
  });

  test("quick changes say only the last, and the same news is never said twice in a row", async () => {
    const dash = await open();
    const said: string[] = [];
    const region = target.querySelector(".fft-board-live") as HTMLElement;
    new MutationObserver(() => said.push(region.textContent ?? "")).observe(region, { childList: true, characterData: true, subtree: true });
    dash.setSection("Notes");
    dash.setSection("Revenue");
    await vi.waitFor(() => expect(live()).toBe("Revenue: 2 cards shown."));
    dash.setSection("Revenue");
    await dash.setFilter("region", "West");
    await dash.setFilter("region", "West");
    await vi.waitFor(() => expect(live()).toBe("Region: West. 2 of 3 cards updated."));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(said).toEqual(["Revenue: 2 cards shown.", "Region: West. 2 of 3 cards updated."]);
  });

  test("in the board's language", async () => {
    const fr = Object.fromEntries(Object.entries(widgets).map(([id, w]) => [id, { ...w, locale: "fr-FR" }]));
    board = createDashboard(target, spec, { widgets: fr });
    await board.ready;
    await board.setFilter("region", "East");
    await vi.waitFor(() => expect(live()).toBe("Region : East. 2 cartes sur 3 mises à jour."));
  });
});

describe("skip links", () => {
  test("open the board, to the filters and to each section, as two stops", async () => {
    await open();
    const nav = target.querySelector(".fft-skip") as HTMLElement;
    expect(nav.getAttribute("aria-label")).toBe("Skip links");
    expect([...nav.querySelectorAll("a")].map((a) => a.textContent)).toEqual(["Skip to filters", "Skip to Revenue", "Skip to Notes"]);
    // The board's first stops are the skip links: one to the filters, and the section list as one roving stop.
    expect(tabStops(target).slice(0, 2).map((node) => node.textContent)).toEqual(["Skip to filters", "Skip to Revenue"]);
    const [, first, second] = [...nav.querySelectorAll<HTMLAnchorElement>("a")] as HTMLAnchorElement[];
    first?.focus();
    press(first as HTMLElement, "ArrowDown");
    expect(active()).toBe(second);
  });

  test("move focus to the filter row and to the section's heading, without touching the address", async () => {
    await open();
    const [toFilters, , toNotes] = [...target.querySelectorAll<HTMLAnchorElement>(".fft-skip a")];
    const before = location.hash;
    toFilters?.click();
    expect(active()?.classList.contains("fft-filters")).toBe(true);
    toNotes?.click();
    expect(active()?.tagName).toBe("H3");
    expect(active()?.textContent).toBe("Notes");
    expect(location.hash).toBe(before);
  });

  test("a section the section filter hides is shown again before its heading takes focus", async () => {
    const dash = await open();
    dash.setSection("Revenue");
    const toNotes = target.querySelectorAll<HTMLAnchorElement>(".fft-skip a")[2] as HTMLAnchorElement;
    toNotes.click();
    expect(active()?.textContent).toBe("Notes");
    expect(active()?.closest("[hidden]")).toBeNull();
  });

  test("the board with its card stops and skip links has no axe violations", async () => {
    await open();
    const result = await axe.run(target, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.flatMap((v) => v.nodes.map((node) => `${v.id}: ${node.target.join(" ")}`))).toEqual([]);
  });
});

describe("tab stops on the worked dashboards", () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(`${dir}/${f}`).isDirectory() ? walk(`${dir}/${f}`) : f.endsWith(".json") ? [`${dir}/${f}`] : []));
  const all: Record<string, WidgetSpec> = {};
  for (const file of walk("widgets")) {
    const stored = JSON.parse(readFileSync(file, "utf8")) as WidgetSpec;
    if (stored.id) all[stored.id] = stored;
  }
  // Before: 198, 138 and 212 stops with the gallery's actions on, five per card. Now: one per card, plus the board's
  // own controls (skip links, period, filters, tools, sections), which stay under 25.
  test.each(["commercial-cockpit", "regulatory-landscape", "client-health"])("%s: one stop per card, and the board's own controls under 25", async (name) => {
    const dashboard = JSON.parse(readFileSync(`dashboards/${name}.json`, "utf8")) as DashboardSpec;
    board = createDashboard(target, dashboard, { widgets: all, fetch: createLocalFetch("public"), actions: ["info", "expand", "explain", "csv", "image", "copy"] });
    await board.ready;
    await Promise.resolve();
    const stops = tabStops(target);
    // The cards in view: a board in tabs shows one section at a time, and folded sections hold their cards back.
    const cards = [...target.querySelectorAll(".fft-cell-slot[role='group']")].filter((slot) => !slot.closest("[hidden]")).length;
    expect(stops.filter((node) => node.closest(".fft-widget"))).toEqual([]);
    expect(stops.filter((node) => node.matches(".fft-cell-slot")).length).toBe(cards);
    expect(stops.length - cards).toBeLessThan(25);
  });
});
