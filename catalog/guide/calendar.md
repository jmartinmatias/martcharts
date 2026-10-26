# `calendar` chart

A calendar heatmap: one cell per day, weeks as columns from Monday, shaded on one blue scale. For daily patterns such as sales or tickets across months.

## What it is for

- Patterns across two dimensions or a cycle: best
- Trend over time: good

**Best for**

- Daily activity over months: orders, logins, incidents
- Weekday and seasonal patterns, streaks and gaps

**Least useful for**

- Monthly or weekly data (use bar or line)
- Exact comparisons between days (use bar)

## The data it needs

**One row is**: One row per point in time, in order.

**How the chart is built**: One cell per day (weeks as columns from Monday), shaded by value on one scale.

**Rows it reads well with**: 28 to 800.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `date` | date | yes | Field with each day's date, as YYYY-MM-DD or a timestamp. |
| `value` | number | yes | Field that shades each day. |

## This example's columns (2 columns, 183 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `day` (Day) | date | `date` | 183 different, e.g. "2026-04-01", "2026-04-02", "2026-04-03" |
| `orders` (Orders) | number | `value` | 34 to 225 |

## The data drawing it now

| day | orders |
| --- | --- |
| 2026-04-01 | 144 |
| 2026-04-02 | 156 |
| 2026-04-03 | 115 |
| 2026-04-04 | 48 |
| 2026-04-05 | 40 |
| 2026-04-06 | 126 |
| 2026-04-07 | 112 |
| 2026-04-08 | 119 |
| 2026-04-09 | 145 |
| 2026-04-10 | 123 |
| 2026-04-11 | 51 |
| 2026-04-12 | 41 |
| 2026-04-13 | 148 |
| 2026-04-14 | 140 |
| 2026-04-15 | 128 |
| 2026-04-16 | 143 |
| 2026-04-17 | 127 |
| 2026-04-18 | 49 |
| 2026-04-19 | 34 |
| 2026-04-20 | 131 |
| 2026-04-21 | 142 |
| 2026-04-22 | 128 |
| 2026-04-23 | 142 |
| 2026-04-24 | 144 |
| 2026-04-25 | 62 |
| 2026-04-26 | 39 |
| 2026-04-27 | 136 |
| 2026-04-28 | 154 |
| 2026-04-29 | 131 |
| 2026-04-30 | 120 |
| 2026-05-01 | 125 |
| 2026-05-02 | 60 |
| 2026-05-03 | 37 |
| 2026-05-04 | 127 |
| 2026-05-05 | 165 |
| 2026-05-06 | 161 |
| 2026-05-07 | 138 |
| 2026-05-08 | 134 |
| 2026-05-09 | 68 |
| 2026-05-10 | 40 |
| 2026-05-11 | 113 |
| 2026-05-12 | 145 |
| 2026-05-13 | 154 |
| 2026-05-14 | 128 |
| 2026-05-15 | 118 |
| 2026-05-16 | 69 |
| 2026-05-17 | 48 |
| 2026-05-18 | 130 |
| 2026-05-19 | 156 |
| 2026-05-20 | 179 |
| 2026-05-21 | 150 |
| 2026-05-22 | 113 |
| 2026-05-23 | 62 |
| 2026-05-24 | 46 |
| 2026-05-25 | 119 |
| 2026-05-26 | 131 |
| 2026-05-27 | 170 |
| 2026-05-28 | 166 |
| 2026-05-29 | 126 |
| 2026-05-30 | 66 |
| 2026-05-31 | 53 |
| 2026-06-01 | 147 |
| 2026-06-02 | 136 |
| 2026-06-03 | 160 |
| 2026-06-04 | 165 |
| 2026-06-05 | 118 |
| 2026-06-06 | 54 |
| 2026-06-07 | 48 |
| 2026-06-08 | 153 |
| 2026-06-09 | 144 |
| 2026-06-10 | 164 |
| 2026-06-11 | 189 |
| 2026-06-12 | 149 |
| 2026-06-13 | 60 |
| 2026-06-14 | 48 |
| 2026-06-15 | 158 |
| 2026-06-16 | 142 |
| 2026-06-17 | 136 |
| 2026-06-18 | 164 |
| 2026-06-19 | 147 |
| 2026-06-20 | 60 |
| 2026-06-21 | 46 |
| 2026-06-22 | 174 |
| 2026-06-23 | 177 |
| 2026-06-24 | 158 |
| 2026-06-25 | 170 |
| 2026-06-26 | 159 |
| 2026-06-27 | 63 |
| 2026-06-28 | 40 |
| 2026-06-29 | 149 |
| 2026-06-30 | 170 |
| 2026-07-01 | 151 |
| 2026-07-02 | 156 |
| 2026-07-03 | 165 |
| 2026-07-04 | 77 |
| 2026-07-05 | 47 |
| 2026-07-06 | 159 |
| 2026-07-07 | 191 |
| 2026-07-08 | 170 |
| 2026-07-09 | 143 |
| 2026-07-10 | 144 |
| 2026-07-11 | 72 |
| 2026-07-12 | 44 |
| 2026-07-13 | 138 |
| 2026-07-14 | 186 |
| 2026-07-15 | 195 |
| 2026-07-16 | 165 |
| 2026-07-17 | 154 |
| 2026-07-18 | 83 |
| 2026-07-19 | 52 |
| 2026-07-20 | 138 |
| 2026-07-21 | 168 |
| 2026-07-22 | 187 |
| 2026-07-23 | 154 |
| 2026-07-24 | 129 |
| 2026-07-25 | 76 |
| 2026-07-26 | 56 |
| 2026-07-27 | 153 |
| 2026-07-28 | 177 |
| 2026-07-29 | 214 |
| 2026-07-30 | 191 |
| 2026-07-31 | 139 |
| 2026-08-01 | 72 |
| 2026-08-02 | 56 |
| 2026-08-03 | 146 |
| 2026-08-04 | 146 |
| 2026-08-05 | 187 |
| 2026-08-06 | 195 |
| 2026-08-07 | 146 |
| 2026-08-08 | 73 |
| 2026-08-09 | 62 |
| 2026-08-10 | 184 |
| 2026-08-11 | 167 |
| 2026-08-12 | 187 |
| 2026-08-13 | 201 |
| 2026-08-14 | 147 |
| 2026-08-15 | 62 |
| 2026-08-16 | 53 |
| 2026-08-17 | 178 |
| 2026-08-18 | 166 |
| 2026-08-19 | 178 |
| 2026-08-20 | 215 |
| 2026-08-21 | 182 |
| 2026-08-22 | 73 |
| 2026-08-23 | 55 |
| 2026-08-24 | 193 |
| 2026-08-25 | 179 |
| 2026-08-26 | 158 |
| 2026-08-27 | 182 |
| 2026-08-28 | 171 |
| 2026-08-29 | 70 |
| 2026-08-30 | 50 |
| 2026-08-31 | 193 |
| 2026-09-01 | 212 |
| 2026-09-02 | 188 |
| 2026-09-03 | 195 |
| 2026-09-04 | 191 |
| 2026-09-05 | 80 |
| 2026-09-06 | 48 |
| 2026-09-07 | 168 |
| 2026-09-08 | 199 |
| 2026-09-09 | 177 |
| 2026-09-10 | 167 |
| 2026-09-11 | 180 |
| 2026-09-12 | 90 |
| 2026-09-13 | 55 |
| 2026-09-14 | 180 |
| 2026-09-15 | 225 |
| 2026-09-16 | 214 |
| 2026-09-17 | 173 |
| 2026-09-18 | 164 |
| 2026-09-19 | 86 |
| 2026-09-20 | 52 |
| 2026-09-21 | 150 |
| 2026-09-22 | 200 |
| 2026-09-23 | 224 |
| 2026-09-24 | 191 |
| 2026-09-25 | 171 |
| 2026-09-26 | 96 |
| 2026-09-27 | 65 |
| 2026-09-28 | 167 |
| 2026-09-29 | 192 |
| 2026-09-30 | 222 |

