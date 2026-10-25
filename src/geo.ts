/**
 * `martcharts/geo`: the maps behind the choropleth, locator and symbols views. The built-in basemaps, their
 * projection, feature ids and names, and the checks the views run on a `geo` option. No DOM.
 *
 * @module
 */
export { basemap, basemapNames, basemapTiles, describeBasemaps, featureId, featureName, geoAspect, geoProblem, guessBasemap, isGeoCollection, isGeoUrl, normalizeId, project, resolveGeo, SEQUENTIAL_STEPS, sequentialStep } from "./core/geo.ts";
export type { GeoCollection, GeoFeature, GeoGeometry, Position, ProjectedShape, Projection } from "./core/geo.ts";
