# `dot` chart

A dot plot: one row per item and one dot per measure on one shared axis, with a hairline across each row. Several measures sit side by side in their series colors, so a row's spread and the ranking on any measure both read at once. For scores, rates or prices by item, with far less ink than bars.

## What it is for

- Comparing amounts across categories: best
- Ranking, top to bottom: good
- Exact values and lookup: possible
- Change between two points: possible

**Best for**

- Two to five measures of one kind per item: ease, value and support scores by product
- Rankings where the differences matter more than the amounts: prices, rates, scores
- Many rows with far less ink than bars

**Least useful for**

- Amounts where the length from zero matters (use hbar)
- Measures on different scales (use table or radar)
- Exactly a before and an after (use dumbbell)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One row per data row with a hairline across and one dot per values field at its value on one shared axis; one field writes its value beside the dot, several take series colors.

**Rows it reads well with**: 2 to 30.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each row. |
| `value` | number (one or more) | yes | Field or fields placed as dots on the axis. Each field is one series with its own color; one field writes its value beside the dot. Also accepts `values`, the older name. |

## This example's columns (4 columns, 6 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `product` (Product) | category | `label` | 6 different, e.g. "Enterprise", "Plus", "Core" |
| `ease` (Ease of use) | number | `value` | 6.5 to 8.9 |
| `value` (Value for money) | number | `value` | 6.2 to 8.8 |
| `support` (Support) | number | `value` | 6.4 to 9.1 |

## The data drawing it now

| product | ease | value | support |
| --- | --- | --- | --- |
| Enterprise | 7.1 | 6.2 | 9.1 |
| Plus | 8.2 | 7.4 | 8.3 |
| Core | 8.6 | 8.1 | 7.6 |
| Lite | 8.9 | 8.8 | 6.4 |
| Mobile | 7.8 | 8.4 | 7 |
| API | 6.5 | 7.9 | 8 |

As CSV:

```csv
product,ease,value,support
Enterprise,7.1,6.2,9.1
Plus,8.2,7.4,8.3
Core,8.6,8.1,7.6
Lite,8.9,8.8,6.4
Mobile,7.8,8.4,7
API,6.5,7.9,8
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "product-ratings",
  "title": "Customer ratings by product",
  "subtitle": "Ease of use, value for money and support, scored 1 to 10, Q3 2026",
  "description": "A dot plot: each product's three ratings on one scale, so a product's spread and the ranking on any rating read at once. Enterprise leads on support but trails on value; Lite is the mirror image.",
  "note": "2,140 answers",
  "source": {
    "name": "Quarterly customer survey"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "product": "Enterprise",
        "ease": 7.1,
        "value": 6.2,
        "support": 9.1
      },
      {
        "product": "Plus",
        "ease": 8.2,
        "value": 7.4,
        "support": 8.3
      },
      {
        "product": "Core",
        "ease": 8.6,
        "value": 8.1,
        "support": 7.6
      }
    ]
  },
  "fields": {
    "product": {
      "label": "Product"
    },
    "ease": {
      "label": "Ease of use",
      "format": {
        "type": "number",
        "decimals": 1
      }
    },
    "value": {
      "label": "Value for money",
      "format": {
        "type": "number",
        "decimals": 1
      }
    },
    "support": {
      "label": "Support",
      "format": {
        "type": "number",
        "decimals": 1
      }
    }
  },
  "view": {
    "type": "dot",
    "label": "product",
    "value": [
      "ease",
      "value",
      "support"
    ]
  },
  "i18n": {
    "fr": {
      "title": "Notes clients par produit",
      "subtitle": "Simplicité, rapport qualité-prix et support, notés de 1 à 10, T3 2026",
      "description": "Un graphique à points : les trois notes de chaque produit sur une même échelle, pour lire l'écart d'un produit et le classement sur chaque note. Enterprise mène en support mais traîne en rapport qualité-prix ; Lite est l'inverse.",
      "note": "2 140 réponses",
      "source": {
        "name": "Enquête clients trimestrielle"
      },
      "fields": {
        "product": {
          "label": "Produit",
          "values": {
            "Enterprise": "Grandes entreprises",
            "Core": "Cœur"
          }
        },
        "ease": {
          "label": "Simplicité"
        },
        "value": {
          "label": "Rapport qualité-prix"
        }
      }
    },
    "de": {
      "title": "Kundenbewertungen je Produkt",
      "subtitle": "Bedienung, Preis-Leistung und Support, 1 bis 10, Q3 2026",
      "description": "Ein Punktdiagramm: die drei Bewertungen jedes Produkts auf einer Skala, sodass Streuung und Rangfolge sofort lesbar sind. Enterprise führt beim Support, liegt aber beim Preis-Leistungs-Verhältnis zurück; Lite ist das Spiegelbild.",
      "note": "2.140 Antworten",
      "source": {
        "name": "Vierteljährliche Kundenumfrage"
      },
      "fields": {
        "product": {
          "label": "Produkt",
          "values": {
            "Enterprise": "Großunternehmen",
            "Core": "Kern"
          }
        },
        "ease": {
          "label": "Bedienung"
        },
        "value": {
          "label": "Preis-Leistung"
        }
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `bar` | fits | better | Better for trend over time and how each group or period splits, and still good for comparing amounts across categories. | `{"type":"bar","x":"product","y":["ease","value"]}` |
| `hbar` | fits | better | Better for ranking, top to bottom, and still good for comparing amounts across categories. Amounts read as lengths from zero, which is more familiar; small differences flatten out. | `{"type":"hbar","label":"product","value":["ease","value"]}` |
| `radar` | fits | trade-off | Better for profiles across several attributes; weaker for comparing amounts across categories. | `{"type":"radar","label":"product","y":["ease","value"]}` |
| `donut` | fits | different | Answers a different question: better for share of one whole, but gives up comparing amounts across categories. | `{"type":"donut","label":"product","value":"ease"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup, but gives up comparing amounts across categories. | `{"type":"list","label":"product"}` |
| `pie` | fits | different | Answers a different question: better for share of one whole, but gives up comparing amounts across categories. | `{"type":"pie","label":"product","value":"ease"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up comparing amounts across categories. | `{"type":"table"}` |
| `icicle` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"icicle","levels":"product","value":"ease"}` |
| `kpi` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"kpi","value":"ease"}` |
| `kpis` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"ease"},{"value":"value"},{"value":"support"}]}` |
| `pareto` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"pareto","label":"product","value":"ease"}` |
| `rose` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"rose","label":"product","y":["ease","value"]}` |
| `scatter` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"scatter","x":"ease","y":"value","label":"product"}` |
| `sunburst` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"product","value":"ease"}` |
| `treemap` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"treemap","label":"product","value":"ease"}` |
| `area` | stretch: x expects dates; "product" is text, so its rows are drawn in the order given. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"area","x":"product","y":["ease","value"]}` |
| `beeswarm` | stretch: 6 rows: this chart says little with fewer than 10. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"ease","label":"product"}` |
| `boxplot` | stretch: 6 rows: this chart says little with fewer than 15. | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"boxplot","value":"ease"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 6 rows. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"gauge","value":"ease"}` |
| `histogram` | stretch: 6 rows: this chart says little with fewer than 20. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"histogram","value":"ease"}` |
| `horizon` | stretch: x expects dates; "product" is text, so its rows are drawn in the order given. 6 rows: this chart says little with fewer than 10. | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"horizon","x":"product","y":["ease","value"]}` |
| `line` | stretch: x expects dates; "product" is text, so its rows are drawn in the order given. | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"line","x":"product","y":["ease","value"]}` |
| `ridgeline` | stretch: 6 rows: this chart says little with fewer than 20. | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"ridgeline","value":"ease","group":"product"}` |
| `waffle` | stretch: 6 rows: this chart crowds past about 5. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"waffle","label":"product","value":"ease"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "product", already the x)); `board` (needs a separate column for stage (it would reuse "product", already the label)); `bullet` (It needs a target, plan or budget column.); `bump` (needs a separate column for series (it would reuse "product", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for close (it would reuse "ease", already the open)); `chord` (needs a separate column for target (it would reuse "product", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "product", already the x)); `history` (needs a separate column for title (it would reuse "product", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "product", already the x)); `matrix` (needs a separate column for y (it would reuse "product", already the x)); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "product", already the label)); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "product", already the source)); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "product", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
