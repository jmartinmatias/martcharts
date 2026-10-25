# `scatter` chart

One dot per row placed by two numbers, to show how they relate. An optional group field colors the dots, up to 3 groups; an optional size field turns it into a bubble chart.

## What it is for

- How two measures relate: best
- How values spread: possible
- Exact values and lookup: possible

**Best for**

- Whether two measures move together: growth and margin, price and volume
- Segments and quadrants, and the accounts that stand out

**Least useful for**

- One measure only (use histogram)
- Trends over time (use line)

## The data it needs

**One row is**: One row per thing measured (a deal, a ticket, a response); the chart counts or spreads them.

**How the chart is built**: One dot per row at x and y (both numbers); size and series add a third and fourth field, and label names each dot.

**Rows it reads well with**: 6 to 2000.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `x` | number | yes | Numeric field along the horizontal axis. |
| `y` | number | yes | Numeric field along the vertical axis. |
| `size` | number |  | Field sizing each dot by area, making a bubble chart: four times the value, twice the radius. Bigger bubbles are drawn first. |
| `color` | category |  | Field that groups the dots by color. Up to 3 groups stay distinct. Also accepts `series`, the older name. |
| `label` | category |  | Field naming each dot in its tooltip. |
| `cluster` | category |  | Field naming each dot's cluster, such as a segment found by analysis. A soft, rounded hull gathers each cluster's dots and carries its name at the middle, so the areas read as regions of the plot; the dots take the cluster's color unless series is set. Up to 6 clusters. |

## This example's columns (5 columns, 12 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `growth` (Revenue growth) | number | `x` | -0.08 to 0.41 |
| `margin` (Gross margin) | number | `y` | 0.16 to 0.44 |
| `revenue` (Revenue) | number | `size` | 41200 to 214000 |
| `segment` (Segment) | category | `color` | 3 different, e.g. "Enterprise", "Mid-market", "Small business" |
| `account` | category | `label` | 12 different, e.g. "Aurora Logistics", "Bellwether Foods", "Cobalt Analytics" |

## The data drawing it now

| growth | margin | revenue | segment | account |
| --- | --- | --- | --- | --- |
| 0.18 | 0.34 | 214000 | Enterprise | Aurora Logistics |
| 0.06 | 0.29 | 188500 | Enterprise | Bellwether Foods |
| 0.31 | 0.41 | 172300 | Mid-market | Cobalt Analytics |
| -0.04 | 0.22 | 151900 | Mid-market | Dunmore Retail |
| 0.12 | 0.38 | 139400 | Enterprise | Everline Health |
| 0.24 | 0.27 | 122800 | Mid-market | Fjord Energy |
| 0.02 | 0.31 | 118200 | Enterprise | Granite Bank |
| 0.36 | 0.19 | 97600 | Small business | Halcyon Travel |
| 0.28 | 0.44 | 64300 | Small business | Ironwood Labs |
| -0.08 | 0.16 | 52100 | Small business | Juniper Media |
| 0.15 | 0.24 | 88900 | Mid-market | Kestrel Freight |
| 0.41 | 0.33 | 41200 | Small business | Lumen Studio |

As CSV:

```csv
growth,margin,revenue,segment,account
0.18,0.34,214000,Enterprise,Aurora Logistics
0.06,0.29,188500,Enterprise,Bellwether Foods
0.31,0.41,172300,Mid-market,Cobalt Analytics
-0.04,0.22,151900,Mid-market,Dunmore Retail
0.12,0.38,139400,Enterprise,Everline Health
0.24,0.27,122800,Mid-market,Fjord Energy
0.02,0.31,118200,Enterprise,Granite Bank
0.36,0.19,97600,Small business,Halcyon Travel
0.28,0.44,64300,Small business,Ironwood Labs
-0.08,0.16,52100,Small business,Juniper Media
0.15,0.24,88900,Mid-market,Kestrel Freight
0.41,0.33,41200,Small business,Lumen Studio
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "account-portfolio",
  "title": "Account portfolio",
  "subtitle": "Growth against margin, year to date",
  "description": "Each account placed by its revenue growth and gross margin, the bubble sized by its revenue and colored by segment. Top right is where to invest; the big Enterprise accounts grow slowly but earn well.",
  "footer": "{count} accounts",
  "source": {
    "name": "Finance ledger"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "account": "Aurora Logistics",
        "segment": "Enterprise",
        "growth": 0.18,
        "margin": 0.34,
        "revenue": 214000
      },
      {
        "account": "Bellwether Foods",
        "segment": "Enterprise",
        "growth": 0.06,
        "margin": 0.29,
        "revenue": 188500
      },
      {
        "account": "Cobalt Analytics",
        "segment": "Mid-market",
        "growth": 0.31,
        "margin": 0.41,
        "revenue": 172300
      }
    ]
  },
  "fields": {
    "growth": {
      "label": "Revenue growth",
      "format": {
        "type": "percent",
        "decimals": 0
      }
    },
    "margin": {
      "label": "Gross margin",
      "format": {
        "type": "percent",
        "decimals": 0
      }
    },
    "revenue": {
      "label": "Revenue",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "segment": {
      "label": "Segment"
    }
  },
  "view": {
    "type": "scatter",
    "x": "growth",
    "y": "margin",
    "size": "revenue",
    "color": "segment",
    "label": "account"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `heatmap` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up how two measures relate. | `{"type":"heatmap","x":"segment","y":"account","value":"growth"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up how two measures relate. | `{"type":"table"}` |
| `beeswarm` | fits | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"growth","label":"account"}` |
| `kpi` | fits | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"kpi","value":"growth"}` |
| `kpis` | fits | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"growth"},{"value":"margin"},{"value":"revenue"}]}` |
| `bar` | stretch: "segment" repeats (3 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up how two measures relate. | `{"type":"bar","x":"segment","y":["growth","margin"]}` |
| `hbar` | stretch: "segment" repeats (3 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up how two measures relate. | `{"type":"hbar","label":"segment","value":["growth","margin"]}` |
| `list` | stretch: "segment" repeats (3 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for ranking, top to bottom and exact values and lookup, but gives up how two measures relate. | `{"type":"list","label":"segment"}` |
| `waterfall` | stretch: "segment" repeats (3 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for what drives or moves a total and change between two points, but gives up how two measures relate. | `{"type":"waterfall","label":"segment","value":"growth"}` |
| `sankey` | stretch: "growth" has negative values, which this chart cannot draw as areas. | different | Answers a different question: better for flows between stages or groups, but gives up how two measures relate. | `{"type":"sankey","source":"segment","target":"account","value":"growth"}` |
| `area` | stretch: x expects dates; "segment" is text, so its rows are drawn in the order given. "segment" repeats (3 different values in 12 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"area","x":"segment","y":["growth","margin"]}` |
| `boxplot` | stretch: 12 rows: this chart says little with fewer than 15. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"boxplot","value":"growth"}` |
| `donut` | stretch: "segment" repeats (3 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 12 rows: this chart crowds past about 6. "growth" has negative values, which this chart cannot draw as areas. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"donut","label":"segment","value":"growth"}` |
| `dot` | stretch: "segment" repeats (3 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"dot","label":"segment","value":["growth","margin"]}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 12 rows. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"gauge","value":"growth"}` |
| `histogram` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"histogram","value":"growth"}` |
| `horizon` | stretch: x expects dates; "segment" is text, so its rows are drawn in the order given. "segment" repeats (3 different values in 12 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"horizon","x":"segment","y":["growth","margin"]}` |
| `icicle` | stretch: "growth" has negative values, which this chart cannot draw as areas. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"icicle","levels":["segment","account"],"value":"growth"}` |
| `line` | stretch: x expects dates; "segment" is text, so its rows are drawn in the order given. "segment" repeats (3 different values in 12 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"line","x":"segment","y":["growth","margin"]}` |
| `marimekko` | stretch: "growth" has negative values, which this chart cannot draw as areas. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"marimekko","x":"segment","series":"account","value":"growth"}` |
| `pareto` | stretch: "segment" repeats (3 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. "growth" has negative values, which this chart cannot draw as areas. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"pareto","label":"segment","value":"growth"}` |
| `pie` | stretch: "segment" repeats (3 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 12 rows: this chart crowds past about 6. "growth" has negative values, which this chart cannot draw as areas. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"pie","label":"segment","value":"growth"}` |
| `radar` | stretch: "segment" repeats (3 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"radar","label":"segment","y":["growth","margin"]}` |
| `ridgeline` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"growth","group":"segment"}` |
| `rose` | stretch: "segment" repeats (3 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. "growth" has negative values, which this chart cannot draw as areas. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"rose","label":"segment","y":["growth","margin"]}` |
| `sunburst` | stretch: "growth" has negative values, which this chart cannot draw as areas. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"sunburst","levels":["segment","account"],"value":"growth"}` |
| `treemap` | stretch: "segment" repeats (3 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. "growth" has negative values, which this chart cannot draw as areas. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"treemap","label":"segment","value":"growth"}` |
| `waffle` | stretch: "segment" repeats (3 different values in 12 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 12 rows: this chart crowds past about 5. "growth" has negative values, which this chart cannot draw as areas. | worse | Gives up how two measures relate, and this data gives it nothing better to do. | `{"type":"waffle","label":"segment","value":"growth"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `board` (It needs a stage or status column with a handful of values, and a name per row.); `bullet` (It needs a target, plan or budget column.); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for close (it would reuse "growth", already the open)); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `matrix` (It needs one row per pair of two categories, such as topic and quarter.); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for status (it would reuse "segment", already the label)); `rings` (It needs a target, plan or budget column.); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (It needs a target, plan or budget column.); `whitespace` (needs a separate column for state (it would reuse "segment", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
