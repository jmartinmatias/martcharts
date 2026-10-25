// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
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
const selections = () => {
  const seen: Row[] = [];
  target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
  return seen;
};
const press = (node: Element, key: string) => node.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

const sales = [
  { region: "North", revenue: 1200, cost: 800 },
  { region: "South", revenue: 900, cost: 600 },
  { region: "East", revenue: 2000, cost: 1500 },
];

describe("table view", () => {
  test("a wide table with nothing focusable inside is itself a labelled stop, so the keyboard can scroll it (WCAG 2.1.1)", async () => {
    await draw({ title: "Revenue by month", rows: [{ region: "East", a: 1, b: 2 }], view: { type: "table", sortable: false } });
    const wrap = target.querySelector(".fft-table-wrap") as HTMLElement;
    const narrow = [wrap.tabIndex, wrap.getAttribute("role")];
    Object.defineProperties(wrap, { scrollWidth: { value: 600, configurable: true }, clientWidth: { value: 300, configurable: true } });
    wrap.dispatchEvent(new Event("scroll"));
    expect([narrow, [wrap.tabIndex, wrap.getAttribute("role"), wrap.getAttribute("aria-label")]]).toEqual([
      [-1, null],
      [0, "region", "Revenue by month: scroll sideways for more columns"],
    ]);
  });

  test("a wide sortable table needs no extra stop: its header buttons already take the keyboard there", async () => {
    await draw({ rows: [{ region: "East", a: 1, b: 2 }], view: { type: "table" } });
    const wrap = target.querySelector(".fft-table-wrap") as HTMLElement;
    Object.defineProperties(wrap, { scrollWidth: { value: 600, configurable: true }, clientWidth: { value: 300, configurable: true } });
    wrap.dispatchEvent(new Event("scroll"));
    expect([wrap.tabIndex, wrap.hasAttribute("role")]).toEqual([-1, false]);
  });

  test("a table wider than its card marks that more columns wait to the right, for the stylesheet to fade that edge", async () => {
    await draw({ rows: [{ region: "East", a: 1, b: 2 }], view: { type: "table" } });
    const wrap = target.querySelector(".fft-table-wrap") as HTMLElement;
    let left = 0;
    Object.defineProperties(wrap, { scrollWidth: { value: 600, configurable: true }, clientWidth: { value: 300, configurable: true }, scrollLeft: { get: () => left, configurable: true } });
    const at = (x: number) => {
      left = x;
      wrap.dispatchEvent(new Event("scroll"));
      return wrap.hasAttribute("data-more");
    };
    expect([at(0), at(150), at(300)]).toEqual([true, true, false]);
  });

  test("headers use field labels and cells use field formats", async () => {
    await draw({ rows: sales, fields: { revenue: { label: "Revenue", format: { type: "currency", currency: "EUR", decimals: 0 } } }, view: { type: "table" } });
    expect(texts("th")).toEqual(["Region", "Revenue", "Cost"]);
    expect(texts("tbody tr:first-child td")).toEqual(["North", "€1,200", "800"]);
  });

  test("number columns are marked for right alignment, text columns are not", async () => {
    await draw({ rows: sales, view: { type: "table" } });
    expect(all("tbody tr:first-child td").map((td) => td.classList.contains("fft-num"))).toEqual([false, true, true]);
  });

  test("columns picks and orders the fields", async () => {
    await draw({ rows: sales, view: { type: "table", columns: ["cost", "region"] } });
    expect(texts("th")).toEqual(["Cost", "Region"]);
  });

  test("without columns it shows every field found in any row", async () => {
    await draw({ rows: [{ a: 1 }, { b: 2 }], view: { type: "table" } });
    expect(texts("th")).toEqual(["A", "B"]);
  });

  test("clicking a row or pressing Enter on it selects that row", async () => {
    const seen = selections();
    await draw({ rows: sales, view: { type: "table" } });
    (all("tbody tr")[1] as HTMLElement).click();
    press(all("tbody tr")[2] as Element, "Enter");
    expect(seen).toEqual([sales[1], sales[2]]);
  });
});

describe("delta cells", () => {
  const rows = [
    { region: "North", change: 0.12 },
    { region: "South", change: -0.04 },
    { region: "East", change: 0 },
  ];

  test("each change gets an arrow and a good or bad tone, so color is never the only signal", async () => {
    await draw({ rows, fields: { change: { format: "delta" } }, view: { type: "table" } });
    expect(all(".fft-delta-cell").map((c) => [c.getAttribute("data-tone"), c.textContent])).toEqual([
      ["good", "\u25B2+12.0%"],
      ["bad", "\u25BC\u22124.0%"],
      ["even", "0.0%"],
    ]);
  });

  test("goodWhen down flips the tones, as for costs or churn", async () => {
    await draw({ rows, fields: { change: { format: { type: "delta", goodWhen: "down" } } }, view: { type: "table" } });
    expect(all(".fft-delta-cell").map((c) => c.getAttribute("data-tone"))).toEqual(["bad", "good", "even"]);
  });
});

describe("heat cells", () => {
  const months = [
    { region: "North", apr: 10, may: 40 },
    { region: "South", apr: 70, may: 100 },
  ];
  const steps = () => all(".fft-heat-cell").map((c) => c.getAttribute("data-step"));

  test("heat columns tint each number on the seven-step scale, all heat columns sharing one range", async () => {
    await draw({ rows: months, fields: { apr: { format: "heat" }, may: { format: "heat" } }, view: { type: "table" } });
    expect(steps()).toEqual(["1", "3", "5", "7"]);
    expect(texts(".fft-heat-cell")).toEqual(["10", "40", "70", "100"]);
  });

  test("an explicit min and max fix the range", async () => {
    await draw({ rows: months, fields: { apr: { format: { type: "heat", min: 0, max: 200 } }, may: { format: { type: "heat", min: 0, max: 200 } } }, view: { type: "table" } });
    expect(steps()).toEqual(["1", "2", "3", "4"]);
  });
});

describe("table sorting and totals", () => {
  const firstColumn = () => all("tbody tr").map((tr) => tr.querySelector("td")?.textContent);
  const header = (i: number) => all("thead th")[i] as HTMLElement;
  const sortButton = (i: number) => header(i).querySelector("button.fft-sort") as HTMLButtonElement;

  test("each header is a sort button: first click ascending, second descending, marked with aria-sort", async () => {
    await draw({ rows: sales, view: { type: "table" } });
    sortButton(1).click();
    const ascending = [firstColumn(), header(1).getAttribute("aria-sort")];
    sortButton(1).click();
    expect([ascending, [firstColumn(), header(1).getAttribute("aria-sort")]]).toEqual([
      [["South", "North", "East"], "ascending"],
      [["East", "North", "South"], "descending"],
    ]);
  });

  test("text columns sort alphabetically, and focus stays on the header button", async () => {
    await draw({ rows: sales, view: { type: "table" } });
    sortButton(0).click();
    expect([firstColumn(), document.activeElement?.textContent]).toEqual([["East", "North", "South"], "Region"]);
  });

  test("sortable false keeps plain headers", async () => {
    await draw({ rows: sales, view: { type: "table", sortable: false } });
    expect(all("thead button").length).toBe(0);
  });

  test("totals adds a footer row summing each number column, leaving percent columns blank", async () => {
    await draw({
      rows: sales.map((row) => ({ ...row, margin: 0.3 })),
      fields: { revenue: { format: { type: "currency", currency: "EUR", decimals: 0 } }, margin: { format: "percent" } },
      view: { type: "table", totals: true },
    });
    expect(texts("tfoot td")).toEqual(["Total", "€4,100", "2,900", ""]);
    sortButton(1).click();
    expect(all("tfoot tr").length).toBe(1);
  });
});

describe("list view", () => {
  test("a column of short figures shares one precision, so the figures line up: €214.0K above €188.5K, never €214K", async () => {
    const money = { type: "bar", format: { type: "currency", currency: "EUR", compact: true } };
    const customers = [{ name: "Aurora", revenue: 214000 }, { name: "Bellwether", revenue: 188500 }, { name: "Cobalt", revenue: 172300 }];
    await draw({ rows: customers, fields: { revenue: { format: money } }, view: { type: "list", label: "name", value: "revenue" } });
    const mixed = texts(".fft-item-value");
    target.replaceChildren();
    const round = [{ name: "A", revenue: 214000 }, { name: "B", revenue: 188000 }];
    await draw({ rows: round, fields: { revenue: { format: money } }, view: { type: "list", label: "name", value: "revenue" } });
    expect([mixed, texts(".fft-item-value")]).toEqual([["€214.0K", "€188.5K", "€172.3K"], ["€214K", "€188K"]]);
  });

  const customers = [{ name: "Acme", country: "LU", revenue: 1200 }];

  test("each row becomes an item with label, detail and formatted value", async () => {
    await draw({ rows: customers, fields: { revenue: { format: { type: "currency", currency: "EUR", decimals: 0 } } }, view: { type: "list", label: "name", detail: "country", value: "revenue" } });
    expect([texts(".fft-item-label"), texts(".fft-item-detail"), texts(".fft-item-value")]).toEqual([["Acme"], ["LU"], ["€1,200"]]);
  });

  test("detail and value are left out when not configured", async () => {
    await draw({ rows: customers, view: { type: "list", label: "name" } });
    expect([all(".fft-item-detail").length, all(".fft-item-value").length]).toEqual([0, 0]);
  });

  test("pressing Enter on an item selects its row", async () => {
    const seen = selections();
    await draw({ rows: customers, view: { type: "list", label: "name" } });
    press(all(".fft-item")[0] as Element, "Enter");
    expect(seen).toEqual(customers);
  });
});

describe("kpi view", () => {
  test("shows the label, the formatted value and the change against the comparison", async () => {
    await draw({
      rows: [{ revenue: 1250, previous: 1000 }],
      fields: { revenue: { label: "Revenue", format: { type: "currency", currency: "EUR", decimals: 0 } } },
      view: { type: "kpi", value: "revenue", compare: "previous", compareLabel: "vs last month" },
    });
    expect([...texts(".fft-kpi-label"), ...texts(".fft-kpi-value"), ...texts(".fft-kpi-change"), ...texts(".fft-kpi-compare")]).toEqual([
      "Revenue",
      "€1,250",
      "▲ +25.0%",
      "vs last month",
    ]);
    const delta = target.querySelector<HTMLElement>(".fft-kpi-delta");
    expect([delta?.dataset.direction, delta?.dataset.sentiment]).toEqual(["up", "good"]);
  });

  test("goodWhen down makes a rise bad news", async () => {
    await draw({ rows: [{ cost: 110, previous: 100 }], view: { type: "kpi", value: "cost", compare: "previous", goodWhen: "down" } });
    const delta = target.querySelector<HTMLElement>(".fft-kpi-delta");
    expect([delta?.dataset.direction, delta?.dataset.sentiment]).toEqual(["up", "bad"]);
  });

  test("a fall when down is good is good news, and the comparison is named after its field by default", async () => {
    await draw({ rows: [{ churn: 0.04, lastMonth: 0.05 }], view: { type: "kpi", value: "churn", compare: "lastMonth", goodWhen: "down" } });
    expect([...texts(".fft-kpi-change"), ...texts(".fft-kpi-compare")]).toEqual(["▼ −20.0%", "vs Last month"]);
    expect(target.querySelector<HTMLElement>(".fft-kpi-delta")?.dataset.sentiment).toBe("good");
  });

  test("without a format, large values are shortened", async () => {
    await draw({ rows: [{ visits: 1_234_567 }], view: { type: "kpi", value: "visits" } });
    expect(texts(".fft-kpi-value")).toEqual(["1.2M"]);
  });

  test("no change is shown without a comparison or when the comparison is zero", async () => {
    await draw({ rows: [{ v: 5, zero: 0 }], view: { type: "kpi", value: "v" } });
    expect(all(".fft-kpi-delta").length).toBe(0);
    target.innerHTML = "";
    await draw({ rows: [{ v: 5, zero: 0 }], view: { type: "kpi", value: "v", compare: "zero" } });
    expect(all(".fft-kpi-delta").length).toBe(0);
  });
});

describe("kpi view in series mode", () => {
  const months = [
    { month: "2026-07", revenue: 1_120_000 },
    { month: "2026-08", revenue: 1_142_000 },
    { month: "2026-09", revenue: 1_284_000 },
  ];
  const fields = {
    month: { format: { type: "date", style: "month" } },
    revenue: { label: "Revenue", format: { type: "currency", currency: "EUR", compact: true } },
  };

  test("the headline is the last row and the change is against the row before, named by x", async () => {
    await draw({ rows: months, fields, view: { type: "kpi", value: "revenue", series: true, x: "month" } });
    expect([...texts(".fft-kpi-value"), ...texts(".fft-kpi-change"), ...texts(".fft-kpi-compare")]).toEqual(["€1.3M", "▲ +12.4%", "vs Aug 2026"]);
  });

  test("with a target, a line under the number says where the latest stands: met, or how far to go", async () => {
    const targeted = months.map((row, i) => ({ ...row, target: [1_100_000, 1_150_000, 1_200_000][i] }));
    await draw({ rows: targeted, fields, view: { type: "kpi", value: "revenue", series: true, x: "month", target: "target" } });
    const met = [texts(".fft-kpi-target"), Boolean(target.querySelector(".fft-kpi-target .fft-check"))];
    await draw({ rows: targeted.map((row) => ({ ...row, target: 1_334_000 })), fields, view: { type: "kpi", value: "revenue", series: true, x: "month", target: "target" } });
    const short = all(".fft-kpi-target").at(-1)?.textContent;
    expect([met, short]).toEqual([[["Target met: €1.2M"], true], "€50K to go to the €1.3M target"]);
  });

  test("when lower is better, a target is met at or under it, and a miss says how far above it the number is", async () => {
    const churn = [{ month: "2026-09", rate: 3.1, cap: 3 }];
    await draw({ rows: churn, view: { type: "kpi", value: "rate", series: true, x: "month", goodWhen: "down", target: "cap" } });
    const over = texts(".fft-kpi-target").at(-1);
    await draw({ rows: [{ month: "2026-09", rate: 2.8, cap: 3 }], view: { type: "kpi", value: "rate", series: true, x: "month", goodWhen: "down", target: "cap" } });
    expect([over, texts(".fft-kpi-target").at(-1)]).toEqual(["0.1 above the 3 target", "Target met: 3"]);
  });

  test("draws a sparkline through every row with the latest point marked", async () => {
    await draw({ rows: months, fields, view: { type: "kpi", value: "revenue", series: true, x: "month" } });
    const d = target.querySelector("svg.fft-sparkline path.fft-spark-line")?.getAttribute("d") ?? "";
    expect(d.replace(/[^ML]/g, "")).toBe("MLL");
    expect(all("svg.fft-sparkline circle.fft-spark-end").length).toBe(1);
  });

  test("without x the comparison is called the previous period", async () => {
    await draw({ rows: months, fields, view: { type: "kpi", value: "revenue", series: true } });
    expect(texts(".fft-kpi-compare")).toEqual(["vs previous period"]);
  });

  test("a single row shows no change and no sparkline", async () => {
    await draw({ rows: months.slice(0, 1), fields, view: { type: "kpi", value: "revenue", series: true } });
    expect([all(".fft-kpi-delta").length, all(".fft-sparkline").length]).toEqual([0, 0]);
  });
});

describe("area view", () => {
  const months = [
    { month: "Jan", v: 40 },
    { month: "Feb", v: 90 },
    { month: "Mar", v: 60 },
  ];

  test("draws a wash and a line for each series", async () => {
    await draw({ rows: months, view: { type: "area", x: "month", y: "v" } });
    expect([all("path.fft-area").length, all("path.fft-line").length]).toEqual([1, 1]);
    expect((target.querySelector("path.fft-area") as SVGElement).style.fill).toBe("var(--fft-series-1)");
  });

  test("the axis starts at zero, since the filled area encodes the amount", async () => {
    await draw({ rows: months, view: { type: "area", x: "month", y: "v" } });
    expect(texts(".fft-tick-y")[0]).toBe("0");
  });
});

describe("stacked area view", () => {
  // a + b is 40 in both months, so the top edge is flat while a's edge rises.
  const mix = [
    { m: "Jan", a: 10, b: 30 },
    { m: "Feb", a: 20, b: 20 },
  ];
  const ys = (path: Element | undefined) => [...(path?.getAttribute("d") ?? "").matchAll(/[ML][\d.]+,([\d.]+)/g)].map((match) => Number(match[1]));
  const line = (series: string) => target.querySelector(`path.fft-line[data-series="${series}"]`) ?? undefined;

  test("each series is a band on top of the ones before, its line on the running total", async () => {
    await draw({ rows: mix, view: { type: "area", x: "m", y: ["a", "b"], stacked: true } });
    const [aJan, aFeb] = ys(line("a"));
    const [bJan, bFeb] = ys(line("b"));
    expect([aJan === aFeb, bJan === bFeb, bJan! < aJan!]).toEqual([false, true, true]);
    expect(all("path.fft-area[data-stacked]").length).toBe(2);
  });

  test("the axis covers the totals", async () => {
    await draw({ rows: mix, view: { type: "area", x: "m", y: ["a", "b"], stacked: true } });
    expect(Number(texts(".fft-tick-y").at(-1))).toBeGreaterThanOrEqual(40);
  });

  test("percent stacks to shares of 100%, so the top edge sits on 100%", async () => {
    await draw({ rows: [{ m: "Jan", a: 10, b: 30 }, { m: "Feb", a: 30, b: 30 }], view: { type: "area", x: "m", y: ["a", "b"], stacked: "percent" } });
    expect(texts(".fft-tick-y").at(-1)).toBe("100%");
    const [bJan, bFeb] = ys(line("b"));
    expect(bJan).toBe(bFeb);
  });

  test("the tooltip adds the total", async () => {
    await draw({ rows: mix, view: { type: "area", x: "m", y: ["a", "b"], stacked: true } });
    all(".fft-hit")[0]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row")).toEqual(["10A", "30B", "40Total"]);
  });
});

