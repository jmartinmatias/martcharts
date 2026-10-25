# `rings` chart

Concentric progress rings, one per row from the outside in, each filled to its share of target; past the target a second lap shows how far over. A legend gives each attainment and where it stands: a check and Target met, or how far it has to go. For a few goals at a glance, up to 5.

## What it is for

- Actual against target or plan: best
- A headline number: good
- Comparing amounts across categories: possible

**Best for**

- Progress on one to four goals in a compact tile: activity, product targets

**Least useful for**

- More than four goals (use meter)
- Comparing sizes, as inner rings are shorter

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One ring per row from the outside in, filled to value over target; past the target a second lap shows how far over.

**Rows it reads well with**: 1 to 4.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each goal. |
| `value` | number | yes | Field with the amount reached. |
| `target` | number | yes | Field with the goal amount. |

## This example's columns (3 columns, 3 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `product` | category | `label` | 3 different, e.g. "Analytics", "Platform", "Services" |
| `revenue` (Revenue) | number | `value` | 231000 to 412000 |
| `target` (Target) | number | `target` | 300000 to 450000 |

## The data drawing it now

| product | revenue | target |
| --- | --- | --- |
| Analytics | 386000 | 360000 |
| Platform | 412000 | 450000 |
| Services | 231000 | 300000 |

As CSV:

```csv
product,revenue,target
Analytics,386000,360000
Platform,412000,450000
Services,231000,300000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "product-targets",
  "title": "Q3 targets",
  "subtitle": "Revenue against target, by product",
  "description": "Each product's Q3 revenue as a share of its target. Analytics beat its target; Services trails at 77%.",
  "footer": "Source: finance ledger",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "product": "Analytics",
        "revenue": 386000,
        "target": 360000
      },
      {
        "product": "Platform",
        "revenue": 412000,
        "target": 450000
      },
      {
        "product": "Services",
        "revenue": 231000,
        "target": 300000
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
    },
    "target": {
      "label": "Target",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    }
  },
  "view": {
    "type": "rings",
    "label": "product",
    "value": "revenue",
    "target": "target"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `variance` | fits | better | Better for what drives or moves a total and comparing amounts across categories, and still good for actual against target or plan. | `{"type":"variance","label":"product","value":"revenue","target":"target"}` |
| `bullet` | fits | better | Better for comparing amounts across categories, and still good for actual against target or plan. | `{"type":"bullet","label":"product","value":"revenue","target":"target"}` |
| `meter` | fits | same | Keeps the job (actual against target or plan) with a different look. | `{"type":"meter","value":"revenue","target":"target","label":"product"}` |
| `bar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up actual against target or plan. | `{"type":"bar","x":"product","y":["revenue","target"]}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up actual against target or plan. | `{"type":"hbar","label":"product","value":["revenue","target"]}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up actual against target or plan. | `{"type":"list","label":"product","value":"revenue"}` |
| `donut` | fits | different | Answers a different question: better for share of one whole, but gives up actual against target or plan. | `{"type":"donut","label":"product","value":"revenue"}` |
| `pie` | fits | different | Answers a different question: better for share of one whole, but gives up actual against target or plan. | `{"type":"pie","label":"product","value":"revenue"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up actual against target or plan. | `{"type":"table"}` |
| `dot` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"dot","label":"product","value":["revenue","target"]}` |
| `kpi` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"kpi","value":"revenue","target":"target"}` |
| `kpis` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"revenue"},{"value":"target"}]}` |
| `radar` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"radar","label":"product","y":["revenue","target"]}` |
| `waffle` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"waffle","label":"product","value":"revenue"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 3 rows. | same | Keeps the job (actual against target or plan) with a different look. | `{"type":"gauge","value":"revenue","target":"target"}` |
| `area` | stretch: x expects dates; "product" is text, so its rows are drawn in the order given. 3 rows: this chart says little with fewer than 4. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"area","x":"product","y":["revenue","target"]}` |
| `beeswarm` | stretch: 3 rows: this chart says little with fewer than 10. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"revenue","label":"product"}` |
| `boxplot` | stretch: 3 rows: this chart says little with fewer than 15. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"boxplot","value":"revenue"}` |
| `histogram` | stretch: 3 rows: this chart says little with fewer than 20. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"histogram","value":"revenue"}` |
| `horizon` | stretch: x expects dates; "product" is text, so its rows are drawn in the order given. 3 rows: this chart says little with fewer than 10. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"horizon","x":"product","y":["revenue","target"]}` |
| `icicle` | stretch: 3 rows: this chart says little with fewer than 4. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"icicle","levels":"product","value":"revenue"}` |
| `line` | stretch: x expects dates; "product" is text, so its rows are drawn in the order given. | worse | Weaker for actual against target or plan, with nothing gained for this data. | `{"type":"line","x":"product","y":["revenue","target"]}` |
| `pareto` | stretch: 3 rows: this chart says little with fewer than 4. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"pareto","label":"product","value":"revenue"}` |
| `ridgeline` | stretch: 3 rows: this chart says little with fewer than 20. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"revenue","group":"product"}` |
| `rose` | stretch: 3 rows: this chart says little with fewer than 4. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"rose","label":"product","y":["revenue","target"]}` |
| `scatter` | stretch: 3 rows: this chart says little with fewer than 6. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"scatter","x":"revenue","y":"target","label":"product"}` |
| `sunburst` | stretch: 3 rows: this chart says little with fewer than 4. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"product","value":"revenue"}` |
| `treemap` | stretch: 3 rows: this chart says little with fewer than 4. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"treemap","label":"product","value":"revenue"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "product", already the x)); `board` (needs a separate column for stage (it would reuse "product", already the label)); `bump` (needs a separate column for series (it would reuse "product", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for low (it would reuse "revenue", already the open)); `chord` (needs a separate column for target (it would reuse "product", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "product", already the x)); `history` (needs a separate column for title (it would reuse "product", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "product", already the x)); `matrix` (needs a separate column for y (it would reuse "product", already the x)); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "product", already the label)); `sankey` (needs a separate column for target (it would reuse "product", already the source)); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "product", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
