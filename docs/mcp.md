# MCP server

The MCP server lets an agent work with widgets: list them, read a spec, query the rows a widget draws, create widgets by forking, change them, and delete them. It speaks MCP over stdio and is built on the official TypeScript SDK (v2).

## How widgets are linked

Every widget in the store is linked to the server in two ways:

- **Tools** that take its id, such as `fft_get_widget_data { "id": "revenue-kpi" }`.
- **Its own resources**: `fft://widgets/<id>` (the spec) and `fft://widgets/<id>/data` (the rows).

You can also start a server **linked to one widget only** with `--widget <id>`. Its tools act on that widget and take no id, and it lists only that widget's resources. Use this to hand an agent one widget without exposing the rest.

The store is the `widgets/` folder: one `<id>.json` file per widget. The demo page reads the same folder, so a change made through MCP appears in an open demo page right away.

## Running it

```bash
npm run mcp                                   # every widget in ./widgets
node src/mcp/main.ts --widget revenue-kpi     # linked to one widget
node src/mcp/main.ts --dir ./other/widgets --public ./other/public
npm run mcp:config                            # print an .mcp.json: one server for all, one per widget
npm run mcp:inspect                           # explore it in the MCP Inspector
npm run smoke                                 # self-check against the real process
```

| Option | Default | What it does |
| --- | --- | --- |
| `--dir` | `<project>/widgets` | Widget folder. Also `FFT_WIDGETS_DIR`. |
| `--public` | `<project>/public` | Folder that relative data URLs (`/data/sales.json`) are read from, as the dev server does in the browser. Also `FFT_PUBLIC_DIR`. |
| `--dashboards` | `<project>/dashboards` | Dashboard folder. Also `FFT_DASHBOARDS_DIR`. |
| `--catalog` | `<project>/catalog` | Chart catalog folder: one starter spec per view, named by view type. Also `FFT_CATALOG_DIR`. |
| `--widget` | none | Link the server to one widget. |
| `--print-config` | off | Print an `.mcp.json` block and exit. |

### Connecting from Claude Code

This folder's `.mcp.json` registers the all-widgets server as `fft-widgets`; Claude Code offers it when you open the folder. To add one server per widget, run `npm run mcp:config` and merge the output into `.mcp.json`, or add a single one:

```bash
claude mcp add fft-revenue-kpi -- node /absolute/path/to/FFT/src/mcp/main.ts --widget revenue-kpi
```

### Connecting from other clients

Any MCP client that launches stdio servers can run `node <path>/src/mcp/main.ts`. Node 23.6 or later is required.

### Embedding

```ts
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createFftServer } from "fft-widgets/mcp";
import { createFileStore, createLocalFetch } from "./src/mcp/store.ts";

const store = createFileStore("./widgets");
serveStdio(() => createFftServer({ store, fetch: createLocalFetch("./public") }));
```

`WidgetStore` is an interface (`list`, `get`, `has`, `save`, `delete`), so a database-backed store drops in the same way.

## Tools

All tools validate input; bad input comes back as a tool error that says how to fix it. Read tools take `response_format`: `markdown` (default, readable) or `json` (structured, also returned as `structuredContent`).

