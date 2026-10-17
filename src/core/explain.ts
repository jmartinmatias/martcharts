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
      if (series.length > 1 && !view.stacked) {
        let best: { row: Row; field: string } | undefined;
        for (const row of rows) for (const field of series) if (value(row, field) !== null && (!best || (value(row, field) as number) > (value(best.row, best.field) as number))) best = { row, field };
        return best ? `Here, the tallest bar is ${text(best.row, x)}'s ${nameOf(best.field, spec)}, with ${text(best.row, best.field)}.` : "";
      }
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
      const row = label && amount ? top(amount) : undefined;
      return row && label && amount ? `Here, ${text(row, label)} ${view.mark === "lollipop" ? "has the dot furthest right" : "is the longest"}, with ${text(row, amount)}.` : "";
    }
    case "line":
    case "area": {
      const x = one(view.x);
      const forecast = one(view.forecast);
      if (view.type === "area" && view.stacked === "percent" && series.length > 1 && x) {
        // The mix at the latest period: whose share is largest now.
        const last = rows.at(-1);
        if (!last) return "";
        const total = series.reduce((sum, field) => sum + Math.max(0, value(last, field) ?? 0), 0);
        const best = series.reduce((b, field) => ((value(last, field) ?? 0) > (value(last, b) ?? 0) ? field : b), series[0] as string);
        return total > 0 ? `Here, by ${text(last, x)}, ${nameOf(best, spec)} has the largest share, at ${percent(Math.max(0, value(last, best) ?? 0) / total)}.` : "";
      }
      if (view.type === "area" && view.stacked && view.stacked !== "percent" && series.length > 1) {
        const sums = series.map((field) => rows.reduce((sum, row) => sum + Math.max(0, value(row, field) ?? 0), 0));
        const best = sums.indexOf(Math.max(...sums));
        return (sums[best] ?? 0) > 0 ? `Here, ${nameOf(series[best] as string, spec)} is the ${view.stacked === "stream" ? "thickest band" : "thickest layer"} overall.` : "";
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
      return first && last && first !== last ? `Here, ${subject} went from ${text(first, traced)} in ${text(first, x)} to ${text(last, traced)} in ${text(last, x)}${against}.` : "";
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
      const [label, y] = [one(view.label), one(view.y)];
      const row = label && y ? top(y) : undefined;
      return row && label && y ? `Here, ${text(row, label)} sits highest, with the most ${fieldLabel(y, spec.fields).toLowerCase()}.` : "";
    }
    case "calendar": {
      const [date, amount] = [one(view.date), one(view.value)];
      const row = date && amount ? top(amount) : undefined;
      return row && date && amount ? `Here, the top day is ${text(row, date)}, with ${text(row, amount)}.` : "";
    }
    case "heatmap": {
      const [x, y, amount] = [one(view.x), one(view.y), one(view.value)];
      const row = x && y && amount ? top(amount) : undefined;
      const named = (field: string) => fieldLabel(field, spec.fields).toLowerCase();
      return row && x && y && amount ? `Here, the strongest square is ${named(y)} ${text(row, y)} and ${named(x)} ${text(row, x)}, at ${text(row, amount)}.` : "";
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
      const row = rows.filter((r) => value(r, from) !== null && value(r, to) !== null).reduce<Row | undefined>((best, r) => (best && moved(best) >= moved(r) ? best : r), undefined);
      if (!row) return "";
      // A slope, or a dumbbell between two periods, is before and after; other dumbbells compare two values, a gap.
      return view.type === "slope" || (PERIOD.test(from) && PERIOD.test(to))
        ? `Here, ${text(row, label)} moved the most, from ${text(row, from)} to ${text(row, to)}.`
        : `Here, ${text(row, label)} has the biggest gap: ${text(row, from)} against ${text(row, to)}.`;
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
      return row && share(row) > 0 ? `Here, the most agreed question is ${text(row, label)}: ${percent(share(row))} agree.` : "";
    }
    case "meter": {
      const [amount, target] = [one(view.value), one(view.target)];
      if (!amount || !target) return "";
      const measured = rows.filter((row) => value(row, amount) !== null && (value(row, target) ?? 0) > 0);
      const reached = measured.filter((row) => (value(row, amount) as number) >= (value(row, target) as number)).length;
      return measured.length ? `Here, ${reached} of ${measured.length} ${reached === 1 ? "has reached its goal" : "have reached their goal"}.` : "";
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
      return biggest && total > 0 ? `Here, ${text(biggest.row, group)} is the biggest group, with ${percent(biggest.sum / total)} of the total.` : "";
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
      return view.type === "waffle" ? `Here, ${text(row, label)} fills the most squares: ${share}.` : `Here, ${text(row, label)} alone is ${share} of the total.`;
    }
    case "waterfall": {
      const [label, amount] = [one(view.label), one(view.value)];
      if (!label || !amount) return "";
      // The steps between the totals: the first row and any named totals are where the bridge starts and lands.
      const totals = new Set(many(view.totals));
      const steps = rows.slice(1).filter((row) => !totals.has(String(row[label])) && value(row, amount) !== null);
      const row = steps.reduce<Row | undefined>((best, r) => (best && Math.abs(value(best, amount) as number) >= Math.abs(value(r, amount) as number) ? best : r), undefined);
      return row ? `Here, the biggest step is ${text(row, label)}, at ${text(row, amount)}.` : "";
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
      const mid = formatValue(middle(best.values), spec.fields?.[amount]?.format, spec.locale);
      return view.type === "ridgeline" ? `Here, ${text(best.row, group)} sits furthest right, with a middle value of ${mid}.` : `Here, ${text(best.row, group)} has the highest middle value, ${mid}.`;
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
      return best && best.sum > 0 ? `Here, ${text(best.row, x)} is the widest column, with ${formatValue(best.sum, spec.fields?.[amount]?.format, spec.locale)}.` : "";
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
      return row && label && first ? `Here, the highest score is ${text(row, label)}, at ${text(row, first)}.` : "";
    }
    case "beeswarm": {
      const [amount, label] = [one(view.value), one(view.label)];
      const row = amount ? top(amount) : undefined;
      if (!row || !amount) return "";
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
      const passed = measured.filter((row) => (value(row, amount) as number) >= (value(row, target) as number)).length;
      return measured.length ? `Here, ${passed} of ${measured.length} ${passed === 1 ? "has passed its goal" : "have passed their goal"}.` : "";
    }
    case "timeline": {
      const [label, start, end] = [one(view.label), one(view.start), one(view.end)];
      if (!label || !start || !end) return "";
      const length = (row: Row) => Date.parse(String(row[end])) - Date.parse(String(row[start]));
      const row = rows.filter((r) => Number.isFinite(length(r))).reduce<Row | undefined>((best, r) => (best && length(best) >= length(r) ? best : r), undefined);
      return row ? `Here, the longest task is ${text(row, label)}.` : "";
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
    case "kpis":
      return "Each tile is one key number, with a small arrow that says whether it went up or down since last time.";
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
    case "table":
      return `Each row is one record and each column one detail.${view.sortable === false ? "" : " Click a column heading to sort by it."}`;
    default:
      return "Each mark stands for one value. Bigger, longer or stronger marks mean more.";
  }
}
