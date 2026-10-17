import { describe, expect, test } from "vitest";
import { arcPath, areaPath, bands, barPath, goldenHeight, layoutBars, layoutStacked, layoutWaterfall, linearScale, linePath, niceTicks, PHI, quantize, squarify, swarm, layoutSankey, density, quantile, dodge, binValues, allocate, bandPath, spread, fitLabels, sectorPath, smoothBands } from "./layout.ts";

describe("niceTicks", () => {
  test.each([
    [0, 87, [0, 20, 40, 60, 80, 100]],
    [0, 1, [0, 0.2, 0.4, 0.6, 0.8, 1]],
    [-35, 50, [-40, -20, 0, 20, 40, 60]],
    [1200, 9800, [0, 2000, 4000, 6000, 8000, 10000]],
    [0, 0, [0, 0.2, 0.4, 0.6, 0.8, 1]],
  ])("%d to %d", (min, max, expected) => {
    expect(niceTicks(min, max)).toEqual(expected);
  });
});

describe("linearScale", () => {
  test("maps the domain ends onto the range ends", () => {
    const y = linearScale([0, 87], [200, 0], { includeZero: true });
    expect(y.domain).toEqual([0, 100]);
    expect(y(0)).toBe(200);
    expect(y(100)).toBe(0);
    expect(y(50)).toBe(100);
  });

  test("includeZero stretches positive data down to zero", () => {
    expect(linearScale([40, 87], [200, 0], { includeZero: true }).domain).toEqual([0, 100]);
  });

  test("without includeZero the domain hugs the data", () => {
    expect(linearScale([42, 87], [200, 0], { includeZero: false }).domain).toEqual([40, 90]);
  });
});

describe("bands", () => {
  test("splits a width into equal bands", () => {
    expect(bands(4, 40, 400)).toEqual([
      { start: 40, width: 100, center: 90 },
      { start: 140, width: 100, center: 190 },
      { start: 240, width: 100, center: 290 },
      { start: 340, width: 100, center: 390 },
    ]);
  });
});

describe("layoutBars", () => {
  const scale = linearScale([0, 100], [200, 0], { includeZero: true });

  test("bar height is proportional to value, measured from the zero baseline", () => {
    const rects = layoutBars([[50, 100]], bands(2, 0, 200), scale);
    expect(rects.map((r) => [r.y, r.height])).toEqual([
      [100, 100],
      [0, 200],
    ]);
  });

  test("a single bar is capped at 21px and centered in its band", () => {
    const [rect] = layoutBars([[50]], bands(1, 0, 100), scale);
    expect([rect?.x, rect?.width]).toEqual([39.5, 21]);
  });

  test("bars narrower than the cap fill 0.618 of the band, the golden ratio", () => {
    const [rect] = layoutBars([[50]], bands(1, 0, 20), scale);
    expect(rect?.width).toBeCloseTo(12.36, 2);
  });

  test("grouped bars sit side by side with a 2px gap, centered as a group", () => {
    const rects = layoutBars([[50], [80]], bands(1, 0, 100), scale);
    // two 21px bars + 2px gap = 44px group, centered at 50
    expect(rects.map((r) => [r.series, r.x, r.width])).toEqual([
      [0, 28, 21],
      [1, 51, 21],
    ]);
  });

  test("a negative value hangs below the baseline", () => {
    // ticks -40..40 step 20, so zero sits at y=100 and -40 at the bottom (y=200)
    const signed = linearScale([-40, 40], [200, 0], { includeZero: true });
    const [rect] = layoutBars([[-40]], bands(1, 0, 100), signed);
    expect([rect?.y, rect?.height, rect?.negative]).toEqual([100, 100, true]);
  });

  test("missing values draw no bar", () => {
    const rects = layoutBars([[50, null, 20]], bands(3, 0, 300), scale);
    expect(rects.map((r) => r.index)).toEqual([0, 2]);
  });
});

