/**
 * The FFT MCP server: lets an agent list, read, query, create, fork, update
 * and delete widgets in a widget store.
 *
 * Every widget is linked to the server twice: as tools that take its id, and
 * as its own resources (`fft://widgets/<id>` for the spec, `.../data` for the
 * rows). Pass `widgetId` to make a server linked to one widget only: its tools
 * then act on that widget and take no id.
 *
 * @module
 */
import { McpServer, ResourceNotFoundError, ResourceTemplate } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { baseWidget } from "../core/base.ts";
import { fieldLabel, formatValue } from "../core/display.ts";
import { fork } from "../core/fork.ts";
import { runPipeline } from "../core/pipeline.ts";
import { checkPalette } from "../core/color.ts";
import { validateDashboard } from "../core/dashboard.ts";
import type { DashboardSpec } from "../core/dashboard.ts";
import { describePalettes, getPalette, paletteNames } from "../core/palettes.ts";
import { describePresets } from "../core/presets.ts";
import { HEADLINE_OPTIONS } from "../core/headline.ts";
import { FACET_OPTIONS } from "../core/validate.ts";
import { WIDGET_REF, widgetRef } from "../core/ref.ts";
import { explainChart } from "../core/explain.ts";
import { describeChart, describeCharts, needsText } from "../core/catalog.ts";
import { chartGuide, dataContract, guideMarkdown, switchChart, switchOptions } from "../core/guide.ts";
import type { ChartEntry } from "../core/catalog.ts";
import { recommendCharts } from "../core/recommend.ts";
import { blockTypes, describeBlocks } from "../core/registry.ts";
import { questionOf } from "../core/question.ts";
import { AUDIENCES, createVariants, MOVES } from "../core/taller.ts";
import type { Audience, Move } from "../core/taller.ts";
import type { BlockKind } from "../core/registry.ts";
import type { Issue, Row, WidgetSpec } from "../core/types.ts";
import { hasErrors, validateSpec } from "../core/validate.ts";
import { WIDGET_ID, WidgetNotFoundError } from "./store.ts";
import type { StoredWidget, WidgetStore } from "./store.ts";

/** Options for `createFftServer`. */
export interface FftServerOptions {
  /** Where widgets are read and saved. */
  store: WidgetStore;
  /** `fetch` for `url` data sources. Use `createLocalFetch(publicDir)` so relative URLs work as in the browser. */
  fetch?: typeof fetch;
  /** Link the server to this one widget only. */
  widgetId?: string;
  /** Where dashboards are read and saved. Without it, the dashboard tools are not offered. */
  dashboards?: WidgetStore;
  /** The chart catalog: one self-contained starter spec per view, stored by view type (`catalog/` from `npm run catalog`). Without it, the chart tools describe views but hand out no starter spec. */
  catalog?: WidgetStore;
}

/** Tool responses stay under this many characters by returning fewer rows. */
export const CHARACTER_LIMIT = 25_000;
const VERSION = "0.1.0";
const KINDS: BlockKind[] = ["source", "transform", "format", "view"];
const KIND_TITLES: Record<BlockKind, string> = { source: "Data sources", transform: "Transforms", format: "Formats", view: "Views" };

const IdSchema = z.string().regex(WIDGET_ID).describe('Widget id: lowercase letters, digits and dashes, for example "revenue-by-region". fft_list_widgets lists them.');
const IdOrRefSchema = z
  .string()
  .regex(new RegExp(`${WIDGET_ID.source}|${WIDGET_REF.source}`))
  .describe('Widget id, for example "revenue-by-region", or its ref as shown faintly on the card, for example "W-7Q2K". fft_list_widgets lists both.');
const ResponseFormat = z.enum(["markdown", "json"]).default("markdown").describe("'markdown' for readable text, 'json' for structured data.");
const JsonObject = z.record(z.string(), z.unknown());

type Text = { type: "text"; text: string };

function asJson(data: Record<string, unknown>) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) } as Text], structuredContent: data };
}

function asMarkdown(text: string) {
  return { content: [{ type: "text", text } as Text] };
}

function problems(heading: string, issues: Issue[]): string {
  const errors = issues.filter((issue) => issue.level === "error");
  return [heading, ...errors.map((issue) => `- ${issue.path}: ${issue.message}`), "", "Call fft_list_blocks to see every option each block takes."].join("\n");
}

/** Slices `items` and reports where the next page starts. */
function paginate<T>(items: T[], offset: number, limit: number) {
  const slice = items.slice(offset, offset + limit);
  const next = offset + slice.length;
  const hasMore = items.length > next;
  return { slice, info: { total: items.length, count: slice.length, offset, has_more: hasMore, ...(hasMore ? { next_offset: next } : {}) } };
}

/** Shrinks a page until its rendered text fits under CHARACTER_LIMIT. */
function fit<T>(items: T[], render: (items: T[]) => { text: string }): T[] {
  let current = items;
  while (current.length > 1 && render(current).text.length > CHARACTER_LIMIT) current = current.slice(0, Math.ceil(current.length / 2));
  return current;
}

function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
}

function markdownTable(spec: WidgetSpec, rows: Row[], fields: string[]): string {
  const header = `| ${fields.map((f) => cell(fieldLabel(f, spec.fields))).join(" | ")} |`;
  const rule = `| ${fields.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${fields.map((f) => cell(formatValue(row[f], spec.fields?.[f]?.format, spec.locale))).join(" | ")} |`);
  return [header, rule, ...body].join("\n");
}

function fieldsOf(rows: Row[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) for (const key of Object.keys(row)) seen.add(key);
  return [...seen];
}

function summary(entry: StoredWidget) {
  if (!entry.spec) return { id: entry.id, error: entry.error ?? "Unreadable." };
  const { spec } = entry;
  return {
    id: entry.id,
    ref: widgetRef(entry.id),
    ...(spec.title ? { title: spec.title } : {}),
    view: spec.view?.type,
    source: spec.data?.type,
    ...(spec.description ? { description: spec.description } : {}),
  };
}

