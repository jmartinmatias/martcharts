/**
 * Writes the client health (RAG) dataset: a fictional wealth and corporate banking book seen from four perspectives,
 * client success, business development, coverage and the client relationship. Every status is worked out from its raw
 * value with the thresholds in public/data/rag-thresholds.json, so the rules are on record and the data obeys them.
 * Deterministic: the same seed writes the same files. Run with: node scripts/client-health-data.ts
 *
 * Writes public/data/client-health.json, client-health-history.json, rm-health.json, rag-thresholds.json,
 * rag-transitions.json, rag-by-rm.json and client-health-perspectives.json (one row per client and perspective).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));

/** mulberry32: a small seeded random generator. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = seeded(20261025);
const between = (low: number, high: number) => low + (high - low) * random();
const gauss = () => {
  const u = Math.max(1e-9, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round = (v: number, places = 0) => Math.round(v * 10 ** places) / 10 ** places;

export type Rag = "R" | "A" | "G" | "N";
export type Perspective = "clientSuccess" | "bizDev" | "coverage" | "relationship";

/** One metric's rule: green from `green`, amber from `amber`, red past it, in the direction `goodWhen`. */
export interface Threshold {
  perspective: Perspective;
  perspectiveLabel: string;
  metric: string;
  status: string;
  label: string;
  green: number;
  amber: number;
  goodWhen: "up" | "down";
  unit: string;
  rationale: string;
}

const LABELS: Record<Perspective, string> = { clientSuccess: "Client success", bizDev: "Business development", coverage: "Coverage", relationship: "Relationship" };

export const THRESHOLDS: Threshold[] = [
  { perspective: "clientSuccess", metric: "onboarding", label: "Onboarding completeness", green: 0.95, amber: 0.8, goodWhen: "up", unit: "share", rationale: "Below 95% a document or a mandate is missing; below 80% the client cannot be served in full." },
  { perspective: "clientSuccess", metric: "digitalAdoption", label: "Digital adoption", green: 0.6, amber: 0.35, goodWhen: "up", unit: "share", rationale: "Share of the last 12 months with an active login: clients who use the app call less and stay longer." },
  { perspective: "clientSuccess", metric: "ticketsOpen", label: "Service tickets open", green: 2, amber: 5, goodWhen: "down", unit: "tickets", rationale: "Two open tickets is ordinary service; past five the client is waiting on us." },
  { perspective: "clientSuccess", metric: "nps", label: "Net promoter score", green: 30, amber: 0, goodWhen: "up", unit: "score", rationale: "The client's last survey answer, scaled −100 to 100: 30 and up is a promoter book, below zero a detractor." },
  { perspective: "clientSuccess", metric: "complaints90d", label: "Complaints, last 90 days", green: 0, amber: 1, goodWhen: "down", unit: "complaints", rationale: "Any complaint is a signal; a second one in a quarter is a pattern." },
  { perspective: "bizDev", metric: "pipelineCoverage", label: "Pipeline cover", green: 3, amber: 1.5, goodWhen: "up", unit: "times target", rationale: "Open pipeline against the year's revenue target: three times cover absorbs the usual win rate." },
  { perspective: "bizDev", metric: "winRate", label: "Win rate", green: 0.3, amber: 0.18, goodWhen: "up", unit: "share", rationale: "Share of closed opportunities won over 12 months." },
  { perspective: "bizDev", metric: "newMoneyVsTarget", label: "New money against target", green: 0.9, amber: 0.6, goodWhen: "up", unit: "share", rationale: "Net new money so far this year against the target pro rata to October." },
  { perspective: "bizDev", metric: "crossSellAdded", label: "Products added this year", green: 2, amber: 1, goodWhen: "up", unit: "products", rationale: "Each new product line deepens the relationship; none in ten months means the book is static." },
  { perspective: "coverage", metric: "daysSinceMeeting", label: "Days since the last meeting", green: 45, amber: 90, goodWhen: "down", unit: "days", rationale: "A meeting every six weeks keeps a relationship warm; three months of silence is a gap." },
  { perspective: "coverage", metric: "cadence", label: "Meetings held against plan", green: 0.9, amber: 0.6, goodWhen: "up", unit: "share", rationale: "Meetings held this year against the coverage plan, pro rata." },
  { perspective: "coverage", metric: "rmLoad", label: "Relationship manager load", green: 0.85, amber: 1, goodWhen: "down", unit: "share of capacity", rationale: "Clients in the RM's book against the clients the RM can cover well; past capacity, every client gets less." },
  { perspective: "coverage", metric: "reviewOverdue", label: "Annual review overdue", green: 0, amber: 30, goodWhen: "down", unit: "days", rationale: "Days past the annual review date: a month is tolerable, more is a compliance and service risk." },
  { perspective: "relationship", metric: "walletTrend", label: "Share of wallet, 12-month change", green: 0, amber: -0.03, goodWhen: "up", unit: "points", rationale: "A flat or rising share of the client's wallet holds; a drop of more than three points means money is going elsewhere." },
  { perspective: "relationship", metric: "attritionRisk", label: "Attrition risk", green: 30, amber: 60, goodWhen: "down", unit: "score", rationale: "Model score 0 to 100 from flows, logins, complaints and tenure; above 60 a third of such clients leave within a year." },
  { perspective: "relationship", metric: "feeLeakage", label: "Fee leakage", green: 0.03, amber: 0.08, goodWhen: "down", unit: "share of fees", rationale: "Fees waived or discounted outside the rate card, as a share of fees due." },
  { perspective: "relationship", metric: "kycDays", label: "Days to the KYC refresh", green: 60, amber: 0, goodWhen: "up", unit: "days", rationale: "Days until the client's KYC file must be refreshed; below zero it is overdue and the account can be restricted." },
  { perspective: "relationship", metric: "sentiment", label: "Sentiment in notes", green: 0.2, amber: -0.1, goodWhen: "up", unit: "score", rationale: "Tone of the last six months of call notes, −1 to 1." },
].map((t) => ({ ...t, perspectiveLabel: LABELS[t.perspective as Perspective], status: `${t.metric}Rag` })) as Threshold[];

