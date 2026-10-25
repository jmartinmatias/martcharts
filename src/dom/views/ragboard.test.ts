// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { validateSpec } from "../../core/validate.ts";
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

const clients: Row[] = [
  { client: "Brivio", segment: "Corporate", owner: "L. V.", success: "G", growth: "G", coverage: "G", successLast: "G", growthLast: "A", coverageLast: "G" },
  { client: "Aldana", segment: "Corporate", owner: "L. V.", success: "G", growth: "amber", coverage: "R", successLast: "G", growthLast: "A", coverageLast: "A" },
  { client: "Keller", segment: "Private", owner: "A. R.", success: "R", growth: "R", coverage: "A", successLast: "A", growthLast: "R", coverageLast: "A" },
  { client: "Delcourt", segment: "Private", owner: "A. R.", success: "A", growth: "G", coverage: "", successLast: "A", growthLast: "G", coverageLast: "" },
];
const view = { type: "ragboard", label: "client", dimensions: ["success", "growth", "coverage"] };

describe("ragboard view", () => {
  test("worst first: the overall status, then the most reds and ambers; an Overall column leads", async () => {
    await draw({ rows: clients, view });
    expect(texts(".fft-rag-name-text")).toEqual(["Keller", "Aldana", "Delcourt", "Brivio"]);
    expect(texts(".fft-rag-head")).toEqual(["Overall", "Success", "Growth", "Coverage"]);
    const statuses = all(".fft-rag-row").map((tr) => [...tr.querySelectorAll(".fft-rag-cell")].map((td) => (td as HTMLElement).dataset.rag).join(""));
    expect(statuses).toEqual(["RRRA", "RGAR", "AAGN", "GGGG"]);
  });

  test("each cell shows its status's shape and says its words, never color alone", async () => {
    await draw({ rows: clients, view });
    const first = all(".fft-rag-row")[0] as Element;
    const cells = [...first.querySelectorAll(".fft-rag-cell")];
    expect(cells.map((td) => td.querySelector("path")?.getAttribute("data-shape"))).toEqual(["square", "square", "square", "triangle"]);
    expect(cells.map((td) => td.querySelector(".fft-sr-only")?.textContent)).toEqual(["Off track", "Off track", "Off track", "At risk"]);
    expect((all(".fft-rag-row")[2]?.querySelectorAll(".fft-rag-cell")[3] as Element).textContent).toBe("No data");
  });

  test("the summary counts each row's overall status with its share; the footer counts each column", async () => {
    await draw({ rows: clients, view });
    expect(all(".fft-rag-sum").map((li) => li.textContent)).toEqual(["2Off track50%", "1At risk25%", "1On track25%"]);
    const foot = all(".fft-rag-tally").map((td) => td.querySelector(".fft-sr-only")?.textContent);
    expect(foot).toEqual(["2 off track, 1 at risk, 1 on track", "1 off track, 1 at risk, 2 on track", "1 off track, 1 at risk, 2 on track", "1 off track, 1 at risk, 1 on track"]);
  });

  test("with previous fields, a changed cell carries an arrow and says how it moved", async () => {
    await draw({ rows: clients, view: { ...view, previous: { success: "successLast", growth: "growthLast", coverage: "coverageLast" } } });
    const keller = all(".fft-rag-row")[0] as Element;
    const cells = [...keller.querySelectorAll(".fft-rag-cell")] as HTMLElement[];
    // Overall was already off track last period (growth was red), so only success moved.
    expect(cells.map((td) => td.dataset.trend ?? "")).toEqual(["", "worse", "", ""]);
    expect(cells[1]?.querySelector(".fft-sr-only")?.textContent).toBe("Off track, worse than last period (At risk)");
    const brivio = all(".fft-rag-row")[3] as Element;
    expect([...brivio.querySelectorAll(".fft-rag-trend")].map((n) => n.textContent)).toEqual(["↑", "↑"]);
  });

  test("the tooltip names the dimension, the status and the last period's; Enter selects the row", async () => {
    await draw({ rows: clients, view: { ...view, previous: { coverage: "coverageLast" } } });
    const seen: Row[] = [];
    target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
    const cell = all(".fft-rag-row")[1]?.querySelectorAll(".fft-rag-cell")[3] as HTMLElement;
    cell.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Aldana", "Off trackCoverage", "At riskLast period", "WorseChange"]);
    press(cell, "Enter");
    expect(seen.map((r) => r.client)).toEqual(["Aldana"]);
  });

  test("the keyboard moves across a row and down a column", async () => {
    await draw({ rows: clients, view });
    const cells = all(".fft-rag-cell") as HTMLElement[];
    expect(cells.map((c) => c.tabIndex).filter((t) => t === 0)).toHaveLength(1);
    press(cells[0] as Element, "ArrowRight");
    expect(document.activeElement).toBe(cells[1]);
    press(cells[1] as Element, "ArrowDown");
    expect(document.activeElement).toBe(cells[5]);
  });

  test("groups gather rows under headings; notes sit under names; overall off; sort by name", async () => {
    await draw({ rows: clients, view: { ...view, group: "segment", note: "owner", overall: false, sort: "name" } });
    expect(texts(".fft-rag-group th")).toEqual(["Corporate", "Private"]);
    expect(texts(".fft-rag-name-text")).toEqual(["Aldana", "Brivio", "Delcourt", "Keller"]);
    expect(texts(".fft-rag-note")).toEqual(["L. V.", "L. V.", "A. R.", "A. R."]);
    expect(texts(".fft-rag-head")).toEqual(["Success", "Growth", "Coverage"]);
  });

  test("custom words and shapes", async () => {
    await draw({ rows: clients.slice(0, 1), view: { ...view, words: { G: "Healthy" }, shapes: { G: "diamond" } } });
    const cell = all(".fft-rag-cell")[0] as Element;
    expect([cell.textContent, cell.querySelector("path")?.getAttribute("data-shape")]).toEqual(["Healthy", "diamond"]);
  });

  test("validation: a dimension that holds no statuses is a warning, not an error", () => {
    const issues = validateSpec({ data: { type: "inline", rows: [{ client: "X", success: "great" }] }, view: { type: "ragboard", label: "client", dimensions: ["success"] } }, [{ client: "X", success: "great" }]);
    expect(issues.map((i) => i.level)).toEqual(["warning"]);
  });
});
