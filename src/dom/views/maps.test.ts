// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { GeoCollection } from "../../core/geo.ts";
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
afterEach(() => vi.unstubAllGlobals());

async function draw(spec: Omit<WidgetSpec, "data"> & { rows: Row[] }) {
  const { rows, ...rest } = spec;
  target.replaceChildren();
  await createWidget(target, { locale: "en-US", data: { type: "inline", rows }, ...rest } as WidgetSpec).ready;
  expect(target.querySelector(".fft-widget")?.getAttribute("data-state")).toBe("ready");
}

const all = (selector: string) => [...target.querySelectorAll(selector)];
const texts = (selector: string) => all(selector).map((node) => node.textContent);
const press = (node: Element, key: string) => node.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

const revenue = [
  { country: "FR", revenue: 300 },
  { country: "DE", revenue: 500 },
  { country: "es", revenue: 100 },
];

describe("choropleth view", () => {
  const spec = { rows: revenue, view: { type: "choropleth", geo: "europe", id: "country", value: "revenue" } };

  test("draws one region per tile of the basemap, shaded by value, grey where no row names it", async () => {
    await draw(spec);
    expect(all(".fft-map-region")).toHaveLength(41);
    const step = (code: string) => all(".fft-map-region[data-step]").find((r) => r.getAttribute("aria-label")?.startsWith(code))?.getAttribute("data-step");
    expect([step("Germany"), step("France"), step("Spain")]).toEqual(["7", "4", "1"]);
    expect(all(".fft-map-region-empty")).toHaveLength(38);
    expect(all(".fft-map-region[data-step]")).toHaveLength(3);
    expect(target.querySelector(".fft-map")?.classList.contains("fft-map-grid")).toBe(true);
  });

  test("writes each region's code inside it, in the shade's own text color", async () => {
    await draw(spec);
    const labels = all(".fft-map-region-label");
    expect(labels).toHaveLength(41);
    expect(labels.find((l) => l.textContent === "DE")?.getAttribute("data-step")).toBe("7");
    expect(labels.find((l) => l.textContent === "IS")?.classList.contains("fft-map-region-label-empty")).toBe(true);
    await draw({ ...spec, view: { ...spec.view, labels: false } });
    expect(all(".fft-map-region-label")).toHaveLength(0);
  });

  test("the scale runs from the lowest value to the highest in the field's format, and keys No data", async () => {
    await draw({ ...spec, fields: { revenue: { format: { type: "currency", currency: "EUR" } } } });
    expect([texts(".fft-map-legend-min")[0], texts(".fft-map-legend-max")[0]]).toEqual(["€100.00", "€500.00"]);
    expect(all(".fft-map-legend .fft-heat-ramp div")).toHaveLength(7);
    expect(texts(".fft-map-legend-empty")).toEqual(["No data"]);
    // Fixed ends move the scale.
    await draw({ ...spec, view: { ...spec.view, min: 0, max: 1000 } });
    expect([texts(".fft-map-legend-min")[0], texts(".fft-map-legend-max")[0]]).toEqual(["0", "1,000"]);
    const germany = all(".fft-map-region[data-step]").find((r) => r.getAttribute("aria-label")?.startsWith("Germany"));
    expect(germany?.getAttribute("data-step")).toBe("4");
  });

  test("shaded regions are keyboard stops with tooltips, arrow keys move between them, and a click selects the row", async () => {
    await draw(spec);
    // Regions come in the basemap's order: Germany, then France, then Spain.
    const regions = all(".fft-map-region[data-step]") as SVGElement[];
    expect(regions.map((r) => r.getAttribute("aria-label"))).toEqual(["Germany: 500", "France: 300", "Spain: 100"]);
    expect(regions.map((r) => r.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
    regions[1]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-title")).toEqual(["France"]);
    expect(texts(".fft-tooltip-row")).toEqual(["300Revenue"]);
    expect(target.querySelector(".fft-map-wrap")?.hasAttribute("data-active")).toBe(true);
    press(regions[0] as Element, "ArrowRight");
    expect(regions[1]?.getAttribute("tabindex")).toBe("0");
    const seen: Row[] = [];
    target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
    regions[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(seen).toEqual([{ country: "es", revenue: 100 }]);
    // Empty regions are decoration: not focusable, not announced.
    expect(all(".fft-map-region-empty").every((r) => r.getAttribute("aria-hidden") === "true" && !r.hasAttribute("tabindex"))).toBe(true);
  });

  test("a table behind the map lists every row, and the map names what it shows", async () => {
    await draw(spec);
    expect(texts(".fft-sr-only th")).toEqual(["Country", "Revenue"]);
    expect(all(".fft-sr-only tbody tr")).toHaveLength(3);
    expect(target.querySelector(".fft-map")?.getAttribute("aria-label")).toBe("Map of Revenue by Country");
  });

  test("rows that name no region are counted under the map, and validation warns about them", async () => {
    const rows = [...revenue, { country: "ZZ", revenue: 50 }];
    await draw({ rows, view: spec.view });
    expect(texts(".fft-map-note")).toEqual(["1 row could not be placed on the map."]);
    const issues = validateSpec({ data: { type: "inline", rows }, view: spec.view }, rows);
    expect(issues.map((i) => [i.level, i.message])).toEqual([["warning", "1 row names no region on the map (ZZ): check the codes against the basemap, or they stay unplaced."]]);
  });

  test("validation refuses a bad geo, lat with id, and a flipped range", () => {
    const check = (view: Record<string, unknown>) => validateSpec({ data: { type: "inline", rows: revenue }, view: { type: "choropleth", geo: "europe", id: "country", value: "revenue", ...view } }).filter((i) => i.level === "error").map((i) => i.message);
    expect(check({ geo: "atlantis" })).toEqual([expect.stringMatching(/built-in basemap/)]);
    expect(check({ lat: "y", lon: "x" })).toEqual([expect.stringMatching(/not both/), expect.stringMatching(/tile grid with no coordinates/)]);
    expect(check({ min: 10, max: 5 })).toEqual(["max must be greater than min."]);
    expect(check({})).toEqual([]);
  });

  test("an inline GeoJSON draws true shapes with ids from a property, and labels only where they fit", async () => {
    const geo: GeoCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { iso: "AA", name: "Alpha" }, geometry: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] } },
        { type: "Feature", properties: { iso: "BB", name: "Beta" }, geometry: { type: "Polygon", coordinates: [[[10, 0], [10.3, 0], [10.3, 0.3], [10, 0.3], [10, 0]]] } },
      ],
    };
    await draw({ rows: [{ zone: "AA", v: 1 }, { zone: "BB", v: 2 }], view: { type: "choropleth", geo, key: "iso", id: "zone", value: "v" } });
    expect(all(".fft-map-region")).toHaveLength(2);
    expect(target.querySelector(".fft-map")?.classList.contains("fft-map-grid")).toBe(false);
    expect(texts(".fft-map-region-label")).toEqual(["AA"]);
    expect(all(".fft-map-region[data-step]").map((r) => r.getAttribute("aria-label"))).toEqual(["Alpha: 1", "Beta: 2"]);
  });

  test("a geo address is fetched once, the skeleton shows meanwhile, and the map draws when it arrives", async () => {
    const geo: GeoCollection = { type: "FeatureCollection", features: [{ type: "Feature", id: "AA", geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } }] };
    let release: (value: GeoCollection) => void = () => {};
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => {
      release = (value) => resolve(new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } }));
    }));
    vi.stubGlobal("fetch", fetchMock);
    const spec = { rows: [{ zone: "AA", v: 3 }], view: { type: "choropleth", geo: "/maps/zones.geojson", id: "zone", value: "v" } };
    await draw(spec);
    expect(all(".fft-skeleton")).toHaveLength(1);
    expect(all(".fft-map-region")).toHaveLength(0);
    release(geo);
    await vi.waitFor(() => expect(all(".fft-map-region")).toHaveLength(1));
    expect(all(".fft-skeleton")).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // A second widget on the same address reuses the load.
    await draw(spec);
    await vi.waitFor(() => expect(all(".fft-map-region")).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("a failed fetch leaves a short note instead of a map", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("missing", { status: 404 }))));
    await draw({ rows: [{ zone: "AA", v: 3 }], view: { type: "choropleth", geo: "/maps/nowhere.geojson", id: "zone", value: "v" } });
    await vi.waitFor(() => expect(all(".fft-map-note")).toHaveLength(1));
    expect(texts(".fft-map-note")[0]).toMatch(/Could not load the map at \/maps\/nowhere.geojson: 404/);
  });
});

