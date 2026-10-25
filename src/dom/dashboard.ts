/**
 * The dashboard runtime: draws a grid of widgets from a `DashboardSpec`, with
 * one filter row above them that scopes every widget whose data has the field.
 *
 * @module
 */
import { RANGE_OPTIONS, rangeStart } from "../core/dashboard.ts";
import { getPreset } from "../core/presets.ts";
import type { DashboardFollow, DashboardSpec } from "../core/dashboard.ts";
import { fieldLabel, formatValue } from "../core/display.ts";
import { fork } from "../core/fork.ts";
import { runPipeline } from "../core/pipeline.ts";
import { compareValues } from "../core/transforms.ts";
import { getBlock, hasBlock } from "../core/registry.ts";
import { categoryField } from "../core/view-context.ts";
import { isForecast } from "../core/views.ts";
import type { Row, TransformSpec, WidgetSpec } from "../core/types.ts";
import type { WidgetAction } from "./export.ts";
import { ensureStyles } from "./styles.ts";
import { createWidget } from "./widget.ts";
import type { Widget } from "./widget.ts";
import { wordsFor } from "../core/words.ts";

/** Options for `createDashboard`. */
export interface DashboardOptions {
  /** Stored widgets by id, for cells that name a widget. */
  widgets?: Record<string, WidgetSpec>;
  /** Or a lookup function, called for ids not in `widgets`. */
  resolve?(id: string): WidgetSpec | undefined;
  /** Export buttons for every widget. See `WidgetOptions.actions`. */
  actions?: WidgetAction[];
  /** `fetch` for `url` sources. */
  fetch?: typeof fetch;
  /** Called once per cell after its widget mounts, to add the host's own controls. */
  decorate?(cell: HTMLElement, id: string, widget: Widget): void;
  /**
   * Pins the filter row (period, filters and section links) to the top of the
   * page while it scrolls. Set `--fft-board-bg` on the page to its own background
   * so the pinned row blends in.
   */
  sticky?: boolean;
  /**
   * Keeps the chosen section in the address (#<section id>), so a link opens the
   * board on it and reload keeps it. Off by default, so a host page's address is
   * left alone.
   */
  hash?: boolean;
  /** Opens every widget's "How to read it" guide from the start. */
  guides?: boolean;
  /**
   * Clicking a mark filters every other widget whose data has the mark's field to its value, with a chip in the
   * filter row (and Escape) to clear it. Default: the board's own `crossFilter`, which defaults to true.
   */
  crossFilter?: boolean;
}

/** The filter a click on a mark set: the field, its value, and the widget clicked (which keeps its data and highlights the value). */
export interface CrossFilter {
  field: string;
  value: unknown;
  source?: string;
}

/** A live dashboard. */
export interface Dashboard {
  root: HTMLElement;
  /** Live widgets by cell id (the widget id, or `cell-<index>` for inline specs). */
  widgets: Map<string, Widget>;
  /** Settles when the filter row is built and every widget has drawn. */
  ready: Promise<void>;
  /** Sets a filter (`null` clears it) and redraws the widgets it scopes. */
  setFilter(field: string, value: unknown): Promise<void>;
  /** Picks a period of the time range ("3M", "YTD", "All") and redraws the widgets it scopes. */
  setRange(option: string): Promise<void>;
  /** Shows one section (by title or id) with its heading and cards, or every section again with `null`. Throws for an unknown section. */
  setSection(section: string | null): void;
  /** Opens or closes the "How to read it" guide on every widget at once. */
  setGuides(open: boolean): void;
  /**
   * Sets the click filter: every widget whose data has `field` keeps only rows with `value`, except `source`, which
   * keeps its data and highlights the value. `null` clears it. Fires `fft-crossfilter` on the board's root.
   */
  setCrossFilter(field: string | null, value?: unknown, source?: string): Promise<void>;
  /** The click filter in force, or null. */
  crossFilter(): CrossFilter | null;
  /** Merges a patch into every widget's spec (merge patch rules), for example a style preset. Survives filtering. */
  setOverride(patch: Record<string, unknown>): Promise<void>;
  destroy(): void;
}

/**
 * Draws a dashboard inside `target`.
 *
 * @example
 * createDashboard(document.querySelector("#board")!, {
 *   title: "Sales",
 *   filters: [{ field: "region", label: "Region" }],
 *   widgets: [{ widget: "revenue-kpi" }, { widget: "revenue-by-region", span: 2 }],
 * }, { widgets: storedSpecs, actions: ["csv", "image"] });
 */
