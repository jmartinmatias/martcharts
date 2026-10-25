# `rose` chart

A polar area chart (a Nightingale rose) for a cycle that wraps round, such as hours of the day or months of the year: one equal wedge per row, clockwise from twelve o'clock, its area true to its value. Several fields stack outward, each ring adding its own area. For plain ranking, a bar chart reads more exactly.

## What it is for

- Patterns across two dimensions or a cycle: best
- Comparing amounts across categories: possible

**Best for**

- Cycles that wrap round: hours of the day, months of the year, directions

**Least useful for**

- Categories with no cycle (use bar)
- Precise comparisons

## The data it needs

**One row is**: One row per category, each named once.

**How the chart is built**: One equal wedge per row, clockwise from twelve o'clock, its area true to value; several y fields stack.

**Rows it reads well with**: 4 to 36.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `label` | category | yes | Field naming each wedge, in cycle order, such as the hour or the month. |
| `y` | number (one or more) | yes | Field or fields with the values; each field is one ring of the stack. Up to 4 stay readable. |

## This example's columns (3 columns, 24 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `hour` (Hour) | category | `label` | 24 different, e.g. "00:00", "01:00", "02:00" |
| `Desktop` | number | `y` | 120 to 1650 |
| `Mobile` | number | `y` | 160 to 1660 |

## The data drawing it now

| hour | Desktop | Mobile |
| --- | --- | --- |
| 00:00 | 120 | 320 |
| 01:00 | 120 | 190 |
| 02:00 | 120 | 160 |
| 03:00 | 120 | 160 |
| 04:00 | 120 | 160 |
| 05:00 | 130 | 160 |
| 06:00 | 160 | 220 |
| 07:00 | 260 | 490 |
| 08:00 | 520 | 760 |
| 09:00 | 950 | 490 |
| 10:00 | 1420 | 220 |
| 11:00 | 1650 | 190 |
| 12:00 | 1550 | 350 |
| 13:00 | 1340 | 540 |
| 14:00 | 1250 | 350 |
| 15:00 | 1160 | 180 |
| 16:00 | 890 | 160 |
| 17:00 | 520 | 190 |
| 18:00 | 260 | 320 |
| 19:00 | 150 | 710 |
| 20:00 | 130 | 1330 |
| 21:00 | 120 | 1660 |
| 22:00 | 120 | 1330 |
| 23:00 | 120 | 710 |

As CSV:

```csv
hour,Desktop,Mobile
00:00,120,320
01:00,120,190
02:00,120,160
03:00,120,160
04:00,120,160
05:00,130,160
06:00,160,220
07:00,260,490
08:00,520,760
09:00,950,490
10:00,1420,220
11:00,1650,190
12:00,1550,350
13:00,1340,540
14:00,1250,350
15:00,1160,180
16:00,890,160
17:00,520,190
18:00,260,320
19:00,150,710
20:00,130,1330
21:00,120,1660
22:00,120,1330
23:00,120,710
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "visits-by-hour",
  "title": "Visits by hour",
  "subtitle": "Average visits per hour of the day, September 2026",
  "description": "The day has two shapes. Desktop builds through the working morning to an 11:00 peak and fades by 17:00; mobile spikes on the 08:00 commute and owns the evening, peaking at 21:00. Each wedge's area is its visits.",
  "footer": "Source: web analytics, local time",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "hour": "00:00",
        "Desktop": 120,
        "Mobile": 320
      },
      {
        "hour": "01:00",
        "Desktop": 120,
        "Mobile": 190
      },
      {
        "hour": "02:00",
        "Desktop": 120,
        "Mobile": 160
      }
    ]
  },
  "fields": {
    "hour": {
      "label": "Hour"
    },
    "Desktop": {
      "format": {
        "type": "number"
      }
    },
    "Mobile": {
      "format": {
        "type": "number"
      }
    }
  },
  "view": {
    "type": "rose",
    "label": "hour",
    "y": [
      "Desktop",
      "Mobile"
    ]
  },
  "style": {
    "height": 300
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `dot` | fits | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up patterns across two dimensions or a cycle. | `{"type":"dot","label":"hour","value":["Desktop","Mobile"]}` |
| `hbar` | fits | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up patterns across two dimensions or a cycle. | `{"type":"hbar","label":"hour","value":["Desktop","Mobile"]}` |
| `treemap` | fits | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up patterns across two dimensions or a cycle. | `{"type":"treemap","label":"hour","value":"Desktop"}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up patterns across two dimensions or a cycle. | `{"type":"beeswarm","value":"Desktop","label":"hour"}` |
| `histogram` | fits | different | Answers a different question: better for how values spread, but gives up patterns across two dimensions or a cycle. | `{"type":"histogram","value":"Desktop"}` |
| `scatter` | fits | different | Answers a different question: better for how two measures relate, but gives up patterns across two dimensions or a cycle. | `{"type":"scatter","x":"Desktop","y":"Mobile","label":"hour"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up patterns across two dimensions or a cycle. | `{"type":"table"}` |
| `boxplot` | fits | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"boxplot","value":"Desktop"}` |
| `icicle` | fits | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"icicle","levels":"hour","value":"Desktop"}` |
| `kpi` | fits | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"kpi","value":"Desktop"}` |
| `kpis` | fits | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"Desktop"},{"value":"Mobile"}]}` |
| `pareto` | fits | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"pareto","label":"hour","value":"Desktop"}` |
| `ridgeline` | fits | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"Desktop","group":"hour"}` |
| `sunburst` | fits | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"hour","value":"Desktop"}` |
| `list` | stretch: 24 rows: this chart crowds past about 20. | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up patterns across two dimensions or a cycle. | `{"type":"list","label":"hour"}` |
| `area` | stretch: x expects dates; "hour" is text, so its rows are drawn in the order given. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"area","x":"hour","y":["Desktop","Mobile"]}` |
| `bar` | stretch: 24 rows: this chart crowds past about 16. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"bar","x":"hour","y":["Desktop","Mobile"]}` |
| `donut` | stretch: 24 rows: this chart crowds past about 6. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"donut","label":"hour","value":"Desktop"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 24 rows. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"gauge","value":"Desktop"}` |
| `horizon` | stretch: x expects dates; "hour" is text, so its rows are drawn in the order given. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"horizon","x":"hour","y":["Desktop","Mobile"]}` |
| `line` | stretch: x expects dates; "hour" is text, so its rows are drawn in the order given. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"line","x":"hour","y":["Desktop","Mobile"]}` |
| `pie` | stretch: 24 rows: this chart crowds past about 6. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"pie","label":"hour","value":"Desktop"}` |
| `radar` | stretch: 24 rows: this chart crowds past about 12. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"radar","label":"hour","y":["Desktop","Mobile"]}` |
| `waffle` | stretch: 24 rows: this chart crowds past about 5. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"waffle","label":"hour","value":"Desktop"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "hour", already the x)); `board` (needs a separate column for stage (it would reuse "hour", already the label)); `bullet` (It needs a target, plan or budget column.); `bump` (needs a separate column for series (it would reuse "hour", already the x)); `calendar` (needs a date column for date); `candlestick` (needs a separate column for low (it would reuse "Desktop", already the open)); `chord` (needs a separate column for target (it would reuse "hour", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "hour", already the x)); `history` (needs a separate column for title (it would reuse "hour", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "hour", already the x)); `matrix` (needs a separate column for y (it would reuse "hour", already the x)); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "hour", already the label)); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "hour", already the source)); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "hour", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
