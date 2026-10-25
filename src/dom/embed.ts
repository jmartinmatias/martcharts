/**
 * Embeds that size themselves. A chart or a dashboard goes into any page as an iframe of `embed.html`; the frame tells
 * its parent how tall it is, on load and on every resize, and the parent sets the iframe's height, so the chart never
 * scrolls inside its frame and never leaves a gap.
 *
 * - Inside the frame, `mountEmbed(document, location.search)` draws `?spec=` (a widget spec in base64url), `?src=` (the
 *   address of a widget spec) or `?board=` (a dashboard spec in base64url), with no page chrome, and posts
 *   `{ type: "martcharts:height", height }` to the parent.
 * - In the host page, `listenForEmbedHeights(window)` (run by the drop-in bundle on load, or the few lines of
 *   `examples/embed-host.js`) sets the height of the iframe each message came from.
 *
 * @module
 */
import type { DashboardSpec } from "../core/dashboard.ts";
import type { WidgetSpec } from "../core/types.ts";
import { createDashboard } from "./dashboard.ts";
import type { Dashboard } from "./dashboard.ts";
import type { WidgetAction } from "./export.ts";
import { createWidget } from "./widget.ts";
import type { Widget } from "./widget.ts";

/** The message a frame posts to its parent. */
export const HEIGHT_MESSAGE = "martcharts:height";

/** Text as base64url, for a spec in an address. */
export function toBase64Url(text: string): string {
  return btoa(unescape(encodeURIComponent(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** base64url back to text. */
export function fromBase64Url(text: string): string {
  return decodeURIComponent(escape(atob(text.replace(/-/g, "+").replace(/_/g, "/"))));
}

/**
 * Posts the height of `el` to the parent window now and whenever it changes, until the returned function is called.
 * Nothing happens outside a frame.
 */
export function postHeights(win: Window, el: Element): () => void {
  if (win.parent === win) return () => {};
  let last = -1;
  const post = () => {
    const height = Math.ceil(Math.max(el.getBoundingClientRect().height, (el as HTMLElement).scrollHeight || 0));
    if (height === last) return;
    last = height;
    win.parent.postMessage({ type: HEIGHT_MESSAGE, height }, "*");
  };
  post();
  const Observer = (win as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  const observer = Observer ? new Observer(post) : undefined;
  observer?.observe(el);
  win.addEventListener("resize", post);
  win.addEventListener("load", post);
  return () => {
    observer?.disconnect();
    win.removeEventListener("resize", post);
    win.removeEventListener("load", post);
  };
}

/** What `mountEmbed` drew. */
export interface Embedded {
  widget?: Widget;
  dashboard?: Dashboard;
  /** Settles when the chart or board has drawn (or shown its error). */
  ready: Promise<void>;
  /** Stops posting heights and removes what was drawn. */
  stop(): void;
}

/**
 * Draws the widget or dashboard an embed address names into `doc.body`, with no page chrome, and posts its height to
 * the parent. `search` is the address's query: `?spec=<base64url>`, `?src=<address of a spec>` or `?board=<base64url>`,
 * with `&actions=csv,image` to offer actions.
 */
export function mountEmbed(doc: Document, search: string, options: { fetch?: typeof fetch } = {}): Embedded {
  const win = doc.defaultView as Window;
  const params = new URLSearchParams(search);
  const holder = doc.createElement("div");
  holder.className = "fft-embed";
  doc.body.append(holder);
  const actions = (params.get("actions") ?? "").split(",").filter(Boolean) as WidgetAction[];
  const stopHeights = postHeights(win, holder);
  const out: Embedded = { ready: Promise.resolve(), stop: () => {} };
  const fail = (message: string) => {
    holder.textContent = message;
  };
  try {
    const board = params.get("board");
    const spec = params.get("spec");
    const src = params.get("src");
    if (board) {
      out.dashboard = createDashboard(holder, JSON.parse(fromBase64Url(board)) as DashboardSpec, { fetch: options.fetch, ...(actions.length ? { actions } : {}) });
      out.ready = out.dashboard.ready;
    } else if (spec) {
      out.widget = createWidget(holder, JSON.parse(fromBase64Url(spec)) as WidgetSpec, { fetch: options.fetch, actions });
      out.ready = out.widget.ready;
    } else if (src) {
      out.ready = (async () => {
        const response = await (options.fetch ?? fetch)(src);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        out.widget = createWidget(holder, (await response.json()) as WidgetSpec, { fetch: options.fetch, actions });
        await out.widget.ready;
      })().catch((caught) => fail(`Could not load ${src}: ${caught instanceof Error ? caught.message : String(caught)}`));
    } else fail("Nothing to show: give ?spec=, ?src= or ?board=.");
  } catch (caught) {
    fail(`Could not read the embed address: ${caught instanceof Error ? caught.message : String(caught)}`);
  }
  out.stop = () => {
    stopHeights();
    out.widget?.destroy();
    out.dashboard?.destroy();
    holder.remove();
  };
  return out;
}

/**
 * In the host page: sets each embed iframe's height from the messages its frame posts. Returns a function that stops
 * listening. The drop-in bundle runs it once on load.
 */
export function listenForEmbedHeights(win: Window): () => void {
  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: unknown; height?: unknown } | null;
    if (!data || data.type !== HEIGHT_MESSAGE || typeof data.height !== "number" || !(data.height > 0)) return;
    for (const frame of win.document.querySelectorAll("iframe")) {
      if (frame.contentWindow === event.source) frame.style.height = `${Math.ceil(data.height)}px`;
    }
  };
  win.addEventListener("message", onMessage);
  return () => win.removeEventListener("message", onMessage);
}

/**
 * The iframe embed code for a widget or a dashboard: the frame (full width, no border, its height set by the host
 * script) and the host script that sizes it. `href` is the address of `embed.html`.
 */
export function frameEmbed(kind: "widget" | "board", spec: WidgetSpec | DashboardSpec, href: string, title: string): string {
  const address = `${href}?${kind === "board" ? "board" : "spec"}=${toBase64Url(JSON.stringify(spec))}`;
  const safeTitle = title.replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c] as string);
  const host = href.replace(/[^/]*$/, "embed-host.js");
  return `<iframe src="${address}" title="${safeTitle}" style="width: 100%; border: 0" loading="lazy"></iframe>\n<script src="${host}"></script>`;
}
