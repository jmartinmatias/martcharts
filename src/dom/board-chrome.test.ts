// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { validateDashboard } from "../core/dashboard.ts";
import type { DashboardSpec } from "../core/dashboard.ts";
import type { WidgetSpec } from "../core/types.ts";
import { createDashboard } from "./dashboard.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

/**
 * The dashboard's chrome, quieter: folded reference sections drawn only when opened, the source said once under the
 * board, sections as tabs, no board header where the page has one, one Share menu, a phone's Filters sheet, one line
 * for what a filter cannot reach, an as-of line that matches what the cards draw, and KPI tiles without empty news.
 */

const ledger = { name: "Finance ledger" };
const widgets: Record<string, WidgetSpec> = {
  "by-region": {
    title: "By region",
    source: ledger,
    data: { type: "inline", rows: [{ region: "North", v: 1 }, { region: "South", v: 2 }] },
    view: { type: "table" },
  },
  monthly: {
    title: "Monthly",
    source: ledger,
    byline: "Sales office",
    data: { type: "inline", rows: [{ month: "2026-08", v: 5 }, { month: "2026-09", v: 6 }] },
    view: { type: "table" },
  },
  survey: {
    title: "Survey",
    source: { name: "Customer survey" },
    data: { type: "inline", rows: [{ answer: "Yes", n: 3 }] },
    view: { type: "table" },
  },
  reference: {
    title: "Reference",
    data: { type: "inline", rows: [{ code: "A", note: "x" }] },
    view: { type: "table" },
  },
};

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  history.replaceState(null, "", "/");
  target = document.createElement("div");
  document.body.append(target);
});
afterEach(() => vi.unstubAllGlobals());

const slot = (id: string) => target.querySelector(`.fft-cell-slot[data-widget="${id}"]`) as HTMLElement;

describe("validation of the new fields", () => {
  test("collapsed only on a section, source with a name, sections only tabs", () => {
    const issues = validateDashboard({
      source: { url: "javascript:alert(1)" },
      sections: "accordion",
      widgets: [{ widget: "a", collapsed: true }, { section: "S", collapsed: "yes" }],
    });
    const paths = issues.map((issue) => issue.path);
    expect(paths).toEqual(expect.arrayContaining(["source.name", "sections", "widgets[0].collapsed", "widgets[1].collapsed"]));
    expect(validateDashboard({ source: { name: "Ledger", url: "https://example.com" }, sections: "tabs", widgets: [{ section: "S", collapsed: true }, { widget: "a" }] })).toEqual([]);
  });
});

describe("folded sections", () => {
  const spec: DashboardSpec = {
    widgets: [{ section: "Now" }, { widget: "by-region" }, { section: "For reference", collapsed: true }, { widget: "reference" }, { widget: "survey" }],
  };

  test("show their heading and a Show n cards button, and draw their cards only when opened", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    const toggle = target.querySelector(".fft-section-toggle") as HTMLButtonElement;
    expect([toggle.textContent, toggle.getAttribute("aria-expanded")]).toEqual(["Show 2 cards", "false"]);
    // Not drawn: no widget in the slot, and the slot hidden.
    expect([slot("reference").hidden, slot("reference").querySelector(".fft-widget"), board.widgets.has("reference")]).toEqual([true, null, false]);
    toggle.click();
    await vi.waitFor(() => expect(slot("reference").querySelector('.fft-widget[data-state="ready"]')).not.toBeNull());
    expect([slot("reference").hidden, toggle.textContent, toggle.getAttribute("aria-expanded"), board.widgets.has("survey")]).toEqual([false, "Hide cards", "true", true]);
    toggle.click();
    await vi.waitFor(() => expect(slot("reference").hidden).toBe(true));
    expect(toggle.textContent).toBe("Show 2 cards");
  });

  test("a card opened after a filter is set draws with that filter", async () => {
    const board = createDashboard(target, { ...spec, filters: [{ field: "region" }], widgets: [{ section: "Later", collapsed: true }, { widget: "by-region" }] }, { widgets });
    await board.ready;
    await board.setFilter("region", "South");
    (target.querySelector(".fft-section-toggle") as HTMLButtonElement).click();
    await vi.waitFor(() => expect([...slot("by-region").querySelectorAll("tbody tr")].map((row) => row.textContent)).toEqual(["South2"]));
  });

  test("an opened section is kept in the address, and a link opens it", async () => {
    const board = createDashboard(target, { id: "b", ...spec }, { widgets, hash: true });
    await board.ready;
    (target.querySelector(".fft-section-toggle") as HTMLButtonElement).click();
    await vi.waitFor(() => expect(location.hash).toContain("o=b-for-reference"));
    board.destroy();
    const again = createDashboard(target, { id: "b", ...spec }, { widgets, hash: true });
    await again.ready;
    expect([slot("reference").hidden, again.widgets.has("reference")]).toEqual([false, true]);
  });
});

