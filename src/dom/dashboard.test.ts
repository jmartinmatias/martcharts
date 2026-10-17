// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Mock } from "vitest";
import { rangeStart, validateDashboard } from "../core/dashboard.ts";
import type { WidgetSpec } from "../core/types.ts";
import { registerPreset } from "../core/presets.ts";
import { createDashboard } from "./dashboard.ts";
import "./views/index.ts";

const widgets: Record<string, WidgetSpec> = {
  "by-region": {
    title: "By region",
    data: { type: "inline", rows: [{ region: "North", v: 1 }, { region: "South", v: 2 }, { region: "East", v: 3 }] },
    view: { type: "table" },
  },
  monthly: {
    title: "Monthly",
    data: { type: "inline", rows: [{ month: "Jan", v: 5 }, { month: "Feb", v: 6 }] },
    view: { type: "table" },
  },
};

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
});

const texts = (selector: string, root: ParentNode = target) => [...root.querySelectorAll(selector)].map((n) => n.textContent);
const cellRows = (id: string) => texts("tbody tr", target.querySelector(`.fft-cell-slot[data-widget="${id}"]`) as Element);

describe("createDashboard", () => {
  const spec = {
    title: "Sales",
    subtitle: "Q3",
    columns: 3,
    filters: [{ field: "region", label: "Region" }],
    widgets: [{ widget: "by-region", span: 2 }, { widget: "monthly" }],
  };

  test("draws the title and one cell per widget, spanning the columns asked for", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    expect([texts(".fft-dashboard-title")[0], texts(".fft-dashboard-subtitle")[0]]).toEqual(["Sales", "Q3"]);
    expect([...target.querySelectorAll<HTMLElement>(".fft-cell-slot")].map((c) => [c.dataset.widget, c.style.gridColumn])).toEqual([
      ["by-region", "span 2"],
      ["monthly", "span 1"],
    ]);
  });

  test("the filter row offers All plus every value found in the widgets' data", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    const select = target.querySelector<HTMLSelectElement>(".fft-filter select") as HTMLSelectElement;
    expect([texts(".fft-filter label")[0], [...select.options].map((o) => o.textContent)]).toEqual(["Region", ["All", "East", "North", "South"]]);
  });

  test("a filter scopes every widget whose data has that field, and leaves the others alone", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    await board.setFilter("region", "South");
    expect(cellRows("by-region")).toEqual(["South2"]);
    expect(cellRows("monthly").length).toBe(2);
    await board.setFilter("region", null);
    expect(cellRows("by-region").length).toBe(3);
  });

  test("an override, such as a style preset, applies to every widget and survives filtering", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    await board.setOverride({ style: { preset: "glass" } });
    await board.setFilter("region", "North");
    expect([...target.querySelectorAll<HTMLElement>(".fft-widget")].map((w) => w.dataset.preset)).toEqual(["glass", "glass"]);
  });

  test("shipped presets follow the theme, so the controls do too; a preset that declares a scheme carries it, and default clears it", async () => {
    registerPreset({ name: "test-night", description: "A dark-only look for the suite.", css: "", scheme: "dark" });
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    const root = target.querySelector<HTMLElement>(".fft-dashboard") as HTMLElement;
    await board.setOverride({ style: { preset: "paper" } });
    const paper = root.dataset.scheme;
    await board.setOverride({ style: { preset: "test-night" } });
    const night = root.dataset.scheme;
    await board.setOverride({ style: { preset: null } });
    expect([paper, night, root.dataset.scheme]).toEqual([undefined, "dark", undefined]);
  });

  test("an unknown widget id shows a message in its cell instead of breaking the board", async () => {
    const board = createDashboard(target, { ...spec, widgets: [{ widget: "ghost" }] }, { widgets });
    await board.ready;
    expect(texts(".fft-cell-missing")).toEqual(['No widget "ghost".']);
  });

  test("decorate lets the host add its own controls to each cell", async () => {
    const decorate = vi.fn((cell: HTMLElement, id: string) => cell.append(Object.assign(document.createElement("button"), { textContent: `Edit ${id}` })));
    const board = createDashboard(target, spec, { widgets, decorate });
    await board.ready;
    expect(texts(".fft-board-cell > button")).toEqual(["Edit by-region", "Edit monthly"]);
  });
});

