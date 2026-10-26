/**
 * A unit that belongs to a row, not to a field: a scorecard lists revenue, a count and a percentage in one column, so
 * no field format can carry their units. A row names its own, either in a unit column (`unit: "unit"`) or at the end
 * of its label in brackets ("Gross margin (%)"); the figures then wear it and the label drops the brackets.
 *
 * @module
 */

/** The units a row may name: a percent sign or a currency symbol. */
const UNITS = new Set(["%", "€", "$", "£", "¥", "CHF"]);
const TRAILING = /\s*\((%|€|\$|£|¥|CHF)\)\s*$/;

/** The row's name without a trailing unit in brackets, and that unit; or the unit from its unit column. */
export function rowUnit(name: string, unitValue?: unknown): { name: string; unit: string } {
  const given = typeof unitValue === "string" ? unitValue.trim() : "";
  if (given && UNITS.has(given)) return { name: name.replace(TRAILING, ""), unit: given };
  const match = TRAILING.exec(name);
  return match ? { name: name.slice(0, match.index), unit: match[1] as string } : { name, unit: "" };
}

/**
 * A formatted figure with a row's unit: "33%" ("33 %" in French and German), "€1.3M" in English, "1,3 M €" in French
 * and German. A figure that already shows the unit is left as it is.
 */
export function withUnit(text: string, unit: string, locale?: string): string {
  if (!unit || !text || text === "–" || text.includes(unit)) return text;
  const spaced = /^(fr|de)\b/i.test(locale ?? "");
  if (unit === "%") return spaced ? `${text} %` : `${text}%`;
  if (spaced || unit === "CHF") return `${text} ${unit}`;
  // A sign stays in front of the symbol: −€22K, not €−22K.
  return /^[−-]/.test(text) ? `${text[0]}${unit}${text.slice(1)}` : `${unit}${text}`;
}
