/**
 * The composer page: a thin shell around `createComposer`. A few of the gallery's widgets are offered as examples
 * beside the charts saved in this browser (from the editor's "Add to dashboard"). Opened with `#view=1`, the page
 * shows the composed dashboard alone, as a page to share.
 */
import { createComposer, createDashboard } from "../src/index.ts";
import { boardFromHash } from "../src/kit.ts";
import type { WidgetSpec } from "../src/index.ts";
import { PLACES } from "./routes.ts";

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
  createDashboard($("#page-view"), address.spec, { actions: ["info", "expand", "explain", "csv", "image"] });
} else {
  createComposer($("#composer"), { examples, embedHref: new URL("examples/embed.html", location.href).href });
}
