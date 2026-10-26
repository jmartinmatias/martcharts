# `board` chart

A status board: one column per stage with its count in the header, and the items in it as quiet cards, so where everything stands reads at a glance. For things moving through a lifecycle: regulations by status, deals by stage, tickets by state. A group field colors a dot on each card with a key; a value field writes a number on each card; past the limit a column folds the rest into one line that opens on a click.

## What it is for

- Exact values and lookup: best
- Conversion through ordered steps: good
- Comparing amounts across categories: possible
- Schedules and plans: possible

**Best for**

- Where everything stands in a lifecycle: regulations by status, deals by stage, tickets by state
- Seeing at once which stage is crowded and what is in it, by name

**Least useful for**

- Amounts per stage alone (use funnel or bar)
- Hundreds of items (filter first, or count them into a funnel)
- Stages with no natural order

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One column per stage (in the order of stages, or of first appearance) headed by its count, and one card per row in its stage's column, with a group dot, a value and a detail line when those fields are given.

**Rows it reads well with**: 3 to 120.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each card. |
| `stage` | category | yes | Field with each item's stage: one column per distinct value, in the order of stages or of first appearance. |
| `group` | category |  | Field that colors a dot on each card by group, with a key. Up to 8 groups stay distinct. |
| `value` | number |  | Field written on each card, such as impact or amount, in the field's format. |
| `detail` | category |  | Field for a smaller line under the card's name, such as the issuer or the owner. |

## This example's columns (5 columns, 16 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `deal` (Deal) | category | `label` | 16 different, e.g. "Nordic Bank core upgrade", "Harbor Insurance claims", "Meridian Payments API" |
| `stage` (Stage) | category | `stage` | 5 different, e.g. "Negotiation", "Proposal", "Qualified" |
| `region` (Region) | category | `group` | 5 different, e.g. "North", "South", "East" |
| `amount` (Amount) | number | `value` | 27000 to 240000 |
| `owner` (Owner) | category | `detail` | 5 different, e.g. "A. Berg", "L. Costa", "M. Novak" |

## The data drawing it now

| deal | stage | region | amount | owner |
| --- | --- | --- | --- | --- |
| Nordic Bank core upgrade | Negotiation | North | 240000 | A. Berg |
| Harbor Insurance claims | Proposal | North | 96000 | A. Berg |
| Meridian Payments API | Qualified | South | 58000 | L. Costa |
| Atlas Asset reporting | Won | South | 132000 | L. Costa |
| Riviera Retail loyalty | Lost | South | 44000 | L. Costa |
| Eastline Logistics tracking | Negotiation | East | 175000 | M. Novak |
| Danube Energy billing | Proposal | East | 88000 | M. Novak |
| Baltic Telecom analytics | Qualified | East | 67000 | M. Novak |
| Westport Clinics scheduling | Won | West | 112000 | J. Reyes |
| Pacific Foods forecasting | Proposal | West | 71000 | J. Reyes |
| Summit Hotels CRM | Qualified | West | 39000 | J. Reyes |
| Crescent Media ads | Lost | West | 52000 | J. Reyes |
| Central Rail timetable | Negotiation | Central | 203000 | P. Weber |
| Alpine Motors warranty | Won | Central | 148000 | P. Weber |
| Lakeside Schools portal | Qualified | Central | 27000 | P. Weber |
| Forum Legal e-discovery | Proposal | Central | 64000 | P. Weber |

As CSV:

```csv
deal,stage,region,amount,owner
Nordic Bank core upgrade,Negotiation,North,240000,A. Berg
Harbor Insurance claims,Proposal,North,96000,A. Berg
Meridian Payments API,Qualified,South,58000,L. Costa
Atlas Asset reporting,Won,South,132000,L. Costa
Riviera Retail loyalty,Lost,South,44000,L. Costa
Eastline Logistics tracking,Negotiation,East,175000,M. Novak
Danube Energy billing,Proposal,East,88000,M. Novak
Baltic Telecom analytics,Qualified,East,67000,M. Novak
Westport Clinics scheduling,Won,West,112000,J. Reyes
Pacific Foods forecasting,Proposal,West,71000,J. Reyes
Summit Hotels CRM,Qualified,West,39000,J. Reyes
Crescent Media ads,Lost,West,52000,J. Reyes
Central Rail timetable,Negotiation,Central,203000,P. Weber
Alpine Motors warranty,Won,Central,148000,P. Weber
Lakeside Schools portal,Qualified,Central,27000,P. Weber
Forum Legal e-discovery,Proposal,Central,64000,P. Weber
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "deal-board",
  "title": "Deal board",
  "subtitle": "Open and closed this quarter, by stage",
  "description": "Every deal on a board by stage, the dot colored by region and the amount on each card, so the shape of the quarter reads at a glance.",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "deal": "Nordic Bank core upgrade",
        "stage": "Negotiation",
        "region": "North",
        "amount": 240000,
        "owner": "A. Berg"
      },
      {
        "deal": "Harbor Insurance claims",
        "stage": "Proposal",
        "region": "North",
        "amount": 96000,
        "owner": "A. Berg"
      },
      {
        "deal": "Meridian Payments API",
        "stage": "Qualified",
        "region": "South",
        "amount": 58000,
        "owner": "L. Costa"
      }
    ]
  },
  "fields": {
    "deal": {
      "label": "Deal"
    },
    "stage": {
      "label": "Stage"
    },
    "region": {
      "label": "Region"
    },
    "amount": {
      "label": "Amount",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "owner": {
      "label": "Owner"
    }
  },
  "view": {
    "type": "board",
    "label": "deal",
    "stage": "stage",
    "stages": [
      "Qualified",
      "Proposal",
      "Negotiation",
      "Won",
      "Lost"
    ],
    "group": "region",
    "value": "amount",
    "detail": "owner",
    "limit": 4
  },
  "source": {
    "name": "CRM"
  },
  "i18n": {
    "fr": {
      "title": "Tableau des affaires",
      "subtitle": "Ouvertes et conclues ce trimestre, par étape",
      "description": "Chaque affaire sur un tableau par étape, le point coloré par région et le montant sur chaque fiche : le trimestre d'un coup d'œil.",
      "fields": {
        "deal": {
          "label": "Affaire"
        },
        "stage": {
          "label": "Étape"
        },
        "region": {
          "label": "Région"
        },
        "amount": {
          "label": "Montant"
        },
        "owner": {
          "label": "Responsable"
        }
      }
    },
    "de": {
      "title": "Deal-Board",
      "subtitle": "Offen und abgeschlossen in diesem Quartal, nach Phase",
      "description": "Jeder Deal auf einem Board nach Phase, Punkt nach Region gefärbt, Betrag auf jeder Karte, damit das Quartal auf einen Blick lesbar ist.",
      "fields": {
        "stage": {
          "label": "Phase"
        },
        "amount": {
          "label": "Betrag"
        },
        "owner": {
          "label": "Verantwortlich"
        }
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `list` | fits | better | Better for ranking, top to bottom, and still good for exact values and lookup. | `{"type":"list","label":"deal","detail":"owner","value":"amount"}` |
| `table` | fits | same | Keeps the job (exact values and lookup) with a different look. Every field in columns, sortable and searchable; where things stand no longer reads at a glance. | `{"type":"table"}` |
| `matrix` | fits | trade-off | Better for patterns across two dimensions or a cycle and comparing amounts across categories; weaker for exact values and lookup. | `{"type":"matrix","x":"deal","y":"stage","label":"deal"}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up exact values and lookup. | `{"type":"hbar","label":"deal","value":"amount"}` |
| `icicle` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up exact values and lookup. | `{"type":"icicle","levels":["deal","stage"],"value":"amount"}` |
| `pareto` | fits | different | Answers a different question: better for ranking, top to bottom and what drives or moves a total, but gives up exact values and lookup. | `{"type":"pareto","label":"deal","value":"amount"}` |
| `sunburst` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up exact values and lookup. | `{"type":"sunburst","levels":["deal","stage"],"value":"amount"}` |
| `treemap` | fits | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up exact values and lookup. | `{"type":"treemap","label":"deal","value":"amount","group":"region"}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up exact values and lookup. | `{"type":"beeswarm","value":"amount","group":"region","label":"deal"}` |
| `heatmap` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up exact values and lookup. | `{"type":"heatmap","x":"deal","y":"stage","value":"amount"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up exact values and lookup. | `{"type":"sankey","source":"deal","target":"stage","value":"amount"}` |
| `bar` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"bar","x":"deal","y":"amount"}` |
| `boxplot` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"boxplot","value":"amount","group":"region"}` |
| `dot` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"dot","label":"deal","value":"amount"}` |
| `kpi` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"kpi","value":"amount"}` |
| `kpis` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"amount"}]}` |
| `marimekko` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"marimekko","x":"deal","series":"stage","value":"amount"}` |
| `rose` | fits | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"rose","label":"deal","y":"amount"}` |
| `area` | stretch: x expects dates; "deal" is text, so its rows are drawn in the order given. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"area","x":"deal","y":"amount"}` |
| `donut` | stretch: 16 rows: this chart crowds past about 6. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"donut","label":"deal","value":"amount"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 16 rows. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"gauge","value":"amount"}` |
| `histogram` | stretch: 16 rows: this chart says little with fewer than 20. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"histogram","value":"amount"}` |
| `horizon` | stretch: x expects dates; "deal" is text, so its rows are drawn in the order given. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"horizon","x":"deal","y":"amount"}` |
| `line` | stretch: x expects dates; "deal" is text, so its rows are drawn in the order given. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"line","x":"deal","y":"amount"}` |
| `pie` | stretch: 16 rows: this chart crowds past about 6. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"pie","label":"deal","value":"amount"}` |
| `radar` | stretch: 16 rows: this chart crowds past about 12. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"radar","label":"deal","y":"amount"}` |
| `ridgeline` | stretch: 16 rows: this chart says little with fewer than 20. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"amount","group":"deal"}` |
| `waffle` | stretch: 16 rows: this chart crowds past about 5. | worse | Gives up exact values and lookup, and this data gives it nothing better to do. | `{"type":"waffle","label":"deal","value":"amount"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `bullet` (needs a separate column for target (it would reuse "amount", already the value)); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "amount", already the open)); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "amount", already the y)); `dumbbell` (needs a separate column for to (it would reuse "amount", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `meter` (needs a separate column for target (it would reuse "amount", already the value)); `pyramid` (needs a separate column for right (it would reuse "amount", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (It needs one status (R, A, G) per entity per period.); `rings` (needs a separate column for target (it would reuse "amount", already the value)); `scatter` (needs a separate column for y (it would reuse "amount", already the x)); `slope` (needs a separate column for to (it would reuse "amount", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "amount", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (It needs one row per client and product with a state: held, an opportunity, or not eligible.); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
