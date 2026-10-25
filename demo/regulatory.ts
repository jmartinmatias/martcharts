/**
 * The regulatory landscape page: dashboards/regulatory-landscape.json drawn with createDashboard, every widget from
 * widgets/regulatory/*.json. The page's theme switch and the look picked on any page apply to every card.
 */
import { createDashboard } from "../src/index.ts";
import type { DashboardSpec, WidgetSpec } from "../src/index.ts";
import { look, lookStyle, setLook } from "./look.ts";
import landscape from "../dashboards/regulatory-landscape.json";

const stored = import.meta.glob<WidgetSpec>("../widgets/regulatory/*.json", { eager: true, import: "default" });
const widgets: Record<string, WidgetSpec> = {};
for (const spec of Object.values(stored)) if (spec.id) widgets[spec.id] = spec;

const board = createDashboard(document.querySelector("#board") as HTMLElement, landscape as DashboardSpec, {
  widgets,
  actions: ["info", "expand", "explain", "csv", "image"],
  // The filter row stays pinned while the long page scrolls, and the chosen section lives in the address.
  sticky: true,
  hash: true,
});
const style = lookStyle();
if (style) void board.setOverride({ style });

// The theme switch: the page and every chart follow it.
const buttons = [...document.querySelectorAll<HTMLButtonElement>("#theme button")];
const press = (value: string) => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === value)));
press(look().theme ?? "auto");
for (const b of buttons) {
  b.addEventListener("click", () => {
    setLook({ theme: b.dataset.value });
    press(b.dataset.value ?? "auto");
  });
}
