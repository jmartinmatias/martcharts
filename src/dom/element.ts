/**
 * `<fft-widget>`: the widget as an HTML tag, for pages that do not want to write JavaScript.
 *
 * ```html
 * <fft-widget src="/widgets/revenue-by-region.json" actions="csv image copy"></fft-widget>
 * <fft-widget spec='{"data":{"type":"inline","rows":[{"a":1}]},"view":{"type":"table"}}'></fft-widget>
 * <fft-widget>
 *   <script type="application/json">{"data":{"type":"inline","rows":[{"a":1}]},"view":{"type":"table"}}</script>
 * </fft-widget>
 * ```
 *
 * @module
 */
import type { WidgetSpec } from "../core/types.ts";
import { createWidget } from "./widget.ts";
import type { Widget } from "./widget.ts";
import type { WidgetAction } from "./export.ts";

/** The `<fft-widget>` element. */
export interface FftWidgetElement extends HTMLElement {
  /** The spec to draw. Setting it redraws; also settable through the `spec` (JSON) or `src` (URL) attributes, or an inline `<script type="application/json">` child. */
  spec: WidgetSpec | undefined;
  /** The live widget, once the element is in the page and has a spec. */
  readonly widget: Widget | undefined;
}

/**
 * Registers the `<fft-widget>` tag (or your own tag name). Safe to call more than once.
 * Browser only: Node has no custom elements.
 */
export function defineWidgetElement(tag = "fft-widget"): void {
  if (customElements.get(tag)) return;

  class Element extends HTMLElement implements FftWidgetElement {
    static observedAttributes = ["spec", "src"];
    #spec: WidgetSpec | undefined;
    #widget: Widget | undefined;
    #srcRequest = 0;

    get spec() {
      return this.#spec;
    }

    set spec(value: WidgetSpec | undefined) {
      this.#spec = value;
      this.#draw();
    }

    get widget() {
      return this.#widget;
    }

    connectedCallback() {
      if (!this.#spec && !this.hasAttribute("spec") && !this.hasAttribute("src")) this.#readInline();
      this.#draw();
    }

    // A spec written inside the tag. While the page is still parsing, the child may not exist yet.
    #readInline() {
      const script = this.querySelector(':scope > script[type="application/json"]');
      if (!script) {
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => this.#spec || this.#readInline(), { once: true });
        return;
      }
      try {
        this.spec = JSON.parse(script.textContent ?? "") as WidgetSpec;
      } catch (caught) {
        this.#problem(`The inline spec is not valid JSON: ${caught instanceof Error ? caught.message : String(caught)}`);
      }
    }

    disconnectedCallback() {
      this.#widget?.destroy();
      this.#widget = undefined;
    }

    attributeChangedCallback(name: string, _old: string | null, value: string | null) {
      if (value === null) return;
      if (name === "spec") {
        try {
          this.spec = JSON.parse(value) as WidgetSpec;
        } catch (caught) {
          this.#problem(`The spec attribute is not valid JSON: ${caught instanceof Error ? caught.message : String(caught)}`);
        }
      } else if (name === "src") {
        void this.#load(value);
      }
    }

    async #load(src: string) {
      const request = ++this.#srcRequest;
      try {
        const response = await fetch(src, { headers: { accept: "application/json" } });
        if (!response.ok) throw new Error(`HTTP ${response.status}.`);
        const spec = (await response.json()) as WidgetSpec;
        if (request === this.#srcRequest) this.spec = spec;
      } catch (caught) {
        if (request === this.#srcRequest) this.#problem(`Could not load the spec from ${src}: ${caught instanceof Error ? caught.message : String(caught)}`);
      }
    }

    #draw() {
      if (!this.isConnected || !this.#spec) return;
      if (this.#widget) void this.#widget.setSpec(this.#spec);
      else {
        const actions = (this.getAttribute("actions") ?? "").split(/\s+/).filter((a): a is WidgetAction => a === "csv" || a === "image" || a === "copy" || a === "explain" || a === "expand");
        this.#widget = createWidget(this, this.#spec, { actions });
      }
    }

    /** Shows a problem with the element itself using the widget's own error state. */
    #problem(message: string) {
      this.spec = {
        data: {
          type: "fn",
          load: () => {
            throw new Error(message);
          },
        },
        view: { type: "table" },
      };
    }
  }

  customElements.define(tag, Element);
}