describe("barPath", () => {
  test("rounds the data end and keeps the baseline square", () => {
    const d = barPath({ series: 0, index: 0, x: 10, y: 0, width: 20, height: 50, value: 1, negative: false });
    expect(d).toBe("M10,50V4Q10,0 14,0H26Q30,0 30,4V50Z");
  });

  test("a negative bar is rounded at the bottom", () => {
    const d = barPath({ series: 0, index: 0, x: 10, y: 100, width: 20, height: 50, value: -1, negative: true });
    expect(d).toBe("M10,100V146Q10,150 14,150H26Q30,150 30,146V100Z");
  });

  test("an infinite radius makes a pill: fully rounded at the data end", () => {
    const d = barPath({ series: 0, index: 0, x: 0, y: 0, width: 20, height: 50, value: 1, negative: false }, Number.POSITIVE_INFINITY);
    expect(d).toBe("M0,50V10Q0,0 10,0H10Q20,0 20,10V50Z");
  });

  test("the corner radius never exceeds half the bar height", () => {
    const d = barPath({ series: 0, index: 0, x: 0, y: 0, width: 20, height: 2, value: 1, negative: false });
    expect(d).toBe("M0,2V1Q0,0 1,0H19Q20,0 20,1V2Z");
  });
});

describe("linePath", () => {
  test("joins points and breaks the line at gaps", () => {
    const p = (x: number, y: number) => ({ x, y });
    expect(linePath([p(0, 10), p(10, 20), null, p(30, 5), p(40, 0)])).toBe("M0,10L10,20M30,5L40,0");
  });
});

describe("areaPath", () => {
  test("closes each unbroken run of points down to the baseline", () => {
    const p = (x: number, y: number) => ({ x, y });
    expect(areaPath([p(0, 10), p(10, 20), null, p(30, 5), p(40, 0)], 50)).toBe("M0,10L10,20L10,50L0,50ZM30,5L40,0L40,50L30,50Z");
  });

  test("a lone point between gaps draws nothing", () => {
    expect(areaPath([null, { x: 5, y: 5 }, null], 50)).toBe("");
  });
});

describe("goldenHeight", () => {
  test("is the width divided by the golden ratio", () => {
    expect(PHI).toBeCloseTo(1.618, 3);
    expect(goldenHeight(400)).toBe(247);
  });

  test("never goes below 180px or above 320px", () => {
    expect([goldenHeight(200), goldenHeight(1000)]).toEqual([180, 320]);
  });
});

describe("arcPath", () => {
  test("angles run clockwise from twelve o'clock", () => {
    expect(arcPath(50, 50, 40, 0, Math.PI / 2)).toBe("M50,10A40,40 0 0 1 90,50");
  });

  test("arcs past half a turn use the large-arc flag", () => {
    expect(arcPath(50, 50, 40, 0, (3 * Math.PI) / 2)).toBe("M50,10A40,40 0 1 1 10,50");
  });
});

describe("layoutStacked", () => {
  const scale = linearScale([0, 100], [200, 0], { includeZero: true });

  test("stacks series in one column with a 2px gap, rounding only the top segment", () => {
    const rects = layoutStacked([[30], [50]], bands(1, 0, 100), scale);
    expect(rects.map((r) => [r.series, r.x, r.width, r.y, r.height, r.cap])).toEqual([
      [0, 39.5, 21, 140, 60, false],
      [1, 39.5, 21, 40, 98, true],
    ]);
  });

  test("negative values stack downward from zero, rounded at the bottom", () => {
    const signed = linearScale([-40, 40], [200, 0], { includeZero: true });
    const rects = layoutStacked([[-20], [30]], bands(1, 0, 100), signed);
    expect(rects.map((r) => [r.series, r.y, r.height, r.negative, r.cap])).toEqual([
      [0, 100, 50, true, true],
      [1, 25, 75, false, true],
    ]);
  });

  test("missing values leave no segment and no gap", () => {
    const rects = layoutStacked([[30], [null], [20]], bands(1, 0, 100), scale);
    expect(rects.map((r) => [r.series, r.y, r.height])).toEqual([
      [0, 140, 60],
      [2, 100, 38],
    ]);
  });
});

