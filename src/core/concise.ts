/**
 * Keeps a reading guide short: at most three sentences and sixty words, in every language. It never teaches the
 * legend (the key sits a few pixels away), always keeps the first sentence (what a mark is) and the finding (the
 * sentence that starts "Here", "Ici" or "Hier"), and fills in between, in order, while the budget allows.
 *
 * @module
 */

/** Sentences that teach the legend, in English, French and German: the key is on the chart already. */
export const LEGEND_SENTENCE = /\b(each colou?r (is|and)|the colou?rs (are|say)|the key (?:under|above|below|beside|says|shows)|the legend\b)|chaque couleur|les couleurs (sont|indiquent)|la légende|\bjede Farbe\b|\bdie Farben (sind|zeigen)\b|\bdie Legende\b/i;

/** Where a finding starts: "Here, …" and its French and German counterparts. */
const FINDING = /^(Here|Ici|Hier)\b/;

/** At most this many sentences and words in a reading guide. */
export const MAX_SENTENCES = 3;
export const MAX_WORDS = 60;

/** The sentences of a text. A full stop after a title or an initial ("Dr. M. Keller", "St. Gallen") does not end one. */
export function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=(?<!\b(?:Dr|Mr|Mrs|Ms|St|Mt|vs|Nr|[A-Z]))[.!?])\s+(?=[A-ZÀ-ÖØ-Þ„«"])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** How many words a text has. */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** A sentence that only states the scale ("The taller the bar, the more cost."): it joins the sentence before it. */
const SCALE = /^(The (taller|longer|bigger|higher|stronger|wider|further|thicker|steeper)\b|Plus (le|la|les|l'|sa|son|ses|grand|haut|long|large|une|un)\b|Je (größer|höher|länger|weiter|breiter|kräftiger|dicker|stärker)\b)/;

/**
 * Sentences that say how to read an encoding a newcomer cannot guess (a target or budget line, dashes, outlines, hollow
 * marks, a forecast, arrows, lower is better): they win the space left over before sentences that only point things out.
 */
const ENCODING =
  /dashed|target|budget|outlined|hollow|forecast|lower is better|arrow|circle|triangle|square|bigger|thicker|shaded area|corners|pointillé|objectif|prévision|creux|flèche|cercle|carré|gros|zone|coin|étape|épaisse|gestrichelt|\bZiel|Budget|Prognose|hohl|Pfeil|Kreis|Dreieck|Quadrat|größer|Fläche|Ecke|Phase|dicker/i;

/** "Each bar is one month. The taller the bar, the more cost." reads as one: "Each bar is one month: the taller the bar, the more cost." */
function mergeScale(sentences: string[]): string[] {
  const [first, second, ...rest] = sentences;
  if (!first || !second || !SCALE.test(second) || first.includes(":") || !/[.]$/.test(first)) return sentences;
  // French sets a space before the colon.
  const colon = /^Plus\b/.test(second) ? " : " : ": ";
  return [`${first.slice(0, -1)}${colon}${second.charAt(0).toLowerCase()}${second.slice(1)}`, ...rest];
}

/** A guide cut to at most three sentences and sixty words, with no sentence teaching the legend. */
export function concise(text: string): string {
  const all = mergeScale(sentencesOf(text));
  if (all.length <= 1) return all.join(" ").trim() || text.trim();
  const sentences = all.filter((sentence, i) => i === 0 || !LEGEND_SENTENCE.test(sentence));
  const at = sentences.findIndex((sentence, i) => i > 0 && FINDING.test(sentence));
  const findIndex = at > 0 ? at : sentences.length - 1;
  const first = sentences[0] as string;
  const finding = sentences.slice(findIndex);
  const middle = sentences.slice(1, findIndex);
  const fits = (parts: string[]) => parts.length <= MAX_SENTENCES && wordCount(parts.join(" ")) <= MAX_WORDS;
  // What a reader needs, in order: what a mark is, the fact, how to read an encoding they could not guess, then the
  // rest of the explanation, then the rest of the finding. Whatever is kept is said in the order it was written.
  const ranked = [finding[0] as string, ...middle.filter((s) => ENCODING.test(s)), ...middle.filter((s) => !ENCODING.test(s)), ...finding.slice(1)];
  const chosen = new Set<string>();
  const inOrder = (extra?: string) => sentences.filter((s) => s === first || chosen.has(s) || s === extra);
  for (const sentence of ranked) if (fits(inOrder(sentence))) chosen.add(sentence);
  return inOrder().join(" ");
}
