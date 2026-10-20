# `hbar` chart

Horizontal bars for rankings and long labels: label on the left, bar, value at the end. Sort the rows first for a ranking.

## What it is for

- Ranking, top to bottom: best
- Comparing amounts across categories: best
- Exact values and lookup: possible
- Actual against target or plan: possible

**Best for**

- Rankings with long names: top features, top customers, causes
- Up to about 30 categories, readable on a phone

**Least useful for**

- Time order (use bar or line)
- Share of one whole (use donut or waffle)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One horizontal bar per row, label on the left and value at the end, sorted as given or by value.

**Rows it reads well with**: 2 to 30.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each bar. |
| `value` | number | yes | Field with each bar's amount. Bars start at zero. |

## This example's columns (2 columns, 10 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `feature` (Feature) | category | `label` | 10 different, e.g. "Dashboards", "Exports", "Alerts" |
| `share` (Accounts using it) | number | `value` | 0.22 to 0.91 |

## The data drawing it now

| feature | share |
| --- | --- |
| Dashboards | 0.91 |
| Exports | 0.84 |
| Alerts | 0.78 |
| Sharing | 0.74 |
| Scheduled reports | 0.66 |
| API access | 0.52 |
| Custom fields | 0.47 |
| Forecasting | 0.38 |
| SSO | 0.31 |
| Audit log | 0.22 |

As CSV:

```csv
feature,share
Dashboards,0.91
Exports,0.84
Alerts,0.78
Sharing,0.74
Scheduled reports,0.66
API access,0.52
Custom fields,0.47
Forecasting,0.38
SSO,0.31
Audit log,0.22
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "feature-adoption",
  "title": "Feature adoption",
  "subtitle": "Share of active accounts using each feature, September 2026",
  "description": "Which features active accounts actually use. Dashboards lead at 91%; Forecasting, SSO and the audit log reach fewer than two in five accounts.",
  "footer": "Source: product analytics",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "feature": "Dashboards",
        "share": 0.91
      },
      {
        "feature": "Exports",
        "share": 0.84
      },
      {
        "feature": "Alerts",
        "share": 0.78
      }
    ]
  },
  "fields": {
    "feature": {
      "label": "Feature"
    },
    "share": {
      "label": "Accounts using it",
      "format": {
        "type": "percent",
        "decimals": 0
      }
    }
  },
  "view": {
    "type": "hbar",
    "label": "feature",
    "value": "share",
    "mark": "lollipop"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `bar` | fits | trade-off | Better for trend over time and how each group or period splits; weaker for ranking, top to bottom. Same comparison; only better when the categories are in time order or the labels are short. | `{"type":"bar","x":"feature","y":"share"}` |
| `pareto` | fits | different | Answers a different question: better for what drives or moves a total and share of one whole, but gives up comparing amounts across categories. Adds the running total, so the few items behind most of the total stand out. | `{"type":"pareto","label":"feature","value":"share"}` |
| `treemap` | fits | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up comparing amounts across categories and ranking, top to bottom. | `{"type":"treemap","label":"feature","value":"share"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup, but gives up comparing amounts across categories. Names and exact values come first and sizes are gone; good for a phone or a top-five card. | `{"type":"list","label":"feature","value":"share"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up comparing amounts across categories and ranking, top to bottom. | `{"type":"table"}` |
| `beeswarm` | fits | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"share","label":"feature"}` |
| `icicle` | fits | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"icicle","levels":"feature","value":"share"}` |
| `kpi` | fits | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"kpi","value":"share"}` |
| `kpis` | fits | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"share"}]}` |
| `radar` | fits | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"radar","label":"feature","y":"share"}` |
| `rose` | fits | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"rose","label":"feature","y":"share"}` |
| `sunburst` | fits | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"feature","value":"share"}` |
| `area` | stretch: x expects dates; "feature" is text, so its rows are drawn in the order given. | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"area","x":"feature","y":"share"}` |
| `boxplot` | stretch: 10 rows: this chart says little with fewer than 15. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"boxplot","value":"share"}` |
| `donut` | stretch: 10 rows: this chart crowds past about 6. | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. Shows the parts as one whole; only worth it with two to six parts. | `{"type":"donut","label":"feature","value":"share"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 10 rows. | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"gauge","value":"share"}` |
| `histogram` | stretch: 10 rows: this chart says little with fewer than 20. | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"histogram","value":"share"}` |
| `horizon` | stretch: x expects dates; "feature" is text, so its rows are drawn in the order given. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"horizon","x":"feature","y":"share"}` |
| `line` | stretch: x expects dates; "feature" is text, so its rows are drawn in the order given. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"line","x":"feature","y":"share"}` |
| `ridgeline` | stretch: 10 rows: this chart says little with fewer than 20. | worse | Gives up ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"share","group":"feature"}` |
| `waffle` | stretch: 10 rows: this chart crowds past about 5. | worse | Gives up comparing amounts across categories and ranking, top to bottom, and this data gives it nothing better to do. | `{"type":"waffle","label":"feature","value":"share"}` |

Not possible with this data: `bullet` (needs a separate column for target (it would reuse "share", already the value)); `bump` (needs a separate column for series (it would reuse "feature", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "share", already the open)); `chord` (needs a separate column for target (it would reuse "feature", already the source)); `dumbbell` (needs a separate column for to (it would reuse "share", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "feature", already the x)); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `marimekko` (needs a separate column for series (it would reuse "feature", already the x)); `meter` (needs a separate column for target (it would reuse "share", already the value)); `rings` (needs a separate column for target (it would reuse "share", already the value)); `sankey` (needs a separate column for target (it would reuse "feature", already the source)); `scatter` (needs a separate column for y (it would reuse "share", already the x)); `slope` (needs a separate column for to (it would reuse "share", already the from)); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "share", already the value)); `waterfall` (It needs changes that add up from one total to another.).
