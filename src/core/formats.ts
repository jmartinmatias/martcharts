/**
 * Built-in formats. Each turns one present value into text; missing values
 * (null, undefined, NaN) never reach them and always display as empty text.
 *
 * @module
 */
import type { FormatBlock } from "./registry.ts";
import type { FormatSpec } from "./types.ts";
import { ragOf, ragShape, ragShapePath, ragWord } from "./rag.ts";
import type { Rag } from "./rag.ts";

/** Reads a number from a number or from text that is exactly a number. Anything else gives null. */
export function readNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && /^\s*-?\d+(\.\d+)?(e[+-]?\d+)?\s*$/i.test(value)) return Number(value);
  return null;
}

function fractionDigits(decimals: unknown): Intl.NumberFormatOptions {
  return typeof decimals === "number" ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : {};
}

function compactOptions(compact: unknown, places?: unknown): Intl.NumberFormatOptions {
  if (!compact) return {};
  // A column's shared places (from its column context), so its figures line up: €214.0K above €188.5K, never €214K.
  return typeof places === "number" ? { notation: "compact", minimumFractionDigits: places, maximumFractionDigits: places } : { notation: "compact", maximumFractionDigits: 1 };
}

function numeric(value: unknown, locale: string | undefined, options: Intl.NumberFormatOptions): string {
  const n = readNumber(value);
  return n === null ? String(value) : new Intl.NumberFormat(locale, options).format(n);
}

const number: FormatBlock = {
  type: "number",
  description: "Plain number with locale grouping, for example 1,234.5.",
  options: {
    decimals: { type: "number", description: "Exact number of decimal places." },
    compact: { type: "boolean", default: false, description: "Shorten large numbers: 1.2K, 3.4M." },
  },
  // The decimals asked for win over the compact default of one.
  format: (value, o, locale) => numeric(value, locale, { ...compactOptions(o.compact, o.decimals === undefined ? o.places : undefined), ...fractionDigits(o.decimals) }),
};

const currency: FormatBlock = {
  type: "currency",
  description: "Money with a currency symbol, for example €1,234.50.",
  options: {
    currency: { type: "string", default: "USD", description: "ISO 4217 code, for example EUR, USD, GBP." },
    decimals: { type: "number", description: "Exact number of decimal places. Defaults to the currency's usual places." },
    compact: { type: "boolean", default: false, description: "Shorten large amounts: $4.2M." },
  },
  format: (value, o, locale) =>
    numeric(value, locale, {
      style: "currency",
      currency: typeof o.currency === "string" ? o.currency : "USD",
      ...compactOptions(o.compact, o.decimals === undefined ? o.places : undefined),
      ...fractionDigits(o.decimals),
    }),
};

const percent: FormatBlock = {
  type: "percent",
  description: "A ratio shown as a percentage: 0.25 becomes 25%.",
  options: {
    decimals: { type: "number", default: 0, description: "Decimal places in the percentage." },
  },
  format: (value, o, locale) => numeric(value, locale, { style: "percent", ...fractionDigits(o.decimals) }),
};

const DATE_STYLES: Record<string, Intl.DateTimeFormatOptions> = {
  short: { dateStyle: "short" },
  medium: { dateStyle: "medium" },
  long: { dateStyle: "long" },
  day: { month: "short", day: "numeric" },
  month: { month: "short", year: "numeric" },
  year: { year: "numeric" },
};

const date: FormatBlock = {
  type: "date",
  description: "A date from an ISO string (2026-03-05), a timestamp in milliseconds, or a Date.",
  options: {
    style: { type: "enum", values: Object.keys(DATE_STYLES), default: "medium", description: "short 3/5/26, medium Mar 5, 2026, long March 5, 2026, day Mar 5, month Mar 2026, year 2026." },
  },
  format(value, o, locale) {
    const parsed = value instanceof Date ? value : typeof value === "number" || typeof value === "string" ? new Date(value) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return String(value);
    // A bare date such as 2026-03-05 means that calendar day everywhere, so show it in UTC.
    const dateOnly = typeof value === "string" && /^\d{4}-\d{2}(-\d{2})?$/.test(value);
    const style = DATE_STYLES[String(o.style ?? "medium")] ?? DATE_STYLES.medium;
    return new Intl.DateTimeFormat(locale, { ...style, ...(dateOnly ? { timeZone: "UTC" } : {}) }).format(parsed);
  },
};

