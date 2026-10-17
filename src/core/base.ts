/**
 * The vanilla widget: the plain block every other widget is forked from.
 *
 * @module
 */
import type { WidgetSpec } from "./types.ts";

/**
 * A valid, empty widget: no rows, drawn as a table, following the system theme.
 * Fork it and say only what is different.
 *
 * @example
 * import { baseWidget, fork } from "fft-widgets";
 *
 * const topCustomers = fork(baseWidget, {
 *   title: "Top customers",
 *   data: { type: "url", url: "/data/customers.json" },
 *   transform: [{ type: "sort", field: "revenue", order: "desc" }, { type: "limit", count: 5 }],
 *   view: { type: "list", label: "name", value: "revenue" },
 * });
 */
export const baseWidget: WidgetSpec = Object.freeze({
  title: "Untitled widget",
  data: { type: "inline", rows: [] },
  transform: [],
  fields: {},
  view: { type: "table" },
  style: { theme: "auto", density: "comfortable" },
}) as WidgetSpec;
