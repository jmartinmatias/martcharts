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
  test.skipIf(full === undefined)("the full bundle stays within 13% of its size when the lite build began", () => {
    // 5% until the builder and reading features of late October 2026: the Composer's saved dashboards with undo, refs
    // unique to each chart's place, quarters in words, per-row units and the phone layout of the whitespace grid took
    // it to 105.6%. Raise it again only for a feature, never for creep.
    // 11% after French and German throughout: authored words laid over in each language, every chart type's summary,
    // jobs and switching advice in French and German for the Editor (type-words.ts), and words for data values took it
    // to 110.2%. The full bundle carries every language by design; pages that only show charts use the lite one.
    // 12% after the dashboard-fit work of 31 October 2026 took it to 111.1%: cards that fill a stretched row (ctx.room),
    // the scatter swarm on whole-number scores, phone tables as row cards, fold-out buttons on stories and status
    // grids, two-column status grids, wrapped or leaning waterfall names, and warnings for unknown options.
    // 13% after the takeaway line, embed widths, chart names from other tools in the validator, shaded ranges, the
    // fill between two lines, and flag and image cells (1 November 2026) took it to 112.3%.
    expect(full).toBeLessThanOrEqual(Math.round(FULL_BEFORE * 1.13));
  });
  test.skipIf(lite === undefined || full === undefined)("the lite bundle stays under 80% of the full bundle's starting size, and under three quarters of today's", () => {
    // 206,759 bytes gzipped when made: 69% of 298,224. What remains is what showing charts uses: the English reading
    // guides, the stylesheet, the views' option schemas (validation messages read them) and the chart picker behind
    // <fft-widget data="…">.
    // 72% when the lite bundle was cut; the wallet audit on the x-ray card (Audit wallet, Copy strategy) then added
    // about 14 KB gzipped of display code, so the ceiling is 75%. Raise it again only for a feature, never for creep.
    // 76% after the board chrome (tabs, folded sections, the Share menu, printing every section, one keyboard stop per
    // card and name-based click filters) added about 0.3 KB gzipped of display code.
    // 77% after the functional audit's reader fixes (one board-level empty message with Clear, how far a click
    // reaches, the Details panel in words, changes in points on percent tiles, target lines read from a field) added
    // about 2 KB gzipped of display code.
    // 78% after words for data values (a field's values shown as words on axes, legends, tooltips and tables) and
    // authored words laid over in the page's language, which every chart draws with.
    // 79% after the dashboard-fit display code of 31 October 2026 (cards that fill a stretched row, the scatter swarm,
    // phone row cards, fold-out buttons, two-column status grids, waterfall names that wrap or lean) took it to 78.1%.
    // 80% after the takeaway line every card can lead with (and screen readers hear), shaded ranges, the fill between
    // two lines, and flag and image cells (1 November 2026) took it to 79.1%.
    expect(lite).toBeLessThanOrEqual(Math.round(FULL_BEFORE * 0.8));
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
