/**
 * The wallet x-ray: an audit of one client's wallet, and the account strategy it supports.
 *
 * `auditWallet(input)` reads one client row and, when given, its holdings, history, monthly activity, health row,
 * deals and the health thresholds. Every figure in the audit carries the field it came from (`from`), so a reader can
 * check it; every risk carries the rule that raised it; anything the inputs could not answer is listed as a gap. The
 * audit holds no sentences: it is data, worded by `strategyMarkdown` and `strategyText` in English, French or German.
 *
 * Nothing is invented. Estimates are labelled as such and say their formula (the wallet's full size is AuM divided by
 * share of wallet); a target is a threshold from the data, or a direction from today's value, never a made-up number.
 *
 * Pure: no DOM, so it runs in Node, in tests and in the MCP server.
 *
 * @module
 */
import { readNumber } from "./formats.ts";
import type { Row } from "./types.ts";
import { langOf } from "./words.ts";
import type { Lang } from "./words.ts";

/** A figure and the field it was read from: `client.aum`, `holdings[FX].potential`, `activity.revenue (12 months)`. */
export interface Sourced<T> {
  value: T;
  from: string;
}

/** What `auditWallet` reads. Only `client` is required; each other source widens the audit, and its absence is a gap. */
export interface WalletInput {
  client: Row;
  /** Rows of client × product with `state` (Holds, Opportunity, Not eligible), `propensity`, `revenue`, `potential`. */
  holdings?: Row[];
  /** Touchpoints with `date`, `kind`, `title`. */
  history?: Row[];
  /** Monthly rows with `month`, `revenue`, `trades`, `logins`, `netNewMoney`, `aum`. */
  activity?: Row[];
  /** The client's health row: measures with their `<measure>Rag` statuses and the perspective statuses. */
  health?: Row;
  /** Deals with `deal`, `product`, `stage`, `value`, `probability`, `closeDate`, `open`. */
  deals?: Row[];
  /** The health model's thresholds: `metric`, `status`, `label`, `perspectiveLabel`, `green`, `amber`, `goodWhen`, `unit`. */
  thresholds?: Row[];
  /** The day the audit speaks for (YYYY-MM-DD). Defaults to the health row's `asOf`, else the newest date in the inputs. */
  asOf?: string;
  /** The currency of money fields, such as "EUR". Without it, money is written as plain numbers. */
  currency?: string;
}

/** The sources an audit can read, in the order the "data and assumptions" section lists them. */
export const WALLET_SOURCES = ["holdings", "history", "activity", "health", "deals", "thresholds"] as const;
export type WalletSource = (typeof WALLET_SOURCES)[number];

/** A product the client holds, could take, or cannot. */
export interface WalletProduct {
  product: string;
  state: "held" | "open" | "not eligible";
  revenue?: Sourced<number>;
  from: string;
}

/** An opportunity, ranked by propensity × potential. */
export interface WalletOpportunity {
  product: string;
  propensity: Sourced<number>;
  potential: Sourced<number>;
  /** Propensity (0 to 1) × potential: the expected value used to rank. */
  score: number;
  /** An open deal on the same product, when there is one. */
  deal?: WalletDeal;
}

/** A deal, open or closed. */
export interface WalletDeal {
  id: string;
  product: string;
  stage: string;
  value: Sourced<number>;
  probability?: number;
  close?: string;
  open: boolean;
}

/** The rule that raised a risk, so the strategy can say why. */
export type WalletRule =
  | { kind: "threshold"; green: number; amber: number; goodWhen: "up" | "down"; unit: string }
  | { kind: "status" }
  | { kind: "anomaly" }
  | { kind: "concentration"; product: string; limit: number }
  | { kind: "contact"; amber: number; red: number }
  | { kind: "complaints"; window: number };

/** Something to address, worst first. */
export interface WalletRisk {
  /** The measure's field, such as `kycDays`, or the rule's name (`anomaly`, `concentration`, `contact`, `complaints`). */
  metric: string;
  severity: "high" | "medium";
  /** The measure's label from the thresholds, else the field. */
  label: string;
  perspective?: string;
  value: Sourced<number | string | boolean>;
  rule: WalletRule;
}

/** One touchpoint. */
export interface WalletTouch {
  date: string;
  kind: string;
  title: string;
  from: string;
}

/** The audit: data only, worded by `strategyMarkdown`. */
export interface WalletAudit {
  name: string;
  asOf: string;
  currency?: string;
  profile: {
    segment?: string;
    rm?: string;
    region?: string;
    since?: Sourced<number>;
    aum?: Sourced<number>;
    revenue?: Sourced<number>;
    fees?: Sourced<number>;
  };
  /** The wallet's size, estimated as AuM ÷ share of wallet, and the part held elsewhere. */
  wallet?: { share: Sourced<number>; total: Sourced<number>; elsewhere: Sourced<number>; onePoint: number };
  coverage: { products: WalletProduct[]; held: number; eligible: number; penetration: number | null };
  opportunities: WalletOpportunity[];
  risks: WalletRisk[];
  /** Revenue and activity over the months given (up to 12), first three months against the last three. */
  momentum?: {
    months: number;
    first: string;
    last: string;
    revenue: Sourced<number>;
    revenueChange: number | null;
    trades: number | null;
    tradesChange: number | null;
    loginsChange: number | null;
    netNewMoney: Sourced<number> | null;
    aumStart: number | null;
    aumEnd: number | null;
  };
  pipeline: { open: WalletDeal[]; weighted: number; won: number; lost: number };
  history: { recent: WalletTouch[]; lastTouch?: WalletTouch; daysSinceTouch?: number; complaints90: number };
  /** What the client row says to do next, from the call list. */
  callList?: { reason?: Sourced<string>; nextAction?: Sourced<string> };
  /** Each health measure with its status, value and thresholds, for "what to watch". */
  measures: { metric: string; label: string; perspective?: string; value: number; status: string; green: number; amber: number; goodWhen: "up" | "down"; unit: string }[];
  /** Sources not given, and fields missing from the client row. */
  gaps: string[];
  /** Sources that were read. */
  sources: WalletSource[];
}