As CSV:

```csv
day,orders
2026-04-01,144
2026-04-02,156
2026-04-03,115
2026-04-04,48
2026-04-05,40
2026-04-06,126
2026-04-07,112
2026-04-08,119
2026-04-09,145
2026-04-10,123
2026-04-11,51
2026-04-12,41
2026-04-13,148
2026-04-14,140
2026-04-15,128
2026-04-16,143
2026-04-17,127
2026-04-18,49
2026-04-19,34
2026-04-20,131
2026-04-21,142
2026-04-22,128
2026-04-23,142
2026-04-24,144
2026-04-25,62
2026-04-26,39
2026-04-27,136
2026-04-28,154
2026-04-29,131
2026-04-30,120
2026-05-01,125
2026-05-02,60
2026-05-03,37
2026-05-04,127
2026-05-05,165
2026-05-06,161
2026-05-07,138
2026-05-08,134
2026-05-09,68
2026-05-10,40
2026-05-11,113
2026-05-12,145
2026-05-13,154
2026-05-14,128
2026-05-15,118
2026-05-16,69
2026-05-17,48
2026-05-18,130
2026-05-19,156
2026-05-20,179
2026-05-21,150
2026-05-22,113
2026-05-23,62
2026-05-24,46
2026-05-25,119
2026-05-26,131
2026-05-27,170
2026-05-28,166
2026-05-29,126
2026-05-30,66
2026-05-31,53
2026-06-01,147
2026-06-02,136
2026-06-03,160
2026-06-04,165
2026-06-05,118
2026-06-06,54
2026-06-07,48
2026-06-08,153
2026-06-09,144
2026-06-10,164
2026-06-11,189
2026-06-12,149
2026-06-13,60
2026-06-14,48
2026-06-15,158
2026-06-16,142
2026-06-17,136
2026-06-18,164
2026-06-19,147
2026-06-20,60
2026-06-21,46
2026-06-22,174
2026-06-23,177
2026-06-24,158
2026-06-25,170
2026-06-26,159
2026-06-27,63
2026-06-28,40
2026-06-29,149
2026-06-30,170
2026-07-01,151
2026-07-02,156
2026-07-03,165
2026-07-04,77
2026-07-05,47
2026-07-06,159
2026-07-07,191
2026-07-08,170
2026-07-09,143
2026-07-10,144
2026-07-11,72
2026-07-12,44
2026-07-13,138
2026-07-14,186
2026-07-15,195
2026-07-16,165
2026-07-17,154
2026-07-18,83
2026-07-19,52
2026-07-20,138
2026-07-21,168
2026-07-22,187
2026-07-23,154
2026-07-24,129
2026-07-25,76
2026-07-26,56
2026-07-27,153
2026-07-28,177
2026-07-29,214
2026-07-30,191
2026-07-31,139
2026-08-01,72
2026-08-02,56
2026-08-03,146
2026-08-04,146
2026-08-05,187
2026-08-06,195
2026-08-07,146
2026-08-08,73
2026-08-09,62
2026-08-10,184
2026-08-11,167
2026-08-12,187
2026-08-13,201
2026-08-14,147
2026-08-15,62
2026-08-16,53
2026-08-17,178
2026-08-18,166
2026-08-19,178
2026-08-20,215
2026-08-21,182
2026-08-22,73
2026-08-23,55
2026-08-24,193
2026-08-25,179
2026-08-26,158
2026-08-27,182
2026-08-28,171
2026-08-29,70
2026-08-30,50
2026-08-31,193
2026-09-01,212
2026-09-02,188
2026-09-03,195
2026-09-04,191
2026-09-05,80
2026-09-06,48
2026-09-07,168
2026-09-08,199
2026-09-09,177
2026-09-10,167
2026-09-11,180
2026-09-12,90
2026-09-13,55
2026-09-14,180
2026-09-15,225
2026-09-16,214
2026-09-17,173
2026-09-18,164
2026-09-19,86
2026-09-20,52
2026-09-21,150
2026-09-22,200
2026-09-23,224
2026-09-24,191
2026-09-25,171
2026-09-26,96
2026-09-27,65
2026-09-28,167
2026-09-29,192
2026-09-30,222
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "order-calendar",
  "title": "Daily orders",
  "subtitle": "{first:day} to {last:day}",
  "description": "Orders per day, to spot weekly rhythm, quiet weekends and growth.",
  "source": {
    "name": "Order system"
  },
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "day": "2026-04-01",
        "orders": 144
      },
      {
        "day": "2026-04-02",
        "orders": 156
      },
      {
        "day": "2026-04-03",
        "orders": 115
      }
    ]
  },
  "fields": {
    "orders": {
      "label": "Orders",
      "format": "number"
    },
    "day": {
      "label": "Day",
      "format": {
        "type": "date",
        "style": "medium"
      }
    }
  },
  "headline": {
    "value": "orders",
    "agg": "sum",
    "caption": "orders in {count} days"
  },
  "view": {
    "type": "calendar",
    "date": "day",
    "value": "orders"
  },
  "i18n": {
    "fr": {
      "title": "Commandes quotidiennes",
      "subtitle": "{first:day} au {last:day}",
      "description": "Commandes par jour : rythme hebdomadaire, week-ends calmes et croissance.",
      "source": {
        "name": "Système de commandes"
      },
      "fields": {
        "orders": {
          "label": "Commandes"
        },
        "day": {
          "label": "Jour"
        }
      },
      "headline": {
        "caption": "commandes en {count} jours"
      }
    },
    "de": {
      "title": "Tägliche Bestellungen",
      "subtitle": "{first:day} bis {last:day}",
      "description": "Bestellungen je Tag: Wochenrhythmus, ruhige Wochenenden und Wachstum.",
      "source": {
        "name": "Bestellsystem"
      },
      "fields": {
        "orders": {
          "label": "Bestellungen"
        },
        "day": {
          "label": "Tag"
        }
      },
      "headline": {
        "caption": "Bestellungen in {count} Tagen"
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `area` | fits | different | Answers a different question: better for how each group or period splits and trend over time, but gives up patterns across two dimensions or a cycle. | `{"type":"area","x":"day","y":"orders"}` |
| `line` | fits | different | Answers a different question: better for comparing amounts across categories and actual against target or plan, but gives up patterns across two dimensions or a cycle. Shows the trend across days instead of the weekday pattern. | `{"type":"line","x":"day","y":"orders"}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up patterns across two dimensions or a cycle. | `{"type":"beeswarm","value":"orders"}` |
| `histogram` | fits | different | Answers a different question: better for how values spread, but gives up patterns across two dimensions or a cycle. | `{"type":"histogram","value":"orders"}` |
| `kpi` | fits | different | Answers a different question: better for a headline number, but gives up patterns across two dimensions or a cycle. | `{"type":"kpi","value":"orders"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up patterns across two dimensions or a cycle. | `{"type":"table"}` |
| `boxplot` | fits | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"boxplot","value":"orders"}` |
| `horizon` | fits | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"horizon","x":"day","y":"orders"}` |
| `icicle` | fits | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"icicle","levels":"day","value":"orders"}` |
| `kpis` | fits | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"orders"}]}` |
| `ridgeline` | fits | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"orders","group":"day"}` |
| `rose` | stretch: 183 rows: this chart crowds past about 36. | same | Keeps the job (patterns across two dimensions or a cycle) with a different look. | `{"type":"rose","label":"day","y":"orders"}` |
| `list` | stretch: 183 rows: this chart crowds past about 20. | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up patterns across two dimensions or a cycle. | `{"type":"list","label":"day","value":"orders"}` |
| `bar` | stretch: 183 rows: this chart crowds past about 16. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"bar","x":"day","y":"orders"}` |
| `donut` | stretch: 183 rows: this chart crowds past about 6. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"donut","label":"day","value":"orders"}` |
| `dot` | stretch: 183 rows: this chart crowds past about 30. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"dot","label":"day","value":"orders"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 183 rows. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"gauge","value":"orders"}` |
| `hbar` | stretch: 183 rows: this chart crowds past about 30. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"hbar","label":"day","value":"orders"}` |
| `pareto` | stretch: 183 rows: this chart crowds past about 25. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"pareto","label":"day","value":"orders"}` |
| `pie` | stretch: 183 rows: this chart crowds past about 6. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"pie","label":"day","value":"orders"}` |
| `radar` | stretch: 183 rows: this chart crowds past about 12. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"radar","label":"day","y":"orders"}` |
| `sunburst` | stretch: 183 rows: this chart crowds past about 120. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"day","value":"orders"}` |
| `treemap` | stretch: 183 rows: this chart crowds past about 120. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"treemap","label":"day","value":"orders"}` |
| `waffle` | stretch: 183 rows: this chart crowds past about 5. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"waffle","label":"day","value":"orders"}` |

