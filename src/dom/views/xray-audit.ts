/**
 * The wallet audit on the x-ray card: "Audit wallet" opens a panel of risks, opportunities, coverage and standing for
 * the client the card shows; "Copy strategy" copies the account strategy as Markdown, and "Download .md" saves it.
 *
 * The related sources (holdings, history, activity, health, deals, thresholds) load on first use, once per address
 * for the page, and are matched to the client by name, so the audit follows whichever client the card follows.
 *
 * @module
 */
import { runPipeline } from "../../core/pipeline.ts";
import type { Row } from "../../core/types.ts";
import type { ViewContext } from "../../core/view-context.ts";
import type { XrayAuditSource, XrayView } from "../../core/views.ts";
import { WALLET_SOURCES, auditWallet, strategyMarkdown, walletCoverageText, walletGapsText, walletOpportunityText, walletRiskText, walletSeverity, walletStandingText } from "../../core/wallet.ts";
import type { WalletAudit, WalletInput, WalletSource } from "../../core/wallet.ts";
import { download, slug } from "../export.ts";
import { html } from "./shared.ts";
import { wordsFor } from "./words.ts";

/** Rows per source address, loaded once for the page: every client the card follows reads the same files. */
const loaded = new Map<string, Promise<Row[]>>();

function load(source: XrayAuditSource, fetcher?: typeof fetch): Promise<Row[]> {
  const { match: _match, ...data } = source;
  const key = JSON.stringify(data);
  let rows = loaded.get(key);
  if (!rows) {
    rows = runPipeline({ data }, fetcher ? { fetch: fetcher } : {});
    loaded.set(key, rows);
    // A failure is not remembered: the next open tries again.
    rows.catch(() => loaded.delete(key));
  }
  return rows;
}

/** The field naming the client in a source's rows: the one given, else "client", else "name". */
function matchField(source: XrayAuditSource, rows: Row[]): string {
  if (typeof source.match === "string" && source.match) return source.match;
  const first = rows[0] ?? {};
  return "client" in first ? "client" : "name";
}

/** The currency of the card's money: the audit's own, else the first field formatted as a currency. */
function currencyOf(ctx: ViewContext<XrayView>): string | undefined {
  if (ctx.view.audit?.currency) return ctx.view.audit.currency;
  for (const field of Object.values(ctx.spec.fields ?? {})) {
    const format = field?.format;
    if (format && typeof format === "object" && typeof format.currency === "string") return format.currency;
  }
  return undefined;
}

/** Reads the sources for the client in `row` and audits its wallet. Sources that fail are left out, and said so. */
export async function auditRow(ctx: ViewContext<XrayView>, row: Row): Promise<{ audit: WalletAudit; failed: boolean }> {
  const config = ctx.view.audit ?? {};
  const key = config.key ?? ctx.view.label;
  const name = String(row[key] ?? "");
  const sources = config.sources ?? {};
  // The host's fetch when given; else the pipeline's own default, already bound. Passing the global fetch unbound and
  // calling it as a method elsewhere throws "Illegal invocation" in browsers (jsdom does not care, so tests would pass).
  const fetcher = ctx.fetch;
  const input: WalletInput = { client: { ...row, name: row.name ?? name }, ...(currencyOf(ctx) ? { currency: currencyOf(ctx) } : {}) };
  let failed = false;
  await Promise.all(
    (WALLET_SOURCES as readonly WalletSource[]).map(async (which) => {
      const source = sources[which];
      if (!source) return;
      let rows: Row[];
      try {
        rows = await load(source, fetcher);
      } catch {
        failed = true;
        return;
      }
      if (which === "thresholds") {
        input.thresholds = rows;
        return;
      }
      const field = matchField(source, rows);
      const mine = rows.filter((r) => String(r[field] ?? "") === name);
      if (which === "health") {
        if (mine[0]) input.health = mine[0];
      } else input[which] = mine;
    }),
  );
  return { audit: auditWallet(input), failed };
}

