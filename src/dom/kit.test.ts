// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { blockTypes } from "../core/registry.ts";
import type { Row } from "../core/types.ts";
import type { TooltipItem, ViewContext } from "../core/view-context.ts";
import "../core/views.ts";
import { CHAR_WIDTH, endRoom, GAP, labelColumn, ROW, rowHeight, textWidth } from "./layout.ts";
import { buildSkeleton, skeletonShape } from "./states.ts";
import { BASE_CSS } from "./styles.ts";
import { activeGroup, hiddenTableOf, legendList, roving, rowHit, shareFormat, svg } from "./views/shared.ts";

/** A view context with a tooltip and select that record what they were asked. */
function context(extra: Partial<ViewContext> = {}) {
  const el = document.createElement("div");
  document.body.append(el);
  const shown: { title: string; items: TooltipItem[] }[] = [];
  const picked: Row[] = [];
  let hidden = 0;
  const ctx = {
    el,
    rows: [],
    view: { type: "test" },
    spec: { locale: "en-US", data: { type: "inline", rows: [] }, view: { type: "test" } },
    width: 480,
    height: 297,
    label: (field: string) => field.charAt(0).toUpperCase() + field.slice(1),
    format: (value: unknown) => String(value ?? ""),
    cell: (value: unknown) => document.createTextNode(String(value ?? "")),
    color: (i: number) => `var(--fft-series-${i + 1})`,
    tooltip: {
      show: (_anchor: Element, title: string, items: TooltipItem[]) => shown.push({ title, items }),
      hide: () => hidden++,
    },
    select: (row: Row) => picked.push(row),
    ...extra,
  } as unknown as ViewContext;
  return { ctx, shown, picked, hidden: () => hidden };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("measuring text", () => {
  test("one character width, and text measured by its letters: narrow i and l, wide m and W, tabular digits", () => {
    expect(CHAR_WIDTH).toBe(6.2);
    expect(textWidth("")).toBe(0);
    expect(textWidth("iiii")).toBeLessThan(textWidth("mmmm"));
    expect(textWidth("1234")).toBe(textWidth("9876"));
    expect(textWidth("Revenue", 13)).toBeGreaterThan(textWidth("Revenue", 11));
    expect(textWidth("€1.2M", 11, 600)).toBeGreaterThan(textWidth("€1.2M", 11, 400));
    // An average word lands near the old 6px-a-character rule, so layouts keep their room.
    const word = "Operational resilience";
    expect(Math.abs(textWidth(word) - word.length * 6)).toBeLessThan(word.length * 1.2);
  });

  test("end room fits the widest figure in bold, plus the gap before it", () => {
    expect(endRoom([])).toBe(GAP.m + GAP.s);
    expect(endRoom(["€338K", "41%"])).toBe(Math.ceil(textWidth("€338K", 11, 600)) + GAP.m + GAP.s);
  });

  test("the label column takes the longest name, between 34px and 34% of the card", () => {
    expect(labelColumn(["A"], 480)).toBe(34);
    expect(labelColumn(["A very long regulation name that goes on and on"], 480)).toBe(Math.round(480 * 0.34));
    const mid = labelColumn(["North", "Central"], 600);
    expect(mid).toBe(Math.round(textWidth("Central") + GAP.l));
    expect(labelColumn(["A very long regulation name"], 480, { max: 0.5, min: 55 })).toBeLessThanOrEqual(240);
  });

  test("rows: roomy for a few, regular past 8, compact past 16", () => {
    expect(ROW).toEqual({ compact: 21, regular: 26, roomy: 34, tall: 55, group: 21 });
    expect([rowHeight(5), rowHeight(12), rowHeight(20), rowHeight(5, "tall"), rowHeight(12, "compact")]).toEqual([34, 26, 21, 55, 21]);
  });
});

describe("legendList", () => {
  test("keys whose swatches mirror their marks, with the miss tone and ring outline", () => {
    const { ctx } = context();
    const list = legendList(ctx, [
      { label: "Revenue", color: "red" },
      { label: "Target", color: "blue", shape: "line" },
      { label: "Below target", color: "red", tone: "miss" },
      { label: "Open", color: "green", shape: "ring" },
      { label: "Other", color: "grey", shape: "dot", tone: "muted" },
    ]) as HTMLElement;
    const swatches = [...list.querySelectorAll<HTMLElement>(".fft-swatch")];
    expect([...list.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["Revenue", "Target", "Below target", "Open", "Other"]);
    expect(swatches.map((s) => s.dataset.shape)).toEqual(["rect", "line", "rect", "ring", "dot"]);
    expect([swatches[2]?.dataset.tone, swatches[4]?.dataset.tone]).toEqual(["miss", "muted"]);
    expect(swatches[3]?.style.boxShadow).toContain("green");
    expect(swatches.every((s) => s.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(list.dataset.place).toBeUndefined();
  });

  test("nothing inside a small-multiples panel, nothing under the minimum, and below when asked", () => {
    expect(legendList(context({ inFacet: true }).ctx, [{ label: "A", color: "red" }])).toBeUndefined();
    expect(legendList(context().ctx, [{ label: "A", color: "red" }], { min: 2 })).toBeUndefined();
    expect(legendList(context().ctx, [{ label: "A", color: "red" }], { place: "below" })?.dataset.place).toBe("below");
  });

  test("the text goes in as text, never as markup", () => {
    const list = legendList(context().ctx, [{ label: "<b>x</b>", color: "red" }]) as HTMLElement;
    expect([list.querySelector("b"), list.textContent]).toEqual([null, "<b>x</b>"]);
  });
});

describe("shareFormat", () => {
  test("whole percents by default, a decimal when asked", () => {
    expect([shareFormat("en-US").format(0.372), shareFormat("en-US", 1).format(0.3725), shareFormat("de-DE").format(0.5)]).toEqual(["37%", "37.3%", "50 %"]);
  });
});

describe("activeGroup and rowHit", () => {
  test("one active mark at a time; the wrap says one is active; off clears and hides the tooltip", () => {
    const wrap = document.createElement("div");
    const [a, b] = [document.createElement("span"), document.createElement("span")];
    const hide = vi.fn();
    const group = activeGroup(wrap, { hide });
    group.on(a);
    group.on(b);
    expect([wrap.hasAttribute("data-active"), a.hasAttribute("data-active"), b.hasAttribute("data-active")]).toEqual([true, false, true]);
    group.off();
    expect([wrap.hasAttribute("data-active"), b.hasAttribute("data-active"), hide.mock.calls.length]).toEqual([false, false, 1]);
  });

  test("a row takes focus, says its name and values, shows its tooltip, dims the rest and reports a pick", () => {
    const { ctx, shown, picked, hidden } = context();
    const wrap = document.createElement("ol");
    ctx.el.append(wrap);
    const group = activeGroup(wrap, ctx.tooltip);
    const rows = [{ region: "East", revenue: 5 }, { region: "West", revenue: 3 }];
    const nodes = rows.map((row) => {
      const li = document.createElement("li");
      wrap.append(li);
      return rowHit(ctx, { node: li, row, name: String(row.region), items: [{ label: "Revenue", value: String(row.revenue) }], group, said: ", top" });
    });
    roving(nodes);
    const [east, west] = nodes as HTMLElement[];
    expect([east?.tabIndex, east?.getAttribute("aria-label")]).toEqual([0, "East: Revenue 5, top"]);
    east?.dispatchEvent(new Event("focus"));
    expect([shown[0]?.title, wrap.hasAttribute("data-active"), east?.hasAttribute("data-active")]).toEqual(["East", true, true]);
    east?.dispatchEvent(new Event("blur"));
    expect([wrap.hasAttribute("data-active"), hidden()]).toEqual([false, 1]);
    west?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(picked).toEqual([rows[1]]);
  });

  test("an SVG hit area becomes a labelled image; the tooltip can point at another element and another can carry the state", () => {
    const { ctx, shown } = context();
    const chart = svg(document, "svg");
    ctx.el.append(chart);
    const row = svg(document, "g");
    const dot = svg(document, "circle");
    const hit = svg(document, "rect");
    row.append(dot, hit);
    chart.append(row);
    const anchors: Element[] = [];
    const tooltip = { show: (anchor: Element) => anchors.push(anchor), hide: () => {} };
    rowHit({ ...ctx, tooltip } as ViewContext, { node: hit, row: {}, name: "North", items: [], anchor: dot, active: row, group: activeGroup(chart) });
    hit.dispatchEvent(new Event("pointerenter"));
    expect([hit.getAttribute("role"), anchors[0], row.hasAttribute("data-active"), hit.hasAttribute("data-active"), shown.length]).toEqual(["img", dot, true, false, 0]);
  });
});

describe("hiddenTableOf", () => {
  test("a screen-reader table of the rows in the columns the view reads, each column once", () => {
    const { ctx } = context();
    const hidden = hiddenTableOf(ctx, [{ region: "East", revenue: 5 }], ["region", "revenue", "region", ""]);
    expect(hidden.className).toBe("fft-sr-only");
    expect([...hidden.querySelectorAll("th")].map((th) => th.textContent)).toEqual(["Region", "Revenue"]);
    expect([...hidden.querySelectorAll("td")].map((td) => td.textContent)).toEqual(["East", "5"]);
  });
});

describe("skeletons", () => {
  test("every built-in view has its own silhouette, never the generic fallback by accident", () => {
    const generic = blockTypes("view").filter((type) => skeletonShape(type) === "plot");
    // These are drawn on two axes, so the soft area is their own shape, not a fallback.
    expect(generic.sort()).toEqual(["area", "bump", "dual", "line", "sankey", "scatter", "slope"].filter((type) => blockTypes("view").includes(type)).sort());
    expect(skeletonShape("some-plugin-view")).toBe("plot");
    for (const type of ["matrix", "strips", "lifecycle", "whitespace", "xray", "history", "board", "anomalies"]) expect([type, skeletonShape(type)]).not.toEqual([type, "plot"]);
  });

  test("lanes start along the axis, the grid has cells, the map has tiles with a ragged edge and the chart's height", () => {
    const lanes = buildSkeleton(document, "lanes", 200);
    expect(lanes.querySelectorAll(".fft-skel-lane")).toHaveLength(5);
    expect((lanes.querySelector(".fft-skel-lane span:last-child") as HTMLElement).style.width).toBe("55%");
    expect(buildSkeleton(document, "grid", 200).children).toHaveLength(24);
    const map = buildSkeleton(document, "map", 233);
    expect([map.children.length, [...map.children].filter((tile) => (tile as HTMLElement).style.visibility === "hidden").length, map.style.height]).toEqual([35, 10, "233px"]);
    expect(map.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("style tokens", () => {
  test("one hover dimming, three radii (plus the card's and a pill), five type steps", () => {
    expect(BASE_CSS).toMatch(/--fft-dim: 0\.38;/);
    for (const token of ["--fft-radius-s: 2px", "--fft-radius-m: 5px", "--fft-radius-l: 8px", "--fft-fs-xs: 10px", "--fft-fs-s: 11px", "--fft-fs-m: 13px", "--fft-fs-l: 21px", "--fft-fs-xl: 34px"]) {
      expect(BASE_CSS).toContain(token);
    }
  });

  test("every hover-dimming rule uses the token, not its own number", () => {
    const dims = BASE_CSS.split("\n").filter((line) => /\[data-active\][^{]*:not\(/.test(line) && /[^-]opacity:/.test(line));
    expect(dims.length).toBeGreaterThan(20);
    expect(dims.filter((line) => /[^-]opacity: 0\./.test(line))).toEqual([]);
  });

  test("radii come from the scale: no stray pixel radius is left but 0", () => {
    const stray = [...BASE_CSS.matchAll(/border-radius: (\d+(?:\.\d+)?px)/g)].map((m) => m[1]);
    expect(stray).toEqual([]);
  });

  test("type sizes come from the scale, with three deliberate exceptions", () => {
    const sizes = [...BASE_CSS.matchAll(/font-size: (\d+px)/g)].map((m) => m[1]);
    // 9px tile codes on maps, 16px selects on phones (so iOS does not zoom), 55px hero figures in the expanded view.
    expect([...new Set(sizes)].sort()).toEqual(["16px", "55px", "9px"]);
  });
});
