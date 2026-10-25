/**
 * Dashboards: a grid of widgets with one filter row that scopes all of them,
 * described as plain JSON like a widget is.
 *
 * @module
 */
import { isPlainObject } from "./fork.ts";
import type { Issue, WidgetSpec } from "./types.ts";

/** One cell: a stored widget by id, an inline spec, or a full-width section heading. */
export interface DashboardCell {
  /** Id of a widget in the store, for example "revenue-kpi". */
  widget?: string;
  /** An inline spec, for a widget that lives only in this dashboard. */
  spec?: WidgetSpec;
  /** Columns the cell spans. Default 1. */
  span?: number;
  /** A section heading instead of a widget: a full-width row that groups the cells after it. */
  section?: string;
  /** A line under the section heading. */
  description?: string;
  /**
   * Makes the widget follow a selection: when a click on a mark (or a filter) picks a value of `field`, this widget
   * shows that value instead of the one its spec names. See `DashboardFollow`.
   */
  follow?: DashboardFollow;
}

/**
 * A widget that follows the board's selection, such as a client card that shows the client clicked anywhere else.
 * `field` is the field the selection is made on ("name" in a ranking of clients); `as` is the field the widget keys
 * its own rows on, when it differs ("client" in a history of events). The widget's own filter on that field is
 * replaced by the selected value, and its title and subtitle name the new value where they named the old one.
 */
export interface DashboardFollow {
  /** Field the selection is made on, such as "name". */
  field: string;
  /** Field this widget keys its rows on, when it differs from `field`, such as "client". */
  as?: string;
  /** Value shown before anything is picked. Defaults to the value the widget's own filter names, or its first row. */
  default?: string | number;
}

/** A filter in the dashboard's filter row. */
export interface DashboardFilter {
  /** Field to filter by. Every widget whose data has this field is filtered; the others are left alone. */
  field: string;
  /** Label beside the control. Defaults to the field name in words. */
  label?: string;
}

/**
 * A time range in the filter row: a segmented control of periods that cuts
 * every widget whose data has `field` (ISO dates or months, YYYY-MM...) to the
 * latest months. The window counts back from the latest date across those widgets.
 */
export interface DashboardRange {
  /** Date field, for example "month" holding "2026-09", or several (["month", "day"]) so monthly and daily widgets share one window. */
  field: string | string[];
  /** Periods offered: a count of months or years ("3M", "1Y"), "YTD" or "All". Default ["3M", "6M", "12M", "All"]. */
  options?: string[];
  /** Period chosen at first. Default "All" when offered, else the last option. */
  default?: string;
  /** Label beside the control. Default "Period". */
  label?: string;
}

export const RANGE_OPTIONS = ["3M", "6M", "12M", "All"];
const PERIOD = /^(?:(\d+)([MY])|YTD|All)$/;

/**
 * First month (YYYY-MM) a period keeps, counting back from `latest` and
 * including its month: "3M" before 2026-09 is 2026-07. "YTD" starts in January
 * of the latest year. Null for "All", or when `latest` is not an ISO date.
 * As strings, YYYY-MM compares correctly against both months and full dates.
 */
