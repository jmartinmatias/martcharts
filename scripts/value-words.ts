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

/** Teams and offices named as owners: their words. People named as owners keep their names. */
const TEAMS: Record<string, [string, string]> = {
  "Client care": ["Service client", "Kundenbetreuung"],
  "Coverage lead": ["Responsable de couverture", "Coverage-Leitung"],
  "KYC team": ["Équipe KYC", "KYC-Team"],
  "Product specialist": ["Spécialiste produit", "Produktspezialist"],
  "Service desk": ["Centre de services", "Service-Desk"],
  "Conduct and compliance": ["Conduite et conformité", "Verhaltensregeln und Compliance"],
  "Data office": ["Bureau des données", "Datenbüro"],
  "Finance and risk": ["Finance et risques", "Finanzen und Risiko"],
  "Financial crime": ["Criminalité financière", "Finanzkriminalität"],
  "IT risk": ["Risque informatique", "IT-Risiko"],
  "Markets compliance": ["Conformité marchés", "Markt-Compliance"],
  "Payments operations": ["Opérations de paiement", "Zahlungsverkehr"],
  "Sustainability office": ["Bureau durabilité", "Nachhaltigkeitsbüro"],
};

/** Sentences the data scripts write word for word. */
const FIXED: Record<string, [string, string]> = {
  "Close the complaint and follow up in writing": ["Clore la réclamation et confirmer par écrit", "Beschwerde abschließen und schriftlich nachfassen"],
  "Propose the best next product from the whitespace": ["Proposer le meilleur produit suivant de l'espace blanc", "Das beste nächste Produkt aus dem Whitespace anbieten"],
  "Rebalance the book: the RM is over capacity": ["Rééquilibrer le portefeuille : le chargé est au-delà de sa capacité", "Bestand neu verteilen: Betreuer über Kapazität"],
  "Restore the meeting plan for the rest of the year": ["Rétablir le plan de rendez-vous pour le reste de l'année", "Terminplan für den Rest des Jahres wiederherstellen"],
  "Review the last lost proposals with the client team": ["Revoir les dernières propositions perdues avec l'équipe client", "Letzte verlorene Angebote mit dem Kundenteam prüfen"],
  "Coverage restored: meetings back on plan": ["Couverture rétablie : rendez-vous de nouveau au plan", "Betreuung wiederhergestellt: Termine wieder im Plan"],
  "Coverage slipped: no meeting for months": ["Couverture en recul : aucun rendez-vous depuis des mois", "Betreuung abgerutscht: seit Monaten kein Termin"],
  "Growth back on plan: pipeline rebuilt": ["Croissance de nouveau au plan : pipeline reconstitué", "Wachstum wieder im Plan: Pipeline neu aufgebaut"],
  "Growth off plan: pipeline thin and new money behind": ["Croissance hors plan : pipeline mince et collecte en retard", "Wachstum außer Plan: dünne Pipeline, Neugeld im Rückstand"],
  "Relationship at risk: wallet share falling": ["Relation à risque : part du portefeuille en baisse", "Beziehung gefährdet: Wallet-Anteil sinkt"],
  "Relationship steadier: wallet share holding": ["Relation plus stable : part du portefeuille maintenue", "Beziehung stabiler: Wallet-Anteil hält"],
  "Service improved: tickets closed and onboarding complete": ["Service amélioré : tickets clos et ouverture de compte achevée", "Service verbessert: Tickets geschlossen, Onboarding abgeschlossen"],
  "Service slipped: open tickets and a low survey score": ["Service en recul : tickets ouverts et note d'enquête basse", "Service abgerutscht: offene Tickets und schwache Umfragenote"],
  "At risk of leaving": ["Risque de départ", "Abwanderungsgefahr"],
  "Unusual activity flagged": ["Activité inhabituelle signalée", "Ungewöhnliche Aktivität gemeldet"],
  "Regular check-in": ["Point régulier", "Regelmäßiger Kontakt"],
  "Keep the regular check-in": ["Maintenir le point régulier", "Regelmäßigen Kontakt beibehalten"],
  "Annual compliance review": ["Revue annuelle de conformité", "Jährliche Compliance-Prüfung"],
  Applies: ["Entrée en application", "Gilt ab"],
  "Consultation response due": ["Réponse à la consultation attendue", "Antwort zur Konsultation fällig"],
  "Gap assessment complete": ["Analyse d'écarts achevée", "Gap-Analyse abgeschlossen"],
  "Impact assessment complete": ["Analyse d'impact achevée", "Wirkungsanalyse abgeschlossen"],
  "Implementation tested": ["Mise en œuvre testée", "Umsetzung getestet"],
  "Review response due": ["Réponse à la revue attendue", "Antwort zur Überprüfung fällig"],
};

/** A product's words, for sentences that name one ("then propose Custody"). */
function product(name: string | undefined, at: 0 | 1): string {
  const words = VALUE_WORDS[name ?? ""];
  return words ? words[at] : (name ?? "");
}

