// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import { hasBlock } from "../core/registry.ts";
import type { WidgetSpec } from "../core/types.ts";
import { createLocalFetch } from "../mcp/store.ts";
import { createDashboard } from "./dashboard.ts";
import type { DashboardSpec } from "../core/dashboard.ts";
import "./views/index.ts";

/** The commercial cockpit: dashboards/commercial-cockpit.json over widgets/commercial/*.json, reading public/data. */
const board = JSON.parse(readFileSync("dashboards/commercial-cockpit.json", "utf8")) as DashboardSpec;
const widgets: Record<string, WidgetSpec> = {};
for (const file of readdirSync("widgets/commercial").filter((f) => f.endsWith(".json"))) {
  const spec = JSON.parse(readFileSync(`widgets/commercial/${file}`, "utf8")) as WidgetSpec;
  widgets[spec.id as string] = spec;
}
const ids = board.widgets.flatMap((cell) => (cell.widget ? [cell.widget] : []));
/** Views drawn on a sibling branch until it merges: their specs are only checked to parse. */
const drawable = (id: string) => hasBlock("view", widgets[id]?.view.type ?? "");

describe("the commercial cockpit", () => {
  test("names only widgets that exist, each once, every one with a source", () => {
    expect(ids.filter((id) => !widgets[id])).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect([id, widgets[id]?.source?.name]).toEqual([id, "Commercial data mart (fictional)"]);
  });

  test("filters on segment and relationship manager, and reads the period from month", () => {
    expect(board.filters?.map((filter) => filter.field)).toEqual(["segment", "rm"]);
    expect(board.range).toEqual({ field: "month" });
  });

  test("every section of the brief is there", () => {
    const sections = board.widgets.flatMap((cell) => (cell.section ? [cell.section] : []));
    // A story for the banker and the head of sales: the headline, what needs attention, where the money is, the
    // pipeline, the next sale and who acts; then the reference sections.
    expect(sections).toEqual(["Headline numbers", "Needs attention", "Where the money is", "Sales pipeline", "Who could buy what", "Who acts", "Coverage", "Portfolio", "Where clients are", "Campaigns", "Adoption"]);
  });

  test("every widget it names has a registered view, whitespace, x-ray and history included", () => {
    expect(ids.filter((id) => !drawable(id))).toEqual([]);
    for (const type of ["whitespace", "xray", "history", "anomalies"]) expect(ids.some((id) => widgets[id]?.view.type === type)).toBe(true);
  });

  test(
    "draws: every widget whose view is registered is ready, with no error",
    async () => {
      vi.stubGlobal("ResizeObserver", class {
        observe() {}
        unobserve() {}
        disconnect() {}
      });
      const target = document.createElement("div");
      document.body.append(target);
      const drawn = { ...board, widgets: board.widgets.filter((cell) => !cell.widget || drawable(cell.widget)) };
      const dash = createDashboard(target, drawn, { widgets, fetch: createLocalFetch("public") });
      await dash.ready;
      const cards = [...target.querySelectorAll(".fft-widget")];
      expect(cards.length).toBe(drawn.widgets.filter((cell) => cell.widget).length);
      const states = cards.map((card) => [card.querySelector(".fft-title")?.textContent, card.getAttribute("data-state"), card.querySelector(".fft-message")?.textContent ?? ""]);
      expect(states.filter(([, state, message]) => state !== "ready" || message)).toEqual([]);
      vi.unstubAllGlobals();
    },
    30_000,
  );
});
