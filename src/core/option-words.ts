/**
 * French and German for the words around the charts that a builder or the guide shows: every view option's name and
 * hint (the Editor's Refine panel and More options), and the chart guide's "best for", "least useful for", how each
 * chart is built and what one row is. Keyed by the English text, so a hint that changes in English simply falls back
 * to English until its translation follows (src/i18n-options.test.ts lists any that are missing).
 *
 * Not in the library bundles: importing this module registers the words on `globalThis` (see `optionWords`), the way
 * the reading add-on registers French and German reading. The site's Editor page imports it; the build scripts use it
 * to write `data-fr` and `data-de` on the Data guide and the catalog.
 *
 * Generated from the registry's English by a one-off script; edit the texts here.
 *
 * @module
 */
export type OptionLang = "fr" | "de";
type Pair = [fr: string, de: string];

/** Each option's hint, by its English description. */
export const OPTION_HINTS: Record<string, Pair> = {
 "Field with the date or period of each reading.": [
  "Champ avec la date ou la période de chaque relevé.",
  "Feld mit dem Datum oder der Periode jedes Messwerts."
 ],
 "Field naming the measure each row belongs to; each measure is one lane.": [
  "Champ nommant la mesure de chaque ligne ; chaque mesure a son couloir.",
  "Feld mit der Kennzahl, zu der eine Zeile gehört; jede Kennzahl hat ihre eigene Bahn."
 ],
 "Field with the reading.": [
  "Champ avec le relevé.",
  "Feld mit dem Messwert."
 ],
 "Field with the value expected that day, drawn as a hairline through the band.": [
  "Champ avec la valeur attendue ce jour-là, tracée en trait fin au milieu de la bande.",
  "Feld mit dem an diesem Tag erwarteten Wert, als feine Linie durch das Band gezogen."
 ],
 "Field with the bottom of the expected band. Needs high too.": [
  "Champ avec le bas de la bande attendue. Demande aussi high.",
  "Feld mit der Untergrenze des erwarteten Bands. Braucht auch high."
 ],
 "Field with the top of the expected band. Needs low too.": [
  "Champ avec le haut de la bande attendue. Demande aussi low.",
  "Feld mit der Obergrenze des erwarteten Bands. Braucht auch low."
 ],
 "Field that is true on anomalous readings (true, 1, \"yes\"). Flagged readings draw as filled dots in the alert color. Without it, readings outside the band are flagged.": [
  "Champ vrai sur les relevés anormaux (true, 1, \"yes\"). Ces relevés sont des points pleins dans la couleur d'alerte. Sans lui, les relevés hors de la bande sont signalés.",
  "Feld, das bei auffälligen Messwerten wahr ist (true, 1, \"yes\"). Markierte Werte erscheinen als gefüllte Punkte in der Warnfarbe. Ohne dieses Feld werden Werte außerhalb des Bands markiert."
 ],
 "Field for the ordered axis, usually a date or period.": [
  "Champ de l'axe ordonné, en général une date ou une période.",
  "Feld für die geordnete Achse, meist ein Datum oder eine Periode."
 ],
 "Field or fields for the values. Each field is one series.": [
  "Champ ou champs des valeurs. Chaque champ est une série.",
  "Feld oder Felder für die Werte. Jedes Feld ist eine Reihe."
 ],
 "true stacks the series as bands, each on top of the ones before, so the top edge is the total; \"percent\" stacks them as shares of 100%; \"stream\" is a streamgraph: smooth bands centered on a middle line, each named inside itself, with no value axis since only thickness carries meaning (the tooltip has the numbers). Negative values count as zero.": [
  "true empile les séries en bandes, chacune sur les précédentes, le bord du haut donnant le total ; \"percent\" les empile en parts de 100 % ; \"stream\" trace un streamgraph : des bandes lissées autour d'une ligne médiane, nommées en leur sein, sans axe de valeurs car seule l'épaisseur compte (l'info-bulle donne les chiffres). Les valeurs négatives comptent pour zéro.",
  "true stapelt die Reihen als Bänder übereinander, sodass die Oberkante die Summe zeigt; \"percent\" stapelt sie als Anteile an 100 %; \"stream\" zeichnet einen Streamgraph: geglättete Bänder um eine Mittellinie, jedes in sich beschriftet, ohne Werteachse, da nur die Dicke zählt (der Tooltip nennt die Zahlen). Negative Werte zählen als null."
 ],
 "Series field or fields to keep in color; every other series turns grey. Example: \"revenue\".": [
  "Champ ou champs de séries à garder en couleur ; les autres séries passent en gris. Exemple : \"revenue\".",
  "Reihenfeld oder -felder, die farbig bleiben; alle anderen Reihen werden grau. Beispiel: \"revenue\"."
 ],
 "Write each series' last value at its end, for up to 4 series. Hidden automatically when two ends would collide.": [
  "Écrit la dernière valeur de chaque série à son extrémité, jusqu'à 4 séries. Masqué si deux extrémités se chevauchent.",
  "Schreibt den letzten Wert jeder Reihe an ihr Ende, für bis zu 4 Reihen. Wird ausgeblendet, wenn sich zwei Enden überlagern würden."
 ],
 "Target lines and bands across the value axis. Each item is { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; default avg), or { from, to, label } for a band. Example: [{ \"value\": 1200000, \"label\": \"Target\" }].": [
  "Lignes et bandes de cible sur l'axe des valeurs. Chaque élément est { value, label }, { field, agg, label } (agg : last, first, sum, avg, min, max ; avg par défaut) ou { from, to, label } pour une bande. Exemple : [{ \"value\": 1200000, \"label\": \"Target\" }].",
  "Ziellinien und Bänder entlang der Werteachse. Jeder Eintrag ist { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; Standard avg) oder { from, to, label } für ein Band. Beispiel: [{ \"value\": 1200000, \"label\": \"Target\" }]."
 ],
 "Field that is true on forecast rows. From the last actual on, lines draw dashed in a softly shaded zone labelled Forecast, and the tooltip marks those rows. On an area the forecast's wash is fainter too. Unstacked areas only.": [
  "Champ vrai sur les lignes de prévision. À partir du dernier réel, les lignes passent en pointillé dans une zone légèrement grisée nommée Prévision, et l'info-bulle les signale. Sur une aire, le voile de la prévision est aussi plus pâle. Aires non empilées seulement.",
  "Feld, das bei Prognosezeilen wahr ist. Ab dem letzten Istwert werden Linien gestrichelt in einer leicht schattierten Zone namens Prognose gezeichnet, und der Tooltip markiert diese Zeilen. Bei Flächen ist die Prognose zudem blasser. Nur ungestapelte Flächen."
 ],
 "A shaded range behind the first line, for a forecast fan or any low to high spread: { \"low\": \"p10\", \"high\": \"p90\", \"label\": \"80% range\" }. Give the last actual row low and high equal to its value, so the fan opens from it. The ends are labelled and the tooltip gives the range.": [
  "Une plage grisée derrière la première ligne, pour un éventail de prévision ou tout écart bas-haut : { \"low\": \"p10\", \"high\": \"p90\", \"label\": \"80% range\" }. Donnez au dernier réel low et high égaux à sa valeur, pour que l'éventail s'ouvre depuis lui. Les bornes sont étiquetées et l'info-bulle donne la plage.",
  "Ein schattierter Bereich hinter der ersten Linie, für einen Prognosefächer oder jede Spanne von niedrig bis hoch: { \"low\": \"p10\", \"high\": \"p90\", \"label\": \"80% range\" }. Geben Sie der letzten Istzeile low und high gleich ihrem Wert, damit sich der Fächer von dort öffnet. Die Grenzen sind beschriftet, der Tooltip nennt die Spanne."
 ],
 "\"smooth\" curves through every point without ever swinging past one (a monotone curve), for a soft, calm trend; \"step\" holds each value until halfway to the next, for amounts that change in jumps such as prices or headcount. Stacked and stream areas keep their own shapes.": [
  "\"smooth\" passe par chaque point en courbe douce sans jamais le dépasser (une courbe monotone), pour une tendance calme ; \"step\" garde chaque valeur jusqu'à mi-chemin de la suivante, pour les montants qui changent par sauts, comme les prix ou les effectifs. Les aires empilées et les streams gardent leur forme.",
  "\"smooth\" führt eine weiche Kurve durch jeden Punkt, ohne über einen hinauszuschwingen (monoton), für einen ruhigen Trend; \"step\" hält jeden Wert bis zur Mitte des nächsten, für Beträge, die sich sprunghaft ändern, etwa Preise oder Personalstand. Gestapelte Flächen und Streams behalten ihre Form."
 ],
 "Short notes pinned to points of the chart, each { \"x\": <category or period>, \"y\"?: <value>, \"text\": \"…\" }. Without y the note sits on the value there. Each note is a few words beside a small dot, with a thin leader to it; on a narrow card the notes become numbered markers with the texts listed under the chart. Example: [{ \"x\": \"2026-03\", \"text\": \"Price rise\" }].": [
  "Courtes notes épinglées sur le graphique, chacune { \"x\": <catégorie ou période>, \"y\"?: <valeur>, \"text\": \"…\" }. Sans y, la note se pose sur la valeur. Chaque note tient en quelques mots près d'un petit point, reliée par un trait fin ; sur une carte étroite, elles deviennent des repères numérotés listés sous le graphique. Exemple : [{ \"x\": \"2026-03\", \"text\": \"Price rise\" }].",
  "Kurze Notizen an Punkten des Diagramms, jeweils { \"x\": <Kategorie oder Periode>, \"y\"?: <Wert>, \"text\": \"…\" }. Ohne y sitzt die Notiz auf dem dortigen Wert. Jede Notiz besteht aus wenigen Wörtern neben einem kleinen Punkt, mit einer feinen Verbindungslinie; auf schmalen Karten werden daraus nummerierte Marker mit den Texten unter dem Diagramm. Beispiel: [{ \"x\": \"2026-03\", \"text\": \"Price rise\" }]."
 ],
 "Field for the categories along the horizontal axis.": [
  "Champ des catégories le long de l'axe horizontal.",
  "Feld für die Kategorien entlang der horizontalen Achse."
 ],
 "Field or fields for bar heights. Each field is one series.": [
  "Champ ou champs des hauteurs de barres. Chaque champ est une série.",
  "Feld oder Felder für die Balkenhöhen. Jedes Feld ist eine Reihe."
 ],
 "Field or fields drawn as lines over the bars, on the same axis, for example a target. Never a second axis. Under one target line (a field named target, plan, goal, budget or quota), bars on the wrong side of it (see goodWhen) are drawn outlined and keyed Below target.": [
  "Champ ou champs tracés en lignes sur les barres, sur le même axe, par exemple une cible. Jamais de second axe. Sous une seule ligne de cible (un champ nommé target, plan, goal, budget ou quota), les barres du mauvais côté (voir goodWhen) sont détourées et légendées Sous la cible.",
  "Feld oder Felder, die als Linien über den Balken gezeichnet werden, auf derselben Achse, etwa ein Ziel. Nie eine zweite Achse. Unter einer einzigen Ziellinie (ein Feld namens target, plan, goal, budget oder quota) werden Balken auf der falschen Seite (siehe goodWhen) umrandet und als Unter Ziel ausgewiesen."
 ],
 "true stacks the series into one column per category (part-to-whole); \"percent\" stacks them as shares of 100%.": [
  "true empile les séries en une colonne par catégorie (partie du tout) ; \"percent\" les empile en parts de 100 %.",
  "true stapelt die Reihen zu einer Säule je Kategorie (Teil eines Ganzen); \"percent\" stapelt sie als Anteile an 100 %."
 ],
 "Category value or values to keep in color; every other category turns grey. Example: \"East\" or [\"East\", \"North\"]. Or a rule on the rows: { \"field\": \"revenue\", \"op\": \">\", \"value\": 1000000 } keeps the categories above 1M in color, and { \"top\": 3 } the three largest.": [
  "Valeur ou valeurs de catégorie à garder en couleur ; les autres passent en gris. Exemple : \"East\" ou [\"East\", \"North\"]. Ou une règle sur les lignes : { \"field\": \"revenue\", \"op\": \">\", \"value\": 1000000 } garde en couleur les catégories au-dessus de 1 M, et { \"top\": 3 } les trois plus grandes.",
  "Kategoriewert oder -werte, die farbig bleiben; alle anderen werden grau. Beispiel: \"East\" oder [\"East\", \"North\"]. Oder eine Regel auf den Zeilen: { \"field\": \"revenue\", \"op\": \">\", \"value\": 1000000 } lässt die Kategorien über 1 Mio. farbig, { \"top\": 3 } die drei größten."
 ],
 "\"lollipop\" draws a thin stem from the baseline and a dot at the value in place of each bar: the same reading with far less ink, for rankings of many similar values.": [
  "\"lollipop\" trace une tige fine depuis la base et un point à la valeur au lieu de chaque barre : la même lecture avec bien moins d'encre, pour classer beaucoup de valeurs proches.",
  "\"lollipop\" zeichnet statt jedes Balkens einen dünnen Stiel ab der Grundlinie und einen Punkt beim Wert: dieselbe Aussage mit viel weniger Tinte, für Ranglisten vieler ähnlicher Werte."
 ],
 "Which side of a target is good news: \"up\" for revenue, \"down\" for wait times and costs. Under one target (a lines field or a reference line labeled target, plan, goal, budget or quota), a bar on the wrong side is drawn outlined and keyed Below or Over the target.": [
  "Le côté de la cible qui est une bonne nouvelle : \"up\" pour le chiffre d'affaires, \"down\" pour les délais et les coûts. Sous une seule cible (un champ de lines ou une ligne de référence nommée target, plan, goal, budget ou quota), une barre du mauvais côté est détourée et légendée Sous ou Au-dessus de la cible.",
  "Welche Seite eines Ziels gut ist: \"up\" für Umsatz, \"down\" für Wartezeiten und Kosten. Unter einem einzigen Ziel (ein lines-Feld oder eine Bezugslinie namens target, plan, goal, budget oder quota) wird ein Balken auf der falschen Seite umrandet und als Unter oder Über Ziel ausgewiesen."
 ],
 "Field drawn as a wider, quieter column behind each bar, on the same axis, for a comparison such as last year or the plan. The key names it by its label and the tooltip gives its value. One y series, unstacked.": [
  "Champ tracé en colonne plus large et plus discrète derrière chaque barre, sur le même axe, pour comparer à l'an dernier ou au plan. La légende la nomme par son libellé et l'info-bulle donne sa valeur. Une seule série y, non empilée.",
  "Feld, das als breitere, ruhigere Säule hinter jedem Balken gezeichnet wird, auf derselben Achse, für einen Vergleich wie Vorjahr oder Plan. Die Legende nennt es mit seiner Bezeichnung, der Tooltip seinen Wert. Eine y-Reihe, ungestapelt."
 ],
 "Orders the rows before drawing: \"value\" ranks them by their number (largest first), \"label\" by name (A to Z), \"none\" keeps the data's order. Stacked bars and strips rank by their total.": [
  "Ordonne les lignes avant de tracer : \"value\" les classe par leur nombre (le plus grand d'abord), \"label\" par nom (de A à Z), \"none\" garde l'ordre des données. Les barres empilées et les bandes se classent par leur total.",
  "Ordnet die Zeilen vor dem Zeichnen: \"value\" nach ihrer Zahl (größte zuerst), \"label\" nach Name (A bis Z), \"none\" behält die Reihenfolge der Daten. Gestapelte Balken und Streifen ordnen nach ihrer Summe."
 ],
 "Turns the sort around: \"asc\" puts the smallest first, \"desc\" names Z to A. Defaults to largest first for value, A to Z for label.": [
  "Inverse le tri : \"asc\" met le plus petit d'abord, \"desc\" va de Z à A. Par défaut, le plus grand d'abord pour value, de A à Z pour label.",
  "Kehrt die Sortierung um: \"asc\" setzt den kleinsten Wert zuerst, \"desc\" sortiert von Z nach A. Standard: größte zuerst bei value, A bis Z bei label."
 ],
 "Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other.": [
  "Garde les N premières lignes après le tri : le top 10, par exemple. Le reste est écarté, ou regroupé en une ligne avec other.",
  "Behält die ersten N Zeilen nach dem Sortieren, etwa die Top 10. Der Rest entfällt oder wird mit other zu einer Zeile zusammengefasst."
 ],
 "With limit, folds the rows past it into one last row, its numbers summed: true names it \"Other\", text names it as you like (\"All other clients\"). So the parts still add up to the whole.": [
  "Avec limit, regroupe les lignes au-delà en une dernière ligne qui en fait la somme : true la nomme « Autres », un texte la nomme à votre guise (\"All other clients\"). Ainsi les parties font toujours le tout.",
  "Fasst mit limit die übrigen Zeilen zu einer letzten Zeile mit ihrer Summe zusammen: true nennt sie „Sonstige“, ein Text nach Wunsch (\"All other clients\"). So ergeben die Teile weiter das Ganze."
 ],
 "Numeric field along the axis.": [
  "Champ numérique le long de l'axe.",
  "Numerisches Feld entlang der Achse."
 ],
 "Field giving each group its own labelled row.": [
  "Champ donnant à chaque groupe sa propre ligne nommée.",
  "Feld, das jeder Gruppe eine eigene beschriftete Zeile gibt."
 ],
 "Field naming each dot in its tooltip.": [
  "Champ nommant chaque point dans son info-bulle.",
  "Feld, das jeden Punkt in seinem Tooltip benennt."
 ],
 "Field naming each card.": [
  "Champ nommant chaque carte.",
  "Feld, das jede Karte benennt."
 ],
 "Field with each item's stage: one column per distinct value, in the order of stages or of first appearance.": [
  "Champ avec l'étape de chaque élément : une colonne par valeur distincte, dans l'ordre de stages ou d'apparition.",
  "Feld mit der Phase jedes Eintrags: eine Spalte je Wert, in der Reihenfolge von stages oder des ersten Auftretens."
 ],
 "The columns in order, such as [\"Proposal\", \"Adopted\", \"In force\"]. A listed stage with no item still shows, empty; an item whose stage is not listed goes to a last column named Other.": [
  "Les colonnes dans l'ordre, comme [\"Proposal\", \"Adopted\", \"In force\"]. Une étape listée sans élément s'affiche vide ; un élément dont l'étape n'est pas listée va dans une dernière colonne nommée Autres.",
  "Die Spalten in Reihenfolge, etwa [\"Proposal\", \"Adopted\", \"In force\"]. Eine aufgeführte Phase ohne Eintrag erscheint leer; ein Eintrag mit nicht aufgeführter Phase landet in einer letzten Spalte namens Sonstige."
 ],
 "Field that colors a dot on each card by group, with a key. Up to 8 groups stay distinct.": [
  "Champ qui colore un point sur chaque carte selon son groupe, avec une légende. Jusqu'à 8 groupes restent distincts.",
  "Feld, das einen Punkt auf jeder Karte nach Gruppe färbt, mit Legende. Bis zu 8 Gruppen bleiben unterscheidbar."
 ],
 "Field written on each card, such as impact or amount, in the field's format.": [
  "Champ écrit sur chaque carte, comme l'impact ou le montant, dans son format.",
  "Feld, das auf jede Karte geschrieben wird, etwa Wirkung oder Betrag, in seinem Format."
 ],
 "Field for a smaller line under the card's name, such as the issuer or the owner.": [
  "Champ pour une ligne plus petite sous le nom de la carte, comme l'émetteur ou le responsable.",
  "Feld für eine kleinere Zeile unter dem Kartennamen, etwa Emittent oder Verantwortliche."
 ],
 "How many cards a column shows before folding the rest into a + n more line. The line opens the rest in place.": [
  "Combien de cartes une colonne montre avant de replier le reste en une ligne « + n autres ». La ligne ouvre le reste sur place.",
  "Wie viele Karten eine Spalte zeigt, bevor der Rest in eine Zeile „+ n weitere“ eingeklappt wird. Die Zeile öffnet den Rest an Ort und Stelle."
 ],
 "Numeric field whose spread is drawn.": [
  "Champ numérique dont la dispersion est tracée.",
  "Numerisches Feld, dessen Streuung gezeichnet wird."
 ],
 "Field giving each group its own box. Without it, all rows make one box.": [
  "Champ donnant à chaque groupe sa propre boîte. Sans lui, toutes les lignes forment une seule boîte.",
  "Feld, das jeder Gruppe einen eigenen Kasten gibt. Ohne es bilden alle Zeilen einen Kasten."
 ],
 "Field naming each row.": [
  "Champ nommant chaque ligne.",
  "Feld, das jede Zeile benennt."
 ],
 "Field with the actual amount.": [
  "Champ avec le montant réel.",
  "Feld mit dem Istbetrag."
 ],
 "Field with the target amount.": [
  "Champ avec le montant cible.",
  "Feld mit dem Zielbetrag."
 ],
 "Where the three bands end, as multiples of the target: poor up to the first, fair up to the second, good up to the third.": [
  "Où finissent les trois bandes, en multiples de la cible : faible jusqu'à la première, moyen jusqu'à la deuxième, bon jusqu'à la troisième.",
  "Wo die drei Bänder enden, als Vielfache des Ziels: schwach bis zum ersten, mittel bis zum zweiten, gut bis zum dritten."
 ],
 "Field with each row's unit (%, €, $), for rows that measure different things. A name ending in \"(%)\" does the same.": [
  "Champ avec l'unité de chaque ligne (%, €, $), pour des lignes qui mesurent des choses différentes. Un nom finissant par \"(%)\" fait de même.",
  "Feld mit der Einheit jeder Zeile (%, €, $), für Zeilen, die Verschiedenes messen. Ein Name, der auf \"(%)\" endet, wirkt genauso."
 ],
 "Whether more is better (\"up\", as for revenue) or less is better (\"down\", as for wait times and costs). It decides which side of the target reads as met.": [
  "Si plus est mieux (\"up\", comme pour le chiffre d'affaires) ou si moins est mieux (\"down\", comme pour les délais et les coûts). Décide quel côté de la cible se lit comme atteint.",
  "Ob mehr besser ist (\"up\", wie beim Umsatz) oder weniger (\"down\", wie bei Wartezeiten und Kosten). Entscheidet, welche Seite des Ziels als erreicht gilt."
 ],
 "Field with the period, such as a month. Periods keep the order of the rows.": [
  "Champ avec la période, comme un mois. Les périodes gardent l'ordre des lignes.",
  "Feld mit der Periode, etwa einem Monat. Die Perioden behalten die Reihenfolge der Zeilen."
 ],
 "Field naming the series being ranked, such as a product.": [
  "Champ nommant la série classée, comme un produit.",
  "Feld mit der Reihe, die gerankt wird, etwa ein Produkt."
 ],
 "Field the ranking is by; the highest value ranks 1.": [
  "Champ qui fait le classement ; la valeur la plus haute est classée 1.",
  "Feld, nach dem gerankt wird; der höchste Wert ist Rang 1."
 ],
 "Series name or names to keep in color; every other series turns grey. Example: \"Platform\".": [
  "Nom ou noms de séries à garder en couleur ; les autres passent en gris. Exemple : \"Platform\".",
  "Reihenname oder -namen, die farbig bleiben; alle anderen werden grau. Beispiel: \"Platform\"."
 ],
 "Field with each day's date, as YYYY-MM-DD or a timestamp.": [
  "Champ avec la date de chaque jour, en AAAA-MM-JJ ou en horodatage.",
  "Feld mit dem Datum jedes Tages, als JJJJ-MM-TT oder Zeitstempel."
 ],
 "Field that shades each day.": [
  "Champ qui teinte chaque jour.",
  "Feld, das jeden Tag einfärbt."
 ],
 "Field with the period, such as a trading day.": [
  "Champ avec la période, comme une séance de bourse.",
  "Feld mit der Periode, etwa einem Handelstag."
 ],
 "Field with the opening price.": [
  "Champ avec le cours d'ouverture.",
  "Feld mit dem Eröffnungskurs."
 ],
 "Field with the highest price.": [
  "Champ avec le cours le plus haut.",
  "Feld mit dem Tageshoch."
 ],
 "Field with the lowest price.": [
  "Champ avec le cours le plus bas.",
  "Feld mit dem Tagestief."
 ],
 "Field with the closing price.": [
  "Champ avec le cours de clôture.",
  "Feld mit dem Schlusskurs."
 ],
 "Periods in a moving average of the close, drawn as a line; for example 5 for a trading week.": [
  "Nombre de périodes d'une moyenne mobile de la clôture, tracée en ligne ; par exemple 5 pour une semaine de bourse.",
  "Perioden eines gleitenden Durchschnitts des Schlusskurses, als Linie gezeichnet; etwa 5 für eine Handelswoche."
 ],
 "Field naming where each flow comes from.": [
  "Champ nommant l'origine de chaque flux.",
  "Feld, das den Ursprung jedes Flusses nennt."
 ],
 "Field naming where each flow goes.": [
  "Champ nommant la destination de chaque flux.",
  "Feld, das das Ziel jedes Flusses nennt."
 ],
 "Field with each flow's size.": [
  "Champ avec la taille de chaque flux.",
  "Feld mit der Größe jedes Flusses."
 ],
 "The map's geometry: a built-in basemap by name (europe, us-states: tile grids keyed by country or state code), an inline GeoJSON FeatureCollection whose features carry an id, or the address of a GeoJSON file to fetch.": [
  "La géométrie de la carte : un fond intégré par son nom (europe, us-states : des grilles de tuiles par code de pays ou d'État), une FeatureCollection GeoJSON en ligne dont les entités portent un id, ou l'adresse d'un fichier GeoJSON à charger.",
  "Die Geometrie der Karte: eine eingebaute Grundkarte nach Name (europe, us-states: Kachelraster nach Länder- oder Staatenkürzel), eine eingebettete GeoJSON-FeatureCollection mit einer id je Feature oder die Adresse einer zu ladenden GeoJSON-Datei."
 ],
 "Field with each row's region code: a country or state code on a built-in basemap (FR, TX), or the feature id in your GeoJSON.": [
  "Champ avec le code de région de chaque ligne : un code de pays ou d'État sur un fond intégré (FR, TX), ou l'id de l'entité dans votre GeoJSON.",
  "Feld mit dem Regionscode jeder Zeile: ein Länder- oder Staatenkürzel auf einer eingebauten Grundkarte (FR, TX) oder die Feature-id in Ihrem GeoJSON."
 ],
 "Field that shades each region on the sequential scale. Rows with no number stay grey. Give value or category, not both.": [
  "Champ qui teinte chaque région sur l'échelle séquentielle. Les lignes sans nombre restent grises. Donnez value ou category, pas les deux.",
  "Feld, das jede Region auf der sequenziellen Skala einfärbt. Zeilen ohne Zahl bleiben grau. Geben Sie value oder category an, nicht beides."
 ],
 "Field that colors each region by its category instead, one series color per value with a key: a transposition status, a supervisor, a regime. Up to 8 categories stay distinct.": [
  "Champ qui colore plutôt chaque région par sa catégorie, une couleur par valeur avec une légende : un statut de transposition, un superviseur, un régime. Jusqu'à 8 catégories restent distinctes.",
  "Feld, das jede Region stattdessen nach ihrer Kategorie färbt, eine Farbe je Wert mit Legende: ein Umsetzungsstand, eine Aufsicht, ein Regime. Bis zu 8 Kategorien bleiben unterscheidbar."
 ],
 "The feature property that holds each region's id in your own GeoJSON (feature.id is read too). Built-in basemaps use their codes.": [
  "La propriété d'entité qui porte l'id de chaque région dans votre GeoJSON (feature.id est lu aussi). Les fonds intégrés utilisent leurs codes.",
  "Die Feature-Eigenschaft, die die id jeder Region in Ihrem eigenen GeoJSON trägt (feature.id wird ebenfalls gelesen). Eingebaute Grundkarten nutzen ihre Kürzel."
 ],
 "Write each region's code inside it, where it fits.": [
  "Écrit le code de chaque région à l'intérieur, là où il tient.",
  "Schreibt das Kürzel jeder Region hinein, wo es passt."
 ],
 "Value of the weakest tint. Defaults to the lowest value.": [
  "Valeur de la teinte la plus pâle. Par défaut, la plus basse valeur.",
  "Wert der hellsten Tönung. Standard: der niedrigste Wert."
 ],
 "Value of the strongest tint. Defaults to the highest value.": [
  "Valeur de la teinte la plus forte. Par défaut, la plus haute valeur.",
  "Wert der kräftigsten Tönung. Standard: der höchste Wert."
 ],
 "Field with the same measure in the previous period, such as last year's revenue. Each region's tooltip then gives the change, and show \"change\" shades by it.": [
  "Champ avec la même mesure sur la période précédente, comme le chiffre d'affaires de l'an dernier. L'info-bulle de chaque région donne alors l'évolution, et show \"change\" teinte selon elle.",
  "Feld mit derselben Kennzahl in der Vorperiode, etwa dem Vorjahresumsatz. Der Tooltip jeder Region nennt dann die Veränderung, und show \"change\" färbt danach."
 ],
 "\"change\" shades each region by its change since previous on a diverging scale: up one way, down the other, no change in the middle. Needs previous.": [
  "\"change\" teinte chaque région selon son évolution depuis previous, sur une échelle divergente : hausse d'un côté, baisse de l'autre, stable au milieu. Demande previous.",
  "\"change\" färbt jede Region nach ihrer Veränderung seit previous auf einer divergierenden Skala: Anstieg in die eine, Rückgang in die andere Richtung, unverändert in der Mitte. Braucht previous."
 ],
 "How a change is told: as a percent of the previous value, or as the difference in the value's own unit.": [
  "Comment dire une évolution : en pourcentage de la valeur précédente, ou en écart dans l'unité de la valeur.",
  "Wie eine Veränderung ausgedrückt wird: in Prozent des Vorwerts oder als Differenz in der Einheit des Werts."
 ],
 "Field naming each slice.": [
  "Champ nommant chaque part.",
  "Feld, das jedes Segment benennt."
 ],
 "Field with each slice's amount. Zero, negative and missing values are left out.": [
  "Champ avec le montant de chaque part. Les valeurs nulles, négatives ou manquantes sont écartées.",
  "Feld mit dem Betrag jedes Segments. Null-, negative und fehlende Werte entfallen."
 ],
 "Text under the total in the middle. Defaults to the value field's label, or to \"seats\" when the value field is seats.": [
  "Texte sous le total au centre. Par défaut, le libellé du champ de valeur, ou « sièges » quand ce champ est seats.",
  "Text unter der Summe in der Mitte. Standard: die Bezeichnung des Wertfelds, oder „Sitze“, wenn das Wertfeld seats heißt."
 ],
 "\"half\" draws a semicircle open at the bottom with the slices from left to right in the order given: an election donut, seats by party in the order they sit.": [
  "\"half\" trace un demi-cercle ouvert vers le bas, les parts de gauche à droite dans l'ordre donné : un hémicycle électoral, les sièges par parti dans l'ordre où ils siègent.",
  "\"half\" zeichnet einen nach unten offenen Halbkreis mit den Segmenten von links nach rechts in der angegebenen Reihenfolge: ein Wahl-Donut, Sitze nach Partei in ihrer Sitzordnung."
 ],
 "On a half ring, a thin tick at the halfway point labelled Majority and the seats it takes (more than half of the total); the slice that crosses it says so in its tooltip.": [
  "Sur un demi-anneau, un trait fin à mi-course nommé Majorité avec les sièges qu'elle demande (plus de la moitié du total) ; la part qui la franchit le dit dans son info-bulle.",
  "Auf einem Halbring eine feine Marke auf halbem Weg namens Mehrheit mit den nötigen Sitzen (mehr als die Hälfte der Summe); das Segment, das sie überschreitet, sagt es in seinem Tooltip."
 ],
 "Field or fields placed as dots on the axis. Each field is one series with its own color; one field writes its value beside the dot.": [
  "Champ ou champs placés en points sur l'axe. Chaque champ est une série à sa couleur ; un seul champ écrit sa valeur près du point.",
  "Feld oder Felder, die als Punkte auf der Achse stehen. Jedes Feld ist eine Reihe mit eigener Farbe; ein einzelnes Feld schreibt seinen Wert neben den Punkt."
 ],
 "Field for the shared axis, usually a date or period.": [
  "Champ de l'axe partagé, en général une date ou une période.",
  "Feld für die gemeinsame Achse, meist ein Datum oder eine Periode."
 ],
 "Measure on the top panel.": [
  "Mesure du panneau du haut.",
  "Kennzahl im oberen Feld."
 ],
 "Measure on the bottom panel, in its own unit.": [
  "Mesure du panneau du bas, dans sa propre unité.",
  "Kennzahl im unteren Feld, in ihrer eigenen Einheit."
 ],
 "How each panel draws its measure, top then bottom: \"bar\" for amounts (from zero) or \"line\" for rates and levels. Example: [\"bar\", \"line\"].": [
  "Comment chaque panneau trace sa mesure, haut puis bas : \"bar\" pour les montants (depuis zéro) ou \"line\" pour les taux et niveaux. Exemple : [\"bar\", \"line\"].",
  "Wie jedes Feld seine Kennzahl zeichnet, oben dann unten: \"bar\" für Beträge (ab null) oder \"line\" für Raten und Niveaus. Beispiel: [\"bar\", \"line\"]."
 ],
 "Field with the before value.": [
  "Champ avec la valeur avant.",
  "Feld mit dem Wert vorher."
 ],
 "Field with the after value.": [
  "Champ avec la valeur après.",
  "Feld mit dem Wert nachher."
 ],
 "\"range\" joins the two dots with a plain line, the gap between them. \"arrow\" points from the from value to the to value, so direction reads at a glance; between two periods a rise takes the up color and a fall the down color, keyed Rose and Fell.": [
  "\"range\" relie les deux points d'un trait simple, l'écart entre eux. \"arrow\" pointe de la valeur from vers la valeur to, pour lire le sens d'un coup d'œil ; entre deux périodes, une hausse prend la couleur de hausse et une baisse celle de baisse, légendées En hausse et En baisse.",
  "\"range\" verbindet die beiden Punkte mit einer schlichten Linie, dem Abstand dazwischen. \"arrow\" zeigt vom from- zum to-Wert, sodass die Richtung sofort lesbar ist; zwischen zwei Perioden nimmt ein Anstieg die Steigfarbe und ein Rückgang die Fallfarbe, ausgewiesen als Gestiegen und Gefallen."
 ],
 "Field naming each stage.": [
  "Champ nommant chaque étape.",
  "Feld, das jede Stufe benennt."
 ],
 "Field with how many reached each stage.": [
  "Champ avec combien ont atteint chaque étape.",
  "Feld mit der Anzahl, die jede Stufe erreicht hat."
 ],
 "Field holding the number.": [
  "Champ portant le nombre.",
  "Feld mit der Zahl."
 ],
 "Field holding the target, marked with a tick.": [
  "Champ portant la cible, marquée d'un trait.",
  "Feld mit dem Ziel, markiert durch einen Strich."
 ],
 "Start of the scale.": [
  "Début de l'échelle.",
  "Anfang der Skala."
 ],
 "End of the scale. Defaults to a round number above the value and the target.": [
  "Fin de l'échelle. Par défaut, un nombre rond au-dessus de la valeur et de la cible.",
  "Ende der Skala. Standard: eine runde Zahl über Wert und Ziel."
 ],
 "Caption under the number. Defaults to the value field's label.": [
  "Légende sous le nombre. Par défaut, le libellé du champ de valeur.",
  "Beschriftung unter der Zahl. Standard: die Bezeichnung des Wertfelds."
 ],
 "Field naming each bar.": [
  "Champ nommant chaque barre.",
  "Feld, das jeden Balken benennt."
 ],
 "Field or fields with each bar's amount. Bars start at zero. Several fields draw one bar per field in each row (grouped), stacked into one bar with stacked, or in separate columns with split.": [
  "Champ ou champs avec le montant de chaque barre. Les barres partent de zéro. Plusieurs champs tracent une barre par champ et par ligne (groupées), empilées en une seule avec stacked, ou en colonnes séparées avec split.",
  "Feld oder Felder mit dem Betrag jedes Balkens. Balken beginnen bei null. Mehrere Felder zeichnen je Zeile einen Balken pro Feld (gruppiert), mit stacked gestapelt zu einem, oder mit split in getrennten Spalten."
 ],
 "With several value fields: true stacks them into one bar per row, its total at the end (part-to-whole); \"percent\" stacks them as shares of 100%.": [
  "Avec plusieurs champs de valeur : true les empile en une barre par ligne, son total au bout (partie du tout) ; \"percent\" les empile en parts de 100 %.",
  "Bei mehreren Wertfeldern: true stapelt sie zu einem Balken je Zeile, die Summe am Ende (Teil eines Ganzen); \"percent\" stapelt sie als Anteile an 100 %."
 ],
 "With several value fields: one small column of bars per field, side by side, the label written once on the left and each column headed by its field. Each column has its own scale, so measures in different units sit together.": [
  "Avec plusieurs champs de valeur : une petite colonne de barres par champ, côte à côte, le libellé écrit une fois à gauche et chaque colonne titrée par son champ. Chaque colonne a sa propre échelle, pour réunir des mesures d'unités différentes.",
  "Bei mehreren Wertfeldern: eine kleine Balkenspalte je Feld nebeneinander, die Bezeichnung einmal links und jede Spalte mit ihrem Feld überschrieben. Jede Spalte hat ihre eigene Skala, sodass Kennzahlen in verschiedenen Einheiten zusammenstehen."
 ],
 "Split columns share one scale, so a bar compares across columns too. Only for fields in the same unit.": [
  "Les colonnes séparées partagent une échelle, pour comparer aussi d'une colonne à l'autre. Seulement pour des champs de même unité.",
  "Getrennte Spalten teilen eine Skala, sodass sich Balken auch über Spalten hinweg vergleichen lassen. Nur für Felder in derselben Einheit."
 ],
 "Field for the columns.": [
  "Champ des colonnes.",
  "Feld für die Spalten."
 ],
 "Field for the rows.": [
  "Champ des lignes.",
  "Feld für die Zeilen."
 ],
 "Field that shades each cell.": [
  "Champ qui teinte chaque cellule.",
  "Feld, das jede Zelle einfärbt."
 ],
 "Numeric field to bin.": [
  "Champ numérique à regrouper en classes.",
  "Numerisches Feld, das in Klassen eingeteilt wird."
 ],
 "About how many bins to use; edges snap to round numbers, so the exact count can differ. Defaults to Sturges' rule (1 + log2 of the row count).": [
  "Nombre approximatif de classes ; les bornes s'arrondissent, le nombre exact peut donc varier. Par défaut, la règle de Sturges (1 + log2 du nombre de lignes).",
  "Ungefähr wie viele Klassen; die Grenzen runden auf glatte Zahlen, die genaue Anzahl kann also abweichen. Standard: die Sturges-Regel (1 + log2 der Zeilenzahl)."
 ],
 "Draw a dashed line at the median.": [
  "Trace une ligne en pointillé à la médiane.",
  "Zeichnet eine gestrichelte Linie beim Median."
 ],
 "Name for the counts in the tooltip, for example \"Deals\".": [
  "Nom des effectifs dans l'info-bulle, par exemple \"Deals\".",
  "Name für die Anzahlen im Tooltip, etwa \"Deals\"."
 ],
 "Field with when the event happened.": [
  "Champ avec le moment de l'événement.",
  "Feld mit dem Zeitpunkt des Ereignisses."
 ],
 "Field with the event in a few words.": [
  "Champ avec l'événement en quelques mots.",
  "Feld mit dem Ereignis in wenigen Wörtern."
 ],
 "Field with the kind of event (Meeting, Call, Trade); each kind takes a color and a letter, keyed.": [
  "Champ avec le type d'événement (Rendez-vous, Appel, Opération) ; chaque type prend une couleur et une lettre, en légende.",
  "Feld mit der Art des Ereignisses (Termin, Anruf, Transaktion); jede Art erhält eine Farbe und einen Buchstaben, mit Legende."
 ],
 "Field with a second, smaller line under the title.": [
  "Champ avec une deuxième ligne, plus petite, sous le titre.",
  "Feld mit einer zweiten, kleineren Zeile unter dem Titel."
 ],
 "Field with an amount to write at the right of the event, where there is one.": [
  "Champ avec un montant à écrire à droite de l'événement, quand il y en a un.",
  "Feld mit einem Betrag rechts neben dem Ereignis, wo es einen gibt."
 ],
 "Field that splits the events into one list per value (one per client), each under its own heading.": [
  "Champ qui répartit les événements en une liste par valeur (une par client), chacune sous son titre.",
  "Feld, das die Ereignisse in eine Liste je Wert teilt (eine je Kunde), jede unter eigener Überschrift."
 ],
 "Events shown per list before a line says how many more there are.": [
  "Événements montrés par liste avant une ligne disant combien il en reste.",
  "Ereignisse je Liste, bevor eine Zeile sagt, wie viele noch folgen."
 ],
 "\"desc\" puts the newest event first (the default), \"asc\" tells the story from the start.": [
  "\"desc\" met l'événement le plus récent en premier (par défaut), \"asc\" raconte l'histoire depuis le début.",
  "\"desc\" setzt das neueste Ereignis zuerst (Standard), \"asc\" erzählt die Geschichte von Anfang an."
 ],
 "Field for the ordered axis, usually a date.": [
  "Champ de l'axe ordonné, en général une date.",
  "Feld für die geordnete Achse, meist ein Datum."
 ],
 "Field or fields, one row each, such as a region's revenue against plan.": [
  "Champ ou champs, une ligne chacun, comme le chiffre d'affaires d'une région face au plan.",
  "Feld oder Felder, je eine Zeile, etwa der Umsatz einer Region gegen Plan."
 ],
 "How many shades each side folds into, 1 to 5. More bands pack more range into a row but read less exactly.": [
  "Combien de nuances chaque côté replie, de 1 à 5. Plus de bandes logent plus d'amplitude dans une ligne mais se lisent moins précisément.",
  "Wie viele Abstufungen jede Seite faltet, 1 bis 5. Mehr Bänder packen mehr Spanne in eine Zeile, lesen sich aber weniger genau."
 ],
 "The value rows are measured from, such as 0 for a difference or the plan for a raw amount.": [
  "La valeur à partir de laquelle les lignes se mesurent, comme 0 pour un écart ou le plan pour un montant brut.",
  "Der Wert, von dem aus die Zeilen gemessen werden, etwa 0 für eine Differenz oder der Plan für einen Rohbetrag."
 ],
 "What the baseline stands for, in a word or two, such as \"plan\" or \"target\". The key then reads \"Above plan, rising\", pointing at a day says \"€6.5K above plan\", and the guide counts the days above it.": [
  "Ce que la base représente, en un ou deux mots, comme \"plan\" ou \"target\". La légende dit alors « Au-dessus du plan, en hausse », pointer un jour dit « 6,5 k€ au-dessus du plan », et le guide compte les jours au-dessus.",
  "Wofür die Grundlinie steht, in ein, zwei Wörtern, etwa \"plan\" oder \"target\". Die Legende lautet dann „Über Plan, steigend“, ein Tag zeigt „6,5 Tsd. € über Plan“, und der Leitfaden zählt die Tage darüber."
 ],
 "Fields from the top level down, one column each, for example [\"region\", \"product\", \"plan\"]. Up to 4.": [
  "Champs du niveau le plus haut au plus bas, une colonne chacun, par exemple [\"region\", \"product\", \"plan\"]. Jusqu'à 4.",
  "Felder von der obersten Ebene abwärts, je eine Spalte, etwa [\"region\", \"product\", \"plan\"]. Bis zu 4."
 ],
 "Field sizing the cells. Zero and negative values are left out.": [
  "Champ qui dimensionne les cellules. Les valeurs nulles et négatives sont écartées.",
  "Feld, das die Zellen bemisst. Null- und negative Werte entfallen."
 ],
 "Field holding the headline number.": [
  "Champ portant le chiffre clé.",
  "Feld mit der Kernzahl."
 ],
 "Field holding the value to compare against, for example last period.": [
  "Champ portant la valeur de comparaison, par exemple la période précédente.",
  "Feld mit dem Vergleichswert, etwa der Vorperiode."
 ],
 "Names the comparison, for example \"vs last month\".": [
  "Nomme la comparaison, par exemple \"vs last month\".",
  "Benennt den Vergleich, etwa \"vs last month\"."
 ],
 "Whether an increase is good news (revenue) or bad news (costs, churn).": [
  "Si une hausse est une bonne nouvelle (le chiffre d'affaires) ou une mauvaise (les coûts, l'attrition).",
  "Ob ein Anstieg gut ist (Umsatz) oder schlecht (Kosten, Abwanderung)."
 ],
 "Text above the number. Defaults to the value field's label.": [
  "Texte au-dessus du nombre. Par défaut, le libellé du champ de valeur.",
  "Text über der Zahl. Standard: die Bezeichnung des Wertfelds."
 ],
 "Read the rows as a time series: the headline is the last row, the change is against the row before (unless compare is set), and a sparkline shows every row.": [
  "Lit les lignes comme une série temporelle : le chiffre clé est la dernière ligne, l'évolution se mesure à la ligne d'avant (sauf si compare est donné), et une sparkline montre toutes les lignes.",
  "Liest die Zeilen als Zeitreihe: die Kernzahl ist die letzte Zeile, die Veränderung bezieht sich auf die Zeile davor (sofern compare nicht gesetzt ist), und eine Sparkline zeigt alle Zeilen."
 ],
 "With series, the field naming each period, used to label the comparison (\"vs Aug 2026\").": [
  "Avec series, le champ nommant chaque période, pour libeller la comparaison (« vs août 2026 »).",
  "Mit series das Feld, das jede Periode benennt, für die Vergleichsbeschriftung („ggü. Aug. 2026“)."
 ],
 "A line icon on a soft tile beside the number.": [
  "Une icône au trait sur une tuile douce à côté du nombre.",
  "Ein Liniensymbol auf einer sanften Kachel neben der Zahl."
 ],
 "Field holding the target. A line under the number says where the latest stands: a check and Target met, or how far it has to go (with goodWhen down, how far above the target it is).": [
  "Champ portant la cible. Une ligne sous le nombre dit où en est le dernier : une coche et Objectif atteint, ou ce qu'il reste à faire (avec goodWhen down, de combien il dépasse la cible).",
  "Feld mit dem Ziel. Eine Zeile unter der Zahl sagt, wo der letzte Wert steht: ein Haken und Ziel erreicht, oder wie viel fehlt (mit goodWhen down, wie weit er über dem Ziel liegt)."
 ],
 "Thresholds that give the number a Red, Amber or Green status, shown as a small pill with its shape and words (On track, At risk, Off track) beside it: { \"green\": 40, \"amber\": 20 }, or { \"green\": 2, \"amber\": 5, \"goodWhen\": \"down\" } when less is better.": [
  "Seuils qui donnent au nombre un statut Rouge, Orange ou Vert, montré en petite pastille avec sa forme et ses mots (Conforme, À surveiller, Hors trajectoire) : { \"green\": 40, \"amber\": 20 }, ou { \"green\": 2, \"amber\": 5, \"goodWhen\": \"down\" } quand moins est mieux.",
  "Schwellen, die der Zahl einen Status Rot, Gelb oder Grün geben, als kleine Pille mit Form und Worten (Im Plan, Gefährdet, Außer Plan): { \"green\": 40, \"amber\": 20 }, oder { \"green\": 2, \"amber\": 5, \"goodWhen\": \"down\" }, wenn weniger besser ist."
 ],
 "Tiles, each { value, label?, compare?, compareLabel?, goodWhen?, target?, rag?, delta? }. compare is a field or \"previous\" (the row before); target is a field, and the tile then says where it stands (Target met, or how far to go); rag is { green, amber, goodWhen? } and adds a Red, Amber or Green status pill; delta is \"points\" or \"relative\": a percent field changes in percentage points (48% to 55% reads +7 pts), any other relative to before (+13.8%). Example: [{ \"value\": \"revenue\", \"compare\": \"previous\", \"target\": \"target\" }].": [
  "Des tuiles, chacune { value, label?, compare?, compareLabel?, goodWhen?, target?, rag?, delta? }. compare est un champ ou \"previous\" (la ligne d'avant) ; target est un champ, et la tuile dit alors où elle en est (Objectif atteint, ou ce qu'il reste) ; rag vaut { green, amber, goodWhen? } et ajoute une pastille de statut ; delta vaut \"points\" ou \"relative\" : un champ en pourcentage évolue en points (de 48 % à 55 % se lit +7 pts), tout autre en relatif (+13,8 %). Exemple : [{ \"value\": \"revenue\", \"compare\": \"previous\", \"target\": \"target\" }].",
  "Kacheln, jeweils { value, label?, compare?, compareLabel?, goodWhen?, target?, rag?, delta? }. compare ist ein Feld oder \"previous\" (die Zeile davor); target ist ein Feld, und die Kachel sagt dann, wo sie steht (Ziel erreicht oder wie viel fehlt); rag ist { green, amber, goodWhen? } und fügt eine Statuspille hinzu; delta ist \"points\" oder \"relative\": ein Prozentfeld ändert sich in Prozentpunkten (48 % auf 55 % liest sich +7 Pp.), jedes andere relativ (+13,8 %). Beispiel: [{ \"value\": \"revenue\", \"compare\": \"previous\", \"target\": \"target\" }]."
 ],
 "Read the rows as a time series: values from the last row, compared with the row before, plus a sparkline per tile.": [
  "Lit les lignes comme une série temporelle : valeurs de la dernière ligne, comparées à celle d'avant, plus une sparkline par tuile.",
  "Liest die Zeilen als Zeitreihe: Werte aus der letzten Zeile, verglichen mit der davor, plus eine Sparkline je Kachel."
 ],
 "Date fields in lifecycle order, such as proposed, adopted, inForce, applies. A later date may be missing: the row then runs on from its last known stage.": [
  "Champs de date dans l'ordre du cycle de vie, comme proposed, adopted, inForce, applies. Une date plus tardive peut manquer : la ligne se prolonge alors depuis sa dernière étape connue.",
  "Datumsfelder in der Reihenfolge des Lebenszyklus, etwa proposed, adopted, inForce, applies. Ein späteres Datum darf fehlen: die Zeile läuft dann ab ihrer letzten bekannten Phase weiter."
 ],
 "Field that gathers rows under a heading, such as topic.": [
  "Champ qui regroupe les lignes sous un titre, comme le thème.",
  "Feld, das Zeilen unter einer Überschrift sammelt, etwa dem Thema."
 ],
 "true for a line at today's date, or a YYYY-MM-DD date for the line. Shown when it falls inside the span.": [
  "true pour une ligne à la date du jour, ou une date AAAA-MM-JJ pour la ligne. Montrée quand elle tombe dans la période.",
  "true für eine Linie am heutigen Datum oder ein Datum JJJJ-MM-TT für die Linie. Erscheint, wenn es in den Zeitraum fällt."
 ],
 "Field written as a small pill at the row's end, such as In force or Consultation.": [
  "Champ écrit en petite pastille au bout de la ligne, comme En vigueur ou Consultation.",
  "Feld, das als kleine Pille ans Zeilenende geschrieben wird, etwa In Kraft oder Konsultation."
 ],
 "Field from 1 to 5 that sets each row's thickness: the higher the impact, the thicker the row.": [
  "Champ de 1 à 5 qui fixe l'épaisseur de chaque ligne : plus l'impact est fort, plus la ligne est épaisse.",
  "Feld von 1 bis 5, das die Dicke jeder Zeile bestimmt: je höher die Wirkung, desto dicker die Zeile."
 ],
 "Field with each question.": [
  "Champ avec chaque question.",
  "Feld mit jeder Frage."
 ],
 "Count fields for the responses, in order from the negative pole to the positive, for example [\"strongly_disagree\", \"disagree\", \"neutral\", \"agree\", \"strongly_agree\"]. An odd count puts the middle one at the center.": [
  "Champs de décompte des réponses, du pôle négatif au positif, par exemple [\"strongly_disagree\", \"disagree\", \"neutral\", \"agree\", \"strongly_agree\"]. Un nombre impair place celui du milieu au centre.",
  "Zählfelder der Antworten, vom negativen zum positiven Pol, etwa [\"strongly_disagree\", \"disagree\", \"neutral\", \"agree\", \"strongly_agree\"]. Eine ungerade Anzahl setzt das mittlere in die Mitte."
 ],
 "Field or fields for line values. Each field is one series.": [
  "Champ ou champs des valeurs de la courbe. Chaque champ est une série.",
  "Feld oder Felder für die Linienwerte. Jedes Feld ist eine Reihe."
 ],
 "Field that is true on forecast rows. From the last actual on, lines draw dashed in a softly shaded zone labelled Forecast, and the tooltip marks those rows.": [
  "Champ vrai sur les lignes de prévision. À partir du dernier réel, les lignes passent en pointillé dans une zone légèrement grisée nommée Prévision, et l'info-bulle les signale.",
  "Feld, das bei Prognosezeilen wahr ist. Ab dem letzten Istwert werden Linien gestrichelt in einer leicht schattierten Zone namens Prognose gezeichnet, und der Tooltip markiert diese Zeilen."
 ],
 "A small symbol at every data point, in the line's color, so each reading is a mark of its own. Left out where points would sit closer than 8px.": [
  "Un petit symbole à chaque point, dans la couleur de la ligne, pour que chaque relevé soit une marque à part. Omis là où les points seraient à moins de 8 px.",
  "Ein kleines Symbol an jedem Datenpunkt in der Farbe der Linie, sodass jeder Messwert eine eigene Marke ist. Entfällt, wo Punkte enger als 8 px stünden."
 ],
 "Marks the first series' highest and lowest points with a dot and writes their values beside them, clear of the end label.": [
  "Marque les points le plus haut et le plus bas de la première série d'un point et écrit leur valeur à côté, sans gêner le libellé de fin.",
  "Markiert den höchsten und den niedrigsten Punkt der ersten Reihe mit einem Punkt und schreibt ihre Werte daneben, ohne die Endbeschriftung zu stören."
 ],
 "\"log\" draws the value axis logarithmically, ticks at powers of ten (with 2 and 5 steps when it spans little), so steady growth reads as a straight line and small and large series share one chart. Positive values only: others are left out.": [
  "\"log\" trace l'axe des valeurs en logarithmique, graduations aux puissances de dix (avec des pas de 2 et 5 sur une faible amplitude), pour qu'une croissance régulière se lise en droite et que petites et grandes séries tiennent ensemble. Valeurs positives seulement : les autres sont écartées.",
  "\"log\" zeichnet die Werteachse logarithmisch, Teilstriche bei Zehnerpotenzen (mit Schritten von 2 und 5 bei kleiner Spanne), sodass stetiges Wachstum als Gerade erscheint und kleine und große Reihen in ein Diagramm passen. Nur positive Werte: andere entfallen."
 ],
 "Field for the main text of each item.": [
  "Champ du texte principal de chaque élément.",
  "Feld für den Haupttext jedes Eintrags."
 ],
 "Field for the smaller line under the label.": [
  "Champ de la ligne plus petite sous le libellé.",
  "Feld für die kleinere Zeile unter der Bezeichnung."
 ],
 "Field for the number on the right.": [
  "Champ du nombre à droite.",
  "Feld für die Zahl rechts."
 ],
 "Field with the region code that places each marker: a country or state code on a built-in basemap, or the feature id in your GeoJSON. Use lat and lon instead for coordinates.": [
  "Champ avec le code de région qui place chaque marqueur : un code de pays ou d'État sur un fond intégré, ou l'id de l'entité dans votre GeoJSON. Utilisez plutôt lat et lon pour des coordonnées.",
  "Feld mit dem Regionscode, der jeden Marker platziert: ein Länder- oder Staatenkürzel auf einer eingebauten Grundkarte oder die Feature-id in Ihrem GeoJSON. Für Koordinaten stattdessen lat und lon verwenden."
 ],
 "Field with each row's latitude, for placing by coordinates on your own GeoJSON (not on a built-in grid).": [
  "Champ avec la latitude de chaque ligne, pour placer par coordonnées sur votre propre GeoJSON (pas sur une grille intégrée).",
  "Feld mit dem Breitengrad jeder Zeile, zum Platzieren nach Koordinaten auf Ihrem eigenen GeoJSON (nicht auf einem eingebauten Raster)."
 ],
 "Field with each row's longitude, paired with lat.": [
  "Champ avec la longitude de chaque ligne, associé à lat.",
  "Feld mit dem Längengrad jeder Zeile, zusammen mit lat."
 ],
 "Field with each place's name, written beside its marker.": [
  "Champ avec le nom de chaque lieu, écrit à côté de son marqueur.",
  "Feld mit dem Namen jedes Orts, neben seinen Marker geschrieben."
 ],
 "Field with a second, smaller line under the name, such as a city or a headcount.": [
  "Champ avec une deuxième ligne plus petite sous le nom, comme une ville ou un effectif.",
  "Feld mit einer zweiten, kleineren Zeile unter dem Namen, etwa eine Stadt oder ein Personalstand."
 ],
 "Field that colors the markers by kind, with a key.": [
  "Champ qui colore les marqueurs par type, avec une légende.",
  "Feld, das die Marker nach Art färbt, mit Legende."
 ],
 "Field naming each column, such as a region. Columns keep the order of the rows.": [
  "Champ nommant chaque colonne, comme une région. Les colonnes gardent l'ordre des lignes.",
  "Feld, das jede Spalte benennt, etwa eine Region. Die Spalten behalten die Reihenfolge der Zeilen."
 ],
 "Field naming the segments inside each column, such as a product.": [
  "Champ nommant les segments de chaque colonne, comme un produit.",
  "Feld, das die Segmente in jeder Spalte benennt, etwa ein Produkt."
 ],
 "Numeric field sizing the segments; a column's width is the sum of its values.": [
  "Champ numérique qui dimensionne les segments ; la largeur d'une colonne est la somme de ses valeurs.",
  "Numerisches Feld, das die Segmente bemisst; die Breite einer Spalte ist die Summe ihrer Werte."
 ],
 "Field for the columns: quarters, stakeholders, stages.": [
  "Champ des colonnes : trimestres, parties prenantes, étapes.",
  "Feld für die Spalten: Quartale, Beteiligte, Phasen."
 ],
 "Field for the rows: topics, regulations, teams.": [
  "Champ des lignes : thèmes, réglementations, équipes.",
  "Feld für die Zeilen: Themen, Regelwerke, Teams."
 ],
 "Field that sizes each circle, by area, against the largest value.": [
  "Champ qui dimensionne chaque cercle, par sa surface, face à la plus grande valeur.",
  "Feld, das jeden Kreis nach Fläche bemisst, im Verhältnis zum größten Wert."
 ],
 "Field that shades each mark: a number takes the seven-step scale from lowest to highest (with a scale under the grid), a category takes one color per value (with a key).": [
  "Champ qui teinte chaque marque : un nombre prend l'échelle en sept pas du plus bas au plus haut (avec une échelle sous la grille), une catégorie prend une couleur par valeur (avec une légende).",
  "Feld, das jede Marke einfärbt: eine Zahl nimmt die siebenstufige Skala vom niedrigsten zum höchsten Wert (mit einer Skala unter dem Raster), eine Kategorie eine Farbe je Wert (mit Legende)."
 ],
 "A yes/no field (true, 1, \"yes\", \"x\"): a filled square where it is yes, an empty cell where it is no. For who must comply.": [
  "Un champ oui/non (true, 1, \"yes\", \"x\") : un carré plein là où c'est oui, une case vide là où c'est non. Pour savoir qui doit se conformer.",
  "Ein Ja/Nein-Feld (true, 1, \"yes\", \"x\"): ein gefülltes Quadrat bei Ja, eine leere Zelle bei Nein. Dafür, wer die Regeln erfüllen muss."
 ],
 "Field (text or a number) written inside marks big enough to hold it; always in the tooltip.": [
  "Champ (texte ou nombre) écrit dans les marques assez grandes pour le contenir ; toujours dans l'info-bulle.",
  "Feld (Text oder Zahl), das in Marken geschrieben wird, die groß genug dafür sind; immer im Tooltip."
 ],
 "Field holding the current amount.": [
  "Champ portant le montant actuel.",
  "Feld mit dem aktuellen Betrag."
 ],
 "Field holding the target amount.": [
  "Champ portant le montant cible.",
  "Feld mit dem Zielbetrag."
 ],
 "Field naming each meter, for example a region. Defaults to the value field's label.": [
  "Champ nommant chaque jauge, par exemple une région. Par défaut, le libellé du champ de valeur.",
  "Feld, das jede Anzeige benennt, etwa eine Region. Standard: die Bezeichnung des Wertfelds."
 ],
 "Field naming each category.": [
  "Champ nommant chaque catégorie.",
  "Feld, das jede Kategorie benennt."
 ],
 "Field with each category's count or amount. Zero and negative values are left out.": [
  "Champ avec le décompte ou le montant de chaque catégorie. Les valeurs nulles et négatives sont écartées.",
  "Feld mit Anzahl oder Betrag jeder Kategorie. Null- und negative Werte entfallen."
 ],
 "Running-total share that marks the vital few, from 0 to 1.": [
  "Part cumulée qui marque l'essentiel, de 0 à 1.",
  "Kumulierter Anteil, der die wenigen Wesentlichen markiert, von 0 bis 1."
 ],
 "\"inside\" writes each share on its slice (thin slices skip theirs) with a legend of names and values; \"outside\" writes names and shares beside the disc on short leader lines, with no legend; \"legend\" leaves the disc bare.": [
  "\"inside\" écrit chaque part sur sa portion (les plus fines s'en passent) avec une légende des noms et valeurs ; \"outside\" écrit noms et parts à côté du disque, reliés par de courts traits, sans légende ; \"legend\" laisse le disque nu.",
  "\"inside\" schreibt jeden Anteil in sein Segment (schmale lassen es aus), mit einer Legende der Namen und Werte; \"outside\" schreibt Namen und Anteile neben die Scheibe an kurzen Hilfslinien, ohne Legende; \"legend\" lässt die Scheibe frei."
 ],
 "Field naming each band, in order from top to bottom, such as the age group.": [
  "Champ nommant chaque tranche, de haut en bas, comme la classe d'âge.",
  "Feld, das jedes Band benennt, von oben nach unten, etwa die Altersgruppe."
 ],
 "Field with the count drawn leftward, such as women.": [
  "Champ avec l'effectif tracé vers la gauche, comme les femmes.",
  "Feld mit der nach links gezeichneten Anzahl, etwa Frauen."
 ],
 "Field with the count drawn rightward, such as men.": [
  "Champ avec l'effectif tracé vers la droite, comme les hommes.",
  "Feld mit der nach rechts gezeichneten Anzahl, etwa Männer."
 ],
 "Field naming each spoke, such as an attribute.": [
  "Champ nommant chaque rayon, comme un critère.",
  "Feld, das jede Speiche benennt, etwa ein Merkmal."
 ],
 "Field or fields with the scores; each field is one shape. Up to 3 stay readable.": [
  "Champ ou champs avec les notes ; chaque champ est une forme. Jusqu'à 3 restent lisibles.",
  "Feld oder Felder mit den Bewertungen; jedes Feld ist eine Form. Bis zu 3 bleiben lesbar."
 ],
 "End of the scale. Defaults to a round number at or above the highest score.": [
  "Fin de l'échelle. Par défaut, un nombre rond égal ou supérieur à la note la plus haute.",
  "Ende der Skala. Standard: eine runde Zahl auf oder über der höchsten Bewertung."
 ],
 "The statuses to show rows for, such as [\"R\", \"A\"] for what needs attention: the other rows fold into one line under the table (\"and 33 on track\"), so the counts still add up.": [
  "Les statuts dont on montre les lignes, comme [\"R\", \"A\"] pour ce qui demande attention : les autres se replient en une ligne sous le tableau (« et 33 conformes »), pour que les comptes tombent juste.",
  "Die Status, deren Zeilen gezeigt werden, etwa [\"R\", \"A\"] für das, was Aufmerksamkeit braucht: die übrigen Zeilen klappen zu einer Zeile unter der Tabelle zusammen („und 33 im Plan“), damit die Zahlen weiter aufgehen."
 ],
 "Field naming each row: the client, the relationship manager or the deal.": [
  "Champ nommant chaque ligne : le client, le chargé de clientèle ou l'affaire.",
  "Feld, das jede Zeile benennt: den Kunden, die Betreuerin oder den Deal."
 ],
 "Status fields, one column each, holding R, A, G or N (or red, amber, green, grey). The rag transform turns numbers into them.": [
  "Champs de statut, une colonne chacun, portant R, A, G ou N (ou red, amber, green, grey). La transformation rag y convertit des nombres.",
  "Statusfelder, je eine Spalte, mit R, A, G oder N (oder red, amber, green, grey). Die rag-Transformation macht aus Zahlen solche Werte."
 ],
 "Each dimension's previous-period status field, for the trend arrows: { \"health\": \"healthLast\", \"pipeline\": \"pipelineLast\" }.": [
  "Le champ de statut de la période précédente pour chaque dimension, pour les flèches de tendance : { \"health\": \"healthLast\", \"pipeline\": \"pipelineLast\" }.",
  "Das Statusfeld der Vorperiode je Dimension, für die Trendpfeile: { \"health\": \"healthLast\", \"pipeline\": \"pipelineLast\" }."
 ],
 "A first column with each row's overall status, the one to act on: true for the worst of its dimensions, false for none, or a status field holding a roll-up your model already worked out (for example \"two reds make red\").": [
  "Une première colonne avec le statut global de chaque ligne, celui sur lequel agir : true pour le pire de ses dimensions, false pour aucun, ou un champ de statut portant une synthèse déjà calculée par votre modèle (par exemple « deux rouges font rouge »).",
  "Eine erste Spalte mit dem Gesamtstatus jeder Zeile, nach dem gehandelt wird: true für den schlechtesten ihrer Dimensionen, false für keinen, oder ein Statusfeld mit einer Verdichtung, die Ihr Modell schon berechnet hat (etwa „zwei Rote ergeben Rot“)."
 ],
 "Rows worst first (by overall status, then the number of reds and ambers), by name, or as given.": [
  "Lignes les pires d'abord (par statut global, puis nombre de rouges et d'orange), par nom, ou dans l'ordre donné.",
  "Zeilen schlechteste zuerst (nach Gesamtstatus, dann Zahl der Roten und Gelben), nach Name oder wie angegeben."
 ],
 "Field that gathers rows under headings, such as segment or perspective.": [
  "Champ qui regroupe les lignes sous des titres, comme le segment ou la perspective.",
  "Feld, das Zeilen unter Überschriften sammelt, etwa Segment oder Perspektive."
 ],
 "Field written small under each name, such as the action owner or the next step.": [
  "Champ écrit en petit sous chaque nom, comme le responsable de l'action ou la prochaine étape.",
  "Feld, das klein unter jeden Namen geschrieben wird, etwa die Verantwortliche oder der nächste Schritt."
 ],
 "Words per status, keyed R, A, G, N, in place of Off track, At risk, On track and No data. Example: { \"G\": \"Healthy\", \"A\": \"Watch\", \"R\": \"Escalate\" }.": [
  "Mots par statut, avec les clés R, A, G, N, à la place de Hors trajectoire, À surveiller, Conforme et Sans données. Exemple : { \"G\": \"Healthy\", \"A\": \"Watch\", \"R\": \"Escalate\" }.",
  "Worte je Status, mit den Schlüsseln R, A, G, N, anstelle von Außer Plan, Gefährdet, Im Plan und Keine Daten. Beispiel: { \"G\": \"Healthy\", \"A\": \"Watch\", \"R\": \"Escalate\" }."
 ],
 "Shape per status, keyed R, A, G, N: circle, triangle, square, ring or diamond. Keep them different, so status never rests on color.": [
  "Forme par statut, avec les clés R, A, G, N : cercle, triangle, carré, anneau ou losange. Gardez-les différentes, pour que le statut ne repose jamais sur la couleur.",
  "Form je Status, mit den Schlüsseln R, A, G, N: Kreis, Dreieck, Quadrat, Ring oder Raute. Halten Sie sie verschieden, damit der Status nie nur an der Farbe hängt."
 ],
 "Field with each row's period: a month, a quarter or a review date, in order.": [
  "Champ avec la période de chaque ligne : un mois, un trimestre ou une date de revue, dans l'ordre.",
  "Feld mit der Periode jeder Zeile: ein Monat, ein Quartal oder ein Prüftermin, in Reihenfolge."
 ],
 "Field with the status in that period: R, A, G or N (or red, amber, green, grey).": [
  "Champ avec le statut sur cette période : R, A, G ou N (ou red, amber, green, grey).",
  "Feld mit dem Status in dieser Periode: R, A, G oder N (oder red, amber, green, grey)."
 ],
 "Field saying why the status moved, shown in the tooltip of the period where it changed.": [
  "Champ disant pourquoi le statut a changé, montré dans l'info-bulle de la période du changement.",
  "Feld, das sagt, warum sich der Status geändert hat, im Tooltip der Periode der Änderung."
 ],
 "Numeric field whose distribution is drawn.": [
  "Champ numérique dont la distribution est tracée.",
  "Numerisches Feld, dessen Verteilung gezeichnet wird."
 ],
 "Field giving each group its own ridge.": [
  "Champ donnant à chaque groupe sa propre crête.",
  "Feld, das jeder Gruppe einen eigenen Kamm gibt."
 ],
 "Field naming each goal.": [
  "Champ nommant chaque objectif.",
  "Feld, das jedes Ziel benennt."
 ],
 "Field with the amount reached.": [
  "Champ avec le montant atteint.",
  "Feld mit dem erreichten Betrag."
 ],
 "Field with the goal amount.": [
  "Champ avec le montant de l'objectif.",
  "Feld mit dem Zielbetrag."
 ],
 "Field naming each wedge, in cycle order, such as the hour or the month.": [
  "Champ nommant chaque secteur, dans l'ordre du cycle, comme l'heure ou le mois.",
  "Feld, das jeden Sektor benennt, in Zyklusreihenfolge, etwa die Stunde oder den Monat."
 ],
 "Field or fields with the values; each field is one ring of the stack. Up to 4 stay readable.": [
  "Champ ou champs des valeurs ; chaque champ est un anneau de l'empilement. Jusqu'à 4 restent lisibles.",
  "Feld oder Felder mit den Werten; jedes Feld ist ein Ring des Stapels. Bis zu 4 bleiben lesbar."
 ],
 "Total the outer ring stands for. Defaults to a round number at or above the largest wedge.": [
  "Total que représente l'anneau extérieur. Par défaut, un nombre rond égal ou supérieur au plus grand secteur.",
  "Summe, für die der äußere Ring steht. Standard: eine runde Zahl auf oder über dem größten Sektor."
 ],
 "Field naming where each flow starts.": [
  "Champ nommant le départ de chaque flux.",
  "Feld, das den Anfang jedes Flusses nennt."
 ],
 "Field naming where each flow ends.": [
  "Champ nommant l'arrivée de chaque flux.",
  "Feld, das das Ende jedes Flusses nennt."
 ],
 "Field with each flow's volume.": [
  "Champ avec le volume de chaque flux.",
  "Feld mit dem Volumen jedes Flusses."
 ],
 "Numeric field along the horizontal axis.": [
  "Champ numérique le long de l'axe horizontal.",
  "Numerisches Feld entlang der horizontalen Achse."
 ],
 "Numeric field along the vertical axis.": [
  "Champ numérique le long de l'axe vertical.",
  "Numerisches Feld entlang der vertikalen Achse."
 ],
 "Field sizing each dot by area, making a bubble chart: four times the value, twice the radius. Bigger bubbles are drawn first.": [
  "Champ qui dimensionne chaque point par sa surface, pour un graphique à bulles : quatre fois la valeur, deux fois le rayon. Les plus grosses bulles sont tracées d'abord.",
  "Feld, das jeden Punkt nach Fläche bemisst, für ein Blasendiagramm: vierfacher Wert, doppelter Radius. Größere Blasen werden zuerst gezeichnet."
 ],
 "Field that groups the dots by color. Up to 3 groups stay distinct.": [
  "Champ qui regroupe les points par couleur. Jusqu'à 3 groupes restent distincts.",
  "Feld, das die Punkte nach Farbe gruppiert. Bis zu 3 Gruppen bleiben unterscheidbar."
 ],
 "Field naming each dot's cluster, such as a segment found by analysis. A soft, rounded hull gathers each cluster's dots and carries its name at the middle, so the areas read as regions of the plot; the dots take the cluster's color unless color is set. Up to 6 clusters.": [
  "Champ nommant le groupe de chaque point, comme un segment issu d'une analyse. Une enveloppe douce et arrondie réunit les points de chaque groupe et porte son nom au centre, pour que les zones se lisent comme des régions du graphique ; les points prennent la couleur du groupe sauf si color est donné. Jusqu'à 6 groupes.",
  "Feld, das den Cluster jedes Punkts nennt, etwa ein per Analyse gefundenes Segment. Eine weiche, abgerundete Hülle fasst die Punkte jedes Clusters zusammen und trägt seinen Namen in der Mitte, sodass die Flächen als Regionen des Diagramms lesbar sind; die Punkte nehmen die Farbe des Clusters an, sofern color nicht gesetzt ist. Bis zu 6 Cluster."
 ],
 "Write each dot's label beside it, skipping names that would land on another, so the standouts are named on the chart itself.": [
  "Écrit le libellé de chaque point à côté de lui, en sautant ceux qui tomberaient sur un autre, pour nommer les points saillants sur le graphique même.",
  "Schreibt die Bezeichnung jedes Punkts daneben und überspringt Namen, die auf einem anderen landen würden, sodass die Auffälligen im Diagramm selbst benannt sind."
 ],
 "Splits the plot into four at a value of x and of y, with a faint word in each corner: { \"x\": 50, \"y\": 3, \"labels\": [\"Monitor\", \"Act now\", \"Prepare\", \"Watch\"] } (top-left first, then clockwise). For priority grids such as pressure against impact.": [
  "Divise le graphique en quatre à une valeur de x et de y, avec un mot discret dans chaque coin : { \"x\": 50, \"y\": 3, \"labels\": [\"Monitor\", \"Act now\", \"Prepare\", \"Watch\"] } (en haut à gauche d'abord, puis dans le sens horaire). Pour les grilles de priorité, comme la pression face à l'impact.",
  "Teilt das Diagramm bei einem x- und einem y-Wert in vier, mit einem dezenten Wort in jeder Ecke: { \"x\": 50, \"y\": 3, \"labels\": [\"Monitor\", \"Act now\", \"Prepare\", \"Watch\"] } (oben links zuerst, dann im Uhrzeigersinn). Für Prioritätsraster wie Druck gegen Wirkung."
 ],
 "Field with the earlier value (left column).": [
  "Champ avec la valeur antérieure (colonne de gauche).",
  "Feld mit dem früheren Wert (linke Spalte)."
 ],
 "Field with the later value (right column).": [
  "Champ avec la valeur postérieure (colonne de droite).",
  "Feld mit dem späteren Wert (rechte Spalte)."
 ],
 "Field or fields with each part's count, in the order they are drawn. The first part's share of the total is written at the end.": [
  "Champ ou champs avec le décompte de chaque partie, dans l'ordre du tracé. La part de la première dans le total est écrite au bout.",
  "Feld oder Felder mit der Anzahl jedes Teils, in Zeichenreihenfolge. Der Anteil des ersten Teils an der Summe steht am Ende."
 ],
 "Field with a denominator, such as pages: the density (units per one of them) is written at the end and in the tooltip.": [
  "Champ avec un dénominateur, comme les pages : la densité (unités par page) est écrite au bout et dans l'info-bulle.",
  "Feld mit einem Nenner, etwa Seiten: die Dichte (Einheiten je Seite) steht am Ende und im Tooltip."
 ],
 "What one unit is, in the singular, for the note under the chart and the tooltip.": [
  "Ce qu'est une unité, au singulier, pour la note sous le graphique et l'info-bulle.",
  "Was eine Einheit ist, im Singular, für den Hinweis unter dem Diagramm und den Tooltip."
 ],
 "Fields from the top level down, one ring each, for example [\"product\", \"region\"]. Up to 3.": [
  "Champs du niveau le plus haut au plus bas, un anneau chacun, par exemple [\"product\", \"region\"]. Jusqu'à 3.",
  "Felder von der obersten Ebene abwärts, je ein Ring, etwa [\"product\", \"region\"]. Bis zu 3."
 ],
 "Field sizing the slices. Zero and negative values are left out.": [
  "Champ qui dimensionne les portions. Les valeurs nulles et négatives sont écartées.",
  "Feld, das die Segmente bemisst. Null- und negative Werte entfallen."
 ],
 "Text under the total in the middle. Defaults to the value field's label.": [
  "Texte sous le total au centre. Par défaut, le libellé du champ de valeur.",
  "Text unter der Summe in der Mitte. Standard: die Bezeichnung des Wertfelds."
 ],
 "Field with the region code that places each circle: a country or state code on a built-in basemap, or the feature id in your GeoJSON. Use lat and lon instead for coordinates.": [
  "Champ avec le code de région qui place chaque cercle : un code de pays ou d'État sur un fond intégré, ou l'id de l'entité dans votre GeoJSON. Utilisez plutôt lat et lon pour des coordonnées.",
  "Feld mit dem Regionscode, der jeden Kreis platziert: ein Länder- oder Staatenkürzel auf einer eingebauten Grundkarte oder die Feature-id in Ihrem GeoJSON. Für Koordinaten stattdessen lat und lon verwenden."
 ],
 "Field that sizes each circle, by area. Zero and missing values draw nothing.": [
  "Champ qui dimensionne chaque cercle, par sa surface. Les valeurs nulles et manquantes ne tracent rien.",
  "Feld, das jeden Kreis nach Fläche bemisst. Null- und fehlende Werte zeichnen nichts."
 ],
 "Field naming each place in its tooltip. Defaults to the region's name, or the id.": [
  "Champ nommant chaque lieu dans son info-bulle. Par défaut, le nom de la région, ou l'id.",
  "Feld, das jeden Ort in seinem Tooltip benennt. Standard: der Name der Region oder die id."
 ],
 "Field that colors the circles by group, with a key.": [
  "Champ qui colore les cercles par groupe, avec une légende.",
  "Feld, das die Kreise nach Gruppe färbt, mit Legende."
 ],
 "Fields to show, in order. Defaults to every field in the rows.": [
  "Champs à montrer, dans l'ordre. Par défaut, tous les champs des lignes.",
  "Felder, die gezeigt werden, in Reihenfolge. Standard: alle Felder der Zeilen."
 ],
 "Headers become buttons that sort the rows: ascending, then descending. Missing values stay last.": [
  "Les en-têtes deviennent des boutons qui trient les lignes : croissant, puis décroissant. Les valeurs manquantes restent à la fin.",
  "Kopfzeilen werden zu Schaltflächen, die die Zeilen sortieren: aufsteigend, dann absteigend. Fehlende Werte bleiben am Ende."
 ],
 "Adds a footer row summing each number column in its own format, over every row whatever the page or search shows. Percent columns stay blank, since summed shares mean nothing.": [
  "Ajoute une ligne de pied qui totalise chaque colonne numérique dans son format, sur toutes les lignes quelle que soit la page ou la recherche. Les colonnes de pourcentages restent vides, car additionner des parts n'a pas de sens.",
  "Fügt eine Fußzeile hinzu, die jede Zahlenspalte in ihrem Format summiert, über alle Zeilen, gleich welche Seite oder Suche gezeigt wird. Prozentspalten bleiben leer, da summierte Anteile nichts bedeuten."
 ],
 "A small search field above the table: typing keeps only the rows whose shown text matches, in any column, and says how many remain. For directories and long lists.": [
  "Un petit champ de recherche au-dessus du tableau : la saisie ne garde que les lignes dont le texte affiché correspond, dans n'importe quelle colonne, et dit combien il en reste. Pour les annuaires et les longues listes.",
  "Ein kleines Suchfeld über der Tabelle: die Eingabe behält nur die Zeilen, deren angezeigter Text passt, in jeder Spalte, und sagt, wie viele bleiben. Für Verzeichnisse und lange Listen."
 ],
 "Rows shown at a time, with Previous and Next under the table (hidden while the rows fit on one page). Sorting or searching goes back to the first page. Leave out for the first 100 rows and a Show more button.": [
  "Lignes montrées à la fois, avec Précédent et Suivant sous le tableau (masqués si tout tient sur une page). Trier ou chercher revient à la première page. Sans lui, les 100 premières lignes et un bouton Afficher plus.",
  "Zeilen je Seite, mit Zurück und Weiter unter der Tabelle (ausgeblendet, solange alles auf eine Seite passt). Sortieren oder Suchen springt zur ersten Seite zurück. Ohne Angabe die ersten 100 Zeilen und eine Schaltfläche Mehr anzeigen."
 ],
 "Draws every row at once. By default a table without pages shows its first 100 rows and a Show more button that adds 100 at a time.": [
  "Trace toutes les lignes d'un coup. Par défaut, un tableau sans pages montre ses 100 premières lignes et un bouton Afficher plus qui en ajoute 100 à la fois.",
  "Zeichnet alle Zeilen auf einmal. Standardmäßig zeigt eine Tabelle ohne Seiten ihre ersten 100 Zeilen und eine Schaltfläche Mehr anzeigen, die jeweils 100 hinzufügt."
 ],
 "Keeps the first column in place while a wide table scrolls sideways, so every row keeps its name in view.": [
  "Garde la première colonne en place quand un tableau large défile de côté, pour que chaque ligne garde son nom en vue.",
  "Hält die erste Spalte fest, während eine breite Tabelle seitlich scrollt, sodass jede Zeile ihren Namen im Blick behält."
 ],
 "Text alignment per column, overriding the default of numbers right and text left: { \"status\": \"center\" }. Values: left, center, right.": [
  "Alignement du texte par colonne, à la place des nombres à droite et du texte à gauche : { \"status\": \"center\" }. Valeurs : left, center, right.",
  "Textausrichtung je Spalte, anstelle von Zahlen rechts und Text links: { \"status\": \"center\" }. Werte: left, center, right."
 ],
 "Field naming each task.": [
  "Champ nommant chaque tâche.",
  "Feld, das jede Aufgabe benennt."
 ],
 "Field with each task's start date, as YYYY-MM-DD or a timestamp.": [
  "Champ avec la date de début de chaque tâche, en AAAA-MM-JJ ou en horodatage.",
  "Feld mit dem Startdatum jeder Aufgabe, als JJJJ-MM-TT oder Zeitstempel."
 ],
 "Field with each task's end date. A row without one is drawn as a milestone.": [
  "Champ avec la date de fin de chaque tâche. Une ligne sans fin est tracée en jalon.",
  "Feld mit dem Enddatum jeder Aufgabe. Eine Zeile ohne Ende wird als Meilenstein gezeichnet."
 ],
 "Field that colors tasks by team or phase, up to 8 groups.": [
  "Champ qui colore les tâches par équipe ou par phase, jusqu'à 8 groupes.",
  "Feld, das Aufgaben nach Team oder Phase färbt, bis zu 8 Gruppen."
 ],
 "Field with each task's share done, from 0 to 1 (values above 1 are read as percentages). Fills the bar that far and labels it after the bar.": [
  "Champ avec la part réalisée de chaque tâche, de 0 à 1 (au-delà de 1, lue en pourcentage). Remplit la barre d'autant et l'écrit après elle.",
  "Feld mit dem erledigten Anteil jeder Aufgabe, von 0 bis 1 (Werte über 1 gelten als Prozent). Füllt den Balken so weit und beschriftet ihn dahinter."
 ],
 "true for a line at today's date, or a YYYY-MM-DD date for the line. Shown only when it falls inside the plan.": [
  "true pour une ligne à la date du jour, ou une date AAAA-MM-JJ pour la ligne. Montrée seulement si elle tombe dans le planning.",
  "true für eine Linie am heutigen Datum oder ein Datum JJJJ-MM-TT für die Linie. Erscheint nur, wenn es in den Plan fällt."
 ],
 "Field naming each tile.": [
  "Champ nommant chaque tuile.",
  "Feld, das jede Kachel benennt."
 ],
 "Field sizing each tile. Zero and negative values are left out.": [
  "Champ qui dimensionne chaque tuile. Les valeurs nulles et négatives sont écartées.",
  "Feld, das jede Kachel bemisst. Null- und negative Werte entfallen."
 ],
 "Field that colors related tiles alike, up to 8 groups. Without it every tile shares one color.": [
  "Champ qui colore de même les tuiles liées, jusqu'à 8 groupes. Sans lui, toutes les tuiles partagent une couleur.",
  "Feld, das verwandte Kacheln gleich färbt, bis zu 8 Gruppen. Ohne es teilen alle Kacheln eine Farbe."
 ],
 "Field naming each row, such as a department.": [
  "Champ nommant chaque ligne, comme un service.",
  "Feld, das jede Zeile benennt, etwa eine Abteilung."
 ],
 "Field with the plan, budget or target.": [
  "Champ avec le plan, le budget ou la cible.",
  "Feld mit Plan, Budget oder Ziel."
 ],
 "Show the variance as a share of plan (+8%) instead of an amount.": [
  "Montre l'écart en part du plan (+8 %) plutôt qu'en montant.",
  "Zeigt die Abweichung als Anteil am Plan (+8 %) statt als Betrag."
 ],
 "Whether being over plan is good (\"up\", as for revenue) or bad (\"down\", as for costs).": [
  "Si dépasser le plan est bon (\"up\", comme pour le chiffre d'affaires) ou mauvais (\"down\", comme pour les coûts).",
  "Ob ein Überschreiten des Plans gut ist (\"up\", wie beim Umsatz) oder schlecht (\"down\", wie bei Kosten)."
 ],
 "Field with each category's amount. Zero and negative values are left out.": [
  "Champ avec le montant de chaque catégorie. Les valeurs nulles et négatives sont écartées.",
  "Feld mit dem Betrag jeder Kategorie. Null- und negative Werte entfallen."
 ],
 "The whole the values are part of, when they do not add up to it; the rest of the grid stays empty. Example: 100 for percentages.": [
  "Le tout dont les valeurs font partie, quand elles ne le remplissent pas ; le reste de la grille reste vide. Exemple : 100 pour des pourcentages.",
  "Das Ganze, zu dem die Werte gehören, wenn sie es nicht ausfüllen; der Rest des Rasters bleibt leer. Beispiel: 100 für Prozentwerte."
 ],
 "Field naming each step.": [
  "Champ nommant chaque étape.",
  "Feld, das jeden Schritt benennt."
 ],
 "Field with each step's change, or the amount for total rows.": [
  "Champ avec la variation de chaque étape, ou le montant des lignes de total.",
  "Feld mit der Veränderung jedes Schritts oder dem Betrag der Summenzeilen."
 ],
 "Labels of rows that are totals (drawn from zero, resetting the running total), for example [\"Q2 revenue\"].": [
  "Libellés des lignes de total (tracées depuis zéro, qui remettent le cumul à zéro), par exemple [\"Q2 revenue\"].",
  "Bezeichnungen der Summenzeilen (ab null gezeichnet, die die laufende Summe zurücksetzen), etwa [\"Q2 revenue\"]."
 ],
 "Adds a final total bar with this label, for example \"Q3 revenue\".": [
  "Ajoute une barre de total finale avec ce libellé, par exemple \"Q3 revenue\".",
  "Fügt einen letzten Summenbalken mit dieser Bezeichnung hinzu, etwa \"Q3 revenue\"."
 ],
 "Fit the axis to the running totals instead of starting at zero, so small changes stay visible. Totals then rise from the axis floor.": [
  "Ajuste l'axe aux totaux cumulés au lieu de partir de zéro, pour que les petites variations restent visibles. Les totaux partent alors du bas de l'axe.",
  "Passt die Achse an die laufenden Summen an, statt bei null zu beginnen, sodass kleine Veränderungen sichtbar bleiben. Summen steigen dann vom Achsenboden auf."
 ],
 "Field naming each row, usually the client.": [
  "Champ nommant chaque ligne, en général le client.",
  "Feld, das jede Zeile benennt, meist den Kunden."
 ],
 "Field naming each column, usually the product.": [
  "Champ nommant chaque colonne, en général le produit.",
  "Feld, das jede Spalte benennt, meist das Produkt."
 ],
 "Field saying whether the row holds the column, could (an opportunity), or is not eligible. See states.": [
  "Champ disant si la ligne détient la colonne, pourrait la prendre (une opportunité) ou n'y est pas éligible. Voir states.",
  "Feld, das sagt, ob die Zeile die Spalte hält, halten könnte (eine Chance) oder nicht berechtigt ist. Siehe states."
 ],
 "The three values the state field uses, in order: held, opportunity, not eligible. Default [\"Holds\", \"Opportunity\", \"Not eligible\"].": [
  "Les trois valeurs utilisées par le champ d'état, dans l'ordre : détenu, opportunité, non éligible. Par défaut [\"Holds\", \"Opportunity\", \"Not eligible\"].",
  "Die drei Werte des Statusfelds, in Reihenfolge: gehalten, Chance, nicht berechtigt. Standard [\"Holds\", \"Opportunity\", \"Not eligible\"]."
 ],
 "Field with how likely each opportunity is, 0 to 100 (a propensity). An opportunity cell's tint strengthens with it.": [
  "Champ avec la probabilité de chaque opportunité, de 0 à 100 (une appétence). La teinte d'une cellule d'opportunité s'intensifie avec elle.",
  "Feld mit der Wahrscheinlichkeit jeder Chance, 0 bis 100 (eine Affinität). Die Tönung einer Chancenzelle wird damit kräftiger."
 ],
 "Field with the money in each cell: revenue where held, potential where open. Written in the tooltip; the open cells' sum ends each row.": [
  "Champ avec l'argent de chaque cellule : le revenu là où c'est détenu, le potentiel là où c'est ouvert. Écrit dans l'info-bulle ; la somme des cellules ouvertes termine chaque ligne.",
  "Feld mit dem Geld in jeder Zelle: Umsatz, wo gehalten, Potenzial, wo offen. Steht im Tooltip; die Summe der offenen Zellen schließt jede Zeile ab."
 ],
 "Row order: \"potential\" puts the rows with the most to win first, \"penetration\" the least covered first, \"none\" keeps the rows as given.": [
  "Ordre des lignes : \"potential\" met d'abord celles qui ont le plus à gagner, \"penetration\" les moins couvertes, \"none\" garde l'ordre donné.",
  "Zeilenreihenfolge: \"potential\" setzt die mit dem meisten Potenzial zuerst, \"penetration\" die am wenigsten abgedeckten, \"none\" behält die Reihenfolge."
 ],
 "Show only this many rows, the first in the sort order, with a line saying how many more there are. Applied after filters, so a filtered book still shows its own top rows.": [
  "Ne montre que ce nombre de lignes, les premières dans l'ordre de tri, avec une ligne disant combien il en reste. Appliqué après les filtres, pour qu'un portefeuille filtré montre ses propres premières lignes.",
  "Zeigt nur so viele Zeilen, die ersten in der Sortierung, mit einer Zeile, wie viele noch folgen. Gilt nach den Filtern, sodass ein gefilterter Bestand seine eigenen Spitzenzeilen zeigt."
 ],
 "Field with the client's name.": [
  "Champ avec le nom du client.",
  "Feld mit dem Namen des Kunden."
 ],
 "Field for the line under the name, such as the segment or the relationship manager.": [
  "Champ de la ligne sous le nom, comme le segment ou le chargé de clientèle.",
  "Feld für die Zeile unter dem Namen, etwa das Segment oder die Betreuerin."
 ],
 "Up to six fields shown as small labelled figures: assets, revenue, products held, client since.": [
  "Jusqu'à six champs montrés en petits chiffres nommés : actifs, revenu, produits détenus, client depuis.",
  "Bis zu sechs Felder als kleine beschriftete Zahlen: Vermögen, Umsatz, gehaltene Produkte, Kunde seit."
 ],
 "True/false fields, one per product, drawn as a strip of named pills: held in color, not held outlined.": [
  "Champs vrai/faux, un par produit, tracés en bande de pastilles nommées : détenu en couleur, non détenu en contour.",
  "Wahr/Falsch-Felder, eines je Produkt, als Streifen benannter Pillen: gehalten farbig, nicht gehalten umrandet."
 ],
 "Field with the share of wallet, 0 to 1, drawn as a meter with its percent.": [
  "Champ avec la part de portefeuille, de 0 à 1, tracée en jauge avec son pourcentage.",
  "Feld mit dem Wallet-Anteil, 0 bis 1, als Anzeige mit seinem Prozentwert."
 ],
 "Field whose value is a list of numbers (revenue by month, say), drawn as a small trend with its first and last values written.": [
  "Champ dont la valeur est une liste de nombres (le revenu par mois, par exemple), tracée en petite tendance avec sa première et sa dernière valeur écrites.",
  "Feld, dessen Wert eine Zahlenliste ist (etwa Umsatz je Monat), als kleiner Trend mit erstem und letztem Wert gezeichnet."
 ],
 "Field whose value is a list of short warnings, shown as quiet amber pills: [\"No contact in 90 days\", \"Fee leakage\"].": [
  "Champ dont la valeur est une liste de courtes alertes, montrées en pastilles orange discrètes : [\"No contact in 90 days\", \"Fee leakage\"].",
  "Feld, dessen Wert eine Liste kurzer Warnungen ist, als dezente gelbe Pillen: [\"No contact in 90 days\", \"Fee leakage\"]."
 ],
 "Field whose value is a list of next best actions, shown as a short checklist.": [
  "Champ dont la valeur est une liste de prochaines meilleures actions, montrée en courte liste à cocher.",
  "Feld, dessen Wert eine Liste nächster bester Aktionen ist, als kurze Checkliste."
 ],
 "The wallet audit: adds \"Audit wallet\" (risks, opportunities, coverage and standing, each figure traced to its field) and \"Copy strategy\" (a 30, 60 and 90-day account strategy as Markdown) to the card. { \"key\"?: field naming the client, \"currency\"?: \"EUR\", \"sources\": { \"holdings\", \"history\", \"activity\", \"health\", \"deals\", \"thresholds\": each a data spec such as { \"type\": \"url\", \"url\": \"/data/holdings.json\" }, with \"match\" naming the client field when it is not \"client\" or \"name\" } }. Sources load when the audit is first opened.": [
  "L'audit de portefeuille : ajoute à la carte « Auditer le portefeuille » (risques, opportunités, couverture et position, chaque chiffre relié à son champ) et « Copier la stratégie » (une stratégie de compte à 30, 60 et 90 jours en Markdown). { \"key\"?: champ nommant le client, \"currency\"?: \"EUR\", \"sources\": { \"holdings\", \"history\", \"activity\", \"health\", \"deals\", \"thresholds\": chacun une spécification de données comme { \"type\": \"url\", \"url\": \"/data/holdings.json\" }, avec \"match\" nommant le champ client s'il ne s'appelle ni \"client\" ni \"name\" } }. Les sources se chargent à la première ouverture de l'audit.",
  "Das Wallet-Audit: fügt der Karte „Wallet prüfen“ (Risiken, Chancen, Abdeckung und Stand, jede Zahl auf ihr Feld zurückgeführt) und „Strategie kopieren“ (eine Kundenstrategie für 30, 60 und 90 Tage als Markdown) hinzu. { \"key\"?: Feld mit dem Kunden, \"currency\"?: \"EUR\", \"sources\": { \"holdings\", \"history\", \"activity\", \"health\", \"deals\", \"thresholds\": jeweils eine Datenspezifikation wie { \"type\": \"url\", \"url\": \"/data/holdings.json\" }, mit \"match\" für das Kundenfeld, wenn es nicht \"client\" oder \"name\" heißt } }. Die Quellen laden beim ersten Öffnen des Audits."
 ]
};

