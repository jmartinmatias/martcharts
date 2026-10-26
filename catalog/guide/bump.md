# `bump` chart

Rank over time: in every period the series are ranked by value (highest first), and each series is one smooth line through its ranks, named at both ends. Shows who overtook whom, for example product ranking by month. Takes long data: one row per period and series.

## What it is for

- Ranking, top to bottom: best
- Trend over time: good

**Best for**

- How a ranking changes over time: products, teams, channels by month
- Who overtook whom

**Least useful for**

- When the size of the gaps matters, as ranks hide it (use line)
- More than about ten series, or only one period

## The data it needs

**One row is**: One row per combination of two categories, such as month and product.

**How the chart is built**: Rows are one per period and series; in each period the series are ranked by value and each series is a line through its ranks.

**Rows it reads well with**: 6 to any number.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `x` | date | yes | Field with the period, such as a month. Periods keep the order of the rows. |
| `series` | category | yes | Field naming the series being ranked, such as a product. |
| `value` | number | yes | Field the ranking is by; the highest value ranks 1. |

## This example's columns (3 columns, 36 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `month` (Month) | date | `x` | 6 different, e.g. "2026-04", "2026-05", "2026-06" |
| `product` (Product) | category | `series` | 6 different, e.g. "Platform", "Analytics", "Support" |
| `revenue` (Revenue) | number | `value` | 50000 to 146000 |

## The data drawing it now

| month | product | revenue |
| --- | --- | --- |
| 2026-04 | Platform | 120000 |
| 2026-04 | Analytics | 95000 |
| 2026-04 | Support | 80000 |
| 2026-04 | Integrations | 60000 |
| 2026-04 | Training | 55000 |
| 2026-04 | Consulting | 50000 |
| 2026-05 | Platform | 118000 |
| 2026-05 | Analytics | 102000 |
| 2026-05 | Support | 78000 |
| 2026-05 | Integrations | 66000 |
| 2026-05 | Training | 52000 |
| 2026-05 | Consulting | 58000 |
| 2026-06 | Platform | 119000 |
| 2026-06 | Analytics | 125000 |
| 2026-06 | Support | 81000 |
| 2026-06 | Integrations | 79000 |
| 2026-06 | Training | 50000 |
| 2026-06 | Consulting | 61000 |
| 2026-07 | Platform | 122000 |
| 2026-07 | Analytics | 131000 |
| 2026-07 | Support | 80000 |
| 2026-07 | Integrations | 88000 |
| 2026-07 | Training | 64000 |
| 2026-07 | Consulting | 59000 |
| 2026-08 | Platform | 120000 |
| 2026-08 | Analytics | 138000 |
| 2026-08 | Support | 79000 |
| 2026-08 | Integrations | 96000 |
| 2026-08 | Training | 71000 |
| 2026-08 | Consulting | 57000 |
| 2026-09 | Platform | 121000 |
| 2026-09 | Analytics | 146000 |
| 2026-09 | Support | 82000 |
| 2026-09 | Integrations | 124000 |
| 2026-09 | Training | 78000 |
| 2026-09 | Consulting | 55000 |

As CSV:

```csv
month,product,revenue
2026-04,Platform,120000
2026-04,Analytics,95000
2026-04,Support,80000
2026-04,Integrations,60000
2026-04,Training,55000
2026-04,Consulting,50000
2026-05,Platform,118000
2026-05,Analytics,102000
2026-05,Support,78000
2026-05,Integrations,66000
2026-05,Training,52000
2026-05,Consulting,58000
2026-06,Platform,119000
2026-06,Analytics,125000
2026-06,Support,81000
2026-06,Integrations,79000
2026-06,Training,50000
2026-06,Consulting,61000
2026-07,Platform,122000
2026-07,Analytics,131000
2026-07,Support,80000
2026-07,Integrations,88000
2026-07,Training,64000
2026-07,Consulting,59000
2026-08,Platform,120000
2026-08,Analytics,138000
2026-08,Support,79000
2026-08,Integrations,96000
2026-08,Training,71000
2026-08,Consulting,57000
2026-09,Platform,121000
2026-09,Analytics,146000
2026-09,Support,82000
2026-09,Integrations,124000
2026-09,Training,78000
2026-09,Consulting,55000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "product-ranking",
  "title": "Product ranking",
  "subtitle": "By monthly revenue, {first:month} to {last:month}",
  "description": "Where each product ranks by revenue every month. Analytics overtook Platform in June, and Integrations climbed from fourth to second.",
  "source": {
    "name": "Finance ledger"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "month": "2026-04",
        "product": "Platform",
        "revenue": 120000
      },
      {
        "month": "2026-04",
        "product": "Analytics",
        "revenue": 95000
      },
      {
        "month": "2026-04",
        "product": "Support",
        "revenue": 80000
      }
    ]
  },
  "fields": {
    "month": {
      "label": "Month",
      "format": {
        "type": "date",
        "style": "month"
      }
    },
    "product": {
      "label": "Product"
    },
    "revenue": {
      "label": "Revenue",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    }
  },
  "view": {
    "type": "bump",
    "x": "month",
    "series": "product",
    "value": "revenue",
    "highlight": [
      "Analytics",
      "Integrations"
    ]
  },
  "i18n": {
    "fr": {
      "title": "Classement des produits",
      "subtitle": "Par CA mensuel, {first:month} à {last:month}",
      "description": "Le rang de chaque produit par CA chaque mois. Analytics a dépassé Platform en juin, et Integrations est passé de quatrième à deuxième.",
      "source": {
        "name": "Grand livre"
      },
      "fields": {
        "month": {
          "label": "Mois"
        },
        "product": {
          "label": "Produit",
          "values": {
            "Platform": "Plateforme",
            "Analytics": "Analytique",
            "Support": "Support",
            "Integrations": "Intégrations",
            "Training": "Formation",
            "Consulting": "Conseil"
          }
        },
        "revenue": {
          "label": "Chiffre d'affaires"
        }
      }
    },
    "de": {
      "title": "Produktrangfolge",
      "subtitle": "Nach Monatsumsatz, {first:month} bis {last:month}",
      "description": "Rang jedes Produkts nach Umsatz in jedem Monat. Analytics überholte Platform im Juni, Integrations stieg von Platz vier auf zwei.",
      "source": {
        "name": "Hauptbuch"
      },
      "fields": {
        "month": {
          "label": "Monat"
        },
        "product": {
          "label": "Produkt",
          "values": {
            "Platform": "Plattform",
            "Analytics": "Analytik",
            "Support": "Support",
            "Integrations": "Integrationen",
            "Training": "Schulung",
            "Consulting": "Consulting"
          }
        },
        "revenue": {
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
| `boxplot` | fits | different | Answers a different question: better for how values spread and comparing amounts across categories, but gives up ranking, top to bottom. | `{"type":"boxplot","value":"revenue"}` |
| `ridgeline` | fits | different | Answers a different question: better for how values spread and comparing amounts across categories, but gives up ranking, top to bottom. | `{"type":"ridgeline","value":"revenue","group":"product"}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up ranking, top to bottom. | `{"type":"beeswarm","value":"revenue"}` |
| `histogram` | fits | different | Answers a different question: better for how values spread, but gives up ranking, top to bottom. | `{"type":"histogram","value":"revenue"}` |
| `kpi` | fits | different | Answers a different question: better for a headline number, but gives up ranking, top to bottom. | `{"type":"kpi","value":"revenue","x":"month"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up ranking, top to bottom. | `{"type":"table"}` |
| `heatmap` | fits | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"heatmap","x":"product","y":"month","value":"revenue"}` |
| `icicle` | fits | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"icicle","levels":"product","value":"revenue"}` |
| `kpis` | fits | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"revenue"}]}` |
| `marimekko` | fits | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"marimekko","x":"product","series":"month","value":"revenue"}` |
| `sunburst` | fits | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"product","value":"revenue"}` |
| `hbar` | stretch: "product" repeats (6 different values in 36 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 36 rows: this chart crowds past about 30. | better | Better for comparing amounts across categories, and still good for ranking, top to bottom. | `{"type":"hbar","label":"product","value":"revenue"}` |
| `pareto` | stretch: "product" repeats (6 different values in 36 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 36 rows: this chart crowds past about 25. | same | Keeps the job (ranking, top to bottom) with a different look. | `{"type":"pareto","label":"product","value":"revenue"}` |
| `bar` | stretch: "product" repeats (6 different values in 36 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 36 rows: this chart crowds past about 16. | trade-off | Better for comparing amounts across categories and how each group or period splits; weaker for ranking, top to bottom. | `{"type":"bar","x":"product","y":"revenue"}` |
| `list` | stretch: "product" repeats (6 different values in 36 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 36 rows: this chart crowds past about 20. | trade-off | Better for exact values and lookup; weaker for ranking, top to bottom. | `{"type":"list","label":"product","value":"revenue"}` |
| `area` | stretch: "month" repeats (6 different values in 36 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | different | Answers a different question: better for how each group or period splits and trend over time, but gives up ranking, top to bottom. | `{"type":"area","x":"month","y":"revenue"}` |
| `line` | stretch: "month" repeats (6 different values in 36 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | different | Answers a different question: better for comparing amounts across categories and actual against target or plan, but gives up ranking, top to bottom. Shows the size of each series and the gaps; rank changes are harder to see. | `{"type":"line","x":"month","y":"revenue"}` |
| `calendar` | stretch: "month" repeats (6 different values in 36 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"calendar","date":"month","value":"revenue"}` |
| `donut` | stretch: "product" repeats (6 different values in 36 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 36 rows: this chart crowds past about 6. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"donut","label":"product","value":"revenue"}` |
| `dot` | stretch: "product" repeats (6 different values in 36 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 36 rows: this chart crowds past about 30. | worse | Weaker for ranking, top to bottom, with nothing gained for this data. | `{"type":"dot","label":"product","value":"revenue"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 36 rows. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"gauge","value":"revenue"}` |
| `horizon` | stretch: "month" repeats (6 different values in 36 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"horizon","x":"month","y":"revenue"}` |
| `pie` | stretch: "product" repeats (6 different values in 36 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 36 rows: this chart crowds past about 6. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"pie","label":"product","value":"revenue"}` |
| `radar` | stretch: "product" repeats (6 different values in 36 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 36 rows: this chart crowds past about 12. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"radar","label":"product","y":"revenue"}` |
| `rose` | stretch: "product" repeats (6 different values in 36 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"rose","label":"product","y":"revenue"}` |
| `treemap` | stretch: "product" repeats (6 different values in 36 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"treemap","label":"product","value":"revenue"}` |
| `waffle` | stretch: "product" repeats (6 different values in 36 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 36 rows: this chart crowds past about 5. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"waffle","label":"product","value":"revenue"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `board` (It needs a stage or status column with a handful of values, and a name per row.); `bullet` (needs a separate column for target (it would reuse "revenue", already the value)); `candlestick` (needs a separate column for high (it would reuse "revenue", already the open)); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "revenue", already the y)); `dumbbell` (needs a separate column for to (it would reuse "revenue", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `matrix` (It needs one row per pair of two categories, such as topic and quarter.); `meter` (needs a separate column for target (it would reuse "revenue", already the value)); `pyramid` (needs a separate column for right (it would reuse "revenue", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for status (it would reuse "product", already the label)); `rings` (needs a separate column for target (it would reuse "revenue", already the value)); `sankey` (It needs flows from a source to a target.); `scatter` (needs a separate column for y (it would reuse "revenue", already the x)); `slope` (needs a separate column for to (it would reuse "revenue", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (It needs tasks with a start date.); `variance` (needs a separate column for target (it would reuse "revenue", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for state (it would reuse "product", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
