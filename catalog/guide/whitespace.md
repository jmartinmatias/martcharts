# `whitespace` chart

The cross-sell map (whitespace analysis): one cell per client and product, filled where the client holds the product, outlined where it is an opportunity (tinted by how likely), blank where the client is not eligible. Each row ends with its penetration (3 of 8) and the revenue still to win; each column ends with how many hold it and how many could. Rows sort with the most to sell first.

## What it is for

- How each group or period splits: best
- Exact values and lookup: good
- Comparing amounts across categories: possible

**Best for**

- Cross-sell and upsell: which clients could take which products, and where to start
- Product penetration across a book, with the money still on the table
- A relationship manager's weekly whitespace review

**Least useful for**

- Amounts without a held, open or not eligible state (use heatmap)
- More than about 16 products or 30 clients at once (filter or group first)
- One client alone (use xray)

## The data it needs

**One row is**: One row per combination of two categories, such as month and product.

**How the chart is built**: One cell per row and column pair, read from its state: a filled square where held, an outlined square tinted by score where open, a faint dot where not eligible; each row ends with its penetration and the potential still open, each column with how many hold it and how many could; rows sort by potential.

**Rows it reads well with**: 4 to 480.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `row` | category | yes | Field naming each row, usually the client. |
| `column` | category | yes | Field naming each column, usually the product. |
| `state` | category | yes | Field saying whether the row holds the column, could (an opportunity), or is not eligible. See states. |
| `score` | number |  | Field with how likely each opportunity is, 0 to 100 (a propensity). An opportunity cell's tint strengthens with it. |
| `value` | number |  | Field with the money in each cell: revenue where held, potential where open. Written in the tooltip; the open cells' sum ends each row. |

## This example's columns (5 columns, 48 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `client` (Client) | category | `row` | 6 different, e.g. "Aldana Holdings", "Dr. M. Keller", "Nordvik Pension Fund" |
| `product` (Product) | category | `column` | 8 different, e.g. "Custody", "Advisory", "Discretionary" |
| `state` (Status) | category | `state` | 3 different, e.g. "Holds", "Opportunity", "Not eligible" |
| `propensity` (Propensity) | number | `score` | 22 to 88 |
| `value` (Revenue) | number | `value` | 6000 to 310000 |

## The data drawing it now

| client | product | state | propensity | value |
| --- | --- | --- | --- | --- |
| Aldana Holdings | Custody | Holds |  | 184000 |
| Aldana Holdings | Advisory | Holds |  | 96000 |
| Aldana Holdings | Discretionary | Opportunity | 82 | 140000 |
| Aldana Holdings | Lending | Opportunity | 61 | 75000 |
| Aldana Holdings | FX | Holds |  | 22000 |
| Aldana Holdings | Structured | Opportunity | 44 | 38000 |
| Aldana Holdings | Insurance | Not eligible |  |  |
| Aldana Holdings | Pension | Not eligible |  |  |
| Dr. M. Keller | Custody | Holds |  | 41000 |
| Dr. M. Keller | Advisory | Opportunity | 71 | 28000 |
| Dr. M. Keller | Discretionary | Holds |  | 66000 |
| Dr. M. Keller | Lending | Opportunity | 35 | 18000 |
| Dr. M. Keller | FX | Not eligible |  |  |
| Dr. M. Keller | Structured | Opportunity | 52 | 15000 |
| Dr. M. Keller | Insurance | Opportunity | 88 | 12000 |
| Dr. M. Keller | Pension | Holds |  | 9000 |
| Nordvik Pension Fund | Custody | Holds |  | 310000 |
| Nordvik Pension Fund | Advisory | Holds |  | 120000 |
| Nordvik Pension Fund | Discretionary | Holds |  | 240000 |
| Nordvik Pension Fund | Lending | Not eligible |  |  |
| Nordvik Pension Fund | FX | Opportunity | 58 | 46000 |
| Nordvik Pension Fund | Structured | Opportunity | 27 | 60000 |
| Nordvik Pension Fund | Insurance | Not eligible |  |  |
| Nordvik Pension Fund | Pension | Not eligible |  |  |
| Brivio & Figli | Custody | Holds |  | 72000 |
| Brivio & Figli | Advisory | Opportunity | 64 | 40000 |
| Brivio & Figli | Discretionary | Opportunity | 49 | 55000 |
| Brivio & Figli | Lending | Holds |  | 31000 |
| Brivio & Figli | FX | Holds |  | 14000 |
| Brivio & Figli | Structured | Opportunity | 73 | 29000 |
| Brivio & Figli | Insurance | Opportunity | 31 | 8000 |
| Brivio & Figli | Pension | Not eligible |  |  |
| S. Okonkwo | Custody | Holds |  | 18000 |
| S. Okonkwo | Advisory | Holds |  | 12000 |
| S. Okonkwo | Discretionary | Opportunity | 39 | 21000 |
| S. Okonkwo | Lending | Opportunity | 77 | 26000 |
| S. Okonkwo | FX | Not eligible |  |  |
| S. Okonkwo | Structured | Not eligible |  |  |
| S. Okonkwo | Insurance | Holds |  | 6000 |
| S. Okonkwo | Pension | Opportunity | 66 | 7000 |
| Hallström Capital | Custody | Holds |  | 128000 |
| Hallström Capital | Advisory | Holds |  | 54000 |
| Hallström Capital | Discretionary | Holds |  | 97000 |
| Hallström Capital | Lending | Holds |  | 44000 |
| Hallström Capital | FX | Holds |  | 19000 |
| Hallström Capital | Structured | Opportunity | 22 | 25000 |
| Hallström Capital | Insurance | Not eligible |  |  |
| Hallström Capital | Pension | Not eligible |  |  |