/** Each option's label, by its name. */
export const OPTION_NAMES: Record<string, Pair> = {
 "actions": [
  "Actions",
  "Aktionen"
 ],
 "align": [
  "Alignement",
  "Ausrichtung"
 ],
 "amount": [
  "Montant",
  "Betrag"
 ],
 "annotations": [
  "Annotations",
  "Anmerkungen"
 ],
 "arc": [
  "Arc",
  "Bogen"
 ],
 "audit": [
  "Audit",
  "Audit"
 ],
 "average": [
  "Moyenne mobile",
  "Gleitender Durchschnitt"
 ],
 "band": [
  "Plage",
  "Spanne"
 ],
 "bands": [
  "Bandes",
  "Bänder"
 ],
 "baseline": [
  "Base",
  "Grundlinie"
 ],
 "baselineLabel": [
  "Nom de la base",
  "Name der Grundlinie"
 ],
 "bins": [
  "Classes",
  "Klassen"
 ],
 "caption": [
  "Légende",
  "Beschriftung"
 ],
 "category": [
  "Catégorie",
  "Kategorie"
 ],
 "change": [
  "Évolution",
  "Veränderung"
 ],
 "close": [
  "Clôture",
  "Schluss"
 ],
 "cluster": [
  "Groupe",
  "Cluster"
 ],
 "codes": [
  "Codes",
  "Kürzel"
 ],
 "color": [
  "Couleur",
  "Farbe"
 ],
 "column": [
  "Colonne",
  "Spalte"
 ],
 "columns": [
  "Colonnes",
  "Spalten"
 ],
 "compare": [
  "Comparaison",
  "Vergleich"
 ],
 "compareLabel": [
  "Nom de la comparaison",
  "Name des Vergleichs"
 ],
 "countLabel": [
  "Nom des effectifs",
  "Name der Anzahl"
 ],
 "curve": [
  "Courbe",
  "Kurve"
 ],
 "date": [
  "Date",
  "Datum"
 ],
 "detail": [
  "Détail",
  "Detail"
 ],
 "dimensions": [
  "Dimensions",
  "Dimensionen"
 ],
 "end": [
  "Fin",
  "Ende"
 ],
 "endLabel": [
  "Libellé de fin",
  "Endbeschriftung"
 ],
 "endLabels": [
  "Libellés de fin",
  "Endbeschriftungen"
 ],
 "expected": [
  "Attendu",
  "Erwartet"
 ],
 "facts": [
  "Chiffres",
  "Kennzahlen"
 ],
 "fit": [
  "Ajuster l'axe",
  "Achse anpassen"
 ],
 "flag": [
  "Signal",
  "Markierung"
 ],
 "flags": [
  "Alertes",
  "Warnungen"
 ],
 "forecast": [
  "Prévision",
  "Prognose"
 ],
 "from": [
  "Depuis",
  "Von"
 ],
 "geo": [
  "Carte",
  "Karte"
 ],
 "goodWhen": [
  "Bon quand",
  "Gut, wenn"
 ],
 "group": [
  "Groupe",
  "Gruppe"
 ],
 "high": [
  "Haut",
  "Hoch"
 ],
 "highlight": [
  "Mise en avant",
  "Hervorheben"
 ],
 "holdings": [
  "Produits détenus",
  "Gehaltene Produkte"
 ],
 "icon": [
  "Icône",
  "Symbol"
 ],
 "id": [
  "Code",
  "Kürzel"
 ],
 "impact": [
  "Impact",
  "Wirkung"
 ],
 "items": [
  "Éléments",
  "Einträge"
 ],
 "key": [
  "Clé",
  "Schlüssel"
 ],
 "kind": [
  "Type",
  "Art"
 ],
 "label": [
  "Libellé",
  "Bezeichnung"
 ],
 "labelPlace": [
  "Place des libellés",
  "Position der Beschriftung"
 ],
 "labels": [
  "Libellés",
  "Beschriftungen"
 ],
 "lat": [
  "Latitude",
  "Breitengrad"
 ],
 "left": [
  "Gauche",
  "Links"
 ],
 "levels": [
  "Niveaux",
  "Ebenen"
 ],
 "limit": [
  "Limite",
  "Begrenzung"
 ],
 "lines": [
  "Lignes",
  "Linien"
 ],
 "lon": [
  "Longitude",
  "Längengrad"
 ],
 "low": [
  "Bas",
  "Tief"
 ],
 "majority": [
  "Majorité",
  "Mehrheit"
 ],
 "mark": [
  "Marque",
  "Markierung"
 ],
 "max": [
  "Maximum",
  "Maximum"
 ],
 "median": [
  "Médiane",
  "Median"
 ],
 "metric": [
  "Mesure",
  "Kennzahl"
 ],
 "min": [
  "Minimum",
  "Minimum"
 ],
 "note": [
  "Note",
  "Notiz"
 ],
 "only": [
  "Seulement",
  "Nur"
 ],
 "open": [
  "Ouverture",
  "Eröffnung"
 ],
 "order": [
  "Ordre",
  "Reihenfolge"
 ],
 "other": [
  "Autres",
  "Sonstige"
 ],
 "overall": [
  "Global",
  "Gesamt"
 ],
 "pageSize": [
  "Lignes par page",
  "Zeilen je Seite"
 ],
 "panels": [
  "Panneaux",
  "Felder"
 ],
 "peaks": [
  "Extrêmes",
  "Extremwerte"
 ],
 "per": [
  "Par",
  "Je"
 ],
 "percent": [
  "Pourcentage",
  "Prozent"
 ],
 "period": [
  "Période",
  "Periode"
 ],
 "points": [
  "Points",
  "Punkte"
 ],
 "previous": [
  "Précédent",
  "Vorperiode"
 ],
 "progress": [
  "Avancement",
  "Fortschritt"
 ],
 "quadrants": [
  "Quadrants",
  "Quadranten"
 ],
 "rag": [
  "Statut RAG",
  "RAG-Status"
 ],
 "ranges": [
  "Plages",
  "Bereiche"
 ],
 "reference": [
  "Référence",
  "Bezugslinie"
 ],
 "right": [
  "Droite",
  "Rechts"
 ],
 "row": [
  "Ligne",
  "Zeile"
 ],
 "scale": [
  "Échelle",
  "Skala"
 ],
 "score": [
  "Note",
  "Bewertung"
 ],
 "search": [
  "Recherche",
  "Suche"
 ],
 "series": [
  "Série",
  "Reihe"
 ],
 "shapes": [
  "Formes",
  "Formen"
 ],
 "shared": [
  "Échelle commune",
  "Gemeinsame Skala"
 ],
 "show": [
  "Afficher",
  "Anzeigen"
 ],
 "showAll": [
  "Tout afficher",
  "Alle anzeigen"
 ],
 "size": [
  "Taille",
  "Größe"
 ],
 "sort": [
  "Tri",
  "Sortierung"
 ],
 "sortable": [
  "Triable",
  "Sortierbar"
 ],
 "source": [
  "Source",
  "Quelle"
 ],
 "split": [
  "Colonnes séparées",
  "Getrennte Spalten"
 ],
 "stacked": [
  "Empilé",
  "Gestapelt"
 ],
 "stage": [
  "Étape",
  "Phase"
 ],
 "stages": [
  "Étapes",
  "Phasen"
 ],
 "start": [
  "Début",
  "Start"
 ],
 "state": [
  "État",
  "Status"
 ],
 "states": [
  "États",
  "Status"
 ],
 "status": [
  "Statut",
  "Status"
 ],
 "stickyFirst": [
  "Première colonne fixe",
  "Erste Spalte fixieren"
 ],
 "target": [
  "Cible",
  "Ziel"
 ],
 "threshold": [
  "Seuil",
  "Schwelle"
 ],
 "title": [
  "Titre",
  "Titel"
 ],
 "to": [
  "Vers",
  "Bis"
 ],
 "today": [
  "Aujourd'hui",
  "Heute"
 ],
 "total": [
  "Total",
  "Summe"
 ],
 "totals": [
  "Totaux",
  "Summen"
 ],
 "trend": [
  "Tendance",
  "Trend"
 ],
 "unit": [
  "Unité",
  "Einheit"
 ],
 "value": [
  "Valeur",
  "Wert"
 ],
 "wallet": [
  "Portefeuille",
  "Wallet"
 ],
 "words": [
  "Mots",
  "Wörter"
 ],
 "x": [
  "X",
  "X"
 ],
 "y": [
  "Y",
  "Y"
 ],
 "y2": [
  "Y2",
  "Y2"
 ]
};

