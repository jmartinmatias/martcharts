# `anomalies` chart

An anomaly tracker: one thin lane per metric over time, the band it was expected to stay in as a faint fill, the expected value as a hairline, the actual as a line, and every day it stepped outside the band as a flagged dot. The lanes with the most anomalies come first, each ending with its latest value and a count. For watching a dozen measures at once and seeing which ones need a look.

## What it is for

- Patterns across two dimensions or a cycle: best
- Trend over time: good
- Exact values and lookup: possible

**Best for**

- Watching a dozen daily measures at once and seeing which stepped out of line: net new money, fees, trades, complaints
- Operations and risk monitoring, where the exceptions matter more than the levels

**Least useful for**

- Comparing the levels of the measures with each other (each lane has its own scale; use line)
- One measure only (use line with a band)

## The data it needs

**One row is**: One row per combination of two categories, such as month and product.

**How the chart is built**: One lane per metric over the shared time axis, each on its own scale: the expected band as a faint fill, the expected value as a hairline, the actual as a line, flagged readings as alert dots; lanes sorted by how many were flagged.

**Rows it reads well with**: 14 to 3000.

| Option | Holds | Required | What it does |
| --- | --- | --- | --- |
| `x` | date | yes | Field with the date or period of each reading. |
| `metric` | category | yes | Field naming the measure each row belongs to; each measure is one lane. |
| `value` | number | yes | Field with the reading. |
| `expected` | number |  | Field with the value expected that day, drawn as a hairline through the band. |
| `low` | number |  | Field with the bottom of the expected band. Needs high too. |
| `high` | number |  | Field with the top of the expected band. Needs low too. |
| `flag` | category |  | Field that is true on anomalous readings (true, 1, "yes"). Flagged readings draw as filled dots in the alert color. Without it, readings outside the band are flagged. |

## This example's columns (7 columns, 144 rows)

| Column | Holds | Drawn as | Values |
| --- | --- | --- | --- |
| `date` (Date) | date | `x` | 24 different, e.g. "2026-10-01", "2026-10-02", "2026-10-03" |
| `metric` (Measure) | category | `metric` | 6 different, e.g. "Net new money", "Fee revenue", "Trades" |
| `value` (Reading) | number | `value` | 2 to 11936156 |
| `expected` (Expected) | number | `expected` | 2 to 10917200 |
| `low` (Low) | number | `low` | 1 to 8317200 |
| `high` (High) | number | `high` | 3 to 13517200 |
| `flag` | boolean | `flag` | 2 different, e.g. false, true |

## The data drawing it now

