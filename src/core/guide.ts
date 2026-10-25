/**
 * The chart guide: for each view, the jobs it does well and badly, what one row
 * stands for, how its rows become marks, and how many rows it reads well with.
 * On top of that, three helpers that work on any data, not only the catalog's:
 *
 * - `dataContract(spec, rows)`: the table a chart needs, column by column, against the data it has.
 * - `switchChart(spec, rows, to)`: the same data drawn as another chart, whether it fits, and what changes.
 * - `switchOptions(spec, rows)`: every other chart, best first.
 *
 * Shared by `npm run catalog` (catalog/guide.html, docs/chart-guide.md) and the MCP tools `fft_describe_chart` (guide) and `fft_suggest_charts` (switch).
 *
 * @module
 */
import { normalizeView } from "./aliases.ts";
import { alsoAccepts, canonicalSpec, canonicalView, readable, shownName } from "./canonical.ts";
import { firstSentence } from "./catalog.ts";
import { recommendCharts } from "./recommend.ts";
import { blockTypes, getBlock } from "./registry.ts";
import type { OptionSchema } from "./registry.ts";
import { suggestView } from "./suggest.ts";
import type { Row, ViewSpec, WidgetSpec } from "./types.ts";
import { hasErrors, validateSpec } from "./validate.ts";

/** The jobs a chart can do for a report. */
export const PURPOSES = {
  compare: "Comparing amounts across categories",
  rank: "Ranking, top to bottom",
  trend: "Trend over time",
  share: "Share of one whole",
  mix: "How each group or period splits",
  distribution: "How values spread",
  relationship: "How two measures relate",
  flow: "Flows between stages or groups",
  conversion: "Conversion through ordered steps",
  hierarchy: "Nested breakdowns",
  target: "Actual against target or plan",
  change: "Change between two points",
  drivers: "What drives or moves a total",
  pattern: "Patterns across two dimensions or a cycle",
  profile: "Profiles across several attributes",
  survey: "Survey and rating answers",
  schedule: "Schedules and plans",
  headline: "A headline number",
  lookup: "Exact values and lookup",
} as const;

export type Purpose = keyof typeof PURPOSES;

/**
 * What one row stands for:
 * - `category`: one row per category (region, product), each named once.
 * - `period`: one row per point in time, in order.
 * - `observation`: one row per thing measured (a deal, a ticket); the chart counts or spreads them.
 * - `pair`: one row per combination of two categories, such as month and product.
 * - `link`: one row per flow from a source to a target.
 * - `leaf`: one row per leaf of a hierarchy, its levels in columns.
 * - `single`: one value; extra rows are ignored or drawn as a small trend.
 * - `any`: any rows.
 */
export type Grain = "category" | "period" | "observation" | "pair" | "link" | "leaf" | "single" | "any";

/** What a chart is good and bad at, and the data it reads well. */
export interface ChartGuide {
  type: string;
  /** How well it does each job, 1 to 3 (3: what it is for). Jobs it cannot do are left out. */
  purposes: Partial<Record<Purpose, 1 | 2 | 3>>;
  grain: Grain;
  /** How the rows become marks, in one or two sentences. */
  build: string;
  /** Row counts it reads well with: fewer than `min` says little, more than `max` crowds. */
  rows: { min?: number; max?: number };
  /** True when the value field must be zero or more (areas, slices and ribbons cannot be negative). */
  positive?: boolean;
  /** The reports and questions it is best for. */
  bestFor: string[];
  /** Where it is the wrong choice, each with what to use instead. */
  avoidFor: string[];
}

