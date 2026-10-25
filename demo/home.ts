/**
 * The home page: three routes in, and a strip of three live charts drawn from the catalog's own specs (every chart
 * type has one, data built in). An old gallery address (index.html#<section>, a filter or the playground) goes on to
 * where that page lives now.
 */
import { createWidget } from "../src/index.ts";
import type { WidgetSpec } from "../src/index.ts";
import { withLook } from "./look.ts";
import { fork } from "../src/index.ts";
import { boardHref, HOME_STRIP } from "./routes.ts";

// The gallery lived here, with its sections, filters and playground in the address: send those on.
// The playground is the Editor's JSON panel now; a Taller version (#taller=<spec>) opens there too.
const hash = location.hash.slice(1);
if (hash.startsWith("taller=")) location.replace(`./editor.html?spec=${hash.slice("taller=".length)}`);
else if (hash === "playground") location.replace("./editor.html?json=1");
else if (hash) location.replace(`./dashboards.html?board=sales#${hash}`);

const catalog = import.meta.glob<WidgetSpec>("../catalog/*.json", { eager: true, import: "default" });
const byType = (type: string) => Object.entries(catalog).find(([path]) => path.endsWith(`/${type}.json`))?.[1];

const strip = document.querySelector("#strip") as HTMLElement;
const draw = () => {
  strip.replaceChildren();
  for (const { type, board, label } of HOME_STRIP) {
    const spec = byType(type);
    if (!spec) continue;
    const slot = document.createElement("div");
    slot.className = "strip-item";
    const card = document.createElement("div");
    // Each live chart leads to the dashboard tab where it lives in context.
    const link = document.createElement("a");
    link.className = "strip-link";
    link.href = boardHref(board);
    link.textContent = label;
    // Quiet, under its card: the page's own link colour, a small size, no extra chrome.
    link.style.cssText = "display:inline-block;margin:8px 0 0 2px;font-size:13px;";
    slot.append(card, link);
    strip.append(slot);
    createWidget(card, withLook(spec, fork), { actions: ["explain"] });
  }
};
draw();
// The Look menu's style: redraw the strip in it, here, without reloading.
window.addEventListener("martcharts:look", (event) => {
  event.preventDefault();
  draw();
});
