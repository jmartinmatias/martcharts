// @vitest-environment jsdom
/**
 * Authored words in French and German: a spec's `i18n` laid over its own words when it is drawn in that language, the
 * worked widgets and boards written in all three languages, and the site's own words swapped by its language script.
 */
import { readdirSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, test } from "vitest";
import { checkI18n, i18nLanguage, localizeSpec } from "./core/i18n.ts";
import type { DashboardSpec } from "./core/dashboard.ts";
import { validateDashboard } from "./core/dashboard.ts";
import type { WidgetSpec } from "./core/types.ts";
import { validateSpec } from "./core/validate.ts";
import { createLocalFetch } from "./mcp/store.ts";
import { createDashboard } from "./dom/dashboard.ts";
import { createWidget } from "./dom/widget.ts";
import "./dom/views/index.ts";

const widgets: Record<string, WidgetSpec> = {};
const FILES = readdirSync("widgets", { recursive: true })
  .map(String)
  .filter((f) => f.endsWith(".json"))
  .map((file) => [file, JSON.parse(readFileSync(`widgets/${file}`, "utf8")) as WidgetSpec] as const);
for (const [, spec] of FILES) if (spec.id) widgets[spec.id] = spec;
const BOARDS = ["gallery", "commercial-cockpit", "client-health", "regulatory-landscape"];
const board = (name: string) => JSON.parse(readFileSync(`dashboards/${name}.json`, "utf8")) as DashboardSpec;

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("localizeSpec", () => {
  const spec = {
    title: "Revenue by region",
    subtitle: "September 2026",
    fields: { revenue: { label: "Revenue", format: { type: "currency", currency: "EUR" } } },
    view: { type: "bar", x: "region", y: "revenue", reference: [{ value: 1, label: "Target" }, { value: 2, label: "Average" }] },
    i18n: { fr: { title: "CA par région", fields: { revenue: { label: "Chiffre d'affaires" } }, view: { reference: [{}, { label: "Moyenne" }] } } },
  };

  test("lays a language's words over the spec's own, item by item in arrays, and keeps everything else and the i18n", () => {
    const fr = localizeSpec(spec, "fr-CH");
    expect(fr.title).toBe("CA par région");
    expect(fr.subtitle).toBe("September 2026");
    expect(fr.fields.revenue).toEqual({ label: "Chiffre d'affaires", format: { type: "currency", currency: "EUR" } });
    expect(fr.view.reference.map((r) => r.label)).toEqual(["Target", "Moyenne"]);
    expect(fr.view.x).toBe("region");
    expect(fr.i18n).toBe(spec.i18n);
  });

  test("leaves the spec as it is in a language it has no words for, and never adds a key it lacks", () => {
    expect(localizeSpec(spec, "de-DE")).toBe(spec);
    expect(localizeSpec(spec, undefined)).toBe(spec);
    const added = localizeSpec({ title: "T", i18n: { fr: { title: "T fr", note: "added" } } }, "fr-FR");
    expect(added).toEqual({ title: "T fr", i18n: { fr: { title: "T fr", note: "added" } } });
    expect([i18nLanguage("fr-FR"), i18nLanguage("de_CH"), i18nLanguage("es-ES"), i18nLanguage(undefined)]).toEqual(["fr", "de", undefined, undefined]);
  });

  test("i18n holds words only, in known languages, and validation says where it does not", () => {
    expect(checkI18n({ fr: { title: "Titre", view: { reference: [{ label: "Moyenne" }] } } })).toEqual([]);
    expect(checkI18n({ es: { title: "Título" } }).map((i) => i.path)).toEqual(["i18n.es"]);
    expect(checkI18n({ fr: { view: { height: 300 } } }).map((i) => i.path)).toEqual(["i18n.fr.view.height"]);
    expect(validateSpec({ ...spec, i18n: { fr: { title: 3 } } }).some((i) => i.level === "error" && i.path === "i18n.fr.title")).toBe(true);
    expect(validateDashboard({ widgets: [], i18n: { fr: [] } }).some((i) => i.path === "i18n.fr")).toBe(true);
  });
});

