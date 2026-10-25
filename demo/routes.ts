/**
 * Small address helpers for the demo pages, kept apart from the page scripts so they can be tested.
 *
 * @module
 */

/** The Home page's live strip: each chart, from the catalog's own spec, and the dashboard tab it leads to. */
export const HOME_STRIP = [
  { type: "line", board: "sales", label: "See it on the Sales dashboard" },
  { type: "choropleth", board: "commercial", label: "See it on the Commercial cockpit" },
  { type: "donut", board: "sales", label: "See it on the Sales dashboard" },
] as const;

/** The address of a dashboard tab. */
export const boardHref = (board: string) => `./dashboards.html?board=${encodeURIComponent(board)}`;

/**
 * A board's hash with an unknown section dropped. The hash is `<section>&cf=…&f=…&p=…`; the first part, when it has
 * no "=", names a section. An old address (a section the gallery no longer has, such as #maps) must not stick: the
 * part goes, and the rest stays. `known` says whether a section id exists on the board drawn.
 */
export function cleanHash(hash: string, known: (id: string) => boolean): string {
  const parts = hash.replace(/^#/, "").split("&").filter(Boolean);
  const kept = parts.filter((part, i) => i > 0 || part.includes("=") || known(decodeURIComponent(part)));
  return kept.length ? `#${kept.join("&")}` : "";
}

/** The Dashboards page's tabs, in reading order: the key in the address, the board file's id, the page header's words. */
export const BOARD_TABS = [
  { key: "sales", board: "gallery", title: "Sales", intro: "Revenue, regions, products, customers and the pipeline, for a sales team." },
  { key: "commercial", board: "commercial-cockpit", title: "Commercial cockpit", intro: "The book at a glance, what needs attention, the pipeline and who to call, for relationship managers." },
  { key: "health", board: "client-health", title: "Client health", intro: "Every client in red, amber or green on four perspectives, against written thresholds." },
  { key: "regulatory", board: "regulatory-landscape", title: "Regulatory landscape", intro: "What is due, the pressure, whom it hits and where it binds, for a compliance officer." },
] as const;

/**
 * The place each page gives its charts' refs (`data-fft-place`), so one chart shown on two pages has two refs. The
 * Dashboards page names none: its cards keep their stored widgets' own refs, the ones the MCP server reads.
 */
export const PLACES = { home: "home", catalog: "catalog", guide: "guide", embed: "embed", editor: "editor", composer: "composer", lab: "lab", frame: "frame" } as const;
