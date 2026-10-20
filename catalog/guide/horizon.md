# `horizon` chart

Many time series at once, each in a thin row: values are measured from a baseline and folded into bands of deepening color, blue above and red below, so a dozen series fit where one line chart would. For spotting which series run hot or cold, and when. Pointing at a period lists every series there.

## What it is for

- Trend over time: best
- Comparing amounts across categories: good
- Actual against target or plan: possible

**Best for**

- Many series over time in little space: six to twenty regions, servers or stores
- Deviation from plan, day by day, in operations monitoring

**Least useful for**

- General audiences and exact values (use line)
- One or two series

## The data it needs

**One row is**: One row per point in time, in order.

**How the chart is built**: One thin row per y field; each value is measured from a baseline and folded into bands of deepening color, blue above and red below.

**Rows it reads well with**: 10 to any number.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `x` | date | yes | Field for the ordered axis, usually a date. |
| `y` | number (one or more) | yes | Field or fields, one row each, such as a region's revenue against plan. |

## This example's columns (7 columns, 92 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `day` (Day) | date | `x` | 92 different, e.g. "2026-07-01", "2026-07-02", "2026-07-03" |
| `North` | number | `y` | -900 to 5000 |
| `South` | number | `y` | -14600 to 3500 |
| `East` | number | `y` | 1800 to 20500 |
| `West` | number | `y` | -8900 to 4900 |
| `Central` | number | `y` | -5000 to 11500 |
| `Online` | number | `y` | -13400 to 12300 |

## The data drawing it now

