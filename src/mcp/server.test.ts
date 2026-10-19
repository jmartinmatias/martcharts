import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { widgetRef } from "../core/ref.ts";
import { createFftServer } from "./server.ts";
import type { FftServerOptions } from "./server.ts";
import { createFileStore, createLocalFetch } from "./store.ts";
import type { WidgetStore } from "./store.ts";

let root: string;
let store: WidgetStore;
let clients: Client[] = [];

const salesByRegion = {
  title: "Revenue by region",
  description: "Revenue per region, largest first.",
  locale: "en-US",
  data: { type: "url", url: "/data/sales.json" },
  transform: [
    { type: "aggregate", groupBy: "region", measures: [{ op: "sum", field: "revenue" }] },
    { type: "sort", field: "revenue", order: "desc" },
  ],
  fields: { revenue: { label: "Revenue", format: { type: "currency", currency: "EUR", decimals: 0 } } },
  view: { type: "bar", x: "region", y: "revenue" },
};
const kpi = { title: "Visits", data: { type: "inline", rows: [{ visits: 10 }] }, view: { type: "kpi", value: "visits" } };

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "fft-mcp-"));
  await mkdir(join(root, "widgets"));
  await mkdir(join(root, "public", "data"), { recursive: true });
  await writeFile(
    join(root, "public", "data", "sales.json"),
    JSON.stringify([
      { region: "North", revenue: 100 },
      { region: "East", revenue: 300 },
      { region: "North", revenue: 50 },
      { region: "South", revenue: 120 },
    ]),
  );
  store = createFileStore(join(root, "widgets"));
  await store.save("sales-by-region", salesByRegion);
  await store.save("visits", kpi);
});

afterEach(async () => {
  await Promise.all(clients.map((c) => c.close()));
  clients = [];
  await rm(root, { recursive: true, force: true });
});

async function connect(options: Partial<FftServerOptions> = {}) {
  const server = createFftServer({ store, fetch: createLocalFetch(join(root, "public")), ...options });
  const client = new Client({ name: "test", version: "1.0.0" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  await client.connect(clientSide);
  clients.push(client);
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args });
    const text = (result.content as { type: string; text: string }[])[0]?.text ?? "";
    return { result, text, data: result.structuredContent as Record<string, unknown> | undefined, isError: result.isError === true };
  };
  return { client, call };
}

