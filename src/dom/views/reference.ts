import type { ResolvedReference } from "../../core/reference.ts";
import type { LinearScale } from "../layout.ts";
import { svg } from "./shared.ts";

interface Plot {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Point {
  x: number;
  y: number;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What a reference label should keep clear of: lines as point lists, bars and dots as boxes. */
export interface LabelObstacles {
  lines?: (Point | null)[][];
  boxes?: Box[];
}

const LABEL_CHAR_WIDTH = 6.5;

/** True when the segment from a to b crosses the box (Liang-Barsky clipping). */
function segmentHits(a: Point, b: Point, box: Box): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, a.x - box.x],
    [dx, box.x + box.width - a.x],
    [-dy, a.y - box.y],
    [dy, box.y + box.height - a.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return false;
  }
  return true;
}

function blocked(box: Box, obstacles: LabelObstacles): boolean {
  for (const other of obstacles.boxes ?? []) {
    if (other.x < box.x + box.width && other.x + other.width > box.x && other.y < box.y + box.height && other.y + other.height > box.y) return true;
  }
  for (const line of obstacles.lines ?? []) {
    for (let i = 0; i < line.length; i++) {
      const a = line[i];
      const b = line[i + 1] ?? a;
      if (a && b && segmentHits(a, b, box)) return true;
    }
  }
  return false;
}

/**
 * Draws reference marks across a plot. Bands go in `below` (behind the data),
 * lines in `above` (over it). Lines are dashed, which here is right: a dashed
 * line reads as a threshold, the job a reference line does. A line's label
 * takes the first clear spot of: right end above, left end above, right end
 * below, left end below, so it never sits on the data.
 */
export function drawReferences(
  doc: Document,
  references: ResolvedReference[],
  y: LinearScale,
  plot: Plot,
  /** Formats a mark's value; charts pass their tick formatter so labels match the axis (Target €1.2M). */
  format: (value: number) => string,
  below: SVGGElement,
  above: SVGGElement,
  obstacles: LabelObstacles = {},
): void {
  for (const ref of references) {
    if (ref.kind === "band") {
      const top = y(Math.max(ref.from, ref.to));
      const bottom = y(Math.min(ref.from, ref.to));
      below.append(svg(doc, "rect", { class: "fft-ref-band", x: plot.x, y: top, width: plot.w, height: Math.max(1, bottom - top) }));
      if (ref.label) {
        const text = svg(doc, "text", { class: "fft-ref-label", x: plot.x + 5, y: top + 13 });
        text.textContent = ref.label;
        below.append(text);
      }
      continue;
    }
    const level = y(ref.value);
    above.append(svg(doc, "line", { class: "fft-ref", x1: plot.x, x2: plot.x + plot.w, y1: level, y2: level }));
    const label = ref.label ? `${ref.label} ${format(ref.value)}` : format(ref.value);
    const width = label.length * LABEL_CHAR_WIDTH;
    const spots = [
      { anchor: "end", x: plot.x + plot.w, y: level - 5, box: { x: plot.x + plot.w - width, y: level - 14, width, height: 11 } },
      { anchor: "start", x: plot.x + 5, y: level - 5, box: { x: plot.x + 5, y: level - 14, width, height: 11 } },
      { anchor: "end", x: plot.x + plot.w, y: level + 13, box: { x: plot.x + plot.w - width, y: level + 4, width, height: 11 } },
      { anchor: "start", x: plot.x + 5, y: level + 13, box: { x: plot.x + 5, y: level + 4, width, height: 11 } },
    ];
    const spot = spots.find((candidate) => !blocked(candidate.box, obstacles)) ?? spots[0];
    const text = svg(doc, "text", { class: "fft-ref-label", x: spot?.x ?? 0, y: spot?.y ?? 0, "text-anchor": spot?.anchor ?? "end" });
    text.textContent = label;
    above.append(text);
  }
}