const PRODUCT_FIELDS = ["custody", "advisory", "discretionary", "lending", "fx", "structured", "insurance", "pension"];
const isHeld = (value: unknown) => value === true || value === 1 || /^(true|yes|y|held|holds)$/i.test(String(value ?? ""));
const num = (value: unknown): number | null => readNumber(value);
const str = (value: unknown): string | undefined => (value === undefined || value === null || value === "" ? undefined : String(value));
const day = (value: unknown): string | undefined => (typeof value === "string" && /^\d{4}-\d{2}(-\d{2})?/.test(value) ? value.slice(0, 10) : undefined);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b.slice(0, 10)}T00:00:00Z`) - Date.parse(`${a.slice(0, 10).padEnd(10, "-01")}T00:00:00Z`)) / 86_400_000);
const sum = (values: (number | null)[]) => values.reduce<number>((total, v) => total + (v ?? 0), 0);
const mean = (values: (number | null)[]) => {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? sum(present) / present.length : null;
};
const change = (from: number | null, to: number | null) => (from === null || to === null || from === 0 ? null : (to - from) / Math.abs(from));

/** Sees each status as R, A, G or none. */
const rag = (value: unknown): "R" | "A" | "G" | undefined => {
  const text = String(value ?? "").trim().toUpperCase();
  return text === "R" || text === "RED" ? "R" : text === "A" || text === "AMBER" ? "A" : text === "G" || text === "GREEN" ? "G" : undefined;
};

/** The thresholds the contact rule uses when no health row is given: the coverage model's own (45 and 90 days). */
const CONTACT = { amber: 45, red: 90 } as const;
/** Above this share of the revenue in one product, the wallet is concentrated. */
const CONCENTRATION = 0.6;
/** Complaints counted over this many days. */
const COMPLAINT_WINDOW = 90;

/** Audits one client's wallet. See the module's note for the rules. */
export function auditWallet(input: WalletInput): WalletAudit {
  const { client } = input;
  const name = String(client.name ?? client.client ?? "");
  const gaps: string[] = [];
  const sources: WalletSource[] = [];
  for (const source of WALLET_SOURCES) {
    const given = source === "health" ? input.health !== undefined : Array.isArray(input[source]) && (input[source] as Row[]).length > 0;
    if (given) sources.push(source);
    else gaps.push(source);
  }
  const dates = [day(input.health?.asOf), ...(input.history ?? []).map((row) => day(row.date)), ...(input.activity ?? []).map((row) => (typeof row.month === "string" ? `${row.month.slice(0, 7)}-28` : undefined))].filter((d): d is string => Boolean(d));
  const asOf = input.asOf ?? day(input.health?.asOf) ?? dates.sort().at(-1) ?? new Date().toISOString().slice(0, 10);

  const sourced = (field: string): Sourced<number> | undefined => {
    const value = num(client[field]);
    if (value === null) return undefined;
    return { value, from: `client.${field}` };
  };
  const profile: WalletAudit["profile"] = {
    ...(str(client.segment) ? { segment: str(client.segment) } : {}),
    ...(str(client.rm) ? { rm: str(client.rm) } : {}),
    ...(str(client.region) ? { region: str(client.region) } : {}),
    ...(sourced("sinceYear") ? { since: sourced("sinceYear") } : {}),
    ...(sourced("aum") ? { aum: sourced("aum") } : {}),
    ...(sourced("revenue") ? { revenue: sourced("revenue") } : {}),
    ...(sourced("fees") ? { fees: sourced("fees") } : {}),
  };
  for (const field of ["aum", "shareOfWallet", "revenue", "rm"]) if (client[field] === undefined || client[field] === null) gaps.push(`client.${field}`);

  // The wallet: share of wallet s and assets A give a full wallet of A / s, of which A × (1 - s) / s sits elsewhere.
  let wallet: WalletAudit["wallet"];
  const share = num(client.shareOfWallet);
  if (profile.aum && share !== null && share > 0 && share <= 1) {
    const total = profile.aum.value / share;
    wallet = {
      share: { value: share, from: "client.shareOfWallet" },
      total: { value: total, from: "client.aum ÷ client.shareOfWallet" },
      elsewhere: { value: total - profile.aum.value, from: "client.aum ÷ client.shareOfWallet − client.aum" },
      onePoint: total / 100,
    };
  }

  // Coverage: from the holdings rows when given, else from the client's yes/no product fields.
  const products: WalletProduct[] = [];
  const holdings = input.holdings ?? [];
  if (holdings.length) {
    for (const row of holdings) {
      const product = String(row.product ?? "");
      const state = String(row.state ?? "").toLowerCase();
      const revenue = num(row.revenue);
      products.push({
        product,
        state: state.startsWith("hold") ? "held" : state.startsWith("opp") ? "open" : "not eligible",
        ...(revenue !== null && revenue > 0 ? { revenue: { value: revenue, from: `holdings[${product}].revenue` } } : {}),
        from: `holdings[${product}].state`,
      });
    }
  } else {
    for (const field of PRODUCT_FIELDS) if (field in client) products.push({ product: field, state: isHeld(client[field]) ? "held" : "open", from: `client.${field}` });
  }
  const held = products.filter((p) => p.state === "held").length;
  const eligible = products.filter((p) => p.state !== "not eligible").length;
  const coverage = { products, held, eligible, penetration: eligible ? held / eligible : null };

  // Deals.
  const deals: WalletDeal[] = (input.deals ?? []).map((row) => {
    const stage = String(row.stage ?? "");
    const value = num(row.value) ?? 0;
    const probability = num(row.probability);
    const close = day(row.closeDate);
    const id = String(row.deal ?? row.id ?? "");
    return {
      id,
      product: String(row.product ?? ""),
      stage,
      value: { value, from: `deals[${id}].value` },
      ...(probability !== null ? { probability } : {}),
      ...(close ? { close } : {}),
      open: row.open === undefined ? !/^(won|lost)$/i.test(stage) : isHeld(row.open),
    };
  });
  const open = deals.filter((d) => d.open).sort((a, b) => (a.close ?? "9999").localeCompare(b.close ?? "9999"));
  const pipeline = {
    open,
    weighted: sum(open.map((d) => d.value.value * (d.probability ?? 0))),
    won: deals.filter((d) => /^won$/i.test(d.stage)).length,
    lost: deals.filter((d) => /^lost$/i.test(d.stage)).length,
  };

  // Opportunities, ranked by expected value: propensity (as a share) × potential.
  const opportunities: WalletOpportunity[] = holdings
    .filter((row) => String(row.state ?? "").toLowerCase().startsWith("opp"))
    .map((row) => {
      const product = String(row.product ?? "");
      const propensity = num(row.propensity) ?? 0;
      const potential = num(row.potential) ?? 0;
      const deal = open.find((d) => d.product === product);
      return {
        product,
        propensity: { value: propensity, from: `holdings[${product}].propensity` },
        potential: { value: potential, from: `holdings[${product}].potential` },
        score: (propensity > 1 ? propensity / 100 : propensity) * potential,
        ...(deal ? { deal } : {}),
      };
    })
    .sort((a, b) => b.score - a.score || a.product.localeCompare(b.product));

  // Risks: every health measure off green, by its threshold; then the rules the client row and the history can answer.
  const risks: WalletRisk[] = [];
  const measures: WalletAudit["measures"] = [];
  const health = input.health;
  const covered = new Set<string>();
  if (health) {
    const thresholds = input.thresholds ?? [];
    for (const t of thresholds) {
      const metric = String(t.metric ?? "");
      const statusField = String(t.status ?? `${metric}Rag`);
      const status = rag(health[statusField]);
      const value = num(health[metric]);
      const [green, amber] = [num(t.green), num(t.amber)];
      if (value === null || green === null || amber === null) continue;
      covered.add(metric);
      const goodWhen = t.goodWhen === "down" ? "down" : "up";
      const unit = String(t.unit ?? "");
      measures.push({ metric, label: String(t.label ?? metric), ...(str(t.perspectiveLabel) ? { perspective: str(t.perspectiveLabel) } : {}), value, status: status ?? "", green, amber, goodWhen, unit });
      if (status === "R" || status === "A") {
        risks.push({
          metric,
          severity: status === "R" ? "high" : "medium",
          label: String(t.label ?? metric),
          ...(str(t.perspectiveLabel) ? { perspective: str(t.perspectiveLabel) } : {}),
          value: { value, from: `health.${metric}` },
          rule: { kind: "threshold", green, amber, goodWhen, unit },
        });
      }
    }
    // Without thresholds, the statuses still speak, each as the model set it.
    if (!thresholds.length) {
      for (const [field, raw] of Object.entries(health)) {
        if (!field.endsWith("Rag") || /^(overall|clientSuccess|bizDev|coverage|relationship)/.test(field)) continue;
        const metric = field.slice(0, -3);
        const status = rag(raw);
        const value = num(health[metric]);
        if (value === null || (status !== "R" && status !== "A")) continue;
        covered.add(metric);
        risks.push({ metric, severity: status === "R" ? "high" : "medium", label: metric, value: { value, from: `health.${metric}` }, rule: { kind: "status" } });
      }
    }
  }
  if (isHeld(client.anomaly)) risks.push({ metric: "anomaly", severity: "medium", label: "anomaly", value: { value: true, from: "client.anomaly" }, rule: { kind: "anomaly" } });
  // Contact, when the health row does not already measure it.
  const contactDays = num(client.daysSinceContact);
  if (!covered.has("daysSinceMeeting") && contactDays !== null && contactDays > CONTACT.amber) {
    risks.push({ metric: "contact", severity: contactDays > CONTACT.red ? "high" : "medium", label: "contact", value: { value: contactDays, from: "client.daysSinceContact" }, rule: { kind: "contact", amber: CONTACT.amber, red: CONTACT.red } });
  }
  // Complaints from the history, when the health row does not already count them.
  const history = [...(input.history ?? [])].map((row) => ({ date: day(row.date) ?? "", kind: String(row.kind ?? ""), title: String(row.title ?? ""), from: `history[${day(row.date) ?? ""}]` })).filter((t) => t.date).sort((a, b) => b.date.localeCompare(a.date));
  const complaints90 = history.filter((t) => /complaint|plainte|beschwerde/i.test(t.kind) && daysBetween(t.date, asOf) <= COMPLAINT_WINDOW && daysBetween(t.date, asOf) >= 0).length;
  if (!covered.has("complaints90d") && complaints90 > 0) {
    risks.push({ metric: "complaints", severity: complaints90 > 1 ? "high" : "medium", label: "complaints", value: { value: complaints90, from: `history (kind Complaint, last ${COMPLAINT_WINDOW} days)` }, rule: { kind: "complaints", window: COMPLAINT_WINDOW } });
  }
  // Concentration: one product carrying most of the revenue the holdings show.
  const earning = products.filter((p) => p.revenue);
  const earned = sum(earning.map((p) => p.revenue?.value ?? 0));
  const top = earning.sort((a, b) => (b.revenue?.value ?? 0) - (a.revenue?.value ?? 0))[0];
  if (top?.revenue && earned > 0 && earning.length > 1 && top.revenue.value / earned > CONCENTRATION) {
    risks.push({ metric: "concentration", severity: "medium", label: "concentration", value: { value: top.revenue.value / earned, from: `holdings[${top.product}].revenue ÷ holdings revenue` }, rule: { kind: "concentration", product: top.product, limit: CONCENTRATION } });
  }
  risks.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));

  // Momentum over the latest twelve months.
  let momentum: WalletAudit["momentum"];
  const months = [...(input.activity ?? [])].filter((row) => typeof row.month === "string").sort((a, b) => String(a.month).localeCompare(String(b.month))).slice(-12);
  if (months.length >= 2) {
    const head = months.slice(0, Math.min(3, Math.floor(months.length / 2)));
    const tail = months.slice(-head.length);
    const field = (rows: Row[], key: string) => rows.map((row) => num(row[key]));
    const nnm = field(months, "netNewMoney");
    momentum = {
      months: months.length,
      first: String(months[0]?.month),
      last: String(months.at(-1)?.month),
      revenue: { value: sum(field(months, "revenue")), from: `activity.revenue (${months.length} months)` },
      revenueChange: change(mean(field(head, "revenue")), mean(field(tail, "revenue"))),
      trades: months.some((row) => num(row.trades) !== null) ? sum(field(months, "trades")) : null,
      tradesChange: change(mean(field(head, "trades")), mean(field(tail, "trades"))),
      loginsChange: change(mean(field(head, "logins")), mean(field(tail, "logins"))),
      netNewMoney: nnm.some((v) => v !== null) ? { value: sum(nnm), from: `activity.netNewMoney (${months.length} months)` } : null,
      aumStart: num(months[0]?.aum),
      aumEnd: num(months.at(-1)?.aum),
    };
  }

  const lastTouch = history[0];
  const reason = str(client.callReason);
  const next = str(client.nextAction);
  return {
    name,
    asOf,
    ...(input.currency ? { currency: input.currency } : {}),
    profile,
    ...(wallet ? { wallet } : {}),
    coverage,
    opportunities,
    risks,
    ...(momentum ? { momentum } : {}),
    pipeline,
    history: { recent: history.slice(0, 5), ...(lastTouch ? { lastTouch, daysSinceTouch: daysBetween(lastTouch.date, asOf) } : {}), complaints90 },
    ...(reason || next ? { callList: { ...(reason ? { reason: { value: reason, from: "client.callReason" } } : {}), ...(next ? { nextAction: { value: next, from: "client.nextAction" } } : {}) } } : {}),
    measures,
    gaps,
    sources,
  };
}

// ---- Wording ----

/** Number, money, share and date writers in one locale. */
interface Fmt {
  money(n: number): string;
  number(n: number): string;
  share(n: number, signed?: boolean): string;
  date(iso: string): string;
  month(ym: string): string;
  /** A measure's value or threshold in its unit. */
  unit(n: number, unit: string): string;
}

function fmtFor(locale: string, currency?: string): Fmt {
  const money = currency
    ? new Intl.NumberFormat(locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 })
    : new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const share = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const signed = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" });
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const month = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" });
  const lang = langOf(locale);
  return {
    money: (n) => money.format(n),
    number: (n) => number.format(n),
    // A true minus sign on signed changes, as everywhere else in the library.
    share: (n, s) => (s ? signed : share).format(n).replace(/^-/, "−"),
    date: (iso) => date.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`)),
    month: (ym) => month.format(new Date(`${ym.slice(0, 7)}-01T00:00:00Z`)),
    unit: (n, unit) => {
      if (/share|points/.test(unit)) return (unit === "points" ? signed : share).format(n);
      if (/times/.test(unit)) return `${number.format(n)} ×`;
      const words: Record<Lang, Record<string, string>> = {
        en: { days: "days", tickets: "tickets", complaints: "complaints", products: "products" },
        fr: { days: "jours", tickets: "tickets", complaints: "réclamations", products: "produits" },
        de: { days: "Tage", tickets: "Tickets", complaints: "Beschwerden", products: "Produkte" },
      };
      const said = words[lang][unit];
      return said ? `${number.format(n)} ${said}` : number.format(n);
    },
  };
}

