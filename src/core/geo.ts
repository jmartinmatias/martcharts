/**
 * Geometry for the map views (choropleth, symbols, locator): what a `geo`
 * option can be, two built-in tile-grid basemaps, and a projection that fits
 * any GeoJSON into a box. Pure data and arithmetic, so the MCP server and the
 * tests use it in Node, and the renderers draw its output.
 *
 * A `geo` option is one of:
 * - the name of a built-in basemap: `"europe"` or `"us-states"` (tile grids, one square per country or state);
 * - an inline GeoJSON FeatureCollection of Polygon or MultiPolygon features, each with an id in `feature.id` or in
 *   `properties[key]` (`key` is the view's option, default `id`);
 * - the address of such a file, which the renderer fetches.
 *
 * @module
 */

/** A GeoJSON position: longitude, latitude (or column, row on a tile grid). */
export type Position = [number, number];

/** The geometries the maps draw. */
export type GeoGeometry =
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] }
  | { type: "Point"; coordinates: Position };

/** One GeoJSON feature. */
export interface GeoFeature {
  type: "Feature";
  id?: string | number;
  properties?: Record<string, unknown> | null;
  geometry: GeoGeometry | null;
}

/** A GeoJSON FeatureCollection. Built-in grids carry `grid: true`: their coordinates are tile units, not degrees. */
export interface GeoCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
  grid?: boolean;
}

/** One built-in basemap: `[code, name, column, row]` per tile, row 0 at the top. */
type Tile = [code: string, name: string, column: number, row: number];

/**
 * Europe as a tile grid, in the familiar Eurostat-style arrangement: the Nordics
 * across the top, the Baltics in one column under Finland, Iberia at the bottom
 * left and the Balkans running down to Greece, Cyprus off Turkey. ISO 3166-1
 * alpha-2 codes (GB for the United Kingdom, GR for Greece).
 */
const EUROPE: Tile[] = [
  ["IS", "Iceland", 0, 0],
  ["NO", "Norway", 5, 0],
  ["SE", "Sweden", 6, 0],
  ["FI", "Finland", 7, 0],
  ["IE", "Ireland", 1, 1],
  ["GB", "United Kingdom", 2, 1],
  ["DK", "Denmark", 5, 1],
  ["EE", "Estonia", 7, 1],
  ["RU", "Russia", 8, 1],
  ["NL", "Netherlands", 4, 2],
  ["DE", "Germany", 5, 2],
  ["LV", "Latvia", 7, 2],
  ["FR", "France", 2, 3],
  ["BE", "Belgium", 3, 3],
  ["LU", "Luxembourg", 4, 3],
  ["CZ", "Czechia", 5, 3],
  ["PL", "Poland", 6, 3],
  ["LT", "Lithuania", 7, 3],
  ["BY", "Belarus", 8, 3],
  ["PT", "Portugal", 0, 4],
  ["ES", "Spain", 1, 4],
  ["CH", "Switzerland", 3, 4],
  ["AT", "Austria", 4, 4],
  ["SK", "Slovakia", 5, 4],
  ["UA", "Ukraine", 6, 4],
  ["MD", "Moldova", 7, 4],
  ["IT", "Italy", 3, 5],
  ["SI", "Slovenia", 4, 5],
  ["HU", "Hungary", 5, 5],
  ["RO", "Romania", 6, 5],
  ["HR", "Croatia", 4, 6],
  ["RS", "Serbia", 5, 6],
  ["BG", "Bulgaria", 6, 6],
  ["BA", "Bosnia and Herzegovina", 4, 7],
  ["ME", "Montenegro", 5, 7],
  ["MK", "North Macedonia", 6, 7],
  ["TR", "Türkiye", 7, 7],
  ["MT", "Malta", 3, 8],
  ["AL", "Albania", 5, 8],
  ["GR", "Greece", 6, 8],
  ["CY", "Cyprus", 8, 8],
];

