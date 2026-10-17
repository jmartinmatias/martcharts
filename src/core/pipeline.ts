/**
 * Runs the data half of a widget: load rows from the source, then apply each transform.
 * Has no DOM dependency, so it runs the same in the browser, in Node and in tests.
 *
 * @module
 */
import { getBlock } from "./registry.ts";
import type { LoadContext } from "./registry.ts";
import type { Row, TransformSpec, WidgetSpec } from "./types.ts";

/**
 * Loads the widget's rows and applies its transforms.
 *
 * @param spec Any object with `data` and optional `transform`; a full `WidgetSpec` works.
 * @param ctx Services for data sources. `fetch` defaults to the global `fetch`.
 * @throws When the source type is unknown, loading fails, or the source does not return a list of objects.
 *
 * @example
 * const rows = await runPipeline({
 *   data: { type: "url", url: "/data/sales.json" },
 *   transform: [{ type: "aggregate", groupBy: "region", measures: [{ op: "sum", field: "revenue" }] }],
 * });
 */
/** One stable default fetch, so caches keyed by the fetch function can recognise it from call to call. */
const defaultFetch: typeof fetch = (input, init) => globalThis.fetch(input, init);

export async function runPipeline(spec: Pick<WidgetSpec, "data" | "transform">, ctx: Partial<LoadContext> = {}): Promise<Row[]> {
  const source = getBlock("source", spec.data.type);
  const loaded: unknown = await source.load(spec.data, { fetch: ctx.fetch ?? defaultFetch, signal: ctx.signal, fresh: ctx.fresh });
  return applyTransforms(checkRows(loaded, spec.data.type, "path" in source.options), spec.transform);
}

/** Applies transform steps to rows, in order. Throws `UnknownBlockError` for an unregistered step type. */
export function applyTransforms(rows: Row[], steps: TransformSpec[] = []): Row[] {
  return steps.reduce((current, step) => getBlock("transform", step.type).apply(current, step), rows);
}

function checkRows(loaded: unknown, type: string, hasPathOption: boolean): Row[] {
  if (!Array.isArray(loaded)) {
    const hint = hasPathOption ? ' Use the "path" option to point at the list, for example "data.items".' : "";
    throw new Error(`Data source "${type}" returned ${describeValue(loaded)}, not a list of rows.${hint}`);
  }
  const bad = loaded.findIndex((row) => row === null || typeof row !== "object" || Array.isArray(row));
  if (bad !== -1) throw new Error(`Row ${bad} from data source "${type}" is ${describeValue(loaded[bad])}, not an object.`);
  return loaded as Row[];
}

/** "an object", "a list", "a number", "null"... for error messages. */
export function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "nothing";
  if (Array.isArray(value)) return "a list";
  const kind = typeof value;
  return kind === "object" ? "an object" : `a ${kind}`;
}