As CSV:

```csv
client,product,state,propensity,value
Aldana Holdings,Custody,Holds,,184000
Aldana Holdings,Advisory,Holds,,96000
Aldana Holdings,Discretionary,Opportunity,82,140000
Aldana Holdings,Lending,Opportunity,61,75000
Aldana Holdings,FX,Holds,,22000
Aldana Holdings,Structured,Opportunity,44,38000
Aldana Holdings,Insurance,Not eligible,,
Aldana Holdings,Pension,Not eligible,,
Dr. M. Keller,Custody,Holds,,41000
Dr. M. Keller,Advisory,Opportunity,71,28000
Dr. M. Keller,Discretionary,Holds,,66000
Dr. M. Keller,Lending,Opportunity,35,18000
Dr. M. Keller,FX,Not eligible,,
Dr. M. Keller,Structured,Opportunity,52,15000
Dr. M. Keller,Insurance,Opportunity,88,12000
Dr. M. Keller,Pension,Holds,,9000
Nordvik Pension Fund,Custody,Holds,,310000
Nordvik Pension Fund,Advisory,Holds,,120000
Nordvik Pension Fund,Discretionary,Holds,,240000
Nordvik Pension Fund,Lending,Not eligible,,
Nordvik Pension Fund,FX,Opportunity,58,46000
Nordvik Pension Fund,Structured,Opportunity,27,60000
Nordvik Pension Fund,Insurance,Not eligible,,
Nordvik Pension Fund,Pension,Not eligible,,
Brivio & Figli,Custody,Holds,,72000
Brivio & Figli,Advisory,Opportunity,64,40000
Brivio & Figli,Discretionary,Opportunity,49,55000
Brivio & Figli,Lending,Holds,,31000
Brivio & Figli,FX,Holds,,14000
Brivio & Figli,Structured,Opportunity,73,29000
Brivio & Figli,Insurance,Opportunity,31,8000
Brivio & Figli,Pension,Not eligible,,
S. Okonkwo,Custody,Holds,,18000
S. Okonkwo,Advisory,Holds,,12000
S. Okonkwo,Discretionary,Opportunity,39,21000
S. Okonkwo,Lending,Opportunity,77,26000
S. Okonkwo,FX,Not eligible,,
S. Okonkwo,Structured,Not eligible,,
S. Okonkwo,Insurance,Holds,,6000
S. Okonkwo,Pension,Opportunity,66,7000
Hallström Capital,Custody,Holds,,128000
Hallström Capital,Advisory,Holds,,54000
Hallström Capital,Discretionary,Holds,,97000
Hallström Capital,Lending,Holds,,44000
Hallström Capital,FX,Holds,,19000
Hallström Capital,Structured,Opportunity,22,25000
Hallström Capital,Insurance,Not eligible,,
Hallström Capital,Pension,Not eligible,,
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "cross-sell-whitespace",
  "title": "Where to sell next",
  "subtitle": "Products held and open by client, Nordics book",
  "description": "The cross-sell map: one cell per client and product. Filled where held, outlined where open (stronger tint, higher propensity), a dot where the client is not eligible. Rows sort with the most potential first.",
  "note": "Potential is the estimated annual revenue of each open product",
  "source": {
    "name": "CRM and billing (fictional)"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "client": "Aldana Holdings",
        "product": "Custody",
        "state": "Holds",
        "propensity": null,
        "value": 184000
      },
      {
        "client": "Aldana Holdings",
        "product": "Advisory",
        "state": "Holds",
        "propensity": null,
        "value": 96000
      },
      {
        "client": "Aldana Holdings",
        "product": "Discretionary",
        "state": "Opportunity",
        "propensity": 82,
        "value": 140000
      }
    ]
  },
  "fields": {
    "client": {
      "label": "Client"
    },
    "product": {
      "label": "Product"
    },
    "state": {
      "label": "Status"
    },
    "propensity": {
      "label": "Propensity",
      "format": {
        "type": "number",
        "decimals": 0
      }
    },
    "value": {
      "label": "Revenue",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    }
  },
  "view": {
    "type": "whitespace",
    "row": "client",
    "column": "product",
    "state": "state",
    "score": "propensity",
    "value": "value"
  },
  "i18n": {
    "fr": {
      "title": "Où vendre ensuite",
      "subtitle": "Produits détenus et ouverts par client, portefeuille nordique",
      "description": "La carte de vente croisée : une case par client et produit. Pleine si détenu, contour si ouverte (teinte plus forte, probabilité plus haute), un point si non éligible. Les lignes au plus fort potentiel d'abord.",
      "note": "Le potentiel est le CA annuel estimé de chaque produit ouvert",
      "source": {
        "name": "CRM et facturation (fictifs)"
      },
      "fields": {
        "product": {
          "label": "Produit",
          "values": {
            "Custody": "Conservation",
            "Advisory": "Conseil",
            "Discretionary": "Gestion sous mandat",
            "Lending": "Crédit",
            "Structured": "Produits structurés",
            "Insurance": "Assurance",
            "Pension": "Retraite"
          }
        },
        "state": {
          "label": "Statut"
        },
        "propensity": {
          "label": "Propension"
        },
        "value": {
          "label": "Chiffre d'affaires"
        }
      }
    },
    "de": {
      "title": "Wo als Nächstes verkaufen",
      "subtitle": "Gehaltene und offene Produkte je Kunde, Bestand Nordics",
      "description": "Die Cross-Selling-Karte: eine Zelle je Kunde und Produkt. Gefüllt, wo gehalten, umrandet, wo offen (kräftiger heißt wahrscheinlicher), ein Punkt, wo nicht berechtigt. Zeilen mit dem meisten Potenzial zuerst.",
      "note": "Potenzial ist der geschätzte Jahresumsatz jedes offenen Produkts",
      "source": {
        "name": "CRM und Abrechnung (fiktiv)"
      },
      "fields": {
        "client": {
          "label": "Kunde"
        },
        "product": {
          "label": "Produkt",
          "values": {
            "Custody": "Verwahrung",
            "Advisory": "Beratung",
            "Discretionary": "Vermögensverwaltung",
            "Lending": "Kredite",
            "Structured": "Strukturierte Produkte",
            "Insurance": "Versicherung",
            "Pension": "Vorsorge"
          }
        },
        "propensity": {
          "label": "Neigung"
        },
        "value": {
          "label": "Umsatz"
        }
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `marimekko` | fits | same | Keeps the job (how each group or period splits) with a different look. | `{"type":"marimekko","x":"client","series":"product","value":"value"}` |
| `boxplot` | fits | different | Answers a different question: better for how values spread and comparing amounts across categories, but gives up how each group or period splits. | `{"type":"boxplot","value":"value"}` |
| `icicle` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up how each group or period splits. | `{"type":"icicle","levels":["client","product"],"value":"value"}` |
| `matrix` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle and comparing amounts across categories, but gives up how each group or period splits. | `{"type":"matrix","x":"client","y":"product"}` |
| `ridgeline` | fits | different | Answers a different question: better for how values spread and comparing amounts across categories, but gives up how each group or period splits. | `{"type":"ridgeline","value":"value","group":"client"}` |
| `sunburst` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up how each group or period splits. | `{"type":"sunburst","levels":["client","product"],"value":"value"}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up how each group or period splits. | `{"type":"beeswarm","value":"value"}` |
| `heatmap` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up how each group or period splits. Shades every cell by one number, which suits amounts; the held, open and not eligible states are lost. | `{"type":"heatmap","x":"client","y":"product","value":"value"}` |
| `histogram` | fits | different | Answers a different question: better for how values spread, but gives up how each group or period splits. | `{"type":"histogram","value":"value"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up how each group or period splits. | `{"type":"sankey","source":"client","target":"product","value":"value"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up how each group or period splits. Exact values per pair and sorting by any column; the map's shape, where the open cells cluster, is gone. | `{"type":"table"}` |
| `kpi` | fits | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"kpi","value":"value"}` |
| `kpis` | fits | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"value"}]}` |
| `bar` | stretch: "client" repeats (6 different values in 48 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 48 rows: this chart crowds past about 16. | trade-off | Better for comparing amounts across categories and ranking, top to bottom; weaker for how each group or period splits. | `{"type":"bar","x":"client","y":"value"}` |
| `hbar` | stretch: "client" repeats (6 different values in 48 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 48 rows: this chart crowds past about 30. | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up how each group or period splits. | `{"type":"hbar","label":"client","value":"value"}` |
| `list` | stretch: "client" repeats (6 different values in 48 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 48 rows: this chart crowds past about 20. | different | Answers a different question: better for ranking, top to bottom and exact values and lookup, but gives up how each group or period splits. | `{"type":"list","label":"client","value":"value"}` |
| `area` | stretch: x expects dates; "client" is text, so its rows are drawn in the order given. "client" repeats (6 different values in 48 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Weaker for how each group or period splits, with nothing gained for this data. | `{"type":"area","x":"client","y":"value"}` |
| `donut` | stretch: "client" repeats (6 different values in 48 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 48 rows: this chart crowds past about 6. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"donut","label":"client","value":"value"}` |
| `dot` | stretch: "client" repeats (6 different values in 48 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 48 rows: this chart crowds past about 30. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"dot","label":"client","value":"value"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 48 rows. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"gauge","value":"value"}` |
| `horizon` | stretch: x expects dates; "client" is text, so its rows are drawn in the order given. "client" repeats (6 different values in 48 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"horizon","x":"client","y":"value"}` |
| `line` | stretch: x expects dates; "client" is text, so its rows are drawn in the order given. "client" repeats (6 different values in 48 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"line","x":"client","y":"value"}` |
| `pareto` | stretch: "client" repeats (6 different values in 48 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 48 rows: this chart crowds past about 25. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"pareto","label":"client","value":"value"}` |
| `pie` | stretch: "client" repeats (6 different values in 48 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 48 rows: this chart crowds past about 6. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"pie","label":"client","value":"value"}` |
| `radar` | stretch: "client" repeats (6 different values in 48 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 48 rows: this chart crowds past about 12. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"radar","label":"client","y":"value"}` |
| `rose` | stretch: "client" repeats (6 different values in 48 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 48 rows: this chart crowds past about 36. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"rose","label":"client","y":"value"}` |
| `treemap` | stretch: "client" repeats (6 different values in 48 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"treemap","label":"client","value":"value"}` |
| `waffle` | stretch: "client" repeats (6 different values in 48 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 48 rows: this chart crowds past about 5. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"waffle","label":"client","value":"value"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `board` (It needs a stage or status column with a handful of values, and a name per row.); `bullet` (needs a separate column for target (it would reuse "value", already the value)); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "value", already the open)); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "value", already the y)); `dumbbell` (needs a separate column for to (it would reuse "value", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `meter` (needs a separate column for target (it would reuse "value", already the value)); `pyramid` (needs a separate column for right (it would reuse "value", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (It needs one status (R, A, G) per entity per period.); `rings` (needs a separate column for target (it would reuse "value", already the value)); `scatter` (needs a separate column for y (it would reuse "value", already the x)); `slope` (needs a separate column for to (it would reuse "value", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "value", already the value)); `waterfall` (It needs changes that add up from one total to another.); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