const TONES = ["positive", "warning", "negative", "neutral", "accent"] as const;

const badge: FormatBlock = {
  type: "badge",
  description: "A status pill in tables and lists, toned by value, for example Complete in green and On going in amber. Plain text elsewhere.",
  options: {
    tones: {
      type: "object",
      description: 'Tone per value: positive, warning, negative, neutral or accent. Example: { "Complete": "positive", "On going": "warning" }.',
    },
    tone: { type: "enum", values: TONES, default: "neutral", description: "Tone for values not listed in tones." },
  },
  validate(spec) {
    const tones = spec.tones;
    if (!tones || typeof tones !== "object") return [];
    return Object.entries(tones as Record<string, unknown>)
      .filter(([, tone]) => !TONES.includes(tone as (typeof TONES)[number]))
      .map(([value]) => `tones["${value}"] must be one of ${TONES.join(", ")}.`);
  },
  format: (value) => String(value),
  element(value, options, _locale, doc) {
    const text = String(value);
    const tones = (options.tones ?? {}) as Record<string, string>;
    const pill = doc.createElement("span");
    pill.className = "fft-badge";
    pill.dataset.tone = tones[text] ?? (typeof options.tone === "string" ? options.tone : "neutral");
    const dot = doc.createElement("span");
    dot.className = "fft-badge-dot";
    dot.setAttribute("aria-hidden", "true");
    pill.append(dot, text);
    return pill;
  },
};

const SVG_NS = "http://www.w3.org/2000/svg";

const spark: FormatBlock = {
  type: "spark",
  description: "A tiny trend drawn in a table or list cell from a list of numbers, latest point marked. Plain text elsewhere: first → last.",
  options: {
    kind: { type: "enum", values: ["line", "bar"], default: "line", description: "line for a trend, bar for mini columns." },
  },
  format(value) {
    if (!Array.isArray(value)) return String(value);
    const numbers = value.map(readNumber).filter((n): n is number => n !== null);
    return numbers.length ? `${numbers[0]} → ${numbers[numbers.length - 1]}` : "";
  },
  element(value, options, _locale, doc) {
    if (!Array.isArray(value)) {
      const span = doc.createElement("span");
      span.textContent = String(value);
      return span;
    }
    const values = value.map(readNumber);
    const numbers = values.filter((n): n is number => n !== null);
    const width = 55;
    const height = 21;
    const pad = 3;
    const make = (tag: string, attrs: Record<string, string | number>) => {
      const node = doc.createElementNS(SVG_NS, tag);
      for (const [name, v] of Object.entries(attrs)) node.setAttribute(name, String(v));
      return node;
    };
    const chart = make("svg", { class: "fft-spark", width, height, viewBox: `0 0 ${width} ${height}`, role: "img" });
    chart.setAttribute("aria-label", numbers.length ? `Trend from ${numbers[0]} to ${numbers[numbers.length - 1]}` : "No trend");
    if (numbers.length === 0) return chart;
    const kind = options.kind === "bar" ? "bar" : "line";
    const low = kind === "bar" ? Math.min(0, ...numbers) : Math.min(...numbers);
    const high = Math.max(...numbers);
    const span = high - low || 1;
    const yOf = (n: number) => height - pad - ((n - low) / span) * (height - pad * 2);
    if (kind === "bar") {
      const slot = (width - pad * 2) / values.length;
      values.forEach((n, i) => {
        if (n === null) return;
        const top = Math.min(yOf(n), yOf(Math.max(low, 0)));
        chart.append(make("rect", { x: pad + i * slot, y: top, width: Math.max(1, slot - 1), height: Math.max(1, Math.abs(yOf(n) - yOf(Math.max(low, 0)))), rx: 1 }));
      });
      return chart;
    }
    const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
    let d = "";
    let pen = false;
    let last: { x: number; y: number } | null = null;
    values.forEach((n, i) => {
      if (n === null) {
        pen = false;
        return;
      }
      last = { x: pad + i * step, y: yOf(n) };
      d += `${pen ? "L" : "M"}${Math.round(last.x * 100) / 100},${Math.round(last.y * 100) / 100}`;
      pen = true;
    });
    chart.append(make("path", { d }));
    const end = last as { x: number; y: number } | null;
    if (end) chart.append(make("circle", { cx: end.x, cy: end.y, r: 2 }));
    return chart;
  },
};

