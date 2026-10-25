# `strips` chart

Unit strips: one row per item with a strip of small squares, one per unit, colored part by part in order (mandatory, recommended, optional), the total and the first part's share at the end. When totals run long, one square stands for a round number of units, said under the chart. A per field adds a density: provisions per page. For how many provisions a regulation has and how binding they are.

## What it is for

- How each group or period splits: best
- Comparing amounts across categories: good
- Share of one whole: possible

**Best for**

- How many provisions each regulation has and how many are binding (mandatory, recommended, optional)
- Density: provisions per page, when per is set
- Counts people can see as things, not lengths

**Least useful for**

- Amounts that are not counts, such as money (use hbar stacked)
- More than about 20 rows (use hbar stacked)
- Shares of one whole across items (use waffle or donut)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One row per data row with one small square per unit, filled part by part in order (each part its color), the total and the first part's share written at the end; when totals run long, one square stands for a round number of units.

**Rows it reads well with**: 1 to 20.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each row. |
| `value` | number (one or more) | yes | Field or fields with each part's count, in the order they are drawn. The first part's share of the total is written at the end. Also accepts `parts`, the older name. |
| `per` | number |  | Field with a denominator, such as pages: the density (units per one of them) is written at the end and in the tooltip. |

## This example's columns (7 columns, 12 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `name` (Regulation) | category | `label` | 12 different, e.g. "CRR3", "AI Act", "AMLR" |
| `mandatory` (Mandatory) | number | `value` | 39 to 351 |
| `recommended` (Recommended) | number | `value` | 5 to 89 |
| `optional` (Optional) | number | `value` | 2 to 46 |
| `pages` (Pages) | number | `per` | 23 to 420 |
| `topic` | category | not drawn | 9 different, e.g. "Prudential", "AI & digital", "AML & sanctions" |
| `provisions` | number | not drawn | 48 to 412 |

## The data drawing it now

| name | mandatory | recommended | optional | pages | topic | provisions |
| --- | --- | --- | --- | --- | --- | --- |
| CRR3 | 351 | 38 | 23 | 420 | Prudential | 412 |
| AI Act | 241 | 89 | 46 | 144 | AI & digital | 376 |
| AMLR | 289 | 41 | 26 | 180 | AML & sanctions | 356 |
| DORA | 221 | 58 | 33 | 79 | Operational resilience | 312 |
| MiCA | 196 | 60 | 32 | 150 | Markets | 288 |
| PSD3 | 130 | 44 | 24 | 92 | Payments | 198 |
| CSRD | 97 | 31 | 14 | 45 | ESG & sustainability | 142 |
| EMIR 3 | 84 | 22 | 15 | 60 | Markets | 121 |
| FiDA | 76 | 30 | 12 | 61 | Data & privacy | 118 |
| CCD2 | 68 | 19 | 10 | 46 | Consumer protection | 97 |
| GDPR procedural rules | 39 | 10 | 5 | 30 | Data & privacy | 54 |
| Instant Payments | 41 | 5 | 2 | 23 | Payments | 48 |

As CSV:

```csv
name,mandatory,recommended,optional,pages,topic,provisions
CRR3,351,38,23,420,Prudential,412
AI Act,241,89,46,144,AI & digital,376
AMLR,289,41,26,180,AML & sanctions,356
DORA,221,58,33,79,Operational resilience,312
MiCA,196,60,32,150,Markets,288
PSD3,130,44,24,92,Payments,198
CSRD,97,31,14,45,ESG & sustainability,142
EMIR 3,84,22,15,60,Markets,121
FiDA,76,30,12,61,Data & privacy,118
CCD2,68,19,10,46,Consumer protection,97
GDPR procedural rules,39,10,5,30,Data & privacy,54
Instant Payments,41,5,2,23,Payments,48
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "provision-strips",
  "title": "How binding each regulation is",
  "subtitle": "Provisions by kind, and provisions per page",
  "description": "One square per provision, colored mandatory, recommended or optional, so the size of each rulebook and the share that binds can be counted; the density per page says how dense the text is.",
  "note": "Fictional counts",
  "source": {
    "name": "Regulatory watch register"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "name": "CRR3",
        "topic": "Prudential",
        "mandatory": 351,
        "recommended": 38,
        "optional": 23,
        "provisions": 412,
        "pages": 420
      },
      {
        "name": "AI Act",
        "topic": "AI & digital",
        "mandatory": 241,
        "recommended": 89,
        "optional": 46,
        "provisions": 376,
        "pages": 144
      },
      {
        "name": "AMLR",
        "topic": "AML & sanctions",
        "mandatory": 289,
        "recommended": 41,
        "optional": 26,
        "provisions": 356,
        "pages": 180
      }
    ]
  },
  "fields": {
    "name": {
      "label": "Regulation"
    },
    "mandatory": {
      "label": "Mandatory"
    },
    "recommended": {
      "label": "Recommended"
    },
    "optional": {
      "label": "Optional"
    },
    "pages": {
      "label": "Pages"
    }
  },
  "view": {
    "type": "strips",
    "label": "name",
    "value": [
      "mandatory",
      "recommended",
      "optional"
    ],
    "per": "pages",
    "unit": "provision"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `marimekko` | fits | same | Keeps the job (how each group or period splits) with a different look. | `{"type":"marimekko","x":"name","series":"topic","value":"mandatory"}` |
| `bar` | fits | trade-off | Better for ranking, top to bottom and trend over time; weaker for how each group or period splits. | `{"type":"bar","x":"name","y":["mandatory","recommended"]}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up how each group or period splits. Lengths compare more precisely across rows; the sense of countable units is lost. | `{"type":"hbar","label":"name","value":["mandatory","recommended"]}` |
| `icicle` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up how each group or period splits. | `{"type":"icicle","levels":["name","topic"],"value":"mandatory"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up how each group or period splits. | `{"type":"list","label":"name"}` |
| `matrix` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle and exact values and lookup, but gives up how each group or period splits. | `{"type":"matrix","x":"name","y":"topic","label":"name"}` |
| `sunburst` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up how each group or period splits. | `{"type":"sunburst","levels":["name","topic"],"value":"mandatory"}` |
| `treemap` | fits | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up how each group or period splits. | `{"type":"treemap","label":"name","value":"mandatory"}` |
| `heatmap` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up how each group or period splits. | `{"type":"heatmap","x":"name","y":"topic","value":"mandatory"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up how each group or period splits. | `{"type":"sankey","source":"name","target":"topic","value":"mandatory"}` |
| `scatter` | fits | different | Answers a different question: better for how two measures relate, but gives up how each group or period splits. | `{"type":"scatter","x":"mandatory","y":"recommended","label":"name"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up how each group or period splits. | `{"type":"table"}` |
| `beeswarm` | fits | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"mandatory","label":"name"}` |
| `dot` | fits | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"dot","label":"name","value":["mandatory","recommended"]}` |
| `kpi` | fits | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"kpi","value":"mandatory"}` |
| `kpis` | fits | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"mandatory"},{"value":"recommended"},{"value":"optional"}]}` |
| `pareto` | fits | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"pareto","label":"name","value":"mandatory"}` |
| `radar` | fits | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"radar","label":"name","y":["mandatory","recommended"]}` |
| `rose` | fits | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"rose","label":"name","y":["mandatory","recommended"]}` |
| `area` | stretch: x expects dates; "name" is text, so its rows are drawn in the order given. | worse | Weaker for how each group or period splits, with nothing gained for this data. | `{"type":"area","x":"name","y":["mandatory","recommended"]}` |
| `boxplot` | stretch: 12 rows: this chart says little with fewer than 15. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"boxplot","value":"mandatory"}` |
| `donut` | stretch: 12 rows: this chart crowds past about 6. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"donut","label":"name","value":"mandatory"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 12 rows. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"gauge","value":"mandatory"}` |
| `histogram` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"histogram","value":"mandatory"}` |
| `horizon` | stretch: x expects dates; "name" is text, so its rows are drawn in the order given. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"horizon","x":"name","y":["mandatory","recommended"]}` |
| `line` | stretch: x expects dates; "name" is text, so its rows are drawn in the order given. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"line","x":"name","y":["mandatory","recommended"]}` |
| `pie` | stretch: 12 rows: this chart crowds past about 6. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"pie","label":"name","value":"mandatory"}` |
| `ridgeline` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"mandatory","group":"name"}` |
| `waffle` | stretch: 12 rows: this chart crowds past about 5. | worse | Gives up how each group or period splits, and this data gives it nothing better to do. | `{"type":"waffle","label":"name","value":"mandatory"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `board` (It needs a stage or status column with a handful of values, and a name per row.); `bullet` (It needs a target, plan or budget column.); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (It needs open, high, low and close prices per period.); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for status (it would reuse "name", already the label)); `rings` (It needs a target, plan or budget column.); `slope` (It needs the same measure at two points in time, in two columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for state (it would reuse "name", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