/** The 50 states and the District of Columbia in the familiar NPR tile grid, keyed by postal code. */
const US_STATES: Tile[] = [
  ["AK", "Alaska", 0, 0],
  ["ME", "Maine", 11, 0],
  ["WI", "Wisconsin", 6, 1],
  ["VT", "Vermont", 10, 1],
  ["NH", "New Hampshire", 11, 1],
  ["WA", "Washington", 0, 2],
  ["ID", "Idaho", 1, 2],
  ["MT", "Montana", 2, 2],
  ["ND", "North Dakota", 3, 2],
  ["MN", "Minnesota", 4, 2],
  ["IL", "Illinois", 5, 2],
  ["MI", "Michigan", 6, 2],
  ["NY", "New York", 9, 2],
  ["MA", "Massachusetts", 10, 2],
  ["OR", "Oregon", 0, 3],
  ["NV", "Nevada", 1, 3],
  ["WY", "Wyoming", 2, 3],
  ["SD", "South Dakota", 3, 3],
  ["IA", "Iowa", 4, 3],
  ["IN", "Indiana", 5, 3],
  ["OH", "Ohio", 6, 3],
  ["PA", "Pennsylvania", 7, 3],
  ["NJ", "New Jersey", 8, 3],
  ["CT", "Connecticut", 9, 3],
  ["RI", "Rhode Island", 10, 3],
  ["CA", "California", 0, 4],
  ["UT", "Utah", 1, 4],
  ["CO", "Colorado", 2, 4],
  ["NE", "Nebraska", 3, 4],
  ["MO", "Missouri", 4, 4],
  ["KY", "Kentucky", 5, 4],
  ["WV", "West Virginia", 6, 4],
  ["VA", "Virginia", 7, 4],
  ["MD", "Maryland", 8, 4],
  ["DE", "Delaware", 9, 4],
  ["AZ", "Arizona", 1, 5],
  ["NM", "New Mexico", 2, 5],
  ["KS", "Kansas", 3, 5],
  ["AR", "Arkansas", 4, 5],
  ["TN", "Tennessee", 5, 5],
  ["NC", "North Carolina", 6, 5],
  ["SC", "South Carolina", 7, 5],
  ["DC", "District of Columbia", 8, 5],
  ["OK", "Oklahoma", 3, 6],
  ["LA", "Louisiana", 4, 6],
  ["MS", "Mississippi", 5, 6],
  ["AL", "Alabama", 6, 6],
  ["GA", "Georgia", 7, 6],
  ["HI", "Hawaii", 0, 7],
  ["TX", "Texas", 3, 7],
  ["FL", "Florida", 8, 7],
];

/** Other codes people write for a tile: Eurostat's UK and EL. */
const ALIASES: Record<string, string> = { UK: "GB", EL: "GR" };

const TABLES: Record<string, { tiles: Tile[]; description: string }> = {
  europe: { tiles: EUROPE, description: "Europe: 41 countries as tiles, ISO codes (FR, DE, GB)." },
  "us-states": { tiles: US_STATES, description: "The United States: 50 states and DC as tiles, postal codes (CA, TX, NY)." },
};

const grids = new Map<string, GeoCollection>();

/** The names of the built-in basemaps. */
export function basemapNames(): string[] {
  return Object.keys(TABLES);
}

/** One line on each built-in basemap, for docs and agents. */
export function describeBasemaps(): { name: string; description: string }[] {
  return Object.entries(TABLES).map(([name, table]) => ({ name, description: table.description }));
}

/** A built-in basemap as a FeatureCollection of unit squares (`grid: true`), or undefined for an unknown name. */
export function basemap(name: string): GeoCollection | undefined {
  const table = TABLES[name];
  if (!table) return undefined;
  let collection = grids.get(name);
  if (!collection) {
    collection = {
      type: "FeatureCollection",
      grid: true,
      features: table.tiles.map(([code, label, column, row]) => ({
        type: "Feature",
        id: code,
        properties: { id: code, name: label },
        geometry: { type: "Polygon", coordinates: [[[column, row], [column + 1, row], [column + 1, row + 1], [column, row + 1], [column, row]]] },
      })),
    };
    grids.set(name, collection);
  }
  return collection;
}

/** The tiles of a built-in basemap: code, name, column and row. Empty for an unknown name. */
export function basemapTiles(name: string): { code: string; name: string; column: number; row: number }[] {
  return (TABLES[name]?.tiles ?? []).map(([code, label, column, row]) => ({ code, name: label, column, row }));
}

