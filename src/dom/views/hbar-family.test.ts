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
const widths = (selector: string) => all(selector).map((node) => (node as HTMLElement).style.width);
const selections = () => {
  const seen: Row[] = [];
  target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
  return seen;
};
const issues = (view: WidgetSpec["view"], rows: Row[] = channels) => validateSpec({ data: { type: "inline", rows }, view }, rows).filter((i) => i.level === "error").map((i) => i.message);

const channels = [
  { channel: "Paid search", leads: 400, won: 100 },
  { channel: "Partner referrals", leads: 200, won: 100 },
  { channel: "Social media", leads: 100, won: 0 },
];

describe("grouped hbar", () => {
  const spec = { rows: channels, view: { type: "hbar", label: "channel", value: ["leads", "won"] } };

  test("one thin bar per series in each row, all on one shared scale, each with its value at its end", async () => {
    await draw(spec);
    expect(target.querySelector(".fft-hbars")?.getAttribute("data-mode")).toBe("grouped");
    expect(texts(".fft-hbar-label")).toEqual(["Paid search", "Partner referrals", "Social media"]);
    expect(widths(".fft-hbar-fill")).toEqual(["100%", "25%", "50%", "25%", "25%", "0%"]);
    expect(texts(".fft-hbar-end")).toEqual(["400", "100", "200", "100", "100", "0"]);
  });

  test("a key above names each series in its color, with square swatches", async () => {
    await draw(spec);
    const swatches = all(".fft-legend .fft-swatch") as HTMLElement[];
    expect(texts(".fft-legend li")).toEqual(["Leads", "Won"]);
    expect(swatches.map((s) => [s.dataset.shape, s.style.background])).toEqual([
      ["rect", "var(--fft-series-1)"],
      ["rect", "var(--fft-series-2)"],
    ]);
    expect(all(".fft-hbar-fill").map((f) => (f as HTMLElement).style.background).slice(0, 2)).toEqual(["var(--fft-series-1)", "var(--fft-series-2)"]);
  });

  test("focusing a row lists every series; clicking selects the row; a muted row keeps a hint of each hue", async () => {
    const seen = selections();
    await draw({ ...spec, view: { ...spec.view, highlight: "Partner referrals" } });
    all(".fft-hbar")[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Partner referrals", "200Leads", "100Won"]);
    (all(".fft-hbar")[1] as HTMLElement).click();
    expect(seen).toEqual([channels[1]]);
    const fills = all(".fft-hbar-fill") as HTMLElement[];
    expect(fills[2]?.style.background).toBe("var(--fft-series-1)");
    expect(fills[0]?.style.background).toContain("var(--fft-deemphasis)");
    expect(fills[0]?.style.background).toContain("var(--fft-series-1)");
  });

  test("a hidden table behind the bars carries every series for screen readers, and each row is labelled", async () => {
    await draw(spec);
    expect(texts(".fft-sr-only th")).toEqual(["Channel", "Leads", "Won"]);
    expect(all(".fft-hbar")[0]?.getAttribute("aria-label")).toBe("Paid search: Leads 400, Won 100");
  });

  test("one value field keeps the classic ranking: no key, no mode, the value in its own column", async () => {
    await draw({ rows: channels, view: { type: "hbar", label: "channel", value: ["leads"] } });
    expect([all(".fft-legend").length, target.querySelector(".fft-hbars")?.hasAttribute("data-mode"), texts(".fft-hbar-value")]).toEqual([0, false, ["400", "200", "100"]]);
  });

  test("a lollipop takes one value only", () => {
    expect(issues({ type: "hbar", label: "channel", value: ["leads", "won"], mark: "lollipop" }).join(" ")).toContain("one dot per row");
    expect(issues({ type: "hbar", label: "channel", value: "leads", mark: "lollipop" })).toEqual([]);
  });
});

describe("stacked hbar", () => {
  test("one bar per row made of colored parts, the total at its end, parts scaled to the largest total", async () => {
    await draw({ rows: channels, view: { type: "hbar", label: "channel", value: ["leads", "won"], stacked: true } });
    expect(target.querySelector(".fft-hbars")?.getAttribute("data-mode")).toBe("stacked");
    expect(widths(".fft-hbar-seg")).toEqual(["80%", "20%", "40%", "20%", "20%", "0%"]);
    expect(texts(".fft-hbar-value")).toEqual(["500", "300", "100"]);
    expect(all(".fft-hbar-seg").map((s) => (s as HTMLElement).style.background).slice(0, 2)).toEqual(["var(--fft-series-1)", "var(--fft-series-2)"]);
  });

  test("percent stacks every row to 100%, writing each share inside its part where it fits, and nothing at the end", async () => {
    await draw({ rows: channels, view: { type: "hbar", label: "channel", value: ["leads", "won"], stacked: "percent" } });
    expect(widths(".fft-hbar-seg")).toEqual(["80%", "20%", "66.7%", "33.3%", "100%", "0%"]);
    expect(texts(".fft-hbar-seg-text")).toEqual(["80%", "20%", "67%", "33%", "100%"]);
    expect(all(".fft-hbar-value")).toHaveLength(0);
  });

  test("focus names every part with its share; pointing at one part names it alone", async () => {
    await draw({ rows: channels, view: { type: "hbar", label: "channel", value: ["leads", "won"], stacked: true } });
    all(".fft-hbar")[0]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Paid search", "400 (80%)Leads", "100 (20%)Won"]);
    all(".fft-hbar-seg")[1]?.dispatchEvent(new Event("pointerenter"));
    expect(texts(".fft-tooltip-row")).toEqual(["100 (20%)Won"]);
  });

  test("stacked must be true, false or percent, and never split as well", () => {
    expect(issues({ type: "hbar", label: "channel", value: ["leads", "won"], stacked: "yes" }).join(" ")).toContain('"percent"');
    expect(issues({ type: "hbar", label: "channel", value: ["leads", "won"], stacked: true, split: true }).join(" ")).toContain("cannot stack");
  });
});

describe("split hbar", () => {
  const regions = [
    { region: "East", revenue: 300, margin: 0.4 },
    { region: "West", revenue: 150, margin: 0.5 },
  ];
  const spec = { rows: regions, fields: { margin: { format: "percent" } }, view: { type: "hbar", label: "region", value: ["revenue", "margin"], split: true } };

  test("one column per measure, each headed by its field and scaled on its own largest value", async () => {
    await draw(spec);
    expect(target.querySelector(".fft-hbars")?.getAttribute("data-mode")).toBe("split");
    expect((target.querySelector(".fft-hbars") as HTMLElement).style.getPropertyValue("--fft-splits")).toBe("2");
    expect(texts(".fft-hbar-head .fft-hbar-col-title")).toEqual(["Revenue", "Margin"]);
    expect(texts(".fft-hbar:not(.fft-hbar-head) .fft-hbar-label")).toEqual(["East", "West"]);
    expect(widths(".fft-hbar-fill")).toEqual(["100%", "80%", "50%", "100%"]);
    expect(texts(".fft-hbar-end")).toEqual(["300", "40%", "150", "50%"]);
  });

  test("shared puts every column on one scale", async () => {
    await draw({ ...spec, view: { ...spec.view, shared: true } });
    expect(widths(".fft-hbar-fill")).toEqual(["100%", "0.1%", "50%", "0.2%"]);
  });

  test("no key: the column headings already name the measures, and the heading row is not a stop", async () => {
    await draw(spec);
    expect(all(".fft-legend").length).toBe(0);
    expect(target.querySelector(".fft-hbar-head")?.getAttribute("aria-hidden")).toBe("true");
    expect(all(".fft-hbar[tabindex]").length).toBe(2);
    all(".fft-hbar:not(.fft-hbar-head)")[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["West", "150Revenue", "50%Margin"]);
  });
});

describe("pyramid view", () => {
  const bands = [
    { age: "40-44", women: 100, men: 200 },
    { age: "30-34", women: 400, men: 300 },
    { age: "20-24", women: 50, men: 0 },
  ];
  const spec = { rows: bands, view: { type: "pyramid", label: "age", left: "women", right: "men" } };

  test("one row per band in the order given, the left count growing leftward and the right count rightward, on one scale", async () => {
    await draw(spec);
    expect(texts(".fft-pyr-label")).toEqual(["40-44", "30-34", "20-24"]);
    const bars = all(".fft-pyr-bar").map((bar) => [bar.getAttribute("data-side"), Number(bar.getAttribute("x")), Number(bar.getAttribute("width"))]);
    const [l1, r1, l2, r2] = bars as [string, number, number][];
    // Right bars all start at the same edge; left bars all end at the same (smaller) edge.
    expect([r1?.[1] === r2?.[1], (l1?.[1] ?? 0) + (l1?.[2] ?? 0) === (l2?.[1] ?? 0) + (l2?.[2] ?? 0), (l1?.[1] ?? 0) < (r1?.[1] ?? 0)]).toEqual([true, true, true]);
    // 400 women is the longest bar, 200 men half of it.
    expect((l2?.[2] ?? 0) / (r1?.[2] ?? 1)).toBeCloseTo(2, 5);
  });

  test("each half is headed by its field in its color, and every bar writes its value at its end", async () => {
    await draw(spec);
    expect(texts(".fft-pyr-head")).toEqual(["Women", "Men"]);
    expect(all(".fft-pyr-swatch").map((s) => (s as SVGElement).style.fill)).toEqual(["var(--fft-series-1)", "var(--fft-series-2)"]);
    expect(texts(".fft-pyr-value")).toEqual(["100", "200", "400", "300", "50", "0"]);
    expect(all(".fft-legend").length).toBe(0);
  });

  test("focus shows both counts and the total; clicking selects the band; the hidden table lists every row", async () => {
    const seen = selections();
    await draw(spec);
    all(".fft-pyr-hit")[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["30-34", "400Women", "300Men", "700Total"]);
    (all(".fft-pyr-hit")[0] as SVGElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(seen).toEqual([bands[0]]);
    expect(texts(".fft-sr-only th").slice(0, 3)).toEqual(["Age", "Women", "Men"]);
    expect(all(".fft-pyr-hit")[0]?.getAttribute("aria-label")).toBe("40-44: Women 100, Men 200, Total 300");
  });

  test("small multiples share one scale across panels", async () => {
    await draw({ rows: [...bands.map((b) => ({ ...b, site: "HQ" })), { age: "40-44", women: 10, men: 20, site: "Lab" }], facet: { field: "site" }, view: spec.view });
    const panels = all(".fft-facet");
    expect(panels.length).toBe(2);
    const widest = (panel: Element) => Math.max(...[...panel.querySelectorAll(".fft-pyr-bar")].map((bar) => Number(bar.getAttribute("width"))));
    expect(widest(panels[1] as Element) / widest(panels[0] as Element)).toBeCloseTo(20 / 400, 5);
  });

  test("negative counts draw as zero and are warned about", async () => {
    const rows = [...bands, { age: "15-19", women: -5, men: 3 }];
    const warnings = validateSpec({ data: { type: "inline", rows }, view: spec.view }, rows).map((i) => i.message).join(" ");
    expect(warnings).toContain("negative");
    await draw({ rows, view: spec.view });
    expect(Number(all(".fft-pyr-bar")[6]?.getAttribute("width"))).toBe(0);
  });
});

describe("words for the hbar family", () => {
  const spec = (view: WidgetSpec["view"], rows: Row[]): WidgetSpec => ({ locale: "en-US", data: { type: "inline", rows }, view });

  test("grouped, stacked and split bars each explain themselves and ask their own question", () => {
    const grouped = spec({ type: "hbar", label: "channel", value: ["leads", "won"] }, channels);
    expect(explainChart(grouped, channels)).toContain("Each row is one channel, with one bar each for leads and won: the longer the bar, the more.");
    // The key is on the chart: the guide no longer points at it.
    expect(explainChart(grouped, channels)).not.toMatch(/the key/);
    expect(explainChart(grouped, channels)).toContain("Here, Paid search leads on every measure, with 400 leads and 100 won.");
    expect(questionOf(grouped).text).toBe("How do leads and won compare for each channel?");
    const stacked = spec({ type: "hbar", label: "channel", value: ["leads", "won"], stacked: true }, channels);
    expect(explainChart(stacked, channels)).toContain("Here, Paid search has the longest bar in all, 500, and leads is its biggest part.");
    expect(questionOf(stacked).text).toBe("Which channel has the most in all, and what is it made of?");
    const percent = spec({ type: "hbar", label: "channel", value: ["leads", "won"], stacked: "percent" }, channels);
    expect(explainChart(percent, channels)).toContain("Here, leads is the biggest share in Social media, at 100%.");
    const split = spec({ type: "hbar", label: "channel", value: ["leads", "won"], split: true }, channels);
    expect(explainChart(split, channels)).toContain("Each column has its own scale, so compare bars up and down a column, not across.");
  });

  test("a pyramid says which side outnumbers the other and where it is widest", () => {
    const rows = [
      { age: "40-44", women: 100, men: 200 },
      { age: "30-34", women: 400, men: 300 },
    ];
    const pyramid = spec({ type: "pyramid", label: "age", left: "women", right: "men" }, rows);
    const guide = explainChart(pyramid, rows);
    expect(guide).toContain("The bar to the left is women and the bar to the right is men");
    expect(guide).toContain("Here, men outnumber women in all, 50% to 50%, and 30-34 is the widest band.".replace("men outnumber women in all, 50% to 50%", "women and men are even in all"));
    expect(questionOf(pyramid).text).toBe("How do women and men compare, age by age?");
  });

  test("women and men across age bands are recommended a pyramid; long names with two measures, grouped bars", () => {
    const rows = ["20-24", "25-29", "30-34"].map((age, i) => ({ age, women: 10 + i, men: 12 + i }));
    expect(recommendCharts(rows)[0]).toMatchObject({ type: "pyramid", view: { type: "pyramid", label: "age", left: "women", right: "men" } });
    expect(recommendCharts(channels).find((pick) => pick.type === "hbar")?.view).toEqual({ type: "hbar", label: "channel", value: ["leads", "won"] });
  });
});