/** From what the reader should see to the views that show it: the same guide as the README's "Which view?". */
const VIEW_GUIDE = [
  "One number and how it moved: kpi, kpis (a row of them), gauge (on a known scale), or a headline above any view.",
  "Progress to a goal: meter, bullet (with poor, fair and good bands), rings (a few goals at once), gauge.",
  "A ranking or a comparison across categories: hbar, bar, dumbbell (before and after, or arrows with mark arrow), slope (who moved between two periods), dot (several measures per item as dots on one axis).",
  'Several measures per row: hbar with a list of values (grouped bars), stacked true or "percent", or split true (one column per measure, each on its own scale, for different units).',
  "Two groups across ordered bands (women and men by age group): pyramid, two counts back to back on one axis.",
  "Change over time: line, area, bar, calendar (day by day), heatmap (two time scales, such as weekday by hour), candlestick (prices: open, high, low, close).",
  "Two measures in different units over the same periods: dual (revenue and churn, one panel each sharing the time axis, each on its own scale; never a second axis).",
  "Many time series at once: horizon (one thin row each, values folded into bands of deepening color, blue above the baseline and red below).",
  "Rank over time: bump.",
  'Parts of a whole: donut (up to 6 parts, the total in the middle; arc "half" with majority is an election donut), pie (the shares written on the slices), waffle (100 countable squares), treemap (many parts), sunburst (two or three levels), icicle (a hierarchy laid flat, up to four levels, easier to label), bar or area with stacked "percent".',
  'How a mix flows over time: area with stacked "stream" (a streamgraph; best with many periods and 3 to 8 layers).',
  "A cycle that wraps round (hours of the day, months of the year): rose (a polar area chart, wedges true by area, series stacked outward).",
  'What comes next: line, or an unstacked area, with forecast (a true/false field) and band ({ low, high, label }): a forecast fan.',
  "Size and mix at once: marimekko.",
  "What makes up a change: waterfall (a bridge between totals), variance (actual against plan, good or bad).",
  "Where the bulk is: pareto (the vital few behind 80%).",
  "How values spread: histogram, boxplot (quartiles and outliers), beeswarm (every point), ridgeline (shapes side by side); or the bin transform into a table or bar.",
  "How two measures relate: scatter (add size for a bubble chart, a third measure as area).",
  "Profiles across several attributes: radar (up to 3 profiles on one shared scale).",
  "Flows between stages: sankey (branching), funnel (one path), chord (exchange within one set, such as moves between plans).",
  "Survey answers: likert.",
  "Plans and dates: timeline (milestones, progress, a today line).",
  "Where things are: choropleth (regions shaded by a value), symbols (circles sized by a value on their regions or at coordinates), locator (named markers); geo takes a built-in tile grid (europe, us-states) or your own GeoJSON.",
  "Records to read: table (with spark and badge cells), list.",
  "Regulation and compliance: matrix (one mark per x and y pair, sized, shaded or a square per yes: pressure per topic per quarter, who must comply), strips (one square per provision, colored mandatory to optional, with a density per page), lifecycle (each rule's stages from proposal to application on one date axis, a today line and a status pill).",
];

function blocksMarkdown(kinds: BlockKind[]): string {
  const lines = ["# Widget blocks", "", "A spec plugs one block into each slot: data (a source), transform (a list of steps), fields.*.format (a format), view."];
  if (kinds.includes("view")) lines.push("", "## Choosing a view", "", "Start from what the reader should see:", "", ...VIEW_GUIDE.map((line) => `- ${line}`));
  for (const kind of kinds) {
    lines.push("", `## ${KIND_TITLES[kind]}`);
    for (const block of describeBlocks(kind)) {
      lines.push("", `- **${block.type}**: ${block.description}`);
      for (const [name, option] of Object.entries(block.options)) {
        const kindText = option.type === "enum" ? `one of ${option.values?.join(", ")}` : option.kind ? `${option.kind} ${option.type}` : option.type;
        lines.push(`  - \`${name}\` (${kindText}${option.required ? ", required" : ""}): ${option.description}`);
      }
    }
  }
  if (kinds.length === KINDS.length) {
    lines.push("", "## Headline", "", 'Optional big number above any view: { "headline": { "value": "revenue", "compare": "previous", "caption": "this month" } }.');
    for (const [name, option] of Object.entries(HEADLINE_OPTIONS)) {
      const kindText = option.type === "enum" ? `one of ${option.values?.join(", ")}` : option.type;
      lines.push(`- \`${name}\` (${kindText}${option.required ? ", required" : ""}): ${option.description}`);
    }
    lines.push("", "## Facet (small multiples)", "", 'Optional, splits any view into one panel per value on a shared scale: { "facet": { "field": "region" } }.');
    for (const [name, option] of Object.entries(FACET_OPTIONS)) lines.push(`- \`${name}\` (${option.type}${option.required ? ", required" : ""}): ${option.description}`);
    lines.push("", "## Style presets", "", 'Set with style.preset, for example { "style": { "preset": "glass" } }.');
    for (const preset of describePresets()) lines.push("", `- **${preset.name}**: ${preset.description}`);
    lines.push("", "## Palettes", "", 'Set with style.palette, as a name ({ "style": { "palette": "apple" } }) or a list of colors. Check any palette with fft_check_palette.');
    for (const palette of describePalettes()) lines.push("", `- **${palette.name}** (${palette.label}): ${palette.description} Colors: ${palette.colors.join(", ")}.`);
  }
  return lines.join("\n");
}

/**
 * Builds an MCP server over a widget store. Call once per connection.
 *
 * @example
 * import { serveStdio } from "@modelcontextprotocol/server/stdio";
 * const store = createFileStore("./widgets");
 * serveStdio(() => createFftServer({ store, fetch: createLocalFetch("./public") }));
 */