describe("time series run edge to edge", () => {
  const months = [
    { m: "Jan", v: 1 },
    { m: "Feb", v: 2 },
    { m: "Mar", v: 3 },
  ];

  test("a line starts on the plot's left edge and ends on its right edge, with the end labels aligned to them", async () => {
    await draw({ rows: months, view: { type: "line", x: "m", y: "v", endLabels: false } });
    const xs = [...(target.querySelector("path.fft-line")?.getAttribute("d") ?? "").matchAll(/[ML]([\d.]+),/g)].map((m) => Number(m[1]));
    const grid = target.querySelector("line.fft-gridline");
    expect([xs[0], xs.at(-1)]).toEqual([Number(grid?.getAttribute("x1")), Number(grid?.getAttribute("x2"))]);
    expect(all(".fft-tick-x").map((t) => t.getAttribute("text-anchor"))).toEqual(["start", "middle", "end"]);
  });

  test("in a narrow chart, x labels never come within 8px of each other, edge labels included", async () => {
    // jsdom has no layout: give elements a narrow width for this one draw (clientWidth lives on Element.prototype, so the override is removed afterwards).
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 230 });
    try {
      const rows = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"].map((m, i) => ({ m, v: i }));
      await draw({ rows, fields: { m: { format: { type: "date", style: "month" } } }, view: { type: "line", x: "m", y: "v", endLabels: false } });
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    }
    const extents = all(".fft-tick-x").map((t) => {
      const x = Number(t.getAttribute("x"));
      const w = (t.textContent ?? "").length * 6;
      const anchor = t.getAttribute("text-anchor");
      return anchor === "start" ? [x, x + w] : anchor === "end" ? [x - w, x] : [x - w / 2, x + w / 2];
    });
    expect(extents.length).toBeGreaterThan(1);
    expect(extents.every((e, i) => i === 0 || e[0]! >= extents[i - 1]![1]! + 8)).toBe(true);
  });

  test("bars keep their bands, labels centred under them", async () => {
    await draw({ rows: months, view: { type: "bar", x: "m", y: "v" } });
    expect(all(".fft-tick-x").map((t) => t.getAttribute("text-anchor"))).toEqual(["middle", "middle", "middle"]);
  });
});

describe("streamgraph (area stacked stream)", () => {
  // Totals 40 then 80: each column still centers on the same line.
  const mix = [
    { m: "Jan", a: 10, b: 30 },
    { m: "Feb", a: 50, b: 30 },
  ];
  const spec = { rows: mix, view: { type: "area", x: "m", y: ["a", "b"], stacked: "stream" } };
  const pairs = (d: string) => [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

  test("the layers stack around one center line, whatever each column's total", async () => {
    await draw(spec);
    const bands = all("path.fft-area[data-stream]");
    const first = pairs(bands[0]?.getAttribute("d") ?? "");
    const last = pairs(bands.at(-1)?.getAttribute("d") ?? "");
    const topStart = last[0]?.[1] ?? 0;
    const bottomStart = first.at(-1)?.[1] ?? 0;
    const lastPath = bands.at(-1)?.getAttribute("d") ?? "";
    const firstPath = bands[0]?.getAttribute("d") ?? "";
    const topEnd = pairs(lastPath.split("L")[0] ?? "").at(-1)?.[1] ?? 0;
    const bottomEnd = pairs(firstPath.split("L")[1] ?? "")[0]?.[1] ?? 0;
    expect(Math.abs((topStart + bottomStart) / 2 - (topEnd + bottomEnd) / 2)).toBeLessThan(0.5);
    expect(bottomEnd - topEnd).toBeGreaterThan(bottomStart - topStart);
  });

  test("no value axis, since only thickness means anything, and no edge lines", async () => {
    await draw(spec);
    expect([all(".fft-tick-y").length, all("path.fft-line").length]).toEqual([0, 0]);
  });

  test("each layer is named inside itself where it is thick enough", async () => {
    await draw(spec);
    expect(texts(".fft-stream-label")).toEqual(["A", "B"]);
  });

  test("the stream fills the plot's height instead of a rounded axis range", async () => {
    // Totals of 61 would round out to a 40 either side on a value axis, leaving a quarter of the height empty.
    await draw({ ...spec, rows: [{ m: "Jan", a: 31, b: 30 }, { m: "Feb", a: 20, b: 20 }] });
    const ys = all("path.fft-area[data-stream]").flatMap((band) => pairs(band.getAttribute("d") ?? "").map((p) => p[1] ?? 0));
    const height = Number(all("svg")[0]?.getAttribute("height"));
    expect((Math.max(...ys) - Math.min(...ys)) / height).toBeGreaterThan(0.78);
  });

  test("a layer about as thick throughout is named near the middle, not pinned to an edge", async () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May"];
    await draw({ ...spec, rows: months.map((m, i) => ({ m, a: i === 4 ? 22 : 20, b: 20 })) });
    const x = Number(all(".fft-stream-label")[0]?.getAttribute("x"));
    const width = Number(all("svg")[0]?.getAttribute("width"));
    expect(Math.abs(x / width - 0.5)).toBeLessThan(0.25);
  });
});