describe("expanded browsing", () => {
  const spec = { widgets: [{ widget: "by-region" }, { section: "More" }, { widget: "monthly" }] };
  const overlay = () => document.querySelector<HTMLElement>(".fft-overlay");
  const shownTitle = () => overlay()?.querySelector(".fft-overlay-slot .fft-title")?.textContent;
  const open = async () => {
    const board = createDashboard(target, spec, { widgets, actions: ["expand"] });
    await board.ready;
    target.querySelector<HTMLButtonElement>('.fft-action[data-action="expand"]')?.click();
    return board;
  };

  test("an expanded widget steps to the next and previous widget, sections skipped, with its place counted", async () => {
    await open();
    expect([shownTitle(), overlay()?.querySelector(".fft-overlay-count")?.textContent]).toEqual(["By region", "1 of 2"]);
    overlay()?.querySelector<HTMLButtonElement>(".fft-overlay-next")?.click();
    expect([shownTitle(), overlay()?.getAttribute("aria-label"), overlay()?.querySelector(".fft-overlay-count")?.textContent]).toEqual(["Monthly", "Monthly", "2 of 2"]);
    overlay()?.querySelector<HTMLButtonElement>(".fft-overlay-prev")?.click();
    expect(shownTitle()).toBe("By region");
  });

  test("there is no previous before the first widget and no next after the last", async () => {
    await open();
    const prev = () => overlay()?.querySelector<HTMLButtonElement>(".fft-overlay-prev");
    const next = () => overlay()?.querySelector<HTMLButtonElement>(".fft-overlay-next");
    const first = [prev()?.disabled, next()?.disabled];
    next()?.click();
    expect([first, [prev()?.disabled, next()?.disabled]]).toEqual([[true, false], [false, true]]);
  });

  test("arrow keys step too, unless a chart inside already used the arrow", async () => {
    await open();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    const afterRight = shownTitle();
    const used = new KeyboardEvent("keydown", { key: "ArrowLeft", cancelable: true });
    used.preventDefault();
    document.dispatchEvent(used);
    expect([afterRight, shownTitle()]).toEqual(["Monthly", "Monthly"]);
  });

  test("a sideways swipe on the panel steps, a vertical drag does not", async () => {
    await open();
    const panel = overlay()?.querySelector(".fft-overlay-panel") as HTMLElement;
    const swipe = (x0: number, x1: number, y0 = 100, y1 = 100) => {
      panel.dispatchEvent(Object.assign(new Event("pointerdown", { bubbles: true }), { clientX: x0, clientY: y0 }));
      panel.dispatchEvent(Object.assign(new Event("pointerup", { bubbles: true }), { clientX: x1, clientY: y1 }));
    };
    swipe(300, 300, 100, 400);
    const afterDrag = shownTitle();
    swipe(300, 100);
    expect([afterDrag, shownTitle()]).toEqual(["By region", "Monthly"]);
  });
});

