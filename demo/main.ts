/**
 * Demo page: a gallery of every widget in the widgets/ folder and a playground
 * for editing specs live. Edits to widgets/*.json (by hand or through the MCP
 * server) reload here automatically.
 */
import { baseWidget, createDashboard, createWidget, describeBlocks, fork, suggestView, validateSpec } from "../src/index.ts";
import { createPalettePicker, getPalette, resolvePalette } from "../src/color.ts";
import { describePresets } from "../src/core/index.ts";
import type { DashboardSpec, Issue, Row, SelectDetail, ViewSpec, WidgetSpec } from "../src/index.ts";
import { look, setLook } from "./look.ts";

const stored = import.meta.glob<WidgetSpec>("../widgets/**/*.json", { eager: true, import: "default" });
// Every dashboard's widgets, those in sub-folders (commercial/, health/) too, so the switcher draws each board whole.
const boards = import.meta.glob<DashboardSpec>("../dashboards/*.json", { eager: true, import: "default" });
const byId: Record<string, WidgetSpec> = {};
for (const spec of Object.values(stored)) if (spec.id) byId[spec.id] = spec;
const boardSpecs = Object.values(boards).sort((a, b) => Number(b.id === "gallery") - Number(a.id === "gallery") || String(a.title).localeCompare(String(b.title)));
const gallerySpec = boardSpecs.find((spec) => spec.id === "gallery") as DashboardSpec;
// Playground choices follow the gallery's order.
const specs = gallerySpec.widgets.map((cell) => (cell.widget ? byId[cell.widget] : cell.spec)).filter((spec): spec is WidgetSpec => Boolean(spec));

const $ = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T;
const button = (label: string, title?: string) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  if (title) b.title = title;
  return b;
};

// ---- Gallery: the dashboards/gallery.json dashboard ----

const boardOptions: Parameters<typeof createDashboard>[2] = {
  widgets: byId,
  actions: ["info", "expand", "explain", "csv", "image", "copy"],
  // The filter row (period, region, sections) stays pinned while the long gallery scrolls.
  sticky: true,
  // The chosen section lives in the address, so a link opens the gallery on it.
  hash: true,
  // Two host actions join each widget's own hover toolbar, so the cards stay free of chrome until reached for.
  decorate(_cell, id, widget) {
    const spec = byId[id];
    if (!spec) return;
    const command = `node src/mcp/main.ts --widget ${id}`;
    const mcp = widget.addAction("Copy MCP command", ["M5 7l5 5-5 5", "M12 17h7"], async (b) => {
      try {
        await navigator.clipboard.writeText(command);
        b.dataset.done = "";
      } catch {
        b.dataset.failed = "";
      }
      setTimeout(() => b.removeAttribute(b.hasAttribute("data-done") ? "data-done" : "data-failed"), 1597);
    });
    // The menu shows a short label; the full command is in the tooltip.
    mcp.title = command;
    widget.addAction("Edit in playground", ["M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16z", "M13.5 6.5l4 4"], () => {
      load(spec);
      openPlayground();
    });
  },
};
// ---- The playground, a modal over the gallery ----
// Opened from the header, from a card's Edit in playground action, or by a version arriving from the Taller.
// Escape, the Close button or a click on the backdrop closes it; focus returns to whatever opened it.
const playground = $<HTMLDialogElement>("#playground");
const openButton = $<HTMLButtonElement>("#open-playground");
// Where focus goes back on close: whatever opened it, kept here since Safari does not focus a clicked button.
let opener: HTMLElement | null = null;
function openPlayground(from?: HTMLElement) {
  const active = document.activeElement;
  opener = from ?? (active instanceof HTMLElement && active !== document.body ? active : openButton);
  // An item in a card's More menu hides as the menu closes: return to the menu's own button instead.
  const menu = opener.closest<HTMLElement>('[role="menu"]');
  if (menu?.id) opener = document.querySelector<HTMLElement>(`[aria-controls="${menu.id}"]`) ?? opener;
  if (!playground.open) playground.showModal();
  // The preview was drawn while hidden: redraw it at the width it now has.
  requestAnimationFrame(() => void apply(current, false));
}
openButton.addEventListener("click", () => openPlayground(openButton));
$("#close-playground").addEventListener("click", () => playground.close());
playground.addEventListener("click", (event) => {
  if (event.target === playground) playground.close();
});
playground.addEventListener("close", () => (opener?.isConnected ? opener : openButton).focus());

