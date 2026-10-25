# `list` chart

A stacked list: one line per row with a label, optional detail underneath, and an optional value on the right.

## What it is for

- Exact values and lookup: best
- Ranking, top to bottom: good

**Best for**

- Top-N lists where names matter more than sizes: top customers, latest deals
- Narrow cards and phones

**Least useful for**

- Seeing sizes at a glance (use hbar)
- Long lists (use table)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One line per row: label, an optional detail underneath and an optional value on the right.

**Rows it reads well with**: 1 to 20.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field for the main text of each item. |
| `detail` | category |  | Field for the smaller line under the label. |
| `value` | number |  | Field for the number on the right. |

## This example's columns (4 columns, 5 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `name` | category | `label` | 5 different, e.g. "Aurora Logistics", "Bellwether Foods", "Cobalt Analytics" |
| `country` | category | `detail` | 5 different, e.g. "Luxembourg", "France", "Germany" |
| `revenue` | number | `value` | 139400 to 214000 |
| `segment` | category | not drawn | 2 different, e.g. "Enterprise", "Mid-market" |

## The data drawing it now

| name | country | revenue | segment |
| --- | --- | --- | --- |
| Aurora Logistics | Luxembourg | 214000 | Enterprise |
| Bellwether Foods | France | 188500 | Enterprise |
| Cobalt Analytics | Germany | 172300 | Mid-market |
| Dunmore Retail | Belgium | 151900 | Mid-market |
| Everline Health | Netherlands | 139400 | Enterprise |

As CSV:

```csv
name,country,revenue,segment
Aurora Logistics,Luxembourg,214000,Enterprise
Bellwether Foods,France,188500,Enterprise
Cobalt Analytics,Germany,172300,Mid-market
Dunmore Retail,Belgium,151900,Mid-market
Everline Health,Netherlands,139400,Enterprise
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "top-customers",
  "title": "Top customers",
  "subtitle": "By revenue, year to date",
  "description": "The five customers with the most revenue.",
  "footer": "Source: /data/customers.json",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "name": "Aurora Logistics",
        "country": "Luxembourg",
        "segment": "Enterprise",
        "revenue": 214000
      },
      {
        "name": "Bellwether Foods",
        "country": "France",
        "segment": "Enterprise",
        "revenue": 188500
      },
      {
        "name": "Cobalt Analytics",
        "country": "Germany",
        "segment": "Mid-market",
        "revenue": 172300
      }
    ]
  },
  "fields": {
    "revenue": {
      "format": {
        "type": "bar",
        "format": {
          "type": "currency",
          "currency": "EUR",
          "decimals": 0,
          "compact": true
        }
      }
    }
  },
  "view": {
    "type": "list",
    "label": "name",
    "detail": "country",
    "value": "revenue"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `table` | fits | same | Keeps the job (exact values and lookup) with a different look. | `{"type":"table"}` |
| `bar` | fits | different | Answers a different question: better for comparing amounts across categories and trend over time, but gives up exact values and lookup. | `{"type":"bar","x":"name","y":"revenue"}` |
| `hbar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up exact values and lookup. | `{"type":"hbar","label":"name","value":"revenue"}` |
| `icicle` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up exact values and lookup. | `{"type":"icicle","levels":["name","country"],"value":"revenue"}` |
| `marimekko` | fits | different | Answers a different question: better for how each group or period splits and comparing amounts across categories, but gives up exact values and lookup. | `{"type":"marimekko","x":"name","series":"country","value":"revenue"}` |
| `pareto` | fits | different | Answers a different question: better for what drives or moves a total and share of one whole, but gives up exact values and lookup. | `{"type":"pareto","label":"name","value":"revenue"}` |
| `sunburst` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up exact values and lookup. | `{"type":"sunburst","levels":["name","country"],"value":"revenue"}` |
| `donut` | fits | different | Answers a different question: better for share of one whole, but gives up exact values and lookup. | `{"type":"donut","label":"name","value":"revenue"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up exact values and lookup. | `{"type":"sankey","source":"name","target":"country","value":"revenue"}` |
| `kpi` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"kpi","value":"revenue"}` |
| `kpis` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"revenue"}]}` |
| `radar` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"radar","label":"name","y":"revenue"}` |
| `rose` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"rose","label":"name","y":"revenue"}` |
| `treemap` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"treemap","label":"name","value":"revenue"}` |
| `waffle` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"waffle","label":"name","value":"revenue"}` |
| `heatmap` | stretch: 5 rows: this chart says little with fewer than 6. | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up exact values and lookup. | `{"type":"heatmap","x":"name","y":"country","value":"revenue"}` |
| `area` | stretch: x expects dates; "name" is text, so its rows are drawn in the order given. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"area","x":"name","y":"revenue"}` |
| `beeswarm` | stretch: 5 rows: this chart says little with fewer than 10. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"revenue","label":"name"}` |
| `boxplot` | stretch: 5 rows: this chart says little with fewer than 15. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"boxplot","value":"revenue"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 5 rows. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"gauge","value":"revenue"}` |
| `histogram` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"histogram","value":"revenue"}` |
| `horizon` | stretch: x expects dates; "name" is text, so its rows are drawn in the order given. 5 rows: this chart says little with fewer than 10. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"horizon","x":"name","y":"revenue"}` |
| `line` | stretch: x expects dates; "name" is text, so its rows are drawn in the order given. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"line","x":"name","y":"revenue"}` |
| `ridgeline` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"revenue","group":"name"}` |

Not possible with this data: `bullet` (needs a separate column for target (it would reuse "revenue", already the value)); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "revenue", already the open)); `chord` (It needs flows that go both ways between the same groups.); `dumbbell` (needs a separate column for to (it would reuse "revenue", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `meter` (needs a separate column for target (it would reuse "revenue", already the value)); `rings` (needs a separate column for target (it would reuse "revenue", already the value)); `scatter` (needs a separate column for y (it would reuse "revenue", already the x)); `slope` (needs a separate column for to (it would reuse "revenue", already the from)); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "revenue", already the value)); `waterfall` (It needs changes that add up from one total to another.).
