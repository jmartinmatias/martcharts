import { describe, expect, test } from "vitest";
import { explainVariant } from "./taller-explain.ts";
import type { WidgetSpec } from "./types.ts";

const base: Omit<WidgetSpec, "view"> = { data: { type: "inline", rows: [] }, fields: { revenue: { label: "Revenue" }, region: { label: "Region" } } };

describe("explainVariant", () => {
  test("names the chart and what each mark is, with the field labels", () => {
    expect(explainVariant({ ...base, view: { type: "hbar", label: "region", value: "revenue", mark: "lollipop" } }, "Revenue by region")).toEqual({
      title: "Revenue by region as lollipops: each dot is one region",
      explain: "A dot further right means more revenue.",
    });
  });

  test("says what darker, bigger or higher means for each form", () => {
    expect(explainVariant({ ...base, view: { type: "heatmap", x: "product", y: "region", value: "revenue" } }, "Sales").explain).toBe("A darker cell means more revenue.");
    expect(explainVariant({ ...base, view: { type: "donut", label: "region", value: "revenue" } }, "Sales").explain).toBe("A bigger slice is a bigger share of all the revenue.");
    expect(explainVariant({ ...base, view: { type: "scatter", x: "revenue", y: "cost" } }, "Sales").title).toBe("Sales as a scatter: each dot is one item");
  });

  test("adds what the extras mean, at most two sentences", () => {
    const { explain } = explainVariant({ ...base, headline: { value: "revenue" }, view: { type: "bar", x: "region", y: "revenue", highlight: "East" } }, "Sales");
    expect(explain).toBe("A taller bar means more revenue. One item is in color and the rest are grey, so it stands out.");
  });

  test("small multiples say there is one chart per value", () => {
    expect(explainVariant({ ...base, facet: { field: "region" }, view: { type: "bar", x: "product", y: "revenue" } }, "Sales").title).toBe("Sales as bars per region: each bar is one product");
  });
});
