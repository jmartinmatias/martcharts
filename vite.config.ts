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
    // Three pages: the gallery, the Taller (elBulli's creative workshop for charts) and the selected variations.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        taller: fileURLToPath(new URL("./taller.html", import.meta.url)),
        selected: fileURLToPath(new URL("./selected.html", import.meta.url)),
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
