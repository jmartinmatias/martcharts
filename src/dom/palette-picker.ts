/**
 * A palette picker: choose series colors from the library, edit each color,
 * pick colors off the screen with the browser's eyedropper, and see at once
 * whether the result can be told apart (colorblind separation, neighbour
 * separation, lightness, colorfulness and contrast).
 *
 * @module
 */
import { checkPalette, parseHex, toHex } from "../core/color.ts";
import { describePalettes, getPalette } from "../core/palettes.ts";
import { ensureStyles } from "./styles.ts";

/** Options for `createPalettePicker`. */
export interface PalettePickerOptions {
  /** Starting colors, or the name of a library palette. Default: the default palette. */
  value?: string[] | string;
  /** Which lightness band the checks apply. Default: the system's color scheme. */
  mode?: "light" | "dark";
  /** Chart background the checks measure contrast against. */
  surface?: string;
  /** Called after every change the viewer makes, with the colors and, when unmodified, the library palette's name. */
  onChange?(colors: string[], name?: string): void;
}

/** A live palette picker. */
export interface PalettePicker {
  /** The current colors, as lowercase hex. */
  readonly colors: string[];
  /** Replaces the colors (a list or a library name) without calling `onChange`. */
  set(value: string[] | string): void;
  /** Changes the background the checks use. */
  setSurface(mode: "light" | "dark", surface?: string): void;
  /** Removes the picker. */
  destroy(): void;
}

interface EyeDropperLike {
  open(): Promise<{ sRGBHex: string }>;
}

const normalize = (color: string) => {
  const rgb = parseHex(color);
  return rgb ? toHex(rgb) : color.toLowerCase();
};

const TONE = { pass: "positive", warn: "warning", fail: "negative" } as const;
const STATE_TEXT = { pass: "Pass", warn: "Check", fail: "Fail" } as const;

/**
 * Draws a palette picker inside `target`.
 *
 * @example
 * createPalettePicker(document.querySelector("#colors")!, {
 *   value: "apple",
 *   onChange: (colors, name) => widget.update({ style: { palette: name ?? colors } }),
 * });
 */
