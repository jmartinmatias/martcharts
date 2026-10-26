// @vitest-environment jsdom
/**
 * The rest of French and German: the builders' own words, the chart types' summaries and advice in the catalog, the
 * data guide and the editor, and the data's own values (Complaints, Affluent) written in the reader's language while
 * the data, the filters and the addresses keep them as they are.
 */
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { describeBlocks } from "./core/registry.ts";
import { localizeSpec } from "./core/i18n.ts";
import { PURPOSES, switchChart } from "./core/guide.ts";
import type { Purpose } from "./core/guide.ts";
import { PURPOSE_WORDS, switchAdvice, TYPE_WORDS } from "./core/type-words.ts";
import type { DashboardSpec } from "./core/dashboard.ts";
import type { WidgetSpec } from "./core/types.ts";
import { MAKING_FR } from "./core/words-making.ts";
import { createComposer } from "./dom/composer.ts";
import { createDashboard } from "./dom/dashboard.ts";
import { createEditor } from "./dom/editor.ts";
import { createWidget } from "./dom/widget.ts";
import { createLocalFetch } from "./mcp/store.ts";
import { valueWords } from "../scripts/value-words.ts";
import "./dom/views/index.ts";

/** English phrases the advice and the builders write: none may show in French or German. */
const ENGLISH = /\b(Not possible with this data|Answers a different question|Better for|Weaker for|Gives up|Keeps the job|It needs|needs a|Upload data|Proceed|Visualize|Publish & embed)\b/;

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  history.replaceState(null, "", "/");
});

describe("the chart types in French and German", () => {
  test("every chart type has a summary in both, and every chart whose data must be one kind says what it needs", () => {
    const types = describeBlocks("view").map((b) => b.type);
    const missing = types.filter((type) => !TYPE_WORDS[type]?.fr.summary || !TYPE_WORDS[type]?.de.summary);
    expect(missing).toEqual([]);
    // The guide's gate (MEANING) and the words agree: a chart that is refused for its data's kind says why in both.
    for (const type of ["candlestick", "waterfall", "funnel", "ragboard", "whitespace", "choropleth"]) {
      expect([type, Boolean(TYPE_WORDS[type]?.fr.needs && TYPE_WORDS[type]?.de.needs)]).toEqual([type, true]);
    }
  });

  test("every job has a name in both languages", () => {
    for (const lang of ["fr", "de"] as const) expect(Object.keys(PURPOSE_WORDS[lang]).sort()).toEqual(Object.keys(PURPOSES).sort());
  });

  test("switching advice reads in French and German from the same facts, never in English", () => {
    const spec: WidgetSpec = { data: { type: "inline", rows: [{ m: "2026-01", v: 1 }, { m: "2026-02", v: 3 }, { m: "2026-03", v: 2 }] }, view: { type: "line", x: "m", y: "v" } };
    for (const to of ["bar", "area", "donut", "candlestick", "ragboard", "table"]) {
      const sw = switchChart(spec, to);
      for (const lang of ["fr", "de"] as const) {
        const said = switchAdvice(sw, lang);
        expect([to, lang, said.length > 10, ENGLISH.test(said)]).toEqual([to, lang, true, false]);
      }
    }
    expect(switchAdvice(switchChart(spec, "candlestick"), "fr")).toMatch(/^Pas possible avec ces données : il faut des cours/);
    expect(switchAdvice(switchChart(spec, "candlestick"), "de")).toMatch(/^Mit diesen Daten nicht möglich: Das Diagramm braucht/);
  });

  test("the catalog and the guide carry each summary, job and advice in both languages for the language script", () => {
    const catalog = readFileSync("catalog/index.html", "utf8");
    const guide = readFileSync("catalog/guide.html", "utf8");
    const types = describeBlocks("view").map((b) => b.type);
    expect((catalog.match(/<p data-fr="[^"]+" data-de="[^"]+">/g) ?? []).length).toBe(types.length);
    expect((guide.match(/<p class="summary" data-fr="[^"]+" data-de="[^"]+">/g) ?? []).length).toBe(types.length);
    for (const purpose of Object.keys(PURPOSES) as Purpose[]) expect(guide).toContain(`data-fr="${PURPOSE_WORDS.fr[purpose].replace(/'/g, "'")}"`);
    expect(guide).toMatch(/<td class="assess"><span data-fr="[^"]+" data-de="[^"]+">/);
  });

  test("the language script shows an element's own French or German and its English again for English", () => {
    document.body.innerHTML = `<p id="s" data-fr="Des barres verticales." data-de="Senkrechte Balken.">Vertical bars.</p>`;
    history.replaceState(null, "", "/catalog/index.html?lang=fr");
    localStorage.clear();
    delete (window as { siteLook?: unknown }).siteLook;
    new Function(readFileSync("public/site-look.js", "utf8"))();
    const look = window.siteLook as unknown as { set(patch: Record<string, string>): unknown; translate(): void };
    look.translate();
    const text = () => document.getElementById("s")?.textContent;
    const fr = text();
    look.set({ lang: "de" });
    look.translate();
    const de = text();
    look.set({ lang: "en" });
    look.translate();
    expect([fr, de, text()]).toEqual(["Des barres verticales.", "Senkrechte Balken.", "Vertical bars."]);
  });
});

