// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { explainChart } from "../../core/explain.ts";
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
  await createWidget(target, { locale: "en-US", data: { type: "inline", rows }, ...rest } as WidgetSpec).ready;
  expect(target.querySelector(".fft-widget")?.getAttribute("data-state")).toBe("ready");
}

const all = (selector: string) => [...target.querySelectorAll(selector)];
const texts = (selector: string) => all(selector).map((node) => node.textContent);
const one = <T extends Element>(selector: string) => target.querySelector(selector) as T;
const names = () => texts("tbody tr > td:first-child");
const type = (text: string) => {
  const input = one<HTMLInputElement>(".fft-table-search");
  input.value = text;
  input.dispatchEvent(new Event("input"));
};

const customers = [
  { name: "Aurora Logistics", country: "Luxembourg", revenue: 214000 },
  { name: "Beacon Health", country: "Germany", revenue: 198500 },
  { name: "Cobalt Foods", country: "France", revenue: 88200 },
  { name: "Delta Retail", country: "Belgium", revenue: 97600 },
  { name: "Everly Studios", country: "Netherlands", revenue: 14300 },
];
const euro = { revenue: { format: { type: "currency", currency: "EUR", decimals: 0 } } };

describe("table search", () => {
  test("a plain table has no search field, no pager and no count: the extras appear only when asked for", async () => {
    await draw({ rows: customers, view: { type: "table" } });
    expect([all(".fft-table-tools").length, all(".fft-pager").length, all(".fft-table-count").length]).toEqual([0, 0, 0]);
  });

  test("typing keeps the rows whose shown text matches in any column, case-insensitive, and counts them aloud", async () => {
    await draw({ title: "Customers", rows: customers, fields: euro, view: { type: "table", search: true } });
    const input = one<HTMLInputElement>(".fft-table-search");
    expect([input.type, input.placeholder, input.getAttribute("aria-label")]).toEqual(["search", "Search", "Search Customers"]);
    expect(one(".fft-table-count").hasAttribute("hidden")).toBe(true);
    type("GERM");
    expect(names()).toEqual(["Beacon Health"]);
    const count = one(".fft-table-count");
    expect([count.textContent, count.hasAttribute("hidden"), count.getAttribute("aria-live")]).toEqual(["1 of 5 rows", false, "polite"]);
    // Formatted text counts: the euro sign is in the cell, so it finds every priced row.
    type("€");
    expect(names().length).toBe(5);
    type("");
    expect([names().length, one(".fft-table-count").hasAttribute("hidden")]).toEqual([5, true]);
  });

  test("when nothing matches the table gives way to one quiet line", async () => {
    await draw({ rows: customers, view: { type: "table", search: true } });
    type("zzz");
    expect([one(".fft-table-empty").hasAttribute("hidden"), one(".fft-table-empty").textContent, one(".fft-table-wrap").hasAttribute("hidden"), one(".fft-table-count").textContent]).toEqual([false, "No rows match", true, "0 of 5 rows"]);
    type("a");
    expect([one(".fft-table-empty").hasAttribute("hidden"), one(".fft-table-wrap").hasAttribute("hidden")]).toEqual([true, false]);
  });

  test("sorting works on the rows the search left", async () => {
    await draw({ rows: customers, view: { type: "table", search: true } });
    type("oo");
    expect(names()).toEqual(["Cobalt Foods"]);
    type("l");
    (all("thead .fft-sort")[2] as HTMLButtonElement).click();
    expect(names()).toEqual(["Everly Studios", "Cobalt Foods", "Delta Retail", "Beacon Health", "Aurora Logistics"]);
    (all("thead .fft-sort")[2] as HTMLButtonElement).click();
    expect(names()[0]).toBe("Aurora Logistics");
    type("an");
    expect(names()).toEqual(["Beacon Health", "Cobalt Foods", "Everly Studios"]);
    expect(one("thead th:nth-child(3)").getAttribute("aria-sort")).toBe("descending");
  });
});

