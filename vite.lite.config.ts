import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { cssLiterals } from "./scripts/css-minify.ts";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Lists every module in the bundle with its rendered size, largest first, to find what drags weight in.
 * Run with FFT_SIZES=1 npm run build:lib; writes dist/lite-modules.txt.
 */
function moduleSizes(): Plugin {
  return {
    name: "fft-module-sizes",
    generateBundle(_options, bundle) {
      if (!process.env.FFT_SIZES) return;
      const rows: [string, number][] = [];
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;
        for (const [id, info] of Object.entries(chunk.modules)) rows.push([id.replace(here("./"), ""), info.renderedLength]);
      }
      rows.sort((a, b) => b[1] - a[1]);
      writeFileSync(here("./dist/lite-modules.txt"), rows.map(([id, n]) => `${String(n).padStart(8)} ${id}`).join("\n"));
    },
  };
}

/**
 * Leaves out what only making charts needs, by resolving two imports to empty modules:
 * - explain.ts and question.ts import explain-words.ts only to register French and German. English guides and
 *   questions stay; dist/martcharts-reading.iife.js brings the other two back on pages that need them.
 * - words.ts imports words-making.ts for the editor's and composer's words, which nothing here shows.
 */
function englishReading(): Plugin {
  return {
    name: "fft-english-reading",
    enforce: "pre",
    resolveId(source, importer) {
      if (source === "./explain-words.ts" && importer && /src\/core\/(explain|question)\.ts$/.test(importer)) return here("./src/core/reading-none.ts");
      // No editor or composer here, so none of their words either.
      if (source === "./words-making.ts" && importer && /src\/core\/words\.ts$/.test(importer)) return here("./src/core/words-making-none.ts");
      return null;
    },
  };
}

// The lite drop-in build (part of npm run build:lib): showing charts and dashboards only, with <fft-widget> registered
// on load. It writes next to the full build in dist/, so it never empties the folder.
export default defineConfig({
  publicDir: false,
  plugins: [englishReading(), cssLiterals(), moduleSizes()],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: here("./src/lite.ts"),
      name: "MartCharts",
      formats: ["es", "iife"],
      fileName: (format) => (format === "es" ? "martcharts-lite.js" : `martcharts-lite.${format}.js`),
    },
  },
});
