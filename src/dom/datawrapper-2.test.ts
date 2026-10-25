// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { highlightedNames, matchRule } from "../core/rules.ts";
import { activeBreakpoints, atWidth } from "../core/responsive.ts";
import { isRich, richLines } from "../core/rich.ts";
import { sheetCsvUrl } from "../core/sources.ts";
import { getBlock } from "../core/registry.ts";
import type { Row, WidgetSpec } from "../core/types.ts";
import { hasErrors, validateSpec } from "../core/validate.ts";
import { frameEmbed, fromBase64Url, HEIGHT_MESSAGE, listenForEmbedHeights, mountEmbed, postHeights, toBase64Url } from "./embed.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
});

async function draw(spec: Omit<WidgetSpec, "data"> & { rows: Row[] }) {
  const { rows, ...rest } = spec;
  const widget = createWidget(target, { locale: "en-US", data: { type: "inline", rows }, ...rest } as WidgetSpec);
  await widget.ready;
  return widget;
}
const all = (selector: string) => [...target.querySelectorAll(selector)] as HTMLElement[];
const regions: Row[] = [
  { region: "North", change: 120, revenue: 1_400_000 },
  { region: "South", change: -40, revenue: 600_000 },
  { region: "East", change: 75, revenue: 2_100_000 },
  { region: "West", change: -15, revenue: 900_000 },
  { region: "Centre", change: 10, revenue: 1_050_000 },
];
const errors = (spec: unknown) => validateSpec(spec).filter((issue) => issue.level === "error").map((issue) => `${issue.path}: ${issue.message}`);

describe("the shared rule matcher", () => {
  test("compares numbers as numbers, text as text, lists for in, and never matches a missing value", () => {
    const row = { revenue: 1_200_000, status: "Late", region: "East", gap: null };
    expect([
      matchRule({ field: "revenue", op: ">", value: 1_000_000 }, row),
      matchRule({ field: "revenue", op: "<=", value: "1200000" }, row),
      matchRule({ field: "status", op: "==", value: "Late" }, row),
      matchRule({ field: "status", op: "!=", value: "Late" }, row),
      matchRule({ field: "region", op: "in", value: ["East", "West"] }, row),
      matchRule({ field: "region", op: "not in", value: ["East"] }, row),
      matchRule({ field: "gap", op: "<", value: 0 }, row),
      matchRule({ op: "==", value: "East" }, row, "region"),
    ]).toEqual([true, true, true, false, true, false, false, true]);
  });

  test("a highlight rule names the categories it picks; top N picks the largest, by the first measure unless one is named", () => {
    expect(highlightedNames({ field: "revenue", op: ">", value: 1_000_000 }, regions, "region")).toEqual(["North", "East", "Centre"]);
    expect(highlightedNames({ top: 2 }, regions, "region")).toEqual(["North", "East"]);
    expect(highlightedNames({ top: 2, field: "revenue" }, regions, "region")).toEqual(["East", "North"]);
    expect(highlightedNames({ top: 1, field: "change", order: "asc" }, regions, "region")).toEqual(["South"]);
  });
});

