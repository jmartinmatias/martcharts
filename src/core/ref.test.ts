import { readdirSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { WIDGET_REF, widgetRef } from "./ref.ts";

describe("widgetRef", () => {
  test("a ref is W- and four characters that read aloud cleanly, the same every time", () => {
    const ref = widgetRef("revenue-kpi");
    expect(ref).toMatch(/^W-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(widgetRef("revenue-kpi")).toBe(ref);
    expect(widgetRef("revenue-kpis")).not.toBe(ref);
  });

  test("refs are matched in any case", () => {
    const ref = widgetRef("revenue-kpi");
    expect([WIDGET_REF.test(ref), WIDGET_REF.test(ref.toLowerCase()), WIDGET_REF.test("W-ILOU"), WIDGET_REF.test("revenue-kpi")]).toEqual([true, true, false, false]);
  });

  test("every stored widget has its own ref", () => {
    const ids = readdirSync("widgets")
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -".json".length));
    expect(ids.length).toBeGreaterThan(40);
    expect(new Set(ids.map(widgetRef)).size).toBe(ids.length);
  });
});
