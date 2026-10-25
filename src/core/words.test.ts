import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { langOf, wordsFor } from "./words.ts";
import type { Words } from "./words.ts";

/** The files whose on-screen words must come from the words module. */
const VIEWS = readdirSync("src/dom/views").filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "words.ts").map((f) => `src/dom/views/${f}`);
const CHROME = ["src/dom/widget.ts", "src/dom/dashboard.ts", "src/dom/editor.ts", "src/dom/export.ts"];

/**
 * Literals allowed to carry letters on screen, each with why. Everything else that reaches the screen goes through
 * `wordsFor`. Keep this short: a new entry needs a reason a translator would agree with.
 */
const ALLOWED: { file: string; text: string; why: string }[] = [
  { file: "src/dom/editor.ts", text: "https://…/data.csv", why: "an example address, the same in every language" },
  { file: "src/dom/editor.ts", text: "https://…/regions.geojson", why: "an example address" },
  { file: "src/dom/editor.ts", text: "{region}: {revenue}", why: "an example template: field names, not words" },
  { file: "src/dom/editor.ts", text: "status", why: "an example column name typed into a field" },
  { file: "src/dom/views/scatter.ts", text: "fft-quadrant-label", why: "a class name" },
];

/**
 * Where a literal reaches the screen: the text of a new element, its title, label or placeholder, a tooltip row, a
 * select's option, text appended to an element. Each pattern stops just before the literal, which `literalAt` reads.
 */
const SINKS = [
  String.raw`\bhtml\(\s*doc\s*,\s*"[^"]*"\s*,\s*[^,()]*?,\s*`,
  String.raw`\bel\(\s*"[a-z0-9]+"\s*,\s*[^,()]*?,\s*`,
  String.raw`\bmake\(\s*"[a-z0-9]+"\s*,\s*"[^"]*"\s*,\s*`,
  String.raw`\.(?:textContent|title|placeholder|alt)\s*=\s*`,
  String.raw`setAttribute\(\s*"(?:aria-label|title|aria-description|placeholder|aria-roledescription|aria-valuetext)"\s*,\s*`,
  String.raw`\blabel:\s*`,
  String.raw`tooltip\.show\([^,]+,\s*`,
  String.raw`showMessage\(\s*"[a-z]+"\s*,\s*`,
  String.raw`new Option\(\s*`,
  String.raw`\.append\(\s*`,
  String.raw`\b(?:text|hint|heading):\s*`,
].map((sink) => new RegExp(`${sink}(?=["\x60])`, "g"));

/**
 * The literal starting at `at` (a "string" or a `template`), and its own text: for a template, the parts outside
 * `${...}`, following nested braces and templates inside placeholders, which are code, not words.
 */
function literalAt(src: string, at: number): { raw: string; text: string } {
  const quote = src[at];
  let i = at + 1;
  let text = "";
  if (quote === '"') {
    while (i < src.length && src[i] !== '"') text += src[i] === "\\" ? src[i++ + 1] : src[i], i++;
    return { raw: src.slice(at, i + 1), text };
  }
  /** Skips a `${...}` placeholder from its opening brace, nested braces, strings and templates included. */
  const skipPlaceholder = (j: number): number => {
    let depth = 1;
    while (j < src.length && depth) {
      const c = src[j];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === '"' || c === "'") {
        const end = src.indexOf(c, j + 1);
        j = end < 0 ? src.length : end;
      } else if (c === "\x60") j = skipTemplate(j + 1);
      j++;
    }
    return j;
  };
  /** Skips a template from just after its opening backtick; returns the index of its closing backtick. */
  const skipTemplate = (j: number): number => {
    while (j < src.length && src[j] !== "\x60") {
      if (src[j] === "\\") j += 2;
      else if (src.startsWith("${", j)) j = skipPlaceholder(j + 2);
      else j++;
    }
    return j;
  };
  while (i < src.length && src[i] !== "\x60") {
    if (src[i] === "\\") {
      text += src[i + 1];
      i += 2;
    } else if (src.startsWith("${", i)) {
      text += " ";
      i = skipPlaceholder(i + 2);
    } else text += src[i++];
  }
  return { raw: src.slice(at, i + 1), text };
}

function offenders(file: string): string[] {
  const out: string[] = [];
  const src = readFileSync(file, "utf8");
  const lineOf = (index: number) => src.slice(0, index).split("\n").length;
  for (const sink of SINKS) {
    for (const m of src.matchAll(sink)) {
      const at = (m.index ?? 0) + m[0].length;
      const line = src.slice(src.lastIndexOf("\n", at) + 1, src.indexOf("\n", at));
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
      const { raw, text } = literalAt(src, at);
      if (!/\p{L}{2,}/u.test(text)) continue;
      if (ALLOWED.some((a) => a.file === file && a.text === text)) continue;
      out.push(`${file}:${lineOf(at)} ${raw.slice(0, 90)}`);
    }
  }
  return out;
}

