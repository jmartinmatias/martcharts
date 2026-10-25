/**
 * Writes the Commercial cockpit's fictional dataset into public/data: sixty
 * wealth-management clients and everything the cockpit draws about them
 * (holdings and whitespace, history, monthly activity, daily metrics with
 * anomalies, campaigns, adoption cohorts, products, coverage, allocation).
 * Seeded, so the same files come out every run. Run with: node scripts/commercial-data.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const out = (name: string) => fileURLToPath(new URL(`../public/data/${name}`, import.meta.url));

/** mulberry32: the same seed, the same data. */
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
const between = (low: number, high: number) => low + random() * (high - low);
const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;
const round = (n: number, places = 0) => Math.round(n * 10 ** places) / 10 ** places;
const TODAY = new Date(Date.UTC(2026, 9, 25));
const DAY = 86_400_000;
const iso = (date: Date) => date.toISOString().slice(0, 10);
const daysAgo = (days: number) => iso(new Date(TODAY.getTime() - days * DAY));

const RMS = ["Claire Dubois", "Marco Rinaldi", "Sofia Keller", "Jonas Berg", "Inés Ferreira", "Tom Vermeulen"] as const;
const OFFICES: Record<(typeof RMS)[number], { office: string; country: string; region: string }> = {
  "Claire Dubois": { office: "Paris", country: "FR", region: "France" },
  "Marco Rinaldi": { office: "Milan", country: "IT", region: "Italy" },
  "Sofia Keller": { office: "Zurich", country: "CH", region: "DACH" },
  "Jonas Berg": { office: "Luxembourg", country: "LU", region: "Benelux" },
  "Inés Ferreira": { office: "Madrid", country: "ES", region: "Iberia" },
  "Tom Vermeulen": { office: "Luxembourg", country: "LU", region: "Benelux" },
};
const PLACES: Record<string, { country: string; cities: string[]; lat: number; lon: number }[]> = {
  France: [{ country: "FR", cities: ["Paris", "Lyon", "Bordeaux"], lat: 48.86, lon: 2.35 }],
  Italy: [{ country: "IT", cities: ["Milan", "Rome", "Turin"], lat: 45.46, lon: 9.19 }],
  DACH: [
    { country: "DE", cities: ["Frankfurt", "Munich", "Hamburg"], lat: 50.11, lon: 8.68 },
    { country: "CH", cities: ["Zurich", "Geneva"], lat: 47.38, lon: 8.54 },
    { country: "AT", cities: ["Vienna"], lat: 48.21, lon: 16.37 },
  ],
  Benelux: [
    { country: "LU", cities: ["Luxembourg"], lat: 49.61, lon: 6.13 },
    { country: "BE", cities: ["Brussels", "Antwerp"], lat: 50.85, lon: 4.35 },
    { country: "NL", cities: ["Amsterdam", "Rotterdam"], lat: 52.37, lon: 4.9 },
  ],
  Iberia: [
    { country: "ES", cities: ["Madrid", "Barcelona"], lat: 40.42, lon: -3.7 },
    { country: "PT", cities: ["Lisbon", "Porto"], lat: 38.72, lon: -9.14 },
  ],
};
const PRODUCTS = ["custody", "advisory", "discretionary", "lending", "fx", "structured", "insurance", "pension"] as const;
type Product = (typeof PRODUCTS)[number];
const PRODUCT_NAMES: Record<Product, string> = { custody: "Custody", advisory: "Advisory", discretionary: "Discretionary", lending: "Lending", fx: "FX", structured: "Structured", insurance: "Insurance", pension: "Pension" };
/** How likely each segment is to hold a product, and whether it may at all. */
const FIT: Record<string, Partial<Record<Product, number>>> = {
  Private: { custody: 0.95, advisory: 0.7, discretionary: 0.45, lending: 0.35, fx: 0.2, structured: 0.3, insurance: 0.35, pension: 0.4 },
  Affluent: { custody: 0.9, advisory: 0.55, discretionary: 0.25, lending: 0.2, fx: 0.1, structured: 0.15, insurance: 0.4, pension: 0.55 },
  Corporate: { custody: 0.9, advisory: 0.35, discretionary: 0.2, lending: 0.6, fx: 0.65, structured: 0.3, insurance: 0.15 },
  Institutional: { custody: 1, advisory: 0.3, discretionary: 0.6, fx: 0.5, structured: 0.35 },
};
const SEGMENTS: Record<string, { count: number; aum: [number, number]; bps: [number, number] }> = {
  Private: { count: 24, aum: [2_000_000, 60_000_000], bps: [0.006, 0.011] },
  Affluent: { count: 18, aum: [500_000, 3_000_000], bps: [0.008, 0.013] },
  Corporate: { count: 12, aum: [5_000_000, 120_000_000], bps: [0.003, 0.006] },
  Institutional: { count: 6, aum: [80_000_000, 420_000_000], bps: [0.0015, 0.0035] },
};
const NAMES = [
  "Aldana Holdings", "Beaumont Family Office", "Castellane Capital", "Dufresne & Fils", "Ekholm Foundation", "Ferraro Industries", "Gauthier Trust", "Hallberg Partners",
  "Isler Immobilien", "Jansen Logistics", "Kessler Pension Fund", "Lindqvist Estate", "Marchetti Group", "Nørgaard Shipping", "Oliveira Textiles", "Pauwels Brewing",
  "Quiroga Family", "Rehn Engineering", "Santoro Vineyards", "Terlinden Holding", "Urquhart Partners", "Vasseur Médical", "Weiss Stiftung", "Ximenes Advisory",
  "Ysebaert Trading", "Zimmermann Family", "Arendt Clinics", "Bianchi Hospitality", "Coelho Agro", "Devos Capital", "Esposito Design", "Fontaine Pharma",
  "Grünwald Robotics", "Hoffmann Trust", "Iglesias Foundation", "Jørgensen Family", "Kremer Partners", "Lacroix Luxury", "Moreau Holdings", "Neumann Insurance Fund",
  "Orsini Estate", "Peeters Retail", "Quintana Energy", "Rossi Family Office", "Schmitt Treuhand", "Tavares Marine", "Ullrich Automotive", "Vermeer Art Trust",
  "Wagner Pension Scheme", "Xavier Family", "Yildiz Textiles", "Zanetti Foods", "Albrecht Holdings", "Bergström Fund", "Carvalho Family", "De Wit Properties",
  "Eriksen Capital", "Fischer Family Office", "Goossens Trust", "Henriques Logistics",
];

