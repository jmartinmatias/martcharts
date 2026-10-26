# `histogram` chart

A distribution as touching bars: the value's range is cut into bins on round edges, and each bar counts the rows in its bin. A dashed line marks the median. For how deal sizes, order values or response times spread.

## What it is for

- How values spread: best

**Best for**

- The shape of one measure: deal sizes, response times, order values
- Skew, clusters and the typical range

**Least useful for**

- Comparing groups (use boxplot or ridgeline)
- Fewer than about 20 values (use beeswarm)
- Totals

## The data it needs

**One row is**: One row per thing measured (a deal, a ticket, a response); the chart counts or spreads them.

**How the chart is built**: The range of value is cut into bins on round edges; each bar counts the rows in its bin.

**Rows it reads well with**: 20 to any number.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `value` | number | yes | Numeric field to bin. |

## This example's columns (3 columns, 24 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `value` (Deal value) | number | `value` | 22000 to 180000 |
| `deal` | category | not drawn | 24 different, e.g. "North deal 1", "North deal 2", "North deal 3" |
| `region` (Region) | category | not drawn | 3 different, e.g. "North", "South", "East" |

## The data drawing it now

| value | deal | region |
| --- | --- | --- |
| 42000 | North deal 1 | North |
| 55000 | North deal 2 | North |
| 61000 | North deal 3 | North |
| 48000 | North deal 4 | North |
| 70000 | North deal 5 | North |
| 95000 | North deal 6 | North |
| 38000 | North deal 7 | North |
| 52000 | North deal 8 | North |
| 22000 | South deal 9 | South |
| 31000 | South deal 10 | South |
| 28000 | South deal 11 | South |
| 35000 | South deal 12 | South |
| 40000 | South deal 13 | South |
| 26000 | South deal 14 | South |
| 33000 | South deal 15 | South |
| 180000 | South deal 16 | South |
| 88000 | East deal 17 | East |
| 120000 | East deal 18 | East |
| 140000 | East deal 19 | East |
| 96000 | East deal 20 | East |
| 110000 | East deal 21 | East |
| 135000 | East deal 22 | East |
| 105000 | East deal 23 | East |
| 150000 | East deal 24 | East |

As CSV:

```csv
value,deal,region
42000,North deal 1,North
55000,North deal 2,North
61000,North deal 3,North
48000,North deal 4,North
70000,North deal 5,North
95000,North deal 6,North
38000,North deal 7,North
52000,North deal 8,North
22000,South deal 9,South
31000,South deal 10,South
28000,South deal 11,South
35000,South deal 12,South
40000,South deal 13,South
26000,South deal 14,South
33000,South deal 15,South
180000,South deal 16,South
88000,East deal 17,East
120000,East deal 18,East
140000,East deal 19,East
96000,East deal 20,East
110000,East deal 21,East
135000,East deal 22,East
105000,East deal 23,East
150000,East deal 24,East
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "deal-histogram",
  "title": "Deal sizes",
  "subtitle": "Closed this half, in €20K bands",
  "description": "How many deals fall in each value band, with the median marked. Half the deals sit under €60K; a long tail runs to €180K.",
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
    "type": "histogram",
    "value": "value",
    "bins": 9,
    "countLabel": "Deals"
  },
  "i18n": {
    "fr": {
      "title": "Taille des affaires",
      "subtitle": "Conclues ce semestre, tranches de 20 K€",
      "description": "Combien d'affaires par tranche de valeur, la médiane marquée. La moitié est sous 60 K€ ; une longue traîne va jusqu'à 180 K€.",
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
      "title": "Dealgrößen",
      "subtitle": "In diesem Halbjahr abgeschlossen, 20.000-€-Bänder",
      "description": "Wie viele Deals in jedes Wertband fallen, mit markiertem Median. Die Hälfte liegt unter 60.000 €; ein langer Schwanz reicht bis 180.000 €.",
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
| `boxplot` | fits | better | Better for comparing amounts across categories, and still good for how values spread. Summarizes the spread in five numbers and outliers; the shape is lost. | `{"type":"boxplot","value":"value"}` |
| `beeswarm` | fits | same | Keeps the job (how values spread) with a different look. | `{"type":"beeswarm","value":"value"}` |
| `ridgeline` | fits | same | Keeps the job (how values spread) with a different look. | `{"type":"ridgeline","value":"value","group":"deal"}` |
| `hbar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up how values spread. | `{"type":"hbar","label":"deal","value":"value"}` |
| `icicle` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up how values spread. | `{"type":"icicle","levels":["deal","region"],"value":"value"}` |
| `matrix` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle and comparing amounts across categories, but gives up how values spread. | `{"type":"matrix","x":"deal","y":"region"}` |
| `pareto` | fits | different | Answers a different question: better for ranking, top to bottom and what drives or moves a total, but gives up how values spread. | `{"type":"pareto","label":"deal","value":"value"}` |
| `sunburst` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up how values spread. | `{"type":"sunburst","levels":["deal","region"],"value":"value"}` |
| `treemap` | fits | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up how values spread. | `{"type":"treemap","label":"deal","value":"value"}` |
| `heatmap` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up how values spread. | `{"type":"heatmap","x":"deal","y":"region","value":"value"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up how values spread. | `{"type":"sankey","source":"deal","target":"region","value":"value"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up how values spread. | `{"type":"table"}` |
| `dot` | fits | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"dot","label":"deal","value":"value"}` |
| `kpi` | fits | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"kpi","value":"value"}` |
| `kpis` | fits | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"value"}]}` |
| `marimekko` | fits | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"marimekko","x":"deal","series":"region","value":"value"}` |
| `rose` | fits | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"rose","label":"deal","y":"value"}` |
| `list` | stretch: 24 rows: this chart crowds past about 20. | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up how values spread. | `{"type":"list","label":"deal","value":"value"}` |
| `area` | stretch: x expects dates; "deal" is text, so its rows are drawn in the order given. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"area","x":"deal","y":"value"}` |
| `bar` | stretch: 24 rows: this chart crowds past about 16. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"bar","x":"deal","y":"value"}` |
| `donut` | stretch: 24 rows: this chart crowds past about 6. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"donut","label":"deal","value":"value"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 24 rows. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"gauge","value":"value"}` |
| `horizon` | stretch: x expects dates; "deal" is text, so its rows are drawn in the order given. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"horizon","x":"deal","y":"value"}` |
| `line` | stretch: x expects dates; "deal" is text, so its rows are drawn in the order given. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"line","x":"deal","y":"value"}` |
| `pie` | stretch: 24 rows: this chart crowds past about 6. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"pie","label":"deal","value":"value"}` |
| `radar` | stretch: 24 rows: this chart crowds past about 12. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"radar","label":"deal","y":"value"}` |
| `waffle` | stretch: 24 rows: this chart crowds past about 5. | worse | Gives up how values spread, and this data gives it nothing better to do. | `{"type":"waffle","label":"deal","value":"value"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `board` (It needs a stage or status column with a handful of values, and a name per row.); `bullet` (needs a separate column for target (it would reuse "value", already the value)); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "value", already the open)); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "value", already the y)); `dumbbell` (needs a separate column for to (it would reuse "value", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `meter` (needs a separate column for target (it would reuse "value", already the value)); `pyramid` (needs a separate column for right (it would reuse "value", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for status (it would reuse "deal", already the label)); `rings` (needs a separate column for target (it would reuse "value", already the value)); `scatter` (needs a separate column for y (it would reuse "value", already the x)); `slope` (needs a separate column for to (it would reuse "value", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "value", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for state (it would reuse "deal", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
