/**
 * Contrast, computed from the theme tokens (WCAG 2.1 SC 1.4.3 and 1.4.11, as
 * required by EN 301 549): text at 4.5:1 on its background, data marks and the
 * accent at 3:1, in both themes and every preset. axe cannot measure contrast
 * in jsdom, so this is where it is enforced.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { contrast, parseHex, toHex } from "../core/color.ts";
import { getPreset } from "../core/presets.ts";
import { parseTokens, themeTokens } from "./styles.ts";

/** A color as opaque hex: translucent rgba is laid over `under`, and transparent is `under` itself. */
function solid(value: string, under: string): string {
  if (value.trim() === "transparent") return toHex(parseHex(under) ?? [1, 1, 1]);
  const rgba = /^rgba?\(([^)]+)\)$/.exec(value.trim());
  if (!rgba) return toHex(parseHex(value) ?? [0, 0, 0]);
  const [r = 0, g = 0, b = 0, a = 1] = (rgba[1] ?? "").split(",").map((part) => Number(part.trim()));
  const base = parseHex(under) ?? [0, 0, 0];
  return toHex([(r / 255) * a + base[0] * (1 - a), (g / 255) * a + base[1] * (1 - a), (b / 255) * a + base[2] * (1 - a)]);
}

/** CSS color-mix(in srgb, a weight%, b): channels interpolated as stored. */
function mix(a: string, weight: number, b: string): string {
  const [x, y] = [parseHex(a) ?? [0, 0, 0], parseHex(b) ?? [0, 0, 0]];
  return toHex([0, 1, 2].map((i) => (x[i] as number) * weight + (y[i] as number) * (1 - weight)) as [number, number, number]);
}

interface Context {
  name: string;
  tokens: Record<string, string>;
  surface: string;
  palette: string[];
}

const contexts: Context[] = [
  ...(["light", "dark"] as const).map((scheme) => ({ name: `default ${scheme}`, tokens: themeTokens(scheme), palette: [] as string[] })),
  // Every preset in both of its looks: the light one, and the dark one laid over it (as its stylesheet does).
  ...["glass", "airy", "paper"].flatMap((name) => {
    const preset = getPreset(name);
    const light = { name: `${name} light`, tokens: { ...themeTokens("light"), ...parseTokens(preset?.css ?? "") }, palette: preset?.palette ?? [] };
    if (!preset?.dark) return [light];
    const dark = { name: `${name} dark`, tokens: { ...themeTokens("dark"), ...parseTokens(preset.css), ...parseTokens(preset.dark.css) }, palette: preset.dark.palette ?? preset.palette ?? [] };
    return [light, dark];
  }),
].map((context) => {
  // A translucent or transparent card shows the color behind it, which its ring token names: laid over it, conservatively.
  const raw = context.tokens.surface ?? "#ffffff";
  const surface = raw.startsWith("#") ? raw : solid(raw, context.tokens.ring ?? "#ffffff");
  const series = Array.from({ length: 8 }, (_, i) => context.tokens[`series-${i + 1}`]).filter((c): c is string => Boolean(c));
  return { ...context, surface, palette: context.palette.length ? context.palette : series };
});

const css = readFileSync("src/dom/styles.ts", "utf8");
const ratio = (fg: string, bg: string) => Math.round(contrast(fg, bg) * 100) / 100;

describe.each(contexts)("contrast in $name", (context) => {
  const color = (token: string) => solid(context.tokens[token] ?? "#000000", context.surface);

  test("every text color reaches 4.5:1 on the card (1.4.3)", () => {
    const text = ["text", "text-secondary", "muted", "accent", "positive", "negative", "warning"].filter((t) => context.tokens[t]);
    expect(text.filter((t) => ratio(color(t), context.surface) < 4.5).map((t) => `${t} ${ratio(color(t), context.surface)}`)).toEqual([]);
  });

  test("the zero line stands apart from the gridlines, so the baseline reads at a glance", () => {
    expect([context.name, ratio(color("axis"), color("grid")) >= 1.3]).toEqual([context.name, true]);
  });

  test("every heat step's text reaches 4.5:1 on its own fill (1.4.3)", () => {
    const steps = Array.from({ length: 7 }, (_, i) => i + 1).filter((n) => context.tokens[`seq-${n}`]);
    const low = steps.filter((n) => ratio(color(`seq-text-${n}`), color(`seq-${n}`)) < 4.5);
    expect(low.map((n) => `step ${n}: ${ratio(color(`seq-text-${n}`), color(`seq-${n}`))}`)).toEqual([]);
  });

  test("every series color, a data mark, reaches 3:1 on the card (1.4.11)", () => {
    expect(context.palette.filter((c) => ratio(solid(c, context.surface), context.surface) < 3).map((c) => `${c} ${ratio(solid(c, context.surface), context.surface)}`)).toEqual([]);
  });

  test("badge text reaches 4.5:1 on its own tint (1.4.3)", () => {
    const tones = ["positive", "warning", "negative", "accent", "text-secondary", "muted"].filter((t) => context.tokens[t]);
    const low = tones.filter((t) => {
      const tint = mix(color(t), 0.13, context.surface);
      return ratio(mix(color(t), 0.72, color("text")), tint) < 4.5;
    });
    expect(low).toEqual([]);
  });
});

describe("text never fades below its color", () => {
  const block = (selector: string) => css.slice(css.indexOf(`${selector} {`), css.indexOf("}", css.indexOf(`${selector} {`)));

  test("badges darken their tone toward the text color, the formula the badge test measures", () => {
    expect(block(".fft-badge")).toContain("color: color-mix(in srgb, var(--fft-tone) 72%, var(--fft-text))");
  });

  test("the ghost ref keeps the muted color at rest, quiet by size and spacing rather than opacity", () => {
    const ref = block(".fft-widget-ref");
    expect([ref.includes("color: var(--fft-muted)"), ref.includes("opacity")]).toEqual([true, false]);
    expect(css).not.toMatch(/\.fft-widget:hover \.fft-widget-ref \{ opacity/);
  });

  test("de-emphasized slope and bump labels use the muted color, not opacity", () => {
    expect(css).not.toMatch(/-label \{ opacity: 0\.\d+; \}/);
  });
});

describe("dashboard text that sits on the page, not on a card", () => {
  const css = readFileSync("src/dom/styles.ts", "utf8");
  // Page backgrounds are often a step darker than the cards (the demo's are #f9f9f7, #f4f4f2 and paper's #f1ece2).
  const pages = ["#f9f9f7", "#f4f4f2", "#f1ece2"];

  test("section descriptions use the secondary text color, which keeps 4.5:1 on darker page backgrounds", () => {
    expect(css).toMatch(/\.fft-board-section p \{[^}]*color: var\(--fft-text-secondary\)/);
    const secondary = [themeTokens("light")["text-secondary"] ?? "", parseTokens(getPreset("paper")?.css ?? "")["text-secondary"] ?? ""];
    expect(secondary.flatMap((c) => pages.filter((page) => contrast(c, page) < 4.5))).toEqual([]);
  });
});