/** Sentences with a number or a product in them: a pattern, and its French and German. */
const PATTERNS: [RegExp, (m: RegExpExecArray) => [string, string]][] = [
  [/^Agree a new-money plan for Q([1-4]): (\d+)% of target so far$/, (m) => [`Convenir d'un plan de collecte pour le T${m[1]} : ${m[2]} % de l'objectif à ce jour`, `Neugeld-Plan für Q${m[1]} vereinbaren: bisher ${m[2]} % des Ziels`]],
  [/^Book a meeting: (\d+) days since the last one$/, (m) => [`Fixer un rendez-vous : ${m[1]} jours depuis le dernier`, `Termin vereinbaren: ${m[1]} Tage seit dem letzten`]],
  [/^Call to understand the low score \((-?\d+)\) and agree one fix$/, (m) => [`Appeler pour comprendre la note basse (${m[1]}) et convenir d'une correction`, `Anrufen, um die schwache Note (${m[1]}) zu verstehen, und eine Abhilfe vereinbaren`]],
  [/^Clear the (\d+) open service tickets and confirm with the client$/, (m) => [`Traiter les ${m[1]} tickets ouverts et le confirmer au client`, `Die ${m[1]} offenen Service-Tickets erledigen und mit dem Kunden bestätigen`]],
  [/^Close the onboarding gaps: the file is (\d+)% complete$/, (m) => [`Combler les lacunes d'ouverture de compte : dossier complet à ${m[1]} %`, `Onboarding-Lücken schließen: Akte zu ${m[1]} % vollständig`]],
  [/^Hold the annual review, (\d+) days overdue$/, (m) => [`Tenir la revue annuelle, en retard de ${m[1]} jours`, `Jahresgespräch führen, ${m[1]} Tage überfällig`]],
  [/^Rebuild the pipeline: (\d+)\.(\d+)× cover against (\d+)×$/, (m) => [`Reconstituer le pipeline : couverture de ${m[1]},${m[2]}× pour ${m[3]}× visés`, `Pipeline neu aufbauen: ${m[1]},${m[2]}× Deckung statt ${m[3]}×`]],
  [/^Refresh KYC now: (\d+) days overdue$/, (m) => [`Mettre à jour le KYC maintenant : en retard de ${m[1]} jours`, `KYC jetzt aktualisieren: ${m[1]} Tage überfällig`]],
  [/^Refresh KYC within (\d+) days$/, (m) => [`Mettre à jour le KYC sous ${m[1]} jours`, `KYC innerhalb von ${m[1]} Tagen aktualisieren`]],
  [/^No contact in (\d+) days$/, (m) => [`Aucun contact depuis ${m[1]} jours`, `Seit ${m[1]} Tagen kein Kontakt`]],
  [/^Ready for (\w+)$/, (m) => [`Prêt pour : ${product(m[1], 0)}`, `Bereit für: ${product(m[1], 1)}`]],
  [/^Propose (\w+)$/, (m) => [`Proposer : ${product(m[1], 0)}`, `Anbieten: ${product(m[1], 1)}`]],
  [/^Book a review meeting, then propose (\w+)$/, (m) => [`Fixer une revue, puis proposer : ${product(m[1], 0)}`, `Überprüfungstermin vereinbaren, dann anbieten: ${product(m[1], 1)}`]],
  [/^Check the flagged activity, then propose (\w+)$/, (m) => [`Vérifier l'activité signalée, puis proposer : ${product(m[1], 0)}`, `Gemeldete Aktivität prüfen, dann anbieten: ${product(m[1], 1)}`]],
];

/** One clause of such a sentence in French and German, or undefined when it has no rule. */
function clauseWords(clause: string): [string, string] | undefined {
  const known = FIXED[clause] ?? TEAMS[clause];
  if (known) return known;
  for (const [pattern, words] of PATTERNS) {
    const m = pattern.exec(clause);
    if (m) return words(m);
  }
  return undefined;
}

/**
 * A sentence the data scripts write (an action, a reason to call, a note, a team that owns a deadline), in French and
 * German, clause by clause: "No contact in 153 days; At risk of leaving" reads whole in each language. Undefined when
 * any clause has no rule, so a half-translated sentence never shows; a person's name has none, so it stays as written.
 * French takes its non-breaking space before a colon or a semicolon.
 */
export function sentenceWords(value: string): [string, string] | undefined {
  const words = value.split("; ").map(clauseWords);
  if (words.some((w) => !w)) return undefined;
  const pairs = words as [string, string][];
  const french = pairs.map((w) => w[0]).join(" ; ").replace(/ ([:;%])/g, " $1");
  return [french, pairs.map((w) => w[1]).join("; ")];
}

/** Fields whose values are sentences the data scripts write: they take sentence words, never single words. */
const SENTENCES = /^(action|callReason|nextAction|note|owner|milestone)$/;

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
    const sentence = SENTENCES.test(key);
    if (SKIP.test(key) && !sentence) continue;
    for (const row of rows) {
      const value = row[key];
      if (typeof value !== "string") continue;
      const words = sentence ? sentenceWords(value) : valueWords(value);
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