describe("colour by rules", () => {
  const rules = [{ field: "change", op: "<", value: 0, color: "down" }];

  test("an hbar wears the down colour on every bar below zero, the palette on the rest", async () => {
    await draw({ rows: regions, colorRules: rules, view: { type: "hbar", label: "region", value: "change" } } as never);
    const fills = all(".fft-hbar-fill").map((fill) => fill.style.background);
    expect(fills.filter((c) => c === "var(--fft-down)")).toHaveLength(2);
    expect(fills.filter((c) => c !== "var(--fft-down)")).toHaveLength(3);
  });

  test("a bar chart wears it too, by its category", async () => {
    await draw({ rows: regions, colorRules: rules, view: { type: "bar", x: "region", y: "change" } } as never);
    const fills = all("path.fft-bar").map((bar) => bar.style.fill);
    expect(fills.filter((c) => c === "var(--fft-down)")).toHaveLength(2);
  });

  test("the rules are written in words above the chart, only the ones that colour something, so colour never speaks alone", async () => {
    await draw({
      rows: regions,
      fields: { change: { label: "Change", format: { type: "number" } } },
      colorRules: [...rules, { field: "change", op: ">", value: 1000, color: "#2f6fdb" }, { field: "region", op: "==", value: "East", color: "up", label: "Our home market" }],
      view: { type: "hbar", label: "region", value: "change" },
    } as never);
    const key = target.querySelector(".fft-rule-key") as HTMLElement;
    expect(key.getAttribute("aria-label")).toBe("What the colours mean");
    expect([...key.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["Change below 0", "Our home market"]);
    // The key comes first in the chart, as every legend does.
    expect(target.querySelector(".fft-body")?.firstElementChild).toBe(key);
  });

  test("a rule's colour wins over a fixed colour, and a rule with no field reads the mark's own category", async () => {
    await draw({ rows: regions, colors: { North: "#123456", South: "#654321" }, colorRules: [{ op: "==", value: "North", color: "#abcdef" }], view: { type: "hbar", label: "region", value: "revenue" } } as never);
    const byName = Object.fromEntries(all(".fft-hbar").map((row) => [row.querySelector(".fft-hbar-label")?.textContent, (row.querySelector(".fft-hbar-fill") as HTMLElement).style.background]));
    expect(byName.North).toBe("rgb(171, 205, 239)");
    expect(byName.South).toBe("rgb(101, 67, 33)");
  });

  test("validation refuses a broken rule and any colour that could escape its style", () => {
    const base = { data: { type: "inline", rows: [] }, view: { type: "hbar", label: "region", value: "change" } };
    expect(errors({ ...base, colorRules: [{ field: "change", op: ">", value: 0, color: "teal" }] })).toEqual([]);
    expect(errors({ ...base, colorRules: [{ field: "change", op: "~", value: 0, color: "teal" }] }).join(" ")).toMatch(/op must be one of/);
    expect(errors({ ...base, colorRules: [{ field: "change", op: ">", value: "lots", color: "teal" }] }).join(" ")).toMatch(/must be a number/);
    expect(errors({ ...base, colorRules: [{ field: "change", op: ">", value: 0, color: "url(https://evil.example/x)" }] }).join(" ")).toMatch(/is not a colour/);
    expect(errors({ ...base, colorRules: [{ field: "change", op: ">", value: 0, color: "red; background: url(x)" }] }).join(" ")).toMatch(/is not a colour/);
    expect(errors({ ...base, colorRules: "red" }).join(" ")).toMatch(/must be a list/);
  });

  test("the key speaks the widget's language", async () => {
    await draw({ locale: "fr-FR", rows: regions, colorRules: rules, view: { type: "hbar", label: "region", value: "change" } } as never);
    expect(target.querySelector(".fft-rule-key")?.getAttribute("aria-label")).toBe("Ce que disent les couleurs");
    expect(target.querySelector(".fft-rule-key li")?.textContent).toBe("Change en dessous de 0");
  });
});

describe("highlight by number", () => {
  const lit = () => all(".fft-hbar-fill").filter((fill) => fill.style.background !== "var(--fft-deemphasis)").length;

  test("{ field, op, value } keeps the bars above 1M in colour", async () => {
    await draw({ rows: regions, view: { type: "hbar", label: "region", value: "revenue", highlight: { field: "revenue", op: ">", value: 1_000_000 } } });
    expect(lit()).toBe(3);
  });

  test("{ top: 3 } lights the top three", async () => {
    await draw({ rows: regions, view: { type: "hbar", label: "region", value: "revenue", highlight: { top: 3 } } });
    expect(lit()).toBe(3);
    const names = all(".fft-hbar").filter((row) => (row.querySelector(".fft-hbar-fill") as HTMLElement).style.background !== "var(--fft-deemphasis)").map((row) => row.querySelector(".fft-hbar-label")?.textContent);
    expect(names.sort()).toEqual(["Centre", "East", "North"].sort());
  });

  test("it works wherever highlight works: a donut keeps its matching slices", async () => {
    await draw({ rows: regions, view: { type: "donut", label: "region", value: "revenue", highlight: { field: "revenue", op: ">=", value: 1_400_000 } } });
    const strokes = all(".fft-slice").map((slice) => slice.style.stroke);
    expect(strokes.filter((s) => s.includes("deemphasis"))).toHaveLength(3);
  });

  test("a rule that picks nothing lights nothing, rather than everything", async () => {
    await draw({ rows: regions, view: { type: "hbar", label: "region", value: "revenue", highlight: { field: "revenue", op: ">", value: 1e12 } } });
    expect(lit()).toBe(0);
  });

  test("validation: a bad rule, a bad top, and a rule on a view that highlights series are errors", () => {
    const base = { data: { type: "inline", rows: [] } };
    expect(errors({ ...base, view: { type: "hbar", label: "region", value: "revenue", highlight: { top: 0 } } }).join(" ")).toMatch(/top must be a whole number/);
    expect(errors({ ...base, view: { type: "hbar", label: "region", value: "revenue", highlight: { field: "revenue", op: "!!", value: 1 } } }).join(" ")).toMatch(/op must be one of/);
    expect(errors({ ...base, view: { type: "line", x: "month", y: "revenue", highlight: { top: 2 } } }).join(" ")).toMatch(/highlights series/);
    expect(errors({ ...base, view: { type: "hbar", label: "region", value: "revenue", highlight: { top: 2 } } })).toEqual([]);
  });
});

describe("rich tooltips", () => {
  const ctx = {
    format: (value: unknown) => String(value),
    formatAs: (value: unknown, format: string) => (format === "percent" ? `${Math.round(Number(value) * 100)}%` : String(value)),
    max: () => 200,
    summarize: (token: string) => (token === "{count}" ? "5" : token),
  };

  test("the template is read once into runs: bold, named formats, bars and summary tokens", () => {
    const lines = richLines("**{region}** grew {share|percent}\n{revenue|bar} of {count}", { region: "East", share: 0.25, revenue: 100 }, ctx);
    expect(lines).toEqual([
      [{ text: "East", bold: true }, { text: " grew " }, { text: "25%" }],
      [{ bar: 0.5 }, { text: " of " }, { text: "5" }],
    ]);
    expect([isRich("Revenue: {revenue}"), isRich("**{region}**"), isRich("{revenue|bar}")]).toEqual([false, true, true]);
  });

  test("data is never read as markup: a value with ** or braces stays text", () => {
    const lines = richLines("**{name}**", { name: "**not bold** {count}" }, ctx);
    expect(lines).toEqual([[{ text: "**not bold** {count}", bold: true }]]);
  });

  test("the tooltip writes bold in <strong> and a small bar, and hostile values stay text", async () => {
    const hostile = '<img src=x onerror="window.__pwned = true">';
    await draw({
      rows: [{ region: hostile, revenue: 50 }, { region: "East", revenue: 100 }],
      tooltip: "**{region}**\nRevenue {revenue} {revenue|bar}",
      view: { type: "hbar", label: "region", value: "revenue" },
    } as never);
    const first = all(".fft-hbar")[0] as HTMLElement;
    first.dispatchEvent(new Event("focus"));
    const tip = target.querySelector(".fft-tooltip") as HTMLElement;
    expect(tip.querySelector("img")).toBeNull();
    expect(tip.querySelector("strong")?.textContent).toBe(hostile);
    expect(tip.querySelectorAll(".fft-tooltip-rich")).toHaveLength(2);
    expect((tip.querySelector(".fft-tooltip-bar-fill") as HTMLElement).style.width).toBe("50%");
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  test("a plain template keeps its label and value rows", async () => {
    await draw({ rows: regions, tooltip: "Revenue: {revenue}", view: { type: "hbar", label: "region", value: "revenue" } } as never);
    all(".fft-hbar")[0]?.dispatchEvent(new Event("focus"));
    expect(target.querySelectorAll(".fft-tooltip-rich")).toHaveLength(0);
    expect(target.querySelector(".fft-tooltip-label")?.textContent).toBe("Revenue");
  });
});

describe("live data", () => {
  /** A url source that answers with a growing number, or fails on demand. */
  function liveFetch() {
    let calls = 0;
    let failing = false;
    const fetch = vi.fn(async () => {
      calls++;
      if (failing) return new Response("down", { status: 503 });
      return new Response(JSON.stringify([{ region: "North", revenue: calls * 100 }]), { status: 200, headers: { "content-type": "application/json" } });
    });
    return { fetch: fetch as unknown as typeof globalThis.fetch, fail: (on: boolean) => (failing = on), calls: () => calls };
  }

  async function liveWidget(refresh: number) {
    const live = liveFetch();
    const widget = createWidget(target, { locale: "en-GB", data: { type: "url", url: "/live.json", refresh }, view: { type: "hbar", label: "region", value: "revenue" } }, { fetch: live.fetch });
    await widget.ready;
    return { widget, live };
  }
  const stamp = () => target.querySelector(".fft-updated") as HTMLElement;

  test("reloads on its beat, redraws with the new rows, and says when", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    vi.setSystemTime(new Date("2026-10-25T12:04:00Z"));
    const { widget, live } = await liveWidget(30);
    expect(live.calls()).toBe(1);
    expect(stamp().hidden).toBe(false);
    expect(stamp().textContent).toMatch(/^Updated \d\d:\d\d$/);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(live.calls()).toBe(2);
    expect(widget.rows[0]?.revenue).toBe(200);
    expect(target.querySelector(".fft-hbar-value")?.textContent).toBe("200");
    widget.destroy();
  });

  test("a failed reload keeps the last rows and says it could not update", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const { widget, live } = await liveWidget(10);
    live.fail(true);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(widget.rows[0]?.revenue).toBe(100);
    expect(target.querySelector(".fft-widget")?.getAttribute("data-state")).toBe("ready");
    expect(stamp().textContent).toMatch(/^Could not update; showing data from \d\d:\d\d$/);
    live.fail(false);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(stamp().textContent).toMatch(/^Updated /);
    widget.destroy();
  });

  test("pauses while the page is hidden, and catches up as soon as it shows again", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    let state: DocumentVisibilityState = "visible";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
    const { widget, live } = await liveWidget(5);
    state = "hidden";
    await vi.advanceTimersByTimeAsync(60_000);
    expect(live.calls()).toBe(1);
    state = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(live.calls()).toBe(2);
    widget.destroy();
    Reflect.deleteProperty(document, "visibilityState");
  });

  test("stops on destroy, never reloads faster than every 5 seconds, and a source without refresh shows no stamp", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const { widget, live } = await liveWidget(1);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(live.calls()).toBe(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(live.calls()).toBe(2);
    widget.destroy();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(live.calls()).toBe(2);
    target.innerHTML = "";
    await draw({ rows: regions, view: { type: "hbar", label: "region", value: "revenue" } });
    expect(target.querySelector(".fft-updated")).toBeNull();
  });

  test("the stamp speaks the widget's language", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const live = liveFetch();
    const widget = createWidget(target, { locale: "de-DE", data: { type: "url", url: "/live.json", refresh: 30 }, view: { type: "hbar", label: "region", value: "revenue" } }, { fetch: live.fetch });
    await widget.ready;
    expect(stamp().textContent).toMatch(/^Aktualisiert \d\d:\d\d$/);
    widget.destroy();
  });

  test("refresh is declared on url, csv and sheet sources", () => {
    for (const type of ["url", "csv", "sheet"]) expect([type, "refresh" in getBlock("source", type).options]).toEqual([type, true]);
  });
});

