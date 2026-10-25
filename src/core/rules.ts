/**
 * Rules on rows: one matcher shared by colour rules (`spec.colorRules`) and highlight by number (`view.highlight` as
 * `{ field, op, value }` or `{ top }`). No DOM: the same rules validate in Node and decide colours in the browser.
 *
 * A rule names a field, a comparison and a value: `{ field: "revenue", op: ">", value: 1000000 }`. Leave the field
 * out and the rule reads the mark's own category, as in `{ op: "==", value: "Late" }`.
 *
 * @module
 */
import { readNumber } from "./formats.ts";
import type { Row } from "./types.ts";

/** The comparisons a rule can make. */
export const RULE_OPS = [">", ">=", "<", "<=", "==", "!=", "in", "not in"] as const;
export type RuleOp = (typeof RULE_OPS)[number];

/** A test on one row. */
export interface ValueRule {
  /** Field the rule reads. Left out, the rule reads the mark's own category. */
  field?: string;
  op: RuleOp;
  /** What the field is compared with: a number or text, or a list of them for `in` and `not in`. */
  value: unknown;
}

/** A colour for every mark whose row matches. The first matching rule wins. */
export interface ColorRule extends ValueRule {
  /** A CSS colour, or one of the theme's own: up, down, accent, muted. */
  color: string;
  /** The rule in words, for the key. Left out, the key says it from the rule ("Revenue above €1M"). */
  label?: string;
}

/** Highlight by number: the marks whose rows match, or the top N by a measure, stay in colour. */
export type HighlightRule = ValueRule | { top: number; field?: string; order?: "desc" | "asc" };

/** The theme's own colours, by name: a rule can say "down" and wear the theme's down colour, light or dark. */
export const THEME_COLORS: Readonly<Record<string, string>> = {
  up: "var(--fft-up)",
  down: "var(--fft-down)",
  good: "var(--fft-up)",
  bad: "var(--fft-down)",
  accent: "var(--fft-accent)",
  muted: "var(--fft-muted)",
};

/** A rule colour as CSS: a theme colour by name, else the colour as written. */
export function ruleColor(color: string): string {
  return THEME_COLORS[color.trim().toLowerCase()] ?? color.trim();
}