const GUIDES: ChartGuide[] = [
  {
    type: "area",
    purposes: { trend: 3, mix: 2, compare: 1 },
    grain: "period",
    build: "One point per row at x (in date order) and y; the area under the line is filled down to zero. Several y fields stack or overlap; a forecast field continues the line dashed, and a band (low, high) shades a range.",
    rows: { min: 4, max: 400 },
    bestFor: ["Volumes over time where the amount itself matters: cash, revenue, traffic", "A forecast with its uncertainty band", "How a stacked total splits over time (two to four series)"],
    avoidFor: ["Several series that cross: the fills hide each other (use line)", "Categories with no order (use bar)", "Values that go below zero"],
  },
  {
    type: "bar",
    purposes: { compare: 3, rank: 2, trend: 2, mix: 2, share: 1, target: 1, lookup: 1 },
    grain: "category",
    build: "One bar per row at x, as tall as y. Several y fields make grouped bars, or stacked ones with stacked (percent for shares); a lines field draws a line such as a target across the bars.",
    rows: { min: 2, max: 16 },
    bestFor: ["An amount across a handful of categories: revenue by region, orders by month", "Two or three series side by side or stacked: Core and Plus by region", "Monthly totals against a budget line"],
    avoidFor: ["Long category names (use hbar)", "More than about 15 categories (use hbar or treemap)", "A long continuous trend (use line)"],
  },
  {
    type: "beeswarm",
    purposes: { distribution: 3, compare: 1, lookup: 1 },
    grain: "observation",
    build: "One dot per row along the value axis, nudged apart so none overlap; a group field gives each group its own row, and a label field names each dot on hover.",
    rows: { min: 10, max: 400 },
    bestFor: ["Every individual deal, order or response visible, with outliers you can name", "Spread across a few groups in samples of tens to hundreds"],
    avoidFor: ["Thousands of rows (use histogram)", "Totals or shares (use bar or donut)"],
  },
  {
    type: "boxplot",
    purposes: { distribution: 3, compare: 2 },
    grain: "observation",
    build: "Rows are grouped by group; each group's values give a box from the first to the third quartile, a line at the median, whiskers and outlier dots.",
    rows: { min: 15 },
    bestFor: ["Comparing medians and spread across groups: deal size by region, handle time by team", "Spotting outliers in analytic reviews"],
    avoidFor: ["Audiences who do not read quartiles (use beeswarm or ridgeline)", "Fewer than about five values per group", "Totals"],
  },
  {
    type: "bullet",
    purposes: { target: 3, compare: 2, rank: 1, headline: 1 },
    grain: "category",
    build: "One compact row per row: a bar to value, a tick at target, over bands for poor, fair and good.",
    rows: { min: 1, max: 12 },
    bestFor: ["KPI scorecards against target in little space", "Several measures with different targets on one card"],
    avoidFor: ["Data with no target (use hbar)", "Trends over time (use line with a reference)"],
  },
  {
    type: "bump",
    purposes: { rank: 3, trend: 2 },
    grain: "pair",
    build: "Rows are one per period and series; in each period the series are ranked by value and each series is a line through its ranks.",
    rows: { min: 6 },
    bestFor: ["How a ranking changes over time: products, teams, channels by month", "Who overtook whom"],
    avoidFor: ["When the size of the gaps matters, as ranks hide it (use line)", "More than about ten series, or only one period"],
  },
  {
    type: "calendar",
    purposes: { pattern: 3, trend: 2 },
    grain: "period",
    build: "One cell per day (weeks as columns from Monday), shaded by value on one scale.",
    rows: { min: 28, max: 800 },
    bestFor: ["Daily activity over months: orders, logins, incidents", "Weekday and seasonal patterns, streaks and gaps"],
    avoidFor: ["Monthly or weekly data (use bar or line)", "Exact comparisons between days (use bar)"],
  },
  {
    type: "candlestick",
    purposes: { trend: 3, distribution: 1, lookup: 1 },
    grain: "period",
    build: "One candle per row: a wick from low to high and a body from open to close, colored up or down; an optional moving average line.",
    rows: { min: 5, max: 250 },
    bestFor: ["Prices per period: share price, exchange rates, commodity prices", "Volatility and the open-to-close move in trading reports"],
    avoidFor: ["Anything without open, high, low and close (use line)"],
  },
  {
    type: "chord",
    purposes: { flow: 3, relationship: 1 },
    grain: "link",
    positive: true,
    build: "Each group is an arc as long as everything it sends and receives; each row is a ribbon from source to target, as thick as value.",
    rows: { min: 3, max: 60 },
    bestFor: ["Two-way flows among the same groups: customers moving between plans, trade between regions"],
    avoidFor: ["One-way chains of stages (use sankey)", "Reading exact amounts (use table)", "More than about ten groups"],
  },
  {
    type: "donut",
    purposes: { share: 3, headline: 1, compare: 1 },
    grain: "category",
    positive: true,
    build: "One slice per row, its angle its share of the sum of value, with the total in the middle.",
    rows: { min: 2, max: 6 },
    bestFor: ["Share of one whole with two to five parts: revenue by segment, budget by team", "An executive summary where the total matters too"],
    avoidFor: ["More than six parts or close values (use hbar)", "Comparing several wholes (use bar stacked to percent)", "Change over time (use area)"],
  },
  {
    type: "dumbbell",
    purposes: { change: 3, compare: 2, rank: 1 },
    grain: "category",
    build: "One line per row from its from value (muted dot) to its to value (accent dot) on one shared axis.",
    rows: { min: 2, max: 20 },
    bestFor: ["Before and after per item: this year against last per region, pre and post a change", "Showing the size of each gap"],
    avoidFor: ["More than two points in time (use line)", "Items on different scales"],
  },
  {
    type: "funnel",
    purposes: { conversion: 3, compare: 1, flow: 1 },
    grain: "category",
    positive: true,
    build: "One stage per row, in row order, as centered bars as wide as value, with the rate from each stage to the next.",
    rows: { min: 3, max: 8 },
    bestFor: ["Conversion through ordered steps: visit, sign-up, trial, paid", "Where most people drop out of a pipeline"],
    avoidFor: ["Categories with no order (use hbar)", "Stages that can grow from one to the next"],
  },
  {
    type: "gauge",
    purposes: { headline: 3, target: 3 },
    grain: "single",
    build: "The first row's value fills a half-circle from min to max, with a tick at target and the number in the middle.",
    rows: { min: 1, max: 1 },
    bestFor: ["One KPI against a goal on a known scale: NPS, utilization, SLA attainment"],
    avoidFor: ["Several values (use bullet or meter)", "Trends (use kpi with series)", "Small differences, which the arc hides"],
  },
  {
    type: "hbar",
    purposes: { rank: 3, compare: 3, lookup: 1, target: 1 },
    grain: "category",
    build: "One horizontal bar per row, label on the left and value at the end, sorted as given or by value. Several value fields draw one thin bar each per row, stacked into one bar with stacked (percent for shares), or in one column per field with split.",
    rows: { min: 2, max: 30 },
    bestFor: ["Rankings with long names: top features, top customers, causes", "Up to about 30 categories, readable on a phone", "Two or three measures per row, side by side, stacked, or split into columns when their units differ"],
    avoidFor: ["Time order (use bar or line)", "Share of one whole (use donut or waffle)"],
  },
  {
    type: "heatmap",
    purposes: { pattern: 3, compare: 1 },
    grain: "pair",
    build: "One cell per row at x and y, shaded by value on one scale from light (low) to dark (high).",
    rows: { min: 6, max: 600 },
    bestFor: ["Two categories crossed: weekday by hour, region by product", "Finding hot spots and quiet times"],
    avoidFor: ["Exact values (use table)", "One dimension only (use bar)"],
  },
  {
    type: "histogram",
    purposes: { distribution: 3 },
    grain: "observation",
    build: "The range of value is cut into bins on round edges; each bar counts the rows in its bin.",
    rows: { min: 20 },
    bestFor: ["The shape of one measure: deal sizes, response times, order values", "Skew, clusters and the typical range"],
    avoidFor: ["Comparing groups (use boxplot or ridgeline)", "Fewer than about 20 values (use beeswarm)", "Totals"],
  },
  {
    type: "horizon",
    purposes: { trend: 3, compare: 2, target: 1 },
    grain: "period",
    build: "One thin row per y field; each value is measured from a baseline and folded into bands of deepening color, blue above and red below.",
    rows: { min: 10 },
    bestFor: ["Many series over time in little space: six to twenty regions, servers or stores", "Deviation from plan, day by day, in operations monitoring"],
    avoidFor: ["General audiences and exact values (use line)", "One or two series"],
  },
  {
    type: "icicle",
    purposes: { hierarchy: 3, share: 2, rank: 1 },
    grain: "leaf",
    positive: true,
    build: "A column for the total, then one per level; each child splits its parent's height by the sum of value.",
    rows: { min: 4, max: 200 },
    bestFor: ["Deep breakdowns with long names: budget by unit, team and line", "Drill paths, left to right"],
    avoidFor: ["Flat data with one level (use hbar)", "Negative values"],
  },
  {
    type: "pie",
    purposes: { share: 3, compare: 1 },
    grain: "category",
    positive: true,
    build: "One wedge per row from twelve o'clock clockwise, its angle its share of the sum of value, the share written on it.",
    rows: { min: 2, max: 6 },
    bestFor: ["Share of one whole with two to five parts, where the shares themselves are the point: votes, market share", "Small multiples of one split per group (facet), the same part in the same color everywhere"],
    avoidFor: ["More than six parts or close values (use hbar)", "When the total matters too (use donut)", "Change over time (use area)"],
  },
  {
    type: "kpi",
    purposes: { headline: 3, trend: 1, target: 1 },
    grain: "single",
    build: "The last row's value, large, with its change against the row before (or compare); with series, every row draws a small trend.",
    rows: { min: 1 },
    bestFor: ["One number with its change: churn this month, revenue this quarter", "The top row of a dashboard"],
    avoidFor: ["Comparing categories (use hbar)", "Several numbers (use kpis)"],
  },
  {
    type: "kpis",
    purposes: { headline: 3, target: 1, trend: 1 },
    grain: "single",
    build: "One tile per item, each the last row's value of its field with its change; with series, each tile draws its trend.",
    rows: { min: 1 },
    bestFor: ["Three to six key numbers side by side: revenue, profit, new customers, churn"],
    avoidFor: ["Breakdowns by category (use bar or table)"],
  },
  {
    type: "likert",
    purposes: { survey: 3, share: 2, compare: 2 },
    grain: "category",
    positive: true,
    build: "One bar per row (a question); its response fields, in order from one pole to the other, stack centered on the neutral middle.",
    rows: { min: 1, max: 20 },
    bestFor: ["Agree and disagree scales: employee and customer surveys", "Comparing sentiment across questions"],
    avoidFor: ["Categories with no order from negative to positive (use bar stacked)"],
  },
  {
    type: "line",
    purposes: { trend: 3, compare: 2, target: 2 },
    grain: "period",
    build: "One point per row at x (in order) and y, joined; each y field is one series, and reference lines mark targets.",
    rows: { min: 3, max: 1000 },
    bestFor: ["Change over time: revenue, users, cost by month", "Several series compared over time", "Progress against a target or a forecast"],
    avoidFor: ["Categories with no order (use bar)", "Share of a whole (use donut or area stacked)", "Only two points in time (use slope)"],
  },
  {
    type: "list",
    purposes: { lookup: 3, rank: 2 },
    grain: "category",
    build: "One line per row: label, an optional detail underneath and an optional value on the right.",
    rows: { min: 1, max: 20 },
    bestFor: ["Top-N lists where names matter more than sizes: top customers, latest deals", "Narrow cards and phones"],
    avoidFor: ["Seeing sizes at a glance (use hbar)", "Long lists (use table)"],
  },
  {
    type: "marimekko",
    purposes: { mix: 3, share: 2, compare: 2 },
    grain: "pair",
    positive: true,
    build: "One column per x category, as wide as its total; each column is split by series into segments as tall as their share.",
    rows: { min: 4, max: 60 },
    bestFor: ["Market maps: how big each segment is and how it splits (region by product)", "Sizing opportunities in strategy reviews"],
    avoidFor: ["Many small segments", "Precise values (use table)", "Audiences new to mosaics (use bar stacked)"],
  },
  {
    type: "meter",
    purposes: { target: 3, compare: 1, headline: 1 },
    grain: "category",
    build: "One meter per row: value as a percentage of target, a bar filling to the target and the gap in words.",
    rows: { min: 1, max: 12 },
    bestFor: ["Progress to target per item: quota attainment by region, OKRs, fundraising"],
    avoidFor: ["Data with no target (use hbar)", "Negative values"],
  },
  {
    type: "pareto",
    purposes: { drivers: 3, rank: 3, share: 2 },
    grain: "category",
    positive: true,
    build: "Rows sorted largest first as bars of their share of the total, a line through the running total and a dashed line at the threshold (80% by default).",
    rows: { min: 4, max: 25 },
    bestFor: ["The few causes behind most of a total: ticket causes, defects, returns, costs", "Deciding where to act first"],
    avoidFor: ["Time order (use bar)", "Fewer than four categories", "Negative values"],
  },
  {
    type: "radar",
    purposes: { profile: 3, compare: 2 },
    grain: "category",
    build: "One spoke per row (an attribute) and one shape per y field, all on one scale from zero.",
    rows: { min: 3, max: 12 },
    bestFor: ["Profiles across four to ten attributes on one scale: product against market, skills"],
    avoidFor: ["Attributes in different units", "More than three shapes", "Rankings (use hbar)"],
  },
  {
    type: "ridgeline",
    purposes: { distribution: 3, compare: 2, trend: 1 },
    grain: "observation",
    build: "Rows are grouped by group; each group's values become a smooth density curve, the curves overlapping on one axis.",
    rows: { min: 20 },
    bestFor: ["Comparing distribution shapes across many groups: deal size by region, latency by month"],
    avoidFor: ["Few values per group (use beeswarm)", "Exact statistics (use boxplot)"],
  },
  {
    type: "rings",
    purposes: { target: 3, headline: 2, compare: 1 },
    grain: "category",
    positive: true,
    build: "One ring per row from the outside in, filled to value over target; past the target a second lap shows how far over.",
    rows: { min: 1, max: 4 },
    bestFor: ["Progress on one to four goals in a compact tile: activity, product targets"],
    avoidFor: ["More than four goals (use meter)", "Comparing sizes, as inner rings are shorter"],
  },
  {
    type: "rose",
    purposes: { pattern: 3, compare: 1 },
    grain: "category",
    positive: true,
    build: "One equal wedge per row, clockwise from twelve o'clock, its area true to value; several y fields stack.",
    rows: { min: 4, max: 36 },
    bestFor: ["Cycles that wrap round: hours of the day, months of the year, directions"],
    avoidFor: ["Categories with no cycle (use bar)", "Precise comparisons"],
  },
  {
    type: "sankey",
    purposes: { flow: 3, hierarchy: 1, drivers: 1 },
    grain: "link",
    positive: true,
    build: "Each row is a ribbon from source to target, as thick as value; nodes stack into stages left to right.",
    rows: { min: 2, max: 80 },
    bestFor: ["Flows through stages: traffic source to page to outcome, budget to spend", "Where volume goes and where it is lost"],
    avoidFor: ["Flows that loop back between the same groups (use chord)", "Many tiny flows"],
  },
  {
    type: "scatter",
    purposes: { relationship: 3, distribution: 1, lookup: 1 },
    grain: "observation",
    build: "One dot per row at x and y (both numbers); size and series add a third and fourth field, and label names each dot.",
    rows: { min: 6, max: 2000 },
    bestFor: ["Whether two measures move together: growth and margin, price and volume", "Segments and quadrants, and the accounts that stand out"],
    avoidFor: ["One measure only (use histogram)", "Trends over time (use line)"],
  },
  {
    type: "slope",
    purposes: { change: 3, rank: 2 },
    grain: "category",
    build: "One line per row from its from value on the left to its to value on the right, on one shared scale.",
    rows: { min: 2, max: 15 },
    bestFor: ["Two points in time: H1 against H2, last year against this", "Seeing who rose, who fell and who swapped places"],
    avoidFor: ["More than two periods (use line or bump)", "More than about 15 items, where lines tangle (use dumbbell)"],
  },
  {
    type: "sunburst",
    purposes: { hierarchy: 3, share: 2 },
    grain: "leaf",
    positive: true,
    build: "The inner ring splits the total by the first level; each outer ring splits its parent by the next level, by the sum of value.",
    rows: { min: 4, max: 120 },
    bestFor: ["Two or three level part-to-whole: revenue by product, then region", "An overview that invites a closer look"],
    avoidFor: ["Precise comparisons (use icicle or hbar)", "Deep levels with long names (use icicle)"],
  },
  {
    type: "table",
    purposes: { lookup: 3, compare: 1 },
    grain: "any",
    build: "One line per row and one column per field (or the columns listed), formatted, sortable, with optional totals.",
    rows: { min: 1 },
    bestFor: ["Exact values, many columns, audit and export", "Data people will look up rather than scan"],
    avoidFor: ["Seeing a pattern at a glance (use any chart)"],
  },
  {
    type: "timeline",
    purposes: { schedule: 3 },
    grain: "category",
    build: "One row per task with a bar from start to end, a diamond where there is no end (a milestone), grouped and with a today line.",
    rows: { min: 1, max: 40 },
    bestFor: ["Project plans, launch phases and milestones", "What is late or running now"],
    avoidFor: ["Quantities (use bar)"],
  },
  {
    type: "treemap",
    purposes: { share: 3, hierarchy: 2, compare: 1 },
    grain: "category",
    positive: true,
    build: "One tile per row, its area its share of the sum of value, kept close to square; an optional group field clusters tiles.",
    rows: { min: 4, max: 120 },
    bestFor: ["Many parts of one whole: revenue by customer, spend by vendor", "Portfolios grouped by segment"],
    avoidFor: ["Two or three parts (use donut)", "Precise comparisons (use hbar)", "Negative values"],
  },
  {
    type: "variance",
    purposes: { target: 3, drivers: 2, compare: 2 },
    grain: "category",
    build: "One bar per row from a zero line to value minus target, right when over and left when under, colored good or bad.",
    rows: { min: 2, max: 20 },
    bestFor: ["Budget against actual per line item", "Financial variance reports where the sign and size of each miss matter"],
    avoidFor: ["Data with no plan or budget (use hbar)"],
  },
  {
    type: "waffle",
    purposes: { share: 3, headline: 1 },
    grain: "category",
    positive: true,
    build: "A 10 by 10 grid, one square per percent, filled category by category in row order.",
    rows: { min: 1, max: 5 },
    bestFor: ["One share people grasp at once: 37% of revenue is online", "Two to five parts for a general audience"],
    avoidFor: ["Many parts or shares under 1%", "Comparing several wholes (use bar stacked to percent)"],
  },
  {
    type: "waterfall",
    purposes: { drivers: 3, change: 2 },
    grain: "category",
    build: "Rows in order: totals stand on zero, and every other row is a change floating from the running total, up or down.",
    rows: { min: 3, max: 15 },
    bestFor: ["Bridges: what took revenue from Q2 to Q3, a profit and loss walk", "Explaining a move from a start to an end"],
    avoidFor: ["Amounts that are not changes to one total (use bar)"],
  },
  {
    type: "dot",
    purposes: { compare: 3, rank: 2, lookup: 1, change: 1 },
    grain: "category",
    build: "One row per data row with a hairline across and one dot per values field at its value on one shared axis; one field writes its value beside the dot, several take series colors.",
    rows: { min: 2, max: 30 },
    bestFor: ["Two to five measures of one kind per item: ease, value and support scores by product", "Rankings where the differences matter more than the amounts: prices, rates, scores", "Many rows with far less ink than bars"],
    avoidFor: ["Amounts where the length from zero matters (use hbar)", "Measures on different scales (use table or radar)", "Exactly a before and an after (use dumbbell)"],
  },
  {
    type: "pyramid",
    purposes: { distribution: 3, compare: 2, mix: 1 },
    grain: "category",
    positive: true,
    build: "One row per band in the order given; the left field's count grows leftward from a center axis and the right field's rightward, both on one shared scale.",
    rows: { min: 3, max: 30 },
    bestFor: ["Two groups across ordered bands: women and men by age group, new and returning customers by tenure", "Seeing where two groups differ, from the shape alone"],
    avoidFor: ["More than two groups (use hbar with several values)", "Bands with no natural order (use hbar)", "Measures in different units"],
  },
  {
    type: "dual",
    purposes: { trend: 3, relationship: 2, compare: 1 },
    grain: "period",
    build: "Two panels one above the other sharing the x axis: y on the top panel and y2 on the bottom, each on its own scale, drawn as bars (from zero) or lines.",
    rows: { min: 3, max: 200 },
    bestFor: ["Two measures in different units over the same periods: revenue and churn, visits and conversion rate", "Showing whether two shapes move together without a misleading second axis"],
    avoidFor: ["Two series in the same unit (use line, one axis)", "More than two measures (use horizon or small multiples)", "Categories with no order (use bar)"],
  },
  {
    type: "choropleth",
    purposes: { compare: 3, pattern: 2, lookup: 1 },
    grain: "category",
    build: "One region per row, matched by its code to the basemap (a built-in tile grid or your GeoJSON), shaded on a seven-step scale from the lowest value to the highest; regions with no row stay grey.",
    rows: { min: 3, max: 300 },
    bestFor: ["An amount or a rate by country or state: revenue by country, share by state", "Seeing where something is high or low across a territory"],
    avoidFor: ["Exact comparisons between regions (use hbar)", "Totals that follow area or population, which big regions exaggerate (use a rate, or symbols)", "Rows that are not regions"],
  },
  {
    type: "symbols",
    purposes: { compare: 3, pattern: 2 },
    grain: "category",
    build: "One circle per row on its region (by code) or at its coordinates, its area true to the size field; a color field groups the circles with a key.",
    rows: { min: 2, max: 150 },
    bestFor: ["Counts and totals by place where the size itself matters: customers by state, volume by port", "Several kinds of place on one map, told apart by color"],
    avoidFor: ["Rates and shares (use choropleth)", "Hundreds of overlapping places (sum them by region first)"],
  },
  {
    type: "locator",
    purposes: { lookup: 3 },
    grain: "category",
    build: "One marker per row on its region (by code) or at its coordinates, its name written beside it; a kind field colors the markers with a key.",
    rows: { min: 1, max: 30 },
    bestFor: ["Where the offices, stores or sites are, by name", "A handful of named places for a report or a page header"],
    avoidFor: ["Amounts per place (use symbols)", "More than about 30 places, where names collide (use symbols or a table)"],
  },
  {
    type: "matrix",
    purposes: { pattern: 3, compare: 2, lookup: 2 },
    grain: "pair",
    build: "One mark per row at its x column and y row: a circle sized by size, shaded by color (a number on the seven-step scale, a category by its color), or a square where mark is yes; pairs with no row stay empty.",
    rows: { min: 4, max: 400 },
    bestFor: ["Regulatory pressure per topic per quarter: how many new obligations, how hard they bite", "Who must comply with which rule: one square per yes", "Any two categories crossed, where a heatmap's shade alone says too little"],
    avoidFor: ["One category only (use hbar or dot)", "Exact values to read off (use table with heat cells)", "More than about 24 columns or 30 rows"],
  },
  {
    type: "strips",
    purposes: { mix: 3, compare: 2, share: 1 },
    grain: "category",
    positive: true,
    build: "One row per data row with one small square per unit, filled part by part in order (each part its color), the total and the first part's share written at the end; when totals run long, one square stands for a round number of units.",
    rows: { min: 1, max: 20 },
    bestFor: ["How many provisions each regulation has and how many are binding (mandatory, recommended, optional)", "Density: provisions per page, when per is set", "Counts people can see as things, not lengths"],
    avoidFor: ["Amounts that are not counts, such as money (use hbar stacked)", "More than about 20 rows (use hbar stacked)", "Shares of one whole across items (use waffle or donut)"],
  },
  {
    type: "lifecycle",
    purposes: { schedule: 3, change: 2, lookup: 1 },
    grain: "category",
    build: "One row per data row on a shared date axis: from each stage's date to the next a segment in a deepening tint, a tick at every date, a faint run from the last known stage to the edge when the next date is missing, a today line, and a status pill at the end; impact sets the row's thickness.",
    rows: { min: 1, max: 30 },
    bestFor: ["Where each regulation stands: proposed, adopted, in force, applies", "What applies next, and how long since adoption", "Any multi-stage process with dates per stage: deals, hiring, product launches"],
    avoidFor: ["One start and one end per row (use timeline)", "Stages with no dates (use funnel or table)", "More than about 30 rows (filter, or facet by group)"],
  },
  {
    type: "whitespace",
    purposes: { mix: 3, lookup: 2, compare: 1 },
    grain: "pair",
    build: "One cell per row and column pair, read from its state: a filled square where held, an outlined square tinted by score where open, a faint dot where not eligible; each row ends with its penetration and the potential still open, each column with how many hold it and how many could; rows sort by potential.",
    rows: { min: 4, max: 480 },
    bestFor: ["Cross-sell and upsell: which clients could take which products, and where to start", "Product penetration across a book, with the money still on the table", "A relationship manager's weekly whitespace review"],
    avoidFor: ["Amounts without a held, open or not eligible state (use heatmap)", "More than about 16 products or 30 clients at once (filter or group first)", "One client alone (use xray)"],
  },
  {
    type: "xray",
    purposes: { headline: 3, lookup: 2, profile: 1 },
    grain: "single",
    build: "The first row's name and detail line, up to six facts as labelled figures, true/false product fields as pills (held in color), a share-of-wallet meter, a list of numbers as a small trend, and lists of flags and next best actions.",
    rows: { min: 1, max: 1 },
    bestFor: ["One client on one card: a pre-meeting brief, a client page, a relationship manager's cockpit", "Seeing holdings, share of wallet, trend and next steps at one glance"],
    avoidFor: ["Several clients (use whitespace or table)", "One number alone (use kpi)", "A history of events (use history)"],
  },
  {
    type: "history",
    purposes: { schedule: 3, lookup: 2, trend: 1 },
    grain: "observation",
    build: "One event per row sorted by date, newest first, each a dot colored by kind on a vertical rail with its date, title, note and amount; the month is written where it changes, and a group field makes one rail per value.",
    rows: { min: 3, max: 400 },
    bestFor: ["A client's story: meetings, calls, trades, campaigns and complaints in one scroll", "What happened before a churn, a complaint or a big trade", "Several clients' recent activity side by side"],
    avoidFor: ["Amounts over time, where the shape matters (use line)", "Tasks with a start and an end (use timeline)", "Counting events per period (use bar or calendar)"],
  },
  {
    type: "anomalies",
    purposes: { pattern: 3, trend: 2, lookup: 1 },
    grain: "pair",
    build: "One lane per metric over the shared time axis, each on its own scale: the expected band as a faint fill, the expected value as a hairline, the actual as a line, flagged readings as alert dots; lanes sorted by how many were flagged.",
    rows: { min: 14, max: 3000 },
    bestFor: ["Watching a dozen daily measures at once and seeing which stepped out of line: net new money, fees, trades, complaints", "Operations and risk monitoring, where the exceptions matter more than the levels"],
    avoidFor: ["Comparing the levels of the measures with each other (each lane has its own scale; use line)", "One measure only (use line with a band)"],
  },
  {
    type: "board",
    purposes: { lookup: 3, conversion: 2, compare: 1, schedule: 1 },
    grain: "category",
    build: "One column per stage (in the order of stages, or of first appearance) headed by its count, and one card per row in its stage's column, with a group dot, a value and a detail line when those fields are given.",
    rows: { min: 3, max: 120 },
    bestFor: ["Where everything stands in a lifecycle: regulations by status, deals by stage, tickets by state", "Seeing at once which stage is crowded and what is in it, by name"],
    avoidFor: ["Amounts per stage alone (use funnel or bar)", "Hundreds of items (filter first, or count them into a funnel)", "Stages with no natural order"],
  },
  {
    type: "ragboard",
    purposes: { target: 3, lookup: 2, compare: 1 },
    grain: "category",
    build: "One row per data row and one cell per dimension holding its status (R, A, G or N) as a shape, an Overall column with the worst of them first, rows sorted worst first, a strip that counts the statuses above and a count per column below; a previous field per dimension adds a better or worse arrow.",
    rows: { min: 2, max: 40 },
    bestFor: ["A RAG scorecard: client health, coverage, pipeline and relationship status per client or per relationship manager", "Which accounts need action first, and on what", "Status reviews where each cell is a judgment, not an amount"],
    avoidFor: ["Amounts and trends (use table with heat cells, or line)", "One status over many periods (use ragtrend)", "More than about 40 rows (filter to the ones that need attention)"],
  },
  {
    type: "ragtrend",
    purposes: { change: 3, trend: 2, target: 1 },
    grain: "pair",
    build: "One row per entity and one cell per period with its status as a shape, a tick where the status changed, the note of why in the tooltip, and the current status as a pill at the end; rows worst-current first.",
    rows: { min: 6, max: 600 },
    bestFor: ["How each client's or deal's status moved, review by review", "Spotting who slipped recently, and reading why", "Monthly or quarterly RAG reporting with a history"],
    avoidFor: ["Several dimensions at one moment (use ragboard)", "Numbers rather than statuses (use line or horizon)", "More than about 24 periods (roll them up)"],
  },
];

