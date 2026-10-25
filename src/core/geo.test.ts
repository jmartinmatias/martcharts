import { describe, expect, test } from "vitest";
import { basemap, basemapNames, basemapTiles, featureId, featureName, geoAspect, geoProblem, guessBasemap, isGeoUrl, normalizeId, project, resolveGeo, sequentialStep } from "./geo.ts";
import type { GeoCollection, GeoFeature } from "./geo.ts";

/** A tile's column and row on a basemap. */
const at = (name: string, code: string) => {
  const tile = basemapTiles(name).find((t) => t.code === code);
  if (!tile) throw new Error(`${code} is not on ${name}`);
  return tile;
};

describe("built-in basemaps", () => {
  test("europe and us-states exist, with unique codes and no two tiles in one cell", () => {
    expect(basemapNames()).toEqual(["europe", "us-states"]);
    for (const name of basemapNames()) {
      const tiles = basemapTiles(name);
      expect(new Set(tiles.map((t) => t.code)).size).toBe(tiles.length);
      expect(new Set(tiles.map((t) => `${t.column},${t.row}`)).size).toBe(tiles.length);
      for (const tile of tiles) expect([tile.code, /^[A-Z]{2}$/.test(tile.code), tile.name.length > 2]).toEqual([tile.code, true, true]);
    }
  });

  test("the US grid has the 50 states and DC", () => {
    expect(basemapTiles("us-states")).toHaveLength(51);
    expect(basemapTiles("us-states").map((t) => t.code)).toContain("DC");
  });

  test("neighbours make geographic sense", () => {
    const eu = (code: string) => at("europe", code);
    // Portugal west of Spain, in the same row; Ireland west of the United Kingdom.
    expect([eu("PT").row === eu("ES").row, eu("PT").column < eu("ES").column]).toEqual([true, true]);
    expect([eu("IE").row === eu("GB").row, eu("IE").column < eu("GB").column]).toEqual([true, true]);
    // The Nordics across the top, Finland above the Baltics in one column: EE, LV, LT top to bottom.
    expect([eu("NO").column < eu("SE").column, eu("SE").column < eu("FI").column, eu("NO").row === eu("FI").row]).toEqual([true, true, true]);
    expect([eu("FI").column, eu("EE").column, eu("LV").column, eu("LT").column]).toEqual(Array(4).fill(eu("FI").column));
    expect([eu("FI").row < eu("EE").row, eu("EE").row < eu("LV").row, eu("LV").row < eu("LT").row]).toEqual([true, true, true]);
    // Germany east of the Netherlands, Poland east of Germany, Czechia under Poland, Italy under Switzerland, Greece near the bottom.
    expect([eu("NL").column < eu("DE").column, eu("DE").column < eu("PL").column, eu("CZ").row > eu("DE").row, eu("IT").row > eu("CH").row]).toEqual([true, true, true, true]);
    expect(eu("GR").row).toBeGreaterThan(eu("BG").row);
    const us = (code: string) => at("us-states", code);
    // Washington above Oregon above California down the west coast; Maine top right; Florida bottom right; Alaska and Hawaii off to the side.
    expect([us("WA").column, us("OR").column, us("CA").column]).toEqual([0, 0, 0]);
    expect([us("WA").row < us("OR").row, us("OR").row < us("CA").row]).toEqual([true, true]);
    expect([us("ME").row, us("FL").row > us("GA").row, us("AK").row, us("HI").column]).toEqual([0, true, 0, 0]);
    expect(us("TX").row).toBeGreaterThan(us("OK").row);
  });

  test("a basemap is a FeatureCollection of unit squares with id and name, built once", () => {
    const europe = basemap("europe") as GeoCollection;
    expect(europe.grid).toBe(true);
    expect(basemap("europe")).toBe(europe);
    const france = europe.features.find((f) => f.id === "FR");
    expect([featureId(france!), featureName(france!)]).toEqual(["FR", "France"]);
    expect(france?.geometry?.type).toBe("Polygon");
    expect(basemap("mars")).toBeUndefined();
  });
});

