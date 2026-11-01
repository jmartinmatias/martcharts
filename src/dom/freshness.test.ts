// @vitest-environment jsdom
/**
 * How fresh the data is, always in view: the board says where its data runs to, and a card whose rows end in an
 * earlier month says its own date quietly on its credit line. Dates come from the rows or the spec, never the clock.
 */
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { asOfMonth, cardAsOfText, latestIn } from "../core/as-of.ts";
import type { WidgetSpec } from "../core/types.ts";
import { validateSpec } from "../core/validate.ts";
import { createDashboard } from "./dashboard.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

const months = (last: number) => Array.from({ length: last }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, "0")}`, v: i + 1 }));
const widgets: Record<string, WidgetSpec> = {
  current: { title: "Revenue", source: { name: "Ledger" }, data: { type: "inline", rows: months(9) }, view: { type: "line", x: "month", y: "v" } },
  survey: { title: "Satisfaction", source: { name: "Ledger" }, data: { type: "inline", rows: months(8) }, view: { type: "line", x: "month", y: "v" } },
  owned: { title: "Own words", asOf: "Quarterly close", data: { type: "inline", rows: months(6) }, view: { type: "line", x: "month", y: "v" } },
  regions: { title: "Regions", data: { type: "inline", rows: [{ region: "North", v: 1 }] }, view: { type: "bar", x: "region", y: "v" } },
};

let target: HTMLElement;
beforeEach(() => {
  target = document.createElement("div");
  document.body.append(target);
});
afterEach(() => document.body.replaceChildren());
const credit = (id: string) => target.querySelector(`.fft-cell-slot[data-widget="${id}"] .fft-credit`);

describe("the words", () => {
  test("a card's date is where its rows end; French says a day and a month apart", () => {
    expect(cardAsOfText("2026-08", "en-GB")).toBe("Data to August 2026");
    expect(cardAsOfText("2026-08-31", "en-GB")).toBe("Data to 31 Aug 2026");
    expect(cardAsOfText("2026-08-31", "fr-FR")).toMatch(/^Données au 31 août 2026$/);
    expect(cardAsOfText("2026-08", "fr-FR")).toBe("Données à fin août 2026");
    expect(cardAsOfText("2026-08", "de-DE")).toBe("Daten bis August 2026");
    expect(cardAsOfText("Weekly close")).toBe("Weekly close");
  });

  test("the board's month comes from its words, else from the latest date drawn", () => {
    expect([asOfMonth("2026-10-25", ""), asOfMonth("Data to October 2026", "2026-09-30"), asOfMonth("Data to {latest}", "2026-09-30"), asOfMonth(undefined, "")]).toEqual(["2026-10", "2026-10", "2026-09", ""]);
  });

  test("the latest date leaves forecast rows out", () => {
    const rows = [{ m: "2026-08" }, { m: "2026-09" }, { m: "2026-12", f: true }];
    expect(latestIn(rows, "m", (row) => row.f === true)).toBe("2026-09");
    expect(latestIn([{ m: "North" }], "m")).toBe("");
  });

  test("asOf is a known field, and must be words", () => {
    const spec = { ...widgets.current, asOf: "2026-08-31" } as WidgetSpec;
    expect(validateSpec(spec).filter((issue) => issue.path === "asOf" || /asOf/.test(issue.message))).toEqual([]);
    expect(validateSpec({ ...spec, asOf: 3 } as unknown as WidgetSpec).some((issue) => issue.path === "asOf")).toBe(true);
  });
});

describe("on a board", () => {
  test("the card that ends a month early says so; the card that is current and the card with no dates stay quiet", async () => {
    const board = createDashboard(target, { asOf: "Data to September 2026", widgets: [{ widget: "current" }, { widget: "survey" }, { widget: "regions" }, { widget: "owned" }] }, { widgets, locale: "en-GB" });
    await board.ready;
    expect(credit("current")?.textContent).toBe("Source: Ledger");
    expect(credit("survey")?.textContent).toBe("Source: Ledger · Data to August 2026");
    expect(target.querySelector('.fft-cell-slot[data-widget="regions"] .fft-credit-asof')).toBeNull();
    // A card that names its own words keeps them.
    expect(credit("owned")?.textContent).toBe("Quarterly close");
  });

  test("with no as-of words, the newest card sets the month", async () => {
    const board = createDashboard(target, { widgets: [{ widget: "current" }, { widget: "survey" }] }, { widgets, locale: "en-GB" });
    await board.ready;
    expect(credit("survey")?.textContent).toBe("Source: Ledger · Data to August 2026");
  });
});

test("a card on its own says its asOf after its source and byline", async () => {
  await createWidget(target, { ...widgets.survey, byline: "Sales office", asOf: "2026-08-31", locale: "en-GB" } as WidgetSpec).ready;
  expect(target.querySelector(".fft-credit")?.textContent).toBe("Source: Ledger · Chart: Sales office · Data to 31 Aug 2026");
});
