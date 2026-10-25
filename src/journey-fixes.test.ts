// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { boardHref, cleanHash, HOME_STRIP } from "../demo/routes.ts";
import type { DashboardSpec } from "./core/dashboard.ts";
import type { WidgetSpec } from "./core/types.ts";
import { createWidget } from "./dom/widget.ts";
import "./dom/views/index.ts";

describe("the dashboards page drops a section it no longer has", () => {
  const known = (id: string) => ["gallery-revenue-and-profit", "client-health-rules"].includes(id);
  test("an unknown section goes; the board's own state stays", () => {
    expect(cleanHash("#maps", known)).toBe("");
    expect(cleanHash("#maps&f=%7B%22region%22%3A%22East%22%7D", known)).toBe("#f=%7B%22region%22%3A%22East%22%7D");
  });
  test("a known section, and state alone, are kept as they are", () => {
    expect(cleanHash("#gallery-revenue-and-profit&p=6M", known)).toBe("#gallery-revenue-and-profit&p=6M");
    expect(cleanHash("#cf=%5B%22name%22%5D", known)).toBe("#cf=%5B%22name%22%5D");
    expect(cleanHash("", known)).toBe("");
  });
  test("the page uses it once the board is drawn", () => {
    const page = readFileSync("demo/dashboards.ts", "utf8");
    expect(page).toContain("cleanHash(location.hash");
    expect(page).toMatch(/ready\.then/);
  });
});

describe("Home's live charts lead to their dashboard tab", () => {
  test("every strip chart names a tab the Dashboards page has, and the page links to it", () => {
    const tabs = ["sales", "commercial", "health", "regulatory"];
    for (const item of HOME_STRIP) expect(tabs).toContain(item.board);
    expect(boardHref("commercial")).toBe("./dashboards.html?board=commercial");
    const home = readFileSync("demo/home.ts", "utf8");
    expect(home).toContain("HOME_STRIP");
    expect(home).toContain("link.href = boardHref(board)");
  });
});

describe("the Sales tab folds its later sections", () => {
  test("headline numbers and revenue stay open; customers and operations are folded", () => {
    const board = JSON.parse(readFileSync("dashboards/gallery.json", "utf8")) as DashboardSpec & { widgets: { section?: string; collapsed?: boolean }[] };
    const folded = Object.fromEntries(board.widgets.filter((cell) => cell.section).map((cell) => [cell.section, cell.collapsed === true]));
    expect(folded).toEqual({ "Headline numbers": false, "Revenue and profit": false, "Regions and products": false, "Customers and pipeline": true, "Operations and sentiment": true });
  });
});

describe("the wallet audit panel keeps the card in its row", () => {
  test("the panel has a capped height and scrolls inside; the tools sit outside it", async () => {
    const el = document.createElement("div");
    document.body.append(el);
    const spec: WidgetSpec = {
      locale: "en-US",
      data: { type: "inline", rows: [{ name: "Aster Trust", aum: 1_000_000, shareOfWallet: 0.5 }] },
      view: { type: "xray", label: "name", facts: ["aum"], wallet: "shareOfWallet", audit: { sources: {} } },
    } as WidgetSpec;
    await createWidget(el, spec).ready;
    const panel = el.querySelector(".fft-xray-audit-panel") as HTMLElement;
    expect(panel).not.toBeNull();
    expect([panel.style.maxHeight, panel.style.overflowY]).toEqual(["min(55vh, 520px)", "auto"]);
    expect(panel.tabIndex).toBe(-1);
    // Copy and Download are above the scroll, never inside it.
    const tools = el.querySelector(".fft-xray-audit-tools") as HTMLElement;
    expect(panel.contains(tools)).toBe(false);
    expect([...tools.querySelectorAll("button")].map((b) => b.className.split(" ").pop())).toEqual(["fft-xray-audit-open", "fft-xray-audit-copy", "fft-xray-audit-download"]);
    el.remove();
  });
});
