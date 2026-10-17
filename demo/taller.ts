/**
 * The Taller page: elBulli's creative method applied to charts. Pick a dish (any widget in widgets/), steer the
 * kitchen with temperature, texture and methods, and cook a menu of live variants, each with its menu line,
 * lineage, five tastes and balance note.
 */
import { balanceOf, createVariants, createWidget, DICTIONARY, explainChart, METHODS, plainTags, runPipeline, saucesOf, TASTE_MEANINGS, tasteOf } from "../src/index.ts";
import type { Method, Row, Taste, Tastes, Variant, Widget, WidgetSpec } from "../src/index.ts";

const stored = import.meta.glob<WidgetSpec>("../widgets/*.json", { eager: true, import: "default" });
const dishes = Object.values(stored)
  .filter((spec) => spec.id)
  .sort((a, b) => String(a.title ?? a.id).localeCompare(String(b.title ?? b.id)));

const $ = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// ---- Theme ----

const themeGroup = $("#theme");
for (const b of themeGroup.querySelectorAll<HTMLButtonElement>("button")) {
  b.addEventListener("click", () => {
    for (const other of themeGroup.querySelectorAll("button")) other.setAttribute("aria-pressed", String(other === b));
    if (b.dataset.value === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = b.dataset.value;
  });
}

// ---- The pass: dish, methods, temperature, texture ----

const dishPick = $<HTMLSelectElement>("#dish");
dishes.forEach((spec, i) => dishPick.add(new Option(spec.title ?? spec.id ?? `Dish ${i + 1}`, String(i))));
const first = new URLSearchParams(location.search).get("dish");
dishPick.value = String(Math.max(0, dishes.findIndex((spec) => spec.id === first)));

const methodGroup = $("#methods");
const chosen = new Set<Method>();
for (const [method, { label }] of Object.entries(METHODS) as [Method, { label: string }][]) {
  const b = el("button", undefined, label);
  b.type = "button";
  b.setAttribute("aria-pressed", "false");
  b.title = `Only ${label.toLowerCase()}. With none chosen, every method cooks.`;
  b.addEventListener("click", () => {
    if (chosen.has(method)) chosen.delete(method);
    else chosen.add(method);
    b.setAttribute("aria-pressed", String(chosen.has(method)));
    void cook();
  });
  methodGroup.append(b);
}
const temperature = $<HTMLInputElement>("#temperature");
const texture = $<HTMLInputElement>("#texture");
let seed = 1;

// ---- Reading a result: the five qualities (the kitchen's five tastes) as the library's own list, in-cell bars out of 100% ----

const QUALITIES: Taste[] = ["salty", "acid", "bitter", "fatty", "umami"];
function tasteSpec(tastes: Tastes): WidgetSpec {
  return {
    locale: "en-US",
    data: { type: "inline", rows: QUALITIES.map((taste) => ({ quality: TASTE_MEANINGS[taste], score: tastes[taste] })) },
    fields: { quality: { label: "Quality" }, score: { label: "Score", format: { type: "bar", max: 1, format: { type: "percent" } } } },
    view: { type: "list", label: "quality", value: "score" },
    style: { density: "compact" },
  };
}

// ---- Cooking ----

let live: Widget[] = [];
const rowsCache = new Map<string, Promise<Row[]>>();
const rowsOf = (spec: WidgetSpec) => {
  const key = spec.id ?? "";
  if (!rowsCache.has(key)) rowsCache.set(key, runPipeline(spec, {}));
  return rowsCache.get(key) as Promise<Row[]>;
};

function mount(target: HTMLElement, spec: WidgetSpec, actions: ("expand" | "csv" | "image" | "copy")[] = []) {
  const widget = createWidget(target, spec, { actions });
  live.push(widget);
  return widget;
}

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * A result card. From here on, chart words only: a plain title, how to read it, plain tags, the five qualities
 * and the balance. The kitchen words stay on the creating side (the controls and the Diccionario).
 */
function plate(variant: Variant): HTMLElement {
  const card = el("article", "plate");
  const heading = el("h3", undefined, variant.title);
  card.setAttribute("aria-label", variant.title);
  const scores = el("p", "scores", `New: ${Math.round(variant.novelty * 100)}%  ·  Says: ${Math.round(variant.meaning * 100)}%`);
  scores.title = "New: how different the chart is from the starting one. Says: how balanced and insightful it is.";
  const tags = el("ul", "tags");
  tags.setAttribute("aria-label", "What makes this chart");
  plainTags(variant).forEach((text, i) => {
    const li = el("li", undefined, text);
    if (i === 0) li.dataset.kind = "method";
    tags.append(li);
  });
  // A glass card is see-through, so it sits on a tinted backdrop that follows the theme, as the gallery does.
  const chart = el("div", "plate-chart");
  chart.dataset.plate = variant.lineage.plating;
  const explain = el("p", "taller-explain", variant.explain);
  const tastes = el("div", "tastes");
  const balance = el("p", "balance", sentence(variant.balance.note));
  const actions = el("div", "plate-actions");
  const open = el("a", undefined, "Open in playground");
  open.href = `./index.html#taller=${encodeURIComponent(JSON.stringify(variant.spec))}`;
  const copy = el("button", undefined, "Copy spec");
  copy.type = "button";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(variant.spec, null, 2));
      copy.dataset.done = "";
      setTimeout(() => copy.removeAttribute("data-done"), 1597);
    } catch {
      copy.textContent = "Copy failed";
    }
  });
  actions.append(open, copy);
  card.append(heading, scores, tags, chart, explain, tastes, balance, actions);
  // Mount after the card is in the page, so the charts measure their real width.
  queueMicrotask(() => {
    const widget = mount(chart, variant.spec, ["expand", "csv"]);
    // Once the chart has its rows, the plain guide adds one concrete example from them.
    void widget.ready.then(() => {
      explain.textContent = explainChart(variant.spec, widget.rows);
    });
    mount(tastes, tasteSpec(variant.tastes));
  });
  return card;
}

