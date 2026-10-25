import { describe, expect, test } from "vitest";
import { auditWallet, strategyMarkdown, strategyText } from "./wallet.ts";
import type { WalletAudit, WalletInput } from "./wallet.ts";
import type { Row } from "./types.ts";

/** A small, fictional wallet: four products held, three open, one with a live deal. */
const client: Row = {
  name: "Brivio & Figli",
  segment: "Corporate",
  rm: "Lena Moreau",
  region: "Italy",
  aum: 20_000_000,
  revenue: 150_000,
  fees: 90_000,
  sinceYear: 2016,
  shareOfWallet: 0.4,
  anomaly: false,
  daysSinceContact: 12,
  callReason: "Pipeline review",
  nextAction: "Confirm the lending terms",
};
const holdings: Row[] = [
  { client: "Brivio & Figli", product: "Custody", state: "Holds", propensity: 95, revenue: 100_000, potential: 0 },
  { client: "Brivio & Figli", product: "Lending", state: "Holds", propensity: 60, revenue: 20_000, potential: 0 },
  { client: "Brivio & Figli", product: "FX", state: "Opportunity", propensity: 70, revenue: 0, potential: 40_000 },
  { client: "Brivio & Figli", product: "Pension", state: "Opportunity", propensity: 30, revenue: 0, potential: 80_000 },
  { client: "Brivio & Figli", product: "Structured", state: "Opportunity", propensity: 50, revenue: 0, potential: 10_000 },
  { client: "Brivio & Figli", product: "Insurance", state: "Not eligible", propensity: 0, revenue: 0, potential: 0 },
];
const history: Row[] = [
  { client: "Brivio & Figli", date: "2026-10-02", kind: "Meeting", title: "Quarterly review" },
  { client: "Brivio & Figli", date: "2026-09-10", kind: "Complaint", title: "Late statement" },
  { client: "Brivio & Figli", date: "2026-04-01", kind: "Call", title: "Rates check" },
];
const activity: Row[] = Array.from({ length: 12 }, (_, i) => ({ client: "Brivio & Figli", month: `2025-${String(11 + i).padStart(2, "0")}`.replace(/2025-1([3-9])|2025-2(\d)/, (m) => m), revenue: 10_000 + i * 500, trades: 5, logins: 4 + i, netNewMoney: 100_000, aum: 18_000_000 + i * 200_000 })).map((row, i) => ({ ...row, month: i < 2 ? `2025-${11 + i}` : `2026-${String(i - 1).padStart(2, "0")}` }));
const health: Row = { name: "Brivio & Figli", asOf: "2026-10-25", kycDays: 20, kycDaysRag: "R", feeLeakage: 0.05, feeLeakageRag: "A", nps: 40, npsRag: "G" };
const thresholds: Row[] = [
  { metric: "kycDays", status: "kycDaysRag", label: "KYC refresh due", perspectiveLabel: "Relationship", green: 60, amber: 0, goodWhen: "up", unit: "days" },
  { metric: "feeLeakage", status: "feeLeakageRag", label: "Fee leakage", perspectiveLabel: "Relationship", green: 0.03, amber: 0.08, goodWhen: "down", unit: "share of fees" },
  { metric: "nps", status: "npsRag", label: "Net promoter score", perspectiveLabel: "Client success", green: 30, amber: 0, goodWhen: "up", unit: "score" },
];
const deals: Row[] = [
  { client: "Brivio & Figli", deal: "d9", product: "FX", stage: "Proposal", value: 2_000_000, probability: 0.4, closeDate: "2026-12-15", open: 1 },
  { client: "Brivio & Figli", deal: "d8", product: "Lending", stage: "Won", value: 1_000_000, probability: 1, closeDate: "2026-03-01", open: 0 },
];
const full: WalletInput = { client, holdings, history, activity, health, deals, thresholds, currency: "EUR" };

/** Every `from` in the audit, to check each figure names a real field. */
function sources(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) for (const v of value) sources(v, out);
  else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) if (key === "from" && typeof v === "string") out.push(v);
    else sources(v, out);
  }
  return out;
}

