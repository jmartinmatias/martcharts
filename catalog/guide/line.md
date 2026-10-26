# `line` chart

Lines showing change over an ordered axis, usually time. Several y fields draw several lines.

## What it is for

- Trend over time: best
- Comparing amounts across categories: good
- Actual against target or plan: good

**Best for**

- Change over time: revenue, users, cost by month
- Several series compared over time
- Progress against a target or a forecast

**Least useful for**

- Categories with no order (use bar)
- Share of a whole (use donut or area stacked)
- Only two points in time (use slope)

## The data it needs

**One row is**: One row per point in time, in order.

**How the chart is built**: One point per row at x (in order) and y, joined; each y field is one series, and reference lines mark targets.

**Rows it reads well with**: 3 to 1000.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `x` | date | yes | Field for the ordered axis, usually a date or period. |
| `y` | number (one or more) | yes | Field or fields for line values. Each field is one series. |
| `forecast` | category |  | Field that is true on forecast rows. From the last actual on, lines draw dashed in a softly shaded zone labelled Forecast, and the tooltip marks those rows. |

## This example's columns (4 columns, 12 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `month` (Month) | date | `x` | 12 different, e.g. "2025-10", "2025-11", "2025-12" |
| `revenue` (Revenue) | number | `y` | 820000 to 1284000 |
| `cost` (Cost) | number | `y` | 610000 to 860000 |
| `target` | number | not drawn | 850000 to 1200000 |

## The data drawing it now

| month | revenue | cost | target |
| --- | --- | --- | --- |
| 2025-10 | 820000 | 610000 | 850000 |
| 2025-11 | 860000 | 640000 | 870000 |
| 2025-12 | 910000 | 660000 | 900000 |
| 2026-01 | 870000 | 650000 | 900000 |
| 2026-02 | 900000 | 655000 | 920000 |
| 2026-03 | 960000 | 690000 | 950000 |
| 2026-04 | 1010000 | 720000 | 980000 |
| 2026-05 | 980000 | 700000 | 1000000 |
| 2026-06 | 1050000 | 740000 | 1030000 |
| 2026-07 | 1120000 | 780000 | 1080000 |
| 2026-08 | 1142000 | 790000 | 1120000 |
| 2026-09 | 1284000 | 860000 | 1200000 |

As CSV:

```csv
month,revenue,cost,target
2025-10,820000,610000,850000
2025-11,860000,640000,870000
2025-12,910000,660000,900000
2026-01,870000,650000,900000
2026-02,900000,655000,920000
2026-03,960000,690000,950000
2026-04,1010000,720000,980000
2026-05,980000,700000,1000000
2026-06,1050000,740000,1030000
2026-07,1120000,780000,1080000
2026-08,1142000,790000,1120000
2026-09,1284000,860000,1200000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "monthly-revenue",
  "title": "Revenue and cost",
  "subtitle": "{first:month} to {last:month}",
  "description": "Monthly revenue and cost trend from the finance ledger.",
  "source": {
    "name": "Finance ledger"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "month": "2025-10",
        "revenue": 820000,
        "cost": 610000,
        "target": 850000
      },
      {
        "month": "2025-11",
        "revenue": 860000,
        "cost": 640000,
        "target": 870000
      },
      {
        "month": "2025-12",
        "revenue": 910000,
        "cost": 660000,
        "target": 900000
      }
    ]
  },
  "fields": {
    "month": {
      "label": "Month",
      "format": {
        "type": "date",
        "style": "month"
      }
    },
    "revenue": {
      "label": "Revenue",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "decimals": 0
      }
    },
    "cost": {
      "label": "Cost",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "decimals": 0
      }
    }
  },
  "headline": {
    "value": "revenue",
    "compare": "previous",
    "compareLabel": "vs Aug",
    "caption": "revenue in {last:month}"
  },
  "view": {
    "type": "line",
    "x": "month",
    "y": [
      "revenue",
      "cost"
    ],
    "reference": [
      {
        "field": "target",
        "agg": "last",
        "label": "Target"
      }
    ]
  },
  "i18n": {
    "fr": {
      "title": "CA et coûts",
      "subtitle": "{first:month} à {last:month}",
      "description": "Tendance mensuelle du CA et des coûts, issue du grand livre.",
      "source": {
        "name": "Grand livre"
      },
      "fields": {
        "month": {
          "label": "Mois"
        },
        "revenue": {
          "label": "Chiffre d'affaires"
        },
        "cost": {
          "label": "Coût"
        }
      },
      "headline": {
        "compareLabel": "vs août",
        "caption": "CA de {last:month}"
      },
      "view": {
        "reference": [
          {
            "label": "Objectif"
          }
        ]
      }
    },
    "de": {
      "title": "Umsatz und Kosten",
      "subtitle": "{first:month} bis {last:month}",
      "description": "Monatlicher Umsatz- und Kostentrend aus dem Hauptbuch.",
      "source": {
        "name": "Hauptbuch"
      },
      "fields": {
        "month": {
          "label": "Monat"
        },
        "revenue": {
          "label": "Umsatz"
        },
        "cost": {
          "label": "Kosten"
        }
      },
      "headline": {
        "compareLabel": "ggü. Aug.",
        "caption": "Umsatz im {last:month}"
      },
      "view": {
        "reference": [
          {
            "label": "Ziel"
          }
        ]
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `area` | fits | better | Better for how each group or period splits, and still good for trend over time. The fill stresses the amount, which suits volumes like cash or traffic; with crossing series, the fills hide each other. | `{"type":"area","x":"month","y":["revenue","cost"]}` |
| `horizon` | fits | same | Keeps the job (trend over time) with a different look. Fits many more series in the same height; readers need a moment to learn the color bands. | `{"type":"horizon","x":"month","y":["revenue","cost"]}` |
| `bar` | fits | trade-off | Better for ranking, top to bottom and how each group or period splits; weaker for trend over time. Better when each period's total matters on its own (monthly sales); worse for seeing the trend. | `{"type":"bar","x":"month","y":["revenue","cost"]}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up trend over time. | `{"type":"hbar","label":"month","value":["revenue","cost"]}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up trend over time. | `{"type":"list","label":"month"}` |
| `kpi` | fits | different | Answers a different question: better for a headline number, but gives up trend over time. | `{"type":"kpi","value":"revenue","x":"month"}` |
| `scatter` | fits | different | Answers a different question: better for how two measures relate, but gives up trend over time. | `{"type":"scatter","x":"revenue","y":"cost"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up trend over time. | `{"type":"table"}` |
| `beeswarm` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"revenue"}` |
| `dot` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"dot","label":"month","value":["revenue","cost"]}` |
| `icicle` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"icicle","levels":"month","value":"revenue"}` |
| `kpis` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"revenue"},{"value":"cost"},{"value":"target"}]}` |
| `pareto` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"pareto","label":"month","value":"revenue"}` |
| `radar` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"radar","label":"month","y":["revenue","cost"]}` |
| `rose` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"rose","label":"month","y":["revenue","cost"]}` |
| `sunburst` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"month","value":"revenue"}` |
| `treemap` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"treemap","label":"month","value":"revenue"}` |
| `boxplot` | stretch: 12 rows: this chart says little with fewer than 15. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"boxplot","value":"revenue"}` |
| `calendar` | stretch: 12 rows: this chart says little with fewer than 28. | worse | Weaker for trend over time, with nothing gained for this data. | `{"type":"calendar","date":"month","value":"revenue"}` |
| `donut` | stretch: 12 rows: this chart crowds past about 6. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"donut","label":"month","value":"revenue"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 12 rows. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"gauge","value":"revenue"}` |
| `histogram` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"histogram","value":"revenue"}` |
| `pie` | stretch: 12 rows: this chart crowds past about 6. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"pie","label":"month","value":"revenue"}` |
| `ridgeline` | stretch: 12 rows: this chart says little with fewer than 20. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"revenue","group":"month"}` |
| `waffle` | stretch: 12 rows: this chart crowds past about 5. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"waffle","label":"month","value":"revenue"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "month", already the x)); `board` (needs a separate column for stage (it would reuse "month", already the label)); `bullet` (It needs a target, plan or budget column.); `bump` (needs a separate column for series (it would reuse "month", already the x)); `candlestick` (needs a separate column for close (it would reuse "revenue", already the open)); `chord` (needs a separate column for target (it would reuse "month", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "month", already the x)); `history` (needs a separate column for title (it would reuse "month", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "month", already the x)); `matrix` (needs a separate column for y (it would reuse "month", already the x)); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "month", already the label)); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "month", already the source)); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a separate column for start (it would reuse "month", already the label)); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "month", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