/** How metric statuses roll up into a perspective, and perspectives into the overall status. Written next to the thresholds. */
export const ROLLUPS = [
  { level: "Perspective", rule: "Red when two or more of its metrics are red, or one is red and two others amber; amber when one is red or two or more are amber; green otherwise. Metrics with no data are left out." },
  { level: "Overall", rule: "Red when two or more perspectives are red, or one is red and another amber; amber when one is red or two or more are amber; green otherwise." },
  { level: "Relationship manager", rule: "Per perspective: red when a quarter or more of the book is red; amber when red and amber together pass 40%; green otherwise." },
];

/** A metric's status from its value. */
export function statusOf(value: number | null, t: Pick<Threshold, "green" | "amber" | "goodWhen">): Rag {
  if (value === null || Number.isNaN(value)) return "N";
  if (t.goodWhen === "up") return value >= t.green ? "G" : value >= t.amber ? "A" : "R";
  return value <= t.green ? "G" : value <= t.amber ? "A" : "R";
}

/**
 * Rolls statuses up. A perspective is red with two red metrics, or one red and two amber; the overall status is red with
 * two red perspectives, or one red and one amber. Either is amber with one red or two ambers. No-data statuses are left out.
 */
export function rollup(statuses: Rag[], level: "perspective" | "overall" = "perspective"): Rag {
  const known = statuses.filter((s) => s !== "N");
  if (!known.length) return "N";
  const red = known.filter((s) => s === "R").length;
  const amber = known.filter((s) => s === "A").length;
  if (red >= 2 || (red === 1 && amber >= 2)) return "R";
  return red === 1 || amber >= 2 ? "A" : "G";
}

const WORD: Record<Rag, string> = { R: "Red", A: "Amber", G: "Green", N: "No data" };
const RANK: Record<Rag, number> = { R: 1, A: 2, G: 3, N: 4 };
const PERSPECTIVES: Perspective[] = ["clientSuccess", "bizDev", "coverage", "relationship"];

interface Client {
  id: string;
  name: string;
  segment: string;
  rm: string;
  region: string;
  aum: number;
}
const clients = (JSON.parse(readFileSync(root("public/data/clients.json"), "utf8")) as Client[]).map(({ id, name, segment, rm, region, aum }) => ({ id, name, segment, rm, region, aum }));

// Each RM can cover a number of clients well; some books are over capacity.
const rms = [...new Set(clients.map((c) => c.rm))].sort();
const bookSize = (rm: string) => clients.filter((c) => c.rm === rm).length;
const capacity: Record<string, number> = Object.fromEntries(rms.map((rm, i) => [rm, Math.max(6, bookSize(rm) + [-2, 1, 2, -1, 3, 0][i % 6]!)]));

