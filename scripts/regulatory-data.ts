/**
 * Derives the regulatory landscape's long-form files from its register (public/data/regulations.json, the forty
 * tracked rules) and its hand-made series (regulatory-activity.json, regulatory-pressure.json,
 * regulatory-transposition.json), so every card counts the same rules and carries `topic` and `jurisdiction`: the
 * dashboard's two filters then reach the maps, the funnel, the stakeholder views and the activity series too.
 *
 * Writes, into public/data:
 * - regulation-stages.json: one row per rule and stage it has reached by today (the funnel).
 * - regulation-stakeholders.json: one row per rule and stakeholder type, whether the rule binds it (matrix, sankey).
 * - regulation-scope.json: one row per country and rule in scope there (the rules-per-country map).
 * - regulatory-countries.json: the same per country, summed, kept for anyone reading the old shape.
 * - regulatory-stakeholders.json: the sankey's flows, summed, kept likewise.
 * - regulatory-activity-split.json: the activity series shared across each topic's jurisdictions.
 * - regulatory-pressure-split.json: the monthly obligations and consultations shared across topics and jurisdictions.
 * - regulatory-transposition.json: gains each directive's topic and jurisdiction.
 *
 * Deterministic, no randomness. Run with: node scripts/regulatory-data.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const file = (name: string) => fileURLToPath(new URL(`../public/data/${name}`, import.meta.url));
const read = <T>(name: string): T => JSON.parse(readFileSync(file(name), "utf8")) as T;
const write = (name: string, rows: unknown[]) => {
  writeFileSync(file(name), `[\n${rows.map((row) => `  ${JSON.stringify(row)}`).join(",\n")}\n]\n`);
  console.log(`${name}: ${rows.length} rows`);
};

interface Rule {
  id: string;
  name: string;
  topic: string;
  jurisdiction: string;
  status: string;
  proposed: string | null;
  adopted: string | null;
  inForce: string | null;
  applies: string | null;
  impact: number;
  banks: boolean;
  insurers: boolean;
  assetManagers: boolean;
  paymentInstitutions: boolean;
  cryptoProviders: boolean;
}

export const TODAY = "2026-10-25";
const rules = read<Rule[]>("regulations.json");

/** Splits a whole number across weights so the parts add up to it exactly (largest remainder). */
function split(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const exact = weights.map((w) => (total * w) / sum);
  const parts = exact.map(Math.floor);
  let left = Math.round(total - parts.reduce((a, b) => a + b, 0));
  const order = exact.map((e, i) => [e - Math.floor(e), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) {
    if (left <= 0) break;
    parts[i] = (parts[i] as number) + 1;
    left--;
  }
  return parts;
}

// ---- The funnel: a stage counts once its date has passed, whatever the rule's status is today ----
export const STAGES: [string, keyof Rule][] = [
  ["Proposed", "proposed"],
  ["Adopted", "adopted"],
  ["In force", "inForce"],
  ["Applying", "applies"],
];
const stages = STAGES.flatMap(([stage, field]) =>
  rules
    .filter((r) => typeof r[field] === "string" && (r[field] as string) <= TODAY)
    .map((r) => ({ stage, id: r.id, name: r.name, topic: r.topic, jurisdiction: r.jurisdiction, status: r.status, regulations: 1 })),
);

// ---- Stakeholders: one row per rule and type, its impact rank among the forty for the "top 15" matrix ----
const TYPES: [string, keyof Rule][] = [
  ["Banks", "banks"],
  ["Insurers", "insurers"],
  ["Asset managers", "assetManagers"],
  ["Payment institutions", "paymentInstitutions"],
  ["Crypto providers", "cryptoProviders"],
];
const ranked = [...rules].sort((a, b) => b.impact - a.impact || rules.indexOf(a) - rules.indexOf(b));
const rankOf = new Map(ranked.map((r, i) => [r.id, i + 1]));
const stakeholders = ranked.flatMap((r) =>
  TYPES.map(([stakeholder, field]) => ({ regulation: r.name, stakeholder, binds: r[field] === true, impact: r.impact, impactRank: rankOf.get(r.id), topic: r.topic, jurisdiction: r.jurisdiction })),
);
const flows = new Map<string, { topic: string; stakeholder: string; regulations: number }>();
for (const row of stakeholders.filter((s) => s.binds)) {
  const key = `${row.topic}|${row.stakeholder}`;
  const flow = flows.get(key) ?? { topic: row.topic, stakeholder: row.stakeholder, regulations: 0 };
  flow.regulations++;
  flows.set(key, flow);
}
const stakeholderFlows = [...flows.values()].sort((a, b) => a.topic.localeCompare(b.topic) || a.stakeholder.localeCompare(b.stakeholder));

// ---- Scope by country: EU rules in the EU 27; the oldest 24 in the EEA states (incorporated in the EEA agreement);
// the 19 adopted earliest in the United Kingdom (onshored at Brexit); the 2 adopted earliest in Switzerland (followed
// by FINMA); plus each country's own rules from the register ----
const EU27 = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"];
const euRules = rules.filter((r) => r.jurisdiction === "EU").sort((a, b) => String(a.adopted ?? "9999").localeCompare(String(b.adopted ?? "9999")) || rules.indexOf(a) - rules.indexOf(b));
const followed: Record<string, Rule[]> = { NO: euRules.slice(0, 24), IS: euRules.slice(0, 24), GB: euRules.slice(0, 19), CH: euRules.slice(0, 2) };
const countries = [...EU27, "NO", "IS", "GB", "CH"];
const scope = countries.flatMap((country) => {
  const eu = EU27.includes(country) ? euRules : (followed[country] ?? []);
  const own = rules.filter((r) => r.jurisdiction === country);
  return [...eu, ...own].map((r) => ({ country, id: r.id, regulation: r.name, topic: r.topic, jurisdiction: r.jurisdiction, regulations: 1 }));
});
const previousCountries = read<{ country: string; supervisor?: string; pressure?: number }[]>("regulatory-countries.json");
const countryRows = countries.map((country) => {
  const rows = scope.filter((s) => s.country === country);
  const old = previousCountries.find((c) => c.country === country);
  return { country, regulations: rows.length, euRules: rows.filter((r) => r.jurisdiction === "EU").length, nationalRules: rows.filter((r) => r.jurisdiction !== "EU").length, supervisor: old?.supervisor ?? null, pressure: old?.pressure ?? null };
});

// ---- Activity and pressure, shared across each topic's jurisdictions by how many tracked rules each has ----
const weightsOf = (topic?: string) => {
  const pairs = new Map<string, number>();
  for (const r of rules) if (!topic || r.topic === topic) pairs.set(topic ? r.jurisdiction : `${r.topic}|${r.jurisdiction}`, (pairs.get(topic ? r.jurisdiction : `${r.topic}|${r.jurisdiction}`) ?? 0) + 1);
  return [...pairs.entries()];
};
const activity = read<{ quarter: string; topic: string; events: number; obligations: number; impact: number }[]>("regulatory-activity.json");
const activitySplit = activity.flatMap((row) => {
  const pairs = weightsOf(row.topic);
  const weights = pairs.map(([, n]) => n);
  const events = split(row.events, weights);
  const obligations = split(row.obligations, weights);
  // impactPoints carries the obligations' impact, so an average impact can be worked out after any filter.
  return pairs.map(([jurisdiction], i) => ({ quarter: row.quarter, topic: row.topic, jurisdiction, events: events[i], obligations: obligations[i], impactPoints: Math.round((obligations[i] as number) * row.impact * 10) / 10 }));
});
const pressure = read<{ month: string; pressureIndex: number; newObligations: number; consultationsOpen: number; forecast: boolean; low: number | null; high: number | null }[]>("regulatory-pressure.json");
const allPairs = weightsOf();
const pressureSplit = pressure.flatMap((row) => {
  const weights = allPairs.map(([, n]) => n);
  const obligations = split(row.newObligations, weights);
  const consultations = split(row.consultationsOpen, weights);
  return allPairs.map(([pair], i) => {
    const [topic, jurisdiction] = pair.split("|");
    // The index is for the whole landscape: every row of a month carries it, and a card takes its maximum.
    return { month: row.month, topic, jurisdiction, newObligations: obligations[i], consultationsOpen: consultations[i], pressureIndex: row.pressureIndex, forecast: row.forecast };
  });
});

// ---- Transposition: each directive's topic and jurisdiction, from the register ----
const transposition = read<Record<string, unknown>[]>("regulatory-transposition.json").map((row) => {
  const rule = rules.find((r) => r.name === row.regulation);
  return { ...row, topic: rule?.topic ?? null, jurisdiction: rule?.jurisdiction ?? null };
});

write("regulation-stages.json", stages);
write("regulation-stakeholders.json", stakeholders);
write("regulation-scope.json", scope);
write("regulatory-countries.json", countryRows);
write("regulatory-stakeholders.json", stakeholderFlows);
write("regulatory-activity-split.json", activitySplit);
write("regulatory-pressure-split.json", pressureSplit);
write("regulatory-transposition.json", transposition);
