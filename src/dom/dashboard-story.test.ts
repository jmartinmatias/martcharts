import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { readable } from "../core/canonical.ts";
import type { DashboardSpec } from "../core/dashboard.ts";
import { runPipeline } from "../core/pipeline.ts";
import { getBlock } from "../core/registry.ts";
import type { Row, WidgetSpec } from "../core/types.ts";
import { createLocalFetch } from "../mcp/store.ts";

/**
 * The worked dashboards read as stories, top to bottom: each section asks one question in its subtitle and opens on
 * the card that answers it, and no two cards on a board draw the same numbers by the same categories.
 */
const fetch = createLocalFetch("public");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(`${dir}/${f}`).isDirectory() ? walk(`${dir}/${f}`) : f.endsWith(".json") ? [`${dir}/${f}`] : []));
const widgets: Record<string, WidgetSpec> = {};
for (const file of walk("widgets")) {
  const spec = JSON.parse(readFileSync(file, "utf8")) as WidgetSpec;
  if (spec.id) widgets[spec.id] = spec;
}
const board = (id: string) => JSON.parse(readFileSync(`dashboards/${id}.json`, "utf8")) as DashboardSpec;
const BOARDS = ["commercial-cockpit", "regulatory-landscape", "client-health"] as const;

/** Each section of a board with the cards under it, in order. */
function sections(id: string): { title: string; question: string; cards: string[] }[] {
  const out: { title: string; question: string; cards: string[] }[] = [];
  for (const cell of board(id).widgets) {
    if (cell.section) out.push({ title: cell.section, question: String(cell.description ?? ""), cards: [] });
    else if (cell.widget) out.at(-1)?.cards.push(cell.widget);
  }
  return out;
}

/** Views that are lookups or single figures, not a measure by a category: tables, lists, tiles, cards and stories. */
const LOOKUPS = new Set(["table", "list", "kpi", "kpis", "xray", "history", "board", "ragboard", "ragtrend", "whitespace", "timeline", "lifecycle"]);

/**
 * What a card draws, as series: for each measure, its values by category (the view's category and date fields, and
 * the facet's). A card whose series is the same as another's, or a part of it (a pie of the six biggest products
 * beside a treemap of all eight), draws the same numbers twice.
 */
async function series(id: string): Promise<Map<string, Set<string>>> {
  const spec = readable(widgets[id] as WidgetSpec);
  const out = new Map<string, Set<string>>();
  if (LOOKUPS.has(spec.view.type)) return out;
  const options = getBlock("view", spec.view.type).options;
  const fieldsOf = (kinds: string[]) =>
    Object.entries(options)
      .filter(([, o]) => (o.type === "field" || o.type === "fields") && kinds.includes(o.kind ?? ""))
      .flatMap(([name]) => {
        const v = spec.view[name];
        return Array.isArray(v) ? v.map(String) : typeof v === "string" ? [v] : [];
      });
  const dims = [...fieldsOf(["category", "date"]), ...(spec.facet?.field ? [spec.facet.field] : [])];
  const measures = fieldsOf(["number"]).filter((m) => !dims.includes(m));
  if (!dims.length || !measures.length) return out;
  const rows: Row[] = await runPipeline(spec, { fetch });
  for (const measure of measures) {
    const points = rows
      .map((row) => [dims.map((d) => String(row[d] ?? "")).join(" / "), Number(row[measure])] as const)
      .filter(([, v]) => Number.isFinite(v))
      .map(([k, v]) => `${k}=${Math.round(v * 1000) / 1000}`);
    if (points.length >= 2) out.set(measure, new Set(points));
  }
  return out;
}

describe("the worked dashboards tell a story", () => {
  test.each(BOARDS)("%s: every section asks its question in its subtitle, and opens on a card", (id) => {
    for (const section of sections(id)) {
      expect([section.title, section.question.trim().endsWith("?")]).toEqual([section.title, true]);
      expect([section.title, section.cards.length > 0]).toEqual([section.title, true]);
    }
  });

  test.each(BOARDS)("%s: the board's description walks through its sections in order", (id) => {
    const spec = board(id);
    const text = `${spec.description ?? ""}`.toLowerCase();
    let at = -1;
    for (const section of sections(id)) {
      const word = section.title.toLowerCase();
      const found = text.indexOf(word, at + 1);
      expect([section.title, found > at]).toEqual([section.title, true]);
      at = found;
    }
  });

  test.each(BOARDS)("%s: no two cards draw the same measure by the same categories", async (id) => {
    const ids = board(id).widgets.flatMap((cell) => (cell.widget ? [cell.widget] : []));
    const drawn = await Promise.all(ids.map(async (wid) => [wid, await series(wid)] as const));
    const repeats: string[] = [];
    for (let i = 0; i < drawn.length; i++) {
      for (let j = i + 1; j < drawn.length; j++) {
        const [a, as] = drawn[i] as (typeof drawn)[number];
        const [b, bs] = drawn[j] as (typeof drawn)[number];
        for (const [m, s] of as) {
          for (const [n, t] of bs) {
            const [small, large] = s.size <= t.size ? [s, t] : [t, s];
            if ([...small].every((point) => large.has(point))) repeats.push(`${a}.${m} = ${b}.${n}`);
          }
        }
      }
    }
    expect(repeats).toEqual([]);
  });
});