| day | North | South | East | West | Central | Online |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-01 | 1700 | 1300 | 6500 | 2900 | -3000 | 700 |
| 2026-07-02 | 100 | 1100 | 4900 | 4200 | -4600 | 0 |
| 2026-07-03 | -500 | 2500 | 5500 | 1200 | -1100 | 6700 |
| 2026-07-04 | 2900 | 1600 | 2400 | -8900 | -2900 | 900 |
| 2026-07-05 | 100 | -300 | 1800 | -7100 | -3200 | 8500 |
| 2026-07-06 | 2100 | 1700 | 4800 | 3600 | -3200 | 5200 |
| 2026-07-07 | 5000 | 3500 | 7000 | 3800 | -3700 | 5800 |
| 2026-07-08 | 700 | -1100 | 6700 | 2600 | -1600 | 7900 |
| 2026-07-09 | 4700 | 2700 | 2200 | 1800 | -1400 | 9200 |
| 2026-07-10 | 4900 | 500 | 2800 | 3500 | -1900 | 8000 |
| 2026-07-11 | -500 | 200 | 8300 | -6000 | -4500 | 8000 |
| 2026-07-12 | -400 | -1200 | 7500 | -8300 | -2800 | 9500 |
| 2026-07-13 | 100 | 2200 | 3600 | 3600 | -4500 | 9000 |
| 2026-07-14 | 300 | -200 | 8800 | 4200 | -3800 | 12200 |
| 2026-07-15 | 300 | 500 | 8300 | 3600 | -4600 | 12300 |
| 2026-07-16 | 300 | -200 | 7900 | 2300 | -3800 | 4000 |
| 2026-07-17 | -500 | 1400 | 4900 | 3400 | -3500 | 5900 |
| 2026-07-18 | 4800 | 900 | 7100 | -5500 | -4300 | 2300 |
| 2026-07-19 | 4500 | 2600 | 5300 | -8200 | -2000 | 7200 |
| 2026-07-20 | 200 | 3300 | 9200 | 3400 | -3300 | -1000 |
| 2026-07-21 | -800 | 3300 | 5500 | 3800 | -4000 | 3200 |
| 2026-07-22 | 2600 | 0 | 5300 | 3900 | -4700 | -3100 |
| 2026-07-23 | 2400 | 2800 | 8100 | 2100 | -1300 | -4800 |
| 2026-07-24 | -900 | -200 | 7200 | 1200 | -4300 | -4900 |
| 2026-07-25 | 2400 | -800 | 6900 | -5400 | -1100 | -4000 |
| 2026-07-26 | 3100 | 1400 | 5700 | -8900 | -4900 | -3200 |
| 2026-07-27 | 3200 | 3300 | 5100 | 3500 | -3100 | -5700 |
| 2026-07-28 | 900 | 3500 | 5600 | 3200 | -2100 | -5300 |
| 2026-07-29 | 3400 | 2000 | 10100 | 4700 | -3600 | -7700 |
| 2026-07-30 | 4400 | 2800 | 8000 | 4200 | -1500 | -9100 |
| 2026-07-31 | 2700 | 400 | 9100 | 3400 | -4700 | -8800 |
| 2026-08-01 | 5000 | 2800 | 10100 | -7400 | -2100 | -9300 |
| 2026-08-02 | 1600 | 2600 | 6400 | -6000 | -4900 | -9000 |
| 2026-08-03 | 1900 | -600 | 10300 | 3000 | -2500 | -6000 |
| 2026-08-04 | 500 | -1900 | 8000 | 3700 | -4200 | -11300 |
| 2026-08-05 | 4400 | 900 | 9000 | 4600 | -3700 | -6500 |
| 2026-08-06 | 200 | -800 | 11400 | 4700 | -1500 | -7700 |
| 2026-08-07 | 2500 | -2300 | 7500 | 3000 | -1700 | -2800 |
| 2026-08-08 | 3300 | -300 | 8500 | -8300 | -3200 | -6000 |
| 2026-08-09 | 300 | -4600 | 10800 | -7000 | -3700 | -100 |
| 2026-08-10 | 4900 | -6200 | 7600 | 1100 | -1500 | -5000 |
| 2026-08-11 | 3300 | -7600 | 9200 | 4200 | -4900 | -2700 |
| 2026-08-12 | 1700 | -12300 | 12400 | 1900 | -4400 | -1900 |
| 2026-08-13 | 2800 | -11800 | 11400 | 3600 | -1800 | 6900 |
| 2026-08-14 | 3100 | -14100 | 10600 | 1700 | -5000 | 4400 |
| 2026-08-15 | 3300 | -14600 | 9600 | -7600 | -2200 | 6100 |
| 2026-08-16 | 2700 | -11300 | 10400 | -5800 | -1400 | 3800 |
| 2026-08-17 | 4600 | -10400 | 9000 | 2800 | -2500 | 11400 |
| 2026-08-18 | 1300 | -9600 | 13700 | 4200 | -1200 | 8600 |
| 2026-08-19 | 2900 | -9500 | 12900 | 4300 | -2400 | 11200 |
| 2026-08-20 | 300 | -4000 | 14600 | 4900 | -2900 | 12200 |
| 2026-08-21 | 900 | -2100 | 14000 | 2400 | -4700 | 9500 |
| 2026-08-22 | 2300 | -1200 | 11900 | -8900 | -1800 | 6400 |
| 2026-08-23 | 3800 | -3000 | 11200 | -5800 | -4400 | 6700 |
| 2026-08-24 | 2100 | 600 | 14300 | 3800 | -1200 | 8900 |
| 2026-08-25 | 4700 | -1900 | 10800 | 3100 | -3800 | 10000 |
| 2026-08-26 | 2800 | 600 | 14700 | 3200 | -3800 | 6300 |
| 2026-08-27 | 4100 | 2700 | 11000 | 4400 | -1100 | 6300 |
| 2026-08-28 | 2400 | -600 | 13100 | 3000 | -2600 | 1000 |
| 2026-08-29 | 4800 | 1000 | 12500 | -5800 | -2700 | 3300 |
| 2026-08-30 | 3100 | -1200 | 13500 | -7300 | -1200 | 5300 |
| 2026-08-31 | 600 | 900 | 11100 | 2700 | -1700 | 3600 |
| 2026-09-01 | 1900 | 100 | 11700 | 3500 | 2100 | -4100 |
| 2026-09-02 | 3700 | -1400 | 11900 | 1900 | 2400 | -4100 |
| 2026-09-03 | 1100 | 1600 | 11500 | 3900 | 1100 | -4000 |
| 2026-09-04 | 500 | -500 | 14200 | 2700 | 3900 | -6100 |
| 2026-09-05 | 2200 | -700 | 12400 | -6500 | 6700 | -6400 |
| 2026-09-06 | 4100 | 1600 | 16400 | -8100 | 8700 | -5200 |
| 2026-09-07 | 4400 | 100 | 13400 | 4700 | 7600 | -4600 |
| 2026-09-08 | 4300 | -800 | 13100 | 3900 | 7800 | -12500 |
| 2026-09-09 | 4000 | 600 | 16500 | 1500 | 8500 | -8300 |
| 2026-09-10 | -900 | -500 | 16000 | 4600 | 11300 | -13100 |
| 2026-09-11 | 2000 | 2300 | 15100 | 3700 | 7400 | -13400 |
| 2026-09-12 | -400 | -1300 | 15500 | -6900 | 9300 | -12600 |
| 2026-09-13 | 100 | -500 | 17400 | -5000 | 11100 | -12500 |
| 2026-09-14 | -600 | 3300 | 15300 | 4100 | 8100 | -8800 |
| 2026-09-15 | 2100 | 700 | 16300 | 1100 | 10000 | -4900 |
| 2026-09-16 | 100 | 800 | 17300 | 2600 | 7500 | -9300 |
| 2026-09-17 | 2100 | -1400 | 18400 | 4200 | 10000 | -2500 |
| 2026-09-18 | 2800 | 500 | 16800 | 3000 | 11400 | -1600 |
| 2026-09-19 | 500 | 3100 | 17800 | -5900 | 10600 | -3300 |
| 2026-09-20 | 4400 | 2900 | 17600 | -5900 | 10300 | -1800 |
| 2026-09-21 | 3300 | -1100 | 15700 | 2900 | 6600 | -700 |
| 2026-09-22 | 2800 | 1600 | 15200 | 4800 | 9800 | 700 |
| 2026-09-23 | 3000 | 1300 | 17100 | 2600 | 11500 | 4600 |
| 2026-09-24 | 3200 | 2300 | 20000 | 1100 | 9600 | 6800 |
| 2026-09-25 | 500 | 500 | 14500 | 1800 | 8400 | 3000 |
| 2026-09-26 | 500 | 3000 | 17700 | -7000 | 11300 | 7800 |
| 2026-09-27 | 5000 | 1700 | 19400 | -8700 | 9500 | 10300 |
| 2026-09-28 | -700 | 3200 | 15700 | 2900 | 7300 | 9000 |
| 2026-09-29 | 2700 | -1200 | 20500 | 2700 | 9100 | 10400 |
| 2026-09-30 | 1200 | -100 | 18900 | 3200 | 7900 | 11600 |

