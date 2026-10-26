/**
 * The Dashboards page: the four worked dashboards as tabs (Sales, Commercial, Client health, Regulatory), one drawn at
 * a time. The tab is in the address as ?board=<tab>, so a link opens it; the board keeps its own state (section,
 * filters, period, click filter) in the hash as before. The page's header is the tab's name and one sentence; the
 * board draws no title of its own (header: false). Every card can open in the Editor, which is where the old
 * gallery's playground went.
 */
import { createDashboard, widgetRef } from "../src/index.ts";
import type { Dashboard, DashboardSpec, WidgetSpec } from "../src/index.ts";
import { lookStyle } from "./look.ts";
import { BOARD_TABS, cleanHash } from "./routes.ts";

const files = import.meta.glob<DashboardSpec>("../dashboards/*.json", { eager: true, import: "default" });
const stored = import.meta.glob<WidgetSpec>("../widgets/**/*.json", { eager: true, import: "default" });
const widgets: Record<string, WidgetSpec> = {};
for (const spec of Object.values(stored)) if (spec.id) widgets[spec.id] = spec;
const boardOf = (id: string) => Object.values(files).find((spec) => spec.id === id);

const TABS = BOARD_TABS.filter((tab) => boardOf(tab.board));

const $ = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T;
const tabList = $("#tabs");
const title = $("#board-title");
const intro = $("#board-intro");
const mount = $("#board");
// The as-of line ("Data to October 2026") under the page's own title and intro, where a reader looks for when.
const asOf = document.createElement("div");
asOf.className = "board-asof";
intro.after(asOf);
/** The ref an address names (#W-XXXX), to bring that card into view once its board is drawn. */
const REF = /^#[Ww]-[0-9A-Za-z]{4}$/;
const wanted = REF.test(location.hash) ? location.hash.slice(1).toUpperCase() : undefined;
/** The tab whose board holds a card with this ref (the dashboards keep each stored widget's own ref). */
const tabWithRef = (ref: string) =>
  TABS.find((tab) => (boardOf(tab.board)?.widgets ?? []).some((cell) => !cell.section && widgetRef(String(cell.widget ?? cell.spec?.id ?? "")) === ref));

const EDIT_ICON = ["M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16z", "M13.5 6.5l4 4"];
/** The board's options. `header: false` keeps the page's header the only one; a library without it draws its own. */
const options = {
  widgets,
  actions: ["info", "expand", "explain", "csv", "image"],
  // The filter row stays pinned while the long page scrolls, and the board's state lives in the address.
  sticky: true,
  hash: true,
  header: false,
  asOfInto: asOf,
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
  for (const old of document.querySelectorAll("body > .fft-skip")) old.remove();
  board = createDashboard(mount, boardOf(tab.board) as DashboardSpec, options);
  // The board's skip links come first in the page's tab order, before the site menu, the Look menu and the tabs:
  // a keyboard reader reaches "Skip to filters" with the first Tab, as skip links promise.
  const skipLinks = mount.querySelector(".fft-skip");
  if (skipLinks) document.body.prepend(skipLinks);
  const style = lookStyle();
  if (style) void board.setOverride({ style });
  // An old address may name a section this board no longer has (#maps): once the board is drawn, drop that part.
  const drawn = board;
  void drawn.ready.then(async () => {
    if (drawn !== board) return;
    if (wanted && keepHash && (await drawn.reveal(wanted))) return;
    const cleaned = cleanHash(location.hash, (id) => mount.querySelector(`[id="${CSS.escape(id)}"]`) !== null);
    if (cleaned !== location.hash) history.replaceState(history.state, "", `${location.pathname}${location.search}${cleaned}`);
  });
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

show((wanted ? tabWithRef(wanted)?.key : undefined) ?? new URLSearchParams(location.search).get("board") ?? "sales", true);

// The Look menu's style: restyle the board in place.
window.addEventListener("martcharts:look", (event) => {
  event.preventDefault();
  void board?.setOverride({ style: lookStyle() ?? { preset: "default" } });
});
