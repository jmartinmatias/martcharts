import { describe, expect, test } from "vitest";
import { runPipeline } from "./pipeline.ts";
import { registerSource } from "./registry.ts";
import { parseCsv } from "./sources.ts";

/** A fetch stand-in that answers every request with `body` and records the URLs asked for. */
function fakeFetch(body: unknown, status = 200) {
  const urls: string[] = [];
  const fetch = (async (input: string | URL | Request) => {
    urls.push(String(input));
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof globalThis.fetch;
  return { fetch, urls };
}

describe("inline source", () => {
  test("returns its rows", async () => {
    const rows = await runPipeline({ data: { type: "inline", rows: [{ a: 1 }, { a: 2 }] } });
    expect(rows).toEqual([{ a: 1 }, { a: 2 }]);
  });
});

describe("fn source", () => {
  test("returns what its load function resolves to", async () => {
    const rows = await runPipeline({ data: { type: "fn", load: async () => [{ a: 1 }] } });
    expect(rows).toEqual([{ a: 1 }]);
  });
});

describe("url source", () => {
  test("fetches the url through the injected fetch and returns the JSON list", async () => {
    const { fetch, urls } = fakeFetch([{ a: 1 }]);
    const rows = await runPipeline({ data: { type: "url", url: "https://example.test/sales.json" } }, { fetch });
    expect(rows).toEqual([{ a: 1 }]);
    expect(urls).toEqual(["https://example.test/sales.json"]);
  });

  test("path picks the list out of a wrapping object", async () => {
    const { fetch } = fakeFetch({ meta: {}, data: { items: [{ a: 1 }] } });
    const rows = await runPipeline({ data: { type: "url", url: "/x.json", path: "data.items" } }, { fetch });
    expect(rows).toEqual([{ a: 1 }]);
  });

  test("an HTTP error says which url failed and the status", async () => {
    const { fetch } = fakeFetch({}, 404);
    await expect(runPipeline({ data: { type: "url", url: "/missing.json" } }, { fetch })).rejects.toThrow(
      "Could not load /missing.json: HTTP 404.",
    );
  });

  test("an object instead of a list says to use path", async () => {
    const { fetch } = fakeFetch({ items: [] });
    await expect(runPipeline({ data: { type: "url", url: "/x.json" } }, { fetch })).rejects.toThrow(
      'Data source "url" returned an object, not a list of rows. Use the "path" option to point at the list, for example "data.items".',
    );
  });

  test("a path that leads nowhere says so", async () => {
    const { fetch } = fakeFetch({ data: {} });
    await expect(runPipeline({ data: { type: "url", url: "/x.json", path: "data.items" } }, { fetch })).rejects.toThrow(
      'Path "data.items" not found in the response from /x.json.',
    );
  });
});

describe("runPipeline", () => {
  test("applies transforms after loading", async () => {
    const rows = await runPipeline({
      data: { type: "inline", rows: [{ v: 1 }, { v: 3 }, { v: 2 }] },
      transform: [{ type: "sort", field: "v", order: "desc" }, { type: "limit", count: 2 }],
    });
    expect(rows).toEqual([{ v: 3 }, { v: 2 }]);
  });

  test("an unknown source type rejects and names the ones that exist", async () => {
    await expect(runPipeline({ data: { type: "sql" } })).rejects.toThrow(/^Unknown data source "sql"\. Available: .*\binline\b.*\burl\b.*\.$/);
  });

  test("rows that are not objects are rejected with the position of the first bad one", async () => {
    await expect(runPipeline({ data: { type: "inline", rows: [{ a: 1 }, 5] } })).rejects.toThrow(
      'Row 1 from data source "inline" is a number, not an object.',
    );
  });

  test("a registered custom source can be used", async () => {
    registerSource({
      type: "test-range",
      description: "Rows 1..n",
      options: { n: { type: "number", required: true, description: "How many" } },
      load: (spec) => Array.from({ length: spec.n as number }, (_, i) => ({ i: i + 1 })),
    });
    expect(await runPipeline({ data: { type: "test-range", n: 3 } })).toEqual([{ i: 1 }, { i: 2 }, { i: 3 }]);
  });
});

describe("url source cache", () => {
  const spec = (extra: Record<string, unknown> = {}) => ({ data: { type: "url", url: "/data/sales.json", ...extra } }) as Parameters<typeof runPipeline>[0];

  test("loads that run at the same time share one request", async () => {
    const { fetch, urls } = fakeFetch([{ a: 1 }]);
    const [one, two] = await Promise.all([runPipeline(spec(), { fetch }), runPipeline(spec(), { fetch })]);
    expect([urls.length, one, two]).toEqual([1, [{ a: 1 }], [{ a: 1 }]]);
  });

  test("a later load within the cache time reuses the answer; cache 0 always asks again", async () => {
    const { fetch, urls } = fakeFetch([{ a: 1 }]);
    await runPipeline(spec({ url: "/data/later.json" }), { fetch });
    await runPipeline(spec({ url: "/data/later.json" }), { fetch });
    expect(urls.length).toBe(1);
    await runPipeline(spec({ url: "/data/later.json", cache: 0 }), { fetch });
    expect(urls.length).toBe(2);
  });

  test("fresh skips the cache and stores the new answer", async () => {
    const { fetch, urls } = fakeFetch([{ a: 1 }]);
    await runPipeline(spec({ url: "/data/fresh.json" }), { fetch });
    await runPipeline(spec({ url: "/data/fresh.json" }), { fetch, fresh: true });
    await runPipeline(spec({ url: "/data/fresh.json" }), { fetch });
    expect(urls.length).toBe(2);
  });

  test("failures are not kept, so the next load tries again", async () => {
    const failing = fakeFetch({}, 500);
    await expect(runPipeline(spec({ url: "/data/down.json" }), { fetch: failing.fetch })).rejects.toThrow("HTTP 500");
    await expect(runPipeline(spec({ url: "/data/down.json" }), { fetch: failing.fetch })).rejects.toThrow("HTTP 500");
    expect(failing.urls.length).toBe(2);
  });

  test("different fetch functions never share answers, and each load gets its own list", async () => {
    const first = fakeFetch([{ a: 1 }]);
    const second = fakeFetch([{ a: 2 }]);
    const one = await runPipeline(spec({ url: "/data/own.json" }), { fetch: first.fetch });
    const two = await runPipeline(spec({ url: "/data/own.json" }), { fetch: second.fetch });
    expect([one, two]).toEqual([[{ a: 1 }], [{ a: 2 }]]);
    const again = await runPipeline(spec({ url: "/data/own.json" }), { fetch: first.fetch });
    (again as unknown[]).push({ a: 99 });
    expect(await runPipeline(spec({ url: "/data/own.json" }), { fetch: first.fetch })).toEqual([{ a: 1 }]);
  });
});

describe("csv source", () => {
  test("reads text with a header row, typing numbers and empty cells", async () => {
    const rows = await runPipeline({ data: { type: "csv", text: "region,revenue,note\nNorth,120,\nSouth,-4.5e2,ok\n" } });
    expect(rows).toEqual([
      { region: "North", revenue: 120, note: null },
      { region: "South", revenue: -450, note: "ok" },
    ]);
  });

  test("keeps quoted separators, line breaks and doubled quotes inside a cell", () => {
    expect(parseCsv('name,quote\r\n"Smith, J","said ""hi""\nthen left"\r\n')).toEqual([{ name: "Smith, J", quote: 'said "hi"\nthen left' }]);
  });

  test("ids with leading zeros, dates and text stay text; typed false keeps every cell as text", () => {
    expect(parseCsv("id,day,n\n007,2026-01-05,0.5")).toEqual([{ id: "007", day: "2026-01-05", n: 0.5 }]);
    expect(parseCsv("id,n\n1,2", { typed: false })).toEqual([{ id: "1", n: "2" }]);
  });

  test("picks a semicolon or tab separator from the header, skips blank lines and a byte order mark", () => {
    expect(parseCsv("﻿region;revenue\n\nNorth;120\n")).toEqual([{ region: "North", revenue: 120 }]);
    expect(parseCsv("a\tb\n1\t2")).toEqual([{ a: 1, b: 2 }]);
  });

  test("fetches a url as text, and says what is missing without url or text", async () => {
    const urls: string[] = [];
    const fetch = (async (input: string | URL | Request) => {
      urls.push(String(input));
      return new Response("month,orders\n2026-01,40\n");
    }) as typeof globalThis.fetch;
    expect(await runPipeline({ data: { type: "csv", url: "/data/orders.csv", cache: 0 } }, { fetch })).toEqual([{ month: "2026-01", orders: 40 }]);
    expect(urls).toEqual(["/data/orders.csv"]);
    await expect(runPipeline({ data: { type: "csv" } })).rejects.toThrow('needs "url"');
  });
});