/** Where each cluster sits on risk (1 to 7) and return this year: careful core, growth that takes risk, at-risk losers, dormant cash. */
const CENTRES: Record<string, { risk: number; ret: number }> = {
  Core: { risk: 3.5, ret: 0.045 },
  Growth: { risk: 5.6, ret: 0.1 },
  "At risk": { risk: 4.6, ret: -0.035 },
  Dormant: { risk: 1.6, ret: 0.008 },
};
const CORE = { risk: 3.5, ret: 0.045 };

interface Client {
  id: string;
  name: string;
  segment: string;
  rm: string;
  region: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  aum: number;
  revenue: number;
  fees: number;
  sinceYear: number;
  products: number;
  shareOfWallet: number;
  propensity: number;
  cluster: string;
  lastContact: string;
  anomaly: boolean;
  riskScore: number;
  returnYtd: number;
  custody: boolean;
  advisory: boolean;
  discretionary: boolean;
  lending: boolean;
  fx: boolean;
  structured: boolean;
  insurance: boolean;
  pension: boolean;
  mustComply?: never;
}

const clients: Client[] = [];
let n = 0;
for (const [segment, shape] of Object.entries(SEGMENTS)) {
  for (let k = 0; k < shape.count; k++) {
    const rm = RMS[n % RMS.length] as (typeof RMS)[number];
    const region = OFFICES[rm].region;
    const place = pick(PLACES[region] as NonNullable<(typeof PLACES)[string]>);
    const flags = Object.fromEntries(PRODUCTS.map((p) => [p, random() < (FIT[segment]?.[p] ?? 0)])) as Record<Product, boolean>;
    if (!Object.values(flags).some(Boolean)) flags.custody = true;
    const products = Object.values(flags).filter(Boolean).length;
    const aum = round(Math.exp(between(Math.log(shape.aum[0]), Math.log(shape.aum[1]))) / 10_000) * 10_000;
    const revenue = round(aum * between(shape.bps[0], shape.bps[1]) * (0.8 + products * 0.06));
    const shareOfWallet = round(Math.min(0.92, 0.12 + products * 0.08 + between(-0.05, 0.12)), 2);
    const propensity = Math.round(Math.max(5, Math.min(97, 85 - shareOfWallet * 60 + between(-12, 18))));
    const contactDays = Math.round(Math.exp(between(0, Math.log(400))));
    const cluster = contactDays > 180 && products <= 2 ? "Dormant" : contactDays > 120 ? "At risk" : shareOfWallet < 0.45 && propensity >= 55 ? "Growth" : "Core";
    clients.push({
      id: `c${String(n + 1).padStart(2, "0")}`,
      name: NAMES[n] as string,
      segment,
      rm,
      region,
      city: pick(place.cities),
      country: place.country,
      lat: round(place.lat + between(-0.4, 0.4), 2),
      lon: round(place.lon + between(-0.4, 0.4), 2),
      aum,
      revenue,
      fees: round(revenue * between(0.62, 0.78)),
      sinceYear: Math.round(between(2008, 2026)),
      products,
      shareOfWallet,
      propensity,
      cluster,
      lastContact: daysAgo(contactDays),
      anomaly: random() < 0.13,
      // Each cluster sits around its own risk and return, as segments found by analysis do, so their areas separate.
      riskScore: Math.max(1, Math.min(7, Math.round((CENTRES[cluster] ?? CORE).risk + between(-1.2, 1.2) + (segment === "Institutional" ? -0.5 : 0)))),
      returnYtd: round((CENTRES[cluster] ?? CORE).ret + between(-0.025, 0.025), 3),
      ...flags,
    });
    n++;
  }
}
// Aldana Holdings is the client the stories follow: a Core client with room to grow.
const aldana = clients[0] as Client;
Object.assign(aldana, { rm: "Jonas Berg", region: "Benelux", city: "Luxembourg", country: "LU", lat: 49.61, lon: 6.13, cluster: "Core", lastContact: daysAgo(6), anomaly: true, propensity: 72, shareOfWallet: 0.48, custody: true, advisory: true, lending: true, fx: false, discretionary: false, structured: false, insurance: true, pension: false });
aldana.products = PRODUCTS.filter((p) => aldana[p]).length;

