/**
 * What the map views share: loading the geometry (a basemap now, an address
 * after a fetch, with the skeleton meanwhile), fitting it to the card, placing
 * rows on it by region code or by coordinates, and the muted land layer.
 *
 * @module
 */
import { featureId, geoAspect, isGeoCollection, isGeoUrl, normalizeId, project, resolveGeo } from "../../core/geo.ts";
import type { GeoCollection, Position, ProjectedShape, Projection } from "../../core/geo.ts";
import { readNumber } from "../../core/formats.ts";
import type { Row } from "../../core/types.ts";
import type { ViewContext } from "../../core/view-context.ts";
import { buildSkeleton } from "../states.ts";
import { html, svg } from "./shared.ts";

/** Air around the map inside its box. */
export const MAP_PAD = 8;
/** Rough width of one character of 11px label text. */
export const CHAR = 6.2;

/** Geometry fetched by address, once per page. A failed load is forgotten, so the next draw tries again. */
const loads = new Map<string, Promise<GeoCollection>>();

/** Fetches a GeoJSON FeatureCollection, caching the promise by address. */
export function fetchGeo(url: string): Promise<GeoCollection> {
  let pending = loads.get(url);
  if (!pending) {
    pending = (async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not load the map at ${url}: ${response.status}.`);
      const json: unknown = await response.json();
      if (!isGeoCollection(json)) throw new Error(`The map at ${url} is not a GeoJSON FeatureCollection.`);
      return json;
    })();
    pending.catch(() => loads.delete(url));
    loads.set(url, pending);
  }
  return pending;
}

/**
 * Runs `draw` with the geometry a `geo` option names: at once for a basemap or
 * an inline collection (or none), and after the fetch for an address, with the
 * widget's plot skeleton in the meantime. A failed fetch leaves a short message.
 * Returns the cleanup the widget runs before the next render.
 */
export function withGeo(ctx: ViewContext<{ type: string }>, geo: unknown, draw: (collection: GeoCollection | undefined) => void | (() => void)): void | (() => void) {
  if (!isGeoUrl(geo)) {
    const result = draw(resolveGeo(geo));
    return typeof result === "function" ? result : undefined;
  }
  const doc = ctx.el.ownerDocument;
  const skeleton = buildSkeleton(doc, "plot", ctx.height);
  ctx.el.append(skeleton);
  let cancelled = false;
  let cleanup: (() => void) | undefined;
  fetchGeo(geo).then(
    (collection) => {
      if (cancelled) return;
      skeleton.remove();
      const result = draw(collection);
      cleanup = typeof result === "function" ? result : undefined;
    },
    (error: unknown) => {
      if (cancelled) return;
      skeleton.remove();
      ctx.el.append(html(doc, "p", "fft-map-note", error instanceof Error ? error.message : String(error)));
    },
  );
  return () => {
    cancelled = true;
    cleanup?.();
  };
}

/** The map's box and projection: as wide as the card, as tall as its shape asks, between 144px and 1.2 times the chart height. */
export function mapFrame(ctx: ViewContext<{ type: string }>, collection: GeoCollection, key = "id"): { width: number; height: number; projection: Projection } {
  const width = Math.max(144, ctx.width);
  const aspect = geoAspect(collection);
  const height = Math.round(Math.min(Math.max(144, ctx.height * 1.2), Math.max(144, (width - MAP_PAD * 2) / aspect + MAP_PAD * 2)));
  return { width, height, projection: project(collection, width, height, MAP_PAD, key) };
}

/** One row placed on the map. */
export interface Placed {
  row: Row;
  x: number;
  y: number;
  /** The region the row sits on, when placed by id. */
  shape?: ProjectedShape;
  /** The region's name, or the id as given. */
  name: string;
}

/**
 * Places rows on a projection: by region code (`id`, matched to each shape's
 * id, codes upper-cased and aliases resolved) or by `lat` and `lon`. Rows that
 * land nowhere are left out and counted.
 */
export function placeRows(
  rows: Row[],
  view: { id?: string; lat?: string; lon?: string },
  projection: Projection | undefined,
  format: (row: Row) => string,
): { placed: Placed[]; unplaced: number } {
  const placed: Placed[] = [];
  let unplaced = 0;
  const byId = new Map<string, ProjectedShape>();
  for (const shape of projection?.shapes ?? []) byId.set(normalizeId(shape.id), shape);
  for (const row of rows) {
    if (view.id) {
      const shape = byId.get(normalizeId(row[view.id]));
      if (!shape) {
        unplaced++;
        continue;
      }
      placed.push({ row, x: shape.centroid[0], y: shape.centroid[1], shape, name: format(row) || shape.name });
      continue;
    }
    const lat = view.lat ? readNumber(row[view.lat]) : null;
    const lon = view.lon ? readNumber(row[view.lon]) : null;
    if (lat === null || lon === null || !projection) {
      unplaced++;
      continue;
    }
    const [x, y] = projection.point(lon, lat);
    placed.push({ row, x, y, name: format(row) });
  }
  return { placed, unplaced };
}

/** The map's svg, sized to its frame, with the land drawn muted underneath. */
export function mapCanvas(doc: Document, width: number, height: number, label: string, collection: GeoCollection | undefined, shapes: ProjectedShape[]): SVGSVGElement {
  const canvas = svg(doc, "svg", { class: "fft-map", width, height, viewBox: `0 0 ${width} ${height}` });
  if (collection?.grid) canvas.classList.add("fft-map-grid");
  canvas.setAttribute("role", "group");
  canvas.setAttribute("aria-label", label);
  const land = svg(doc, "g", { class: "fft-map-landscape" });
  land.setAttribute("aria-hidden", "true");
  for (const shape of shapes) land.append(svg(doc, "path", { class: "fft-map-land", d: shape.path }));
  canvas.append(land);
  return canvas;
}

/** True when `text` fits inside a shape's box at 11px. */
export function labelFits(shape: ProjectedShape, text: string): boolean {
  const [minX, minY, maxX, maxY] = shape.bounds;
  return maxX - minX >= text.length * CHAR + 6 && maxY - minY >= 15;
}

/** The words that key a group's color: the value as formatted, or "Other" for a blank. */
export function groupName(value: unknown, format: (value: unknown) => string): string {
  return value === null || value === undefined || value === "" ? "Other" : format(value);
}

/** A legend of dots, one per group in its color. */
export function dotLegend(doc: Document, entries: { name: string; color: string }[]): HTMLElement {
  const list = html(doc, "ul", "fft-legend");
  for (const entry of entries) {
    const swatch = html(doc, "span", "fft-swatch");
    swatch.dataset.shape = "dot";
    swatch.style.background = entry.color;
    swatch.setAttribute("aria-hidden", "true");
    const item = html(doc, "li");
    item.append(swatch, entry.name);
    list.append(item);
  }
  return list;
}

/** A note under the map for rows it could not place. */
export function unplacedNote(doc: Document, count: number): HTMLElement | undefined {
  return count ? html(doc, "p", "fft-map-note", `${count} row${count === 1 ? "" : "s"} could not be placed on the map.`) : undefined;
}

/** The point on a circle's edge toward another point, for leader lines. */
export function toward(from: Position, to: Position, distance: number): Position {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  return [from[0] + (dx / length) * distance, from[1] + (dy / length) * distance];
}

export { featureId };
