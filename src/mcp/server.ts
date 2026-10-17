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
import { describeBlocks } from "../core/registry.ts";
import { createVariants, METHODS } from "../core/taller.ts";
import type { Method } from "../core/taller.ts";
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
  "A ranking or a comparison across categories: hbar, bar, dumbbell (before and after), slope (who moved between two periods).",
  "Change over time: line, area, bar, calendar (day by day), heatmap (two time scales, such as weekday by hour), candlestick (prices: open, high, low, close).",
  "Many time series at once: horizon (one thin row each, values folded into bands of deepening color, blue above the baseline and red below).",
  "Rank over time: bump.",
  'Parts of a whole: donut (up to 6 parts), waffle (100 countable squares), treemap (many parts), sunburst (two or three levels), icicle (a hierarchy laid flat, up to four levels, easier to label), bar or area with stacked "percent".',
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
  "Records to read: table (with spark and badge cells), list.",
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
    { name: linked ? `fft-widget-${linked}` : "fft-widgets", version: VERSION },
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

Use it to answer questions about the numbers a widget shows. Markdown gives a table with labels and formatted values; json gives raw values. Large results are paged: pass next_offset as offset for more.`,
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
      const render = (page: Row[]) => {
        const { info } = paginate(rows, args.offset, page.length);
        const fullInfo = { ...info, has_more: rows.length > args.offset + page.length, ...(rows.length > args.offset + page.length ? { next_offset: args.offset + page.length } : {}) };
        if (args.response_format === "json") {
          const data = { id, ...fullInfo, fields, rows: page, warnings };
          return { data, text: JSON.stringify(data, null, 2) };
        }
        const lines = [`# ${spec.title ?? id}: data`, "", `${rows.length} rows after transforms. Showing ${page.length ? `${args.offset + 1} to ${args.offset + page.length}` : "none"}.`, ""];
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
      description: `Cook a menu of new versions of ${which} with the Taller, elBulli's creative method applied to charts. Nothing is saved.

Each variant keeps the widget's data, transforms and fields (the ingredients) and changes its form (view), technique, tools, temperature (warm or cool palette, or a highlight), texture (soft curves and washes, or crunchy bars, steps and dots) and plating (preset). Every variant is valid, colorblind safe, never the original's shape, scored on five tastes (salty emphasis, acid surprise, bitter honesty, fatty ink, umami depth) and kept only when balanced. Returns each variant's spec (save one with fft_create_widget), menu line, lineage, tastes, balance note, novelty and meaning. The same seed gives the same menu.`,
      inputSchema: withId({
        count: z.number().int().min(1).max(24).default(6).describe("How many variants, at most."),
        seed: z.number().int().min(1).default(1).describe("The same widget and seed give the same menu; change it for another."),
        temperature: z.number().min(-1).max(1).default(0).describe("-1 cold (cool hues) to 1 hot (warm hues)."),
        texture: z.number().min(-1).max(1).default(0).describe("-1 soft (curves, washes) to 1 crunchy (bars, steps, dots)."),
        methods: z
          .array(z.enum(Object.keys(METHODS) as [Method, ...Method[]]))
          .optional()
          .describe("Only these creative methods: association, adaptation, deconstruction, minimalism, change-of-state, technique-concept, sensory."),
      }),
      outputSchema: z.object({ dish: z.string(), variants: z.array(JsonObject) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (args, ctx) => {
      const id = await idOf(args);
      const spec = await store.get(id);
      const rows = await runPipeline(spec, loadContext(ctx.mcpReq.signal));
      const variants = createVariants(spec, rows, { count: args.count, seed: args.seed, temperature: args.temperature, texture: args.texture, methods: args.methods });
      return asJson({ dish: id, variants: variants as unknown as Record<string, unknown>[] });
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

  return server;
}
