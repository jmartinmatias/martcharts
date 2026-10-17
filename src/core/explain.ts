/**
 * Plain reading guides for charts: one to three short sentences that say what
 * each mark is and what bigger, longer, stronger or further right means, in the
 * chart's own field names, simple enough for a ten-year-old. Shown as "How to
 * read it" wherever a chart needs explaining.
 *
 * @module
 */
import { fieldLabel, formatValue, timeStep } from "./display.ts";
import { readNumber } from "./formats.ts";
import { binValues, sturges } from "./scale.ts";
import { isPlural } from "./question.ts";
import type { Row, WidgetSpec } from "./types.ts";

type View = Record<string, unknown> & { type: string };

/** A view option that names one field, or undefined. */
const one = (value: unknown): string | undefined => (typeof value === "string" && value ? value : Array.isArray(value) && typeof value[0] === "string" ? value[0] : undefined);
/** A view option that names one or more fields. */
const many = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : typeof value === "string" && value ? [value] : []);

/**
 * Explains a widget's chart in plain words. Given the rows the chart draws, it adds one concrete example from them
 * ("Here, East is the tallest, with €2,000."). Unknown views get a short general guide.
 */
export function explainChart(spec: WidgetSpec, rows: Row[] = []): string {
  const facet = (spec.facet as { field?: string } | undefined)?.field;
  // A dashed target line says what it is, so the chart reads against it.
  const goal = targetLine(spec);
  const lined = goal ? `${guide(spec)} The dashed line is the ${goal.name}.` : guide(spec);
  // Small multiples: one chart per value, so an example across all rows would mix the panels up.
  const general = facet ? `${lined} There is one small chart for each ${nameOf(facet, spec)}, all on the same scale.` : lined;
  const example = rows.length && !facet ? exampleOf(spec, rows) : "";
  return example ? `${general} ${example}` : general;
}

/** A reference line drawn at a fixed target (labelled target, plan, goal, budget or quota), on bars and lines. */
function targetLine(spec: WidgetSpec): { value: number; name: string } | undefined {
  const view = (spec.view ?? { type: "table" }) as View;
  if (!["bar", "hbar", "line", "area"].includes(view.type) || !Array.isArray(view.reference)) return undefined;
  const found = (view.reference as { value?: unknown; label?: unknown }[]).find((r) => typeof r.value === "number" && /target|plan|goal|budget|quota/i.test(String(r.label ?? "")));
  if (!found) return undefined;
  const label = String(found.label);
  return { value: found.value as number, name: /^[A-Z][a-z]*\b/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label };
}

/** Field names that read as one measure at two times: q3_2025 and q3_2026, before and after. */
const PERIOD = /(19|20)\d\d|\bq[1-4]\b|before|after|previous|prior|last|current|start|end/i;