describe("auditWallet", () => {
  test("estimates the wallet from AuM and share of wallet, and says how", () => {
    const audit = auditWallet(full);
    expect(audit.wallet?.total).toEqual({ value: 50_000_000, from: "client.aum ÷ client.shareOfWallet" });
    expect(audit.wallet?.elsewhere.value).toBe(30_000_000);
    expect(audit.wallet?.onePoint).toBe(500_000);
  });

  test("coverage counts held against eligible, leaving the not eligible out", () => {
    const { coverage } = auditWallet(full);
    expect([coverage.held, coverage.eligible, coverage.penetration]).toEqual([2, 5, 0.4]);
  });

  test("ranks opportunities by propensity × potential, and joins the open deal on the same product", () => {
    const { opportunities } = auditWallet(full);
    expect(opportunities.map((o) => [o.product, o.score])).toEqual([
      ["FX", 28_000],
      ["Pension", 24_000],
      ["Structured", 5_000],
    ]);
    expect(opportunities[0]?.deal?.id).toBe("d9");
  });

  test("raises each risk by its rule: health statuses by threshold, complaints from the history, worst first", () => {
    const { risks } = auditWallet(full);
    // The health row has no complaint measure here, so the history's complaint counts; Custody carries 83% of the
    // holdings' revenue, past the 60% concentration line.
    expect(risks.map((r) => [r.metric, r.severity, r.rule.kind])).toEqual([
      ["kycDays", "high", "threshold"],
      ["feeLeakage", "medium", "threshold"],
      ["complaints", "medium", "complaints"],
      ["concentration", "medium", "concentration"],
    ]);
    // The health row has no complaint measure, so the history's complaint within 90 days is a risk of its own.
    const noComplaintMeasure = auditWallet({ ...full, thresholds: thresholds.filter((t) => t.metric !== "nps") });
    expect(noComplaintMeasure.risks.map((r) => r.metric)).not.toContain("nps");
    const withoutHealth = auditWallet({ client, history, holdings });
    expect(withoutHealth.risks.map((r) => r.metric)).toEqual(["complaints", "concentration"]);
  });

  test("an anomaly flag, a long silence and one product carrying the revenue are risks too", () => {
    const quiet = auditWallet({ client: { ...client, anomaly: true, daysSinceContact: 120 }, holdings });
    expect(quiet.risks.map((r) => [r.metric, r.severity])).toEqual([
      ["contact", "high"],
      ["anomaly", "medium"],
      ["concentration", "medium"],
    ]);
    const concentration = quiet.risks.find((r) => r.metric === "concentration");
    expect(concentration?.value.value).toBeCloseTo(100_000 / 120_000);
  });

  test("every figure names the field it came from, and that field exists", () => {
    const audit = auditWallet(full);
    const from = sources(audit);
    expect(from.length).toBeGreaterThan(20);
    for (const ref of from) {
      const [source, rest = ""] = ref.split(/[.[ ]/, 2);
      expect(["client", "holdings", "history", "activity", "health", "deals"]).toContain(source);
      const field = /^client\.([a-zA-Z]+)/.exec(ref)?.[1] ?? /^health\.([a-zA-Z]+)/.exec(ref)?.[1];
      if (field && source === "client") expect([ref, field in client]).toEqual([ref, true]);
      if (field && source === "health") expect([ref, field in health]).toEqual([ref, true]);
      expect(rest).toBeDefined();
    }
  });

  test("with only the client row, it audits what it can and lists the rest as gaps", () => {
    const audit = auditWallet({ client: { name: "Solo", custody: true, fx: false } });
    expect(audit.gaps).toEqual(expect.arrayContaining(["holdings", "history", "activity", "health", "deals", "thresholds", "client.aum", "client.shareOfWallet"]));
    expect(audit.wallet).toBeUndefined();
    expect(audit.coverage.products.map((p) => [p.product, p.state])).toEqual([
      ["custody", "held"],
      ["fx", "open"],
    ]);
    expect(audit.momentum).toBeUndefined();
  });

  test("momentum compares the last three months with the first three of the latest twelve", () => {
    const { momentum } = auditWallet(full);
    expect(momentum?.months).toBe(12);
    // Revenue 10,000 to 15,500 in steps of 500: first three average 10,500, last three 15,000.
    expect(momentum?.revenueChange).toBeCloseTo(15_000 / 10_500 - 1);
    expect(momentum?.netNewMoney?.value).toBe(1_200_000);
  });
});

const SECTIONS = {
  "en-US": ["Summary", "Where the wallet stands", "What we hold and what we could", "Risks to address first", "Opportunities, ranked", "Next best actions", "Talking points for the next meeting", "What to watch", "Data and assumptions"],
  "fr-FR": ["Synthèse", "Où en est le portefeuille", "Ce que nous détenons et ce que nous pourrions", "Risques à traiter en priorité", "Opportunités, par ordre de valeur", "Prochaines actions", "Points pour le prochain rendez-vous", "À suivre", "Données et hypothèses"],
  "de-DE": ["Zusammenfassung", "Wo das Portfolio steht", "Was wir halten und was möglich wäre", "Zuerst anzugehende Risiken", "Chancen, nach Wert geordnet", "Nächste Schritte", "Gesprächspunkte für den nächsten Termin", "Im Blick behalten", "Daten und Annahmen"],
} as const;

/** English words of the template that must not reach a French or German strategy. Data (names, labels) is the author's. */
const ENGLISH = /\b(the|and|with|from|risk|risks|summary|owner|target|wallet|propose|meeting|months|revenue|share of|on track|at risk|within|days ago)\b/i;
/** The author's words in the fixtures, which may appear in any language. */
const DATA = /Brivio & Figli|Lena Moreau|Italy|Corporate|Custody|Lending|FX|Pension|Structured|Insurance|Quarterly review|Late statement|Rates check|KYC refresh due|Fee leakage|Net promoter score|Relationship|Client success|Confirm the lending terms|Proposal|d9|Solo|custody|fx/g;

describe("strategyMarkdown", () => {
  test.each(Object.keys(SECTIONS) as (keyof typeof SECTIONS)[])("%s: every section, numbered, with its figures and no empty values", (locale) => {
    for (const audit of [auditWallet(full), auditWallet({ client: { name: "Solo", custody: true, fx: false } })]) {
      const md = strategyMarkdown(audit, locale);
      SECTIONS[locale].forEach((title, i) => expect(md).toContain(`## ${i + 1}. ${title}`));
      expect(md).not.toMatch(/undefined|NaN|Infinity|\[object|null/);
    }
  });

  test("the summary is three lines; the plan has a 30, 60 and 90-day window, each action with its owner and target", () => {
    const md = strategyMarkdown(auditWallet(full), "en-US");
    const summary = md.split("## 1. Summary")[1]?.split("## 2.")[0] ?? "";
    expect(summary.trim().split("\n").filter((l) => l.startsWith("- "))).toHaveLength(3);
    for (const window of ["Within 30 days", "Within 60 days", "Within 90 days"]) expect(md).toContain(`### ${window}`);
    const actions = (md.split("## 6.")[1]?.split("## 7.")[0] ?? "").split("\n").filter((l) => l.startsWith("- "));
    expect(actions.length).toBeGreaterThan(3);
    for (const line of actions) expect(line).toMatch(/Owner: Lena Moreau\. Target: .+\.$/);
    expect(md).toContain("KYC refresh due: back on track. Owner: Lena Moreau. Target: ≥ 60 days.");
    expect(md).toContain("Advance deal d9 (FX) from Proposal");
  });

  test("states its basis: the wallet formula, the ranking, and the sources it read or could not", () => {
    const md = strategyMarkdown(auditWallet({ client, holdings, currency: "EUR" }), "en-US");
    expect(md).toContain("The wallet's full size is an estimate: assets ÷ share of wallet.");
    expect(md).toContain("Opportunities are ranked by expected value: propensity × annual potential.");
    expect(md).toContain("Not available, so not checked: history, monthly activity, health measures, deals, health thresholds.");
    expect(md).toContain("€50M");
  });

  test.each(["fr-FR", "de-DE"])("%s: no English from the template leaks in, and money and dates read in the locale", (locale) => {
    const md = strategyMarkdown(auditWallet(full), locale);
    const words = md.replace(DATA, "");
    expect(words.match(ENGLISH)).toBeNull();
    // Intl writes narrow and plain no-break spaces: any space will do.
    expect(md).toMatch(locale === "fr-FR" ? /50\sM\s€/u : /50\sMio\.\s€/u);
    expect(md).toMatch(locale === "fr-FR" ? /15\sdéc\.\s2026/u : /15\.\sDez\.\s2026/u);
  });

  test("the plain-text version keeps every line but none of the marks", () => {
    const audit: WalletAudit = auditWallet(full);
    const text = strategyText(audit, "en-US");
    expect(text).not.toMatch(/^#|\*\*|^\| ?-{3}/m);
    expect(text).toContain("1. Summary");
    expect(text).toContain("Fee leakage · 5% · on track ≤ 3%, at risk ≤ 8%");
  });
});
