# Accessibility

FFT widgets are built to meet the European Accessibility Act. The Act applies through the harmonised standard **EN 301 549 v3.2.1**, whose clause 9 (web content) requires **WCAG 2.1 level AA**. This page states what conforms, how each success criterion is met, the known limitations, and how to test it.

## Conformance statement

- **Standard:** EN 301 549 v3.2.1, clause 9, which is WCAG 2.1 level AA. These WCAG 2.2 level AA criteria are met too: 2.4.11 Focus Not Obscured (Minimum), 2.5.7 Dragging Movements and 2.5.8 Target Size (Minimum).
- **Status:** conforms, for the scope below, as of 17 October 2026.
- **Scope:** all 40 built-in views, the widget card (title, subtitle, headline, toolbar actions, footer, ghost ref, tooltip, expanded view), and dashboards (period control, filters, section filter, pinned filter row). It covers both themes (light and dark) and every style preset (default, glass, airy, paper), from phone width (320 CSS px) up.
- **Method:**
  - Automated checks with axe-core against the WCAG 2.0, 2.1 and 2.2 A and AA rules: every stored widget in jsdom, and the whole demo page in Chrome with real layout, in both themes, every preset and at 320 px. No violations.
  - Contrast computed from the theme tokens in every theme and preset.
  - Manual keyboard, zoom, reflow, text spacing and reduced motion checks.
- **Not covered:** content you supply. Custom colors (`style.palette` lists, `style.tokens`, your own presets), your own views registered with `registerView`, and the page around the widgets are the author's to check. The tools below help.

## How each success criterion is met

| Success criterion | How it is met | Where |
| --- | --- | --- |
| 1.1.1 Non-text content | Every chart is an SVG group named after what it shows ("Bar chart of Revenue by Region"). Each mark a pointer can inspect has a text label with its values. Decorative parts are hidden from assistive technology. | `src/dom/views/*.ts` |
| 1.2.1 to 1.2.5 Time-based media | Not applicable: widgets have no audio or video. | |
| 1.3.1 Info and relationships | Every chart keeps its data as a table for screen readers: the chart's own rows, a grid (heatmap), the days (calendar) or a summary per group (ridgeline). Meters, bullets and funnels are lists. Tables use header cells, and sortable columns announce their sort with `aria-sort`. | `buildTable`, `hiddenTable` in `src/dom/views/shared.ts` |
| 1.3.2 Meaningful sequence | The reading and focus order follows the card from top to bottom: title, toolbar, headline, chart, footer, ghost ref. | `src/dom/widget.ts` |
| 1.3.3 Sensory characteristics | Instructions never rely on shape, color or position alone. The horizon key says "rising" and "hanging" as well as showing the shades. | `src/dom/views/horizon.ts` |
| 1.3.4 Orientation | No orientation lock; layouts adapt from 320 px to wide screens. | `src/dom/styles.ts` |
| 1.3.5 Identify input purpose | Not applicable: widgets collect no personal data. | |
| 1.4.1 Use of color | Color is never the only signal: <ul><li>legends name each series, and lines carry direct labels</li><li>deltas have arrows and signs</li><li>heat cells show their values</li><li>up candles are hollow and down candles filled</li><li>the horizon draws above the baseline rising from each row's foot and below it hanging from the top</li><li>forecasts are dashed with a "Forecast" label</li><li>the chosen period has an accent bar and the chosen section is semibold</li></ul> | views, `src/dom/styles.ts` |
| 1.4.2 Audio control | Not applicable. | |
| 1.4.3 Contrast (minimum) | All text is at least 4.5:1 on its background in both themes and every preset: body, secondary and muted text, the accent, positive, negative and warning, badge text on its tint, and heat-cell values on their shade. This is computed from the tokens, and axe verifies it in a real browser. | `src/dom/contrast.test.ts` |
| 1.4.4 Resize text | Text scales with browser zoom to 200% without loss of content; charts redraw to the new width. | |
| 1.4.5 Images of text | None. The PNG export is a file the user asks for, not content. | |
| 1.4.10 Reflow | At 320 CSS px no page or card scrolls sideways. Charts and wide tables, which need two dimensions, scroll inside their own frame. | `src/dom/styles.ts` (mobile rules) |
| 1.4.11 Non-text contrast | <ul><li>Every series color of the default palette and of each preset reaches 3:1 on the card. The light steps of three house colors were deepened for this.</li><li>The accent used for focus rings reaches 3:1, and the chosen period's accent bar does too.</li><li>Gridlines and axis lines are supplementary, since every value is also in the tooltip, the tick labels and the data table.</li></ul> | `src/dom/contrast.test.ts` |
| 1.4.12 Text spacing | With line height 1.5, letter spacing 0.12em, word spacing 0.16em and paragraph spacing 2em forced on, nothing clips or overflows (checked at 320 px). | |
| 1.4.13 Content on hover or focus | Tooltips can be dismissed with Escape without moving focus or the pointer. Escape stops there, so the expanded view behind stays open. A tooltip stays while hovered (the mouse gets a short grace to reach it) and while its mark has focus. It never times out. | `createTooltip` in `src/dom/widget.ts` |
| 2.1.1 Keyboard | Every mark a pointer can inspect is reachable with the keyboard. Each chart is one Tab stop, and the arrow keys move between its marks (roving focus), showing the same tooltip as hover. Enter or Space selects. Controls are native buttons and selects. | `src/dom/views/focus.ts` |
| 2.1.2 No keyboard trap | Focus leaves every chart with Tab. The expanded view keeps focus inside while open, closes with Escape, and returns focus to the button that opened it. | `src/dom/widget.ts` |
| 2.1.4 Character key shortcuts | None are added. | |
| 2.2.1, 2.2.2 Timing, pause | No time limits. The only motion is a one-time entrance shorter than 5 seconds, and none at all with reduced motion. | |
| 2.3.1 Three flashes | Nothing flashes. | |
| 2.4.1 Bypass blocks | Dashboards offer a section filter that shows one section at a time. Headings are not used inside widgets, so a page's own landmarks and headings stay in charge. | `src/dom/dashboard.ts` |
| 2.4.2 Page titled | The host page's responsibility. | |
| 2.4.3 Focus order | Within a card, focus goes toolbar, chart, ghost ref. Across a dashboard it goes period, filters, sections, then the cards in grid order. | `src/dom/widget.ts` |
| 2.4.4 Link purpose | Widgets contain no links. | |
| 2.4.5 Multiple ways | The host page's responsibility. | |
| 2.4.6 Headings and labels | Every control has a visible or programmatic label: "Period", the filter labels, "Sections", and each toolbar action's name. | |
| 2.4.7 Focus visible | Every focusable element has a `:focus-visible` style: a ring in the accent, or an accent tint for chart marks. | `src/dom/a11y.test.ts` |
| 2.4.11 Focus not obscured (2.2) | Under a pinned filter row, the page scroll-pads by the row's measured height, so whatever takes focus is scrolled clear of it. | `src/dom/dashboard.ts`, `src/dom/styles.ts` |
| 2.5.1 Pointer gestures | No path or multipoint gestures are needed. The expanded view's swipe to step has next and previous buttons too. | |
| 2.5.2 Pointer cancellation | Actions run on click (up event), not on press. | |
| 2.5.3 Label in name | Visible labels are part of each accessible name. | |
| 2.5.4 Motion actuation | None. | |
| 2.5.7 Dragging movements (2.2) | Nothing needs dragging. | |
| 2.5.8 Target size (2.2) | Toolbar buttons, period buttons and section chips are at least 24 by 24 px. The ghost ref, table sort buttons and horizontal bar rows are shorter but meet the spacing exception (no other target within 24 px), as axe checks. | |
| 3.1.1 Language of page | The host page's responsibility. | |
| 3.1.2 Language of parts | Each widget sets `lang` from its spec's `locale`, so numbers, dates and labels are read in the right language. | `src/dom/widget.ts` |
| 3.2.1, 3.2.2 On focus, on input | Focus never changes context. Choosing a filter, period or section redraws the board in place and moves nothing. | |
| 3.2.3, 3.2.4 Consistent navigation and identification | Every widget uses the same toolbar, icons and labels. | |
| 3.3.1 to 3.3.4 Input assistance | Not applicable to the widgets (no forms). The demo's spec editor reports errors in text with their path. | |
| 4.1.1 Parsing | Obsolete in WCAG 2.2; the DOM is built with `createElement`, so markup is always well formed. | |
| 4.1.2 Name, role, value | <ul><li>Toggle groups are `role="group"` with a label, and each button carries `aria-pressed`.</li><li>Meters use `role="meter"` with their values.</li><li>The expanded view is a labelled modal dialog.</li><li>The ghost ref is a button named "Copy widget ref W-XXXX".</li></ul> | |
| 4.1.3 Status messages | Loading, empty and error states are announced politely (`role="status"`), and a redrawing card is `aria-busy`. | `src/dom/widget.ts` |

