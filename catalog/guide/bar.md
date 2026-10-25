# `bar` chart

Vertical bars comparing amounts across categories. Several y fields draw grouped bars.

## What it is for

- Comparing amounts across categories: best
- Ranking, top to bottom: good
- Trend over time: good
- How each group or period splits: good
- Share of one whole: possible
- Actual against target or plan: possible
- Exact values and lookup: possible

**Best for**

- An amount across a handful of categories: revenue by region, orders by month
- Two or three series side by side or stacked: Core and Plus by region
- Monthly totals against a budget line

**Least useful for**

- Long category names (use hbar)
- More than about 15 categories (use hbar or treemap)
- A long continuous trend (use line)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One bar per row at x, as tall as y. Several y fields make grouped bars, or stacked ones with stacked (percent for shares); a lines field draws a line such as a target across the bars.

**Rows it reads well with**: 2 to 16.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `x` | category | yes | Field for the categories along the horizontal axis. |
| `y` | number (one or more) | yes | Field or fields for bar heights. Each field is one series. |
| `lines` | number (one or more) |  | Field or fields drawn as lines over the bars, on the same axis, for example a target. Never a second axis. Under one target line (a field named target, plan, goal, budget or quota), bars on the wrong side of it (see goodWhen) are drawn outlined and keyed Below target. |
| `compare` | number |  | Field drawn as a wider, quieter column behind each bar, on the same axis, for a comparison such as last year or the plan. The key names it by its label and the tooltip gives its value. One y series, unstacked. |

## This example's columns (4 columns, 5 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `region` | category | `x` | 5 different, e.g. "East", "North", "Central" |
| `Core` | number | `y` | 131000 to 220000 |
| `Plus` | number | `y` | 61000 to 118000 |
| `total` | number | not drawn | 204000 to 338000 |

## The data drawing it now

| region | Core | Plus | total |
| --- | --- | --- | --- |
| East | 220000 | 118000 | 338000 |
| North | 182000 | 96000 | 278000 |
| Central | 165000 | 94000 | 259000 |
| West | 131000 | 74000 | 205000 |
| South | 143000 | 61000 | 204000 |

As CSV:

```csv
region,Core,Plus,total
East,220000,118000,338000
North,182000,96000,278000
Central,165000,94000,259000
West,131000,74000,205000
South,143000,61000,204000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "product-share",
  "title": "Product share",
  "subtitle": "Of each region's revenue",
  "description": "Core and Plus as a share of each region's revenue.",
  "source": {
    "name": "Sales ledger"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "region": "East",
        "Core": 220000,
        "Plus": 118000,
        "total": 338000
      },
      {
        "region": "North",
        "Core": 182000,
        "Plus": 96000,
        "total": 278000
      },
      {
        "region": "Central",
        "Core": 165000,
        "Plus": 94000,
        "total": 259000
      }
    ]
  },
  "fields": {
    "Core": {
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "Plus": {
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    }
  },
  "view": {
    "type": "bar",
    "x": "region",
    "y": [
      "Core",
      "Plus"
    ],
    "stacked": "percent"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `hbar` | fits | better | Better for ranking, top to bottom, and still good for comparing amounts across categories. Same comparison, but labels get a full line and the order reads as a ranking; the better default on phones and with long names. | `{"type":"hbar","label":"region","value":["Core","Plus"]}` |
| `dot` | fits | same | Keeps the job (comparing amounts across categories) with a different look. | `{"type":"dot","label":"region","value":["Core","Plus"]}` |
| `radar` | fits | trade-off | Better for profiles across several attributes; weaker for comparing amounts across categories. | `{"type":"radar","label":"region","y":["Core","Plus"]}` |
| `donut` | fits | different | Answers a different question: better for share of one whole, but gives up comparing amounts across categories. | `{"type":"donut","label":"region","value":"Core"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup, but gives up comparing amounts across categories. | `{"type":"list","label":"region"}` |
| `pie` | fits | different | Answers a different question: better for share of one whole, but gives up comparing amounts across categories. | `{"type":"pie","label":"region","value":"Core"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up comparing amounts across categories. | `{"type":"table"}` |
| `icicle` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"icicle","levels":"region","value":"Core"}` |
| `kpis` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"Core"},{"value":"Plus"},{"value":"total"}]}` |
| `pareto` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"pareto","label":"region","value":"Core"}` |
| `rose` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"rose","label":"region","y":["Core","Plus"]}` |
| `sunburst` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"region","value":"Core"}` |
| `treemap` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"treemap","label":"region","value":"Core"}` |
| `waffle` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"waffle","label":"region","value":"Core"}` |
| `area` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"area","x":"region","y":["Core","Plus"]}` |
| `beeswarm` | stretch: 5 rows: this chart says little with fewer than 10. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"Core"}` |
| `boxplot` | stretch: 5 rows: this chart says little with fewer than 15. | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"boxplot","value":"Core"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 5 rows. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"gauge","value":"Core"}` |
| `histogram` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"histogram","value":"Core"}` |
| `horizon` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. 5 rows: this chart says little with fewer than 10. | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"horizon","x":"region","y":["Core","Plus"]}` |
| `kpi` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"kpi","value":"Core","x":"region"}` |
| `line` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. | worse | Weaker for comparing amounts across categories, with nothing gained for this data. Better when the categories are periods: the eye follows the trend instead of comparing bar tops. | `{"type":"line","x":"region","y":["Core","Plus"]}` |
| `ridgeline` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"ridgeline","value":"Core","group":"region"}` |
| `scatter` | stretch: 5 rows: this chart says little with fewer than 6. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"scatter","x":"Core","y":"Plus"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "region", already the x)); `board` (needs a separate column for stage (it would reuse "region", already the label)); `bullet` (It needs a target, plan or budget column.); `bump` (needs a separate column for series (it would reuse "region", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for close (it would reuse "Core", already the open)); `chord` (needs a separate column for target (it would reuse "region", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "region", already the x)); `history` (needs a separate column for title (it would reuse "region", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "region", already the x)); `matrix` (needs a separate column for y (it would reuse "region", already the x)); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "region", already the label)); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "region", already the source)); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "region", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
