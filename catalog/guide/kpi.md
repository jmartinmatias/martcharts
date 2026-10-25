# `kpi` chart

One headline number with its change against a comparison. Reads the first row, or with series the last row, plus a sparkline.

## What it is for

- A headline number: best
- Trend over time: possible
- Actual against target or plan: possible

**Best for**

- One number with its change: churn this month, revenue this quarter
- The top row of a dashboard

**Least useful for**

- Comparing categories (use hbar)
- Several numbers (use kpis)

## The data it needs

**One row is**: One value; with more rows, the last one is the headline and the rest draw its trend.

**How the chart is built**: The last row's value, large, with its change against the row before (or compare); with series, every row draws a small trend.

**Rows it reads well with**: 1 to any number.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `value` | number | yes | Field holding the headline number. |
| `compare` | number |  | Field holding the value to compare against, for example last period. |
| `x` | date |  | With series, the field naming each period, used to label the comparison ("vs Aug 2026"). |
| `target` | number |  | Field holding the target. A line under the number says where the latest stands: a check and Target met, or how far it has to go (with goodWhen down, how far above the target it is). |

## This example's columns (6 columns, 12 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `churn` (Monthly churn) | number | `value` | 0.031 to 0.042 |
| `month` (Month) | date | `x` | 12 different, e.g. "2025-10", "2025-11", "2025-12" |
| `revenue` | number | not drawn | 820000 to 1284000 |
| `cost` | number | not drawn | 610000 to 860000 |
| `newCustomers` | number | not drawn | 35 to 66 |
| `target` | number | not drawn | 850000 to 1200000 |

## The data drawing it now

| churn | month | revenue | cost | newCustomers | target |
| --- | --- | --- | --- | --- | --- |
| 0.042 | 2025-10 | 820000 | 610000 | 41 | 850000 |
| 0.041 | 2025-11 | 860000 | 640000 | 38 | 870000 |
| 0.039 | 2025-12 | 910000 | 660000 | 52 | 900000 |
| 0.04 | 2026-01 | 870000 | 650000 | 35 | 900000 |
| 0.038 | 2026-02 | 900000 | 655000 | 44 | 920000 |
| 0.037 | 2026-03 | 960000 | 690000 | 49 | 950000 |
| 0.036 | 2026-04 | 1010000 | 720000 | 57 | 980000 |
| 0.035 | 2026-05 | 980000 | 700000 | 46 | 1000000 |
| 0.037 | 2026-06 | 1050000 | 740000 | 61 | 1030000 |
| 0.036 | 2026-07 | 1120000 | 780000 | 58 | 1080000 |
| 0.036 | 2026-08 | 1142000 | 790000 | 54 | 1120000 |
| 0.031 | 2026-09 | 1284000 | 860000 | 66 | 1200000 |

As CSV:

```csv
churn,month,revenue,cost,newCustomers,target
0.042,2025-10,820000,610000,41,850000
0.041,2025-11,860000,640000,38,870000
0.039,2025-12,910000,660000,52,900000
0.04,2026-01,870000,650000,35,900000
0.038,2026-02,900000,655000,44,920000
0.037,2026-03,960000,690000,49,950000
0.036,2026-04,1010000,720000,57,980000
0.035,2026-05,980000,700000,46,1000000
0.037,2026-06,1050000,740000,61,1030000
0.036,2026-07,1120000,780000,58,1080000
0.036,2026-08,1142000,790000,54,1120000
0.031,2026-09,1284000,860000,66,1200000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "churn-kpi",
  "title": "Customer churn",
  "subtitle": "{last:month}",
  "description": "Share of customers lost each month. Lower is better.",
  "footer": "Source: CRM",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "month": "2025-10",
        "revenue": 820000,
        "cost": 610000,
        "newCustomers": 41,
        "churn": 0.042,
        "target": 850000
      },
      {
        "month": "2025-11",
        "revenue": 860000,
        "cost": 640000,
        "newCustomers": 38,
        "churn": 0.041,
        "target": 870000
      },
      {
        "month": "2025-12",
        "revenue": 910000,
        "cost": 660000,
        "newCustomers": 52,
        "churn": 0.039,
        "target": 900000
      }
    ]
  },
  "fields": {
    "month": {
      "label": "Month",
      "format": {
        "type": "date",
        "style": "month"
      }
    },
    "churn": {
      "label": "Monthly churn",
      "format": {
        "type": "percent",
        "decimals": 1
      }
    }
  },
  "view": {
    "type": "kpi",
    "value": "churn",
    "series": true,
    "x": "month",
    "goodWhen": "down",
    "icon": "activity"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `kpis` | fits | same | Keeps the job (a headline number) with a different look. | `{"type":"kpis","items":[{"value":"churn"},{"value":"revenue"},{"value":"cost"}]}` |
| `area` | fits | different | Answers a different question: better for trend over time and how each group or period splits, but gives up a headline number. | `{"type":"area","x":"month","y":["churn","revenue"]}` |
| `dual` | fits | different | Answers a different question: better for trend over time and how two measures relate, but gives up a headline number. | `{"type":"dual","x":"month","y":"churn","y2":"revenue"}` |
| `horizon` | fits | different | Answers a different question: better for comparing amounts across categories and trend over time, but gives up a headline number. | `{"type":"horizon","x":"month","y":["churn","revenue"]}` |
| `line` | fits | different | Answers a different question: better for comparing amounts across categories and trend over time, but gives up a headline number. | `{"type":"line","x":"month","y":["churn","revenue"]}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up a headline number. | `{"type":"list","label":"month","value":"churn"}` |
| `scatter` | fits | different | Answers a different question: better for how two measures relate, but gives up a headline number. | `{"type":"scatter","x":"churn","y":"revenue"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up a headline number. | `{"type":"table"}` |
| `bar` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"bar","x":"month","y":["churn","revenue"],"goodWhen":"down"}` |
| `beeswarm` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"churn"}` |
| `dot` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"dot","label":"month","value":["churn","revenue"]}` |
| `hbar` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"hbar","label":"month","value":["churn","revenue"]}` |
| `icicle` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"icicle","levels":"month","value":"churn"}` |
| `pareto` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"pareto","label":"month","value":"churn"}` |
| `radar` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"radar","label":"month","y":["churn","revenue"]}` |
| `rose` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"rose","label":"month","y":["churn","revenue"]}` |
| `sunburst` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"month","value":"churn"}` |
| `treemap` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"treemap","label":"month","value":"churn"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 12 rows. | same | Keeps the job (a headline number) with a different look. Places the number on a scale against its goal; drops the change and the trend. | `{"type":"gauge","value":"churn","goodWhen":"down"}` |
| `boxplot` | stretch: 12 rows: this chart says little with fewer than 15. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"boxplot","value":"churn"}` |
| `calendar` | stretch: 12 rows: this chart says little with fewer than 28. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"calendar","date":"month","value":"churn"}` |
| `donut` | stretch: 12 rows: this chart crowds past about 6. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"donut","label":"month","value":"churn"}` |
| `histogram` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"histogram","value":"churn"}` |
| `pie` | stretch: 12 rows: this chart crowds past about 6. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"pie","label":"month","value":"churn"}` |
| `ridgeline` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"churn","group":"month"}` |
| `waffle` | stretch: 12 rows: this chart crowds past about 5. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"waffle","label":"month","value":"churn"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "month", already the x)); `board` (needs a separate column for stage (it would reuse "month", already the label)); `bullet` (It needs a target, plan or budget column.); `bump` (needs a separate column for series (it would reuse "month", already the x)); `candlestick` (It needs open, high, low and close prices per period.); `chord` (needs a separate column for target (it would reuse "month", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "month", already the x)); `history` (needs a separate column for title (it would reuse "month", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "month", already the x)); `matrix` (needs a separate column for y (it would reuse "month", already the x)); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "month", already the label)); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "month", already the source)); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a separate column for start (it would reuse "month", already the label)); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "month", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
