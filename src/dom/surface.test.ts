// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { canonicalName } from "../core/aliases.ts";
import { getBlock } from "../core/registry.ts";
import type { WidgetSpec } from "../core/types.ts";
import { createComposer } from "./composer.ts";
import type { Composer } from "./composer.ts";
import { createEditor } from "./editor.ts";
import type { Editor } from "./editor.ts";
import "./views/index.ts";

/**
 * The builder's surface: the common in view, the rest a click away. Refine shows a view's data fields and at most three
 * common toggles; Annotate its title, subtitle, notes and source; Publish one embed; the composer its preview before
 * the JSON, which is folded.
 */
let target: HTMLElement;
let editor: Editor | undefined;
let composer: Composer | undefined;
beforeEach(() => {
  editor?.destroy();
  composer?.destroy();
  editor = composer = undefined;
  document.body.innerHTML = "";
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState(null, "", "#");
  target = document.createElement("div");
  document.body.append(target);
});

const CONTROLS = "button, input, select, textarea, summary";
/** A control is in view unless a closed disclosure holds it (its own summary stays in view). */
function hidden(node: Element): boolean {
  for (let box = node.closest("details:not([open])"); box; box = box.parentElement?.closest("details:not([open])") ?? null) {
    if (!(node.tagName === "SUMMARY" && node.parentElement === box)) return true;
  }
  return false;
}
const inView = (root: Element) => [...root.querySelectorAll(CONTROLS)].filter((node) => !hidden(node));
const catalog = (type: string) => JSON.parse(readFileSync(`catalog/${type}.json`, "utf8")) as WidgetSpec;
const pane = () => target.querySelector("[role=tabpanel]") as HTMLElement;
function open(spec: WidgetSpec, tab: number): Editor {
  editor = createEditor(target, { hash: false });
  editor.setSpec(spec);
  editor.go(3);
  (target.querySelectorAll(".fft-ed-tab")[tab] as HTMLButtonElement).click();
  return editor;
}

describe("Refine: the common in view, the rest under More options", () => {
  /** Inputs in view before More options, per view: measured at 88, 103, 97, 69, 93, 69, 66 and 109 before. */
  const BUDGET: Record<string, number> = { bar: 20, line: 20, kpi: 12, scatter: 16, hbar: 16, donut: 16, table: 16, choropleth: 12 };

  test.each(Object.entries(BUDGET))("%s shows at most %i inputs before More options, and every required option stays in view", (type, budget) => {
    const spec = catalog(type);
    open(spec, 1);
    expect(inView(pane()).length).toBeLessThanOrEqual(budget);
    const required = Object.entries(getBlock("view", type).options).filter(([, o]) => o.required).map(([name]) => canonicalName(type, name));
    for (const name of required) {
      const control = pane().querySelector(`[data-option="${name}"]`);
      expect([type, name, control !== null && !hidden(control)]).toEqual([type, name, true]);
    }
  });

  test("More options holds the rest, opens on a click, and stays open across repaints and visits", () => {
    open(catalog("bar"), 1);
    const more = pane().querySelector('details[data-disclosure="refine"]') as HTMLDetailsElement;
    expect(more.open).toBe(false);
    const before = inView(pane()).length;
    const folded = [...more.querySelectorAll("[data-option]")].map((node) => (node as HTMLElement).dataset.option);
    expect(folded.length).toBeGreaterThan(0);
    more.open = true;
    more.dispatchEvent(new Event("toggle"));
    expect(inView(pane()).length).toBeGreaterThan(before);
    // Another tab and back: still open; a new editor in this browser: still open.
    (target.querySelectorAll(".fft-ed-tab")[2] as HTMLButtonElement).click();
    (target.querySelectorAll(".fft-ed-tab")[1] as HTMLButtonElement).click();
    expect((pane().querySelector('details[data-disclosure="refine"]') as HTMLDetailsElement).open).toBe(true);
    editor?.destroy();
    target.replaceChildren();
    open(catalog("bar"), 1);
    expect((pane().querySelector('details[data-disclosure="refine"]') as HTMLDetailsElement).open).toBe(true);
  });

  test("an option's description is one line in view, the whole text on demand and for screen readers", () => {
    open(catalog("bar"), 1);
    const hint = pane().querySelector(".fft-ed-hint-line") as HTMLElement;
    expect(hint.title).toBe(hint.textContent);
    hint.click();
    expect(hint.hasAttribute("data-open")).toBe(true);
  });

  test("style folds under its own disclosure", () => {
    open(catalog("bar"), 1);
    const style = pane().querySelector('details[data-disclosure="style"]') as HTMLDetailsElement;
    expect(style.open).toBe(false);
    expect(style.querySelector(".fft-picker")).not.toBeNull();
  });
});

