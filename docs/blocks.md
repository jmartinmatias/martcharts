# Block reference

Generated from the block registry by `npm run docs`. Do not edit by hand.

Every slot in a widget spec takes a block: an object whose `type` picks the block and whose other keys are its options.
Register your own blocks with `registerSource`, `registerTransform`, `registerFormat` and `registerView` (see [api.md](api.md#extending)).

## Data sources

Slot: `data: { type, ...options }`.

### `csv`

Comma-separated values (CSV), from a file or written into the spec, with the first row as field names. Number cells become numbers. For spreadsheet and BI exports.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `url` | string |  |  | Address of the CSV file. Give this or text. Relative addresses resolve as for url. |
| `text` | string |  |  | The CSV itself, for example "region,revenue\nNorth,120". Give this or url. |
| `delimiter` | string |  |  | Column separator. Leave out to pick a comma, semicolon or tab from the header row. |
| `typed` | boolean |  | `true` | Turn number-looking cells into numbers (ids with leading zeros stay text) and empty cells into null. False keeps every cell as text. |
| `cache` | number |  | `60` | Seconds a fetched file is shared with other loads of the same address. 0 always fetches. |
| `refresh` | number |  |  | Seconds between reloads for live data, at least 5. The chart redraws with the new rows and says when it was last updated; a failed reload keeps the last rows, and reloads pause while the page is hidden. |

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

### `sheet`

A Google Sheet, read through its CSV export: paste the sheet's address as you see it, or as published to the web (File, Share, Publish to web). The sheet must be published or shared so anyone with the link can view it. The first row names the fields.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `url` | string | yes |  | The sheet's address, for example https://docs.google.com/spreadsheets/d/<id>/edit#gid=0, or its published address. |
| `gid` | any |  |  | Which tab, by the gid in its address. Defaults to the one in the address, else the first tab. |
| `cache` | number |  | `60` | Seconds a fetched sheet is shared with other loads of the same address. 0 always fetches. |
| `refresh` | number |  |  | Seconds between reloads for live data, at least 5. The chart redraws with the new rows and says when it was last updated; a failed reload keeps the last rows, and reloads pause while the page is hidden. |

### `url`

Fetches JSON over HTTP. The response must be a list of rows, or contain one at `path`.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `url` | string | yes |  | Address of the JSON. Relative addresses resolve against the page (or, in the MCP server, the public folder). |
| `path` | string |  |  | Dot path to the list inside the response, for example "data.items". |
| `cache` | number |  | `60` | Seconds a loaded answer is shared with other loads of the same address, so a dashboard fetches each file once. 0 always fetches. A widget's refresh always fetches. |
| `refresh` | number |  |  | Seconds between reloads for live data, at least 5. The chart redraws with the new rows and says when it was last updated; a failed reload keeps the last rows, and reloads pause while the page is hidden. |

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

### `rag`

Turns numbers into RAG statuses (R, A, G, or N for no data) against thresholds: one status column per rule, named <field>Rag unless as says otherwise, and optionally an overall column holding the worst of them. With goodWhen up (the default) a value at or past green is G, at or past amber is A, and lower is R; with goodWhen down, less is better.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `rules` | array | yes |  | One rule per measure: { "field": "nps", "green": 40, "amber": 20 } or, when less is better, { "field": "daysSinceContact", "green": 30, "amber": 60, "goodWhen": "down", "as": "contact" }. |
| `overall` | string |  |  | Name of a column holding the worst status of all the rules: the row's overall RAG. |

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

### `rag`

A RAG status (R, A, G, or N for no data; red, amber, green and grey also read) as a pill with its shape, its words and its color: On track with a filled circle, At risk with a triangle, Off track with a square, No data with a hollow circle. compact keeps only the shape, with the words in its label. Plain words elsewhere.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `compact` | boolean |  | `false` | Only the shape, for dense tables; the words stay in its label and tooltip. |
| `words` | object |  |  | Words per status, keyed R, A, G, N. Example: { "G": "Healthy", "A": "Watch", "R": "Escalate" }. |
| `shapes` | object |  |  | Shape per status, keyed R, A, G, N: circle, triangle, square, ring or diamond. |

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

### `anomalies`

An anomaly tracker: one thin lane per metric over time, the band it was expected to stay in as a faint fill, the expected value as a hairline, the actual as a line, and every day it stepped outside the band as a flagged dot. The lanes with the most anomalies come first, each ending with its latest value and a count. For watching a dozen measures at once and seeing which ones need a look.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (date) | yes |  | Field with the date or period of each reading. |
| `metric` | field name (category) | yes |  | Field naming the measure each row belongs to; each measure is one lane. |
| `value` | field name (number) | yes |  | Field with the reading. |
| `expected` | field name (number) |  |  | Field with the value expected that day, drawn as a hairline through the band. |
| `low` | field name (number) |  |  | Field with the bottom of the expected band. Needs high too. |
| `high` | field name (number) |  |  | Field with the top of the expected band. Needs low too. |
| `flag` | field name (category) |  |  | Field that is true on anomalous readings (true, 1, "yes"). Flagged readings draw as filled dots in the alert color. Without it, readings outside the band are flagged. |

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
| `curve` | `linear`, `smooth`, `step` |  | `"linear"` | "smooth" curves through every point without ever swinging past one (a monotone curve), for a soft, calm trend; "step" holds each value until halfway to the next, for amounts that change in jumps such as prices or headcount. Stacked and stream areas keep their own shapes. |
| `annotations` | array |  |  | Short notes pinned to points of the chart, each { "x": <category or period>, "y"?: <value>, "text": "…" }. Without y the note sits on the value there. Each note is a few words beside a small dot, with a thin leader to it; on a narrow card the notes become numbered markers with the texts listed under the chart. Example: [{ "x": "2026-03", "text": "Price rise" }]. |

### `bar`

Vertical bars comparing amounts across categories. Several y fields draw grouped bars.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (category) | yes |  | Field for the categories along the horizontal axis. |
| `y` | field name or list (number) | yes |  | Field or fields for bar heights. Each field is one series. |
| `lines` | field name or list (number) |  |  | Field or fields drawn as lines over the bars, on the same axis, for example a target. Never a second axis. Under one target line (a field named target, plan, goal, budget or quota), bars on the wrong side of it (see goodWhen) are drawn outlined and keyed Below target. |
| `stacked` | any |  | `false` | true stacks the series into one column per category (part-to-whole); "percent" stacks them as shares of 100%. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `reference` | array |  |  | Target lines and bands across the value axis. Each item is { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; default avg), or { from, to, label } for a band. Example: [{ "value": 1200000, "label": "Target" }]. |
| `mark` | `bar`, `lollipop` |  | `"bar"` | "lollipop" draws a thin stem from the baseline and a dot at the value in place of each bar: the same reading with far less ink, for rankings of many similar values. |
| `goodWhen` | `up`, `down` |  | `"up"` | Which side of a target is good news: "up" for revenue, "down" for wait times and costs. Under one target (a lines field or a reference line labeled target, plan, goal, budget or quota), a bar on the wrong side is drawn outlined and keyed Below or Over the target. |
| `compare` | field name (number) |  |  | Field drawn as a wider, quieter column behind each bar, on the same axis, for a comparison such as last year or the plan. The key names it by its label and the tooltip gives its value. One y series, unstacked. |
| `annotations` | array |  |  | Short notes pinned to points of the chart, each { "x": <category or period>, "y"?: <value>, "text": "…" }. Without y the note sits on the value there. Each note is a few words beside a small dot, with a thin leader to it; on a narrow card the notes become numbered markers with the texts listed under the chart. Example: [{ "x": "2026-03", "text": "Price rise" }]. |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

### `beeswarm`

A distribution: one dot per row along a value axis, nudged apart so none overlap, optionally one row per group. Shows spread and outliers an average hides.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | field name (number) | yes |  | Numeric field along the axis. |
| `group` | field name (category) |  |  | Field giving each group its own labelled row. |
| `label` | field name (category) |  |  | Field naming each dot in its tooltip. |

### `board`

A status board: one column per stage with its count in the header, and the items in it as quiet cards, so where everything stands reads at a glance. For things moving through a lifecycle: regulations by status, deals by stage, tickets by state. A group field colors a dot on each card with a key; a value field writes a number on each card; past the limit a column folds the rest into one line that opens on a click.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each card. |
| `stage` | field name (category) | yes |  | Field with each item's stage: one column per distinct value, in the order of stages or of first appearance. |
| `stages` | array |  |  | The columns in order, such as ["Proposal", "Adopted", "In force"]. A listed stage with no item still shows, empty; an item whose stage is not listed goes to a last column named Other. |
| `group` | field name (category) |  |  | Field that colors a dot on each card by group, with a key. Up to 8 groups stay distinct. |
| `value` | field name (number) |  |  | Field written on each card, such as impact or amount, in the field's format. |
| `detail` | field name (category) |  |  | Field for a smaller line under the card's name, such as the issuer or the owner. |
| `limit` | number |  | `8` | How many cards a column shows before folding the rest into a + n more line. The line opens the rest in place. |

### `boxplot`

A box plot per group on one shared axis: a box over the middle half of the values (first to third quartile), a line at the median, whiskers to the furthest values within 1.5 box-widths, and dots for outliers beyond. For comparing spreads compactly, such as deal size by region.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | field name (number) | yes |  | Numeric field whose spread is drawn. |
| `group` | field name (category) |  |  | Field giving each group its own box. Without it, all rows make one box. |
| `reference` | array |  |  | Target lines and bands across the value axis. Each item is { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; default avg), or { from, to, label } for a band. Example: [{ "value": 1200000, "label": "Target" }]. |

### `bullet`

Actual against target, one compact row per item: a value bar and a target tick over three qualitative bands (poor, fair, good). A met target carries a check by its number; the tooltip says what is left to go. A dense alternative to gauges.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each row. |
| `value` | field name (number) | yes |  | Field with the actual amount. |
| `target` | field name (number) | yes |  | Field with the target amount. |
| `ranges` | array |  | `[0.6,0.9,1.2]` | Where the three bands end, as multiples of the target: poor up to the first, fair up to the second, good up to the third. |
| `goodWhen` | `up`, `down` |  | `"up"` | Whether more is better ("up", as for revenue) or less is better ("down", as for wait times and costs). It decides which side of the target reads as met. |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

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
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `source` | field name (category) | yes |  | Field naming where each flow comes from. |
| `target` | field name (category) | yes |  | Field naming where each flow goes. |
| `value` | field name (number) | yes |  | Field with each flow's size. |

### `choropleth`

A map with each region shaded by its value, from the weakest tint to the strongest, with a scale under it: revenue by country, share by state. Regions with no row stay grey and are keyed No data. Built-in tile grids (europe, us-states) give every region the same size, so small countries read as well as big ones; your own GeoJSON draws true shapes.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `geo` | any | yes |  | The map's geometry: a built-in basemap by name (europe, us-states: tile grids keyed by country or state code), an inline GeoJSON FeatureCollection whose features carry an id, or the address of a GeoJSON file to fetch. |
| `id` | field name (category) | yes |  | Field with each row's region code: a country or state code on a built-in basemap (FR, TX), or the feature id in your GeoJSON. |
| `value` | field name (number) |  |  | Field that shades each region on the sequential scale. Rows with no number stay grey. Give value or category, not both. |
| `category` | field name (category) |  |  | Field that colors each region by its category instead, one series color per value with a key: a transposition status, a supervisor, a regime. Up to 8 categories stay distinct. |
| `key` | string |  | `"id"` | The feature property that holds each region's id in your own GeoJSON (feature.id is read too). Built-in basemaps use their codes. |
| `labels` | boolean |  | `true` | Write each region's code inside it, where it fits. Also takes the words other views use: "codes" (the same as true) or "none". |
| `min` | number |  |  | Value of the weakest tint. Defaults to the lowest value. |
| `max` | number |  |  | Value of the strongest tint. Defaults to the highest value. |
| `previous` | field name (number) |  |  | Field with the same measure in the previous period, such as last year's revenue. Each region's tooltip then gives the change, and show "change" shades by it. |
| `show` | `value`, `change` |  | `"value"` | "change" shades each region by its change since previous on a diverging scale: up one way, down the other, no change in the middle. Needs previous. |
| `change` | `percent`, `difference` |  | `"percent"` | How a change is told: as a percent of the previous value, or as the difference in the value's own unit. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |

### `donut`

Part-to-whole at a glance: a ring of up to 6 slices with the total in the middle and a legend of values and shares. Compare close values with a bar chart instead.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each slice. |
| `value` | field name (number) | yes |  | Field with each slice's amount. Zero, negative and missing values are left out. |
| `caption` | string |  |  | Text under the total in the middle. Defaults to the value field's label, or to "seats" when the value field is seats. |
| `arc` | `full`, `half` |  | `"full"` | "half" draws a semicircle open at the bottom with the slices from left to right in the order given: an election donut, seats by party in the order they sit. |
| `majority` | boolean |  | `false` | On a half ring, a thin tick at the halfway point labelled Majority and the seats it takes (more than half of the total); the slice that crosses it says so in its tooltip. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

### `dot`

A dot plot: one row per item and one dot per measure on one shared axis, with a hairline across each row. Several measures sit side by side in their series colors, so a row's spread and the ranking on any measure both read at once. For scores, rates or prices by item, with far less ink than bars.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each row. |
| `value` | field name or list (number) | yes |  | Field or fields placed as dots on the axis. Each field is one series with its own color; one field writes its value beside the dot. Also accepts `values`, the older name. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `reference` | array |  |  | Target lines and bands across the value axis. Each item is { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; default avg), or { from, to, label } for a band. Example: [{ "value": 1200000, "label": "Target" }]. |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

### `dual`

Two measures with different units, such as revenue and churn, one above the other on two panels that share one time axis, each on its own scale. The honest form of a dual-axis chart: a second axis invites false crossings, where two lines meet only because of how the axes were drawn; two panels let the reader compare the shapes and read each value against its own axis. Pointing at a period lights it up on both panels.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (date) | yes |  | Field for the shared axis, usually a date or period. |
| `y` | field name (number) | yes |  | Measure on the top panel. |
| `y2` | field name (number) | yes |  | Measure on the bottom panel, in its own unit. |
| `marks` | array |  | `["bar","line"]` | How each panel draws its measure, top then bottom: "bar" for amounts (from zero) or "line" for rates and levels. Example: ["bar", "line"]. |
| `curve` | `linear`, `smooth`, `step` |  | `"linear"` | "smooth" curves through every point without ever swinging past one (a monotone curve), for a soft, calm trend; "step" holds each value until halfway to the next, for amounts that change in jumps such as prices or headcount. Stacked and stream areas keep their own shapes. |
| `annotations` | array |  |  | Short notes pinned to points of the chart, each { "x": <category or period>, "y"?: <value>, "text": "…" }. Without y the note sits on the value there. Each note is a few words beside a small dot, with a thin leader to it; on a narrow card the notes become numbered markers with the texts listed under the chart. Example: [{ "x": "2026-03", "text": "Price rise" }]. |

### `dumbbell`

Before and after per item on one shared axis: a muted dot for before, an accent dot for after, joined by a line (a range plot). With mark "arrow" the line becomes an arrow from the first value to the second (an arrow plot), blue when it rose and red when it fell. For this year against last year, by region.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each row. |
| `from` | field name (number) | yes |  | Field with the before value. |
| `to` | field name (number) | yes |  | Field with the after value. |
| `mark` | `range`, `arrow` |  | `"range"` | "range" joins the two dots with a plain line, the gap between them. "arrow" points from the from value to the to value, so direction reads at a glance; between two periods a rise takes the up color and a fall the down color, keyed Rose and Fell. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `reference` | array |  |  | Target lines and bands across the value axis. Each item is { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; default avg), or { from, to, label } for a band. Example: [{ "value": 1200000, "label": "Target" }]. |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

### `funnel`

Stages in order as centered bars narrowing from the first, with the conversion rate from each stage to the next and each stage's share of the first.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each stage. |
| `value` | field name (number) | yes |  | Field with how many reached each stage. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |

### `gauge`

One headline number on a half-circle scale: an arc filled from min to the value, a tick at the target, the number large inside the arc and the scale's ends below; with a target, a line under the arc says where it stands (Target met, or how far to go). Reads the first row. For a single KPI with a known range, such as NPS or utilization.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | field name (number) | yes |  | Field holding the number. |
| `target` | field name (number) |  |  | Field holding the target, marked with a tick. |
| `min` | number |  | `0` | Start of the scale. |
| `max` | number |  |  | End of the scale. Defaults to a round number above the value and the target. |
| `label` | string |  |  | Caption under the number. Defaults to the value field's label. |
| `goodWhen` | `up`, `down` |  | `"up"` | Whether more is better ("up", as for revenue) or less is better ("down", as for wait times and costs). It decides which side of the target reads as met. |

### `hbar`

Horizontal bars for rankings and long labels: label on the left, bar, value at the end. Sort the rows first for a ranking. Several value fields draw grouped bars, one thin bar per field in each row; stacked joins them into one bar per row, and split gives each field its own column of bars.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each bar. |
| `value` | field name or list (number) | yes |  | Field or fields with each bar's amount. Bars start at zero. Several fields draw one bar per field in each row (grouped), stacked into one bar with stacked, or in separate columns with split. |
| `stacked` | any |  | `false` | With several value fields: true stacks them into one bar per row, its total at the end (part-to-whole); "percent" stacks them as shares of 100%. |
| `split` | boolean |  | `false` | With several value fields: one small column of bars per field, side by side, the label written once on the left and each column headed by its field. Each column has its own scale, so measures in different units sit together. |
| `shared` | boolean |  | `false` | Split columns share one scale, so a bar compares across columns too. Only for fields in the same unit. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `mark` | `bar`, `lollipop` |  | `"bar"` | "lollipop" draws a thin stem from the baseline and a dot at the value in place of each bar: the same reading with far less ink, for rankings of many similar values. |
| `reference` | array |  |  | Target lines and bands across the value axis. Each item is { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; default avg), or { from, to, label } for a band. Example: [{ "value": 1200000, "label": "Target" }]. |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

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
| `reference` | array |  |  | Target lines and bands across the value axis. Each item is { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; default avg), or { from, to, label } for a band. Example: [{ "value": 1200000, "label": "Target" }]. |

### `history`

A client's story as a vertical timeline: one event per row with its date, title, an optional second line and an amount, newest first, a dot per event colored by kind with a key, and the month written wherever it changes. With a group field, one list per client under its own heading. For meetings, calls, trades, campaigns and complaints in one scroll.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `date` | field name (date) | yes |  | Field with when the event happened. |
| `title` | field name (category) | yes |  | Field with the event in a few words. |
| `kind` | field name (category) |  |  | Field with the kind of event (Meeting, Call, Trade); each kind takes a color and a letter, keyed. |
| `note` | field name (category) |  |  | Field with a second, smaller line under the title. |
| `amount` | field name (number) |  |  | Field with an amount to write at the right of the event, where there is one. |
| `group` | field name (category) |  |  | Field that splits the events into one list per value (one per client), each under its own heading. |
| `limit` | number |  | `30` | Events shown per list before a line says how many more there are. |
| `order` | `desc`, `asc` |  | `"desc"` | "desc" puts the newest event first (the default), "asc" tells the story from the start. |

### `horizon`

Many time series at once, each in a thin row: values are measured from a baseline and folded into bands of deepening color, blue above and red below, so a dozen series fit where one line chart would. For spotting which series run hot or cold, and when. Pointing at a period lists every series there.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (date) | yes |  | Field for the ordered axis, usually a date. |
| `y` | field name or list (number) | yes |  | Field or fields, one row each, such as a region's revenue against plan. |
| `bands` | number |  | `3` | How many shades each side folds into, 1 to 5. More bands pack more range into a row but read less exactly. |
| `baseline` | number |  | `0` | The value rows are measured from, such as 0 for a difference or the plan for a raw amount. |
| `baselineLabel` | string |  |  | What the baseline stands for, in a word or two, such as "plan" or "target". The key then reads "Above plan, rising", pointing at a day says "€6.5K above plan", and the guide counts the days above it. |

### `icicle`

A hierarchy laid flat: a column for the total, then one per level left to right, each child splitting its parent's height by value, in lighter tints of its family's color. Rectangles compare and label more easily than rings, so it takes deeper hierarchies than the sunburst. Pointing at a cell lights its family and gives its share of each level.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
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
| `target` | field name (number) |  |  | Field holding the target. A line under the number says where the latest stands: a check and Target met, or how far it has to go (with goodWhen down, how far above the target it is). |
| `rag` | object |  |  | Thresholds that give the number a Red, Amber or Green status, shown as a small pill with its shape and words (On track, At risk, Off track) beside it: { "green": 40, "amber": 20 }, or { "green": 2, "amber": 5, "goodWhen": "down" } when less is better. |

### `kpis`

A row of stat tiles in one widget, each with a label, value and change: the calm way to show a handful of headline numbers. With series, reads the rows as a time series and adds a sparkline per tile.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `items` | array | yes |  | Tiles, each { value, label?, compare?, compareLabel?, goodWhen?, target?, rag? }. compare is a field or "previous" (the row before); target is a field, and the tile then says where it stands (Target met, or how far to go); rag is { green, amber, goodWhen? } and adds a Red, Amber or Green status pill. Example: [{ "value": "revenue", "compare": "previous", "target": "target" }]. |
| `series` | boolean |  | `false` | Read the rows as a time series: values from the last row, compared with the row before, plus a sparkline per tile. |

### `lifecycle`

Stage swimlanes: one row per item on a shared date axis, each stage drawn from its date to the next in a deepening tint of one hue, a tick at every stage date, and the last reached stage running on faintly while its next date is unknown. A today line, a status pill at the row's end, and an impact that sets the row's thickness. For where each regulation stands, from proposal to application.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each row. |
| `stages` | field name or list (date) | yes |  | Date fields in lifecycle order, such as proposed, adopted, inForce, applies. A later date may be missing: the row then runs on from its last known stage. |
| `group` | field name (category) |  |  | Field that gathers rows under a heading, such as topic. |
| `today` | any |  |  | true for a line at today's date, or a YYYY-MM-DD date for the line. Shown when it falls inside the span. |
| `status` | field name (category) |  |  | Field written as a small pill at the row's end, such as In force or Consultation. |
| `impact` | field name (number) |  |  | Field from 1 to 5 that sets each row's thickness: the higher the impact, the thicker the row. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |

### `likert`

Survey answers as diverging stacked bars: one bar per question, its responses in order from one pole to the other, centered on the neutral middle so disagreement grows left and agreement right. Shares disagreeing and agreeing are written at each end. Takes one row per question with a count field per response.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field with each question. |
| `value` | field name or list (number) | yes |  | Count fields for the responses, in order from the negative pole to the positive, for example ["strongly_disagree", "disagree", "neutral", "agree", "strongly_agree"]. An odd count puts the middle one at the center. Also accepts `responses`, the older name. |

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
| `curve` | `linear`, `smooth`, `step` |  | `"linear"` | "smooth" curves through every point without ever swinging past one (a monotone curve), for a soft, calm trend; "step" holds each value until halfway to the next, for amounts that change in jumps such as prices or headcount. Stacked and stream areas keep their own shapes. |
| `points` | boolean |  | `false` | A small symbol at every data point, in the line's color, so each reading is a mark of its own. Left out where points would sit closer than 8px. |
| `labels` | `none`, `peaks` |  | `"none"` | "peaks" marks the first series' highest and lowest points with a dot and writes their values beside them, clear of the end label. |
| `scale` | `linear`, `log` |  | `"linear"` | "log" draws the value axis logarithmically, ticks at powers of ten (with 2 and 5 steps when it spans little), so steady growth reads as a straight line and small and large series share one chart. Positive values only: others are left out. |
| `annotations` | array |  |  | Short notes pinned to points of the chart, each { "x": <category or period>, "y"?: <value>, "text": "…" }. Without y the note sits on the value there. Each note is a few words beside a small dot, with a thin leader to it; on a narrow card the notes become numbered markers with the texts listed under the chart. Example: [{ "x": "2026-03", "text": "Price rise" }]. |

### `list`

A stacked list: one line per row with a label, optional detail underneath, and an optional value on the right.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field for the main text of each item. |
| `detail` | field name (category) |  |  | Field for the smaller line under the label. |
| `value` | field name (number) |  |  | Field for the number on the right. |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

### `locator`

A small, clean map that says where things are: a marker and an always-on name for each place, such as offices, stores or sites, with a second line of detail if there is one. Places sit on a region of a basemap (by code) or at coordinates on your own GeoJSON; a kind field colors the markers with a key.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `geo` | any |  |  | The map's geometry: a built-in basemap by name (europe, us-states: tile grids keyed by country or state code), an inline GeoJSON FeatureCollection whose features carry an id, or the address of a GeoJSON file to fetch. |
| `id` | field name (category) |  |  | Field with the region code that places each marker: a country or state code on a built-in basemap, or the feature id in your GeoJSON. Use lat and lon instead for coordinates. |
| `lat` | field name (number) |  |  | Field with each row's latitude, for placing by coordinates on your own GeoJSON (not on a built-in grid). |
| `lon` | field name (number) |  |  | Field with each row's longitude, paired with lat. |
| `label` | field name (category) | yes |  | Field with each place's name, written beside its marker. |
| `note` | field name (category) |  |  | Field with a second, smaller line under the name, such as a city or a headcount. |
| `color` | field name (category) |  |  | Field that colors the markers by kind, with a key. Also accepts `kind`, the older name. |
| `key` | string |  | `"id"` | The feature property that holds each region's id in your own GeoJSON (feature.id is read too). Built-in basemaps use their codes. |

### `marimekko`

A mosaic: one column per category, as wide as its total, split into segments by each series' share of that column. Shows market size and mix at once, for example revenue by region and product. Takes long data: one row per column and series.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (category) | yes |  | Field naming each column, such as a region. Columns keep the order of the rows. |
| `series` | field name (category) | yes |  | Field naming the segments inside each column, such as a product. |
| `value` | field name (number) | yes |  | Numeric field sizing the segments; a column's width is the sum of its values. |

### `matrix`

A mark matrix (a punchcard): one mark per pair of x and y, sized by a value, shaded by another, or a square where a flag is yes. Rows are the y values, columns the x values; a pair with no row is an empty cell. For regulatory pressure per topic per quarter (size and shade), or who must comply with which rule (a square per yes).

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `x` | field name (category) | yes |  | Field for the columns: quarters, stakeholders, stages. |
| `y` | field name (category) | yes |  | Field for the rows: topics, regulations, teams. |
| `size` | field name (number) |  |  | Field that sizes each circle, by area, against the largest value. |
| `color` | field name (category) |  |  | Field that shades each mark: a number takes the seven-step scale from lowest to highest (with a scale under the grid), a category takes one color per value (with a key). |
| `flag` | field name (category) |  |  | A yes/no field (true, 1, "yes", "x"): a filled square where it is yes, a faint dot where it is no. For who must comply. Also accepts `mark`, the older name. |
| `label` | field name (category) |  |  | Field (text or a number) written inside marks big enough to hold it; always in the tooltip. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |

### `meter`

Progress against a target, one meter per row: attainment as a percentage, a bar that fills to the target, and where it stands in plain words: a check and Target met, or how far it has to go (€22K to go).

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | field name (number) | yes |  | Field holding the current amount. |
| `target` | field name (number) | yes |  | Field holding the target amount. |
| `label` | field name (category) |  |  | Field naming each meter, for example a region. Defaults to the value field's label. |
| `goodWhen` | `up`, `down` |  | `"up"` | Whether more is better ("up", as for revenue) or less is better ("down", as for wait times and costs). It decides which side of the target reads as met. |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

### `pareto`

The 80/20 view: categories sorted largest first as bars of their share of the total, a line through the running total, and a dashed line at the threshold. Bars up to the crossing (the vital few) stay in color. One percent axis, no second scale. For causes of tickets, defects or churn.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each category. |
| `value` | field name (number) | yes |  | Field with each category's count or amount. Zero and negative values are left out. |
| `threshold` | number |  | `0.8` | Running-total share that marks the vital few, from 0 to 1. |

### `pie`

Part-to-whole as a full disc: up to 6 slices from twelve o'clock clockwise, each wide in proportion to its share, with the shares written on the slices and a legend of values. Use a donut when the total matters too, and a bar chart to compare close shares.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each slice. |
| `value` | field name (number) | yes |  | Field with each slice's amount. Zero, negative and missing values are left out. |
| `labels` | `inside`, `outside`, `legend` |  | `"inside"` | "inside" writes each share on its slice (thin slices skip theirs) with a legend of names and values; "outside" writes names and shares beside the disc on short leader lines, with no legend; "legend" leaves the disc bare. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

### `pyramid`

A population pyramid: one row per band (an age group, a tenure band), with two counts as bars growing out from a center axis on one shared scale, the left count leftward and the right count rightward. The shape says where the two sides differ. Rows draw in the order given, top to bottom.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each band, in order from top to bottom, such as the age group. |
| `left` | field name (number) | yes |  | Field with the count drawn leftward, such as women. |
| `right` | field name (number) | yes |  | Field with the count drawn rightward, such as men. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |

### `radar`

Profiles across several attributes: one spoke per row, rings for one shared scale from zero, and a soft shape per series. For comparing up to 3 profiles, such as a product against the market on speed, price and support.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `label` | field name (category) | yes |  | Field naming each spoke, such as an attribute. |
| `y` | field name or list (number) | yes |  | Field or fields with the scores; each field is one shape. Up to 3 stay readable. |
| `max` | number |  |  | End of the scale. Defaults to a round number at or above the highest score. |

### `ragboard`

A RAG scorecard: one row per entity (a client, a relationship manager, a deal) and one Red, Amber or Green cell per dimension, worst first, with an overall column holding each row's worst status. Each status has its own shape and words (a filled circle On track, a triangle At risk, a square Off track), so it never rests on color. An arrow in a cell's corner says it improved or got worse since the last period; a strip above counts the statuses and a footer counts them per column.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `only` | array |  |  | The statuses to show rows for, such as ["R", "A"] for what needs attention: the other rows fold into one line under the table ("and 33 on track"), so the counts still add up. |
| `label` | field name (category) | yes |  | Field naming each row: the client, the relationship manager or the deal. |
| `dimensions` | field name or list (category) | yes |  | Status fields, one column each, holding R, A, G or N (or red, amber, green, grey). The rag transform turns numbers into them. |
| `previous` | object |  |  | Each dimension's previous-period status field, for the trend arrows: { "health": "healthLast", "pipeline": "pipelineLast" }. |
| `overall` | any |  | `true` | A first column with each row's overall status, the one to act on: true for the worst of its dimensions, false for none, or a status field holding a roll-up your model already worked out (for example "two reds make red"). |
| `sort` | `worst`, `name`, `none` |  | `"worst"` | Rows worst first (by overall status, then the number of reds and ambers), by name, or as given. |
| `group` | field name (category) |  |  | Field that gathers rows under headings, such as segment or perspective. |
| `note` | field name (category) |  |  | Field written small under each name, such as the action owner or the next step. |
| `words` | object |  |  | Words per status, keyed R, A, G, N, in place of Off track, At risk, On track and No data. Example: { "G": "Healthy", "A": "Watch", "R": "Escalate" }. |
| `shapes` | object |  |  | Shape per status, keyed R, A, G, N: circle, triangle, square, ring or diamond. Keep them different, so status never rests on color. |

### `ragtrend`

RAG status over time: one row per entity and one small mark per period, shaped and colored by its status (a filled circle On track, a triangle At risk, a square Off track). A tick marks each period where the status changed, and the note of why it moved sits in the tooltip; the current status ends the row as a pill. Rows come worst-current first.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each row: the client, the relationship manager or the deal. |
| `period` | field name (date) | yes |  | Field with each row's period: a month, a quarter or a review date, in order. |
| `status` | field name (category) | yes |  | Field with the status in that period: R, A, G or N (or red, amber, green, grey). |
| `note` | field name (category) |  |  | Field saying why the status moved, shown in the tooltip of the period where it changed. |
| `words` | object |  |  | Words per status, keyed R, A, G, N, in place of Off track, At risk, On track and No data. Example: { "G": "Healthy", "A": "Watch", "R": "Escalate" }. |
| `shapes` | object |  |  | Shape per status, keyed R, A, G, N: circle, triangle, square, ring or diamond. Keep them different, so status never rests on color. |

### `ridgeline`

One smooth distribution curve per group on a shared axis, overlapping like a mountain range: how values spread in each group, for example deal sizes by region.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `value` | field name (number) | yes |  | Numeric field whose distribution is drawn. |
| `group` | field name (category) | yes |  | Field giving each group its own ridge. |

### `rings`

Concentric progress rings, one per row from the outside in, each filled to its share of target; past the target a second lap shows how far over. A legend gives each attainment and where it stands: a check and Target met, or how far it has to go. For a few goals at a glance, up to 5.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each goal. |
| `value` | field name (number) | yes |  | Field with the amount reached. |
| `target` | field name (number) | yes |  | Field with the goal amount. |
| `goodWhen` | `up`, `down` |  | `"up"` | Whether more is better ("up", as for revenue) or less is better ("down", as for wait times and costs). It decides which side of the target reads as met. |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

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
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
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
| `color` | field name (category) |  |  | Field that groups the dots by color. Up to 3 groups stay distinct. Also accepts `series`, the older name. |
| `label` | field name (category) |  |  | Field naming each dot in its tooltip. |
| `reference` | array |  |  | Target lines and bands across the value axis. Each item is { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; default avg), or { from, to, label } for a band. Example: [{ "value": 1200000, "label": "Target" }]. |
| `cluster` | field name (category) |  |  | Field naming each dot's cluster, such as a segment found by analysis. A soft, rounded hull gathers each cluster's dots and carries its name at the middle, so the areas read as regions of the plot; the dots take the cluster's color unless series is set. Up to 6 clusters. |
| `labels` | boolean |  | `false` | Write each dot's label beside it, skipping names that would land on another, so the standouts are named on the chart itself. |
| `quadrants` | object |  |  | Splits the plot into four at a value of x and of y, with a faint word in each corner: { "x": 50, "y": 3, "labels": ["Monitor", "Act now", "Prepare", "Watch"] } (top-left first, then clockwise). For priority grids such as pressure against impact. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `annotations` | array |  |  | Short notes pinned to points of the chart, each { "x": <category or period>, "y"?: <value>, "text": "…" }. Without y the note sits on the value there. Each note is a few words beside a small dot, with a thin leader to it; on a narrow card the notes become numbered markers with the texts listed under the chart. Example: [{ "x": "2026-03", "text": "Price rise" }]. |

### `slope`

Each item's move between two points in time, as a line from a left column to a right one on one shared scale. Rises and falls take the up and down colors, and the steepest lines are the biggest movers. For rank and change between two periods.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each row. |
| `from` | field name (number) | yes |  | Field with the earlier value (left column). |
| `to` | field name (number) | yes |  | Field with the later value (right column). |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

### `strips`

Unit strips: one row per item with a strip of small squares, one per unit, colored part by part in order (mandatory, recommended, optional), the total and the first part's share at the end. When totals run long, one square stands for a round number of units, said under the chart. A per field adds a density: provisions per page. For how many provisions a regulation has and how binding they are.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each row. |
| `value` | field name or list (number) | yes |  | Field or fields with each part's count, in the order they are drawn. The first part's share of the total is written at the end. Also accepts `parts`, the older name. |
| `per` | field name (number) |  |  | Field with a denominator, such as pages: the density (units per one of them) is written at the end and in the tooltip. |
| `unit` | string |  | `"provision"` | What one unit is, in the singular, for the note under the chart and the tooltip. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `reference` | array |  |  | Target lines and bands across the value axis. Each item is { value, label }, { field, agg, label } (agg: last, first, sum, avg, min, max; default avg), or { from, to, label } for a band. Example: [{ "value": 1200000, "label": "Target" }]. |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

### `sunburst`

A hierarchy as rings: the inner ring splits the total by the first level, each outer ring splits its parent's slice by the next level, in lighter tints of the parent's color. The total sits in the middle. For two or three levels of part-to-whole, such as revenue by product and region.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `levels` | field name or list (category) | yes |  | Fields from the top level down, one ring each, for example ["product", "region"]. Up to 3. |
| `value` | field name (number) | yes |  | Field sizing the slices. Zero and negative values are left out. |
| `caption` | string |  |  | Text under the total in the middle. Defaults to the value field's label. |

### `symbols`

A map with a circle on each place, its area true to a value: customers by state, volume by port. Places sit on a region of a basemap (by code) or at coordinates on your own GeoJSON; a color field groups them with a key, and a size key shows what the circles mean.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `geo` | any |  |  | The map's geometry: a built-in basemap by name (europe, us-states: tile grids keyed by country or state code), an inline GeoJSON FeatureCollection whose features carry an id, or the address of a GeoJSON file to fetch. |
| `id` | field name (category) |  |  | Field with the region code that places each circle: a country or state code on a built-in basemap, or the feature id in your GeoJSON. Use lat and lon instead for coordinates. |
| `lat` | field name (number) |  |  | Field with each row's latitude, for placing by coordinates on your own GeoJSON (not on a built-in grid). |
| `lon` | field name (number) |  |  | Field with each row's longitude, paired with lat. |
| `size` | field name (number) | yes |  | Field that sizes each circle, by area. Zero and missing values draw nothing. |
| `label` | field name (category) |  |  | Field naming each place in its tooltip. Defaults to the region's name, or the id. |
| `color` | field name (category) |  |  | Field that colors the circles by group, with a key. |
| `key` | string |  | `"id"` | The feature property that holds each region's id in your own GeoJSON (feature.id is read too). Built-in basemaps use their codes. |

### `table`

Rows and columns. The default view, and the one to use when people need exact values.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `columns` | field name or list |  |  | Fields to show, in order. Defaults to every field in the rows. |
| `sortable` | boolean |  | `true` | Headers become buttons that sort the rows: ascending, then descending. Missing values stay last. |
| `totals` | boolean |  | `false` | Adds a footer row summing each number column in its own format, over every row whatever the page or search shows. Percent columns stay blank, since summed shares mean nothing. |
| `search` | boolean |  | `false` | A small search field above the table: typing keeps only the rows whose shown text matches, in any column, and says how many remain. For directories and long lists. |
| `pageSize` | number |  |  | Rows shown at a time, with Previous and Next under the table (hidden while the rows fit on one page). Sorting or searching goes back to the first page. Leave out for the first 100 rows and a Show more button. |
| `showAll` | boolean |  | `false` | Draws every row at once. By default a table without pages shows its first 100 rows and a Show more button that adds 100 at a time. |
| `stickyFirst` | boolean |  | `false` | Keeps the first column in place while a wide table scrolls sideways, so every row keeps its name in view. |
| `align` | object |  |  | Text alignment per column, overriding the default of numbers right and text left: { "status": "center" }. Values: left, center, right. |

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
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

### `variance`

Variance against plan, as in financial reporting: per row a bar from a zero line to actual minus plan, right when over and left when under, colored good or bad and labelled with its sign. For budget against actual, or results against target.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each row, such as a department. |
| `value` | field name (number) | yes |  | Field with the actual amount. |
| `target` | field name (number) | yes |  | Field with the plan, budget or target. |
| `percent` | boolean |  | `false` | Show the variance as a share of plan (+8%) instead of an amount. |
| `goodWhen` | `up`, `down` |  | `"up"` | Whether being over plan is good ("up", as for revenue) or bad ("down", as for costs). |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

### `waffle`

Part to whole as a 10 by 10 grid where each square is one percent, filled category by category in reading order, with a legend of values and shares. Easier to count than a pie. With total, the share of a whole: 62 of 100 squares filled.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |
| `label` | field name (category) | yes |  | Field naming each category. |
| `value` | field name (number) | yes |  | Field with each category's amount. Zero and negative values are left out. |
| `total` | number |  |  | The whole the values are part of, when they do not add up to it; the rest of the grid stays empty. Example: 100 for percentages. |
| `sort` | `value`, `label`, `none` |  | `"none"` | Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data's order. Stacked bars and strips rank by their total. |
| `order` | `desc`, `asc` |  |  | Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label. |
| `limit` | number |  |  | Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other. |
| `other` | any |  |  | With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole. |

### `waterfall`

A bridge: how a total moves to another through increases and decreases, each floating from the running total, with totals standing on zero.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field naming each step. |
| `value` | field name (number) | yes |  | Field with each step's change, or the amount for total rows. |
| `totals` | any |  |  | Labels of rows that are totals (drawn from zero, resetting the running total), for example ["Q2 revenue"]. |
| `endLabel` | string |  |  | Adds a final total bar with this label, for example "Q3 revenue". |
| `fit` | boolean |  | `false` | Fit the axis to the running totals instead of starting at zero, so small changes stay visible. Totals then rise from the axis floor. |
| `highlight` | any |  |  | Category value or values to keep in color; every other category turns grey. Example: "East" or ["East", "North"]. Or a rule on the rows: { "field": "revenue", "op": ">", "value": 1000000 } keeps the categories above 1M in color, and { "top": 3 } the three largest. |

### `whitespace`

The cross-sell map (whitespace analysis): one cell per client and product, filled where the client holds the product, outlined where it is an opportunity (tinted by how likely), blank where the client is not eligible. Each row ends with its penetration (3 of 8) and the revenue still to win; each column ends with how many hold it and how many could. Rows sort with the most to sell first.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `row` | field name (category) | yes |  | Field naming each row, usually the client. |
| `column` | field name (category) | yes |  | Field naming each column, usually the product. |
| `state` | field name (category) | yes |  | Field saying whether the row holds the column, could (an opportunity), or is not eligible. See states. |
| `states` | array |  | `["Holds","Opportunity","Not eligible"]` | The three values the state field uses, in order: held, opportunity, not eligible. Default ["Holds", "Opportunity", "Not eligible"]. |
| `score` | field name (number) |  |  | Field with how likely each opportunity is, 0 to 100 (a propensity). An opportunity cell's tint strengthens with it. |
| `value` | field name (number) |  |  | Field with the money in each cell: revenue where held, potential where open. Written in the tooltip; the open cells' sum ends each row. |
| `sort` | `potential`, `penetration`, `none` |  | `"potential"` | Row order: "potential" puts the rows with the most to win first, "penetration" the least covered first, "none" keeps the rows as given. |
| `limit` | number |  |  | Show only this many rows, the first in the sort order, with a line saying how many more there are. Applied after filters, so a filtered book still shows its own top rows. |

### `xray`

A client x-ray: one client on one card, from its first row. The name and a detail line, a grid of key facts, the products it holds as pills (held in color, not held outlined), a share-of-wallet meter, a small trend, quiet warning flags and a short list of next best actions. For a client page, a pre-meeting brief or a relationship manager's cockpit.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `label` | field name (category) | yes |  | Field with the client's name. |
| `detail` | field name (category) |  |  | Field for the line under the name, such as the segment or the relationship manager. |
| `facts` | field name or list (number) |  |  | Up to six fields shown as small labelled figures: assets, revenue, products held, client since. |
| `holdings` | field name or list (category) |  |  | True/false fields, one per product, drawn as a strip of named pills: held in color, not held outlined. |
| `wallet` | field name (number) |  |  | Field with the share of wallet, 0 to 1, drawn as a meter with its percent. |
| `trend` | field name (category) |  |  | Field whose value is a list of numbers (revenue by month, say), drawn as a small trend with its first and last values written. |
| `flags` | field name (category) |  |  | Field whose value is a list of short warnings, shown as quiet amber pills: ["No contact in 90 days", "Fee leakage"]. |
| `actions` | field name (category) |  |  | Field whose value is a list of next best actions, shown as a short checklist. |
| `audit` | object |  |  | The wallet audit: adds "Audit wallet" (risks, opportunities, coverage and standing, each figure traced to its field) and "Copy strategy" (a 30, 60 and 90-day account strategy as Markdown) to the card. { "key"?: field naming the client, "currency"?: "EUR", "sources": { "holdings", "history", "activity", "health", "deals", "thresholds": each a data spec such as { "type": "url", "url": "/data/holdings.json" }, with "match" naming the client field when it is not "client" or "name" } }. Sources load when the audit is first opened. |

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