/** Every phrase of the strategy, per language. Figures come in already formatted. */
interface Phrases {
  title(name: string): string;
  meta(asOf: string, rm?: string): string;
  h: Record<"summary" | "stands" | "holdCould" | "risks" | "opportunities" | "actions" | "talking" | "watch" | "data", string>;
  summaryWallet(share: string, total: string, elsewhere: string): string;
  summaryNoWallet: string;
  summaryRisks(high: number, medium: number): string;
  summaryNoRisks: string;
  summaryOpportunity(product: string, potential: string, propensity: string): string;
  summaryNoOpportunity: string;
  profile(parts: { segment?: string; region?: string; rm?: string; since?: string; years?: number }): string;
  assets(aum?: string, revenue?: string, fees?: string): string;
  walletLine(share: string, total: string, elsewhere: string, point: string): string;
  momentumLine(months: number, from: string, to: string, revenue: string, change: string | null): string;
  activityLine(trades: string | null, tradesChange: string | null, loginsChange: string | null): string;
  nnmLine(nnm: string): string;
  aumLine(start: string, end: string): string;
  heldLine(held: number, eligible: number, penetration: string, list: string): string;
  openLine(list: string): string;
  notEligibleLine(list: string): string;
  noHoldings: string;
  severity: Record<"high" | "medium", string>;
  riskThreshold(label: string, value: string, green: string, amber: string, goodWhen: "up" | "down", perspective?: string): string;
  riskStatus(label: string, value: string): string;
  riskAnomaly: string;
  riskContact(days: string, amber: number, red: number): string;
  riskComplaints(count: number, window: number): string;
  riskConcentration(product: string, share: string, limit: string): string;
  noRisks: string;
  opportunity(rank: number, product: string, propensity: string, potential: string, expected: string): string;
  opportunityDeal(id: string, stage: string, value: string, close?: string, probability?: string): string;
  noOpportunities: string;
  window: Record<"d30" | "d60" | "d90", string>;
  owner(rm: string): string;
  ownerUnknown: string;
  target: string;
  fixMeasure(label: string, op: string, green: string): { act: string; target: string };
  actAnomaly: { act: string; target: string };
  actContact: { act: string; target: string };
  actComplaints: { act: string; target: string };
  actConcentration(product: string): { act: string; target: string };
  actCallList(next: string): { act: string; target: string };
  actDeal(id: string, product: string, stage: string, close?: string): { act: string; target: string };
  actPropose(product: string, potential: string): { act: string; target: string };
  actWallet(share: string, point: string): { act: string; target: string };
  nothing: string;
  talkTenure(years: number, since: string): string;
  talkLastTouch(date: string, title: string, days: number): string;
  talkMomentum(change: string): string;
  talkOpportunity(product: string): string;
  talkRisk(label: string): string;
  talkDeal(product: string, stage: string): string;
  watchRow(kpi: string, today: string, threshold: string): string;
  watchHead: [string, string, string];
  kpiWallet: string;
  kpiRevenue(months: number): string;
  kpiNnm(months: number): string;
  kpiPipeline: string;
  thresholdText(green: string, amber: string, goodWhen: "up" | "down"): string;
  noThreshold: string;
  asOfLine(asOf: string): string;
  sourcesUsed(list: string): string;
  sourcesMissing(list: string): string;
  fieldsMissing(list: string): string;
  ruleWallet: string;
  ruleOpportunity: string;
  ruleRisk: string;
  ruleMomentum: string;
  ruleTargets: string;
  sourceNames: Record<WalletSource, string>;
}

