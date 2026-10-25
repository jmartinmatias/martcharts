# `gauge` chart

One headline number on a half-circle scale: an arc filled from min to the value, a tick at the target, the number large inside the arc and the scale's ends below; with a target, a line under the arc says where it stands (Target met, or how far to go). Reads the first row. For a single KPI with a known range, such as NPS or utilization.

## What it is for

- A headline number: best
- Actual against target or plan: best

**Best for**

- One KPI against a goal on a known scale: NPS, utilization, SLA attainment

**Least useful for**

- Several values (use bullet or meter)
- Trends (use kpi with series)
- Small differences, which the arc hides

## The data it needs

**One row is**: One value; with more rows, the last one is the headline and the rest draw its trend.

**How the chart is built**: The first row's value fills a half-circle from min to max, with a tick at target and the number in the middle.

**Rows it reads well with**: 1 to 1.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `value` | number | yes | Field holding the number. |
| `target` | number |  | Field holding the target, marked with a tick. |

## This example's columns (2 columns, 1 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `nps` (NPS) | number | `value` | 42 to 42 |
| `goal` (Goal) | number | `target` | 50 to 50 |

## The data drawing it now

| nps | goal |
| --- | --- |
| 42 | 50 |

As CSV:

```csv
nps,goal
42,50
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "nps-gauge",
  "title": "Net promoter score",
  "subtitle": "September 2026 survey, against a goal of 50",
  "description": "Share of promoters minus share of detractors, on its full -100 to 100 scale, with the goal marked.",
  "footer": "Source: customer survey, 1,240 responses",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "nps": 42,
        "goal": 50
      }
    ]
  },
  "fields": {
    "nps": {
      "label": "NPS"
    },
    "goal": {
      "label": "Goal"
    }
  },
  "view": {
    "type": "gauge",
    "value": "nps",
    "target": "goal",
    "min": -100,
    "max": 100,
    "label": "Net promoter score"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up actual against target or plan and a headline number. | `{"type":"table"}` |
| `kpi` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. Adds the change against the previous period; drops the scale and goal. | `{"type":"kpi","value":"nps","target":"goal"}` |
| `kpis` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"nps"},{"value":"goal"}]}` |
| `beeswarm` | stretch: 1 row: this chart says little with fewer than 10. | worse | Gives up actual against target or plan and a headline number, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"nps"}` |
| `boxplot` | stretch: 1 row: this chart says little with fewer than 15. | worse | Gives up actual against target or plan and a headline number, and this data gives it nothing better to do. | `{"type":"boxplot","value":"nps"}` |
| `histogram` | stretch: 1 row: this chart says little with fewer than 20. | worse | Gives up actual against target or plan and a headline number, and this data gives it nothing better to do. | `{"type":"histogram","value":"nps"}` |
| `scatter` | stretch: 1 row: this chart says little with fewer than 6. | worse | Gives up actual against target or plan and a headline number, and this data gives it nothing better to do. | `{"type":"scatter","x":"nps","y":"goal"}` |

Not possible with this data: `area` (needs a date or category column for x); `bar` (needs a category column for x); `bullet` (needs a category column for label); `bump` (needs a date or category column for x); `calendar` (needs a date column for date); `candlestick` (needs a date or category column for x); `chord` (needs a category column for source); `donut` (needs a category column for label); `dumbbell` (needs a category column for label); `funnel` (needs a category column for label); `hbar` (needs a category column for label); `heatmap` (needs a category column for x); `horizon` (needs a date or category column for x); `icicle` (needs a category column for levels); `likert` (needs a category column for label); `line` (needs a date or category column for x); `list` (needs a category column for label); `marimekko` (needs a category column for x); `meter` (It needs a target, plan or budget column.); `pareto` (needs a category column for label); `radar` (needs a category column for label); `ridgeline` (needs a category column for group); `rings` (needs a category column for label); `rose` (needs a category column for label); `sankey` (needs a category column for source); `slope` (needs a category column for label); `sunburst` (needs a category column for levels); `timeline` (needs a category column for label); `treemap` (needs a category column for label); `variance` (needs a category column for label); `waffle` (needs a category column for label); `waterfall` (needs a category column for label).
