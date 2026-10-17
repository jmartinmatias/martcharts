import { describe, expect, test } from "vitest";
import { computeHeadline } from "./headline.ts";

const months = [
  { m: "Jul", revenue: 100, target: 90 },
  { m: "Aug", revenue: 120, target: 110 },
  { m: "Sep", revenue: 150, target: 160 },
];

describe("computeHeadline", () => {
  test("last is the default, and previous compares with the row before", () => {
    expect(computeHeadline({ value: "revenue", compare: "previous" }, months)).toEqual({ value: 150, before: 120 });
  });

  test("first reads the first row", () => {
    expect(computeHeadline({ value: "revenue", agg: "first" }, months)).toEqual({ value: 100, before: null });
  });

  test("sum, avg, min and max summarize every row", () => {
    expect(["sum", "avg", "min", "max"].map((agg) => computeHeadline({ value: "revenue", agg: agg as "sum" }, months).value)).toEqual([370, 370 / 3, 100, 150]);
  });

  test("a compare field is summarized the same way as the value", () => {
    expect(computeHeadline({ value: "revenue", agg: "sum", compare: "target" }, months)).toEqual({ value: 370, before: 360 });
    expect(computeHeadline({ value: "revenue", compare: "target" }, months)).toEqual({ value: 150, before: 160 });
  });

  test("previous with one row, or values that are not numbers, give null", () => {
    expect(computeHeadline({ value: "revenue", compare: "previous" }, months.slice(0, 1))).toEqual({ value: 100, before: null });
    expect(computeHeadline({ value: "m" }, months)).toEqual({ value: null, before: null });
  });
});
