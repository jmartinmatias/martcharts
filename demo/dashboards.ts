/**
 * The Dashboards page: the four worked dashboards as tabs (Sales, Commercial, Client health, Regulatory), one drawn at
 * a time. The tab is in the address as ?board=<tab>, so a link opens it; the board keeps its own state (section,
 * filters, period, click filter) in the hash as before. The page's header is the tab's name and one sentence; the
 * board draws no title of its own (header: false). Every card can open in the Editor, which is where the old
 * gallery's playground went.
 */
import { createDashboard } from "../src/index.ts";
import type { Dashboard, DashboardSpec, WidgetSpec } from "../src/index.ts";
import { lookStyle } from "./look.ts";

const files = import.meta.glob<DashboardSpec>("../dashboards/*.json", { eager: true, import: "default" });
const stored = import.meta.glob<WidgetSpec>("../widgets/**/*.json", { eager: true, import: "default" });
const widgets: Record<string, WidgetSpec> = {};
for (const spec of Object.values(stored)) if (spec.id) widgets[spec.id] = spec;
const boardOf = (id: string) => Object.values(files).find((spec) => spec.id === id);

/** The tabs, in reading order: the key in the address, the board file's id, the page header's words. */
const TABS = [
  { key: "sales", board: "gallery", title: "Sales", intro: "Revenue, regions, products, customers and the pipeline, for a sales team." },
  { key: "commercial", board: "commercial-cockpit", title: "Commercial cockpit", intro: "The book at a glance, what needs attention, the pipeline and who to call, for relationship managers." },
  { key: "health", board: "client-health", title: "Client health", intro: "Every client in red, amber or green on four perspectives, against written thresholds." },
  { key: "regulatory", board: "regulatory-landscape", title: "Regulatory landscape", intro: "What is due, the pressure, whom it hits and where it binds, for a compliance officer." },
].filter((tab) => boardOf(tab.board));

const $ = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T;
const tabList = $("#tabs");
const title = $("#board-title");
const intro = $("#board-intro");
const mount = $("#board");

const EDIT_ICON = ["M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16z", "M13.5 6.5l4 4"];
/** The board's options. `header: false` keeps the page's header the only one; a library without it draws its own. */
const options = {
  widgets,
  actions: ["info", "expand", "explain", "csv", "image"],
  // The filter row stays pinned while the long page scrolls, and the board's state lives in the address.
  sticky: true,
  hash: true,
  header: false,
  decorate(_cell: unknown, id: string, widget: { addAction(label: string, icon: string[], run: () => void): unknown }) {
    if (!widgets[id]) return;
    widget.addAction("Edit in editor", EDIT_ICON, () => location.assign(`./editor.html?widget=${encodeURIComponent(id)}`));
  },
} as unknown as Parameters<typeof createDashboard>[2];

let board: Dashboard | undefined;
const buttons: HTMLButtonElement[] = [];

function show(key: string, keepHash: boolean) {
  const tab = TABS.find((t) => t.key === key) ?? TABS[0];
  if (!tab) return;
  for (const b of buttons) {
    const on = b.dataset.key === tab.key;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
  }
  title.textContent = tab.title;
  intro.textContent = tab.intro;
  document.title = `${tab.title} · martcharts`;
  const url = new URL(location.href);
  url.searchParams.set("board", tab.key);
  if (!keepHash) url.hash = "";
  history.replaceState(null, "", url);
  board?.destroy();
  board = createDashboard(mount, boardOf(tab.board) as DashboardSpec, options);
  const style = lookStyle();
  if (style) void board.setOverride({ style });
}

for (const tab of TABS) {
  const b = document.createElement("button");
  b.type = "button";
  b.role = "tab";
  b.id = `tab-${tab.key}`;
  b.dataset.key = tab.key;
  b.textContent = tab.title.replace(/ (cockpit|landscape)$/, "");
  b.setAttribute("aria-controls", "panel");
  b.addEventListener("click", () => show(tab.key, false));
  // Arrow keys move between tabs, as a tab list does.
  b.addEventListener("keydown", (event) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = buttons[(buttons.indexOf(b) + step + buttons.length) % buttons.length];
    next?.focus();
    next?.click();
  });
  buttons.push(b);
  tabList.append(b);
}

show(new URLSearchParams(location.search).get("board") ?? "sales", true);

// The Look menu's style: restyle the board in place.
window.addEventListener("martcharts:look", (event) => {
  event.preventDefault();
  void board?.setOverride({ style: lookStyle() ?? { preset: "default" } });
});
