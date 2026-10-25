/**
 * French and German reading guides and questions, as their own script for pages on the lite bundle.
 *
 * Built to `dist/martcharts-reading.iife.js` by `npm run build:lib`. Load it after `martcharts-lite.iife.js` on a French
 * or German page and every chart's "How to read it" and question read in that language, as in the full build:
 *
 * ```html
 * <script src="martcharts-lite.iife.js"></script>
 * <script src="martcharts-reading.iife.js"></script>
 * ```
 *
 * It registers itself on load (see src/core/reading.ts); there is nothing to call.
 *
 * @module
 */
import "./core/explain-words.ts";
