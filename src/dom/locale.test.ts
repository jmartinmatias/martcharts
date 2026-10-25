// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../core/types.ts";
import { wordsFor } from "../core/words.ts";
import { createDashboard } from "./dashboard.ts";
import { createEditor } from "./editor.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

/**
 * Charts drawn in French and in German write their own words in that language, and not one English phrase from the
 * words module leaks into what is on screen or read aloud. The data here is neutral on purpose (names and labels
 * the author writes), so any English left would be the library's.
 */

afterEach(() => {
  document.body.innerHTML = "";
});

async function draw(locale: string, spec: Omit<WidgetSpec, "data" | "locale"> & { rows: Row[] }) {
  const { rows, ...rest } = spec;
  const target = document.createElement("div");
  document.body.append(target);
  await createWidget(target, { locale, data: { type: "inline", rows }, ...rest } as WidgetSpec, { actions: ["csv", "explain", "image", "info"] }).ready;
  return target;
}

/** Everything a reader sees or hears: text, labels, titles, placeholders, and the tooltip after the first mark is focused. */
function said(target: HTMLElement, focus?: string): string {
  if (focus) target.querySelector(focus)?.dispatchEvent(new Event("focus"));
  const attrs = [...target.querySelectorAll("[aria-label], [title], [placeholder]")].flatMap((node) => ["aria-label", "title", "placeholder"].map((name) => node.getAttribute(name) ?? ""));
  const tooltip = document.querySelector(".fft-tooltip")?.textContent ?? "";
  return [target.textContent ?? "", ...attrs, tooltip].join(" | ");
}

/** English phrases from the module that the other language writes differently: none may appear. */
function englishOnly(locale: string): string[] {
  const leaves = (w: unknown): string[] =>
    w && typeof w === "object" && !Array.isArray(w) ? Object.values(w).flatMap(leaves) : Array.isArray(w) ? w.map(String) : typeof w === "string" ? [w] : [];
  const theirs = new Set(leaves(wordsFor(locale)));
  return [...new Set(leaves(wordsFor("en")))].filter((text) => !theirs.has(text) && /\p{L}{4,}/u.test(text) && !text.includes("{"));
}

