import { describe, expect, test } from "vitest";
import { applyTransforms } from "./pipeline.ts";
import { registerTransform } from "./registry.ts";

const sales = [
  { region: "North", product: "A", revenue: 120, cost: 80 },
  { region: "South", product: "A", revenue: 90, cost: 60 },
  { region: "North", product: "B", revenue: 30, cost: 40 },
  { region: "East", product: "B", revenue: 200, cost: 150 },
];

describe("filter", () => {
  test("== keeps rows whose field equals the value", () => {
    const out = applyTransforms(sales, [{ type: "filter", field: "region", op: "==", value: "North" }]);
    expect(out.map((r) => r.revenue)).toEqual([120, 30]);
  });

  test("op defaults to ==", () => {
    const out = applyTransforms(sales, [{ type: "filter", field: "product", value: "B" }]);
    expect(out.map((r) => r.revenue)).toEqual([30, 200]);
  });

  test("> compares numbers", () => {
    const out = applyTransforms(sales, [{ type: "filter", field: "revenue", op: ">", value: 100 }]);
    expect(out.map((r) => r.revenue)).toEqual([120, 200]);
  });

  test("<= includes the boundary", () => {
    const out = applyTransforms(sales, [{ type: "filter", field: "revenue", op: "<=", value: 90 }]);
    expect(out.map((r) => r.revenue)).toEqual([90, 30]);
  });

  test("!= drops matching rows", () => {
    const out = applyTransforms(sales, [{ type: "filter", field: "region", op: "!=", value: "North" }]);
    expect(out.map((r) => r.region)).toEqual(["South", "East"]);
  });

  test("in keeps rows whose field is one of the values", () => {
    const out = applyTransforms(sales, [{ type: "filter", field: "region", op: "in", value: ["South", "East"] }]);
    expect(out.map((r) => r.region)).toEqual(["South", "East"]);
  });

  test("contains matches a substring, ignoring case", () => {
    const out = applyTransforms(sales, [{ type: "filter", field: "region", op: "contains", value: "or" }]);
    expect(out.map((r) => r.revenue)).toEqual([120, 30]);
  });
});

describe("sort", () => {
  test("sorts numbers ascending by default", () => {
    const out = applyTransforms(sales, [{ type: "sort", field: "revenue" }]);
    expect(out.map((r) => r.revenue)).toEqual([30, 90, 120, 200]);
  });

  test("order desc sorts largest first", () => {
    const out = applyTransforms(sales, [{ type: "sort", field: "revenue", order: "desc" }]);
    expect(out.map((r) => r.revenue)).toEqual([200, 120, 90, 30]);
  });

  test("sorts text alphabetically, ignoring case", () => {
    const rows = [{ n: "banana" }, { n: "Cherry" }, { n: "apple" }];
    const out = applyTransforms(rows, [{ type: "sort", field: "n" }]);
    expect(out.map((r) => r.n)).toEqual(["apple", "banana", "Cherry"]);
  });

  test("puts missing values last in both orders", () => {
    const rows = [{ v: 2 }, { v: null }, { v: 5 }, {}];
    expect(applyTransforms(rows, [{ type: "sort", field: "v" }]).map((r) => r.v)).toEqual([2, 5, null, undefined]);
    expect(applyTransforms(rows, [{ type: "sort", field: "v", order: "desc" }]).map((r) => r.v)).toEqual([5, 2, null, undefined]);
  });

  test("does not reorder the input array", () => {
    const rows = [{ v: 3 }, { v: 1 }];
    applyTransforms(rows, [{ type: "sort", field: "v" }]);
    expect(rows).toEqual([{ v: 3 }, { v: 1 }]);
  });
});

describe("limit", () => {
  test("keeps the first count rows", () => {
    const out = applyTransforms(sales, [{ type: "limit", count: 2 }]);
    expect(out.map((r) => r.revenue)).toEqual([120, 90]);
  });

  test("count 0 keeps nothing", () => {
    expect(applyTransforms(sales, [{ type: "limit", count: 0 }])).toEqual([]);
  });
});

