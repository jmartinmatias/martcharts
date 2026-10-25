/**
 * The editor page: a thin shell around `createEditor`. The catalog's specs give the chart-type grid its live
 * thumbnails, the demo's data files are the samples, and the site's look (theme, preset) applies to the live chart.
 */
import { createEditor } from "../src/index.ts";
import type { WidgetSpec } from "../src/index.ts";
import { look, setLook } from "./look.ts";

/** One self-contained spec per view, written by `npm run catalog`. */
const catalog = import.meta.glob<WidgetSpec>("../catalog/*.json", { eager: true, import: "default" });
const examples: Record<string, WidgetSpec> = {};
for (const [path, spec] of Object.entries(catalog)) {
  const type = path.split("/").pop()?.replace(/\.json$/, "");
  if (type) examples[type] = spec;
}

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

// ---- The editor ----
createEditor($("#editor"), {
  examples,
  samples: [
    { label: "Tickets by team", url: "/examples/tickets.csv" },
    { label: "Monthly revenue", url: "/data/monthly.json" },
    { label: "Customers", url: "/data/customers.json" },
    { label: "Daily orders", url: "/data/daily-orders.json" },
    { label: "Sales by region and product", url: "/data/sales.json" },
  ],
  srcOf: (spec) => `widgets/${spec.id ?? "chart"}.json`,
  // The published site serves the embed page with the drop-in examples; a full address, so the code works anywhere.
  embedHref: new URL("examples/embed.html", location.href).href,
});
