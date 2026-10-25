/**
 * The Taller page: elBulli's creative method, abstracted and applied to sales charts. Pick a starting chart (any
 * widget in widgets/), say who reads it, choose sales moves, steer color and marks, and make live versions, each
 * with the sales question it answers, its move, five qualities and balance note.
 */
import { createWidget, explainChart, fork, questionOf, runPipeline } from "../src/index.ts";
import type { Row, Widget, WidgetAction, WidgetSpec } from "../src/index.ts";
import { AUDIENCES, balanceOf, createVariants, fillsOf, MOVES, plainTags, PRINCIPLES, qualitiesOf, QUALITIES } from "../src/taller.ts";
import type { Audience, Move, Qualities, Variant } from "../src/taller.ts";
import { withLook } from "./look.ts";

const stored = import.meta.glob<WidgetSpec>("../widgets/*.json", { eager: true, import: "default" });
const charts = Object.values(stored)
  .filter((spec) => spec.id)
  .sort((a, b) => String(a.title ?? a.id).localeCompare(String(b.title ?? b.id)));

const $ = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// ---- Steering: chart, audience, moves, color, marks ----

const chartPick = $<HTMLSelectElement>("#chart");
charts.forEach((spec, i) => chartPick.add(new Option(spec.title ?? spec.id ?? `Chart ${i + 1}`, String(i))));
const first = new URLSearchParams(location.search).get("chart");
chartPick.value = String(Math.max(0, charts.findIndex((spec) => spec.id === first)));

let audience: Audience | undefined;
const audienceGroup = $("#audience");
const moment = $("#moment");
const audienceChoices: [Audience | undefined, string][] = [[undefined, "Anyone"], ...(Object.entries(AUDIENCES) as [Audience, { label: string }][]).map(([key, { label }]) => [key, label] as [Audience, string])];
for (const [key, label] of audienceChoices) {
  const b = el("button", undefined, label);
  b.type = "button";
  b.setAttribute("aria-pressed", String(key === audience));
  b.addEventListener("click", () => {
    audience = key;
    for (const other of audienceGroup.querySelectorAll("button")) other.setAttribute("aria-pressed", String(other === b));
    moment.textContent = key ? AUDIENCES[key].moment : "";
    void make();
  });
  audienceGroup.append(b);
}

const moveGroup = $("#moves");
const chosen = new Set<Move>();
for (const [move, { label, does }] of Object.entries(MOVES) as [Move, { label: string; does: string }][]) {
  const b = el("button", undefined, label);
  b.type = "button";
  b.setAttribute("aria-pressed", "false");
  b.title = `${does} With none chosen, every move is used.`;
  b.addEventListener("click", () => {
    if (chosen.has(move)) chosen.delete(move);
    else chosen.add(move);
    b.setAttribute("aria-pressed", String(chosen.has(move)));
    void make();
  });
  moveGroup.append(b);
}
const color = $<HTMLInputElement>("#color");
const marks = $<HTMLInputElement>("#marks");
let seed = 1;

// ---- The five qualities, as the library's own list, with in-cell bars out of 100% ----

function qualitySpec(qualities: Qualities): WidgetSpec {
  return {
    locale: "en-US",
    data: { type: "inline", rows: QUALITIES.map((quality) => ({ quality: sentence(quality), score: qualities[quality] })) },
    fields: { quality: { label: "Quality" }, score: { label: "Score", format: { type: "bar", max: 1, format: { type: "percent" } } } },
    view: { type: "list", label: "quality", value: "score" },
    style: { density: "compact" },
  };
}

/** The sales question a chart answers, with its small label. */
function questionLine(target: HTMLElement, text: string) {
  target.replaceChildren(el("small", undefined, "Answers"), document.createTextNode(text));
}

// ---- Making versions ----

let live: Widget[] = [];
const rowsCache = new Map<string, Promise<Row[]>>();
const rowsOf = (spec: WidgetSpec) => {
  const key = spec.id ?? "";
  if (!rowsCache.has(key)) rowsCache.set(key, runPipeline(spec, {}));
  return rowsCache.get(key) as Promise<Row[]>;
};

function mount(target: HTMLElement, spec: WidgetSpec, actions: WidgetAction[] = []) {
  const widget = createWidget(target, withLook(spec, fork), { actions });
  live.push(widget);
  return widget;
}

/**
 * A version card, led by the sales question it answers, then what the chart is, the move and plain tags, the chart,
 * how to read it, its qualities and balance.
 */
