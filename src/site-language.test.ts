// @vitest-environment jsdom
/**
 * The site's language: English, French or German, picked in the Look menu, kept like the look and carried in the
 * address (?lang=fr), which wins. Charts, dashboards and the site's own words (menu, page heads, buttons) follow it.
 */
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { DashboardSpec } from "./core/dashboard.ts";
import type { WidgetSpec } from "./core/types.ts";
import { wordsFor } from "./core/words.ts";
import { createLocalFetch } from "./mcp/store.ts";
import { asOfText, createDashboard } from "./dom/dashboard.ts";
import { defineWidgetElement } from "./dom/element.ts";
import type { FftWidgetElement } from "./dom/element.ts";
import { embedLocale } from "./dom/embed.ts";
import "./dom/views/index.ts";

defineWidgetElement();

const SCRIPT = readFileSync("public/site-look.js", "utf8");
/** Runs the site's look script as a page would, at an address. */
function loadSiteLook(address: string) {
  history.replaceState(null, "", address);
  delete (window as { siteLook?: unknown }).siteLook;
  new Function(SCRIPT)();
  return window.siteLook as unknown as { get(): { lang?: string }; set(patch: Record<string, string>): { lang?: string }; locale(): string | undefined };
}
/** Spaces as one plain space: French writes figures with narrow and non-breaking spaces. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/[\s  ]+/g, " ");

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});
afterEach(() => {
  history.replaceState(null, "", "/");
});

describe("the site's language choice", () => {
  test("the address wins and is kept; the choice persists for the next page; English leaves the address clean", () => {
    let look = loadSiteLook("/dashboards.html?board=sales&lang=fr");
    expect([look.get().lang, look.locale(), localStorage.getItem("martcharts:lang")]).toEqual(["fr", "fr-FR", "fr"]);
    // The next page, with no language in its address, keeps French and writes it in, so its link shares it.
    look = loadSiteLook("/catalog/index.html");
    expect([look.get().lang, new URL(location.href).searchParams.get("lang")]).toEqual(["fr", "fr"]);
    // A link in German wins over the French kept before.
    look = loadSiteLook("/index.html?lang=de");
    expect([look.get().lang, look.locale()]).toEqual(["de", "de-DE"]);
    look.set({ lang: "en" });
    expect([look.get().lang, look.locale(), location.search]).toEqual(["en", undefined, ""]);
  });

  test("an unknown language in the address is ignored, and the theme and style are untouched by a language", () => {
    const look = loadSiteLook("/index.html?lang=xx");
    expect(look.get().lang).toBe("en");
    look.set({ preset: "paper" });
    look.set({ lang: "fr" });
    expect(look.get()).toMatchObject({ preset: "paper", lang: "fr" });
  });

  test("<fft-widget> tags take the language as a locale attribute, and the lite pages bring in the French and German reading", () => {
    document.head.innerHTML = '<script src="../dist/martcharts-lite.iife.js"></script>';
    document.body.innerHTML = '<fft-widget src="bar.json"></fft-widget>';
    const look = loadSiteLook("/catalog/index.html?lang=de");
    expect(document.querySelector("fft-widget")?.getAttribute("locale")).toBe("de-DE");
    expect(document.querySelector("script[data-site-reading]")?.getAttribute("src")).toBe("../dist/martcharts-reading.iife.js");
    look.set({ lang: "en" });
    expect(document.querySelector("fft-widget")?.hasAttribute("locale")).toBe(false);
  });

  test("the Look menu on every page offers English, Français and Deutsch", () => {
    for (const page of ["index.html", "dashboards.html", "editor.html", "composer.html", "lab.html", "catalog/index.html", "catalog/guide.html", "examples/drop-in.html"]) {
      const html = readFileSync(page, "utf8");
      expect([page, /data-look-key="lang"><span class="site-look-label" aria-hidden="true">Language<\/span><button type="button" data-look-value="en"[^>]*>English<\/button><button type="button" data-look-value="fr"[^>]*>Français<\/button><button type="button" data-look-value="de"[^>]*>Deutsch<\/button>/.test(html)]).toEqual([page, true]);
    }
  });

  test("a frame on another site takes its language from its address", () => {
    expect([embedLocale(new URLSearchParams("lang=fr")), embedLocale(new URLSearchParams("lang=DE")), embedLocale(new URLSearchParams("locale=fr-LU")), embedLocale(new URLSearchParams("lang=en"))]).toEqual(["fr-FR", "de-DE", "fr-LU", undefined]);
  });
});

describe("charts and boards in the chosen language", () => {
  const widgets: Record<string, WidgetSpec> = {};
  for (const file of readdirSync("widgets", { recursive: true }).map(String).filter((f) => f.endsWith(".json"))) {
    const spec = JSON.parse(readFileSync(`widgets/${file}`, "utf8")) as WidgetSpec;
    if (spec.id) widgets[spec.id] = spec;
  }

  test("an <fft-widget locale> draws its figures in that language, and removing it restores the spec's", async () => {
    const spec = { data: { type: "inline", rows: [{ v: 1284000 }] }, fields: { v: { format: { type: "currency", currency: "EUR" } } }, view: { type: "table" } };
    document.body.innerHTML = `<fft-widget locale="fr-FR" spec='${JSON.stringify(spec)}'></fft-widget>`;
    const el = document.querySelector("fft-widget") as FftWidgetElement;
    await vi.waitFor(() => expect(plain(el.querySelector("td")?.textContent)).toBe("1 284 000,00 €"));
    el.removeAttribute("locale");
    await vi.waitFor(() => expect(el.querySelector("td")?.textContent).toBe("€1,284,000.00"));
  });

  test("a board in French draws every card in fr-FR from the first draw, and says its own words and date in French", async () => {
    const target = document.createElement("div");
    document.body.append(target);
    const board = { asOf: "Data to September 2026", widgets: [{ widget: "monthly-revenue" }] } as unknown as DashboardSpec;
    const dash = createDashboard(target, board, { widgets, fetch: createLocalFetch("public"), locale: "fr-FR" });
    await dash.ready;
    const text = plain(target.textContent);
    expect(text).toContain("1 284 000 €");
    expect(text).not.toContain("€1,284,000");
    expect(target.querySelector(".fft-board-share")?.textContent).toBe(wordsFor("fr").board.share);
    expect(target.querySelector(".fft-dashboard-asof")?.textContent).toBe("Données à fin septembre 2026");
    expect(target.querySelector(".fft-dashboard")?.getAttribute("lang")).toBe("fr-FR");
    dash.destroy();
  });

  test("the site's as-of line is said in the board's language; English keeps the authored words", () => {
    expect([
      asOfText("Data to October 2026", "", "fr-FR"),
      asOfText("Data to {latest}", "2026-10", "de-DE"),
      asOfText("Data to October 2026", "", "en-US"),
    ]).toEqual(["Données à fin octobre 2026", "Daten bis Oktober 2026", "Data to October 2026"]);
  });

  test.each(["fr-FR", "de-DE"])("no English board words are left in the four worked boards in %s, filtered, clicked or empty", async (locale) => {
    // Every plain English phrase the board writes itself (functions aside): none may show in French or German.
    // A phrase spelled the same in both languages ("Sections") is no leftover.
    const en = wordsFor("en");
    const local = wordsFor(locale);
    const groups = ["board", "boardA11y", "boardChrome"] as const;
    const phrases = groups.flatMap((group) =>
      Object.entries(en[group] as Record<string, unknown>)
        .filter(([key, value]) => typeof value === "string" && value.length > 3 && value !== (local[group] as Record<string, unknown>)[key])
        .map(([, value]) => value as string),
    );
    expect(phrases).toEqual(expect.arrayContaining(["Share", "Print", "Filters"]));
    const found: string[] = [];
    for (const name of ["gallery", "commercial-cockpit", "client-health", "regulatory-landscape"]) {
      document.body.innerHTML = "";
      const target = document.createElement("div");
      document.body.append(target);
      const board = JSON.parse(readFileSync(`dashboards/${name}.json`, "utf8")) as DashboardSpec;
      const dash = createDashboard(target, board, { widgets, fetch: createLocalFetch("public"), locale, sticky: true });
      await dash.ready;
      const fields = board.filters?.map((filter) => filter.field) ?? [];
      if (fields[0]) await dash.setFilter(fields[0], "No such value");
      await new Promise((resolve) => setTimeout(resolve, 50));
      // The board's own words: its chrome, with every card's authored content (titles, notes, figures) left out.
      const chrome = target.cloneNode(true) as HTMLElement;
      for (const card of chrome.querySelectorAll(".fft-widget")) card.remove();
      const said = `${chrome.textContent} ${[...chrome.querySelectorAll("[aria-label],[title]")].map((node) => `${node.getAttribute("aria-label")} ${node.getAttribute("title")}`).join(" ")}`;
      // A word the board's author wrote (a filter named "Region", a section called "Coverage") is content, not chrome.
      const authored = JSON.stringify(board);
      for (const phrase of phrases) if (said.includes(phrase) && !authored.includes(phrase)) found.push(`${name}: ${phrase}`);
      dash.destroy();
    }
    expect(found).toEqual([]);
  }, 120_000);
});
