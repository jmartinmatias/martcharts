# `likert` chart

Survey answers as diverging stacked bars: one bar per question, its responses in order from one pole to the other, centered on the neutral middle so disagreement grows left and agreement right. Shares disagreeing and agreeing are written at each end. Takes one row per question with a count field per response.

## What it is for

- Survey and rating answers: best
- Share of one whole: good
- Comparing amounts across categories: good

**Best for**

- Agree and disagree scales: employee and customer surveys
- Comparing sentiment across questions

**Least useful for**

- Categories with no order from negative to positive (use bar stacked)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One bar per row (a question); its response fields, in order from one pole to the other, stack centered on the neutral middle.

**Rows it reads well with**: 1 to 20.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field with each question. |
| `responses` | number (one or more) | yes | Count fields for the responses, in order from the negative pole to the positive, for example ["strongly_disagree", "disagree", "neutral", "agree", "strongly_agree"]. An odd count puts the middle one at the center. |

## This example's columns (6 columns, 5 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `question` | category | `label` | 5 different, e.g. "I understand our strategy", "My manager supports my growth", "I have the tools to do my job" |
| `strongly_disagree` | number | `responses` | 8 to 38 |
| `disagree` | number | `responses` | 20 to 70 |
| `neutral` | number | `responses` | 40 to 60 |
| `agree` | number | `responses` | 58 to 110 |
| `strongly_agree` | number | `responses` | 18 to 68 |

## The data drawing it now

| question | strongly_disagree | disagree | neutral | agree | strongly_agree |
| --- | --- | --- | --- | --- | --- |
| I understand our strategy | 8 | 22 | 40 | 110 | 60 |
| My manager supports my growth | 12 | 28 | 46 | 96 | 58 |
| I have the tools to do my job | 24 | 52 | 60 | 78 | 26 |
| My workload is sustainable | 38 | 70 | 56 | 58 | 18 |
| I would recommend working here | 10 | 20 | 42 | 100 | 68 |

As CSV:

```csv
question,strongly_disagree,disagree,neutral,agree,strongly_agree
I understand our strategy,8,22,40,110,60
My manager supports my growth,12,28,46,96,58
I have the tools to do my job,24,52,60,78,26
My workload is sustainable,38,70,56,58,18
I would recommend working here,10,20,42,100,68
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "employee-survey",
  "title": "Employee pulse survey",
  "subtitle": "Q3 2026, share disagreeing and agreeing",
  "description": "Answers to five statements, centered on neutral. Strategy and recommendation score well; workload is the one most people disagree with.",
  "footer": "Source: HR pulse survey, 240 responses",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "question": "I understand our strategy",
        "strongly_disagree": 8,
        "disagree": 22,
        "neutral": 40,
        "agree": 110,
        "strongly_agree": 60
      },
      {
        "question": "My manager supports my growth",
        "strongly_disagree": 12,
        "disagree": 28,
        "neutral": 46,
        "agree": 96,
        "strongly_agree": 58
      },
      {
        "question": "I have the tools to do my job",
        "strongly_disagree": 24,
        "disagree": 52,
        "neutral": 60,
        "agree": 78,
        "strongly_agree": 26
      }
    ]
  },
  "view": {
    "type": "likert",
    "label": "question",
    "responses": [
      "strongly_disagree",
      "disagree",
      "neutral",
      "agree",
      "strongly_agree"
    ]
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `bar` | fits | different | Answers a different question: better for ranking, top to bottom and trend over time, but gives up survey and rating answers. | `{"type":"bar","x":"question","y":["strongly_disagree","disagree"]}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up survey and rating answers. | `{"type":"hbar","label":"question","value":"strongly_disagree"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up survey and rating answers. | `{"type":"list","label":"question"}` |
| `donut` | fits | different | Answers a different question: better for share of one whole, but gives up survey and rating answers. | `{"type":"donut","label":"question","value":"strongly_disagree"}` |
| `radar` | fits | different | Answers a different question: better for profiles across several attributes, but gives up survey and rating answers. | `{"type":"radar","label":"question","y":["strongly_disagree","disagree"]}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up survey and rating answers. | `{"type":"table"}` |
| `icicle` | fits | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"icicle","levels":"question","value":"strongly_disagree"}` |
| `kpi` | fits | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"kpi","value":"strongly_disagree"}` |
| `kpis` | fits | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"strongly_disagree"},{"value":"disagree"},{"value":"neutral"}]}` |
| `pareto` | fits | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"pareto","label":"question","value":"strongly_disagree"}` |
| `rose` | fits | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"rose","label":"question","y":["strongly_disagree","disagree"]}` |
| `sunburst` | fits | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"question","value":"strongly_disagree"}` |
| `treemap` | fits | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"treemap","label":"question","value":"strongly_disagree"}` |
| `waffle` | fits | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"waffle","label":"question","value":"strongly_disagree"}` |
| `area` | stretch: x expects dates; "question" is text, so its rows are drawn in the order given. | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"area","x":"question","y":["strongly_disagree","disagree"]}` |
| `beeswarm` | stretch: 5 rows: this chart says little with fewer than 10. | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"strongly_disagree","label":"question"}` |
| `boxplot` | stretch: 5 rows: this chart says little with fewer than 15. | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"boxplot","value":"strongly_disagree"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 5 rows. | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"gauge","value":"strongly_disagree"}` |
| `histogram` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"histogram","value":"strongly_disagree"}` |
| `horizon` | stretch: x expects dates; "question" is text, so its rows are drawn in the order given. 5 rows: this chart says little with fewer than 10. | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"horizon","x":"question","y":["strongly_disagree","disagree"]}` |
| `line` | stretch: x expects dates; "question" is text, so its rows are drawn in the order given. | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"line","x":"question","y":["strongly_disagree","disagree"]}` |
| `ridgeline` | stretch: 5 rows: this chart says little with fewer than 20. | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"strongly_disagree","group":"question"}` |
| `scatter` | stretch: 5 rows: this chart says little with fewer than 6. | worse | Gives up survey and rating answers, and this data gives it nothing better to do. | `{"type":"scatter","x":"strongly_disagree","y":"disagree","label":"question"}` |

Not possible with this data: `bullet` (It needs a target, plan or budget column.); `bump` (needs a separate column for series (it would reuse "question", already the x)); `calendar` (needs a date column for date); `candlestick` (It needs open, high, low and close prices per period.); `chord` (needs a separate column for target (it would reuse "question", already the source)); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "question", already the x)); `marimekko` (needs a separate column for series (it would reuse "question", already the x)); `meter` (It needs a target, plan or budget column.); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "question", already the source)); `slope` (It needs the same measure at two points in time, in two columns.); `timeline` (needs a date column for start); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.).
