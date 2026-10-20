# `area` chart

A line with a soft filled area down to zero, for a trend where the amount itself matters. Best with one or two series, or stacked: composition over time, each series a band on top of the ones before. As a stream, the bands flow around a center line, for how a mix shifts over time.

## What it is for

- Trend over time: best
- How each group or period splits: good
- Comparing amounts across categories: possible

**Best for**

- Volumes over time where the amount itself matters: cash, revenue, traffic
- A forecast with its uncertainty band
- How a stacked total splits over time (two to four series)

**Least useful for**

- Several series that cross: the fills hide each other (use line)
- Categories with no order (use bar)
- Values that go below zero

## The data it needs

**One row is**: One row per point in time, in order.

**How the chart is built**: One point per row at x (in date order) and y; the area under the line is filled down to zero. Several y fields stack or overlap; a forecast field continues the line dashed, and a band (low, high) shades a range.

**Rows it reads well with**: 4 to 400.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `x` | date | yes | Field for the ordered axis, usually a date or period. |
| `y` | number (one or more) | yes | Field or fields for the values. Each field is one series. |
| `forecast` | category |  | Field that is true on forecast rows. From the last actual on, lines draw dashed in a softly shaded zone labelled Forecast, and the tooltip marks those rows. On an area the forecast's wash is fainter too. Unstacked areas only. |

## This example's columns (5 columns, 18 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `month` (Month) | date | `x` | 18 different, e.g. "2025-10", "2025-11", "2025-12" |
| `cash` (Cash) | number | `y` | 3940000 to 6210000 |
| `forecast` (Forecast) | boolean | `forecast` | 2 different, e.g. false, true |
| `low` (Low (p10)) | number | not drawn | 4500000 to 5430000 |
| `high` (High (p90)) | number | not drawn | 5360000 to 8220000 |

## The data drawing it now

| month | cash | forecast | low | high |
| --- | --- | --- | --- | --- |
| 2025-10 | 4210000 | false |  |  |
| 2025-11 | 4020000 | false |  |  |
| 2025-12 | 4530000 | false |  |  |
| 2026-01 | 4120000 | false |  |  |
| 2026-02 | 3940000 | false |  |  |
| 2026-03 | 4310000 | false |  |  |
| 2026-04 | 4630000 | false |  |  |
| 2026-05 | 4410000 | false |  |  |
| 2026-06 | 4820000 | false |  |  |
| 2026-07 | 5080000 | false |  |  |
| 2026-08 | 4910000 | false |  |  |
| 2026-09 | 5360000 | false | 5360000 | 5360000 |
| 2026-10 | 5480000 | true | 5320000 | 5670000 |
| 2026-11 | 5610000 | true | 5250000 | 6040000 |
| 2026-12 | 6080000 | true | 5430000 | 6850000 |
| 2027-01 | 5720000 | true | 4830000 | 6770000 |
| 2027-02 | 5830000 | true | 4590000 | 7290000 |
| 2027-03 | 6210000 | true | 4500000 | 8220000 |

As CSV:

```csv
month,cash,forecast,low,high
2025-10,4210000,false,,
2025-11,4020000,false,,
2025-12,4530000,false,,
2026-01,4120000,false,,
2026-02,3940000,false,,
2026-03,4310000,false,,
2026-04,4630000,false,,
2026-05,4410000,false,,
2026-06,4820000,false,,
2026-07,5080000,false,,
2026-08,4910000,false,,
2026-09,5360000,false,5360000,5360000
2026-10,5480000,true,5320000,5670000
2026-11,5610000,true,5250000,6040000
2026-12,6080000,true,5430000,6850000
2027-01,5720000,true,4830000,6770000
2027-02,5830000,true,4590000,7290000
2027-03,6210000,true,4500000,8220000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "cash-forecast",
  "title": "Cash on hand",
  "subtitle": "Month-end balance, with a six-month forecast",
  "description": "Cash ended September at €5.36M, up from €4.21M a year earlier. The middle case reaches €6.21M by March 2027, inside an 80% range of €4.50M to €8.22M.",
  "footer": "Source: treasury and planning model",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "month": "2025-10",
        "cash": 4210000,
        "low": null,
        "high": null,
        "forecast": false
      },
      {
        "month": "2025-11",
        "cash": 4020000,
        "low": null,
        "high": null,
        "forecast": false
      },
      {
        "month": "2025-12",
        "cash": 4530000,
        "low": null,
        "high": null,
        "forecast": false
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
    "cash": {
      "label": "Cash",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "low": {
      "label": "Low (p10)",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "high": {
      "label": "High (p90)",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "forecast": {
      "label": "Forecast"
    }
  },
  "view": {
    "type": "area",
    "x": "month",
    "y": "cash",
    "forecast": "forecast",
    "band": {
      "low": "low",
      "high": "high",
      "label": "80% range"
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `line` | fits | better | Better for actual against target or plan and comparing amounts across categories, and still good for trend over time. Cleaner with several series and when the trend matters more than the amount. | `{"type":"line","x":"month","y":"cash","forecast":"forecast"}` |
| `horizon` | fits | same | Keeps the job (trend over time) with a different look. | `{"type":"horizon","x":"month","y":"cash"}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up trend over time. | `{"type":"beeswarm","value":"cash"}` |
| `kpi` | fits | different | Answers a different question: better for a headline number, but gives up trend over time. | `{"type":"kpi","value":"cash","x":"month"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up trend over time. | `{"type":"table"}` |
| `boxplot` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"boxplot","value":"cash"}` |
| `heatmap` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"heatmap","x":"forecast","y":"month","value":"cash"}` |
| `icicle` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"icicle","levels":"forecast","value":"cash"}` |
| `kpis` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"cash"}]}` |
| `marimekko` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"marimekko","x":"forecast","series":"month","value":"cash"}` |
| `sunburst` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"forecast","value":"cash"}` |
| `bar` | stretch: "forecast" repeats (2 different values in 18 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 18 rows: this chart crowds past about 16. | trade-off | Better for comparing amounts across categories and ranking, top to bottom; weaker for trend over time. | `{"type":"bar","x":"forecast","y":"cash"}` |
| `hbar` | stretch: "forecast" repeats (2 different values in 18 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up trend over time. | `{"type":"hbar","label":"forecast","value":"cash"}` |
| `list` | stretch: "forecast" repeats (2 different values in 18 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up trend over time. | `{"type":"list","label":"forecast"}` |
| `calendar` | stretch: 18 rows: this chart says little with fewer than 28. | worse | Weaker for trend over time, with nothing gained for this data. | `{"type":"calendar","date":"month","value":"cash"}` |
| `donut` | stretch: "forecast" repeats (2 different values in 18 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 18 rows: this chart crowds past about 6. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"donut","label":"forecast","value":"cash"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 18 rows. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"gauge","value":"cash"}` |
| `histogram` | stretch: 18 rows: this chart says little with fewer than 20. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"histogram","value":"cash"}` |
| `pareto` | stretch: "forecast" repeats (2 different values in 18 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"pareto","label":"forecast","value":"cash"}` |
| `radar` | stretch: "forecast" repeats (2 different values in 18 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 18 rows: this chart crowds past about 12. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"radar","label":"forecast","y":"cash"}` |
| `ridgeline` | stretch: 18 rows: this chart says little with fewer than 20. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"cash","group":"forecast"}` |
| `rose` | stretch: "forecast" repeats (2 different values in 18 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"rose","label":"forecast","y":"cash"}` |
| `treemap` | stretch: "forecast" repeats (2 different values in 18 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"treemap","label":"forecast","value":"cash"}` |
| `waffle` | stretch: "forecast" repeats (2 different values in 18 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 18 rows: this chart crowds past about 5. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"waffle","label":"forecast","value":"cash"}` |

Not possible with this data: `bullet` (needs a separate column for target (it would reuse "cash", already the value)); `bump` (It needs one value per series in each period, to rank.); `candlestick` (needs a separate column for high (it would reuse "cash", already the open)); `chord` (It needs flows that go both ways between the same groups.); `dumbbell` (needs a separate column for to (it would reuse "cash", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `meter` (needs a separate column for target (it would reuse "cash", already the value)); `rings` (needs a separate column for target (it would reuse "cash", already the value)); `sankey` (It needs flows from a source to a target.); `scatter` (needs a separate column for y (it would reuse "cash", already the x)); `slope` (needs a separate column for to (it would reuse "cash", already the from)); `timeline` (It needs tasks with a start date.); `variance` (needs a separate column for target (it would reuse "cash", already the value)); `waterfall` (It needs changes that add up from one total to another.).
