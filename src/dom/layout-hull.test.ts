import { describe, expect, test } from "vitest";
import { convexHull, hullPath } from "./layout.ts";

describe("convexHull", () => {
  test("keeps only the outer points, counter-clockwise from the leftmost", () => {
    const hull = convexHull([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 2, y: 2 },
      { x: 1, y: 3 },
    ]);
    expect(hull).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ]);
  });

  test("drops points on an edge and repeated points", () => {
    const hull = convexHull([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 0 },
      { x: 2, y: 3 },
    ]);
    expect(hull).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 2, y: 3 },
    ]);
  });

  test("one point or two give themselves", () => {
    expect(convexHull([{ x: 1, y: 1 }])).toEqual([{ x: 1, y: 1 }]);
    expect(convexHull([{ x: 3, y: 1 }, { x: 1, y: 1 }])).toEqual([{ x: 1, y: 1 }, { x: 3, y: 1 }]);
  });
});

describe("hullPath", () => {
  /** Every coordinate pair written in the path. */
  const coords = (d: string) => [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));

  test("a square hull padded by 10 reaches 10px beyond every side, with rounded corners", () => {
    const d = hullPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }], 10);
    expect(d.startsWith("M") && d.endsWith("Z") && d.includes("Q")).toBe(true);
    const points = coords(d);
    // Control points sit at the padded corners; curve endpoints at the midpoints of the padded edges.
    expect(Math.min(...points.map((p) => p.x))).toBeCloseTo(-10, 0);
    expect(Math.max(...points.map((p) => p.x))).toBeCloseTo(110, 0);
    expect(Math.min(...points.map((p) => p.y))).toBeCloseTo(-10, 0);
    expect(Math.max(...points.map((p) => p.y))).toBeCloseTo(110, 0);
  });

  test("a single point becomes a disc of the pad's radius, two points a pill", () => {
    const disc = coords(hullPath([{ x: 50, y: 50 }], 8));
    for (const p of disc) expect(Math.hypot(p.x - 50, p.y - 50)).toBeLessThanOrEqual(8.01);
    expect(Math.max(...disc.map((p) => Math.hypot(p.x - 50, p.y - 50)))).toBeCloseTo(8, 0);
    const pill = coords(hullPath([{ x: 0, y: 0 }, { x: 40, y: 0 }], 5));
    expect(Math.min(...pill.map((p) => p.x))).toBeCloseTo(-5, 0);
    expect(Math.max(...pill.map((p) => p.x))).toBeCloseTo(45, 0);
    expect(Math.max(...pill.map((p) => Math.abs(p.y)))).toBeCloseTo(5, 0);
  });

  test("no points, no path", () => {
    expect(hullPath([])).toBe("");
  });
});
