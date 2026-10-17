/**
 * Built-in data sources.
 *
 * @module
 */
import type { SourceBlock } from "./registry.ts";
import type { Row } from "./types.ts";

/** `{ type: "inline", rows }`: rows written into the spec itself. */
export interface InlineData {
  type: "inline";
  rows: Row[];
}

/** `{ type: "url", url, path? }`: JSON fetched over HTTP. */
export interface UrlData {
  type: "url";
  url: string;
  /** Dot path to the list inside the response, for example `"data.items"`. */
  path?: string;
  /** Seconds a loaded answer is reused by other loads of the same address. Default 60; 0 always fetches. */
  cache?: number;
}

/** `{ type: "fn", load }`: rows from your own JavaScript function. Not storable as JSON. */
export interface FnData {
  type: "fn";
  load: () => Row[] | Promise<Row[]>;
}

/** Follows a dot path such as `"data.items"` or `"results.0.rows"`. Returns `undefined` when any step is missing. */
export function getPath(value: unknown, path: string): unknown {
  let current = value;
  for (const key of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

const inline: SourceBlock = {
  type: "inline",
  description: "Rows written directly into the spec. Best for small, fixed data and for trying things out.",
  options: {
    rows: { type: "array", required: true, description: 'The rows, for example `[{ "region": "North", "revenue": 120 }]`.' },
  },
  load: (spec) => spec.rows as Row[],
};

/** Answers per fetch function and address: loads in flight share one request, settled answers are kept for a while. */
const answers = new WeakMap<typeof fetch, Map<string, { at: number; body: Promise<unknown> }>>();

function shared(fetcher: typeof fetch, address: string, seconds: number, fresh: boolean, read: () => Promise<unknown>): Promise<unknown> {
  let store = answers.get(fetcher);
  if (!store) {
    store = new Map();
    answers.set(fetcher, store);
  }
  const hit = store.get(address);
  if (hit && !fresh && Date.now() - hit.at < seconds * 1000) return hit.body;
  const entry = { at: Date.now(), body: read() };
  store.set(address, entry);
  // A failure is not kept: the next load tries again.
  entry.body.catch(() => {
    if (store.get(address) === entry) store.delete(address);
  });
  return entry.body;
}

const url: SourceBlock = {
  type: "url",
  description: "Fetches JSON over HTTP. The response must be a list of rows, or contain one at `path`.",
  options: {
    url: { type: "string", required: true, description: "Address of the JSON. Relative addresses resolve against the page (or, in the MCP server, the public folder)." },
    path: { type: "string", description: 'Dot path to the list inside the response, for example "data.items".' },
    cache: { type: "number", default: 60, description: "Seconds a loaded answer is shared with other loads of the same address, so a dashboard fetches each file once. 0 always fetches. A widget's refresh always fetches." },
  },
  async load(spec, ctx) {
    const { url: address, path, cache = 60 } = spec as unknown as UrlData;
    const read = async (): Promise<unknown> => {
      const response = await ctx.fetch(address, { signal: ctx.signal, headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`Could not load ${address}: HTTP ${response.status}.`);
      return response.json();
    };
    // Abortable loads keep their own request: aborting one must not cancel another widget's data.
    const body = cache > 0 && !ctx.signal ? shared(ctx.fetch, address, cache, ctx.fresh === true, read) : read();
    const answer = await body;
    const found = path ? getPath(answer, path) : answer;
    if (path && found === undefined) throw new Error(`Path "${path}" not found in the response from ${address}.`);
    // Each load gets its own list, so one widget's changes never reach another's.
    return Array.isArray(found) ? [...found] : (found as Row[]);
  },
};

const fn: SourceBlock = {
  type: "fn",
  description: "Calls your own JavaScript function for rows. For code use only: a function cannot be saved as JSON.",
  options: {
    load: { type: "function", required: true, description: "Function returning rows, or a promise of rows." },
  },
  load: (spec) => (spec as unknown as FnData).load(),
};

export const builtinSources: SourceBlock[] = [inline, url, fn];
