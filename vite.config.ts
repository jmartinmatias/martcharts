import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    // Lets the dev server answer through `tailscale serve` (https://<machine>.<tailnet>.ts.net), tailnet only:
    // Tailscale proxies to 127.0.0.1, so listen there (Node otherwise binds "localhost" to IPv6 only).
    host: "127.0.0.1",
    allowedHosts: [".ts.net"],
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
