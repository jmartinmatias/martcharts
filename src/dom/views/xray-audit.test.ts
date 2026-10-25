// @vitest-environment jsdom
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { hasErrors, validateSpec } from "../../core/validate.ts";
import { createWidget } from "../widget.ts";
import { forgetAuditSources } from "./xray-audit.ts";
import "./index.ts";

const clients: Row[] = [
  { name: "Aster Trust", segment: "Private", rm: "Ana Ruiz", aum: 10_000_000, revenue: 80_000, shareOfWallet: 0.5, sinceYear: 2019, custody: true, fx: false },
  { name: "Birch Capital", segment: "Corporate", rm: "Ben Ito", aum: 40_000_000, revenue: 300_000, shareOfWallet: 0.25, sinceYear: 2010, custody: true, fx: true },
];
const holdings: Row[] = [
  { client: "Aster Trust", product: "Custody", state: "Holds", propensity: 90, revenue: 50_000, potential: 0 },
  { client: "Aster Trust", product: "FX", state: "Opportunity", propensity: 60, revenue: 0, potential: 20_000 },
  { client: "Birch Capital", product: "Custody", state: "Holds", propensity: 90, revenue: 200_000, potential: 0 },
  { client: "Birch Capital", product: "Pension", state: "Opportunity", propensity: 40, revenue: 0, potential: 90_000 },
];
const health: Row[] = [
  { name: "Aster Trust", asOf: "2026-10-25", kycDays: 10, kycDaysRag: "R" },
  { name: "Birch Capital", asOf: "2026-10-25", kycDays: 200, kycDaysRag: "G" },
];
const thresholds: Row[] = [{ metric: "kycDays", status: "kycDaysRag", label: "KYC refresh due", green: 60, amber: 0, goodWhen: "up", unit: "days" }];

/** A fetch that serves the sources by address and counts each request. */
const served: Record<string, Row[]> = { "/data/holdings.json": holdings, "/data/health.json": health, "/data/thresholds.json": thresholds };
let requests: string[] = [];
const fetcher = (async (input: RequestInfo | URL) => {
  const url = String(input);
  requests.push(url);
  return new Response(JSON.stringify(served[url] ?? []), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

const spec = (name: string, audit = true, locale = "en-US"): WidgetSpec => ({
  locale,
  title: `Client x-ray: ${name}`,
  data: { type: "inline", rows: clients.filter((c) => c.name === name) },
  fields: { aum: { label: "AuM", format: { type: "currency", currency: "EUR", compact: true } } },
  view: {
    type: "xray",
    label: "name",
    facts: ["aum", "revenue"],
    wallet: "shareOfWallet",
    ...(audit
      ? {
          audit: {
            sources: {
              holdings: { type: "url", url: "/data/holdings.json" },
              health: { type: "url", url: "/data/health.json", match: "name" },
              thresholds: { type: "url", url: "/data/thresholds.json" },
            },
          },
        }
      : {}),
  },
});

let target: HTMLElement;
let copied: string[] = [];
beforeEach(() => {
  forgetAuditSources();
  requests = [];
  copied = [];
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
  Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text: string) => void copied.push(text) }, configurable: true });
});
afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
});

const draw = async (s: WidgetSpec) => {
  const widget = createWidget(target, s, { fetch: fetcher });
  await widget.ready;
  return widget;
};
const button = (cls: string) => target.querySelector(`.${cls}`) as HTMLButtonElement;
const settle = () => vi.waitFor(() => expect(target.querySelector(".fft-xray-audit-panel")?.textContent).not.toMatch(/Reading the wallet/));

