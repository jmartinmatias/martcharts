/**
 * The base stylesheet and how a spec's `style` reaches the page.
 *
 * Every color is a CSS custom property on `.fft-widget`, so a theme is just a
 * set of variables. The default palette is a validated, colorblind-checked set
 * of 8 series colors, with separate steps chosen for the dark surface.
 *
 * @module
 */
import { getPalette, resolvePalette } from "../core/palettes.ts";
import { getPreset, presetNames } from "../core/presets.ts";
import type { StylePreset } from "../core/presets.ts";
import type { StyleSpec } from "../core/types.ts";
import { DEFAULT_PALETTE_SIZE } from "../core/validate.ts";

/** How many series colors the widget has before they would repeat. */
export function paletteSize(style?: StyleSpec): number {
  return resolvePalette(style)?.length || DEFAULT_PALETTE_SIZE;
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Writes a style spec onto a widget root: theme and density as data
 * attributes, palette and tokens as inline CSS variables. Variables from a
 * previous call that the new style no longer sets are removed.
 */
export function applyStyle(root: HTMLElement, style: StyleSpec = {}): void {
  root.dataset.theme = style.theme ?? "auto";
  root.dataset.density = style.density ?? "comfortable";
  if (style.preset && style.preset !== "default") root.dataset.preset = style.preset;
  else root.removeAttribute("data-preset");
  const stale: string[] = [];
  for (let i = 0; i < root.style.length; i++) {
    const name = root.style.item(i);
    if (name.startsWith("--fft-")) stale.push(name);
  }
  for (const name of stale) root.style.removeProperty(name);
  // The preset's own palette arrives through its stylesheet; only an explicit palette is set inline.
  const named = typeof style.palette === "string" && style.palette !== "default" ? getPalette(style.palette) : undefined;
  const own = Array.isArray(style.palette) ? style.palette : named?.colors;
  // A palette with its own dark steps: a known scheme (an explicit theme, or a preset that forces one) takes its steps
  // directly; an auto theme carries both as variables and the stylesheet picks by the system or page theme.
  const scheme = style.theme === "dark" || style.theme === "light" ? style.theme : getPreset(style.preset)?.scheme;
  if (named?.darkColors && !scheme) {
    root.dataset.paletteSteps = "";
    named.colors.forEach((color, i) => root.style.setProperty(`--fft-pal-${i + 1}`, color));
    named.darkColors.forEach((color, i) => root.style.setProperty(`--fft-pal-dark-${i + 1}`, color));
  } else {
    root.removeAttribute("data-palette-steps");
    (scheme === "dark" && named?.darkColors ? named.darkColors : own)?.forEach((color, i) => root.style.setProperty(`--fft-series-${i + 1}`, color));
  }
  for (const [token, value] of Object.entries(style.tokens ?? {})) {
    if (typeof value === "string") root.style.setProperty(`--fft-${kebab(token)}`, value);
  }
}

/** Adds the base stylesheet and one stylesheet per registered preset to a document, each once. */
export function ensureStyles(doc: Document): void {
  if (!doc.querySelector("style[data-fft-widget]")) {
    const style = doc.createElement("style");
    style.dataset.fftWidget = "";
    style.textContent = BASE_CSS;
    doc.head.append(style);
  }
  for (const name of presetNames()) {
    const preset = getPreset(name);
    if (!preset || doc.querySelector(`style[data-fft-preset="${name}"]`)) continue;
    const style = doc.createElement("style");
    style.dataset.fftPreset = name;
    style.textContent = presetCss(preset);
    doc.head.append(style);
  }
}

/**
 * A preset's stylesheet. `&` becomes a selector that outranks the base theme
 * rules (including a page-level light or dark switch), so the preset wins;
 * inline `style.tokens` still win over it.
 */
export function presetCss(preset: StylePreset): string {
  const widget = `.fft-widget[data-preset="${preset.name}"]`;
  const series = (palette?: string[]) => (palette?.length ? `& {\n${palette.map((color, i) => `  --fft-series-${i + 1}: ${color};`).join("\n")}\n}\n` : "");
  const light = `${series(preset.palette)}${preset.css}`.replaceAll("&", `:root ${widget}[data-theme]`);
  if (!preset.dark) return light;
  // The dark look, over the light one: on dark widgets, on auto widgets on a dark page, and on auto widgets on a
  // dark system unless the page asks for light. Its rules only change colors, so structure stays shared.
  const dark = `${series(preset.dark.palette)}${preset.dark.css}`;
  const chosen = `:is(:root ${widget}[data-theme="dark"], :root[data-theme="dark"] ${widget}[data-theme="auto"])`;
  const system = `:root:not([data-theme="light"]) ${widget}[data-theme="auto"]`;
  return `${light}${dark.replaceAll("&", chosen)}@media screen and (prefers-color-scheme: dark) {\n${dark.replaceAll("&", system)}}\n`;
}

/** Series variables pointing at a palette's light or dark steps, for palettes of up to 14 colors. */
const steps = (kind: "pal" | "pal-dark") =>
  Array.from({ length: 14 }, (_, i) => `\n  --fft-series-${i + 1}: var(--fft-${kind}-${i + 1});`).join("") + "\n";

/** The dark theme's tokens, for any root that wears the library's look (widgets, the palette picker, the editor). */
export const DARK = `
  color-scheme: dark;
  --fft-surface: #1a1a19;
  --fft-card: #1a1a19;
  --fft-stream-fill: 0.82;
  --fft-text: #f0efec;
  --fft-text-secondary: #c3c2b7;
  --fft-muted: #898781;
  --fft-grid: #2c2c2a;
  --fft-axis: #464642;
  --fft-border: rgba(255, 255, 255, 0.10);
  --fft-accent: #3987e5;
  --fft-positive: #0ca30c;
  --fft-negative: #e66767;
  --fft-warning: #fab219;
  --fft-deemphasis: #4a4a47;
  --fft-up: #3987e5;
  --fft-down: #e66767;
  --fft-total: #c3c2b7;
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
  --fft-series-1: #3987e5;
  --fft-series-2: #d95926;
  --fft-series-3: #199e70;
  --fft-series-4: #c98500;
  --fft-series-5: #d55181;
  --fft-series-6: #008300;
  --fft-series-7: #9085e9;
  --fft-series-8: #e66767;
  --fft-shadow: none;
`;

/** The light theme's tokens. */
export const LIGHT = `
  color-scheme: light;
  --fft-surface: #fcfcfb;
  --fft-card: #fcfcfb;
  --fft-stream-fill: 0.62;
  --fft-text: #0b0b0b;
  --fft-text-secondary: #52514e;
  --fft-muted: #75736d;
  --fft-grid: #e1e0d9;
  --fft-axis: #c3c2b7;
  --fft-border: rgba(11, 11, 11, 0.10);
  --fft-accent: #2372cf;
  --fft-positive: #006300;
  --fft-negative: #d03b3b;
  --fft-warning: #8a5a00;
  --fft-deemphasis: #d4d3cd;
  --fft-up: #2a78d6;
  --fft-down: #e34948;
  --fft-total: #52514e;
  --fft-seq-1: #cde2fb;
  --fft-seq-text-1: #0b0b0b;
  --fft-seq-2: #9ec5f4;
  --fft-seq-text-2: #0b0b0b;
  --fft-seq-3: #6da7ec;
  --fft-seq-text-3: #0b0b0b;
  --fft-seq-4: #3987e5;
  --fft-seq-text-4: #0b0b0b;
  --fft-seq-5: #256abf;
  --fft-seq-text-5: #ffffff;
  --fft-seq-6: #184f95;
  --fft-seq-text-6: #ffffff;
  --fft-seq-7: #0d366b;
  --fft-seq-text-7: #ffffff;
  --fft-series-1: #2a78d6;
  --fft-series-2: #eb6834;
  --fft-series-3: #00a470;
  --fft-series-4: #c38300;
  --fft-series-5: #d86d96;
  --fft-series-6: #008300;
  --fft-series-7: #6250d6;
  --fft-series-8: #e34948;
  --fft-shadow: 0 1px 2px rgba(11, 11, 11, 0.04), 0 3px 13px rgba(11, 11, 11, 0.04);
`;

/** The base theme tokens as name to value, without the --fft- prefix: for contrast checks and docs. */
export function themeTokens(scheme: "light" | "dark"): Record<string, string> {
  return parseTokens(scheme === "dark" ? DARK : LIGHT);
}

/** `--fft-name: value;` declarations in a block of CSS, as name to value. */
export function parseTokens(css: string): Record<string, string> {
  return Object.fromEntries([...css.matchAll(/--fft-([\w-]+):\s*([^;]+);/g)].map((m) => [m[1] as string, (m[2] as string).trim()]));
}

/**
 * The base stylesheet. Exported so server-rendered pages can inline it.
 *
 * Theme order: light by default; dark for `data-theme="dark"`; for `auto`,
 * dark when the system asks for it, unless the page's root element says
 * `data-theme="light"` or `"dark"`, which wins both ways.
 */
export const BASE_CSS = `
/* Fibonacci framing: spacing 2 3 5 8 13 21 34, type 11 13 21 34, motion 377 610 987 ms, golden-ratio proportions. */
/* The shared scale every view draws with: one hover dimming, three radii (plus the card's and a pill), five type steps. */
/* The dashboard's own chrome (its filter row, tabs, Share) sits outside any card, so it takes the scale too. */
.fft-widget, .fft-overlay, .fft-dashboard {
  --fft-dim: 0.38;
  --fft-dim-strong: 0.21;
  --fft-radius-s: 2px;
  --fft-radius-m: 5px;
  --fft-radius-l: 8px;
  --fft-radius-card: var(--fft-radius, 13px);
  --fft-radius-pill: 999px;
  --fft-radius-mark: var(--fft-radius-s);
  --fft-radius-control: var(--fft-radius-l);
  --fft-fs-xs: 10px;
  --fft-fs-s: 11px;
  --fft-fs-m: 13px;
  --fft-fs-l: 21px;
  --fft-fs-xl: 34px;
}
.fft-widget {${LIGHT}
  --fft-pad: 21px;
  --fft-gap: 13px;
  --fft-radius: 13px;
  --fft-ease: cubic-bezier(0.2, 0.7, 0.2, 1);

  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--fft-gap);
  min-width: 0;
  padding: var(--fft-pad);
  background: var(--fft-surface);
  color: var(--fft-text);
  border: 1px solid var(--fft-border);
  border-radius: var(--fft-radius);
  box-shadow: var(--fft-shadow);
  font: 13px/21px -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.fft-widget[data-theme="dark"] {${DARK}}
@media (prefers-color-scheme: dark) {
  .fft-widget[data-theme="auto"] {${DARK}}
}
:root[data-theme="dark"] .fft-widget[data-theme="auto"] {${DARK}}
:root[data-theme="light"] .fft-widget[data-theme="auto"] {${LIGHT}}
/* A named palette with its own dark steps, on a widget that follows the system or page theme: both steps arrive as variables, these pick. */
/* (Tripled :root outranks a preset's own light and dark palettes, which an explicit palette replaces.) */
:root:root:root .fft-widget[data-palette-steps][data-theme] {${steps("pal")}}
@media (prefers-color-scheme: dark) {
  :root:root:root:not([data-theme="light"]) .fft-widget[data-palette-steps][data-theme="auto"] {${steps("pal-dark")}}
}
:root:root:root .fft-widget[data-palette-steps][data-theme="dark"],
:root:root:root[data-theme="dark"] .fft-widget[data-palette-steps][data-theme="auto"] {${steps("pal-dark")}}
.fft-widget *, .fft-widget *::before, .fft-widget *::after { box-sizing: border-box; }
.fft-widget[data-density="compact"] { --fft-pad: 13px; --fft-gap: 8px; --fft-radius: 8px; }
.fft-widget [hidden] { display: none !important; }

.fft-header { display: flex; flex-direction: column; gap: 2px; }
.fft-actions {
  position: absolute; top: 13px; right: 13px; z-index: 5; display: flex; gap: 2px;
  opacity: 0; transition: opacity 377ms var(--fft-ease);
}
.fft-widget:hover .fft-actions, .fft-widget:focus-within .fft-actions { opacity: 1; }
@media (hover: none) { .fft-actions { opacity: 1; } }
.fft-action {
  display: grid; place-items: center; width: 26px; height: 26px; padding: 0; border: 0; border-radius: var(--fft-radius-m);
  background: transparent; color: var(--fft-muted); cursor: pointer;
}
.fft-action svg { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.fft-action:hover, .fft-action:focus-visible { color: var(--fft-text); background: var(--fft-grid); outline: none; }
.fft-action[data-done] { color: var(--fft-positive); }
/* The label shows only inside the More menu; in the toolbar the icon and its tooltip name the action. */
.fft-action-text { display: none; }
/* The title keeps the toolbar's width free (three buttons at most), so it never runs under it; the subtitle sits below the toolbar. */
.fft-widget[data-actions] .fft-title { padding-right: 89px; }
.fft-actions:has(.fft-menu:not([hidden])) { opacity: 1; }
/* More: a small popover card of labelled actions, one per row, each a comfortable 34px target. */
.fft-menu {
  position: absolute; top: calc(100% + 5px); right: 0; z-index: 6; min-width: 200px;
  display: flex; flex-direction: column; gap: 2px; padding: 5px;
  background: var(--fft-popover, var(--fft-surface)); color: var(--fft-text);
  border: 1px solid var(--fft-border); border-radius: var(--fft-radius-l); box-shadow: 0 8px 21px rgba(0, 0, 0, 0.16);
}
.fft-menu[hidden] { display: none; }
.fft-menu .fft-action { display: flex; align-items: center; justify-content: flex-start; gap: 8px; width: 100%; height: 34px; padding: 0 8px; color: var(--fft-text-secondary); }
.fft-menu .fft-action-text { display: inline; font: inherit; font-size: var(--fft-fs-m); color: var(--fft-text); white-space: nowrap; }
/* Expand: the widget redrawn large in a dialog over a blurred page; full screen on phones. */
.fft-overlay {
  position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 21px;
  background: rgba(0, 0, 0, 0.55); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  animation: fft-fade 233ms var(--fft-ease, ease) both;
}
.fft-overlay-panel { position: relative; width: min(1100px, 100%); max-height: 100%; overflow: auto; border-radius: var(--fft-radius-card); animation: fft-rise 377ms var(--fft-ease, ease) both; }
.fft-overlay-slot { display: flex; flex-direction: column; min-height: 100%; }
.fft-overlay-slot > .fft-widget { flex: 1; }
.fft-overlay .fft-widget[data-preset="airy"] { background: var(--fft-card); padding: 21px; border-radius: var(--fft-radius-card); }
.fft-overlay .fft-actions { right: 55px; }
.fft-overlay-close {
  position: absolute; top: 13px; right: 13px; z-index: 6; display: grid; place-items: center; width: 34px; height: 34px; padding: 0;
  border: 0; border-radius: 50%; background: rgba(128, 128, 128, 0.18); color: inherit; cursor: pointer;
}
.fft-overlay-close svg, .fft-overlay-nav svg { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.fft-overlay-panel { touch-action: pan-y; }
.fft-overlay-nav {
  position: fixed; left: 50%; bottom: calc(21px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); z-index: 7;
  display: flex; align-items: center; gap: 5px; padding: 5px; border-radius: var(--fft-radius-pill);
  background: rgba(20, 20, 20, 0.72); color: #ffffff; -webkit-backdrop-filter: blur(13px); backdrop-filter: blur(13px);
  font: 600 11px/21px -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif; font-variant-numeric: tabular-nums;
}
.fft-overlay-nav button { display: grid; place-items: center; width: 34px; height: 34px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: inherit; cursor: pointer; }
.fft-overlay-nav button:hover:not(:disabled), .fft-overlay-nav button:focus-visible { background: rgba(255, 255, 255, 0.16); outline: none; }
.fft-overlay-nav button:disabled { opacity: var(--fft-dim); cursor: default; }
.fft-overlay-count { min-width: 55px; text-align: center; }
.fft-overlay-close:hover, .fft-overlay-close:focus-visible { background: rgba(128, 128, 128, 0.32); outline: none; }
@media (max-width: 700px) {
  .fft-overlay { padding: 0; }
  .fft-overlay-panel { width: 100%; height: 100%; max-height: none; border-radius: 0; }
  .fft-overlay-panel .fft-widget { border-radius: 0; }
  /* Room under the content for the stepping pill, so it never covers the footer. */
  .fft-overlay:has(.fft-overlay-nav) .fft-overlay-slot > .fft-widget { padding-bottom: 89px; }
}
/* On a phone the card gives its padding to the chart: the page around it already has a gutter. */
@media (max-width: 480px) { .fft-widget { --fft-pad: 16px; --fft-gap: 8px; } }
.fft-action[data-failed] { color: var(--fft-negative); }
.fft-title { margin: 0; font-size: var(--fft-fs-m); line-height: 21px; font-weight: 600; letter-spacing: -0.005em; }
.fft-subtitle { margin: 0; font-size: var(--fft-fs-m); line-height: 21px; color: var(--fft-text-secondary); }
/* How to read it: a quiet note under the chart, a thin accent rule, a small label over plain sentences. */
.fft-guide { margin: 0; max-width: 68ch; padding: 2px 0 2px 13px; border-left: 2px solid var(--fft-accent); font-size: var(--fft-fs-m); line-height: 21px; color: var(--fft-text-secondary); }
.fft-guide[hidden] { display: none; }
.fft-guide-label { display: block; margin-bottom: 2px; font-size: var(--fft-fs-s); line-height: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.fft-guide-question { display: block; margin-bottom: 3px; font-size: var(--fft-fs-m); line-height: 21px; font-weight: 600; color: var(--fft-text); text-wrap: balance; }
/* The Details side (the info action). While it shows, the front's parts step aside and the back fills the card. */
.fft-widget[data-side="back"] > :not(.fft-back) { display: none; }
.fft-widget:has(.fft-action[data-action="info"]) { cursor: pointer; }
.fft-widget:has(.fft-action[data-action="info"]) :is(a, button, [tabindex]:not([tabindex="-1"])) { cursor: pointer; }
.fft-back { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 8px; cursor: auto; }
.fft-back[hidden] { display: none; }
.fft-back-kicker { margin: 0; font-size: var(--fft-fs-s); line-height: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fft-accent); }
.fft-back-title { margin: 0; font-size: var(--fft-fs-m); line-height: 21px; font-weight: 600; color: var(--fft-text); text-wrap: balance; }
.fft-back-about { margin: 0; font-size: var(--fft-fs-m); line-height: 21px; color: var(--fft-text-secondary); }
.fft-back-list { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 5px 13px; margin: 5px 0; font-size: var(--fft-fs-m); line-height: 18px; }
.fft-back-term { color: var(--fft-muted); }
.fft-back-value { margin: 0; color: var(--fft-text); overflow-wrap: anywhere; }
.fft-back-links { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 3px; font-size: var(--fft-fs-m); line-height: 18px; }
.fft-back-link { color: var(--fft-accent); text-decoration: underline; text-underline-offset: 2px; text-decoration-thickness: 1px; }
.fft-back-link:hover { text-decoration-thickness: 2px; }
.fft-back-tools { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; padding-top: 8px; }
.fft-back-button { font: inherit; font-size: var(--fft-fs-m); min-height: 30px; padding: 4px 13px; border-radius: var(--fft-radius-l); border: 1px solid var(--fft-border); background: transparent; color: var(--fft-text); cursor: pointer; }
.fft-back-button:hover { background: var(--fft-grid); }
.fft-back-button:focus-visible, .fft-back-link:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; }
@media (max-width: 420px) { .fft-back-list { grid-template-columns: minmax(0, 1fr); gap: 0; } .fft-back-value { margin-bottom: 5px; } }
.fft-footer { margin: 0; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); }
/* The bottom row: footer at the left, the ghost ref at the right. */
.fft-base { display: flex; align-items: baseline; gap: 13px; min-width: 0; }
.fft-base[hidden] { display: none; }
.fft-base .fft-footer { flex: 1; min-width: 0; }
/* In a card taller than its content (a dashboard row of even height), the bottom row sits on the card's floor. */
.fft-widget > .fft-base { margin-top: auto; }
/* Ghost ref: the quietest text on the card, kept quiet by size, a light weight and wide spacing rather than by fading,
   so it still reads at 4.5:1; clearer when reached for, a click away from the clipboard. */
.fft-widget-ref {
  /* Its 5px hit padding tucks into the card's own padding; a cardless look (no side padding) sets --fft-ref-inset to 0. */
  margin: 0 calc(-1 * var(--fft-ref-inset, 5px)) 0 auto; padding: 2px 5px; border: 0; border-radius: var(--fft-radius-m); background: none;
  font: 400 10px/13px ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace; letter-spacing: 0.08em;
  color: var(--fft-muted); cursor: copy; white-space: nowrap;
  transition: color 233ms var(--fft-ease), background-color 233ms var(--fft-ease);
}
.fft-widget-ref[hidden] { display: none; }
/* Always in sight: people name a chart by its ref (W-CAV4) when they talk about it, so it never hides behind a hover. */
.fft-widget-ref:hover, .fft-widget-ref:focus-visible { color: var(--fft-text-secondary); background: color-mix(in srgb, var(--fft-text) 6%, transparent); outline: none; }
.fft-widget-ref:focus-visible { box-shadow: 0 0 0 2px var(--fft-accent); }
.fft-widget-ref[data-done]::after { content: " copied"; letter-spacing: 0; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif; }
.fft-widget-ref[data-failed] { color: var(--fft-negative); }
.fft-headline { display: flex; flex-direction: column; gap: 2px; margin-top: -5px; }
.fft-headline-line { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
.fft-headline-value { font-size: var(--fft-fs-xl); line-height: 34px; font-weight: 600; letter-spacing: -0.02em; }
.fft-widget[data-density="compact"] .fft-headline-value { font-size: var(--fft-fs-l); line-height: 21px; }
.fft-headline .fft-kpi-delta { margin-top: 0; font-size: var(--fft-fs-s); }
.fft-headline-caption { font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-text-secondary); }
.fft-area[data-gradient] { fill-opacity: 1; }
.fft-body { position: relative; min-width: 0; transition: opacity 377ms var(--fft-ease); }
.fft-widget[aria-busy="true"] .fft-body { opacity: 0.55; }
.fft-message { margin: 0; padding: 21px 0; text-align: center; color: var(--fft-text-secondary); }
.fft-message ul { margin: 8px 0 0; padding: 0; list-style: none; text-align: left; font-size: var(--fft-fs-s); line-height: 21px; }
/* Taps show the widget's own highlight and tooltip, so iOS's grey tap flash goes. */
.fft-widget { --fft-skeleton: color-mix(in srgb, var(--fft-text) 7%, transparent); -webkit-tap-highlight-color: transparent; }
.fft-widget[data-state="loading"] .fft-message { padding: 0; text-align: left; }
.fft-skeleton { animation: fft-fade 377ms var(--fft-ease) 233ms both; }
.fft-skeleton > *, .fft-skel-row > *, .fft-skel-lane > * { animation: fft-pulse 1597ms ease-in-out infinite; }
.fft-skeleton span { display: block; background: var(--fft-skeleton); border-radius: var(--fft-radius-m); }
.fft-skeleton[data-shape="bars"] { display: flex; align-items: flex-end; justify-content: space-around; gap: 8px; padding: 0 13px; box-shadow: inset 0 -1px 0 var(--fft-skeleton); }
.fft-skeleton[data-shape="bars"] span { width: 21px; border-radius: var(--fft-radius-m) var(--fft-radius-m) 0 0; }
.fft-skeleton[data-shape="bars"] span:nth-child(2n) { animation-delay: min(233ms, 610ms); }
.fft-skeleton[data-shape="rows"] .fft-skel-row { display: flex; justify-content: space-between; align-items: center; height: 34px; background: none; border-radius: 0; box-shadow: inset 0 -1px 0 var(--fft-skeleton); animation: none; }
.fft-skel-row span { height: 8px; }
.fft-skel-row span:first-child { width: 34%; }
.fft-skel-row span:last-child { width: 13%; }
.fft-skeleton[data-shape="stat"] span:first-child { width: 89px; height: 8px; margin: 3px 0 13px; }
.fft-skeleton[data-shape="stat"] span:last-child { width: 144px; height: 34px; border-radius: var(--fft-radius-l); }
.fft-skeleton[data-shape="ring"] { display: flex; justify-content: center; align-items: center; }
.fft-skeleton[data-shape="ring"] span { height: 100%; aspect-ratio: 1; border-radius: 50%; background: none; border: 13px solid var(--fft-skeleton); box-sizing: border-box; }
.fft-skeleton[data-shape="plot"] svg { display: block; width: 100%; height: 100%; }
.fft-skeleton[data-shape="plot"] path { fill: var(--fft-skeleton); }
.fft-skeleton[data-shape="lanes"] { display: flex; flex-direction: column; gap: 13px; padding: 5px 0; }
.fft-skel-lane { display: flex; align-items: center; gap: 13px; background: none; animation: none; }
.fft-skel-lane span:first-child { flex: none; width: 21%; height: 8px; }
.fft-skel-lane span:last-child { height: 13px; border-radius: var(--fft-radius-s); }
.fft-skeleton[data-shape="grid"] { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; }
.fft-skeleton[data-shape="grid"] span { aspect-ratio: 2; border-radius: var(--fft-radius-s); }
.fft-skeleton[data-shape="grid"] span:nth-child(3n) { animation-delay: min(233ms, 610ms); }
.fft-skeleton[data-shape="map"] { display: grid; grid-template-columns: repeat(7, 21px); grid-auto-rows: 21px; gap: 3px; justify-content: center; align-content: center; }
.fft-skeleton[data-shape="map"] span { border-radius: var(--fft-radius-s); }
.fft-skeleton[data-shape="map"] span:nth-child(2n) { animation-delay: min(233ms, 610ms); }
@keyframes fft-pulse { 50% { opacity: 0.38; } }
.fft-state-icon { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; margin-bottom: 8px; border-radius: 50%; background: var(--fft-skeleton); color: var(--fft-text-secondary); }
.fft-state-icon svg { width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.fft-state-icon[data-icon="alert"] { color: var(--fft-warning); background: color-mix(in srgb, var(--fft-warning) 13%, transparent); }
.fft-state-title { margin: 0; color: var(--fft-text); font-size: var(--fft-fs-m); font-weight: 600; }
.fft-state-hint { margin: 3px 0 0; color: var(--fft-text-secondary); font-size: var(--fft-fs-s); }
.fft-widget[data-state="error"] .fft-message ul { max-width: 610px; margin: 13px auto 0; padding: 8px 13px; border-radius: var(--fft-radius-l); background: color-mix(in srgb, var(--fft-text) 4%, transparent); font-family: ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace; }
.fft-message li { overflow-wrap: anywhere; }
.fft-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0;
}

.fft-tooltip {
  /* It takes the pointer, so it can be hovered while it is read (WCAG 1.4.13). */
  position: absolute; z-index: 10;
  --fft-tip-bg: var(--fft-popover, var(--fft-surface));
  min-width: 144px; max-width: 233px; padding: 8px 13px;
  background: var(--fft-tip-bg); color: var(--fft-text);
  border: 1px solid var(--fft-border); border-radius: var(--fft-radius-l);
  box-shadow: 0 5px 21px rgba(0, 0, 0, 0.13);
  font-size: var(--fft-fs-s); line-height: 21px;
  transform: translate(-50%, calc(-100% - 8px));
}
.fft-tooltip[data-placement="below"] { transform: translate(-50%, 8px); }
.fft-tooltip-title { color: var(--fft-text-secondary); }
.fft-tooltip-row { display: flex; align-items: center; gap: 8px; }
.fft-tooltip-key { flex: none; width: 13px; height: 2px; border-radius: var(--fft-radius-s); }
.fft-tooltip-value { font-size: var(--fft-fs-m); font-weight: 600; font-variant-numeric: tabular-nums; }
.fft-tooltip-label { color: var(--fft-text-secondary); }

.fft-table-wrap { max-width: 100%; overflow-x: auto; }
/* More columns to the right: that edge fades out, a cue to swipe. Only the right edge, so the first column always reads. */
.fft-table-wrap:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; border-radius: var(--fft-radius-m); }
.fft-table-wrap[data-more] { -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 34px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 34px), transparent); }
.fft-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.fft-table th {
  padding: 5px 8px; text-align: left; white-space: nowrap;
  font-size: var(--fft-fs-s); font-weight: 500; letter-spacing: 0.02em; color: var(--fft-text-secondary);
  border-bottom: 1px solid var(--fft-axis);
}
.fft-table td { padding: 8px; border-bottom: 1px solid var(--fft-grid); }
.fft-table tbody tr:last-child td { border-bottom: 0; }
.fft-widget[data-density="compact"] .fft-table td { padding: 5px 8px; }
.fft-table .fft-num { text-align: right; }
.fft-table tbody tr { transition: background 377ms var(--fft-ease); }
.fft-table tbody tr:hover, .fft-table tbody tr:focus-visible {
  background: color-mix(in srgb, var(--fft-accent) 7%, transparent); outline: none;
}

.fft-list { margin: 0; padding: 0; list-style: none; }
.fft-item {
  display: flex; align-items: center; justify-content: space-between; gap: 13px;
  padding: 8px 5px; border-bottom: 1px solid var(--fft-grid); border-radius: var(--fft-radius-m);
  transition: background 377ms var(--fft-ease);
}
.fft-widget[data-density="compact"] .fft-item { padding: 5px; }
.fft-item:last-child { border-bottom: 0; }
.fft-item:hover, .fft-item:focus-visible { background: color-mix(in srgb, var(--fft-accent) 7%, transparent); outline: none; }
.fft-item-text { display: flex; flex-direction: column; min-width: 0; }
.fft-item-label { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fft-item-detail { font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-text-secondary); }
.fft-item-value { font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }

.fft-kpi { position: relative; display: flex; flex-direction: column; gap: 3px; }
.fft-kpi-icon {
  position: absolute; top: 0; right: 0; width: 34px; height: 34px; display: grid; place-items: center; border-radius: var(--fft-radius-l);
  color: var(--fft-muted); background: none; width: 21px; height: 21px; opacity: 0.8;
}
.fft-kpi-icon svg { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.fft-facet-legend { margin-bottom: 13px; }
.fft-facets { display: grid; gap: 13px; }
.fft-facet { min-width: 0; padding: 8px 0 0; border-top: 1px solid var(--fft-grid); }
.fft-facet-title { margin: 0 0 5px; font-size: var(--fft-fs-s); line-height: 13px; font-weight: 600; color: var(--fft-text-secondary); }
.fft-kpi-label { color: var(--fft-text-secondary); }
.fft-kpi-value { font-size: var(--fft-fs-xl); line-height: 34px; font-weight: 600; letter-spacing: -0.02em; }
.fft-widget[data-density="compact"] .fft-kpi-value { font-size: var(--fft-fs-l); line-height: 21px; }
.fft-kpi-delta { display: flex; flex-wrap: wrap; align-items: baseline; gap: 5px; margin-top: 5px; font-weight: 500; }
.fft-kpi-delta[data-sentiment="good"] .fft-kpi-change { color: var(--fft-positive); }
.fft-kpi-delta[data-sentiment="bad"] .fft-kpi-change { color: var(--fft-negative); }
.fft-kpi-compare { font-weight: 400; color: var(--fft-text-secondary); }
.fft-sparkline { display: block; margin-top: 8px; overflow: visible; }
.fft-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(144px, 1fr)); }
.fft-stat { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 0 21px; border-left: 1px solid var(--fft-grid); }
/* Sparklines share one baseline across the row, even when a tile carries an extra line such as its target. */
.fft-stat > .fft-sparkline { margin-top: auto; padding-top: 5px; }
.fft-stat:first-child { padding-left: 0; border-left: 0; }
.fft-stat-label { color: var(--fft-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fft-stat-value { font-size: var(--fft-fs-xl); line-height: 34px; font-weight: 600; letter-spacing: -0.02em; }
.fft-widget[data-density="compact"] .fft-stat-value { font-size: var(--fft-fs-l); line-height: 21px; }
.fft-stat .fft-kpi-delta { margin-top: 3px; font-size: var(--fft-fs-s); }
.fft-spark-line { fill: none; stroke: color-mix(in srgb, var(--fft-muted) 70%, transparent); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.fft-spark-end { fill: var(--fft-accent); stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; }

.fft-meters { display: flex; flex-direction: column; gap: 13px; }
.fft-meter { display: flex; flex-direction: column; gap: 5px; border-radius: var(--fft-radius-m); outline: none; }
.fft-meter:focus-visible { box-shadow: 0 0 0 2px var(--fft-ring, var(--fft-surface)), 0 0 0 3px var(--fft-accent); }
.fft-meter-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.fft-meter-label { font-weight: 500; }
.fft-meter-percent { display: inline-flex; align-items: center; gap: 3px; font-weight: 600; font-variant-numeric: tabular-nums; }
.fft-meter-track { height: 8px; border-radius: var(--fft-radius-m); background: color-mix(in srgb, var(--fft-accent) 16%, transparent); overflow: hidden; }
.fft-meter-fill { height: 100%; border-radius: var(--fft-radius-m); background: var(--fft-accent); transform-origin: 0 50%; }
.fft-meter-value { font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); font-variant-numeric: tabular-nums; }
/* Where each meter stands, in target words: how far to go, or a met target in the positive color with a check. */
.fft-meter-foot { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.fft-meter-gap { font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-text-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; }
.fft-meter[data-met] .fft-meter-gap { color: var(--fft-positive); font-weight: 600; }
/* Where a headline number stands against its target, under its change. */
.fft-kpi-target, .fft-stat-target { display: flex; align-items: center; gap: 3px; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-text-secondary); font-variant-numeric: tabular-nums; }
:is(.fft-kpi-target, .fft-stat-target)[data-met] { color: var(--fft-positive); font-weight: 600; }
/* Where a gauge's number stands against its goal, centered under the arc. */
.fft-gauge-standing { display: flex; align-items: center; justify-content: center; gap: 3px; margin: 0; font-size: var(--fft-fs-m); line-height: 21px; color: var(--fft-text-secondary); font-variant-numeric: tabular-nums; }
.fft-gauge-standing[data-met] { color: var(--fft-positive); font-weight: 600; }
/* A met target's check mark, beside its percentage in meters and rings, and before Target met under a gauge. */
.fft-check { flex: none; width: 13px; height: 13px; fill: none; stroke: var(--fft-positive); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.fft-donut { display: flex; flex-wrap: wrap; align-items: center; gap: 21px; }
.fft-donut-figure { position: relative; flex: none; }
.fft-donut-figure svg { display: block; overflow: visible; }
.fft-donut-track { fill: none; stroke: var(--fft-grid); }
.fft-slice { fill: none; transition: opacity 377ms var(--fft-ease); pointer-events: none; }
.fft-donut[data-active] .fft-slice:not([data-active]) { opacity: var(--fft-dim); }
.fft-slice-hit { fill: none; stroke: transparent; cursor: pointer; outline: none; }
.fft-slice-hit:focus-visible { stroke: color-mix(in srgb, var(--fft-accent) 12%, transparent); }
.fft-donut-center {
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  pointer-events: none; text-align: center;
}
.fft-donut-total { font-size: var(--fft-fs-l); line-height: 21px; font-weight: 600; letter-spacing: -0.01em; }
.fft-donut-figure[style*="233px"] .fft-donut-total { font-size: var(--fft-fs-xl); line-height: 34px; }
.fft-donut-figure[style*="377px"] .fft-donut-total { font-size: 55px; line-height: 55px; }
.fft-donut-figure[style*="377px"] .fft-donut-caption { font-size: var(--fft-fs-m); line-height: 21px; }
.fft-donut-caption { margin-top: 3px; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-text-secondary); }
.fft-donut-legend { flex: 1 1 144px; min-width: 144px; max-width: 377px; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.fft-donut-legend li {
  display: grid; grid-template-columns: 8px 1fr auto; grid-template-areas: "dot name name" ". value share";
  align-items: center; column-gap: 8px;
}
.fft-donut-legend .fft-swatch { grid-area: dot; }
.fft-donut-name { grid-area: name; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-text-secondary); overflow-wrap: normal; min-width: 0; }
.fft-donut-value { grid-area: value; font-weight: 600; font-variant-numeric: tabular-nums; }
.fft-donut-share { grid-area: share; text-align: right; font-size: var(--fft-fs-s); color: var(--fft-muted); font-variant-numeric: tabular-nums; }
.fft-donut-figure[data-arc="half"] .fft-donut-center { justify-content: flex-end; padding-bottom: 1px; }
.fft-donut-majority { stroke: var(--fft-text); stroke-width: 1.5; pointer-events: none; }
.fft-donut-majority-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); }
.fft-pie-slice { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; stroke-linejoin: round; cursor: pointer; outline: none; transition: opacity 377ms var(--fft-ease); }
.fft-pie[data-active] .fft-pie-slice:not([data-active]) { opacity: var(--fft-dim); }
.fft-pie-slice:focus-visible { stroke: var(--fft-accent); stroke-width: 3; }
.fft-pie-label { fill: #fff; font-size: var(--fft-fs-s); font-weight: 600; font-variant-numeric: tabular-nums; pointer-events: none; paint-order: stroke; stroke: rgba(0, 0, 0, 0.35); stroke-width: 2px; stroke-linejoin: round; }
.fft-pie-leader { fill: none; stroke: var(--fft-axis); stroke-width: 1; pointer-events: none; }
.fft-pie-name { fill: var(--fft-text); font-size: var(--fft-fs-s); pointer-events: none; }
.fft-pie-name-share { fill: var(--fft-text-secondary); font-variant-numeric: tabular-nums; }

.fft-rings { display: flex; flex-wrap: wrap; align-items: center; gap: 21px; }
.fft-rings-figure { flex: none; }
.fft-rings-figure svg { display: block; overflow: visible; }
.fft-ring { transition: opacity 377ms var(--fft-ease); }
.fft-rings[data-active] .fft-ring:not([data-active]) { opacity: var(--fft-dim); }
.fft-ring-track { fill: none; stroke: var(--fft-ring-color); stroke-opacity: 0.16; }
.fft-ring-arc, .fft-ring-lap { fill: none; stroke: var(--fft-ring-color); stroke-linecap: round; pointer-events: none; }
.fft-ring-lap { filter: brightness(1.18) drop-shadow(0 0 3px rgba(0, 0, 0, 0.5)); }
.fft-ring-hit { fill: none; stroke: transparent; cursor: pointer; outline: none; pointer-events: stroke; }
.fft-ring-hit:focus-visible { stroke: color-mix(in srgb, var(--fft-accent) 16%, transparent); }
.fft-rings-legend { flex: 1 1 144px; min-width: 144px; max-width: 377px; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 13px; }
.fft-rings-legend li { display: grid; grid-template-columns: 8px 1fr auto; grid-template-areas: "dot name percent" ". value value" ". gap gap"; align-items: baseline; column-gap: 8px; }
.fft-rings-legend .fft-swatch { grid-area: dot; align-self: center; }
.fft-rings-name { grid-area: name; font-size: var(--fft-fs-s); color: var(--fft-text-secondary); }
.fft-rings-percent { grid-area: percent; display: inline-flex; align-items: center; gap: 3px; justify-self: end; font-size: var(--fft-fs-l); line-height: 21px; font-weight: 600; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
.fft-rings-value { grid-area: value; font-size: var(--fft-fs-s); color: var(--fft-muted); font-variant-numeric: tabular-nums; }
.fft-rings-gap { grid-area: gap; font-size: var(--fft-fs-s); color: var(--fft-text-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; }
.fft-rings-legend li[data-met] .fft-rings-gap { color: var(--fft-positive); font-weight: 600; }
.fft-gantt { transition: opacity 377ms var(--fft-ease); }
.fft-chart[data-active] .fft-gantt:not([data-active]) { opacity: var(--fft-dim); }
.fft-gantt-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); pointer-events: none; }
.fft-gantt[data-active] .fft-gantt-label { fill: var(--fft-text); }
.fft-gantt-bar { pointer-events: none; transform-box: fill-box; transform-origin: 0 50%; }
.fft-gantt-bar[data-tracked] { fill-opacity: 0.3; }
.fft-gantt-done { pointer-events: none; transform-box: fill-box; transform-origin: 0 50%; }
.fft-gantt-progress { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-gantt-milestone { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; pointer-events: none; }
.fft-gantt-tick { font-size: var(--fft-fs-s); }
.fft-gantt-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-gantt-hit:hover, .fft-gantt-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 6%, transparent); }
.fft-gantt-today { stroke: var(--fft-accent); stroke-width: 1.5; pointer-events: none; }
.fft-gantt-today-label { fill: var(--fft-accent); font-size: var(--fft-fs-s); font-weight: 600; pointer-events: none; }
.fft-waffle { display: flex; flex-wrap: wrap; align-items: center; gap: 21px; }
.fft-waffle > svg { display: block; flex: none; }
.fft-waffle-group { transition: opacity 377ms var(--fft-ease); }
.fft-waffle[data-active] .fft-waffle-group:not([data-active]) { opacity: var(--fft-dim-strong); }
.fft-waffle-cell { cursor: pointer; }
.fft-waffle-empty { fill: color-mix(in srgb, var(--fft-text) 7%, transparent); }
.fft-waffle-legend { flex: 1 1 144px; min-width: 144px; max-width: 377px; margin: 0 5px; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.fft-waffle-legend li { display: grid; grid-template-columns: 8px 1fr auto; grid-template-areas: "dot name name" ". value share"; align-items: center; column-gap: 8px; padding: 3px 5px; margin: -3px -5px; border-radius: var(--fft-radius-m); cursor: pointer; outline: none; }
.fft-waffle-legend li:hover, .fft-waffle-legend li:focus-visible { background: color-mix(in srgb, var(--fft-accent) 8%, transparent); }
.fft-waffle-legend .fft-swatch { grid-area: dot; }
.fft-waffle-name { grid-area: name; font-size: var(--fft-fs-s); color: var(--fft-text-secondary); }
.fft-waffle-value { grid-area: value; font-weight: 600; font-variant-numeric: tabular-nums; }
.fft-waffle-share { grid-area: share; text-align: right; font-size: var(--fft-fs-s); color: var(--fft-muted); font-variant-numeric: tabular-nums; }
/* Ring, rings and waffle on a narrow card (a phone): the legend drops under the figure, so the figure centers and
   each legend entry tightens to one line, name then value then share, instead of two loose rows with the share
   stranded at the far edge. */
.fft-body:has(.fft-donut, .fft-rings, .fft-waffle) { container-type: inline-size; }
@container (max-width: 440px) {
  .fft-donut, .fft-rings, .fft-waffle { justify-content: center; gap: 13px; }
  .fft-donut-legend, .fft-rings-legend, .fft-waffle-legend { flex: 1 1 100%; max-width: none; gap: 5px; }
  .fft-donut-legend li, .fft-waffle-legend li { grid-template-columns: 8px minmax(0, 1fr) auto 34px; grid-template-areas: "dot name value share"; align-items: baseline; }
  .fft-donut-legend .fft-swatch, .fft-waffle-legend .fft-swatch { align-self: center; }
  .fft-donut-name, .fft-waffle-name { font-size: var(--fft-fs-m); line-height: 21px; }
  .fft-rings-legend li { grid-template-areas: "dot name percent" ". value gap"; row-gap: 0; }
  .fft-rings-name { font-size: var(--fft-fs-m); line-height: 21px; }
  .fft-rings-percent { font-size: var(--fft-fs-l); line-height: 21px; }
  .fft-rings-gap { justify-self: end; }
}
.fft-var { --fft-var-color: var(--fft-muted); transition: opacity 377ms var(--fft-ease); }
.fft-var[data-tone="good"] { --fft-var-color: var(--fft-up); }
.fft-var[data-tone="bad"] { --fft-var-color: var(--fft-down); }
.fft-chart[data-active] .fft-var:not([data-active]) { opacity: var(--fft-dim); }
.fft-var-bar { fill: var(--fft-var-color); pointer-events: none; transform-box: fill-box; }
.fft-var-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); pointer-events: none; }
.fft-var[data-active] .fft-var-label { fill: var(--fft-text); }
.fft-var-value { fill: var(--fft-text); font-size: var(--fft-fs-s); font-weight: 600; font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-var-zero { stroke: var(--fft-text-secondary); stroke-width: 1.5; pointer-events: none; }
.fft-var-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-var-hit:hover, .fft-var-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 6%, transparent); }
.fft-gauge { display: flex; flex-direction: column; align-items: center; }
.fft-gauge > svg { display: block; overflow: visible; }
.fft-gauge-track { fill: none; stroke: var(--fft-gauge-color); stroke-opacity: 0.16; stroke-linecap: round; }
.fft-gauge-arc { fill: none; stroke: var(--fft-gauge-color); stroke-linecap: round; pointer-events: none; }
.fft-gauge-target { stroke: var(--fft-text); stroke-width: 2.5; stroke-linecap: round; pointer-events: none; }
.fft-gauge-value { fill: var(--fft-text); font-size: var(--fft-fs-xl); font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-gauge > svg[width="377"] .fft-gauge-value { font-size: 55px; }
.fft-gauge-caption { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); pointer-events: none; }
.fft-gauge-scale { fill: var(--fft-muted); font-size: var(--fft-fs-s); font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-gauge-goal { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-weight: 600; font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-gauge-hit { fill: none; stroke: transparent; stroke-linecap: round; cursor: pointer; outline: none; pointer-events: stroke; }
.fft-gauge-hit:focus-visible { stroke: color-mix(in srgb, var(--fft-accent) 16%, transparent); }
.fft-pareto-line { fill: none; stroke: var(--fft-text-secondary); stroke-width: 2; stroke-linejoin: round; pointer-events: none; }
.fft-pareto-dot { fill: var(--fft-text-secondary); stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; pointer-events: none; }
.fft-box { transition: opacity 377ms var(--fft-ease); }
.fft-chart[data-active] .fft-box:not([data-active]) { opacity: var(--fft-dim); }
.fft-box-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); pointer-events: none; }
.fft-box[data-active] .fft-box-label { fill: var(--fft-text); }
.fft-box-whisker { stroke: var(--fft-text-secondary); stroke-width: 1.5; stroke-linecap: round; pointer-events: none; }
.fft-box-body { fill: var(--fft-box-color); fill-opacity: 0.2; stroke: var(--fft-box-color); stroke-width: 1.5; pointer-events: none; }
.fft-box-median { stroke: var(--fft-box-color); stroke-width: 3; stroke-linecap: round; pointer-events: none; }
.fft-box-outlier { fill: none; stroke: var(--fft-box-color); stroke-width: 1.5; pointer-events: none; }
.fft-box-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-box-hit:hover, .fft-box-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 6%, transparent); }
.fft-likert-seg { pointer-events: none; transition: opacity 377ms var(--fft-ease); }
.fft-chart[data-active] .fft-likert-seg:not([data-active]) { opacity: var(--fft-dim-strong); }
.fft-likert-question { fill: var(--fft-text); font-size: var(--fft-fs-s); font-weight: 600; pointer-events: none; }
.fft-likert-end { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-weight: 600; font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-likert-center { stroke: var(--fft-text-secondary); stroke-width: 1.5; pointer-events: none; }
.fft-likert-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-likert-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 8%, transparent); }
.fft-candle { --fft-candle-color: var(--fft-up); transition: opacity 377ms var(--fft-ease); }
.fft-candle[data-tone="down"] { --fft-candle-color: var(--fft-down); }
.fft-chart[data-active] .fft-candle:not([data-active]) { opacity: var(--fft-dim); }
.fft-candle-wick { stroke: var(--fft-candle-color); stroke-width: 1.5; pointer-events: none; }
.fft-candle-body { fill: var(--fft-candle-color); pointer-events: none; }
/* Up candles are hollow, down candles filled: direction reads without color (WCAG 1.4.1). */
.fft-candle[data-tone="up"] .fft-candle-body { fill: var(--fft-ring, var(--fft-surface)); stroke: var(--fft-candle-color); stroke-width: 1.5; }
.fft-candle-average { fill: none; stroke: var(--fft-text-secondary); stroke-width: 1.5; stroke-linejoin: round; pointer-events: none; }
.fft-candle-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-candle-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 8%, transparent); }
.fft-sun-seg { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 1.5; pointer-events: none; transition: opacity 377ms var(--fft-ease); }
.fft-sun[data-active] .fft-sun-seg:not([data-active]) { opacity: var(--fft-dim-strong); }
.fft-sun .fft-donut-center { padding: 0 25%; }
.fft-sun .fft-donut-caption { overflow-wrap: normal; }
.fft-sun-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-sun-hit:focus-visible { stroke: var(--fft-accent); stroke-width: 2; }
.fft-chord-ribbon { fill-opacity: 0.55; stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 0.5; pointer-events: none; transition: fill-opacity 377ms var(--fft-ease); }
.fft-chord[data-active] .fft-chord-ribbon { fill-opacity: 0.08; }
.fft-chord[data-active] .fft-chord-ribbon[data-active] { fill-opacity: 0.72; }
.fft-chord-arc { pointer-events: none; }
.fft-chord-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); pointer-events: none; }
.fft-chord-hit, .fft-chord-arc-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-chord-hit:focus-visible, .fft-chord-arc-hit:focus-visible { stroke: var(--fft-accent); stroke-width: 2; }
.fft-radar-ring { fill: none; stroke: var(--fft-grid); stroke-width: 1; pointer-events: none; }
.fft-radar-spoke { stroke: var(--fft-grid); stroke-width: 1; pointer-events: none; transition: stroke 233ms var(--fft-ease); }
.fft-radar-spoke[data-active] { stroke: var(--fft-text-secondary); stroke-width: 1.5; }
.fft-radar-tick { fill: var(--fft-muted); font-size: var(--fft-fs-xs); font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-radar-axis { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); pointer-events: none; }
.fft-radar-shape { fill: var(--fft-radar-color); fill-opacity: 0.16; stroke: var(--fft-radar-color); stroke-width: 2; stroke-linejoin: round; pointer-events: none; }
.fft-radar-dot { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 1.5; pointer-events: none; }
.fft-radar-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-radar-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 6%, transparent); }
/* Icicle: tinted cells with a full-color edge, names in text ink; a pointed cell keeps its lineage lit. */
.fft-ice-cell { transition: opacity 377ms var(--fft-ease); }
.fft-ice { pointer-events: none; }
.fft-ice[data-root] { fill: var(--fft-text); fill-opacity: 0.06; }
.fft-ice-edge { pointer-events: none; }
.fft-ice-name { fill: var(--fft-text); font-size: var(--fft-fs-s); font-weight: 600; pointer-events: none; }
.fft-ice-value { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-icicle[data-active] .fft-ice-cell:not([data-active]) { opacity: var(--fft-dim); }
.fft-ice-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-ice-hit:focus-visible { stroke: var(--fft-accent); stroke-width: 2; }
/* Horizon: thin rows on a faint track, bands deepening with distance, a compact key above. */
.fft-horizon-key { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 13px; margin-bottom: 8px; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-text-secondary); }
.fft-horizon-ramp { display: inline-flex; gap: 1px; margin-left: -8px; }
.fft-horizon-swatch { width: 13px; height: 8px; border-radius: var(--fft-radius-s); }
.fft-horizon-track { fill: color-mix(in srgb, var(--fft-text) 3%, transparent); pointer-events: none; }
.fft-horizon-band { stroke: none; pointer-events: none; }
.fft-horizon-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); pointer-events: none; }
.fft-horizon-hit { fill: transparent; outline: none; cursor: pointer; }
.fft-horizon-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 6%, transparent); }
/* Rose: hairline rings, wedges parted by the card color, the pointed wedge kept while the rest step back. */
.fft-rose-ring { fill: none; stroke: var(--fft-grid); stroke-width: 1; pointer-events: none; }
.fft-rose-seg { fill-opacity: 0.88; stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 1.5; stroke-linejoin: round; pointer-events: none; transition: opacity 377ms var(--fft-ease); }
.fft-rose[data-active] .fft-rose-wedge:not([data-active]) .fft-rose-seg { opacity: var(--fft-dim); }
.fft-rose-tick { fill: var(--fft-muted); font-size: var(--fft-fs-xs); font-variant-numeric: tabular-nums; paint-order: stroke; stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 3; stroke-linejoin: round; pointer-events: none; transition: opacity 233ms var(--fft-ease); }
/* While a wedge is pointed at, its tooltip carries the exact numbers: the scale steps back, so nothing sits under the tooltip. */
.fft-rose[data-active] .fft-rose-tick { opacity: 0; }
.fft-rose-anchor { fill: none; stroke: none; pointer-events: none; }
.fft-rose-axis { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-rose-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-rose-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 6%, transparent); }
.fft-point-bubble { fill-opacity: 0.62; stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 1.5; }
.fft-scatter-size { color: var(--fft-muted); }
.fft-cell-bar { display: inline-grid; grid-template-columns: minmax(34px, 89px) auto; align-items: center; gap: 8px; width: 100%; justify-content: end; }
.fft-cell-bar-track { display: block; height: 8px; border-radius: var(--fft-radius-s); background: color-mix(in srgb, var(--fft-accent) 12%, transparent); overflow: hidden; }
.fft-cell-bar-fill { display: block; height: 100%; border-radius: var(--fft-radius-s); background: var(--fft-accent); transform-origin: 0 50%; }
.fft-cell-bar[data-negative] .fft-cell-bar-fill { background: var(--fft-down); }
.fft-cell-bar-value { font-variant-numeric: tabular-nums; text-align: right; min-width: 55px; }
/* A narrow table keeps the numbers and lets the bars go, rather than scroll sideways. */
.fft-table-wrap { container-type: inline-size; }
@container (max-width: 420px) {
  .fft-cell-bar { grid-template-columns: auto; }
  .fft-cell-bar-track { display: none; }
  .fft-table :is(th, td) { padding-inline: 5px; }
  .fft-table :is(th, td):first-child { padding-left: 0; }
  .fft-table :is(th, td):last-child { padding-right: 0; }
}
.fft-sort { all: unset; display: inline-flex; align-items: center; gap: 3px; cursor: pointer; border-radius: var(--fft-radius-m); }
.fft-sort::after { content: ""; width: 8px; font-size: var(--fft-fs-xs); line-height: 1; opacity: 0.38; }
th[aria-sort="ascending"] .fft-sort::after { content: "▲"; opacity: 1; }
th[aria-sort="descending"] .fft-sort::after { content: "▼"; opacity: 1; }
th:not([aria-sort]) .fft-sort:hover::after { content: "▲"; }
.fft-sort:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; }
th.fft-num .fft-sort { flex-direction: row-reverse; }
.fft-table tfoot td { border-top: 1px solid var(--fft-axis); font-weight: 600; color: var(--fft-text); padding-top: 8px; }
.fft-delta-cell { display: inline-flex; align-items: baseline; gap: 3px; font-weight: 500; font-variant-numeric: tabular-nums; color: var(--fft-text-secondary); }
.fft-delta-cell[data-tone="good"] { color: var(--fft-positive); }
.fft-delta-cell[data-tone="bad"] { color: var(--fft-negative); }
.fft-delta-arrow { font-size: 0.75em; }
.fft-heat-cell { display: inline-block; min-width: 55px; padding: 2px 8px; border-radius: var(--fft-radius-s); text-align: right; font-variant-numeric: tabular-nums; }
.fft-heat-cell[data-step="1"] { background: var(--fft-seq-1); color: var(--fft-seq-text-1); }
.fft-heat-cell[data-step="2"] { background: var(--fft-seq-2); color: var(--fft-seq-text-2); }
.fft-heat-cell[data-step="3"] { background: var(--fft-seq-3); color: var(--fft-seq-text-3); }
.fft-heat-cell[data-step="4"] { background: var(--fft-seq-4); color: var(--fft-seq-text-4); }
.fft-heat-cell[data-step="5"] { background: var(--fft-seq-5); color: var(--fft-seq-text-5); }
.fft-heat-cell[data-step="6"] { background: var(--fft-seq-6); color: var(--fft-seq-text-6); }
.fft-heat-cell[data-step="7"] { background: var(--fft-seq-7); color: var(--fft-seq-text-7); }
.fft-hbars { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.fft-hbar {
  display: grid; grid-template-columns: minmax(55px, 38%) 1fr minmax(34px, auto); align-items: center; gap: 8px;
  border-radius: var(--fft-radius-m); outline: none; cursor: pointer;
}
.fft-hbar:focus-visible { box-shadow: 0 0 0 2px var(--fft-ring, var(--fft-surface)), 0 0 0 3px var(--fft-accent); }
.fft-hbar-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--fft-text-secondary); }
.fft-hbar-track { height: 13px; }
.fft-hbar-fill { height: 100%; border-radius: var(--fft-radius-s) var(--fft-radius-m) var(--fft-radius-m) var(--fft-radius-s); transform-origin: 0 50%; transition: opacity 377ms var(--fft-ease); }
.fft-hbars[data-active] .fft-hbar:not([data-active]) .fft-hbar-fill { opacity: var(--fft-dim); }
.fft-hbar-value { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
/* Lollipop rankings: a hairline guide, a 2px stem, an 11px dot ringed in the card color. */
.fft-hbars[data-mark="lollipop"] .fft-hbar-track { position: relative; }
.fft-hbars[data-mark="lollipop"] .fft-hbar-fill { height: 2px; margin-top: 5.5px; border-radius: var(--fft-radius-s); }
.fft-hbar-dot { position: absolute; top: 50%; width: 11px; height: 11px; margin: -5.5px 0 0 -5.5px; border-radius: 50%; box-shadow: 0 0 0 2px var(--fft-ring, var(--fft-surface)); transition: opacity 377ms var(--fft-ease); }
.fft-hbars[data-active] .fft-hbar:not([data-active]) .fft-hbar-dot { opacity: var(--fft-dim); }

.fft-step { transition: opacity 377ms var(--fft-ease); transform-box: fill-box; transform-origin: 50% 100%; }
.fft-step[data-kind="up"] { fill: var(--fft-up); }
.fft-step[data-kind="down"] { fill: var(--fft-down); }
.fft-step[data-kind="total"] { fill: var(--fft-total); }
.fft-chart[data-active] .fft-step:not([data-active]) { opacity: var(--fft-dim); }
.fft-step-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-weight: 600; font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-connector { stroke: var(--fft-axis); stroke-width: 1; shape-rendering: crispEdges; pointer-events: none; }

.fft-heat { display: flex; flex-direction: column; gap: 13px; }
.fft-heatmap { display: grid; gap: 2px; align-items: stretch; }
.fft-heat-col { font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); text-align: center; padding-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fft-heat-row { font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-text-secondary); padding-right: 8px; display: flex; align-items: center; }
.fft-cell {
  min-height: 34px; border-radius: var(--fft-radius-s); display: grid; place-items: center;
  font-size: var(--fft-fs-s); font-weight: 500; font-variant-numeric: tabular-nums; outline: none; cursor: pointer;
  transition: box-shadow 377ms var(--fft-ease);
}
.fft-widget[data-density="compact"] .fft-cell { min-height: 21px; }
.fft-cell:hover, .fft-cell:focus-visible { box-shadow: 0 0 0 2px var(--fft-ring, var(--fft-surface)), 0 0 0 3px var(--fft-accent); }
.fft-cell-empty { background: transparent; box-shadow: inset 0 0 0 1px var(--fft-grid); cursor: default; }
.fft-heatmap .fft-cell[data-step="1"], .fft-heat-ramp [data-step="1"] { background: var(--fft-seq-1); color: var(--fft-seq-text-1); }
.fft-heatmap .fft-cell[data-step="2"], .fft-heat-ramp [data-step="2"] { background: var(--fft-seq-2); color: var(--fft-seq-text-2); }
.fft-heatmap .fft-cell[data-step="3"], .fft-heat-ramp [data-step="3"] { background: var(--fft-seq-3); color: var(--fft-seq-text-3); }
.fft-heatmap .fft-cell[data-step="4"], .fft-heat-ramp [data-step="4"] { background: var(--fft-seq-4); color: var(--fft-seq-text-4); }
.fft-heatmap .fft-cell[data-step="5"], .fft-heat-ramp [data-step="5"] { background: var(--fft-seq-5); color: var(--fft-seq-text-5); }
.fft-heatmap .fft-cell[data-step="6"], .fft-heat-ramp [data-step="6"] { background: var(--fft-seq-6); color: var(--fft-seq-text-6); }
.fft-heatmap .fft-cell[data-step="7"], .fft-heat-ramp [data-step="7"] { background: var(--fft-seq-7); color: var(--fft-seq-text-7); }
.fft-calendar { display: block; max-width: 100%; overflow: visible; }
.fft-day { outline: none; cursor: pointer; }
.fft-day[data-step="1"] { fill: var(--fft-seq-1); }
.fft-day[data-step="2"] { fill: var(--fft-seq-2); }
.fft-day[data-step="3"] { fill: var(--fft-seq-3); }
.fft-day[data-step="4"] { fill: var(--fft-seq-4); }
.fft-day[data-step="5"] { fill: var(--fft-seq-5); }
.fft-day[data-step="6"] { fill: var(--fft-seq-6); }
.fft-day[data-step="7"] { fill: var(--fft-seq-7); }
.fft-day-empty { fill: var(--fft-grid); cursor: default; }
.fft-day:hover, .fft-day:focus-visible { stroke: var(--fft-accent); stroke-width: 2; }
.fft-cal-month, .fft-cal-weekday { fill: var(--fft-muted); font-size: var(--fft-fs-s); }
.fft-heat-legend { display: flex; align-items: center; gap: 8px; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); font-variant-numeric: tabular-nums; }
.fft-heat-ramp { display: flex; gap: 2px; }
.fft-heat-ramp div { width: 21px; height: 8px; border-radius: var(--fft-radius-s); }

.fft-badge {
  display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px 2px 5px; border-radius: var(--fft-radius-pill);
  font-size: var(--fft-fs-s); line-height: 13px; font-weight: 500; white-space: nowrap;
  --fft-tone: var(--fft-muted);
  /* The tone deepened toward the text color, so it reads at 4.5:1 on its own tint in every theme. */
  color: color-mix(in srgb, var(--fft-tone) 72%, var(--fft-text));
  background: color-mix(in srgb, var(--fft-tone) 13%, transparent);
}
.fft-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.fft-badge[data-tone="positive"] { --fft-tone: var(--fft-positive); }
.fft-badge[data-tone="warning"] { --fft-tone: var(--fft-warning); }
.fft-badge[data-tone="negative"] { --fft-tone: var(--fft-negative); }
.fft-badge[data-tone="accent"] { --fft-tone: var(--fft-accent); }
.fft-badge[data-tone="neutral"] { --fft-tone: var(--fft-text-secondary); }

.fft-chart { position: relative; }
.fft-chart svg { display: block; overflow: visible; }
.fft-gridline { stroke: var(--fft-grid); stroke-width: 1; shape-rendering: crispEdges; }
.fft-baseline { stroke: var(--fft-axis); stroke-width: 1; shape-rendering: crispEdges; }
.fft-tick { fill: var(--fft-muted); font-size: var(--fft-fs-s); font-variant-numeric: tabular-nums; }
.fft-bar { transition: opacity 377ms var(--fft-ease); transform-box: fill-box; transform-origin: 50% 100%; }
.fft-bar[data-negative] { transform-origin: 50% 0; }
.fft-chart[data-active] .fft-marks:not([data-active]) .fft-bar { opacity: var(--fft-dim); }
.fft-lolli-stem { stroke-width: 2; stroke-linecap: round; transition: opacity 377ms var(--fft-ease); transform-box: fill-box; transform-origin: 50% 100%; }
.fft-lolli-dot { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; transition: opacity 377ms var(--fft-ease); }
.fft-chart[data-active] .fft-marks:not([data-active]) :is(.fft-lolli-stem, .fft-lolli-dot) { opacity: var(--fft-dim); }
.fft-line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.fft-area { fill-opacity: 0.1; stroke: none; pointer-events: none; }
.fft-area[data-stacked] { fill-opacity: 0.34; }
/* Streams: fuller bands parted by a hairline of the card, each named inside itself in text ink. */
.fft-area[data-stream] { fill-opacity: var(--fft-stream-fill, 0.62); stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 1.5; stroke-linejoin: round; transition: fill-opacity 377ms var(--fft-ease); }
.fft-chart[data-active] .fft-area[data-stream] { fill-opacity: calc(var(--fft-stream-fill, 0.62) - 0.12); }
/* Forecast fans: a faint zone after the last actual, a soft band, dashed forecasts ending on a hollow dot. */
.fft-forecast-zone { fill: var(--fft-text); fill-opacity: 0.035; pointer-events: none; }
.fft-forecast-divider { stroke: var(--fft-text-secondary); stroke-opacity: 0.55; stroke-width: 1; stroke-dasharray: 2 3; pointer-events: none; }
.fft-forecast-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; pointer-events: none; }
.fft-forecast-note { font-weight: 400; letter-spacing: 0; text-transform: none; }
.fft-band { fill-opacity: 0.16; stroke: none; pointer-events: none; }
.fft-area[data-forecast] { opacity: 0.5; }
.fft-line[data-forecast] { stroke-dasharray: 5 5; }
.fft-band-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-stream-label { fill: var(--fft-text); font-size: var(--fft-fs-s); font-weight: 600; letter-spacing: 0.01em; pointer-events: none; }
.fft-dot { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; pointer-events: none; }
.fft-bar-track { pointer-events: none; }
.fft-end-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-weight: 600; font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-point { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; transition: opacity 377ms var(--fft-ease); pointer-events: none; }
.fft-chart[data-active] .fft-point:not([data-active]) { opacity: var(--fft-dim); }
.fft-point-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-point-hit:focus-visible { stroke: var(--fft-accent); stroke-width: 2; }
.fft-axis-title { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-weight: 500; }
.fft-spark { display: inline-block; vertical-align: middle; overflow: visible; }
.fft-spark path { fill: none; stroke: color-mix(in srgb, var(--fft-muted) 85%, transparent); stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round; }
.fft-spark circle { fill: var(--fft-accent); }
.fft-spark rect { fill: var(--fft-deemphasis); }
.fft-spark rect:last-of-type { fill: var(--fft-accent); }
.fft-ref { stroke: var(--fft-text-secondary); stroke-width: 1.5; stroke-dasharray: 5 3; pointer-events: none; }
.fft-ref-band { fill: color-mix(in srgb, var(--fft-text) 5%, transparent); pointer-events: none; }
.fft-ref-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-weight: 600; font-variant-numeric: tabular-nums; pointer-events: none; }
/* Every row shares one set of columns (subgrid), so a check by one number never shortens that row's track: bars on one scale. */
.fft-bullets { display: grid; grid-template-columns: minmax(55px, 30%) 1fr minmax(34px, auto); gap: 13px 8px; }
.fft-bullet {
  display: grid; grid-column: 1 / -1; grid-template-columns: subgrid; align-items: center;
  border-radius: var(--fft-radius-m); outline: none; cursor: pointer;
}
@supports not (grid-template-columns: subgrid) {
  .fft-bullet { grid-template-columns: minmax(55px, 30%) 1fr 89px; column-gap: 8px; }
}
.fft-bullet:focus-visible { box-shadow: 0 0 0 2px var(--fft-ring, var(--fft-surface)), 0 0 0 3px var(--fft-accent); }
.fft-bullet > svg { display: block; width: 100%; height: 21px; overflow: visible; }
.fft-bullet-band[data-band="1"] { fill: color-mix(in srgb, var(--fft-text) 18%, transparent); }
.fft-bullet-band[data-band="2"] { fill: color-mix(in srgb, var(--fft-text) 11%, transparent); }
.fft-bullet-band[data-band="3"] { fill: color-mix(in srgb, var(--fft-text) 5%, transparent); }
.fft-bullet-value { fill: var(--fft-accent); transform-box: fill-box; transform-origin: 0 50%; }
.fft-bullet-target { stroke: var(--fft-text); stroke-width: 2; stroke-linecap: round; }
.fft-bullet-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--fft-text-secondary); }
.fft-bullet-number { display: inline-flex; align-items: center; justify-content: flex-end; gap: 3px; font-weight: 600; font-variant-numeric: tabular-nums; }
/* Checks line up in one column at the start of the numbers, whatever each number's width. */
.fft-bullet-number .fft-check { margin-right: auto; }
.fft-tile { fill-opacity: 0.2; transition: opacity 377ms var(--fft-ease), fill-opacity 377ms var(--fft-ease); pointer-events: none; }
.fft-tile[data-active] { fill-opacity: 0.32; }
.fft-tile-edge { pointer-events: none; }
.fft-chart[data-active] .fft-tile:not([data-active]) { opacity: var(--fft-dim); }
.fft-tile-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-tile-hit:focus-visible { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 3; }
.fft-tile-name { fill: var(--fft-text); font-size: var(--fft-fs-s); font-weight: 600; pointer-events: none; }
.fft-tile-value { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-funnel { display: flex; flex-direction: column; }
.fft-funnel-row {
  display: grid; grid-template-columns: minmax(55px, 25%) 1fr minmax(55px, auto); align-items: center; gap: 13px;
  padding: 3px 0; border-radius: var(--fft-radius-m); outline: none; cursor: pointer;
}
.fft-funnel-row:focus-visible { box-shadow: 0 0 0 2px var(--fft-ring, var(--fft-surface)), 0 0 0 3px var(--fft-accent); }
.fft-funnel-label { color: var(--fft-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fft-funnel-track { display: flex; justify-content: center; }
.fft-funnel-bar { height: 21px; border-radius: var(--fft-radius-m); background: var(--fft-accent); transform-origin: 50% 50%; }
.fft-funnel-nums { display: flex; gap: 8px; justify-content: flex-end; align-items: baseline; font-variant-numeric: tabular-nums; }
.fft-funnel-value { font-weight: 600; }
.fft-funnel-share { min-width: 34px; text-align: right; font-size: var(--fft-fs-s); color: var(--fft-muted); }
.fft-funnel-step { text-align: center; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); padding: 2px 0; margin-left: calc(25% + 13px); margin-right: calc(55px + 13px); }
.fft-bee { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 1.5; transition: opacity 377ms var(--fft-ease); pointer-events: none; }
.fft-chart[data-active] .fft-bee:not([data-active]) { opacity: var(--fft-dim); }
.fft-bee-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-bee-hit:focus-visible { stroke: var(--fft-accent); stroke-width: 2; }
.fft-swarm-group { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); }
.fft-ribbon { fill-opacity: 0.34; transition: fill-opacity 377ms var(--fft-ease); pointer-events: none; }
.fft-chart[data-active] .fft-ribbon { fill-opacity: 0.13; }
.fft-chart[data-active] .fft-ribbon[data-active] { fill-opacity: 0.55; }
.fft-ribbon-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-ribbon-hit:focus-visible { stroke: var(--fft-accent); stroke-width: 1.5; }
.fft-node { pointer-events: none; }
.fft-node-label { fill: var(--fft-text); font-size: var(--fft-fs-s); font-weight: 600; pointer-events: none; }
.fft-node-value { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-db-line { stroke: var(--fft-axis); stroke-width: 2; stroke-linecap: round; pointer-events: none; }
.fft-db-from { fill: var(--fft-muted); stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; pointer-events: none; }
.fft-db-to { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; pointer-events: none; }
.fft-db-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); }
.fft-db-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-db-hit:hover, .fft-db-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 6%, transparent); }
.fft-db-key-from { background: var(--fft-muted); }
.fft-db-row { --fft-db-color: var(--fft-axis); }
.fft-db-row[data-direction="up"] { --fft-db-color: var(--fft-up); }
.fft-db-row[data-direction="down"] { --fft-db-color: var(--fft-down); }
.fft-db-shaft { stroke: var(--fft-db-color); stroke-width: 2; stroke-linecap: butt; pointer-events: none; }
.fft-db-head { fill: var(--fft-db-color); pointer-events: none; }
.fft-db-still { fill: var(--fft-surface); stroke: var(--fft-db-color); stroke-width: 2; pointer-events: none; }
.fft-db-key-up { background: var(--fft-up); }
.fft-db-key-down { background: var(--fft-down); }
.fft-chart[data-mark="arrow"] .fft-db-from { fill: var(--fft-muted); }
.fft-slope-axis { stroke: var(--fft-axis); stroke-width: 1; }
.fft-slope-head { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-weight: 600; letter-spacing: 0.02em; }
.fft-slope { --fft-slope-color: var(--fft-muted); }
.fft-slope[data-direction="up"] { --fft-slope-color: var(--fft-up); }
.fft-slope[data-direction="down"] { --fft-slope-color: var(--fft-down); }
.fft-slope[data-muted] { --fft-slope-color: var(--fft-deemphasis); }
.fft-slope-line { fill: none; stroke: var(--fft-slope-color); stroke-width: 2; stroke-linecap: round; pointer-events: none; transition: opacity 233ms var(--fft-ease); }
.fft-slope-dot { fill: var(--fft-slope-color); stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; pointer-events: none; transition: opacity 233ms var(--fft-ease); }
.fft-slope-label { font-size: var(--fft-fs-s); font-variant-numeric: tabular-nums; pointer-events: none; transition: opacity 233ms var(--fft-ease); }
.fft-slope-name { fill: var(--fft-text-secondary); }
.fft-slope-value { fill: var(--fft-text); font-weight: 600; }
.fft-slope[data-muted] .fft-slope-label, .fft-slope[data-muted] .fft-slope-label tspan { fill: var(--fft-muted); }
.fft-slope-hit { fill: none; stroke: transparent; stroke-width: 13; stroke-linecap: round; cursor: pointer; outline: none; pointer-events: stroke; }
.fft-slope-hit:focus-visible { stroke: color-mix(in srgb, var(--fft-accent) 21%, transparent); }
.fft-chart[data-active] .fft-slope:not([data-active]) :is(.fft-slope-line, .fft-slope-dot, .fft-slope-label) { opacity: var(--fft-dim-strong); }
.fft-slope[data-active] .fft-slope-line { stroke-width: 3; }
.fft-bump-line { fill: none; stroke-width: 2; stroke-linecap: round; pointer-events: none; transition: opacity 233ms var(--fft-ease), stroke-width 233ms var(--fft-ease); }
.fft-bump-dot { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; pointer-events: none; transition: opacity 233ms var(--fft-ease); }
.fft-bump-label { font-size: var(--fft-fs-s); font-variant-numeric: tabular-nums; pointer-events: none; transition: opacity 233ms var(--fft-ease); }
.fft-bump-name { fill: var(--fft-text-secondary); }
.fft-bump-rank { fill: var(--fft-text); font-weight: 600; }
.fft-bump[data-muted] .fft-bump-label, .fft-bump[data-muted] .fft-bump-label tspan { fill: var(--fft-muted); }
.fft-bump-hit { fill: none; stroke: transparent; stroke-width: 13; stroke-linecap: round; cursor: pointer; outline: none; pointer-events: stroke; }
.fft-bump-hit:focus-visible { stroke: color-mix(in srgb, var(--fft-accent) 21%, transparent); }
.fft-chart[data-active] .fft-bump:not([data-active]) :is(.fft-bump-line, .fft-bump-dot, .fft-bump-label) { opacity: var(--fft-dim-strong); }
.fft-bump[data-active] .fft-bump-line { stroke-width: 3; }
.fft-mekko { transition: opacity 377ms var(--fft-ease); }
.fft-chart[data-active] .fft-hist:not([data-active]) .fft-hist-bar { opacity: var(--fft-dim); }
.fft-hist-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-hist-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 8%, transparent); }
.fft-dot-line { stroke: var(--fft-grid); stroke-width: 1; shape-rendering: crispEdges; pointer-events: none; }
.fft-dot-mark { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; pointer-events: none; transition: opacity 377ms var(--fft-ease); }
.fft-dot-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); }
.fft-dot-value { fill: var(--fft-text); font-size: var(--fft-fs-s); font-weight: 600; font-variant-numeric: tabular-nums; pointer-events: none; transition: opacity 377ms var(--fft-ease); }
.fft-dot-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-dot-hit:hover, .fft-dot-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 6%, transparent); }
.fft-dots[data-active] .fft-dot-row:not([data-active]) :is(.fft-dot-mark, .fft-dot-value) { opacity: var(--fft-dim); }
.fft-mekko-seg { fill-opacity: 0.24; pointer-events: none; transition: fill-opacity 377ms var(--fft-ease); }
.fft-mekko[data-active] .fft-mekko-seg { fill-opacity: 0.38; }
.fft-chart[data-active] .fft-mekko:not([data-active]) { opacity: var(--fft-dim); }
.fft-mekko-edge { pointer-events: none; }
.fft-mekko-name { fill: var(--fft-text); font-size: var(--fft-fs-s); font-weight: 600; pointer-events: none; }
.fft-mekko-share { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-mekko-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-mekko-hit:focus-visible { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 3; }
.fft-mekko-column { font-size: var(--fft-fs-s); }
.fft-mekko-column-name { fill: var(--fft-text-secondary); }
.fft-mekko-column-total { fill: var(--fft-text); font-weight: 600; font-variant-numeric: tabular-nums; }
.fft-ridge-mask { fill: var(--fft-ring, var(--fft-surface)); pointer-events: none; }
.fft-ridge-area { fill-opacity: 0.22; pointer-events: none; }
.fft-ridge-line { fill: none; stroke-width: 1.5; stroke-linejoin: round; pointer-events: none; }
.fft-ridge { transition: opacity 377ms var(--fft-ease); }
.fft-chart[data-active] .fft-ridge:not([data-active]) { opacity: var(--fft-dim); }
.fft-ridge-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); }
.fft-ridge-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-ridge-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 6%, transparent); }
.fft-crosshair { stroke: var(--fft-axis); stroke-width: 1; shape-rendering: crispEdges; pointer-events: none; }
.fft-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 8%, transparent); }
.fft-legend {
  display: flex; flex-wrap: wrap; gap: 5px 13px; margin: 0 0 8px; padding: 0;
  list-style: none; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-text-secondary);
}
.fft-legend li { display: inline-flex; align-items: center; gap: 5px; }
.fft-swatch { width: 8px; height: 8px; border-radius: var(--fft-radius-s); }
.fft-swatch[data-shape="line"] { width: 13px; height: 2px; border-radius: var(--fft-radius-s); }
.fft-swatch[data-shape="dot"] { border-radius: 50%; }
.fft-swatch[data-shape="ring"] { border-radius: 50%; background: transparent; }
.fft-swatch[data-tone="muted"] { opacity: var(--fft-dim); }
.fft-legend[data-place="below"] { order: 1; }

/* Dashboard: a grid of widget cells with one filter row; carries its own tokens for the controls. */
.fft-dashboard {${LIGHT}
  --fft-ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  display: flex; flex-direction: column; gap: 21px; color: var(--fft-text);
  font: 13px/21px -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .fft-dashboard {${DARK}} }
:root[data-theme="dark"] .fft-dashboard {${DARK}}
/* A preset with its own color scheme wins over the theme, so the filter row matches the cards (doubled :root outranks the theme rules). */
:root:root .fft-dashboard[data-scheme="light"] {${LIGHT}}
:root:root .fft-dashboard[data-scheme="dark"] {${DARK}}
.fft-dashboard-header { display: flex; flex-direction: column; gap: 3px; }
.fft-dashboard-title { margin: 0; font-size: var(--fft-fs-l); line-height: 34px; font-weight: 600; letter-spacing: -0.01em; }
.fft-dashboard-subtitle { margin: 0; color: var(--fft-text-secondary); }
/* The filter row: one shape language for every control in it. Each is --fft-control-h tall (30px, 34px on touch),
   a rounded field, a pill or a segmented track; nothing square, nothing with a hard frame. */
.fft-dashboard { --fft-control-h: 30px; --fft-control-line: color-mix(in srgb, var(--fft-text) 13%, transparent); --fft-control-fill: color-mix(in srgb, var(--fft-text) 5%, transparent); }
@media (pointer: coarse) { .fft-dashboard { --fft-control-h: 34px; } }
.fft-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 13px; }
.fft-filters[hidden] { display: none; }
/* Sticky: the row pins to the top, above the cells' hover controls (z 5) and below tooltips (z 10). The host sets
   --fft-sticky-top to the height of its own pinned header, if it has one, so the row pins just under it. The host sets
   --fft-board-bg to its own background; the negative margin keeps the layout, the padding keeps controls off the edge. */
.fft-dashboard[data-sticky] .fft-filters {
  position: sticky; top: calc(var(--fft-sticky-top, 0px) + env(safe-area-inset-top, 0px)); z-index: 8; margin: -8px; padding: 8px;
  border-radius: var(--fft-radius-l);
  background: var(--fft-board-bg, color-mix(in srgb, var(--fft-surface) 92%, transparent));
  -webkit-backdrop-filter: blur(13px) saturate(1.2); backdrop-filter: blur(13px) saturate(1.2);
}
/* The marker before the row takes no room: its negative margin cancels the column gap it adds. */
.fft-filters-sentinel { height: 0; margin-bottom: -21px; }
.fft-dashboard[data-sticky] .fft-filters { transition: box-shadow 233ms var(--fft-ease); }
.fft-dashboard[data-sticky] .fft-filters[data-stuck] { border-radius: 0 0 var(--fft-radius-l) var(--fft-radius-l); box-shadow: 0 1px 0 var(--fft-border), 0 13px 21px -13px rgba(0, 0, 0, 0.34); }
.fft-filter { display: inline-flex; align-items: center; gap: 8px; color: var(--fft-text-secondary); }
/* A select is a rounded field with a quiet chevron drawn in the secondary ink (two gradients, so it follows the theme). */
.fft-filter select {
  -webkit-appearance: none; appearance: none; box-sizing: border-box;
  height: var(--fft-control-h); min-width: 89px; padding: 0 29px 0 11px;
  font: inherit; color: var(--fft-text); border: 1px solid var(--fft-control-line); border-radius: var(--fft-radius-l);
  background-color: var(--fft-control-fill);
  background-image: linear-gradient(45deg, transparent 50%, var(--fft-text-secondary) 50%), linear-gradient(135deg, var(--fft-text-secondary) 50%, transparent 50%);
  background-position: calc(100% - 15px) 50%, calc(100% - 11px) 50%;
  background-size: 4px 4px, 4px 4px; background-repeat: no-repeat;
  cursor: pointer; transition: border-color 233ms var(--fft-ease), background-color 233ms var(--fft-ease);
}
@media (hover: hover) { .fft-filter select:hover { border-color: color-mix(in srgb, var(--fft-text) 24%, transparent); } }
.fft-filter select:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 1px; }
.fft-filter select option { color: initial; background: initial; }
.fft-range { display: inline-flex; align-items: center; gap: 8px; color: var(--fft-text-secondary); }
/* The period: a segmented control, a rounded track with a rounded thumb that lifts on the chosen period. The track's
   radius is the thumb's plus its 2px inset, so the two curves run parallel. */
.fft-range-track {
  box-sizing: border-box; display: inline-flex; align-items: stretch; gap: 2px; height: var(--fft-control-h); padding: 2px;
  border-radius: calc(var(--fft-radius-l) + 2px); background: color-mix(in srgb, var(--fft-text) 8%, transparent);
}
.fft-range button {
  font: inherit; font-size: var(--fft-fs-m); font-weight: 600; letter-spacing: 0.02em; font-variant-numeric: tabular-nums;
  min-width: 34px; padding: 0 10px; border: 0; border-radius: var(--fft-radius-l); background: transparent; color: var(--fft-text-secondary); cursor: pointer;
  transition: background 233ms var(--fft-ease), color 233ms var(--fft-ease), box-shadow 233ms var(--fft-ease);
}
.fft-range button:hover { color: var(--fft-text); }
/* The chosen period: the thumb, its own fill lifted by a soft shadow and a rounded hairline, in full ink; a cue of
   shape and depth, not color alone (WCAG 1.4.1, 1.4.11). No square frame and no bar along its foot. */
.fft-range button[aria-pressed="true"] { color: var(--fft-text); background: var(--fft-raised, var(--fft-surface)); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.14), 0 0 0 0.5px var(--fft-control-line); }
.fft-range button:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 1px; }
/* Section filter: quiet chips on their own line under the controls, All first, starting at the left edge like everything else. */
.fft-board-nav { display: flex; flex: 1 0 100%; flex-wrap: wrap; justify-content: flex-start; align-items: center; gap: 2px; min-width: 0; margin-left: -8px; scroll-behavior: smooth; }
/* Section chips: pills as tall as every other control, quiet until chosen. */
.fft-board-nav button {
  box-sizing: border-box; display: inline-flex; flex-direction: column; justify-content: center; align-items: center; min-height: var(--fft-control-h); padding: 0 11px; border: 0; border-radius: var(--fft-radius-pill); background: transparent; cursor: pointer;
  font: inherit; font-size: var(--fft-fs-m); line-height: 21px; white-space: nowrap; color: var(--fft-text-secondary);
  transition: background 233ms var(--fft-ease), color 233ms var(--fft-ease);
}
@media (hover: hover) { .fft-board-nav button:hover { color: var(--fft-text); background: color-mix(in srgb, var(--fft-text) 5%, transparent); } }
/* The chosen section turns semibold, a cue that is not color alone (WCAG 1.4.1); every chip reserves that width. */
.fft-board-nav button[aria-pressed="true"] { color: var(--fft-text); font-weight: 600; background: color-mix(in srgb, var(--fft-text) 8%, transparent); }
.fft-board-nav button::after { content: attr(data-label); content: attr(data-label) / ""; height: 0; overflow: hidden; visibility: hidden; font-weight: 600; }
.fft-board-nav button:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: -2px; }
/* The row's buttons (Share, the click filter, Filters on a phone) are pills of the same height as the other controls. */
.fft-dashboard .fft-filters :is(.fft-board-share, .fft-crossfilter, .fft-filters-toggle) {
  box-sizing: border-box; min-height: var(--fft-control-h); height: var(--fft-control-h); border-radius: var(--fft-radius-pill); font-size: var(--fft-fs-m);
}
.fft-dashboard .fft-filters .fft-board-share { border-color: var(--fft-control-line); background: var(--fft-control-fill); }
.fft-dashboard .fft-filters .fft-dashboard-asof-inline { font-size: var(--fft-fs-s); line-height: var(--fft-control-h); color: var(--fft-text-secondary); }
/* Section chips that run past the row fade over 55px on an eased curve, so a chip at the edge dissolves rather than
   being sliced; the fade shows only on the side with more to see. */
.fft-dashboard .fft-filters .fft-board-nav { --fft-fade: 55px; scroll-padding-inline: var(--fft-fade); }
.fft-dashboard .fft-filters .fft-board-nav[data-scroll="start"] { -webkit-mask-image: linear-gradient(to left, transparent, rgba(0, 0, 0, 0.35) calc(var(--fft-fade) * 0.4), #000 var(--fft-fade)); mask-image: linear-gradient(to left, transparent, rgba(0, 0, 0, 0.35) calc(var(--fft-fade) * 0.4), #000 var(--fft-fade)); }
.fft-dashboard .fft-filters .fft-board-nav[data-scroll="end"] { -webkit-mask-image: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.35) calc(var(--fft-fade) * 0.4), #000 var(--fft-fade)); mask-image: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.35) calc(var(--fft-fade) * 0.4), #000 var(--fft-fade)); }
.fft-dashboard .fft-filters .fft-board-nav[data-scroll="middle"] {
  -webkit-mask-image: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.35) calc(var(--fft-fade) * 0.4), #000 var(--fft-fade), #000 calc(100% - var(--fft-fade)), rgba(0, 0, 0, 0.35) calc(100% - var(--fft-fade) * 0.4), transparent);
  mask-image: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.35) calc(var(--fft-fade) * 0.4), #000 var(--fft-fade), #000 calc(100% - var(--fft-fade)), rgba(0, 0, 0, 0.35) calc(100% - var(--fft-fade) * 0.4), transparent);
}
/* A chosen section: the rest of the grid hides, and its heading leads the board without the divider above it. */
.fft-dashboard-grid > [hidden] { display: none; }
.fft-dashboard[data-section] .fft-board-section { margin-top: 0; padding-top: 0; border-top: 0; }
/* An even grid: the cards in a row share one height, passed down from the cell to the card. */
.fft-dashboard-grid { display: grid; grid-template-columns: repeat(var(--fft-cols, 3), minmax(0, 1fr)); gap: 21px; align-items: stretch; }
.fft-cell-slot { min-width: 0; display: flex; flex-direction: column; }
.fft-board-cell { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.fft-board-cell > .fft-widget { flex: 1; }
.fft-board-section { display: flex; flex-wrap: wrap; align-items: baseline; gap: 3px 13px; margin-top: 21px; padding-top: 21px; border-top: 1px solid var(--fft-border); scroll-margin-top: 21px; }
.fft-board-section:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
.fft-board-section h3 { margin: 0; font-size: var(--fft-fs-s); line-height: 21px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fft-text-secondary); }
.fft-board-section p { margin: 0; font-size: var(--fft-fs-m); color: var(--fft-text-secondary); }
/* A jumped-to section lands clear of the pinned row: its height comes from the runtime, with a fallback until measured. */
.fft-dashboard[data-sticky] .fft-board-section { scroll-margin-top: calc(var(--fft-sticky-top, 0px) + var(--fft-filters-height, 89px) + 13px); }
/* Under a pinned filter row, the page scroll-pads by its height, so whatever takes focus is scrolled clear of it (WCAG 2.4.11). */
:root:has(.fft-dashboard[data-sticky]) { scroll-padding-top: calc(var(--fft-sticky-top, 0px) + var(--fft-filters-height, 89px) + 13px); }
.fft-cell-missing { margin: 0; padding: 21px; border: 1px dashed var(--fft-axis); border-radius: var(--fft-radius-card); color: var(--fft-text-secondary); text-align: center; }
@media (max-width: 1100px) {
  .fft-dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fft-cell-slot[data-span] { grid-column: span 1 !important; }
  .fft-cell-slot[data-span="2"], .fft-cell-slot[data-span="3"], .fft-cell-slot[data-span="4"], .fft-cell-slot[data-span="5"], .fft-cell-slot[data-span="6"] { grid-column: 1 / -1 !important; }
  /* Tablets and phones: the section links scroll sideways on their one line, so the pinned bar stays short. */
  .fft-board-nav {
    flex-wrap: nowrap; margin-left: 0;
    overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x proximity; scrollbar-width: none;
  }
  .fft-board-nav::-webkit-scrollbar { display: none; }
  /* The side with more links to see fades out; a link scrolled into view stops clear of the fade (WCAG 2.4.11). */
  .fft-board-nav { scroll-padding-inline: 34px; }
  .fft-board-nav[data-scroll="start"] { -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 34px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 34px), transparent); }
  .fft-board-nav[data-scroll="middle"] { -webkit-mask-image: linear-gradient(to right, transparent, #000 34px, #000 calc(100% - 34px), transparent); mask-image: linear-gradient(to right, transparent, #000 34px, #000 calc(100% - 34px), transparent); }
  .fft-board-nav[data-scroll="end"] { -webkit-mask-image: linear-gradient(to right, transparent, #000 34px); mask-image: linear-gradient(to right, transparent, #000 34px); }
  .fft-board-nav button { flex: none; scroll-snap-align: start; }
}
@media (max-width: 700px) {
  .fft-dashboard-grid { grid-template-columns: minmax(0, 1fr); }
  .fft-cell-slot[data-span] { grid-column: 1 / -1 !important; }
  /* Phone: the period control and the filters stretch to the width; selects at 16px so iOS does not zoom on focus. */
  .fft-filters { gap: 8px 13px; }
  .fft-range, .fft-range-track { flex: 1 1 auto; }
  .fft-range button { flex: 1 1 0; }
  .fft-filter { flex: 1 1 144px; }
  .fft-filter select { flex: 1; font-size: 16px; }
  .fft-dashboard[data-sticky] .fft-board-section { scroll-margin-top: calc(var(--fft-sticky-top, 0px) + var(--fft-filters-height, 144px) + 13px); }
}
/* Touch: every control at least 34px tall, without the grey tap flash. */
@media (pointer: coarse) {
  .fft-range button, .fft-board-nav button { padding: 0 13px; -webkit-tap-highlight-color: transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .fft-board-nav { scroll-behavior: auto; }
  .fft-range button, .fft-board-nav button { transition: none; }
}

/* Palette picker: carries its own tokens, so it can sit outside any widget. */
.fft-picker {${LIGHT}
  display: flex; flex-direction: column; gap: 13px; color: var(--fft-text);
  font: 13px/21px -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .fft-picker {${DARK}} }
:root[data-theme="dark"] .fft-picker {${DARK}}
.fft-picker *, .fft-picker *::before, .fft-picker *::after { box-sizing: border-box; }
.fft-picker-library { display: flex; flex-wrap: wrap; gap: 8px; }
.fft-picker-chip {
  display: inline-flex; flex-direction: column; gap: 5px; padding: 8px; border: 1px solid var(--fft-border); border-radius: var(--fft-radius-l);
  background: transparent; color: var(--fft-text-secondary); font: inherit; font-size: var(--fft-fs-s); line-height: 13px; text-align: left; cursor: pointer;
  transition: border-color 377ms var(--fft-ease, ease), color 377ms var(--fft-ease, ease);
}
.fft-picker-chip:hover { color: var(--fft-text); }
.fft-picker-chip[aria-checked="true"] { color: var(--fft-text); border-color: var(--fft-accent); box-shadow: 0 0 0 1px var(--fft-accent); }
.fft-picker-strip { display: flex; gap: 2px; }
.fft-picker-strip span { width: 8px; height: 13px; border-radius: var(--fft-radius-s); }
.fft-picker-swatches { margin: 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(144px, 1fr)); gap: 8px; }
.fft-picker-swatch { display: flex; align-items: center; gap: 5px; padding: 5px; border: 1px solid var(--fft-border); border-radius: var(--fft-radius-l); }
.fft-picker-swatch input[type="color"] { flex: none; width: 21px; height: 21px; padding: 0; border: 0; border-radius: var(--fft-radius-m); background: none; cursor: pointer; }
.fft-picker-swatch input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
.fft-picker-swatch input[type="color"]::-webkit-color-swatch { border: 0; border-radius: var(--fft-radius-m); }
.fft-picker-swatch input[type="color"]::-moz-color-swatch { border: 0; border-radius: var(--fft-radius-m); }
.fft-picker-hex { flex: 1; width: 0; min-width: 55px; border: 0; background: transparent; color: var(--fft-text); font: 11px/21px ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace; }
.fft-picker-hex:focus { outline: none; }
.fft-picker-hex[aria-invalid="true"] { color: var(--fft-negative); }
.fft-picker-pipette, .fft-picker-remove {
  flex: none; display: inline-grid; place-items: center; width: 21px; height: 21px; padding: 0; border: 0; border-radius: var(--fft-radius-m);
  background: transparent; color: var(--fft-muted); font: 13px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif; cursor: pointer;
}
.fft-picker-pipette:hover, .fft-picker-remove:hover:not(:disabled) { color: var(--fft-text); background: var(--fft-grid); }
.fft-picker-remove:disabled { opacity: var(--fft-dim); cursor: default; }
.fft-picker-add {
  align-self: flex-start; padding: 3px 13px; border: 1px dashed var(--fft-axis); border-radius: var(--fft-radius-l);
  background: transparent; color: var(--fft-text-secondary); font: inherit; font-size: var(--fft-fs-s); cursor: pointer;
}
.fft-picker-checks { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.fft-picker-checks li { display: grid; grid-template-columns: 55px 144px 1fr; align-items: baseline; gap: 8px; font-size: var(--fft-fs-s); line-height: 13px; }
.fft-picker-checks .fft-badge { justify-self: start; }
.fft-picker-check-label { font-weight: 600; color: var(--fft-text); }
.fft-picker-check-text { color: var(--fft-text-secondary); }
@media (max-width: 520px) { .fft-picker-checks li { grid-template-columns: 55px 1fr; } .fft-picker-check-text { grid-column: 2; } }

/* Print: light, flat, unbroken. Hover controls and tooltips have no place on paper. */
@media print {
  .fft-actions, .fft-tooltip { display: none !important; }
  .fft-widget, :root .fft-widget[data-preset][data-theme] {${LIGHT}
    background: #ffffff !important; box-shadow: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
    border-color: #d4d3cd !important; break-inside: avoid;
  }
  .fft-cell-slot, .fft-facet { break-inside: avoid; }
  .fft-dashboard {${LIGHT}}
  .fft-widget * { animation: none !important; transition: none !important; }
}

/* Entrance: once, on the first draw. Bars grow from the baseline, lines draw, the rest fades in. */
@keyframes fft-grow { from { transform: scaleY(0); } }
@keyframes fft-grow-x { from { transform: scaleX(0); } }
@keyframes fft-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes fft-fade { from { opacity: 0; } }
@keyframes fft-rise { from { opacity: 0; transform: translateY(3px); } }
.fft-widget[data-animate] .fft-bar { animation: fft-grow 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 21ms), 610ms); }
.fft-widget[data-animate] .fft-lolli-stem { animation: fft-grow 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 21ms), 610ms); }
.fft-widget[data-animate] .fft-lolli-dot, .fft-widget[data-animate] .fft-hbar-dot { animation: fft-fade 377ms var(--fft-ease) both; animation-delay: min(calc(377ms + var(--fft-i, 0) * 34ms), 610ms); }
.fft-widget[data-animate] .fft-line,
.fft-widget[data-animate] .fft-spark-line { stroke-dasharray: 1; animation: fft-draw 987ms var(--fft-ease) both; }
/* Dashes cannot draw in, so forecasts and their band fade in once the actuals have drawn. */
.fft-widget[data-animate] .fft-line[data-forecast] { stroke-dasharray: 5 5; animation: fft-fade 610ms var(--fft-ease) 610ms both; }
.fft-widget[data-animate] .fft-band,
.fft-widget[data-animate] .fft-band-label,
.fft-widget[data-animate] .fft-forecast-zone,
.fft-widget[data-animate] .fft-forecast-label { animation: fft-fade 610ms var(--fft-ease) 377ms both; }
.fft-widget[data-animate] .fft-slice { stroke-dasharray: 1; animation: fft-draw 987ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 89ms), 610ms); }
.fft-widget[data-animate] .fft-pie-slice, .fft-widget[data-animate] .fft-pie-label, .fft-widget[data-animate] .fft-pie-name, .fft-widget[data-animate] .fft-pie-leader { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 89ms), 610ms); }
.fft-widget[data-animate] .fft-end-label,
.fft-widget[data-animate] .fft-stream-label,
.fft-widget[data-animate] .fft-area,
.fft-widget[data-animate] .fft-dot,
.fft-widget[data-animate] .fft-spark-end { animation: fft-fade 610ms var(--fft-ease) 377ms both; }
.fft-widget[data-animate] .fft-step { animation: fft-grow 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 55ms), 610ms); }
.fft-widget[data-animate] .fft-cell { animation: fft-fade 610ms var(--fft-ease) both; }
.fft-widget[data-animate] .fft-day { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 13ms), 610ms); }
.fft-widget[data-animate] .fft-ribbon { animation: fft-fade 987ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 34ms), 610ms); }
.fft-widget[data-animate] .fft-bee { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 13ms), 610ms); }
.fft-widget[data-animate] .fft-point { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 21ms), 610ms); }
.fft-widget[data-animate] .fft-meter-fill { animation: fft-grow-x 987ms var(--fft-ease) both; }
.fft-widget[data-animate] .fft-bullet-value { animation: fft-grow-x 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 55ms), 610ms); }
.fft-widget[data-animate] .fft-tile { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 34ms), 610ms); }
.fft-widget[data-animate] .fft-funnel-bar { animation: fft-grow-x 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 89ms), 610ms); }
.fft-widget[data-animate] .fft-slope-line { stroke-dasharray: 1; animation: fft-draw 987ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 55ms), 610ms); }
.fft-widget[data-animate] .fft-var-bar,
.fft-widget[data-animate] .fft-var-value { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 55ms), 610ms); }
.fft-widget[data-animate] .fft-waffle-cell,
.fft-widget[data-animate] .fft-waffle-empty { animation: fft-fade 377ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-k, 0) * 8ms), 610ms); }
.fft-widget[data-animate] .fft-gantt-done,
.fft-widget[data-animate] .fft-gantt-bar { animation: fft-grow-x 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 55ms), 610ms); }
.fft-widget[data-animate] .fft-gantt-milestone { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(377ms + var(--fft-i, 0) * 55ms), 610ms); }
.fft-widget[data-animate] .fft-ice-cell { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 144ms), 610ms); }
.fft-widget[data-animate] .fft-horizon-row { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 55ms), 610ms); }
.fft-widget[data-animate] .fft-rose-wedge { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 34ms), 610ms); }
.fft-widget[data-animate] .fft-radar-shape, .fft-widget[data-animate] .fft-radar-dot { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(233ms, 610ms); }
.fft-widget[data-animate] .fft-chord-ribbon { animation: fft-fade 987ms var(--fft-ease) both; animation-delay: min(233ms, 610ms); }
.fft-widget[data-animate] .fft-sun-seg { animation: fft-fade 610ms var(--fft-ease) both; }
.fft-widget[data-animate] .fft-sun-seg[data-depth="1"] { animation-delay: min(233ms, 610ms); }
.fft-widget[data-animate] .fft-sun-seg[data-depth="2"] { animation-delay: min(377ms, 610ms); }
.fft-widget[data-animate] .fft-cell-bar-fill { animation: fft-grow-x 610ms var(--fft-ease) both; }
.fft-widget[data-animate] .fft-candle { animation: fft-fade 377ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 13ms), 610ms); }
.fft-widget[data-animate] .fft-candle-average { stroke-dasharray: 1; animation: fft-draw 987ms var(--fft-ease) both; animation-delay: min(377ms, 610ms); }
.fft-widget[data-animate] .fft-likert-seg { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 55ms), 610ms); }
.fft-widget[data-animate] .fft-box { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 89ms), 610ms); }
.fft-widget[data-animate] .fft-pareto-line { stroke-dasharray: 1; animation: fft-draw 987ms var(--fft-ease) both; animation-delay: min(377ms, 610ms); }
.fft-widget[data-animate] .fft-pareto-dot { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(987ms, 610ms); }
.fft-widget[data-animate] .fft-gauge-arc { stroke-dasharray: 1; animation: fft-draw 987ms var(--fft-ease) both; }
.fft-widget[data-animate] .fft-ring-arc { stroke-dasharray: 1; animation: fft-draw 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 89ms), 233ms); }
.fft-widget[data-animate] .fft-ring-lap { animation: fft-fade 377ms var(--fft-ease) both; animation-delay: min(calc(377ms + var(--fft-i, 0) * 89ms), 610ms); }
.fft-widget[data-animate] .fft-bump-line { stroke-dasharray: 1; animation: fft-draw 987ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 55ms), 610ms); }
.fft-widget[data-animate] .fft-mekko { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 55ms), 610ms); }
.fft-widget[data-animate] .fft-bump-dot,
.fft-widget[data-animate] .fft-bump-label,
.fft-widget[data-animate] .fft-slope-dot,
.fft-widget[data-animate] .fft-slope-label { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(377ms + var(--fft-i, 0) * 55ms), 610ms); }
.fft-widget[data-animate] .fft-hbar-fill { animation: fft-grow-x 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 34ms), 610ms); }
.fft-widget[data-animate] .fft-dot-mark, .fft-widget[data-animate] .fft-dot-value { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 34ms), 610ms); }
.fft-widget[data-animate] .fft-db-head, .fft-widget[data-animate] .fft-db-shaft, .fft-widget[data-animate] .fft-db-still { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(233ms + var(--fft-i, 0) * 34ms), 610ms); }
.fft-widget[data-animate] .fft-stat-value,
.fft-widget[data-animate] .fft-kpi-value,
.fft-widget[data-animate] .fft-kpi-delta,
.fft-widget[data-animate] .fft-headline-value { animation: fft-rise 610ms var(--fft-ease) both; }
/* Notes pinned to points of a chart: a dot, a hairline leader and a few words with a halo of the card, so they read over the marks. */
.fft-note-dot { fill: var(--fft-text); stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; pointer-events: none; }
.fft-note-leader { stroke: var(--fft-text-secondary); stroke-width: 1; pointer-events: none; }
.fft-note-text { fill: var(--fft-text); font-size: var(--fft-fs-s); paint-order: stroke; stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 3px; stroke-linejoin: round; pointer-events: none; }
.fft-note-marker { fill: var(--fft-ring, var(--fft-surface)); stroke: var(--fft-text); stroke-width: 1.5; pointer-events: none; }
.fft-note-index { fill: var(--fft-text); font-size: var(--fft-fs-xs); font-weight: 600; font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-notes { margin: 5px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 3px; font-size: var(--fft-fs-s); line-height: 15px; color: var(--fft-text-secondary); }
.fft-notes li { display: flex; gap: 8px; align-items: baseline; }
.fft-note-num { flex: none; width: 16px; height: 16px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--fft-text); color: var(--fft-text); font-size: var(--fft-fs-xs); font-weight: 600; line-height: 16px; text-align: center; font-variant-numeric: tabular-nums; }
/* Line symbols and peak labels. */
.fft-point-dot { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 1.5; pointer-events: none; transition: opacity 377ms var(--fft-ease); }
.fft-peak-dot { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; pointer-events: none; }
.fft-peak-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-weight: 600; font-variant-numeric: tabular-nums; paint-order: stroke; stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 3px; stroke-linejoin: round; pointer-events: none; }
/* A comparison column behind a bar: quiet, a little wider, dimmed with its bar when another is active. */
.fft-bar-compare { transition: opacity 377ms var(--fft-ease); }
.fft-chart[data-active] .fft-marks:not([data-active]) .fft-bar-compare { opacity: var(--fft-dim); }
/* Dual: two panels sharing one x axis; each panel's caption names its measure where a legend would. */
.fft-dual-caption { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-weight: 600; }
.fft-widget[data-animate] .fft-point-dot { animation: fft-fade 377ms var(--fft-ease) both; animation-delay: min(610ms, 610ms); }
.fft-widget[data-animate] .fft-note-layer { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(610ms, 610ms); }
@media (prefers-reduced-motion: reduce) {
  .fft-widget *, .fft-widget *::before, .fft-widget *::after { animation: none !important; transition: none !important; }
  .fft-overlay, .fft-overlay-panel { animation: none !important; }
}

/* Grouped, stacked and split horizontal bars. */
.fft-hbar-wrap { display: flex; flex-direction: column; container-type: inline-size; }
.fft-hbars[data-mode="grouped"] .fft-hbar { grid-template-columns: minmax(55px, 38%) 1fr; align-items: start; }
.fft-hbar-group { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.fft-hbar-bar { display: flex; align-items: center; min-width: 0; }
.fft-hbar-run { position: relative; width: calc(100% - var(--fft-end-room, 0px)); height: 13px; }
.fft-hbar-run .fft-hbar-fill { position: absolute; left: 0; top: 2px; height: 9px; }
.fft-hbar-end { position: absolute; top: 0; margin-left: 5px; font-size: var(--fft-fs-s); line-height: 13px; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--fft-text-secondary); }
.fft-hbar-seg { position: relative; overflow: hidden; }
.fft-hbar-seg-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: var(--fft-fs-xs); font-weight: 600; font-variant-numeric: tabular-nums; color: #fff; text-shadow: 0 0 2px rgba(0, 0, 0, 0.45); pointer-events: none; }
.fft-hbars[data-mode="stacked"] .fft-hbar-track { height: 15px; }
.fft-hbars[data-mode="grouped"] .fft-hbar-label { align-self: center; }
.fft-hbar-stack { display: flex; gap: 2px; }
.fft-hbar-seg { height: 100%; flex: none; min-width: 0; border-radius: var(--fft-radius-s); transform-origin: 0 50%; transition: opacity 377ms var(--fft-ease); }
.fft-hbar-seg:first-child { border-radius: var(--fft-radius-s); }
.fft-hbar-seg:last-child { border-radius: var(--fft-radius-s) var(--fft-radius-m) var(--fft-radius-m) var(--fft-radius-s); }
.fft-hbars[data-active] .fft-hbar:not([data-active]) .fft-hbar-seg { opacity: var(--fft-dim); }
.fft-hbars[data-mode="split"] { gap: 5px; }
.fft-hbars[data-mode="split"] .fft-hbar { grid-template-columns: minmax(55px, 26%) repeat(var(--fft-splits, 2), minmax(0, 1fr)); gap: 13px; }
.fft-hbars[data-mode="split"] .fft-hbar-bar { padding-right: 3px; }
.fft-map-code { fill: var(--fft-text-secondary); opacity: 0.5; font-size: 9px; font-weight: 600; letter-spacing: 0.02em; pointer-events: none; }
.fft-hbar-head { cursor: default; margin-bottom: 3px; }
.fft-hbar-col-title { display: inline-flex; align-items: center; gap: 5px; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@container (max-width: 420px) {
  .fft-hbars[data-mode="split"] .fft-hbar { grid-template-columns: minmax(55px, 30%) repeat(var(--fft-splits, 2), minmax(0, 1fr)); gap: 8px; }
}
.fft-widget[data-animate] .fft-hbar-seg { animation: fft-grow-x 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 34ms), 610ms); }

/* Population pyramid. */
.fft-pyr-head { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-weight: 600; }
.fft-pyr-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); pointer-events: none; }
.fft-pyr-value { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-weight: 600; font-variant-numeric: tabular-nums; pointer-events: none; }
.fft-pyr-bar { transition: opacity 377ms var(--fft-ease); transform-box: fill-box; }
.fft-pyr-bar[data-side="left"] { transform-origin: 100% 50%; }
.fft-pyr-bar[data-side="right"] { transform-origin: 0 50%; }
.fft-pyramid[data-active] .fft-pyr-row:not([data-active]) .fft-pyr-bar { opacity: var(--fft-dim); }
.fft-pyr-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-pyr-hit:hover, .fft-pyr-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 6%, transparent); }
.fft-widget[data-animate] .fft-pyr-bar { animation: fft-grow-x 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 21ms), 610ms); }
/* The small print: the footer, then the credit ("Source: Eurostat · Chart: Marta") in the same quiet type, the source underlined as a link. */
.fft-small-print { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.fft-small-print[hidden] { display: none; }
.fft-credit { margin: 0; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); }
.fft-credit[hidden] { display: none; }
.fft-credit-link { color: inherit; text-decoration: underline; text-decoration-color: color-mix(in srgb, currentColor 38%, transparent); text-underline-offset: 2px; border-radius: var(--fft-radius-s); }
.fft-credit-link:hover, .fft-credit-link:focus-visible { color: var(--fft-text); text-decoration-color: currentColor; outline: none; }
.fft-credit-link:focus-visible { box-shadow: 0 0 0 2px var(--fft-accent); }
/* Table tools, each only there when asked for: a quiet search field with its live count, a pager of two small buttons, a pinned first column. */
.fft-table-tools { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.fft-table-search {
  flex: 1; min-width: 0; max-width: 233px; height: 28px; margin: 0; padding: 0 8px;
  border: 1px solid var(--fft-border); border-radius: var(--fft-radius-m); background: transparent; color: var(--fft-text);
  font: inherit; font-size: var(--fft-fs-m); line-height: 26px;
}
.fft-table-search::placeholder { color: var(--fft-muted); opacity: 1; }
.fft-table-search:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 1px; }
.fft-table-count { font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.fft-table-count[hidden] { display: none; }
.fft-table-empty { margin: 0; padding: 13px 0; font-size: var(--fft-fs-m); line-height: 21px; color: var(--fft-text-secondary); }
.fft-table-empty[hidden], .fft-table-wrap[hidden] { display: none; }
.fft-pager { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 8px; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); font-variant-numeric: tabular-nums; }
.fft-pager[hidden] { display: none; }
.fft-pager-button {
  all: unset; display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; padding: 0 8px; border-radius: var(--fft-radius-m);
  color: var(--fft-text-secondary); font-size: var(--fft-fs-m); cursor: pointer;
}
.fft-pager-button:hover, .fft-pager-button:focus-visible { color: var(--fft-text); background: var(--fft-grid); }
.fft-pager-button:focus-visible { box-shadow: 0 0 0 2px var(--fft-accent); }
.fft-pager-button:disabled { opacity: var(--fft-dim); cursor: default; background: none; }
.fft-table-wrap[data-sticky] .fft-table :is(th, td):first-child { position: sticky; left: 0; z-index: 1; background: var(--fft-surface); box-shadow: 1px 0 0 var(--fft-grid); }
.fft-table-wrap[data-sticky] .fft-table tbody tr:is(:hover, :focus-visible) td:first-child { background: color-mix(in srgb, var(--fft-accent) 7%, var(--fft-surface)); }
/* Maps: choropleth, symbols and locator. Land is muted, borders are the card's own surface, so regions separate quietly. */
.fft-map-wrap { display: flex; flex-direction: column; gap: 13px; }
.fft-map { display: block; max-width: 100%; height: auto; }
.fft-map-land { fill: color-mix(in srgb, var(--fft-muted) 16%, var(--fft-surface)); stroke: var(--fft-surface); stroke-width: 0.75; stroke-linejoin: round; }
.fft-map-grid .fft-map-land { stroke-width: 2; }
.fft-map-region { stroke: var(--fft-surface); stroke-width: 0.75; stroke-linejoin: round; outline: none; cursor: pointer; transition: opacity 377ms var(--fft-ease); }
.fft-map-grid .fft-map-region { stroke-width: 2; }
.fft-map-region-empty { fill: color-mix(in srgb, var(--fft-muted) 16%, var(--fft-surface)); cursor: default; }
.fft-map-region[data-step="1"] { fill: var(--fft-seq-1); }
.fft-map-region[data-step="2"] { fill: var(--fft-seq-2); }
.fft-map-region[data-step="3"] { fill: var(--fft-seq-3); }
.fft-map-region[data-step="4"] { fill: var(--fft-seq-4); }
.fft-map-region[data-step="5"] { fill: var(--fft-seq-5); }
.fft-map-region[data-step="6"] { fill: var(--fft-seq-6); }
.fft-map-region[data-step="7"] { fill: var(--fft-seq-7); }
.fft-map-region:hover, .fft-map-region:focus-visible { stroke: var(--fft-text); stroke-width: 2; }
.fft-map-wrap[data-active] .fft-map-region:not([data-active]):not(.fft-map-region-empty) { opacity: var(--fft-dim); }
.fft-map-region-label { font-size: var(--fft-fs-s); font-weight: 500; pointer-events: none; fill: var(--fft-text); }
.fft-map-region-label-empty { fill: var(--fft-muted); }
.fft-map-region-label[data-step="1"] { fill: var(--fft-seq-text-1); }
.fft-map-region-label[data-step="2"] { fill: var(--fft-seq-text-2); }
.fft-map-region-label[data-step="3"] { fill: var(--fft-seq-text-3); }
.fft-map-region-label[data-step="4"] { fill: var(--fft-seq-text-4); }
.fft-map-region-label[data-step="5"] { fill: var(--fft-seq-text-5); }
.fft-map-region-label[data-step="6"] { fill: var(--fft-seq-text-6); }
.fft-map-region-label[data-step="7"] { fill: var(--fft-seq-text-7); }
.fft-map-legend { flex-wrap: wrap; }
.fft-map-legend-empty { display: inline-flex; align-items: center; gap: 5px; margin-left: 8px; }
.fft-map-swatch-empty { background: color-mix(in srgb, var(--fft-muted) 16%, var(--fft-surface)); box-shadow: inset 0 0 0 1px var(--fft-grid); }
.fft-map-symbol { fill-opacity: 0.55; stroke-width: 1.5; outline: none; cursor: pointer; transition: opacity 377ms var(--fft-ease), fill-opacity 377ms var(--fft-ease); }
.fft-map-symbol:hover, .fft-map-symbol:focus-visible, .fft-map-symbol[data-active] { fill-opacity: 0.85; stroke: var(--fft-text); }
.fft-map-wrap[data-active] .fft-map-symbol:not([data-active]) { opacity: var(--fft-dim); }
.fft-map-keys { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 8px 21px; }
.fft-map-sizekey-wrap { display: flex; align-items: flex-end; gap: 8px; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); }
.fft-map-sizekey { display: block; overflow: visible; }
.fft-map-sizekey-ring { fill: none; stroke: var(--fft-muted); stroke-width: 1; }
.fft-map-sizekey-line { stroke: var(--fft-grid); stroke-width: 1; shape-rendering: crispEdges; }
.fft-map-sizekey-text { fill: var(--fft-muted); font-size: var(--fft-fs-s); font-variant-numeric: tabular-nums; }
.fft-map-marker { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; outline: none; cursor: pointer; transition: opacity 377ms var(--fft-ease); }
.fft-map-marker:hover, .fft-map-marker:focus-visible, .fft-map-marker[data-active] { stroke: var(--fft-text); }
.fft-map-wrap[data-active] .fft-map-marker:not([data-active]) { opacity: var(--fft-dim); }
.fft-map-place { font-size: var(--fft-fs-s); pointer-events: none; paint-order: stroke; stroke: var(--fft-surface); stroke-width: 3px; stroke-linejoin: round; }
.fft-map-place-name { fill: var(--fft-text); font-weight: 600; }
.fft-map-place-note { fill: var(--fft-text-secondary); font-size: var(--fft-fs-xs); }
.fft-map-note { margin: 0; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); }
.fft-widget[data-animate] .fft-map-region { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 13ms), 610ms); }
.fft-widget[data-animate] .fft-map-symbol, .fft-widget[data-animate] .fft-map-marker { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(233ms + var(--fft-i, 0) * 21ms), 610ms); }

/* Matrix: a faint grid of cells, one mark where a row sits at a crossing. */
.fft-matrix { display: flex; flex-direction: column; gap: 13px; }
.fft-matrix svg { display: block; max-width: 100%; }
.fft-mx-cell { fill: color-mix(in srgb, var(--fft-text) 4%, transparent); pointer-events: none; }
.fft-mx-row, .fft-mx-col { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); pointer-events: none; }
.fft-mx-dot, .fft-mx-yes { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 1.5; pointer-events: none; transition: opacity 377ms var(--fft-ease); }
.fft-mx-no { fill: var(--fft-muted); fill-opacity: 0.6; pointer-events: none; }
.fft-mx-dot[data-step="1"], .fft-mx-yes[data-step="1"] { fill: var(--fft-seq-1); }
.fft-mx-dot[data-step="2"], .fft-mx-yes[data-step="2"] { fill: var(--fft-seq-2); }
.fft-mx-dot[data-step="3"], .fft-mx-yes[data-step="3"] { fill: var(--fft-seq-3); }
.fft-mx-dot[data-step="4"], .fft-mx-yes[data-step="4"] { fill: var(--fft-seq-4); }
.fft-mx-dot[data-step="5"], .fft-mx-yes[data-step="5"] { fill: var(--fft-seq-5); }
.fft-mx-dot[data-step="6"], .fft-mx-yes[data-step="6"] { fill: var(--fft-seq-6); }
.fft-mx-dot[data-step="7"], .fft-mx-yes[data-step="7"] { fill: var(--fft-seq-7); }
.fft-matrix[data-active] :is(.fft-mx-dot, .fft-mx-yes):not([data-active]) { opacity: var(--fft-dim); }
.fft-mx-label { font-size: var(--fft-fs-xs); font-weight: 600; font-variant-numeric: tabular-nums; pointer-events: none; fill: var(--fft-text); paint-order: stroke; stroke: var(--fft-surface); stroke-width: 2.5px; stroke-linejoin: round; }
.fft-mx-label[data-step] { stroke: none; }
.fft-mx-label[data-step="1"] { fill: var(--fft-seq-text-1); }
.fft-mx-label[data-step="2"] { fill: var(--fft-seq-text-2); }
.fft-mx-label[data-step="3"] { fill: var(--fft-seq-text-3); }
.fft-mx-label[data-step="4"] { fill: var(--fft-seq-text-4); }
.fft-mx-label[data-step="5"] { fill: var(--fft-seq-text-5); }
.fft-mx-label[data-step="6"] { fill: var(--fft-seq-text-6); }
.fft-mx-label[data-step="7"] { fill: var(--fft-seq-text-7); }
.fft-mx-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-mx-hit:hover, .fft-mx-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 8%, transparent); }
.fft-mx-keys { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px 21px; }
.fft-mx-sizekey { display: flex; align-items: flex-end; gap: 8px; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); }
.fft-mx-sizekey svg { display: block; overflow: visible; }
.fft-mx-key-ring { fill: none; stroke: var(--fft-muted); stroke-width: 1; }
.fft-mx-key-line { stroke: var(--fft-grid); stroke-width: 1; shape-rendering: crispEdges; }
.fft-mx-key-text { fill: var(--fft-muted); font-size: var(--fft-fs-s); font-variant-numeric: tabular-nums; }
.fft-widget[data-animate] :is(.fft-mx-dot, .fft-mx-yes) { animation: fft-fade 377ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 8ms), 610ms); }

/* Strips: one small square per unit, colored by part, the figures at the end. */
.fft-strips { display: flex; flex-direction: column; gap: 13px; container-type: inline-size; }
.fft-strip-rows { display: flex; flex-direction: column; gap: 8px; }
.fft-strip { display: grid; grid-template-columns: var(--fft-strip-label, 34%) 1fr auto; align-items: center; gap: 8px; border-radius: var(--fft-radius-m); outline: none; cursor: pointer; }
.fft-strip:focus-visible { box-shadow: 0 0 0 2px var(--fft-ring, var(--fft-surface)), 0 0 0 3px var(--fft-accent); }
.fft-strip-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--fft-text-secondary); font-size: var(--fft-fs-s); }
.fft-strip-squares { display: block; overflow: visible; }
.fft-strip-sq { transition: opacity 377ms var(--fft-ease); }
.fft-strip-rows[data-active] .fft-strip:not([data-active]) .fft-strip-sq { opacity: var(--fft-dim); }
.fft-strip-end { display: inline-flex; align-items: baseline; gap: 6px; white-space: nowrap; font-variant-numeric: tabular-nums; font-size: var(--fft-fs-s); }
.fft-strip-total { font-weight: 600; }
.fft-strip-share, .fft-strip-density { color: var(--fft-text-secondary); font-size: var(--fft-fs-s); }
.fft-strip-density::before { content: "·"; margin-right: 6px; color: var(--fft-muted); }
.fft-strips-note { margin: 0; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); }
@container (max-width: 420px) { .fft-strip-share, .fft-strip-density { display: none; } }
.fft-widget[data-animate] .fft-strip-sq { animation: fft-fade 377ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 34ms + var(--fft-k, 0) * 5ms), 610ms); }

/* Lifecycle: stage lanes in a deepening tint, a tick per stage date, a faint run while a stage is still open. */
.fft-lifecycle svg { display: block; max-width: 100%; }
.fft-lc-lane { transition: opacity 377ms var(--fft-ease); }
.fft-chart[data-active] .fft-lc-lane:not([data-active]) { opacity: var(--fft-dim); }
.fft-lc-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); pointer-events: none; }
.fft-lc-lane[data-active] .fft-lc-label { fill: var(--fft-text); }
.fft-lc-group { fill: var(--fft-text); font-size: var(--fft-fs-s); font-weight: 600; letter-spacing: 0.02em; pointer-events: none; }
.fft-lc-group-rule { stroke: var(--fft-grid); stroke-width: 1; shape-rendering: crispEdges; }
.fft-lc-seg { pointer-events: none; }
.fft-lc-open { fill-opacity: 0.1; stroke-opacity: 0.55; stroke-width: 1; stroke-dasharray: 3 3; pointer-events: none; }
.fft-lc-tick { stroke: var(--fft-text); stroke-width: 1.5; shape-rendering: crispEdges; pointer-events: none; }
.fft-lc-status { fill: color-mix(in srgb, var(--fft-text) 7%, transparent); pointer-events: none; }
.fft-lc-status-dot { fill: color-mix(in srgb, var(--fft-text) 34%, transparent); pointer-events: auto; }
.fft-lc-status-text { fill: var(--fft-text-secondary); font-size: var(--fft-fs-xs); font-weight: 600; pointer-events: none; }
.fft-lc-tick-label { font-size: var(--fft-fs-s); }
.fft-lc-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-lc-hit:hover, .fft-lc-hit:focus-visible { fill: color-mix(in srgb, var(--fft-accent) 6%, transparent); }
.fft-lc-key-open { background: color-mix(in srgb, var(--fft-lc-color) 12%, var(--fft-surface)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--fft-lc-color) 55%, transparent); }
.fft-lc-note { margin: 0; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); }
.fft-widget[data-animate] .fft-lc-seg, .fft-widget[data-animate] .fft-lc-open { transform-box: fill-box; transform-origin: 0 50%; animation: fft-grow-x 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 34ms), 610ms); }
.fft-widget[data-animate] .fft-lc-tick { animation: fft-fade 377ms var(--fft-ease) both; animation-delay: min(calc(377ms + var(--fft-i, 0) * 34ms), 610ms); }
/* Whitespace: the cross-sell map. Held is a filled square, an opportunity an outlined one tinted by its score, not eligible a faint dot. */
.fft-ws { display: flex; flex-direction: column; gap: 8px; }
.fft-ws-grid { display: grid; gap: 2px; align-items: stretch; font-size: var(--fft-fs-s); line-height: 13px; }
.fft-ws-corner { min-height: 1px; }
.fft-ws-col { display: flex; align-items: flex-end; justify-content: center; padding-bottom: 3px; color: var(--fft-muted); text-align: center; min-width: 0; }
.fft-ws-col-name { overflow-wrap: normal; }
.fft-ws-grid[data-tight] .fft-ws-col { justify-content: center; align-items: flex-end; height: 76px; }
.fft-ws-grid[data-tight] .fft-ws-col-name { writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-height: 76px; }
.fft-ws-head-sum, .fft-ws-foot-label { display: flex; align-items: flex-end; color: var(--fft-muted); white-space: nowrap; padding: 0 0 3px 8px; }
.fft-ws-foot-label { align-items: center; padding: 3px 8px 0 0; justify-content: flex-end; }
.fft-ws-row { display: flex; align-items: center; padding-right: 8px; color: var(--fft-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fft-ws-cell { position: relative; display: flex; align-items: center; justify-content: center; aspect-ratio: 1; min-height: 21px; border-radius: var(--fft-radius-s); outline: none; transition: opacity 377ms var(--fft-ease); }
.fft-ws-cell:not([data-state="empty"]) { cursor: pointer; }
.fft-ws-cell:hover, .fft-ws-cell:focus-visible { box-shadow: 0 0 0 2px var(--fft-ring, var(--fft-surface)), 0 0 0 3px var(--fft-accent); }
.fft-ws-cell[data-state="empty"] { box-shadow: inset 0 0 0 1px var(--fft-grid); }
.fft-ws-mark { display: block; width: 62%; height: 62%; border-radius: var(--fft-radius-s); }
.fft-ws-cell[data-state="holds"] .fft-ws-mark { border-radius: var(--fft-radius-s); }
.fft-ws-cell[data-state="opportunity"] .fft-ws-mark { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--fft-ws-color, var(--fft-accent)) 70%, var(--fft-text)); background: color-mix(in srgb, var(--fft-ws-color, var(--fft-accent)) 10%, transparent); }
.fft-ws-cell[data-state="opportunity"] .fft-ws-mark[data-step="2"] { background: color-mix(in srgb, var(--fft-ws-color, var(--fft-accent)) 18%, transparent); }
.fft-ws-cell[data-state="opportunity"] .fft-ws-mark[data-step="3"] { background: color-mix(in srgb, var(--fft-ws-color, var(--fft-accent)) 26%, transparent); }
.fft-ws-cell[data-state="opportunity"] .fft-ws-mark[data-step="4"] { background: color-mix(in srgb, var(--fft-ws-color, var(--fft-accent)) 34%, transparent); }
.fft-ws-cell[data-state="opportunity"] .fft-ws-mark[data-step="5"] { background: color-mix(in srgb, var(--fft-ws-color, var(--fft-accent)) 44%, transparent); }
.fft-ws-cell[data-state="opportunity"] .fft-ws-mark[data-step="6"] { background: color-mix(in srgb, var(--fft-ws-color, var(--fft-accent)) 55%, transparent); }
.fft-ws-cell[data-state="opportunity"] .fft-ws-mark[data-step="7"] { background: color-mix(in srgb, var(--fft-ws-color, var(--fft-accent)) 68%, transparent); }
.fft-ws-cell[data-state="none"] .fft-ws-mark { width: 5px; height: 5px; border-radius: 50%; background: var(--fft-grid); }
.fft-ws-grid[data-active] .fft-ws-cell:not([data-active]) .fft-ws-mark { opacity: var(--fft-dim); }
.fft-ws-sum { display: flex; flex-direction: column; justify-content: center; align-items: flex-end; padding-left: 8px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.fft-ws-count { color: var(--fft-text-secondary); }
.fft-ws-potential { font-weight: 600; color: var(--fft-text); }
.fft-ws-foot { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 3px; color: var(--fft-muted); font-variant-numeric: tabular-nums; }
.fft-ws-foot-holds { color: var(--fft-text-secondary); font-weight: 600; }
.fft-ws-swatch[data-state="opportunity"] { background: color-mix(in srgb, var(--fft-ws-color, var(--fft-accent)) 26%, transparent); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--fft-ws-color, var(--fft-accent)) 70%, var(--fft-text)); }
.fft-ws-swatch[data-state="none"] { width: 5px; height: 5px; border-radius: 50%; background: var(--fft-grid); margin: 0 1.5px; }
.fft-widget[data-animate] .fft-ws-mark { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 21ms), 610ms); }
/* X-ray: one client on one card, part under part. */
.fft-xray { display: flex; flex-direction: column; gap: 13px; }
.fft-xray-head { display: flex; flex-direction: column; gap: 2px; }
.fft-xray-name { margin: 0; font-size: var(--fft-fs-l); line-height: 26px; font-weight: 600; letter-spacing: -0.01em; }
.fft-xray-detail { margin: 0; color: var(--fft-text-secondary); }
.fft-xray-facts { display: grid; grid-template-columns: repeat(var(--fft-xray-facts, 3), minmax(0, 1fr)); gap: 8px 13px; margin: 0; }
.fft-xray-fact { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fft-xray-fact-label { font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fft-xray-fact-value { margin: 0; font-size: var(--fft-fs-l); line-height: 21px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fft-xray-section { display: flex; flex-direction: column; gap: 5px; }
.fft-xray-title { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); }
.fft-xray-title-count { color: var(--fft-text-secondary); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.fft-xray-holdings { display: flex; flex-wrap: wrap; gap: 5px; margin: 0; padding: 0; list-style: none; }
.fft-xray-pill { padding: 2px 8px; border-radius: var(--fft-radius-pill); font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-text-secondary); box-shadow: inset 0 0 0 1px var(--fft-grid); }
.fft-xray-pill[data-held] { color: color-mix(in srgb, var(--fft-xray-color, var(--fft-accent)) 60%, var(--fft-text)); background: color-mix(in srgb, var(--fft-xray-color, var(--fft-accent)) 16%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--fft-xray-color, var(--fft-accent)) 55%, transparent); font-weight: 600; }
.fft-xray-track { height: 8px; border-radius: var(--fft-radius-m); background: color-mix(in srgb, var(--fft-accent) 16%, transparent); overflow: hidden; }
.fft-xray-fill { height: 100%; border-radius: var(--fft-radius-m); transform-origin: 0 50%; }
.fft-xray-trend .fft-sparkline { display: block; max-width: 100%; }
.fft-xray-flags { display: flex; flex-wrap: wrap; gap: 5px; margin: 0; padding: 0; list-style: none; }
.fft-xray-actions { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.fft-xray-action { display: flex; align-items: flex-start; gap: 8px; }
.fft-xray-check { flex: none; margin-top: 2px; fill: none; stroke: var(--fft-muted); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.fft-widget[data-animate] .fft-xray-fill { animation: fft-grow-x 610ms var(--fft-ease) both; }
/* History: a vertical timeline, newest first, a dot per event on a hairline rail. */
.fft-history-wrap { display: flex; flex-direction: column; gap: 13px; }
.fft-history-group { display: flex; flex-direction: column; gap: 5px; }
.fft-history-heading { margin: 0; font-size: var(--fft-fs-m); line-height: 21px; font-weight: 600; }
.fft-history { position: relative; margin: 0; padding: 0 0 0 29px; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.fft-history::before { content: ""; position: absolute; left: 10px; top: 8px; bottom: 8px; width: 1px; background: var(--fft-grid); }
.fft-history-month { position: relative; margin: 5px 0 0; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.fft-history-month::before { content: ""; position: absolute; left: -21px; top: 5px; width: 5px; height: 5px; border-radius: 50%; background: var(--fft-grid); box-shadow: 0 0 0 2px var(--fft-ring, var(--fft-surface)); }
.fft-history-month:first-child { margin-top: 0; }
.fft-history-event { position: relative; display: flex; gap: 8px; border-radius: var(--fft-radius-m); outline: none; transition: opacity 377ms var(--fft-ease); cursor: pointer; }
.fft-history-event:focus-visible { box-shadow: 0 0 0 2px var(--fft-ring, var(--fft-surface)), 0 0 0 3px var(--fft-accent); }
.fft-history-dot { position: absolute; left: -29px; top: 1px; width: 21px; height: 21px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: var(--fft-fs-xs); font-weight: 700; color: #fff; box-shadow: 0 0 0 2px var(--fft-ring, var(--fft-surface)); }
.fft-history-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.fft-history-line { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.fft-history-date { flex: none; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); font-variant-numeric: tabular-nums; min-width: 42px; }
.fft-history-title { flex: 1; min-width: 0; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fft-history-amount { flex: none; font-weight: 600; font-variant-numeric: tabular-nums; }
.fft-history-note { margin: 0 0 0 50px; font-size: var(--fft-fs-s); line-height: 15px; color: var(--fft-text-secondary); }
.fft-history-more { font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); }
.fft-widget[data-animate] .fft-history-event { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 34ms), 610ms); }
@container (max-width: 380px) {
  .fft-xray-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fft-history-note { margin-left: 0; }
}
/* Clusters on a scatter: soft hulls, quiet enough that the dots stay in front. */
.fft-cluster-hull { fill-opacity: 0.08; stroke-opacity: 0.35; stroke-width: 1; pointer-events: none; }
.fft-cluster-label { font-size: var(--fft-fs-s); font-weight: 600; letter-spacing: 0.02em; pointer-events: none; paint-order: stroke; stroke: var(--fft-surface); stroke-width: 3px; stroke-linejoin: round; opacity: 0.85; }
.fft-widget[data-animate] .fft-cluster-hull { animation: fft-fade 610ms var(--fft-ease) both; }

/* Anomaly tracker: thin lanes, the band faint, the expected a hairline, anomalies in the alert color with a halo. */
.fft-anom-track { fill: color-mix(in srgb, var(--fft-text) 3%, transparent); }
.fft-anom-band { fill: color-mix(in srgb, var(--fft-muted) 22%, transparent); stroke: none; }
.fft-anom-expected { fill: none; stroke: var(--fft-axis); stroke-width: 1; stroke-dasharray: 2 3; }
.fft-anom-line { fill: none; stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round; }
.fft-anom-halo { fill: color-mix(in srgb, var(--fft-down) 22%, transparent); pointer-events: none; }
.fft-anom-flag { fill: var(--fft-down); stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 1.5; pointer-events: none; }
.fft-anom-hit { fill: transparent; cursor: pointer; outline: none; }
.fft-anom-hit:hover, .fft-anom-hit:focus-visible { fill: color-mix(in srgb, var(--fft-down) 14%, transparent); stroke: var(--fft-down); stroke-width: 1.5; }
.fft-anom-name { fill: var(--fft-text); font-size: var(--fft-fs-s); font-weight: 600; }
.fft-anom-latest { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); font-variant-numeric: tabular-nums; }
.fft-anom-count rect { fill: color-mix(in srgb, var(--fft-down) 14%, transparent); }
.fft-anom-count text { fill: var(--fft-down); font-size: var(--fft-fs-xs); font-weight: 600; }
.fft-anom-count[data-none="true"] rect { fill: transparent; }
.fft-anom-count[data-none="true"] text { fill: var(--fft-muted); font-weight: 400; }
.fft-anomalies[data-active] .fft-anom-flag { opacity: 0.55; }
.fft-anom-key-band { background: color-mix(in srgb, var(--fft-muted) 22%, transparent); }
.fft-anom-key-flag { background: var(--fft-down); }
.fft-widget[data-animate] .fft-anom-lane { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 34ms), 610ms); }
/* Scatter quadrants and always-on names: two hairlines, four faint words in the corners, names clear of the dots. */
.fft-quadrant-line { stroke: var(--fft-axis); stroke-width: 1; stroke-dasharray: 2 3; pointer-events: none; }
.fft-quadrant-label { fill: var(--fft-muted); font-size: var(--fft-fs-s); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; pointer-events: none; }
.fft-point-label { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); pointer-events: none; paint-order: stroke; stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 3; stroke-linejoin: round; }
.fft-chart[data-active] .fft-point-label { fill: var(--fft-muted); }

/* Categorical choropleth: regions in series colors, labels in the text color over a halo. */
.fft-map-region-label-group { fill: var(--fft-text); paint-order: stroke; stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2.5; stroke-linejoin: round; }
ul.fft-map-legend { margin-top: 0; }

/* Board: one column per stage, quiet cards, a folded tail per column, the right edge fading while more columns wait. */
.fft-board-wrap { display: flex; flex-direction: column; gap: 8px; }
.fft-board-scroll { overflow-x: auto; max-width: 100%; padding-bottom: 2px; scrollbar-width: thin; }
.fft-board-scroll[data-more] { -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 34px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 34px), transparent); }
.fft-board { display: grid; grid-template-columns: repeat(var(--fft-columns, 3), minmax(144px, 1fr)); gap: 13px; align-items: start; min-width: calc(var(--fft-columns, 3) * 144px + (var(--fft-columns, 3) - 1) * 13px); }
.fft-board-column { min-width: 0; }
.fft-board-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin: 0 0 8px; padding: 0 2px 5px; border-bottom: 1px solid var(--fft-grid); font-size: var(--fft-fs-s); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--fft-text-secondary); }
.fft-board-stage { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fft-board-count { font-variant-numeric: tabular-nums; color: var(--fft-muted); font-weight: 500; }
.fft-board-cards { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.fft-board-card { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: var(--fft-radius-l); background: color-mix(in srgb, var(--fft-muted) 9%, var(--fft-surface)); box-shadow: inset 0 0 0 1px var(--fft-grid); font-size: var(--fft-fs-s); line-height: 15px; cursor: pointer; outline: none; transition: opacity 377ms var(--fft-ease), box-shadow 233ms var(--fft-ease); }
.fft-board-card[hidden] { display: none; }
.fft-board-card:hover, .fft-board-card[data-active] { box-shadow: inset 0 0 0 1px var(--fft-axis); }
.fft-board-card:focus-visible { box-shadow: 0 0 0 2px var(--fft-ring, var(--fft-surface)), 0 0 0 3px var(--fft-accent); }
.fft-board[data-active] .fft-board-card:not([data-active]) { opacity: var(--fft-dim); }
.fft-board-title { display: flex; align-items: center; gap: 6px; min-width: 0; }
.fft-board-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 0 1px var(--fft-ring, var(--fft-surface)); }
.fft-board-name { flex: 1; min-width: 0; font-weight: 600; color: var(--fft-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fft-board-value { flex: none; font-variant-numeric: tabular-nums; color: var(--fft-text-secondary); }
.fft-board-detail { color: var(--fft-muted); font-size: var(--fft-fs-s); line-height: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fft-board-more { margin: 5px 0 0; padding: 3px 2px; border: 0; background: none; color: var(--fft-text-secondary); font: inherit; font-size: var(--fft-fs-s); line-height: 13px; cursor: pointer; border-radius: var(--fft-radius-m); min-height: 24px; }
.fft-board-more:hover { color: var(--fft-text); }
.fft-board-more:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; }

/* WP5: radial, hierarchy and maps on the shared kit. */
/* Entrances follow each mark's own order: wedges, families, ribbons and arcs arrive one after another. */
.fft-widget[data-animate] .fft-waffle-group { animation: fft-fade 377ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 55ms), 610ms); }
.fft-widget[data-animate] .fft-sun-seg { animation-delay: min(calc(var(--fft-i, 0) * 21ms), 610ms); }
.fft-widget[data-animate] .fft-chord-ribbon { animation-delay: min(calc(233ms + var(--fft-i, 0) * 21ms), 610ms); }
.fft-widget[data-animate] .fft-chord-arc { animation: fft-fade 610ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 34ms), 610ms); }
.fft-widget[data-animate] :is(.fft-radar-shape, .fft-radar-dot) { animation-delay: min(calc(233ms + var(--fft-i, 0) * 89ms), 610ms); }
.fft-widget[data-animate] .fft-node { animation: fft-fade 377ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 21ms), 610ms); }
/* A region that highlight steps back from: the grey every other view uses, its code faded with it. */
.fft-map-region[data-muted] { fill: var(--fft-deemphasis); }
.fft-map-region-label[data-muted] { fill: var(--fft-text-secondary); opacity: var(--fft-dim); }
.fft-widget[data-animate] .fft-board-card { animation: fft-fade 377ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 13ms), 610ms); }

/* RAG reporting. Calm, not neon: each status hue leans toward the text color, so it darkens on a light card and lightens on a
   dark one, and stays at 3:1 or more on the surface either way. The green leans teal and the red warm, so they part under
   protanopia too; the shapes (filled circle, triangle, square, hollow circle) carry the status without any color. */
.fft-widget, .fft-dashboard, .fft-editor {
  --fft-rag-g: color-mix(in oklab, #19a39a 85%, var(--fft-text));
  --fft-rag-a: color-mix(in oklab, #e8b10c 80%, var(--fft-text));
  --fft-rag-r: color-mix(in oklab, #c03a2b 90%, var(--fft-text));
  --fft-rag-n: var(--fft-muted);
}
[data-rag="G"] { --fft-rag: var(--fft-rag-g); }
[data-rag="A"] { --fft-rag: var(--fft-rag-a); }
[data-rag="R"] { --fft-rag: var(--fft-rag-r); }
[data-rag="N"] { --fft-rag: var(--fft-rag-n); }
.fft-rag-glyph { flex: none; display: block; overflow: visible; }
.fft-rag-glyph path { fill: var(--fft-rag, var(--fft-muted)); }
.fft-rag-glyph path[data-shape="ring"] { fill: none; stroke: var(--fft-rag, var(--fft-muted)); stroke-width: 1.5; }
.fft-rag-pill {
  display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px 2px 5px; border-radius: var(--fft-radius-pill);
  font-size: var(--fft-fs-s); line-height: 13px; font-weight: 600; white-space: nowrap;
  color: color-mix(in srgb, var(--fft-rag) 70%, var(--fft-text));
  background: color-mix(in srgb, var(--fft-rag) 12%, transparent);
}
.fft-rag-pill[data-compact] { padding: 3px; }
.fft-kpi-rag, .fft-stat-rag { align-self: flex-start; margin-top: 5px; }

.fft-ragboard, .fft-ragtrend { display: flex; flex-direction: column; gap: 13px; }
.fft-rag-summary { display: flex; flex-wrap: wrap; gap: 8px 21px; margin: 0; padding: 0; list-style: none; }
.fft-rag-sum { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fft-fs-m); line-height: 21px; color: var(--fft-text-secondary); }
.fft-rag-sum-count { font-size: var(--fft-fs-l); line-height: 21px; font-weight: 600; color: var(--fft-text); font-variant-numeric: tabular-nums; }
.fft-rag-sum-share { color: var(--fft-muted); font-variant-numeric: tabular-nums; }
.fft-rag-scroll { overflow-x: auto; }
.fft-rag-table, .fft-ragtrend-table { border-collapse: separate; border-spacing: 3px; width: 100%; font-size: var(--fft-fs-s); line-height: 13px; }
.fft-rag-table th, .fft-ragtrend-table th { font-weight: 500; color: var(--fft-text-secondary); text-align: center; vertical-align: bottom; }
.fft-rag-corner { text-align: left !important; font-size: var(--fft-fs-s); color: var(--fft-muted) !important; }
.fft-rag-head { font-size: var(--fft-fs-s); padding: 0 2px 5px; min-width: 34px; max-width: 89px; overflow-wrap: normal; hyphens: manual; word-break: normal; }
.fft-rag-head-overall { color: var(--fft-text) !important; font-weight: 600 !important; }
.fft-rag-name { text-align: left !important; vertical-align: middle !important; padding: 3px 13px 3px 0; min-width: 89px; color: var(--fft-text) !important; }
.fft-rag-name-text { display: block; font-weight: 500; }
.fft-rag-note { display: block; margin-top: 2px; font-size: var(--fft-fs-s); font-weight: 400; color: var(--fft-muted); }
.fft-rag-cell, .fft-ragtrend-cell {
  position: relative; height: 30px; padding: 0; border-radius: var(--fft-radius-m); text-align: center; vertical-align: middle; cursor: pointer; outline: none;
  background: color-mix(in srgb, var(--fft-rag) 11%, transparent);
  transition: opacity 377ms var(--fft-ease), background 233ms var(--fft-ease);
}
.fft-rag-cell .fft-rag-glyph, .fft-ragtrend-cell .fft-rag-glyph { margin: 0 auto; }
.fft-rag-cell[data-overall] { background: color-mix(in srgb, var(--fft-rag) 18%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--fft-rag) 34%, transparent); }
.fft-rag-cell[data-rag="N"], .fft-ragtrend-cell[data-rag="N"] { background: color-mix(in srgb, var(--fft-text) 3%, transparent); }
.fft-rag-cell:hover, .fft-ragtrend-cell:hover { background: color-mix(in srgb, var(--fft-rag) 22%, transparent); }
.fft-rag-cell:focus-visible, .fft-ragtrend-cell:focus-visible { box-shadow: 0 0 0 2px var(--fft-ring, var(--fft-surface)), 0 0 0 4px var(--fft-accent); }
.fft-rag-table[data-active] .fft-rag-row:not([data-active]) :is(.fft-rag-cell, .fft-rag-name),
.fft-ragtrend-table[data-active] .fft-ragtrend-row:not([data-active]) :is(.fft-ragtrend-cell, .fft-rag-name) { opacity: var(--fft-dim); }
.fft-rag-trend { position: absolute; top: 1px; right: 4px; font-size: var(--fft-fs-xs); line-height: 11px; font-weight: 700; color: var(--fft-text-secondary); }
.fft-rag-cell[data-trend="worse"] .fft-rag-trend { color: var(--fft-rag-r); }
.fft-rag-group th { padding: 13px 0 3px; text-align: left; font-size: var(--fft-fs-s); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--fft-muted); }
.fft-rag-foot th { text-align: left !important; font-size: var(--fft-fs-s); color: var(--fft-muted) !important; padding-top: 5px; }
.fft-rag-tally { padding-top: 5px; text-align: center; font-size: var(--fft-fs-s); color: var(--fft-text-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; }
.fft-rag-tally-part { display: inline-flex; align-items: center; gap: 2px; margin: 0 3px; }
.fft-rag-legend li { display: inline-flex; align-items: center; gap: 5px; }
.fft-ragtrend-period { font-size: var(--fft-fs-xs) !important; font-weight: 400 !important; padding-bottom: 5px; white-space: nowrap; }
.fft-ragtrend-cell { height: 26px; min-width: 21px; }
.fft-ragtrend-cell[data-changed]::before { content: ""; position: absolute; left: -2px; top: 4px; bottom: 4px; width: 2px; border-radius: var(--fft-radius-s); background: var(--fft-text); }
.fft-ragtrend-now { font-size: var(--fft-fs-s) !important; text-align: left !important; padding-left: 8px; }
.fft-ragtrend-end { padding-left: 8px; white-space: nowrap; }
.fft-widget[data-animate] :is(.fft-rag-row, .fft-ragtrend-row) { animation: fft-fade 377ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 21ms), 610ms); }
/* WP3: row views on the shared kit. highlight keeps the named rows in color; the rest step back to the grey every view uses. */
.fft-db-row[data-muted] :is(.fft-db-from, .fft-db-to, .fft-db-head) { fill: var(--fft-deemphasis) !important; }
.fft-db-row[data-muted] .fft-db-shaft { stroke: var(--fft-deemphasis) !important; }
.fft-pyr-row[data-muted] .fft-pyr-bar { fill: var(--fft-deemphasis) !important; }
.fft-funnel-row[data-muted] .fft-funnel-bar { background: var(--fft-deemphasis); }
.fft-strip[data-muted] .fft-strip-sq { fill: var(--fft-deemphasis) !important; }
:is(.fft-db-row, .fft-pyr-row, .fft-funnel-row, .fft-strip)[data-muted] :is(.fft-db-label, .fft-pyr-label, .fft-funnel-label, .fft-strip-label) { color: var(--fft-text-secondary); fill: var(--fft-text-secondary); }
/* Meters and funnels dim the rest while one is pointed at, like every other row view. */
.fft-meters[data-active] .fft-meter:not([data-active]), .fft-funnel[data-active] .fft-funnel-row:not([data-active]) { opacity: var(--fft-dim); transition: opacity 377ms var(--fft-ease); }
.fft-widget[data-animate] .fft-meter[style*="--fft-i"] .fft-meter-fill { animation-delay: min(calc(var(--fft-i, 0) * 55ms), 610ms); }
/* WP4: cartesian and grid views on the shared kit. */
/* A view with nothing to draw says what is missing, quietly, where the marks would be. */
.fft-empty-note { margin: 8px 0 0; font-size: var(--fft-fs-s); line-height: 18px; color: var(--fft-text-secondary); }
/* Highlight: the steps it does not name step back to the de-emphasis grey. */
.fft-step[data-muted] { fill: var(--fft-deemphasis); }
/* Heat cells and calendar days dim the rest while one is pointed at, as every view's marks do. */
.fft-heatmap .fft-cell { transition: opacity 377ms var(--fft-ease); }
.fft-heatmap[data-active] .fft-cell:not([data-active]):not(.fft-cell-empty) { opacity: var(--fft-dim); }
.fft-day { transition: opacity 377ms var(--fft-ease); }
.fft-calendar[data-active] .fft-day:not([data-active]) { opacity: var(--fft-dim); }
/* Staggered entry for heat cells and table rows. */
.fft-widget[data-animate] .fft-heatmap .fft-cell { animation: fft-fade 377ms var(--fft-ease) both; animation-delay: min(calc(var(--fft-i, 0) * 5ms), 610ms); }
.fft-widget[data-animate] .fft-table tbody tr { animation: fft-fade 377ms var(--fft-ease) both; animation-delay: min(calc(min(var(--fft-i, 0), 21) * 13ms), 610ms); }

/* KPI kit: a missing number is a quiet dash, never an empty box; a strip with no tiles says so in one line. */
:is(.fft-kpi-value, .fft-stat-value):is([data-empty], [data-zero]) { color: var(--fft-muted); }
.fft-sparkline[data-empty] { visibility: hidden; }
.fft-stats-empty { margin: 0; font-size: var(--fft-fs-m); color: var(--fft-text-secondary); }

/* WP3b: the row views that had no dimming step back like the rest while one row is pointed at. */
.fft-dumbbell[data-active] .fft-db-row:not([data-active]),
.fft-bullets[data-active] .fft-bullet:not([data-active]),
.fft-history-wrap[data-active] .fft-history-event:not([data-active]),
.fft-anomalies[data-active] .fft-anom-lane:not([data-active]) { opacity: var(--fft-dim); }
:is(.fft-db-row, .fft-bullet, .fft-history-event, .fft-anom-lane) { transition: opacity 377ms var(--fft-ease); }
/* The pointed lane's own flags stay full strength. */
.fft-anomalies[data-active] .fft-anom-lane[data-active] .fft-anom-flag { opacity: 1; }
/* A meter's name ends in an ellipsis when longer than its line, as every row view's does. */
.fft-meter-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* Highlight on lifecycle and matrix: the rows not named step back to grey. */
.fft-lc-lane[data-muted] :is(.fft-lc-label, .fft-lc-status-text) { fill: var(--fft-muted); }
.fft-mx-row[data-muted] { fill: var(--fft-muted); }
/* ragtrend: every period cell the same size, from the card, never from its content. */
.fft-ragtrend-table { table-layout: fixed; width: auto; }
.fft-ragtrend-cell { width: var(--fft-rt-cell, 26px); min-width: 0; height: 26px; }
.fft-ragtrend-period { position: relative; overflow: visible; height: 21px; padding: 0 !important; }
.fft-ragtrend-period-text { position: absolute; left: 0; bottom: 5px; white-space: nowrap; }
.fft-ragtrend-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fft-ragtrend-table[data-narrow] .fft-rag-pill[data-compact] .fft-rag-word { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.fft-ragtrend-table[data-narrow] .fft-ragtrend-end { padding-left: 3px; }
.fft-ragtrend .fft-rag-glyph { flex: none; max-width: none; }
/* P4: grids of equal cells. A heatmap's columns are sized from the card in px; when the card is too narrow for a
   tappable 21px cell the grid keeps that size and scrolls sideways. Row names stay on one line, cut with an ellipsis. */
.fft-heat[data-scrolls] { overflow-x: auto; scrollbar-width: thin; }
.fft-heat-row { display: block; align-self: center; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fft-heatmap .fft-cell { min-width: 0; overflow: hidden; }
.fft-ws[data-scrolls] { overflow-x: auto; scrollbar-width: thin; }
.fft-ws[data-scrolls] .fft-ws-grid { width: max-content; }
.fft-ws-more { margin: 8px 0 0; font-size: var(--fft-fs-s); color: var(--fft-muted); }
.fft-state-action { margin-top: 8px; min-height: 34px; padding: 0 13px; border: 1px solid color-mix(in srgb, var(--fft-text) 14%, transparent); border-radius: var(--fft-radius-pill); background: transparent; color: var(--fft-text); font: inherit; font-size: var(--fft-fs-m); cursor: pointer; }
.fft-state-action:hover { background: color-mix(in srgb, var(--fft-text) 6%, transparent); }
.fft-state-action:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; }

/* Scale: long tables show their first rows and a Show more button. */
.fft-table-more { display: flex; align-items: center; justify-content: space-between; gap: 13px; margin-top: 8px; font-size: var(--fft-fs-s); color: var(--fft-text-secondary); }
.fft-table-more[hidden] { display: none; }
.fft-point-dense { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 0.75; pointer-events: none; transition: opacity 377ms var(--fft-ease); }
.fft-chart[data-active] .fft-point-dense { opacity: var(--fft-dim); }
.fft-point-probe { stroke: var(--fft-ring, var(--fft-surface)); stroke-width: 2; pointer-events: none; }
.fft-point-layer { fill: transparent; cursor: crosshair; outline: none; }
.fft-point-layer:focus-visible { stroke: var(--fft-accent); stroke-width: 2; }
.fft-heat-scroll { max-width: 100%; overflow-x: auto; }
.fft-heat-dense { display: block; }
.fft-heat-step[data-step="1"] { fill: var(--fft-seq-1); }
.fft-heat-step[data-step="2"] { fill: var(--fft-seq-2); }
.fft-heat-step[data-step="3"] { fill: var(--fft-seq-3); }
.fft-heat-step[data-step="4"] { fill: var(--fft-seq-4); }
.fft-heat-step[data-step="5"] { fill: var(--fft-seq-5); }
.fft-heat-step[data-step="6"] { fill: var(--fft-seq-6); }
.fft-heat-step[data-step="7"] { fill: var(--fft-seq-7); }
.fft-heat-dense-row, .fft-heat-dense-col { fill: var(--fft-text-secondary); font-size: var(--fft-fs-s); }
.fft-heat-probe { fill: none; stroke: var(--fft-text); stroke-width: 1.5; pointer-events: none; }
.fft-heat-layer { fill: transparent; cursor: crosshair; outline: none; }
.fft-heat-layer:focus-visible { stroke: var(--fft-accent); stroke-width: 2; }

/* Datawrapper, second wave: colour rules in words, rich tooltips, the live-data stamp. */
.fft-rule-key { margin-bottom: 8px; }
.fft-tooltip-rich { display: block; gap: 0; font-size: var(--fft-fs-m); line-height: 18px; font-variant-numeric: tabular-nums; }
.fft-tooltip-rich strong { font-weight: 600; }
.fft-tooltip-bar { display: inline-block; vertical-align: middle; width: 55px; height: 6px; margin: 0 5px; border-radius: var(--fft-radius-s); background: color-mix(in srgb, var(--fft-text) 10%, transparent); overflow: hidden; }
.fft-tooltip-bar-fill { display: block; height: 100%; border-radius: var(--fft-radius-s); background: var(--fft-accent); }
.fft-tooltip-bar-fill[data-negative] { background: var(--fft-down); }
.fft-updated { margin: 0; font-size: var(--fft-fs-s); line-height: 13px; color: var(--fft-muted); font-variant-numeric: tabular-nums; }
.fft-updated[data-stale="true"] { color: var(--fft-text-secondary); }
/* Noise: marks that would repeat themselves. Dots between a line's ends show only while it is pointed at; a history
   dot is a small swatch of its kind's color. */
.fft-bump-dot[data-mid], .fft-pareto-dot[data-mid] { opacity: 0; transition: opacity 233ms var(--fft-ease); }
.fft-bump:hover .fft-bump-dot[data-mid], .fft-bump[data-active] .fft-bump-dot[data-mid], .fft-pareto-dot[data-mid][data-active] { opacity: 1; }
.fft-widget[data-animate] .fft-bump-dot[data-mid], .fft-widget[data-animate] .fft-pareto-dot[data-mid] { animation: none; }
.fft-history-dot { width: 11px; height: 11px; left: -24px; top: 6px; font-size: 0; }
/* The wallet audit on the x-ray card: quiet buttons, a panel that reads worst news first. */
.fft-xray-audit { display: flex; flex-direction: column; gap: 8px; margin-top: 13px; }
.fft-xray-audit-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.fft-xray-audit-button { min-height: 34px; padding: 0 13px; border: 1px solid color-mix(in srgb, var(--fft-text) 14%, transparent); border-radius: var(--fft-radius-pill); background: transparent; color: var(--fft-text); font: inherit; font-size: var(--fft-fs-m); cursor: pointer; }
.fft-xray-audit-button:hover { background: color-mix(in srgb, var(--fft-text) 6%, transparent); }
.fft-xray-audit-button:focus-visible { outline: 2px solid var(--fft-accent); outline-offset: 2px; }
.fft-xray-audit-status { font-size: var(--fft-fs-s); color: var(--fft-text-secondary); }
.fft-xray-audit-panel { display: flex; flex-direction: column; gap: 13px; padding: 13px; border-radius: var(--fft-radius-l); background: color-mix(in srgb, var(--fft-text) 4%, transparent); font-size: var(--fft-fs-m); line-height: 21px; outline: none; }
.fft-xray-audit-panel[hidden] { display: none; }
.fft-xray-audit-panel:focus-visible { box-shadow: 0 0 0 2px var(--fft-accent); }
.fft-xray-audit-part { display: flex; flex-direction: column; gap: 5px; }
.fft-xray-audit-part p { margin: 0; }
.fft-xray-audit-head { margin: 0; font-size: var(--fft-fs-s); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--fft-text-secondary); }
.fft-xray-audit-list { margin: 0; padding-left: 21px; display: flex; flex-direction: column; gap: 5px; }
.fft-xray-audit-risk { list-style: none; margin-left: -21px; display: flex; gap: 8px; align-items: baseline; }
.fft-xray-audit-severity { flex: none; min-width: 55px; font-size: var(--fft-fs-s); font-weight: 600; }
.fft-xray-audit-risk[data-severity="high"] .fft-xray-audit-severity { color: var(--fft-rag-r, var(--fft-down)); }
.fft-xray-audit-risk[data-severity="medium"] .fft-xray-audit-severity { color: var(--fft-rag-a, var(--fft-text-secondary)); }
.fft-xray-audit-note, .fft-xray-audit-empty { color: var(--fft-text-secondary); font-size: var(--fft-fs-s); }
`;
