import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { runPipeline } from "../core/pipeline.ts";
import { createFileStore, createLocalFetch } from "./store.ts";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "fft-store-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const spec = { title: "Sales", data: { type: "inline", rows: [] }, view: { type: "table" } };

describe("file store", () => {
  test("save writes pretty JSON named after the id, and get reads it back", async () => {
    const store = createFileStore(dir);
    await store.save("sales", spec);
    expect(await readFile(join(dir, "sales.json"), "utf8")).toBe(`${JSON.stringify({ id: "sales", ...spec }, null, 2)}\n`);
    expect(await store.get("sales")).toEqual({ id: "sales", ...spec });
  });

  test("the file name wins over an id written inside the file", async () => {
    await writeFile(join(dir, "real.json"), JSON.stringify({ ...spec, id: "other" }));
    expect((await createFileStore(dir).get("real")).id).toBe("real");
  });

  test("list returns every widget sorted by id and reports files that are not valid JSON", async () => {
    const store = createFileStore(dir);
    await store.save("b-widget", spec);
    await store.save("a-widget", spec);
    await writeFile(join(dir, "broken.json"), "{ nope");
    await writeFile(join(dir, "notes.txt"), "ignored");
    const entries = await store.list();
    expect(entries.map((e) => [e.id, e.spec?.title ?? null, e.error ? "error" : null])).toEqual([
      ["a-widget", "Sales", null],
      ["b-widget", "Sales", null],
      ["broken", null, "error"],
    ]);
  });

  test("get on a missing widget says how to find the ids", async () => {
    await expect(createFileStore(dir).get("ghost")).rejects.toThrow('No widget "ghost". Call fft_list_widgets to see the ids.');
  });

  test("ids that could escape the folder are refused", async () => {
    const store = createFileStore(dir);
    await expect(store.save("../evil", spec)).rejects.toThrow('Widget ids use lowercase letters, digits and dashes, for example "revenue-by-region".');
    await expect(store.get("a/b")).rejects.toThrow("Widget ids use lowercase letters");
  });

  test("delete removes the file; deleting a missing widget says it is missing", async () => {
    const store = createFileStore(dir);
    await store.save("sales", spec);
    await store.delete("sales");
    await expect(store.get("sales")).rejects.toThrow('No widget "sales"');
    await expect(store.delete("sales")).rejects.toThrow('No widget "sales"');
  });

  test("has tells whether a widget exists", async () => {
    const store = createFileStore(dir);
    await store.save("sales", spec);
    expect([await store.has("sales"), await store.has("ghost")]).toEqual([true, false]);
  });
});

describe("local fetch", () => {
  test("relative URLs are read from the public folder", async () => {
    await mkdir(join(dir, "data"));
    await writeFile(join(dir, "data", "sales.json"), JSON.stringify([{ a: 1 }]));
    const rows = await runPipeline({ data: { type: "url", url: "/data/sales.json" } }, { fetch: createLocalFetch(dir) });
    expect(rows).toEqual([{ a: 1 }]);
  });

  test("a missing file answers 404", async () => {
    const response = await createLocalFetch(dir)("/data/missing.json");
    expect(response.status).toBe(404);
  });

  test("paths that climb out of the public folder answer 404 without reading", async () => {
    // The public folder is <tmp>/<dir>/public; the secret sits beside it, one level up.
    const publicDir = join(dir, "public");
    await mkdir(join(publicDir, "data"), { recursive: true });
    await writeFile(join(dir, "secret.json"), "[]");
    // URL parsing would tidy away a plain "/../", so use the encoded form that survives it.
    const response = await createLocalFetch(publicDir)("/data/..%2f..%2fsecret.json");
    expect(response.status).toBe(404);
  });
});
