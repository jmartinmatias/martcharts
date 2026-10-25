/**
 * The dashboard runtime: draws a grid of widgets from a `DashboardSpec`, with
 * one filter row above them that scopes every widget whose data has the field.
 *
 * @module
 */
import { placedRef } from "../core/ref.ts";
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
import { roving } from "./views/focus.ts";
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
  /**
   * Each card is one tab stop (default true): Tab moves from card to card, Enter or an arrow key goes into a card,
   * where Tab and the arrows reach its marks and tools, and Escape comes back out to the card. Without it, every
   * card's toolbar, ref and marks are tab stops of their own, about five per card.
   */
  cardStops?: boolean;
  /**
   * Draws the board's own title and subtitle (default true). A page that already says them in its own header passes
   * false: the board then starts with its filter row, and the as-of line moves into that row.
   */
  header?: boolean;
  /**
   * Where the board's as-of line goes when it has no header of its own: a host element beside the page's title. Without
   * it, the line ends the filter row.
   */
  asOfInto?: HTMLElement;
  /**
   * The board's place on its site, for the cards' refs (see `placedRef`): with one, a card's ref is the hash of the place
   * and its widget id, unique to that card there. Without it, a card keeps its widget's own ref, `widgetRef(id)`.
   */
  place?: string;
}