describe("the board's source", () => {
  test("is said once under the board, and a card from the same source keeps only its byline", async () => {
    const board = createDashboard(target, { source: ledger, widgets: [{ widget: "by-region" }, { widget: "monthly" }, { widget: "survey" }] }, { widgets });
    await board.ready;
    expect(target.querySelector(".fft-board-footer")?.textContent).toBe("Source: Finance ledger");
    expect(["by-region", "monthly", "survey"].map((id) => "boardSource" in slot(id).dataset)).toEqual([true, true, false]);
    // The credit line keeps its words for copies and exports; the stylesheet hides the matching source.
    expect(slot("monthly").querySelector(".fft-credit-source")?.textContent).toBe("Source: Finance ledger ·");
    expect(slot("monthly").querySelector(".fft-credit-byline")?.textContent).toBe(" Chart: Sales office");
    expect(slot("survey").querySelector(".fft-credit-source")?.textContent).toBe("Source: Customer survey");
  });

  test("a card on its own still reads its whole credit line", async () => {
    await createWidget(target, widgets.monthly as WidgetSpec).ready;
    expect(target.querySelector(".fft-credit")?.textContent).toBe("Source: Finance ledger · Chart: Sales office");
  });
});

describe("sections as tabs", () => {
  const spec: DashboardSpec = { id: "t", sections: "tabs", widgets: [{ section: "One" }, { widget: "by-region" }, { section: "Two" }, { widget: "monthly" }] };

  test("have no All, show the first section first, and keep a choice in the address", async () => {
    const board = createDashboard(target, spec, { widgets, hash: true });
    await board.ready;
    const tabsList = target.querySelector(".fft-board-nav") as HTMLElement;
    const tabs = [...tabsList.querySelectorAll("button")];
    expect([tabsList.getAttribute("role"), tabs.map((tab) => tab.textContent), tabs.map((tab) => tab.getAttribute("aria-selected"))]).toEqual(["tablist", ["One", "Two"], ["true", "false"]]);
    expect([slot("by-region").hidden, slot("monthly").hidden, location.hash]).toEqual([false, true, ""]);
    tabs[1]?.click();
    expect([slot("by-region").hidden, slot("monthly").hidden, tabs.map((tab) => tab.getAttribute("aria-selected")), location.hash]).toEqual([true, false, ["false", "true"], "#t-two"]);
    board.setSection(null);
    expect(slot("by-region").hidden).toBe(false);
  });
});

describe("a page that says the title itself", () => {
  test("header: false draws no board title, and the as-of line joins the filter row", async () => {
    const board = createDashboard(target, { title: "Sales", subtitle: "Q3", asOf: "2026-10-25", filters: [{ field: "region" }], widgets: [{ widget: "by-region" }] }, { widgets, header: false });
    await board.ready;
    expect(target.querySelector(".fft-dashboard-header")).toBeNull();
    expect(target.querySelector(".fft-filters .fft-dashboard-asof")?.textContent).toBe("As of Oct 25, 2026");
  });

  test("asOfInto puts the as-of line beside the page's own title, out of the filter row, and takes it back on destroy", async () => {
    const beside = document.createElement("div");
    document.body.append(beside);
    const board = createDashboard(target, { title: "Sales", asOf: "2026-10-25", filters: [{ field: "region" }], widgets: [{ widget: "by-region" }] }, { widgets, header: false, asOfInto: beside });
    await board.ready;
    expect([beside.querySelector(".fft-dashboard-asof")?.textContent, target.querySelector(".fft-filters .fft-dashboard-asof")]).toEqual(["As of Oct 25, 2026", null]);
    board.destroy();
    expect(beside.childElementCount).toBe(0);
    beside.remove();
  });
});

