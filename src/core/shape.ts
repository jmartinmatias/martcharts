/**
 * Sort, top N and "Other", once for every category view. Datawrapper sorts its bars and cuts the long tail from the
 * chart itself; here a view says the same with three options, and the rows are shaped after the transforms (and after
 * a dashboard's filters, which arrive as transforms) and before validation and drawing, so no renderer changes:
 *
 *   { "type": "hbar", "label": "client", "value": "revenue", "sort": "value", "limit": 8, "other": true }
 *
 * - `sort`: "value" (largest first unless `order` says "asc"), "label" (A to Z unless "desc"), or "none" (as given).
 * - `limit`: keep the first N rows after sorting.
 * - `other`: fold the rows past the limit into one row, named "Other" (or the text given), with every number summed.
 *
 * With small multiples the shaping runs per panel, so each panel keeps its own top N. Shaping twice gives the same
 * rows: the "Other" row always comes last and is never counted against the limit.
 *
 * @module
 */
import { normalizeView } from "./aliases.ts";
import { readNumber } from "./formats.ts";
import type { OptionSchema } from "./registry.ts";
import type { Row } from "./types.ts";

/** The word for the folded row when `other` is true. */
export const OTHER_LABEL = "Other";

/** Where each category view keeps the name of a row and the number it is ranked by (canonical names, after aliases). */
export const SHAPE_FIELDS: Readonly<Record<string, { label: string; value: string }>> = {
  bar: { label: "x", value: "y" },
  hbar: { label: "label", value: "value" },
  dot: { label: "label", value: "value" },
  dumbbell: { label: "label", value: "to" },
  slope: { label: "label", value: "to" },
  donut: { label: "label", value: "value" },
  pie: { label: "label", value: "value" },
  treemap: { label: "label", value: "value" },
  waffle: { label: "label", value: "value" },
  variance: { label: "label", value: "value" },
  bullet: { label: "label", value: "value" },
  meter: { label: "label", value: "value" },
  rings: { label: "label", value: "value" },
  strips: { label: "label", value: "value" },
  list: { label: "label", value: "value" },
};

/** The views that take `sort`, `limit` and `other`. */
export const SHAPE_VIEWS: readonly string[] = Object.keys(SHAPE_FIELDS);

export const SORT_OPTION: OptionSchema = {
  type: "enum",
  values: ["value", "label", "none"],
  default: "none",
  description: 'Orders the rows before drawing: "value" ranks them by their number (largest first), "label" by name (A to Z), "none" keeps the data\'s order. Stacked bars and strips rank by their total.',
};
export const ORDER_OPTION: OptionSchema = {
  type: "enum",
  values: ["desc", "asc"],
  description: 'Turns the sort around: "asc" puts the smallest first, "desc" names Z to A. Defaults to largest first for value, A to Z for label.',
};
export const LIMIT_OPTION: OptionSchema = {
  type: "number",
  description: "Keeps the first N rows after sorting: the top 10, say. The rest are left out, or folded into one row with other.",
};
export const OTHER_OPTION: OptionSchema = {
  type: "any",
  description: 'With limit, folds the rows past it into one last row, its numbers summed: true names it "Other", text names it as you like ("All other clients"). So the parts still add up to the whole.',
};

/** The four shaping options, to spread into a view's options. */
export const SHAPE_OPTIONS: Readonly<Record<string, OptionSchema>> = { sort: SORT_OPTION, order: ORDER_OPTION, limit: LIMIT_OPTION, other: OTHER_OPTION };

/** Problems with the shaping options, as messages. */
export function shapeProblems(view: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const { limit, other } = view;
  if (limit !== undefined && !(typeof limit === "number" && Number.isInteger(limit) && limit >= 1)) problems.push("limit must be a whole number, 1 or more.");
  if (other !== undefined && typeof other !== "boolean" && !(typeof other === "string" && other.trim() !== "")) problems.push('other must be true, false or the name of the folded row, such as "All other clients".');
  if (other !== undefined && other !== false && limit === undefined) problems.push("other folds the rows past limit into one: set limit too, such as 8.");
  return problems;
}

