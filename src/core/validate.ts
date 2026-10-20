/**
 * Checks a spec before it is drawn or saved, with messages written to say how to fix the problem.
 *
 * @module
 */
import { readNumber } from "./formats.ts";
import { isPlainObject } from "./fork.ts";
import { HEADLINE_OPTIONS } from "./headline.ts";
import { getPalette, paletteNames, resolvePalette } from "./palettes.ts";
import { getPreset, presetNames } from "./presets.ts";
import { getBlock, UnknownBlockError } from "./registry.ts";
import { templateRefs } from "./template.ts";
import type { Block, BlockKind, OptionSchema } from "./registry.ts";
import type { Issue, Row } from "./types.ts";

/**
 * Validates a widget spec against the registered blocks.
 *
 * Errors mean the widget cannot render. Warnings point at likely mistakes
 * that do not stop it, such as a view field missing from the data. Pass
 * `rows` (the pipeline output) to get those data-aware warnings.
 *
 * @returns Every issue found, errors and warnings, in spec order. Empty when all is well.
 *
 * @example
 * const issues = validateSpec(spec);
 * if (hasErrors(issues)) console.error(issues);
 */
export function validateSpec(spec: unknown, rows?: Row[]): Issue[] {
  if (!isPlainObject(spec)) {
    return [error("spec", "A widget spec must be an object with at least data and view.")];
  }
  const issues: Issue[] = [];

  if (spec.data === undefined) issues.push(error("data", 'Every widget needs data, for example { "type": "inline", "rows": [] }.'));
  else issues.push(...checkBlock("source", spec.data, "data"));

  if (spec.transform !== undefined) {
    if (!Array.isArray(spec.transform)) issues.push(error("transform", "Must be a list of steps."));
    else spec.transform.forEach((step, i) => issues.push(...checkBlock("transform", step, `transform[${i}]`)));
  }

  if (spec.fields !== undefined) issues.push(...checkFields(spec.fields));

  if (spec.view === undefined) issues.push(error("view", 'Every widget needs a view, for example { "type": "table" }.'));
  else issues.push(...checkBlock("view", spec.view, "view"));

  if (spec.style !== undefined) issues.push(...checkStyle(spec.style));

  if (spec.facet !== undefined) {
    if (!isPlainObject(spec.facet)) issues.push(error("facet", 'Must be an object such as { "field": "region" }.'));
    else {
      issues.push(...checkOptions(FACET_OPTIONS, spec.facet, "facet"));
      const columns = spec.facet.columns;
      if (typeof columns === "number" && !(Number.isInteger(columns) && columns >= 1)) issues.push(error("facet.columns", "Must be a whole number, 1 or more."));
    }
  }

  if (spec.links !== undefined) {
    const ok = Array.isArray(spec.links) && spec.links.every((link) => isPlainObject(link) && typeof link.label === "string" && typeof link.href === "string");
    if (!ok) issues.push(error("links", 'Must be a list such as [{ "label": "Sales report", "href": "https://example.com/report" }].'));
  }

  if (spec.headline !== undefined) {
    if (!isPlainObject(spec.headline)) issues.push(error("headline", 'Must be an object such as { "value": "revenue" }.'));
    else issues.push(...checkOptions(HEADLINE_OPTIONS, spec.headline, "headline"));
  }

  if (!hasErrors(issues) && isPlainObject(spec.view)) issues.push(...checkSeriesCount(spec.view, spec.style));
  if (rows && isPlainObject(spec.view) && !hasErrors(issues)) {
    issues.push(...checkViewFields(spec.view, rows));
    if (isPlainObject(spec.headline)) issues.push(...checkHeadlineFields(spec.headline, rows));
    if (isPlainObject(spec.facet) && typeof spec.facet.field === "string" && rows.length && !rows.some((row) => (spec.facet as { field: string }).field in row)) {
      const fields = [...new Set(rows.flatMap((row) => Object.keys(row)))].join(", ");
      issues.push({ level: "warning", path: "facet.field", message: `Field "${spec.facet.field}" is not in the data. Fields: ${fields}.` });
    }
    issues.push(...checkTemplates(spec, rows));
    const check = getBlock("view", spec.view.type as string).checkData;
    if (check) for (const message of check(spec.view, rows)) issues.push({ level: "warning", path: "view", message });
  }
  return issues;
}

