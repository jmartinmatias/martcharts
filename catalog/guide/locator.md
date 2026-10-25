# `locator` chart

A small, clean map that says where things are: a marker and an always-on name for each place, such as offices, stores or sites, with a second line of detail if there is one. Places sit on a region of a basemap (by code) or at coordinates on your own GeoJSON; a kind field colors the markers with a key.

## What it is for

- Exact values and lookup: best

**Best for**

- Where the offices, stores or sites are, by name
- A handful of named places for a report or a page header

**Least useful for**

- Amounts per place (use symbols)
- More than about 30 places, where names collide (use symbols or a table)

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One marker per row on its region (by code) or at its coordinates, its name written beside it; a kind field colors the markers with a key.

**Rows it reads well with**: 1 to 30.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field with each place's name, written beside its marker. |
| `id` | category |  | Field with the region code that places each marker: a country or state code on a built-in basemap, or the feature id in your GeoJSON. Use lat and lon instead for coordinates. |
| `lat` | number |  | Field with each row's latitude, for placing by coordinates on your own GeoJSON (not on a built-in grid). |
| `lon` | number |  | Field with each row's longitude, paired with lat. |
| `note` | category |  | Field with a second, smaller line under the name, such as a city or a headcount. |
| `color` | category |  | Field that colors the markers by kind, with a key. Also accepts `kind`, the older name. |

## This example's columns (4 columns, 9 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `country` (Country) | category | `id` | 9 different, e.g. "FR", "DE", "PT" |
| `office` (Office) | category | `label` | 9 different, e.g. "Paris", "Berlin", "Lisbon" |
| `people` (Headcount) | category | `note` | 9 different, e.g. "240 people", "130 people", "85 people" |
| `role` (Role) | category | `color` | 4 different, e.g. "Headquarters", "Engineering", "Sales" |

## The data drawing it now

| country | office | people | role |
| --- | --- | --- | --- |
| FR | Paris | 240 people | Headquarters |
| DE | Berlin | 130 people | Engineering |
| PT | Lisbon | 85 people | Engineering |
| PL | Warsaw | 70 people | Engineering |
| GB | London | 95 people | Sales |
| IT | Milan | 40 people | Sales |
| ES | Madrid | 35 people | Sales |
| SE | Stockholm | 25 people | Sales |
| IE | Dublin | 60 people | Support |

As CSV:

```csv
country,office,people,role
FR,Paris,240 people,Headquarters
DE,Berlin,130 people,Engineering
PT,Lisbon,85 people,Engineering
PL,Warsaw,70 people,Engineering
GB,London,95 people,Sales
IT,Milan,40 people,Sales
ES,Madrid,35 people,Sales
SE,Stockholm,25 people,Sales
IE,Dublin,60 people,Support
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "offices",
  "title": "Our offices",
  "subtitle": "Nine sites across Europe",
  "description": "Where the company's offices are, each named on a tile grid of Europe with its headcount under it, colored by what the site does.",
  "footer": "Source: facilities register, October 2026",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "office": "Paris",
        "country": "FR",
        "people": "240 people",
        "role": "Headquarters"
      },
      {
        "office": "Berlin",
        "country": "DE",
        "people": "130 people",
        "role": "Engineering"
      },
      {
        "office": "Lisbon",
        "country": "PT",
        "people": "85 people",
        "role": "Engineering"
      }
    ]
  },
  "fields": {
    "office": {
      "label": "Office"
    },
    "country": {
      "label": "Country"
    },
    "people": {
      "label": "Headcount"
    },
    "role": {
      "label": "Role"
    }
  },
  "view": {
    "type": "locator",
    "geo": "europe",
    "id": "country",
    "label": "office",
    "note": "people",
    "color": "role"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `list` | fits | better | Better for ranking, top to bottom, and still good for exact values and lookup. | `{"type":"list","label":"country"}` |
| `table` | fits | same | Keeps the job (exact values and lookup) with a different look. | `{"type":"table"}` |

Not possible with this data: `anomalies` (needs a number column for value, and there is none left); `area` (needs a number column for y, and there is none left); `bar` (needs a number column for y, and there is none left); `beeswarm` (needs a number column for value, and there is none left); `board` (It needs a stage or status column with a handful of values, and a name per row.); `boxplot` (needs a number column for value, and there is none left); `bullet` (needs a number column for value, and there is none left); `bump` (needs a number column for value, and there is none left); `calendar` (needs a date column for date); `candlestick` (needs a number column for open, and there is none left); `chord` (needs a number column for value, and there is none left); `choropleth` (It needs a column of country or state codes that sit on a basemap.); `donut` (needs a number column for value, and there is none left); `dot` (needs a number column for value, and there is none left); `dual` (needs a number column for y, and there is none left); `dumbbell` (needs a number column for from, and there is none left); `funnel` (needs a number column for value, and there is none left); `gauge` (needs a number column for value, and there is none left); `hbar` (needs a number column for value, and there is none left); `heatmap` (needs a number column for value, and there is none left); `histogram` (needs a number column for value, and there is none left); `history` (It needs dated events with a short title each.); `horizon` (needs a number column for y, and there is none left); `icicle` (needs a number column for value, and there is none left); `kpi` (needs a number column for value, and there is none left); `kpis` (view: items needs at least one entry.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (needs a number column for value, and there is none left); `line` (needs a number column for y, and there is none left); `marimekko` (needs a number column for value, and there is none left); `matrix` (It needs one row per pair of two categories, such as topic and quarter.); `meter` (needs a number column for value, and there is none left); `pareto` (needs a number column for value, and there is none left); `pie` (needs a number column for value, and there is none left); `pyramid` (needs a number column for left, and there is none left); `radar` (needs a number column for y, and there is none left); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (It needs one status (R, A, G) per entity per period.); `ridgeline` (needs a number column for value, and there is none left); `rings` (needs a number column for value, and there is none left); `rose` (needs a number column for y, and there is none left); `sankey` (needs a number column for value, and there is none left); `scatter` (needs a number column for x, and there is none left); `slope` (needs a number column for from, and there is none left); `strips` (needs a number column for value, and there is none left); `sunburst` (needs a number column for value, and there is none left); `symbols` (needs a number column for size, and there is none left); `timeline` (needs a date column for start); `treemap` (needs a number column for value, and there is none left); `variance` (needs a number column for value, and there is none left); `waffle` (needs a number column for value, and there is none left); `waterfall` (needs a number column for value, and there is none left); `whitespace` (It needs one row per client and product with a state: held, an opportunity, or not eligible.); `xray` (view: An x-ray needs something to show besides the name: facts, holdings, wallet or trend.).