/** The style every chart takes when styling is set to All charts (a merge patch over each widget's own style). */
let shared: Record<string, unknown> = {};
let board = createDashboard($("#gallery"), gallerySpec, boardOptions);

// Dashboard switcher: one button per file in dashboards/.
const boardGroup = $("#board-pick");
for (const spec of boardSpecs) {
  const b = button(spec.title ?? spec.id ?? "Dashboard", spec.description);
  b.dataset.value = spec.id ?? "";
  b.setAttribute("aria-pressed", String(spec === gallerySpec));
  b.addEventListener("click", () => {
    for (const other of boardGroup.querySelectorAll("button")) other.setAttribute("aria-pressed", String(other === b));
    board.destroy();
    board = createDashboard($("#gallery"), spec, { ...boardOptions, guides: explainAll });
    if (Object.keys(shared).length) void board.setOverride({ style: shared });
  });
  boardGroup.append(b);
}

document.addEventListener("fft-select", (event) => {
  const { row, spec } = (event as CustomEvent<SelectDetail>).detail;
  $("#selection").textContent = `Selected in "${spec.title ?? spec.id}": ${JSON.stringify(row)}`;
});

// ---- Page controls: theme and style preset ----

function segmented(container: HTMLElement, onPick: (value: string) => void) {
  for (const b of container.querySelectorAll<HTMLButtonElement>("button")) {
    b.addEventListener("click", () => {
      for (const other of container.querySelectorAll("button")) other.setAttribute("aria-pressed", String(other === b));
      onPick(b.dataset.value ?? "");
    });
  }
}

// How to read: a plain guide under every chart at once, for reading the board the first time.
let explainAll = false;
segmented($("#explain"), (value) => {
  explainAll = value === "on";
  board.setGuides(explainAll);
});

segmented($("#theme"), (theme) => {
  setLook({ theme });
  // The color editor shows the palette's steps for the theme on screen and checks them on that background.
  syncStylePanel(current);
});
// With the switch on auto, the system theme decides: follow it when it changes.
window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => syncStylePanel(current));

const presetGroup = $("#preset");
const presetOrder = describePresets().sort((a, b) => Number(b.name === "default") - Number(a.name === "default"));
for (const { name, description } of presetOrder) {
  const b = button(name[0]?.toUpperCase() + name.slice(1), description);
  b.dataset.value = name;
  b.setAttribute("aria-pressed", String(name === "default"));
  presetGroup.append(b);
}
segmented(presetGroup, (preset) => {
  const patch = { preset: preset === "default" ? null : preset };
  styleAll(patch);
  if (scope === "all") void apply(fork(current, { style: patch }));
});
// The look picked on any page (Glass unless changed) styles the board from the start.
const saved = look().preset;
if (saved && saved !== "default") styleAll({ preset: saved });
else syncPage();

/** Styles every chart on the board: the patch merges into the shared style, and the page controls follow it. */
function styleAll(patch: Record<string, unknown>) {
  shared = fork(shared, patch);
  void board.setOverride({ style: patch });
  syncPage();
}

/** The header's Style and Theme controls, and the page backdrop, show the shared style. */
function syncPage() {
  const preset = typeof shared.preset === "string" ? shared.preset : "default";
  // The page backdrop follows the style, here and on every other page (public/site-look.js).
  setLook({ preset });
  for (const b of presetGroup.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.value === preset));
  // A theme for every chart is the page's theme too, so cards never sit on the opposite background.
  const theme = typeof shared.theme === "string" ? shared.theme : undefined;
  if (theme) setLook({ theme });
}

// ---- Playground ----

