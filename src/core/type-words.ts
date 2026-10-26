/**
 * The chart types in French and German: each type's one-sentence summary and, for the charts whose marks mean
 * something only for one kind of data, what that data must be. The jobs (purposes) by name, and the advice about
 * switching one chart for another, built in each language from the same facts as the English (guide.ts). The
 * catalog, the data guide and the editor read them when the page is in French or German; English stays in the
 * view registry and in guide.ts, where every other tool reads it.
 *
 * @module
 */
import type { ChartSwitch, Purpose } from "./guide.ts";

export type TypeLang = "fr" | "de";

/** A type's words in one language: its summary, and what its data must be when the chart means something only for one kind. */
export interface TypeWords {
  summary: string;
  needs?: string;
}

/** The jobs, in each language, as a heading reads them. */
export const PURPOSE_WORDS: Record<TypeLang, Record<Purpose, string>> = {
  fr: {
    compare: "Comparer des montants entre catégories",
    rank: "Classer, du premier au dernier",
    trend: "Évolution dans le temps",
    share: "Part d'un tout",
    mix: "Répartition de chaque groupe ou période",
    distribution: "Dispersion des valeurs",
    relationship: "Lien entre deux mesures",
    flow: "Flux entre étapes ou groupes",
    conversion: "Conversion par étapes successives",
    hierarchy: "Ventilations imbriquées",
    target: "Réalisé face à l'objectif ou au plan",
    change: "Évolution entre deux moments",
    drivers: "Ce qui fait bouger un total",
    pattern: "Motifs sur deux dimensions ou un cycle",
    profile: "Profils sur plusieurs attributs",
    survey: "Réponses d'enquête et notes",
    schedule: "Calendriers et plannings",
    headline: "Un chiffre clé",
    lookup: "Valeurs exactes et recherche",
  },
  de: {
    compare: "Beträge zwischen Kategorien vergleichen",
    rank: "Rangfolge, von oben nach unten",
    trend: "Entwicklung im Zeitverlauf",
    share: "Anteil an einem Ganzen",
    mix: "Aufteilung je Gruppe oder Periode",
    distribution: "Streuung der Werte",
    relationship: "Zusammenhang zweier Kennzahlen",
    flow: "Flüsse zwischen Stufen oder Gruppen",
    conversion: "Umwandlung über geordnete Schritte",
    hierarchy: "Verschachtelte Aufschlüsselungen",
    target: "Ist gegen Ziel oder Plan",
    change: "Veränderung zwischen zwei Zeitpunkten",
    drivers: "Was eine Summe bewegt",
    pattern: "Muster über zwei Dimensionen oder einen Zyklus",
    profile: "Profile über mehrere Merkmale",
    survey: "Umfrage- und Bewertungsantworten",
    schedule: "Zeitpläne und Planungen",
    headline: "Eine Kernzahl",
    lookup: "Genaue Werte und Nachschlagen",
  },
};

