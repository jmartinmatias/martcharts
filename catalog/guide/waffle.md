# `waffle` chart

Part to whole as a 10 by 10 grid where each square is one percent, filled category by category in reading order, with a legend of values and shares. Easier to count than a pie. With total, the share of a whole: 62 of 100 squares filled.

## What it is for

- Share of one whole: best
- A headline number: possible

**Best for**

- One share people grasp at once: 37% of revenue is online
- Two to five parts for a general audience

**Least useful for**

- Many parts or shares under 1%
- Comparing several wholes (use bar stacked to percent)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: A 10 by 10 grid, one square per percent, filled category by category in row order.

**Rows it reads well with**: 1 to 5.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each category. |
| `value` | number | yes | Field with each category's amount. Zero and negative values are left out. |

## This example's columns (2 columns, 4 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `source` | category | `label` | 4 different, e.g. "Subscriptions", "Services", "Licenses" |
| `revenue` (Revenue) | number | `value` | 42000 to 802000 |

## The data drawing it now

| source | revenue |
| --- | --- |
| Subscriptions | 802000 |
| Services | 298000 |
| Licenses | 142000 |
| Other | 42000 |

As CSV:

```csv
source,revenue
Subscriptions,802000
Services,298000
Licenses,142000
Other,42000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "revenue-sources",
  "title": "Where revenue comes from",
  "subtitle": "September 2026, in percent",
  "description": "September revenue by source. Subscriptions bring in 62 of every 100 euros.",
  "source": {
    "name": "Finance ledger"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "source": "Subscriptions",
        "revenue": 802000
      },
      {
        "source": "Services",
        "revenue": 298000
      },
      {
        "source": "Licenses",
        "revenue": 142000
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
    }
  },
  "view": {
    "type": "waffle",
    "label": "source",
    "value": "revenue"
  },
  "i18n": {
    "fr": {
      "title": "D'où vient le CA",
      "subtitle": "Septembre 2026, en pourcentage",
      "description": "CA de septembre par source. Les abonnements apportent 62 euros sur 100.",
      "source": {
        "name": "Grand livre"
      },
      "fields": {
        "revenue": {
          "label": "Chiffre d'affaires"
        }
      }
    },
    "de": {
      "title": "Woher der Umsatz kommt",
      "subtitle": "September 2026, in Prozent",
      "description": "Septemberumsatz nach Quelle. Abos bringen 62 von 100 Euro.",
      "source": {
        "name": "Hauptbuch"
      },
      "fields": {
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
| `donut` | fits | same | Keeps the job (share of one whole) with a different look. Adds the total in the middle; the shares are harder to count. | `{"type":"donut","label":"source","value":"revenue"}` |
| `pie` | fits | same | Keeps the job (share of one whole) with a different look. | `{"type":"pie","label":"source","value":"revenue"}` |
| `treemap` | fits | same | Keeps the job (share of one whole) with a different look. | `{"type":"treemap","label":"source","value":"revenue"}` |
| `bar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up share of one whole. | `{"type":"bar","x":"source","y":"revenue"}` |
| `hbar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up share of one whole. | `{"type":"hbar","label":"source","value":"revenue"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up share of one whole. | `{"type":"list","label":"source","value":"revenue"}` |
| `funnel` | fits | different | Answers a different question: better for conversion through ordered steps, but gives up share of one whole. | `{"type":"funnel","label":"source","value":"revenue"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up share of one whole. | `{"type":"table"}` |
| `dot` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"dot","label":"source","value":"revenue"}` |
| `icicle` | fits | worse | Weaker for share of one whole, with nothing gained for this data. | `{"type":"icicle","levels":"source","value":"revenue"}` |
| `kpi` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"kpi","value":"revenue"}` |
| `kpis` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"revenue"}]}` |
| `pareto` | fits | worse | Weaker for share of one whole, with nothing gained for this data. | `{"type":"pareto","label":"source","value":"revenue"}` |
| `radar` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"radar","label":"source","y":"revenue"}` |
| `rose` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"rose","label":"source","y":"revenue"}` |
| `sunburst` | fits | worse | Weaker for share of one whole, with nothing gained for this data. | `{"type":"sunburst","levels":"source","value":"revenue"}` |
| `area` | stretch: x expects dates; "source" is text, so its rows are drawn in the order given. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"area","x":"source","y":"revenue"}` |
| `beeswarm` | stretch: 4 rows: this chart says little with fewer than 10. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"revenue","label":"source"}` |
| `boxplot` | stretch: 4 rows: this chart says little with fewer than 15. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"boxplot","value":"revenue"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 4 rows. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"gauge","value":"revenue"}` |
| `histogram` | stretch: 4 rows: this chart says little with fewer than 20. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"histogram","value":"revenue"}` |
| `horizon` | stretch: x expects dates; "source" is text, so its rows are drawn in the order given. 4 rows: this chart says little with fewer than 10. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"horizon","x":"source","y":"revenue"}` |
| `line` | stretch: x expects dates; "source" is text, so its rows are drawn in the order given. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"line","x":"source","y":"revenue"}` |
| `ridgeline` | stretch: 4 rows: this chart says little with fewer than 20. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"revenue","group":"source"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "source", already the x)); `board` (needs a separate column for stage (it would reuse "source", already the label)); `bullet` (needs a separate column for target (it would reuse "revenue", already the value)); `bump` (needs a separate column for series (it would reuse "source", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "revenue", already the open)); `chord` (needs a separate column for target (it would reuse "source", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "revenue", already the y)); `dumbbell` (needs a separate column for to (it would reuse "revenue", already the from)); `heatmap` (needs a separate column for y (it would reuse "source", already the x)); `history` (needs a separate column for title (it would reuse "source", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "source", already the x)); `matrix` (needs a separate column for y (it would reuse "source", already the x)); `meter` (needs a separate column for target (it would reuse "revenue", already the value)); `pyramid` (needs a separate column for right (it would reuse "revenue", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "source", already the label)); `rings` (needs a separate column for target (it would reuse "revenue", already the value)); `sankey` (needs a separate column for target (it would reuse "source", already the source)); `scatter` (needs a separate column for y (it would reuse "revenue", already the x)); `slope` (needs a separate column for to (it would reuse "revenue", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "revenue", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "source", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
