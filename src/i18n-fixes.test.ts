// @vitest-environment jsdom
/**
 * The regression audit's language leftovers: the click chip, French articles and plurals, buttons and Details in the
 * card's language, field names with no label, the comparison words on the headline tiles, the card menu and the
 * Embed page's own examples.
 *
 * @module
 */
import { readdirSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, test } from "vitest";
import type { DashboardSpec } from "./core/dashboard.ts";
import { localizeSpec } from "./core/i18n.ts";
import type { WidgetSpec } from "./core/types.ts";
import { validateSpec } from "./core/validate.ts";
import { frArticle, wordsFor } from "./core/words.ts";
import { createLocalFetch } from "./mcp/store.ts";
import { createDashboard } from "./dom/dashboard.ts";
import { createWidget } from "./dom/widget.ts";
import "./dom/views/index.ts";
import "./core/explain-words.ts";

const widgets: Record<string, WidgetSpec> = {};
for (const file of readdirSync("widgets", { recursive: true }).map(String).filter((f) => f.endsWith(".json"))) {
  const spec = JSON.parse(readFileSync(`widgets/${file}`, "utf8")) as WidgetSpec;
  if (spec.id) widgets[spec.id] = spec;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("French articles and plurals", () => {
  test("a reference reads with its article: du budget, de l'objectif, de la moyenne; a figure or a name keeps a bare de", () => {
    expect([frArticle("Budget", "de"), frArticle("objectif", "de"), frArticle("moyenne", "de"), frArticle("1,2 M €", "de"), frArticle("Plan B", "de")]).toEqual([
      "du budget",
      "de l'objectif",
      "de la moyenne",
      "de 1,2 M €",
      "de Plan B",
    ]);
    expect([frArticle("budget", "le"), frArticle("objectif", "le"), frArticle("moyenne", "le")]).toEqual(["le budget", "l'objectif", "la moyenne"]);
    const fr = wordsFor("fr-FR");
    expect([fr.awayFrom("12 k €", false, "Budget"), fr.aboveRising("objectif"), fr.belowHanging("moyenne")]).toEqual([
      "12 k € en dessous du budget",
      "Au-dessus de l'objectif, vers le haut",
      "Sous la moyenne, vers le bas",
    ]);
  });

  test("one row is singular in French: 1 ligne affichée sur 1", () => {
    const fr = wordsFor("fr-FR");
    expect([fr.table.showing("1", "1"), fr.table.showing("12", "40"), fr.table.rowsShown("1", "3"), fr.table.rowsShown("2", "3")]).toEqual([
      "1 ligne affichée sur 1",
      "12 lignes affichées sur 40",
      "1 ligne sur 3",
      "2 lignes sur 3",
    ]);
  });
});

describe("the card in its language", () => {
  const spec: WidgetSpec = {
    title: "Revenue by region",
    data: { type: "inline", rows: [{ region: "North", revenue: 10 }, { region: "South", revenue: 20 }] },
    view: { type: "table" },
  };

  test("a language set after the first draw renames the toolbar's buttons, as a page's language switch does", async () => {
    const widget = createWidget(document.body.appendChild(document.createElement("div")), { ...spec, locale: "en-US" }, { actions: ["csv", "image"] });
    await widget.ready;
    const labels = () => [...document.querySelectorAll(".fft-action")].map((b) => b.getAttribute("aria-label"));
    const english = labels();
    await widget.setSpec({ ...spec, locale: "fr-FR" });
    expect([english[0], labels()[0]]).toEqual([wordsFor("en-US").widget.actions.csv, wordsFor("fr-FR").widget.actions.csv]);
  });

  test("a field with no label of the author's reads in the card's language: the table's header says Région", async () => {
    const widget = createWidget(document.body.appendChild(document.createElement("div")), { ...spec, locale: "fr-FR" });
    await widget.ready;
    const heads = [...document.querySelectorAll("th")].map((th) => th.textContent?.trim() ?? "");
    expect(heads.some((h) => h.startsWith("Région"))).toBe(true);
    expect(heads.some((h) => /^Region\b/.test(h))).toBe(false);
  });

  test("the Details panel names the chart type in the card's language", async () => {
    const widget = createWidget(document.body.appendChild(document.createElement("div")), { ...spec, view: { type: "bar", x: "region", y: "revenue" }, locale: "fr-FR" });
    await widget.ready;
    widget.showDetails(true);
    const back = document.querySelector(".fft-back-list")?.textContent ?? "";
    expect(back).toMatch(/bar\s*:/);
    expect(back).not.toMatch(/Vertical bars comparing/);
  });
});

describe("the click chip", () => {
  test("names the field as the board's filter does, in French with a narrow space before the colon: Région : Nord", async () => {
    const board = JSON.parse(readFileSync("dashboards/gallery.json", "utf8")) as DashboardSpec;
    const target = document.body.appendChild(document.createElement("div"));
    const dash = createDashboard(target, board, { widgets, fetch: createLocalFetch("public"), locale: "fr-FR" });
    await dash.ready;
    await dash.setCrossFilter("region", "North");
    expect(target.querySelector(".fft-crossfilter-text")?.textContent).toBe("Région : Nord");
  });
});

describe("words the site ships", () => {
  test("the headline tiles compare in the card's language, never a hard-coded English vs Aug", () => {
    for (const id of ["monthly-revenue", "gross-profit"]) {
      const spec = widgets[id] as WidgetSpec;
      const fr = localizeSpec({ ...spec, locale: "fr-FR" }, "fr-FR") as WidgetSpec & { headline?: { compareLabel?: string } };
      const de = localizeSpec({ ...spec, locale: "de-DE" }, "de-DE") as WidgetSpec & { headline?: { compareLabel?: string } };
      expect([id, fr.headline?.compareLabel, de.headline?.compareLabel]).toEqual([id, "vs août", "ggü. Aug."]);
    }
  });

  test("the card menu's Edit in editor follows the site's language", () => {
    const code = readFileSync("demo/dashboards.ts", "utf8");
    expect(code).toContain("Modifier dans l'éditeur");
    expect(code).toContain("Im Editor bearbeiten");
    expect(code).toMatch(/addAction\(editWords\(siteLocale\(\)\)/);
  });

  test("the Embed page's own examples carry French and German, and stay valid specs", () => {
    const html = readFileSync("examples/drop-in.html", "utf8");
    const specs = [...html.matchAll(/<script type="application\/json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1] as string) as WidgetSpec & { i18n?: Record<string, unknown> });
    expect(specs.length).toBeGreaterThan(1);
    for (const spec of specs) {
      expect([spec.title, Boolean(spec.i18n?.fr && spec.i18n?.de)]).toEqual([spec.title, true]);
      expect(validateSpec(spec).filter((issue) => issue.level === "error")).toEqual([]);
    }
    const signups = specs[0] as WidgetSpec;
    expect(localizeSpec(signups, "fr-FR").subtitle).toBe("30 derniers jours");
    expect(readFileSync("examples/drop-in.js", "utf8")).toContain("Requêtes par minute");
  });
});