/** One sentence that points at the standout in the data, or empty when there is nothing clear to point at. */
function exampleOf(spec: WidgetSpec, rows: Row[]): string {
  const view = (spec.view ?? { type: "table" }) as View;
  const text = (row: Row, field: string) => formatValue(row[field], spec.fields?.[field]?.format, spec.locale);
  // When something happened, worded for the time step: "on Sep 15", "in the week of Mar 30", "in Sep 2026".
  const when = (row: Row, x: string) => {
    const step = timeStep(x);
    return step === "day" ? `on ${text(row, x)}` : step === "week" ? `in the week of ${text(row, x)}` : `in ${text(row, x)}`;
  };
  // Goal charts: how many reached the goal, by name when there are few, or all, or none yet.
  const goalLine = (total: number, met: Row[], label: string | undefined, verb: "reached" | "passed"): string => {
    if (!total) return "";
    if (met.length === total) return `Here, all ${total} have ${verb} their goal.`;
    if (met.length === 0) return `Here, none of the ${total} has ${verb} its goal yet.`;
    const names = label ? met.map((r) => text(r, label)) : [];
    const listed = names.length && names.length <= 5 ? `: ${names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]}` : "";
    return `Here, ${met.length} of ${total} ${met.length === 1 ? `has ${verb} its goal` : `have ${verb} their goal`}${listed}.`;
  };
  // A pipeline (stages whose numbers only shrink): how many made it from the first stage to the last.
  const pipeline = (label: string, amount: string): string => {
    if (!/^(stage|step|phase)s?$/i.test(label) || rows.length < 3) return "";
    const values = rows.map((row) => readNumber(row[amount]));
    if (values.some((v, i) => v === null || (i > 0 && v > (values[i - 1] as number)))) return "";
    const [first, last] = [rows[0] as Row, rows.at(-1) as Row];
    const share = (values[0] as number) > 0 ? ` (${percent((values.at(-1) as number) / (values[0] as number))})` : "";
    return `Here, ${text(last, amount)} of ${text(first, amount)} ${nameOf(amount, spec)} made it from ${text(first, label)} to ${text(last, label)}${share}.`;
  };
  const value = (row: Row, field: string) => readNumber(row[field]);
  const top = (field: string | undefined) =>
    field ? rows.filter((row) => value(row, field) !== null).reduce<Row | undefined>((best, row) => (best && (value(best, field) as number) >= (value(row, field) as number) ? best : row), undefined) : undefined;
  const series = many(view.y);
  const single = series.length === 1 && !view.stacked ? series[0] : undefined;
  switch (view.type) {
    case "bar": {
      const x = one(view.x);
      if (!x) return "";
      if (series.length > 1 && view.stacked === "percent") {
        // Each bar is 100%: point at the biggest part of any bar.
        let best: { row: Row; field: string; share: number } | undefined;
        for (const row of rows) {
          const total = series.reduce((sum, field) => sum + Math.max(0, value(row, field) ?? 0), 0);
          for (const field of series) {
            const share = total > 0 ? Math.max(0, value(row, field) ?? 0) / total : 0;
            if (!best || share > best.share) best = { row, field, share };
          }
        }
        return best && best.share > 0 ? `Here, the largest share is ${nameOf(best.field, spec)} in ${text(best.row, x)}, at ${percent(best.share)}.` : "";
      }
      if (series.length > 1 && view.stacked && view.stacked !== "percent") {
        // A stack's whole height is its total.
        const totals = rows.map((row) => series.reduce((sum, field) => sum + (value(row, field) ?? 0), 0));
        const best = totals.indexOf(Math.max(...totals));
        const row = rows[best];
        return row ? `Here, ${text(row, x)} has the tallest bar, with ${formatValue(totals[best], spec.fields?.[series[0] as string]?.format, spec.locale)} in all.` : "";
      }
      if (series.length === 2 && !view.stacked) {
        // Two measures side by side: for how many is the first higher, and where is the gap biggest?
        const [a, b] = series as [string, string];
        const paired = rows.filter((r) => value(r, a) !== null && value(r, b) !== null);
        if (paired.length > 1) {
          const ahead = paired.filter((r) => (value(r, a) as number) > (value(r, b) as number)).length;
          const widest = paired.reduce((best, r) => (Math.abs((value(r, a) as number) - (value(r, b) as number)) > Math.abs((value(best, a) as number) - (value(best, b) as number)) ? r : best));
          const entity = nameOf(x, spec);
          const count = ahead === paired.length ? `every ${entity}` : `${ahead} of ${paired.length} ${plural(entity)}`;
          return `Here, ${nameOf(a, spec)} is higher than ${nameOf(b, spec)} for ${count}, and ${text(widest, x)} has the biggest gap: ${text(widest, a)} against ${text(widest, b)}.`;
        }
      }
      if (series.length > 1 && !view.stacked) {
        let best: { row: Row; field: string } | undefined;
        for (const row of rows) for (const field of series) if (value(row, field) !== null && (!best || (value(row, field) as number) > (value(best.row, best.field) as number))) best = { row, field };
        return best ? `Here, the tallest bar is ${text(best.row, x)}'s ${nameOf(best.field, spec)}, with ${text(best.row, best.field)}.` : "";
      }
      const flow = single ? pipeline(x, single) : "";
      if (flow) return flow;
      // A target line: the question is how often the bars beat it, not which bar is tallest.
      const goal = one(view.lines);
      if (single && goal) {
        const paired = rows.filter((row) => value(row, single) !== null && value(row, goal) !== null);
        const beat = paired.filter((row) => (value(row, single) as number) >= (value(row, goal) as number)).length;
        const each = nameOf(x, spec);
        if (paired.length) return `Here, ${nameOf(single, spec)} beat the ${nameOf(goal, spec)} in ${beat} of ${paired.length} ${plural(each)}.`;
      }
      const row = single ? top(single) : undefined;
      const standout = row && single ? `${text(row, x)} ${view.mark === "lollipop" ? "has the highest dot" : "is the tallest"}, with ${text(row, single)}` : "";
      // Against a dashed target line: how many are above it, said without assuming above is better.
      const line = targetLine(spec);
      if (standout && single && line) {
        const known = rows.filter((r) => value(r, single) !== null);
        const above = known.filter((r) => (value(r, single) as number) > line.value).length;
        const each = plural(nameOf(x, spec));
        return `Here, ${above} of ${known.length} ${each} ${above === 1 ? "is" : "are"} above the ${line.name}, and ${standout}.`;
      }
      return standout ? `Here, ${standout}.` : "";
    }
    case "hbar": {
      const [label, amount] = [one(view.label), one(view.value)];
      const flow = label && amount ? pipeline(label, amount) : "";
      if (flow) return flow;
      const row = label && amount ? top(amount) : undefined;
      return row && label && amount ? `Here, ${text(row, label)} ${view.mark === "lollipop" ? "has the dot furthest right" : "is the longest"}, with ${text(row, amount)}.` : "";
    }
    case "line":
    case "area": {
      const x = one(view.x);
      const forecast = one(view.forecast);
      if (view.type === "area" && view.stacked === "percent" && series.length > 1 && x) {
        // A mix over time: which part grew its share the most, from the first period to the latest, and who leads now.
        const [start, last] = [rows[0], rows.at(-1)];
        if (!start || !last) return "";
        const share = (row: Row, field: string) => {
          const total = series.reduce((sum, f) => sum + Math.max(0, value(row, f) ?? 0), 0);
          return total > 0 ? Math.max(0, value(row, field) ?? 0) / total : 0;
        };
        const leader = series.reduce((b, field) => (share(last, field) > share(last, b) ? field : b), series[0] as string);
        const grower = series.reduce((b, field) => (share(last, field) - share(start, field) > share(last, b) - share(start, b) ? field : b), series[0] as string);
        const lead = `${nameOf(leader, spec)} has the largest share, at ${percent(share(last, leader))}`;
        if (start === last || share(last, grower) - share(start, grower) <= 0) return `Here, by ${text(last, x)}, ${lead}.`;
        const grew = `${nameOf(grower, spec)} grew its share the most, from ${percent(share(start, grower))} ${when(start, x)} to ${percent(share(last, grower))} ${when(last, x)}`;
        return grower === leader ? `Here, ${grew}, and is now the largest share.` : `Here, ${grew}; ${nameOf(leader, spec)} is still the largest share, at ${percent(share(last, leader))}.`;
      }
      if (view.type === "area" && view.stacked && view.stacked !== "percent" && series.length > 1) {
        // Stacked parts over time: which part grew the most, and which is thickest overall.
        const band = view.stacked === "stream" ? "thickest band" : "thickest layer";
        const sums = series.map((field) => rows.reduce((sum, row) => sum + Math.max(0, value(row, field) ?? 0), 0));
        const thickest = series[sums.indexOf(Math.max(...sums))] as string;
        if ((sums[series.indexOf(thickest)] ?? 0) <= 0) return "";
        const [start, last] = [rows[0], rows.at(-1)];
        const growth = (field: string) => (start && last ? (value(last, field) ?? 0) - (value(start, field) ?? 0) : 0);
        const grower = series.reduce((b, field) => (growth(field) > growth(b) ? field : b), series[0] as string);
        if (!start || !last || start === last || !x || growth(grower) <= 0) return `Here, ${nameOf(thickest, spec)} is the ${band} overall.`;
        const grew = `${nameOf(grower, spec)} grew the most, from ${text(start, grower)} ${when(start, x)} to ${text(last, grower)} ${when(last, x)}`;
        return grower === thickest ? `Here, ${grew}, and is the ${band} overall.` : `Here, ${grew}; ${nameOf(thickest, spec)} is still the ${band} overall.`;
      }
      // One line traces itself; with several, the first line speaks for the chart, by name.
      const traced = single ?? (view.stacked ? undefined : series[0]);
      if (!traced || !x) return "";
      // From the first value to the last actual one: a forecast is not something that happened.
      const known = rows.filter((row) => value(row, traced) !== null && !(forecast && (row[forecast] === true || row[forecast] === "true" || row[forecast] === 1)));
      const [first, last] = [known[0], known.at(-1)];
      const subject = single ? "it" : nameOf(traced, spec);
      // Against a target line: did the latest actual end past it, or short of it?
      const goal = targetLine(spec);
      const lastValue = last ? value(last, traced) : null;
      const against = goal && lastValue !== null ? `, ${lastValue >= goal.value ? "past" : "short of"} the ${goal.name} of ${formatValue(goal.value, spec.fields?.[traced]?.format, spec.locale)}` : "";
      // A forecast answers where it is heading: its last point, and the likely range when a band is drawn.
      const ahead = forecast ? rows.filter((row) => value(row, traced) !== null && (row[forecast] === true || row[forecast] === "true" || row[forecast] === 1)).at(-1) : undefined;
      const band = view.band as { low?: string; high?: string } | undefined;
      const range = ahead && band?.low && band?.high && value(ahead, band.low) !== null && value(ahead, band.high) !== null ? `, most likely between ${text(ahead, band.low)} and ${text(ahead, band.high)}` : "";
      const next = ahead ? `, and is expected to reach ${text(ahead, traced)} by ${text(ahead, x)}${range}` : "";
      return first && last && first !== last ? `Here, ${subject} went from ${text(first, traced)} ${when(first, x)} to ${text(last, traced)} ${when(last, x)}${against}${next}.` : "";
    }
    case "donut": {
      const [label, amount] = [one(view.label), one(view.value)];
      if (!label || !amount) return "";
      const total = rows.reduce((sum, row) => sum + Math.max(0, value(row, amount) ?? 0), 0);
      const row = top(amount);
      return row && total > 0 ? `Here, ${text(row, label)} is the biggest slice, with ${Math.round(((value(row, amount) as number) / total) * 100)}% of the whole.` : "";
    }
    case "treemap": {
      const [label, amount] = [one(view.label), one(view.value)];
      const row = label && amount ? top(amount) : undefined;
      return row && label && amount ? `Here, ${text(row, label)} is the biggest box, with ${text(row, amount)}.` : "";
    }
    case "rose": {
      const label = one(view.label);
      if (!label || series.length === 0) return "";
      const totals = rows.map((row) => series.reduce((sum, field) => sum + Math.max(0, value(row, field) ?? 0), 0));
      const best = totals.indexOf(Math.max(...totals));
      const row = rows[best];
      return row && (totals[best] ?? 0) > 0 ? `Here, ${text(row, label)} is the biggest slice.` : "";
    }
    case "scatter": {
      const [label, x, y] = [one(view.label), one(view.x), one(view.y)];
      // The question a scatter asks is whether the two numbers move together: answer that first, in plain words.
      const pairs = x && y ? rows.map((row) => [value(row, x), value(row, y)]).filter((pair): pair is [number, number] => pair[0] !== null && pair[1] !== null) : [];
      let link = "";
      if (x && y && pairs.length >= 5) {
        const r = correlation(pairs);
        const [across, up] = [nameOf(x, spec), nameOf(y, spec)];
        const goes = (name: string) => (isPlural(name) ? "go" : "goes");
        if (r >= 0.6) link = `when ${across} ${goes(across)} up, ${up} clearly ${goes(up)} up too.`;
        else if (r >= 0.25) link = `more ${across} tends to come with more ${up}, but not always.`;
        else if (r <= -0.6) link = `when ${across} ${goes(across)} up, ${up} clearly ${goes(up)} down.`;
        else if (r <= -0.25) link = `more ${across} tends to come with less ${up}, but not always.`;
        else link = `${across} and ${up} barely move together.`;
      }
      const row = label && y ? top(y) : undefined;
      const highest = row && label && y ? `${text(row, label)} sits highest, with the most ${nameOf(y, spec)}.` : "";
      if (link) return `Here, ${link}${highest ? ` ${highest.charAt(0).toUpperCase()}${highest.slice(1)}` : ""}`;
      return highest ? `Here, ${highest}` : "";
    }
    case "calendar": {
      const [date, amount] = [one(view.date), one(view.value)];
      const row = date && amount ? top(amount) : undefined;
      if (!row || !date || !amount) return "";
      // With two weeks or more, the weekly rhythm answers "which days": the busiest and quietest weekdays on average.
      const sums = Array<number>(7).fill(0);
      const counts = Array<number>(7).fill(0);
      for (const r of rows) {
        const when = typeof r[date] === "string" && /^\d{4}-\d{2}-\d{2}/.test(r[date] as string) ? new Date(`${(r[date] as string).slice(0, 10)}T00:00:00Z`) : null;
        const amountHere = value(r, amount);
        if (!when || Number.isNaN(when.getTime()) || amountHere === null) continue;
        const day = when.getUTCDay();
        sums[day] = (sums[day] ?? 0) + amountHere;
        counts[day] = (counts[day] ?? 0) + 1;
      }
      const topDay = `the top day ${rows.length >= 14 ? "was" : "is"} ${text(row, date)}, with ${text(row, amount)}`;
      if (counts.reduce((a, b) => a + b, 0) < 14 || counts.some((c) => c === 0)) return `Here, ${topDay}.`;
      const average = (d: number) => (sums[d] as number) / (counts[d] as number);
      const week = [1, 2, 3, 4, 5, 6, 0];
      const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const busiest = week.reduce((b, d) => (average(d) > average(b) ? d : b));
      const quietest = week.reduce((b, d) => (average(d) < average(b) ? d : b));
      const [weekdays, weekend] = [[1, 2, 3, 4, 5].reduce((sum, d) => sum + average(d), 0) / 5, (average(6) + average(0)) / 2];
      const rhythm = weekdays >= 1.5 * weekend ? "weekdays are much busier than weekends: " : weekend >= 1.5 * weekdays ? "weekends are much busier than weekdays: " : "";
      const show = (n: number) => formatValue(Math.round(n), spec.fields?.[amount]?.format, spec.locale);
      return `Here, ${rhythm}${names[busiest]} averages the most, ${show(average(busiest))}, and ${names[quietest]} the least, ${show(average(quietest))}. ${topDay.charAt(0).toUpperCase()}${topDay.slice(1)}.`;
    }
    case "heatmap": {
      const [x, y, amount] = [one(view.x), one(view.y), one(view.value)];
      const row = x && y && amount ? top(amount) : undefined;
      if (!row || !x || !y || !amount) return "";
      const named = (field: string) => fieldLabel(field, spec.fields).toLowerCase();
      // The rhythm first: the column and the row with the most in total, then the strongest single square.
      const totals = (field: string) => {
        const sums = new Map<string, { row: Row; sum: number }>();
        for (const r of rows) {
          const entry = sums.get(String(r[field])) ?? { row: r, sum: 0 };
          entry.sum += value(r, amount) ?? 0;
          sums.set(String(r[field]), entry);
        }
        return [...sums.values()].reduce((b, e) => (e.sum > b.sum ? e : b)).row;
      };
      const [topX, topY] = [totals(x), totals(y)];
      // Time across and days down is a weekly rhythm: busiest time and busiest day, the peak "Thu at 10-12".
      const timeAcross = /^(slot|time|hour|hours|period)$/i.test(x) || timeStep(x) === "hour";
      const peak = `the strongest square is ${text(row, y)} ${timeAcross ? "at" : "and"} ${text(row, x)}, with ${text(row, amount)}`;
      return timeAcross
        ? `Here, ${text(topX, x)} is the busiest ${named(x)} and ${text(topY, y)} the busiest ${named(y)}; ${peak}.`
        : `Here, the biggest ${named(x)} is ${text(topX, x)} and the biggest ${named(y)} is ${text(topY, y)}; ${peak}.`;
    }
    case "funnel": {
      const [label, amount] = [one(view.label), one(view.value)];
      if (!label || !amount) return "";
      let worst = { at: -1, drop: 0 };
      rows.forEach((row, i) => {
        const [before, after] = [value(rows[i - 1] ?? {}, amount), value(row, amount)];
        if (i > 0 && before && after !== null && before > 0 && 1 - after / before > worst.drop) worst = { at: i, drop: 1 - after / before };
      });
      const [from, to] = [rows[worst.at - 1], rows[worst.at]];
      return from && to ? `Here, the biggest drop is from ${text(from, label)} to ${text(to, label)}: ${percent(worst.drop)} stop there.` : "";
    }
    case "slope":
    case "dumbbell": {
      const [label, from, to] = [one(view.label), one(view.from), one(view.to)];
      if (!label || !from || !to) return "";
      const moved = (row: Row) => Math.abs((value(row, to) ?? 0) - (value(row, from) ?? 0));
      const paired = rows.filter((r) => value(r, from) !== null && value(r, to) !== null);
      const row = paired.reduce<Row | undefined>((best, r) => (best && moved(best) >= moved(r) ? best : r), undefined);
      if (!row) return "";
      // A slope, or a dumbbell between two periods, is before and after; other dumbbells compare two values, a gap.
      // With several rows, count first: how many went up, or for how many the first value is higher.
      const entity = nameOf(label, spec);
      const count = (k: number) => (k === paired.length ? `every ${entity}` : `${k} of ${paired.length} ${plural(entity)}`);
      const higher = paired.filter((r) => (value(r, to) as number) > (value(r, from) as number)).length;
      if (view.type === "slope" || (PERIOD.test(from) && PERIOD.test(to))) {
        const most = `${text(row, label)} moved the most, from ${text(row, from)} to ${text(row, to)}`;
        return paired.length > 1 ? `Here, ${count(higher)} went up, and ${most}.` : `Here, ${most}.`;
      }
      const gap = `${text(row, label)} has the biggest gap: ${text(row, from)} against ${text(row, to)}`;
      return paired.length > 1 ? `Here, ${nameOf(from, spec)} is higher than ${nameOf(to, spec)} for ${count(paired.length - higher - paired.filter((r) => value(r, to) === value(r, from)).length)}, and ${gap}.` : `Here, ${gap}.`;
    }
    case "bump": {
      const [x, group, amount] = [one(view.x), one(view.series), one(view.value)];
      if (!x || !group || !amount) return "";
      const periods = [...new Set(rows.map((row) => String(row[x])))];
      const rank = (period: string | undefined) => {
        const order = rows.filter((row) => String(row[x]) === period && value(row, amount) !== null).sort((a, b) => (value(b, amount) as number) - (value(a, amount) as number));
        return new Map(order.map((row, i) => [String(row[group]), i + 1]));
      };
      const [start, end] = [rank(periods[0]), rank(periods.at(-1))];
      let best = { name: "", from: 0, to: 0 };
      for (const [name, to] of end) {
        const from = start.get(name);
        if (from !== undefined && from - to > best.from - best.to) best = { name, from, to };
      }
      const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;
      return best.name ? `Here, ${best.name} moved up the most, from ${ordinal(best.from)} to ${ordinal(best.to)}.` : "";
    }
    case "likert": {
      const [label, answers] = [one(view.label), many(view.responses)];
      if (!label || answers.length < 2) return "";
      // The agreeing side is everything after the middle answer.
      const agreeing = answers.slice(Math.ceil(answers.length / 2));
      const share = (row: Row) => {
        const total = answers.reduce((sum, f) => sum + Math.max(0, value(row, f) ?? 0), 0);
        return total > 0 ? agreeing.reduce((sum, f) => sum + Math.max(0, value(row, f) ?? 0), 0) / total : 0;
      };
      const row = rows.reduce<Row | undefined>((best, r) => (best && share(best) >= share(r) ? best : r), undefined);
      if (!row || share(row) <= 0) return "";
      // The most agreed and the least agreed: where people stand together, and where to look first. Questions in quotes.
      const quoted = (r: Row) => `“${text(r, label)}”`;
      const most = `Here, the most agreed question is ${quoted(row)}: ${percent(share(row))} agree`;
      const least = rows.reduce((worst, r) => (share(r) < share(worst) ? r : worst), row);
      return least !== row && share(least) < share(row) ? `${most}, and the least agreed is ${quoted(least)}: ${percent(share(least))} agree.` : `${most}.`;
    }
    case "meter": {
      const [amount, target] = [one(view.value), one(view.target)];
      if (!amount || !target) return "";
      const measured = rows.filter((row) => value(row, amount) !== null && (value(row, target) ?? 0) > 0);
      const reached = measured.filter((row) => (value(row, amount) as number) >= (value(row, target) as number));
      return goalLine(measured.length, reached, one(view.label), "reached");
    }
    case "sunburst":
    case "icicle": {
      const [group, amount] = [many(view.levels)[0], one(view.value)];
      if (!group || !amount) return "";
      const totals = new Map<string, { row: Row; sum: number }>();
      for (const row of rows) {
        const key = String(row[group]);
        const entry = totals.get(key) ?? { row, sum: 0 };
        entry.sum += Math.max(0, value(row, amount) ?? 0);
        totals.set(key, entry);
      }
      const all = [...totals.values()];
      const total = all.reduce((sum, e) => sum + e.sum, 0);
      const biggest = all.reduce<{ row: Row; sum: number } | undefined>((best, e) => (best && best.sum >= e.sum ? best : e), undefined);
      if (!biggest || total <= 0) return "";
      const lead = `Here, ${text(biggest.row, group)} is the biggest ${nameOf(group, spec)}, with ${percent(biggest.sum / total)} of the total`;
      // One level down: inside the biggest group, the part that brings the most.
      const inner = many(view.levels)[1];
      if (!inner) return `${lead}.`;
      const parts = new Map<string, { row: Row; sum: number }>();
      for (const row of rows) {
        if (String(row[group]) !== String(biggest.row[group])) continue;
        const entry = parts.get(String(row[inner])) ?? { row, sum: 0 };
        entry.sum += Math.max(0, value(row, amount) ?? 0);
        parts.set(String(row[inner]), entry);
      }
      const part = [...parts.values()].reduce<{ row: Row; sum: number } | undefined>((best, e) => (best && best.sum >= e.sum ? best : e), undefined);
      return part && biggest.sum > 0 ? `${lead}; inside it, ${text(part.row, inner)} brings the most, ${percent(part.sum / biggest.sum)} of ${text(biggest.row, group)}.` : `${lead}.`;
    }
    case "histogram": {
      const field = one(view.value);
      if (!field) return "";
      const numbers = rows.map((row) => value(row, field)).filter((n): n is number => n !== null);
      const bins = binValues(numbers, typeof view.bins === "number" ? view.bins : sturges(numbers.length));
      const bin = bins.reduce<(typeof bins)[number] | undefined>((best, b) => (best && best.count >= b.count ? best : b), undefined);
      const edge = (n: number) => formatValue(n, spec.fields?.[field]?.format, spec.locale);
      return bin && bin.count > 0 ? `Here, the most common range is ${edge(bin.start)} to ${edge(bin.end)}, which happened ${bin.count} times.` : "";
    }
    case "horizon": {
      const x = one(view.x);
      const base = typeof view.baseline === "number" ? view.baseline : 0;
      if (!x || series.length === 0) return "";
      const above = series.map((field) => rows.reduce((sum, row) => sum + Math.max(0, (value(row, field) ?? base) - base), 0));
      const below = series.map((field) => rows.reduce((sum, row) => sum + Math.max(0, base - (value(row, field) ?? base)), 0));
      const [up, down] = [above.indexOf(Math.max(...above)), below.indexOf(Math.max(...below))];
      const name = (i: number) => fieldLabel(series[i] as string, spec.fields);
      const high = (above[up] ?? 0) > 0 ? `${name(up)} ran furthest above the baseline` : "";
      const low = (below[down] ?? 0) > 0 ? `${name(down)} dipped furthest below it` : "";
      return high || low ? `Here, ${[high, low].filter(Boolean).join(" and ")}.` : "";
    }
    case "waffle":
    case "pareto": {
      const [label, amount] = [one(view.label), one(view.value)];
      if (!label || !amount) return "";
      const total = rows.reduce((sum, row) => sum + Math.max(0, value(row, amount) ?? 0), 0);
      const row = top(amount);
      if (!row || total <= 0) return "";
      const share = percent((value(row, amount) as number) / total);
      if (view.type === "waffle") return `Here, ${text(row, label)} fills the most squares: ${share}.`;
      // A Pareto's question is how few make up most of the total: the fewest causes that reach the threshold line, by name.
      const threshold = typeof view.threshold === "number" ? view.threshold : 0.8;
      const sorted = rows.filter((r) => (value(r, amount) ?? 0) > 0).sort((a, b) => (value(b, amount) as number) - (value(a, amount) as number));
      let [kept, running] = [0, 0];
      while (kept < sorted.length && running / total < threshold) running += value(sorted[kept++] as Row, amount) as number;
      const what = nameOf(amount, spec);
      if (kept <= 1) return `Here, ${text(row, label)} alone makes up ${share} of the ${what}.`;
      const names = sorted.slice(0, kept).map((r) => text(r, label));
      const named = kept <= 5 ? `: ${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : `, led by ${names[0]}`;
      return `Here, ${kept} of ${sorted.length} ${plural(nameOf(label, spec))} make up ${percent(running / total)} of the ${what}${named}.`;
    }
    case "waterfall": {
      const [label, amount] = [one(view.label), one(view.value)];
      if (!label || !amount) return "";
      // The steps between the totals: the first row and any named totals are where the bridge starts and lands.
      const totals = new Set(many(view.totals));
      const steps = rows.slice(1).filter((row) => !totals.has(String(row[label])) && value(row, amount) !== null);
      // A bridge's story: where it started and landed, what added the most, and what took the most away.
      const first = rows[0];
      if (!first || value(first, amount) === null || !steps.length) return "";
      const start = value(first, amount) as number;
      const end = start + steps.reduce((sum, r) => sum + (value(r, amount) as number), 0);
      const money = (n: number) => formatValue(n, spec.fields?.[amount]?.format, spec.locale);
      const extreme = (sign: 1 | -1) => steps.filter((r) => sign * (value(r, amount) as number) > 0).reduce<Row | undefined>((best, r) => (best && sign * (value(best, amount) as number) >= sign * (value(r, amount) as number) ? best : r), undefined);
      const [gain, loss] = [extreme(1), extreme(-1)];
      const parts = [
        gain ? `${text(gain, label)} added the most, ${money(value(gain, amount) as number)}` : "",
        loss ? `${text(loss, label)} took the most away, ${money(Math.abs(value(loss, amount) as number))}` : "",
      ].filter(Boolean);
      const landing = typeof view.endLabel === "string" && view.endLabel ? view.endLabel : "the end";
      return `Here, it went from ${money(start)} (${text(first, label)}) to ${money(end)} (${landing}): ${parts.join(", and ")}.`;
    }
    case "ridgeline":
    case "boxplot": {
      const [amount, group] = [one(view.value), one(view.group)];
      if (!amount || !group) return "";
      const groups = new Map<string, { row: Row; values: number[] }>();
      for (const row of rows) {
        const v = value(row, amount);
        if (v === null) continue;
        const entry = groups.get(String(row[group])) ?? { row, values: [] };
        entry.values.push(v);
        groups.set(String(row[group]), entry);
      }
      const middle = (values: number[]) => {
        const sorted = [...values].sort((a, b) => a - b);
        const half = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? (sorted[half] as number) : ((sorted[half - 1] as number) + (sorted[half] as number)) / 2;
      };
      const best = [...groups.values()].reduce<{ row: Row; values: number[] } | undefined>((b, g) => (b && middle(b.values) >= middle(g.values) ? b : g), undefined);
      if (!best) return "";
      const show = (n: number) => formatValue(n, spec.fields?.[amount]?.format, spec.locale);
      const mid = show(middle(best.values));
      const lead = view.type === "ridgeline" ? `Here, ${text(best.row, group)} sits furthest right, with a middle value of ${mid}.` : `Here, ${text(best.row, group)} has the highest middle value, ${mid}.`;
      // The spread question: which group varies the most, told by its middle half (the box), when the groups differ.
      const quartile = (values: number[], p: number) => {
        const sorted = [...values].sort((a, b) => a - b);
        const at = (sorted.length - 1) * p;
        const [low, high] = [Math.floor(at), Math.ceil(at)];
        return (sorted[low] as number) + ((sorted[high] as number) - (sorted[low] as number)) * (at - low);
      };
      const width = (values: number[]) => quartile(values, 0.75) - quartile(values, 0.25);
      const all = [...groups.values()].filter((g) => g.values.length >= 2);
      if (all.length < 2) return lead;
      const widest = all.reduce((b, g) => (width(g.values) > width(b.values) ? g : b));
      const narrowest = all.reduce((b, g) => (width(g.values) < width(b.values) ? g : b));
      if (width(widest.values) - width(narrowest.values) <= 1e-9) return lead;
      const half = `its middle half runs from ${show(quartile(widest.values, 0.25))} to ${show(quartile(widest.values, 0.75))}`;
      // One group leading both reads as one sentence, not its name twice.
      return widest === best ? `${lead.slice(0, -1)}, and varies the most: ${half}.` : `${lead} ${text(widest.row, group)} varies the most: ${half}.`;
    }
    case "variance": {
      const [label, amount, target] = [one(view.label), one(view.value), one(view.target)];
      if (!label || !amount || !target) return "";
      const gap = (row: Row) => Math.abs((value(row, amount) ?? 0) - (value(row, target) ?? 0));
      const row = rows.filter((r) => value(r, amount) !== null && value(r, target) !== null).reduce<Row | undefined>((best, r) => (best && gap(best) >= gap(r) ? best : r), undefined);
      if (!row) return "";
      // In target terms first: how many are over, then the one furthest from its target.
      const paired = rows.filter((r) => value(r, amount) !== null && value(r, target) !== null);
      const over = paired.filter((r) => (value(r, amount) as number) > (value(r, target) as number)).length;
      const [entity, goal] = [nameOf(label, spec), nameOf(target, spec)];
      const count =
        over === 0 ? `every ${entity} is at or under its ${goal}` : over === 1 ? `1 of ${paired.length} ${plural(entity)} is over its ${goal}` : `${over} of ${paired.length} ${plural(entity)} are over their ${goal}`;
      return `Here, ${count}, and ${text(row, label)} is furthest from it: ${text(row, amount)} against ${text(row, target)}.`;
    }
    case "marimekko": {
      const [x, amount] = [one(view.x), one(view.value)];
      if (!x || !amount) return "";
      const columns = new Map<string, { row: Row; sum: number }>();
      for (const row of rows) {
        const entry = columns.get(String(row[x])) ?? { row, sum: 0 };
        entry.sum += Math.max(0, value(row, amount) ?? 0);
        columns.set(String(row[x]), entry);
      }
      const best = [...columns.values()].reduce<{ row: Row; sum: number } | undefined>((b, c) => (b && b.sum >= c.sum ? b : c), undefined);
      if (!best || best.sum <= 0) return "";
      const widest = `Here, ${text(best.row, x)} is the widest column, with ${formatValue(best.sum, spec.fields?.[amount]?.format, spec.locale)}`;
      // How the widest column splits: its biggest part, as a share of the column.
      const part = one(view.series);
      if (!part) return `${widest}.`;
      const inside = rows.filter((r) => String(r[x]) === String(best.row[x]) && value(r, amount) !== null);
      const biggest = inside.reduce<Row | undefined>((b, r) => (b && (value(b, amount) as number) >= (value(r, amount) as number) ? b : r), undefined);
      return biggest ? `${widest}; ${text(biggest, part)} is its biggest part, ${percent(Math.max(0, value(biggest, amount) as number) / best.sum)}.` : `${widest}.`;
    }
    case "gauge": {
      const [amount, target] = [one(view.value), one(view.target)];
      const row = rows.find((r) => amount && value(r, amount) !== null);
      if (!row || !amount) return "";
      const goal = target ? value(row, target) : null;
      const where = goal === null ? "" : (value(row, amount) as number) >= goal ? `, past the goal of ${text(row, target as string)}` : `, short of the goal of ${text(row, target as string)}`;
      return `Here, the needle is at ${text(row, amount)}${where}.`;
    }
    case "candlestick": {
      const [open, close] = [one(view.open), one(view.close)];
      if (!open || !close) return "";
      const days = rows.filter((row) => value(row, open) !== null && value(row, close) !== null);
      const up = days.filter((row) => (value(row, close) as number) > (value(row, open) as number)).length;
      const step = timeStep(one(view.x) ?? "");
      return days.length ? `Here, ${up} of ${days.length} ${step ? plural(step) : "candles"} went up.` : "";
    }
    case "sankey":
    case "chord": {
      const [from, to, amount] = [one(view.source), one(view.target), one(view.value)];
      const row = from && to && amount ? top(amount) : undefined;
      if (!row || !from || !to || !amount) return "";
      return view.type === "sankey"
        ? `Here, the thickest band goes from ${text(row, from)} to ${text(row, to)}, with ${text(row, amount)}.`
        : `Here, the thickest band joins ${text(row, from)} and ${text(row, to)}, with ${text(row, amount)}.`;
    }
    case "radar": {
      const label = one(view.label);
      const first = series[0];
      const row = label && first ? top(first) : undefined;
      if (!row || !label || !first) return "";
      // Two profiles side by side: where the first leads, by how much at most, and where it trails the most.
      const second = series[1];
      const paired = second ? rows.filter((r) => value(r, first) !== null && value(r, second) !== null) : [];
      if (series.length === 2 && second && paired.length > 1) {
        const gap = (r: Row) => (value(r, first) as number) - (value(r, second) as number);
        const ahead = paired.filter((r) => gap(r) > 0);
        if (ahead.length) {
          const lead = ahead.reduce((b, r) => (gap(r) > gap(b) ? r : b));
          const behind = paired.filter((r) => gap(r) < 0);
          const trail = behind.length ? behind.reduce((b, r) => (gap(r) < gap(b) ? r : b)) : undefined;
          const entity = nameOf(label, spec);
          const count = ahead.length === paired.length ? `every ${entity}` : `${ahead.length} of ${paired.length} ${plural(entity)}`;
          const pair = (r: Row) => `${text(r, first)} against ${text(r, second)}`;
          return `Here, ${nameOf(first, spec)} is ahead of ${nameOf(second, spec)} on ${count}, most on ${text(lead, label)} (${pair(lead)})${trail ? `, and behind on ${text(trail, label)} (${pair(trail)})` : ""}.`;
        }
      }
      return `Here, the highest score is ${text(row, label)}, at ${text(row, first)}.`;
    }
    case "beeswarm": {
      const [amount, label] = [one(view.value), one(view.label)];
      const row = amount ? top(amount) : undefined;
      if (!row || !amount) return "";
      const furthest = label ? `the dot furthest right of all is ${text(row, label)}, at ${text(row, amount)}` : `the dot furthest right of all is at ${text(row, amount)}`;
      // By group: which group's dots sit furthest right (the highest middle value), then the biggest single dot.
      const group = one(view.group);
      if (group) {
        const byGroup = new Map<string, number[]>();
        for (const r of rows) {
          const v = value(r, amount);
          if (v !== null) byGroup.set(String(r[group]), [...(byGroup.get(String(r[group])) ?? []), v]);
        }
        if (byGroup.size >= 2) {
          const middle = (values: number[]) => {
            const sorted = [...values].sort((a, b) => a - b);
            const half = Math.floor(sorted.length / 2);
            return sorted.length % 2 ? (sorted[half] as number) : ((sorted[half - 1] as number) + (sorted[half] as number)) / 2;
          };
          const [lead, values] = [...byGroup.entries()].reduce((b, e) => (middle(e[1]) > middle(b[1]) ? e : b));
          return `Here, ${lead}'s dots sit furthest right, with a middle value of ${formatValue(middle(values), spec.fields?.[amount]?.format, spec.locale)}, and ${furthest}.`;
        }
      }
      return label ? `Here, the dot furthest right is ${text(row, label)}, at ${text(row, amount)}.` : `Here, the dot furthest right is at ${text(row, amount)}.`;
    }
    case "rings": {
      const [label, amount, target] = [one(view.label), one(view.value), one(view.target)];
      if (!label || !amount || !target) return "";
      const share = (row: Row) => (value(row, amount) ?? 0) / (value(row, target) || 1);
      const row = rows.filter((r) => (value(r, target) ?? 0) > 0).reduce<Row | undefined>((best, r) => (best && share(best) >= share(r) ? best : r), undefined);
      if (!row) return "";
      return share(row) >= 1 ? `Here, ${text(row, label)} has reached its goal, at ${percent(share(row))}.` : `Here, ${text(row, label)} is closest to its goal, at ${percent(share(row))}.`;
    }
    case "bullet": {
      const [amount, target] = [one(view.value), one(view.target)];
      if (!amount || !target) return "";
      const measured = rows.filter((row) => value(row, amount) !== null && value(row, target) !== null);
      const passed = measured.filter((row) => (value(row, amount) as number) >= (value(row, target) as number));
      return goalLine(measured.length, passed, one(view.label), "passed");
    }
    case "timeline": {
      const [label, start, end] = [one(view.label), one(view.start), one(view.end)];
      if (!label || !start || !end) return "";
      const length = (row: Row) => Date.parse(String(row[end])) - Date.parse(String(row[start]));
      const row = rows.filter((r) => Number.isFinite(length(r))).reduce<Row | undefined>((best, r) => (best && length(best) >= length(r) ? best : r), undefined);
      if (!row) return "";
      // With progress, a plan says how much is done and under way (milestones without progress are left out), and how far along the longest task is.
      const progress = one(view.progress);
      const tracked = progress ? rows.filter((r) => value(r, progress) !== null) : [];
      if (!progress || tracked.length < 2) return `Here, the longest task is ${text(row, label)}.`;
      const entity = nameOf(label, spec);
      const done = tracked.filter((r) => (value(r, progress) as number) >= 1).length;
      const underway = tracked.filter((r) => (value(r, progress) as number) > 0 && (value(r, progress) as number) < 1).length;
      const doneText = done === tracked.length ? `every ${entity} is done` : done === 0 ? `no ${entity} is done yet` : `${done} of ${tracked.length} ${plural(entity)} ${done === 1 ? "is" : "are"} done`;
      const wayText = underway ? ` and ${underway} ${underway === 1 ? "is" : "are"} under way` : "";
      const along = value(row, progress);
      const longest = along === null ? "" : along >= 1 ? `; the longest, ${text(row, label)}, is done` : along <= 0 ? `; the longest, ${text(row, label)}, has not started` : `; the longest, ${text(row, label)}, is ${percent(along)} done`;
      return `Here, ${doneText}${wayText}${longest}.`;
    }
    case "kpi": {
      const amount = one(view.value);
      if (!amount) return "";
      const known = rows.filter((row) => value(row, amount) !== null);
      const [before, now] = [known.at(-2), known.at(-1)];
      if (!now) return "";
      // Against a target: past or short of it, or for a lower-is-better number, under or above it. In the number's own format.
      const goalField = one(view.target);
      const goal = goalField ? value(now, goalField) : null;
      const latest = value(now, amount) as number;
      const down = view.goodWhen === "down";
      const against =
        goal === null ? "" : `, ${down ? (latest <= goal ? "under" : "above") : latest >= goal ? "past" : "short of"} its target of ${formatValue(goal, spec.fields?.[amount]?.format, spec.locale)}`;
      if (!before) return `Here, it is ${text(now, amount)}${against}.`;
      const a = value(before, amount) as number;
      return `Here, it is ${text(now, amount)}, ${latest > a ? "up from" : latest < a ? "down from" : "the same as"} ${text(before, amount)}${against}.`;
    }
    case "kpis": {
      // Headline tiles: did each number move the right way since last time (down is right for a goodWhen down tile)?
      const items = (Array.isArray(view.items) ? view.items : []) as { value?: unknown; label?: unknown; goodWhen?: unknown; target?: unknown }[];
      const [before, now] = view.series ? [rows.at(-2), rows.at(-1)] : [undefined, rows[0]];
      if (!now || !before || items.length < 2) return "";
      const named = (item: (typeof items)[number]) => (typeof item.label === "string" && item.label ? item.label.toLowerCase() : nameOf(String(item.value), spec));
      const moves = items
        .filter((item) => typeof item.value === "string" && value(now, item.value) !== null && value(before, item.value) !== null)
        .map((item) => {
          const field = item.value as string;
          const change = (value(now, field) as number) - (value(before, field) as number);
          const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
          return { item, direction, right: direction === (item.goodWhen === "down" ? "down" : "up") };
        });
      if (moves.length < 2) return "";
      const right = moves.filter((m) => m.right);
      const and = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? ""));
      let summary: string;
      if (right.length === moves.length) {
        const [ups, downs] = [moves.filter((m) => m.direction === "up").map((m) => named(m.item)), moves.filter((m) => m.direction === "down").map((m) => named(m.item))];
        summary = `Here, every number moved the right way since last time: ${[ups.length ? `${and(ups)} went up` : "", downs.length ? `${and(downs)} went down` : ""].filter(Boolean).join(", and ")}.`;
      } else {
        const wrong = moves.filter((m) => !m.right && m.direction !== "flat").map((m) => named(m.item));
        summary = `Here, ${right.length} of ${moves.length} numbers moved the right way since last time${wrong.length ? `; ${and(wrong)} did not` : ""}.`;
      }
      // A tile with a target says where it stands.
      const targeted = items.find((item) => typeof item.target === "string" && typeof item.value === "string" && value(now, item.target as string) !== null && value(now, item.value as string) !== null);
      if (!targeted) return summary;
      const [field, goal] = [targeted.value as string, targeted.target as string];
      const down = targeted.goodWhen === "down";
      const met = down ? (value(now, field) as number) <= (value(now, goal) as number) : (value(now, field) as number) >= (value(now, goal) as number);
      const where = down ? (met ? "under" : "above") : met ? "past" : "short of";
      const label = named(targeted);
      return `${summary} ${label.charAt(0).toUpperCase()}${label.slice(1)} is ${where} its target of ${formatValue(value(now, goal), spec.fields?.[field]?.format, spec.locale)}.`;
    }
    case "table": {
      // The first text column names the rows; the first number column is what they are compared on.
      const columns = many(view.columns).length ? many(view.columns) : Object.keys(rows[0] ?? {});
      const label = columns.find((field) => rows.some((row) => typeof row[field] === "string"));
      const numbers = columns.filter((field) => field !== label && rows.some((row) => typeof row[field] === "number"));
      // Period columns (2026-09) are a time series laid sideways: the latest one is the one to read.
      const periods = numbers.filter((field) => /^\d{4}(-\d{2})?/.test(field));
      const amount = periods.length ? periods.at(-1) : numbers[0];
      const row = label && amount ? top(amount) : undefined;
      if (!row || !label || !amount) return "";
      // A column of gaps against a target: how many rows are above it, by name.
      const gap = numbers.find((field) => {
        const format = spec.fields?.[field]?.format;
        return (typeof format === "object" ? (format as { type?: string }).type : format) === "delta" && /target|plan|goal|budget|quota/i.test(`${field} ${spec.fields?.[field]?.label ?? ""}`);
      });
      if (gap) {
        const known = rows.filter((r) => value(r, gap) !== null);
        const above = known.filter((r) => (value(r, gap) as number) > 0);
        const entity = nameOf(label, spec);
        if (known.length > 1) {
          if (above.length === known.length) return `Here, every ${entity} is above target.`;
          if (above.length === 0) return `Here, every ${entity} is below target.`;
          const names = above.map((r) => text(r, label));
          const listed = names.length <= 3 ? `: ${names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]}` : "";
          return `Here, ${above.length} of ${known.length} ${plural(entity)} ${above.length === 1 ? "is" : "are"} above target${listed}.`;
        }
      }
      // Months laid sideways ask how each row did: how many grew from the first month to the last, and who grew most.
      if (periods.length >= 2) {
        const [from, to] = [periods[0] as string, periods.at(-1) as string];
        const paired = rows.filter((r) => value(r, from) !== null && value(r, to) !== null);
        const growth = (r: Row) => (value(r, to) as number) - (value(r, from) as number);
        const grew = paired.filter((r) => growth(r) > 0);
        if (paired.length > 1 && grew.length) {
          const best = grew.reduce((b, r) => (growth(r) > growth(b) ? r : b));
          const entity = nameOf(label, spec);
          const count = grew.length === paired.length ? `every ${entity}` : `${grew.length} of ${paired.length} ${plural(entity)}`;
          return `Here, ${count} grew from ${fieldLabel(from, spec.fields)} to ${fieldLabel(to, spec.fields)}, and ${text(best, label)} grew the most, from ${text(best, from)} to ${text(best, to)}.`;
        }
      }
      return periods.length
        ? `Here, ${text(row, label)} is the top row in ${fieldLabel(amount, spec.fields)}, at ${text(row, amount)}.`
        : `Here, ${text(row, label)} is the top row by ${nameOf(amount, spec)}, at ${text(row, amount)}.`;
    }
    case "list": {
      const [label, amount] = [one(view.label), one(view.value)];
      const row = rows[0];
      return row && label ? `Here, ${text(row, label)} is at the top${amount && value(row, amount) !== null ? `, with ${text(row, amount)}` : ""}.` : "";
    }
    default:
      return "";
  }
}

