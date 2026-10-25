# `dumbbell` chart

Before and after per item on one shared axis: a muted dot for before, an accent dot for after, joined by a line (a range plot). With mark "arrow" the line becomes an arrow from the first value to the second (an arrow plot), blue when it rose and red when it fell. For this year against last year, by region.

## What it is for

- Change between two points: best
- Comparing amounts across categories: good
- Ranking, top to bottom: possible

**Best for**

- Before and after per item: this year against last per region, pre and post a change
- Showing the size of each gap

**Least useful for**

- More than two points in time (use line)
- Items on different scales

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One line per row from its from value (muted dot) to its to value (accent dot) on one shared axis.

**Rows it reads well with**: 2 to 20.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each row. |
| `from` | number | yes | Field with the before value. |
| `to` | number | yes | Field with the after value. |

## This example's columns (3 columns, 5 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `region` | category | `label` | 5 different, e.g. "East", "North", "Central" |
| `q3_2025` (Q3 2025) | number | `from` | 188000 to 291000 |
| `q3_2026` (Q3 2026) | number | `to` | 204000 to 338000 |

## The data drawing it now

| region | q3_2025 | q3_2026 |
| --- | --- | --- |
| East | 291000 | 338000 |
| North | 241000 | 278000 |
| Central | 233000 | 259000 |
| West | 188000 | 205000 |
| South | 226000 | 204000 |

As CSV:

```csv
region,q3_2025,q3_2026
East,291000,338000
North,241000,278000
Central,233000,259000
West,188000,205000
South,226000,204000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "region-yoy",
  "title": "Q3 revenue, year on year",
  "subtitle": "2025 against 2026, by region",
  "description": "Each region's Q3 revenue last year against this year.",
  "footer": "Source: finance ledger",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "region": "East",
        "q3_2025": 291000,
        "q3_2026": 338000
      },
      {
        "region": "North",
        "q3_2025": 241000,
        "q3_2026": 278000
      },
      {
        "region": "Central",
        "q3_2025": 233000,
        "q3_2026": 259000
      }
    ]
  },
  "fields": {
    "q3_2025": {
      "label": "Q3 2025",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "q3_2026": {
      "label": "Q3 2026",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    }
  },
  "view": {
    "type": "dumbbell",
    "label": "region",
    "from": "q3_2025",
    "to": "q3_2026"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `slope` | fits | better | Better for ranking, top to bottom, and still good for change between two points. Shows who swapped places more clearly; the gaps are harder to read past about ten items. | `{"type":"slope","label":"region","from":"q3_2025","to":"q3_2026"}` |
| `bar` | fits | different | Answers a different question: better for trend over time and how each group or period splits, but gives up change between two points. | `{"type":"bar","x":"region","y":["q3_2025","q3_2026"]}` |
| `dot` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up change between two points. Takes three or more measures per row; the before-to-after direction is no longer drawn. | `{"type":"dot","label":"region","value":["q3_2025","q3_2026"]}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up change between two points. | `{"type":"hbar","label":"region","value":["q3_2025","q3_2026"]}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up change between two points. | `{"type":"list","label":"region"}` |
| `donut` | fits | different | Answers a different question: better for share of one whole, but gives up change between two points. | `{"type":"donut","label":"region","value":"q3_2025"}` |
| `pie` | fits | different | Answers a different question: better for share of one whole, but gives up change between two points. | `{"type":"pie","label":"region","value":"q3_2025"}` |
| `radar` | fits | different | Answers a different question: better for profiles across several attributes, but gives up change between two points. | `{"type":"radar","label":"region","y":["q3_2025","q3_2026"]}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up change between two points. | `{"type":"table"}` |
| `icicle` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"icicle","levels":"region","value":"q3_2025"}` |
| `kpi` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"kpi","value":"q3_2025"}` |
| `kpis` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"q3_2025"},{"value":"q3_2026"}]}` |
| `pareto` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"pareto","label":"region","value":"q3_2025"}` |
| `rose` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"rose","label":"region","y":["q3_2025","q3_2026"]}` |
| `sunburst` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"region","value":"q3_2025"}` |
| `treemap` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"treemap","label":"region","value":"q3_2025"}` |
| `waffle` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"waffle","label":"region","value":"q3_2025"}` |
| `area` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"area","x":"region","y":["q3_2025","q3_2026"]}` |
| `beeswarm` | stretch: 5 rows: this chart says little with fewer than 10. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"q3_2025","label":"region"}` |
| `boxplot` | stretch: 5 rows: this chart says little with fewer than 15. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"boxplot","value":"q3_2025"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 5 rows. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"gauge","value":"q3_2025"}` |
| `histogram` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"histogram","value":"q3_2025"}` |
| `horizon` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. 5 rows: this chart says little with fewer than 10. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"horizon","x":"region","y":["q3_2025","q3_2026"]}` |
| `line` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"line","x":"region","y":["q3_2025","q3_2026"]}` |
| `ridgeline` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"q3_2025","group":"region"}` |
| `scatter` | stretch: 5 rows: this chart says little with fewer than 6. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"scatter","x":"q3_2025","y":"q3_2026","label":"region"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "region", already the x)); `board` (needs a separate column for stage (it would reuse "region", already the label)); `bullet` (It needs a target, plan or budget column.); `bump` (needs a separate column for series (it would reuse "region", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for low (it would reuse "q3_2025", already the open)); `chord` (needs a separate column for target (it would reuse "region", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "region", already the x)); `history` (needs a separate column for title (it would reuse "region", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "region", already the x)); `matrix` (needs a separate column for y (it would reuse "region", already the x)); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "region", already the label)); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "region", already the source)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "region", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
