// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { minifyCss, minifyCssLiterals } from "../scripts/css-minify.ts";
import { describePresets, getPreset } from "./core/presets.ts";
import { BASE_CSS, DARK, LIGHT } from "./dom/styles.ts";

/** Every rule of a stylesheet as the browser reads it: minifying must not change one. */
function rules(css: string): string[] {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
  // jsdom keeps a selector list's line breaks in cssText; a browser reads any run of white space as one space.
  const out = [...(style.sheet?.cssRules ?? [])].map((rule) => rule.cssText.replace(/\s+/g, " "));
  style.remove();
  return out;
}

describe("the build's CSS minifier", () => {
  test("the base stylesheet reads the same, rule for rule, and is smaller", () => {
    const small = minifyCss(BASE_CSS);
    expect(small.length).toBeLessThan(BASE_CSS.length * 0.9);
    expect(rules(small)).toEqual(rules(BASE_CSS));
  });

  test("the theme tokens and every preset read the same", () => {
    for (const css of [`.x {${LIGHT}}`, `.x {${DARK}}`]) expect(rules(minifyCss(css))).toEqual(rules(css));
    for (const { name } of describePresets()) {
      const preset = getPreset(name);
      for (const css of [preset?.css, preset?.dark?.css].filter((c): c is string => typeof c === "string")) {
        const scoped = css.replaceAll("&", ".fft-widget");
        expect([name, rules(minifyCss(scoped))]).toEqual([name, rules(scoped)]);
      }
    }
  });

  test("quoted strings, descendant combinators before a colon and spaces in values stay", () => {
    expect(minifyCss('.a :hover { content: "a  b"; margin: 0 auto }')).toBe('.a :hover{content: "a  b";margin: 0 auto}');
    expect(minifyCss("/* note */ .a{ color : red ; }")).toBe(".a{color : red}");
  });

  test("in source, only the stylesheet literals change, and every interpolation is copied as written", () => {
    const source = readFileSync("src/dom/styles.ts", "utf8");
    const small = minifyCssLiterals(source);
    const interpolations = (text: string) => text.match(/\$\{[^}]*\}/g) ?? [];
    expect(interpolations(small)).toEqual(interpolations(source));
    // Code outside the literals is untouched: the functions read the same.
    expect(small).toContain("export function applyStyle(");
    expect(small.length).toBeLessThan(source.length);
    const nested = "const a = `\n  .x {\n    color: ${pick(`red`)};\n  }\n`;";
    expect(minifyCssLiterals(nested)).toBe("const a = ` .x{color: ${pick(`red`)}}`;");
  });
});
