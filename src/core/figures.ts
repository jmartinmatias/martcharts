/**
 * The figures in a sentence: a takeaway line reads as a data sentence when its numbers stand out from its words
 * ("Revenue went from **€820K** to **€1.3M**"). Dates are words here: a day of the month or a year is left plain, so
 * only the amounts carry the weight.
 *
 * @module
 */

/** One run of a sentence: words, or a figure (an amount, a share, a count). */
export interface Run {
  text: string;
  figure: boolean;
}

// An amount: an optional currency sign, a number with its separators (the narrow no-break spaces French and German
// write in 1 284 000, never a plain space, which separates two numbers), and an optional unit: K, M, bn, %, pts, Pp., or a currency sign after the number.
const FIGURE = /[+−-]?(?:[€$£¥]\s?)?\d[\d.,\u202f\u00a0]*(?:\s?(?:[KMB]\b|bn\b|Mrd\.?|Mio\.?|%|pts\b|Pp\.|€|\$|£))?/g;
const MONTH = /(?:jan|feb|fév|f[ée]v|mar|mär|apr|avr|may|mai|jun|juin|jul|juil|aug|ao[uû]|sep|oct|okt|nov|dec|déc|dez)[a-zéû]*\.?\s*$/i;
const MONTH_AFTER = /^\s*(?:jan|feb|fév|f[ée]v|mar|mär|apr|avr|may|mai|jun|juin|jul|juil|aug|ao[uû]|sep|oct|okt|nov|dec|déc|dez)/i;

/** A sentence cut into words and figures, in order; joined back, the runs give the sentence unchanged. */
export function figureRuns(sentence: string): Run[] {
  const runs: Run[] = [];
  let last = 0;
  for (const match of sentence.matchAll(FIGURE)) {
    const raw = match[0];
    const start = match.index ?? 0;
    // A trailing separator ("222," "€1.3M.") belongs to the sentence, not to the figure.
    const text = raw.replace(/[.,\u202f \s]+$/, "");
    if (!/\d/.test(text)) continue;
    const before = sentence.slice(0, start);
    const after = sentence.slice(start + text.length);
    const plainNumber = /^\d+$/.test(text);
    // A year (2026), a day beside its month ("Apr 7", "7 avr."), or a quarter's number ("Q3") reads as a date.
    const date = plainNumber && (/^(19|20)\d\d$/.test(text) || MONTH.test(before) || MONTH_AFTER.test(after) || /\b[QHT]$/.test(before));
    // A number inside a word ("7-day", "24h", "Q3") names a thing, not an amount.
    if (date || /^-?[A-Za-zÀ-ÿ]/.test(after) && !/^[KMB]\b|^bn\b/.test(after) || /[A-Za-z]$/.test(before)) continue;
    if (start > last) runs.push({ text: sentence.slice(last, start), figure: false });
    runs.push({ text, figure: true });
    last = start + text.length;
  }
  if (last < sentence.length) runs.push({ text: sentence.slice(last), figure: false });
  return runs;
}
