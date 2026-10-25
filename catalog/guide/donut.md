# `donut` chart

Part-to-whole at a glance: a ring of up to 6 slices with the total in the middle and a legend of values and shares. Compare close values with a bar chart instead.

## What it is for

- Share of one whole: best
- A headline number: possible
- Comparing amounts across categories: possible

**Best for**

- Share of one whole with two to five parts: revenue by segment, budget by team
- An executive summary where the total matters too

**Least useful for**

- More than six parts or close values (use hbar)
- Comparing several wholes (use bar stacked to percent)
- Change over time (use area)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One slice per row, its angle its share of the sum of value, with the total in the middle.

**Rows it reads well with**: 2 to 6.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each slice. |
| `value` | number | yes | Field with each slice's amount. Zero, negative and missing values are left out. |

## This example's columns (2 columns, 3 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `segment` | category | `label` | 3 different, e.g. "Enterprise", "Mid-market", "Small business" |
| `revenue` (Revenue) | number | `value` | 97600 to 660100 |

## The data drawing it now

| segment | revenue |
| --- | --- |
| Enterprise | 660100 |
| Mid-market | 447000 |
| Small business | 97600 |

As CSV:

```csv
segment,revenue
Enterprise,660100
Mid-market,447000
Small business,97600
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "revenue-by-segment",
  "title": "Revenue by segment",
  "subtitle": "Year to date",
  "description": "How revenue splits across customer segments.",
  "footer": "Source: /data/customers.json",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "segment": "Enterprise",
        "revenue": 660100
      },
      {
        "segment": "Mid-market",
        "revenue": 447000
      },
      {
        "segment": "Small business",
        "revenue": 97600
      }
    ]
  },
  "fields": {
    "revenue": {
      "label": "Revenue",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    }
  },
  "view": {
    "type": "donut",
    "label": "segment",
    "value": "revenue"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `waffle` | fits | same | Keeps the job (share of one whole) with a different look. Shares read as countable squares, so 37% looks like 37 of 100; better for a general audience. | `{"type":"waffle","label":"segment","value":"revenue"}` |
| `bar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up share of one whole. | `{"type":"bar","x":"segment","y":"revenue"}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up share of one whole. Easier to compare close shares and to rank them; the sense of one whole is weaker. | `{"type":"hbar","label":"segment","value":"revenue"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up share of one whole. | `{"type":"list","label":"segment","value":"revenue"}` |
| `funnel` | fits | different | Answers a different question: better for conversion through ordered steps, but gives up share of one whole. | `{"type":"funnel","label":"segment","value":"revenue"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up share of one whole. | `{"type":"table"}` |
| `kpi` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"kpi","value":"revenue"}` |
| `kpis` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"revenue"}]}` |
| `radar` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"radar","label":"segment","y":"revenue"}` |
| `treemap` | stretch: 3 rows: this chart says little with fewer than 4. | same | Keeps the job (share of one whole) with a different look. Scales to many more parts; with two or three parts a donut is simpler. | `{"type":"treemap","label":"segment","value":"revenue"}` |
| `area` | stretch: x expects dates; "segment" is text, so its rows are drawn in the order given. 3 rows: this chart says little with fewer than 4. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"area","x":"segment","y":"revenue"}` |
| `beeswarm` | stretch: 3 rows: this chart says little with fewer than 10. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"revenue","label":"segment"}` |
| `boxplot` | stretch: 3 rows: this chart says little with fewer than 15. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"boxplot","value":"revenue"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 3 rows. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"gauge","value":"revenue"}` |
| `histogram` | stretch: 3 rows: this chart says little with fewer than 20. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"histogram","value":"revenue"}` |
| `horizon` | stretch: x expects dates; "segment" is text, so its rows are drawn in the order given. 3 rows: this chart says little with fewer than 10. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"horizon","x":"segment","y":"revenue"}` |
| `icicle` | stretch: 3 rows: this chart says little with fewer than 4. | worse | Weaker for share of one whole, with nothing gained for this data. | `{"type":"icicle","levels":"segment","value":"revenue"}` |
| `line` | stretch: x expects dates; "segment" is text, so its rows are drawn in the order given. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"line","x":"segment","y":"revenue"}` |
| `pareto` | stretch: 3 rows: this chart says little with fewer than 4. | worse | Weaker for share of one whole, with nothing gained for this data. | `{"type":"pareto","label":"segment","value":"revenue"}` |
| `ridgeline` | stretch: 3 rows: this chart says little with fewer than 20. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"revenue","group":"segment"}` |
| `rose` | stretch: 3 rows: this chart says little with fewer than 4. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"rose","label":"segment","y":"revenue"}` |
| `sunburst` | stretch: 3 rows: this chart says little with fewer than 4. | worse | Weaker for share of one whole, with nothing gained for this data. | `{"type":"sunburst","levels":"segment","value":"revenue"}` |

Not possible with this data: `bullet` (needs a separate column for target (it would reuse "revenue", already the value)); `bump` (needs a separate column for series (it would reuse "segment", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "revenue", already the open)); `chord` (needs a separate column for target (it would reuse "segment", already the source)); `dumbbell` (needs a separate column for to (it would reuse "revenue", already the from)); `heatmap` (needs a separate column for y (it would reuse "segment", already the x)); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `marimekko` (needs a separate column for series (it would reuse "segment", already the x)); `meter` (needs a separate column for target (it would reuse "revenue", already the value)); `rings` (needs a separate column for target (it would reuse "revenue", already the value)); `sankey` (needs a separate column for target (it would reuse "segment", already the source)); `scatter` (needs a separate column for y (it would reuse "revenue", already the x)); `slope` (needs a separate column for to (it would reuse "revenue", already the from)); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "revenue", already the value)); `waterfall` (It needs changes that add up from one total to another.).