/** The guide's "best for" and "least useful for" lines, by their English. */
export const GUIDE_USES: Record<string, Pair> = {
 "Watching a dozen daily measures at once and seeing which stepped out of line: net new money, fees, trades, complaints": [
  "Suivre une douzaine de mesures quotidiennes à la fois et voir laquelle déraille : collecte nette, commissions, transactions, réclamations",
  "Ein Dutzend täglicher Kennzahlen gleichzeitig beobachten und sehen, welche ausschert: Netto-Neugeld, Gebühren, Transaktionen, Beschwerden"
 ],
 "Operations and risk monitoring, where the exceptions matter more than the levels": [
  "Suivi des opérations et des risques, où les exceptions comptent plus que les niveaux",
  "Betriebs- und Risikoüberwachung, wo Ausnahmen mehr zählen als Niveaus"
 ],
 "Comparing the levels of the measures with each other (each lane has its own scale; use line)": [
  "Comparer les niveaux des mesures entre elles (chaque couloir a sa propre échelle ; utilisez line)",
  "Die Niveaus der Kennzahlen untereinander vergleichen (jede Bahn hat ihre eigene Skala; line verwenden)"
 ],
 "One measure only (use line with a band)": [
  "Une seule mesure (utilisez line avec une bande)",
  "Nur eine Kennzahl (line mit Band verwenden)"
 ],
 "Volumes over time where the amount itself matters: cash, revenue, traffic": [
  "Des volumes dans le temps où le montant lui-même compte : trésorerie, chiffre d'affaires, trafic",
  "Volumina im Zeitverlauf, bei denen der Betrag selbst zählt: Liquidität, Umsatz, Traffic"
 ],
 "A forecast with its uncertainty band": [
  "Une prévision avec sa bande d'incertitude",
  "Eine Prognose mit ihrem Unsicherheitsband"
 ],
 "How a stacked total splits over time (two to four series)": [
  "Comment un total empilé se répartit dans le temps (deux à quatre séries)",
  "Wie sich eine gestapelte Summe im Zeitverlauf aufteilt (zwei bis vier Reihen)"
 ],
 "Several series that cross: the fills hide each other (use line)": [
  "Plusieurs séries qui se croisent : les aplats se masquent (utilisez line)",
  "Mehrere Reihen, die sich kreuzen: die Flächen verdecken einander (line verwenden)"
 ],
 "Categories with no order (use bar)": [
  "Des catégories sans ordre (utilisez bar)",
  "Kategorien ohne Reihenfolge (bar verwenden)"
 ],
 "Values that go below zero": [
  "Des valeurs qui passent sous zéro",
  "Werte unter null"
 ],
 "An amount across a handful of categories: revenue by region, orders by month": [
  "Un montant sur quelques catégories : chiffre d'affaires par région, commandes par mois",
  "Ein Betrag über wenige Kategorien: Umsatz je Region, Bestellungen je Monat"
 ],
 "Two or three series side by side or stacked: Core and Plus by region": [
  "Deux ou trois séries côte à côte ou empilées : Core et Plus par région",
  "Zwei oder drei Reihen nebeneinander oder gestapelt: Core und Plus je Region"
 ],
 "Monthly totals against a budget line": [
  "Des totaux mensuels face à une ligne de budget",
  "Monatssummen gegen eine Budgetlinie"
 ],
 "Long category names (use hbar)": [
  "Des noms de catégories longs (utilisez hbar)",
  "Lange Kategorienamen (hbar verwenden)"
 ],
 "More than about 15 categories (use hbar or treemap)": [
  "Plus d'une quinzaine de catégories (utilisez hbar ou treemap)",
  "Mehr als etwa 15 Kategorien (hbar oder treemap verwenden)"
 ],
 "A long continuous trend (use line)": [
  "Une longue tendance continue (utilisez line)",
  "Ein langer, durchgehender Trend (line verwenden)"
 ],
 "Every individual deal, order or response visible, with outliers you can name": [
  "Chaque affaire, commande ou réponse visible, avec des valeurs extrêmes que l'on peut nommer",
  "Jeder einzelne Deal, Auftrag oder jede Antwort sichtbar, mit benennbaren Ausreißern"
 ],
 "Spread across a few groups in samples of tens to hundreds": [
  "La dispersion sur quelques groupes, de quelques dizaines à quelques centaines de valeurs",
  "Streuung über wenige Gruppen bei Dutzenden bis Hunderten Werten"
 ],
 "Thousands of rows (use histogram)": [
  "Des milliers de lignes (utilisez histogram)",
  "Tausende Zeilen (histogram verwenden)"
 ],
 "Totals or shares (use bar or donut)": [
  "Des totaux ou des parts (utilisez bar ou donut)",
  "Summen oder Anteile (bar oder donut verwenden)"
 ],
 "Where everything stands in a lifecycle: regulations by status, deals by stage, tickets by state": [
  "Où en est chaque élément d'un cycle de vie : réglementations par statut, affaires par étape, tickets par état",
  "Wo alles in einem Lebenszyklus steht: Regelwerke nach Status, Deals nach Phase, Tickets nach Zustand"
 ],
 "Seeing at once which stage is crowded and what is in it, by name": [
  "Voir d'un coup quelle étape est encombrée et ce qu'elle contient, nom par nom",
  "Auf einen Blick sehen, welche Phase voll ist und was darin steckt, mit Namen"
 ],
 "Amounts per stage alone (use funnel or bar)": [
  "Des montants par étape seulement (utilisez funnel ou bar)",
  "Nur Beträge je Phase (funnel oder bar verwenden)"
 ],
 "Hundreds of items (filter first, or count them into a funnel)": [
  "Des centaines d'éléments (filtrez d'abord, ou comptez-les dans un entonnoir)",
  "Hunderte Einträge (erst filtern oder in einem Trichter zählen)"
 ],
 "Stages with no natural order": [
  "Des étapes sans ordre naturel",
  "Phasen ohne natürliche Reihenfolge"
 ],
 "Comparing medians and spread across groups: deal size by region, handle time by team": [
  "Comparer médianes et dispersion entre groupes : taille des affaires par région, durée de traitement par équipe",
  "Mediane und Streuung über Gruppen vergleichen: Dealgröße je Region, Bearbeitungszeit je Team"
 ],
 "Spotting outliers in analytic reviews": [
  "Repérer les valeurs extrêmes dans les revues analytiques",
  "Ausreißer in analytischen Prüfungen erkennen"
 ],
 "Audiences who do not read quartiles (use beeswarm or ridgeline)": [
  "Des publics qui ne lisent pas les quartiles (utilisez beeswarm ou ridgeline)",
  "Publikum, das keine Quartile liest (beeswarm oder ridgeline verwenden)"
 ],
 "Fewer than about five values per group": [
  "Moins de cinq valeurs environ par groupe",
  "Weniger als etwa fünf Werte je Gruppe"
 ],
 "Totals": [
  "Des totaux",
  "Summen"
 ],
 "KPI scorecards against target in little space": [
  "Des tableaux d'indicateurs face à leur cible dans peu de place",
  "Kennzahlen-Scorecards gegen Ziel auf wenig Raum"
 ],
 "Several measures with different targets on one card": [
  "Plusieurs mesures aux cibles différentes sur une carte",
  "Mehrere Kennzahlen mit verschiedenen Zielen auf einer Karte"
 ],
 "Data with no target (use hbar)": [
  "Des données sans cible (utilisez hbar)",
  "Daten ohne Ziel (hbar verwenden)"
 ],
 "Trends over time (use line with a reference)": [
  "Des tendances dans le temps (utilisez line avec une référence)",
  "Trends im Zeitverlauf (line mit Bezugslinie verwenden)"
 ],
 "How a ranking changes over time: products, teams, channels by month": [
  "Comment un classement évolue dans le temps : produits, équipes, canaux par mois",
  "Wie sich eine Rangfolge im Zeitverlauf ändert: Produkte, Teams, Kanäle je Monat"
 ],
 "Who overtook whom": [
  "Qui a dépassé qui",
  "Wer wen überholt hat"
 ],
 "When the size of the gaps matters, as ranks hide it (use line)": [
  "Quand la taille des écarts compte, car les rangs la masquent (utilisez line)",
  "Wenn die Größe der Abstände zählt, die Ränge verbergen (line verwenden)"
 ],
 "More than about ten series, or only one period": [
  "Plus d'une dizaine de séries, ou une seule période",
  "Mehr als etwa zehn Reihen oder nur eine Periode"
 ],
 "Daily activity over months: orders, logins, incidents": [
  "L'activité quotidienne sur des mois : commandes, connexions, incidents",
  "Tägliche Aktivität über Monate: Bestellungen, Anmeldungen, Störungen"
 ],
 "Weekday and seasonal patterns, streaks and gaps": [
  "Les rythmes de la semaine et des saisons, les séries et les trous",
  "Wochentags- und Saisonmuster, Serien und Lücken"
 ],
 "Monthly or weekly data (use bar or line)": [
  "Des données mensuelles ou hebdomadaires (utilisez bar ou line)",
  "Monats- oder Wochendaten (bar oder line verwenden)"
 ],
 "Exact comparisons between days (use bar)": [
  "Des comparaisons exactes entre jours (utilisez bar)",
  "Genaue Vergleiche zwischen Tagen (bar verwenden)"
 ],
 "Prices per period: share price, exchange rates, commodity prices": [
  "Des cours par période : action, taux de change, matières premières",
  "Kurse je Periode: Aktienkurs, Wechselkurse, Rohstoffpreise"
 ],
 "Volatility and the open-to-close move in trading reports": [
  "La volatilité et l'écart ouverture-clôture dans les rapports de marché",
  "Volatilität und die Bewegung von Eröffnung zu Schluss in Marktberichten"
 ],
 "Anything without open, high, low and close (use line)": [
  "Tout ce qui n'a pas d'ouverture, de plus haut, de plus bas et de clôture (utilisez line)",
  "Alles ohne Eröffnung, Hoch, Tief und Schluss (line verwenden)"
 ],
 "Two-way flows among the same groups: customers moving between plans, trade between regions": [
  "Des flux dans les deux sens entre les mêmes groupes : clients qui changent d'offre, échanges entre régions",
  "Flüsse in beide Richtungen zwischen denselben Gruppen: Kunden, die Tarife wechseln, Handel zwischen Regionen"
 ],
 "One-way chains of stages (use sankey)": [
  "Des enchaînements d'étapes à sens unique (utilisez sankey)",
  "Einseitige Ketten von Stufen (sankey verwenden)"
 ],
 "Reading exact amounts (use table)": [
  "Lire des montants exacts (utilisez table)",
  "Genaue Beträge ablesen (table verwenden)"
 ],
 "More than about ten groups": [
  "Plus d'une dizaine de groupes",
  "Mehr als etwa zehn Gruppen"
 ],
 "An amount or a rate by country or state: revenue by country, share by state": [
  "Un montant ou un taux par pays ou par État : chiffre d'affaires par pays, part par État",
  "Ein Betrag oder eine Rate je Land oder Bundesstaat: Umsatz je Land, Anteil je Staat"
 ],
 "Seeing where something is high or low across a territory": [
  "Voir où une valeur est forte ou faible sur un territoire",
  "Sehen, wo etwas über ein Gebiet hinweg hoch oder niedrig ist"
 ],
 "Exact comparisons between regions (use hbar)": [
  "Des comparaisons exactes entre régions (utilisez hbar)",
  "Genaue Vergleiche zwischen Regionen (hbar verwenden)"
 ],
 "Totals that follow area or population, which big regions exaggerate (use a rate, or symbols)": [
  "Des totaux qui suivent la surface ou la population, que les grandes régions exagèrent (utilisez un taux, ou symbols)",
  "Summen, die Fläche oder Bevölkerung folgen und große Regionen übertreiben (eine Rate oder symbols verwenden)"
 ],
 "Rows that are not regions": [
  "Des lignes qui ne sont pas des régions",
  "Zeilen, die keine Regionen sind"
 ],
 "Share of one whole with two to five parts: revenue by segment, budget by team": [
  "La part d'un tout en deux à cinq morceaux : chiffre d'affaires par segment, budget par équipe",
  "Anteil an einem Ganzen mit zwei bis fünf Teilen: Umsatz je Segment, Budget je Team"
 ],
 "An executive summary where the total matters too": [
  "Une synthèse pour la direction, où le total compte aussi",
  "Eine Zusammenfassung für die Geschäftsleitung, in der auch die Summe zählt"
 ],
 "More than six parts or close values (use hbar)": [
  "Plus de six parts ou des valeurs proches (utilisez hbar)",
  "Mehr als sechs Teile oder nah beieinander liegende Werte (hbar verwenden)"
 ],
 "Comparing several wholes (use bar stacked to percent)": [
  "Comparer plusieurs touts (utilisez bar empilé en pourcentage)",
  "Mehrere Ganze vergleichen (bar gestapelt in Prozent verwenden)"
 ],
 "Change over time (use area)": [
  "L'évolution dans le temps (utilisez area)",
  "Veränderung im Zeitverlauf (area verwenden)"
 ],
 "Two to five measures of one kind per item: ease, value and support scores by product": [
  "Deux à cinq mesures de même nature par élément : notes de facilité, de valeur et de support par produit",
  "Zwei bis fünf gleichartige Kennzahlen je Eintrag: Bewertungen für Bedienung, Nutzen und Support je Produkt"
 ],
 "Rankings where the differences matter more than the amounts: prices, rates, scores": [
  "Des classements où les écarts comptent plus que les montants : prix, taux, notes",
  "Ranglisten, bei denen die Abstände mehr zählen als die Beträge: Preise, Raten, Bewertungen"
 ],
 "Many rows with far less ink than bars": [
  "Beaucoup de lignes avec bien moins d'encre que des barres",
  "Viele Zeilen mit weit weniger Tinte als Balken"
 ],
 "Amounts where the length from zero matters (use hbar)": [
  "Des montants où la longueur depuis zéro compte (utilisez hbar)",
  "Beträge, bei denen die Länge ab null zählt (hbar verwenden)"
 ],
 "Measures on different scales (use table or radar)": [
  "Des mesures sur des échelles différentes (utilisez table ou radar)",
  "Kennzahlen auf verschiedenen Skalen (table oder radar verwenden)"
 ],
 "Exactly a before and an after (use dumbbell)": [
  "Exactement un avant et un après (utilisez dumbbell)",
  "Genau ein Vorher und ein Nachher (dumbbell verwenden)"
 ],
 "Two measures in different units over the same periods: revenue and churn, visits and conversion rate": [
  "Deux mesures d'unités différentes sur les mêmes périodes : chiffre d'affaires et attrition, visites et taux de conversion",
  "Zwei Kennzahlen in verschiedenen Einheiten über dieselben Perioden: Umsatz und Abwanderung, Besuche und Konversionsrate"
 ],
 "Showing whether two shapes move together without a misleading second axis": [
  "Montrer si deux courbes évoluent ensemble sans second axe trompeur",
  "Zeigen, ob sich zwei Verläufe gemeinsam bewegen, ohne irreführende zweite Achse"
 ],
 "Two series in the same unit (use line, one axis)": [
  "Deux séries de même unité (utilisez line, un seul axe)",
  "Zwei Reihen in derselben Einheit (line mit einer Achse verwenden)"
 ],
 "More than two measures (use horizon or small multiples)": [
  "Plus de deux mesures (utilisez horizon ou des petits multiples)",
  "Mehr als zwei Kennzahlen (horizon oder kleine Vielfache verwenden)"
 ],
 "Before and after per item: this year against last per region, pre and post a change": [
  "Avant et après par élément : cette année face à l'an dernier par région, avant et après un changement",
  "Vorher und nachher je Eintrag: dieses Jahr gegen Vorjahr je Region, vor und nach einer Änderung"
 ],
 "Showing the size of each gap": [
  "Montrer la taille de chaque écart",
  "Die Größe jedes Abstands zeigen"
 ],
 "More than two points in time (use line)": [
  "Plus de deux dates (utilisez line)",
  "Mehr als zwei Zeitpunkte (line verwenden)"
 ],
 "Items on different scales": [
  "Des éléments sur des échelles différentes",
  "Einträge auf verschiedenen Skalen"
 ],
 "Conversion through ordered steps: visit, sign-up, trial, paid": [
  "La conversion par étapes ordonnées : visite, inscription, essai, abonnement",
  "Konversion über geordnete Schritte: Besuch, Registrierung, Test, Kauf"
 ],
 "Where most people drop out of a pipeline": [
  "Où la plupart décrochent dans un pipeline",
  "Wo die meisten aus einer Pipeline aussteigen"
 ],
 "Categories with no order (use hbar)": [
  "Des catégories sans ordre (utilisez hbar)",
  "Kategorien ohne Reihenfolge (hbar verwenden)"
 ],
 "Stages that can grow from one to the next": [
  "Des étapes qui peuvent grossir de l'une à l'autre",
  "Stufen, die von einer zur nächsten wachsen können"
 ],
 "One KPI against a goal on a known scale: NPS, utilization, SLA attainment": [
  "Un indicateur face à un objectif sur une échelle connue : NPS, taux d'occupation, respect des SLA",
  "Eine Kennzahl gegen ein Ziel auf bekannter Skala: NPS, Auslastung, SLA-Erfüllung"
 ],
 "Several values (use bullet or meter)": [
  "Plusieurs valeurs (utilisez bullet ou meter)",
  "Mehrere Werte (bullet oder meter verwenden)"
 ],
 "Trends (use kpi with series)": [
  "Des tendances (utilisez kpi avec series)",
  "Trends (kpi mit series verwenden)"
 ],
 "Small differences, which the arc hides": [
  "De petits écarts, que l'arc masque",
  "Kleine Unterschiede, die der Bogen verbirgt"
 ],
 "Rankings with long names: top features, top customers, causes": [
  "Des classements aux noms longs : fonctionnalités, clients ou causes en tête",
  "Ranglisten mit langen Namen: Top-Funktionen, Top-Kunden, Ursachen"
 ],
 "Up to about 30 categories, readable on a phone": [
  "Jusqu'à une trentaine de catégories, lisibles sur un téléphone",
  "Bis zu etwa 30 Kategorien, auf dem Telefon lesbar"
 ],
 "Two or three measures per row, side by side, stacked, or split into columns when their units differ": [
  "Deux ou trois mesures par ligne, côte à côte, empilées, ou en colonnes séparées quand leurs unités diffèrent",
  "Zwei oder drei Kennzahlen je Zeile, nebeneinander, gestapelt oder in Spalten getrennt, wenn ihre Einheiten abweichen"
 ],
 "Time order (use bar or line)": [
  "L'ordre du temps (utilisez bar ou line)",
  "Zeitliche Reihenfolge (bar oder line verwenden)"
 ],
 "Share of one whole (use donut or waffle)": [
  "La part d'un tout (utilisez donut ou waffle)",
  "Anteil an einem Ganzen (donut oder waffle verwenden)"
 ],
 "Two categories crossed: weekday by hour, region by product": [
  "Deux catégories croisées : jour par heure, région par produit",
  "Zwei gekreuzte Kategorien: Wochentag je Stunde, Region je Produkt"
 ],
 "Finding hot spots and quiet times": [
  "Trouver les points chauds et les creux",
  "Brennpunkte und ruhige Zeiten finden"
 ],
 "Exact values (use table)": [
  "Des valeurs exactes (utilisez table)",
  "Genaue Werte (table verwenden)"
 ],
 "One dimension only (use bar)": [
  "Une seule dimension (utilisez bar)",
  "Nur eine Dimension (bar verwenden)"
 ],
 "The shape of one measure: deal sizes, response times, order values": [
  "La forme d'une mesure : taille des affaires, délais de réponse, montant des commandes",
  "Die Form einer Kennzahl: Dealgrößen, Antwortzeiten, Bestellwerte"
 ],
 "Skew, clusters and the typical range": [
  "L'asymétrie, les grappes et la plage habituelle",
  "Schiefe, Häufungen und der übliche Bereich"
 ],
 "Comparing groups (use boxplot or ridgeline)": [
  "Comparer des groupes (utilisez boxplot ou ridgeline)",
  "Gruppen vergleichen (boxplot oder ridgeline verwenden)"
 ],
 "Fewer than about 20 values (use beeswarm)": [
  "Moins d'une vingtaine de valeurs (utilisez beeswarm)",
  "Weniger als etwa 20 Werte (beeswarm verwenden)"
 ],
 "A client's story: meetings, calls, trades, campaigns and complaints in one scroll": [
  "L'histoire d'un client : rendez-vous, appels, opérations, campagnes et réclamations d'un seul tenant",
  "Die Geschichte eines Kunden: Termine, Anrufe, Transaktionen, Kampagnen und Beschwerden in einem Verlauf"
 ],
 "What happened before a churn, a complaint or a big trade": [
  "Ce qui s'est passé avant un départ, une réclamation ou une grosse opération",
  "Was vor einer Abwanderung, einer Beschwerde oder einer großen Transaktion geschah"
 ],
 "Several clients' recent activity side by side": [
  "L'activité récente de plusieurs clients côte à côte",
  "Die jüngste Aktivität mehrerer Kunden nebeneinander"
 ],
 "Amounts over time, where the shape matters (use line)": [
  "Des montants dans le temps, où la forme compte (utilisez line)",
  "Beträge im Zeitverlauf, bei denen die Form zählt (line verwenden)"
 ],
 "Tasks with a start and an end (use timeline)": [
  "Des tâches avec un début et une fin (utilisez timeline)",
  "Aufgaben mit Start und Ende (timeline verwenden)"
 ],
 "Counting events per period (use bar or calendar)": [
  "Compter des événements par période (utilisez bar ou calendar)",
  "Ereignisse je Periode zählen (bar oder calendar verwenden)"
 ],
 "Many series over time in little space: six to twenty regions, servers or stores": [
  "Beaucoup de séries dans le temps sur peu de place : six à vingt régions, serveurs ou magasins",
  "Viele Reihen im Zeitverlauf auf wenig Raum: sechs bis zwanzig Regionen, Server oder Filialen"
 ],
 "Deviation from plan, day by day, in operations monitoring": [
  "L'écart au plan, jour après jour, dans le pilotage opérationnel",
  "Abweichung vom Plan, Tag für Tag, in der Betriebssteuerung"
 ],
 "General audiences and exact values (use line)": [
  "Le grand public et les valeurs exactes (utilisez line)",
  "Allgemeines Publikum und genaue Werte (line verwenden)"
 ],
 "One or two series": [
  "Une ou deux séries",
  "Eine oder zwei Reihen"
 ],
 "Deep breakdowns with long names: budget by unit, team and line": [
  "Des ventilations profondes aux noms longs : budget par entité, équipe et ligne",
  "Tiefe Aufschlüsselungen mit langen Namen: Budget je Einheit, Team und Posten"
 ],
 "Drill paths, left to right": [
  "Des chemins d'analyse, de gauche à droite",
  "Drill-down-Pfade, von links nach rechts"
 ],
 "Flat data with one level (use hbar)": [
  "Des données plates à un seul niveau (utilisez hbar)",
  "Flache Daten mit einer Ebene (hbar verwenden)"
 ],
 "Negative values": [
  "Des valeurs négatives",
  "Negative Werte"
 ],
 "One number with its change: churn this month, revenue this quarter": [
  "Un chiffre avec son évolution : l'attrition ce mois-ci, le chiffre d'affaires ce trimestre",
  "Eine Zahl mit ihrer Veränderung: Abwanderung in diesem Monat, Umsatz in diesem Quartal"
 ],
 "The top row of a dashboard": [
  "La première ligne d'un tableau de bord",
  "Die oberste Zeile eines Dashboards"
 ],
 "Comparing categories (use hbar)": [
  "Comparer des catégories (utilisez hbar)",
  "Kategorien vergleichen (hbar verwenden)"
 ],
 "Several numbers (use kpis)": [
  "Plusieurs chiffres (utilisez kpis)",
  "Mehrere Zahlen (kpis verwenden)"
 ],
 "Three to six key numbers side by side: revenue, profit, new customers, churn": [
  "Trois à six chiffres clés côte à côte : chiffre d'affaires, marge, nouveaux clients, attrition",
  "Drei bis sechs Kernzahlen nebeneinander: Umsatz, Gewinn, Neukunden, Abwanderung"
 ],
 "Breakdowns by category (use bar or table)": [
  "Des ventilations par catégorie (utilisez bar ou table)",
  "Aufschlüsselungen nach Kategorie (bar oder table verwenden)"
 ],
 "Where each regulation stands: proposed, adopted, in force, applies": [
  "Où en est chaque réglementation : proposée, adoptée, en vigueur, applicable",
  "Wo jedes Regelwerk steht: vorgeschlagen, verabschiedet, in Kraft, anwendbar"
 ],
 "What applies next, and how long since adoption": [
  "Ce qui s'applique ensuite, et depuis combien de temps elle est adoptée",
  "Was als Nächstes gilt und wie lange die Verabschiedung her ist"
 ],
 "Any multi-stage process with dates per stage: deals, hiring, product launches": [
  "Tout processus en plusieurs étapes datées : affaires, recrutements, lancements de produits",
  "Jeder mehrstufige Prozess mit Daten je Stufe: Deals, Einstellungen, Produkteinführungen"
 ],
 "One start and one end per row (use timeline)": [
  "Un début et une fin par ligne (utilisez timeline)",
  "Ein Start und ein Ende je Zeile (timeline verwenden)"
 ],
 "Stages with no dates (use funnel or table)": [
  "Des étapes sans dates (utilisez funnel ou table)",
  "Stufen ohne Daten (funnel oder table verwenden)"
 ],
 "More than about 30 rows (filter, or facet by group)": [
  "Plus d'une trentaine de lignes (filtrez, ou découpez par groupe)",
  "Mehr als etwa 30 Zeilen (filtern oder nach Gruppe aufteilen)"
 ],
 "Agree and disagree scales: employee and customer surveys": [
  "Les échelles d'accord : enquêtes auprès des salariés et des clients",
  "Zustimmungsskalen: Mitarbeiter- und Kundenbefragungen"
 ],
 "Comparing sentiment across questions": [
  "Comparer l'opinion d'une question à l'autre",
  "Stimmung über Fragen hinweg vergleichen"
 ],
 "Categories with no order from negative to positive (use bar stacked)": [
  "Des catégories sans ordre du négatif au positif (utilisez bar empilé)",
  "Kategorien ohne Reihenfolge von negativ nach positiv (bar gestapelt verwenden)"
 ],
 "Change over time: revenue, users, cost by month": [
  "L'évolution dans le temps : chiffre d'affaires, utilisateurs, coûts par mois",
  "Veränderung im Zeitverlauf: Umsatz, Nutzer, Kosten je Monat"
 ],
 "Several series compared over time": [
  "Plusieurs séries comparées dans le temps",
  "Mehrere Reihen im Zeitverlauf verglichen"
 ],
 "Progress against a target or a forecast": [
  "L'avancement face à une cible ou une prévision",
  "Fortschritt gegen ein Ziel oder eine Prognose"
 ],
 "Share of a whole (use donut or area stacked)": [
  "La part d'un tout (utilisez donut ou area empilé)",
  "Anteil an einem Ganzen (donut oder area gestapelt verwenden)"
 ],
 "Only two points in time (use slope)": [
  "Seulement deux dates (utilisez slope)",
  "Nur zwei Zeitpunkte (slope verwenden)"
 ],
 "Top-N lists where names matter more than sizes: top customers, latest deals": [
  "Des classements où les noms comptent plus que les tailles : meilleurs clients, dernières affaires",
  "Top-N-Listen, bei denen Namen mehr zählen als Größen: Top-Kunden, neueste Deals"
 ],
 "Narrow cards and phones": [
  "Les cartes étroites et les téléphones",
  "Schmale Karten und Telefone"
 ],
 "Seeing sizes at a glance (use hbar)": [
  "Voir les tailles d'un coup d'œil (utilisez hbar)",
  "Größen auf einen Blick sehen (hbar verwenden)"
 ],
 "Long lists (use table)": [
  "Les longues listes (utilisez table)",
  "Lange Listen (table verwenden)"
 ],
 "Where the offices, stores or sites are, by name": [
  "Où sont les bureaux, magasins ou sites, par leur nom",
  "Wo die Büros, Filialen oder Standorte sind, mit Namen"
 ],
 "A handful of named places for a report or a page header": [
  "Quelques lieux nommés pour un rapport ou un en-tête de page",
  "Eine Handvoll benannter Orte für einen Bericht oder einen Seitenkopf"
 ],
 "Amounts per place (use symbols)": [
  "Des montants par lieu (utilisez symbols)",
  "Beträge je Ort (symbols verwenden)"
 ],
 "More than about 30 places, where names collide (use symbols or a table)": [
  "Plus d'une trentaine de lieux, où les noms se chevauchent (utilisez symbols ou un tableau)",
  "Mehr als etwa 30 Orte, wo Namen kollidieren (symbols oder eine Tabelle verwenden)"
 ],
 "Market maps: how big each segment is and how it splits (region by product)": [
  "Les cartes de marché : la taille de chaque segment et sa répartition (région par produit)",
  "Marktkarten: wie groß jedes Segment ist und wie es sich aufteilt (Region je Produkt)"
 ],
 "Sizing opportunities in strategy reviews": [
  "Dimensionner les opportunités dans les revues stratégiques",
  "Chancen in Strategieprüfungen beziffern"
 ],
 "Many small segments": [
  "Beaucoup de petits segments",
  "Viele kleine Segmente"
 ],
 "Precise values (use table)": [
  "Des valeurs précises (utilisez table)",
  "Genaue Werte (table verwenden)"
 ],
 "Audiences new to mosaics (use bar stacked)": [
  "Les publics qui découvrent les mosaïques (utilisez bar empilé)",
  "Publikum, das Mosaikdiagramme nicht kennt (bar gestapelt verwenden)"
 ],
 "Regulatory pressure per topic per quarter: how many new obligations, how hard they bite": [
  "La pression réglementaire par thème et par trimestre : combien de nouvelles obligations, et quel poids",
  "Regulatorischer Druck je Thema und Quartal: wie viele neue Pflichten und wie stark sie greifen"
 ],
 "Who must comply with which rule: one square per yes": [
  "Qui doit appliquer quelle règle : un carré par oui",
  "Wer welche Regel erfüllen muss: ein Quadrat je Ja"
 ],
 "Any two categories crossed, where a heatmap's shade alone says too little": [
  "Deux catégories croisées, quand la seule teinte d'une heatmap en dit trop peu",
  "Zwei gekreuzte Kategorien, wo die Tönung einer Heatmap allein zu wenig sagt"
 ],
 "One category only (use hbar or dot)": [
  "Une seule catégorie (utilisez hbar ou dot)",
  "Nur eine Kategorie (hbar oder dot verwenden)"
 ],
 "Exact values to read off (use table with heat cells)": [
  "Des valeurs exactes à lire (utilisez table avec des cellules teintées)",
  "Genaue Werte zum Ablesen (table mit eingefärbten Zellen verwenden)"
 ],
 "More than about 24 columns or 30 rows": [
  "Plus de 24 colonnes ou de 30 lignes environ",
  "Mehr als etwa 24 Spalten oder 30 Zeilen"
 ],
 "Progress to target per item: quota attainment by region, OKRs, fundraising": [
  "L'avancement vers la cible par élément : quotas par région, OKR, levée de fonds",
  "Fortschritt zum Ziel je Eintrag: Quotenerfüllung je Region, OKRs, Fundraising"
 ],
 "The few causes behind most of a total: ticket causes, defects, returns, costs": [
  "Les quelques causes derrière l'essentiel d'un total : motifs de tickets, défauts, retours, coûts",
  "Die wenigen Ursachen hinter dem Großteil einer Summe: Ticketursachen, Mängel, Retouren, Kosten"
 ],
 "Deciding where to act first": [
  "Décider où agir en premier",
  "Entscheiden, wo zuerst gehandelt wird"
 ],
 "Time order (use bar)": [
  "L'ordre du temps (utilisez bar)",
  "Zeitliche Reihenfolge (bar verwenden)"
 ],
 "Fewer than four categories": [
  "Moins de quatre catégories",
  "Weniger als vier Kategorien"
 ],
 "Share of one whole with two to five parts, where the shares themselves are the point: votes, market share": [
  "La part d'un tout en deux à cinq morceaux, quand les parts sont le propos : votes, parts de marché",
  "Anteil an einem Ganzen mit zwei bis fünf Teilen, wenn die Anteile selbst die Aussage sind: Stimmen, Marktanteil"
 ],
 "Small multiples of one split per group (facet), the same part in the same color everywhere": [
  "Des petits multiples d'une même répartition par groupe (facet), la même part de la même couleur partout",
  "Kleine Vielfache derselben Aufteilung je Gruppe (facet), derselbe Teil überall in derselben Farbe"
 ],
 "When the total matters too (use donut)": [
  "Quand le total compte aussi (utilisez donut)",
  "Wenn auch die Summe zählt (donut verwenden)"
 ],
 "Two groups across ordered bands: women and men by age group, new and returning customers by tenure": [
  "Deux groupes sur des tranches ordonnées : femmes et hommes par âge, clients nouveaux et fidèles par ancienneté",
  "Zwei Gruppen über geordnete Bänder: Frauen und Männer nach Altersgruppe, neue und wiederkehrende Kunden nach Kundendauer"
 ],
 "Seeing where two groups differ, from the shape alone": [
  "Voir où deux groupes diffèrent, par la seule forme",
  "Allein an der Form sehen, wo sich zwei Gruppen unterscheiden"
 ],
 "More than two groups (use hbar with several values)": [
  "Plus de deux groupes (utilisez hbar avec plusieurs valeurs)",
  "Mehr als zwei Gruppen (hbar mit mehreren Werten verwenden)"
 ],
 "Bands with no natural order (use hbar)": [
  "Des tranches sans ordre naturel (utilisez hbar)",
  "Bänder ohne natürliche Reihenfolge (hbar verwenden)"
 ],
 "Measures in different units": [
  "Des mesures d'unités différentes",
  "Kennzahlen in verschiedenen Einheiten"
 ],
 "Profiles across four to ten attributes on one scale: product against market, skills": [
  "Des profils sur quatre à dix critères d'une même échelle : produit face au marché, compétences",
  "Profile über vier bis zehn Merkmale auf einer Skala: Produkt gegen Markt, Kompetenzen"
 ],
 "Attributes in different units": [
  "Des critères d'unités différentes",
  "Merkmale in verschiedenen Einheiten"
 ],
 "More than three shapes": [
  "Plus de trois formes",
  "Mehr als drei Formen"
 ],
 "Rankings (use hbar)": [
  "Des classements (utilisez hbar)",
  "Ranglisten (hbar verwenden)"
 ],
 "A RAG scorecard: client health, coverage, pipeline and relationship status per client or per relationship manager": [
  "Un tableau RAG : santé client, couverture, pipeline et relation par client ou par chargé de clientèle",
  "Eine RAG-Scorecard: Kundengesundheit, Abdeckung, Pipeline und Beziehungsstatus je Kunde oder Betreuer"
 ],
 "Which accounts need action first, and on what": [
  "Quels comptes demandent une action en premier, et sur quoi",
  "Welche Kunden zuerst Handlungsbedarf haben, und wobei"
 ],
 "Status reviews where each cell is a judgment, not an amount": [
  "Les revues de statut où chaque cellule est un jugement, pas un montant",
  "Statusbesprechungen, in denen jede Zelle ein Urteil ist, kein Betrag"
 ],
 "Amounts and trends (use table with heat cells, or line)": [
  "Des montants et des tendances (utilisez table avec des cellules teintées, ou line)",
  "Beträge und Trends (table mit eingefärbten Zellen oder line verwenden)"
 ],
 "One status over many periods (use ragtrend)": [
  "Un seul statut sur de nombreuses périodes (utilisez ragtrend)",
  "Ein Status über viele Perioden (ragtrend verwenden)"
 ],
 "More than about 40 rows (filter to the ones that need attention)": [
  "Plus d'une quarantaine de lignes (filtrez sur celles qui demandent attention)",
  "Mehr als etwa 40 Zeilen (auf die mit Handlungsbedarf filtern)"
 ],
 "How each client's or deal's status moved, review by review": [
  "Comment le statut de chaque client ou affaire a bougé, revue après revue",
  "Wie sich der Status jedes Kunden oder Deals von Prüfung zu Prüfung bewegt hat"
 ],
 "Spotting who slipped recently, and reading why": [
  "Repérer qui a glissé récemment, et lire pourquoi",
  "Erkennen, wer zuletzt abgerutscht ist, und lesen, warum"
 ],
 "Monthly or quarterly RAG reporting with a history": [
  "Le reporting RAG mensuel ou trimestriel avec son historique",
  "Monatliches oder quartalsweises RAG-Reporting mit Verlauf"
 ],
 "Several dimensions at one moment (use ragboard)": [
  "Plusieurs dimensions à un instant donné (utilisez ragboard)",
  "Mehrere Dimensionen zu einem Zeitpunkt (ragboard verwenden)"
 ],
 "Numbers rather than statuses (use line or horizon)": [
  "Des nombres plutôt que des statuts (utilisez line ou horizon)",
  "Zahlen statt Status (line oder horizon verwenden)"
 ],
 "More than about 24 periods (roll them up)": [
  "Plus de 24 périodes environ (regroupez-les)",
  "Mehr als etwa 24 Perioden (zusammenfassen)"
 ],
 "Comparing distribution shapes across many groups: deal size by region, latency by month": [
  "Comparer des formes de distribution sur de nombreux groupes : taille des affaires par région, latence par mois",
  "Verteilungsformen über viele Gruppen vergleichen: Dealgröße je Region, Latenz je Monat"
 ],
 "Few values per group (use beeswarm)": [
  "Peu de valeurs par groupe (utilisez beeswarm)",
  "Wenige Werte je Gruppe (beeswarm verwenden)"
 ],
 "Exact statistics (use boxplot)": [
  "Des statistiques exactes (utilisez boxplot)",
  "Genaue Statistiken (boxplot verwenden)"
 ],
 "Progress on one to four goals in a compact tile: activity, product targets": [
  "L'avancement d'un à quatre objectifs dans une tuile compacte : activité, objectifs produits",
  "Fortschritt bei einem bis vier Zielen in einer kompakten Kachel: Aktivität, Produktziele"
 ],
 "More than four goals (use meter)": [
  "Plus de quatre objectifs (utilisez meter)",
  "Mehr als vier Ziele (meter verwenden)"
 ],
 "Comparing sizes, as inner rings are shorter": [
  "Comparer des tailles, car les anneaux intérieurs sont plus courts",
  "Größen vergleichen, da innere Ringe kürzer sind"
 ],
 "Cycles that wrap round: hours of the day, months of the year, directions": [
  "Les cycles qui bouclent : heures de la journée, mois de l'année, directions",
  "Zyklen, die sich schließen: Tageszeiten, Monate des Jahres, Himmelsrichtungen"
 ],
 "Categories with no cycle (use bar)": [
  "Des catégories sans cycle (utilisez bar)",
  "Kategorien ohne Zyklus (bar verwenden)"
 ],
 "Precise comparisons": [
  "Des comparaisons précises",
  "Genaue Vergleiche"
 ],
 "Flows through stages: traffic source to page to outcome, budget to spend": [
  "Des flux à travers des étapes : source de trafic, page, résultat ; budget vers dépense",
  "Flüsse durch Stufen: Trafficquelle zu Seite zu Ergebnis, Budget zu Ausgabe"
 ],
 "Where volume goes and where it is lost": [
  "Où va le volume et où il se perd",
  "Wohin das Volumen geht und wo es verloren geht"
 ],
 "Flows that loop back between the same groups (use chord)": [
  "Des flux qui reviennent entre les mêmes groupes (utilisez chord)",
  "Flüsse, die zwischen denselben Gruppen zurückfließen (chord verwenden)"
 ],
 "Many tiny flows": [
  "De nombreux flux minuscules",
  "Viele winzige Flüsse"
 ],
 "Whether two measures move together: growth and margin, price and volume": [
  "Si deux mesures évoluent ensemble : croissance et marge, prix et volume",
  "Ob sich zwei Kennzahlen gemeinsam bewegen: Wachstum und Marge, Preis und Menge"
 ],
 "Segments and quadrants, and the accounts that stand out": [
  "Des segments et des quadrants, et les comptes qui se détachent",
  "Segmente und Quadranten und die Kunden, die herausstechen"
 ],
 "One measure only (use histogram)": [
  "Une seule mesure (utilisez histogram)",
  "Nur eine Kennzahl (histogram verwenden)"
 ],
 "Trends over time (use line)": [
  "Des tendances dans le temps (utilisez line)",
  "Trends im Zeitverlauf (line verwenden)"
 ],
 "Two points in time: H1 against H2, last year against this": [
  "Deux dates : S1 face à S2, l'an dernier face à cette année",
  "Zwei Zeitpunkte: H1 gegen H2, Vorjahr gegen dieses Jahr"
 ],
 "Seeing who rose, who fell and who swapped places": [
  "Voir qui a monté, qui a baissé et qui a changé de place",
  "Sehen, wer gestiegen, wer gefallen ist und wer die Plätze getauscht hat"
 ],
 "More than two periods (use line or bump)": [
  "Plus de deux périodes (utilisez line ou bump)",
  "Mehr als zwei Perioden (line oder bump verwenden)"
 ],
 "More than about 15 items, where lines tangle (use dumbbell)": [
  "Plus d'une quinzaine d'éléments, où les lignes s'emmêlent (utilisez dumbbell)",
  "Mehr als etwa 15 Einträge, wo sich Linien verheddern (dumbbell verwenden)"
 ],
 "How many provisions each regulation has and how many are binding (mandatory, recommended, optional)": [
  "Combien de dispositions compte chaque réglementation et combien sont contraignantes (obligatoires, recommandées, facultatives)",
  "Wie viele Bestimmungen jedes Regelwerk hat und wie viele verbindlich sind (verpflichtend, empfohlen, optional)"
 ],
 "Density: provisions per page, when per is set": [
  "La densité : dispositions par page, quand per est donné",
  "Dichte: Bestimmungen je Seite, wenn per gesetzt ist"
 ],
 "Counts people can see as things, not lengths": [
  "Des décomptes que l'on voit comme des objets, pas des longueurs",
  "Anzahlen, die man als Dinge sieht, nicht als Längen"
 ],
 "Amounts that are not counts, such as money (use hbar stacked)": [
  "Des montants qui ne sont pas des décomptes, comme de l'argent (utilisez hbar empilé)",
  "Beträge, die keine Anzahlen sind, etwa Geld (hbar gestapelt verwenden)"
 ],
 "More than about 20 rows (use hbar stacked)": [
  "Plus d'une vingtaine de lignes (utilisez hbar empilé)",
  "Mehr als etwa 20 Zeilen (hbar gestapelt verwenden)"
 ],
 "Shares of one whole across items (use waffle or donut)": [
  "Des parts d'un même tout réparties sur des éléments (utilisez waffle ou donut)",
  "Anteile an einem Ganzen über Einträge hinweg (waffle oder donut verwenden)"
 ],
 "Two or three level part-to-whole: revenue by product, then region": [
  "La partie du tout sur deux ou trois niveaux : chiffre d'affaires par produit, puis par région",
  "Teil eines Ganzen über zwei oder drei Ebenen: Umsatz je Produkt, dann je Region"
 ],
 "An overview that invites a closer look": [
  "Une vue d'ensemble qui invite à regarder de plus près",
  "Ein Überblick, der zum genaueren Hinsehen einlädt"
 ],
 "Precise comparisons (use icicle or hbar)": [
  "Des comparaisons précises (utilisez icicle ou hbar)",
  "Genaue Vergleiche (icicle oder hbar verwenden)"
 ],
 "Deep levels with long names (use icicle)": [
  "Des niveaux profonds aux noms longs (utilisez icicle)",
  "Tiefe Ebenen mit langen Namen (icicle verwenden)"
 ],
 "Counts and totals by place where the size itself matters: customers by state, volume by port": [
  "Des décomptes et totaux par lieu où la taille compte : clients par État, volume par port",
  "Anzahlen und Summen je Ort, wo die Größe selbst zählt: Kunden je Staat, Volumen je Hafen"
 ],
 "Several kinds of place on one map, told apart by color": [
  "Plusieurs types de lieux sur une carte, distingués par la couleur",
  "Mehrere Arten von Orten auf einer Karte, nach Farbe unterschieden"
 ],
 "Rates and shares (use choropleth)": [
  "Des taux et des parts (utilisez choropleth)",
  "Raten und Anteile (choropleth verwenden)"
 ],
 "Hundreds of overlapping places (sum them by region first)": [
  "Des centaines de lieux qui se chevauchent (additionnez-les d'abord par région)",
  "Hunderte sich überlagernde Orte (erst je Region summieren)"
 ],
 "Exact values, many columns, audit and export": [
  "Des valeurs exactes, de nombreuses colonnes, l'audit et l'export",
  "Genaue Werte, viele Spalten, Prüfung und Export"
 ],
 "Data people will look up rather than scan": [
  "Des données que l'on consulte plutôt qu'on ne les parcourt",
  "Daten, in denen man nachschlägt statt sie zu überfliegen"
 ],
 "Seeing a pattern at a glance (use any chart)": [
  "Voir un motif d'un coup d'œil (utilisez n'importe quel graphique)",
  "Ein Muster auf einen Blick sehen (ein beliebiges Diagramm verwenden)"
 ],
 "Project plans, launch phases and milestones": [
  "Plans de projet, phases de lancement et jalons",
  "Projektpläne, Einführungsphasen und Meilensteine"
 ],
 "What is late or running now": [
  "Ce qui est en retard ou en cours",
  "Was verspätet ist oder gerade läuft"
 ],
 "Quantities (use bar)": [
  "Des quantités (utilisez bar)",
  "Mengen (bar verwenden)"
 ],
 "Many parts of one whole: revenue by customer, spend by vendor": [
  "Les nombreuses parts d'un tout : chiffre d'affaires par client, dépenses par fournisseur",
  "Viele Teile eines Ganzen: Umsatz je Kunde, Ausgaben je Lieferant"
 ],
 "Portfolios grouped by segment": [
  "Des portefeuilles regroupés par segment",
  "Portfolios nach Segment gruppiert"
 ],
 "Two or three parts (use donut)": [
  "Deux ou trois parts (utilisez donut)",
  "Zwei oder drei Teile (donut verwenden)"
 ],
 "Precise comparisons (use hbar)": [
  "Des comparaisons précises (utilisez hbar)",
  "Genaue Vergleiche (hbar verwenden)"
 ],
 "Budget against actual per line item": [
  "Le budget face au réel par poste",
  "Budget gegen Ist je Posten"
 ],
 "Financial variance reports where the sign and size of each miss matter": [
  "Les rapports d'écarts financiers où le signe et la taille de chaque écart comptent",
  "Finanzielle Abweichungsberichte, bei denen Vorzeichen und Größe jeder Abweichung zählen"
 ],
 "Data with no plan or budget (use hbar)": [
  "Des données sans plan ni budget (utilisez hbar)",
  "Daten ohne Plan oder Budget (hbar verwenden)"
 ],
 "One share people grasp at once: 37% of revenue is online": [
  "Une part que l'on saisit d'emblée : 37 % du chiffre d'affaires est en ligne",
  "Ein Anteil, den man sofort erfasst: 37 % des Umsatzes kommen online"
 ],
 "Two to five parts for a general audience": [
  "Deux à cinq parts pour le grand public",
  "Zwei bis fünf Teile für ein allgemeines Publikum"
 ],
 "Many parts or shares under 1%": [
  "De nombreuses parts ou des parts sous 1 %",
  "Viele Teile oder Anteile unter 1 %"
 ],
 "Bridges: what took revenue from Q2 to Q3, a profit and loss walk": [
  "Les ponts : ce qui a fait passer le chiffre d'affaires de T2 à T3, un compte de résultat pas à pas",
  "Brücken: was den Umsatz von Q2 nach Q3 gebracht hat, eine GuV-Überleitung"
 ],
 "Explaining a move from a start to an end": [
  "Expliquer un passage d'un début à une fin",
  "Einen Weg von einem Anfang zu einem Ende erklären"
 ],
 "Amounts that are not changes to one total (use bar)": [
  "Des montants qui ne sont pas des variations d'un même total (utilisez bar)",
  "Beträge, die keine Veränderungen einer Summe sind (bar verwenden)"
 ],
 "Cross-sell and upsell: which clients could take which products, and where to start": [
  "Ventes croisées et montées en gamme : quels clients pourraient prendre quels produits, et par où commencer",
  "Cross- und Upselling: welche Kunden welche Produkte nehmen könnten und wo man anfängt"
 ],
 "Product penetration across a book, with the money still on the table": [
  "La pénétration des produits sur un portefeuille, avec l'argent encore sur la table",
  "Produktdurchdringung über einen Bestand, mit dem noch offenen Geld"
 ],
 "A relationship manager's weekly whitespace review": [
  "La revue hebdomadaire des opportunités d'un chargé de clientèle",
  "Die wöchentliche Whitespace-Prüfung eines Kundenbetreuers"
 ],
 "Amounts without a held, open or not eligible state (use heatmap)": [
  "Des montants sans état détenu, ouvert ou non éligible (utilisez heatmap)",
  "Beträge ohne Status gehalten, offen oder nicht berechtigt (heatmap verwenden)"
 ],
 "More than about 16 products or 30 clients at once (filter or group first)": [
  "Plus d'une quinzaine de produits ou d'une trentaine de clients à la fois (filtrez ou regroupez d'abord)",
  "Mehr als etwa 16 Produkte oder 30 Kunden auf einmal (erst filtern oder gruppieren)"
 ],
 "One client alone (use xray)": [
  "Un client seul (utilisez xray)",
  "Ein einzelner Kunde (xray verwenden)"
 ],
 "One client on one card: a pre-meeting brief, a client page, a relationship manager's cockpit": [
  "Un client sur une carte : brief avant rendez-vous, page client, cockpit d'un chargé de clientèle",
  "Ein Kunde auf einer Karte: Briefing vor dem Termin, Kundenseite, Cockpit eines Betreuers"
 ],
 "Seeing holdings, share of wallet, trend and next steps at one glance": [
  "Voir d'un coup d'œil produits détenus, part de portefeuille, tendance et prochaines étapes",
  "Gehaltene Produkte, Wallet-Anteil, Trend und nächste Schritte auf einen Blick"
 ],
 "Several clients (use whitespace or table)": [
  "Plusieurs clients (utilisez whitespace ou table)",
  "Mehrere Kunden (whitespace oder table verwenden)"
 ],
 "One number alone (use kpi)": [
  "Un seul chiffre (utilisez kpi)",
  "Eine einzelne Zahl (kpi verwenden)"
 ],
 "A history of events (use history)": [
  "Un historique d'événements (utilisez history)",
  "Ein Verlauf von Ereignissen (history verwenden)"
 ]
};