// Holdings in long form: what each client holds, could buy, or cannot.
const holdings = clients.flatMap((client) =>
  PRODUCTS.map((product) => {
    const fit = FIT[client.segment]?.[product];
    const holds = client[product];
    const state = holds ? "Holds" : fit === undefined ? "Not eligible" : "Opportunity";
    const propensity = state === "Not eligible" ? 0 : Math.round(Math.max(3, Math.min(98, client.propensity * (fit ?? 0) * 1.6 + between(-10, 10))));
    const share = (fit ?? 0.1) / Object.values(FIT[client.segment] ?? {}).reduce((a, b) => a + b, 0);
    const revenue = holds ? round(client.revenue * share * between(0.7, 1.3)) : 0;
    const potential = state === "Opportunity" ? round((client.aum * between(0.0008, 0.003) * propensity) / 100) : 0;
    return { client: client.name, product: PRODUCT_NAMES[product], state, propensity, revenue, potential };
  }),
);

// Each client's revenue is split across the products it holds, so the products add up to the book exactly.
for (const client of clients) {
  const held = holdings.filter((h) => h.client === client.name && h.state === "Holds");
  const raw = held.reduce((sum, h) => sum + h.revenue, 0);
  let left = client.revenue;
  held.forEach((h, i) => {
    h.revenue = i === held.length - 1 ? left : round((h.revenue / (raw || 1)) * client.revenue);
    left -= h.revenue;
  });
}

// Cross-sell paths: a product held, and the opportunity most often beside it.
const pathCounts = new Map<string, number>();
for (const client of clients) {
  const held = PRODUCTS.filter((p) => client[p]);
  const open = holdings.filter((h) => h.client === client.name && h.state === "Opportunity" && h.propensity >= 45).map((h) => h.product);
  for (const from of held) for (const to of open) pathCounts.set(`${PRODUCT_NAMES[from]}|${to}`, (pathCounts.get(`${PRODUCT_NAMES[from]}|${to}`) ?? 0) + 1);
}
const crossSellPaths = [...pathCounts.entries()]
  .map(([key, count]) => ({ from: `${key.split("|")[0]} held`, to: `${key.split("|")[1]} opportunity`, clients: count }))
  .sort((a, b) => b.clients - a.clients)
  .slice(0, 14);

