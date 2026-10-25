/**
 * Shared words for the reading layers (`explainChart`, `questionOf`): what a row is called when its field says
 * nothing ("name"), and the French and German reading guides and questions.
 *
 * English stays in `explain.ts` and `question.ts`, where every view has its own careful sentences. French and German
 * are built here, per language, from the same facts: what each mark is, what more looks like, and one standout from
 * the data. They are written as a French or German analyst would write them, not translated word for word, and they
 * avoid what a foreign field name cannot carry: articles and adjectives that agree with a gender ("une barre par
 * région", "ein Balken je Region"). Numbers, shares and dates go through `Intl` in the spec's own locale.
 *
 * Field labels, titles and data values are the spec author's own and are never translated here. The chart guide and
 * the Taller stay English: they are written for the people who build charts.
 *
 * @module
 */
import { fieldLabel, formatValue, humanize, timeStep } from "./display.ts";
import { readNumber } from "./formats.ts";
import { countryName, featureId, featureName, isCountryMap, normalizeId, resolveGeo } from "./geo.ts";
import type { Rag } from "./rag.ts";
import { ragOf, ragRank, ragTrend, ragWord, worstOf } from "./rag.ts";
import type { Row, WidgetSpec } from "./types.ts";
import { isYes, periodTime, timeOf } from "./views.ts";
import { wordsFor } from "./words.ts";
import type { Lang } from "./words.ts";
import { cardNoun, distinctLabel, entityNoun, GENERIC_FIELD, singular } from "./nouns.ts";
import { registerReadingLanguages } from "./reading.ts";

// The English noun helpers live in nouns.ts, so the English reading layer needs none of this module; re-exported here
// for anyone who imported them from it.
export { cardNoun, distinctLabel, entityNoun, GENERIC_FIELD, singular } from "./nouns.ts";

type View = Record<string, unknown> & { type: string };
/** The languages built here. */
type Other = Exclude<Lang, "en">;

/** A view option that names one field, or undefined. */
const one = (value: unknown): string | undefined => (typeof value === "string" && value ? value : Array.isArray(value) && typeof value[0] === "string" ? value[0] : undefined);
/** A view option that names one or more fields. */
const many = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : typeof value === "string" && value ? [value] : []);

// ---------------------------------------------------------------------------------------------------------------------
// What a row is: the entity noun
// ---------------------------------------------------------------------------------------------------------------------


// ---------------------------------------------------------------------------------------------------------------------
// French and German: the words around the field names
// ---------------------------------------------------------------------------------------------------------------------

/** Row nouns in French and German, from the English the card's words or a view's default give. */
const NOUNS: Record<string, { fr: string; de: string }> = {
  account: { fr: "compte", de: "Konto" },
  action: { fr: "action", de: "Maßnahme" },
  application: { fr: "demande", de: "Antrag" },
  band: { fr: "tranche", de: "Band" },
  bank: { fr: "banque", de: "Bank" },
  branch: { fr: "agence", de: "Filiale" },
  campaign: { fr: "campagne", de: "Kampagne" },
  category: { fr: "catégorie", de: "Kategorie" },
  city: { fr: "ville", de: "Stadt" },
  client: { fr: "client", de: "Kunde" },
  company: { fr: "entreprise", de: "Unternehmen" },
  competitor: { fr: "concurrent", de: "Wettbewerber" },
  contract: { fr: "contrat", de: "Vertrag" },
  country: { fr: "pays", de: "Land" },
  customer: { fr: "client", de: "Kunde" },
  deal: { fr: "affaire", de: "Deal" },
  department: { fr: "service", de: "Abteilung" },
  employee: { fr: "collaborateur", de: "Mitarbeiter" },
  entry: { fr: "élément", de: "Eintrag" },
  event: { fr: "événement", de: "Ereignis" },
  feature: { fr: "fonctionnalité", de: "Funktion" },
  firm: { fr: "entreprise", de: "Unternehmen" },
  fund: { fr: "fonds", de: "Fonds" },
  group: { fr: "groupe", de: "Gruppe" },
  invoice: { fr: "facture", de: "Rechnung" },
  issue: { fr: "incident", de: "Vorgang" },
  item: { fr: "élément", de: "Eintrag" },
  market: { fr: "marché", de: "Markt" },
  measure: { fr: "mesure", de: "Kennzahl" },
  member: { fr: "membre", de: "Mitglied" },
  metric: { fr: "indicateur", de: "Kennzahl" },
  office: { fr: "bureau", de: "Büro" },
  order: { fr: "commande", de: "Auftrag" },
  partner: { fr: "partenaire", de: "Partner" },
  person: { fr: "personne", de: "Person" },
  place: { fr: "lieu", de: "Ort" },
  plan: { fr: "plan", de: "Plan" },
  portfolio: { fr: "portefeuille", de: "Portfolio" },
  product: { fr: "produit", de: "Produkt" },
  project: { fr: "projet", de: "Projekt" },
  provision: { fr: "disposition", de: "Bestimmung" },
  region: { fr: "région", de: "Region" },
  regulation: { fr: "réglementation", de: "Regelung" },
  rep: { fr: "commercial", de: "Vertriebler" },
  row: { fr: "ligne", de: "Zeile" },
  rule: { fr: "règle", de: "Regel" },
  segment: { fr: "segment", de: "Segment" },
  stage: { fr: "étape", de: "Phase" },
  stakeholder: { fr: "partie prenante", de: "Beteiligte" },
  state: { fr: "État", de: "Bundesstaat" },
  store: { fr: "magasin", de: "Filiale" },
  supplier: { fr: "fournisseur", de: "Lieferant" },
  task: { fr: "tâche", de: "Aufgabe" },
  team: { fr: "équipe", de: "Team" },
  ticket: { fr: "ticket", de: "Ticket" },
  topic: { fr: "thème", de: "Thema" },
  user: { fr: "utilisateur", de: "Nutzer" },
  vendor: { fr: "fournisseur", de: "Anbieter" },
};

/** "month by month" for a time field, in each language. */
const STEPS: Record<string, { fr: string; de: string; frOne: string; deOne: string }> = {
  day: { fr: "jour par jour", de: "Tag für Tag", frOne: "jour", deOne: "Tag" },
  week: { fr: "semaine par semaine", de: "Woche für Woche", frOne: "semaine", deOne: "Woche" },
  month: { fr: "mois par mois", de: "Monat für Monat", frOne: "mois", deOne: "Monat" },
  quarter: { fr: "trimestre par trimestre", de: "Quartal für Quartal", frOne: "trimestre", deOne: "Quartal" },
  year: { fr: "année par année", de: "Jahr für Jahr", frOne: "année", deOne: "Jahr" },
  hour: { fr: "heure par heure", de: "Stunde für Stunde", frOne: "heure", deOne: "Stunde" },
};

/** Everything a sentence builder needs: the view, the rows, and the field names and figures in this language. */
interface Ctx {
  lang: Other;
  spec: WidgetSpec;
  view: View;
  rows: Row[];
  /** A field's name in a sentence: the author's label (French lowercases a plain capital, German keeps it). */
  name(field: string | undefined, fallback?: string): string;
  /** What one row is: the field's label, the card's own noun in this language, or the fallback noun. */
  noun(field: string | undefined, fallback?: string): string;
  /** A row's value in its field's format and the spec's locale. */
  text(row: Row, field: string): string;
  /** A number in a field's format. */
  fmt(n: number, field: string | undefined): string;
  /** A share as a whole percentage, in the locale ("47 %", "47 %"). */
  pct(share: number): string;
  value(row: Row, field: string): number | null;
  /** The row with the most of a field. */
  top(field: string | undefined): Row | undefined;
  /** The row with the least of a field. */
  bottom(field: string | undefined): Row | undefined;
  /** "a, b et c", "a, b und c". */
  list(names: string[]): string;
  /** "a, b ou c", "a, b oder c". */
  or(names: string[]): string;
  /** "mois par mois", "Monat für Monat"; "au fil du temps", "im Zeitverlauf". */
  over(field: string | undefined): string;
  /** A row's date as a calendar day, in the locale. */
  day(row: Row, field: string): string;
  /** A status's words, lowercased, in this language or the spec's own words. */
  rag(status: Rag): string;
}