/** True when a value looks like a web address or a path to a file, which the renderer must fetch. */
export function isGeoUrl(geo: unknown): geo is string {
  return typeof geo === "string" && !(geo in TABLES) && (/^(https?:)?\/\//.test(geo) || /^\.{0,2}\//.test(geo) || /\.(geo)?json(\?|#|$)/i.test(geo));
}

/** True for an object shaped like a FeatureCollection. */
export function isGeoCollection(geo: unknown): geo is GeoCollection {
  return typeof geo === "object" && geo !== null && (geo as GeoCollection).type === "FeatureCollection" && Array.isArray((geo as GeoCollection).features);
}

/**
 * The geometry a `geo` option names, when it is at hand: a built-in basemap or
 * an inline collection. Undefined for an address (to be fetched) or an unknown name.
 */
export function resolveGeo(geo: unknown): GeoCollection | undefined {
  if (typeof geo === "string") return basemap(geo);
  return isGeoCollection(geo) ? geo : undefined;
}

/** What is wrong with a `geo` option, or nothing. */
export function geoProblem(geo: unknown): string | undefined {
  if (geo === undefined || geo === null) return undefined;
  if (typeof geo === "string") {
    if (geo in TABLES || isGeoUrl(geo)) return undefined;
    return `geo must be a built-in basemap (${basemapNames().join(", ")}), a GeoJSON FeatureCollection, or the address of one.`;
  }
  if (!isGeoCollection(geo)) return "geo must be a GeoJSON FeatureCollection: { type: \"FeatureCollection\", features: [...] }.";
  return geo.features.length ? undefined : "geo has no features.";
}

/** A feature's id: `feature.id`, else `properties[key]`, as text; empty when it has none. */
export function featureId(feature: GeoFeature, key = "id"): string {
  const own = feature.properties?.[key];
  if (own !== undefined && own !== null && own !== "") return String(own);
  if (feature.id !== undefined && feature.id !== null) return String(feature.id);
  return "";
}

/** A feature's display name: `properties.name` (or NAME, label), else its id. */
export function featureName(feature: GeoFeature, key = "id"): string {
  const props = feature.properties ?? {};
  for (const field of ["name", "NAME", "label", "title"]) {
    const value = props[field];
    if (typeof value === "string" && value) return value;
  }
  return featureId(feature, key);
}

/** A row's id made comparable with a feature's: trimmed, upper-cased when it is a short code, aliases resolved. */
export function normalizeId(value: unknown): string {
  const text = String(value ?? "").trim();
  const code = /^[a-z]{2,3}$/i.test(text) ? text.toUpperCase() : text;
  return ALIASES[code] ?? code;
}

/** A guess at the basemap a column of codes belongs to: every code on one grid, with at least three of them. */
export function guessBasemap(values: unknown[]): string | undefined {
  const codes = [...new Set(values.map(normalizeId).filter(Boolean))];
  if (codes.length < 3 || !codes.every((code) => /^[A-Z]{2}$/.test(code))) return undefined;
  for (const name of basemapNames()) {
    const known = new Set((TABLES[name]?.tiles ?? []).map(([code]) => code));
    if (codes.every((code) => known.has(code))) return name;
  }
  return undefined;
}

/** The rings of a polygon or multipolygon. */
function rings(geometry: GeoGeometry | null): Position[][] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [[geometry.coordinates]];
}

/** The outer rings of a geometry: every polygon's first ring. */
function outerRings(geometry: GeoGeometry | null): Position[][] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates.slice(0, 1);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.map((polygon) => polygon[0] ?? []);
  return [];
}

/** Signed area and centroid of one ring (shoelace), in its own units. */
function ringMoments(ring: Position[]): { area: number; cx: number; cy: number } {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i] as Position;
    const [x2, y2] = ring[(i + 1) % ring.length] as Position;
    const cross = x1 * y2 - x2 * y1;
    area += cross;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  if (area === 0) {
    const n = ring.length || 1;
    return { area: 0, cx: ring.reduce((s, [x]) => s + x, 0) / n, cy: ring.reduce((s, [, y]) => s + y, 0) / n };
  }
  return { area: area / 2, cx: cx / (3 * area), cy: cy / (3 * area) };
}

