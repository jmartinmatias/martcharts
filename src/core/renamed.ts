/**
 * Old option names. A view block lists the names it has retired in
 * `renamed`; `upgradeView` moves them to the current names, so renderers,
 * explanations and questions read only the current names, and
 * `validateSpec` reports each old name once, as a warning.
 *
 * @module
 */
import { isPlainObject } from "./fork.ts";
import { getBlock, hasBlock } from "./registry.ts";
import type { RenamedOption } from "./registry.ts";
import type { Issue, ViewSpec, WidgetSpec } from "./types.ts";

/** One old name found in a view. */
export interface Rename {
  /** Path of the old option, for example `view.label` or `view.items[0].label`. */
  path: string;
  /** Path of the option that now holds its value (the old path itself when the new name was already set). */
  to: string;
  /** The issue `validateSpec` reports for it. */
  issue: Issue;
}

/**
 * The view with every old option name moved to its current name, and a note
 * per old name. When both the old and the new name are set, the new one wins
 * and the old one is dropped. Returns the same object when nothing changed.
 */
export function upgradeView<V>(view: V, path = "view"): { view: V; renames: Rename[] } {
  if (!isPlainObject(view) || typeof view.type !== "string" || !hasBlock("view", view.type)) return { view, renames: [] };
  const renamed = getBlock("view", view.type).renamed;
  if (!renamed) return { view, renames: [] };
  const renames: Rename[] = [];
  let out: Record<string, unknown> = view;
  for (const [old, rule] of Object.entries(renamed)) {
    const nested = /^(\w+)\[\]\.(\w+)$/.exec(old);
    if (nested) {
      const [, list, key] = nested as unknown as [string, string, string];
      const entries = out[list];
      if (!Array.isArray(entries)) continue;
      let changed = false;
      const next = entries.map((entry, i) => {
        const moved = move(entry, key, rule, `${path}.${list}[${i}]`);
        if (!moved) return entry;
        changed = true;
        renames.push(moved.rename);
        return moved.value;
      });
      if (changed) out = { ...out, [list]: next };
      continue;
    }
    const moved = move(out, old, rule, path);
    if (!moved) continue;
    renames.push(moved.rename);
    out = moved.value;
  }
  return { view: out as V, renames };
}

/** The spec with its view upgraded. Returns the same object when nothing changed. */
export function upgradeSpec<S extends WidgetSpec>(spec: S): S {
  const { view, renames } = upgradeView(spec.view);
  return renames.length ? { ...spec, view: view as ViewSpec } : spec;
}

function move(target: unknown, old: string, rule: RenamedOption, path: string): { value: Record<string, unknown>; rename: Rename } | null {
  if (!isPlainObject(target)) return null;
  const value = target[old];
  if (value === undefined || value === null || (rule.when && !rule.when(value))) return null;
  const at = `${path}.${old}`;
  const to = `${path}.${rule.use}`;
  const next: Record<string, unknown> = { ...target };
  if (rule.use === old) {
    next[old] = rule.convert ? rule.convert(value) : value;
    return { value: next, rename: { path: at, to, issue: warn(at, `Deprecated form: write ${JSON.stringify(next[old])}. This form still works for now.`) } };
  }
  delete next[old];
  const both = next[rule.use] !== undefined && next[rule.use] !== null;
  if (!both) next[rule.use] = rule.convert ? rule.convert(value) : value;
  const message = both
    ? `Deprecated name of ${rule.use}, which is also set, so ${old} is ignored. Remove ${old}.`
    : `Deprecated: write ${rule.use} instead of ${old}. The old name still works for now.`;
  return { value: next, rename: { path: at, to: both ? at : to, issue: warn(at, message) } };
}

function warn(path: string, message: string): Issue {
  return { level: "warning", path, message };
}
