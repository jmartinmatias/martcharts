import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createFileStore } from "./store.ts";

/** Every stored widget, at the top of widgets/ or one folder down. */
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(`${dir}/${f}`).isDirectory() ? walk(`${dir}/${f}`) : f.endsWith(".json") ? [`${dir}/${f}`] : []));
const files = walk("widgets");

describe("the widget store reads every stored widget", () => {
  test("every widget id is one the store accepts (lowercase, digits, dashes) and matches its file name", () => {
    const bad = files
      .map((file) => [file, (JSON.parse(readFileSync(file, "utf8")) as { id?: string }).id] as const)
      .filter(([file, id]) => !id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || !file.endsWith(`/${id}.json`));
    expect(bad).toEqual([]);
  });

  test("the store lists and reads widgets in sub-folders too, the worked dashboards' widgets included", async () => {
    const store = createFileStore("widgets");
    const listed = await store.list();
    expect(listed.filter((w) => "error" in w && w.error)).toEqual([]);
    expect(listed.length).toBe(files.length);
    expect((await store.get("health-client-success-board")).view.type).toBe("ragboard");
    expect(await store.has("cc-call-list")).toBe(true);
  });
});
