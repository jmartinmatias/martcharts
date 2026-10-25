/**
 * `martcharts/taller`: the Taller, which makes versions of a chart (another form, colour, emphasis or look), ranks
 * them for an audience, and says in words what each one changes and why. No DOM. See docs/taller.md.
 *
 * @module
 */
export { AUDIENCES, balanceOf, createVariants, fillsOf, huePalette, meaningOf, MOVES, noveltyOf, plainTags, PRINCIPLES, profileData, qualitiesOf, QUALITIES, rankVariants } from "./core/taller.ts";
export { explainVariant } from "./core/taller-explain.ts";
export type { Audience, Balance, ColorEmphasis, DataProfile, Lineage, Look, Marks, Move, Principle, Qualities, Quality, TallerOptions, Variant } from "./core/taller.ts";
