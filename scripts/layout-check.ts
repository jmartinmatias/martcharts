/**
 * Layout check: opens every dashboard in headless Chrome at a desk width and a phone width and measures each card for
 * the faults a unit test cannot see, because jsdom has no layout:
 *
 * - `error`     the card drew its error state
 * - `spill`     text or a mark reaches past the card's edge (more than 2px)
 * - `scroll`    the page scrolls sideways
 * - `empty`     a card leaves more than 89px of empty floor around its view, and more than the baseline accepted
 * - `grew`      the card is more than 15% taller than in the baseline (a fold or a cap stopped working)
 *
 * It serves dist-demo itself, so run `npm run build:site` first. Usage:
 *
 *   npm run check:layout              compare with scripts/layout-baseline.json, exit 1 on a new fault
 *   npm run check:layout -- --update  write the current heights as the new baseline
 *   npm run check:layout -- --shots   also save a screenshot of each board and width under .layout-shots/
 *
 * Uses the installed Google Chrome (playwright-core, channel "chrome"); no browser download.
 *
 * @module
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright-core";
import { BOARD_TABS } from "../demo/routes.ts";

const ROOT = new URL("../dist-demo/", import.meta.url).pathname;
const BASELINE = new URL("./layout-baseline.json", import.meta.url).pathname;
const WIDTHS = [1400, 390] as const;
const EMPTY_LIMIT = 89;
const GROWTH_LIMIT = 1.15;
const update = process.argv.includes("--update");
const shots = process.argv.includes("--shots");

const TYPES: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };

/** A card's measurements and faults. */
interface Card {
  key: string;
  height: number;
  /** Empty floor under the view, in px. */
  empty: number;
  faults: string[];
}

/** What the baseline keeps per card: its height and the empty floor accepted there (a centred view in a tall row). */
interface Kept {
  h: number;
  empty: number;
}

if (!existsSync(join(ROOT, "dashboards.html"))) {
  console.error("dist-demo/dashboards.html is missing: run `npm run build:site` first.");
  process.exit(2);
}

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/")).replace(/^(\.\.[/\\])+/, "");
  const file = join(ROOT, path.endsWith("/") ? `${path}index.html` : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
});
await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
const address = server.address();
const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const results: Card[] = [];
const pageFaults: string[] = [];

