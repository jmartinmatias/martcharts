/*
 * The site's look, shared by every page: the theme (auto, light or dark) and the style preset (Glass unless
 * changed; also default, airy, paper). Picked on any page, kept in localStorage, applied on the next page before it
 * paints: data-theme and data-look on the root drive the page backdrop (demo/site-look.css). Pages built from
 * <fft-widget> tags get the preset through each tag's preset attribute; the demo's own pages read it with
 * window.siteLook.get().
 *
 * The language works the same way: English, French or German, picked in the Look menu, kept in localStorage
 * (martcharts:lang) and in the address (?lang=fr), which wins, so a shared link opens in its language. Charts and
 * dashboards follow it (<fft-widget> tags through their locale attribute, the demo's own pages through
 * window.siteLook.get().lang). The site's own words (menu, page heads, buttons) follow too, from WORDS below.
 */
(() => {
  /*
   * The site's own words in French and German: the menu, the Look menu, each page's head and the words the pages write
   * themselves (the Catalog's search, Copy, the Home links, the board tabs). Keyed by the English, so a page is written
   * once in English and site-look.js swaps its words when another language is picked. Charts and dashboards carry their
   * own words (a spec's i18n); this file never touches them.
   *
   * Exact entries: "English": ["français", "Deutsch"]. Patterns: [regex on the English, "français $1", "Deutsch $1"].
   * A {0} in an entry is a value the page fills in.
   */
  const WORDS = {
    exact: {
      // The menu.
      Home: ["Accueil", "Start"],
      Dashboards: ["Tableaux de bord", "Dashboards"],
      Editor: ["Éditeur", "Editor"],
      Composer: ["Compositeur", "Composer"],
      Catalog: ["Catalogue", "Katalog"],
      Embed: ["Intégrer", "Einbetten"],
      Lab: ["Labo", "Labor"],
      Pages: ["Pages", "Seiten"],
      "What martcharts is, and where to start": ["Ce qu'est martcharts, et par où commencer", "Was martcharts ist und wo man anfängt"],
      "Four worked dashboards: sales, commercial, client health and regulatory": ["Quatre tableaux de bord : ventes, commercial, santé client et réglementaire", "Vier ausgearbeitete Dashboards: Vertrieb, Kundengeschäft, Kundengesundheit und Regulierung"],
      "A chart from a table, without writing JSON; or edit any chart's JSON directly": ["Un graphique à partir d'un tableau, sans écrire de JSON ; ou modifier le JSON de n'importe quel graphique", "Ein Diagramm aus einer Tabelle, ohne JSON zu schreiben; oder das JSON jedes Diagramms direkt bearbeiten"],
      "Lay saved charts out into a dashboard": ["Disposer des graphiques enregistrés en tableau de bord", "Gespeicherte Diagramme zu einem Dashboard anordnen"],
      "Every chart type, what it needs, and a spec to copy": ["Chaque type de graphique, ce qu'il lui faut, et une spec à copier", "Jeder Diagrammtyp, was er braucht, und eine Spec zum Kopieren"],
      "Every way to put a chart on a page": ["Toutes les façons de mettre un graphique sur une page", "Alle Wege, ein Diagramm auf eine Seite zu bringen"],
      "Experiments: new versions of any chart, and the ones worth keeping": ["Expériences : de nouvelles versions de chaque graphique, et celles qui valent d'être gardées", "Experimente: neue Fassungen jedes Diagramms und die, die sich lohnen"],
      // The Look menu.
      Look: ["Apparence", "Ansicht"],
      Theme: ["Thème", "Thema"],
      Style: ["Style", "Stil"],
      Language: ["Langue", "Sprache"],
      Auto: ["Auto", "Auto"],
      Light: ["Clair", "Hell"],
      Dark: ["Sombre", "Dunkel"],
      Glass: ["Verre", "Glas"],
      Plain: ["Sobre", "Schlicht"],
      Airy: ["Aéré", "Luftig"],
      Paper: ["Papier", "Papier"],
      // Home.
      "Charts and dashboards from plain data: every chart says what it shows, works with a keyboard, and reads in English, French or German.": ["Des graphiques et des tableaux de bord à partir de données simples : chaque graphique dit ce qu'il montre, se pilote au clavier et se lit en anglais, en français ou en allemand.", "Diagramme und Dashboards aus einfachen Daten: Jedes Diagramm sagt, was es zeigt, lässt sich per Tastatur bedienen und liest sich auf Englisch, Französisch oder Deutsch."],
      "See the dashboards": ["Voir les tableaux de bord", "Dashboards ansehen"],
      "Sales, commercial, client health and regulatory, each read top to bottom.": ["Ventes, commercial, santé client et réglementaire, chacun se lit de haut en bas.", "Vertrieb, Kundengeschäft, Kundengesundheit und Regulierung, jedes von oben nach unten zu lesen."],
      "Open dashboards": ["Ouvrir les tableaux de bord", "Dashboards öffnen"],
      "Make a chart": ["Créer un graphique", "Ein Diagramm erstellen"],
      "Drop a table, pick a chart, then lay charts out into a dashboard in the Composer.": ["Déposez un tableau, choisissez un graphique, puis disposez les graphiques en tableau de bord dans le Compositeur.", "Tabelle ablegen, Diagramm wählen, dann Diagramme im Composer zu einem Dashboard anordnen."],
      "Open the editor": ["Ouvrir l'éditeur", "Editor öffnen"],
      "Browse the charts": ["Parcourir les graphiques", "Diagramme durchsehen"],
      "Every chart type, the data it needs, and a spec to copy.": ["Chaque type de graphique, les données qu'il lui faut, et une spec à copier.", "Jeder Diagrammtyp, die Daten, die er braucht, und eine Spec zum Kopieren."],
      "Open the catalog": ["Ouvrir le catalogue", "Katalog öffnen"],
      "Three of the charts, live": ["Trois des graphiques, en direct", "Drei der Diagramme, live"],
      "See it on the Sales dashboard": ["Le voir sur le tableau de bord Ventes", "Im Vertriebs-Dashboard ansehen"],
      "See it on the Commercial cockpit": ["Le voir sur le cockpit commercial", "Im Vertriebscockpit ansehen"],
      // Dashboards: the page and the tabs (demo/routes.ts).
      "Four worked dashboards, each read top to bottom.": ["Quatre tableaux de bord, chacun se lit de haut en bas.", "Vier ausgearbeitete Dashboards, jedes von oben nach unten zu lesen."],
      Sales: ["Ventes", "Vertrieb"],
      "Revenue, regions, products, customers and the pipeline, for a sales team.": ["Chiffre d'affaires, régions, produits, clients et pipeline, pour une équipe commerciale.", "Umsatz, Regionen, Produkte, Kunden und Pipeline, für ein Vertriebsteam."],
      "Commercial cockpit": ["Cockpit commercial", "Vertriebscockpit"],
      Commercial: ["Commercial", "Vertrieb"],
      "The book at a glance, what needs attention, the pipeline and who to call, for relationship managers.": ["Le portefeuille d'un coup d'œil, ce qui demande attention, le pipeline et qui appeler, pour les chargés de clientèle.", "Der Bestand auf einen Blick, was Aufmerksamkeit braucht, die Pipeline und wen man anruft, für Kundenberater."],
      "Client health": ["Santé client", "Kundengesundheit"],
      "Every client in red, amber or green on four perspectives, against written thresholds.": ["Chaque client en rouge, orange ou vert sur quatre perspectives, selon des seuils écrits.", "Jeder Kunde in Rot, Gelb oder Grün aus vier Perspektiven, gegen schriftliche Schwellen."],
      "Regulatory landscape": ["Paysage réglementaire", "Regulierungslandschaft"],
      Regulatory: ["Réglementaire", "Regulierung"],
      "What is due, the pressure, whom it hits and where it binds, for a compliance officer.": ["Ce qui est dû, la pression, qui est touché et où cela s'applique, pour un responsable conformité.", "Was fällig ist, der Druck, wen es trifft und wo es bindet, für Compliance-Verantwortliche."],
      // Editor and Composer.
      "A chart from a table in four steps, with no JSON to write; or open the JSON and edit any chart directly.": ["Un graphique à partir d'un tableau en quatre étapes, sans JSON à écrire ; ou ouvrez le JSON et modifiez directement n'importe quel graphique.", "Ein Diagramm aus einer Tabelle in vier Schritten, ohne JSON zu schreiben; oder das JSON öffnen und jedes Diagramm direkt bearbeiten."],
      "Edit JSON": ["Modifier le JSON", "JSON bearbeiten"],
      "Paste or edit a chart's spec. Apply draws it below, and the four steps take it from there.": ["Collez ou modifiez la spec d'un graphique. Appliquer la dessine en dessous, et les quatre étapes prennent le relais.", "Spec eines Diagramms einfügen oder bearbeiten. Anwenden zeichnet es darunter, und die vier Schritte machen weiter."],
      Spec: ["Spec", "Spec"],
      Apply: ["Appliquer", "Anwenden"],
      "Show the current chart": ["Afficher le graphique en cours", "Aktuelles Diagramm zeigen"],
      "Lay your saved charts out into a dashboard, with no JSON to write, and publish it.": ["Disposez vos graphiques enregistrés en tableau de bord, sans JSON à écrire, et publiez-le.", "Gespeicherte Diagramme zu einem Dashboard anordnen, ohne JSON zu schreiben, und veröffentlichen."],
      // Lab.
      Experimental: ["Expérimental", "Experimentell"],
      "Experiments with the same charts: they may change or go away.": ["Des expériences avec les mêmes graphiques : elles peuvent changer ou disparaître.", "Experimente mit denselben Diagrammen: Sie können sich ändern oder verschwinden."],
      Taller: ["Taller", "Taller"],
      "New versions of any chart, each answering a sales question, scored on emphasis, surprise, honesty, detail and insight.": ["De nouvelles versions de chaque graphique, chacune répondant à une question commerciale, notées sur l'accent, la surprise, l'honnêteté, le détail et l'éclairage.", "Neue Fassungen jedes Diagramms, jede beantwortet eine Vertriebsfrage, bewertet nach Betonung, Überraschung, Ehrlichkeit, Detail und Einsicht."],
      Selected: ["Sélection", "Auswahl"],
      "The versions worth keeping: the same data shown in new ways, each saying how to read it.": ["Les versions qui valent d'être gardées : les mêmes données montrées autrement, chacune disant comment la lire.", "Die Fassungen, die sich lohnen: dieselben Daten neu gezeigt, jede sagt, wie man sie liest."],
      "Selected variations": ["Variantes retenues", "Ausgewählte Varianten"],
      "An experiment: the same data shown in new ways, each picked because it helps you see something true.": ["Une expérience : les mêmes données montrées autrement, chacune retenue parce qu'elle aide à voir quelque chose de vrai.", "Ein Experiment: dieselben Daten neu gezeigt, jede gewählt, weil sie hilft, etwas Wahres zu sehen."],
      "How we picked": ["Comment nous avons choisi", "Wie wir ausgewählt haben"],
      "It is new": ["C'est nouveau", "Es ist neu"],
      "It is a different kind of chart from the one it came from, not the same chart in new colors.": ["C'est un autre type de graphique que celui d'origine, pas le même dans de nouvelles couleurs.", "Es ist eine andere Diagrammart als die ursprüngliche, nicht dasselbe Diagramm in neuen Farben."],
      "It is true": ["C'est juste", "Es ist wahr"],
      "It uses exactly the same numbers. Nothing is added, removed or made up.": ["Il utilise exactement les mêmes chiffres. Rien n'est ajouté, retiré ou inventé.", "Es nutzt genau dieselben Zahlen. Nichts wird hinzugefügt, entfernt oder erfunden."],
      "It is useful": ["C'est utile", "Es ist nützlich"],
      "It makes one real thing easier to see than before, and the note beside it says what.": ["Il rend une chose réelle plus facile à voir qu'avant, et la note à côté dit laquelle.", "Es macht eine echte Sache leichter sichtbar als vorher, und die Notiz daneben sagt, welche."],
      "The selection": ["La sélection", "Die Auswahl"],
      "An experiment: new versions of any chart, same numbers, each answering a sales question, kept only when balanced and new.": ["Une expérience : de nouvelles versions de chaque graphique, mêmes chiffres, chacune répondant à une question commerciale, gardée seulement si elle est équilibrée et nouvelle.", "Ein Experiment: neue Fassungen jedes Diagramms, gleiche Zahlen, jede beantwortet eine Vertriebsfrage, nur behalten, wenn ausgewogen und neu."],
      "Steer the Taller": ["Piloter le Taller", "Den Taller steuern"],
      "Starting chart": ["Graphique de départ", "Ausgangsdiagramm"],
      "Who reads it": ["Qui le lit", "Wer es liest"],
      "Sales moves": ["Leviers commerciaux", "Vertriebshebel"],
      Color: ["Couleur", "Farbe"],
      "Calm: cool hues": ["Calme : teintes froides", "Ruhig: kühle Töne"],
      "Bold: warm hues, one standout": ["Audacieux : teintes chaudes, un point fort", "Kräftig: warme Töne, ein Blickfang"],
      Marks: ["Marques", "Markierungen"],
      "Smooth: curves, washes": ["Doux : courbes, aplats", "Weich: Kurven, Flächen"],
      "Sharp: bars, steps, dots": ["Net : barres, marches, points", "Scharf: Balken, Stufen, Punkte"],
      Create: ["Créer", "Erstellen"],
      Surprise: ["Surprise", "Überraschung"],
      "The starting chart": ["Le graphique de départ", "Das Ausgangsdiagramm"],
      "How it reads": ["Comment il se lit", "Wie es sich liest"],
      "New versions": ["Nouvelles versions", "Neue Fassungen"],
      "Each card keeps the same numbers and says which sales question it answers. Under each chart: how to read it, and how strong it is on emphasis, surprise, honesty, detail and insight.": ["Chaque carte garde les mêmes chiffres et dit à quelle question commerciale elle répond. Sous chaque graphique : comment le lire, et sa force sur l'accent, la surprise, l'honnêteté, le détail et l'éclairage.", "Jede Karte behält dieselben Zahlen und sagt, welche Vertriebsfrage sie beantwortet. Unter jedem Diagramm: wie man es liest und wie stark es bei Betonung, Überraschung, Ehrlichkeit, Detail und Einsicht ist."],
      "The method": ["La méthode", "Die Methode"],
      // Embed.
      "Embed a chart": ["Intégrer un graphique", "Ein Diagramm einbetten"],
      "Each example below is the code under it, live: copy it into any page, with no build step.": ["Chaque exemple ci-dessous est le code placé dessous, en direct : copiez-le dans n'importe quelle page, sans compilation.", "Jedes Beispiel unten ist der Code darunter, live: in jede Seite kopieren, ohne Build-Schritt."],
      "Which bundle": ["Quel paquet", "Welches Bundle"],
      ": to show charts and dashboards. Most pages need only this one.": [" : pour afficher graphiques et tableaux de bord. La plupart des pages n'ont besoin que de celui-ci.", ": um Diagramme und Dashboards zu zeigen. Die meisten Seiten brauchen nur dieses."],
      ": everything, the editor and composer too.": [" : tout, l'éditeur et le compositeur compris.", ": alles, auch Editor und Composer."],
      ": add it after either one for chart explanations in French and German.": [" : à ajouter après l'un ou l'autre pour les explications des graphiques en français et en allemand.", ": nach einem der beiden einbinden für Diagrammerklärungen auf Französisch und Deutsch."],
      "The spec inside the tag": ["La spec dans la balise", "Die Spec im Tag"],
      "Data, fields and the chart in one block of JSON.": ["Données, champs et graphique dans un seul bloc JSON.", "Daten, Felder und Diagramm in einem JSON-Block."],
      "A spec file": ["Un fichier de spec", "Eine Spec-Datei"],
      "Any widget saved as JSON, from the editor or the catalog.": ["N'importe quel widget enregistré en JSON, depuis l'éditeur ou le catalogue.", "Jedes als JSON gespeicherte Widget, aus dem Editor oder dem Katalog."],
      "A CSV file": ["Un fichier CSV", "Eine CSV-Datei"],
      "As exported from a spreadsheet: the first row names the fields.": ["Tel qu'exporté d'un tableur : la première ligne nomme les champs.", "Wie aus einer Tabellenkalkulation exportiert: Die erste Zeile benennt die Felder."],
      "Just a data file": ["Juste un fichier de données", "Nur eine Datendatei"],
      "No spec at all: the chart is picked from the data's shape.": ["Aucune spec : le graphique est choisi d'après la forme des données.", "Gar keine Spec: Das Diagramm wird nach der Form der Daten gewählt."],
      "From JavaScript": ["Depuis JavaScript", "Aus JavaScript"],
      "Set the spec from code; here the data is a function that runs in the page.": ["La spec est fixée par le code ; ici, les données sont une fonction exécutée dans la page.", "Die Spec per Code setzen; hier sind die Daten eine Funktion, die in der Seite läuft."],
      "In an iframe, on any site": ["Dans une iframe, sur n'importe quel site", "In einem iframe, auf jeder Website"],
      "For sites that cannot load scripts: the frame sizes itself to the chart.": ["Pour les sites qui ne peuvent pas charger de scripts : le cadre s'ajuste au graphique.", "Für Websites, die keine Skripte laden können: Der Rahmen passt sich dem Diagramm an."],
      Copy: ["Copier", "Kopieren"],
      // Catalog and Data guide.
      Charts: ["Graphiques", "Diagramme"],
      "Data guide": ["Guide des données", "Datenleitfaden"],
      ", with its data built in and a spec to copy.": [", avec ses données intégrées et une spec à copier.", ", mit eingebauten Daten und einer Spec zum Kopieren."],
      "Find a chart by name, question, data or ref (W-…)": ["Trouver un graphique par nom, question, données ou réf. (W-…)", "Diagramm nach Name, Frage, Daten oder Ref. finden (W-…)"],
      "Find a chart by name, job or ref (W-…)": ["Trouver un graphique par nom, usage ou réf. (W-…)", "Diagramm nach Name, Aufgabe oder Ref. finden (W-…)"],
      "Name or job, such as trend or map": ["Nom ou usage, par exemple tendance ou carte", "Name oder Aufgabe, etwa Trend oder Karte"],
      "Clear search": ["Effacer la recherche", "Suche leeren"],
      "Copy spec": ["Copier la spec", "Spec kopieren"],
      "Copy tag": ["Copier la balise", "Tag kopieren"],
      "Data and switches": ["Données et variantes", "Daten und Wechsel"],
      "Which chart for which job": ["Quel graphique pour quel usage", "Welches Diagramm für welche Aufgabe"],
      Job: ["Usage", "Aufgabe"],
      Best: ["Idéal", "Am besten"],
      Good: ["Bien", "Gut"],
      "Comparing amounts across categories": ["Comparer des montants entre catégories", "Beträge zwischen Kategorien vergleichen"],
      "Ranking, top to bottom": ["Classer, du haut vers le bas", "Rangfolge, von oben nach unten"],
      "Trend over time": ["Tendance dans le temps", "Trend über die Zeit"],
      "Share of one whole": ["Part d'un tout", "Anteil an einem Ganzen"],
      "How each group or period splits": ["Comment chaque groupe ou période se répartit", "Wie sich jede Gruppe oder Periode aufteilt"],
      "How values spread": ["Comment les valeurs se répartissent", "Wie Werte streuen"],
      "How two measures relate": ["Comment deux mesures sont liées", "Wie zwei Kennzahlen zusammenhängen"],
      "Flows between stages or groups": ["Flux entre étapes ou groupes", "Flüsse zwischen Stufen oder Gruppen"],
      "Conversion through ordered steps": ["Conversion à travers des étapes ordonnées", "Konversion durch geordnete Schritte"],
      "Nested breakdowns": ["Décompositions imbriquées", "Verschachtelte Aufteilungen"],
      "Actual against target or plan": ["Réel face à l'objectif ou au plan", "Ist gegen Ziel oder Plan"],
      "No chart matches. Try another word, such as share, time or flow.": ["Aucun graphique ne correspond. Essayez un autre mot, comme part, temps ou flux.", "Kein Diagramm passt. Versuchen Sie ein anderes Wort, etwa Anteil, Zeit oder Fluss."],
      // Words the pages write as they go.
      Copied: ["Copié", "Kopiert"],
      "Copy failed": ["Échec de la copie", "Kopieren fehlgeschlagen"],
      "{0} of {1}": ["{0} sur {1}", "{0} von {1}"],
      "No chart matches “{0}”.": ["Aucun graphique ne correspond à « {0} ».", "Kein Diagramm passt zu „{0}“."],
      "No chart on the site has the ref {0}.": ["Aucun graphique du site n'a la réf. {0}.", "Kein Diagramm der Website hat die Ref. {0}."],
      "{0} is now ": ["{0} est désormais ", "{0} heißt jetzt "],
      // The data guide's own headings, labels and buttons (its charts' summaries, jobs and advice carry their own).
      "The chart live, the table it needs, its data, and the charts the same data makes": ["Le graphique en direct, le tableau qu'il lui faut, ses données et les graphiques que ces données permettent", "Das Diagramm live, die Tabelle, die es braucht, seine Daten und die Diagramme aus denselben Daten"],
      "Best for": ["Idéal pour", "Ideal für"],
      "Least useful for": ["Moins utile pour", "Weniger nützlich für"],
      "The table it needs": ["Le tableau qu'il lui faut", "Die Tabelle, die es braucht"],
      "One row is:": ["Une ligne, c'est :", "Eine Zeile ist:"],
      "How it is built:": ["Comment il est construit :", "Wie es aufgebaut ist:"],
      "Reads well with": ["Se lit bien avec", "Liest sich gut mit"],
      "This example's columns": ["Les colonnes de cet exemple", "Die Spalten dieses Beispiels"],
      "The data drawing it now": ["Les données qui le dessinent", "Die Daten, die es jetzt zeichnen"],
      "The same data as another chart": ["Les mêmes données en un autre graphique", "Dieselben Daten als anderes Diagramm"],
      Job: ["Usage", "Zweck"],
      Best: ["Idéal", "Am besten"],
      Good: ["Bon", "Gut"],
      Chart: ["Graphique", "Diagramm"],
      Verdict: ["Verdict", "Urteil"],
      Assessment: ["Appréciation", "Einschätzung"],
      Preview: ["Aperçu", "Vorschau"],
      Show: ["Afficher", "Zeigen"],
      Option: ["Option", "Option"],
      Holds: ["Contient", "Enthält"],
      Required: ["Requis", "Erforderlich"],
      "What it does": ["Rôle", "Funktion"],
      Column: ["Colonne", "Spalte"],
      "Drawn as": ["Dessinée comme", "Gezeichnet als"],
      Values: ["Valeurs", "Werte"],
      yes: ["oui", "ja"],
      stretch: ["à la limite", "grenzwertig"],
      "Copy as CSV": ["Copier en CSV", "Als CSV kopieren"],
      "Copy for an LLM": ["Copier pour un LLM", "Für ein LLM kopieren"],
      "Open as Markdown": ["Ouvrir en Markdown", "Als Markdown öffnen"],
      "Spec (JSON)": ["Spéc. (JSON)", "Spezifikation (JSON)"],
      "Any rows: every field becomes a column.": ["N'importe quelles lignes : chaque champ devient une colonne.", "Beliebige Zeilen: Jedes Feld wird eine Spalte."],
    },
    patterns: [
      [/^Not possible with this data \((\d+)\)$/, "Pas possible avec ces données ($1)", "Mit diesen Daten nicht möglich ($1)"],
      [/^Show all (\d+) rows$/, "Afficher les $1 lignes", "Alle $1 Zeilen zeigen"],
      [/^(\d+) rows?$/, "$1 ligne(s)", "$1 Zeile(n)"],
      [/^needs (.+)$/, "il faut $1", "braucht $1"],
      [/^(\d+) chart types\. Each is one tag,$/, "$1 types de graphiques. Chacun est une seule balise,", "$1 Diagrammtypen. Jeder ist ein einziges Tag,"],
      [/^For each of the (\d+) charts: the table it needs, the data drawing it, and which other charts the same data makes\.$/, "Pour chacun des $1 graphiques : le tableau qu'il lui faut, les données qui le dessinent, et les autres graphiques que ces données permettent.", "Für jedes der $1 Diagramme: die Tabelle, die es braucht, die Daten, die es zeichnen, und welche anderen Diagramme dieselben Daten ergeben."],
      [/^trend, share, date, (W-[0-9A-Z]{4}…)$/, "tendance, part, date, $1", "Trend, Anteil, Datum, $1"],
    ],
  };

  const KEY = "martcharts:look";
  const LANG_KEY = "martcharts:lang";
  /** The languages offered, with the locale charts are drawn in. */
  const LOCALES = { en: "en-US", fr: "fr-FR", de: "de-DE" };
  /** The look before anyone picks one: Glass, following the system theme. */
  const DEFAULTS = { theme: "auto", preset: "glass" };
  const root = document.documentElement;
  const read = () => {
    try {
      return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || "{}") || {}) };
    } catch {
      return { ...DEFAULTS };
    }
  };
  const write = (look) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(look));
    } catch {
      // Private windows and blocked storage: the look still applies to this page.
    }
  };
  const storedLang = () => {
    try {
      const value = localStorage.getItem(LANG_KEY);
      return value && Object.hasOwn(LOCALES, value) ? value : "en";
    } catch {
      return "en";
    }
  };
  const writeLang = (lang) => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // Blocked storage: the address still carries it.
    }
  };
  /** The language: the address's (?lang=fr) when it names one, which is then kept; else the one picked before. */
  const readLang = () => {
    const asked = new URLSearchParams(location.search).get("lang");
    if (asked && Object.hasOwn(LOCALES, asked.toLowerCase())) {
      const lang = asked.toLowerCase();
      if (lang !== storedLang()) writeLang(lang);
      return lang;
    }
    return storedLang();
  };
  /** The address carries a chosen language (?lang=fr), so a copied or shared link opens in it; English needs none. */
  const keepInAddress = (lang) => {
    const url = new URL(location.href);
    if (lang === "en") url.searchParams.delete("lang");
    else url.searchParams.set("lang", lang);
    if (url.href !== location.href) history.replaceState(history.state, "", url);
  };
  /** The French and German reading guides, for pages on the lite bundle (the full one carries them). */
  const loadReading = (lang) => {
    if (lang === "en" || document.querySelector("script[data-site-reading]")) return;
    const lite = document.querySelector('script[src*="martcharts-lite.iife.js"]');
    if (!lite) return;
    const reading = document.createElement("script");
    reading.src = lite.getAttribute("src").replace("martcharts-lite.iife.js", "martcharts-reading.iife.js");
    reading.dataset.siteReading = "";
    document.head.append(reading);
  };
  /** <fft-widget> tags draw in the language: a locale attribute over the spec's own, removed for English. */
  const applyLang = (lang) => {
    for (const el of document.querySelectorAll("fft-widget")) {
      if (lang === "en") el.removeAttribute("locale");
      else el.setAttribute("locale", LOCALES[lang]);
    }
    loadReading(lang);
  };
  /** The site's own word for an English one, in the language picked; {0}, {1} filled from the values. */
  const t = (english, ...values) => {
    const at = lang === "fr" ? 0 : lang === "de" ? 1 : -1;
    let text = english;
    if (at >= 0) {
      const exact = WORDS.exact[english];
      if (exact) text = exact[at];
      else
        for (const [pattern, fr, de] of WORDS.patterns) {
          if (pattern.test(english)) {
            text = english.replace(pattern, at === 0 ? fr : de);
            break;
          }
        }
    }
    return text.replace(/\{(\d)\}/g, (_, i) => String(values[Number(i)] ?? ""));
  };
  /** Where the site's words live: everything but charts, dashboards, the builders' own panels and code. */
  const NOT_SITE = "fft-widget, .fft-widget, .fft-dashboard, .fft-editor, .fft-composer, pre, code, textarea, script, style, .site-look-group[data-look-key='lang'] button";
  const shownText = new WeakMap();
  const shownAttr = new WeakMap();
  /** The page's own words in the language: each text and label as written in English, swapped, and back for English. */
  const translatePage = () => {
    if (!document.body) return;
    // Generated text that carries its own French and German (the catalog's and the guide's chart summaries, jobs and
    // advice): the element shows its own words in the language picked, and its English again for English.
    for (const el of document.body.querySelectorAll("[data-fr], [data-de]")) {
      if (el.dataset.en === undefined) el.dataset.en = el.textContent ?? "";
      el.textContent = (lang === "fr" ? el.dataset.fr : lang === "de" ? el.dataset.de : undefined) ?? el.dataset.en;
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement?.closest(NOT_SITE)) continue;
      const english = shownText.get(node) ?? node.nodeValue;
      const trimmed = english.trim();
      if (!trimmed || !/[A-Za-z]/.test(trimmed)) continue;
      const said = t(trimmed);
      if (said === trimmed && !shownText.has(node)) continue;
      shownText.set(node, english);
      node.nodeValue = english.replace(trimmed, said);
    }
    for (const el of document.body.querySelectorAll("[placeholder], [aria-label], [title]")) {
      if (el.closest(NOT_SITE)) continue;
      const kept = shownAttr.get(el) ?? {};
      for (const name of ["placeholder", "aria-label", "title"]) {
        if (!el.hasAttribute(name)) continue;
        const english = kept[name] ?? el.getAttribute(name);
        const said = t(english);
        if (said === english && !(name in kept)) continue;
        kept[name] = english;
        el.setAttribute(name, said);
      }
      shownAttr.set(el, kept);
    }
    const title = shownText.get(document) ?? document.title;
    shownText.set(document, title);
    document.title = title.split(" · ").map((part) => t(part)).join(" · ");
    root.lang = lang;
  };
  const applyTheme = (theme) => {
    if (!theme || theme === "auto") {
      delete root.dataset.theme;
      root.style.colorScheme = "";
    } else {
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
    }
  };
  const applyPreset = (preset) => {
    root.dataset.look = preset || "default";
    for (const el of document.querySelectorAll("fft-widget")) {
      if (preset && preset !== "default") el.setAttribute("preset", preset);
      else el.removeAttribute("preset");
    }
  };
  /** Marks the page's own Theme and Style switches, where it has them. */
  const mark = (look) => {
    for (const [key, value] of [["theme", look.theme || "auto"], ["preset", look.preset || "default"], ["lang", look.lang || "en"]]) {
      for (const b of document.querySelectorAll(`[data-look-key="${key}"] button[data-look-value]`)) b.setAttribute("aria-pressed", String(b.dataset.lookValue === value));
    }
  };
  const apply = (look) => {
    applyTheme(look.theme);
    applyPreset(look.preset);
    applyLang(look.lang || "en");
    translatePage();
    mark(look);
  };
  /** On a narrow screen the nav scrolls sideways: bring the current page into view. */
  const showCurrent = () => {
    const nav = document.querySelector(".site-nav");
    const current = nav?.querySelector('[aria-current="page"]');
    if (nav && current && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, current.offsetLeft + current.offsetWidth - nav.clientWidth + 34);
  };

  // Before the first paint: theme and backdrop. The tags and switches wait for the page to be parsed.
  const first = read();
  applyTheme(first.theme);
  root.dataset.look = first.preset || "default";
  let lang = readLang();
  keepInAddress(lang);
  const current = () => ({ ...read(), lang });
  window.siteLook = {
    get: current,
    /** The locale charts draw in: undefined for English, so specs keep their own (all of them English). */
    locale: () => (lang === "en" ? undefined : LOCALES[lang]),
    /** The site's own words in the language picked: t("Copy spec"), t("{0} of {1}", 3, 57). */
    t,
    /** Swaps the page's own words again, for a page that has just written new ones in English. */
    translate: () => translatePage(),
    set(patch) {
      const { lang: nextLang, ...look } = patch;
      if (nextLang && Object.hasOwn(LOCALES, nextLang)) {
        lang = nextLang;
        writeLang(lang);
        keepInAddress(lang);
      }
      if (Object.keys(look).length) write({ ...read(), ...look });
      const next = current();
      apply(next);
      return next;
    },
  };
  /**
   * The Look menu in the site bar: a theme applies at once (the page and its charts follow the root's data-theme). A
   * style changes how charts are drawn: the page hears it as a cancelable "martcharts:look" event and restyles its
   * charts in place (calling preventDefault); a page that does not, and has no <fft-widget> tags, reloads in the new style.
   */
  const wireMenu = () => {
    for (const b of document.querySelectorAll("[data-look-key] button[data-look-value]")) {
      b.addEventListener("click", () => {
        const key = b.closest("[data-look-key]").dataset.lookKey;
        const before = current();
        const next = window.siteLook.set({ [key]: b.dataset.lookValue });
        // A language redraws charts and boards: the page hears "martcharts:lang" and redraws in place
        // (preventDefault); one that does not, and has no <fft-widget> tags (which follow by themselves), reloads.
        if (key === "lang") {
          if (before.lang === next.lang) return;
          const handled = !window.dispatchEvent(new CustomEvent("martcharts:lang", { detail: next, cancelable: true }));
          if (!handled && !document.querySelector("fft-widget")) location.reload();
          return;
        }
        if (key !== "preset" || before.preset === next.preset) return;
        const handled = !window.dispatchEvent(new CustomEvent("martcharts:look", { detail: next, cancelable: true }));
        if (!handled && !document.querySelector("fft-widget")) location.reload();
      });
    }
    // Escape or a click elsewhere closes the menu.
    const menu = document.querySelector(".site-look-menu");
    if (!menu) return;
    document.addEventListener("click", (event) => {
      if (menu.open && !menu.contains(event.target)) menu.removeAttribute("open");
    });
    menu.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !menu.open) return;
      menu.removeAttribute("open");
      menu.querySelector("summary").focus();
    });
  };
  const start = () => {
    apply(current());
    wireMenu();
    showCurrent();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  // Another tab changed the look: follow it.
  window.addEventListener("storage", (event) => event.key === KEY && apply(current()));
})();
