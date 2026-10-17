/**
 * Style presets: named looks a widget can wear with `style: { preset: "glass" }`.
 *
 * A preset is CSS (custom properties plus a few structural rules), an
 * optional series palette, and optional mark geometry for charts. Presets live
 * in the core so Node (validation, the MCP server, the docs) knows their names;
 * the browser layer turns them into stylesheets.
 *
 * Shipped palettes reuse the validated categorical hues, re-ordered to suit
 * each look, and every order was checked for colorblind separation, the
 * normal-vision floor and contrast against the preset's surface.
 *
 * @module
 */

/** A named look. */
export interface StylePreset {
  /** The name used in specs: `style: { preset: "<name>" }`. */
  name: string;
  /** One sentence on the look and when to use it. */
  description: string;
  /** Series colors in fixed order. Validate any palette you add for colorblind separation. */
  palette?: string[];
  /**
   * CSS for the look. `&` stands for the widget root, so `& { --fft-accent: red }`
   * sets a token and `& .fft-title { ... }` styles a part. Rules win over the
   * base theme, and a spec's own `style.tokens` and `style.palette` win over the preset.
   */
  css: string;
  /**
   * The look on dark widgets, dark pages and dark systems: CSS that overrides the colors of `css` (structure stays
   * shared) and the same series stepped for a dark surface, in the same order so no series changes color.
   */
  dark?: { css: string; palette?: string[] };
  /** A color scheme the look forces, for a look built for only one: the host's own controls (a dashboard's filter row) follow it. Shipped looks follow the theme instead. */
  scheme?: "light" | "dark";
  /** Chart mark geometry. `barRadius: "full"` makes pill bars; `barTrack` draws a soft track behind each bar; `sliceCaps: "round"` rounds donut segment ends. */
  marks?: { barRadius?: number | "full"; barTrack?: boolean; sliceCaps?: "round" | "butt"; areaGradient?: boolean };
}

const presets = new Map<string, StylePreset>();

/** Adds or replaces a preset. */
export function registerPreset(preset: StylePreset): void {
  if (!preset.name) throw new Error("A preset needs a name.");
  presets.set(preset.name, preset);
}

/** Looks up a preset by name. */
export function getPreset(name: string | undefined): StylePreset | undefined {
  return name === undefined ? undefined : presets.get(name);
}

/** Registered preset names, sorted. */
export function presetNames(): string[] {
  return [...presets.keys()].sort();
}

/** Every preset's name and description, sorted by name. JSON-safe. */
export function describePresets(): { name: string; description: string }[] {
  return presetNames().map((name) => ({ name, description: presets.get(name)?.description ?? "" }));
}

registerPreset({
  name: "default",
  description: "The house look: quiet cards with hairline borders, following the light or dark theme. Choosing it resets any other preset.",
  css: "",
});

