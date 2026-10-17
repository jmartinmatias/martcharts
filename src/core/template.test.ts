import { describe, expect, test } from "vitest";
import { fillTemplate, templateFields } from "./template.ts";
import type { FieldSpec, Row } from "./types.ts";

const rows: Row[] = [
  { month: "2026-07", revenue: 1000 },
  { month: "2026-08", revenue: 1500 },
  { month: "2026-09", revenue: 2000 },
];
const fields: Record<string, FieldSpec> = {
  month: { format: { type: "date", style: "month" } },
  revenue: { format: { type: "currency", currency: "EUR", compact: true } },
};

describe("fillTemplate", () => {
  test("first and last take the first and last row's value, in the field's format", () => {
    expect(fillTemplate("{first:month} to {last:month}", rows, fields, "en-US")).toBe("Jul 2026 to Sep 2026");
  });

  test("count is the number of rows; sum, avg, min and max summarize a field in its format", () => {
    expect(fillTemplate("{count} months, {sum:revenue} in all, {avg:revenue} a month, {min:revenue} to {max:revenue}", rows, fields, "en-US")).toBe(
      "3 months, €4.5K in all, €1.5K a month, €1K to €2K",
    );
  });

  test("text without templates, and unknown words in braces, are left alone", () => {
    expect(fillTemplate("Revenue {soon} by {region}", rows, fields, "en-US")).toBe("Revenue {soon} by {region}");
  });

  test("with no rows, values are empty and the count is zero", () => {
    expect(fillTemplate("{count} rows from {first:month}", [], fields, "en-US")).toBe("0 rows from ");
  });
});

describe("templateFields", () => {
  test("lists the fields a text's templates name", () => {
    expect(templateFields("{first:month} to {last:month}, {sum:revenue}, {count}")).toEqual(["month", "revenue"]);
  });
});
