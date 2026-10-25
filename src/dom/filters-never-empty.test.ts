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
 * No filter leaves a dead end on a worked dashboard. Maps keep drawing, greyed, with "No data". Any other card a
 * filter empties says which filter did it and offers to clear it, and clearing brings its data back. Client cards that
 * follow a selection move to a client still in view instead of going blank.
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

describe("filters never leave a dead end", async () => {
  const all = await cases();
  test("there are filter values to try on every board", () => {
    for (const name of BOARDS) expect([name, all.some(([board]) => board === name)]).toEqual([name, true]);
  });

  test.each(all)("%s, %s = %s: no dead end", async (name, field, value) => {
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    const board = JSON.parse(readFileSync(`dashboards/${name}.json`, "utf8")) as DashboardSpec;
    const target = document.createElement("div");
    document.body.append(target);
    const dash = createDashboard(target, board, { widgets, fetch });
    await dash.ready;
    await dash.setFilter(field, value);
    await vi.waitFor(() => expect(target.querySelectorAll('.fft-widget[data-state="loading"]').length).toBe(0), { timeout: 20_000 });
    const cards = [...target.querySelectorAll(".fft-widget")];
    const blank = cards.filter((card) => card.getAttribute("data-state") === "empty");
    // No card says the generic "No data to show": an empty card names the filter that emptied it.
    expect(blank.filter((card) => !/^Nothing for /.test(card.querySelector(".fft-state-title")?.textContent ?? "")).map((card) => card.closest(".fft-cell-slot")?.getAttribute("data-widget"))).toEqual([]);
    // Maps and the cards that follow a client never go blank.
    const neverBlank = (card: Element) => card.querySelector(".fft-map") !== null || card.closest(".fft-cell-slot")?.hasAttribute("data-follows");
    expect(cards.filter((card) => card.getAttribute("data-state") !== "ready" && neverBlank(card)).map((card) => card.closest(".fft-cell-slot")?.getAttribute("data-widget"))).toEqual([]);
    // And the way back works: clearing from an empty card leaves it with its data.
    const first = blank[0];
    if (first) {
      const slot = first.closest(".fft-cell-slot")?.getAttribute("data-widget");
      (first.querySelector(".fft-state-action") as HTMLButtonElement).click();
      await vi.waitFor(() => expect(target.querySelector(`.fft-cell-slot[data-widget="${slot}"] .fft-widget`)?.getAttribute("data-state")).toBe("ready"), { timeout: 20_000 });
    }
    dash.destroy();
    target.remove();
    vi.unstubAllGlobals();
  });
});