const EN: Phrases = {
  title: (name) => `Account strategy: ${name}`,
  meta: (asOf, rm) => `As of ${asOf}${rm ? ` · Relationship manager: ${rm}` : ""}`,
  h: { summary: "Summary", stands: "Where the wallet stands", holdCould: "What we hold and what we could", risks: "Risks to address first", opportunities: "Opportunities, ranked", actions: "Next best actions", talking: "Talking points for the next meeting", watch: "What to watch", data: "Data and assumptions" },
  summaryWallet: (share, total, elsewhere) => `We hold ${share} of an estimated ${total} wallet; ${elsewhere} sits with other providers.`,
  summaryNoWallet: "The size of the wallet cannot be estimated: assets or share of wallet are missing.",
  summaryRisks: (high, medium) => `${high + medium} risk${high + medium === 1 ? "" : "s"} to address: ${high} high, ${medium} medium.`,
  summaryNoRisks: "No measure is off track or at risk in the data given.",
  summaryOpportunity: (product, potential, propensity) => `Best opportunity: ${product}, ${potential} a year at ${propensity} propensity.`,
  summaryNoOpportunity: "No open opportunity in the holdings data.",
  profile: ({ segment, region, rm, since, years }) =>
    [segment ? `${segment} client` : "Client", region ? `in ${region}` : "", since ? `since ${since}${years !== undefined ? ` (${years} years)` : ""}` : "", rm ? `, covered by ${rm}` : ""].filter(Boolean).join(" ").replace(" ,", ",") + ".",
  assets: (aum, revenue, fees) => [aum ? `Assets ${aum}` : "", revenue ? `revenue ${revenue}` : "", fees ? `fees ${fees}` : ""].filter(Boolean).join(", ") + ".",
  walletLine: (share, total, elsewhere, point) => `Share of wallet ${share}. Estimated wallet ${total}, so ${elsewhere} is held elsewhere; each point of share is about ${point} of assets.`,
  momentumLine: (months, from, to, revenue, change) => `Revenue over ${months} months (${from} to ${to}): ${revenue}${change ? `; the last three months against the first three: ${change}` : ""}.`,
  activityLine: (trades, tradesChange, loginsChange) => [trades ? `${trades} trades` : "", tradesChange ? `trading ${tradesChange}` : "", loginsChange ? `logins ${loginsChange}` : ""].filter(Boolean).join(", ") + ", same comparison.",
  nnmLine: (nnm) => `Net new money over the period: ${nnm}.`,
  aumLine: (start, end) => `Assets moved from ${start} to ${end}.`,
  heldLine: (held, eligible, penetration, list) => `Held: ${held} of ${eligible} eligible products (${penetration}): ${list}.`,
  openLine: (list) => `Could take: ${list}.`,
  notEligibleLine: (list) => `Not eligible: ${list}.`,
  noHoldings: "No product data.",
  severity: { high: "High", medium: "Medium" },
  riskThreshold: (label, value, green, amber, goodWhen, perspective) =>
    `${label}${perspective ? ` (${perspective})` : ""}: ${value}. On track ${goodWhen === "up" ? "from" : "up to"} ${green}, at risk ${goodWhen === "up" ? "from" : "up to"} ${amber}.`,
  riskStatus: (label, value) => `${label}: ${value}, flagged by the health model.`,
  riskAnomaly: "Unusual activity flagged by the anomaly tracker.",
  riskContact: (days, amber, red) => `${days} since the last contact; at risk past ${amber} days, off track past ${red}.`,
  riskComplaints: (count, window) => `${count} complaint${count === 1 ? "" : "s"} in the last ${window} days.`,
  riskConcentration: (product, share, limit) => `${product} carries ${share} of the revenue the holdings show (concentrated above ${limit}).`,
  noRisks: "None in the data given.",
  opportunity: (rank, product, propensity, potential, expected) => `${rank}. ${product}: propensity ${propensity}, potential ${potential} a year, expected value ${expected}.`,
  opportunityDeal: (id, stage, value, close, probability) => `   Open deal ${id}, ${stage}, ${value}${probability ? `, ${probability} probability` : ""}${close ? `, expected to close ${close}` : ""}.`,
  noOpportunities: "None in the holdings data.",
  window: { d30: "Within 30 days", d60: "Within 60 days", d90: "Within 90 days" },
  owner: (rm) => `Owner: ${rm}`,
  ownerUnknown: "Owner: not recorded",
  target: "Target",
  fixMeasure: (label, op, green) => ({ act: `${label}: back on track`, target: `${op} ${green}` }),
  actAnomaly: { act: "Review the flagged activity with the client", target: "flag cleared or explained" },
  actContact: { act: "Hold a review meeting", target: "last contact within 45 days" },
  actComplaints: { act: "Close the open complaints and confirm with the client", target: "no complaint in 90 days" },
  actConcentration: (product) => ({ act: `Reduce reliance on ${product}`, target: "no product above 60% of revenue" }),
  actCallList: (next) => ({ act: next, target: "done and logged" }),
  actDeal: (id, product, stage, close) => ({ act: `Advance deal ${id} (${product}) from ${stage}`, target: close ? `signed by ${close}` : "next stage reached" }),
  actPropose: (product, potential) => ({ act: `Propose ${product}`, target: `proposal presented; potential ${potential} a year` }),
  actWallet: (share, point) => ({ act: "Grow the share of wallet", target: `above ${share} (each point ≈ ${point} of assets)` }),
  nothing: "Nothing pressing in the data.",
  talkTenure: (years, since) => `Thank them for ${years} years together (client since ${since}).`,
  talkLastTouch: (date, title, days) => `Follow up on the last touchpoint, ${date} (${days} days ago): ${title}.`,
  talkMomentum: (change) => `Revenue, last three months against the first three: ${change}. Ask what is behind it.`,
  talkOpportunity: (product) => `Explore their needs around ${product}.`,
  talkRisk: (label) => `Raise ${label} openly and agree the next step.`,
  talkDeal: (product, stage) => `Check where the ${product} deal stands (${stage}).`,
  watchRow: (kpi, today, threshold) => `| ${kpi} | ${today} | ${threshold} |`,
  watchHead: ["Measure", "Today", "Threshold"],
  kpiWallet: "Share of wallet",
  kpiRevenue: (months) => `Revenue, ${months} months`,
  kpiNnm: (months) => `Net new money, ${months} months`,
  kpiPipeline: "Weighted open pipeline",
  thresholdText: (green, amber, goodWhen) => `on track ${goodWhen === "up" ? "≥" : "≤"} ${green}, at risk ${goodWhen === "up" ? "≥" : "≤"} ${amber}`,
  noThreshold: "no threshold set",
  asOfLine: (asOf) => `As of ${asOf}.`,
  sourcesUsed: (list) => `Read: client record, ${list}.`,
  sourcesMissing: (list) => `Not available, so not checked: ${list}.`,
  fieldsMissing: (list) => `Missing in the client record: ${list}.`,
  ruleWallet: "The wallet's full size is an estimate: assets ÷ share of wallet.",
  ruleOpportunity: "Opportunities are ranked by expected value: propensity × annual potential.",
  ruleRisk: "A measure off track is a high risk, at risk a medium one, by the health model's thresholds.",
  ruleMomentum: "Momentum compares the average of the last three months with the first three of the period.",
  ruleTargets: "Targets are the model's own thresholds, or a direction from today's value; none is invented.",
  sourceNames: { holdings: "holdings", history: "history", activity: "monthly activity", health: "health measures", deals: "deals", thresholds: "health thresholds" },
};