describe("symbols view", () => {
  const customers = [
    { state: "CA", customers: 1600, region: "West" },
    { state: "TX", customers: 400, region: "South" },
    { state: "NY", customers: 100, region: "Northeast" },
  ];
  const spec = { rows: customers, view: { type: "symbols", geo: "us-states", id: "state", size: "customers", color: "region" } };

  test("draws the land muted and one circle per row on its tile, area true to the value, biggest first", async () => {
    await draw(spec);
    expect(all(".fft-map-land")).toHaveLength(51);
    const circles = all(".fft-map-symbol") as SVGCircleElement[];
    expect(circles).toHaveLength(3);
    const radii = circles.map((c) => Number(c.getAttribute("r")));
    expect(radii[0]! > radii[1]! && radii[1]! > radii[2]!).toBe(true);
    // Sixteen times the value, four times the radius: area follows the value.
    expect(radii[0]! / radii[2]!).toBeCloseTo(4, 1);
    expect(circles.map((c) => c.getAttribute("aria-label"))).toEqual(["California: Customers 1,600, Region West", "Texas: Customers 400, Region South", "New York: Customers 100, Region Northeast"]);
  });

  test("a color field groups the circles with a key, and a size key shows the biggest circle and a quarter of it", async () => {
    await draw(spec);
    expect(texts(".fft-map-keys .fft-legend li")).toEqual(["West", "South", "Northeast"]);
    const circles = all(".fft-map-symbol") as SVGElement[];
    expect(circles.map((c) => c.style.fill)).toEqual(["var(--fft-series-1)", "var(--fft-series-2)", "var(--fft-series-3)"]);
    expect(texts(".fft-map-sizekey-text")).toEqual(["1,600", "400"]);
    expect(texts(".fft-map-sizekey-caption")).toEqual(["Customers"]);
    expect(all(".fft-map-sizekey-ring")).toHaveLength(2);
  });

  test("circles are keyboard stops with tooltips and select their row", async () => {
    await draw(spec);
    const circles = all(".fft-map-symbol") as SVGElement[];
    circles[1]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-title")).toEqual(["Texas"]);
    expect(texts(".fft-tooltip-row")).toEqual(["400Customers", "SouthRegion"]);
    const seen: Row[] = [];
    target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
    press(circles[1] as Element, "Enter");
    expect(seen).toEqual([customers[1]]);
    expect(texts(".fft-sr-only th")).toEqual(["State", "Customers", "Region"]);
  });

  test("coordinates place circles on real shapes, and a label names each in its tooltip", async () => {
    const geo: GeoCollection = { type: "FeatureCollection", features: [{ type: "Feature", id: "box", geometry: { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] } }] };
    await draw({ rows: [{ port: "Harbor", lat: 5, lon: 5, tons: 10 }, { port: "Cove", lat: 9, lon: 1, tons: 2 }], view: { type: "symbols", geo, lat: "lat", lon: "lon", size: "tons", label: "port" } });
    const circles = all(".fft-map-symbol") as SVGCircleElement[];
    expect(circles.map((c) => c.getAttribute("aria-label"))).toEqual(["Harbor: Tons 10", "Cove: Tons 2"]);
    // The harbor sits in the middle; the cove up and to the left of it.
    const [harbor, cove] = circles.map((c) => [Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))]) as [[number, number], [number, number]];
    expect([cove[0] < harbor[0], cove[1] < harbor[1]]).toEqual([true, true]);
    expect(all(".fft-map-keys .fft-legend")).toHaveLength(0);
  });

  test("validation wants id or lat and lon, not both, and no coordinates on a tile grid", () => {
    const check = (view: Record<string, unknown>) => validateSpec({ data: { type: "inline", rows: customers }, view: { type: "symbols", size: "customers", ...view } }).filter((i) => i.level === "error").map((i) => i.message);
    expect(check({ geo: "us-states" })).toEqual([expect.stringMatching(/Say where each row goes/)]);
    expect(check({ geo: "us-states", lat: "a", lon: "b" })).toEqual([expect.stringMatching(/tile grid with no coordinates/)]);
    expect(check({ geo: "us-states", id: "state", lat: "a" })).toEqual([expect.stringMatching(/not both/), expect.stringMatching(/lat and lon go together/), expect.stringMatching(/tile grid/)]);
    expect(check({ lat: "a", lon: "b" })).toEqual([expect.stringMatching(/Coordinates need a map/)]);
    expect(check({ geo: "us-states", id: "state" })).toEqual([]);
  });
});

