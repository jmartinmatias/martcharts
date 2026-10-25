# `dual` chart

Two measures with different units, such as revenue and churn, one above the other on two panels that share one time axis, each on its own scale. The honest form of a dual-axis chart: a second axis invites false crossings, where two lines meet only because of how the axes were drawn; two panels let the reader compare the shapes and read each value against its own axis. Pointing at a period lights it up on both panels.

## What it is for

- Trend over time: best
- How two measures relate: good
- Comparing amounts across categories: possible

**Best for**

- Two measures in different units over the same periods: revenue and churn, visits and conversion rate
- Showing whether two shapes move together without a misleading second axis

**Least useful for**

- Two series in the same unit (use line, one axis)
- More than two measures (use horizon or small multiples)
- Categories with no order (use bar)

## The data it needs

**One row is**: One row per point in time, in order.

**How the chart is built**: Two panels one above the other sharing the x axis: y on the top panel and y2 on the bottom, each on its own scale, drawn as bars (from zero) or lines.

**Rows it reads well with**: 3 to 200.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `x` | date | yes | Field for the shared axis, usually a date or period. |
| `y` | number | yes | Measure on the top panel. |
| `y2` | number | yes | Measure on the bottom panel, in its own unit. |

## This example's columns (6 columns, 12 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `month` (Month) | date | `x` | 12 different, e.g. "2025-10", "2025-11", "2025-12" |
| `revenue` (Revenue) | number | `y` | 820000 to 1284000 |
| `churn` (Churn) | number | `y2` | 0.031 to 0.042 |
| `cost` | number | not drawn | 610000 to 860000 |
| `newCustomers` | number | not drawn | 35 to 66 |
| `target` | number | not drawn | 850000 to 1200000 |

## The data drawing it now

| month | revenue | churn | cost | newCustomers | target |
| --- | --- | --- | --- | --- | --- |
| 2025-10 | 820000 | 0.042 | 610000 | 41 | 850000 |
| 2025-11 | 860000 | 0.041 | 640000 | 38 | 870000 |
| 2025-12 | 910000 | 0.039 | 660000 | 52 | 900000 |
| 2026-01 | 870000 | 0.04 | 650000 | 35 | 900000 |
| 2026-02 | 900000 | 0.038 | 655000 | 44 | 920000 |
| 2026-03 | 960000 | 0.037 | 690000 | 49 | 950000 |
| 2026-04 | 1010000 | 0.036 | 720000 | 57 | 980000 |
| 2026-05 | 980000 | 0.035 | 700000 | 46 | 1000000 |
| 2026-06 | 1050000 | 0.037 | 740000 | 61 | 1030000 |
| 2026-07 | 1120000 | 0.036 | 780000 | 58 | 1080000 |
| 2026-08 | 1142000 | 0.036 | 790000 | 54 | 1120000 |
| 2026-09 | 1284000 | 0.031 | 860000 | 66 | 1200000 |

As CSV:

```csv
month,revenue,churn,cost,newCustomers,target
2025-10,820000,0.042,610000,41,850000
2025-11,860000,0.041,640000,38,870000
2025-12,910000,0.039,660000,52,900000
2026-01,870000,0.04,650000,35,900000
2026-02,900000,0.038,655000,44,920000
2026-03,960000,0.037,690000,49,950000
2026-04,1010000,0.036,720000,57,980000
2026-05,980000,0.035,700000,46,1000000
2026-06,1050000,0.037,740000,61,1030000
2026-07,1120000,0.036,780000,58,1080000
2026-08,1142000,0.036,790000,54,1120000
2026-09,1284000,0.031,860000,66,1200000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "revenue-and-churn",
  "title": "Revenue and churn",
  "subtitle": "{first:month} to {last:month}, each on its own scale",
  "description": "Monthly revenue as bars above monthly churn as a line: two units, two panels, one time axis, no second axis.",
  "footer": "Source: /data/monthly.json",
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
    "revenue": {
      "label": "Revenue",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "churn": {
      "label": "Churn",
      "format": {
        "type": "percent",
        "decimals": 1
      }
    }
  },
  "view": {
    "type": "dual",
    "x": "month",
    "y": "revenue",
    "y2": "churn",
    "marks": [
      "bar",
      "line"
    ]
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `line` | fits | better | Better for actual against target or plan and comparing amounts across categories, and still good for trend over time. One panel and one axis; honest only when both series share a unit and a scale. | `{"type":"line","x":"month","y":["revenue","churn"]}` |
| `area` | fits | better | Better for how each group or period splits, and still good for trend over time. | `{"type":"area","x":"month","y":["revenue","churn"]}` |
| `horizon` | fits | better | Better for comparing amounts across categories, and still good for trend over time. | `{"type":"horizon","x":"month","y":["revenue","churn"]}` |
| `bar` | fits | trade-off | Better for comparing amounts across categories and ranking, top to bottom; weaker for trend over time. Keeps one measure as bars and drops the other. | `{"type":"bar","x":"month","y":["revenue","churn"]}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up trend over time. | `{"type":"hbar","label":"month","value":["revenue","churn"]}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up trend over time. | `{"type":"list","label":"month"}` |
| `kpi` | fits | different | Answers a different question: better for a headline number, but gives up trend over time. | `{"type":"kpi","value":"revenue","x":"month"}` |
| `scatter` | fits | different | Answers a different question: better for how two measures relate, but gives up trend over time. | `{"type":"scatter","x":"revenue","y":"churn"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up trend over time. | `{"type":"table"}` |
| `beeswarm` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"revenue"}` |
| `dot` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"dot","label":"month","values":["revenue","churn"]}` |
| `icicle` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"icicle","levels":"month","value":"revenue"}` |
| `kpis` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"revenue"},{"value":"churn"},{"value":"cost"}]}` |
| `pareto` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"pareto","label":"month","value":"revenue"}` |
| `radar` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"radar","label":"month","y":["revenue","churn"]}` |
| `rose` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"rose","label":"month","y":["revenue","churn"]}` |
| `sunburst` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"month","value":"revenue"}` |
| `treemap` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"treemap","label":"month","value":"revenue"}` |
| `boxplot` | stretch: 12 rows: this chart says little with fewer than 15. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"boxplot","value":"revenue"}` |
| `calendar` | stretch: 12 rows: this chart says little with fewer than 28. | worse | Weaker for trend over time, with nothing gained for this data. | `{"type":"calendar","date":"month","value":"revenue"}` |
| `donut` | stretch: 12 rows: this chart crowds past about 6. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"donut","label":"month","value":"revenue"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 12 rows. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"gauge","value":"revenue"}` |
| `histogram` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"histogram","value":"revenue"}` |
| `ridgeline` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"revenue","group":"month"}` |
| `waffle` | stretch: 12 rows: this chart crowds past about 5. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"waffle","label":"month","value":"revenue"}` |

Not possible with this data: `bullet` (It needs a target, plan or budget column.); `bump` (needs a separate column for series (it would reuse "month", already the x)); `candlestick` (It needs open, high, low and close prices per period.); `chord` (needs a separate column for target (it would reuse "month", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "month", already the x)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "month", already the x)); `matrix` (needs a separate column for y (it would reuse "month", already the x)); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "month", already the source)); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a separate column for start (it would reuse "month", already the label)); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.).