function contextOf(lang: Other, spec: WidgetSpec, rows: Row[]): Ctx {
  const view = (spec.view ?? { type: "table" }) as View;
  const locale = spec.locale;
  const fr = lang === "fr";
  const name = (field: string | undefined, fallback = fr ? "valeur" : "Wert"): string => {
    if (!field) return fallback;
    const short = ({ kpi: "KPI", nps: "NPS" } as Record<string, string>)[field.toLowerCase()];
    if (short && !spec.fields?.[field]?.label) return short;
    const label = fieldLabel(field, spec.fields);
    // French reads a plain capitalized label in the middle of a sentence in lower case; German nouns keep their capital.
    return fr && /^[a-z]/.test(field) && /^[A-Z][a-z]*\b/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
  };
  const translate = (english: string) => NOUNS[english]?.[lang] ?? english;
  const noun = (field: string | undefined, fallback = "entry"): string => {
    if (!field) return translate(fallback);
    const label = spec.fields?.[field]?.label;
    // A field named for a common thing ("region", "task") with no label of the author's reads in this language.
    if (!label && NOUNS[field.toLowerCase()]) return translate(field.toLowerCase());
    if (!GENERIC_FIELD.test(field)) return name(field);
    if (label && !GENERIC_FIELD.test(label)) return name(field);
    return translate(entityNoun(field, spec, fallback));
  };
  const value = (row: Row, field: string) => readNumber(row[field]);
  const known = (field: string) => rows.filter((row) => value(row, field) !== null);
  const percent = new Intl.NumberFormat(locale ?? (fr ? "fr-FR" : "de-DE"), { style: "percent", maximumFractionDigits: 0 });
  const join = (names: string[], word: string) => (names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} ${word} ${names.at(-1)}`);
  return {
    lang,
    spec,
    view,
    rows,
    name,
    noun,
    text: (row, field) => formatValue(row[field], spec.fields?.[field]?.format, locale),
    fmt: (n, field) => formatValue(n, field ? spec.fields?.[field]?.format : undefined, locale),
    pct: (share) => percent.format(share),
    value,
    top: (field) => (field ? known(field).reduce<Row | undefined>((best, row) => (best && (value(best, field) as number) >= (value(row, field) as number) ? best : row), undefined) : undefined),
    bottom: (field) => (field ? known(field).reduce<Row | undefined>((best, row) => (best && (value(best, field) as number) <= (value(row, field) as number) ? best : row), undefined) : undefined),
    list: (names) => join(names, fr ? "et" : "und"),
    or: (names) => join(names, fr ? "ou" : "oder"),
    over: (field) => {
      const step = field ? timeStep(field) : undefined;
      if (step && STEPS[step]) return STEPS[step][lang];
      if (!field || /^(time|timestamp|period|when)$/i.test(field)) return fr ? "au fil du temps" : "im Zeitverlauf";
      return fr ? `selon ${name(field)}` : `nach ${name(field)}`;
    },
    day: (row, field) => (spec.fields?.[field]?.format !== undefined ? formatValue(row[field], spec.fields?.[field]?.format, locale) : formatValue(row[field], { type: "date" }, locale)),
    // French status words read in lower case mid-sentence ("conforme"); German ones keep their nouns and stand in quotes ("„Im Plan“").
    rag: (status) => (fr ? ragWord(status, view.words, locale).toLowerCase() : `„${ragWord(status, view.words, locale)}“`),
  };
}

/** "de revenue", "d'impact": French elision before a vowel. */
const de = (word: string) => (/^[aeiouyàâäéèêëîïôöûüh]/i.test(word) ? `d'${word}` : `de ${word}`);

/** Field names that read as one measure at two times: q3_2025 and q3_2026, before and after. */
const PERIOD = /(19|20)\d\d|\bq[1-4]\b|before|after|previous|prior|last|current|start|end/i;

// ---------------------------------------------------------------------------------------------------------------------
// Explain: the reading guide, the framing sentences and one standout
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The reading guide in French or German, the counterpart of `explainChart`: what each mark is and what more looks
 * like, what a target line, highlight or small multiples add, and one standout from the rows.
 */
export function explainIn(lang: Other, spec: WidgetSpec, rows: Row[] = []): string {
  const c = contextOf(lang, spec, rows);
  const facet = (spec.facet as { field?: string } | undefined)?.field;
  const guide = lang === "fr" ? guideFr(c) : guideDe(c);
  const parts = [guide, targetSentence(c), highlightSentence(c), facet ? facetSentence(c, facet) : "", ragRuleSentence(c)].filter(Boolean);
  const example = rows.length && !facet ? render(c, factOf(c)) : "";
  return [...parts, example].filter(Boolean).join(" ");
}

/** A dashed target line, and on bars how a miss looks. */
function targetSentence(c: Ctx): string {
  const { view, lang } = c;
  if (!["bar", "hbar", "line", "area"].includes(view.type) || !Array.isArray(view.reference)) return "";
  const found = (view.reference as { value?: unknown; label?: unknown }[]).find((r) => typeof r.value === "number" && /target|plan|goal|budget|quota/i.test(String(r.label ?? "")));
  if (!found) return "";
  const label = String(found.label);
  const line = lang === "fr" ? `La ligne pointillée représente ${label.charAt(0).toLowerCase()}${label.slice(1)}.` : `Die gestrichelte Linie ist ${label}.`;
  if (view.type !== "bar" || many(view.y).length !== 1 || one(view.lines)) return line;
  const down = view.goodWhen === "down";
  if (lang === "fr") return `${line} ${down ? "Ici, plus bas vaut mieux : une barre sous la ligne respecte l'objectif, une barre détourée l'a dépassé." : "Une barre qui atteint la ligne respecte l'objectif, une barre détourée est restée en deçà."}`;
  return `${line} ${down ? "Hier ist weniger besser: Ein Balken unter der Linie hält das Ziel ein, ein umrandeter Balken liegt darüber." : "Ein Balken, der die Linie erreicht, erfüllt das Ziel; ein umrandeter Balken bleibt darunter."}`;
}

/** The highlighted marks, read by strength, never by a named color. */
function highlightSentence(c: Ctx): string {
  const { view, lang } = c;
  const picked = (Array.isArray(view.highlight) ? view.highlight : view.highlight === undefined || view.highlight === "" ? [] : [view.highlight]).map(String);
  if (!picked.length) return "";
  const names = ["line", "area"].includes(view.type) ? picked.map((field) => c.name(field)) : picked;
  if (lang === "fr") return `${c.list(names)} ${names.length === 1 ? "ressort" : "ressortent"} ; le reste passe au second plan.`;
  return `${c.list(names)} ${names.length === 1 ? "sticht" : "stechen"} hervor; der Rest tritt zurück.`;
}

function facetSentence(c: Ctx, facet: string): string {
  return c.lang === "fr" ? `Un petit graphique par ${c.noun(facet)}, tous à la même échelle.` : `Ein kleines Diagramm je ${c.noun(facet)}, alle im selben Maßstab.`;
}

/** Where statuses the rag transform worked out come from: a rule, not a judgment. */
function ragRuleSentence(c: Ctx): string {
  const steps = (c.spec.transform ?? []).filter((step) => step.type === "rag" && Array.isArray(step.rules));
  const rules = steps.flatMap((step) => step.rules as { field?: unknown; green?: unknown; amber?: unknown; goodWhen?: unknown }[]).filter((r) => typeof r.field === "string" && typeof r.green === "number" && typeof r.amber === "number");
  const rule = rules[0];
  if (!rule) return "";
  const field = rule.field as string;
  const down = rule.goodWhen === "down";
  const [green, amber] = [c.fmt(rule.green as number, field), c.fmt(rule.amber as number, field)];
  if (c.lang === "fr") return `Chaque statut découle d'une règle : ${c.name(field)} est ${c.rag("G")} ${down ? `jusqu'à ${green}` : `à partir de ${green}`}, ${c.rag("A")} ${down ? `jusqu'à ${amber}` : `à partir de ${amber}`}.`;
  return `Jeder Status folgt einer Regel: ${c.name(field)} ist ${c.rag("G")} ${down ? `bis ${green}` : `ab ${green}`}, ${c.rag("A")} ${down ? `bis ${amber}` : `ab ${amber}`}.`;
}

/** The general reading guide in French, from the view's options alone. */
function guideFr(c: Ctx): string {
  const { view, name, noun, list, or, over } = c;
  const series = many(view.y);
  const colors = series.length > 1 ? ` Chaque couleur correspond à une courbe : ${or(series.map((f) => name(f)))}.` : "";
  const forecast = view.forecast ? " La partie en pointillés est une prévision ; la zone ombrée indique sa fiabilité : plus elle est large, plus l'incertitude est grande." : "";
  const noted = Array.isArray(view.annotations) && view.annotations.length ? ` Les courtes notes signalées par un point indiquent ${view.annotations.length === 1 ? "un moment à retenir" : "des moments à retenir"}.` : "";
  const dotted = view.points === true ? " Chaque point sur une courbe est une mesure." : "";
  const peaks = view.peaks === true ? ` Les deux points chiffrés marquent la valeur la plus haute et la plus basse ${de(name(series[0]))}.` : "";
  const logged = view.scale === "log" ? " L'axe progresse par puissances de dix : une croissance régulière y apparaît comme une droite." : "";
  const valueOf = (field: string | undefined) => `plus la valeur ${de(name(field))} est élevée`;
  const parts = (percent: boolean) => (percent ? "Chaque barre fait 100 % : comparez la taille des parts." : "Les parts s'additionnent : la barre entière est le total.");

  switch (view.type) {
    case "bar": {
      const lollipop = view.mark === "lollipop";
      const compared = typeof view.compare === "string" ? ` La barre plus large et plus pâle derrière chacune représente ${name(view.compare)}, pour comparaison.` : "";
      if (series.length > 1 && view.stacked) return `Une barre par ${noun(one(view.x))}, découpée en parts colorées pour ${list(series.map((f) => name(f)))}. ${parts(view.stacked === "percent")}`;
      if (series.length > 1) return `Un groupe de barres par ${noun(one(view.x))}, une couleur pour chacun de ${list(series.map((f) => name(f)))}. Plus la barre est haute, plus la valeur est élevée.`;
      const goal = one(view.lines);
      const line = !goal
        ? ""
        : view.goodWhen === "down"
          ? ` La ligne représente ${name(goal)}. Ici, plus bas vaut mieux : une barre sous la ligne reste en deçà ${de(name(goal))}.`
          : ` La ligne représente ${name(goal)} : une barre qui la dépasse fait mieux que ${name(goal)}.`;
      return `${lollipop ? "Une tige terminée par un point" : "Une barre"} par ${noun(one(view.x))}. ${lollipop ? "Plus le point est haut" : "Plus la barre est haute"}, ${valueOf(series[0])}.${line}${compared}${noted}`;
    }
    case "hbar": {
      const fields = many(view.value);
      const label = noun(one(view.label));
      if (fields.length > 1 && view.split) return `Une ligne par ${label}, avec une colonne de barres pour chacun de ${list(fields.map((f) => name(f)))}. Plus la barre est longue, plus la valeur est élevée. ${view.shared ? "Toutes les colonnes partagent la même échelle : les barres se comparent aussi d'une colonne à l'autre." : "Chaque colonne a sa propre échelle : comparez les barres au sein d'une colonne, pas d'une colonne à l'autre."}`;
      if (fields.length > 1 && view.stacked) return `Une ligne par ${label}, dont la barre est découpée en parts colorées pour ${list(fields.map((f) => name(f)))}. ${parts(view.stacked === "percent")}`;
      if (fields.length > 1) return `Une ligne par ${label}, avec une barre pour chacun de ${list(fields.map((f) => name(f)))}. Plus la barre est longue, plus la valeur est élevée.`;
      return view.mark === "lollipop" ? `Une ligne par ${label}. Plus le point est à droite, ${valueOf(fields[0])}.` : `Une ligne par ${label}. Plus la barre est longue, ${valueOf(fields[0])}.`;
    }
    case "pyramid":
      return `Une ligne par ${noun(one(view.label), "band")}. La barre de gauche représente ${name(one(view.left))}, celle de droite ${name(one(view.right))}, à la même échelle : le côté le plus long l'emporte, et la silhouette montre où les deux diffèrent.`;
    case "line":
      return `La courbe montre l'évolution ${series.length > 1 ? "de chaque valeur" : de(name(series[0]))}, ${over(one(view.x))} : plus elle monte, plus la valeur est élevée.${colors}${forecast}${logged}${dotted}${peaks}${noted}`;
    case "area":
      if (view.stacked === "stream") return `Chaque bande colorée correspond à ${or(series.map((f) => name(f)))}. Plus une bande est épaisse à un moment donné, plus sa valeur est élevée ; la hauteur totale du flux est le total.${noted}`;
      if (view.stacked) return `Les couches colorées s'empilent, ${over(one(view.x))} ; le bord supérieur est le total et l'épaisseur de chaque couche est sa part.${noted}`;
      return `La surface montre l'évolution ${de(name(series[0]))}, ${over(one(view.x))} : plus elle est haute, plus la valeur est élevée.${colors}${forecast}${noted}`;
    case "dual":
      return `Deux petits graphiques partagent le même axe horizontal (${name(one(view.x))}) : ${name(one(view.y))} en haut et ${name(one(view.y2))} en bas, chacun avec sa propre échelle ; regardez les formes, pas les croisements. Plus haut signifie plus élevé dans les deux cas.`;
    case "kpi": {
      const reached = view.goodWhen === "down" ? "s'il est resté sous son objectif" : "s'il a atteint son objectif";
      return `Le grand chiffre est ${name(one(view.value))}. La petite flèche indique s'il a progressé ou reculé depuis la dernière fois${one(view.target) ? `, et la ligne en dessous ${reached}` : ""}.`;
    }
    case "kpis": {
      const targeted = (Array.isArray(view.items) ? view.items : []) as { target?: unknown }[];
      const line = targeted.some((item) => typeof item.target === "string") ? " Une ligne sous une tuile indique si son objectif est atteint." : "";
      return `Chaque tuile est un chiffre clé, avec une petite flèche qui indique s'il a progressé ou reculé depuis la dernière fois.${line}`;
    }
    case "meter":
      return `Chaque barre se remplit vers son objectif. Une barre pleine signifie que l'objectif ${de(name(one(view.value)))} est atteint ; le pourcentage indique à quel point on en est proche.`;
    case "bullet":
      return "La barre pleine est la valeur réelle et le trait fin l'objectif. Les bandes ombrées à l'arrière indiquent les niveaux faible, correct et bon.";
    case "donut": {
      if (view.arc !== "half") return `L'anneau représente le tout. Un arc par ${noun(one(view.label))} : plus il est grand, plus sa part ${de(name(one(view.value)))} est importante.`;
      const line = view.majority ? " Le petit trait en haut marque la moitié : qui l'atteint depuis la gauche détient la majorité." : "";
      return `Le demi-anneau représente le tout, à lire de gauche à droite. Un arc par ${noun(one(view.label))} : plus il est large, ${valueOf(one(view.value))}.${line}`;
    }
    case "pie":
      return `Le disque représente le tout. Un secteur par ${noun(one(view.label))} : plus il est large, plus sa part ${de(name(one(view.value)))} est importante.`;
    case "treemap":
      return `Un rectangle par ${noun(one(view.label))}. Plus le rectangle est grand, ${valueOf(one(view.value))}.`;
    case "funnel":
      return "Chaque étape en retient moins que la précédente. Le chiffre entre deux étapes indique combien sont passés de l'une à l'autre.";
    case "waterfall":
      return "Partez de la première barre. Chaque barre suivante monte pour ce qui s'ajoute et descend pour ce qui se retire, jusqu'au total final.";
    case "heatmap":
      return `Une case par combinaison ${de(name(one(view.x)))} et ${de(name(one(view.y)))}. Plus la couleur est intense, ${valueOf(one(view.value))}.`;
    case "calendar":
      return `Une case par jour, les semaines en colonnes. Plus la couleur est intense, ${valueOf(one(view.value))}.`;
    case "scatter": {
      const sized = one(view.size) ? ` Plus le point est gros, ${valueOf(one(view.size))}.` : "";
      const hulls = one(view.cluster) ? ` Chaque zone ombrée rassemble un groupe ${de(name(one(view.cluster)))}, nommé en son centre : les points proches vont ensemble.` : "";
      const q = view.quadrants as { labels?: string[] } | undefined;
      const corners = q?.labels?.filter(Boolean) ?? [];
      const named = view.labels ? (q ? ", et les points marquants portent leur nom" : " Les points marquants portent leur nom sur le graphique.") : "";
      const split = q ? ` Les lignes en pointillés partagent le graphique en quatre quadrants${corners.length ? `, nommés ${list(corners)}` : ""} : le quadrant d'un point indique quoi faire${named}.` : named;
      return `Un point par ${noun(one(view.label))} : vers la droite, ${name(one(view.x))} augmente ; vers le haut, ${name(one(view.y))} augmente.${sized}${hulls}${split}`;
    }
    case "beeswarm":
      return `Un point par ${noun(one(view.label), "row")}, placé selon ${name(one(view.value))}. Les points s'empilent là où beaucoup de valeurs sont proches.`;
    case "ridgeline":
      return `Chaque relief montre la répartition ${de(name(one(view.value)))} dans un groupe. Le sommet indique où se trouvent la plupart des valeurs ; un relief plus à droite a des valeurs plus élevées.`;
    case "sankey":
      return "Les flux vont de gauche à droite, se séparent et se rejoignent. Plus un flux est épais, plus le volume qui passe par là est grand.";
    case "dumbbell": {
      const [from, to] = [one(view.from), one(view.to)];
      const change = from && to && PERIOD.test(from) && PERIOD.test(to);
      if (view.mark === "arrow") {
        return `Chaque ligne est une flèche ${de(name(from, "la première valeur"))} à ${name(to, "la seconde")}. ${change ? "Une flèche vers la droite signale une hausse, vers la gauche une baisse ; plus elle est longue, plus la variation est forte." : "Le point marque la première valeur ; plus la flèche est longue, plus l'écart est grand."}`;
      }
      return `Chaque ligne compte deux points : ${name(from, "la première valeur")} et ${name(to, "la seconde")}. Le trait qui les relie représente ${change ? "la variation" : "l'écart"}.`;
    }
    case "slope":
      return `Une ligne par ${noun(one(view.label))}, de l'avant à l'après. Une ligne qui monte signale une hausse ; plus elle est pentue, plus la variation est forte.`;
    case "bump":
      return `Une ligne par ${noun(one(view.series), "competitor")} : son rang, ${over(one(view.x))}. Plus elle est haute, meilleur est le rang ; quand deux lignes se croisent, les places s'échangent.`;
    case "marimekko":
      return `Une colonne par ${noun(one(view.x))} : plus elle est large, plus son total est élevé, et ses parts colorées montrent sa répartition par ${noun(one(view.series), "group")}.`;
    case "histogram":
      return `Chaque barre est une tranche de valeurs ${de(name(one(view.value)))}. Plus la barre est haute, plus les valeurs de cette tranche sont fréquentes ; la ligne en pointillés marque la médiane.`;
    case "rings":
      return "Chaque anneau se remplit vers son objectif. Un cercle complet signifie que l'objectif est atteint.";
    case "timeline":
      return "Chaque barre est une tâche, de sa date de début à sa date de fin ; la partie pleine indique l'avancement. Le trait vertical marque aujourd'hui.";
    case "waffle":
      return "Il y a 100 carrés : chaque carré coloré représente un pour cent du total.";
    case "variance": {
      const target = name(one(view.target), "plan");
      return `Une barre par ${noun(one(view.label))} : son écart par rapport à ${target}, vers la droite au-dessus, vers la gauche en dessous, avec l'écart inscrit à côté. ${view.goodWhen === "down" ? "En dessous" : "Au-dessus"} ${de(target)}, c'est mieux. Plus la barre est longue, plus l'écart est grand.`;
    }
    case "gauge":
      return "L'aiguille indique la valeur sur une échelle de bas en haut. Le petit repère sur l'arc est l'objectif.";
    case "pareto":
      return "Les barres sont triées de la plus grande à la plus petite. La courbe les cumule au fur et à mesure : on voit quelles quelques causes font l'essentiel du total.";
    case "boxplot":
      return "La boîte contient la moitié centrale des valeurs et le trait intérieur la médiane. Les moustaches couvrent l'étendue habituelle ; les points au-delà sont des valeurs inhabituelles.";
    case "likert":
      return "Chaque barre répartit les réponses à une question, du désaccord à gauche à l'accord à droite, centrée sur la neutralité. Plus le côté droit est long, plus l'adhésion est forte.";
    case "candlestick": {
      const x = one(view.x);
      const step = (x && STEPS[timeStep(x) ?? ""]?.frOne) ?? "période";
      const average = typeof view.average === "number" && view.average > 1 ? ` La courbe est la moyenne des ${view.average} derniers cours de clôture.` : "";
      return `Un chandelier par ${step}. Le corps va du cours d'ouverture au cours de clôture, la mèche du plus bas au plus haut. Un chandelier creux a monté, un chandelier plein a baissé.${average}`;
    }
    case "sunburst":
      return "L'anneau intérieur montre les plus grands groupes. Chaque anneau vers l'extérieur les subdivise ; plus un secteur est large, plus sa valeur est élevée.";
    case "chord":
      return "Chaque groupe occupe une place sur le cercle. Chaque ruban relie deux groupes : plus il est épais, plus les échanges entre eux sont importants.";
    case "radar":
      return `Un axe par ${noun(one(view.label))}. Plus un point est loin du centre, plus le score est élevé ; une forme plus grande est meilleure dans l'ensemble.`;
    case "rose":
      return series.length > 1
        ? `Un secteur par ${noun(one(view.label))}, disposés comme sur une horloge. Plus la surface d'un secteur est grande, plus la valeur totale est élevée. Les couleurs correspondent à ${list(series.map((f) => name(f)))}, empilées du centre vers l'extérieur.`
        : `Un secteur par ${noun(one(view.label))}, disposés comme sur une horloge. Plus la surface d'un secteur est grande, ${valueOf(series[0])}.`;
    case "horizon": {
      const named = typeof view.baselineLabel === "string" ? view.baselineLabel.trim() : "";
      const first = `Une ligne pour chaque série${series.length > 1 && series.length <= 8 ? ` (${or(series.map((f) => name(f)))})` : ""}, ${over(one(view.x))}.`;
      return named
        ? `${first} Les valeurs au-dessus ${de(named)} montent depuis le bas de la ligne, celles en dessous descendent depuis le haut ; plus la teinte est intense, plus l'écart avec ${named} est grand.`
        : `${first} Les valeurs au-dessus de la ligne de base montent depuis le bas de la ligne, celles en dessous descendent depuis le haut ; plus la teinte est intense, plus l'écart est grand.`;
    }
    case "icicle":
      return `La première colonne est le total. Chaque colonne vers la droite subdivise les blocs : plus un bloc est haut, ${valueOf(one(view.value))}.`;
    case "dot": {
      const measures = many(view.value);
      if (measures.length > 1) return `Une ligne par ${noun(one(view.label))}, avec un point pour chacun de ${list(measures.map((f) => name(f)))}. Plus un point est à droite, plus la valeur est élevée ; des points éloignés signalent un grand écart entre eux.`;
      return `Une ligne par ${noun(one(view.label))}. Plus le point est à droite, ${valueOf(measures[0])}.`;
    }
    case "choropleth":
      if (one(view.category)) return `Une région de la carte par ${noun(one(view.id), "region")}, colorée selon ${name(one(view.category))} ; une région estompée n'a pas de données.`;
      return `Une région de la carte par ${noun(one(view.id), "region")}. Plus sa teinte est intense, ${valueOf(one(view.value))} ; une région estompée n'a pas de données.`;
    case "board": {
      const grouped = one(view.group) ? ` Le point sur une carte indique ${name(one(view.group))}, comme le précise la légende.` : "";
      const valued = one(view.value) ? ` Le chiffre sur une carte est ${name(one(view.value))}.` : "";
      return `Une colonne par ${noun(one(view.stage), "stage")}, avec le nombre d'éléments qu'elle contient ; une carte par ${noun(one(view.label))}. Lisez de gauche à droite pour voir l'avancement.${grouped}${valued}`;
    }
    case "symbols":
      return `Un cercle par ${noun(one(view.label) ?? one(view.id), "place")} sur la carte. Plus le cercle est grand, ${valueOf(one(view.size))}.${one(view.color) ? ` Chaque couleur correspond à une valeur ${de(name(one(view.color)))}.` : ""}`;
    case "locator":
      return `Un repère par ${noun(one(view.label), "place")}, avec son nom à côté, à son emplacement sur la carte.${one(view.color) ? ` Chaque couleur correspond à une valeur ${de(name(one(view.color)))}.` : ""}`;
    case "matrix": {
      const [x, y, size, color, mark] = [one(view.x), one(view.y), one(view.size), one(view.color), one(view.flag)];
      const axis = (field: string | undefined) => (field ? (distinctLabel(field, c.spec, [x, y, size, color, mark]) ?? noun(field)) : noun(field));
      const marks = [
        size ? `Plus le cercle est grand, ${valueOf(size)}` : "",
        color ? `${size ? "plus" : "Plus"} la teinte est intense, ${valueOf(color)}` : "",
        mark ? `${size || color ? "un" : "Un"} carré signifie oui pour ${name(mark)}, un point pâle non` : "",
      ].filter(Boolean);
      return `Une ligne par ${axis(y)} et une colonne par ${axis(x)} ; une marque se trouve à leur croisement. ${marks.length ? `${marks.join(" ; ")}. ` : ""}Une case vide signifie qu'il n'y a rien pour cette paire.`;
    }
    case "strips": {
      const fields = many(view.value);
      const unit = unitIn(c);
      const dense = one(view.per) ? `, puis le nombre par ${name(one(view.per)).replace(/s$/, "")}` : "";
      const colored = fields.length > 1 ? `Les couleurs indiquent le type, dans l'ordre : ${list(fields.map((f) => name(f)))} ; les chiffres en fin de ligne donnent le total et la part ${de(name(fields[0]))}${dense}.` : `Le chiffre en fin de ligne est le total${dense}.`;
      return `Une ligne par ${noun(one(view.label))}, et chaque petit carré compte pour une unité (${unit}), pour pouvoir les compter. ${colored} Quand un carré vaut plus d'une unité, la note sous le graphique l'indique.`;
    }
    case "lifecycle": {
      const stages = many(view.stages);
      const extras = [
        view.today ? "le trait vertical marque aujourd'hui" : "",
        one(view.impact) ? `une ligne plus épaisse signale une valeur ${de(name(one(view.impact)))} plus élevée` : "",
      ].filter(Boolean);
      const tail = extras.length ? ` ${extras.join(", ").replace(/^./, (ch) => ch.toUpperCase())}.` : "";
      return `Une ligne par ${noun(one(view.label))}, de gauche à droite dans le temps ; chaque segment est une étape, ${list(stages.map((f) => name(f)))} dans l'ordre, et un segment pâle est en cours.${tail}`;
    }
    case "whitespace":
      return `Une ligne par ${noun(one(view.row), "client")} et une colonne par ${noun(one(view.column), "product")}. Un carré plein signifie que le produit est déjà détenu, un carré détouré qu'il pourrait l'être (plus la teinte est intense, plus c'est probable), et un petit point qu'il n'est pas pertinent. La fin de chaque ligne compte ce qui est détenu et ce qui reste à gagner.`;
    case "xray":
      return `Cette fiche porte sur un seul ${noun(one(view.label), "client")} : les chiffres clés${many(view.holdings).length ? ", les produits détenus" : ""}${one(view.wallet) ? `, ${name(one(view.wallet))}` : ""}${one(view.trend) ? ", la tendance récente" : ""}${one(view.flags) ? ", les points de vigilance" : ""}${one(view.actions) ? " et les prochaines actions" : ""}.`;
    case "history":
      return `Un point par événement, ${view.order === "asc" ? "du plus ancien au plus récent" : "le plus récent en haut"}, avec sa date et ce qui s'est passé${one(view.amount) ? ` et, à droite, ${name(one(view.amount))}` : ""}.${one(view.kind) ? ` Chaque couleur et chaque lettre correspondent à une valeur ${de(name(one(view.kind)))}.` : ""}`;
    case "anomalies":
      return `Une fine bande par ${noun(one(view.metric), "measure")}, ${over(one(view.x))}. La courbe montre ce qui s'est passé${one(view.low) && one(view.high) ? " ; la bande pâle indique la plage attendue" : ""}${one(view.expected) ? ", avec un trait fin pour la valeur attendue" : ""}. Un point plein signale une anomalie, une mesure sortie de sa plage. Les bandes avec le plus d'anomalies viennent en premier, chacune se terminant par sa dernière valeur et son nombre d'anomalies.`;
    case "ragboard": {
      const changes = view.previous && typeof view.previous === "object" ? " Une flèche signale une amélioration ou une dégradation par rapport à la période précédente." : "";
      const first = view.overall === false ? "" : ` La colonne ${wordsFor(c.spec).overall}, en tête, donne le statut le plus défavorable de chaque ligne.`;
      return `Une ligne par ${noun(one(view.label), "client")}, une colonne par critère : ${list(many(view.dimensions).map((f) => name(f)))}. Un cercle signifie ${c.rag("G")}, un triangle ${c.rag("A")}, un carré ${c.rag("R")} ; les lignes les plus critiques viennent en premier.${first}${changes}`;
    }
    case "ragtrend":
      return `Une ligne par ${noun(one(view.label), "client")}, à lire de gauche à droite, ${over(one(view.period))}. Un cercle plein signifie ${c.rag("G")}, un triangle ${c.rag("A")} et un carré ${c.rag("R")} ; un trait vertical marque un changement de statut${one(view.note) ? ", et le survoler en donne la raison" : ""}. La pastille en fin de ligne indique la situation actuelle, et les lignes les plus critiques viennent en premier.`;
    case "list":
      return `Une ligne par ${noun(one(view.label))}${one(view.value) ? `, avec ${name(one(view.value))} à droite` : ""}.`;
    case "table": {
      const columns = many(view.columns);
      const months = columns.filter((col) => /^\d{4}-\d{2}$/.test(col));
      const shape = columns[0] && months.length >= 2 && !months.includes(columns[0]) ? `Une ligne par ${noun(columns[0])} et une colonne par mois.` : "Une ligne par enregistrement et une colonne par information.";
      const shaded = columns.some((col) => {
        const format = c.spec.fields?.[col]?.format;
        return (typeof format === "object" ? (format as { type?: string }).type : format) === "heat";
      });
      const words = wordsFor(c.spec);
      const search = view.search ? " Tapez dans le champ de recherche pour ne garder que les lignes correspondantes." : "";
      const pages = typeof view.pageSize === "number" && view.pageSize >= 1 ? ` ${view.pageSize} lignes s'affichent à la fois ; ${words.next} et ${words.previous} changent de page.` : "";
      const sort = view.sortable === false ? "" : " Cliquez sur un en-tête de colonne pour trier.";
      const crowded = shaded && sort && search && pages;
      const opening = crowded ? `${shape.slice(0, -1)}, et plus la teinte est intense, plus le chiffre est élevé.` : `${shape}${shaded ? " Plus la teinte est intense, plus le chiffre est élevé." : ""}`;
      return `${opening}${sort}${search}${pages}`;
    }
    default:
      return "Chaque marque représente une valeur. Plus elle est grande, longue ou intense, plus la valeur est élevée.";
  }
}

/** The general reading guide in German, from the view's options alone. */
function guideDe(c: Ctx): string {
  const { view, name, noun, list, or, over } = c;
  const series = many(view.y);
  const colors = series.length > 1 ? ` Jede Farbe ist eine Linie: ${or(series.map((f) => name(f)))}.` : "";
  const forecast = view.forecast ? " Der gestrichelte Teil ist eine Prognose; die schattierte Fläche zeigt ihre Unsicherheit: Je breiter, desto unsicherer." : "";
  const noted = Array.isArray(view.annotations) && view.annotations.length ? ` Die kurzen Notizen mit Punkt markieren ${view.annotations.length === 1 ? "einen wichtigen Moment" : "wichtige Momente"}.` : "";
  const dotted = view.points === true ? " Jeder Punkt auf einer Linie ist ein Messwert." : "";
  const peaks = view.peaks === true ? ` Die beiden beschrifteten Punkte sind der höchste und der niedrigste Wert für ${name(series[0])}.` : "";
  const logged = view.scale === "log" ? " Die Achse wächst in Zehnerpotenzen, sodass stetiges Wachstum als Gerade erscheint." : "";
  const valueOf = (field: string | undefined) => `desto höher der Wert für ${name(field)}`;
  const parts = (percent: boolean) => (percent ? "Jeder Balken ergibt 100 %, vergleichen Sie also die Größe der Teile." : "Die Teile ergeben zusammen die Summe: Der ganze Balken ist der Gesamtwert.");

  switch (view.type) {
    case "bar": {
      const lollipop = view.mark === "lollipop";
      const compared = typeof view.compare === "string" ? ` Der breitere, blassere Balken dahinter zeigt ${name(view.compare)} zum Vergleich.` : "";
      if (series.length > 1 && view.stacked) return `Ein Balken je ${noun(one(view.x))}, aufgeteilt in farbige Teile für ${list(series.map((f) => name(f)))}. ${parts(view.stacked === "percent")}`;
      if (series.length > 1) return `Eine Balkengruppe je ${noun(one(view.x))}, eine Farbe für ${list(series.map((f) => name(f)))}. Je höher der Balken, desto höher der Wert.`;
      const goal = one(view.lines);
      const line = !goal
        ? ""
        : view.goodWhen === "down"
          ? ` Die Linie ist ${name(goal)}. Hier ist weniger besser: Ein Balken unter der Linie bleibt unter ${name(goal)}.`
          : ` Die Linie ist ${name(goal)}: Ein Balken darüber übertrifft ${name(goal)}.`;
      return `${lollipop ? "Ein Stab mit Punkt" : "Ein Balken"} je ${noun(one(view.x))}. ${lollipop ? "Je höher der Punkt" : "Je höher der Balken"}, ${valueOf(series[0])}.${line}${compared}${noted}`;
    }
    case "hbar": {
      const fields = many(view.value);
      const label = noun(one(view.label));
      if (fields.length > 1 && view.split) return `Eine Zeile je ${label}, mit einer Balkenspalte für ${list(fields.map((f) => name(f)))}. Je länger der Balken, desto höher der Wert. ${view.shared ? "Alle Spalten teilen eine Skala, die Balken lassen sich also auch spaltenübergreifend vergleichen." : "Jede Spalte hat ihre eigene Skala: Vergleichen Sie Balken innerhalb einer Spalte, nicht über Spalten hinweg."}`;
      if (fields.length > 1 && view.stacked) return `Eine Zeile je ${label}, deren Balken in farbige Teile für ${list(fields.map((f) => name(f)))} aufgeteilt ist. ${parts(view.stacked === "percent")}`;
      if (fields.length > 1) return `Eine Zeile je ${label}, mit einem Balken für ${list(fields.map((f) => name(f)))}. Je länger der Balken, desto höher der Wert.`;
      return view.mark === "lollipop" ? `Eine Zeile je ${label}. Je weiter rechts der Punkt, ${valueOf(fields[0])}.` : `Eine Zeile je ${label}. Je länger der Balken, ${valueOf(fields[0])}.`;
    }
    case "pyramid":
      return `Eine Zeile je ${noun(one(view.label), "band")}. Der linke Balken zeigt ${name(one(view.left))}, der rechte ${name(one(view.right))}, beide im selben Maßstab: Die längere Seite hat mehr, und die Form zeigt, wo sich beide unterscheiden.`;
    case "line":
      return `Die Linie zeigt, wie sich ${series.length > 1 ? "jeder Wert" : name(series[0])} ${over(one(view.x))} entwickelt: Je höher, desto mehr.${colors}${forecast}${logged}${dotted}${peaks}${noted}`;
    case "area":
      if (view.stacked === "stream") return `Jedes farbige Band steht für ${or(series.map((f) => name(f)))}. Je dicker ein Band zu einem Zeitpunkt, desto höher sein Wert; die Gesamthöhe des Stroms ist die Summe.${noted}`;
      if (view.stacked) return `Farbige Schichten liegen übereinander, ${over(one(view.x))}; die Oberkante ist die Summe, die Dicke jeder Schicht ihr Anteil.${noted}`;
      return `Die Fläche zeigt, wie sich ${name(series[0])} ${over(one(view.x))} entwickelt: Je höher, desto mehr.${colors}${forecast}${noted}`;
    case "dual":
      return `Zwei kleine Diagramme teilen dieselbe horizontale Achse (${name(one(view.x))}): ${name(one(view.y))} oben, ${name(one(view.y2))} unten, jedes mit eigener Skala; achten Sie auf die Formen, nicht auf Überschneidungen. Höher bedeutet in beiden mehr.`;
    case "kpi": {
      const reached = view.goodWhen === "down" ? "ob sie unter ihrem Ziel geblieben ist" : "ob sie ihr Ziel erreicht hat";
      return `Die große Zahl ist ${name(one(view.value))}. Der kleine Pfeil zeigt, ob sie seit dem letzten Mal gestiegen oder gefallen ist${one(view.target) ? `, und die Linie darunter, ${reached}` : ""}.`;
    }
    case "kpis": {
      const targeted = (Array.isArray(view.items) ? view.items : []) as { target?: unknown }[];
      const line = targeted.some((item) => typeof item.target === "string") ? " Eine Linie unter einer Kachel zeigt, ob ihr Ziel erreicht ist." : "";
      return `Jede Kachel ist eine Kennzahl, mit einem kleinen Pfeil, der zeigt, ob sie seit dem letzten Mal gestiegen oder gefallen ist.${line}`;
    }
    case "meter":
      return `Jeder Balken füllt sich bis zu seinem Ziel. Ein voller Balken heißt, das Ziel für ${name(one(view.value))} ist erreicht; der Prozentwert zeigt, wie nah es ist.`;
    case "bullet":
      return "Der volle Balken ist der Istwert, der dünne Strich das Ziel. Die schattierten Bänder dahinter stehen für schwach, ordentlich und gut.";
    case "donut": {
      if (view.arc !== "half") return `Der Ring ist das Ganze. Ein Abschnitt je ${noun(one(view.label))}: Je größer er ist, desto größer sein Anteil an ${name(one(view.value))}.`;
      const line = view.majority ? " Der kleine Strich oben markiert die Hälfte: Wer ihn von links erreicht, hat die Mehrheit." : "";
      return `Der Halbring ist das Ganze, von links nach rechts gelesen. Ein Abschnitt je ${noun(one(view.label))}: Je breiter er ist, ${valueOf(one(view.value))}.${line}`;
    }
    case "pie":
      return `Der Kreis ist das Ganze. Ein Stück je ${noun(one(view.label))}: Je breiter es ist, desto größer sein Anteil an ${name(one(view.value))}.`;
    case "treemap":
      return `Ein Rechteck je ${noun(one(view.label))}. Je größer das Rechteck, ${valueOf(one(view.value))}.`;
    case "funnel":
      return "Jede Stufe behält weniger als die vorige. Die Zahl zwischen zwei Stufen zeigt, wie viele weitergekommen sind.";
    case "waterfall":
      return "Beginnen Sie beim ersten Balken. Jeder weitere Balken steigt für Zuwächse und fällt für Abgänge, bis zur Endsumme.";
    case "heatmap":
      return `Ein Feld je Kombination aus ${name(one(view.x))} und ${name(one(view.y))}. Je kräftiger die Farbe, ${valueOf(one(view.value))}.`;
    case "calendar":
      return `Ein Feld je Tag, die Wochen als Spalten. Je kräftiger die Farbe, ${valueOf(one(view.value))}.`;
    case "scatter": {
      const sized = one(view.size) ? ` Je größer der Punkt, ${valueOf(one(view.size))}.` : "";
      const hulls = one(view.cluster) ? ` Jede schattierte Fläche fasst eine Gruppe nach ${name(one(view.cluster))} zusammen, in ihrer Mitte benannt: Nahe Punkte gehören zusammen.` : "";
      const q = view.quadrants as { labels?: string[] } | undefined;
      const corners = q?.labels?.filter(Boolean) ?? [];
      const named = view.labels ? (q ? ", und markante Punkte tragen ihren Namen" : " Markante Punkte tragen ihren Namen im Diagramm.") : "";
      const split = q ? ` Die gestrichelten Linien teilen das Diagramm in vier Quadranten${corners.length ? `, benannt ${list(corners)}` : ""}: Der Quadrant eines Punkts zeigt, was zu tun ist${named}.` : named;
      return `Ein Punkt je ${noun(one(view.label))}: Nach rechts steigt ${name(one(view.x))}, nach oben steigt ${name(one(view.y))}.${sized}${hulls}${split}`;
    }
    case "beeswarm":
      return `Ein Punkt je ${noun(one(view.label), "row")}, platziert nach ${name(one(view.value))}. Wo viele Werte nah beieinanderliegen, stapeln sich die Punkte.`;
    case "ridgeline":
      return `Jeder Hügel zeigt die Verteilung von ${name(one(view.value))} in einer Gruppe. Am Gipfel liegen die meisten Werte; ein Hügel weiter rechts hat höhere Werte.`;
    case "sankey":
      return "Die Ströme verlaufen von links nach rechts, teilen und vereinen sich. Je breiter ein Strom, desto mehr fließt dort.";
    case "dumbbell": {
      const [from, to] = [one(view.from), one(view.to)];
      const change = from && to && PERIOD.test(from) && PERIOD.test(to);
      if (view.mark === "arrow") {
        return `Jede Zeile ist ein Pfeil von ${name(from, "dem ersten Wert")} zu ${name(to, "dem zweiten")}. ${change ? "Ein Pfeil nach rechts steht für einen Anstieg, nach links für einen Rückgang; je länger er ist, desto größer die Veränderung." : "Der Punkt ist der erste Wert; je länger der Pfeil, desto größer der Abstand."}`;
      }
      return `Jede Zeile hat zwei Punkte: ${name(from, "den ersten Wert")} und ${name(to, "den zweiten")}. Die Linie dazwischen ist ${change ? "die Veränderung" : "der Abstand"}.`;
    }
    case "slope":
      return `Eine Linie je ${noun(one(view.label))}, von vorher zu nachher. Steigt die Linie, ist der Wert gewachsen; je steiler, desto größer die Veränderung.`;
    case "bump":
      return `Eine Linie je ${noun(one(view.series), "competitor")}: der Rang, ${over(one(view.x))}. Je höher, desto besser der Rang; kreuzen sich Linien, tauschen sie die Plätze.`;
    case "marimekko":
      return `Eine Spalte je ${noun(one(view.x))}: Je breiter sie ist, desto größer ihre Summe, und ihre farbigen Teile zeigen die Aufteilung nach ${noun(one(view.series), "group")}.`;
    case "histogram":
      return `Jeder Balken ist ein Wertebereich von ${name(one(view.value))}. Je höher der Balken, desto häufiger kommen Werte in diesem Bereich vor; die gestrichelte Linie ist der Median.`;
    case "rings":
      return "Jeder Ring füllt sich bis zu seinem Ziel. Ein voller Kreis heißt, das Ziel ist erreicht.";
    case "timeline":
      return "Jeder Balken ist eine Aufgabe, vom Start- bis zum Enddatum; der gefüllte Teil zeigt den Fortschritt. Die senkrechte Linie markiert heute.";
    case "waffle":
      return "Es gibt 100 Quadrate, jedes farbige Quadrat steht also für ein Prozent des Ganzen.";
    case "variance": {
      const target = name(one(view.target), "Plan");
      return `Ein Balken je ${noun(one(view.label))}: die Abweichung von ${target}, nach rechts darüber, nach links darunter, mit der Abweichung daneben. ${view.goodWhen === "down" ? "Unter" : "Über"} ${target} ist besser. Je länger der Balken, desto größer die Abweichung.`;
    }
    case "gauge":
      return "Die Nadel zeigt den Wert auf einer Skala von niedrig bis hoch. Die kleine Marke auf dem Bogen ist das Ziel.";
    case "pareto":
      return "Die Balken sind vom größten zum kleinsten sortiert. Die Linie summiert sie fortlaufend, so sieht man, welche wenigen Ursachen den Großteil ausmachen.";
    case "boxplot":
      return "Die Box umfasst die mittlere Hälfte der Werte, der Strich darin ist der Median. Die Antennen reichen über den üblichen Bereich; Punkte darüber hinaus sind Ausreißer.";
    case "likert":
      return "Jeder Balken teilt die Antworten auf eine Frage auf, von Ablehnung links bis Zustimmung rechts, zentriert auf neutral. Je länger die rechte Seite, desto größer die Zustimmung.";
    case "candlestick": {
      const x = one(view.x);
      const step = (x && STEPS[timeStep(x) ?? ""]?.deOne) ?? "Periode";
      const average = typeof view.average === "number" && view.average > 1 ? ` Die Linie ist der Durchschnitt der letzten ${view.average} Schlusskurse.` : "";
      return `Eine Kerze je ${step}. Der Körper reicht vom Eröffnungs- zum Schlusskurs, der Docht vom Tiefst- zum Höchstkurs. Hohle Kerzen sind gestiegen, gefüllte gefallen.${average}`;
    }
    case "sunburst":
      return "Der innere Ring zeigt die größten Gruppen. Jeder Ring weiter außen teilt sie weiter auf; je breiter ein Segment, desto höher sein Wert.";
    case "chord":
      return "Jede Gruppe sitzt auf dem Kreis. Jedes Band verbindet zwei Gruppen: Je dicker es ist, desto mehr wurde zwischen ihnen bewegt.";
    case "radar":
      return `Eine Achse je ${noun(one(view.label))}. Je weiter ein Punkt vom Zentrum entfernt ist, desto höher der Wert; eine größere Form ist insgesamt besser.`;
    case "rose":
      return series.length > 1
        ? `Ein Segment je ${noun(one(view.label))}, im Kreis angeordnet wie auf einer Uhr. Je größer die Fläche eines Segments, desto höher der Gesamtwert. Die Farben stehen für ${list(series.map((f) => name(f)))}, von innen nach außen gestapelt.`
        : `Ein Segment je ${noun(one(view.label))}, im Kreis angeordnet wie auf einer Uhr. Je größer die Fläche eines Segments, ${valueOf(series[0])}.`;
    case "horizon": {
      const named = typeof view.baselineLabel === "string" ? view.baselineLabel.trim() : "";
      const first = `Eine Zeile je Reihe${series.length > 1 && series.length <= 8 ? ` (${or(series.map((f) => name(f)))})` : ""}, ${over(one(view.x))}.`;
      return named
        ? `${first} Werte über ${named} wachsen vom unteren Rand der Zeile, Werte darunter hängen vom oberen; je kräftiger der Farbton, desto weiter von ${named} entfernt.`
        : `${first} Werte über der Basislinie wachsen vom unteren Rand der Zeile, Werte darunter hängen vom oberen; je kräftiger der Farbton, desto weiter entfernt.`;
    }
    case "icicle":
      return `Die erste Spalte ist die Summe. Jede Spalte weiter rechts teilt die Blöcke weiter auf: Je höher ein Block, ${valueOf(one(view.value))}.`;
    case "dot": {
      const measures = many(view.value);
      if (measures.length > 1) return `Eine Zeile je ${noun(one(view.label))}, mit einem Punkt für ${list(measures.map((f) => name(f)))}. Je weiter rechts ein Punkt, desto höher der Wert; weit auseinanderliegende Punkte zeigen einen großen Unterschied.`;
      return `Eine Zeile je ${noun(one(view.label))}. Je weiter rechts der Punkt, ${valueOf(measures[0])}.`;
    }
    case "choropleth":
      if (one(view.category)) return `Eine Region der Karte je ${noun(one(view.id), "region")}, eingefärbt nach ${name(one(view.category))}; eine blasse Region hat keine Daten.`;
      return `Eine Region der Karte je ${noun(one(view.id), "region")}. Je kräftiger der Farbton, ${valueOf(one(view.value))}; eine blasse Region hat keine Daten.`;
    case "board": {
      const grouped = one(view.group) ? ` Der Punkt auf einer Karte zeigt ${name(one(view.group))}, wie die Legende erklärt.` : "";
      const valued = one(view.value) ? ` Die Zahl auf einer Karte ist ${name(one(view.value))}.` : "";
      return `Eine Spalte je ${noun(one(view.stage), "stage")}, mit der Zahl der Einträge darin; eine Karte je ${noun(one(view.label))}. Von links nach rechts gelesen sieht man, wie weit alles ist.${grouped}${valued}`;
    }
    case "symbols":
      return `Ein Kreis je ${noun(one(view.label) ?? one(view.id), "place")} auf der Karte. Je größer der Kreis, ${valueOf(one(view.size))}.${one(view.color) ? ` Jede Farbe steht für einen Wert von ${name(one(view.color))}.` : ""}`;
    case "locator":
      return `Eine Markierung je ${noun(one(view.label), "place")}, mit ihrem Namen daneben, an ihrem Ort auf der Karte.${one(view.color) ? ` Jede Farbe steht für einen Wert von ${name(one(view.color))}.` : ""}`;
    case "matrix": {
      const [x, y, size, color, mark] = [one(view.x), one(view.y), one(view.size), one(view.color), one(view.flag)];
      const axis = (field: string | undefined) => (field ? (distinctLabel(field, c.spec, [x, y, size, color, mark]) ?? noun(field)) : noun(field));
      const marks = [
        size ? `Je größer der Kreis, ${valueOf(size)}` : "",
        color ? `${size ? "je" : "Je"} kräftiger der Farbton, ${valueOf(color)}` : "",
        mark ? `${size || color ? "ein" : "Ein"} Quadrat bedeutet Ja für ${name(mark)}, ein blasser Punkt Nein` : "",
      ].filter(Boolean);
      return `Eine Zeile je ${axis(y)} und eine Spalte je ${axis(x)}; eine Markierung sitzt an ihrem Schnittpunkt. ${marks.length ? `${marks.join("; ")}. ` : ""}Ein leeres Feld heißt, dass es für dieses Paar nichts gibt.`;
    }
    case "strips": {
      const fields = many(view.value);
      const unit = unitIn(c);
      const dense = one(view.per) ? `, dann die Anzahl je ${name(one(view.per)).replace(/s$/, "")}` : "";
      const colored = fields.length > 1 ? `Die Farben zeigen die Art, der Reihe nach: ${list(fields.map((f) => name(f)))}; die Zahlen am Ende sind die Summe und der Anteil ${name(fields[0])}${dense}.` : `Die Zahl am Ende ist die Summe${dense}.`;
      return `Eine Zeile je ${noun(one(view.label))}, und jedes kleine Quadrat ist eine Einheit (${unit}), damit man sie zählen kann. ${colored} Steht ein Quadrat für mehr als eine Einheit, sagt es die Notiz unter dem Diagramm.`;
    }
    case "lifecycle": {
      const stages = many(view.stages);
      const extras = [
        view.today ? "die senkrechte Linie ist heute" : "",
        one(view.impact) ? `eine dickere Zeile bedeutet einen höheren Wert für ${name(one(view.impact))}` : "",
      ].filter(Boolean);
      const tail = extras.length ? ` ${extras.join(", ").replace(/^./, (ch) => ch.toUpperCase())}.` : "";
      return `Eine Zeile je ${noun(one(view.label))}, von links nach rechts in der Zeit; jeder Abschnitt ist eine Phase, der Reihe nach ${list(stages.map((f) => name(f)))}, ein blasser läuft noch.${tail}`;
    }
    case "whitespace":
      return `Eine Zeile je ${noun(one(view.row), "client")} und eine Spalte je ${noun(one(view.column), "product")}. Ein volles Quadrat heißt, das Produkt ist schon vorhanden, ein umrandetes, es wäre möglich (je kräftiger die Tönung, desto wahrscheinlicher), ein kleiner Punkt, es passt nicht. Das Zeilenende zählt Vorhandenes und noch zu Gewinnendes.`;
    case "xray":
      return `Diese Karte bündelt einen Eintrag (${noun(one(view.label), "client")}): die Kennzahlen${many(view.holdings).length ? ", die gehaltenen Produkte" : ""}${one(view.wallet) ? `, ${name(one(view.wallet))}` : ""}${one(view.trend) ? ", den jüngsten Trend" : ""}${one(view.flags) ? ", Punkte zur Beobachtung" : ""}${one(view.actions) ? " und die nächsten Schritte" : ""}.`;
    case "history":
      return `Ein Punkt je Ereignis, ${view.order === "asc" ? "das älteste zuerst" : "das neueste oben"}, mit Datum und Geschehen${one(view.amount) ? ` und rechts ${name(one(view.amount))}` : ""}.${one(view.kind) ? ` Jede Farbe und jeder Buchstabe steht für einen Wert von ${name(one(view.kind))}.` : ""}`;
    case "anomalies":
      return `Eine schmale Spur je ${noun(one(view.metric), "measure")}, ${over(one(view.x))}. Die Linie zeigt den Verlauf${one(view.low) && one(view.high) ? "; das blasse Band ist der erwartete Bereich" : ""}${one(view.expected) ? ", mit einer dünnen Linie für den Erwartungswert" : ""}. Ein gefüllter Punkt markiert eine Anomalie, einen Wert außerhalb des Bereichs. Die Spuren mit den meisten Anomalien stehen oben, jede endet mit ihrem letzten Wert und ihrer Anzahl.`;
    case "ragboard": {
      const changes = view.previous && typeof view.previous === "object" ? " Ein Pfeil zeigt eine Verbesserung oder Verschlechterung gegenüber der Vorperiode." : "";
      const first = view.overall === false ? "" : ` Die Spalte ${wordsFor(c.spec).overall} vorne zeigt den schlechtesten Status jeder Zeile.`;
      return `Eine Zeile je ${noun(one(view.label), "client")}, eine Spalte je Kriterium: ${list(many(view.dimensions).map((f) => name(f)))}. Ein Kreis bedeutet ${c.rag("G")}, ein Dreieck ${c.rag("A")}, ein Quadrat ${c.rag("R")}; die kritischsten Zeilen stehen oben.${first}${changes}`;
    }
    case "ragtrend":
      return `Eine Zeile je ${noun(one(view.label), "client")}, von links nach rechts gelesen, ${over(one(view.period))}. Ein gefüllter Kreis bedeutet ${c.rag("G")}, ein Dreieck ${c.rag("A")}, ein Quadrat ${c.rag("R")}; ein senkrechter Strich markiert einen Statuswechsel${one(view.note) ? ", und beim Zeigen darauf erscheint der Grund" : ""}. Das Etikett am Zeilenende zeigt den aktuellen Stand, die kritischsten Zeilen stehen oben.`;
    case "list":
      return `Eine Zeile je ${noun(one(view.label))}${one(view.value) ? `, mit ${name(one(view.value))} rechts` : ""}.`;
    case "table": {
      const columns = many(view.columns);
      const months = columns.filter((col) => /^\d{4}-\d{2}$/.test(col));
      const shape = columns[0] && months.length >= 2 && !months.includes(columns[0]) ? `Eine Zeile je ${noun(columns[0])} und eine Spalte je Monat.` : "Eine Zeile je Datensatz und eine Spalte je Angabe.";
      const shaded = columns.some((col) => {
        const format = c.spec.fields?.[col]?.format;
        return (typeof format === "object" ? (format as { type?: string }).type : format) === "heat";
      });
      const words = wordsFor(c.spec);
      const search = view.search ? " Tippen Sie ins Suchfeld, um nur passende Zeilen zu behalten." : "";
      const pages = typeof view.pageSize === "number" && view.pageSize >= 1 ? ` Es werden ${view.pageSize} Zeilen auf einmal gezeigt; ${words.next} und ${words.previous} blättern.` : "";
      const sort = view.sortable === false ? "" : " Klicken Sie auf eine Spaltenüberschrift, um danach zu sortieren.";
      const crowded = shaded && sort && search && pages;
      const opening = crowded ? `${shape.slice(0, -1)}, und je kräftiger die Tönung, desto größer die Zahl.` : `${shape}${shaded ? " Je kräftiger die Tönung, desto größer die Zahl." : ""}`;
      return `${opening}${sort}${search}${pages}`;
    }
    default:
      return "Jede Markierung steht für einen Wert. Je größer, länger oder kräftiger, desto höher der Wert.";
  }
}

/** A strip's unit in the language: the library's own default word, or the author's. */
function unitIn(c: Ctx): string {
  const own = typeof c.view.unit === "string" && c.view.unit ? c.view.unit : "provision";
  return NOUNS[own]?.[c.lang] ?? own;
}

// ---------------------------------------------------------------------------------------------------------------------
// One standout from the rows: a fact computed once, worded per language
// ---------------------------------------------------------------------------------------------------------------------

/** What the rows show, in no language: each kind is worded by `render`. */
type Fact =
  | { k: "none" }
  | { k: "top"; who: string; value: string; measure?: string }
  | { k: "share"; who: string; share: number }
  | { k: "partLead"; part: string; who: string; share: number }
  | { k: "total"; who: string; value: string }
  | { k: "vsGoal"; n: number; of: number; down: boolean }
  | { k: "goals"; n: number; of: number }
  | { k: "move"; who: string; from: string; to: string }
  | { k: "gap"; who: string; a: string; b: string }
  | { k: "trend"; measure: string; from: string; fromWhen: string; to: string; toWhen: string }
  | { k: "peak"; where: string; value: string; form: "day" | "cell" | "band" }
  | { k: "flow"; from: string; to: string; value: string }
  | { k: "funnel"; kept: string; of: string; first: string; last: string; share: number }
  | { k: "bridge"; start: string; end: string; up?: string; upV?: string; down?: string; downV?: string }
  | { k: "relation"; x: string; y: string; r: number; who?: string }
  | { k: "median"; measure: string; value: string }
  | { k: "range"; top: string; topV: string; bottom: string; bottomV: string }
  | { k: "kpi"; measure: string; value: string; change?: number }
  | { k: "kpis"; right: number; of: number; target?: { name: string; met: boolean; down: boolean; value: string } }
  | { k: "gauge"; value: string; target?: string }
  | { k: "timeline"; done: number; of: number }
  | { k: "likert"; who: string; share: number }
  | { k: "pyramid"; lead?: string; other?: string; a: number; b: number; widest: string }
  | { k: "dual"; a: string; aFrom: string; aTo: string; b: string; bFrom: string; bTo: string; together?: boolean }
  | { k: "lifecycle"; n: number; of: number; stage: string; mover?: string; moverStage?: string; moverDay?: string }
  | { k: "whitespace"; held: number; open: number; best?: string; bestV?: string }
  | { k: "ragboard"; red: number; amber: number; of: number; worst?: string }
  | { k: "ragtrend"; worse: number; better: number; of: number }
  | { k: "history"; n: number; latest: string; day: string }
  | { k: "anomalies"; hits: number; flagged: number; metrics: number; latest?: string; day?: string; value?: string; expected?: string }
  | { k: "matrixYes"; who: string; n: number; of: number }
  | { k: "matrixTop"; at: string; value: string }
  | { k: "strips"; who: string; total: string; share?: number; first?: string }
  | { k: "xray"; who: string; held?: number; of?: number; wallet?: string; walletShare?: number }
  | { k: "board"; n: number; of: number; stage: string; best?: string; bestV?: string };

/** How closely two numbers move together, from -1 to 1. */
function correlation(pairs: [number, number][]): number {
  const n = pairs.length;
  if (n < 2) return 0;
  const [mx, my] = [pairs.reduce((sum, [a]) => sum + a, 0) / n, pairs.reduce((sum, [, b]) => sum + b, 0) / n];
  let [sxy, sxx, syy] = [0, 0, 0];
  for (const [a, b] of pairs) {
    sxy += (a - mx) * (b - my);
    sxx += (a - mx) ** 2;
    syy += (b - my) ** 2;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
}

/** The middle value of a list. */
function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/** A region's name on the map's geometry when it is at hand (France for FR), else the code as written. */
function regionName(view: View, code: unknown, locale?: string): string {
  const collection = resolveGeo(view.geo);
  const key = typeof view.key === "string" ? view.key : "id";
  const wanted = normalizeId(code);
  const feature = collection?.features.find((f) => normalizeId(featureId(f, key)) === wanted);
  const given = feature ? featureName(feature, key) : String(code ?? "");
  return isCountryMap(view.geo) ? countryName(code, given, locale) : given;
}

/** The standout in the rows, for the view at hand. */
function factOf(c: Ctx): Fact {
  const { view, rows, text, value, top, bottom, fmt, name } = c;
  const series = many(view.y);
  const sum = (field: string) => rows.reduce((total, row) => total + Math.max(0, value(row, field) ?? 0), 0);
  const topOf = (label: string | undefined, field: string | undefined, measure?: string): Fact => {
    const row = top(field);
    return row && label && field ? { k: "top", who: text(row, label), value: text(row, field), ...(measure ? { measure } : {}) } : { k: "none" };
  };
  const shareOf = (label: string | undefined, field: string | undefined): Fact => {
    const row = top(field);
    const total = field ? sum(field) : 0;
    return row && label && field && total > 0 ? { k: "share", who: text(row, label), share: Math.max(0, value(row, field) ?? 0) / total } : { k: "none" };
  };
  const goals = (field: string | undefined, target: string | undefined): Fact => {
    if (!field || !target) return { k: "none" };
    const paired = rows.filter((row) => value(row, field) !== null && value(row, target) !== null);
    return paired.length ? { k: "goals", n: paired.filter((row) => (value(row, field) as number) >= (value(row, target) as number)).length, of: paired.length } : { k: "none" };
  };
  switch (view.type) {
    case "bar":
    case "line":
    case "area": {
      const x = one(view.x);
      if (!x) return { k: "none" };
      if (series.length > 1 && view.stacked === "percent") {
        let best: { row: Row; field: string; share: number } | undefined;
        for (const row of rows) {
          const total = series.reduce((s, f) => s + Math.max(0, value(row, f) ?? 0), 0);
          for (const field of series) {
            const share = total > 0 ? Math.max(0, value(row, field) ?? 0) / total : 0;
            if (!best || share > best.share) best = { row, field, share };
          }
        }
        return best && best.share > 0 ? { k: "partLead", part: name(best.field), who: text(best.row, x), share: best.share } : { k: "none" };
      }
      if (series.length > 1 && view.stacked && view.type === "bar") {
        const totals = rows.map((row) => series.reduce((s, f) => s + (value(row, f) ?? 0), 0));
        const row = rows[totals.indexOf(Math.max(...totals))];
        return row ? { k: "total", who: text(row, x), value: fmt(Math.max(...totals), series[0]) } : { k: "none" };
      }
      const single = series[0];
      if (view.type !== "bar" && single) {
        const known = rows.filter((row) => value(row, single) !== null);
        const [first, last] = [known[0], known.at(-1)];
        if (first && last && first !== last) return { k: "trend", measure: name(single), from: text(first, single), fromWhen: text(first, x), to: text(last, single), toWhen: text(last, x) };
        return { k: "none" };
      }
      const goal = one(view.lines);
      if (single && goal) {
        const paired = rows.filter((row) => value(row, single) !== null && value(row, goal) !== null);
        const down = view.goodWhen === "down";
        const met = paired.filter((row) => (down ? (value(row, single) as number) <= (value(row, goal) as number) : (value(row, single) as number) >= (value(row, goal) as number))).length;
        if (paired.length) return { k: "vsGoal", n: met, of: paired.length, down };
      }
      if (series.length > 1) {
        let best: { row: Row; field: string } | undefined;
        for (const row of rows) for (const field of series) if (value(row, field) !== null && (!best || (value(row, field) as number) > (value(best.row, best.field) as number))) best = { row, field };
        return best ? { k: "top", who: text(best.row, x), value: text(best.row, best.field), measure: name(best.field) } : { k: "none" };
      }
      return topOf(x, single);
    }
    case "hbar": {
      const fields = many(view.value);
      const label = one(view.label);
      if (label && fields.length > 1 && view.stacked) {
        const total = (row: Row) => fields.reduce((s, f) => s + Math.max(0, value(row, f) ?? 0), 0);
        const row = rows.reduce<Row | undefined>((b, r) => (b && total(b) >= total(r) ? b : r), undefined);
        return row ? { k: "total", who: text(row, label), value: fmt(total(row), fields[0]) } : { k: "none" };
      }
      return topOf(label, fields[0], fields.length > 1 ? name(fields[0]) : undefined);
    }
    case "pyramid": {
      const [label, left, right] = [one(view.label), one(view.left), one(view.right)];
      if (!label || !left || !right) return { k: "none" };
      const [a, b] = [sum(left), sum(right)];
      const size = (r: Row) => Math.max(0, value(r, left) ?? 0) + Math.max(0, value(r, right) ?? 0);
      const widest = rows.reduce<Row | undefined>((best, row) => (best && size(best) >= size(row) ? best : row), undefined);
      if (!widest || a + b === 0) return { k: "none" };
      return a === b ? { k: "pyramid", a: 0.5, b: 0.5, widest: text(widest, label) } : { k: "pyramid", lead: name(a > b ? left : right), other: name(a > b ? right : left), a: Math.max(a, b) / (a + b), b: Math.min(a, b) / (a + b), widest: text(widest, label) };
    }
    case "dual": {
      const [x, a, b] = [one(view.x), one(view.y), one(view.y2)];
      if (!x || !a || !b) return { k: "none" };
      const ends = (field: string) => {
        const known = rows.filter((row) => value(row, field) !== null);
        return [known[0], known.at(-1)] as const;
      };
      const [[a0, a1], [b0, b1]] = [ends(a), ends(b)];
      if (!a0 || !a1 || !b0 || !b1 || a0 === a1) return { k: "none" };
      const dirA = Math.sign((value(a1, a) as number) - (value(a0, a) as number));
      const dirB = Math.sign((value(b1, b) as number) - (value(b0, b) as number));
      return { k: "dual", a: name(a), aFrom: text(a0, a), aTo: text(a1, a), b: name(b), bFrom: text(b0, b), bTo: text(b1, b), ...(dirA && dirB ? { together: dirA === dirB } : {}) };
    }
    case "kpi": {
      const [field, compare] = [one(view.value), one(view.compare)];
      const row = rows.at(-1);
      if (!field || !row || value(row, field) === null) return { k: "none" };
      const before = compare ? value(row, compare) : rows.length > 1 ? value(rows.at(-2) as Row, field) : null;
      const now = value(row, field) as number;
      return { k: "kpi", measure: name(field), value: text(row, field), ...(before ? { change: (now - before) / Math.abs(before) } : {}) };
    }
    case "kpis": {
      // Did each tile move the right way since last time (down is right for a lower-is-better tile)?
      const items = (Array.isArray(view.items) ? view.items : []) as { value?: unknown; label?: unknown; goodWhen?: unknown; target?: unknown }[];
      const [before, now] = view.series ? [rows.at(-2), rows.at(-1)] : [undefined, rows[0]];
      if (!now || !before) return { k: "none" };
      const moves = items.filter((item) => typeof item.value === "string" && value(now, item.value) !== null && value(before, item.value) !== null);
      if (moves.length < 2) return { k: "none" };
      const right = moves.filter((item) => {
        const change = (value(now, item.value as string) as number) - (value(before, item.value as string) as number);
        return item.goodWhen === "down" ? change < 0 : change > 0;
      }).length;
      const targeted = items.find((item) => typeof item.target === "string" && typeof item.value === "string" && value(now, item.target as string) !== null && value(now, item.value as string) !== null);
      if (!targeted) return { k: "kpis", right, of: moves.length };
      const [field, goal] = [targeted.value as string, targeted.target as string];
      const down = targeted.goodWhen === "down";
      const met = down ? (value(now, field) as number) <= (value(now, goal) as number) : (value(now, field) as number) >= (value(now, goal) as number);
      const label = typeof targeted.label === "string" && targeted.label ? targeted.label : name(field);
      return { k: "kpis", right, of: moves.length, target: { name: label, met, down, value: fmt(value(now, goal) as number, field) } };
    }
    case "meter":
    case "rings":
    case "bullet":
      return goals(one(view.value), one(view.target));
    case "donut":
    case "pie":
    case "waffle":
    case "treemap":
    case "pareto":
      return shareOf(one(view.label), one(view.value));
    case "funnel": {
      const [label, field] = [one(view.label), one(view.value)];
      const [first, last] = [rows[0], rows.at(-1)];
      if (!label || !field || !first || !last || first === last) return { k: "none" };
      const [a, b] = [value(first, field), value(last, field)];
      return a && b !== null ? { k: "funnel", kept: text(last, field), of: text(first, field), first: text(first, label), last: text(last, label), share: b / a } : { k: "none" };
    }
    case "waterfall": {
      const [label, field] = [one(view.label), one(view.value)];
      if (!label || !field || rows.length < 2) return { k: "none" };
      const totals = new Set(many(view.totals));
      const steps = rows.filter((row) => !totals.has(String(row[label])) && value(row, field) !== null);
      const up = steps.reduce<Row | undefined>((b, r) => ((value(r, field) as number) > 0 && (!b || (value(r, field) as number) > (value(b, field) as number)) ? r : b), undefined);
      const down = steps.reduce<Row | undefined>((b, r) => ((value(r, field) as number) < 0 && (!b || (value(r, field) as number) < (value(b, field) as number)) ? r : b), undefined);
      const start = rows[0] as Row;
      const end = typeof view.endLabel === "string" ? fmt(rows.reduce((s, r, i) => (i === 0 || !totals.has(String(r[label])) ? s + (value(r, field) ?? 0) : s), 0), field) : text(rows.at(-1) as Row, field);
      return { k: "bridge", start: text(start, field), end, ...(up ? { up: text(up, label), upV: text(up, field) } : {}), ...(down ? { down: text(down, label), downV: fmt(Math.abs(value(down, field) as number), field) } : {}) };
    }
    case "scatter": {
      const [x, y, label] = [one(view.x), one(view.y), one(view.label)];
      if (!x || !y) return { k: "none" };
      const pairs = rows.map((row) => [value(row, x), value(row, y)]).filter((p): p is [number, number] => p[0] !== null && p[1] !== null);
      const highest = top(y);
      return { k: "relation", x: name(x), y: name(y), r: correlation(pairs), ...(highest && label ? { who: text(highest, label) } : {}) };
    }
    case "heatmap":
    case "calendar": {
      const field = one(view.value);
      const row = top(field);
      if (!row || !field) return { k: "none" };
      const where = view.type === "calendar" ? c.day(row, one(view.date) ?? "date") : `${text(row, one(view.y) ?? "")} · ${text(row, one(view.x) ?? "")}`;
      return { k: "peak", where, value: text(row, field), form: view.type === "calendar" ? "day" : "cell" };
    }
    case "sankey":
    case "chord": {
      const [source, target, field] = [one(view.source), one(view.target), one(view.value)];
      const row = top(field);
      return row && source && target && field ? { k: "flow", from: text(row, source), to: text(row, target), value: text(row, field) } : { k: "none" };
    }
    case "dumbbell":
    case "slope": {
      const [label, from, to] = [one(view.label), one(view.from), one(view.to)];
      if (!label || !from || !to) return { k: "none" };
      const moved = (row: Row) => Math.abs((value(row, to) ?? 0) - (value(row, from) ?? 0));
      const row = rows.filter((r) => value(r, from) !== null && value(r, to) !== null).reduce<Row | undefined>((b, r) => (b && moved(b) >= moved(r) ? b : r), undefined);
      if (!row) return { k: "none" };
      return view.type === "slope" || (PERIOD.test(from) && PERIOD.test(to)) ? { k: "move", who: text(row, label), from: text(row, from), to: text(row, to) } : { k: "gap", who: text(row, label), a: text(row, from), b: text(row, to) };
    }
    case "bump": {
      const [x, who, field] = [one(view.x), one(view.series), one(view.value)];
      if (!x || !who || !field) return { k: "none" };
      // The leader in the latest period.
      const last = rows.filter((row) => String(row[x]) === String(rows.at(-1)?.[x]));
      return last.length ? topOfRows(c, last, who, field) : { k: "none" };
    }
    case "histogram":
    case "boxplot":
    case "beeswarm":
    case "ridgeline": {
      const field = one(view.value);
      const values = field ? rows.map((row) => value(row, field)).filter((n): n is number => n !== null) : [];
      return field && values.length ? { k: "median", measure: name(field), value: fmt(medianOf(values), field) } : { k: "none" };
    }
    case "variance": {
      const [label, field, target] = [one(view.label), one(view.value), one(view.target)];
      if (!label || !field || !target) return { k: "none" };
      const gap = (row: Row) => Math.abs((value(row, field) ?? 0) - (value(row, target) ?? 0));
      const row = rows.reduce<Row | undefined>((b, r) => (b && gap(b) >= gap(r) ? b : r), undefined);
      return row ? { k: "gap", who: text(row, label), a: text(row, field), b: text(row, target) } : { k: "none" };
    }
    case "marimekko": {
      const [x, field] = [one(view.x), one(view.value)];
      if (!x || !field) return { k: "none" };
      const totals = new Map<string, number>();
      for (const row of rows) totals.set(text(row, x), (totals.get(text(row, x)) ?? 0) + Math.max(0, value(row, field) ?? 0));
      const best = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
      return best ? { k: "total", who: best[0], value: fmt(best[1], field) } : { k: "none" };
    }
    case "gauge": {
      const [field, target] = [one(view.value), one(view.target)];
      const row = rows.at(-1);
      return row && field ? { k: "gauge", value: text(row, field), ...(target && value(row, target) !== null ? { target: text(row, target) } : {}) } : { k: "none" };
    }
    case "candlestick": {
      const [x, close] = [one(view.x), one(view.close)];
      const [first, last] = [rows[0], rows.at(-1)];
      return x && close && first && last && first !== last ? { k: "trend", measure: name(close), from: text(first, close), fromWhen: text(first, x), to: text(last, close), toWhen: text(last, x) } : { k: "none" };
    }
    case "timeline": {
      const progress = one(view.progress);
      if (!progress) return { k: "none" };
      const known = rows.filter((row) => value(row, progress) !== null);
      return known.length ? { k: "timeline", done: known.filter((row) => (value(row, progress) as number) >= 1 || (value(row, progress) as number) >= 100).length, of: known.length } : { k: "none" };
    }
    case "likert": {
      const [label, answers] = [one(view.label), many(view.value)];
      if (!label || answers.length < 2) return { k: "none" };
      const agreeing = answers.slice(Math.ceil(answers.length / 2));
      const share = (row: Row) => {
        const total = answers.reduce((s, f) => s + Math.max(0, value(row, f) ?? 0), 0);
        return total ? agreeing.reduce((s, f) => s + Math.max(0, value(row, f) ?? 0), 0) / total : 0;
      };
      const row = rows.reduce<Row | undefined>((b, r) => (b && share(b) >= share(r) ? b : r), undefined);
      return row ? { k: "likert", who: text(row, label), share: share(row) } : { k: "none" };
    }
    case "radar":
    case "rose":
    case "sunburst":
    case "icicle": {
      const label = view.type === "sunburst" || view.type === "icicle" ? many(view.levels)[0] : one(view.label);
      const field = series[0] ?? one(view.value);
      if (!label || !field) return { k: "none" };
      if (view.type === "sunburst" || view.type === "icicle") {
        const totals = new Map<string, number>();
        for (const row of rows) totals.set(text(row, label), (totals.get(text(row, label)) ?? 0) + Math.max(0, value(row, field) ?? 0));
        const all = [...totals.values()].reduce((s, n) => s + n, 0);
        const best = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
        return best && all ? { k: "share", who: best[0], share: best[1] / all } : { k: "none" };
      }
      return topOf(label, field);
    }
    case "horizon": {
      const [x] = [one(view.x)];
      let best: { row: Row; field: string } | undefined;
      for (const row of rows) for (const field of series) if (value(row, field) !== null && (!best || Math.abs(value(row, field) as number) > Math.abs(value(best.row, best.field) as number))) best = { row, field };
      return best && x ? { k: "peak", where: `${name(best.field)} · ${text(best.row, x)}`, value: text(best.row, best.field), form: "band" } : { k: "none" };
    }
    case "dot": {
      const [label, measures] = [one(view.label), many(view.value)];
      return topOf(label, measures[0], measures.length > 1 ? name(measures[0]) : undefined);
    }
    case "choropleth": {
      const [id, field] = [one(view.id), one(view.value)];
      if (!id || !field) return { k: "none" };
      const [hi, lo] = [top(field), bottom(field)];
      return hi && lo && hi !== lo ? { k: "range", top: regionName(view, hi[id], c.spec.locale), topV: text(hi, field), bottom: regionName(view, lo[id], c.spec.locale), bottomV: text(lo, field) } : { k: "none" };
    }
    case "symbols": {
      const [id, label, field] = [one(view.id), one(view.label), one(view.size)];
      const row = top(field);
      return row && field ? { k: "top", who: label ? text(row, label) : regionName(view, id ? row[id] : "", c.spec.locale), value: text(row, field) } : { k: "none" };
    }
    case "locator":
      return { k: "none" };
    case "list":
      return topOf(one(view.label), one(view.value));
    case "table": {
      const columns = many(view.columns).length ? many(view.columns) : Object.keys(rows[0] ?? {});
      const label = columns.find((col) => rows.some((row) => typeof row[col] === "string" && readNumber(row[col]) === null));
      const field = columns.find((col) => col !== label && rows.every((row) => row[col] === null || row[col] === undefined || readNumber(row[col]) !== null));
      return topOf(label, field, field ? name(field) : undefined);
    }
    case "board": {
      const [label, stage, field] = [one(view.label), one(view.stage), one(view.value)];
      if (!label || !stage) return { k: "none" };
      const counts = new Map<string, number>();
      for (const row of rows) counts.set(text(row, stage), (counts.get(text(row, stage)) ?? 0) + 1);
      const busiest = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const best = top(field);
      return busiest ? { k: "board", n: busiest[1], of: rows.length, stage: busiest[0], ...(best && field ? { best: text(best, label), bestV: text(best, field) } : {}) } : { k: "none" };
    }
    case "matrix": {
      const [x, y, size, color, mark] = [one(view.x), one(view.y), one(view.size), one(view.color), one(view.flag)];
      if (!x || !y) return { k: "none" };
      const columns = new Set(rows.map((row) => text(row, x))).size;
      if (mark) {
        const yes = new Map<string, number>();
        for (const row of rows) if (isYes(row[mark])) yes.set(text(row, y), (yes.get(text(row, y)) ?? 0) + 1);
        const best = [...yes.entries()].sort((a, b) => b[1] - a[1])[0];
        return best ? { k: "matrixYes", who: best[0], n: best[1], of: columns } : { k: "none" };
      }
      const field = size ?? color;
      const row = top(field);
      return row && field ? { k: "matrixTop", at: `${text(row, y)} · ${text(row, x)}`, value: text(row, field) } : { k: "none" };
    }
    case "strips": {
      const [label, fields] = [one(view.label), many(view.value)];
      if (!label || !fields.length) return { k: "none" };
      const total = (row: Row) => fields.reduce((s, f) => s + Math.max(0, value(row, f) ?? 0), 0);
      const row = rows.reduce<Row | undefined>((b, r) => (b && total(b) >= total(r) ? b : r), undefined);
      if (!row || !total(row)) return { k: "none" };
      return { k: "strips", who: text(row, label), total: fmt(total(row), undefined), ...(fields.length > 1 ? { share: Math.max(0, value(row, fields[0] as string) ?? 0) / total(row), first: name(fields[0]) } : {}) };
    }
    case "lifecycle": {
      const [label, stages] = [one(view.label), many(view.stages)];
      const last = stages.at(-1);
      if (!label || !last || stages.length < 2) return { k: "none" };
      const reached = rows.filter((row) => timeOf(row[last]) !== null).length;
      const lastDate = (row: Row) => Math.max(...stages.map((field) => timeOf(row[field]) ?? -Infinity));
      const mover = rows.reduce<Row | undefined>((b, r) => (b && lastDate(b) >= lastDate(r) ? b : r), undefined);
      const stage = mover ? stages.filter((field) => timeOf(mover[field]) !== null).at(-1) : undefined;
      return { k: "lifecycle", n: reached, of: rows.length, stage: name(last), ...(mover && stage && Number.isFinite(lastDate(mover)) ? { mover: text(mover, label), moverStage: name(stage), moverDay: c.day(mover, stage) } : {}) };
    }
    case "whitespace": {
      const [client, state, amount] = [one(view.row), one(view.state), one(view.value)];
      if (!client || !state) return { k: "none" };
      const names = Array.isArray(view.states) && view.states.length === 3 ? view.states.map(String) : ["Holds", "Opportunity", "Not eligible"];
      const held = rows.filter((r) => String(r[state]) === names[0]).length;
      const open = rows.filter((r) => String(r[state]) === names[1]);
      const potential = new Map<string, number>();
      for (const r of open) potential.set(text(r, client), (potential.get(text(r, client)) ?? 0) + (amount ? (value(r, amount) ?? 0) : 1));
      const best = [...potential.entries()].sort((a, b) => b[1] - a[1])[0];
      return held || open.length ? { k: "whitespace", held, open: open.length, ...(best && amount && best[1] > 0 ? { best: best[0], bestV: fmt(best[1], amount) } : {}) } : { k: "none" };
    }
    case "xray": {
      const [label, wallet] = [one(view.label), one(view.wallet)];
      const row = rows[0];
      if (!label || !row) return { k: "none" };
      const holdings = many(view.holdings);
      const held = holdings.filter((f) => isYes(row[f])).length;
      const share = wallet ? value(row, wallet) : null;
      return { k: "xray", who: text(row, label), ...(holdings.length ? { held, of: holdings.length } : {}), ...(wallet && share !== null ? { wallet: name(wallet), walletShare: Math.min(1, share > 1 ? share / 100 : share) } : {}) };
    }
    case "history": {
      const [date, title] = [one(view.date), one(view.title)];
      if (!date || !title) return { k: "none" };
      const dated = rows.filter((r) => /^\d{4}-\d{2}-\d{2}/.test(String(r[date] ?? "")));
      if (!dated.length) return { k: "none" };
      const latest = dated.reduce((b, r) => (String(r[date]) > String(b[date]) ? r : b));
      return { k: "history", n: dated.length, latest: text(latest, title), day: c.day(latest, date) };
    }
    case "anomalies": {
      const [x, metric, field, low, high, flag, expected] = [one(view.x), one(view.metric), one(view.value), one(view.low), one(view.high), one(view.flag), one(view.expected)];
      if (!x || !metric || !field) return { k: "none" };
      const flagged = (row: Row) => {
        if (flag) return isYes(row[flag]);
        const [v, lo, hi] = [value(row, field), low ? value(row, low) : null, high ? value(row, high) : null];
        return v !== null && lo !== null && hi !== null && (v < lo || v > hi);
      };
      const hits = rows.filter(flagged);
      const metrics = new Set(rows.map((row) => String(row[metric]))).size;
      if (!hits.length) return { k: "anomalies", hits: 0, flagged: 0, metrics };
      const latest = hits.reduce((a, b) => (String(b[x]) > String(a[x]) ? b : a));
      return { k: "anomalies", hits: hits.length, flagged: new Set(hits.map((row) => String(row[metric]))).size, metrics, latest: text(latest, metric), day: c.day(latest, x), value: text(latest, field), ...(expected && value(latest, expected) !== null ? { expected: text(latest, expected) } : {}) };
    }
    case "ragboard": {
      const [label, dims] = [one(view.label), many(view.dimensions)];
      if (!label || !dims.length || !rows.length) return { k: "none" };
      const overallOf = (row: Row): Rag => (typeof view.overall === "string" && view.overall ? ragOf(row[view.overall]) : worstOf(dims.map((f) => ragOf(row[f]))));
      const red = rows.filter((row) => overallOf(row) === "R").length;
      const amber = rows.filter((row) => overallOf(row) === "A").length;
      // The same client the English names: the most reds across the dimensions, then the most ambers.
      const count = (row: Row, status: Rag) => dims.filter((f) => ragOf(row[f]) === status).length;
      const worst = [...rows].sort((a, b) => count(b, "R") - count(a, "R") || count(b, "A") - count(a, "A") || ragRank(overallOf(a)) - ragRank(overallOf(b)))[0];
      return { k: "ragboard", red, amber, of: rows.length, ...(worst && overallOf(worst) === "R" ? { worst: text(worst, label) } : {}) };
    }
    case "ragtrend": {
      const [label, period, status] = [one(view.label), one(view.period), one(view.status)];
      if (!label || !period || !status) return { k: "none" };
      const runs = new Map<string, Row[]>();
      for (const row of rows) runs.set(text(row, label), [...(runs.get(text(row, label)) ?? []), row]);
      const order = (row: Row) => periodTime(String(row[period] ?? "")) ?? 0;
      let [worse, better] = [0, 0];
      for (const list of runs.values()) {
        const sorted = [...list].sort((a, b) => order(a) - order(b));
        const [first, last] = [sorted[0], sorted.at(-1)];
        if (!first || !last || first === last) continue;
        const trend = ragTrend(ragOf(first[status]), ragOf(last[status]));
        if (trend === "worse") worse++;
        else if (trend === "improved") better++;
      }
      return { k: "ragtrend", worse, better, of: runs.size };
    }
    default:
      return { k: "none" };
  }
}

/** The top row among some rows, by a field. */
function topOfRows(c: Ctx, rows: Row[], label: string, field: string): Fact {
  const row = rows.filter((r) => c.value(r, field) !== null).reduce<Row | undefined>((b, r) => (b && (c.value(b, field) as number) >= (c.value(r, field) as number) ? b : r), undefined);
  return row ? { k: "top", who: c.text(row, label), value: c.text(row, field) } : { k: "none" };
}

/** A fact, worded in French or German. Empty when there is nothing clear to point at. */
function render(c: Ctx, fact: Fact): string {
  return c.lang === "fr" ? renderFr(c, fact) : renderDe(c, fact);
}

function renderFr(c: Ctx, f: Fact): string {
  const pct = c.pct;
  /** The singular or the plural form, by the count. */
  const n1 = (n: number, one: string, many: string) => (n === 1 ? one : many);
  switch (f.k) {
    case "none":
      return "";
    case "top":
      return f.measure ? `Ici, ${f.who} arrive en tête pour ${f.measure}, avec ${f.value}.` : `Ici, ${f.who} arrive en tête, avec ${f.value}.`;
    case "share":
      return `Ici, ${f.who} représente la plus grande part, avec ${pct(f.share)} du total.`;
    case "partLead":
      return `Ici, la plus grande part revient à ${f.part} pour ${f.who}, avec ${pct(f.share)}.`;
    case "total":
      return `Ici, ${f.who} a le total le plus élevé, avec ${f.value}.`;
    case "vsGoal":
      return f.down ? `Ici, la limite est respectée dans ${f.n} cas sur ${f.of}.` : `Ici, l'objectif est atteint dans ${f.n} cas sur ${f.of}.`;
    case "goals":
      return f.n === f.of ? `Ici, les ${f.of} objectifs sont tous atteints.` : f.n === 0 ? `Ici, aucun des ${f.of} objectifs n'est encore atteint.` : f.n === 1 ? `Ici, 1 objectif sur ${f.of} est atteint.` : `Ici, ${f.n} objectifs sur ${f.of} sont atteints.`;
    case "move":
      return `Ici, ${f.who} a le plus évolué, de ${f.from} à ${f.to}.`;
    case "gap":
      return `Ici, ${f.who} présente le plus grand écart : ${f.a} contre ${f.b}.`;
    case "trend":
      return `Ici, ${f.measure} évolue de ${f.from} (${f.fromWhen}) à ${f.to} (${f.toWhen}).`;
    case "peak":
      return f.form === "day" ? `Ici, la journée la plus forte est le ${f.where}, avec ${f.value}.` : f.form === "band" ? `Ici, l'écart le plus marqué concerne ${f.where}, avec ${f.value}.` : `Ici, la case la plus forte est ${f.where}, avec ${f.value}.`;
    case "flow":
      return `Ici, le flux le plus important va de ${f.from} à ${f.to}, avec ${f.value}.`;
    case "funnel":
      return `Ici, ${f.kept} sur ${f.of} sont allés de ${f.first} à ${f.last} (${pct(f.share)}).`;
    case "bridge": {
      const moves = [f.up ? `${f.up} a le plus ajouté (${f.upV})` : "", f.down ? `${f.down} a le plus retiré (${f.downV})` : ""].filter(Boolean);
      return `Ici, on passe de ${f.start} à ${f.end}${moves.length ? ` : ${moves.join(" et ")}` : ""}.`;
    }
    case "relation": {
      const said = f.r > 0.6 ? `${f.x} et ${f.y} augmentent ensemble` : f.r > 0.3 ? `${f.x} et ${f.y} tendent à augmenter ensemble, sans que ce soit systématique` : f.r < -0.3 ? `quand ${f.x} augmente, ${f.y} tend à baisser` : `${f.x} et ${f.y} ne semblent pas liés`;
      return `Ici, ${said}.${f.who ? ` ${f.who} se situe le plus haut.` : ""}`;
    }
    case "median":
      return `Ici, la valeur médiane ${de(f.measure)} est ${f.value}.`;
    case "range":
      return `Ici, ${f.top} a la valeur la plus élevée, avec ${f.topV}, et ${f.bottom} la plus faible, avec ${f.bottomV}.`;
    case "kpi":
      return `Ici, ${f.measure} s'établit à ${f.value}${f.change === undefined || f.change === 0 ? "" : `, ${f.change > 0 ? "en hausse" : "en baisse"} de ${pct(Math.abs(f.change))} par rapport à la dernière fois`}.`;
    case "kpis": {
      const moved = f.right === f.of ? "Ici, tous les chiffres ont évolué dans le bon sens depuis la dernière fois." : `Ici, ${f.right} chiffre${f.right === 1 ? "" : "s"} sur ${f.of} ${f.right === 1 ? "a" : "ont"} évolué dans le bon sens depuis la dernière fois.`;
      if (!f.target) return moved;
      const above = f.target.down ? !f.target.met : f.target.met;
      return `${moved} ${f.target.name.charAt(0).toUpperCase()}${f.target.name.slice(1)} se situe ${above ? "au-dessus" : "en dessous"} de son objectif de ${f.target.value}.`;
    }
    case "gauge":
      return `Ici, l'aiguille indique ${f.value}${f.target ? `, pour un objectif de ${f.target}` : ""}.`;
    case "timeline":
      return f.done === 1 ? `Ici, 1 tâche sur ${f.of} est terminée.` : `Ici, ${f.done} tâches sur ${f.of} sont terminées.`;
    case "likert":
      return `Ici, ${f.who} recueille le plus d'adhésion, avec ${pct(f.share)} d'accord.`;
    case "pyramid":
      return f.lead ? `Ici, ${f.lead} l'emporte sur ${f.other} au total, ${pct(f.a)} contre ${pct(f.b)}, et la tranche la plus large est ${f.widest}.` : `Ici, les deux côtés sont à égalité au total, et la tranche la plus large est ${f.widest}.`;
    case "dual":
      return `Ici, ${f.a} passe de ${f.aFrom} à ${f.aTo} et ${f.b} de ${f.bFrom} à ${f.bTo}${f.together === undefined ? "" : f.together ? ", dans le même sens" : ", en sens inverse"}.`;
    case "lifecycle":
      return `Ici, ${f.n} sur ${f.of} ${n1(f.n, "a", "ont")} atteint l'étape ${f.stage}${f.mover ? ` ; ${f.mover} a avancé en dernier, à l'étape ${f.moverStage} le ${f.moverDay}` : ""}.`;
    case "whitespace":
      return `Ici, ${f.held} ${n1(f.held, "case est détenue", "cases sont détenues")} et ${f.open} ${n1(f.open, "ouverte", "ouvertes")}${f.best ? ` ; ${f.best} a le plus à gagner, ${f.bestV}` : ""}.`;
    case "ragboard":
      return `Ici, ${f.red} sur ${f.of} ${n1(f.red, "est", "sont")} ${c.rag("R")} et ${f.amber} ${n1(f.amber, "autre", "autres")} ${c.rag("A")}${f.worst ? ` ; ${f.worst} est le plus critique` : ""}.`;
    case "ragtrend":
      return `Ici, ${f.worse} sur ${f.of} ${n1(f.worse, "s'est dégradé", "se sont dégradés")} sur la période et ${f.better} ${n1(f.better, "s'est amélioré", "se sont améliorés")}.`;
    case "history":
      return `Ici, on compte ${f.n} ${n1(f.n, "événement", "événements")} ; le plus récent est ${f.latest}, le ${f.day}.`;
    case "anomalies":
      return !f.hits
        ? `Ici, aucune des ${f.metrics} mesures n'est sortie de sa plage attendue.`
        : `Ici, ${f.hits} relevé${f.hits === 1 ? " est sorti de sa" : "s sont sortis de leur"} plage, ${f.flagged === f.metrics ? `sur l'ensemble des ${f.metrics} mesures` : `sur ${f.flagged} des ${f.metrics} mesures`} ; le dernier concerne ${f.latest}, le ${f.day}, à ${f.value}${f.expected ? ` pour ${f.expected} attendus` : ""}.`;
    case "matrixYes":
      return `Ici, ${f.who} s'applique à ${f.n} colonnes sur ${f.of}, plus que toute autre ligne.`;
    case "matrixTop":
      return `Ici, la marque la plus forte se trouve en ${f.at}, avec ${f.value}.`;
    case "strips":
      return `Ici, ${f.who} compte le plus d'unités : ${f.total}${f.share !== undefined ? `, dont ${pct(f.share)} ${de(String(f.first))}` : ""}.`;
    case "xray": {
      const parts = [f.held !== undefined ? `détient ${f.held} produits sur ${f.of}` : "", f.wallet && f.walletShare !== undefined ? `affiche ${pct(f.walletShare)} pour ${f.wallet}` : ""].filter(Boolean);
      return parts.length ? `Ici, ${f.who} ${parts.join(" et ")}.` : `Ici, la fiche est celle de ${f.who}.`;
    }
    case "board":
      return `Ici, ${f.n} sur ${f.of} ${n1(f.n, "se trouve", "se trouvent")} à l'étape ${f.stage}${f.best ? `, et ${f.best} a la valeur la plus élevée, ${f.bestV}` : ""}.`;
  }
}

function renderDe(c: Ctx, f: Fact): string {
  const pct = c.pct;
  /** The singular or the plural form, by the count. */
  const n1 = (n: number, one: string, many: string) => (n === 1 ? one : many);
  switch (f.k) {
    case "none":
      return "";
    case "top":
      return f.measure ? `Hier liegt ${f.who} bei ${f.measure} vorn, mit ${f.value}.` : `Hier liegt ${f.who} vorn, mit ${f.value}.`;
    case "share":
      return `Hier hat ${f.who} den größten Anteil, mit ${pct(f.share)} des Ganzen.`;
    case "partLead":
      return `Hier ist ${f.part} bei ${f.who} der größte Anteil, mit ${pct(f.share)}.`;
    case "total":
      return `Hier hat ${f.who} die höchste Summe, mit ${f.value}.`;
    case "vsGoal":
      return f.down ? `Hier wird die Grenze in ${f.n} von ${f.of} Fällen eingehalten.` : `Hier wird das Ziel in ${f.n} von ${f.of} Fällen erreicht.`;
    case "goals":
      return f.n === f.of ? `Hier sind alle ${f.of} Ziele erreicht.` : f.n === 0 ? `Hier ist noch keines der ${f.of} Ziele erreicht.` : f.n === 1 ? `Hier ist 1 von ${f.of} Zielen erreicht.` : `Hier sind ${f.n} von ${f.of} Zielen erreicht.`;
    case "move":
      return `Hier hat sich ${f.who} am stärksten verändert, von ${f.from} auf ${f.to}.`;
    case "gap":
      return `Hier hat ${f.who} den größten Abstand: ${f.a} gegenüber ${f.b}.`;
    case "trend":
      return `Hier entwickelt sich ${f.measure} von ${f.from} (${f.fromWhen}) auf ${f.to} (${f.toWhen}).`;
    case "peak":
      return f.form === "day" ? `Hier war der ${f.where} der stärkste Tag, mit ${f.value}.` : f.form === "band" ? `Hier zeigt sich der größte Ausschlag bei ${f.where}, mit ${f.value}.` : `Hier ist das stärkste Feld ${f.where}, mit ${f.value}.`;
    case "flow":
      return `Hier fließt am meisten von ${f.from} zu ${f.to}, nämlich ${f.value}.`;
    case "funnel":
      return `Hier sind ${f.kept} von ${f.of} von ${f.first} bis ${f.last} gekommen (${pct(f.share)}).`;
    case "bridge": {
      const moves = [f.up ? `${f.up} hat am meisten beigetragen (${f.upV})` : "", f.down ? `${f.down} hat am meisten gekostet (${f.downV})` : ""].filter(Boolean);
      return `Hier geht es von ${f.start} auf ${f.end}${moves.length ? `: ${moves.join(", ")}` : ""}.`;
    }
    case "relation": {
      const said = f.r > 0.6 ? `steigen ${f.x} und ${f.y} gemeinsam` : f.r > 0.3 ? `steigen ${f.x} und ${f.y} tendenziell gemeinsam, aber nicht immer` : f.r < -0.3 ? `sinkt ${f.y} tendenziell, wenn ${f.x} steigt` : `scheinen ${f.x} und ${f.y} nicht zusammenzuhängen`;
      return `Hier ${said}.${f.who ? ` ${f.who} liegt am höchsten.` : ""}`;
    }
    case "median":
      return `Hier liegt der Median von ${f.measure} bei ${f.value}.`;
    case "range":
      return `Hier hat ${f.top} den höchsten Wert, mit ${f.topV}, und ${f.bottom} den niedrigsten, mit ${f.bottomV}.`;
    case "kpi":
      return `Hier liegt ${f.measure} bei ${f.value}${f.change === undefined || f.change === 0 ? "" : `, ${f.change > 0 ? "ein Plus" : "ein Minus"} von ${pct(Math.abs(f.change))} gegenüber dem letzten Mal`}.`;
    case "kpis": {
      const moved = f.right === f.of ? "Hier haben sich alle Kennzahlen seit dem letzten Mal in die richtige Richtung bewegt." : `Hier ${f.right === 1 ? "hat" : "haben"} sich ${f.right} von ${f.of} Kennzahlen seit dem letzten Mal in die richtige Richtung bewegt.`;
      if (!f.target) return moved;
      const above = f.target.down ? !f.target.met : f.target.met;
      return `${moved} ${f.target.name.charAt(0).toUpperCase()}${f.target.name.slice(1)} liegt ${above ? "über" : "unter"} dem Ziel von ${f.target.value}.`;
    }
    case "gauge":
      return `Hier zeigt die Nadel ${f.value}${f.target ? `, bei einem Ziel von ${f.target}` : ""}.`;
    case "timeline":
      return f.done === 1 ? `Hier ist 1 von ${f.of} Aufgaben abgeschlossen.` : `Hier sind ${f.done} von ${f.of} Aufgaben abgeschlossen.`;
    case "likert":
      return `Hier findet ${f.who} die meiste Zustimmung, mit ${pct(f.share)}.`;
    case "pyramid":
      return f.lead ? `Hier überwiegt ${f.lead} gegenüber ${f.other} insgesamt, ${pct(f.a)} zu ${pct(f.b)}, und das breiteste Band ist ${f.widest}.` : `Hier sind beide Seiten insgesamt gleichauf, und das breiteste Band ist ${f.widest}.`;
    case "dual":
      return `Hier geht ${f.a} von ${f.aFrom} auf ${f.aTo} und ${f.b} von ${f.bFrom} auf ${f.bTo}${f.together === undefined ? "" : f.together ? ", in dieselbe Richtung" : ", in entgegengesetzte Richtungen"}.`;
    case "lifecycle":
      return `Hier ${n1(f.n, "hat", "haben")} ${f.n} von ${f.of} die Phase ${f.stage} erreicht${f.mover ? `; zuletzt ist ${f.mover} vorangekommen, in die Phase ${f.moverStage} am ${f.moverDay}` : ""}.`;
    case "whitespace":
      return `Hier ${n1(f.held, "ist 1 Feld", `sind ${f.held} Felder`)} vorhanden und ${f.open} offen${f.best ? `; ${f.best} hat am meisten zu gewinnen, ${f.bestV}` : ""}.`;
    case "ragboard":
      return `Hier ${n1(f.red, "ist", "sind")} ${f.red} von ${f.of} ${c.rag("R")} und weitere ${f.amber} ${c.rag("A")}${f.worst ? `; ${f.worst} steht am schlechtesten` : ""}.`;
    case "ragtrend":
      return `Hier ${n1(f.worse, "hat", "haben")} sich ${f.worse} von ${f.of} im Zeitraum verschlechtert und ${f.better} verbessert.`;
    case "history":
      return `Hier gibt es ${f.n} ${n1(f.n, "Ereignis", "Ereignisse")}; das jüngste ist ${f.latest} am ${f.day}.`;
    case "anomalies":
      return !f.hits
        ? `Hier lag keine der ${f.metrics} Kennzahlen außerhalb ihres erwarteten Bereichs.`
        : `Hier ${f.hits === 1 ? "lag 1 Wert" : `lagen ${f.hits} Werte`} außerhalb ihres Bereichs, ${f.flagged === f.metrics ? `bei allen ${f.metrics} Kennzahlen` : `bei ${f.flagged} von ${f.metrics} Kennzahlen`}; zuletzt ${f.latest} am ${f.day}, mit ${f.value}${f.expected ? ` bei erwarteten ${f.expected}` : ""}.`;
    case "matrixYes":
      return `Hier gilt ${f.who} für ${f.n} von ${f.of} Spalten, mehr als jede andere Zeile.`;
    case "matrixTop":
      return `Hier ist die stärkste Markierung bei ${f.at}, mit ${f.value}.`;
    case "strips":
      return `Hier hat ${f.who} die meisten Einheiten: ${f.total}${f.share !== undefined ? `, davon ${pct(f.share)} ${f.first}` : ""}.`;
    case "xray": {
      // German puts the verb second: "Hier hält Aldana Holdings 3 von 8 Produkten und kommt bei … auf 41 %."
      const wallet = f.wallet && f.walletShare !== undefined ? `kommt bei ${f.wallet} auf ${pct(f.walletShare)}` : "";
      if (f.held !== undefined) return `Hier hält ${f.who} ${f.held} von ${f.of} Produkten${wallet ? ` und ${wallet}` : ""}.`;
      return wallet ? `Hier ${wallet.replace(/^kommt/, `kommt ${f.who}`)}.` : `Hier ist es die Karte von ${f.who}.`;
    }
    case "board":
      return `Hier ${n1(f.n, "steht", "stehen")} ${f.n} von ${f.of} in der Phase ${f.stage}${f.best ? `, und ${f.best} hat den höchsten Wert, ${f.bestV}` : ""}.`;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------------------------------------------------

/**
 * The question a chart answers, in French or German: the same kind of question the English asks (`kind`), worded
 * around the chart's own fields.
 */
export function questionIn(lang: Other, spec: WidgetSpec, rows: Row[], kind: string): string {
  const c = contextOf(lang, spec, rows);
  const { view, name, noun } = c;
  const series = many(view.y);
  // What a row is and what it measures, by the view's own options: a heatmap's rows are its y, a bump's lines its series.
  const entityField =
    view.type === "heatmap" ? one(view.y) : view.type === "bump" ? one(view.series) : ["sunburst", "icicle"].includes(view.type) ? many(view.levels)[0] : (one(view.label) ?? one(view.x) ?? one(view.id) ?? one(view.row) ?? one(view.metric));
  const measures = ["bar", "line", "area", "rose", "radar", "horizon"].includes(view.type) ? series : many(view.value).length ? many(view.value) : many(one(view.size) ?? one(view.close));
  const measureField = measures[0];
  const entity = noun(entityField);
  const measure = name(measureField);
  const time = c.over(one(view.x) ?? one(view.period) ?? one(view.date));
  const fr = lang === "fr";
  // "par région", but along time "mois par mois": a time axis is never a "par month".
  const per = entityField && timeStep(entityField) ? c.over(entityField) : fr ? `par ${entity}` : `je ${entity}`;
  const ask = (text: string) => {
    const said = `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
    return fr ? `${said} ?` : `${said}?`;
  };
  const all = c.list(measures.map((f) => name(f)));
  // Views whose question is their own, whatever its kind.
  switch (view.type) {
    case "ragboard":
      return ask(fr ? `Qui est ${c.rag("R")} ou ${c.rag("A")}, sur quels critères, et par où commencer` : `Wer ist ${c.rag("R")} oder ${c.rag("A")}, bei welchen Kriterien, und wo zuerst handeln`);
    case "ragtrend":
      return ask(fr ? "Quels statuts se sont dégradés, quand et pourquoi" : "Welche Status haben sich verschlechtert, wann und warum");
    case "whitespace":
      return ask(fr ? `Quels produits proposer, et à quel ${noun(one(view.row), "client")} en premier` : "Welche Produkte lassen sich wem zuerst anbieten");
    case "xray":
      return ask(fr ? "Quelle est la situation actuelle, et quelle est la prochaine étape" : "Wie ist die Lage aktuell, und was ist der nächste Schritt");
    case "history":
      return ask(fr ? "Que s'est-il passé, et quand" : "Was ist passiert, und wann");
    case "anomalies":
      return ask(fr ? "Quelles mesures sont sorties de leur plage attendue, et quand" : "Welche Kennzahlen lagen außerhalb ihres erwarteten Bereichs, und wann");
    case "matrix": {
      const y = noun(one(view.y));
      return one(view.flag) ? ask(fr ? `Qui est concerné, pour chaque ${y}` : `Wer ist je ${y} betroffen`) : ask(fr ? `Où se concentre ${measure}, par ${y} et par ${noun(one(view.x))}` : `Wo ballt sich ${measure}, nach ${y} und ${noun(one(view.x))}`);
    }
    case "lifecycle": {
      const stages = many(view.stages);
      return ask(fr ? `Où en est chaque ${entity}, de ${name(stages[0])} à ${name(stages.at(-1))}` : `Wo steht es je ${entity}, von ${name(stages[0])} bis ${name(stages.at(-1))}`);
    }
    case "strips": {
      const first = name(many(view.value)[0]);
      return ask(fr ? `Combien d'unités compte chaque ${entity}, et quelle part relève ${de(first)}` : `Wie viele Einheiten je ${entity}, und welcher Anteil davon ist ${first}`);
    }
    case "board":
      return ask(fr ? `Où en est chaque ${entity}, et combien y en a-t-il à chaque étape` : `Wo steht es je ${entity}, und wie viele sind in jeder Phase`);
    case "scatter":
      return ask(fr ? `Y a-t-il un lien entre ${name(one(view.x))} et ${name(one(view.y))}` : `Hängen ${name(one(view.x))} und ${name(one(view.y))} zusammen`);
    case "dual":
      return ask(fr ? `${name(one(view.y))} et ${name(one(view.y2))} évoluent-ils ensemble, ${c.over(one(view.x))}` : `Entwickeln sich ${name(one(view.y))} und ${name(one(view.y2))} gemeinsam, ${c.over(one(view.x))}`);
    case "funnel":
      return ask(fr ? "Combien passent d'une étape à l'autre, et où se perdent-ils" : "Wie viele kommen von Stufe zu Stufe, und wo gehen sie verloren");
    case "waterfall":
      return ask(fr ? "Qu'est-ce qui explique le passage du total de départ au total final" : "Was erklärt den Weg von der Anfangs- zur Endsumme");
    case "sankey":
    case "chord":
      return ask(fr ? "Par où passent les flux, et lesquels sont les plus importants" : "Wie verlaufen die Ströme, und welche sind die größten");
    case "likert":
      return ask(fr ? "Qu'ont répondu les participants, question par question" : "Wie haben die Befragten geantwortet, Frage für Frage");
    case "kpi":
    case "gauge":
      return ask(fr ? `Où en est ${measure} aujourd'hui` : `Wo steht ${measure} aktuell`);
    case "kpis":
      return ask(fr ? "Où en sont les chiffres clés aujourd'hui" : "Wo stehen die Kennzahlen aktuell");
    case "pyramid": {
      const [left, right] = [name(one(view.left)), name(one(view.right))];
      return ask(fr ? `Comment se comparent ${left} et ${right}, ${per}` : `Wie verhalten sich ${left} und ${right} je ${entity} zueinander`);
    }
    case "table":
      return ask(fr ? "Quels sont les chiffres exacts, et quelle ligne arrive en tête" : "Wie lauten die genauen Zahlen, und welche Zeile liegt vorn");
    case "locator":
      return ask(fr ? `Où se situe chaque ${noun(one(view.label), "place")}` : "Wo liegt jeder Standort");
    case "timeline":
      return ask(fr ? `Où en est chaque ${entity} dans son calendrier` : `Wie steht es um den Zeitplan je ${entity}`);
  }
  const [a, b] = [one(view.from) ?? measures[0], one(view.to) ?? measures[1]];
  switch (kind) {
    case "rank":
      return ask(fr ? `Quel est le classement ${per}, selon ${measure}` : `Wie sieht die Rangfolge ${per} bei ${measure} aus`);
    case "target":
      return ask(fr ? `L'objectif est-il atteint pour ${measure}, ${per}` : `Wird das Ziel für ${measure} ${per} erreicht`);
    case "trend":
      return measures.length > 1 ? ask(fr ? `Comment évolue chaque série, ${time}` : `Wie entwickelt sich jede Reihe, ${time}`) : ask(fr ? `Comment évolue ${measure}, ${time}` : `Wie entwickelt sich ${measure}, ${time}`);
    case "forecast":
      return ask(fr ? `Quelle évolution attendre pour ${measure}` : `Wie dürfte sich ${measure} weiter entwickeln`);
    case "mix":
      return measures.length > 1 ? ask(fr ? `Quelle est la répartition entre ${all}, ${per}` : `Wie ist die Aufteilung zwischen ${all} ${per}`) : ask(fr ? `Comment se répartit ${measure}, ${per}` : `Wie verteilt sich ${measure} ${per}`);
    case "compare":
      if (measures.length > 2) return ask(fr ? `Comment se comparent ${all}, ${per}` : `Wie verhalten sich ${all} ${per} zueinander`);
      return a && b ? ask(fr ? `Comment se comparent ${name(a)} et ${name(b)}, ${per}` : `Wie verhalten sich ${name(a)} und ${name(b)} ${per} zueinander`) : ask(fr ? `Comment se compare ${measure}, ${per}` : `Wie unterscheidet sich ${measure} ${per}`);
    case "change":
      return a && b ? ask(fr ? `Qu'est-ce qui a changé entre ${name(a)} et ${name(b)}, pour chaque ${entity}` : `Was hat sich zwischen ${name(a)} und ${name(b)} je ${entity} verändert`) : ask(fr ? `Qu'est-ce qui a changé pour ${measure}` : `Was hat sich bei ${measure} verändert`);
    case "spread":
      return ask(fr ? `Comment se répartissent les valeurs ${de(measure)}` : `Wie verteilen sich die Werte von ${measure}`);
    case "relation":
      return ask(fr ? `Y a-t-il un lien entre ${measure} et ${name(measures[1] ?? one(view.y))}` : `Hängen ${measure} und ${name(measures[1] ?? one(view.y))} zusammen`);
    case "flow":
      return ask(fr ? "Par où passent les flux, d'une étape à l'autre" : "Wie verlaufen die Ströme von Stufe zu Stufe");
    case "rhythm":
      return measures.length > 1 ? ask(fr ? "Quels sont les moments les plus chargés" : "Wann ist am meisten los") : ask(fr ? `Quand la valeur ${de(measure)} est-elle la plus forte` : `Wann ist ${measure} am höchsten`);
    case "profile":
      return ask(fr ? `Quel profil se dégage pour chaque ${entity}` : `Welches Profil zeigt sich je ${entity}`);
    case "number":
      return ask(fr ? `Où en est ${measure} aujourd'hui` : `Wo steht ${measure} aktuell`);
    case "opinion":
      return ask(fr ? "Qu'ont répondu les participants, question par question" : "Wie haben die Befragten geantwortet, Frage für Frage");
    case "schedule":
      return ask(fr ? `Où en est chaque ${entity} dans son calendrier` : `Wie steht es um den Zeitplan je ${entity}`);
    default:
      return ask(fr ? `Que faut-il retenir pour chaque ${entity}` : `Was ist je ${entity} wichtig`);
  }
}

// French and German join the reading layer the moment this module loads: explain.ts and question.ts look them up.
registerReadingLanguages({ explainIn, questionIn });
