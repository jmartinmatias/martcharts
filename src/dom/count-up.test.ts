// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { WidgetSpec } from "../core/types.ts";
import { countable, countUp } from "./count-up.ts";
import { createWidget } from "./widget.ts";
import "./views/index.ts";

let frames: FrameRequestCallback[] = [];
const runFrame = (time: number) => {
  const pending = frames;
  frames = [];
  for (const frame of pending) frame(time);
};
const motion = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("no-preference") ? !reduce : reduce, media: query }));

beforeEach(() => {
  document.body.innerHTML = "";
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame));
});
afterEach(() => vi.unstubAllGlobals());

function number(value: number, format = (n: number) => String(n)) {
  const el = document.createElement("span");
  el.textContent = format(value);
  countable(el, value, format);
  document.body.append(el);
  return el;
}

describe("countUp", () => {
  test("counts from zero to the value, ending on exactly the formatted value", () => {
    motion(false);
    const el = number(1200, (n) => `€${n.toLocaleString("en-US")}`);
    countUp(document.body);
    expect(el.textContent).toBe("€0");
    runFrame(0);
    runFrame(400);
    const middle = Number(el.textContent?.replace(/[€,]/g, ""));
    expect(middle).toBeGreaterThan(0);
    expect(middle).toBeLessThan(1200);
    runFrame(2000);
    expect(el.textContent).toBe("€1,200");
    expect(frames.length).toBe(0);
  });

  test("whole numbers stay whole on the way up", () => {
    motion(false);
    const el = number(66);
    countUp(document.body);
    runFrame(0);
    runFrame(300);
    expect(el.textContent).toMatch(/^\d+$/);
  });

  test("decimals keep the value's own precision on the way up", () => {
    motion(false);
    const el = number(0.031);
    countUp(document.body);
    runFrame(0);
    runFrame(300);
    expect(el.textContent?.split(".")[1]?.length ?? 0).toBeLessThanOrEqual(3);
  });

  test("does nothing when the reader prefers reduced motion", () => {
    motion(true);
    const el = number(1200);
    countUp(document.body);
    expect([el.textContent, frames.length]).toEqual(["1200", 0]);
  });

  test("does nothing when motion preference is unknown", () => {
    const el = number(1200);
    countUp(document.body);
    expect([el.textContent, frames.length]).toEqual(["1200", 0]);
  });
});

describe("widget entrance", () => {
  const spec = { locale: "en-US", data: { type: "inline", rows: [{ v: 1200 }] }, view: { type: "kpi", value: "v" } } as WidgetSpec;

  test("the kpi number counts up on the first draw", async () => {
    motion(false);
    const target = document.createElement("div");
    document.body.append(target);
    await createWidget(target, spec).ready;
    const value = target.querySelector(".fft-kpi-value");
    expect(value?.textContent).toBe("0");
    runFrame(0);
    runFrame(5000);
    expect(value?.textContent).toBe("1.2K");
  });

  test("the headline number counts up too", async () => {
    motion(false);
    const target = document.createElement("div");
    document.body.append(target);
    await createWidget(target, { ...spec, headline: { value: "v" }, view: { type: "table" } } as WidgetSpec).ready;
    const value = target.querySelector(".fft-headline-value");
    expect(value?.textContent).toBe("0");
    runFrame(0);
    runFrame(5000);
    expect(value?.textContent).toBe("1.2K");
  });
});
