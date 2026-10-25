import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { entityNoun } from "./explain-words.ts";
import { explainChart } from "./explain.ts";
import { questionOf } from "./question.ts";
import type { Row, WidgetSpec } from "./types.ts";
import "./views.ts";

const catalog = (type: string) => JSON.parse(readFileSync(`catalog/${type}.json`, "utf8")) as WidgetSpec;
const rowsOf = (spec: WidgetSpec) => spec.data.rows as Row[];
/** French and German figures carry no-break spaces ("70 %", "1 284 000 €"): compared as plain spaces. */
const plain = (text: string) => text.replace(/[  ]/g, " ");
const read = (type: string, locale?: string) => {
  const spec = catalog(type);
  const local = locale ? { ...spec, locale } : spec;
  return { explain: plain(explainChart(local, rowsOf(spec))), question: plain(questionOf(local, rowsOf(spec)).text) };
};

describe("the English slips the audit found stay fixed", () => {
  test("matrix: the columns are stakeholders, not the flag's label, and the sentence reads as a duty", () => {
    const { explain, question } = read("matrix");
    expect(question).toBe("Which stakeholders must comply with each regulation?");
    expect(explain).toContain("Each row is one regulation and each column one stakeholder;");
    expect(explain).toContain("Here, all 5 stakeholders must comply with DORA, more than with any other of the regulations.");
    expect(explain).not.toMatch(/must complies/);
  });

  test("lifecycle: one regulation per row, no doubled word, and the date reads as a date", () => {
    const { explain, question } = read("lifecycle");
    expect(question).toBe("Where does each regulation stand, from proposed to applies?");
    expect(explain).toMatch(/^Each row is one regulation, read left to right in time\./);
    expect(explain).toContain("AMLR moved last, to applies on Jul 10, 2027.");
    expect(explain).not.toMatch(/\bentry\b|\d{4}-\d{2}-\d{2}/);
  });

  test("xray: the flags are pills, never a color", () => {
    const { explain, question } = read("xray");
    expect(explain).toMatch(/^This card is one client, top to bottom:/);
    expect(explain).toContain("the pills are things to watch");
    expect(explain).not.toMatch(/amber/i);
    expect(question).toBe("How does this client stand right now, and what should we do next?");
  });

  test("anomalies: day by day, every measure counted honestly, and a figure always beside what was expected", () => {
    const { explain } = read("anomalies");
    expect(explain).toContain("Each thin lane is one measure, day by day.");
    expect(explain).toContain("Here, every one of the 6 measures stepped out once; the latest was Complaints on Oct 21, 2026, reading 11 against 6 expected.");
    expect(explain).not.toMatch(/along date|stepped out most/);
  });

  test("a field called name reads as its label or the card's own noun, and only failing both as an entry", () => {
    expect(read("strips").explain).toMatch(/^Each row is one regulation,/);
    expect(read("history").explain).toMatch(/^Each dot is one event for the client,/);
    const spec = (title: string, label?: string) => ({ title, data: { type: "inline", rows: [] }, view: { type: "list", label: "name" }, ...(label ? { fields: { name: { label } } } : {}) }) as WidgetSpec;
    expect(entityNoun("name", spec("Where each regulation stands"))).toBe("regulation");
    expect(entityNoun("name", spec("Revenue by customer"))).toBe("customer");
    expect(entityNoun("name", spec("Top clients"))).toBe("client");
    expect(entityNoun("name", spec("Anything", "Supplier"))).toBe("supplier");
    expect(entityNoun("name", spec("Notes so far"))).toBe("entry");
  });
});