const vanilla = fork(baseWidget, {
  title: "Vanilla widget",
  subtitle: "Forked from baseWidget",
  data: {
    type: "inline",
    rows: [
      { item: "Alpha", amount: 12, target: 15 },
      { item: "Beta", amount: 7, target: 10 },
      { item: "Gamma", amount: 19, target: 16 },
    ],
  },
});
const choices: WidgetSpec[] = [vanilla, ...specs];
const pick = $<HTMLSelectElement>("#pick");
choices.forEach((spec, i) => pick.add(new Option(spec.title ?? spec.id ?? `Widget ${i}`, String(i))));

const viewPick = $<HTMLSelectElement>("#view-pick");
for (const { type } of describeBlocks("view")) viewPick.add(new Option(type, type));
const stylePick = $<HTMLSelectElement>("#style-pick");
for (const { name } of describePresets()) stylePick.add(new Option(name, name));

const textarea = $<HTMLTextAreaElement>("#spec");
const issuesList = $("#issues");
const preview = createWidget($("#preview"), vanilla);
let current: WidgetSpec = vanilla;

function showIssues(issues: Issue[]) {
  issuesList.replaceChildren();
  const list = issues.length ? issues : [{ level: "ok", path: "", message: "Spec is valid." }];
  for (const issue of list) {
    const li = document.createElement("li");
    li.dataset.level = issue.level;
    li.textContent = issue.path ? `${issue.path}: ${issue.message}` : issue.message;
    issuesList.append(li);
  }
}

// ---- Chart styling panel ----

const themePick = $<HTMLSelectElement>("#theme-pick");
const densityPick = $<HTMLSelectElement>("#density-pick");
const heightPick = $<HTMLInputElement>("#height-pick");
const heightOut = $<HTMLOutputElement>("#height-out");
const accentPick = $<HTMLInputElement>("#accent-pick");
/** Backgrounds the palette checks measure against, per preset. */
/** Backgrounds the palette checks measure against, per preset and mode: every preset has a light and a dark look. */
const SURFACES: Record<string, { light: string; dark: string }> = {
  glass: { light: "#eef3f1", dark: "#1f2a29" },
  airy: { light: "#f4f4f2", dark: "#141413" },
  paper: { light: "#fbf8f3", dark: "#1c1b19" },
};
const systemDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
/** The page's own theme: its switch, or the system when the switch says auto. */
const pageDark = () => {
  const theme = document.documentElement.dataset.theme;
  return theme === "dark" || (theme !== "light" && systemDark());
};

const picker = createPalettePicker($("#palette-picker"), {
  value: "default",
  onChange: (colors, name) => setStyle({ palette: name === "default" ? null : (name ?? colors) }),
});

// Scope: the panel styles the chart above, or every chart on the board.
let scope: "chart" | "all" = "chart";
const SCOPE_NOTES = {
  chart: "Styles the chart above only.",
  all: "Every chart on the board takes these settings over its own. Default style hands each its own look back.",
};
segmented($("#style-scope"), (value) => {
  scope = value === "all" ? "all" : "chart";
  $("#scope-note").textContent = SCOPE_NOTES[scope];
});

function setStyle(patch: Record<string, unknown>) {
  if (scope === "all") styleAll(patch);
  void apply(fork(current, { style: patch }));
}