registerPreset({
  name: "glass",
  description: "Frosted translucent cards for image or gradient backdrops: light frost or dark smoke with the theme, soft blur, large radius, pill bars on tracks, blue and gold leading the palette.",
  // Blue, gold, teal, orange, violet, red, green, magenta: adjacent CVD passes on the dark smoke (worst 8.4); on the light frost red and green sit 7.2 apart, legal with the direct labels and tooltips every chart has.
  palette: ["#2a78d6", "#bd7f00", "#009f6d", "#eb6834", "#6250d6", "#e34948", "#008300", "#d36992"],
  marks: { barRadius: "full", barTrack: true, sliceCaps: "round" },
  css: `
& {
  color-scheme: light;
  --fft-surface: rgba(255, 255, 255, 0.55);
  --fft-ring: #eef3f1;
  --fft-popover: rgba(255, 255, 255, 0.9);
  --fft-text: #10201d;
  --fft-text-secondary: rgba(16, 32, 29, 0.7);
  --fft-muted: rgba(16, 32, 29, 0.64);
  --fft-grid: rgba(16, 32, 29, 0.07);
  --fft-axis: rgba(16, 32, 29, 0.18);
  --fft-border: rgba(255, 255, 255, 0.72);
  --fft-accent: #2270cf;
  --fft-positive: #006300;
  --fft-negative: #d03b3b;
  --fft-radius: 21px;
  --fft-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 8px 34px rgba(16, 32, 29, 0.1);
  --fft-deemphasis: rgba(16, 32, 29, 0.16);
  --fft-up: #2a78d6; --fft-down: #e34948; --fft-total: rgba(16, 32, 29, 0.72);
  backdrop-filter: blur(21px) saturate(144%);
  -webkit-backdrop-filter: blur(21px) saturate(144%);
}
& .fft-title { font-size: 21px; line-height: 34px; font-weight: 500; letter-spacing: -0.01em; }
& .fft-tooltip { backdrop-filter: blur(13px); -webkit-backdrop-filter: blur(13px); border-color: rgba(16, 32, 29, 0.1); }
& .fft-bar-track { fill: rgba(16, 32, 29, 0.06); }
& .fft-hbar-track { border-radius: 13px; background: rgba(16, 32, 29, 0.06); }
& .fft-hbar-fill { border-radius: 13px; }
& .fft-meter-track { background: rgba(16, 32, 29, 0.07); }
& .fft-table th { border-bottom-color: rgba(16, 32, 29, 0.1); }
& .fft-table td, & .fft-item { border-bottom-color: rgba(16, 32, 29, 0.06); }
& .fft-kpi-value { font-weight: 500; }
& .fft-kpi-icon { border-radius: 50%; background: rgba(16, 32, 29, 0.06); color: var(--fft-text); }
`,
  dark: {
    palette: ["#3987e5", "#c98500", "#199e70", "#d95926", "#9085e9", "#e66767", "#20921d", "#d55181"],
    css: `
& {
  color-scheme: dark;
  --fft-surface: rgba(255, 255, 255, 0.06);
  --fft-ring: #1d2827;
  --fft-popover: rgba(24, 33, 32, 0.92);
  --fft-text: #f4f7f6;
  --fft-text-secondary: rgba(244, 247, 246, 0.66);
  --fft-muted: rgba(244, 247, 246, 0.58);
  --fft-grid: rgba(255, 255, 255, 0.07);
  --fft-axis: rgba(255, 255, 255, 0.16);
  --fft-border: rgba(255, 255, 255, 0.12);
  --fft-accent: #509efe;
  --fft-positive: #2db429;
  --fft-negative: #f67574;
  --fft-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 8px 34px rgba(0, 0, 0, 0.21);
  --fft-deemphasis: rgba(255, 255, 255, 0.16);
  --fft-up: #3987e5; --fft-down: #e66767; --fft-total: rgba(244, 247, 246, 0.72);
  --fft-seq-1: #104281;
  --fft-seq-text-1: #ffffff;
  --fft-seq-2: #1c5cab;
  --fft-seq-text-2: #ffffff;
  --fft-seq-3: #2674d2;
  --fft-seq-text-3: #ffffff;
  --fft-seq-4: #3987e5;
  --fft-seq-text-4: #0b0b0b;
  --fft-seq-5: #6da7ec;
  --fft-seq-text-5: #0b0b0b;
  --fft-seq-6: #9ec5f4;
  --fft-seq-text-6: #0b0b0b;
  --fft-seq-7: #cde2fb;
  --fft-seq-text-7: #0b0b0b;
}
& .fft-tooltip { border-color: rgba(255, 255, 255, 0.14); }
& .fft-bar-track { fill: rgba(255, 255, 255, 0.07); }
& .fft-hbar-track { background: rgba(255, 255, 255, 0.07); }
& .fft-meter-track { background: rgba(255, 255, 255, 0.08); }
& .fft-table th { border-bottom-color: rgba(255, 255, 255, 0.1); }
& .fft-table td, & .fft-item { border-bottom-color: rgba(255, 255, 255, 0.06); }
& .fft-kpi-icon { background: rgba(255, 255, 255, 0.08); }
`,
  },
});

registerPreset({
  name: "airy",
  description: "Editorial and chrome-free, on a light or a dark page: no card, generous whitespace, small grey labels over large numbers, warm orange leading the palette, solid value pills.",
  // Orange, teal, gold, blue, green, magenta, violet, red: passes adjacent CVD and the normal-vision floor on both the light and the dark page.
  palette: ["#e5632e", "#009f6d", "#bd7f00", "#2a78d6", "#008300", "#d36992", "#6250d6", "#e34948"],
  marks: { areaGradient: true },
  css: `
& {
  color-scheme: light;
  --fft-surface: transparent;
  --fft-ring: #f5f5f3;
  --fft-popover: #eb6834;
  --fft-text: #111111;
  --fft-text-secondary: #6b6b68;
  --fft-muted: #6f6f6b;
  --fft-grid: #e7e7e3;
  --fft-axis: #d3d3ce;
  --fft-border: transparent;
  --fft-accent: #c34400;
  --fft-positive: #006300;
  --fft-negative: #cc3737;
  --fft-shadow: none;
  --fft-pad: 8px 0;
}
& .fft-title { font-weight: 400; color: var(--fft-text-secondary); }
& .fft-subtitle { color: var(--fft-muted); font-size: 11px; line-height: 13px; }
& .fft-footer { font-size: 13px; line-height: 21px; color: var(--fft-text-secondary); }
& .fft-kpi-value, & .fft-headline-value { font-weight: 500; letter-spacing: -0.02em; }
& .fft-kpi-delta { font-size: 11px; }
& .fft-headline-caption { color: var(--fft-muted); }
& .fft-area { fill-opacity: 0.16; }
& .fft-hbar-track { height: 21px; border-radius: 3px; background: repeating-linear-gradient(135deg, #ececea 0 2px, transparent 2px 5px); }
& .fft-hbar-fill { border-radius: 3px; background: linear-gradient(90deg, color-mix(in srgb, var(--fft-bar-color) 21%, transparent), var(--fft-bar-color)) !important; }
& .fft-tooltip { color: #ffffff; border: 0; box-shadow: 0 5px 13px rgba(235, 104, 52, 0.34); }
& .fft-tooltip-title, & .fft-tooltip-label { color: rgba(255, 255, 255, 0.82); }
& .fft-tooltip-key { background: #ffffff !important; }
`,
  dark: {
    palette: ["#d95926", "#199e70", "#c98500", "#3987e5", "#20921d", "#d55181", "#9085e9", "#e66767"],
    css: `
& {
  color-scheme: dark;
  --fft-ring: #141413;
  --fft-popover: #d95926;
  --fft-text: #f2f2f0;
  --fft-text-secondary: #a8a8a3;
  --fft-muted: #85857f;
  --fft-grid: #2a2a28;
  --fft-axis: #3d3d3a;
  --fft-accent: #d95926;
  --fft-positive: #0ca30c;
  --fft-negative: #e66767;
}
& .fft-hbar-track { background: repeating-linear-gradient(135deg, #2c2c2a 0 2px, transparent 2px 5px); }
& .fft-tooltip { box-shadow: 0 5px 13px rgba(0, 0, 0, 0.34); }
`,
  },
});