describe("Google Sheets", () => {
  test("any sheet address becomes its CSV export, the tab kept", () => {
    expect(sheetCsvUrl("https://docs.google.com/spreadsheets/d/1AbC_d-9/edit#gid=42")).toBe("https://docs.google.com/spreadsheets/d/1AbC_d-9/export?format=csv&gid=42");
    expect(sheetCsvUrl("https://docs.google.com/spreadsheets/d/1AbC_d-9/edit?usp=sharing")).toBe("https://docs.google.com/spreadsheets/d/1AbC_d-9/export?format=csv");
    expect(sheetCsvUrl("https://docs.google.com/spreadsheets/d/e/2PACX-xyz/pubhtml?gid=7&single=true")).toBe("https://docs.google.com/spreadsheets/d/e/2PACX-xyz/pub?output=csv&gid=7");
    expect(sheetCsvUrl("https://docs.google.com/spreadsheets/d/1AbC/edit", 3)).toBe("https://docs.google.com/spreadsheets/d/1AbC/export?format=csv&gid=3");
    expect(sheetCsvUrl("https://example.com/data.csv")).toBe("https://example.com/data.csv");
  });

  test("the sheet source reads the export as CSV", async () => {
    const seen: string[] = [];
    const fetch = (async (input: RequestInfo | URL) => {
      seen.push(String(input));
      return new Response("region,revenue\nNorth,120\nSouth,80", { status: 200 });
    }) as typeof globalThis.fetch;
    const widget = createWidget(target, { data: { type: "sheet", url: "https://docs.google.com/spreadsheets/d/abc/edit#gid=0", cache: 0 }, view: { type: "table" } }, { fetch });
    await widget.ready;
    expect(seen).toEqual(["https://docs.google.com/spreadsheets/d/abc/export?format=csv&gid=0"]);
    expect(widget.rows).toEqual([{ region: "North", revenue: 120 }, { region: "South", revenue: 80 }]);
  });

  test("a sheet address must be a full address", () => {
    expect(errors({ data: { type: "sheet", url: "docs.google.com/x" }, view: { type: "table" } }).join(" ")).toMatch(/full address/);
  });
});