/** How each chart is built, by its English. */
export const GUIDE_BUILDS: Record<string, Pair> = {
 "One lane per metric over the shared time axis, each on its own scale: the expected band as a faint fill, the expected value as a hairline, the actual as a line, flagged readings as alert dots; lanes sorted by how many were flagged.": [
  "Un couloir par mesure sur l'axe du temps commun, chacun à sa propre échelle : la bande attendue en aplat pâle, la valeur attendue en trait fin, le réel en ligne, les relevés signalés en points d'alerte ; les couloirs sont classés par nombre de signalements.",
  "Eine Bahn je Kennzahl auf der gemeinsamen Zeitachse, jede auf eigener Skala: das erwartete Band als blasse Fläche, der erwartete Wert als feine Linie, der Istwert als Linie, markierte Werte als Warnpunkte; die Bahnen nach Zahl der Markierungen sortiert."
 ],
 "One point per row at x (in date order) and y; the area under the line is filled down to zero. Several y fields stack or overlap; a forecast field continues the line dashed, and a band (low, high) shades a range.": [
  "Un point par ligne en x (dans l'ordre des dates) et y ; l'aire sous la ligne est remplie jusqu'à zéro. Plusieurs champs y s'empilent ou se superposent ; un champ de prévision prolonge la ligne en pointillé, et une bande (low, high) grise une plage.",
  "Ein Punkt je Zeile bei x (in Datumsreihenfolge) und y; die Fläche unter der Linie ist bis null gefüllt. Mehrere y-Felder stapeln oder überlagern sich; ein Prognosefeld setzt die Linie gestrichelt fort, und ein Band (low, high) schattiert eine Spanne."
 ],
 "One bar per row at x, as tall as y. Several y fields make grouped bars, or stacked ones with stacked (percent for shares); a lines field draws a line such as a target across the bars.": [
  "Une barre par ligne en x, aussi haute que y. Plusieurs champs y donnent des barres groupées, ou empilées avec stacked (percent pour des parts) ; un champ lines trace une ligne, comme une cible, en travers des barres.",
  "Ein Balken je Zeile bei x, so hoch wie y. Mehrere y-Felder ergeben gruppierte Balken oder mit stacked gestapelte (percent für Anteile); ein lines-Feld zieht eine Linie, etwa ein Ziel, über die Balken."
 ],
 "One dot per row along the value axis, nudged apart so none overlap; a group field gives each group its own row, and a label field names each dot on hover.": [
  "Un point par ligne le long de l'axe des valeurs, écarté pour qu'aucun ne se chevauche ; un champ group donne à chaque groupe sa ligne, et un champ label nomme chaque point au survol.",
  "Ein Punkt je Zeile entlang der Werteachse, so auseinandergeschoben, dass sich keiner überlagert; ein group-Feld gibt jeder Gruppe eine eigene Zeile, ein label-Feld benennt jeden Punkt beim Überfahren."
 ],
 "One column per stage (in the order of stages, or of first appearance) headed by its count, and one card per row in its stage's column, with a group dot, a value and a detail line when those fields are given.": [
  "Une colonne par étape (dans l'ordre de stages, ou d'apparition) coiffée de son décompte, et une carte par ligne dans la colonne de son étape, avec un point de groupe, une valeur et une ligne de détail quand ces champs sont donnés.",
  "Eine Spalte je Phase (in der Reihenfolge von stages oder des Auftretens) mit ihrer Anzahl im Kopf und eine Karte je Zeile in der Spalte ihrer Phase, mit Gruppenpunkt, Wert und Detailzeile, wenn diese Felder angegeben sind."
 ],
 "Rows are grouped by group; each group's values give a box from the first to the third quartile, a line at the median, whiskers and outlier dots.": [
  "Les lignes sont regroupées par group ; les valeurs de chaque groupe donnent une boîte du premier au troisième quartile, un trait à la médiane, des moustaches et des points extrêmes.",
  "Die Zeilen werden nach group gruppiert; die Werte jeder Gruppe ergeben einen Kasten vom ersten bis zum dritten Quartil, eine Linie beim Median, Antennen und Ausreißerpunkte."
 ],
 "One compact row per row: a bar to value, a tick at target, over bands for poor, fair and good.": [
  "Une ligne compacte par ligne : une barre jusqu'à value, un trait à target, sur des bandes faible, moyen et bon.",
  "Eine kompakte Zeile je Zeile: ein Balken bis value, ein Strich bei target, über Bändern für schwach, mittel und gut."
 ],
 "Rows are one per period and series; in each period the series are ranked by value and each series is a line through its ranks.": [
  "Une ligne par période et par série ; à chaque période, les séries sont classées par value et chaque série est une ligne qui suit ses rangs.",
  "Eine Zeile je Periode und Reihe; in jeder Periode werden die Reihen nach value gerankt, und jede Reihe ist eine Linie durch ihre Ränge."
 ],
 "One cell per day (weeks as columns from Monday), shaded by value on one scale.": [
  "Une cellule par jour (les semaines en colonnes, du lundi), teintée par value sur une seule échelle.",
  "Eine Zelle je Tag (Wochen als Spalten ab Montag), nach value auf einer Skala eingefärbt."
 ],
 "One candle per row: a wick from low to high and a body from open to close, colored up or down; an optional moving average line.": [
  "Une bougie par ligne : une mèche du plus bas au plus haut et un corps de l'ouverture à la clôture, en couleur de hausse ou de baisse ; une moyenne mobile en option.",
  "Eine Kerze je Zeile: ein Docht vom Tief zum Hoch und ein Körper von Eröffnung bis Schluss, in Steig- oder Fallfarbe; optional eine gleitende Durchschnittslinie."
 ],
 "Each group is an arc as long as everything it sends and receives; each row is a ribbon from source to target, as thick as value.": [
  "Chaque groupe est un arc aussi long que tout ce qu'il envoie et reçoit ; chaque ligne est un ruban de source à target, aussi épais que value.",
  "Jede Gruppe ist ein Bogen, so lang wie alles, was sie sendet und empfängt; jede Zeile ist ein Band von source zu target, so dick wie value."
 ],
 "One region per row, matched by its code to the basemap (a built-in tile grid or your GeoJSON), shaded on a seven-step scale from the lowest value to the highest; regions with no row stay grey.": [
  "Une région par ligne, reliée par son code au fond de carte (une grille de tuiles intégrée ou votre GeoJSON), teintée sur une échelle en sept pas de la plus basse valeur à la plus haute ; les régions sans ligne restent grises.",
  "Eine Region je Zeile, über ihr Kürzel der Grundkarte zugeordnet (ein eingebautes Kachelraster oder Ihr GeoJSON), auf einer siebenstufigen Skala vom niedrigsten zum höchsten Wert eingefärbt; Regionen ohne Zeile bleiben grau."
 ],
 "One slice per row, its angle its share of the sum of value, with the total in the middle.": [
  "Une part par ligne, son angle étant sa part de la somme de value, avec le total au centre.",
  "Ein Segment je Zeile, sein Winkel sein Anteil an der Summe von value, mit der Summe in der Mitte."
 ],
 "One row per data row with a hairline across and one dot per values field at its value on one shared axis; one field writes its value beside the dot, several take series colors.": [
  "Une ligne par ligne de données avec un trait fin en travers et un point par champ de values à sa valeur sur un axe commun ; un seul champ écrit sa valeur près du point, plusieurs prennent les couleurs de séries.",
  "Eine Zeile je Datenzeile mit einer feinen Linie quer und einem Punkt je values-Feld bei seinem Wert auf einer gemeinsamen Achse; ein einzelnes Feld schreibt seinen Wert neben den Punkt, mehrere nehmen Reihenfarben."
 ],
 "Two panels one above the other sharing the x axis: y on the top panel and y2 on the bottom, each on its own scale, drawn as bars (from zero) or lines.": [
  "Deux panneaux l'un sur l'autre partageant l'axe x : y en haut et y2 en bas, chacun à son échelle, tracés en barres (depuis zéro) ou en lignes.",
  "Zwei Felder übereinander mit gemeinsamer x-Achse: y oben und y2 unten, jedes auf eigener Skala, als Balken (ab null) oder Linien."
 ],
 "One line per row from its from value (muted dot) to its to value (accent dot) on one shared axis.": [
  "Une ligne par ligne, de sa valeur from (point discret) à sa valeur to (point accentué), sur un axe commun.",
  "Eine Linie je Zeile von ihrem from-Wert (gedämpfter Punkt) zu ihrem to-Wert (Akzentpunkt) auf einer gemeinsamen Achse."
 ],
 "One stage per row, in row order, as centered bars as wide as value, with the rate from each stage to the next.": [
  "Une étape par ligne, dans l'ordre, en barres centrées aussi larges que value, avec le taux de passage d'une étape à la suivante.",
  "Eine Stufe je Zeile, in Zeilenreihenfolge, als zentrierte Balken so breit wie value, mit der Quote von jeder Stufe zur nächsten."
 ],
 "The first row's value fills a half-circle from min to max, with a tick at target and the number in the middle.": [
  "La valeur de la première ligne remplit un demi-cercle de min à max, avec un trait à target et le nombre au centre.",
  "Der Wert der ersten Zeile füllt einen Halbkreis von min bis max, mit einem Strich bei target und der Zahl in der Mitte."
 ],
 "One horizontal bar per row, label on the left and value at the end, sorted as given or by value. Several value fields draw one thin bar each per row, stacked into one bar with stacked (percent for shares), or in one column per field with split.": [
  "Une barre horizontale par ligne, le libellé à gauche et la valeur au bout, dans l'ordre donné ou par valeur. Plusieurs champs de valeur tracent chacun une barre fine par ligne, empilées en une avec stacked (percent pour des parts), ou une colonne par champ avec split.",
  "Ein waagrechter Balken je Zeile, Bezeichnung links und Wert am Ende, in angegebener Reihenfolge oder nach Wert. Mehrere Wertfelder zeichnen je Zeile einen dünnen Balken pro Feld, mit stacked zu einem gestapelt (percent für Anteile) oder mit split in einer Spalte je Feld."
 ],
 "One cell per row at x and y, shaded by value on one scale from light (low) to dark (high).": [
  "Une cellule par ligne en x et y, teintée par value sur une seule échelle, du clair (bas) au foncé (haut).",
  "Eine Zelle je Zeile bei x und y, nach value auf einer Skala von hell (niedrig) bis dunkel (hoch) eingefärbt."
 ],
 "The range of value is cut into bins on round edges; each bar counts the rows in its bin.": [
  "L'étendue de value est découpée en classes aux bornes rondes ; chaque barre compte les lignes de sa classe.",
  "Die Spanne von value wird in Klassen mit runden Grenzen geteilt; jeder Balken zählt die Zeilen seiner Klasse."
 ],
 "One event per row sorted by date, newest first, each a dot colored by kind on a vertical rail with its date, title, note and amount; the month is written where it changes, and a group field makes one rail per value.": [
  "Un événement par ligne trié par date, le plus récent d'abord, chacun un point coloré par type sur un rail vertical avec sa date, son titre, sa note et son montant ; le mois s'écrit quand il change, et un champ group fait un rail par valeur.",
  "Ein Ereignis je Zeile nach Datum sortiert, neuestes zuerst, jedes ein nach Art gefärbter Punkt auf einer senkrechten Schiene mit Datum, Titel, Notiz und Betrag; der Monat steht, wo er wechselt, und ein group-Feld macht eine Schiene je Wert."
 ],
 "One thin row per y field; each value is measured from a baseline and folded into bands of deepening color, blue above and red below.": [
  "Une ligne fine par champ y ; chaque valeur se mesure depuis une base et se replie en bandes de couleur de plus en plus soutenue, bleu au-dessus et rouge en dessous.",
  "Eine dünne Zeile je y-Feld; jeder Wert wird von einer Grundlinie aus gemessen und in Bänder zunehmend kräftiger Farbe gefaltet, blau darüber und rot darunter."
 ],
 "A column for the total, then one per level; each child splits its parent's height by the sum of value.": [
  "Une colonne pour le total, puis une par niveau ; chaque enfant partage la hauteur de son parent selon la somme de value.",
  "Eine Spalte für die Summe, dann eine je Ebene; jedes Kind teilt die Höhe seines Elternteils nach der Summe von value."
 ],
 "The last row's value, large, with its change against the row before (or compare); with series, every row draws a small trend.": [
  "La valeur de la dernière ligne, en grand, avec son évolution face à la ligne d'avant (ou compare) ; avec series, toutes les lignes tracent une petite tendance.",
  "Der Wert der letzten Zeile, groß, mit seiner Veränderung gegenüber der Zeile davor (oder compare); mit series zeichnen alle Zeilen einen kleinen Trend."
 ],
 "One tile per item, each the last row's value of its field with its change; with series, each tile draws its trend.": [
  "Une tuile par élément, chacune la valeur de la dernière ligne de son champ avec son évolution ; avec series, chaque tuile trace sa tendance.",
  "Eine Kachel je Eintrag, jede mit dem Wert der letzten Zeile ihres Felds und seiner Veränderung; mit series zeichnet jede Kachel ihren Trend."
 ],
 "One row per data row on a shared date axis: from each stage's date to the next a segment in a deepening tint, a tick at every date, a faint run from the last known stage to the edge when the next date is missing, a today line, and a status pill at the end; impact sets the row's thickness.": [
  "Une ligne par ligne de données sur un axe de dates commun : d'une date d'étape à la suivante, un segment de teinte plus soutenue, un trait à chaque date, une traîne pâle de la dernière étape connue au bord quand la date suivante manque, une ligne du jour, et une pastille de statut au bout ; impact fixe l'épaisseur de la ligne.",
  "Eine Zeile je Datenzeile auf einer gemeinsamen Datumsachse: vom Datum jeder Phase zum nächsten ein Segment in kräftigerer Tönung, ein Strich bei jedem Datum, ein blasser Auslauf von der letzten bekannten Phase zum Rand, wenn das nächste Datum fehlt, eine Heute-Linie und eine Statuspille am Ende; impact bestimmt die Dicke der Zeile."
 ],
 "One bar per row (a question); its response fields, in order from one pole to the other, stack centered on the neutral middle.": [
  "Une barre par ligne (une question) ; ses champs de réponses, d'un pôle à l'autre, s'empilent autour du milieu neutre.",
  "Ein Balken je Zeile (eine Frage); seine Antwortfelder, von einem Pol zum anderen, stapeln sich um die neutrale Mitte."
 ],
 "One point per row at x (in order) and y, joined; each y field is one series, and reference lines mark targets.": [
  "Un point par ligne en x (dans l'ordre) et y, reliés ; chaque champ y est une série, et des lignes de référence marquent les cibles.",
  "Ein Punkt je Zeile bei x (in Reihenfolge) und y, verbunden; jedes y-Feld ist eine Reihe, und Bezugslinien markieren Ziele."
 ],
 "One line per row: label, an optional detail underneath and an optional value on the right.": [
  "Une ligne par ligne : le libellé, un détail facultatif dessous et une valeur facultative à droite.",
  "Eine Zeile je Zeile: Bezeichnung, ein optionales Detail darunter und ein optionaler Wert rechts."
 ],
 "One marker per row on its region (by code) or at its coordinates, its name written beside it; a kind field colors the markers with a key.": [
  "Un marqueur par ligne sur sa région (par code) ou à ses coordonnées, son nom écrit à côté ; un champ kind colore les marqueurs, avec une légende.",
  "Ein Marker je Zeile auf seiner Region (per Kürzel) oder bei seinen Koordinaten, sein Name daneben; ein kind-Feld färbt die Marker, mit Legende."
 ],
 "One column per x category, as wide as its total; each column is split by series into segments as tall as their share.": [
  "Une colonne par catégorie x, aussi large que son total ; chaque colonne est découpée par série en segments aussi hauts que leur part.",
  "Eine Spalte je x-Kategorie, so breit wie ihre Summe; jede Spalte ist nach Reihe in Segmente geteilt, so hoch wie ihr Anteil."
 ],
 "One mark per row at its x column and y row: a circle sized by size, shaded by color (a number on the seven-step scale, a category by its color), or a square where mark is yes; pairs with no row stay empty.": [
  "Une marque par ligne à sa colonne x et sa ligne y : un cercle dimensionné par size, teinté par color (un nombre sur l'échelle en sept pas, une catégorie par sa couleur), ou un carré là où mark vaut oui ; les paires sans ligne restent vides.",
  "Eine Marke je Zeile bei ihrer x-Spalte und y-Zeile: ein Kreis, bemessen nach size, eingefärbt nach color (eine Zahl auf der siebenstufigen Skala, eine Kategorie nach ihrer Farbe), oder ein Quadrat, wo mark ja ist; Paare ohne Zeile bleiben leer."
 ],
 "One meter per row: value as a percentage of target, a bar filling to the target and the gap in words.": [
  "Une jauge par ligne : value en pourcentage de target, une barre qui se remplit vers la cible et l'écart en toutes lettres.",
  "Eine Anzeige je Zeile: value als Prozent von target, ein Balken, der sich zum Ziel füllt, und der Abstand in Worten."
 ],
 "Rows sorted largest first as bars of their share of the total, a line through the running total and a dashed line at the threshold (80% by default).": [
  "Les lignes de la plus grande à la plus petite en barres de leur part du total, une ligne qui suit le cumul et un pointillé au seuil (80 % par défaut).",
  "Zeilen größte zuerst als Balken ihres Anteils an der Summe, eine Linie durch die laufende Summe und eine gestrichelte Linie bei der Schwelle (standardmäßig 80 %)."
 ],
 "One wedge per row from twelve o'clock clockwise, its angle its share of the sum of value, the share written on it.": [
  "Un secteur par ligne, de midi dans le sens horaire, son angle étant sa part de la somme de value, la part écrite dessus.",
  "Ein Sektor je Zeile ab zwölf Uhr im Uhrzeigersinn, sein Winkel sein Anteil an der Summe von value, der Anteil darauf geschrieben."
 ],
 "One row per band in the order given; the left field's count grows leftward from a center axis and the right field's rightward, both on one shared scale.": [
  "Une ligne par tranche dans l'ordre donné ; le décompte du champ left part vers la gauche depuis un axe central et celui du champ right vers la droite, sur une échelle commune.",
  "Eine Zeile je Band in angegebener Reihenfolge; die Anzahl des left-Felds wächst von einer Mittelachse nach links, die des right-Felds nach rechts, beide auf einer gemeinsamen Skala."
 ],
 "One spoke per row (an attribute) and one shape per y field, all on one scale from zero.": [
  "Un rayon par ligne (un critère) et une forme par champ y, tous sur une échelle depuis zéro.",
  "Eine Speiche je Zeile (ein Merkmal) und eine Form je y-Feld, alle auf einer Skala ab null."
 ],
 "One row per data row and one cell per dimension holding its status (R, A, G or N) as a shape, an Overall column with the worst of them first, rows sorted worst first, a strip that counts the statuses above and a count per column below; a previous field per dimension adds a better or worse arrow.": [
  "Une ligne par ligne de données et une cellule par dimension portant son statut (R, A, G ou N) en forme, une colonne Global avec le pire d'abord, les lignes les pires en tête, une bande qui compte les statuts au-dessus et un décompte par colonne en dessous ; un champ previous par dimension ajoute une flèche de mieux ou de moins bien.",
  "Eine Zeile je Datenzeile und eine Zelle je Dimension mit ihrem Status (R, A, G oder N) als Form, eine Spalte Gesamt mit dem schlechtesten zuerst, Zeilen schlechteste zuerst, ein Streifen mit den Statuszahlen oben und eine Zahl je Spalte unten; ein previous-Feld je Dimension fügt einen Pfeil besser oder schlechter hinzu."
 ],
 "One row per entity and one cell per period with its status as a shape, a tick where the status changed, the note of why in the tooltip, and the current status as a pill at the end; rows worst-current first.": [
  "Une ligne par entité et une cellule par période avec son statut en forme, un trait là où le statut change, la raison dans l'info-bulle, et le statut actuel en pastille au bout ; les lignes au pire statut actuel d'abord.",
  "Eine Zeile je Einheit und eine Zelle je Periode mit ihrem Status als Form, ein Strich, wo sich der Status änderte, der Grund im Tooltip und der aktuelle Status als Pille am Ende; Zeilen mit dem schlechtesten aktuellen Status zuerst."
 ],
 "Rows are grouped by group; each group's values become a smooth density curve, the curves overlapping on one axis.": [
  "Les lignes sont regroupées par group ; les valeurs de chaque groupe deviennent une courbe de densité lissée, les courbes se superposant sur un axe.",
  "Die Zeilen werden nach group gruppiert; die Werte jeder Gruppe werden zu einer geglätteten Dichtekurve, die Kurven überlagern sich auf einer Achse."
 ],
 "One ring per row from the outside in, filled to value over target; past the target a second lap shows how far over.": [
  "Un anneau par ligne de l'extérieur vers l'intérieur, rempli de value sur target ; au-delà de la cible, un second tour montre de combien.",
  "Ein Ring je Zeile von außen nach innen, gefüllt mit value über target; über dem Ziel zeigt eine zweite Runde, wie weit darüber."
 ],
 "One equal wedge per row, clockwise from twelve o'clock, its area true to value; several y fields stack.": [
  "Un secteur égal par ligne, de midi dans le sens horaire, sa surface fidèle à value ; plusieurs champs y s'empilent.",
  "Ein gleicher Sektor je Zeile ab zwölf Uhr im Uhrzeigersinn, seine Fläche getreu value; mehrere y-Felder stapeln sich."
 ],
 "Each row is a ribbon from source to target, as thick as value; nodes stack into stages left to right.": [
  "Chaque ligne est un ruban de source à target, aussi épais que value ; les nœuds s'empilent en étapes de gauche à droite.",
  "Jede Zeile ist ein Band von source zu target, so dick wie value; die Knoten stapeln sich in Stufen von links nach rechts."
 ],
 "One dot per row at x and y (both numbers); size and series add a third and fourth field, and label names each dot.": [
  "Un point par ligne en x et y (deux nombres) ; size et series ajoutent un troisième et un quatrième champ, et label nomme chaque point.",
  "Ein Punkt je Zeile bei x und y (beides Zahlen); size und series fügen ein drittes und viertes Feld hinzu, und label benennt jeden Punkt."
 ],
 "One line per row from its from value on the left to its to value on the right, on one shared scale.": [
  "Une ligne par ligne de sa valeur from à gauche à sa valeur to à droite, sur une échelle commune.",
  "Eine Linie je Zeile von ihrem from-Wert links zu ihrem to-Wert rechts, auf einer gemeinsamen Skala."
 ],
 "One row per data row with one small square per unit, filled part by part in order (each part its color), the total and the first part's share written at the end; when totals run long, one square stands for a round number of units.": [
  "Une ligne par ligne de données avec un petit carré par unité, rempli partie par partie dans l'ordre (chacune sa couleur), le total et la part de la première partie écrits au bout ; quand les totaux sont longs, un carré vaut un nombre rond d'unités.",
  "Eine Zeile je Datenzeile mit einem kleinen Quadrat je Einheit, Teil für Teil der Reihe nach gefüllt (jeder Teil in seiner Farbe), Summe und Anteil des ersten Teils am Ende; bei langen Summen steht ein Quadrat für eine runde Zahl von Einheiten."
 ],
 "The inner ring splits the total by the first level; each outer ring splits its parent by the next level, by the sum of value.": [
  "L'anneau intérieur répartit le total par le premier niveau ; chaque anneau extérieur répartit son parent par le niveau suivant, selon la somme de value.",
  "Der innere Ring teilt die Summe nach der ersten Ebene; jeder äußere Ring teilt sein Elternteil nach der nächsten Ebene, nach der Summe von value."
 ],
 "One circle per row on its region (by code) or at its coordinates, its area true to the size field; a color field groups the circles with a key.": [
  "Un cercle par ligne sur sa région (par code) ou à ses coordonnées, sa surface fidèle au champ size ; un champ color regroupe les cercles, avec une légende.",
  "Ein Kreis je Zeile auf seiner Region (per Kürzel) oder bei seinen Koordinaten, seine Fläche getreu dem size-Feld; ein color-Feld gruppiert die Kreise, mit Legende."
 ],
 "One line per row and one column per field (or the columns listed), formatted, sortable, with optional totals.": [
  "Une ligne par ligne et une colonne par champ (ou les colonnes listées), formatées, triables, avec des totaux en option.",
  "Eine Zeile je Zeile und eine Spalte je Feld (oder die aufgeführten Spalten), formatiert, sortierbar, mit optionalen Summen."
 ],
 "One row per task with a bar from start to end, a diamond where there is no end (a milestone), grouped and with a today line.": [
  "Une ligne par tâche avec une barre du début à la fin, un losange s'il n'y a pas de fin (un jalon), groupées, avec une ligne du jour.",
  "Eine Zeile je Aufgabe mit einem Balken vom Start zum Ende, einer Raute, wo es kein Ende gibt (ein Meilenstein), gruppiert und mit einer Heute-Linie."
 ],
 "One tile per row, its area its share of the sum of value, kept close to square; an optional group field clusters tiles.": [
  "Une tuile par ligne, sa surface étant sa part de la somme de value, gardée proche du carré ; un champ group facultatif regroupe les tuiles.",
  "Eine Kachel je Zeile, ihre Fläche ihr Anteil an der Summe von value, möglichst quadratisch; ein optionales group-Feld bündelt Kacheln."
 ],
 "One bar per row from a zero line to value minus target, right when over and left when under, colored good or bad.": [
  "Une barre par ligne depuis une ligne zéro jusqu'à value moins target, à droite en cas de dépassement et à gauche en dessous, colorée bon ou mauvais.",
  "Ein Balken je Zeile von einer Nulllinie bis value minus target, rechts bei Überschreitung und links darunter, gut oder schlecht gefärbt."
 ],
 "A 10 by 10 grid, one square per percent, filled category by category in row order.": [
  "Une grille de 10 sur 10, un carré par pour cent, remplie catégorie par catégorie dans l'ordre des lignes.",
  "Ein Raster von 10 mal 10, ein Quadrat je Prozent, Kategorie für Kategorie in Zeilenreihenfolge gefüllt."
 ],
 "Rows in order: totals stand on zero, and every other row is a change floating from the running total, up or down.": [
  "Les lignes dans l'ordre : les totaux partent de zéro, et chaque autre ligne est une variation qui flotte depuis le cumul, vers le haut ou vers le bas.",
  "Zeilen in Reihenfolge: Summen stehen auf null, und jede andere Zeile ist eine Veränderung, die von der laufenden Summe aus nach oben oder unten schwebt."
 ],
 "One cell per row and column pair, read from its state: a filled square where held, an outlined square tinted by score where open, a faint dot where not eligible; each row ends with its penetration and the potential still open, each column with how many hold it and how many could; rows sort by potential.": [
  "Une cellule par paire ligne-colonne, lue depuis son état : un carré plein là où c'est détenu, un carré détouré teinté par score là où c'est ouvert, un point pâle là où ce n'est pas éligible ; chaque ligne finit par sa pénétration et le potentiel encore ouvert, chaque colonne par combien la détiennent et combien pourraient ; les lignes se classent par potentiel.",
  "Eine Zelle je Paar aus Zeile und Spalte, aus ihrem Status gelesen: ein gefülltes Quadrat, wo gehalten, ein umrandetes, nach score getöntes Quadrat, wo offen, ein blasser Punkt, wo nicht berechtigt; jede Zeile endet mit ihrer Durchdringung und dem noch offenen Potenzial, jede Spalte mit der Zahl der Halter und der Möglichen; Zeilen nach Potenzial sortiert."
 ],
 "The first row's name and detail line, up to six facts as labelled figures, true/false product fields as pills (held in color), a share-of-wallet meter, a list of numbers as a small trend, and lists of flags and next best actions.": [
  "Le nom et la ligne de détail de la première ligne, jusqu'à six chiffres nommés, les champs produits vrai/faux en pastilles (détenus en couleur), une jauge de part de portefeuille, une liste de nombres en petite tendance, et des listes d'alertes et de prochaines meilleures actions.",
  "Name und Detailzeile der ersten Zeile, bis zu sechs Kennzahlen als beschriftete Zahlen, Wahr/Falsch-Produktfelder als Pillen (gehalten farbig), eine Anzeige des Wallet-Anteils, eine Zahlenliste als kleiner Trend und Listen von Warnungen und nächsten besten Aktionen."
 ]
};

