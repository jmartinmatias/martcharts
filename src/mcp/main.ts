#!/usr/bin/env node
/**
 * Command line entry for the FFT MCP server, over stdio.
 *
 *   node src/mcp/main.ts                         every widget in ./widgets
 *   node src/mcp/main.ts --widget revenue-kpi    a server linked to one widget
 *   node src/mcp/main.ts --print-config          an .mcp.json with one server per widget
 *
 * Runs directly on Node 23.6 or later, which runs TypeScript without a build step.
 * Nothing may be written to stdout except the protocol, so messages go to stderr.
 *
 * @module
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createFftServer } from "./server.ts";
import { checkId, createFileStore, createLocalFetch } from "./store.ts";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

const HELP = `fft-mcp: MCP server for FFT widgets (stdio)

Options:
  --dir <path>       Widget folder. Default: ${resolve(projectRoot, "widgets")}
  --public <path>    Folder that relative data URLs are read from. Default: ${resolve(projectRoot, "public")}
  --dashboards <path> Dashboard folder. Default: ${resolve(projectRoot, "dashboards")}
  --catalog <path>   Chart catalog folder, one starter spec per view. Default: ${resolve(projectRoot, "catalog")}
  --widget <id>      Link the server to one widget only.
  --print-config     Print an .mcp.json block with one server for all widgets and one per widget, then exit.
  --help             Show this help.

Environment: FFT_WIDGETS_DIR, FFT_PUBLIC_DIR, FFT_DASHBOARDS_DIR and FFT_CATALOG_DIR set the folders too.`;

const { values } = parseArgs({
  options: {
    dir: { type: "string" },
    public: { type: "string" },
    dashboards: { type: "string" },
    catalog: { type: "string" },
    widget: { type: "string" },
    "print-config": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (values.help) {
  console.error(HELP);
  process.exit(0);
}

const dir = resolve(values.dir ?? process.env.FFT_WIDGETS_DIR ?? resolve(projectRoot, "widgets"));
const publicDir = resolve(values.public ?? process.env.FFT_PUBLIC_DIR ?? resolve(projectRoot, "public"));
const store = createFileStore(dir);
const dashboardDir = resolve(values.dashboards ?? process.env.FFT_DASHBOARDS_DIR ?? resolve(projectRoot, "dashboards"));
const dashboards = createFileStore(dashboardDir, "dashboard");
const catalog = createFileStore(resolve(values.catalog ?? process.env.FFT_CATALOG_DIR ?? resolve(projectRoot, "catalog")), "chart");

if (values["print-config"]) {
  const script = fileURLToPath(import.meta.url);
  const servers: Record<string, { command: string; args: string[] }> = {
    "martcharts": { command: "node", args: [script, "--dir", dir, "--public", publicDir] },
  };
  for (const entry of await store.list()) {
    if (entry.spec) servers[`fft-${entry.id}`] = { command: "node", args: [script, "--dir", dir, "--public", publicDir, "--widget", entry.id] };
  }
  // This one is meant for a person to redirect into a file, so it goes to stdout.
  process.stdout.write(`${JSON.stringify({ mcpServers: servers }, null, 2)}\n`);
  process.exit(0);
}

if (values.widget) {
  try {
    checkId(values.widget);
    await store.get(values.widget);
  } catch (caught) {
    console.error(`fft-mcp: ${(caught as Error).message}`);
    process.exit(1);
  }
}

serveStdio(() => createFftServer({ store, dashboards, catalog, fetch: createLocalFetch(publicDir), widgetId: values.widget }));
console.error(`fft-mcp: serving ${values.widget ? `widget "${values.widget}"` : `widgets in ${dir}`} on stdio`);
