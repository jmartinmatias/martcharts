// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import type { DashboardSpec } from "../core/dashboard.ts";
import { runPipeline } from "../core/pipeline.ts";
import type { Row, WidgetSpec } from "../core/types.ts";
import { createLocalFetch } from "../mcp/store.ts";
import { createDashboard } from "./dashboard.ts";
import "./views/index.ts";

/**
 * Every value of every filter on every worked dashboard leaves every card with something to show. A card a filter
 * empties is a dead end: a client card pinned to one client, a map of a fixed list of names.
 */
const fetch = createLocalFetch("public");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(`${dir}/${f}`).isDirectory() ? walk(`${dir}/${f}`) : f.endsWith(".json") ? [`${dir}/${f}`] : []));
const widgets: Record<string, WidgetSpec> = {};
for (const file of walk("widgets")) {
  const spec = JSON.parse(readFileSync(file, "utf8")) as WidgetSpec;
  if (spec.id) widgets[spec.id] = spec;
}
const BOARDS = ["commercial-cockpit", "regulatory-landscape", "client-health"];

/** Each board's filters and the values its own data offers for each. */
async function cases(): Promise<[string, string, string][]> {
  const out: [string, string, string][] = [];
  for (const name of BOARDS) {
    const board = JSON.parse(readFileSync(`dashboards/${name}.json`, "utf8")) as DashboardSpec;
    for (const filter of board.filters ?? []) {
      const values = new Set<string>();
      for (const cell of board.widgets) {
        const spec = cell.widget ? widgets[cell.widget] : undefined;
        if (!spec) continue;
        const rows = await runPipeline({ data: spec.data }, { fetch }).catch(() => [] as Row[]);
        for (const row of rows) if (row[filter.field] !== undefined && row[filter.field] !== null && row[filter.field] !== "") values.add(String(row[filter.field]));
      }
      for (const value of values) out.push([name, filter.field, value]);
    }
  }
  return out;
}

describe("filters never leave a card empty", async () => {
  const all = await cases();
  test("there are filter values to try on every board", () => {
    for (const name of BOARDS) expect([name, all.some(([board]) => board === name)]).toEqual([name, true]);
  });

  test.each(all)("%s, %s = %s: every card has rows", async (name, field, value) => {
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    const board = JSON.parse(readFileSync(`dashboards/${name}.json`, "utf8")) as DashboardSpec;
    const target = document.createElement("div");
    document.body.append(target);
    const dash = createDashboard(target, board, { widgets, fetch });
    await dash.ready;
    await dash.setFilter(field, value);
    await vi.waitFor(() => expect(target.querySelectorAll('.fft-widget[data-state="loading"]').length).toBe(0), { timeout: 20_000 });
    const empty = [...target.querySelectorAll(".fft-widget")].filter((card) => card.getAttribute("data-state") === "empty" || /No data to show/.test(card.querySelector(".fft-message")?.textContent ?? "")).map((card) => card.closest(".fft-cell-slot")?.getAttribute("data-widget"));
    expect(empty).toEqual([]);
    dash.destroy();
    target.remove();
    vi.unstubAllGlobals();
  });
});
