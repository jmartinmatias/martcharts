/**
 * Emits type declarations for the drop-in bundle into dist/types, with relative
 * imports ending in .js so they resolve under every moduleResolution setting.
 * Part of: npm run build:lib
 */
import { execFileSync } from "node:child_process";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = join(root, "dist", "types");
await rm(out, { recursive: true, force: true });
execFileSync(process.execPath, [join(root, "node_modules", "typescript", "bin", "tsc"), "-p", join(root, "tsconfig.lib.json")], { stdio: "inherit" });

let count = 0;
for (const file of await readdir(out, { recursive: true })) {
  if (!file.endsWith(".d.ts")) continue;
  const path = join(out, file);
  const text = await readFile(path, "utf8");
  await writeFile(path, text.replace(/(from\s+|import\()(["'])(\.{1,2}\/[^"']+)\.ts\2/g, "$1$2$3.js$2"));
  count++;
}
console.log(`Wrote ${count} declaration files to dist/types`);
