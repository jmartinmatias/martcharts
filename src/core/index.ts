/**
 * The widget core: specs, forking, the block registry, the data pipeline,
 * formatting and validation. No DOM, so it runs in browsers, Node and workers.
 *
 * @module
 */
export type { DataSpec, FacetSpec, FieldSpec, FormatSpec, Issue, Row, StyleSpec, StyleToken, TransformSpec, ViewSpec, WidgetSpec } from "./types.ts";
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
export type { FnData, InlineData, UrlData } from "./sources.ts";
export type { AggregateStep, BinStep, CalcStep, FilterOp, FilterStep, LimitStep, Measure, PivotStep, SortStep } from "./transforms.ts";
export type { KpisItem, KpisView } from "./views.ts";
export type { RidgelineView } from "./views.ts";
export type { AreaView, BarView, BeeswarmView, BulletView, CalendarView, DumbbellView, SankeyView, DonutView, FunnelView, TreemapView, HbarView, HeatmapView, KpiView, LineView, ListView, MeterView, ScatterView, SlopeView, BumpView, MarimekkoView, HistogramView, RingsView, TimelineView, WaffleView, VarianceView, GaugeView, ParetoView, BoxplotView, LikertView, CandlestickView, SunburstView, ChordView, RadarView, TableView, WaterfallView } from "./views.ts";
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
export { AUDIENCES, balanceOf, createVariants, fillsOf, huePalette, meaningOf, MOVES, noveltyOf, plainTags, PRINCIPLES, profileData, qualitiesOf, QUALITIES, rankVariants } from "./taller.ts";
export { explainVariant } from "./taller-explain.ts";
export type { Audience, Balance, ColorEmphasis, DataProfile, Lineage, Look, Marks, Move, Principle, Qualities, Quality, TallerOptions, Variant } from "./taller.ts";
export { questionOf } from "./question.ts";
export type { Question, QuestionKind } from "./question.ts";
export { fillTemplate, hasTemplate, templateFields, templateRefs } from "./template.ts";
export { applyTransforms, runPipeline } from "./pipeline.ts";
export { fieldLabel, formatNode, formatValue, humanize } from "./display.ts";
export { FACET_OPTIONS, hasErrors, validateSpec } from "./validate.ts";
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
