/**
 * The outcomes view's reading: a forecast's many possible results (simulation runs, scenarios) cut into a few equally
 * likely ones, the quantiles a quantile dot plot draws, and how many of them reach a target. Twenty dots read as
 * chances anyone can count: 7 of 20 past the line is a 35% chance, said without a percentage to interpret.
 *
 * @module
 */
import { readNumber } from "./formats.ts";
import type { Row } from "./types.ts";

/** How many dots an outcomes view draws by default: twenty, so each is a 5% chance. */
export const OUTCOME_DOTS = 20;

/** The value at share `p` (0 to 1) of sorted numbers, interpolated between neighbours. */
function at(sorted: number[], p: number): number {
  if (!sorted.length) return Number.NaN;
  const i = Math.max(0, Math.min(sorted.length - 1, p * (sorted.length - 1)));
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return (sorted[lo] as number) + ((sorted[hi] as number) - (sorted[lo] as number)) * (i - lo);
}

/** The numbers of `field` in `rows`, sorted, with the missing ones left out. */
export function outcomeValues(rows: Row[], field: string): number[] {
  return rows.map((row) => readNumber(row[field])).filter((n): n is number => n !== null).sort((a, b) => a - b);
}

/** `n` equally likely outcomes: the values at the middle of each nth of the runs, lowest first. */
export function quantileDots(sorted: number[], n = OUTCOME_DOTS): number[] {
  return sorted.length ? Array.from({ length: n }, (_, i) => at(sorted, (i + 0.5) / n)) : [];
}

/** What the dots say: how many reach the target (on its good side), and the middle half of all the runs. */
export function outcomeOdds(sorted: number[], dots: number[], target: number | undefined, goodWhen: "up" | "down" = "up"): { reach?: number; of: number; low: number; high: number } {
  const reach = target === undefined ? undefined : dots.filter((v) => (goodWhen === "down" ? v <= target : v >= target)).length;
  return { ...(reach === undefined ? {} : { reach }), of: dots.length, low: at(sorted, 0.25), high: at(sorted, 0.75) };
}
