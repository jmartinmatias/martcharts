/**
 * Built-in transforms. Each takes rows and returns new rows; none modifies its input.
 *
 * @module
 */
import type { TransformBlock } from "./registry.ts";
import { applyRag, ragStepProblems } from "./rag.ts";
import type { RagStep } from "./rag.ts";
import { binValues, sturges } from "./scale.ts";
import type { Row } from "./types.ts";

/** `{ type: "filter", field, op?, value }`: keep rows that match. */
export interface FilterStep {
  type: "filter";
  field: string;
  op?: FilterOp;
  value: unknown;
}
export type FilterOp = "==" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "contains";

/** `{ type: "sort", field, order? }`: order rows by one field. Missing values go last. */
export interface SortStep {
  type: "sort";
  field: string;
  order?: "asc" | "desc";
}

/** `{ type: "limit", count }`: keep the first `count` rows. */
export interface LimitStep {
  type: "limit";
  count: number;
}

/** `{ type: "aggregate", groupBy?, measures }`: one row per group with summary numbers. */
export interface AggregateStep {
  type: "aggregate";
  groupBy?: string | string[];
  measures: Measure[];
}
export interface Measure {
  op: "sum" | "avg" | "min" | "max" | "count" | "list";
  /** Field to summarize. Optional for `count`, where it counts rows with a value in that field. */
  field?: string;
  /** Output field name. Defaults to `field`, or `"count"` for count. */
  as?: string;
}

/** `{ type: "calc", as, op, left, right }`: a new field from two fields or a field and a number. */
export interface CalcStep {
  type: "calc";
  as: string;
  op: "add" | "subtract" | "multiply" | "divide";
  left: string | number;
  right: string | number;
}

const FILTER_OPS = ["==", "!=", ">", ">=", "<", "<=", "in", "contains"] as const;
const MEASURE_OPS = ["sum", "avg", "min", "max", "count", "list"] as const;
const CALC_OPS = ["add", "subtract", "multiply", "divide"] as const;

/** True for null, undefined and NaN. */
export function isMissing(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "number" && Number.isNaN(value));
}

/** Orders numbers numerically and everything else as text, ignoring case. */
export function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asList(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function matches(actual: unknown, op: FilterOp, expected: unknown): boolean {
  switch (op) {
    case "==":
      return actual === expected;
    case "!=":
      return actual !== expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
    case "contains":
      return !isMissing(actual) && String(actual).toLowerCase().includes(String(expected).toLowerCase());
    default: {
      if (isMissing(actual) || isMissing(expected)) return false;
      const order = compareValues(actual, expected);
      if (op === ">") return order > 0;
      if (op === ">=") return order >= 0;
      if (op === "<") return order < 0;
      return order <= 0;
    }
  }
}

const filter: TransformBlock = {
  type: "filter",
  description: "Keeps only the rows where a field matches a condition.",
  options: {
    field: { type: "field", required: true, description: "Field to test." },
    op: { type: "enum", values: FILTER_OPS, default: "==", description: "Comparison. `in` expects a list; `contains` matches text ignoring case." },
    value: { type: "any", required: true, description: "Value to compare against." },
  },
  apply(rows, step) {
    const { field, op = "==", value } = step as unknown as FilterStep;
    return rows.filter((row) => matches(row[field], op, value));
  },
};

const sort: TransformBlock = {
  type: "sort",
  description: "Orders rows by one field. Missing values always go last.",
  options: {
    field: { type: "field", required: true, description: "Field to sort by." },
    order: { type: "enum", values: ["asc", "desc"], default: "asc", description: "`asc` for smallest first, `desc` for largest first." },
  },
  apply(rows, step) {
    const { field, order = "asc" } = step as unknown as SortStep;
    const direction = order === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      const x = a[field];
      const y = b[field];
      const xMissing = isMissing(x);
      const yMissing = isMissing(y);
      if (xMissing || yMissing) return Number(xMissing) - Number(yMissing);
      return compareValues(x, y) * direction;
    });
  },
};

