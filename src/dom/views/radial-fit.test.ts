// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { WidgetSpec } from "../../core/types.ts";
import { textWidth } from "../layout.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

/** The radial, hierarchy, map and RAG views: every text they draw in an svg stays inside it at phone widths. */
const VIEWS = ["donut", "pie", "rings", "gauge", "waffle", "treemap", "sunburst", "icicle", "chord", "sankey", "radar", "rose", "choropleth", "symbols", "locator", "xray", "ragboard", "ragtrend"];

const catalog = (type: string) => JSON.parse(readFileSync(`catalog/${type}.json`, "utf8")) as WidgetSpec;

let target: HTMLElement;
let width = 320;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
});
afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
});

/** The font size a text draws at: its own attribute, or the 11px most chart text uses (10px for rim and tile codes). */
const sizeOf = (node: Element) => Number(node.getAttribute("font-size")) || (/fft-(rose-label|map-code)/.test(node.getAttribute("class") ?? "") ? 10 : 11);

/** Every text in the card's drawings that runs past its svg's left or right edge, in the svg's own units. */
function overflowing(card: HTMLElement): string[] {
  const out: string[] = [];
  for (const svg of card.querySelectorAll("svg")) {
    if (svg.closest(".fft-sr-only") || svg.classList.contains("fft-rag-glyph")) continue;
    const box = (svg.getAttribute("viewBox") ?? "").trim().split(/\s+/).map(Number);
    const [minX, w] = box.length === 4 ? [box[0] as number, box[2] as number] : [0, Number(svg.getAttribute("width"))];
    if (!w) continue;
    for (const node of svg.querySelectorAll("text")) {
      if (node.closest(".fft-sr-only") || node.closest("[transform]") || node.hasAttribute("transform") || !node.textContent) continue;
      const x = Number(node.getAttribute("x") ?? 0);
      // A label of several lines (tspans) is as wide as its widest line, each measured at its own size.
      const weight = /value|total|name|place/.test(node.getAttribute("class") ?? "") ? 600 : 400;
      const lines = [...node.querySelectorAll("tspan")];
      const tw = lines.length
        ? Math.max(...lines.map((line) => textWidth(line.textContent ?? "", sizeOf(line) || sizeOf(node), /note/.test(line.getAttribute("class") ?? "") ? 400 : weight)))
        : textWidth(node.textContent, sizeOf(node), weight);
      const anchor = node.getAttribute("text-anchor") ?? "start";
      const [from, to] = anchor === "end" ? [x - tw, x] : anchor === "middle" ? [x - tw / 2, x + tw / 2] : [x, x + tw];
      if (from < minX - 1 || to > minX + w + 1) out.push(`${node.getAttribute("class")} "${node.textContent}" [${Math.round(from)}, ${Math.round(to)}] of ${minX}..${minX + w}`);
    }
  }
  return out;
}

/** Stored widgets of these views beyond the catalog's: maps with labels near every edge, more radial examples. */
const STORED = ["offices", "customers-by-state", "revenue-by-country", "visits-by-hour", "revenue-pie", "seats-by-party", "rag-scorecard", "rag-status-trend"];
const stored = (id: string) => JSON.parse(readFileSync(`widgets/${id}.json`, "utf8")) as WidgetSpec;

describe("radial, map and RAG views fit a phone", () => {
  test.each(VIEWS)("%s: at 320px every text stays inside its drawing", async (type) => {
    width = 320;
    await createWidget(target, { ...catalog(type), locale: "en-US" }).ready;
    const card = target.querySelector(".fft-widget") as HTMLElement;
    expect(card.getAttribute("data-state")).toBe("ready");
    expect([type, overflowing(card)]).toEqual([type, []]);
  });

  test.each(STORED)("widget %s: at 320px and 390px every text stays inside its drawing", async (id) => {
    for (const w of [320, 390]) {
      width = w;
      target.replaceChildren();
      await createWidget(target, { ...stored(id), locale: "en-US" }).ready;
      const card = target.querySelector(".fft-widget") as HTMLElement;
      expect([id, w, overflowing(card)]).toEqual([id, w, []]);
    }
  });
});