export function rangeStart(option: string, latest: string): string | null {
  const date = /^(\d{4})-(\d{2})/.exec(latest);
  if (!date || option === "All") return null;
  const year = Number(date[1]);
  if (option === "YTD") return `${year}-01`;
  const count = /^(\d+)([MY])$/.exec(option);
  if (!count) return null;
  const months = Number(count[1]) * (count[2] === "Y" ? 12 : 1);
  const index = year * 12 + Number(date[2]) - 1 - (months - 1);
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** A dashboard: title, column count, filter row and cells. */
export interface DashboardSpec {
  id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  /** Grid columns on wide screens. Default 3. Narrower screens drop to 2, then 1. */
  columns?: number;
  filters?: DashboardFilter[];
  range?: DashboardRange;
  /**
   * Clicking a mark (a bar, a slice, a region, a table row) filters every other widget whose data has that mark's
   * field to its value, with a chip in the filter row to clear it. Default true; `false` turns it off for this board.
   */
  crossFilter?: boolean;
  /**
   * When the data was last true, shown in the header and on paper: an ISO date ("2026-10-25"), or words with
   * `{latest}`, the latest date across the widgets that have the range field ("Data to {latest}").
   */
  asOf?: string;
  widgets: DashboardCell[];
}

const error = (path: string, message: string): Issue => ({ level: "error", path, message });

/** Checks a dashboard spec. Returns every problem, in spec order. */
export function validateDashboard(spec: unknown): Issue[] {
  if (!isPlainObject(spec)) return [error("dashboard", "A dashboard must be an object with a widgets list.")];
  const issues: Issue[] = [];
  const columns = spec.columns ?? 3;
  if (!(typeof columns === "number" && Number.isInteger(columns) && columns >= 1 && columns <= 6)) {
    issues.push(error("columns", "Must be a whole number from 1 to 6."));
  }
  if (spec.filters !== undefined) {
    if (!Array.isArray(spec.filters)) issues.push(error("filters", "Must be a list of { field, label? }."));
    else
      spec.filters.forEach((filter, i) => {
        if (!isPlainObject(filter) || typeof filter.field !== "string" || !filter.field) {
          issues.push(error(`filters[${i}].field`, "Required. Field to filter every widget by."));
        }
      });
  }
  if (spec.range !== undefined) {
    const range = spec.range;
    if (!isPlainObject(range)) issues.push(error("range", "Must be an object such as { field: \"month\" }."));
    else {
      const fields = Array.isArray(range.field) ? range.field : [range.field];
      if (fields.length === 0 || !fields.every((f) => typeof f === "string" && f !== "")) {
        issues.push(error("range.field", "Required. Date field (YYYY-MM...) every widget is cut by."));
      }
      const options = range.options ?? RANGE_OPTIONS;
      if (!Array.isArray(options) || options.length === 0) issues.push(error("range.options", 'Must be a list of periods such as ["3M", "12M", "All"].'));
      else {
        options.forEach((option, i) => {
          if (typeof option !== "string" || !PERIOD.test(option)) {
            issues.push(error(`range.options[${i}]`, `"${String(option)}" is not a period. Use a count of months or years such as "3M" or "1Y", "YTD" or "All".`));
          }
        });
        if (range.default !== undefined && !options.includes(range.default)) issues.push(error("range.default", `Must be one of the options: ${options.join(", ")}.`));
      }
    }
  }
  if (spec.crossFilter !== undefined && typeof spec.crossFilter !== "boolean") issues.push(error("crossFilter", "Must be true or false."));
  if (spec.asOf !== undefined && !(typeof spec.asOf === "string" && spec.asOf.trim() !== "")) issues.push(error("asOf", 'Must be a date such as "2026-10-25", or words with {latest}.'));
  if (!Array.isArray(spec.widgets)) {
    issues.push(error("widgets", 'Required. A list of cells such as { "widget": "revenue-kpi", "span": 2 }.'));
    return issues;
  }
  const max = typeof columns === "number" ? columns : 3;
  spec.widgets.forEach((cell, i) => {
    const isSection = isPlainObject(cell) && typeof cell.section === "string" && cell.section !== "";
    if (!isPlainObject(cell) || (typeof cell.widget !== "string" && !isPlainObject(cell.spec) && !isSection)) {
      issues.push(error(`widgets[${i}]`, "Needs a widget id, an inline spec, or a section title."));
      return;
    }
    if (cell.follow !== undefined) {
      const follow = cell.follow;
      if (isSection) issues.push(error(`widgets[${i}].follow`, "A section heading cannot follow a selection; put follow on a widget cell."));
      else if (!isPlainObject(follow) || typeof follow.field !== "string" || follow.field === "") {
        issues.push(error(`widgets[${i}].follow.field`, 'Required. The field the selection is made on, such as { "field": "name", "as": "client" }.'));
      } else {
        if (follow.as !== undefined && !(typeof follow.as === "string" && follow.as !== "")) issues.push(error(`widgets[${i}].follow.as`, "Must name the field this widget keys its rows on."));
        if (follow.default !== undefined && typeof follow.default !== "string" && typeof follow.default !== "number") issues.push(error(`widgets[${i}].follow.default`, "Must be a text or a number."));
      }
    }
    const span = cell.span;
    if (span !== undefined && !(typeof span === "number" && Number.isInteger(span) && span >= 1 && span <= max)) {
      issues.push(error(`widgets[${i}].span`, `Must be a whole number from 1 to ${max}.`));
    }
  });
  return issues;
}
