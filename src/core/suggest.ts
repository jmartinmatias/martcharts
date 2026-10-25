/**
 * Fills a view from the data, so switching view type never needs hand edits.
 *
 * @module
 */
import { guessBasemap } from "./geo.ts";
import { getBlock } from "./registry.ts";
import type { OptionSchema } from "./registry.ts";
import type { Row, ViewSpec } from "./types.ts";

type Kind = NonNullable<OptionSchema["kind"]>;

/** Views drawn on a map, whose `geo` option names geometry rather than a field. */
const MAP_VIEWS = new Set(["choropleth", "symbols", "locator"]);

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
 * the data has no dates, and the other way round. Fields named in `prefer` are
 * taken first, in that order: pass the fields another chart already draws to
 * keep the same ones when switching.
 */
export function suggestView(type: string, rows: Row[], prefer: string[] = []): ViewSpec {
  const sample = rows[0] ?? {};
  const rank = (key: string) => (prefer.includes(key) ? prefer.indexOf(key) : prefer.length);
  const keys = Object.keys(sample).sort((a, b) => rank(a) - rank(b));
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
  // An x-ray needs something to show beside the name: its first few numbers as facts, and its yes/no columns as holdings.
  if (type === "xray") {
    const facts = pools.number.filter((key) => !used.has(key)).slice(0, 4);
    const holdings = keys.filter((key) => typeof sample[key] === "boolean").slice(0, 8);
    if (facts.length) view.facts = facts;
    if (holdings.length) view.holdings = holdings;
  }
  // A choropleth shades by a number unless a category is named: fill the number when neither is.
  if (type === "choropleth" && view.value === undefined && view.category === undefined) view.value = take("number");
  // A map's geometry cannot be guessed from the rows, except a column of country or state codes that all sit on one built-in basemap.
  if (MAP_VIEWS.has(type) && view.geo === undefined) {
    const idField = typeof view.id === "string" ? view.id : pools.category.find((key) => guessBasemap(rows.map((row) => row[key])));
    const name = idField ? guessBasemap(rows.map((row) => row[idField])) : undefined;
    if (name && idField) {
      view.geo = name;
      view.id = idField;
    }
  }
  return view;
}
