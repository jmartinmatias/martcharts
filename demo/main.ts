/**
 * Demo page: a gallery of every widget in the widgets/ folder and a playground
 * for editing specs live. Edits to widgets/*.json (by hand or through the MCP
 * server) reload here automatically.
 */
import { baseWidget, createDashboard, createPalettePicker, createWidget, describeBlocks, describePresets, fork, getPalette, resolvePalette, suggestView, validateSpec } from "../src/index.ts";
import type { DashboardSpec, Issue, Row, SelectDetail, ViewSpec, WidgetSpec } from "../src/index.ts";

const stored = import.meta.glob<WidgetSpec>("../widgets/*.json", { eager: true, import: "default" });
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
  actions: ["expand", "csv", "image", "copy"],
  // The filter row (period, region, section links) stays pinned while the long gallery scrolls.
  sticky: true,
  // Two host actions join each widget's own hover toolbar, so the cards stay free of chrome until reached for.
  decorate(_cell, id, widget) {
    const spec = byId[id];
    if (!spec) return;
    const command = `node src/mcp/main.ts --widget ${id}`;
    widget.addAction(`Copy MCP command: ${command}`, ["M5 7l5 5-5 5", "M12 17h7"], async (b) => {
      try {
        await navigator.clipboard.writeText(command);
        b.dataset.done = "";
      } catch {
        b.dataset.failed = "";
      }
      setTimeout(() => b.removeAttribute(b.hasAttribute("data-done") ? "data-done" : "data-failed"), 1597);
    });
    widget.addAction("Edit in playground", ["M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16z", "M13.5 6.5l4 4"], () => {
      load(spec);
      $("#playground-title").scrollIntoView({ behavior: "smooth" });
    });
  },
};
let currentPreset = "default";
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
    board = createDashboard($("#gallery"), spec, boardOptions);
    if (currentPreset !== "default") void board.setOverride({ style: { preset: currentPreset } });
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

segmented($("#theme"), (theme) => {
  if (theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
});

const presetGroup = $("#preset");
const presetOrder = describePresets().sort((a, b) => Number(b.name === "default") - Number(a.name === "default"));
for (const { name, description } of presetOrder) {
  const b = button(name[0]?.toUpperCase() + name.slice(1), description);
  b.dataset.value = name;
  b.setAttribute("aria-pressed", String(name === "default"));
  presetGroup.append(b);
}
segmented(presetGroup, (preset) => {
  document.body.dataset.preset = preset;
  currentPreset = preset;
  void board.setOverride({ style: { preset: preset === "default" ? null : preset } });
});

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
const SURFACES: Record<string, string> = { glass: "#1f2a29", airy: "#f4f4f2" };
const systemDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

const picker = createPalettePicker($("#palette-picker"), {
  value: "default",
  onChange: (colors, name) => setStyle({ palette: name === "default" ? null : (name ?? colors) }),
});

function setStyle(patch: Record<string, unknown>) {
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
  const dark = preset === "glass" || style.theme === "dark" || (style.theme !== "light" && preset !== "airy" && systemDark());
  picker.setSurface(dark ? "dark" : "light", SURFACES[preset]);
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
stylePick.addEventListener("change", () =>
  void apply(fork(current, { style: { preset: stylePick.value === "default" ? null : stylePick.value } })),
);
$("#reset-style").addEventListener("click", () => void apply(fork(current, { style: null })));
$("#reset-all").addEventListener("click", () => load(choices[Number(pick.value)] ?? vanilla));

load(vanilla);
