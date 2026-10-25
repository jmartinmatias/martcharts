// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { getBlock } from "../../core/registry.ts";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
});

async function draw(spec: Omit<WidgetSpec, "data"> & { rows: Row[] }) {
  const { rows, ...rest } = spec;
  await createWidget(target, { locale: "en-GB", data: { type: "inline", rows }, ...rest } as WidgetSpec).ready;
  expect(target.querySelector(".fft-widget")?.getAttribute("data-state")).toBe("ready");
}
const all = (selector: string) => [...target.querySelectorAll(selector)];
const texts = (selector: string) => all(selector).map((node) => node.textContent);
const press = (node: Element, key: string) => node.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

const months: Row[] = [
  { client: "Nordvik", month: "2026-08", status: "A", why: "" },
  { client: "Nordvik", month: "2026-09", status: "G", why: "Mandate renewed" },
  { client: "Nordvik", month: "2026-10", status: "G", why: "" },
  // Out of order on purpose: periods sort by time.
  { client: "Aldana", month: "2026-10", status: "R", why: "No meeting in 94 days" },
  { client: "Aldana", month: "2026-08", status: "G", why: "" },
  { client: "Aldana", month: "2026-09", status: "A", why: "FX spread queried" },
  { client: "Keller", month: "2026-09", status: "A", why: "" },
  { client: "Keller", month: "2026-10", status: "A", why: "" },
];
const view = { type: "ragtrend", label: "client", period: "month", status: "status", note: "why" };

describe("ragtrend view", () => {
  test("rows worst-current first, periods in time order, the current status as a pill at the end", async () => {
    await draw({ rows: months, view });
    expect(texts(".fft-ragtrend-row .fft-rag-name")).toEqual(["Aldana", "Keller", "Nordvik"]);
    expect(all(".fft-ragtrend-period").map((th) => th.textContent)).toEqual(["2026-08", "2026-09", "2026-10"]);
    const rows = all(".fft-ragtrend-row").map((tr) => [...tr.querySelectorAll(".fft-ragtrend-cell")].map((td) => (td as HTMLElement).dataset.rag).join(""));
    expect(rows).toEqual(["GAR", "NAA", "AGG"]);
    expect(texts(".fft-ragtrend-end")).toEqual(["Off track", "At risk", "On track"]);
  });

  test("a tick marks each change, and the cell says what it was and why it moved", async () => {
    await draw({ rows: months, view });
    const aldana = [...(all(".fft-ragtrend-row")[0] as Element).querySelectorAll(".fft-ragtrend-cell")] as HTMLElement[];
    expect(aldana.map((td) => td.dataset.changed ?? "")).toEqual(["", "worse", "worse"]);
    expect(aldana[2]?.querySelector(".fft-sr-only")?.textContent).toBe("2026-10: Off track, was At risk. No meeting in 94 days");
    // A period with no reading is said, not hidden, and has no mark.
    const keller = (all(".fft-ragtrend-row")[1] as Element).querySelectorAll(".fft-ragtrend-cell")[0] as HTMLElement;
    expect([keller.querySelector("svg"), keller.textContent]).toEqual([null, "2026-08: no reading"]);
  });

  test("the tooltip gives the status, what it was and why; Enter selects that period's row", async () => {
    await draw({ rows: months, view });
    const seen: Row[] = [];
    target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
    const nordvik = (all(".fft-ragtrend-row")[2] as Element).querySelectorAll(".fft-ragtrend-cell")[1] as HTMLElement;
    nordvik.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Nordvik, 2026-09", "On trackStatus", "At riskWas", "Mandate renewedWhy"]);
    press(nordvik, "Enter");
    expect(seen.map((r) => [r.client, r.month])).toEqual([["Nordvik", "2026-09"]]);
  });

  test("a legend of the statuses present, worst first; the keyboard moves along a row and down", async () => {
    await draw({ rows: months, view });
    expect(texts(".fft-rag-legend li")).toEqual(["Off track", "At risk", "On track", "No data"]);
    const cells = all(".fft-ragtrend-cell") as HTMLElement[];
    press(cells[0] as Element, "ArrowRight");
    expect(document.activeElement).toBe(cells[1]);
    press(cells[1] as Element, "ArrowDown");
    expect(document.activeElement).toBe(cells[4]);
  });

  test("quarters sort by time, and small multiples share every panel's periods", async () => {
    const extent = getBlock("view", "ragtrend").extent?.({ ...view, period: "q" }, [{ q: "2026-Q2" }, { q: "2026-Q1" }]);
    expect(extent).toEqual([Date.UTC(2026, 3, 1), Date.UTC(2026, 0, 1)]);
    await draw({
      rows: [
        { client: "A", q: "2026-Q2", status: "G", desk: "North" },
        { client: "B", q: "2026-Q1", status: "R", desk: "South" },
        { client: "B", q: "2026-Q3", status: "A", desk: "South" },
      ],
      facet: { field: "desk" },
      view: { type: "ragtrend", label: "client", period: "q", status: "status" },
    });
    const panels = all(".fft-facet").map((panel) => [...panel.querySelectorAll(".fft-ragtrend-period")].map((th) => th.textContent));
    expect(panels).toEqual([
      ["2026-Q1", "2026-Q2", "2026-Q3"],
      ["2026-Q1", "2026-Q2", "2026-Q3"],
    ]);
    // Inside small multiples, the panels skip their own legend.
    expect(all(".fft-facet .fft-rag-legend")).toHaveLength(0);
  });
});
