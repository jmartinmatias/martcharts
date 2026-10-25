// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import axe from "axe-core";
import { beforeEach, describe, expect, test } from "vitest";
import { contrast, deltaE, fromOklch, oklab } from "../core/color.ts";
import { getBlock } from "../core/registry.ts";
import type { Row, WidgetSpec } from "../core/types.ts";
import { themeTokens } from "./styles.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

let target: HTMLElement;
beforeEach(() => {
  document.documentElement.lang = "en";
  document.body.innerHTML = "";
  target = document.createElement("main");
  document.body.append(target);
});

async function draw(spec: Omit<WidgetSpec, "data"> & { rows: Row[] }) {
  const { rows, ...rest } = spec;
  const widget = createWidget(target, { locale: "en-GB", data: { type: "inline", rows }, ...rest } as WidgetSpec);
  await widget.ready;
  expect(widget.root.dataset.state).toBe("ready");
  return widget;
}
const all = (selector: string) => [...target.querySelectorAll(selector)];

describe("the rag format", () => {
  const block = getBlock("format", "rag");

  test("a pill with the status's shape and words, for any spelling of the status", () => {
    const pills = ["G", "amber", "Red", "", "grey"].map((v) => block.element?.(v, {}, "en", document) as HTMLElement);
    expect(pills.map((p) => [p.dataset.rag, p.textContent, p.querySelector("path")?.getAttribute("data-shape")])).toEqual([
      ["G", "On track", "circle"],
      ["A", "At risk", "triangle"],
      ["R", "Off track", "square"],
      ["N", "No data", "ring"],
      ["N", "No data", "ring"],
    ]);
    // The shape is decoration for screen readers; the words carry the status.
    expect(pills.every((p) => p.querySelector("svg")?.getAttribute("aria-hidden") === "true")).toBe(true);
  });

  test("compact keeps only the shape, with the words as its name; plain text is the words", () => {
    const pill = block.element?.("R", { compact: true, words: { R: "Escalate" } }, "en", document) as HTMLElement;
    expect([pill.textContent, pill.getAttribute("role"), pill.getAttribute("aria-label"), pill.title]).toEqual(["", "img", "Escalate", "Escalate"]);
    expect([block.format("g", {}), block.format("A", { words: { A: "Watch" } }), block.format(undefined, {})]).toEqual(["On track", "Watch", "No data"]);
  });

  test("in a table, after the rag transform, every status is a pill", async () => {
    await draw({
      rows: [
        { client: "Aldana", nps: 45 },
        { client: "Keller", nps: 12 },
      ],
      transform: [{ type: "rag", rules: [{ field: "nps", as: "status", green: 40, amber: 20 }] }],
      fields: { status: { format: "rag" } },
      view: { type: "table", columns: ["client", "nps", "status"] },
    });
    expect(all("td .fft-rag-pill").map((p) => p.textContent)).toEqual(["On track", "Off track"]);
  });
});

describe("rag thresholds on kpi and kpis", () => {
  test("a kpi gets a pill beside its number", async () => {
    await draw({ rows: [{ nps: 31 }], view: { type: "kpi", value: "nps", rag: { green: 40, amber: 20 } } as WidgetSpec["view"] });
    expect(all(".fft-kpi-rag").map((p) => [(p as HTMLElement).dataset.rag, p.textContent])).toEqual([["A", "At risk"]]);
  });

  test("each kpis tile takes its own thresholds, lower is better included; no thresholds, no pill", async () => {
    await draw({
      rows: [{ nps: 52, overdue: 9, aum: 4 }],
      view: { type: "kpis", items: [{ value: "nps", rag: { green: 40, amber: 20 } }, { value: "overdue", rag: { green: 2, amber: 5, goodWhen: "down" } }, { value: "aum" }] },
    });
    expect(all(".fft-stat").map((tile) => tile.querySelector(".fft-stat-rag")?.textContent ?? "")).toEqual(["On track", "Off track", ""]);
  });
});

describe("the RAG colors", () => {
  const styles = readFileSync("src/dom/styles.ts", "utf8");
  /** A token's color in a theme: `color-mix(in oklab, base p%, var(--fft-text))`, mixed as the browser does. */
  const resolve = (name: string, scheme: "light" | "dark") => {
    const found = new RegExp(`--fft-rag-${name}: color-mix\\(in oklab, (#[0-9a-f]{6}) (\\d+)%, var\\(--fft-text\\)\\)`).exec(styles);
    expect(found).not.toBeNull();
    const [base, share] = [found?.[1] as string, Number(found?.[2]) / 100];
    const [a, b] = [oklab(base), oklab(themeTokens(scheme).text as string)];
    const [L, A, B] = [0, 1, 2].map((i) => (a[i] as number) * share + (b[i] as number) * (1 - share)) as [number, number, number];
    return fromOklch(L, Math.hypot(A, B), (Math.atan2(B, A) * 180) / Math.PI);
  };

  test.each(["light", "dark"] as const)("in the %s theme, every status reads at 3:1 or more on the surface", (scheme) => {
    const surface = themeTokens(scheme).surface as string;
    for (const name of ["g", "a", "r"]) expect([name, contrast(resolve(name, scheme), surface) >= 3]).toEqual([name, true]);
  });

  test.each(["light", "dark"] as const)("in the %s theme, green and red stay apart for a reader with protanopia", (scheme) => {
    const [g, a, r] = ["g", "a", "r"].map((name) => resolve(name, scheme)) as [string, string, string];
    expect([deltaE(g, r, "protan") > 10, deltaE(g, a, "protan") > 10, deltaE(a, r, "protan") > 5]).toEqual([true, true, true]);
  });
});

describe("status never rests on color", () => {
  const board: WidgetSpec = JSON.parse(readFileSync("widgets/rag-scorecard.json", "utf8")) as WidgetSpec;
  const trend: WidgetSpec = JSON.parse(readFileSync("widgets/rag-status-trend.json", "utf8")) as WidgetSpec;

  test.each([
    ["scorecard", board],
    ["trend", trend],
  ])("the %s: every status mark has its shape, and words for screen readers; axe finds nothing", async (_name, spec) => {
    const widget = createWidget(target, spec);
    await widget.ready;
    const glyphs = all(".fft-rag-glyph");
    expect(glyphs.length).toBeGreaterThan(10);
    // Each status has its own shape: the four marks never share one.
    const shapeOf = new Map<string, Set<string>>();
    for (const glyph of glyphs) {
      const rag = glyph.getAttribute("data-rag") as string;
      shapeOf.set(rag, new Set([...(shapeOf.get(rag) ?? []), glyph.querySelector("path")?.getAttribute("data-shape") as string]));
    }
    expect([...shapeOf.values()].every((shapes) => shapes.size === 1)).toBe(true);
    expect(new Set([...shapeOf.values()].map((s) => [...s][0])).size).toBe(shapeOf.size);
    // Every status cell carries its words.
    for (const cell of all(".fft-rag-cell, .fft-ragtrend-cell")) expect(cell.textContent).toMatch(/On track|At risk|Off track|No data|no reading/);
    const result = await axe.run(target, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")}`))).toEqual([]);
  });
});