describe("a widget in another language", () => {
  test("draws its i18n words, while widget.spec (what Copy spec and exports hand out) keeps the spec as written, and its ref", async () => {
    const spec = { ...widgets["revenue-by-region"]!, locale: "fr-FR" } as WidgetSpec;
    const en = createWidget(document.body.appendChild(document.createElement("div")), { ...spec, locale: "en-US" }, { fetch: createLocalFetch("public") });
    const fr = createWidget(document.body.appendChild(document.createElement("div")), spec, { fetch: createLocalFetch("public") });
    await Promise.all([en.ready, fr.ready]);
    expect(fr.root.querySelector(".fft-title")?.textContent).toBe("CA par région");
    expect(fr.spec.title).toBe("Revenue by region");
    expect(fr.spec.i18n?.de).toBeDefined();
    expect(fr.root.querySelector(".fft-widget-ref")?.textContent).toBe(en.root.querySelector(".fft-widget-ref")?.textContent);
    await fr.update({ locale: "de-DE" });
    expect(fr.root.querySelector(".fft-title")?.textContent).toBe("Umsatz je Region");
  });
});

describe("the worked widgets and boards in French and German", () => {
  /** Words as read, a template counting as a date of three words, and French spacing before : and % no word. */
  const words = (text = "") => text.replace(/\{[^}]*\}/g, "X X X").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));

  test.each(FILES)("%s: a title and subtitle in each language, as short as the English rules ask", (_file, spec) => {
    for (const locale of ["fr-FR", "de-DE"]) {
      const said = localizeSpec(spec, locale);
      expect([locale, words(said.title).length <= 7, words(said.subtitle).length <= 14]).toEqual([locale, true, true]);
      expect([locale, (`${said.description} ${said.note ?? ""} ${said.source?.name}`.match(/fictional|fictif|fictive|fiktiv/gi) ?? []).length <= 1]).toEqual([locale, true]);
    }
  });

  test.each(FILES)("%s: its title and description are written in French and German", (_file, spec) => {
    for (const lang of ["fr", "de"] as const) {
      const words = spec.i18n?.[lang] as { title?: string; description?: string } | undefined;
      expect([lang, typeof words?.description, typeof (words?.title ?? (spec.title === "Net Promoter Score" ? spec.title : undefined))]).toEqual([lang, "string", "string"]);
    }
  });

  test.each(BOARDS)("%s validates with its i18n, and every section has a French and German name", (name) => {
    const spec = board(name);
    expect(validateDashboard(spec).filter((i) => i.level === "error")).toEqual([]);
    const sections = spec.widgets.filter((cell) => cell.section).length;
    for (const lang of ["fr", "de"] as const) {
      const shown = localizeSpec(spec, `${lang}-XX`).widgets.filter((cell) => cell.section);
      // A name spelled the same in the language (Adoption and Impact in French, Portfolio in German) is no leftover.
      const same = shown.filter((cell, i) => cell.section === spec.widgets.filter((c) => c.section)[i]?.section).map((cell) => cell.section);
      expect(same.filter((word) => !["Adoption", "Impact", "Portfolio"].includes(word ?? ""))).toEqual([]);
      expect(shown.length).toBe(sections);
    }
  });

  // English words a French or German title, subtitle or heading should never hold ("Clients" is French too, and
  // German says "Deals").
  const ENGLISH: Record<string, RegExp> = {
    "fr-FR": /\b(the|and|by|of|with|against|Revenue|Customers?|Deals?|month|year)\b/,
    "de-DE": /\b(the|and|by|of|with|against|Revenue|Clients?|Customers?|month|year)\b/,
  };

  test.each(["fr-FR", "de-DE"])("the four boards in %s: no English left in card titles, subtitles, section names or filters, and the same section ids", async (locale) => {
    const left: string[] = [];
    for (const name of BOARDS) {
      const spec = board(name);
      const ids: string[][] = [];
      for (const lang of [locale, "en-US"]) {
        document.body.innerHTML = "";
        const target = document.body.appendChild(document.createElement("div"));
        const dash = createDashboard(target, spec, { widgets, fetch: createLocalFetch("public"), locale: lang });
        await dash.ready;
        ids.push([...target.querySelectorAll(".fft-board-section")].map((s) => s.id));
        if (lang === locale) {
          const said = [...target.querySelectorAll(".fft-title, .fft-subtitle, .fft-board-section h3, .fft-board-section p, .fft-filter label, .fft-filter span")]
            .map((node) => (node.textContent ?? "").trim())
            .filter(Boolean);
          // Client names are data (Aldana Holdings), and so is a chart named after its own product line.
          for (const text of said) if (ENGLISH[locale]!.test(text.replace(/Aldana Holdings|Net Promoter Score/g, ""))) left.push(`${name}: ${text}`);
        }
        dash.destroy();
      }
      expect([name, ids[0]]).toEqual([name, ids[1]]);
    }
    expect(left).toEqual([]);
  }, 180_000);
});