const FR: Phrases = {
  title: (name) => `Stratégie de compte : ${name}`,
  meta: (asOf, rm) => `Au ${asOf}${rm ? ` · Chargé de clientèle : ${rm}` : ""}`,
  h: { summary: "Synthèse", stands: "Où en est le portefeuille", holdCould: "Ce que nous détenons et ce que nous pourrions", risks: "Risques à traiter en priorité", opportunities: "Opportunités, par ordre de valeur", actions: "Prochaines actions", talking: "Points pour le prochain rendez-vous", watch: "À suivre", data: "Données et hypothèses" },
  summaryWallet: (share, total, elsewhere) => `Nous détenons ${share} d'un portefeuille estimé à ${total} ; ${elsewhere} sont placés chez d'autres établissements.`,
  summaryNoWallet: "La taille du portefeuille ne peut pas être estimée : les avoirs ou la part de portefeuille manquent.",
  summaryRisks: (high, medium) => `${high + medium} risque${high + medium > 1 ? "s" : ""} à traiter : ${high} élevé${high > 1 ? "s" : ""}, ${medium} moyen${medium > 1 ? "s" : ""}.`,
  summaryNoRisks: "Aucun indicateur hors trajectoire ni à surveiller dans les données fournies.",
  summaryOpportunity: (product, potential, propensity) => `Meilleure opportunité : ${product}, ${potential} par an, appétence ${propensity}.`,
  summaryNoOpportunity: "Aucune opportunité ouverte dans les données de détention.",
  profile: ({ segment, region, rm, since, years }) =>
    [segment ? `Client ${segment}` : "Client", region ? `en ${region}` : "", since ? `depuis ${since}${years !== undefined ? ` (${years} ans)` : ""}` : "", rm ? `, suivi par ${rm}` : ""].filter(Boolean).join(" ").replace(" ,", ",") + ".",
  assets: (aum, revenue, fees) => [aum ? `Avoirs ${aum}` : "", revenue ? `revenus ${revenue}` : "", fees ? `commissions ${fees}` : ""].filter(Boolean).join(", ") + ".",
  walletLine: (share, total, elsewhere, point) => `Part de portefeuille ${share}. Portefeuille estimé à ${total}, dont ${elsewhere} placés ailleurs ; chaque point de part représente environ ${point} d'avoirs.`,
  momentumLine: (months, from, to, revenue, change) => `Revenus sur ${months} mois (${from} à ${to}) : ${revenue}${change ? ` ; trois derniers mois contre trois premiers : ${change}` : ""}.`,
  activityLine: (trades, tradesChange, loginsChange) => [trades ? `${trades} opérations` : "", tradesChange ? `opérations ${tradesChange}` : "", loginsChange ? `connexions ${loginsChange}` : ""].filter(Boolean).join(", ") + ", même comparaison.",
  nnmLine: (nnm) => `Collecte nette sur la période : ${nnm}.`,
  aumLine: (start, end) => `Avoirs passés de ${start} à ${end}.`,
  heldLine: (held, eligible, penetration, list) => `Détenus : ${held} produits sur ${eligible} éligibles (${penetration}) : ${list}.`,
  openLine: (list) => `Possibles : ${list}.`,
  notEligibleLine: (list) => `Non éligibles : ${list}.`,
  noHoldings: "Aucune donnée produit.",
  severity: { high: "Élevé", medium: "Moyen" },
  riskThreshold: (label, value, green, amber, goodWhen, perspective) =>
    `${label}${perspective ? ` (${perspective})` : ""} : ${value}. Conforme ${goodWhen === "up" ? "à partir de" : "jusqu'à"} ${green}, à surveiller ${goodWhen === "up" ? "à partir de" : "jusqu'à"} ${amber}.`,
  riskStatus: (label, value) => `${label} : ${value}, signalé par le modèle de santé client.`,
  riskAnomaly: "Activité inhabituelle signalée par le suivi des anomalies.",
  riskContact: (days, amber, red) => `${days} depuis le dernier contact ; à surveiller au-delà de ${amber} jours, hors trajectoire au-delà de ${red}.`,
  riskComplaints: (count, window) => `${count} réclamation${count > 1 ? "s" : ""} sur les ${window} derniers jours.`,
  riskConcentration: (product, share, limit) => `${product} porte ${share} des revenus des produits détenus (concentration au-delà de ${limit}).`,
  noRisks: "Aucun dans les données fournies.",
  opportunity: (rank, product, propensity, potential, expected) => `${rank}. ${product} : appétence ${propensity}, potentiel ${potential} par an, valeur attendue ${expected}.`,
  opportunityDeal: (id, stage, value, close, probability) => `   Affaire ouverte ${id}, ${stage}, ${value}${probability ? `, probabilité ${probability}` : ""}${close ? `, signature prévue le ${close}` : ""}.`,
  noOpportunities: "Aucune dans les données de détention.",
  window: { d30: "Sous 30 jours", d60: "Sous 60 jours", d90: "Sous 90 jours" },
  owner: (rm) => `Responsable : ${rm}`,
  ownerUnknown: "Responsable : non renseigné",
  target: "Objectif",
  fixMeasure: (label, op, green) => ({ act: `${label} : revenir en zone conforme`, target: `${op} ${green}` }),
  actAnomaly: { act: "Examiner l'activité signalée avec le client", target: "signalement levé ou expliqué" },
  actContact: { act: "Organiser un rendez-vous de revue", target: "dernier contact datant de moins de 45 jours" },
  actComplaints: { act: "Clore les réclamations ouvertes et le confirmer au client", target: "aucune réclamation sur 90 jours" },
  actConcentration: (product) => ({ act: `Réduire la dépendance à ${product}`, target: "aucun produit au-delà de 60 % des revenus" }),
  actCallList: (next) => ({ act: next, target: "fait et consigné" }),
  actDeal: (id, product, stage, close) => ({ act: `Faire avancer l'affaire ${id} (${product}) depuis l'étape ${stage}`, target: close ? `signée d'ici le ${close}` : "étape suivante atteinte" }),
  actPropose: (product, potential) => ({ act: `Proposer ${product}`, target: `proposition présentée ; potentiel ${potential} par an` }),
  actWallet: (share, point) => ({ act: "Augmenter la part de portefeuille", target: `au-delà de ${share} (chaque point ≈ ${point} d'avoirs)` }),
  nothing: "Rien d'urgent dans les données.",
  talkTenure: (years, since) => `Remercier le client pour ${years} ans de relation (client depuis ${since}).`,
  talkLastTouch: (date, title, days) => `Faire suite au dernier échange, le ${date} (il y a ${days} jours) : ${title}.`,
  talkMomentum: (change) => `Revenus, trois derniers mois contre trois premiers : ${change}. Demander ce qui l'explique.`,
  talkOpportunity: (product) => `Explorer ses besoins autour de ${product}.`,
  talkRisk: (label) => `Aborder ouvertement ${label} et convenir de la suite.`,
  talkDeal: (product, stage) => `Faire le point sur l'affaire ${product} (${stage}).`,
  watchRow: (kpi, today, threshold) => `| ${kpi} | ${today} | ${threshold} |`,
  watchHead: ["Indicateur", "Aujourd'hui", "Seuil"],
  kpiWallet: "Part de portefeuille",
  kpiRevenue: (months) => `Revenus sur ${months} mois`,
  kpiNnm: (months) => `Collecte nette sur ${months} mois`,
  kpiPipeline: "Affaires ouvertes pondérées",
  thresholdText: (green, amber, goodWhen) => `conforme ${goodWhen === "up" ? "≥" : "≤"} ${green}, à surveiller ${goodWhen === "up" ? "≥" : "≤"} ${amber}`,
  noThreshold: "aucun seuil défini",
  asOfLine: (asOf) => `Données au ${asOf}.`,
  sourcesUsed: (list) => `Lu : fiche client, ${list}.`,
  sourcesMissing: (list) => `Non disponible, donc non vérifié : ${list}.`,
  fieldsMissing: (list) => `Absent de la fiche client : ${list}.`,
  ruleWallet: "La taille totale du portefeuille est une estimation : avoirs ÷ part de portefeuille.",
  ruleOpportunity: "Les opportunités sont classées par valeur attendue : appétence × potentiel annuel.",
  ruleRisk: "Un indicateur hors trajectoire est un risque élevé, à surveiller un risque moyen, selon les seuils du modèle de santé.",
  ruleMomentum: "La dynamique compare la moyenne des trois derniers mois à celle des trois premiers de la période.",
  ruleTargets: "Les objectifs sont les seuils du modèle, ou une direction à partir de la valeur actuelle ; aucun n'est inventé.",
  sourceNames: { holdings: "détention de produits", history: "historique", activity: "activité mensuelle", health: "indicateurs de santé", deals: "affaires", thresholds: "seuils de santé" },
};