/** True when the view asks for any shaping. */
export function shapes(view: { type: string; [option: string]: unknown } | undefined): boolean {
  if (!view || !(view.type in SHAPE_FIELDS)) return false;
  const sort = view.sort;
  return (sort !== undefined && sort !== "none") || typeof view.limit === "number";
}

/**
 * Rows sorted, cut to the top N and folded, as the view asks. `facet` names the small-multiples field: each panel is
 * shaped on its own, in the order panels first appear. Rows come back untouched when the view asks for nothing.
 */
export function shapeRows(view: { type: string; [option: string]: unknown } | undefined, rows: Row[], facet?: string): Row[] {
  if (!view || !shapes(view) || shapeProblems(view).length) return rows;
  const read = normalizeView(view) as Record<string, unknown>;
  if (!facet) return shapeGroup(read, rows);
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = JSON.stringify(row[facet] ?? null);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.values()].flatMap((group) => shapeGroup(read, group));
}

function shapeGroup(view: Record<string, unknown>, rows: Row[]): Row[] {
  const fields = SHAPE_FIELDS[view.type as string] as { label: string; value: string };
  const label = typeof view[fields.label] === "string" ? (view[fields.label] as string) : undefined;
  const values = list(view[fields.value]);
  const otherName = view.other === true ? OTHER_LABEL : typeof view.other === "string" ? view.other : undefined;
  // A previous fold stays last and outside the count, so shaping twice changes nothing.
  const isOther = (row: Row) => otherName !== undefined && label !== undefined && row[label] === otherName;
  const folded = rows.filter(isOther);
  let kept = rows.filter((row) => !isOther(row));

  const sort = view.sort ?? "none";
  if (sort === "value" && values.length) {
    const total = view.stacked || view.type === "strips";
    const rank = (row: Row) => {
      const numbers = values.map((field) => readNumber(row[field]));
      if (numbers.every((n) => n === null)) return null;
      return total ? numbers.reduce<number>((sum, n) => sum + (n ?? 0), 0) : numbers[0] ?? null;
    };
    const sign = view.order === "asc" ? 1 : -1;
    kept = stable(kept, (a, b) => {
      const [x, y] = [rank(a), rank(b)];
      if (x === null) return y === null ? 0 : 1;
      if (y === null) return -1;
      return (x - y) * sign;
    });
  } else if (sort === "label" && label) {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    const sign = view.order === "desc" ? -1 : 1;
    kept = stable(kept, (a, b) => collator.compare(String(a[label] ?? ""), String(b[label] ?? "")) * sign);
  }

  const limit = typeof view.limit === "number" ? view.limit : undefined;
  if (limit === undefined || kept.length <= limit) return otherName ? [...kept, ...folded] : kept;
  const top = kept.slice(0, limit);
  if (!otherName || !label) return top;
  const rest = [...kept.slice(limit), ...folded];
  return [...top, foldRows(rest, label, otherName)];
}

/** One row standing for many: the label given, every number summed, and any other field kept only when all agree. */
export function foldRows(rows: Row[], label: string, name: string): Row {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const out: Row = {};
  for (const key of keys) {
    if (key === label) continue;
    const present = rows.map((row) => row[key]).filter((v) => v !== undefined && v !== null && v !== "");
    if (present.length && present.every((v) => readNumber(v) !== null && typeof v !== "boolean")) {
      out[key] = present.reduce<number>((sum, v) => sum + (readNumber(v) as number), 0);
    } else if (present.length && present.every((v) => v === present[0])) out[key] = present[0];
  }
  out[label] = name;
  return out;
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return typeof value === "string" && value ? [value] : [];
}

/** Array.prototype.sort is stable in every engine we run on; spelled out so ties keep the data's order by intent. */
function stable(rows: Row[], compare: (a: Row, b: Row) => number): Row[] {
  return rows.map((row, i) => ({ row, i })).sort((a, b) => compare(a.row, b.row) || a.i - b.i).map((entry) => entry.row);
}
