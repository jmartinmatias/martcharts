/**
 * The cycle plot's reading: dated rows gathered by where they fall in a cycle (the day of the week, or the month of
 * the year), each group in date order, with its average, its first and its last reading. The view draws it, and the
 * guide's sentence reads it, so both say the same.
 *
 * @module
 */
import { readNumber } from "./formats.ts";
import type { Row } from "./types.ts";

/** The cycles a cycle plot can fold time into. */
export type CycleBy = "weekday" | "month";

/** One panel: every reading that falls on one day of the week, or in one month of the year. */
export interface CyclePanel {
  /** 0 Monday to 6 Sunday, or 0 January to 11 December: the panel's place in the cycle. */
  key: number;
  /** Its short name in the reader's language ("Mon", "janv."), and its full name ("Monday"). */
  short: string;
  long: string;
  readings: { row: Row; date: string; value: number }[];
  mean: number;
  first: number;
  last: number;
}

/** A date's parts from an ISO string ("2026-04-07", "2026-04") or a Date: year, month 1–12, and day when it has one. */
function partsOf(value: unknown): { y: number; m: number; d?: number } | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return { y: value.getUTCFullYear(), m: value.getUTCMonth() + 1, d: value.getUTCDate() };
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(value) : null;
  if (!match) return undefined;
  return { y: Number(match[1]), m: Number(match[2]), ...(match[3] ? { d: Number(match[3]) } : {}) };
}

/** Which cycle fits the dates when none is asked for: days of the week for daily readings, months otherwise. */
export function cycleFor(rows: Row[], x: string): CycleBy {
  const days = new Set(rows.map((row) => partsOf(row[x])).filter((p) => p?.d !== undefined).map((p) => `${p?.y}-${p?.m}-${p?.d}`));
  return days.size >= 14 ? "weekday" : "month";
}

/** The panels in cycle order (Monday first, January first), only those with readings. */
export function cyclePanels(rows: Row[], x: string, value: string, by: CycleBy | undefined, locale?: string): { by: CycleBy; panels: CyclePanel[] } {
  const cycle = by ?? cycleFor(rows, x);
  const groups = new Map<number, CyclePanel["readings"]>();
  for (const row of rows) {
    const parts = partsOf(row[x]);
    const amount = readNumber(row[value]);
    if (!parts || amount === null) continue;
    let key: number;
    if (cycle === "weekday") {
      if (parts.d === undefined) continue;
      key = (new Date(Date.UTC(parts.y, parts.m - 1, parts.d)).getUTCDay() + 6) % 7;
    } else key = parts.m - 1;
    const date = `${parts.y}-${String(parts.m).padStart(2, "0")}${parts.d === undefined ? "" : `-${String(parts.d).padStart(2, "0")}`}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push({ row, date, value: amount });
  }
  // A Monday and a January to name each panel by: 5 January 2026 was a Monday.
  const nameOf = (key: number, style: "short" | "long") => {
    const at = cycle === "weekday" ? new Date(Date.UTC(2026, 0, 5 + key)) : new Date(Date.UTC(2026, key, 15));
    try {
      return new Intl.DateTimeFormat(locale, cycle === "weekday" ? { weekday: style, timeZone: "UTC" } : { month: style, timeZone: "UTC" }).format(at);
    } catch {
      return String(key + 1);
    }
  };
  const panels = [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([key, readings]): CyclePanel => {
      readings.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      return {
        key,
        short: nameOf(key, "short"),
        long: nameOf(key, "long"),
        readings,
        mean: readings.reduce((sum, r) => sum + r.value, 0) / readings.length,
        first: readings[0]?.value ?? 0,
        last: readings.at(-1)?.value ?? 0,
      };
    });
  return { by: cycle, panels };
}

/** What the cycle says in figures: the strongest and weakest panel by average, and how many panels grew over the period. */
export function cycleStandout(panels: CyclePanel[]): { high: CyclePanel; low: CyclePanel; grew: number } | undefined {
  if (panels.length < 2) return undefined;
  const high = panels.reduce((best, p) => (p.mean > best.mean ? p : best));
  const low = panels.reduce((worst, p) => (p.mean < worst.mean ? p : worst));
  return { high, low, grew: panels.filter(grows).length };
}

/** Whether a panel grows: the average of its last third of readings above that of its first third, so one odd day is not a trend. */
export function grows(panel: CyclePanel): boolean {
  const n = panel.readings.length;
  if (n < 2) return false;
  const third = Math.max(1, Math.floor(n / 3));
  const mean = (list: { value: number }[]) => list.reduce((sum, r) => sum + r.value, 0) / list.length;
  return mean(panel.readings.slice(-third)) > mean(panel.readings.slice(0, third));
}
