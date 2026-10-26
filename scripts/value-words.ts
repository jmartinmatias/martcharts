/**
 * Words for the data values the shipped widgets draw, in French and German: segments, products, regions, stages,
 * statuses, metric names and the like. `npm run value-words` lays them into each widget's and board's `i18n` as
 * `fields.<field>.values` (and `filters[i].values`), so a value is written in the reader's language wherever it is
 * shown, while the data, the filters and the addresses keep the value itself. Names (clients, people, regulations)
 * and sentences stay as written.
 *
 * @module
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { runPipeline } from "../src/core/index.ts";
import type { Row, WidgetSpec } from "../src/core/types.ts";
import { createLocalFetch } from "../src/mcp/store.ts";

/** English value: [French, German]. */
export const VALUE_WORDS: Record<string, [string, string]> = {
  // Segments and client types.
  Enterprise: ["Grandes entreprises", "Großunternehmen"],
  "Mid-market": ["ETI", "Mittelstand"],
  "Small business": ["Petites entreprises", "Kleinunternehmen"],
  SMB: ["PME", "KMU"],
  Corporate: ["Entreprises", "Firmenkunden"],
  Institutional: ["Institutionnels", "Institutionelle"],
  Private: ["Banque privée", "Privatkunden"],
  Affluent: ["Clientèle aisée", "Vermögende Kunden"],
  "Public sector": ["Secteur public", "Öffentlicher Sektor"],
  // Products and services.
  Custody: ["Conservation", "Verwahrung"],
  Advisory: ["Conseil", "Beratung"],
  Discretionary: ["Gestion sous mandat", "Vermögensverwaltung"],
  Lending: ["Crédit", "Kredite"],
  Structured: ["Produits structurés", "Strukturierte Produkte"],
  Insurance: ["Assurance", "Versicherung"],
  Pension: ["Retraite", "Vorsorge"],
  Platform: ["Plateforme", "Plattform"],
  Analytics: ["Analytique", "Analytik"],
  Support: ["Support", "Support"],
  Integrations: ["Intégrations", "Integrationen"],
  Training: ["Formation", "Schulung"],
  Consulting: ["Conseil", "Consulting"],
  Services: ["Services", "Dienstleistungen"],
  Subscriptions: ["Abonnements", "Abonnements"],
  Licenses: ["Licences", "Lizenzen"],
  Other: ["Autres", "Sonstige"],
  // Asset classes.
  Equities: ["Actions", "Aktien"],
  "Fixed income": ["Obligations", "Anleihen"],
  Cash: ["Liquidités", "Liquidität"],
  Alternatives: ["Alternatifs", "Alternative Anlagen"],
  "Real estate": ["Immobilier", "Immobilien"],
  "Private markets": ["Marchés privés", "Private Märkte"],
  Commodities: ["Matières premières", "Rohstoffe"],
  // Regions and countries.
  North: ["Nord", "Nord"],
  South: ["Sud", "Süd"],
  East: ["Est", "Ost"],
  West: ["Ouest", "West"],
  Central: ["Centre", "Mitte"],
  Midwest: ["Midwest", "Mittlerer Westen"],
  Northeast: ["Nord-Est", "Nordosten"],
  Italy: ["Italie", "Italien"],
  Iberia: ["Péninsule ibérique", "Iberische Halbinsel"],
  France: ["France", "Frankreich"],
  Germany: ["Allemagne", "Deutschland"],
  Belgium: ["Belgique", "Belgien"],
  Netherlands: ["Pays-Bas", "Niederlande"],
  Norway: ["Norvège", "Norwegen"],
  Spain: ["Espagne", "Spanien"],
  Austria: ["Autriche", "Österreich"],
  Switzerland: ["Suisse", "Schweiz"],
  Ireland: ["Irlande", "Irland"],
  Portugal: ["Portugal", "Portugal"],
  Sweden: ["Suède", "Schweden"],
  Denmark: ["Danemark", "Dänemark"],
  Finland: ["Finlande", "Finnland"],
  // Pipeline and lifecycle stages.
  Qualified: ["Qualifié", "Qualifiziert"],
  Proposal: ["Proposition", "Angebot"],
  Negotiation: ["Négociation", "Verhandlung"],
  Won: ["Gagné", "Gewonnen"],
  Lost: ["Perdu", "Verloren"],
  Open: ["Ouvert", "Offen"],
  "New leads": ["Nouveaux prospects", "Neue Leads"],
  Contacted: ["Contacté", "Kontaktiert"],
  "Proposal sent": ["Proposition envoyée", "Angebot gesendet"],
  Visits: ["Visites", "Besuche"],
  Signups: ["Inscriptions", "Anmeldungen"],
  Activated: ["Activés", "Aktiviert"],
  "Trial started": ["Essai commencé", "Testphase begonnen"],
  Paying: ["Payants", "Zahlend"],
  Targeted: ["Ciblés", "Angesprochen"],
  Responded: ["Ont répondu", "Reagiert"],
  Converted: ["Convertis", "Konvertiert"],
  "Signed up": ["Inscrits", "Registriert"],
  Left: ["Partis", "Abgewandert"],
  // Statuses.
  Red: ["Rouge", "Rot"],
  Amber: ["Orange", "Gelb"],
  Green: ["Vert", "Grün"],
  "At risk": ["À risque", "Gefährdet"],
  "In force": ["En vigueur", "In Kraft"],
  Applies: ["S'applique", "Gilt"],
  Adopted: ["Adopté", "Verabschiedet"],
  Consultation: ["Consultation", "Konsultation"],
  "Under review": ["En révision", "In Prüfung"],
  Published: ["Publié", "Veröffentlicht"],
  Repealed: ["Abrogé", "Aufgehoben"],
  "In progress": ["En cours", "In Arbeit"],
  Transposed: ["Transposé", "Umgesetzt"],
  "Not started": ["Pas commencé", "Nicht begonnen"],
  Done: ["Terminé", "Erledigt"],
  Holds: ["Détient", "Hält"],
  Opportunity: ["Opportunité", "Chance"],
  "Not eligible": ["Non éligible", "Nicht berechtigt"],
  // Clusters, perspectives and levels.
  Core: ["Cœur", "Kern"],
  Growth: ["Croissance", "Wachstum"],
  Dormant: ["Dormant", "Ruhend"],
  "Client success": ["Succès client", "Kundenerfolg"],
  "Business development": ["Développement commercial", "Geschäftsentwicklung"],
  Coverage: ["Couverture", "Betreuung"],
  Relationship: ["Relation", "Beziehung"],
  Perspective: ["Perspective", "Perspektive"],
  Overall: ["Global", "Gesamt"],
  "Relationship manager": ["Chargé de clientèle", "Kundenbetreuer"],
  // Metrics.
  "Net new money": ["Collecte nette", "Nettoneugeld"],
  "Fee revenue": ["Revenus de commissions", "Provisionserträge"],
  Trades: ["Transactions", "Transaktionen"],
  Complaints: ["Réclamations", "Beschwerden"],
  Logins: ["Connexions", "Anmeldungen"],
  "FX volume": ["Volume de change", "Devisenvolumen"],
  "New customers": ["Nouveaux clients", "Neukunden"],
  "Net promoter score": ["Net Promoter Score", "Net Promoter Score"],
  "Tickets resolved": ["Tickets résolus", "Gelöste Tickets"],
  "Revenue (€)": ["CA (€)", "Umsatz (€)"],
  "Gross margin (%)": ["Marge brute (%)", "Bruttomarge (%)"],
  "Onboarding completeness": ["Complétude de l'entrée en relation", "Vollständigkeit des Onboardings"],
  "Digital adoption": ["Adoption du digital", "Digitale Nutzung"],
  "Service tickets open": ["Tickets de service ouverts", "Offene Service-Tickets"],
  "Complaints, last 90 days": ["Réclamations, 90 derniers jours", "Beschwerden, letzte 90 Tage"],
  "Pipeline cover": ["Couverture du pipeline", "Pipeline-Deckung"],
  "Win rate": ["Taux de succès", "Abschlussquote"],
  "New money against target": ["Collecte face à l'objectif", "Neugeld gegen Ziel"],
  "Products added this year": ["Produits ajoutés cette année", "Produkte dieses Jahr hinzugefügt"],
  "Days since the last meeting": ["Jours depuis le dernier rendez-vous", "Tage seit dem letzten Treffen"],
  "Meetings held against plan": ["Rendez-vous tenus face au plan", "Treffen gegen Plan"],
  "Relationship manager load": ["Charge du chargé de clientèle", "Auslastung des Kundenbetreuers"],
  "Annual review overdue": ["Revue annuelle en retard", "Jahresgespräch überfällig"],
  "Share of wallet, 12-month change": ["Part de portefeuille, évolution sur 12 mois", "Anteil am Vermögen, Veränderung über 12 Monate"],
  "Attrition risk": ["Risque d'attrition", "Abwanderungsrisiko"],
  "Fee leakage": ["Fuite de commissions", "Gebührenverlust"],
  "Days to the KYC refresh": ["Jours avant la mise à jour KYC", "Tage bis zur KYC-Aktualisierung"],
  "Sentiment in notes": ["Ton des notes", "Stimmung in den Notizen"],
  // Causes, channels, features, kinds.
  "Login problems": ["Problèmes de connexion", "Anmeldeprobleme"],
  "Billing questions": ["Questions de facturation", "Abrechnungsfragen"],
  "Slow pages": ["Pages lentes", "Langsame Seiten"],
  Exports: ["Exports", "Exporte"],
  Notifications: ["Notifications", "Benachrichtigungen"],
  Permissions: ["Droits d'accès", "Berechtigungen"],
  "Paid search": ["Recherche payante", "Bezahlte Suche"],
  "Partner referrals": ["Recommandations de partenaires", "Partnerempfehlungen"],
  "Organic search": ["Recherche naturelle", "Organische Suche"],
  "Events and webinars": ["Événements et webinaires", "Events und Webinare"],
  "Outbound sales": ["Prospection sortante", "Outbound-Vertrieb"],
  "Social media": ["Réseaux sociaux", "Soziale Medien"],
  Dashboards: ["Tableaux de bord", "Dashboards"],
  Alerts: ["Alertes", "Warnungen"],
  Sharing: ["Partage", "Teilen"],
  "Scheduled reports": ["Rapports planifiés", "Geplante Berichte"],
  "API access": ["Accès API", "API-Zugang"],
  "Custom fields": ["Champs personnalisés", "Benutzerdefinierte Felder"],
  Forecasting: ["Prévisions", "Prognosen"],
  "Audit log": ["Journal d'audit", "Prüfprotokoll"],
  Call: ["Appel", "Anruf"],
  Trade: ["Transaction", "Transaktion"],
  Campaign: ["Campagne", "Kampagne"],
  Payment: ["Paiement", "Zahlung"],
  Complaint: ["Réclamation", "Beschwerde"],
  Meeting: ["Rendez-vous", "Treffen"],
  Review: ["Revue", "Überprüfung"],
  Onboarding: ["Entrée en relation", "Onboarding"],
  // Attributes, departments, roles, plans, phases, tasks, teams.
  Speed: ["Rapidité", "Geschwindigkeit"],
  Reliability: ["Fiabilité", "Zuverlässigkeit"],
  Price: ["Prix", "Preis"],
  "Ease of use": ["Facilité d'usage", "Bedienbarkeit"],
  Sales: ["Ventes", "Vertrieb"],
  Marketing: ["Marketing", "Marketing"],
  "R&D": ["R&D", "F&E"],
  "G&A": ["Frais généraux", "Verwaltung"],
  IT: ["Informatique", "IT"],
  Headquarters: ["Siège", "Zentrale"],
  Engineering: ["Ingénierie", "Technik"],
  Annual: ["Annuel", "Jährlich"],
  Monthly: ["Mensuel", "Monatlich"],
  Discovery: ["Découverte", "Erkundung"],
  Design: ["Conception", "Design"],
  Build: ["Réalisation", "Umsetzung"],
  Launch: ["Lancement", "Start"],
  "Customer research": ["Recherche client", "Kundenforschung"],
  "Design system": ["Système de design", "Designsystem"],
  Prototype: ["Prototype", "Prototyp"],
  "Platform build": ["Construction de la plateforme", "Plattformaufbau"],
  "Private beta": ["Bêta privée", "Private Beta"],
  "Launch day": ["Jour du lancement", "Starttag"],
  "Marketing push": ["Campagne marketing", "Marketingoffensive"],
  Technical: ["Technique", "Technik"],
  Data: ["Données", "Daten"],
  Partners: ["Partenaires", "Partner"],
  Billing: ["Facturation", "Abrechnung"],
  Security: ["Sécurité", "Sicherheit"],
  // Bridge steps.
  "August revenue": ["CA d'août", "Umsatz August"],
  Upsell: ["Montée en gamme", "Upselling"],
  Pricing: ["Prix", "Preise"],
  Churn: ["Attrition", "Abwanderung"],
  Discounts: ["Remises", "Rabatte"],
  "New clients": ["Nouveaux clients", "Neukunden"],
  Deepening: ["Approfondissement", "Vertiefung"],
  "Market effect": ["Effet marché", "Markteffekt"],
  Outflows: ["Sorties", "Abflüsse"],
  "Lost clients": ["Clients perdus", "Verlorene Kunden"],
  "Revenue 2025, January to October": ["CA 2025, janvier à octobre", "Umsatz 2025, Januar bis Oktober"],
  // Regulatory topics, stakeholders and milestones.
  "Operational resilience": ["Résilience opérationnelle", "Operative Resilienz"],
  "AML & sanctions": ["LCB-FT et sanctions", "Geldwäsche und Sanktionen"],
  "AI & digital": ["IA et numérique", "KI und Digitales"],
  Payments: ["Paiements", "Zahlungsverkehr"],
  "ESG & sustainability": ["ESG et durabilité", "ESG und Nachhaltigkeit"],
  Prudential: ["Prudentiel", "Aufsichtsrecht"],
  Markets: ["Marchés", "Märkte"],
  "Data & privacy": ["Données et vie privée", "Daten und Datenschutz"],
  "Consumer protection": ["Protection des consommateurs", "Verbraucherschutz"],
  "Data, AI & digital": ["Données, IA et numérique", "Daten, KI und Digitales"],
  Banks: ["Banques", "Banken"],
  Insurers: ["Assureurs", "Versicherer"],
  "Asset managers": ["Gestionnaires d'actifs", "Vermögensverwalter"],
  "Payment institutions": ["Établissements de paiement", "Zahlungsinstitute"],
  "Crypto providers": ["Prestataires crypto", "Krypto-Anbieter"],
  "Review response due": ["Réponse à la revue attendue", "Antwort zur Überprüfung fällig"],
  "Implementation tested": ["Mise en œuvre testée", "Umsetzung getestet"],
  "Consultation response due": ["Réponse à la consultation attendue", "Antwort zur Konsultation fällig"],
  "Annual compliance review": ["Revue de conformité annuelle", "Jährliche Compliance-Prüfung"],
  "Impact assessment complete": ["Analyse d'impact terminée", "Folgenabschätzung abgeschlossen"],
  // Weekdays.
  Mon: ["lun.", "Mo."],
  Tue: ["mar.", "Di."],
  Wed: ["mer.", "Mi."],
  Thu: ["jeu.", "Do."],
  Fri: ["ven.", "Fr."],
  Sat: ["sam.", "Sa."],
  Sun: ["dim.", "So."],
  // Survey statements.
  "I understand our strategy": ["Je comprends notre stratégie", "Ich verstehe unsere Strategie"],
  "My manager supports my growth": ["Mon manager soutient mon évolution", "Meine Führungskraft fördert meine Entwicklung"],
  "I have the tools to do my job": ["J'ai les outils pour faire mon travail", "Ich habe die Werkzeuge für meine Arbeit"],
  "My workload is sustainable": ["Ma charge de travail est tenable", "Meine Arbeitslast ist tragbar"],
  "I would recommend working here": ["Je recommanderais de travailler ici", "Ich würde diesen Arbeitgeber empfehlen"],
};

