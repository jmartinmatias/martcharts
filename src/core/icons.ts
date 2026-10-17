/**
 * A small built-in icon set for KPI tiles: 24px line icons, drawn with 2px
 * round strokes in the current text color. Each icon is a list of SVG path
 * data, so it renders the same in the browser and documents as plain data.
 *
 * @module
 */

const circle = (cx: number, cy: number, r: number) => `M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0`;

/** Icon name to SVG path data, on a 24 by 24 grid. */
export const ICONS: Record<string, string[]> = {
  users: [circle(9, 7, 4), "M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1", "M16 3.5a4 4 0 0 1 0 7", "M22 21v-1a5 5 0 0 0-3-4.6"],
  revenue: ["M17 6.5A7 7 0 1 0 17 17.5", "M4 10h10", "M4 14h10"],
  cart: ["M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2", circle(10, 20, 1), circle(18, 20, 1)],
  heart: ["M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"],
  clock: [circle(12, 12, 9), "M12 7v5l3 2"],
  target: [circle(12, 12, 9), circle(12, 12, 5), circle(12, 12, 1)],
  trend: ["M3 17l6-6 4 4 8-8", "M15 7h6v6"],
  alert: ["M12 3l9.5 17h-19z", "M12 10v4", "M12 17.5v.5"],
  check: [circle(12, 12, 9), "M8 12.5l2.5 2.5L16 9.5"],
  droplet: ["M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"],
  pin: ["M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z", circle(12, 9.5, 2.5)],
  mail: ["M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M3 7l9 6 9-6"],
  activity: ["M3 12h4l3-7 4 14 3-7h4"],
  bolt: ["M13 2L4 14h7l-1 8 9-12h-7z"],
};

/** Icon names, sorted. */
export const ICON_NAMES: string[] = Object.keys(ICONS).sort();
