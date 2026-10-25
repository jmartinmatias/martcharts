// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { validateDashboard } from "../core/dashboard.ts";
import type { DashboardSpec } from "../core/dashboard.ts";
import type { WidgetSpec } from "../core/types.ts";
import { addChartToBoard, BOARDS_KEY, localBoardStore } from "./board-store.ts";
import { boardFromHash, boardToHash, createComposer, dashboardEmbed } from "./composer.ts";
import type { Composer } from "./composer.ts";
import { createDashboard } from "./dashboard.ts";
import { createEditor } from "./editor.ts";
import type { Editor } from "./editor.ts";
import "./views/index.ts";

let target: HTMLElement;
let editor: Editor | undefined;
let composer: Composer | undefined;
beforeEach(() => {
  editor?.destroy();
  composer?.destroy();
  editor = undefined;
  composer = undefined;
  document.body.innerHTML = "";
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState(null, "", "#");
  target = document.createElement("div");
  document.body.append(target);
});

const all = <T extends Element = HTMLElement>(selector: string) => [...target.querySelectorAll<T>(selector)] as T[];
const byLabel = (label: string) => all<HTMLElement>("[aria-label]").find((node) => node.getAttribute("aria-label") === label);
const fire = (node: Element, type: string) => node.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));

/** A sales table pasted as CSV: two charts made from it share region, so a filter on it reaches both. */
const CSV = "region,month,revenue,cost\nNorth,2026-01,1200,800\nSouth,2026-01,900,700\nEast,2026-02,2000,1500\nWest,2026-02,1100,900";
const chart = (id: string, view: WidgetSpec["view"], title = id): WidgetSpec => ({
  id,
  title,
  data: { type: "inline", rows: [{ region: "North", revenue: 1200 }, { region: "South", revenue: 900 }, { region: "East", revenue: 2000 }] },
  view,
});