// History: a full story for Aldana Holdings, a few lines for everyone else.
const KINDS = ["Meeting", "Call", "Trade", "Campaign", "Complaint", "Onboarding", "Review", "Payment"] as const;
const history: { client: string; date: string; kind: string; title: string; note: string; amount: number | null; rm: string }[] = [];
const aldanaStory: [number, (typeof KINDS)[number], string, string, number | null][] = [
  [1180, "Onboarding", "Account opened", "Custody and advisory mandate signed in Luxembourg.", 18_000_000],
  [1090, "Meeting", "First portfolio review", "Agreed a balanced profile, risk score 4.", null],
  [980, "Trade", "Bond ladder built", "Five-year EUR investment grade ladder.", 6_200_000],
  [840, "Campaign", "Lombard lending offer", "Responded to the spring lending campaign.", null],
  [800, "Payment", "Lombard facility drawn", "Credit line used for a property purchase.", 4_500_000],
  [720, "Review", "Annual review", "Share of wallet estimated at 40%.", null],
  [610, "Complaint", "Statement delay", "Quarterly statement arrived two weeks late; resolved.", null],
  [540, "Meeting", "Succession planning", "Second generation joined the meeting.", null],
  [470, "Trade", "Equity sleeve added", "Global equity ETF sleeve, 15% of assets.", 3_100_000],
  [410, "Campaign", "Insurance wrapper", "Took up the insurance wrapper for the children.", null],
  [380, "Payment", "Insurance premium", "First premium paid into the wrapper.", 1_200_000],
  [300, "Call", "Rates discussion", "Asked about locking in deposit rates.", null],
  [240, "Review", "Risk profile confirmed", "Risk score 4 kept after the annual questionnaire.", null],
  [190, "Trade", "FX forward", "Hedged a USD inflow for six months.", 2_000_000],
  [150, "Meeting", "Discretionary proposal", "Presented a discretionary mandate; thinking it over.", null],
  [120, "Call", "Follow-up on proposal", "Wants a lower fee tier above €25M.", null],
  [95, "Campaign", "Structured notes Q3", "Opened the mailing, did not respond.", null],
  [70, "Payment", "Inflow", "Dividend from the family company deposited.", 2_800_000],
  [45, "Complaint", "App login issue", "Two-factor codes failed for a week; fixed.", null],
  [30, "Review", "Portfolio drift", "Equities over target by 4 points; rebalance agreed.", null],
  [18, "Trade", "Rebalance", "Sold equities into fixed income.", 1_400_000],
  [6, "Meeting", "Discretionary mandate decision", "Will sign at a 0.55% fee; paperwork sent.", null],
];
for (const [days, kind, title, note, amount] of aldanaStory) history.push({ client: aldana.name, date: daysAgo(days), kind, title, note, amount, rm: aldana.rm });
const TITLES: Record<(typeof KINDS)[number], string[]> = {
  Meeting: ["Portfolio review", "Annual meeting", "Planning session"],
  Call: ["Check-in call", "Market update call", "Fee question"],
  Trade: ["Bond purchase", "Equity rebalance", "Fund switch"],
  Campaign: ["Pension autumn mailing", "FX hedging offer", "ESG discretionary offer"],
  Complaint: ["Statement delay", "Transfer delay", "Reporting error"],
  Onboarding: ["Account opened"],
  Review: ["Risk profile review", "KYC refresh"],
  Payment: ["Inflow", "Fee debit", "Loan drawdown"],
};
for (const client of clients.slice(1)) {
  const count = 1 + Math.floor(random() * 3);
  for (let k = 0; k < count; k++) {
    const kind = pick(KINDS.filter((kd) => kd !== "Onboarding"));
    const amount = kind === "Trade" || kind === "Payment" ? round(client.aum * between(0.01, 0.12) / 1000) * 1000 : null;
    history.push({ client: client.name, date: daysAgo(Math.round(between(2, 700))), kind, title: pick(TITLES[kind]), note: "", amount, rm: client.rm });
  }
}
history.sort((a, b) => (a.date < b.date ? -1 : 1));

// Monthly activity per client, twelve months to October 2026.
const months: string[] = [];
for (let k = 11; k >= 0; k--) {
  const d = new Date(Date.UTC(2026, 9 - k, 1));
  months.push(d.toISOString().slice(0, 7));
}
const activity = clients.flatMap((client) => {
  const base = { Core: 1.1, Growth: 1.3, "At risk": 0.8, Dormant: 0.4 }[client.cluster] ?? 1;
  return months.map((month, i) => {
    const drift = client.cluster === "At risk" ? 1 - i * 0.04 : client.cluster === "Growth" ? 1 + i * 0.03 : 1;
    const level = base * drift;
    return {
      client: client.name,
      segment: client.segment,
      rm: client.rm,
      month,
      trades: Math.max(0, Math.round(level * between(1, 9) * (client.segment === "Institutional" ? 3 : 1))),
      logins: Math.max(0, Math.round(level * between(2, 24))),
      revenue: round((client.revenue / 12) * level * between(0.8, 1.2)),
    };
  });
});

// Daily metrics with an expected band, July to October 2026. A day outside its band is an anomaly.
const METRICS: { metric: string; base: number; swing: number; weekend: number; trend: number; spikes: number[]; places: number }[] = [
  { metric: "Net new money", base: 2_400_000, swing: 900_000, weekend: 0.15, trend: 0.002, spikes: [12, 47, 88, 101], places: 0 },
  { metric: "Fee revenue", base: 185_000, swing: 28_000, weekend: 0.3, trend: 0.001, spikes: [30, 66, 110], places: 0 },
  { metric: "Trades", base: 420, swing: 70, weekend: 0.2, trend: 0.0015, spikes: [5, 52, 53, 77, 99], places: 0 },
  { metric: "Complaints", base: 6, swing: 2.5, weekend: 0.3, trend: 0, spikes: [20, 44, 45, 46, 83, 112], places: 0 },
  { metric: "Logins", base: 3_100, swing: 400, weekend: 0.45, trend: 0.0025, spikes: [38, 71, 104], places: 0 },
  { metric: "FX volume", base: 9_800_000, swing: 2_600_000, weekend: 0.1, trend: 0.001, spikes: [9, 60, 61, 95], places: 0 },
];
const start = new Date(Date.UTC(2026, 6, 1));
const dayCount = Math.round((TODAY.getTime() - start.getTime()) / DAY);
const metricsDaily: { date: string; metric: string; value: number; expected: number; low: number; high: number; flag: boolean }[] = [];
for (const m of METRICS) {
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(start.getTime() + i * DAY);
    const weekday = date.getUTCDay();
    const quiet = weekday === 0 || weekday === 6 ? m.weekend : 1;
    const expected = round(m.base * quiet * (1 + m.trend * i), m.places);
    const width = m.swing * Math.max(0.4, quiet);
    const low = round(Math.max(0, expected - width), m.places);
    const high = round(expected + width, m.places);
    let value = expected + between(-0.62, 0.62) * width;
    const spike = m.spikes.indexOf(i);
    if (spike >= 0) value = spike % 3 === 1 ? low - width * between(0.15, 0.6) : high + width * between(0.2, 1.1);
    value = round(Math.max(0, value), m.places);
    metricsDaily.push({ date: iso(date), metric: m.metric, value, expected, low, high, flag: value < low || value > high });
  }
}
const flaggedToday = metricsDaily.filter((r) => r.date === daysAgo(1) && r.flag).length;
const anomalySummary = [
  {
    asOf: daysAgo(1),
    anomaliesWeek: metricsDaily.filter((r) => r.flag && r.date >= daysAgo(7)).length,
    anomaliesMonth: metricsDaily.filter((r) => r.flag && r.date >= daysAgo(30)).length,
    metricsFlaggedToday: flaggedToday,
    metricsWatched: METRICS.length,
    daysSinceLast: Math.round((TODAY.getTime() - new Date(metricsDaily.filter((r) => r.flag).map((r) => r.date).sort().at(-1) as string).getTime()) / DAY),
  },
];

