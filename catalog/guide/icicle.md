# `icicle` chart

A hierarchy laid flat: a column for the total, then one per level left to right, each child splitting its parent's height by value, in lighter tints of its family's color. Rectangles compare and label more easily than rings, so it takes deeper hierarchies than the sunburst. Pointing at a cell lights its family and gives its share of each level.

## What it is for

- Nested breakdowns: best
- Share of one whole: good
- Ranking, top to bottom: possible

**Best for**

- Deep breakdowns with long names: budget by unit, team and line
- Drill paths, left to right

**Least useful for**

- Flat data with one level (use hbar)
- Negative values

## The data it needs

**One row is**: One row per leaf of the hierarchy, its levels in columns from the top down.

**How the chart is built**: A column for the total, then one per level; each child splits its parent's height by the sum of value.

**Rows it reads well with**: 4 to 200.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `levels` | category (one or more) | yes | Fields from the top level down, one column each, for example ["region", "product", "plan"]. Up to 4. |
| `value` | number | yes | Field sizing the cells. Zero and negative values are left out. |

## This example's columns (4 columns, 20 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `region` (Region) | category | `levels` | 5 different, e.g. "East", "North", "Central" |
| `product` (Product) | category | `levels` | 2 different, e.g. "Core", "Plus" |
| `plan` (Plan) | category | `levels` | 2 different, e.g. "Annual", "Monthly" |
| `revenue` (Revenue) | number | `value` | 23000 to 156000 |

## The data drawing it now

| region | product | plan | revenue |
| --- | --- | --- | --- |
| East | Core | Annual | 156000 |
| East | Core | Monthly | 64000 |
| East | Plus | Annual | 65000 |
| East | Plus | Monthly | 53000 |
| North | Core | Annual | 116000 |
| North | Core | Monthly | 66000 |
| North | Plus | Annual | 43000 |
| North | Plus | Monthly | 53000 |
| Central | Core | Annual | 109000 |
| Central | Core | Monthly | 56000 |
| Central | Plus | Annual | 44000 |
| Central | Plus | Monthly | 50000 |
| West | Core | Annual | 79000 |
| West | Core | Monthly | 52000 |
| West | Plus | Annual | 31000 |
| West | Plus | Monthly | 43000 |
| South | Core | Annual | 83000 |
| South | Core | Monthly | 60000 |
| South | Plus | Annual | 23000 |
| South | Plus | Monthly | 38000 |

As CSV:

```csv
region,product,plan,revenue
East,Core,Annual,156000
East,Core,Monthly,64000
East,Plus,Annual,65000
East,Plus,Monthly,53000
North,Core,Annual,116000
North,Core,Monthly,66000
North,Plus,Annual,43000
North,Plus,Monthly,53000
Central,Core,Annual,109000
Central,Core,Monthly,56000
Central,Plus,Annual,44000
Central,Plus,Monthly,50000
West,Core,Annual,79000
West,Core,Monthly,52000
West,Plus,Annual,31000
West,Plus,Monthly,43000
South,Core,Annual,83000
South,Core,Monthly,60000
South,Plus,Annual,23000
South,Plus,Monthly,38000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "revenue-icicle",
  "title": "Revenue by region, product and plan",
  "subtitle": "Q3 2026, largest first",
  "description": "Q3 revenue split three ways, one column per level. East leads at €338K. Core makes up about two thirds of revenue in every region and is mostly sold on annual plans; Plus leans monthly everywhere except East.",
  "source": {
    "name": "Finance ledger"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "region": "East",
        "product": "Core",
        "plan": "Annual",
        "revenue": 156000
      },
      {
        "region": "East",
        "product": "Core",
        "plan": "Monthly",
        "revenue": 64000
      },
      {
        "region": "East",
        "product": "Plus",
        "plan": "Annual",
        "revenue": 65000
      }
    ]
  },
  "fields": {
    "region": {
      "label": "Region"
    },
    "product": {
      "label": "Product"
    },
    "plan": {
      "label": "Plan"
    },
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
    "type": "icicle",
    "levels": [
      "region",
      "product",
      "plan"
    ],
    "value": "revenue"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `sunburst` | fits | same | Keeps the job (nested breakdowns) with a different look. More compact and inviting as an overview; harder to compare sizes. | `{"type":"sunburst","levels":["region","product"],"value":"revenue"}` |
| `boxplot` | fits | different | Answers a different question: better for how values spread and comparing amounts across categories, but gives up nested breakdowns. | `{"type":"boxplot","value":"revenue"}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up nested breakdowns. | `{"type":"beeswarm","value":"revenue"}` |
| `histogram` | fits | different | Answers a different question: better for how values spread, but gives up nested breakdowns. | `{"type":"histogram","value":"revenue"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up nested breakdowns. | `{"type":"sankey","source":"region","target":"product","value":"revenue"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up nested breakdowns. | `{"type":"table"}` |
| `kpi` | fits | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"kpi","value":"revenue"}` |
| `kpis` | fits | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"revenue"}]}` |
| `ridgeline` | fits | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"revenue","group":"region"}` |
| `bar` | stretch: "region" repeats (5 different values in 20 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 20 rows: this chart crowds past about 16. | different | Answers a different question: better for comparing amounts across categories and trend over time, but gives up nested breakdowns. | `{"type":"bar","x":"region","y":"revenue"}` |
| `hbar` | stretch: "region" repeats (5 different values in 20 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up nested breakdowns. | `{"type":"hbar","label":"region","value":"revenue"}` |
| `list` | stretch: "region" repeats (5 different values in 20 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up nested breakdowns. | `{"type":"list","label":"region","value":"revenue"}` |
| `marimekko` | stretch: Some region and product pairs repeat: sum them first. | different | Answers a different question: better for how each group or period splits and comparing amounts across categories, but gives up nested breakdowns. | `{"type":"marimekko","x":"region","series":"product","value":"revenue"}` |
| `pareto` | stretch: "region" repeats (5 different values in 20 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for what drives or moves a total and ranking, top to bottom, but gives up nested breakdowns. | `{"type":"pareto","label":"region","value":"revenue"}` |
| `area` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. "region" repeats (5 different values in 20 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"area","x":"region","y":"revenue"}` |
| `donut` | stretch: "region" repeats (5 different values in 20 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 20 rows: this chart crowds past about 6. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"donut","label":"region","value":"revenue"}` |
| `dot` | stretch: "region" repeats (5 different values in 20 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"dot","label":"region","value":"revenue"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 20 rows. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"gauge","value":"revenue"}` |
| `heatmap` | stretch: Some region and product pairs repeat: sum them first. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"heatmap","x":"region","y":"product","value":"revenue"}` |
| `horizon` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. "region" repeats (5 different values in 20 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"horizon","x":"region","y":"revenue"}` |
| `line` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. "region" repeats (5 different values in 20 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"line","x":"region","y":"revenue"}` |
| `pie` | stretch: "region" repeats (5 different values in 20 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 20 rows: this chart crowds past about 6. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"pie","label":"region","value":"revenue"}` |
| `radar` | stretch: "region" repeats (5 different values in 20 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 20 rows: this chart crowds past about 12. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"radar","label":"region","y":"revenue"}` |
| `rose` | stretch: "region" repeats (5 different values in 20 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"rose","label":"region","y":"revenue"}` |
| `treemap` | stretch: "region" repeats (5 different values in 20 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Weaker for nested breakdowns, with nothing gained for this data. | `{"type":"treemap","label":"region","value":"revenue"}` |
| `waffle` | stretch: "region" repeats (5 different values in 20 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 20 rows: this chart crowds past about 5. | worse | Gives up nested breakdowns, and this data gives it nothing better to do. | `{"type":"waffle","label":"region","value":"revenue"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `board` (It needs a stage or status column with a handful of values, and a name per row.); `bullet` (needs a separate column for target (it would reuse "revenue", already the value)); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "revenue", already the open)); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "revenue", already the y)); `dumbbell` (needs a separate column for to (it would reuse "revenue", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `matrix` (It needs one row per pair of two categories, such as topic and quarter.); `meter` (needs a separate column for target (it would reuse "revenue", already the value)); `pyramid` (needs a separate column for right (it would reuse "revenue", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (It needs one status (R, A, G) per entity per period.); `rings` (needs a separate column for target (it would reuse "revenue", already the value)); `scatter` (needs a separate column for y (it would reuse "revenue", already the x)); `slope` (needs a separate column for to (it would reuse "revenue", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "revenue", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (It needs one row per client and product with a state: held, an opportunity, or not eligible.); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