describe("Annotate: title, subtitle, notes and source in view", () => {
  test("the rest (tooltip, byline, headline, references, notes on the chart) wait under More options", () => {
    open(catalog("bar"), 2);
    const labels = (nodes: Element[]) => nodes.map((node) => node.closest(".fft-ed-field")?.querySelector(".fft-ed-field-label")?.textContent).filter(Boolean);
    const shown = new Set(labels(inView(pane())));
    // The subtitle's field is labelled Description in the editor.
    for (const label of ["Title", "Description", "Notes", "Source"]) expect([label, [...shown].some((s) => s?.startsWith(label))]).toEqual([label, true]);
    const more = pane().querySelector('details[data-disclosure="annotate"]') as HTMLDetailsElement;
    const folded = new Set(labels([...more.querySelectorAll(CONTROLS)]));
    for (const label of ["Tooltip", "Byline"]) expect([label, [...folded].some((s) => s?.startsWith(label))]).toEqual([label, true]);
    expect(inView(pane()).length).toBeLessThanOrEqual(7);
  });
});

describe("Publish: one embed in view, one Save", () => {
  test("the iframe embed is the one code in view; the others and the spec are folded", async () => {
    editor = createEditor(target, { hash: false });
    editor.setSpec({ ...catalog("hbar"), id: "ranking", title: "Ranking" });
    editor.go(4);
    const codes = [...target.querySelectorAll(".fft-ed-pre")];
    const shown = codes.filter((pre) => !hidden(pre));
    expect(shown.map((pre) => pre.textContent?.slice(0, 7))).toEqual(["<iframe"]);
    expect(codes.length).toBe(5);
    expect(target.querySelector('details[data-disclosure="embeds"]')).not.toBeNull();
    expect(target.querySelector('details[data-disclosure="spec"]')).not.toBeNull();
    // One Save, whose destination is My charts, a dashboard, or a new one.
    const saves = [...target.querySelectorAll(".fft-ed-addboard button")].filter((b) => b.textContent === "Save");
    expect(saves).toHaveLength(1);
    const where = target.querySelector("select[aria-label='Save to']") as HTMLSelectElement;
    expect([...where.options].map((o) => o.textContent)).toEqual(["My charts, in this browser", "A new dashboard"]);
  });
});

describe("the composer: the dashboard first, the JSON folded", () => {
  /** Two rows; each extra field takes two values, so a filter on it means something. */
  const share = (title: string, extra: string[]) =>
    ({
      id: title.toLowerCase(),
      title,
      data: {
        type: "inline",
        rows: [
          { region: "North", revenue: 1, ...Object.fromEntries(extra.map((f) => [f, `${f}1`])) },
          { region: "South", revenue: 2, ...Object.fromEntries(extra.map((f) => [f, `${f}2`])) },
        ],
      },
      view: { type: "hbar", label: "region", value: "revenue" },
    }) as WidgetSpec;

  test("the preview comes before Publish, and the board JSON is folded under Publish", async () => {
    composer = createComposer(target, { hash: false, board: { id: "b", title: "B", columns: 2, widgets: [{ spec: share("One", []) }, { spec: share("Two", []) }] } });
    await composer.ready;
    const order = [...target.querySelectorAll(".fft-cmp-preview, .fft-cmp-publish")].map((node) => node.className);
    expect(order).toEqual(["fft-cmp-preview", "fft-cmp-publish"]);
    const json = target.querySelector('[data-code="json"]') as HTMLElement;
    expect(hidden(json)).toBe(true);
    // The board panel no longer carries the JSON: the cards and filters only.
    expect(target.querySelector(".fft-cmp-board [data-code]")).toBeNull();
    // Wide screens put the preview beside the card list.
    const css = [...document.querySelectorAll("style")].map((s) => s.textContent).join("\n");
    expect(css).toMatch(/min-width: 960px\) \{ \.fft-composer \{[^}]*"tray board preview"/);
  });

  test("filters show the five with the widest reach, and Show all reveals the rest", async () => {
    const fields = ["a", "b", "c", "d", "e", "f", "g"];
    composer = createComposer(target, { hash: false, board: { id: "b", title: "B", columns: 2, widgets: [{ spec: share("One", fields) }, { spec: share("Two", fields) }] } });
    await composer.ready;
    await vi.waitFor(() => expect(target.querySelectorAll(".fft-cmp-filter").length).toBe(5));
    const more = target.querySelector('.fft-cmp-filters button[data-filters="all"]') as HTMLButtonElement;
    expect(more.textContent).toBe("Show all fields (3 more)");
    more.click();
    await vi.waitFor(() => expect(target.querySelectorAll(".fft-cmp-filter").length).toBe(8));
    expect(target.querySelector('.fft-cmp-filters button[data-filters="fewer"]')?.textContent).toBe("Show fewer");
  });
});
