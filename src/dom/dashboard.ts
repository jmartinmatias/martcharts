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
  /** The latest date across every widget whose data has the range field: the end every period counts back from. */
  let latestDate: Promise<string> | undefined;
  const latest = () => (latestDate ??= (async () => {
    if (!range) return "";
    let max = "";
    for (const [id, rows] of rawRows) {
      const fields = await rawFields.get(id);
      const field = rangeFields.find((f) => fields?.has(f));
      if (!field) continue;
      for (const row of await rows) {
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

  /** The expanded view steps through the board's widgets in grid order, sections skipped. */
  const neighbors = (widget: Widget) => {
    const list = [...widgets.values()];
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
    const found = cell.spec ?? (cell.widget ? (options.widgets?.[cell.widget] ?? options.resolve?.(cell.widget)) : undefined);
    if (!found) {
      mount.append(el("p", "fft-cell-missing", `No widget "${cell.widget ?? index}".`));
      return;
    }
    originals.set(id, found);
    const rows = runPipeline({ data: found.data }, { fetch: options.fetch }).catch(() => [] as Row[]);
    rawRows.set(id, rows);
    rawFields.set(id, rows.then((list) => new Set(list.flatMap((row) => Object.keys(row)))));
    const widget = createWidget(mount, found, { actions: options.actions, fetch: options.fetch, neighbors });
    widgets.set(id, widget);
    options.decorate?.(mount, id, widget);
  });

  // Section links: with two or more sections, the filter row links to each, the one in view marked current.
  const links = new Map<Element, HTMLAnchorElement>();
  const nav = sections.length > 1 ? el("nav", "fft-board-nav") : undefined;
  let spy: IntersectionObserver | undefined;
  let atBottom: (() => void) | undefined;
  if (nav) {
    nav.setAttribute("aria-label", "Sections");
    for (const { node, title } of sections) {
      const link = el("a", "", title);
      link.href = `#${node.id}`;
      link.addEventListener("click", () => markCurrent(node));
      links.set(node, link);
      nav.append(link);
    }
    filterRow.append(nav);
    if (typeof IntersectionObserver === "function") {
      // A heading counts as in view in the top part of the viewport. A jump can bring several in at once: the topmost is the one jumped to.
      spy = new IntersectionObserver((entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) markCurrent(hit.target);
      }, { rootMargin: "0px 0px -60% 0px" });
      for (const { node } of sections) spy.observe(node);
      // On every scroll, the current section is the last heading above the reading line (0.4 of the viewport). The
      // observer alone goes stale when a jump skips past headings without crossing them. A short last section can
      // never reach the line: at the very bottom of the page it is the current one.
      const last = sections.at(-1)?.node;
      const view = doc.defaultView;
      if (last && view) {
        atBottom = () => {
          if (view.scrollY > 0 && view.scrollY + view.innerHeight >= doc.documentElement.scrollHeight - 2) {
            markCurrent(last);
            return;
          }
          let current = sections[0]?.node;
          for (const { node } of sections) if (node.getBoundingClientRect().top <= view.innerHeight * 0.4) current = node;
          if (current) markCurrent(current);
        };
        view.addEventListener("scroll", atBottom, { passive: true });
      }
    }
  }

  function markCurrent(section: Element) {
    for (const [node, link] of links) {
      if (node !== section) link.removeAttribute("aria-current");
      else if (!link.hasAttribute("aria-current")) {
        link.setAttribute("aria-current", "true");
        // On narrow screens the links scroll sideways: center the current one. CSS owns the motion (scroll-behavior).
        if (nav && nav.scrollWidth > nav.clientWidth) {
          const box = nav.getBoundingClientRect();
          const chip = link.getBoundingClientRect();
          nav.scrollBy({ left: chip.left - box.left - (box.width - chip.width) / 2 });
        }
      }
    }
  }

  // A pinned filter row wraps to several lines on a phone: track its height so a jumped-to section scrolls clear of it.
  const barSize = options.sticky && typeof ResizeObserver === "function" ? new ResizeObserver(() => root.style.setProperty("--fft-filters-height", `${filterRow.offsetHeight}px`)) : undefined;
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
    async setOverride(patch) {
      override = fork(override, patch);
      // A preset built for one color scheme (glass is dark, airy and paper light) takes the filter row and headings with it.
      const preset = (override.style as { preset?: unknown } | undefined)?.preset;
      const scheme = typeof preset === "string" ? getPreset(preset)?.scheme : undefined;
      if (scheme) root.dataset.scheme = scheme;
      else delete root.dataset.scheme;
      await redraw();
    },
    destroy() {
      spy?.disconnect();
      if (atBottom) doc.defaultView?.removeEventListener("scroll", atBottom);
      barSize?.disconnect();
      stuckSpy?.disconnect();
      for (const widget of widgets.values()) widget.destroy();
      root.remove();
    },
  };
}
