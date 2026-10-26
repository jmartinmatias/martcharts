// @vitest-environment jsdom
import { beforeEach, expect, test } from "vitest";
import { createWidget } from "../widget.ts";
import { trimZeros } from "./shared.ts";
import "./index.ts";

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
});

test("a short figure read aloud drops the zeros after its decimal mark, and nothing else", () => {
  expect(["€820.00K", "€1.20M", "€1.28M", "1,50 M €", "€820K", "12.0%"].map(trimZeros)).toEqual(["€820K", "€1.2M", "€1.28M", "1,5 M €", "€820K", "12%"]);
});

test("the hidden table under a chart says €820K, not €820.00K, when the field's format fixes two decimals", async () => {
  await createWidget(target, {
    locale: "en-US",
    data: { type: "inline", rows: [{ region: "North", revenue: 820000 }, { region: "East", revenue: 1284000 }] },
    fields: { revenue: { format: { type: "currency", currency: "EUR", compact: true, decimals: 2 } } },
    view: { type: "bar", x: "region", y: "revenue" },
  }).ready;
  const cells = [...target.querySelectorAll(".fft-sr-only td")].map((td) => td.textContent);
  expect(cells).toContain("€820K");
  expect(cells).toContain("€1.28M");
  expect(cells.some((text) => /\.00/.test(text ?? ""))).toBe(false);
});
