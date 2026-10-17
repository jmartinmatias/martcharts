# The Taller

elBulli's creative method, abstracted and applied to sales charts. *Crear es no copiar*: to create is not to copy.

Ferran Adrià's workshop invented by method rather than by luck. The Taller does not translate that craft word for word into charts. It takes the method one level up, to principles that hold in any field, and then applies them to sales data:

1. **The method, without its craft.** Know what exists before creating. Keep the essence and change the form. Change the context. Set opposites against each other. Play with what people expect. Strip to the essential. Combine what does not usually meet. Judge every result twice: is it new, is it good.
2. **The method, deployed in sales.** The essence of a chart is the **sales question** it answers about its own numbers: "Which region has the most revenue?", "Is revenue on target, month by month?". Seven **sales moves** give that question a new form. Every version keeps the numbers, says which question it answers, and is scored on five **qualities**.

The demo has its own page, `taller.html`, linked from the gallery header: pick a starting chart, say who reads it, choose sales moves, steer color and marks, then Create or Surprise. The page ends with the method itself (`PRINCIPLES`): each principle and what the Taller does with it.

## The sales question

`questionOf(spec, rows?)` words the question any chart answers, from its own field names. Its `kind` is one of rank, target, trend, forecast, mix, compare, change, spread, relation, flow, rhythm, profile, number, detail, opinion or schedule.

| Chart | Question |
| --- | --- |
| Bars of revenue by region | Which region has the most revenue? |
| Bars of revenue with a target line, by month | Is revenue on target, month by month? |
| Variance of actual against budget | Which department is above or below budget? |
| The same variance of costs, with `goodWhen: "down"` (lower is better) | Which departments stayed within budget? |
| A donut of revenue by segment | What share of revenue comes from each segment? |
| Dumbbells from Q3 2025 to Q3 2026 | How did each region change from Q3 2025 to Q3 2026? |
| A histogram of deal value | How spread out is deal value? |
| A funnel of people | Where do people drop out, step by step? |
| A calendar of orders | Which days have the most orders? |

## The seven sales moves

| Move | What it does to the question | The principle it comes from |
| --- | --- | --- |
| Decompose | Split the total into its parts: regions, products, segments, or one small chart each. | Take the whole apart, keep it recognisable |
| Reframe | Measure the number against something else: a target, the average, the last period, its share. | Change the context |
| Distill | Keep only what decides: the top few, the few that make most of the total, one number and its trend. | Strip to the essential |
| Contrast | Set two states against each other: before and after, plan and actual, one standout against the rest. | Opposites sharpen each other |
| Reveal | Show what the total hides: the spread behind an average, the outliers, the busiest days and hours. | Play with what people expect |
| Combine | Join two views that rarely meet: bars with their target line, a headline number over a chart. | Combine what does not usually meet |
| Reform | Ask the same question in a shape the dashboard has not used yet. | One new form opens a family |

## Who reads it

A chart serves a moment. `audience` leans the Taller on the moves that serve it:

| Audience | The moment | Moves |
| --- | --- | --- |
| `rep` | A quick look between calls: one clear answer, the standout first. | distill, contrast, combine |
| `manager` | The weekly pipeline review: who is ahead, who is behind target, and why. | reframe, contrast, decompose, reveal |
| `leadership` | The quarterly business review: the big picture, the mix, and where it is heading. | reframe, decompose, distill, reform |

## The five qualities

Each version is scored from 0 to 1 on:

- **Emphasis**: a headline, a highlight, bold values. Too much and everything shouts.
- **Surprise**: an unexpected but fitting form, or a precise annotation.
- **Honesty**: negatives, variance, missed targets, uncertainty.
- **Detail**: fills, stacks, many marks. Useful, and heavy fast.
- **Insight**: comparison, reference, forecast, the story that completes the chart.

A chart is balanced when no quality dominates, none it needs is missing, and it carries at most one filled layer. `balanceOf` says it in one line ("balanced: mostly insight and emphasis", "too much detail: two filled layers").

## Hygiene

Every version:

- keeps the data, the transforms and the fields of the original (distilling to the top five may add a sort and a limit, and says so);
- passes `validateSpec` with no errors and actually renders (a test draws every version of every widget);
- slices, stacks or totals only numbers that add up: never a donut, tiles, a Pareto, stacked shares or a summed headline of an average, a median, a rate, a percent, a score, a price or a wait time, nor of a scorecard whose rows are different KPIs (`profileData(...).whole`);
- keeps the target the original draws: bars and lollipops carry its dashed target line and which side of it is good news (`goodWhen`), so they still ask "Which teams meet the 1 hour target?" and mark the ones that miss it. Lines and filled lines of the first measure keep the dashed line too (stacked layers, streams, shares and horizon rows do not). Bars against a target field, one number with its target and the tile that carries it keep which side is good news, so costs against a budget still read "stayed within the budget"; bullet bars tick a bar that reaches its target, so they are never made where lower is better. Sideways bars cannot draw the line, and a chart without a target, or without `goodWhen`, never gains one (`profileData(...).targetLine`, `profileData(...).goodWhen`);
- reads a target field only against the measure it belongs to: the one the chart already pairs it with (its target line, its target, the tile that carries it), or else one in the same unit and of a similar size. A revenue target the chart never shows is no target for churn or for a count of customers (`profileData(...).target`);
- draws a clock dial only for labels that come round again: hours of the day, days of the week, months of one year. Never teams or regions, and never dates that run past one full turn, such as 18 months (`profileData(...).cycles`);
- brings a colorblind-safe palette when it brings its own (`checkPalette`);
- is new: never the original's shape, never another version's shape, and in the original's own view it needs a new form (mark, curve, stacking) or two new elements. Taking extras away is not creating.

## API

```ts
import { createVariants, questionOf, rankVariants, runPipeline } from "fft-widgets";

const rows = await runPipeline(spec);
questionOf(spec, rows).text; // "Which region has the most revenue?"
const versions = createVariants(spec, rows, {
  count: 6,                       // at most; simple charts may give fewer
  seed: 1,                        // the same chart and seed give the same versions
  moves: ["reframe", "contrast"], // default: all seven
  audience: "manager",            // default: no lean
  color: 0.5,                     // -1 calm (cool hues) to 1 bold (warm hues, one standout)
  marks: -0.5,                    // -1 smooth to 1 sharp
});
const best = rankVariants(versions, "both"); // or "novelty", "meaning"
```

Each version is plain JSON, ready to be saved as a collection:

| Field | What it holds |
| --- | --- |
| `spec` | The new widget spec, with its own id (so its own ghost ref). |
| `question` | The sales question it answers, in plain words. |
| `move` | The sales move that made it. |
| `title`, `explain` | The chart in plain words, and how to read it. From `explainVariant`, one small function a general explainer can replace. |
| `lineage` | The move, the question's kind, the form, the color emphasis, the marks and the look. `plainTags(variant)` says them in plain words. |
| `qualities`, `balance` | The five scores and the one-line balance note. |
| `novelty` | How far the form departs from the original, 0 to 1 (another family of view, new elements, rare forms). |
| `meaning` | How much the chart says, 0 to 1 (balance, insight, honesty, evenness). |
| `seed` | The seed that made it. |

Also exported: `MOVES`, `PRINCIPLES`, `AUDIENCES`, `QUALITIES`, `profileData`, `qualitiesOf`, `balanceOf`, `fillsOf`, `noveltyOf`, `meaningOf`, `huePalette`.

The MCP server offers the same engine as `fft_create_variants` (read-only, with `moves` and `audience`): agents get the original's question and the versions, and can save one with `fft_create_widget`.