describe("tools", () => {
  test("the full server offers every widget tool", async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "fft_check_palette",
      "fft_create_variants",
      "fft_create_widget",
      "fft_delete_widget",
      "fft_get_chart",
      "fft_get_widget",
      "fft_get_widget_data",
      "fft_list_blocks",
      "fft_list_charts",
      "fft_list_widgets",
      "fft_update_widget",
      "fft_validate_spec",
    ]);
  });

  test("a widget's ref, as shown faintly on its card, works in place of its id, in any case", async () => {
    const { call } = await connect();
    const ref = widgetRef("visits");
    const [byRef, byLower] = [await call("fft_get_widget", { id: ref }), await call("fft_get_widget", { id: ref.toLowerCase() })];
    expect([(byRef.data?.spec as { id?: string })?.id, (byLower.data?.spec as { id?: string })?.id]).toEqual(["visits", "visits"]);
    const forked = await call("fft_create_widget", { id: "visits-copy", from: ref, spec: { title: "Visits copy" } });
    expect(forked.isError).toBe(false);
  });

  test("fft_create_variants makes seeded versions of a stored widget, each with the sales question it answers, without saving anything", async () => {
    const { call } = await connect();
    const first = await call("fft_create_variants", { id: "sales-by-region", count: 3, seed: 2 });
    const again = await call("fft_create_variants", { id: widgetRef("sales-by-region"), count: 3, seed: 2 });
    const variants = (first.data?.variants ?? []) as { question: string; move: string; spec: { view: { type: string } }; qualities: object; balance: { ok: boolean }; seed: number }[];
    expect(first.data?.widget).toBe("sales-by-region");
    expect(first.data?.question).toMatch(/\?$/);
    expect(variants.length).toBeGreaterThan(0);
    expect(variants.every((v) => v.question.endsWith("?") && v.move.length > 0 && v.balance.ok && v.seed === 2 && v.spec.view.type !== "")).toBe(true);
    expect(again.data?.variants).toEqual(first.data?.variants);
    expect((await store.list()).map((w) => w.id)).toEqual(["sales-by-region", "visits"]);
  });

  test("fft_create_variants steers by move and audience, and speaks in sales and chart words", async () => {
    const { client, call } = await connect();
    const distilled = await call("fft_create_variants", { id: "sales-by-region", count: 4, moves: ["distill"], audience: "rep" });
    const variants = (distilled.data?.variants ?? []) as { move: string }[];
    expect(variants.length).toBeGreaterThan(0);
    expect(variants.every((v) => v.move === "distill")).toBe(true);
    const tool = (await client.listTools()).tools.find((t) => t.name === "fft_create_variants");
    const words = JSON.stringify([tool?.description, tool?.inputSchema]);
    expect(words.match(/\b(salty|umami|plate|spherif\w*|tweezers|crunchy|dish|cook\w*|menu|kitchen|tastes?|ingredients?|temperature|texture)\b/gi) ?? []).toEqual([]);
  });

  test("fft_get_widget_data says how to read the chart in plain words, with an example from its rows", async () => {
    const { call } = await connect();
    const json = await call("fft_get_widget_data", { id: "sales-by-region", response_format: "json" });
    const howToRead = String(json.data?.howToRead);
    const markdown = await call("fft_get_widget_data", { id: "sales-by-region" });
    expect([howToRead.startsWith("Each bar is one region."), howToRead.includes("Here, East is the tallest"), markdown.text.includes(`How to read it: ${howToRead}`)]).toEqual([true, true, true]);
  });

  test("fft_get_widget_data names the sales question the chart answers, before how to read it", async () => {
    const { call } = await connect();
    const json = await call("fft_get_widget_data", { id: "sales-by-region", response_format: "json" });
    const markdown = await call("fft_get_widget_data", { id: "sales-by-region" });
    expect(json.data?.question).toBe("Which region has the most revenue?");
    expect(markdown.text.indexOf("Answers: Which region has the most revenue?")).toBeGreaterThan(-1);
    expect(markdown.text.indexOf("Answers:")).toBeLessThan(markdown.text.indexOf("How to read it:"));
  });

  test("a ref that matches no widget says how to find one", async () => {
    const { call } = await connect();
    const { isError, text } = await call("fft_get_widget", { id: "W-ZZZZ" });
    expect([isError, text]).toEqual([true, 'No widget "W-ZZZZ". Call fft_list_widgets to see the ids.']);
  });

  test("read-only tools say so and delete is marked destructive", async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    const hints = Object.fromEntries(tools.map((t) => [t.name, t.annotations]));
    expect(hints.fft_list_widgets?.readOnlyHint).toBe(true);
    expect(hints.fft_get_widget_data?.readOnlyHint).toBe(true);
    expect(hints.fft_delete_widget?.destructiveHint).toBe(true);
  });

  test("fft_list_widgets lists ids, titles and view types", async () => {
    const { call } = await connect();
    const { data } = await call("fft_list_widgets", { response_format: "json" });
    expect(data?.widgets).toEqual([
      { id: "sales-by-region", ref: widgetRef("sales-by-region"), title: "Revenue by region", view: "bar", source: "url", description: "Revenue per region, largest first." },
      { id: "visits", ref: widgetRef("visits"), title: "Visits", view: "kpi", source: "inline" },
    ]);
    expect(data?.total).toBe(2);
  });

  test("fft_list_widgets pages with limit and offset", async () => {
    const { call } = await connect();
    const first = await call("fft_list_widgets", { response_format: "json", limit: 1 });
    expect([first.data?.count, first.data?.has_more, first.data?.next_offset]).toEqual([1, true, 1]);
    const second = await call("fft_list_widgets", { response_format: "json", limit: 1, offset: 1 });
    expect([(second.data?.widgets as { id: string }[])[0]?.id, second.data?.has_more]).toEqual(["visits", false]);
  });

  test("fft_list_widgets in markdown names each widget with its id and ref", async () => {
    const { text } = await connect().then((s) => s.call("fft_list_widgets"));
    expect(text).toContain(`**Revenue by region** (\`sales-by-region\`, ${widgetRef("sales-by-region")}): bar view, url data. Revenue per region, largest first.`);
  });

  test("fft_get_widget returns the stored spec and its validation issues", async () => {
    const { data } = await (await connect()).call("fft_get_widget", { id: "visits" });
    expect(data).toEqual({ spec: { id: "visits", ...kpi }, issues: [] });
  });

  test("a missing widget is a tool error that says how to find ids", async () => {
    const { isError, text } = await (await connect()).call("fft_get_widget", { id: "ghost" });
    expect(isError).toBe(true);
    expect(text).toContain('No widget "ghost". Call fft_list_widgets to see the ids.');
  });

  test("fft_get_widget_data runs the pipeline, loading relative URLs from the public folder", async () => {
    const { data } = await (await connect()).call("fft_get_widget_data", { id: "sales-by-region", response_format: "json" });
    expect(data?.rows).toEqual([
      { region: "East", revenue: 300 },
      { region: "North", revenue: 150 },
      { region: "South", revenue: 120 },
    ]);
    expect([data?.total, data?.fields]).toEqual([3, ["region", "revenue"]]);
  });

  test("fft_get_widget_data in markdown is a table with labels and formatted values", async () => {
    const { text } = await (await connect()).call("fft_get_widget_data", { id: "sales-by-region" });
    expect(text).toContain("| Region | Revenue |\n| --- | --- |\n| East | €300 |\n| North | €150 |\n| South | €120 |");
  });

  test("fft_get_widget_data pages rows", async () => {
    const { data } = await (await connect()).call("fft_get_widget_data", { id: "sales-by-region", response_format: "json", limit: 2 });
    expect([data?.count, data?.has_more, data?.next_offset]).toEqual([2, true, 2]);
  });

  test("fft_create_widget forks an existing widget with only the changes", async () => {
    const { call } = await connect();
    const { isError } = await call("fft_create_widget", { id: "sales-table", from: "sales-by-region", spec: { title: "Sales table", view: { type: "table", x: null, y: null } } });
    expect(isError).toBe(false);
    const saved = await store.get("sales-table");
    expect([saved.title, saved.view, saved.transform]).toEqual(["Sales table", { type: "table" }, salesByRegion.transform]);
  });

  test("fft_create_widget without from starts from the vanilla block", async () => {
    const { call } = await connect();
    await call("fft_create_widget", { id: "fresh", spec: { title: "Fresh", data: { type: "inline", rows: [{ a: 1 }] } } });
    const saved = await store.get("fresh");
    expect([saved.title, saved.view.type, saved.style?.theme]).toEqual(["Fresh", "table", "auto"]);
  });

  test("fft_create_widget refuses an invalid spec, saves nothing, and lists the problems", async () => {
    const { call } = await connect();
    const { isError, text } = await call("fft_create_widget", { id: "bad", spec: { view: { type: "pie" } } });
    expect(isError).toBe(true);
    expect(text).toMatch(/view\.type: Unknown view "pie"\. Available: .*\bbar\b.*\btable\b/);
    expect(await store.has("bad")).toBe(false);
  });

  test("fft_create_widget will not overwrite an existing widget", async () => {
    const { isError, text } = await (await connect()).call("fft_create_widget", { id: "visits", spec: {} });
    expect(isError).toBe(true);
    expect(text).toContain('Widget "visits" already exists. Use fft_update_widget to change it.');
  });

  test("fft_create_widget warns about fields the data does not have", async () => {
    const { data } = await (await connect()).call("fft_create_widget", { id: "typo", from: "sales-by-region", spec: { view: { y: "revnue" } } });
    expect(data?.warnings).toEqual([{ level: "warning", path: "view.y", message: 'Field "revnue" is not in the data. Fields: region, revenue.' }]);
  });

  test("fft_update_widget applies changes as a merge patch, where null removes", async () => {
    const { call } = await connect();
    await call("fft_update_widget", { id: "sales-by-region", changes: { title: "Regions", description: null, style: { theme: "dark" } } });
    const saved = await store.get("sales-by-region");
    expect([saved.title, saved.description, saved.style, saved.view]).toEqual(["Regions", undefined, { theme: "dark" }, salesByRegion.view]);
  });

  test("fft_update_widget with replace swaps the whole spec", async () => {
    await (await connect()).call("fft_update_widget", { id: "visits", replace: { title: "New", data: { type: "inline", rows: [] }, view: { type: "table" } } });
    expect(await store.get("visits")).toEqual({ id: "visits", title: "New", data: { type: "inline", rows: [] }, view: { type: "table" } });
  });

  test("fft_update_widget refuses changes that break the spec and leaves the file alone", async () => {
    const { isError, text } = await (await connect()).call("fft_update_widget", { id: "visits", changes: { view: { value: null } } });
    expect(isError).toBe(true);
    expect(text).toContain("view.value: Required.");
    expect(await store.get("visits")).toEqual({ id: "visits", ...kpi });
  });

  test("fft_update_widget needs exactly one of changes or replace", async () => {
    const { isError, text } = await (await connect()).call("fft_update_widget", { id: "visits" });
    expect(isError).toBe(true);
    expect(text).toContain("Pass either changes (to edit some fields) or replace (to swap the whole spec).");
  });

  test("fft_delete_widget removes the widget", async () => {
    const { isError } = await (await connect()).call("fft_delete_widget", { id: "visits" });
    expect(isError).toBe(false);
    expect(await store.has("visits")).toBe(false);
  });

  test("fft_list_charts lists every view with the fields it needs, and which have a starter", async () => {
    await mkdir(join(root, "catalog"));
    const catalog = createFileStore(join(root, "catalog"), "chart");
    await catalog.save("hbar", { title: "Teams", data: { type: "inline", rows: [{ team: "Ops", hours: 3 }] }, view: { type: "hbar", label: "team", value: "hours" } });
    const { data } = await (await connect({ catalog })).call("fft_list_charts", { response_format: "json" });
    const charts = data?.charts as { type: string; has_starter: boolean; question?: string; needs: { option: string; holds: string; required: boolean }[] }[];
    expect(charts.length).toBe(data?.total);
    expect(charts.length).toBeGreaterThanOrEqual(40);
    const hbar = charts.find((c) => c.type === "hbar");
    expect(hbar?.has_starter).toBe(true);
    expect(hbar?.question).toBeTruthy();
    expect(hbar?.needs.filter((n) => n.required).map((n) => [n.option, n.holds])).toEqual([["label", "category"], ["value", "number"]]);
    expect(charts.find((c) => c.type === "sankey")?.has_starter).toBe(false);
  });

  test("fft_get_chart returns a starter spec that validates, and names the known types for a wrong one", async () => {
    await mkdir(join(root, "catalog"));
    const catalog = createFileStore(join(root, "catalog"), "chart");
    const rows = Array.from({ length: 5_000 }, (_, i) => ({ team: `Team ${i} with a long name`, hours: i }));
    await catalog.save("hbar", { title: "Teams", data: { type: "inline", rows }, view: { type: "hbar", label: "team", value: "hours" } });
    const { call } = await connect({ catalog });
    const { data, text } = await call("fft_get_chart", { type: "hbar", response_format: "json" });
    const starter = data?.starter as { data: { rows: unknown[] } };
    expect(starter.data.rows.length).toBeLessThan(rows.length);
    expect(text.length).toBeLessThan(25_000);
    expect(data?.note).toContain("of its 5000 rows");
    expect((await call("fft_validate_spec", { spec: starter })).isError).toBe(false);
    expect((await call("fft_get_chart", { type: "sankey" })).text).toContain("No starter spec");
    const wrong = await call("fft_get_chart", { type: "pie" });
    expect(wrong.isError).toBe(true);
    expect(wrong.text).toContain("donut");
  });

  test("fft_list_blocks describes every view and its options", async () => {
    const { data } = await (await connect()).call("fft_list_blocks", { kind: "view", response_format: "json" });
    const views = data?.view as { type: string; options: Record<string, { required?: boolean }> }[];
    const types = views.map((v) => v.type);
    expect(types).toEqual([...types].sort());
    expect(types).toEqual(expect.arrayContaining(["bar", "line", "table"]));
    expect(views.find((v) => v.type === "bar")?.options.x?.required).toBe(true);
  });

  test("fft_list_blocks for views starts with a guide from what to show to which view, naming every view", async () => {
    const { text } = await (await connect()).call("fft_list_blocks", { kind: "view" });
    const guide = text.split("## Choosing a view")[1]?.split("\n## ")[0] ?? "";
    expect(guide).toContain("Parts of a whole: donut");
    const named = new Set([...guide.matchAll(/\b([a-z]+)\b/g)].map((m) => m[1]));
    const { data } = await (await connect()).call("fft_list_blocks", { kind: "view", response_format: "json" });
    const missing = (data?.view as { type: string }[]).map((v) => v.type).filter((type) => !named.has(type));
    expect(missing).toEqual([]);
  });

  test("fft_check_palette reports colorblind separation and contrast for a list of colors or a library palette", async () => {
    const { call } = await connect();
    const named = await call("fft_check_palette", { palette: "bw", mode: "light" });
    expect(named.data?.ok).toBe(false);
    expect((named.data?.checks as { name: string; state: string }[]).find((c) => c.name === "chroma")?.state).toBe("fail");
    const listed = await call("fft_check_palette", { palette: ["#2a78d6", "#eb6834", "#1baf7a"], mode: "light" });
    expect(listed.data?.ok).toBe(true);
  });

  test("fft_list_blocks in json includes the presets and the palette library", async () => {
    const { data } = await (await connect()).call("fft_list_blocks", { response_format: "json" });
    expect((data?.palettes as { name: string }[]).map((p) => p.name)).toEqual(expect.arrayContaining(["apple", "bw", "credit-agricole"]));
    expect((data?.presets as { name: string }[]).map((p) => p.name)).toEqual(expect.arrayContaining(["glass", "airy"]));
  });

  test("fft_validate_spec checks a draft without saving it", async () => {
    const { data } = await (await connect()).call("fft_validate_spec", { spec: { data: { type: "inline", rows: [{ a: 1 }] }, view: { type: "bar", x: "a", y: "b" } } });
    expect(data).toEqual({ valid: true, issues: [{ level: "warning", path: "view.y", message: 'Field "b" is not in the data. Fields: a.' }] });
  });
});