function card(variant: Variant): HTMLElement {
  const node = el("article", "version");
  node.setAttribute("aria-label", variant.question);
  const heading = el("h3", "question");
  questionLine(heading, variant.question);
  const form = el("p", "form", variant.title);
  const scores = el("p", "scores", `New: ${Math.round(variant.novelty * 100)}%  ·  Says: ${Math.round(variant.meaning * 100)}%`);
  scores.title = "New: how different the chart is from the starting one. Says: how balanced and insightful it is.";
  const tags = el("ul", "tags");
  tags.setAttribute("aria-label", "How this version was made");
  plainTags(variant).forEach((text, i) => {
    const li = el("li", undefined, text);
    if (i === 0) {
      li.dataset.kind = "move";
      li.title = MOVES[variant.move].does;
    }
    tags.append(li);
  });
  // A glass card is see-through, so it sits on a tinted backdrop that follows the theme, as the gallery does.
  const chart = el("div", "version-chart");
  chart.dataset.look = variant.lineage.look;
  const explain = el("p", "taller-explain", variant.explain);
  const qualities = el("div", "qualities");
  const balance = el("p", "balance", sentence(variant.balance.note));
  const actions = el("div", "version-actions");
  const open = el("a", undefined, "Open in editor");
  open.href = `./editor.html?spec=${encodeURIComponent(JSON.stringify(variant.spec))}`;
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
  node.append(heading, form, scores, tags, chart, explain, qualities, balance, actions);
  // Mount after the card is in the page, so the charts measure their real width.
  queueMicrotask(() => {
    const widget = mount(chart, variant.spec, ["info", "expand", "csv"]);
    // Once the chart has its rows, the plain guide adds one concrete example from them.
    void widget.ready.then(() => {
      explain.textContent = explainChart(variant.spec, widget.rows);
    });
    mount(qualities, qualitySpec(variant.qualities));
  });
  return node;
}

let making = 0;
async function make() {
  const run = ++making;
  const chart = charts[Number(chartPick.value)] ?? charts[0];
  if (!chart) return;
  const name = chart.title ?? chart.id;
  $("#status").textContent = `Making new versions of ${name}...`;
  const rows = await rowsOf(chart);
  if (run !== making) return;
  for (const widget of live) widget.destroy();
  live = [];

  // The starting chart: its question, and how it reads.
  questionLine($("#original-question"), questionOf(chart, rows).text);
  const original = $("#original");
  original.replaceChildren();
  mount(original, chart, ["info", "expand"]);
  const own = qualitiesOf(chart, rows);
  const originalQualities = $("#original-qualities");
  originalQualities.replaceChildren();
  mount(originalQualities, qualitySpec(own));
  $("#original-balance").textContent = sentence(balanceOf(own, fillsOf(chart)).note);

  const versions = createVariants(chart, rows, {
    count: 6,
    seed,
    color: Number(color.value) / 100,
    marks: Number(marks.value) / 100,
    moves: [...chosen],
    ...(audience ? { audience } : {}),
  });
  $("#versions").replaceChildren(...versions.map(card));
  $("#status").textContent = versions.length
    ? `${versions.length} new ${versions.length === 1 ? "version" : "versions"} of ${name} (seed ${seed}).`
    : `No new version of ${name} with these choices: try other moves or another chart.`;
}

chartPick.addEventListener("change", () => {
  seed = 1;
  const url = new URL(location.href);
  url.searchParams.set("chart", charts[Number(chartPick.value)]?.id ?? "");
  history.replaceState(null, "", url);
  void make();
});
let steering: ReturnType<typeof setTimeout> | undefined;
for (const range of [color, marks]) {
  range.addEventListener("input", () => {
    clearTimeout(steering);
    steering = setTimeout(() => void make(), 233);
  });
}
$("#create").addEventListener("click", () => void make());
$("#surprise").addEventListener("click", () => {
  seed = 1 + Math.floor(Math.random() * 9999);
  void make();
});

// ---- The method: before creating, the seven moves, judging and keeping ----

const method = $("#method");
const groups: [string, typeof PRINCIPLES][] = [
  ["Before creating", PRINCIPLES.slice(0, 2)],
  ["Seven sales moves", PRINCIPLES.filter((p) => p.move)],
  ["Judging and keeping", PRINCIPLES.slice(2).filter((p) => !p.move)],
];
for (const [title, principles] of groups) {
  const section = el("section");
  section.append(el("h3", undefined, title));
  const list = el("dl");
  for (const p of principles) list.append(el("dt", undefined, p.principle), el("dd", undefined, p.sales));
  section.append(list);
  method.append(section);
}

void make();