describe("embeds that size themselves", () => {
  test("a frame posts its height to the parent on load and whenever it changes, and never the same height twice", () => {
    const posted: unknown[] = [];
    let observed: (() => void) | undefined;
    let height = 233;
    const el = { getBoundingClientRect: () => ({ height }), scrollHeight: 0 } as unknown as Element;
    const win = {
      parent: { postMessage: (message: unknown) => posted.push(message) },
      addEventListener: () => {},
      removeEventListener: () => {},
      ResizeObserver: class {
        constructor(callback: () => void) {
          observed = callback;
        }
        observe() {}
        disconnect() {}
      },
    } as unknown as Window;
    const stop = postHeights(win, el);
    expect(posted).toEqual([{ type: HEIGHT_MESSAGE, height: 233 }]);
    height = 377.4;
    observed?.();
    observed?.();
    expect(posted).toEqual([{ type: HEIGHT_MESSAGE, height: 233 }, { type: HEIGHT_MESSAGE, height: 378 }]);
    stop();
  });

  test("outside a frame nothing is posted", () => {
    expect(() => postHeights(window, document.body)()).not.toThrow();
  });

  test("the host sets the height of the iframe each message came from, and ignores anything else", () => {
    const frame = document.createElement("iframe");
    const other = document.createElement("iframe");
    document.body.append(frame, other);
    const stop = listenForEmbedHeights(window);
    window.dispatchEvent(new MessageEvent("message", { data: { type: HEIGHT_MESSAGE, height: 412.2 }, source: frame.contentWindow }));
    window.dispatchEvent(new MessageEvent("message", { data: { type: "other", height: 900 }, source: other.contentWindow }));
    window.dispatchEvent(new MessageEvent("message", { data: { type: HEIGHT_MESSAGE, height: -1 }, source: other.contentWindow }));
    expect([frame.style.height, other.style.height]).toEqual(["413px", ""]);
    stop();
  });

  test("the embed page draws a widget from ?spec=, a spec file from ?src=, or a dashboard from ?board=", async () => {
    const spec: WidgetSpec = { title: "Revenue", data: { type: "inline", rows: regions }, view: { type: "hbar", label: "region", value: "revenue" } };
    const one = mountEmbed(document, `?spec=${toBase64Url(JSON.stringify(spec))}&actions=csv`);
    await one.ready;
    expect(document.querySelector(".fft-embed .fft-title")?.textContent).toBe("Revenue");
    one.stop();
    const fetch = (async () => new Response(JSON.stringify(spec), { status: 200 })) as typeof globalThis.fetch;
    const two = mountEmbed(document, "?src=/widgets/revenue.json", { fetch });
    await two.ready;
    expect(document.querySelectorAll(".fft-embed .fft-hbar")).toHaveLength(5);
    two.stop();
    const board = { title: "Board", widgets: [{ spec }] };
    const three = mountEmbed(document, `?board=${toBase64Url(JSON.stringify(board))}`);
    await three.ready;
    expect(document.querySelector(".fft-embed .fft-dashboard")).not.toBeNull();
    three.stop();
    const none = mountEmbed(document, "");
    expect(document.querySelector(".fft-embed")?.textContent).toMatch(/Nothing to show/);
    none.stop();
  });

  test("the iframe code carries the spec in its address, escapes its title, and loads the host script beside the page", () => {
    const spec: WidgetSpec = { title: 'A "quoted" <title>', data: { type: "inline", rows: [{ a: "é" }] }, view: { type: "table" } };
    const code = frameEmbed("widget", spec, "https://charts.example.com/examples/embed.html", spec.title as string);
    const src = code.match(/src="([^"]+)"/)?.[1] as string;
    expect(src.startsWith("https://charts.example.com/examples/embed.html?spec=")).toBe(true);
    expect(JSON.parse(fromBase64Url(new URL(src).searchParams.get("spec") as string))).toEqual(spec);
    expect(code).toContain('title="A &quot;quoted&quot; &lt;title&gt;"');
    expect(code).toContain('<script src="https://charts.example.com/examples/embed-host.js"></script>');
    expect(frameEmbed("board", { widgets: [] }, "embed.html", "B")).toMatch(/embed\.html\?board=/);
  });

  test("the static embed page loads the bundle and mounts the address; the host snippet sizes frames on its own", () => {
    const page = readFileSync("examples/embed.html", "utf8");
    expect(page).toContain('<script src="../dist/martcharts.iife.js"></script>');
    // Mounted from a file, never inline: the site's policy runs scripts from the site only.
    expect(page).toContain('<script src="embed.js"></script>');
    expect(readFileSync("examples/embed.js", "utf8")).toContain("MartCharts.mountEmbed(document, location.search)");
    const frame = document.createElement("iframe");
    document.body.append(frame);
    new Function(readFileSync("examples/embed-host.js", "utf8"))();
    window.dispatchEvent(new MessageEvent("message", { data: { type: HEIGHT_MESSAGE, height: 300 }, source: frame.contentWindow }));
    expect(frame.style.height).toBe("300px");
  });
});

