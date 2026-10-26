# `funnel` chart

Stages in order as centered bars narrowing from the first, with the conversion rate from each stage to the next and each stage's share of the first.

## What it is for

- Conversion through ordered steps: best
- Comparing amounts across categories: possible
- Flows between stages or groups: possible

**Best for**

- Conversion through ordered steps: visit, sign-up, trial, paid
- Where most people drop out of a pipeline

**Least useful for**

- Categories with no order (use hbar)
- Stages that can grow from one to the next

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One stage per row, in row order, as centered bars as wide as value, with the rate from each stage to the next.

**Rows it reads well with**: 3 to 8.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each stage. |
| `value` | number | yes | Field with how many reached each stage. |

## This example's columns (2 columns, 5 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `stage` | category | `label` | 5 different, e.g. "Visits", "Signups", "Activated" |
| `people` (People) | number | `value` | 412 to 48200 |

## The data drawing it now

| stage | people |
| --- | --- |
| Visits | 48200 |
| Signups | 6120 |
| Activated | 3310 |
| Trial started | 1480 |
| Paying | 412 |

As CSV:

```csv
stage,people
Visits,48200
Signups,6120
Activated,3310
Trial started,1480
Paying,412
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "signup-funnel",
  "title": "Signup funnel",
  "subtitle": "September 2026",
  "description": "How visitors move from first visit to paying customer.",
  "source": {
    "name": "Product analytics"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "stage": "Visits",
        "people": 48200
      },
      {
        "stage": "Signups",
        "people": 6120
      },
      {
        "stage": "Activated",
        "people": 3310
      }
    ]
  },
  "fields": {
    "people": {
      "label": "People",
      "format": "number"
    }
  },
  "view": {
    "type": "funnel",
    "label": "stage",
    "value": "people"
  },
  "i18n": {
    "fr": {
      "title": "Tunnel d'inscription",
      "subtitle": "Septembre 2026",
      "description": "Comment les visiteurs passent de la première visite au client payant.",
      "source": {
        "name": "Analyse produit"
      },
      "fields": {
        "people": {
          "label": "Personnes"
        }
      }
    },
    "de": {
      "title": "Anmelde-Trichter",
      "description": "Wie Besucher vom ersten Besuch zum zahlenden Kunden werden.",
      "source": {
        "name": "Produktanalyse"
      },
      "fields": {
        "people": {
          "label": "Personen"
        }
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `bar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up conversion through ordered steps. | `{"type":"bar","x":"stage","y":"people"}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up conversion through ordered steps. Drops the step-to-step conversion rates; only better if the stages have no order. | `{"type":"hbar","label":"stage","value":"people"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up conversion through ordered steps. | `{"type":"list","label":"stage","value":"people"}` |
| `pareto` | fits | different | Answers a different question: better for ranking, top to bottom and what drives or moves a total, but gives up conversion through ordered steps. | `{"type":"pareto","label":"stage","value":"people"}` |
| `donut` | fits | different | Answers a different question: better for share of one whole, but gives up conversion through ordered steps. | `{"type":"donut","label":"stage","value":"people"}` |
| `pie` | fits | different | Answers a different question: better for share of one whole, but gives up conversion through ordered steps. | `{"type":"pie","label":"stage","value":"people"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up conversion through ordered steps. | `{"type":"table"}` |
| `dot` | fits | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"dot","label":"stage","value":"people"}` |
| `icicle` | fits | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"icicle","levels":"stage","value":"people"}` |
| `kpi` | fits | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"kpi","value":"people"}` |
| `kpis` | fits | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"people"}]}` |
| `radar` | fits | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"radar","label":"stage","y":"people"}` |
| `rose` | fits | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"rose","label":"stage","y":"people"}` |
| `sunburst` | fits | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"stage","value":"people"}` |
| `treemap` | fits | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"treemap","label":"stage","value":"people"}` |
| `waffle` | fits | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"waffle","label":"stage","value":"people"}` |
| `area` | stretch: x expects dates; "stage" is text, so its rows are drawn in the order given. | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"area","x":"stage","y":"people"}` |
| `beeswarm` | stretch: 5 rows: this chart says little with fewer than 10. | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"people","label":"stage"}` |
| `boxplot` | stretch: 5 rows: this chart says little with fewer than 15. | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"boxplot","value":"people"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 5 rows. | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"gauge","value":"people"}` |
| `histogram` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"histogram","value":"people"}` |
| `horizon` | stretch: x expects dates; "stage" is text, so its rows are drawn in the order given. 5 rows: this chart says little with fewer than 10. | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"horizon","x":"stage","y":"people"}` |
| `line` | stretch: x expects dates; "stage" is text, so its rows are drawn in the order given. | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"line","x":"stage","y":"people"}` |
| `ridgeline` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up conversion through ordered steps, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"people","group":"stage"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "stage", already the x)); `board` (needs a separate column for stage (it would reuse "stage", already the label)); `bullet` (needs a separate column for target (it would reuse "people", already the value)); `bump` (needs a separate column for series (it would reuse "stage", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "people", already the open)); `chord` (needs a separate column for target (it would reuse "stage", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "people", already the y)); `dumbbell` (needs a separate column for to (it would reuse "people", already the from)); `heatmap` (needs a separate column for y (it would reuse "stage", already the x)); `history` (needs a separate column for title (it would reuse "stage", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "stage", already the x)); `matrix` (needs a separate column for y (it would reuse "stage", already the x)); `meter` (needs a separate column for target (it would reuse "people", already the value)); `pyramid` (needs a separate column for right (it would reuse "people", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "stage", already the label)); `rings` (needs a separate column for target (it would reuse "people", already the value)); `sankey` (needs a separate column for target (it would reuse "stage", already the source)); `scatter` (needs a separate column for y (it would reuse "people", already the x)); `slope` (needs a separate column for to (it would reuse "people", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "people", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "stage", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