describe("from a CSV to a published dashboard, with no JSON written", () => {
  test("paste a CSV, make two charts, add both to a new board, set a filter, export: it validates and draws", async () => {
    // Two charts in the editor, each added to the same dashboard.
    editor = createEditor(target, { hash: false });
    editor.setData(CSV);
    editor.setSpec({ ...editor.spec, id: "revenue", title: "Revenue by region", view: { type: "hbar", label: "region", value: "revenue" } });
    editor.go(4);
    const addButton = () => all<HTMLButtonElement>("button").find((b) => b.textContent === "Add to dashboard") as HTMLButtonElement;
    const choose = byLabel("Dashboard") as HTMLSelectElement;
    expect(choose.value).toBe("");
    (byLabel("Dashboard name") as HTMLInputElement).value = "Sales review";
    addButton().click();
    await vi.waitFor(() => expect(target.querySelector(".fft-ed-addboard-result a")).not.toBeNull());
    const link = target.querySelector(".fft-ed-addboard-result a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("composer.html#board=sales-review");
    editor.setSpec({ ...editor.spec, id: "cost", title: "Cost by region", view: { type: "bar", x: "region", y: "cost" } });
    editor.go(4);
    // The board made a moment ago is offered first.
    expect((byLabel("Dashboard") as HTMLSelectElement).value).toBe("sales-review");
    addButton().click();
    await vi.waitFor(() => expect(localBoardStore().boards()).toSatisfy((boards: unknown) => Array.isArray(boards) && boards[0]?.spec.widgets.length === 2));
    // My charts lists both, from the same store.
    expect((localBoardStore().charts() as { id: string }[]).map((c) => c.id).sort()).toEqual(["cost", "revenue"]);
    editor.destroy();
    editor = undefined;
    target.replaceChildren();

    // The composer opens the board the editor linked to.
    history.replaceState(null, "", "#board=sales-review");
    composer = createComposer(target, { hash: true });
    await vi.waitFor(() => expect(composer?.spec.widgets.length).toBe(2));
    expect(composer.spec.title).toBe("Sales review");
    const choices = await composer.filterChoices();
    expect(choices.map((c) => [c.field, c.reach, c.total])).toEqual([["region", 2, 2]]);
    composer.setFilter("region", true);
    composer.setMeta({ subtitle: "Q1 2026", asOf: "2026-03-31" });

    // Export: the JSON validates and draws, every card ready, no error.
    const published = JSON.parse(target.querySelector('[data-code="json"]')?.textContent ?? "{}") as DashboardSpec;
    expect(published.filters).toEqual([{ field: "region", label: "Region" }]);
    expect(validateDashboard(published)).toEqual([]);
    const page = document.createElement("div");
    document.body.append(page);
    const board = createDashboard(page, published);
    await board.ready;
    await vi.waitFor(() => expect(page.querySelectorAll('.fft-widget[data-state="ready"]')).toHaveLength(2));
    expect(page.querySelectorAll(".fft-message:not([hidden])")).toHaveLength(0);
    expect(page.querySelector(".fft-filters select")).not.toBeNull();
    board.destroy();
  });
});

describe("the composer", () => {
  const examples = {
    Revenue: chart("revenue", { type: "hbar", label: "region", value: "revenue" }, "Revenue"),
    Share: chart("share", { type: "donut", label: "region", value: "revenue" }, "Share"),
    Ranking: chart("ranking", { type: "list", label: "region", value: "revenue" }, "Ranking"),
  };
  const open = () => (composer = createComposer(target, { hash: false, examples, board: { id: "board", title: "Board", columns: 2, widgets: [] } }));
  const names = () => all(".fft-cmp-cards .fft-cmp-card").map((li) => (li.querySelector(".fft-cmp-name") as HTMLElement | HTMLInputElement).textContent || (li.querySelector("input") as HTMLInputElement)?.value);

  test("adds, moves and removes cards with the keyboard, and says each change aloud", () => {
    open();
    for (const name of ["Revenue", "Share", "Ranking"]) (byLabel(`Add ${name} to the dashboard`) as HTMLButtonElement).click();
    expect(names()).toEqual(["Revenue", "Share", "Ranking"]);
    expect(target.querySelector(".fft-cmp-live")?.textContent).toBe("Ranking added");
    (byLabel("Move up: Ranking") as HTMLButtonElement).click();
    expect(names()).toEqual(["Revenue", "Ranking", "Share"]);
    expect(target.querySelector(".fft-cmp-live")?.textContent).toBe("Ranking moved to place 2");
    // The keyboard stays on the card that moved.
    expect(document.activeElement?.closest(".fft-cmp-card")?.getAttribute("data-index")).toBe("1");
    expect((byLabel("Move up: Revenue") as HTMLButtonElement).disabled).toBe(true);
    (byLabel("Remove: Share") as HTMLButtonElement).click();
    expect(names()).toEqual(["Revenue", "Ranking"]);
    expect(target.querySelector(".fft-cmp-live")?.textContent).toBe("Share removed");
  });

  test("drags a chart from the tray onto the board, and a card onto another to reorder", () => {
    open();
    const trayItems = all(".fft-cmp-tray .fft-cmp-item");
    const list = target.querySelector(".fft-cmp-cards") as HTMLElement;
    fire(trayItems[0] as HTMLElement, "dragstart");
    fire(list, "dragover");
    fire(list, "drop");
    fire(all(".fft-cmp-tray .fft-cmp-item")[1] as HTMLElement, "dragstart");
    fire(target.querySelector(".fft-cmp-cards") as HTMLElement, "drop");
    expect(names()).toEqual(["Revenue", "Share"]);
    // Drop Share onto Revenue: it goes before it.
    const cards = all(".fft-cmp-card");
    fire(cards[1] as HTMLElement, "dragstart");
    fire(cards[0] as HTMLElement, "dragover");
    fire(cards[0] as HTMLElement, "drop");
    expect(names()).toEqual(["Share", "Revenue"]);
    // A chart dropped on a card lands before it.
    fire(all(".fft-cmp-tray .fft-cmp-item")[2] as HTMLElement, "dragstart");
    fire(all(".fft-cmp-card")[1] as HTMLElement, "drop");
    expect(names()).toEqual(["Share", "Ranking", "Revenue"]);
  });

  test("widths, columns, sections and the board's name; undo steps back", () => {
    open();
    composer?.add(examples.Revenue);
    composer?.add(examples.Share);
    const span = byLabel("Width: Revenue") as HTMLSelectElement;
    expect([...span.options].map((o) => o.value)).toEqual(["1", "2"]);
    span.value = "2";
    fire(span, "change");
    expect(composer?.spec.widgets[0]?.span).toBe(2);
    // Fewer columns clamp the widths that no longer fit.
    composer?.setColumns(1);
    expect(composer?.spec.widgets[0]?.span).toBe(1);
    composer?.addSection("Detail", 1);
    expect(composer?.spec.widgets.map((c) => c.section ?? c.spec?.title)).toEqual(["Revenue", "Detail", "Share"]);
    composer?.setMeta({ title: "Sales review", subtitle: "Q1" });
    expect([composer?.spec.title, composer?.spec.subtitle, composer?.spec.id]).toEqual(["Sales review", "Q1", "sales-review"]);
    expect(composer?.undo()).toBe(true);
    expect(composer?.spec.title).toBe("Board");
    // Cmd/Ctrl+Z undoes too, unless the keyboard is in a field.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true }));
    expect(composer?.spec.widgets).toHaveLength(2);
    expect(validateDashboard(composer?.spec)).toEqual([]);
  });

  test("filters are offered from the fields two cards share, each with its reach", async () => {
    open();
    composer?.add(examples.Revenue);
    expect(await composer?.filterChoices()).toEqual([]);
    composer?.add(examples.Share);
    composer?.add({ id: "other", title: "Other", data: { type: "inline", rows: [{ team: "Ops", hours: 3 }, { team: "Sales", hours: 5 }] }, view: { type: "hbar", label: "team", value: "hours" } });
    await vi.waitFor(() => expect(all(".fft-cmp-filter")).toHaveLength(1));
    expect(target.querySelector(".fft-cmp-filter")?.textContent).toBe("Regionreaches 2 of 3 cards");
    const box = target.querySelector<HTMLInputElement>('.fft-cmp-filter input[data-field="region"]') as HTMLInputElement;
    box.checked = true;
    fire(box, "change");
    expect(composer?.spec.filters).toEqual([{ field: "region", label: "Region" }]);
  });

  test("draws the board live beside the layout, every card ready", async () => {
    open();
    composer?.add(examples.Revenue);
    composer?.add(examples.Share);
    await composer?.ready;
    await vi.waitFor(() => expect(all('.fft-cmp-preview .fft-widget[data-state="ready"]')).toHaveLength(2));
    expect(all(".fft-cmp-preview .fft-message:not([hidden])")).toHaveLength(0);
  });

  test("publish gives the JSON, an embed with no build step, and an address that opens the board as a page", () => {
    open();
    composer?.add(examples.Revenue);
    const json = JSON.parse(target.querySelector('[data-code="json"]')?.textContent ?? "{}") as DashboardSpec;
    expect(json.widgets[0]?.spec?.id).toBe("revenue");
    expect(target.querySelector('[data-code="embed"]')?.textContent).toContain("MartCharts.createDashboard(");
    const page = all<HTMLAnchorElement>("a").find((a) => a.textContent === "Open as page") as HTMLAnchorElement;
    const opened = boardFromHash(page.getAttribute("href") ?? "");
    expect([opened.view, opened.spec?.widgets.length]).toEqual([true, 1]);
  });

  test("the address carries the board: written on every change, read back on opening", () => {
    composer = createComposer(target, { hash: true, examples });
    composer.add(examples.Revenue);
    composer.setMeta({ title: "Shared" });
    const read = boardFromHash(location.hash);
    expect([read.spec?.title, read.spec?.widgets.length]).toEqual(["Shared", 1]);
    composer.destroy();
    composer = createComposer(target, { hash: true });
    expect([composer.spec.title, composer.spec.widgets.length]).toEqual(["Shared", 1]);
  });

  test("every change is kept in the store, so the board is there next time", () => {
    open();
    composer?.add(examples.Revenue);
    const boards = JSON.parse(localStorage.getItem(BOARDS_KEY) ?? "[]") as { id: string; spec: DashboardSpec }[];
    expect(boards.map((b) => [b.id, b.spec.widgets.length])).toEqual([["board", 1]]);
  });

  test("speaks the page's language", () => {
    document.documentElement.lang = "fr";
    composer = createComposer(target, { hash: false, examples });
    expect(target.textContent).toContain("Ajouter une rubrique");
    expect(byLabel("Ajouter Revenue au tableau de bord")).toBeDefined();
    document.documentElement.lang = "en";
  });
});

describe("helpers", () => {
  test("a board round-trips through an address, accents and all", () => {
    const spec: DashboardSpec = { id: "b", title: "Ventes — Région", columns: 3, widgets: [{ section: "Tête" }, { spec: chart("x", { type: "list", label: "region" }) }] };
    expect(boardFromHash(boardToHash(spec, { view: "1" }))).toEqual({ spec, view: true });
    expect(boardFromHash("#spec=not-base64!")).toEqual({ view: false });
    expect(boardFromHash("#board=sales")).toEqual({ id: "sales", view: false });
  });

  test("the embed can never close its own script early", () => {
    const spec: DashboardSpec = { widgets: [{ section: "</script><b>" }] };
    expect(dashboardEmbed(spec)).not.toContain("</script><b>");
  });

  test("a chart added to a board inlines its spec, and a new board takes its id from its title", async () => {
    const store = localBoardStore();
    const board = await addChartToBoard(store, chart("a", { type: "list", label: "region" }), { title: "Weekly pack" });
    expect([board.id, board.spec.widgets.length, board.spec.widgets[0]?.spec?.id]).toEqual(["weekly-pack", 1, "a"]);
    const again = await addChartToBoard(store, chart("b", { type: "list", label: "region" }), { id: "weekly-pack" });
    expect(again.spec.widgets.map((c) => c.spec?.id)).toEqual(["a", "b"]);
  });
});
