/**
 * Fills a view from the data, so switching view type never needs hand edits.
 *
 * @module
 */
import { getBlock } from "./registry.ts";
import type { OptionSchema } from "./registry.ts";
import type { Row, ViewSpec } from "./types.ts";

type Kind = NonNullable<OptionSchema["kind"]>;

const DATE = /^\d{4}-\d{2}/;

/** What kind of field a value suggests: numbers are amounts, ISO-like strings are dates, other text names categories. Lists and objects suggest nothing. */
function kindOf(value: unknown): Kind | null {
  if (typeof value === "number") return "number";
  if (typeof value === "string") return DATE.test(value) ? "date" : "category";
  return typeof value === "boolean" ? "category" : null;
}

/**
 * A view of `type` with every required field option filled from the rows:
 * each option gets a field of the kind it expects (numbers for amounts, text
 * for categories, dates for periods), and no field is used twice while
 * another of that kind remains. A date option falls back to a category when
 * the data has no dates, and the other way round.
 */
export function suggestView(type: string, rows: Row[]): ViewSpec {
  const sample = rows[0] ?? {};
  const keys = Object.keys(sample);
  const pools: Record<Kind, string[]> = { number: [], category: [], date: [] };
  for (const key of keys) {
    const kind = kindOf(sample[key]);
    if (kind) pools[kind].push(key);
  }
  const used = new Set<string>();
  const fresh = (kind: Kind) => pools[kind].find((key) => !used.has(key));
  const take = (kind: Kind) => {
    const fallback: Kind[] = kind === "date" ? ["date", "category"] : kind === "category" ? ["category", "date"] : ["number"];
    const key = fallback.map(fresh).find((k) => k !== undefined) ?? pools[kind][0] ?? fallback.map((k) => pools[k][0]).find((k) => k !== undefined) ?? keys[0];
    if (key !== undefined) used.add(key);
    return key;
  };

  const view: ViewSpec = { type };
  for (const [name, option] of Object.entries(getBlock("view", type).options)) {
    if (!option.required) continue;
    if (option.type === "field") view[name] = take(option.kind ?? "category");
    if (option.type === "fields") {
      const first = take(option.kind ?? "number");
      const second = fresh(option.kind ?? "number");
      if (second) used.add(second);
      view[name] = second ? [first, second] : first;
    }
  }
  // The stat row's tiles are its one required option that is not a field: one tile per number field, up to 3.
  if (type === "kpis") view.items = pools.number.slice(0, 3).map((value) => ({ value }));
  return view;
}