/** Colors in the default palette. Series past this many would reuse colors. */
export const DEFAULT_PALETTE_SIZE = 8;

function checkSeriesCount(view: Record<string, unknown>, style: unknown): Issue[] {
  if (!Array.isArray(view.y)) return [];
  const colors = (isPlainObject(style) ? resolvePalette(style)?.length : 0) || DEFAULT_PALETTE_SIZE;
  if (view.y.length <= colors) return [];
  return [
    {
      level: "warning",
      path: "view.y",
      message: `${view.y.length} series but only ${colors} colors, so colors would repeat. Fold the smallest series into an "Other" series or split the chart.`,
    },
  ];
}

/** The facet's options, for validation, docs and agents. */
export const FACET_OPTIONS: Record<string, OptionSchema> = {
  field: { type: "field", required: true, description: "Field that splits the rows into one panel per value." },
  columns: { type: "number", description: "Fixed number of columns. Defaults to as many 233px panels as fit." },
  shared: { type: "boolean", default: true, description: "Give every panel the same value scale, so panels compare honestly." },
};

/** True when any issue is an error. */
export function hasErrors(issues: Issue[]): boolean {
  return issues.some((issue) => issue.level === "error");
}

function error(path: string, message: string): Issue {
  return { level: "error", path, message };
}

function checkBlock(kind: BlockKind, value: unknown, path: string): Issue[] {
  if (!isPlainObject(value) || typeof value.type !== "string") {
    return [error(`${path}.type`, `Required. Name the ${kind === "source" ? "data source" : kind} to use, as { "type": "..." }.`)];
  }
  let block: Block;
  try {
    block = getBlock(kind, value.type);
  } catch (caught) {
    if (caught instanceof UnknownBlockError) return [error(`${path}.type`, caught.message)];
    throw caught;
  }
  const issues = checkOptions(block.options, value, path);
  if (issues.length === 0 && block.validate) {
    for (const message of block.validate(value)) issues.push(error(path, message));
  }
  return issues;
}

function checkOptions(options: Record<string, OptionSchema>, value: Record<string, unknown>, path: string): Issue[] {
  const issues: Issue[] = [];
  for (const [name, schema] of Object.entries(options)) {
    const actual = value[name];
    if (actual === undefined || actual === null) {
      if (schema.required) issues.push(error(`${path}.${name}`, `Required. ${schema.description}`));
      continue;
    }
    const problem = kindProblem(schema, actual);
    if (problem) issues.push(error(`${path}.${name}`, problem));
  }
  return issues;
}

function kindProblem(schema: OptionSchema, value: unknown): string | null {
  switch (schema.type) {
    case "string":
      return typeof value === "string" ? null : "Must be text.";
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? null : "Must be a number.";
    case "boolean":
      return typeof value === "boolean" ? null : "Must be true or false.";
    case "field":
      return typeof value === "string" && value !== "" ? null : "Must be a field name.";
    case "fields":
      return isFieldName(value) || (Array.isArray(value) && value.length > 0 && value.every(isFieldName))
        ? null
        : "Must be a field name or a list of field names.";
    case "enum":
      return schema.values?.includes(value as string) ? null : `Must be one of ${schema.values?.join(", ")}.`;
    case "array":
      return Array.isArray(value) ? null : "Must be a list.";
    case "object":
      return isPlainObject(value) ? null : "Must be an object.";
    case "function":
      return typeof value === "function" ? null : "Must be a function.";
    case "any":
      return null;
  }
}

