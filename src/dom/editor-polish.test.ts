// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { WidgetSpec } from "../core/types.ts";
import { liteBundleUrl, localBoardStore } from "./board-store.ts";
import { createComposer, dashboardEmbed } from "./composer.ts";
import type { Composer } from "./composer.ts";
import { createEditor, embedCodes, inferDateFormats } from "./editor.ts";
import type { Editor } from "./editor.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

let target: HTMLElement;
let editor: Editor | undefined;
let composer: Composer | undefined;
beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "";
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState(null, "", "#");
  target = document.createElement("div");
  document.body.append(target);
});
afterEach(() => {
  editor?.destroy();
  composer?.destroy();
  editor = undefined;
  composer = undefined;
  document.documentElement.lang = "";
});

const all = <T extends Element = HTMLElement>(selector: string) => [...target.querySelectorAll<T>(selector)] as T[];
const one = <T extends Element = HTMLElement>(selector: string) => target.querySelector(selector) as T;
const TSV = "region\trevenue\tmonth\nNorth\t1200\t2026-01\nSouth\t900\t2026-02\nEast\t2000\t2026-03";

describe("a widget with no locale speaks the page's language", () => {
  const kpi = (): WidgetSpec => ({
    data: { type: "inline", rows: [{ revenue: 1234.5 }] },
    fields: { revenue: { format: { type: "number", decimals: 1 } } },
    view: { type: "kpi", value: "revenue" },
  });
  const value = () => one(".fft-kpi-value").textContent ?? "";

  test("French page, French numbers", async () => {
    document.documentElement.lang = "fr";
    await createWidget(target, kpi()).ready;
    expect(value()).toMatch(/1\s234,5/);
  });

  test("no page language: English, never the browser's", async () => {
    const browser = vi.spyOn(navigator, "language", "get").mockReturnValue("de-DE");
    await createWidget(target, kpi()).ready;
    expect(value()).toContain("1,234.5");
    browser.mockRestore();
  });

  test("the spec's own locale still wins over the page", async () => {
    document.documentElement.lang = "fr";
    await createWidget(target, { ...kpi(), locale: "en-US" }).ready;
    expect(value()).toContain("1,234.5");
  });
});

describe("month columns", () => {
  test("2026-01 reads as a month, 2026-01-15 as a day, a set format is kept", () => {
    const rows = [
      { month: "2026-01", day: "2026-01-15", kept: "2026-02" },
      { month: "2026-02", day: "2026-02-15", kept: "2026-03" },
    ];
    const dated = inferDateFormats(rows, { kept: { format: { type: "date", style: "year" } } });
    expect(dated.month?.format).toEqual({ type: "date", style: "month" });
    expect(dated.day?.format).toEqual({ type: "date", style: "day" });
    expect(dated.kept).toBeUndefined();
  });

  test("pasted into the editor, a month column gets the month format", () => {
    editor = createEditor(target, { hash: false });
    editor.setData(TSV);
    expect(editor.spec.fields?.month?.format).toEqual({ type: "date", style: "month" });
  });
});

describe("Save proposes a title and keeps it", () => {
  test("the title field is filled from the chart, edited, saved, and the composer lists the chart by it", async () => {
    editor = createEditor(target, { hash: false });
    editor.setData(TSV);
    editor.setSpec({ ...editor.spec, id: "revenue", title: undefined, view: { type: "bar", x: "region", y: "revenue" } });
    editor.go(4);
    const titled = one<HTMLInputElement>(".fft-ed-save-title");
    expect(titled.value).toBe("Revenue by region");
    titled.value = "Revenue across regions";
    (all<HTMLButtonElement>(".fft-ed-primary").find((b) => b.textContent === "Save") as HTMLButtonElement).click();
    await vi.waitFor(() => expect((localBoardStore().charts() as { spec: WidgetSpec }[])[0]?.spec.title).toBe("Revenue across regions"));
    expect(editor.spec.title).toBe("Revenue across regions");
    editor.destroy();
    editor = undefined;
    target.replaceChildren();

    composer = createComposer(target, { hash: false });
    await vi.waitFor(() => expect(all(".fft-cmp-tray .fft-cmp-name").map((n) => n.textContent)).toContain("Revenue across regions"));
  });

  test("an untitled dashboard is offered as Untitled dashboard, not by its id", async () => {
    await localBoardStore().saveBoard({ id: "board-7", spec: { id: "board-7", title: "", columns: 2, widgets: [] }, savedAt: new Date().toISOString() });
    editor = createEditor(target, { hash: false });
    editor.setData(TSV);
    editor.go(4);
    await vi.waitFor(() => {
      const choose = one<HTMLSelectElement>("select[aria-label='Save to']");
      expect([...choose.options].find((o) => o.value === "board-7")?.textContent).toBe("Untitled dashboard");
    });
  });
});

describe("Publish", () => {
  test("the other embeds and the spec start closed, even when the editor remembered them open", async () => {
    localStorage.setItem("martcharts:editor:open", JSON.stringify({ embeds: true, spec: true }));
    editor = createEditor(target, { hash: false });
    editor.setData(TSV);
    editor.go(4);
    await vi.waitFor(() => expect(one("details[data-disclosure='embeds']")).not.toBeNull());
    expect(one<HTMLDetailsElement>("details[data-disclosure='embeds']").open).toBe(false);
    expect(one<HTMLDetailsElement>("details[data-disclosure='spec']").open).toBe(false);
  });

  test("embed snippets load the lite bundle from an absolute address", async () => {
    const lite = liteBundleUrl(document);
    expect(lite).toBe(new URL("dist/martcharts-lite.iife.js", document.baseURI).href);
    expect(lite).toMatch(/^https?:\/\//);
    expect(liteBundleUrl(document, "https://cdn.example/martcharts-lite.iife.js")).toBe("https://cdn.example/martcharts-lite.iife.js");
    expect(embedCodes({ view: { type: "bar" } } as WidgetSpec, "w.json", lite).src).toContain(`<script src="${lite}"></script>`);
    expect(dashboardEmbed({ columns: 2, widgets: [] }, lite)).toContain(`<script src="${lite}"></script>`);

    editor = createEditor(target, { hash: false });
    editor.setData(TSV);
    editor.go(4);
    await vi.waitFor(() => expect(all(".fft-ed-pre").length).toBeGreaterThan(1));
    const scripts = all(".fft-ed-pre").map((pre) => pre.textContent ?? "").filter((code) => code.includes("<fft-widget"));
    expect(scripts.length).toBeGreaterThan(0);
    for (const code of scripts) expect(code).toContain(`<script src="${lite}"></script>`);
  });
});

describe("Composer defaults", () => {
  test("a new board is Untitled dashboard until named", () => {
    composer = createComposer(target, { hash: false });
    const title = all<HTMLInputElement>(".fft-cmp-input").find((input) => input.placeholder === "Untitled dashboard");
    expect(title).toBeTruthy();
    expect(title?.value).toBe("");
  });

  test("its inputs shrink to a phone's width instead of overflowing", () => {
    composer = createComposer(target, { hash: false });
    const css = [...document.querySelectorAll("style")].map((s) => s.textContent ?? "").join("\n");
    expect(css).toMatch(/\.fft-cmp-meta label, \.fft-cmp-field \{[^}]*min-width: 0/);
    expect(css).toMatch(/\.fft-cmp-field \.fft-cmp-input[^{]*\{[^}]*min-width: 0;[^}]*box-sizing: border-box/);
  });
});
