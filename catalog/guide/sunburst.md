# `sunburst` chart

A hierarchy as rings: the inner ring splits the total by the first level, each outer ring splits its parent's slice by the next level, in lighter tints of the parent's color. The total sits in the middle. For two or three levels of part-to-whole, such as revenue by product and region.

## What it is for

- Nested breakdowns: best
- Share of one whole: good

**Best for**

- Two or three level part-to-whole: revenue by product, then region
- An overview that invites a closer look

**Least useful for**

- Precise comparisons (use icicle or hbar)
- Deep levels with long names (use icicle)

## The data it needs

**One row is**: One row per leaf of the hierarchy, its levels in columns from the top down.

**How the chart is built**: The inner ring splits the total by the first level; each outer ring splits its parent by the next level, by the sum of value.

**Rows it reads well with**: 4 to 120.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `levels` | category (one or more) | yes | Fields from the top level down, one ring each, for example ["product", "region"]. Up to 3. |
| `value` | number | yes | Field sizing the slices. Zero and negative values are left out. |

## This example's columns (3 columns, 15 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `product` (Product) | category | `levels` | 3 different, e.g. "Platform", "Analytics", "Services" |
| `region` (Region) | category | `levels` | 5 different, e.g. "East", "North", "Central" |
| `revenue` (Revenue) | number | `value` | 40000 to 160000 |

## The data drawing it now

| product | region | revenue |
| --- | --- | --- |
| Platform | East | 160000 |
| Analytics | East | 120000 |
| Services | East | 68000 |
| Platform | North | 110000 |
| Analytics | North | 98000 |
| Services | North | 74000 |
| Platform | Central | 90000 |
| Analytics | Central | 70000 |
| Services | Central | 99000 |
| Platform | West | 60000 |
| Analytics | West | 95000 |
| Services | West | 49000 |
| Platform | South | 100000 |
| Analytics | South | 40000 |
| Services | South | 64000 |

As CSV:

```csv
product,region,revenue
Platform,East,160000
Analytics,East,120000
Services,East,68000
Platform,North,110000
Analytics,North,98000
Services,North,74000
Platform,Central,90000
Analytics,Central,70000
Services,Central,99000
Platform,West,60000
Analytics,West,95000
Services,West,49000
Platform,South,100000
Analytics,South,40000
Services,South,64000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "product-region-sunburst",
  "title": "Revenue by product, then region",
  "subtitle": "Q3 2026",
  "description": "Q3 revenue split first by product, then each product by region. Platform leads; East is the largest region for Platform and Analytics, Central for Services.",
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
        "revenue": 68000
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
    "type": "sunburst",
    "levels": [
      "product",
      "region"
    ],
    "value": "revenue",
    "caption": "Q3 revenue"
  },
  "i18n": {
    "fr": {
      "title": "CA par produit, puis par région",
      "subtitle": "T3 2026",
      "description": "CA du T3 découpé par produit, puis chaque produit par région. Platform mène ; l'Est est la première région pour Platform et Analytics, le Centre pour Services.",
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
      },
      "view": {
        "caption": "CA du T3"
      }
    },
    "de": {
      "title": "Umsatz je Produkt, dann je Region",
      "description": "Umsatz Q3 zuerst nach Produkt, dann jedes Produkt nach Region. Platform führt; der Osten ist die größte Region für Platform und Analytics, die Mitte für Services.",
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
      },
      "view": {
        "caption": "Umsatz Q3"
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `icicle` | fits | same | Keeps the job (nested breakdowns) with a different look. Easier to read long names and compare sizes; less of a picture of the whole. | `{"type":"icicle","levels":["product","region"],"value":"revenue"}` |
| `marimekko` | fits | different | Answers a different question: better for how each group or period splits and comparing amounts across categories, but gives up nested breakdowns. | `{"type":"marimekko","x":"product","series":"region","value":"revenue"}` |
| `matrix` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle and comparing amounts across categories, but gives up nested breakdowns. | `{"type":"matrix","x":"product","y":"region"}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up nested breakdowns. | `{"type":"beeswarm","value":"revenue"}` |
| `heatmap` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up nested breakdowns. | `{"type":"heatmap","x":"product","y":"region","value":"revenue"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up nested breakdowns. | `{"type":"sankey","source":"product","target":"region","value":"revenue"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up nested breakdowns. | `{"type":"table"}` |
| `boxplot` | fits | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"boxplot","value":"revenue"}` |
| `kpi` | fits | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"kpi","value":"revenue"}` |
| `kpis` | fits | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"revenue"}]}` |
| `bar` | stretch: "product" repeats (3 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up nested breakdowns. | `{"type":"bar","x":"product","y":"revenue"}` |
| `hbar` | stretch: "product" repeats (3 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up nested breakdowns. | `{"type":"hbar","label":"product","value":"revenue"}` |
| `list` | stretch: "product" repeats (3 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up nested breakdowns. | `{"type":"list","label":"product","value":"revenue"}` |
| `pareto` | stretch: "product" repeats (3 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for ranking, top to bottom and what drives or moves a total, but gives up nested breakdowns. | `{"type":"pareto","label":"product","value":"revenue"}` |
| `area` | stretch: x expects dates; "product" is text, so its rows are drawn in the order given. "product" repeats (3 different values in 15 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"area","x":"product","y":"revenue"}` |
| `donut` | stretch: "product" repeats (3 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 15 rows: this chart crowds past about 6. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"donut","label":"product","value":"revenue"}` |
| `dot` | stretch: "product" repeats (3 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"dot","label":"product","value":"revenue"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 15 rows. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"gauge","value":"revenue"}` |
| `histogram` | stretch: 15 rows: this chart says little with fewer than 20. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"histogram","value":"revenue"}` |
| `horizon` | stretch: x expects dates; "product" is text, so its rows are drawn in the order given. "product" repeats (3 different values in 15 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"horizon","x":"product","y":"revenue"}` |
| `line` | stretch: x expects dates; "product" is text, so its rows are drawn in the order given. "product" repeats (3 different values in 15 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"line","x":"product","y":"revenue"}` |
| `pie` | stretch: "product" repeats (3 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 15 rows: this chart crowds past about 6. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"pie","label":"product","value":"revenue"}` |
| `radar` | stretch: "product" repeats (3 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 15 rows: this chart crowds past about 12. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"radar","label":"product","y":"revenue"}` |
| `ridgeline` | stretch: 15 rows: this chart says little with fewer than 20. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"revenue","group":"product"}` |
| `rose` | stretch: "product" repeats (3 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"rose","label":"product","y":"revenue"}` |
| `treemap` | stretch: "product" repeats (3 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Weaker for nested breakdowns, with nothing gained for this data. | `{"type":"treemap","label":"product","value":"revenue"}` |
| `waffle` | stretch: "product" repeats (3 different values in 15 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 15 rows: this chart crowds past about 5. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"waffle","label":"product","value":"revenue"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `board` (It needs a stage or status column with a handful of values, and a name per row.); `bullet` (needs a separate column for target (it would reuse "revenue", already the value)); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "revenue", already the open)); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "revenue", already the y)); `dumbbell` (needs a separate column for to (it would reuse "revenue", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `meter` (needs a separate column for target (it would reuse "revenue", already the value)); `pyramid` (needs a separate column for right (it would reuse "revenue", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for status (it would reuse "product", already the label)); `rings` (needs a separate column for target (it would reuse "revenue", already the value)); `scatter` (needs a separate column for y (it would reuse "revenue", already the x)); `slope` (needs a separate column for to (it would reuse "revenue", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "revenue", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for state (it would reuse "product", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