const SERIF = `"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`;

registerPreset({
  name: "paper",
  description: "Editorial print for reports and briefings: a warm paper card under a black rule (a night edition on dark: warm dark paper, cream rule), serif titles and headline numbers, nearly square bars, deep ink blue leading the palette.",
  // Ink blue, orange, teal, gold, magenta, green, violet, red: passes adjacent CVD (worst 8.4) and the normal-vision floor (19.3) on the paper surface, and every check on the night paper.
  palette: ["#1c5cab", "#d95926", "#199e70", "#c18000", "#d55181", "#008300", "#6250d6", "#e34948"],
  marks: { barRadius: 1 },
  css: `
& {
  color-scheme: light;
  --fft-surface: #fbf8f3;
  --fft-ring: #fbf8f3;
  --fft-popover: #1d1d1b;
  --fft-text: #1d1d1b;
  --fft-text-secondary: #5e5a52;
  --fft-muted: #746f66;
  --fft-grid: #ebe5da;
  --fft-axis: #cfc7b8;
  --fft-border: transparent;
  --fft-accent: #1c5cab;
  --fft-positive: #006300;
  --fft-negative: #c0392b;
  --fft-deemphasis: #d9d2c4;
  --fft-up: #1c5cab; --fft-down: #c0392b; --fft-total: #5e5a52;
  --fft-radius: 2px;
  --fft-shadow: none;
  border-top: 2px solid #1d1d1b;
}
& .fft-title { font-family: ${SERIF}; font-size: 21px; line-height: 34px; font-weight: 600; letter-spacing: -0.005em; }
& :is(.fft-kpi-value, .fft-stat-value, .fft-headline-value, .fft-donut-total, .fft-rings-percent, .fft-gauge-value) { font-family: ${SERIF}; font-weight: 600; font-variant-numeric: lining-nums tabular-nums; }
& .fft-tooltip { color: #fbf8f3; border: 0; border-radius: 2px; box-shadow: 0 5px 13px rgba(29, 29, 27, 0.21); }
& .fft-tooltip-title, & .fft-tooltip-label { color: rgba(251, 248, 243, 0.72); }
& .fft-table th { border-bottom: 1px solid #1d1d1b; }
& .fft-kpi-icon { border-radius: 2px; background: #efe9de; color: #1d1d1b; }
`,
  dark: {
    palette: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#20921d", "#9085e9", "#e66767"],
    css: `
& {
  color-scheme: dark;
  --fft-surface: #1c1b19;
  --fft-ring: #1c1b19;
  --fft-popover: #f1ece2;
  --fft-text: #f1ece2;
  --fft-text-secondary: #b8b0a1;
  --fft-muted: #8f897d;
  --fft-grid: #2f2d29;
  --fft-axis: #4b4740;
  --fft-accent: #3987e5;
  --fft-positive: #0ca30c;
  --fft-negative: #e66767;
  --fft-deemphasis: #3d3a34;
  --fft-up: #3987e5; --fft-down: #e66767; --fft-total: #b8b0a1;
  border-top-color: #f1ece2;
}
& .fft-tooltip { color: #1d1d1b; box-shadow: 0 5px 13px rgba(0, 0, 0, 0.34); }
& .fft-tooltip-title, & .fft-tooltip-label { color: rgba(29, 29, 27, 0.72); }
& .fft-table th { border-bottom-color: #f1ece2; }
& .fft-kpi-icon { background: #2a2824; color: #f1ece2; }
`,
  },
});