describe("table pages", () => {
  const paged = { rows: customers, view: { type: "table", pageSize: 2 } };

  test("shows one page at a time, says where it is, and turns with Previous and Next, dark at the ends", async () => {
    await draw(paged);
    expect(names()).toEqual(["Aurora Logistics", "Beacon Health"]);
    const [previous, next] = all(".fft-pager-button") as HTMLButtonElement[];
    expect([one(".fft-pager-where").textContent, previous?.disabled, next?.disabled, one(".fft-pager").getAttribute("aria-label")]).toEqual(["1–2 of 5", true, false, "Table pages"]);
    next?.click();
    expect([names(), one(".fft-pager-where").textContent, previous?.disabled]).toEqual([["Cobalt Foods", "Delta Retail"], "3–4 of 5", false]);
    next?.click();
    expect([names(), one(".fft-pager-where").textContent, next?.disabled, document.activeElement]).toEqual([["Everly Studios"], "5–5 of 5", true, previous]);
    previous?.click();
    previous?.click();
    expect([names(), previous?.disabled, document.activeElement]).toEqual([["Aurora Logistics", "Beacon Health"], true, next]);
  });

  test("the pager stays out of the way while the rows fit on one page", async () => {
    await draw({ rows: customers, view: { type: "table", pageSize: 10 } });
    expect([names().length, one(".fft-pager").hasAttribute("hidden")]).toEqual([5, true]);
  });

  test("sorting and searching go back to the first page, and the totals row still sums every row", async () => {
    await draw({ rows: customers, fields: euro, view: { type: "table", pageSize: 2, search: true, totals: true } });
    (all(".fft-pager-button")[1] as HTMLButtonElement).click();
    expect(one(".fft-pager-where").textContent).toBe("3–4 of 5");
    (all("thead .fft-sort")[2] as HTMLButtonElement).click();
    expect([names(), one(".fft-pager-where").textContent]).toEqual([["Everly Studios", "Cobalt Foods"], "1–2 of 5"]);
    expect(texts("tfoot td")).toEqual(["Total", "", "€612,600"]);
    (all(".fft-pager-button")[1] as HTMLButtonElement).click();
    type("an");
    expect([one(".fft-pager-where").textContent, names().length]).toEqual(["1–2 of 3", 2]);
    type("xx");
    expect([one(".fft-pager").hasAttribute("hidden"), one(".fft-table-empty").hasAttribute("hidden")]).toEqual([true, false]);
  });
});

describe("table layout options", () => {
  test("stickyFirst marks the scrolling box, so the stylesheet pins the first column", async () => {
    await draw({ rows: customers, view: { type: "table", stickyFirst: true } });
    expect(one(".fft-table-wrap").hasAttribute("data-sticky")).toBe(true);
  });

  test("align sets a column's text alignment on its header and cells, numbers included", async () => {
    await draw({ rows: customers, view: { type: "table", align: { revenue: "center", country: "right" } } });
    expect([...all("thead th"), ...all("tbody tr:first-child td")].map((cell) => (cell as HTMLElement).style.textAlign)).toEqual(["", "right", "center", "", "right", "center"]);
  });

  test("validation says what pageSize and align must be", () => {
    const at = (view: Record<string, unknown>) => validateSpec({ data: { type: "inline", rows: customers }, view: { type: "table", ...view } }).map((issue) => `${issue.level} ${issue.path}: ${issue.message}`);
    expect(at({ pageSize: 0 })).toEqual(["error view: pageSize must be a whole number, 1 or more, for example 10."]);
    expect(at({ pageSize: 2.5 }).length).toBe(1);
    expect(at({ align: { revenue: "middle" } })).toEqual(['error view: align.revenue must be left, center or right, not "middle".']);
    expect(at({ align: ["left"] }).length).toBe(1);
    expect(at({ pageSize: 10, align: { revenue: "center" }, search: true, stickyFirst: true })).toEqual([]);
  });

  test("the reading guide mentions the search box and the pages when they are there", () => {
    const guide = (view: Record<string, unknown>) => explainChart({ data: { type: "inline", rows: customers }, view: { type: "table", ...view } }, customers);
    expect(guide({})).not.toMatch(/search|pages/);
    expect(guide({ search: true, pageSize: 8 })).toContain("Click a column heading to sort by it; type in the search box to keep only the rows that match; 8 rows show at a time, and Next and Previous turn the pages.");
    // The controls now share one sentence, so a table with every extra on still reads in three.
  });
});