/** Measures every visible card on the page, in the browser. */
function measure(): { cards: Card[]; scroll: boolean } {
  const cards: Card[] = [];
  for (const card of document.querySelectorAll<HTMLElement>(".fft-dashboard .fft-widget")) {
    const box = card.getBoundingClientRect();
    if (!box.width || !box.height || card.closest("[hidden]")) continue;
    const ref = card.querySelector(".fft-widget-ref")?.textContent?.trim() || card.querySelector(".fft-title")?.textContent?.trim() || "?";
    const faults: string[] = [];
    if (card.dataset.state === "error") faults.push("error");
    // Anything drawn past the card's edge that no scroller clips.
    let spill = 0;
    for (const node of card.querySelectorAll<Element>("text, span, p, td, th, button, circle, rect, path")) {
      if (node.closest(".fft-sr-only, [hidden], .fft-menu, .fft-tooltip")) continue;
      let clipped = false;
      for (let up = node.parentElement; up && up !== card; up = up.parentElement) {
        const o = getComputedStyle(up);
        if (/(auto|scroll|hidden|clip)/.test(o.overflowX + o.overflow)) { clipped = true; break; }
      }
      if (clipped) continue;
      const r = node.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      spill = Math.max(spill, box.left - r.left, r.right - box.right);
    }
    if (spill > 2) faults.push(`spill ${Math.round(spill)}px`);
    // Empty floor: the body's room under its last visible child.
    let empty = 0;
    const body = card.querySelector<HTMLElement>(":scope > .fft-body");
    if (body && body.children.length) {
      const b = body.getBoundingClientRect();
      let top = Infinity, bottom = -Infinity;
      for (const child of body.querySelectorAll<HTMLElement>(":scope > *, :scope > [data-fill] svg")) {
        const r = child.getBoundingClientRect();
        if (!r.height || child.classList.contains("fft-sr-only")) continue;
        top = Math.min(top, r.top);
        bottom = Math.max(bottom, r.bottom);
      }
      empty = isFinite(bottom) ? Math.max(0, Math.round(b.height - (bottom - top))) : 0;
    }
    cards.push({ key: ref, height: Math.round(box.height), empty, faults });
  }
  return { cards, scroll: document.documentElement.scrollWidth > innerWidth + 1 };
}

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    try {
      localStorage.setItem("martcharts:lang", "en");
      localStorage.setItem("martcharts:look", JSON.stringify({ theme: "light", preset: "glass" }));
    } catch {}
  });
  page.on("pageerror", (error) => pageFaults.push(`${width}px: ${error.message}`));
  for (const tab of BOARD_TABS) {
    await page.goto(`${base}/dashboards.html?board=${tab.key}`, { waitUntil: "load" });
    await page.waitForSelector(".fft-dashboard .fft-widget");
    // Every tab of a tabbed board, or the one page of a board with chips; folded sections opened.
    const tabCount = await page.locator('.fft-board-nav [role="tab"]').count();
    for (let t = 0; t < Math.max(1, tabCount); t++) {
      if (tabCount) await page.locator('.fft-board-nav [role="tab"]').nth(t).click();
      for (const toggle of await page.locator('.fft-dashboard .fft-section-toggle[aria-expanded="false"]').all()) if (await toggle.isVisible()) await toggle.click();
      await page.waitForFunction(() => !document.querySelector('.fft-dashboard .fft-widget[data-state="loading"]'), undefined, { timeout: 15000 });
      await page.waitForTimeout(400);
      const { cards, scroll } = await page.evaluate(measure);
      const where = `${tab.key}${tabCount ? `#${t + 1}` : ""} @${width}`;
      if (scroll) pageFaults.push(`${where}: page scrolls sideways`);
      for (const card of cards) if (!results.some((seen) => seen.key === `${card.key} @${width}`)) results.push({ ...card, key: `${card.key} @${width}` });
      if (shots) {
        await mkdir(new URL("../.layout-shots/", import.meta.url), { recursive: true });
        await page.screenshot({ path: new URL(`../.layout-shots/${tab.key}-${t + 1}-${width}.png`, import.meta.url).pathname, fullPage: true });
      }
    }
  }
  await page.close();
}
await browser.close();
server.close();

const baseline: Record<string, Kept> = existsSync(BASELINE) ? JSON.parse(await readFile(BASELINE, "utf8")) : {};
for (const card of results) {
  const kept = baseline[card.key];
  // Empty floor fails past the limit, unless the baseline accepted about as much there.
  if (card.empty > EMPTY_LIMIT && (update || !kept || card.empty > kept.empty + 34)) card.faults.push(`empty ${card.empty}px${kept ? ` (was ${kept.empty})` : ""}`);
  if (!update && kept && card.height > kept.h * GROWTH_LIMIT && card.height - kept.h > 34) card.faults.push(`grew ${kept.h}→${card.height}px`);
}
const failing = results.filter((card) => card.faults.length);
for (const card of failing) console.log(`${card.key}: ${card.faults.join(", ")}`);
for (const fault of pageFaults) console.log(fault);
console.log(`${results.length} cards measured at ${WIDTHS.join(" and ")}px: ${failing.length} with faults, ${pageFaults.length} page faults.`);
if (update) {
  const next = Object.fromEntries(results.map((card): [string, Kept] => [card.key, { h: card.height, empty: card.empty }]).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(BASELINE, `${JSON.stringify(next, null, 1)}\n`);
  console.log(`Baseline written: ${BASELINE}`);
}
if (update) console.log("Faults listed above are accepted into the baseline; check them with --shots first.");
process.exit(!update && (failing.length || pageFaults.length) ? 1 : 0);