function leaks(text: string, locale: string): string[] {
  return englishOnly(locale).filter((phrase) => new RegExp(`(^|[^\\p{L}])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "u").test(text));
}

const LOCALES = [
  ["fr-FR", "fr"],
  ["de-DE", "de"],
] as const;

describe.each(LOCALES)("charts drawn in %s", (locale) => {
  const W = wordsFor(locale);

  test("a donut's tooltip and the widget's own buttons speak the language", async () => {
    const target = await draw(locale, { rows: [{ segment: "Nord", ca: 5 }, { segment: "Sud", ca: 3 }], view: { type: "donut", label: "segment", value: "ca" } });
    const text = said(target, ".fft-slice-hit");
    expect(text).toContain(W.share);
    expect(text).toContain(W.widget.actions.csv as string);
    expect(leaks(text, locale)).toEqual([]);
  });

  test("a stacked hbar says its totals in the language", async () => {
    const target = await draw(locale, { rows: [{ segment: "Nord", a: 5, b: 2 }, { segment: "Sud", a: 3, b: 4 }], view: { type: "hbar", label: "segment", value: ["a", "b"], stacked: true } });
    const text = said(target, ".fft-hbar");
    expect(text).toContain(W.totalSaid("7").trim().replace(/^,\s*/, "").split(" ")[0] as string);
    expect(leaks(text, locale)).toEqual([]);
  });

  test("a choropleth keys its empty regions in the language", async () => {
    const target = await draw(locale, { rows: [{ pays: "FR", n: 3 }, { pays: "DE", n: 5 }], view: { type: "choropleth", geo: "europe", id: "pays", value: "n" } });
    const text = said(target);
    expect(text).toContain(W.noData);
    expect(leaks(text, locale)).toEqual([]);
  });

  test("a RAG scorecard writes its statuses and headings in the language", async () => {
    const target = await draw(locale, {
      rows: [
        { client: "Aster", a: "R", b: "G" },
        { client: "Birch", a: "A", b: "G" },
        { client: "Cedar", a: "G", b: "G" },
      ],
      view: { type: "ragboard", label: "client", dimensions: ["a", "b"] },
    });
    const text = said(target);
    for (const word of [W.rag.R, W.rag.A, W.rag.G, W.overall, W.count]) expect([word, text.includes(word)]).toEqual([word, true]);
    expect(leaks(text, locale)).toEqual([]);
  });

  test("a table's search and pages speak the language", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ nom: `Client ${i + 1}`, montant: (i + 1) * 100 }));
    const target = await draw(locale, { rows, view: { type: "table", search: true, pageSize: 10 } });
    const text = said(target);
    for (const word of [W.table.search, W.table.previous, W.table.next, W.table.pages]) expect([word, text.includes(word)]).toEqual([word, true]);
    expect(text).toContain(W.table.pageRange("1", "10", "25"));
    expect(leaks(text, locale)).toEqual([]);
  });

  test("an anomaly tracker keys its band and its anomalies in the language", async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ jour: `2026-10-${String(i + 1).padStart(2, "0")}`, flux: "Flux", v: i === 6 ? 40 : 10, bas: 5, haut: 20, alerte: i === 6 }));
    const target = await draw(locale, { rows, view: { type: "anomalies", x: "jour", metric: "flux", value: "v", low: "bas", high: "haut", flag: "alerte" } });
    const text = said(target);
    expect(text).toContain(W.expectedBand);
    expect(text).toContain(W.anomaly);
    expect(leaks(text, locale)).toEqual([]);
  });

  test("an empty widget says so in the language", async () => {
    const target = await draw(locale, { rows: [], view: { type: "hbar", label: "segment", value: "ca" } });
    const text = said(target);
    expect(text).toContain(W.widget.noData);
    expect(leaks(text, locale)).toEqual([]);
  });
});

describe.each(LOCALES)("a dashboard and the editor in %s", (locale) => {
  const W = wordsFor(locale);

  test("the board's filter row, share and print tools speak the language of its widgets", async () => {
    const rows = [
      { region: "Nord", month: "2026-09", ca: 5 },
      { region: "Sud", month: "2026-10", ca: 3 },
    ];
    const widgets = { ventes: { id: "ventes", locale, title: "Ventes", data: { type: "inline", rows }, view: { type: "hbar", label: "region", value: "ca" } } as WidgetSpec };
    const target = document.createElement("div");
    document.body.append(target);
    const board = createDashboard(target, { filters: [{ field: "region" }], range: { field: "month" }, widgets: [{ section: "A" }, { widget: "ventes" }, { section: "B" }] }, { widgets, hash: true });
    await board.ready;
    const text = said(target);
    for (const word of [W.board.all, W.board.copyLink, W.board.print, W.board.period]) expect([word, text.includes(word)]).toEqual([word, true]);
    expect(leaks(text, locale)).toEqual([]);
    board.destroy();
  });

  test("the editor takes its language from its locale", () => {
    const target = document.createElement("div");
    document.body.append(target);
    const editor = createEditor(target, { locale, hash: false });
    const text = said(target);
    for (const word of [W.editor.steps[0], W.editor.chooseFile, W.editor.proceed]) expect([word, text.includes(word as string)]).toEqual([word, true]);
    expect(leaks(text, locale)).toEqual([]);
    editor.destroy();
  });
});

test("the leak check catches English phrases and leaves words the languages share alone", () => {
  expect(leaks("Nord | Off track | Total 7", "fr-FR")).toEqual(["Off track"]);
  expect(leaks("Nord | Hors trajectoire | Total 7", "fr-FR")).toEqual([]);
  expect(leaks("Search the table", "de-DE")).toContain("Search");
});

test("English stays the default: no locale, or one not spoken here, writes English", async () => {
  for (const locale of [undefined, "it-IT"]) {
    const target = document.createElement("div");
    document.body.append(target);
    await createWidget(target, { ...(locale ? { locale } : {}), data: { type: "inline", rows: [{ segment: "Nord", ca: 5 }] }, view: { type: "donut", label: "segment", value: "ca" } } as WidgetSpec).ready;
    target.querySelector(".fft-slice-hit")?.dispatchEvent(new Event("focus"));
    expect(document.querySelector(".fft-tooltip")?.textContent).toContain("Share");
    target.remove();
  }
});

test("a country map names its countries in the card's language, and a US-state map keeps its own names", async () => {
  const { countryName, isCountryMap } = await import("../core/geo.ts");
  expect([countryName("DE", "Germany", "fr-FR"), countryName("DE", "Germany", "de-DE"), countryName("DE", "Germany", "en-US")]).toEqual(["Allemagne", "Deutschland", "Germany"]);
  expect([isCountryMap("europe"), isCountryMap("us-states")]).toEqual([true, false]);
  const { readFileSync } = await import("node:fs");
  const spec = JSON.parse(readFileSync("catalog/choropleth.json", "utf8"));
  const el = document.createElement("div");
  document.body.append(el);
  await createWidget(el, { ...spec, locale: "fr-FR" }).ready;
  const labels = [...el.querySelectorAll(".fft-map-region[aria-label]")].map((r) => r.getAttribute("aria-label") ?? "");
  expect(labels.some((l) => l.startsWith("Allemagne"))).toBe(true);
  expect(labels.some((l) => l.startsWith("Germany"))).toBe(false);
  el.remove();
});
