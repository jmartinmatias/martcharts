/**
 * The option contract for the layers that read and write specs in words: the reading guide, the question, the chart
 * guide and switches, the recommender, `suggestView` and the Taller. Everything reads and writes canonical names
 * (dot `value`, scatter `color`, matrix `flag`, pie `labelPlace`, line `peaks`, choropleth `codes`, dual `panels`);
 * a spec written with an older name reads the same.
 *
 * - `readable(spec)`: the spec with its view in canonical names, as every text layer and renderer reads it.
 * - `canonicalView(view)` and `canonicalSpec(spec)`: the same move, for what these layers write and show.
 *
 * @module
 */
import { aliasesOf, canonicalName, normalizeView } from "./aliases.ts";
import type { ViewSpec, WidgetSpec } from "./types.ts";

/** The spec with its view in canonical names. The same object when nothing changes. */
export function readable<S extends WidgetSpec>(spec: S): S {
  if (!spec || typeof spec !== "object" || !spec.view) return spec;
  const view = normalizeView(spec.view);
  return view === spec.view ? spec : { ...spec, view };
}

/** The view in canonical names: each older name written under its canonical one. The same object when nothing changes. */
export function canonicalView<V extends ViewSpec>(view: V): V {
  return normalizeView(view);
}

/** The spec with its view in canonical names. The same object when nothing changes. */
export function canonicalSpec<S extends WidgetSpec>(spec: S): S {
  return readable(spec);
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