| date | metric | value | expected | low | high | flag |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-01 | Net new money | 2760508 | 2841600 | 1941600 | 3741600 | false |
| 2026-10-02 | Net new money | 2978321 | 2846400 | 1946400 | 3746400 | false |
| 2026-10-03 | Net new money | 342650 | 427680 | 67680 | 787680 | false |
| 2026-10-04 | Net new money | 639759 | 428400 | 68400 | 788400 | false |
| 2026-10-05 | Net new money | 2676612 | 2860800 | 1960800 | 3760800 | false |
| 2026-10-06 | Net new money | 2390137 | 2865600 | 1965600 | 3765600 | false |
| 2026-10-07 | Net new money | 2955735 | 2870400 | 1970400 | 3770400 | false |
| 2026-10-08 | Net new money | 3266782 | 2875200 | 1975200 | 3775200 | false |
| 2026-10-09 | Net new money | 2485195 | 2880000 | 1980000 | 3780000 | false |
| 2026-10-10 | Net new money | 1021747 | 432720 | 72720 | 792720 | true |
| 2026-10-11 | Net new money | 495133 | 433440 | 73440 | 793440 | false |
| 2026-10-12 | Net new money | 3231648 | 2894400 | 1994400 | 3794400 | false |
| 2026-10-13 | Net new money | 2833732 | 2899200 | 1999200 | 3799200 | false |
| 2026-10-14 | Net new money | 2788507 | 2904000 | 2004000 | 3804000 | false |
| 2026-10-15 | Net new money | 3241674 | 2908800 | 2008800 | 3808800 | false |
| 2026-10-16 | Net new money | 3444002 | 2913600 | 2013600 | 3813600 | false |
| 2026-10-17 | Net new money | 411483 | 437760 | 77760 | 797760 | false |
| 2026-10-18 | Net new money | 454265 | 438480 | 78480 | 798480 | false |
| 2026-10-19 | Net new money | 2729051 | 2928000 | 2028000 | 3828000 | false |
| 2026-10-20 | Net new money | 2574384 | 2932800 | 2032800 | 3832800 | false |
| 2026-10-21 | Net new money | 3006906 | 2937600 | 2037600 | 3837600 | false |
| 2026-10-22 | Net new money | 2911698 | 2942400 | 2042400 | 3842400 | false |
| 2026-10-23 | Net new money | 3259472 | 2947200 | 2047200 | 3847200 | false |
| 2026-10-24 | Net new money | 448393 | 442800 | 82800 | 802800 | false |
| 2026-10-01 | Fee revenue | 190573 | 202020 | 174020 | 230020 | false |
| 2026-10-02 | Fee revenue | 211411 | 202205 | 174205 | 230205 | false |
| 2026-10-03 | Fee revenue | 59232 | 60717 | 49517 | 71917 | false |
| 2026-10-04 | Fee revenue | 65839 | 60773 | 49573 | 71973 | false |
| 2026-10-05 | Fee revenue | 218513 | 202760 | 174760 | 230760 | false |
| 2026-10-06 | Fee revenue | 206701 | 202945 | 174945 | 230945 | false |
| 2026-10-07 | Fee revenue | 195003 | 203130 | 175130 | 231130 | false |
| 2026-10-08 | Fee revenue | 206498 | 203315 | 175315 | 231315 | false |
| 2026-10-09 | Fee revenue | 208985 | 203500 | 175500 | 231500 | false |
| 2026-10-10 | Fee revenue | 61099 | 61106 | 49906 | 72306 | false |
| 2026-10-11 | Fee revenue | 56917 | 61161 | 49961 | 72361 | false |
| 2026-10-12 | Fee revenue | 215672 | 204055 | 176055 | 232055 | false |
| 2026-10-13 | Fee revenue | 211844 | 204240 | 176240 | 232240 | false |
| 2026-10-14 | Fee revenue | 202789 | 204425 | 176425 | 232425 | false |
| 2026-10-15 | Fee revenue | 195767 | 204610 | 176610 | 232610 | false |
| 2026-10-16 | Fee revenue | 205812 | 204795 | 176795 | 232795 | false |
| 2026-10-17 | Fee revenue | 59045 | 61494 | 50294 | 72694 | false |
| 2026-10-18 | Fee revenue | 62357 | 61550 | 50350 | 72750 | false |
| 2026-10-19 | Fee revenue | 247977 | 205350 | 177350 | 233350 | true |
| 2026-10-20 | Fee revenue | 202168 | 205535 | 177535 | 233535 | false |
| 2026-10-21 | Fee revenue | 220208 | 205720 | 177720 | 233720 | false |
| 2026-10-22 | Fee revenue | 203679 | 205905 | 177905 | 233905 | false |
| 2026-10-23 | Fee revenue | 213532 | 206090 | 178090 | 234090 | false |
| 2026-10-24 | Fee revenue | 62432 | 61883 | 50683 | 73083 | false |
| 2026-10-01 | Trades | 518 | 478 | 408 | 548 | false |
| 2026-10-02 | Trades | 465 | 479 | 409 | 549 | false |
| 2026-10-03 | Trades | 95 | 96 | 68 | 124 | false |
| 2026-10-04 | Trades | 95 | 96 | 68 | 124 | false |
| 2026-10-05 | Trades | 522 | 480 | 410 | 550 | false |
| 2026-10-06 | Trades | 473 | 481 | 411 | 551 | false |
| 2026-10-07 | Trades | 443 | 482 | 412 | 552 | false |
| 2026-10-08 | Trades | 378 | 482 | 412 | 552 | true |
| 2026-10-09 | Trades | 475 | 483 | 413 | 553 | false |
| 2026-10-10 | Trades | 92 | 97 | 69 | 125 | false |
| 2026-10-11 | Trades | 92 | 97 | 69 | 125 | false |
| 2026-10-12 | Trades | 480 | 485 | 415 | 555 | false |
| 2026-10-13 | Trades | 455 | 486 | 416 | 556 | false |
| 2026-10-14 | Trades | 470 | 486 | 416 | 556 | false |
| 2026-10-15 | Trades | 474 | 487 | 417 | 557 | false |
| 2026-10-16 | Trades | 463 | 487 | 417 | 557 | false |
| 2026-10-17 | Trades | 82 | 98 | 70 | 126 | false |
| 2026-10-18 | Trades | 83 | 98 | 70 | 126 | false |
| 2026-10-19 | Trades | 519 | 489 | 419 | 559 | false |
| 2026-10-20 | Trades | 472 | 490 | 420 | 560 | false |
| 2026-10-21 | Trades | 498 | 491 | 421 | 561 | false |
| 2026-10-22 | Trades | 511 | 491 | 421 | 561 | false |
| 2026-10-23 | Trades | 478 | 492 | 422 | 562 | false |
| 2026-10-24 | Trades | 105 | 98 | 70 | 126 | false |
| 2026-10-01 | Complaints | 5 | 6 | 4 | 9 | false |
| 2026-10-02 | Complaints | 7 | 6 | 4 | 9 | false |
| 2026-10-03 | Complaints | 3 | 2 | 1 | 3 | false |
| 2026-10-04 | Complaints | 2 | 2 | 1 | 3 | false |
| 2026-10-05 | Complaints | 5 | 6 | 4 | 9 | false |
| 2026-10-06 | Complaints | 6 | 6 | 4 | 9 | false |
| 2026-10-07 | Complaints | 6 | 6 | 4 | 9 | false |
| 2026-10-08 | Complaints | 7 | 6 | 4 | 9 | false |
| 2026-10-09 | Complaints | 7 | 6 | 4 | 9 | false |
| 2026-10-10 | Complaints | 2 | 2 | 1 | 3 | false |
| 2026-10-11 | Complaints | 2 | 2 | 1 | 3 | false |
| 2026-10-12 | Complaints | 5 | 6 | 4 | 9 | false |
| 2026-10-13 | Complaints | 7 | 6 | 4 | 9 | false |
| 2026-10-14 | Complaints | 5 | 6 | 4 | 9 | false |
| 2026-10-15 | Complaints | 7 | 6 | 4 | 9 | false |
| 2026-10-16 | Complaints | 5 | 6 | 4 | 9 | false |
| 2026-10-17 | Complaints | 2 | 2 | 1 | 3 | false |
| 2026-10-18 | Complaints | 2 | 2 | 1 | 3 | false |
| 2026-10-19 | Complaints | 7 | 6 | 4 | 9 | false |
| 2026-10-20 | Complaints | 5 | 6 | 4 | 9 | false |
| 2026-10-21 | Complaints | 11 | 6 | 4 | 9 | true |
| 2026-10-22 | Complaints | 6 | 6 | 4 | 9 | false |
| 2026-10-23 | Complaints | 5 | 6 | 4 | 9 | false |
| 2026-10-24 | Complaints | 2 | 2 | 1 | 3 | false |
| 2026-10-01 | Logins | 3793 | 3813 | 3413 | 4213 | false |
| 2026-10-02 | Logins | 3578 | 3821 | 3421 | 4221 | false |
| 2026-10-03 | Logins | 1815 | 1723 | 1543 | 1903 | false |
| 2026-10-04 | Logins | 1668 | 1726 | 1546 | 1906 | false |
| 2026-10-05 | Logins | 3722 | 3844 | 3444 | 4244 | false |
| 2026-10-06 | Logins | 3919 | 3852 | 3452 | 4252 | false |
| 2026-10-07 | Logins | 3672 | 3860 | 3460 | 4260 | false |
| 2026-10-08 | Logins | 3887 | 3867 | 3467 | 4267 | false |
| 2026-10-09 | Logins | 3943 | 3875 | 3475 | 4275 | false |
| 2026-10-10 | Logins | 1784 | 1747 | 1567 | 1927 | false |
| 2026-10-11 | Logins | 1860 | 1751 | 1571 | 1931 | false |
| 2026-10-12 | Logins | 4087 | 3898 | 3498 | 4298 | false |
| 2026-10-13 | Logins | 4404 | 3906 | 3506 | 4306 | true |
| 2026-10-14 | Logins | 4035 | 3914 | 3514 | 4314 | false |
| 2026-10-15 | Logins | 3882 | 3922 | 3522 | 4322 | false |
| 2026-10-16 | Logins | 3763 | 3929 | 3529 | 4329 | false |
| 2026-10-17 | Logins | 1843 | 1772 | 1592 | 1952 | false |
| 2026-10-18 | Logins | 1848 | 1775 | 1595 | 1955 | false |
| 2026-10-19 | Logins | 4007 | 3952 | 3552 | 4352 | false |
| 2026-10-20 | Logins | 4164 | 3960 | 3560 | 4360 | false |
| 2026-10-21 | Logins | 4142 | 3968 | 3568 | 4368 | false |
| 2026-10-22 | Logins | 4069 | 3976 | 3576 | 4376 | false |
| 2026-10-23 | Logins | 4143 | 3984 | 3584 | 4384 | false |
| 2026-10-24 | Logins | 1703 | 1796 | 1616 | 1976 | false |
| 2026-10-01 | FX volume | 10878626 | 10701600 | 8101600 | 13301600 | false |
| 2026-10-02 | FX volume | 9856643 | 10711400 | 8111400 | 13311400 | false |
| 2026-10-03 | FX volume | 1289690 | 1072120 | 32120 | 2112120 | false |
| 2026-10-04 | FX volume | 3181771 | 1073100 | 33100 | 2113100 | true |
| 2026-10-05 | FX volume | 11510448 | 10740800 | 8140800 | 13340800 | false |
| 2026-10-06 | FX volume | 11747654 | 10750600 | 8150600 | 13350600 | false |
| 2026-10-07 | FX volume | 9195532 | 10760400 | 8160400 | 13360400 | false |
| 2026-10-08 | FX volume | 11316396 | 10770200 | 8170200 | 13370200 | false |
| 2026-10-09 | FX volume | 9482334 | 10780000 | 8180000 | 13380000 | false |
| 2026-10-10 | FX volume | 1414157 | 1078980 | 38980 | 2118980 | false |
| 2026-10-11 | FX volume | 576248 | 1079960 | 39960 | 2119960 | false |
| 2026-10-12 | FX volume | 11936156 | 10809400 | 8209400 | 13409400 | false |
| 2026-10-13 | FX volume | 10607485 | 10819200 | 8219200 | 13419200 | false |
| 2026-10-14 | FX volume | 9525341 | 10829000 | 8229000 | 13429000 | false |
| 2026-10-15 | FX volume | 11684795 | 10838800 | 8238800 | 13438800 | false |
| 2026-10-16 | FX volume | 10975500 | 10848600 | 8248600 | 13448600 | false |
| 2026-10-17 | FX volume | 578184 | 1085840 | 45840 | 2125840 | false |
| 2026-10-18 | FX volume | 1605718 | 1086820 | 46820 | 2126820 | false |
| 2026-10-19 | FX volume | 11612155 | 10878000 | 8278000 | 13478000 | false |
| 2026-10-20 | FX volume | 10244372 | 10887800 | 8287800 | 13487800 | false |
| 2026-10-21 | FX volume | 11044696 | 10897600 | 8297600 | 13497600 | false |
| 2026-10-22 | FX volume | 9935783 | 10907400 | 8307400 | 13507400 | false |
| 2026-10-23 | FX volume | 9553942 | 10917200 | 8317200 | 13517200 | false |
| 2026-10-24 | FX volume | 1022412 | 1092700 | 52700 | 2132700 | false |