| Tool | Read only | What it does |
| --- | --- | --- |
| `fft_list_widgets` | yes | Every widget: id, title, view type, source type, description. Paged with `limit` (default 50) and `offset`. |
| `fft_get_widget` | yes | One widget's full spec, plus static validation issues. |
| `fft_get_widget_data` | yes | Runs the widget's pipeline and returns the rows it draws, led by `question` (the sales question the chart answers, such as "Which region has the most revenue?") and `howToRead`: how to read the chart in plain words, ending with one example from those rows. Markdown is a table with labels and formatted values. Paged with `limit` (default 50, max 500) and `offset`; also includes data warnings. |
| `fft_create_widget` | no | Creates `id`. With `from`, forks that widget and `spec` holds only the changes; without it, forks the vanilla block. Refuses existing ids and invalid specs. |
| `fft_update_widget` | no (overwrites) | Pass `changes` (a merge patch) or `replace` (a whole spec). Refuses changes that would make the spec invalid. |
| `fft_delete_widget` | no (destructive) | Removes the widget's file. |
| `fft_list_dashboards` | yes | Every dashboard: id, title, number of cells, filter fields. |
| `fft_get_dashboard` | yes | One dashboard's spec, its validation issues, and any widget ids it names that do not exist. |
| `fft_create_dashboard` | no | Creates a dashboard (grid of widget cells, spans, filter row). Refuses invalid specs and unknown widget ids. |
| `fft_update_dashboard` | no (overwrites) | `changes` (merge patch) or `replace`. Same checks as create. |
| `fft_delete_dashboard` | no (destructive) | Removes the dashboard; its widgets stay. |
| `fft_list_charts` | yes | The chart catalog: every view with what it is, the question its example answers, the row fields it needs (and what each holds), and whether a starter spec exists. Start here to pick a chart. |
| `fft_get_chart` | yes | One view in full: every row field, its settings, how to read it, and a self-contained starter spec (inline rows, trimmed to fit) to adapt and save with `fft_create_widget`. Starters come from `catalog/` (`npm run catalog`). |
| `fft_recommend_charts` | yes | Ranks the chart types that suit some data, best first: pass a source block (`inline` rows, `csv` text or file, `url`) and optional `transform` steps. Each pick has a score, why it fits, and a complete spec ready for `fft_create_widget`. |
| `fft_list_blocks` | yes | Every data source, transform, format and view with its options. Filter with `kind`. |
| `fft_check_palette` | yes | Checks a palette (a library name or hex colors) for colorblind separation, neighbour separation, lightness, colorfulness and contrast, on a light or dark background. |
| `fft_validate_spec` | yes | Checks a draft spec without saving. With `check_data` (default true) also loads the data and warns about missing fields. |
| `fft_create_variants` | yes | The Taller: seeded new versions of a widget, each made by a sales move (`moves`: decompose, reframe, distill, contrast, reveal, combine, reform), optionally for an `audience` (rep, manager, leadership), with the sales question it answers, a plain title, how to read it, five quality scores and its novelty and meaning. Also returns the original's question. Nothing is saved; keep one with `fft_create_widget`. See [taller.md](taller.md). |

A server linked to one widget offers `fft_get_widget`, `fft_get_widget_data`, `fft_update_widget`, `fft_create_variants`, `fft_list_charts`, `fft_get_chart`, `fft_recommend_charts`, `fft_list_blocks`, `fft_check_palette` and `fft_validate_spec`, without `id` arguments. `fft_list_blocks` and `fft://blocks` also list the style presets and the palette library.

Merge patch rules for `changes` and forks: objects merge key by key, lists replace, `null` removes a key.

Create and update return `{ created | updated, spec, warnings }`. Warnings come from loading the data, for example a view field the rows do not have, or the data failing to load.

Responses stay under 25,000 characters by returning fewer rows; `next_offset` then points at the first row left out.

### Examples

```jsonc
// Same data, drawn as a table
{ "name": "fft_create_widget", "arguments": { "id": "regions-table", "from": "revenue-by-region",
  "spec": { "title": "Regions as a table", "view": { "type": "table", "x": null, "y": null } } } }

// Only the top 3 regions
{ "name": "fft_update_widget", "arguments": { "id": "revenue-by-region",
  "changes": { "transform": [
    { "type": "aggregate", "groupBy": "region", "measures": [{ "op": "sum", "field": "revenue" }, { "op": "sum", "field": "cost" }] },
    { "type": "sort", "field": "revenue", "order": "desc" },
    { "type": "limit", "count": 3 } ] } } }

// Dark theme, compact
{ "name": "fft_update_widget", "arguments": { "id": "top-customers", "changes": { "style": { "theme": "dark", "density": "compact" } } } }
```

## Resources

| URI | Contents |
| --- | --- |
| `fft://widgets/<id>` | The widget's spec as JSON. Every widget is listed. |
| `fft://widgets/<id>/data` | The widget's rows after transforms, as JSON. Readable, not listed. |
| `fft://dashboards/<id>` | A dashboard's spec as JSON. Every dashboard is listed. |
| `fft://blocks` | The block catalog as JSON. |
| `fft://charts/<type>` | One chart type's self-contained starter spec (inline rows) from the catalog folder. Every chart with a starter is listed, titled with what it is. |

The server sends `resources/list_changed` after creating or deleting a widget.

## Security notes

- Widget ids are limited to lowercase letters, digits and dashes, so they cannot name files outside the store.
- Relative data URLs are served only from inside `--public`; paths that resolve outside it, including through symlinks or encoded `..%2f` segments, get a 404.
- Absolute `http(s)` data URLs are fetched from the network, as they would be in a browser. Only point the server at widget folders you trust.

## Widget refs

Every widget card shows a faint ref such as `W-7Q2K`, hashed from its id, in its bottom right corner. `fft_get_widget`, `fft_get_widget_data`, `fft_update_widget` and the `from` of `fft_create_widget` accept the ref in place of the id, in any case. `fft_list_widgets` lists both. Delete and create take ids only, so a destructive call always names the exact file.
