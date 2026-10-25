// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";

/**
 * The developer pages: the Embed page shows the code under every example, with a Copy button, and the Data guide is
 * a page to search, its long detail folded, not a 174,030px wall.
 */

/** A page loaded into this document, its scripts from files run in order (the site runs nothing inline). */
function load(file: string, scripts: string[], hash = "") {
  const html = readFileSync(file, "utf8");
  const parsed = new DOMParser().parseFromString(html, "text/html");
  document.body.replaceChildren(...[...parsed.body.childNodes].map((node) => document.importNode(node, true)));
  history.replaceState(null, "", `/${file}${hash}`);
  for (const script of scripts) new Function(readFileSync(script, "utf8"))();
  return parsed;
}

/** What is open on a page: everything but the content of closed disclosures (their summaries stay), and templates. */
function openContent(doc: Document): { nodes: number; text: number } {
  const copy = doc.body.cloneNode(true) as HTMLElement;
  for (const details of copy.querySelectorAll("details:not([open])")) {
    for (const child of [...details.children]) if (child.tagName !== "SUMMARY") child.remove();
  }
  for (const template of copy.querySelectorAll("template, script")) template.remove();
  return { nodes: copy.querySelectorAll("*").length, text: (copy.textContent ?? "").replace(/\s+/g, " ").length };
}

const inline = (doc: Document) => [...doc.querySelectorAll("script:not([src])")].filter((node) => node.getAttribute("type") !== "application/json" && (node.textContent ?? "").trim());

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("the Embed page", () => {
  test("every example draws from its own template and shows that code under it, with a Copy button", () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x".repeat(2048))));
    const parsed = load("examples/drop-in.html", ["examples/drop-in.js"]);
    expect(inline(parsed)).toEqual([]);
    const examples = [...document.querySelectorAll(".example")];
    expect(examples.length).toBeGreaterThanOrEqual(6);
    for (const example of examples) {
      const template = example.querySelector("template") as HTMLTemplateElement;
      const code = example.querySelector(".snippet pre code")?.textContent ?? "";
      const button = example.querySelector(".snippet button");
      expect([example.querySelector("h2")?.textContent, Boolean(code), button?.textContent]).toEqual([example.querySelector("h2")?.textContent, true, "Copy"]);
      // The live chart is the template's own markup, and so is the code (its file addresses made absolute).
      expect(example.querySelector(".live")?.children.length).toBeGreaterThan(0);
      const first = template.content.firstElementChild?.tagName.toLowerCase() ?? "";
      expect(code.startsWith(`<${first}`)).toBe(true);
    }
    const byTitle = (title: string) => examples.find((e) => e.querySelector("h2")?.textContent === title)?.querySelector("code")?.textContent ?? "";
    expect(byTitle("The spec inside the tag")).toContain('"view": { "type": "hbar"');
    expect(byTitle("A spec file")).toContain(`src="${location.origin}/widgets/revenue-by-region.json"`);
    expect(byTitle("From JavaScript")).toContain("function liveExample(el)");
    expect(byTitle("In an iframe, on any site")).toContain(`src="${location.origin}/examples/embed.html?src=../widgets/revenue-kpi.json"`);
    expect(byTitle("In an iframe, on any site")).toContain(`src="${location.origin}/examples/embed-host.js"`);
  });

  test("Copy puts the example's code on the clipboard; the bundle note names all three bundles with a script line to copy", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x".repeat(4096))));
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    load("examples/drop-in.html", ["examples/drop-in.js"]);
    const example = document.querySelector(".example") as HTMLElement;
    (example.querySelector(".snippet button") as HTMLButtonElement).click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(example.querySelector(".snippet code")?.textContent);
    const bundles = [...document.querySelectorAll(".bundles a[data-bundle]")].map((a) => a.getAttribute("href"));
    expect(bundles).toEqual(["../dist/martcharts-lite.iife.js", "../dist/martcharts.iife.js", "../dist/martcharts-reading.iife.js"]);
    expect(document.querySelector('[data-snippet="bundle"] code')?.textContent).toBe(`<script src="${location.origin}/dist/martcharts-lite.iife.js"></script>`);
    await vi.waitFor(() => expect(document.querySelector(".bundles [data-size]")?.textContent).toBe("(4 KB)"));
  });
});

describe("the Data guide", () => {
  const guide = () => new DOMParser().parseFromString(readFileSync("catalog/guide.html", "utf8"), "text/html");

  test("has a search, every chart's detail and the switch matrix folded, and no inline script", () => {
    const doc = guide();
    expect(inline(doc)).toEqual([]);
    expect(doc.querySelector('input#find[type="search"]')).not.toBeNull();
    const charts = [...doc.querySelectorAll("section.chart")];
    expect(charts.length).toBe(57);
    for (const chart of charts) expect([chart.id, chart.querySelector(":scope > details.more:not([open])") !== null, Boolean(chart.getAttribute("data-search"))]).toEqual([chart.id, true, true]);
    expect(doc.querySelector("details.matrix-box:not([open]) .matrix")).not.toBeNull();
    // No chart loads until its detail opens.
    expect(doc.querySelectorAll("fft-widget[src]").length).toBe(0);
    expect(doc.querySelectorAll("fft-widget[data-src]").length).toBe(57);
  });

  test("folded, the page stays small: headings and summaries first, not 174,030px of detail", () => {
    const { nodes, text } = openContent(guide());
    // Measured when folded: 826 elements and about 19,000 characters, against 34,879 elements in the whole page.
    expect(nodes).toBeLessThan(1_500);
    expect(text).toBeLessThan(30_000);
  });

  test("Find filters the charts by name or job, with a count; a link to a chart opens its detail and loads it", () => {
    load("catalog/guide.html", ["catalog/guide.js"], "#c-pie");
    const pie = document.querySelector("#c-pie details.more") as HTMLDetailsElement;
    expect(pie.open).toBe(true);
    expect(document.querySelector("#w-pie")?.getAttribute("src")).toBe("pie.json");
    const find = document.getElementById("find") as HTMLInputElement;
    find.value = "map";
    find.dispatchEvent(new Event("input"));
    const shown = [...document.querySelectorAll("section.chart")].filter((s) => !(s as HTMLElement).hidden).map((s) => s.id);
    expect(shown).toEqual(expect.arrayContaining(["c-choropleth", "c-symbols", "c-locator"]));
    expect(document.getElementById("count")?.textContent).toBe(`${shown.length} of 57`);
    find.value = "zzzz";
    find.dispatchEvent(new Event("input"));
    expect((document.getElementById("none") as HTMLElement).hidden).toBe(false);
  });
});
