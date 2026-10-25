/**
 * Short, stable refs for widgets: "W-" and four characters hashed from the
 * widget's id. Shown faintly on each card, they are easy to say, type and
 * search for ("W-7Q2K looks off"), and the MCP server takes them in place of
 * ids. Crockford's base 32 leaves out I, L, O and U, so a ref read aloud or
 * copied by hand never confuses 1 with I or 0 with O.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** A widget ref such as W-7Q2K, in either case. */
export const WIDGET_REF = /^[Ww]-[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{4}$/;

/** The ref for a widget id: the same id always gives the same ref (FNV-1a hash, 20 bits). */
export function widgetRef(id: string): string {
  let hash = 0x811c9dc5;
  for (const char of id) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  let code = "";
  for (let k = 0; k < 4; k++) {
    code += ALPHABET[hash & 31];
    hash >>>= 5;
  }
  return `W-${code}`;
}

/**
 * Where a chart sits decides its ref as much as what it is: the same widget on the catalog, on Home and on a board is
 * three charts to talk about, so it carries three refs. A page names its place (`data-fft-place="catalog"`) and each
 * chart its key there (its id, else its title); the ref is the hash of both. With no place, the ref is the widget's
 * own, `widgetRef(id)`: the dashboards, where the stored widgets live, keep those, and the MCP server reads them.
 */
export function placedRef(place: string | undefined, key: string | undefined): string {
  if (!key) return "";
  return place ? widgetRef(`${place}#${key}`) : widgetRef(key);
}

/** A chart's key in its place: its id, else its title, else its chart type. */
export function refKey(spec: { id?: string; title?: string; view?: { type?: string } }): string | undefined {
  return spec.id || spec.title || spec.view?.type || undefined;
}