const DE: Phrases = {
  title: (name) => `Kundenstrategie: ${name}`,
  meta: (asOf, rm) => `Stand ${asOf}${rm ? ` · Kundenbetreuung: ${rm}` : ""}`,
  h: { summary: "Zusammenfassung", stands: "Wo das Portfolio steht", holdCould: "Was wir halten und was möglich wäre", risks: "Zuerst anzugehende Risiken", opportunities: "Chancen, nach Wert geordnet", actions: "Nächste Schritte", talking: "Gesprächspunkte für den nächsten Termin", watch: "Im Blick behalten", data: "Daten und Annahmen" },
  summaryWallet: (share, total, elsewhere) => `Wir halten ${share} eines auf ${total} geschätzten Gesamtvermögens; ${elsewhere} liegen bei anderen Anbietern.`,
  summaryNoWallet: "Die Größe des Gesamtvermögens lässt sich nicht schätzen: Vermögen oder Anteil fehlen.",
  summaryRisks: (high, medium) => `${high + medium} ${high + medium === 1 ? "Risiko" : "Risiken"} anzugehen: ${high} hoch, ${medium} mittel.`,
  summaryNoRisks: "Keine Kennzahl ist in den Daten „Nicht im Plan“ oder „Gefährdet“.",
  summaryOpportunity: (product, potential, propensity) => `Beste Chance: ${product}, ${potential} pro Jahr bei ${propensity} Affinität.`,
  summaryNoOpportunity: "Keine offene Chance in den Bestandsdaten.",
  profile: ({ segment, region, rm, since, years }) =>
    [segment ? `${segment}-Kunde` : "Kunde", region ? `in ${region}` : "", since ? `seit ${since}${years !== undefined ? ` (${years} Jahre)` : ""}` : "", rm ? `, betreut von ${rm}` : ""].filter(Boolean).join(" ").replace(" ,", ",") + ".",
  assets: (aum, revenue, fees) => [aum ? `Vermögen ${aum}` : "", revenue ? `Ertrag ${revenue}` : "", fees ? `Gebühren ${fees}` : ""].filter(Boolean).join(", ") + ".",
  walletLine: (share, total, elsewhere, point) => `Anteil am Gesamtvermögen ${share}. Geschätztes Gesamtvermögen ${total}, davon ${elsewhere} anderswo; jeder Prozentpunkt entspricht etwa ${point} Vermögen.`,
  momentumLine: (months, from, to, revenue, change) => `Ertrag über ${months} Monate (${from} bis ${to}): ${revenue}${change ? `; letzte drei Monate gegenüber den ersten drei: ${change}` : ""}.`,
  activityLine: (trades, tradesChange, loginsChange) => [trades ? `${trades} Transaktionen` : "", tradesChange ? `Transaktionen ${tradesChange}` : "", loginsChange ? `Anmeldungen ${loginsChange}` : ""].filter(Boolean).join(", ") + ", gleicher Vergleich.",
  nnmLine: (nnm) => `Netto-Neugeld im Zeitraum: ${nnm}.`,
  aumLine: (start, end) => `Vermögen von ${start} auf ${end}.`,
  heldLine: (held, eligible, penetration, list) => `Gehalten: ${held} von ${eligible} möglichen Produkten (${penetration}): ${list}.`,
  openLine: (list) => `Möglich: ${list}.`,
  notEligibleLine: (list) => `Nicht möglich: ${list}.`,
  noHoldings: "Keine Produktdaten.",
  severity: { high: "Hoch", medium: "Mittel" },
  riskThreshold: (label, value, green, amber, goodWhen, perspective) =>
    `${label}${perspective ? ` (${perspective})` : ""}: ${value}. Im Plan ${goodWhen === "up" ? "ab" : "bis"} ${green}, gefährdet ${goodWhen === "up" ? "ab" : "bis"} ${amber}.`,
  riskStatus: (label, value) => `${label}: ${value}, vom Kundengesundheitsmodell markiert.`,
  riskAnomaly: "Ungewöhnliche Aktivität, vom Auffälligkeiten-Monitor markiert.",
  riskContact: (days, amber, red) => `${days} seit dem letzten Kontakt; gefährdet nach ${amber} Tagen, nicht im Plan nach ${red}.`,
  riskComplaints: (count, window) => `${count} ${count === 1 ? "Beschwerde" : "Beschwerden"} in den letzten ${window} Tagen.`,
  riskConcentration: (product, share, limit) => `${product} trägt ${share} des Ertrags der gehaltenen Produkte (konzentriert über ${limit}).`,
  noRisks: "Keine in den vorliegenden Daten.",
  opportunity: (rank, product, propensity, potential, expected) => `${rank}. ${product}: Affinität ${propensity}, Potenzial ${potential} pro Jahr, erwarteter Wert ${expected}.`,
  opportunityDeal: (id, stage, value, close, probability) => `   Offenes Geschäft ${id}, ${stage}, ${value}${probability ? `, Wahrscheinlichkeit ${probability}` : ""}${close ? `, Abschluss erwartet am ${close}` : ""}.`,
  noOpportunities: "Keine in den Bestandsdaten.",
  window: { d30: "Innerhalb von 30 Tagen", d60: "Innerhalb von 60 Tagen", d90: "Innerhalb von 90 Tagen" },
  owner: (rm) => `Verantwortlich: ${rm}`,
  ownerUnknown: "Verantwortlich: nicht hinterlegt",
  target: "Ziel",
  fixMeasure: (label, op, green) => ({ act: `${label}: zurück in den Plan`, target: `${op} ${green}` }),
  actAnomaly: { act: "Die markierte Aktivität mit dem Kunden prüfen", target: "Markierung aufgehoben oder erklärt" },
  actContact: { act: "Einen Überprüfungstermin vereinbaren", target: "letzter Kontakt innerhalb von 45 Tagen" },
  actComplaints: { act: "Offene Beschwerden schließen und dem Kunden bestätigen", target: "keine Beschwerde in 90 Tagen" },
  actConcentration: (product) => ({ act: `Abhängigkeit von ${product} verringern`, target: "kein Produkt über 60 % des Ertrags" }),
  actCallList: (next) => ({ act: next, target: "erledigt und dokumentiert" }),
  actDeal: (id, product, stage, close) => ({ act: `Geschäft ${id} (${product}) über die Phase ${stage} hinaus voranbringen`, target: close ? `unterzeichnet bis ${close}` : "nächste Phase erreicht" }),
  actPropose: (product, potential) => ({ act: `${product} anbieten`, target: `Angebot vorgestellt; Potenzial ${potential} pro Jahr` }),
  actWallet: (share, point) => ({ act: "Anteil am Gesamtvermögen ausbauen", target: `über ${share} (jeder Punkt ≈ ${point} Vermögen)` }),
  nothing: "Nichts Dringendes in den Daten.",
  talkTenure: (years, since) => `Für ${years} Jahre Zusammenarbeit danken (Kunde seit ${since}).`,
  talkLastTouch: (date, title, days) => `An den letzten Kontakt anknüpfen, ${date} (vor ${days} Tagen): ${title}.`,
  talkMomentum: (change) => `Ertrag, letzte drei Monate gegenüber den ersten drei: ${change}. Nach den Gründen fragen.`,
  talkOpportunity: (product) => `Den Bedarf rund um ${product} erkunden.`,
  talkRisk: (label) => `${label} offen ansprechen und den nächsten Schritt vereinbaren.`,
  talkDeal: (product, stage) => `Den Stand des Geschäfts ${product} klären (${stage}).`,
  watchRow: (kpi, today, threshold) => `| ${kpi} | ${today} | ${threshold} |`,
  watchHead: ["Kennzahl", "Heute", "Schwelle"],
  kpiWallet: "Anteil am Gesamtvermögen",
  kpiRevenue: (months) => `Ertrag über ${months} Monate`,
  kpiNnm: (months) => `Netto-Neugeld über ${months} Monate`,
  kpiPipeline: "Gewichtete offene Geschäfte",
  thresholdText: (green, amber, goodWhen) => `im Plan ${goodWhen === "up" ? "≥" : "≤"} ${green}, gefährdet ${goodWhen === "up" ? "≥" : "≤"} ${amber}`,
  noThreshold: "keine Schwelle festgelegt",
  asOfLine: (asOf) => `Datenstand ${asOf}.`,
  sourcesUsed: (list) => `Gelesen: Kundenstammsatz, ${list}.`,
  sourcesMissing: (list) => `Nicht verfügbar, daher nicht geprüft: ${list}.`,
  fieldsMissing: (list) => `Im Kundenstammsatz fehlt: ${list}.`,
  ruleWallet: "Die Größe des Gesamtvermögens ist eine Schätzung: Vermögen ÷ Anteil am Gesamtvermögen.",
  ruleOpportunity: "Chancen sind nach erwartetem Wert geordnet: Affinität × jährliches Potenzial.",
  ruleRisk: "Eine Kennzahl „Nicht im Plan“ ist ein hohes Risiko, „Gefährdet“ ein mittleres, nach den Schwellen des Gesundheitsmodells.",
  ruleMomentum: "Die Dynamik vergleicht den Durchschnitt der letzten drei Monate mit den ersten drei des Zeitraums.",
  ruleTargets: "Ziele sind die Schwellen des Modells oder eine Richtung ab dem heutigen Wert; keines ist erfunden.",
  sourceNames: { holdings: "Produktbestand", history: "Kontakthistorie", activity: "Monatsaktivität", health: "Gesundheitskennzahlen", deals: "Geschäfte", thresholds: "Gesundheitsschwellen" },
};

