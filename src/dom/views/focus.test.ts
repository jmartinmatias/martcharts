// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { roving } from "./focus.ts";

let items: HTMLElement[];
beforeEach(() => {
  document.body.innerHTML = "";
  items = Array.from({ length: 6 }, (_, i) => {
    const el = document.createElement("div");
    el.textContent = String(i);
    document.body.append(el);
    return el;
  });
});
const press = (el: Element, key: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

describe("roving focus", () => {
  test("only the first item is a tab stop", () => {
    roving(items);
    expect(items.map((el) => el.getAttribute("tabindex"))).toEqual(["0", "-1", "-1", "-1", "-1", "-1"]);
  });

  test("arrows move focus one step and carry the tab stop along", () => {
    roving(items);
    items[0]?.focus();
    press(items[0] as Element, "ArrowRight");
    expect(document.activeElement).toBe(items[1]);
    expect(items.map((el) => el.getAttribute("tabindex"))).toEqual(["-1", "0", "-1", "-1", "-1", "-1"]);
    press(items[1] as Element, "ArrowLeft");
    expect(document.activeElement).toBe(items[0]);
  });

  test("Home and End jump to the ends; arrows stop there instead of wrapping", () => {
    roving(items);
    press(items[0] as Element, "End");
    expect(document.activeElement).toBe(items[5]);
    press(items[5] as Element, "ArrowRight");
    expect(document.activeElement).toBe(items[5]);
    press(items[5] as Element, "Home");
    expect(document.activeElement).toBe(items[0]);
  });

  test("in a grid, up and down move by a whole row", () => {
    roving(items, { down: 3 });
    press(items[1] as Element, "ArrowDown");
    expect(document.activeElement).toBe(items[4]);
    press(items[4] as Element, "ArrowUp");
    expect(document.activeElement).toBe(items[1]);
  });
});