describe("barPath for a stacked middle segment", () => {
  test("a segment that is not the cap is a plain rectangle", () => {
    const d = barPath({ series: 0, index: 0, x: 39.5, y: 140, width: 21, height: 60, value: 30, negative: false, cap: false });
    expect(d).toBe("M39.5,200V140H60.5V200Z");
  });
});

describe("layoutWaterfall", () => {
  test("totals stand on zero, changes float from the running total, and an end total can be appended", () => {
    expect(layoutWaterfall([{ value: 100, total: true }, { value: 20 }, { value: -5 }], true)).toEqual([
      { start: 0, end: 100, kind: "total" },
      { start: 100, end: 120, kind: "up" },
      { start: 120, end: 115, kind: "down" },
      { start: 0, end: 115, kind: "total" },
    ]);
  });

  test("a total in the middle resets the running total to its value", () => {
    expect(layoutWaterfall([{ value: 10 }, { value: 50, total: true }, { value: 5 }], false).map((s) => [s.start, s.end])).toEqual([
      [0, 10],
      [0, 50],
      [50, 55],
    ]);
  });

  test("missing values count as no change", () => {
    expect(layoutWaterfall([{ value: 10 }, { value: null }], false)[1]).toEqual({ start: 10, end: 10, kind: "up" });
  });
});

describe("quantize", () => {
  test("maps the range onto steps 1 to n, low to high", () => {
    expect([0, 10, 50, 99, 100].map((v) => quantize(v, 0, 100, 7))).toEqual([1, 1, 4, 7, 7]);
  });

  test("a flat range sits in the middle step", () => {
    expect(quantize(5, 5, 5, 7)).toBe(4);
  });
});

describe("squarify", () => {
  const values = [6, 6, 4, 3, 2, 2, 1];
  const rects = squarify(values, 0, 0, 600, 400);

  test("returns one tile per value, in input order, with area proportional to value", () => {
    const total = values.reduce((a, b) => a + b, 0);
    expect(rects.length).toBe(values.length);
    rects.forEach((r, i) => expect(r.width * r.height).toBeCloseTo(((values[i] as number) / total) * 600 * 400, 6));
  });

  test("tiles stay inside the box and never overlap", () => {
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.width).toBeLessThanOrEqual(600 + 1e-9);
      expect(r.y + r.height).toBeLessThanOrEqual(400 + 1e-9);
    }
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i] as { x: number; y: number; width: number; height: number };
        const b = rects[j] as typeof a;
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        expect(overlapX <= 1e-6 || overlapY <= 1e-6).toBe(true);
      }
  });

  test("tiles stay close to square: no tile is more than 3 times longer than wide here", () => {
    for (const r of rects) expect(Math.max(r.width / r.height, r.height / r.width)).toBeLessThan(3);
  });

  test("zero and negative values get empty tiles", () => {
    const out = squarify([5, 0, -2], 0, 0, 100, 100);
    expect(out.map((r) => r.width * r.height)).toEqual([10000, 0, 0]);
  });
});

describe("swarm", () => {
  const xs = [10, 11, 12, 12.5, 13, 30, 31, 50];
  const r = 4;
  const offsets = swarm(xs, r);

  test("returns one vertical offset per dot, in input order", () => {
    expect(offsets.length).toBe(xs.length);
  });

  test("no two dots overlap", () => {
    for (let i = 0; i < xs.length; i++)
      for (let j = i + 1; j < xs.length; j++) {
        const dx = (xs[i] as number) - (xs[j] as number);
        const dy = (offsets[i] as number) - (offsets[j] as number);
        expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(2 * r - 1e-6);
      }
  });

  test("a dot with no neighbours stays on the centre line", () => {
    expect(offsets[7]).toBe(0);
  });
});

