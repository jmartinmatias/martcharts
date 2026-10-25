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