// Campaigns, each a funnel from targeted to converted.
const campaigns = [
  ["Lombard lending spring", "Lending", "2026-03-02", "2026-04-30", 420, 310, 96, 31, 1_420_000, 86_000],
  ["Pension autumn", "Pension", "2026-09-07", "2026-11-30", 380, 290, 118, 44, 960_000, 54_000],
  ["FX hedging for corporates", "FX", "2026-05-04", "2026-06-26", 160, 128, 52, 23, 1_180_000, 48_000],
  ["ESG discretionary", "Discretionary", "2026-04-13", "2026-07-10", 520, 360, 74, 19, 2_050_000, 142_000],
  ["Structured notes Q3", "Structured", "2026-07-06", "2026-09-25", 300, 240, 41, 9, 610_000, 71_000],
  ["Insurance wrapper", "Insurance", "2026-02-02", "2026-05-29", 260, 190, 63, 27, 840_000, 39_000],
  ["Digital onboarding", "Custody", "2026-06-01", "2026-10-30", 900, 700, 310, 140, 380_000, 95_000],
  ["Advisory upgrade", "Advisory", "2026-08-17", "2026-12-18", 240, 170, 58, 16, 720_000, 33_000],
].map(([campaign, product, start, end, targeted, contacted, responded, converted, revenue, cost]) => ({ campaign, product, start, end, targeted, contacted, responded, converted, revenue, cost }));
const rate = (c: (typeof campaigns)[number]) => Number(c.converted) / Number(c.targeted);
const best = campaigns.reduce((a, b) => (rate(b) > rate(a) ? b : a));
const campaignFunnel = [
  { campaign: best.campaign, stage: "Targeted", clients: best.targeted },
  { campaign: best.campaign, stage: "Contacted", clients: best.contacted },
  { campaign: best.campaign, stage: "Responded", clients: best.responded },
  { campaign: best.campaign, stage: "Converted", clients: best.converted },
];

// Adoption cohorts: the share using the digital channel, month by month since onboarding.
const adoption: { cohort: string; monthsSince: number; clients: number; adopted: number }[] = [];
["2024-Q3", "2024-Q4", "2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4"].forEach((cohort, c) => {
  const size = Math.round(between(28, 64));
  const ceiling = 0.55 + c * 0.06;
  for (let m = 0; m <= 12; m++) adoption.push({ cohort, monthsSince: m, clients: size, adopted: round(Math.min(0.97, ceiling * (1 - Math.exp(-m / (4.5 - c * 0.3))) + between(-0.02, 0.02)), 2) });
});

