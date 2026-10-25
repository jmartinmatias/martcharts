/**
 * The editor: a chart from a table in four steps, with no JSON to write.
 *
 *   1. Upload data: drop or paste a CSV, TSV or JSON table, type it, or give an address.
 *   2. Check and describe: labels, formats and the order of the columns.
 *   3. Visualize: pick a chart (the ones that fit the data first), refine it from its own options, annotate it.
 *   4. Publish and embed: the spec, the embed code, a saved copy.
 *
 * The live chart stays in view through every step. Everything is built from the block registry, so a view
 * registered later shows up with its options and nothing here has to change. `createEditor(el, options)` returns
 * a handle; the demo's editor page is a thin shell around it.
 *
 * @module
 */
import { canonicalName } from "../core/aliases.ts";
import { canonicalSpec, canonicalView } from "../core/canonical.ts";
import { formatValue, humanize } from "../core/display.ts";
import { basemapNames } from "../core/geo.ts";
import { fork } from "../core/fork.ts";
import { switchChart } from "../core/guide.ts";
import { describePresets } from "../core/presets.ts";
import { recommendCharts } from "../core/recommend.ts";
import { describeBlocks, getBlock } from "../core/registry.ts";
import type { OptionSchema } from "../core/registry.ts";
import { suggestView } from "../core/suggest.ts";
import type { FieldSpec, FormatSpec, Row, ViewSpec, WidgetSpec } from "../core/types.ts";
import { hasErrors, validateSpec } from "../core/validate.ts";
import type { WidgetAction } from "./export.ts";
import { createPalettePicker } from "./palette-picker.ts";
import { DARK, LIGHT } from "./styles.ts";
import { fieldList } from "./views/shared.ts";
import { createWidget } from "./widget.ts";
import type { Widget } from "./widget.ts";
import { wordsFor, WORDS_EN } from "../core/words.ts";
import { addChartToBoard, localBoardStore } from "./board-store.ts";
import type { BoardStore, SavedBoard, SavedChart } from "./board-store.ts";

/** A dataset offered on the first step: a name and either the text itself or an address to fetch. */
export interface EditorSample {
  label: string;
  text?: string;
  url?: string;
}

/** Options for `createEditor`. */
export interface EditorOptions {
  /** The chart to open with. Default: an empty editor on the data step. */
  spec?: WidgetSpec;
  /** One example spec per view type, drawn small in the chart-type grid (the catalog's specs). Views without one get their name. */
  examples?: Record<string, WidgetSpec>;
  /** Datasets to start from, offered as chips on the data step. */
  samples?: EditorSample[];
  /** `fetch` used for addresses. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Called after every change with the spec as it stands. */
  onChange?(spec: WidgetSpec): void;
  /** Saves the finished chart (the host's store). Without it, charts are saved in the browser's localStorage. */
  save?(spec: WidgetSpec): Promise<void> | void;
  /**
   * Where saved charts and dashboards live, for "My charts" and "Add to dashboard". Default: this browser's
   * localStorage, the same store the composer reads, so a chart added here is waiting there.
   */
  store?: BoardStore;
  /** The composer's address for a board, linked after "Add to dashboard". Default: `composer.html#board=<id>`. */
  composerHref?(boardId: string): string;
  /** The address the `src` embed code points at. Default: `widgets/<id>.json`. */
  srcOf?(spec: WidgetSpec): string;
  /** Keep the step and the spec in the page address, so a chart can be shared by link. Default true in a browser. */
  hash?: boolean;
  /** Toolbar actions on the published chart. Default csv, image, copy and explain. */
  actions?: WidgetAction[];
  /** The editor's language, as a locale ("fr-LU", "de-DE"). Default: the page's own `lang`, then English. */
  locale?: string;
  /** Words to replace, on top of the language's own. */
  strings?: Partial<typeof STRINGS>;
}

/** A live editor on the page. */
export interface Editor {
  /** The editor's outer element. */
  readonly root: HTMLElement;
  /** The spec as it stands, data inlined. */
  readonly spec: WidgetSpec;
  /** The rows the chart draws: the parsed table, columns ordered and hidden ones dropped. */
  readonly rows: Row[];
  /** The current step, 1 to 4. */
  readonly step: 1 | 2 | 3 | 4;
  /** Opens a step. */
  go(step: 1 | 2 | 3 | 4): void;
  /** Replaces the data with a table (CSV, TSV or JSON text), as a drop or a paste would. */
  setData(text: string, name?: string): void;
  /** Replaces the spec (and the data, when inline). */
  setSpec(spec: WidgetSpec): void;
  /** Undoes the last change. Returns false when there is nothing to undo. */
  undo(): boolean;
  /** Removes the editor. */
  destroy(): void;
}

/** Every word the editor shows, in English: the editor's set in the one words module (core/words.ts), which has French and German too. */
export const STRINGS = WORDS_EN.editor;

type Strings = typeof STRINGS;
type Kind = "number" | "category" | "date";
type Step = 1 | 2 | 3 | 4;

interface DataState {
  /** The table as typed or dropped. */
  text: string;
  /** "table" for CSV and TSV text, "json" for a JSON list of records. */
  kind: "table" | "json";
  header: boolean;
  transpose: boolean;
  name?: string;
}

interface Snapshot {
  spec: WidgetSpec;
  order: string[];
  hidden: string[];
}

const DATE = /^\d{4}-\d{2}(-\d{2})?/;
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const GROUPED = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/;
const PREVIEW_ROWS = 50;
const HISTORY = 50;
const HASH_LIMIT = 60_000;
const SESSION_KEY = "martcharts:editor:spec";
/** Fields a table view takes as columns; every other view's field options are found in the schema. */
/** The cell formats a column can take, in the order offered; their names come from the words module. */
const FORMATS = ["number", "currency", "percent", "date", "badge", "bar", "heat", "delta", "spark", "text"] as const;
const DATE_STYLES = ["short", "medium", "long", "day", "month", "year"];
/** View options the Refine form leaves to other places: highlight has its own picker, references and annotations live under Annotate. */
const ELSEWHERE = new Set(["highlight", "reference", "annotations"]);

/** A cell of text as a value: numbers become numbers (grouped ones too), blanks null, the rest stays text. */
function typedCell(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (NUMBER.test(trimmed) && !/^[+-]?0\d/.test(trimmed)) return Number(trimmed);
  if (GROUPED.test(trimmed)) return Number(trimmed.replace(/,/g, ""));
  return text;
}

/** The first list of records inside a parsed JSON value: the value itself, or the first list-valued property, one or two levels down. */
export function rowsFromJson(value: unknown): Row[] | undefined {
  const records = (list: unknown): Row[] | undefined =>
    Array.isArray(list) && list.length > 0 && list.every((item) => item && typeof item === "object" && !Array.isArray(item)) ? (list as Row[]) : undefined;
  const direct = records(value);
  if (direct) return direct;
  if (!value || typeof value !== "object") return undefined;
  for (const inner of Object.values(value as Record<string, unknown>)) {
    const found = records(inner);
    if (found) return found;
  }
  for (const inner of Object.values(value as Record<string, unknown>)) {
    if (inner && typeof inner === "object" && !Array.isArray(inner)) for (const deeper of Object.values(inner as Record<string, unknown>)) {
      const found = records(deeper);
      if (found) return found;
    }
  }
  return undefined;
}

/** The byte order mark some spreadsheet exports start with. */
const BOM = String.fromCharCode(0xfeff);

/**
 * The text as a grid of cells (RFC 4180: quoted cells may hold separators, line breaks and doubled quotes), the
 * separator picked from the first line (comma, semicolon or tab, as the csv source does), every row padded to the widest.
 */
export function gridOf(text: string): string[][] {
  const source = text.startsWith(BOM) ? text.slice(1) : text;
  const firstLine = source.slice(0, source.search(/\r?\n|$/));
  const count = (sep: string) => firstLine.split(sep).length - 1;
  const delimiter = [",", ";", "\t"].reduce((best, sep) => (count(sep) > count(best) ? sep : best), ",");
  const grid: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i] as string;
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"' && cell === "") quoted = true;
    else if (char === delimiter) {
      record.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      record.push(cell);
      grid.push(record);
      record = [];
      cell = "";
    } else cell += char;
  }
  if (cell !== "" || record.length) {
    record.push(cell);
    grid.push(record);
  }
  const width = Math.max(0, ...grid.map((cells) => cells.length));
  for (const cells of grid) while (cells.length < width) cells.push("");
  return grid;
}

/** Rows from a table of text, with or without a header row, transposed or not. */
export function rowsFromTable(text: string, options: { header?: boolean; transpose?: boolean } = {}): Row[] {
  let grid = gridOf(text).filter((cells) => cells.some((cell) => cell.trim() !== ""));
  if (options.transpose) grid = (grid[0] ?? []).map((_, i) => grid.map((cells) => cells[i] ?? ""));
  if (grid.length === 0) return [];
  const header = options.header !== false;
  const names = (header ? (grid[0] ?? []) : (grid[0] ?? []).map((_, i) => `column${i + 1}`)).map((name, i) => name.trim() || `column${i + 1}`);
  const seen = new Map<string, number>();
  const unique = names.map((name) => {
    const n = seen.get(name) ?? 0;
    seen.set(name, n + 1);
    return n === 0 ? name : `${name} ${n + 1}`;
  });
  return (header ? grid.slice(1) : grid).map((cells) => Object.fromEntries(unique.map((name, i) => [name, typedCell(cells[i] ?? "")])));
}

/** What a column holds, from every present value: numbers, dates (ISO-like text), or text. */
export function columnKind(rows: Row[], field: string): Kind {
  let numbers = 0;
  let dates = 0;
  let present = 0;
  for (const row of rows) {
    const value = row[field];
    if (value === null || value === undefined || value === "") continue;
    present++;
    if (typeof value === "number") numbers++;
    else if (typeof value === "string" && DATE.test(value)) dates++;
  }
  if (present > 0 && numbers === present) return "number";
  if (present > 0 && dates === present) return "date";
  return "category";
}

/** Every field in the rows, in order of first appearance. */
function fieldsOf(rows: Row[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) for (const key of Object.keys(row)) seen.add(key);
  return [...seen];
}