export function createPalettePicker(target: HTMLElement, options: PalettePickerOptions = {}): PalettePicker {
  const doc = target.ownerDocument;
  ensureStyles(doc);
  const win = doc.defaultView as (Window & { EyeDropper?: new () => EyeDropperLike }) | null;
  let mode: "light" | "dark" = options.mode ?? (win?.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  let surface = options.surface;
  let colors: string[] = [];
  let name: string | undefined;

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const root = el("div", "fft-picker");
  const library = el("div", "fft-picker-library");
  library.setAttribute("role", "radiogroup");
  library.setAttribute("aria-label", "Palette library");
  const swatches = el("ol", "fft-picker-swatches");
  const add = el("button", "fft-picker-add", "Add color");
  add.type = "button";
  const checks = el("ul", "fft-picker-checks");
  checks.setAttribute("aria-live", "polite");
  root.append(library, swatches, add, checks);
  target.append(root);

  for (const palette of describePalettes()) {
    const button = el("button", "fft-picker-chip");
    button.type = "button";
    button.dataset.name = palette.name;
    button.setAttribute("role", "radio");
    button.title = palette.source ? `${palette.description} ${palette.source}` : palette.description;
    const strip = el("span", "fft-picker-strip");
    strip.setAttribute("aria-hidden", "true");
    for (const color of palette.colors) {
      const dot = el("span");
      dot.style.background = color;
      strip.append(dot);
    }
    button.append(strip, palette.label);
    button.addEventListener("click", () => {
      load(palette.name);
      emit();
    });
    library.append(button);
  }

  function load(value: string[] | string) {
    if (typeof value === "string") {
      const palette = getPalette(value) ?? getPalette("default");
      name = palette?.name;
      colors = ((mode === "dark" ? palette?.darkColors : undefined) ?? palette?.colors ?? []).map(normalize);
    } else {
      name = undefined;
      colors = value.map(normalize);
    }
    render();
  }

  function emit() {
    options.onChange?.([...colors], name);
  }

  function change(index: number, color: string) {
    colors[index] = normalize(color);
    name = undefined;
    renderChips();
    renderChecks();
    const swatch = swatches.children[index];
    const picker = swatch?.querySelector<HTMLInputElement>('input[type="color"]');
    const hex = swatch?.querySelector<HTMLInputElement>(".fft-picker-hex");
    if (picker && picker.value !== colors[index]) picker.value = colors[index] as string;
    if (hex && doc.activeElement !== hex) hex.value = colors[index] as string;
    emit();
  }

  function renderChips() {
    for (const chip of library.querySelectorAll<HTMLElement>(".fft-picker-chip")) chip.setAttribute("aria-checked", String(chip.dataset.name === name));
  }

  function renderSwatches() {
    swatches.replaceChildren();
    colors.forEach((color, i) => {
      const item = el("li", "fft-picker-swatch");
      const label = `Series ${i + 1}`;
      const picker = el("input");
      picker.type = "color";
      picker.value = parseHex(color) ? color : "#000000";
      picker.setAttribute("aria-label", `${label} color`);
      picker.addEventListener("input", () => change(i, picker.value));
      const hex = el("input", "fft-picker-hex");
      hex.type = "text";
      hex.value = color;
      hex.maxLength = 7;
      hex.spellcheck = false;
      hex.setAttribute("aria-label", `${label} hex`);
      hex.addEventListener("input", () => {
        const valid = /^#[0-9a-f]{6}$/i.test(hex.value.trim());
        hex.setAttribute("aria-invalid", String(!valid));
        if (valid) change(i, hex.value.trim());
      });
      item.append(picker, hex);
      if (win?.EyeDropper) {
        const pipette = el("button", "fft-picker-pipette");
        pipette.type = "button";
        pipette.title = "Pick a color from the screen";
        pipette.setAttribute("aria-label", `Pick ${label.toLowerCase()} color from the screen`);
        pipette.innerHTML =
          '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M10.6 1.9a1.9 1.9 0 0 1 2.7 0l.8.8a1.9 1.9 0 0 1 0 2.7l-1.6 1.6.6.6-1 1-.6-.6-5.2 5.2c-.3.3-.6.4-1 .5l-1.9.4.4-1.9c.1-.4.2-.7.5-1l5.2-5.2-.6-.6 1-1 .6.6z" fill="currentColor"/></svg>';
        pipette.addEventListener("click", async () => {
          try {
            const { sRGBHex } = await new (win.EyeDropper as new () => EyeDropperLike)().open();
            change(i, sRGBHex);
          } catch {
            // The viewer pressed Escape: keep the color as it was.
          }
        });
        item.append(pipette);
      }
      const remove = el("button", "fft-picker-remove", "×");
      remove.type = "button";
      remove.disabled = colors.length <= 1;
      remove.setAttribute("aria-label", `Remove ${label.toLowerCase()}`);
      remove.addEventListener("click", () => {
        colors.splice(i, 1);
        name = undefined;
        render();
        emit();
      });
      item.append(remove);
      swatches.append(item);
    });
  }

  function renderChecks() {
    checks.replaceChildren();
    for (const check of checkPalette(colors, { mode, surface }).checks) {
      const item = el("li");
      item.dataset.check = check.name;
      item.dataset.state = check.state;
      const badge = el("span", "fft-badge", STATE_TEXT[check.state]);
      badge.dataset.tone = TONE[check.state];
      item.append(badge, el("span", "fft-picker-check-label", check.label), el("span", "fft-picker-check-text", check.message));
      checks.append(item);
    }
  }

  function render() {
    renderChips();
    renderSwatches();
    renderChecks();
  }

  add.addEventListener("click", () => {
    const next = (getPalette("default")?.colors ?? []).map(normalize).find((c) => !colors.includes(c)) ?? "#808080";
    colors.push(next);
    name = undefined;
    render();
    emit();
  });

  load(options.value ?? "default");

  return {
    get colors() {
      return [...colors];
    },
    set: load,
    setSurface(nextMode, nextSurface) {
      const changed = nextMode !== mode;
      mode = nextMode;
      surface = nextSurface;
      // A palette with its own dark steps swaps to them, as the widgets do.
      if (changed && name && getPalette(name)?.darkColors) load(name);
      else renderChecks();
    },
    destroy() {
      root.remove();
    },
  };
}