describe("the site's own words", () => {
  const SCRIPT = readFileSync("public/site-look.js", "utf8");
  const load = (address: string) => {
    history.replaceState(null, "", address);
    delete (window as { siteLook?: unknown }).siteLook;
    new Function(SCRIPT)();
    return window.siteLook as unknown as { set(patch: Record<string, string>): unknown; t(text: string, ...values: unknown[]): string };
  };

  test("the menu, the Look menu and a page head follow the language, English comes back, and charts are left alone", () => {
    localStorage.clear();
    document.body.innerHTML =
      '<nav class="site-nav" aria-label="Pages"><a href="index.html" title="Every way to put a chart on a page">Embed</a><a>Dashboards</a></nav>' +
      '<div class="site-look-group" data-look-key="lang"><span>Language</span><button data-look-value="en">English</button></div>' +
      '<h1>Embed a chart</h1><input placeholder="Name or job, such as trend or map">' +
      '<fft-widget><span class="t">Dashboards</span></fft-widget>';
    document.title = "Embed · martcharts";
    const look = load("/examples/drop-in.html?lang=fr");
    const text = () => [...document.querySelectorAll(".site-nav a, .site-look-group *, h1")].map((n) => n.textContent);
    expect(text()).toEqual(["Intégrer", "Tableaux de bord", "Langue", "English", "Intégrer un graphique"]);
    expect([document.querySelector("input")?.getAttribute("placeholder"), document.querySelector("nav a")?.getAttribute("title"), document.querySelector("nav")?.getAttribute("aria-label")]).toEqual([
      "Nom ou usage, par exemple tendance ou carte",
      "Toutes les façons de mettre un graphique sur une page",
      "Pages",
    ]);
    expect([document.title, document.documentElement.lang, document.querySelector(".t")?.textContent]).toEqual(["Intégrer · martcharts", "fr", "Dashboards"]);
    look.set({ lang: "de" });
    expect(text()).toEqual(["Einbetten", "Dashboards", "Sprache", "English", "Ein Diagramm einbetten"]);
    look.set({ lang: "en" });
    expect(text()).toEqual(["Embed", "Dashboards", "Language", "English", "Embed a chart"]);
    expect(document.title).toBe("Embed · martcharts");
  });

  test("words the pages write themselves read in the language, with their values filled in", () => {
    const look = load("/catalog/index.html?lang=de");
    expect([look.t("{0} of {1}", 3, 57), look.t("Copied"), look.t("No chart matches “{0}”.", "xyz"), look.t("trend, share, date, W-Y606…"), look.t("Not a site word")]).toEqual([
      "3 von 57",
      "Kopiert",
      "Kein Diagramm passt zu „xyz“.",
      "Trend, Anteil, Datum, W-Y606…",
      "Not a site word",
    ]);
  });

  test("every word in the menu, the Look menu and the four board tabs has French and German", () => {
    const look = load("/index.html?lang=fr");
    const routes = readFileSync("demo/routes.ts", "utf8");
    const tabs = [...routes.matchAll(/title: "([^"]+)", intro: "([^"]+)"/g)].flatMap((m) => [m[1]!, m[2]!]);
    const nav = readFileSync("index.html", "utf8");
    const menu = [...nav.matchAll(/<a href="[^"]*"(?: aria-current="page")? title="([^"]+)">([^<]+)<\/a>/g)].flatMap((m) => [m[1]!, m[2]!]);
    const lookMenu = [...nav.matchAll(/data-look-value="(?:auto|light|dark|glass|default|airy|paper)"[^>]*>([^<]+)</g)].map((m) => m[1]!);
    const all = [...tabs, ...menu, ...lookMenu, "Look", "Theme", "Style", "Language"];
    expect(menu.length).toBeGreaterThanOrEqual(14);
    expect(lookMenu.length).toBe(7);
    expect(all.filter((word) => look.t(word) === word && !["Auto", "Pages", "Taller", "Spec", "Style"].includes(word))).toEqual([]);
  });
});
