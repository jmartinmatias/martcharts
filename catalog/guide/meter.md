# `meter` chart

Progress against a target, one meter per row: attainment as a percentage, a bar that fills to the target, and where it stands in plain words: a check and Target met, or how far it has to go (€22K to go).

## What it is for

- Actual against target or plan: best
- Comparing amounts across categories: possible
- A headline number: possible

**Best for**

- Progress to target per item: quota attainment by region, OKRs, fundraising

**Least useful for**

- Data with no target (use hbar)
- Negative values

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One meter per row: value as a percentage of target, a bar filling to the target and the gap in words.

**Rows it reads well with**: 1 to 12.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `value` | number | yes | Field holding the current amount. |
| `target` | number | yes | Field holding the target amount. |
| `label` | category |  | Field naming each meter, for example a region. Defaults to the value field's label. |

## This example's columns (3 columns, 5 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `revenue` | number | `value` | 204000 to 338000 |
| `target` | number | `target` | 198000 to 327000 |
| `region` | category | `label` | 5 different, e.g. "East", "North", "Central" |

## The data drawing it now

| revenue | target | region |
| --- | --- | --- |
| 338000 | 327000 | East |
| 278000 | 243000 | North |
| 259000 | 225000 | Central |
| 205000 | 198000 | West |
| 204000 | 207000 | South |

As CSV:

```csv
revenue,target,region
338000,327000,East
278000,243000,North
259000,225000,Central
205000,198000,West
204000,207000,South
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "region-targets",
  "title": "Target attainment",
  "subtitle": "September 2026 revenue against plan",
  "description": "How close each region is to its September revenue target.",
  "source": {
    "name": "Sales ledger"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "region": "East",
        "revenue": 338000,
        "target": 327000
      },
      {
        "region": "North",
        "revenue": 278000,
        "target": 243000
      },
      {
        "region": "Central",
        "revenue": 259000,
        "target": 225000
      }
    ]
  },
  "fields": {
    "revenue": {
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "target": {
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    }
  },
  "view": {
    "type": "meter",
    "value": "revenue",
    "target": "target",
    "label": "region"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `variance` | fits | better | Better for what drives or moves a total and comparing amounts across categories, and still good for actual against target or plan. Shows the gap itself, over or under, instead of progress toward the target. | `{"type":"variance","label":"region","value":"revenue","target":"target"}` |
| `bullet` | fits | better | Better for comparing amounts across categories, and still good for actual against target or plan. Denser, with qualitative bands; less plain-language than the meter's 'to go' line. | `{"type":"bullet","label":"region","value":"revenue","target":"target"}` |
| `bar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up actual against target or plan. | `{"type":"bar","x":"region","y":["revenue","target"]}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up actual against target or plan. | `{"type":"hbar","label":"region","value":["revenue","target"]}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up actual against target or plan. | `{"type":"list","label":"region","value":"revenue"}` |
| `radar` | fits | different | Answers a different question: better for profiles across several attributes and comparing amounts across categories, but gives up actual against target or plan. | `{"type":"radar","label":"region","y":["revenue","target"]}` |
| `donut` | fits | different | Answers a different question: better for share of one whole, but gives up actual against target or plan. | `{"type":"donut","label":"region","value":"revenue"}` |
| `pie` | fits | different | Answers a different question: better for share of one whole, but gives up actual against target or plan. | `{"type":"pie","label":"region","value":"revenue"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up actual against target or plan. | `{"type":"table"}` |
| `dot` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"dot","label":"region","value":["revenue","target"]}` |
| `icicle` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"icicle","levels":"region","value":"revenue"}` |
| `kpi` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"kpi","value":"revenue","target":"target"}` |
| `kpis` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"revenue"},{"value":"target"}]}` |
| `pareto` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"pareto","label":"region","value":"revenue"}` |
| `rose` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"rose","label":"region","y":["revenue","target"]}` |
| `sunburst` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"region","value":"revenue"}` |
| `treemap` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"treemap","label":"region","value":"revenue"}` |
| `waffle` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"waffle","label":"region","value":"revenue"}` |
| `rings` | stretch: 5 rows: this chart crowds past about 4. | better | Better for a headline number, and still good for actual against target or plan. More playful and compact for up to four goals; harder to compare sizes. | `{"type":"rings","label":"region","value":"revenue","target":"target"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 5 rows. | same | Keeps the job (actual against target or plan) with a different look. | `{"type":"gauge","value":"revenue","target":"target"}` |
| `area` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"area","x":"region","y":["revenue","target"]}` |
| `beeswarm` | stretch: 5 rows: this chart says little with fewer than 10. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"revenue","label":"region"}` |
| `boxplot` | stretch: 5 rows: this chart says little with fewer than 15. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"boxplot","value":"revenue"}` |
| `histogram` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"histogram","value":"revenue"}` |
| `horizon` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. 5 rows: this chart says little with fewer than 10. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"horizon","x":"region","y":["revenue","target"]}` |
| `line` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. | worse | Weaker for actual against target or plan, with nothing gained for this data. | `{"type":"line","x":"region","y":["revenue","target"]}` |
| `ridgeline` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"revenue","group":"region"}` |
| `scatter` | stretch: 5 rows: this chart says little with fewer than 6. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"scatter","x":"revenue","y":"target","label":"region"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "region", already the x)); `board` (needs a separate column for stage (it would reuse "region", already the label)); `bump` (needs a separate column for series (it would reuse "region", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for low (it would reuse "revenue", already the open)); `chord` (needs a separate column for target (it would reuse "region", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "region", already the x)); `history` (needs a separate column for title (it would reuse "region", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "region", already the x)); `matrix` (needs a separate column for y (it would reuse "region", already the x)); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "region", already the label)); `sankey` (needs a separate column for target (it would reuse "region", already the source)); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "region", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
