/**
 * The board's lede: two or three lines above a dashboard that answer what a reader asks first, is this good or bad, and
 * where should I look. Written from the cards' own judgments, never from words an author typed: every figure that has
 * a target, a past value or a plan to be read against (a meter's target, a KPI's change, a ghost's last period, a
 * forecast's plan) becomes a reading, signed by whether it is on the good side (`goodWhen`). The lede counts the
 * readings on course, names the best one and the worst one, and links each to its card.
 *
 * @module
 */
import { readable } from "./canonical.ts";
import { fieldLabel, formatValue } from "./display.ts";
import { readNumber } from "./formats.ts";
import { computeHeadline } from "./headline.ts";
import type { HeadlineSpec } from "./headline.ts";
import { OUTCOME_DOTS, outcomeOdds, outcomeValues, quantileDots } from "./outcomes.ts";
import type { Row, WidgetSpec } from "./types.ts";
import { wordsFor } from "./words.ts";

type View = Record<string, unknown> & { type: string };

/** One judged figure on a card: what it is about, what it says, and how far on the good (+) or bad (−) side it stands. */
export interface Reading {
  /** The cell key of its card (the widget id), for its ref. */
  key: string;
  /** The card's title. */
  card: string;
  /** What the figure is about: a row ("West"), a tile ("Churn"), or the card itself. */
  subject: string;
  /** What it says, in the card's language: "12% below target", "+8.0% since Q2", "5 of 20 outcomes reach plan". */
  said: string;
  /** Signed distance from the line it is read against, as a share: +0.12 is 12% on the good side. */
  score: number;
  /** What it is read against: a target or plan line, or a past value. */
  against: "line" | "past";
}

/** The board's lede: how many readings are on course, and the best and worst of them. */
export interface Lede {
  onCourse: number;
  of: number;
  good?: Reading;
  bad?: Reading;
}

/** A card as the lede reads it: its key, the spec it draws, and the rows it draws. */
export interface LedeCard {
  key: string;
  spec: WidgetSpec;
  rows: Row[];
}

/** Below half a percent either way a figure is on its line: neither going well nor needing attention. */
const ON_LINE = 0.005;

const one = (value: unknown): string | undefined => (typeof value === "string" && value ? value : Array.isArray(value) && typeof value[0] === "string" ? value[0] : undefined);
const sign = (goodWhen: unknown) => (goodWhen === "down" ? -1 : 1);
/** A date-like category ("2026-09", "2026-09-30"): a series over time, of which only the latest row is news. */
const isTime = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}/.test(value);
/** A field that names a plan line: a bar's `lines` field drawn against the bars reads as its target. */
const TARGET_NAME = /^(target|plan|goal|budget|quota)/i;
/** A line that caps rather than aims: a banker's client capacity, a limit. */
const CEILING = /(capacity|limit|ceiling)/i;

/** "12%" in the locale, never a decimal: a lede reads at a glance. */
function share(n: number, locale?: string): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(Math.abs(n));
}

/** "+8.0%" or "−3 pts" in the locale, with a true minus. */
function change(n: number, locale?: string, points = false): string {
  const minus = (text: string) => text.replace(/^-/, "−");
  if (points) {
    const word = /^de\b/i.test(locale ?? "") ? "Pp." : "pts";
    return `${minus(new Intl.NumberFormat(locale, { maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(Math.round(n * 1000) / 10))} ${word}`;
  }
  return minus(new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(n));
}

/**
 * Every judged figure on one card, from the rows it draws. A card with nothing to be read against (a ranking, a mix, a
 * map) gives none: the lede never judges what the card itself does not.
 */
