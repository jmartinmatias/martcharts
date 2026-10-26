// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import { FIND_JS } from "../scripts/find.ts";

interface Item {
  id: string;
  keywords: string[];
  everything: string[];
}
interface Find {
  readRef(text: string): { ref: string; sure: boolean } | null;
  lookUpRef(text: string, base: string): Promise<{ ref: string; found: { ref: string; url: string }[] } | null>;
  refItems(result: { ref: string; found: unknown[] }, base: string, onHere: (hash: string) => void): HTMLLIElement[];
  tokens(text: string): string[];
  matchWords<T extends { keywords: string[]; everything: string[] }>(words: string[], items: T[]): T[];
}

// The browser code both catalog pages carry, run as the page runs it.
const find = new Function(`${FIND_JS}; return { readRef, lookUpRef, refItems, tokens, matchWords };`)() as Find;

function cards(file: string, prefix = ""): Item[] {
  const page = readFileSync(file, "utf8");
  const decode = (text: string) => text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'");
  return [...page.matchAll(/<section class="(?:card|chart)" id="([^"]+)"[^>]*?data-search="([^"]*)"(?: data-more="([^"]*)")?/g)].map((m) => ({
    id: (m[1] ?? "").replace(prefix, ""),
    keywords: find.tokens(decode(m[2] ?? "")),
    everything: find.tokens(`${decode(m[2] ?? "")} ${decode(m[3] ?? "")}`),
  }));
}

describe("catalog search", () => {
  test("a ref reads however it is typed: W-M9C7, w-m9c7, W M9C7, and a bare M9C7 (only when the index has it)", () => {
    expect(["W-M9C7", "w-m9c7", "W M9C7", " wm9c7 "].map((text) => find.readRef(text))).toEqual(Array(4).fill({ ref: "W-M9C7", sure: true }));
    expect(find.readRef("M9C7")).toEqual({ ref: "W-M9C7", sure: false });
    // A word made of ref letters is not a ref unless the index knows it; I, L, O and U never appear in a ref.
    expect([find.readRef("line"), find.readRef("trend")]).toEqual([null, null]);
  });

  test("a bare code the index does not know stays a word search; a full ref the index does not know says so", async () => {
    const index = [{ ref: "W-M9C7", url: "catalog/index.html#bullet", where: "Catalog › bullet", title: "September scorecard" }];
    vi.stubGlobal("fetch", async () => ({ json: async () => index }));
    try {
      expect((await find.lookUpRef("m9c7", "../"))?.found.length).toBe(1);
      expect(await find.lookUpRef("area", "../")).toBe(null);
      expect(await find.lookUpRef("W-AREA", "../")).toEqual({ ref: "W-AREA", found: [] });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("a ref's link to a chart on this page clears the way to it instead of landing on a hidden card", () => {
    const here = new URL(location.href);
    const onHere = vi.fn();
    const [item] = find.refItems({ ref: "W-M9C7", found: [{ ref: "W-M9C7", url: `${here.pathname.slice(1)}#bullet`, where: "Catalog › bullet", title: "September scorecard" }] }, "/", onHere);
    const link = item?.querySelector("a") as HTMLAnchorElement;
    const event = new MouseEvent("click", { cancelable: true });
    link.dispatchEvent(event);
    expect([onHere.mock.calls[0]?.[0], event.defaultPrevented]).toEqual(["#bullet", true]);
    // A link to another page is followed as usual.
    const [other] = find.refItems({ ref: "W-8MHX", found: [{ ref: "W-8MHX", url: "dashboards.html?board=commercial#W-8MHX", where: "Dashboards", title: "Campaigns" }] }, "/elsewhere/", onHere);
    const away = new MouseEvent("click", { cancelable: true });
    other?.querySelector("a")?.dispatchEvent(away);
    expect(away.defaultPrevented).toBe(false);
  });

  test.each([
    ["catalog/index.html", ""],
    ["catalog/guide.html", "c-"],
  ])("in %s, share finds the part-to-whole charts, not the ones with a shared axis or a share price", (file, prefix) => {
    const found = find.matchWords(["share"], cards(file, prefix)).map((item) => item.id);
    expect(found).toEqual(expect.arrayContaining(["pie", "donut", "waffle", "treemap"]));
    for (const type of ["candlestick", "boxplot", "dumbbell", "slope", "radar"]) expect([type, found.includes(type)]).toEqual([type, false]);
  });

  test("a half-typed word still finds charts by the start of their words, and plural or singular both match", () => {
    const all = cards("catalog/index.html");
    expect(find.matchWords(["tre"], all).map((item) => item.id)).toEqual(expect.arrayContaining(["line"]));
    expect(find.matchWords(["shares"], all).map((item) => item.id)).toEqual(expect.arrayContaining(["pie"]));
  });

  test("both pages carry the search, a no-match line with a way to clear it, and a ref list", () => {
    for (const [html, js] of [["catalog/index.html", "catalog/catalog.js"], ["catalog/guide.html", "catalog/guide.js"]] as const) {
      const page = readFileSync(html, "utf8");
      const code = readFileSync(js, "utf8");
      expect([html, /id="none"[^>]*>[\s\S]*?<button type="button" id="clear">Clear search<\/button>/.test(page), page.includes('id="ref-hits"')]).toEqual([html, true, true]);
      expect([js, code.includes("function lookUpRef"), code.includes("showHere")]).toEqual([js, true, true]);
    }
  });
});

describe("the catalog page, end to end", () => {
  function load(file: string, script: string) {
    const parsed = new DOMParser().parseFromString(readFileSync(file, "utf8"), "text/html");
    document.body.replaceChildren(...[...parsed.body.childNodes].map((node) => document.importNode(node, true)));
    history.replaceState(null, "", `/${file}`);
    new Function(readFileSync(script, "utf8"))();
  }
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  test("typing a catalog chart's ref, then its link, lands on that card in view with the search cleared", async () => {
    const index = JSON.parse(readFileSync("docs/refs.json", "utf8")) as { ref: string; url: string }[];
    const entry = index.find((e) => e.url === "catalog/index.html#bullet") as { ref: string };
    vi.stubGlobal("fetch", async () => ({ json: async () => index, text: async () => "" }));
    Element.prototype.scrollIntoView = () => {};
    try {
      load("catalog/index.html", "catalog/catalog.js");
      const find = document.getElementById("find") as HTMLInputElement;
      // Typed the way people type it: lower case, a space for the dash.
      find.value = entry.ref.toLowerCase().replace("-", " ");
      find.dispatchEvent(new Event("input"));
      await settle();
      await settle();
      const link = document.querySelector("#ref-hits a") as HTMLAnchorElement;
      expect(link?.textContent).toContain("Catalog › bullet");
      link.click();
      const card = document.getElementById("bullet") as HTMLElement;
      expect([find.value, card.hidden, document.activeElement === card, location.hash, (document.getElementById("ref-hits") as HTMLElement).hidden]).toEqual(["", false, true, "#bullet", true]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("no match says so with the words typed, and Clear search brings every chart back", () => {
    load("catalog/index.html", "catalog/catalog.js");
    const find = document.getElementById("find") as HTMLInputElement;
    find.value = "qwxyz";
    find.dispatchEvent(new Event("input"));
    const none = document.getElementById("none") as HTMLElement;
    expect([none.hidden, none.textContent?.includes("No chart matches “qwxyz”.")]).toEqual([false, true]);
    (document.getElementById("clear") as HTMLButtonElement).click();
    expect([find.value, none.hidden, [...document.querySelectorAll(".card")].filter((c) => (c as HTMLElement).hidden).length]).toEqual(["", true, 0]);
  });
});