export function createFftServer(options: FftServerOptions): McpServer {
  const { store, widgetId: linked } = options;
  const loadContext = (signal?: AbortSignal) => ({ fetch: options.fetch, signal });
  const server = new McpServer(
    { name: linked ? `fft-widget-${linked}` : "martcharts", version: VERSION },
    {
      instructions: linked
        ? `This server is linked to the widget "${linked}". Read it with fft_get_widget, query its rows with fft_get_widget_data, and change it with fft_update_widget.`
        : "Widgets are JSON specs: data -> transform -> view, plus fields (labels, formats) and style. Start with fft_list_widgets, read one with fft_get_widget, query its rows with fft_get_widget_data. Create by forking with fft_create_widget. Call fft_list_blocks to learn every option.",
    },
  );

  /** The input schema with an `id` argument, or without one when the server is linked to a widget. */
  function withId<S extends z.ZodRawShape>(shape: S) {
    const typed = z.strictObject({ id: IdOrRefSchema.optional(), ...shape });
    return (linked ? z.strictObject(shape) : z.strictObject({ id: IdOrRefSchema, ...shape })) as unknown as typeof typed;
  }
  /** An id as given, or a ref (W-7Q2K, in any case) turned into the id of the widget that wears it. */
  async function resolveId(id: string): Promise<string> {
    if (!WIDGET_REF.test(id) || (WIDGET_ID.test(id) && (await store.has(id)))) return id;
    const found = (await store.list()).find((entry) => widgetRef(entry.id) === id.toUpperCase());
    if (!found) throw new WidgetNotFoundError(id);
    return found.id;
  }
  const idOf = async (args: { id?: string }) => linked ?? (await resolveId(args.id as string));
  const which = linked ? `the linked widget ("${linked}")` : "a widget";

  async function dataWarnings(spec: WidgetSpec, signal?: AbortSignal): Promise<Issue[]> {
    try {
      const rows = await runPipeline(spec, loadContext(signal));
      return validateSpec(spec, rows).filter((issue) => issue.level === "warning");
    } catch (caught) {
      return [{ level: "warning", path: "data", message: `Could not load the data to check field names: ${(caught as Error).message}` }];
    }
  }

  async function saveChecked(id: string, spec: WidgetSpec, heading: string, signal?: AbortSignal) {
    const issues = validateSpec(spec);
    if (hasErrors(issues)) throw new Error(problems(heading, issues));
    await store.save(id, spec);
    return { spec: await store.get(id), warnings: await dataWarnings(spec, signal) };
  }

  // ---- Read tools ----

  if (!linked) {
    server.registerTool(
      "fft_list_widgets",
      {
        title: "List widgets",
        description: `List every widget in the store: id, title, view type, data source type and description.

Use it first to find ids. Then read a spec with fft_get_widget or its rows with fft_get_widget_data.`,
        inputSchema: z.strictObject({
          limit: z.number().int().min(1).max(100).default(50).describe("Maximum number of widgets to return."),
          offset: z.number().int().min(0).default(0).describe("Number of widgets to skip, for paging."),
          response_format: ResponseFormat,
        }),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      },
      async ({ limit, offset, response_format }) => {
        const all = (await store.list()).map(summary);
        const { slice, info } = paginate(all, offset, limit);
        if (response_format === "json") return asJson({ ...info, widgets: slice });
        if (all.length === 0) return asMarkdown("The store has no widgets yet. Create one with fft_create_widget.");
        const lines = [`# Widgets (${all.length})`, ""];
        for (const w of slice) {
          if ("error" in w) lines.push(`- \`${w.id}\`: could not be read: ${w.error}`);
          else lines.push(`- ${w.title ? `**${w.title}** (\`${w.id}\`, ${w.ref})` : `\`${w.id}\` (${w.ref})`}: ${w.view} view, ${w.source} data.${w.description ? ` ${w.description}` : ""}`);
        }
        if (info.has_more) lines.push("", `More widgets: call again with offset=${info.next_offset}.`);
        return asMarkdown(lines.join("\n"));
      },
    );
  }

  server.registerTool(
    "fft_get_widget",
    {
      title: "Get widget spec",
      description: `Get the full JSON spec of ${which}, with any validation issues.

The spec has data (where rows come from), transform (reshaping steps), fields (labels and formats), view (table, list, kpi, bar, line...) and style. Use fft_get_widget_data to see the rows it produces.`,
      inputSchema: withId({}),
      outputSchema: z.object({ spec: JsonObject, issues: z.array(z.object({ level: z.enum(["error", "warning"]), path: z.string(), message: z.string() })) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      const spec = await store.get(await idOf(args));
      return asJson({ spec, issues: validateSpec(spec) });
    },
  );

  server.registerTool(
    "fft_get_widget_data",
    {
      title: "Get widget data",
      description: `Run ${which}'s data pipeline (load, then every transform) and return the rows the view draws.

Use it to answer questions about the numbers a widget shows. Both formats start with question, the sales question the chart answers ("Which region has the most revenue?"), and howToRead: how to read the chart in plain words a ten-year-old can follow, ending with one example from these rows; quote them when someone asks what a chart means. Markdown gives a table with labels and formatted values; json gives raw values. Large results are paged: pass next_offset as offset for more.`,
      inputSchema: withId({
        limit: z.number().int().min(1).max(500).default(50).describe("Maximum number of rows to return."),
        offset: z.number().int().min(0).default(0).describe("Number of rows to skip, for paging."),
        response_format: ResponseFormat,
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args, ctx) => {
      const id = await idOf(args);
      const spec = await store.get(id);
      const rows = await runPipeline(spec, loadContext(ctx.mcpReq.signal));
      const fields = fieldsOf(rows);
      const warnings = validateSpec(spec, rows).filter((issue) => issue.level === "warning");
      // How to read the chart, in plain words a ten-year-old can follow, with one example from these rows.
      const question = questionOf(spec, rows).text;
      const howToRead = explainChart(spec, rows);
      const render = (page: Row[]) => {
        const { info } = paginate(rows, args.offset, page.length);
        const fullInfo = { ...info, has_more: rows.length > args.offset + page.length, ...(rows.length > args.offset + page.length ? { next_offset: args.offset + page.length } : {}) };
        if (args.response_format === "json") {
          const data = { id, ...fullInfo, question, howToRead, fields, rows: page, warnings };
          return { data, text: JSON.stringify(data, null, 2) };
        }
        const lines = [`# ${spec.title ?? id}: data`, "", `Answers: ${question}`, "", `How to read it: ${howToRead}`, "", `${rows.length} rows after transforms. Showing ${page.length ? `${args.offset + 1} to ${args.offset + page.length}` : "none"}.`, ""];
        if (page.length) lines.push(markdownTable(spec, page, fields));
        if (fullInfo.has_more) lines.push("", `More rows: call again with offset=${fullInfo.next_offset}.`);
        for (const warning of warnings) lines.push("", `Warning at ${warning.path}: ${warning.message}`);
        return { data: undefined, text: lines.join("\n") };
      };
      const page = fit(rows.slice(args.offset, args.offset + args.limit), render);
      const result = render(page);
      return result.data ? asJson(result.data) : asMarkdown(result.text);
    },
  );

  // ---- Write tools ----

  if (!linked) {
    server.registerTool(
      "fft_create_widget",
      {
        title: "Create widget",
        description: `Create a new widget and save it to the store.

With from: forks that widget, and spec holds only what changes (merge patch: objects merge, lists replace, null removes a key).
Without from: starts from the vanilla block (an empty table) and applies spec.
The spec is validated first; nothing is saved if it has errors. Warnings (for example a view field missing from the data) are returned.
Title, subtitle, footer and headline.caption accept templates filled from the drawn rows: {first:field}, {last:field}, {sum:field}, {avg:field}, {min:field}, {max:field}, {count}. Example subtitle: "{first:month} to {last:month}".

Examples:
  - Same data as a table: {"id": "sales-table", "from": "revenue-by-region", "spec": {"view": {"type": "table", "x": null, "y": null}}}
  - New KPI: {"id": "orders-kpi", "spec": {"title": "Orders", "data": {"type": "inline", "rows": [{"orders": 120, "previous": 100}]}, "view": {"type": "kpi", "value": "orders", "compare": "previous"}}}`,
        inputSchema: z.strictObject({
          id: IdSchema.describe('Id for the new widget, for example "orders-kpi". Becomes widgets/<id>.json.'),
          from: IdOrRefSchema.optional().describe("Id or ref of an existing widget to fork."),
          spec: JsonObject.optional().describe("Spec fields to set. With from, only the changes."),
        }),
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      },
      async ({ id, from, spec }, ctx) => {
        if (await store.has(id)) throw new Error(`Widget "${id}" already exists. Use fft_update_widget to change it.`);
        const { id: _sourceId, ...source } = from ? await store.get(await resolveId(from)) : baseWidget;
        const next = fork(source as WidgetSpec, spec ?? {});
        const saved = await saveChecked(id, next, "The spec has problems, so nothing was saved:", ctx.mcpReq.signal);
        await server.sendResourceListChanged();
        return asJson({ created: id, ...saved });
      },
    );
  }

  server.registerTool(
    "fft_update_widget",
    {
      title: "Update widget",
      description: `Change ${which} and save it.

Pass changes to edit some fields (merge patch: objects merge, lists replace, null removes a key), or replace to swap the whole spec. The result is validated first; nothing is saved if it has errors.

Examples:
  - Retitle: {"changes": {"title": "Revenue by region, Q3"}}
  - Switch to bars: {"changes": {"view": {"type": "bar", "x": "region", "y": "revenue"}}}
  - Drop the subtitle: {"changes": {"subtitle": null}}`,
      inputSchema: withId({
        changes: JsonObject.optional().describe("Fields to change, as a merge patch."),
        replace: JsonObject.optional().describe("A complete new spec."),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (args, ctx) => {
      if ((args.changes === undefined) === (args.replace === undefined)) {
        throw new Error("Pass either changes (to edit some fields) or replace (to swap the whole spec).");
      }
      const id = await idOf(args);
      const current = await store.get(id);
      const next = args.replace ? (args.replace as unknown as WidgetSpec) : fork(current, args.changes ?? {});
      const saved = await saveChecked(id, next, "The change would break the widget, so nothing was saved:", ctx.mcpReq.signal);
      return asJson({ updated: id, ...saved });
    },
  );

  if (!linked) {
    server.registerTool(
      "fft_delete_widget",
      {
        title: "Delete widget",
        description: "Delete a widget from the store for good. Its JSON file is removed.",
        inputSchema: z.strictObject({ id: IdSchema }),
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
      },
      async ({ id }) => {
        await store.delete(id);
        await server.sendResourceListChanged();
        return asJson({ deleted: id });
      },
    );
  }

  // ---- Dashboard tools ----

  const boards = linked ? undefined : options.dashboards;
  if (boards) {
    const missingWidgets = async (spec: DashboardSpec) => {
      const ids = (spec.widgets ?? []).flatMap((cell) => (typeof cell?.widget === "string" ? [cell.widget] : []));
      const known = await Promise.all(ids.map((id) => store.has(id).catch(() => false)));
      return ids.filter((_, i) => !known[i]);
    };
    const saveBoard = async (id: string, spec: DashboardSpec, heading: string) => {
      const issues = validateDashboard(spec);
      if (hasErrors(issues)) throw new Error(problems(heading, issues));
      const missing = await missingWidgets(spec);
      if (missing.length) throw new Error(missing.map((m) => `Unknown widget "${m}". Call fft_list_widgets to see the ids.`).join("\n"));
      await boards.save(id, spec as unknown as WidgetSpec);
      return (await boards.get(id)) as unknown as DashboardSpec;
    };

    server.registerTool(
      "fft_list_dashboards",
      {
        title: "List dashboards",
        description: "List every dashboard: id, title, number of widget cells and filter fields. Read one with fft_get_dashboard.",
        inputSchema: z.strictObject({ response_format: ResponseFormat }),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      },
      async ({ response_format }) => {
        const entries = (await boards.list()).map((entry) => {
          if (!entry.spec) return { id: entry.id, error: entry.error ?? "Unreadable." };
          const spec = entry.spec as unknown as DashboardSpec;
          return {
            id: entry.id,
            ...(spec.title ? { title: spec.title } : {}),
            widgets: Array.isArray(spec.widgets) ? spec.widgets.filter((cell) => !cell?.section).length : 0,
            filters: (spec.filters ?? []).map((f) => f.field),
          };
        });
        if (response_format === "json") return asJson({ total: entries.length, dashboards: entries });
        if (!entries.length) return asMarkdown("No dashboards yet. Create one with fft_create_dashboard.");
        return asMarkdown(
          [`# Dashboards (${entries.length})`, "", ...entries.map((e) => ("error" in e ? `- \`${e.id}\`: could not be read: ${e.error}` : `- ${e.title ? `**${e.title}** (\`${e.id}\`)` : `\`${e.id}\``}: ${e.widgets} widgets${e.filters.length ? `, filtered by ${e.filters.join(", ")}` : ""}.`))].join("\n"),
        );
      },
    );

    server.registerTool(
      "fft_get_dashboard",
      {
        title: "Get dashboard",
        description: "Get a dashboard's JSON spec (title, columns, filters, widget cells with spans), its validation issues, and any widget ids it names that do not exist.",
        inputSchema: z.strictObject({ id: IdSchema.describe('Dashboard id, for example "gallery". fft_list_dashboards lists them.') }),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      },
      async ({ id }) => {
        const spec = (await boards.get(id)) as unknown as DashboardSpec;
        return asJson({ spec, issues: validateDashboard(spec), missing: await missingWidgets(spec) });
      },
    );

    server.registerTool(
      "fft_create_dashboard",
      {
        title: "Create dashboard",
        description: `Create a dashboard: a grid of existing widgets with one filter row that scopes every widget whose data has the field.

Example: {"id": "sales", "spec": {"title": "Sales", "columns": 3, "range": {"field": "month"}, "filters": [{"field": "region", "label": "Region"}], "widgets": [{"widget": "revenue-kpi"}, {"widget": "monthly-revenue", "span": 2}]}}
Cells name stored widgets (see fft_list_widgets), carry an inline "spec", or are section headings ({"section": "Revenue", "description": "..."}) that group the cells after them in a full-width row. Spans run from 1 to columns (default 3). The optional "range" adds a period control (default 3M, 6M, 12M, All; also "YTD" or counts like "2Y") that cuts every widget whose data has that date field to the latest months. Nothing is saved if the spec has errors or names widgets that do not exist.`,
        inputSchema: z.strictObject({
          id: IdSchema.describe('Id for the new dashboard, for example "sales". Becomes dashboards/<id>.json.'),
          spec: JsonObject.describe("The dashboard spec."),
        }),
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      },
      async ({ id, spec }) => {
        if (await boards.has(id)) throw new Error(`Dashboard "${id}" already exists. Use fft_update_dashboard to change it.`);
        const saved = await saveBoard(id, spec as unknown as DashboardSpec, "The dashboard has problems, so nothing was saved:");
        await server.sendResourceListChanged();
        return asJson({ created: id, spec: saved });
      },
    );

    server.registerTool(
      "fft_update_dashboard",
      {
        title: "Update dashboard",
        description: "Change a dashboard: pass changes (merge patch: objects merge, lists replace, null removes) or replace (a whole spec). Validated first; nothing is saved on errors or unknown widgets.",
        inputSchema: z.strictObject({
          id: IdSchema.describe("Dashboard id."),
          changes: JsonObject.optional().describe("Fields to change, as a merge patch."),
          replace: JsonObject.optional().describe("A complete new dashboard spec."),
        }),
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
      },
      async ({ id, changes, replace }) => {
        if ((changes === undefined) === (replace === undefined)) throw new Error("Pass either changes (to edit some fields) or replace (to swap the whole spec).");
        const current = (await boards.get(id)) as unknown as DashboardSpec;
        const next = replace ? (replace as unknown as DashboardSpec) : fork(current, (changes ?? {}) as never);
        const saved = await saveBoard(id, next, "The change would break the dashboard, so nothing was saved:");
        return asJson({ updated: id, spec: saved });
      },
    );

    server.registerTool(
      "fft_delete_dashboard",
      {
        title: "Delete dashboard",
        description: "Delete a dashboard for good. Its widgets are not touched.",
        inputSchema: z.strictObject({ id: IdSchema.describe("Dashboard id.") }),
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
      },
      async ({ id }) => {
        await boards.delete(id);
        await server.sendResourceListChanged();
        return asJson({ deleted: id });
      },
    );
  }

  // ---- Reference tools ----

  server.registerTool(
    "fft_list_blocks",
    {
      title: "List widget blocks",
      description: `List the building blocks a spec can use, with every option: data sources, transforms, formats and views, plus the style presets.

Use it before writing or changing a spec, to pick block types and their option names.`,
      inputSchema: z.strictObject({
        kind: z.enum(["source", "transform", "format", "view"]).optional().describe("Only this kind of block. Leave out for all four."),
        response_format: ResponseFormat,
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ kind, response_format }) => {
      const kinds = kind ? [kind] : KINDS;
      if (response_format === "json") {
        const data: Record<string, unknown> = {};
        for (const k of kinds) data[k] = describeBlocks(k);
        if (!kind) {
          data.presets = describePresets();
          data.palettes = describePalettes();
          data.headline = HEADLINE_OPTIONS;
          data.facet = FACET_OPTIONS;
        }
        return asJson(data);
      }
      return asMarkdown(blocksMarkdown(kinds));
    },
  );

  const starter = async (type: string): Promise<WidgetSpec | undefined> => {
    if (!options.catalog || !(await options.catalog.has(type))) return undefined;
    return options.catalog.get(type);
  };

  server.registerTool(
    "fft_list_charts",
    {
      title: "List charts",
      description: `List every chart type (view) with what it is, the question it typically answers, and the row fields it needs.

Use it to pick the right chart for a question or a dataset, then call fft_get_chart for its full entry and a starter spec.`,
      inputSchema: z.strictObject({ response_format: ResponseFormat }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ response_format }) => {
      const charts: (ChartEntry & { has_starter: boolean })[] = [];
      for (const chart of describeCharts()) {
        const spec = await starter(chart.type);
        charts.push({ ...(spec ? describeChart(chart.type, spec) : chart), has_starter: spec !== undefined });
      }
      if (response_format === "json") return asJson({ total: charts.length, charts: charts.map(({ description: _d, howToRead: _h, ...rest }) => rest) });
      const lines = [`# Charts (${charts.length})`, "", "| Type | What it is | Answers, for example | Needs |", "| --- | --- | --- | --- |"];
      for (const chart of charts) lines.push(`| \`${chart.type}\` | ${cell(chart.summary)} | ${cell(chart.question ?? "")} | ${cell(needsText(chart))} |`);
      lines.push("", "Call fft_get_chart with a type for its fields, settings and a starter spec.");
      return asMarkdown(lines.join("\n"));
    },
  );

  server.registerTool(
    "fft_get_chart",
    {
      title: "Get chart",
      description: `One chart type in full: what it is, every row field it reads (and what each holds), its settings, how to read it, and a self-contained starter spec with inline rows.

To make a widget from it: replace the starter's data with yours (keeping the field names the view options point at, or changing those options), check it with fft_validate_spec, and save it with fft_create_widget. fft_list_blocks has every setting's type and default.`,
      inputSchema: z.strictObject({
        type: z.string().describe('A view type, such as "bar" or "sankey". fft_list_charts lists them.'),
        response_format: ResponseFormat,
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ type, response_format }) => {
      if (!blockTypes("view").includes(type)) {
        return { ...asMarkdown(`No chart type "${type}". Known types: ${blockTypes("view").join(", ")}.`), isError: true };
      }
      const spec = await starter(type);
      const chart = describeChart(type, spec);
      // A starter too long for one response keeps its first rows; the shape is what matters.
      const rows = spec?.data.type === "inline" ? (spec.data.rows as Row[]) : [];
      const trimmed = (count: number) => (spec ? { ...spec, data: { type: "inline", rows: rows.slice(0, count) } } : undefined);
      let kept = rows.length;
      while (kept > 1 && JSON.stringify(trimmed(kept), null, 2).length > CHARACTER_LIMIT - 4_000) kept = Math.ceil(kept / 2);
      const starterSpec = trimmed(kept);
      const note = spec && kept < rows.length ? `The starter shows ${kept} of its ${rows.length} rows.` : undefined;
      if (response_format === "json") return asJson({ ...chart, starter: starterSpec ?? null, ...(note ? { note } : {}) });
      const lines = [`# \`${type}\``, "", chart.description, ""];
      if (chart.question) lines.push(`**Answers, for example**: ${chart.question}`, "");
      if (chart.needs.length) {
        lines.push("## Row fields", "", "| Option | Holds | Required | What it is |", "| --- | --- | --- | --- |");
        for (const need of chart.needs) lines.push(`| \`${need.option}\` | ${need.holds}${need.many ? " (one or more)" : ""} | ${need.required ? "yes" : ""} | ${cell(need.description)} |`);
        lines.push("");
      }
      if (chart.settings.length) lines.push(`**Settings**: ${chart.settings.map((name) => `\`${name}\``).join(", ")} (fft_list_blocks kind "view" has their types and defaults).`, "");
      if (chart.howToRead) lines.push("## How to read it", "", chart.howToRead, "");
      if (starterSpec) lines.push("## Starter spec", "", ...(note ? [note, ""] : []), "```json", JSON.stringify(starterSpec, null, 2), "```");
      else lines.push("No starter spec in this server's catalog; fft_list_blocks and fft_validate_spec are enough to write one.");
      return asMarkdown(lines.join("\n"));
    },
  );

  server.registerTool(
    "fft_recommend_charts",
    {
      title: "Recommend charts",
      description: `Rank the chart types that suit some data, best first. Each pick has a score (0 to 100), why it fits, and a complete spec (your data plus a filled view) ready for fft_create_widget.

Pass the data as a source block: { "type": "inline", "rows": [...] }, { "type": "csv", "text": "region,revenue\\nNorth,120" }, or { "type": "url" | "csv", "url": "..." }. Optional transform steps reshape it first, as in a spec.`,
      inputSchema: z.strictObject({
        data: JsonObject.describe('A data source block, for example { "type": "csv", "url": "/exports/sales.csv" }. fft_list_blocks kind "source" lists the types.'),
        transform: z.array(JsonObject).optional().describe("Transform steps applied before choosing, as in a spec."),
        limit: z.number().int().min(1).max(20).default(5).describe("How many picks to return."),
        response_format: ResponseFormat,
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ data, transform, limit, response_format }, ctx) => {
      const base = { data, ...(transform ? { transform } : {}) } as unknown as WidgetSpec;
      const issues = validateSpec({ ...base, view: { type: "table" } }).filter((issue) => issue.level === "error");
      if (issues.length) return { ...asMarkdown(problems("The data block has problems:", issues)), isError: true };
      let rows: Row[];
      try {
        rows = await runPipeline(base, loadContext(ctx.mcpReq.signal));
      } catch (caught) {
        return { ...asMarkdown(`Could not load the data: ${(caught as Error).message}`), isError: true };
      }
      const picks = recommendCharts(rows, { limit }).map((pick) => ({ ...pick, spec: { ...base, view: pick.view } }));
      if (response_format === "json") return asJson({ rows: rows.length, picks });
      if (!picks.length) return asMarkdown("The data has no rows, so there is nothing to chart.");
      const lines = [`# Charts for ${rows.length} rows`, ""];
      for (const [i, pick] of picks.entries()) lines.push(`${i + 1}. **\`${pick.type}\`** (${pick.score}): ${pick.why}`, `   View: \`${JSON.stringify(pick.view)}\``);
      lines.push("", "Save one with fft_create_widget, passing the data block and that view as the spec. fft_get_chart has each type's settings.");
      return asMarkdown(lines.join("\n"));
    },
  );

  /** A spec's rows: loaded through its pipeline, or an error result. */
  const rowsFor = async (spec: WidgetSpec, signal?: AbortSignal): Promise<Row[] | { error: string }> => {
    try {
      return await runPipeline(spec, loadContext(signal));
    } catch (caught) {
      return { error: `Could not load the data: ${(caught as Error).message}` };
    }
  };

  server.registerTool(
    "fft_chart_guide",
    {
      title: "Chart guide",
      description: `One chart's guide for a person or another model: the jobs it does best and worst, what one row stands for, how the rows become marks, the table it needs (every column, its kind and the option that draws it), the data drawing it now as a table and CSV, its spec, and every other chart the same data makes, each with fit (fits, stretch, no), a verdict (better, same, trade-off, different, worse) and an assessment.

Pass a type for the catalog's example, or your own spec to get the same guide for your data.`,
      inputSchema: z.strictObject({
        type: z.string().optional().describe('A view type, such as "bar". Uses the catalog example.'),
        spec: JsonObject.optional().describe("Your own spec instead of a type; its data is loaded."),
        max_rows: z.number().int().min(1).max(500).default(40).describe("Rows of data to include in the tables."),
        response_format: ResponseFormat,
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ type, spec, max_rows, response_format }, ctx) => {
      const draft = (spec as unknown as WidgetSpec | undefined) ?? (type ? await starter(type) : undefined);
      if (!draft) return { ...asMarkdown(type && !blockTypes("view").includes(type) ? `No chart type "${type}". Known types: ${blockTypes("view").join(", ")}.` : "Pass a type with a catalog example, or a spec."), isError: true };
      const issues = validateSpec(draft);
      if (hasErrors(issues)) return { ...asMarkdown(`The spec has errors: ${issues.filter((i) => i.level === "error").map((i) => `${i.path}: ${i.message}`).join("; ")}`), isError: true };
      const rows = await rowsFor(draft, ctx.mcpReq.signal);
      if (!Array.isArray(rows)) return { ...asMarkdown(rows.error), isError: true };
      if (response_format === "json") {
        return asJson({ type: draft.view.type, guide: chartGuide(draft.view.type) ?? null, contract: dataContract(draft, rows), rows: rows.slice(0, max_rows), total_rows: rows.length, switches: switchOptions(draft, rows) as unknown as Record<string, unknown>[] });
      }
      let kept = Math.min(max_rows, rows.length);
      let text = guideMarkdown(draft, rows, { maxRows: kept });
      while (text.length > CHARACTER_LIMIT && kept > 3) text = guideMarkdown(draft, rows, { maxRows: (kept = Math.ceil(kept / 2)) });
      return asMarkdown(text);
    },
  );

  server.registerTool(
    "fft_switch_chart",
    {
      title: "Switch chart",
      description: `Draw a spec's data as another chart. With to, returns that chart's view (filled from the columns the current chart draws), whether the data fits, the verdict and the assessment: better for what, at what cost. Without to, ranks every other chart, those that fit and help first.

To use a switch: replace the spec's view with the returned view, then fft_update_widget or fft_create_widget.`,
      inputSchema: z.strictObject({
        spec: JsonObject.describe("The spec to switch; its data is loaded."),
        to: z.string().optional().describe('The chart to switch to, such as "hbar". Left out: every chart.'),
        include_impossible: z.boolean().default(false).describe("Also list charts this data cannot make, with why."),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ spec, to, include_impossible }, ctx) => {
      const draft = spec as unknown as WidgetSpec;
      const issues = validateSpec(draft);
      if (hasErrors(issues)) return { ...asMarkdown(`The spec has errors: ${issues.filter((i) => i.level === "error").map((i) => `${i.path}: ${i.message}`).join("; ")}`), isError: true };
      const rows = await rowsFor(draft, ctx.mcpReq.signal);
      if (!Array.isArray(rows)) return { ...asMarkdown(rows.error), isError: true };
      if (to) return asJson(switchChart(draft, to, rows) as unknown as Record<string, unknown>);
      const all = switchOptions(draft, rows);
      return asJson({ from: draft.view.type, switches: (include_impossible ? all : all.filter((s) => s.fit !== "no")) as unknown as Record<string, unknown>[] });
    },
  );

  server.registerTool(
    "fft_check_palette",
    {
      title: "Check palette",
      description: `Check whether series colors, in order, can be told apart: colorblind separation of neighbours (8 or more is the target, 6 to 8 needs labels), separation for full color vision (15 or more), lightness band, colorfulness, and 3:1 contrast against the background.

Pass a library palette name (see fft_list_blocks) or a list of hex colors. Use it before setting style.palette.`,
      inputSchema: z.strictObject({
        palette: z.union([z.string(), z.array(z.string()).min(1)]).describe('A palette name such as "apple", or hex colors such as ["#2a78d6", "#eb6834"].'),
        mode: z.enum(["light", "dark"]).default("light").describe("Whether the chart background is light or dark."),
        surface: z.string().optional().describe('Chart background as hex, for example "#ffffff". Defaults to the house light or dark surface.'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ palette, mode, surface }) => {
      let colors: string[];
      if (typeof palette === "string") {
        const named = getPalette(palette);
        if (!named) throw new Error(`Unknown palette "${palette}". Available: ${paletteNames().join(", ")}.`);
        colors = (mode === "dark" ? named.darkColors : undefined) ?? named.colors;
      } else {
        colors = palette;
      }
      return asJson({ colors, ...checkPalette(colors, { mode, surface }) });
    },
  );

  server.registerTool(
    "fft_create_variants",
    {
      title: "Create variants (Taller)",
      description: `Make new versions of ${which} with the Taller: elBulli's creative method, abstracted and applied to sales charts. Nothing is saved.

Every version keeps the widget's numbers (data, transforms and fields), says which sales question it answers ("Which region has the most revenue?"), and gives it a new form through one of seven sales moves: decompose (split the total into its parts), reframe (against a target, the average or a share), distill (keep only what decides), contrast (before and after, plan and actual, one standout), reveal (the spread, outliers, busy days), combine (two views in one) and reform (a shape the dashboard has not used). Each is valid, colorblind safe, never the original's shape, scored on five qualities (emphasis, surprise, honesty, detail, insight) and kept only when balanced. Returns the original's question and each version's spec (save one with fft_create_widget), move, question, title, how to read it, lineage, qualities, balance note, novelty and meaning. The same seed gives the same versions.`,
      inputSchema: withId({
        count: z.number().int().min(1).max(24).default(6).describe("How many versions, at most."),
        seed: z.number().int().min(1).default(1).describe("The same widget and seed give the same versions; change it for others."),
        color: z.number().min(-1).max(1).default(0).describe("-1 calm (cool hues) to 1 bold (warm hues, one standout)."),
        marks: z.number().min(-1).max(1).default(0).describe("-1 smooth (curves, washes) to 1 sharp (bars, steps, dots)."),
        moves: z
          .array(z.enum(Object.keys(MOVES) as [Move, ...Move[]]))
          .optional()
          .describe("Only these sales moves: decompose, reframe, distill, contrast, reveal, combine, reform."),
        audience: z
          .enum(Object.keys(AUDIENCES) as [Audience, ...Audience[]])
          .optional()
          .describe("Who reads it: rep (a quick look between calls), manager (the weekly review) or leadership (the quarterly review). Leans on the moves that serve them."),
      }),
      outputSchema: z.object({ widget: z.string(), question: z.string(), variants: z.array(JsonObject) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args, ctx) => {
      const id = await idOf(args);
      const spec = await store.get(id);
      const rows = await runPipeline(spec, loadContext(ctx.mcpReq.signal));
      const variants = createVariants(spec, rows, { count: args.count, seed: args.seed, color: args.color, marks: args.marks, moves: args.moves, audience: args.audience });
      return asJson({ widget: id, question: questionOf(spec, rows).text, variants: variants as unknown as Record<string, unknown>[] });
    },
  );

  server.registerTool(
    "fft_validate_spec",
    {
      title: "Validate spec",
      description: `Check a draft spec without saving it. Returns valid (no errors) and every issue.

With check_data (default true) it also loads the data and warns about view fields the rows do not have.`,
      inputSchema: z.strictObject({
        spec: JsonObject.describe("The complete spec to check."),
        check_data: z.boolean().default(true).describe("Also load the data to check field names."),
      }),
      outputSchema: z.object({ valid: z.boolean(), issues: z.array(z.object({ level: z.enum(["error", "warning"]), path: z.string(), message: z.string() })) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ spec, check_data }, ctx) => {
      const draft = spec as unknown as WidgetSpec;
      let issues = validateSpec(draft);
      if (!hasErrors(issues) && check_data) issues = [...issues.filter((i) => i.level === "error"), ...(await dataWarnings(draft, ctx.mcpReq.signal))];
      return asJson({ valid: !hasErrors(issues), issues });
    },
  );

  // ---- Resources ----

  const json = (uri: URL, value: unknown) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(value, null, 2) }] });
  const readSpec = async (uri: URL, id: string) => {
    try {
      return await store.get(id);
    } catch (caught) {
      if (caught instanceof WidgetNotFoundError || (caught as Error).message.startsWith("Widget ids use")) throw new ResourceNotFoundError(uri.href);
      throw caught;
    }
  };

  if (linked) {
    server.registerResource(
      "widget",
      `fft://widgets/${linked}`,
      { title: `Widget ${linked}`, description: "The linked widget's spec.", mimeType: "application/json" },
      async (uri) => json(uri, await readSpec(uri, linked)),
    );
    server.registerResource(
      "widget-data",
      `fft://widgets/${linked}/data`,
      { title: `Widget ${linked}: data`, description: "The rows the linked widget draws, after transforms.", mimeType: "application/json" },
      async (uri, ctx) => json(uri, await runPipeline(await readSpec(uri, linked), loadContext(ctx.mcpReq.signal))),
    );
  } else {
    server.registerResource(
      "widget",
      new ResourceTemplate("fft://widgets/{id}", {
        list: async () => ({
          resources: (await store.list())
            .filter((entry) => entry.spec)
            .map((entry) => ({
              uri: `fft://widgets/${entry.id}`,
              name: entry.id,
              title: entry.spec?.title ?? entry.id,
              ...(entry.spec?.description ? { description: entry.spec.description } : {}),
              mimeType: "application/json",
            })),
        }),
      }),
      { title: "Widget spec", description: "One widget's JSON spec.", mimeType: "application/json" },
      async (uri, { id }) => json(uri, await readSpec(uri, String(id))),
    );
    server.registerResource(
      "widget-data",
      new ResourceTemplate("fft://widgets/{id}/data", { list: undefined }),
      { title: "Widget data", description: "The rows one widget draws, after transforms.", mimeType: "application/json" },
      async (uri, { id }, ctx) => json(uri, await runPipeline(await readSpec(uri, String(id)), loadContext(ctx.mcpReq.signal))),
    );
  }

  if (boards) {
    server.registerResource(
      "dashboard",
      new ResourceTemplate("fft://dashboards/{id}", {
        list: async () => ({
          resources: (await boards.list())
            .filter((entry) => entry.spec)
            .map((entry) => ({ uri: `fft://dashboards/${entry.id}`, name: entry.id, title: entry.spec?.title ?? entry.id, mimeType: "application/json" })),
        }),
      }),
      { title: "Dashboard", description: "One dashboard's JSON spec.", mimeType: "application/json" },
      async (uri, { id }) => {
        try {
          return json(uri, await boards.get(String(id)));
        } catch (caught) {
          if (caught instanceof WidgetNotFoundError) throw new ResourceNotFoundError(uri.href);
          throw caught;
        }
      },
    );
  }

  server.registerResource(
    "blocks",
    "fft://blocks",
    { title: "Block catalog", description: "Every data source, transform, format and view, with its options.", mimeType: "application/json" },
    async (uri) => json(uri, { ...Object.fromEntries(KINDS.map((kind) => [kind, describeBlocks(kind)])), presets: describePresets(), palettes: describePalettes() }),
  );

  const { catalog } = options;
  if (catalog) {
    server.registerResource(
      "chart",
      new ResourceTemplate("fft://charts/{type}", {
        list: async () => ({
          resources: (await catalog.list())
            .filter((entry) => entry.spec && blockTypes("view").includes(entry.id))
            .map((entry) => ({ uri: `fft://charts/${entry.id}`, name: entry.id, title: `${entry.id}: ${describeChart(entry.id).summary}`, mimeType: "application/json" })),
        }),
      }),
      { title: "Chart starter", description: "One chart type's self-contained starter spec, with inline rows: drop it into <fft-widget> or fft_create_widget.", mimeType: "application/json" },
      async (uri, { type }) => {
        if (!blockTypes("view").includes(String(type))) throw new ResourceNotFoundError(uri.href);
        const spec = await starter(String(type));
        if (!spec) throw new ResourceNotFoundError(uri.href);
        return json(uri, spec);
      },
    );
  }

  return server;
}