// Products, coverage, allocation, offices, bridge, summary, segment targets.
const products = PRODUCTS.map((p, i) => {
  const held = clients.filter((c) => c[p]);
  const revenue = holdings.filter((h) => h.product === PRODUCT_NAMES[p] && h.state === "Holds").reduce((s, h) => s + h.revenue, 0);
  const penetration = round(held.length / clients.length, 2);
  return {
    product: PRODUCT_NAMES[p],
    clients: held.length,
    revenue: round(revenue),
    margin: round([0.42, 0.55, 0.61, 0.33, 0.47, 0.58, 0.36, 0.44][i] as number, 2),
    growth: round([0.04, 0.11, 0.18, 0.07, 0.15, -0.03, 0.09, 0.21][i] as number, 2),
    penetration,
    penetrationTarget: round(Math.min(0.98, penetration + ([0.02, 0.12, 0.15, 0.1, 0.08, 0.05, 0.1, 0.14][i] as number)), 2),
    nps: [48, 41, 55, 37, 44, 29, 39, 46][i],
  };
});
const rmCoverage = RMS.map((rm, i) => {
  const book = clients.filter((c) => c.rm === rm);
  return {
    rm,
    office: OFFICES[rm].office,
    clients: book.length,
    capacity: [12, 14, 11, 12, 13, 12][i],
    aum: book.reduce((s, c) => s + c.aum, 0),
    revenue: book.reduce((s, c) => s + c.revenue, 0),
    meetingsYtd: [38, 27, 44, 31, 36, 22][i],
    target: 40,
  };
});
const rmOffices = Object.entries(OFFICES)
  .filter(([rm], i, all) => all.findIndex(([, o]) => o.office === OFFICES[rm as (typeof RMS)[number]].office) === i)
  .map(([, o]) => ({ office: o.office, country: o.country, kind: o.office === "Luxembourg" ? "Head office" : "Branch", note: `${rmCoverage.filter((r) => r.office === o.office).reduce((s, r) => s + r.clients, 0)} clients` }));
const portfolioAllocation = [
  ["Equities", 0.44, 0.4, 0.3, 0.5],
  ["Fixed income", 0.27, 0.32, 0.25, 0.4],
  ["Cash", 0.09, 0.05, 0.02, 0.1],
  ["Alternatives", 0.07, 0.08, 0.05, 0.12],
  ["Real estate", 0.06, 0.07, 0.03, 0.1],
  ["Private markets", 0.04, 0.06, 0, 0.08],
  ["Commodities", 0.03, 0.02, 0, 0.05],
].map(([assetClass, current, target, min, max]) => ({ assetClass, current, target, min, max }));
const totalRevenue = clients.reduce((s, c) => s + c.revenue, 0);
const commercialBridge = [
  { step: "Revenue 2025", amount: round(totalRevenue * 0.91) },
  { step: "New clients", amount: round(totalRevenue * 0.07) },
  { step: "Deepening", amount: round(totalRevenue * 0.06) },
  { step: "Market effect", amount: round(totalRevenue * 0.03) },
  { step: "Pricing", amount: round(totalRevenue * -0.02) },
  { step: "Outflows", amount: round(totalRevenue * -0.03) },
  { step: "Lost clients", amount: round(totalRevenue * -0.02) },
];
const totalAum = clients.reduce((s, c) => s + c.aum, 0);
const openOpportunities = new Set(holdings.filter((h) => h.state === "Opportunity" && h.propensity >= 45).map((h) => h.client)).size;
const potential = holdings.filter((h) => h.state === "Opportunity").reduce((s, h) => s + h.potential, 0);
const commercialSummary = months.map((month, i) => {
  const grow = 1 - (11 - i) * 0.012;
  return {
    month,
    aum: round((totalAum * grow) / 1_000_000) * 1_000_000,
    revenueYtd: round((totalRevenue * (i + 1)) / 12),
    netNewMoney: round(totalAum * between(-0.002, 0.009)),
    openOpportunities: Math.round(openOpportunities * (0.8 + i * 0.02)),
    potential: round(potential * (0.85 + i * 0.015)),
    anomalies: i === 11 ? flaggedToday : Math.round(between(0, 3)),
  };
});
const segmentTargets = Object.keys(SEGMENTS).map((segment) => {
  const fees = clients.filter((c) => c.segment === segment).reduce((s, c) => s + c.fees, 0);
  return { segment, fees: round(fees), target: round(fees * ({ Private: 0.96, Affluent: 1.08, Corporate: 1.02, Institutional: 0.93 }[segment] ?? 1)) };
});

// ---- Rows the cockpit aggregates with transforms, so its segment and banker filters reach every card that can carry them ----
// (Deterministic: nothing below draws from the random generator, so every file above stays as it was.)
const clientOf = new Map(clients.map((c) => [c.name, c]));
const MARGINS: Record<string, number> = Object.fromEntries(products.map((p) => [p.product, p.margin]));
const TARGETS: Record<string, number> = Object.fromEntries(products.map((p) => [p.product, p.penetrationTarget]));

/** Splits a whole number across weights so the parts add up to it exactly (largest remainder). */
function split(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const exact = weights.map((w) => (total * w) / sum);
  const parts = exact.map(Math.floor);
  let left = total - parts.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => [e - Math.floor(e), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) {
    if (left <= 0) break;
    parts[i] = (parts[i] as number) + 1;
    left--;
  }
  return parts;
}

// Holdings carry the client's segment and banker, a held flag and the margin earned, for product cards built from them.
const holdingRows = holdings.map((h) => {
  const c = clientOf.get(h.client) as Client;
  return { ...h, segment: c.segment, rm: c.rm, held: h.state === "Holds" ? 1 : 0, marginAmount: round(h.revenue * (MARGINS[h.product] ?? 0)), penetrationTarget: TARGETS[h.product] ?? null };
});

