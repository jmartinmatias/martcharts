/**
 * Shrinks the CSS the library carries as template literals (styles.ts, presets.ts, the dashboard's own sheet), at
 * build time only: the source stays readable. Only the static text of a literal is touched; every `${…}` is copied
 * as written. The rules are the safe ones: comments go, runs of white space become one space, and the spaces next
 * to `{`, `}` and `;` go. Spaces before a colon stay ("a :hover" is a descendant, "a:hover" is not), and quoted
 * strings are copied as they are.
 *
 * Used by vite.lib.config.ts and vite.lite.config.ts; tested in src/css-minify.test.ts.
 */
import type { Plugin } from "vite";

/** Minifies plain CSS text: no interpolations inside. */
export function minifyCss(css: string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const ch = css[i] as string;
    // Quoted strings stay exactly as written.
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== ch) j += css[j] === "\\" ? 2 : 1;
      out += css.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end < 0 ? css.length : end + 2;
      continue;
    }
    if (/\s/.test(ch)) {
      let j = i;
      while (j < css.length && /\s/.test(css[j] as string)) j++;
      out += " ";
      i = j;
      continue;
    }
    out += ch;
    i++;
  }
  // Around braces and semicolons a space never matters; elsewhere it may, so it stays.
  return out.replace(/ ?([{};]) ?/g, "$1").replace(/;}/g, "}").trim();
}

/**
 * Minifies the static text of every template literal in `code` that holds CSS (it starts with a line break and has
 * a rule in it). Interpolations are copied as written, nested template literals included.
 */
export function minifyCssLiterals(code: string): string {
  let out = "";
  let i = 0;
  while (i < code.length) {
    const start = code.indexOf("`\n", i);
    if (start < 0) break;
    out += code.slice(i, start + 1);
    // Walk the literal: text runs are collected; `${…}` is copied with its braces balanced.
    let j = start + 1;
    let text = "";
    let body = "";
    let css = true;
    while (j < code.length && code[j] !== "`") {
      if (code[j] === "\\") {
        text += code.slice(j, j + 2);
        j += 2;
        continue;
      }
      if (code[j] === "$" && code[j + 1] === "{") {
        let depth = 1;
        let k = j + 2;
        while (k < code.length && depth > 0) {
          if (code[k] === "`") {
            // A nested literal inside the interpolation: skip to its end.
            k++;
            while (k < code.length && code[k] !== "`") k += code[k] === "\\" ? 2 : 1;
          } else if (code[k] === "{") depth++;
          else if (code[k] === "}") depth--;
          k++;
        }
        body += minifySegment(text) + code.slice(j, k);
        text = "";
        j = k;
        continue;
      }
      text += code[j];
      j++;
    }
    const whole = body + text;
    css = /[{};]/.test(whole) && /[a-z-]+\s*:\s*[^;]+;/.test(whole);
    if (css) out += body + minifySegment(text);
    else out += code.slice(start + 1, j);
    out += "`";
    i = j + 1;
  }
  return out + code.slice(i);

  function minifySegment(segment: string): string {
    // Keep a single space at the edges: it may separate a selector from an interpolated one.
    const lead = /^\s/.test(segment) ? " " : "";
    const tail = /\s$/.test(segment) ? " " : "";
    const inner = minifyCss(segment);
    return inner ? `${/^[{};]/.test(inner) ? "" : lead}${inner}${/[{};]$/.test(inner) ? "" : tail}` : lead || tail ? " " : "";
  }
}

/** The files whose literals are stylesheets. */
const STYLE_FILES = /src\/(dom\/styles|core\/presets|dom\/dashboard)\.ts$/;

/** The Vite plugin: applies minifyCssLiterals to the stylesheet modules during a build. */
export function cssLiterals(): Plugin {
  return {
    name: "fft-css-literals",
    apply: "build",
    transform(code, id) {
      if (!STYLE_FILES.test(id)) return null;
      return { code: minifyCssLiterals(code), map: null };
    },
  };
}