describe("locator view", () => {
  const offices = [
    { office: "Paris", country: "FR", people: "240 people", role: "HQ" },
    { office: "Berlin", country: "DE", people: "130 people", role: "Engineering" },
    { office: "Lisbon", country: "PT", people: "85 people", role: "Engineering" },
  ];
  const spec = { rows: offices, fields: { people: { label: "Headcount" } }, view: { type: "locator", geo: "europe", id: "country", label: "office", note: "people", kind: "role" } };

  test("draws a marker and an always-on name with its note for every place, colored by kind with a key", async () => {
    await draw(spec);
    expect(all(".fft-map-land")).toHaveLength(41);
    expect(all(".fft-map-marker")).toHaveLength(3);
    expect(texts(".fft-map-place-name")).toEqual(["Paris", "Berlin", "Lisbon"]);
    expect(texts(".fft-map-place-note")).toEqual(["240 people", "130 people", "85 people"]);
    expect((all(".fft-map-marker") as SVGElement[]).map((m) => m.style.fill)).toEqual(["var(--fft-series-1)", "var(--fft-series-2)", "var(--fft-series-2)"]);
    expect(texts(".fft-legend li")).toEqual(["HQ", "Engineering"]);
  });

  test("labels never overlap each other or the markers, and stay inside the map", async () => {
    const crowded = Array.from({ length: 6 }, (_, i) => ({ office: `Site ${i + 1}`, country: ["FR", "FR", "FR", "FR", "FR", "FR"][i], role: "x" }));
    await draw({ rows: crowded, view: { type: "locator", geo: "europe", id: "country", label: "office" } });
    const width = Number(target.querySelector(".fft-map")?.getAttribute("width"));
    const height = Number(target.querySelector(".fft-map")?.getAttribute("height"));
    const boxes = (all(".fft-map-place") as SVGTextElement[]).map((t) => {
      const x = Number(t.getAttribute("x"));
      const y = Number(t.getAttribute("y")) - 10;
      const w = (t.textContent?.length ?? 0) * 6.2;
      const anchor = t.getAttribute("text-anchor");
      const left = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
      return { x: left, y, w, h: 13 };
    });
    // Six markers on one tile: not every name fits, but every drawn one is clear of the others.
    expect(boxes.length).toBeGreaterThanOrEqual(2);
    for (const a of boxes) {
      expect([a.x >= 0, a.y >= 0, a.x + a.w <= width, a.y + a.h <= height]).toEqual([true, true, true, true]);
      for (const b of boxes) if (a !== b) expect(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y).toBe(false);
    }
  });

  test("markers are keyboard stops whose tooltips carry the note and kind, and select their row", async () => {
    await draw(spec);
    const markers = all(".fft-map-marker") as SVGElement[];
    expect(markers.map((m) => m.getAttribute("aria-label"))).toEqual(["Paris: Headcount 240 people, Role HQ, Region France", "Berlin: Headcount 130 people, Role Engineering, Region Germany", "Lisbon: Headcount 85 people, Role Engineering, Region Portugal"]);
    markers[2]?.dispatchEvent(new Event("focus"));
    expect(texts(".fft-tooltip-title")).toEqual(["Lisbon"]);
    expect(texts(".fft-tooltip-row")).toEqual(["85 peopleHeadcount", "EngineeringRole", "PortugalRegion"]);
    const seen: Row[] = [];
    target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
    press(markers[2] as Element, " ");
    expect(seen).toEqual([offices[2]]);
    expect(texts(".fft-sr-only th")).toEqual(["Office", "Headcount", "Role", "Country"]);
  });

  test("without a kind, every marker takes the first color and there is no key", async () => {
    await draw({ rows: offices, view: { type: "locator", geo: "europe", id: "country", label: "office" } });
    expect(all(".fft-legend")).toHaveLength(0);
    expect(all(".fft-map-place-note")).toHaveLength(0);
    expect(new Set((all(".fft-map-marker") as SVGElement[]).map((m) => m.style.fill))).toEqual(new Set(["var(--fft-series-1)"]));
  });
});