// Clients carry their banker's office, a share of the banker's meetings and meeting target, and the book's capacity.
const clientRows = clients.map((c) => ({ ...c }));
for (const [i, rm] of RMS.entries()) {
  const book = clientRows.filter((c) => c.rm === rm);
  const cover = rmCoverage[i] as (typeof rmCoverage)[number];
  const weights = book.map((c) => 1 + c.products / 4);
  const meetings = split(cover.meetingsYtd ?? 0, weights);
  const targets = split(cover.target, weights);
  book.forEach((c, k) => Object.assign(c, { office: cover.office, meetingsYtd: meetings[k], meetingTarget: targets[k], rmCapacity: cover.capacity }));
}

// Monthly activity: revenue scaled so January to October 2026 adds up to each client's revenue (year to date), with
// the month's assets, revenue so far this year, net new money, an open-opportunity flag and the cross-sell potential.
const MONTHS_2026 = months.filter((m) => m.startsWith("2026"));
const openClients = clients.filter((c) => holdings.some((h) => h.client === c.name && h.state === "Opportunity" && h.propensity >= 45));
const potentialOf = new Map(clients.map((c) => [c.name, holdings.filter((h) => h.client === c.name && h.state === "Opportunity").reduce((sum, h) => sum + h.potential, 0)]));
const nnmByMonth = new Map(commercialSummary.map((r) => [r.month, r.netNewMoney]));
const activityRows = activity.map((r) => ({ ...r })) as (typeof activity[number] & Record<string, number | string>)[];
for (const c of clients) {
  const rows = activityRows.filter((r) => r.client === c.name);
  const ytdRaw = rows.filter((r) => MONTHS_2026.includes(r.month)).reduce((sum, r) => sum + r.revenue, 0);
  const factor = c.revenue / (ytdRaw || 1);
  let left = c.revenue;
  const last2026 = rows.filter((r) => MONTHS_2026.includes(r.month)).at(-1);
  for (const r of rows) {
    if (r === last2026) r.revenue = left;
    else {
      r.revenue = round(r.revenue * factor);
      if (MONTHS_2026.includes(r.month)) left -= r.revenue;
    }
  }
  const openAt = openClients.indexOf(c);
  rows.forEach((r, i) => {
    const year = r.month.slice(0, 4);
    r.revenueYtd = rows.filter((o, j) => j <= i && o.month.startsWith(year)).reduce((sum, o) => sum + o.revenue, 0);
    r.aum = i === rows.length - 1 ? c.aum : round((c.aum * (1 - (11 - i) * 0.012)) / 10_000) * 10_000;
    // Open opportunities grow through the year: the first open clients are open from the start, the last ones by October.
    r.openOpportunity = openAt >= 0 && openAt < Math.round(openClients.length * Math.min(1, 0.8 + i * 0.02)) ? 1 : 0;
    r.potential = round(((potentialOf.get(c.name) ?? 0) * (0.85 + i * 0.015)) / (0.85 + 11 * 0.015));
  });
}
// Net new money: each month's book figure, shared across clients by their assets that month.
for (const month of months) {
  const rows = activityRows.filter((r) => r.month === month);
  const total = nnmByMonth.get(month) ?? 0;
  const aum = rows.reduce((sum, r) => sum + Number(r.aum), 0);
  let left = total;
  rows.forEach((r, k) => {
    r.netNewMoney = k === rows.length - 1 ? left : round((total * Number(r.aum)) / aum);
    left -= Number(r.netNewMoney);
  });
}
// The summary is now the sum of those rows, so it agrees with every card built from them.
const flagsIn = (month: string) => metricsDaily.filter((r) => r.flag && r.date.startsWith(month)).length;
for (const row of commercialSummary) {
  const rows = activityRows.filter((r) => r.month === row.month);
  const sum = (field: string) => rows.reduce((acc, r) => acc + Number(r[field] ?? 0), 0);
  Object.assign(row, { aum: sum("aum"), revenueYtd: sum("revenueYtd"), netNewMoney: sum("netNewMoney"), openOpportunities: sum("openOpportunity"), potential: sum("potential"), anomalies: flagsIn(row.month) });
}
// "This month" is the calendar month, as on the anomaly tracker: October so far.
(anomalySummary[0] as Record<string, unknown>).anomaliesMonth = flagsIn(months.at(-1) as string);

// The revenue bridge per client: each step is the same share of the client's revenue as of the book's, and a
// client's steps add up to its revenue, so the bridge ends on the book's revenue under any filter.
const BRIDGE: [string, number][] = [["Revenue 2025, January to October", 0.91], ["New clients", 0.07], ["Deepening", 0.06], ["Market effect", 0.03], ["Pricing", -0.02], ["Outflows", -0.03], ["Lost clients", -0.02]];
const bridgeRows = BRIDGE.flatMap(([step]) => clients.map((c) => ({ step, client: c.name, segment: c.segment, rm: c.rm, amount: 0 })));
for (const c of clients) {
  let left = c.revenue;
  BRIDGE.forEach(([step, share], k) => {
    const row = bridgeRows.find((r) => r.step === step && r.client === c.name) as (typeof bridgeRows)[number];
    row.amount = k === BRIDGE.length - 1 ? left : round(c.revenue * share);
    left -= row.amount;
  });
}