describe("dashboards", () => {
  let dashboards: WidgetStore;
  beforeEach(async () => {
    await mkdir(join(root, "dashboards"));
    dashboards = createFileStore(join(root, "dashboards"), "dashboard");
    await dashboards.save("sales", { title: "Sales", filters: [{ field: "region" }], widgets: [{ widget: "sales-by-region", span: 2 }, { widget: "visits" }] } as never);
  });
  const connectBoards = () => connect({ dashboards });

  test("dashboard tools appear when the server has a dashboard folder", async () => {
    const { client } = await connectBoards();
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["fft_list_dashboards", "fft_get_dashboard", "fft_create_dashboard", "fft_update_dashboard", "fft_delete_dashboard"]));
  });

  test("fft_list_dashboards lists ids, titles, cell counts and filters", async () => {
    const { data } = await (await connectBoards()).call("fft_list_dashboards", { response_format: "json" });
    expect(data?.dashboards).toEqual([{ id: "sales", title: "Sales", widgets: 2, filters: ["region"] }]);
  });

  test("fft_get_dashboard returns the spec, issues, and any widget ids that do not exist", async () => {
    await dashboards.save("broken", { widgets: [{ widget: "ghost" }] } as never);
    const { data } = await (await connectBoards()).call("fft_get_dashboard", { id: "broken" });
    expect([data?.issues, data?.missing]).toEqual([[], ["ghost"]]);
  });

  test("fft_create_dashboard validates and refuses unknown widgets", async () => {
    const { call } = await connectBoards();
    const bad = await call("fft_create_dashboard", { id: "nope", spec: { widgets: [{ widget: "ghost" }] } });
    expect(bad.isError).toBe(true);
    expect(bad.text).toContain('Unknown widget "ghost". Call fft_list_widgets to see the ids.');
    const ok = await call("fft_create_dashboard", { id: "ops", spec: { title: "Ops", widgets: [{ widget: "visits" }] } });
    expect(ok.isError).toBe(false);
    expect((await dashboards.get("ops")).title).toBe("Ops");
  });

  test("fft_create_dashboard refuses specs that break the dashboard rules", async () => {
    const { isError, text } = await (await connectBoards()).call("fft_create_dashboard", { id: "x", spec: { columns: 2, widgets: [{ widget: "visits", span: 3 }] } });
    expect(isError).toBe(true);
    expect(text).toContain("widgets[0].span: Must be a whole number from 1 to 2.");
  });

  test("fft_update_dashboard applies a merge patch", async () => {
    await (await connectBoards()).call("fft_update_dashboard", { id: "sales", changes: { title: "Sales overview", filters: null } });
    const saved = await dashboards.get("sales");
    expect([saved.title, (saved as { filters?: unknown }).filters]).toEqual(["Sales overview", undefined]);
  });

  test("fft_delete_dashboard removes it", async () => {
    await (await connectBoards()).call("fft_delete_dashboard", { id: "sales" });
    expect(await dashboards.has("sales")).toBe(false);
  });

  test("each dashboard is its own resource", async () => {
    const { client } = await connectBoards();
    const uris = (await client.listResources()).resources.map((r) => r.uri);
    expect(uris).toContain("fft://dashboards/sales");
    const { contents } = await client.readResource({ uri: "fft://dashboards/sales" });
    expect(JSON.parse((contents[0] as { text: string }).text).title).toBe("Sales");
  });

  test("a missing dashboard says how to find the ids", async () => {
    const { isError, text } = await (await connectBoards()).call("fft_get_dashboard", { id: "ghost" });
    expect([isError, text.includes('No dashboard "ghost". Call fft_list_dashboards to see the ids.')]).toEqual([true, true]);
  });
});

