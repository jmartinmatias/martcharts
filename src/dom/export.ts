/**
 * Getting data and pictures out of a widget: CSV and tab-separated text, file
 * downloads, and a PNG of a chart with its colors baked in.
 *
 * @module
 */
import type { Row } from "../core/types.ts";

/** Actions a host can offer on a widget. */
export type WidgetAction = "csv" | "image" | "copy" | "expand" | "explain";

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

/** 16px line icons for the action buttons. */
export const ACTION_ICONS: Record<WidgetAction, string[]> = {
  csv: ["M12 4v11", "M7.5 10.5L12 15l4.5-4.5", "M5 19h14"],
  image: ["M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z", "M4 16l5-5 4 4 2-2 5 5", "M15.5 9.5h.01"],
  copy: ["M9 9h10v11H9z", "M5 15V5a1 1 0 0 1 1-1h9"],
  expand: ["M14 4h6v6", "M10 20H4v-6", "M20 4l-7 7", "M4 20l7-7"],
  explain: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M9.5 9.5a2.5 2.5 0 0 1 4.9.6c0 1.6-2.4 2.2-2.4 3.7", "M12 17h.01"],
};

/** Accessible names for the action buttons. */
export const ACTION_LABELS: Record<WidgetAction, string> = {
  csv: "Download data as CSV",
  image: "Download chart as image",
  copy: "Copy data",
  expand: "Expand",
  explain: "How to read it",
};
