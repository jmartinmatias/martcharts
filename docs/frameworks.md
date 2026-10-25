# Using widgets in any project

A widget is one spec object and one element. Every recipe below does the same three things: load the library once, give it an element and a spec, and destroy the widget when the element goes away. Pick a chart and its data shape from the [chart catalog](catalog.md).

## Getting it into a project

The package is not on npm. Two ways in:

- **Copy one file.** Run `npm run build:lib` here and copy `dist/martcharts.iife.js` (or `dist/martcharts.js`) into the other project's static files. Nothing else is needed.
- **Install from GitHub.** `npm install git+https://github.com/jmartinmatias/martcharts.git` (add `#<branch>` for a branch). npm builds `dist/` on install through the `prepare` script, then `import "martcharts/standalone"` works, types included. The repository is private, so the machine needs GitHub access.

`npm run build:lib` writes:

| File | Use it from |
| --- | --- |
| `dist/martcharts.iife.js` | A plain `<script>` tag. Puts the API on `window.MartCharts`. |
| `dist/martcharts.js` | `import` in a bundler or a `<script type="module">`. Also `martcharts/standalone`. |
| `dist/types/` | TypeScript, through `martcharts/standalone`. |

Both files register `<fft-widget>` on load and have no dependencies. In a project that compiles TypeScript itself, `import ... from "martcharts"` uses the source instead; that path needs `defineWidgetElement()` for the tag.

## Which bundle

| File | For | Size (gzipped) |
| --- | --- | --- |
| `dist/martcharts-lite.iife.js` (`.js` as a module, `martcharts/lite`) | Pages that show charts and dashboards: `<fft-widget>`, `createWidget`, `createDashboard`, embeds, export, every view, the reading guides in English | about 207 KB |
| `dist/martcharts.iife.js` (`.js` as a module, `martcharts/standalone`) | Pages where people make charts: the editor, the composer, the Taller, the palette picker, the chart guide, and reading guides in French and German | about 292 KB |
| `dist/martcharts-reading.iife.js` | Beside the lite bundle on a French or German page: brings the reading guides and questions in those languages | about 77 KB |

The lite bundle reads its explanations in English: load `martcharts-reading.iife.js` after it and they read in the card's own language, as in the full build. Every other word on a chart (keys, tooltips, buttons) is already in English, French and German in both bundles.

```html
<script src="martcharts-lite.iife.js"></script>
<script src="martcharts-reading.iife.js"></script> <!-- only on French or German pages -->
<fft-widget src="/widgets/revenue-by-region.json"></fft-widget>
```

## Plain HTML

```html
<script src="martcharts.iife.js"></script>

<!-- Quickest: a data file and nothing else. The chart is picked from the data's shape. -->
<fft-widget data="/exports/sales.csv" heading="Sales"></fft-widget>
<fft-widget data="/api/orders" path="data.items" chart="line"></fft-widget>

<fft-widget src="/specs/revenue.json" actions="csv image explain"></fft-widget>

<fft-widget>
  <script type="application/json">
    { "data": { "type": "url", "url": "/api/signups" },
      "view": { "type": "line", "x": "day", "y": "signups" } }
  </script>
</fft-widget>
```

A `url` source fetches JSON from your API. Use `"path": "data.items"` when the rows sit inside the response. For spreadsheet and BI exports, `{ "type": "csv", "url": "/exports/sales.csv" }` reads CSV with the first row as field names (or `"text"` for CSV written into the spec).

## Plain JavaScript

```js
import { createWidget } from "martcharts/standalone";

const widget = createWidget(document.querySelector("#chart"), {
  data: { type: "fn", load: () => fetch("/api/orders").then((r) => r.json()) },
  view: { type: "bar", x: "month", y: "orders" },
});

await widget.refresh();                          // reload the data
await widget.update({ view: { type: "line" } }); // change part of the spec
widget.destroy();                                // when done
```

## React

The tag works in JSX. Pass the spec as a property, since React 19 sets properties on custom elements:

```tsx
import "martcharts/standalone";
import type { WidgetSpec } from "martcharts/standalone";

export function Chart({ spec }: { spec: WidgetSpec }) {
  return <fft-widget spec={spec} actions="csv image" />;
}
```

For React 18, or to keep a handle on the widget, use a ref:

```tsx
import { useEffect, useRef } from "react";
import { createWidget } from "martcharts/standalone";
import type { Widget, WidgetSpec } from "martcharts/standalone";

export function Chart({ spec }: { spec: WidgetSpec }) {
  const host = useRef<HTMLDivElement>(null);
  const widget = useRef<Widget | undefined>(undefined);
  useEffect(() => {
    widget.current = createWidget(host.current!, spec);
    return () => widget.current?.destroy();
  }, []);
  useEffect(() => void widget.current?.setSpec(spec), [spec]);
  return <div ref={host} />;
}
```

With TypeScript and React 19, declare the tag once so JSX knows it:

```ts
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "fft-widget": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { spec?: unknown; src?: string; actions?: string };
    }
  }
}
```

## Vue

Tell Vue the tag is a custom element (`compilerOptions.isCustomElement: (tag) => tag === "fft-widget"` in the Vue plugin options), then bind the spec as a property with `.prop`:

```vue
<script setup lang="ts">
import "martcharts/standalone";
import type { WidgetSpec } from "martcharts/standalone";
defineProps<{ spec: WidgetSpec }>();
</script>

<template>
  <fft-widget :spec.prop="spec" actions="csv image" />
</template>
```

## Svelte

```svelte
<script lang="ts">
  import "martcharts/standalone";
  import type { WidgetSpec } from "martcharts/standalone";
  export let spec: WidgetSpec;
</script>

<fft-widget {spec} actions="csv image" />
```

Svelte sets `spec` as a property because the element defines it.

## Server rendering (Next, Nuxt, SvelteKit, Astro)

Importing the bundle on the server is safe: it registers the tag only where `customElements` exists. Widgets draw in the browser, so render the tag on the server and let it upgrade on load. In Next.js, put the component in a `"use client"` file. On the server itself, `martcharts/core` validates specs and runs pipelines with no DOM:

```ts
import { runPipeline, validateSpec } from "martcharts/core";
const rows = await runPipeline(spec);
const issues = validateSpec(spec, rows);
```

## Events

Every widget fires `fft-select` (bubbling) when the viewer picks a row, bar, point or cell. `event.detail` is `{ row, spec }`:

```js
document.addEventListener("fft-select", (event) => openDetails(event.detail.row));
```

## Styling

Widgets follow the page's light or dark scheme (`style.theme`: `"auto"`, `"light"` or `"dark"`). Per widget, set `style.preset`, `style.palette` or `style.tokens` in the spec. For every widget at once, set the CSS custom properties from page CSS: `.fft-widget { --fft-accent: #0a7d5a; --fft-radius: 4px; }`. [api.md](api.md#styling) lists them all.

## Agents

Point an MCP client at `node src/mcp/main.ts` ([mcp.md](mcp.md)). `fft_describe_chart` gives an agent the same catalog as this page, with starter specs it can adapt, check with `fft_validate_spec`, and save with `fft_create_widget`. Saved widgets are JSON files any of the recipes above can load with `src`.