const limit: TransformBlock = {
  type: "limit",
  description: "Keeps the first rows and drops the rest. Pair with sort for a top N.",
  options: {
    count: { type: "number", required: true, description: "How many rows to keep." },
  },
  validate(step) {
    const count = step.count;
    return typeof count === "number" && (count < 0 || !Number.isInteger(count)) ? ["count must be a whole number, 0 or more."] : [];
  },
  apply(rows, step) {
    return rows.slice(0, (step as unknown as LimitStep).count);
  },
};

function summarize(rows: Row[], measure: Measure): number | null | number[] {
  if (measure.op === "list") {
    return rows.map((row) => toNumber(row[measure.field as string])).filter((n): n is number => n !== null);
  }
  if (measure.op === "count") {
    return measure.field ? rows.filter((row) => !isMissing(row[measure.field as string])).length : rows.length;
  }
  const numbers = rows.map((row) => toNumber(row[measure.field as string])).filter((n): n is number => n !== null);
  switch (measure.op) {
    case "sum":
      return numbers.reduce((total, n) => total + n, 0);
    case "avg":
      return numbers.length ? numbers.reduce((total, n) => total + n, 0) / numbers.length : null;
    case "min":
      return numbers.length ? Math.min(...numbers) : null;
    case "max":
      return numbers.length ? Math.max(...numbers) : null;
  }
}

const aggregate: TransformBlock = {
  type: "aggregate",
  description: "Groups rows and summarizes each group into one row. Without groupBy, summarizes all rows into one.",
  options: {
    groupBy: { type: "fields", description: "Field or fields that define a group. Leave out to summarize everything." },
    measures: {
      type: "array",
      required: true,
      description: 'Summary numbers, each `{ op, field?, as? }` with op one of sum, avg, min, max, count, or list (the values in order, for sparklines). Example: `[{ "op": "sum", "field": "revenue" }]`.',
    },
  },
  validate(step) {
    const measures = step.measures;
    if (!Array.isArray(measures)) return [];
    if (measures.length === 0) return ["measures needs at least one entry."];
    const problems: string[] = [];
    measures.forEach((m: Partial<Measure>, i) => {
      if (!MEASURE_OPS.includes(m?.op as Measure["op"])) problems.push(`measures[${i}].op must be one of ${MEASURE_OPS.join(", ")}.`);
      else if (m.op !== "count" && typeof m.field !== "string") problems.push(`measures[${i}] needs a field for ${m.op}.`);
    });
    return problems;
  },
  apply(rows, step) {
    const { groupBy, measures } = step as unknown as AggregateStep;
    const keys = asList(groupBy);
    const groups = new Map<string, Row[]>();
    if (keys.length === 0) groups.set("", rows);
    for (const row of keys.length ? rows : []) {
      const id = JSON.stringify(keys.map((key) => row[key]));
      const group = groups.get(id);
      if (group) group.push(row);
      else groups.set(id, [row]);
    }
    return [...groups.values()].map((group) => {
      const out: Row = {};
      for (const key of keys) out[key] = group[0]?.[key];
      for (const measure of measures) {
        const name = measure.as ?? (measure.op === "count" ? "count" : (measure.field as string));
        out[name] = summarize(group, measure);
      }
      return out;
    });
  },
};

/** `{ type: "pivot", row, column, value, op?, fill? }`: long data to wide data. */
export interface PivotStep {
  type: "pivot";
  row: string;
  column: string;
  value: string;
  op?: Measure["op"];
  fill?: unknown;
}

const pivot: TransformBlock = {
  type: "pivot",
  description: "Spreads one field's values into columns: one row per row key, one column per distinct column value. Turns long data into wide data for stacked and grouped charts.",
  options: {
    row: { type: "field", required: true, description: "Field whose values become the rows, for example region." },
    column: { type: "field", required: true, description: "Field whose values become new columns, for example product." },
    value: { type: "field", required: true, description: "Field that fills the cells." },
    op: { type: "enum", values: MEASURE_OPS, default: "sum", description: "How several rows landing in one cell are combined." },
    fill: { type: "any", description: "Value for cells with no data. Left out, empty cells are left out of the row." },
  },
  apply(rows, step) {
    const { row, column, value, op = "sum", fill } = step as unknown as PivotStep;
    const columns: string[] = [];
    const groups = new Map<string, { key: unknown; cells: Map<string, Row[]> }>();
    for (const item of rows) {
      const id = JSON.stringify(item[row]);
      const name = String(item[column]);
      if (!columns.includes(name)) columns.push(name);
      let group = groups.get(id);
      if (!group) groups.set(id, (group = { key: item[row], cells: new Map() }));
      const cell = group.cells.get(name);
      if (cell) cell.push(item);
      else group.cells.set(name, [item]);
    }
    return [...groups.values()].map((group) => {
      const out: Row = { [row]: group.key };
      for (const name of columns) {
        const cell = group.cells.get(name);
        if (cell) out[name] = summarize(cell, { op, field: value });
        else if (fill !== undefined) out[name] = fill;
      }
      return out;
    });
  },
};

