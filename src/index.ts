/**
 * martcharts: one universal widget block.
 *
 * Describe a widget as a spec (data, transform, fields, view, style), draw it with `createWidget` or the
 * `<fft-widget>` tag, and fork it into new widgets with `fork`. Extend it by registering new sources, transforms,
 * formats, views, presets and palettes. Importing this module attaches the built-in renderers.
 *
 * This front door holds the names most pages need. The rest has one home each:
 *
 * - `martcharts/core`: the whole engine with no DOM (the pipeline, the registry, the option aliases, colour rules,
 *   the chart guide and data contract), for Node, workers and agents.
 * - `martcharts/kit`: the drawing kit: renderers, layout and geometry, `html` and `svg` for custom views, styles, and
 *   the editor and composer plumbing.
 * - `martcharts/color`: colour science and palettes, and the palette picker.
 * - `martcharts/geo`: basemaps, projections and features.
 * - `martcharts/taller`: versions of a chart, ranked, with their reasons.
 *
 * The drop-in bundles (`martcharts/standalone`, `window.MartCharts`) still carry everything.
 *
 * @module
 */
import "./dom/views/index.ts";

// Make, draw and edit.
export { createWidget } from "./dom/widget.ts";
export { createDashboard } from "./dom/dashboard.ts";
export { createEditor } from "./dom/editor.ts";
export { createComposer } from "./dom/composer.ts";
export { defineWidgetElement } from "./dom/element.ts";

// Specs.
export { fork } from "./core/fork.ts";
export { baseWidget } from "./core/base.ts";
export { hasErrors, validateSpec } from "./core/validate.ts";
export { validateDashboard } from "./core/dashboard.ts";
export { runPipeline } from "./core/pipeline.ts";
export { formatValue } from "./core/display.ts";
export { widgetRef } from "./core/ref.ts";

// In words, and which chart.
export { explainChart } from "./core/explain.ts";
export { questionOf } from "./core/question.ts";
export { recommendCharts } from "./core/recommend.ts";
export { suggestView } from "./core/suggest.ts";
export { describeBlocks } from "./core/registry.ts";
export { langOf, WORDS_EN, wordsFor } from "./core/words.ts";

// Extend.
export { registerFormat, registerSource, registerTransform, registerView } from "./core/registry.ts";
export { registerPreset } from "./core/presets.ts";
export { registerPalette } from "./core/palettes.ts";
export { registerReadingLanguages } from "./core/reading.ts";

// RAG statuses and the wallet audit.
export { applyRag, RAG_ORDER, ragCounts, ragFromValue, ragOf, ragWord, worstOf } from "./core/rag.ts";
export { auditWallet, strategyMarkdown, strategyText } from "./core/wallet.ts";

// Export and embed.
export { cardToPng, cardToSvg, download } from "./dom/export.ts";
export { frameEmbed, listenForEmbedHeights, mountEmbed, postHeights } from "./dom/embed.ts";
export { dashboardEmbed } from "./dom/composer.ts";
export { embedCodes } from "./dom/editor.ts";

// Types: every spec type, and the handles the functions above return.
export type * from "./core/types.ts";
export type { DashboardCell, DashboardFilter, DashboardFollow, DashboardRange, DashboardSpec } from "./core/dashboard.ts";
export type { ColorRule, HighlightRule, RuleOp, ValueRule } from "./core/rules.ts";
export type { Rag, RagRule, RagShape, RagStep, RagThresholds, RagTrend } from "./core/rag.ts";
export type { Sourced, WalletAudit, WalletDeal, WalletInput, WalletOpportunity, WalletProduct, WalletRisk, WalletRule, WalletSource, WalletTouch } from "./core/wallet.ts";
export type { Lang, LocaleSource, Words } from "./core/words.ts";
export type { Block, BlockInfo, BlockKind, FormatBlock, LoadContext, OptionSchema, OptionType, SourceBlock, TransformBlock, ViewBlock } from "./core/registry.ts";
export type { CsvData, FnData, InlineData, SheetData, UrlData } from "./core/sources.ts";
export type { Tooltip, TooltipItem, ViewContext, ViewRenderer } from "./core/view-context.ts";
export type { AggregateStep, BinStep, CalcStep, FilterOp, FilterStep, LimitStep, Measure, PivotStep, SortStep } from "./core/transforms.ts";
export type * from "./core/views.ts";
export type { ChartPick } from "./core/recommend.ts";
export type { Question, QuestionKind } from "./core/question.ts";
export type { HeadlineAgg, HeadlineSpec } from "./core/headline.ts";
export type { NamedPalette } from "./core/palettes.ts";
export type { StylePreset } from "./core/presets.ts";
export type { ReadingLanguages } from "./core/reading.ts";
export type { SelectDetail, Widget, WidgetOptions } from "./dom/widget.ts";
export type { Dashboard, DashboardOptions } from "./dom/dashboard.ts";
export type { Editor, EditorOptions, EditorSample } from "./dom/editor.ts";
export type { Composer, ComposerOptions, FilterChoice } from "./dom/composer.ts";
export type { Embedded } from "./dom/embed.ts";
export type { WidgetAction } from "./dom/export.ts";
export type { FftWidgetElement } from "./dom/element.ts";