export function readingsOf(card: LedeCard): Reading[] {
  const spec = readable(card.spec);
  const rows = card.rows;
  if (!rows.length) return [];
  const view = (spec.view ?? { type: "table" }) as View;
  const locale = spec.locale;
  const L = wordsFor(locale).lede;
  const title = spec.title ?? "";
  const label = (field: string) => fieldLabel(field, spec.fields);
  const out: Reading[] = [];
  const add = (subject: string, said: string, score: number, against: Reading["against"]) => {
    if (Number.isFinite(score)) out.push({ key: card.key, card: title, subject: subject || title, said, score, against });
  };
  /** A value against its target: how far above or below, on the good side or not. */
  const against = (subject: string, value: number | null, target: number | null, goodWhen: unknown, field?: string) => {
    if (value === null || target === null || target === 0) return;
    const off = value / target - 1;
    // English names the line the card draws ("8% above budget"); French and German say the target.
    const line = field ? label(field).toLowerCase() : undefined;
    // A ceiling (a capacity, a limit) is only news once passed: room under it is neither going well nor badly.
    if (field && CEILING.test(field)) {
      if (off > ON_LINE) add(subject, L.aboveTarget(share(off, locale), line), -off, "line");
      return;
    }
    add(subject, Math.abs(off) < ON_LINE ? L.onTarget : off > 0 ? L.aboveTarget(share(off, locale), line) : L.belowTarget(share(off, locale), line), sign(goodWhen) * off, "line");
  };
  /** "since Aug 2026" for the row before, by its date; "on the period before" when the rows carry none. */
  const sinceRow = (row: Row | undefined) => {
    const x = one(view.x);
    const field = x && isTime(row?.[x]) ? x : Object.keys(row ?? {}).find((key) => isTime(row?.[key]));
    if (!row || !field) return L.onPrevious;
    const format = spec.fields?.[field]?.format ?? { type: "date", style: String(row[field]).length > 7 ? "day" : "month" };
    return L.since(formatValue(row[field], format as never, locale));
  };
  /** A value against a past one ("since August", "on the period before"). */
  const since = (subject: string, value: number | null, before: number | null, goodWhen: unknown, when: string, points = false) => {
    if (value === null || before === null || (!points && before === 0)) return;
    const moved = points ? value - before : value / before - 1;
    const by = change(Math.abs(moved), locale, points).replace(/^\+/, "");
    add(subject, `${moved < 0 ? L.down(by) : L.up(by)} ${when}`, sign(goodWhen) * moved, "past");
  };
  /** Each row's label, or the card's title for a single row. */
  const rowName = (row: Row, field: string | undefined) => (field && row[field] !== undefined && row[field] !== null ? String(row[field]) : title);

  switch (view.type) {
    case "kpis": {
      const items = Array.isArray(view.items) ? (view.items as Record<string, unknown>[]) : [];
      const last = rows[rows.length - 1] as Row;
      const previous = rows.length > 1 ? (rows[rows.length - 2] as Row) : undefined;
      for (const item of items) {
        const field = one(item.value);
        if (!field) continue;
        const subject = typeof item.label === "string" && item.label ? item.label : label(field);
        const value = readNumber(last[field]);
        if (typeof item.target === "string") against(subject, value, readNumber(last[item.target]), item.goodWhen, item.target);
        const compare = item.compare ?? (view.series === true ? "previous" : undefined);
        const points = item.delta === "points";
        if (compare === "previous" && previous) since(subject, value, readNumber(previous[field]), item.goodWhen, sinceRow(previous), points);
        else if (typeof compare === "string" && compare !== "previous") since(subject, value, readNumber(last[compare]), item.goodWhen, L.since(label(compare)), points);
      }
      break;
    }
    case "kpi": {
      const field = one(view.value);
      if (!field) break;
      const last = rows[rows.length - 1] as Row;
      const subject = typeof view.label === "string" && view.label ? view.label : title;
      if (typeof view.target === "string") against(subject, readNumber(last[field]), readNumber(last[view.target]), view.goodWhen, view.target);
      if (typeof view.compare === "string") since(subject, readNumber(last[field]), readNumber(last[view.compare]), view.goodWhen, L.since(label(view.compare)));
      else if (view.series === true && rows.length > 1) since(subject, readNumber(last[field]), readNumber((rows[rows.length - 2] as Row)[field]), view.goodWhen, sinceRow(rows[rows.length - 2]));
      break;
    }
    case "meter":
    case "bullet":
    case "rings":
    case "variance":
    case "gauge": {
      const field = one(view.value);
      const name = one(view.label);
      if (!field) break;
      const target = typeof view.target === "string" ? view.target : undefined;
      const fixed = typeof view.target === "number" ? view.target : undefined;
      // A gauge's label is its caption, not a field.
      const byRow = view.type !== "gauge" && rows.length > 1;
      for (const row of rows) {
        const subject = byRow ? rowName(row, name) : title;
        against(subject, readNumber(row[field]), target ? readNumber(row[target]) : (fixed ?? null), view.goodWhen, target);
        if (typeof view.compare === "string") since(subject, readNumber(row[field]), readNumber(row[view.compare]), view.goodWhen, L.since(label(view.compare)));
        if (!byRow) break;
      }
      break;
    }
    case "hbar":
    case "line": {
      // The ghost of last period: each bar, or each line's last point, against the value it had then.
      if (typeof view.compare !== "string") break;
      const field = one(view.value) ?? one(view.y);
      if (!field) break;
      const when = L.since(label(view.compare));
      if (view.type === "line") {
        const last = rows[rows.length - 1] as Row;
        since(label(field), readNumber(last[field]), readNumber(last[view.compare]), view.goodWhen, when);
      } else for (const row of rows) since(rowName(row, one(view.label)), readNumber(row[field]), readNumber(row[view.compare]), view.goodWhen, when);
      break;
    }
    case "bar": {
      // Bars against one plan line (`lines: "target"`), or against a written reference when the card says which side is good.
      const field = one(view.y);
      const x = one(view.x);
      if (!field || (Array.isArray(view.y) && view.y.length > 1)) break;
      const line = one(view.lines);
      const fixed = Array.isArray(view.reference) ? (view.reference as { value?: unknown }[]).find((r) => typeof r.value === "number")?.value : undefined;
      const target = line && TARGET_NAME.test(line) ? line : undefined;
      if (!target && (fixed === undefined || view.goodWhen === undefined)) break;
      // Over time only the latest bar is news; across categories every bar is.
      const list = x && isTime(rows[0]?.[x]) ? rows.slice(-1) : rows;
      for (const row of list) {
        const subject = x ? (isTime(row[x]) ? formatValue(row[x], spec.fields?.[x]?.format, locale) : String(row[x])) : title;
        against(subject, readNumber(row[field]), target ? readNumber(row[target]) : (fixed as number), view.goodWhen, target);
      }
      break;
    }
    case "outcomes": {
      const field = one(view.value);
      if (!field || typeof view.target !== "number") break;
      const sorted = outcomeValues(rows, field);
      const dots = quantileDots(sorted, typeof view.dots === "number" ? view.dots : OUTCOME_DOTS);
      const odds = outcomeOdds(sorted, dots, view.target, view.goodWhen === "down" ? "down" : "up");
      if (odds.reach === undefined || !odds.of) break;
      const plan = typeof view.targetLabel === "string" && view.targetLabel ? view.targetLabel : L.target;
      // Even odds are the line: a forecast that reaches its plan one time in four is a quarter short of a sure thing's half.
      add(title, L.odds(odds.reach, odds.of, plan), odds.reach / odds.of - 0.5, "line");
      break;
    }
  }
  // A headline with a change, over any view.
  const headline = spec.headline as HeadlineSpec | undefined;
  if (headline?.value && headline.compare) {
    const { value, before } = computeHeadline(headline, rows);
    const when = headline.compareLabel ?? (headline.compare === "previous" ? sinceRow(rows[rows.length - 2]) : L.since(label(headline.compare)));
    since(headline.caption && !/\{/.test(headline.caption) ? headline.caption : label(headline.value), value, before, headline.goodWhen, when);
  }
  // One figure said twice on a card (a tile and the headline over it) counts once.
  return out.filter((r, i) => out.findIndex((o) => o.subject === r.subject && o.against === r.against && Math.abs(o.score - r.score) < 1e-9) === i);
}

/**
 * The board's lede from its cards: the readings on course out of all of them, the best reading and the worst. A board
 * with fewer than two readings has no lede (a summary of one figure only repeats its card).
 */
export function ledeOf(cards: LedeCard[]): Lede | undefined {
  // The same figure on two cards (revenue's change on the KPI row and on the revenue chart's headline) counts once.
  const all = cards.flatMap(readingsOf);
  const readings = all.filter((r, i) => all.findIndex((o) => o.subject.toLowerCase() === r.subject.toLowerCase() && o.against === r.against && Math.abs(o.score - r.score) < 1e-9) === i);
  if (readings.length < 2) return undefined;
  const onCourse = readings.filter((r) => r.score >= -ON_LINE).length;
  // Ties keep board order, so the same data always gives the same lede.
  const bad = readings.reduce<Reading | undefined>((worst, r) => (r.score < -ON_LINE && (!worst || r.score < worst.score) ? r : worst), undefined);
  const goods = readings.filter((r) => r.score > ON_LINE);
  const best = (list: Reading[]) => list.reduce<Reading | undefined>((top, r) => (!top || r.score > top.score ? r : top), undefined);
  // The best from another card than the worst when there is one, so the lede points to two places.
  const good = best(goods.filter((r) => r.key !== bad?.key)) ?? best(goods);
  return { onCourse, of: readings.length, ...(good ? { good } : {}), ...(bad ? { bad } : {}) };
}