describe("sections", () => {
  const spec = {
    widgets: [{ section: "Regions", description: "Where revenue comes from" }, { widget: "by-region" }, { section: "Trends" }, { widget: "monthly" }],
  };

  test("a section cell draws a full-width heading with its description, in order among the widgets", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    const order = [...target.querySelectorAll(".fft-dashboard-grid > *")].map((el) => (el.classList.contains("fft-board-section") ? `# ${el.querySelector("h3")?.textContent}` : (el as HTMLElement).dataset.widget));
    expect(order).toEqual(["# Regions", "by-region", "# Trends", "monthly"]);
    expect(texts(".fft-board-section p")).toEqual(["Where revenue comes from"]);
    expect((target.querySelector(".fft-board-section") as HTMLElement).style.gridColumn).toBe("1 / -1");
  });

  test("sections are not widgets: the board's widget map holds only the real ones", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    expect([...board.widgets.keys()]).toEqual(["by-region", "monthly"]);
  });

  test("validation accepts a section and rejects an empty one", () => {
    expect(validateDashboard({ widgets: [{ section: "Revenue" }, { widget: "a" }] })).toEqual([]);
    expect(validateDashboard({ widgets: [{ section: "" }] }).map((i) => `${i.path}: ${i.message}`)).toEqual(["widgets[0]: Needs a widget id, an inline spec, or a section title."]);
  });
});

describe("how to read every chart", () => {
  const spec = { widgets: [{ widget: "by-region" }, { widget: "monthly" }] };
  const open = () => [...target.querySelectorAll<HTMLElement>(".fft-guide")].map((g) => !g.hidden);

  test("setGuides opens every widget's guide at once, and closes them again", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    const before = open();
    board.setGuides(true);
    const during = open();
    board.setGuides(false);
    expect([before, during, open()]).toEqual([[false, false], [true, true], [false, false]]);
  });

  test("the guides option opens them from the start", async () => {
    const board = createDashboard(target, spec, { widgets, guides: true });
    await board.ready;
    expect(open()).toEqual([true, true]);
  });
});

