# `matrix` chart

A mark matrix (a punchcard): one mark per pair of x and y, sized by a value, shaded by another, or a square where a flag is yes. Rows are the y values, columns the x values; a pair with no row is an empty cell. For regulatory pressure per topic per quarter (size and shade), or who must comply with which rule (a square per yes).

## What it is for

- Patterns across two dimensions or a cycle: best
- Comparing amounts across categories: good
- Exact values and lookup: good

**Best for**

- Regulatory pressure per topic per quarter: how many new obligations, how hard they bite
- Who must comply with which rule: one square per yes
- Any two categories crossed, where a heatmap's shade alone says too little

**Least useful for**

- One category only (use hbar or dot)
- Exact values to read off (use table with heat cells)
- More than about 24 columns or 30 rows

## The data it needs

**One row is**: One row per combination of two categories, such as month and product.

**How the chart is built**: One mark per row at its x column and y row: a circle sized by size, shaded by color (a number on the seven-step scale, a category by its color), or a square where mark is yes; pairs with no row stay empty.

**Rows it reads well with**: 4 to 400.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `x` | category | yes | Field for the columns: quarters, stakeholders, stages. |
| `y` | category | yes | Field for the rows: topics, regulations, teams. |
| `size` | number |  | Field that sizes each circle, by area, against the largest value. |
| `color` | category |  | Field that shades each mark: a number takes the seven-step scale from lowest to highest (with a scale under the grid), a category takes one color per value (with a key). |
| `flag` | category |  | A yes/no field (true, 1, "yes", "x"): a filled square where it is yes, a faint dot where it is no. For who must comply. Also accepts `mark`, the older name. |
| `label` | category |  | Field (text or a number) written inside marks big enough to hold it; always in the tooltip. |

## This example's columns (3 columns, 50 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `stakeholder` (Must comply) | category | `x` | 5 different, e.g. "Banks", "Insurers", "Asset managers" |
| `regulation` (Regulation) | category | `y` | 10 different, e.g. "DORA", "AMLR", "AI Act" |
| `mustComply` (Must comply) | boolean | `flag` | 2 different, e.g. true, false |

## The data drawing it now

| stakeholder | regulation | mustComply |
| --- | --- | --- |
| Banks | DORA | true |
| Insurers | DORA | true |
| Asset managers | DORA | true |
| Payment institutions | DORA | true |
| Crypto providers | DORA | true |
| Banks | AMLR | true |
| Insurers | AMLR | true |
| Asset managers | AMLR | true |
| Payment institutions | AMLR | true |
| Crypto providers | AMLR | true |
| Banks | AI Act | true |
| Insurers | AI Act | true |
| Asset managers | AI Act | true |
| Payment institutions | AI Act | true |
| Crypto providers | AI Act | false |
| Banks | MiCA | true |
| Insurers | MiCA | false |
| Asset managers | MiCA | false |
| Payment institutions | MiCA | true |
| Crypto providers | MiCA | true |
| Banks | CSRD | true |
| Insurers | CSRD | true |
| Asset managers | CSRD | true |
| Payment institutions | CSRD | false |
| Crypto providers | CSRD | false |
| Banks | CRR3 | true |
| Insurers | CRR3 | false |
| Asset managers | CRR3 | false |
| Payment institutions | CRR3 | false |
| Crypto providers | CRR3 | false |
| Banks | PSD3 | true |
| Insurers | PSD3 | false |
| Asset managers | PSD3 | false |
| Payment institutions | PSD3 | true |
| Crypto providers | PSD3 | false |
| Banks | FiDA | true |
| Insurers | FiDA | true |
| Asset managers | FiDA | true |
| Payment institutions | FiDA | true |
| Crypto providers | FiDA | false |
| Banks | EMIR 3 | true |
| Insurers | EMIR 3 | true |
| Asset managers | EMIR 3 | true |
| Payment institutions | EMIR 3 | false |
| Crypto providers | EMIR 3 | false |
| Banks | Instant Payments | true |
| Insurers | Instant Payments | false |
| Asset managers | Instant Payments | false |
| Payment institutions | Instant Payments | true |
| Crypto providers | Instant Payments | false |

As CSV:

```csv
stakeholder,regulation,mustComply
Banks,DORA,true
Insurers,DORA,true
Asset managers,DORA,true
Payment institutions,DORA,true
Crypto providers,DORA,true
Banks,AMLR,true
Insurers,AMLR,true
Asset managers,AMLR,true
Payment institutions,AMLR,true
Crypto providers,AMLR,true
Banks,AI Act,true
Insurers,AI Act,true
Asset managers,AI Act,true
Payment institutions,AI Act,true
Crypto providers,AI Act,false
Banks,MiCA,true
Insurers,MiCA,false
Asset managers,MiCA,false
Payment institutions,MiCA,true
Crypto providers,MiCA,true
Banks,CSRD,true
Insurers,CSRD,true
Asset managers,CSRD,true
Payment institutions,CSRD,false
Crypto providers,CSRD,false
Banks,CRR3,true
Insurers,CRR3,false
Asset managers,CRR3,false
Payment institutions,CRR3,false
Crypto providers,CRR3,false
Banks,PSD3,true
Insurers,PSD3,false
Asset managers,PSD3,false
Payment institutions,PSD3,true
Crypto providers,PSD3,false
Banks,FiDA,true
Insurers,FiDA,true
Asset managers,FiDA,true
Payment institutions,FiDA,true
Crypto providers,FiDA,false
Banks,EMIR 3,true
Insurers,EMIR 3,true
Asset managers,EMIR 3,true
Payment institutions,EMIR 3,false
Crypto providers,EMIR 3,false
Banks,Instant Payments,true
Insurers,Instant Payments,false
Asset managers,Instant Payments,false
Payment institutions,Instant Payments,true
Crypto providers,Instant Payments,false
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "obligation-matrix",
  "title": "Who must comply",
  "subtitle": "Regulations against the firms they bind",
  "description": "A square wherever a kind of firm must comply with a regulation, a faint dot where it need not: the compliance footprint of each rule and of each kind of firm at a glance.",
  "footer": "Fictional scope; not legal advice",
  "source": {
    "name": "Regulatory watch register"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "regulation": "DORA",
        "stakeholder": "Banks",
        "mustComply": true
      },
      {
        "regulation": "DORA",
        "stakeholder": "Insurers",
        "mustComply": true
      },
      {
        "regulation": "DORA",
        "stakeholder": "Asset managers",
        "mustComply": true
      }
    ]
  },
  "fields": {
    "regulation": {
      "label": "Regulation"
    },
    "stakeholder": {
      "label": "Must comply"
    },
    "mustComply": {
      "label": "Must comply"
    }
  },
  "view": {
    "type": "matrix",
    "x": "stakeholder",
    "y": "regulation",
    "flag": "mustComply"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up patterns across two dimensions or a cycle. | `{"type":"table"}` |
| `list` | stretch: "stakeholder" repeats (5 different values in 50 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 50 rows: this chart crowds past about 20. | different | Answers a different question: better for ranking, top to bottom and exact values and lookup, but gives up patterns across two dimensions or a cycle. | `{"type":"list","label":"stakeholder"}` |

Not possible with this data: `anomalies` (needs a number column for value, and there is none left); `area` (needs a number column for y, and there is none left); `bar` (needs a number column for y, and there is none left); `beeswarm` (needs a number column for value, and there is none left); `board` (It needs a stage or status column with a handful of values, and a name per row.); `boxplot` (needs a number column for value, and there is none left); `bullet` (needs a number column for value, and there is none left); `bump` (needs a number column for value, and there is none left); `calendar` (needs a date column for date); `candlestick` (needs a number column for open, and there is none left); `chord` (needs a number column for value, and there is none left); `choropleth` (needs a column of country or state codes that sit on a basemap); `donut` (needs a number column for value, and there is none left); `dot` (needs a number column for value, and there is none left); `dual` (needs a number column for y, and there is none left); `dumbbell` (needs a number column for from, and there is none left); `funnel` (needs a number column for value, and there is none left); `gauge` (needs a number column for value, and there is none left); `hbar` (needs a number column for value, and there is none left); `heatmap` (needs a number column for value, and there is none left); `histogram` (needs a number column for value, and there is none left); `history` (It needs dated events with a short title each.); `horizon` (needs a number column for y, and there is none left); `icicle` (needs a number column for value, and there is none left); `kpi` (needs a number column for value, and there is none left); `kpis` (view: items needs at least one entry.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (needs a number column for value, and there is none left); `line` (needs a number column for y, and there is none left); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a number column for value, and there is none left); `meter` (needs a number column for value, and there is none left); `pareto` (needs a number column for value, and there is none left); `pie` (needs a number column for value, and there is none left); `pyramid` (needs a number column for left, and there is none left); `radar` (needs a number column for y, and there is none left); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (It needs one status (R, A, G) per entity per period.); `ridgeline` (needs a number column for value, and there is none left); `rings` (needs a number column for value, and there is none left); `rose` (needs a number column for y, and there is none left); `sankey` (needs a number column for value, and there is none left); `scatter` (needs a number column for x, and there is none left); `slope` (needs a number column for from, and there is none left); `strips` (needs a number column for value, and there is none left); `sunburst` (needs a number column for value, and there is none left); `symbols` (needs a number column for size, and there is none left); `timeline` (needs a date column for start); `treemap` (needs a number column for value, and there is none left); `variance` (needs a number column for value, and there is none left); `waffle` (needs a number column for value, and there is none left); `waterfall` (needs a number column for value, and there is none left); `whitespace` (It needs one row per client and product with a state: held, an opportunity, or not eligible.); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