describe("the wallet audit on the x-ray card", () => {
  test("the spec validates, and a bad source says so", () => {
    expect(hasErrors(validateSpec(spec("Aster Trust")))).toBe(false);
    const bad = { ...spec("Aster Trust"), view: { ...spec("Aster Trust").view, audit: { sources: { ledger: { type: "url", url: "/x" }, health: "nope" } } } } as WidgetSpec;
    const messages = validateSpec(bad).map((i) => i.message).join(" ");
    expect(messages).toMatch(/ledger is not a source the audit reads/);
    expect(messages).toMatch(/health must be a data spec/);
  });

  test("the actions appear only when the spec asks for the audit", async () => {
    await draw(spec("Aster Trust", false));
    expect(target.querySelector(".fft-xray-audit")).toBeNull();
    target.innerHTML = "";
    await draw(spec("Aster Trust"));
    expect([...target.querySelectorAll(".fft-xray-audit-button")].map((b) => b.textContent)).toEqual(["Audit wallet", "Copy strategy", "Download .md"]);
    // Nothing is read until the audit is used.
    expect(requests).toEqual([]);
  });

  test("Audit wallet opens a panel, risks first, after reading the sources once", async () => {
    await draw(spec("Aster Trust"));
    const open = button("fft-xray-audit-open");
    expect(open.getAttribute("aria-expanded")).toBe("false");
    open.click();
    await settle();
    const panel = target.querySelector(".fft-xray-audit-panel") as HTMLElement;
    expect([panel.hidden, open.getAttribute("aria-expanded"), open.getAttribute("aria-controls")]).toEqual([false, "true", panel.id]);
    expect([...panel.querySelectorAll(".fft-xray-audit-head")].map((h) => h.textContent)).toEqual(["Risks", "Opportunities", "Coverage", "Where it stands", "Not checked"]);
    expect(panel.querySelector(".fft-xray-audit-risk")?.textContent).toBe("HighKYC refresh due: 10 days. On track from 60 days, at risk from 0 days.");
    expect(panel.textContent).toContain("FX: propensity 60%, potential €20K a year, expected value €12K.");
    expect(panel.textContent).toContain("Share of wallet 50%. Estimated wallet €20M, so €10M is held elsewhere");
    expect(requests.sort()).toEqual(["/data/health.json", "/data/holdings.json", "/data/thresholds.json"]);
    // Closing and opening again reads nothing new.
    open.click();
    open.click();
    expect(requests).toHaveLength(3);
  });

  test("Escape closes the panel and gives focus back to its button", async () => {
    await draw(spec("Aster Trust"));
    const open = button("fft-xray-audit-open");
    open.click();
    await settle();
    const panel = target.querySelector(".fft-xray-audit-panel") as HTMLElement;
    expect(document.activeElement).toBe(panel);
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect([panel.hidden, open.getAttribute("aria-expanded"), document.activeElement === open]).toEqual([true, "false", true]);
  });

  test("Copy strategy writes the account strategy to the clipboard and says so", async () => {
    await draw(spec("Aster Trust"));
    button("fft-xray-audit-copy").click();
    await vi.waitFor(() => expect(copied).toHaveLength(1));
    const md = copied[0] as string;
    expect(md.startsWith("# Account strategy: Aster Trust")).toBe(true);
    expect(md).toContain("## 6. Next best actions");
    expect(md).toContain("KYC refresh due: back on track. Owner: Ana Ruiz. Target: ≥ 60 days.");
    expect(target.querySelector(".fft-xray-audit-status")?.textContent).toBe("Strategy copied");
  });

  test("a card that follows another client audits that client", async () => {
    const widget = await draw(spec("Aster Trust"));
    // As a dashboard does when the card follows a click: the whole spec, now for another client.
    await widget.setSpec(spec("Birch Capital"));
    await vi.waitFor(() => expect(target.querySelector(".fft-xray-name")?.textContent).toBe("Birch Capital"));
    button("fft-xray-audit-copy").click();
    await vi.waitFor(() => expect(copied).toHaveLength(1));
    expect(copied[0]).toContain("# Account strategy: Birch Capital");
    expect(copied[0]).toContain("Owner: Ben Ito");
    expect(copied[0]).not.toContain("KYC refresh due: back on track");
    expect(copied[0]).toContain("1. Pension");
  });

  test("in French, the actions and the panel speak French", async () => {
    await draw(spec("Aster Trust", true, "fr-FR"));
    expect(button("fft-xray-audit-open").textContent).toBe("Auditer le portefeuille");
    button("fft-xray-audit-open").click();
    await vi.waitFor(() => expect(target.querySelector(".fft-xray-audit-panel")?.textContent).toContain("Risques"));
    expect(target.querySelector(".fft-xray-audit-severity")?.textContent).toBe("Élevé");
  });

  test("the open panel passes axe", async () => {
    await draw(spec("Aster Trust"));
    button("fft-xray-audit-open").click();
    await settle();
    const result = await axe.run(target, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
