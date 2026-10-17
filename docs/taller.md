# The Taller

elBulli's creative method, applied to charts. *Crear es no copiar*: to create is not to copy.

Ferran Adrià's kitchen invented by method rather than by luck: an audit of what a dish is made of, then a systematic variation of its techniques, tools, temperatures, textures and plating, always guarded by taste. The Taller does the same with a widget. The dish is a spec. Its ingredients are the fields of the rows it draws, and they are never altered or invented. `createVariants` cooks a menu of new versions from them, scores each on five tastes, and keeps only the balanced, valid and new ones.

The demo has its own page, `taller.html`, linked from the gallery header: pick a chart, steer temperature and texture, choose methods, then Create or Surprise.

## Two vocabularies

The kitchen words belong to the creating side only: the methods, the temperature and texture controls, the motto and the Diccionario. Once charts are on the page as results, everything is said in chart words a ten-year-old can follow:

| On the creating side | On a result |
| --- | --- |
| Salty, acid, bitter, fatty, umami | Emphasis, surprise, honesty, ink, insight (`TASTE_MEANINGS`) |
| The menu line ("Spherified revenue by region: lollipops, hot on cold, crunchy, on the house plate") | A plain title ("Revenue by region as lollipops: each dot is one region") and how to read it ("A dot further right means more revenue.") |
| Spherification, tweezers, hot, crunchy, white plate | Dots, shows one standout, warm colors, sharp marks, light card (`plainTags`) |

## The equivalents

The full list is `DICTIONARY` (shown on the page as the Diccionario). In short:

| Kitchen | Chart |
| --- | --- |
| Products (ingredients) | The fields in the rows: measures, categories, time, hierarchy levels. Never altered or invented. |
| Deconstruction | Take a whole apart: small multiples, a waffle, an icicle, horizon rows. |
| Spherification | Values become dots: lollipops, a beeswarm, a scatter, dumbbells. |
| Foam | Light, airy washes: a smooth area, a streamgraph. |
| Reduction | Concentrate: a Pareto, boxes and whiskers, the top five. |
| Infusion | A headline or a reference line soaked into a chart. |
| Tweezers, squeeze bottle, knife, spoon | Precise labels and highlights; fine 2px lines and stems; bars, bins and cells; fills. |
| Soups and sauces | Washes, streams, bands, heat cells. A plate takes at most one. |
| Hot, cold, hot on cold | Warm hues, cool hues, one item lit in a warm color with the rest grey. Built from the palette library, checked for colorblind readers. |
| Soft, crunchy | Smooth curves and washes; bars, steps, dots, compact spacing. |
| Plating | The preset: paper is the white plate, airy the empty plate, glass the cold plate, default the house plate. A headline is the first bite. |

## The five tastes

Each variant is scored from 0 to 1 on:

- **Salty, emphasis**: a headline, a highlight, bold values. Too salty and everything shouts.
- **Acid, surprise**: an unexpected but fitting form, or a precise annotation.
- **Bitter, honesty**: negatives, variance, missed targets, uncertainty.
- **Fatty, ink**: fills, stacks, many marks. It carries flavor and gets heavy fast.
- **Umami, insight**: comparison, reference, forecast, the story that completes the chart.

A plate is balanced when no taste dominates, none is missing, and there is at most one sauce. `balanceOf` explains it in one line ("balanced: mostly insight and emphasis", "too much ink: two filled layers").

## Hygiene

Every variant served:

- keeps the data, the transforms and the fields of the dish (a reduction may add a sort and a limit, and says so);
- passes `validateSpec` with no errors and actually renders (a test draws every variant of every widget);
- brings a colorblind-safe palette when it brings its own (`checkPalette`);
- is new: never the original's shape, never another variant's shape, and in the dish's own view it needs a new technique (mark, curve, stacking) or two new elements. Taking garnish away is not creating.

## Methods

`association` (bars with their target line, a headline over a chart), `adaptation` (a classic in a new form), `deconstruction`, `minimalism` (lollipops, one number with its sparkline, a list), `change-of-state` (chart to table, time to distribution), `technique-concept` (spherification, foam, reduction, infusion as the idea), `sensory` (a dial, a flowing stream, always keyboard friendly and calm under reduced motion).

## API

```ts
import { createVariants, rankVariants, runPipeline } from "fft-widgets";

const rows = await runPipeline(spec);
const menu = createVariants(spec, rows, {
  count: 6,           // at most; simple dishes may give fewer
  seed: 1,            // the same dish and seed give the same menu
  temperature: 0.5,   // -1 cold to 1 hot
  texture: -0.5,      // -1 soft to 1 crunchy
  methods: ["deconstruction", "minimalism"], // default: all
});
const best = rankVariants(menu, "both"); // or "novelty", "meaning"
```

Each variant is plain JSON, ready to be saved as a collection:

| Field | What it holds |
| --- | --- |
| `spec` | The new widget spec, with its own id (so its own ghost ref). |
| `title`, `explain` | The chart in plain words, and how to read it. From `explainVariant`, one small function a general explainer can replace. |
| `menu` | The kitchen's description, for the creating side. |
| `method`, `lineage` | The method, technique, tools, temperature, texture and plating that made it. `plainTags(variant)` says them in chart words. |
| `tastes`, `balance` | The five scores and the one-line balance note. |
| `novelty` | How far the form departs from the source, 0 to 1 (another family of view, a new technique, rare forms). |
| `meaning` | How much the plate says, 0 to 1 (balance, insight, honesty, evenness). |
| `seed` | The seed that cooked it. |

Also exported: `profileDish`, `tasteOf`, `balanceOf`, `saucesOf`, `noveltyOf`, `meaningOf`, `temperaturePalette`, `DICTIONARY`, `METHODS`, `TASTE_MEANINGS`.

The MCP server offers the same kitchen as `fft_create_variants` (read-only): agents get the menu and can save a variant with `fft_create_widget`.
