# `treemap` chart

Part-to-whole for many categories: tiles sized by value, kept close to square. Use it where a donut would need more than 6 slices.

## What it is for

- Share of one whole: best
- Nested breakdowns: good
- Comparing amounts across categories: possible

**Best for**

- Many parts of one whole: revenue by customer, spend by vendor
- Portfolios grouped by segment

**Least useful for**

- Two or three parts (use donut)
- Precise comparisons (use hbar)
- Negative values

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One tile per row, its area its share of the sum of value, kept close to square; an optional group field clusters tiles.

**Rows it reads well with**: 4 to 120.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each tile. |
| `value` | number | yes | Field sizing each tile. Zero and negative values are left out. |
| `group` | category |  | Field that colors related tiles alike, up to 8 groups. Without it every tile shares one color. |

## This example's columns (4 columns, 8 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `name` | category | `label` | 8 different, e.g. "Aurora Logistics", "Bellwether Foods", "Cobalt Analytics" |
| `revenue` (Revenue) | number | `value` | 97600 to 214000 |
| `segment` (Segment) | category | `group` | 3 different, e.g. "Enterprise", "Mid-market", "Small business" |
| `country` | category | not drawn | 7 different, e.g. "Luxembourg", "France", "Germany" |

## The data drawing it now

| name | revenue | segment | country |
| --- | --- | --- | --- |
| Aurora Logistics | 214000 | Enterprise | Luxembourg |
| Bellwether Foods | 188500 | Enterprise | France |
| Cobalt Analytics | 172300 | Mid-market | Germany |
| Dunmore Retail | 151900 | Mid-market | Belgium |
| Everline Health | 139400 | Enterprise | Netherlands |
| Fjord Energy | 122800 | Mid-market | Norway |
| Granite Bank | 118200 | Enterprise | Luxembourg |
| Halcyon Travel | 97600 | Small business | Spain |

As CSV:

```csv
name,revenue,segment,country
Aurora Logistics,214000,Enterprise,Luxembourg
Bellwether Foods,188500,Enterprise,France
Cobalt Analytics,172300,Mid-market,Germany
Dunmore Retail,151900,Mid-market,Belgium
Everline Health,139400,Enterprise,Netherlands
Fjord Energy,122800,Mid-market,Norway
Granite Bank,118200,Enterprise,Luxembourg
Halcyon Travel,97600,Small business,Spain
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "customer-treemap",
  "title": "Revenue by customer",
  "subtitle": "Year to date, by segment",
  "description": "Every customer's share of revenue, grouped by segment.",
  "source": {
    "name": "CRM"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "name": "Aurora Logistics",
        "country": "Luxembourg",
        "segment": "Enterprise",
        "revenue": 214000
      },
      {
        "name": "Bellwether Foods",
        "country": "France",
        "segment": "Enterprise",
        "revenue": 188500
      },
      {
        "name": "Cobalt Analytics",
        "country": "Germany",
        "segment": "Mid-market",
        "revenue": 172300
      }
    ]
  },
  "fields": {
    "revenue": {
      "label": "Revenue",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "segment": {
      "label": "Segment"
    }
  },
  "view": {
    "type": "treemap",
    "label": "name",
    "value": "revenue",
    "group": "segment"
  },
  "i18n": {
    "fr": {
      "title": "CA par client",
      "subtitle": "Depuis janvier, par segment",
      "description": "La part de CA de chaque client, groupée par segment.",
      "fields": {
        "revenue": {
          "label": "Chiffre d'affaires"
        }
      }
    },
    "de": {
      "title": "Umsatz je Kunde",
      "subtitle": "Seit Jahresbeginn, nach Segment",
      "description": "Umsatzanteil jedes Kunden, nach Segment gruppiert.",
      "fields": {
        "revenue": {
          "label": "Umsatz"
        }
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `pareto` | fits | trade-off | Better for ranking, top to bottom and what drives or moves a total; weaker for share of one whole. | `{"type":"pareto","label":"name","value":"revenue"}` |
| `icicle` | fits | trade-off | Better for nested breakdowns; weaker for share of one whole. | `{"type":"icicle","levels":["name","segment"],"value":"revenue"}` |
| `sunburst` | fits | trade-off | Better for nested breakdowns; weaker for share of one whole. Adds nesting when there is a second level; harder to compare tile sizes. | `{"type":"sunburst","levels":["name","segment"],"value":"revenue"}` |
| `bar` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up share of one whole. | `{"type":"bar","x":"name","y":"revenue"}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up share of one whole. Easier to compare and rank, at the cost of the part-to-whole picture. | `{"type":"hbar","label":"name","value":"revenue"}` |
| `list` | fits | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up share of one whole. | `{"type":"list","label":"name","value":"revenue"}` |
| `matrix` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle and exact values and lookup, but gives up share of one whole. | `{"type":"matrix","x":"name","y":"segment","label":"name"}` |
| `heatmap` | fits | different | Answers a different question: better for patterns across two dimensions or a cycle, but gives up share of one whole. | `{"type":"heatmap","x":"name","y":"segment","value":"revenue"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up share of one whole. | `{"type":"sankey","source":"name","target":"segment","value":"revenue"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up share of one whole. | `{"type":"table"}` |
| `dot` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"dot","label":"name","value":"revenue"}` |
| `kpi` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"kpi","value":"revenue"}` |
| `kpis` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"revenue"}]}` |
| `marimekko` | fits | worse | Weaker for share of one whole, with nothing gained for this data. | `{"type":"marimekko","x":"name","series":"segment","value":"revenue"}` |
| `radar` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"radar","label":"name","y":"revenue"}` |
| `rose` | fits | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"rose","label":"name","y":"revenue"}` |
| `donut` | stretch: 8 rows: this chart crowds past about 6. | same | Keeps the job (share of one whole) with a different look. | `{"type":"donut","label":"name","value":"revenue"}` |
| `pie` | stretch: 8 rows: this chart crowds past about 6. | same | Keeps the job (share of one whole) with a different look. | `{"type":"pie","label":"name","value":"revenue"}` |
| `waffle` | stretch: 8 rows: this chart crowds past about 5. | same | Keeps the job (share of one whole) with a different look. | `{"type":"waffle","label":"name","value":"revenue"}` |
| `area` | stretch: x expects dates; "name" is text, so its rows are drawn in the order given. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"area","x":"name","y":"revenue"}` |
| `beeswarm` | stretch: 8 rows: this chart says little with fewer than 10. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"beeswarm","value":"revenue","group":"segment","label":"name"}` |
| `boxplot` | stretch: 8 rows: this chart says little with fewer than 15. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"boxplot","value":"revenue","group":"segment"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 8 rows. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"gauge","value":"revenue"}` |
| `histogram` | stretch: 8 rows: this chart says little with fewer than 20. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"histogram","value":"revenue"}` |
| `horizon` | stretch: x expects dates; "name" is text, so its rows are drawn in the order given. 8 rows: this chart says little with fewer than 10. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"horizon","x":"name","y":"revenue"}` |
| `line` | stretch: x expects dates; "name" is text, so its rows are drawn in the order given. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"line","x":"name","y":"revenue"}` |
| `ridgeline` | stretch: 8 rows: this chart says little with fewer than 20. | worse | Gives up share of one whole, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"revenue","group":"name"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `board` (It needs a stage or status column with a handful of values, and a name per row.); `bullet` (needs a separate column for target (it would reuse "revenue", already the value)); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "revenue", already the open)); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "revenue", already the y)); `dumbbell` (needs a separate column for to (it would reuse "revenue", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `meter` (needs a separate column for target (it would reuse "revenue", already the value)); `pyramid` (needs a separate column for right (it would reuse "revenue", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (It needs one status (R, A, G) per entity per period.); `rings` (needs a separate column for target (it would reuse "revenue", already the value)); `scatter` (needs a separate column for y (it would reuse "revenue", already the x)); `slope` (needs a separate column for to (it would reuse "revenue", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "revenue", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (It needs one row per client and product with a state: held, an opportunity, or not eligible.); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