const text: FormatBlock = {
  type: "text",
  description: "The value as plain text, unchanged.",
  options: {},
  format: (value) => String(value),
};

const bar: FormatBlock = {
  type: "bar",
  description: "A slim bar beside the number in a table or list cell, scaled to the largest value in the column (or to max), so a column of figures reads at a glance. Negative values take the down color. Plain number elsewhere.",
  options: {
    max: { type: "number", description: "Value of a full bar. Defaults to the largest absolute value in the column." },
    format: { type: "any", description: 'Built-in format for the number itself (number, currency, percent, date or text), for example { "type": "currency", "currency": "EUR" }. Defaults to a short number.' },
  },
  format(value, options, locale) {
    // The inner format resolves among this file's built-in formats: importing the display layer here would loop back through the registry.
    const spec = (options.format as FormatSpec | undefined) ?? { type: "number", compact: true };
    const { type, ...inner } = typeof spec === "string" ? { type: spec } : spec;
    const block = [number, currency, percent, date, text].find((b) => b.type === type) ?? number;
    return block.format(value, typeof options.places === "number" ? { places: options.places, ...inner } : inner, locale);
  },
  element(value, options, locale, doc) {
    const amount = readNumber(value);
    const max = typeof options.max === "number" && options.max > 0 ? options.max : Math.abs(amount ?? 0) || 1;
    const share = amount === null ? 0 : Math.min(1, Math.abs(amount) / max);
    const cell = doc.createElement("span");
    cell.className = "fft-cell-bar";
    if (amount !== null && amount < 0) cell.dataset.negative = "";
    const track = doc.createElement("span");
    track.className = "fft-cell-bar-track";
    track.setAttribute("aria-hidden", "true");
    const fill = doc.createElement("span");
    fill.className = "fft-cell-bar-fill";
    fill.style.width = `${Math.round(share * 1000) / 10}%`;
    track.append(fill);
    const text = doc.createElement("span");
    text.className = "fft-cell-bar-value";
    text.textContent = bar.format(value, options, locale);
    if (typeof options.chars === "number") text.style.minWidth = `${options.chars}ch`;
    cell.append(track, text);
    return cell;
  },
};

const delta: FormatBlock = {
  type: "delta",
  description: "A signed change for a table or list cell: an arrow and a sign, colored good or bad, so color is never the only signal. A percent with one decimal by default; goodWhen down suits costs and churn. Plain signed text elsewhere.",
  options: {
    format: { type: "any", description: 'Built-in format for the number (number, currency or percent), for example { "type": "currency", "currency": "EUR" }. Defaults to a percent with one decimal.' },
    goodWhen: { type: "enum", values: ["up", "down"], default: "up", description: 'Whether a rise is good ("up", as for revenue) or bad ("down", as for costs).' },
  },
  format(value, options, locale) {
    const amount = readNumber(value);
    if (amount === null) return String(value ?? "");
    const spec = (options.format as FormatSpec | undefined) ?? { type: "percent", decimals: 1 };
    const { type, ...inner } = typeof spec === "string" ? { type: spec } : spec;
    const block = [number, currency, percent].find((b) => b.type === type) ?? percent;
    const text = block.format(Math.abs(amount), inner, locale);
    return amount > 0 ? `+${text}` : amount < 0 ? `\u2212${text}` : text;
  },
  element(value, options, locale, doc) {
    const amount = readNumber(value);
    const cell = doc.createElement("span");
    cell.className = "fft-delta-cell";
    const sign = options.goodWhen === "down" ? -1 : 1;
    cell.dataset.tone = amount === null || amount === 0 ? "even" : amount * sign > 0 ? "good" : "bad";
    if (amount) {
      const arrow = doc.createElement("span");
      arrow.className = "fft-delta-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = amount > 0 ? "\u25B2" : "\u25BC";
      cell.append(arrow);
    }
    cell.append(delta.format(value, options, locale));
    return cell;
  },
};