/** Raw metric values for one client, from a latent health per perspective (higher is healthier). */
function metricsFor(client: Client, health: Record<Perspective, number>): Record<string, number | null> {
  const [cs, bd, cv, rl] = PERSPECTIVES.map((p) => health[p]) as [number, number, number, number];
  const noise = (scale: number) => gauss() * scale;
  const load = bookSize(client.rm) / (capacity[client.rm] as number);
  return {
    onboarding: round(clamp(0.93 + cs * 0.06 + noise(0.04), 0.55, 1), 2),
    digitalAdoption: round(clamp(0.55 + cs * 0.18 + noise(0.12), 0.02, 0.98), 2),
    ticketsOpen: Math.max(0, Math.round(2.5 - cs * 2 + noise(1.6))),
    nps: random() < 0.07 ? null : Math.round(clamp(28 + cs * 28 + noise(18), -80, 90)),
    complaints90d: Math.max(0, Math.round(0.3 - cs * 0.7 + noise(0.6))),
    pipelineCoverage: round(clamp(2.8 + bd * 1.1 + noise(0.7), 0.2, 6), 1),
    winRate: round(clamp(0.28 + bd * 0.08 + noise(0.05), 0.04, 0.6), 2),
    newMoneyVsTarget: round(clamp(0.88 + bd * 0.25 + noise(0.15), 0, 1.8), 2),
    crossSellAdded: Math.max(0, Math.round(1.8 + bd * 1.1 + noise(0.8))),
    daysSinceMeeting: Math.max(3, Math.round(48 - cv * 35 + noise(20))),
    cadence: round(clamp(0.88 + cv * 0.18 + noise(0.1), 0.1, 1.3), 2),
    rmLoad: round(load, 2),
    reviewOverdue: Math.max(0, Math.round(-12 - cv * 30 + noise(22))),
    walletTrend: round(clamp(0.01 + rl * 0.025 + noise(0.02), -0.15, 0.12), 3),
    attritionRisk: Math.round(clamp(32 - rl * 22 + noise(12), 2, 98)),
    feeLeakage: round(clamp(0.035 - rl * 0.025 + noise(0.02), 0, 0.3), 3),
    kycDays: Math.round(clamp(120 + rl * 70 + noise(80), -90, 365)),
    sentiment: round(clamp(0.25 + rl * 0.25 + noise(0.18), -1, 1), 2),
  };
}

/** The next step for a client: the worst metric of the worst perspective names it and its owner. */
const ACTIONS: Record<string, (v: number, c: Client) => [string, string]> = {
  onboarding: (v, c) => [`Close the onboarding gaps: the file is ${Math.round(v * 100)}% complete`, c.rm],
  digitalAdoption: (_v, c) => ["Walk the client through the app and statements online", c.rm],
  ticketsOpen: (v) => [`Clear the ${v} open service tickets and confirm with the client`, "Service desk"],
  nps: (v, c) => [`Call to understand the low score (${v}) and agree one fix`, c.rm],
  complaints90d: () => ["Close the complaint and follow up in writing", "Client care"],
  pipelineCoverage: (v, c) => [`Rebuild the pipeline: ${v}× cover against 3×`, c.rm],
  winRate: (_v, c) => ["Review the last lost proposals with the client team", c.rm],
  newMoneyVsTarget: (v, c) => [`Agree a new-money plan for Q4: ${Math.round(v * 100)}% of target so far`, c.rm],
  crossSellAdded: () => ["Propose the best next product from the whitespace", "Product specialist"],
  daysSinceMeeting: (v, c) => [`Book a meeting: ${v} days since the last one`, c.rm],
  cadence: () => ["Restore the meeting plan for the rest of the year", "Coverage lead"],
  rmLoad: () => ["Rebalance the book: the RM is over capacity", "Coverage lead"],
  reviewOverdue: (v, c) => [`Hold the annual review, ${v} days overdue`, c.rm],
  walletTrend: (_v, c) => ["Win back wallet share: review flows to other banks", c.rm],
  attritionRisk: () => ["Retention call with a senior banker", "Senior banker"],
  feeLeakage: () => ["Review waived fees against the rate card", "Pricing desk"],
  kycDays: (v) => [v < 0 ? `Refresh KYC now: ${-v} days overdue` : `Refresh KYC within ${v} days`, "KYC team"],
  sentiment: () => ["Senior sponsor check-in on the relationship", "Senior banker"],
};

const NOTES: Record<Perspective, [string, string]> = {
  clientSuccess: ["Service improved: tickets closed and onboarding complete", "Service slipped: open tickets and a low survey score"],
  bizDev: ["Growth back on plan: pipeline rebuilt", "Growth off plan: pipeline thin and new money behind"],
  coverage: ["Coverage restored: meetings back on plan", "Coverage slipped: no meeting for months"],
  relationship: ["Relationship steadier: wallet share holding", "Relationship at risk: wallet share falling"],
};