describe("resources", () => {
  test("every widget is listed as its own resource", async () => {
    const { client } = await connect();
    const { resources } = await client.listResources();
    // The SDK lists fixed resources before template ones, so compare without order.
    expect(resources.map((r) => [r.uri, r.title]).sort()).toEqual([
      ["fft://blocks", "Block catalog"],
      ["fft://widgets/sales-by-region", "Revenue by region"],
      ["fft://widgets/visits", "Visits"],
    ]);
  });

  test("reading a widget resource returns its spec", async () => {
    const { client } = await connect();
    const { contents } = await client.readResource({ uri: "fft://widgets/visits" });
    expect(JSON.parse((contents[0] as { text: string }).text)).toEqual({ id: "visits", ...kpi });
  });

  test("with a catalog, every chart starter is its own resource, and other files are not", async () => {
    await mkdir(join(root, "catalog"));
    const catalog = createFileStore(join(root, "catalog"), "chart");
    const hbar = { data: { type: "inline", rows: [{ team: "Ops", hours: 3 }] }, view: { type: "hbar", label: "team", value: "hours" } };
    await catalog.save("hbar", hbar);
    await catalog.save("not-a-view", hbar);
    const { client } = await connect({ catalog });
    const charts = (await client.listResources()).resources.filter((r) => r.uri.startsWith("fft://charts/"));
    expect(charts.map((r) => r.uri)).toEqual(["fft://charts/hbar"]);
    expect(charts[0]?.title).toMatch(/^hbar: Horizontal bars/);
    const { contents } = await client.readResource({ uri: "fft://charts/hbar" });
    expect(JSON.parse((contents[0] as { text: string }).text)).toMatchObject(hbar);
    await expect(client.readResource({ uri: "fft://charts/sankey" })).rejects.toThrow();
    await expect(client.readResource({ uri: "fft://charts/not-a-view" })).rejects.toThrow();
  });

  test("reading a widget's data resource returns its rows", async () => {
    const { client } = await connect();
    const { contents } = await client.readResource({ uri: "fft://widgets/sales-by-region/data" });
    expect(JSON.parse((contents[0] as { text: string }).text)).toEqual([
      { region: "East", revenue: 300 },
      { region: "North", revenue: 150 },
      { region: "South", revenue: 120 },
    ]);
  });
});

describe("a server linked to one widget", () => {
  test("offers only that widget's tools, with no id to pass", async () => {
    const { client } = await connect({ widgetId: "visits" });
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["fft_check_palette", "fft_create_variants", "fft_get_chart", "fft_get_widget", "fft_get_widget_data", "fft_list_blocks", "fft_list_charts", "fft_update_widget", "fft_validate_spec"]);
    const getWidget = tools.find((t) => t.name === "fft_get_widget");
    expect(Object.keys((getWidget?.inputSchema as { properties?: object }).properties ?? {})).not.toContain("id");
  });

  test("reads and updates the linked widget", async () => {
    const { call } = await connect({ widgetId: "visits" });
    expect((await call("fft_get_widget")).data?.spec).toEqual({ id: "visits", ...kpi });
    await call("fft_update_widget", { changes: { title: "Daily visits" } });
    expect((await store.get("visits")).title).toBe("Daily visits");
  });

  test("lists only the linked widget's resources", async () => {
    const { client } = await connect({ widgetId: "visits" });
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri).sort()).toEqual(["fft://blocks", "fft://widgets/visits", "fft://widgets/visits/data"]);
  });
});
