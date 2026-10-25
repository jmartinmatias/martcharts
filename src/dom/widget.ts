/**
 * The widget runtime: mounts a spec into the page and keeps it drawn.
 *
 * @module
 */
import { fieldLabel, formatNode, formatValue } from "../core/display.ts";
import { normalizeView } from "../core/aliases.ts";
import { fork } from "../core/fork.ts";
import type { Override } from "../core/fork.ts";
import { runPipeline } from "../core/pipeline.ts";
import { describeChart } from "../core/catalog.ts";
import { explainChart } from "../core/explain.ts";
import { questionOf } from "../core/question.ts";
import { widgetRef } from "../core/ref.ts";
import { getBlock } from "../core/registry.ts";
import type { Issue, Row, WidgetSpec } from "../core/types.ts";
import { hasErrors, validateSpec } from "../core/validate.ts";
import type { ViewBlock } from "../core/registry.ts";
import { categoryField, fillRowTemplate } from "../core/view-context.ts";
import type { Tooltip, TooltipItem, ViewContext } from "../core/view-context.ts";
import { ACTION_ICONS, ACTION_LABELS, cardToPng, cardToSvg, download, slug, svgToPng, toDelimited } from "./export.ts";
import type { WidgetAction } from "./export.ts";
import { countUp } from "./count-up.ts";
import { fillTemplate, hasTemplate } from "../core/template.ts";
import { renderHeadline } from "./headline.ts";
import { goldenHeight } from "./layout.ts";
import { buildSkeleton, skeletonShape, stateIcon } from "./states.ts";
import { wordsFor } from "../core/words.ts";
import type { Words } from "../core/words.ts";
import { highlightedNames, isHighlightRule, matchRule, ruleColor, ruleColors, rowRuleColor } from "../core/rules.ts";
import type { ColorRule } from "../core/rules.ts";
import { atWidth, breakpointKey } from "../core/responsive.ts";
import { shapeRows } from "../core/shape.ts";
import { isRich, richLines } from "../core/rich.ts";
import { MIN_REFRESH } from "../core/sources.ts";
import { readNumber } from "../core/formats.ts";
import { applyStyle, ensureStyles, paletteSize } from "./styles.ts";