As CSV:

```csv
date,metric,value,expected,low,high,flag
2026-10-01,Net new money,2760508,2841600,1941600,3741600,false
2026-10-02,Net new money,2978321,2846400,1946400,3746400,false
2026-10-03,Net new money,342650,427680,67680,787680,false
2026-10-04,Net new money,639759,428400,68400,788400,false
2026-10-05,Net new money,2676612,2860800,1960800,3760800,false
2026-10-06,Net new money,2390137,2865600,1965600,3765600,false
2026-10-07,Net new money,2955735,2870400,1970400,3770400,false
2026-10-08,Net new money,3266782,2875200,1975200,3775200,false
2026-10-09,Net new money,2485195,2880000,1980000,3780000,false
2026-10-10,Net new money,1021747,432720,72720,792720,true
2026-10-11,Net new money,495133,433440,73440,793440,false
2026-10-12,Net new money,3231648,2894400,1994400,3794400,false
2026-10-13,Net new money,2833732,2899200,1999200,3799200,false
2026-10-14,Net new money,2788507,2904000,2004000,3804000,false
2026-10-15,Net new money,3241674,2908800,2008800,3808800,false
2026-10-16,Net new money,3444002,2913600,2013600,3813600,false
2026-10-17,Net new money,411483,437760,77760,797760,false
2026-10-18,Net new money,454265,438480,78480,798480,false
2026-10-19,Net new money,2729051,2928000,2028000,3828000,false
2026-10-20,Net new money,2574384,2932800,2032800,3832800,false
2026-10-21,Net new money,3006906,2937600,2037600,3837600,false
2026-10-22,Net new money,2911698,2942400,2042400,3842400,false
2026-10-23,Net new money,3259472,2947200,2047200,3847200,false
2026-10-24,Net new money,448393,442800,82800,802800,false
2026-10-01,Fee revenue,190573,202020,174020,230020,false
2026-10-02,Fee revenue,211411,202205,174205,230205,false
2026-10-03,Fee revenue,59232,60717,49517,71917,false
2026-10-04,Fee revenue,65839,60773,49573,71973,false
2026-10-05,Fee revenue,218513,202760,174760,230760,false
2026-10-06,Fee revenue,206701,202945,174945,230945,false
2026-10-07,Fee revenue,195003,203130,175130,231130,false
2026-10-08,Fee revenue,206498,203315,175315,231315,false
2026-10-09,Fee revenue,208985,203500,175500,231500,false
2026-10-10,Fee revenue,61099,61106,49906,72306,false
2026-10-11,Fee revenue,56917,61161,49961,72361,false
2026-10-12,Fee revenue,215672,204055,176055,232055,false
2026-10-13,Fee revenue,211844,204240,176240,232240,false
2026-10-14,Fee revenue,202789,204425,176425,232425,false
2026-10-15,Fee revenue,195767,204610,176610,232610,false
2026-10-16,Fee revenue,205812,204795,176795,232795,false
2026-10-17,Fee revenue,59045,61494,50294,72694,false
2026-10-18,Fee revenue,62357,61550,50350,72750,false
2026-10-19,Fee revenue,247977,205350,177350,233350,true
2026-10-20,Fee revenue,202168,205535,177535,233535,false
2026-10-21,Fee revenue,220208,205720,177720,233720,false
2026-10-22,Fee revenue,203679,205905,177905,233905,false
2026-10-23,Fee revenue,213532,206090,178090,234090,false
2026-10-24,Fee revenue,62432,61883,50683,73083,false
2026-10-01,Trades,518,478,408,548,false
2026-10-02,Trades,465,479,409,549,false
2026-10-03,Trades,95,96,68,124,false
2026-10-04,Trades,95,96,68,124,false
2026-10-05,Trades,522,480,410,550,false
2026-10-06,Trades,473,481,411,551,false
2026-10-07,Trades,443,482,412,552,false
2026-10-08,Trades,378,482,412,552,true
2026-10-09,Trades,475,483,413,553,false
2026-10-10,Trades,92,97,69,125,false
2026-10-11,Trades,92,97,69,125,false
2026-10-12,Trades,480,485,415,555,false
2026-10-13,Trades,455,486,416,556,false
2026-10-14,Trades,470,486,416,556,false
2026-10-15,Trades,474,487,417,557,false
2026-10-16,Trades,463,487,417,557,false
2026-10-17,Trades,82,98,70,126,false
2026-10-18,Trades,83,98,70,126,false
2026-10-19,Trades,519,489,419,559,false
2026-10-20,Trades,472,490,420,560,false
2026-10-21,Trades,498,491,421,561,false
2026-10-22,Trades,511,491,421,561,false
2026-10-23,Trades,478,492,422,562,false
2026-10-24,Trades,105,98,70,126,false
2026-10-01,Complaints,5,6,4,9,false
2026-10-02,Complaints,7,6,4,9,false
2026-10-03,Complaints,3,2,1,3,false
2026-10-04,Complaints,2,2,1,3,false
2026-10-05,Complaints,5,6,4,9,false
2026-10-06,Complaints,6,6,4,9,false
2026-10-07,Complaints,6,6,4,9,false
2026-10-08,Complaints,7,6,4,9,false
2026-10-09,Complaints,7,6,4,9,false
2026-10-10,Complaints,2,2,1,3,false
2026-10-11,Complaints,2,2,1,3,false
2026-10-12,Complaints,5,6,4,9,false
2026-10-13,Complaints,7,6,4,9,false
2026-10-14,Complaints,5,6,4,9,false
2026-10-15,Complaints,7,6,4,9,false
2026-10-16,Complaints,5,6,4,9,false
2026-10-17,Complaints,2,2,1,3,false
2026-10-18,Complaints,2,2,1,3,false
2026-10-19,Complaints,7,6,4,9,false
2026-10-20,Complaints,5,6,4,9,false
2026-10-21,Complaints,11,6,4,9,true
2026-10-22,Complaints,6,6,4,9,false
2026-10-23,Complaints,5,6,4,9,false
2026-10-24,Complaints,2,2,1,3,false
2026-10-01,Logins,3793,3813,3413,4213,false
2026-10-02,Logins,3578,3821,3421,4221,false
2026-10-03,Logins,1815,1723,1543,1903,false
2026-10-04,Logins,1668,1726,1546,1906,false
2026-10-05,Logins,3722,3844,3444,4244,false
2026-10-06,Logins,3919,3852,3452,4252,false
2026-10-07,Logins,3672,3860,3460,4260,false
2026-10-08,Logins,3887,3867,3467,4267,false
2026-10-09,Logins,3943,3875,3475,4275,false
2026-10-10,Logins,1784,1747,1567,1927,false
2026-10-11,Logins,1860,1751,1571,1931,false
2026-10-12,Logins,4087,3898,3498,4298,false
2026-10-13,Logins,4404,3906,3506,4306,true
2026-10-14,Logins,4035,3914,3514,4314,false
2026-10-15,Logins,3882,3922,3522,4322,false
2026-10-16,Logins,3763,3929,3529,4329,false
2026-10-17,Logins,1843,1772,1592,1952,false
2026-10-18,Logins,1848,1775,1595,1955,false
2026-10-19,Logins,4007,3952,3552,4352,false
2026-10-20,Logins,4164,3960,3560,4360,false
2026-10-21,Logins,4142,3968,3568,4368,false
2026-10-22,Logins,4069,3976,3576,4376,false
2026-10-23,Logins,4143,3984,3584,4384,false
2026-10-24,Logins,1703,1796,1616,1976,false
2026-10-01,FX volume,10878626,10701600,8101600,13301600,false
2026-10-02,FX volume,9856643,10711400,8111400,13311400,false
2026-10-03,FX volume,1289690,1072120,32120,2112120,false
2026-10-04,FX volume,3181771,1073100,33100,2113100,true
2026-10-05,FX volume,11510448,10740800,8140800,13340800,false
2026-10-06,FX volume,11747654,10750600,8150600,13350600,false
2026-10-07,FX volume,9195532,10760400,8160400,13360400,false
2026-10-08,FX volume,11316396,10770200,8170200,13370200,false
2026-10-09,FX volume,9482334,10780000,8180000,13380000,false
2026-10-10,FX volume,1414157,1078980,38980,2118980,false
2026-10-11,FX volume,576248,1079960,39960,2119960,false
2026-10-12,FX volume,11936156,10809400,8209400,13409400,false
2026-10-13,FX volume,10607485,10819200,8219200,13419200,false
2026-10-14,FX volume,9525341,10829000,8229000,13429000,false
2026-10-15,FX volume,11684795,10838800,8238800,13438800,false
2026-10-16,FX volume,10975500,10848600,8248600,13448600,false
2026-10-17,FX volume,578184,1085840,45840,2125840,false
2026-10-18,FX volume,1605718,1086820,46820,2126820,false
2026-10-19,FX volume,11612155,10878000,8278000,13478000,false
2026-10-20,FX volume,10244372,10887800,8287800,13487800,false
2026-10-21,FX volume,11044696,10897600,8297600,13497600,false
2026-10-22,FX volume,9935783,10907400,8307400,13507400,false
2026-10-23,FX volume,9553942,10917200,8317200,13517200,false
2026-10-24,FX volume,1022412,1092700,52700,2132700,false
```

