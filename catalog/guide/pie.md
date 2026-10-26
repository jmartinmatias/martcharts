# `pie` chart

Part-to-whole as a full disc: up to 6 slices from twelve o'clock clockwise, each wide in proportion to its share, with the shares written on the slices and a legend of values. Use a donut when the total matters too, and a bar chart to compare close shares.

## What it is for

- Share of one whole: best
- Comparing amounts across categories: possible

**Best for**

- Share of one whole with two to five parts, where the shares themselves are the point: votes, market share
- Small multiples of one split per group (facet), the same part in the same color everywhere

**Least useful for**

- More than six parts or close values (use hbar)
- When the total matters too (use donut)
- Change over time (use area)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One wedge per row from twelve o'clock clockwise, its angle its share of the sum of value, the share written on it.

**Rows it reads well with**: 2 to 6.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each slice. |
| `value` | number | yes | Field with each slice's amount. Zero, negative and missing values are left out. |

## This example's columns (2 columns, 4 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `segment` | category | `label` | 4 different, e.g. "Enterprise", "Mid-market", "Small business" |
| `revenue` (Revenue) | number | `value` | 97600 to 660100 |

## The data drawing it now

| segment | revenue |
| --- | --- |
| Enterprise | 660100 |
| Mid-market | 447000 |
| Small business | 212400 |
| Public sector | 97600 |

As CSV:

```csv
segment,revenue
Enterprise,660100
Mid-market,447000
Small business,212400
Public sector,97600
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "revenue-pie",
  "title": "Where Q3 revenue came from",
  "subtitle": "Share by segment, Q3 2026",
  "description": "Each segment's slice of the quarter's revenue: the shares on the slices, the amounts in the legend.",
  "source": {
    "name": "Finance ledger"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "segment": "Enterprise",
        "revenue": 660100
      },
      {
        "segment": "Mid-market",
        "revenue": 447000
      },
      {
        "segment": "Small business",
        "revenue": 212400
      }
    ]
  },
  "fields": {
    "revenue": {
      "label": "Revenue",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "segment": {}
  },
  "view": {
    "type": "pie",
    "label": "segment",
    "value": "revenue"
  },
  "i18n": {
    "fr": {
      "title": "D'où vient le CA du T3",
      "subtitle": "Part par segment, T3 2026",
      "description": "La part de chaque segment dans le CA du trimestre : les parts sur les tranches, les montants dans la légende.",
      "source": {
        "name": "Grand livre"
      },
      "fields": {
        "revenue": {
          "label": "Chiffre d'affaires"
        },
        "segment": {
          "values": {
            "Enterprise": "Grandes entreprises",
            "Mid-market": "ETI",
            "Small business": "Petites entreprises",
            "Public sector": "Secteur public"
          }
        }
      }
    },
    "de": {
      "title": "Woher der Q3-Umsatz kam",
      "subtitle": "Anteil nach Segment, Q3 2026",
      "description": "Der Anteil jedes Segments am Quartalsumsatz: Anteile auf den Stücken, Beträge in der Legende.",
      "source": {
        "name": "Hauptbuch"
      },
      "fields": {
        "revenue": {
          "label": "Umsatz"
        },
        "segment": {
          "values": {
            "Enterprise": "Großunternehmen",
            "Mid-market": "Mittelstand",
            "Small business": "Kleinunternehmen",
            "Public sector": "Öffentlicher Sektor"
          }
        }
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `donut` | fits | same | Keeps the job (share of one whole) with a different look. Puts the total in the middle; the slices read the same. | `{"type":"donut","label":"segment","value":"revenue"}` |
| `treemap` | fits | same | Keeps the job (share of one whole) with a different look. | `{"type":"treemap","label":"segment","value":"revenue"}` |
| `waffle` | fits | same | Keeps the job (share of one whole) with a different look. | `{"type":"waffle","label":"segment","value":"revenue"}` |
| `bar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up share of one whole. | `{"type":"bar","x":"segment","y":"revenue"}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up share of one whole. Easier to compare close shares and to rank them; the sense of one whole is weaker. | `{"type":"hbar","label":"segment","value":"revenue"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up share of one whole. | `{"type":"list","label":"segment","value":"revenue"}` |
| `funnel` | fits | different | Answers a different question: better for conversion through ordered steps, but gives up share of one whole. | `{"type":"funnel","label":"segment","value":"revenue"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up share of one whole. | `{"type":"table"}` |
| `dot` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"dot","label":"segment","value":"revenue"}` |
| `icicle` | fits | worse | Weaker for share of one whole, with nothing gained for this data. | `{"type":"icicle","levels":"segment","value":"revenue"}` |
| `kpi` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"kpi","value":"revenue"}` |
| `kpis` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"revenue"}]}` |
| `pareto` | fits | worse | Weaker for share of one whole, with nothing gained for this data. | `{"type":"pareto","label":"segment","value":"revenue"}` |
| `radar` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"radar","label":"segment","y":"revenue"}` |
| `rose` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"rose","label":"segment","y":"revenue"}` |
| `sunburst` | fits | worse | Weaker for share of one whole, with nothing gained for this data. | `{"type":"sunburst","levels":"segment","value":"revenue"}` |
| `area` | stretch: x expects dates; "segment" is text, so its rows are drawn in the order given. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"area","x":"segment","y":"revenue"}` |
| `beeswarm` | stretch: 4 rows: this chart says little with fewer than 10. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"revenue","label":"segment"}` |
| `boxplot` | stretch: 4 rows: this chart says little with fewer than 15. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"boxplot","value":"revenue"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 4 rows. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"gauge","value":"revenue"}` |
| `histogram` | stretch: 4 rows: this chart says little with fewer than 20. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"histogram","value":"revenue"}` |
| `horizon` | stretch: x expects dates; "segment" is text, so its rows are drawn in the order given. 4 rows: this chart says little with fewer than 10. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"horizon","x":"segment","y":"revenue"}` |
| `line` | stretch: x expects dates; "segment" is text, so its rows are drawn in the order given. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"line","x":"segment","y":"revenue"}` |
| `ridgeline` | stretch: 4 rows: this chart says little with fewer than 20. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"revenue","group":"segment"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "segment", already the x)); `board` (needs a separate column for stage (it would reuse "segment", already the label)); `bullet` (needs a separate column for target (it would reuse "revenue", already the value)); `bump` (needs a separate column for series (it would reuse "segment", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "revenue", already the open)); `chord` (needs a separate column for target (it would reuse "segment", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "revenue", already the y)); `dumbbell` (needs a separate column for to (it would reuse "revenue", already the from)); `heatmap` (needs a separate column for y (it would reuse "segment", already the x)); `history` (needs a separate column for title (it would reuse "segment", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "segment", already the x)); `matrix` (needs a separate column for y (it would reuse "segment", already the x)); `meter` (needs a separate column for target (it would reuse "revenue", already the value)); `pyramid` (needs a separate column for right (it would reuse "revenue", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "segment", already the label)); `rings` (needs a separate column for target (it would reuse "revenue", already the value)); `sankey` (needs a separate column for target (it would reuse "segment", already the source)); `scatter` (needs a separate column for y (it would reuse "revenue", already the x)); `slope` (needs a separate column for to (it would reuse "revenue", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "revenue", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "segment", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
