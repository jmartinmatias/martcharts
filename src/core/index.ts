/**
 * The widget core: specs, forking, the block registry, the data pipeline,
 * formatting and validation. No DOM, so it runs in browsers, Node and workers.
 *
 * @module
 */
export type { DataSpec, FacetSpec, FieldSpec, FormatSpec, Issue, Row, StyleSpec, StyleToken, TransformSpec, ViewSpec, WidgetLink, WidgetSpec } from "./types.ts";
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
export type { CsvData, FnData, InlineData, UrlData } from "./sources.ts";
export { parseCsv } from "./sources.ts";
export type { AggregateStep, BinStep, CalcStep, FilterOp, FilterStep, LimitStep, Measure, PivotStep, SortStep } from "./transforms.ts";
export type { KpisItem, KpisView } from "./views.ts";
export type { RidgelineView } from "./views.ts";
export type { LifecycleView, MatrixView, StripsView } from "./views.ts";
export { isYes } from "./views.ts";
export type { HistoryView, WhitespaceView, XrayView } from "./views.ts";
export { WHITESPACE_STATES } from "./views.ts";
export type { BoardView, ChoroplethView, GeoOption, LocatorView, Quadrants, SymbolsView } from "./views.ts";
export { BOARD_LIMIT } from "./views.ts";
export { basemap, basemapNames, basemapTiles, describeBasemaps, featureId, featureName, geoAspect, geoProblem, guessBasemap, isGeoCollection, isGeoUrl, normalizeId, project, resolveGeo, SEQUENTIAL_STEPS, sequentialStep } from "./geo.ts";
export type { GeoCollection, GeoFeature, GeoGeometry, Position, ProjectedShape, Projection } from "./geo.ts";
export type { AreaView, BarView, BeeswarmView, BulletView, CalendarView, DotView, DumbbellView, SankeyView, DonutView, PieView, AnomaliesView, FunnelView, TreemapView, HbarView, HeatmapView, KpiView, LineView, ListView, MeterView, ScatterView, SlopeView, BumpView, MarimekkoView, HistogramView, RingsView, TimelineView, WaffleView, VarianceView, GaugeView, ParetoView, BoxplotView, LikertView, CandlestickView, SunburstView, ChordView, RadarView, TableView, WaterfallView } from "./views.ts";
export type { Override } from "./fork.ts";

export { baseWidget } from "./base.ts";
export { RANGE_OPTIONS, rangeStart, validateDashboard } from "./dashboard.ts";
export type { DashboardCell, DashboardFilter, DashboardRange, DashboardSpec } from "./dashboard.ts";
export { computeHeadline, HEADLINE_OPTIONS, summarizeField } from "./headline.ts";
export { checkReference, REFERENCE_OPTION, referenceValues, resolveReferences } from "./reference.ts";
export type { ReferenceMark, ResolvedReference } from "./reference.ts";
export type { HeadlineAgg, HeadlineSpec } from "./headline.ts";
export { describePresets, getPreset, presetNames, registerPreset } from "./presets.ts";
export { describePalettes, getPalette, paletteNames, registerPalette, resolvePalette } from "./palettes.ts";
export type { NamedPalette } from "./palettes.ts";
export { checkPalette, contrast, deltaE, luminance, oklab, oklch, parseHex, toHex } from "./color.ts";
export type { Deficiency, PaletteCheck, PaletteReport, Rgb } from "./color.ts";
export type { StylePreset } from "./presets.ts";
export { fork } from "./fork.ts";
export { binValues, niceTicks, sturges } from "./scale.ts";
export type { Bin } from "./scale.ts";
export { suggestView } from "./suggest.ts";
export { recommendCharts } from "./recommend.ts";
export type { ChartPick } from "./recommend.ts";
export { AUDIENCES, balanceOf, createVariants, fillsOf, huePalette, meaningOf, MOVES, noveltyOf, plainTags, PRINCIPLES, profileData, qualitiesOf, QUALITIES, rankVariants } from "./taller.ts";
export { explainVariant } from "./taller-explain.ts";
export type { Audience, Balance, ColorEmphasis, DataProfile, Lineage, Look, Marks, Move, Principle, Qualities, Quality, TallerOptions, Variant } from "./taller.ts";
export { questionOf } from "./question.ts";
export { describeChart, describeCharts, firstSentence, needsText } from "./catalog.ts";
export type { ChartEntry, ChartNeed } from "./catalog.ts";
export type { Question, QuestionKind } from "./question.ts";
export { fillTemplate, hasTemplate, templateFields, templateRefs } from "./template.ts";
export { applyTransforms, runPipeline } from "./pipeline.ts";
export { fieldLabel, formatNode, formatValue, humanize } from "./display.ts";
export { FACET_OPTIONS, hasErrors, validateSpec } from "./validate.ts";
export { aliasesOf, aliasUse, canonicalName, normalizeView, OPTION_ALIASES } from "./aliases.ts";
export type { AliasUse, OptionAlias } from "./aliases.ts";
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