## The spec

Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).

```json
{
  "id": "metric-anomalies",
  "title": "Anomalies, measure by measure",
  "subtitle": "Daily readings against their expected band, October 2026",
  "description": "Six commercial measures watched every day: the band each was expected to stay in, and the days it stepped out.",
  "locale": "en-US",
  "source": {
    "name": "Commercial data mart (fictional)"
  },
  "data": {
    "type": "inline",
    "rows": [
      {
        "date": "2026-10-01",
        "metric": "Net new money",
        "value": 2760508,
        "expected": 2841600,
        "low": 1941600,
        "high": 3741600,
        "flag": false
      },
      {
        "date": "2026-10-02",
        "metric": "Net new money",
        "value": 2978321,
        "expected": 2846400,
        "low": 1946400,
        "high": 3746400,
        "flag": false
      },
      {
        "date": "2026-10-03",
        "metric": "Net new money",
        "value": 342650,
        "expected": 427680,
        "low": 67680,
        "high": 787680,
        "flag": false
      }
    ]
  },
  "fields": {
    "date": {
      "label": "Date",
      "format": {
        "type": "date"
      }
    },
    "metric": {
      "label": "Measure"
    },
    "value": {
      "label": "Reading",
      "format": {
        "type": "number",
        "compact": true
      }
    },
    "expected": {
      "label": "Expected",
      "format": {
        "type": "number",
        "compact": true
      }
    },
    "low": {
      "label": "Low",
      "format": {
        "type": "number",
        "compact": true
      }
    },
    "high": {
      "label": "High",
      "format": {
        "type": "number",
        "compact": true
      }
    }
  },
  "view": {
    "type": "anomalies",
    "x": "date",
    "metric": "metric",
    "value": "value",
    "expected": "expected",
    "low": "low",
    "high": "high",
    "flag": "flag"
  },
  "i18n": {
    "fr": {
      "title": "Anomalies, mesure par mesure",
      "subtitle": "Relevés quotidiens face à leur bande attendue, octobre 2026",
      "description": "Six mesures commerciales suivies chaque jour : la bande attendue pour chacune, et les jours où elle en est sortie.",
      "source": {
        "name": "Datamart commercial (fictif)"
      },
      "fields": {
        "metric": {
          "label": "Mesure",
          "values": {
            "Net new money": "Collecte nette",
            "Fee revenue": "Revenus de commissions",
            "Trades": "Transactions",
            "Complaints": "Réclamations",
            "Logins": "Connexions",
            "FX volume": "Volume de change"
          }
        },
        "value": {
          "label": "Relevé"
        },
        "expected": {
          "label": "Attendu"
        },
        "low": {
          "label": "Bas"
        },
        "high": {
          "label": "Haut"
        }
      }
    },
    "de": {
      "title": "Anomalien, Kennzahl für Kennzahl",
      "subtitle": "Tägliche Werte gegen ihr erwartetes Band, Oktober 2026",
      "description": "Sechs Vertriebskennzahlen täglich beobachtet: das erwartete Band jeder Kennzahl und die Tage, an denen sie es verließ.",
      "source": {
        "name": "Vertriebs-Data-Mart (fiktiv)"
      },
      "fields": {
        "date": {
          "label": "Datum"
        },
        "metric": {
          "label": "Kennzahl",
          "values": {
            "Net new money": "Nettoneugeld",
            "Fee revenue": "Provisionserträge",
            "Trades": "Transaktionen",
            "Complaints": "Beschwerden",
            "Logins": "Anmeldungen",
            "FX volume": "Devisenvolumen"
          }
        },
        "value": {
          "label": "Messwert"
        },
        "expected": {
          "label": "Erwartet"
        },
        "low": {
          "label": "Tief"
        },
        "high": {
          "label": "Hoch"
        }
      }
    }
  }
}
```

