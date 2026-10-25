// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import { createWidget, describeBlocks, hasErrors, validateSpec } from "./index.ts";
import type { Row, WidgetSpec } from "./index.ts";

/** The catalog written by `npm run catalog`: one self-contained spec per view. */
const FILES = readdirSync("catalog").filter((file) => file.endsWith(".json"));
const specOf = (file: string) => JSON.parse(readFileSync(`catalog/${file}`, "utf8")) as WidgetSpec;

describe("the chart catalog", () => {
  test("has one spec for every view, and nothing else", () => {
    expect(FILES.map((file) => file.replace(/\.json$/, "")).sort()).toEqual(describeBlocks("view").map((view) => view.type).sort());
  });

  test.each(FILES)("%s stands alone: inline data, no transforms, no errors", (file) => {
    const spec = specOf(file);
    expect(spec.data.type).toBe("inline");
    expect(spec.transform ?? []).toEqual([]);
    expect(hasErrors(validateSpec(spec, spec.data.rows as Row[]))).toBe(false);
  });

  test.each(FILES)("%s draws without an error message", async (file) => {
    const target = document.createElement("div");
    document.body.append(target);
    const widget = createWidget(target, specOf(file));
    await widget.ready;
    await vi.waitFor(() => expect(target.querySelector(".fft-widget")?.getAttribute("aria-busy")).toBe("false"));
    expect(target.querySelector(".fft-message")?.textContent ?? "").toBe("");
    expect(target.querySelector(".fft-body, svg, table")).not.toBeNull();
    widget.destroy();
  });
});
