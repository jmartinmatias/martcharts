// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { registerView } from "../core/registry.ts";
import type { ViewContext } from "../core/view-context.ts";
import type { Row, WidgetSpec } from "../core/types.ts";
import { createWidget } from "./widget.ts";

/** A promise you resolve by hand, for controlling when a data source answers. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

let cleanups = 0;
registerView({
  type: "test-echo",
  description: "Writes each row's v, formatted, separated by commas",
  options: {},
  render(ctx: ViewContext) {
    ctx.el.textContent = ctx.rows.map((row) => ctx.format(row.v, "v")).join(",");
    return () => {
      cleanups += 1;
    };
  },
});
registerView({ type: "test-no-renderer", description: "Known to Node only", options: {} });

const rows = (...values: unknown[]): Row[] => values.map((v) => ({ v }));
const echo = (data: Row[], extra: Partial<WidgetSpec> = {}): WidgetSpec => ({
  data: { type: "inline", rows: data },
  view: { type: "test-echo" },
  ...extra,
});

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
  cleanups = 0;
});

const text = (selector: string) => target.querySelector(selector)?.textContent ?? null;
const texts = (selector: string) => [...target.querySelectorAll(selector)].map((node) => node.textContent);
const root = () => target.querySelector<HTMLElement>(".fft-widget");

describe("createWidget", () => {
  test("shows the title, subtitle and footer", async () => {
    await createWidget(target, echo(rows(1), { title: "Revenue", subtitle: "Q3 2026", footer: "Source: ERP" })).ready;
    expect([text(".fft-title"), text(".fft-subtitle"), text(".fft-footer")]).toEqual(["Revenue", "Q3 2026", "Source: ERP"]);
  });

  test("leaves out the subtitle and footer when the spec has none", async () => {
    await createWidget(target, echo(rows(1), { title: "Revenue" })).ready;
    expect(target.querySelector(".fft-subtitle")?.hasAttribute("hidden")).toBe(true);
    expect(target.querySelector(".fft-footer")?.hasAttribute("hidden")).toBe(true);
  });

  test("draws the view with transformed rows and field formats", async () => {
    const spec = echo(rows(0.5, 0.25, 0.75), {
      transform: [{ type: "sort", field: "v" }],
      fields: { v: { format: "percent" } },
      locale: "en-US",
    });
    await createWidget(target, spec).ready;
    expect(text(".fft-body")).toBe("25%,50%,75%");
    expect(root()?.dataset.state).toBe("ready");
  });

  test("no rows shows the empty state", async () => {
    await createWidget(target, echo([])).ready;
    expect(root()?.dataset.state).toBe("empty");
    expect(text(".fft-state-title")).toBe("No data to show");
  });

  test("an invalid spec shows every error with where it is", async () => {
    await createWidget(target, { data: { type: "inline", rows: [] }, view: { type: "pie" } }).ready;
    expect(root()?.dataset.state).toBe("error");
    expect(text(".fft-message")).toContain('view.type: Unknown view "pie"');
  });

  test("a failing data source shows its message", async () => {
    const spec: WidgetSpec = {
      data: { type: "fn", load: () => Promise.reject(new Error("Database offline")) },
      view: { type: "test-echo" },
    };
    await createWidget(target, spec).ready;
    expect(root()?.dataset.state).toBe("error");
    expect(text(".fft-message")).toContain("Database offline");
  });

  test("a view with no renderer in this page says so", async () => {
    await createWidget(target, { data: { type: "inline", rows: rows(1) }, view: { type: "test-no-renderer" } }).ready;
    expect(text(".fft-message")).toContain('View "test-no-renderer" has no renderer in this page.');
  });

  test("update merges the override and redraws", async () => {
    const widget = createWidget(target, echo(rows(1, 2), { title: "Before" }));
    await widget.ready;
    await widget.update({ title: "After", transform: [{ type: "limit", count: 1 }] });
    expect([text(".fft-title"), text(".fft-body")]).toEqual(["After", "1"]);
    expect(widget.spec.title).toBe("After");
  });

  test("a slow earlier load cannot overwrite a newer one", async () => {
    const slow = deferred<Row[]>();
    const widget = createWidget(target, { data: { type: "fn", load: () => slow.promise }, view: { type: "test-echo" } });
    const newer = widget.setSpec(echo(rows("new")));
    slow.resolve(rows("old"));
    await Promise.all([widget.ready, newer]);
    expect(text(".fft-body")).toBe("new");
  });

  test("refresh reloads data and keeps the previous drawing while it loads", async () => {
    const answers = [Promise.resolve(rows(1)), deferred<Row[]>()] as const;
    let call = 0;
    const load = () => (call++ === 0 ? answers[0] : answers[1].promise);
    const widget = createWidget(target, { data: { type: "fn", load }, view: { type: "test-echo" } });
    await widget.ready;

    const refreshing = widget.refresh();
    expect(text(".fft-body")).toBe("1");
    expect(root()?.getAttribute("aria-busy")).toBe("true");

    answers[1].resolve(rows(2));
    await refreshing;
    expect(text(".fft-body")).toBe("2");
    expect(root()?.getAttribute("aria-busy")).toBe("false");
  });

  test("the renderer's cleanup runs before the next draw", async () => {
    const widget = createWidget(target, echo(rows(1)));
    await widget.ready;
    await widget.update({ title: "Again" });
    expect(cleanups).toBe(1);
  });

  test("destroy removes the widget, runs cleanup, and ignores loads still in flight", async () => {
    const slow = deferred<Row[]>();
    const widget = createWidget(target, echo(rows(1)));
    await widget.ready;
    const pending = widget.setSpec({ data: { type: "fn", load: () => slow.promise }, view: { type: "test-echo" } });
    widget.destroy();
    slow.resolve(rows(2));
    await pending;
    expect(target.innerHTML).toBe("");
    expect(cleanups).toBe(1);
  });

  test("ctx.select fires a bubbling fft-select event carrying the row", async () => {
    registerView({
      type: "test-select",
      description: "Selects the first row on load",
      options: {},
      render: (ctx: ViewContext) => queueMicrotask(() => ctx.select(ctx.rows[0] as Row)),
    });
    const seen: unknown[] = [];
    target.addEventListener("fft-select", (event) => seen.push((event as CustomEvent).detail.row));
    await createWidget(target, { data: { type: "inline", rows: rows(7) }, view: { type: "test-select" } }).ready;
    await Promise.resolve();
    expect(seen).toEqual([{ v: 7 }]);
  });

  test("ctx.label uses field labels, then the humanized field name", async () => {
    registerView({
      type: "test-labels",
      description: "Writes two labels",
      options: {},
      render: (ctx: ViewContext) => void (ctx.el.textContent = `${ctx.label("v")}|${ctx.label("unitPrice")}`),
    });
    await createWidget(target, { data: { type: "inline", rows: rows(1) }, fields: { v: { label: "Value" } }, view: { type: "test-labels" } }).ready;
    expect(text(".fft-body")).toBe("Value|Unit price");
  });
});

describe("expand", () => {
  const dialog = () => document.querySelector<HTMLElement>(".fft-overlay");

  test("the expand action opens the same widget, large, in a dialog", async () => {
    const widget = createWidget(target, echo(rows(1, 2), { title: "Revenue" }), { actions: ["expand"] });
    await widget.ready;
    target.querySelector<HTMLButtonElement>('.fft-action[data-action="expand"]')?.click();
    await new Promise((r) => setTimeout(r, 0));
    expect([dialog()?.getAttribute("role"), dialog()?.getAttribute("aria-modal"), dialog()?.querySelector(".fft-widget .fft-title")?.textContent]).toEqual(["dialog", "true", "Revenue"]);
    expect(dialog()?.querySelector('.fft-action[data-action="expand"]')).toBeNull();
  });

  test("a widget on its own has nothing to step to, so the dialog shows no navigation", async () => {
    const widget = createWidget(target, echo(rows(1)), { actions: ["expand"] });
    await widget.ready;
    target.querySelector<HTMLButtonElement>('.fft-action[data-action="expand"]')?.click();
    expect(dialog()?.querySelector(".fft-overlay-nav")).toBeNull();
  });

  test("Escape closes it and focus returns to the expand button", async () => {
    const widget = createWidget(target, echo(rows(1)), { actions: ["expand"] });
    await widget.ready;
    const button = target.querySelector<HTMLButtonElement>('.fft-action[data-action="expand"]') as HTMLButtonElement;
    button.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement?.classList.contains("fft-overlay-close")).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect([dialog(), document.activeElement]).toEqual([null, button]);
  });

  test("a click on the backdrop or the close button closes it too", async () => {
    const widget = createWidget(target, echo(rows(1)), { actions: ["expand"] });
    await widget.ready;
    const button = target.querySelector<HTMLButtonElement>('.fft-action[data-action="expand"]') as HTMLButtonElement;
    button.click();
    dialog()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(dialog()).toBeNull();
    button.click();
    dialog()?.querySelector<HTMLButtonElement>(".fft-overlay-close")?.click();
    expect(dialog()).toBeNull();
  });
});

describe("custom actions", () => {
  test("addAction puts a labelled icon button in the toolbar, after the built-in ones", async () => {
    const widget = createWidget(target, echo(rows(1)), { actions: ["csv"] });
    await widget.ready;
    widget.addAction("Edit in playground", ["M4 20h4L19 9l-4-4L4 16z"], () => {});
    const buttons = [...target.querySelectorAll<HTMLButtonElement>(".fft-actions .fft-action")];
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual(["Download data as CSV", "Edit in playground"]);
    expect([buttons[1]?.title, buttons[1]?.querySelectorAll("svg path").length]).toEqual(["Edit in playground", 1]);
  });

  test("it works without built-in actions, and a click hands the button to the handler", async () => {
    const widget = createWidget(target, echo(rows(1)));
    await widget.ready;
    const clicked: HTMLButtonElement[] = [];
    const button = widget.addAction("Copy command", ["M4 6h16"], (b) => clicked.push(b));
    button.click();
    expect([target.querySelectorAll(".fft-actions .fft-action").length, clicked[0] === button]).toEqual([1, true]);
  });
});

describe("text templates", () => {
  const months = [
    { m: "2026-07", v: 2 },
    { m: "2026-08", v: 3 },
  ];

  test("title, subtitle, footer and headline caption fill from the rows the view draws", async () => {
    await createWidget(target, {
      ...echo(months, { title: "{count} months", subtitle: "{first:m} to {last:m}", footer: "Total {sum:v}" }),
      headline: { value: "v", caption: "up to {last:m}" },
    }).ready;
    expect([text(".fft-title"), text(".fft-subtitle"), text(".fft-footer"), text(".fft-headline-caption")]).toEqual(["2 months", "2026-07 to 2026-08", "Total 5", "up to 2026-08"]);
  });

  test("templates follow transforms, so a filtered widget describes what it shows", async () => {
    const widget = createWidget(target, echo(months, { subtitle: "from {first:m}" }));
    await widget.ready;
    await widget.setSpec(echo(months, { subtitle: "from {first:m}", transform: [{ type: "filter", field: "m", op: ">=", value: "2026-08" }] }));
    expect(text(".fft-subtitle")).toBe("from 2026-08");
  });
});

describe("loading, empty and error states", () => {
  const pending = (view: Record<string, unknown>, extra: Partial<WidgetSpec> = {}): WidgetSpec =>
    ({ data: { type: "fn", load: () => new Promise(() => {}) }, view, ...extra }) as WidgetSpec;
  const skeleton = () => target.querySelector<HTMLElement>(".fft-skeleton");

  test("while loading, a skeleton shaped like the view holds its place", () => {
    const cases = [
      [{ type: "bar", x: "m", y: "v" }, "bars"],
      [{ type: "table" }, "rows"],
      [{ type: "kpi", value: "v" }, "stat"],
      [{ type: "donut", label: "l", value: "v" }, "ring"],
      [{ type: "line", x: "m", y: "v" }, "plot"],
    ] as const;
    const shapes = cases.map(([view]) => {
      target.replaceChildren();
      createWidget(target, pending(view));
      return skeleton()?.dataset.shape;
    });
    expect(shapes).toEqual(cases.map(([, shape]) => shape));
  });

  test("screen readers hear that it is loading, and the skeleton itself is hidden from them", () => {
    createWidget(target, pending({ type: "bar", x: "m", y: "v" }));
    expect([root()?.dataset.state, text(".fft-message .fft-sr-only"), skeleton()?.getAttribute("aria-hidden")]).toEqual(["loading", "Loading", "true"]);
  });

  test("a chart skeleton is as tall as the chart will be, so nothing jumps when the data arrives", () => {
    createWidget(target, pending({ type: "bar", x: "m", y: "v" }, { style: { height: 233 } }));
    expect(skeleton()?.style.height).toBe("233px");
  });

  test("the empty state has an icon, a title and a hint", async () => {
    await createWidget(target, echo([])).ready;
    expect([target.querySelector(".fft-state-icon svg") !== null, text(".fft-state-title"), text(".fft-state-hint")]).toEqual([
      true,
      "No data to show",
      "The source returned no rows, or every row was filtered out.",
    ]);
  });

  test("the error state has the alert icon, a title and every detail", async () => {
    await createWidget(target, { data: { type: "fn", load: () => Promise.reject(new Error("Database offline")) }, view: { type: "test-echo" } }).ready;
    expect([target.querySelector<HTMLElement>(".fft-state-icon")?.dataset.icon, text(".fft-state-title"), texts(".fft-message li")]).toEqual([
      "alert",
      "Could not draw this widget",
      ["Database offline"],
    ]);
  });
});

describe("headline", () => {
  const months = [
    { m: "Aug", v: 120 },
    { m: "Sep", v: 150 },
  ];

  test("shows the number, its change and a caption above the view", async () => {
    await createWidget(target, {
      locale: "en-US",
      data: { type: "inline", rows: months },
      fields: { v: { format: { type: "currency", currency: "USD", decimals: 0 } } },
      headline: { value: "v", compare: "previous", caption: "this month" },
      view: { type: "test-echo" },
    }).ready;
    expect([text(".fft-headline-value"), text(".fft-headline .fft-kpi-change"), text(".fft-headline-caption")]).toEqual(["$150", "▲ +25.0%", "this month"]);
    const order = [...(root()?.children ?? [])].map((el) => el.className.split(" ")[0]);
    expect(order.indexOf("fft-headline")).toBe(order.indexOf("fft-body") - 1);
  });

  test("goodWhen down turns a rise into bad news", async () => {
    await createWidget(target, { data: { type: "inline", rows: months }, headline: { value: "v", compare: "previous", goodWhen: "down" }, view: { type: "test-echo" } }).ready;
    expect(target.querySelector<HTMLElement>(".fft-headline .fft-kpi-delta")?.dataset.sentiment).toBe("bad");
  });

  test("without a headline nothing is shown", async () => {
    await createWidget(target, echo(rows(1))).ready;
    expect(target.querySelector(".fft-headline")?.hasAttribute("hidden")).toBe(true);
  });
});

describe("facet (small multiples)", () => {
  const data = [
    { region: "North", v: 1 },
    { region: "South", v: 2 },
    { region: "North", v: 3 },
  ];

  test("draws the view once per value, each panel titled and given only its rows", async () => {
    await createWidget(target, { data: { type: "inline", rows: data }, facet: { field: "region" }, view: { type: "test-echo" } }).ready;
    expect(texts(".fft-facet-title")).toEqual(["North", "South"]);
    expect(texts(".fft-facet-body")).toEqual(["1,3", "2"]);
  });

  test("columns fixes the grid's column count", async () => {
    await createWidget(target, { data: { type: "inline", rows: data }, facet: { field: "region", columns: 2 }, view: { type: "test-echo" } }).ready;
    expect((target.querySelector(".fft-facets") as HTMLElement).style.gridTemplateColumns).toBe("repeat(2, minmax(0, 1fr))");
  });
});

describe("entrance motion", () => {
  test("only the first draw is marked for the entrance animation", async () => {
    vi.useFakeTimers();
    try {
      const widget = createWidget(target, echo(rows(1)));
      await widget.ready;
      expect(root()?.hasAttribute("data-animate")).toBe(true);
      vi.advanceTimersByTime(2000);
      expect(root()?.hasAttribute("data-animate")).toBe(false);
      await widget.update({ title: "Again" });
      expect(root()?.hasAttribute("data-animate")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("style", () => {
  test("theme and density become attributes; palette and tokens become CSS variables", async () => {
    await createWidget(target, echo(rows(1), { style: { theme: "dark", density: "compact", palette: ["#111111", "#222222"], tokens: { accent: "#0a7d5a", textSecondary: "#333333" } } })).ready;
    const el = root() as HTMLElement;
    expect([el.dataset.theme, el.dataset.density]).toEqual(["dark", "compact"]);
    expect(el.style.getPropertyValue("--fft-series-1")).toBe("#111111");
    expect(el.style.getPropertyValue("--fft-series-2")).toBe("#222222");
    expect(el.style.getPropertyValue("--fft-accent")).toBe("#0a7d5a");
    expect(el.style.getPropertyValue("--fft-text-secondary")).toBe("#333333");
  });

  test("a palette name fills the series variables from the library", async () => {
    await createWidget(target, echo(rows(1), { style: { palette: "apple" } })).ready;
    expect([root()?.style.getPropertyValue("--fft-series-1"), root()?.style.getPropertyValue("--fft-series-2")]).toEqual(["#007AFF", "#34C759"]);
  });

  test("an update that drops a token removes its variable", async () => {
    const widget = createWidget(target, echo(rows(1), { style: { tokens: { accent: "#0a7d5a" } } }));
    await widget.ready;
    await widget.update({ style: { tokens: null } });
    expect(root()?.style.getPropertyValue("--fft-accent")).toBe("");
  });

  test("ctx.color walks the palette in order and wraps at its end", async () => {
    registerView({
      type: "test-colors",
      description: "Writes series colors",
      options: {},
      render: (ctx: ViewContext) => void (ctx.el.textContent = [0, 1, 3].map((i) => ctx.color(i)).join(" ")),
    });
    await createWidget(target, { data: { type: "inline", rows: rows(1) }, view: { type: "test-colors" }, style: { palette: ["red", "green", "blue"] } }).ready;
    expect(text(".fft-body")).toBe("var(--fft-series-1) var(--fft-series-2) var(--fft-series-1)");
  });

  test("a preset becomes a data attribute, and each preset's stylesheet is added once", async () => {
    await createWidget(target, echo(rows(1), { style: { preset: "glass" } })).ready;
    await createWidget(target, echo(rows(2), { style: { preset: "glass" } })).ready;
    expect((target.querySelector(".fft-widget") as HTMLElement).dataset.preset).toBe("glass");
    expect(document.querySelectorAll('style[data-fft-preset="glass"]').length).toBe(1);
  });

  test("removing the preset removes the attribute", async () => {
    const widget = createWidget(target, echo(rows(1), { style: { preset: "airy" } }));
    await widget.ready;
    await widget.update({ style: { preset: null } });
    expect(root()?.hasAttribute("data-preset")).toBe(false);
  });

  test("the base stylesheet is added once per document", async () => {
    await createWidget(target, echo(rows(1))).ready;
    await createWidget(target, echo(rows(2))).ready;
    expect(document.querySelectorAll("style[data-fft-widget]").length).toBe(1);
  });
});

describe("tooltip", () => {
  test("shows a title and value rows as text, and hides again", async () => {
    let ctx!: ViewContext;
    registerView({ type: "test-tip", description: "Keeps ctx", options: {}, render: (c: ViewContext) => void (ctx = c) });
    await createWidget(target, { data: { type: "inline", rows: rows(1) }, view: { type: "test-tip" } }).ready;
    const tip = target.querySelector<HTMLElement>(".fft-tooltip") as HTMLElement;

    ctx.tooltip.show(ctx.el, "<b>North</b>", [{ label: "Revenue", value: "€120", color: "var(--fft-series-1)" }]);
    expect(tip.hidden).toBe(false);
    expect(tip.textContent).toBe("<b>North</b>€120Revenue");
    expect(tip.querySelector("b")).toBeNull();

    ctx.tooltip.hide();
    expect(tip.hidden).toBe(true);
  });

  /** A DOMRect-shaped box for stubbing layout, which jsdom does not compute. */
  const box = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, x: left, y: top, right: left + width, bottom: top + height, toJSON: () => ({}) }) as DOMRect;

  /** Shows a 233px wide tooltip over an anchor at `anchorLeft` in a widget at `frameLeft`, on a screen `screen` px wide; returns its CSS left. */
  async function placeTip(screen: number, frameLeft: number, frameWidth: number, anchorLeft: number, anchorWidth: number) {
    let ctx!: ViewContext;
    registerView({ type: "test-tip-place", description: "Keeps ctx", options: {}, render: (c: ViewContext) => void (ctx = c) });
    await createWidget(target, { data: { type: "inline", rows: rows(1) }, view: { type: "test-tip-place" } }).ready;
    const tip = target.querySelector<HTMLElement>(".fft-tooltip") as HTMLElement;
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: screen });
    Object.defineProperty(tip, "offsetWidth", { configurable: true, value: 233 });
    (root() as HTMLElement).getBoundingClientRect = () => box(frameLeft, 0, frameWidth, 300);
    const anchor = document.createElement("div");
    anchor.getBoundingClientRect = () => box(anchorLeft, 100, anchorWidth, 20);
    try {
      ctx.tooltip.show(anchor, "North", []);
      return parseFloat(tip.style.left);
    } finally {
      Reflect.deleteProperty(document.documentElement, "clientWidth");
    }
  }

  test("on a wide screen it stays centered over the mark", async () => {
    expect(await placeTip(1280, 100, 800, 400, 40)).toBe(320);
  });

  test("on a 390px phone a narrow widget's tooltip stays 8px inside the right edge of the screen", async () => {
    const left = await placeTip(390, 200, 170, 340, 20);
    expect(200 + left + 233 / 2).toBe(390 - 8);
  });

  test("a widget scrolled past the left edge keeps its tooltip 8px inside the screen", async () => {
    const left = await placeTip(390, -50, 600, -40, 20);
    expect(-50 + left - 233 / 2).toBe(8);
  });
});