const heat: FormatBlock = {
  type: "heat",
  description: "A number tinted on the seven-step sequential scale by its place between the lowest and highest value, for heat tables. Every heat column in a table shares one range, unless min and max fix it. Plain number elsewhere.",
  options: {
    min: { type: "number", description: "Value of the lightest step. Defaults to the lowest value across the table's heat columns." },
    max: { type: "number", description: "Value of the darkest step. Defaults to the highest value across the table's heat columns." },
    format: { type: "any", description: "Built-in format for the number (number, currency or percent). Defaults to number." },
  },
  format(value, options, locale) {
    const spec = (options.format as FormatSpec | undefined) ?? "number";
    const { type, ...inner } = typeof spec === "string" ? { type: spec } : spec;
    const block = [number, currency, percent].find((b) => b.type === type) ?? number;
    return block.format(value, inner, locale);
  },
  element(value, options, locale, doc) {
    const amount = readNumber(value);
    const min = typeof options.min === "number" ? options.min : (amount ?? 0);
    const max = typeof options.max === "number" ? options.max : (amount ?? 0);
    const cell = doc.createElement("span");
    cell.className = "fft-heat-cell";
    if (amount !== null) {
      // The same seven steps as the heatmap view: low values step 1, high values step 7.
      const t = max === min ? 0.5 : (amount - min) / (max - min);
      cell.dataset.step = String(Math.min(7, Math.max(1, Math.floor(t * 7) + 1)));
    }
    cell.textContent = heat.format(value, options, locale);
    return cell;
  },
};

/** A status's shape as a 12px SVG, colored by the status's token; hidden from screen readers, which read the words. */
export function ragGlyph(doc: Document, status: Rag, shapes?: unknown, size = 12): SVGSVGElement {
  const glyph = doc.createElementNS(SVG_NS, "svg") as SVGSVGElement;
  glyph.setAttribute("class", "fft-rag-glyph");
  glyph.setAttribute("width", String(size));
  glyph.setAttribute("height", String(size));
  glyph.setAttribute("viewBox", `0 0 ${size} ${size}`);
  glyph.setAttribute("aria-hidden", "true");
  glyph.setAttribute("data-rag", status);
  const shape = ragShape(status, shapes);
  const path = doc.createElementNS(SVG_NS, "path");
  path.setAttribute("d", ragShapePath(shape, size));
  path.setAttribute("data-shape", shape);
  glyph.append(path);
  return glyph;
}

/**
 * A RAG status as a pill: its shape (a filled circle for G, a triangle for A, a square for R, a hollow circle for no
 * data), its words and its color, so the status never rests on color alone.
 */
const ragFormat: FormatBlock = {
  type: "rag",
  description:
    "A RAG status (R, A, G, or N for no data; red, amber, green and grey also read) as a pill with its shape, its words and its color: On track with a filled circle, At risk with a triangle, Off track with a square, No data with a hollow circle. compact keeps only the shape, with the words in its label. Plain words elsewhere.",
  options: {
    compact: { type: "boolean", default: false, description: "Only the shape, for dense tables; the words stay in its label and tooltip." },
    words: { type: "object", description: 'Words per status, keyed R, A, G, N. Example: { "G": "Healthy", "A": "Watch", "R": "Escalate" }.' },
    shapes: { type: "object", description: "Shape per status, keyed R, A, G, N: circle, triangle, square, ring or diamond." },
  },
  format: (value, options, locale) => ragWord(ragOf(value), options.words, locale),
  element(value, options, locale, doc) {
    const status = ragOf(value);
    const word = ragWord(status, options.words, locale);
    const pill = doc.createElement("span");
    pill.className = "fft-rag-pill";
    pill.dataset.rag = status;
    pill.append(ragGlyph(doc, status, options.shapes));
    if (options.compact) {
      pill.dataset.compact = "";
      pill.setAttribute("role", "img");
      pill.setAttribute("aria-label", word);
      pill.title = word;
    } else {
      const text = doc.createElement("span");
      text.className = "fft-rag-word";
      text.textContent = word;
      pill.append(text);
    }
    return pill;
  },
};

export const builtinFormats: FormatBlock[] = [number, currency, percent, date, badge, spark, text, bar, delta, heat, ragFormat];
