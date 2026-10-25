/**
 * The composer page: a thin shell around `createComposer`. A few of the gallery's widgets are offered as examples
 * beside the charts saved in this browser (from the editor's "Add to dashboard"). Opened with `#view=1`, the page
 * shows the composed dashboard alone, as a page to share.
 */
import { boardFromHash, createComposer, createDashboard } from "../src/index.ts";
import type { WidgetSpec } from "../src/index.ts";
import { look, setLook } from "./look.ts";

const stored = import.meta.glob<WidgetSpec>("../widgets/*.json", { eager: true, import: "default" });
const byId: Record<string, WidgetSpec> = {};
for (const spec of Object.values(stored)) if (spec.id) byId[spec.id] = spec;
/** A handful of the gallery's widgets that share fields (region, month), so a first board has filters to offer. */
const EXAMPLES = ["revenue-kpi", "revenue-by-region", "region-trends", "region-targets", "top-customers", "product-share"];
const examples: Record<string, WidgetSpec> = {};
for (const id of EXAMPLES) if (byId[id]) examples[byId[id].title ?? id] = byId[id];

const $ = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T;

// ---- Theme ----
const themeGroup = $("#theme");
for (const b of themeGroup.querySelectorAll<HTMLButtonElement>("button")) {
  b.setAttribute("aria-pressed", String((look().theme ?? "auto") === b.dataset.value));
  b.addEventListener("click", () => {
    for (const other of themeGroup.querySelectorAll("button")) other.setAttribute("aria-pressed", String(other === b));
    setLook({ theme: b.dataset.value });
  });
}

// ---- The composer, or the composed board as a page ----
const address = boardFromHash(location.hash);
if (address.view && address.spec) {
  document.body.dataset.view = "";
  document.title = `${address.spec.title || "Dashboard"}: FFT Widgets`;
  createDashboard($("#page-view"), address.spec, { actions: ["info", "expand", "explain", "csv", "image"] });
} else {
  createComposer($("#composer"), { examples });
}
