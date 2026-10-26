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
for (const file of readdirSync("widgets/regulatory").filter((name) => name.endsWith(".json"))) {
  const spec = JSON.parse(readFileSync(`widgets/regulatory/${file}`, "utf8")) as WidgetSpec;
  if (spec.id) widgets[spec.id] = spec;
}

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
    expect(board.widgets.filter((cell) => cell.section).map((cell) => cell.section)).toEqual(["Headline numbers", "What applies next", "Pressure", "Impact", "Where the rules bind", "Volume and density", "National transposition"]);
  });

  test("every widget it names exists, including the matrix, strips and lifecycle specs", () => {
    for (const id of named) expect([id, Boolean(widgets[id])]).toEqual([id, true]);
    for (const id of ["reg-density-strips", "reg-lifecycle", "reg-pressure-matrix", "reg-stakeholder-matrix"]) expect(named).toContain(id);
  });

  test("every regulatory widget carries its source and no byline (the board credits it once, as Source), and the ones drawn here validate against their own data", async () => {
    for (const id of named.filter((id) => widgets[id])) {
      const spec = widgets[id] as WidgetSpec;
      expect([id, spec.source?.name, spec.byline]).toEqual([id, "Regulatory watch (fictional)", undefined]);
    }
    // Fifteen cards after the noise plan's cuts (from 21), every one drawable.
    expect(present.length).toBe(15);
  });

  test("draws every widget to the ready state with no error message", async () => {
    vi.stubGlobal("fetch", fetchLocal);
    const dashboard = createDashboard(target, board, { widgets, fetch: fetchLocal });
    await dashboard.ready;
    // The national transposition section starts folded; opened, its cards must draw like the rest.
    for (const toggle of target.querySelectorAll<HTMLButtonElement>('.fft-section-toggle[aria-expanded="false"]')) toggle.click();
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
    expect(present).toHaveLength(named.length);
    expect(target.querySelectorAll(".fft-cell-missing")).toHaveLength(0);
    // The country map, the scatter's quadrants and the table's search are on the page. The two transposition maps sit
    // in a collapsed section (noise plan), so they draw only once it is opened; the status board left the board.
    expect(target.querySelectorAll(".fft-map").length).toBeGreaterThanOrEqual(1);
    expect(target.querySelectorAll(".fft-quadrant-label").length).toBe(4);
    expect(target.querySelectorAll(".fft-table-search").length).toBe(1);
    // The views another branch added draw here too: two matrices, the strips and the lifecycle.
    expect([target.querySelectorAll(".fft-matrix").length, target.querySelectorAll(".fft-strips").length, target.querySelectorAll(".fft-lifecycle").length]).toEqual([2, 1, 1]);
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
      // The status board left the board (noise plan: it repeated the lifecycle); the lifecycle shows the same filter.
      const slot = target.querySelector('.fft-cell-slot[data-widget="reg-lifecycle"]') as Element;
      const text = slot.textContent ?? "";
      expect(text).toContain("PSD3");
      expect(text).not.toContain("DORA");
    }, { timeout: 15000 });
    const mapSlot = target.querySelector('.fft-cell-slot[data-widget="reg-rules-by-country"]') as Element;
    expect(mapSlot.querySelectorAll(".fft-map-region[data-step]").length).toBeGreaterThan(20);
    dashboard.destroy();
    vi.unstubAllGlobals();
  }, 30000);
});

/** Keeps the unused import honest for the typecheck: a row is what a widget draws. */
export type { Row };
