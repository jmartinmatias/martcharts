/**
 * Getting data and pictures out of a widget: CSV and tab-separated text, file
 * downloads, and a PNG of a chart with its colors baked in.
 *
 * @module
 */
import type { Row } from "../core/types.ts";
import { WORDS_EN } from "../core/words.ts";

/** Actions a host can offer on a widget. */
export type WidgetAction = "csv" | "image" | "svg" | "copy" | "expand" | "explain" | "info";

function isMissing(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "number" && Number.isNaN(value));
}

/**
 * Writes rows as delimited text: a header of labels, then raw values (not
 * display formats, so numbers stay numbers in a spreadsheet). Lists and
 * objects are written as JSON. Cells holding the separator, quotes or line
 * breaks are quoted. Lines end with CRLF, as spreadsheets expect.
 */
export function toDelimited(rows: Row[], label: (field: string) => string, separator: string): string {
  const fields: string[] = [];
  for (const row of rows) for (const key of Object.keys(row)) if (!fields.includes(key)) fields.push(key);
  const cell = (value: unknown) => {
    if (isMissing(value)) return "";
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return /["\r\n\t]/.test(text) || text.includes(separator) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [fields.map((field) => cell(label(field))), ...rows.map((row) => fields.map((field) => cell(row[field])))];
  return `${lines.map((line) => line.join(separator)).join("\r\n")}\r\n`;
}

/** Saves a blob as a file through a temporary download link. */
export function download(doc: Document, filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = doc.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A file-safe name from a widget id or title. */
export function slug(text: string | undefined): string {
  const base = (text ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base || "widget";
}

const STYLE_PROPS = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity", "font-family", "font-size", "font-weight", "display"];

/**
 * Turns a chart's SVG into a PNG at `scale` times its size, on the widget's
 * background. Styles come from CSS custom properties, which an exported file
 * cannot see, so every element's computed paint is written inline first.
 */
export async function svgToPng(chart: SVGSVGElement, background: string, scale = 2): Promise<Blob> {
  const doc = chart.ownerDocument;
  const view = doc.defaultView as Window;
  const clone = chart.cloneNode(true) as SVGSVGElement;
  const originals = [chart, ...chart.querySelectorAll("*")];
  const copies = [clone, ...clone.querySelectorAll("*")];
  originals.forEach((original, i) => {
    const copy = copies[i] as SVGElement | undefined;
    if (!copy) return;
    const computed = view.getComputedStyle(original);
    for (const prop of STYLE_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value) copy.style.setProperty(prop, value);
    }
  });
  const width = Number(chart.getAttribute("width")) || chart.clientWidth || 640;
  const height = Number(chart.getAttribute("height")) || chart.clientHeight || 400;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const backdrop = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
  backdrop.setAttribute("width", "100%");
  backdrop.setAttribute("height", "100%");
  backdrop.setAttribute("fill", background);
  clone.insertBefore(backdrop, clone.firstChild);
  const markup = new XMLSerializer().serializeToString(clone);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await image.decode();
  const canvas = doc.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot draw images.");
  context.scale(scale, scale);
  context.drawImage(image, 0, 0, width, height);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create the image."))), "image/png"));
}

/** What a whole-card picture leaves out: the controls, the tooltip, the ref, the Details side and screen-reader copies. */
const CARD_SKIP = ".fft-actions, .fft-menu, .fft-more, .fft-tooltip, .fft-widget-ref, .fft-back, .fft-overlay, .fft-sr-only, .fft-skeleton, script, style";

/** Computed properties an HTML element needs to look the same outside the page. */
const HTML_PROPS = [
  "display", "position", "top", "right", "bottom", "left", "box-sizing", "width", "height", "min-width", "max-width", "min-height",
  "margin-top", "margin-right", "margin-bottom", "margin-left", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis", "align-items", "align-self", "justify-content", "gap", "row-gap", "column-gap",
  "grid-template-columns", "grid-template-rows", "grid-column", "grid-row",
  "color", "background-color", "background-image", "opacity", "visibility",
  "border-top", "border-right", "border-bottom", "border-left", "border-radius", "box-shadow",
  "font-family", "font-size", "font-weight", "font-style", "font-variant-numeric", "line-height", "letter-spacing", "text-align", "text-transform",
  "text-decoration-line", "white-space", "text-overflow", "overflow", "vertical-align", "transform", "transform-origin", "list-style-type",
] as const;

/**
 * The whole card as a standalone SVG: title, subtitle, headline, the chart (SVG or HTML: bars, bullets, strips, maps,
 * tables), every legend, the footer and the credit line, inside a `foreignObject`. Every element's computed look is
 * written inline first, since an exported file sees neither the stylesheet nor its custom properties; animations are
 * frozen at their end. Returns the markup and its size in CSS pixels.
 */
export function cardToSvg(card: HTMLElement, background: string): { markup: string; width: number; height: number } {
  const doc = card.ownerDocument;
  const view = doc.defaultView as Window;
  const box = card.getBoundingClientRect();
  const width = Math.ceil(box.width || card.offsetWidth || 640);
  const height = Math.ceil(box.height || card.scrollHeight || card.offsetHeight || 480);
  const clone = card.cloneNode(true) as HTMLElement;
  const originals = [card, ...card.querySelectorAll("*")];
  const copies = [clone, ...clone.querySelectorAll("*")];
  originals.forEach((original, i) => {
    const copy = copies[i] as HTMLElement | SVGElement | undefined;
    if (!copy) return;
    const computed = view.getComputedStyle(original);
    const props = original.namespaceURI === "http://www.w3.org/2000/svg" ? STYLE_PROPS : HTML_PROPS;
    for (const prop of props) {
      const value = computed.getPropertyValue(prop);
      if (value) copy.style.setProperty(prop, value);
    }
    copy.style.setProperty("animation", "none");
    copy.style.setProperty("transition", "none");
  });
  for (const node of clone.querySelectorAll(CARD_SKIP)) node.remove();
  for (const node of clone.querySelectorAll("[hidden]")) node.remove();
  clone.style.setProperty("width", `${width}px`);
  clone.style.setProperty("margin", "0");
  clone.removeAttribute("id");
  const SVG = "http://www.w3.org/2000/svg";
  // Made in the SVG namespace, the serializer writes its xmlns itself (setting it again would write it twice).
  const frame = doc.createElementNS(SVG, "svg");
  frame.setAttribute("width", String(width));
  frame.setAttribute("height", String(height));
  frame.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const title = card.querySelector(".fft-title")?.textContent?.trim();
  if (title) {
    const name = doc.createElementNS(SVG, "title");
    name.textContent = title;
    frame.append(name);
  }
  const backdrop = doc.createElementNS(SVG, "rect");
  backdrop.setAttribute("width", "100%");
  backdrop.setAttribute("height", "100%");
  backdrop.setAttribute("fill", background);
  const holder = doc.createElementNS(SVG, "foreignObject");
  holder.setAttribute("width", "100%");
  holder.setAttribute("height", "100%");
  const page = doc.createElementNS("http://www.w3.org/1999/xhtml", "div");
  page.append(clone);
  holder.append(page);
  frame.append(backdrop, holder);
  return { markup: new XMLSerializer().serializeToString(frame), width, height };
}

/**
 * The whole card as a PNG at `scale` times its size: `cardToSvg`, drawn through an image onto a canvas. Rejects when
 * the browser will not draw HTML inside SVG onto a canvas (some taint it), so callers can fall back to the chart alone.
 */
export async function cardToPng(card: HTMLElement, background: string, scale = 2): Promise<Blob> {
  const doc = card.ownerDocument;
  const { markup, width, height } = cardToSvg(card, background);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await image.decode();
  const canvas = doc.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot draw images.");
  context.scale(scale, scale);
  context.drawImage(image, 0, 0, width, height);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create the image."))), "image/png"));
}

/** 16px line icons for the action buttons. */
export const ACTION_ICONS: Record<WidgetAction, string[]> = {
  csv: ["M12 4v11", "M7.5 10.5L12 15l4.5-4.5", "M5 19h14"],
  image: ["M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z", "M4 16l5-5 4 4 2-2 5 5", "M15.5 9.5h.01"],
  svg: ["M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z", "M14 3v5h5", "M9 14l2 3 2-3", "M15 13.5v3.5"],
  copy: ["M9 9h10v11H9z", "M5 15V5a1 1 0 0 1 1-1h9"],
  expand: ["M14 4h6v6", "M10 20H4v-6", "M20 4l-7 7", "M4 20l7-7"],
  explain: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M9.5 9.5a2.5 2.5 0 0 1 4.9.6c0 1.6-2.4 2.2-2.4 3.7", "M12 17h.01"],
  info: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 11v6", "M12 7.5h.01"],
};

/** Accessible names for the action buttons. */
export const ACTION_LABELS: Record<WidgetAction, string> = WORDS_EN.widget.actions as Record<WidgetAction, string>;
