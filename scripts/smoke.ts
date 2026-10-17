/**
 * Self-check: starts the real MCP server over stdio, calls its tools as a
 * client would, and exits non-zero on any failure. Read-only: it never
 * changes the widgets folder.
 *
 * Run with: npm run smoke
 */
import { strict as assert } from "node:assert";
import { Client } from "@modelcontextprotocol/client";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio";

async function connect(args: string[]) {
  const client = new Client({ name: "fft-smoke", version: "1.0.0" });
  await client.connect(new StdioClientTransport({ command: "node", args: ["src/mcp/main.ts", ...args], env: getDefaultEnvironment() }));
  return client;
}

const text = (result: { content?: unknown }) => ((result.content as { text: string }[])[0]?.text ?? "");

const client = await connect([]);
const { tools } = await client.listTools();
assert.ok(tools.some((t) => t.name === "fft_list_widgets"), "fft_list_widgets should be offered");

const list = await client.callTool({ name: "fft_list_widgets", arguments: { response_format: "json" } });
assert.ok(!list.isError, `list failed: ${text(list)}`);
const widgets = (list.structuredContent as { widgets: { id: string; error?: string }[] }).widgets;
assert.ok(widgets.length > 0, "the widgets folder should not be empty");
for (const w of widgets) assert.ok(!w.error, `widgets/${w.id}.json could not be read: ${w.error}`);

for (const { id } of widgets) {
  const data = await client.callTool({ name: "fft_get_widget_data", arguments: { id, response_format: "json" } });
  assert.ok(!data.isError, `data for ${id} failed: ${text(data)}`);
  const { total, warnings } = data.structuredContent as { total: number; warnings: unknown[] };
  assert.ok(total > 0, `${id} should produce rows`);
  assert.deepEqual(warnings, [], `${id} has warnings: ${JSON.stringify(warnings)}`);
  console.error(`ok  ${id}: ${total} rows`);
}

const boards = await client.callTool({ name: "fft_list_dashboards", arguments: { response_format: "json" } });
assert.ok(!boards.isError, `dashboard list failed: ${text(boards)}`);
for (const { id } of (boards.structuredContent as { dashboards: { id: string }[] }).dashboards) {
  const board = await client.callTool({ name: "fft_get_dashboard", arguments: { id } });
  const { issues, missing } = board.structuredContent as { issues: unknown[]; missing: string[] };
  assert.deepEqual([issues, missing], [[], []], `dashboard ${id} has problems: ${JSON.stringify({ issues, missing })}`);
  console.error(`ok  dashboard ${id}`);
}

const invalid = await client.callTool({ name: "fft_get_widget", arguments: { id: "../etc" } });
assert.equal(invalid.isError, true, "an id with a path in it should be rejected");
await client.close();

const linked = await connect(["--widget", widgets[0]?.id ?? ""]);
const linkedTools = (await linked.listTools()).tools.map((t) => t.name);
assert.ok(!linkedTools.includes("fft_list_widgets"), "a linked server should not list all widgets");
const own = await linked.callTool({ name: "fft_get_widget", arguments: {} });
assert.ok(!own.isError, `linked get failed: ${text(own)}`);
await linked.close();

console.error("Smoke test passed");