## The same data as another chart

| Chart | Fit | Verdict | Assessment | View |
| --- | --- | --- | --- | --- |
| `boxplot` | fits | different | Answers a different question: better for how values spread and comparing amounts across categories, but gives up patterns across two dimensions or a cycle. | `{"type":"boxplot","value":"value"}` |
| `icicle` | fits | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up patterns across two dimensions or a cycle. | `{"type":"icicle","levels":["metric","flag"],"value":"value"}` |
| `ridgeline` | fits | different | Answers a different question: better for how values spread and comparing amounts across categories, but gives up patterns across two dimensions or a cycle. | `{"type":"ridgeline","value":"value","group":"metric"}` |
| `beeswarm` | fits | different | Answers a different question: better for how values spread, but gives up patterns across two dimensions or a cycle. | `{"type":"beeswarm","value":"value"}` |
| `bump` | fits | different | Answers a different question: better for ranking, top to bottom, but gives up patterns across two dimensions or a cycle. | `{"type":"bump","x":"date","series":"metric","value":"value"}` |
| `histogram` | fits | different | Answers a different question: better for how values spread, but gives up patterns across two dimensions or a cycle. | `{"type":"histogram","value":"value"}` |
| `kpi` | fits | different | Answers a different question: better for a headline number, but gives up patterns across two dimensions or a cycle. | `{"type":"kpi","value":"value","x":"date"}` |
| `scatter` | fits | different | Answers a different question: better for how two measures relate, but gives up patterns across two dimensions or a cycle. | `{"type":"scatter","x":"value","y":"expected"}` |
| `table` | fits | different | Answers a different question: better for exact values and lookup, but gives up patterns across two dimensions or a cycle. | `{"type":"table"}` |
| `kpis` | fits | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"kpis","items":[{"value":"value"},{"value":"expected"},{"value":"low"}]}` |
| `calendar` | stretch: "date" repeats (24 different values in 144 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | same | Keeps the job (patterns across two dimensions or a cycle) with a different look. | `{"type":"calendar","date":"date","value":"value"}` |
| `heatmap` | stretch: Some metric and flag pairs repeat: sum them first. | same | Keeps the job (patterns across two dimensions or a cycle) with a different look. | `{"type":"heatmap","x":"metric","y":"flag","value":"value"}` |
| `rose` | stretch: "metric" repeats (6 different values in 144 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 144 rows: this chart crowds past about 36. | same | Keeps the job (patterns across two dimensions or a cycle) with a different look. | `{"type":"rose","label":"metric","y":["value","expected"]}` |
| `area` | stretch: "date" repeats (24 different values in 144 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | different | Answers a different question: better for how each group or period splits and trend over time, but gives up patterns across two dimensions or a cycle. | `{"type":"area","x":"date","y":["value","expected"]}` |
| `bar` | stretch: "metric" repeats (6 different values in 144 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 144 rows: this chart crowds past about 16. | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up patterns across two dimensions or a cycle. | `{"type":"bar","x":"metric","y":["value","expected"]}` |
| `hbar` | stretch: "metric" repeats (6 different values in 144 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 144 rows: this chart crowds past about 30. | different | Answers a different question: better for comparing amounts across categories and ranking, top to bottom, but gives up patterns across two dimensions or a cycle. | `{"type":"hbar","label":"metric","value":["value","expected"]}` |
| `horizon` | stretch: "date" repeats (24 different values in 144 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | different | Answers a different question: better for comparing amounts across categories and trend over time, but gives up patterns across two dimensions or a cycle. Packs more series into less height and shows the level of each; the expected band and the flags are gone. | `{"type":"horizon","x":"date","y":["value","expected"]}` |
| `line` | stretch: "date" repeats (24 different values in 144 rows), but this chart wants one row per period: sum the rows first with an aggregate step. | different | Answers a different question: better for comparing amounts across categories and actual against target or plan, but gives up patterns across two dimensions or a cycle. One shared scale, so levels compare across measures; with more than three measures the lines tangle and the flags are lost. | `{"type":"line","x":"date","y":["value","expected"]}` |
| `list` | stretch: "metric" repeats (6 different values in 144 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 144 rows: this chart crowds past about 20. | different | Answers a different question: better for ranking, top to bottom and exact values and lookup, but gives up patterns across two dimensions or a cycle. | `{"type":"list","label":"metric","value":"value"}` |
| `marimekko` | stretch: Some metric and flag pairs repeat: sum them first. 144 rows: this chart crowds past about 60. | different | Answers a different question: better for how each group or period splits and comparing amounts across categories, but gives up patterns across two dimensions or a cycle. | `{"type":"marimekko","x":"metric","series":"flag","value":"value"}` |
| `sunburst` | stretch: 144 rows: this chart crowds past about 120. | different | Answers a different question: better for nested breakdowns and share of one whole, but gives up patterns across two dimensions or a cycle. | `{"type":"sunburst","levels":["metric","flag"],"value":"value"}` |
| `sankey` | stretch: 144 rows: this chart crowds past about 80. | different | Answers a different question: better for flows between stages or groups, but gives up patterns across two dimensions or a cycle. | `{"type":"sankey","source":"metric","target":"flag","value":"value"}` |
| `donut` | stretch: "metric" repeats (6 different values in 144 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 144 rows: this chart crowds past about 6. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"donut","label":"metric","value":"value"}` |
| `dot` | stretch: "metric" repeats (6 different values in 144 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 144 rows: this chart crowds past about 30. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"dot","label":"metric","value":["value","expected"]}` |
| `gauge` | stretch: A gauge shows one value; it draws the first of these 144 rows. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"gauge","value":"value"}` |
| `pareto` | stretch: "metric" repeats (6 different values in 144 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 144 rows: this chart crowds past about 25. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"pareto","label":"metric","value":"value"}` |
| `pie` | stretch: "metric" repeats (6 different values in 144 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 144 rows: this chart crowds past about 6. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"pie","label":"metric","value":"value"}` |
| `radar` | stretch: "metric" repeats (6 different values in 144 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 144 rows: this chart crowds past about 12. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"radar","label":"metric","y":["value","expected"]}` |
| `treemap` | stretch: "metric" repeats (6 different values in 144 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 144 rows: this chart crowds past about 120. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"treemap","label":"metric","value":"value"}` |
| `waffle` | stretch: "metric" repeats (6 different values in 144 rows), but this chart wants one row per category: sum the rows first with an aggregate step. 144 rows: this chart crowds past about 5. | worse | Gives up patterns across two dimensions or a cycle, and this data gives it nothing better to do. | `{"type":"waffle","label":"metric","value":"value"}` |

