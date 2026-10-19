/**
 * The chart catalog: for each view, what it is, the data it needs and, given an
 * example spec, the question it answers and how to read it. Shared by
 * `npm run catalog` (docs/catalog.md) and the MCP tools `fft_list_charts` and `fft_get_chart`.
 *
 * @module
 */
import { explainChart } from "./explain.ts";
import { questionOf } from "./question.ts";
import { describeBlocks, getBlock } from "./registry.ts";
import type { OptionSchema } from "./registry.ts";
import type { Row, WidgetSpec } from "./types.ts";

/** One field a view reads from each row. */
export interface ChartNeed {
  /** The view option that names the field, such as `x` or `value`. */
  option: string;
  /** What the field holds: `number`, `category`, `date`, or `any`. */
  holds: string;
  /** True when the option takes a list of fields, one per series. */
  many: boolean;
  required: boolean;
  description: string;
}

/** What one view is for and what it needs. */
export interface ChartEntry {
  type: string;
  /** The first sentence of the description: what the chart is. */
  summary: string;
  description: string;
  /** The row fields the view reads, required first. */
  needs: ChartNeed[];
  /** The view's other options (not fields), such as `stacked` or `bins`. */
  settings: string[];
  /** The question the example answers, when an example was given. */
  question?: string;
  /** How to read the example, when an example was given. */
  howToRead?: string;
}

const isField = (option: OptionSchema) => option.type === "field" || option.type === "fields";

/** The first sentence of a description. */
export function firstSentence(text: string): string {
  return (text.match(/^.*?[.!?](\s|$)/)?.[0] ?? text).trim();
}

/**
 * Describes one view. Pass a self-contained example (inline rows) to add the
 * question it answers and how to read it. Throws `UnknownBlockError` for an unknown view.
 */
export function describeChart(type: string, example?: WidgetSpec): ChartEntry {
  const { description, options } = getBlock("view", type);
  const entries = Object.entries(options);
  const needs = entries
    .filter(([, option]) => isField(option))
    .map(([name, option]) => ({ option: name, holds: option.kind ?? "any", many: option.type === "fields", required: option.required === true, description: option.description }))
    .sort((a, b) => Number(b.required) - Number(a.required));
  const entry: ChartEntry = { type, summary: firstSentence(description), description, needs, settings: entries.filter(([, option]) => !isField(option)).map(([name]) => name) };
  const rows = example?.data.type === "inline" ? (example.data.rows as Row[]) : undefined;
  if (example) {
    entry.question = questionOf(example, rows).text;
    entry.howToRead = explainChart(example, rows);
  }
  return entry;
}

/** Every registered view, in registry order. */
export function describeCharts(): ChartEntry[] {
  return describeBlocks("view").map((view) => describeChart(view.type));
}

/** The required fields in one line: "`x` date, `y` number". */
export function needsText(entry: ChartEntry): string {
  return entry.needs.filter((need) => need.required).map((need) => `\`${need.option}\` ${need.holds}${need.many ? " (one or more)" : ""}`).join(", ") || "any rows";
}
