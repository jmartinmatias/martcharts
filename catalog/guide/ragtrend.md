# `ragtrend` chart

RAG status over time: one row per entity and one small mark per period, shaped and colored by its status (a filled circle On track, a triangle At risk, a square Off track). A tick marks each period where the status changed, and the note of why it moved sits in the tooltip; the current status ends the row as a pill. Rows come worst-current first.

## What it is for

- Change between two points: best
- Trend over time: good
- Actual against target or plan: possible

**Best for**

- How each client's or deal's status moved, review by review
- Spotting who slipped recently, and reading why
- Monthly or quarterly RAG reporting with a history

**Least useful for**

- Several dimensions at one moment (use ragboard)
- Numbers rather than statuses (use line or horizon)
- More than about 24 periods (roll them up)

## The data it needs

**One row is**: One row per combination of two categories, such as month and product.

**How the chart is built**: One row per entity and one cell per period with its status as a shape, a tick where the status changed, the note of why in the tooltip, and the current status as a pill at the end; rows worst-current first.

**Rows it reads well with**: 6 to 600.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each row: the client, the relationship manager or the deal. |
| `period` | date | yes | Field with each row's period: a month, a quarter or a review date, in order. |
| `status` | category | yes | Field with the status in that period: R, A, G or N (or red, amber, green, grey). |
| `note` | category |  | Field saying why the status moved, shown in the tooltip of the period where it changed. |

## This example's columns (4 columns, 42 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `client` (Client) | category | `label` | 7 different, e.g. "Aldana Holdings", "Dr. M. Keller", "Brivio & Figli" |
| `month` (Month) | date | `period` | 6 different, e.g. "2026-05", "2026-06", "2026-07" |
| `status` (Status) | category | `status` | 3 different, e.g. "G", "A", "R" |
| `why` (Why it moved) | category | `note` | 15 different, e.g. "", "FX spread queried on USD payments", "No meeting in 94 days; lending request open" |

## The data drawing it now

| client | month | status | why |
| --- | --- | --- | --- |
| Aldana Holdings | 2026-05 | G |  |
| Aldana Holdings | 2026-06 | G |  |
| Aldana Holdings | 2026-07 | A | FX spread queried on USD payments |
| Aldana Holdings | 2026-08 | A |  |
| Aldana Holdings | 2026-09 | A |  |
| Aldana Holdings | 2026-10 | R | No meeting in 94 days; lending request open |
| Dr. M. Keller | 2026-05 | G |  |
| Dr. M. Keller | 2026-06 | A | Fee complaint on custody |
| Dr. M. Keller | 2026-07 | A |  |
| Dr. M. Keller | 2026-08 | R | Complaint escalated to compliance |
| Dr. M. Keller | 2026-09 | A | Goodwill credit agreed |
| Dr. M. Keller | 2026-10 | R | Transfer request for half the portfolio |
| Brivio & Figli | 2026-05 | R |  |
| Brivio & Figli | 2026-06 | R |  |
| Brivio & Figli | 2026-07 | A | New CFO met, credit line renewed |
| Brivio & Figli | 2026-08 | A |  |
| Brivio & Figli | 2026-09 | A |  |
| Brivio & Figli | 2026-10 | A |  |
| Nordvik Pension Fund | 2026-05 | A |  |
| Nordvik Pension Fund | 2026-06 | A |  |
| Nordvik Pension Fund | 2026-07 | G | Mandate renewed for three years |
| Nordvik Pension Fund | 2026-08 | G |  |
| Nordvik Pension Fund | 2026-09 | G |  |
| Nordvik Pension Fund | 2026-10 | G |  |
| Famille Delcourt | 2026-05 | A |  |
| Famille Delcourt | 2026-06 | A |  |
| Famille Delcourt | 2026-07 | R | Relationship manager left; no successor met yet |
| Famille Delcourt | 2026-08 | R |  |
| Famille Delcourt | 2026-09 | R |  |
| Famille Delcourt | 2026-10 | A | Introductory meeting held |
| Hallström Capital | 2026-05 | G |  |
| Hallström Capital | 2026-06 | G |  |
| Hallström Capital | 2026-07 | G |  |
| Hallström Capital | 2026-08 | G |  |
| Hallström Capital | 2026-09 | A | Coverage gap over the summer |
| Hallström Capital | 2026-10 | G | Quarterly review held |
| Tejo Logistics | 2026-05 | G |  |
| Tejo Logistics | 2026-06 | G |  |
| Tejo Logistics | 2026-07 | G |  |
| Tejo Logistics | 2026-08 | A | Competitor bid on the cash pool |
| Tejo Logistics | 2026-09 | A |  |
| Tejo Logistics | 2026-10 | R | Cash pool moved to a competitor |

As CSV:

```csv
client,month,status,why
Aldana Holdings,2026-05,G,
Aldana Holdings,2026-06,G,
Aldana Holdings,2026-07,A,FX spread queried on USD payments
Aldana Holdings,2026-08,A,
Aldana Holdings,2026-09,A,
Aldana Holdings,2026-10,R,No meeting in 94 days; lending request open
Dr. M. Keller,2026-05,G,
Dr. M. Keller,2026-06,A,Fee complaint on custody
Dr. M. Keller,2026-07,A,
Dr. M. Keller,2026-08,R,Complaint escalated to compliance
Dr. M. Keller,2026-09,A,Goodwill credit agreed
Dr. M. Keller,2026-10,R,Transfer request for half the portfolio
Brivio & Figli,2026-05,R,
Brivio & Figli,2026-06,R,
Brivio & Figli,2026-07,A,"New CFO met, credit line renewed"
Brivio & Figli,2026-08,A,
Brivio & Figli,2026-09,A,
Brivio & Figli,2026-10,A,
Nordvik Pension Fund,2026-05,A,
Nordvik Pension Fund,2026-06,A,
Nordvik Pension Fund,2026-07,G,Mandate renewed for three years
Nordvik Pension Fund,2026-08,G,
Nordvik Pension Fund,2026-09,G,
Nordvik Pension Fund,2026-10,G,
Famille Delcourt,2026-05,A,
Famille Delcourt,2026-06,A,
Famille Delcourt,2026-07,R,Relationship manager left; no successor met yet
Famille Delcourt,2026-08,R,
Famille Delcourt,2026-09,R,
Famille Delcourt,2026-10,A,Introductory meeting held
Hallström Capital,2026-05,G,
Hallström Capital,2026-06,G,
Hallström Capital,2026-07,G,
Hallström Capital,2026-08,G,
Hallström Capital,2026-09,A,Coverage gap over the summer
Hallström Capital,2026-10,G,Quarterly review held
Tejo Logistics,2026-05,G,
Tejo Logistics,2026-06,G,
Tejo Logistics,2026-07,G,
Tejo Logistics,2026-08,A,Competitor bid on the cash pool
Tejo Logistics,2026-09,A,
Tejo Logistics,2026-10,R,Cash pool moved to a competitor
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "rag-status-trend",
  "title": "Client status, month by month",
  "subtitle": "Overall RAG at each monthly review, May to October 2026",
  "description": "Each key client's overall Red, Amber or Green status at every monthly review, with a note on why it moved, so the review starts with who slipped and why.",
  "footer": "Fictional clients for illustration",
  "source": {
    "name": "Client review (fictional)"
  },
  "locale": "en-GB",
  "data": {
    "type": "inline",
    "rows": [
      {
        "client": "Aldana Holdings",
        "month": "2026-05",
        "status": "G",
        "why": ""
      },
      {
        "client": "Aldana Holdings",
        "month": "2026-06",
        "status": "G",
        "why": ""
      },
      {
        "client": "Aldana Holdings",
        "month": "2026-07",
        "status": "A",
        "why": "FX spread queried on USD payments"
      }
    ]
  },
  "fields": {
    "client": {
      "label": "Client"
    },
    "month": {
      "label": "Month",
      "format": {
        "type": "date",
        "style": "month"
      }
    },
    "status": {
      "label": "Status"
    },
    "why": {
      "label": "Why it moved"
    }
  },
  "view": {
    "type": "ragtrend",
    "label": "client",
    "period": "month",
    "status": "status",
    "note": "why"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up change between two points. | `{"type":"table"}` |
| `list` | stretch: "client" repeats (7 different values in 42 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 42 rows: this chart crowds past about 20. | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up change between two points. | `{"type":"list","label":"client"}` |

Not possible with this data: `anomalies` (needs a number column for value, and there is none left); `area` (needs a number column for y, and there is none left); `bar` (needs a number column for y, and there is none left); `beeswarm` (needs a number column for value, and there is none left); `board` (It needs a stage or status column with a handful of values, and a name per row.); `boxplot` (needs a number column for value, and there is none left); `bullet` (needs a number column for value, and there is none left); `bump` (needs a number column for value, and there is none left); `calendar` (needs a number column for value, and there is none left); `candlestick` (needs a number column for open, and there is none left); `chord` (needs a number column for value, and there is none left); `choropleth` (needs a column of country or state codes that sit on a basemap); `donut` (needs a number column for value, and there is none left); `dot` (needs a number column for value, and there is none left); `dual` (needs a number column for y, and there is none left); `dumbbell` (needs a number column for from, and there is none left); `funnel` (needs a number column for value, and there is none left); `gauge` (needs a number column for value, and there is none left); `hbar` (needs a number column for value, and there is none left); `heatmap` (needs a number column for value, and there is none left); `histogram` (needs a number column for value, and there is none left); `history` (It needs dated events with a short title each.); `horizon` (needs a number column for y, and there is none left); `icicle` (needs a number column for value, and there is none left); `kpi` (needs a number column for value, and there is none left); `kpis` (view: items needs at least one entry.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (needs a number column for value, and there is none left); `line` (needs a number column for y, and there is none left); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a number column for value, and there is none left); `matrix` (It needs one row per pair of two categories, such as topic and quarter.); `meter` (needs a number column for value, and there is none left); `pareto` (needs a number column for value, and there is none left); `pie` (needs a number column for value, and there is none left); `pyramid` (needs a number column for left, and there is none left); `radar` (needs a number column for y, and there is none left); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ridgeline` (needs a number column for value, and there is none left); `rings` (needs a number column for value, and there is none left); `rose` (needs a number column for y, and there is none left); `sankey` (needs a number column for value, and there is none left); `scatter` (needs a number column for x, and there is none left); `slope` (needs a number column for from, and there is none left); `strips` (needs a number column for value, and there is none left); `sunburst` (needs a number column for value, and there is none left); `symbols` (needs a number column for size, and there is none left); `timeline` (It needs tasks with a start date.); `treemap` (needs a number column for value, and there is none left); `variance` (needs a number column for value, and there is none left); `waffle` (needs a number column for value, and there is none left); `waterfall` (needs a number column for value, and there is none left); `whitespace` (It needs one row per client and product with a state: held, an opportunity, or not eligible.); `xray` (view: An x-ray needs something to show besides the name: facts, holdings, wallet or trend.).