describe("the filter area reads in two lines", () => {
  test("the bar holds the controls, a click filter and Share at its end; the sections take a line of their own under it", async () => {
    const board = createDashboard(
      target,
      { title: "Sales", filters: [{ field: "region" }], widgets: [{ section: "One" }, { widget: "by-region" }, { section: "Two" }, { widget: "monthly" }] },
      { widgets, header: false },
    );
    await board.ready;
    const row = target.querySelector(".fft-filters") as HTMLElement;
    const lines = [...row.children].map((node) => node.className);
    expect(lines).toEqual(["fft-filters-bar", "fft-board-nav fft-board-sections"]);
    const bar = row.querySelector(".fft-filters-bar") as HTMLElement;
    expect([bar.querySelector(".fft-filter-controls") !== null, bar.lastElementChild?.className]).toEqual([true, "fft-board-tools"]);
    await board.setCrossFilter("region", "North");
    expect(target.querySelector(".fft-crossfilter")?.parentElement).toBe(bar);
    expect(target.querySelector(".fft-crossfilter")?.nextElementSibling?.className).toBe("fft-board-tools");
  });
});

describe("the filter row", () => {
  const spec: DashboardSpec = { filters: [{ field: "region", label: "Region" }], range: { field: "month" }, widgets: [{ widget: "by-region" }, { widget: "monthly" }, { widget: "survey" }] };

  test("Share is one button with a small menu: Copy link and Print, arrows to move, Escape to close", async () => {
    const board = createDashboard(target, spec, { widgets, hash: true });
    await board.ready;
    const share = target.querySelector(".fft-board-share") as HTMLButtonElement;
    const menu = target.querySelector(".fft-share-menu") as HTMLElement;
    expect([share.textContent, share.getAttribute("aria-haspopup"), share.getAttribute("aria-expanded"), menu.hidden]).toEqual(["Share", "menu", "false", true]);
    expect([...menu.querySelectorAll('[role="menuitem"]')].map((item) => item.textContent)).toEqual(["Copy link", "Print"]);
    share.click();
    expect([menu.hidden, share.getAttribute("aria-expanded"), document.activeElement?.textContent]).toEqual([false, "true", "Copy link"]);
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.activeElement?.textContent).toBe("Print");
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect([menu.hidden, document.activeElement]).toEqual([true, share]);
  });

  test("Copy link in the menu copies this view's address", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const board = createDashboard(target, spec, { widgets, hash: true });
    await board.ready;
    await board.setFilter("region", "South");
    (target.querySelector(".fft-board-share") as HTMLButtonElement).click();
    (target.querySelector('.fft-share-menu [role="menuitem"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(String((writeText.mock.calls[0] as unknown[])[0])).toContain("f=");
  });

  test("a phone's Filters button counts what is set and opens the controls as a sheet; Done closes it", async () => {
    // jsdom matches no media query: show the toggle and the sheet as the phone stylesheet does, so they can take focus.
    const phone = document.createElement("style");
    phone.textContent = ".fft-filters-toggle, .fft-filters[data-sheet] .fft-sheet-done { display: inline-flex !important; }";
    document.head.append(phone);
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    const toggle = target.querySelector(".fft-filters-toggle") as HTMLButtonElement;
    const row = target.querySelector(".fft-filters") as HTMLElement;
    expect([toggle.textContent, toggle.getAttribute("aria-expanded"), toggle.getAttribute("aria-controls")]).toEqual(["Filters", "false", (target.querySelector(".fft-filter-controls") as HTMLElement).id]);
    await board.setFilter("region", "North");
    await board.setRange("3M");
    expect(toggle.textContent).toBe("Filters (2)");
    toggle.click();
    expect([row.hasAttribute("data-sheet"), toggle.getAttribute("aria-expanded"), document.activeElement?.closest(".fft-filter-controls") !== null]).toEqual([true, "true", true]);
    (target.querySelector(".fft-sheet-done") as HTMLButtonElement).click();
    expect([row.hasAttribute("data-sheet"), document.activeElement]).toEqual([false, toggle]);
    phone.remove();
  });

  test("what a filter cannot reach is one line under the row, the cards named on hover and to screen readers", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    const line = target.querySelector(".fft-unreached") as HTMLElement;
    expect(line.hidden).toBe(true);
    await board.setFilter("region", "South");
    await vi.waitFor(() => expect(line.hidden).toBe(false));
    const item = line.querySelector(".fft-unreached-item") as HTMLElement;
    expect([item.textContent, item.tabIndex, item.title]).toEqual(["Region does not apply to 2 cards", 0, "Not reached: Monthly, Survey"]);
    expect(item.getAttribute("aria-label")).toBe("Region does not apply to 2 cards. Not reached: Monthly, Survey");
    // The line sits under the filter row, not inside a card.
    expect(line.previousElementSibling?.classList.contains("fft-filters")).toBe(true);
    await board.setRange("3M");
    await vi.waitFor(() => expect(line.textContent).toBe("Region does not apply to 2 cards · Period does not apply to 2 cards"));
    await board.setFilter("region", null);
    await board.setRange("All");
    await vi.waitFor(() => expect(line.hidden).toBe(true));
  });
});

