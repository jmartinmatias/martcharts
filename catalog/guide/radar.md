# `radar` chart

Profiles across several attributes: one spoke per row, rings for one shared scale from zero, and a soft shape per series. For comparing up to 3 profiles, such as a product against the market on speed, price and support.

## What it is for

- Profiles across several attributes: best
- Comparing amounts across categories: good

**Best for**

- Profiles across four to ten attributes on one scale: product against market, skills

**Least useful for**

- Attributes in different units
- More than three shapes
- Rankings (use hbar)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One spoke per row (an attribute) and one shape per y field, all on one scale from zero.

**Rows it reads well with**: 3 to 12.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each spoke, such as an attribute. |
| `y` | number (one or more) | yes | Field or fields with the scores; each field is one shape. Up to 3 stay readable. |

## This example's columns (3 columns, 6 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `attribute` | category | `label` | 6 different, e.g. "Speed", "Reliability", "Support" |
| `us` (Our product) | number | `y` | 6.1 to 9.1 |
| `market` (Market average) | number | `y` | 6.4 to 7.8 |

## The data drawing it now

| attribute | us | market |
| --- | --- | --- |
| Speed | 8.6 | 6.9 |
| Reliability | 9.1 | 7.8 |
| Support | 8.2 | 6.4 |
| Price | 6.1 | 7.4 |
| Integrations | 7.4 | 6.8 |
| Ease of use | 8.8 | 7.1 |

As CSV:

```csv
attribute,us,market
Speed,8.6,6.9
Reliability,9.1,7.8
Support,8.2,6.4
Price,6.1,7.4
Integrations,7.4,6.8
Ease of use,8.8,7.1
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "product-compare",
  "title": "How we compare",
  "subtitle": "Customer ratings out of 10, against the market average",
  "description": "Average customer rating per attribute for our product and for the market. We lead on reliability and ease of use and trail only on price.",
  "footer": "Source: customer survey and analyst panel",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "attribute": "Speed",
        "us": 8.6,
        "market": 6.9
      },
      {
        "attribute": "Reliability",
        "us": 9.1,
        "market": 7.8
      },
      {
        "attribute": "Support",
        "us": 8.2,
        "market": 6.4
      }
    ]
  },
  "fields": {
    "us": {
      "label": "Our product",
      "format": {
        "type": "number",
        "decimals": 1
      }
    },
    "market": {
      "label": "Market average",
      "format": {
        "type": "number",
        "decimals": 1
      }
    }
  },
  "view": {
    "type": "radar",
    "label": "attribute",
    "y": [
      "us",
      "market"
    ],
    "max": 10
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `bar` | fits | different | Answers a different question: better for ranking, top to bottom and trend over time, but gives up profiles across several attributes. | `{"type":"bar","x":"attribute","y":["us","market"]}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up profiles across several attributes. | `{"type":"hbar","label":"attribute","value":"us"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up profiles across several attributes. | `{"type":"list","label":"attribute"}` |
| `slope` | fits | different | Answers a different question: better for change between two points and ranking, top to bottom, but gives up profiles across several attributes. | `{"type":"slope","label":"attribute","from":"us","to":"market"}` |
| `donut` | fits | different | Answers a different question: better for share of one whole, but gives up profiles across several attributes. | `{"type":"donut","label":"attribute","value":"us"}` |
| `dumbbell` | fits | different | Answers a different question: better for change between two points, but gives up profiles across several attributes. | `{"type":"dumbbell","label":"attribute","from":"us","to":"market"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up profiles across several attributes. | `{"type":"table"}` |
| `icicle` | fits | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"icicle","levels":"attribute","value":"us"}` |
| `kpi` | fits | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"kpi","value":"us"}` |
| `kpis` | fits | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"us"},{"value":"market"}]}` |
| `pareto` | fits | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"pareto","label":"attribute","value":"us"}` |
| `rose` | fits | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"rose","label":"attribute","y":["us","market"]}` |
| `scatter` | fits | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"scatter","x":"us","y":"market","label":"attribute"}` |
| `sunburst` | fits | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"attribute","value":"us"}` |
| `treemap` | fits | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"treemap","label":"attribute","value":"us"}` |
| `area` | stretch: x expects dates; "attribute" is text, so its rows are drawn in the order given. | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"area","x":"attribute","y":["us","market"]}` |
| `beeswarm` | stretch: 6 rows: this chart says little with fewer than 10. | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"us","label":"attribute"}` |
| `boxplot` | stretch: 6 rows: this chart says little with fewer than 15. | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"boxplot","value":"us"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 6 rows. | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"gauge","value":"us"}` |
| `histogram` | stretch: 6 rows: this chart says little with fewer than 20. | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"histogram","value":"us"}` |
| `horizon` | stretch: x expects dates; "attribute" is text, so its rows are drawn in the order given. 6 rows: this chart says little with fewer than 10. | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"horizon","x":"attribute","y":["us","market"]}` |
| `line` | stretch: x expects dates; "attribute" is text, so its rows are drawn in the order given. | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"line","x":"attribute","y":["us","market"]}` |
| `ridgeline` | stretch: 6 rows: this chart says little with fewer than 20. | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"us","group":"attribute"}` |
| `waffle` | stretch: 6 rows: this chart crowds past about 5. | worse | Gives up profiles across several attributes, and this data gives it nothing better to do. | `{"type":"waffle","label":"attribute","value":"us"}` |

Not possible with this data: `bullet` (It needs a target, plan or budget column.); `bump` (needs a separate column for series (it would reuse "attribute", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for low (it would reuse "us", already the open)); `chord` (needs a separate column for target (it would reuse "attribute", already the source)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "attribute", already the x)); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `marimekko` (needs a separate column for series (it would reuse "attribute", already the x)); `meter` (It needs a target, plan or budget column.); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "attribute", already the source)); `timeline` (needs a date column for start); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.).
