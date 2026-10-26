/**
 * The composer: a dashboard laid out from saved charts and examples, with no JSON to write. Charts sit in a tray;
 * drag them onto the board (or press Add), order them, set each card's width, add section headings, pick filters
 * from the fields the cards share (each showing how many cards it reaches), and name the board. The live dashboard
 * renders beside the layout as it changes. Publish gives the dashboard JSON, the embed code and an address that opens
 * it as a page.
 *
 * Everything is keyboard reachable: Add on every chart, Move up, Move down and Remove on every card, and Undo
 * (Cmd/Ctrl+Z). The board's address carries its spec, so a composition can be shared by link.
 *
 * @module
 */
import { validateDashboard } from "../core/dashboard.ts";
import type { DashboardCell, DashboardSpec } from "../core/dashboard.ts";
import { fieldLabel } from "../core/display.ts";
import { runPipeline } from "../core/pipeline.ts";
import type { Row, WidgetSpec } from "../core/types.ts";
import { wordsFor } from "../core/words.ts";
import { DARK, LIGHT } from "./styles.ts";
import { liteBundleUrl, localBoardStore, slugOf } from "./board-store.ts";
import type { BoardStore, SavedBoard, SavedChart } from "./board-store.ts";
import { createDashboard } from "./dashboard.ts";
import type { Dashboard } from "./dashboard.ts";
import { frameEmbed } from "./embed.ts";
import { ensureStyles } from "./styles.ts";

export interface ComposerOptions {
  /** Where saved charts and boards live. Default: this browser's localStorage, shared with the editor. */
  store?: BoardStore;
  /** Built-in charts offered in the tray beside the saved ones, by name. */
  examples?: Record<string, WidgetSpec>;
  /** The board to open with. Default: the address's board, else an empty one. */
  board?: DashboardSpec;
  /** `fetch` for the cards' url sources. */
  fetch?: typeof fetch;
  /** Keep the board in the page address, so a composition can be shared by link. Default true in a browser. */
  hash?: boolean;
  /** The composer's language, as a locale. Default: the page's own `lang`, then English. */
  locale?: string;
  /** The address "Open as page" goes to. Default: this page with `#view=1&spec=…`. */
  pageHref?(spec: DashboardSpec): string;
  /** The address of `embed.html`, for the iframe embed code (a frame that sizes itself). Default: `embed.html`. */
  embedHref?: string;
  /** Where the script embed loads the drop-in bundle from. Default: the lite bundle next to this page, as an absolute address. */
  bundleHref?: string;
  /** The style the live preview draws in (a host's look, `{ preset: "glass" }`), read at each draw. Default: the board's own. */
  previewStyle?(): Record<string, unknown> | undefined;
}

/** A live composer on the page. */
export interface Composer {
  readonly root: HTMLElement;
  /** The dashboard as it stands. */
  readonly spec: DashboardSpec;
  /** Resolves when the live preview has drawn the board as it stands. */
  readonly ready: Promise<void>;
  /** Adds a chart as a card, at the end or before card `at`. */
  add(chart: WidgetSpec, at?: number): void;
  /** Adds a section heading, at the end or before card `at`. */
  addSection(title?: string, at?: number): void;
  /** Moves card `from` to place `to` (both 0-based). */
  move(from: number, to: number): void;
  remove(index: number): void;
  /** Sets how many columns card `index` spans (1 to the board's columns). */
  setSpan(index: number, span: number): void;
  setColumns(columns: number): void;
  setMeta(meta: { title?: string; subtitle?: string; asOf?: string }): void;
  /** Turns a filter on or off. */
  setFilter(field: string, on: boolean): void;
  /** The fields two or more cards share, each with how many cards a filter on it would reach. */
  filterChoices(): Promise<FilterChoice[]>;
  /** Steps back one change. False when there is nothing to undo. */
  undo(): boolean;
  /** Saves the board in the store and returns it. */
  save(): Promise<SavedBoard>;
  /** Redraws the preview in `previewStyle` as it stands now (after the host's look changed). */
  restyle(): Promise<void>;
  destroy(): void;
}

/** A field a filter can be set on, and its reach. */
export interface FilterChoice {
  field: string;
  label: string;
  /** How many cards carry the field. */
  reach: number;
  /** How many cards there are. */
  total: number;
  on: boolean;
}

