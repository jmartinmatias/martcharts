# `waterfall` chart

A bridge: how a total moves to another through increases and decreases, each floating from the running total, with totals standing on zero.

## What it is for

- What drives or moves a total: best
- Change between two points: good

**Best for**

- Bridges: what took revenue from Q2 to Q3, a profit and loss walk
- Explaining a move from a start to an end

**Least useful for**

- Amounts that are not changes to one total (use bar)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: Rows in order: totals stand on zero, and every other row is a change floating from the running total, up or down.

**Rows it reads well with**: 3 to 15.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each step. |
| `value` | number | yes | Field with each step's change, or the amount for total rows. |

## This example's columns (2 columns, 6 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `step` | category | `label` | 6 different, e.g. "Q2 revenue", "New customers", "Upsell" |
| `amount` (Revenue) | number | `value` | -84000 to 1180000 |

## The data drawing it now

| step | amount |
| --- | --- |
| Q2 revenue | 1180000 |
| New customers | 142000 |
| Upsell | 58000 |
| Pricing | 21000 |
| Churn | -84000 |
| Discounts | -33000 |

As CSV:

```csv
step,amount
Q2 revenue,1180000
New customers,142000
Upsell,58000
Pricing,21000
Churn,-84000
Discounts,-33000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "revenue-bridge",
  "title": "Revenue bridge",
  "subtitle": "Q2 to Q3 2026",
  "description": "What moved quarterly revenue from Q2 to Q3: gains from new customers, upsell and pricing, losses from churn and discounts.",
  "source": {
    "name": "Finance ledger"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "step": "Q2 revenue",
        "amount": 1180000
      },
      {
        "step": "New customers",
        "amount": 142000
      },
      {
        "step": "Upsell",
        "amount": 58000
      }
    ]
  },
  "fields": {
    "amount": {
      "label": "Revenue",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    }
  },
  "view": {
    "type": "waterfall",
    "label": "step",
    "value": "amount",
    "totals": [
      "Q2 revenue"
    ],
    "endLabel": "Q3 revenue",
    "fit": true
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `bar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up what drives or moves a total. Shows each amount on its own but no longer how they add up from start to end. | `{"type":"bar","x":"step","y":"amount"}` |
| `hbar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up what drives or moves a total. | `{"type":"hbar","label":"step","value":"amount"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up what drives or moves a total. | `{"type":"list","label":"step","value":"amount"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up what drives or moves a total. | `{"type":"table"}` |
| `dot` | fits | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"dot","label":"step","value":"amount"}` |
| `kpi` | fits | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"kpi","value":"amount"}` |
| `kpis` | fits | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"amount"}]}` |
| `radar` | fits | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"radar","label":"step","y":"amount"}` |
| `pareto` | stretch: "amount" has negative values, which this chart cannot draw as areas. | same | Keeps the job (what drives or moves a total) with a different look. | `{"type":"pareto","label":"step","value":"amount"}` |
| `area` | stretch: x expects dates; "step" is text, so its rows are drawn in the order given. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"area","x":"step","y":"amount"}` |
| `beeswarm` | stretch: 6 rows: this chart says little with fewer than 10. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"amount","label":"step"}` |
| `boxplot` | stretch: 6 rows: this chart says little with fewer than 15. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"boxplot","value":"amount"}` |
| `donut` | stretch: "amount" has negative values, which this chart cannot draw as areas. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"donut","label":"step","value":"amount"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 6 rows. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"gauge","value":"amount"}` |
| `histogram` | stretch: 6 rows: this chart says little with fewer than 20. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"histogram","value":"amount"}` |
| `horizon` | stretch: x expects dates; "step" is text, so its rows are drawn in the order given. 6 rows: this chart says little with fewer than 10. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"horizon","x":"step","y":"amount"}` |
| `icicle` | stretch: "amount" has negative values, which this chart cannot draw as areas. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"icicle","levels":"step","value":"amount"}` |
| `line` | stretch: x expects dates; "step" is text, so its rows are drawn in the order given. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"line","x":"step","y":"amount"}` |
| `pie` | stretch: "amount" has negative values, which this chart cannot draw as areas. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"pie","label":"step","value":"amount"}` |
| `ridgeline` | stretch: 6 rows: this chart says little with fewer than 20. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"amount","group":"step"}` |
| `rose` | stretch: "amount" has negative values, which this chart cannot draw as areas. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"rose","label":"step","y":"amount"}` |
| `sunburst` | stretch: "amount" has negative values, which this chart cannot draw as areas. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"step","value":"amount"}` |
| `treemap` | stretch: "amount" has negative values, which this chart cannot draw as areas. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"treemap","label":"step","value":"amount"}` |
| `waffle` | stretch: 6 rows: this chart crowds past about 5. "amount" has negative values, which this chart cannot draw as areas. | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"waffle","label":"step","value":"amount"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "step", already the x)); `board` (needs a separate column for stage (it would reuse "step", already the label)); `bullet` (needs a separate column for target (it would reuse "amount", already the value)); `bump` (needs a separate column for series (it would reuse "step", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "amount", already the open)); `chord` (needs a separate column for target (it would reuse "step", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "amount", already the y)); `dumbbell` (needs a separate column for to (it would reuse "amount", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "step", already the x)); `history` (needs a separate column for title (it would reuse "step", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "step", already the x)); `matrix` (needs a separate column for y (it would reuse "step", already the x)); `meter` (needs a separate column for target (it would reuse "amount", already the value)); `pyramid` (needs a separate column for right (it would reuse "amount", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "step", already the label)); `rings` (needs a separate column for target (it would reuse "amount", already the value)); `sankey` (needs a separate column for target (it would reuse "step", already the source)); `scatter` (needs a separate column for y (it would reuse "amount", already the x)); `slope` (needs a separate column for to (it would reuse "amount", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "amount", already the value)); `whitespace` (needs a separate column for column (it would reuse "step", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
