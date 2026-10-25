/**
 * One name per concept, one concept per name. The registry, the renderers, the reading layers and every stored spec
 * speak the canonical names; the older spellings below are the only place the old names live, and they still work.
 *
 * Normalizing goes one way, toward the canonical names everything reads:
 * `normalizeView({ type: "dot", label: "p", values: ["a", "b"] })` gives `{ type: "dot", label: "p", value: ["a", "b"] }`.
 * Validation reads the spec as written, so it can say once, per spec, that an older name is now called something else.
 *
 * What the names mean, everywhere they appear:
 * - `value`: the measure, one field or a list (dot, strips and likert used `values`, `parts` and `responses`).
 * - `color`: the field that colors by category (scatter used `series`, the locator `kind`).
 * - `flag`: a yes/no field (the matrix used `mark`).
 * - `mark`: how each item is drawn, one style for all of them: bar or lollipop on bar and hbar, range or arrow on dumbbell.
 * - `panels`: what each panel of a dual chart draws (it was `marks`, which read like `mark`).
 * - `labels`: names written beside the marks, true or false (scatter). Pie, line and choropleth used `labels` for three
 *   other things, now each its own name: pie `labelPlace` (inside, outside, legend), line `peaks` (true marks the
 *   highest and lowest point) and choropleth `codes` (true writes each region's code).
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
  /** The name to write, and the one everything reads. */
  canonical: string;
  /** The older spelling, which still works and earns one "now called" warning per spec. */
  legacy: string;
  /** Turns a value written under the older name into the canonical one, when the two differ in kind. */
  toCanonical?(value: unknown): unknown;
  /** Turns a canonical value back into the older form, for hosts that still read the older name. */
  toLegacy?(value: unknown): unknown;
}

/** Every renamed option. The concept table above, and in docs/blocks.md, says why each name. */
export const OPTION_ALIASES: readonly OptionAlias[] = [
  { view: "dot", canonical: "value", legacy: "values" },
  { view: "strips", canonical: "value", legacy: "parts" },
  { view: "likert", canonical: "value", legacy: "responses" },
  { view: "scatter", canonical: "color", legacy: "series" },
  { view: "locator", canonical: "color", legacy: "kind" },
  { view: "matrix", canonical: "flag", legacy: "mark" },
  { view: "dual", canonical: "panels", legacy: "marks" },
  { view: "pie", canonical: "labelPlace", legacy: "labels" },
  {
    view: "line",
    canonical: "peaks",
    legacy: "labels",
    toCanonical: (value) => value === "peaks" || value === true,
    toLegacy: (value) => (value === true ? "peaks" : "none"),
  },
  {
    view: "choropleth",
    canonical: "codes",
    legacy: "labels",
    toCanonical: (value) => !(value === false || value === "none"),
    toLegacy: (value) => value !== false,
  },
];

/** The aliases of one view. */
export function aliasesOf(view: string): OptionAlias[] {
  return OPTION_ALIASES.filter((alias) => alias.view === view);
}

/** A view as written: the canonical names it used, and the older ones. */
export interface AliasUse {
  /** Canonical names written, as `[canonical, legacy]`. */
  canonical: [string, string][];
  /** Older names written, as `[legacy, canonical]`. */
  deprecated: [string, string][];
}

/** Which renamed options a view uses, and how it spells them. */
export function aliasUse(view: Record<string, unknown>): AliasUse {
  const use: AliasUse = { canonical: [], deprecated: [] };
  if (typeof view.type !== "string") return use;
  for (const alias of aliasesOf(view.type)) {
    if (view[alias.canonical] !== undefined) use.canonical.push([alias.canonical, alias.legacy]);
    else if (view[alias.legacy] !== undefined) use.deprecated.push([alias.legacy, alias.canonical]);
  }
  return use;
}

/**
 * The view in canonical names, as the registry, the renderers and the reading layers read it: each older name moved
 * onto its canonical one, its value converted where the kinds differ. A canonical name already present wins, so
 * nothing written is lost. Returns the same object when nothing changes. Never touches other keys.
 */
export function normalizeView<V extends { type: string }>(view: V): V {
  if (!view || typeof view !== "object" || typeof view.type !== "string") return view;
  const aliases = aliasesOf(view.type);
  if (aliases.length === 0) return view;
  let out: Record<string, unknown> | undefined;
  const source = view as unknown as Record<string, unknown>;
  for (const alias of aliases) {
    const value = source[alias.legacy];
    if (value === undefined) continue;
    out ??= { ...source };
    if (out[alias.canonical] === undefined) out[alias.canonical] = alias.toCanonical ? alias.toCanonical(value) : value;
    delete out[alias.legacy];
  }
  return (out ?? view) as unknown as V;
}

/** The canonical name of one of a view's options, as docs and agents should show it. */
export function canonicalName(view: string, option: string): string {
  return aliasesOf(view).find((alias) => alias.legacy === option)?.canonical ?? option;
}
