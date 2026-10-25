/**
 * The selected variations page: chart variations picked from the variation
 * engine's runs because they are new and meaningful, each explained in plain
 * words. Reads public/selections.json; every widget is drawn live.
 */
import { createWidget, explainChart, fork, questionOf } from "../src/index.ts";
import type { WidgetSpec } from "../src/index.ts";
import { setLook, withLook } from "./look.ts";

/** One picked variation, in plain words only. */
interface Selection {
  /** Id of the widget it was made from. */
  source: string;
  /** A plain title: what the chart shows. */
  title: string;
  /** What changed from the original, plainly: "Same data as dots instead of bars". */
  change: string;
  /** Why it is worth a look: the true thing it helps you see. */
  why: string;
  /** How new, 0 to 1. */
  novelty: number;
  /** How useful, 0 to 1. */
  meaning: number;
  spec: WidgetSpec;
}

const stored = import.meta.glob<WidgetSpec>("../widgets/*.json", { eager: true, import: "default" });
const originals: Record<string, WidgetSpec> = {};
for (const spec of Object.values(stored)) if (spec.id) originals[spec.id] = spec;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function note(heading: string, text: string): HTMLElement {
  const block = el("div", "note");
  block.append(el("h3", undefined, heading), el("p", undefined, text));
  return block;
}

/** A score out of ten as a labelled bar. */
function score(label: string, value: number): HTMLElement {
  const outOfTen = Math.round(Math.max(0, Math.min(1, value)) * 10);
  const block = el("div", "score");
  const head = el("div", "score-label");
  head.append(el("span", undefined, label), el("strong", undefined, `${outOfTen} / 10`));
  const track = el("div", "score-track");
  track.setAttribute("role", "img");
  track.setAttribute("aria-label", `${label}: ${outOfTen} out of 10`);
  const fill = el("div", "score-fill");
  fill.style.width = `${outOfTen * 10}%`;
  track.append(fill);
  block.append(head, track);
  return block;
}

function render(selections: Selection[], made?: { variants?: number; charts?: number }) {
  const list = document.querySelector("#selections") as HTMLElement;
  const index = document.querySelector("#index") as HTMLElement;
  list.replaceChildren();
  index.replaceChildren();
  const madeLine = document.querySelector("#made") as HTMLElement;
  if (selections.length && made?.variants && made.charts) {
    madeLine.replaceChildren("Picked by hand from ", el("strong", undefined, String(made.variants)), " new versions of ", el("strong", undefined, String(made.charts)), " charts.");
    madeLine.hidden = false;
  }
  if (selections.length === 0) {
    list.append(el("p", "empty", "The selection appears here once the variation engine has run across the widgets."));
    return;
  }
  selections.forEach((pick, i) => {
    const section = el("section", "selection");
    section.id = `selection-${i + 1}`;
    section.setAttribute("aria-labelledby", `pick-${i}`);
    const entry = el("li");
    const link = el("a", undefined, pick.title);
    link.href = `#selection-${i + 1}`;
    entry.append(link);
    index.append(entry);
    const chart = el("div", "chart");
    const number = el("div", "number", String(i + 1).padStart(2, "0"));
    const title = el("h2", undefined, pick.title);
    title.id = `pick-${i}`;
    const slot = el("div", "slot");
    chart.append(number, title, slot);
    const widget = createWidget(slot, withLook(pick.spec, fork), { actions: ["info", "expand"] });

    const notes = el("div", "notes");
    const asks = note("The question it answers", questionOf(pick.spec).text);
    asks.classList.add("asks");
    const reading = note("How to read it", explainChart(pick.spec));
    // Once the chart has its rows, the guide adds one concrete example from them, and a table names its columns.
    void widget.ready.then(() => {
      const line = reading.querySelector("p");
      if (line) line.textContent = explainChart(pick.spec, widget.rows);
      const question = asks.querySelector("p");
      if (question) question.textContent = questionOf(pick.spec, widget.rows).text;
    });
    notes.append(asks, note("What changed", pick.change), reading, note("Why it matters", pick.why));
    const scores = el("div", "scores");
    scores.append(score("How new", pick.novelty), score("How useful", pick.meaning));
    notes.append(scores);
    const original = originals[pick.source];
    if (original) {
      const block = el("div", "original note");
      block.append(el("h3", undefined, `The original: ${original.title ?? pick.source}`));
      const small = el("div", "slot");
      block.append(small);
      createWidget(small, { ...original, style: { ...original.style, height: 144, density: "compact" } });
      notes.append(block);
    }
    section.append(chart, notes);
    list.append(section);
  });
}

// Theme switch for the page and every chart on it.
for (const b of document.querySelectorAll<HTMLButtonElement>("#theme button")) {
  b.addEventListener("click", () => {
    setLook({ theme: b.dataset.value });
  });
}

try {
  const response = await fetch("/selections.json");
  const data = (await response.json()) as { selections?: Selection[]; made?: number; charts?: number };
  render(data.selections ?? [], { variants: data.made, charts: data.charts });
} catch {
  render([]);
}
