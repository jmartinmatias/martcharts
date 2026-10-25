import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// French and German for the lite build's reading guides (part of npm run build:lib): one classic script that registers
// them on load, for pages that load martcharts-lite.iife.js. The full build has them already.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: fileURLToPath(new URL("./src/reading-languages.ts", import.meta.url)),
      name: "MartChartsReading",
      formats: ["iife"],
      fileName: () => "martcharts-reading.iife.js",
    },
  },
});