/** What one row is, by its English. */
export const GUIDE_GRAINS: Record<string, Pair> = {
 "One row per category, each named once.": [
  "Une ligne par catégorie, chacune nommée une fois.",
  "Eine Zeile je Kategorie, jede einmal benannt."
 ],
 "One row per point in time, in order.": [
  "Une ligne par instant, dans l'ordre.",
  "Eine Zeile je Zeitpunkt, in Reihenfolge."
 ],
 "One row per thing measured (a deal, a ticket, a response); the chart counts or spreads them.": [
  "Une ligne par chose mesurée (une affaire, un ticket, une réponse) ; le graphique les compte ou les répartit.",
  "Eine Zeile je gemessenem Ding (ein Deal, ein Ticket, eine Antwort); das Diagramm zählt oder verteilt sie."
 ],
 "One row per combination of two categories, such as month and product.": [
  "Une ligne par combinaison de deux catégories, comme le mois et le produit.",
  "Eine Zeile je Kombination zweier Kategorien, etwa Monat und Produkt."
 ],
 "One row per flow, from a source to a target.": [
  "Une ligne par flux, d'une source vers une cible.",
  "Eine Zeile je Fluss, von einer Quelle zu einem Ziel."
 ],
 "One row per leaf of the hierarchy, its levels in columns from the top down.": [
  "Une ligne par feuille de la hiérarchie, ses niveaux en colonnes de haut en bas.",
  "Eine Zeile je Blatt der Hierarchie, ihre Ebenen als Spalten von oben nach unten."
 ],
 "One value; with more rows, the last one is the headline and the rest draw its trend.": [
  "Une valeur ; avec plus de lignes, la dernière est le chiffre clé et les autres tracent sa tendance.",
  "Ein Wert; bei mehr Zeilen ist die letzte die Kernzahl und die übrigen zeichnen ihren Trend."
 ],
 "Any rows.": [
  "N'importe quelles lignes.",
  "Beliebige Zeilen."
 ]
};

