// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { defineWidgetElement } from "./element.ts";
import type { FftWidgetElement } from "./element.ts";
import "./views/index.ts";

defineWidgetElement();

const spec = { title: "From JSON", data: { type: "inline", rows: [{ v: 1 }] }, view: { type: "table" } };

/** Waits until the element's widget has finished its current render. */
async function settled(el: FftWidgetElement) {
  await vi.waitFor(() => expect(el.querySelector(".fft-widget")?.getAttribute("aria-busy")).toBe("false"));
}

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("<fft-widget>", () => {
  test("renders the JSON in its spec attribute", async () => {
    document.body.innerHTML = `<fft-widget spec='${JSON.stringify(spec)}'></fft-widget>`;
    const el = document.querySelector("fft-widget") as FftWidgetElement;
    await settled(el);
    expect(el.querySelector(".fft-title")?.textContent).toBe("From JSON");
  });

  test("setting the spec property redraws the same widget", async () => {
    const el = document.createElement("fft-widget") as FftWidgetElement;
    document.body.append(el);
    el.spec = spec;
    await settled(el);
    const first = el.widget;
    el.spec = { ...spec, title: "Changed" };
    await settled(el);
    await el.widget?.ready;
    await vi.waitFor(() => expect(el.querySelector(".fft-title")?.textContent).toBe("Changed"));
    expect(el.widget).toBe(first);
  });

  test("broken JSON in the spec attribute is shown as an error", async () => {
    document.body.innerHTML = `<fft-widget spec='{"title": '></fft-widget>`;
    const el = document.querySelector("fft-widget") as FftWidgetElement;
    await vi.waitFor(() => expect(el.querySelector(".fft-message")?.textContent).toContain("The spec attribute is not valid JSON"));
  });

  test("renders the JSON in an inline script child", async () => {
    document.body.innerHTML = `<fft-widget><script type="application/json">${JSON.stringify(spec)}</script></fft-widget>`;
    const el = document.querySelector("fft-widget") as FftWidgetElement;
    await settled(el);
    expect(el.querySelector(".fft-title")?.textContent).toBe("From JSON");
  });

  test("broken JSON in an inline script child is shown as an error", async () => {
    document.body.innerHTML = `<fft-widget><script type="application/json">{"title": </script></fft-widget>`;
    const el = document.querySelector("fft-widget") as FftWidgetElement;
    await vi.waitFor(() => expect(el.querySelector(".fft-message")?.textContent).toContain("The inline spec is not valid JSON"));
  });

  test("src loads the spec from a URL", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(String(url));
      return new Response(JSON.stringify(spec));
    });
    document.body.innerHTML = `<fft-widget src="/widgets/revenue.json"></fft-widget>`;
    const el = document.querySelector("fft-widget") as FftWidgetElement;
    await vi.waitFor(() => expect(el.querySelector(".fft-title")?.textContent).toBe("From JSON"));
    expect(urls).toEqual(["/widgets/revenue.json"]);
  });

  test("a src that fails to load says which URL and why", async () => {
    vi.stubGlobal("fetch", async () => new Response("nope", { status: 404 }));
    document.body.innerHTML = `<fft-widget src="/widgets/missing.json"></fft-widget>`;
    const el = document.querySelector("fft-widget") as FftWidgetElement;
    await vi.waitFor(() => expect(el.querySelector(".fft-message")?.textContent).toContain("Could not load the spec from /widgets/missing.json: HTTP 404."));
  });

  test("removing the element tears the widget down", async () => {
    document.body.innerHTML = `<fft-widget spec='${JSON.stringify(spec)}'></fft-widget>`;
    const el = document.querySelector("fft-widget") as FftWidgetElement;
    await settled(el);
    el.remove();
    expect(el.querySelector(".fft-widget")).toBeNull();
    expect(el.widget).toBeUndefined();
  });

  test("the actions attribute offers those buttons", async () => {
    document.body.innerHTML = `<fft-widget actions="csv copy" spec='${JSON.stringify(spec)}'></fft-widget>`;
    const el = document.querySelector("fft-widget") as FftWidgetElement;
    await settled(el);
    expect([...el.querySelectorAll(".fft-action")].map((b) => (b as HTMLElement).dataset.action)).toEqual(["csv", "copy"]);
  });

  describe("the data attribute: a chart from a file, no spec", () => {
    /** A fetch that answers by address and counts the calls. */
    function serve(files: Record<string, string>) {
      const calls: string[] = [];
      vi.stubGlobal("fetch", async (url: string) => {
        calls.push(String(url));
        const body = files[String(url)];
        return body === undefined ? new Response("", { status: 404 }) : new Response(body);
      });
      return calls;
    }

    test("a CSV file is read and drawn as the chart that suits it, fetched once", async () => {
      const calls = serve({ "/t1.csv": "month,orders\n2026-01,40\n2026-02,52\n2026-03,47\n" });
      document.body.innerHTML = `<fft-widget data="/t1.csv" heading="Orders"></fft-widget>`;
      const el = document.querySelector("fft-widget") as FftWidgetElement;
      await vi.waitFor(() => expect(el.spec?.view).toEqual({ type: "line", x: "month", y: "orders" }));
      await settled(el);
      expect(el.querySelector(".fft-title")?.textContent).toBe("Orders");
      expect(el.spec?.data).toEqual({ type: "csv", url: "/t1.csv" });
      expect(calls).toEqual(["/t1.csv"]);
      expect(el.hasAttribute("title")).toBe(false);
    });

    test("chart names the view; JSON is read with an optional path", async () => {
      serve({ "/t2.json": JSON.stringify({ items: [{ team: "Ops", hours: 3 }, { team: "Sales", hours: 5 }] }) });
      document.body.innerHTML = `<fft-widget data="/t2.json" path="items" chart="donut"></fft-widget>`;
      const el = document.querySelector("fft-widget") as FftWidgetElement;
      await vi.waitFor(() => expect(el.spec?.view).toEqual({ type: "donut", label: "team", value: "hours" }));
      expect(el.spec?.data).toEqual({ type: "url", url: "/t2.json", path: "items" });
    });

    test("an unknown chart or a missing file says so in the widget", async () => {
      serve({ "/t3.csv": "a,b\nx,1\n" });
      document.body.innerHTML = `<fft-widget data="/t3.csv" chart="pie"></fft-widget><fft-widget data="/missing.csv"></fft-widget>`;
      const [pie, missing] = [...document.querySelectorAll("fft-widget")];
      await vi.waitFor(() => expect(pie?.querySelector(".fft-message")?.textContent).toContain('Unknown chart "pie"'));
      await vi.waitFor(() => expect(missing?.querySelector(".fft-message")?.textContent).toContain("Could not draw /missing.csv"));
    });
  });

  test("defining twice is harmless", () => {
    expect(() => defineWidgetElement()).not.toThrow();
  });
});
