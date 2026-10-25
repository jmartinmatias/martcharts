# `pyramid` chart

A population pyramid: one row per band (an age group, a tenure band), with two counts as bars growing out from a center axis on one shared scale, the left count leftward and the right count rightward. The shape says where the two sides differ. Rows draw in the order given, top to bottom.

## What it is for

- How values spread: best
- Comparing amounts across categories: good
- How each group or period splits: possible

**Best for**

- Two groups across ordered bands: women and men by age group, new and returning customers by tenure
- Seeing where two groups differ, from the shape alone

**Least useful for**

- More than two groups (use hbar with several values)
- Bands with no natural order (use hbar)
- Measures in different units

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One row per band in the order given; the left field's count grows leftward from a center axis and the right field's rightward, both on one shared scale.

**Rows it reads well with**: 3 to 30.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each band, in order from top to bottom, such as the age group. |
| `left` | number | yes | Field with the count drawn leftward, such as women. |
| `right` | number | yes | Field with the count drawn rightward, such as men. |

## This example's columns (3 columns, 9 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `age` (Age) | category | `label` | 9 different, e.g. "60-64", "55-59", "50-54" |
| `women` (Women) | number | `left` | 14 to 188 |
| `men` (Men) | number | `right` | 31 to 171 |

## The data drawing it now

| age | women | men |
| --- | --- | --- |
| 60-64 | 14 | 31 |
| 55-59 | 29 | 52 |
| 50-54 | 48 | 77 |
| 45-49 | 71 | 102 |
| 40-44 | 103 | 128 |
| 35-39 | 142 | 146 |
| 30-34 | 188 | 171 |
| 25-29 | 176 | 139 |
| 20-24 | 92 | 64 |

As CSV:

```csv
age,women,men
60-64,14,31
55-59,29,52
50-54,48,77
45-49,71,102
40-44,103,128
35-39,142,146
30-34,188,171
25-29,176,139
20-24,92,64
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "workforce-pyramid",
  "title": "Workforce by age and gender",
  "subtitle": "Headcount at the end of September 2026",
  "description": "The shape of the company: women outnumber men under 35, men outnumber women from 40 up, and the 30 to 34 band is the widest on both sides.",
  "source": {
    "name": "HR system"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "age": "60-64",
        "women": 14,
        "men": 31
      },
      {
        "age": "55-59",
        "women": 29,
        "men": 52
      },
      {
        "age": "50-54",
        "women": 48,
        "men": 77
      }
    ]
  },
  "fields": {
    "age": {
      "label": "Age"
    },
    "women": {
      "label": "Women",
      "format": {
        "type": "number"
      }
    },
    "men": {
      "label": "Men",
      "format": {
        "type": "number"
      }
    }
  },
  "view": {
    "type": "pyramid",
    "label": "age",
    "left": "women",
    "right": "men"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `bar` | fits | different | Answers a different question: better for ranking, top to bottom and trend over time, but gives up how values spread. | `{"type":"bar","x":"age","y":["women","men"]}` |
| `dot` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up how values spread. | `{"type":"dot","label":"age","value":["women","men"]}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up how values spread. Lays the two measures side by side in each row, which compares exact lengths better; the shape of the whole is gone. | `{"type":"hbar","label":"age","value":["women","men"]}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up how values spread. | `{"type":"list","label":"age"}` |
| `slope` | fits | different | Answers a different question: better for change between two points and ranking, top to bottom, but gives up how values spread. | `{"type":"slope","label":"age","from":"women","to":"men"}` |
| `treemap` | fits | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up how values spread. | `{"type":"treemap","label":"age","value":"women"}` |
| `dumbbell` | fits | different | Answers a different question: better for change between two points, but gives up how values spread. | `{"type":"dumbbell","label":"age","from":"women","to":"men"}` |
| `radar` | fits | different | Answers a different question: better for profiles across several attributes, but gives up how values spread. | `{"type":"radar","label":"age","y":["women","men"]}` |
| `scatter` | fits | different | Answers a different question: better for how two measures relate, but gives up how values spread. | `{"type":"scatter","x":"women","y":"men","label":"age"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up how values spread. | `{"type":"table"}` |
| `icicle` | fits | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"icicle","levels":"age","value":"women"}` |
| `kpi` | fits | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"kpi","value":"women"}` |
| `kpis` | fits | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"women"},{"value":"men"}]}` |
| `pareto` | fits | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"pareto","label":"age","value":"women"}` |
| `rose` | fits | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"rose","label":"age","y":["women","men"]}` |
| `sunburst` | fits | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"age","value":"women"}` |
| `beeswarm` | stretch: 9 rows: this chart says little with fewer than 10. | same | Keeps the job (how values spread) with a different look. | `{"type":"beeswarm","value":"women","label":"age"}` |
| `boxplot` | stretch: 9 rows: this chart says little with fewer than 15. | same | Keeps the job (how values spread) with a different look. | `{"type":"boxplot","value":"women"}` |
| `histogram` | stretch: 9 rows: this chart says little with fewer than 20. | same | Keeps the job (how values spread) with a different look. | `{"type":"histogram","value":"women"}` |
| `ridgeline` | stretch: 9 rows: this chart says little with fewer than 20. | same | Keeps the job (how values spread) with a different look. | `{"type":"ridgeline","value":"women","group":"age"}` |
| `area` | stretch: x expects dates; "age" is text, so its rows are drawn in the order given. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"area","x":"age","y":["women","men"]}` |
| `donut` | stretch: 9 rows: this chart crowds past about 6. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"donut","label":"age","value":"women"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 9 rows. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"gauge","value":"women"}` |
| `horizon` | stretch: x expects dates; "age" is text, so its rows are drawn in the order given. 9 rows: this chart says little with fewer than 10. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"horizon","x":"age","y":["women","men"]}` |
| `line` | stretch: x expects dates; "age" is text, so its rows are drawn in the order given. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"line","x":"age","y":["women","men"]}` |
| `pie` | stretch: 9 rows: this chart crowds past about 6. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"pie","label":"age","value":"women"}` |
| `waffle` | stretch: 9 rows: this chart crowds past about 5. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"waffle","label":"age","value":"women"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "age", already the x)); `board` (needs a separate column for stage (it would reuse "age", already the label)); `bullet` (It needs a target, plan or budget column.); `bump` (needs a separate column for series (it would reuse "age", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for low (it would reuse "women", already the open)); `chord` (needs a separate column for target (it would reuse "age", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "age", already the x)); `history` (needs a separate column for title (it would reuse "age", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "age", already the x)); `matrix` (needs a separate column for y (it would reuse "age", already the x)); `meter` (It needs a target, plan or budget column.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "age", already the label)); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "age", already the source)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "age", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
