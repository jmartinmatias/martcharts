# `symbols` chart

A map with a circle on each place, its area true to a value: customers by state, volume by port. Places sit on a region of a basemap (by code) or at coordinates on your own GeoJSON; a color field groups them with a key, and a size key shows what the circles mean.

## What it is for

- Comparing amounts across categories: best
- Patterns across two dimensions or a cycle: good

**Best for**

- Counts and totals by place where the size itself matters: customers by state, volume by port
- Several kinds of place on one map, told apart by color

**Least useful for**

- Rates and shares (use choropleth)
- Hundreds of overlapping places (sum them by region first)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One circle per row on its region (by code) or at its coordinates, its area true to the size field; a color field groups the circles with a key.

**Rows it reads well with**: 2 to 150.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `size` | number | yes | Field that sizes each circle, by area. Zero and missing values draw nothing. |
| `id` | category |  | Field with the region code that places each circle: a country or state code on a built-in basemap, or the feature id in your GeoJSON. Use lat and lon instead for coordinates. |
| `lat` | number |  | Field with each row's latitude, for placing by coordinates on your own GeoJSON (not on a built-in grid). |
| `lon` | number |  | Field with each row's longitude, paired with lat. |
| `label` | category |  | Field naming each place in its tooltip. Defaults to the region's name, or the id. |
| `color` | category |  | Field that colors the circles by group, with a key. |

## This example's columns (3 columns, 24 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `state` (State) | category | `id` | 24 different, e.g. "CA", "WA", "OR" |
| `customers` (Customers) | number | `size` | 150 to 1840 |
| `region` (Sales region) | category | `color` | 4 different, e.g. "West", "South", "Midwest" |

## The data drawing it now

| state | customers | region |
| --- | --- | --- |
| CA | 1840 | West |
| WA | 620 | West |
| OR | 240 | West |
| CO | 410 | West |
| AZ | 330 | West |
| UT | 190 | West |
| NV | 150 | West |
| TX | 1260 | South |
| FL | 890 | South |
| GA | 540 | South |
| NC | 460 | South |
| VA | 430 | South |
| TN | 260 | South |
| IL | 720 | Midwest |
| OH | 480 | Midwest |
| MI | 390 | Midwest |
| MN | 350 | Midwest |
| MO | 230 | Midwest |
| WI | 210 | Midwest |
| NY | 1520 | Northeast |
| MA | 680 | Northeast |
| PA | 560 | Northeast |
| NJ | 470 | Northeast |
| CT | 220 | Northeast |

As CSV:

```csv
state,customers,region
CA,1840,West
WA,620,West
OR,240,West
CO,410,West
AZ,330,West
UT,190,West
NV,150,West
TX,1260,South
FL,890,South
GA,540,South
NC,460,South
VA,430,South
TN,260,South
IL,720,Midwest
OH,480,Midwest
MI,390,Midwest
MN,350,Midwest
MO,230,Midwest
WI,210,Midwest
NY,1520,Northeast
MA,680,Northeast
PA,560,Northeast
NJ,470,Northeast
CT,220,Northeast
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "customers-by-state",
  "title": "Customers by state",
  "subtitle": "Active accounts, September 2026",
  "description": "Active customer accounts per US state as circles on a tile grid, sized by count and colored by sales region, so the coasts' weight and the thin middle show at once.",
  "note": "Accounts with an active subscription",
  "source": {
    "name": "CRM"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "state": "CA",
        "customers": 1840,
        "region": "West"
      },
      {
        "state": "WA",
        "customers": 620,
        "region": "West"
      },
      {
        "state": "OR",
        "customers": 240,
        "region": "West"
      }
    ]
  },
  "fields": {
    "state": {
      "label": "State"
    },
    "customers": {
      "label": "Customers"
    },
    "region": {
      "label": "Sales region"
    }
  },
  "view": {
    "type": "symbols",
    "geo": "us-states",
    "id": "state",
    "size": "customers",
    "color": "region"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `hbar` | fits | better | Better for ranking, top to bottom, and still good for comparing amounts across categories. | `{"type":"hbar","label":"state","value":"customers"}` |
| `choropleth` | fits | same | Keeps the job (comparing amounts across categories) with a different look. | `{"type":"choropleth","id":"state","value":"customers","geo":"us-states"}` |
| `dot` | fits | same | Keeps the job (comparing amounts across categories) with a different look. | `{"type":"dot","label":"state","value":"customers"}` |
| `matrix` | fits | trade-off | Better for exact values and lookup and patterns across two dimensions or a cycle; weaker for comparing amounts across categories. | `{"type":"matrix","x":"state","y":"region","size":"customers","color":"region"}` |
| `boxplot` | fits | trade-off | Better for how values spread; weaker for comparing amounts across categories. | `{"type":"boxplot","value":"customers"}` |
| `icicle` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up comparing amounts across categories. | `{"type":"icicle","levels":["state","region"],"value":"customers"}` |
| `pareto` | fits | different | Answers a different question: better for ranking, top to bottom and what drives or moves a total, but gives up comparing amounts across categories. | `{"type":"pareto","label":"state","value":"customers"}` |
| `sunburst` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up comparing amounts across categories. | `{"type":"sunburst","levels":["state","region"],"value":"customers"}` |
| `treemap` | fits | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up comparing amounts across categories. | `{"type":"treemap","label":"state","value":"customers"}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up comparing amounts across categories. | `{"type":"beeswarm","value":"customers"}` |
| `heatmap` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up comparing amounts across categories. | `{"type":"heatmap","x":"state","y":"region","value":"customers"}` |
| `histogram` | fits | different | Answers a different question: better for how values spread, but gives up comparing amounts across categories. | `{"type":"histogram","value":"customers"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up comparing amounts across categories. | `{"type":"sankey","source":"state","target":"region","value":"customers"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up comparing amounts across categories. | `{"type":"table"}` |
| `kpi` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"kpi","value":"customers"}` |
| `kpis` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"customers"}]}` |
| `marimekko` | fits | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"marimekko","x":"state","series":"region","value":"customers"}` |
| `ridgeline` | fits | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"ridgeline","value":"customers","group":"state"}` |
| `rose` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"rose","label":"state","y":"customers"}` |
| `bar` | stretch: 24 rows: this chart crowds past about 16. | same | Keeps the job (comparing amounts across categories) with a different look. | `{"type":"bar","x":"state","y":"customers"}` |
| `list` | stretch: 24 rows: this chart crowds past about 20. | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up comparing amounts across categories. | `{"type":"list","label":"state"}` |
| `area` | stretch: x expects dates; "state" is text, so its rows are drawn in the order given. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"area","x":"state","y":"customers"}` |
| `donut` | stretch: 24 rows: this chart crowds past about 6. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"donut","label":"state","value":"customers"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 24 rows. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"gauge","value":"customers"}` |
| `horizon` | stretch: x expects dates; "state" is text, so its rows are drawn in the order given. | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"horizon","x":"state","y":"customers"}` |
| `line` | stretch: x expects dates; "state" is text, so its rows are drawn in the order given. | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"line","x":"state","y":"customers"}` |
| `pie` | stretch: 24 rows: this chart crowds past about 6. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"pie","label":"state","value":"customers"}` |
| `radar` | stretch: 24 rows: this chart crowds past about 12. | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"radar","label":"state","y":"customers"}` |
| `waffle` | stretch: 24 rows: this chart crowds past about 5. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"waffle","label":"state","value":"customers"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `board` (It needs a stage or status column with a handful of values, and a name per row.); `bullet` (needs a separate column for target (it would reuse "customers", already the value)); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "customers", already the open)); `chord` (It needs flows that go both ways between the same groups.); `dual` (needs a separate column for y2 (it would reuse "customers", already the y)); `dumbbell` (needs a separate column for to (it would reuse "customers", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (It needs named places with region codes on a basemap, or coordinates.); `meter` (needs a separate column for target (it would reuse "customers", already the value)); `pyramid` (needs a separate column for right (it would reuse "customers", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for status (it would reuse "state", already the label)); `rings` (needs a separate column for target (it would reuse "customers", already the value)); `scatter` (needs a separate column for y (it would reuse "customers", already the x)); `slope` (needs a separate column for to (it would reuse "customers", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "customers", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for state (it would reuse "state", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
