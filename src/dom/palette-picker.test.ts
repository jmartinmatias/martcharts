// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createPalettePicker } from "./palette-picker.ts";

let target: HTMLElement;
let changes: { colors: string[]; name?: string }[];
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
  changes = [];
});
afterEach(() => vi.unstubAllGlobals());

const onChange = (colors: string[], name?: string) => changes.push({ colors, name });
const hexes = () => [...target.querySelectorAll<HTMLInputElement>(".fft-picker-hex")].map((i) => i.value);
const chip = (name: string) => target.querySelector<HTMLButtonElement>(`.fft-picker-chip[data-name="${name}"]`) as HTMLButtonElement;
const type = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("palette picker", () => {
  test("offers every library palette as a chip, and starts from a named palette", () => {
    createPalettePicker(target, { value: "apple", onChange });
    expect([...target.querySelectorAll(".fft-picker-chip")].map((c) => c.textContent)).toEqual(["50 Shades", "Apple", "B&W", "Crédit Agricole", "Default"]);
    expect(chip("apple").getAttribute("aria-checked")).toBe("true");
    expect(hexes()).toEqual(["#007aff", "#34c759", "#af52de", "#ff9500", "#30b0c7", "#ff3b30", "#ffcc00", "#ff2d55"]);
  });

  test("choosing a chip loads its colors and reports them with the palette name", () => {
    createPalettePicker(target, { value: "apple", onChange });
    chip("bw").click();
    expect(hexes()).toEqual(["#111111", "#4d4d4d", "#808080", "#b3b3b3"]);
    expect(changes.at(-1)).toEqual({ colors: ["#111111", "#4d4d4d", "#808080", "#b3b3b3"], name: "bw" });
    expect(chip("bw").getAttribute("aria-checked")).toBe("true");
  });

  test("typing a hex changes that color, and the palette becomes custom", () => {
    createPalettePicker(target, { value: ["#111111", "#222222"], onChange });
    type(target.querySelectorAll<HTMLInputElement>(".fft-picker-hex")[1] as HTMLInputElement, "#ff0000");
    expect(changes.at(-1)).toEqual({ colors: ["#111111", "#ff0000"], name: undefined });
    expect(target.querySelector('.fft-picker-chip[aria-checked="true"]')).toBeNull();
  });

  test("a half-typed hex is marked invalid and changes nothing", () => {
    createPalettePicker(target, { value: ["#111111"], onChange });
    const input = target.querySelector<HTMLInputElement>(".fft-picker-hex") as HTMLInputElement;
    type(input, "#ff00");
    expect(changes).toEqual([]);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  test("the color field changes the color too", () => {
    createPalettePicker(target, { value: ["#111111"], onChange });
    type(target.querySelector<HTMLInputElement>('input[type="color"]') as HTMLInputElement, "#00ff00");
    expect(changes.at(-1)?.colors).toEqual(["#00ff00"]);
  });

  test("colors can be added and removed, but never below one", () => {
    createPalettePicker(target, { value: ["#111111", "#222222"], onChange });
    target.querySelector<HTMLButtonElement>(".fft-picker-add")?.click();
    expect(hexes().length).toBe(3);
    const removes = () => [...target.querySelectorAll<HTMLButtonElement>(".fft-picker-remove")];
    removes()[0]?.click();
    removes()[0]?.click();
    expect(hexes().length).toBe(1);
    expect(removes()[0]?.disabled).toBe(true);
  });

  test("without an eyedropper in the browser there is no pipette button", () => {
    createPalettePicker(target, { value: ["#111111"], onChange });
    expect(target.querySelector(".fft-picker-pipette")).toBeNull();
  });

  test("with an eyedropper, the pipette picks a color from the screen", async () => {
    vi.stubGlobal(
      "EyeDropper",
      class {
        open() {
          return Promise.resolve({ sRGBHex: "#abcdef" });
        }
      },
    );
    createPalettePicker(target, { value: ["#111111", "#222222"], onChange });
    target.querySelectorAll<HTMLButtonElement>(".fft-picker-pipette")[1]?.click();
    await vi.waitFor(() => expect(changes.at(-1)?.colors).toEqual(["#111111", "#abcdef"]));
  });

  test("shows the accessibility checks for the current colors", () => {
    createPalettePicker(target, { value: "bw", mode: "light", onChange });
    const states = Object.fromEntries([...target.querySelectorAll<HTMLElement>(".fft-picker-checks li")].map((li) => [li.dataset.check, li.dataset.state]));
    expect(states).toMatchObject({ chroma: "fail", cvd: expect.any(String), contrast: expect.any(String) });
  });

  test("the default palette shows its dark-mode steps on a dark background, and the checks pass there", () => {
    const picker = createPalettePicker(target, { value: "default", mode: "light", onChange });
    expect(picker.colors[0]).toBe("#2a78d6");
    picker.setSurface("dark");
    expect(picker.colors[0]).toBe("#3987e5");
    const lightness = target.querySelector<HTMLElement>('.fft-picker-checks li[data-check="lightness"]');
    expect(lightness?.dataset.state).toBe("pass");
    expect(changes).toEqual([]);
  });

  test("set replaces the colors without reporting a change", () => {
    const picker = createPalettePicker(target, { value: ["#111111"], onChange });
    picker.set("apple");
    expect([picker.colors.length, changes.length]).toEqual([8, 0]);
  });
});