describe("geo options", () => {
  test("names, addresses and inline collections are told apart", () => {
    expect(isGeoUrl("europe")).toBe(false);
    expect([isGeoUrl("/maps/regions.geojson"), isGeoUrl("https://example.org/world.json"), isGeoUrl("./shapes.json")]).toEqual([true, true, true]);
    expect(resolveGeo("us-states")?.features).toHaveLength(51);
    expect(resolveGeo("https://example.org/world.json")).toBeUndefined();
    const inline: GeoCollection = { type: "FeatureCollection", features: [{ type: "Feature", id: "a", geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } }] };
    expect(resolveGeo(inline)).toBe(inline);
  });

  test("problems are said in plain words", () => {
    expect(geoProblem(undefined)).toBeUndefined();
    expect(geoProblem("europe")).toBeUndefined();
    expect(geoProblem("atlantis")).toMatch(/built-in basemap \(europe, us-states\)/);
    expect(geoProblem({ type: "Feature" })).toMatch(/FeatureCollection/);
    expect(geoProblem({ type: "FeatureCollection", features: [] })).toMatch(/no features/);
  });

  test("codes normalize: case, spaces and Eurostat's UK and EL", () => {
    expect(["fr", " de ", "UK", "EL", "Texas"].map(normalizeId)).toEqual(["FR", "DE", "GB", "GR", "Texas"]);
  });

  test("a column of codes guesses its basemap, and anything else guesses none", () => {
    expect(guessBasemap(["FR", "DE", "es"])).toBe("europe");
    expect(guessBasemap(["CA", "TX", "NY", "FL"])).toBe("us-states");
    expect(guessBasemap(["FR", "DE"])).toBeUndefined();
    expect(guessBasemap(["North", "South", "East"])).toBeUndefined();
    expect(guessBasemap(["FR", "DE", "ZZ"])).toBeUndefined();
  });
});

describe("project", () => {
  const square = (id: string, x: number, y: number, size = 1): GeoFeature => ({
    type: "Feature",
    id,
    geometry: { type: "Polygon", coordinates: [[[x, y], [x + size, y], [x + size, y + size], [x, y + size], [x, y]]] },
  });

  test("fits the geometry into the box with padding, one scale both ways, centered", () => {
    const collection: GeoCollection = { type: "FeatureCollection", grid: true, features: [square("a", 0, 0), square("b", 1, 0), square("c", 0, 1), square("d", 1, 1)] };
    const { shapes, scale } = project(collection, 200, 100, 10);
    expect(scale).toBe(40);
    expect(shapes.map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
    // Two by two units in a 180 by 80 inner box: 80px tall, centered across.
    const a = shapes[0]!;
    expect(a.bounds).toEqual([60, 10, 100, 50]);
    expect(a.centroid).toEqual([80, 30]);
    expect(a.area).toBe(1600);
    expect(a.path).toBe("M60,10L100,10L100,50L60,50L60,10Z");
    // Grid rows run down the page: row 1 sits under row 0.
    expect(shapes[2]!.centroid[1]).toBeGreaterThan(a.centroid[1]);
  });

  test("real coordinates put north at the top and squeeze longitude by the middle latitude", () => {
    // A square in degrees around 60°N: at that latitude a degree of longitude is half a degree of latitude.
    const collection: GeoCollection = { type: "FeatureCollection", features: [square("n", 10, 59, 2)] };
    const { shapes, point } = project(collection, 100, 100, 0);
    const [minX, minY, maxX, maxY] = shapes[0]!.bounds;
    expect((maxX - minX) / (maxY - minY)).toBeCloseTo(Math.cos((60 * Math.PI) / 180), 2);
    // North (61) above south (59).
    expect(point(11, 61)[1]).toBeLessThan(point(11, 59)[1]);
    expect(geoAspect(collection)).toBeCloseTo(0.5, 1);
  });

  test("a multipolygon's centroid sits on its largest part, and feature ids come from properties when asked", () => {
    const collection: GeoCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { iso: "FR", name: "France" },
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]],
              [[[10, 10], [11, 10], [11, 11], [10, 11], [10, 10]]],
            ],
          },
        },
      ],
    };
    const { shapes } = project(collection, 110, 110, 0, "iso");
    expect([shapes[0]!.id, shapes[0]!.name]).toEqual(["FR", "France"]);
    const [cx, cy] = shapes[0]!.centroid;
    expect([cx < 40, cy > 70]).toEqual([true, true]);
  });

  test("the sequential scale has seven steps, weakest to strongest, flat in the middle", () => {
    expect([sequentialStep(0, 0, 10), sequentialStep(10, 0, 10), sequentialStep(5, 0, 10), sequentialStep(3, 3, 3)]).toEqual([1, 7, 4, 4]);
  });
});