Not possible with this data: `board` (It needs a stage or status column with a handful of values, and a name per row.); `bullet` (It needs a target, plan or budget column.); `candlestick` (It needs open, high, low and close prices per period.); `chord` (It needs flows that go both ways between the same groups.); `choropleth` (needs a column of country or state codes that sit on a basemap); `dual` (It needs two measures over the same periods, in two columns.); `dumbbell` (It needs the same measure at two points in time, in two columns.); `funnel` (It needs ordered stages that narrow, such as visits to sign-ups to sales.); `history` (It needs dated events with a short title each.); `lifecycle` (view: stages needs at least two date fields in order, such as ["proposed", "adopted"].); `likert` (It needs answer counts on one ordered scale, such as disagree to agree.); `locator` (needs named places with region codes on a basemap, or coordinates); `matrix` (It needs one row per pair of two categories, such as topic and quarter.); `meter` (It needs a target, plan or budget column.); `pyramid` (It needs two counts per ordered band, such as women and men per age group.); `ragboard` (It needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers.); `ragtrend` (It needs one status (R, A, G) per entity per period.); `rings` (It needs a target, plan or budget column.); `slope` (It needs the same measure at two points in time, in two columns.); `strips` (It needs whole counts per row, in one or more part columns.); `symbols` (needs a column of country or state codes that sit on a basemap, or coordinates); `timeline` (It needs tasks with a start date.); `variance` (It needs a target, plan or budget column.); `waterfall` (It needs changes that add up from one total to another.); `whitespace` (It needs one row per client and product with a state: held, an opportunity, or not eligible.); `xray` (It needs one row: one client with its facts, holdings and share of wallet.).