describe("area view with a gradient preset", () => {
  test("the wash fades from the series color down to nothing", async () => {
    await draw({ rows: [{ m: "Jan", v: 1 }, { m: "Feb", v: 3 }], view: { type: "area", x: "m", y: "v" }, style: { preset: "airy" } });
    const fill = target.querySelector("path.fft-area")?.getAttribute("fill") ?? "";
    const id = fill.match(/^url\(#(.+)\)$/)?.[1] ?? "missing";
    const stops = [...(target.querySelector(`linearGradient[id="${id}"]`)?.querySelectorAll("stop") ?? [])];
    expect(stops.map((s) => [s.getAttribute("offset"), s.getAttribute("stop-opacity")])).toEqual([
      ["0", "0.34"],
      ["1", "0"],
    ]);
    expect((stops[0] as SVGElement).style.stopColor).toBe("var(--fft-series-1)");
  });
});

describe("meter view", () => {
  const regions = [
    { region: "East", revenue: 338, target: 400 },
    { region: "North", revenue: 278, target: 250 },
  ];

  test("one meter per row with its label, attainment and value against target", async () => {
    await draw({ rows: regions, view: { type: "meter", value: "revenue", target: "target", label: "region" } });
    expect([texts(".fft-meter-label"), texts(".fft-meter-percent"), texts(".fft-meter-value")]).toEqual([
      ["East", "North"],
      ["85%", "111%"],
      ["338 of 400", "278 of 250"],
    ]);
  });

  test("the fill shows attainment and stops at the end of the track when over target", async () => {
    await draw({ rows: regions, view: { type: "meter", value: "revenue", target: "target", label: "region" } });
    expect(all(".fft-meter-fill").map((fill) => (fill as HTMLElement).style.width)).toEqual(["84.5%", "100%"]);
    expect(all(".fft-meter").map((m) => (m as HTMLElement).dataset.over ?? "")).toEqual(["", "true"]);
  });

  test("without a label field each meter is named after the value field", async () => {
    await draw({ rows: regions.slice(0, 1), view: { type: "meter", value: "revenue", target: "target" } });
    expect(texts(".fft-meter-label")).toEqual(["Revenue"]);
  });

  test("a zero or missing target shows no attainment and an empty fill", async () => {
    await draw({ rows: [{ v: 5, t: 0 }], view: { type: "meter", value: "v", target: "t" } });
    expect([texts(".fft-meter-percent")[0], (target.querySelector(".fft-meter-fill") as HTMLElement).style.width]).toEqual(["", "0%"]);
  });

  test("the meter is exposed as a progress bar to assistive technology", async () => {
    await draw({ rows: regions.slice(0, 1), view: { type: "meter", value: "revenue", target: "target", label: "region" } });
    const bar = target.querySelector(".fft-meter-track");
    expect([bar?.getAttribute("role"), bar?.getAttribute("aria-valuenow"), bar?.getAttribute("aria-valuemax"), bar?.getAttribute("aria-label")]).toEqual([
      "meter",
      "338",
      "400",
      "East: 85% of target, 62 to go",
    ]);
  });

  // A met target used to say "Target met" beside its check; the check says it, and the words stay in the aria-label.
  test("a met target carries a check, and a missed one says how far it has to go", async () => {
    await draw({ rows: regions, view: { type: "meter", value: "revenue", target: "target", label: "region" } });
    expect(texts(".fft-meter-gap")).toEqual(["62 to go"]);
    expect(all(".fft-meter").map((m) => [(m as HTMLElement).dataset.met ?? "", Boolean(m.querySelector(".fft-meter-percent .fft-check"))])).toEqual([
      ["", false],
      ["true", true],
    ]);
    expect(target.querySelectorAll(".fft-meter-track")[1]?.getAttribute("aria-label")).toBe("North: 111% of target, target met");
  });
});

describe("donut view", () => {
  test("the legend's figures share one precision, so they line up: €660.1K, €447.0K, €97.6K", async () => {
    const segments = [{ segment: "Enterprise", revenue: 660100 }, { segment: "Mid-market", revenue: 447000 }, { segment: "Small business", revenue: 97600 }];
    await draw({ rows: segments, fields: { revenue: { format: { type: "currency", currency: "EUR", compact: true } } }, view: { type: "donut", label: "segment", value: "revenue" } });
    expect(texts(".fft-donut-value")).toEqual(["€660.1K", "€447.0K", "€97.6K"]);
  });

  const segments = [
    { segment: "Enterprise", revenue: 660_100 },
    { segment: "Mid-market", revenue: 447_000 },
    { segment: "Small business", revenue: 97_600 },
  ];
  const fields = { revenue: { label: "Revenue", format: { type: "currency", currency: "EUR", decimals: 0 } } };
  const spec = { rows: segments, fields, view: { type: "donut", label: "segment", value: "revenue" } };

  test("draws one segment per row in palette order", async () => {
    await draw(spec);
    expect(all("path.fft-slice").map((p) => (p as SVGElement).style.stroke)).toEqual(["var(--fft-series-1)", "var(--fft-series-2)", "var(--fft-series-3)"]);
  });

  test("the center shows the formatted total and what it counts", async () => {
    await draw(spec);
    expect([...texts(".fft-donut-total"), ...texts(".fft-donut-caption")]).toEqual(["€1,204,700", "Revenue"]);
  });

  test("the legend lists each segment with its value and share", async () => {
    await draw(spec);
    expect(all(".fft-donut-legend li").map((li) => [...li.querySelectorAll("span")].map((s) => s.textContent).filter(Boolean))).toEqual([
      ["Enterprise", "€660,100", "55%"],
      ["Mid-market", "€447,000", "37%"],
      ["Small business", "€97,600", "8%"],
    ]);
  });

  test("rows with zero or negative values are left out", async () => {
    await draw({ ...spec, rows: [...segments, { segment: "Refunds", revenue: -5 }, { segment: "None", revenue: 0 }] });
    expect(all("path.fft-slice").length).toBe(3);
  });

  test("focusing a segment shows its value and share", async () => {
    await draw(spec);
    all("path.fft-slice-hit")[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Mid-market", "€447,000Revenue", "37%Share"]);
  });

  test("clicking a segment selects its row", async () => {
    const seen = selections();
    await draw(spec);
    all("path.fft-slice-hit")[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(seen).toEqual([segments[2]]);
  });

  test("carries a hidden data table for screen readers", async () => {
    await draw(spec);
    expect(texts(".fft-sr-only th")).toEqual(["Segment", "Revenue"]);
  });
});

describe("badge format in views", () => {
  const tasks = [
    { task: "15,000 steps", status: "On going" },
    { task: "3L water", status: "Complete" },
    { task: "Stretching", status: "Skipped" },
  ];
  const fields = { status: { format: { type: "badge", tones: { Complete: "positive", "On going": "warning" } } } };

  test("table cells become pills toned by value, unknown values neutral", async () => {
    await draw({ rows: tasks, fields, view: { type: "table" } });
    expect(all("td .fft-badge").map((b) => [b.textContent, (b as HTMLElement).dataset.tone])).toEqual([
      ["On going", "warning"],
      ["Complete", "positive"],
      ["Skipped", "neutral"],
    ]);
  });

  test("list values become pills too", async () => {
    await draw({ rows: tasks, fields, view: { type: "list", label: "task", value: "status" } });
    expect(all(".fft-item-value .fft-badge").length).toBe(3);
  });
});

describe("hbar view", () => {
  const leads = [
    { stage: "New leads", count: 300 },
    { stage: "Contacted", count: 150 },
    { stage: "Converted", count: 75 },
  ];

  test("one row per data row, with label and formatted value, widths proportional to the largest", async () => {
    await draw({ rows: leads, fields: { count: { format: "number" } }, view: { type: "hbar", label: "stage", value: "count" } });
    expect([texts(".fft-hbar-label"), texts(".fft-hbar-value")]).toEqual([
      ["New leads", "Contacted", "Converted"],
      ["300", "150", "75"],
    ]);
    expect(all(".fft-hbar-fill").map((f) => (f as HTMLElement).style.width)).toEqual(["100%", "50%", "25%"]);
  });

  test("one series means one color for every bar", async () => {
    await draw({ rows: leads, view: { type: "hbar", label: "stage", value: "count" } });
    expect(all(".fft-hbar-fill").map((f) => (f as HTMLElement).style.background)).toEqual(Array(3).fill("var(--fft-series-1)"));
  });

  test("highlight keeps the named rows in color and greys the rest", async () => {
    await draw({ rows: leads, view: { type: "hbar", label: "stage", value: "count", highlight: "Contacted" } });
    expect(all(".fft-hbar-fill").map((f) => (f as HTMLElement).style.background)).toEqual(["var(--fft-deemphasis)", "var(--fft-series-1)", "var(--fft-deemphasis)"]);
  });

  test("a missing value draws an empty bar and no number", async () => {
    await draw({ rows: [...leads, { stage: "Lost", count: null }], view: { type: "hbar", label: "stage", value: "count" } });
    expect([(all(".fft-hbar-fill")[3] as HTMLElement).style.width, texts(".fft-hbar-value")[3]]).toEqual(["0%", ""]);
  });

  test("focusing a row shows its value; clicking selects it", async () => {
    const seen = selections();
    await draw({ rows: leads, view: { type: "hbar", label: "stage", value: "count" } });
    all(".fft-hbar")[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Contacted", "150Count"]);
    (all(".fft-hbar")[2] as HTMLElement).click();
    expect(seen).toEqual([leads[2]]);
  });
});

describe("highlight on bar and line views", () => {
  test("bar: highlighted categories keep their series colors; the rest step back to grey, each series keeping a hint of its hue", async () => {
    await draw({ rows: sales, view: { type: "bar", x: "region", y: ["revenue", "cost"], highlight: ["East"] } });
    const fills = all("g.fft-marks").map((g) => [...g.querySelectorAll<SVGElement>("path.fft-bar")].map((b) => b.style.fill));
    // Two greys a reader can tell apart, so the legend still says which bar is revenue and which is cost.
    const muted = (s: number) => `color-mix(in srgb, var(--fft-series-${s}) 30%, var(--fft-deemphasis))`;
    expect(fills).toEqual([
      [muted(1), muted(2)],
      [muted(1), muted(2)],
      ["var(--fft-series-1)", "var(--fft-series-2)"],
    ]);
    // One series needs no hint: its grey is plain.
    target.replaceChildren();
    await draw({ rows: sales, view: { type: "bar", x: "region", y: "revenue", highlight: ["East"] } });
    expect((all("path.fft-bar")[0] as SVGElement).style.fill).toBe("var(--fft-deemphasis)");
  });

  test("line: the highlighted series keeps its color, the others turn grey, legend included", async () => {
    await draw({ rows: [{ m: "Jan", a: 1, b: 2 }, { m: "Feb", a: 2, b: 1 }], view: { type: "line", x: "m", y: ["a", "b"], highlight: "b" } });
    const strokes = Object.fromEntries(all("path.fft-line").map((p) => [(p as SVGElement).dataset.series, (p as SVGElement).style.stroke]));
    expect(strokes).toEqual({ a: "var(--fft-deemphasis)", b: "var(--fft-series-2)" });
    expect(all(".fft-legend .fft-swatch").map((s) => (s as HTMLElement).style.background)).toEqual(["var(--fft-deemphasis)", "var(--fft-series-2)"]);
  });
});

describe("stacked bars", () => {
  test("each category becomes one column of segments", async () => {
    await draw({ rows: sales, view: { type: "bar", x: "region", y: ["revenue", "cost"], stacked: true } });
    const columns = all("g.fft-marks").map((g) => new Set([...g.querySelectorAll("path.fft-bar")].map((b) => b.getAttribute("d")?.match(/^M([\d.]+)/)?.[1])).size);
    expect(columns).toEqual([1, 1, 1]);
  });

  test("the axis covers each column's total", async () => {
    await draw({ rows: sales, view: { type: "bar", x: "region", y: ["revenue", "cost"], stacked: true } });
    expect(texts(".fft-tick-y").at(-1)).toBe("4K");
  });

  test("percent mode shows shares on a 0 to 100% axis", async () => {
    await draw({ rows: sales, view: { type: "bar", x: "region", y: ["revenue", "cost"], stacked: "percent" } });
    expect([texts(".fft-tick-y")[0], texts(".fft-tick-y").at(-1)]).toEqual(["0%", "100%"]);
  });

  test("the tooltip adds the column total", async () => {
    await draw({ rows: sales, view: { type: "bar", x: "region", y: ["revenue", "cost"], stacked: true } });
    all(".fft-hit")[0]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row")).toEqual(["1,200Revenue", "800Cost", "2,000Total"]);
  });
});

describe("curve option (line and area texture)", () => {
  const rows = [
    { m: "Jan", v: 10 },
    { m: "Feb", v: 40 },
    { m: "Mar", v: 25 },
    { m: "Apr", v: 30 },
  ];
  const corners = (d: string) => [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

  test("smooth lines and areas curve through the points", async () => {
    await draw({ rows, view: { type: "area", x: "m", y: "v", curve: "smooth" } });
    expect([all("path.fft-line")[0]?.getAttribute("d")?.includes("C"), all("path.fft-area")[0]?.getAttribute("d")?.includes("C")]).toEqual([true, true]);
  });

  test("a stepped line turns only at right angles", async () => {
    await draw({ rows, view: { type: "line", x: "m", y: "v", curve: "step" } });
    const points = corners(all("path.fft-line")[0]?.getAttribute("d") ?? "");
    expect(points.length).toBeGreaterThan(rows.length);
    expect(points.every(([x, y], i) => i === 0 || x === points[i - 1]?.[0] || y === points[i - 1]?.[1])).toBe(true);
  });

  test("validation: curve is linear, smooth or step", () => {
    const issues = validateSpec({ data: { type: "inline", rows: [] }, view: { type: "line", x: "m", y: "v", curve: "wavy" } }).map((i) => i.message);
    expect(issues.join(" ")).toContain("smooth");
  });
});

describe("time axis labels", () => {
  const months = Array.from({ length: 18 }, (_, i) => {
    const index = 2025 * 12 + 9 + i;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
  });
  const span = (label: Element) => {
    const x = Number(label.getAttribute("x"));
    const width = (label.textContent ?? "").length * 6;
    const anchor = label.getAttribute("text-anchor");
    const left = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
    return [left, left + width];
  };

  test.each(["line", "stream"])("a thinned %s axis keeps an even rhythm: every step between labels is the same, but for the closing date", async (kind) => {
    const weeks = Array.from({ length: 26 }, (_, i) => new Date(Date.UTC(2026, 2, 30 + i * 7)).toISOString().slice(0, 10));
    const view = kind === "line" ? { type: "line", x: "d", y: "v" } : { type: "area", x: "d", y: ["v", "w"], stacked: "stream" };
    await draw({ rows: weeks.map((d, i) => ({ d, v: 100 + i, w: 50 + i })), fields: { d: { format: { type: "date", style: "day" } } }, view });
    // Labels sit at their period's place on the axis, so equal steps in place are equal steps in time.
    const xs = all(".fft-tick-x").map((label) => Number(label.getAttribute("x")));
    const steps = xs.map((x, k) => (k ? Math.round(x - (xs[k - 1] ?? 0)) : null)).slice(1, -1);
    expect([xs.length > 2, new Set(steps).size]).toEqual([true, 1]);
  });

  test.each(["line", "bar"])("a thinned %s axis still names its first and last period, and no two labels touch", async (type) => {
    await draw({ rows: months.map((m, i) => ({ m, v: 100 + i })), view: { type, x: "m", y: "v" } });
    const labels = all(".fft-tick-x");
    expect(labels.length).toBeLessThan(18);
    expect([labels[0]?.textContent, labels.at(-1)?.textContent]).toEqual(["2025-10", "2027-03"]);
    const boxes = labels.map(span);
    expect(boxes.every((box, i) => i === 0 || (box[0] ?? 0) >= (boxes[i - 1]?.[1] ?? 0) + 8)).toBe(true);
  });
});

describe("category labels that wrap", () => {
  const names = ["Revenue", "New customers", "Gross margin (%)", "Net promoter score", "Tickets resolved", "Renewal rate", "Average deal size", "Pipeline coverage", "Days to close", "Win rate"];

  test("a few long names wrap onto short lines under their bar instead of being skipped, each line inside its band", async () => {
    await draw({ rows: names.map((kpi, i) => ({ kpi, v: 100 - i * 5 })), view: { type: "bar", x: "kpi", y: "v", mark: "lollipop" } });
    const labels = all(".fft-tick-x");
    expect(labels.map((label) => label.getAttribute("aria-label"))).toEqual(names);
    const lines = labels.map((label) => [...label.querySelectorAll("tspan")].map((t) => t.textContent));
    expect(lines[3]).toEqual(["Net", "promoter", "score"]);
    // The band each label sits in is a tenth of the plot; no line may be wider than it.
    const band = (Number(all("svg")[0]?.getAttribute("width")) - 40) / names.length;
    expect(lines.flat().every((line) => (line?.length ?? 0) * 6 <= band)).toBe(true);
  });

  test("wrapped months name their year once, then again only where it changes", async () => {
    const months = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
    await draw({ rows: months.map((m, i) => ({ m, v: 100 + i })), fields: { m: { format: { type: "date", style: "month" } } }, view: { type: "bar", x: "m", y: "v" } });
    const lines = all(".fft-tick-x").map((label) => [...label.querySelectorAll("tspan")].map((t) => t.textContent).join(" "));
    expect(lines.slice(0, 5)).toEqual(["Oct 2025", "Nov", "Dec", "Jan 2026", "Feb"]);
    expect(all(".fft-tick-x")[1]?.getAttribute("aria-label")).toBe("Nov 2025");
  });

  test("in a narrow card, months too tight for their year still all show, the year spilling only where it changes", async () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 340 });
    try {
      const months = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
      await draw({ rows: months.map((m, i) => ({ m, v: 100 + i })), fields: { m: { format: { type: "date", style: "month" } } }, view: { type: "bar", x: "m", y: "v" } });
      const lines = all(".fft-tick-x").map((label) => [...label.querySelectorAll("tspan")].map((t) => t.textContent).join(" "));
      expect(lines).toEqual(["Oct 2025", "Nov", "Dec", "Jan 2026", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]);
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    }
  });

  test("names that cannot wrap into three short lines are thinned as before", async () => {
    await draw({ rows: names.map((kpi, i) => ({ kpi: kpi.replace(/ /g, "_"), v: 100 - i * 5 })), view: { type: "bar", x: "kpi", y: "v" } });
    expect([all(".fft-tick-x").length < names.length, all(".fft-tick-x tspan").length]).toEqual([true, 0]);
  });
});

describe("value axis ticks", () => {
  test("tick labels are exact, never rounded: a quarter step reads 1.25M, not 1.3M", async () => {
    await draw({ rows: [{ m: "Jan", v: 820000 }, { m: "Feb", v: 1823000 }], view: { type: "line", x: "m", y: "v" } });
    expect(texts(".fft-tick-y")).toEqual(["750K", "1M", "1.25M", "1.5M", "1.75M", "2M"]);
  });
});

describe("forecast fan (line with forecast and band)", () => {
  const rows = [
    { m: "2026-01", v: 100, lo: null, hi: null, f: false },
    { m: "2026-02", v: 110, lo: null, hi: null, f: false },
    { m: "2026-03", v: 120, lo: 120, hi: 120, f: false },
    { m: "2026-04", v: 128, lo: 115, hi: 140, f: true },
    { m: "2026-05", v: 135, lo: 110, hi: 170, f: true },
  ];
  const spec = { rows, view: { type: "line", x: "m", y: "v", forecast: "f", band: { low: "lo", high: "hi", label: "80% range" } } };
  const points = (d: string) => d.split(/[ML]/).filter(Boolean);

  test("actuals draw solid and the forecast dashed, joined at the last actual, in a shaded forecast zone", async () => {
    await draw(spec);
    const solid = all("path.fft-line:not([data-forecast])");
    const dashed = all("path.fft-line[data-forecast]");
    expect([solid.length, dashed.length]).toEqual([1, 1]);
    expect(points(dashed[0]?.getAttribute("d") ?? "")[0]).toBe(points(solid[0]?.getAttribute("d") ?? "").at(-1));
    expect([all(".fft-forecast-zone").length, texts(".fft-forecast-label")]).toEqual([1, ["Forecast", "Shaded: 80% range"]]);
  });

  test("the band fans out from the last actual, and the axis stretches to hold it", async () => {
    await draw(spec);
    expect(all("path.fft-band").length).toBe(1);
    expect(Number(texts(".fft-tick-y").at(-1))).toBeGreaterThanOrEqual(170);
  });

  test("on an area, actuals keep their wash; the forecast's line is dashed and its wash fainter, joined at the last actual", async () => {
    await draw({ ...spec, view: { ...spec.view, type: "area" } });
    const washes = all("path.fft-area");
    expect([washes.filter((w) => w.hasAttribute("data-forecast")).length, washes.filter((w) => !w.hasAttribute("data-forecast")).length]).toEqual([1, 1]);
    expect([all("path.fft-line[data-forecast]").length, all(".fft-forecast-zone").length, all("path.fft-band").length]).toEqual([1, 1, 1]);
    const ahead = points(all("path.fft-area[data-forecast]")[0]?.getAttribute("d") ?? "")[0];
    expect(ahead).toBe(points(all("path.fft-line:not([data-forecast])")[0]?.getAttribute("d") ?? "").at(-1));
  });

  test("validation: a forecast fan needs one unstacked area", () => {
    const issues = validateSpec({ data: { type: "inline", rows: [] }, view: { type: "area", x: "m", y: ["a", "b"], stacked: true, forecast: "f" } }).map((i) => i.message);
    expect(issues).toContain("forecast and band draw on an unstacked area: drop stacked, or use a line.");
  });

  test("in a narrow forecast zone, the notes keep inside it: the range note gives way, Forecast aligns to the zone's end", async () => {
    const long = Array.from({ length: 30 }, (_, i) => ({ m: String(i), v: 100 + i, lo: i === 28 ? 128 : i === 29 ? 120 : null, hi: i === 28 ? 128 : i === 29 ? 140 : null, f: i === 29 }));
    await draw({ rows: long, view: { ...spec.view, x: "m" } });
    const notes = all(".fft-forecast-label");
    expect([notes.map((n) => n.textContent), notes[0]?.getAttribute("text-anchor")]).toEqual([["Forecast"], "end"]);
  });

  test("the tooltip marks forecast rows and gives the range", async () => {
    await draw(spec);
    all(".fft-hit")[4]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["2026-05 (forecast)", "135V", "110 to 17080% range"]);
  });
});

describe("line end labels", () => {
  test("each series' last value sits at its end", async () => {
    await draw({ rows: [{ m: "Jan", a: 10, b: 90 }, { m: "Feb", a: 12, b: 95 }], view: { type: "line", x: "m", y: ["a", "b"] } });
    expect(texts(".fft-end-label").sort()).toEqual(["12", "95"]);
  });

  test("ends that would collide drop their labels, leaving legend and tooltip", async () => {
    await draw({ rows: [{ m: "Jan", a: 10, b: 90 }, { m: "Feb", a: 50, b: 50.5 }], view: { type: "line", x: "m", y: ["a", "b"] } });
    expect(all(".fft-end-label").length).toBe(0);
  });

  test("more than 4 series, or endLabels false, show none", async () => {
    const row = (m: string, base: number) => ({ m, a: base, b: base + 20, c: base + 40, d: base + 60, e: base + 80 });
    await draw({ rows: [row("Jan", 0), row("Feb", 5)], view: { type: "line", x: "m", y: ["a", "b", "c", "d", "e"] } });
    expect(all(".fft-end-label").length).toBe(0);
    target.innerHTML = "";
    await draw({ rows: [{ m: "Jan", a: 10 }, { m: "Feb", a: 12 }], view: { type: "line", x: "m", y: "a", endLabels: false } });
    expect(all(".fft-end-label").length).toBe(0);
  });
});

describe("waterfall view", () => {
  const bridge = [
    { step: "Q2 revenue", amount: 1000 },
    { step: "New customers", amount: 150 },
    { step: "Churn", amount: -80 },
  ];
  const spec = { rows: bridge, view: { type: "waterfall", label: "step", value: "amount", totals: ["Q2 revenue"], endLabel: "Q3 revenue" } };

  test("draws a bar per step plus the end total, typed by direction", async () => {
    await draw(spec);
    expect(all("rect.fft-step").map((r) => (r as SVGElement).dataset.kind)).toEqual(["total", "up", "down", "total"]);
    expect(texts(".fft-tick-x")).toEqual(["Q2 revenue", "New customers", "Churn", "Q3 revenue"]);
  });

  test("labels each step with its signed change and each total with its value", async () => {
    await draw(spec);
    expect(texts(".fft-step-label")).toEqual(["1,000", "+150", "−80", "1,070"]);
  });

  test("hairline connectors join each bar to the next", async () => {
    await draw(spec);
    expect(all("line.fft-connector").length).toBe(3);
  });

  test("fit zooms the axis onto the running totals, with totals rising from the axis floor", async () => {
    await draw({ ...spec, view: { ...spec.view, fit: true } });
    // Every bar writes its value, so there is no value axis to repeat them (it used to list 900 to 1.15K): the floor
    // is the only line.
    expect(texts(".fft-tick-y")).toEqual([]);
    const [first, change] = all("rect.fft-step").map((r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height")));
    const floor = Number(target.querySelector(".fft-baseline")?.getAttribute("y1"));
    expect([first, change !== floor]).toEqual([floor, true]);
  });

  test("the tooltip gives the change and the running total", async () => {
    await draw(spec);
    all(".fft-hit")[2]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Churn", "−80Change", "1,070Running total"]);
  });
});

describe("heatmap view", () => {
  const cells = [
    { day: "Mon", slot: "AM", tickets: 0 },
    { day: "Mon", slot: "PM", tickets: 50 },
    { day: "Tue", slot: "AM", tickets: 100 },
    { day: "Tue", slot: "PM", tickets: 25 },
  ];
  const spec = { rows: cells, view: { type: "heatmap", x: "slot", y: "day", value: "tickets" } };

  test("lays the cells out as a grid with row and column labels", async () => {
    await draw(spec);
    expect([texts(".fft-heat-col"), texts(".fft-heat-row"), all(".fft-cell").length]).toEqual([["AM", "PM"], ["Mon", "Tue"], 4]);
  });

  test("shades each cell on a 7-step scale from the lowest to the highest value", async () => {
    await draw(spec);
    expect(all(".fft-cell").map((c) => (c as HTMLElement).dataset.step)).toEqual(["1", "4", "7", "2"]);
    expect(texts(".fft-cell")).toEqual(["0", "50", "100", "25"]);
  });

  test("a missing cell stays empty", async () => {
    await draw({ ...spec, rows: cells.slice(0, 3) });
    const last = all(".fft-cell")[3] as HTMLElement;
    expect([last.dataset.step, last.textContent]).toEqual([undefined, ""]);
  });

  test("a legend shows the range", async () => {
    await draw(spec);
    expect(texts(".fft-heat-legend span")).toEqual(["0", "100"]);
  });

  test("focusing a cell names both labels and the value", async () => {
    await draw(spec);
    (all(".fft-cell")[1] as HTMLElement).dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Mon, PM", "50Tickets"]);
  });
});

describe("spark format in views", () => {
  test("a table cell holding numbers draws a sparkline through each of them, latest point marked", async () => {
    await draw({ rows: [{ region: "North", trend: [3, 5, 4, 6] }], fields: { trend: { format: "spark" } }, view: { type: "table" } });
    const d = target.querySelector("td svg.fft-spark path")?.getAttribute("d") ?? "";
    expect(d.replace(/[^ML]/g, "")).toBe("MLLL");
    expect(all("td svg.fft-spark circle").length).toBe(1);
    expect(target.querySelector("td svg.fft-spark")?.getAttribute("aria-label")).toBe("Trend from 3 to 6");
  });

  test("kind bar draws one mini column per value", async () => {
    await draw({ rows: [{ r: "N", trend: [3, 5, 4] }], fields: { trend: { format: { type: "spark", kind: "bar" } } }, view: { type: "table" } });
    expect(all("td svg.fft-spark rect").length).toBe(3);
  });
});

describe("scatter view", () => {
  const deals = [
    { name: "Aurora", size: 240, days: 30, stage: "Won" },
    { name: "Cobalt", size: 185, days: 62, stage: "Open" },
    { name: "Fjord", size: 96, days: 45, stage: "Won" },
    { name: "Halcyon", size: 64, days: 80, stage: "Lost" },
  ];
  const spec = { rows: deals, view: { type: "scatter", x: "days", y: "size", series: "stage", label: "name" } };

  test("one dot per row, colored by group in order of first appearance", async () => {
    await draw(spec);
    expect(all("circle.fft-point").map((c) => (c as SVGElement).style.fill)).toEqual([
      "var(--fft-series-1)",
      "var(--fft-series-2)",
      "var(--fft-series-1)",
      "var(--fft-series-3)",
    ]);
    expect(texts(".fft-legend li")).toEqual(["Won", "Open", "Lost"]);
  });

  test("both axes carry a title, since both are numbers", async () => {
    await draw(spec);
    expect(texts(".fft-axis-title")).toEqual(["Days", "Size"]);
  });

  test("focusing a point names it and gives both values", async () => {
    await draw(spec);
    all(".fft-point-hit")[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Cobalt", "62Days", "185Size", "OpenStage"]);
  });

  test("rows without both numbers are left out", async () => {
    await draw({ ...spec, rows: [...deals, { name: "Nope", size: null, days: 3, stage: "Won" }] });
    expect(all("circle.fft-point").length).toBe(4);
  });

  test("clicking a point selects its row", async () => {
    const seen = selections();
    await draw(spec);
    all(".fft-point-hit")[3]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(seen).toEqual([deals[3]]);
  });
});

describe("small multiples of charts", () => {
  const rows = [
    { region: "A", m: "Jan", sales: 5, cost: 2 },
    { region: "A", m: "Feb", sales: 10, cost: 3 },
    { region: "B", m: "Jan", sales: 60, cost: 20 },
    { region: "B", m: "Feb", sales: 100, cost: 30 },
  ];

  test("panels share one y scale, so they compare honestly", async () => {
    await draw({ rows, facet: { field: "region" }, view: { type: "bar", x: "m", y: "sales" } });
    const tops = all(".fft-facet").map((panel) => [...panel.querySelectorAll(".fft-tick-y")].at(-1)?.textContent);
    expect(tops).toEqual(["100", "100"]);
  });

  test("several series get one shared legend above the panels instead of one per panel", async () => {
    await draw({ rows, facet: { field: "region" }, view: { type: "line", x: "m", y: ["sales", "cost"] } });
    expect(all(".fft-facet .fft-legend").length).toBe(0);
    expect(texts(".fft-facet-legend li")).toEqual(["Sales", "Cost"]);
  });
});

describe("kpi icons", () => {
  test("an icon sits on its own tile beside the number", async () => {
    await draw({ rows: [{ v: 5 }], view: { type: "kpi", value: "v", icon: "users" } });
    const icon = target.querySelector<HTMLElement>(".fft-kpi-icon");
    expect([icon?.dataset.icon, icon?.querySelectorAll("svg path").length ? "drawn" : "empty", icon?.getAttribute("aria-hidden")]).toEqual(["users", "drawn", "true"]);
  });

  test("without an icon there is no tile", async () => {
    await draw({ rows: [{ v: 5 }], view: { type: "kpi", value: "v" } });
    expect(all(".fft-kpi-icon").length).toBe(0);
  });
});

describe("reference lines and bands", () => {
  const months = [
    { m: "Jan", v: 10 },
    { m: "Feb", v: 30 },
  ];

  test("a value draws a labelled dashed line, and the axis stretches to show it", async () => {
    await draw({ rows: months, view: { type: "line", x: "m", y: "v", reference: [{ value: 50, label: "Target" }] } });
    expect(texts(".fft-ref-label")).toEqual(["Target 50"]);
    expect(all("line.fft-ref").length).toBe(1);
    expect(Number(texts(".fft-tick-y").at(-1))).toBeGreaterThanOrEqual(50);
  });

  test("a field reference is summarized over the rows", async () => {
    await draw({ rows: months, view: { type: "bar", x: "m", y: "v", reference: [{ field: "v", agg: "avg", label: "Average" }] } });
    expect(texts(".fft-ref-label")).toEqual(["Average 20"]);
  });

  test("a band shades the range between from and to", async () => {
    await draw({ rows: months, view: { type: "area", x: "m", y: "v", reference: [{ from: 10, to: 20, label: "Normal" }] } });
    const band = target.querySelector("rect.fft-ref-band");
    expect(band).not.toBeNull();
    expect(Number(band?.getAttribute("height"))).toBeGreaterThan(0);
    expect(texts(".fft-ref-label")).toEqual(["Normal"]);
  });

  const anchor = () => target.querySelector(".fft-ref-label")?.getAttribute("text-anchor");

  test("the label sits at the right end of the line when nothing is there", async () => {
    await draw({ rows: months, view: { type: "line", x: "m", y: "v", reference: [{ value: 50, label: "Target" }] } });
    expect(anchor()).toBe("end");
  });

  test("the label moves to the left end when the data runs through its right-hand spot", async () => {
    const rising = Array.from({ length: 20 }, (_, i) => ({ m: `M${i}`, v: i * 5 }));
    await draw({ rows: rising, view: { type: "line", x: "m", y: "v", reference: [{ value: 90, label: "Target" }] } });
    expect(anchor()).toBe("start");
  });

  test("bars taller than the line push the label clear of them too", async () => {
    const rising = [10, 20, 30, 40, 100].map((v, i) => ({ m: `M${i}`, v }));
    await draw({ rows: rising, view: { type: "bar", x: "m", y: "v", reference: [{ value: 50, label: "Target" }] } });
    expect(anchor()).toBe("start");
  });

  test("scatter dots push the label clear as well", async () => {
    const diagonal = Array.from({ length: 10 }, (_, i) => ({ a: i + 1, b: i + 1 }));
    await draw({ rows: diagonal, view: { type: "scatter", x: "a", y: "b", reference: [{ value: 9.5, label: "Goal" }] } });
    expect(anchor()).toBe("start");
  });

  test("scatter takes reference lines on its value axis too", async () => {
    await draw({ rows: [{ a: 1, b: 2 }, { a: 3, b: 4 }], view: { type: "scatter", x: "a", y: "b", reference: [{ value: 3, label: "Goal" }] } });
    expect(texts(".fft-ref-label")).toEqual(["Goal 3"]);
  });
});

describe("bullet view", () => {
  const kpis = [
    { kpi: "Revenue", actual: 270, target: 300 },
    { kpi: "Margin", actual: 33, target: 30 },
  ];
  const spec = { rows: kpis, view: { type: "bullet", label: "kpi", value: "actual", target: "target" } };

  test("one bullet per row: three qualitative bands, the value bar and the target tick", async () => {
    await draw(spec);
    expect(all(".fft-bullet").length).toBe(2);
    expect(all(".fft-bullet").map((b) => b.querySelectorAll(".fft-bullet-band").length)).toEqual([3, 3]);
    expect(all(".fft-bullet-target").length).toBe(2);
  });

  test("the value bar and target tick sit on a scale up to the last band (target × 1.2 by default)", async () => {
    await draw(spec);
    const [first] = all(".fft-bullet");
    const bar = first?.querySelector(".fft-bullet-value") as SVGElement;
    const tick = first?.querySelector(".fft-bullet-target") as SVGElement;
    // domain 0..360: 270 is 75%, 300 is 83.33%
    expect([bar.getAttribute("width"), tick.getAttribute("x1")]).toEqual(["75%", "83.33%"]);
  });

  test("label and value as text, with attainment in the tooltip", async () => {
    await draw(spec);
    expect([texts(".fft-bullet-label"), texts(".fft-bullet-number")]).toEqual([
      ["Revenue", "Margin"],
      ["270", "33"],
    ]);
    all(".fft-bullet")[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Margin", "33Actual", "30Target", "110%Of target"]);
  });
  test("a met target carries a check by its number; a missed one says what is left to go, in the tooltip and to screen readers", async () => {
    await draw(spec);
    expect(all(".fft-bullet").map((b) => [(b as HTMLElement).dataset.met ?? "", Boolean(b.querySelector(".fft-bullet-number .fft-check"))])).toEqual([
      ["", false],
      ["true", true],
    ]);
    expect(all(".fft-bullet").map((b) => b.getAttribute("aria-label")?.split(", ").at(-1))).toEqual(["30 to go", "target met"]);
    all(".fft-bullet")[0]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row")).toEqual(["270Actual", "300Target", "90%Of target", "30To go"]);
  });
});

describe("treemap view", () => {
  const customers = [
    { name: "Aurora", segment: "Enterprise", revenue: 214 },
    { name: "Bellwether", segment: "Enterprise", revenue: 188 },
    { name: "Cobalt", segment: "Mid-market", revenue: 172 },
    { name: "Halcyon", segment: "Small business", revenue: 98 },
  ];
  const spec = { rows: customers, view: { type: "treemap", label: "name", value: "revenue", group: "segment" } };

  test("tile figures share one precision, so they read as one set: €214.0K beside €188.5K", async () => {
    const big = customers.map((c, i) => ({ ...c, revenue: [214000, 188500, 172300, 97600][i] }));
    await draw({ ...spec, rows: big, fields: { revenue: { format: { type: "currency", currency: "EUR", compact: true } } } });
    expect(texts(".fft-tile-value").slice(0, 2)).toEqual(["€214.0K", "€188.5K"]);
  });

  test("one tile per row, colored by group in order of first appearance", async () => {
    await draw(spec);
    expect(all("rect.fft-tile").map((t) => (t as SVGElement).style.fill)).toEqual([
      "var(--fft-series-1)",
      "var(--fft-series-1)",
      "var(--fft-series-2)",
      "var(--fft-series-3)",
    ]);
    expect(texts(".fft-legend li")).toEqual(["Enterprise", "Mid-market", "Small business"]);
  });

  test("without a group every tile shares one color and there is no legend", async () => {
    await draw({ ...spec, view: { type: "treemap", label: "name", value: "revenue" } });
    expect(new Set(all("rect.fft-tile").map((t) => (t as SVGElement).style.fill))).toEqual(new Set(["var(--fft-series-1)"]));
    expect(all(".fft-legend").length).toBe(0);
  });

  test("tiles big enough carry their name and value", async () => {
    await draw(spec);
    expect(texts(".fft-tile-name")).toContain("Aurora");
    expect(texts(".fft-tile-value")).toContain("214");
  });

  test("focusing a tile gives its value and share", async () => {
    await draw(spec);
    all(".fft-tile-hit")[3]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Halcyon", "98Revenue", "15%Share", "Small businessSegment"]);
  });
});

describe("funnel view", () => {
  const stages = [
    { stage: "Visits", people: 1000 },
    { stage: "Signups", people: 400 },
    { stage: "Activated", people: 300 },
    { stage: "Paying", people: 90 },
  ];
  const spec = { rows: stages, view: { type: "funnel", label: "stage", value: "people" } };

  test("centered bars narrow with each stage, in proportion to the first", async () => {
    await draw(spec);
    expect(all(".fft-funnel-bar").map((b) => (b as HTMLElement).style.width)).toEqual(["100%", "40%", "30%", "9%"]);
    expect(texts(".fft-funnel-label")).toEqual(["Visits", "Signups", "Activated", "Paying"]);
  });

  test("the conversion from each stage to the next sits between them", async () => {
    await draw(spec);
    expect(texts(".fft-funnel-step")).toEqual(["40% →", "75% →", "30% →"]);
  });

  test("each stage shows its value and its share of the first stage", async () => {
    await draw(spec);
    expect([texts(".fft-funnel-value"), texts(".fft-funnel-share")]).toEqual([
      ["1,000", "400", "300", "90"],
      ["100%", "40%", "30%", "9%"],
    ]);
  });
});

describe("calendar view", () => {
  // 2026-03-02 is a Monday; 14 days span exactly two weeks.
  const days = Array.from({ length: 14 }, (_, i) => ({ day: `2026-03-${String(i + 2).padStart(2, "0")}`, sales: i }));
  const spec = { rows: days, view: { type: "calendar", date: "day", value: "sales" } };

  test("the weeks fill the card's width: cells stay square up to 34px, then widen, never past the golden ratio", async () => {
    // 16 weeks in the 640px test width: square 21px cells would leave a third of the card empty.
    const season = Array.from({ length: 112 }, (_, i) => ({ day: new Date(Date.UTC(2026, 2, 2 + i)).toISOString().slice(0, 10), sales: i }));
    await draw({ rows: season, view: { type: "calendar", date: "day", value: "sales" } });
    const width = Number(target.querySelector("svg.fft-calendar")?.getAttribute("width"));
    const cell = all("rect.fft-day")[0];
    const [w, h] = [Number(cell?.getAttribute("width")), Number(cell?.getAttribute("height"))];
    expect(width / 640).toBeGreaterThan(0.95);
    expect([h <= 34, w >= h, w <= h * 1.618]).toEqual([true, true, true]);
  });

  test("one cell per day, laid out in week columns from Monday", async () => {
    await draw(spec);
    const cells = all("rect.fft-day");
    expect(cells.length).toBe(14);
    const columns = new Set(cells.map((c) => c.getAttribute("x")));
    const rows = new Set(cells.map((c) => c.getAttribute("y")));
    expect([columns.size, rows.size]).toEqual([2, 7]);
  });

  test("cells are shaded from lowest to highest on the 7-step scale", async () => {
    await draw(spec);
    const steps = all("rect.fft-day").map((c) => (c as SVGElement).dataset.step);
    expect([steps[0], steps[13]]).toEqual(["1", "7"]);
  });

  test("months and weekdays are labelled", async () => {
    await draw(spec);
    expect(texts(".fft-cal-month")).toEqual(["Mar"]);
    expect(texts(".fft-cal-weekday")).toEqual(["Mon", "Wed", "Fri"]);
  });

  test("focusing a day gives the date and value", async () => {
    await draw(spec);
    all(".fft-day")[3]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Thu, Mar 5, 2026", "3Sales"]);
  });
});

describe("combo: lines over bars", () => {
  const months = [
    { m: "Jan", revenue: 80, target: 90 },
    { m: "Feb", revenue: 120, target: 140 },
  ];
  const spec = { rows: months, view: { type: "bar", x: "m", y: "revenue", lines: "target" } };

  test("draws the line series over the bars, taking the next palette color", async () => {
    await draw(spec);
    expect(all("path.fft-bar").length).toBe(2);
    const lines = all("path.fft-line");
    expect([lines.length, (lines[0] as SVGElement).style.stroke]).toEqual([1, "var(--fft-series-2)"]);
  });

  test("one axis covers both, so the line never needs a second scale", async () => {
    await draw(spec);
    expect(Number(texts(".fft-tick-y").at(-1))).toBeGreaterThanOrEqual(140);
  });

  test("the legend and tooltip include the line series, keyed by shape", async () => {
    await draw(spec);
    expect(all(".fft-legend li").map((li) => [li.textContent, (li.querySelector(".fft-swatch") as HTMLElement).dataset.shape])).toEqual([
      ["Revenue", "rect"],
      ["Target", "line"],
      ["Below target", "rect"],
    ]);
    all(".fft-hit")[1]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row")).toEqual(["120Revenue", "140Target"]);
  });

  test("a bar below its target line is marked as a miss: a light fill outlined in its own color, keyed in the legend", async () => {
    await draw({ ...spec, rows: [{ m: "Jan", revenue: 80, target: 90 }, { m: "Feb", revenue: 150, target: 140 }] });
    const bars = all("path.fft-bar") as SVGElement[];
    expect(bars.map((bar) => bar.dataset.tone ?? null)).toEqual(["miss", null]);
    // The outline is the miss's only edge: it leans toward the text color, so it keeps 3:1 on any page, light or dark.
    expect([bars[0]?.style.stroke, bars[0]?.style.fill.startsWith("color-mix")]).toEqual(["color-mix(in srgb, var(--fft-series-1) 85%, var(--fft-text))", true]);
    expect((all(".fft-legend li").at(-1)?.querySelector(".fft-swatch") as HTMLElement).dataset.tone).toBe("miss");
  });

  test("when every bar beats its target, or the line is no target at all, nothing is marked as a miss", async () => {
    await draw({ ...spec, rows: [{ m: "Jan", revenue: 95, target: 90 }] });
    const allHit = [all("path.fft-bar[data-tone]").length, texts(".fft-legend li").includes("Below target")];
    await draw({ rows: [{ m: "Jan", revenue: 80, average: 90 }], view: { type: "bar", x: "m", y: "revenue", lines: "average" } });
    expect([allHit, [all("path.fft-bar[data-tone]").length, texts(".fft-legend li").some((t) => t?.startsWith("Below"))]]).toEqual([[0, false], [0, false]]);
  });

  test("under a dashed target line, a lower-is-better chart marks the dots over the line as misses, keyed Over", async () => {
    const reference = [{ value: 60, label: "1 hour target" }];
    await draw({ rows: [{ team: "A", minutes: 95 }, { team: "B", minutes: 40 }, { team: "C", minutes: 64 }], view: { type: "bar", x: "team", y: "minutes", mark: "lollipop", goodWhen: "down", reference } });
    const dots = all("circle.fft-lolli-dot") as SVGElement[];
    expect(dots.map((dot) => dot.dataset.tone ?? null)).toEqual(["miss", null, "miss"]);
    // A hollow dot: the light fill and the outline that keeps 3:1, as a missed bar has.
    expect([dots[0]?.style.fill.startsWith("color-mix"), dots[0]?.style.stroke]).toEqual([true, "color-mix(in srgb, var(--fft-series-1) 85%, var(--fft-text))"]);
    const key = all(".fft-legend li").at(-1);
    expect([key?.textContent, (key?.querySelector(".fft-swatch") as HTMLElement).dataset.tone]).toEqual(["Over 1 hour target", "miss"]);
    // The keys mirror the marks: round for lollipop dots, as bars get squares.
    expect(all(".fft-legend .fft-swatch").map((swatch) => (swatch as HTMLElement).dataset.shape)).toEqual(["dot", "dot"]);
  });

  test("a dashed target line marks the bars under it by default; an average line marks nothing", async () => {
    const rows = [{ m: "Jan", revenue: 80 }, { m: "Feb", revenue: 120 }];
    await draw({ rows, view: { type: "bar", x: "m", y: "revenue", reference: [{ value: 100, label: "Target" }] } });
    const marked = [(all("path.fft-bar") as SVGElement[]).map((bar) => bar.dataset.tone ?? null), texts(".fft-legend li").at(-1)];
    target.replaceChildren();
    await draw({ rows, view: { type: "bar", x: "m", y: "revenue", reference: [{ value: 100, label: "Average" }] } });
    expect([marked, all("path.fft-bar[data-tone]").length, all(".fft-legend").length]).toEqual([[["miss", null], "Below target"], 0, 0]);
  });
});

describe("beeswarm view", () => {
  const deals = [
    { deal: "A", size: 10, region: "North" },
    { deal: "B", size: 11, region: "North" },
    { deal: "C", size: 11.5, region: "North" },
    { deal: "D", size: 40, region: "South" },
    { deal: "E", size: 42, region: "South" },
  ];
  const spec = { rows: deals, view: { type: "beeswarm", value: "size", group: "region", label: "deal" } };

  test("one dot per row, one labelled row per group", async () => {
    await draw(spec);
    expect(all("circle.fft-bee").length).toBe(5);
    expect(texts(".fft-swarm-group")).toEqual(["North", "South"]);
  });

  test("dots in the same group keep apart instead of piling up", async () => {
    await draw(spec);
    const north = all("circle.fft-bee").slice(0, 3).map((c) => [Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))]);
    for (let i = 0; i < north.length; i++)
      for (let j = i + 1; j < north.length; j++) {
        const [a, b] = [north[i] as number[], north[j] as number[]];
        expect(Math.hypot((a[0] as number) - (b[0] as number), (a[1] as number) - (b[1] as number))).toBeGreaterThanOrEqual(9);
      }
  });

  test("focusing a dot names it with its value and group", async () => {
    await draw(spec);
    all(".fft-bee-hit")[3]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["D", "40Size", "SouthRegion"]);
  });
});

describe("sankey view", () => {
  const flows = [
    { from: "Search", to: "Pricing", visits: 60 },
    { from: "Search", to: "Blog", visits: 40 },
    { from: "Social", to: "Blog", visits: 50 },
    { from: "Pricing", to: "Signup", visits: 30 },
  ];
  const spec = { rows: flows, view: { type: "sankey", source: "from", target: "to", value: "visits" } };

  test("node totals share one precision: 6.0K beside 6.8K, and plain numbers stay plain", async () => {
    const many = flows.map((f, i) => ({ ...f, visits: [6000, 6800, 5700, 2300][i] }));
    await draw({ ...spec, rows: many, fields: { visits: { format: { type: "number", compact: true } } } });
    const compact = texts(".fft-node-value");
    target.replaceChildren();
    await draw(spec);
    expect([compact.every((t) => /\d\.\d/.test(t ?? "")), texts(".fft-node-value").every((t) => /^\d+$/.test(t ?? ""))]).toEqual([true, true]);
  });

  test("draws one node per name and one ribbon per flow", async () => {
    await draw(spec);
    expect([all("rect.fft-node").length, all("path.fft-ribbon").length]).toEqual([5, 4]);
    expect(texts(".fft-node-label").sort()).toEqual(["Blog", "Pricing", "Search", "Signup", "Social"]);
  });

  test("ribbons carry the color of the source they started from", async () => {
    await draw(spec);
    const color = (from: string, to: string) =>
      (all("path.fft-ribbon").find((p) => (p as SVGElement).dataset.flow === `${from}→${to}`) as SVGElement).style.fill;
    expect([color("Search", "Pricing"), color("Social", "Blog"), color("Pricing", "Signup")]).toEqual([
      "var(--fft-series-1)",
      "var(--fft-series-2)",
      "var(--fft-series-1)",
    ]);
  });

  test("focusing a ribbon names both ends, the volume and its share of the source", async () => {
    await draw(spec);
    const ribbon = all("path.fft-ribbon-hit").find((p) => (p as SVGElement).dataset.flow === "Search→Blog") as Element;
    ribbon.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Search → Blog", "40Visits", "40%Of Search"]);
  });
});

describe("dumbbell view", () => {
  const regions = [
    { region: "North", last: 200, now: 278 },
    { region: "South", last: 240, now: 204 },
  ];
  const spec = { rows: regions, view: { type: "dumbbell", label: "region", from: "last", to: "now" } };

  test("one row per data row with a before dot, an after dot and a joining line", async () => {
    await draw(spec);
    expect([all("circle.fft-db-from").length, all("circle.fft-db-to").length, all("line.fft-db-line").length]).toEqual([2, 2, 2]);
    expect(texts(".fft-db-label")).toEqual(["North", "South"]);
  });

  test("dots sit on one shared axis, so a fall points left", async () => {
    await draw(spec);
    const [north, south] = [0, 1].map((i) => [Number(all("circle.fft-db-from")[i]?.getAttribute("cx")), Number(all("circle.fft-db-to")[i]?.getAttribute("cx"))]);
    expect([(north?.[1] ?? 0) > (north?.[0] ?? 0), (south?.[1] ?? 0) < (south?.[0] ?? 0)]).toEqual([true, true]);
  });

  test("the legend names before and after, and the tooltip gives the change", async () => {
    await draw(spec);
    expect(texts(".fft-legend li")).toEqual(["Last", "Now"]);
    all(".fft-db-hit")[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["South", "240Last", "204Now", "−15.0%Change"]);
  });
  test("two different measures are not before and after: each dot takes a series color, and the tooltip gives the gap", async () => {
    await draw({ rows: [{ region: "North", revenue: 278, cost: 190 }], view: { type: "dumbbell", label: "region", from: "revenue", to: "cost" } });
    const dots = [all("circle.fft-db-from")[0], all("circle.fft-db-to")[0]] as SVGElement[];
    expect(dots.map((dot) => dot.style.fill)).toEqual(["var(--fft-series-1)", "var(--fft-series-2)"]);
    expect(all(".fft-legend .fft-swatch").map((s) => (s as HTMLElement).style.background)).toEqual(["var(--fft-series-1)", "var(--fft-series-2)"]);
    all(".fft-db-hit")[0]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row")).toEqual(["278Revenue", "190Cost", "88Gap"]);
  });
});

describe("slope view", () => {
  const regions = [
    { region: "North", last: 200, now: 278 },
    { region: "South", last: 240, now: 204 },
  ];
  const spec = { rows: regions, view: { type: "slope", label: "region", from: "last", to: "now" } };
  const ends = (i: number) => all(".fft-slope")[i]?.querySelectorAll("circle.fft-slope-dot") ?? [];
  const cy = (dot: Element | undefined) => Number(dot?.getAttribute("cy"));

  test("one line per row with a dot at each end, under the two column headers", async () => {
    await draw(spec);
    expect([all(".fft-slope-line").length, all("circle.fft-slope-dot").length]).toEqual([2, 4]);
    expect(texts(".fft-slope-head")).toEqual(["Last", "Now"]);
  });

  test("both columns share one scale, so a rise climbs and a fall drops", async () => {
    await draw(spec);
    const [northFrom, northTo] = [...ends(0)];
    const [southFrom, southTo] = [...ends(1)];
    expect([cy(northTo) < cy(northFrom), cy(southTo) > cy(southFrom)]).toEqual([true, true]);
  });

  test("each line carries its direction, which picks the up or down color", async () => {
    await draw(spec);
    expect(all(".fft-slope").map((row) => row.getAttribute("data-direction"))).toEqual(["up", "down"]);
  });

  test("names and values label both ends: name then value on the left, value then name on the right", async () => {
    await draw(spec);
    const left = all(".fft-slope-label-from").map((t) => [...t.children].map((c) => c.textContent));
    const right = all(".fft-slope-label-to").map((t) => [...t.children].map((c) => c.textContent));
    expect([left, right]).toEqual([
      [["North", "200"], ["South", "240"]],
      [["278", "North"], ["204", "South"]],
    ]);
  });

  test("labels that would overlap are nudged at least 13px apart", async () => {
    await draw({ ...spec, rows: [{ region: "A", last: 100, now: 150 }, { region: "B", last: 101, now: 151 }, { region: "C", last: 300, now: 100 }] });
    const ys = all(".fft-slope-label-from").map((t) => Number(t.getAttribute("y")));
    expect(Math.abs((ys[0] ?? 0) - (ys[1] ?? 0))).toBeGreaterThanOrEqual(13);
  });

  test("highlight keeps the named rows in color and mutes the rest", async () => {
    await draw({ ...spec, view: { ...spec.view, highlight: "South" } });
    expect(all(".fft-slope").map((row) => row.hasAttribute("data-muted"))).toEqual([true, false]);
  });

  test("the tooltip gives both values and the change, and Enter selects the row", async () => {
    const seen = selections();
    await draw(spec);
    const hit = all(".fft-slope-hit")[1] as Element;
    hit.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["South", "240Last", "204Now", "−15.0%Change"]);
    press(hit, "Enter");
    expect(seen).toEqual([regions[1]]);
  });
});

describe("bump view", () => {
  // B leads in Jan, A overtakes in Feb; C stays last.
  const ranks = [
    { m: "Jan", team: "A", v: 20 },
    { m: "Jan", team: "B", v: 30 },
    { m: "Jan", team: "C", v: 5 },
    { m: "Feb", team: "A", v: 40 },
    { m: "Feb", team: "B", v: 35 },
    { m: "Feb", team: "C", v: 6 },
  ];
  const spec = { rows: ranks, view: { type: "bump", x: "m", series: "team", value: "v" } };
  const dots = (i: number) => [...(all(".fft-bump")[i]?.querySelectorAll("circle.fft-bump-dot") ?? [])];
  const cy = (dot: Element | undefined) => Number(dot?.getAttribute("cy"));

  test("one line per series and one dot per period, with period labels below", async () => {
    await draw(spec);
    expect([all(".fft-bump-line").length, all("circle.fft-bump-dot").length]).toEqual([3, 6]);
    expect(texts(".fft-tick-x")).toEqual(["Jan", "Feb"]);
  });

  test("each period ranks the series by value, highest on top", async () => {
    await draw(spec);
    const [aJan, aFeb] = dots(0);
    const [bJan, bFeb] = dots(1);
    expect([cy(bJan) < cy(aJan), cy(aFeb) < cy(bFeb)]).toEqual([true, true]);
  });

  test("names label both ends with the rank there: name then rank on the left, rank then name on the right", async () => {
    await draw(spec);
    const left = all(".fft-bump-label-from").map((t) => [...t.children].map((c) => c.textContent));
    const right = all(".fft-bump-label-to").map((t) => [...t.children].map((c) => c.textContent));
    expect([left, right]).toEqual([
      [["A", "2"], ["B", "1"], ["C", "3"]],
      [["1", "A"], ["2", "B"], ["3", "C"]],
    ]);
  });

  test("in a narrow card the left labels shrink to the rank alone, so the chart fits, and month labels never collide", async () => {
    const months = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
    const rows = months.flatMap((m, i) => ["Platform", "Analytics", "Integrations"].map((team, k) => ({ m, team, v: (k + 1) * 10 + (k === 2 ? i * 9 : 0) })));
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 300 });
    try {
      await draw({ rows, fields: { m: { format: { type: "date", style: "month" } } }, view: { type: "bump", x: "m", series: "team", value: "v" } });
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    }
    expect(all(".fft-bump-label-from").map((t) => t.children.length)).toEqual([1, 1, 1]);
    expect(Number(target.querySelector(".fft-chart svg")?.getAttribute("width"))).toBeLessThanOrEqual(300);
    const extents = all(".fft-tick-x").map((t) => {
      const x = Number(t.getAttribute("x"));
      const w = (t.textContent ?? "").length * 6;
      return [x - w / 2, x + w / 2];
    });
    expect(extents.every((e, i) => i === 0 || e[0]! >= extents[i - 1]![1]! + 8)).toBe(true);
    expect(texts(".fft-tick-x").at(-1)).toBe("Sep 2026");
  });

  test("each series keeps its own palette color, so color follows the entity", async () => {
    await draw(spec);
    const strokes = all(".fft-bump-line").map((line) => (line as SVGElement).style.stroke);
    expect(new Set(strokes).size).toBe(3);
  });

  test("highlight keeps the named series in color and mutes the rest", async () => {
    await draw({ ...spec, view: { ...spec.view, highlight: "C" } });
    expect(all(".fft-bump").map((g) => [g.getAttribute("data-series"), g.hasAttribute("data-muted")])).toEqual([
      ["A", true],
      ["B", true],
      ["C", false],
    ]);
  });

  test("the tooltip gives the first and last rank and the latest value, and Enter selects the latest row", async () => {
    const seen = selections();
    await draw(spec);
    const hit = all(".fft-bump-hit")[0] as Element;
    hit.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["A", "#2Jan", "#1Feb", "40V"]);
    press(hit, "Enter");
    expect(seen).toEqual([ranks[3]]);
  });
});