const toBase64Url = (text: string) => btoa(unescape(encodeURIComponent(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (text: string) => decodeURIComponent(escape(atob(text.replace(/-/g, "+").replace(/_/g, "/"))));

/** The step and spec in a page address, when it carries them. */
export function readHash(hash: string, session?: Storage): { step?: Step; spec?: WidgetSpec } {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const step = Number(params.get("step"));
  const out: { step?: Step; spec?: WidgetSpec } = {};
  if (step >= 1 && step <= 4) out.step = step as Step;
  const encoded = params.get("spec");
  try {
    if (encoded === "session") {
      const stored = session?.getItem(SESSION_KEY);
      if (stored) out.spec = JSON.parse(stored) as WidgetSpec;
    } else if (encoded) out.spec = JSON.parse(fromBase64Url(encoded)) as WidgetSpec;
  } catch {
    // A hand-edited address: start fresh.
  }
  return out;
}

/** The address for a step and spec: the spec in base64url, or kept in sessionStorage when it is too long for an address. */
export function writeHash(step: Step, spec: WidgetSpec | undefined, session?: Storage): string {
  if (!spec) return `#step=${step}`;
  const json = JSON.stringify(spec);
  const encoded = toBase64Url(json);
  if (encoded.length <= HASH_LIMIT) return `#step=${step}&spec=${encoded}`;
  try {
    session?.setItem(SESSION_KEY, json);
  } catch {
    // No session storage: the address carries the step only.
    return `#step=${step}`;
  }
  return `#step=${step}&spec=session`;
}

/** The three ways to put the chart on a page. */
export function embedCodes(spec: WidgetSpec, src: string): { inline: string; src: string; js: string } {
  const json = JSON.stringify(spec, null, 2);
  return {
    inline: `<script src="martcharts.iife.js"></script>\n<fft-widget actions="csv image">\n  <script type="application/json">\n${json.replace(/<\/script/gi, "<\\/script")}\n  </script>\n</fft-widget>`,
    src: `<script src="martcharts.iife.js"></script>\n<fft-widget src="${src}" actions="csv image"></fft-widget>`,
    js: `import { createWidget } from "martcharts";\n\ncreateWidget(document.querySelector("#chart"), ${json});`,
  };
}

/** A tick label such as 20K, €1.2M or 45% back to a number, for reading a chart's axis. */
export function parseTick(text: string): number | null {
  const match = text.replace(/\s|,/g, "").match(/^-?[^\d.]*(-?\d+(?:\.\d+)?)([KMBT])?%?/i);
  if (!match || match[1] === undefined) return null;
  const scale = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[(match[2] ?? "").toLowerCase()] ?? 1;
  const value = Number(match[1]) * scale;
  const negative = /^[^\d]*[−-]/.test(text);
  return (negative ? -Math.abs(value) : value) / (text.includes("%") ? 100 : 1);
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

let count = 0;

/**
 * Draws the editor inside `target` and returns a handle.
 *
 * @example
 * const editor = createEditor(document.querySelector("#editor")!, {
 *   examples: catalogSpecs,
 *   samples: [{ label: "Tickets by team", url: "/examples/tickets.csv" }],
 *   onChange: (spec) => console.log(spec),
 * });
 */
export function createEditor(target: HTMLElement, options: EditorOptions = {}): Editor {
  const doc = target.ownerDocument;
  const win = doc.defaultView;
  ensureEditorStyles(doc);
  const strings: Strings = { ...wordsFor(options.locale ?? doc.documentElement.lang).editor, ...options.strings } as Strings;
  const t = <K extends keyof Strings>(key: K): Strings[K] => strings[key];
  const fetcher = options.fetch ?? win?.fetch?.bind(win) ?? globalThis.fetch;
  const useHash = options.hash ?? Boolean(win && win.location);
  const session = (() => {
    try {
      return win?.sessionStorage;
    } catch {
      return undefined;
    }
  })();
  const local = (() => {
    try {
      return win?.localStorage;
    } catch {
      return undefined;
    }
  })();
  const id = ++count;
  // Saved charts and dashboards: the host's store, else this browser's, which the composer reads too.
  const store: BoardStore = options.store ?? localBoardStore(local);
  const cw = wordsFor(options.locale ?? doc.documentElement.lang).composer;
  let savedCache: SavedChart[] = [];
  let boardsCache: SavedBoard[] = [];
  const refreshSaved = async () => {
    try {
      // A synchronous store (this browser's) answers at once, so the next paint already lists what was just saved.
      const [charts, boards] = [store.charts(), store.boards()];
      if (Array.isArray(charts) && Array.isArray(boards)) [savedCache, boardsCache] = [charts, boards];
      else [savedCache, boardsCache] = await Promise.all([charts, boards]);
    } catch {
      // A host store that failed: show nothing saved rather than break the editor.
    }
  };

  // ---- State ----
  let data: DataState = { text: "", kind: "table", header: true, transpose: false };
  /** The parsed table, every column. */
  let baseRows: Row[] = [];
  /** Column order and hidden columns, both over baseRows' fields. */
  let order: string[] = [];
  let hidden: string[] = [];
  let spec: WidgetSpec = { data: { type: "inline", rows: [] }, view: { type: "table" } };
  let step: Step = 1;
  let tab = 0;
  const history: Snapshot[] = [];
  let preview: Widget | undefined;
  let published: Widget | undefined;
  let paletteCleanup: (() => void) | undefined;
  const cleanups: (() => void)[] = [];

  // ---- Elements ----
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (label: string, onClick: (b: HTMLButtonElement) => void, className = "fft-ed-button"): HTMLButtonElement => {
    const b = el("button", className, label);
    b.type = "button";
    b.addEventListener("click", () => onClick(b));
    return b;
  };
  const field = (label: string, control: HTMLElement, hint?: string): HTMLLabelElement => {
    const wrap = el("label", "fft-ed-field");
    wrap.append(el("span", "fft-ed-field-label", label), control);
    if (hint) wrap.append(el("span", "fft-ed-hint", hint));
    return wrap;
  };
  const segmented = (name: string, values: { value: string; label: string; title?: string }[], current: string, onPick: (value: string) => void): HTMLElement => {
    const group = el("div", "fft-ed-segmented");
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", name);
    for (const { value, label, title } of values) {
      const b = button(label, () => {
        for (const other of group.querySelectorAll("button")) other.setAttribute("aria-checked", String(other === b));
        onPick(value);
      }, "fft-ed-segment");
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(value === current));
      if (title) b.title = title;
      group.append(b);
    }
    return group;
  };
  const toggle = (label: string, on: boolean, onChange: (on: boolean) => void): HTMLElement => {
    const wrap = el("span", "fft-ed-switch-wrap");
    const b = button("", () => {
      const next = b.getAttribute("aria-checked") !== "true";
      b.setAttribute("aria-checked", String(next));
      onChange(next);
    }, "fft-ed-switch");
    b.setAttribute("role", "switch");
    b.setAttribute("aria-checked", String(on));
    b.setAttribute("aria-label", label);
    wrap.append(b, el("span", "fft-ed-switch-label", label));
    return wrap;
  };
  const say = (b: HTMLButtonElement, text: string, failed = false) => {
    const was = b.textContent;
    b.textContent = text;
    b.toggleAttribute("data-failed", failed);
    setTimeout(() => {
      b.textContent = was;
      b.removeAttribute("data-failed");
    }, 1597);
  };
  const copyText = async (text: string, b: HTMLButtonElement) => {
    try {
      await win?.navigator.clipboard.writeText(text);
      say(b, t("copied"));
    } catch {
      say(b, t("saveFailed"), true);
    }
  };

  const root = el("section", "fft-editor");
  root.setAttribute("aria-label", t("editorName"));
  const stepper = el("ol", "fft-ed-stepper");
  stepper.setAttribute("aria-label", t("stepsName"));
  const compact = el("p", "fft-ed-step-compact");
  const live = el("p", "fft-ed-live");
  live.setAttribute("aria-live", "polite");
  live.className = "fft-ed-live fft-sr-only";
  const main = el("div", "fft-ed-main");
  const panel = el("div", "fft-ed-panel");
  const nav = el("div", "fft-ed-nav");
  const backButton = button(t("back"), () => go((step - 1) as Step));
  const nextButton = button(t("proceed"), () => go((step + 1) as Step), "fft-ed-button fft-ed-primary");
  const undoButton = button(t("undo"), () => undo());
  nav.append(backButton, undoButton, nextButton);
  const aside = el("aside", "fft-ed-aside");
  aside.setAttribute("aria-label", t("liveChart"));
  const previewSlot = el("div", "fft-ed-preview");
  const issuesList = el("ul", "fft-ed-issues");
  aside.append(previewSlot, issuesList);
  main.append(panel, aside);
  root.append(stepper, compact, live, main, nav);
  target.append(root);

  for (const [i, name] of t("steps").entries()) {
    const item = el("li");
    const b = button(name, () => go((i + 1) as Step), "fft-ed-step");
    b.dataset.step = String(i + 1);
    b.prepend(el("span", "fft-ed-step-number", String(i + 1)));
    item.append(b);
    stepper.append(item);
  }

  // ---- Derived ----
  const fields = () => fieldsOf(baseRows);
  const shownFields = () => order.filter((f) => !hidden.includes(f));
  const rows = (): Row[] => {
    const shown = shownFields();
    return baseRows.map((row) => Object.fromEntries(shown.map((f) => [f, row[f] ?? null])));
  };
  const kinds = () => new Map(fields().map((f) => [f, columnKind(baseRows, f)]));
  const labelOf = (f: string) => spec.fields?.[f]?.label ?? humanize(f);
  const viewOptions = () => getBlock("view", spec.view.type).options;
  const categoryField = (): string | undefined => {
    const view = spec.view;
    for (const [name, option] of Object.entries(viewOptions())) {
      const value = view[canonicalName(view.type, name)] ?? view[name];
      if (option.type === "field" && option.kind === "category" && typeof value === "string") return value;
    }
    for (const [name, option] of Object.entries(viewOptions())) {
      const value = view[canonicalName(view.type, name)] ?? view[name];
      if (option.type === "field" && typeof value === "string" && option.kind !== "number") return value;
    }
    return undefined;
  };
  /** The spec with any key readable: the words around a chart (source, byline) may be newer than the typed spec. */
  const loose = (): Record<string, unknown> => spec as unknown as Record<string, unknown>;
  const seriesOption = (): string | undefined => Object.entries(viewOptions()).find(([, option]) => option.type === "fields")?.[0];
  // Options by their canonical names: the schema keeps the names renderers read (a dot's `values`), the form shows and
  // writes the canonical one (`value`), and a spec in either spelling opens with its fields filled.
  /** An option's canonical name on the current view. */
  const keyOf = (name: string) => canonicalName(spec.view.type, name);
  /** An option's value, whichever spelling the spec used. */
  const readOpt = (name: string): unknown => spec.view[keyOf(name)] ?? spec.view[name];
  /** A view patch that writes an option under its canonical name and drops the older spelling. */
  const putOpt = (name: string, value: unknown): Record<string, unknown> => {
    const key = keyOf(name);
    return key === name ? { [name]: value } : { [key]: value, [name]: null };
  };

  // ---- History and commits ----
  const snapshot = (): Snapshot => ({ spec: JSON.parse(JSON.stringify(spec)) as WidgetSpec, order: [...order], hidden: [...hidden] });
  const remember = () => {
    history.push(snapshot());
    if (history.length > HISTORY) history.shift();
    undoButton.disabled = history.length === 0;
  };
  /** Changes the spec (merge patch rules), keeps the step before the change, and redraws. */
  const commit = (patch: Record<string, unknown>, { paint: repaint = false }: { paint?: boolean } = {}) => {
    remember();
    spec = fork(spec, patch);
    sync({ paint: repaint });
  };
  /** The rows into the spec, the preview redrawn, the address and the host told. */
  const sync = ({ paint: repaint = false }: { paint?: boolean } = {}) => {
    spec = { ...spec, data: { type: "inline", rows: rows() } };
    void draw();
    if (useHash && win) {
      const next = writeHash(step, baseRows.length ? spec : undefined, session);
      if (win.location.hash !== next) win.history.replaceState(null, "", next);
    }
    options.onChange?.(spec);
    if (repaint) paint();
  };
  const undo = (): boolean => {
    const last = history.pop();
    if (!last) return false;
    spec = last.spec;
    order = last.order;
    hidden = last.hidden;
    undoButton.disabled = history.length === 0;
    sync({ paint: true });
    return true;
  };

  // ---- The live chart ----
  async function draw() {
    const current = rows();
    const issues = validateSpec(spec, current);
    issuesList.replaceChildren();
    const errors = issues.filter((issue) => issue.level === "error");
    if (errors.length) {
      issuesList.append(el("li", "fft-ed-issues-title", t("problems")));
      for (const issue of errors) issuesList.append(el("li", "fft-ed-issue", `${issue.path}: ${issue.message}`));
    }
    if (!current.length) {
      preview?.destroy();
      preview = undefined;
      previewSlot.replaceChildren(el("p", "fft-ed-empty", t("noData")));
      return;
    }
    if (hasErrors(issues)) return;
    if (!preview) {
      previewSlot.replaceChildren();
      preview = createWidget(previewSlot, spec, { actions: ["explain"] });
    } else await preview.setSpec(spec);
    await preview.ready;
    wireLegend();
    if (step === 4 && published) await published.setSpec(spec);
  }

  // Direct manipulation: a click on a mark highlights its category; a click on a legend entry drops that series.
  const onSelect = (event: Event) => {
    const detail = (event as CustomEvent<{ row: Row }>).detail;
    const key = categoryField();
    if (!key || !("highlight" in viewOptions()) || !detail?.row) return;
    const value = String(detail.row[key]);
    const picked = fieldList(spec.view.highlight);
    const next = picked.includes(value) ? picked.filter((v) => v !== value) : [...picked, value];
    commit({ view: { highlight: next.length ? next : null } }, { paint: step === 3 && tab === 1 });
  };
  previewSlot.addEventListener("fft-select", onSelect);
  function wireLegend() {
    const option = seriesOption();
    if (!option) return;
    const series = fieldList(readOpt(option));
    if (series.length < 2) return;
    previewSlot.querySelectorAll<HTMLElement>(".fft-legend li").forEach((item, i) => {
      if (i >= series.length || item.dataset.edWired) return;
      item.dataset.edWired = "";
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.title = t("legendHint");
      const drop = () => {
        const rest = series.filter((_, k) => k !== i);
        if (rest.length) commit({ view: putOpt(option, rest.length === 1 ? rest[0] : rest) }, { paint: step === 3 && tab === 1 });
      };
      item.addEventListener("click", drop);
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          drop();
        }
      });
    });
  }
  // Dragging a text annotation: it snaps to the nearest category tick; its height follows the pointer between value ticks.
  const onPointerDown = (event: PointerEvent) => {
    const note = (event.target as Element | null)?.closest<SVGElement>("[data-annotation]");
    const svg = note?.closest("svg");
    if (!note || !svg || !Array.isArray(spec.view.annotations)) return;
    const index = Number(note.dataset.annotation);
    const key = categoryField() ?? (typeof spec.view.x === "string" ? (spec.view.x as string) : undefined);
    if (!key || !Number.isFinite(index)) return;
    event.preventDefault();
    const ticks = [...svg.querySelectorAll<SVGTextElement>(".fft-tick-x")].map((tick) => ({ x: tick.getBoundingClientRect().left + tick.getBoundingClientRect().width / 2, text: tick.getAttribute("aria-label") ?? tick.textContent ?? "" }));
    const yTicks = [...svg.querySelectorAll<SVGTextElement>(".fft-tick-y")].map((tick) => ({ y: tick.getBoundingClientRect().top + tick.getBoundingClientRect().height / 2, value: parseTick(tick.textContent ?? "") })).filter((tick): tick is { y: number; value: number } => tick.value !== null);
    const current = rows();
    const valueFor = (text: string) => current.find((row) => labelMatches(row[key], text))?.[key];
    let pending: Record<string, unknown> | undefined;
    const move = (e: PointerEvent) => {
      const nearest = ticks.reduce<{ x: number; text: string } | undefined>((best, tick) => (!best || Math.abs(tick.x - e.clientX) < Math.abs(best.x - e.clientX) ? tick : best), undefined);
      const x = nearest ? valueFor(nearest.text) : undefined;
      let y: number | undefined;
      if (yTicks.length >= 2) {
        const [a, b] = [yTicks[0] as { y: number; value: number }, yTicks[yTicks.length - 1] as { y: number; value: number }];
        if (a.y !== b.y) y = Math.round((a.value + ((e.clientY - a.y) * (b.value - a.value)) / (b.y - a.y)) * 100) / 100;
      }
      pending = { ...(x !== undefined ? { x } : {}), ...(y !== undefined ? { y } : {}) };
      note.setAttribute("data-dragging", "");
    };
    const up = () => {
      doc.removeEventListener("pointermove", move);
      doc.removeEventListener("pointerup", up);
      note.removeAttribute("data-dragging");
      if (!pending) return;
      const notes = (spec.view.annotations as Record<string, unknown>[]).map((n, i) => (i === index ? { ...n, ...pending } : n));
      commit({ view: { annotations: notes } }, { paint: step === 3 && tab === 2 });
    };
    doc.addEventListener("pointermove", move);
    doc.addEventListener("pointerup", up);
  };
  const labelMatches = (value: unknown, text: string) => String(value) === text || formatValue(value, spec.fields?.[categoryField() ?? ""]?.format, spec.locale) === text;
  previewSlot.addEventListener("pointerdown", onPointerDown);

  // ---- Steps ----
  let started = false;
  function go(next: Step) {
    if (next < 1 || next > 4) return;
    if (next > 1 && !baseRows.length) next = 1;
    step = next;
    paint();
    live.textContent = `${fill(t("stepOf"), { n: step })}: ${t("steps")[step - 1]}`;
    if (useHash && win) win.history.replaceState(null, "", writeHash(step, baseRows.length ? spec : undefined, session));
    if (started) panel.querySelector<HTMLElement>("h2")?.focus();
    started = true;
  }

  function paint() {
    stepper.querySelectorAll<HTMLButtonElement>(".fft-ed-step").forEach((b) => {
      const n = Number(b.dataset.step);
      if (n === step) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
      b.disabled = n > 1 && !baseRows.length;
      b.toggleAttribute("data-done", n < step);
    });
    compact.textContent = `${fill(t("stepOf"), { n: step })}: ${t("steps")[step - 1]}`;
    backButton.disabled = step === 1;
    nextButton.disabled = step === 4 || !baseRows.length;
    nextButton.hidden = step === 4;
    undoButton.disabled = history.length === 0;
    paletteCleanup?.();
    paletteCleanup = undefined;
    if (step !== 4 && published) {
      published.destroy();
      published = undefined;
    }
    aside.hidden = step === 4;
    panel.replaceChildren();
    const heading = el("h2", "fft-ed-title", t("steps")[step - 1]);
    heading.tabIndex = -1;
    panel.append(heading);
    [paintData, paintDescribe, paintVisualize, paintPublish][step - 1]?.();
  }

  // Step 1: the data.
  function paintData() {
    const zone = el("div", "fft-ed-drop");
    const text = el("textarea", "fft-ed-text");
    text.placeholder = t("dropHere");
    text.setAttribute("aria-label", t("dropHere"));
    text.rows = 8;
    text.value = data.text;
    text.spellcheck = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    text.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadText(text.value, undefined, false), 150);
    });
    const hint = el("p", "fft-ed-hint", t("dropHint"));
    const file = el("input");
    file.type = "file";
    file.accept = ".csv,.tsv,.txt,.json,text/csv,text/tab-separated-values,application/json";
    file.className = "fft-sr-only";
    file.id = `fft-ed-file-${id}`;
    file.addEventListener("change", () => {
      const picked = file.files?.[0];
      if (picked) readFile(picked);
    });
    const choose = el("label", "fft-ed-button", t("chooseFile"));
    choose.htmlFor = file.id;
    choose.tabIndex = 0;
    choose.setAttribute("role", "button");
    choose.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        file.click();
      }
    });
    zone.append(text, hint, choose, file);
    for (const type of ["dragenter", "dragover"]) {
      zone.addEventListener(type, (event) => {
        event.preventDefault();
        zone.setAttribute("data-over", "");
      });
    }
    zone.addEventListener("dragleave", () => zone.removeAttribute("data-over"));
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      zone.removeAttribute("data-over");
      const dropped = (event as DragEvent).dataTransfer;
      const picked = dropped?.files?.[0];
      if (picked) readFile(picked);
      else {
        const plain = dropped?.getData("text/plain");
        if (plain) loadText(plain);
      }
    });
    panel.append(zone);

    const address = el("input", "fft-ed-input");
    address.type = "url";
    address.placeholder = "https://…/data.csv";
    address.setAttribute("aria-label", t("address"));
    const loadButton = button(t("load"), async (b) => {
      if (!address.value) return;
      try {
        const response = await fetcher(address.value);
        if (!response.ok) throw new Error(String(response.status));
        loadText(await response.text(), address.value.split("/").pop());
      } catch {
        say(b, fill(t("loadFailed"), { what: address.value }), true);
      }
    });
    const addressRow = el("div", "fft-ed-row");
    addressRow.append(address, loadButton);
    panel.append(field(t("orAddress"), addressRow));

    if (options.samples?.length) {
      const chips = el("div", "fft-ed-chips");
      chips.setAttribute("aria-label", t("samples"));
      for (const sample of options.samples) {
        chips.append(
          button(sample.label, async (b) => {
            if (sample.text !== undefined) return loadText(sample.text, sample.label);
            if (!sample.url) return;
            try {
              const response = await fetcher(sample.url);
              if (!response.ok) throw new Error(String(response.status));
              loadText(await response.text(), sample.label);
            } catch {
              say(b, fill(t("loadFailed"), { what: sample.label }), true);
            }
          }, "fft-ed-chip"),
        );
      }
      panel.append(field(t("samples"), chips));
    }

    const saved = savedCache;
    if (saved.length) {
      const list = el("ul", "fft-ed-saved");
      list.setAttribute("aria-label", t("myCharts"));
      for (const chart of saved) {
        const item = el("li");
        item.append(
          el("span", "fft-ed-saved-name", chart.spec.title || chart.spec.id || chart.id),
          button(t("open"), () => {
            setSpec(chart.spec);
            go(3);
          }, "fft-ed-chip"),
          button(t("remove"), async () => {
            await store.removeChart(chart.id);
            await refreshSaved();
            paint();
          }, "fft-ed-chip"),
        );
        list.append(item);
      }
      panel.append(field(t("myCharts"), list));
    }

    const extras = el("div", "fft-ed-extras");
    panel.append(extras);
    refreshExtras = () => {
      extras.replaceChildren();
      if (!baseRows.length) return;
      const controls = el("div", "fft-ed-row");
      if (data.kind === "table") {
        controls.append(
          toggle(t("headerRow"), data.header, (on) => {
            data = { ...data, header: on };
            reparse();
          }),
          toggle(t("transpose"), data.transpose, (on) => {
            data = { ...data, transpose: on };
            reparse();
          }),
        );
      }
      const counter = el("p", "fft-ed-count", fill(t("rowsCount"), { rows: baseRows.length, columns: fields().length }));
      counter.setAttribute("aria-live", "polite");
      controls.append(counter);
      extras.append(controls, previewTable());
    };
    refreshExtras();
  }
  /** Redraws the data step's toggles, count and preview table without rebuilding the text box, so typing keeps its focus. */
  let refreshExtras: (() => void) | undefined;

  /** The first rows as a table, each column headed by its name and what it holds. */
  function previewTable(): HTMLElement {
    const wrap = el("div", "fft-ed-table-wrap");
    const table = el("table", "fft-ed-table");
    const kindOf = kinds();
    const head = el("tr");
    const all = fields();
    for (const f of all) {
      const th = el("th");
      th.scope = "col";
      const kind = kindOf.get(f) ?? "category";
      const pill = el("span", "fft-ed-kind", t("kinds")[kind] ?? kind);
      pill.dataset.kind = kind;
      th.append(el("span", "fft-ed-col-name", f), pill);
      head.append(th);
    }
    const thead = el("thead");
    thead.append(head);
    const body = el("tbody");
    for (const row of baseRows.slice(0, PREVIEW_ROWS)) {
      const tr = el("tr");
      for (const f of all) {
        const value = row[f];
        const td = el("td", kindOf.get(f) === "number" ? "fft-num" : undefined, value === null || value === undefined ? "" : String(value));
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(thead, body);
    const caption = el("caption", undefined, fill(t("preview"), { n: Math.min(PREVIEW_ROWS, baseRows.length) }));
    table.prepend(caption);
    wrap.append(table);
    return wrap;
  }

  function readFile(file: File) {
    const reader = new (win?.FileReader ?? FileReader)();
    reader.addEventListener("load", () => loadText(String(reader.result ?? ""), file.name));
    reader.readAsText(file);
  }

  /** New data: parsed, the columns reset, the chart suggested afresh. */
  function loadText(text: string, name?: string, repaint = true) {
    const trimmed = text.trim();
    const kind: DataState["kind"] = /^[[{]/.test(trimmed) ? "json" : "table";
    data = { ...data, text, kind, ...(name ? { name } : {}) };
    reparse(repaint, true);
  }

  function reparse(repaint = true, fresh = false) {
    let parsed: Row[] = [];
    if (data.kind === "json") {
      try {
        parsed = rowsFromJson(JSON.parse(data.text)) ?? [];
      } catch {
        parsed = [];
      }
    } else parsed = rowsFromTable(data.text, { header: data.header, transpose: data.transpose });
    baseRows = parsed;
    const all = fields();
    if (fresh || !order.length) {
      order = all;
      hidden = [];
    } else {
      order = [...order.filter((f) => all.includes(f)), ...all.filter((f) => !order.includes(f))];
      hidden = hidden.filter((f) => all.includes(f));
    }
    history.length = 0;
    if (baseRows.length && (fresh || !spec.view || !viewFits())) {
      const pick = recommendCharts(rows(), { limit: 1 })[0];
      spec = { ...spec, view: pick?.view ?? suggestView("table", rows()) };
      if (!spec.id) spec = { ...spec, id: slugOf(data.name ?? "chart") };
    }
    if (repaint) sync({ paint: true });
    else {
      sync();
      if (step === 1) refreshExtras?.();
    }
  }

  /** Whether the current view's field options all still name columns of the data. */
  const viewFits = () => {
    const shown = shownFields();
    return Object.entries(viewOptions()).every(([name, option]) => {
      if (option.type !== "field" && option.type !== "fields") return true;
      const value = readOpt(name);
      if (value === undefined) return !option.required;
      return fieldList(value).every((f) => shown.includes(f));
    });
  };
  const slugOf = (name: string) =>
    name
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "chart";

  // Step 2: the columns.
  function paintDescribe() {
    panel.append(el("p", "fft-ed-hint", t("columnsHint")));
    const list = el("ol", "fft-ed-columns");
    list.setAttribute("aria-label", t("columns"));
    const kindOf = kinds();
    let dragging: string | undefined;
    const move = (f: string, to: number) => {
      const from = order.indexOf(f);
      if (from < 0 || to < 0 || to >= order.length || from === to) return;
      remember();
      order.splice(from, 1);
      order.splice(to, 0, f);
      sync({ paint: true });
      const moved = [...panel.querySelectorAll<HTMLElement>(".fft-ed-column")].find((node) => node.dataset.field === f);
      moved?.querySelector<HTMLButtonElement>(`.fft-ed-move-${to < from ? "up" : "down"}`)?.focus();
    };
    order.forEach((f, i) => {
      const item = el("li", "fft-ed-column");
      item.draggable = true;
      item.dataset.field = f;
      if (hidden.includes(f)) item.dataset.hidden = "";
      item.addEventListener("dragstart", (event) => {
        dragging = f;
        event.dataTransfer?.setData("text/plain", f);
        item.setAttribute("data-dragging", "");
      });
      item.addEventListener("dragend", () => item.removeAttribute("data-dragging"));
      item.addEventListener("dragover", (event) => {
        event.preventDefault();
        item.setAttribute("data-over", "");
      });
      item.addEventListener("dragleave", () => item.removeAttribute("data-over"));
      item.addEventListener("drop", (event) => {
        event.preventDefault();
        item.removeAttribute("data-over");
        const moved = dragging ?? event.dataTransfer?.getData("text/plain");
        if (moved && moved !== f) move(moved, order.indexOf(f));
        dragging = undefined;
      });
      const handle = el("span", "fft-ed-handle", "⋮⋮");
      handle.title = t("dragHandle");
      handle.setAttribute("aria-hidden", "true");
      const head = el("div", "fft-ed-column-head");
      const kind = kindOf.get(f) ?? "category";
      const pill = el("span", "fft-ed-kind", t("kinds")[kind] ?? kind);
      pill.dataset.kind = kind;
      head.append(handle, el("code", "fft-ed-col-name", f), pill);
      const moves = el("span", "fft-ed-moves");
      const up = button("↑", () => move(f, i - 1), "fft-ed-icon fft-ed-move-up");
      up.setAttribute("aria-label", `${t("moveUp")}: ${f}`);
      up.disabled = i === 0;
      const down = button("↓", () => move(f, i + 1), "fft-ed-icon fft-ed-move-down");
      down.setAttribute("aria-label", `${t("moveDown")}: ${f}`);
      down.disabled = i === order.length - 1;
      moves.append(up, down);
      head.append(moves);

      const current = spec.fields?.[f] ?? {};
      const label = el("input", "fft-ed-input");
      label.type = "text";
      label.value = current.label ?? "";
      label.placeholder = humanize(f);
      label.addEventListener("change", () => commit({ fields: { [f]: { label: label.value || null } } }));
      const format = el("select", "fft-ed-select");
      format.add(new Option(t("noFormat"), ""));
      for (const type of FORMATS) format.add(new Option(t("formats")[type] ?? type, type));
      const formatType = typeof current.format === "string" ? current.format : current.format?.type ?? "";
      format.value = formatType;
      const sub = el("div", "fft-ed-sub");
      const paintSub = (type: string) => {
        sub.replaceChildren();
        const spec0 = typeof current.format === "object" ? current.format : { type };
        const setFormat = (patch: Record<string, unknown>) => commit({ fields: { [f]: { format: { ...spec0, type, ...patch } } } });
        if (type === "number" || type === "currency" || type === "percent") {
          const decimals = el("input", "fft-ed-input fft-ed-short");
          decimals.type = "number";
          decimals.min = "0";
          decimals.max = "6";
          decimals.value = typeof spec0.decimals === "number" ? String(spec0.decimals) : "";
          decimals.addEventListener("change", () => setFormat({ decimals: decimals.value === "" ? null : Number(decimals.value) }));
          sub.append(field(t("decimals"), decimals));
          if (type !== "percent") sub.append(toggle(t("compact"), spec0.compact === true, (on) => setFormat({ compact: on ? true : null })));
        }
        if (type === "currency") {
          const code = el("input", "fft-ed-input fft-ed-short");
          code.type = "text";
          code.maxLength = 3;
          code.value = typeof spec0.currency === "string" ? spec0.currency : "EUR";
          code.addEventListener("change", () => setFormat({ currency: code.value.toUpperCase() || "EUR" }));
          sub.append(field(t("currency"), code));
        }
        if (type === "date") {
          const style = el("select", "fft-ed-select");
          for (const s of DATE_STYLES) style.add(new Option(s, s));
          style.value = typeof spec0.style === "string" ? spec0.style : "medium";
          style.addEventListener("change", () => setFormat({ style: style.value }));
          sub.append(field(t("datePattern"), style));
        }
      };
      paintSub(formatType);
      format.addEventListener("change", () => {
        const type = format.value;
        const patch: FormatSpec | null = type ? (type === "currency" ? { type, currency: "EUR" } : { type }) : null;
        commit({ fields: { [f]: { format: patch } } });
        paintSub(type);
      });
      const hideToggle = toggle(t("hide"), hidden.includes(f), (on) => {
        remember();
        hidden = on ? [...hidden, f] : hidden.filter((h) => h !== f);
        item.toggleAttribute("data-hidden", on);
        if (!viewFits()) spec = { ...spec, view: suggestView(spec.view.type, rows()) };
        sync();
      });
      const grid = el("div", "fft-ed-column-grid");
      grid.append(field(t("label"), label), field(t("format"), format), sub, hideToggle);
      item.append(head, grid);
      list.append(item);
    });
    panel.append(list);
  }

  // Step 3: the chart.
  function paintVisualize() {
    const tabs = el("div", "fft-ed-tabs");
    tabs.setAttribute("role", "tablist");
    const panes = el("div", "fft-ed-pane");
    const names = t("tabs");
    const buttons = names.map((name, i) => {
      const b = button(name, () => {
        tab = i;
        buttons.forEach((other, k) => {
          other.setAttribute("aria-selected", String(k === i));
          other.tabIndex = k === i ? 0 : -1;
        });
        paintTab();
      }, "fft-ed-tab");
      b.setAttribute("role", "tab");
      b.id = `fft-ed-tab-${id}-${i}`;
      b.setAttribute("aria-selected", String(i === tab));
      b.setAttribute("aria-controls", `fft-ed-pane-${id}`);
      b.tabIndex = i === tab ? 0 : -1;
      b.addEventListener("keydown", (event) => {
        const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (!delta) return;
        event.preventDefault();
        const next = buttons[(i + delta + buttons.length) % buttons.length];
        next?.focus();
        next?.click();
      });
      tabs.append(b);
      return b;
    });
    panes.id = `fft-ed-pane-${id}`;
    panes.setAttribute("role", "tabpanel");
    panel.append(tabs, panes);
    const paintTab = () => {
      paletteCleanup?.();
      paletteCleanup = undefined;
      panes.setAttribute("aria-labelledby", `fft-ed-tab-${id}-${tab}`);
      panes.replaceChildren();
      [paintTypes, paintRefine, paintAnnotate][tab]?.(panes);
    };
    paintTab();
  }

  /** The chart-type grid: the recommended charts first with why, then every chart that fits, then the rest with the reason they may not. */
  function paintTypes(pane: HTMLElement) {
    const current = rows();
    const picks = recommendCharts(current, { limit: 6 });
    const pickOf = new Map(picks.map((pick) => [pick.type, pick]));
    const cards: { type: string; group: 0 | 1 | 2; why?: string; view?: ViewSpec }[] = [];
    for (const { type } of describeBlocks("view")) {
      const pick = pickOf.get(type);
      if (pick) {
        cards.push({ type, group: 0, why: pick.why, view: pick.view });
        continue;
      }
      let fit: ReturnType<typeof switchChart> | undefined;
      try {
        fit = switchChart(spec, type, current);
      } catch {
        fit = undefined;
      }
      if (fit && fit.fit !== "no") cards.push({ type, group: 1, view: fit.view, why: fit.assessment });
      else cards.push({ type, group: 2, why: fit?.caveats[0] ?? fit?.assessment });
    }
    cards.sort((a, b) => a.group - b.group || (pickOf.get(b.type)?.score ?? 0) - (pickOf.get(a.type)?.score ?? 0) || a.type.localeCompare(b.type));
    const groups: [string, HTMLElement][] = [
      [t("recommended"), el("div", "fft-ed-grid")],
      [t("allCharts"), el("div", "fft-ed-grid")],
      [t("fitsLess"), el("div", "fft-ed-grid")],
    ];
    const observer = typeof win?.IntersectionObserver === "function" ? new win.IntersectionObserver((entries, me) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        me.unobserve(entry.target);
        drawThumb(entry.target as HTMLElement);
      }
    }, { rootMargin: "200px" }) : undefined;
    if (observer) cleanups.push(() => observer.disconnect());
    for (const card of cards) {
      const b = el("button", "fft-ed-type");
      b.type = "button";
      b.dataset.type = card.type;
      b.setAttribute("aria-pressed", String(spec.view.type === card.type));
      if (card.group === 2) b.dataset.unfit = "";
      const thumb = el("div", "fft-ed-thumb");
      thumb.setAttribute("aria-hidden", "true");
      thumb.setAttribute("inert", "");
      thumb.dataset.type = card.type;
      const name = el("span", "fft-ed-type-name", card.type);
      b.append(thumb, name);
      if (card.why) b.append(el("span", "fft-ed-type-why", card.why));
      b.addEventListener("click", () => {
        let view: ViewSpec;
        try {
          view = card.view ?? suggestView(card.type, current);
        } catch {
          view = { type: card.type };
        }
        commit({ view: { ...Object.fromEntries(Object.keys(spec.view).map((k) => [k, null])), ...canonicalView(view) } });
        pane.querySelectorAll<HTMLButtonElement>(".fft-ed-type").forEach((other) => other.setAttribute("aria-pressed", String(other === b)));
      });
      groups[card.group]?.[1].append(b);
      if (observer) observer.observe(thumb);
      else drawThumb(thumb);
    }
    for (const [title, grid] of groups) {
      if (!grid.childElementCount) continue;
      pane.append(el("h3", "fft-ed-subtitle", title), grid);
    }
  }

  /** A small live drawing of the view's example, or its name when there is none. */
  function drawThumb(thumb: HTMLElement) {
    const type = thumb.dataset.type ?? "";
    if (thumb.dataset.drawn) return;
    thumb.dataset.drawn = "";
    const example = options.examples?.[type];
    if (!example) {
      thumb.append(el("span", "fft-ed-thumb-name", type.slice(0, 2)));
      return;
    }
    const slot = el("div", "fft-ed-thumb-slot");
    thumb.append(slot);
    const { title: _t, subtitle: _s, footer: _f, headline: _h, ...rest } = example;
    const thumbWidget = createWidget(slot, { ...rest, style: { ...rest.style, height: 144 } });
    cleanups.push(() => thumbWidget.destroy());
  }

  /** Refine: a control for every option the view declares, then emphasis, small multiples and style. */
  function paintRefine(pane: HTMLElement) {
    const current = rows();
    const kindOf = kinds();
    const shown = shownFields();
    const ofKind = (kind: Kind | undefined) => {
      // Amounts for number options; names and dates are interchangeable for the others (a bar's x may be months).
      const matching = shown.filter((f) => !kind || (kind === "number" ? kindOf.get(f) === "number" : kindOf.get(f) !== "number"));
      return matching.length ? matching : shown;
    };
    const form = el("div", "fft-ed-form");
    pane.append(el("h3", "fft-ed-subtitle", `${t("options")}: ${spec.view.type}`), form);
    const viewOf = (): Record<string, unknown> => spec.view;
    for (const [name, option] of Object.entries(viewOptions())) {
      if (ELSEWHERE.has(name)) continue;
      const value = readOpt(name);
      const control = controlFor(name, option, value, ofKind, current);
      if (control) form.append(control);
    }
    // Emphasis: the categories of the chart's category field, each a chip.
    const key = categoryField();
    if ("highlight" in viewOptions() && key) {
      const values = [...new Set(current.map((row) => String(row[key])))].slice(0, 40);
      const picked = fieldList(spec.view.highlight);
      const chips = el("div", "fft-ed-chips");
      chips.setAttribute("role", "group");
      chips.setAttribute("aria-label", t("highlight"));
      for (const v of values) {
        const chip = button(v, () => {
          const on = chip.getAttribute("aria-pressed") !== "true";
          chip.setAttribute("aria-pressed", String(on));
          const now = fieldList(spec.view.highlight);
          const next = on ? [...now, v] : now.filter((x) => x !== v);
          commit({ view: { highlight: next.length ? next : null } });
        }, "fft-ed-chip");
        chip.setAttribute("aria-pressed", String(picked.includes(v)));
        chips.append(chip);
      }
      form.append(field(t("highlight"), chips, t("highlightHint")));
    }
    // Small multiples: one panel per value of a category with few values.
    const facetable = shown.filter((f) => kindOf.get(f) === "category" && new Set(current.map((row) => String(row[f]))).size <= 12);
    if (facetable.length) {
      const facet = el("select", "fft-ed-select");
      facet.add(new Option(t("none"), ""));
      for (const f of facetable) facet.add(new Option(labelOf(f), f));
      facet.value = spec.facet?.field ?? "";
      facet.addEventListener("change", () => commit({ facet: facet.value ? { field: facet.value } : null }));
      form.append(field(t("facet"), facet));
    }
    // Statuses: the rag transform's rules, one per measure, turning numbers into red, amber and green columns.
    const numbers = shown.filter((f) => kindOf.get(f) === "number");
    if (numbers.length) form.append(ragRules(numbers));

    // Style: the look, the theme, the colors, the height.
    const style = el("div", "fft-ed-form");
    pane.append(el("h3", "fft-ed-subtitle", t("style")), style);
    const presets = describePresets().sort((a, b) => Number(b.name === "default") - Number(a.name === "default"));
    style.append(field(t("preset"), segmented(t("preset"), presets.map((p) => ({ value: p.name, label: p.name[0]?.toUpperCase() + p.name.slice(1), title: p.description })), spec.style?.preset ?? "default", (value) => commit({ style: { preset: value === "default" ? null : value } }))));
    style.append(field(t("theme"), segmented(t("theme"), ["auto", "light", "dark"].map((v) => ({ value: v, label: t("themes")[v] ?? v })), spec.style?.theme ?? "auto", (value) => commit({ style: { theme: value === "auto" ? null : value } }))));
    const paletteSlot = el("div", "fft-ed-palette");
    const picker = createPalettePicker(paletteSlot, {
      value: spec.style?.palette ?? "default",
      onChange: (colors, name) => commit({ style: { palette: name && name !== "default" ? name : name === "default" ? null : colors } }),
    });
    paletteCleanup = () => picker.destroy();
    style.append(field(t("palette"), paletteSlot));
    // Fixed colors: a color per value of the chart's category field, the same on every chart that names it.
    const colorKey = categoryField();
    if (colorKey) {
      const values = [...new Set(current.map((row) => String(row[colorKey] ?? "")))].filter(Boolean).slice(0, 12);
      const fixed = (loose().colors ?? {}) as Record<string, string>;
      const swatches = el("div", "fft-ed-colors");
      swatches.setAttribute("role", "group");
      swatches.setAttribute("aria-label", t("colors"));
      for (const v of values) {
        const item = el("div", "fft-ed-color");
        const input = el("input", "fft-ed-color-input");
        input.type = "color";
        input.value = /^#[0-9a-f]{6}$/i.test(fixed[v] ?? "") ? (fixed[v] as string) : "#888888";
        input.setAttribute("aria-label", `${t("colors")}: ${v}`);
        if (!fixed[v]) input.dataset.unset = "";
        input.addEventListener("change", () => commit({ colors: { [v]: input.value } }));
        const clear = button(t("clearColor"), () => commit({ colors: { [v]: null } }, { paint: true }), "fft-ed-chip fft-ed-color-clear");
        clear.setAttribute("aria-label", `${t("clearColor")}: ${v}`);
        clear.hidden = !fixed[v];
        item.append(input, el("span", "fft-ed-color-name", v), clear);
        swatches.append(item);
      }
      style.append(field(t("colors"), swatches, t("colorsHint")));
    }
    const height = el("input", "fft-ed-input fft-ed-short");
    height.type = "number";
    height.min = "120";
    height.max = "900";
    height.placeholder = t("heightAuto");
    height.value = spec.style?.height ? String(spec.style.height) : "";
    height.addEventListener("change", () => commit({ style: { height: height.value ? Number(height.value) : null } }));
    style.append(field(t("height"), height));
    style.append(field(t("density"), segmented(t("density"), ["comfortable", "compact"].map((v) => ({ value: v, label: t("densities")[v] ?? v })), spec.style?.density ?? "comfortable", (value) => commit({ style: { density: value === "comfortable" ? null : value } }))));
  }

  /** The rag transform's rules: a measure, on track from, at risk from, which way is good; and an overall column. */
  function ragRules(numbers: string[]): HTMLElement {
    type Rule = { field: string; as?: string; green: number; amber: number; goodWhen?: "up" | "down" };
    const steps = spec.transform ?? [];
    const at = steps.findIndex((step) => step.type === "rag");
    const step = (at >= 0 ? steps[at] : { type: "rag", rules: [] }) as { type: "rag"; rules: Rule[]; overall?: string };
    const rules = Array.isArray(step.rules) ? step.rules : [];
    const write = (next: Rule[], overall = step.overall) => {
      const others = steps.filter((_, i) => i !== at);
      const rag = next.length ? [{ type: "rag", rules: next, ...(overall ? { overall } : {}) }] : [];
      commit({ transform: [...others, ...rag].length ? [...others, ...rag] : null }, { paint: true });
    };
    const box = el("details", "fft-ed-rag");
    box.open = rules.length > 0;
    box.append(el("summary", "fft-ed-rag-title", t("ragRules")), el("p", "fft-ed-hint", t("ragRulesHint")));
    rules.forEach((rule, i) => {
      const row = el("div", "fft-ed-rag-rule");
      row.dataset.rule = String(i);
      const update = (patch: Partial<Rule>) => write(rules.map((r, k) => (k === i ? { ...r, ...patch } : r)));
      const select = el("select", "fft-ed-select");
      for (const f of numbers) select.add(new Option(labelOf(f), f));
      select.value = rule.field;
      select.addEventListener("change", () => update({ field: select.value }));
      row.append(
        field(t("ragField"), select),
        numberInput(t("ragGreen"), rule.green, (n) => n !== null && update({ green: n })),
        numberInput(t("ragAmber"), rule.amber, (n) => n !== null && update({ amber: n })),
        field(t("ragGoodWhen"), segmented(`${t("ragGoodWhen")} ${i + 1}`, ["up", "down"].map((v) => ({ value: v, label: t("ragDirections")[v] ?? v })), rule.goodWhen === "down" ? "down" : "up", (v) => update({ goodWhen: v === "down" ? "down" : undefined }))),
        button(t("remove"), () => write(rules.filter((_, k) => k !== i)), "fft-ed-chip"),
      );
      box.append(row);
    });
    const add = button(t("add"), () => {
      const used = new Set(rules.map((r) => r.field));
      const f = numbers.find((n) => !used.has(n)) ?? (numbers[0] as string);
      const values = rows().map((row) => Number(row[f])).filter(Number.isFinite).sort((a, b) => a - b);
      const q = (p: number) => values[Math.floor(p * (values.length - 1))] ?? 0;
      write([...rules, { field: f, green: q(0.66), amber: q(0.33) }]);
    }, "fft-ed-button fft-ed-rag-add");
    box.append(add);
    if (rules.length > 1) {
      const overall = el("input", "fft-ed-input");
      overall.type = "text";
      overall.placeholder = "status";
      overall.value = step.overall ?? "";
      overall.addEventListener("change", () => write(rules, overall.value || undefined));
      box.append(field(t("ragOverall"), overall));
    }
    return box;
  }

  /** One control for a view option, from its schema, tagged with the option's canonical name so hosts and tests can find it. */
  function controlFor(name: string, option: OptionSchema, value: unknown, ofKind: (kind: Kind | undefined) => string[], current: Row[]): HTMLElement | undefined {
    const control = controlOf(name, option, value, ofKind, current);
    if (control) control.dataset.option = keyOf(name);
    return control;
  }

  /** An ordered list of the picked fields: drag one onto another, or use its arrows, to set the order they are drawn in. */
  function orderList(label: string, picked: string[], write: (next: string[]) => void): HTMLElement {
    const list = el("ol", "fft-ed-order");
    list.setAttribute("aria-label", `${label}: ${t("order")}`);
    let dragging: string | undefined;
    const move = (from: number, to: number) => {
      if (from < 0 || to < 0 || to >= picked.length || from === to) return;
      const next = [...picked];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved as string);
      write(next);
      const again = [...panel.querySelectorAll<HTMLElement>(".fft-ed-order")].find((node) => node.getAttribute("aria-label") === list.getAttribute("aria-label"));
      again?.querySelectorAll<HTMLElement>(".fft-ed-order-item")[to]?.querySelector<HTMLButtonElement>(`.fft-ed-move-${to < from ? "up" : "down"}`)?.focus();
    };
    picked.forEach((f, i) => {
      const item = el("li", "fft-ed-order-item");
      item.draggable = true;
      item.dataset.field = f;
      item.addEventListener("dragstart", (event) => {
        dragging = f;
        event.dataTransfer?.setData("text/plain", f);
        item.setAttribute("data-dragging", "");
      });
      item.addEventListener("dragend", () => item.removeAttribute("data-dragging"));
      item.addEventListener("dragover", (event) => event.preventDefault());
      item.addEventListener("drop", (event) => {
        event.preventDefault();
        const from = dragging ?? event.dataTransfer?.getData("text/plain");
        if (from) move(picked.indexOf(from), i);
        dragging = undefined;
      });
      const handle = el("span", "fft-ed-handle", "⋮⋮");
      handle.setAttribute("aria-hidden", "true");
      const up = button("↑", () => move(i, i - 1), "fft-ed-icon fft-ed-move-up");
      up.setAttribute("aria-label", `${t("moveUp")}: ${labelOf(f)}`);
      up.disabled = i === 0;
      const down = button("↓", () => move(i, i + 1), "fft-ed-icon fft-ed-move-down");
      down.setAttribute("aria-label", `${t("moveDown")}: ${labelOf(f)}`);
      down.disabled = i === picked.length - 1;
      item.append(handle, el("span", "fft-ed-order-name", labelOf(f)), up, down);
      list.append(item);
    });
    return list;
  }

  /** A small group of labelled inputs inside one option. */
  const group = (...children: HTMLElement[]) => {
    const box = el("div", "fft-ed-group");
    box.append(...children);
    return box;
  };
  const numberInput = (label: string, value: unknown, onChange: (n: number | null) => void) => {
    const input = el("input", "fft-ed-input fft-ed-short");
    input.type = "number";
    input.step = "any";
    input.value = typeof value === "number" ? String(value) : "";
    input.addEventListener("change", () => onChange(input.value === "" ? null : Number(input.value)));
    return field(label, input);
  };
  const textInput = (label: string, value: unknown, onChange: (text: string) => void) => {
    const input = el("input", "fft-ed-input");
    input.type = "text";
    input.value = typeof value === "string" ? value : "";
    input.addEventListener("change", () => onChange(input.value));
    return field(label, input);
  };

  function controlOf(name: string, option: OptionSchema, value: unknown, ofKind: (kind: Kind | undefined) => string[], current: Row[]): HTMLElement | undefined {
    const type = spec.view.type;
    const label = humanize(keyOf(name));
    const put = (next: unknown) => putOpt(name, next);
    const describe = (node: HTMLElement) => {
      node.title = option.description;
      return node;
    };
    // Map geometry: a built-in basemap, or the address of a GeoJSON file.
    if (name === "geo") {
      const select = el("select", "fft-ed-select");
      if (!option.required) select.add(new Option(t("none"), ""));
      for (const map of basemapNames()) select.add(new Option(map, map));
      select.add(new Option(t("basemapAddress"), "\u0000url"));
      const isAddress = typeof value === "string" && value !== "" && !basemapNames().includes(value);
      select.value = isAddress ? "\u0000url" : typeof value === "string" ? value : "";
      const url = el("input", "fft-ed-input fft-ed-geo-url");
      url.type = "url";
      url.placeholder = "https://…/regions.geojson";
      url.setAttribute("aria-label", t("basemapUrl"));
      url.value = isAddress ? String(value) : "";
      url.hidden = !isAddress;
      select.addEventListener("change", () => {
        url.hidden = select.value !== "\u0000url";
        if (select.value === "\u0000url") return url.focus();
        commit({ view: put(select.value || null) }, { paint: true });
      });
      url.addEventListener("change", () => commit({ view: put(url.value || null) }, { paint: true }));
      return field(t("basemap"), describe(group(select, url)), option.description);
    }
    // A today line: a switch, and a date when the line should sit somewhere else.
    if (name === "today") {
      const on = value !== undefined && value !== false;
      const date = el("input", "fft-ed-input fft-ed-short");
      date.type = "date";
      date.setAttribute("aria-label", t("todayDate"));
      date.value = typeof value === "string" ? value.slice(0, 10) : "";
      date.disabled = !on;
      date.addEventListener("change", () => commit({ view: put(date.value || true) }));
      const sw = toggle(t("todayLine"), on, (next) => {
        date.disabled = !next;
        commit({ view: put(next ? date.value || true : null) });
      });
      return field(t("todayLine"), describe(group(sw, date)), option.description);
    }
    // Labels as a word: a choropleth writes its codes, or nothing.
    if (name === "labels" && type === "choropleth") {
      const current = value === false || value === "none" ? "none" : "codes";
      return field(label, describe(segmented(label, ["codes", "none"].map((v) => ({ value: v, label: t("labelModes")[v] ?? v })), current, (v) => commit({ view: put(v === "codes" ? null : v) }))), option.description);
    }
    // Quadrants: where the plot splits, and a word in each corner.
    if (name === "quadrants") {
      const q = (value && typeof value === "object" ? value : {}) as { x?: number; y?: number; labels?: string[] };
      const write = (patch: Partial<typeof q>) => {
        const next = { ...q, ...patch };
        const words = (next.labels ?? []).map((w) => w ?? "");
        const keep = typeof next.x === "number" && typeof next.y === "number";
        commit({ view: put(keep ? { x: next.x, y: next.y, ...(words.some(Boolean) ? { labels: words } : {}) } : null) }, { paint: !keep });
        Object.assign(q, next);
      };
      const words = t("quadrantWords") as string[];
      return field(
        label,
        describe(
          group(
            numberInput(t("quadrantX"), q.x, (n) => write({ x: n ?? undefined })),
            numberInput(t("quadrantY"), q.y, (n) => write({ y: n ?? undefined })),
            ...words.map((word, i) =>
              textInput(word, q.labels?.[i], (text) => {
                const labels = [0, 1, 2, 3].map((k) => (k === i ? text : (q.labels?.[k] ?? "")));
                write({ labels });
              }),
            ),
          ),
        ),
        option.description,
      );
    }
    // RAG thresholds on a KPI: on track from one value, at risk from another, and which way is good.
    if (name === "rag" && option.type === "object") {
      const r = (value && typeof value === "object" ? value : {}) as { green?: number; amber?: number; goodWhen?: string };
      const write = (patch: Partial<typeof r>) => {
        Object.assign(r, patch);
        const keep = typeof r.green === "number" && typeof r.amber === "number";
        commit({ view: put(keep ? { green: r.green, amber: r.amber, ...(r.goodWhen === "down" ? { goodWhen: "down" } : {}) } : null) });
      };
      return field(
        label,
        describe(
          group(
            numberInput(t("ragGreen"), r.green, (n) => write({ green: n ?? undefined })),
            numberInput(t("ragAmber"), r.amber, (n) => write({ amber: n ?? undefined })),
            field(t("ragGoodWhen"), segmented(t("ragGoodWhen"), ["up", "down"].map((v) => ({ value: v, label: t("ragDirections")[v] ?? v })), r.goodWhen === "down" ? "down" : "up", (v) => write({ goodWhen: v }))),
          ),
        ),
        option.description,
      );
    }
    // A scorecard's last-period columns: one select per dimension.
    if (name === "previous" && type === "ragboard") {
      const map = (value && typeof value === "object" ? value : {}) as Record<string, string>;
      const dims = fieldList(readOpt("dimensions"));
      const selects = dims.map((dim) => {
        const select = el("select", "fft-ed-select");
        select.add(new Option(t("none"), ""));
        for (const f of ofKind("category")) if (f !== dim) select.add(new Option(labelOf(f), f));
        select.value = map[dim] ?? "";
        select.addEventListener("change", () => {
          const next = { ...map, [dim]: select.value };
          if (!select.value) delete next[dim];
          commit({ view: put(Object.keys(next).length ? next : null) });
        });
        return field(fill(t("previousOf"), { field: labelOf(dim) }), select);
      });
      return field(label, describe(group(...selects)), option.description);
    }
    // A scorecard's overall column: the worst of its columns, none, or a stored roll-up.
    if (name === "overall" && type === "ragboard") {
      const select = el("select", "fft-ed-select");
      select.add(new Option(t("overallWorst"), "\u0000worst"));
      select.add(new Option(t("none"), "\u0000none"));
      for (const f of ofKind("category")) select.add(new Option(labelOf(f), f));
      select.value = value === false ? "\u0000none" : typeof value === "string" ? value : "\u0000worst";
      select.addEventListener("change", () => commit({ view: put(select.value === "\u0000worst" ? null : select.value === "\u0000none" ? false : select.value) }));
      return field(t("ragOverall"), describe(select), option.description);
    }
    if (option.type === "field") {
      const select = el("select", "fft-ed-select");
      if (!option.required) select.add(new Option(t("none"), ""));
      for (const f of ofKind(option.kind)) select.add(new Option(labelOf(f), f));
      if (typeof value === "string" && !ofKind(option.kind).includes(value)) select.add(new Option(labelOf(value), value));
      select.value = typeof value === "string" ? value : "";
      select.addEventListener("change", () => commit({ view: put(select.value || null) }, { paint: true }));
      return field(label, describe(select), option.description);
    }
    if (option.type === "fields") {
      const chips = el("div", "fft-ed-chips");
      chips.setAttribute("role", "group");
      chips.setAttribute("aria-label", label);
      const picked = fieldList(value);
      const write = (next: string[]) => commit({ view: put(next.length === 0 ? null : next.length === 1 ? next[0] : next) }, { paint: true });
      for (const f of [...picked.filter((p) => !ofKind(option.kind).includes(p)), ...ofKind(option.kind)]) {
        const chip = el("label", "fft-ed-check");
        const box = el("input");
        box.type = "checkbox";
        box.checked = picked.includes(f);
        box.addEventListener("change", () => {
          const now = fieldList(readOpt(name));
          const next = box.checked ? [...now, f] : now.filter((x) => x !== f);
          if (option.required && !next.length) {
            box.checked = true;
            return;
          }
          commit({ view: put(next.length === 0 ? null : next.length === 1 ? next[0] : next) });
        });
        chip.append(box, el("span", undefined, labelOf(f)));
        chips.append(chip);
      }
      // Two or more picked: their order is how they are drawn (stages, levels, series), so it can be set.
      if (picked.length < 2) return field(label, describe(chips), option.description);
      return field(label, describe(group(chips, orderList(label, picked, write))), `${option.description} ${t("orderHint")}`);
    }
    if (option.type === "boolean") {
      const on = value === undefined ? option.default === true : value === true;
      return field(label, describe(toggle(label, on, (next) => commit({ view: put(next === (option.default === true) ? null : next) }))), option.description);
    }
    if (option.type === "enum" && option.values) {
      const current = typeof value === "string" ? value : String(option.default ?? option.values[0] ?? "");
      return field(label, describe(segmented(label, option.values.map((v) => ({ value: v, label: v })), current, (v) => commit({ view: put(v === String(option.default) ? null : v) }))), option.description);
    }
    if (option.type === "number") {
      const input = el("input", "fft-ed-input fft-ed-short");
      input.type = "number";
      input.value = typeof value === "number" ? String(value) : "";
      input.placeholder = option.default !== undefined ? String(option.default) : "";
      input.addEventListener("change", () => commit({ view: put(input.value === "" ? null : Number(input.value)) }));
      return field(label, describe(input), option.description);
    }
    if (option.type === "string") {
      const input = el("input", "fft-ed-input");
      input.type = "text";
      input.value = typeof value === "string" ? value : "";
      input.addEventListener("change", () => commit({ view: put(input.value || null) }));
      return field(label, describe(input), option.description);
    }
    if (option.type === "function") return undefined;
    // Stacking takes false, true or a word: a segmented control reads better than a JSON field.
    if (option.type === "any" && name === "stacked") {
      const words: Record<string, string> = { false: "Grouped", true: "Stacked", percent: "Percent", stream: "Stream" };
      const values = ["false", "true", "percent", ...(/stream/.test(option.description) ? ["stream"] : [])];
      const current = value === true ? "true" : typeof value === "string" ? value : "false";
      return field(label, describe(segmented(label, values.map((v) => ({ value: v, label: words[v] ?? v })), current, (v) => commit({ view: put(v === "false" ? null : v === "true" ? true : v) }))), option.description);
    }
    // A list of words with a meaning per position (a dual's marks: top panel, bottom panel): one segmented control each.
    if (option.type === "array" && option.values && option.itemLabels?.length) {
      const fallback = Array.isArray(option.default) ? option.default.map(String) : [];
      const current = Array.isArray(value) ? value.map(String) : fallback;
      const positions = el("div", "fft-ed-positions");
      option.itemLabels.forEach((itemLabel, i) => {
        const picked = current[i] ?? fallback[i] ?? option.values?.[0] ?? "";
        const row = el("div", "fft-ed-position");
        row.append(el("span", "fft-ed-position-label", itemLabel));
        row.append(
          segmented(`${label}: ${itemLabel}`, (option.values ?? []).map((v) => ({ value: v, label: v })), picked, (v) => {
            const next = option.itemLabels!.map((_, k) => (k === i ? v : current[k] ?? fallback[k] ?? v));
            commit({ view: put(JSON.stringify(next) === JSON.stringify(fallback) ? null : next) });
          }),
        );
        positions.append(row);
      });
      return field(label, describe(positions), option.description);
    }
    void current;
    // Lists and objects: a small JSON field, applied when it parses.
    const area = el("textarea", "fft-ed-json");
    area.rows = 2;
    area.value = value === undefined ? "" : JSON.stringify(value);
    area.spellcheck = false;
    area.addEventListener("change", () => {
      if (area.value.trim() === "") return commit({ view: put(null) });
      try {
        const parsed: unknown = JSON.parse(area.value);
        area.removeAttribute("aria-invalid");
        commit({ view: put(parsed) });
      } catch {
        area.setAttribute("aria-invalid", "true");
      }
    });
    return field(label, describe(area), option.description);
  }

  /** Annotate: the words around the chart, the headline, reference lines and text notes. */
  function paintAnnotate(pane: HTMLElement) {
    const form = el("div", "fft-ed-form");
    pane.append(form);
    const textField = (label: string, key: "title" | "subtitle" | "footer" | "byline", multiline = false) => {
      const input = multiline ? el("textarea", "fft-ed-json") : el("input", "fft-ed-input");
      if (input instanceof HTMLInputElement) input.type = "text";
      input.value = typeof loose()[key] === "string" ? String(loose()[key]) : "";
      input.addEventListener("change", () => commit({ [key]: input.value || null }));
      form.append(field(label, input));
    };
    textField(t("title"), "title");
    textField(t("subtitle"), "subtitle");
    textField(t("footer"), "footer");
    // The tooltip: a template filled from the mark's row, with the fields a click away.
    {
      const area = el("textarea", "fft-ed-json fft-ed-tooltip");
      area.rows = 2;
      const tip = loose().tooltip;
      area.value = typeof tip === "string" ? tip : tip && typeof tip === "object" ? JSON.stringify(tip) : "";
      area.placeholder = "{region}: {revenue}";
      const apply = () => {
        const text = area.value.trim();
        if (!text) return commit({ tooltip: null });
        if (text.startsWith("{") && text.endsWith("}") && /"(title|body)"/.test(text)) {
          try {
            return commit({ tooltip: JSON.parse(text) });
          } catch {
            /* falls through: a plain template that happens to start with a brace */
          }
        }
        commit({ tooltip: area.value });
      };
      area.addEventListener("change", apply);
      const inserts = el("div", "fft-ed-chips");
      inserts.setAttribute("role", "group");
      inserts.setAttribute("aria-label", `${t("tooltip")}: ${t("insertField")}`);
      for (const f of shownFields().slice(0, 16)) {
        inserts.append(
          button(`{${f}}`, () => {
            const at = area.selectionStart ?? area.value.length;
            area.value = `${area.value.slice(0, at)}{${f}}${area.value.slice(area.selectionEnd ?? at)}`;
            apply();
          }, "fft-ed-chip fft-ed-insert"),
        );
      }
      const box = el("div", "fft-ed-group");
      box.append(area, inserts);
      form.append(field(t("tooltip"), box, t("tooltipHint")));
    }
    const source = (loose().source ?? {}) as { name?: string; url?: string };
    const sourceName = el("input", "fft-ed-input");
    sourceName.type = "text";
    sourceName.value = source.name ?? "";
    const sourceUrl = el("input", "fft-ed-input");
    sourceUrl.type = "url";
    sourceUrl.value = source.url ?? "";
    const commitSource = () => commit({ source: sourceName.value ? { name: sourceName.value, url: sourceUrl.value || null } : null });
    sourceName.addEventListener("change", commitSource);
    sourceUrl.addEventListener("change", commitSource);
    form.append(field(t("sourceName"), sourceName), field(t("sourceUrl"), sourceUrl));
    textField(t("byline"), "byline");

    // The headline: one number above the chart.
    const kindOf = kinds();
    const numbers = shownFields().filter((f) => kindOf.get(f) === "number");
    if (numbers.length) {
      const headline = el("select", "fft-ed-select");
      headline.add(new Option(t("none"), ""));
      for (const f of numbers) headline.add(new Option(labelOf(f), f));
      headline.value = spec.headline?.value ?? "";
      const compare = el("select", "fft-ed-select");
      compare.add(new Option(t("none"), ""));
      compare.add(new Option(t("previousRow"), "previous"));
      for (const f of numbers) compare.add(new Option(labelOf(f), f));
      compare.value = typeof spec.headline?.compare === "string" ? spec.headline.compare : "";
      const apply = () => commit({ headline: headline.value ? { value: headline.value, compare: compare.value || null } : null });
      headline.addEventListener("change", apply);
      compare.addEventListener("change", apply);
      form.append(field(t("headline"), headline), field(t("headlineCompare"), compare));
    }

    // Reference lines, where the view takes them.
    if ("reference" in viewOptions()) {
      const refs = Array.isArray(spec.view.reference) ? (spec.view.reference as { value: number; label?: string }[]) : [];
      const list = el("div", "fft-ed-list");
      const write = (next: { value: number; label?: string }[]) => commit({ view: { reference: next.length ? next : null } }, { paint: true });
      refs.forEach((ref, i) => {
        const row = el("div", "fft-ed-row");
        const value = el("input", "fft-ed-input fft-ed-short");
        value.type = "number";
        value.value = String(ref.value);
        value.setAttribute("aria-label", t("referenceValue"));
        value.addEventListener("change", () => write(refs.map((r, k) => (k === i ? { ...r, value: Number(value.value) } : r))));
        const label = el("input", "fft-ed-input");
        label.type = "text";
        label.value = ref.label ?? "";
        label.setAttribute("aria-label", t("referenceLabel"));
        label.addEventListener("change", () => write(refs.map((r, k) => (k === i ? { ...r, label: label.value || undefined } : r))));
        row.append(value, label, button(t("remove"), () => write(refs.filter((_, k) => k !== i)), "fft-ed-chip"));
        list.append(row);
      });
      const values = rows().flatMap((row) => numbers.map((f) => row[f])).filter((v): v is number => typeof v === "number");
      list.append(button(t("add"), () => write([...refs, { value: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0, label: t("target") }]), "fft-ed-chip"));
      form.append(field(t("references"), list));
    }

    // Text annotations, where the view takes them: each at a category, optionally at a height, with its text.
    const key = categoryField() ?? (typeof spec.view.x === "string" ? (spec.view.x as string) : undefined);
    if ("annotations" in viewOptions() && key) {
      const notes = Array.isArray(spec.view.annotations) ? (spec.view.annotations as { x: unknown; y?: number; text: string }[]) : [];
      const categories = [...new Set(rows().map((row) => row[key]))];
      const list = el("div", "fft-ed-list");
      const write = (next: { x: unknown; y?: number; text: string }[]) => commit({ view: { annotations: next.length ? next : null } }, { paint: true });
      notes.forEach((note, i) => {
        const row = el("div", "fft-ed-row");
        const at = el("select", "fft-ed-select");
        for (const c of categories) at.add(new Option(String(c), String(c)));
        at.value = String(note.x);
        at.setAttribute("aria-label", t("annotationAt"));
        const stepTo = (delta: number) => {
          const index = categories.findIndex((c) => String(c) === String(note.x));
          const next = categories[index + delta];
          if (next !== undefined) write(notes.map((n, k) => (k === i ? { ...n, x: next } : n)));
        };
        at.addEventListener("change", () => write(notes.map((n, k) => (k === i ? { ...n, x: categories.find((c) => String(c) === at.value) ?? at.value } : n))));
        const earlier = button("←", () => stepTo(-1), "fft-ed-icon");
        earlier.setAttribute("aria-label", t("left"));
        const later = button("→", () => stepTo(1), "fft-ed-icon");
        later.setAttribute("aria-label", t("right"));
        const y = el("input", "fft-ed-input fft-ed-short");
        y.type = "number";
        y.value = typeof note.y === "number" ? String(note.y) : "";
        y.placeholder = t("annotationY");
        y.setAttribute("aria-label", t("annotationY"));
        y.addEventListener("change", () => write(notes.map((n, k) => (k === i ? { ...n, y: y.value === "" ? undefined : Number(y.value) } : n))));
        const text = el("input", "fft-ed-input");
        text.type = "text";
        text.value = note.text;
        text.setAttribute("aria-label", t("annotationText"));
        text.addEventListener("change", () => write(notes.map((n, k) => (k === i ? { ...n, text: text.value } : n))));
        row.append(earlier, at, later, y, text, button(t("remove"), () => write(notes.filter((_, k) => k !== i)), "fft-ed-chip"));
        list.append(row);
      });
      list.append(button(t("add"), () => write([...notes, { x: categories[Math.floor(categories.length / 2)], text: t("note") }]), "fft-ed-chip"));
      form.append(field(t("annotations"), list, t("annotationsHint")));
    }
  }

  // Step 4: publish.
  function paintPublish() {
    const big = el("div", "fft-ed-published");
    big.setAttribute("aria-label", t("publishedChart"));
    panel.append(big);
    published?.destroy();
    published = createWidget(big, spec, { actions: options.actions ?? ["csv", "image", "copy", "explain"] });
    const json = JSON.stringify(spec, null, 2);
    const src = options.srcOf?.(spec) ?? `widgets/${spec.id ?? "chart"}.json`;
    const codes = embedCodes(spec, src);
    const block = (title: string, text: string, download?: string) => {
      const section = el("section", "fft-ed-code");
      const head = el("div", "fft-ed-row");
      head.append(el("h3", "fft-ed-subtitle", title), button(t("copy"), (b) => void copyText(text, b), "fft-ed-chip"));
      if (download && win) {
        head.append(
          button(t("download"), () => {
            const blob = new Blob([text], { type: "application/json" });
            const href = URL.createObjectURL(blob);
            const a = el("a");
            a.href = href;
            a.download = download;
            doc.body.append(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(href), 1000);
          }, "fft-ed-chip"),
        );
      }
      const pre = el("pre", "fft-ed-pre");
      const code = el("code", undefined, text);
      pre.append(code);
      pre.tabIndex = 0;
      pre.setAttribute("aria-label", title);
      section.append(head, pre);
      return section;
    };
    panel.append(block(t("json"), json, `${spec.id ?? "chart"}.json`));
    panel.append(el("h3", "fft-ed-subtitle", t("embed")));
    panel.append(block(t("embedInline"), codes.inline), block(t("embedSrc"), codes.src), block(t("embedJs"), codes.js));
    panel.append(
      button(t("save"), async (b) => {
        try {
          await saveChart();
          say(b, t("saved"));
        } catch {
          say(b, t("saveFailed"), true);
        }
      }, "fft-ed-button fft-ed-primary"),
    );

    // Add to dashboard: the chart saved, then added as a card to a board kept in the store (an existing one, or a
    // new one under the name given), with a link to the composer to lay it out.
    const adder = el("section", "fft-ed-addboard");
    adder.append(el("h3", "fft-ed-subtitle", cw.addToBoard));
    const choose = el("select", "fft-ed-input");
    choose.setAttribute("aria-label", cw.board);
    const fresh = el("option", undefined, cw.newBoard);
    fresh.value = "";
    choose.append(fresh);
    for (const board of boardsCache) {
      const option = el("option", undefined, board.spec.title || board.id);
      option.value = board.id;
      choose.append(option);
    }
    if (boardsCache[0]) choose.value = boardsCache[0].id;
    const name = el("input", "fft-ed-input");
    name.type = "text";
    name.placeholder = cw.untitledBoard;
    name.setAttribute("aria-label", cw.boardName);
    const nameField = field(cw.boardName, name);
    const sync = () => {
      nameField.hidden = choose.value !== "";
    };
    choose.addEventListener("change", sync);
    sync();
    const result = el("p", "fft-ed-addboard-result");
    result.setAttribute("role", "status");
    adder.append(
      field(cw.board, choose),
      nameField,
      button(cw.addToBoard, async (b) => {
        try {
          await saveChart();
          const board = await addChartToBoard(store, spec, choose.value ? { id: choose.value } : { title: name.value.trim() || cw.untitledBoard });
          await refreshSaved();
          say(b, cw.addedToBoard(board.spec.title || board.id));
          const link = el("a", "fft-ed-link", cw.openComposer);
          link.href = options.composerHref?.(board.id) ?? `composer.html#board=${encodeURIComponent(board.id)}`;
          result.replaceChildren(link);
          result.dataset.board = board.id;
        } catch {
          say(b, t("saveFailed"), true);
        }
      }, "fft-ed-button"),
      result,
    );
    panel.append(adder);
  }

  /** The chart kept: through the host's save when there is one, else in the store "My charts" reads. */
  async function saveChart() {
    if (options.save) await options.save(spec);
    else await store.saveChart({ id: spec.id ?? slugOf(spec.title ?? "chart"), spec, savedAt: new Date().toISOString() });
    await refreshSaved();
  }

  function setSpec(next: WidgetSpec) {
    const inline = next.data?.type === "inline" && Array.isArray(next.data.rows) ? (next.data.rows as Row[]) : [];
    data = { text: JSON.stringify(inline), kind: "json", header: true, transpose: false, name: next.id };
    baseRows = inline;
    order = fieldsOf(inline);
    hidden = [];
    history.length = 0;
    spec = { ...next, data: { type: "inline", rows: inline } };
    sync({ paint: true });
  }

  // ---- Keyboard: undo ----
  const onKey = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
      const active = doc.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (!root.contains(active) && active !== doc.body) return;
      if (undo()) event.preventDefault();
    }
  };
  doc.addEventListener("keydown", onKey);

  // ---- Start ----
  // What is already saved: at once from a synchronous store (this browser's), or as soon as a host's store answers.
  {
    const charts = store.charts();
    const boards = store.boards();
    if (Array.isArray(charts)) savedCache = charts;
    if (Array.isArray(boards)) boardsCache = boards;
    if (!Array.isArray(charts) || !Array.isArray(boards)) void refreshSaved().then(() => paint());
  }
  const opening = options.spec ?? (useHash && win ? readHash(win.location.hash, session).spec : undefined);
  const openingStep = useHash && win ? readHash(win.location.hash, session).step : undefined;
  if (opening) setSpec(opening);
  go(opening ? openingStep ?? 3 : 1);
  if (!opening) void draw();

  return {
    root,
    get spec() {
      return spec;
    },
    get rows() {
      return rows();
    },
    get step() {
      return step;
    },
    go,
    setData: (text, name) => loadText(text, name),
    setSpec,
    undo,
    destroy() {
      doc.removeEventListener("keydown", onKey);
      previewSlot.removeEventListener("fft-select", onSelect);
      previewSlot.removeEventListener("pointerdown", onPointerDown);
      paletteCleanup?.();
      for (const run of cleanups) run();
      preview?.destroy();
      published?.destroy();
      root.remove();
    },
  };
}