/** The projected box of a collection: its lon/lat bounds, and the cos(mid-latitude) that keeps degrees in shape. */
function frame(collection: GeoCollection): { minX: number; maxX: number; minY: number; maxY: number; kx: number } {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const feature of collection.features) {
    for (const ring of rings(feature.geometry)) {
      for (const [lon, lat] of ring) {
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  if (!Number.isFinite(minLon)) return { minX: 0, maxX: 1, minY: 0, maxY: 1, kx: 1 };
  // Degrees of longitude shrink toward the poles: scale x by the cosine of the middle latitude (never below 0.2).
  const kx = collection.grid ? 1 : Math.max(0.2, Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180));
  return { minX: minLon * kx, maxX: maxLon * kx, minY: minLat, maxY: maxLat, kx };
}

/** Width over height of a collection once projected, for sizing the map before drawing it. */
export function geoAspect(collection: GeoCollection): number {
  const box = frame(collection);
  const w = box.maxX - box.minX || 1;
  const h = box.maxY - box.minY || 1;
  return w / h;
}

/** One feature, projected: its id, name, SVG path, centroid (of its largest part) and area in pixels. */
export interface ProjectedShape {
  id: string;
  name: string;
  feature: GeoFeature;
  path: string;
  centroid: Position;
  /** Area in square pixels, for deciding whether a label fits. */
  area: number;
  /** Pixel bounds: `[minX, minY, maxX, maxY]`. */
  bounds: [number, number, number, number];
}

/** A projection of a collection into a box. */
export interface Projection {
  shapes: ProjectedShape[];
  /** Pixel position of a longitude and latitude (or a column and row on a grid). */
  point(lon: number, lat: number): Position;
  /** Pixels per unit. */
  scale: number;
}

const px = (value: number) => String(Math.round(value * 100) / 100);

/**
 * Fits every feature into `width` by `height` with `padding` around, keeping
 * its shape (one scale both ways, centered). Real GeoJSON is laid flat with
 * latitude up and longitude scaled by the cosine of the middle latitude; a
 * built-in grid is laid out in tile units, row 0 at the top.
 */
export function project(collection: GeoCollection, width: number, height: number, padding = 0, key = "id"): Projection {
  const box = frame(collection);
  const innerW = Math.max(1, width - padding * 2);
  const innerH = Math.max(1, height - padding * 2);
  const spanX = box.maxX - box.minX || 1;
  const spanY = box.maxY - box.minY || 1;
  const scale = Math.min(innerW / spanX, innerH / spanY);
  const offsetX = padding + (innerW - spanX * scale) / 2;
  const offsetY = padding + (innerH - spanY * scale) / 2;
  const flip = !collection.grid;
  const point = (lon: number, lat: number): Position => [offsetX + (lon * box.kx - box.minX) * scale, flip ? offsetY + (box.maxY - lat) * scale : offsetY + (lat - box.minY) * scale];

  const shapes: ProjectedShape[] = [];
  for (const feature of collection.features) {
    const outer = outerRings(feature.geometry);
    if (!outer.length) continue;
    let path = "";
    let best: { area: number; cx: number; cy: number } | undefined;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let total = 0;
    for (const ring of rings(feature.geometry)) {
      if (ring.length < 2) continue;
      const projected = ring.map(([lon, lat]) => point(lon, lat));
      path += projected.map(([x, y], i) => `${i ? "L" : "M"}${px(x)},${px(y)}`).join("") + "Z";
      for (const [x, y] of projected) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    // The centroid of the largest outer ring, so a country's label lands on its mainland, not between its islands.
    for (const ring of outer) {
      const moments = ringMoments(ring.map(([lon, lat]) => point(lon, lat)));
      const size = Math.abs(moments.area);
      total += size;
      if (!best || size > Math.abs(best.area)) best = moments;
    }
    if (!best || !path) continue;
    shapes.push({ id: featureId(feature, key), name: featureName(feature, key), feature, path, centroid: [best.cx, best.cy], area: total, bounds: [minX, minY, maxX, maxY] });
  }
  return { shapes, point, scale };
}

/** Steps in the sequential color scale shared with heat tables, heatmaps and calendars. */
export const SEQUENTIAL_STEPS = 7;

/** Maps a value in `[min, max]` onto steps 1 (weakest) to 7 (strongest). A flat range sits in the middle. */
export function sequentialStep(value: number, min: number, max: number): number {
  if (max === min) return Math.ceil(SEQUENTIAL_STEPS / 2);
  const t = (value - min) / (max - min);
  return Math.min(SEQUENTIAL_STEPS, Math.max(1, Math.floor(t * SEQUENTIAL_STEPS) + 1));
}