describe("layoutSankey", () => {
  const links = [
    { source: "Search", target: "Pricing", value: 60 },
    { source: "Search", target: "Blog", value: 40 },
    { source: "Social", target: "Blog", value: 50 },
    { source: "Pricing", target: "Signup", value: 30 },
    { source: "Blog", target: "Signup", value: 20 },
  ];
  const layout = layoutSankey(links, 600, 300, { nodeWidth: 13, gap: 8 });
  const node = (name: string) => layout.nodes.find((n) => n.name === name) as (typeof layout.nodes)[number];

  test("columns follow the longest path from a source", () => {
    expect(["Search", "Social", "Pricing", "Blog", "Signup"].map((n) => node(n).column)).toEqual([0, 0, 1, 1, 2]);
  });

  test("a node is as tall as the larger of what flows in and out, on one scale", () => {
    const unit = node("Search").height / 100;
    expect(node("Social").height / unit).toBeCloseTo(50, 6);
    expect(node("Blog").height / unit).toBeCloseTo(90, 6);
  });

  test("every column fits the height, and nodes in a column do not overlap", () => {
    for (const column of [0, 1, 2]) {
      const nodes = layout.nodes.filter((n) => n.column === column).sort((a, b) => a.y - b.y);
      for (const n of nodes) expect(n.y + n.height).toBeLessThanOrEqual(300 + 1e-6);
      nodes.forEach((n, i) => i > 0 && expect(n.y).toBeGreaterThanOrEqual((nodes[i - 1] as typeof n).y + (nodes[i - 1] as typeof n).height + 8 - 1e-6));
    }
  });

  test("ribbons are as thick as their value and leave from the right edge of the source", () => {
    const unit = node("Search").height / 100;
    const ribbon = layout.links.find((l) => l.source === "Search" && l.target === "Pricing") as (typeof layout.links)[number];
    expect(ribbon.thickness / unit).toBeCloseTo(60, 6);
    expect(ribbon.x0).toBeCloseTo(node("Search").x + 13, 6);
    expect(ribbon.x1).toBeCloseTo(node("Pricing").x, 6);
  });
});

describe("density", () => {
  const grid = Array.from({ length: 401 }, (_, i) => -20 + i * 0.1);

  test("integrates to 1, like any probability density", () => {
    const d = density([0, 1, 2, 3, 10], grid);
    const area = d.slice(1).reduce((sum, v, i) => sum + ((v + (d[i] as number)) / 2) * 0.1, 0);
    expect(area).toBeCloseTo(1, 2);
  });

  test("one value peaks at that value and falls off symmetrically", () => {
    const d = density([0], grid, 1);
    const peak = d.indexOf(Math.max(...d));
    expect(grid[peak]).toBeCloseTo(0, 6);
    expect(d[peak - 10]).toBeCloseTo(d[peak + 10] as number, 10);
  });
});

describe("quantile", () => {
  test.each([
    [0.5, 3],
    [0.25, 2],
    [0, 1],
    [1, 5],
  ])("p%s of 1..5 is %s", (p, expected) => {
    expect(quantile([5, 1, 4, 2, 3], p)).toBe(expected);
  });
});

describe("dodge", () => {
  test("positions already far enough apart stay where they are", () => {
    expect(dodge([10, 40, 80], 13, 0, 100)).toEqual([10, 40, 80]);
  });

  test("close neighbours spread to the gap around their shared middle, keeping their order", () => {
    expect(dodge([52, 50], 14, 0, 100)).toEqual([58, 44]);
  });

  test("a chain of collisions spreads as one group", () => {
    const out = dodge([50, 51, 52], 10, 0, 100);
    expect(out).toEqual([41, 51, 61]);
  });

  test("groups stay inside the range", () => {
    expect(dodge([1, 2], 10, 0, 100)).toEqual([0, 10]);
    expect(dodge([99, 100], 10, 0, 100)).toEqual([90, 100]);
  });
});