const QUARTERS = ["2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4", "2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4"];
const step = (s: Rag, by: number): Rag => (["R", "A", "G"] as Rag[])[clamp((["R", "A", "G"] as Rag[]).indexOf(s) + by, 0, 2)] as Rag;

const health: Record<string, unknown>[] = [];
const history: Record<string, unknown>[] = [];
for (const client of clients) {
  // A client's health: one book-wide level and a bit of its own per perspective. Most of the book is healthy.
  const level = 0.9 + gauss() * 0.95;
  const latent = Object.fromEntries(PERSPECTIVES.map((p) => [p, level + gauss() * 0.5])) as Record<Perspective, number>;
  const metrics = metricsFor(client, latent);
  const row: Record<string, unknown> = { id: client.id, name: client.name, segment: client.segment, rm: client.rm, region: client.region, aum: client.aum, asOf: "2026-10-25" };
  const per: Record<Perspective, Rag> = {} as Record<Perspective, Rag>;
  const worst: Record<Perspective, string | undefined> = {} as Record<Perspective, string | undefined>;
  for (const p of PERSPECTIVES) {
    const rules = THRESHOLDS.filter((t) => t.perspective === p);
    const statuses = rules.map((t) => {
      const value = metrics[t.metric] ?? null;
      const s = statusOf(value, t);
      row[t.metric] = value;
      row[t.status] = s;
      return s;
    });
    per[p] = rollup(statuses);
    worst[p] = rules.find((t) => row[t.status] === "R")?.metric ?? rules.find((t) => row[t.status] === "A")?.metric;
  }
  const overall = rollup(PERSPECTIVES.map((p) => per[p]), "overall");

  // History, walking back from today: each quarter a perspective may have been a step better or worse.
  const trail: Record<Perspective, Rag>[] = [{ ...per }];
  for (let q = QUARTERS.length - 2; q >= 0; q--) {
    const next = trail[0] as Record<Perspective, Rag>;
    const before = Object.fromEntries(PERSPECTIVES.map((p) => [p, random() < 0.18 ? step(next[p], random() < 0.55 ? 1 : -1) : next[p]])) as Record<Perspective, Rag>;
    trail.unshift(before);
  }
  trail.forEach((statuses, q) => {
    const all = rollup(PERSPECTIVES.map((p) => statuses[p]), "overall");
    const prev = q > 0 ? (trail[q - 1] as Record<Perspective, Rag>) : undefined;
    const prevAll = prev ? rollup(PERSPECTIVES.map((p) => prev[p]), "overall") : undefined;
    // The note names the perspective that moved the most, when the overall status changed.
    let note = "";
    if (prev && prevAll !== all) {
      const moved = PERSPECTIVES.find((p) => RANK[statuses[p]] !== RANK[prev[p]]) ?? "coverage";
      note = NOTES[moved][RANK[statuses[moved]] > RANK[prev[moved]] ? 0 : 1];
    }
    history.push({
      client: client.name,
      clientId: client.id,
      segment: client.segment,
      rm: client.rm,
      region: client.region,
      quarter: QUARTERS[q],
      clientSuccessRag: statuses.clientSuccess,
      bizDevRag: statuses.bizDev,
      coverageRag: statuses.coverage,
      relationshipRag: statuses.relationship,
      overallRag: all,
      overallStatus: WORD[all],
      note,
    });
  });
  const previous = trail[trail.length - 2] as Record<Perspective, Rag>;
  for (const p of PERSPECTIVES) {
    row[`${p}Rag`] = per[p];
    row[`${p}Status`] = WORD[per[p]];
    row[`${p}PrevRag`] = previous[p];
    row[`${p}Red`] = per[p] === "R" ? 1 : 0;
  }
  const prevOverall = rollup(PERSPECTIVES.map((p) => previous[p]), "overall");
  row.overallRag = overall;
  row.overallStatus = WORD[overall];
  row.overallPrevRag = prevOverall;
  row.overallPrevStatus = WORD[prevOverall];
  row.overallRank = RANK[overall];
  // One-and-zero flags and the move's two ends, so the books, the reds and the moves are counted from these rows
  // with transforms: a segment, banker or region filter then reaches them too.
  row.overallRed = overall === "R" ? 1 : 0;
  row.overallAmber = overall === "A" ? 1 : 0;
  row.overallGreen = overall === "G" ? 1 : 0;
  row.movedFrom = `${WORD[prevOverall]} in Q3`;
  row.movedTo = `${WORD[overall]} in Q4`;
  // The next step: the worst perspective's worst metric, with its owner, for clients not on track.
  const target = [...PERSPECTIVES].sort((a, b) => RANK[per[a]] - RANK[per[b]])[0] as Perspective;
  const metric = worst[target];
  if (overall !== "G" && metric) {
    const [action, owner] = (ACTIONS[metric] as (v: number, c: Client) => [string, string])(Number(row[metric]), client);
    row.action = action;
    row.owner = owner;
    row.daysOpen = Math.round(between(overall === "R" ? 14 : 3, overall === "R" ? 120 : 60));
  } else {
    row.action = null;
    row.owner = null;
    row.daysOpen = null;
  }
  // Worst first: red before amber, then the oldest open action.
  row.priority = (4 - RANK[overall]) * 1000 + Number(row.daysOpen ?? 0);
  health.push(row);
}

