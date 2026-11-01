/**
 * How fresh the data is, in words: the board's as-of line ("Data to September 2026") and a card's own, quieter one
 * when its rows end earlier than the board's ("Data to Aug 2026"). Dates come from the data or the spec, never from
 * the clock.
 *
 * @module
 */
import { wordsFor } from "./words.ts";
import type { Row } from "./types.ts";

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** "October 2026" as 2026-10, so it can be said in another language; undefined for anything else. */
export function englishMonth(text: string): string | undefined {
  const match = /^([A-Za-z]+) (\d{4})$/.exec(text);
  const index = match ? MONTHS.indexOf((match[1] as string).toLowerCase()) : -1;
  return match && index >= 0 ? `${match[2]}-${String(index + 1).padStart(2, "0")}` : undefined;
}

/** A date written for people: "25 Oct 2026" for a day, "October 2026" for a month, the text unchanged otherwise. */
export function dateWords(text: string, locale?: string): string {
  const day = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  const month = /^(\d{4})-(\d{2})$/.exec(text);
  const options: Intl.DateTimeFormatOptions = day ? { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" } : { month: "long", year: "numeric", timeZone: "UTC" };
  if (!day && !month) return text;
  const [, y, m, d] = (day ?? month) as RegExpExecArray;
  return new Intl.DateTimeFormat(locale, options).format(new Date(Date.UTC(Number(y), Number(m) - 1, Number(d ?? 1))));
}

/**
 * The as-of line: "As of 25 Oct 2026" for a date, or the words given with {latest} filled by the latest date across
 * the widgets that have the range field. Empty while {latest} is not known yet.
 */
export function asOfText(asOf: string, latest: string, locale?: string): string {
  const text = asOf.trim();
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(text)) return wordsFor(locale).board.asOf(dateWords(text, locale));
  // The site's standard line, "Data to {latest}" or "Data to October 2026", reads in the board's language.
  const dataTo = /^Data to (.+)$/.exec(text);
  if (dataTo && !/^en\b/i.test(locale ?? "en")) {
    const said = (dataTo[1] as string).trim();
    const month = englishMonth(said);
    const date = said === "{latest}" ? (latest ? dateWords(latest, locale) : "") : month ? dateWords(month, locale) : said;
    return date ? wordsFor(locale).board.dataTo(date, said === "{latest}" && isDay(latest)) : "";
  }
  if (!text.includes("{latest}")) return text;
  return latest ? text.split("{latest}").join(dateWords(latest, locale)) : "";
}

/**
 * A card's own as-of words, for its credit line: a date is where its rows end ("Data to 31 Aug 2026"), "Data to
 * October 2026" reads in the card's language, other words stay as written.
 */
export function cardAsOfText(asOf: string, locale?: string): string {
  const text = asOf.trim();
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(text)) return wordsFor(locale).board.dataTo(dateWords(text, locale), isDay(text));
  return asOfText(text, "", locale);
}

/** Whether an ISO date names a day (2026-09-30), not a month (2026-09): French says "au 30 sept." but "à fin septembre". */
const isDay = (text: string) => /^\d{4}-\d{2}-\d{2}/.test(text);

/** The month a board's as-of words name, as 2026-10: from a date, "Data to October 2026", or else the latest date drawn. */
export function asOfMonth(asOf: string | undefined, latest: string): string {
  const text = (asOf ?? "").trim();
  const iso = /^(\d{4}-\d{2})/.exec(text);
  if (iso) return iso[1] as string;
  const month = englishMonth(/^Data to (.+)$/.exec(text)?.[1]?.trim() ?? "");
  return month ?? latest.slice(0, 7);
}

/** The latest ISO date ("2026-09-30" or "2026-09") in a field of these rows, forecast rows left out; "" when none. */
export function latestIn(rows: Row[], field: string, forecast?: (row: Row) => boolean): string {
  let max = "";
  for (const row of rows) {
    if (forecast?.(row)) continue;
    const value = row[field];
    if (typeof value === "string" && /^\d{4}-\d{2}/.test(value) && value > max) max = value;
  }
  return max;
}