describe("marimekko view", () => {
  // A and B are equally big markets with different mixes; C is small.
  const mix = [
    { r: "A", p: "X", v: 30 },
    { r: "A", p: "Y", v: 10 },
    { r: "B", p: "X", v: 20 },
    { r: "B", p: "Y", v: 20 },
    { r: "C", p: "X", v: 5 },
  ];
  const spec = { rows: mix, view: { type: "marimekko", x: "r", series: "p", value: "v" } };
  const segs = (column?: string) => all(column ? `rect.fft-mekko-seg[data-column="${column}"]` : "rect.fft-mekko-seg");
  const num = (node: Element | undefined, attr: string) => Number(node?.getAttribute(attr));
  const columnWidth = (column: string) => num(segs(column)[0], "width");

  test("one segment per column and series, with a legend for the series", async () => {
    await draw(spec);
    expect(segs().length).toBe(5);
    expect(texts(".fft-legend li")).toEqual(["X", "Y"]);
  });

  test("column widths follow the column totals", async () => {
    await draw(spec);
    expect(Math.abs(columnWidth("A") - columnWidth("B"))).toBeLessThan(1);
    expect(columnWidth("A") / columnWidth("C")).toBeGreaterThan(6);
  });

  test("every column fills the full height, and a segment's height is its share of the column", async () => {
    await draw(spec);
    const span = (column: string) => {
      const boxes = segs(column).map((seg) => [num(seg, "y"), num(seg, "y") + num(seg, "height")]);
      return Math.max(...boxes.map((b) => b[1] ?? 0)) - Math.min(...boxes.map((b) => b[0] ?? 0));
    };
    expect(Math.abs(span("A") - span("C"))).toBeLessThan(1);
    const [x, y] = segs("A").map((seg) => num(seg, "height"));
    expect((x ?? 0) / ((x ?? 0) + (y ?? 0))).toBeCloseTo(0.75, 1);
  });

  test("columns are labelled below with their name and total", async () => {
    await draw(spec);
    expect(all(".fft-mekko-column").map((label) => [...label.children].map((c) => c.textContent))).toEqual([
      ["A", "40"],
      ["B", "40"],
      ["C", "5"],
    ]);
  });

  test("the tooltip gives the value, its share of the column and of the total, and Enter selects the row", async () => {
    const seen = selections();
    await draw(spec);
    const hit = all(".fft-mekko-hit")[0] as Element;
    hit.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["A, X", "30V", "75%Share of A", "35%Share of total"]);
    press(hit, "Enter");
    expect(seen).toEqual([mix[0]]);
  });
});

