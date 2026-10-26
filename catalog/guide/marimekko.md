# `marimekko` chart

A mosaic: one column per category, as wide as its total, split into segments by each series' share of that column. Shows market size and mix at once, for example revenue by region and product. Takes long data: one row per column and series.

## What it is for

- How each group or period splits: best
- Share of one whole: good
- Comparing amounts across categories: good

**Best for**

- Market maps: how big each segment is and how it splits (region by product)
- Sizing opportunities in strategy reviews

**Least useful for**

- Many small segments
- Precise values (use table)
- Audiences new to mosaics (use bar stacked)

## The data it needs

**One row is**: One row per combination of two categories, such as month and product.

**How the chart is built**: One column per x category, as wide as its total; each column is split by series into segments as tall as their share.

**Rows it reads well with**: 4 to 60.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `x` | category | yes | Field naming each column, such as a region. Columns keep the order of the rows. |
| `series` | category | yes | Field naming the segments inside each column, such as a product. |
| `value` | number | yes | Numeric field sizing the segments; a column's width is the sum of its values. |

## This example's columns (3 columns, 15 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `region` (Region) | category | `x` | 5 different, e.g. "East", "North", "Central" |
| `product` (Product) | category | `series` | 3 different, e.g. "Platform", "Analytics", "Services" |
| `revenue` (Revenue) | number | `value` | 40000 to 160000 |

## The data drawing it now

| region | product | revenue |
| --- | --- | --- |
| East | Platform | 160000 |
| East | Analytics | 120000 |
| East | Services | 58000 |
| North | Platform | 110000 |
| North | Analytics | 98000 |
| North | Services | 70000 |
| Central | Platform | 90000 |
| Central | Analytics | 70000 |
| Central | Services | 99000 |
| West | Platform | 60000 |
| West | Analytics | 95000 |
| West | Services | 50000 |
| South | Platform | 100000 |
| South | Analytics | 40000 |
| South | Services | 64000 |

As CSV:

```csv
region,product,revenue
East,Platform,160000
East,Analytics,120000
East,Services,58000
North,Platform,110000
North,Analytics,98000
North,Services,70000
Central,Platform,90000
Central,Analytics,70000
Central,Services,99000
West,Platform,60000
West,Analytics,95000
West,Services,50000
South,Platform,100000
South,Analytics,40000
South,Services,64000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "region-product-mix",
  "title": "Market size and mix",
  "subtitle": "September 2026 revenue, by region and product",
  "description": "Each region's September revenue as a column as wide as its share of the total, split by product share. East is the biggest market.",
  "source": {
    "name": "Finance ledger"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "region": "East",
        "product": "Platform",
        "revenue": 160000
      },
      {
        "region": "East",
        "product": "Analytics",
        "revenue": 120000
      },
      {
        "region": "East",
        "product": "Services",
        "revenue": 58000
      }
    ]
  },
  "fields": {
    "region": {
      "label": "Region"
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
    "type": "marimekko",
    "x": "region",
    "series": "product",
    "value": "revenue"
  },
  "i18n": {
    "fr": {
      "title": "Taille et mix du marché",
      "subtitle": "CA de septembre 2026, par région et produit",
      "description": "Le CA de septembre de chaque région en colonne aussi large que sa part du total, découpée par produit. L'Est est le premier marché.",
      "source": {
        "name": "Grand livre"
      },
      "fields": {
        "region": {
          "label": "Région"
        },
        "product": {
          "label": "Produit"
        },
        "revenue": {
          "label": "Chiffre d'affaires"
        }
      }
    },
    "de": {
      "title": "Marktgröße und Mix",
      "subtitle": "Umsatz September 2026, nach Region und Produkt",
      "description": "Septemberumsatz jeder Region als Säule so breit wie ihr Anteil, nach Produkt geteilt. Der Osten ist der größte Markt.",
      "source": {
        "name": "Hauptbuch"
      },
      "fields": {
        "product": {
          "label": "Produkt"
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
| `matrix` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle and exact values and lookup, but gives up how each group or period splits. | `{"type":"matrix","x":"region","y":"product"}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up how each group or period splits. | `{"type":"beeswarm","value":"revenue"}` |
| `heatmap` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up how each group or period splits. | `{"type":"heatmap","x":"region","y":"product","value":"revenue"}` |
| `icicle` | fits | different | Answers a different question: better for nested breakdowns, but gives up how each group or period splits. | `{"type":"icicle","levels":["region","product"],"value":"revenue"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up how each group or period splits. | `{"type":"sankey","source":"region","target":"product","value":"revenue"}` |
| `sunburst` | fits | different | Answers a different question: better for nested breakdowns, but gives up how each group or period splits. | `{"type":"sunburst","levels":["region","product"],"value":"revenue"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up how each group or period splits. | `{"type":"table"}` |
| `boxplot` | fits | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"boxplot","value":"revenue"}` |
| `kpis` | fits | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"revenue"}]}` |
| `bar` | stretch: "region" repeats (5 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | trade-off | Better for ranking, top to bottom and trend over time; weaker for how each group or period splits. | `{"type":"bar","x":"region","y":"revenue"}` |
| `hbar` | stretch: "region" repeats (5 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up how each group or period splits. | `{"type":"hbar","label":"region","value":"revenue"}` |
| `list` | stretch: "region" repeats (5 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up how each group or period splits. | `{"type":"list","label":"region","value":"revenue"}` |
| `pareto` | stretch: "region" repeats (5 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for ranking, top to bottom and what drives or moves a total, but gives up how each group or period splits. | `{"type":"pareto","label":"region","value":"revenue"}` |
| `area` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. "region" repeats (5 different values in 15 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Weaker for how each group or period splits, with nothing gained for this data. | `{"type":"area","x":"region","y":"revenue"}` |
| `donut` | stretch: "region" repeats (5 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 15 rows: this chart crowds past about 6. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"donut","label":"region","value":"revenue"}` |
| `dot` | stretch: "region" repeats (5 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"dot","label":"region","value":"revenue"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 15 rows. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"gauge","value":"revenue"}` |
| `histogram` | stretch: 15 rows: this chart says little with fewer than 20. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"histogram","value":"revenue"}` |
| `horizon` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. "region" repeats (5 different values in 15 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"horizon","x":"region","y":"revenue"}` |
| `kpi` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"kpi","value":"revenue","x":"region"}` |
| `line` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. "region" repeats (5 different values in 15 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"line","x":"region","y":"revenue"}` |
| `pie` | stretch: "region" repeats (5 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 15 rows: this chart crowds past about 6. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"pie","label":"region","value":"revenue"}` |
| `radar` | stretch: "region" repeats (5 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 15 rows: this chart crowds past about 12. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"radar","label":"region","y":"revenue"}` |
| `ridgeline` | stretch: 15 rows: this chart says little with fewer than 20. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"revenue","group":"region"}` |
| `rose` | stretch: "region" repeats (5 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"rose","label":"region","y":"revenue"}` |
| `treemap` | stretch: "region" repeats (5 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"treemap","label":"region","value":"revenue"}` |
| `waffle` | stretch: "region" repeats (5 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 15 rows: this chart crowds past about 5. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"waffle","label":"region","value":"revenue"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `board` (It needs a stage or status column with a handful of values, and a name per row.); `bullet` (needs a separate column for target (it would reuse "revenue", already the value)); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "revenue", already the open)); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "revenue", already the y)); `dumbbell` (needs a separate column for to (it would reuse "revenue", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `meter` (needs a separate column for target (it would reuse "revenue", already the value)); `pyramid` (needs a separate column for right (it would reuse "revenue", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for status (it would reuse "region", already the label)); `rings` (needs a separate column for target (it would reuse "revenue", already the value)); `scatter` (needs a separate column for y (it would reuse "revenue", already the x)); `slope` (needs a separate column for to (it would reuse "revenue", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "revenue", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for state (it would reuse "region", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
