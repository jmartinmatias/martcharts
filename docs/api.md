# API reference

- [The spec](#the-spec)
- [Drawing widgets](#drawing-widgets): `createWidget`, `<fft-widget>`, events
- [Working with specs](#working-with-specs): `fork`, `baseWidget`, `validateSpec`, `runPipeline`, `formatValue`
- [Dashboards](#dashboards): a grid of widgets with one filter row
- [Styling](#styling), [style presets](#style-presets) and [palettes](#palettes)
- [Extending](#extending): new sources, transforms, formats and views
- [Entry points](#entry-points)

Every public function also carries inline documentation in the source, which editors show on hover.

## The spec

A `WidgetSpec` is a plain object. Only `data` and `view` are required.

| Key | Type | What it does |
| --- | --- | --- |
| `id` | string | Stable identifier. The file name in the widget store and the id used over MCP. Lowercase letters, digits and dashes. |
| `title` | string | Heading at the top. |
| `subtitle` | string | Smaller line under the title, for example the period covered. |
| `note` | string | A note in the small print at the bottom, on the data or how to read it. `footer`, its older name, still works. |
| `source` | `{ name, url? }` | Where the data came from, as a credit under the note: "Source: Eurostat", the name a link opening in a new tab when `url` is set. |
| `byline` | string | Who made the chart, in the same credit line: "Chart: Marta". Takes the text templates titles do. |
| `description` | string | What the widget is for. Not drawn on the chart; read by people and agents, and shown on the Details side. |
| `links` | `{ label, href }[]` | Related pages (a report, the data's owner, a runbook), listed on the Details side under **Linked**. |
| `locale` | string | BCP 47 locale for number and date formats, for example `"en-US"`. Defaults to the runtime's. |
| `data` | block | Where rows come from. See [data sources](blocks.md#data-sources). |
| `transform` | block list | Reshaping steps, applied in order. See [transforms](blocks.md#transforms). |
| `fields` | object | Per-field `label` and `format`, keyed by field name. See [formats](blocks.md#formats). |
| `view` | block | How rows are drawn. See [views](blocks.md#views). |
| `headline` | object | One big number above the view, with its change and a caption. See [the headline](#the-headline). |
| `facet` | object | Small multiples: the view once per value of a field, on one shared scale. See [small multiples](#small-multiples). |
| `style` | object | Theme, palette, tokens, density, height. See [styling](#styling). |

A **block** is `{ "type": "<name>", ...options }`. A **row** is one object of field values, for example `{ "region": "North", "revenue": 120 }`.

Field labels default to the field name in words: `unitPrice` becomes "Unit price". Values without a format display as locale numbers or plain text; missing values (null, undefined, NaN) display as empty text.

### Emphasis

When the story is one item, say so: `highlight` keeps it in color and turns everything else grey.

```json
"view": { "type": "bar", "x": "region", "y": "revenue", "highlight": "East" }
"view": { "type": "line", "x": "month", "y": ["revenue", "cost", "target"], "highlight": "revenue" }
```

On `bar` and `hbar` it names category values; on `line` and `area` it names series fields. Pass one name or a list. Grey marks draw behind highlighted ones, and the legend and tooltips use the same colors.

### Combo: lines over bars

`"lines": "target"` on a bar chart draws that field (or several) as lines with dots over the bars, on the same axis. The legend keys bars with squares and lines with short strokes, and the tooltip lists both. There is deliberately no second axis: two scales on one plot invent correlations. Measures of different size belong in two charts or small multiples.

### Stacked bars and end labels

`"stacked": true` on a bar chart builds each category into one column, series stacked from zero (negatives downward) with a 2px gap between segments and only the outer end rounded; the tooltip adds the column total. `"stacked": "percent"` shows each column as shares of 100%. Long data (one row per region and product) becomes the wide data stacks need with the `pivot` transform:

```json
"transform": [{ "type": "pivot", "row": "region", "column": "product", "value": "revenue" }],
"view": { "type": "bar", "x": "region", "y": ["Core", "Plus"], "stacked": true }
```

Lines and areas write each series' last value at its end, for up to 4 series; with `highlight`, only the highlighted series are labelled. When two ends would collide the labels step aside and the legend and tooltip carry the values. Turn them off with `"endLabels": false`.

### Reference lines and bands

Mark a target or a normal range across the value axis of a bar, line, area or scatter chart:

```json
"reference": [
  { "value": 1200000, "label": "Target" },
  { "field": "revenue", "agg": "avg", "label": "Average" },
  { "from": 900000, "to": 1100000, "label": "Normal range" }
]
```

A `value` or a `field` (summarized with `agg`: avg by default, or last, first, sum, min, max) draws a dashed line labelled with its value; `from` and `to` shade a band behind the data. The axis stretches so every mark stays in view.

### Small multiples

`"facet": { "field": "region" }` draws the view once per region, in a grid of panels, instead of crowding every region into one chart:

```json
"facet": { "field": "region", "columns": 3 },
"view": { "type": "area", "x": "month", "y": "revenue" }
```

Panels share one value scale (`"shared": false` turns that off), so a tall line in one panel really is bigger than a short one in another. Several series get one legend above the grid. `columns` fixes the column count; by default as many 233px panels fit as the width allows. Works with every view.

### KPI row

A handful of headline numbers read best as one strip of stat tiles, not separate cards:

```json
"view": { "type": "kpis", "series": true, "items": [
  { "value": "revenue" },
  { "value": "churn", "goodWhen": "down", "label": "Churn" }
] }
```

Each tile shows its label, value and change. `compare` is a field or `"previous"` (the row before); with `series`, values come from the last row, changes compare with the row before by default, and every tile gets a sparkline.

Dashboards also print cleanly: in print, widgets switch to the light theme, drop shadows, glass blur, hover buttons and tooltips, and never split across pages.

### KPI icons

KPI tiles can carry an icon from the built-in set (`"icon": "users"`): users, revenue, cart, heart, clock, target, trend, alert, check, droplet, pin, mail, activity, bolt.

### The headline

Any widget can lead with its key figure, the way dashboards put "$2.86M, down 5.2%" above a chart:

```json
"headline": { "value": "revenue", "compare": "previous", "compareLabel": "vs Aug", "caption": "revenue in {last:month}" }
```

`agg` picks the number: `last` (default) or `first` row, or `sum`, `avg`, `min` or `max` over every row. `compare` is `"previous"` (the row before) or a field summarized the same way; the change shows as a signed percentage with an arrow, green or red by `goodWhen`. The number uses the field's format, or a short form such as 1.2M. All options are in [blocks.md](blocks.md#headline).

### Text templates

The title, subtitle, footer and headline caption can name values from the rows the view draws, so the words follow filters and the dashboard's period:

```json
"subtitle": "{first:month} to {last:month}",
"headline": { "value": "orders", "agg": "sum", "caption": "orders in {count} days" }
```

`{first:field}` and `{last:field}` are the first and last row's value; `{sum:field}`, `{avg:field}`, `{min:field}` and `{max:field}` summarize a field; `{count}` is the number of rows. Values use the field's format, so `{last:month}` with a month format reads "Sep 2026". Templates see the rows after the transforms, so a filtered widget describes what it shows. Other words in braces are left alone, and validation warns when a template names a field that is not in the data. Until the first rows arrive, templated text keeps its space but stays invisible. `fillTemplate(text, rows, fields, locale)` fills a text the same way.

## Drawing widgets

### `createWidget(target, spec, options?) => Widget`

Draws `spec` inside the `target` element.

```ts
import { createWidget } from "martcharts";

const widget = createWidget(document.querySelector("#slot")!, spec, { fetch: myFetch });
await widget.ready;
```

`options.fetch` replaces the global `fetch` for `url` sources (for auth headers, for example). Loads of the same address through the same `fetch` share one request, and the answer is reused for `cache` seconds (default 60; set `"cache": 0` on the source to always fetch), so a dashboard of many widgets fetches each file once and filters redraw without refetching.

`options.actions` offers buttons in the widget's corner, shown on hover and keyboard focus: `"csv"` downloads the rows (labelled headers, raw values), `"image"` downloads the chart as a 2x PNG with its colors baked in (shown only when the view draws a chart), `"copy"` copies the rows as tab-separated text that pastes straight into a spreadsheet, `"explain"` (a question mark) opens or closes **How to read it**, a plain guide under the chart that opens with the sales question it answers (`questionOf`) and then, from `explainChart`, says what each mark is and what bigger, longer or stronger means, ending with one example from the rows, `"info"` turns the card round, with a short swirl (none under reduced motion), to its **Details** side: the question it answers, the chart type and what it is for, where the data comes from (a link for `url` and `csv` sources), the transform steps, how many rows and which fields with their formats, the id and ref, any validation notes, the spec's `description` and `links`, and a Copy spec button. With `info` on, a click on any plain part of the card turns it too (marks, buttons and links keep their own clicks); Escape or **Back to chart** turns it back, and `widget.showDetails(open)` does it from code. And `"expand"` opens the widget redrawn large in a modal dialog (with its guide open from the start) (full screen on phones; Escape, the backdrop or the close button closes it, and focus returns to the button). Inside a dashboard the dialog also steps through the board's widgets: previous and next buttons with a "3 of 44" count, the left and right arrow keys (unless a chart used the arrow to move between its marks), and a sideways swipe on phones. `options.neighbors(widget)` supplies that order for widgets outside a dashboard. None by default: whether people may take the data out is the host's decision. On the tag: `<fft-widget actions="expand csv image copy">`. Past three actions (yours from `addAction` included), the first two stay in the toolbar and the rest go into a **More** menu of labelled items, keyboard friendly (arrow keys, Home, End, Escape back to its button), and the title keeps the toolbar's width free so a long title never runs under it. `options.guide: true` shows the guide from the start. The building blocks are exported too: `toDelimited(rows, label, separator)`, `download(doc, filename, blob)` and `svgToPng(svg, background, scale)`.

The returned `Widget`:

| Member | What it does |
| --- | --- |
| `root` | The widget's `<section class="fft-widget">`. |
| `spec` | The spec currently shown. |
| `rows` | Rows from the last load, after transforms. |
| `issues` | Validation issues from the last load, warnings included. |
| `ready` | Promise that settles when the first render finishes, whether it drew, showed "No data", or showed an error. |
| `update(override)` | Forks the current spec with `override` and redraws. Returns a promise. |
| `setSpec(spec)` | Replaces the spec and redraws. |
| `refresh()` | Reloads the data, skipping the `url` source's cache. The old drawing stays, dimmed, until new rows arrive. |
| `showGuide(open)` | Opens or closes the How to read it guide, keeping the explain button in step. |
| `showDetails(open)` | Turns the card to its Details side or back to the chart. Settles when the turn ends. |
| `addAction(label, icon, onClick)` | Adds your own button to the hover toolbar, styled like the built-in actions: `label` names it for tooltips and screen readers, `icon` is SVG path data on a 24px grid (drawn as 2px strokes), and `onClick` receives the button (set `data-done` or `data-failed` on it for a moment of green or red feedback). Returns the button. A dashboard's `decorate(cell, id, widget)` is the natural place to call it. |
| `destroy()` | Removes the widget and stops work in flight. |

States are exposed on `root` as `data-state`: `loading`, `ready`, `empty` or `error`, with `aria-busy` while loading. While loading, a pulsing silhouette of the view (bars, rows, a stat, a ring or a plot) holds the chart's final height, so the page does not jump when the data arrives; it fades in after 233ms, so fast loads never flash, and screen readers hear "Loading". The empty and error states carry an icon, a title and a hint or the list of problems. An invalid spec, an unknown block, a failed load, or a view that throws shows an error state listing each problem and where it is; it never throws into your page. When updates overlap, only the newest one draws.

### `<fft-widget>`

Call `defineWidgetElement()` once (optionally with your own tag name), or load the built bundle, which calls it for you. Then:

```html
<fft-widget src="/widgets/revenue-kpi.json"></fft-widget>
<fft-widget spec='{"data":{"type":"inline","rows":[{"a":1}]},"view":{"type":"table"}}'></fft-widget>
<fft-widget>
  <script type="application/json">{"data":{"type":"inline","rows":[{"a":1}]},"view":{"type":"table"}}</script>
</fft-widget>
```

| Attribute or property | What it does |
| --- | --- |
| `src` attribute | URL of a spec JSON file to load. |
| `spec` attribute | The spec as JSON. Invalid JSON shows an error in the widget. |
| `<script type="application/json">` child | The spec as JSON inside the tag, read when neither attribute is set. Invalid JSON shows an error. |
| `data` attribute | No spec needed: the address of a data file. Ends in `.csv`: read as CSV; otherwise JSON (with `path` for a list inside the response). The chart is picked from the data with `recommendCharts`. Used when neither `spec` nor `src` is set. |
| `chart` attribute | With `data`: the view type to draw (`line`, `donut`, ...), its fields filled from the data. `auto` or left out picks one. |
| `heading` attribute | With `data`: the widget's title. (Not `title`, which would put a browser tooltip over the whole chart.) |
| `actions` attribute | Space-separated buttons to show: `info`, `csv`, `image`, `copy`, `explain`, `expand`. |
| `preset` attribute | A style preset (`glass`, `airy`, `paper`, `default`...) that wins over the spec's own, so a page can give every tag one look. Removing it restores the spec's. |
| `spec` property | The spec as an object. Setting it redraws the same widget. |
| `widget` property | The live `Widget`, once connected. |

Removing the element destroys its widget.

### Keyboard

Every chart is one tab stop. Inside it, the arrow keys move between marks (bars, points, slices, tiles, rows, cells) with the tooltip following, Home and End jump to the first and last, and Enter or Space selects. In the heatmap, up and down move by row; in the calendar, left and right move a week and up and down a day.

### Events

`fft-select`: fired when the viewer clicks, or presses Enter or Space on, a table row, list item, bar group or line position. It bubbles. `event.detail` is `{ row, spec }`.

```ts
document.addEventListener("fft-select", (event) => {
  const { row, spec } = (event as CustomEvent).detail;
  openDrillDown(spec.id, row);
});
```

## Dashboards

A dashboard is JSON too: a grid of cells and one filter row that scopes every widget below it.

```json
{
  "id": "sales",
  "title": "Sales overview",
  "columns": 3,
  "range": { "field": "month" },
  "filters": [{ "field": "region", "label": "Region" }],
  "widgets": [
    { "section": "Revenue", "description": "Trends and targets" },
    { "widget": "revenue-kpi" },
    { "widget": "monthly-revenue", "span": 2 },
    { "spec": { "title": "Inline widget", "data": { "type": "inline", "rows": [{ "a": 1 }] }, "view": { "type": "table" } } }
  ]
}
```

```ts
import { createDashboard } from "martcharts";

const board = createDashboard(document.querySelector("#board")!, dashboardSpec, {
  widgets: storedSpecsById,         // or resolve: (id) => spec
  actions: ["csv", "image", "copy"],
  decorate: (cell, id, widget) => { /* add your own controls to each cell */ },
  sticky: true,                     // pin the filter row while the page scrolls (under a pinned page header: set --fft-sticky-top to its height)
  hash: true,                       // keep the chosen section in the address (#<section id>)
  guides: false,                    // true opens every widget's How to read it guide from the start
});
await board.ready;
await board.setFilter("region", "East");                 // null clears it
await board.setRange("3M");                              // "6M", "12M", "YTD", "All", ...
board.setSection("Revenue");                             // one section (title or id); null shows them all
board.setGuides(true);                                   // How to read it under every chart at once
await board.setOverride({ style: { preset: "glass" } }); // applies to every widget, survives filtering
```

Each filter offers "All" plus every value of its field found in the widgets' data. Choosing a value filters every widget whose data has that field (headlines and KPIs recompute) and leaves the others alone. Cells span 1 to `columns` columns (default 3); below 1100px the grid drops to 2 columns and below 700px to 1, with wide cells taking the full row. A cell naming an unknown widget shows a message instead of breaking the board. A `section` cell is a full-width heading (with an optional `description`) that groups the cells after it; it is not a widget and takes no filters. With two or more sections, the filter row ends with a **section filter**: All (the default) and one button per section; choosing one shows only that section's heading and cards, the expanded view steps through those cards only, and All brings everything back. With `hash: true` the choice is kept in the address, so a link or a reload opens the board on that section. `validateDashboard(spec)` checks a spec before drawing it.

`range` adds a **Period** control at the head of the filter row: a segmented control of `options` (default `["3M", "6M", "12M", "All"]`; any count of months or years such as `"2Y"`, plus `"YTD"`), starting at `default` (`"All"` when offered). A period keeps the latest months in every widget whose data has the range `field`, counting back from the latest date across those widgets and including its month, and combines with the other filters. The field holds ISO months or dates (`"2026-09"`, `"2026-09-30"`); name several (`"field": ["month", "day"]`) so monthly and daily widgets share one window. Widget subtitles and captions are fixed text, so word them to suit any period or leave the period out. `rangeStart(period, latest)` gives the first month a period keeps: `rangeStart("3M", "2026-09")` is `"2026-07"`.

#### Board chrome

The board keeps its frame quiet so the cards carry the page.

- **`"source": { "name": "CRM", "url": "https://…" }`** writes one "Source: CRM" line under the grid. A card whose own source has the same name drops it from its credit line, and a credit line left empty disappears. The `url` must be a web address.
- **`"collapsed": true`** on a section cell starts that section folded behind its heading. Its widgets are drawn only when it is first opened, with the current filters applied. With `hash: true` the open sections are kept in the address (`o=<ids>`).
- **`"sections": "tabs"`** turns the section filter into tabs with no All: the board opens on the first section, and only a section other than the first is written to the address.
- **`header: false`** (an option of `createDashboard`) leaves out the title block, for a page that already has one. The "Data to …" line then sits at the end of the filter row.
- **Share** is one button in the filter row. It opens a small menu with Copy link (when `hash` is on) and Print, run by the arrow keys, Home, End and Escape.
- **On a phone** (below 640px) the filters fold into one "Filters" button that names how many are set, including a period other than All. It opens them as a sheet with a Done button, and Escape closes it.
- **When a filter cannot reach a card**, the row says so in one line ("Region does not apply to 2 cards"). Each item names its cards on hover or focus. The per-card pill shows only on hover.
- **"Data to …"** names the latest date the cards actually draw, read from each card's own rows. Forecast rows are left out.

A KPI whose value and comparison are both zero shows a muted dash, read aloud as the zero. A change that rounds to nothing shows no delta.

## Working with specs

These need no DOM and work in Node: import them from `martcharts/core`.

### `fork(base, ...overrides) => spec`

Returns a new spec: `base` with each override applied left to right, by JSON Merge Patch rules (RFC 7396):

- objects merge key by key, recursively
- lists and all other values replace
- `null` removes the key
- `undefined` leaves the base alone

Neither input is modified, and the result shares no objects with them.

```ts
const bars = fork(table, { view: { type: "bar", x: "region", y: ["revenue", "cost"], columns: null } });
```

### `baseWidget`

The vanilla block: `{ title: "Untitled widget", data: { type: "inline", rows: [] }, transform: [], fields: {}, view: { type: "table" }, style: { theme: "auto", density: "comfortable" } }`. Frozen; fork it.

### `validateSpec(spec, rows?) => Issue[]`

Checks a spec against the registry. Each issue is `{ level: "error" | "warning", path, message }`, where `path` points into the spec (`view.x`, `transform[1].op`, `fields.revenue.format`) and `message` says how to fix it.

Errors mean the widget cannot draw: missing `data` or `view`, unknown block types, missing required options, options of the wrong kind, bad style values. Warnings flag likely mistakes: more series than palette colors, and, when you pass `rows`, view fields that are not in the data or that should hold numbers but hold none.

`hasErrors(issues)` is true when any issue is an error.

### `suggestView(type, rows) => ViewSpec`

A view of `type` with every required field option filled from the rows. Each field option declares the kind of field it expects (`kind`: `number`, `category` or `date`, listed in [blocks.md](blocks.md)), so amounts get number fields, names and groups get text fields, and periods get ISO-like dates, with no field used twice while another of its kind remains. Lists and objects are never picked. `suggestView("sankey", rows)` on `{ from, to, visits }` rows gives `{ type: "sankey", source: "from", target: "to", value: "visits" }`. The demo playground uses it to switch any widget to any view type.

### The chart guide: `dataContract`, `switchChart`, `switchOptions`, `guideMarkdown`

From `martcharts/core`.

Work on any spec and rows (the spec's inline rows when `rows` is left out). Full output for the catalog is in [chart-guide.md](chart-guide.md) and [catalog/guide.html](../catalog/guide.html).

| Function | Returns |
| --- | --- |
| `chartGuide(type)` | `{ purposes, grain, build, rows: { min, max }, positive?, bestFor, avoidFor }`: the jobs a chart does (1 to 3 per job in `PURPOSES`), what one row stands for, how rows become marks, the row counts it reads well with, and when to use it and not. `chartsFor(purpose)` lists the charts for a job, best first. |
| `dataContract(spec, rows?)` | The table the chart needs: `needs` (every field option, its kind, whether required), `columns` (each column of the data: kind, the options that draw it, distinct count, range, examples), `rowMeans`, `build`, `rowsRead` and `warnings` (what does not fit: repeated categories, text for numbers, negatives in a part-to-whole chart, too few or too many rows). |
| `switchChart(spec, to, rows?)` | The same data as chart `to`: `view` (filled from the columns the current chart draws first), `fit` (`fits`, `stretch`, `no`), `verdict` on the current chart's main job (`better`, `same`, `trade-off`, `different`, `worse`), `gains`, `losses`, `assessment` and `caveats`. |
| `switchOptions(spec, rows?)` | `switchChart` for every other chart, those that fit and help first. |
| `guideMarkdown(spec, rows?, { maxRows? })` | All of the above as Markdown with the data as a table and CSV: ready to hand to another model or system. `rowsToCsv` and `rowsToMarkdown` are exported too. |

### `recommendCharts(rows, { limit? }) => ChartPick[]`

Which chart for these rows? Reads the data's shape (how many rows; which fields hold numbers, categories or dates; how many distinct values; names such as `target`, `open`/`close`, `from`/`to`, `stage`) and ranks the views that suit it, best first (default 5). Each pick is `{ type, view, score, why }`: a complete view block for the rows, a 0 to 100 score, and one sentence such as `"revenue over month: a trend."`. A one-row table becomes tiles (or a gauge, with a target), dates make lines, start and end dates a timeline, shrinking named steps a funnel, flows a sankey (or a chord when they loop back). Every pick validates against the rows. The MCP tool `fft_suggest_charts` wraps it.

### `explainChart(spec, rows?) => string`

A plain reading guide for any of the <!-- views -->57<!-- /views --> views, in the chart's own field names, simple enough for a ten-year-old: what each mark is, what bigger, longer, stronger or further right means, and what the options add (series colors, stacks, a forecast fan, bubble sizes, small multiples). Given the rows the chart draws, it ends with one concrete example: `"Each bar is one region. The taller the bar, the more revenue. Here, East is the tallest, with €2,000."` Color scales are described as stronger or weaker, never darker, since a scale flips on a dark card. Marks are read by side, shape and fill, never by a named color. Charts with a target read against it: a dashed target line is named and the bars are counted against it ("3 of 8 teams are above the 1 hour target"), bars under a target line say how often they beat it, a line says whether its latest actual ended past the target, and a variance counts who is over budget before naming the furthest. The `explain` action, the dashboard's `setGuides`, the Taller's cards and the MCP tool `fft_get_widget_data` (as `howToRead`) all use it.


### `questionOf(spec, rows?) => { kind, text }`

The sales question a chart answers, in one plain sentence built from its own field names: `"Which region has the most revenue?"`, `"Is revenue on target, month by month?"`, `"How did each region change from Q3 2025 to Q3 2026?"`. `kind` names the type of question (rank, target, trend, forecast, mix, compare, change, spread, relation, flow, rhythm, profile, number, detail, opinion, schedule). The rows, when given, name a table's columns when the spec does not list them. The Taller uses it so every new version says which question it answers; the MCP tool `fft_create_variants` returns it for the original too.
### Canonical option names: `canonicalName`, `normalizeView`, `canonicalSpec`, `readable`, `alsoAccepts`

One idea goes by one option name on every view:
- `value` is the measure or measures (also on `dot`, `strips` and `likert`).
- `color` is color by category (`scatter`, `locator`).
- `flag` is a yes/no field (`matrix`).
- A choropleth's `labels` takes `"codes"` or `"none"`.

The older spellings still work. Validation warns once per spec, naming the new name.

- `canonicalName(view, option)` gives the name to show.
- `alsoAccepts(view, option)` gives the older spellings.
- `normalizeView(view)` maps a view onto the names its renderer reads.
- `readable(spec)` does the same for a whole spec.
- `canonicalSpec(spec)` and `canonicalView(view)` go the other way, writing canonical names.

`OPTION_ALIASES` lists every rename.

### RAG statuses: `ragOf`, `ragFromValue`, `worstOf` and the `rag` transform and format

Statuses are `"R"`, `"A"`, `"G"` and `"N"` (no data).
- `ragOf(value)` reads letters, words (`red`, `amber`, `green`, `grey`) and the status words in any case.
- `ragFromValue(value, { green, amber, goodWhen })` applies thresholds: on track from `green`, at risk from `amber`, mirrored when lower is better.
- `worstOf(statuses)` gives the worst status, ignoring missing data.
- `ragTrend(previous, current)` says whether a status improved, got worse or held.

Each status is drawn as a shape and a word, never color alone: a circle for On track, a triangle for At risk, a square for Off track, a hollow circle for No data. `RAG_WORDS` and `RAG_SHAPES` hold the defaults, and every RAG view and format takes `words` and `shapes` overrides.

The `rag` transform turns numbers into status columns:

```json
{ "type": "rag", "rules": [{ "field": "nps", "green": 40, "amber": 20 }], "overall": "status" }
```

The `rag` cell format draws the pill. `"rag": { "green", "amber", "goodWhen" }` on `kpi` and `kpis` adds a pill beside the number.

### Maps: `basemapNames`, `resolveGeo`, `project`

From `martcharts/geo`.

`basemapNames()` lists the built-in tile grids, `europe` and `us-states`. `guessBasemap(values)` picks one from a column of codes. `resolveGeo(geo)` and `project(collection, width, height)` are the geometry the map views use, with no DOM, so they run in Node too.

### Full-card export: `cardToSvg`, `cardToPng`

`cardToSvg(card, background)` returns the whole card as SVG markup: title, subtitle, headline, the chart, HTML legends, footer and credit line. `cardToPng(card, background, scale)` resolves to a PNG blob. The `image` and `svg` actions use them.

### Colour by rules: `spec.colorRules`, `matchRule`, `ruleColors`

`"colorRules": [{ "field": "change", "op": "<", "value": 0, "color": "down" }]` gives every mark whose row matches a rule that rule's colour; the first matching rule wins, over `colors`. `op` is one of `>`, `>=`, `<`, `<=`, `==`, `!=`, `in` and `not in` (`value` a list for the last two). Leave out `field` and the rule reads the mark's own category: `{ "op": "==", "value": "Late", "color": "#c03a2b" }`. `color` is a CSS colour, or one of the theme's own: `up`, `down`, `accent`, `muted`, so a rule follows light and dark. Anything that could leave the style (a `url()`, a `;`) is refused by validation. The chart writes the rules that colour something in words above it ("Change below 0", or the rule's own `label`), in the widget's language, so the colour never carries the meaning alone. Views get `ctx.colorOf(category)` (rules, then `colors`) and `ctx.colorForRow(row)` for marks that stand for one row. `matchRule(rule, row, categoryField?)` is the one matcher every rule in the library uses.

### Highlight by number

`highlight` takes, besides names, a rule: `{ "field": "revenue", "op": ">", "value": 1000000 }` keeps the categories whose rows match in colour, and `{ "top": 3 }` (with an optional `field` and `"order": "asc"`) the top three by a measure, the view's first number when none is named. The widget turns the rule into names before the view draws (`highlightedNames(rule, rows, categoryField)`), so it works on every view that highlights categories. A rule that picks nothing lights nothing. Lines, areas and radars highlight series, so a rule there is a validation error.

### Rich tooltips

A `tooltip` template with markup reads as rich lines: `**bold**`, a new line per line, `{field}` in the field's format, `{field|percent}` (or any format type) in a named format, and `{field|bar}` as a small bar, its length the value's share of the largest. Summary tokens (`{count}`, `{sum:revenue}`) work too. The template is read once into runs (`richLines(template, row, ctx)`), and the row only fills them as text, so no value is ever read as markup or HTML. A template without markup keeps the "Label: value" rows.

### Live data and Google Sheets

`refresh: seconds` on a `url`, `csv` or `sheet` source reloads the data on that beat (never faster than every 5 seconds) and redraws. A failed reload keeps the last good rows and says so; a beat that falls while the page is hidden waits for the page to show again; `destroy()` stops it. The footer says "Updated 12:04" in the widget's language and locale.

`{ "type": "sheet", "url": "https://docs.google.com/spreadsheets/d/<id>/edit#gid=0" }` reads a Google Sheet through its CSV export. The address can be the one in the browser or the one "Publish to web" gives; `gid` picks a tab. The sheet must be published, or shared so anyone with the link can view it. `sheetCsvUrl(address, gid?)` is the conversion.

### Embeds that size themselves: `examples/embed.html`, `mountEmbed`, `listenForEmbedHeights`, `frameEmbed`

`examples/embed.html` draws one chart or dashboard with no page chrome, for an iframe: `?spec=<widget spec in base64url>`, `?src=<address of a spec>` or `?board=<dashboard spec in base64url>`, plus `&actions=csv,image`. It posts `{ type: "martcharts:height", height }` to its parent on load and on every resize. In the host page, the drop-in bundle runs `listenForEmbedHeights(window)` by itself, and a page that only holds iframes can load `examples/embed-host.js` instead; either sets each iframe's height to its chart's. `frameEmbed(kind, spec, embedHref, title)` writes the iframe code; the editor and the composer show it beside their other embed codes (`embedHref` option).

### Breakpoints: `spec.responsive`

`"responsive": [{ "maxWidth": 480, "override": { "view": { "limit": 5, "labels": false } } }]` merges the override's `view` and `style` into the spec on a card narrower than `maxWidth`, widest rule first so the narrowest has the last word. The widget re-evaluates on every resize and reshapes the rows when the override changes `sort`, `limit` or `other`. Other keys in an override are ignored, with a warning. `atWidth(spec, width)` gives the spec as drawn at a width.

### The drawing kit for custom views

Custom views that use the kit size, space and behave like the built-in ones.

**Measures and layout** (from `martcharts`):
- `textWidth(text, size?, weight?)` measures text width, tuned for San Francisco.
- `labelColumn(names, width)` sizes a label column.
- `endRoom(texts)` reserves room for value labels at bar ends.
- `ROW`, `rowHeight(count)`, `GAP` and `DIM` are the spacing scale and the hover dim.

**Behaviour:**
- `legendList(ctx, entries)` builds a legend. It returns nothing inside small multiples.
- `rowHit(ctx, …)` and `activeGroup(wrap)` provide the hover, focus, tooltip and select dance.
- `hiddenTableOf(ctx, rows, columns)` builds the table screen readers read.
- `shareFormat(locale)` formats shares.

The style tokens `--fft-dim`, `--fft-radius-s`, `-m`, `-l` and `--fft-fs-xs` to `-xl` keep custom CSS on the same scale.

### `runPipeline(spec, ctx?) => Promise<Row[]>`

Loads the rows and applies the transforms. `ctx.fetch` replaces the global `fetch`; `ctx.signal` cancels. Throws with a readable message when the source is unknown, loading fails, or the source returns something other than a list of objects. `applyTransforms(rows, steps)` runs only the transform half.

### `formatValue(value, format?, locale?) => string`

Formats one value the way a widget would. `fieldLabel(field, fields?)` and `humanize(field)` do the same for labels.

```ts
formatValue(0.256, "percent", "en-US");                           // "26%"
formatValue(1234.5, { type: "currency", currency: "EUR" }, "en-US"); // "€1,234.50"
formatValue("2026-03-05", { type: "date", style: "month" }, "en-US"); // "Mar 2026"
```

### Auditing a wallet

`auditWallet(input)` audits one client's wallet from its row (`client`) and, when given, its `holdings`, `history`, monthly `activity`, `health` row, `deals` and the health `thresholds`. It returns data, not sentences:

- the profile: segment, banker, since, AuM, revenue, fees;
- the wallet: share of wallet, the full wallet estimated as AuM ÷ share, and what sits elsewhere;
- coverage: held, eligible, penetration;
- opportunities ranked by propensity × potential, each with an open deal on the same product;
- risks, worst first, each with the rule that raised it (a health threshold, an anomaly flag, days since contact, complaints in 90 days, one product above 60% of the revenue);
- momentum over twelve months, the pipeline, the last touchpoints, and the gaps: every source or field it could not read.

Every figure carries `from`, the field it was read from (`client.aum`, `holdings[FX].potential`), so the audit can be checked.

`strategyMarkdown(audit, locale)` writes the account strategy in English, French or German: a three-line summary, where the wallet stands, what we hold and could, risks first, ranked opportunities, actions within 30, 60 and 90 days (each with its owner and a target taken from the thresholds or today's value), talking points, what to watch, and the data and assumptions. `strategyText` gives the same as plain text for an email or a CRM note.

On a card, the x-ray's `audit` option does the same for the client it shows, adding "Audit wallet" (a panel of risks, opportunities, coverage and standing) and "Copy strategy" (with "Download .md"). Its sources load on first use and are matched by name, so a card that follows the clicked client audits that client:

```json
"audit": {
  "currency": "EUR",
  "sources": {
    "holdings": { "type": "url", "url": "/data/holdings.json" },
    "health": { "type": "url", "url": "/data/client-health.json", "match": "name" },
    "thresholds": { "type": "url", "url": "/data/rag-thresholds.json" }
  }
}
```

`node scripts/wallet-strategy.ts "Aldana Holdings" fr-FR` prints the strategy for a client of the commercial cockpit's data.

## Styling

```json
"style": {
  "preset": "glass",
  "theme": "auto",
  "palette": ["#2a78d6", "#eb6834"],
  "tokens": { "accent": "#0a7d5a", "surface": "#ffffff" },
  "density": "compact",
  "height": 280
}
```

| Key | Values | What it does |
| --- | --- | --- |
| `preset` | `default`, `glass`, `airy`, or any registered name | A named look from the [preset library](#style-presets). |
| `theme` | `auto`, `light`, `dark` | `auto` follows the operating system, and a `data-theme="light"` or `"dark"` on the page's `<html>` overrides it. |
| `palette` | list of CSS colors, or a palette name | Series colors in order, or a [library palette](#palettes) such as `"apple"`. Defaults to a validated 8-color set with separate dark-mode steps. |
| `tokens` | object | Override color roles: `surface`, `text`, `textSecondary`, `muted`, `grid`, `axis`, `border`, `accent`, `positive`, `negative`. |
| `density` | `comfortable`, `compact` | Spacing. |
| `height` | number | Chart height in pixels. Defaults to the width divided by the golden ratio, kept between 180 and 320. |

Every color is a CSS custom property on `.fft-widget` (`--fft-surface`, `--fft-series-1`, ...), so page CSS can theme all widgets at once:

```css
.fft-widget { --fft-accent: #0a7d5a; --fft-radius: 4px; }
```

Spacing, type and motion follow Fibonacci framing: spacing steps of 2, 3, 5, 8, 13, 21 and 34 px, type at 11, 13, 21 and 34 px, motion at 377, 610 and 987 ms, and golden-ratio proportions for chart height and bar width. The first draw animates once (bars grow, lines draw); redraws stay still, and `prefers-reduced-motion` turns motion off.

### Style presets

A preset is a whole look in one word: `"style": { "preset": "glass" }`. A spec's own `tokens` and `palette` still win over the preset, so you can start from a look and adjust it.

| Preset | Look |
| --- | --- |
| `default` | Quiet cards with hairline borders, following the light or dark theme. |
| `glass` | Frosted translucent cards for dark, image or gradient backdrops: blur, 21px radius, pill bars on soft tracks, blue and gold first. |
| `airy` | Chrome-free for light pages: no card, generous whitespace, small grey labels over large numbers, orange first, solid value pills. |

Every shipped palette reuses the validated hues in an order checked for colorblind separation and contrast on that preset's surface.

Add your own with `registerPreset`. In its `css`, `&` stands for the widget root:

```ts
import { registerPreset } from "martcharts";

registerPreset({
  name: "ink",
  description: "Monochrome print look.",
  palette: ["#111111", "#6b6b6b"],
  marks: { barRadius: 0 },
  css: `
& { --fft-accent: #111111; --fft-radius: 0px; --fft-shadow: none; }
& .fft-title { text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; }
`,
});
```

`marks.barRadius` (a number, or `"full"` for pills) and `marks.barTrack` (a soft track behind each bar) change chart geometry. `describePresets()` lists every preset; the MCP server's `fft_list_blocks` and `fft://blocks` include them.

### Palettes

`style.palette` takes a list of colors, or the name of a library palette:

| Name | Palette | Good for |
| --- | --- | --- |
| `default` | The validated house palette, with dark-mode steps | Any number of series, up to 8 |
| `apple` | Apple system colors, ordered for colorblind separation | Vivid dashboards; label yellow and orange on white |
| `credit-agricole` | The bank's green, teal and red, plus a grey (approximate logo colors from public sources) | Branded reports |
| `bw` | Black to light grey | Print, one series |
| `50-shades` | Eight greys | Quiet context, or one colored series against greys |

Register your own with `registerPalette({ name, label, description, colors, darkColors? })`.

`checkPalette(colors, { mode, surface? })` measures whether colors in that order can be told apart: colorblind separation of neighbours (OKLab distance under simulated red-green colorblindness; 8 or more passes, 6 to 8 asks for labels), separation for everyone else (15 or more), the lightness band for the background, colorfulness, and 3:1 contrast. It and the color helpers behind it come from `martcharts/color`: `parseHex`, `toHex`, `contrast`, `luminance`, `oklab`, `oklch`, `deltaE`.

#### The palette picker

`createPalettePicker(target, options)` draws a professional color chooser: library chips, one editable swatch per color (color field and hex), an eyedropper per swatch that picks a color from anywhere on screen (in browsers with the EyeDropper API, such as Chrome and Edge), add and remove, and the live `checkPalette` readout.

```ts
import { createPalettePicker } from "martcharts/color";

createPalettePicker(document.querySelector("#colors")!, {
  value: "apple",
  onChange: (colors, name) => widget.update({ style: { palette: name ?? colors } }),
});
```

`onChange` receives the colors, plus the library name while they are unmodified. `picker.set(value)` replaces the colors quietly, and `picker.setSurface(mode, surface?)` re-checks against another background (palettes with dark steps swap to them).

## Extending

Every block is a descriptor plus code. The descriptor (`type`, `description`, `options`) is what validation, [docs/blocks.md](blocks.md) and the MCP server read, so describe options carefully. Option types: `string`, `number`, `boolean`, `field` (a field name), `fields` (one or a list), `enum` (with `values`), `array`, `object`, `function`, `any`. Add `validate(spec)` for checks the option types cannot express; return one message per problem.

### A data source

```ts
import { registerSource } from "martcharts";

registerSource({
  type: "csv",
  description: "Fetches a CSV file. The first line holds the field names.",
  options: { url: { type: "string", required: true, description: "Address of the CSV file." } },
  async load(spec, ctx) {
    const text = await (await ctx.fetch(spec.url as string, { signal: ctx.signal })).text();
    const [head, ...lines] = text.trim().split("\n").map((line) => line.split(","));
    return lines.map((cells) => Object.fromEntries(head!.map((name, i) => [name, cells[i]])));
  },
});
```

### A transform

Must return new rows and leave its input untouched.

```ts
registerTransform({
  type: "rename",
  description: "Renames one field.",
  options: {
    from: { type: "field", required: true, description: "Current name." },
    to: { type: "string", required: true, description: "New name." },
  },
  apply: (rows, step) =>
    rows.map(({ [step.from as string]: value, ...rest }) => ({ ...rest, [step.to as string]: value })),
});
```

### A format

```ts
registerFormat({
  type: "bytes",
  description: "File sizes: 1.2 MB.",
  options: {},
  format: (value, _options, locale) =>
    new Intl.NumberFormat(locale, { style: "unit", unit: "megabyte", maximumFractionDigits: 1 }).format(Number(value) / 1e6),
});
```

### A view

A renderer gets a `ViewContext` and draws into `ctx.el`. It may return a cleanup function.

| `ctx` member | What it is |
| --- | --- |
| `el` | Empty container to draw into. |
| `rows` | Rows after transforms. Never empty: the widget handles that state. |
| `view`, `spec` | This view's options, and the whole spec. |
| `width`, `height` | Pixels available. The widget redraws when its width changes. |
| `label(field)` | The field's label. |
| `format(value, field?)` | The value formatted with the field's format. |
| `color(i)` | CSS color for series `i`, from the palette in order. |
| `tooltip.show(anchor, title, items)`, `tooltip.hide()` | The widget's tooltip. Text only. |
| `select(row)` | Fires `fft-select` with the row. |

```ts
import { registerView } from "martcharts";
import { html } from "martcharts/kit";

registerView({
  type: "progress",
  description: "A labelled bar showing value out of target.",
  options: {
    value: { type: "field", required: true, description: "Field with the current value." },
    target: { type: "field", required: true, description: "Field with the target." },
  },
  render(ctx) {
    const row = ctx.rows[0]!;
    const share = Math.min(1, Number(row[ctx.view.value as string]) / Number(row[ctx.view.target as string]));
    const track = html(ctx.el.ownerDocument, "div");
    track.style.cssText = "height:8px;border-radius:4px;background:var(--fft-grid)";
    const fill = html(ctx.el.ownerDocument, "div");
    fill.style.cssText = `height:100%;width:${share * 100}%;border-radius:4px;background:${ctx.color(0)}`;
    track.append(fill);
    ctx.el.append(track);
  },
});
```

To let the MCP server validate specs that use a custom view, register the same descriptor in Node without `render`. `setRenderer(type, render)` attaches drawing code to a view registered elsewhere.

Chart helpers for custom charts come from `martcharts/kit`: `niceTicks`, `linearScale`, `bands`, `layoutBars`, `barPath`, `linePath`, plus `html`, `svg`, `selectable`, `buildTable` and every built-in renderer.

### Introspection

`describeBlocks(kind)` returns every registered block's descriptor as JSON-safe data. `blockTypes(kind)`, `hasBlock(kind, type)` and `getBlock(kind, type)` look blocks up. Unknown types throw `UnknownBlockError`, whose message lists the types that exist.

## Entry points

Each name has one home. The front door holds what most pages need; the rest is one import path away.

| Import | Contents | Runs in |
| --- | --- | --- |
| `martcharts` | The front door, with the built-in renderers attached: `createWidget`, `createDashboard`, `createEditor`, `createComposer`, `defineWidgetElement`; `fork`, `baseWidget`, `validateSpec`, `hasErrors`, `validateDashboard`, `runPipeline`, `formatValue`, `widgetRef`; `explainChart`, `questionOf`, `recommendCharts`, `suggestView`, `describeBlocks`, `wordsFor`, `langOf`, `WORDS_EN`; every `register*` function; the RAG helpers (`applyRag`, `ragOf`, `ragFromValue`, `ragWord`, `ragCounts`, `worstOf`, `RAG_ORDER`); `auditWallet`, `strategyMarkdown`, `strategyText`; `cardToSvg`, `cardToPng`, `download`; the embed helpers (`mountEmbed`, `frameEmbed`, `listenForEmbedHeights`, `postHeights`, `dashboardEmbed`, `embedCodes`); and every spec type. | Browser |
| `martcharts/core` | The whole engine with no DOM: the above that needs no page, plus the registry, the option aliases, colour and highlight rules, templates, headlines, reference lines, presets, the chart guide and data contract (`chartGuide`, `dataContract`, `switchChart`, `describeChart`). | Browser, Node, workers |
| `martcharts/kit` | The drawing kit: every built-in renderer (`renderBar` and the rest), layout and geometry (`niceTicks`, `linearScale`, `bands`, `layoutBars`, `squarify`, `layoutSankey` and more), `html`, `svg`, `buildTable`, `selectable`, styles (`BASE_CSS`, `applyStyle`), and the editor and composer plumbing (`readHash`, `rowsFromTable`, `boardFromHash`, `localBoardStore`). | Browser |
| `martcharts/color` | Colour science (`oklab`, `oklch`, `contrast`, `deltaE`, `checkPalette`), the named palettes (`getPalette`, `resolvePalette`, `describePalettes`) and `createPalettePicker`. | Browser, Node (all but the picker) |
| `martcharts/geo` | Basemaps, projection and features: `basemapNames`, `resolveGeo`, `project`, `guessBasemap`. | Browser, Node, workers |
| `martcharts/taller` | `createVariants`, `rankVariants`, `explainVariant` and the Taller's moves, audiences and qualities. | Browser, Node, workers |
| `martcharts/mcp` | `createFftServer`, plus the store from `src/mcp/store.ts`. | Node |
| `martcharts/standalone` | Built bundle (`dist/martcharts.js`, from `npm run build:lib`): everything above but the MCP server, compiled, with `<fft-widget>` registered. `dist/martcharts.iife.js` is the same as a classic script, and `window.MartCharts` carries the whole API, so drop-in pages reach any name without choosing a path. Types in `dist/types`, with `HTMLElementTagNameMap["fft-widget"]`. | Browser, no bundler; imports safely in Node |
| `martcharts/lite` | The display-only bundle (`dist/martcharts-lite.js`): widgets, dashboards, embeds and export, no editor. | Browser, no bundler |

## Colour: which rule wins

A mark takes the first colour that applies, in this order:

1. **`colorRules`**: the first rule its row matches ("revenue below 0 is the down colour").
2. **`colors`**: the fixed colour named for its category ("Off track" is always red).
3. **The palette**: the series or category colour, in order.

`highlight` is not a colour of its own. It keeps the named marks in the colour they took from the list above and greys
every other mark, so a highlight still reads on a chart coloured by rules. A rule that colours a mark the highlight does
not name is greyed with the rest; its key line above the chart stays, so the rule is never hidden.

## What `description` is for

`description` says what a widget is for, in plain words. It is shown on the card's Details side (the `info` action) and
read by agents through the MCP tools; it is never drawn on the chart itself.
