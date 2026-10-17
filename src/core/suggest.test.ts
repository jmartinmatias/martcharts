import { describe, expect, test } from "vitest";
import { describeBlocks } from "./registry.ts";
import { suggestView } from "./suggest.ts";
import "./index.ts";

describe("suggestView", () => {
  test("flows get their two category fields as source and target, and the number as value", () => {
    expect(suggestView("sankey", [{ from: "Search", to: "Pricing", visits: 120 }])).toEqual({ type: "sankey", source: "from", target: "to", value: "visits" });
  });

  test("a calendar takes the date field for its days", () => {
    expect(suggestView("calendar", [{ orders: 3, day: "2026-04-01" }])).toEqual({ type: "calendar", date: "day", value: "orders" });
  });

  test("a bump chart takes the date for its periods and the text field for its series", () => {
    expect(suggestView("bump", [{ product: "Platform", month: "2026-04", revenue: 1 }])).toEqual({ type: "bump", x: "month", series: "product", value: "revenue" });
  });

  test("a line takes the date for x and up to two number fields as series", () => {
    expect(suggestView("line", [{ month: "2026-04", revenue: 1, cost: 2, margin: 3 }])).toEqual({ type: "line", x: "month", y: ["revenue", "cost"] });
  });

  test("before and after get two different number fields", () => {
    expect(suggestView("dumbbell", [{ region: "East", last: 1, now: 2 }])).toEqual({ type: "dumbbell", label: "region", from: "last", to: "now" });
  });

  test("a heatmap gets two different categories for its columns and rows", () => {
    expect(suggestView("heatmap", [{ day: "Mon", hour: "9am", tickets: 4 }])).toEqual({ type: "heatmap", x: "day", y: "hour", value: "tickets" });
  });

  test("without a date field, a date option falls back to a category", () => {
    expect(suggestView("line", [{ quarter: "Q1", revenue: 1 }])).toEqual({ type: "line", x: "quarter", y: "revenue" });
  });

  test("lists and objects are never picked, since no option can draw them", () => {
    expect(suggestView("hbar", [{ trend: [1, 2], meta: { a: 1 }, region: "East", total: 3 }])).toEqual({ type: "hbar", label: "region", value: "total" });
  });

  test("a stat row gets one tile per number field, up to three", () => {
    expect(suggestView("kpis", [{ region: "East", revenue: 1, cost: 2, margin: 3, churn: 4 }])).toEqual({ type: "kpis", items: [{ value: "revenue" }, { value: "cost" }, { value: "margin" }] });
  });

  test("every field option of every built-in view says what kind of field it expects", () => {
    const missing = describeBlocks("view").flatMap((block) =>
      Object.entries(block.options)
        .filter(([name, option]) => (option.type === "field" || option.type === "fields") && !option.kind && !(block.type === "table" && name === "columns"))
        .map(([name]) => `${block.type}.${name}`),
    );
    expect(missing).toEqual([]);
  });
});
