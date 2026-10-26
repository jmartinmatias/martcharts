# Features in detail

The README keeps to one line per feature. This page has the rest: what each block and option does, which view for which question, the Datawrapper parity list, the editor, the composer and the visual system. Every option of every block is in [blocks.md](blocks.md), generated from the code.

## What is built in

| Slot | Blocks |
| --- | --- |
| Data sources | `inline`, `url`, `fn`, `csv`, `sheet` (a published Google Sheet). `"refresh": 60` on a url, csv or sheet source reloads every minute, keeps the last good rows on an error, says "Updated 12:04", and pauses while the page is hidden |
| Transforms | `filter`, `sort`, `limit`, `aggregate` (including `list`, for spark columns), `pivot` (long to wide), `calc`, `bin` (value bands with counts), `rag` (numbers to Red, Amber, Green statuses against thresholds, with an overall worst-of column) |
| Formats | `number`, `currency`, `percent`, `date`, `badge` (status pills), `spark` (mini trends in table and list cells), `bar` (in-cell data bars scaled to the column), `delta` (signed changes with an arrow, good or bad), `heat` (cells tinted on one shared scale, for heat tables), `rag` (a status pill with its shape and words: On track, At risk, Off track), `text` |
| Views | <!-- views -->57<!-- /views --> of them, grouped by the question they answer below |
| Emphasis | `highlight` keeps the named categories or series in color and greys the rest, on every view that has categories or series to name; it also takes a rule, `{ "field": "revenue", "op": ">", "value": 1000000 }`, or `{ "top": 3 }`. `colors` fixes a category's color on every chart; `colorRules` colours each matching mark and writes the rules in words above the chart |
| Combo | `"lines": "target"` on a bar chart draws lines over the bars on the same axis (never a second one); under a target line, bars that fall short are drawn outlined and keyed Below target; `"compare": "lastYear"` stands a wider, quieter column behind each bar |
| Two units | `dual`: two measures in different units (revenue and churn) on two panels sharing one time axis, each on its own scale, as bars or lines. The honest form of a dual-axis chart: no second axis, so no false crossings |
| Notes | `"annotations": [{ "x": "2026-03", "text": "Price rise" }]` on bar, line and area pins short notes to points, each a few words beside a dot with a thin leader; on a narrow card they become numbered markers with the texts listed under the chart |
| Line marks | `"points": true` draws a symbol at every reading; `"peaks": true` names the highest and lowest point; `"scale": "log"` draws the value axis by powers of ten, for growth that multiplies |
| Part-to-whole | `"stacked": true` or `"percent"` on bar and hbar charts; `donut` for up to 6 slices |
| Reference marks | `"reference": [{ "value": 1200000, "label": "Target" }]` draws target lines and bands on bar, line, area and scatter charts |
| Sort and top N | `sort`, `order`, `limit` and `other` on category views keep the top N and fold the rest into one "Other" row, so the parts still add up |
| Dashboards | `createDashboard(el, spec, { widgets })` lays out widgets from one JSON file, with a filter row that scopes every widget with that field, a Period control (`"range": { "field": "month" }`: 3M, 6M, 12M, YTD, All), full-width section headings (`{ "section": "Revenue" }`) with a section filter, cross-filtering on click, `follow` for cards that follow the clicked entity, Copy link, Print and an as-of line |
| Text templates | Titles, subtitles, footers and headline captions can say `{first:month} to {last:month}`, `{count} deals` or `{sum:revenue}`, filled from the rows the chart draws |
| Tooltips | `"tooltip": "**{region}**\nShare {share|percent} {revenue|bar}"`: bold, named formats and a small bar, never HTML from the data |
| Export | `createWidget(el, spec, { actions: ["csv", "image", "svg", "copy"] })` adds download CSV, PNG and SVG of the whole card, and copy-for-Excel. Past three actions, the first two stay in the toolbar and the rest go into a labelled More menu |
| Embeds | `examples/embed.html?spec=…` (or `?src=`, `?board=`) in an iframe posts its height; the drop-in bundle or `examples/embed-host.js` sets the frame's height |
| Breakpoints | `"responsive": [{ "maxWidth": 480, "override": { "view": { "limit": 5 } } }]` changes the view on a narrow card, re-evaluated on every resize |
| How to read it | The `explain` action (a question mark in the toolbar) shows a plain guide under any chart, in English, French or German, at most three sentences: what a mark is, and one finding. `explainChart(spec, rows)` gives every view that guide in the chart's own field names |
| Languages | Every word on a chart, the widget chrome, the dashboards and the editor reads in English, French or German from the spec's `locale`, as do numbers, dates and country names |
| Accessibility | Conforms to EN 301 549 v3.2.1 (European Accessibility Act), that is WCAG 2.1 AA, plus WCAG 2.2 target size and focus not obscured: keyboard reach for every mark, a data table behind every chart, 4.5:1 text and 3:1 marks in every theme and preset, color never the only signal, Escape-dismissable tooltips, one tab stop per card on dashboards, filter changes announced. See [accessibility.md](accessibility.md) |
| Taller | `createVariants(spec, rows, { seed, moves, audience, color, marks })` applies elBulli's creative method, abstracted and aimed at sales, to any widget: seeded new versions with the same numbers, each saying which sales question it answers and made by one of seven sales moves (decompose, reframe, distill, contrast, reveal, combine, reform). Each is valid, colorblind safe, never a copy, and scored on emphasis, surprise, honesty, detail and insight. See [taller.md](taller.md) |
| Line texture | `"curve": "smooth"` (never swings past a point) or `"step"` on line and area charts |
| Languages | Charts and dashboards read in English, French or German: `locale` on a spec, `locale` on `createDashboard` (every card and the board's own words, filters, notes, Share and the as-of line), `<fft-widget locale>`, `&lang=fr` on an embed, and `previewLocale` on the editor and composer. A spec's own words (titles, subtitles, labels, a board's sections) come in each language through its `i18n`, and every worked widget and board carries French and German. On the site, the Look menu's Language group sets it for every page and keeps it in the address (`?lang=fr`), which wins, so a shared link opens in its language; the site's own words (menu, page heads, buttons, the Catalog's search) follow from a dictionary in `public/site-look.js`. Data values and the view registry's chart descriptions in the Catalog and Data guide stay English |
| Chart refs | Every chart on every page wears a ref such as `W-7Q2K`, unique to the chart and its place: the same widget on Home, in the catalog and on a board has three refs. A dashboard card keeps its widget's own `widgetRef(id)`, so the MCP tools still take it in place of the id ("fix W-7Q2K"). Click to copy. [docs/refs.json](refs.json) lists every ref with its title, where it sits and a link; the catalog search takes a ref (an old catalog code says what it became), and an address ending in `#W-7Q2K` opens the right tab and section and focuses the chart |
| Small multiples | `"facet": { "field": "region" }` splits any chart into one panel per value, on one shared scale |
| KPI icons | `"icon": "users"` and 13 more line icons on KPI tiles |
| Direct labels | Lines and areas write each series' last value at its end (up to 4 series, hidden when ends collide) |
| Headline | A big number with its change and a caption above any chart: `"headline": { "value": "revenue", "compare": "previous" }` |
| Maps | `"geo": "europe"` or `"geo": "us-states"` puts rows on a built-in tile grid by their country or state code (every region the same size, so Luxembourg reads like France); `"geo"` also takes a GeoJSON FeatureCollection or its address for true shapes, with `lat` and `lon` for points. No dependencies, no tiles, no keys |
| Style presets | `default`, `glass` (frosted translucent cards), `airy` (chrome-free editorial), `paper` (print: warm paper, serif titles). Every preset has a light and a dark look that follow the theme |
| Palettes | `default`, `apple`, `credit-agricole`, `bw`, `50-shades`, five acclaimed ones with their exact published colors (`okabe-ito`, `tol-vibrant`, `tableau-10`, `carbon`, `observable-10`), or any list of colors. Every named palette has a light and a dark set; `createPalettePicker` chooses them with an eyedropper and live colorblind checks |

## Which view, in detail

Start from what you want the reader to see. Every view takes plain rows; `suggestView(type, rows)` fills a view's options from the data, so switching between candidates costs nothing.

| You want to show | Views |
| --- | --- |
| One number and how it moved | `kpi` (one figure, its change and a sparkline), `kpis` (a row of them), `gauge` (one figure on a known scale). Any tile takes `"rag"` thresholds for an On track, At risk or Off track pill; any chart takes a `headline` |
| Progress to a goal | `meter` (one bar per goal), `bullet` (with poor, fair and good bands), `rings` (a few goals at once). Each says where it stands: Target met, or how far it has to go |
| A ranking or a comparison | `hbar` (labels on the left; several values make grouped, stacked or split bars; `"mark": "lollipop"` for many similar values), `dot` (several measures per item on one axis), `dumbbell` (a before and an after; `"mark": "arrow"` points the way each moved), `slope` (who moved between two periods) |
| Change over time | `line`, `area` (`"stacked": "stream"` for a streamgraph; `"forecast"` and `"band"` for a forecast fan), `bar` (`"compare"` stands last year behind each bar), `calendar` (day by day), `candlestick` (open, high, low and close) |
| Two measures in different units | `dual` (one panel each, sharing the time axis: the honest dual-axis chart) |
| Many time series at once | `horizon` (a thin row per series, values folded into bands of deepening color) |
| Rank over time | `bump` |
| A cycle that wraps round | `rose` (hours of the day or months of the year, wedges true to their values by area) |
| Patterns across two dimensions | `heatmap` (one shaded cell per pair, such as weekday by hour), `matrix` (a mark per pair, sized and shaded; or a square where a flag is yes, such as who must comply) |
| Parts of a whole | `pie` (shares on the slices), `donut` (up to 6 parts, the total in the middle; `"arc": "half"` for seats and a majority line), `waffle` (100 countable squares), `treemap` (many parts), `sunburst` (two or three levels), `icicle` (a hierarchy laid flat, easier to label) |
| Size and mix at once | `marimekko` |
| What makes up a change | `waterfall` (a bridge from one total to the next), `variance` (actual against plan, good or bad) |
| Where the bulk is | `pareto` (the vital few behind 80%) |
| How values spread | `histogram`, `boxplot` (quartiles and outliers), `beeswarm` (every point), `ridgeline` (shapes side by side) |
| Two groups across ordered bands | `pyramid` (women and men by age group, two counts back to back) |
| How two measures relate | `scatter` (`"size"` for bubbles; `"quadrants"` names four corners; `"cluster"` draws soft areas round each group) |
| Profiles across several attributes | `radar` (up to 3 profiles on one shared scale) |
| Flows between stages | `sankey` (branching), `funnel` (one path), `chord` (exchange within one set) |
| Survey answers | `likert` |
| Plans, stages and status | `timeline` (tasks and milestones, a today line), `lifecycle` (each item's stages from proposal to application on one date axis), `board` (one column per stage, each item a card) |
| Where things are | `choropleth` (regions shaded by a value, or colored by a category), `symbols` (circles sized by a value), `locator` (named places with their labels), on the built-in `europe` or `us-states` grids or your GeoJSON |
| Counted units and how binding they are | `strips` (one square per provision, colored by part, with the density per page) |
| What stepped out of line | `anomalies` (one lane per metric, its expected band behind it, the days outside it flagged) |
| Who is on track, red, amber or green | `ragboard` (a scorecard, worst first, with the move since last period), `ragtrend` (each status period by period, and why it changed) |
| One client, and where to sell next | `whitespace` (the cross-sell map: held, open by propensity, not eligible), `xray` (one client on one card, with a wallet audit and a copyable 30, 60 and 90-day account strategy), `history` (every touchpoint, newest first) |
| Records to read | `table` (sortable; search, pages, a pinned first column, and sparkline, status pill, in-cell bar, heat and RAG cells), `list` |

Option names are the same across views (`value` for the measure, `color` for color by category, `flag` for a yes/no field); older spellings still work and say once what they are now called.

## Datawrapper parity

Every chart type Datawrapper offers has a counterpart: grouped, stacked and split bars and the population pyramid; dot, range and arrow plots; pie, donut, multiple pies and donuts, and the election donut; the dual-axis chart as two panels, with text annotations, line symbols, peak labels, background comparison columns and a log scale; choropleth, symbol and locator maps; tables with search, pages, a pinned first column, and source and byline lines. Datawrapper's newer features are here too: colour by rules, highlight by number, rich tooltips, live data and Google Sheets, embeds that size themselves, and breakpoints (all in the table above).

## The editor

The Editor page (`editor.html`) is Datawrapper's flow on this library:
1. **Upload data.** Drop a CSV, TSV or JSON file, paste a table from a spreadsheet, type it, or give an address; the columns are told apart as numbers, text and dates.
2. **Check and describe.** Labels, formats, drag the columns into order, hide some.
3. **Visualize.** A grid of every chart, the ones that fit this data first and why; a Refine form generated from the chart's own options; an Annotate tab for title, notes, source, byline, headline, reference lines and text notes you can drag on the chart.
4. **Publish and embed.** The spec, the embed codes, a saved copy, and Add to dashboard.

The live chart stays beside you throughout, every change is undoable, and the chart's address can be shared. `createEditor(el, options)` puts the same four steps in any app; see [editor.md](editor.md).

## The composer

In the editor's Publish step, **Add to dashboard** saves the chart and puts it on a dashboard, then links to the Composer (`composer.html`). There, your saved charts and some examples sit in a tray: drag them onto the board or press Add; order the cards, set each one's width, add section headings; pick filters from the fields two or more cards share, each showing how many cards it reaches; name the board and give it an as-of line. The dashboard draws live as you go, Undo steps back, and the board's address carries it. Publish gives the dashboard JSON, an embed with no build step, and Open as page. Charts and boards live in the browser's localStorage by default; pass `store` (`charts`, `saveChart`, `removeChart`, `boards`, `saveBoard`) to `createEditor` and `createComposer` to keep them on a server.

## The visual system

Charts follow fixed rules: a validated, colorblind-checked 8-color palette with its own dark-mode set, bars at most 21px wide with rounded data ends, 2px lines, hairline gridlines, a legend only when there are two or more series, a tooltip on hover and keyboard focus, and a hidden data table for screen readers.

The spacing follows Fibonacci steps of 2, 3, 5, 8, 13, 21 and 34 px, type sits at 11, 13, 21 and 34 px, motion at 377, 610 and 987 ms, and proportions are golden (charts are φ times wider than tall, bar groups fill 0.618 of their slot). A one-word `style.preset` switches the whole look.

## Upgrading

Each option now has one name and each name one meaning. Older specs keep working: every older spelling still draws
the same chart, and `validateSpec` warns once per spelling, naming the new one. The editor, the chart guide and the MCP
tools read either spelling and write the new one.

| View | Older name | Now |
| --- | --- | --- |
| dot | `values` | `value` |
| strips | `parts` | `value` |
| likert | `responses` | `value` |
| scatter | `series` | `color` |
| locator | `kind` | `color` |
| matrix | `mark` | `flag` |
| dual | `marks` | `panels` |
| pie | `labels` | `labelPlace` |
| line | `labels: "peaks"` | `peaks: true` |
| choropleth | `labels` (`true`, `false`, `"codes"`, `"none"`) | `codes: true` or `false` |
| any spec | `footer` | `note` |

After the renames, `labels` means only names written beside scatter dots (true or false), and `mark` only how bars,
hbars and dumbbells draw each item. `target` keeps its two senses: a goal on a bullet, a destination on a sankey.

The package's front door, `martcharts`, now holds the names most pages need. The drawing kit moved to
`martcharts/kit`, colour science and palettes to `martcharts/color`, maps to `martcharts/geo`, and the Taller to
`martcharts/taller`; `martcharts/core` keeps the DOM-free engine. The drop-in bundles and `window.MartCharts` still
carry every name. The full list is under [Entry points](api.md#entry-points).

Over MCP, five chart tools became two: `fft_describe_chart` (was `fft_list_charts`, `fft_get_chart` and
`fft_chart_guide`) and `fft_suggest_charts` (was `fft_recommend_charts` and `fft_switch_chart`). The older names
still work for one release; see [mcp.md](mcp.md#older-tool-names).
