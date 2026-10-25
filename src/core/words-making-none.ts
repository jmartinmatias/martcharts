/**
 * Stands in for words-making.ts in the lite drop-in build, which has no editor or composer: their words are left out.
 *
 * @module
 */
import type { MakingWords } from "./words-making.ts";

const NONE = {} as MakingWords;
export const MAKING_EN = NONE;
export const MAKING_FR = NONE;
export const MAKING_DE = NONE;