/** A field's name in the middle of a sentence: "revenue", but "North" and "NPS" keep their capitals. */
function nameOf(field: string, spec: WidgetSpec): string {
  const label = fieldLabel(field, spec.fields);
  return /^[a-z]/.test(field) && /^[A-Z][a-z]*\b/.test(label) ? label[0]?.toLowerCase() + label.slice(1) : label;
}

/** How closely two numbers move together, from -1 (one up, the other down) through 0 (no link) to 1 (up together). */
function correlation(pairs: [number, number][]): number {
  const n = pairs.length;
  const [mx, my] = [pairs.reduce((sum, [a]) => sum + a, 0) / n, pairs.reduce((sum, [, b]) => sum + b, 0) / n];
  let [sxy, sxx, syy] = [0, 0, 0];
  for (const [a, b] of pairs) {
    sxy += (a - mx) * (b - my);
    sxx += (a - mx) ** 2;
    syy += (b - my) ** 2;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
}

/** The plural of a one-word noun: "region" to "regions", "category" to "categories". */
const plural = (noun: string) => (/[^aeiou]y$/.test(noun) ? `${noun.slice(0, -1)}ies` : /(s|x|ch|sh)$/.test(noun) ? `${noun}es` : `${noun}s`);

/** A share as a whole percentage: 0.8 is "80%". */
const percent = (share: number) => `${Math.round(share * 100)}%`;

/** The general reading guide for a view, from its options alone. */
function guide(spec: WidgetSpec): string {
  const view = (spec.view ?? { type: "table" }) as View;
  const fields = spec.fields;
  // A field's name in the middle of a sentence: "revenue", but "North" and "NPS" keep their capitals.
  const name = (field: string | undefined, fallback = "value"): string => {
    if (!field) return fallback;
    const label = fieldLabel(field, fields);
    const plain = /^[a-z]/.test(field) && /^[A-Z][a-z]+\b/.test(label);
    return plain ? label[0]?.toLowerCase() + label.slice(1) : label;
  };
  // A field called name, title or label says nothing about what the marks are: they are entries.
  const noun = (field: string | undefined, fallback = "item") => (/^(name|title|label)$/i.test(field ?? "") ? "entry" : name(field, fallback));
  const either = (list: string[]) => (list.length < 2 ? list.join("") : `${list.slice(0, -1).join(", ")} or ${list.at(-1)}`);
  const both = (list: string[]) => (list.length < 2 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`);
  // How time passes in words: "month by month" for a month field, "over time" for an unknown date.
  const over = (field: string | undefined) => {
    const unit = /^(day|week|month|quarter|year|hour)s?$/i.exec(field ?? "")?.[1]?.toLowerCase();
    return unit ? `${unit} by ${unit}` : field ? `along ${name(field)}` : "over time";
  };
  const series = many(view.y);
  const colors = series.length > 1 ? ` Each color is one line: ${either(series.map((f) => name(f)))}.` : "";
  const forecast = view.forecast ? " The dashed part is a forecast, a careful guess about what comes next; the shaded area shows how sure it is: the wider, the less sure." : "";

  switch (view.type) {
    case "bar": {
      const lollipop = view.mark === "lollipop";
      const mark = lollipop ? "stick with a dot" : "bar";
      const more = lollipop ? "The higher the dot" : "The taller the bar";
      if (series.length > 1 && view.stacked) return `Each bar is one ${name(one(view.x))}, split into colored parts for ${both(series.map((f) => name(f)))}. ${view.stacked === "percent" ? "Every bar adds up to 100%, so compare the sizes of the parts." : "The parts add up to the total, so the whole bar is the total."}`;
      if (series.length > 1) return `Each group of bars is one ${name(one(view.x))}, with one color each for ${both(series.map((f) => name(f)))}. The taller the bar, the more.`;
      const goal = one(view.lines);
      // Bars short of a target are drawn outlined (a shape cue, the same in light and dark themes).
      const outlined = !lollipop && goal && /target|plan|goal|budget|quota/i.test(goal) ? `, and an outlined ${mark} fell short` : "";
      const line = goal ? ` The line is the ${name(goal)}: a ${mark} that reaches past it beat the ${name(goal)}${outlined}.` : "";
      return `Each ${mark} is one ${name(one(view.x))}. ${more}, the more ${name(series[0])}.${line}`;
    }
    case "hbar":
      return view.mark === "lollipop"
        ? `Each row is one ${noun(one(view.label))}. The further right the dot, the more ${name(one(view.value))}.`
        : `Each row is one ${noun(one(view.label))}. The longer the bar, the more ${name(one(view.value))}.`;
    case "line":
      return `The line shows how ${series.length > 1 ? "each value" : name(series[0])} changes ${over(one(view.x))}: going up means more.${colors}${forecast}`;
    case "area":
      if (view.stacked === "stream") return `Each colored band is one of ${either(series.map((f) => name(f)))}. The thicker a band at a moment, the more it had then; the whole stream's height is the total.`;
      if (view.stacked) return `Colored layers stack on top of each other, ${over(one(view.x))}; the top edge is the total and each layer's thickness is its part.`;
      return `The filled shape shows how ${name(series[0])} changes ${over(one(view.x))}: higher means more.${colors}${forecast}`;
    case "kpi":
      return `The big number is ${name(one(view.value))}. The small arrow says whether it went up or down since last time${one(view.target) ? ", and the line under it says whether it reached its target" : ""}.`;
    case "kpis": {
      const targeted = Array.isArray(view.items) && view.items.some((item) => typeof (item as { target?: unknown }).target === "string");
      return `Each tile is one key number, with a small arrow that says whether it went up or down since last time.${targeted ? " A line under a tile says whether it reached its target." : ""}`;
    }
    case "meter":
      return `Each bar fills up toward its target. A full bar means the goal for ${name(one(view.value))} is reached; the percentage says how close it is.`;
    case "bullet":
      return "The solid bar is the real number and the thin line is the goal. The shaded bands behind show poor, fair and good.";
    case "donut":
      return `The ring is the whole. Each slice is one ${noun(one(view.label))}: the bigger the slice, the bigger its share of ${name(one(view.value))}.`;
    case "treemap":
      return `Each box is one ${noun(one(view.label))}. The bigger the box, the more ${name(one(view.value))}.`;
    case "funnel":
      return "Each step keeps fewer people than the one before. The number between two steps says how many made it through.";
    case "waterfall":
      return "Start at the first bar. Each bar after it goes up for something that added and down for something that took away, and you land on the final total.";
    case "heatmap":
      // Color scales flip on a dark card (more is brighter there), so the guide speaks of strength, never of darkness.
      return `Each square is one ${name(one(view.x))} and ${name(one(view.y))} together. The stronger the color, the more ${name(one(view.value))}.`;
    case "calendar":
      return `Each square is one day, with weeks as columns. The stronger the color, the more ${name(one(view.value))}; the key under the chart shows the scale.`;
    case "scatter": {
      const sized = one(view.size) ? ` Bigger dots mean more ${name(one(view.size))}.` : "";
      return `Each dot is one ${noun(one(view.label))}. Further right means more ${name(one(view.x))}; higher means more ${name(one(view.y))}.${sized}`;
    }
    case "beeswarm":
      return `Each dot is one ${name(one(view.label), "row")}, placed by its ${name(one(view.value))}. Dots pile up where many values are close together.`;
    case "ridgeline":
      return `Each hill shows how ${name(one(view.value))} spreads in one group. Where the hill is tallest is where most values are; a hill further right has bigger values.`;
    case "sankey":
      return "Bands flow from left to right, splitting and joining. The thicker the band, the more goes that way.";
    case "dumbbell": {
      const [from, to] = [one(view.from), one(view.to)];
      const change = from && to && PERIOD.test(from) && PERIOD.test(to);
      return `Each row has two dots: ${name(from, "the first value")} and ${name(to, "the second")}. The line between them is the ${change ? "change" : "gap"}.`;
    }
    case "slope":
      return `Each line joins the before and the after for one ${name(one(view.label))}. A line going up means it grew; a steeper line means a bigger change.`;
    case "bump":
      return `Each line is one ${name(one(view.series), "competitor")}'s rank, ${over(one(view.x))}. Higher on the chart means a better rank; lines crossing mean places swapped.`;
    case "marimekko":
      return `Each column is one ${name(one(view.x))}: the wider the column, the bigger its total, and its colored parts show how it splits by ${name(one(view.series), "group")}.`;
    case "histogram":
      return `Each bar is one range of ${name(one(view.value))}. The taller the bar, the more often a value in that range happened; the dashed line is the middle value.`;
    case "rings":
      return "Each ring fills up toward its goal. A full circle means the goal is met.";
    case "timeline":
      return "Each bar is one task, from its start date to its end date; the solid part is how much is done. The vertical line marks today.";
    case "waffle":
      return "There are 100 squares, so each colored square is one percent of the whole.";
    case "variance":
      // Read by side and the written gap, never by color: presets recolor good and bad.
      return `Each bar shows how far one ${name(one(view.label))} is from its ${name(one(view.target), "plan")}: to the right when above it, to the left when below, with the gap written beside it. ${view.goodWhen === "down" ? "Below" : "Above"} the ${name(one(view.target), "plan")} is better. The longer the bar, the bigger the gap.`;
    case "gauge":
      return "The needle points to the number on a scale from low to high. The small mark on the arc is the goal.";
    case "pareto":
      return "Bars are sorted from biggest to smallest. The line adds them up as it goes, so you can see which few causes make up most of the total.";
    case "boxplot":
      return "The box holds the middle half of the values and the line inside is the middle value. The whiskers reach the normal range; dots beyond are unusual values.";
    case "likert":
      return "Each bar splits the answers to one question, from disagree on the left to agree on the right, centered on neutral. The longer the right side, the more people agree.";
    case "candlestick": {
      // Read by shape, never by color alone: up candles are hollow and down candles filled, in every preset.
      const x = one(view.x);
      const step = (x && timeStep(x)) ?? "period";
      const average = typeof view.average === "number" && view.average > 1 ? ` The line is the average of the last ${view.average} closing prices.` : "";
      return `Each candle is one ${step}. The thick box goes from the opening price to the closing price and the thin line from the lowest to the highest. Hollow candles went up, filled candles went down.${average}`;
    }
    case "sunburst":
      return "The inner ring shows the biggest groups. Each ring further out splits them into smaller parts; a wider slice means more.";
    case "chord":
      return "Each group sits on the circle. Each band connects two groups: the thicker the band, the more moved between them.";
    case "radar":
      return `Each spoke is one ${name(one(view.label))}. The further a point sits from the center, the higher the score; a bigger shape is better overall.`;
    case "rose":
      return `Each slice is one ${name(one(view.label))}, going round like a clock. The bigger a slice's area, the more ${series.length > 1 ? `in that ${name(one(view.label))}` : name(series[0])}.${series.length > 1 ? ` The colors are ${both(series.map((f) => name(f)))}, stacked from the center out.` : ""}`;
    case "horizon":
      return `Each row is one of ${series.length > 1 && series.length <= 8 ? either(series.map((f) => name(f))) : "the series"}, ${over(one(view.x))}. Values above the baseline rise from the bottom of the row, and values below hang from its top; the stronger the shade, the further away it is.`;
    case "icicle":
      return `The first column is the total. Each column to the right splits the boxes into smaller parts: the taller the box, the more ${name(one(view.value))}.`;
    case "list":
      // A field called name, title or label says nothing about what the lines are: they are entries.
      return `Each line is one ${/^(name|title|label)$/i.test(one(view.label) ?? "") ? "entry" : name(one(view.label))}${one(view.value) ? `, with its ${name(one(view.value))} on the right` : ""}.`;
    case "table": {
      // Months laid sideways and shaded cells say more than "records and details".
      const columns = many(view.columns);
      const months = columns.filter((c) => /^\d{4}-\d{2}$/.test(c));
      const shape = columns[0] && months.length >= 2 && !months.includes(columns[0]) ? `Each row is one ${noun(columns[0])} and each column one month.` : "Each row is one record and each column one detail.";
      const shaded = columns.some((c) => {
        const format = spec.fields?.[c]?.format;
        return (typeof format === "object" ? (format as { type?: string }).type : format) === "heat";
      });
      return `${shape}${shaded ? " The stronger the shade, the bigger the number." : ""}${view.sortable === false ? "" : " Click a column heading to sort by it."}`;
    }
    default:
      return "Each mark stands for one value. Bigger, longer or stronger marks mean more.";
  }
}