describe("histogram view", () => {
  // 1..10 bins on round edges 0, 2, 4, 6, 8, 10: counts 1, 2, 2, 2, 3 (the top edge belongs to the last bin).
  const values = Array.from({ length: 10 }, (_, i) => ({ v: i + 1 }));
  const spec = { rows: values, view: { type: "histogram", value: "v", bins: 5 } };
  const bars = () => all("path.fft-hist-bar");

  test("values fall into bins on round edges, one bar per bin, sized by count", async () => {
    await draw(spec);
    expect(bars().map((bar) => bar.getAttribute("data-count"))).toEqual(["1", "2", "2", "2", "3"]);
  });

  test("labels sit on the bin edges, not under the bars", async () => {
    await draw(spec);
    expect(texts(".fft-tick-x")).toEqual(["0", "2", "4", "6", "8", "10"]);
  });

  test("neighbouring bars touch but for a 2px gap, so the distribution reads as one shape", async () => {
    await draw(spec);
    const edges = all(".fft-hist-hit").map((hit) => [Number(hit.getAttribute("x")), Number(hit.getAttribute("x")) + Number(hit.getAttribute("width"))]);
    const lefts = bars().map((bar) => Number(/^M([\d.]+)/.exec(bar.getAttribute("d") ?? "")?.[1]));
    expect(lefts[1]! - edges[1]![0]!).toBeCloseTo(1, 0);
    expect(edges[0]![1]).toBeCloseTo(edges[1]![0]!, 5);
  });

  test("the count axis shows whole numbers only", async () => {
    await draw(spec);
    expect(texts(".fft-tick-y").every((t) => /^\d+$/.test(t ?? ""))).toBe(true);
  });

  test("a dashed line marks the median, unless turned off", async () => {
    await draw(spec);
    expect(texts(".fft-ref-label")).toEqual(["Median 5.5"]);
    target.replaceChildren();
    await draw({ ...spec, view: { ...spec.view, median: false } });
    expect(all(".fft-ref-label").length).toBe(0);
  });

  test("the tooltip names the bin's range, its count and its share", async () => {
    await draw(spec);
    all(".fft-hist-hit")[4]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["8 to 10", "3Count", "30%Share"]);
  });
});

describe("rings view", () => {
  const goals = [
    { goal: "Revenue", actual: 107, target: 100 },
    { goal: "Signups", actual: 30, target: 60 },
    { goal: "Retention", actual: 0, target: 90 },
  ];
  const spec = { rows: goals, view: { type: "rings", label: "goal", value: "actual", target: "target" } };

  test("one ring per row, outermost first, each a track and an arc", async () => {
    await draw(spec);
    const radii = all("circle.fft-ring-track").map((t) => Number(t.getAttribute("r")));
    expect(radii.length).toBe(3);
    expect(radii[0]! > radii[1]! && radii[1]! > radii[2]!).toBe(true);
  });

  test("an arc runs its share of the way round: half the target is half a circle, nothing is no arc", async () => {
    await draw(spec);
    expect(all("path.fft-ring-arc").map((a) => a.getAttribute("data-ratio"))).toEqual(["1", "0.5"]);
  });

  test("a closed ring is drawn as two half-turn arcs, since one arc ending where it starts would not render", async () => {
    await draw(spec);
    const d = all("path.fft-ring-arc")[0]?.getAttribute("d") ?? "";
    expect(d.match(/A/g)?.length).toBe(2);
  });

  test("past the target the ring closes and a second lap shows how far over", async () => {
    await draw(spec);
    expect(all("path.fft-ring-lap").map((a) => a.getAttribute("data-ratio"))).toEqual(["0.07"]);
  });

  // A met goal used to say "Target met" beside its check; on screen the check says it, and the words stay for screen readers.
  test("the legend gives each goal's name, attainment, value of target and where it stands, a met target with a check", async () => {
    await draw(spec);
    expect(all(".fft-rings-legend li").map((li) => [...li.querySelectorAll("span:not(.fft-swatch):not(.fft-sr-only)")].map((s) => s.textContent))).toEqual([
      ["Revenue", "107%", "107 of 100"],
      ["Signups", "50%", "30 of 60", "30 to go"],
      ["Retention", "0%", "0 of 90", "90 to go"],
    ]);
    expect(all(".fft-rings-legend li").map((li) => [(li as HTMLElement).dataset.met ?? "", Boolean(li.querySelector(".fft-rings-percent .fft-check"))])).toEqual([
      ["true", true],
      ["", false],
      ["", false],
    ]);
    expect(all(".fft-rings-legend li")[0]?.querySelector(".fft-sr-only")?.textContent).toBe("Target met");
  });

  test("the tooltip gives value, target and attainment, and Enter selects the row", async () => {
    const seen = selections();
    await draw(spec);
    const hit = all(".fft-ring-hit")[1] as Element;
    hit.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Signups", "30Actual", "60Target", "50%Of target"]);
    press(hit, "Enter");
    expect(seen).toEqual([goals[1]]);
  });
});

