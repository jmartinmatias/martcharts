/**
 * What the RAG views share: a status's mark, its pill, its words for screen readers, and the legend. A status never
 * rests on color: every mark has its own shape, and every pill and cell carries its words.
 *
 * @module
 */
import { ragGlyph } from "../../core/formats.ts";
import { RAG_ORDER, ragWord } from "../../core/rag.ts";
import type { Rag } from "../../core/rag.ts";
import { html } from "./shared.ts";

/** The CSS color of a status: one of the four RAG tokens. */
export const ragColor = (status: Rag): string => `var(--fft-rag-${status.toLowerCase()})`;

/** The words and shapes a view sets, if any. */
export interface RagLook {
  words?: unknown;
  shapes?: unknown;
}

/** A status's mark: its shape in its color, hidden from screen readers (the words beside it say the status). */
export function ragMark(doc: Document, status: Rag, look: RagLook = {}, size = 12): SVGSVGElement {
  return ragGlyph(doc, status, look.shapes, size);
}

/** A pill: the shape and the words, toned by the status. */
export function ragPill(doc: Document, status: Rag, look: RagLook = {}, className = ""): HTMLElement {
  const pill = html(doc, "span", `fft-rag-pill${className ? ` ${className}` : ""}`);
  pill.dataset.rag = status;
  pill.append(ragMark(doc, status, look), html(doc, "span", "fft-rag-word", ragWord(status, look.words)));
  return pill;
}

/** Text only screen readers hear, inside a mark that shows a shape. */
export function srText(doc: Document, text: string): HTMLElement {
  return html(doc, "span", "fft-sr-only", text);
}

/** A key of the statuses present, worst first, each its shape and words. Nothing inside small multiples (the widget draws one). */
export function ragLegend(doc: Document, present: Iterable<Rag>, look: RagLook = {}): HTMLElement {
  const seen = new Set(present);
  const list = html(doc, "ul", "fft-legend fft-rag-legend");
  for (const status of RAG_ORDER) {
    if (!seen.has(status)) continue;
    const item = html(doc, "li");
    item.dataset.rag = status;
    item.append(ragMark(doc, status, look, 11), ragWord(status, look.words));
    list.append(item);
  }
  return list;
}