/** Words that follow a pattern: "Red in Q3", "Pension opportunity", "Custody held". */
function patterned(value: string): [string, string] | undefined {
  const moved = /^(Red|Amber|Green) in (Q[1-4])$/.exec(value);
  if (moved) {
    const [fr, de] = VALUE_WORDS[moved[1] as string] as [string, string];
    return [`${fr} au ${moved[2]?.replace("Q", "T")}`, `${de} im ${moved[2]}`];
  }
  const product = /^(\w+) (held|opportunity)$/.exec(value);
  if (product && VALUE_WORDS[product[1] as string]) {
    const [fr, de] = VALUE_WORDS[product[1] as string] as [string, string];
    return product[2] === "held" ? [`${fr} détenu`, `${de} gehalten`] : [`Opportunité : ${fr}`, `Chance: ${de}`];
  }
  return undefined;
}

/** The French and German for one value, when there is one. */
export function valueWords(value: string): [string, string] | undefined {
  return VALUE_WORDS[value] ?? patterned(value);
}

/** Fields whose values are names, codes or sentences: never given words. */
const SKIP = /^(id|name|client|account|deal|owner|rm|fullName|regulation|note|title|why|action|callReason|nextAction|rationale|rule|people|city|office|issuer|jurisdiction|state|country|party|perspectiveKey|metricKey|unit|goodWhen)$|Rag$|Last$/;