const calc: TransformBlock = {
  type: "calc",
  description: "Adds a field computed from two fields, or a field and a number. Division by zero gives null.",
  options: {
    as: { type: "string", required: true, description: "Name of the new field." },
    op: { type: "enum", values: CALC_OPS, required: true, description: "Arithmetic to apply: left op right." },
    left: { type: "any", required: true, description: "Field name or number." },
    right: { type: "any", required: true, description: "Field name or number." },
  },
  apply(rows, step) {
    const { as, op, left, right } = step as unknown as CalcStep;
    const operand = (row: Row, side: string | number) => (typeof side === "number" ? side : toNumber(row[side]));
    return rows.map((row) => {
      const a = operand(row, left);
      const b = operand(row, right);
      let result: number | null = null;
      if (a !== null && b !== null) {
        if (op === "add") result = a + b;
        else if (op === "subtract") result = a - b;
        else if (op === "multiply") result = a * b;
        else result = b === 0 ? null : a / b;
      }
      return { ...row, [as]: result };
    });
  },
};

/** `{ type: "bin", field, bins?, as? }`: one row per value band of a field, with its count. */
export interface BinStep {
  type: "bin";
  field: string;
  bins?: number;
  as?: string;
}

const bin: TransformBlock = {
  type: "bin",
  description: "Cuts a numeric field into bands on round edges and returns one row per band: the band's start under the field's own name (so its format still applies), its end as <field>End, and how many rows fell in it. Feeds a bar, table or hbar with a distribution.",
  options: {
    field: { type: "field", required: true, description: "Numeric field to cut into bands. Rows without a number are left out." },
    bins: { type: "number", description: "About how many bands; edges snap to round numbers, so the count can differ. Defaults to Sturges' rule (1 + log2 of the row count)." },
    as: { type: "string", default: "count", description: "Name of the count field." },
  },
  validate(step) {
    const bins = step.bins;
    return bins === undefined || (typeof bins === "number" && Number.isInteger(bins) && bins >= 1) ? [] : ["bins must be a whole number of at least 1."];
  },
  apply(rows, step) {
    const { field, bins, as = "count" } = step as unknown as BinStep;
    const values = rows.map((row) => toNumber(row[field])).filter((n): n is number => n !== null);
    return binValues(values, bins ?? sturges(values.length)).map((band) => ({ [field]: band.start, [`${field}End`]: band.end, [as]: band.count }));
  },
};

/**
 * `{ type: "rag", rules: [{ field, as?, green, amber, goodWhen? }], overall? }`: turns numbers into Red, Amber and Green
 * statuses against thresholds, one status column per rule, and optionally the worst of them in one overall column.
 */
const rag: TransformBlock = {
  type: "rag",
  description:
    "Turns numbers into RAG statuses (R, A, G, or N for no data) against thresholds: one status column per rule, named <field>Rag unless as says otherwise, and optionally an overall column holding the worst of them. With goodWhen up (the default) a value at or past green is G, at or past amber is A, and lower is R; with goodWhen down, less is better.",
  options: {
    rules: {
      type: "array",
      required: true,
      description: 'One rule per measure: { "field": "nps", "green": 40, "amber": 20 } or, when less is better, { "field": "daysSinceContact", "green": 30, "amber": 60, "goodWhen": "down", "as": "contact" }.',
    },
    overall: { type: "string", description: "Name of a column holding the worst status of all the rules: the row's overall RAG." },
  },
  validate: (step) => ragStepProblems(step),
  apply: (rows, step) => applyRag(rows, step as unknown as RagStep) as Row[],
};

export const builtinTransforms: TransformBlock[] = [filter, sort, limit, aggregate, pivot, calc, bin, rag];
