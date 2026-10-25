# The editor

A chart from a table in four steps, with no JSON to write. Open `editor.html` in the demo (`npm run dev`, then the Editor page), or put the same flow in your own app with `createEditor`.

The live chart stays in view through every step: on the right on a desk, above the controls on a phone. Every change redraws it at once and can be undone (the Undo button, or Cmd/Ctrl+Z outside a text field). The step and the chart live in the page address (`#step=3&spec=…`), so a chart in progress can be shared by link; a very long table goes to session storage instead and the address says `spec=session`.

## 1. Upload data

Drop a file on the zone (CSV, TSV or JSON), paste a table from Excel or Google Sheets (tab-separated text lands as columns), type it, choose a file, or give the address of a CSV or JSON file. Sample datasets sit under the zone as chips, and charts you saved before are listed to reopen.

The text is read as a table the way the `csv` source reads it: the separator is picked from the first line (comma, semicolon or tab), quoted cells may hold separators and line breaks, number-looking cells become numbers (grouped ones like `1,200` too), blanks become null. JSON is read as its first list of records, at the top or inside (`{ "data": { "items": [...] } }`).

Two switches rework the same text: **First row is the header** (off, the columns are named column1, column2…) and **Transpose rows and columns**. A preview table shows the first 50 rows, each column headed by its name and what it holds: **# Number**, **A Text** or **◷ Date**, said in words as well as color.

## 2. Check & describe

One card per column: an editable label (what readers see), the kind it holds, and a format: number (decimals, short figures), currency (code), percent, date (style), status pill, in-cell bar, heat shade, signed change, sparkline or plain text. Writes the spec's `fields`.

Drag a card to reorder the columns, or use the Move up and Move down buttons from the keyboard; the rows follow the new order (so tables read in it). **Hide** drops a column from the chart's data without losing it.

## 3. Visualize

Three tabs, like Datawrapper's.

**Chart type** is a grid of every registered view, drawn small from the catalog's example of each. The charts recommended for this data come first, each with one sentence on why (from `recommendCharts`); then every chart the data fits; then the charts that may not fit, greyed, with the reason (from `switchChart`). Picking one fills its options from the columns (`suggestView` or the recommendation's own view block).

**Refine** is a form generated from the chosen view's option schema, so a view registered later gets its controls for free: a field option is a select of the columns of the right kind, a list of fields is a row of checkbox chips, a boolean a switch, an enum a segmented control, a number an input, and anything else a small JSON field applied when it parses. Under it: **Highlight** (chips of the categories; clicking a mark on the chart toggles the same thing), **Small multiples by** (a panel per value of a category with twelve values or fewer), and the style: the look (default, glass, airy, paper), the theme, the colors (the palette picker, with its colorblind checks) and the height. Clicking a legend entry on the chart drops that series; add it back with its chip.

The form shows options by their canonical names: `value` on a dot plot rather than `values`, `color` on a scatter rather than `series`. A spec written either way opens with its fields filled, and an edit writes the canonical name.

Some options get their own controls:

- **Lists of fields** whose order matters (a lifecycle's stages, a hierarchy's levels, a scorecard's dimensions, series) list the picked fields in order. Drag one onto another to reorder them, or use the arrow buttons.
- **Map geometry** is a select of the built-in basemaps, or a GeoJSON address.
- **today** is a switch, with a date for a line somewhere else.
- **A choropleth's labels** are Codes or None.
- **Quadrants** take where the plot splits on x and on y, and a word for each corner.
- **RAG thresholds on a KPI** take on track from, at risk from, and which way is good.
- **A scorecard** has a select per dimension for its last-period column, and an overall column: the worst of the columns, none, or a stored roll-up.

**Statuses (red, amber, green)** adds rag transform rules. Each rule takes a measure, on track from, at risk from, and which way is good. A new rule starts from the data's thirds. With two or more rules, you can name an overall column. **Fixed colors** gives each category of the chart a color that holds on every chart naming it.

**Annotate** holds the words around the chart: title, description, notes, source name and address, byline, the headline number and what it compares with, reference lines (value and label) and, on views that take them, text annotations: each at a category, optionally at a height, with its text. Drag a note on the chart to move it (it snaps to the nearest category), or step it with the arrows. The **tooltip** is a template filled from the mark's row: type `{field}`, or click a field to insert it.

## 4. Publish & embed

The chart drawn big with its actions (download the data, the image, copy for a spreadsheet, how to read it); the spec as JSON to copy or download; and the embed code in three forms: one `<fft-widget>` tag with the spec inside, one tag pointing at a spec file, and the `createWidget` call. **Save to this gallery** keeps the chart: in the host's store when the page gives one, else in the browser, where it is offered again on the first step.

## In your own app

```ts
import { createEditor } from "martcharts";

const editor = createEditor(document.querySelector("#editor")!, {
  examples,                                   // one spec per view type, for the thumbnails (the catalog's JSON files)
  samples: [{ label: "Tickets", url: "/tickets.csv" }],
  onChange: (spec) => console.log(spec),      // after every change
  save: (spec) => api.saveWidget(spec),       // your store; without it, localStorage
  srcOf: (spec) => `/widgets/${spec.id}.json`, // the address in the src embed code
  strings: { proceed: "Weiter" },             // any of the editor's words, for another language
});

editor.setData("region,revenue\nNorth,1200"); // as a drop or a paste would
editor.spec;                                   // the chart as it stands, data inlined
editor.go(3);                                  // open a step
editor.undo();
editor.destroy();
```

The editor needs no framework and no dependency beyond the library itself. Its styles come with it (`ensureEditorStyles`), on the library's tokens, light and dark, and it works from 320px wide: the stepper collapses to "Step 2 of 4", the two columns stack. Every control is reachable from the keyboard, with visible focus; step changes and the row count are announced to screen readers.

Helpers exported alongside: `rowsFromTable(text, { header, transpose })`, `rowsFromJson(value)`, `gridOf(text)`, `columnKind(rows, field)`, `embedCodes(spec, src)`, `readHash(hash)` and `writeHash(step, spec)`.
