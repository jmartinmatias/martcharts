/**
 * `martcharts/core`: the widget engine with no DOM, so it runs in browsers, Node and workers. Specs, forking, the
 * block registry, the data pipeline, formatting, validation, the option aliases, colour rules, RAG, the reading
 * guide, the question, the chart guide and the recommender.
 *
 * Colour science and palettes are in `martcharts/color`, maps in `martcharts/geo`, and the Taller in
 * `martcharts/taller`; the front door, `martcharts`, holds the few names most pages need.
 *
 * @module
 */
export type { DataSpec, FacetSpec, FieldSpec, FormatSpec, Issue, ResponsiveRule, Row, StyleSpec, StyleToken, TransformSpec, ViewSpec, WidgetLink, WidgetSpec } from "./types.ts";
export type { Tooltip, TooltipItem, ViewContext, ViewRenderer } from "./view-context.ts";
export type {
  Block,
  BlockInfo,
  BlockKind,
  FormatBlock,
  LoadContext,
  OptionSchema,
  OptionType,
  SourceBlock,
  TransformBlock,
  ViewBlock,
} from "./registry.ts";
export type { CsvData, FnData, InlineData, SheetData, UrlData } from "./sources.ts";
export { MIN_REFRESH, parseCsv, sheetCsvUrl } from "./sources.ts";
export { colorRuleProblems, highlightedNames, highlightRuleProblems, isHighlightRule, matchRule, ruleColor, ruleColors, rowRuleColor, RULE_OPS, THEME_COLORS } from "./rules.ts";
export type { ColorRule, HighlightRule, RuleOp, ValueRule } from "./rules.ts";
export { activeBreakpoints, atWidth, breakpointKey, responsiveProblems } from "./responsive.ts";
export { isRich, richLines } from "./rich.ts";
export type { RichContext, RichRun } from "./rich.ts";
export type { AggregateStep, BinStep, CalcStep, FilterOp, FilterStep, LimitStep, Measure, PivotStep, SortStep } from "./transforms.ts";
export type { KpisItem, KpisView } from "./views.ts";
export type { RidgelineView } from "./views.ts";
export type { LifecycleView, MatrixView, StripsView } from "./views.ts";
export { isYes } from "./views.ts";
export type { HistoryView, WhitespaceView, XrayView } from "./views.ts";
export { WHITESPACE_STATES } from "./views.ts";
export type { BoardView, ChoroplethView, GeoOption, LocatorView, Quadrants, SymbolsView } from "./views.ts";
export { BOARD_LIMIT } from "./views.ts";
export type { KpiRag, RagboardView, RagtrendView } from "./views.ts";
export { periodTime } from "./views.ts";
export { applyRag, isRagValue, ragCounts, ragFromValue, ragOf, ragRank, ragScore, ragShape, ragShapePath, ragStepProblems, ragTrend, ragWord, RAG_ORDER, RAG_SHAPES, RAG_WORDS, worstOf } from "./rag.ts";
export type { Rag, RagRule, RagShape, RagStep, RagThresholds, RagTrend } from "./rag.ts";
export { auditWallet, strategyMarkdown, strategyText, WALLET_SOURCES } from "./wallet.ts";
export type { Sourced, WalletAudit, WalletDeal, WalletInput, WalletOpportunity, WalletProduct, WalletRisk, WalletRule, WalletSource, WalletTouch } from "./wallet.ts";
export type { XrayAudit, XrayAuditSource } from "./views.ts";
export { langOf, wordsFor, WORDS_EN } from "./words.ts";
export type { Lang, LocaleSource, Words } from "./words.ts";
export { ragGlyph } from "./formats.ts";
export type { AreaView, BarView, BeeswarmView, BulletView, CalendarView, DotView, DumbbellView, SankeyView, DonutView, PieView, AnomaliesView, FunnelView, TreemapView, HbarView, HeatmapView, KpiView, LineView, ListView, MeterView, ScatterView, SlopeView, BumpView, MarimekkoView, HistogramView, RingsView, TimelineView, WaffleView, VarianceView, GaugeView, ParetoView, BoxplotView, LikertView, CandlestickView, SunburstView, ChordView, RadarView, TableView, WaterfallView } from "./views.ts";
export type { Override } from "./fork.ts";

export { baseWidget } from "./base.ts";
export { RANGE_OPTIONS, rangeStart, validateDashboard } from "./dashboard.ts";
export type { DashboardCell, DashboardFilter, DashboardFollow, DashboardRange, DashboardSpec } from "./dashboard.ts";
export { computeHeadline, HEADLINE_OPTIONS, summarizeField } from "./headline.ts";
export { checkReference, REFERENCE_OPTION, referenceValues, resolveReferences } from "./reference.ts";
export type { ReferenceMark, ResolvedReference } from "./reference.ts";
export type { HeadlineAgg, HeadlineSpec } from "./headline.ts";
export { describePresets, getPreset, presetNames, registerPreset } from "./presets.ts";
export { registerPalette } from "./palettes.ts";
export type { NamedPalette } from "./palettes.ts";
export type { StylePreset } from "./presets.ts";
export { fork } from "./fork.ts";
export { binValues, niceTicks, sturges } from "./scale.ts";
export type { Bin } from "./scale.ts";
export { suggestView } from "./suggest.ts";
export { recommendCharts } from "./recommend.ts";
export type { ChartPick } from "./recommend.ts";
export { questionOf } from "./question.ts";
export { readingLanguages, registerReadingLanguages } from "./reading.ts";
export type { ReadingLanguages } from "./reading.ts";
export { describeChart, describeCharts, firstSentence, needsText } from "./catalog.ts";
export type { ChartEntry, ChartNeed } from "./catalog.ts";
export type { Question, QuestionKind } from "./question.ts";
export { fillTemplate, hasTemplate, templateFields, templateRefs } from "./template.ts";
export { applyTransforms, runPipeline } from "./pipeline.ts";
export { fieldLabel, formatNode, formatValue, humanize } from "./display.ts";
export { FACET_OPTIONS, hasErrors, validateSpec } from "./validate.ts";
export { aliasesOf, aliasUse, canonicalName, normalizeView, OPTION_ALIASES } from "./aliases.ts";
export type { AliasUse, OptionAlias } from "./aliases.ts";
export { alsoAccepts, canonicalSpec, canonicalView, readable, shownName } from "./canonical.ts";
export { WIDGET_REF, widgetRef } from "./ref.ts";
export { ICON_NAMES, ICONS } from "./icons.ts";
export {
  blockTypes,
  describeBlocks,
  getBlock,
  hasBlock,
  registerFormat,
  registerSource,
  registerTransform,
  registerView,
  setRenderer,
  UnknownBlockError,
} from "./registry.ts";
export { chartGuide, chartGuides, chartsFor, dataContract, guideMarkdown, PURPOSES, rowsToCsv, rowsToMarkdown, switchChart, switchOptions } from "./guide.ts";
export type { ChartGuide, ChartSwitch, ContractColumn, DataContract, Fit, Grain, Purpose, Verdict } from "./guide.ts";
