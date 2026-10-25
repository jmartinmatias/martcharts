// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Row, WidgetSpec } from "../core/types.ts";
import { validateSpec } from "../core/validate.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
});

const rows: Row[] = [
  { region: "North", revenue: 1200 },
  { region: "South", revenue: 900 },
];
const base = { locale: "en-US", data: { type: "inline", rows }, view: { type: "hbar", label: "region", value: "revenue" } } as const;

async function draw(extra: Partial<WidgetSpec>, options?: Parameters<typeof createWidget>[2]) {
  target.replaceChildren();
  const widget = createWidget(target, { ...base, ...extra } as WidgetSpec, options);
  await widget.ready;
  return widget;
}
const credit = () => target.querySelector(".fft-credit") as HTMLElement;

describe("the credit line: source and byline", () => {
  test("says where the data came from and who made the chart, the source a link that opens safely in a new tab", async () => {
    await draw({ footer: "Booked revenue", source: { name: "Eurostat", url: "https://ec.europa.eu/eurostat" }, byline: "Marta" });
    expect(credit().textContent).toBe("Source: Eurostat · Chart: Marta");
    const link = credit().querySelector("a") as HTMLAnchorElement;
    expect([link.textContent, link.getAttribute("href"), link.target, link.rel, link.className]).toEqual(["Eurostat", "https://ec.europa.eu/eurostat", "_blank", "noopener noreferrer", "fft-credit-link"]);
    // The footer keeps its own line above the credit, both in the small print.
    expect([...target.querySelectorAll(".fft-small-print > *")].map((node) => node.className)).toEqual(["fft-footer", "fft-credit"]);
  });

  test("a source without an address is plain text, and a byline alone stands by itself", async () => {
    await draw({ source: { name: "Finance ledger" } });
    expect([credit().textContent, credit().querySelector("a")]).toEqual(["Source: Finance ledger", null]);
    await draw({ byline: "Revenue operations" });
    expect(credit().textContent).toBe("Chart: Revenue operations");
  });

  test("the byline takes the templates titles do, filled from the rows", async () => {
    await draw({ byline: "Finance, from {count} regions" });
    expect(credit().textContent).toBe("Chart: Finance, from 2 regions");
  });

  test("with neither, the credit stays out of the way, and so does the whole bottom row when nothing else is there", async () => {
    await draw({});
    expect([credit().hasAttribute("hidden"), target.querySelector(".fft-small-print")?.hasAttribute("hidden"), target.querySelector(".fft-base")?.hasAttribute("hidden")]).toEqual([true, true, true]);
    await draw({ footer: "Note" });
    expect([credit().hasAttribute("hidden"), target.querySelector(".fft-small-print")?.hasAttribute("hidden"), target.querySelector(".fft-base")?.hasAttribute("hidden")]).toEqual([true, false, false]);
  });

  test("an update redraws the credit, text only, never markup", async () => {
    const widget = await draw({ source: { name: "<b>Eurostat</b>" } });
    expect([credit().textContent, credit().querySelector("b")]).toEqual(["Source: <b>Eurostat</b>", null]);
    widget.update({ source: null as unknown as undefined, byline: "Marta" });
    await widget.ready;
    expect(credit().textContent).toBe("Chart: Marta");
  });

  test("the expanded view carries the credit too", async () => {
    await draw({ source: { name: "Eurostat" } }, { actions: ["expand"] });
    (target.querySelector('.fft-action[data-action="expand"]') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
    await vi.waitFor(() => expect(document.querySelectorAll(".fft-credit").length).toBe(2));
    expect([...document.querySelectorAll(".fft-credit")].map((node) => node.textContent)).toEqual(["Source: Eurostat", "Source: Eurostat"]);
  });
});

describe("validating the credit", () => {
  const issues = (extra: Record<string, unknown>) => validateSpec({ ...base, ...extra }, rows).map((issue) => `${issue.level} ${issue.path}: ${issue.message}`);

  test("a source needs a name, its address must be a web address, and a byline is text", () => {
    expect(issues({ source: { name: "Eurostat", url: "https://ec.europa.eu/eurostat" }, byline: "Marta" })).toEqual([]);
    expect(issues({ source: "Eurostat" })).toEqual(['error source: Must be an object such as { "name": "Eurostat", "url": "https://ec.europa.eu/eurostat" }.']);
    expect(issues({ source: { url: "https://x.example" } })).toEqual(['error source.name: Must name the publisher, for example "Eurostat".']);
    expect(issues({ source: { name: "Eurostat", url: "javascript:alert(1)" } })).toEqual(["error source.url: Must be a web address, for example https://ec.europa.eu/eurostat."]);
    expect(issues({ source: { name: "Eurostat", link: "x" } })).toEqual(["warning source.link: Unknown key. A source has a name and an optional url."]);
    expect(issues({ byline: 3 })).toEqual(['error byline: Must be text naming who made the chart, for example "Marta".']);
  });

  test("a byline template naming a missing field is warned about like a footer's", () => {
    expect(issues({ byline: "{sum:profit}" })).toEqual(["warning byline: {sum:profit} names a field not in the data. Fields: region, revenue."]);
  });
});