/** Options for `createWidget`. */
export interface WidgetOptions {
  /** `fetch` used by `url` sources. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /**
   * Why there are no rows, when a host knows: a dashboard says which of its filters emptied the card ("Nothing for
   * Topic: Prudential") and offers to clear them, instead of the generic "No data to show".
   */
  emptyNote?: () => { text: string; action?: { label: string; run: () => void } } | undefined;
  /**
   * Buttons offered in the widget's corner: `csv` downloads the rows, `image`
   * downloads the chart as a PNG (shown only when the view draws a chart),
   * `copy` copies the rows as tab-separated text for spreadsheets, `explain`
   * shows a plain "How to read it" guide under the chart. `info` turns the card round to
   * its Details side (and lets a click on the card do the same). None by default:
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
  /** Turns the card to its Details side (chart, data, fields, steps, links) or back to the chart. Settles when the turn ends. */
  showDetails(open: boolean): Promise<void>;
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
  // The widget's own words, in the language of its locale (kept in step with the spec as it changes).
  let speaks = spec.locale;
  const W = (): Words => wordsFor(speaks);
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
  // The credit under the footer: "Source: Eurostat · Chart: Marta", the source a link when it has an address.
  const credit = make("p", "fft-credit");
  // The bottom row: the footer and credit, and the widget's ghost ref (W-7Q2K) faintly at the right, a click away from the clipboard.
  const base = make("div", "fft-base");
  const smallPrint = make("div", "fft-small-print");
  // Live data says when it was last true: "Updated 12:04", quietly, under the footer. In the card only while a source refreshes.
  const stamp = make("p", "fft-updated");
  stamp.hidden = true;
  smallPrint.append(footer, credit);
  const refButton = make("button", "fft-widget-ref");
  refButton.type = "button";
  base.append(smallPrint, refButton);
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
      more.setAttribute("aria-label", W().widget.moreActions);
      more.title = W().widget.moreActions;
      more.setAttribute("aria-haspopup", "menu");
      more.setAttribute("aria-expanded", "false");
      more.append(icon(["M5 12h.01", "M12 12h.01", "M19 12h.01"]));
      menu = make("div", "fft-menu");
      menu.id = `${id}-menu`;
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", W().widget.moreActions);
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
    const button = actionButton(W().widget.actions[action] ?? ACTION_LABELS[action], ACTION_ICONS[action]);
    button.dataset.action = action;
    if (action === "explain") {
      button.setAttribute("aria-expanded", String(!guide.hidden));
      button.setAttribute("aria-controls", guide.id);
    }
    if (action === "info") {
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-controls", `${id}-back`);
    }
    button.addEventListener("click", () => void runAction(action, button));
    actionButtons.set(action, button);
  }
  target.append(root);

  let current = spec;
  /**
   * The view as its renderer reads it at the card's width: the breakpoints (`spec.responsive`) for that width merged
   * in, canonical option names (value, color, flag) moved onto the renderer's own, and a highlight given as a rule
   * (`{ field, op, value }` or `{ top }`) turned into the names of the categories it picks. Recomputed only when the
   * spec, a crossed breakpoint or the rows change.
   */
  let normalized: { from: unknown; key: string; rows: Row[]; view: WidgetSpec["view"] } | undefined;
  const cardWidth = () => body.clientWidth || FALLBACK_WIDTH;
  const drawView = (): WidgetSpec["view"] => {
    const width = cardWidth();
    const key = breakpointKey(current.responsive, width);
    if (normalized?.from !== current.view || normalized.key !== key || normalized.rows !== rows) {
      let view = normalizeView(atWidth(current, width).view);
      if (isHighlightRule(view.highlight)) {
        const first = rows[0];
        const category = first ? categoryField(view, first) : undefined;
        const names = category ? highlightedNames(view.highlight, rows, category) : [];
        // A rule that picks nothing lights nothing: every mark steps back, rather than every mark staying in colour.
        view = { ...view, highlight: names.length ? names : ["\u0000none"] };
      }
      normalized = { from: current.view, key, rows, view };
    }
    return normalized.view;
  };
  /** The spec as drawn at the card's width: its breakpoints' view and style merged in. */
  const shownSpec = (): WidgetSpec => atWidth(current, cardWidth());
  /**
   * The rows the view draws: the loaded rows, shaped again (sort, top N, Other) when a breakpoint changed the view's
   * shaping, so "limit 5 on a phone" holds.
   */
  const viewRows = (): Row[] => {
    const shaping = (view: Record<string, unknown>) => JSON.stringify([view.sort, view.order, view.limit, view.other]);
    const view = drawView();
    return shaping(view) === shaping(normalizeView(current.view)) ? rows : shapeRows(view, rows, current.facet?.field);
  };
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
   * The Details side (the `info` action): the card swirls round to show what the widget is made of, its chart,
   * data, fields and steps, and where to go next. Clicking any plain part of the card turns it, as does the toolbar
   * button; marks, buttons and links keep their own clicks. Escape or "Back to chart" turns it back.
   */
  const back = make("div", "fft-back");
  back.id = `${id}-back`;
  back.hidden = true;
  back.setAttribute("role", "region");
  back.setAttribute("aria-label", W().widget.details);
  root.append(back);
  let turning = false;
  const canTurn = (options.actions ?? []).includes("info");

  function detail(list: HTMLElement, term: string, value: string | Node | undefined) {
    if (value === undefined || value === "") return;
    const dt = make("dt", "fft-back-term");
    dt.textContent = term;
    const dd = make("dd", "fft-back-value");
    dd.append(value);
    list.append(dt, dd);
  }

  function link(label: string, href: string) {
    const a = make("a", "fft-back-link");
    a.href = href;
    a.textContent = label;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  }

  /** Writes the Details side for what is drawn now. */
  function paintBack() {
    const view = typeof drawView()?.type === "string" ? drawView().type : "";
    const entry = view ? describeChart(view) : undefined;
    const kicker = make("p", "fft-back-kicker");
    kicker.textContent = W().widget.details;
    const heading = make("h3", "fft-back-title");
    heading.textContent = title.textContent || current.id || W().widget.widget;
    const parts: Node[] = [kicker, heading];
    if (current.description) {
      const about = make("p", "fft-back-about");
      about.textContent = current.description;
      parts.push(about);
    }

    const list = make("dl", "fft-back-list");
    detail(list, W().widget.answers, questionOf(current, rows).text);
    detail(list, W().widget.chart, entry ? `${view}: ${entry.summary}` : view);
    const data = current.data ?? { type: "" };
    const address = typeof data.url === "string" ? data.url : undefined;
    detail(list, W().widget.data, address ? link(address, address) : data.type === "inline" ? W().widget.writtenInSpec : data.type === "fn" ? W().widget.loadedByPage : data.type);
    if (typeof data.path === "string") detail(list, W().widget.inside, data.path);
    const steps = (current.transform ?? []).map((step) => step.type);
    detail(list, W().widget.steps, steps.length ? steps.join(" → ") : undefined);
    const names = [...new Set(rows.slice(0, 50).flatMap((row) => Object.keys(row)))];
    detail(list, W().widget.rows, loaded ? W().widget.rowsDrawn(rows.length.toLocaleString(current.locale), names.length) : W().widget.notLoaded);
    if (names.length) {
      const shown = names.slice(0, 12).map((name) => {
        const label = fieldLabel(name, current.fields);
        const format = current.fields?.[name]?.format;
        const kind = typeof format === "string" ? format : format && typeof format === "object" && "type" in format ? String(format.type) : "";
        return `${label === name ? name : `${label} (${name})`}${kind ? `: ${kind}` : ""}`;
      });
      detail(list, W().widget.fields, shown.join(", ") + (names.length > 12 ? W().widget.andMore(names.length - 12) : ""));
    }
    if (current.facet?.field) detail(list, W().widget.panels, W().widget.onePer(fieldLabel(current.facet.field, current.fields)));
    if (current.locale) detail(list, W().widget.locale, current.locale);
    if (current.id) detail(list, W().widget.id, W().widget.idRef(current.id, widgetRef(current.id)));
    const warnings = issues.filter((issue) => issue.level !== "error");
    if (warnings.length) detail(list, W().widget.notes, warnings.map((issue) => `${issue.path}: ${issue.message}`).join(" "));
    parts.push(list);

    const links = (current.links ?? []).filter((item) => item && typeof item.href === "string");
    if (links.length) {
      const label = make("p", "fft-back-kicker");
      label.textContent = W().widget.linked;
      const items = make("ul", "fft-back-links");
      for (const item of links) {
        const li = make("li", "");
        li.append(link(item.label || item.href, item.href));
        items.append(li);
      }
      parts.push(label, items);
    }

    const tools = make("div", "fft-back-tools");
    const close = make("button", "fft-back-button");
    close.type = "button";
    close.textContent = W().widget.backToChart;
    close.addEventListener("click", () => void turn(false));
    const copy = make("button", "fft-back-button");
    copy.type = "button";
    copy.textContent = W().widget.copySpec;
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(current, null, 2));
        copy.textContent = W().widget.copied;
      } catch {
        copy.textContent = W().widget.couldNotCopy;
      }
      setTimeout(() => (copy.textContent = W().widget.copySpec), 1597);
    });
    tools.append(close, copy);
    parts.push(tools);
    back.replaceChildren(...parts);
  }

  /** Turns the card: a quarter turn out, swap sides, a quarter turn back in. Without motion, it just swaps. */
  async function turn(open: boolean) {
    if (turning || open === !back.hidden) return;
    turning = true;
    const swap = () => {
      if (open) {
        // The back keeps the front's size, so the page does not jump; long details scroll inside it.
        root.style.height = `${root.offsetHeight}px`;
        paintBack();
        root.dataset.side = "back";
        back.hidden = false;
      } else {
        back.hidden = true;
        delete root.dataset.side;
        root.style.height = "";
      }
      actionButtons.get("info")?.setAttribute("aria-expanded", String(open));
    };
    const still = doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    try {
      if (still || typeof root.animate !== "function") swap();
      else {
        const out = root.animate(
          [{ transform: "perspective(1200px) rotateY(0deg)" }, { transform: "perspective(1200px) rotateY(90deg) rotateZ(-3deg) scale(0.96)" }],
          { duration: 233, easing: "cubic-bezier(0.5, 0, 0.75, 0)", fill: "forwards" },
        );
        await out.finished;
        swap();
        out.cancel();
        await root.animate(
          [{ transform: "perspective(1200px) rotateY(-90deg) rotateZ(3deg) scale(0.96)" }, { transform: "perspective(1200px) rotateY(0deg)" }],
          { duration: 377, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
        ).finished;
      }
    } catch {
      // An animation cancelled by destroy() or a hidden tab: the sides are already swapped or about to be.
      if (open === back.hidden) swap();
    } finally {
      turning = false;
    }
    if (open) back.querySelector<HTMLButtonElement>(".fft-back-button")?.focus({ preventScroll: true });
    else (actionButtons.get("info") ?? undefined)?.focus({ preventScroll: true });
  }

  const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [tabindex]:not([tabindex="-1"]), [role="button"], [contenteditable]';
  root.addEventListener("click", (event) => {
    if (!canTurn || turning) return;
    const target = event.target as Element | null;
    if (!target || target.closest(INTERACTIVE) || target.closest(".fft-tooltip")) return;
    if (doc.getSelection?.()?.toString()) return;
    void turn(root.dataset.side !== "back");
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !back.hidden) {
      event.preventDefault();
      void turn(false);
    }
  });

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
          if (back.hidden && root.dataset.state === "ready" && Math.abs(body.clientWidth - drawnWidth) > 1) draw();
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
      [footer, current.note ?? current.footer],
    ] as const) {
      setText(node, text === undefined ? undefined : fillTemplate(text, rows, current.fields, current.locale));
      node.style.visibility = !loaded && text && hasTemplate(text) ? "hidden" : "";
    }
    paintCredit();
    paintRef();
  }

  /** The credit line: the source (linked when it has an address) and the byline, as text nodes, a middle dot between them. */
  function paintCredit() {
    credit.replaceChildren();
    const source = current.source;
    if (source && typeof source.name === "string" && source.name) {
      credit.append(W().widget.source);
      if (source.url) {
        const link = make("a", "fft-credit-link");
        link.href = source.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = source.name;
        credit.append(link);
      } else credit.append(source.name);
    }
    const byline = typeof current.byline === "string" && current.byline ? fillTemplate(current.byline, rows, current.fields, current.locale) : "";
    if (byline) credit.append(credit.childNodes.length ? ` ·${W().widget.chartBy(byline)}` : W().widget.chartBy(byline).trimStart());
    credit.hidden = credit.childNodes.length === 0;
    credit.style.visibility = !loaded && current.byline && hasTemplate(current.byline) ? "hidden" : "";
  }

  /** The ghost ref: shown for widgets with an id, and on the root as data-fft-ref for scripts and tests. */
  function paintRef() {
    const ref = current.id ? widgetRef(current.id) : "";
    refButton.hidden = !ref;
    refButton.textContent = ref;
    if (ref) {
      root.dataset.fftRef = ref;
      refButton.title = W().widget.refTitle(ref, String(current.id));
      refButton.setAttribute("aria-label", W().widget.copyRef(ref));
    } else {
      delete root.dataset.fftRef;
    }
    smallPrint.hidden = footer.hidden && credit.hidden && stamp.hidden;
    base.hidden = smallPrint.hidden && !ref;
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
    root.dataset.view = typeof drawView()?.type === "string" ? drawView().type : "";
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
      const shape = skeletonShape(drawView().type);
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
    showMessage("error", W().widget.couldNotDraw, details);
  }

  /**
   * The views' tooltip, or, when the spec carries a `tooltip` template, a tooltip that writes the template filled from
   * the row a mark stands for. `"Revenue: {revenue}\nOwner: {owner}"` gives two lines; a line "Label: value" shows its
   * value strong and its label beside it, as built-in tooltips do. An object `{ title, body }` also sets the title.
   * A mark that stands for no single row (a bin, a total) keeps the view's own tooltip.
   */
  function templatedTooltip(): Tooltip {
    const raw = (current as { tooltip?: unknown }).tooltip;
    const body = typeof raw === "string" ? raw : raw && typeof raw === "object" ? (raw as { body?: unknown }).body : undefined;
    const head = raw && typeof raw === "object" ? (raw as { title?: unknown }).title : undefined;
    if (typeof body !== "string" && typeof head !== "string") return tooltip;
    const format = (value: unknown, field: string) => formatValue(value, current.fields?.[field]?.format, current.locale);
    const fill = (text: string, row: Row) => fillRowTemplate(text, row, format, (t) => fillTemplate(t, rows, current.fields, current.locale));
    const rowFor = (title: string): Row | undefined => {
      const first = rows[0];
      const field = first ? categoryField(drawView(), first) : undefined;
      if (!field) return undefined;
      const matches = rows.filter((row) => format(row[field], field) === title);
      return matches.length === 1 ? matches[0] : undefined;
    };
    return {
      show(anchor, title, items, options) {
        const row = rowFor(title);
        if (!row) return tooltip.show(anchor, title, items, options);
        // Rich markup (**bold**, {field|format}, {field|bar}): the template is read once into runs, which the row
        // fills as text only. The title, too, is written as plain text.
        if (typeof body === "string" && isRich(body)) {
          const runs = richLines(body, row, {
            format,
            formatAs: (value, name) => formatValue(value, name, current.locale),
            max: (field) => Math.max(0, ...rows.map((r) => Math.abs(readNumber(r[field]) ?? 0))),
            summarize: (token) => fillTemplate(token, rows, current.fields, current.locale),
          });
          const plainHead = typeof head === "string" ? fill(head, row).split("**").join("") : title;
          return tooltip.show(anchor, plainHead, runs.map((rich) => ({ label: "", value: "", rich })), options);
        }
        const lines = typeof body === "string" ? fill(body, row).split("\n").filter((line) => line.trim() !== "") : undefined;
        const filled = lines?.map((line) => {
          const at = line.indexOf(": ");
          return at > 0 ? { label: line.slice(0, at), value: line.slice(at + 2) } : { label: line, value: "" };
        });
        tooltip.show(anchor, typeof head === "string" ? fill(head, row) : title, filled ?? items, options);
      },
      hide: () => tooltip.hide(),
    };
  }

  /** The colour rules in force, as written: `spec.colorRules`, or none. */
  const colorRules = (): ColorRule[] => (Array.isArray(current.colorRules) ? current.colorRules : []);

  /**
   * Colours by rule and by name together: a category's colour is the first rule one of its rows matches, else its
   * fixed colour in `spec.colors`, else none (the view's palette). `category` is the field that names each mark.
   */
  function colorsFor(drawRows: Row[]): { colorOf?: (category: unknown) => string | undefined; colorForRow?: (row: Row) => string | undefined } {
    const rules = colorRules();
    const fixed = current.colors;
    if (!rules.length && !fixed) return {};
    const first = drawRows[0];
    const category = first ? categoryField(drawView(), first) : undefined;
    const byRule = rules.length ? ruleColors(rules, drawRows, category) : undefined;
    return {
      colorOf: (value: unknown) => byRule?.get(String(value)) ?? fixed?.[String(value)],
      colorForRow: (row: Row) => rowRuleColor(rules, row, category) ?? (category ? fixed?.[String(row[category])] : undefined),
    };
  }

  /**
   * The colour rules in words, above the chart, for the rules that colour at least one mark: "Revenue below 0", in the
   * rule's colour. The colour never carries the meaning alone. Nothing when no rule matched.
   */
  function ruleKey(drawRows: Row[]): HTMLElement | undefined {
    const rules = colorRules();
    if (!rules.length) return undefined;
    const first = drawRows[0];
    const category = first ? categoryField(drawView(), first) : undefined;
    const used = rules.filter((rule) => drawRows.some((row) => matchRule(rule, row, category)));
    if (!used.length) return undefined;
    const words = W().dw2;
    const list = make("ul", "fft-legend fft-rule-key");
    list.setAttribute("aria-label", words.rulesKey);
    for (const rule of used) {
      const field = rule.field ?? category ?? "";
      const show = (value: unknown) => formatValue(value, current.fields?.[field]?.format, current.locale);
      const op: Record<string, string> = { ">": words.above, ">=": words.atLeast, "<": words.below, "<=": words.atMost, "==": words.is, "!=": words.isNot, in: words.isOneOf, "not in": words.isNoneOf };
      const value = Array.isArray(rule.value) ? rule.value.map(show).join(`, `).replace(/, ([^,]*)$/, ` ${words.or} $1`) : show(rule.value);
      const text = typeof rule.label === "string" && rule.label ? rule.label : `${fieldLabel(field, current.fields)} ${op[rule.op] ?? rule.op} ${value}`;
      const item = make("li", "fft-rule");
      const swatch = make("span", "fft-swatch");
      swatch.dataset.shape = "rect";
      swatch.style.background = ruleColor(rule.color);
      swatch.setAttribute("aria-hidden", "true");
      item.append(swatch, text);
      list.append(item);
    }
    return list;
  }

  function context(): ViewContext {
    const fields = current.fields;
    const size = paletteSize(current.style);
    const width = body.clientWidth || FALLBACK_WIDTH;
    const drawRows = viewRows();
    const shown = shownSpec();
    return {
      el: body,
      rows: drawRows,
      view: drawView(),
      spec: drawView() === current.view ? current : { ...current, view: drawView() },
      width,
      height: shown.style?.height ?? goldenHeight(width),
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
      // Fixed colors for named category values (spec.colors) and colours by rule (spec.colorRules), for views that
      // color by category or by row.
      ...colorsFor(drawRows),
      tooltip: templatedTooltip(),
      ...(options.fetch ? { fetch: options.fetch } : {}),
      select: (row) => root.dispatchEvent(new CustomEvent<SelectDetail>("fft-select", { bubbles: true, detail: { row, spec: current } })),
    };
  }

  function draw() {
    clearBody();
    root.setAttribute("aria-busy", "false");
    const block = getBlock("view", drawView().type);
    if (rows.length === 0 && !block.drawsEmpty) {
      drawn = false;
      const note = options.emptyNote?.();
      if (note) {
        showMessage("empty", note.text, [], W().widget.clearHint);
        if (note.action) {
          const button = doc.createElement("button");
          button.type = "button";
          button.className = "fft-state-action";
          button.textContent = note.action.label;
          button.addEventListener("click", note.action.run);
          message.append(button);
        }
      } else showMessage("empty", W().widget.noData, [], W().widget.noDataHint);
      return;
    }
    const render = block.render;
    if (!render) {
      showError([`View "${drawView().type}" has no renderer in this page. Import "martcharts" or call setRenderer() before drawing it.`]);
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
        cleanup = drawFacets(ctx, render, block.extent, block.categories?.(drawView()));
      } else {
        const result = render(ctx);
        cleanup = typeof result === "function" ? result : undefined;
      }
      // The colour rules in words go above the chart, as every legend does.
      const key = ruleKey(ctx.rows);
      if (key) body.prepend(key);
      drawn = true;
      paintGuide();
      // Pictures of the card are offered whenever the view drew something to see: an SVG chart, or HTML marks (bars,
      // bullets, strips, tables, maps), not a view that wrote plain text only.
      const pictured = Boolean(chartSvg() || [...body.querySelectorAll("*")].some((node) => !node.closest(".fft-sr-only")));
      for (const action of ["image", "svg"] as const) {
        const button = actionButtons.get(action);
        if (button) button.hidden = !pictured;
      }
      if (!entered) {
        // Marks grow in once, on the first draw only, so redraws stay calm.
        entered = true;
        root.setAttribute("data-animate", "");
        countUp(root);
        setTimeout(() => root.removeAttribute("data-animate"), ENTRANCE_MS);
      }
    } catch (caught) {
      showError([`The ${drawView().type} view failed: ${errorMessage(caught)}`]);
    }
  }

  /** Small multiples: one panel per facet value, sharing one value scale and one legend. */
  function drawFacets(ctx: ViewContext, render: NonNullable<ViewBlock["render"]>, extent: ViewBlock["extent"], categoryField?: string): (() => void) | undefined {
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
    const shared = facet.shared === false || !extent ? undefined : extent(drawView(), rows);

    // One legend for every panel: the series of a y list, or, for a view that colors categories (a donut's slices),
    // the categories in order of first appearance, each keeping one color in every panel.
    const legend = make("ul", "fft-legend fft-facet-legend");
    const key = (swatchShape: string, color: string, text: string) => {
      const swatch = make("span", "fft-swatch");
      swatch.dataset.shape = swatchShape;
      swatch.style.background = color;
      swatch.setAttribute("aria-hidden", "true");
      const item = make("li", "");
      item.append(swatch, text);
      legend.append(item);
    };
    const ys = drawView().y;
    const series = Array.isArray(ys) ? ys.map(String) : [];
    if (series.length > 1) {
      series.forEach((field, i) => key(drawView().type === "bar" ? "rect" : "line", ctx.color(i), ctx.label(field)));
      body.append(legend);
    } else if (categoryField) {
      const categories = new Map<string, unknown>();
      for (const row of rows) {
        const id = JSON.stringify(row[categoryField] ?? null);
        if (!categories.has(id)) categories.set(id, row[categoryField]);
      }
      const order = [...categories.keys()];
      const palette = ctx.color;
      // A value a colour rule or spec.colors names keeps that colour; the others take the palette in order of first appearance.
      const own = ctx.colorOf;
      const fixed = (category: unknown) => own?.(category);
      const byOrder = (category: unknown) => palette(Math.max(0, order.indexOf(JSON.stringify(category ?? null))));
      ctx = { ...ctx, colorOf: (category) => fixed(category) ?? byOrder(category) };
      [...categories.values()].forEach((category) => key("dot", fixed(category) ?? byOrder(category), ctx.format(category, categoryField)));
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
    const shut = iconButton("fft-overlay-close", W().widget.close, ["M6 6l12 12", "M18 6L6 18"]);
    const slot = make("div", "fft-overlay-slot");
    panel.append(shut, slot);
    overlay.append(panel);
    // Inside a dashboard, a pill at the bottom steps through its widgets.
    const nav = options.neighbors
      ? { bar: make("div", "fft-overlay-nav"), prev: iconButton("fft-overlay-prev", W().widget.previousWidget, ["M15 5l-7 7 7 7"]), next: iconButton("fft-overlay-next", W().widget.nextWidget, ["M9 5l7 7-7 7"]), count: make("span", "fft-overlay-count") }
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
      overlay.setAttribute("aria-label", target.spec.title ?? W().widget.widget);
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
        nav.count.textContent = around.position && around.total ? W().widget.position(String(around.position), String(around.total)) : "";
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

  /** Writes the guide for what is drawn now, when it is open: the sales question the chart answers, then how to read it. */
  function paintGuide() {
    if (guide.hidden) return;
    const label = make("strong", "fft-guide-label");
    label.textContent = W().widget.howToRead;
    const question = make("span", "fft-guide-question");
    question.textContent = questionOf(current, rows).text;
    guide.replaceChildren(label, question, explainChart(current, rows));
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
    if (action === "info") {
      void turn(root.dataset.side !== "back");
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
        // The whole card (title, chart or HTML marks, legends, footer, credit), on the card's own surface; translucent
        // surfaces (glass) sit on the page's color, or white.
        const surface = getComputedStyle(root).getPropertyValue("--fft-surface").trim();
        const page = getComputedStyle(doc.body).backgroundColor;
        const opaque = (color: string) => color && !color.startsWith("rgba") && color !== "transparent";
        const background = opaque(surface) ? surface : opaque(page) ? page : "#ffffff";
        if (action === "svg") {
          download(doc, `${name}.svg`, new Blob([cardToSvg(root, background).markup], { type: "image/svg+xml;charset=utf-8" }));
        } else {
          let png: Blob;
          try {
            png = await cardToPng(root, background);
          } catch {
            // A browser that will not draw HTML inside an SVG onto a canvas still gets the chart itself.
            const chart = chartSvg();
            if (!chart) throw new Error(W().widget.nothingToDraw);
            png = await svgToPng(chart, background);
          }
          download(doc, `${name}.png`, png);
        }
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
      showMessage("loading", W().widget.loading);
    }
    try {
      const loadedRows = await runPipeline(current, { fetch: options.fetch, fresh });
      if (mine !== generation || destroyed) return;
      rows = loadedRows;
      loaded = true;
      paintText();
      issues = validateSpec(current, rows);
      draw();
      liveAt = refreshSeconds() ? new Date() : undefined;
      liveFailed = false;
    } catch (caught) {
      if (mine !== generation || destroyed) return;
      showError([errorMessage(caught)]);
    }
    paintStamp();
    scheduleLive();
  }

  // ---- Live data: a source with refresh: seconds reloads on that beat, quietly ----
  let liveTimer: ReturnType<typeof setTimeout> | undefined;
  /** When the rows were last loaded, for the "Updated 12:04" stamp. */
  let liveAt: Date | undefined;
  /** True when the last reload failed: the chart keeps its rows and says it could not update. */
  let liveFailed = false;
  /** A beat that fell while the page was hidden, owed when it shows again. */
  let liveOwed = false;

  /** Seconds between reloads, from the source's `refresh`: 0 for none, never under the minimum. */
  function refreshSeconds(): number {
    const seconds = (current.data as { refresh?: unknown } | undefined)?.refresh;
    return typeof seconds === "number" && seconds > 0 ? Math.max(MIN_REFRESH, seconds) : 0;
  }

  function scheduleLive() {
    clearTimeout(liveTimer);
    liveTimer = undefined;
    const seconds = refreshSeconds();
    if (!seconds || destroyed) return;
    liveTimer = setTimeout(() => void liveBeat(), seconds * 1000);
  }

  /** One beat: reload unless the page is hidden (then owe it), keep the last good rows on an error, and set the next. */
  async function liveBeat() {
    if (destroyed) return;
    if (doc.visibilityState === "hidden") {
      liveOwed = true;
      return;
    }
    const mine = ++generation;
    try {
      const loadedRows = await runPipeline(current, { fetch: options.fetch, fresh: true });
      if (mine !== generation || destroyed) return;
      rows = loadedRows;
      paintText();
      issues = validateSpec(current, rows);
      draw();
      liveAt = new Date();
      liveFailed = false;
    } catch {
      if (mine !== generation || destroyed) return;
      liveFailed = true;
    }
    paintStamp();
    scheduleLive();
  }

  const onVisible = () => {
    if (doc.visibilityState === "hidden" || !liveOwed) return;
    liveOwed = false;
    void liveBeat();
  };
  doc.addEventListener("visibilitychange", onVisible);

  /** The stamp under the footer: when the live rows were last true, in the widget's language and locale. */
  function paintStamp() {
    if (!refreshSeconds() || !liveAt) {
      stamp.hidden = true;
      stamp.textContent = "";
      stamp.remove();
    } else {
      const time = new Intl.DateTimeFormat(current.locale, { hour: "2-digit", minute: "2-digit" }).format(liveAt);
      stamp.textContent = liveFailed ? W().dw2.stale(time) : W().dw2.updated(time);
      stamp.hidden = false;
      stamp.dataset.stale = String(liveFailed);
      if (!stamp.isConnected) smallPrint.append(stamp);
    }
    paintRef();
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
    speaks = current.locale;
      return load();
    },
    setSpec(next) {
      current = next;
    speaks = current.locale;
      return load();
    },
    refresh: () => load(true),
    showGuide: (open) => setGuide(open),
    showDetails: (open) => turn(open),
    addAction(label, icon, onClick) {
      const button = actionButton(label, icon);
      button.addEventListener("click", () => onClick(button));
      return button;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      generation++;
      clearTimeout(liveTimer);
      doc.removeEventListener("visibilitychange", onVisible);
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
        // A rich line: its runs as nodes, text as text only (bold in <strong>), bars as two spans. Never HTML.
        if (item.rich) {
          row.classList.add("fft-tooltip-rich");
          for (const run of item.rich) {
            if ("bar" in run) {
              const bar = span("fft-tooltip-bar");
              bar.setAttribute("aria-hidden", "true");
              const fill = span("fft-tooltip-bar-fill");
              fill.style.width = `${Math.round(Math.max(0, Math.min(1, run.bar)) * 1000) / 10}%`;
              if (run.negative) fill.dataset.negative = "";
              bar.append(fill);
              row.append(bar);
            } else if (run.bold) {
              const strong = doc.createElement("strong");
              strong.textContent = run.text;
              row.append(strong);
            } else row.append(doc.createTextNode(run.text));
          }
          return row;
        }
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
