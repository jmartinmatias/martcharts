// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import { validateDashboard } from "../core/dashboard.ts";
import type { DashboardSpec } from "../core/dashboard.ts";
import { hasBlock } from "../core/registry.ts";
import type { Row, WidgetSpec } from "../core/types.ts";
import { hasErrors } from "../core/validate.ts";
import { createLocalFetch } from "../mcp/store.ts";
import { createDashboard } from "./dashboard.ts";
import "./views/index.ts";

/** Client health: dashboards/client-health.json over widgets/health/*.json, reading public/data. */
const board = JSON.parse(readFileSync("dashboards/client-health.json", "utf8")) as DashboardSpec;
const widgets: Record<string, WidgetSpec> = {};
for (const file of readdirSync("widgets/health").filter((f) => f.endsWith(".json"))) {
  const spec = JSON.parse(readFileSync(`widgets/health/${file}`, "utf8")) as WidgetSpec;
  widgets[spec.id as string] = spec;
}
const ids = board.widgets.flatMap((cell) => (cell.widget ? [cell.widget] : []));
const data = <T = Row>(file: string) => JSON.parse(readFileSync(`public/data/${file}`, "utf8")) as T[];

/** What a spec needs from the RAG engine: the ragboard or ragtrend view, the rag transform, or the rag format. */
function ragNeeds(spec: WidgetSpec): string[] {
  const needs: string[] = [];
  if (spec.view.type === "ragboard" || spec.view.type === "ragtrend") needs.push(`view:${spec.view.type}`);
  for (const step of spec.transform ?? []) if (step.type === "rag") needs.push("transform:rag");
  for (const field of Object.values(spec.fields ?? {})) {
    const format = typeof field.format === "string" ? field.format : field.format?.type;
    if (format === "rag" && !needs.includes("format:rag")) needs.push("format:rag");
  }
  return needs;
}
/** Drawable here: every block the spec names is registered. The RAG engine lands on a sibling branch; until then its specs are files only. */
const drawable = (id: string) => {
  const spec = widgets[id] as WidgetSpec;
  return hasBlock("view", spec.view.type) && (spec.transform ?? []).every((step) => hasBlock("transform", step.type)) && ragNeeds(spec).every((need) => !need.startsWith("format:") || hasBlock("format", "rag"));
};
const FILE_ONLY = ["health-bizDev-board", "health-clientSuccess-board", "health-coverage-board", "health-live-rules", "health-relationship-board", "health-trend"];

type Rag = "R" | "A" | "G" | "N";
interface Threshold {
  perspectiveKey: string;
  metric: string;
  status: string;
  green: number;
  amber: number;
  goodWhen: "up" | "down";
}
const thresholds = data<Threshold>("rag-thresholds.json");
const health = data("client-health.json");
const history = data("client-health-history.json");
const PERSPECTIVES = ["clientSuccess", "bizDev", "coverage", "relationship"];

/** A status from a raw value and its written threshold, as rag-thresholds.json describes it. */
function statusOf(value: unknown, t: Threshold): Rag {
  if (typeof value !== "number") return "N";
  if (t.goodWhen === "up") return value >= t.green ? "G" : value >= t.amber ? "A" : "R";
  return value <= t.green ? "G" : value <= t.amber ? "A" : "R";
}
/** The roll-up rule rag-rollups.json writes down: two reds, or one red and two ambers, make red; one red or two ambers make amber. */
function rollup(statuses: Rag[]): Rag {
  const known = statuses.filter((s) => s !== "N");
  if (!known.length) return "N";
  const red = known.filter((s) => s === "R").length;
  const amber = known.filter((s) => s === "A").length;
  if (red >= 2 || (red === 1 && amber >= 2)) return "R";
  return red === 1 || amber >= 2 ? "A" : "G";
}
const WORD: Record<Rag, string> = { R: "Red", A: "Amber", G: "Green", N: "No data" };

