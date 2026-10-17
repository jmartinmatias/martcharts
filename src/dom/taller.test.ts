// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { runPipeline } from "../core/pipeline.ts";
import { createVariants } from "../core/taller.ts";
import type { WidgetSpec } from "../core/types.ts";
import { createLocalFetch } from "../mcp/store.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

describe("the Taller's plates on the pass", () => {
  test("every variant of every widget actually renders, with its hidden data table kept", async () => {
    const fetch = createLocalFetch("public");
    const widgets = readdirSync("widgets")
      .filter((name) => name.endsWith(".json"))
      .map((name) => JSON.parse(readFileSync(join("widgets", name), "utf8")) as WidgetSpec);
    const failures: string[] = [];
    let plates = 0;
    for (const spec of widgets) {
      const rows = await runPipeline(spec, { fetch });
      for (const variant of createVariants(spec, rows, { count: 6 })) {
        const slot = document.createElement("div");
        document.body.append(slot);
        const widget = createWidget(slot, variant.spec, { fetch });
        await widget.ready;
        const state = slot.querySelector(".fft-widget")?.getAttribute("data-state");
        if (state !== "ready") failures.push(`${variant.menu}: ${state}`);
        // A plate drawn in SVG stays readable without sight: a hidden data table, or every mark labelled.
        // HTML plates (lists, bars, cells) are read directly.
        const drawn = slot.querySelector(".fft-body svg:not([aria-hidden='true'])");
        const readable = slot.querySelector("table") || slot.querySelector("svg [role='img'][aria-label]");
        if (state === "ready" && drawn && !readable) failures.push(`${variant.menu}: no text alternative`);
        widget.destroy();
        slot.remove();
        plates += 1;
      }
    }
    expect(failures).toEqual([]);
    expect(plates).toBeGreaterThan(200);
  }, 60_000);
});