const PHRASES: Record<Lang, Phrases> = { en: EN, fr: FR, de: DE };

/** The words that write one audit: its phrases and its formats. */
function writer(audit: WalletAudit, locale?: string) {
  const loc = locale ?? "en-US";
  const p = PHRASES[langOf(loc)];
  const f = fmtFor(loc, audit.currency);
  const sinceYear = audit.profile.since?.value;
  const years = sinceYear !== undefined ? Number(audit.asOf.slice(0, 4)) - sinceYear : undefined;
  return { p, f, years };
}

/** One risk, worded. */
function riskWords(risk: WalletRisk, p: Phrases, f: Fmt): string {
  const rule = risk.rule;
  const value = risk.value.value;
  switch (rule.kind) {
    case "threshold":
      return p.riskThreshold(risk.label, f.unit(Number(value), rule.unit), f.unit(rule.green, rule.unit), f.unit(rule.amber, rule.unit), rule.goodWhen, risk.perspective);
    case "status":
      return p.riskStatus(risk.label, f.number(Number(value)));
    case "anomaly":
      return p.riskAnomaly;
    case "contact":
      return p.riskContact(f.unit(Number(value), "days"), rule.amber, rule.red);
    case "complaints":
      return p.riskComplaints(Number(value), rule.window);
    case "concentration":
      return p.riskConcentration(rule.product, f.share(Number(value)), f.share(rule.limit));
  }
}

/** The action a risk calls for, with its measurable target. */
function riskAction(risk: WalletRisk, p: Phrases, f: Fmt): { act: string; target: string } {
  const rule = risk.rule;
  switch (rule.kind) {
    case "threshold":
      return p.fixMeasure(risk.label, rule.goodWhen === "up" ? "≥" : "≤", f.unit(rule.green, rule.unit));
    case "status":
      return p.fixMeasure(risk.label, "→", "G");
    case "anomaly":
      return p.actAnomaly;
    case "contact":
      return p.actContact;
    case "complaints":
      return p.actComplaints;
    case "concentration":
      return p.actConcentration(rule.product);
  }
}

/** Medium risks acted on in the 60-day window; the others are watched. */
const MEDIUM_ACTIONS = 3;

/** How close a risk is to off track: past green, as a share of the way to amber (1 is at the amber line). */
function urgency(risk: WalletRisk): number {
  const rule = risk.rule;
  if (rule.kind !== "threshold") return 0.5;
  const value = Number(risk.value.value);
  const span = rule.amber - rule.green;
  return span === 0 ? 1 : (value - rule.green) / span;
}

/** The 30, 60 and 90-day plan: risks first, then the call list, the live deal and the best opportunities, then the wallet. */
function plan(audit: WalletAudit, p: Phrases, f: Fmt): Record<"d30" | "d60" | "d90", { act: string; target: string }[]> {
  // The call list already says what to do about flagged activity: the anomaly rule then adds nothing.
  const own = audit.risks.filter((r) => !(r.rule.kind === "anomaly" && audit.callList?.nextAction));
  const d30 = own.filter((r) => r.severity === "high").map((r) => riskAction(r, p, f));
  if (audit.callList?.nextAction) d30.push(p.actCallList(audit.callList.nextAction.value));
  // At most three medium risks, the closest to off track first; the rest stay in "what to watch".
  const d60 = own
    .filter((r) => r.severity === "medium")
    .sort((a, b) => urgency(b) - urgency(a))
    .slice(0, MEDIUM_ACTIONS)
    .map((r) => riskAction(r, p, f));
  const dealt = new Set<string>();
  for (const deal of audit.pipeline.open.slice(0, 2)) {
    d60.push(p.actDeal(deal.id, deal.product, deal.stage, deal.close ? f.date(deal.close) : undefined));
    dealt.add(deal.product);
  }
  const d90: { act: string; target: string }[] = [];
  for (const o of audit.opportunities.filter((o) => !dealt.has(o.product)).slice(0, 2)) d90.push(p.actPropose(o.product, f.money(o.potential.value)));
  if (audit.wallet) d90.push(p.actWallet(f.share(audit.wallet.share.value), f.money(audit.wallet.onePoint)));
  return { d30, d60, d90 };
}