describe("timeline view", () => {
  const plan = [
    { task: "Design", from: "2026-01-01", to: "2026-01-31", team: "A" },
    { task: "Build", from: "2026-02-01", to: "2026-03-31", team: "B" },
    { task: "Launch", from: "2026-04-01", team: "B" },
  ];
  const spec = { rows: plan, view: { type: "timeline", label: "task", start: "from", end: "to", group: "team" } };
  const bars = () => all("rect.fft-gantt-bar");
  const num = (node: Element | undefined, attr: string) => Number(node?.getAttribute(attr));

  test("a bar per task with an end, a diamond per milestone, and every name on the left", async () => {
    await draw(spec);
    expect([bars().length, all(".fft-gantt-milestone").length]).toEqual([2, 1]);
    expect(texts(".fft-gantt-label")).toEqual(["Design", "Build", "Launch"]);
  });

  test("bars share one date axis: length follows duration and later tasks start further right", async () => {
    await draw(spec);
    const [design, build] = bars();
    const ratio = num(build, "width") / num(design, "width");
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.1);
    expect(num(build, "x")).toBeGreaterThan(num(design, "x") + num(design, "width") - 1);
  });

  test("months are ticked along the top, the first with its year", async () => {
    await draw(spec);
    expect(texts(".fft-gantt-tick")).toEqual(["Jan 2026", "Feb", "Mar", "Apr"]);
  });

  test("in a narrow card months stay ticked, skipping only labels that would collide", async () => {
    const long = [
      { task: "Research", from: "2026-08-03", to: "2026-08-28" },
      { task: "Build", from: "2026-09-21", to: "2026-11-13" },
      { task: "Launch", from: "2026-11-30" },
      { task: "Push", from: "2026-11-16", to: "2026-12-18" },
    ];
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 320 });
    try {
      await draw({ rows: long, view: { type: "timeline", label: "task", start: "from", end: "to" } });
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    }
    const ticks = all(".fft-gantt-tick");
    expect(ticks.length).toBeGreaterThan(1);
    const extents = ticks.map((t) => [Number(t.getAttribute("x")), Number(t.getAttribute("x")) + (t.textContent ?? "").length * 6]);
    expect(extents.every((e, i) => i === 0 || e[0]! >= extents[i - 1]![1]! + 8)).toBe(true);
  });

  test("a today marker shows when the date is in range, and not otherwise", async () => {
    await draw({ ...spec, view: { ...spec.view, today: "2026-02-15" } });
    expect(texts(".fft-gantt-today-label")).toEqual(["Today"]);
    target.replaceChildren();
    await draw({ ...spec, view: { ...spec.view, today: "2027-02-15" } });
    expect(all(".fft-gantt-today").length).toBe(0);
  });

  test("groups color the bars and get a legend", async () => {
    await draw(spec);
    expect(texts(".fft-legend li")).toEqual(["A", "B"]);
    const [design, build] = bars() as SVGElement[];
    expect(design?.style.fill).not.toBe(build?.style.fill);
  });

  test("with progress, each bar fills to its share done and says so after the bar", async () => {
    const tracked = plan.map((row, i) => ({ ...row, done: [1, 0.45, 0][i] }));
    await draw({ rows: tracked, view: { ...spec.view, progress: "done" } });
    const [design, build] = bars();
    const fills = all("rect.fft-gantt-done");
    expect(fills.map((f) => f.getAttribute("data-progress"))).toEqual(["1", "0.45"]);
    expect(num(fills[1], "width") / num(build, "width")).toBeCloseTo(0.45, 2);
    expect(num(fills[0], "width")).toBeCloseTo(num(design, "width"), 5);
    expect(texts(".fft-gantt-progress")).toEqual(["100%", "45%"]);
  });

  test("progress above 1 is read as a percentage, and the tooltip adds it", async () => {
    await draw({ rows: [{ task: "Build", from: "2026-02-01", to: "2026-03-31", pct: 60 }], view: { type: "timeline", label: "task", start: "from", end: "to", progress: "pct" } });
    expect(all("rect.fft-gantt-done").map((f) => f.getAttribute("data-progress"))).toEqual(["0.6"]);
    all(".fft-gantt-hit")[0]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row").at(-1)).toBe("60%Progress");
  });

  test("without progress, bars are plain", async () => {
    await draw(spec);
    expect(all("rect.fft-gantt-done").length).toBe(0);
  });

  test("the tooltip gives start, end, duration and group", async () => {
    await draw(spec);
    all(".fft-gantt-hit")[0]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Design", "Jan 1, 2026From", "Jan 31, 2026To", "30 daysDuration", "ATeam"]);
  });
});

describe("waffle view", () => {
  const mix = [
    { source: "A", v: 50 },
    { source: "B", v: 30 },
    { source: "C", v: 20 },
  ];
  const spec = { rows: mix, view: { type: "waffle", label: "source", value: "v" } };
  const cells = () => all("rect.fft-waffle-cell");

  test("a 10 by 10 grid, each square one percent, filled category by category in reading order", async () => {
    await draw(spec);
    const owners = cells().map((cell) => cell.getAttribute("data-label"));
    expect(owners.length).toBe(100);
    expect([owners.filter((o) => o === "A").length, owners.filter((o) => o === "B").length, owners.filter((o) => o === "C").length]).toEqual([50, 30, 20]);
    expect([owners[0], owners[49], owners[50], owners[99]]).toEqual(["A", "A", "B", "C"]);
  });

  test("with a total, the rest of the grid stays empty", async () => {
    await draw({ rows: [{ source: "Recurring", v: 62 }], view: { type: "waffle", label: "source", value: "v", total: 100 } });
    expect([cells().filter((c) => c.getAttribute("data-label") === "Recurring").length, all("rect.fft-waffle-empty").length]).toEqual([62, 38]);
  });

  test("the legend gives each category's name, value and share", async () => {
    await draw(spec);
    expect(all(".fft-waffle-legend li").map((li) => [...li.querySelectorAll("span:not(.fft-swatch)")].map((s) => s.textContent))).toEqual([
      ["A", "50", "50%"],
      ["B", "30", "30%"],
      ["C", "20", "20%"],
    ]);
  });

  test("focusing a legend entry lights up its squares and shows its tooltip", async () => {
    await draw(spec);
    const entry = all(".fft-waffle-legend li")[1] as HTMLElement;
    entry.dispatchEvent(new Event("focus"));
    expect(all(".fft-waffle-group[data-active]").map((g) => g.getAttribute("data-label"))).toEqual(["B"]);
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["B", "30V", "30%Share"]);
  });
});

describe("variance view", () => {
  const budget = [
    { dept: "Sales", actual: 120, plan: 100 },
    { dept: "Marketing", actual: 90, plan: 100 },
    { dept: "IT", actual: 100, plan: 100 },
  ];
  const spec = { rows: budget, view: { type: "variance", label: "dept", value: "actual", target: "plan" } };
  const bars = () => all("path.fft-var-bar");
  const zero = () => Number(target.querySelector("line.fft-var-zero")?.getAttribute("x1"));
  const extent = (bar: Element | undefined) => {
    const xs = [...(bar?.getAttribute("d") ?? "").matchAll(/[MHL]([\d.]+)/g)].map((m) => Number(m[1]));
    return [Math.min(...xs), Math.max(...xs)];
  };

  test("over plan grows right of the zero line, under plan left, and on plan draws no bar", async () => {
    await draw(spec);
    const [over, under] = bars().map(extent);
    expect(bars().length).toBe(2);
    expect([over![0], under![1]]).toEqual([zero(), zero()]);
    expect(over![1]! > zero() && under![0]! < zero()).toBe(true);
  });

  test("bar lengths follow the size of the variance", async () => {
    await draw(spec);
    const [over, under] = bars().map(extent);
    expect((over![1]! - over![0]!) / (under![1]! - under![0]!)).toBeCloseTo(2, 1);
  });

  test("tone says good or bad: above plan is good by default, and goodWhen down flips it", async () => {
    await draw(spec);
    expect(all(".fft-var").map((row) => row.getAttribute("data-tone"))).toEqual(["good", "bad", "even"]);
    target.replaceChildren();
    await draw({ ...spec, view: { ...spec.view, goodWhen: "down" } });
    expect(all(".fft-var").map((row) => row.getAttribute("data-tone"))).toEqual(["bad", "good", "even"]);
  });

  test("every variance is written with its sign, as an amount or, with percent, against plan", async () => {
    await draw(spec);
    expect(texts(".fft-var-value")).toEqual(["+20", "−10", "0"]);
    target.replaceChildren();
    await draw({ ...spec, view: { ...spec.view, percent: true } });
    expect(texts(".fft-var-value")).toEqual(["+20%", "−10%", "0%"]);
  });

  test("the tooltip gives actual, plan, and the variance both ways", async () => {
    await draw(spec);
    all(".fft-var-hit")[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Marketing", "90Actual", "100Plan", "−10Variance", "−10%vs plan"]);
  });
});

describe("gauge view", () => {
  const spec = { rows: [{ nps: 42, goal: 50 }], view: { type: "gauge", value: "nps", target: "goal", min: 0, max: 100 } };

  test("a half-circle track with an arc filled to the value's place on the scale", async () => {
    await draw(spec);
    expect([all("path.fft-gauge-track").length, target.querySelector("path.fft-gauge-arc")?.getAttribute("data-ratio")]).toEqual([1, "0.42"]);
  });

  test("the value sits big inside the arc, with min and max at its ends", async () => {
    await draw(spec);
    expect([texts(".fft-gauge-value"), texts(".fft-gauge-scale")]).toEqual([["42"], ["0", "100"]]);
  });

  test("the target tick says what it is, on the chart: Goal 50, inside the arc and clear of the number", async () => {
    await draw(spec);
    const label = target.querySelector(".fft-gauge-goal");
    expect([label?.textContent, label?.getAttribute("text-anchor")]).toEqual(["Goal 50", "middle"]);
    // Inside the arc: closer to the center than the track's inner edge, and above the number.
    const [x, y] = [Number(label?.getAttribute("x")), Number(label?.getAttribute("y"))];
    const number = target.querySelector(".fft-gauge-value");
    expect(y < Number(number?.getAttribute("y")) - 30 && Number.isFinite(x)).toBe(true);
  });

  test("a tick marks the target, and the tooltip gives value, target and attainment", async () => {
    await draw(spec);
    expect(target.querySelector(".fft-gauge-target")?.getAttribute("data-ratio")).toBe("0.5");
    all(".fft-gauge-hit")[0]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row")).toEqual(["42NPS", "50Goal", "84%Of target"]);
  });

  test("under the gauge it says where the number stands against its goal: how far to go, or a check and Target met", async () => {
    await draw(spec);
    const short = [texts(".fft-gauge-standing"), Boolean(target.querySelector(".fft-gauge-standing .fft-check"))];
    await draw({ ...spec, rows: [{ nps: 55, goal: 50 }] });
    const met = all(".fft-gauge-standing").at(-1);
    expect([short, [[met?.textContent], Boolean(met?.querySelector(".fft-check"))]]).toEqual([
      [["8 to go"], false],
      [["Target met"], true],
    ]);
  });

  test("past the maximum the arc stops at the end, but the number stays true", async () => {
    await draw({ ...spec, rows: [{ nps: 130, goal: 50 }] });
    expect([target.querySelector("path.fft-gauge-arc")?.getAttribute("data-ratio"), texts(".fft-gauge-value")[0]]).toEqual(["1", "130"]);
  });

  test("without a maximum, the scale ends on a round number above the value and target", async () => {
    await draw({ rows: [{ nps: 42, goal: 50 }], view: { type: "gauge", value: "nps", target: "goal" } });
    expect(texts(".fft-gauge-scale")).toEqual(["0", "60"]);
  });
});

describe("pareto view", () => {
  // 50 + 30 + 10 + 10 = 100: cumulative 50%, 80%, 90%, 100%.
  const causes = [
    { cause: "C", n: 10 },
    { cause: "A", n: 50 },
    { cause: "D", n: 10 },
    { cause: "B", n: 30 },
  ];
  const spec = { rows: causes, view: { type: "pareto", label: "cause", value: "n" } };

  test("every cause is named: long names wrap onto short lines under their bar instead of being skipped", async () => {
    const names = ["Login problems", "Billing questions", "Slow pages", "Single sign-on", "Exports", "Mobile app", "Permissions", "Data import"];
    await draw({ rows: names.map((cause, i) => ({ cause, n: 80 - i * 10 })), view: { type: "pareto", label: "cause", value: "n" } });
    const labels = all(".fft-tick-x");
    expect(labels.map((label) => label.getAttribute("aria-label") ?? label.textContent)).toEqual(names);
    expect([...(labels[1]?.querySelectorAll("tspan") ?? [])].map((t) => t.textContent)).toEqual(["Billing", "questions"]);
  });

  test("bars sort largest first, each as its share of the total, on one percent axis", async () => {
    await draw(spec);
    expect(texts(".fft-tick-x")).toEqual(["A", "B", "C", "D"]);
    expect(all("path.fft-pareto-bar").map((bar) => bar.getAttribute("data-share"))).toEqual(["0.5", "0.3", "0.1", "0.1"]);
    expect(texts(".fft-tick-y").at(-1)).toBe("100%");
  });

  test("a line climbs through the running total to 100%", async () => {
    await draw(spec);
    expect(all(".fft-pareto-dot").map((d) => d.getAttribute("data-cumulative"))).toEqual(["0.5", "0.8", "0.9", "1"]);
  });

  test("a dashed line marks 80%, and the vital few up to that crossing stay in color", async () => {
    await draw(spec);
    expect(texts(".fft-ref-label")).toEqual(["80%"]);
    expect(all("path.fft-pareto-bar").map((bar) => bar.hasAttribute("data-vital"))).toEqual([true, true, false, false]);
  });

  test("the threshold can move", async () => {
    await draw({ ...spec, view: { ...spec.view, threshold: 0.5 } });
    expect(all("path.fft-pareto-bar").map((bar) => bar.hasAttribute("data-vital"))).toEqual([true, false, false, false]);
  });

  test("the tooltip gives the value, its share and the running total", async () => {
    await draw(spec);
    all(".fft-hit")[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["B", "30N", "30%Share", "80%Running total"]);
  });
});

describe("box plot view", () => {
  // A: 1..9 plus 100. Q1 3.25, median 5.5, Q3 7.75; the upper fence is 14.5, so 100 is an outlier and the whisker stops at 9.
  const rows = [...[1, 2, 3, 4, 5, 6, 7, 8, 9, 100].map((v) => ({ g: "A", v })), ...[20, 22, 24, 26, 28].map((v) => ({ g: "B", v }))];
  const spec = { rows, view: { type: "boxplot", value: "v", group: "g" } };
  const num = (node: Element | null | undefined, attr: string) => Number(node?.getAttribute(attr));

  test("one box per group in data order, the median inside the box", async () => {
    await draw(spec);
    expect(texts(".fft-box-label")).toEqual(["A", "B"]);
    const [first] = all(".fft-box");
    const box = first?.querySelector("rect.fft-box-body");
    const median = num(first?.querySelector("line.fft-box-median"), "x1");
    expect(median > num(box, "x") && median < num(box, "x") + num(box, "width")).toBe(true);
  });

  test("whiskers stop at the furthest values within 1.5 box-widths; anything beyond is an outlier dot", async () => {
    await draw(spec);
    const [first, second] = all(".fft-box");
    expect([first?.querySelectorAll(".fft-box-outlier").length, second?.querySelectorAll(".fft-box-outlier").length]).toEqual([1, 0]);
    const whisker = num(first?.querySelector("line.fft-box-whisker-high"), "x2");
    expect(whisker).toBeLessThan(num(first?.querySelector(".fft-box-outlier"), "cx"));
  });

  test("the tooltip gives the median, the middle half, the range, the count and the outliers", async () => {
    await draw(spec);
    all(".fft-box-hit")[0]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["A", "5.5Median", "3.25 to 7.75Middle half", "1 to 9Range", "10Values", "1Outliers"]);
  });

  test("without a group, all the rows make one box", async () => {
    await draw({ rows, view: { type: "boxplot", value: "v" } });
    expect(all(".fft-box").length).toBe(1);
  });
});

describe("likert view", () => {
  // 10 + 10 disagree, 20 neutral, 40 + 20 agree = 100.
  const survey = [{ q: "I like it", sd: 10, d: 10, n: 20, a: 40, sa: 20 }];
  const spec = { rows: survey, view: { type: "likert", label: "q", responses: ["sd", "d", "n", "a", "sa"] } };
  const segs = () => all("rect.fft-likert-seg");
  const center = () => Number(target.querySelector("line.fft-likert-center")?.getAttribute("x1"));
  const num = (node: Element | undefined, attr: string) => Number(node?.getAttribute(attr));

  test("each question is a row of response segments, in order, sized by share", async () => {
    await draw(spec);
    expect(segs().map((seg) => seg.getAttribute("data-share"))).toEqual(["0.1", "0.1", "0.2", "0.4", "0.2"]);
    expect(texts(".fft-likert-question")).toEqual(["I like it"]);
  });

  test("bars center on neutral: disagreement grows left of the line, agreement right, neutral straddles it", async () => {
    await draw(spec);
    const [sd, d, n, a] = segs();
    expect(num(d, "x") + num(d, "width")).toBeLessThan(center());
    expect(num(n, "x") < center() && num(n, "x") + num(n, "width") > center()).toBe(true);
    expect(num(a, "x")).toBeGreaterThan(center());
    expect(num(sd, "x")).toBeLessThan(num(d, "x"));
  });

  test("the center line runs through each bar only, never across the question text", async () => {
    await draw({ ...spec, rows: [...survey, { q: "Second", sd: 1, d: 1, n: 1, a: 1, sa: 1 }] });
    const lines = all("line.fft-likert-center");
    const questions = all(".fft-likert-question").map((t) => Number(t.getAttribute("y")));
    expect(lines.length).toBe(2);
    expect(lines.every((line, i) => Number(line.getAttribute("y1")) > (questions[i] ?? 0))).toBe(true);
  });

  test("the share disagreeing and agreeing is written at each end", async () => {
    await draw(spec);
    expect([texts(".fft-likert-neg"), texts(".fft-likert-pos")]).toEqual([["20%"], ["60%"]]);
  });

  test("the legend lists the responses in order, from one pole through neutral to the other", async () => {
    await draw({ ...spec, fields: { sd: { label: "Strongly disagree" }, sa: { label: "Strongly agree" } } });
    expect(texts(".fft-legend li")).toEqual(["Strongly disagree", "D", "N", "A", "Strongly agree"]);
  });

  test("tones run from one pole to the other through a neutral middle", async () => {
    await draw(spec);
    expect(segs().map((seg) => seg.getAttribute("data-tone"))).toEqual(["neg", "neg", "neutral", "pos", "pos"]);
  });

  test("the tooltip names the question and response, with its count and share", async () => {
    await draw(spec);
    all(".fft-likert-hit")[3]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["I like it", "40A", "40%Share"]);
  });
});

