# `slope` chart

Each item's move between two points in time, as a line from a left column to a right one on one shared scale. Rises and falls take the up and down colors, and the steepest lines are the biggest movers. For rank and change between two periods.

## What it is for

- Change between two points: best
- Ranking, top to bottom: good

**Best for**

- Two points in time: H1 against H2, last year against this
- Seeing who rose, who fell and who swapped places

**Least useful for**

- More than two periods (use line or bump)
- More than about 15 items, where lines tangle (use dumbbell)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One line per row from its from value on the left to its to value on the right, on one shared scale.

**Rows it reads well with**: 2 to 15.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each row. |
| `from` | number | yes | Field with the earlier value (left column). |
| `to` | number | yes | Field with the later value (right column). |

## This example's columns (3 columns, 5 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `region` | category | `label` | 5 different, e.g. "East", "Central", "North" |
| `h1` (H1 2026) | number | `from` | 0.22 to 0.34 |
| `h2` (H2 2026) | number | `to` | 0.21 to 0.36 |

## The data drawing it now

| region | h1 | h2 |
| --- | --- | --- |
| East | 0.31 | 0.36 |
| Central | 0.34 | 0.29 |
| North | 0.28 | 0.33 |
| West | 0.22 | 0.28 |
| South | 0.26 | 0.21 |

As CSV:

```csv
region,h1,h2
East,0.31,0.36
Central,0.34,0.29
North,0.28,0.33
West,0.22,0.28
South,0.26,0.21
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "region-win-rate",
  "title": "Win rate by region",
  "subtitle": "First half against second half, 2026",
  "description": "Share of qualified deals won in each region, first half against second half of 2026.",
  "footer": "Source: CRM",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "region": "East",
        "h1": 0.31,
        "h2": 0.36
      },
      {
        "region": "Central",
        "h1": 0.34,
        "h2": 0.29
      },
      {
        "region": "North",
        "h1": 0.28,
        "h2": 0.33
      }
    ]
  },
  "fields": {
    "h1": {
      "label": "H1 2026",
      "format": {
        "type": "percent",
        "decimals": 0
      }
    },
    "h2": {
      "label": "H2 2026",
      "format": {
        "type": "percent",
        "decimals": 0
      }
    }
  },
  "view": {
    "type": "slope",
    "label": "region",
    "from": "h1",
    "to": "h2"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `dumbbell` | fits | better | Better for comparing amounts across categories, and still good for change between two points. Gaps are easier to read and it scales to more items; rank swaps are less obvious. | `{"type":"dumbbell","label":"region","from":"h1","to":"h2"}` |
| `bar` | fits | different | Answers a different question: better for comparing amounts across categories and trend over time, but gives up change between two points. | `{"type":"bar","x":"region","y":["h1","h2"]}` |
| `hbar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up change between two points. | `{"type":"hbar","label":"region","value":["h1","h2"]}` |
| `radar` | fits | different | Answers a different question: better for profiles across several attributes and comparing amounts across categories, but gives up change between two points. | `{"type":"radar","label":"region","y":["h1","h2"]}` |
| `donut` | fits | different | Answers a different question: better for share of one whole, but gives up change between two points. | `{"type":"donut","label":"region","value":"h1"}` |
| `dot` | fits | different | Answers a different question: better for comparing amounts across categories, but gives up change between two points. | `{"type":"dot","label":"region","value":["h1","h2"]}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup, but gives up change between two points. | `{"type":"list","label":"region"}` |
| `pie` | fits | different | Answers a different question: better for share of one whole, but gives up change between two points. | `{"type":"pie","label":"region","value":"h1"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up change between two points. | `{"type":"table"}` |
| `icicle` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"icicle","levels":"region","value":"h1"}` |
| `kpi` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"kpi","value":"h1"}` |
| `kpis` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"h1"},{"value":"h2"}]}` |
| `pareto` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"pareto","label":"region","value":"h1"}` |
| `rose` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"rose","label":"region","y":["h1","h2"]}` |
| `sunburst` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"region","value":"h1"}` |
| `treemap` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"treemap","label":"region","value":"h1"}` |
| `waffle` | fits | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"waffle","label":"region","value":"h1"}` |
| `area` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"area","x":"region","y":["h1","h2"]}` |
| `beeswarm` | stretch: 5 rows: this chart says little with fewer than 10. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"h1","label":"region"}` |
| `boxplot` | stretch: 5 rows: this chart says little with fewer than 15. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"boxplot","value":"h1"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 5 rows. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"gauge","value":"h1"}` |
| `histogram` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"histogram","value":"h1"}` |
| `horizon` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. 5 rows: this chart says little with fewer than 10. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"horizon","x":"region","y":["h1","h2"]}` |
| `line` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"line","x":"region","y":["h1","h2"]}` |
| `ridgeline` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"h1","group":"region"}` |
| `scatter` | stretch: 5 rows: this chart says little with fewer than 6. | worse | Gives up change between two points, and this data gives it nothing better to do. | `{"type":"scatter","x":"h1","y":"h2","label":"region"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "region", already the x)); `board` (needs a separate column for stage (it would reuse "region", already the label)); `bullet` (It needs a target, plan or budget column.); `bump` (needs a separate column for series (it would reuse "region", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for low (it would reuse "h1", already the open)); `chord` (needs a separate column for target (it would reuse "region", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "region", already the x)); `history` (needs a separate column for title (it would reuse "region", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "region", already the x)); `matrix` (needs a separate column for y (it would reuse "region", already the x)); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "region", already the label)); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "region", already the source)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "region", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
