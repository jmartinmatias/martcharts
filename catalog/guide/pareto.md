# `pareto` chart

The 80/20 view: categories sorted largest first as bars of their share of the total, a line through the running total, and a dashed line at the threshold. Bars up to the crossing (the vital few) stay in color. One percent axis, no second scale. For causes of tickets, defects or churn.

## What it is for

- What drives or moves a total: best
- Ranking, top to bottom: best
- Share of one whole: good

**Best for**

- The few causes behind most of a total: ticket causes, defects, returns, costs
- Deciding where to act first

**Least useful for**

- Time order (use bar)
- Fewer than four categories
- Negative values

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: Rows sorted largest first as bars of their share of the total, a line through the running total and a dashed line at the threshold (80% by default).

**Rows it reads well with**: 4 to 25.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each category. |
| `value` | number | yes | Field with each category's count or amount. Zero and negative values are left out. |

## This example's columns (2 columns, 8 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `cause` | category | `label` | 8 different, e.g. "Login problems", "Billing questions", "Slow pages" |
| `tickets` (Tickets) | number | `value` | 26 to 412 |

## The data drawing it now

| cause | tickets |
| --- | --- |
| Login problems | 412 |
| Billing questions | 286 |
| Slow pages | 198 |
| Integrations | 121 |
| Exports | 77 |
| Notifications | 52 |
| Permissions | 38 |
| Other | 26 |

As CSV:

```csv
cause,tickets
Login problems,412
Billing questions,286
Slow pages,198
Integrations,121
Exports,77
Notifications,52
Permissions,38
Other,26
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "ticket-causes",
  "title": "What drives support tickets",
  "subtitle": "Q3 2026, by cause, with the running total",
  "description": "Tickets by cause, largest first. Four causes make up over 80% of the volume: fix those first.",
  "note": "{sum:tickets} tickets",
  "source": {
    "name": "Helpdesk"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "cause": "Login problems",
        "tickets": 412
      },
      {
        "cause": "Billing questions",
        "tickets": 286
      },
      {
        "cause": "Slow pages",
        "tickets": 198
      }
    ]
  },
  "fields": {
    "tickets": {
      "label": "Tickets",
      "format": {
        "type": "number"
      }
    },
    "cause": {}
  },
  "view": {
    "type": "pareto",
    "label": "cause",
    "value": "tickets"
  },
  "i18n": {
    "fr": {
      "title": "Ce qui génère les tickets",
      "subtitle": "T3 2026, par cause, avec le cumul",
      "description": "Tickets par cause, la plus grande d'abord. Quatre causes font plus de 80 % du volume : à traiter en premier.",
      "source": {
        "name": "Support client"
      },
      "fields": {
        "cause": {
          "values": {
            "Login problems": "Problèmes de connexion",
            "Billing questions": "Questions de facturation",
            "Slow pages": "Pages lentes",
            "Integrations": "Intégrations",
            "Exports": "Exports",
            "Notifications": "Notifications",
            "Permissions": "Droits d'accès",
            "Other": "Autres"
          }
        }
      }
    },
    "de": {
      "title": "Was Support-Tickets auslöst",
      "subtitle": "Q3 2026, nach Ursache, mit laufender Summe",
      "description": "Tickets nach Ursache, größte zuerst. Vier Ursachen machen über 80 % aus: die zuerst beheben.",
      "note": "{sum:tickets} Tickets",
      "fields": {
        "cause": {
          "values": {
            "Login problems": "Anmeldeprobleme",
            "Billing questions": "Abrechnungsfragen",
            "Slow pages": "Langsame Seiten",
            "Integrations": "Integrationen",
            "Exports": "Exporte",
            "Notifications": "Benachrichtigungen",
            "Permissions": "Berechtigungen",
            "Other": "Sonstige"
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
| `bar` | fits | different | Answers a different question: better for comparing amounts across categories and trend over time, but gives up what drives or moves a total. | `{"type":"bar","x":"cause","y":"tickets"}` |
| `treemap` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up ranking, top to bottom and what drives or moves a total. | `{"type":"treemap","label":"cause","value":"tickets"}` |
| `funnel` | fits | different | Answers a different question: better for conversion through ordered steps, but gives up ranking, top to bottom and what drives or moves a total. | `{"type":"funnel","label":"cause","value":"tickets"}` |
| `hbar` | fits | different | Answers a different question: better for comparing amounts across categories, but gives up what drives or moves a total. Drops the running total: simpler, but the 80/20 point is gone. | `{"type":"hbar","label":"cause","value":"tickets"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup, but gives up what drives or moves a total. | `{"type":"list","label":"cause","value":"tickets"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up ranking, top to bottom and what drives or moves a total. | `{"type":"table"}` |
| `dot` | fits | worse | Gives up what drives or moves a total, and this data gives it nothing better to do. | `{"type":"dot","label":"cause","value":"tickets"}` |
| `icicle` | fits | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"icicle","levels":"cause","value":"tickets"}` |
| `kpi` | fits | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"kpi","value":"tickets"}` |
| `kpis` | fits | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"tickets"}]}` |
| `radar` | fits | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"radar","label":"cause","y":"tickets"}` |
| `rose` | fits | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"rose","label":"cause","y":"tickets"}` |
| `sunburst` | fits | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"cause","value":"tickets"}` |
| `area` | stretch: x expects dates; "cause" is text, so its rows are drawn in the order given. | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"area","x":"cause","y":"tickets"}` |
| `beeswarm` | stretch: 8 rows: this chart says little with fewer than 10. | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"tickets","label":"cause"}` |
| `boxplot` | stretch: 8 rows: this chart says little with fewer than 15. | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"boxplot","value":"tickets"}` |
| `donut` | stretch: 8 rows: this chart crowds past about 6. | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"donut","label":"cause","value":"tickets"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 8 rows. | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"gauge","value":"tickets"}` |
| `histogram` | stretch: 8 rows: this chart says little with fewer than 20. | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"histogram","value":"tickets"}` |
| `horizon` | stretch: x expects dates; "cause" is text, so its rows are drawn in the order given. 8 rows: this chart says little with fewer than 10. | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"horizon","x":"cause","y":"tickets"}` |
| `line` | stretch: x expects dates; "cause" is text, so its rows are drawn in the order given. | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"line","x":"cause","y":"tickets"}` |
| `pie` | stretch: 8 rows: this chart crowds past about 6. | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"pie","label":"cause","value":"tickets"}` |
| `ridgeline` | stretch: 8 rows: this chart says little with fewer than 20. | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"tickets","group":"cause"}` |
| `waffle` | stretch: 8 rows: this chart crowds past about 5. | worse | Gives up ranking, top to bottom and what drives or moves a total, and this data gives it nothing better to do. | `{"type":"waffle","label":"cause","value":"tickets"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "cause", already the x)); `board` (needs a separate column for stage (it would reuse "cause", already the label)); `bullet` (needs a separate column for target (it would reuse "tickets", already the value)); `bump` (needs a separate column for series (it would reuse "cause", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "tickets", already the open)); `chord` (needs a separate column for target (it would reuse "cause", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "tickets", already the y)); `dumbbell` (needs a separate column for to (it would reuse "tickets", already the from)); `heatmap` (needs a separate column for y (it would reuse "cause", already the x)); `history` (needs a separate column for title (it would reuse "cause", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "cause", already the x)); `matrix` (needs a separate column for y (it would reuse "cause", already the x)); `meter` (needs a separate column for target (it would reuse "tickets", already the value)); `pyramid` (needs a separate column for right (it would reuse "tickets", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "cause", already the label)); `rings` (needs a separate column for target (it would reuse "tickets", already the value)); `sankey` (needs a separate column for target (it would reuse "cause", already the source)); `scatter` (needs a separate column for y (it would reuse "tickets", already the x)); `slope` (needs a separate column for to (it would reuse "tickets", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "tickets", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "cause", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
