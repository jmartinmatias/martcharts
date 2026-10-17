/**
 * The widget runtime: mounts a spec into the page and keeps it drawn.
 *
 * @module
 */
import { fieldLabel, formatNode, formatValue } from "../core/display.ts";
import { fork } from "../core/fork.ts";
import type { Override } from "../core/fork.ts";
import { runPipeline } from "../core/pipeline.ts";
import { explainChart } from "../core/explain.ts";
import { widgetRef } from "../core/ref.ts";
import { getBlock } from "../core/registry.ts";
import type { Issue, Row, WidgetSpec } from "../core/types.ts";
import { hasErrors, validateSpec } from "../core/validate.ts";
import type { ViewBlock } from "../core/registry.ts";
import type { Tooltip, TooltipItem, ViewContext } from "../core/view-context.ts";
import { ACTION_ICONS, ACTION_LABELS, download, slug, svgToPng, toDelimited } from "./export.ts";
import type { WidgetAction } from "./export.ts";
import { countUp } from "./count-up.ts";
import { fillTemplate, hasTemplate } from "../core/template.ts";
import { renderHeadline } from "./headline.ts";
import { goldenHeight } from "./layout.ts";
import { buildSkeleton, skeletonShape, stateIcon } from "./states.ts";
import { applyStyle, ensureStyles, paletteSize } from "./styles.ts";

/** Options for `createWidget`. */
export interface WidgetOptions {
  /** `fetch` used by `url` sources. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /**
   * Buttons offered in the widget's corner: `csv` downloads the rows, `image`
   * downloads the chart as a PNG (shown only when the view draws a chart),
   * `copy` copies the rows as tab-separated text for spreadsheets, `explain`
   * shows a plain "How to read it" guide under the chart. None by default:
   * whether people may take the data out is the host's decision.
   */
  actions?: WidgetAction[];
  /** Shows the "How to read it" guide from the start, as the expanded view does. */
  guide?: boolean;
  /**
   * The widgets on either side of a given one, for stepping through them in
   * the expanded view (a dashboard passes its own order). Without it, the
   * expanded view shows one widget.
   */
  neighbors?: (widget: Widget) => { previous?: Widget; next?: Widget; position?: number; total?: number };
}

/** A live widget on the page. */
export interface Widget {
  /** The widget's outer element, a `<section class="fft-widget">` inside the target. */
  readonly root: HTMLElement;
  /** The spec currently shown. */
  readonly spec: WidgetSpec;
  /** Rows from the last successful load, after transforms. */
  readonly rows: Row[];
  /** Validation issues from the last load, warnings included. */
  readonly issues: Issue[];
  /** Settles when the first render finishes, whether it drew, showed empty, or showed an error. */
  readonly ready: Promise<void>;
  /** Forks the current spec with `override` (merge patch rules) and redraws. */
  update(override: Override<WidgetSpec>): Promise<void>;
  /** Replaces the spec entirely and redraws. */
  setSpec(spec: WidgetSpec): Promise<void>;
  /** Opens or closes the "How to read it" guide under the chart. */
  showGuide(open: boolean): void;
  /** Reloads the data and redraws. The previous drawing stays, dimmed, until the new data arrives. */
  refresh(): Promise<void>;
  /**
   * Adds the host's own button to the widget's hover toolbar, styled like the
   * built-in actions: `label` names it (tooltip and screen readers), `icon` is
   * SVG path data on a 24px grid drawn as 2px strokes. Returns the button.
   */
  addAction(label: string, icon: string[], onClick: (button: HTMLButtonElement) => void): HTMLButtonElement;
  /** Removes the widget from the page and stops any work in flight. */
  destroy(): void;
}

/** Detail of the `fft-select` event a widget fires when the viewer picks a row. */
export interface SelectDetail {
  row: Row;
  spec: WidgetSpec;
}

const FALLBACK_WIDTH = 640;
/** How long the first-draw entrance animation flag stays on, in milliseconds. */
const ENTRANCE_MS = 1597;
let count = 0;