describe("touch", () => {
  let deactivations = 0;
  registerView({
    type: "test-marks",
    description: "One mark per row that highlights and shows a tooltip on hover, like the built-in views",
    options: {},
    render(ctx: ViewContext) {
      const doc = ctx.el.ownerDocument;
      const wrap = doc.createElement("div");
      wrap.className = "test-wrap";
      const marks: HTMLElement[] = [];
      const deactivate = () => {
        deactivations += 1;
        wrap.removeAttribute("data-active");
        for (const mark of marks) mark.removeAttribute("data-active");
        ctx.tooltip.hide();
      };
      ctx.rows.forEach((row) => {
        const mark = doc.createElement("span");
        mark.className = "test-mark";
        mark.tabIndex = 0;
        mark.textContent = String(row.v);
        const activate = () => {
          wrap.setAttribute("data-active", "");
          mark.setAttribute("data-active", "");
          ctx.tooltip.show(mark, String(row.v), []);
        };
        mark.addEventListener("pointerenter", activate);
        mark.addEventListener("focus", activate);
        mark.addEventListener("pointerleave", deactivate);
        mark.addEventListener("blur", deactivate);
        marks.push(mark);
        wrap.append(mark);
      });
      ctx.el.append(wrap);
    },
  });

  beforeEach(() => {
    deactivations = 0;
  });

  const fire = (el: Element, type: string, pointerType: string) =>
    el.dispatchEvent(new PointerEvent(type, { pointerType, pointerId: 1, bubbles: !type.endsWith("enter") && !type.endsWith("leave") }));
  /** A finger tap in browser order: touch has no hover, so the pointer enters just before the press and leaves right after it. */
  const tap = (el: Element) => ["pointerover", "pointerenter", "pointerdown", "pointerup", "pointerout", "pointerleave"].forEach((type) => fire(el, type, "touch"));
  const mark = (i: number) => target.querySelectorAll<HTMLElement>(".test-mark")[i] as HTMLElement;
  const tip = () => target.querySelector<HTMLElement>(".fft-tooltip") as HTMLElement;
  const active = () => [...target.querySelectorAll("[data-active]")].map((el) => el.className);
  const draw = () => createWidget(target, { data: { type: "inline", rows: rows(1, 2) }, view: { type: "test-marks" } });

  test("a tapped mark keeps its tooltip and highlight after the finger lifts", async () => {
    await draw().ready;
    tap(mark(0));
    expect([tip().hidden, tip().textContent, active()]).toEqual([false, "1", ["test-wrap", "test-mark"]]);
  });

  test("a touch pointerdown outside the widget hides the tooltip and clears every highlight", async () => {
    await draw().ready;
    const outside = document.createElement("button");
    document.body.append(outside);
    tap(mark(0));
    expect(tip().hidden).toBe(false);
    fire(outside, "pointerdown", "touch");
    expect([tip().hidden, active()]).toEqual([true, []]);
  });

  test("tapping elsewhere runs the view's own deactivate, so view-specific hover marks go too", async () => {
    await draw().ready;
    tap(mark(0));
    expect(deactivations).toBe(0);
    tap(document.body);
    expect(deactivations).toBe(1);
  });

  test("a tap on empty space inside the widget dismisses the tooltip", async () => {
    await draw().ready;
    tap(mark(0));
    expect(tip().hidden).toBe(false);
    tap(target.querySelector(".fft-body") as HTMLElement);
    expect([tip().hidden, active()]).toEqual([true, []]);
  });

  test("tapping another mark moves the tooltip and highlight to it", async () => {
    await draw().ready;
    tap(mark(0));
    tap(mark(1));
    expect([tip().hidden, tip().textContent, active()]).toEqual([false, "2", ["test-wrap", "test-mark"]]);
    expect(mark(1).hasAttribute("data-active")).toBe(true);
  });

  test("a touch that turns into a scroll leaves no tooltip behind", async () => {
    await draw().ready;
    ["pointerover", "pointerenter", "pointerdown", "pointercancel", "pointerout", "pointerleave"].forEach((type) => fire(mark(0), type, "touch"));
    expect([tip().hidden, active()]).toEqual([true, []]);
  });

  test("a mouse leaving a mark still hides the tooltip at once", async () => {
    await draw().ready;
    fire(mark(0), "pointerenter", "mouse");
    expect(tip().hidden).toBe(false);
    fire(mark(0), "pointerleave", "mouse");
    expect([tip().hidden, active()]).toEqual([true, []]);
    mark(1).dispatchEvent(new Event("pointerenter"));
    mark(1).dispatchEvent(new Event("pointerleave"));
    expect([tip().hidden, deactivations]).toEqual([true, 2]);
  });

  test("keyboard focus and blur still show and hide the tooltip", async () => {
    await draw().ready;
    mark(0).focus();
    expect(tip().hidden).toBe(false);
    mark(0).blur();
    expect([tip().hidden, active()]).toEqual([true, []]);
  });

  test("destroy removes every listener the widget added to the document", async () => {
    const added = vi.spyOn(document, "addEventListener");
    const removed = vi.spyOn(document, "removeEventListener");
    try {
      const widget = draw();
      await widget.ready;
      const listeners = added.mock.calls.map(([type, listener, options]) => [type, listener, options]);
      expect(listeners.length).toBeGreaterThan(0);
      widget.destroy();
      expect(removed.mock.calls.map(([type, listener, options]) => [type, listener, options])).toEqual(expect.arrayContaining(listeners));
    } finally {
      added.mockRestore();
      removed.mockRestore();
    }
  });
});
