/**
 * The block registry: every data source, transform, format and view a widget
 * can use. Built-in blocks are registered when this module loads; add your own
 * with the `register*` functions.
 *
 * Every block is a descriptor (`type`, `description`, `options`) plus the code
 * that does the work. The descriptor is what validation, the docs and the MCP
 * server read, so describe options carefully.
 *
 * @module
 */
import type { DataSpec, Row, TransformSpec } from "./types.ts";
import type { ViewRenderer } from "./view-context.ts";
import { builtinFormats } from "./formats.ts";
import { builtinSources } from "./sources.ts";
import { builtinTransforms } from "./transforms.ts";
import { builtinViews } from "./views.ts";

/** What kind of value an option holds. `field` is a string naming a data field; `fields` is one field name or a list of them. */
export type OptionType = "string" | "number" | "boolean" | "field" | "fields" | "enum" | "array" | "object" | "function" | "any";

/** Describes one option of a block. */
export interface OptionSchema {
  type: OptionType;
  /** Validation reports an error when a required option is missing. */
  required?: boolean;
  /** One sentence on what the option does. Shown in docs and to agents over MCP. */
  description: string;
  /** Allowed values, for `enum` options, or for each item of an `array` option whose items are words. */
  values?: readonly string[];
  /** For an `array` option with `values`: what each position means, one label per item, so a form can offer a control per position. */
  itemLabels?: readonly string[];
  /** Value used when the option is left out. Informational. */
  default?: unknown;
  /**
   * For `field` and `fields` options: the kind of field expected. `number` for
   * amounts, `category` for names and groups, `date` for periods and days.
   * Validation warns when a number option points at a field with no numbers,
   * and `suggestView` uses it to fill a view from the data.
   */
  kind?: "number" | "category" | "date";
}

/** The descriptor every block shares. */
export interface Block {
  /** The name used in specs, for example `"bar"` in `{ type: "bar" }`. */
  type: string;
  /** One sentence on what the block does. */
  description: string;
  /** The options the block reads from its spec object. */
  options: Record<string, OptionSchema>;
  /** Extra checks beyond the option schema. Return one message per problem. */
  validate?(spec: Record<string, unknown>): string[];
  /** Checks that need the rows, reported as warnings. Return one message per problem. */
  checkData?(spec: Record<string, unknown>, rows: Row[]): string[];
}

/** Services a data source can use. Injected so the same spec loads in the browser, in Node and in tests. */
export interface LoadContext {
  fetch: typeof fetch;
  signal?: AbortSignal;
  /** Skip any cached answer and load again (a widget's refresh does this). */
  fresh?: boolean;
}

/** Loads rows. */
export interface SourceBlock extends Block {
  load(spec: DataSpec, ctx: LoadContext): Row[] | Promise<Row[]>;
}

/** Reshapes rows. Must not modify its input. */
export interface TransformBlock extends Block {
  apply(rows: Row[], step: TransformSpec): Row[];
}

/** Turns one value into display text. */
export interface FormatBlock extends Block {
  format(value: unknown, options: Record<string, unknown>, locale?: string): string;
  /** Optional rich rendering for tables and lists, for example a pill. `format` stays the plain-text fallback. */
  element?(value: unknown, options: Record<string, unknown>, locale: string | undefined, doc: Document): Element;
}

/** Draws rows. `render` is optional so Node can know about a view (to validate it) without drawing it. */
export interface ViewBlock extends Block {
  render?: ViewRenderer;
  /** The values a view's value axis must cover for these rows. Small multiples use it to give every panel the same scale. */
  extent?(view: Record<string, unknown>, rows: Row[]): number[];
  /**
   * The field whose values the view colors (a donut's label), when colors follow categories rather than series.
   * Small multiples then give one category the same color in every panel, and draw one legend of them.
   */
  categories?(view: Record<string, unknown>): string | undefined;
}

/** The four kinds of block. */
export type BlockKind = "source" | "transform" | "format" | "view";

const KIND_NAMES: Record<BlockKind, string> = {
  source: "data source",
  transform: "transform",
  format: "format",
  view: "view",
};

/** Thrown when a spec names a block type nobody registered. */
export class UnknownBlockError extends Error {
  readonly kind: BlockKind;
  readonly blockType: string;
  readonly available: string[];

  constructor(kind: BlockKind, blockType: string, available: string[]) {
    super(`Unknown ${KIND_NAMES[kind]} "${blockType}". Available: ${available.join(", ")}.`);
    this.name = "UnknownBlockError";
    this.kind = kind;
    this.blockType = blockType;
    this.available = available;
  }
}

const registries = {
  source: new Map<string, SourceBlock>(),
  transform: new Map<string, TransformBlock>(),
  format: new Map<string, FormatBlock>(),
  view: new Map<string, ViewBlock>(),
};

interface BlockOf {
  source: SourceBlock;
  transform: TransformBlock;
  format: FormatBlock;
  view: ViewBlock;
}

function register<K extends BlockKind>(kind: K, block: BlockOf[K]): void {
  if (!block.type) throw new Error(`A ${KIND_NAMES[kind]} needs a type.`);
  (registries[kind] as Map<string, BlockOf[K]>).set(block.type, block);
}

/** Looks up a block, throwing `UnknownBlockError` when it is not registered. */
export function getBlock<K extends BlockKind>(kind: K, type: string): BlockOf[K] {
  const block = (registries[kind] as Map<string, BlockOf[K]>).get(type);
  if (!block) throw new UnknownBlockError(kind, type, blockTypes(kind));
  return block;
}

/** True when a block of this kind and type is registered. */
export function hasBlock(kind: BlockKind, type: string): boolean {
  return registries[kind].has(type);
}

/** Registered type names of one kind, sorted. */
export function blockTypes(kind: BlockKind): string[] {
  return [...registries[kind].keys()].sort();
}

/** A block's descriptor without its code: safe to serialize as JSON. */
export interface BlockInfo {
  type: string;
  description: string;
  options: Record<string, OptionSchema>;
}

/** Descriptors of every registered block of one kind, sorted by type. Used by docs and the MCP server. */
export function describeBlocks(kind: BlockKind): BlockInfo[] {
  return blockTypes(kind).map((type) => {
    const { description, options } = getBlock(kind, type);
    return { type, description, options };
  });
}

/** Adds or replaces a data source. */
export function registerSource(block: SourceBlock): void {
  register("source", block);
}

/** Adds or replaces a transform. */
export function registerTransform(block: TransformBlock): void {
  register("transform", block);
}

/** Adds or replaces a format. */
export function registerFormat(block: FormatBlock): void {
  register("format", block);
}

/**
 * Adds or replaces a view. Pass `render` to make it drawable in the browser.
 * In Node (for example in an MCP server) you can register a view without
 * `render` so specs that use it validate.
 */
export function registerView(block: ViewBlock): void {
  register("view", block);
}

/** Attaches a renderer to an already registered view, keeping its descriptor. */
export function setRenderer(type: string, render: ViewRenderer): void {
  const block = getBlock("view", type);
  registries.view.set(type, { ...block, render });
}

for (const block of builtinSources) registerSource(block);
for (const block of builtinFormats) registerFormat(block);
for (const block of builtinTransforms) registerTransform(block);
for (const block of builtinViews) registerView(block);
