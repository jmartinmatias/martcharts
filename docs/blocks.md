# Block reference

Generated from the block registry by `npm run docs`. Do not edit by hand.

Every slot in a widget spec takes a block: an object whose `type` picks the block and whose other keys are its options.
Register your own blocks with `registerSource`, `registerTransform`, `registerFormat` and `registerView` (see [api.md](api.md#extending)).

## Data sources

Slot: `data: { type, ...options }`.

### `fn`

Calls your own JavaScript function for rows. For code use only: a function cannot be saved as JSON.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `load` | function | yes |  | Function returning rows, or a promise of rows. |

### `inline`

Rows written directly into the spec. Best for small, fixed data and for trying things out.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `rows` | array | yes |  | The rows, for example `[{ "region": "North", "revenue": 120 }]`. |

### `url`

Fetches JSON over HTTP. The response must be a list of rows, or contain one at `path`.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `url` | string | yes |  | Address of the JSON. Relative addresses resolve against the page (or, in the MCP server, the public folder). |
| `path` | string |  |  | Dot path to the list inside the response, for example "data.items". |
| `cache` | number |  | `60` | Seconds a loaded answer is shared with other loads of the same address, so a dashboard fetches each file once. 0 always fetches. A widget's refresh always fetches. |

## Transforms

Slot: `transform: [{ type, ...options }, ...]`, applied in order.

### `aggregate`

Groups rows and summarizes each group into one row. Without groupBy, summarizes all rows into one.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `groupBy` | field name or list |  |  | Field or fields that define a group. Leave out to summarize everything. |
| `measures` | array | yes |  | Summary numbers, each `{ op, field?, as? }` with op one of sum, avg, min, max, count, or list (the values in order, for sparklines). Example: `[{ "op": "sum", "field": "revenue" }]`. |

### `bin`

Cuts a numeric field into bands on round edges and returns one row per band: the band's start under the field's own name (so its format still applies), its end as <field>End, and how many rows fell in it. Feeds a bar, table or hbar with a distribution.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `field` | field name | yes |  | Numeric field to cut into bands. Rows without a number are left out. |
| `bins` | number |  |  | About how many bands; edges snap to round numbers, so the count can differ. Defaults to Sturges' rule (1 + log2 of the row count). |
| `as` | string |  | `"count"` | Name of the count field. |

### `calc`

Adds a field computed from two fields, or a field and a number. Division by zero gives null.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `as` | string | yes |  | Name of the new field. |
| `op` | `add`, `subtract`, `multiply`, `divide` | yes |  | Arithmetic to apply: left op right. |
| `left` | any | yes |  | Field name or number. |
| `right` | any | yes |  | Field name or number. |

### `filter`

Keeps only the rows where a field matches a condition.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `field` | field name | yes |  | Field to test. |
| `op` | `==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `contains` |  | `"=="` | Comparison. `in` expects a list; `contains` matches text ignoring case. |
| `value` | any | yes |  | Value to compare against. |

### `limit`

Keeps the first rows and drops the rest. Pair with sort for a top N.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `count` | number | yes |  | How many rows to keep. |

### `pivot`

Spreads one field's values into columns: one row per row key, one column per distinct column value. Turns long data into wide data for stacked and grouped charts.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `row` | field name | yes |  | Field whose values become the rows, for example region. |
| `column` | field name | yes |  | Field whose values become new columns, for example product. |
| `value` | field name | yes |  | Field that fills the cells. |
| `op` | `sum`, `avg`, `min`, `max`, `count`, `list` |  | `"sum"` | How several rows landing in one cell are combined. |
| `fill` | any |  |  | Value for cells with no data. Left out, empty cells are left out of the row. |

### `sort`

Orders rows by one field. Missing values always go last.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `field` | field name | yes |  | Field to sort by. |
| `order` | `asc`, `desc` |  | `"asc"` | `asc` for smallest first, `desc` for largest first. |

## Formats

Slot: `fields.<name>.format: "type"` or `{ type, ...options }`.

### `badge`

A status pill in tables and lists, toned by value, for example Complete in green and On going in amber. Plain text elsewhere.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `tones` | object |  |  | Tone per value: positive, warning, negative, neutral or accent. Example: { "Complete": "positive", "On going": "warning" }. |
| `tone` | `positive`, `warning`, `negative`, `neutral`, `accent` |  | `"neutral"` | Tone for values not listed in tones. |

### `bar`

A slim bar beside the number in a table or list cell, scaled to the largest value in the column (or to max), so a column of figures reads at a glance. Negative values take the down color. Plain number elsewhere.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `max` | number |  |  | Value of a full bar. Defaults to the largest absolute value in the column. |
| `format` | any |  |  | Built-in format for the number itself (number, currency, percent, date or text), for example { "type": "currency", "currency": "EUR" }. Defaults to a short number. |

### `currency`

Money with a currency symbol, for example €1,234.50.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `currency` | string |  | `"USD"` | ISO 4217 code, for example EUR, USD, GBP. |
| `decimals` | number |  |  | Exact number of decimal places. Defaults to the currency's usual places. |
| `compact` | boolean |  | `false` | Shorten large amounts: $4.2M. |

### `date`

A date from an ISO string (2026-03-05), a timestamp in milliseconds, or a Date.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `style` | `short`, `medium`, `long`, `day`, `month`, `year` |  | `"medium"` | short 3/5/26, medium Mar 5, 2026, long March 5, 2026, day Mar 5, month Mar 2026, year 2026. |

### `delta`

A signed change for a table or list cell: an arrow and a sign, colored good or bad, so color is never the only signal. A percent with one decimal by default; goodWhen down suits costs and churn. Plain signed text elsewhere.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `format` | any |  |  | Built-in format for the number (number, currency or percent), for example { "type": "currency", "currency": "EUR" }. Defaults to a percent with one decimal. |
| `goodWhen` | `up`, `down` |  | `"up"` | Whether a rise is good ("up", as for revenue) or bad ("down", as for costs). |

### `heat`

A number tinted on the seven-step sequential scale by its place between the lowest and highest value, for heat tables. Every heat column in a table shares one range, unless min and max fix it. Plain number elsewhere.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `min` | number |  |  | Value of the lightest step. Defaults to the lowest value across the table's heat columns. |
| `max` | number |  |  | Value of the darkest step. Defaults to the highest value across the table's heat columns. |
| `format` | any |  |  | Built-in format for the number (number, currency or percent). Defaults to number. |

### `number`

Plain number with locale grouping, for example 1,234.5.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `decimals` | number |  |  | Exact number of decimal places. |
| `compact` | boolean |  | `false` | Shorten large numbers: 1.2K, 3.4M. |

### `percent`

A ratio shown as a percentage: 0.25 becomes 25%.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `decimals` | number |  | `0` | Decimal places in the percentage. |

### `spark`

A tiny trend drawn in a table or list cell from a list of numbers, latest point marked. Plain text elsewhere: first → last.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `kind` | `line`, `bar` |  | `"line"` | line for a trend, bar for mini columns. |

### `text`

The value as plain text, unchanged.

No options.

## Views

Slot: `view: { type, ...options }`.

### `area`

A line with a soft filled area down to zero, for a trend where the amount itself matters. Best with one or two series, or stacked: composition over time, each series a band on top of the ones before. As a stream, the bands flow around a center line, for how a mix shifts over time.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (date) | yes |  | Field for the ordered axis, usually a date or period. |
| `y` | field name or list (number) | yes |  | Field or fields for the values. Each field is one series. |
| `stacked` | any |  | `false` | true stacks the series as bands, each on top of the ones before, so the top edge is the total; "percent" stacks them as shares of 100%; "stream" is a streamgraph: smooth bands centered on a middle line, each named inside itself, with no value axis since only thickness carries meaning (the tooltip has the numbers). Negative values count as zero. |
| `highlight` | any |  |  | Series field or fields to keep in color; every other series turns grey. Example: "revenue". |
| `endLabels` | boolean |  | `true` | Write each series' last value at its end, for up to 4 series. Hidden automatically when two ends would collide. |
| `reference` | array |  |  | Target lines and bands across the value axis. Each item is { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; default avg), or { from, to, label } for a band. Example: [{ "value": 1200000, "label": "Target" }]. |
| `forecast` | field name (category) |  |  | Field that is true on forecast rows. From the last actual on, lines draw dashed in a softly shaded zone labelled Forecast, and the tooltip marks those rows. On an area the forecast's wash is fainter too. Unstacked areas only. |
| `band` | any |  |  | A shaded range behind the first line, for a forecast fan or any low to high spread: { "low": "p10", "high": "p90", "label": "80% range" }. Give the last actual row low and high equal to its value, so the fan opens from it. The ends are labelled and the tooltip gives the range. |

### `bar`

Vertical bars comparing amounts across categories. Several y fields draw grouped bars.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (category) | yes |  | Field for the categories along the horizontal axis. |
| `y` | field name or list (number) | yes |  | Field or fields for bar heights. Each field is one series. |
| `lines` | field name or list (number) |  |  | Field or fields drawn as lines over the bars, on the same axis, for example a target. Never a second axis. |
| `stacked` | any |  | `false` | true stacks the series into one column per category (part-to-whole); "percent" stacks them as shares of 100%. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. |
| `reference` | array |  |  | Target lines and bands across the value axis. Each item is { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; default avg), or { from, to, label } for a band. Example: [{ "value": 1200000, "label": "Target" }]. |
| `mark` | `bar`, `lollipop` |  | `"bar"` | "lollipop" draws a thin stem from the baseline and a dot at the value in place of each bar: the same reading with far less ink, for rankings of many similar values. |

### `beeswarm`

A distribution: one dot per row along a value axis, nudged apart so none overlap, optionally one row per group. Shows spread and outliers an average hides.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | field name (number) | yes |  | Numeric field along the axis. |
| `group` | field name (category) |  |  | Field giving each group its own labelled row. |
| `label` | field name (category) |  |  | Field naming each dot in its tooltip. |

### `boxplot`

A box plot per group on one shared axis: a box over the middle half of the values (first to third quartile), a line at the median, whiskers to the furthest values within 1.5 box-widths, and dots for outliers beyond. For comparing spreads compactly, such as deal size by region.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | field name (number) | yes |  | Numeric field whose spread is drawn. |
| `group` | field name (category) |  |  | Field giving each group its own box. Without it, all rows make one box. |

### `bullet`

Actual against target, one compact row per item: a value bar and a target tick over three qualitative bands (poor, fair, good). A dense alternative to gauges.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each row. |
| `value` | field name (number) | yes |  | Field with the actual amount. |
| `target` | field name (number) | yes |  | Field with the target amount. |
| `ranges` | array |  | `[0.6,0.9,1.2]` | Where the three bands end, as multiples of the target: poor up to the first, fair up to the second, good up to the third. |

### `bump`

Rank over time: in every period the series are ranked by value (highest first), and each series is one smooth line through its ranks, named at both ends. Shows who overtook whom, for example product ranking by month. Takes long data: one row per period and series.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (date) | yes |  | Field with the period, such as a month. Periods keep the order of the rows. |
| `series` | field name (category) | yes |  | Field naming the series being ranked, such as a product. |
| `value` | field name (number) | yes |  | Field the ranking is by; the highest value ranks 1. |
| `highlight` | any |  |  | Series name or names to keep in color; every other series turns grey. Example: "Platform". |

### `calendar`

A calendar heatmap: one cell per day, weeks as columns from Monday, shaded on one blue scale. For daily patterns such as sales or tickets across months.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `date` | field name (date) | yes |  | Field with each day's date, as YYYY-MM-DD or a timestamp. |
| `value` | field name (number) | yes |  | Field that shades each day. |

### `candlestick`

Prices per period as candles: a thin wick from low to high around a body from open to close, in the up color when the period closed higher and the down color when lower. An optional moving average of the close smooths the trend. For share prices, exchange rates and commodities.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (date) | yes |  | Field with the period, such as a trading day. |
| `open` | field name (number) | yes |  | Field with the opening price. |
| `high` | field name (number) | yes |  | Field with the highest price. |
| `low` | field name (number) | yes |  | Field with the lowest price. |
| `close` | field name (number) | yes |  | Field with the closing price. |
| `average` | number |  |  | Periods in a moving average of the close, drawn as a line; for example 5 for a trading week. |

### `chord`

Flows between groups around a circle: each group an arc as long as everything it sends and receives, each flow a ribbon from its sender to its receiver, in the sender's color. For exchanges within one set, such as customers moving between plans or staff moving between teams.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `source` | field name (category) | yes |  | Field naming where each flow comes from. |
| `target` | field name (category) | yes |  | Field naming where each flow goes. |
| `value` | field name (number) | yes |  | Field with each flow's size. |

### `donut`

Part-to-whole at a glance: a ring of up to 6 slices with the total in the middle and a legend of values and shares. Compare close values with a bar chart instead.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each slice. |
| `value` | field name (number) | yes |  | Field with each slice's amount. Zero, negative and missing values are left out. |
| `caption` | string |  |  | Text under the total in the middle. Defaults to the value field's label. |

### `dumbbell`

Before and after per item on one shared axis: a muted dot for before, an accent dot for after, joined by a line. For this year against last year, by region.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each row. |
| `from` | field name (number) | yes |  | Field with the before value. |
| `to` | field name (number) | yes |  | Field with the after value. |

### `funnel`

Stages in order as centered bars narrowing from the first, with the conversion rate from each stage to the next and each stage's share of the first.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each stage. |
| `value` | field name (number) | yes |  | Field with how many reached each stage. |

### `gauge`

One headline number on a half-circle scale: an arc filled from min to the value, a tick at the target, the number large inside the arc and the scale's ends below. Reads the first row. For a single KPI with a known range, such as NPS or utilization.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | field name (number) | yes |  | Field holding the number. |
| `target` | field name (number) |  |  | Field holding the target, marked with a tick. |
| `min` | number |  | `0` | Start of the scale. |
| `max` | number |  |  | End of the scale. Defaults to a round number above the value and the target. |
| `label` | string |  |  | Caption under the number. Defaults to the value field's label. |

### `hbar`

Horizontal bars for rankings and long labels: label on the left, bar, value at the end. Sort the rows first for a ranking.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each bar. |
| `value` | field name (number) | yes |  | Field with each bar's amount. Bars start at zero. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. |
| `mark` | `bar`, `lollipop` |  | `"bar"` | "lollipop" draws a thin stem from the baseline and a dot at the value in place of each bar: the same reading with far less ink, for rankings of many similar values. |

### `heatmap`

A grid of cells shaded on one blue scale from light (low) to dark (high), for patterns across two categories such as weekday by hour.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (category) | yes |  | Field for the columns. |
| `y` | field name (category) | yes |  | Field for the rows. |
| `value` | field name (number) | yes |  | Field that shades each cell. |

### `histogram`

A distribution as touching bars: the value's range is cut into bins on round edges, and each bar counts the rows in its bin. A dashed line marks the median. For how deal sizes, order values or response times spread.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | field name (number) | yes |  | Numeric field to bin. |
| `bins` | number |  |  | About how many bins to use; edges snap to round numbers, so the exact count can differ. Defaults to Sturges' rule (1 + log2 of the row count). |
| `median` | boolean |  | `true` | Draw a dashed line at the median. |
| `countLabel` | string |  | `"Count"` | Name for the counts in the tooltip, for example "Deals". |

### `horizon`

Many time series at once, each in a thin row: values are measured from a baseline and folded into bands of deepening color, blue above and red below, so a dozen series fit where one line chart would. For spotting which series run hot or cold, and when. Pointing at a period lists every series there.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (date) | yes |  | Field for the ordered axis, usually a date. |
| `y` | field name or list (number) | yes |  | Field or fields, one row each, such as a region's revenue against plan. |
| `bands` | number |  | `3` | How many shades each side folds into, 1 to 5. More bands pack more range into a row but read less exactly. |
| `baseline` | number |  | `0` | The value rows are measured from, such as 0 for a difference or the plan for a raw amount. |

### `icicle`

A hierarchy laid flat: a column for the total, then one per level left to right, each child splitting its parent's height by value, in lighter tints of its family's color. Rectangles compare and label more easily than rings, so it takes deeper hierarchies than the sunburst. Pointing at a cell lights its family and gives its share of each level.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `levels` | field name or list (category) | yes |  | Fields from the top level down, one column each, for example ["region", "product", "plan"]. Up to 4. |
| `value` | field name (number) | yes |  | Field sizing the cells. Zero and negative values are left out. |

### `kpi`

One headline number with its change against a comparison. Reads the first row, or with series the last row, plus a sparkline.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | field name (number) | yes |  | Field holding the headline number. |
| `compare` | field name (number) |  |  | Field holding the value to compare against, for example last period. |
| `compareLabel` | string |  |  | Names the comparison, for example "vs last month". |
| `goodWhen` | `up`, `down` |  | `"up"` | Whether an increase is good news (revenue) or bad news (costs, churn). |
| `label` | string |  |  | Text above the number. Defaults to the value field's label. |
| `series` | boolean |  | `false` | Read the rows as a time series: the headline is the last row, the change is against the row before (unless compare is set), and a sparkline shows every row. |
| `x` | field name (date) |  |  | With series, the field naming each period, used to label the comparison ("vs Aug 2026"). |
| `icon` | `activity`, `alert`, `bolt`, `cart`, `check`, `clock`, `droplet`, `heart`, `mail`, `pin`, `revenue`, `target`, `trend`, `users` |  |  | A line icon on a soft tile beside the number. |

### `kpis`

A row of stat tiles in one widget, each with a label, value and change: the calm way to show a handful of headline numbers. With series, reads the rows as a time series and adds a sparkline per tile.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `items` | array | yes |  | Tiles, each { value, label?, compare?, compareLabel?, goodWhen? }. compare is a field or "previous" (the row before). Example: [{ "value": "revenue", "compare": "previous" }]. |
| `series` | boolean |  | `false` | Read the rows as a time series: values from the last row, compared with the row before, plus a sparkline per tile. |

### `likert`

Survey answers as diverging stacked bars: one bar per question, its responses in order from one pole to the other, centered on the neutral middle so disagreement grows left and agreement right. Shares disagreeing and agreeing are written at each end. Takes one row per question with a count field per response.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field with each question. |
| `responses` | field name or list (number) | yes |  | Count fields for the responses, in order from the negative pole to the positive, for example ["strongly_disagree", "disagree", "neutral", "agree", "strongly_agree"]. An odd count puts the middle one at the center. |

### `line`

Lines showing change over an ordered axis, usually time. Several y fields draw several lines.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (date) | yes |  | Field for the ordered axis, usually a date or period. |
| `y` | field name or list (number) | yes |  | Field or fields for line values. Each field is one series. |
| `highlight` | any |  |  | Series field or fields to keep in color; every other series turns grey. Example: "revenue". |
| `endLabels` | boolean |  | `true` | Write each series' last value at its end, for up to 4 series. Hidden automatically when two ends would collide. |
| `reference` | array |  |  | Target lines and bands across the value axis. Each item is { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; default avg), or { from, to, label } for a band. Example: [{ "value": 1200000, "label": "Target" }]. |
| `forecast` | field name (category) |  |  | Field that is true on forecast rows. From the last actual on, lines draw dashed in a softly shaded zone labelled Forecast, and the tooltip marks those rows. |
| `band` | any |  |  | A shaded range behind the first line, for a forecast fan or any low to high spread: { "low": "p10", "high": "p90", "label": "80% range" }. Give the last actual row low and high equal to its value, so the fan opens from it. The ends are labelled and the tooltip gives the range. |

### `list`

A stacked list: one line per row with a label, optional detail underneath, and an optional value on the right.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field for the main text of each item. |
| `detail` | field name (category) |  |  | Field for the smaller line under the label. |
| `value` | field name (number) |  |  | Field for the number on the right. |

### `marimekko`

A mosaic: one column per category, as wide as its total, split into segments by each series' share of that column. Shows market size and mix at once, for example revenue by region and product. Takes long data: one row per column and series.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (category) | yes |  | Field naming each column, such as a region. Columns keep the order of the rows. |
| `series` | field name (category) | yes |  | Field naming the segments inside each column, such as a product. |
| `value` | field name (number) | yes |  | Numeric field sizing the segments; a column's width is the sum of its values. |

### `meter`

Progress against a target, one meter per row: attainment as a percentage and a bar that fills to the target.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | field name (number) | yes |  | Field holding the current amount. |
| `target` | field name (number) | yes |  | Field holding the target amount. |
| `label` | field name (category) |  |  | Field naming each meter, for example a region. Defaults to the value field's label. |

### `pareto`

The 80/20 view: categories sorted largest first as bars of their share of the total, a line through the running total, and a dashed line at the threshold. Bars up to the crossing (the vital few) stay in color. One percent axis, no second scale. For causes of tickets, defects or churn.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each category. |
| `value` | field name (number) | yes |  | Field with each category's count or amount. Zero and negative values are left out. |
| `threshold` | number |  | `0.8` | Running-total share that marks the vital few, from 0 to 1. |

### `radar`

Profiles across several attributes: one spoke per row, rings for one shared scale from zero, and a soft shape per series. For comparing up to 3 profiles, such as a product against the market on speed, price and support.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each spoke, such as an attribute. |
| `y` | field name or list (number) | yes |  | Field or fields with the scores; each field is one shape. Up to 3 stay readable. |
| `max` | number |  |  | End of the scale. Defaults to a round number at or above the highest score. |

### `ridgeline`

One smooth distribution curve per group on a shared axis, overlapping like a mountain range: how values spread in each group, for example deal sizes by region.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | field name (number) | yes |  | Numeric field whose distribution is drawn. |
| `group` | field name (category) | yes |  | Field giving each group its own ridge. |

### `rings`

Concentric progress rings, one per row from the outside in, each filled to its share of target; past the target a second lap shows how far over. A legend gives each attainment. For a few goals at a glance, up to 5.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each goal. |
| `value` | field name (number) | yes |  | Field with the amount reached. |
| `target` | field name (number) | yes |  | Field with the goal amount. |

### `rose`

A polar area chart (a Nightingale rose) for a cycle that wraps round, such as hours of the day or months of the year: one equal wedge per row, clockwise from twelve o'clock, its area true to its value. Several fields stack outward, each ring adding its own area. For plain ranking, a bar chart reads more exactly.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each wedge, in cycle order, such as the hour or the month. |
| `y` | field name or list (number) | yes |  | Field or fields with the values; each field is one ring of the stack. Up to 4 stay readable. |
| `max` | number |  |  | Total the outer ring stands for. Defaults to a round number at or above the largest wedge. |

### `sankey`

Flows between stages as ribbons as thick as their volume, for example traffic source to landing page to outcome. Each origin's flows keep its color downstream.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `source` | field name (category) | yes |  | Field naming where each flow starts. |
| `target` | field name (category) | yes |  | Field naming where each flow ends. |
| `value` | field name (number) | yes |  | Field with each flow's volume. |

### `scatter`

One dot per row placed by two numbers, to show how they relate. An optional group field colors the dots, up to 3 groups; an optional size field turns it into a bubble chart.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (number) | yes |  | Numeric field along the horizontal axis. |
| `y` | field name (number) | yes |  | Numeric field along the vertical axis. |
| `size` | field name (number) |  |  | Field sizing each dot by area, making a bubble chart: four times the value, twice the radius. Bigger bubbles are drawn first. |
| `series` | field name (category) |  |  | Field that groups the dots by color. Up to 3 groups stay distinct. |
| `label` | field name (category) |  |  | Field naming each dot in its tooltip. |
| `reference` | array |  |  | Target lines and bands across the value axis. Each item is { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; default avg), or { from, to, label } for a band. Example: [{ "value": 1200000, "label": "Target" }]. |

### `slope`

Each item's move between two points in time, as a line from a left column to a right one on one shared scale. Rises and falls take the up and down colors, and the steepest lines are the biggest movers. For rank and change between two periods.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each row. |
| `from` | field name (number) | yes |  | Field with the earlier value (left column). |
| `to` | field name (number) | yes |  | Field with the later value (right column). |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. |

### `sunburst`

A hierarchy as rings: the inner ring splits the total by the first level, each outer ring splits its parent's slice by the next level, in lighter tints of the parent's color. The total sits in the middle. For two or three levels of part-to-whole, such as revenue by product and region.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `levels` | field name or list (category) | yes |  | Fields from the top level down, one ring each, for example ["product", "region"]. Up to 3. |
| `value` | field name (number) | yes |  | Field sizing the slices. Zero and negative values are left out. |
| `caption` | string |  |  | Text under the total in the middle. Defaults to the value field's label. |

### `table`

Rows and columns. The default view, and the one to use when people need exact values.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `columns` | field name or list |  |  | Fields to show, in order. Defaults to every field in the rows. |
| `sortable` | boolean |  | `true` | Headers become buttons that sort the rows: ascending, then descending. Missing values stay last. |
| `totals` | boolean |  | `false` | Adds a footer row summing each number column in its own format. Percent columns stay blank, since summed shares mean nothing. |

### `timeline`

A Gantt-style timeline: one row per task with a bar from its start to its end date, a diamond for milestones (no end), month ticks along the top and an optional today line. For project plans, launches and contracts.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each task. |
| `start` | field name (date) | yes |  | Field with each task's start date, as YYYY-MM-DD or a timestamp. |
| `end` | field name (date) |  |  | Field with each task's end date. A row without one is drawn as a milestone. |
| `group` | field name (category) |  |  | Field that colors tasks by team or phase, up to 8 groups. |
| `progress` | field name (number) |  |  | Field with each task's share done, from 0 to 1 (values above 1 are read as percentages). Fills the bar that far and labels it after the bar. |
| `today` | any |  |  | true for a line at today's date, or a YYYY-MM-DD date for the line. Shown only when it falls inside the plan. |

### `treemap`

Part-to-whole for many categories: tiles sized by value, kept close to square. Use it where a donut would need more than 6 slices.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each tile. |
| `value` | field name (number) | yes |  | Field sizing each tile. Zero and negative values are left out. |
| `group` | field name (category) |  |  | Field that colors related tiles alike, up to 8 groups. Without it every tile shares one color. |

### `variance`

Variance against plan, as in financial reporting: per row a bar from a zero line to actual minus plan, right when over and left when under, colored good or bad and labelled with its sign. For budget against actual, or results against target.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each row, such as a department. |
| `value` | field name (number) | yes |  | Field with the actual amount. |
| `target` | field name (number) | yes |  | Field with the plan, budget or target. |
| `percent` | boolean |  | `false` | Show the variance as a share of plan (+8%) instead of an amount. |
| `goodWhen` | `up`, `down` |  | `"up"` | Whether being over plan is good ("up", as for revenue) or bad ("down", as for costs). |

### `waffle`

Part to whole as a 10 by 10 grid where each square is one percent, filled category by category in reading order, with a legend of values and shares. Easier to count than a pie. With total, the share of a whole: 62 of 100 squares filled.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each category. |
| `value` | field name (number) | yes |  | Field with each category's amount. Zero and negative values are left out. |
| `total` | number |  |  | The whole the values are part of, when they do not add up to it; the rest of the grid stays empty. Example: 100 for percentages. |

### `waterfall`

A bridge: how a total moves to another through increases and decreases, each floating from the running total, with totals standing on zero.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each step. |
| `value` | field name (number) | yes |  | Field with each step's change, or the amount for total rows. |
| `totals` | any |  |  | Labels of rows that are totals (drawn from zero, resetting the running total), for example ["Q2 revenue"]. |
| `endLabel` | string |  |  | Adds a final total bar with this label, for example "Q3 revenue". |
| `fit` | boolean |  | `false` | Fit the axis to the running totals instead of starting at zero, so small changes stay visible. Totals then rise from the axis floor. |

## Headline

Slot: `headline: { value, ...options }` on the spec. One big number above any view, with its change and a caption.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | field name | yes |  | Field holding the headline number. |
| `agg` | `last`, `first`, `sum`, `avg`, `min`, `max` |  | `"last"` | Which row, or which summary of every row, to show. |
| `compare` | string |  |  | "previous" for the row before the one shown, or a field summarized the same way, to show the change as a percentage. |
| `compareLabel` | string |  |  | Names the comparison after the change, for example "vs last year". |
| `goodWhen` | `up`, `down` |  | `"up"` | Whether a rise is good news (revenue) or bad news (costs). |
| `caption` | string |  |  | Small text under the number, for example "active customers". |

## Facet (small multiples)

Slot: `facet: { field, ...options }` on the spec. Draws the view once per value of the field, in a grid of panels on one shared scale.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `field` | field name | yes |  | Field that splits the rows into one panel per value. |
| `columns` | number |  |  | Fixed number of columns. Defaults to as many 233px panels as fit. |
| `shared` | boolean |  | `true` | Give every panel the same value scale, so panels compare honestly. |

## Style presets

Slot: `style.preset`. A spec's own `style.tokens` and `style.palette` still win over the preset. Register more with `registerPreset` (see [api.md](api.md#style-presets)).

| Preset | Look |
| --- | --- |
| `airy` | Editorial and chrome-free, on a light or a dark page: no card, generous whitespace, small grey labels over large numbers, warm orange leading the palette, solid value pills. |
| `default` | The house look: quiet cards with hairline borders, following the light or dark theme. Choosing it resets any other preset. |
| `glass` | Frosted translucent cards for image or gradient backdrops: light frost or dark smoke with the theme, soft blur, large radius, pill bars on tracks, blue and gold leading the palette. |
| `paper` | Editorial print for reports and briefings: a warm paper card under a black rule (a night edition on dark: warm dark paper, cream rule), serif titles and headline numbers, nearly square bars, deep ink blue leading the palette. |

## Palettes

Slot: `style.palette`, as a name or a list of colors. "Checks" is `checkPalette` on a light background: fails mean series cannot be told apart by color alone (see [api.md](api.md#palettes)).

| Palette | Name | Colors | Checks (light) | Notes |
| --- | --- | --- | --- | --- |
| 50 Shades | `50-shades` | `#1f1f1f` `#383838` `#525252` `#6b6b6b` `#858585` `#9e9e9e` `#b8b8b8` `#d1d1d1` | fails lightness band, colorfulness, neighbour separation | Eight greys from charcoal to silver, for quiet context or highlighting one series in color against the rest. |
| Apple | `apple` | `#007AFF` `#34C759` `#AF52DE` `#FF9500` `#30B0C7` `#FF3B30` `#FFCC00` `#FF2D55` | fails lightness band | Apple's system colors, light and dark appearances, ordered for the widest colorblind separation. Vivid; yellow and orange need labels on white. Source: Apple Human Interface Guidelines system colors (iOS 13 to 18), light and dark appearances. |
| B&W | `bw` | `#111111` `#4d4d4d` `#808080` `#b3b3b3` | fails lightness band, colorfulness | Black to light grey, for print and monochrome reports. Best with one series, or with labels on every series. |
| IBM Carbon | `carbon` | `#6929c4` `#1192e8` `#005d5d` `#9f1853` `#fa4d56` `#520408` `#198038` `#002d9c` | fails lightness band, colorfulness | IBM Carbon's categorical palette, in its strict published sequence for the widest contrast between neighbours, with Carbon's own steps for dark themes. Source: IBM Carbon Design System, data visualization categorical palette (first 8 of 14, light and dark themes), from @carbon/colors tokens and carbon-charts. |
| Crédit Agricole | `credit-agricole` | `#006C4D` `#00969A` `#E30613` `#6E7378` | fails colorfulness | The bank's green, teal and red identity with a neutral grey, ordered so neighbours stay apart for colorblind readers. Source: Approximate logo colors from public logo databases (coloropedia.com, whatthelogo.com); confirm against official brand assets. The grey is a neutral addition. |
| Default | `default` | `#2a78d6` `#eb6834` `#00a470` `#c38300` `#d86d96` `#008300` `#6250d6` `#e34948` | passes | The validated house palette, with its own dark-mode steps. Choosing it removes any palette override. |
| Observable 10 | `observable-10` | `#4269d0` `#efb118` `#ff725c` `#6cc5b0` `#3ca951` `#ff8ab7` `#a463f2` `#97bbf5` `#9c6b4e` `#9498a0` | fails lightness band, colorfulness, neighbour separation | Observable Plot's default since 2024: ten bright, friendly hues designed for the web, balanced in lightness so no series shouts over the rest. Source: Observable 10, as published in d3-scale-chromatic (schemeObservable10). |
| Okabe-Ito | `okabe-ito` | `#E69F00` `#56B4E9` `#009E73` `#F0E442` `#0072B2` `#D55E00` `#CC79A7` | fails lightness band | The colorblind-safe standard of science publishing: seven hues that stay distinct under every common color vision deficiency. Orange, sky blue and yellow are light, so give them labels on white. Source: Okabe and Ito, Color Universal Design (2008); popularised by Wong, Nature Methods 8, 441 (2011). Black is left out, as it reads as text. |
| Tableau 10 | `tableau-10` | `#4e79a7` `#f28e2c` `#e15759` `#76b7b2` `#59a14f` `#edc949` `#af7aa1` `#ff9da7` `#9c755f` `#bab0ab` | fails lightness band, colorfulness, neighbour separation | Tableau's default since 2016: ten calm, slightly muted hues tuned to look balanced together, a safe choice for business dashboards with many series. Source: Tableau 10 by Maureen Stone (2016), as published in d3-scale-chromatic (schemeTableau10). |
| Paul Tol Vibrant | `tol-vibrant` | `#EE7733` `#0077BB` `#EE3377` `#33BBEE` `#CC3311` `#009988` | passes | Paul Tol's vibrant qualitative scheme, designed for colorblind readers and screens. Ordered here so no two neighbours are alike; orange and cyan want labels on white. Source: Paul Tol, Colour Schemes (SRON technical note, 2021), vibrant scheme. The grey for missing data is left out. |
