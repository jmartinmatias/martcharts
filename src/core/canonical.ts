/**
 * Both directions of the option contract, for the layers that read and write specs in words: the reading guide, the
 * question, the chart guide and switches, the recommender, `suggestView` and the Taller.
 *
 * - `readable(spec)` takes a spec as written, canonical names or older ones, and gives the view as its renderer
 *   reads it (`normalizeView`), so every text layer reads one set of names whatever the spec said.
 * - `canonicalView(view)` goes the other way: a view in the renderer's names becomes the one to write and show, so
 *   every view these layers make speaks the canonical names (dot `value`, scatter `color`, matrix `flag`).
 *
 * @module
 */
import { aliasesOf, canonicalName, normalizeView } from "./aliases.ts";
import type { ViewSpec, WidgetSpec } from "./types.ts";

/** The spec with its view in the names the renderers (and every text layer) read. The same object when nothing changes. */
export function readable<S extends WidgetSpec>(spec: S): S {
  if (!spec || typeof spec !== "object" || !spec.view) return spec;
  const view = normalizeView(spec.view);
  return view === spec.view ? spec : { ...spec, view };
}

/**
 * The view in canonical names: each renamed option written under its canonical name (dot `values` becomes `value`,
 * locator `kind` becomes `color`). A canonical name already present wins. The same object when nothing changes.
 */
export function canonicalView<V extends ViewSpec>(view: V): V {
  if (!view || typeof view !== "object" || typeof view.type !== "string") return view;
  let out: Record<string, unknown> | undefined;
  const source = view as unknown as Record<string, unknown>;
  for (const alias of aliasesOf(view.type)) {
    if (alias.canonical === alias.legacy || source[alias.legacy] === undefined) continue;
    out ??= { ...source };
    if (out[alias.canonical] === undefined) out[alias.canonical] = out[alias.legacy];
    delete out[alias.legacy];
  }
  return (out ?? view) as unknown as V;
}

/** The spec with its view in canonical names. The same object when nothing changes. */
export function canonicalSpec<S extends WidgetSpec>(spec: S): S {
  if (!spec || typeof spec !== "object" || !spec.view) return spec;
  const view = canonicalView(spec.view);
  return view === spec.view ? spec : { ...spec, view };
}

/** An option's name as people should read it (`values` on a dot plot is `value`). */
export function shownName(view: string, option: string): string {
  return canonicalName(view, option);
}

/** The older names that still work for a view's option, as an "also accepts" note; empty when there are none. */
export function alsoAccepts(view: string, option: string): string[] {
  return aliasesOf(view)
    .filter((alias) => alias.canonical === option && alias.legacy !== option)
    .map((alias) => alias.legacy);
}
