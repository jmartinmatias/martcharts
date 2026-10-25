# `table` chart

Rows and columns. The default view, and the one to use when people need exact values.

## What it is for

- Exact values and lookup: best
- Comparing amounts across categories: possible

**Best for**

- Exact values, many columns, audit and export
- Data people will look up rather than scan

**Least useful for**

- Seeing a pattern at a glance (use any chart)

## The data it needs

**One row is**: Any rows.

**How the chart is built**: One line per row and one column per field (or the columns listed), formatted, sortable, with optional totals.

**Rows it reads well with**: 1 to any number.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `columns` | any (one or more) |  | Fields to show, in order. Defaults to every field in the rows. |

## This example's columns (4 columns, 5 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `deal` | category | `columns` | 5 different, e.g. "Aurora Logistics renewal", "Cobalt Analytics expansion", "Fjord Energy pilot" |
| `owner` | category | `columns` | 3 different, e.g. "Lea", "Marc", "Ines" |
| `stage` | category | `columns` | 4 different, e.g. "Won", "Negotiation", "Proposal" |
| `amount` | number | `columns` | 58000 to 240000 |

## The data drawing it now

| deal | owner | stage | amount |
| --- | --- | --- | --- |
| Aurora Logistics renewal | Lea | Won | 240000 |
| Cobalt Analytics expansion | Marc | Negotiation | 185000 |
| Fjord Energy pilot | Ines | Proposal | 96000 |
| Halcyon Travel upgrade | Marc | At risk | 64000 |
| Granite Bank onboarding | Lea | Negotiation | 58000 |

As CSV:

```csv
deal,owner,stage,amount
Aurora Logistics renewal,Lea,Won,240000
Cobalt Analytics expansion,Marc,Negotiation,185000
Fjord Energy pilot,Ines,Proposal,96000
Halcyon Travel upgrade,Marc,At risk,64000
Granite Bank onboarding,Lea,Negotiation,58000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "deal-pipeline",
  "title": "Open deals",
  "subtitle": "Largest first",
  "description": "Deals in progress with their stage.",
  "footer": "Source: CRM",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "deal": "Aurora Logistics renewal",
        "owner": "Lea",
        "stage": "Won",
        "amount": 240000
      },
      {
        "deal": "Cobalt Analytics expansion",
        "owner": "Marc",
        "stage": "Negotiation",
        "amount": 185000
      },
      {
        "deal": "Fjord Energy pilot",
        "owner": "Ines",
        "stage": "Proposal",
        "amount": 96000
      }
    ]
  },
  "fields": {
    "amount": {
      "format": {
        "type": "bar",
        "format": {
          "type": "currency",
          "currency": "EUR",
          "decimals": 0
        }
      }
    },
    "stage": {
      "format": {
        "type": "badge",
        "tones": {
          "Won": "positive",
          "Negotiation": "accent",
          "Proposal": "neutral",
          "At risk": "negative"
        }
      }
    }
  },
  "view": {
    "type": "table",
    "columns": [
      "deal",
      "owner",
      "stage",
      "amount"
    ],
    "totals": true
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `list` | fits | better | Better for ranking, top to bottom, and still good for exact values and lookup. | `{"type":"list","label":"deal"}` |
| `bar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up exact values and lookup. | `{"type":"bar","x":"deal","y":"amount"}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up exact values and lookup. | `{"type":"hbar","label":"deal","value":"amount"}` |
| `icicle` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up exact values and lookup. | `{"type":"icicle","levels":["deal","owner"],"value":"amount"}` |
| `marimekko` | fits | different | Answers a different question: better for how each group or period splits and share of one whole, but gives up exact values and lookup. | `{"type":"marimekko","x":"deal","series":"owner","value":"amount"}` |
| `pareto` | fits | different | Answers a different question: better for ranking, top to bottom and what drives or moves a total, but gives up exact values and lookup. | `{"type":"pareto","label":"deal","value":"amount"}` |
| `sunburst` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up exact values and lookup. | `{"type":"sunburst","levels":["deal","owner"],"value":"amount"}` |
| `donut` | fits | different | Answers a different question: better for share of one whole, but gives up exact values and lookup. | `{"type":"donut","label":"deal","value":"amount"}` |
| `funnel` | fits | different | Answers a different question: better for conversion through ordered steps, but gives up exact values and lookup. | `{"type":"funnel","label":"deal","value":"amount"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up exact values and lookup. | `{"type":"sankey","source":"deal","target":"owner","value":"amount"}` |
| `kpi` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"kpi","value":"amount"}` |
| `kpis` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"amount"}]}` |
| `radar` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"radar","label":"deal","y":"amount"}` |
| `rose` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"rose","label":"deal","y":"amount"}` |
| `treemap` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"treemap","label":"deal","value":"amount"}` |
| `waffle` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"waffle","label":"deal","value":"amount"}` |
| `heatmap` | stretch: 5 rows: this chart says little with fewer than 6. | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up exact values and lookup. | `{"type":"heatmap","x":"deal","y":"owner","value":"amount"}` |
| `area` | stretch: x expects dates; "deal" is text, so its rows are drawn in the order given. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"area","x":"deal","y":"amount"}` |
| `beeswarm` | stretch: 5 rows: this chart says little with fewer than 10. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"amount"}` |
| `boxplot` | stretch: 5 rows: this chart says little with fewer than 15. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"boxplot","value":"amount"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 5 rows. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"gauge","value":"amount"}` |
| `histogram` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"histogram","value":"amount"}` |
| `horizon` | stretch: x expects dates; "deal" is text, so its rows are drawn in the order given. 5 rows: this chart says little with fewer than 10. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"horizon","x":"deal","y":"amount"}` |
| `line` | stretch: x expects dates; "deal" is text, so its rows are drawn in the order given. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"line","x":"deal","y":"amount"}` |
| `ridgeline` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"amount","group":"deal"}` |

Not possible with this data: `bullet` (needs a separate column for target (it would reuse "amount", already the value)); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "amount", already the open)); `chord` (It needs flows that go both ways between the same groups.); `dumbbell` (needs a separate column for to (it would reuse "amount", already the from)); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `meter` (needs a separate column for target (it would reuse "amount", already the value)); `rings` (needs a separate column for target (it would reuse "amount", already the value)); `scatter` (needs a separate column for y (it would reuse "amount", already the x)); `slope` (needs a separate column for to (it would reuse "amount", already the from)); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "amount", already the value)); `waterfall` (It needs changes that add up from one total to another.).