const BY_TYPE = new Map(GUIDES.map((guide) => [guide.type, guide]));

/** The guide for one view, or undefined for a view registered outside the library. */
export function chartGuide(type: string): ChartGuide | undefined {
  return BY_TYPE.get(type);
}

/** Every built-in view's guide. */
export function chartGuides(): ChartGuide[] {
  return [...GUIDES];
}

/** Views that do a job, best first: 3 (what they are for), then 2. */
export function chartsFor(purpose: Purpose): { type: string; score: number }[] {
  return GUIDES.filter((guide) => (guide.purposes[purpose] ?? 0) >= 2)
    .map((guide) => ({ type: guide.type, score: guide.purposes[purpose] ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------------------------
// The data contract.

type Kind = "number" | "category" | "date" | "boolean" | "other";
const DATE = /^\d{4}-\d{2}/;

function kindOf(value: unknown): Kind | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return DATE.test(value) ? "date" : "category";
  return "other";
}

/** Each column's kind, from the first row with a value for it. */
function columnKinds(rows: Row[]): Map<string, Kind> {
  const kinds = new Map<string, Kind>();
  const names = new Set(rows.flatMap((row) => Object.keys(row)));
  for (const name of names) {
    const kind = rows.map((row) => kindOf(row[name])).find((k) => k !== null);
    kinds.set(name, kind ?? "other");
  }
  return kinds;
}

const isField = (option: OptionSchema) => option.type === "field" || option.type === "fields";
const asList = (value: unknown): string[] => (typeof value === "string" ? [value] : Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

/** The field names a view draws, in option order, with the option that names each. */
function viewFields(view: ViewSpec): { option: string; field: string }[] {
  const { options } = getBlock("view", view.type);
  const out: { option: string; field: string }[] = [];
  for (const [name, option] of Object.entries(options)) {
    if (!isField(option)) continue;
    for (const field of asList(view[name])) out.push({ option: name, field });
  }
  // The stat row names its fields inside items.
  if (view.type === "kpis" && Array.isArray(view.items)) {
    for (const item of view.items as Record<string, unknown>[]) for (const key of ["value", "target", "compare"]) if (typeof item[key] === "string") out.push({ option: `items.${key}`, field: item[key] as string });
  }
  return out;
}

/** One column of a chart's table. */
export interface ContractColumn {
  /** The column name in this data. */
  name: string;
  /** Its label from the spec's fields, when it has one. */
  label?: string;
  /** What it holds: number, category, date, boolean. */
  kind: string;
  /** The view options that draw it, such as `x` or `value`; empty when the chart does not use it. */
  roles: string[];
  /** True when a required option draws it. */
  required: boolean;
  /** What the column does in the chart. */
  does: string;
  /** How many different values it has. */
  distinct: number;
  /** For numbers: the smallest and largest. */
  min?: number;
  max?: number;
  /** Up to three example values. */
  examples: unknown[];
}

/** The table a chart needs, against the data it has. */
export interface DataContract {
  type: string;
  grain: Grain;
  /** What one row stands for, in words. */
  rowMeans: string;
  build: string;
  rowCount: number;
  rowsRead: { min?: number; max?: number };
  /** Every option that names a field, with what it holds and whether it is required, in this view's words. */
  needs: { option: string; holds: string; many: boolean; required: boolean; description: string }[];
  /** The columns of this data, those the chart draws first. */
  columns: ContractColumn[];
  /** Problems with this data for this chart, in plain words. Empty when it fits. */
  warnings: string[];
}

const GRAIN_WORDS: Record<Grain, string> = {
  category: "One row per category, each named once.",
  period: "One row per point in time, in order.",
  observation: "One row per thing measured (a deal, a ticket, a response); the chart counts or spreads them.",
  pair: "One row per combination of two categories, such as month and product.",
  link: "One row per flow, from a source to a target.",
  leaf: "One row per leaf of the hierarchy, its levels in columns from the top down.",
  single: "One value; with more rows, the last one is the headline and the rest draw its trend.",
  any: "Any rows.",
};

/** The rows of a spec with inline data, or none. */
function inlineRows(spec: WidgetSpec): Row[] {
  return spec.data.type === "inline" && Array.isArray(spec.data.rows) ? (spec.data.rows as Row[]) : [];
}

/**
 * The table `spec`'s chart needs, column by column, against `rows` (the spec's
 * inline rows when left out): what each column holds, which option draws it,
 * and what does not fit.
 */
export function dataContract(written: WidgetSpec, rows: Row[] = inlineRows(written)): DataContract {
  // The contract reads and speaks in canonical names, noting the older ones that still work.
  const spec = readable(written);
  const { view } = spec;
  const shown = (option: string) => shownName(view.type, option);
  const block = getBlock("view", view.type);
  const guide = chartGuide(view.type);
  const kinds = columnKinds(rows);
  const drawn = viewFields(view);
  const needs = Object.entries(block.options)
    .filter(([, option]) => isField(option))
    .map(([name, option]) => ({ option: name, holds: option.kind ?? "any", many: option.type === "fields", required: option.required === true, description: option.description }))
    .sort((a, b) => Number(b.required) - Number(a.required));
  const required = new Set(needs.filter((need) => need.required).map((need) => need.option));
  // Shown under their canonical names, the older name noted once.
  for (const need of needs) {
    const older = alsoAccepts(view.type, need.option);
    if (older.length) need.description = `${need.description} Also accepts ${older.map((o) => `\`${o}\``).join(", ")}, the older name.`;
  }
  const describe = (option: string) => (option.startsWith("items.") ? `A tile's ${option.slice(6)}.` : (block.options[option]?.description ?? ""));
  const order = [...new Set([...drawn.map((d) => d.field), ...kinds.keys()])];
  const columns: ContractColumn[] = order.map((name) => {
    const legacy = drawn.filter((d) => d.field === name).map((d) => d.option);
    const roles = legacy.map(shown);
    const values = rows.map((row) => row[name]).filter((v) => v !== null && v !== undefined);
    const numbers = values.filter((v): v is number => typeof v === "number");
    return {
      name,
      ...(spec.fields?.[name]?.label ? { label: spec.fields[name].label } : {}),
      kind: kinds.get(name) ?? "missing",
      roles,
      required: legacy.some((role) => required.has(role)),
      does: legacy.length ? legacy.map(describe).join(" ") : view.type === "table" ? "A column of the table." : "Not drawn; kept for tooltips, the table view and exports.",
      distinct: new Set(values.map((v) => JSON.stringify(v))).size,
      ...(numbers.length ? { min: Math.min(...numbers), max: Math.max(...numbers) } : {}),
      examples: [...new Set(values.map((v) => JSON.stringify(v)))].slice(0, 3).map((v) => JSON.parse(v)),
    };
  });
  return {
    type: view.type,
    grain: guide?.grain ?? "any",
    rowMeans: GRAIN_WORDS[guide?.grain ?? "any"],
    build: guide?.build ?? firstSentence(block.description),
    rowCount: rows.length,
    rowsRead: guide?.rows ?? {},
    needs,
    columns,
    warnings: fitWarnings(view, rows, kinds),
  };
}

/** What does not fit: missing or wrong-kind fields, the grain, the row count, negative values. */
function fitWarnings(view: ViewSpec, rows: Row[], kinds: Map<string, Kind>): string[] {
  const warnings: string[] = [];
  const guide = chartGuide(view.type);
  const { options } = getBlock("view", view.type);
  for (const [name, option] of Object.entries(options)) {
    if (!isField(option)) continue;
    for (const field of asList(view[name])) {
      const kind = kinds.get(field);
      const said = shownName(view.type, name);
      if (!kind) warnings.push(`${said} names "${field}", which is not in the data.`);
      else if (option.kind === "number" && kind !== "number") warnings.push(`${said} needs numbers, but "${field}" holds ${kind === "date" ? "dates" : "text"}.`);
      else if (option.kind === "date" && kind === "category") warnings.push(`${said} expects dates; "${field}" is text, so its rows are drawn in the order given.`);
    }
  }
  if (!guide || !rows.length) return warnings;
  const one = (option: string) => asList(view[option])[0];
  const distinct = (field: string | undefined) => (field ? new Set(rows.map((row) => String(row[field]))).size : rows.length);
  const key = guide.grain === "period" ? one("x") ?? one("date") : guide.grain === "category" ? one("label") ?? one("x") : undefined;
  if (key && kinds.has(key) && distinct(key) < rows.length) {
    warnings.push(`"${key}" repeats (${distinct(key)} different values in ${rows.length} rows), but this chart wants one row per ${guide.grain === "period" ? "period" : "category"}: sum the rows first with an aggregate step.`);
  }
  if (guide.grain === "pair") {
    const pair = (["x", "series"] as const).map(one).filter(Boolean) as string[];
    if (view.type === "heatmap") pair.splice(0, 2, ...([one("x"), one("y")].filter(Boolean) as string[]));
    const [first, second] = pair;
    if (first && second && new Set(rows.map((row) => `${row[first]}\u0000${row[second]}`)).size < rows.length) warnings.push(`Some ${first} and ${second} pairs repeat: sum them first.`);
  }
  const { min, max } = guide.rows;
  if (guide.grain === "single" && view.type === "gauge" && rows.length > 1) warnings.push(`A gauge shows one value; it draws the first of these ${rows.length} rows.`);
  else if (min !== undefined && rows.length < min) warnings.push(`${rows.length} row${rows.length === 1 ? "" : "s"}: this chart says little with fewer than ${min}.`);
  else if (max !== undefined && rows.length > max) warnings.push(`${rows.length} rows: this chart crowds past about ${max}.`);
  if (guide.positive) {
    for (const field of [one("value"), ...asList(view.y)].filter(Boolean) as string[]) {
      if (rows.some((row) => typeof row[field] === "number" && (row[field] as number) < 0)) warnings.push(`"${field}" has negative values, which this chart cannot draw as areas.`);
    }
  }
  if (view.type === "funnel") {
    const value = one("value");
    if (value && rows.some((row, i) => i > 0 && Number(row[value]) > Number(rows[i - 1]?.[value]))) warnings.push(`"${value}" does not fall from one stage to the next, so the conversion rates read oddly.`);
  }
  return warnings;
}

// ---------------------------------------------------------------------------------------------
// Switching charts.

/** How well another chart fits the same data. */
export type Fit = "fits" | "stretch" | "no";
/**
 * What the switch does for a reader, judged on the current chart's main job:
 * `better` keeps it and adds another; `same` keeps it; `trade-off` gains a job
 * but does the main one less clearly; `different` answers another question;
 * `worse` loses ground with nothing gained.
 */
export type Verdict = "better" | "same" | "trade-off" | "different" | "worse";

/** The same data drawn as another chart. */
export interface ChartSwitch {
  from: string;
  to: string;
  fit: Fit;
  /** Undefined when it does not fit. */
  verdict?: Verdict;
  /** The view block for the new chart, filled from the same columns. Undefined when it does not fit. */
  view?: ViewSpec;
  /** Jobs the new chart does better, best gain first. */
  gains: Purpose[];
  /** The current chart's main jobs it does worse or not at all. */
  losses: Purpose[];
  /** The assessment in one or two sentences: better for what, at what cost. */
  assessment: string;
  /** What does not fit, or why it is not possible. */
  caveats: string[];
}

/** Hand-written notes on the switches people make most, where the purpose scores alone miss the point. */
const NOTES: Record<string, string> = {
  "board>funnel": "Counts per stage read as one shape, with the conversion between stages; the items themselves are gone.",
  "funnel>board": "Names every item in its stage, so you see what is where; the shape of the drop-off is less obvious.",
  "board>table": "Every field in columns, sortable and searchable; where things stand no longer reads at a glance.",
  "ragboard>table": "Every status as words in a sortable, searchable table; the worst-first scan and the counts are gone.",
  "table>ragboard": "Statuses become shapes in a grid, worst rows first, with counts per column; other fields drop out.",
  "ragboard>ragtrend": "Shows one status moving over time instead of several at once; needs a status per period.",
  "ragtrend>ragboard": "Several dimensions side by side for the latest period; the history is gone.",
  "bar>hbar": "Same comparison, but labels get a full line and the order reads as a ranking; the better default on phones and with long names.",
  "hbar>bar": "Same comparison; only better when the categories are in time order or the labels are short.",
  "bar>line": "Better when the categories are periods: the eye follows the trend instead of comparing bar tops.",
  "line>bar": "Better when each period's total matters on its own (monthly sales); worse for seeing the trend.",
  "line>area": "The fill stresses the amount, which suits volumes like cash or traffic; with crossing series, the fills hide each other.",
  "area>line": "Cleaner with several series and when the trend matters more than the amount.",
  "line>horizon": "Fits many more series in the same height; readers need a moment to learn the color bands.",
  "line>slope": "Keeps only the first and last point: the move is clearer, the path between is lost.",
  "donut>waffle": "Shares read as countable squares, so 37% looks like 37 of 100; better for a general audience.",
  "donut>hbar": "Easier to compare close shares and to rank them; the sense of one whole is weaker.",
  "donut>treemap": "Scales to many more parts; with two or three parts a donut is simpler.",
  "waffle>donut": "Adds the total in the middle; the shares are harder to count.",
  "treemap>hbar": "Easier to compare and rank, at the cost of the part-to-whole picture.",
  "treemap>sunburst": "Adds nesting when there is a second level; harder to compare tile sizes.",
  "hbar>pareto": "Adds the running total, so the few items behind most of the total stand out.",
  "pareto>hbar": "Drops the running total: simpler, but the 80/20 point is gone.",
  "hbar>list": "Names and exact values come first and sizes are gone; good for a phone or a top-five card.",
  "hbar>pyramid": "Puts the two measures back to back on one axis, so where they differ reads from the shape; only for two counts across ordered bands.",
  "pyramid>hbar": "Lays the two measures side by side in each row, which compares exact lengths better; the shape of the whole is gone.",
  "hbar>donut": "Shows the parts as one whole; only worth it with two to six parts.",
  "meter>bullet": "Denser, with qualitative bands; less plain-language than the meter's 'to go' line.",
  "bullet>meter": "Says the gap in words (€22K to go); takes more room per row.",
  "meter>rings": "More playful and compact for up to four goals; harder to compare sizes.",
  "meter>variance": "Shows the gap itself, over or under, instead of progress toward the target.",
  "variance>meter": "Shows progress toward each target instead of the size of each miss.",
  "dumbbell>slope": "Shows who swapped places more clearly; the gaps are harder to read past about ten items.",
  "slope>dumbbell": "Gaps are easier to read and it scales to more items; rank swaps are less obvious.",
  "histogram>boxplot": "Summarizes the spread in five numbers and outliers; the shape is lost.",
  "boxplot>beeswarm": "Every value is visible, which suits small samples and audiences who do not read quartiles.",
  "boxplot>ridgeline": "Shows the full shape per group, such as two peaks, that a box hides.",
  "beeswarm>histogram": "Scales to thousands of rows; individual points are gone.",
  "sankey>chord": "Only better when flows go both ways between the same groups.",
  "chord>sankey": "Reads as a left-to-right path; better when flows run one way through stages.",
  "sunburst>icicle": "Easier to read long names and compare sizes; less of a picture of the whole.",
  "icicle>sunburst": "More compact and inviting as an overview; harder to compare sizes.",
  "hbar>dot": "Far less ink and a tighter axis, so small differences show; the length from zero is gone.",
  "dot>hbar": "Amounts read as lengths from zero, which is more familiar; small differences flatten out.",
  "dumbbell>dot": "Takes three or more measures per row; the before-to-after direction is no longer drawn.",
  "dot>dumbbell": "Draws the direction and size of each change; only for exactly two values per row.",
  "pie>donut": "Puts the total in the middle; the slices read the same.",
  "donut>pie": "Fills the middle and writes each share on its slice; the total moves out of the picture.",
  "pie>hbar": "Easier to compare close shares and to rank them; the sense of one whole is weaker.",
  "hbar>pie": "Shows the parts as one whole; only worth it with two to six parts.",
  "heatmap>matrix": "Marks can carry two values at once (size and shade) or a yes/no square; a single value reads less precisely than a shaded cell.",
  "matrix>heatmap": "One value per cell as a shade, with the number inside; size and yes/no marks are gone.",
  "hbar>strips": "Counts become countable squares, colored by part; only for whole units (provisions, seats, people), not amounts.",
  "strips>hbar": "Lengths compare more precisely across rows; the sense of countable units is lost.",
  "timeline>lifecycle": "Shows every stage between start and end, each in its own tint, with a status and a thickness for impact; needs a date per stage.",
  "lifecycle>timeline": "Simpler, one bar from start to end; the stages in between are gone.",
  "whitespace>heatmap": "Shades every cell by one number, which suits amounts; the held, open and not eligible states are lost.",
  "heatmap>whitespace": "Reads each cell as held, open or not for them, with the potential summed per row; needs a state per pair, not an amount.",
  "whitespace>table": "Exact values per pair and sorting by any column; the map's shape, where the open cells cluster, is gone.",
  "history>timeline": "Draws each item as a bar from start to end on one date axis; better for plans with durations, worse for a stream of moments.",
  "timeline>history": "Reads as a story, newest first, with notes and amounts; durations are lost.",
  "history>table": "Sortable and searchable; the sense of a story in time is weaker.",
  "xray>kpis": "A row of numbers with their changes; the holdings, flags and next steps are gone.",
  "kpis>xray": "Puts one client's numbers, holdings, wallet and next steps on one card; only for one row.",
  "horizon>anomalies": "Shows the expected band and flags the days a measure stepped out of it, worst measures first; the folded color bands are gone.",
  "anomalies>horizon": "Packs more series into less height and shows the level of each; the expected band and the flags are gone.",
  "anomalies>line": "One shared scale, so levels compare across measures; with more than three measures the lines tangle and the flags are lost.",
  "funnel>hbar": "Drops the step-to-step conversion rates; only better if the stages have no order.",
  "waterfall>bar": "Shows each amount on its own but no longer how they add up from start to end.",
  "heatmap>table": "Exact numbers instead of the pattern.",
  "calendar>line": "Shows the trend across days instead of the weekday pattern.",
  "bump>line": "Shows the size of each series and the gaps; rank changes are harder to see.",
  "line>bump": "Shows rank changes clearly, but hides how big the gaps are.",
  "kpi>gauge": "Places the number on a scale against its goal; drops the change and the trend.",
  "gauge>kpi": "Adds the change against the previous period; drops the scale and goal.",
  "line>dual": "Right when the two series have different units: each gets its own panel and scale, and no false crossings.",
  "dual>line": "One panel and one axis; honest only when both series share a unit and a scale.",
  "bar>dual": "Adds a second measure in its own unit on a panel of its own, sharing the periods.",
  "dual>bar": "Keeps one measure as bars and drops the other.",
};

/** Optional options worth carrying to the new chart when it has one of the same name and kind. */
function carry(from: ViewSpec, to: ViewSpec, kinds: Map<string, Kind>): void {
  const { options } = getBlock("view", to.type);
  for (const [name, option] of Object.entries(options)) {
    if (option.required || to[name] !== undefined || from[name] === undefined) continue;
    if (name === "goodWhen") {
      to[name] = from[name];
      continue;
    }
    if (!isField(option)) continue;
    const fields = asList(from[name]);
    const fitsKind = fields.length > 0 && fields.every((field) => {
      const kind = kinds.get(field);
      return option.kind === "number" ? kind === "number" : option.kind ? kind === "category" || kind === "date" || kind === "boolean" : kind !== undefined;
    });
    if (fitsKind && (option.type === "fields" || fields.length === 1)) to[name] = option.type === "fields" ? from[name] : fields[0];
  }
}

const listWords = (purposes: Purpose[]) => {
  const words = purposes.map((p) => PURPOSES[p].toLowerCase());
  return words.length <= 1 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
};

/**
 * `spec`'s data drawn as chart `to`: the new view, filled from the columns the
 * current chart draws first, whether the data fits, and what the reader gains
 * and loses. `rows` are the spec's inline rows when left out.
 */
export function switchChart(written: WidgetSpec, to: string, rows: Row[] = inlineRows(written)): ChartSwitch {
  // Read in the renderer's names; the switched view is handed back in the canonical ones.
  const spec = readable(written);
  const from = spec.view.type;
  const base: ChartSwitch = { from, to, fit: "no", gains: [], losses: [], assessment: "", caveats: [] };
  if (!blockTypes("view").includes(to)) return { ...base, assessment: `There is no chart "${to}".`, caveats: [`Known charts: ${blockTypes("view").join(", ")}.`] };
  const kinds = columnKinds(rows);
  const prefer = viewFields(spec.view).map((d) => d.field);
  const view = normalizeView(suggestView(to, rows, prefer));
  const optionName = (option: string) => shownName(to, option);
  carry(spec.view, view, kinds);

  // Not possible: a required option with no column of its kind, or two required options sharing one column.
  const { options } = getBlock("view", to);
  const problems: string[] = [];
  const taken = new Map<string, string>();
  for (const [name, option] of Object.entries(options)) {
    if (!option.required || !isField(option)) continue;
    const fields = asList(view[name]);
    if (!fields.length) problems.push(`needs a ${option.kind ?? ""} column for ${optionName(name)}`.replace("  ", " "));
    for (const field of fields) {
      const kind = kinds.get(field);
      if (option.kind === "number" && kind !== "number") problems.push(`needs a number column for ${optionName(name)}, and there is none left`);
      else if (option.kind === "date" && kind !== "date" && REAL_DATES.has(to)) problems.push(`needs a date column for ${optionName(name)}`);
      else if ((option.kind === "category" || option.kind === "date") && kind !== "category" && kind !== "date" && kind !== "boolean") problems.push(`needs a ${option.kind === "date" ? "date or category" : "category"} column for ${optionName(name)}`);
      else if (taken.has(field) && option.type === "field") problems.push(`needs a separate column for ${optionName(name)} (it would reuse "${field}", already the ${taken.get(field)})`);
      if (option.type === "field") taken.set(field, name);
    }
  }
  // A map with no geometry to put the rows on: the data has no column of codes that sit on a basemap.
  if (MEANING[to] && options.geo && view.geo === undefined) problems.push(MEANING[to] as string);
  const issues = validateSpec({ ...spec, view }, rows);
  if (hasErrors(issues)) problems.push(...issues.filter((i) => i.level === "error").map((i) => `${i.path}: ${i.message}`));
  if (problems.length) {
    const unique = [...new Set(problems)];
    return { ...base, assessment: `Not possible with this data: it ${unique[0]}.`, caveats: unique };
  }

  const caveats = fitWarnings(view, rows, kinds);
  // Charts this data suits by its shape (the recommender's view), plus the two that suit any rows.
  const suited = suitedTo(rows, from);
  const gate = MEANING[to];
  if (gate && !suited.has(to)) return { ...base, assessment: `Not possible with this data: it ${gate}.`, caveats: [`It ${gate}.`] };

  const source = chartGuide(from);
  const target = chartGuide(to);
  const score = (guide: ChartGuide | undefined, purpose: Purpose) => guide?.purposes[purpose] ?? 0;
  const purposes = Object.keys(PURPOSES) as Purpose[];
  // The job the current chart is for: its best purposes.
  const top = Math.max(0, ...purposes.map((p) => score(source, p)));
  const main = purposes.filter((p) => top > 0 && score(source, p) === top);
  const lost = main.filter((p) => score(target, p) < 2);
  const weaker = main.filter((p) => score(target, p) >= 2 && score(target, p) < score(source, p));
  // A gain only counts when the data suits the new chart: a line gains nothing on regions.
  const gains = suited.has(to)
    ? purposes.filter((p) => score(target, p) >= 2 && score(target, p) > score(source, p)).sort((a, b) => score(target, b) - score(source, b) - (score(target, a) - score(source, a))).slice(0, 2)
    : [];
  const losses = [...lost, ...weaker];
  const verdict: Verdict = lost.length ? (gains.length ? "different" : "worse") : weaker.length ? (gains.length ? "trade-off" : "worse") : gains.length ? "better" : "same";
  const said = {
    better: `Better for ${listWords(gains)}, and still good for ${listWords(main)}.`,
    same: `Keeps the job (${listWords(main)}) with a different look.`,
    "trade-off": `Better for ${listWords(gains)}; weaker for ${listWords(weaker)}.`,
    different: `Answers a different question: better for ${listWords(gains)}, but gives up ${listWords(lost)}.`,
    worse: lost.length ? `Gives up ${listWords(lost)}, and this data gives it nothing better to do.` : `Weaker for ${listWords(weaker)}, with nothing gained for this data.`,
  }[verdict];
  const note = NOTES[`${from}>${to}`];
  return { ...base, fit: caveats.length ? "stretch" : "fits", verdict, view: canonicalView(view), gains, losses, assessment: note ? `${said} ${note}` : said, caveats };
}

const SUITED = new WeakMap<Row[], Set<string>>();
const SCALE = /agree|neutral|satisf|likely|promoter|detractor|passive/i;

/**
 * The charts these rows suit by their shape: the recommender's picks, the two
 * that suit any rows, and, for rows that are periods, the plain category charts
 * (twelve months make twelve fine bars).
 */
function suitedTo(rows: Row[], from: string): Set<string> {
  let suited = SUITED.get(rows);
  if (!suited) {
    suited = new Set(["table", "list", ...recommendCharts(rows, { limit: 99 }).map((pick) => pick.type)]);
    // Answer counts on a rating scale, which the recommender does not look for.
    if (Object.keys(rows[0] ?? {}).filter((key) => SCALE.test(key)).length >= 3) suited.add("likert");
    SUITED.set(rows, suited);
  }
  const out = new Set([...suited, from]);
  if (chartGuide(from)?.grain === "period") {
    for (const type of ["bar", "hbar"]) if (rows.length <= (chartGuide(type)?.rows.max ?? Infinity)) out.add(type);
  }
  return out;
}

/** Charts that place rows on a real calendar, so text cannot stand in for dates. */
const REAL_DATES = new Set(["calendar", "timeline"]);

/** Charts whose marks mean something only for data of one kind; they need the recommender to recognize it. */
const MEANING: Record<string, string> = {
  candlestick: "needs open, high, low and close prices per period",
  waterfall: "needs changes that add up from one total to another",
  funnel: "needs ordered stages that narrow, such as visits to sign-ups to sales",
  chord: "needs flows that go both ways between the same groups",
  sankey: "needs flows from a source to a target",
  timeline: "needs tasks with a start date",
  bump: "needs one value per series in each period, to rank",
  slope: "needs the same measure at two points in time, in two columns",
  dumbbell: "needs the same measure at two points in time, in two columns",
  likert: "needs answer counts on one ordered scale, such as disagree to agree",
  bullet: "needs a target, plan or budget column",
  meter: "needs a target, plan or budget column",
  rings: "needs a target, plan or budget column",
  variance: "needs a target, plan or budget column",
  pyramid: "needs two counts per ordered band, such as women and men per age group",
  dual: "needs two measures over the same periods, in two columns",
  choropleth: "needs a column of country or state codes that sit on a basemap",
  symbols: "needs a column of country or state codes that sit on a basemap, or coordinates",
  locator: "needs named places with region codes on a basemap, or coordinates",
  matrix: "needs one row per pair of two categories, such as topic and quarter",
  strips: "needs whole counts per row, in one or more part columns",
  lifecycle: "needs a date column per stage, in lifecycle order",
  whitespace: "needs one row per client and product with a state: held, an opportunity, or not eligible",
  xray: "needs one row: one client with its facts, holdings and share of wallet",
  history: "needs dated events with a short title each",
  anomalies: "needs readings over time per metric, with a yes/no flag or a low and high band",
  board: "needs a stage or status column with a handful of values, and a name per row",
  ragboard: "needs status columns holding R, A, G (or red, amber, green), one row per client or deal; the rag transform makes them from numbers",
  ragtrend: "needs one status (R, A, G) per entity per period",
};

const FIT_ORDER: Record<Fit, number> = { fits: 0, stretch: 1, no: 2 };
const VERDICT_ORDER: Record<Verdict, number> = { better: 0, same: 1, "trade-off": 2, different: 3, worse: 4 };

/** Every other built-in chart for `spec`'s data, those that fit and help first. */
export function switchOptions(spec: WidgetSpec, rows: Row[] = inlineRows(spec)): ChartSwitch[] {
  return blockTypes("view")
    .filter((type) => type !== spec.view.type)
    .map((type) => switchChart(spec, type, rows))
    .sort((a, b) => FIT_ORDER[a.fit] - FIT_ORDER[b.fit] || VERDICT_ORDER[a.verdict ?? "worse"] - VERDICT_ORDER[b.verdict ?? "worse"] || b.gains.length - a.gains.length || a.to.localeCompare(b.to));
}

// ---------------------------------------------------------------------------------------------
// Plain text, for people and for other models.

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Rows as CSV, columns in the order given (every column by default). */
export function rowsToCsv(rows: Row[], columns: string[] = [...new Set(rows.flatMap((row) => Object.keys(row)))]): string {
  return [columns.map(csvCell).join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\n");
}

const mdCell = (value: unknown) => (value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value)).replace(/\|/g, "\\|").replace(/\n/g, " ");

/** Rows as a Markdown table, up to `limit` rows. */
export function rowsToMarkdown(rows: Row[], columns: string[] = [...new Set(rows.flatMap((row) => Object.keys(row)))], limit = Infinity): string {
  const shown = rows.slice(0, limit);
  return [`| ${columns.map(mdCell).join(" | ")} |`, `| ${columns.map(() => "---").join(" | ")} |`, ...shown.map((row) => `| ${columns.map((column) => mdCell(row[column])).join(" | ")} |`)].join("\n");
}

/**
 * One chart's full guide as Markdown, ready to hand to another model or system:
 * what it is for and not for, the table it needs, how rows become marks, the
 * example data in full, its spec, and every switch with its assessment.
 */
export function guideMarkdown(spec: WidgetSpec, rows: Row[] = inlineRows(spec), options: { maxRows?: number } = {}): string {
  const type = spec.view.type;
  const guide = chartGuide(type);
  const contract = dataContract(spec, rows);
  const block = getBlock("view", type);
  const used = contract.columns.filter((c) => c.roles.length).map((c) => c.name);
  const columns = contract.columns.map((c) => c.name);
  const maxRows = options.maxRows ?? Infinity;
  const lines = [`# \`${type}\` chart`, "", block.description, ""];
  if (guide) {
    lines.push("## What it is for", "", ...(Object.entries(guide.purposes) as [Purpose, number][]).sort((a, b) => b[1] - a[1]).map(([p, s]) => `- ${PURPOSES[p]}: ${s === 3 ? "best" : s === 2 ? "good" : "possible"}`), "");
    lines.push("**Best for**", "", ...guide.bestFor.map((b) => `- ${b}`), "", "**Least useful for**", "", ...guide.avoidFor.map((a) => `- ${a}`), "");
  }
  lines.push("## The data it needs", "", `**One row is**: ${contract.rowMeans}`, "", `**How the chart is built**: ${contract.build}`, "");
  const { min, max } = contract.rowsRead;
  if (min !== undefined || max !== undefined) lines.push(`**Rows it reads well with**: ${min ?? 1} to ${max ?? "any number"}.`, "");
  lines.push("| Option | Holds | Required | What it does |", "| --- | --- | --- | --- |", ...contract.needs.map((n) => `| \`${n.option}\` | ${n.holds}${n.many ? " (one or more)" : ""} | ${n.required ? "yes" : ""} | ${mdCell(n.description)} |`), "");
  lines.push(`## This example's columns (${columns.length} columns, ${rows.length} rows)`, "", "| Column | Holds | Drawn as | Values |", "| --- | --- | --- | --- |");
  for (const c of contract.columns) {
    const range = c.min !== undefined ? `${c.min} to ${c.max}` : `${c.distinct} different, e.g. ${c.examples.map((e) => JSON.stringify(e)).join(", ")}`;
    lines.push(`| \`${c.name}\`${c.label ? ` (${mdCell(c.label)})` : ""} | ${c.kind} | ${c.roles.length ? c.roles.map((r) => `\`${r}\``).join(", ") : "not drawn"} | ${mdCell(range)} |`);
  }
  lines.push("");
  if (contract.warnings.length) lines.push("**Watch out**:", "", ...contract.warnings.map((w) => `- ${w}`), "");
  lines.push(`## The data drawing it now${rows.length > maxRows ? ` (first ${maxRows} of ${rows.length} rows)` : ""}`, "", rowsToMarkdown(rows, [...used, ...columns.filter((c) => !used.includes(c))], maxRows), "");
  lines.push("As CSV:", "", "```csv", rowsToCsv(rows.slice(0, maxRows), columns), "```", "");
  lines.push("## The spec", "", "Replace `data.rows` with your rows, keeping the column names the view names (or change the view's options to your names).", "", "```json", JSON.stringify({ ...canonicalSpec(spec), data: { type: "inline", rows: rows.slice(0, Math.min(maxRows, 3)) } }, null, 2), "```", "");
  const switches = switchOptions(spec, rows);
  const ok = switches.filter((s) => s.fit !== "no");
  lines.push("## The same data as another chart", "", "| Chart | Fit | Verdict | Assessment | View |", "| --- | --- | --- | --- | --- |");
  for (const s of ok) lines.push(`| \`${s.to}\` | ${s.fit}${s.caveats.length ? `: ${mdCell(s.caveats.join(" "))}` : ""} | ${s.verdict} | ${mdCell(s.assessment)} | \`${mdCell(JSON.stringify(s.view))}\` |`);
  const no = switches.filter((s) => s.fit === "no");
  if (no.length) lines.push("", `Not possible with this data: ${no.map((s) => `\`${s.to}\` (${s.caveats[0]})`).join("; ")}.`);
  lines.push("");
  return lines.join("\n");
}