describe("breakpoints", () => {
  const spec = {
    rows: regions,
    responsive: [
      { maxWidth: 600, override: { view: { limit: 3 } } },
      { maxWidth: 400, override: { view: { limit: 2 }, style: { height: 144 } } },
    ],
    view: { type: "hbar", label: "region", value: "revenue", sort: "value" },
  };

  test("the narrowest matching rule has the last word; only view and style change", () => {
    const at = (width: number) => atWidth({ data: { type: "inline", rows: [] }, ...spec } as unknown as WidgetSpec, width);
    expect([at(900).view.limit, at(500).view.limit, at(320).view.limit, at(320).style?.height]).toEqual([undefined, 3, 2, 144]);
    expect(activeBreakpoints(spec.responsive as never, 320).map((rule) => rule.maxWidth)).toEqual([600, 400]);
  });

  test("a narrow card draws the override, and redraws when the card is resized across a breakpoint", async () => {
    let width = 320;
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
    let resized: (() => void) | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    await draw(spec as never);
    expect(all(".fft-hbar").map((row) => row.querySelector(".fft-hbar-label")?.textContent)).toEqual(["East", "North"]);
    width = 900;
    resized?.();
    expect(all(".fft-hbar")).toHaveLength(5);
    width = 500;
    resized?.();
    expect(all(".fft-hbar")).toHaveLength(3);
  });

  test("validation checks each rule's shape and warns about keys that never change with the width", () => {
    const base = { data: { type: "inline", rows: [] }, view: { type: "table" } };
    expect(errors({ ...base, responsive: [{ maxWidth: 480, override: { view: { sortable: false } } }] })).toEqual([]);
    expect(errors({ ...base, responsive: [{ maxWidth: -1, override: {} }] }).join(" ")).toMatch(/width in pixels/);
    expect(errors({ ...base, responsive: { maxWidth: 480 } }).join(" ")).toMatch(/Must be a list/);
    const warnings = validateSpec({ ...base, responsive: [{ maxWidth: 480, override: { title: "Short" } }] }).filter((i) => i.level === "warning");
    expect(warnings.map((w) => w.path)).toContain("responsive[0].override.title");
    expect(hasErrors(validateSpec({ ...base, responsive: [{ maxWidth: 480, override: { title: "Short" } }] }))).toBe(false);
  });
});
