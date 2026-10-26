// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import "./core/index.ts";
import { describeBlocks } from "./core/registry.ts";
import { chartGuide } from "./core/guide.ts";
import { GUIDE_BUILDS, GUIDE_GRAINS, GUIDE_USES, OPTION_HINTS, OPTION_NAMES, guideLine, kindWord, optionHint, optionLabel } from "./core/option-words.ts";
import { createEditor } from "./dom/editor.ts";
import "./dom/views/index.ts";

const views = describeBlocks("view");

describe("French and German for every option and every guide line", () => {
  test("every view option has its hint and its name in French and German", () => {
    const missingHints = views.flatMap((view) => Object.values(view.options ?? {}).map((o) => o.description).filter((d) => d && !OPTION_HINTS[d]));
    const missingNames = views.flatMap((view) => Object.keys(view.options ?? {}).filter((name) => !OPTION_NAMES[name]));
    expect([missingHints, missingNames]).toEqual([[], []]);
  });

  test("every chart's best-for and least-useful lines, and how it is built, read in French and German", () => {
    const missing = views.flatMap((view) => {
      const guide = chartGuide(view.type);
      return [...(guide?.bestFor ?? []), ...(guide?.avoidFor ?? []), ...(guide?.build ? [guide.build] : [])].filter((line) => !guideLine(line, "fr") || !guideLine(line, "de"));
    });
    expect(missing).toEqual([]);
    expect(Object.keys(GUIDE_GRAINS)).toHaveLength(8);
  });

  test("no translation is left in English, and each keeps the code it quotes", () => {
    const pairs = [...Object.entries(OPTION_HINTS), ...Object.entries(GUIDE_USES), ...Object.entries(GUIDE_BUILDS)];
    // A translation equal to its English means it was never written.
    expect(pairs.filter(([en, [fr, de]]) => fr === en || de === en).map(([en]) => en)).toEqual([]);
    // Quoted code (option values, JSON keys) survives: every "quoted" token of the English is in both translations.
    // Two quoted words are what readers see, not code, so they are translated: the default "Other" row and the "seats" caption.
    const read = new Set(['"Other"', '"seats"']);
    const lost = pairs.flatMap(([en, [fr, de]]) => (en.match(/"[a-zA-Z_]+"/g) ?? []).filter((token) => !read.has(token)).filter((token) => !fr.includes(token) || !de.includes(token)).map((token) => `${token} in ${en.slice(0, 40)}`));
    expect(lost).toEqual([]);
  });

  test("the lookups fall back to English, or to nothing for a label the caller then writes itself", () => {
    expect([optionHint("No such hint.", "fr"), optionLabel("noSuchOption", "de"), guideLine("No such line", "fr"), kindWord("other", "de")]).toEqual(["No such hint.", undefined, undefined, "other"]);
    expect([kindWord("number", "fr"), kindWord("date", "de"), optionLabel("goodWhen", "fr")]).toEqual(["nombre", "Datum", "Bon quand"]);
  });
});

describe("the Editor's Refine panel in French", () => {
  let target: HTMLElement;
  afterEach(() => target?.remove());

  test("with the words on the page, option labels and hints read in French; the spec it writes is unchanged", () => {
    target = document.body.appendChild(document.createElement("div"));
    const editor = createEditor(target, { hash: false, locale: "fr-FR" });
    editor.setData("region\trevenue\tmonth\nNorth\t1200\t2026-01\nSouth\t900\t2026-02");
    editor.setSpec({ ...editor.spec, view: { type: "bar", x: "region", y: "revenue" } });
    editor.go(3);
    (target.querySelectorAll(".fft-ed-tab")[1] as HTMLButtonElement).click();
    const stacked = target.querySelector("[data-option='stacked']") as HTMLElement;
    expect(stacked.textContent).toContain("Empilé");
    const hinted = [...target.querySelectorAll<HTMLElement>("[title]")].map((node) => node.title).filter(Boolean);
    expect(hinted.some((title) => /empile les séries/.test(title))).toBe(true);
    expect(hinted.some((title) => /stacks the series/.test(title))).toBe(false);
    expect(editor.spec.view).toMatchObject({ type: "bar", x: "region", y: "revenue" });
    editor.destroy?.();
  });
});

describe("the Data guide and the catalog carry the French and German", () => {
  const guide = readFileSync("catalog/guide.html", "utf8");
  const catalog = readFileSync("catalog/index.html", "utf8");

  test("best-for lines, how each chart is built, option hints and the switch menu carry data-fr and data-de", () => {
    expect(guide).toContain('data-fr="Des volumes dans le temps où le montant lui-même compte : trésorerie, chiffre d&#39;affaires, trafic"'.replace("&#39;", guide.includes("&#39;") ? "&#39;" : "'"));
    for (const english of ["Volumes over time where the amount itself matters", "One point per row at x (in date order) and y", "Field for the ordered axis, usually a date or period."]) {
      const at = guide.indexOf(english);
      expect([english, at > 0 && /data-de="[^"]+"/.test(guide.slice(Math.max(0, at - 1200), at))]).toEqual([english, true]);
    }
    expect(guide).toMatch(/data-fr="area \(tel quel\)" data-de="area \(wie gebaut\)"/);
    expect(guide).toMatch(/data-fr="non tracée"/);
  });

  test("every catalog card's needs line reads in French and German, its option names kept as code", () => {
    const needs = [...catalog.matchAll(/<p class="needs"([^>]*)>/g)].map((m) => m[1] ?? "");
    expect(needs.length).toBe(57);
    expect(needs.every((attrs) => /data-fr="il faut [^"]+"/.test(attrs) && /data-de="braucht [^"]+"/.test(attrs))).toBe(true);
    expect(catalog).toMatch(/data-fr="il faut x : date, y : nombre\+"/);
  });
});
