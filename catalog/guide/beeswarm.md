# `beeswarm` chart

A distribution: one dot per row along a value axis, nudged apart so none overlap, optionally one row per group. Shows spread and outliers an average hides.

## What it is for

- How values spread: best
- Comparing amounts across categories: possible
- Exact values and lookup: possible

**Best for**

- Every individual deal, order or response visible, with outliers you can name
- Spread across a few groups in samples of tens to hundreds

**Least useful for**

- Thousands of rows (use histogram)
- Totals or shares (use bar or donut)

## The data it needs

**One row is**: One row per thing measured (a deal, a ticket, a response); the chart counts or spreads them.

**How the chart is built**: One dot per row along the value axis, nudged apart so none overlap; a group field gives each group its own row, and a label field names each dot on hover.

**Rows it reads well with**: 10 to 400.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `value` | number | yes | Numeric field along the axis. |
| `group` | category |  | Field giving each group its own labelled row. |
| `label` | category |  | Field naming each dot in its tooltip. |

## This example's columns (3 columns, 24 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `value` (Deal value) | number | `value` | 22000 to 180000 |
| `region` (Region) | category | `group` | 3 different, e.g. "North", "South", "East" |
| `deal` | category | `label` | 24 different, e.g. "North deal 1", "North deal 2", "North deal 3" |

## The data drawing it now

| value | region | deal |
| --- | --- | --- |
| 42000 | North | North deal 1 |
| 55000 | North | North deal 2 |
| 61000 | North | North deal 3 |
| 48000 | North | North deal 4 |
| 70000 | North | North deal 5 |
| 95000 | North | North deal 6 |
| 38000 | North | North deal 7 |
| 52000 | North | North deal 8 |
| 22000 | South | South deal 9 |
| 31000 | South | South deal 10 |
| 28000 | South | South deal 11 |
| 35000 | South | South deal 12 |
| 40000 | South | South deal 13 |
| 26000 | South | South deal 14 |
| 33000 | South | South deal 15 |
| 180000 | South | South deal 16 |
| 88000 | East | East deal 17 |
| 120000 | East | East deal 18 |
| 140000 | East | East deal 19 |
| 96000 | East | East deal 20 |
| 110000 | East | East deal 21 |
| 135000 | East | East deal 22 |
| 105000 | East | East deal 23 |
| 150000 | East | East deal 24 |

As CSV:

```csv
value,region,deal
42000,North,North deal 1
55000,North,North deal 2
61000,North,North deal 3
48000,North,North deal 4
70000,North,North deal 5
95000,North,North deal 6
38000,North,North deal 7
52000,North,North deal 8
22000,South,South deal 9
31000,South,South deal 10
28000,South,South deal 11
35000,South,South deal 12
40000,South,South deal 13
26000,South,South deal 14
33000,South,South deal 15
180000,South,South deal 16
88000,East,East deal 17
120000,East,East deal 18
140000,East,East deal 19
96000,East,East deal 20
110000,East,East deal 21
135000,East,East deal 22
105000,East,East deal 23
150000,East,East deal 24
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "deal-swarm",
  "title": "Deal sizes by region",
  "subtitle": "Every one closed this half",
  "description": "The spread of deal values per region, including outliers an average would hide.",
  "source": {
    "name": "CRM"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "deal": "North deal 1",
        "value": 42000,
        "region": "North"
      },
      {
        "deal": "North deal 2",
        "value": 55000,
        "region": "North"
      },
      {
        "deal": "North deal 3",
        "value": 61000,
        "region": "North"
      }
    ]
  },
  "fields": {
    "value": {
      "label": "Deal value",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "region": {
      "label": "Region"
    }
  },
  "view": {
    "type": "beeswarm",
    "value": "value",
    "group": "region",
    "label": "deal"
  },
  "i18n": {
    "fr": {
      "title": "Taille des affaires par région",
      "subtitle": "Toutes celles conclues ce semestre",
      "description": "La dispersion des montants par région, valeurs extrêmes comprises.",
      "fields": {
        "value": {
          "label": "Valeur de l'affaire"
        },
        "region": {
          "label": "Région",
          "values": {
            "North": "Nord",
            "South": "Sud",
            "East": "Est"
          }
        }
      }
    },
    "de": {
      "title": "Dealgrößen je Region",
      "subtitle": "Alle in diesem Halbjahr abgeschlossen",
      "description": "Streuung der Dealwerte je Region, inklusive Ausreißern, die ein Mittel verbirgt.",
      "fields": {
        "value": {
          "label": "Dealwert"
        },
        "region": {
          "values": {
            "North": "Nord",
            "South": "Süd",
            "East": "Ost"
          }
        }
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `boxplot` | fits | better | Better for comparing amounts across categories, and still good for how values spread. | `{"type":"boxplot","value":"value","group":"region"}` |
| `histogram` | fits | same | Keeps the job (how values spread) with a different look. Scales to thousands of rows; individual points are gone. | `{"type":"histogram","value":"value"}` |
| `ridgeline` | fits | same | Keeps the job (how values spread) with a different look. | `{"type":"ridgeline","value":"value","group":"region"}` |
| `icicle` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up how values spread. | `{"type":"icicle","levels":["region","deal"],"value":"value"}` |
| `matrix` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle and comparing amounts across categories, but gives up how values spread. | `{"type":"matrix","x":"region","y":"deal","label":"deal"}` |
| `sunburst` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up how values spread. | `{"type":"sunburst","levels":["region","deal"],"value":"value"}` |
| `heatmap` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up how values spread. | `{"type":"heatmap","x":"region","y":"deal","value":"value"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up how values spread. | `{"type":"sankey","source":"region","target":"deal","value":"value"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up how values spread. | `{"type":"table"}` |
| `kpi` | fits | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"kpi","value":"value"}` |
| `kpis` | fits | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"value"}]}` |
| `marimekko` | fits | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"marimekko","x":"region","series":"deal","value":"value"}` |
| `hbar` | stretch: "region" repeats (3 different values in 24 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up how values spread. | `{"type":"hbar","label":"region","value":"value"}` |
| `list` | stretch: "region" repeats (3 different values in 24 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 24 rows: this chart crowds past about 20. | different | Answers a different question: better for ranking, top to bottom and exact values and lookup, but gives up how values spread. | `{"type":"list","label":"region","value":"value"}` |
| `pareto` | stretch: "region" repeats (3 different values in 24 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for ranking, top to bottom and what drives or moves a total, but gives up how values spread. | `{"type":"pareto","label":"region","value":"value"}` |
| `treemap` | stretch: "region" repeats (3 different values in 24 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up how values spread. | `{"type":"treemap","label":"region","value":"value","group":"region"}` |
| `area` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. "region" repeats (3 different values in 24 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"area","x":"region","y":"value"}` |
| `bar` | stretch: "region" repeats (3 different values in 24 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 24 rows: this chart crowds past about 16. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"bar","x":"region","y":"value"}` |
| `donut` | stretch: "region" repeats (3 different values in 24 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 24 rows: this chart crowds past about 6. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"donut","label":"region","value":"value"}` |
| `dot` | stretch: "region" repeats (3 different values in 24 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"dot","label":"region","value":"value"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 24 rows. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"gauge","value":"value"}` |
| `horizon` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. "region" repeats (3 different values in 24 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"horizon","x":"region","y":"value"}` |
| `line` | stretch: x expects dates; "region" is text, so its rows are drawn in the order given. "region" repeats (3 different values in 24 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"line","x":"region","y":"value"}` |
| `pie` | stretch: "region" repeats (3 different values in 24 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 24 rows: this chart crowds past about 6. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"pie","label":"region","value":"value"}` |
| `radar` | stretch: "region" repeats (3 different values in 24 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 24 rows: this chart crowds past about 12. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"radar","label":"region","y":"value"}` |
| `rose` | stretch: "region" repeats (3 different values in 24 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"rose","label":"region","y":"value"}` |
| `waffle` | stretch: "region" repeats (3 different values in 24 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 24 rows: this chart crowds past about 5. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"waffle","label":"region","value":"value"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `board` (It needs a stage or status column with a handful of values, and a name per row.); `bullet` (needs a separate column for target (it would reuse "value", already the value)); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "value", already the open)); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "value", already the y)); `dumbbell` (needs a separate column for to (it would reuse "value", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `meter` (needs a separate column for target (it would reuse "value", already the value)); `pyramid` (needs a separate column for right (it would reuse "value", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for status (it would reuse "region", already the label)); `rings` (needs a separate column for target (it would reuse "value", already the value)); `scatter` (needs a separate column for y (it would reuse "value", already the x)); `slope` (needs a separate column for to (it would reuse "value", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "value", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for state (it would reuse "region", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
