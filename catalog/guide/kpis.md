# `kpis` chart

A row of stat tiles in one widget, each with a label, value and change: the calm way to show a handful of headline numbers. With series, reads the rows as a time series and adds a sparkline per tile.

## What it is for

- A headline number: best
- Actual against target or plan: possible
- Trend over time: possible

**Best for**

- Three to six key numbers side by side: revenue, profit, new customers, churn

**Least useful for**

- Breakdowns by category (use bar or table)

## The data it needs

**One row is**: One value; with more rows, the last one is the headline and the rest draw its trend.

**How the chart is built**: One tile per item, each the last row's value of its field with its change; with series, each tile draws its trend.

**Rows it reads well with**: 1 to any number.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |

## This example's columns (7 columns, 12 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `revenue` (Revenue) | number | `items.value` | 820000 to 1284000 |
| `target` | number | `items.target` | 850000 to 1200000 |
| `profit` (Gross profit) | number | `items.value` | 210000 to 424000 |
| `newCustomers` (New customers) | number | `items.value` | 35 to 66 |
| `churn` (Churn) | number | `items.value` | 0.031 to 0.042 |
| `month` (Month) | date | not drawn | 12 different, e.g. "2025-10", "2025-11", "2025-12" |
| `cost` | number | not drawn | 610000 to 860000 |

## The data drawing it now

| revenue | target | profit | newCustomers | churn | month | cost |
| --- | --- | --- | --- | --- | --- | --- |
| 820000 | 850000 | 210000 | 41 | 0.042 | 2025-10 | 610000 |
| 860000 | 870000 | 220000 | 38 | 0.041 | 2025-11 | 640000 |
| 910000 | 900000 | 250000 | 52 | 0.039 | 2025-12 | 660000 |
| 870000 | 900000 | 220000 | 35 | 0.04 | 2026-01 | 650000 |
| 900000 | 920000 | 245000 | 44 | 0.038 | 2026-02 | 655000 |
| 960000 | 950000 | 270000 | 49 | 0.037 | 2026-03 | 690000 |
| 1010000 | 980000 | 290000 | 57 | 0.036 | 2026-04 | 720000 |
| 980000 | 1000000 | 280000 | 46 | 0.035 | 2026-05 | 700000 |
| 1050000 | 1030000 | 310000 | 61 | 0.037 | 2026-06 | 740000 |
| 1120000 | 1080000 | 340000 | 58 | 0.036 | 2026-07 | 780000 |
| 1142000 | 1120000 | 352000 | 54 | 0.036 | 2026-08 | 790000 |
| 1284000 | 1200000 | 424000 | 66 | 0.031 | 2026-09 | 860000 |

As CSV:

```csv
revenue,target,profit,newCustomers,churn,month,cost
820000,850000,210000,41,0.042,2025-10,610000
860000,870000,220000,38,0.041,2025-11,640000
910000,900000,250000,52,0.039,2025-12,660000
870000,900000,220000,35,0.04,2026-01,650000
900000,920000,245000,44,0.038,2026-02,655000
960000,950000,270000,49,0.037,2026-03,690000
1010000,980000,290000,57,0.036,2026-04,720000
980000,1000000,280000,46,0.035,2026-05,700000
1050000,1030000,310000,61,0.037,2026-06,740000
1120000,1080000,340000,58,0.036,2026-07,780000
1142000,1120000,352000,54,0.036,2026-08,790000
1284000,1200000,424000,66,0.031,2026-09,860000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "q3-at-a-glance",
  "title": "At a glance",
  "subtitle": "{last:month} against the month before, with trends from {first:month}",
  "description": "The four headline numbers in one row.",
  "source": {
    "name": "Finance ledger and CRM"
  },
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
        "target": 850000,
        "profit": 210000
      },
      {
        "month": "2025-11",
        "revenue": 860000,
        "cost": 640000,
        "newCustomers": 38,
        "churn": 0.041,
        "target": 870000,
        "profit": 220000
      },
      {
        "month": "2025-12",
        "revenue": 910000,
        "cost": 660000,
        "newCustomers": 52,
        "churn": 0.039,
        "target": 900000,
        "profit": 250000
      }
    ]
  },
  "fields": {
    "revenue": {
      "label": "Revenue",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true,
        "decimals": 2
      }
    },
    "profit": {
      "label": "Gross profit",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "newCustomers": {
      "label": "New customers",
      "format": "number"
    },
    "churn": {
      "label": "Churn",
      "format": {
        "type": "percent",
        "decimals": 1
      }
    },
    "month": {
      "label": "Month",
      "format": {
        "type": "date",
        "style": "month"
      }
    }
  },
  "view": {
    "type": "kpis",
    "series": true,
    "items": [
      {
        "value": "revenue",
        "target": "target"
      },
      {
        "value": "profit"
      },
      {
        "value": "newCustomers"
      },
      {
        "value": "churn",
        "goodWhen": "down"
      }
    ]
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `kpi` | fits | same | Keeps the job (a headline number) with a different look. | `{"type":"kpi","value":"revenue"}` |
| `area` | fits | different | Answers a different question: better for trend over time and how each group or period splits, but gives up a headline number. | `{"type":"area","x":"month","y":["revenue","target"]}` |
| `dual` | fits | different | Answers a different question: better for trend over time and how two measures relate, but gives up a headline number. | `{"type":"dual","x":"month","y":"revenue","y2":"target"}` |
| `horizon` | fits | different | Answers a different question: better for comparing amounts across categories and trend over time, but gives up a headline number. | `{"type":"horizon","x":"month","y":["revenue","target"]}` |
| `line` | fits | different | Answers a different question: better for comparing amounts across categories and trend over time, but gives up a headline number. | `{"type":"line","x":"month","y":["revenue","target"]}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up a headline number. | `{"type":"list","label":"month"}` |
| `scatter` | fits | different | Answers a different question: better for how two measures relate, but gives up a headline number. | `{"type":"scatter","x":"revenue","y":"target"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up a headline number. | `{"type":"table"}` |
| `bar` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"bar","x":"month","y":["revenue","target"]}` |
| `beeswarm` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"revenue"}` |
| `dot` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"dot","label":"month","value":["revenue","target"]}` |
| `hbar` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"hbar","label":"month","value":["revenue","target"]}` |
| `icicle` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"icicle","levels":"month","value":"revenue"}` |
| `pareto` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"pareto","label":"month","value":"revenue"}` |
| `radar` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"radar","label":"month","y":["revenue","target"]}` |
| `rose` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"rose","label":"month","y":["revenue","target"]}` |
| `sunburst` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"month","value":"revenue"}` |
| `treemap` | fits | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"treemap","label":"month","value":"revenue"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 12 rows. | same | Keeps the job (a headline number) with a different look. | `{"type":"gauge","value":"revenue"}` |
| `boxplot` | stretch: 12 rows: this chart says little with fewer than 15. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"boxplot","value":"revenue"}` |
| `calendar` | stretch: 12 rows: this chart says little with fewer than 28. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"calendar","date":"month","value":"revenue"}` |
| `donut` | stretch: 12 rows: this chart crowds past about 6. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"donut","label":"month","value":"revenue"}` |
| `histogram` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"histogram","value":"revenue"}` |
| `pie` | stretch: 12 rows: this chart crowds past about 6. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"pie","label":"month","value":"revenue"}` |
| `ridgeline` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"revenue","group":"month"}` |
| `waffle` | stretch: 12 rows: this chart crowds past about 5. | worse | Gives up a headline number, and this data gives it nothing better to do. | `{"type":"waffle","label":"month","value":"revenue"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "month", already the x)); `board` (needs a separate column for stage (it would reuse "month", already the label)); `bullet` (It needs a target, plan or budget column.); `bump` (needs a separate column for series (it would reuse "month", already the x)); `candlestick` (It needs open, high, low and close prices per period.); `chord` (needs a separate column for target (it would reuse "month", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "month", already the x)); `history` (needs a separate column for title (it would reuse "month", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "month", already the x)); `matrix` (needs a separate column for y (it would reuse "month", already the x)); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "month", already the label)); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "month", already the source)); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a separate column for start (it would reuse "month", already the label)); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "month", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
