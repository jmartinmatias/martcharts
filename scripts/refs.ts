/**
 * The ref index: every chart the site shows, by its ref (W-AM22), with what it is and where it sits, so a ref said
 * aloud or pasted in a message leads to one chart in one place. Writes docs/refs.json, which the catalog's search
 * reads when a ref is typed. `npm run catalog` runs it.
 *
 * A chart's ref is the hash of its place and its key there (see `placedRef`): the dashboards keep their stored
 * widgets' own refs, and every other page names its place, so the same widget on Home, in the catalog, in the guide
 * and on a board has four refs. The Lab, Editor and Composer draw what the reader makes, so they have no fixed charts
 * to list: their refs carry their place all the same.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { placedRef, refKey, widgetRef } from "../src/core/ref.ts";
import { BOARD_TABS, HOME_STRIP, PLACES } from "../demo/routes.ts";

/** One chart on the site. */
export interface RefEntry {
  ref: string;
  /** The chart's title, or the example's heading. */
  title?: string;
  /** The key the ref hashes in its place: the widget id, else the title, else a host's own key. */
  key: string;
  /** The page's place, empty for the dashboards (whose cards keep their widgets' own refs). */
  place: string;
  /** Where it sits, in words: "Dashboards › Commercial cockpit › Where the money is". */
  where: string;
  /** The address from the site's root, ending where the chart is. */
  url: string;
  board?: string;
  section?: string;
  /** The code a catalog chart carried before refs named their place (its id's own hash): still found, never reused. */
  formerly?: string;
}

// Paths from the repo's root, by node:path (a page-like test environment swaps in its own URL).
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const here = (path: string) => join(ROOT, path);
const json = (path: string) => JSON.parse(readFileSync(here(path), "utf8"));

interface Cell {
  section?: string;
  widget?: string;
  spec?: { id?: string; title?: string };
}

/** Every chart the site shows, in page order. */
export function buildRefIndex(): RefEntry[] {
  const entries: RefEntry[] = [];
  const widgets = new Map<string, { title?: string }>();
  for (const file of readdirSync(here("widgets"), { recursive: true }) as string[]) {
    if (!file.endsWith(".json")) continue;
    const spec = json(`widgets/${file}`);
    if (spec.id) widgets.set(spec.id, spec);
  }
  const boards = readdirSync(here("dashboards")).filter((file) => file.endsWith(".json")).map((file) => json(`dashboards/${file}`));
  for (const tab of BOARD_TABS) {
    const board = boards.find((spec) => spec.id === tab.board);
    if (!board) continue;
    let section: string | undefined;
    (board.widgets as Cell[]).forEach((cell, index) => {
      if (cell.section) {
        section = cell.section;
        return;
      }
      // The same key the dashboard gives the card (createDashboard: the widget id, the inline spec's id, its place).
      const key = cell.widget ?? cell.spec?.id ?? `cell-${index}`;
      const ref = placedRef(undefined, key);
      const title = cell.spec?.title ?? (cell.widget ? widgets.get(cell.widget)?.title : undefined);
      entries.push({ ref, ...(title ? { title } : {}), key, place: "", where: ["Dashboards", tab.title, section].filter(Boolean).join(" › "), url: `dashboards.html?board=${tab.key}#${ref}`, board: tab.key, ...(section ? { section } : {}) });
    });
  }
  const types = readdirSync(here("catalog")).filter((file) => file.endsWith(".json")).map((file) => file.replace(/\.json$/, "")).sort();
  const catalog = new Map(types.map((type) => [type, json(`catalog/${type}.json`)]));
  for (const [type, spec] of catalog) {
    const key = refKey(spec) as string;
    entries.push({ ref: placedRef(PLACES.catalog, key), title: spec.title, key, place: PLACES.catalog, where: `Catalog › ${type}`, url: `catalog/index.html#${type}`, formerly: widgetRef(key) });
  }
  for (const [type, spec] of catalog) {
    const key = refKey(spec) as string;
    entries.push({ ref: placedRef(PLACES.guide, key), title: spec.title, key, place: PLACES.guide, where: `Catalog › Data guide › ${type}`, url: `catalog/guide.html#c-${type}` });
  }
  for (const { type } of HOME_STRIP) {
    const spec = catalog.get(type);
    if (!spec) continue;
    const key = refKey(spec) as string;
    entries.push({ ref: placedRef(PLACES.home, key), title: spec.title, key, place: PLACES.home, where: "Home", url: "index.html" });
  }
  // The Embed page: each example section names its key (data-fft-ref-key); the iframe example draws in the frame page.
  const embed = readFileSync(here("examples/drop-in.html"), "utf8");
  for (const [, key, body] of embed.matchAll(/<section class="example"[^>]*data-fft-ref-key="([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/section>/g)) {
    const heading = /<h2[^>]*>([^<]+)<\/h2>/.exec(body as string)?.[1];
    const frame = /<iframe src="embed\.html\?src=\.\.\/(widgets\/[^"]+\.json)"/.exec(body as string);
    if (frame) {
      const spec = json(frame[1] as string);
      entries.push({ ref: placedRef(PLACES.frame, spec.id), title: spec.title, key: spec.id, place: PLACES.frame, where: `Embed › ${heading} (in its frame)`, url: `examples/drop-in.html#ex-${key}` });
      continue;
    }
    const file = /<fft-widget[^>]*\ssrc="\.\.\/([^"]+\.json)"/.exec(body as string);
    const inline = /<fft-widget[^>]*>\s*<script type="application\/json">([\s\S]*?)<\/script>/.exec(body as string);
    const spec = file ? json(file[1] as string) : inline ? JSON.parse(inline[1] as string) : undefined;
    const ref = placedRef(PLACES.embed, key as string);
    entries.push({ ref, title: spec?.title ?? heading, key: key as string, place: PLACES.embed, where: `Embed › ${heading}`, url: `examples/drop-in.html#${ref}` });
  }
  // An old code stays findable only while no chart carries it now.
  const current = new Set(entries.map((entry) => entry.ref));
  for (const entry of entries) if (entry.formerly && current.has(entry.formerly)) delete entry.formerly;
  return entries;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const entries = buildRefIndex();
  writeFileSync(here("docs/refs.json"), `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`Wrote docs/refs.json: ${entries.length} charts, each with its own ref.`);
}
