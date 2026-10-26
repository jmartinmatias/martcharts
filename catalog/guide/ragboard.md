# `ragboard` chart

A RAG scorecard: one row per entity (a client, a relationship manager, a deal) and one Red, Amber or Green cell per dimension, worst first, with an overall column holding each row's worst status. Each status has its own shape and words (a filled circle On track, a triangle At risk, a square Off track), so it never rests on color. An arrow in a cell's corner says it improved or got worse since the last period; a strip above counts the statuses and a footer counts them per column.

## What it is for

- Actual against target or plan: best
- Exact values and lookup: good
- Comparing amounts across categories: possible

**Best for**

- A RAG scorecard: client health, coverage, pipeline and relationship status per client or per relationship manager
- Which accounts need action first, and on what
- Status reviews where each cell is a judgment, not an amount

**Least useful for**

- Amounts and trends (use table with heat cells, or line)
- One status over many periods (use ragtrend)
- More than about 40 rows (filter to the ones that need attention)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One row per data row and one cell per dimension holding its status (R, A, G or N) as a shape, an Overall column with the worst of them first, rows sorted worst first, a strip that counts the statuses above and a count per column below; a previous field per dimension adds a better or worse arrow.

**Rows it reads well with**: 2 to 40.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each row: the client, the relationship manager or the deal. |
| `dimensions` | category (one or more) | yes | Status fields, one column each, holding R, A, G or N (or red, amber, green, grey). The rag transform turns numbers into them. |
| `group` | category |  | Field that gathers rows under headings, such as segment or perspective. |
| `note` | category |  | Field written small under each name, such as the action owner or the next step. |

## This example's columns (11 columns, 10 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `client` (Client) | category | `label` | 10 different, e.g. "Aldana Holdings", "Nordvik Pension Fund", "Dr. M. Keller" |
| `success` (Client success) | category | `dimensions` | 3 different, e.g. "G", "R", "A" |
| `growth` (Business development) | category | `dimensions` | 3 different, e.g. "A", "G", "R" |
| `coverage` (Coverage) | category | `dimensions` | 3 different, e.g. "R", "G", "A" |
| `relationship` (Relationship) | category | `dimensions` | 3 different, e.g. "A", "G", "R" |
| `owner` | category | `note` | 10 different, e.g. "L. Vandermeer: renew FX pricing", "S. Okonkwo: board review on 12 Nov", "A. Romero: complaint closed, follow up" |
| `segment` | category | not drawn | 3 different, e.g. "Corporate", "Institutional", "Private" |
| `successLast` | category | not drawn | 3 different, e.g. "G", "A", "R" |
| `growthLast` | category | not drawn | 3 different, e.g. "G", "A", "R" |
| `coverageLast` | category | not drawn | 3 different, e.g. "A", "G", "R" |
| `relationshipLast` | category | not drawn | 2 different, e.g. "A", "G" |

## The data drawing it now

| client | success | growth | coverage | relationship | owner | segment | successLast | growthLast | coverageLast | relationshipLast |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aldana Holdings | G | A | R | A | L. Vandermeer: renew FX pricing | Corporate | G | G | A | A |
| Nordvik Pension Fund | G | G | G | G | S. Okonkwo: board review on 12 Nov | Institutional | G | A | G | G |
| Dr. M. Keller | R | A | A | R | A. Romero: complaint closed, follow up | Private | A | A | G | A |
| Hallström Capital | G | G | A | G | S. Okonkwo: mandate pitch in Q1 | Institutional | G | G | A | G |
| Brivio & Figli | A | G | G | A | L. Vandermeer: lending terms sent | Corporate | R | A | G | A |
| Famille Delcourt | A | R | R | A | A. Romero: no meeting since July | Private | A | R | R | G |
| Ostrava Metals | G | A | G | G | J. Novak: treasury review booked | Corporate | A | A | A | G |
| Lindqvist Foundation | A | G | G | G | S. Okonkwo: ESG reporting gap | Institutional | G | G | G | G |
| C. Marchetti | G | G | G | G | A. Romero: inheritance planning | Private | G | G | G | G |
| Tejo Logistics | A | R | A | R | J. Novak: competitor bid on cash pool | Corporate | G | A | A | A |

As CSV:

```csv
client,success,growth,coverage,relationship,owner,segment,successLast,growthLast,coverageLast,relationshipLast
Aldana Holdings,G,A,R,A,L. Vandermeer: renew FX pricing,Corporate,G,G,A,A
Nordvik Pension Fund,G,G,G,G,S. Okonkwo: board review on 12 Nov,Institutional,G,A,G,G
Dr. M. Keller,R,A,A,R,"A. Romero: complaint closed, follow up",Private,A,A,G,A
Hallström Capital,G,G,A,G,S. Okonkwo: mandate pitch in Q1,Institutional,G,G,A,G
Brivio & Figli,A,G,G,A,L. Vandermeer: lending terms sent,Corporate,R,A,G,A
Famille Delcourt,A,R,R,A,A. Romero: no meeting since July,Private,A,R,R,G
Ostrava Metals,G,A,G,G,J. Novak: treasury review booked,Corporate,A,A,A,G
Lindqvist Foundation,A,G,G,G,S. Okonkwo: ESG reporting gap,Institutional,G,G,G,G
C. Marchetti,G,G,G,G,A. Romero: inheritance planning,Private,G,G,G,G
Tejo Logistics,A,R,A,R,J. Novak: competitor bid on cash pool,Corporate,G,A,A,A
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "rag-scorecard",
  "title": "Client RAG scorecard",
  "subtitle": "October review against September, worst first",
  "description": "Every key client's Red, Amber or Green status from four perspectives: client success, business development, coverage and the relationship itself, with the worst of the four as Overall and arrows where a status moved since September.",
  "source": {
    "name": "Client review (fictional)"
  },
  "locale": "en-GB",
  "data": {
    "type": "inline",
    "rows": [
      {
        "client": "Aldana Holdings",
        "segment": "Corporate",
        "owner": "L. Vandermeer: renew FX pricing",
        "success": "G",
        "successLast": "G",
        "growth": "A",
        "growthLast": "G",
        "coverage": "R",
        "coverageLast": "A",
        "relationship": "A",
        "relationshipLast": "A"
      },
      {
        "client": "Nordvik Pension Fund",
        "segment": "Institutional",
        "owner": "S. Okonkwo: board review on 12 Nov",
        "success": "G",
        "successLast": "G",
        "growth": "G",
        "growthLast": "A",
        "coverage": "G",
        "coverageLast": "G",
        "relationship": "G",
        "relationshipLast": "G"
      },
      {
        "client": "Dr. M. Keller",
        "segment": "Private",
        "owner": "A. Romero: complaint closed, follow up",
        "success": "R",
        "successLast": "A",
        "growth": "A",
        "growthLast": "A",
        "coverage": "A",
        "coverageLast": "G",
        "relationship": "R",
        "relationshipLast": "A"
      }
    ]
  },
  "fields": {
    "client": {
      "label": "Client"
    },
    "success": {
      "label": "Client success"
    },
    "growth": {
      "label": "Business development"
    },
    "coverage": {
      "label": "Coverage"
    },
    "relationship": {
      "label": "Relationship"
    }
  },
  "view": {
    "type": "ragboard",
    "label": "client",
    "dimensions": [
      "success",
      "growth",
      "coverage",
      "relationship"
    ],
    "previous": {
      "success": "successLast",
      "growth": "growthLast",
      "coverage": "coverageLast",
      "relationship": "relationshipLast"
    },
    "note": "owner"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `list` | fits | different | Answers a different question: better for ranking, top to bottom and exact values and lookup, but gives up actual against target or plan. | `{"type":"list","label":"client"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up actual against target or plan. Every status as words in a sortable, searchable table; the worst-first scan and the counts are gone. | `{"type":"table"}` |

Not possible with this data: `anomalies` (needs a number column for value, and there is none left); `area` (needs a number column for y, and there is none left); `bar` (needs a number column for y, and there is none left); `beeswarm` (needs a number column for value, and there is none left); `board` (It needs a stage or status column with a handful of values, and a name per row.); `boxplot` (needs a number column for value, and there is none left); `bullet` (needs a number column for value, and there is none left); `bump` (needs a number column for value, and there is none left); `calendar` (needs a date column for date); `candlestick` (needs a number column for open, and there is none left); `chord` (needs a number column for value, and there is none left); `choropleth` (needs a column of country or state codes that sit on a basemap); `donut` (needs a number column for value, and there is none left); `dot` (needs a number column for value, and there is none left); `dual` (needs a number column for y, and there is none left); `dumbbell` (needs a number column for from, and there is none left); `funnel` (needs a number column for value, and there is none left); `gauge` (needs a number column for value, and there is none left); `hbar` (needs a number column for value, and there is none left); `heatmap` (needs a number column for value, and there is none left); `histogram` (needs a number column for value, and there is none left); `history` (It needs dated events with a short title each.); `horizon` (needs a number column for y, and there is none left); `icicle` (needs a number column for value, and there is none left); `kpi` (needs a number column for value, and there is none left); `kpis` (view: items needs at least one entry.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (needs a number column for value, and there is none left); `line` (needs a number column for y, and there is none left); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a number column for value, and there is none left); `matrix` (It needs one row per pair of two categories, such as topic and quarter.); `meter` (needs a number column for value, and there is none left); `pareto` (needs a number column for value, and there is none left); `pie` (needs a number column for value, and there is none left); `pyramid` (needs a number column for left, and there is none left); `radar` (needs a number column for y, and there is none left); `ragtrend` (It needs one status (R, A, G) per entity per period.); `ridgeline` (needs a number column for value, and there is none left); `rings` (needs a number column for value, and there is none left); `rose` (needs a number column for y, and there is none left); `sankey` (needs a number column for value, and there is none left); `scatter` (needs a number column for x, and there is none left); `slope` (needs a number column for from, and there is none left); `strips` (needs a number column for value, and there is none left); `sunburst` (needs a number column for value, and there is none left); `symbols` (needs a number column for size, and there is none left); `timeline` (needs a date column for start); `treemap` (needs a number column for value, and there is none left); `variance` (needs a number column for value, and there is none left); `waffle` (needs a number column for value, and there is none left); `waterfall` (needs a number column for value, and there is none left); `whitespace` (It needs one row per client and product with a state: held, an opportunity, or not eligible.); `xray` (view: An x-ray needs something to show besides the name: facts, holdings, wallet or trend.).
