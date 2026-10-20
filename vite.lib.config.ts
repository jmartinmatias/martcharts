import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// The drop-in library build (npm run build:lib): one self-contained file per format, no dependencies,
// with <fft-widget> registered on load. The demo gallery has its own config in vite.config.ts.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: fileURLToPath(new URL("./src/standalone.ts", import.meta.url)),
      name: "MartCharts",
      formats: ["es", "iife"],
      fileName: (format) => (format === "es" ? "martcharts.js" : `martcharts.${format}.js`),
    },
  },
});