Not possible with this data: `anomalies` (needs a separate column for metric (it would reuse "day", already the x)); `board` (needs a separate column for stage (it would reuse "day", already the label)); `bullet` (needs a separate column for target (it would reuse "orders", already the value)); `bump` (needs a separate column for series (it would reuse "day", already the x)); `candlestick` (needs a separate column for high (it would reuse "orders", already the open)); `chord` (needs a separate column for target (it would reuse "day", already the source)); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (needs a separate column for y2 (it would reuse "orders", already the y)); `dumbbell` (needs a separate column for to (it would reuse "orders", already the from)); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "day", already the x)); `history` (needs a separate column for title (it would reuse "day", already the date)); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `marimekko` (needs a separate column for series (it would reuse "day", already the x)); `matrix` (needs a separate column for y (it would reuse "day", already the x)); `meter` (needs a separate column for target (it would reuse "orders", already the value)); `pyramid` (needs a separate column for right (it would reuse "orders", already the left)); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (needs a separate column for period (it would reuse "day", already the label)); `rings` (needs a separate column for target (it would reuse "orders", already the value)); `sankey` (needs a separate column for target (it would reuse "day", already the source)); `scatter` (needs a separate column for y (it would reuse "orders", already the x)); `slope` (needs a separate column for to (it would reuse "orders", already the from)); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (needs a separate column for start (it would reuse "day", already the label)); `variance` (needs a separate column for target (it would reuse "orders", already the value)); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (needs a separate column for column (it would reuse "day", already the row)); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
