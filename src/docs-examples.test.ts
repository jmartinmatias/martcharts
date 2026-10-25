// @vitest-environment jsdom
/**
 * The "Extending" examples from docs/api.md, run as written, so the docs cannot drift from the code.
 */
import { describe, expect, test } from "vitest";
import { createPalettePicker } from "./color.ts";
import { createWidget, formatValue, registerFormat, registerPreset, registerSource, registerTransform, registerView, runPipeline } from "./index.ts";
import { html } from "./kit.ts";

describe("docs/api.md extending examples", () => {
  test("csv source", async () => {
    registerSource({
      type: "csv",
      description: "Fetches a CSV file. The first line holds the field names.",
      options: { url: { type: "string", required: true, description: "Address of the CSV file." } },
      async load(spec, ctx) {
        const text = await (await ctx.fetch(spec.url as string, { signal: ctx.signal })).text();
        const [head, ...lines] = text.trim().split("\n").map((line) => line.split(","));
        return lines.map((cells) => Object.fromEntries(head!.map((name, i) => [name, cells[i]])));
      },
    });
    const fetch = (async () => new Response("region,revenue\nNorth,120\nSouth,90")) as unknown as typeof globalThis.fetch;
    expect(await runPipeline({ data: { type: "csv", url: "/sales.csv" } }, { fetch })).toEqual([
      { region: "North", revenue: "120" },
      { region: "South", revenue: "90" },
    ]);
  });

  test("rename transform", async () => {
    registerTransform({
      type: "rename",
      description: "Renames one field.",
      options: {
        from: { type: "field", required: true, description: "Current name." },
        to: { type: "string", required: true, description: "New name." },
      },
      apply: (rows, step) => rows.map(({ [step.from as string]: value, ...rest }) => ({ ...rest, [step.to as string]: value })),
    });
    expect(await runPipeline({ data: { type: "inline", rows: [{ a: 1, b: 2 }] }, transform: [{ type: "rename", from: "a", to: "z" }] })).toEqual([{ b: 2, z: 1 }]);
  });

  test("bytes format", () => {
    registerFormat({
      type: "bytes",
      description: "File sizes: 1.2 MB.",
      options: {},
      format: (value, _options, locale) =>
        new Intl.NumberFormat(locale, { style: "unit", unit: "megabyte", maximumFractionDigits: 1 }).format(Number(value) / 1e6),
    });
    expect(formatValue(1_234_567, "bytes", "en-US")).toBe("1.2 MB");
  });

  test("progress view", async () => {
    registerView({
      type: "progress",
      description: "A labelled bar showing value out of target.",
      options: {
        value: { type: "field", required: true, description: "Field with the current value." },
        target: { type: "field", required: true, description: "Field with the target." },
      },
      render(ctx) {
        const row = ctx.rows[0]!;
        const share = Math.min(1, Number(row[ctx.view.value as string]) / Number(row[ctx.view.target as string]));
        const track = html(ctx.el.ownerDocument, "div");
        track.style.cssText = "height:8px;border-radius:4px;background:var(--fft-grid)";
        const fill = html(ctx.el.ownerDocument, "div");
        fill.style.cssText = `height:100%;width:${share * 100}%;border-radius:4px;background:${ctx.color(0)}`;
        track.append(fill);
        ctx.el.append(track);
      },
    });
    const target = document.createElement("div");
    document.body.append(target);
    await createWidget(target, { data: { type: "inline", rows: [{ done: 30, goal: 40 }] }, view: { type: "progress", value: "done", target: "goal" } }).ready;
    expect((target.querySelector(".fft-body > div > div") as HTMLElement).style.width).toBe("75%");
  });

  test("ink preset", async () => {
    registerPreset({
      name: "ink",
      description: "Monochrome print look.",
      palette: ["#111111", "#6b6b6b"],
      marks: { barRadius: 0 },
      css: `
& { --fft-accent: #111111; --fft-radius: 0px; --fft-shadow: none; }
& .fft-title { text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; }
`,
    });
    const target = document.createElement("div");
    document.body.append(target);
    await createWidget(target, { title: "Ink", data: { type: "inline", rows: [{ a: 1 }] }, view: { type: "table" }, style: { preset: "ink" } }).ready;
    expect((target.querySelector(".fft-widget") as HTMLElement).dataset.preset).toBe("ink");
    expect(document.querySelector('style[data-fft-preset="ink"]')?.textContent).toContain('.fft-widget[data-preset="ink"][data-theme] .fft-title { text-transform: uppercase;');
  });

  test("palette picker wired to a widget", async () => {
    const slot = document.createElement("div");
    const colorsEl = document.createElement("div");
    colorsEl.id = "colors";
    document.body.append(slot, colorsEl);
    const widget = createWidget(slot, { data: { type: "inline", rows: [{ a: "x", b: 1 }] }, view: { type: "bar", x: "a", y: "b" } });
    await widget.ready;
    createPalettePicker(document.querySelector("#colors")!, {
      value: "apple",
      onChange: (colors, name) => widget.update({ style: { palette: name ?? colors } }),
    });
    document.querySelector<HTMLButtonElement>('#colors .fft-picker-chip[data-name="bw"]')?.click();
    await widget.ready;
    expect(widget.spec.style?.palette).toBe("bw");
  });
});
