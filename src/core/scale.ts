/**
 * Scale math shared by the core and the drawing layer: round tick values and
 * value bins. Pure functions with no DOM, so transforms can use them too.
 *
 * @module
 */

/** Rounds away floating point noise such as 0.30000000000000004. */
function tidy(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

/**
 * Round tick values covering `[min, max]`, about `count` intervals apart,
 * stepping by 1, 2, 2.5 or 5 times a power of ten.
 *
 * @example niceTicks(0, 87) // [0, 20, 40, 60, 80, 100]
 */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) {
    if (min === 0) return niceTicks(0, 1, count);
    const pad = Math.abs(min) * 0.1;
    return niceTicks(min - pad, max + pad, count);
  }
  const rawStep = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  const step = nice * magnitude;
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  const start = Math.floor(tidy(min / step, 9)) * step;
  const end = Math.ceil(tidy(max / step, 9)) * step;
  const intervals = Math.round((end - start) / step);
  return Array.from({ length: intervals + 1 }, (_, i) => tidy(start + i * step, decimals));
}

/** One histogram bin: rows with start <= value < end (the last bin also takes its end). */
export interface Bin {
  start: number;
  end: number;
  count: number;
}

/**
 * Cuts the values' range into about `count` bins whose edges are round
 * numbers (from niceTicks) and counts the values in each.
 */
export function binValues(values: number[], count: number): Bin[] {
  if (values.length === 0) return [];
  const edges = niceTicks(Math.min(...values), Math.max(...values), Math.max(1, Math.round(count)));
  const bins: Bin[] = edges.slice(0, -1).map((start, i) => ({ start, end: edges[i + 1] as number, count: 0 }));
  for (const value of values) {
    const i = bins.findIndex((bin, k) => value >= bin.start && (value < bin.end || k === bins.length - 1));
    if (i >= 0) (bins[i] as Bin).count += 1;
  }
  return bins;
}

/** Sturges' rule: a sensible bin count for `n` values (1 + log2 n, rounded up). */
export function sturges(n: number): number {
  return Math.ceil(Math.log2(Math.max(1, n)) + 1);
}
