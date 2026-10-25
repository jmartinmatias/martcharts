/**
 * Where widgets live on disk, and how Node loads their data.
 *
 * The store is a folder of `<id>.json` files, one widget each. The demo page
 * reads the same folder, so a change saved here shows up there.
 *
 * @module
 */
import { readdir, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import type { WidgetSpec } from "../core/types.ts";

/** Lowercase letters, digits and dashes, starting with a letter or digit, at most 64 characters. */
export const WIDGET_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** One entry in a store listing: the spec, or why the file could not be read. */
export interface StoredWidget {
  id: string;
  spec?: WidgetSpec;
  error?: string;
}

/** Reads and writes widget specs by id. */
export interface WidgetStore {
  /** Every widget, sorted by id. Unreadable files are listed with an `error`. */
  list(): Promise<StoredWidget[]>;
  /** One widget. The id always comes from the file name. Throws `WidgetNotFoundError`. */
  get(id: string): Promise<WidgetSpec>;
  has(id: string): Promise<boolean>;
  /** Creates or replaces a widget. */
  save(id: string, spec: WidgetSpec): Promise<void>;
  /** Throws `WidgetNotFoundError` when there is nothing to delete. */
  delete(id: string): Promise<void>;
}

/** Thrown when an id has no file. The message names the listing tool to call. */
export class WidgetNotFoundError extends Error {
  constructor(id: string, noun = "widget") {
    super(`No ${noun} "${id}". Call fft_list_${noun}s to see the ids.`);
    this.name = "WidgetNotFoundError";
  }
}

/** Throws unless `id` is a valid widget id. */
export function checkId(id: string): void {
  if (!WIDGET_ID.test(id)) throw new Error('Widget ids use lowercase letters, digits and dashes, for example "revenue-by-region".');
}

function isMissingFile(caught: unknown): boolean {
  return (caught as NodeJS.ErrnoException)?.code === "ENOENT";
}

/**
 * A store backed by a folder of JSON files. `noun` names what it holds in
 * error messages: "widget" (default) or "dashboard".
 */
export function createFileStore(dir: string, noun = "widget"): WidgetStore {
  const file = (id: string) => {
    checkId(id);
    return join(dir, `${id}.json`);
  };
  /**
   * Where a widget lives: at the top of the folder, or one folder down (widgets/commercial/, health/, regulatory/
   * hold the worked dashboards' widgets). A new widget goes at the top.
   */
  async function locate(id: string): Promise<string> {
    const top = file(id);
    try {
      await readFile(top);
      return top;
    } catch (caught) {
      if (!isMissingFile(caught)) throw caught;
    }
    let entries: import("node:fs").Dirent[] = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (caught) {
      if (!isMissingFile(caught)) throw caught;
    }
    for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      const nested = join(dir, entry.name, `${id}.json`);
      try {
        await readFile(nested);
        return nested;
      } catch (caught) {
        if (!isMissingFile(caught)) throw caught;
      }
    }
    return top;
  }

  async function get(id: string): Promise<WidgetSpec> {
    let text: string;
    try {
      text = await readFile(await locate(id), "utf8");
    } catch (caught) {
      if (isMissingFile(caught)) throw new WidgetNotFoundError(id, noun);
      throw caught;
    }
    try {
      return { ...(JSON.parse(text) as WidgetSpec), id };
    } catch (caught) {
      throw new Error(`widgets/${id}.json is not valid JSON: ${(caught as Error).message}`);
    }
  }

  return {
    get,
    async has(id) {
      try {
        await get(id);
        return true;
      } catch (caught) {
        if (caught instanceof WidgetNotFoundError) return false;
        throw caught;
      }
    },
    async list() {
      // The top of the folder and one folder down, each widget once.
      const entries = await readdir(dir, { withFileTypes: true });
      const top = entries.filter((e) => e.isFile() && e.name.endsWith(".json")).map((e) => e.name);
      const nested = (
        await Promise.all(entries.filter((e) => e.isDirectory()).map(async (e) => (await readdir(join(dir, e.name))).filter((name) => name.endsWith(".json"))))
      ).flat();
      const names = [...new Set([...top, ...nested])].sort();
      return Promise.all(
        names.map(async (name): Promise<StoredWidget> => {
          const id = name.slice(0, -".json".length);
          try {
            return { id, spec: await get(id) };
          } catch (caught) {
            return { id, error: (caught as Error).message };
          }
        }),
      );
    },
    async save(id, spec) {
      const path = await locate(id);
      const { id: _ignored, ...rest } = spec;
      // Write then rename, so readers never see a half-written file.
      const temp = `${path}.${process.pid}.tmp`;
      await writeFile(temp, `${JSON.stringify({ id, ...rest }, null, 2)}\n`, "utf8");
      await rename(temp, path);
    },
    async delete(id) {
      try {
        await unlink(await locate(id));
      } catch (caught) {
        if (isMissingFile(caught)) throw new WidgetNotFoundError(id, noun);
        throw caught;
      }
    },
  };
}

/**
 * A `fetch` for Node that serves relative URLs (such as `/data/sales.json`)
 * from `publicDir`, the way the dev server does in the browser. Absolute
 * URLs go to the network. Paths that resolve outside `publicDir` get a 404.
 */
export function createLocalFetch(publicDir: string): typeof fetch {
  const root = resolve(publicDir);
  const notFound = () => new Response("Not found", { status: 404 });
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return fetch(input, init);
    let path: string;
    try {
      path = resolve(root, `.${decodeURIComponent(new URL(url, "http://local/").pathname)}`);
    } catch {
      return notFound();
    }
    if (!path.startsWith(root + sep)) return notFound();
    try {
      const real = await realpath(path);
      if (!real.startsWith((await realpath(root)) + sep)) return notFound();
      return new Response(await readFile(real), { status: 200, headers: { "content-type": "application/json" } });
    } catch {
      return notFound();
    }
  }) as typeof fetch;
}