describe("section filter", () => {
  const spec = { id: "g", widgets: [{ section: "Revenue and profit" }, { widget: "by-region" }, { section: "Trends" }, { widget: "monthly" }] };
  const buttons = () => [...target.querySelectorAll<HTMLButtonElement>(".fft-board-nav button")];
  const pressed = () => buttons().map((b) => b.getAttribute("aria-pressed"));
  /** The grid as it shows: section headings as "# title", cells by widget id, hidden ones left out. */
  const shown = () =>
    [...target.querySelectorAll<HTMLElement>(".fft-dashboard-grid > *")]
      .filter((el) => !el.hidden)
      .map((el) => (el.classList.contains("fft-board-section") ? `# ${el.querySelector("h3")?.textContent}` : el.dataset.widget));

  test("with two or more sections, the filter row offers All and each section, All chosen at first", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    expect(buttons().map((b) => [b.textContent, b.dataset.section ?? null])).toEqual([
      ["All", null],
      ["Revenue and profit", "g-revenue-and-profit"],
      ["Trends", "g-trends"],
    ]);
    expect([pressed(), target.querySelector(".fft-board-nav")?.getAttribute("aria-label")]).toEqual([["true", "false", "false"], "Sections"]);
    expect(shown()).toEqual(["# Revenue and profit", "by-region", "# Trends", "monthly"]);
    expect((target.querySelector(".fft-filters") as HTMLElement).hidden).toBe(false);
  });

  test("a single section gets no filter", async () => {
    const board = createDashboard(target, { widgets: [{ section: "Only" }, { widget: "monthly" }] }, { widgets });
    await board.ready;
    expect(target.querySelector(".fft-board-nav")).toBeNull();
  });

  test("choosing a section shows only its heading and cards, and All brings every section back", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    board.setSection("Trends");
    expect([shown(), pressed(), board.root.dataset.section]).toEqual([["# Trends", "monthly"], ["false", "false", "true"], "g-trends"]);
    board.setSection(null);
    expect([shown(), pressed(), board.root.dataset.section]).toEqual([["# Revenue and profit", "by-region", "# Trends", "monthly"], ["true", "false", "false"], undefined]);
  });

  test("clicking a section button filters, and cells before the first heading belong to All only", async () => {
    const lead = { id: "g", widgets: [{ widget: "by-region" }, { section: "One" }, { widget: "monthly" }, { section: "Two" }] };
    await createDashboard(target, lead, { widgets }).ready;
    buttons()[1]?.click();
    expect([shown(), pressed()]).toEqual([["# One", "monthly"], ["false", "true", "false"]]);
    buttons()[0]?.click();
    expect(shown()).toEqual(["by-region", "# One", "monthly", "# Two"]);
  });

  test("an unknown section is named in the error", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    expect(() => board.setSection("Nope")).toThrow('No section "Nope". Sections: Revenue and profit, Trends.');
  });

  test("the expanded view steps only through the cards in view", async () => {
    const board = createDashboard(target, { id: "g", widgets: [{ section: "A" }, { widget: "by-region" }, { section: "B" }, { widget: "monthly" }, { widget: "trend" }] }, { widgets: { ...widgets, trend: { ...widgets.monthly, title: "Trend" } as WidgetSpec }, actions: ["expand"] });
    await board.ready;
    board.setSection("B");
    target.querySelector<HTMLButtonElement>('.fft-cell-slot[data-widget="monthly"] .fft-action[data-action="expand"]')?.click();
    expect(document.querySelector(".fft-overlay-count")?.textContent).toBe("1 of 2");
    document.querySelector<HTMLButtonElement>(".fft-overlay-close")?.click();
  });

  test("with hash on, the choice lives in the address, and an address naming a section opens on it", async () => {
    try {
      const board = createDashboard(target, spec, { widgets, hash: true });
      await board.ready;
      board.setSection("Trends");
      const chosen = location.hash;
      board.setSection(null);
      const cleared = location.hash;
      board.destroy();
      history.replaceState(null, "", "#g-trends");
      await createDashboard(target, spec, { widgets, hash: true }).ready;
      expect([chosen, cleared, shown()]).toEqual(["#g-trends", "", ["# Trends", "monthly"]]);
    } finally {
      history.replaceState(null, "", location.pathname);
    }
  });

  test("with hash on, the board follows the address as it changes: a link to a section, then back to none", async () => {
    try {
      const board = createDashboard(target, spec, { widgets, hash: true });
      await board.ready;
      history.replaceState(null, "", "#g-trends");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      const linked = shown();
      history.replaceState(null, "", location.pathname);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      expect([linked, shown()]).toEqual([["# Trends", "monthly"], ["# Revenue and profit", "by-region", "# Trends", "monthly"]]);
      board.destroy();
    } finally {
      history.replaceState(null, "", location.pathname);
    }
  });

  test("without hash, the address is left alone", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    board.setSection("Trends");
    expect(location.hash).toBe("");
  });

  test("a sideways scrolling row of section links marks which edge has more to see, for the stylesheet to fade", async () => {
    await createDashboard(target, spec, { widgets }).ready;
    const nav = target.querySelector(".fft-board-nav") as HTMLElement;
    let left = 0;
    Object.defineProperties(nav, { scrollWidth: { value: 600, configurable: true }, clientWidth: { value: 300, configurable: true }, scrollLeft: { get: () => left, configurable: true } });
    const at = (x: number) => {
      left = x;
      nav.dispatchEvent(new Event("scroll"));
      return nav.dataset.scroll ?? "";
    };
    expect([at(0), at(150), at(300)]).toEqual(["start", "middle", "end"]);
    Object.defineProperty(nav, "scrollWidth", { value: 300, configurable: true });
    expect(at(0)).toBe("");
  });

  test("when the buttons scroll sideways, the chosen one is brought into view", async () => {
    await createDashboard(target, spec, { widgets }).ready;
    const nav = target.querySelector(".fft-board-nav") as HTMLElement;
    const button = buttons()[2] as HTMLButtonElement;
    Object.defineProperties(nav, { scrollWidth: { value: 600 }, clientWidth: { value: 300 } });
    nav.getBoundingClientRect = () => ({ left: 16, width: 300 }) as DOMRect;
    button.getBoundingClientRect = () => ({ left: 416, width: 60 }) as DOMRect;
    const scrollBy = vi.fn();
    nav.scrollBy = scrollBy;
    button.click();
    expect(scrollBy).toHaveBeenCalledWith({ left: 280 });
  });

  const ids = () => [...target.querySelectorAll(".fft-board-section")].map((el) => el.id);

  test("repeated titles get unique ids, punctuation collapses to one hyphen, and the prefix defaults to board", async () => {
    const board = createDashboard(target, { widgets: [{ section: "Sales" }, { widget: "monthly" }, { section: "Sales" }, { section: " Q3: Margin & Cost!" }] }, { widgets });
    await board.ready;
    expect(ids()).toEqual(["board-sales", "board-sales-2", "board-q3-margin-cost"]);
    expect(buttons().slice(1).map((b) => b.dataset.section)).toEqual(["board-sales", "board-sales-2", "board-q3-margin-cost"]);
  });

  test("two boards on one page do not share section ids", async () => {
    await createDashboard(target, spec, { widgets }).ready;
    await createDashboard(target, spec, { widgets }).ready;
    expect(ids()).toEqual(["g-revenue-and-profit", "g-trends", "g-revenue-and-profit-2", "g-trends-2"]);
  });

  test("the section filter comes after the period and filter controls", async () => {
    const board = createDashboard(target, { ...spec, filters: [{ field: "region" }], range: { field: "month" } }, { widgets });
    await board.ready;
    expect([...(target.querySelector(".fft-filters") as HTMLElement).children].map((el) => el.className)).toEqual(["fft-range", "fft-filter", "fft-board-nav"]);
  });

  test("with no filters, no range and fewer than two sections, the filter row stays hidden", async () => {
    const board = createDashboard(target, { widgets: [{ section: "Only" }, { widget: "monthly" }] }, { widgets });
    await board.ready;
    expect((target.querySelector(".fft-filters") as HTMLElement).hidden).toBe(true);
  });

  test("once the pinned row has left its place, it is marked stuck, so it can show an edge", async () => {
    const observed: { callback: (entries: { isIntersecting: boolean }[]) => void; targets: Element[] }[] = [];
    vi.stubGlobal("IntersectionObserver", class {
      targets: Element[] = [];
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        observed.push({ callback, targets: this.targets });
      }
      observe(el: Element) {
        this.targets.push(el);
      }
      disconnect() {}
    });
    try {
      const board = createDashboard(target, spec, { widgets, sticky: true });
      await board.ready;
      const sentinel = observed.find((o) => o.targets.some((t) => t.classList.contains("fft-filters-sentinel")));
      const filters = target.querySelector(".fft-filters") as HTMLElement;
      sentinel?.callback([{ isIntersecting: false }]);
      const stuck = filters.hasAttribute("data-stuck");
      sentinel?.callback([{ isIntersecting: true }]);
      expect([stuck, filters.hasAttribute("data-stuck")]).toEqual([true, false]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("sticky pins the filter row while the page scrolls", async () => {
    const board = createDashboard(target, spec, { widgets, sticky: true });
    await board.ready;
    expect(target.querySelector(".fft-dashboard")?.hasAttribute("data-sticky")).toBe(true);
  });

  test("a sticky board tracks the filter row's height, so content clears it", async () => {
    const watchers: { callback: () => void; targets: Element[]; disconnect: Mock<() => void> }[] = [];
    vi.stubGlobal("ResizeObserver", class {
      watcher: (typeof watchers)[number];
      constructor(callback: () => void) {
        this.watcher = { callback, targets: [], disconnect: vi.fn<() => void>() };
        watchers.push(this.watcher);
      }
      observe(el: Element) {
        this.watcher.targets.push(el);
      }
      unobserve() {}
      disconnect() {
        this.watcher.disconnect();
      }
    });
    try {
      const watching = (el: Element) => watchers.find((w) => w.targets.includes(el));
      const plain = createDashboard(target, spec, { widgets });
      await plain.ready;
      expect(watching(plain.root.querySelector(".fft-filters") as Element)).toBeUndefined();
      plain.destroy();
      const board = createDashboard(target, spec, { widgets, sticky: true });
      await board.ready;
      const bar = board.root.querySelector(".fft-filters") as HTMLElement;
      Object.defineProperty(bar, "offsetHeight", { value: 96 });
      watching(bar)?.callback();
      expect(board.root.style.getPropertyValue("--fft-filters-height")).toBe("96px");
      board.destroy();
      expect(watching(bar)?.disconnect).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("validateDashboard", () => {
  test("a correct dashboard has no issues", () => {
    expect(validateDashboard({ title: "x", columns: 2, filters: [{ field: "region" }], widgets: [{ widget: "a", span: 2 }] })).toEqual([]);
  });

  test("widgets are required, spans must fit the columns, filters need a field", () => {
    expect(validateDashboard({ columns: 2, filters: [{}], widgets: [{ widget: "a", span: 3 }, {}] }).map((i) => `${i.path}: ${i.message}`)).toEqual([
      "filters[0].field: Required. Field to filter every widget by.",
      "widgets[0].span: Must be a whole number from 1 to 2.",
      "widgets[1]: Needs a widget id, an inline spec, or a section title.",
    ]);
    expect(validateDashboard({}).map((i) => i.path)).toEqual(["widgets"]);
  });
});

describe("rangeStart", () => {
  test("a month count keeps that many months up to and including the latest", () => {
    expect([rangeStart("3M", "2026-09-30"), rangeStart("12M", "2026-09"), rangeStart("1M", "2026-01-15")]).toEqual(["2026-07", "2025-10", "2026-01"]);
  });

  test("years count as twelve months, YTD starts in January of the latest year, All keeps everything", () => {
    expect([rangeStart("1Y", "2026-09"), rangeStart("YTD", "2026-09-30"), rangeStart("All", "2026-09")]).toEqual(["2025-10", "2026-01", null]);
  });
});

describe("time range", () => {
  const months = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"];
  const timed: Record<string, WidgetSpec> = {
    ...widgets,
    trend: { title: "Trend", data: { type: "inline", rows: months.map((month, i) => ({ month, region: i % 2 ? "North" : "South", v: i })) }, view: { type: "table" } },
  };
  const spec = { filters: [{ field: "region" }], range: { field: "month" }, widgets: [{ widget: "trend" }, { widget: "by-region" }] };
  const buttons = () => [...target.querySelectorAll<HTMLButtonElement>(".fft-range button")];

  test("the period control offers 3M, 6M, 12M and All, with All chosen at first", async () => {
    const board = createDashboard(target, spec, { widgets: timed });
    await board.ready;
    expect([texts(".fft-range-label")[0], buttons().map((b) => [b.textContent, b.getAttribute("aria-pressed")])]).toEqual([
      "Period",
      [["3M", "false"], ["6M", "false"], ["12M", "false"], ["All", "true"]],
    ]);
  });

  test("a period keeps the latest months in widgets with the field and leaves the others alone", async () => {
    const board = createDashboard(target, spec, { widgets: timed });
    await board.ready;
    await board.setRange("3M");
    expect(cellRows("trend").map((row) => row?.slice(0, 7))).toEqual(["2026-02", "2026-03", "2026-04"]);
    expect(cellRows("by-region").length).toBe(3);
    expect(buttons().find((b) => b.getAttribute("aria-pressed") === "true")?.textContent).toBe("3M");
  });

  test("clicking a period button applies it, and it combines with the other filters", async () => {
    const board = createDashboard(target, spec, { widgets: timed });
    await board.ready;
    await board.setFilter("region", "North");
    buttons()[0]?.click();
    await vi.waitFor(() => expect(cellRows("trend").map((row) => row?.slice(0, 7))).toEqual(["2026-02", "2026-04"]));
  });

  test("the dashboard can set its own options and starting period", async () => {
    const board = createDashboard(target, { ...spec, range: { field: "month", options: ["YTD", "All"], default: "YTD" } }, { widgets: timed });
    await board.ready;
    expect(cellRows("trend").map((row) => row?.slice(0, 7))).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
  });

  test("a range can name several date fields, so monthly and daily widgets share one window", async () => {
    const both: Record<string, WidgetSpec> = {
      ...timed,
      daily: { title: "Daily", data: { type: "inline", rows: ["2026-01-31", "2026-02-01", "2026-04-30"].map((day) => ({ day, n: 1 })) }, view: { type: "table" } },
    };
    const board = createDashboard(target, { range: { field: ["month", "day"] }, widgets: [{ widget: "trend" }, { widget: "daily" }] }, { widgets: both });
    await board.ready;
    await board.setRange("3M");
    expect([cellRows("trend").map((row) => row?.slice(0, 7)), cellRows("daily").map((row) => row?.slice(0, 10))]).toEqual([
      ["2026-02", "2026-03", "2026-04"],
      ["2026-02-01", "2026-04-30"],
    ]);
  });

  test("forecast rows never move the end a period counts back from", async () => {
    const ahead: Record<string, WidgetSpec> = {
      ...timed,
      plan: {
        title: "Plan",
        data: { type: "inline", rows: [{ month: "2026-04", v: 1, f: false }, { month: "2026-08", v: 2, f: true }] },
        view: { type: "line", x: "month", y: "v", forecast: "f" },
      },
    };
    const board = createDashboard(target, { range: { field: "month" }, widgets: [{ widget: "trend" }, { widget: "plan" }] }, { widgets: ahead });
    await board.ready;
    await board.setRange("3M");
    expect(cellRows("trend").map((row) => row?.slice(0, 7))).toEqual(["2026-02", "2026-03", "2026-04"]);
  });

  test("validation: the range needs a field, options must be periods, and the default one of them", () => {
    expect(validateDashboard({ widgets: [], range: { options: ["3W"], default: "6M" } }).map((i) => `${i.path}: ${i.message}`)).toEqual([
      "range.field: Required. Date field (YYYY-MM...) every widget is cut by.",
      'range.options[0]: "3W" is not a period. Use a count of months or years such as "3M" or "1Y", "YTD" or "All".',
      'range.default: Must be one of the options: 3W.',
    ]);
  });
});

describe("an even grid", () => {
  const styleSheet = readFileSync("src/dom/styles.ts", "utf8");
  const rule = (selector: string) => styleSheet.slice(styleSheet.indexOf(`${selector} {`), styleSheet.indexOf("}", styleSheet.indexOf(`${selector} {`)));

  test("cards in a row share one height, and each card's source line sits on its floor", () => {
    expect(rule(".fft-dashboard-grid")).toContain("align-items: stretch");
    expect([rule(".fft-cell-slot"), rule(".fft-board-cell")].every((r) => r.includes("display: flex") && r.includes("flex-direction: column"))).toBe(true);
    expect(rule(".fft-board-cell > .fft-widget")).toContain("flex: 1");
    expect(rule(".fft-widget > .fft-base")).toContain("margin-top: auto");
  });

  test("scorecard rows share one set of columns, so a check by one number never shortens that row's track", () => {
    expect(rule(".fft-bullets")).toContain("display: grid");
    expect(rule(".fft-bullet")).toContain("grid-template-columns: subgrid");
  });

  test("in a row of tiles, every sparkline sits on the tile's floor, so a tile with an extra line keeps its trend level with the rest", () => {
    expect(rule(".fft-stat > .fft-sparkline")).toContain("margin-top: auto");
  });
});
