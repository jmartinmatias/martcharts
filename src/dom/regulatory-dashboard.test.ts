// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { validateDashboard } from "../core/dashboard.ts";
import type { DashboardSpec } from "../core/dashboard.ts";
import { hasBlock } from "../core/registry.ts";
import type { Row, WidgetSpec } from "../core/types.ts";
import { hasErrors, validateSpec } from "../core/validate.ts";
import { createDashboard } from "./dashboard.ts";
import "./views/index.ts";

/** The regulatory landscape dashboard and every widget it names, as the demo loads them. */
const board = JSON.parse(readFileSync("dashboards/regulatory-landscape.json", "utf8")) as DashboardSpec;
const widgets: Record<string, WidgetSpec> = {};
for (const file of readdirSync("widgets").filter((name) => name.endsWith(".json"))) {
  const spec = JSON.parse(readFileSync(`widgets/${file}`, "utf8")) as WidgetSpec;
  if (spec.id) widgets[spec.id] = spec;
}
/** Specs for views another branch adds (matrix, strips, lifecycle): files only until that branch lands. */
const pending = readdirSync("widgets/pending").filter((name) => name.endsWith(".json"));

/** Serves public/data to the widgets' url sources. */
const fetchLocal = ((input: RequestInfo | URL) => {
  const url = String(input instanceof Request ? input.url : input);
  const path = url.replace(/^https?:\/\/[^/]+/, "");
  try {
    const body = readFileSync(`public${path}`, "utf8");
    return Promise.resolve(new Response(body, { status: 200, headers: { "content-type": "application/json" } }));
  } catch {
    return Promise.resolve(new Response("missing", { status: 404 }));
  }
}) as typeof fetch;

const named = board.widgets.filter((cell) => cell.widget).map((cell) => cell.widget as string);
const present = named.filter((id) => widgets[id] && hasBlock("view", widgets[id]!.view.type));

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
});

describe("the regulatory landscape dashboard", () => {
  test("is a valid dashboard with four columns, a period on month, and filters on topic and jurisdiction", () => {
    expect(hasErrors(validateDashboard(board))).toBe(false);
    expect([board.columns, board.range, board.filters?.map((f) => f.field)]).toEqual([4, { field: "month" }, ["topic", "jurisdiction"]]);
    expect(board.widgets.filter((cell) => cell.section).map((cell) => cell.section)).toEqual(["Headline numbers", "Geography", "Volume per topic", "Pressure", "Trend", "Status and lifecycle", "Impact and stakeholders", "Density"]);
  });

  test("every widget it names exists, either in widgets/ or among the pending specs for views another branch adds", () => {
    const pendingIds = pending.map((file) => (JSON.parse(readFileSync(`widgets/pending/${file}`, "utf8")) as WidgetSpec).id);
    for (const id of named) expect([id, Boolean(widgets[id]) || pendingIds.includes(id)]).toEqual([id, true]);
    expect(pendingIds.sort()).toEqual(["reg-density-strips", "reg-lifecycle", "reg-pressure-matrix", "reg-stakeholder-matrix"]);
    for (const file of pending) {
      const spec = JSON.parse(readFileSync(`widgets/pending/${file}`, "utf8")) as WidgetSpec;
      expect(["matrix", "lifecycle", "strips"]).toContain(spec.view.type);
      expect(spec.data.type === "inline" || spec.data.type === "url").toBe(true);
    }
  });

  test("every regulatory widget carries a source and a byline, and the ones drawn here validate against their own data", async () => {
    for (const id of named.filter((id) => widgets[id])) {
      const spec = widgets[id] as WidgetSpec;
      expect([id, spec.source?.name, typeof spec.byline]).toEqual([id, "Regulatory watch (fictional)", "string"]);
    }
    expect(present.length).toBeGreaterThanOrEqual(19);
  });

  test("draws every present widget to the ready state with no error message, and the pending ones say what is missing", async () => {
    vi.stubGlobal("fetch", fetchLocal);
    const dashboard = createDashboard(target, board, { widgets, fetch: fetchLocal });
    await dashboard.ready;
    await vi.waitFor(() => {
      for (const id of present) {
        const slot = target.querySelector(`.fft-cell-slot[data-widget="${id}"]`);
        expect([id, slot?.querySelector(".fft-widget")?.getAttribute("data-state")]).toEqual([id, "ready"]);
      }
    }, { timeout: 15000 });
    for (const id of present) {
      const slot = target.querySelector(`.fft-cell-slot[data-widget="${id}"]`) as Element;
      expect([id, slot.querySelector(".fft-message")?.textContent ?? ""]).toEqual([id, ""]);
    }
    expect([...target.querySelectorAll(".fft-cell-missing")].map((n) => n.textContent)).toEqual(named.filter((id) => !widgets[id]).map((id) => `No widget "${id}".`));
    // The maps, the board, the scatter's quadrants and the table's search are all on the page.
    expect(target.querySelectorAll(".fft-map").length).toBe(3);
    expect(target.querySelectorAll(".fft-board-column").length).toBe(8);
    expect(target.querySelectorAll(".fft-quadrant-label").length).toBe(4);
    expect(target.querySelectorAll(".fft-table-search").length).toBe(1);
    dashboard.destroy();
    vi.unstubAllGlobals();
  }, 30000);

  test("the topic filter scopes the widgets that carry a topic, and leaves the maps alone", async () => {
    vi.stubGlobal("fetch", fetchLocal);
    const dashboard = createDashboard(target, board, { widgets, fetch: fetchLocal });
    await dashboard.ready;
    const select = target.querySelector<HTMLSelectElement>(".fft-filter select") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toContain("Payments");
    await dashboard.setFilter("topic", "Payments");
    await vi.waitFor(() => {
      const boardSlot = target.querySelector('.fft-cell-slot[data-widget="reg-status-board"]') as Element;
      const names = [...boardSlot.querySelectorAll(".fft-board-name")].map((n) => n.textContent);
      expect(names.length).toBeGreaterThan(0);
      expect(names).toContain("PSD3");
      expect(names).not.toContain("DORA");
    }, { timeout: 15000 });
    const mapSlot = target.querySelector('.fft-cell-slot[data-widget="reg-rules-by-country"]') as Element;
    expect(mapSlot.querySelectorAll(".fft-map-region[data-step]").length).toBeGreaterThan(20);
    dashboard.destroy();
    vi.unstubAllGlobals();
  }, 30000);
});

/** Keeps the unused import honest for the typecheck: a row is what a widget draws. */
export type { Row };
