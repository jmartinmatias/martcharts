// @vitest-environment jsdom
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { Row, WidgetSpec } from "./core/types.ts";
import { explainChart } from "./core/explain.ts";
import { questionOf } from "./core/question.ts";
import { readingLanguages, registerReadingLanguages } from "./core/reading.ts";
import * as lite from "./lite.ts";

/** Gzipped size of a built file, or undefined before `npm run build:lib`. */
const gz = (file: string) => (existsSync(file) ? gzipSync(readFileSync(file)).length : undefined);

/** The full drop-in bundle's gzipped size when the lite build was made (1,006,087 bytes raw). */
const FULL_BEFORE = 298_224;

describe("bundle sizes (after npm run build:lib)", () => {
  const full = gz("dist/martcharts.iife.js");
  const lite = gz("dist/martcharts-lite.iife.js");
  test.skipIf(full === undefined)("the full bundle stays within 5% of its size when the lite build began", () => {
    expect(full).toBeLessThanOrEqual(Math.round(FULL_BEFORE * 1.05));
  });
  test.skipIf(lite === undefined || full === undefined)("the lite bundle stays under 76% of the full bundle's starting size, and under three quarters of today's", () => {
    // 206,759 bytes gzipped when made: 69% of 298,224. What remains is what showing charts uses: the English reading
    // guides, the stylesheet, the views' option schemas (validation messages read them) and the chart picker behind
    // <fft-widget data="…">.
    // 72% when the lite bundle was cut; the wallet audit on the x-ray card (Audit wallet, Copy strategy) then added
    // about 14 KB gzipped of display code, so the ceiling is 75%. Raise it again only for a feature, never for creep.
    // 76% after the board chrome (tabs, folded sections, the Share menu, printing every section, one keyboard stop per
    // card and name-based click filters) added about 0.3 KB gzipped of display code.
    expect(lite).toBeLessThanOrEqual(Math.round(FULL_BEFORE * 0.76));
    expect(lite as number).toBeLessThan((full as number) * 0.75);
  });
  test.skipIf(!existsSync("dist/martcharts-lite.iife.js"))("the lite bundle carries no editor, composer, Taller, palette picker or French and German reading", () => {
    const text = readFileSync("dist/martcharts-lite.iife.js", "utf8");
    for (const name of ["createEditor", "createComposer", "createVariants", "createPalettePicker"]) expect([name, text.includes(name)]).toEqual([name, false]);
    // The French and German reading guides (their sentences), and the editor's words.
    for (const phrase of ["Une ligne par", "Eine Zeile je", "Add to dashboard", "Other ways to embed"]) expect([phrase, text.includes(phrase)]).toEqual([phrase, false]);
  });
});

describe("the lite entry", () => {
  test("exports what showing charts needs", () => {
    for (const name of ["createWidget", "createDashboard", "defineWidgetElement", "mountEmbed", "listenForEmbedHeights", "cardToSvg", "explainChart", "validateSpec", "runPipeline", "fork", "wordsFor"]) {
      expect([name, typeof (lite as Record<string, unknown>)[name]]).toEqual([name, "function"]);
    }
    expect(customElements.get("fft-widget")).toBeDefined();
  });

  const catalog = readdirSync("catalog").filter((file) => file.endsWith(".json"));
  test.each(catalog)("draws %s", async (file) => {
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    const spec = JSON.parse(readFileSync(`catalog/${file}`, "utf8")) as WidgetSpec;
    const target = document.createElement("div");
    document.body.append(target);
    const widget = lite.createWidget(target, spec);
    await widget.ready;
    expect([file, target.querySelector(".fft-widget")?.getAttribute("data-state")]).toEqual([file, "ready"]);
    widget.destroy();
    target.remove();
    vi.unstubAllGlobals();
  });
});

describe("French and German reading, registered apart", () => {
  const saved = readingLanguages();
  afterEach(() => {
    if (saved) registerReadingLanguages(saved);
  });

  test("without them, as in the lite build, a French card reads in English; with them, in French", () => {
    const spec = JSON.parse(readFileSync("catalog/hbar.json", "utf8")) as WidgetSpec;
    const rows = spec.data.rows as Row[];
    const french = { ...spec, locale: "fr-FR" };
    const inFrench = explainChart(french, rows);
    expect(inFrench).toMatch(/Une |Ici/);
    registerReadingLanguages(undefined as never);
    // English sentences, with the card's own French numbers ("91 %").
    const plain = (text: string) => text.replace(/\s/g, " ");
    expect(plain(explainChart(french, rows))).toBe(plain(explainChart({ ...spec, locale: "en-US" }, rows)).replace("91%", "91 %"));
    expect(questionOf(french, rows).text).toBe(questionOf({ ...spec, locale: "en-US" }, rows).text);
  });
});