/**
 * Draws a widget inside `target` and returns a handle to change it later.
 *
 * Fires `fft-select` (a bubbling `CustomEvent<SelectDetail>`) when the viewer
 * clicks or presses Enter on a row, bar or point.
 *
 * @example
 * const widget = createWidget(document.querySelector("#revenue")!, {
 *   title: "Revenue by region",
 *   data: { type: "url", url: "/data/sales.json" },
 *   transform: [{ type: "aggregate", groupBy: "region", measures: [{ op: "sum", field: "revenue" }] }],
 *   view: { type: "bar", x: "region", y: "revenue" },
 * });
 * await widget.ready;
 * widget.update({ view: { type: "table" } });
 */
export function createWidget(target: HTMLElement, spec: WidgetSpec, options: WidgetOptions = {}): Widget {
  const doc = target.ownerDocument;
  ensureStyles(doc);
  const id = `fft-${++count}`;

  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string) => {
    const node = doc.createElement(tag);
    node.className = className;
    return node;
  };
  const root = make("section", "fft-widget");
  const header = make("header", "fft-header");
  const title = make("h3", "fft-title");
  const subtitle = make("p", "fft-subtitle");
  const headlineEl = make("div", "fft-headline");
  const body = make("div", "fft-body");
  const message = make("div", "fft-message");
  const footer = make("p", "fft-footer");
  // The bottom row: the footer, and the widget's ghost ref (W-7Q2K) faintly at the right, a click away from the clipboard.
  const base = make("div", "fft-base");
  const refButton = make("button", "fft-widget-ref");
  refButton.type = "button";
  base.append(footer, refButton);
  const tip = make("div", "fft-tooltip");
  title.id = `${id}-title`;
  message.setAttribute("role", "status");
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  headlineEl.hidden = true;
  header.append(title, subtitle);
  // How to read it: a plain guide under the chart, in the chart's own field names, with one example from its rows.
  const guide = make("p", "fft-guide");
  guide.id = `${id}-guide`;
  guide.setAttribute("aria-live", "polite");
  guide.hidden = !options.guide;
  root.append(header, headlineEl, body, guide, message, base, tip);
  const actionButtons = new Map<WidgetAction, HTMLButtonElement>();
  let bar: HTMLElement | undefined;
  /** Every action in order. Past three, the first two stay in the toolbar and the rest go into a More menu. */
  const entries: HTMLButtonElement[] = [];
  let more: HTMLButtonElement | undefined;
  let menu: HTMLElement | undefined;
  /** An icon of 2px strokes on a 24px grid. */
  const icon = (paths: readonly string[]) => {
    const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("aria-hidden", "true");
    for (const d of paths) {
      const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      svg.append(path);
    }
    return svg;
  };
  /** A toolbar button, named for tooltips and screen readers; its label shows as text when it sits in the More menu. */
  const actionButton = (label: string, paths: readonly string[]) => {
    if (!bar) {
      bar = make("div", "fft-actions");
      // Right after the header, so Tab meets the toolbar before the chart, as it reads (WCAG 2.4.3).
      root.insertBefore(bar, headlineEl);
      // The header keeps the toolbar's width free, so a long title never runs under it, hovered or on touch.
      root.dataset.actions = "";
    }
    const button = make("button", "fft-action");
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.title = label;
    const text = make("span", "fft-action-text");
    text.textContent = label;
    button.append(icon(paths), text);
    entries.push(button);
    layoutActions();
    return button;
  };
  /** Three or fewer actions sit in the toolbar; past three, two stay and the rest go into the More menu. */
  function layoutActions() {
    if (!bar) return;
    if (entries.length <= 3) {
      bar.replaceChildren(...entries);
      return;
    }
    if (!more || !menu) {
      more = make("button", "fft-action fft-more");
      more.type = "button";
      more.setAttribute("aria-label", "More actions");
      more.title = "More actions";
      more.setAttribute("aria-haspopup", "menu");
      more.setAttribute("aria-expanded", "false");
      more.append(icon(["M5 12h.01", "M12 12h.01", "M19 12h.01"]));
      menu = make("div", "fft-menu");
      menu.id = `${id}-menu`;
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", "More actions");
      menu.hidden = true;
      more.setAttribute("aria-controls", menu.id);
      more.addEventListener("click", () => setMenu(Boolean(menu?.hidden)));
      menu.addEventListener("keydown", menuKeys);
      // An item runs its own action first, then the menu closes and focus returns to its button.
      menu.addEventListener("click", (event) => {
        if (!(event.target as Element).closest('[role="menuitem"]')) return;
        setMenu(false);
        more?.focus();
      });
    }
    const [first, second, ...rest] = entries;
    for (const button of [first, second]) {
      button?.removeAttribute("role");
      button?.removeAttribute("tabindex");
    }
    for (const button of rest) {
      button.setAttribute("role", "menuitem");
      button.tabIndex = -1;
    }
    menu.replaceChildren(...rest);
    bar.replaceChildren(first as HTMLButtonElement, second as HTMLButtonElement, more, menu);
  }
  /** Opens or closes the More menu; open, focus goes to its first item and a press outside closes it. */
  function setMenu(open: boolean) {
    if (!menu || !more) return;
    menu.hidden = !open;
    more.setAttribute("aria-expanded", String(open));
    if (open) {
      menu.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
      doc.addEventListener("pointerdown", outsideMenu, true);
    } else {
      doc.removeEventListener("pointerdown", outsideMenu, true);
    }
  }
  function outsideMenu(event: Event) {
    if (!bar?.contains(event.target as Node)) setMenu(false);
  }
  /** Arrow keys, Home and End move through the items; Escape closes back on the button; Tab closes and moves on. */
  function menuKeys(event: KeyboardEvent) {
    if (!menu || !more) return;
    const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const at = items.indexOf(doc.activeElement as HTMLElement);
    const go = (i: number) => {
      event.preventDefault();
      items[(i + items.length) % items.length]?.focus();
    };
    if (event.key === "ArrowDown") go(at + 1);
    else if (event.key === "ArrowUp") go(at - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(items.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setMenu(false);
      more.focus();
    } else if (event.key === "Tab") setMenu(false);
  }
  for (const action of options.actions ?? []) {
    const button = actionButton(ACTION_LABELS[action], ACTION_ICONS[action]);
    button.dataset.action = action;
    if (action === "explain") {
      button.setAttribute("aria-expanded", String(!guide.hidden));
      button.setAttribute("aria-controls", guide.id);
    }
    button.addEventListener("click", () => void runAction(action, button));
    actionButtons.set(action, button);
  }
  target.append(root);

  let current = spec;
  let rows: Row[] = [];
  let issues: Issue[] = [];
  let generation = 0;
  let cleanup: (() => void) | undefined;
  let drawn = false;
  let destroyed = false;
  let drawnWidth = 0;
  let entered = false;

  const tooltip = createTooltip(root, tip);

  /**
   * Touch has no hover: a tap fires pointerenter and then pointerleave at once,
   * so a view's tooltip and highlight would flash and vanish. The root holds
   * back touch pointerleave from the views (it does not bubble, but the root
   * still sees it while capturing) and replays it when the next pointer
   * arrives anywhere on the page, so a tapped mark stays inspected until the
   * viewer taps elsewhere. Mouse, pen and keyboard events pass untouched.
   */
  let held: Element[] = [];
  /** The touch the browser took over to scroll: its leave passes, so scrolling leaves no tooltip behind. */
  let scrolling: number | undefined;
  const holdTouchLeave = (event: Event) => {
    const pointer = event as PointerEvent;
    if (pointer.pointerType !== "touch" || pointer.pointerId === scrolling || event.target === root) return;
    event.stopPropagation();
    held.push(event.target as Element);
  };
  const noteScroll = (event: Event) => {
    scrolling = (event as PointerEvent).pointerId;
  };
  /** Replays the held leaves so each view runs its own deactivate, then clears any highlight left behind. */
  const release = () => {
    if (held.length === 0) return;
    const targets = held;
    held = [];
    // A plain Event has no pointerType, so holdTouchLeave lets the replay through.
    for (const node of targets) node.dispatchEvent(new Event("pointerleave"));
    for (const node of root.querySelectorAll("[data-active]")) node.removeAttribute("data-active");
    tooltip.hide();
  };
  const press = () => {
    scrolling = undefined;
    release();
  };
  root.addEventListener("pointerleave", holdTouchLeave, true);
  root.addEventListener("pointercancel", noteScroll, true);
  // pointerover comes before pointerenter, so tapping another mark clears the old one before the new one lights up.
  doc.addEventListener("pointerover", release, true);
  doc.addEventListener("pointerdown", press, true);
  // Escape dismisses a showing tooltip without moving focus or the pointer (WCAG 1.4.13). It stops there, so a
  // dialog the widget sits in stays open; the next Escape closes the dialog.
  const dismissTip = (event: KeyboardEvent) => {
    // A widget taken off the page without destroy() must not swallow keys meant for the page.
    if (event.key !== "Escape" || tip.hidden || !root.isConnected) return;
    tip.hidden = true;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  doc.addEventListener("keydown", dismissTip, true);

  const resize =
    typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(() => {
          if (root.dataset.state === "ready" && Math.abs(body.clientWidth - drawnWidth) > 1) draw();
        });
  resize?.observe(body);

  function setText(node: HTMLElement, text: string | undefined) {
    node.textContent = text ?? "";
    node.hidden = !text;
  }

  let loaded = false;
  /** Title, subtitle and footer, with templates filled from the rows. Before the first rows arrive, templated text keeps its space but stays invisible. */
  function paintText() {
    for (const [node, text] of [
      [title, current.title],
      [subtitle, current.subtitle],
      [footer, current.footer],
    ] as const) {
      setText(node, text === undefined ? undefined : fillTemplate(text, rows, current.fields, current.locale));
      node.style.visibility = !loaded && text && hasTemplate(text) ? "hidden" : "";
    }
    paintRef();
  }

  /** The ghost ref: shown for widgets with an id, and on the root as data-fft-ref for scripts and tests. */
  function paintRef() {
    const ref = current.id ? widgetRef(current.id) : "";
    refButton.hidden = !ref;
    refButton.textContent = ref;
    if (ref) {
      root.dataset.fftRef = ref;
      refButton.title = `Widget ref ${ref} (id ${current.id}). Click to copy; agents can use it in place of the id.`;
      refButton.setAttribute("aria-label", `Copy widget ref ${ref}`);
    } else {
      delete root.dataset.fftRef;
    }
    base.hidden = footer.hidden && !ref;
  }
  refButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(refButton.textContent ?? "");
      refButton.dataset.done = "";
    } catch {
      refButton.dataset.failed = "";
    }
    setTimeout(() => refButton.removeAttribute(refButton.hasAttribute("data-done") ? "data-done" : "data-failed"), 1597);
  });

  function paintFrame() {
    ensureStyles(doc);
    paintText();
    if (current.title) root.setAttribute("aria-labelledby", title.id);
    else root.removeAttribute("aria-labelledby");
    applyStyle(root, current.style);
    // The widget's text is in its locale's language, for screen reader pronunciation (WCAG 3.1.2).
    if (current.locale) root.lang = current.locale;
    else root.removeAttribute("lang");
    root.dataset.view = typeof current.view?.type === "string" ? current.view.type : "";
  }

  function clearBody() {
    tooltip.hide();
    held = [];
    headlineEl.hidden = true;
    if (cleanup) {
      const run = cleanup;
      cleanup = undefined;
      run();
    }
    body.replaceChildren();
  }

  function showMessage(state: "loading" | "empty" | "error", heading: string, details: string[] = [], hint?: string) {
    root.dataset.state = state;
    if (state === "loading") {
      // A silhouette of the view at its final height, plus the word for screen readers.
      const width = body.clientWidth || FALLBACK_WIDTH;
      const shape = skeletonShape(current.view.type);
      const height = shape === "ring" ? (width >= 480 ? 233 : 144) : (current.style?.height ?? goldenHeight(width));
      const spoken = doc.createElement("span");
      spoken.className = "fft-sr-only";
      spoken.textContent = heading;
      message.replaceChildren(buildSkeleton(doc, shape, height), spoken);
      message.hidden = false;
      return;
    }
    const p = doc.createElement("p");
    p.className = "fft-state-title";
    p.textContent = heading;
    message.replaceChildren(stateIcon(doc, state === "error" ? "alert" : "empty"), p);
    if (hint) {
      const note = doc.createElement("p");
      note.className = "fft-state-hint";
      note.textContent = hint;
      message.append(note);
    }
    if (details.length) {
      const list = doc.createElement("ul");
      for (const detail of details) {
        const item = doc.createElement("li");
        item.textContent = detail;
        list.append(item);
      }
      message.append(list);
    }
    message.hidden = false;
  }

  function showError(details: string[]) {
    clearBody();
    drawn = false;
    root.setAttribute("aria-busy", "false");
    showMessage("error", "Could not draw this widget", details);
  }

  function context(): ViewContext {
    const fields = current.fields;
    const size = paletteSize(current.style);
    const width = body.clientWidth || FALLBACK_WIDTH;
    return {
      el: body,
      rows,
      view: current.view,
      spec: current,
      width,
      height: current.style?.height ?? goldenHeight(width),
      label: (field) => fieldLabel(field, fields),
      format: (value, field) => formatValue(value, field ? fields?.[field]?.format : undefined, current.locale),
      cell: (value, field, extra) => {
        const format = field ? fields?.[field]?.format : undefined;
        if (!extra || format === undefined) return formatNode(value, format, current.locale, doc);
        // Column context goes under the field's own options: an explicit max still wins.
        const spec = typeof format === "string" ? { type: format } : format;
        return formatNode(value, { ...extra, ...spec }, current.locale, doc);
      },
      color: (index) => `var(--fft-series-${(index % size) + 1})`,
      tooltip,
      select: (row) => root.dispatchEvent(new CustomEvent<SelectDetail>("fft-select", { bubbles: true, detail: { row, spec: current } })),
    };
  }

  function draw() {
    clearBody();
    root.setAttribute("aria-busy", "false");
    if (rows.length === 0) {
      drawn = false;
      showMessage("empty", "No data to show", [], "The source returned no rows, or every row was filtered out.");
      return;
    }
    const block = getBlock("view", current.view.type);
    const render = block.render;
    if (!render) {
      showError([`View "${current.view.type}" has no renderer in this page. Import "fft-widgets" or call setRenderer() before drawing it.`]);
      return;
    }
    message.hidden = true;
    message.replaceChildren();
    root.dataset.state = "ready";
    renderHeadline(headlineEl, current, rows);
    try {
      const ctx = context();
      drawnWidth = ctx.width;
      if (current.facet?.field) {
        cleanup = drawFacets(ctx, render, block.extent);
      } else {
        const result = render(ctx);
        cleanup = typeof result === "function" ? result : undefined;
      }
      drawn = true;
      paintGuide();
      const imageButton = actionButtons.get("image");
      if (imageButton) imageButton.hidden = !chartSvg();
      if (!entered) {
        // Marks grow in once, on the first draw only, so redraws stay calm.
        entered = true;
        root.setAttribute("data-animate", "");
        countUp(root);
        setTimeout(() => root.removeAttribute("data-animate"), ENTRANCE_MS);
      }
    } catch (caught) {
      showError([`The ${current.view.type} view failed: ${errorMessage(caught)}`]);
    }
  }

  /** Small multiples: one panel per facet value, sharing one value scale and one legend. */
  function drawFacets(ctx: ViewContext, render: NonNullable<ViewBlock["render"]>, extent: ViewBlock["extent"]): (() => void) | undefined {
    const facet = current.facet as NonNullable<WidgetSpec["facet"]>;
    const groups = new Map<string, { value: unknown; rows: Row[] }>();
    for (const row of rows) {
      const id = JSON.stringify(row[facet.field]);
      const group = groups.get(id);
      if (group) group.rows.push(row);
      else groups.set(id, { value: row[facet.field], rows: [row] });
    }
    const gap = 13;
    const columns = facet.columns ?? Math.max(1, Math.floor((ctx.width + gap) / (233 + gap)));
    const panelWidth = Math.max(89, Math.floor((ctx.width - gap * (columns - 1)) / columns));
    const shared = facet.shared === false || !extent ? undefined : extent(current.view, rows);

    const series = Array.isArray(current.view.y) ? current.view.y.map(String) : [];
    if (series.length > 1) {
      const legend = make("ul", "fft-legend fft-facet-legend");
      series.forEach((field, i) => {
        const swatch = make("span", "fft-swatch");
        swatch.dataset.shape = current.view.type === "bar" ? "rect" : "line";
        swatch.style.background = ctx.color(i);
        swatch.setAttribute("aria-hidden", "true");
        const item = make("li", "");
        item.append(swatch, ctx.label(field));
        legend.append(item);
      });
      body.append(legend);
    }
    const grid = make("div", "fft-facets");
    grid.style.gridTemplateColumns = facet.columns ? `repeat(${facet.columns}, minmax(0, 1fr))` : `repeat(auto-fill, minmax(min(100%, 233px), 1fr))`;
    const cleanups: (() => void)[] = [];
    for (const group of groups.values()) {
      const panel = make("section", "fft-facet");
      const heading = make("h4", "fft-facet-title");
      heading.textContent = formatValue(group.value, current.fields?.[facet.field]?.format, current.locale);
      const panelBody = make("div", "fft-facet-body");
      panel.append(heading, panelBody);
      grid.append(panel);
      const result = render({ ...ctx, el: panelBody, rows: group.rows, width: panelWidth, height: goldenHeight(panelWidth), extent: shared, inFacet: true });
      if (typeof result === "function") cleanups.push(result);
    }
    body.append(grid);
    return cleanups.length ? () => cleanups.forEach((run) => run()) : undefined;
  }

  function chartSvg(): SVGSVGElement | null {
    return body.querySelector<SVGSVGElement>("svg:not(.fft-spark):not(.fft-sparkline)");
  }

  /** Opens the widget redrawn large in a modal dialog: Escape, the backdrop or the close button closes it, and focus comes back. */
  function expand(button: HTMLButtonElement) {
    const overlay = make("div", "fft-overlay");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    const panel = make("div", "fft-overlay-panel");
    /** A round icon button for the dialog: 2px strokes on a 24px grid. */
    const iconButton = (className: string, label: string, paths: string[]) => {
      const b = make("button", className);
      b.type = "button";
      b.setAttribute("aria-label", label);
      b.title = label;
      const icon = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("width", "16");
      icon.setAttribute("height", "16");
      icon.setAttribute("aria-hidden", "true");
      for (const d of paths) {
        const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        icon.append(path);
      }
      b.append(icon);
      return b;
    };
    const shut = iconButton("fft-overlay-close", "Close", ["M6 6l12 12", "M18 6L6 18"]);
    const slot = make("div", "fft-overlay-slot");
    panel.append(shut, slot);
    overlay.append(panel);
    // Inside a dashboard, a pill at the bottom steps through its widgets.
    const nav = options.neighbors
      ? { bar: make("div", "fft-overlay-nav"), prev: iconButton("fft-overlay-prev", "Previous widget", ["M15 5l-7 7 7 7"]), next: iconButton("fft-overlay-next", "Next widget", ["M9 5l7 7-7 7"]), count: make("span", "fft-overlay-count") }
      : undefined;
    if (nav) {
      nav.bar.append(nav.prev, nav.count, nav.next);
      overlay.append(nav.bar);
    }
    doc.body.append(overlay);
    const page = doc.documentElement;
    const overflow = page.style.overflow;
    page.style.overflow = "hidden";
    // Taller than a card allows: 0.618 of the screen, up to 610px.
    const tall = Math.round(Math.min((doc.defaultView?.innerHeight ?? 800) * 0.618, 610));
    let shown: Widget = self;
    let big: Widget | undefined;
    const show = (target: Widget) => {
      big?.destroy();
      slot.replaceChildren();
      shown = target;
      overlay.setAttribute("aria-label", target.spec.title ?? "Widget");
      big = createWidget(slot, fork(target.spec, { style: { height: tall } }), {
        fetch: options.fetch,
        actions: (options.actions ?? []).filter((action) => action !== "expand"),
        // With room to spare, the expanded chart says how to read it from the start.
        guide: true,
      });
      const around = options.neighbors?.(target);
      if (nav && around) {
        nav.prev.disabled = !around.previous;
        nav.next.disabled = !around.next;
        nav.count.textContent = around.position && around.total ? `${around.position} of ${around.total}` : "";
      }
    };
    const step = (direction: 1 | -1) => {
      const around = options.neighbors?.(shown);
      const target = direction > 0 ? around?.next : around?.previous;
      if (target) show(target);
    };
    show(self);
    const close = () => {
      doc.removeEventListener("keydown", onKey);
      big?.destroy();
      overlay.remove();
      page.style.overflow = overflow;
      button.focus();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      // Tab stays inside the dialog: past its last control it comes back to the first, and the other way round.
      else if (event.key === "Tab") {
        const stops = [...overlay.querySelectorAll<HTMLElement>("button:not([disabled]), [tabindex='0'], select, a[href]")].filter((el) => !el.closest("[hidden]"));
        const edge = event.shiftKey ? stops[0] : stops.at(-1);
        if (stops.length && (doc.activeElement === edge || !overlay.contains(doc.activeElement))) {
          event.preventDefault();
          (event.shiftKey ? stops.at(-1) : stops[0])?.focus();
        }
      }
      // A chart inside uses the arrows to move between its marks; only an unused arrow steps between widgets.
      else if (nav && !event.defaultPrevented && (event.key === "ArrowRight" || event.key === "ArrowLeft")) step(event.key === "ArrowRight" ? 1 : -1);
    };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    shut.addEventListener("click", close);
    nav?.prev.addEventListener("click", () => step(-1));
    nav?.next.addEventListener("click", () => step(1));
    // A sideways swipe steps, the way photo viewers do; a mostly vertical drag is left to scrolling.
    let start: { x: number; y: number } | undefined;
    panel.addEventListener("pointerdown", (event) => {
      start = { x: (event as PointerEvent).clientX, y: (event as PointerEvent).clientY };
    });
    panel.addEventListener("pointerup", (event) => {
      if (!start || !nav) return;
      const dx = (event as PointerEvent).clientX - start.x;
      const dy = (event as PointerEvent).clientY - start.y;
      start = undefined;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 2) step(dx < 0 ? 1 : -1);
    });
    doc.addEventListener("keydown", onKey);
    shut.focus();
  }

  /** Opens or closes the guide, keeping the toolbar button in step. */
  function setGuide(open: boolean) {
    guide.hidden = !open;
    actionButtons.get("explain")?.setAttribute("aria-expanded", String(open));
    paintGuide();
  }

  /** Writes the guide for what is drawn now, when it is open. */
  function paintGuide() {
    if (guide.hidden) return;
    guide.replaceChildren(make("strong", "fft-guide-label"), explainChart(current, rows));
    (guide.firstChild as HTMLElement).textContent = "How to read it";
  }

  async function runAction(action: WidgetAction, button: HTMLButtonElement) {
    if (action === "expand") {
      expand(button);
      return;
    }
    if (action === "explain") {
      setGuide(Boolean(guide.hidden));
      return;
    }
    const name = slug(current.id ?? current.title);
    const label = (field: string) => fieldLabel(field, current.fields);
    try {
      if (action === "csv") {
        download(doc, `${name}.csv`, new Blob([toDelimited(rows, label, ",")], { type: "text/csv;charset=utf-8" }));
      } else if (action === "copy") {
        await navigator.clipboard.writeText(toDelimited(rows, label, "\t"));
      } else {
        const chart = chartSvg();
        if (!chart) return;
        const background = getComputedStyle(root).getPropertyValue("--fft-surface").trim() || "#ffffff";
        download(doc, `${name}.png`, await svgToPng(chart, background.startsWith("rgba") || background === "transparent" ? "#ffffff" : background));
      }
      button.dataset.done = "";
      setTimeout(() => button.removeAttribute("data-done"), 1597);
    } catch {
      button.dataset.failed = "";
      setTimeout(() => button.removeAttribute("data-failed"), 1597);
    }
  }

  /** Loads and draws; `fresh` skips cached data (refresh). */
  async function load(fresh = false): Promise<void> {
    const mine = ++generation;
    paintFrame();
    issues = validateSpec(current);
    if (hasErrors(issues)) {
      showError(issues.filter((issue) => issue.level === "error").map((issue) => `${issue.path}: ${issue.message}`));
      return;
    }
    root.setAttribute("aria-busy", "true");
    if (!drawn) {
      clearBody();
      showMessage("loading", "Loading");
    }
    try {
      const loadedRows = await runPipeline(current, { fetch: options.fetch, fresh });
      if (mine !== generation || destroyed) return;
      rows = loadedRows;
      loaded = true;
      paintText();
      issues = validateSpec(current, rows);
      draw();
    } catch (caught) {
      if (mine !== generation || destroyed) return;
      showError([errorMessage(caught)]);
    }
  }

  const ready = load();

  const self: Widget = {
    root,
    get spec() {
      return current;
    },
    get rows() {
      return rows;
    },
    get issues() {
      return issues;
    },
    ready,
    update(override) {
      current = fork(current, override as Override<WidgetSpec>);
      return load();
    },
    setSpec(next) {
      current = next;
      return load();
    },
    refresh: () => load(true),
    showGuide: (open) => setGuide(open),
    addAction(label, icon, onClick) {
      const button = actionButton(label, icon);
      button.addEventListener("click", () => onClick(button));
      return button;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      generation++;
      resize?.disconnect();
      doc.removeEventListener("pointerover", release, true);
      doc.removeEventListener("pointerdown", press, true);
      doc.removeEventListener("keydown", dismissTip, true);
      doc.removeEventListener("pointerdown", outsideMenu, true);
      clearBody();
      root.remove();
    },
  };
  return self;
}

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught);
}

