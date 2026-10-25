# `history` chart

A client's story as a vertical timeline: one event per row with its date, title, an optional second line and an amount, newest first, a dot per event colored by kind with a key, and the month written wherever it changes. With a group field, one list per client under its own heading. For meetings, calls, trades, campaigns and complaints in one scroll.

## What it is for

- Schedules and plans: best
- Exact values and lookup: good
- Trend over time: possible

**Best for**

- A client's story: meetings, calls, trades, campaigns and complaints in one scroll
- What happened before a churn, a complaint or a big trade
- Several clients' recent activity side by side

**Least useful for**

- Amounts over time, where the shape matters (use line)
- Tasks with a start and an end (use timeline)
- Counting events per period (use bar or calendar)

## The data it needs

**One row is**: One row per thing measured (a deal, a ticket, a response); the chart counts or spreads them.

**How the chart is built**: One event per row sorted by date, newest first, each a dot colored by kind on a vertical rail with its date, title, note and amount; the month is written where it changes, and a group field makes one rail per value.

**Rows it reads well with**: 3 to 400.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `date` | date | yes | Field with when the event happened. |
| `title` | category | yes | Field with the event in a few words. |
| `kind` | category |  | Field with the kind of event (Meeting, Call, Trade); each kind takes a color and a letter, keyed. |
| `note` | category |  | Field with a second, smaller line under the title. |
| `amount` | number |  | Field with an amount to write at the right of the event, where there is one. |
| `group` | category |  | Field that splits the events into one list per value (one per client), each under its own heading. |

## This example's columns (5 columns, 15 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `date` (Date) | date | `date` | 15 different, e.g. "2026-10-21", "2026-10-03", "2026-09-17" |
| `title` (Event) | category | `title` | 15 different, e.g. "Quarterly check-in call", "Bought EUR corporate bond ladder", "Discretionary mandate campaign opened" |
| `kind` (Kind) | category | `kind` | 8 different, e.g. "Call", "Trade", "Campaign" |
| `note` (Note) | category | `note` | 11 different, e.g. "CFO asked about lending terms for the warehouse purchase; sent the term sheet the same day.", "Three tranches, 2028 to 2032.", "Opened the mailing twice; no reply yet." |
| `amount` (Amount) | number | `amount` | -1100000 to 2400000 |

## The data drawing it now

| date | title | kind | note | amount |
| --- | --- | --- | --- | --- |
| 2026-10-21 | Quarterly check-in call | Call | CFO asked about lending terms for the warehouse purchase; sent the term sheet the same day. |  |
| 2026-10-03 | Bought EUR corporate bond ladder | Trade | Three tranches, 2028 to 2032. | 2400000 |
| 2026-09-17 | Discretionary mandate campaign opened | Campaign | Opened the mailing twice; no reply yet. |  |
| 2026-09-02 | Custody fees invoiced | Payment |  | 46000 |
| 2026-08-12 | FX spread queried on USD payment | Complaint | Resolved with a goodwill credit; pricing review promised before renewal. | -1800 |
| 2026-07-19 | Annual review with the board | Meeting | Agreed to revisit the treasury policy; board wants a lower cash balance. |  |
| 2026-06-30 | Sold short-dated T-bills | Trade |  | -1100000 |
| 2026-06-05 | Lending enquiry: warehouse purchase | Call | Indicative appetite given; awaiting valuation. |  |
| 2026-05-14 | KYC refresh completed | Review |  |  |
| 2026-03-20 | FX hedging workshop | Meeting | Treasurer and two analysts attended. |  |
| 2026-03-03 | Advisory fees invoiced | Payment |  | 24000 |
| 2026-01-15 | Rolled USD forward hedges | Trade | Six months, same notional. | 850000 |
| 2025-11-28 | Year-end structured notes offer | Campaign | Declined: no appetite for equity-linked notes. |  |
| 2025-09-09 | Onboarding of the treasury team | Meeting | Platform training for three users. |  |
| 2025-08-22 | Account opened | Onboarding | Custody and advisory mandates signed. |  |

As CSV:

```csv
date,title,kind,note,amount
2026-10-21,Quarterly check-in call,Call,CFO asked about lending terms for the warehouse purchase; sent the term sheet the same day.,
2026-10-03,Bought EUR corporate bond ladder,Trade,"Three tranches, 2028 to 2032.",2400000
2026-09-17,Discretionary mandate campaign opened,Campaign,Opened the mailing twice; no reply yet.,
2026-09-02,Custody fees invoiced,Payment,,46000
2026-08-12,FX spread queried on USD payment,Complaint,Resolved with a goodwill credit; pricing review promised before renewal.,-1800
2026-07-19,Annual review with the board,Meeting,Agreed to revisit the treasury policy; board wants a lower cash balance.,
2026-06-30,Sold short-dated T-bills,Trade,,-1100000
2026-06-05,Lending enquiry: warehouse purchase,Call,Indicative appetite given; awaiting valuation.,
2026-05-14,KYC refresh completed,Review,,
2026-03-20,FX hedging workshop,Meeting,Treasurer and two analysts attended.,
2026-03-03,Advisory fees invoiced,Payment,,24000
2026-01-15,Rolled USD forward hedges,Trade,"Six months, same notional.",850000
2025-11-28,Year-end structured notes offer,Campaign,Declined: no appetite for equity-linked notes.,
2025-09-09,Onboarding of the treasury team,Meeting,Platform training for three users.,
2025-08-22,Account opened,Onboarding,Custody and advisory mandates signed.,
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "client-history",
  "title": "Aldana Holdings, the story so far",
  "subtitle": "Every touchpoint since onboarding",
  "description": "A client's events as a vertical timeline, newest first: meetings, calls, trades, campaigns and complaints, each in its own color, with the amount where there is one.",
  "source": {
    "name": "CRM activity log (fictional)"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "date": "2026-10-21",
        "kind": "Call",
        "title": "Quarterly check-in call",
        "note": "CFO asked about lending terms for the warehouse purchase; sent the term sheet the same day.",
        "amount": null
      },
      {
        "date": "2026-10-03",
        "kind": "Trade",
        "title": "Bought EUR corporate bond ladder",
        "note": "Three tranches, 2028 to 2032.",
        "amount": 2400000
      },
      {
        "date": "2026-09-17",
        "kind": "Campaign",
        "title": "Discretionary mandate campaign opened",
        "note": "Opened the mailing twice; no reply yet.",
        "amount": null
      }
    ]
  },
  "fields": {
    "date": {
      "label": "Date"
    },
    "kind": {
      "label": "Kind"
    },
    "title": {
      "label": "Event"
    },
    "note": {
      "label": "Note"
    },
    "amount": {
      "label": "Amount",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    }
  },
  "view": {
    "type": "history",
    "date": "date",
    "title": "title",
    "kind": "kind",
    "note": "note",
    "amount": "amount",
    "limit": 12
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `list` | fits | different | Answers a different question: better for ranking, top to bottom and exact values and lookup, but gives up schedules and plans. | `{"type":"list","label":"title"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up schedules and plans. Sortable and searchable; the sense of a story in time is weaker. | `{"type":"table"}` |

Not possible with this data: `anomalies` (needs a number column for value, and there is none left); `area` (needs a number column for y, and there is none left); `bar` (needs a number column for y, and there is none left); `beeswarm` (needs a number column for value, and there is none left); `board` (It needs a stage or status column with a handful of values, and a name per row.); `boxplot` (needs a number column for value, and there is none left); `bullet` (needs a number column for value, and there is none left); `bump` (needs a number column for value, and there is none left); `calendar` (needs a number column for value, and there is none left); `candlestick` (needs a number column for open, and there is none left); `chord` (needs a number column for value, and there is none left); `choropleth` (needs a column of country or state codes that sit on a basemap); `donut` (needs a number column for value, and there is none left); `dot` (needs a number column for value, and there is none left); `dual` (needs a number column for y, and there is none left); `dumbbell` (needs a number column for from, and there is none left); `funnel` (needs a number column for value, and there is none left); `gauge` (needs a number column for value, and there is none left); `hbar` (needs a number column for value, and there is none left); `heatmap` (needs a number column for value, and there is none left); `histogram` (needs a number column for value, and there is none left); `horizon` (needs a number column for y, and there is none left); `icicle` (needs a number column for value, and there is none left); `kpi` (needs a number column for value, and there is none left); `kpis` (view: items needs at least one entry.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (needs a number column for value, and there is none left); `line` (needs a number column for y, and there is none left); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a number column for value, and there is none left); `matrix` (It needs one row per pair of two categories, such as topic and quarter.); `meter` (needs a number column for value, and there is none left); `pareto` (needs a number column for value, and there is none left); `pie` (needs a number column for value, and there is none left); `pyramid` (needs a number column for left, and there is none left); `radar` (needs a number column for y, and there is none left); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (It needs one status (R, A, G) per entity per period.); `ridgeline` (needs a number column for value, and there is none left); `rings` (needs a number column for value, and there is none left); `rose` (needs a number column for y, and there is none left); `sankey` (needs a number column for value, and there is none left); `scatter` (needs a number column for x, and there is none left); `slope` (needs a number column for from, and there is none left); `strips` (needs a number column for value, and there is none left); `sunburst` (needs a number column for value, and there is none left); `symbols` (needs a number column for size, and there is none left); `timeline` (It needs tasks with a start date.); `treemap` (needs a number column for value, and there is none left); `variance` (needs a number column for value, and there is none left); `waffle` (needs a number column for value, and there is none left); `waterfall` (needs a number column for value, and there is none left); `whitespace` (It needs one row per client and product with a state: held, an opportunity, or not eligible.); `xray` (view: An x-ray needs something to show besides the name: facts, holdings, wallet or trend.).