describe("the as-of line", () => {
  test("says the latest date the cards draw, not a later one their files hold", async () => {
    const local: Record<string, WidgetSpec> = {
      // The file runs into October; the card itself stops at September.
      tile: {
        data: { type: "inline", rows: [{ month: "2026-09", v: 1 }, { month: "2026-10", v: 0 }] },
        transform: [{ type: "filter", field: "month", op: "<=", value: "2026-09" }],
        view: { type: "table" },
      },
      trend: { data: { type: "inline", rows: [{ month: "2026-08", v: 1 }, { month: "2026-09", v: 2 }] }, view: { type: "table" } },
    };
    const board = createDashboard(target, { asOf: "Data to {latest}", range: { field: "month" }, widgets: [{ widget: "tile" }, { widget: "trend" }] }, { widgets: local });
    await board.ready;
    await vi.waitFor(() => expect(target.querySelector(".fft-dashboard-asof")?.textContent).toBe("Data to September 2026"));
  });
});

describe("KPI tiles without empty news", () => {
  const draw = async (spec: Omit<WidgetSpec, "data"> & { rows: Record<string, unknown>[] }) => {
    const { rows, ...rest } = spec;
    await createWidget(target, { locale: "en-US", data: { type: "inline", rows }, ...rest } as WidgetSpec).ready;
  };

  test("a change that rounds to 0.0% is left out", async () => {
    await draw({ rows: [{ v: 100000, was: 99999 }], view: { type: "kpi", value: "v", compare: "was" } });
    expect(target.querySelector(".fft-kpi-delta")).toBeNull();
    target.innerHTML = "";
    await draw({ rows: [{ v: 110, was: 100 }], view: { type: "kpi", value: "v", compare: "was" } });
    expect(target.querySelector(".fft-kpi-change")?.textContent).toContain("10.0%");
  });

  test("zero now and zero before is a quiet dash, read aloud as the zero it is", async () => {
    await draw({ rows: [{ v: 0, was: 0 }], view: { type: "kpi", value: "v", compare: "was" } });
    const value = target.querySelector(".fft-kpi-value") as HTMLElement;
    expect([value.textContent, "zero" in value.dataset, value.getAttribute("aria-label")]).toEqual(["—", true, "0"]);
    target.innerHTML = "";
    // A zero after something is news: it stays a figure.
    await draw({ rows: [{ v: 0, was: 4 }], view: { type: "kpi", value: "v", compare: "was" } });
    expect("zero" in (target.querySelector(".fft-kpi-value") as HTMLElement).dataset).toBe(false);
  });

  test("the same rules hold on a strip of tiles", async () => {
    await draw({ rows: [{ a: 0, b: 50, aWas: 0, bWas: 50 }], view: { type: "kpis", items: [{ value: "a", compare: "aWas" }, { value: "b", compare: "bWas" }] } });
    const tiles = [...target.querySelectorAll(".fft-stat")] as HTMLElement[];
    expect(tiles.map((tile) => [tile.querySelector(".fft-stat-value")?.textContent, "quiet" in tile.dataset, tile.querySelector(".fft-kpi-delta") !== null])).toEqual([
      ["—", true, false],
      ["50", false, false],
    ]);
  });
});