export function createDashboard(target: HTMLElement, spec: DashboardSpec, options: DashboardOptions = {}): Dashboard {
  const doc = target.ownerDocument;
  ensureStyles(doc);
  ensureBoardStyles(doc);
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) => {
    const node = doc.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const columns = spec.columns ?? 3;
  const root = el("section", "fft-dashboard");
  if (options.sticky) root.dataset.sticky = "";
  // The as-of line: when the data was last true. A {latest} token waits for the widgets' dates.
  const asOf = typeof spec.asOf === "string" && spec.asOf.trim() !== "" ? el("p", "fft-dashboard-asof") : undefined;
  // Dates in the as-of line read in the board's language, the same as its words ("As of", "Data to"): the widgets'
  // locale, else the page's, never the browser's own (which wrote "Data to octobre 2026" on an English page).
  const firstSpec = spec.widgets.map((cell) => cell.spec ?? (cell.widget ? options.widgets?.[cell.widget] : undefined)).find((s) => s?.locale);
  const boardLocale = firstSpec?.locale ?? (target.ownerDocument.documentElement.lang || "en");
  // The board's own words (filter row, share and print tools, notes), in the same language.
  const B = wordsFor(boardLocale).board;
  if (asOf) asOf.textContent = asOfText(spec.asOf as string, "", boardLocale);
  if (spec.title || spec.subtitle || asOf) {
    const header = el("header", "fft-dashboard-header");
    if (spec.title) header.append(el("h2", "fft-dashboard-title", spec.title));
    if (spec.subtitle) header.append(el("p", "fft-dashboard-subtitle", spec.subtitle));
    if (asOf) header.append(asOf);
    root.append(header);
  }
  // On paper the filter row is gone, so one line says what the page shows: the section, filters, period and click filter.
  const printState = el("p", "fft-print-state");
  printState.setAttribute("aria-hidden", "true");
  root.append(printState);
  const filterRow = el("div", "fft-filters");
  const grid = el("div", "fft-dashboard-grid");
  grid.style.setProperty("--fft-cols", String(columns));
  root.append(filterRow, grid);
  target.append(root);

  const widgets = new Map<string, Widget>();
  const originals = new Map<string, WidgetSpec>();
  /** Widgets that follow the selection, with the value their own spec shows before anything is picked. */
  const follows = new Map<string, { follow: DashboardFollow; key: string; authored: unknown }>();
  /** Each widget's slot by cell id, for the "Not filtered by" note. */
  const slots = new Map<string, HTMLElement>();
  const rawFields = new Map<string, Promise<Set<string>>>();
  /** Each widget's fields once known, for what has to be answered at once, such as why a card came out empty. */
  const knownFields = new Map<string, Set<string>>();
  const rawRows = new Map<string, Promise<Row[]>>();
  const active = new Map<string, unknown>();
  let override: Record<string, unknown> = {};
  /** The click filter, when one is set. */
  let cross: CrossFilter | undefined;
  const crossOn = options.crossFilter ?? spec.crossFilter ?? true;
  /** The section in view, for the address. */
  let shownSection: string | null = null;
  const range = spec.range;
  const rangeFields = range ? (Array.isArray(range.field) ? range.field : [range.field]) : [];
  const periods = range?.options ?? RANGE_OPTIONS;
  let period = range ? (range.default ?? (periods.includes("All") ? "All" : (periods.at(-1) ?? "All"))) : "All";
  /** The latest actual date across every widget whose data has the range field: the end every period counts back from. Forecast rows never count. */
  let latestDate: Promise<string> | undefined;
  const latest = () => (latestDate ??= (async () => {
    if (!range) return "";
    let max = "";
    for (const [id, rows] of rawRows) {
      const fields = await rawFields.get(id);
      const field = rangeFields.find((f) => fields?.has(f));
      if (!field) continue;
      const forecast = originals.get(id)?.view?.forecast;
      for (const row of await rows) {
        if (typeof forecast === "string" && isForecast(row[forecast])) continue;
        const value = row[field];
        if (typeof value === "string" && /^\d{4}-\d{2}/.test(value) && value > max) max = value;
      }
    }
    return max;
  })());

  const sections: { node: HTMLElement; title: string }[] = [];
  const usedIds = new Set<string>();
  /** A section's id: the board id and the title in lowercase words joined by hyphens, counted up when taken on the page. */
  const sectionId = (title: string) => {
    const base = `${spec.id ?? "board"}-${title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "section"}`;
    let id = base;
    for (let n = 2; usedIds.has(id) || doc.getElementById(id); n++) id = `${base}-${n}`;
    usedIds.add(id);
    return id;
  };

  /** The grid items each section shows: its heading and the cells after it, up to the next heading. */
  const members = new Map<HTMLElement, Set<HTMLElement>>();
  let opened: Set<HTMLElement> | undefined;
  /** Each widget's slot, so stepping can skip the ones a section filter hides. */
  const slotOf = new Map<Widget, HTMLElement>();
  /** The expanded view steps through the board's widgets in grid order, sections skipped, and only those in view. */
  const neighbors = (widget: Widget) => {
    const list = [...widgets.values()].filter((other) => !slotOf.get(other)?.hidden);
    const i = list.indexOf(widget);
    return { previous: list[i - 1], next: list[i + 1], position: i + 1, total: list.length };
  };

  spec.widgets.forEach((cell, index) => {
    if (cell.section) {
      // A section heading: a full-width row that groups the cells after it.
      const section = el("div", "fft-board-section");
      section.id = sectionId(cell.section);
      section.style.gridColumn = "1 / -1";
      section.append(el("h3", "", cell.section));
      if (cell.description) section.append(el("p", "", cell.description));
      grid.append(section);
      sections.push({ node: section, title: cell.section });
      opened = new Set([section]);
      members.set(section, opened);
      return;
    }
    const id = cell.widget ?? `cell-${index}`;
    const span = Math.min(columns, Math.max(1, cell.span ?? 1));
    const slot = el("div", "fft-cell-slot");
    slot.dataset.widget = id;
    slot.dataset.span = String(span);
    slot.style.gridColumn = `span ${span}`;
    const mount = el("div", "fft-board-cell");
    slot.append(mount);
    grid.append(slot);
    opened?.add(slot);
    const found = cell.spec ?? (cell.widget ? (options.widgets?.[cell.widget] ?? options.resolve?.(cell.widget)) : undefined);
    if (!found) {
      mount.append(el("p", "fft-cell-missing", B.noWidget(String(cell.widget ?? index))));
      return;
    }
    originals.set(id, found);
    slots.set(id, slot);
    if (cell.follow?.field) {
      const key = cell.follow.as ?? cell.follow.field;
      // The value the widget shows as written: its own filter on the key, else the default the cell names.
      const own = (found.transform ?? []).find((step) => step.type === "filter" && step.field === key && (step.op === undefined || step.op === "=="));
      follows.set(id, { follow: cell.follow, key, authored: own ? own.value : cell.follow.default });
      slot.dataset.follows = cell.follow.field;
    }
    const rows = runPipeline({ data: found.data }, { fetch: options.fetch }).catch(() => [] as Row[]);
    rawRows.set(id, rows);
    rawFields.set(id, rows.then((list) => new Set(list.flatMap((row) => Object.keys(row)))));
    void rawFields.get(id)?.then((fields) => knownFields.set(id, fields));
    const widget = createWidget(mount, found, { actions: options.actions, fetch: options.fetch, neighbors, guide: options.guides, emptyNote: () => emptyNote(id) });
    widgets.set(id, widget);
    slotOf.set(widget, slot);
    options.decorate?.(mount, id, widget);
  });

  // Section filter: with two or more sections, the filter row offers All and each section, like the period control.
  const nav = sections.length > 1 ? el("div", "fft-board-nav") : undefined;
  const sectionButtons: HTMLButtonElement[] = [];
  if (nav) {
    nav.setAttribute("role", "group");
    nav.setAttribute("aria-label", B.sections);
    for (const entry of [null, ...sections]) {
      const button = el("button", "", entry ? entry.title : B.all);
      // The label again, for the stylesheet to reserve its semibold width, so choosing a chip never shifts the row.
      button.dataset.label = button.textContent ?? "";
      button.type = "button";
      if (entry) button.dataset.section = entry.node.id;
      button.setAttribute("aria-pressed", String(entry === null));
      button.addEventListener("click", () => choose(entry?.node ?? null));
      sectionButtons.push(button);
      nav.append(button);
    }
    filterRow.append(nav);
  }
  // When the section links scroll sideways, the edge with more to see fades out: a cue to swipe, and no chip cut hard.
  const edges = () => {
    if (!nav) return;
    const more = nav.scrollWidth - nav.clientWidth;
    if (more <= 1) delete nav.dataset.scroll;
    else nav.dataset.scroll = nav.scrollLeft <= 1 ? "start" : nav.scrollLeft >= more - 1 ? "end" : "middle";
  };
  nav?.addEventListener("scroll", edges, { passive: true });
  const navSize = nav && typeof ResizeObserver === "function" ? new ResizeObserver(edges) : undefined;
  if (nav) navSize?.observe(nav);
  edges();

  /** Shows one section's heading and cards, or everything for null; the board starts again from its top. */
  function choose(section: HTMLElement | null) {
    const keep = section ? members.get(section) : undefined;
    for (const child of grid.children) (child as HTMLElement).hidden = keep ? !keep.has(child as HTMLElement) : false;
    if (section) root.dataset.section = section.id;
    else delete root.dataset.section;
    sectionButtons.forEach((button) => {
      const on = (button.dataset.section ?? null) === (section?.id ?? null);
      button.setAttribute("aria-pressed", String(on));
      // On narrow screens the buttons scroll sideways: center the chosen one. CSS owns the motion (scroll-behavior).
      if (on && nav && nav.scrollWidth > nav.clientWidth) {
        const box = nav.getBoundingClientRect();
        const chip = button.getBoundingClientRect();
        nav.scrollBy({ left: chip.left - box.left - (box.width - chip.width) / 2 });
      }
    });
    shownSection = section?.id ?? null;
    writeHash();
    void writeState();
    if (root.getBoundingClientRect().top < 0) root.scrollIntoView?.({ block: "start" });
  }

  /** The filters set in the row, by field, with nothing for "All". */
  const chosenFilters = () => Object.fromEntries([...active.entries()].filter(([, value]) => value !== null && value !== undefined));
  const firstPeriod = period;

  /**
   * The address, when the board keeps it: the section in view, the click filter, the filters and the period, as
   * `#<section>&cf=<filter>&f=<filters>&p=<period>`. Values are JSON so numbers stay numbers through a reload, and a
   * copied link opens the board exactly as it was.
   */
  function writeHash() {
    if (!options.hash) return;
    const view = doc.defaultView;
    if (!view) return;
    const filters = chosenFilters();
    const parts = [
      shownSection,
      cross ? `cf=${encodeURIComponent(JSON.stringify([cross.field, cross.value, cross.source ?? null]))}` : null,
      Object.keys(filters).length ? `f=${encodeURIComponent(JSON.stringify(filters))}` : null,
      period !== firstPeriod ? `p=${encodeURIComponent(period)}` : null,
    ].filter(Boolean);
    view.history.replaceState(view.history.state, "", parts.length ? `#${parts.join("&")}` : `${view.location.pathname}${view.location.search}`);
  }

  /** The parts of the address: the section named, and the click filter, filters and period written there. */
  function readHash(): { section: string; cross?: CrossFilter; filters?: Record<string, unknown>; period?: string } {
    const parts = (doc.defaultView?.location.hash.slice(1) ?? "").split("&");
    let found: CrossFilter | undefined;
    let filters: Record<string, unknown> | undefined;
    let chosen: string | undefined;
    const named = parts.filter((part) => {
      // A part that does not read is ignored, like an unknown section.
      try {
        if (part.startsWith("cf=")) {
          const [field, value, source] = JSON.parse(decodeURIComponent(part.slice(3))) as [unknown, unknown, unknown];
          if (typeof field === "string" && field) found = { field, value, ...(typeof source === "string" ? { source } : {}) };
          return false;
        }
        if (part.startsWith("f=")) {
          const read = JSON.parse(decodeURIComponent(part.slice(2))) as unknown;
          if (read && typeof read === "object" && !Array.isArray(read)) filters = read as Record<string, unknown>;
          return false;
        }
        if (part.startsWith("p=")) {
          const option = decodeURIComponent(part.slice(2));
          if (periods.includes(option)) chosen = option;
          return false;
        }
      } catch {
        return false;
      }
      return true;
    });
    return { section: named[0] ?? "", ...(found ? { cross: found } : {}), ...(filters ? { filters } : {}), ...(chosen ? { period: chosen } : {}) };
  }

  // An address naming one of this board's sections opens the board on it, and the board follows the address as it
  // changes (links, back and forward): a section's id shows it, an empty address shows them all, anything else is left alone.
  let pendingCross: CrossFilter | undefined;
  let pendingFilters: Record<string, unknown> | undefined;
  const fromAddress = (initial: boolean) => {
    const { section: named, cross: wanted, filters, period: chosen } = readHash();
    if (nav) {
      const match = sections.find(({ node }) => node.id === named);
      if (match) choose(match.node);
      else if (!named && !initial) choose(null);
    }
    // Filters and the period: on first load they are set before anything draws; later, only what changed redraws.
    if (initial) {
      if (chosen) period = chosen;
      pendingFilters = filters;
    } else {
      const now = chosenFilters();
      const wantedFilters = filters ?? {};
      for (const field of new Set([...Object.keys(now), ...Object.keys(wantedFilters)])) {
        if (JSON.stringify(now[field] ?? null) !== JSON.stringify(wantedFilters[field] ?? null)) void setFilter(field, wantedFilters[field] ?? null);
      }
      const nextPeriod = chosen ?? firstPeriod;
      if (range && nextPeriod !== period) void setRange(nextPeriod);
    }
    // The click filter follows the address too; on first load it waits until the widgets know their fields.
    if (!crossOn) return;
    if (initial) {
      pendingCross = wanted;
      return;
    }
    const same = wanted && cross && wanted.field === cross.field && wanted.value === cross.value && wanted.source === cross.source;
    if (!same && (wanted || cross)) void setCrossFilter(wanted?.field ?? null, wanted?.value, wanted?.source);
  };
  const onHash = () => fromAddress(false);
  if (options.hash) {
    fromAddress(true);
    doc.defaultView?.addEventListener("hashchange", onHash);
  }

  // A pinned filter row wraps to several lines on a phone: track its height so a jumped-to section scrolls clear of it.
  // The page gets the height too: it scroll-pads by it, so a card brought into view by Tab never hides beneath the row (WCAG 2.4.11).
  const page = doc.documentElement;
  const barSize =
    options.sticky && typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          const height = `${filterRow.offsetHeight}px`;
          root.style.setProperty("--fft-filters-height", height);
          page.style.setProperty("--fft-filters-height", height);
        })
      : undefined;
  barSize?.observe(filterRow);
  // A zero-height marker where the row sits in the page: once it scrolls above the top, the row is stuck and shows an edge.
  let stuckSpy: IntersectionObserver | undefined;
  if (options.sticky && typeof IntersectionObserver === "function") {
    const sentinel = el("div", "fft-filters-sentinel");
    sentinel.setAttribute("aria-hidden", "true");
    root.insertBefore(sentinel, filterRow);
    stuckSpy = new IntersectionObserver(([entry]) => {
      if (entry) filterRow.toggleAttribute("data-stuck", !entry.isIntersecting && (entry.boundingClientRect?.top ?? -1) < 0);
    });
    stuckSpy.observe(sentinel);
  }

  /** The value a following widget shows: the click filter on its field, else the row's filter on it, else none (its own). */
  function followedValue(id: string): unknown {
    const entry = follows.get(id);
    if (!entry) return undefined;
    if (cross && cross.field === entry.follow.field && cross.source !== id) return cross.value;
    const chosen = active.get(entry.follow.field);
    return chosen === null || chosen === undefined ? undefined : chosen;
  }

  /**
   * A following widget's spec: its own filter on the key replaced by the value picked (or the cell's default), and its
   * title, subtitle and description naming that value where they named the one written in the spec.
   */
  function followed(id: string, base: WidgetSpec, fallback?: unknown): WidgetSpec {
    const entry = follows.get(id);
    if (!entry) return base;
    const value = fallback !== undefined ? fallback : (followedValue(id) ?? entry.authored);
    if (value === undefined || value === null) return base;
    const steps = (base.transform ?? []).filter((step) => !(step.type === "filter" && step.field === entry.key && (step.op === undefined || step.op === "==")));
    const was = entry.authored === undefined || entry.authored === null ? "" : String(entry.authored);
    const now = String(value);
    const rename = (text: string | undefined) => (text && was && was !== now ? text.split(was).join(now) : text);
    const words = Object.fromEntries((["title", "subtitle", "description"] as const).filter((key) => typeof base[key] === "string").map((key) => [key, rename(base[key])]));
    return fork(base, { ...words, transform: [{ type: "filter", field: entry.key, op: "==", value }, ...steps] });
  }

  /**
   * For a card that follows a selection: the value to show when the one it would show is filtered out of its own rows
   * (Aldana Holdings is Corporate, so under Segment: Affluent), the first value still in view; undefined when the
   * chosen one is there, or nothing is left at all.
   */
  async function followFallback(id: string, steps: TransformSpec[]): Promise<unknown> {
    const entry = follows.get(id);
    if (!entry) return undefined;
    const value = followedValue(id) ?? entry.authored;
    const own = fork(originals.get(id) as WidgetSpec, override);
    const free = { ...own, transform: [...steps, ...(own.transform ?? []).filter((step) => !(step.type === "filter" && step.field === entry.key && (step.op === undefined || step.op === "==")))] };
    const rows = await runPipeline(free, { fetch: options.fetch }).catch(() => [] as Row[]);
    if (!rows.length || rows.some((row) => String(row[entry.key]) === String(value))) return undefined;
    return rows[0]?.[entry.key];
  }

  async function specFor(id: string): Promise<WidgetSpec> {
    const fields = (await rawFields.get(id)) ?? new Set<string>();
    const steps: TransformSpec[] = [...active.entries()]
      .filter(([field, value]) => value !== null && value !== undefined && fields.has(field))
      .map(([field, value]) => ({ type: "filter", field, op: "==", value }));
    const field = rangeFields.find((f) => fields.has(f));
    const from = field ? rangeStart(period, await latest()) : null;
    if (field && from) steps.push({ type: "filter", field, op: ">=", value: from });
    const base = followed(id, fork(originals.get(id) as WidgetSpec, override), follows.has(id) && steps.length ? await followFallback(id, steps) : undefined);
    // The click filter: the clicked widget keeps its rows and lights the value up; every other widget with the field keeps only its rows.
    let shaped = base;
    if (cross && fields.has(cross.field)) {
      if (id === cross.source) {
        if (canHighlight(base.view, cross.field)) shaped = fork(base, { view: { highlight: String(cross.value) } });
      } else steps.push({ type: "filter", field: cross.field, op: "==", value: cross.value });
    }
    return steps.length ? fork(shaped, { transform: [...steps, ...(shaped.transform ?? [])] }) : shaped;
  }

  async function redraw() {
    void writeState();
    await Promise.all([...widgets.entries()].map(async ([id, widget]) => widget.setSpec(await specFor(id))));
  }

  /** What a filter is called on screen: its row label, the period's label, or the field in words. */
  const filterName = (field: string) => spec.filters?.find((filter) => filter.field === field)?.label ?? fieldLabel(field);

  /**
   * Honesty about scope: each card that a filter set right now cannot reach (its data has no such field) says so,
   * quietly: "Not filtered by Segment". A card that follows the click filter's field counts as reached by it.
   */
  async function markUnreached() {
    const filters = chosenFilters();
    await Promise.all(
      [...slots.entries()].map(async ([id, slot]) => {
        const fields = (await rawFields.get(id)) ?? new Set<string>();
        const missed = Object.keys(filters).filter((field) => !fields.has(field)).map(filterName);
        if (range && period !== "All" && !rangeFields.some((field) => fields.has(field))) missed.push(range.label ?? B.period);
        if (cross && cross.source !== id && !fields.has(cross.field) && follows.get(id)?.follow.field !== cross.field) missed.push(fieldLabel(cross.field));
        let note = slot.querySelector<HTMLElement>(":scope > .fft-unfiltered");
        if (!missed.length) {
          note?.remove();
          delete slot.dataset.unfiltered;
          return;
        }
        if (!note) {
          note = el("p", "fft-unfiltered");
          slot.append(note);
        }
        const names = [...new Set(missed)];
        note.textContent = B.notFilteredBy(names);
        slot.dataset.unfiltered = "";
      }),
    );
  }

  /** The printed state line and the as-of date: what the page shows, in words. */
  async function writeState() {
    const parts: string[] = [];
    const section = sections.find(({ node }) => node.id === shownSection);
    if (section) parts.push(B.section(section.title));
    for (const [field, value] of Object.entries(chosenFilters())) parts.push(`${filterName(field)}: ${formatValue(value, undefined, undefined)}`);
    if (range) parts.push(`${range.label ?? B.period}: ${period === "All" ? B.all : period}`);
    if (cross) parts.push(`${fieldLabel(cross.field)}: ${formatValue(cross.value, undefined, undefined)}`);
    const asOfLine = asOf ? asOfText(spec.asOf as string, range ? await latest() : "", boardLocale) : "";
    if (asOf) asOf.textContent = asOfLine;
    printState.textContent = [spec.title, parts.length ? parts.join(" · ") : B.unfiltered, asOfLine].filter(Boolean).join(" · ");
    await markUnreached();
  }

  /** Whether a view lights up categories with `highlight` (bars and the like), and draws this field as its categories. */
  function canHighlight(view: WidgetSpec["view"], field: string): boolean {
    if (!hasBlock("view", view.type)) return false;
    const option = getBlock("view", view.type).options.highlight;
    // Lines and areas highlight series (fields), not categories; their option says so.
    return Boolean(option && /^Category/.test(option.description)) && ["label", "x"].some((name) => view[name] === field);
  }

  // The chip that names the click filter and clears it: "Region: East x".
  const chip = el("button", "fft-crossfilter");
  chip.type = "button";
  chip.hidden = true;
  chip.addEventListener("click", () => void setCrossFilter(null));
  let rowHiddenBefore = false;

  async function setCrossFilter(field: string | null, value?: unknown, source?: string) {
    cross = field === null ? undefined : { field, value, ...(source ? { source } : {}) };
    if (cross) {
      const text = `${fieldLabel(cross.field)}: ${formatValue(cross.value, undefined, undefined)}`;
      chip.replaceChildren(el("span", "fft-crossfilter-text", text), el("span", "fft-crossfilter-x", "\u00d7"));
      chip.setAttribute("aria-label", B.clearFilter(text));
      chip.title = B.clearThis;
      if (chip.hidden) rowHiddenBefore = filterRow.hidden === true;
      // The chip joins the filter row the first time a click sets a filter, after the period and filters, before the sections.
      if (!chip.isConnected) filterRow.insertBefore(chip, nav ?? null);
      chip.hidden = false;
      filterRow.hidden = false;
    } else if (!chip.hidden) {
      chip.hidden = true;
      filterRow.hidden = rowHiddenBefore;
    }
    writeHash();
    root.dispatchEvent(new CustomEvent<CrossFilter | null>("fft-crossfilter", { bubbles: true, detail: cross ? { ...cross } : null }));
    await redraw();
  }

  // A click on a mark filters the rest of the board by what it stands for; the same mark again clears it.
  const onSelect = (event: Event) => {
    if (!crossOn) return;
    const detail = (event as CustomEvent<{ row?: Row; spec?: WidgetSpec }>).detail;
    const slot = (event.target as Element | null)?.closest?.(".fft-cell-slot") as HTMLElement | null;
    const source = slot?.dataset.widget;
    const row = detail?.row;
    const view = detail?.spec?.view;
    if (!row || !view) return;
    const field = categoryField(view, row);
    if (!field) return;
    const value = row[field];
    if (cross && cross.field === field && cross.value === value && cross.source === source) void setCrossFilter(null);
    else void setCrossFilter(field, value, source);
  };
  grid.addEventListener("fft-select", onSelect);
  // Escape clears the click filter, unless something else (a tooltip, a menu, an expanded card) took it first.
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || event.defaultPrevented || !cross || doc.querySelector(".fft-overlay")) return;
    void setCrossFilter(null);
  };
  doc.addEventListener("keydown", onKey);

  const periodButtons: HTMLButtonElement[] = [];
  function buildRange() {
    if (!range) return;
    const group = el("div", "fft-range");
    group.setAttribute("role", "group");
    const label = el("span", "fft-range-label", range.label ?? B.period);
    label.id = `fft-range-${Math.random().toString(36).slice(2, 7)}`;
    group.setAttribute("aria-labelledby", label.id);
    const track = el("div", "fft-range-track");
    for (const option of periods) {
      // "All" is the period's key and English word; on screen it reads in the board's language.
      const button = el("button", "", option === "All" ? B.all : option);
      button.type = "button";
      button.dataset.value = option;
      button.setAttribute("aria-pressed", String(option === period));
      button.addEventListener("click", () => void setRange(option));
      periodButtons.push(button);
      track.append(button);
    }
    group.append(label, track);
    filterRow.insertBefore(group, nav ?? null);
  }

  async function setRange(option: string) {
    period = option;
    for (const button of periodButtons) button.setAttribute("aria-pressed", String(button.dataset.value === option));
    writeHash();
    await redraw();
  }

  const selects = new Map<string, { select: HTMLSelectElement; values: unknown[] }>();
  async function buildFilters() {
    buildRange();
    for (const filter of spec.filters ?? []) {
      const seen: unknown[] = [];
      for (const [id, rows] of rawRows) {
        const fields = await rawFields.get(id);
        if (!fields?.has(filter.field)) continue;
        for (const row of await rows) {
          const value = row[filter.field];
          if (value !== null && value !== undefined && !seen.includes(value)) seen.push(value);
        }
      }
      seen.sort(compareValues);
      const wrap = el("div", "fft-filter");
      const selectId = `fft-filter-${filter.field}-${Math.random().toString(36).slice(2, 7)}`;
      const label = el("label", "", filter.label ?? fieldLabel(filter.field));
      label.htmlFor = selectId;
      const select = el("select", "");
      select.id = selectId;
      select.add(new Option(B.all, ""));
      seen.forEach((value, i) => select.add(new Option(formatValue(value, undefined, undefined), String(i))));
      select.addEventListener("change", () => void setFilter(filter.field, select.value === "" ? null : seen[Number(select.value)]));
      selects.set(filter.field, { select, values: seen });
      wrap.append(label, select);
      filterRow.insertBefore(wrap, nav ?? null);
    }
    filterRow.insertBefore(buildTools(), nav ?? null);
    rowHiddenBefore = !(spec.filters?.length || range || nav);
    filterRow.hidden = rowHiddenBefore && chip.hidden;
  }

  /** Copy link (when the board keeps its state in the address) and Print, at the end of the filter row. */
  function buildTools(): HTMLElement {
    const tools = el("div", "fft-board-tools");
    tools.setAttribute("role", "group");
    tools.setAttribute("aria-label", B.share);
    const status = el("span", "fft-sr-only");
    status.setAttribute("aria-live", "polite");
    if (options.hash) {
      const copy = el("button", "fft-board-tool", B.copyLink);
      copy.type = "button";
      copy.title = B.copyLinkTitle;
      copy.addEventListener("click", async () => {
        const url = shareLink();
        let done = false;
        try {
          await doc.defaultView?.navigator.clipboard.writeText(url);
          done = Boolean(doc.defaultView?.navigator.clipboard);
        } catch {
          done = false;
        }
        copy.textContent = done ? B.linkCopied : B.copyFailed;
        status.textContent = done ? B.linkCopiedSaid : B.linkFailedSaid;
        root.dispatchEvent(new CustomEvent<{ url: string; copied: boolean }>("fft-share", { bubbles: true, detail: { url, copied: done } }));
        setTimeout(() => (copy.textContent = B.copyLink), 1597);
      });
      tools.append(copy);
    }
    const print = el("button", "fft-board-tool", B.print);
    print.type = "button";
    print.title = B.printTitle;
    print.addEventListener("click", () => {
      void writeState();
      try {
        doc.defaultView?.print();
      } catch {
        // No print dialog here (a test page, a locked-down browser): nothing to do.
      }
    });
    tools.append(print, status);
    return tools;
  }

  /** The address of the board as it is now: section, filters, period and click filter. */
  function shareLink(): string {
    writeHash();
    return doc.defaultView?.location.href ?? "";
  }

  /**
   * Why a card came out empty, when the board's own filters did it: "Nothing for Topic: Prudential", with a button
   * that clears just those filters. Undefined when no filter reaches the card, so its own empty message stands.
   */
  function emptyNote(id: string): { text: string; action: { label: string; run: () => void } } | undefined {
    const fields = knownFields.get(id);
    if (!fields) return undefined;
    const said: string[] = [];
    const clears: (() => Promise<void>)[] = [];
    for (const [field, value] of active) {
      if (value === null || value === undefined || !fields.has(field)) continue;
      said.push(`${filterName(field)}: ${formatValue(value, undefined, undefined)}`);
      clears.push(() => setFilter(field, null));
    }
    if (range && period !== "All" && rangeFields.some((field) => fields.has(field))) {
      said.push(`${range.label ?? B.period}: ${period === "All" ? B.all : period}`);
      clears.push(() => setRange("All"));
    }
    if (cross && cross.source !== id && fields.has(cross.field)) {
      said.push(`${fieldLabel(cross.field)}: ${formatValue(cross.value, undefined, undefined)}`);
      clears.push(() => setCrossFilter(null));
    }
    if (!said.length) return undefined;
    return {
      text: B.nothingFor(said),
      action: { label: said.length === 1 ? B.clearOne : B.clearMany, run: () => void (async () => { for (const clear of clears) await clear(); })() },
    };
  }

  async function setFilter(field: string, value: unknown) {
    active.set(field, value);
    const control = selects.get(field);
    if (control) {
      const index = control.values.findIndex((seen) => seen === value || JSON.stringify(seen) === JSON.stringify(value));
      control.select.value = value === null || value === undefined || index < 0 ? "" : String(index);
    }
    writeHash();
    await redraw();
  }

  const ready = (async () => {
    await buildFilters();
    // Filters a link named: set before anything redraws, each shown in its control.
    for (const [field, value] of Object.entries(pendingFilters ?? {})) {
      active.set(field, value);
      const control = selects.get(field);
      const index = control ? control.values.findIndex((seen) => seen === value || JSON.stringify(seen) === JSON.stringify(value)) : -1;
      if (control) control.select.value = index < 0 ? "" : String(index);
    }
    await Promise.all([...widgets.values()].map((widget) => widget.ready));
    if (pendingCross) await setCrossFilter(pendingCross.field, pendingCross.value, pendingCross.source);
    else if (period !== "All" || Object.keys(pendingFilters ?? {}).length || follows.size) await redraw();
    else await writeState();
  })();

  return {
    root,
    widgets,
    ready,
    setFilter,
    setRange,
    setCrossFilter,
    crossFilter: () => (cross ? { ...cross } : null),
    setGuides(open) {
      for (const widget of widgets.values()) widget.showGuide(open);
    },
    setSection(section) {
      if (section === null) return choose(null);
      const match = sections.find(({ node, title }) => title === section || node.id === section);
      if (!match) throw new Error(`No section "${section}". Sections: ${sections.map(({ title }) => title).join(", ")}.`);
      choose(match.node);
    },
    async setOverride(patch) {
      override = fork(override, patch);
      // A preset that forces one color scheme takes the filter row and headings with it; shipped presets follow the theme.
      const preset = (override.style as { preset?: unknown } | undefined)?.preset;
      const scheme = typeof preset === "string" ? getPreset(preset)?.scheme : undefined;
      if (scheme) root.dataset.scheme = scheme;
      else delete root.dataset.scheme;
      await redraw();
    },
    destroy() {
      doc.defaultView?.removeEventListener("hashchange", onHash);
      doc.removeEventListener("keydown", onKey);
      grid.removeEventListener("fft-select", onSelect);
      barSize?.disconnect();
      navSize?.disconnect();
      if (barSize) page.style.removeProperty("--fft-filters-height");
      stuckSpy?.disconnect();
      for (const widget of widgets.values()) widget.destroy();
      root.remove();
    },
  };
}