/** Each chart type's words, in French and German. */
export const TYPE_WORDS: Record<string, Record<TypeLang, TypeWords>> = {
  anomalies: {
    fr: { summary: "Un suivi d'anomalies : une fine bande par indicateur dans le temps, la plage attendue en aplat léger, la valeur attendue en filet, le réalisé en ligne, et chaque jour hors de la plage marqué d'un point.", needs: "il faut des relevés dans le temps par indicateur, avec un indicateur oui/non ou une plage basse et haute" },
    de: { summary: "Ein Anomalie-Tracker: je Kennzahl eine schmale Bahn über die Zeit, der erwartete Bereich als blasse Fläche, der Erwartungswert als Haarlinie, der Istwert als Linie und jeder Tag außerhalb des Bereichs als markierter Punkt.", needs: "braucht Messwerte über die Zeit je Kennzahl, mit einem Ja/Nein-Merker oder einem unteren und oberen Band" },
  },
  area: {
    fr: { summary: "Une ligne avec une aire pleine jusqu'à zéro, pour une tendance où le montant lui-même compte." },
    de: { summary: "Eine Linie mit gefüllter Fläche bis null, für einen Verlauf, bei dem der Betrag selbst zählt." },
  },
  bar: {
    fr: { summary: "Des barres verticales pour comparer des montants entre catégories." },
    de: { summary: "Senkrechte Balken, die Beträge zwischen Kategorien vergleichen." },
  },
  beeswarm: {
    fr: { summary: "Une distribution : un point par ligne le long d'un axe de valeurs, écartés pour ne pas se chevaucher, éventuellement une rangée par groupe." },
    de: { summary: "Eine Verteilung: ein Punkt je Zeile entlang einer Werteachse, so verschoben, dass sich keiner überdeckt, wahlweise eine Reihe je Gruppe." },
  },
  board: {
    fr: { summary: "Un tableau de statut : une colonne par étape avec son nombre en en-tête et ses éléments en cartes discrètes, pour voir d'un coup d'œil où en est chaque chose.", needs: "il faut une colonne d'étape ou de statut avec quelques valeurs, et un nom par ligne" },
    de: { summary: "Eine Statustafel: eine Spalte je Stufe mit ihrer Anzahl im Kopf und den Einträgen als ruhige Karten, damit der Stand auf einen Blick lesbar ist.", needs: "braucht eine Stufen- oder Statusspalte mit wenigen Werten und einen Namen je Zeile" },
  },
  boxplot: {
    fr: { summary: "Une boîte à moustaches par groupe sur un axe commun : une boîte sur la moitié centrale des valeurs, un trait à la médiane, des moustaches jusqu'aux valeurs les plus éloignées et des points pour les valeurs extrêmes." },
    de: { summary: "Ein Boxplot je Gruppe auf einer gemeinsamen Achse: eine Box über die mittlere Hälfte der Werte, ein Strich beim Median, Whisker bis zu den äußersten Werten und Punkte für Ausreißer." },
  },
  bullet: {
    fr: { summary: "Réalisé face à l'objectif, une ligne compacte par élément : une barre de valeur et un repère d'objectif sur trois bandes qualitatives (faible, moyen, bon).", needs: "il faut une colonne d'objectif, de plan ou de budget" },
    de: { summary: "Ist gegen Ziel, eine kompakte Zeile je Eintrag: ein Wertbalken und eine Zielmarke über drei qualitativen Bändern (schwach, mittel, gut).", needs: "braucht eine Ziel-, Plan- oder Budgetspalte" },
  },
  bump: {
    fr: { summary: "Le rang dans le temps : à chaque période les séries sont classées par valeur, et chaque série est une ligne lisse à travers ses rangs, nommée aux deux bouts.", needs: "il faut une valeur par série et par période, à classer" },
    de: { summary: "Rang im Zeitverlauf: In jeder Periode werden die Reihen nach Wert gereiht, und jede Reihe ist eine glatte Linie durch ihre Ränge, an beiden Enden benannt.", needs: "braucht einen Wert je Reihe und Periode, zum Reihen" },
  },
  calendar: {
    fr: { summary: "Une carte de chaleur en calendrier : une case par jour, les semaines en colonnes à partir du lundi, nuancées sur une seule échelle de bleu." },
    de: { summary: "Eine Kalender-Heatmap: ein Feld je Tag, Wochen als Spalten ab Montag, auf einer blauen Skala abgestuft." },
  },
  candlestick: {
    fr: { summary: "Des cours par période en chandeliers : une mèche du plus bas au plus haut autour d'un corps de l'ouverture à la clôture, dans la couleur de hausse ou de baisse.", needs: "il faut des cours d'ouverture, plus haut, plus bas et clôture par période" },
    de: { summary: "Kurse je Periode als Kerzen: ein Docht vom Tief zum Hoch um einen Körper von Eröffnung bis Schluss, in der Farbe für steigend oder fallend.", needs: "braucht Eröffnungs-, Hoch-, Tief- und Schlusskurse je Periode" },
  },
  chord: {
    fr: { summary: "Des flux entre groupes autour d'un cercle : chaque groupe un arc aussi long que tout ce qu'il envoie et reçoit, chaque flux un ruban de l'émetteur au destinataire.", needs: "il faut des flux dans les deux sens entre les mêmes groupes" },
    de: { summary: "Flüsse zwischen Gruppen auf einem Kreis: jede Gruppe ein Bogen so lang wie alles, was sie sendet und empfängt, jeder Fluss ein Band vom Sender zum Empfänger.", needs: "braucht Flüsse in beide Richtungen zwischen denselben Gruppen" },
  },
  choropleth: {
    fr: { summary: "Une carte où chaque région est nuancée selon sa valeur, de la teinte la plus claire à la plus forte, avec une échelle dessous.", needs: "il faut une colonne de codes de pays ou d'États présents sur un fond de carte" },
    de: { summary: "Eine Karte, auf der jede Region nach ihrem Wert eingefärbt ist, vom hellsten zum kräftigsten Ton, mit einer Skala darunter.", needs: "braucht eine Spalte mit Länder- oder Bundesstaatscodes, die auf einer Grundkarte liegen" },
  },
  donut: {
    fr: { summary: "La part d'un tout d'un coup d'œil : un anneau de 6 parts au plus, le total au centre et une légende des valeurs et des parts." },
    de: { summary: "Anteil am Ganzen auf einen Blick: ein Ring mit höchstens 6 Stücken, die Summe in der Mitte und eine Legende der Werte und Anteile." },
  },
  dot: {
    fr: { summary: "Un graphique à points : une ligne par élément et un point par mesure sur un axe commun, avec un filet en travers de chaque ligne." },
    de: { summary: "Ein Punktdiagramm: eine Zeile je Eintrag und ein Punkt je Kennzahl auf einer gemeinsamen Achse, mit einer Haarlinie durch jede Zeile." },
  },
  dual: {
    fr: { summary: "Deux mesures d'unités différentes, comme le CA et l'attrition, l'une au-dessus de l'autre sur deux panneaux qui partagent l'axe du temps, chacun à sa propre échelle.", needs: "il faut deux mesures sur les mêmes périodes, dans deux colonnes" },
    de: { summary: "Zwei Kennzahlen mit verschiedenen Einheiten, etwa Umsatz und Abwanderung, übereinander in zwei Feldern mit gemeinsamer Zeitachse, jede mit eigener Skala.", needs: "braucht zwei Kennzahlen über dieselben Perioden, in zwei Spalten" },
  },
  dumbbell: {
    fr: { summary: "Avant et après par élément sur un axe commun : un point discret pour avant, un point accentué pour après, reliés par une ligne.", needs: "il faut la même mesure à deux moments, dans deux colonnes" },
    de: { summary: "Vorher und nachher je Eintrag auf einer gemeinsamen Achse: ein zurückhaltender Punkt für vorher, ein betonter für nachher, durch eine Linie verbunden.", needs: "braucht dieselbe Kennzahl zu zwei Zeitpunkten, in zwei Spalten" },
  },
  funnel: {
    fr: { summary: "Des étapes dans l'ordre en barres centrées qui se resserrent depuis la première, avec le taux de conversion d'une étape à la suivante et la part de chacune par rapport à la première.", needs: "il faut des étapes ordonnées qui se resserrent, comme visites, inscriptions puis ventes" },
    de: { summary: "Stufen der Reihe nach als zentrierte Balken, die sich ab der ersten verengen, mit der Umwandlungsrate von Stufe zu Stufe und dem Anteil jeder Stufe an der ersten.", needs: "braucht geordnete Stufen, die sich verengen, etwa Besuche, Anmeldungen, Verkäufe" },
  },
  gauge: {
    fr: { summary: "Un chiffre clé sur une échelle en demi-cercle : un arc rempli jusqu'à la valeur, un repère à l'objectif et le nombre en grand dans l'arc." },
    de: { summary: "Eine Kernzahl auf einer Halbkreisskala: ein Bogen bis zum Wert gefüllt, eine Marke beim Ziel und die Zahl groß im Bogen." },
  },
  hbar: {
    fr: { summary: "Des barres horizontales pour les classements et les libellés longs : le libellé à gauche, la barre, la valeur au bout." },
    de: { summary: "Waagrechte Balken für Rangfolgen und lange Beschriftungen: Beschriftung links, Balken, Wert am Ende." },
  },
  heatmap: {
    fr: { summary: "Une grille de cases nuancées sur une échelle de bleu, du clair (bas) au foncé (haut), pour des motifs sur deux catégories comme le jour de la semaine par heure." },
    de: { summary: "Ein Raster aus Feldern auf einer blauen Skala, von hell (niedrig) bis dunkel (hoch), für Muster über zwei Kategorien wie Wochentag nach Stunde." },
  },
  histogram: {
    fr: { summary: "Une distribution en barres jointives : la plage des valeurs est découpée en classes aux bornes rondes, et chaque barre compte les lignes de sa classe." },
    de: { summary: "Eine Verteilung als aneinanderstoßende Balken: Der Wertebereich wird in Klassen mit runden Grenzen geteilt, und jeder Balken zählt die Zeilen seiner Klasse." },
  },
  history: {
    fr: { summary: "L'histoire d'un client en frise verticale : un événement par ligne avec sa date, son titre et un montant éventuel, du plus récent au plus ancien, un point coloré par type.", needs: "il faut des événements datés avec un court titre chacun" },
    de: { summary: "Die Geschichte eines Kunden als senkrechte Zeitleiste: ein Ereignis je Zeile mit Datum, Titel und gegebenenfalls Betrag, neueste zuerst, ein Punkt je Art eingefärbt.", needs: "braucht datierte Ereignisse mit je einem kurzen Titel" },
  },
  horizon: {
    fr: { summary: "Beaucoup de séries temporelles à la fois, chacune sur une fine rangée : les valeurs sont repliées en bandes de couleur de plus en plus soutenue, bleu au-dessus et rouge en dessous." },
    de: { summary: "Viele Zeitreihen auf einmal, jede in einer schmalen Zeile: Die Werte werden in Bänder zunehmend kräftiger Farbe gefaltet, blau darüber und rot darunter." },
  },
  icicle: {
    fr: { summary: "Une hiérarchie à plat : une colonne pour le total, puis une par niveau de gauche à droite, chaque enfant partageant la hauteur de son parent selon sa valeur." },
    de: { summary: "Eine flach gelegte Hierarchie: eine Spalte für die Summe, dann eine je Ebene von links nach rechts, jedes Kind teilt die Höhe seines Elternteils nach Wert." },
  },
  kpi: {
    fr: { summary: "Un chiffre clé avec son évolution face à une comparaison." },
    de: { summary: "Eine Kernzahl mit ihrer Veränderung gegenüber einem Vergleich." },
  },
  kpis: {
    fr: { summary: "Une rangée de tuiles chiffrées dans un même widget, chacune avec un libellé, une valeur et une évolution : la façon sobre de montrer quelques chiffres clés." },
    de: { summary: "Eine Reihe von Kennzahlkacheln in einem Widget, jede mit Beschriftung, Wert und Veränderung: die ruhige Art, eine Handvoll Kernzahlen zu zeigen." },
  },
  lifecycle: {
    fr: { summary: "Des couloirs d'étapes : une ligne par élément sur un axe de dates commun, chaque étape tracée de sa date à la suivante dans une teinte de plus en plus soutenue.", needs: "il faut une colonne de date par étape, dans l'ordre du cycle de vie" },
    de: { summary: "Stufenbahnen: eine Zeile je Eintrag auf einer gemeinsamen Datumsachse, jede Stufe von ihrem Datum bis zum nächsten in einem zunehmend kräftigen Ton.", needs: "braucht eine Datumsspalte je Stufe, in der Reihenfolge des Lebenszyklus" },
  },
  likert: {
    fr: { summary: "Des réponses d'enquête en barres empilées divergentes : une barre par question, centrée sur le milieu neutre, le désaccord à gauche et l'accord à droite.", needs: "il faut des nombres de réponses sur une échelle ordonnée, comme de pas d'accord à d'accord" },
    de: { summary: "Umfrageantworten als auseinanderlaufende gestapelte Balken: ein Balken je Frage, um die neutrale Mitte zentriert, Ablehnung links und Zustimmung rechts.", needs: "braucht Antwortzahlen auf einer geordneten Skala, etwa von Ablehnung bis Zustimmung" },
  },
  line: {
    fr: { summary: "Des lignes qui montrent l'évolution le long d'un axe ordonné, le plus souvent le temps." },
    de: { summary: "Linien, die die Veränderung entlang einer geordneten Achse zeigen, meist der Zeit." },
  },
  list: {
    fr: { summary: "Une liste : une ligne par enregistrement avec un libellé, un détail facultatif dessous et une valeur facultative à droite." },
    de: { summary: "Eine Liste: eine Zeile je Datensatz mit Beschriftung, optionalem Detail darunter und optionalem Wert rechts." },
  },
  locator: {
    fr: { summary: "Une petite carte nette qui dit où sont les choses : un repère et un nom toujours visible pour chaque lieu, comme des bureaux, des magasins ou des sites.", needs: "il faut des lieux nommés avec des codes de région sur un fond de carte, ou des coordonnées" },
    de: { summary: "Eine kleine, klare Karte, die zeigt, wo etwas liegt: eine Markierung und ein stets sichtbarer Name je Ort, etwa Büros, Filialen oder Standorte.", needs: "braucht benannte Orte mit Regionscodes auf einer Grundkarte, oder Koordinaten" },
  },
  marimekko: {
    fr: { summary: "Une mosaïque : une colonne par catégorie, aussi large que son total, découpée en segments selon la part de chaque série." },
    de: { summary: "Ein Mosaik: eine Spalte je Kategorie, so breit wie ihre Summe, in Abschnitte nach dem Anteil jeder Reihe geteilt." },
  },
  matrix: {
    fr: { summary: "Une matrice de marques : une marque par paire de x et y, dimensionnée par une valeur, nuancée par une autre, ou un carré là où un indicateur vaut oui.", needs: "il faut une ligne par paire de deux catégories, comme thème et trimestre" },
    de: { summary: "Eine Markenmatrix: eine Marke je Paar aus x und y, nach einem Wert bemessen, nach einem anderen eingefärbt, oder ein Quadrat, wo ein Merker ja ist.", needs: "braucht eine Zeile je Paar zweier Kategorien, etwa Thema und Quartal" },
  },
  meter: {
    fr: { summary: "La progression vers un objectif, une jauge par ligne : l'atteinte en pourcentage, une barre qui se remplit jusqu'à l'objectif et où l'on en est en clair.", needs: "il faut une colonne d'objectif, de plan ou de budget" },
    de: { summary: "Fortschritt zum Ziel, ein Messbalken je Zeile: die Erreichung in Prozent, ein Balken, der sich bis zum Ziel füllt, und der Stand in klaren Worten.", needs: "braucht eine Ziel-, Plan- oder Budgetspalte" },
  },
  pareto: {
    fr: { summary: "La vue 80/20 : les catégories de la plus grande à la plus petite en barres de leur part du total, une ligne du cumul et un trait pointillé au seuil." },
    de: { summary: "Die 80/20-Sicht: Kategorien von groß nach klein als Balken ihres Anteils an der Summe, eine Linie der laufenden Summe und eine gestrichelte Linie an der Schwelle." },
  },
  pie: {
    fr: { summary: "La part d'un tout en disque plein : 6 parts au plus depuis midi dans le sens horaire, chacune proportionnelle à sa part, avec les parts écrites dessus et une légende." },
    de: { summary: "Anteil am Ganzen als volle Scheibe: höchstens 6 Stücke ab zwölf Uhr im Uhrzeigersinn, jedes so breit wie sein Anteil, mit den Anteilen darauf und einer Legende." },
  },
  pyramid: {
    fr: { summary: "Une pyramide des âges : une ligne par tranche, deux effectifs en barres partant d'un axe central sur une échelle commune, l'un vers la gauche et l'autre vers la droite.", needs: "il faut deux effectifs par tranche ordonnée, comme femmes et hommes par âge" },
    de: { summary: "Eine Bevölkerungspyramide: eine Zeile je Band, zwei Anzahlen als Balken von einer Mittelachse auf gemeinsamer Skala, die eine nach links, die andere nach rechts.", needs: "braucht zwei Anzahlen je geordnetem Band, etwa Frauen und Männer je Altersgruppe" },
  },
  radar: {
    fr: { summary: "Des profils sur plusieurs attributs : un rayon par ligne, des cercles pour une échelle commune depuis zéro, et une forme douce par série." },
    de: { summary: "Profile über mehrere Merkmale: eine Speiche je Zeile, Ringe für eine gemeinsame Skala ab null und eine weiche Form je Reihe." },
  },
  ragboard: {
    fr: { summary: "Un tableau RAG : une ligne par entité et une case rouge, orange ou verte par dimension, la pire d'abord, avec une colonne globale reprenant le pire statut de chaque ligne.", needs: "il faut des colonnes de statut en R, A, G (ou rouge, orange, vert), une ligne par client ou affaire" },
    de: { summary: "Eine RAG-Übersicht: eine Zeile je Einheit und ein rotes, gelbes oder grünes Feld je Dimension, das schlechteste zuerst, mit einer Gesamtspalte mit dem schlechtesten Status je Zeile.", needs: "braucht Statusspalten mit R, A, G (oder rot, gelb, grün), eine Zeile je Kunde oder Geschäft" },
  },
  ragtrend: {
    fr: { summary: "Le statut RAG dans le temps : une ligne par entité et une petite marque par période, de la forme et de la couleur de son statut.", needs: "il faut un statut (R, A, G) par entité et par période" },
    de: { summary: "RAG-Status im Zeitverlauf: eine Zeile je Einheit und eine kleine Marke je Periode, in Form und Farbe ihres Status.", needs: "braucht einen Status (R, A, G) je Einheit und Periode" },
  },
  ridgeline: {
    fr: { summary: "Une courbe de distribution lisse par groupe sur un axe commun, superposées comme une chaîne de montagnes : la dispersion des valeurs dans chaque groupe." },
    de: { summary: "Eine glatte Verteilungskurve je Gruppe auf gemeinsamer Achse, überlappend wie eine Bergkette: wie sich die Werte in jeder Gruppe verteilen." },
  },
  rings: {
    fr: { summary: "Des anneaux de progression concentriques, un par ligne de l'extérieur vers l'intérieur, chacun rempli à sa part de l'objectif ; au-delà, un second tour montre le dépassement.", needs: "il faut une colonne d'objectif, de plan ou de budget" },
    de: { summary: "Konzentrische Fortschrittsringe, einer je Zeile von außen nach innen, jeder bis zu seinem Anteil am Ziel gefüllt; darüber hinaus zeigt eine zweite Runde den Überschuss.", needs: "braucht eine Ziel-, Plan- oder Budgetspalte" },
  },
  rose: {
    fr: { summary: "Un diagramme polaire (une rose de Nightingale) pour un cycle qui revient, comme les heures du jour : une part égale par ligne, dont l'aire suit la valeur." },
    de: { summary: "Ein Polarflächendiagramm (eine Nightingale-Rose) für einen wiederkehrenden Zyklus wie die Stunden des Tages: ein gleiches Stück je Zeile, dessen Fläche dem Wert folgt." },
  },
  sankey: {
    fr: { summary: "Des flux entre étapes en rubans aussi épais que leur volume, par exemple de la source de trafic à la page d'arrivée puis au résultat.", needs: "il faut des flux d'une source vers une cible" },
    de: { summary: "Flüsse zwischen Stufen als Bänder so dick wie ihr Volumen, etwa von der Besucherquelle über die Landeseite zum Ergebnis.", needs: "braucht Flüsse von einer Quelle zu einem Ziel" },
  },
  scatter: {
    fr: { summary: "Un point par ligne placé par deux nombres, pour montrer leur lien." },
    de: { summary: "Ein Punkt je Zeile, nach zwei Zahlen platziert, um ihren Zusammenhang zu zeigen." },
  },
  slope: {
    fr: { summary: "Le mouvement de chaque élément entre deux moments, en ligne d'une colonne gauche à une colonne droite sur une échelle commune.", needs: "il faut la même mesure à deux moments, dans deux colonnes" },
    de: { summary: "Die Bewegung jedes Eintrags zwischen zwei Zeitpunkten, als Linie von einer linken zu einer rechten Spalte auf gemeinsamer Skala.", needs: "braucht dieselbe Kennzahl zu zwei Zeitpunkten, in zwei Spalten" },
  },
  strips: {
    fr: { summary: "Des bandes d'unités : une ligne par élément avec une bande de petits carrés, un par unité, colorés partie par partie (obligatoire, recommandé, facultatif).", needs: "il faut des nombres entiers par ligne, dans une ou plusieurs colonnes de parties" },
    de: { summary: "Einheitenstreifen: eine Zeile je Eintrag mit einem Streifen kleiner Quadrate, eines je Einheit, Teil für Teil eingefärbt (verpflichtend, empfohlen, optional).", needs: "braucht ganze Anzahlen je Zeile, in einer oder mehreren Teilspalten" },
  },
  sunburst: {
    fr: { summary: "Une hiérarchie en anneaux : l'anneau intérieur répartit le total par le premier niveau, chaque anneau extérieur répartit la part de son parent par le niveau suivant." },
    de: { summary: "Eine Hierarchie in Ringen: Der innere Ring teilt die Summe nach der ersten Ebene, jeder äußere Ring teilt das Stück seines Elternteils nach der nächsten Ebene." },
  },
  symbols: {
    fr: { summary: "Une carte avec un cercle sur chaque lieu, dont l'aire suit une valeur : clients par État, volume par port.", needs: "il faut une colonne de codes de pays ou d'États sur un fond de carte, ou des coordonnées" },
    de: { summary: "Eine Karte mit einem Kreis an jedem Ort, dessen Fläche einem Wert folgt: Kunden je Bundesstaat, Volumen je Hafen.", needs: "braucht eine Spalte mit Länder- oder Bundesstaatscodes auf einer Grundkarte, oder Koordinaten" },
  },
  table: {
    fr: { summary: "Des lignes et des colonnes." },
    de: { summary: "Zeilen und Spalten." },
  },
  timeline: {
    fr: { summary: "Un planning de type Gantt : une ligne par tâche avec une barre de sa date de début à sa date de fin, un losange pour les jalons et une ligne facultative pour aujourd'hui.", needs: "il faut des tâches avec une date de début" },
    de: { summary: "Ein Zeitplan im Gantt-Stil: eine Zeile je Aufgabe mit einem Balken vom Start- bis zum Enddatum, eine Raute für Meilensteine und eine optionale Heute-Linie.", needs: "braucht Aufgaben mit einem Startdatum" },
  },
  treemap: {
    fr: { summary: "La part d'un tout pour de nombreuses catégories : des tuiles dimensionnées selon la valeur, gardées presque carrées." },
    de: { summary: "Anteil am Ganzen für viele Kategorien: Kacheln nach Wert bemessen, möglichst quadratisch gehalten." },
  },
  variance: {
    fr: { summary: "L'écart au plan, comme en reporting financier : par ligne une barre de zéro jusqu'au réalisé moins le plan, à droite au-dessus et à gauche en dessous.", needs: "il faut une colonne d'objectif, de plan ou de budget" },
    de: { summary: "Abweichung vom Plan wie im Finanzbericht: je Zeile ein Balken von null bis Ist minus Plan, rechts bei Überschreitung und links bei Unterschreitung.", needs: "braucht eine Ziel-, Plan- oder Budgetspalte" },
  },
  waffle: {
    fr: { summary: "La part d'un tout en grille de 10 sur 10 où chaque carré vaut un pour cent, rempli catégorie par catégorie, avec une légende des valeurs et des parts." },
    de: { summary: "Anteil am Ganzen als Raster von 10 mal 10, in dem jedes Quadrat ein Prozent ist, Kategorie für Kategorie gefüllt, mit einer Legende der Werte und Anteile." },
  },
  waterfall: {
    fr: { summary: "Un pont : comment un total passe à un autre par des hausses et des baisses, chacune flottant sur le cumul, les totaux posés sur zéro.", needs: "il faut des variations qui s'additionnent d'un total à un autre" },
    de: { summary: "Eine Brücke: wie eine Summe über Zu- und Abgänge zu einer anderen wird, jeder auf der laufenden Summe schwebend, die Summen auf null stehend.", needs: "braucht Veränderungen, die sich von einer Summe zur nächsten addieren" },
  },
  whitespace: {
    fr: { summary: "La carte de vente croisée : une case par client et produit, pleine si le client détient le produit, cernée si c'est une opportunité, vide s'il n'est pas éligible.", needs: "il faut une ligne par client et produit avec un état : détenu, opportunité ou non éligible" },
    de: { summary: "Die Cross-Selling-Karte: ein Feld je Kunde und Produkt, gefüllt, wenn der Kunde es hält, umrandet bei einer Chance, leer, wenn er nicht berechtigt ist.", needs: "braucht eine Zeile je Kunde und Produkt mit einem Zustand: gehalten, Chance oder nicht berechtigt" },
  },
  xray: {
    fr: { summary: "La radiographie d'un client : un client sur une carte, à partir de sa première ligne.", needs: "il faut une ligne : un client avec ses faits, ses produits détenus et sa part de portefeuille" },
    de: { summary: "Ein Kundenröntgenbild: ein Kunde auf einer Karte, aus seiner ersten Zeile.", needs: "braucht eine Zeile: ein Kunde mit seinen Fakten, gehaltenen Produkten und seinem Anteil am Vermögen" },
  },
};

