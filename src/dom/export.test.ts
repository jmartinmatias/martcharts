// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { registerView } from "../core/registry.ts";
import type { ViewContext } from "../core/view-context.ts";
import { toDelimited } from "./export.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

registerView({ type: "test-plain", description: "Text only", options: {}, render: (ctx: ViewContext) => void (ctx.el.textContent = "plain") });

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
});
afterEach(() => vi.restoreAllMocks());

describe("toDelimited", () => {
  test("writes labelled headers and raw values, quoting what needs it", () => {
    const rows = [
      { name: "Acme, Inc.", note: 'Say "hi"', amount: 1200.5, trend: [1, 2] },
      { name: "Bolt", amount: null },
    ];
    expect(toDelimited(rows, (field) => field.toUpperCase(), ",")).toBe(
      'NAME,NOTE,AMOUNT,TREND\r\n"Acme, Inc.","Say ""hi""",1200.5,"[1,2]"\r\nBolt,,,\r\n',
    );
  });

  test("tabs separate columns for pasting into spreadsheets", () => {
    expect(toDelimited([{ a: 1, b: "x\ty" }], (f) => f, "\t")).toBe('a\tb\r\n1\t"x\ty"\r\n');
  });
});

describe("widget actions", () => {
  const spec = { title: "Revenue", data: { type: "inline", rows: [{ m: "Jan", v: 1 }] }, view: { type: "bar", x: "m", y: "v" } };

  test("no action buttons unless the host asks for them", async () => {
    await createWidget(target, spec).ready;
    expect(target.querySelector(".fft-actions")).toBeNull();
  });

  test("the host can offer CSV, image and copy", async () => {
    await createWidget(target, spec, { actions: ["csv", "image", "copy"] }).ready;
    const labels = [...target.querySelectorAll(".fft-action")].map((b) => b.getAttribute("aria-label"));
    expect(labels).toEqual(["Download data as CSV", "Download chart as image", "Copy data"]);
  });

  test("image is offered only when the view draws a chart", async () => {
    await createWidget(target, { ...spec, view: { type: "test-plain" } }, { actions: ["csv", "image"] }).ready;
    const image = target.querySelector<HTMLButtonElement>('.fft-action[data-action="image"]');
    expect(image?.hidden).toBe(true);
  });

  test("CSV downloads a file named after the widget", async () => {
    const created: Blob[] = [];
    Object.assign(URL, { createObjectURL: (blob: Blob) => (created.push(blob), "blob:test"), revokeObjectURL: () => {} });
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    await createWidget(target, { ...spec, id: "monthly-revenue" }, { actions: ["csv"] }).ready;
    target.querySelector<HTMLButtonElement>('.fft-action[data-action="csv"]')?.click();
    expect(names).toEqual(["monthly-revenue.csv"]);
    expect(await created[0]?.text()).toBe("M,V\r\nJan,1\r\n");
  });
});