/** A date written for people: "25 Oct 2026" for a day, "October 2026" for a month, the text unchanged otherwise. */
function dateWords(text: string, locale?: string): string {
  const day = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  const month = /^(\d{4})-(\d{2})$/.exec(text);
  const options: Intl.DateTimeFormatOptions = day ? { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" } : { month: "long", year: "numeric", timeZone: "UTC" };
  if (!day && !month) return text;
  const [, y, m, d] = (day ?? month) as RegExpExecArray;
  return new Intl.DateTimeFormat(locale, options).format(new Date(Date.UTC(Number(y), Number(m) - 1, Number(d ?? 1))));
}

/**
 * The as-of line: "As of 25 Oct 2026" for a date, or the words given with {latest} filled by the latest date across
 * the widgets that have the range field. Empty while {latest} is not known yet.
 */
export function asOfText(asOf: string, latest: string, locale?: string): string {
  const text = asOf.trim();
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(text)) return wordsFor(locale).board.asOf(dateWords(text, locale));
  if (!text.includes("{latest}")) return text;
  return latest ? text.split("{latest}").join(dateWords(latest, locale)) : "";
}

/** The click filter's chip, the share tools, the "Not filtered by" note and the printed page; injected once per document. */
const BOARD_CSS = `
.fft-dashboard-asof { margin: 2px 0 0; font-size: 12px; color: var(--fft-muted, #6e6e73); font-variant-numeric: tabular-nums; }
.fft-print-state { display: none; }
.fft-board-tools { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; }
.fft-board-tool { min-height: 34px; padding: 0 13px; border: 1px solid color-mix(in srgb, var(--fft-text, #1d1d1f) 14%, transparent); border-radius: 999px; background: transparent; color: inherit; font: inherit; font-size: 13px; cursor: pointer; white-space: nowrap; }
.fft-board-tool:hover { background: color-mix(in srgb, var(--fft-text, #1d1d1f) 6%, transparent); }
.fft-board-tool:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; }
.fft-dashboard .fft-cell-slot { position: relative; }
.fft-unfiltered { position: absolute; top: 8px; right: 13px; z-index: 1; margin: 0; padding: 2px 8px; border-radius: 999px; font-size: 11px; line-height: 15px; color: var(--fft-muted, #6e6e73); background: color-mix(in srgb, var(--fft-text, #1d1d1f) 5%, transparent); pointer-events: none; transition: opacity 233ms ease; }
.fft-cell-slot:is(:hover, :focus-within) > .fft-unfiltered { opacity: 0; }
@media (hover: none) { .fft-unfiltered { position: static; align-self: flex-end; margin: 0 0 5px; } }
@media print {
  .fft-filters, .fft-filters-sentinel, .fft-board-tools, .fft-crossfilter, .fft-widget-ref { display: none !important; }
  .fft-print-state { display: block; margin: 0 0 13px; padding: 0 0 8px; border-bottom: 1px solid #d4d3cd; font-size: 12px; color: #1d1d1f; }
  .fft-dashboard-grid { display: block !important; }
  .fft-dashboard .fft-cell-slot { margin: 0 0 13px; break-inside: avoid; page-break-inside: avoid; }
  .fft-dashboard .fft-cell-slot[hidden], .fft-board-section[hidden] { display: none !important; }
  .fft-board-section { break-before: page; page-break-before: always; margin: 0 0 8px; }
  .fft-dashboard-grid > .fft-board-section:first-child { break-before: auto; page-break-before: auto; }
  .fft-unfiltered { position: static; display: inline-block; margin: 0 0 5px; opacity: 1 !important; color: #515154; background: none; padding: 0; }
}
.fft-crossfilter { display: inline-flex; align-items: center; gap: 8px; min-height: 34px; padding: 0 8px 0 13px; border: 1px solid color-mix(in srgb, var(--fft-accent) 55%, transparent); border-radius: 999px; background: color-mix(in srgb, var(--fft-accent) 12%, transparent); color: inherit; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.fft-crossfilter[hidden] { display: none; }
.fft-crossfilter:hover { background: color-mix(in srgb, var(--fft-accent) 20%, transparent); }
.fft-crossfilter:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; }
.fft-crossfilter-x { display: inline-grid; place-items: center; width: 21px; height: 21px; border-radius: 50%; font-size: 15px; line-height: 1; opacity: 0.75; }
.fft-crossfilter:hover .fft-crossfilter-x { opacity: 1; background: color-mix(in srgb, var(--fft-accent) 18%, transparent); }
@media (prefers-reduced-motion: no-preference) { .fft-crossfilter:not([hidden]) { animation: fft-chip-in 233ms ease-out both; } }
@keyframes fft-chip-in { from { opacity: 0; transform: scale(0.94); } }
`;

function ensureBoardStyles(doc: Document): void {
  if (doc.getElementById("fft-board-styles")) return;
  const style = doc.createElement("style");
  style.id = "fft-board-styles";
  style.textContent = BOARD_CSS;
  doc.head.append(style);
}