const toBase64Url = (text: string) => btoa(unescape(encodeURIComponent(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (text: string) => decodeURIComponent(escape(atob(text.replace(/-/g, "+").replace(/_/g, "/"))));

/** The page address for a board: its spec in base64url. */
export function boardToHash(spec: DashboardSpec, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ ...extra, spec: toBase64Url(JSON.stringify(spec)) });
  return `#${params.toString()}`;
}

/** What an address names: a board spec carried in it, a stored board's id, and whether it asks for the page view. */
export function boardFromHash(hash: string): { spec?: DashboardSpec; id?: string; view: boolean } {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const out: { spec?: DashboardSpec; id?: string; view: boolean } = { view: params.get("view") === "1" };
  const encoded = params.get("spec");
  if (encoded) {
    try {
      const parsed = JSON.parse(fromBase64Url(encoded)) as DashboardSpec;
      if (parsed && Array.isArray(parsed.widgets)) out.spec = parsed;
    } catch {
      // A hand-edited address: start fresh.
    }
  }
  const id = params.get("board");
  if (id) out.id = id;
  return out;
}

/** Code that puts the board on any page, with the drop-in bundle and no build step. */
export function dashboardEmbed(spec: DashboardSpec, bundle = "martcharts-lite.iife.js"): string {
  const json = JSON.stringify(spec, null, 2).replace(/<\/script/gi, "<\\/script");
  return `<script src="${bundle}"></script>\n<div id="board"></div>\n<script>\n  MartCharts.createDashboard(document.getElementById("board"), ${json.split("\n").join("\n  ")});\n</script>`;
}

/** A card's name for lists and announcements. */
const nameOf = (cell: DashboardCell, untitled: string) => cell.section ?? cell.spec?.title ?? cell.spec?.id ?? cell.widget ?? untitled;

/** True for a field whose values name groups (a segment, a region), the kind a filter picks one of. */
function filterable(rows: Row[], field: string): boolean {
  const values = new Set<string>();
  for (const row of rows) {
    const value = row[field];
    if (value === null || value === undefined || value === "") continue;
    if (typeof value !== "string" || /^\d{4}-\d{2}/.test(value)) return false;
    values.add(value);
    if (values.size > 40) return false;
  }
  return values.size >= 2;
}

const CSS = `
/* The kit's colour tokens, light by default, dark by the page's scheme or data-theme, as the editor has: without them
   every border and fill here (var(--fft-grid), var(--fft-surface)) resolved to nothing and the controls read as text. */
.fft-composer {${LIGHT}}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .fft-composer {${DARK}} }
:root[data-theme="dark"] .fft-composer {${DARK}}
.fft-composer { --fft-cmp-gap: 21px; --fft-control-h: 30px; display: grid; grid-template-columns: minmax(0, 233px) minmax(0, 1fr); grid-template-areas: "tray board" "preview preview" "publish publish"; gap: var(--fft-cmp-gap); color: var(--fft-text); font-size: 13px; }
/* A container query reads an ancestor, never the element itself: the composer's host is the container its layouts follow. */
:has(> .fft-composer) { container-type: inline-size; }
@media (pointer: coarse) { .fft-composer { --fft-control-h: 34px; } }
.fft-cmp-tray { grid-area: tray; }
.fft-cmp-board { grid-area: board; }
.fft-cmp-publish { grid-area: publish; display: flex; flex-direction: column; gap: 13px; min-width: 0; }
.fft-cmp-more > summary { cursor: pointer; padding: 5px 0; font-weight: 600; color: var(--fft-text-secondary); }
.fft-cmp-more[open] > summary { margin-bottom: 8px; }
.fft-composer h3 { margin: 0 0 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--fft-text-secondary); }
.fft-cmp-tray, .fft-cmp-board { display: flex; flex-direction: column; gap: 13px; min-width: 0; }
.fft-cmp-preview { grid-area: preview; min-width: 0; }
.fft-cmp-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.fft-cmp-item { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border: 1px solid var(--fft-grid); border-radius: 8px; background: var(--fft-surface); cursor: grab; min-height: 34px; }
.fft-cmp-item[data-dragging] { opacity: 0.5; }
.fft-cmp-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fft-cmp-kind { color: var(--fft-muted); font-size: 11px; }
.fft-cmp-cards { min-height: 89px; padding: 8px; border: 1px dashed var(--fft-grid); border-radius: 8px; }
.fft-cmp-cards[data-over] { border-color: var(--fft-accent); background: color-mix(in srgb, var(--fft-accent) 6%, transparent); }
.fft-cmp-card[data-section] { background: transparent; border-style: dashed; }
.fft-cmp-card[data-over] { box-shadow: inset 0 2px 0 var(--fft-accent); }
.fft-cmp-empty { margin: 0; color: var(--fft-muted); }
.fft-cmp-boards { display: flex; flex-direction: column; gap: 8px; margin: 0 0 13px; }
.fft-cmp-saved-boards .fft-cmp-item { cursor: default; flex-wrap: wrap; }
/* A saved dashboard's name and date wrap rather than being cut: the list is narrow, and the date tells two apart. */
.fft-cmp-saved-boards .fft-cmp-name, .fft-cmp-saved-boards .fft-cmp-name > span { white-space: normal; overflow: visible; overflow-wrap: anywhere; }
.fft-cmp-saved-boards .fft-cmp-name { flex: 1 1 100%; }
.fft-cmp-saved-boards .fft-cmp-item[aria-current] { border-color: var(--fft-accent); }
.fft-cmp-name > span { display: block; overflow: hidden; text-overflow: ellipsis; }
.fft-cmp-when { color: var(--fft-muted); font-size: 11px; }
.fft-cmp-deleted { margin: 0; color: var(--fft-text-secondary); }
.fft-cmp-preview-empty { margin: 0; padding: 21px; border: 1px dashed var(--fft-grid); border-radius: 13px; color: var(--fft-muted); text-align: center; }
.fft-cmp-button { box-sizing: border-box; min-height: var(--fft-control-h); padding: 0 13px; border: 1px solid var(--fft-grid); border-radius: 999px; background: color-mix(in srgb, var(--fft-text) 5%, transparent); color: inherit; font: inherit; font-size: 12px; cursor: pointer; white-space: nowrap; }
.fft-cmp-button:hover { background: color-mix(in srgb, var(--fft-text) 6%, transparent); }
.fft-cmp-button:disabled { opacity: 0.4; cursor: default; }
.fft-cmp-input, .fft-cmp-select { box-sizing: border-box; min-height: var(--fft-control-h); padding: 0 11px; border: 1px solid var(--fft-grid); border-radius: 8px; background: var(--fft-surface); color: inherit; font: inherit; font-size: 13px; }
.fft-cmp-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(144px, 100%), 1fr)); gap: 8px; }
.fft-cmp-meta label, .fft-cmp-field { display: flex; flex-direction: column; gap: 3px; min-width: 0; color: var(--fft-text-secondary); font-size: 12px; }
.fft-cmp-meta .fft-cmp-input, .fft-cmp-field .fft-cmp-input, .fft-cmp-field .fft-cmp-select { width: 100%; min-width: 0; max-width: 100%; box-sizing: border-box; }
.fft-cmp-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.fft-cmp-columns button[aria-pressed="true"] { background: color-mix(in srgb, var(--fft-text) 10%, transparent); font-weight: 600; }
.fft-cmp-filter { display: flex; align-items: center; gap: 8px; }
.fft-cmp-reach { color: var(--fft-muted); font-size: 12px; }
.fft-cmp-pre { max-height: 233px; overflow: auto; margin: 0; padding: 8px; border-radius: 5px; background: color-mix(in srgb, var(--fft-text) 4%, transparent); font: 12px/1.5 ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace; white-space: pre; }
.fft-cmp-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.fft-composer :is(button, select, input, a, [tabindex]):focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; }
@container (min-width: 960px) { .fft-composer { grid-template-columns: minmax(0, 233px) minmax(260px, 340px) minmax(0, 1fr); grid-template-areas: "tray board preview" "tray board publish"; align-items: start; } }
@container (max-width: 640px) { .fft-composer { grid-template-columns: minmax(0, 1fr); grid-template-areas: "tray" "board" "preview" "publish"; } }
`;
const styled = new WeakSet<Document>();

/** Opens a composer in `target`. */
export function createComposer(target: HTMLElement, options: ComposerOptions = {}): Composer {
  const doc = target.ownerDocument;
  const win = doc.defaultView;
  ensureStyles(doc);
  if (!styled.has(doc)) {
    const style = doc.createElement("style");
    style.dataset.fftComposer = "";
    style.textContent = CSS;
    doc.head.append(style);
    styled.add(doc);
  }
  const w = wordsFor(options.locale ?? doc.documentElement.lang).composer;
  const sw = wordsFor(options.locale ?? doc.documentElement.lang).surface;
  /** How many filters show before Show all: the ones with the widest reach. */
  const FILTERS_SHOWN = 5;
  let allFilters = false;
  /** Which folds in Publish the user opened, kept across repaints. */
  const foldOpen = new Set<string>();
  const store = options.store ?? localBoardStore(win?.localStorage);
  const useHash = options.hash ?? Boolean(win && win.location);

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (label: string, onClick: () => void, aria?: string): HTMLButtonElement => {
    const b = el("button", "fft-cmp-button", label);
    b.type = "button";
    if (aria) b.setAttribute("aria-label", aria);
    b.addEventListener("click", onClick);
    return b;
  };

  // ---- State ----
  const fromAddress = useHash && win ? boardFromHash(win.location.hash) : { view: false };
  let board: DashboardSpec = options.board ?? fromAddress.spec ?? { id: "dashboard", title: "", columns: 2, widgets: [] };
  board = { columns: 2, ...board, widgets: [...board.widgets] };
  const history: string[] = [];
  let saved: SavedChart[] = [];
  /** The dashboards in the store, latest first, for "My dashboards". */
  let boardsList: SavedBoard[] = [];
  /** The id the open board is stored under, once saved (a rename moves it). */
  let storedId: string | undefined;
  /** The dashboard deleted last, until it is restored or another is deleted. */
  let lastDeleted: SavedBoard | undefined;
  let preview: Dashboard | undefined;
  let ready: Promise<void> = Promise.resolve();
  const fieldsCache = new Map<string, Promise<Row[]>>();

  const root = el("div", "fft-composer");
  const live = el("p", "fft-cmp-live");
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  const tray = el("section", "fft-cmp-tray");
  tray.setAttribute("aria-label", w.tray);
  const panel = el("section", "fft-cmp-board");
  panel.setAttribute("aria-label", w.board);
  const previewWrap = el("section", "fft-cmp-preview");
  previewWrap.setAttribute("aria-label", w.preview);
  const previewEl = el("div");
  // Publish comes after the preview: the dashboard is what the user came for; the JSON is a developer export.
  const publishWrap = el("section", "fft-cmp-publish");
  publishWrap.setAttribute("aria-label", w.publish);
  root.append(live, tray, panel, previewWrap, publishWrap);
  target.append(root);

  const say = (text: string) => {
    live.textContent = "";
    live.textContent = text;
  };
  const columns = () => Math.min(4, Math.max(1, board.columns ?? 2));
  /** Whether the board has a chart on it (sections alone draw nothing). */
  const hasCards = () => board.widgets.some((cell) => typeof cell.widget === "string" || cell.spec !== undefined);

  /** Every change goes through here: kept for undo, the address and the store written, and everything redrawn. */
  function commit(next: DashboardSpec, announce?: string) {
    history.push(JSON.stringify(board));
    if (history.length > 50) history.shift();
    board = next;
    if (announce) say(announce);
    persist();
    paint();
  }
  function writeAddress() {
    if (useHash && win) {
      try {
        win.history.replaceState(null, "", boardToHash(board));
      } catch {
        // Some frames refuse a new address: the board still works.
      }
    }
  }
  function persist() {
    writeAddress();
    const id = board.id ?? slugOf(board.title || "dashboard");
    // A rename gives the board a new id (its title's): the copy under the old one goes, so the list shows it once.
    const moved = storedId && storedId !== id ? storedId : undefined;
    storedId = id;
    const spec = board;
    const write = () => store.saveBoard({ id, spec, savedAt: new Date().toISOString() });
    // This browser's store answers at once, so the board is written before the next line runs; a host's may wait.
    const removed = moved && store.removeBoard ? store.removeBoard(moved) : undefined;
    const written = removed instanceof Promise ? removed.then(write) : write();
    void Promise.resolve(written).then(refreshBoards).catch(() => undefined);
  }
  /** Reads the store's dashboards again and redraws "My dashboards". */
  async function refreshBoards() {
    try {
      boardsList = await store.boards();
    } catch {
      boardsList = [];
    }
    paintBoards();
  }
  /** An id no other stored dashboard has: `base`, else `base-2`, `base-3`… */
  const freeId = (base: string) => {
    const taken = new Set(boardsList.map((b) => b.id).filter((id) => id !== storedId));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  };

  // ---- The tray: saved charts and examples, each draggable or added with a button ----
  const trayItem = (spec: WidgetSpec, key: string) => {
    const item = el("li", "fft-cmp-item");
    item.draggable = true;
    const name = spec.title || spec.id || w.untitledChart;
    item.append(el("span", "fft-cmp-name", name), el("span", "fft-cmp-kind", spec.view.type), button(w.add, () => add(spec), w.addTo(name)));
    item.addEventListener("dragstart", (event) => {
      dragging = { kind: "chart", spec };
      (event as DragEvent).dataTransfer?.setData("text/plain", key);
    });
    item.addEventListener("dragend", () => (dragging = undefined));
    return item;
  };
  // ---- My dashboards: every board saved here, to open, start anew or delete (with an undo, not a confirm) ----
  const boardsBox = el("div", "fft-cmp-boards");
  /** The boards worth listing: the ones with a card or a name (an untouched new board is not one yet). */
  const listed = () => boardsList.filter((b) => b.spec.widgets.length > 0 || Boolean(b.spec.title));
  const boardName = (b: SavedBoard) => b.spec.title || w.untitledBoard;
  const dateOf = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    try {
      return new Intl.DateTimeFormat(options.locale ?? (doc.documentElement.lang || "en"), { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
    } catch {
      return iso.slice(0, 10);
    }
  };
  function paintBoards() {
    boardsBox.replaceChildren(el("h3", undefined, w.myBoards));
    const head = el("div", "fft-cmp-row");
    const fresh = button(w.newBoard, () => startNew());
    fresh.dataset.action = "new-board";
    head.append(fresh);
    boardsBox.append(head);
    if (lastDeleted) {
      const gone = lastDeleted;
      const note = el("p", "fft-cmp-row fft-cmp-deleted");
      const back = button(w.undo, () => void restore(gone));
      back.dataset.action = "restore-board";
      note.append(el("span", undefined, w.deletedBoard(boardName(gone))), back);
      boardsBox.append(note);
    }
    const items = listed();
    if (!items.length) {
      boardsBox.append(el("p", "fft-cmp-empty", w.noBoards));
      return;
    }
    const list = el("ul", "fft-cmp-list fft-cmp-saved-boards");
    list.setAttribute("aria-label", w.myBoards);
    for (const b of items) {
      const item = el("li", "fft-cmp-item");
      item.dataset.board = b.id;
      const name = boardName(b);
      const text = el("span", "fft-cmp-name");
      text.append(el("span", undefined, name), el("span", "fft-cmp-when", `${dateOf(b.savedAt)} · ${w.cardCount(b.spec.widgets.filter((c) => !c.section).length)}`));
      item.append(text);
      if (b.id === storedId) {
        item.setAttribute("aria-current", "true");
        item.append(el("span", "fft-cmp-kind", w.openNow));
      } else {
        const open = button(w.openBoard, () => openBoard(b), w.openBoardOf(name));
        open.dataset.action = "open-board";
        item.append(open);
      }
      if (store.removeBoard) {
        const del = button(w.deleteBoard, () => void deleteBoard(b), w.deleteBoardOf(name));
        del.dataset.action = "delete-board";
        item.append(del);
      }
      list.append(item);
    }
    boardsBox.append(list);
  }
  /** Shows a stored board: it becomes the one edited, with its own undo history. */
  function openBoard(saved: SavedBoard, announce = true) {
    board = { columns: 2, ...saved.spec, id: saved.id, widgets: [...saved.spec.widgets] };
    storedId = saved.id;
    history.length = 0;
    writeAddress();
    if (announce) say(w.openedBoard(boardName(saved)));
    paint();
    paintBoards();
  }
  /** A blank board under an id no saved one has; nothing is stored until it gets a card or a name. */
  function startNew() {
    storedId = undefined;
    board = { id: freeId("dashboard"), title: "", columns: 2, widgets: [] };
    history.length = 0;
    writeAddress();
    say(w.startedBoard);
    paint();
    paintBoards();
    panel.querySelector<HTMLInputElement>('input[data-meta="title"]')?.focus();
  }
  async function deleteBoard(saved: SavedBoard) {
    if (!store.removeBoard) return;
    await store.removeBoard(saved.id);
    lastDeleted = saved;
    say(w.deletedBoard(boardName(saved)));
    // The open board deleted: carry on with a blank one, so nothing writes it back by accident.
    if (saved.id === storedId) {
      storedId = undefined;
      board = { id: freeId("dashboard"), title: "", columns: 2, widgets: [] };
      history.length = 0;
      writeAddress();
      paint();
    }
    await refreshBoards();
    boardsBox.querySelector<HTMLButtonElement>('[data-action="restore-board"]')?.focus();
  }
  async function restore(saved: SavedBoard) {
    await store.saveBoard(saved);
    lastDeleted = undefined;
    say(w.restoredBoard(boardName(saved)));
    // Deleted while open, then restored before anything else was made: it is open again.
    const untouched = !storedId && !board.title && board.widgets.length === 0;
    await refreshBoards();
    if (untouched) openBoard(saved, false);
  }

  function paintTray() {
    tray.replaceChildren(boardsBox);
    paintBoards();
    tray.append(el("h3", undefined, w.myCharts));
    if (saved.length) {
      const list = el("ul", "fft-cmp-list");
      for (const chart of saved) list.append(trayItem(chart.spec, `saved:${chart.id}`));
      tray.append(list);
    } else tray.append(el("p", "fft-cmp-empty", w.noSaved));
    const examples = Object.entries(options.examples ?? {});
    if (examples.length) {
      tray.append(el("h3", undefined, w.examples));
      const list = el("ul", "fft-cmp-list");
      for (const [key, spec] of examples) list.append(trayItem(spec, `example:${key}`));
      tray.append(list);
    }
  }

  // ---- The board: name, columns, cards, filters, publish ----
  let dragging: { kind: "chart"; spec: WidgetSpec } | { kind: "card"; index: number } | undefined;
  const dropAt = (index: number) => {
    const what = dragging;
    dragging = undefined;
    if (!what) return;
    if (what.kind === "chart") add(what.spec, index);
    else move(what.index, what.index < index ? index - 1 : index);
  };

  function paintBoard() {
    panel.replaceChildren();
    // Name.
    panel.append(el("h3", undefined, w.board));
    const meta = el("div", "fft-cmp-meta");
    for (const [key, label, hint] of [
      ["title", w.boardTitle, w.untitledBoard],
      ["subtitle", w.boardSubtitle, ""],
      ["asOf", w.asOf, w.asOfHint],
    ] as const) {
      const wrap = el("label");
      const input = el("input", "fft-cmp-input");
      input.type = "text";
      input.value = String(board[key] ?? "");
      if (hint) input.placeholder = hint;
      input.dataset.meta = key;
      input.addEventListener("change", () => setMeta({ [key]: input.value }));
      wrap.append(label, input);
      meta.append(wrap);
    }
    panel.append(meta);

    // Columns.
    const cols = el("div", "fft-cmp-row fft-cmp-columns");
    cols.setAttribute("role", "group");
    cols.setAttribute("aria-label", w.columns);
    cols.append(el("span", "fft-cmp-kind", w.columns));
    for (let n = 1; n <= 4; n++) {
      const b = button(String(n), () => setColumns(n));
      b.setAttribute("aria-pressed", String(columns() === n));
      cols.append(b);
    }
    panel.append(cols);

    // Cards.
    panel.append(el("h3", undefined, w.cards));
    const list = el("ol", "fft-cmp-list fft-cmp-cards");
    list.setAttribute("aria-label", w.cards);
    list.addEventListener("dragover", (event) => {
      event.preventDefault();
      list.dataset.over = "";
    });
    list.addEventListener("dragleave", () => delete list.dataset.over);
    list.addEventListener("drop", (event) => {
      event.preventDefault();
      delete list.dataset.over;
      dropAt(board.widgets.length);
    });
    if (!board.widgets.length) list.append(el("li", "fft-cmp-empty", w.empty));
    board.widgets.forEach((cell, i) => {
      const item = el("li", "fft-cmp-item fft-cmp-card");
      item.draggable = true;
      item.dataset.index = String(i);
      const name = nameOf(cell, w.untitledChart);
      if (cell.section !== undefined) {
        item.dataset.section = "";
        const input = el("input", "fft-cmp-input fft-cmp-name");
        input.value = cell.section;
        input.setAttribute("aria-label", w.section);
        input.addEventListener("change", () => commit({ ...board, widgets: board.widgets.map((c, k) => (k === i ? { ...c, section: input.value || w.sectionName } : c)) }));
        item.append(input);
      } else {
        item.append(el("span", "fft-cmp-name", name));
        const span = el("select", "fft-cmp-select");
        span.setAttribute("aria-label", `${w.width}: ${name}`);
        for (let n = 1; n <= columns(); n++) {
          const option = el("option", undefined, String(n));
          option.value = String(n);
          span.append(option);
        }
        span.value = String(Math.min(cell.span ?? 1, columns()));
        span.addEventListener("change", () => setSpan(i, Number(span.value)));
        item.append(span);
      }
      const up = button("↑", () => move(i, i - 1), `${w.moveUp}: ${name}`);
      up.disabled = i === 0;
      const down = button("↓", () => move(i, i + 1), `${w.moveDown}: ${name}`);
      down.disabled = i === board.widgets.length - 1;
      item.append(up, down, button("×", () => remove(i), `${w.remove}: ${name}`));
      item.addEventListener("dragstart", (event) => {
        dragging = { kind: "card", index: i };
        item.dataset.dragging = "";
        (event as DragEvent).dataTransfer?.setData("text/plain", `card:${i}`);
      });
      item.addEventListener("dragend", () => {
        delete item.dataset.dragging;
        dragging = undefined;
      });
      item.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.stopPropagation();
        item.dataset.over = "";
      });
      item.addEventListener("dragleave", () => delete item.dataset.over);
      item.addEventListener("drop", (event) => {
        event.preventDefault();
        event.stopPropagation();
        delete item.dataset.over;
        dropAt(i);
      });
      list.append(item);
    });
    panel.append(list, button(w.addSection, () => addSection()));

    // Filters, each with its reach.
    panel.append(el("h3", undefined, w.filters));
    const filters = el("div", "fft-cmp-list fft-cmp-filters");
    filters.setAttribute("role", "group");
    filters.setAttribute("aria-label", w.filters);
    panel.append(filters);
    void filterChoices().then((choices) => {
      if (!filters.isConnected) return;
      filters.replaceChildren();
      if (!choices.length) filters.append(el("p", "fft-cmp-empty", w.noFilters));
      // The widest reach first (and any set), five in view; Show all for the rest.
      const shown = allFilters ? choices : choices.filter((choice, i) => i < FILTERS_SHOWN || choice.on);
      const rest = choices.length - shown.length;
      for (const choice of shown) {
        const row = el("label", "fft-cmp-filter");
        const box = el("input");
        box.type = "checkbox";
        box.checked = choice.on;
        box.dataset.field = choice.field;
        box.addEventListener("change", () => setFilter(choice.field, box.checked));
        row.append(box, el("span", undefined, choice.label), el("span", "fft-cmp-reach", w.reach(choice.reach, choice.total)));
        filters.append(row);
      }
      if (rest > 0 || allFilters) {
        const toggle = button(allFilters ? sw.showFewer : sw.showAll(rest), () => {
          allFilters = !allFilters;
          paintBoard();
        });
        toggle.dataset.filters = allFilters ? "fewer" : "all";
        filters.append(toggle);
      }
    });

    // Publish, in its own section after the preview.
    publishWrap.replaceChildren(el("h3", undefined, w.publish));
    // Nothing to publish yet: no embed code or page for an empty board, one line saying what unlocks them.
    if (!hasCards()) {
      publishWrap.append(el("p", "fft-cmp-empty fft-cmp-publish-empty", w.publishEmpty));
      return;
    }
    const json = JSON.stringify(board, null, 2);
    const code = (title: string, text: string, file?: string) => {
      const section = el("div", "fft-cmp-field");
      const head = el("div", "fft-cmp-row");
      head.append(el("span", undefined, title));
      const copy = button(w.copy, () => {
        void win?.navigator.clipboard?.writeText(text).then(() => {
          copy.textContent = w.copied;
          setTimeout(() => (copy.textContent = w.copy), 1597);
        });
      });
      head.append(copy);
      if (file && win?.URL?.createObjectURL) {
        head.append(
          button(w.download, () => {
            const href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
            const a = el("a");
            a.href = href;
            a.download = file;
            doc.body.append(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(href), 1000);
          }),
        );
      }
      const pre = el("pre", "fft-cmp-pre", text);
      pre.tabIndex = 0;
      pre.setAttribute("aria-label", title);
      pre.dataset.code = file ? "json" : "embed";
      section.append(head, pre);
      return section;
    };
    const open = el("a", "fft-cmp-button", w.openPage);
    open.href = options.pageHref?.(board) ?? boardToHash(board, { view: "1" });
    open.target = "_blank";
    open.rel = "noopener";
    // The frame embed sizes itself in any page, where the script embed needs the page to run the library.
    const frame = code(wordsFor(options.locale ?? doc.documentElement.lang).dw2.embedFrame, frameEmbed("board", board, options.embedHref ?? "embed.html", board.title || w.untitledBoard));
    frame.querySelector("pre")?.setAttribute("data-code", "frame");
    const fold = (key: string, label: string, ...content: HTMLElement[]) => {
      const box = el("details", "fft-cmp-more");
      box.dataset.disclosure = key;
      box.open = foldOpen.has(key);
      box.addEventListener("toggle", () => (box.open ? foldOpen.add(key) : foldOpen.delete(key)));
      box.append(el("summary", undefined, label), ...content);
      return box;
    };
    publishWrap.append(frame, open, fold("embeds", sw.otherEmbeds, code(w.embed, dashboardEmbed(board, liteBundleUrl(doc, options.bundleHref)))), fold("json", w.json, code(w.json, json, `${board.id ?? "dashboard"}.json`)));
  }

  // ---- The live preview ----
  function paintPreview() {
    preview?.destroy();
    previewEl.replaceChildren();
    previewWrap.replaceChildren(el("h3", undefined, w.preview), previewEl);
    // An empty board draws nothing: say what fills it instead of leaving a blank panel.
    if (!hasCards()) {
      preview = undefined;
      previewEl.append(el("p", "fft-cmp-preview-empty", w.previewEmpty));
      ready = Promise.resolve();
      return;
    }
    preview = createDashboard(previewEl, board, { fetch: options.fetch });
    const style = options.previewStyle?.();
    ready = style ? preview.ready.then(() => preview?.setOverride({ style })) : preview.ready;
  }

  function paint() {
    paintBoard();
    paintPreview();
  }

  // ---- Actions ----
  const clampSpan = (cell: DashboardCell, cols: number): DashboardCell => (cell.span && cell.span > cols ? { ...cell, span: cols } : cell);
  function add(chart: WidgetSpec, at = board.widgets.length) {
    const widgets = [...board.widgets];
    widgets.splice(Math.max(0, Math.min(at, widgets.length)), 0, { spec: chart });
    commit({ ...board, widgets }, w.added(chart.title || chart.id || w.untitledChart));
  }
  function addSection(title = w.sectionName, at = board.widgets.length) {
    const widgets = [...board.widgets];
    widgets.splice(Math.max(0, Math.min(at, widgets.length)), 0, { section: title });
    commit({ ...board, widgets }, w.added(title));
  }
  function move(from: number, to: number) {
    if (from < 0 || from >= board.widgets.length) return;
    const place = Math.max(0, Math.min(to, board.widgets.length - 1));
    if (place === from) return;
    const widgets = [...board.widgets];
    const [cell] = widgets.splice(from, 1);
    widgets.splice(place, 0, cell as DashboardCell);
    commit({ ...board, widgets }, w.moved(nameOf(cell as DashboardCell, w.untitledChart), place + 1));
    // Keep the keyboard on the card that moved.
    (panel.querySelector<HTMLElement>(`.fft-cmp-card[data-index="${place}"] button:not(:disabled)`) ?? undefined)?.focus();
  }
  function remove(index: number) {
    const cell = board.widgets[index];
    if (!cell) return;
    commit({ ...board, widgets: board.widgets.filter((_, i) => i !== index) }, w.removed(nameOf(cell, w.untitledChart)));
  }
  function setSpan(index: number, span: number) {
    const cols = columns();
    const value = Math.max(1, Math.min(cols, Math.round(span)));
    commit({ ...board, widgets: board.widgets.map((cell, i) => (i === index ? (value === 1 ? (({ span: _drop, ...rest }) => rest)(cell) : { ...cell, span: value }) : cell)) });
  }
  function setColumns(n: number) {
    const cols = Math.max(1, Math.min(4, Math.round(n)));
    commit({ ...board, columns: cols, widgets: board.widgets.map((cell) => clampSpan(cell, cols)) });
  }
  function setMeta(meta: { title?: string; subtitle?: string; asOf?: string }) {
    const next: DashboardSpec = { ...board };
    for (const [key, value] of Object.entries(meta) as [keyof typeof meta, string | undefined][]) {
      if (value === undefined) continue;
      if (value.trim()) next[key] = value.trim();
      else delete next[key];
    }
    // The id follows the title, but never takes another saved dashboard's.
    if (meta.title !== undefined && meta.title.trim()) next.id = freeId(slugOf(meta.title));
    commit(next);
  }
  function setFilter(field: string, on: boolean) {
    const filters = (board.filters ?? []).filter((f) => f.field !== field);
    commit({ ...board, filters: on ? [...filters, { field, label: fieldLabel(field) }] : filters });
  }

  /** The raw rows of a card, once per spec. */
  const rowsOf = (spec: WidgetSpec) => {
    const key = JSON.stringify(spec.data);
    let rows = fieldsCache.get(key);
    if (!rows) {
      rows = runPipeline({ data: spec.data, view: { type: "table" } } as WidgetSpec, { fetch: options.fetch }).catch(() => [] as Row[]);
      fieldsCache.set(key, rows);
    }
    return rows;
  };
  async function filterChoices(): Promise<FilterChoice[]> {
    const cards = board.widgets.filter((cell) => cell.spec);
    const rowsPerCard = await Promise.all(cards.map((cell) => rowsOf(cell.spec as WidgetSpec)));
    const reach = new Map<string, number>();
    rowsPerCard.forEach((rows) => {
      const fields = new Set(rows.flatMap((row) => Object.keys(row)));
      for (const field of fields) if (filterable(rows, field)) reach.set(field, (reach.get(field) ?? 0) + 1);
    });
    const on = new Set((board.filters ?? []).map((f) => f.field));
    return [...reach.entries()]
      .filter(([field, n]) => n >= 2 || on.has(field))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([field, n]) => ({ field, label: fieldLabel(field), reach: n, total: cards.length, on: on.has(field) }));
  }
  function undo(): boolean {
    const last = history.pop();
    if (!last) return false;
    board = JSON.parse(last) as DashboardSpec;
    say(w.undo);
    persist();
    paint();
    return true;
  }
  async function save(): Promise<SavedBoard> {
    const savedBoard: SavedBoard = { id: board.id ?? slugOf(board.title || "dashboard"), spec: board, savedAt: new Date().toISOString() };
    await store.saveBoard(savedBoard);
    return savedBoard;
  }

  const onKey = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== "z" || !(event.metaKey || event.ctrlKey) || event.shiftKey) return;
    const active = doc.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
    if (!root.contains(active) && active !== doc.body) return;
    if (undo()) event.preventDefault();
  };
  doc.addEventListener("keydown", onKey);

  // ---- Start: what is saved, the board named by the address, then the first paint ----
  /** Which stored board the opening one is: the one the address names, the same id, or none (a fresh board). */
  const settle = () => {
    if (!options.board && !fromAddress.spec && fromAddress.id) {
      const stored = boardsList.find((b) => b.id === fromAddress.id);
      if (stored) {
        board = { columns: 2, ...stored.spec, id: stored.id, widgets: [...stored.spec.widgets] };
        storedId = stored.id;
        return;
      }
    }
    const id = board.id ?? "dashboard";
    if (options.board || fromAddress.spec) {
      if (boardsList.some((b) => b.id === id)) storedId = id;
    } else if (boardsList.some((b) => b.id === id)) {
      // A fresh board never takes a saved one's id, or its first change would overwrite that dashboard.
      board = { ...board, id: freeId("dashboard") };
    }
  };
  const start = async () => {
    try {
      saved = await store.charts();
      boardsList = await store.boards();
    } catch {
      // A host store that failed: an empty tray, the composer still works.
    }
    settle();
    paintTray();
    paint();
  };
  const charts = store.charts();
  const boardsNow = store.boards();
  if (Array.isArray(charts) && Array.isArray(boardsNow)) {
    saved = charts;
    boardsList = boardsNow;
    settle();
    paintTray();
    paint();
  } else void start();

  return {
    root,
    get spec() {
      return board;
    },
    get ready() {
      return ready;
    },
    add,
    addSection,
    move,
    remove,
    setSpan,
    setColumns,
    setMeta,
    setFilter,
    filterChoices,
    undo,
    save,
    async restyle() {
      if (!preview) return;
      ready = preview.setOverride({ style: options.previewStyle?.() ?? { preset: "default" } });
      await ready;
    },
    destroy() {
      doc.removeEventListener("keydown", onKey);
      preview?.destroy();
      root.remove();
    },
  };
}

/** Problems with a composed board, as `validateDashboard` reports them. */
export function checkBoard(spec: DashboardSpec) {
  return validateDashboard(spec);
}