type Words = Record<string, Record<string, string>>;

/** Adds `i18n.<lang>.fields.<field>.values` to a widget for the values it draws that have words. */
async function wordsFor(spec: WidgetSpec, fetcher: typeof fetch): Promise<{ fr: Words; de: Words }> {
  const out = { fr: {} as Words, de: {} as Words };
  let rows: Row[] = [];
  try {
    const result = (await runPipeline(spec, { fetch: fetcher })) as unknown;
    rows = Array.isArray(result) ? (result as Row[]) : ((result as { rows?: Row[] })?.rows ?? []);
  } catch {
    return out;
  }
  const keys = new Set(rows.flatMap((row) => Object.keys(row)));
  for (const key of keys) {
    if (SKIP.test(key)) continue;
    for (const row of rows) {
      const value = row[key];
      if (typeof value !== "string") continue;
      const words = valueWords(value);
      if (!words) continue;
      (out.fr[key] ??= {})[value] = words[0];
      (out.de[key] ??= {})[value] = words[1];
    }
  }
  return out;
}

/** Writes the words into every widget (and every board's filters) when run as a script. */
async function main(): Promise<void> {
  const fetcher = createLocalFetch("public") as typeof fetch;
  let touched = 0;
  for (const file of readdirSync("widgets", { recursive: true }).map(String).filter((f) => f.endsWith(".json"))) {
    const path = `widgets/${file}`;
    const spec = JSON.parse(readFileSync(path, "utf8")) as WidgetSpec & { i18n?: Record<string, Record<string, unknown>> };
    const words = await wordsFor(spec, fetcher);
    if (!Object.keys(words.fr).length) continue;
    // A translation lays words only over what the spec has, so each field with words gets an entry of its own.
    spec.fields = { ...(spec.fields ?? {}) };
    for (const field of Object.keys(words.fr)) spec.fields[field] ??= {};
    spec.i18n ??= {};
    for (const lang of ["fr", "de"] as const) {
      const into = (spec.i18n[lang] ??= {}) as { fields?: Record<string, Record<string, unknown>> };
      into.fields ??= {};
      for (const [field, values] of Object.entries(words[lang])) into.fields[field] = { ...(into.fields[field] ?? {}), values };
    }
    writeFileSync(path, `${JSON.stringify(spec, null, 2)}\n`);
    touched++;
  }
  for (const file of readdirSync("dashboards").filter((f) => f.endsWith(".json"))) {
    const path = `dashboards/${file}`;
    const board = JSON.parse(readFileSync(path, "utf8")) as { filters?: { field: string }[]; i18n?: Record<string, Record<string, unknown>> };
    if (!board.filters?.length) continue;
    const values = new Set<string>();
    for (const w of readdirSync("widgets", { recursive: true }).map(String).filter((f) => f.endsWith(".json"))) {
      const spec = JSON.parse(readFileSync(`widgets/${w}`, "utf8")) as { i18n?: { fr?: { fields?: Record<string, { values?: Record<string, string> }> } } };
      for (const filter of board.filters) for (const v of Object.keys(spec.i18n?.fr?.fields?.[filter.field]?.values ?? {})) values.add(`${filter.field}\u0000${v}`);
    }
    board.i18n ??= {};
    for (const [at, lang] of [[0, "fr"], [1, "de"]] as const) {
      const into = (board.i18n[lang] ??= {}) as { filters?: Record<string, unknown>[] };
      const filters = into.filters ?? board.filters.map(() => ({}));
      board.filters.forEach((filter, i) => {
        const map: Record<string, string> = {};
        for (const key of values) {
          const [field, value] = key.split("\u0000") as [string, string];
          if (field === filter.field) map[value] = (valueWords(value) as [string, string])[at];
        }
        if (Object.keys(map).length) filters[i] = { ...(filters[i] ?? {}), values: map };
      });
      into.filters = filters;
    }
    writeFileSync(path, `${JSON.stringify(board, null, 2)}\n`);
  }
  console.log(`Value words laid into ${touched} widgets and the boards' filters.`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