/** One card's ref on a board: the ref, the cell key it hashes (the widget id, or `cell-<index>`), and its section's title. */
export interface BoardRef {
  ref: string;
  key: string;
  title?: string;
  section?: string;
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
  /** Every card's ref, drawn yet or not (a folded section's cards included), in board order. */
  refs(): BoardRef[];
  /**
   * Brings the card with this ref into view: shows its section or tab, opens it if folded, then scrolls to the card and
   * focuses it. Resolves false when no card on the board has the ref.
   */
  reveal(ref: string): Promise<boolean>;
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
  if (options.place) root.dataset.fftPlace = options.place;
  /** Every card's ref, by its slot, for refs() and reveal(). */
  const cardRefs: (Omit<BoardRef, "ref"> & { slot: HTMLElement })[] = [];
  /** The board's place: its own, else the page's (`data-fft-place` on an ancestor), as the cards read it. */
  const placeOf = () => options.place || root.parentElement?.closest<HTMLElement>("[data-fft-place]")?.dataset.fftPlace || undefined;
  // The as-of line: when the data was last true. A {latest} token waits for the widgets' dates.
  const asOf = typeof spec.asOf === "string" && spec.asOf.trim() !== "" ? el("p", "fft-dashboard-asof") : undefined;
  // Dates in the as-of line read in the board's language, the same as its words ("As of", "Data to"): the widgets'
  // locale, else the page's, never the browser's own (which wrote "Data to octobre 2026" on an English page).
  const firstSpec = spec.widgets.map((cell) => cell.spec ?? (cell.widget ? options.widgets?.[cell.widget] : undefined)).find((s) => s?.locale);
  const boardLocale = firstSpec?.locale ?? (target.ownerDocument.documentElement.lang || "en");
  // The board's own words (filter row, share and print tools, notes), in the same language.
  const B = wordsFor(boardLocale).board;
  // The words a keyboard and screen-reader user meets: skip links, card stops, and what each change did.
  const A = wordsFor(boardLocale).boardA11y;
  // The board's chrome: folded sections, the phone filters sheet, the one-line scope note.
  const C = wordsFor(boardLocale).boardChrome;
  const withHeader = options.header !== false;
  const tabs = spec.sections === "tabs";
  /** True once the board has drawn: what a link or the first load sets is not news to announce. */
  let settled = false;
  let lastSaid = "";
  let sayTimer: ReturnType<typeof setTimeout> | undefined;
  if (asOf) asOf.textContent = asOfText(spec.asOf as string, "", boardLocale);
  if (withHeader && (spec.title || spec.subtitle || asOf)) {
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
  // The filter row takes focus from a skip link or after a cleared filter, without becoming a tab stop of its own.
  filterRow.id = `fft-filters-${Math.random().toString(36).slice(2, 8)}`;
  filterRow.tabIndex = -1;
  const grid = el("div", "fft-dashboard-grid");
  grid.style.setProperty("--fft-cols", String(columns));
  // Skip links first in the board: to the filters, and to any section (one roving list, so one stop). Out of sight until focused.
  const skip = el("nav", "fft-skip");
  skip.setAttribute("aria-label", A.skipLinks);
  const toFilters = el("a", "fft-skip-link", A.skipToFilters);
  toFilters.href = `#${filterRow.id}`;
  toFilters.addEventListener("click", (event) => {
    event.preventDefault();
    filterRow.focus();
  });
  skip.append(toFilters);
  // One polite live region says what each change did, once: "Segment: Affluent. 24 of 32 cards updated."
  const live = el("p", "fft-sr-only fft-board-live");
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");
  live.setAttribute("aria-atomic", "true");
  // The hint every card stop carries, written once.
  const cardHint = el("p", "fft-sr-only", A.cardHint);
  cardHint.id = `fft-card-hint-${Math.random().toString(36).slice(2, 8)}`;
  // The period and the filters, together: a sheet behind a "Filters (n)" button on a phone, inline on wider screens.
  // Two lines: the bar (the phone's Filters button, the period and filters, a click filter, then Share at the end),
  // and under it the section chips or tabs on a line of their own, so neither crowds the other out.
  const bar = el("div", "fft-filters-bar");
  filterRow.append(bar);
  const controls = el("div", "fft-filter-controls");
  controls.id = `fft-filter-controls-${Math.random().toString(36).slice(2, 8)}`;
  bar.append(controls);
  const filtersToggle = el("button", "fft-filters-toggle", C.filters);
  filtersToggle.type = "button";
  filtersToggle.setAttribute("aria-expanded", "false");
  // One line under the filter row says what a filter cannot reach ("Segment does not apply to 7 cards"), instead of a
  // pill on every card.
  const unreached = el("p", "fft-unreached");
  unreached.hidden = true;
  // The board's source, said once under it.
  const footer = spec.source?.name ? boardFooter(spec.source) : undefined;
  root.append(skip, filterRow, unreached, grid, ...(footer ? [footer] : []), live, cardHint);
  target.append(root);

  function boardFooter(source: { name: string; url?: string }): HTMLElement {
    const node = el("footer", "fft-board-footer");
    node.append(wordsFor(boardLocale).widget.source);
    if (source.url) {
      const link = el("a", "fft-credit-link", source.name);
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      node.append(link);
    } else node.append(source.name);
    return node;
  }

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

  /**
   * The latest date the cards actually draw, for the as-of line: each card's rows after its own steps (a card that
   * stops at September says September, though its file runs on), forecast rows left out. Never later than the period
   * a card itself names, unlike `latest`, which reads the raw files to count periods back from.
   */
  let drawnDate: Promise<string> | undefined;
  const drawnLatest = () => (drawnDate ??= (async () => {
    let max = "";
    await Promise.all(
      [...originals.entries()].map(async ([id, original]) => {
        const fields = await rawFields.get(id);
        const field = rangeFields.find((f) => fields?.has(f));
        if (!field) return;
        const forecast = original.view?.forecast;
        const rows = await runPipeline(original, { fetch: options.fetch }).catch(() => [] as Row[]);
        for (const row of rows) {
          if (typeof forecast === "string" && isForecast(row[forecast])) continue;
          const value = row[field];
          if (typeof value === "string" && /^\d{4}-\d{2}/.test(value) && value > max) max = value;
        }
      }),
    );
    return max || (await latest());
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
  /** Each card's section heading, when it sits under one. */
  const sectionOf = new Map<HTMLElement, HTMLElement>();
  /** Sections the spec folds (collapsed), and those of them folded right now. */
  const foldable = new Set<HTMLElement>();
  const folded = new Set<HTMLElement>();
  const toggles = new Map<HTMLElement, HTMLButtonElement>();
  /** Cards of a folded section, by id, drawn the first time it opens. */
  const waiting = new Map<string, () => Widget>();
  /** Each widget's slot, so stepping can skip the ones a section filter hides. */
  const slotOf = new Map<Widget, HTMLElement>();
  /** The expanded view steps through the board's widgets in grid order, sections skipped, and only those in view. */
  const neighbors = (widget: Widget) => {
    const list = [...widgets.values()].filter((other) => !slotOf.get(other)?.hidden);
    const i = list.indexOf(widget);
    return { previous: list[i - 1], next: list[i + 1], position: i + 1, total: list.length };
  };

  // ---- One tab stop per card ----
  // A card's slot is the stop: role group, named by the card's title, described by the hint. What is focusable inside it
  // (toolbar, ref, the entry to its marks, table controls) is taken out of the tab order while focus is elsewhere, its
  // own tabindex kept in data-fft-tab, and given back as soon as focus goes in.
  const cardStops = options.cardStops !== false;
  const INNER = "a[href], button, input, select, textarea, [tabindex]";
  const observers: MutationObserver[] = [];
  /** Listeners on the page, removed when the board goes. */
  const cleanups: (() => void)[] = [];
  const inside = (slot: HTMLElement) => {
    const active = doc.activeElement;
    return Boolean(active && active !== slot && slot.contains(active));
  };
  const titleOf = (slot: HTMLElement) => slot.querySelector(".fft-title")?.textContent?.trim() || A.card;
  /** Takes a card's inner stops out of the tab order (unless focus is inside it), and keeps its name current. */
  function lockCard(slot: HTMLElement) {
    if (slot.getAttribute("aria-label") !== titleOf(slot)) slot.setAttribute("aria-label", titleOf(slot));
    if (inside(slot)) return;
    delete slot.dataset.inside;
    for (const node of slot.querySelectorAll<HTMLElement>(INNER)) {
      const now = node.getAttribute("tabindex");
      if (node.hasAttribute("data-fft-tab")) {
        // Still out of the order, unless the card's own code (a roving group, a redraw) gave it a stop again.
        if (now !== "-1") {
          node.setAttribute("data-fft-tab", now ?? "");
          node.setAttribute("tabindex", "-1");
        }
        continue;
      }
      if (now === "-1") continue;
      node.setAttribute("data-fft-tab", now ?? "");
      node.setAttribute("tabindex", "-1");
    }
  }
  /** Gives a card's inner stops back, exactly as its own code set them. */
  function unlockCard(slot: HTMLElement) {
    slot.dataset.inside = "";
    for (const node of slot.querySelectorAll<HTMLElement>("[data-fft-tab]")) {
      const kept = node.getAttribute("data-fft-tab") ?? "";
      node.removeAttribute("data-fft-tab");
      if (kept === "") node.removeAttribute("tabindex");
      else node.setAttribute("tabindex", kept);
    }
  }
  /** Where Enter on a card lands: its marks' entry (the roving stop in the chart), else its first control. */
  function entryOf(slot: HTMLElement): HTMLElement | undefined {
    const stops = [...slot.querySelectorAll<HTMLElement>(INNER)].filter((node) => node.getAttribute("tabindex") !== "-1" && !(node as HTMLButtonElement).disabled && !node.closest("[hidden]"));
    return stops.find((node) => node.closest(".fft-body") && !node.closest(".fft-actions")) ?? stops[0];
  }
  function cardStop(slot: HTMLElement) {
    slot.tabIndex = 0;
    slot.setAttribute("role", "group");
    slot.setAttribute("aria-describedby", cardHint.id);
    slot.addEventListener("focusin", (event) => {
      if (event.target !== slot) unlockCard(slot);
    });
    slot.addEventListener("focusout", (event) => {
      const next = (event as FocusEvent).relatedTarget as Node | null;
      if (!next || !slot.contains(next)) queueMicrotask(() => lockCard(slot));
    });
    slot.addEventListener("keydown", (event) => {
      const key = (event as KeyboardEvent).key;
      if (event.target === slot) {
        if (key !== "Enter" && key !== "ArrowDown" && key !== "ArrowRight") return;
        unlockCard(slot);
        const entry = entryOf(slot);
        if (!entry) return lockCard(slot);
        event.preventDefault();
        entry.focus();
        return;
      }
      // Escape inside a card comes back out to it, unless a click filter is set: then Escape first clears that, and
      // focus goes back to the mark that set it.
      if (key === "Escape" && !event.defaultPrevented && !cross) {
        event.preventDefault();
        slot.focus();
      }
    });
    // A card redraws (a filter, a resize, its own controls): what it draws joins the order only while focus is inside.
    if (typeof MutationObserver === "function") {
      const watch = new MutationObserver(() => {
        if ("inside" in slot.dataset && !inside(slot) && doc.activeElement !== slot) lockCard(slot);
        else if (!("inside" in slot.dataset)) lockCard(slot);
      });
      watch.observe(slot, { subtree: true, childList: true, attributes: true, attributeFilter: ["tabindex"] });
      observers.push(watch);
    }
    lockCard(slot);
  }

  spec.widgets.forEach((cell, index) => {
    if (cell.section) {
      // A section heading: a full-width row that groups the cells after it.
      const section = el("div", "fft-board-section");
      section.id = sectionId(cell.section);
      section.style.gridColumn = "1 / -1";
      // The heading takes focus from a skip link (never a tab stop of its own), so the keyboard can jump section to section.
      const heading = el("h3", "", cell.section);
      heading.tabIndex = -1;
      section.append(heading);
      if (cell.description) section.append(el("p", "", cell.description));
      grid.append(section);
      sections.push({ node: section, title: cell.section });
      opened = new Set([section]);
      members.set(section, opened);
      if (cell.collapsed) {
        // A folded section: its heading, and a button that draws its cards the first time it opens.
        folded.add(section);
        foldable.add(section);
        const toggle = el("button", "fft-section-toggle");
        toggle.type = "button";
        toggle.setAttribute("aria-expanded", "false");
        toggle.addEventListener("click", () => void setFolded(section, !folded.has(section)));
        section.append(toggle);
        toggles.set(section, toggle);
      }
      return;
    }
    const id = cell.widget ?? `cell-${index}`;
    const span = Math.min(columns, Math.max(1, cell.span ?? 1));
    const slot = el("div", "fft-cell-slot");
    slot.dataset.widget = id;
    // The card's key for its ref: the widget's id, or the inline spec's own id, else its place in the board.
    const refKeyOf = cell.widget ?? cell.spec?.id ?? id;
    slot.dataset.fftRefKey = refKeyOf;
    const cellTitle = (cell.spec ?? (cell.widget ? options.widgets?.[cell.widget] : undefined))?.title;
    cardRefs.push({ key: refKeyOf, slot, ...(cellTitle ? { title: cellTitle } : {}), ...(sections.at(-1) ? { section: sections.at(-1)!.title } : {}) });
    slot.dataset.span = String(span);
    slot.style.gridColumn = `span ${span}`;
    const mount = el("div", "fft-board-cell");
    slot.append(mount);
    grid.append(slot);
    opened?.add(slot);
    const inSection = sections.at(-1)?.node;
    if (inSection) sectionOf.set(slot, inSection);
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
    // The card's data loads now, whether or not it draws yet: filters, scope notes and the as-of line read it.
    const rows = runPipeline({ data: found.data }, { fetch: options.fetch }).catch(() => [] as Row[]);
    rawRows.set(id, rows);
    rawFields.set(id, rows.then((list) => new Set(list.flatMap((row) => Object.keys(row)))));
    void rawFields.get(id)?.then((fields) => knownFields.set(id, fields));
    // Said once under the board: a card from the same source stops repeating it on its own credit line.
    if (spec.source?.name && found.source?.name === spec.source.name) slot.dataset.boardSource = "";
    const draw = () => {
      const widget = createWidget(mount, found, { actions: options.actions, fetch: options.fetch, neighbors, guide: options.guides, emptyNote: () => emptyNote(id) });
      widgets.set(id, widget);
      slotOf.set(widget, slot);
      options.decorate?.(mount, id, widget);
      if (cardStops) cardStop(slot);
      return widget;
    };
    // In a folded section the card is not drawn until the section opens.
    if (inSection && folded.has(inSection)) waiting.set(id, draw);
    else draw();
  });
  for (const section of foldable) paintToggle(section);

  // The section list of the skip links: one roving stop (arrow keys move), each link focusing its section's heading.
  if (sections.length) {
    const list = el("ul", "fft-skip-sections");
    const links: HTMLAnchorElement[] = [];
    for (const { node, title } of sections) {
      const item = el("li", "");
      const link = el("a", "fft-skip-link", A.skipToSection(title));
      link.href = `#${node.id}`;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        // A section the section filter hides is shown again with the rest, then its heading takes focus.
        if (node.hidden) choose(tabs ? node : null);
        node.querySelector<HTMLElement>("h3")?.focus();
      });
      item.append(link);
      list.append(item);
      links.push(link);
    }
    roving(links, { down: 1 });
    skip.append(list);
  }

  // Section filter: with two or more sections, the filter row offers All and each section, like the period control.
  // With `sections: "tabs"` they are tabs instead, one section at a time, with no All.
  const nav = sections.length > 1 ? el("div", "fft-board-nav") : undefined;
  const sectionButtons: HTMLButtonElement[] = [];
  if (nav) {
    nav.setAttribute("role", tabs ? "tablist" : "group");
    nav.setAttribute("aria-label", B.sections);
    if (tabs) nav.dataset.tabs = "";
    for (const entry of tabs ? sections : [null, ...sections]) {
      const button = el("button", "", entry ? entry.title : B.all);
      // The label again, for the stylesheet to reserve its semibold width, so choosing a chip never shifts the row.
      button.dataset.label = button.textContent ?? "";
      button.type = "button";
      if (entry) button.dataset.section = entry.node.id;
      if (tabs && entry) {
        button.setAttribute("role", "tab");
        button.setAttribute("aria-controls", entry.node.id);
        button.setAttribute("aria-selected", String(entry === sections[0]));
      } else button.setAttribute("aria-pressed", String(entry === null));
      button.addEventListener("click", () => choose(entry?.node ?? null));
      sectionButtons.push(button);
      nav.append(button);
    }
    // Tabs and chips alike move with the arrow keys: one stop for the whole list, as a toolbar of choices should be.
    roving(sectionButtons);
    // The sections' own line, under the bar.
    nav.classList.add("fft-board-sections");
    filterRow.append(nav);
  }

  /** A folded section's button: "Show 4 cards", or "Hide cards" once open. */
  function paintToggle(section: HTMLElement) {
    const toggle = toggles.get(section);
    if (!toggle) return;
    const count = [...(members.get(section) ?? [])].filter((node) => node.classList.contains("fft-cell-slot")).length;
    const shut = folded.has(section);
    toggle.textContent = shut ? C.showCards(count) : C.hideCards;
    toggle.setAttribute("aria-expanded", String(!shut));
    section.toggleAttribute("data-folded", shut);
  }

  /** Each grid item shown or hidden: by the section filter (or tab) in force, and by its section being folded. */
  function applyVisibility() {
    const shown = sections.find(({ node }) => node.id === shownSection)?.node;
    const keep = shown ? members.get(shown) : undefined;
    for (const child of grid.children) {
      const node = child as HTMLElement;
      // While printing, everything shows: every tab and every folded section, each section on a page of its own.
      if (printing) {
        node.hidden = false;
        continue;
      }
      const bySection = keep ? !keep.has(node) : false;
      const parent = sectionOf.get(node);
      node.hidden = bySection || Boolean(parent && folded.has(parent));
    }
  }

  /** True between beforeprint and afterprint: the board shows every section and tab, folded or not. */
  let printing = false;
  /**
   * Gets the board ready for paper: the cards of folded sections are drawn (with the filters in force), and every
   * section and tab shows. Returns once those cards are drawn. The screen state comes back on afterprint.
   */
  async function preparePrint(): Promise<void> {
    if (printing) return;
    printing = true;
    root.dataset.printing = "";
    const drawn: [string, Widget][] = [];
    for (const [id, draw] of [...waiting]) {
      waiting.delete(id);
      drawn.push([id, draw()]);
    }
    applyVisibility();
    void writeState();
    if (settled) await Promise.all(drawn.map(async ([id, widget]) => widget.setSpec(await specFor(id))));
    else await Promise.all(drawn.map(([, widget]) => widget.ready));
  }
  /** Back to the screen: the tab and the folds as they were before printing. */
  function endPrint() {
    if (!printing) return;
    printing = false;
    delete root.dataset.printing;
    applyVisibility();
    void writeState();
  }
  const printView = target.ownerDocument.defaultView;
  const onBeforePrint = () => void preparePrint();
  const onAfterPrint = () => endPrint();
  printView?.addEventListener("beforeprint", onBeforePrint);
  printView?.addEventListener("afterprint", onAfterPrint);

  /** Opens or folds a section the spec folds. Its cards draw the first time it opens, with the filters in force. */
  async function setFolded(section: HTMLElement, shut: boolean) {
    if (!foldable.has(section)) return;
    if (shut) folded.add(section);
    else folded.delete(section);
    const drawn: [string, Widget][] = [];
    if (!shut) {
      for (const slot of members.get(section) ?? []) {
        const id = slot.dataset.widget;
        const draw = id ? waiting.get(id) : undefined;
        if (!id || !draw) continue;
        waiting.delete(id);
        drawn.push([id, draw()]);
      }
    }
    paintToggle(section);
    applyVisibility();
    writeHash();
    // Drawn after the board settled: they take the filters, period and click filter already in force.
    if (settled) await Promise.all(drawn.map(async ([id, widget]) => widget.setSpec(await specFor(id))));
    else await Promise.all(drawn.map(([, widget]) => widget.ready));
    await writeState();
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
    // Tabs show one section at a time: "every section" means the first.
    if (tabs && nav && !section) section = sections[0]?.node ?? null;
    const changed = shownSection !== (section?.id ?? null);
    shownSection = section?.id ?? null;
    applyVisibility();
    if (section) root.dataset.section = section.id;
    else delete root.dataset.section;
    sectionButtons.forEach((button) => {
      const on = (button.dataset.section ?? null) === (section?.id ?? null);
      if (button.getAttribute("role") === "tab") {
        button.setAttribute("aria-selected", String(on));
        button.tabIndex = on ? 0 : -1;
      } else button.setAttribute("aria-pressed", String(on));
      // On narrow screens the buttons scroll sideways: center the chosen one. CSS owns the motion (scroll-behavior).
      if (on && nav && nav.scrollWidth > nav.clientWidth) {
        const box = nav.getBoundingClientRect();
        const chip = button.getBoundingClientRect();
        nav.scrollBy({ left: chip.left - box.left - (box.width - chip.width) / 2 });
      }
    });
    writeHash();
    void writeState();
    if (changed) {
      const shown = section ? [...(members.get(section) ?? [])].filter((node) => node.classList.contains("fft-cell-slot")).length : slots.size;
      const title = section ? sections.find(({ node }) => node === section)?.title : undefined;
      say(title ? A.sectionShown(title, shown) : A.allSectionsShown(shown));
    }
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
    // Folded sections the reader opened, by id; the first tab is the default, so it needs no mention.
    const openIds = [...foldable].filter((section) => !folded.has(section)).map((section) => section.id);
    const parts = [
      tabs && shownSection === sections[0]?.node.id ? null : shownSection,
      cross ? `cf=${encodeURIComponent(JSON.stringify([cross.field, cross.value, cross.source ?? null]))}` : null,
      Object.keys(filters).length ? `f=${encodeURIComponent(JSON.stringify(filters))}` : null,
      period !== firstPeriod ? `p=${encodeURIComponent(period)}` : null,
      openIds.length ? `o=${encodeURIComponent(openIds.join(","))}` : null,
    ].filter(Boolean);
    view.history.replaceState(view.history.state, "", parts.length ? `#${parts.join("&")}` : `${view.location.pathname}${view.location.search}`);
  }

  /** The parts of the address: the section named, and the click filter, filters and period written there. */
  function readHash(): { section: string; cross?: CrossFilter; filters?: Record<string, unknown>; period?: string; open: string[] } {
    const parts = (doc.defaultView?.location.hash.slice(1) ?? "").split("&");
    let found: CrossFilter | undefined;
    let filters: Record<string, unknown> | undefined;
    let chosen: string | undefined;
    let open: string[] = [];
    const named = parts.filter((part) => {
      // A part that does not read is ignored, like an unknown section.
      try {
        if (part.startsWith("o=")) {
          open = decodeURIComponent(part.slice(2)).split(",").filter(Boolean);
          return false;
        }
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
    return { section: named[0] ?? "", ...(found ? { cross: found } : {}), ...(filters ? { filters } : {}), ...(chosen ? { period: chosen } : {}), open };
  }

  // An address naming one of this board's sections opens the board on it, and the board follows the address as it
  // changes (links, back and forward): a section's id shows it, an empty address shows them all, anything else is left alone.
  let pendingCross: CrossFilter | undefined;
  let pendingFilters: Record<string, unknown> | undefined;
  const fromAddress = (initial: boolean) => {
    const { section: named, cross: wanted, filters, period: chosen, open } = readHash();
    if (nav) {
      const match = sections.find(({ node }) => node.id === named);
      if (match) choose(match.node);
      else if (!named && !initial) choose(null);
    }
    // Folded sections the link opened open again; those it does not name fold back.
    for (const section of foldable) {
      const wantOpen = open.includes(section.id);
      if (wantOpen === folded.has(section)) void setFolded(section, !wantOpen);
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
  // Tabs start on the first section when the address names none.
  if (tabs && nav && !shownSection) choose(null);
  applyVisibility();

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

  // ---- What each change did, said once, in a polite live region ----
  /** Says the last of several quick changes, and never the same words twice in a row. */
  function say(text: string) {
    if (!settled) return;
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(() => {
      sayTimer = undefined;
      if (text === lastSaid) return;
      lastSaid = text;
      live.textContent = text;
    }, 233);
  }
  /** After a change has redrawn: what it set, and how many cards it reached ("Segment: Affluent. 24 of 32 cards updated."). */
  async function sayChange(lead: string) {
    if (!settled) return;
    await writeState();
    const total = slots.size;
    const reached = [...slots.values()].filter((slot) => !("unfiltered" in slot.dataset)).length;
    say(`${lead} ${A.updated(reached, total)}`);
  }

  // ---- Focus that survives a redraw ----
  /** The mark a click filter came from: its card, its accessible name, and its place among the card's marks. */
  interface Origin {
    slot: string;
    label: string | null;
    index: number;
  }
  /** The mark that set the click filter now in force, for focus to return to when it is cleared. */
  let crossOrigin: Origin | undefined;
  /** Where focus goes once the next click-filter redraw is done. */
  let focusAfter: { origin?: Origin; fallback: "chip" | "row" } | undefined;
  /** The element last pressed in the grid, for a mouse click (which may not focus an SVG mark). */
  let lastPressed: Element | null = null;
  const pressed = (event: Event) => (lastPressed = event.target as Element | null);
  grid.addEventListener("pointerdown", pressed, true);
  grid.addEventListener("click", pressed, true);
  /** A card's marks and in-chart controls, in order: what a focus can come back to. Its toolbar and ref are not marks. */
  const marksOf = (slot: HTMLElement) =>
    [...slot.querySelectorAll<HTMLElement>("[tabindex], [data-fft-tab]")].filter((node) => node !== slot && node.closest(".fft-body") && !node.closest(".fft-actions, .fft-widget-ref"));
  function originOf(id: string | undefined): Origin | undefined {
    const slot = id ? slots.get(id) : undefined;
    if (!id || !slot) return undefined;
    const active = doc.activeElement;
    const fromKeys = active && active !== slot && slot.contains(active) ? (active as HTMLElement) : null;
    const fromPointer = lastPressed && slot.contains(lastPressed) ? (lastPressed.closest("[tabindex], [data-fft-tab]") as HTMLElement | null) : null;
    const mark = fromKeys ?? fromPointer;
    const marks = marksOf(slot);
    return { slot: id, label: mark?.getAttribute("aria-label") ?? null, index: mark ? marks.indexOf(mark) : -1 };
  }
  /** Focuses the same mark in its redrawn card (by its name, else its place), else the chip or the filter row. */
  function refocus(origin: Origin | undefined, fallback: "chip" | "row") {
    const slot = origin ? slots.get(origin.slot) : undefined;
    const marks = slot ? marksOf(slot) : [];
    const mark = (origin?.label ? marks.find((node) => node.getAttribute("aria-label") === origin.label) : undefined) ?? (origin && origin.index >= 0 ? marks[origin.index] : undefined);
    if (slot && mark) {
      mark.focus();
      // The mark is its roving group's stop now, as if the arrow keys had brought the focus there.
      for (const other of marks) if (other !== mark && other.getAttribute("tabindex") === "0" && other.getAttribute("class") === mark.getAttribute("class")) other.setAttribute("tabindex", "-1");
      mark.setAttribute("tabindex", "0");
      return;
    }
    if (fallback === "chip" && !chip.hidden) chip.focus();
    else filterRow.focus();
  }

  /** What a filter is called on screen: its row label, the period's label, or the field in words. */
  const filterName = (field: string) => spec.filters?.find((filter) => filter.field === field)?.label ?? fieldLabel(field);

  /**
   * Honesty about scope: each card that a filter set right now cannot reach (its data has no such field) says so,
   * quietly: "Not filtered by Segment". A card that follows the click filter's field counts as reached by it.
   */
  async function markUnreached() {
    const filters = chosenFilters();
    /** Per filter name, the cards it cannot reach, by title: the one line under the filter row says how many, and which on hover or focus. */
    const missedBy = new Map<string, string[]>();
    const cardName = (id: string, slot: HTMLElement) => slot.querySelector(".fft-title")?.textContent?.trim() || originals.get(id)?.title || id;
    await Promise.all(
      [...slots.entries()].map(async ([id, slot]) => {
        const fields = (await rawFields.get(id)) ?? new Set<string>();
        const missed = Object.keys(filters).filter((field) => !fields.has(field)).map(filterName);
        if (range && period !== "All" && !rangeFields.some((field) => fields.has(field))) missed.push(range.label ?? B.period);
        // The click filter is for the cards that carry its field, or follow it; a card it does not reach says so on its
        // own pill (on hover), but the line under the filter row speaks only of the row's filters and the period.
        const crossMissed = cross && cross.source !== id && !fields.has(cross.field) && follows.get(id)?.follow.field !== cross.field ? fieldLabel(cross.field) : undefined;
        const lineNames = [...new Set(missed)];
        if (crossMissed) missed.push(crossMissed);
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
        for (const name of lineNames) missedBy.set(name, [...(missedBy.get(name) ?? []), id]);
      }),
    );
    // One line, in filter order: "Segment does not apply to 7 cards · Period does not apply to 3 cards".
    unreached.replaceChildren();
    const order = [...Object.keys(filters).map(filterName), range?.label ?? B.period];
    const rank = (name: string) => (order.indexOf(name) < 0 ? order.length : order.indexOf(name));
    const ids = [...slots.keys()];
    for (const [name, missing] of [...missedBy].sort((a, b) => rank(a[0]) - rank(b[0]))) {
      // Cards in board order, by their titles.
      const cards = missing.sort((a, b) => ids.indexOf(a) - ids.indexOf(b)).map((id) => cardName(id, slots.get(id) as HTMLElement));
      if (unreached.childNodes.length) unreached.append(" · ");
      const item = el("span", "fft-unreached-item", C.doesNotApply(name, cards.length));
      const list = C.cardsList(cards);
      // The card names on hover or focus: a title for the pointer, the whole list for screen readers.
      item.tabIndex = 0;
      item.title = list;
      item.dataset.cards = list;
      item.setAttribute("aria-label", `${C.doesNotApply(name, cards.length)}. ${list}`);
      unreached.append(item);
    }
    unreached.hidden = missedBy.size === 0;
  }

  /** The printed state line and the as-of date: what the page shows, in words. */
  async function writeState() {
    const parts: string[] = [];
    const section = sections.find(({ node }) => node.id === shownSection);
    if (section) parts.push(B.section(section.title));
    for (const [field, value] of Object.entries(chosenFilters())) parts.push(`${filterName(field)}: ${formatValue(value, undefined, undefined)}`);
    if (range) parts.push(`${range.label ?? B.period}: ${period === "All" ? B.all : period}`);
    if (cross) parts.push(`${fieldLabel(cross.field)}: ${formatValue(cross.value, undefined, undefined)}`);
    const asOfLine = asOf ? asOfText(spec.asOf as string, range ? await drawnLatest() : "", boardLocale) : "";
    paintFiltersToggle();
    if (asOf) asOf.textContent = asOfLine;
    // A printout of a board that folds or tabs sections away holds every one of them, and says so.
    const all = printing && (foldable.size > 0 || tabs) ? C.printedAll : "";
    printState.textContent = [spec.title, parts.length ? parts.join(" · ") : B.unfiltered, all, asOfLine].filter(Boolean).join(" · ");
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
  chip.addEventListener("click", () => {
    // The chip is about to go: focus returns to the mark that set the filter, else to the filter row.
    focusAfter = { origin: crossOrigin, fallback: "row" };
    void setCrossFilter(null);
  });
  let rowHiddenBefore = false;

  async function setCrossFilter(field: string | null, value?: unknown, source?: string) {
    const was = cross;
    cross = field === null ? undefined : { field, value, ...(source ? { source } : {}) };
    if (!cross) crossOrigin = undefined;
    if (cross) {
      const text = `${fieldLabel(cross.field)}: ${formatValue(cross.value, undefined, undefined)}`;
      chip.replaceChildren(el("span", "fft-crossfilter-text", text), el("span", "fft-crossfilter-x", "\u00d7"));
      chip.setAttribute("aria-label", B.clearFilter(text));
      chip.title = B.clearThis;
      if (chip.hidden) rowHiddenBefore = filterRow.hidden === true;
      // The chip joins the filter row the first time a click sets a filter, after the period and filters, before the sections.
      if (!chip.isConnected) bar.insertBefore(chip, bar.querySelector(":scope > .fft-board-tools"));
      chip.hidden = false;
      filterRow.hidden = false;
    } else if (!chip.hidden) {
      chip.hidden = true;
      filterRow.hidden = rowHiddenBefore;
    }
    writeHash();
    root.dispatchEvent(new CustomEvent<CrossFilter | null>("fft-crossfilter", { bubbles: true, detail: cross ? { ...cross } : null }));
    await redraw();
    // A person's click or clear, not a link or a call from code, decides where focus goes once the cards are redrawn.
    const goal = focusAfter;
    focusAfter = undefined;
    if (goal) refocus(goal.origin, goal.fallback);
    if (cross) await sayChange(A.set(fieldLabel(cross.field), formatValue(cross.value, undefined, undefined)));
    else if (was) await sayChange(A.cleared(fieldLabel(was.field)));
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
    // Focus stays on the mark that was used, found again in its redrawn card.
    const origin = originOf(source);
    if (cross && cross.field === field && cross.value === value && cross.source === source) {
      focusAfter = { origin, fallback: "row" };
      void setCrossFilter(null);
    } else {
      crossOrigin = origin;
      focusAfter = { origin, fallback: "chip" };
      void setCrossFilter(field, value, source);
    }
  };
  grid.addEventListener("fft-select", onSelect);
  // Escape clears the click filter, unless something else (a tooltip, a menu, an expanded card) took it first.
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || event.defaultPrevented || !cross || doc.querySelector(".fft-overlay")) return;
    focusAfter = { origin: crossOrigin, fallback: "row" };
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
    // The periods are one stop too: arrow keys move between 3M, 6M, 12M and All.
    roving(periodButtons);
    group.append(label, track);
    controls.append(group);
  }

  async function setRange(option: string) {
    const changed = option !== period;
    period = option;
    for (const button of periodButtons) button.setAttribute("aria-pressed", String(button.dataset.value === option));
    writeHash();
    await redraw();
    if (changed && range) await sayChange(A.set(range.label ?? B.period, option === "All" ? B.all : option));
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
      controls.append(wrap);
    }
    // On a phone the controls fold into a sheet behind one button that counts what is set: "Filters (2)".
    if (controls.childElementCount) {
      filtersToggle.setAttribute("aria-controls", controls.id);
      filtersToggle.addEventListener("click", () => openSheet(!filterRow.hasAttribute("data-sheet")));
      const done = el("button", "fft-sheet-done", C.done);
      done.type = "button";
      done.addEventListener("click", () => {
        openSheet(false);
        filtersToggle.focus();
      });
      controls.append(done);
      controls.addEventListener("keydown", (event) => {
        if ((event as KeyboardEvent).key !== "Escape" || !filterRow.hasAttribute("data-sheet")) return;
        event.preventDefault();
        openSheet(false);
        filtersToggle.focus();
      });
      bar.insertBefore(filtersToggle, controls);
      paintFiltersToggle();
    } else controls.remove();
    // Share ends the bar. With no header, the as-of line goes beside the host's own title (asOfInto), else ends the bar.
    bar.append(buildTools());
    if (asOf && !withHeader) {
      if (options.asOfInto) options.asOfInto.replaceChildren(asOf);
      else {
        asOf.classList.add("fft-dashboard-asof-inline");
        bar.append(asOf);
      }
    }
    rowHiddenBefore = !(spec.filters?.length || range || nav);
    filterRow.hidden = rowHiddenBefore && chip.hidden;
  }

  /** The phone's "Filters (n)" button: how many filters are set, the period counting when it is not All. */
  function paintFiltersToggle() {
    const set = Object.keys(chosenFilters()).length + (range && period !== "All" ? 1 : 0);
    filtersToggle.textContent = C.filtersCount(set);
  }

  /** Opens or closes the filters sheet (a phone's view of the controls). */
  function openSheet(open: boolean) {
    filterRow.toggleAttribute("data-sheet", open);
    filtersToggle.setAttribute("aria-expanded", String(open));
    if (open) controls.querySelector<HTMLElement>("button, select")?.focus();
  }

  /**
   * One Share button at the end of the filter row, opening a small menu: Copy link (when the board keeps its state in
   * the address) and Print. Arrow keys move in the menu; Escape, Tab or a click elsewhere closes it.
   */
  function buildTools(): HTMLElement {
    const tools = el("div", "fft-board-tools");
    const status = el("span", "fft-sr-only");
    status.setAttribute("aria-live", "polite");
    const button = el("button", "fft-board-share", B.share);
    button.type = "button";
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    const menu = el("div", "fft-share-menu");
    menu.id = `fft-share-${Math.random().toString(36).slice(2, 8)}`;
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", B.share);
    menu.hidden = true;
    button.setAttribute("aria-controls", menu.id);
    const items: HTMLButtonElement[] = [];
    const item = (text: string, title: string, run: (self: HTMLButtonElement) => void | Promise<void>) => {
      const node = el("button", "fft-board-tool", text);
      node.type = "button";
      node.title = title;
      node.setAttribute("role", "menuitem");
      node.tabIndex = -1;
      node.addEventListener("click", () => void run(node));
      items.push(node);
      menu.append(node);
      return node;
    };
    const close = (refocus: boolean) => {
      if (menu.hidden) return;
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
      if (refocus) button.focus();
    };
    const open = () => {
      menu.hidden = false;
      button.setAttribute("aria-expanded", "true");
      items[0]?.focus();
    };
    if (options.hash) {
      item(B.copyLink, B.copyLinkTitle, async (self) => {
        const url = shareLink();
        let done = false;
        try {
          await doc.defaultView?.navigator.clipboard.writeText(url);
          done = Boolean(doc.defaultView?.navigator.clipboard);
        } catch {
          done = false;
        }
        self.textContent = done ? B.linkCopied : B.copyFailed;
        status.textContent = done ? B.linkCopiedSaid : B.linkFailedSaid;
        root.dispatchEvent(new CustomEvent<{ url: string; copied: boolean }>("fft-share", { bubbles: true, detail: { url, copied: done } }));
        setTimeout(() => {
          self.textContent = B.copyLink;
          close(doc.activeElement === self);
        }, 1597);
      });
    }
    item(B.print, B.printTitle, () => {
      close(true);
      // Every section and tab drawn first, so the printout has them all; the browser's afterprint restores the screen.
      void preparePrint().then(() => {
        try {
          doc.defaultView?.print();
        } catch {
          // No print dialog here (a test page, a locked-down browser): nothing to do.
        }
      });
    });
    button.addEventListener("click", () => (menu.hidden ? open() : close(false)));
    button.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" && menu.hidden) {
        event.preventDefault();
        open();
      }
    });
    menu.addEventListener("keydown", (event) => {
      const at = items.indexOf(doc.activeElement as HTMLButtonElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        items[(at + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        (event.key === "Home" ? items[0] : items.at(-1))?.focus();
      } else if (event.key === "Escape") {
        // The menu takes Escape first, so it does not also clear a click filter.
        event.preventDefault();
        event.stopPropagation();
        close(true);
      } else if (event.key === "Tab") close(false);
    });
    tools.addEventListener("focusout", (event) => {
      const next = (event as FocusEvent).relatedTarget as Node | null;
      if (next && !tools.contains(next)) close(false);
    });
    const outside = (event: Event) => {
      if (!tools.contains(event.target as Node)) close(false);
    };
    doc.addEventListener("pointerdown", outside);
    cleanups.push(() => doc.removeEventListener("pointerdown", outside));
    tools.append(button, menu, status);
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
    const before = active.get(field);
    active.set(field, value);
    const control = selects.get(field);
    if (control) {
      const index = control.values.findIndex((seen) => seen === value || JSON.stringify(seen) === JSON.stringify(value));
      control.select.value = value === null || value === undefined || index < 0 ? "" : String(index);
    }
    writeHash();
    await redraw();
    const none = (v: unknown) => v === null || v === undefined;
    if (none(value) && !none(before)) await sayChange(A.cleared(filterName(field)));
    else if (!none(value) && JSON.stringify(value) !== JSON.stringify(before)) await sayChange(A.set(filterName(field), formatValue(value, undefined, undefined)));
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
    // From here on, a change is news to say aloud.
    settled = true;
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
    refs: () => cardRefs.map(({ slot: _slot, ...entry }) => ({ ref: placedRef(placeOf(), entry.key), ...entry })),
    async reveal(ref) {
      const place = placeOf();
      const found = cardRefs.find((entry) => placedRef(place, entry.key) === ref);
      if (!found) return false;
      const section = sectionOf.get(found.slot);
      if (section) {
        if (tabs || (shownSection && shownSection !== section.id)) choose(tabs ? section : null);
        if (folded.has(section)) await setFolded(section, false);
      }
      found.slot.scrollIntoView?.({ block: "center" });
      found.slot.focus?.({ preventScroll: true });
      return true;
    },
    destroy() {
      doc.defaultView?.removeEventListener("hashchange", onHash);
      printView?.removeEventListener("beforeprint", onBeforePrint);
      printView?.removeEventListener("afterprint", onAfterPrint);
      doc.removeEventListener("keydown", onKey);
      grid.removeEventListener("fft-select", onSelect);
      grid.removeEventListener("pointerdown", pressed, true);
      grid.removeEventListener("click", pressed, true);
      for (const watch of observers) watch.disconnect();
      for (const run of cleanups) run();
      if (sayTimer) clearTimeout(sayTimer);
      barSize?.disconnect();
      navSize?.disconnect();
      if (barSize) page.style.removeProperty("--fft-filters-height");
      stuckSpy?.disconnect();
      for (const widget of widgets.values()) widget.destroy();
      options.asOfInto?.replaceChildren();
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
/* What a filter cannot reach: one line under the row; a card's own pill only while a pointer rests on it. */
.fft-unfiltered { display: none; position: absolute; top: 8px; right: 13px; z-index: 1; margin: 0; padding: 2px 8px; border-radius: 999px; font-size: 11px; line-height: 15px; color: var(--fft-muted, #6e6e73); background: color-mix(in srgb, var(--fft-text, #1d1d1f) 5%, transparent); pointer-events: none; }
@media (hover: hover) { .fft-cell-slot:hover > .fft-unfiltered { display: block; } }
.fft-unreached { margin: 5px 0 0; font-size: 12px; line-height: 18px; color: var(--fft-muted, #6e6e73); }
.fft-unreached[hidden] { display: none; }
.fft-unreached-item { position: relative; border-bottom: 1px dotted currentColor; cursor: help; outline: none; }
.fft-unreached-item:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; border-radius: 3px; }
.fft-unreached-item:is(:hover, :focus-visible)::after { content: attr(data-cards); position: absolute; left: 0; top: calc(100% + 5px); z-index: 5; width: max-content; max-width: min(420px, 80vw); padding: 5px 8px; border-radius: 8px; background: var(--fft-raised, var(--fft-surface, #fff)); color: var(--fft-text, #1d1d1f); box-shadow: 0 0 0 1px var(--fft-border, rgba(0,0,0,.1)), 0 8px 21px rgba(0,0,0,.18); white-space: normal; }
/* The filter area, two lines: the bar (controls, a click filter, Share at the end), then the sections on their own
   line, scrolling sideways when they outgrow it. */
.fft-dashboard .fft-filters { flex-direction: column; flex-wrap: nowrap; align-items: stretch; gap: 8px; }
.fft-filters-bar { display: flex; flex-wrap: nowrap; align-items: center; gap: 13px; min-width: 0; }
.fft-filters-bar .fft-board-tools { margin-left: auto; }
.fft-filter-controls { display: flex; flex: none; align-items: center; gap: 13px; }
.fft-dashboard .fft-board-nav { flex: none; width: 100%; box-sizing: border-box; flex-wrap: nowrap; margin-left: 0; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none; scroll-padding-inline: 34px; }
.fft-dashboard .fft-board-nav::-webkit-scrollbar { display: none; }
.fft-dashboard .fft-board-nav button { flex: none; }
.fft-dashboard .fft-board-nav[data-scroll="start"] { -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 34px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 34px), transparent); }
.fft-dashboard .fft-board-nav[data-scroll="middle"] { -webkit-mask-image: linear-gradient(to right, transparent, #000 34px, #000 calc(100% - 34px), transparent); mask-image: linear-gradient(to right, transparent, #000 34px, #000 calc(100% - 34px), transparent); }
.fft-dashboard .fft-board-nav[data-scroll="end"] { -webkit-mask-image: linear-gradient(to right, transparent, #000 34px); mask-image: linear-gradient(to right, transparent, #000 34px); }
.fft-dashboard .fft-board-nav[data-tabs] button[aria-selected="true"] { color: var(--fft-text); font-weight: 600; background: color-mix(in srgb, var(--fft-text) 8%, transparent); }
.fft-dashboard-asof-inline { margin: 0; flex: none; white-space: nowrap; }
.fft-filters-toggle, .fft-sheet-done { display: none; }
/* Share: one button, a small menu. */
.fft-board-share { min-height: 34px; padding: 0 13px; border: 1px solid color-mix(in srgb, var(--fft-text, #1d1d1f) 14%, transparent); border-radius: 999px; background: transparent; color: inherit; font: inherit; font-size: 13px; cursor: pointer; white-space: nowrap; }
.fft-board-share:hover { background: color-mix(in srgb, var(--fft-text, #1d1d1f) 6%, transparent); }
.fft-board-share:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; }
.fft-board-tools { position: relative; flex: none; }
.fft-share-menu { position: absolute; right: 0; top: calc(100% + 5px); z-index: 10; display: flex; flex-direction: column; gap: 2px; min-width: 144px; padding: 5px; border-radius: 13px; background: var(--fft-raised, var(--fft-surface, #fff)); box-shadow: 0 0 0 1px var(--fft-border, rgba(0,0,0,.1)), 0 13px 34px rgba(0,0,0,.2); }
.fft-share-menu[hidden] { display: none; }
.fft-share-menu .fft-board-tool { border: 0; border-radius: 8px; text-align: left; }
/* A folded section: its heading, and a button that opens it. */
.fft-section-toggle { margin: 5px 0 0; min-height: 34px; padding: 0 13px; border: 1px solid color-mix(in srgb, var(--fft-text, #1d1d1f) 14%, transparent); border-radius: 999px; background: transparent; color: inherit; font: inherit; font-size: 13px; cursor: pointer; }
.fft-section-toggle:hover { background: color-mix(in srgb, var(--fft-text, #1d1d1f) 6%, transparent); }
.fft-section-toggle:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; }
/* The board's source, once, under it; a card from the same source keeps only its byline. */
.fft-board-footer { margin: 21px 0 0; font-size: 12px; color: var(--fft-muted, #6e6e73); }
.fft-cell-slot[data-board-source] .fft-credit-source { display: none; }
.fft-cell-slot[data-board-source] .fft-credit:not(:has(.fft-credit-byline)) { display: none; }
/* Phones: the controls fold into a sheet behind "Filters (n)". */
@media (max-width: 639px) {
  .fft-filters-bar { flex-wrap: wrap; }
  .fft-filters-toggle { display: inline-flex; align-items: center; min-height: 34px; padding: 0 13px; border: 1px solid color-mix(in srgb, var(--fft-text, #1d1d1f) 14%, transparent); border-radius: 999px; background: transparent; color: inherit; font: inherit; font-size: 13px; cursor: pointer; }
  .fft-filters-toggle:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; }
  .fft-filter-controls { display: none; }
  .fft-filters[data-sheet] .fft-filter-controls { display: flex; flex: 1 0 100%; order: 10; flex-direction: column; align-items: stretch; gap: 13px; padding: 13px; border-radius: 13px; background: var(--fft-raised, var(--fft-surface, #fff)); box-shadow: 0 0 0 1px var(--fft-border, rgba(0,0,0,.1)); }
  .fft-filters[data-sheet] .fft-sheet-done { display: block; align-self: flex-end; min-height: 34px; padding: 0 21px; border: 0; border-radius: 999px; background: var(--fft-accent); color: #fff; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  .fft-board-tools { margin-left: auto; }
  .fft-dashboard-asof-inline { flex: 1 0 100%; order: 6; }
}
.fft-skip { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.fft-skip:focus-within { position: static; width: auto; height: auto; margin: 0 0 8px; overflow: visible; clip: auto; white-space: normal; display: flex; flex-wrap: wrap; align-items: baseline; gap: 5px 13px; font-size: 13px; }
.fft-skip-sections { display: flex; flex-wrap: wrap; gap: 5px 13px; margin: 0; padding: 0; list-style: none; }
.fft-skip-link { color: var(--fft-accent); text-underline-offset: 3px; }
.fft-skip-link:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; border-radius: 3px; }
.fft-dashboard .fft-cell-slot[role="group"]:focus { outline: none; }
.fft-dashboard .fft-cell-slot[role="group"]:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 3px; border-radius: 16px; }
.fft-dashboard .fft-board-section h3:focus, .fft-dashboard .fft-filters:focus { outline: none; }
.fft-dashboard .fft-board-section h3:focus-visible, .fft-dashboard .fft-filters:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 3px; border-radius: 5px; }
@media print {
  .fft-skip { display: none !important; }
  .fft-filters, .fft-filters-sentinel, .fft-board-tools, .fft-crossfilter, .fft-widget-ref { display: none !important; }
  .fft-print-state { display: block; margin: 0 0 13px; padding: 0 0 8px; border-bottom: 1px solid #d4d3cd; font-size: 12px; color: #1d1d1f; }
  .fft-dashboard-grid { display: block !important; }
  .fft-dashboard .fft-cell-slot { margin: 0 0 13px; break-inside: avoid; page-break-inside: avoid; }
  .fft-dashboard .fft-cell-slot[hidden], .fft-board-section[hidden] { display: none !important; }
  .fft-board-section { break-before: page; page-break-before: always; margin: 0 0 8px; }
  .fft-dashboard-grid > .fft-board-section:first-child { break-before: auto; page-break-before: auto; }
  .fft-unfiltered { display: none !important; }
  .fft-unreached { color: #515154; }
  .fft-unreached-item::after { display: none; }
  .fft-section-toggle, .fft-board-share, .fft-share-menu { display: none !important; }
  .fft-board-footer { color: #515154; }
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