describe("the client health dashboard", () => {
  test("is a valid dashboard filtered by segment, banker and region, in the brief's sections", () => {
    expect(hasErrors(validateDashboard(board))).toBe(false);
    expect(board.filters?.map((filter) => filter.field)).toEqual(["segment", "rm", "region"]);
    expect(board.widgets.flatMap((cell) => (cell.section ? [cell.section] : []))).toEqual([
      "Overview",
      "Client success",
      "Business development",
      "Coverage",
      "Relationship",
      "Movement",
      "Actions",
      "Every client",
      "Thresholds",
    ]);
  });

  test("names only widgets that exist, each once, every one with the model as its source", () => {
    expect(ids.filter((id) => !widgets[id])).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(widgets).sort()).toEqual([...ids].sort());
    for (const id of ids) expect([id, widgets[id]?.source?.name]).toEqual([id, "Client health model (fictional)"]);
  });

  test("the specs for the RAG engine parse and need nothing else from it: the ragboard and ragtrend views, the rag transform and format", () => {
    const engine = ids.filter((id) => ragNeeds(widgets[id] as WidgetSpec).length);
    expect(engine.sort()).toEqual(FILE_ONLY);
    for (const id of engine) {
      const spec = widgets[id] as WidgetSpec;
      expect(["ragboard", "ragtrend", "table"]).toContain(spec.view.type);
      // Anything else such a spec uses is already in the library.
      expect((spec.transform ?? []).filter((step) => step.type !== "rag").every((step) => hasBlock("transform", step.type))).toBe(true);
    }
    // Each perspective has a scorecard over its own measures, worst first, with last quarter's status to compare.
    for (const p of PERSPECTIVES) {
      const view = widgets[`health-${p}-board`]?.view as Record<string, unknown>;
      expect(view.dimensions).toEqual(thresholds.filter((t) => t.perspectiveKey === p).map((t) => t.status));
      expect([view.overall, view.previous, view.sort]).toEqual([`${p}Rag`, { [`${p}Rag`]: `${p}PrevRag` }, "worst"]);
    }
    expect(widgets["health-trend"]?.view).toEqual({ type: "ragtrend", label: "client", period: "quarter", status: "overallRag", note: "note" });
  });

  test("every other widget uses only blocks the library has today", () => {
    for (const id of ids.filter((id) => !FILE_ONLY.includes(id))) expect([id, drawable(id)]).toEqual([id, true]);
  });

  test(
    "draws: every widget whose blocks are registered is ready, with no error",
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
      await vi.waitFor(() => expect(target.querySelectorAll('.fft-widget[data-state="ready"]').length).toBe(drawn.widgets.filter((cell) => cell.widget).length), { timeout: 15_000 });
      const cards = [...target.querySelectorAll(".fft-widget")];
      const states = cards.map((card) => [card.querySelector(".fft-title")?.textContent, card.getAttribute("data-state"), card.querySelector(".fft-message")?.textContent ?? ""]);
      expect(states.filter(([, state, message]) => state !== "ready" || message)).toEqual([]);
      // The headline tiles count this quarter's clients; the action list holds every client not on track.
      const tiles = [...target.querySelectorAll('.fft-cell-slot[data-widget="health-on-track"] .fft-stat-value, .fft-cell-slot[data-widget="health-on-track"] .fft-kpi-value')].map((n) => n.textContent);
      expect(tiles.length).toBe(4);
      expect(target.querySelector('.fft-cell-slot[data-widget="health-actions"] .fft-pager-where')?.textContent).toContain(`of ${health.filter((r) => r.overallRag !== "G").length}`);
      dash.destroy();
      vi.unstubAllGlobals();
    },
    30_000,
  );
});

