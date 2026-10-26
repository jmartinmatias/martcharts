# `variance` chart

Variance against plan, as in financial reporting: per row a bar from a zero line to actual minus plan, right when over and left when under, colored good or bad and labelled with its sign. For budget against actual, or results against target.

## What it is for

- Actual against target or plan: best
- What drives or moves a total: good
- Comparing amounts across categories: good

**Best for**

- Budget against actual per line item
- Financial variance reports where the sign and size of each miss matter

**Least useful for**

- Data with no plan or budget (use hbar)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One bar per row from a zero line to value minus target, right when over and left when under, colored good or bad.

**Rows it reads well with**: 2 to 20.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each row, such as a department. |
| `value` | number | yes | Field with the actual amount. |
| `target` | number | yes | Field with the plan, budget or target. |

## This example's columns (3 columns, 6 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `department` | category | `label` | 6 different, e.g. "Sales", "Marketing", "R&D" |
| `actual` (Actual) | number | `value` | 75000 to 520000 |
| `budget` (Budget) | number | `target` | 85000 to 500000 |

## The data drawing it now

| department | actual | budget |
| --- | --- | --- |
| Sales | 412000 | 380000 |
| Marketing | 188000 | 210000 |
| R&D | 520000 | 500000 |
| Support | 140000 | 150000 |
| G&A | 96000 | 90000 |
| IT | 75000 | 85000 |

As CSV:

```csv
department,actual,budget
Sales,412000,380000
Marketing,188000,210000
R&D,520000,500000
Support,140000,150000
G&A,96000,90000
IT,75000,85000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "opex-variance",
  "title": "Operating costs against budget",
  "subtitle": "Q3 2026, by department",
  "description": "Each department's Q3 spend minus its budget. Sales and R&D ran over; Marketing, Support and IT came in under.",
  "source": {
    "name": "Finance ledger"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "department": "Sales",
        "actual": 412000,
        "budget": 380000
      },
      {
        "department": "Marketing",
        "actual": 188000,
        "budget": 210000
      },
      {
        "department": "R&D",
        "actual": 520000,
        "budget": 500000
      }
    ]
  },
  "fields": {
    "actual": {
      "label": "Actual",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "budget": {
      "label": "Budget",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    }
  },
  "view": {
    "type": "variance",
    "label": "department",
    "value": "actual",
    "target": "budget",
    "goodWhen": "down"
  },
  "i18n": {
    "fr": {
      "title": "Coûts opérationnels face au budget",
      "subtitle": "T3 2026, par service",
      "description": "Dépenses du T3 de chaque service moins son budget. Ventes et R&D ont dépassé ; Marketing, Support et IT sont en dessous.",
      "source": {
        "name": "Grand livre"
      },
      "fields": {
        "actual": {
          "label": "Réel"
        }
      }
    },
    "de": {
      "title": "Betriebskosten gegen Budget",
      "subtitle": "Q3 2026, nach Abteilung",
      "description": "Q3-Ausgaben jeder Abteilung minus Budget. Vertrieb und F&E lagen darüber; Marketing, Support und IT darunter.",
      "source": {
        "name": "Hauptbuch"
      },
      "fields": {
        "actual": {
          "label": "Ist"
        }
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `bullet` | fits | same | Keeps the job (actual against target or plan) with a different look. | `{"type":"bullet","label":"department","value":"actual","target":"budget","goodWhen":"down"}` |
| `meter` | fits | same | Keeps the job (actual against target or plan) with a different look. Shows progress toward each target instead of the size of each miss. | `{"type":"meter","value":"actual","target":"budget","label":"department","goodWhen":"down"}` |
| `bar` | fits | different | Answers a different question: better for ranking, top to bottom and trend over time, but gives up actual against target or plan. | `{"type":"bar","x":"department","y":["actual","budget"],"goodWhen":"down"}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up actual against target or plan. | `{"type":"hbar","label":"department","value":["actual","budget"]}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up actual against target or plan. | `{"type":"list","label":"department","value":"actual"}` |
| `donut` | fits | different | Answers a different question: better for share of one whole, but gives up actual against target or plan. | `{"type":"donut","label":"department","value":"actual"}` |
| `pie` | fits | different | Answers a different question: better for share of one whole, but gives up actual against target or plan. | `{"type":"pie","label":"department","value":"actual"}` |
| `radar` | fits | different | Answers a different question: better for profiles across several attributes, but gives up actual against target or plan. | `{"type":"radar","label":"department","y":["actual","budget"]}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up actual against target or plan. | `{"type":"table"}` |
| `dot` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"dot","label":"department","value":["actual","budget"]}` |
| `icicle` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"icicle","levels":"department","value":"actual"}` |
| `kpi` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"kpi","value":"actual","goodWhen":"down","target":"budget"}` |
| `kpis` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"actual"},{"value":"budget"}]}` |
| `pareto` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"pareto","label":"department","value":"actual"}` |
| `rose` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"rose","label":"department","y":["actual","budget"]}` |
| `scatter` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"scatter","x":"actual","y":"budget","label":"department"}` |
| `sunburst` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"department","value":"actual"}` |
| `treemap` | fits | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"treemap","label":"department","value":"actual"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 6 rows. | same | Keeps the job (actual against target or plan) with a different look. | `{"type":"gauge","value":"actual","target":"budget","goodWhen":"down"}` |
| `area` | stretch: x expects dates; "department" is text, so its rows are drawn in the order given. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"area","x":"department","y":["actual","budget"]}` |
| `beeswarm` | stretch: 6 rows: this chart says little with fewer than 10. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"actual","label":"department"}` |
| `boxplot` | stretch: 6 rows: this chart says little with fewer than 15. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"boxplot","value":"actual"}` |
| `histogram` | stretch: 6 rows: this chart says little with fewer than 20. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"histogram","value":"actual"}` |
| `horizon` | stretch: x expects dates; "department" is text, so its rows are drawn in the order given. 6 rows: this chart says little with fewer than 10. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"horizon","x":"department","y":["actual","budget"]}` |
| `line` | stretch: x expects dates; "department" is text, so its rows are drawn in the order given. | worse | Weaker for actual against target or plan, with nothing gained for this data. | `{"type":"line","x":"department","y":["actual","budget"]}` |
| `ridgeline` | stretch: 6 rows: this chart says little with fewer than 20. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"actual","group":"department"}` |
| `waffle` | stretch: 6 rows: this chart crowds past about 5. | worse | Gives up actual against target or plan, and this data gives it nothing better to do. | `{"type":"waffle","label":"department","value":"actual"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "department", already the x)); `board` (needs a separate column for stage (it would reuse "department", already the label)); `bump` (needs a separate column for series (it would reuse "department", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for low (it would reuse "actual", already the open)); `chord` (needs a separate column for target (it would reuse "department", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "department", already the x)); `history` (needs a separate column for title (it would reuse "department", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "department", already the x)); `matrix` (needs a separate column for y (it would reuse "department", already the x)); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "department", already the label)); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "department", already the source)); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "department", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
