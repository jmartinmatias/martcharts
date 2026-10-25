# `chord` chart

Flows between groups around a circle: each group an arc as long as everything it sends and receives, each flow a ribbon from its sender to its receiver, in the sender's color. For exchanges within one set, such as customers moving between plans or staff moving between teams.

## What it is for

- Flows between stages or groups: best
- How two measures relate: possible

**Best for**

- Two-way flows among the same groups: customers moving between plans, trade between regions

**Least useful for**

- One-way chains of stages (use sankey)
- Reading exact amounts (use table)
- More than about ten groups

## The data it needs

**One row is**: One row per flow, from a source to a target.

**How the chart is built**: Each group is an arc as long as everything it sends and receives; each row is a ribbon from source to target, as thick as value.

**Rows it reads well with**: 3 to 60.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `source` | category | yes | Field naming where each flow comes from. |
| `target` | category | yes | Field naming where each flow goes. |
| `value` | number | yes | Field with each flow's size. |

## This example's columns (3 columns, 8 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `from` | category | `source` | 4 different, e.g. "Starter", "Growth", "Pro" |
| `to` | category | `target` | 4 different, e.g. "Growth", "Pro", "Starter" |
| `customers` (Customers) | number | `value` | 6 to 120 |

## The data drawing it now

| from | to | customers |
| --- | --- | --- |
| Starter | Growth | 120 |
| Starter | Pro | 40 |
| Growth | Pro | 85 |
| Growth | Starter | 30 |
| Growth | Enterprise | 10 |
| Pro | Enterprise | 25 |
| Pro | Growth | 18 |
| Enterprise | Pro | 6 |

As CSV:

```csv
from,to,customers
Starter,Growth,120
Starter,Pro,40
Growth,Pro,85
Growth,Starter,30
Growth,Enterprise,10
Pro,Enterprise,25
Pro,Growth,18
Enterprise,Pro,6
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "plan-moves",
  "title": "Plan changes",
  "subtitle": "Q3 2026, customers moving between plans",
  "description": "Every upgrade and downgrade between plans this quarter. Starter to Growth is the biggest move; downgrades are the thin ribbons running back.",
  "footer": "Source: billing, {sum:customers} moves",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "from": "Starter",
        "to": "Growth",
        "customers": 120
      },
      {
        "from": "Starter",
        "to": "Pro",
        "customers": 40
      },
      {
        "from": "Growth",
        "to": "Pro",
        "customers": 85
      }
    ]
  },
  "fields": {
    "customers": {
      "label": "Customers",
      "format": {
        "type": "number"
      }
    }
  },
  "view": {
    "type": "chord",
    "source": "from",
    "target": "to",
    "value": "customers"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `sankey` | fits | same | Keeps the job (flows between stages or groups) with a different look. Reads as a left-to-right path; better when flows run one way through stages. | `{"type":"sankey","source":"from","target":"to","value":"customers"}` |
| `icicle` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up flows between stages or groups. | `{"type":"icicle","levels":["from","to"],"value":"customers"}` |
| `marimekko` | fits | different | Answers a different question: better for how each group or period splits and comparing amounts across categories, but gives up flows between stages or groups. | `{"type":"marimekko","x":"from","series":"to","value":"customers"}` |
| `sunburst` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up flows between stages or groups. | `{"type":"sunburst","levels":["from","to"],"value":"customers"}` |
| `heatmap` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up flows between stages or groups. | `{"type":"heatmap","x":"from","y":"to","value":"customers"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up flows between stages or groups. | `{"type":"table"}` |
| `kpi` | fits | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"kpi","value":"customers"}` |
| `kpis` | fits | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"customers"}]}` |
| `bar` | stretch: "from" repeats (4 different values in 8 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up flows between stages or groups. | `{"type":"bar","x":"from","y":"customers"}` |
| `hbar` | stretch: "from" repeats (4 different values in 8 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up flows between stages or groups. | `{"type":"hbar","label":"from","value":"customers"}` |
| `list` | stretch: "from" repeats (4 different values in 8 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up flows between stages or groups. | `{"type":"list","label":"from","value":"customers"}` |
| `area` | stretch: x expects dates; "from" is text, so its rows are drawn in the order given. "from" repeats (4 different values in 8 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"area","x":"from","y":"customers"}` |
| `beeswarm` | stretch: 8 rows: this chart says little with fewer than 10. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"customers"}` |
| `boxplot` | stretch: 8 rows: this chart says little with fewer than 15. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"boxplot","value":"customers"}` |
| `donut` | stretch: "from" repeats (4 different values in 8 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 8 rows: this chart crowds past about 6. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"donut","label":"from","value":"customers"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 8 rows. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"gauge","value":"customers"}` |
| `histogram` | stretch: 8 rows: this chart says little with fewer than 20. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"histogram","value":"customers"}` |
| `horizon` | stretch: x expects dates; "from" is text, so its rows are drawn in the order given. "from" repeats (4 different values in 8 rows), but this chart wants one row per period: sum the rows first with an aggregate step. 8 rows: this chart says little with fewer than 10. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"horizon","x":"from","y":"customers"}` |
| `line` | stretch: x expects dates; "from" is text, so its rows are drawn in the order given. "from" repeats (4 different values in 8 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"line","x":"from","y":"customers"}` |
| `pareto` | stretch: "from" repeats (4 different values in 8 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"pareto","label":"from","value":"customers"}` |
| `radar` | stretch: "from" repeats (4 different values in 8 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"radar","label":"from","y":"customers"}` |
| `ridgeline` | stretch: 8 rows: this chart says little with fewer than 20. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"customers","group":"from"}` |
| `rose` | stretch: "from" repeats (4 different values in 8 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"rose","label":"from","y":"customers"}` |
| `treemap` | stretch: "from" repeats (4 different values in 8 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"treemap","label":"from","value":"customers"}` |
| `waffle` | stretch: "from" repeats (4 different values in 8 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 8 rows: this chart crowds past about 5. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"waffle","label":"from","value":"customers"}` |

Not possible with this data: `bullet` (needs a separate column for target (it would reuse "customers", already the value)); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "customers", already the open)); `dumbbell` (needs a separate column for to (it would reuse "customers", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `meter` (needs a separate column for target (it would reuse "customers", already the value)); `rings` (needs a separate column for target (it would reuse "customers", already the value)); `scatter` (needs a separate column for y (it would reuse "customers", already the x)); `slope` (needs a separate column for to (it would reuse "customers", already the from)); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "customers", already the value)); `waterfall` (It needs changes that add up from one total to another.).
