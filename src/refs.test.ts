// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, test } from "vitest";
import { buildRefIndex } from "../scripts/refs.ts";
import type { DashboardSpec } from "./core/dashboard.ts";
import { placedRef, WIDGET_REF, widgetRef } from "./core/ref.ts";
import type { WidgetSpec } from "./core/types.ts";
import { createLocalFetch } from "./mcp/store.ts";
import { createDashboard } from "./dom/dashboard.ts";
import { createWidget } from "./dom/widget.ts";
import "./dom/views/index.ts";
import { BOARD_TABS, PLACES } from "../demo/routes.ts";

const index = buildRefIndex();
const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const widgets: Record<string, WidgetSpec> = {};
for (const file of readdirSync("widgets", { recursive: true }) as string[]) {
  if (!file.endsWith(".json")) continue;
  const spec = json(`widgets/${file}`) as WidgetSpec;
  if (spec.id) widgets[spec.id] = spec;
}
const boardSpec = (id: string) => readdirSync("dashboards").map((file) => json(`dashboards/${file}`) as DashboardSpec & { id: string }).find((spec) => spec.id === id) as DashboardSpec;

afterEach(() => {
  document.body.innerHTML = "";
  delete document.body.dataset.fftPlace;
});

describe("chart refs: one per chart per place, all of them in the index", () => {
  test("every chart on every page and board has a ref of its own: none shared, each W- and four characters", () => {
    const refs = index.map((entry) => entry.ref);
    const shared = refs.filter((ref, i) => refs.indexOf(ref) !== i);
    expect(shared).toEqual([]);
    expect(refs.every((ref) => WIDGET_REF.test(ref))).toBe(true);
    // Every board card, catalog chart, guide chart, Home chart and Embed example is listed.
    const boardCards = BOARD_TABS.reduce((sum, tab) => sum + (boardSpec(tab.board)?.widgets ?? []).filter((cell) => !("section" in cell && cell.section)).length, 0);
    const catalog = readdirSync("catalog").filter((file) => file.endsWith(".json")).length;
    expect(index.filter((entry) => entry.place === "").length).toBe(boardCards);
    expect(index.filter((entry) => entry.place === PLACES.catalog).length).toBe(catalog);
    expect(index.filter((entry) => entry.place === PLACES.guide).length).toBe(catalog);
    expect(index.filter((entry) => entry.place === PLACES.home).length).toBe(3);
    expect(index.filter((entry) => entry.place === PLACES.embed || entry.place === PLACES.frame).length).toBe(6);
  });

  test("each ref resolves to which chart and where: a title or key, the place in words, and an address that ends at it", () => {
    for (const entry of index) {
      expect([entry.ref, entry.ref === placedRef(entry.place || undefined, entry.key)]).toEqual([entry.ref, true]);
      expect([entry.ref, Boolean(entry.title || entry.key), entry.where.length > 0, /^(dashboards|catalog|examples|index)/.test(entry.url)]).toEqual([entry.ref, true, true, true]);
    }
  });

  test("the published index (docs/refs.json) is the index as the site stands: npm run catalog writes it", () => {
    expect(json("docs/refs.json")).toEqual(index);
  });

  test("a chart in a place draws the ref the index gives it, visible and copyable; the same chart elsewhere has another", async () => {
    const spec = json("catalog/line.json") as WidgetSpec;
    const shown: string[] = [];
    for (const place of [PLACES.catalog, PLACES.home]) {
      const host = document.createElement("div");
      host.dataset.fftPlace = place;
      const mount = document.createElement("div");
      host.append(mount);
      document.body.append(host);
      await createWidget(mount, spec).ready;
      const button = mount.querySelector<HTMLButtonElement>(".fft-widget-ref");
      expect([button?.hidden, button?.textContent]).toEqual([false, placedRef(place, spec.id)]);
      expect(index.some((entry) => entry.place === place && entry.ref === button?.textContent)).toBe(true);
      shown.push(button?.textContent ?? "");
    }
    expect(new Set(shown).size).toBe(2);
  });

  test("an Embed example takes its key from its section, so its copied code stays free of ref attributes", async () => {
    document.body.dataset.fftPlace = PLACES.embed;
    const section = document.createElement("section");
    section.dataset.fftRefKey = "inline";
    const mount = document.createElement("div");
    section.append(mount);
    document.body.append(section);
    await createWidget(mount, { title: "Signups by channel", data: { type: "inline", rows: [{ a: "x", b: 1 }] }, view: { type: "bar", x: "a", y: "b" } } as WidgetSpec).ready;
    const ref = mount.querySelector(".fft-widget-ref")?.textContent;
    expect(index.find((entry) => entry.ref === ref)?.where).toBe("Embed › The spec inside the tag");
  });

  test("outside the site, with no place, a widget keeps its own ref, and one with no id shows none", async () => {
    const one = document.createElement("div");
    const two = document.createElement("div");
    document.body.append(one, two);
    const spec = json("catalog/line.json") as WidgetSpec;
    await createWidget(one, spec).ready;
    await createWidget(two, { ...spec, id: undefined }).ready;
    expect(one.querySelector(".fft-widget-ref")?.textContent).toBe(widgetRef(spec.id as string));
    expect(two.querySelector<HTMLButtonElement>(".fft-widget-ref")?.hidden).toBe(true);
  });
});

