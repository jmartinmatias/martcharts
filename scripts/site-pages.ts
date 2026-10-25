/**
 * Publishes the static reference pages next to the built demo, so every link in the site's nav works when served
 * from dist-demo: the chart catalog and data guide (catalog/), the drop-in examples (examples/), the docs they link
 * to (docs/), the specs they load (widgets/), the shared site styles (demo/*.css) and the drop-in bundle
 * (dist/martcharts.iife.js and the lite dist/martcharts-lite.iife.js, from `npm run build:lib`). Run after `vite build`: `npm run build:site` does both.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));

/** What the static pages need, each copied to the same path under dist-demo. */
export const STATIC_PATHS = ["catalog", "examples", "docs", "widgets", "demo/site-nav.css", "demo/site-look.css", "dist/martcharts.iife.js", "dist/martcharts-lite.iife.js", "dist/martcharts-reading.iife.js"] as const;

export function publishStaticPages(out = root("dist-demo")): string[] {
  const missing = STATIC_PATHS.filter((path) => !existsSync(root(path)));
  if (missing.length) throw new Error(`Missing ${missing.join(", ")}. Run npm run build:lib first for the bundle.`);
  for (const path of STATIC_PATHS) {
    mkdirSync(`${out}/${path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""}`, { recursive: true });
    cpSync(root(path), `${out}/${path}`, { recursive: true });
  }
  return [...STATIC_PATHS];
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`Published ${publishStaticPages().join(", ")} into dist-demo`);