/** Ten views, read in full in French and in German. */
const GOLDEN: Record<string, { fr: [string, string]; de: [string, string] }> = {
  bar: {
    fr: [
      "Quelle est la répartition entre Core et Plus, par région ?",
      "Une barre par région, découpée en parts colorées pour Core et Plus. Chaque barre fait 100 % : comparez la taille des parts. Ici, la plus grande part revient à Core pour South, avec 70 %.",
    ],
    de: [
      "Wie ist die Aufteilung zwischen Core und Plus je Region?",
      "Ein Balken je Region, aufgeteilt in farbige Teile für Core und Plus. Jeder Balken ergibt 100 %, vergleichen Sie also die Größe der Teile. Hier ist Core bei South der größte Anteil, mit 70 %.",
    ],
  },
  hbar: {
    fr: ["Quel est le classement par feature, selon accounts using it ?", "Une ligne par feature. Plus le point est à droite, plus la valeur d'accounts using it est élevée. Ici, Dashboards arrive en tête, avec 91 %."],
    de: ["Wie sieht die Rangfolge je Feature bei Accounts using it aus?", "Eine Zeile je Feature. Je weiter rechts der Punkt, desto höher der Wert für Accounts using it. Hier liegt Dashboards vorn, mit 91 %."],
  },
  donut: {
    fr: ["Comment se répartit revenue, par segment ?", "L'anneau représente le tout. Un arc par segment : plus il est grand, plus sa part de revenue est importante. Ici, Enterprise représente la plus grande part, avec 55 % du total."],
    de: ["Wie verteilt sich Revenue je Segment?", "Der Ring ist das Ganze. Ein Abschnitt je Segment: Je größer er ist, desto größer sein Anteil an Revenue. Hier hat Enterprise den größten Anteil, mit 55 % des Ganzen."],
  },
  line: {
    fr: [
      "L'objectif est-il atteint pour revenue, mois par mois ?",
      "La courbe montre l'évolution de chaque valeur, mois par mois : plus elle monte, plus la valeur est élevée. Chaque couleur correspond à une courbe : revenue ou cost. La ligne pointillée représente target. Ici, revenue évolue de 820 000 € (oct. 2025) à 1 284 000 € (sept. 2026).",
    ],
    de: [
      "Wird das Ziel für Revenue Monat für Monat erreicht?",
      "Die Linie zeigt, wie sich jeder Wert Monat für Monat entwickelt: Je höher, desto mehr. Jede Farbe ist eine Linie: Revenue oder Cost. Die gestrichelte Linie ist Target. Hier entwickelt sich Revenue von 820.000 € (Okt. 2025) auf 1.284.000 € (Sept. 2026).",
    ],
  },
  scatter: {
    fr: [
      "Y a-t-il un lien entre revenue growth et gross margin ?",
      "Un point par compte : vers la droite, revenue growth augmente ; vers le haut, gross margin augmente. Plus le point est gros, plus la valeur de revenue est élevée. Ici, revenue growth et gross margin tendent à augmenter ensemble, sans que ce soit systématique. Ironwood Labs se situe le plus haut.",
    ],
    de: [
      "Hängen Revenue growth und Gross margin zusammen?",
      "Ein Punkt je Konto: Nach rechts steigt Revenue growth, nach oben steigt Gross margin. Je größer der Punkt, desto höher der Wert für Revenue. Hier steigen Revenue growth und Gross margin tendenziell gemeinsam, aber nicht immer. Ironwood Labs liegt am höchsten.",
    ],
  },
  kpis: {
    fr: [
      "Où en sont les chiffres clés aujourd'hui ?",
      "Chaque tuile est un chiffre clé, avec une petite flèche qui indique s'il a progressé ou reculé depuis la dernière fois. Une ligne sous une tuile indique si son objectif est atteint. Ici, tous les chiffres ont évolué dans le bon sens depuis la dernière fois. Revenue se situe au-dessus de son objectif de 1,2 M €.",
    ],
    de: [
      "Wo stehen die Kennzahlen aktuell?",
      "Jede Kachel ist eine Kennzahl, mit einem kleinen Pfeil, der zeigt, ob sie seit dem letzten Mal gestiegen oder gefallen ist. Eine Linie unter einer Kachel zeigt, ob ihr Ziel erreicht ist. Hier haben sich alle Kennzahlen seit dem letzten Mal in die richtige Richtung bewegt. Revenue liegt über dem Ziel von 1,2 Mio. €.",
    ],
  },
  ragboard: {
    fr: [
      "Qui est hors trajectoire ou à surveiller, sur quels critères, et par où commencer ?",
      "Une ligne par client, une colonne par critère : client success, business development, coverage et relationship. Un cercle signifie conforme, un triangle à surveiller, un carré hors trajectoire ; les lignes les plus critiques viennent en premier. La colonne Global, en tête, donne le statut le plus défavorable de chaque ligne. Une flèche signale une amélioration ou une dégradation par rapport à la période précédente. Ici, 4 sur 10 sont hors trajectoire et 4 autres à surveiller ; Aldana Holdings est le plus critique.",
    ],
    de: [
      "Wer ist „Nicht im Plan“ oder „Gefährdet“, bei welchen Kriterien, und wo zuerst handeln?",
      "Eine Zeile je Client, eine Spalte je Kriterium: Client success, Business development, Coverage und Relationship. Ein Kreis bedeutet „Im Plan“, ein Dreieck „Gefährdet“, ein Quadrat „Nicht im Plan“; die kritischsten Zeilen stehen oben. Die Spalte Gesamt vorne zeigt den schlechtesten Status jeder Zeile. Ein Pfeil zeigt eine Verbesserung oder Verschlechterung gegenüber der Vorperiode. Hier sind 4 von 10 „Nicht im Plan“ und weitere 4 „Gefährdet“; Aldana Holdings steht am schlechtesten.",
    ],
  },
  lifecycle: {
    fr: [
      "Où en est chaque regulation, de proposed à applies ?",
      "Une ligne par regulation, à lire de gauche à droite dans le temps. Chaque segment coloré est une étape, proposed, adopted, in force et applies dans l'ordre, de plus en plus intense ; un trait marque le début de chacune, et un segment pâle est une étape en cours. Le trait vertical marque aujourd'hui, le mot en fin de ligne est status, une ligne plus épaisse signale une valeur d'impact plus élevée. Ici, 9 sur 12 ont atteint l'étape applies. AMLR a avancé en dernier, à l'étape applies le 10 juil. 2027.",
    ],
    de: [
      "Wo steht es je Regulation, von Proposed bis Applies?",
      "Eine Zeile je Regulation, von links nach rechts in der Zeit gelesen. Jeder farbige Abschnitt ist eine Phase, der Reihe nach Proposed, Adopted, In force und Applies, zunehmend kräftiger; ein Strich markiert den Beginn jeder Phase, ein blasser Abschnitt eine laufende Phase. Die senkrechte Linie ist heute, das Wort am Zeilenende ist Status, eine dickere Zeile bedeutet einen höheren Wert für Impact. Hier haben 9 von 12 die Phase Applies erreicht. Zuletzt ist AMLR vorangekommen, in die Phase Applies am 10.07.2027.",
    ],
  },
  waterfall: {
    fr: [
      "Qu'est-ce qui explique le passage du total de départ au total final ?",
      "Partez de la première barre. Chaque barre suivante monte pour ce qui s'ajoute et descend pour ce qui se retire, jusqu'au total final. Ici, on passe de 1,2 M € à 1,3 M € : New customers a le plus ajouté (142 k €) et Churn a le plus retiré (84 k €).",
    ],
    de: [
      "Was erklärt den Weg von der Anfangs- zur Endsumme?",
      "Beginnen Sie beim ersten Balken. Jeder weitere Balken steigt für Zuwächse und fällt für Abgänge, bis zur Endsumme. Hier geht es von 1,2 Mio. € auf 1,3 Mio. €: New customers hat am meisten beigetragen (142.000 €), Churn hat am meisten gekostet (84.000 €).",
    ],
  },
  choropleth: {
    fr: [
      "Comment se compare revenue, par country ?",
      "Une région de la carte par country. Plus sa teinte est intense, plus la valeur de revenue est élevée ; une région estompée n'a pas de données. Ici, Germany a la valeur la plus élevée, avec 4,1 M €, et Slovenia la plus faible, avec 80 k €.",
    ],
    de: [
      "Wie unterscheidet sich Revenue je Country?",
      "Eine Region der Karte je Country. Je kräftiger der Farbton, desto höher der Wert für Revenue; eine blasse Region hat keine Daten. Hier hat Germany den höchsten Wert, mit 4,1 Mio. €, und Slovenia den niedrigsten, mit 80.000 €.",
    ],
  },
};

describe("French and German, read in full", () => {
  test.each(Object.keys(GOLDEN))("%s in French", (type) => {
    const { explain, question } = read(type, "fr-FR");
    expect([question, explain]).toEqual(GOLDEN[type]?.fr);
  });

  test.each(Object.keys(GOLDEN))("%s in German", (type) => {
    const { explain, question } = read(type, "de-DE");
    expect([question, explain]).toEqual(GOLDEN[type]?.de);
  });

  test("a regional locale reads its language (fr-LU, de-CH), and anything else stays English", () => {
    expect(read("hbar", "fr-LU").explain).toMatch(/^Une ligne par feature\./);
    expect(read("hbar", "de-CH").explain).toMatch(/^Eine Zeile je Feature\./);
    expect(read("hbar", "es-ES").explain).toMatch(/^Each row is one feature\./);
  });
});