/** The widget's single tooltip. Text only: labels often come from data, so nothing is parsed as HTML. */
/** How long a tooltip waits after the mouse leaves its mark, so the mouse can reach it (WCAG 1.4.13, hoverable). */
const TIP_GRACE = 144;

function createTooltip(root: HTMLElement, tip: HTMLElement): Tooltip {
  const doc = root.ownerDocument;
  // A mouse leaving a mark gives the tooltip a moment: if the mouse reaches it, it stays until the mouse leaves it.
  // Every other hide (blur, a tap elsewhere, a redraw) is immediate.
  let closing: ReturnType<typeof setTimeout> | undefined;
  let hovered = false;
  let mouseLeaving = false;
  root.addEventListener(
    "pointerleave",
    (event) => {
      if ((event as PointerEvent).pointerType !== "mouse") return;
      mouseLeaving = true;
      queueMicrotask(() => (mouseLeaving = false));
    },
    true,
  );
  tip.addEventListener("pointerenter", () => {
    hovered = true;
    clearTimeout(closing);
  });
  tip.addEventListener("pointerleave", () => {
    hovered = false;
    tip.hidden = true;
  });
  const span = (className: string, text?: string) => {
    const node = doc.createElement("span");
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  return {
    show(anchor: Element, title: string, items: TooltipItem[], options: { below?: boolean } = {}) {
      clearTimeout(closing);
      const heading = doc.createElement("div");
      heading.className = "fft-tooltip-title";
      heading.textContent = title;
      const lines = items.map((item) => {
        const row = doc.createElement("div");
        row.className = "fft-tooltip-row";
        if (item.color) {
          const key = span("fft-tooltip-key");
          key.style.background = item.color;
          row.append(key);
        }
        row.append(span("fft-tooltip-value", item.value), span("fft-tooltip-label", item.label));
        return row;
      });
      tip.replaceChildren(heading, ...lines);
      tip.hidden = false;
      const box = anchor.getBoundingClientRect();
      const frame = root.getBoundingClientRect();
      const half = tip.offsetWidth / 2;
      const center = box.left - frame.left + box.width / 2;
      let left = Math.min(Math.max(center, half + 4), Math.max(half + 4, frame.width - half - 4));
      // A narrow widget on a phone can still push it off screen: keep it 8px inside the viewport, the left edge winning.
      const screen = doc.documentElement.clientWidth;
      if (screen > 0) left = Math.max(Math.min(left, screen - 8 - frame.left - half), 8 - frame.left + half);
      tip.style.left = `${left}px`;
      // Above the anchor by default; below it when the view asks, for marks whose room is underneath.
      if (options.below) tip.dataset.placement = "below";
      else delete tip.dataset.placement;
      tip.style.top = `${(options.below ? box.bottom : box.top) - frame.top}px`;
    },
    hide() {
      clearTimeout(closing);
      if (mouseLeaving && !tip.hidden) {
        closing = setTimeout(() => {
          if (!hovered) tip.hidden = true;
        }, TIP_GRACE);
        return;
      }
      hovered = false;
      tip.hidden = true;
    },
  };
}
