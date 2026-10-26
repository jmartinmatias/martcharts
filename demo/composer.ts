/**
 * The composer page: a thin shell around `createComposer`. A few of the gallery's widgets are offered as examples
 * beside the charts saved in this browser (from the editor's "Add to dashboard"). Opened with `#view=1`, the page
 * shows the composed dashboard alone, as a page to share.
 */
import { createComposer, createDashboard } from "../src/index.ts";
import { boardFromHash } from "../src/kit.ts";
import type { WidgetSpec } from "../src/index.ts";
import { PLACES } from "./routes.ts";
import { lookStyle, siteLocale } from "./look.ts";

const stored = import.meta.glob<WidgetSpec>("../widgets/*.json", { eager: true, import: "default" });
const byId: Record<string, WidgetSpec> = {};
for (const spec of Object.values(stored)) if (spec.id) byId[spec.id] = spec;
/** A handful of the gallery's widgets that share fields (region, month), so a first board has filters to offer. */
const EXAMPLES = ["revenue-kpi", "revenue-by-region", "region-trends", "region-targets", "top-customers", "product-share"];
const examples: Record<string, WidgetSpec> = {};
for (const id of EXAMPLES) if (byId[id]) examples[byId[id].title ?? id] = byId[id];

const $ = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T;

// ---- The composer, or the composed board as a page ----
// Charts composed here carry the Composer's refs, apart from the same widgets on the worked dashboards.
document.body.dataset.fftPlace = PLACES.composer;
const address = boardFromHash(location.hash);
if (address.view && address.spec) {
  document.body.dataset.view = "";
  document.title = `${address.spec.title || "Dashboard"} · martcharts`;
  const locale = siteLocale();
  const page = createDashboard($("#page-view"), address.spec, { actions: ["info", "expand", "explain", "csv", "image"], ...(locale ? { locale } : {}) });
  const style = lookStyle();
  if (style) void page.setOverride({ style });
  // The Look menu's style: restyle the page in place.
  window.addEventListener("martcharts:look", (event) => {
    event.preventDefault();
    void page.setOverride({ style: lookStyle() ?? { preset: "default" } });
  });
} else {
  // The preview draws in the site's Look, as the dashboards do, and follows the Look menu without a reload.
  const composer = createComposer($("#composer"), {
    // The composer's own words in the site's language, from the first draw (the page's lang is set once it has loaded).
    locale: siteLocale() ?? "en-US",
    examples,
    embedHref: new URL("examples/embed.html", location.href).href,
    previewStyle: lookStyle,
    previewLocale: siteLocale,
  });
  // The Look menu's style: redraw the preview, here, without reloading.
  window.addEventListener("martcharts:look", (event) => {
    event.preventDefault();
    void composer.restyle();
  });
  // A new language: the composer's own words were written in the old one, so the page reloads; the board is kept in
  // the address and saved, so nothing is lost.
  window.addEventListener("martcharts:lang", (event) => {
    event.preventDefault();
    location.reload();
  });
}
