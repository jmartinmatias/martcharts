/**
 * Prints the account strategy for one client of the commercial cockpit's data, from its x-ray audit:
 *
 *   node scripts/wallet-strategy.ts ["Client name"] [locale]     defaults: "Aldana Holdings" en-US
 *
 * The same audit the x-ray card's "Audit wallet" and "Copy strategy" actions build in the browser.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { auditWallet, strategyMarkdown } from "../src/core/wallet.ts";
import type { Row } from "../src/core/types.ts";

const read = (file: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../public/data/${file}`, import.meta.url)), "utf8")) as Row[];
const name = process.argv[2] ?? "Aldana Holdings";
const locale = process.argv[3] ?? "en-US";
const client = read("clients.json").find((row) => row.name === name);
if (!client) {
  console.error(`No client named ${name}.`);
  process.exit(1);
}
const of = (rows: Row[], key = "client") => rows.filter((row) => row[key] === name);
const audit = auditWallet({
  client,
  holdings: of(read("holdings.json")),
  history: of(read("client-history.json")),
  activity: of(read("client-activity.json")),
  health: of(read("client-health.json"), "name")[0],
  deals: of(read("deals.json")),
  thresholds: read("rag-thresholds.json"),
  currency: "EUR",
});
console.log(strategyMarkdown(audit, locale));
