# `candlestick` chart

Prices per period as candles: a thin wick from low to high around a body from open to close, in the up color when the period closed higher and the down color when lower. An optional moving average of the close smooths the trend. For share prices, exchange rates and commodities.

## What it is for

- Trend over time: best
- How values spread: possible
- Exact values and lookup: possible

**Best for**

- Prices per period: share price, exchange rates, commodity prices
- Volatility and the open-to-close move in trading reports

**Least useful for**

- Anything without open, high, low and close (use line)

## The data it needs

**One row is**: One row per point in time, in order.

**How the chart is built**: One candle per row: a wick from low to high and a body from open to close, colored up or down; an optional moving average line.

**Rows it reads well with**: 5 to 250.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `x` | date | yes | Field with the period, such as a trading day. |
| `open` | number | yes | Field with the opening price. |
| `high` | number | yes | Field with the highest price. |
| `low` | number | yes | Field with the lowest price. |
| `close` | number | yes | Field with the closing price. |

## This example's columns (5 columns, 30 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `day` (Day) | date | `x` | 30 different, e.g. "2026-08-17", "2026-08-18", "2026-08-19" |
| `open` | number | `open` | 48.15 to 53.06 |
| `high` | number | `high` | 48.28 to 53.49 |
| `low` | number | `low` | 47.48 to 52.17 |
| `close` (Close) | number | `close` | 48.15 to 53.06 |

## The data drawing it now

| day | open | high | low | close |
| --- | --- | --- | --- | --- |
| 2026-08-17 | 48.2 | 48.28 | 48.1 | 48.15 |
| 2026-08-18 | 48.15 | 48.92 | 47.48 | 48.86 |
| 2026-08-19 | 48.86 | 49.36 | 48.76 | 49.24 |
| 2026-08-20 | 49.24 | 49.52 | 48.72 | 49.42 |
| 2026-08-21 | 49.42 | 50.14 | 49.09 | 50.09 |
| 2026-08-24 | 50.09 | 50.2 | 48.67 | 49.26 |
| 2026-08-25 | 49.26 | 49.43 | 49.02 | 49.38 |
| 2026-08-26 | 49.38 | 49.52 | 47.93 | 48.15 |
| 2026-08-27 | 48.15 | 49.13 | 47.98 | 49.02 |
| 2026-08-28 | 49.02 | 49.67 | 48.52 | 49.32 |
| 2026-08-31 | 49.32 | 50.59 | 48.14 | 49.91 |
| 2026-09-01 | 49.91 | 50.32 | 49.05 | 49.44 |
| 2026-09-02 | 49.44 | 50.67 | 49.06 | 50.12 |
| 2026-09-03 | 50.12 | 50.16 | 49.17 | 49.3 |
| 2026-09-04 | 49.3 | 49.85 | 49.01 | 49.48 |
| 2026-09-07 | 49.48 | 50.16 | 49.26 | 49.87 |
| 2026-09-08 | 49.87 | 50.19 | 49.18 | 49.39 |
| 2026-09-09 | 49.39 | 50.03 | 48.34 | 49.92 |
| 2026-09-10 | 49.92 | 50.41 | 48.91 | 49.26 |
| 2026-09-11 | 49.26 | 50.85 | 48.88 | 50.62 |
| 2026-09-14 | 50.62 | 52.02 | 49.98 | 51.98 |
| 2026-09-15 | 51.98 | 52.41 | 50.93 | 51.58 |
| 2026-09-16 | 51.58 | 51.8 | 51.44 | 51.69 |
| 2026-09-17 | 51.69 | 52.68 | 50.65 | 52.42 |
| 2026-09-18 | 52.42 | 53.33 | 52.17 | 53.06 |
| 2026-09-21 | 53.06 | 53.49 | 52.13 | 52.39 |
| 2026-09-22 | 52.39 | 52.75 | 52.06 | 52.41 |
| 2026-09-23 | 52.41 | 53.24 | 51.74 | 52.23 |
| 2026-09-24 | 52.23 | 52.42 | 51.26 | 51.8 |
| 2026-09-25 | 51.8 | 51.98 | 51.72 | 51.86 |

As CSV:

```csv
day,open,high,low,close
2026-08-17,48.2,48.28,48.1,48.15
2026-08-18,48.15,48.92,47.48,48.86
2026-08-19,48.86,49.36,48.76,49.24
2026-08-20,49.24,49.52,48.72,49.42
2026-08-21,49.42,50.14,49.09,50.09
2026-08-24,50.09,50.2,48.67,49.26
2026-08-25,49.26,49.43,49.02,49.38
2026-08-26,49.38,49.52,47.93,48.15
2026-08-27,48.15,49.13,47.98,49.02
2026-08-28,49.02,49.67,48.52,49.32
2026-08-31,49.32,50.59,48.14,49.91
2026-09-01,49.91,50.32,49.05,49.44
2026-09-02,49.44,50.67,49.06,50.12
2026-09-03,50.12,50.16,49.17,49.3
2026-09-04,49.3,49.85,49.01,49.48
2026-09-07,49.48,50.16,49.26,49.87
2026-09-08,49.87,50.19,49.18,49.39
2026-09-09,49.39,50.03,48.34,49.92
2026-09-10,49.92,50.41,48.91,49.26
2026-09-11,49.26,50.85,48.88,50.62
2026-09-14,50.62,52.02,49.98,51.98
2026-09-15,51.98,52.41,50.93,51.58
2026-09-16,51.58,51.8,51.44,51.69
2026-09-17,51.69,52.68,50.65,52.42
2026-09-18,52.42,53.33,52.17,53.06
2026-09-21,53.06,53.49,52.13,52.39
2026-09-22,52.39,52.75,52.06,52.41
2026-09-23,52.41,53.24,51.74,52.23
2026-09-24,52.23,52.42,51.26,51.8
2026-09-25,51.8,51.98,51.72,51.86
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "share-price",
  "title": "Share price",
  "subtitle": "Last 30 trading days, with a 5-day average",
  "description": "Daily open, high, low and close, up days in blue and down days in red, with the 5-day moving average of the close.",
  "footer": "Source: market data, closing at {last:close}",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "day": "2026-08-17",
        "open": 48.2,
        "high": 48.28,
        "low": 48.1,
        "close": 48.15
      },
      {
        "day": "2026-08-18",
        "open": 48.15,
        "high": 48.92,
        "low": 47.48,
        "close": 48.86
      },
      {
        "day": "2026-08-19",
        "open": 48.86,
        "high": 49.36,
        "low": 48.76,
        "close": 49.24
      }
    ]
  },
  "fields": {
    "day": {
      "label": "Day",
      "format": {
        "type": "date",
        "style": "medium"
      }
    },
    "open": {
      "format": {
        "type": "currency",
        "currency": "EUR",
        "decimals": 2
      }
    },
    "high": {
      "format": {
        "type": "currency",
        "currency": "EUR",
        "decimals": 2
      }
    },
    "low": {
      "format": {
        "type": "currency",
        "currency": "EUR",
        "decimals": 2
      }
    },
    "close": {
      "label": "Close",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "decimals": 2
      }
    }
  },
  "view": {
    "type": "candlestick",
    "x": "day",
    "open": "open",
    "high": "high",
    "low": "low",
    "close": "close",
    "average": 5
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `line` | fits | better | Better for comparing amounts across categories and actual against target or plan, and still good for trend over time. | `{"type":"line","x":"day","y":["open","high"]}` |
| `area` | fits | better | Better for how each group or period splits, and still good for trend over time. | `{"type":"area","x":"day","y":["open","high"]}` |
| `horizon` | fits | better | Better for comparing amounts across categories, and still good for trend over time. | `{"type":"horizon","x":"day","y":["open","high"]}` |
| `calendar` | fits | trade-off | Better for patterns across two dimensions or a cycle; weaker for trend over time. | `{"type":"calendar","date":"day","value":"open"}` |
| `hbar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up trend over time. | `{"type":"hbar","label":"day","value":["open","high"]}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up trend over time. | `{"type":"beeswarm","value":"open"}` |
| `histogram` | fits | different | Answers a different question: better for how values spread, but gives up trend over time. | `{"type":"histogram","value":"open"}` |
| `kpi` | fits | different | Answers a different question: better for a headline number, but gives up trend over time. | `{"type":"kpi","value":"open","x":"day"}` |
| `scatter` | fits | different | Answers a different question: better for how two measures relate, but gives up trend over time. | `{"type":"scatter","x":"open","y":"high"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up trend over time. | `{"type":"table"}` |
| `boxplot` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"boxplot","value":"open"}` |
| `dot` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"dot","label":"day","value":["open","high"]}` |
| `icicle` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"icicle","levels":"day","value":"open"}` |
| `kpis` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"open"},{"value":"high"},{"value":"low"}]}` |
| `ridgeline` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"open","group":"day"}` |
| `rose` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"rose","label":"day","y":["open","high"]}` |
| `sunburst` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"day","value":"open"}` |
| `treemap` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"treemap","label":"day","value":"open"}` |
| `list` | stretch: 30 rows: this chart crowds past about 20. | different | Answers a different question: better for ranking, top to bottom and exact values and lookup, but gives up trend over time. | `{"type":"list","label":"day"}` |
| `bar` | stretch: 30 rows: this chart crowds past about 16. | worse | Weaker for trend over time, with nothing gained for this data. | `{"type":"bar","x":"day","y":["open","high"]}` |
| `donut` | stretch: 30 rows: this chart crowds past about 6. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"donut","label":"day","value":"open"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 30 rows. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"gauge","value":"open"}` |
| `pareto` | stretch: 30 rows: this chart crowds past about 25. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"pareto","label":"day","value":"open"}` |
| `pie` | stretch: 30 rows: this chart crowds past about 6. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"pie","label":"day","value":"open"}` |
| `radar` | stretch: 30 rows: this chart crowds past about 12. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"radar","label":"day","y":["open","high"]}` |
| `waffle` | stretch: 30 rows: this chart crowds past about 5. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"waffle","label":"day","value":"open"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "day", already the x)); `board` (needs a separate column for stage (it would reuse "day", already the label)); `bullet` (It needs a target, plan or budget column.); `bump` (needs a separate column for series (it would reuse "day", already the x)); `chord` (needs a separate column for target (it would reuse "day", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "day", already the x)); `history` (needs a separate column for title (it would reuse "day", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "day", already the x)); `matrix` (needs a separate column for y (it would reuse "day", already the x)); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "day", already the label)); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "day", already the source)); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a separate column for start (it would reuse "day", already the label)); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "day", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