/** The account strategy, in Markdown, in the locale's language (English, French or German). */
export function strategyMarkdown(audit: WalletAudit, locale?: string): string {
  const { p, f, years } = writer(audit, locale);
  const out: string[] = [];
  const rm = audit.profile.rm;
  out.push(`# ${p.title(audit.name)}`, "", p.meta(f.date(audit.asOf), rm), "");

  // 1. Summary: three lines.
  const high = audit.risks.filter((r) => r.severity === "high").length;
  const medium = audit.risks.length - high;
  const best = audit.opportunities[0];
  out.push(`## 1. ${p.h.summary}`, "");
  out.push(`- ${audit.wallet ? p.summaryWallet(f.share(audit.wallet.share.value), f.money(audit.wallet.total.value), f.money(audit.wallet.elsewhere.value)) : p.summaryNoWallet}`);
  out.push(`- ${audit.risks.length ? p.summaryRisks(high, medium) : p.summaryNoRisks}`);
  out.push(`- ${best ? p.summaryOpportunity(best.product, f.money(best.potential.value), f.share(best.propensity.value > 1 ? best.propensity.value / 100 : best.propensity.value)) : p.summaryNoOpportunity}`, "");

  // 2. Where the wallet stands.
  out.push(`## 2. ${p.h.stands}`, "");
  out.push(p.profile({ segment: audit.profile.segment, region: audit.profile.region, rm, since: sinceYear(audit), years }));
  const assets = p.assets(audit.profile.aum ? f.money(audit.profile.aum.value) : undefined, audit.profile.revenue ? f.money(audit.profile.revenue.value) : undefined, audit.profile.fees ? f.money(audit.profile.fees.value) : undefined);
  if (assets !== ".") out.push(assets);
  if (audit.wallet) out.push(p.walletLine(f.share(audit.wallet.share.value), f.money(audit.wallet.total.value), f.money(audit.wallet.elsewhere.value), f.money(audit.wallet.onePoint)));
  const m = audit.momentum;
  if (m) {
    out.push(p.momentumLine(m.months, f.month(m.first), f.month(m.last), f.money(m.revenue.value), m.revenueChange === null ? null : f.share(m.revenueChange, true)));
    if (m.trades !== null || m.tradesChange !== null || m.loginsChange !== null) out.push(p.activityLine(m.trades === null ? null : f.number(m.trades), m.tradesChange === null ? null : f.share(m.tradesChange, true), m.loginsChange === null ? null : f.share(m.loginsChange, true)));
    if (m.netNewMoney) out.push(p.nnmLine(f.money(m.netNewMoney.value)));
    if (m.aumStart !== null && m.aumEnd !== null) out.push(p.aumLine(f.money(m.aumStart), f.money(m.aumEnd)));
  }
  out.push("");

  // 3. What we hold and what we could.
  out.push(`## 3. ${p.h.holdCould}`, "");
  const c = audit.coverage;
  if (!c.products.length) out.push(p.noHoldings);
  else {
    const heldList = c.products.filter((x) => x.state === "held").map((x) => (x.revenue ? `${x.product} (${f.money(x.revenue.value)})` : x.product));
    out.push(`- ${p.heldLine(c.held, c.eligible, c.penetration === null ? "–" : f.share(c.penetration), heldList.join(", ") || "–")}`);
    const openList = c.products.filter((x) => x.state === "open").map((x) => x.product);
    if (openList.length) out.push(`- ${p.openLine(openList.join(", "))}`);
    const notList = c.products.filter((x) => x.state === "not eligible").map((x) => x.product);
    if (notList.length) out.push(`- ${p.notEligibleLine(notList.join(", "))}`);
  }
  out.push("");

  // 4. Risks, worst first.
  out.push(`## 4. ${p.h.risks}`, "");
  if (!audit.risks.length) out.push(p.noRisks);
  for (const risk of audit.risks) out.push(`- **${p.severity[risk.severity]}**: ${riskWords(risk, p, f)}`);
  out.push("");

  // 5. Opportunities, ranked.
  out.push(`## 5. ${p.h.opportunities}`, "");
  if (!audit.opportunities.length) out.push(p.noOpportunities);
  audit.opportunities.forEach((o, i) => {
    out.push(p.opportunity(i + 1, o.product, f.share(o.propensity.value > 1 ? o.propensity.value / 100 : o.propensity.value), f.money(o.potential.value), f.money(o.score)));
    if (o.deal) out.push(p.opportunityDeal(o.deal.id, o.deal.stage, f.money(o.deal.value.value), o.deal.close ? f.date(o.deal.close) : undefined, o.deal.probability !== undefined ? f.share(o.deal.probability) : undefined));
  });
  out.push("");

  // 6. Next best actions, 30, 60 and 90 days, each with its owner and target.
  out.push(`## 6. ${p.h.actions}`, "");
  const steps = plan(audit, p, f);
  const owner = rm ? p.owner(rm) : p.ownerUnknown;
  for (const key of ["d30", "d60", "d90"] as const) {
    out.push(`### ${p.window[key]}`, "");
    if (!steps[key].length) out.push(p.nothing);
    for (const step of steps[key]) out.push(`- ${step.act}. ${owner}. ${p.target}: ${step.target}.`);
    out.push("");
  }

  // 7. Talking points.
  out.push(`## 7. ${p.h.talking}`, "");
  const talk: string[] = [];
  if (years !== undefined && years > 0 && audit.profile.since) talk.push(p.talkTenure(years, String(audit.profile.since.value)));
  const last = audit.history.lastTouch;
  if (last && audit.history.daysSinceTouch !== undefined) talk.push(p.talkLastTouch(f.date(last.date), last.title, audit.history.daysSinceTouch));
  if (m && m.revenueChange !== null) talk.push(p.talkMomentum(f.share(m.revenueChange, true)));
  const topRisk = [...audit.risks].filter((r) => r.rule.kind === "threshold" || r.rule.kind === "status").sort((a, b) => (a.severity === b.severity ? urgency(b) - urgency(a) : a.severity === "high" ? -1 : 1))[0];
  if (topRisk) talk.push(p.talkRisk(topRisk.label));
  const deal = audit.pipeline.open[0];
  if (deal) talk.push(p.talkDeal(deal.product, deal.stage));
  if (best && best.product !== deal?.product) talk.push(p.talkOpportunity(best.product));
  for (const line of talk.length ? talk : [p.nothing]) out.push(`- ${line}`);
  out.push("");

  // 8. What to watch: today's values and their thresholds.
  out.push(`## 8. ${p.h.watch}`, "");
  out.push(`| ${p.watchHead.join(" | ")} |`, "| --- | --- | --- |");
  if (audit.wallet) out.push(p.watchRow(p.kpiWallet, f.share(audit.wallet.share.value), p.noThreshold));
  if (m) out.push(p.watchRow(p.kpiRevenue(m.months), f.money(m.revenue.value), p.noThreshold));
  if (m?.netNewMoney) out.push(p.watchRow(p.kpiNnm(m.months), f.money(m.netNewMoney.value), p.noThreshold));
  if (audit.pipeline.open.length) out.push(p.watchRow(p.kpiPipeline, f.money(audit.pipeline.weighted), p.noThreshold));
  const watched = audit.measures.filter((x) => x.status !== "G");
  for (const x of watched) out.push(p.watchRow(x.label, f.unit(x.value, x.unit), p.thresholdText(f.unit(x.green, x.unit), f.unit(x.amber, x.unit), x.goodWhen)));
  out.push("");

  // 9. Data and assumptions.
  out.push(`## 9. ${p.h.data}`, "");
  out.push(`- ${p.asOfLine(f.date(audit.asOf))}`);
  if (audit.sources.length) out.push(`- ${p.sourcesUsed(audit.sources.map((s) => p.sourceNames[s]).join(", "))}`);
  const missingSources = audit.gaps.filter((g): g is WalletSource => (WALLET_SOURCES as readonly string[]).includes(g));
  if (missingSources.length) out.push(`- ${p.sourcesMissing(missingSources.map((s) => p.sourceNames[s]).join(", "))}`);
  const missingFields = audit.gaps.filter((g) => g.startsWith("client."));
  if (missingFields.length) out.push(`- ${p.fieldsMissing(missingFields.map((g) => g.slice(7)).join(", "))}`);
  for (const rule of [audit.wallet ? p.ruleWallet : "", audit.opportunities.length ? p.ruleOpportunity : "", audit.measures.length ? p.ruleRisk : "", m ? p.ruleMomentum : "", p.ruleTargets]) if (rule) out.push(`- ${rule}`);
  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

/** The year a client joined, as text, when known. */
function sinceYear(audit: WalletAudit): string | undefined {
  return audit.profile.since ? String(audit.profile.since.value) : undefined;
}

/** The strategy as plain text, for an email or a CRM note: the Markdown without its marks. */
export function strategyText(audit: WalletAudit, locale?: string): string {
  return strategyMarkdown(audit, locale)
    .split("\n")
    .filter((line) => !/^\|\s*-{3}/.test(line))
    .map((line) =>
      line
        .replace(/^#{1,3}\s+/, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/^\|\s*(.*?)\s*\|$/, (_m, cells: string) => cells.split(/\s*\|\s*/).join(" · ")),
    )
    .join("\n");
}

/** One risk, worded alone: for the audit panel. */
export function walletRiskText(risk: WalletRisk, locale?: string, currency?: string): string {
  const loc = locale ?? "en-US";
  return riskWords(risk, PHRASES[langOf(loc)], fmtFor(loc, currency));
}

/** A severity's word. */
export function walletSeverity(severity: WalletRisk["severity"], locale?: string): string {
  return PHRASES[langOf(locale)].severity[severity];
}

/** One opportunity, worded alone, with its deal when there is one: for the audit panel. */
export function walletOpportunityText(o: WalletOpportunity, rank: number, locale?: string, currency?: string): string {
  const loc = locale ?? "en-US";
  const p = PHRASES[langOf(loc)];
  const f = fmtFor(loc, currency);
  const line = p.opportunity(rank, o.product, f.share(o.propensity.value > 1 ? o.propensity.value / 100 : o.propensity.value), f.money(o.potential.value), f.money(o.score)).replace(/^\d+\.\s*/, "");
  return o.deal ? `${line} ${p.opportunityDeal(o.deal.id, o.deal.stage, f.money(o.deal.value.value), o.deal.close ? f.date(o.deal.close) : undefined, o.deal.probability !== undefined ? f.share(o.deal.probability) : undefined).trim()}` : line;
}

/** The coverage line, worded: for the audit panel. */
export function walletCoverageText(audit: WalletAudit, locale?: string): string {
  const loc = locale ?? "en-US";
  const p = PHRASES[langOf(loc)];
  const f = fmtFor(loc, audit.currency);
  const c = audit.coverage;
  if (!c.products.length) return p.noHoldings;
  const held = c.products.filter((x) => x.state === "held").map((x) => x.product).join(", ") || "–";
  const open = c.products.filter((x) => x.state === "open").map((x) => x.product);
  return [p.heldLine(c.held, c.eligible, c.penetration === null ? "–" : f.share(c.penetration), held), open.length ? p.openLine(open.join(", ")) : ""].filter(Boolean).join(" ");
}

/** The wallet and momentum lines, worded: for the audit panel. */
export function walletStandingText(audit: WalletAudit, locale?: string): string[] {
  const loc = locale ?? "en-US";
  const p = PHRASES[langOf(loc)];
  const f = fmtFor(loc, audit.currency);
  const lines: string[] = [];
  if (audit.wallet) lines.push(p.walletLine(f.share(audit.wallet.share.value), f.money(audit.wallet.total.value), f.money(audit.wallet.elsewhere.value), f.money(audit.wallet.onePoint)));
  const m = audit.momentum;
  if (m) {
    lines.push(p.momentumLine(m.months, f.month(m.first), f.month(m.last), f.money(m.revenue.value), m.revenueChange === null ? null : f.share(m.revenueChange, true)));
    if (m.netNewMoney) lines.push(p.nnmLine(f.money(m.netNewMoney.value)));
  }
  return lines;
}

/** The gaps, worded: for the audit panel. */
export function walletGapsText(audit: WalletAudit, locale?: string): string[] {
  const p = PHRASES[langOf(locale)];
  const missingSources = audit.gaps.filter((g): g is WalletSource => (WALLET_SOURCES as readonly string[]).includes(g));
  const missingFields = audit.gaps.filter((g) => g.startsWith("client."));
  return [missingSources.length ? p.sourcesMissing(missingSources.map((s) => p.sourceNames[s]).join(", ")) : "", missingFields.length ? p.fieldsMissing(missingFields.map((g) => g.slice(7)).join(", ")) : ""].filter(Boolean);
}
