# `choropleth` chart

A map with each region shaded by its value, from the weakest tint to the strongest, with a scale under it: revenue by country, share by state. Regions with no row stay grey and are keyed No data. Built-in tile grids (europe, us-states) give every region the same size, so small countries read as well as big ones; your own GeoJSON draws true shapes.

## What it is for

- Comparing amounts across categories: best
- Patterns across two dimensions or a cycle: good
- Exact values and lookup: possible

**Best for**

- An amount or a rate by country or state: revenue by country, share by state
- Seeing where something is high or low across a territory

**Least useful for**

- Exact comparisons between regions (use hbar)
- Totals that follow area or population, which big regions exaggerate (use a rate, or symbols)
- Rows that are not regions

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One region per row, matched by its code to the basemap (a built-in tile grid or your GeoJSON), shaded on a seven-step scale from the lowest value to the highest; regions with no row stay grey.

**Rows it reads well with**: 3 to 300.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `id` | category | yes | Field with each row's region code: a country or state code on a built-in basemap (FR, TX), or the feature id in your GeoJSON. |
| `value` | number |  | Field that shades each region on the sequential scale. Rows with no number stay grey. Give value or category, not both. |
| `category` | category |  | Field that colors each region by its category instead, one series color per value with a key: a transposition status, a supervisor, a regime. Up to 8 categories stay distinct. |
| `previous` | number |  | Field with the same measure in the previous period, such as last year's revenue. Each region's tooltip then gives the change, and show "change" shades by it. |

## This example's columns (2 columns, 24 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `country` (Country) | category | `id` | 24 different, e.g. "DE", "FR", "GB" |
| `revenue` (Revenue) | number | `value` | 80000 to 4120000 |

## The data drawing it now

| country | revenue |
| --- | --- |
| DE | 4120000 |
| FR | 3860000 |
| GB | 2940000 |
| IT | 2210000 |
| ES | 1980000 |
| NL | 1640000 |
| BE | 1120000 |
| CH | 1090000 |
| SE | 940000 |
| AT | 880000 |
| PL | 860000 |
| LU | 720000 |
| DK | 610000 |
| IE | 590000 |
| PT | 540000 |
| NO | 520000 |
| FI | 410000 |
| CZ | 380000 |
| GR | 260000 |
| RO | 240000 |
| HU | 210000 |
| SK | 120000 |
| HR | 90000 |
| SI | 80000 |

As CSV:

```csv
country,revenue
DE,4120000
FR,3860000
GB,2940000
IT,2210000
ES,1980000
NL,1640000
BE,1120000
CH,1090000
SE,940000
AT,880000
PL,860000
LU,720000
DK,610000
IE,590000
PT,540000
NO,520000
FI,410000
CZ,380000
GR,260000
RO,240000
HU,210000
SK,120000
HR,90000
SI,80000
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "revenue-by-country",
  "title": "Revenue by country",
  "subtitle": "2026 year to date, European markets",
  "description": "Year-to-date revenue per European country on a tile grid, every country the same size so Luxembourg reads as well as Germany; countries with no sales stay grey.",
  "source": {
    "name": "Finance ledger"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "country": "DE",
        "revenue": 4120000
      },
      {
        "country": "FR",
        "revenue": 3860000
      },
      {
        "country": "GB",
        "revenue": 2940000
      }
    ]
  },
  "fields": {
    "country": {
      "label": "Country"
    },
    "revenue": {
      "label": "Revenue",
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    }
  },
  "view": {
    "type": "choropleth",
    "geo": "europe",
    "id": "country",
    "value": "revenue"
  },
  "i18n": {
    "fr": {
      "title": "CA par pays",
      "subtitle": "2026 depuis janvier, marchés européens",
      "description": "CA cumulé par pays européen sur une grille, chaque pays de même taille pour que le Luxembourg se lise aussi bien que l'Allemagne ; les pays sans vente restent gris.",
      "source": {
        "name": "Grand livre"
      },
      "fields": {
        "country": {
          "label": "Pays"
        },
        "revenue": {
          "label": "Chiffre d'affaires"
        }
      }
    },
    "de": {
      "title": "Umsatz je Land",
      "subtitle": "2026 seit Jahresbeginn, europäische Märkte",
      "description": "Umsatz seit Jahresbeginn je europäischem Land auf einem Raster, jedes Land gleich groß, damit Luxemburg so gut lesbar ist wie Deutschland; Länder ohne Umsatz bleiben grau.",
      "source": {
        "name": "Hauptbuch"
      },
      "fields": {
        "country": {
          "label": "Land"
        },
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
| `hbar` | fits | better | Better for ranking, top to bottom, and still good for comparing amounts across categories. | `{"type":"hbar","label":"country","value":"revenue"}` |
| `dot` | fits | same | Keeps the job (comparing amounts across categories) with a different look. | `{"type":"dot","label":"country","value":"revenue"}` |
| `symbols` | fits | same | Keeps the job (comparing amounts across categories) with a different look. | `{"type":"symbols","size":"revenue","geo":"europe","id":"country"}` |
| `pareto` | fits | different | Answers a different question: better for ranking, top to bottom and what drives or moves a total, but gives up comparing amounts across categories. | `{"type":"pareto","label":"country","value":"revenue"}` |
| `treemap` | fits | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up comparing amounts across categories. | `{"type":"treemap","label":"country","value":"revenue"}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up comparing amounts across categories. | `{"type":"beeswarm","value":"revenue"}` |
| `histogram` | fits | different | Answers a different question: better for how values spread, but gives up comparing amounts across categories. | `{"type":"histogram","value":"revenue"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up comparing amounts across categories. | `{"type":"table"}` |
| `boxplot` | fits | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"boxplot","value":"revenue"}` |
| `icicle` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"icicle","levels":"country","value":"revenue"}` |
| `kpi` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"kpi","value":"revenue"}` |
| `kpis` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"revenue"}]}` |
| `ridgeline` | fits | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"ridgeline","value":"revenue","group":"country"}` |
| `rose` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"rose","label":"country","y":"revenue"}` |
| `sunburst` | fits | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"country","value":"revenue"}` |
| `bar` | stretch: 24 rows: this chart crowds past about 16. | same | Keeps the job (comparing amounts across categories) with a different look. | `{"type":"bar","x":"country","y":"revenue"}` |
| `list` | stretch: 24 rows: this chart crowds past about 20. | different | Answers a different question: better for ranking, top to bottom and exact values and lookup, but gives up comparing amounts across categories. | `{"type":"list","label":"country","value":"revenue"}` |
| `area` | stretch: x expects dates; "country" is text, so its rows are drawn in the order given. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"area","x":"country","y":"revenue"}` |
| `donut` | stretch: 24 rows: this chart crowds past about 6. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"donut","label":"country","value":"revenue"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 24 rows. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"gauge","value":"revenue"}` |
| `horizon` | stretch: x expects dates; "country" is text, so its rows are drawn in the order given. | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"horizon","x":"country","y":"revenue"}` |
| `line` | stretch: x expects dates; "country" is text, so its rows are drawn in the order given. | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"line","x":"country","y":"revenue"}` |
| `pie` | stretch: 24 rows: this chart crowds past about 6. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"pie","label":"country","value":"revenue"}` |
| `radar` | stretch: 24 rows: this chart crowds past about 12. | worse | Weaker for comparing amounts across categories, with nothing gained for this data. | `{"type":"radar","label":"country","y":"revenue"}` |
| `waffle` | stretch: 24 rows: this chart crowds past about 5. | worse | Gives up comparing amounts across categories, and this data gives it nothing better to do. | `{"type":"waffle","label":"country","value":"revenue"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "country", already the x)); `board` (needs a separate column for stage (it would reuse "country", already the label)); `bullet` (needs a separate column for target (it would reuse "revenue", already the value)); `bump` (needs a separate column for series (it would reuse "country", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "revenue", already the open)); `chord` (needs a separate column for target (it would reuse "country", already the source)); `dual` (needs a separate column for y2 (it would reuse "revenue", already the y)); `dumbbell` (needs a separate column for to (it would reuse "revenue", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "country", already the x)); `history` (needs a separate column for title (it would reuse "country", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (It needs named places with region codes on a basemap, or coordinates.); `marimekko` (needs a separate column for series (it would reuse "country", already the x)); `matrix` (needs a separate column for y (it would reuse "country", already the x)); `meter` (needs a separate column for target (it would reuse "revenue", already the value)); `pyramid` (needs a separate column for right (it would reuse "revenue", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "country", already the label)); `rings` (needs a separate column for target (it would reuse "revenue", already the value)); `sankey` (needs a separate column for target (it would reuse "country", already the source)); `scatter` (needs a separate column for y (it would reuse "revenue", already the x)); `slope` (needs a separate column for to (it would reuse "revenue", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "revenue", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "country", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
