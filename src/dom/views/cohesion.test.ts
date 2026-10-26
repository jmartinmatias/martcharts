// @vitest-environment jsdom
/**
 * Fixes from the site's cohesion audit: number tiles that line up row by row, titles that use the card's width,
 * bars without stray tracks, figures that keep their units, bullet bands that read in the dark, and a first series
 * that keeps its color whatever the look.
 */
import { afterEach, describe, expect, test } from "vitest";
import { getPreset } from "../../core/presets.ts";
import { rowUnit, withUnit } from "../../core/row-unit.ts";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { BASE_CSS } from "../styles.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
  document.body.innerHTML = "";
});

async function drawAt(spec: Omit<WidgetSpec, "data"> & { rows: Row[] }, width = 600) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
  const target = document.createElement("div");
  document.body.append(target);
  const { rows, ...rest } = spec;
  await createWidget(target, { locale: "en-US", data: { type: "inline", rows }, ...rest } as WidgetSpec).ready;
  return target;
}

const flat = BASE_CSS.replace(/\s+/g, " ");

describe("number tiles", () => {
  test("every row of tiles starts flush: the divider is clipped at each row's start, not only the first tile's", () => {
    expect(flat).toMatch(/\.fft-stats \{[^}]*margin-left: -22px; clip-path: inset\(-21px -21px -21px 22px\);/);
    expect(flat).not.toMatch(/\.fft-stat:first-child \{/);
  });

  test("a long label takes two lines instead of an ellipsis, and then every label in the strip takes two, so figures stay level", async () => {
    expect(flat).toMatch(/\.fft-stat-label \{[^}]*-webkit-line-clamp: 2;/);
    expect(flat).not.toMatch(/\.fft-stat-label \{[^}]*text-overflow: ellipsis/);
    const row = { aum: 1.8e9, revenue: 8.5e6, money: 1.05e7, open: 35, potential: 3.6e6 };
    const view = { type: "kpis", items: [{ value: "aum", label: "Assets under management" }, { value: "revenue", label: "Revenue, year to date" }, { value: "money", label: "Net new money" }, { value: "open", label: "Clients with an open opportunity" }, { value: "potential", label: "Cross-sell potential" }] };
    const phone = await drawAt({ rows: [row], view } as never, 315);
    expect(phone.querySelector(".fft-stats")?.hasAttribute("data-two-lines")).toBe(true);
    document.body.innerHTML = "";
    const short = await drawAt({ rows: [{ a: 1, b: 2 }], view: { type: "kpis", items: [{ value: "a", label: "Leads" }, { value: "b", label: "Wins" }] } } as never, 900);
    expect(short.querySelector(".fft-stats")?.hasAttribute("data-two-lines")).toBe(false);
  });
});

describe("titles", () => {
  test("a title uses the card's full width; only touch screens, where the toolbar always shows, keep room for it", () => {
    expect(flat).not.toMatch(/(^|\}) ?\.fft-widget\[data-actions\] \.fft-title \{ padding-right: 89px; \}/);
    expect(flat).toMatch(/@media \(hover: none\) \{ \.fft-widget\[data-actions\] \.fft-title \{ padding-right: 89px; \}/);
    // The toolbar floats over the title's end on a backing the look sets (glass: its near-opaque popover).
    expect(flat).toMatch(/\.fft-widget\[data-actions\] \.fft-actions \{[^}]*background: var\(--fft-toolbar-bg, var\(--fft-surface\)\)/);
    expect(getPreset("glass")?.css).toContain("--fft-toolbar-bg: var(--fft-popover)");
  });
});

describe("units that belong to a row", () => {
  test("a row's unit comes from its unit column or from a bracket at the end of its name", () => {
    expect([rowUnit("Gross margin (%)"), rowUnit("Revenue", "€"), rowUnit("New customers")]).toEqual([
      { name: "Gross margin", unit: "%" },
      { name: "Revenue", unit: "€" },
      { name: "New customers", unit: "" },
    ]);
    expect([withUnit("33", "%", "en-US"), withUnit("1.3M", "€", "en-US"), withUnit("−22K", "€", "en-US"), withUnit("1,3 M", "€", "fr-FR"), withUnit("33", "%", "de-DE"), withUnit("€1.3M", "€")]).toEqual([
      "33%", "€1.3M", "−€22K", "1,3 M €", "33 %", "€1.3M",
    ]);
  });

  test("a scorecard of mixed measures shows each figure in its own unit, and drops the bracket from the name", async () => {
    const rows = [
      { kpi: "Revenue", unit: "€", actual: 1284000, target: 1300000 },
      { kpi: "New customers", unit: "", actual: 66, target: 60 },
      { kpi: "Gross margin (%)", unit: "", actual: 33, target: 30 },
    ];
    const card = await drawAt({ rows, fields: { actual: { format: { type: "number", compact: true } }, target: { format: { type: "number", compact: true } } }, view: { type: "bullet", label: "kpi", value: "actual", target: "target", unit: "unit" } });
    const numbers = [...card.querySelectorAll(".fft-bullet-number")].map((node) => node.textContent);
    const names = [...card.querySelectorAll(".fft-bullet-label")].map((node) => node.textContent);
    expect([numbers, names]).toEqual([["€1.3M", "66", "33%"], ["Revenue", "New customers", "Gross margin"]]);
    // What is left to go is said in the row's unit too.
    expect(card.querySelector(".fft-bullet")?.getAttribute("aria-label")).toMatch(/€16K/);
  });
});

describe("bullet bands", () => {
  test("poor, fair and good step further apart on a dark card than on a light one", () => {
    const dark = /--fft-band-1: (\d+)%;\s*--fft-band-2: (\d+)%;\s*--fft-band-3: (\d+)%;/g;
    const [light, night] = [...BASE_CSS.matchAll(dark)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
    // The DARK block comes first in the file.
    expect(light && night).toBeTruthy();
    const steps = (bands: number[]) => Math.min((bands[0] ?? 0) - (bands[1] ?? 0), (bands[1] ?? 0) - (bands[2] ?? 0));
    expect(Math.max(steps(light ?? []), steps(night ?? []))).toBeGreaterThanOrEqual(10);
    expect(flat).toMatch(/\.fft-bullet-band\[data-band="1"\] \{ fill: color-mix\(in srgb, var\(--fft-text\) var\(--fft-band-1, 18%\), transparent\); \}/);
  });
});

describe("series colors across looks", () => {
  test("the first series is blue in every look, light and dark, so revenue keeps its color when the look changes", () => {
    const hue = (hex: string | undefined) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt((hex ?? "#000000").slice(i, i + 2), 16) / 255) as [number, number, number];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min || 1;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    for (const name of ["glass", "airy", "paper"]) {
      const preset = getPreset(name);
      for (const first of [preset?.palette?.[0], preset?.dark?.palette?.[0]]) {
        const h = hue(first);
        expect([name, first, h > 195 && h < 235]).toEqual([name, first, true]);
      }
    }
  });
});
