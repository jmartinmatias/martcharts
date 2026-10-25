/**
 * The dashboard runtime: draws a grid of widgets from a `DashboardSpec`, with
 * one filter row above them that scopes every widget whose data has the field.
 *
 * @module
 */
import { RANGE_OPTIONS, rangeStart } from "../core/dashboard.ts";
import { getPreset } from "../core/presets.ts";
import type { DashboardSpec } from "../core/dashboard.ts";
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
  if (spec.title || spec.subtitle) {
    const header = el("header", "fft-dashboard-header");
    if (spec.title) header.append(el("h2", "fft-dashboard-title", spec.title));
    if (spec.subtitle) header.append(el("p", "fft-dashboard-subtitle", spec.subtitle));
    root.append(header);
  }
  const filterRow = el("div", "fft-filters");
  const grid = el("div", "fft-dashboard-grid");
  grid.style.setProperty("--fft-cols", String(columns));
  root.append(filterRow, grid);
  target.append(root);

  const widgets = new Map<string, Widget>();
  const originals = new Map<string, WidgetSpec>();
  const rawFields = new Map<string, Promise<Set<string>>>();
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
      mount.append(el("p", "fft-cell-missing", `No widget "${cell.widget ?? index}".`));
      return;
    }
    originals.set(id, found);
    const rows = runPipeline({ data: found.data }, { fetch: options.fetch }).catch(() => [] as Row[]);
    rawRows.set(id, rows);
    rawFields.set(id, rows.then((list) => new Set(list.flatMap((row) => Object.keys(row)))));
    const widget = createWidget(mount, found, { actions: options.actions, fetch: options.fetch, neighbors, guide: options.guides });
    widgets.set(id, widget);
    slotOf.set(widget, slot);
    options.decorate?.(mount, id, widget);
  });

  // Section filter: with two or more sections, the filter row offers All and each section, like the period control.
  const nav = sections.length > 1 ? el("div", "fft-board-nav") : undefined;
  const sectionButtons: HTMLButtonElement[] = [];
  if (nav) {
    nav.setAttribute("role", "group");
    nav.setAttribute("aria-label", "Sections");
    for (const entry of [null, ...sections]) {
      const button = el("button", "", entry ? entry.title : "All");
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
    if (root.getBoundingClientRect().top < 0) root.scrollIntoView?.({ block: "start" });
  }

  /**
   * The address, when the board keeps it: the section in view and the click filter, as `#<section>&cf=<filter>`.
   * The filter is JSON ([field, value, source]) so numbers stay numbers through a reload.
   */
  function writeHash() {
    if (!options.hash) return;
    const view = doc.defaultView;
    if (!view) return;
    const parts = [shownSection, cross ? `cf=${encodeURIComponent(JSON.stringify([cross.field, cross.value, cross.source ?? null]))}` : null].filter(Boolean);
    view.history.replaceState(view.history.state, "", parts.length ? `#${parts.join("&")}` : `${view.location.pathname}${view.location.search}`);
  }

  /** The two parts of the address: the section named, and the click filter written there. */
  function readHash(): { section: string; cross?: CrossFilter } {
    const parts = (doc.defaultView?.location.hash.slice(1) ?? "").split("&");
    let found: CrossFilter | undefined;
    const named = parts.filter((part) => {
      if (!part.startsWith("cf=")) return true;
      try {
        const [field, value, source] = JSON.parse(decodeURIComponent(part.slice(3))) as [unknown, unknown, unknown];
        if (typeof field === "string" && field) found = { field, value, ...(typeof source === "string" ? { source } : {}) };
      } catch {
        // A filter that does not read is ignored, like an unknown section.
      }
      return false;
    });
    return { section: named[0] ?? "", ...(found ? { cross: found } : {}) };
  }

  // An address naming one of this board's sections opens the board on it, and the board follows the address as it
  // changes (links, back and forward): a section's id shows it, an empty address shows them all, anything else is left alone.
  let pendingCross: CrossFilter | undefined;
  const fromAddress = (initial: boolean) => {
    const { section: named, cross: wanted } = readHash();
    if (nav) {
      const match = sections.find(({ node }) => node.id === named);
      if (match) choose(match.node);
      else if (!named && !initial) choose(null);
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

  async function specFor(id: string): Promise<WidgetSpec> {
    const base = fork(originals.get(id) as WidgetSpec, override);
    const fields = (await rawFields.get(id)) ?? new Set<string>();
    const steps: TransformSpec[] = [...active.entries()]
      .filter(([field, value]) => value !== null && value !== undefined && fields.has(field))
      .map(([field, value]) => ({ type: "filter", field, op: "==", value }));
    const field = rangeFields.find((f) => fields.has(f));
    const from = field ? rangeStart(period, await latest()) : null;
    if (field && from) steps.push({ type: "filter", field, op: ">=", value: from });
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
    await Promise.all([...widgets.entries()].map(async ([id, widget]) => widget.setSpec(await specFor(id))));
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
      chip.setAttribute("aria-label", `Clear filter ${text}`);
      chip.title = "Clear this filter (Escape)";
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
    const label = el("span", "fft-range-label", range.label ?? "Period");
    label.id = `fft-range-${Math.random().toString(36).slice(2, 7)}`;
    group.setAttribute("aria-labelledby", label.id);
    const track = el("div", "fft-range-track");
    for (const option of periods) {
      const button = el("button", "", option);
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
      select.add(new Option("All", ""));
      seen.forEach((value, i) => select.add(new Option(formatValue(value, undefined, undefined), String(i))));
      select.addEventListener("change", () => void setFilter(filter.field, select.value === "" ? null : seen[Number(select.value)]));
      selects.set(filter.field, { select, values: seen });
      wrap.append(label, select);
      filterRow.insertBefore(wrap, nav ?? null);
    }
    rowHiddenBefore = !(spec.filters?.length || range || nav);
    filterRow.hidden = rowHiddenBefore && chip.hidden;
  }

  async function setFilter(field: string, value: unknown) {
    active.set(field, value);
    const control = selects.get(field);
    if (control) {
      const index = control.values.indexOf(value);
      control.select.value = value === null || value === undefined || index < 0 ? "" : String(index);
    }
    await redraw();
  }

  const ready = (async () => {
    await buildFilters();
    await Promise.all([...widgets.values()].map((widget) => widget.ready));
    if (pendingCross) await setCrossFilter(pendingCross.field, pendingCross.value, pendingCross.source);
    else if (period !== "All") await redraw();
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

/** The click filter's chip, on the library's tokens; injected once per document. */
const BOARD_CSS = `
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