/** What a field holds, as the catalog and the guide write it. */
export const KIND_WORDS: Record<string, Pair> = {
 "number": ["nombre", "Zahl"],
 "date": ["date", "Datum"],
 "category": ["catégorie", "Kategorie"],
 "any": ["tout", "beliebig"],
};

const at = (lang: OptionLang) => (lang === "fr" ? 0 : 1);

/** An option's hint in French or German, else the English as given. */
export function optionHint(english: string, lang: OptionLang): string {
  return OPTION_HINTS[english]?.[at(lang)] ?? english;
}

/** An option's label in French or German, else undefined (the caller keeps its English label). */
export function optionLabel(name: string, lang: OptionLang): string | undefined {
  return OPTION_NAMES[name]?.[at(lang)];
}

/** A guide line (a use, a build or a grain) in French or German, else undefined. */
export function guideLine(english: string, lang: OptionLang): string | undefined {
  return (GUIDE_USES[english] ?? GUIDE_BUILDS[english] ?? GUIDE_GRAINS[english])?.[at(lang)];
}

/** What a field holds, in French or German ("nombre", "Datum"), else the English. */
export function kindWord(kind: string, lang: OptionLang): string {
  return KIND_WORDS[kind]?.[at(lang)] ?? kind;
}

/** The words, as registered on the page by importing this module. */
export interface OptionWords {
  optionHint: typeof optionHint;
  optionLabel: typeof optionLabel;
}

const KEY = Symbol.for("martcharts.option-words");
(globalThis as { [KEY]?: OptionWords })[KEY] = { optionHint, optionLabel };