/** Adds the editor's stylesheet to a document, once. */
export function ensureEditorStyles(doc: Document): void {
  if (doc.querySelector("style[data-fft-editor]")) return;
  const style = doc.createElement("style");
  style.dataset.fftEditor = "";
  style.textContent = EDITOR_CSS;
  doc.head.append(style);
}

/** The editor's stylesheet: the library's tokens, calm controls, two columns that stack on a phone. */
export const EDITOR_CSS = `
.fft-editor {${LIGHT}
  --fft-ed-field: color-mix(in srgb, var(--fft-text) 3%, var(--fft-surface));
  color: var(--fft-text); font: 14px/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif; container-type: inline-size;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .fft-editor {${DARK}} }
:root[data-theme="dark"] .fft-editor {${DARK}}
.fft-editor *, .fft-editor *::before, .fft-editor *::after { box-sizing: border-box; }
.fft-editor .fft-sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.fft-ed-stepper { display: flex; gap: 8px; margin: 0 0 21px; padding: 0; list-style: none; counter-reset: step; }
.fft-ed-stepper li { flex: 1; min-width: 0; }
.fft-ed-step { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 13px; border: 1px solid var(--fft-border); border-radius: 8px; background: transparent; color: var(--fft-text-secondary); font: inherit; font-size: 13px; cursor: pointer; text-align: left; min-height: 44px; }
.fft-ed-step-number { flex: none; display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; border: 1px solid currentColor; font-size: 12px; font-variant-numeric: tabular-nums; }
.fft-ed-step[aria-current="step"] { color: var(--fft-text); border-color: var(--fft-text); font-weight: 600; }
.fft-ed-step[aria-current="step"] .fft-ed-step-number { background: var(--fft-text); color: var(--fft-surface); border-color: var(--fft-text); }
.fft-ed-step[data-done] .fft-ed-step-number { background: var(--fft-positive); color: var(--fft-surface); border-color: var(--fft-positive); }
.fft-ed-step:disabled { opacity: 0.45; cursor: default; }
.fft-ed-step-compact { display: none; margin: 0 0 13px; font-size: 13px; color: var(--fft-text-secondary); }
.fft-ed-main { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 21px 34px; align-items: start; }
.fft-ed-panel { min-width: 0; display: flex; flex-direction: column; gap: 13px; }
.fft-ed-aside { position: sticky; top: var(--fft-sticky-top, 13px); min-width: 0; }
.fft-ed-preview { min-height: 144px; }
.fft-ed-empty { margin: 0; padding: 34px 21px; border: 1px dashed var(--fft-border); border-radius: 13px; color: var(--fft-text-secondary); text-align: center; }
.fft-ed-title { margin: 0; font-size: 21px; font-weight: 600; letter-spacing: -0.01em; outline: none; }
.fft-ed-subtitle { margin: 13px 0 0; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--fft-text-secondary); }
.fft-ed-hint { margin: 0; font-size: 12px; line-height: 1.45; color: var(--fft-text-secondary); }
.fft-ed-nav { display: flex; gap: 13px; align-items: center; margin-top: 21px; padding-top: 13px; border-top: 1px solid var(--fft-border); }
.fft-ed-nav .fft-ed-primary { margin-left: auto; }
.fft-ed-button, .fft-ed-chip, .fft-ed-segment, .fft-ed-icon, .fft-ed-tab { font: inherit; font-size: 13px; color: var(--fft-text); background: transparent; border: 1px solid var(--fft-border); border-radius: 8px; padding: 6px 13px; cursor: pointer; min-height: 34px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.fft-ed-button:hover, .fft-ed-chip:hover, .fft-ed-icon:hover { background: var(--fft-grid); }
.fft-ed-primary { background: var(--fft-text); color: var(--fft-surface); border-color: var(--fft-text); font-weight: 600; }
.fft-ed-primary:hover { background: var(--fft-text); opacity: 0.9; }
.fft-ed-button:disabled, .fft-ed-icon:disabled { opacity: 0.45; cursor: default; }
.fft-ed-button[data-failed] { color: var(--fft-negative); border-color: var(--fft-negative); }
.fft-ed-chip { border-radius: 21px; padding: 4px 12px; min-height: 32px; color: var(--fft-text-secondary); }
.fft-ed-chip[aria-pressed="true"] { color: var(--fft-text); background: color-mix(in srgb, var(--fft-text) 8%, transparent); border-color: color-mix(in srgb, var(--fft-text) 30%, transparent); }
.fft-ed-icon { padding: 0; width: 34px; }
.fft-editor :is(button, select, input, textarea, a, [tabindex]):focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; }
.fft-ed-drop { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 21px; border: 2px dashed var(--fft-border); border-radius: 13px; background: var(--fft-ed-field); transition: border-color 233ms ease, background-color 233ms ease; }
.fft-ed-drop[data-over] { border-color: var(--fft-accent); background: color-mix(in srgb, var(--fft-accent) 8%, var(--fft-surface)); }
.fft-ed-text { width: 100%; min-height: 144px; resize: vertical; font: 13px/1.5 ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace; color: var(--fft-text); background: var(--fft-surface); border: 1px solid var(--fft-border); border-radius: 8px; padding: 8px 13px; }
.fft-ed-drop .fft-ed-button { align-self: flex-start; }
.fft-ed-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.fft-ed-input, .fft-ed-select, .fft-ed-json { font: inherit; font-size: 14px; color: var(--fft-text); background: var(--fft-surface); border: 1px solid var(--fft-border); border-radius: 8px; padding: 6px 10px; min-height: 34px; min-width: 0; flex: 1 1 160px; }
.fft-ed-select { flex: 0 1 auto; max-width: 100%; }
.fft-ed-short { flex: 0 0 89px; width: 89px; }
.fft-ed-json { width: 100%; font-family: ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace; font-size: 12px; }
.fft-editor .fft-ed-positions { display: flex; flex-direction: column; gap: 5px; }
.fft-editor .fft-ed-position { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.fft-editor .fft-ed-position-label { font-size: 12px; color: var(--fft-text-secondary); min-width: 89px; }
.fft-ed-json[aria-invalid="true"] { border-color: var(--fft-negative); }
.fft-ed-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.fft-ed-field-label { font-size: 12px; color: var(--fft-text-secondary); }
.fft-ed-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.fft-ed-check { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px 4px 8px; border: 1px solid var(--fft-border); border-radius: 21px; font-size: 13px; color: var(--fft-text-secondary); cursor: pointer; min-height: 32px; }
.fft-ed-check:has(input:checked) { color: var(--fft-text); background: color-mix(in srgb, var(--fft-text) 8%, transparent); border-color: color-mix(in srgb, var(--fft-text) 30%, transparent); }
.fft-ed-check input { margin: 0; accent-color: var(--fft-accent); }
.fft-ed-switch-wrap { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; min-height: 34px; }
.fft-ed-switch { position: relative; width: 36px; height: 20px; padding: 0; border: 0; border-radius: 10px; background: var(--fft-muted); cursor: pointer; transition: background-color 233ms ease; }
.fft-ed-switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--fft-surface); transition: transform 233ms ease; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }
.fft-ed-switch[aria-checked="true"] { background: var(--fft-accent); }
.fft-ed-switch[aria-checked="true"]::after { transform: translateX(16px); }
.fft-ed-segmented { display: inline-flex; max-width: 100%; border: 1px solid var(--fft-border); border-radius: 8px; overflow: auto; scrollbar-width: none; }
.fft-ed-segment { border: 0; border-radius: 0; color: var(--fft-text-secondary); white-space: nowrap; }
.fft-ed-segment[aria-checked="true"] { color: var(--fft-text); background: color-mix(in srgb, var(--fft-text) 8%, transparent); font-weight: 600; }
.fft-ed-count { margin: 0 0 0 auto; font-size: 13px; color: var(--fft-text-secondary); font-variant-numeric: tabular-nums; }
.fft-ed-table-wrap { overflow: auto; max-height: 377px; border: 1px solid var(--fft-border); border-radius: 8px; }
.fft-ed-table { border-collapse: collapse; width: 100%; font-size: 13px; font-variant-numeric: tabular-nums; }
.fft-ed-table caption { text-align: left; padding: 8px 13px; font-size: 12px; color: var(--fft-text-secondary); }
.fft-ed-table th { position: sticky; top: 0; z-index: 1; background: var(--fft-surface); text-align: left; padding: 6px 13px; border-bottom: 1px solid var(--fft-border); font-weight: 600; white-space: nowrap; }
.fft-ed-table td { padding: 4px 13px; border-bottom: 1px solid var(--fft-grid); white-space: nowrap; max-width: 240px; overflow: hidden; text-overflow: ellipsis; }
.fft-ed-table .fft-num { text-align: right; }
.fft-ed-col-name { display: block; font-size: 13px; }
.fft-ed-kind { display: inline-flex; align-items: center; gap: 4px; margin-top: 2px; padding: 0 8px; border-radius: 13px; font-size: 11px; font-weight: 600; letter-spacing: 0.02em; line-height: 18px; color: var(--fft-text); background: color-mix(in srgb, var(--fft-text) 8%, transparent); }
.fft-ed-kind::before { content: "A"; font-family: ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace; font-weight: 700; opacity: 0.8; }
.fft-ed-kind[data-kind="number"] { background: color-mix(in srgb, var(--fft-positive) 16%, transparent); }
.fft-ed-kind[data-kind="number"]::before { content: "#"; }
.fft-ed-kind[data-kind="date"] { background: color-mix(in srgb, var(--fft-accent) 16%, transparent); }
.fft-ed-kind[data-kind="date"]::before { content: "◷"; }
.fft-ed-columns { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.fft-ed-column { padding: 13px; border: 1px solid var(--fft-border); border-radius: 13px; background: var(--fft-ed-field); }
.fft-ed-column[data-dragging] { opacity: 0.5; }
.fft-ed-column[data-over] { border-color: var(--fft-accent); box-shadow: 0 -2px 0 0 var(--fft-accent); }
.fft-ed-column[data-hidden] { opacity: 0.6; }
.fft-ed-column-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.fft-ed-handle { cursor: grab; color: var(--fft-text-secondary); letter-spacing: -2px; user-select: none; }
.fft-ed-column-head code { font-size: 13px; }
.fft-ed-moves { margin-left: auto; display: inline-flex; gap: 4px; }
.fft-ed-column-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px 13px; align-items: end; }
.fft-ed-sub { display: flex; flex-wrap: wrap; gap: 8px 13px; align-items: end; grid-column: 1 / -1; }
.fft-ed-sub:empty { display: none; }
.fft-ed-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--fft-border); }
.fft-ed-tab { border: 0; border-bottom: 2px solid transparent; border-radius: 0; color: var(--fft-text-secondary); padding: 8px 13px; margin-bottom: -1px; }
.fft-ed-tab[aria-selected="true"] { color: var(--fft-text); border-bottom-color: var(--fft-text); font-weight: 600; }
.fft-ed-pane { display: flex; flex-direction: column; gap: 13px; }
.fft-ed-form { display: flex; flex-direction: column; gap: 13px; }
.fft-ed-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(144px, 1fr)); gap: 8px; }
.fft-ed-type { display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid var(--fft-border); border-radius: 13px; background: var(--fft-ed-field); color: var(--fft-text); font: inherit; text-align: left; cursor: pointer; min-width: 0; }
.fft-ed-type:hover { border-color: color-mix(in srgb, var(--fft-text) 30%, transparent); }
.fft-ed-type[aria-pressed="true"] { border-color: var(--fft-text); box-shadow: inset 0 0 0 1px var(--fft-text); }
.fft-ed-type[data-unfit] { opacity: 0.6; }
.fft-ed-type-name { font-size: 13px; font-weight: 600; }
.fft-ed-type-why { font-size: 11px; line-height: 1.4; color: var(--fft-text-secondary); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.fft-ed-thumb { position: relative; height: 89px; overflow: hidden; border-radius: 8px; background: var(--fft-surface); pointer-events: none; }
.fft-ed-thumb-slot { position: absolute; left: 0; top: 0; width: 200%; transform: scale(0.5); transform-origin: 0 0; }
.fft-ed-thumb .fft-widget { border: 0; box-shadow: none; background: transparent; padding: 8px; }
.fft-ed-thumb .fft-widget .fft-toolbar, .fft-ed-thumb .fft-widget .fft-ref, .fft-ed-thumb .fft-widget .fft-legend, .fft-ed-thumb .fft-widget .fft-header { display: none; }
.fft-ed-thumb-name { position: absolute; inset: 0; display: grid; place-items: center; font-size: 21px; font-weight: 600; color: var(--fft-text-secondary); text-transform: uppercase; }
.fft-ed-palette { padding: 8px; border: 1px solid var(--fft-border); border-radius: 8px; }
.fft-ed-list { display: flex; flex-direction: column; gap: 8px; }
.fft-ed-saved { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.fft-ed-saved li { display: flex; align-items: center; gap: 8px; }
.fft-ed-saved-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fft-ed-addboard { display: flex; flex-direction: column; gap: 8px; margin-top: 21px; padding-top: 13px; border-top: 1px solid var(--fft-grid); }
.fft-ed-addboard-result { margin: 0; min-height: 21px; font-size: 13px; }
.fft-ed-link { color: var(--fft-accent); }
.fft-ed-issues { margin: 8px 0 0; padding: 0; list-style: none; font-size: 12px; color: var(--fft-text-secondary); }
.fft-ed-issues:empty { display: none; }
.fft-ed-issues-title { font-weight: 600; color: var(--fft-text); }
.fft-ed-issue { color: var(--fft-negative); }
.fft-ed-published { margin-bottom: 13px; }
.fft-ed-code { display: flex; flex-direction: column; gap: 5px; }
.fft-ed-code .fft-ed-row { justify-content: space-between; }
.fft-ed-pre { margin: 0; padding: 13px; max-height: 233px; overflow: auto; border: 1px solid var(--fft-border); border-radius: 8px; background: var(--fft-ed-field); font: 12px/1.5 ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace; white-space: pre; }
.fft-editor .fft-legend li[role="button"] { cursor: pointer; }
.fft-editor [data-annotation] { cursor: grab; }
.fft-editor [data-annotation][data-dragging] { cursor: grabbing; opacity: 0.7; }
@container (max-width: 760px) {
  .fft-ed-main { grid-template-columns: minmax(0, 1fr); }
  .fft-ed-aside { position: static; order: -1; }
  .fft-ed-stepper { display: none; }
  .fft-ed-step-compact { display: block; }
  .fft-ed-column-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) { .fft-editor * { transition: none !important; } }
/* Ordered fields, grouped inputs, fixed colors and status rules. */
.fft-ed-group { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px 13px; }
.fft-ed-group > .fft-ed-chips { flex-basis: 100%; }
.fft-ed-order { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; flex-basis: 100%; }
.fft-ed-order-item { display: flex; align-items: center; gap: 8px; padding: 3px 5px 3px 8px; border: 1px solid var(--fft-border); border-radius: 8px; background: var(--fft-ed-field); cursor: grab; }
.fft-ed-order-item[data-dragging] { opacity: 0.5; }
.fft-ed-order-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.fft-ed-order-item .fft-ed-icon { min-height: 28px; padding: 2px 8px; }
.fft-ed-geo-url { min-width: 220px; flex: 1; }
.fft-ed-colors { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 5px 13px; }
.fft-ed-color { display: flex; align-items: center; gap: 8px; min-width: 0; }
.fft-ed-color-input { inline-size: 28px; block-size: 28px; padding: 0; border: 1px solid var(--fft-border); border-radius: 8px; background: none; cursor: pointer; }
.fft-ed-color-input[data-unset] { opacity: 0.45; }
.fft-ed-color-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.fft-ed-color-clear { min-height: 28px; padding: 2px 8px; }
.fft-ed-rag { border: 1px solid var(--fft-border); border-radius: 13px; padding: 8px 13px; }
.fft-ed-rag-title { cursor: pointer; font-weight: 600; font-size: 13px; padding: 5px 0; }
.fft-ed-rag-rule { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px 13px; padding: 8px 0; border-top: 1px solid var(--fft-border); }
.fft-ed-rag-add { margin-top: 8px; }
.fft-ed-insert { font-family: ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace; font-size: 12px; min-height: 28px; padding: 2px 8px; }
`;
