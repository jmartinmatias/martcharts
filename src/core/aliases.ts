/**
 * One name per concept. Across views the same idea used to go by several option names: the measure was `value`,
 * `values`, `parts` or `responses`; color by category was `color`, `series` or `kind`. A spec may now use the
 * canonical name everywhere, and the older name still works.
 *
 * Normalizing goes one way, toward the names each renderer reads, so no renderer changes:
 * `normalizeView({ type: "dot", label: "p", value: ["a", "b"] })` gives `{ type: "dot", label: "p", values: ["a", "b"] }`.
 * Validation reads the spec as written, so it can say once, per spec, that an older name is now called something else.
 *
 * The one name kept on purpose in two senses is `target`: a goal on bullet, meter, variance and the KPI views, and
 * the destination of a flow on sankey and chord. Both are long published, both read naturally where they appear,
 * and the views never meet in one spec, so renaming either would break specs for no clarity gained.
 *
 * @module
 */

/** One renamed option on one view. */
export interface OptionAlias {
  view: string;
  /** The name to write from now on. */
  canonical: string;
  /** The name the renderer reads, and the older spelling that still works. */
  legacy: string;
  /** Turns a canonical value into what the renderer reads, when the two differ in kind (choropleth labels). */
  toLegacy?(value: unknown): unknown;
  /** True when the legacy spelling earns a "now called" warning. Values only renamed, never retired, stay quiet. */
  deprecated: boolean;
}

/** Every renamed option. Canonical names follow the concept table in docs/blocks.md. */
export const OPTION_ALIASES: readonly OptionAlias[] = [
  // The measure or measures per row is `value`, one field or a list, on every view.
  { view: "dot", canonical: "value", legacy: "values", deprecated: true },
  { view: "strips", canonical: "value", legacy: "parts", deprecated: true },
  { view: "likert", canonical: "value", legacy: "responses", deprecated: true },
  // Color by category is `color`.
  { view: "scatter", canonical: "color", legacy: "series", deprecated: true },
  { view: "locator", canonical: "color", legacy: "kind", deprecated: true },
  // A yes/no field is `flag`; `mark` stays the drawing style (bar, hbar, dumbbell).
  { view: "matrix", canonical: "flag", legacy: "mark", deprecated: true },
  // Labels take a word everywhere, "none" to turn them off: choropleth's true and false become "codes" and "none".
  {
    view: "choropleth",
    canonical: "labels",
    legacy: "labels",
    deprecated: false,
    toLegacy: (value) => (value === "none" ? false : value === "codes" ? true : value),
  },
];

/** The aliases of one view. */
export function aliasesOf(view: string): OptionAlias[] {
  return OPTION_ALIASES.filter((alias) => alias.view === view);
}

/** A view as written: the canonical names it used, and the deprecated ones. */
export interface AliasUse {
  /** Canonical names written in place of the renderer's, as `[canonical, legacy]`. */
  canonical: [string, string][];
  /** Deprecated legacy names written, as `[legacy, canonical]`. */
  deprecated: [string, string][];
}

/** Which renamed options a view uses, and how it spells them. */
export function aliasUse(view: Record<string, unknown>): AliasUse {
  const use: AliasUse = { canonical: [], deprecated: [] };
  if (typeof view.type !== "string") return use;
  for (const alias of aliasesOf(view.type)) {
    if (alias.canonical === alias.legacy) {
      // Same name, a new kind of value: a boolean on choropleth labels is the older form.
      if (typeof view[alias.canonical] === "boolean" && alias.deprecated) use.deprecated.push([alias.legacy, alias.canonical]);
      continue;
    }
    if (view[alias.canonical] !== undefined) use.canonical.push([alias.canonical, alias.legacy]);
    else if (view[alias.legacy] !== undefined && alias.deprecated) use.deprecated.push([alias.legacy, alias.canonical]);
  }
  return use;
}

/**
 * The view as its renderer reads it: canonical names moved onto the renderer's names, values converted where the
 * kinds differ. A legacy name already present wins over a canonical one, so nothing written is lost. Returns the
 * same object when nothing changes. Never touches other keys.
 */
export function normalizeView<V extends { type: string }>(view: V): V {
  if (!view || typeof view !== "object" || typeof view.type !== "string") return view;
  const aliases = aliasesOf(view.type);
  if (aliases.length === 0) return view;
  let out: Record<string, unknown> | undefined;
  const source = view as unknown as Record<string, unknown>;
  for (const alias of aliases) {
    const value = source[alias.canonical];
    if (value === undefined) continue;
    const converted = alias.toLegacy ? alias.toLegacy(value) : value;
    if (alias.canonical === alias.legacy) {
      if (converted === value) continue;
      out ??= { ...source };
      out[alias.legacy] = converted;
      continue;
    }
    out ??= { ...source };
    if (out[alias.legacy] === undefined) out[alias.legacy] = converted;
    delete out[alias.canonical];
  }
  return (out ?? view) as unknown as V;
}

/** The canonical name of one of a view's options, as docs and agents should show it. */
export function canonicalName(view: string, option: string): string {
  return aliasesOf(view).find((alias) => alias.legacy === option)?.canonical ?? option;
}