describe("the data obeys its written rules", () => {
  test("every measure's status is its value against rag-thresholds.json", () => {
    expect(thresholds).toHaveLength(18);
    let checked = 0;
    for (const row of health) {
      for (const t of thresholds) {
        expect([row.name, t.metric, row[t.status]]).toEqual([row.name, t.metric, statusOf(row[t.metric], t)]);
        checked++;
      }
    }
    expect(checked).toBe(60 * 18);
  });

  test("each perspective rolls up its measures, and the overall status rolls up the perspectives, as rag-rollups.json says", () => {
    const rules = data<{ level: string; rule: string }>("rag-rollups.json").map((r) => r.level);
    expect(rules).toEqual(["Perspective", "Overall", "Relationship manager"]);
    for (const row of health) {
      for (const p of PERSPECTIVES) {
        const own = thresholds.filter((t) => t.perspectiveKey === p).map((t) => row[t.status] as Rag);
        expect([row.name, p, row[`${p}Rag`], row[`${p}Status`]]).toEqual([row.name, p, rollup(own), WORD[rollup(own)]]);
      }
      const overall = rollup(PERSPECTIVES.map((p) => row[`${p}Rag`] as Rag));
      expect([row.name, row.overallRag, row.overallStatus]).toEqual([row.name, overall, WORD[overall]]);
    }
  });

  test("a mix a reader would believe: most clients green, a fifth to a third amber, a few red, and some measures with no data", () => {
    const count = (s: Rag) => health.filter((r) => r.overallRag === s).length;
    expect(count("G")).toBeGreaterThan(30);
    expect(count("A")).toBeGreaterThan(10);
    expect(count("R")).toBeGreaterThanOrEqual(5);
    expect(health.some((r) => r.npsRag === "N")).toBe(true);
  });

  test("history ends where today is, last quarter is the previous status, and every move has a note", () => {
    expect(history).toHaveLength(60 * 8);
    for (const row of health) {
      const trail = history.filter((h) => h.clientId === row.id);
      expect(trail.map((h) => h.quarter)).toEqual(["2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4", "2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4"]);
      const [q3, q4] = trail.slice(-2) as [Row, Row];
      for (const p of PERSPECTIVES) expect([row.name, q4[`${p}Rag`], q3[`${p}Rag`]]).toEqual([row.name, row[`${p}Rag`], row[`${p}PrevRag`]]);
      expect([q4.overallRag, q3.overallRag]).toEqual([row.overallRag, row.overallPrevRag]);
      for (const [i, h] of trail.entries()) {
        expect(h.overallRag).toBe(rollup(PERSPECTIVES.map((p) => h[`${p}Rag`] as Rag)));
        const moved = i > 0 && h.overallRag !== trail[i - 1]?.overallRag;
        expect([h.client, h.quarter, Boolean(h.note)]).toEqual([h.client, h.quarter, moved]);
      }
    }
  });

  test("the transitions, the banker books and the heatmap rows count the same clients", () => {
    const moves = data<{ from: string; to: string; clients: number }>("rag-transitions.json");
    expect(moves.reduce((sum, m) => sum + m.clients, 0)).toBe(60);
    for (const m of moves) {
      const n = health.filter((r) => `${WORD[r.overallPrevRag as Rag]} in Q3` === m.from && `${WORD[r.overallRag as Rag]} in Q4` === m.to).length;
      expect([m.from, m.to, m.clients]).toEqual([m.from, m.to, n]);
    }
    const books = data("rm-health.json");
    for (const book of books) {
      const own = health.filter((r) => r.rm === book.rm);
      expect([book.rm, book.clients, book.red, book.amber, book.green]).toEqual([book.rm, own.length, ...(["R", "A", "G"] as Rag[]).map((s) => own.filter((r) => r.overallRag === s).length)]);
      for (const p of PERSPECTIVES) {
        const red = own.filter((r) => r[`${p}Rag`] === "R").length;
        const amber = own.filter((r) => r[`${p}Rag`] === "A").length;
        const s: Rag = red / own.length >= 0.25 ? "R" : (red + amber) / own.length > 0.4 ? "A" : "G";
        expect([book.rm, p, book[`${p}Red`], book[`${p}Rag`]]).toEqual([book.rm, p, red, s]);
      }
    }
    const reds = data("rag-by-rm.json");
    expect(reds).toHaveLength(books.length * 4);
    expect(reds.reduce((sum, r) => sum + Number(r.red), 0)).toBe(PERSPECTIVES.reduce((sum, p) => sum + health.filter((r) => r[`${p}Rag`] === "R").length, 0));
  });

  test("every client not on track has an owner, a next step and days open; every client on track has none", () => {
    for (const row of health) {
      const open = row.overallRag !== "G";
      expect([row.name, Boolean(row.owner), Boolean(row.action), typeof row.daysOpen === "number"]).toEqual([row.name, open, open, open]);
    }
  });
});