describe("aggregate", () => {
  test("groups by a field and sums, keeping the field name by default", () => {
    const out = applyTransforms(sales, [
      { type: "aggregate", groupBy: "region", measures: [{ op: "sum", field: "revenue" }] },
    ]);
    expect(out).toEqual([
      { region: "North", revenue: 150 },
      { region: "South", revenue: 90 },
      { region: "East", revenue: 200 },
    ]);
  });

  test("count needs no field and is named count by default", () => {
    const out = applyTransforms(sales, [{ type: "aggregate", groupBy: "product", measures: [{ op: "count" }] }]);
    expect(out).toEqual([
      { product: "A", count: 2 },
      { product: "B", count: 2 },
    ]);
  });

  test("without groupBy it collapses everything into one row", () => {
    const out = applyTransforms(sales, [
      {
        type: "aggregate",
        measures: [
          { op: "sum", field: "revenue", as: "total" },
          { op: "avg", field: "revenue", as: "average" },
          { op: "min", field: "cost", as: "lowest" },
          { op: "max", field: "cost", as: "highest" },
        ],
      },
    ]);
    expect(out).toEqual([{ total: 440, average: 110, lowest: 40, highest: 150 }]);
  });

  test("groups by several fields", () => {
    const out = applyTransforms(sales, [
      { type: "aggregate", groupBy: ["region", "product"], measures: [{ op: "sum", field: "cost" }] },
    ]);
    expect(out).toEqual([
      { region: "North", product: "A", cost: 80 },
      { region: "South", product: "A", cost: 60 },
      { region: "North", product: "B", cost: 40 },
      { region: "East", product: "B", cost: 150 },
    ]);
  });

  test("skips values that are not numbers, and avg of nothing is null", () => {
    const rows = [{ v: 4 }, { v: "n/a" }, { v: null }, { v: 6 }];
    const out = applyTransforms(rows, [
      { type: "aggregate", measures: [{ op: "sum", field: "v", as: "s" }, { op: "avg", field: "v", as: "a" }, { op: "avg", field: "missing", as: "none" }] },
    ]);
    expect(out).toEqual([{ s: 10, a: 5, none: null }]);
  });

  test("list gathers each group's values in row order, skipping missing ones", () => {
    const out = applyTransforms(sales, [{ type: "aggregate", groupBy: "region", measures: [{ op: "list", field: "revenue", as: "trend" }] }]);
    expect(out).toEqual([
      { region: "North", trend: [120, 30] },
      { region: "South", trend: [90] },
      { region: "East", trend: [200] },
    ]);
  });

  test("on no rows without groupBy it still returns one row", () => {
    const out = applyTransforms([], [{ type: "aggregate", measures: [{ op: "count" }, { op: "sum", field: "v" }] }]);
    expect(out).toEqual([{ count: 0, v: 0 }]);
  });
});

describe("calc", () => {
  test("divide writes left / right into a new field", () => {
    const out = applyTransforms([{ profit: 30, revenue: 120 }], [
      { type: "calc", as: "margin", op: "divide", left: "profit", right: "revenue" },
    ]);
    expect(out).toEqual([{ profit: 30, revenue: 120, margin: 0.25 }]);
  });

  test("subtract works on two fields", () => {
    const out = applyTransforms([{ revenue: 120, cost: 80 }], [
      { type: "calc", as: "profit", op: "subtract", left: "revenue", right: "cost" },
    ]);
    expect(out[0]?.profit).toBe(40);
  });

  test("a number operand is used as a constant", () => {
    const out = applyTransforms([{ v: 21 }], [{ type: "calc", as: "doubled", op: "multiply", left: "v", right: 2 }]);
    expect(out[0]?.doubled).toBe(42);
  });

  test("add sums two fields", () => {
    const out = applyTransforms([{ a: 2, b: 3 }], [{ type: "calc", as: "c", op: "add", left: "a", right: "b" }]);
    expect(out[0]?.c).toBe(5);
  });

  test("dividing by zero or a missing value gives null", () => {
    const out = applyTransforms([{ a: 5, b: 0 }, { a: 5 }], [{ type: "calc", as: "r", op: "divide", left: "a", right: "b" }]);
    expect(out.map((r) => r.r)).toEqual([null, null]);
  });

  test("does not modify the input rows", () => {
    const rows = [{ a: 1, b: 2 }];
    applyTransforms(rows, [{ type: "calc", as: "c", op: "add", left: "a", right: "b" }]);
    expect(rows).toEqual([{ a: 1, b: 2 }]);
  });
});

