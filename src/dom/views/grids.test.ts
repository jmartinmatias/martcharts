// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import type { WidgetSpec } from "../../core/types.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

/**
 * Grids of cells render evenly at any width, as the monthly status trend does: every cell in a grid is the same size,
 * the grid fits its card (or scrolls sideways at a tappable 21px minimum), and every mark that does not encode a
 * value by its size is the same size.
 */
const catalog = (type: string) => JSON.parse(readFileSync(`catalog/${type}.json`, "utf8")) as WidgetSpec;
const widget = (id: string) => JSON.parse(readFileSync(`widgets/${id}.json`, "utf8")) as WidgetSpec;
const WIDTHS = [320, 390, 900];

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
  document.body.innerHTML = "";
});

async function drawAt(spec: WidgetSpec, width: number) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
  const target = document.createElement("div");
  document.body.append(target);
  await createWidget(target, { ...spec, locale: "en-US" }).ready;
  return target.querySelector(".fft-widget") as HTMLElement;
}

const sizes = (nodes: Iterable<Element>, attrs: string[]) => new Set([...nodes].map((node) => attrs.map((a) => node.getAttribute(a)).join("x")));

describe("heatmap", () => {
  test.each(WIDTHS)("at %ipx every column is the same width, at least 21px, and the grid fits or scrolls", async (width) => {
    const card = await drawAt(catalog("heatmap"), width);
    const grid = card.querySelector(".fft-heatmap") as HTMLElement;
    // jsdom keeps the template as written: the names' width, then repeat(n, one width for every column).
    const match = grid.style.gridTemplateColumns.match(/^([\d.]+)px repeat\((\d+), ([\d.]+)px\)$/);
    expect(match).not.toBeNull();
    const [name, count, cell] = [Number(match?.[1]), Number(match?.[2]), Number(match?.[3])];
    expect(count).toBe(card.querySelectorAll(".fft-heat-col").length);
    expect(cell).toBeGreaterThanOrEqual(21);
    const total = name + count * (cell + 2);
    expect(total <= width + 1 || card.querySelector(".fft-heat")?.hasAttribute("data-scrolls")).toBe(true);
    // A number that would spill is left to the tooltip; the rest are written in their cells.
    for (const cell of card.querySelectorAll<HTMLElement>(".fft-heatmap .fft-cell[data-quiet]")) expect(cell.textContent).toBe("");
    for (const cell of card.querySelectorAll<HTMLElement>(".fft-heatmap .fft-cell[data-step]:not([data-quiet])")) expect(cell.textContent).not.toBe("");
  });
});

describe("calendar", () => {
  test.each(WIDTHS)("at %ipx every day is the same size and the calendar fits the card", async (width) => {
    const card = await drawAt(catalog("calendar"), width);
    const days = card.querySelectorAll(".fft-day");
    expect(days.length).toBeGreaterThan(20);
    expect(sizes(days, ["width", "height"]).size).toBe(1);
    expect(Number(card.querySelector("svg.fft-calendar")?.getAttribute("width"))).toBeLessThanOrEqual(width);
  });
});

describe("matrix", () => {
  test.each(WIDTHS)("at %ipx every cell is the same size, and yes-squares are all one size", async (width) => {
    for (const spec of [catalog("matrix"), widget("obligation-matrix")]) {
      const card = await drawAt(spec, width);
      expect(sizes(card.querySelectorAll(".fft-mx-cell"), ["width", "height"]).size).toBe(1);
      const yes = card.querySelectorAll(".fft-mx-yes");
      if (yes.length) expect(sizes(yes, ["width", "height"]).size).toBe(1);
      expect(Number(card.querySelector(".fft-matrix svg")?.getAttribute("width"))).toBeLessThanOrEqual(width);
      document.body.innerHTML = "";
    }
  });
});

describe("whitespace", () => {
  test.each(WIDTHS)("at %ipx every product column is one equal track, square cells, and the minimum fits the card", async (width) => {
    const card = await drawAt(catalog("whitespace"), width);
    const grid = card.querySelector(".fft-ws-grid") as HTMLElement;
    const template = grid.style.gridTemplateColumns;
    const columns = card.querySelectorAll(".fft-ws-col").length;
    const compact = card.querySelector(".fft-ws")?.hasAttribute("data-compact");
    expect(template).toContain(`repeat(${columns}, minmax(${compact ? 18 : 21}px, 1fr))`);
    // On a phone the row ends keep only the amount to win and cells go to 18px, so the grid fits a 359px card without
    // scrolling sideways; only far narrower cards scroll.
    const scrolls = card.querySelector(".fft-ws")?.hasAttribute("data-scrolls");
    if (width >= 320) expect(scrolls).toBe(false);
  });

  test("the cockpit's 'Where to sell next' fits a phone card: no sideways scroll in the 315px a 390px phone gives it, the amounts kept", async () => {
    const spec = JSON.parse(readFileSync("widgets/commercial/cc-whitespace.json", "utf8")) as WidgetSpec;
    const rows = JSON.parse(readFileSync("public/data/holdings.json", "utf8"));
    const card = await drawAt({ ...spec, data: { type: "inline", rows } }, 315);
    expect([card.querySelector(".fft-ws")?.hasAttribute("data-scrolls"), card.querySelector(".fft-ws")?.hasAttribute("data-compact")]).toEqual([false, true]);
    expect(card.querySelectorAll(".fft-ws-potential").length).toBeGreaterThan(0);
  });
});
