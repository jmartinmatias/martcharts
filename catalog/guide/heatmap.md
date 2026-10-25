# `heatmap` chart

A grid of cells shaded on one blue scale from light (low) to dark (high), for patterns across two categories such as weekday by hour.

## What it is for

- Patterns across two dimensions or a cycle: best
- Comparing amounts across categories: possible

**Best for**

- Two categories crossed: weekday by hour, region by product
- Finding hot spots and quiet times

**Least useful for**

- Exact values (use table)
- One dimension only (use bar)

## The data it needs

**One row is**: One row per combination of two categories, such as month and product.

**How the chart is built**: One cell per row at x and y, shaded by value on one scale from light (low) to dark (high).

**Rows it reads well with**: 6 to 600.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `x` | category | yes | Field for the columns. |
| `y` | category | yes | Field for the rows. |
| `value` | number | yes | Field that shades each cell. |

## This example's columns (3 columns, 35 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `slot` (Time) | category | `x` | 5 different, e.g. "8-10", "10-12", "12-14" |
| `day` (Day) | category | `y` | 7 different, e.g. "Mon", "Tue", "Wed" |
| `tickets` (Tickets) | number | `value` | 4 to 79 |

## The data drawing it now

| slot | day | tickets |
| --- | --- | --- |
| 8-10 | Mon | 34 |
| 10-12 | Mon | 61 |
| 12-14 | Mon | 48 |
| 14-16 | Mon | 55 |
| 16-18 | Mon | 40 |
| 8-10 | Tue | 38 |
| 10-12 | Tue | 72 |
| 12-14 | Tue | 51 |
| 14-16 | Tue | 63 |
| 16-18 | Tue | 44 |
| 8-10 | Wed | 36 |
| 10-12 | Wed | 68 |
| 12-14 | Wed | 57 |
| 14-16 | Wed | 66 |
| 16-18 | Wed | 47 |
| 8-10 | Thu | 41 |
| 10-12 | Thu | 79 |
| 12-14 | Thu | 62 |
| 14-16 | Thu | 71 |
| 16-18 | Thu | 52 |
| 8-10 | Fri | 29 |
| 10-12 | Fri | 58 |
| 12-14 | Fri | 44 |
| 14-16 | Fri | 49 |
| 16-18 | Fri | 31 |
| 8-10 | Sat | 8 |
| 10-12 | Sat | 14 |
| 12-14 | Sat | 12 |
| 14-16 | Sat | 10 |
| 16-18 | Sat | 6 |
| 8-10 | Sun | 5 |
| 10-12 | Sun | 9 |
| 12-14 | Sun | 11 |
| 14-16 | Sun | 8 |
| 16-18 | Sun | 4 |

As CSV:

```csv
slot,day,tickets
8-10,Mon,34
10-12,Mon,61
12-14,Mon,48
14-16,Mon,55
16-18,Mon,40
8-10,Tue,38
10-12,Tue,72
12-14,Tue,51
14-16,Tue,63
16-18,Tue,44
8-10,Wed,36
10-12,Wed,68
12-14,Wed,57
14-16,Wed,66
16-18,Wed,47
8-10,Thu,41
10-12,Thu,79
12-14,Thu,62
14-16,Thu,71
16-18,Thu,52
8-10,Fri,29
10-12,Fri,58
12-14,Fri,44
14-16,Fri,49
16-18,Fri,31
8-10,Sat,8
10-12,Sat,14
12-14,Sat,12
14-16,Sat,10
16-18,Sat,6
8-10,Sun,5
10-12,Sun,9
12-14,Sun,11
14-16,Sun,8
16-18,Sun,4
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "ticket-heatmap",
  "title": "Support tickets",
  "subtitle": "By weekday and time of day",
  "description": "When customers open support tickets, to plan staffing.",
  "footer": "Source: helpdesk, last 4 weeks",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "day": "Mon",
        "slot": "8-10",
        "tickets": 34
      },
      {
        "day": "Mon",
        "slot": "10-12",
        "tickets": 61
      },
      {
        "day": "Mon",
        "slot": "12-14",
        "tickets": 48
      }
    ]
  },
  "fields": {
    "tickets": {
      "label": "Tickets",
      "format": "number"
    },
    "slot": {
      "label": "Time"
    },
    "day": {
      "label": "Day"
    }
  },
  "view": {
    "type": "heatmap",
    "x": "slot",
    "y": "day",
    "value": "tickets"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `matrix` | fits | better | Better for exact values and lookup and comparing amounts across categories, and still good for patterns across two dimensions or a cycle. Marks can carry two values at once (size and shade) or a yes/no square; a single value reads less precisely than a shaded cell. | `{"type":"matrix","x":"slot","y":"day"}` |
| `boxplot` | fits | different | Answers a different question: better for how values spread and comparing amounts across categories, but gives up patterns across two dimensions or a cycle. | `{"type":"boxplot","value":"tickets"}` |
| `icicle` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up patterns across two dimensions or a cycle. | `{"type":"icicle","levels":["slot","day"],"value":"tickets"}` |
| `marimekko` | fits | different | Answers a different question: better for how each group or period splits and share of one whole, but gives up patterns across two dimensions or a cycle. | `{"type":"marimekko","x":"slot","series":"day","value":"tickets"}` |
| `ridgeline` | fits | different | Answers a different question: better for how values spread and comparing amounts across categories, but gives up patterns across two dimensions or a cycle. | `{"type":"ridgeline","value":"tickets","group":"slot"}` |
| `sunburst` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up patterns across two dimensions or a cycle. | `{"type":"sunburst","levels":["slot","day"],"value":"tickets"}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up patterns across two dimensions or a cycle. | `{"type":"beeswarm","value":"tickets"}` |
| `histogram` | fits | different | Answers a different question: better for how values spread, but gives up patterns across two dimensions or a cycle. | `{"type":"histogram","value":"tickets"}` |
| `sankey` | fits | different | Answers a different question: better for flows between stages or groups, but gives up patterns across two dimensions or a cycle. | `{"type":"sankey","source":"slot","target":"day","value":"tickets"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up patterns across two dimensions or a cycle. Exact numbers instead of the pattern. | `{"type":"table"}` |
| `kpis` | fits | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"tickets"}]}` |
| `rose` | stretch: "slot" repeats (5 different values in 35 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | same | Keeps the job (patterns across two dimensions or a cycle) with a different look. | `{"type":"rose","label":"slot","y":"tickets"}` |
| `bar` | stretch: "slot" repeats (5 different values in 35 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 35 rows: this chart crowds past about 16. | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up patterns across two dimensions or a cycle. | `{"type":"bar","x":"slot","y":"tickets"}` |
| `hbar` | stretch: "slot" repeats (5 different values in 35 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 35 rows: this chart crowds past about 30. | different | Answers a different question: better for ranking, top to bottom and comparing amounts across categories, but gives up patterns across two dimensions or a cycle. | `{"type":"hbar","label":"slot","value":"tickets"}` |
| `list` | stretch: "slot" repeats (5 different values in 35 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 35 rows: this chart crowds past about 20. | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up patterns across two dimensions or a cycle. | `{"type":"list","label":"slot","value":"tickets"}` |
| `pareto` | stretch: "slot" repeats (5 different values in 35 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 35 rows: this chart crowds past about 25. | different | Answers a different question: better for ranking, top to bottom and what drives or moves a total, but gives up patterns across two dimensions or a cycle. | `{"type":"pareto","label":"slot","value":"tickets"}` |
| `treemap` | stretch: "slot" repeats (5 different values in 35 rows), but this chart wants one row per category: sum the rows first with an aggregate step. | different | Answers a different question: better for share of one whole and nested breakdowns, but gives up patterns across two dimensions or a cycle. | `{"type":"treemap","label":"slot","value":"tickets"}` |
| `area` | stretch: x expects dates; "slot" is text, so its rows are drawn in the order given. "slot" repeats (5 different values in 35 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"area","x":"slot","y":"tickets"}` |
| `donut` | stretch: "slot" repeats (5 different values in 35 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 35 rows: this chart crowds past about 6. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"donut","label":"slot","value":"tickets"}` |
| `dot` | stretch: "slot" repeats (5 different values in 35 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 35 rows: this chart crowds past about 30. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"dot","label":"slot","value":"tickets"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 35 rows. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"gauge","value":"tickets"}` |
| `horizon` | stretch: x expects dates; "slot" is text, so its rows are drawn in the order given. "slot" repeats (5 different values in 35 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"horizon","x":"slot","y":"tickets"}` |
| `kpi` | stretch: x expects dates; "slot" is text, so its rows are drawn in the order given. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"kpi","value":"tickets","x":"slot"}` |
| `line` | stretch: x expects dates; "slot" is text, so its rows are drawn in the order given. "slot" repeats (5 different values in 35 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"line","x":"slot","y":"tickets"}` |
| `pie` | stretch: "slot" repeats (5 different values in 35 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 35 rows: this chart crowds past about 6. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"pie","label":"slot","value":"tickets"}` |
| `radar` | stretch: "slot" repeats (5 different values in 35 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 35 rows: this chart crowds past about 12. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"radar","label":"slot","y":"tickets"}` |
| `waffle` | stretch: "slot" repeats (5 different values in 35 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 35 rows: this chart crowds past about 5. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"waffle","label":"slot","value":"tickets"}` |

Not possible with this data: `anomalies` (It needs readings over time per metric, with a yes/no flag or a low and high band.); `board` (It needs a stage or status column with a handful of values, and a name per row.); `bullet` (needs a separate column for target (it would reuse "tickets", already the value)); `bump` (It needs one value per series in each period, to rank.); `calendar` (needs a date column for date); `candlestick` (needs a separate column for high (it would reuse "tickets", already the open)); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "tickets", already the y)); `dumbbell` (needs a separate column for to (it would reuse "tickets", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `meter` (needs a separate column for target (it would reuse "tickets", already the value)); `pyramid` (needs a separate column for right (it would reuse "tickets", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for status (it would reuse "slot", already the label)); `rings` (needs a separate column for target (it would reuse "tickets", already the value)); `scatter` (needs a separate column for y (it would reuse "tickets", already the x)); `slope` (needs a separate column for to (it would reuse "tickets", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a date column for start); `variance` (needs a separate column for target (it would reuse "tickets", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for state (it would reuse "slot", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