describe("every card on a dashboard shows its ref", () => {
  test.each(BOARD_TABS.map((tab) => [tab.key, tab.board]))("%s: each drawn card shows the ref the index lists for it", async (key, board) => {
    const target = document.createElement("div");
    document.body.append(target);
    const dashboard = createDashboard(target, boardSpec(board), { widgets, fetch: createLocalFetch("public") });
    await dashboard.ready;
    const listed = index.filter((entry) => entry.board === key).map((entry) => entry.ref);
    expect(dashboard.refs().map((entry) => entry.ref)).toEqual(listed);
    const roots = [...target.querySelectorAll<HTMLElement>(".fft-widget")];
    expect(roots.length).toBeGreaterThan(0);
    for (const root of roots) {
      const button = root.querySelector<HTMLButtonElement>(".fft-widget-ref");
      expect([root.dataset.fftRef, button?.hidden]).toEqual([button?.textContent, false]);
      expect(listed).toContain(button?.textContent);
    }
    dashboard.destroy();
  }, 60_000);

  test("reveal(ref) opens a folded section and brings its card in; an unknown ref changes nothing", async () => {
    const target = document.createElement("div");
    document.body.append(target);
    const spec = boardSpec("commercial-cockpit");
    const dashboard = createDashboard(target, spec, { widgets, fetch: createLocalFetch("public") });
    await dashboard.ready;
    const folded = index.find((entry) => entry.board === "commercial" && spec.widgets.some((cell) => "section" in cell && cell.section === entry.section && (cell as { collapsed?: boolean }).collapsed));
    expect(folded).toBeDefined();
    const before = target.querySelectorAll(".fft-widget").length;
    expect(await dashboard.reveal(folded?.ref ?? "")).toBe(true);
    expect(target.querySelectorAll(".fft-widget").length).toBeGreaterThan(before);
    expect(target.querySelector(`[data-fft-ref="${folded?.ref}"]`)).not.toBeNull();
    expect(await dashboard.reveal("W-0000")).toBe(false);
    dashboard.destroy();
  }, 60_000);
});

test("a catalog chart's old code (W-AM22 for Product share) still leads to it, and is never a code another chart carries now", () => {
  const index = buildRefIndex();
  const current = new Set(index.map((entry) => entry.ref));
  const moved = index.find((entry) => entry.formerly === "W-AM22");
  expect([moved?.title, moved?.where]).toEqual(["Product share", "Catalog › bar"]);
  for (const entry of index) if (entry.formerly) expect(current.has(entry.formerly)).toBe(false);
});

test("the catalog search's example ref is one the site shows today", () => {
  const html = readFileSync("catalog/index.html", "utf8");
  const example = /placeholder="trend, share, date, (W-[0-9A-Z]{4})…"/.exec(html)?.[1];
  expect(buildRefIndex().some((entry) => entry.ref === example)).toBe(true);
});