describe("the builders in French and German", () => {
  test("the editor's own words and its chart advice are French when it is made in French", async () => {
    const target = document.body.appendChild(document.createElement("div"));
    const editor = createEditor(target, { hash: false, locale: "fr-FR" });
    await editor.setData("region,product,revenue,month\nNorth,A,120,2026-01\nSouth,B,90,2026-02\nEast,A,200,2026-03\n", "sales.csv");
    await editor.go(3);
    await new Promise((r) => setTimeout(r, 20));
    const text = target.textContent ?? "";
    expect([text.includes(MAKING_FR.editor.steps[0] as string), ENGLISH.test(text)]).toEqual([true, false]);
    // Each chart type's reason is in French: recommended (its jobs), fitting (what it wins or gives up) or not possible.
    const whys = [...target.querySelectorAll(".fft-ed-type-why")].map((el) => el.textContent ?? "");
    expect(whys.length).toBeGreaterThan(40);
    expect(whys.filter((why) => ENGLISH.test(why))).toEqual([]);
  });

  test("the composer's own words are French when it is made in French", () => {
    const target = document.body.appendChild(document.createElement("div"));
    createComposer(target, { hash: false, locale: "fr-FR" });
    const text = target.textContent ?? "";
    expect([text.includes(MAKING_FR.composer.myCharts), /My charts|Examples|Add a section/.test(text)]).toEqual([true, false]);
  });

  test("the site's editor and composer are made in the site's language and reload into a new one", () => {
    for (const page of ["demo/editor.ts", "demo/composer.ts"]) {
      const code = readFileSync(page, "utf8");
      expect([page, /locale: siteLocale\(\) \?\? "en-US"/.test(code), /addEventListener\("martcharts:lang"[\s\S]{0,80}location\.reload\(\)/.test(code)]).toEqual([page, true, true]);
    }
  });
});

describe("the data's values in the reader's language", () => {
  const spec: WidgetSpec = {
    title: "Clients by segment",
    locale: "fr-FR",
    data: { type: "inline", rows: [{ segment: "Affluent", clients: 40 }, { segment: "Corporate", clients: 25 }] },
    fields: { segment: {} },
    view: { type: "hbar", label: "segment", value: "clients" },
    i18n: { fr: { fields: { segment: { values: { Affluent: "Clientèle aisée", Corporate: "Entreprises" } } } } },
  } as WidgetSpec;

  test("a field's words for its values are laid in by a translation, even when the field had none", () => {
    const fr = localizeSpec({ ...spec, fields: {} }, "fr-FR") as WidgetSpec;
    expect(fr.fields?.segment?.values).toBeUndefined();
    expect((localizeSpec(spec, "fr-FR") as WidgetSpec).fields?.segment?.values?.Affluent).toBe("Clientèle aisée");
    // Only a map of words is ever added: a setting cannot be.
    const sneaky = localizeSpec({ ...spec, i18n: { fr: { fields: { segment: { values: { a: 1 } } } } } } as unknown as WidgetSpec, "fr-FR") as WidgetSpec;
    expect(sneaky.fields?.segment?.values).toBeUndefined();
  });

  test("the chart writes the French word, while its data and its clicks keep the value itself", async () => {
    const target = document.body.appendChild(document.createElement("div"));
    const widget = createWidget(target, spec);
    await widget.ready;
    const text = target.textContent ?? "";
    expect([text.includes("Clientèle aisée"), text.includes("Entreprises"), /Affluent/.test(text.replace(/data-[^ ]+/g, ""))]).toEqual([true, true, false]);
    expect(widget.spec.data).toEqual(spec.data);
  });

  test("a board's filter writes its values in French, and the filter and the address keep the data's own", async () => {
    const target = document.body.appendChild(document.createElement("div"));
    const board: DashboardSpec = {
      id: "b",
      title: "B",
      columns: 1,
      filters: [{ field: "segment", label: "Segment" }],
      widgets: [{ spec: { ...spec, locale: undefined } as WidgetSpec }],
      i18n: { fr: { filters: [{ values: { Affluent: "Clientèle aisée", Corporate: "Entreprises" } }] } },
    } as DashboardSpec;
    const dash = createDashboard(target, board, { locale: "fr-FR" });
    await dash.ready;
    const select = target.querySelector(".fft-filter select") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(["Tous", "Clientèle aisée", "Entreprises"]);
    await dash.setFilter("segment", "Affluent");
    // The control shows the word, and the chart under it is filtered on the value itself: one row left, in French.
    const chosen = select.options[select.selectedIndex]?.textContent;
    const card = target.querySelector(".fft-widget")?.textContent ?? "";
    expect([chosen, card.includes("Clientèle aisée"), card.includes("Entreprises")]).toEqual(["Clientèle aisée", true, false]);
  });

  test("the shipped widgets carry words for the values they draw, and only for words, never names", () => {
    const files = readdirSync("widgets", { recursive: true }).map(String).filter((f) => f.endsWith(".json"));
    let fields = 0;
    for (const file of files) {
      const w = JSON.parse(readFileSync(`widgets/${file}`, "utf8")) as { i18n?: Record<string, { fields?: Record<string, { values?: Record<string, string> }> }> };
      for (const lang of ["fr", "de"]) {
        for (const [field, entry] of Object.entries(w.i18n?.[lang]?.fields ?? {})) {
          if (!entry.values) continue;
          fields++;
          expect([file, field, /^(name|client|rm|owner|id)$/.test(field)]).toEqual([file, field, false]);
          for (const [value, word] of Object.entries(entry.values)) expect([file, value, word]).toEqual([file, value, valueWords(value)?.[lang === "fr" ? 0 : 1]]);
        }
      }
    }
    expect(fields).toBeGreaterThan(100);
  });
});

test("the Editor's sample tables are named in the site's language", async () => {
  const { readFileSync } = await import("node:fs");
  const code = readFileSync("demo/editor.ts", "utf8");
  for (const name of ["Tickets par équipe", "Tickets nach Team", "Ventes par région et produit", "Umsatz nach Region und Produkt"]) expect(code).toContain(name);
  expect(code).toMatch(/samples: sampleList\(siteLocale\(\)\)/);
});
