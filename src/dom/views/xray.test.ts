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

const client = {
  name: "Aldana Holdings",
  segment: "Corporate",
  aum: 48200000,
  revenue: 302000,
  products: 3,
  sinceYear: 2014,
  custody: true,
  advisory: true,
  lending: false,
  shareOfWallet: 0.41,
  trend: [21000, 22500, 24100, 30100],
  flags: ["No meeting in 94 days", "Fee leakage on FX"],
  actions: ["Propose discretionary mandate", "Review FX pricing"],
};
const fields: WidgetSpec["fields"] = {
  aum: { label: "Assets", format: { type: "currency", currency: "EUR", compact: true } },
  revenue: { label: "Revenue", format: { type: "currency", currency: "EUR", compact: true } },
  sinceYear: { label: "Client since" },
  shareOfWallet: { label: "Share of wallet" },
  trend: { label: "Revenue by month", format: { type: "currency", currency: "EUR", compact: true } },
};
const view: WidgetSpec["view"] = {
  type: "xray",
  label: "name",
  detail: "segment",
  facts: ["aum", "revenue", "products", "sinceYear"],
  holdings: ["custody", "advisory", "lending"],
  wallet: "shareOfWallet",
  trend: "trend",
  flags: "flags",
  actions: "actions",
};

describe("xray view (one client on one card)", () => {
  test("the name, the detail line and the facts as labelled figures", async () => {
    await draw({ rows: [client], fields, view });
    expect(texts(".fft-xray-name")).toEqual(["Aldana Holdings"]);
    expect(texts(".fft-xray-detail")).toEqual(["Corporate"]);
    expect(texts(".fft-xray-fact-label")).toEqual(["Assets", "Revenue", "Products", "Client since"]);
    expect(texts(".fft-xray-fact-value")).toEqual(["€48.2M", "€302K", "3", "2014"]);
  });

  test("holdings are pills, held ones marked and counted", async () => {
    await draw({ rows: [client], fields, view });
    expect(texts(".fft-xray-pill")).toEqual(["Custody", "Advisory", "Lending"]);
    expect(all(".fft-xray-pill").map((pill) => pill.hasAttribute("data-held"))).toEqual([true, true, false]);
    expect(texts(".fft-xray-holdings + *, .fft-xray-title-count")[0]).toBe("2 of 3");
    expect(all(".fft-xray-pill")[2]?.getAttribute("aria-label")).toBe("Lending: not held");
  });

  test("the share of wallet is a meter with its percent", async () => {
    await draw({ rows: [client], fields, view });
    const track = target.querySelector(".fft-xray-track") as HTMLElement;
    expect([track.getAttribute("role"), track.getAttribute("aria-valuenow"), track.getAttribute("aria-label")]).toEqual(["meter", "0.41", "Share of wallet: 41%"]);
    expect((target.querySelector(".fft-xray-fill") as HTMLElement).style.width).toBe("41%");
    expect(texts(".fft-xray-wallet-percent")).toEqual(["41%"]);
  });

  test("the trend is a sparkline with its first and last values and the change", async () => {
    await draw({ rows: [client], fields, view });
    expect(all(".fft-xray-trend .fft-sparkline").length).toBe(1);
    expect(texts(".fft-xray-trend .fft-xray-title-count")).toEqual(["€21K → €30.1K (+43%)"]);
  });

  test("flags are amber pills and actions a checklist", async () => {
    await draw({ rows: [client], fields, view });
    expect(texts(".fft-xray-flag")).toEqual(["No meeting in 94 days", "Fee leakage on FX"]);
    expect(all(".fft-xray-flag").map((flag) => flag.getAttribute("data-tone"))).toEqual(["warning", "warning"]);
    expect(texts(".fft-xray-action span")).toEqual(["Propose discretionary mandate", "Review FX pricing"]);
    expect(all(".fft-xray-check").length).toBe(2);
  });

  test("every part is optional: a card with facts alone has no strip, meter, trend, flags or actions", async () => {
    await draw({ rows: [client], fields, view: { type: "xray", label: "name", facts: ["aum", "revenue"] } });
    expect([all(".fft-xray-fact").length, all(".fft-xray-pill").length, all(".fft-xray-track").length, all(".fft-sparkline").length, all(".fft-xray-flag").length, all(".fft-xray-action").length]).toEqual([2, 0, 0, 0, 0, 0]);
  });

  test("validation wants something besides the name, at most six facts, and lists where lists are promised", () => {
    const bare: WidgetSpec = { data: { type: "inline", rows: [client] }, view: { type: "xray", label: "name" } };
    expect(validateSpec(bare).some((i) => i.level === "error" && /needs something to show/.test(i.message))).toBe(true);
    const many: WidgetSpec = { data: { type: "inline", rows: [client] }, view: { type: "xray", label: "name", facts: ["aum", "revenue", "products", "sinceYear", "aum", "revenue", "products"] } };
    expect(validateSpec(many).some((i) => i.level === "error" && /7 facts/.test(i.message))).toBe(true);
    const notList: WidgetSpec = { data: { type: "inline", rows: [{ ...client, flags: "late" }] }, view: { type: "xray", label: "name", facts: ["aum"], flags: "flags" } };
    expect(validateSpec(notList, [{ ...client, flags: "late" }]).map((i) => [i.level, /not a list/.test(i.message)])).toEqual([["warning", true]]);
  });

  test("a hidden table carries the facts for screen readers", async () => {
    await draw({ rows: [client], fields, view });
    expect(texts(".fft-sr-only th")).toEqual(["Name", "Segment", "Assets", "Revenue", "Products", "Client since", "Share of wallet"]);
  });

  test("the guide, the question and the recommendation treat the card as one client", () => {
    const spec: WidgetSpec = { data: { type: "inline", rows: [client] }, fields, view };
    expect(explainChart(spec, [client])).toMatch(/This card is one client: the key numbers, the products they hold, their share of wallet with us/);
    // The parts are listed in one sentence, without naming colors or bars.
    expect(explainChart(spec, [client])).toMatch(/Here, Aldana Holdings holds 2 of 3 products and has a share of wallet of 41%\./);
    // The card's own title names the row: a client, never "entry".
    expect(questionOf({ ...spec, title: "Client x-ray" }).text).toBe("How does this client stand right now, and what should we do next?");
    const pick = recommendCharts([client]).find((p) => p.type === "xray");
    expect(pick?.view).toEqual({ type: "xray", label: "name", facts: ["aum", "revenue", "products", "sinceYear"], holdings: ["custody", "advisory", "lending"], wallet: "shareOfWallet" });
  });
});