describe("pivot", () => {
  test("spreads one field's values into columns, one row per key, summing duplicates", () => {
    const out = applyTransforms(sales, [{ type: "pivot", row: "region", column: "product", value: "revenue" }]);
    expect(out).toEqual([
      { region: "North", A: 120, B: 30 },
      { region: "South", A: 90 },
      { region: "East", B: 200 },
    ]);
  });

  test("fill puts a value in empty cells, and op picks the summary", () => {
    const rows = [
      { k: "x", c: "p", v: 2 },
      { k: "x", c: "p", v: 6 },
      { k: "y", c: "q", v: 1 },
    ];
    expect(applyTransforms(rows, [{ type: "pivot", row: "k", column: "c", value: "v", op: "avg", fill: 0 }])).toEqual([
      { k: "x", p: 4, q: 0 },
      { k: "y", p: 0, q: 1 },
    ]);
  });
});

describe("transform plumbing", () => {
  test("steps run in order", () => {
    const out = applyTransforms(sales, [
      { type: "sort", field: "revenue", order: "desc" },
      { type: "limit", count: 1 },
    ]);
    expect(out).toEqual([{ region: "East", product: "B", revenue: 200, cost: 150 }]);
  });

  test("an unknown step type throws and names the ones that exist", () => {
    expect(() => applyTransforms(sales, [{ type: "unpivot" }])).toThrow(/^Unknown transform "unpivot"\. Available: .*\bfilter\b.*\bsort\b.*\.$/);
  });

  test("a registered custom transform can be used as a step", () => {
    registerTransform({
      type: "test-upper",
      description: "Upper-cases one field",
      options: { field: { type: "field", required: true, description: "Field to upper-case" } },
      apply: (rows, step) => rows.map((r) => ({ ...r, [step.field as string]: String(r[step.field as string]).toUpperCase() })),
    });
    const out = applyTransforms([{ name: "ada" }], [{ type: "test-upper", field: "name" }]);
    expect(out).toEqual([{ name: "ADA" }]);
  });
});

describe("bin", () => {
  const values = Array.from({ length: 10 }, (_, i) => ({ v: i + 1, name: `r${i}` }));

  test("turns rows into one row per value band, on round edges, with a count", () => {
    expect(applyTransforms(values, [{ type: "bin", field: "v", bins: 5 }])).toEqual([
      { v: 0, vEnd: 2, count: 1 },
      { v: 2, vEnd: 4, count: 2 },
      { v: 4, vEnd: 6, count: 2 },
      { v: 6, vEnd: 8, count: 2 },
      { v: 8, vEnd: 10, count: 3 },
    ]);
  });

  test("as names the count field, and rows without a number are left out", () => {
    const out = applyTransforms([...values, { v: null, name: "x" }], [{ type: "bin", field: "v", bins: 5, as: "deals" }]);
    expect(out.map((row) => row.deals)).toEqual([1, 2, 2, 2, 3]);
  });

  test("bins default to Sturges' rule and nothing in gives nothing out", () => {
    expect(applyTransforms(values, [{ type: "bin", field: "v" }]).reduce((sum, row) => sum + Number(row.count), 0)).toBe(10);
    expect(applyTransforms([], [{ type: "bin", field: "v" }])).toEqual([]);
  });
});
