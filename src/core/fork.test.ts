import { describe, expect, test } from "vitest";
import { fork } from "./fork.ts";

describe("fork", () => {
  test("merges nested objects key by key", () => {
    const base = { view: { type: "bar", x: "month", y: "sales" }, style: { theme: "auto" } };
    const result = fork(base, { view: { y: "profit" } });
    expect(result).toEqual({ view: { type: "bar", x: "month", y: "profit" }, style: { theme: "auto" } });
  });

  test("replaces arrays instead of merging them", () => {
    const base = { transform: [{ type: "sort", field: "a" }, { type: "limit", count: 5 }] };
    const result = fork(base, { transform: [{ type: "limit", count: 3 }] });
    expect(result).toEqual({ transform: [{ type: "limit", count: 3 }] });
  });

  test("null removes a key", () => {
    const base = { title: "Sales", subtitle: "2026", view: { type: "table", columns: ["a"] } };
    const result = fork(base, { subtitle: null, view: { columns: null } });
    expect(result).toEqual({ title: "Sales", view: { type: "table" } });
  });

  test("undefined leaves the base value alone", () => {
    const result = fork({ title: "Sales" }, { title: undefined });
    expect(result).toEqual({ title: "Sales" });
  });

  test("does not mutate the base or the override", () => {
    const base = { view: { type: "bar", y: "sales" } };
    const override = { view: { y: "profit" } };
    fork(base, override);
    expect(base).toEqual({ view: { type: "bar", y: "sales" } });
    expect(override).toEqual({ view: { y: "profit" } });
  });

  test("the result shares no nested objects with the base", () => {
    const base = { style: { tokens: { accent: "red" } } };
    const result = fork(base, {});
    (result.style.tokens as { accent: string }).accent = "blue";
    expect(base.style.tokens.accent).toBe("red");
  });

  test("applies several overrides left to right", () => {
    const result = fork({ a: 1, b: 1 }, { a: 2 }, { a: 3, c: 3 });
    expect(result).toEqual({ a: 3, b: 1, c: 3 });
  });

  test("keeps functions as values", () => {
    const load = () => [];
    const result = fork({ data: { type: "fn" } }, { data: { load } });
    expect((result.data as { load: unknown }).load).toBe(load);
  });
});