As CSV:

```csv
day,North,South,East,West,Central,Online
2026-07-01,1700,1300,6500,2900,-3000,700
2026-07-02,100,1100,4900,4200,-4600,0
2026-07-03,-500,2500,5500,1200,-1100,6700
2026-07-04,2900,1600,2400,-8900,-2900,900
2026-07-05,100,-300,1800,-7100,-3200,8500
2026-07-06,2100,1700,4800,3600,-3200,5200
2026-07-07,5000,3500,7000,3800,-3700,5800
2026-07-08,700,-1100,6700,2600,-1600,7900
2026-07-09,4700,2700,2200,1800,-1400,9200
2026-07-10,4900,500,2800,3500,-1900,8000
2026-07-11,-500,200,8300,-6000,-4500,8000
2026-07-12,-400,-1200,7500,-8300,-2800,9500
2026-07-13,100,2200,3600,3600,-4500,9000
2026-07-14,300,-200,8800,4200,-3800,12200
2026-07-15,300,500,8300,3600,-4600,12300
2026-07-16,300,-200,7900,2300,-3800,4000
2026-07-17,-500,1400,4900,3400,-3500,5900
2026-07-18,4800,900,7100,-5500,-4300,2300
2026-07-19,4500,2600,5300,-8200,-2000,7200
2026-07-20,200,3300,9200,3400,-3300,-1000
2026-07-21,-800,3300,5500,3800,-4000,3200
2026-07-22,2600,0,5300,3900,-4700,-3100
2026-07-23,2400,2800,8100,2100,-1300,-4800
2026-07-24,-900,-200,7200,1200,-4300,-4900
2026-07-25,2400,-800,6900,-5400,-1100,-4000
2026-07-26,3100,1400,5700,-8900,-4900,-3200
2026-07-27,3200,3300,5100,3500,-3100,-5700
2026-07-28,900,3500,5600,3200,-2100,-5300
2026-07-29,3400,2000,10100,4700,-3600,-7700
2026-07-30,4400,2800,8000,4200,-1500,-9100
2026-07-31,2700,400,9100,3400,-4700,-8800
2026-08-01,5000,2800,10100,-7400,-2100,-9300
2026-08-02,1600,2600,6400,-6000,-4900,-9000
2026-08-03,1900,-600,10300,3000,-2500,-6000
2026-08-04,500,-1900,8000,3700,-4200,-11300
2026-08-05,4400,900,9000,4600,-3700,-6500
2026-08-06,200,-800,11400,4700,-1500,-7700
2026-08-07,2500,-2300,7500,3000,-1700,-2800
2026-08-08,3300,-300,8500,-8300,-3200,-6000
2026-08-09,300,-4600,10800,-7000,-3700,-100
2026-08-10,4900,-6200,7600,1100,-1500,-5000
2026-08-11,3300,-7600,9200,4200,-4900,-2700
2026-08-12,1700,-12300,12400,1900,-4400,-1900
2026-08-13,2800,-11800,11400,3600,-1800,6900
2026-08-14,3100,-14100,10600,1700,-5000,4400
2026-08-15,3300,-14600,9600,-7600,-2200,6100
2026-08-16,2700,-11300,10400,-5800,-1400,3800
2026-08-17,4600,-10400,9000,2800,-2500,11400
2026-08-18,1300,-9600,13700,4200,-1200,8600
2026-08-19,2900,-9500,12900,4300,-2400,11200
2026-08-20,300,-4000,14600,4900,-2900,12200
2026-08-21,900,-2100,14000,2400,-4700,9500
2026-08-22,2300,-1200,11900,-8900,-1800,6400
2026-08-23,3800,-3000,11200,-5800,-4400,6700
2026-08-24,2100,600,14300,3800,-1200,8900
2026-08-25,4700,-1900,10800,3100,-3800,10000
2026-08-26,2800,600,14700,3200,-3800,6300
2026-08-27,4100,2700,11000,4400,-1100,6300
2026-08-28,2400,-600,13100,3000,-2600,1000
2026-08-29,4800,1000,12500,-5800,-2700,3300
2026-08-30,3100,-1200,13500,-7300,-1200,5300
2026-08-31,600,900,11100,2700,-1700,3600
2026-09-01,1900,100,11700,3500,2100,-4100
2026-09-02,3700,-1400,11900,1900,2400,-4100
2026-09-03,1100,1600,11500,3900,1100,-4000
2026-09-04,500,-500,14200,2700,3900,-6100
2026-09-05,2200,-700,12400,-6500,6700,-6400
2026-09-06,4100,1600,16400,-8100,8700,-5200
2026-09-07,4400,100,13400,4700,7600,-4600
2026-09-08,4300,-800,13100,3900,7800,-12500
2026-09-09,4000,600,16500,1500,8500,-8300
2026-09-10,-900,-500,16000,4600,11300,-13100
2026-09-11,2000,2300,15100,3700,7400,-13400
2026-09-12,-400,-1300,15500,-6900,9300,-12600
2026-09-13,100,-500,17400,-5000,11100,-12500
2026-09-14,-600,3300,15300,4100,8100,-8800
2026-09-15,2100,700,16300,1100,10000,-4900
2026-09-16,100,800,17300,2600,7500,-9300
2026-09-17,2100,-1400,18400,4200,10000,-2500
2026-09-18,2800,500,16800,3000,11400,-1600
2026-09-19,500,3100,17800,-5900,10600,-3300
2026-09-20,4400,2900,17600,-5900,10300,-1800
2026-09-21,3300,-1100,15700,2900,6600,-700
2026-09-22,2800,1600,15200,4800,9800,700
2026-09-23,3000,1300,17100,2600,11500,4600
2026-09-24,3200,2300,20000,1100,9600,6800
2026-09-25,500,500,14500,1800,8400,3000
2026-09-26,500,3000,17700,-7000,11300,7800
2026-09-27,5000,1700,19400,-8700,9500,10300
2026-09-28,-700,3200,15700,2900,7300,9000
2026-09-29,2700,-1200,20500,2700,9100,10400
2026-09-30,1200,-100,18900,3200,7900,11600
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "region-plan-horizon",
  "title": "Daily revenue against plan",
  "subtitle": "By region, {first:day} to {last:day}",
  "description": "Each region's daily revenue against plan, blue above and red below. East beats plan every day, by about €6K a day in July and €16K by September. South falls behind in mid-August, worst on Aug 15 at €14.6K under. West misses every weekend, Central turns positive with September's campaign, and Online swings both ways.",
  "footer": "Source: finance ledger and daily plan",
  "locale": "en-US",
  "data": {
    "type": "inline",
    "rows": [
      {
        "day": "2026-07-01",
        "North": 1700,
        "South": 1300,
        "East": 6500,
        "West": 2900,
        "Central": -3000,
        "Online": 700
      },
      {
        "day": "2026-07-02",
        "North": 100,
        "South": 1100,
        "East": 4900,
        "West": 4200,
        "Central": -4600,
        "Online": 0
      },
      {
        "day": "2026-07-03",
        "North": -500,
        "South": 2500,
        "East": 5500,
        "West": 1200,
        "Central": -1100,
        "Online": 6700
      }
    ]
  },
  "fields": {
    "day": {
      "label": "Day",
      "format": {
        "type": "date",
        "style": "day"
      }
    },
    "North": {
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "South": {
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "East": {
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "West": {
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "Central": {
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    },
    "Online": {
      "format": {
        "type": "currency",
        "currency": "EUR",
        "compact": true
      }
    }
  },
  "view": {
    "type": "horizon",
    "x": "day",
    "y": [
      "North",
      "South",
      "East",
      "West",
      "Central",
      "Online"
    ],
    "bands": 3,
    "baselineLabel": "plan"
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `area` | fits | better | Better for how each group or period splits, and still good for trend over time. | `{"type":"area","x":"day","y":["North","South"]}` |
| `line` | fits | better | Better for actual against target or plan, and still good for trend over time. | `{"type":"line","x":"day","y":["North","South"]}` |
| `calendar` | fits | trade-off | Better for patterns across two dimensions or a cycle; weaker for trend over time. | `{"type":"calendar","date":"day","value":"North"}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up trend over time. | `{"type":"beeswarm","value":"North"}` |
| `histogram` | fits | different | Answers a different question: better for how values spread, but gives up trend over time. | `{"type":"histogram","value":"North"}` |
| `kpi` | fits | different | Answers a different question: better for a headline number, but gives up trend over time. | `{"type":"kpi","value":"North","x":"day"}` |
| `scatter` | fits | different | Answers a different question: better for how two measures relate, but gives up trend over time. | `{"type":"scatter","x":"North","y":"South"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up trend over time. | `{"type":"table"}` |
| `boxplot` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"boxplot","value":"North"}` |
| `kpis` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"North"},{"value":"South"},{"value":"East"}]}` |
| `ridgeline` | fits | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"ridgeline","value":"North","group":"day"}` |
| `list` | stretch: 92 rows: this chart crowds past about 20. | different | Answers a different question: better for exact values and lookup and ranking, top to bottom, but gives up trend over time. | `{"type":"list","label":"day"}` |
| `bar` | stretch: 92 rows: this chart crowds past about 16. | worse | Weaker for trend over time, with nothing gained for this data. | `{"type":"bar","x":"day","y":["North","South"]}` |
| `donut` | stretch: 92 rows: this chart crowds past about 6. "North" has negative values, which this chart cannot draw as areas. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"donut","label":"day","value":"North"}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 92 rows. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"gauge","value":"North"}` |
| `hbar` | stretch: 92 rows: this chart crowds past about 30. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"hbar","label":"day","value":"North"}` |
| `icicle` | stretch: "North" has negative values, which this chart cannot draw as areas. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"icicle","levels":"day","value":"North"}` |
| `pareto` | stretch: 92 rows: this chart crowds past about 25. "North" has negative values, which this chart cannot draw as areas. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"pareto","label":"day","value":"North"}` |
| `radar` | stretch: 92 rows: this chart crowds past about 12. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"radar","label":"day","y":["North","South"]}` |
| `rose` | stretch: 92 rows: this chart crowds past about 36. "North" has negative values, which this chart cannot draw as areas. "South" has negative values, which this chart cannot draw as areas. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"rose","label":"day","y":["North","South"]}` |
| `sunburst` | stretch: "North" has negative values, which this chart cannot draw as areas. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"sunburst","levels":"day","value":"North"}` |
| `treemap` | stretch: "North" has negative values, which this chart cannot draw as areas. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"treemap","label":"day","value":"North"}` |
| `waffle` | stretch: 92 rows: this chart crowds past about 5. "North" has negative values, which this chart cannot draw as areas. | worse | Gives up trend over time, and this data gives it nothing better to do. | `{"type":"waffle","label":"day","value":"North"}` |

Not possible with this data: `bullet` (It needs a target, plan or budget column.); `bump` (needs a separate column for series (it would reuse "day", already the x)); `candlestick` (It needs open, high, low and close prices per period.); `chord` (needs a separate column for target (it would reuse "day", already the source)); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `heatmap` (needs a separate column for y (it would reuse "day", already the x)); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `marimekko` (needs a separate column for series (it would reuse "day", already the x)); `meter` (It needs a target, plan or budget column.); `rings` (It needs a target, plan or budget column.); `sankey` (needs a separate column for target (it would reuse "day", already the source)); `slope` (It needs the same measure at two points in time, in two columns.); `timeline` (needs a separate column for start (it would reuse "day", already the label)); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.).
