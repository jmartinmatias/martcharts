import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    // Lets the dev server answer through `tailscale serve` (https://<machine>.<tailnet>.ts.net), tailnet only:
    // Tailscale proxies to 127.0.0.1, so listen there (Node otherwise binds "localhost" to IPv6 only).
    host: "127.0.0.1",
    allowedHosts: [".ts.net"],
  },
  build: {
    // Not dist/: that is the drop-in library (npm run build:lib), and each build empties its folder.
    outDir: "dist-demo",
    // Four pages: the gallery, the Taller (elBulli's creative workshop for charts), the selected variations and the editor.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        taller: fileURLToPath(new URL("./taller.html", import.meta.url)),
        selected: fileURLToPath(new URL("./selected.html", import.meta.url)),
        editor: fileURLToPath(new URL("./editor.html", import.meta.url)),
        commercial: fileURLToPath(new URL("./commercial.html", import.meta.url)),
        health: fileURLToPath(new URL("./health.html", import.meta.url)),
        regulatory: fileURLToPath(new URL("./regulatory.html", import.meta.url)),
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Whole-dashboard, export and Taller tests draw dozens of widgets; on a busy machine 5s is not enough, and a timeout
    // proves nothing about the code. A real hang still fails, at 30s.
    testTimeout: 30_000,
  },
});