describe("the words module", () => {
  test("reads the base language of a locale, English for any other", () => {
    expect([langOf("fr-LU"), langOf("de-CH"), langOf("FR"), langOf("en-GB"), langOf("it-IT"), langOf(undefined)]).toEqual(["fr", "de", "fr", "en", "en", "en"]);
    expect(wordsFor("fr-FR").rag.G).toBe("Conforme");
    expect(wordsFor({ spec: { locale: "de-DE" } }).rag.A).toBe("Gefährdet");
    expect(wordsFor({ locale: "en-US" }).other).toBe("Other");
  });

  test("the French and German sets are complete: every key, every list as long as the English one", () => {
    const shape = (w: unknown, path = ""): string[] =>
      w && typeof w === "object" && !Array.isArray(w) ? Object.entries(w).flatMap(([k, v]) => shape(v, `${path}.${k}`)) : [`${path}:${Array.isArray(w) ? `list${(w as unknown[]).length}` : typeof w}`];
    const en = shape(wordsFor("en"));
    for (const locale of ["fr", "de"]) expect([locale, shape(wordsFor(locale))]).toEqual([locale, en]);
  });

  test("no French or German word is left in English, apart from words the languages share", () => {
    // Same in English and the other language, on purpose: names, units, codes, abbreviations.
    const SHARED = new Set(["Total", "Note", "Notes", "Format", "Options", "Style", "Auto", "Codes", "Widget", "Details", "Region", "Quadrant", "Median", "Status", "Text", "Sparkline", "Tooltip", "Sections", "Variance", "Description", "Date", "Locale", "Id", "Data", "Steps", "Embed", "Range", "Values", "Dashboard"]);
    const leaves = (w: unknown, path = ""): [string, string][] =>
      w && typeof w === "object" && !Array.isArray(w)
        ? Object.entries(w).flatMap(([k, v]) => leaves(v, `${path}.${k}`))
        : Array.isArray(w)
          ? w.map((v, i) => [`${path}[${i}]`, String(v)] as [string, string])
          : typeof w === "string"
            ? [[path, w]]
            : [];
    const en = new Map(leaves(wordsFor("en")));
    for (const locale of ["fr", "de"]) {
      const same = leaves(wordsFor(locale)).filter(([path, text]) => en.get(path) === text && /\p{L}{3,}/u.test(text) && !SHARED.has(text));
      // Words a language really does write the same are kept explicit here, per language.
      const ok = locale === "fr" ? ["Widget", "Sections", "Options", "Quadrant", "Description", "Date", "Format", "Notes", "Total", "Note", "Style", "Auto", "Codes", "Région"] : ["Widget", "Details", "Region", "Quadrant", "Median", "Status", "Text", "Sparkline", "Tooltip", "Format", "Optionen", "Auto", "Codes", "Treemap", "Heatmap"];
      expect([locale, same.filter(([, text]) => !ok.includes(text)).map(([path, text]) => `${path}: ${text}`)]).toEqual([locale, []]);
    }
  });

  test("functions in every set write their figures in, the same number of them", () => {
    for (const locale of ["en", "fr", "de"]) {
      const w: Words = wordsFor(locale);
      expect(w.outOf("3", "8")).toMatch(/3.*8/);
      expect(w.between("1", "5")).toMatch(/1.*5/);
      expect(w.table.rowsShown("12", "56")).toMatch(/12.*56/);
      expect(w.board.nothingFor(["Topic: Prudential"])).toContain("Topic: Prudential");
      expect(w.days(1)).toMatch(/^1 \p{L}+$/u);
    }
  });
});

describe("no English is hard-coded on screen", () => {
  test.each([...VIEWS, ...CHROME])("%s writes its words through the words module", (file) => {
    expect(offenders(file)).toEqual([]);
  });

  test("the guard itself catches English on screen and lets code inside placeholders through", () => {
    const dir = mkdtempSync(join(tmpdir(), "words-"));
    const file = join(dir, "fixture.ts");
    writeFileSync(
      file,
      [
        'el.textContent = "Hello there";',
        "const p = html(doc, \"p\", \"fft-x\", `Total ${count} rows`);",
        "hit.setAttribute(\"aria-label\", `${name}: ${items.map((it) => `${it.label} ${it.value}`).join(\", \")}`);",
        "// el.textContent = \"A comment is not on screen\";",
      ].join("\n"),
    );
    expect(offenders(file).map((hit) => hit.replace(`${file}:`, "")).sort()).toEqual(['1 "Hello there"', "2 `Total ${count} rows`"]);
  });

  test("the allowlist names only literals that are still there", () => {
    for (const { file, text } of ALLOWED) expect([file, readFileSync(file, "utf8").includes(text)]).toEqual([file, true]);
  });
});