let cooking = 0;
async function cook() {
  const run = ++cooking;
  const dish = dishes[Number(dishPick.value)] ?? dishes[0];
  if (!dish) return;
  $("#status").textContent = `Making new versions of ${dish.title ?? dish.id}...`;
  const rows = await rowsOf(dish);
  if (run !== cooking) return;
  for (const widget of live) widget.destroy();
  live = [];

  // The starting chart, and how it reads.
  const original = $("#original");
  original.replaceChildren();
  mount(original, dish, ["expand"]);
  const ownTastes = tasteOf(dish, rows);
  const originalTastes = $("#original-tastes");
  originalTastes.replaceChildren();
  mount(originalTastes, tasteSpec(ownTastes));
  const ownBalance = balanceOf(ownTastes, saucesOf(dish));
  $("#original-balance").textContent = sentence(ownBalance.note);

  const menu = createVariants(dish, rows, {
    count: 6,
    seed,
    temperature: Number(temperature.value) / 100,
    texture: Number(texture.value) / 100,
    methods: [...chosen],
  });
  const grid = $("#menu");
  grid.replaceChildren(...menu.map(plate));
  $("#status").textContent = menu.length
    ? `${menu.length} new ${menu.length === 1 ? "version" : "versions"} of ${dish.title ?? dish.id} (seed ${seed}).`
    : `No new version of ${dish.title ?? dish.id} with these choices: try other methods or another chart.`;
}

dishPick.addEventListener("change", () => {
  seed = 1;
  const url = new URL(location.href);
  url.searchParams.set("dish", dishes[Number(dishPick.value)]?.id ?? "");
  history.replaceState(null, "", url);
  void cook();
});
let steering: ReturnType<typeof setTimeout> | undefined;
for (const range of [temperature, texture]) {
  range.addEventListener("input", () => {
    clearTimeout(steering);
    steering = setTimeout(() => void cook(), 233);
  });
}
$("#create").addEventListener("click", () => void cook());
$("#surprise").addEventListener("click", () => {
  seed = 1 + Math.floor(Math.random() * 9999);
  void cook();
});

// ---- The Diccionario ----

const dictionary = $("#dictionary");
for (const group of [...new Set(DICTIONARY.map((entry) => entry.group))]) {
  const section = el("section");
  section.append(el("h3", undefined, group));
  const list = el("dl");
  for (const entry of DICTIONARY.filter((e) => e.group === group)) list.append(el("dt", undefined, entry.kitchen), el("dd", undefined, entry.chart));
  section.append(list);
  dictionary.append(section);
}

void cook();
