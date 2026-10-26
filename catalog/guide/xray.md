# `xray` chart

A client x-ray: one client on one card, from its first row. The name and a detail line, a grid of key facts, the products it holds as pills (held in color, not held outlined), a share-of-wallet meter, a small trend, quiet warning flags and a short list of next best actions. For a client page, a pre-meeting brief or a relationship manager's cockpit.

## What it is for

- A headline number: best
- Exact values and lookup: good
- Profiles across several attributes: possible

**Best for**

- One client on one card: a pre-meeting brief, a client page, a relationship manager's cockpit
- Seeing holdings, share of wallet, trend and next steps at one glance

**Least useful for**

- Several clients (use whitespace or table)
- One number alone (use kpi)
- A history of events (use history)

## The data it needs

**One row is**: One value; with more rows, the last one is the headline and the rest draw its trend.

**How the chart is built**: The first row's name and detail line, up to six facts as labelled figures, true/false product fields as pills (held in color), a share-of-wallet meter, a list of numbers as a small trend, and lists of flags and next best actions.

**Rows it reads well with**: 1 to 1.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field with the client's name. |
| `detail` | category |  | Field for the line under the name, such as the segment or the relationship manager. |
| `facts` | number (one or more) |  | Up to six fields shown as small labelled figures: assets, revenue, products held, client since. |
| `holdings` | category (one or more) |  | True/false fields, one per product, drawn as a strip of named pills: held in color, not held outlined. |
| `wallet` | number |  | Field with the share of wallet, 0 to 1, drawn as a meter with its percent. |
| `trend` | category |  | Field whose value is a list of numbers (revenue by month, say), drawn as a small trend with its first and last values written. |
| `flags` | category |  | Field whose value is a list of short warnings, shown as quiet amber pills: ["No contact in 90 days", "Fee leakage"]. |
| `actions` | category |  | Field whose value is a list of next best actions, shown as a short checklist. |

## This example's columns (18 columns, 1 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `name` | category | `label` | 1 different, e.g. "Aldana Holdings" |
| `segment` | category | `detail` | 1 different, e.g. "Corporate · Relationship manager: L. Vandermeer" |
| `aum` (Assets) | number | `facts` | 48200000 to 48200000 |
| `revenue` (Revenue, 12 months) | number | `facts` | 302000 to 302000 |
| `products` (Products held) | number | `facts` | 3 to 3 |
| `sinceYear` (Client since) | number | `facts` | 2014 to 2014 |
| `custody` (Custody) | boolean | `holdings` | 1 different, e.g. true |
| `advisory` (Advisory) | boolean | `holdings` | 1 different, e.g. true |
| `discretionary` (Discretionary) | boolean | `holdings` | 1 different, e.g. false |
| `lending` (Lending) | boolean | `holdings` | 1 different, e.g. false |
| `fx` (FX) | boolean | `holdings` | 1 different, e.g. true |
| `structured` (Structured) | boolean | `holdings` | 1 different, e.g. false |
| `insurance` (Insurance) | boolean | `holdings` | 1 different, e.g. false |
| `pension` (Pension) | boolean | `holdings` | 1 different, e.g. false |
| `shareOfWallet` (Share of wallet) | number | `wallet` | 0.41 to 0.41 |
| `revenueByMonth` (Revenue by month) | other | `trend` | 1 different, e.g. [21000,22500,24100,23200,25800,26400,25100,27300,28900,27600,29800,30100] |
| `flags` | other | `flags` | 1 different, e.g. ["No meeting in 94 days","Fee leakage on FX","Lending enquiry open since June"] |
| `actions` | other | `actions` | 1 different, e.g. ["Propose discretionary mandate (propensity 82)","Review FX pricing before renewal","Book the annual review with the CFO"] |

## The data drawing it now

| name | segment | aum | revenue | products | sinceYear | custody | advisory | discretionary | lending | fx | structured | insurance | pension | shareOfWallet | revenueByMonth | flags | actions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aldana Holdings | Corporate · Relationship manager: L. Vandermeer | 48200000 | 302000 | 3 | 2014 | true | true | false | false | true | false | false | false | 0.41 | [21000,22500,24100,23200,25800,26400,25100,27300,28900,27600,29800,30100] | ["No meeting in 94 days","Fee leakage on FX","Lending enquiry open since June"] | ["Propose discretionary mandate (propensity 82)","Review FX pricing before renewal","Book the annual review with the CFO"] |

As CSV:

```csv
name,segment,aum,revenue,products,sinceYear,custody,advisory,discretionary,lending,fx,structured,insurance,pension,shareOfWallet,revenueByMonth,flags,actions
Aldana Holdings,Corporate · Relationship manager: L. Vandermeer,48200000,302000,3,2014,true,true,false,false,true,false,false,false,0.41,"[21000,22500,24100,23200,25800,26400,25100,27300,28900,27600,29800,30100]","[""No meeting in 94 days"",""Fee leakage on FX"",""Lending enquiry open since June""]","[""Propose discretionary mandate (propensity 82)"",""Review FX pricing before renewal"",""Book the annual review with the CFO""]"
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "client-xray",
  "title": "Client x-ray",
  "subtitle": "Before Thursday's review",
  "description": "One client on one card: the key facts, the products held, the share of wallet, the revenue trend, what to watch and what to do next.",
  "source": {
    "name": "CRM, custody and billing (fictional)"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "name": "Aldana Holdings",
        "segment": "Corporate · Relationship manager: L. Vandermeer",
        "aum": 48200000,
        "revenue": 302000,
        "products": 3,
        "sinceYear": 2014,
        "custody": true,
        "advisory": true,
        "discretionary": false,
        "lending": false,
        "fx": true,
        "structured": false,
        "insurance": false,
        "pension": false,
        "shareOfWallet": 0.41,
        "revenueByMonth": [
          21000,
          22500,
          24100,
          23200,
          25800,
          26400,
          25100,
          27300,
          28900,
          27600,
          29800,
          30100
        ],
        "flags": [
          "No meeting in 94 days",
          "Fee leakage on FX",
          "Lending enquiry open since June"
        ],
        "actions": [
          "Propose discretionary mandate (propensity 82)",
          "Review FX pricing before renewal",
          "Book the annual review with the CFO"
        ]
      }
    ]
  },
  "fields": {
    "aum": {
      "label": "Assets",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "revenue": {
      "label": "Revenue, 12 months",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "products": {
      "label": "Products held"
    },
    "sinceYear": {
      "label": "Client since"
    },
    "custody": {
      "label": "Custody"
    },
    "advisory": {
      "label": "Advisory"
    },
    "discretionary": {
      "label": "Discretionary"
    },
    "lending": {
      "label": "Lending"
    },
    "fx": {
      "label": "FX"
    },
    "structured": {
      "label": "Structured"
    },
    "insurance": {
      "label": "Insurance"
    },
    "pension": {
      "label": "Pension"
    },
    "shareOfWallet": {
      "label": "Share of wallet",
      "format": {
        "type": "percent",
        "decimals": 0
      }
    },
    "revenueByMonth": {
      "label": "Revenue by month",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    }
  },
  "view": {
    "type": "xray",
    "label": "name",
    "detail": "segment",
    "facts": [
      "aum",
      "revenue",
      "products",
      "sinceYear"
    ],
    "holdings": [
      "custody",
      "advisory",
      "discretionary",
      "lending",
      "fx",
      "structured",
      "insurance",
      "pension"
    ],
    "wallet": "shareOfWallet",
    "trend": "revenueByMonth",
    "flags": "flags",
    "actions": "actions"
  },
  "i18n": {
    "fr": {
      "title": "Radiographie client",
      "subtitle": "Avant la revue de jeudi",
      "description": "Un client sur une fiche : les faits clés, les produits, la part de portefeuille, la tendance du CA, les points de vigilance et la suite.",
      "source": {
        "name": "CRM, conservation et facturation (fictifs)"
      },
      "fields": {
        "aum": {
          "label": "Actifs"
        },
        "revenue": {
          "label": "CA, 12 mois"
        },
        "products": {
          "label": "Produits détenus"
        },
        "sinceYear": {
          "label": "Client depuis"
        },
        "custody": {
          "label": "Conservation"
        },
        "advisory": {
          "label": "Conseil"
        },
        "discretionary": {
          "label": "Discrétionnaire"
        },
        "lending": {
          "label": "Crédit"
        },
        "fx": {
          "label": "Change"
        },
        "structured": {
          "label": "Structurés"
        },
        "insurance": {
          "label": "Assurance"
        },
        "pension": {
          "label": "Retraite"
        },
        "shareOfWallet": {
          "label": "Part de portefeuille"
        },
        "revenueByMonth": {
          "label": "CA par mois"
        }
      }
    },
    "de": {
      "title": "Kunden-Röntgenbild",
      "subtitle": "Vor der Prüfung am Donnerstag",
      "description": "Ein Kunde auf einer Karte: Eckdaten, gehaltene Produkte, Wallet-Anteil, Umsatztrend, Warnzeichen und nächster Schritt.",
      "source": {
        "name": "CRM, Verwahrung und Abrechnung (fiktiv)"
      },
      "fields": {
        "aum": {
          "label": "Vermögen"
        },
        "revenue": {
          "label": "Umsatz, 12 Monate"
        },
        "products": {
          "label": "Gehaltene Produkte"
        },
        "sinceYear": {
          "label": "Kunde seit"
        },
        "custody": {
          "label": "Verwahrung"
        },
        "advisory": {
          "label": "Beratung"
        },
        "discretionary": {
          "label": "Vermögensverwaltung"
        },
        "lending": {
          "label": "Kredit"
        },
        "fx": {
          "label": "Devisen"
        },
        "structured": {
          "label": "Strukturierte"
        },
        "insurance": {
          "label": "Versicherung"
        },
        "pension": {
          "label": "Vorsorge"
        },
        "shareOfWallet": {
          "label": "Wallet-Anteil"
        },
        "revenueByMonth": {
          "label": "Umsatz je Monat"
        }
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `gauge` | fits | same | Keeps the job (a headline number) with a different look. | `{"type":"gauge","value":"aum"}` |
| `kpi` | fits | same | Keeps the job (a headline number) with a different look. | `{"type":"kpi","value":"aum"}` |
| `kpis` | fits | same | Keeps the job (a headline number) with a different look. A row of numbers with their changes; the holdings, flags and next steps are gone. | `{"type":"kpis","items":[{"value":"aum"},{"value":"revenue"},{"value":"products"}]}` |
| `list` | fits | different | Answers a different question: better for ranking, top to bottom and exact values and lookup, but gives up a headline number. | `{"type":"list","label":"name","detail":"segment"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up a headline number. | `{"type":"table"}` |
| `waffle` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"waffle","label":"name","value":"aum"}` |
| `bar` | stretch: 1 row: this chart says little with fewer than 2. | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up a headline number. | `{"type":"bar","x":"name","y":["aum","revenue"]}` |
| `hbar` | stretch: 1 row: this chart says little with fewer than 2. | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up a headline number. | `{"type":"hbar","label":"name","value":["aum","revenue"]}` |
| `icicle` | stretch: 1 row: this chart says little with fewer than 4. | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up a headline number. | `{"type":"icicle","levels":["name","segment"],"value":"aum"}` |
| `marimekko` | stretch: 1 row: this chart says little with fewer than 4. | different | Answers a different question: better for how each group or period splits and comparing amounts across categories, but gives up a headline number. | `{"type":"marimekko","x":"name","series":"segment","value":"aum"}` |
| `sunburst` | stretch: 1 row: this chart says little with fewer than 4. | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up a headline number. | `{"type":"sunburst","levels":["name","segment"],"value":"aum"}` |
| `donut` | stretch: 1 row: this chart says little with fewer than 2. | different | Answers a different question: better for share of one whole, but gives up a headline number. | `{"type":"donut","label":"name","value":"aum"}` |
| `pie` | stretch: 1 row: this chart says little with fewer than 2. | different | Answers a different question: better for share of one whole, but gives up a headline number. | `{"type":"pie","label":"name","value":"aum"}` |
| `sankey` | stretch: 1 row: this chart says little with fewer than 2. | different | Answers a different question: better for flows between stages or groups, but gives up a headline number. | `{"type":"sankey","source":"name","target":"segment","value":"aum"}` |
| `area` | stretch: x expects dates; "name" is text, so its rows are drawn in the order given. 1 row: this chart says little with fewer than 4. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"area","x":"name","y":["aum","revenue"]}` |
| `beeswarm` | stretch: 1 row: this chart says little with fewer than 10. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"aum","label":"name"}` |
| `boxplot` | stretch: 1 row: this chart says little with fewer than 15. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"boxplot","value":"aum"}` |
| `dot` | stretch: 1 row: this chart says little with fewer than 2. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"dot","label":"name","value":["aum","revenue"]}` |
| `heatmap` | stretch: 1 row: this chart says little with fewer than 6. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"heatmap","x":"name","y":"segment","value":"aum"}` |
| `histogram` | stretch: 1 row: this chart says little with fewer than 20. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"histogram","value":"aum"}` |
| `horizon` | stretch: x expects dates; "name" is text, so its rows are drawn in the order given. 1 row: this chart says little with fewer than 10. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"horizon","x":"name","y":["aum","revenue"]}` |
| `line` | stretch: x expects dates; "name" is text, so its rows are drawn in the order given. 1 row: this chart says little with fewer than 3. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"line","x":"name","y":["aum","revenue"]}` |
| `pareto` | stretch: 1 row: this chart says little with fewer than 4. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"pareto","label":"name","value":"aum"}` |
| `radar` | stretch: 1 row: this chart says little with fewer than 3. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"radar","label":"name","y":["aum","revenue"]}` |
| `ridgeline` | stretch: 1 row: this chart says little with fewer than 20. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"aum","group":"name"}` |
| `rose` | stretch: 1 row: this chart says little with fewer than 4. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"rose","label":"name","y":["aum","revenue"]}` |
| `scatter` | stretch: 1 row: this chart says little with fewer than 6. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"scatter","x":"aum","y":"revenue","label":"name"}` |
| `treemap` | stretch: 1 row: this chart says little with fewer than 4. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"treemap","label":"name","value":"aum"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `board` (It needs a stage or status column with a handful of values, and a name per row.); `bullet` (It needs a target, plan or budget column.); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (It needs open, high, low and close prices per period.); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `matrix` (It needs one row per pair of two categories, such as topic and quarter.); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (It needs one status (R, A, G) per entity per period.); `rings` (It needs a target, plan or budget column.); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (It needs one row per client and product with a state: held, an opportunity, or not eligible.).
