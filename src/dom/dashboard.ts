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
    if (options.hash) {
      const view = doc.defaultView;
      view?.history.replaceState(view.history.state, "", section ? `#${section.id}` : `${view.location.pathname}${view.location.search}`);
    }
    if (root.getBoundingClientRect().top < 0) root.scrollIntoView?.({ block: "start" });
  }

  // An address naming one of this board's sections opens the board on it, and the board follows the address as it
  // changes (links, back and forward): a section's id shows it, an empty address shows them all, anything else is left alone.
  const fromAddress = (initial: boolean) => {
    const named = doc.defaultView?.location.hash.slice(1) ?? "";
    const match = sections.find(({ node }) => node.id === named);
    if (match) choose(match.node);
    else if (!named && !initial) choose(null);
  };
  const onHash = () => fromAddress(false);
  if (options.hash && nav) {
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
    return steps.length ? fork(base, { transform: [...steps, ...(base.transform ?? [])] }) : base;
  }

  async function redraw() {
    await Promise.all([...widgets.entries()].map(async ([id, widget]) => widget.setSpec(await specFor(id))));
  }

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
    filterRow.hidden = !(spec.filters?.length || range || nav);
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
    if (period !== "All") await redraw();
  })();

  return {
    root,
    widgets,
    ready,
    setFilter,
    setRange,
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
      barSize?.disconnect();
      if (barSize) page.style.removeProperty("--fft-filters-height");
      stuckSpy?.disconnect();
      for (const widget of widgets.values()) widget.destroy();
      root.remove();
    },
  };
}
