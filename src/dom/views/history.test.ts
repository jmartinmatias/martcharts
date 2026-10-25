// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { explainChart } from "../../core/explain.ts";
import { questionOf } from "../../core/question.ts";
import { recommendCharts } from "../../core/recommend.ts";
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

const events = [
  { date: "2026-06-05", kind: "Call", title: "Lending enquiry", note: "Awaiting valuation.", amount: null },
  { date: "2026-10-03", kind: "Trade", title: "Bought bond ladder", note: null, amount: 2400000 },
  { date: "2026-09-17", kind: "Campaign", title: "Mandate campaign opened", note: "Opened twice.", amount: null },
  { date: "2026-10-21", kind: "Call", title: "Quarterly check-in", note: null, amount: null },
  { date: "2026-08-12", kind: "Complaint", title: "FX spread queried", note: "Goodwill credit.", amount: -1800 },
];
const fields: WidgetSpec["fields"] = { amount: { label: "Amount", format: { type: "currency", currency: "EUR", compact: true } } };
const view: WidgetSpec["view"] = { type: "history", date: "date", title: "title", kind: "kind", note: "note", amount: "amount" };

describe("history view (a client's story)", () => {
  test("events run newest first, each with its date, title and amount, and a note underneath", async () => {
    await draw({ rows: events, fields, view });
    expect(texts(".fft-history-title")).toEqual(["Quarterly check-in", "Bought bond ladder", "Mandate campaign opened", "FX spread queried", "Lending enquiry"]);
    expect(texts(".fft-history-date")).toEqual(["Oct 21", "Oct 3", "Sep 17", "Aug 12", "Jun 5"]);
    expect(texts(".fft-history-amount")).toEqual(["€2.4M", "−€1.8K"]);
    expect(texts(".fft-history-note")).toEqual(["Opened twice.", "Goodwill credit.", "Awaiting valuation."]);
  });

  test("the month is written where it changes, once per month", async () => {
    await draw({ rows: events, fields, view });
    expect(texts(".fft-history-month")).toEqual(["October 2026", "September 2026", "August 2026", "June 2026"]);
  });

  test("order asc tells the story from the start", async () => {
    await draw({ rows: events, fields, view: { ...view, order: "asc" } });
    expect(texts(".fft-history-title")[0]).toBe("Lending enquiry");
    expect(texts(".fft-history-month")[0]).toBe("June 2026");
  });

  test("each kind takes a color and a letter, keyed in a legend", async () => {
    await draw({ rows: events, fields, view });
    expect(texts(".fft-legend li")).toEqual(["Call", "Trade", "Campaign", "Complaint"]);
    expect(texts(".fft-history-dot")).toEqual(["C", "T", "C", "C", "C"]);
    const dots = all(".fft-history-dot") as HTMLElement[];
    expect(dots[0]?.style.background).toBe(dots[4]?.style.background);
    expect(dots[0]?.style.background).not.toBe(dots[1]?.style.background);
  });

  test("past the limit, one line says how many more there are", async () => {
    await draw({ rows: events, fields, view: { ...view, limit: 3 } });
    expect(all(".fft-history-event").length).toBe(3);
    expect(texts(".fft-history-more")).toEqual(["2 more"]);
  });

  test("a group field makes one list per client under its own heading", async () => {
    const rows = events.map((event, i) => ({ ...event, client: i % 2 ? "Keller" : "Aldana" }));
    await draw({ rows, fields, view: { ...view, group: "client" } });
    expect(texts(".fft-history-heading")).toEqual(["Aldana", "Keller"]);
    expect(all(".fft-history").length).toBe(2);
    expect(all(".fft-history-group")[0]?.querySelectorAll(".fft-history-event").length).toBe(3);
  });

  test("events are keyboard stops with a tooltip, and Enter picks the row", async () => {
    await draw({ rows: events, fields, view });
    const items = all(".fft-history-event") as HTMLElement[];
    expect(items.map((i) => i.tabIndex)).toEqual([0, -1, -1, -1, -1]);
    items[1]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-title")).toEqual(["Bought bond ladder"]);
    expect(texts(".fft-tooltip-row")).toEqual(["Oct 3Date", "TradeKind", "€2.4MAmount"]);
    expect(items[3]?.getAttribute("aria-label")).toBe("Aug 12: FX spread queried, Complaint, −€1.8K. Goodwill credit.");
    const seen: Row[] = [];
    target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
    items[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(seen).toEqual([events[3]]);
  });

  test("rows without a readable date are left out, with a warning", () => {
    const rows = [...events, { date: "soon", kind: "Call", title: "Follow-up", note: null, amount: null }];
    const spec: WidgetSpec = { data: { type: "inline", rows }, view };
    expect(validateSpec(spec, rows).map((i) => [i.level, i.message])).toEqual([["warning", '1 row has no readable date in "date" (YYYY-MM-DD) and is left out.']]);
    expect(validateSpec({ ...spec, view: { ...view, limit: 0 } }).some((i) => i.level === "error" && /limit must be a whole number/.test(i.message))).toBe(true);
  });

  test("a hidden table lists the events for screen readers", async () => {
    await draw({ rows: events, fields, view });
    expect(texts(".fft-sr-only th")).toEqual(["Date", "Title", "Kind", "Amount", "Note"]);
    expect(all(".fft-sr-only tbody tr").length).toBe(5);
  });

  test("the guide, the question and the recommendation read it as a story", () => {
    const spec: WidgetSpec = { data: { type: "inline", rows: events }, fields, view };
    expect(explainChart(spec, events)).toMatch(/Each dot is one event for the client, newest at the top, with its date and what happened and, on the right, the amount\. Each color and letter is one kind\./);
    expect(explainChart(spec, events)).toMatch(/Here, there are 5 events, 2 of them calls; the latest is Quarterly check-in on Oct 21, 2026\./);
    expect(questionOf(spec).text).toBe("What happened with the client, and when?");
    const pick = recommendCharts(events).find((p) => p.type === "history");
    expect(pick?.view).toEqual({ type: "history", date: "date", title: "title", kind: "kind", note: "note", amount: "amount" });
  });
});
