// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { registerView } from "../core/registry.ts";
import type { WidgetSpec } from "../core/types.ts";
import type { ViewContext } from "../core/view-context.ts";
import { ACTION_LABELS, cardToSvg } from "./export.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

registerView({ type: "test-words", description: "Text only", options: {}, render: (ctx: ViewContext) => void (ctx.el.textContent = "just words") });

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
});
afterEach(() => vi.restoreAllMocks());

const hbar: WidgetSpec = {
  id: "leads-by-channel",
  title: "Leads and wins by channel",
  subtitle: "Q3 2026",
  footer: "Wins are signed contracts",
  source: { name: "CRM", url: "https://example.com/crm" },
  byline: "Revenue operations",
  locale: "en-US",
  data: { type: "inline", rows: [{ channel: "Search", leads: 120, won: 30 }, { channel: "Events", leads: 60, won: 21 }] },
  view: { type: "hbar", label: "channel", value: ["leads", "won"] },
} as WidgetSpec;

const map: WidgetSpec = {
  title: "Revenue by country",
  footer: "2026 year to date",
  source: { name: "Finance ledger" },
  locale: "en-US",
  data: { type: "inline", rows: [{ country: "FR", revenue: 120 }, { country: "DE", revenue: 300 }, { country: "LU", revenue: 90 }] },
  view: { type: "choropleth", geo: "europe", id: "country", value: "revenue" },
} as WidgetSpec;

const card = () => target.querySelector(".fft-widget") as HTMLElement;

describe("the whole card as an SVG", () => {
  test("an HTML chart (grouped bars) keeps its title, subtitle, legend, bars' figures, footer and credit", async () => {
    await createWidget(target, hbar, { actions: ["csv", "image", "svg"] }).ready;
    const { markup, width, height } = cardToSvg(card(), "#ffffff");
    expect(markup.startsWith("<svg")).toBe(true);
    expect(markup).toContain("<foreignObject");
    for (const text of ["Leads and wins by channel", "Q3 2026", "Leads", "Won", "Search", "120", "Wins are signed contracts", "CRM", "Revenue operations"]) expect(markup).toContain(text);
    expect([width > 0, height > 0]).toEqual([true, true]);
  });

  test("leaves out the toolbar, the tooltip, the ref and the screen-reader copies", async () => {
    await createWidget(target, hbar, { actions: ["csv", "image", "svg"] }).ready;
    const { markup } = cardToSvg(card(), "#ffffff");
    for (const text of [ACTION_LABELS.csv, ACTION_LABELS.svg, "fft-tooltip", "fft-widget-ref", "fft-sr-only"]) expect(markup).not.toContain(text);
  });

  test("a map card keeps its regions, its legend and its source", async () => {
    await createWidget(target, map).ready;
    const { markup } = cardToSvg(card(), "#ffffff");
    for (const text of ["Revenue by country", "fft-map-region", "No data", "2026 year to date", "Finance ledger"]) expect(markup).toContain(text);
  });

  test("the card sits on the background given, and is titled for the file's readers", async () => {
    await createWidget(target, map).ready;
    const svg = new DOMParser().parseFromString(cardToSvg(card(), "#102030").markup, "image/svg+xml").documentElement;
    expect([svg.querySelector("title")?.textContent, svg.querySelector("rect")?.getAttribute("fill")]).toEqual(["Revenue by country", "#102030"]);
  });

  test("the inline styles carry the look, since the file sees no stylesheet", async () => {
    await createWidget(target, hbar).ready;
    const { markup } = cardToSvg(card(), "#ffffff");
    expect(markup).toMatch(/class="fft-title"[^>]*style="[^"]*font-weight/);
    expect(markup).toContain("animation: none");
  });
});

describe("the svg and image actions", () => {
  test("svg downloads the card as <id>.svg", async () => {
    const created: Blob[] = [];
    Object.assign(URL, { createObjectURL: (blob: Blob) => (created.push(blob), "blob:test"), revokeObjectURL: () => {} });
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    await createWidget(target, hbar, { actions: ["svg"] }).ready;
    target.querySelector<HTMLButtonElement>('.fft-action[data-action="svg"]')?.click();
    await vi.waitFor(() => expect(names).toEqual(["leads-by-channel.svg"]));
    expect(created[0]?.type).toBe("image/svg+xml;charset=utf-8");
    expect(await created[0]?.text()).toContain("Leads and wins by channel");
  });

  test("pictures are offered for HTML charts and maps too, but not for a view that only writes words", async () => {
    const offered = async (spec: WidgetSpec) => {
      target.replaceChildren();
      await createWidget(target, spec, { actions: ["image", "svg"] }).ready;
      return [...target.querySelectorAll<HTMLButtonElement>(".fft-action")].map((button) => !button.hidden);
    };
    expect(await offered(hbar)).toEqual([true, true]);
    expect(await offered(map)).toEqual([true, true]);
    expect(await offered({ ...hbar, view: { type: "test-words" } })).toEqual([false, false]);
  });

  test("the svg action is named for screen readers", async () => {
    await createWidget(target, hbar, { actions: ["svg"] }).ready;
    expect(target.querySelector('.fft-action[data-action="svg"]')?.getAttribute("aria-label")).toBe("Download chart as SVG");
  });
});
