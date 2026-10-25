/**
 * The widget spec: one plain object that says everything about a widget.
 *
 * A widget is a pipeline of four plug points:
 *
 *   data (where rows come from) -> transform (reshape rows) -> view (how rows are drawn) -> style (how it looks)
 *
 * Every plug point is a `{ type, ...options }` object. The `type` picks a block
 * from the registry (see `registry.ts`), and the options configure that block.
 * Add new blocks with `registerSource`, `registerTransform`, `registerFormat`
 * and `registerView`.
 *
 * @module
 */

import type { HeadlineSpec } from "./headline.ts";

/** One record of data. Keys are field names, values are anything JSON can hold. */
export type Row = Record<string, unknown>;

/** The complete description of one widget. Only `data` and `view` are required. */
export interface WidgetSpec {
  /** Stable identifier. Used as the file name in the widget store and by the MCP server. */
  id?: string;
  /** Heading shown at the top of the widget. */
  title?: string;
  /** Smaller line under the title, for example the period covered. */
  subtitle?: string;
  /** Small print at the bottom, for example a note on the data or its refresh time. */
  footer?: string;
  /** Where the data came from: "Source: Eurostat" in the small print under the footer, the name a link when `url` is set. See `SourceSpec`. */
  source?: SourceSpec;
  /** Who made the chart, a name or a team: "Chart: Marta" in the same small print. Takes the text templates titles do. */
  byline?: string;
  /** What this widget is for, in plain words. Not rendered; read by people and agents. */
  description?: string;
  /** Related pages, listed on the widget's Details side (the `info` action): a report, the data's owner, a runbook. */
  links?: WidgetLink[];
  /** BCP 47 locale used by number and date formats, for example `"en-US"` or `"fr-LU"`. Defaults to the runtime locale. */
  locale?: string;
  /** Where the rows come from. */
  data: DataSpec;
  /** Reshaping steps applied to the rows, in order. */
  transform?: TransformSpec[];
  /** Per-field display settings, keyed by field name. */
  fields?: Record<string, FieldSpec>;
  /** One big number above the view, with its change and a caption. See `HeadlineSpec`. */
  headline?: HeadlineSpec;
  /** Small multiples: draw the view once per value of a field, in a grid of panels sharing one scale. */
  facet?: FacetSpec;
  /** How the rows are drawn. */
  view: ViewSpec;
  /** Theme, colors and sizing. */
  style?: StyleSpec;
}

/** `source: { name, url? }`: who published the data, named in the small print and linked when it has an address. */
export interface SourceSpec {
  /** The publisher or system, as readers should see it: "Eurostat", "Finance ledger". */
  name: string;
  /** Where to find the data, opened in a new tab from the source name. */
  url?: string;
}

/** A related page: `label` is the link text, `href` its address. */
export interface WidgetLink {
  label: string;
  href: string;
}

/** `facet: { field, columns?, shared? }`: one panel per value of `field`. */
export interface FacetSpec {
  /** Field whose values each get a panel, in order of first appearance. */
  field: string;
  /** Fixed number of columns. Defaults to as many 233px panels as fit. */
  columns?: number;
  /** Give every panel the same value scale. Default true; turn off only when panels need not be compared. */
  shared?: boolean;
}

/** Picks a data source block. Built in: `inline`, `url`, `fn`. */
export interface DataSpec {
  type: string;
  [option: string]: unknown;
}

/** Picks a transform block. Built in: `filter`, `sort`, `limit`, `aggregate`, `calc`. */
export interface TransformSpec {
  type: string;
  [option: string]: unknown;
}

/** Picks a view block. Built in: `table`, `list`, `kpi`, `bar`, `line`. */
export interface ViewSpec {
  type: string;
  [option: string]: unknown;
}

/**
 * Picks a format block. A bare string is shorthand for `{ type: string }`.
 * Built in: `number`, `currency`, `percent`, `date`, `text`.
 */
export type FormatSpec = string | { type: string; [option: string]: unknown };

/** Display settings for one field. */
export interface FieldSpec {
  /** Human label. Defaults to the field name turned into words (`unitPrice` becomes "Unit price"). */
  label?: string;
  /** How values of this field are turned into text. */
  format?: FormatSpec;
}

/** Color roles a theme can override. Each becomes a CSS custom property `--fft-<token>`. */
export type StyleToken =
  | "surface"
  | "text"
  | "textSecondary"
  | "muted"
  | "grid"
  | "axis"
  | "border"
  | "accent"
  | "positive"
  | "negative";

/** Theme, colors and sizing. */
export interface StyleSpec {
  /** A named look from the preset library, for example `"glass"` or `"airy"`. See `describePresets()`. */
  preset?: string;
  /** `auto` follows the operating system setting. Default `auto`. */
  theme?: "auto" | "light" | "dark";
  /**
   * Series colors: a list of CSS colors in order, or the name of a library palette
   * (`"default"`, `"bw"`, `"50-shades"`, `"credit-agricole"`, `"apple"`; see `describePalettes()`).
   * Defaults to a validated, colorblind-checked 8-color palette with its own dark-mode steps.
   */
  palette?: string[] | string;
  /** Override individual color roles, for example `{ accent: "#0a7d5a" }`. */
  tokens?: Partial<Record<StyleToken, string>>;
  /** Spacing. Default `comfortable`. */
  density?: "comfortable" | "compact";
  /** Chart height in pixels. Defaults to the width divided by the golden ratio, kept between 180 and 320. */
  height?: number;
}

/** One validation finding. Errors stop a widget from rendering; warnings do not. */
export interface Issue {
  level: "error" | "warning";
  /** Where in the spec the problem is, for example `view.x` or `transform[1].op`. */
  path: string;
  message: string;
}