describe("binValues", () => {
  test("cuts the range on round edges and counts each bin, the top edge going to the last bin", () => {
    expect(binValues([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)).toEqual([
      { start: 0, end: 2, count: 1 },
      { start: 2, end: 4, count: 2 },
      { start: 4, end: 6, count: 2 },
      { start: 6, end: 8, count: 2 },
      { start: 8, end: 10, count: 3 },
    ]);
  });

  test("a single repeated value still gets a bin", () => {
    const bins = binValues([7, 7, 7], 5);
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(3);
  });
});

describe("allocate", () => {
  test("shares out whole units by largest remainder, always summing to the total", () => {
    expect([allocate([50, 30, 20], 100), allocate([1, 1, 1], 100), allocate([0, 5], 100)]).toEqual([
      [50, 30, 20],
      [34, 33, 33],
      [0, 100],
    ]);
  });

  test("nothing to share gives nothing", () => {
    expect(allocate([0, 0], 100)).toEqual([0, 0]);
  });
});

describe("bandPath", () => {
  test("runs along the upper edge, then back along the lower edge, and closes", () => {
    expect(bandPath([{ x: 0, y: 10 }, { x: 5, y: 20 }], [{ x: 0, y: 30 }, { x: 5, y: 40 }])).toBe("M0,10L5,20L5,40L0,30Z");
  });
});

describe("spread", () => {
  test("places points edge to edge, each owning the space halfway to its neighbours", () => {
    expect(spread(3, 10, 100)).toEqual([
      { start: -15, width: 50, center: 10 },
      { start: 35, width: 50, center: 60 },
      { start: 85, width: 50, center: 110 },
    ]);
  });

  test("a single point sits in the middle", () => {
    expect(spread(1, 10, 100)).toEqual([{ start: 10, width: 100, center: 60 }]);
  });
});

describe("fitLabels", () => {
  test("keeps every label with room between them", () => {
    expect(fitLabels([{ x: 0, width: 20 }, { x: 50, width: 20 }])).toEqual([0, 1]);
  });

  test("skips a label that would come within the gap of the last one kept", () => {
    expect(fitLabels([{ x: 0, width: 20 }, { x: 15, width: 20 }, { x: 40, width: 20 }])).toEqual([0, 2]);
  });

  test("with keepLast, drops earlier labels until the last one fits", () => {
    expect(fitLabels([{ x: 0, width: 20 }, { x: 30, width: 20 }, { x: 45, width: 20 }], { keepLast: true })).toEqual([0, 2]);
  });

  test("respects each label's anchor: start grows right, end grows left", () => {
    expect(fitLabels([{ x: 0, width: 30, anchor: "start" }, { x: 40, width: 30, anchor: "middle" }, { x: 100, width: 30, anchor: "end" }])).toEqual([0, 2]);
  });
});

describe("sectorPath", () => {
  test("draws a ring slice: out along the outer arc, back along the inner one", () => {
    // A quarter ring from twelve to three o'clock, radii 5 and 10, centered on 10,10.
    expect(sectorPath(10, 10, 5, 10, 0, Math.PI / 2)).toBe("M10,0A10,10 0 0 1 20,10L15,10A5,5 0 0 0 10,5Z");
  });

  test("a slice over half a turn takes the long way round", () => {
    expect(sectorPath(0, 0, 1, 2, 0, Math.PI * 1.5)).toContain("A2,2 0 1 1");
  });
});

describe("smoothBands", () => {
  const ys = (d: string) => [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => Number(m[2]));
  const at = (list: number[]) => list.map((y, i) => ({ x: i * 10, y }));

  test("curves through every point, and a layer of constant thickness stays parallel to the edge below", () => {
    const base = [100, 60, 90, 50];
    const [band = ""] = smoothBands([at(base), at(base.map((y) => y - 20))]);
    expect(band.startsWith("M0,80C")).toBe(true);
    expect(band.match(/C/g)?.length).toBe(6);
    const [upper = "", lower = ""] = band.split("L");
    expect(ys(upper).sort((a, b) => a - b)).toEqual(ys(lower).map((y) => y - 20).sort((a, b) => a - b));
  });

  test("a band never folds over the one below, even where a layer drops to nothing beside a spike", () => {
    const [band = ""] = smoothBands([at([100, 100, 100, 100]), at([100, 100, 40, 100])]);
    expect(Math.max(...ys(band))).toBeLessThanOrEqual(100);
  });
});