// Per RM: the book's statuses, counted, and rolled up per perspective.
const rmRows = rms.map((rm) => {
  const book = health.filter((r) => r.rm === rm);
  const count = (field: string, s: Rag) => book.filter((r) => r[field] === s).length;
  const row: Record<string, unknown> = {
    rm,
    region: book[0]?.region,
    clients: book.length,
    capacity: capacity[rm],
    load: round(book.length / (capacity[rm] as number), 2),
    red: count("overallRag", "R"),
    amber: count("overallRag", "A"),
    green: count("overallRag", "G"),
  };
  for (const p of PERSPECTIVES) {
    const red = count(`${p}Rag`, "R");
    const amber = count(`${p}Rag`, "A");
    row[`${p}Red`] = red;
    row[`${p}Amber`] = amber;
    const s: Rag = red / book.length >= 0.25 ? "R" : (red + amber) / book.length > 0.4 ? "A" : "G";
    row[`${p}Rag`] = s;
    row[`${p}Status`] = WORD[s];
  }
  return row;
});

// Long form for the heatmap: one row per RM and perspective.
const byRm = rms.flatMap((rm) =>
  PERSPECTIVES.map((p) => {
    const book = health.filter((r) => r.rm === rm);
    return { rm, perspective: LABELS[p], red: book.filter((r) => r[`${p}Rag`] === "R").length, amber: book.filter((r) => r[`${p}Rag`] === "A").length, green: book.filter((r) => r[`${p}Rag`] === "G").length };
  }),
);

// From last quarter's overall status to this quarter's, for the sankey.
const transitions: { from: string; to: string; clients: number }[] = [];
for (const from of ["G", "A", "R"] as Rag[]) {
  for (const to of ["G", "A", "R"] as Rag[]) {
    const n = health.filter((r) => r.overallPrevRag === from && r.overallRag === to).length;
    if (n) transitions.push({ from: `${WORD[from]} in Q3`, to: `${WORD[to]} in Q4`, clients: n });
  }
}

// The same in long form, one row per client and perspective, carrying the filter fields: the heatmap of reds
// counts these, so a filter on segment, banker or region reaches it.
const perspectiveRows = health.flatMap((r) =>
  PERSPECTIVES.map((p) => ({
    id: r.id,
    name: r.name,
    segment: r.segment,
    rm: r.rm,
    region: r.region,
    perspective: LABELS[p],
    status: r[`${p}Rag`],
    red: r[`${p}Rag`] === "R" ? 1 : 0,
    amber: r[`${p}Rag`] === "A" ? 1 : 0,
    green: r[`${p}Rag`] === "G" ? 1 : 0,
  })),
);

const thresholds = [
  ...THRESHOLDS.map(({ perspective, ...t }) => ({ ...t, perspectiveKey: perspective, kind: "Metric" })),
];

const write = (file: string, rows: unknown[]) => writeFileSync(root(`public/data/${file}`), `[\n${rows.map((r) => `  ${JSON.stringify(r)}`).join(",\n")}\n]\n`);
write("client-health.json", health);
write("client-health-history.json", history);
write("rm-health.json", rmRows);
write("rag-thresholds.json", thresholds);
write("rag-rollups.json", ROLLUPS);
write("rag-transitions.json", transitions);
write("rag-by-rm.json", byRm);
write("client-health-perspectives.json", perspectiveRows);

const tally = (s: Rag) => health.filter((r) => r.overallRag === s).length;
console.log(`client-health: ${health.length} (R ${tally("R")}, A ${tally("A")}, G ${tally("G")}); history: ${history.length}; rm-health: ${rmRows.length}; thresholds: ${thresholds.length}; transitions: ${transitions.length}; by RM: ${byRm.length}`);
