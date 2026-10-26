// @vitest-environment jsdom
// The language audit's leftovers: sentences the data scripts write, the German board names, figures that must fit a
// phone tile, the Composer's examples, and ref results in the page's language.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { FIND_JS } from "../scripts/find.ts";
import { buildRefIndex } from "../scripts/refs.ts";
import { sentenceWords } from "../scripts/value-words.ts";
import type { WidgetSpec } from "./core/types.ts";
import { BASE_CSS } from "./dom/styles.ts";
import { createComposer, kindWord } from "./dom/composer.ts";
import "./dom/views/index.ts";

const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));

describe("sentences the data scripts write", () => {
  test("read whole in French and German, clause by clause, with French spacing", () => {
    expect(sentenceWords("No contact in 153 days; At risk of leaving")).toEqual(["Aucun contact depuis 153 jours ; Risque de départ", "Seit 153 Tagen kein Kontakt; Abwanderungsgefahr"]);
    expect(sentenceWords("Hold the annual review, 31 days overdue")).toEqual(["Tenir la revue annuelle, en retard de 31 jours", "Jahresgespräch führen, 31 Tage überfällig"]);
    expect(sentenceWords("Check the flagged activity, then propose Custody")?.[1]).toBe("Gemeldete Aktivität prüfen, dann anbieten: Verwahrung");
    expect(sentenceWords("Finance and risk")).toEqual(["Finance et risques", "Finanzen und Risiko"]);
  });

  test("a person's name, or a sentence with a clause that has no rule, gets no words, so nothing shows half-translated", () => {
    expect(sentenceWords("Inés Ferreira")).toBeUndefined();
    expect(sentenceWords("No contact in 12 days; Something new")).toBeUndefined();
  });

  test("the cards that show them carry the words, and their data and English stay as they were", () => {
    const actions = json("widgets/health/health-actions.json");
    expect(actions.i18n.fr.fields.action.values["Hold the annual review, 31 days overdue"]).toBe("Tenir la revue annuelle, en retard de 31 jours");
    expect(actions.i18n.de.fields.owner.values["KYC team"]).toBe("KYC-Team");
    expect(actions.fields.action.values).toBeUndefined();
    const calls = json("widgets/commercial/cc-call-list.json");
    const reasons = Object.keys(calls.i18n.fr.fields.callReason.values);
    expect(reasons.length).toBeGreaterThanOrEqual(10);
    expect(Object.values(calls.i18n.fr.fields.callReason.values as Record<string, string>).every((word) => !/\b(days|risk|flagged)\b/.test(word))).toBe(true);
    expect(Object.keys(json("widgets/regulatory/reg-next-90.json").i18n.de.fields.owner.values)).toContain("Conduct and compliance");
  });
});

test("German names Sales and Commercial apart: two boards, two words", () => {
  const site = readFileSync("public/site-look.js", "utf8");
  const sales = /\bSales: \["[^"]*", "([^"]*)"\]/.exec(site)?.[1];
  const commercial = /\bCommercial: \["[^"]*", "([^"]*)"\]/.exec(site)?.[1];
  expect([sales, commercial]).toEqual(["Vertrieb", "Kundengeschäft"]);
  expect(json("dashboards/commercial-cockpit.json").i18n.de.title).toBe("Kundengeschäft-Cockpit");
});

test("a tile's figure shrinks with its tile, so a long German figure never crosses into the next one", () => {
  expect(BASE_CSS).toMatch(/\.fft-stat \{ container-type: inline-size; \}/);
  expect(BASE_CSS).toMatch(/\.fft-stat-value \{ font-size: min\(var\(--fft-fs-xl\), 16cqi\); \}/);
  // At 16cqi, a 130px tile draws its figure at about 21px: "10,5 Mio. €" (11 characters) is then about 125px wide.
  expect(130 * 0.16 * 11 * 0.55).toBeLessThan(130);
});

describe("the Composer's examples in the composer's language", () => {
  const spec: WidgetSpec = {
    id: "revenue-kpi",
    title: "Revenue",
    data: { type: "inline", rows: [{ month: "2026-09", revenue: 1 }] },
    view: { type: "bar", x: "month", y: "revenue" },
    i18n: { fr: { title: "Chiffre d'affaires" }, de: { title: "Umsatz" } },
  } as WidgetSpec;

  test("names from the spec's own words and the type in a word, and names wrap rather than being cut", () => {
    const target = document.createElement("div");
    document.body.replaceChildren(target);
    const composer = createComposer(target, { hash: false, locale: "de-DE", examples: { Revenue: spec } });
    const item = target.querySelector(".fft-cmp-item") as HTMLElement;
    expect([item.querySelector(".fft-cmp-name")?.textContent, item.querySelector(".fft-cmp-kind")?.textContent]).toEqual(["Umsatz", "Balken"]);
    composer.destroy?.();
    expect([kindWord("kpi", "fr-FR"), kindWord("bar", "en-US"), kindWord("sankey", "de-DE")]).toEqual(["chiffre", "bar", "sankey"]);
    expect(readFileSync("src/dom/composer.ts", "utf8")).toMatch(/\.fft-cmp-name \{ flex: 1; min-width: 0; overflow-wrap: break-word; white-space: normal; \}/);
  });
});

describe("ref results in the page's language", () => {
  test("the index carries each chart's French and German title, and a board's section names", () => {
    const index = buildRefIndex();
    const home = index.find((entry) => entry.place === "home" && entry.titles?.fr);
    expect(home?.titles?.de).toBeTruthy();
    expect(index.some((entry) => entry.board && entry.sections?.fr && entry.sections?.de)).toBe(true);
  });

  test("a result reads its title and where it sits in French on a French page", () => {
    type Find = { refItems: (result: unknown, base: string, onHere: (hash: string) => void) => HTMLElement[] };
    document.documentElement.lang = "fr";
    const find = new Function(`${FIND_JS}; return { refItems };`)() as Find;
    const [item] = find.refItems(
      { ref: "W-ABCD", found: [{ ref: "W-ABCD", title: "Campaigns this year", titles: { fr: "Campagnes de l'année" }, where: "Dashboards › Commercial cockpit › Campaigns", section: "Campaigns", sections: { fr: "Campagnes" }, url: "dashboards.html" }] },
      "../",
      () => {},
    );
    expect(item?.querySelector("a")?.textContent).toBe("Campagnes de l'année, Dashboards › Commercial cockpit › Campagnes");
    document.documentElement.lang = "en";
  });
});