## Known limitations

- **Hover emphasis.** While one mark is pointed at, the others step back to a lower opacity, so their contrast drops for that moment. This is emphasis the user asks for and it ends when the pointer moves on. The tooltip and data table carry every value.
- **Truncated labels.** Very long category names in horizontal bars are cut with an ellipsis to keep rows aligned. The full name is in the row's accessible name and tooltip.
- **Library palettes.** Acclaimed palettes such as Tableau 10 or Observable 10 keep their published colors, and some of those colors are under 3:1 on a white card. The palette picker shows each palette's contrast check. When it warns, keep direct labels or the table visible, or pick a palette that passes. The default palette passes in both themes.
- **Custom styling.** Colors set through `style.palette`, `style.tokens` or a custom preset are not checked automatically at runtime. Run `checkPalette` from `fft-widgets` (or the `fft_check_palette` MCP tool) on them.

## How to test

```bash
npx vitest run src/dom/a11y.test.ts src/dom/contrast.test.ts
```

- `src/dom/a11y.test.ts` renders every widget in `widgets/` and a dashboard, runs axe-core with the WCAG A and AA rules, and checks:
  - language, chart names, data tables, keyboard reach and focus styles for each widget
  - tooltip dismissal and hovering (1.4.13)
  - focus order and focus not obscured
  - the non-color cues
- `src/dom/contrast.test.ts` computes every text and mark color against its background in both themes and every preset.

In a real browser, where layout makes contrast and target size measurable, load axe-core from the dev server and run it over the page:

```js
await import("/node_modules/axe-core/axe.min.js");
const result = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
result.violations; // expect []
```

Repeat with each theme and preset, at 320 px wide, and with a text spacing bookmarklet. Then tab through a dashboard without a mouse, and press Escape on a tooltip.
