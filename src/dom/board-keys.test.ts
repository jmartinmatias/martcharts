// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { DashboardSpec } from "../core/dashboard.ts";
import type { WidgetSpec } from "../core/types.ts";
import { createDashboard } from "./dashboard.ts";
import type { Dashboard } from "./dashboard.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

/** Keyboard order, a Details panel written for readers, and a Share menu that leaves the page where it is. */

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

const monthly: WidgetSpec = {
  title: "Revenue",
  data: { type: "inline", rows: ["2026-07-01", "2026-08-01", "2026-09-01"].map((month, i) => ({ month, revenue: 100 + i })) },
  view: { type: "bar", x: "month", y: "revenue" },
};

describe("the period's one tab stop is the chosen period", () => {
  test("with All chosen, Tab lands on All, not 3M; choosing 6M moves the stop there", async () => {
    const spec: DashboardSpec = { range: { field: "month", options: ["3M", "6M", "12M", "All"] }, widgets: [{ widget: "monthly" }] } as DashboardSpec;
    board = createDashboard(target, spec, { widgets: { monthly } });
    await board.ready;
    const stop = () => [...target.querySelectorAll<HTMLButtonElement>(".fft-range button")].filter((b) => b.tabIndex === 0).map((b) => b.dataset.value);
    expect(stop()).toEqual(["All"]);
    (target.querySelector('.fft-range button[data-value="6M"]') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(stop()).toEqual(["6M"]));
  });
});

describe("the dashboards page puts the board's skip links first", () => {
  test("the page moves them to the start of the body, before the site menu, and drops the old ones on a tab change", () => {
    const code = readFileSync("demo/dashboards.ts", "utf8");
    expect(code).toMatch(/document\.body\.prepend\(skipLinks\)/);
    expect(code).toMatch(/querySelectorAll\("body > \.fft-skip"\)\) old\.remove\(\)/);
  });
});

describe("the Details panel speaks to a reader", () => {
  test("data as rows from a named source, steps in words, and the technical bits folded for developers", async () => {
    await createWidget(target, {
      locale: "en-US",
      title: "Revenue by region",
      source: { name: "Finance ledger" },
      data: { type: "inline", rows: [{ region: "North", v: 2 }, { region: "South", v: 1 }, { region: "East", v: 3 }] },
      transform: [{ type: "filter", field: "v", op: ">", value: 0 }, { type: "sort", field: "v", order: "desc" }],
      view: { type: "bar", x: "region", y: "v" },
    } as WidgetSpec, { actions: ["info"] }).ready;
    (target.querySelector('[data-action="info"], .fft-action-info') as HTMLButtonElement | null)?.click();
    const text = () => target.querySelector(".fft-back")?.textContent ?? "";
    await vi.waitFor(() => expect(text()).toMatch(/3 rows from Finance ledger/));
    expect(text()).toMatch(/Filtered, then sorted/);
    const fold = target.querySelector(".fft-back details.fft-back-tech") as HTMLDetailsElement;
    expect(fold.open).toBe(false);
    expect(fold.querySelector("summary")?.textContent).toBe("For developers");
    expect(fold.textContent).toMatch(/filter → sort/);
    // Nothing technical outside the fold: no locale code, no arrow chains.
    const outside = [...(target.querySelector(".fft-back")?.children ?? [])].filter((node) => !node.matches("details")).map((node) => node.textContent).join(" ");
    expect(outside).not.toMatch(/en-US|→/);
  });
});

describe("the Share menu leaves the page where it is", () => {
  test("every focus the menu moves is told not to scroll", () => {
    const code = readFileSync("src/dom/dashboard.ts", "utf8");
    const menu = code.slice(code.indexOf("function buildTools()"), code.indexOf("return tools;"));
    const focuses = [...menu.matchAll(/\.focus\(([^)]*)\)/g)].map((match) => match[1]);
    expect(focuses.length).toBeGreaterThan(3);
    expect(focuses.every((args) => /preventScroll: true/.test(args ?? ""))).toBe(true);
  });
});
