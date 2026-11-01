// @vitest-environment jsdom
/**
 * The board's lede on screen: above the cards, how many figures are on course, the best and the worst, each linking to
 * its card; following the filters; in the board's language; left out when the board says so.
 */
import { beforeEach, describe, expect, test } from "vitest";
import { widgetRef } from "../core/ref.ts";
import type { DashboardSpec } from "../core/dashboard.ts";
import type { WidgetSpec } from "../core/types.ts";
import { createDashboard } from "./dashboard.ts";
import "./views/index.ts";

const rows = [
  { region: "East", team: "A", revenue: 120, target: 100 },
  { region: "West", team: "A", revenue: 70, target: 100 },
  { region: "North", team: "B", revenue: 101, target: 100 },
];
const widgets: Record<string, WidgetSpec> = {
  attainment: { title: "Target attainment", data: { type: "inline", rows }, view: { type: "meter", label: "region", value: "revenue", target: "target" } },
  costs: {
    title: "Costs against budget",
    data: { type: "inline", rows: [{ dept: "IT", team: "B", actual: 90, budget: 100 }, { dept: "Sales", team: "A", actual: 105, budget: 100 }] },
    view: { type: "variance", label: "dept", value: "actual", target: "budget", goodWhen: "down" },
  },
  mix: { title: "Mix", data: { type: "inline", rows }, view: { type: "bar", x: "region", y: "revenue" } },
};
const board: DashboardSpec = { title: "Sales", filters: [{ field: "team" }], widgets: [{ widget: "attainment" }, { widget: "costs" }, { widget: "mix" }] };

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
});
const lines = () => [...target.querySelectorAll(".fft-lede p")].map((p) => p.textContent);

describe("the board's lede", () => {
  test("says how many figures are on course, then the best and the worst, before the filter row", async () => {
    const drawn = createDashboard(target, board, { widgets });
    await drawn.ready;
    const lede = target.querySelector<HTMLElement>(".fft-lede");
    expect(lede?.hidden).toBe(false);
    expect(lede?.getAttribute("aria-label")).toBe("Board summary");
    expect(lines()).toEqual([
      "3 of 5 tracked figures are on course.",
      "Going well: IT, 10% below budget, in Costs against budget.",
      "Needs attention: West, 30% below target, in Target attainment.",
    ]);
    // Above the filters, under the header.
    expect(lede?.compareDocumentPosition(target.querySelector(".fft-filters") as Element)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    drawn.destroy();
  });

  test("each card is a link to its ref", async () => {
    const drawn = createDashboard(target, board, { widgets });
    await drawn.ready;
    const hrefs = [...target.querySelectorAll<HTMLAnchorElement>(".fft-lede-link")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([`#${widgetRef("costs")}`, `#${widgetRef("attainment")}`]);
    drawn.destroy();
  });

  test("follows the filters: what is left on course is counted again", async () => {
    const drawn = createDashboard(target, board, { widgets });
    await drawn.ready;
    await drawn.setFilter("team", "B");
    expect(lines()[0]).toBe("2 of 2 tracked figures are on course.");
    expect(lines().some((line) => /Needs attention/.test(String(line)))).toBe(false);
    drawn.destroy();
  });

  test("speaks the board's language", async () => {
    const drawn = createDashboard(target, board, { widgets, locale: "fr-FR" });
    await drawn.ready;
    expect(lines()[1]).toMatch(/^Ce qui va bien : IT, 10 % sous l'objectif, dans Costs against budget\.$/);
    drawn.destroy();
  });

  test("is left out by lede: false on the board, or by the host", async () => {
    const off = createDashboard(target, { ...board, lede: false }, { widgets });
    await off.ready;
    expect(target.querySelector(".fft-lede")).toBeNull();
    off.destroy();
    const host = createDashboard(target, board, { widgets, lede: false });
    await host.ready;
    expect(target.querySelector(".fft-lede")).toBeNull();
    host.destroy();
  });

  test("a board with nothing to judge has no lede", async () => {
    const drawn = createDashboard(target, { widgets: [{ widget: "mix" }] }, { widgets });
    await drawn.ready;
    expect(target.querySelector<HTMLElement>(".fft-lede")?.hidden).toBe(true);
    drawn.destroy();
  });
});
