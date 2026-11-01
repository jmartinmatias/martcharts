// @vitest-environment jsdom
/**
 * Passing a card on: a link that opens the page at this card, and the card as one sentence to paste into an email or a
 * slide, each said quietly beside the toolbar ("Link copied") and to screen readers, never in a dialog.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { WidgetSpec } from "../core/types.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

const rows = [
  { region: "North", revenue: 120 },
  { region: "East", revenue: 340 },
  { region: "South", revenue: 90 },
];
const spec = (extra: Partial<WidgetSpec> = {}): WidgetSpec =>
  ({ id: "revenue-by-region", title: "Revenue by region", source: { name: "Finance ledger" }, data: { type: "inline", rows }, view: { type: "bar", x: "region", y: "revenue" }, ...extra }) as WidgetSpec;

let writeText: ReturnType<typeof vi.fn>;
beforeEach(() => {
  writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});
afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
  document.body.replaceChildren();
  history.replaceState(null, "", "/");
});

const press = async (action: string) => {
  document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click();
  await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
};
const said = () => document.querySelector(".fft-said");

describe("copy link to this card", () => {
  test("copies the page's address ending in the card's ref, keeping its query and dropping an old hash", async () => {
    history.replaceState(null, "", "/dashboards.html?board=sales#section-overview");
    await createWidget(document.body, spec(), { actions: ["link"] }).ready;
    const ref = document.querySelector<HTMLElement>(".fft-widget")!.dataset.fftRef!;
    expect(ref).toMatch(/^W-[A-Z0-9]{4}$/);
    await press("link");
    expect(writeText).toHaveBeenCalledWith(`${location.origin}/dashboards.html?board=sales#${ref}`);
  });

  test("says so beside the toolbar, as a polite status", async () => {
    await createWidget(document.body, spec(), { actions: ["link"] }).ready;
    await press("link");
    await vi.waitFor(() => expect(said()?.textContent).toBe("Link copied"));
    expect(said()?.getAttribute("role")).toBe("status");
    expect(said()?.getAttribute("aria-live")).toBe("polite");
  });

  test("says it could not, when the browser refuses the clipboard", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    await createWidget(document.body, spec(), { actions: ["link"] }).ready;
    await press("link");
    await vi.waitFor(() => expect(said()?.textContent).toBe("Could not copy"));
  });
});

describe("copy as a sentence", () => {
  test("copies the takeaway, then the card's title, source and link on a line of its own", async () => {
    await createWidget(document.body, spec({ takeaway: "East leads with 340, 61% of the total." }), { actions: ["sentence"] }).ready;
    await press("sentence");
    const [text] = writeText.mock.calls[0] as [string];
    const [line, named] = text.split("\n");
    expect(line).toBe("East leads with 340, 61% of the total.");
    expect(named).toMatch(/^— Revenue by region · Source: Finance ledger · http.*#W-[A-Z0-9]{4}$/);
    await vi.waitFor(() => expect(said()?.textContent).toBe("Sentence copied"));
  });

  test("a card with no takeaway (a single number) gives its title and subtitle instead", async () => {
    const kpi = { id: "total", title: "Revenue", subtitle: "This quarter", data: { type: "inline", rows }, view: { type: "kpi", value: "revenue" } } as WidgetSpec;
    await createWidget(document.body, kpi, { actions: ["sentence"] }).ready;
    await press("sentence");
    expect((writeText.mock.calls[0] as [string])[0]).toMatch(/^Revenue: This quarter\n— http/);
  });

  test("speaks the card's language: French labels and receipt", async () => {
    await createWidget(document.body, spec({ locale: "fr-FR" }), { actions: ["link", "sentence"] }).ready;
    expect(document.querySelector('[data-action="link"]')?.getAttribute("aria-label")).toBe("Copier le lien de cette carte");
    expect(document.querySelector('[data-action="sentence"]')?.getAttribute("aria-label")).toBe("Copier en une phrase");
  });
});
