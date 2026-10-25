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

/** `{ type: "csv", url | text, delimiter?, typed?, cache? }`: comma-separated values, fetched or written in. */
export interface CsvData {
  type: "csv";
  /** Address of the file. Give this or `text`. */
  url?: string;
  /** The CSV itself. Give this or `url`. */
  text?: string;
  /** Column separator. Default: a comma, or a semicolon or tab when the header row has more of those. */
  delimiter?: string;
  /** Turn number-looking cells into numbers and empty cells into null. Default true. */
  typed?: boolean;
  /** Seconds a fetched file is shared with other loads of the same address. Default 60. */
  cache?: number;
}

/** `{ type: "fn", load }`: rows from your own JavaScript function. Not storable as JSON. */
export interface FnData {
  type: "fn";
  load: () => Row[] | Promise<Row[]>;
}

/** `{ type: "sheet", url }`: a Google Sheet, read through its CSV export. */
export interface SheetData {
  type: "sheet";
  /** The sheet's address: as you see it in the browser, or as published to the web ("File, Share, Publish to web"). */
  url: string;
  /** Which tab, by its gid. Defaults to the one in the address, else the first. */
  gid?: string | number;
  cache?: number;
}

/** The shortest live refresh, in seconds: anything faster hammers the source and redraws faster than anyone reads. */
export const MIN_REFRESH = 5;

/** The `refresh` option every fetched source takes: reload on an interval, keep the last good rows on an error. */
const REFRESH_OPTION = {
  type: "number",
  description: `Seconds between reloads for live data, at least ${MIN_REFRESH}. The chart redraws with the new rows and says when it was last updated; a failed reload keeps the last rows, and reloads pause while the page is hidden.`,
} as const;

/**
 * A Google Sheet's address as its CSV export. The address as seen in the browser
 * (`/spreadsheets/d/<id>/edit#gid=12`) becomes `/spreadsheets/d/<id>/export?format=csv&gid=12`; an address published
 * to the web (`/spreadsheets/d/e/<key>/pubhtml`) becomes its `pub?output=csv`; one that already gives CSV is kept.
 */
export function sheetCsvUrl(address: string, gid?: string | number): string {
  const tab = gid !== undefined ? String(gid) : (address.match(/[#&?]gid=(\d+)/)?.[1] ?? undefined);
  const published = address.match(/^(https?:\/\/docs\.google\.com\/spreadsheets\/d\/e\/[^/?#]+)\//);
  if (published) return `${published[1]}/pub?output=csv${tab ? `&gid=${tab}` : ""}`;
  const plain = address.match(/^(https?:\/\/docs\.google\.com\/spreadsheets\/d\/[^/?#]+)/);
  if (plain) return `${plain[1]}/export?format=csv${tab ? `&gid=${tab}` : ""}`;
  return address;
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
    refresh: REFRESH_OPTION,
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

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/** One cell, typed: plain decimal numbers become numbers (but not ids with leading zeros, such as "007"), empty becomes null. */
function typedCell(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (NUMBER.test(trimmed) && !/^[+-]?0\d/.test(trimmed)) return Number(trimmed);
  return text;
}

/**
 * Parses CSV (RFC 4180: quoted cells may hold separators, line breaks and doubled quotes)
 * into rows keyed by the header row. Blank lines are skipped; a leading byte order mark is ignored.
 */
export function parseCsv(text: string, options: { delimiter?: string; typed?: boolean } = {}): Row[] {
  const source = text.replace(/^\uFEFF/, "");
  const firstLine = source.slice(0, source.search(/\r?\n|$/));
  const count = (sep: string) => firstLine.split(sep).length - 1;
  const delimiter = options.delimiter ?? [",", ";", "\t"].reduce((best, sep) => (count(sep) > count(best) ? sep : best), ",");
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === "") quoted = true;
    else if (char === delimiter) {
      record.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      record.push(cell);
      records.push(record);
      record = [];
      cell = "";
    } else cell += char;
  }
  if (cell !== "" || record.length) {
    record.push(cell);
    records.push(record);
  }
  const lines = records.filter((r) => r.some((c) => c.trim() !== ""));
  const [header, ...body] = lines;
  if (!header) return [];
  const names = header.map((name, i) => name.trim() || `column${i + 1}`);
  const typed = options.typed !== false;
  return body.map((cells) => Object.fromEntries(names.map((name, i) => [name, typed ? typedCell(cells[i] ?? "") : (cells[i] ?? "")])));
}

const csv: SourceBlock = {
  type: "csv",
  description: "Comma-separated values (CSV), from a file or written into the spec, with the first row as field names. Number cells become numbers. For spreadsheet and BI exports.",
  options: {
    url: { type: "string", description: "Address of the CSV file. Give this or text. Relative addresses resolve as for url." },
    text: { type: "string", description: 'The CSV itself, for example "region,revenue\\nNorth,120". Give this or url.' },
    delimiter: { type: "string", description: "Column separator. Leave out to pick a comma, semicolon or tab from the header row." },
    typed: { type: "boolean", default: true, description: "Turn number-looking cells into numbers (ids with leading zeros stay text) and empty cells into null. False keeps every cell as text." },
    cache: { type: "number", default: 60, description: "Seconds a fetched file is shared with other loads of the same address. 0 always fetches." },
    refresh: REFRESH_OPTION,
  },
  async load(spec, ctx) {
    const { url: address, text, delimiter, typed, cache = 60 } = spec as unknown as CsvData;
    if (typeof text === "string") return parseCsv(text, { delimiter, typed });
    if (typeof address !== "string") throw new Error('A csv source needs "url" (a file address) or "text" (the CSV itself).');
    const read = async (): Promise<unknown> => {
      const response = await ctx.fetch(address, { signal: ctx.signal, headers: { accept: "text/csv, text/plain, */*" } });
      if (!response.ok) throw new Error(`Could not load ${address}: HTTP ${response.status}.`);
      return response.text();
    };
    const body = cache > 0 && !ctx.signal ? shared(ctx.fetch, `csv:${address}`, cache, ctx.fresh === true, read) : read();
    return parseCsv((await body) as string, { delimiter, typed });
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

const sheet: SourceBlock = {
  type: "sheet",
  description:
    "A Google Sheet, read through its CSV export: paste the sheet's address as you see it, or as published to the web (File, Share, Publish to web). The sheet must be published or shared so anyone with the link can view it. The first row names the fields.",
  options: {
    url: { type: "string", required: true, description: "The sheet's address, for example https://docs.google.com/spreadsheets/d/<id>/edit#gid=0, or its published address." },
    gid: { type: "any", description: "Which tab, by the gid in its address. Defaults to the one in the address, else the first tab." },
    cache: { type: "number", default: 60, description: "Seconds a fetched sheet is shared with other loads of the same address. 0 always fetches." },
    refresh: REFRESH_OPTION,
  },
  validate(spec) {
    return typeof spec.url === "string" && !/^https?:\/\//.test(spec.url) && !spec.url.startsWith("/") ? ["url must be the sheet's full address, starting with https://."] : [];
  },
  load(spec, ctx) {
    const { url: address, gid, cache } = spec as unknown as SheetData;
    return csv.load({ type: "csv", url: sheetCsvUrl(address, gid), ...(cache !== undefined ? { cache } : {}) }, ctx);
  },
};

export const builtinSources: SourceBlock[] = [inline, url, csv, fn, sheet];
