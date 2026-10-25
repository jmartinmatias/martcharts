// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import type { WidgetSpec } from "../../core/types.ts";
import { textWidth } from "../layout.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

/**
 * Every row and cartesian view, drawn from its catalog example at a phone's 320px and a card's 720px: no text may
 * run outside its svg, and no svg may be wider than the card. Text is measured as the kit measures it (San Francisco).
 */
const VIEWS = [
  "bar", "line", "area", "scatter", "histogram", "waterfall", "pareto", "candlestick", "dual", "heatmap", "calendar", "marimekko",
  "dot", "dumbbell", "slope", "bump", "variance", "lifecycle", "pyramid", "timeline", "likert", "boxplot", "ridgeline", "horizon",
  "beeswarm", "anomalies", "matrix",
];
const catalog = (type: string) => JSON.parse(readFileSync(`catalog/${type}.json`, "utf8")) as WidgetSpec;

/** Classes set in bold in the stylesheet. */
const BOLD = /fft-(likert-question|lc-group|anom-name|slope-value|bump-rank|pyr-value|db-value|wf-value|hist-value|mekko-label|mekko-value|lc-status)/;
/** Classes set smaller than 11px. */
const SMALL = /fft-(mx-label|lc-status|anom-count|mekko-value|cal-month)/;

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
  document.body.innerHTML = "";
});

async function drawAt(type: string, width: number) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
  const target = document.createElement("div");
  document.body.append(target);
  await createWidget(target, { ...catalog(type), locale: "en-US" }).ready;
  return target.querySelector(".fft-widget") as HTMLElement;
}

/** Text drawn outside its svg, and svgs wider than the card. */
export function overflow(card: HTMLElement, width: number): string[] {
  const out: string[] = [];
  const svgs = [...card.querySelectorAll(".fft-body svg")].filter((s) => !s.closest(".fft-sr-only") && !/fft-(spark|sparkline|rag-glyph|swatch)/.test(s.getAttribute("class") ?? "")) as SVGSVGElement[];
  for (const s of svgs) {
    if (s.parentElement?.closest("svg")) continue;
    const sw = Number(s.getAttribute("width"));
    if (!sw) continue;
    // A grid that scrolls sideways at a tappable size may be wider than the card, by design.
    if (sw > width + 1 && !s.closest("[data-scrolls]")) out.push(`svg ${s.getAttribute("class") ?? ""} is ${sw} wide`);
    for (const t of s.querySelectorAll("text")) {
      if (t.closest(".fft-sr-only") || t.hasAttribute("transform") || t.closest("[transform*=rotate]")) continue;
      const text = t.textContent ?? "";
      if (!text.trim() || (t as SVGElement).style.display === "none" || t.getAttribute("visibility") === "hidden") continue;
      const x = Number(t.getAttribute("x") ?? 0);
      const cls = `${t.getAttribute("class") ?? ""} ${t.parentElement?.getAttribute("class") ?? ""}`;
      const measure = (words: string) => textWidth(words, SMALL.test(cls) ? 10 : 11, BOLD.test(cls) ? 600 : 400);
      // A label written over several lines (tspans that reset x) is as wide as its widest line.
      const lines = [...t.querySelectorAll("tspan")].filter((span) => span.hasAttribute("x") || span === t.querySelector("tspan"));
      const w = lines.length > 1 ? Math.max(...lines.map((span) => measure(span.textContent ?? ""))) : measure(text);
      const anchor = t.getAttribute("text-anchor") ?? "start";
      const [from, to] = anchor === "end" ? [x - w, x] : anchor === "middle" ? [x - w / 2, x + w / 2] : [x, x + w];
      if (from < -1 || to > sw + 1) out.push(`"${text.slice(0, 24)}" ${cls.trim()} [${Math.round(from)}, ${Math.round(to)}] of ${sw}`);
    }
  }
  return out;
}

describe("nothing runs outside the card", () => {
  for (const width of [320, 720]) {
    test.each(VIEWS)(`%s at ${width}px`, async (type) => {
      const card = await drawAt(type, width);
      expect([type, overflow(card, width)]).toEqual([type, []]);
    });
  }
});