/** A colour safe to put in a style: a hex, a named colour, or a colour function, never a url() or anything that ends the declaration. */
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|[a-z]+|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|var)\([^;{}<>"'\\]*\))$/i;

function same(a: unknown, b: unknown): boolean {
  const [x, y] = [readNumber(a), readNumber(b)];
  if (x !== null && y !== null && typeof a !== "boolean" && typeof b !== "boolean") return x === y;
  return String(a) === String(b);
}

/**
 * Whether a row matches a rule. `category` is the field a rule with no field reads (the view's category option).
 * Numbers compare as numbers; `==` and `!=` compare text otherwise; a missing value never matches a comparison.
 */
export function matchRule(rule: ValueRule, row: Row, category?: string): boolean {
  const field = rule.field ?? category;
  if (!field) return false;
  const value = row[field];
  const list = Array.isArray(rule.value) ? rule.value : [rule.value];
  switch (rule.op) {
    case "==":
      return value !== null && value !== undefined && same(value, rule.value);
    case "!=":
      return !(value !== null && value !== undefined && same(value, rule.value));
    case "in":
      return list.some((item) => same(value, item));
    case "not in":
      return !list.some((item) => same(value, item));
    default: {
      const [x, y] = [readNumber(value), readNumber(rule.value)];
      if (x === null || y === null) return false;
      return rule.op === ">" ? x > y : rule.op === ">=" ? x >= y : rule.op === "<" ? x < y : x <= y;
    }
  }
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** What is wrong with one rule, as messages. */
export function ruleProblems(rule: unknown, path: string): string[] {
  if (!isObject(rule)) return [`${path} must be an object such as { "field": "revenue", "op": ">", "value": 1000000 }.`];
  const problems: string[] = [];
  if (rule.field !== undefined && (typeof rule.field !== "string" || rule.field === "")) problems.push(`${path}.field must name a field.`);
  if (!RULE_OPS.includes(rule.op as RuleOp)) problems.push(`${path}.op must be one of ${RULE_OPS.join(", ")}.`);
  if (!("value" in rule)) problems.push(`${path}.value is missing: what the field is compared with.`);
  else if ((rule.op === "in" || rule.op === "not in") && !Array.isArray(rule.value)) problems.push(`${path}.value must be a list for "${String(rule.op)}".`);
  else if ([">", ">=", "<", "<="].includes(String(rule.op)) && readNumber(rule.value) === null) problems.push(`${path}.value must be a number for "${String(rule.op)}".`);
  return problems;
}

/** What is wrong with `colorRules`, as messages. */
export function colorRuleProblems(rules: unknown): string[] {
  if (!Array.isArray(rules)) return ['colorRules must be a list such as [{ "field": "revenue", "op": "<", "value": 0, "color": "down" }].'];
  return rules.flatMap((rule, i) => {
    const path = `colorRules[${i}]`;
    const problems = ruleProblems(rule, path);
    if (!isObject(rule)) return problems;
    if (typeof rule.color !== "string" || rule.color.trim() === "") problems.push(`${path}.color is missing: a CSS colour, or up, down, accent or muted.`);
    else if (!(rule.color.trim().toLowerCase() in THEME_COLORS) && !SAFE_COLOR.test(rule.color.trim())) problems.push(`${path}.color "${rule.color}" is not a colour: use a hex such as #c03a2b, a colour name or function, or up, down, accent or muted.`);
    if (rule.label !== undefined && typeof rule.label !== "string") problems.push(`${path}.label must be text.`);
    return problems;
  });
}

/** True for a highlight given as a rule (`{ field, op, value }` or `{ top }`) rather than names. */
export function isHighlightRule(value: unknown): value is HighlightRule {
  return isObject(value) && ("op" in value || "top" in value);
}

/** What is wrong with a highlight rule, as messages. */
export function highlightRuleProblems(value: unknown): string[] {
  if (!isHighlightRule(value)) return [];
  if ("top" in value) {
    const top = (value as { top?: unknown }).top;
    const problems = typeof top === "number" && Number.isInteger(top) && top > 0 ? [] : ["highlight.top must be a whole number, 1 or more."];
    const order = (value as { order?: unknown }).order;
    if (order !== undefined && order !== "desc" && order !== "asc") problems.push('highlight.order must be "desc" or "asc".');
    return problems;
  }
  return ruleProblems(value, "highlight");
}

/**
 * The category values a highlight rule picks out of the rows, as the names `highlight` takes: the categories whose
 * rows match, or the top N by a measure (the first number field when none is named). `category` is the field that
 * names each mark.
 */
export function highlightedNames(rule: HighlightRule, rows: Row[], category: string): string[] {
  const names = (picked: Row[]) => [...new Set(picked.map((row) => String(row[category])))];
  if ("top" in rule) {
    const measure = rule.field ?? Object.keys(rows[0] ?? {}).find((key) => key !== category && rows.some((row) => typeof row[key] === "number"));
    if (!measure) return [];
    const ranked = rows.filter((row) => readNumber(row[measure]) !== null).sort((a, b) => ((readNumber(b[measure]) as number) - (readNumber(a[measure]) as number)) * (rule.order === "asc" ? -1 : 1));
    return names(ranked.slice(0, Math.max(0, Math.floor(rule.top))));
  }
  return names(rows.filter((row) => matchRule(rule, row, category)));
}

/** The colour of each category value under the rules: the first rule a row of that category matches. */
export function ruleColors(rules: readonly ColorRule[], rows: Row[], category: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const row of rows) {
    const key = category ? String(row[category]) : "";
    if (!category || out.has(key)) continue;
    const rule = rules.find((r) => matchRule(r, row, category));
    if (rule) out.set(key, ruleColor(rule.color));
  }
  return out;
}

/** The colour of one row under the rules: the first rule it matches, or undefined. */
export function rowRuleColor(rules: readonly ColorRule[], row: Row, category?: string): string | undefined {
  const rule = rules.find((r) => matchRule(r, row, category));
  return rule ? ruleColor(rule.color) : undefined;
}
