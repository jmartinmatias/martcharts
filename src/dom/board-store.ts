/**
 * Where the editor and the composer keep what people make: saved charts and the dashboards they go into. The
 * default keeps both in the browser's localStorage; a host swaps in its own store (a server, a team folder) by
 * passing anything with the same five methods (and a sixth, `removeBoard`, for deleting and renaming dashboards).
 *
 * @module
 */
import type { DashboardSpec } from "../core/dashboard.ts";
import type { WidgetSpec } from "../core/types.ts";

/** A chart someone saved, with its spec (data inlined) and when. */
export interface SavedChart {
  id: string;
  spec: WidgetSpec;
  savedAt: string;
}

/** A dashboard someone composed: its spec, cards inlined, and when it was last saved. */
export interface SavedBoard {
  id: string;
  spec: DashboardSpec;
  savedAt: string;
}

/** What the editor and the composer need from a store. Every method may be synchronous or return a promise. */
export interface BoardStore {
  charts(): SavedChart[] | Promise<SavedChart[]>;
  saveChart(chart: SavedChart): void | Promise<void>;
  removeChart(id: string): void | Promise<void>;
  boards(): SavedBoard[] | Promise<SavedBoard[]>;
  saveBoard(board: SavedBoard): void | Promise<void>;
  /**
   * Removes a dashboard. Optional: without it the composer cannot delete one, and a renamed dashboard (whose id
   * follows its title) leaves its old copy behind.
   */
  removeBoard?(id: string): void | Promise<void>;
}

/** The charts' key: the same one the editor has always used, so charts saved before the store still show. */
export const CHARTS_KEY = "martcharts:editor:charts";
export const BOARDS_KEY = "martcharts:boards";

/** A store in `storage` (the window's localStorage by default). Blocked or full storage keeps nothing and breaks nothing. */
export function localBoardStore(storage?: Storage): BoardStore {
  const local = (() => {
    if (storage) return storage;
    try {
      return globalThis.localStorage;
    } catch {
      return undefined;
    }
  })();
  const read = <T extends { id: string }>(key: string, valid: (item: T) => boolean): T[] => {
    try {
      const parsed: unknown = JSON.parse(local?.getItem(key) ?? "[]");
      return Array.isArray(parsed) ? (parsed as T[]).filter((item) => item && typeof item.id === "string" && valid(item)) : [];
    } catch {
      return [];
    }
  };
  const write = (key: string, items: unknown[]) => {
    try {
      local?.setItem(key, JSON.stringify(items));
    } catch {
      // Storage blocked or full: nothing kept, nothing broken.
    }
  };
  const charts = () => read<SavedChart>(CHARTS_KEY, (chart) => Boolean(chart.spec));
  const boards = () => read<SavedBoard>(BOARDS_KEY, (board) => Boolean(board.spec && Array.isArray(board.spec.widgets)));
  return {
    charts,
    saveChart: (chart) => write(CHARTS_KEY, [chart, ...charts().filter((c) => c.id !== chart.id)]),
    removeChart: (id) => write(CHARTS_KEY, charts().filter((c) => c.id !== id)),
    boards,
    saveBoard: (board) => write(BOARDS_KEY, [board, ...boards().filter((b) => b.id !== board.id)]),
    removeBoard: (id) => write(BOARDS_KEY, boards().filter((b) => b.id !== id)),
  };
}

/** A short, readable id from a title: "Revenue by region" becomes "revenue-by-region". */
export function slugOf(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "item"
  );
}

/**
 * A chart added to a board: a new card at the end, its spec inlined so the board stands alone, the whole board
 * saved again. With no board named, a new one is started under `title`. Returns the board as saved.
 */
export async function addChartToBoard(store: BoardStore, spec: WidgetSpec, board: { id?: string; title?: string }): Promise<SavedBoard> {
  const existing = board.id ? (await store.boards()).find((b) => b.id === board.id) : undefined;
  const base: DashboardSpec = existing?.spec ?? { id: board.id ?? slugOf(board.title ?? "dashboard"), title: board.title, columns: 2, widgets: [] };
  const saved: SavedBoard = {
    id: existing?.id ?? base.id ?? slugOf(board.title ?? "dashboard"),
    spec: { ...base, widgets: [...base.widgets, { spec }] },
    savedAt: new Date().toISOString(),
  };
  await store.saveBoard(saved);
  return saved;
}

/**
 * The address of the lite drop-in bundle for embed snippets: absolute, so a snippet pasted into another site still
 * loads it. `href` overrides it (a CDN, or the site's own path); otherwise `dist/martcharts-lite.iife.js` next to the
 * page that writes the snippet (the editor and composer sit at the site's root).
 */
export function liteBundleUrl(doc: Document, href?: string): string {
  const path = href ?? "dist/martcharts-lite.iife.js";
  try {
    return new URL(path, doc.baseURI).href;
  } catch {
    return path;
  }
}