describe("candlestick view", () => {
  const days = [
    { d: "Mon", o: 10, h: 14, l: 9, c: 13 },
    { d: "Tue", o: 13, h: 13.5, l: 10, c: 11 },
    { d: "Wed", o: 11, h: 12, l: 10.5, c: 11.5 },
    { d: "Thu", o: 11.5, h: 15, l: 11, c: 14 },
  ];
  const spec = { rows: days, view: { type: "candlestick", x: "d", open: "o", high: "h", low: "l", close: "c" } };
  const candle = (i: number) => all(".fft-candle")[i];
  const num = (node: Element | null | undefined, attr: string) => Number(node?.getAttribute(attr));

  test("trading days are labelled week by week, on each week's first trading day, naming the year once", async () => {
    // 30 trading days from Monday Aug 17, 2026, weekends skipped.
    const trading: string[] = [];
    for (let t = Date.UTC(2026, 7, 17); trading.length < 30; t += 86400000) if (![0, 6].includes(new Date(t).getUTCDay())) trading.push(new Date(t).toISOString().slice(0, 10));
    await draw({ rows: trading.map((d, i) => ({ d, o: 10 + i, h: 12 + i, l: 9 + i, c: 11 + i })), fields: { d: { format: { type: "date" } } }, view: { type: "candlestick", x: "d", open: "o", high: "h", low: "l", close: "c" } });
    expect(texts(".fft-tick-x")).toEqual(["Aug 17, 2026", "Aug 24", "Aug 31", "Sep 7", "Sep 14", "Sep 21"]);
  });

  test("one candle per row: a wick from low to high around a body from open to close", async () => {
    await draw(spec);
    expect(all(".fft-candle").length).toBe(4);
    const first = candle(0);
    const body = first?.querySelector("rect.fft-candle-body");
    const wick = first?.querySelector("line.fft-candle-wick");
    expect(num(wick, "y1")).toBeLessThan(num(body, "y"));
    expect(num(wick, "y2")).toBeGreaterThan(num(body, "y") + num(body, "height"));
  });

  test("a period that closes above its open is up, below is down", async () => {
    await draw(spec);
    expect(all(".fft-candle").map((c) => c.getAttribute("data-tone"))).toEqual(["up", "down", "up", "up"]);
  });

  test("the tooltip gives open, high, low, close and the change", async () => {
    await draw(spec);
    all(".fft-candle-hit")[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Tue", "13Open", "13.5High", "10Low", "11Close", "−15.4%Change"]);
  });

  test("the average is named in the chart's own time step: a 3-day average for days, otherwise an average of the last points", async () => {
    await draw({ rows: days.map((row) => ({ ...row, day: row.d })), view: { ...spec.view, x: "day", average: 3 } });
    const daily = texts(".fft-legend li");
    await draw({ ...spec, view: { ...spec.view, average: 3 } });
    expect([daily.includes("3-day average"), texts(".fft-legend li").includes("3-point average")]).toEqual([true, true]);
  });

  test("average draws a moving average of the close once enough periods have passed", async () => {
    await draw({ ...spec, view: { ...spec.view, average: 3 } });
    const d = target.querySelector("path.fft-candle-average")?.getAttribute("d") ?? "";
    expect(d.match(/[ML]/g)?.length).toBe(2);
  });
});

describe("sunburst view", () => {
  // A is 60 (East 40, West 20); B is 40 (East 10, West 30).
  const rows = [
    { p: "A", r: "East", v: 40 },
    { p: "A", r: "West", v: 20 },
    { p: "B", r: "East", v: 10 },
    { p: "B", r: "West", v: 30 },
  ];
  const spec = { rows, view: { type: "sunburst", levels: ["p", "r"], value: "v" } };
  const ring = (depth: number) => all(`path.fft-sun-seg[data-depth="${depth}"]`);
  const span = (seg: Element | undefined) => [Number(seg?.getAttribute("data-start")), Number(seg?.getAttribute("data-end"))];

  test("the inner ring has a slice per top-level value, the outer ring one per child, sized by value", async () => {
    await draw(spec);
    expect([ring(0).length, ring(1).length]).toEqual([2, 4]);
    expect(ring(0).map((seg) => seg.getAttribute("data-share"))).toEqual(["0.6", "0.4"]);
  });

  test("children sit inside their parent's slice", async () => {
    await draw(spec);
    const [a] = ring(0);
    const [aEast, aWest] = ring(1);
    expect(span(aEast)[0]).toBeCloseTo(span(a)[0] ?? Number.NaN, 5);
    expect(span(aWest)[1]).toBeCloseTo(span(a)[1] ?? Number.NaN, 5);
  });

  test("the total sits in the middle, and the legend lists the top level with shares", async () => {
    await draw(spec);
    expect(texts(".fft-sun-total")).toEqual(["100"]);
    expect(all(".fft-donut-legend li").map((li) => [...li.querySelectorAll("span:not(.fft-swatch)")].map((s) => s.textContent))).toEqual([
      ["A", "60", "60%"],
      ["B", "40", "40%"],
    ]);
  });

  test("the tooltip names the path and gives the value, its share of the total and of its parent", async () => {
    await draw(spec);
    const hit = target.querySelector('path.fft-sun-hit[data-path="B, West"]') as Element;
    hit.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["B, West", "30V", "30%Share of total", "75%Share of B"]);
  });
});

describe("chord view", () => {
  // A sends 30 to B and 10 to C; B sends 20 to A. Totals (out + in): A 60, B 50, C 10.
  const flows = [
    { from: "A", to: "B", n: 30 },
    { from: "A", to: "C", n: 10 },
    { from: "B", to: "A", n: 20 },
  ];
  const spec = { rows: flows, view: { type: "chord", source: "from", target: "to", value: "n" } };
  const arcs = () => all("path.fft-chord-arc");
  const span = (el: Element | undefined) => Number(el?.getAttribute("data-end")) - Number(el?.getAttribute("data-start"));

  test("one arc per group around the circle and one ribbon per flow", async () => {
    await draw(spec);
    expect([arcs().map((a) => a.getAttribute("data-group")), all("path.fft-chord-ribbon").length]).toEqual([["A", "B", "C"], 3]);
  });

  test("each arc's length follows everything it sends and receives", async () => {
    await draw(spec);
    const [a, b, c] = arcs();
    expect(span(a) / span(c)).toBeCloseTo(6, 1);
    expect(span(b) / span(c)).toBeCloseTo(5, 1);
  });

  test("ribbons take the sending group's color, and the tooltip names the move", async () => {
    await draw(spec);
    const [ab] = all("path.fft-chord-ribbon") as SVGElement[];
    expect(ab?.style.fill).toBe((arcs()[0] as SVGElement).style.fill);
    target.querySelector('path.fft-chord-hit[data-flow="B to A"]')?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["B to A", "20N", "33%Share of all moves"]);
  });

  test("pointing at a group lights up its ribbons and fades the rest", async () => {
    await draw(spec);
    target.querySelector('path.fft-chord-arc-hit[data-group="C"]')?.dispatchEvent(new Event("focus"));
    expect(all("path.fft-chord-ribbon[data-active]").map((r) => r.getAttribute("data-flow"))).toEqual(["A to C"]);
  });
});

describe("icicle view", () => {
  const sales = [
    { p: "A", r: "x", v: 30 },
    { p: "A", r: "y", v: 9 },
    { p: "B", r: "x", v: 60 },
    { p: "B", r: "z", v: 1 },
  ];
  const spec = { rows: sales, view: { type: "icicle", levels: ["p", "r"], value: "v" } };
  const cell = (path: string) => target.querySelector(`rect.fft-ice[data-path="${path}"]`);
  const tall = (path: string) => Number(cell(path)?.getAttribute("height")) + 2;

  test("a column for the total, then one per level, left to right", async () => {
    await draw(spec);
    const xs = (depth: number) => new Set(all(`rect.fft-ice[data-depth="${depth}"]`).map((r) => r.getAttribute("x")));
    expect([all('rect.fft-ice[data-depth="0"]').length, xs(1).size, xs(2).size]).toEqual([1, 1, 1]);
    expect(Number([...xs(1)][0]) < Number([...xs(2)][0])).toBe(true);
  });

  test("each child takes its share of its parent's height", async () => {
    await draw(spec);
    expect(tall("A") / tall("B")).toBeCloseTo(39 / 61, 1);
    expect(tall("A/x") / tall("A")).toBeCloseTo(30 / 39, 1);
  });

  test("names and values show only in cells with room for them", async () => {
    await draw(spec);
    const names = texts(".fft-ice-name");
    expect(names).toContain("B");
    expect(names).toContain("x");
    expect(names).not.toContain("z");
  });

  test("pointing at a cell lights it and its parents, and the tooltip gives its share of each", async () => {
    await draw(spec);
    target.querySelector<SVGElement>('.fft-ice-hit[data-path="A/x"]')?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["A / x", "30V", "77%Share of A", "30%Share of total"]);
    expect(all("rect.fft-ice[data-active]").map((r) => r.getAttribute("data-path"))).toEqual(["", "A", "A/x"]);
  });

  test("a deep hierarchy grows taller, so its typical leaf has room for a name", async () => {
    const leaves = Array.from({ length: 20 }, (_, i) => ({ p: `P${i % 4}`, r: `R${i}`, v: 10 }));
    await draw({ rows: leaves, view: { type: "icicle", levels: ["p", "r"], value: "v" } });
    const height = Number(target.querySelector(".fft-icicle svg")?.getAttribute("height"));
    expect(height).toBeGreaterThanOrEqual(20 * 24);
    expect(texts(".fft-ice-name")).toContain("R7");
  });

  test("validation: up to 4 levels", () => {
    const issues = validateSpec({ data: { type: "inline", rows: [] }, view: { type: "icicle", levels: ["a", "b", "c", "d", "e"], value: "v" } }).map((i) => i.message);
    expect(issues).toContain("levels takes at most 4 fields; deeper columns get too narrow to read.");
  });
});

describe("lollipop mark", () => {
  const ranked = [
    { region: "East", revenue: 2000 },
    { region: "North", revenue: 1000 },
    { region: "South", revenue: 500 },
  ];

  test("hbar: a thin stem to a dot at the value, the dot placed by the same scale as a bar", async () => {
    await draw({ rows: ranked, view: { type: "hbar", label: "region", value: "revenue", mark: "lollipop" } });
    expect(target.querySelector(".fft-hbars")?.getAttribute("data-mark")).toBe("lollipop");
    expect(all(".fft-hbar-dot").map((dot) => (dot as HTMLElement).style.left)).toEqual(["100%", "50%", "25%"]);
    expect(all(".fft-hbar-fill").map((stem) => (stem as HTMLElement).style.width)).toEqual(["100%", "50%", "25%"]);
  });

  test("bar: stems rise from one baseline to a dot per value, in place of bars", async () => {
    await draw({ rows: ranked, view: { type: "bar", x: "region", y: "revenue", mark: "lollipop" } });
    const stems = all("line.fft-lolli-stem");
    const dots = all("circle.fft-lolli-dot").map((dot) => Number(dot.getAttribute("cy")));
    expect([all("path.fft-bar").length, stems.length, dots.length]).toEqual([0, 3, 3]);
    expect(new Set(stems.map((stem) => stem.getAttribute("y1"))).size).toBe(1);
    expect(dots.map((cy, i) => cy === Number(stems[i]?.getAttribute("y2")))).toEqual([true, true, true]);
    expect((dots[0] ?? 0) < (dots[1] ?? 0) && (dots[1] ?? 0) < (dots[2] ?? 0)).toBe(true);
  });

  test("validation: mark is bar or lollipop, and a lollipop cannot stack", () => {
    const issues = (view: Record<string, unknown>) => validateSpec({ data: { type: "inline", rows: [] }, view }).map((i) => i.message);
    expect(issues({ type: "bar", x: "region", y: ["a", "b"], mark: "lollipop", stacked: true })).toContain("A lollipop shows one dot per value, so it cannot stack: drop stacked, or use bars.");
    expect(issues({ type: "hbar", label: "region", value: "revenue", mark: "pin" }).join(" ")).toContain("lollipop");
  });
});

describe("horizon view", () => {
  const days = [
    { d: "1", a: 10, b: -30 },
    { d: "2", a: 50, b: -5 },
    { d: "3", a: 90, b: 20 },
    { d: "4", a: 30, b: 0 },
  ];
  const spec = { rows: days, view: { type: "horizon", x: "d", y: ["a", "b"], bands: 3 } };
  const bands = (series: string, sign: string) => all(`path.fft-horizon-band[data-series="${series}"][data-sign="${sign}"]`).map((p) => p.getAttribute("data-band"));

  test("one thin row per series, named at the left", async () => {
    await draw(spec);
    expect([all(".fft-horizon-row").length, texts(".fft-horizon-label")]).toEqual([2, ["A", "B"]]);
  });

  test("values fold into bands one round step tall, so further from the baseline reads deeper; empty bands draw nothing", async () => {
    await draw(spec);
    // The largest distance is 90: three bands of 30.
    expect([bands("a", "up"), bands("a", "down"), bands("b", "up"), bands("b", "down")]).toEqual([["0", "1", "2"], [], ["0"], ["0"]]);
  });

  test("a series that crosses the baseline splits exactly there, so the two colors never overlap", async () => {
    await draw(spec);
    const xs = (d: string) => [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => Number(m[1]));
    const up = xs(all('path.fft-horizon-band[data-series="b"][data-sign="up"]')[0]?.getAttribute("d") ?? "");
    const down = xs(all('path.fft-horizon-band[data-series="b"][data-sign="down"]')[0]?.getAttribute("d") ?? "");
    // b goes from -5 on day 2 to 20 on day 3: it crosses a fifth of the way along, where up begins and down ends.
    expect(Math.min(...up)).toBeCloseTo(Math.max(...down), 1);
  });

  test("the key says what a shade is worth and which side is which", async () => {
    await draw(spec);
    expect(texts(".fft-horizon-key-text")).toEqual(["Above 0, rising", "Below 0, hanging", "Each shade 30"]);
  });

  test("pointing at a day lists every series there", async () => {
    await draw(spec);
    all(".fft-horizon-hit")[2]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["3", "90A", "20B"]);
  });

  test("a named baseline speaks in its words: the key says above and below plan, and pointing says how far from it", async () => {
    await draw({ ...spec, view: { ...spec.view, baselineLabel: "plan" } });
    expect(texts(".fft-horizon-key-text")).toEqual(["Above plan, rising", "Below plan, hanging", "Each shade 30"]);
    all(".fft-horizon-hit")[1]?.dispatchEvent(new Event("focus"));
    const day2 = texts(".fft-tooltip-row");
    all(".fft-horizon-hit")[3]?.dispatchEvent(new Event("focus"));
    expect([day2, texts(".fft-tooltip-row")]).toEqual([["50 above planA", "5 below planB"], ["30 above planA", "On planB"]]);
  });

  test("a long run of days keeps an even rhythm on its axis, but for the closing date", async () => {
    const days = Array.from({ length: 92 }, (_, i) => ({ d: new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10), a: Math.sin(i / 5) * 10, b: Math.cos(i / 7) * 10 }));
    await draw({ rows: days, fields: { d: { format: { type: "date", style: "day" } } }, view: { type: "horizon", x: "d", y: ["a", "b"] } });
    const xs = all(".fft-tick-x").map((label) => Number(label.getAttribute("x")));
    const steps = xs.map((x, k) => (k ? Math.round(x - (xs[k - 1] ?? 0)) : null)).slice(1, -1);
    expect([xs.length > 2, new Set(steps).size]).toEqual([true, 1]);
  });

  test("validation: a horizon needs two or more periods", () => {
    const issues = validateSpec({ data: { type: "inline", rows: [] }, view: { type: "horizon", x: "d", y: "a" } }, [{ d: "1", a: 1 }]);
    expect(issues.map((i) => i.message)).toContain("A horizon needs at least 2 periods to draw a shape; with 1, show the number instead.");
  });
});

