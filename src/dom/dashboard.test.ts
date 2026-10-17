// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Mock } from "vitest";
import { rangeStart, validateDashboard } from "../core/dashboard.ts";
import type { WidgetSpec } from "../core/types.ts";
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

  test("a preset with its own color scheme carries it to the dashboard's controls, and default clears it", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    const root = target.querySelector<HTMLElement>(".fft-dashboard") as HTMLElement;
    await board.setOverride({ style: { preset: "paper" } });
    const paper = root.dataset.scheme;
    await board.setOverride({ style: { preset: "glass" } });
    const glass = root.dataset.scheme;
    await board.setOverride({ style: { preset: null } });
    expect([paper, glass, root.dataset.scheme]).toEqual(["light", "dark", undefined]);
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

describe("section navigation", () => {
  const spec = { id: "g", widgets: [{ section: "Revenue and profit" }, { widget: "by-region" }, { section: "Trends" }, { widget: "monthly" }] };

  test("with two or more sections, the filter row links to each one", async () => {
    const board = createDashboard(target, spec, { widgets });
    await board.ready;
    const links = [...target.querySelectorAll<HTMLAnchorElement>(".fft-board-nav a")];
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Revenue and profit", "#g-revenue-and-profit"],
      ["Trends", "#g-trends"],
    ]);
    expect([...target.querySelectorAll(".fft-board-section")].map((el) => el.id)).toEqual(["g-revenue-and-profit", "g-trends"]);
    expect((target.querySelector(".fft-filters") as HTMLElement).hidden).toBe(false);
  });

  test("a single section gets no navigation", async () => {
    const board = createDashboard(target, { widgets: [{ section: "Only" }, { widget: "monthly" }] }, { widgets });
    await board.ready;
    expect(target.querySelector(".fft-board-nav")).toBeNull();
  });

  test("the link of the section in view is marked current as the page scrolls", async () => {
    let notify: ((entries: { target: Element; isIntersecting: boolean }[]) => void) | undefined;
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: typeof notify) {
        notify = callback;
      }
      observe() {}
      disconnect() {}
    });
    try {
      const board = createDashboard(target, spec, { widgets });
      await board.ready;
      notify?.([{ target: target.querySelector("#g-trends") as Element, isIntersecting: true }]);
      expect([...target.querySelectorAll(".fft-board-nav a")].map((a) => a.getAttribute("aria-current"))).toEqual([null, "true"]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("scrolled to the very bottom, the last section counts as current even if it is too short to reach the top", async () => {
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      disconnect() {}
    });
    // jsdom has no layout: fake a page scrolled to its bottom, restoring every property afterwards.
    const page = document.documentElement;
    const saved = [
      [page, "scrollHeight", 1268],
      [window, "innerHeight", 768],
      [window, "scrollY", 500],
    ] as const;
    const originals = saved.map(([obj, key]) => Object.getOwnPropertyDescriptor(obj, key));
    for (const [obj, key, value] of saved) Object.defineProperty(obj, key, { configurable: true, value });
    try {
      const board = createDashboard(target, spec, { widgets });
      await board.ready;
      window.dispatchEvent(new Event("scroll"));
      expect([...target.querySelectorAll(".fft-board-nav a")].map((a) => a.getAttribute("aria-current"))).toEqual([null, "true"]);
      board.destroy();
      window.dispatchEvent(new Event("scroll"));
    } finally {
      vi.unstubAllGlobals();
      saved.forEach(([obj, key], i) => {
        const original = originals[i];
        if (original) Object.defineProperty(obj, key, original);
        else Reflect.deleteProperty(obj, key);
      });
    }
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

  test("on scroll, the current section is the last heading above the reading line, even after a jump skipped past it", async () => {
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      disconnect() {}
    });
    const page = document.documentElement;
    const saved = [
      [page, "scrollHeight", 5000],
      [window, "innerHeight", 1000],
      [window, "scrollY", 1200],
    ] as const;
    const originals = saved.map(([obj, key]) => Object.getOwnPropertyDescriptor(obj, key));
    for (const [obj, key, value] of saved) Object.defineProperty(obj, key, { configurable: true, value });
    try {
      const three = { id: "g", widgets: [{ section: "One" }, { widget: "by-region" }, { section: "Two" }, { widget: "monthly" }, { section: "Three" }] };
      const board = createDashboard(target, three, { widgets });
      await board.ready;
      const tops: Record<string, number> = { "g-one": -900, "g-two": -50, "g-three": 800 };
      for (const node of target.querySelectorAll<HTMLElement>(".fft-board-section")) node.getBoundingClientRect = () => ({ top: tops[node.id] ?? 0 }) as DOMRect;
      window.dispatchEvent(new Event("scroll"));
      expect([...target.querySelectorAll(".fft-board-nav a")].map((a) => a.getAttribute("aria-current"))).toEqual([null, "true", null]);
    } finally {
      vi.unstubAllGlobals();
      saved.forEach(([obj, key], i) => {
        const original = originals[i];
        if (original) Object.defineProperty(obj, key, original);
        else Reflect.deleteProperty(obj, key);
      });
    }
  });

  test("sticky pins the filter row while the page scrolls", async () => {
    const board = createDashboard(target, spec, { widgets, sticky: true });
    await board.ready;
    expect(target.querySelector(".fft-dashboard")?.hasAttribute("data-sticky")).toBe(true);
  });

  const ids = () => [...target.querySelectorAll(".fft-board-section")].map((el) => el.id);
  const hrefs = () => [...target.querySelectorAll(".fft-board-nav a")].map((a) => a.getAttribute("href"));
  const current = () => [...target.querySelectorAll(".fft-board-nav a")].map((a) => a.getAttribute("aria-current"));

  test("repeated titles get unique ids, punctuation collapses to one hyphen, and the prefix defaults to board", async () => {
    const board = createDashboard(target, { widgets: [{ section: "Sales" }, { widget: "monthly" }, { section: "Sales" }, { section: " Q3: Margin & Cost!" }] }, { widgets });
    await board.ready;
    expect(ids()).toEqual(["board-sales", "board-sales-2", "board-q3-margin-cost"]);
    expect(hrefs()).toEqual(["#board-sales", "#board-sales-2", "#board-q3-margin-cost"]);
  });

  test("two boards on one page do not share section ids", async () => {
    await createDashboard(target, spec, { widgets }).ready;
    await createDashboard(target, spec, { widgets }).ready;
    expect(ids()).toEqual(["g-revenue-and-profit", "g-trends", "g-revenue-and-profit-2", "g-trends-2"]);
  });

  test("the links come after the period and filter controls", async () => {
    const board = createDashboard(target, { ...spec, filters: [{ field: "region" }], range: { field: "month" } }, { widgets });
    await board.ready;
    expect([...(target.querySelector(".fft-filters") as HTMLElement).children].map((el) => el.className)).toEqual(["fft-range", "fft-filter", "fft-board-nav"]);
  });

  test("with no filters, no range and fewer than two sections, the filter row stays hidden", async () => {
    const board = createDashboard(target, { widgets: [{ section: "Only" }, { widget: "monthly" }] }, { widgets });
    await board.ready;
    expect((target.querySelector(".fft-filters") as HTMLElement).hidden).toBe(true);
  });

  /** Stands in for IntersectionObserver: records what it observes and hands back the callback. */
  const stubSpy = () => {
    const spy = { notify: undefined as ((entries: { target: Element; isIntersecting: boolean }[]) => void) | undefined, observed: [] as Element[], disconnect: vi.fn<() => void>() };
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: typeof spy.notify) {
        spy.notify = callback;
      }
      observe(el: Element) {
        spy.observed.push(el);
      }
      disconnect() {
        spy.disconnect();
      }
    });
    return spy;
  };
  const three = { id: "g", widgets: [{ section: "Revenue" }, { widget: "by-region" }, { section: "Trends" }, { widget: "monthly" }, { section: "Detail" }] };
  const section = (id: string) => target.querySelector(`#${id}`) as Element;

  test("the current mark moves with the page; a jump that shows several sections at once marks the topmost", async () => {
    const spy = stubSpy();
    try {
      await createDashboard(target, three, { widgets }).ready;
      spy.notify?.([{ target: section("g-trends"), isIntersecting: true }]);
      expect(current()).toEqual([null, "true", null]);
      spy.notify?.([{ target: section("g-trends"), isIntersecting: false }]);
      expect(current()).toEqual([null, "true", null]);
      spy.notify?.([{ target: section("g-revenue"), isIntersecting: false }, { target: section("g-trends"), isIntersecting: true }, { target: section("g-detail"), isIntersecting: true }]);
      expect(current()).toEqual([null, "true", null]);
      spy.notify?.([{ target: section("g-revenue"), isIntersecting: true }]);
      expect(current()).toEqual(["true", null, null]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("tapping a link marks it current right away", async () => {
    await createDashboard(target, three, { widgets }).ready;
    (target.querySelectorAll<HTMLAnchorElement>(".fft-board-nav a")[2] as HTMLAnchorElement).click();
    expect(current()).toEqual([null, null, "true"]);
  });

  test("every section is observed, and destroy stops observing", async () => {
    const spy = stubSpy();
    try {
      const board = createDashboard(target, three, { widgets });
      await board.ready;
      expect(spy.observed.map((el) => el.id)).toEqual(["g-revenue", "g-trends", "g-detail"]);
      expect(spy.disconnect).not.toHaveBeenCalled();
      board.destroy();
      expect(spy.disconnect).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("when the links scroll sideways, the current one is brought into view", async () => {
    const spy = stubSpy();
    try {
      await createDashboard(target, three, { widgets }).ready;
      const nav = target.querySelector(".fft-board-nav") as HTMLElement;
      const link = nav.querySelectorAll("a")[2] as HTMLAnchorElement;
      Object.defineProperties(nav, { scrollWidth: { value: 600 }, clientWidth: { value: 300 } });
      nav.getBoundingClientRect = () => ({ left: 16, width: 300 }) as DOMRect;
      link.getBoundingClientRect = () => ({ left: 416, width: 60 }) as DOMRect;
      const scrollBy = vi.fn();
      nav.scrollBy = scrollBy;
      spy.notify?.([{ target: section("g-detail"), isIntersecting: true }]);
      expect(scrollBy).toHaveBeenCalledWith({ left: 280 });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("a sticky board tracks the filter row's height, so a jumped-to section clears it", async () => {
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

  test("validation: the range needs a field, options must be periods, and the default one of them", () => {
    expect(validateDashboard({ widgets: [], range: { options: ["3W"], default: "6M" } }).map((i) => `${i.path}: ${i.message}`)).toEqual([
      "range.field: Required. Date field (YYYY-MM...) every widget is cut by.",
      'range.options[0]: "3W" is not a period. Use a count of months or years such as "3M" or "1Y", "YTD" or "All".',
      'range.default: Must be one of the options: 3W.',
    ]);
  });
});