function isFieldName(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

function checkFields(fields: unknown): Issue[] {
  if (!isPlainObject(fields)) return [error("fields", "Must be an object keyed by field name.")];
  const issues: Issue[] = [];
  for (const [name, field] of Object.entries(fields)) {
    const path = `fields.${name}`;
    if (!isPlainObject(field)) {
      issues.push(error(path, 'Must be an object such as { "label": "Revenue", "format": "currency" }.'));
      continue;
    }
    if (field.label !== undefined && typeof field.label !== "string") issues.push(error(`${path}.label`, "Must be text."));
    if (field.format !== undefined) {
      const format = typeof field.format === "string" ? { type: field.format } : field.format;
      issues.push(...checkBlock("format", format, `${path}.format`).map((issue) => ({ ...issue, path: issue.path.replace(/\.format\.type$/, ".format") })));
    }
  }
  return issues;
}

function checkStyle(style: unknown): Issue[] {
  if (!isPlainObject(style)) return [error("style", "Must be an object.")];
  const issues: Issue[] = [];
  if (style.preset !== undefined && !(typeof style.preset === "string" && getPreset(style.preset))) {
    issues.push(error("style.preset", `Unknown preset "${String(style.preset)}". Available: ${presetNames().join(", ")}.`));
  }
  if (style.theme !== undefined && !["auto", "light", "dark"].includes(style.theme as string)) {
    issues.push(error("style.theme", "Must be one of auto, light, dark."));
  }
  if (typeof style.palette === "string") {
    if (!getPalette(style.palette)) issues.push(error("style.palette", `Unknown palette "${style.palette}". Available: ${paletteNames().join(", ")}.`));
  } else if (style.palette !== undefined && !(Array.isArray(style.palette) && style.palette.every((c) => typeof c === "string"))) {
    issues.push(error("style.palette", "Must be a list of CSS colors or a palette name."));
  }
  if (style.tokens !== undefined && !isPlainObject(style.tokens)) issues.push(error("style.tokens", "Must be an object of color roles."));
  if (style.density !== undefined && !["comfortable", "compact"].includes(style.density as string)) {
    issues.push(error("style.density", "Must be one of comfortable, compact."));
  }
  if (style.height !== undefined && !(typeof style.height === "number" && style.height > 0)) {
    issues.push(error("style.height", "Must be a positive number of pixels."));
  }
  return issues;
}

/** Text templates ({last:month}) naming fields that are not in the rows. */
function checkTemplates(spec: Record<string, unknown>, rows: Row[]): Issue[] {
  if (rows.length === 0) return [];
  const present = new Set(rows.flatMap((row) => Object.keys(row)));
  const texts: [string, unknown][] = [
    ["title", spec.title],
    ["subtitle", spec.subtitle],
    ["footer", spec.footer],
    ["headline.caption", isPlainObject(spec.headline) ? spec.headline.caption : undefined],
  ];
  return texts.flatMap(([path, text]) =>
    typeof text === "string"
      ? templateRefs(text)
          .filter((ref) => !present.has(ref.field))
          .map((ref): Issue => ({ level: "warning", path, message: `${ref.token} names a field not in the data. Fields: ${[...present].join(", ")}.` }))
      : [],
  );
}

function checkHeadlineFields(headline: Record<string, unknown>, rows: Row[]): Issue[] {
  if (rows.length === 0) return [];
  const present = new Set(rows.flatMap((row) => Object.keys(row)));
  const issues: Issue[] = [];
  for (const name of ["value", "compare"]) {
    const field = headline[name];
    if (typeof field !== "string" || field === "previous" || present.has(field)) continue;
    issues.push({ level: "warning", path: `headline.${name}`, message: `Field "${field}" is not in the data. Fields: ${[...present].join(", ")}.` });
  }
  return issues;
}

function checkViewFields(view: Record<string, unknown>, rows: Row[]): Issue[] {
  if (typeof view.type !== "string" || rows.length === 0) return [];
  const present = new Set(rows.flatMap((row) => Object.keys(row)));
  const known = [...present].join(", ");
  const issues: Issue[] = [];
  for (const [name, schema] of Object.entries(getBlock("view", view.type).options)) {
    if (schema.type !== "field" && schema.type !== "fields") continue;
    const value = view[name];
    const names = typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
    for (const field of names) {
      if (!present.has(field)) {
        issues.push({ level: "warning", path: `view.${name}`, message: `Field "${field}" is not in the data. Fields: ${known}.` });
      } else if (schema.kind === "number" && !rows.some((row) => readNumber(row[field]) !== null)) {
        const numeric = [...present].filter((key) => rows.some((row) => readNumber(row[key]) !== null));
        const hint = numeric.length ? ` Number fields: ${numeric.join(", ")}.` : "";
        issues.push({ level: "warning", path: `view.${name}`, message: `Field "${field}" holds no numbers, but this option needs a numeric field.${hint}` });
      }
    }
  }
  return issues;
}