describe("rose view (polar area)", () => {
  const hours = [
    { hour: "00", web: 4, app: 0 },
    { hour: "06", web: 16, app: 9 },
    { hour: "12", web: 36, app: 0 },
    { hour: "18", web: 9, app: 16 },
  ];
  const spec = { rows: hours, view: { type: "rose", label: "hour", y: ["web", "app"] } };
  // A wedge's outer radius: the first arc in its path.
  const outer = (series: string, index: number) => Number(/A([\d.]+),/.exec(all(`path.fft-rose-seg[data-series="${series}"][data-index="${index}"]`)[0]?.getAttribute("d") ?? "")?.[1]);

  test("one equal wedge per row, clockwise from twelve o'clock, named round the outside", async () => {
    await draw(spec);
    expect(texts(".fft-rose-axis")).toEqual(["00", "06", "12", "18"]);
    const [first, second] = all(".fft-rose-axis").map((t) => Number(t.getAttribute("x")));
    const middle = Number(target.querySelector(".fft-rose svg")?.getAttribute("width")) / 2;
    expect([(first ?? 0) > middle, (second ?? 0) > middle]).toEqual([true, true]);
  });

  test("area tells the value: a wedge of 36 reaches three times as far as one of 4", async () => {
    await draw(spec);
    expect(outer("web", 2) / outer("web", 0)).toBeCloseTo(3, 1);
  });

  test("series stack outward, each ring adding its own area, and empty ones draw nothing", async () => {
    await draw(spec);
    // 16 then 9 more: the stack reaches the radius of 25, five fourths of 16's.
    expect(outer("app", 1) / outer("web", 1)).toBeCloseTo(1.25, 2);
    expect(all("path.fft-rose-seg").length).toBe(6);
  });

  test("a wedge's tooltip gives each series and the total", async () => {
    await draw(spec);
    all(".fft-rose-hit")[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["06", "16Web", "9App", "25Total"]);
  });

  test("each wedge's tooltip anchors just outside the dial at the wedge's middle, so it never covers the dial", async () => {
    await draw(spec);
    const svgEl = target.querySelector(".fft-rose svg");
    const [cx, cy] = [Number(svgEl?.getAttribute("width")) / 2, Number(svgEl?.getAttribute("height")) / 2];
    const anchors = all("circle.fft-rose-anchor").map((a) => [Number(a.getAttribute("cx")) - cx, Number(a.getAttribute("cy")) - cy]);
    const reach = Math.max(...all("path.fft-rose-seg").map((seg) => Number(/A([\d.]+),/.exec(seg.getAttribute("d") ?? "")?.[1])));
    expect(anchors.length).toBe(4);
    expect(anchors.every(([dx = 0, dy = 0]) => Math.hypot(dx, dy) > reach)).toBe(true);
    // Wedge 0 spans twelve to three o'clock: its middle is up and to the right.
    expect([(anchors[0]?.[0] ?? 0) > 0, (anchors[0]?.[1] ?? 0) < 0]).toEqual([true, true]);
  });

  test("wedges in the top half show their tooltip above the dial, those in the bottom half below it", async () => {
    await draw(spec);
    const placement = (i: number) => {
      all(".fft-rose-hit")[i]?.dispatchEvent(new Event("focus"));
      return target.querySelector<HTMLElement>(".fft-tooltip")?.dataset.placement ?? "above";
    };
    expect([0, 1, 2, 3].map(placement)).toEqual(["above", "below", "below", "above"]);
  });

  test("names thin out round a crowded dial, so 24 hours show every few", async () => {
    const day = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, "0")}:00`, n: 10 + h }));
    await draw({ rows: day, view: { type: "rose", label: "hour", y: "n" } });
    const shown = texts(".fft-rose-axis");
    expect(shown[0]).toBe("00:00");
    expect(shown.length).toBeLessThan(24);
    expect(24 % shown.length).toBe(0);
  });
});

describe("radar view", () => {
  const scores = [
    { attr: "Speed", us: 8, them: 6 },
    { attr: "Price", us: 4, them: 7 },
    { attr: "Support", us: 9, them: 5 },
    { attr: "Ease", us: 6, them: 6 },
  ];
  const spec = { rows: scores, view: { type: "radar", label: "attr", y: ["us", "them"] } };
  const center = () => {
    const svgEl = target.querySelector(".fft-radar svg");
    return [Number(svgEl?.getAttribute("width")) / 2, Number(svgEl?.getAttribute("height")) / 2];
  };
  const vertices = (series: string) => all(`circle.fft-radar-dot[data-series="${series}"]`).map((dot) => [Number(dot.getAttribute("cx")), Number(dot.getAttribute("cy"))]);

  test("one spoke per row, one shape per series, and rings for the shared scale", async () => {
    await draw(spec);
    expect([all("line.fft-radar-spoke").length, all("path.fft-radar-shape").length]).toEqual([4, 2]);
    expect(all("path.fft-radar-ring").length).toBeGreaterThan(1);
    expect(texts(".fft-radar-axis")).toEqual(["Speed", "Price", "Support", "Ease"]);
  });

  test("each point sits as far from the center as its value", async () => {
    await draw(spec);
    const [cx, cy] = center();
    const dist = ([x, y]: number[]) => Math.hypot((x ?? 0) - (cx ?? 0), (y ?? 0) - (cy ?? 0));
    const [speed, price] = vertices("us");
    expect(dist(speed as number[]) / dist(price as number[])).toBeCloseTo(2, 1);
  });

  test("the legend names the series, and a spoke's tooltip compares them", async () => {
    await draw(spec);
    expect(texts(".fft-legend li")).toEqual(["Us", "Them"]);
    all(".fft-radar-hit")[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Price", "4Us", "7Them"]);
  });
});

describe("round figures in wide spaces", () => {
  const wide = async (spec: Parameters<typeof draw>[0]) => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1000 });
    try {
      await draw(spec);
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    }
  };
  const parts = [
    { l: "A", v: 3 },
    { l: "B", v: 1 },
  ];

  test("a donut grows to the next Fibonacci step, 377px with a 34px ring, when there is room", async () => {
    await wide({ rows: parts, view: { type: "donut", label: "l", value: "v" } });
    const ring = target.querySelector(".fft-donut svg");
    expect([ring?.getAttribute("width"), target.querySelector(".fft-slice")?.getAttribute("stroke-width")]).toEqual(["377", "34"]);
  });

  test("rings, waffle and sunburst grow to 377px too", async () => {
    await wide({ rows: [{ g: "A", v: 1, t: 2 }], view: { type: "rings", label: "g", value: "v", target: "t" } });
    await wide({ rows: parts, view: { type: "waffle", label: "l", value: "v" } });
    await wide({ rows: parts, view: { type: "sunburst", levels: ["l"], value: "v" } });
    expect([".fft-rings svg", ".fft-waffle svg", ".fft-sun svg"].map((sel) => target.querySelector(sel)?.getAttribute("width"))).toEqual(["377", "377", "377"]);
  });
});

describe("scatter with size (bubble chart)", () => {
  const deals = [
    { name: "Small", days: 10, value: 50, seats: 25 },
    { name: "Big", days: 40, value: 90, seats: 100 },
  ];
  const spec = { rows: deals, view: { type: "scatter", x: "days", y: "value", size: "seats", label: "name" } };
  const radius = (name: string) => Number(target.querySelector(`circle.fft-point[data-label="${name}"]`)?.getAttribute("r"));

  test("bubble area follows the size field: four times the value, twice the radius", async () => {
    await draw(spec);
    expect(radius("Big") / radius("Small")).toBeCloseTo(2, 1);
  });

  test("when an axis crosses zero, its zero line is drawn as a baseline", async () => {
    await draw({ rows: [{ g: -0.1, m: 0.2 }, { g: 0.3, m: 0.4 }], view: { type: "scatter", x: "g", y: "m" } });
    const vertical = all("line.fft-baseline").filter((l) => l.getAttribute("x1") === l.getAttribute("x2"));
    expect(vertical.length).toBe(1);
  });

  test("bigger bubbles are drawn first, so small ones stay on top", async () => {
    await draw(spec);
    expect(all("circle.fft-point").map((c) => c.getAttribute("data-label"))).toEqual(["Big", "Small"]);
  });

  test("the tooltip adds the size, and the legend says what size means", async () => {
    await draw(spec);
    const hit = all(".fft-point-hit").find((h) => h.getAttribute("aria-label")?.startsWith("Small")) as Element;
    hit.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-row")).toEqual(["10Days", "50Value", "25Seats"]);
    expect(texts(".fft-scatter-size")).toEqual(["Bubble size: Seats"]);
  });
});

describe("bar cells", () => {
  const rows = [
    { name: "A", amount: 200 },
    { name: "B", amount: 100 },
    { name: "C", amount: -50 },
  ];
  const fill = (i: number) => (all(".fft-cell-bar-fill")[i] as HTMLElement | undefined)?.style.width;

  test("a bar-format column draws in-cell bars scaled to the column's largest value, with the number beside", async () => {
    await draw({ rows, fields: { amount: { format: "bar" } }, view: { type: "table" } });
    expect([fill(0), fill(1), fill(2)]).toEqual(["100%", "50%", "25%"]);
    expect(texts(".fft-cell-bar-value")).toEqual(["200", "100", "-50"]);
  });

  test("every number in a bar column gets the same width, so the bars line up", async () => {
    await draw({ rows, fields: { amount: { format: "bar" } }, view: { type: "table" } });
    const widths = all(".fft-cell-bar-value").map((v) => (v as HTMLElement).style.minWidth);
    expect([new Set(widths).size, widths[0]]).toEqual([1, "3ch"]);
  });

  test("negative values are marked, and an explicit max sets the scale", async () => {
    await draw({ rows, fields: { amount: { format: { type: "bar", max: 400 } } }, view: { type: "table" } });
    expect([fill(0), fill(1)]).toEqual(["50%", "25%"]);
    expect(all(".fft-cell-bar").map((b) => b.hasAttribute("data-negative"))).toEqual([false, false, true]);
  });

  test("lists draw bars for a bar-format value too", async () => {
    await draw({ rows, fields: { amount: { format: "bar" } }, view: { type: "list", label: "name", value: "amount" } });
    expect(fill(1)).toBe("50%");
  });
});

describe("kpis view (a row of stat tiles)", () => {
  // "previous" is the keyword for the row before, so the comparison field gets a different name.
  const row = [{ revenue: 1250, lastQuarter: 1000, churn: 0.04, churnBefore: 0.05 }];
  const fields = { revenue: { label: "Revenue", format: { type: "currency", currency: "EUR", decimals: 0 } }, churn: { format: { type: "percent", decimals: 1 } } };

  test("a tile with a target says where it stands under its change, as the single number does", async () => {
    const goals = [{ revenue: 1250, goal: 1200, churn: 0.04, cap: 0.035 }];
    await draw({ rows: goals, fields, view: { type: "kpis", items: [{ value: "revenue", target: "goal" }, { value: "churn", goodWhen: "down", target: "cap" }, { value: "revenue", label: "No target" }] } });
    expect(all(".fft-stat").map((tile) => tile.querySelector(".fft-stat-target")?.textContent ?? "")).toEqual(["Target met: €1,200", "0.5% above the 3.5% target", ""]);
    expect(Boolean(all(".fft-stat")[0]?.querySelector(".fft-stat-target .fft-check"))).toBe(true);
  });

  test("one tile per item with its label, value and change", async () => {
    await draw({
      rows: row,
      fields,
      view: { type: "kpis", items: [{ value: "revenue", compare: "lastQuarter" }, { value: "churn", compare: "churnBefore", goodWhen: "down", label: "Churn rate" }] },
    });
    expect([texts(".fft-stat-label"), texts(".fft-stat-value"), texts(".fft-stat .fft-kpi-change")]).toEqual([
      ["Revenue", "Churn rate"],
      ["€1,250", "4.0%"],
      ["▲ +25.0%", "▼ −20.0%"],
    ]);
    expect(all(".fft-stat .fft-kpi-delta").map((d) => (d as HTMLElement).dataset.sentiment)).toEqual(["good", "good"]);
  });

  test("series mode reads the last row, compares with the row before, and draws a sparkline per tile", async () => {
    const months = [
      { m: "Jul", a: 10, b: 5 },
      { m: "Aug", a: 12, b: 4 },
      { m: "Sep", a: 15, b: 6 },
    ];
    await draw({ rows: months, view: { type: "kpis", series: true, items: [{ value: "a" }, { value: "b" }] } });
    expect([texts(".fft-stat-value"), texts(".fft-stat .fft-kpi-change"), all(".fft-stat svg.fft-sparkline").length]).toEqual([["15", "6"], ["▲ +25.0%", "▲ +50.0%"], 2]);
  });

  test("tiles without a comparison show just the number", async () => {
    await draw({ rows: row, fields, view: { type: "kpis", items: [{ value: "revenue" }] } });
    expect(all(".fft-stat .fft-kpi-delta").length).toBe(0);
  });
});

describe("print stylesheet", () => {
  test("the base stylesheet carries print rules the browser accepts", async () => {
    await draw({ rows: [{ a: 1 }], view: { type: "table" } });
    const sheet = (document.querySelector("style[data-fft-widget]") as HTMLStyleElement).sheet as CSSStyleSheet;
    const print = [...sheet.cssRules].filter((rule) => rule instanceof CSSMediaRule && rule.media.mediaText === "print") as CSSMediaRule[];
    const selectors = print.flatMap((rule) => [...rule.cssRules].map((r) => (r as CSSStyleRule).selectorText));
    expect(selectors).toEqual(expect.arrayContaining([".fft-actions, .fft-tooltip"]));
  });
});

describe("keyboard navigation in charts", () => {
  test("a chart is one tab stop, and arrows move between its marks with the tooltip following", async () => {
    await draw({ rows: sales, view: { type: "bar", x: "region", y: "revenue" } });
    const hits = all(".fft-hit");
    expect(hits.map((h) => h.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
    (hits[0] as SVGElement).focus();
    hits[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(hits[1]);
    expect(texts(".fft-tooltip-title")).toEqual(["South"]);
  });

  test("lists and tables use the same roving tab stop", async () => {
    await draw({ rows: sales, view: { type: "table" } });
    expect(all("tbody tr").map((r) => r.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
  });
});

describe("ridgeline view", () => {
  const deals = [
    ...[10, 12, 13, 15, 18].map((v) => ({ region: "North", size: v })),
    ...[30, 32, 35, 36, 40, 41].map((v) => ({ region: "South", size: v })),
  ];
  const spec = { rows: deals, view: { type: "ridgeline", value: "size", group: "region" } };

  test("one smooth curve per group, each labelled", async () => {
    await draw(spec);
    expect([all("path.fft-ridge-line").length, texts(".fft-ridge-label")]).toEqual([2, ["North", "South"]]);
  });

  test("when every value is zero or more, the axis and curves stop at zero", async () => {
    // Values near zero: the smoothing padding would otherwise reach below it.
    const small = [1, 2, 3, 4, 5].map((v) => ({ region: "A", size: v })).concat([30, 31, 33, 35, 40].map((v) => ({ region: "B", size: v })));
    await draw({ rows: small, view: { type: "ridgeline", value: "size", group: "region" } });
    expect(texts(".fft-tick-x")[0]).toBe("0");
  });

  test("focusing a ridge gives the median, the middle half and the count", async () => {
    await draw(spec);
    all(".fft-ridge-hit")[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["South", "35.5Median", "32.75 to 39Middle half", "6Count"]);
  });
});

describe("bar view", () => {
  test("draws one bar per row and series", async () => {
    await draw({ rows: sales, view: { type: "bar", x: "region", y: ["revenue", "cost"] } });
    expect(all("path.fft-bar").length).toBe(6);
  });

  test("bars take series colors in palette order", async () => {
    await draw({ rows: sales.slice(0, 1), view: { type: "bar", x: "region", y: ["revenue", "cost"] } });
    expect(all("path.fft-bar").map((bar) => (bar as SVGElement).style.fill)).toEqual(["var(--fft-series-1)", "var(--fft-series-2)"]);
  });

  test("one series has no legend; several series list each by label", async () => {
    await draw({ rows: sales, view: { type: "bar", x: "region", y: "revenue" } });
    expect(all(".fft-legend").length).toBe(0);
    target.innerHTML = "";
    await draw({ rows: sales, view: { type: "bar", x: "region", y: ["revenue", "cost"] } });
    expect(texts(".fft-legend li")).toEqual(["Revenue", "Cost"]);
  });

  test("category labels run along the bottom", async () => {
    await draw({ rows: sales, view: { type: "bar", x: "region", y: "revenue" } });
    expect(texts(".fft-tick-x")).toEqual(["North", "South", "East"]);
  });

  test("y ticks are round, shortened, and use the field's currency", async () => {
    await draw({ rows: [{ m: "Jan", r: 87_000 }], fields: { r: { format: { type: "currency", currency: "USD" } } }, view: { type: "bar", x: "m", y: "r" } });
    expect(texts(".fft-tick-y")).toEqual(["$0", "$20K", "$40K", "$60K", "$80K", "$100K"]);
  });

  test("focusing a category shows a tooltip with every series value", async () => {
    await draw({ rows: sales, fields: { revenue: { format: { type: "currency", currency: "EUR", decimals: 0 } } }, view: { type: "bar", x: "region", y: ["revenue", "cost"] } });
    all(".fft-hit")[2]?.dispatchEvent(new Event("focus"));
    const tip = target.querySelector<HTMLElement>(".fft-tooltip");
    expect(tip?.hidden).toBe(false);
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["East", "€2,000Revenue", "1,500Cost"]);
    all(".fft-hit")[2]?.dispatchEvent(new Event("blur"));
    expect(tip?.hidden).toBe(true);
  });

  test("clicking a category selects its row", async () => {
    const seen = selections();
    await draw({ rows: sales, view: { type: "bar", x: "region", y: "revenue" } });
    all(".fft-hit")[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(seen).toEqual([sales[0]]);
  });

  test("values that are not numbers draw no bar instead of breaking the chart", async () => {
    await draw({ rows: [{ k: "a", v: 3 }, { k: "b", v: "n/a" }], view: { type: "bar", x: "k", y: "v" } });
    expect(all("path.fft-bar").length).toBe(1);
  });

  test("a preset can turn bars into pills on soft tracks", async () => {
    await draw({ rows: sales, view: { type: "bar", x: "region", y: "revenue" }, style: { preset: "glass" } });
    expect([all("path.fft-bar").length, all("path.fft-bar-track").length]).toEqual([3, 3]);
  });

  test("the default look has no tracks", async () => {
    await draw({ rows: sales, view: { type: "bar", x: "region", y: "revenue" } });
    expect(all("path.fft-bar-track").length).toBe(0);
  });

  test("carries a hidden data table for screen readers", async () => {
    await draw({ rows: sales, view: { type: "bar", x: "region", y: "revenue" } });
    expect(texts(".fft-sr-only th")).toEqual(["Region", "Revenue"]);
    expect(all(".fft-sr-only tbody tr").length).toBe(3);
  });
});

describe("line view", () => {
  const months = [
    { month: "Jan", a: 10, b: 4 },
    { month: "Feb", a: 30, b: null },
    { month: "Mar", a: 20, b: 8 },
  ];

  test("draws one line per series, broken where values are missing", async () => {
    await draw({ rows: months, view: { type: "line", x: "month", y: ["a", "b"] } });
    const paths = all("path.fft-line").map((p) => p.getAttribute("d") ?? "");
    expect(paths.map((d) => d.replace(/[^ML]/g, ""))).toEqual(["MLL", "MM"]);
    expect(all("path.fft-line").map((p) => (p as SVGElement).style.stroke)).toEqual(["var(--fft-series-1)", "var(--fft-series-2)"]);
  });

  test("marks the last point of each series", async () => {
    await draw({ rows: months, view: { type: "line", x: "month", y: ["a", "b"] } });
    expect(all("circle.fft-dot.fft-end").length).toBe(2);
  });

  test("hovering a position shows the crosshair and a tooltip listing every series", async () => {
    await draw({ rows: months, view: { type: "line", x: "month", y: ["a", "b"] } });
    all(".fft-hit")[1]?.dispatchEvent(new Event("pointerenter"));
    expect(target.querySelector(".fft-crosshair")?.hasAttribute("hidden")).toBe(false);
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["Feb", "30A", "B"]);
    all(".fft-hit")[1]?.dispatchEvent(new Event("pointerleave"));
    expect(target.querySelector(".fft-crosshair")?.hasAttribute("hidden")).toBe(true);
  });
});