/** A type's summary in the language, or undefined (the English stays). */
export function typeSummary(type: string, lang: string): string | undefined {
  return lang === "fr" || lang === "de" ? TYPE_WORDS[type]?.[lang].summary : undefined;
}

/** A job's name, lower-cased for running text. */
function job(purpose: Purpose, lang: TypeLang): string {
  const word = PURPOSE_WORDS[lang][purpose];
  return lang === "de" ? word : word.charAt(0).toLowerCase() + word.slice(1);
}

function list(purposes: Purpose[], lang: TypeLang): string {
  const words = purposes.map((p) => job(p, lang));
  const and = lang === "fr" ? " et " : " und ";
  return words.length > 1 ? `${words.slice(0, -1).join(", ")}${and}${words.at(-1)}` : (words[0] ?? "");
}

/**
 * The advice about switching to another chart, in French or German, from the same facts as guide.ts's English:
 * the verdict and the jobs won and lost, or why it is not possible. Returns the sentence a reader sees first.
 */
export function switchAdvice(sw: ChartSwitch, lang: TypeLang): string {
  if (sw.fit === "no") {
    const needs = TYPE_WORDS[sw.to]?.[lang].needs;
    const head = lang === "fr" ? "Pas possible avec ces données" : "Mit diesen Daten nicht möglich";
    const colon = lang === "fr" ? " : " : ": ";
    // German needs read "braucht …", so the chart is named as their subject.
    if (needs) return lang === "fr" ? `${head}${colon}${needs}.` : `${head}${colon}Das Diagramm ${needs}.`;
    return lang === "fr" ? `${head} : il manque une colonne adaptée à ce graphique.` : `${head}: es fehlt eine passende Spalte für dieses Diagramm.`;
  }
  const gains = sw.gains;
  const lost = sw.losses.filter((p) => !gains.includes(p));
  const fr = lang === "fr";
  switch (sw.verdict) {
    case "better":
      return fr ? `Meilleur pour ${list(gains, lang)}.` : `Besser für ${list(gains, lang)}.`;
    case "same":
      return fr ? "Même usage, sous une autre forme." : "Gleicher Zweck, andere Form.";
    case "trade-off":
      return fr ? `Meilleur pour ${list(gains, lang)} ; moins bon pour ${list(lost, lang)}.` : `Besser für ${list(gains, lang)}; schwächer für ${list(lost, lang)}.`;
    case "different":
      return fr ? `Répond à une autre question : meilleur pour ${list(gains, lang)}, mais renonce à ${list(lost, lang)}.` : `Beantwortet eine andere Frage: besser für ${list(gains, lang)}, verzichtet aber auf ${list(lost, lang)}.`;
    default:
      return lost.length
        ? fr ? `Renonce à ${list(lost, lang)}, sans rien de mieux pour ces données.` : `Verzichtet auf ${list(lost, lang)}, ohne Besseres für diese Daten.`
        : fr ? "Moins adapté à ces données." : "Weniger passend für diese Daten.";
  }
}

/** Why a recommended chart suits the data, in French or German: its best jobs. */
export function pickWhy(type: string, purposes: Partial<Record<Purpose, number>> | undefined, lang: TypeLang): string {
  const ranked = (Object.entries(purposes ?? {}) as [Purpose, number][]).filter(([, s]) => s >= 3).map(([p]) => p).slice(0, 2);
  const summary = TYPE_WORDS[type]?.[lang].summary;
  if (!ranked.length) return summary ?? "";
  return lang === "fr" ? `Idéal pour ${list(ranked, lang)}.` : `Ideal für ${list(ranked, lang)}.`;
}
