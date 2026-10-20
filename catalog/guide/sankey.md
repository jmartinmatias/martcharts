# `sankey` chart

Flows between stages as ribbons as thick as their volume, for example traffic source to landing page to outcome. Each origin's flows keep its color downstream.

## What it is for

- Flows between stages or groups: best
- Nested breakdowns: possible
- What drives or moves a total: possible

**Best for**

- Flows through stages: traffic source to page to outcome, budget to spend
- Where volume goes and where it is lost

**Least useful for**

- Flows that loop back between the same groups (use chord)
- Many tiny flows

## The data it needs

**One row is**: One row per flow, from a source to a target.

**How the chart is built**: Each row is a ribbon from source to target, as thick as value; nodes stack into stages left to right.

**Rows it reads well with**: 2 to 80.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `source` | category | yes | Field naming where each flow starts. |
| `target` | category | yes | Field naming where each flow ends. |
| `value` | number | yes | Field with each flow's volume. |

## This example's columns (3 columns, 12 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `from` | category | `source` | 6 different, e.g. "Search", "Social", "Email" |
| `to` | category | `target` | 5 different, e.g. "Pricing", "Blog", "Home" |
| `visits` (Visits) | number | `value` | 600 to 4500 |

## The data drawing it now

| from | to | visits |
| --- | --- | --- |
| Search | Pricing | 4200 |
| Search | Blog | 2600 |
| Social | Blog | 3100 |
| Social | Home | 1400 |
| Email | Pricing | 1800 |
| Email | Home | 900 |
| Pricing | Signed up | 2100 |
| Pricing | Left | 3900 |
| Blog | Signed up | 1200 |
| Blog | Left | 4500 |
| Home | Signed up | 600 |
| Home | Left | 1700 |

As CSV:

```csv
from,to,visits
Search,Pricing,4200
Search,Blog,2600
Social,Blog,3100
Social,Home,1400
Email,Pricing,1800
Email,Home,900
Pricing,Signed up,2100
Pricing,Left,3900
Blog,Signed up,1200
Blog,Left,4500
Home,Signed up,600
Home,Left,1700
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "traffic-sankey",
  "title": "Where visitors go",
  "subtitle": "September 2026, source to page to outcome",
  "description": "How visits from each source flow through the site to signup or leaving.",
  "footer": "Source: web analytics",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "from": "Search",
        "to": "Pricing",
        "visits": 4200
      },
      {
        "from": "Search",
        "to": "Blog",
        "visits": 2600
      },
      {
        "from": "Social",
        "to": "Blog",
        "visits": 3100
      }
    ]
  },
  "fields": {
    "visits": {
      "label": "Visits",
      "format": {
        "type": "number",
        "compact": true
      }
    }
  },
  "view": {
    "type": "sankey",
    "source": "from",
    "target": "to",
    "value": "visits"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `icicle` | fits | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up flows between stages or groups. | `{"type":"icicle","levels":["from","to"],"value":"visits"}` |
| `marimekko` | fits | different | Answers a different question: better for how each group or period splits and comparing amounts across categories, but gives up flows between stages or groups. | `{"type":"marimekko","x":"from","series":"to","value":"visits"}` |
| `sunburst` | fits | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up flows between stages or groups. | `{"type":"sunburst","levels":["from","to"],"value":"visits"}` |
| `heatmap` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up flows between stages or groups. | `{"type":"heatmap","x":"from","y":"to","value":"visits"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up flows between stages or groups. | `{"type":"table"}` |
| `beeswarm` | fits | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"visits"}` |
| `kpi` | fits | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"kpi","value":"visits"}` |
| `kpis` | fits | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"visits"}]}` |
| `bar` | stretch: "from" repeats (6 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up flows between stages or groups. | `{"type":"bar","x":"from","y":"visits"}` |
| `hbar` | stretch: "from" repeats (6 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up flows between stages or groups. | `{"type":"hbar","label":"from","value":"visits"}` |
| `list` | stretch: "from" repeats (6 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up flows between stages or groups. | `{"type":"list","label":"from","value":"visits"}` |
| `pareto` | stretch: "from" repeats (6 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for ranking, top to bottom and share of one whole, but gives up flows between stages or groups. | `{"type":"pareto","label":"from","value":"visits"}` |
| `area` | stretch: x expects dates; "from" is text, so its rows are drawn in the order given. "from" repeats (6 different values in 12 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"area","x":"from","y":"visits"}` |
| `boxplot` | stretch: 12 rows: this chart says little with fewer than 15. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"boxplot","value":"visits"}` |
| `donut` | stretch: "from" repeats (6 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 12 rows: this chart crowds past about 6. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"donut","label":"from","value":"visits"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 12 rows. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"gauge","value":"visits"}` |
| `histogram` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"histogram","value":"visits"}` |
| `horizon` | stretch: x expects dates; "from" is text, so its rows are drawn in the order given. "from" repeats (6 different values in 12 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"horizon","x":"from","y":"visits"}` |
| `line` | stretch: x expects dates; "from" is text, so its rows are drawn in the order given. "from" repeats (6 different values in 12 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"line","x":"from","y":"visits"}` |
| `radar` | stretch: "from" repeats (6 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"radar","label":"from","y":"visits"}` |
| `ridgeline` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"visits","group":"from"}` |
| `rose` | stretch: "from" repeats (6 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"rose","label":"from","y":"visits"}` |
| `treemap` | stretch: "from" repeats (6 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"treemap","label":"from","value":"visits"}` |
| `waffle` | stretch: "from" repeats (6 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 12 rows: this chart crowds past about 5. | worse | Gives up flows between stages or groups, and this data gives it nothing better to do. | `{"type":"waffle","label":"from","value":"visits"}` |

Not possible with this data: `bullet` (needs a separate column for target (it would reuse "visits", already the value)); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "visits", already the open)); `chord` (It needs flows that go both ways between the same groups.); `dumbbell` (needs a separate column for to (it would reuse "visits", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `meter` (needs a separate column for target (it would reuse "visits", already the value)); `rings` (needs a separate column for target (it would reuse "visits", already the value)); `scatter` (needs a separate column for y (it would reuse "visits", already the x)); `slope` (needs a separate column for to (it would reuse "visits", already the from)); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "visits", already the value)); `waterfall` (It needs changes that add up from one total to another.).
