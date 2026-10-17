/**
 * Forking: make a new widget from an existing one by saying only what changes.
 *
 * Follows JSON Merge Patch rules (RFC 7396), so the same override works from
 * JavaScript, from a JSON file, and from the MCP server:
 *
 * - plain objects merge key by key, recursively
 * - arrays and every other value replace the base value
 * - `null` removes the key
 * - `undefined` leaves the base value alone
 *
 * @module
 */

/** A deep partial of `T` where any key may also be `null` (to remove it). */
export type Override<T> = T extends readonly unknown[]
  ? T | null
  : T extends (...args: never[]) => unknown
    ? T | null
    : T extends object
      ? { [K in keyof T]?: Override<T[K]> | null } & Record<string, unknown>
      : T | null;

/**
 * Returns a new object: `base` with each override applied left to right.
 * Neither `base` nor the overrides are modified, and the result shares no
 * plain objects or arrays with them.
 *
 * @example
 * const revenueTable = { title: "Revenue", data, view: { type: "table" } };
 * const revenueBars = fork(revenueTable, { view: { type: "bar", x: "region", y: "revenue" } });
 */
export function fork<T extends object>(base: T, ...overrides: Array<Override<T> | Record<string, unknown>>): T {
  let result = clone(base) as Record<string, unknown>;
  for (const override of overrides) {
    result = merge(result, override as Record<string, unknown>);
  }
  return result as T;
}

function merge(target: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (value === null) {
      delete out[key];
    } else if (isPlainObject(value)) {
      const current = out[key];
      out[key] = merge(isPlainObject(current) ? current : {}, value);
    } else {
      out[key] = clone(value);
    }
  }
  return out;
}

function clone(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clone);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = clone(item);
    return out;
  }
  return value;
}

/** True for `{}` literals and `Object.create(null)`, false for arrays, dates, class instances and functions. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
