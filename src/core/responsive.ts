/**
 * Breakpoints (`spec.responsive`): on a narrow card, part of the spec changes. A rule
 * `{ maxWidth: 480, override: { view: { limit: 5 } } }` applies on any card narrower than 480px. Rules apply widest
 * first, so the narrowest matching rule has the last word. Only the override's `view` and `style` apply: the data,
 * the words and the fields stay the chart's own at every size.
 *
 * @module
 */
import { fork } from "./fork.ts";
import type { Override } from "./fork.ts";
import type { ResponsiveRule, WidgetSpec } from "./types.ts";

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** The rules that apply at this width, widest first. */
export function activeBreakpoints(rules: readonly ResponsiveRule[] | undefined, width: number): ResponsiveRule[] {
  if (!Array.isArray(rules)) return [];
  return rules.filter((rule) => isObject(rule) && typeof rule.maxWidth === "number" && width < rule.maxWidth).sort((a, b) => b.maxWidth - a.maxWidth);
}

/** A key for the rules that apply at a width, so a card redraws its view only when a breakpoint is crossed. */
export function breakpointKey(rules: readonly ResponsiveRule[] | undefined, width: number): string {
  return activeBreakpoints(rules, width)
    .map((rule) => rule.maxWidth)
    .join(",");
}

/** The spec as drawn at this width: each matching rule's `view` and `style` merged in, widest first. */
export function atWidth(spec: WidgetSpec, width: number): WidgetSpec {
  const active = activeBreakpoints(spec.responsive, width);
  if (!active.length) return spec;
  return active.reduce<WidgetSpec>((out, rule) => {
    const patch: Record<string, unknown> = {};
    if (isObject(rule.override?.view)) patch.view = rule.override.view;
    if (isObject(rule.override?.style)) patch.style = rule.override.style;
    return fork(out, patch as Override<WidgetSpec>);
  }, spec);
}

/** What is wrong with `responsive`, as messages with their paths. */
export function responsiveProblems(rules: unknown): { path: string; message: string; level: "error" | "warning" }[] {
  if (!Array.isArray(rules)) return [{ path: "responsive", level: "error", message: 'Must be a list such as [{ "maxWidth": 480, "override": { "view": { "limit": 5 } } }].' }];
  return rules.flatMap((rule, i) => {
    const path = `responsive[${i}]`;
    if (!isObject(rule)) return [{ path, level: "error" as const, message: 'Must be an object with maxWidth and override, such as { "maxWidth": 480, "override": { "view": { "labels": false } } }.' }];
    const problems: { path: string; message: string; level: "error" | "warning" }[] = [];
    if (typeof rule.maxWidth !== "number" || !(rule.maxWidth > 0)) problems.push({ path: `${path}.maxWidth`, level: "error", message: "Must be a width in pixels, more than 0." });
    if (!isObject(rule.override)) problems.push({ path: `${path}.override`, level: "error", message: 'Must be an object with view or style, such as { "view": { "limit": 5 } }.' });
    else {
      for (const key of Object.keys(rule.override)) if (key !== "view" && key !== "style") problems.push({ path: `${path}.override.${key}`, level: "warning", message: "Only view and style change with the width; this key is ignored." });
      if (rule.override.view !== undefined && !isObject(rule.override.view)) problems.push({ path: `${path}.override.view`, level: "error", message: "Must be an object of view options." });
      if (rule.override.style !== undefined && !isObject(rule.override.style)) problems.push({ path: `${path}.override.style`, level: "error", message: "Must be an object of style options." });
    }
    return problems;
  });
}