function syncStylePanel(spec: WidgetSpec) {
  const style = spec.style ?? {};
  themePick.value = style.theme ?? "auto";
  densityPick.value = style.density ?? "comfortable";
  heightOut.textContent = style.height ? `${style.height}px` : "auto";
  if (style.height) heightPick.value = String(style.height);
  // Only redraw the picker when the spec asks for different colors, so typing in a hex field keeps focus.
  const preset = style.preset ?? "default";
  const dark = style.theme === "dark" || (style.theme !== "light" && pageDark());
  picker.setSurface(dark ? "dark" : "light", SURFACES[preset]?.[dark ? "dark" : "light"]);
  const requested = typeof style.palette === "string" ? style.palette : (resolvePalette(style) ?? "default");
  const named = typeof requested === "string" ? getPalette(requested) : undefined;
  const colors = typeof requested === "string" ? ((dark ? named?.darkColors : undefined) ?? named?.colors ?? []) : requested;
  if (colors.map((c) => c.toLowerCase()).join() !== picker.colors.join()) picker.set(requested);
  // Show the accent the preview really uses when the spec does not set one.
  requestAnimationFrame(() => {
    const accent = style.tokens?.accent ?? getComputedStyle(preview.root).getPropertyValue("--fft-accent").trim();
    if (/^#[0-9a-f]{6}$/i.test(accent)) accentPick.value = accent;
  });
}

themePick.addEventListener("change", () => setStyle({ theme: themePick.value === "auto" ? null : themePick.value }));
densityPick.addEventListener("change", () => setStyle({ density: densityPick.value === "comfortable" ? null : densityPick.value }));
heightPick.addEventListener("input", () => setStyle({ height: Number(heightPick.value) }));
$("#height-reset").addEventListener("click", () => setStyle({ height: null }));
accentPick.addEventListener("input", () => setStyle({ tokens: { accent: accentPick.value } }));
$("#accent-reset").addEventListener("click", () => setStyle({ tokens: { accent: null } }));

function syncPickers(spec: WidgetSpec) {
  viewPick.value = spec.view?.type ?? "table";
  stylePick.value = spec.style?.preset ?? "default";
  syncStylePanel(spec);
}

async function apply(spec: WidgetSpec, writeText = true) {
  current = spec;
  if (writeText) textarea.value = JSON.stringify(spec, null, 2);
  syncPickers(spec);
  showIssues(validateSpec(spec));
  await preview.setSpec(spec);
  if (current === spec) showIssues(preview.issues);
}

function load(spec: WidgetSpec) {
  pick.value = String(Math.max(0, choices.indexOf(spec)));
  void apply(spec);
}

let typing: ReturnType<typeof setTimeout> | undefined;
textarea.addEventListener("input", () => {
  clearTimeout(typing);
  typing = setTimeout(() => {
    try {
      void apply(JSON.parse(textarea.value) as WidgetSpec, false);
    } catch (caught) {
      showIssues([{ level: "error", path: "JSON", message: caught instanceof Error ? caught.message : String(caught) }]);
    }
  }, 300);
});

pick.addEventListener("change", () => load(choices[Number(pick.value)] ?? vanilla));

/**
 * A view of `type` filled from the data by suggestView (numbers for amounts,
 * text for categories, dates for periods), with every other view's options
 * cleared, so switching type never needs hand edits.
 */
function viewFor(type: string, rows: Row[]): ViewSpec {
  const cleared: ViewSpec = { type };
  for (const block of describeBlocks("view")) for (const name of Object.keys(block.options)) cleared[name] = null;
  return { ...cleared, ...suggestView(type, rows) };
}

viewPick.addEventListener("change", () => void apply(fork(current, { view: viewFor(viewPick.value, preview.rows) })));
stylePick.addEventListener("change", () => setStyle({ preset: stylePick.value === "default" ? null : stylePick.value }));
$("#reset-style").addEventListener("click", () => {
  if (scope === "all") {
    shared = {};
    void board.setOverride({ style: null });
    // Default style is the default page too: the theme goes back to following the system.
    setLook({ theme: "auto" });
    syncPage();
  }
  void apply(fork(current, { style: null }));
});
$("#reset-all").addEventListener("click", () => load(choices[Number(pick.value)] ?? vanilla));

load(vanilla);

// A version from the Taller page arrives in the address (#taller=<spec>): open it in the playground, then tidy the address.
if (location.hash.startsWith("#taller=")) {
  try {
    void apply(JSON.parse(decodeURIComponent(location.hash.slice("#taller=".length))) as WidgetSpec);
    openPlayground();
  } catch {
    showIssues([{ level: "error", path: "Taller", message: "The chart in the address could not be read." }]);
  }
  history.replaceState(null, "", `${location.pathname}${location.search}`);
}

// The Playground link on the other pages arrives as #playground: open it, focus returning to its button, then tidy the address.
if (location.hash === "#playground") {
  openPlayground(openButton);
  history.replaceState(null, "", `${location.pathname}${location.search}`);
}
