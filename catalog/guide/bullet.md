# `bullet` chart

Actual against target, one compact row per item: a value bar and a target tick over three qualitative bands (poor, fair, good). A met target carries a check by its number; the tooltip says what is left to go. A dense alternative to gauges.

## What it is for

- Actual against target or plan: best
- Comparing amounts across categories: good
- Ranking, top to bottom: possible
- A headline number: possible

**Best for**

- KPI scorecards against target in little space
- Several measures with different targets on one card

**Least useful for**

- Data with no target (use hbar)
- Trends over time (use line with a reference)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One compact row per row: a bar to value, a tick at target, over bands for poor, fair and good.

**Rows it reads well with**: 1 to 12.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each row. |
| `value` | number | yes | Field with the actual amount. |
| `target` | number | yes | Field with the target amount. |

## This example's columns (3 columns, 5 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `kpi` | category | `label` | 5 different, e.g. "Revenue", "New customers", "Gross margin (%)" |
| `actual` (Actual) | number | `value` | 33 to 1284000 |
| `target` (Target) | number | `target` | 30 to 1300000 |

## The data drawing it now

| kpi | actual | target |
| --- | --- | --- |
| Revenue | 1284000 | 1300000 |
| New customers | 66 | 60 |
| Gross margin (%) | 33 | 30 |
| Net promoter score | 42 | 50 |
| Tickets resolved | 912 | 1000 |

As CSV:

```csv
kpi,actual,target
Revenue,1284000,1300000
New customers,66,60
Gross margin (%),33,30
Net promoter score,42,50
Tickets resolved,912,1000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "kpi-scorecard",
  "title": "Q3 scorecard",
  "subtitle": "Actual against target, with poor, fair and good bands",
  "description": "Each headline KPI against its quarterly target.",
  "footer": "Bands end at 60%, 90% and 120% of target",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "kpi": "Revenue",
        "actual": 1284000,
        "target": 1300000
      },
      {
        "kpi": "New customers",
        "actual": 66,
        "target": 60
      },
      {
        "kpi": "Gross margin (%)",
        "actual": 33,
        "target": 30
      }
    ]
  },
  "fields": {
    "actual": {
      "label": "Actual",
      "format": {
        "type": "number",
        "compact": true
      }
    },
    "target": {
      "label": "Target",
      "format": {
        "type": "number",
        "compact": true
      }
    }
  },
  "view": {
    "type": "bullet",
    "label": "kpi",
    "value": "actual",
    "target": "target"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `variance` | fits | better | Better for what drives or moves a total, and still good for actual against target or plan. | `{"type":"variance","label":"kpi","value":"actual","target":"target"}` |
| `meter` | fits | same | Keeps the job (actual against target or plan) with a different look. Says the gap in words (€22K to go); takes more room per row. | `{"type":"meter","value":"actual","target":"target","label":"kpi"}` |
| `bar` | fits | different | Answers a different question: better for trend over time and how each group or period splits, but gives up actual against target or plan. | `{"type":"bar","x":"kpi","y":["actual","target"]}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up actual against target or plan. | `{"type":"hbar","label":"kpi","value":["actual","target"]}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up actual against target or plan. | `{"type":"list","label":"kpi","value":"actual"}` |
| `donut` | fits | different | Answers a different question: better for share of one whole, but gives up actual against target or plan. | `{"type":"donut","label":"kpi","value":"actual"}` |
| `pie` | fits | different | Answers a different question: better for share of one whole, but gives up actual against target or plan. | `{"type":"pie","label":"kpi","value":"actual"}` |
| `radar` | fits | different | Answers a different question: better for profiles across several attributes, but gives up actual against target or plan. | `{"type":"radar","label":"kpi","y":["actual","target"]}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up actual against target or plan. | `{"type":"table"}` |
| `dot` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"dot","label":"kpi","value":["actual","target"]}` |
| `icicle` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"icicle","levels":"kpi","value":"actual"}` |
| `kpi` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"kpi","value":"actual","target":"target"}` |
| `kpis` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"actual"},{"value":"target"}]}` |
| `pareto` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"pareto","label":"kpi","value":"actual"}` |
| `rose` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"rose","label":"kpi","y":["actual","target"]}` |
| `sunburst` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"kpi","value":"actual"}` |
| `treemap` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"treemap","label":"kpi","value":"actual"}` |
| `waffle` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"waffle","label":"kpi","value":"actual"}` |
| `rings` | stretch: 5 rows: this chart crowds past about 4. | better | Better for a headline number, and still good for actual against target or plan. | `{"type":"rings","label":"kpi","value":"actual","target":"target"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 5 rows. | same | Keeps the job (actual against target or plan) with a different look. | `{"type":"gauge","value":"actual","target":"target"}` |
| `area` | stretch: x expects dates; "kpi" is text, so its rows are drawn in the order given. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"area","x":"kpi","y":["actual","target"]}` |
| `beeswarm` | stretch: 5 rows: this chart says little with fewer than 10. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"actual","label":"kpi"}` |
| `boxplot` | stretch: 5 rows: this chart says little with fewer than 15. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"boxplot","value":"actual"}` |
| `histogram` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"histogram","value":"actual"}` |
| `horizon` | stretch: x expects dates; "kpi" is text, so its rows are drawn in the order given. 5 rows: this chart says little with fewer than 10. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"horizon","x":"kpi","y":["actual","target"]}` |
| `line` | stretch: x expects dates; "kpi" is text, so its rows are drawn in the order given. | worse | Weaker for actual against target or plan, with nothing gained for this data. | `{"type":"line","x":"kpi","y":["actual","target"]}` |
| `ridgeline` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"actual","group":"kpi"}` |
| `scatter` | stretch: 5 rows: this chart says little with fewer than 6. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"scatter","x":"actual","y":"target","label":"kpi"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "kpi", already the x)); `board` (needs a separate column for stage (it would reuse "kpi", already the label)); `bump` (needs a separate column for series (it would reuse "kpi", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for low (it would reuse "actual", already the open)); `chord` (needs a separate column for target (it would reuse "kpi", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "kpi", already the x)); `history` (needs a separate column for title (it would reuse "kpi", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "kpi", already the x)); `matrix` (needs a separate column for y (it would reuse "kpi", already the x)); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "kpi", already the label)); `sankey` (needs a separate column for target (it would reuse "kpi", already the source)); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "kpi", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