/** The panel's sections, worst news first. */
function fill(panel: HTMLElement, ctx: ViewContext<XrayView>, audit: WalletAudit, failed: boolean): void {
  const doc = panel.ownerDocument;
  const w = wordsFor(ctx).wallet;
  const locale = ctx.spec.locale;
  const section = (title: string) => {
    const part = html(doc, "section", "fft-xray-audit-part");
    part.append(html(doc, "h5", "fft-xray-audit-head", title));
    panel.append(part);
    return part;
  };
  panel.replaceChildren();
  if (failed) panel.append(html(doc, "p", "fft-xray-audit-note", w.failed));

  const risks = section(w.risks);
  if (!audit.risks.length) risks.append(html(doc, "p", "fft-xray-audit-empty", w.none));
  else {
    const list = html(doc, "ul", "fft-xray-audit-list");
    for (const risk of audit.risks) {
      const item = html(doc, "li", "fft-xray-audit-risk");
      item.dataset.severity = risk.severity;
      item.append(html(doc, "span", "fft-xray-audit-severity", walletSeverity(risk.severity, locale)), html(doc, "span", undefined, walletRiskText(risk, locale, audit.currency)));
      list.append(item);
    }
    risks.append(list);
  }

  const opportunities = section(w.opportunities);
  if (!audit.opportunities.length) opportunities.append(html(doc, "p", "fft-xray-audit-empty", w.none));
  else {
    const list = html(doc, "ol", "fft-xray-audit-list");
    audit.opportunities.forEach((o, i) => list.append(html(doc, "li", undefined, walletOpportunityText(o, i + 1, locale, audit.currency))));
    opportunities.append(list);
  }

  section(w.coverage).append(html(doc, "p", undefined, walletCoverageText(audit, locale)));
  const standing = walletStandingText(audit, locale);
  if (standing.length) {
    const part = section(w.standing);
    for (const line of standing) part.append(html(doc, "p", undefined, line));
  }
  const gaps = walletGapsText(audit, locale);
  if (gaps.length) {
    const part = section(w.gaps);
    for (const line of gaps) part.append(html(doc, "p", "fft-xray-audit-note", line));
  }
}

let panels = 0;

/** The audit's actions and panel, for the client in `row`. */
export function auditTools(ctx: ViewContext<XrayView>, row: Row): HTMLElement {
  const doc = ctx.el.ownerDocument;
  const w = wordsFor(ctx).wallet;
  const wrap = html(doc, "div", "fft-xray-audit");
  const tools = html(doc, "div", "fft-xray-audit-tools");
  const button = (text: string, className: string) => {
    const b = html(doc, "button", `fft-xray-audit-button ${className}`, text);
    b.type = "button";
    return b;
  };
  const open = button(w.audit, "fft-xray-audit-open");
  const copy = button(w.copy, "fft-xray-audit-copy");
  const save = button(w.download, "fft-xray-audit-download");
  const status = html(doc, "span", "fft-xray-audit-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const panel = html(doc, "section", "fft-xray-audit-panel");
  panel.id = `fft-xray-audit-${++panels}`;
  panel.hidden = true;
  panel.tabIndex = -1;
  // A capped height that scrolls inside, so an open audit never stretches the card and its row: the tools above stay
  // in view, and the panel (a labelled, focusable region) takes the keyboard's scroll.
  panel.style.maxHeight = "min(55vh, 520px)";
  panel.style.overflowY = "auto";
  panel.style.overscrollBehavior = "contain";
  const key = ctx.view.audit?.key ?? ctx.view.label;
  const name = String(row[key] ?? "");
  panel.setAttribute("aria-label", w.panel(name));
  open.setAttribute("aria-expanded", "false");
  open.setAttribute("aria-controls", panel.id);
  tools.append(open, copy, save, status);
  wrap.append(tools, panel);

  // One audit per drawing: the sources load on first use, and a new client draws a new card.
  let pending: Promise<{ audit: WalletAudit; failed: boolean }> | undefined;
  const audited = () => (pending ??= auditRow(ctx, row));
  const say = (text: string) => {
    status.textContent = text;
  };

  open.addEventListener("click", async () => {
    const show = panel.hidden;
    open.setAttribute("aria-expanded", String(show));
    open.textContent = show ? w.hide : w.audit;
    if (!show) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    if (!panel.childElementCount) {
      panel.append(html(doc, "p", "fft-xray-audit-note", w.loading));
      const { audit, failed } = await audited();
      fill(panel, ctx, audit, failed);
    }
    panel.focus();
  });
  // Escape in the panel closes it and hands focus back to its button.
  panel.addEventListener("keydown", (event) => {
    if ((event as KeyboardEvent).key !== "Escape") return;
    event.stopPropagation();
    panel.hidden = true;
    open.setAttribute("aria-expanded", "false");
    open.textContent = w.audit;
    open.focus();
  });

  copy.addEventListener("click", async () => {
    const { audit } = await audited();
    const markdown = strategyMarkdown(audit, ctx.spec.locale);
    try {
      await doc.defaultView?.navigator.clipboard.writeText(markdown);
      say(w.copied);
    } catch {
      say(w.copyFailed);
    }
  });
  save.addEventListener("click", async () => {
    const { audit } = await audited();
    const markdown = strategyMarkdown(audit, ctx.spec.locale);
    if (typeof URL.createObjectURL === "function") download(doc, `${slug(audit.name)}-strategy.md`, new Blob([markdown], { type: "text/markdown" }));
  });
  return wrap;
}

/** Forgets the loaded sources (for tests, or after the data changed). */
export function forgetAuditSources(): void {
  loaded.clear();
}