// Cross-sell paths per client: one row per product held and opportunity beside it.
const pathRows = clients.flatMap((c) => {
  const held = PRODUCTS.filter((p) => c[p]);
  const open = holdings.filter((h) => h.client === c.name && h.state === "Opportunity" && h.propensity >= 45).map((h) => h.product);
  return held.flatMap((from) => open.map((to) => ({ client: c.name, segment: c.segment, rm: c.rm, from: `${PRODUCT_NAMES[from]} held`, to: `${to} opportunity`, clients: 1 })));
});

// Fees against target per segment and banker; the target keeps each segment's ratio.
const feeRows = Object.keys(SEGMENTS).flatMap((segment) =>
  RMS.map((rm) => {
    const fees = round(clients.filter((c) => c.segment === segment && c.rm === rm).reduce((sum, c) => sum + c.fees, 0));
    return { segment, rm, fees, target: round(fees * ({ Private: 0.96, Affluent: 1.08, Corporate: 1.02, Institutional: 0.93 }[segment] ?? 1)) };
  }),
).filter((r) => r.fees > 0);

// Campaigns per segment and banker: each campaign's numbers shared across the books it reached, weighted by how many
// clients there could take its product, every part a whole number that adds up to the campaign's total.
const PRODUCT_KEY = Object.fromEntries(Object.entries(PRODUCT_NAMES).map(([k, v]) => [v, k])) as Record<string, Product>;
const cells = Object.keys(SEGMENTS).flatMap((segment) => RMS.map((rm) => ({ segment, rm })));
const campaignRows = campaigns.flatMap((camp) => {
  const key = PRODUCT_KEY[String(camp.product)] as Product;
  const weights = cells.map(({ segment, rm }) => clients.filter((c) => c.segment === segment && c.rm === rm && FIT[segment]?.[key] !== undefined).length * (FIT[segment]?.[key] ?? 0));
  const parts = Object.fromEntries((["targeted", "contacted", "responded", "converted", "revenue", "cost"] as const).map((f) => [f, split(Number(camp[f]), weights)]));
  return cells
    .map(({ segment, rm }, i) => ({ campaign: camp.campaign, product: camp.product, start: camp.start, end: camp.end, segment, rm, targeted: parts.targeted?.[i] ?? 0, contacted: parts.contacted?.[i] ?? 0, responded: parts.responded?.[i] ?? 0, converted: parts.converted?.[i] ?? 0, revenue: parts.revenue?.[i] ?? 0, cost: parts.cost?.[i] ?? 0 }))
    .filter((r) => r.targeted > 0);
});
const STAGES = [["Targeted", "targeted"], ["Contacted", "contacted"], ["Responded", "responded"], ["Converted", "converted"]] as const;
const stageRows = STAGES.flatMap(([stage, field]) => campaignRows.map((r) => ({ stage, campaign: r.campaign, segment: r.segment, rm: r.rm, clients: r[field] })));

// History rows carry the client's segment beside its banker, so the story follows the segment filter too.
const historyRows = history.map((h) => ({ ...h, segment: clientOf.get(h.client)?.segment ?? null }));

await mkdir(out(""), { recursive: true });
const files: Record<string, unknown> = {
  "clients.json": clientRows,
  "holdings.json": holdingRows,
  "client-history.json": historyRows,
  "client-activity.json": activityRows,
  "metrics-daily.json": metricsDaily,
  "anomaly-summary.json": anomalySummary,
  "campaigns.json": campaigns,
  "campaign-funnel.json": campaignFunnel,
  "adoption.json": adoption,
  "products.json": products,
  "rm-coverage.json": rmCoverage,
  "rm-offices.json": rmOffices,
  "portfolio-allocation.json": portfolioAllocation,
  "cross-sell-paths.json": crossSellPaths,
  "commercial-bridge.json": commercialBridge,
  "commercial-summary.json": commercialSummary,
  "segment-targets.json": segmentTargets,
  "bridge-by-client.json": bridgeRows,
  "cross-sell-by-client.json": pathRows,
  "fees-by-book.json": feeRows,
  "campaign-reach.json": campaignRows,
  "campaign-stages.json": stageRows,
};
for (const [name, rows] of Object.entries(files)) {
  const list = rows as Record<string, unknown>[];
  await writeFile(out(name), `[\n${list.map((row) => `  ${JSON.stringify(row)}`).join(",\n")}\n]\n`);
  console.log(`${name}: ${list.length} rows`);
}
