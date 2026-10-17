import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import { createLocalFetch } from "../mcp/store.ts";
import { checkPalette, oklch } from "./color.ts";
import { runPipeline } from "./pipeline.ts";
import { balanceOf, createVariants, DICTIONARY, meaningOf, METHODS, noveltyOf, plainTags, profileDish, rankVariants, saucesOf, TASTE_MEANINGS, tasteOf, temperaturePalette } from "./taller.ts";
import type { Method, Variant } from "./taller.ts";
import type { Row, WidgetSpec } from "./types.ts";
import { hasErrors, validateSpec } from "./validate.ts";

/** A dish of regions: one category, three measures, one of them a target. */
const regions: Row[] = [
  { region: "North", revenue: 278000, cost: 190000, target: 270000 },
  { region: "South", revenue: 204000, cost: 150000, target: 230000 },
  { region: "East", revenue: 338000, cost: 240000, target: 360000 },
  { region: "West", revenue: 205000, cost: 140000, target: 220000 },
  { region: "Central", revenue: 259000, cost: 170000, target: 250000 },
];
const byRegion: WidgetSpec = { id: "revenue-by-region", title: "Revenue by region", data: { type: "inline", rows: regions }, view: { type: "bar", x: "region", y: "revenue" } };

/** A dish of months: time and three measures. */
const months: Row[] = Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, "0")}`, web: 100 + i * 9, app: 80 + ((i * 7) % 30), store: 60 + i * 2 }));
const byMonth: WidgetSpec = { id: "channels", title: "Orders by channel", data: { type: "inline", rows: months }, view: { type: "line", x: "month", y: ["web", "app", "store"] } };

/** The shape of a spec, as "crear es no copiar" judges it. */
const shape = (spec: WidgetSpec) => JSON.stringify({ view: { ...spec.view }, facet: spec.facet ?? null, headline: Boolean(spec.headline), steps: spec.transform?.length ?? 0, fields: spec.fields ?? null });

describe("the Diccionario", () => {
  test("names every kitchen term the Taller cooks with, with its chart equivalent", () => {
    const groups = new Set(DICTIONARY.map((e) => e.group));
    expect([...groups]).toEqual(["Ingredients", "Techniques", "Tools", "Soups and sauces", "Temperatures", "Textures", "Plating", "Tastes", "Methods"]);
    const kitchen = DICTIONARY.map((e) => e.kitchen.toLowerCase()).join(" | ");
    for (const term of ["deconstruction", "spherification", "foam", "reduction", "infusion", "tweezers", "squeeze bottle", "knife", "spoon", "hot", "cold", "soft", "crunchy", "salty", "acid", "bitter", "fatty", "umami"]) expect(kitchen).toContain(term);
    expect(DICTIONARY.every((e) => e.chart.length > 20)).toBe(true);
  });

  test("every method has its name and its menu adjective", () => {
    expect(Object.keys(METHODS).sort()).toEqual(["adaptation", "association", "change-of-state", "deconstruction", "minimalism", "sensory", "technique-concept"]);
  });
});

describe("profileDish", () => {
  test("reads the ingredients by kind, the dish's own fields first, and keeps the target apart", () => {
    const dish = profileDish(byRegion, regions);
    expect([dish.measures, dish.categories, dish.times, dish.target, dish.rows, dish.view]).toEqual([["revenue", "cost"], ["region"], [], "target", 5, "bar"]);
  });

  test("dates are time, and days are told from months", () => {
    expect([profileDish(byMonth, months).times, profileDish(byMonth, months).daily]).toEqual([["month"], false]);
  });
});

describe("tastes and balance", () => {
  const rows = regions;
  test("a headline salts, a target line brings depth and honesty, lollipops are lighter than bars, a stream surprises", () => {
    const bars = tasteOf({ ...byRegion }, rows);
    const salted = tasteOf({ ...byRegion, headline: { value: "revenue" } }, rows);
    const target = tasteOf({ ...byRegion, view: { ...byRegion.view, lines: "target" } }, rows);
    const lollipop = tasteOf({ ...byRegion, view: { ...byRegion.view, mark: "lollipop" } }, rows);
    const stream = tasteOf({ ...byMonth, view: { type: "area", x: "month", y: ["web", "app", "store"], stacked: "stream" } }, months);
    expect(salted.salty).toBeGreaterThan(bars.salty);
    expect([target.umami > bars.umami, target.bitter > bars.bitter]).toEqual([true, true]);
    expect(lollipop.fatty).toBeLessThan(bars.fatty);
    expect(stream.acid).toBeGreaterThan(tasteOf(byMonth, months).acid);
  });

  test("every taste stays between 0 and 1", () => {
    const loaded = tasteOf({ ...byRegion, headline: { value: "revenue", compare: "previous" }, view: { ...byRegion.view, highlight: "East", lines: "target", reference: [{ value: 1 }] } }, rows);
    expect(Object.values(loaded).every((v) => v >= 0 && v <= 1)).toBe(true);
  });

  test("a wash and a band are two sauces", () => {
    expect(saucesOf({ ...byMonth, view: { type: "area", x: "month", y: "web", band: { low: "app", high: "web" } } })).toBe(2);
  });

  test("balance: two sauces, one shouting taste, or nothing to taste is turned away; a good plate says what leads, in chart words", () => {
    const even = { salty: 0.4, acid: 0.3, bitter: 0.2, fatty: 0.35, umami: 0.45 };
    expect(balanceOf(even, 2)).toEqual({ ok: false, note: "too much ink: two filled layers" });
    expect(balanceOf({ ...even, salty: 1, umami: 0.3, fatty: 0.2 })).toEqual({ ok: false, note: "too much emphasis: everything shouts" });
    expect(balanceOf({ salty: 0.1, acid: 0.1, bitter: 0.1, fatty: 0.2, umami: 0.1 }).ok).toBe(false);
    expect(balanceOf(even)).toEqual({ ok: true, note: "balanced: mostly insight and emphasis" });
  });

  test("on results, the five tastes go by what they mean for a chart", () => {
    expect(TASTE_MEANINGS).toEqual({ salty: "Emphasis", acid: "Surprise", bitter: "Honesty", fatty: "Ink", umami: "Insight" });
  });
});

describe("temperature palettes", () => {
  test("hot is warm hues, cold is cool hues, and both pass the colorblind check", () => {
    const hot = temperaturePalette("hot", 3) ?? [];
    const cold = temperaturePalette("cold", 4) ?? [];
    expect([hot.length, cold.length]).toEqual([3, 4]);
    expect(hot.every((c) => oklch(c)[2] < 95 || oklch(c)[2] >= 330)).toBe(true);
    expect(cold.every((c) => oklch(c)[2] >= 150 && oklch(c)[2] < 300)).toBe(true);
    for (const palette of [hot, cold]) expect(checkPalette(palette, { mode: "light" }).checks.find((c) => c.name === "cvd")?.state).not.toBe("fail");
  });
});

describe("createVariants", () => {
  test("each method cooks at least one dish where the ingredients allow it", () => {
    const cooks = (spec: WidgetSpec, rows: Row[], method: Method) => [1, 2, 3, 4].some((seed) => createVariants(spec, rows, { methods: [method], seed }).length > 0);
    for (const method of ["association", "adaptation", "deconstruction", "minimalism", "change-of-state", "technique-concept"] as Method[]) expect([method, cooks(byRegion, regions, method)]).toEqual([method, true]);
    expect(cooks(byMonth, months, "sensory")).toBe(true);
  });

  test("grids need crossing categories: accounts nested in segments get a sunburst or an icicle, never a sparse heat table", () => {
    const accounts: Row[] = Array.from({ length: 12 }, (_, i) => ({ account: `A${i}`, segment: ["Enterprise", "Mid-market", "Small"][i % 3] as string, revenue: 10 + i }));
    const nested: WidgetSpec = { id: "nested", title: "Accounts", data: { type: "inline", rows: accounts }, view: { type: "boxplot", value: "revenue", group: "segment" } };
    const types = new Set([1, 2, 3, 4, 5].flatMap((seed) => createVariants(nested, accounts, { seed, count: 12 }).map((v) => `${v.spec.view?.type}${v.spec.facet ? "+facet" : ""}`)));
    expect([types.has("heatmap"), types.has("marimekko"), [...types].some((t) => t.endsWith("+facet"))]).toEqual([false, false, false]);
  });

  test("slopes are for one measure at two times, not for two different measures", () => {
    const served = (spec: WidgetSpec, rows: Row[]) => new Set([1, 2, 3, 4, 5, 6].flatMap((seed) => createVariants(spec, rows, { seed, count: 12 }).map((v) => v.spec.view?.type)));
    expect(served(byRegion, regions).has("slope")).toBe(false);
    const years: Row[] = regions.map((r) => ({ region: r.region, revenue2025: (r.revenue as number) * 0.9, revenue2026: r.revenue }));
    expect(served({ ...byRegion, data: { type: "inline", rows: years }, view: { type: "bar", x: "region", y: "revenue2026" } }, years).has("slope")).toBe(true);
  });

  test("a method filter keeps to that method", () => {
    expect(createVariants(byRegion, regions, { methods: ["minimalism"], count: 6 }).every((v) => v.method === "minimalism")).toBe(true);
  });

  test("crear es no copiar: never the original's shape, never two of the same", () => {
    for (const [spec, rows] of [[byRegion, regions], [byMonth, months]] as const) {
      const menu = createVariants(spec, rows, { count: 8 });
      const shapes = menu.map((v) => shape(v.spec));
      expect(shapes).not.toContain(shape(spec));
      expect(new Set(shapes).size).toBe(shapes.length);
    }
  });

  test("never a near copy: a dish served in its own view brings a new technique or two new elements", () => {
    const technique = (spec: WidgetSpec) => JSON.stringify([spec.view?.mark ?? "bar", spec.view?.curve ?? "linear", spec.view?.stacked ?? false]);
    const extras = (spec: WidgetSpec) => [Boolean(spec.view?.lines), Boolean(spec.view?.reference), Boolean(spec.view?.highlight), Boolean(spec.headline), Boolean(spec.facet), (spec.transform?.length ?? 0) > 0];
    for (const [spec, rows] of [[byRegion, regions], [byMonth, months]] as const) {
      for (const seed of [1, 2, 3]) {
        for (const v of createVariants(spec, rows, { seed, count: 10 }).filter((v) => v.spec.view?.type === spec.view?.type)) {
          const added = extras(v.spec).filter((on, i) => on && !extras(spec)[i]).length;
          expect(technique(v.spec) !== technique(spec) || added >= 2).toBe(true);
        }
      }
    }
  });

  test("taking garnish away is not creating: a dish in its own view needs a new technique or two new elements", () => {
    const dressed: WidgetSpec = { ...byRegion, view: { ...byRegion.view, highlight: "East", reference: [{ value: 250000, label: "Plan" }] } };
    const technique = (spec: WidgetSpec) => JSON.stringify([spec.view?.mark ?? "bar", spec.view?.curve ?? "linear", spec.view?.stacked ?? false]);
    const extras = (spec: WidgetSpec) => [Boolean(spec.view?.lines), Boolean(spec.view?.reference), Boolean(spec.view?.highlight), Boolean(spec.headline), Boolean(spec.facet), (spec.transform?.length ?? 0) > 0];
    for (const seed of [1, 2, 3, 4]) {
      for (const v of createVariants(dressed, regions, { seed, count: 12 }).filter((v) => v.spec.view?.type === "bar")) {
        const added = extras(v.spec).filter((on, i) => on && !extras(dressed)[i]).length;
        expect(technique(v.spec) !== technique(dressed) || added >= 2).toBe(true);
      }
    }
  });

  test("the ingredients are kept: same data, and every field a variant uses is one the dish had", () => {
    const fields = new Set(Object.keys(regions[0] ?? {}));
    for (const v of createVariants(byRegion, regions, { count: 10 })) {
      expect(v.spec.data).toEqual(byRegion.data);
      const used = Object.values(v.spec.view ?? {}).flatMap((value) => (Array.isArray(value) ? value : [value])).filter((value): value is string => typeof value === "string" && /^[a-z]+$/.test(value));
      expect(used.filter((f) => !fields.has(f) && !["bar", "hbar", "lollipop", "smooth", "step", "table", "donut", "waffle", "treemap", "pareto", "list", "variance", "bullet", "dumbbell", "slope", "radar", "line", "area", "scatter", "histogram", "beeswarm", "boxplot", "linear", "percent", "stream"].includes(f))).toEqual([]);
    }
  });

  test("the same dish and seed give the same menu; another seed gives another", () => {
    const once = createVariants(byRegion, regions, { seed: 7 });
    expect(createVariants(byRegion, regions, { seed: 7 })).toEqual(once);
    expect(createVariants(byRegion, regions, { seed: 8 }).map((v) => v.menu)).not.toEqual(once.map((v) => v.menu));
  });

  test("steering: hot leans warm, cold leans cool, crunchy leans crunchy, soft leans soft", () => {
    const share = (menu: Variant[], test: (v: Variant) => boolean) => menu.filter(test).length / Math.max(1, menu.length);
    const hot = createVariants(byMonth, months, { temperature: 1, count: 8 });
    const cold = createVariants(byMonth, months, { temperature: -1, count: 8 });
    expect(share(hot, (v) => v.lineage.temperature === "hot" || v.lineage.temperature === "contrast")).toBeGreaterThan(0.5);
    expect(share(cold, (v) => v.lineage.temperature === "cold" || v.lineage.temperature === "room")).toBeGreaterThan(0.5);
    expect(share(createVariants(byRegion, regions, { texture: 1, count: 8 }), (v) => v.lineage.texture === "crunchy")).toBeGreaterThan(0.5);
    expect(share(createVariants(byMonth, months, { texture: -1, count: 8 }), (v) => v.lineage.texture === "soft")).toBeGreaterThan(0.5);
  });

  test("every dish arrives balanced, with a menu line, a lineage and its tools", () => {
    for (const v of createVariants(byRegion, regions, { count: 8 })) {
      expect(v.balance.ok).toBe(true);
      expect(v.menu).toMatch(/^[A-Z][a-z]+ revenue by region: .+, (hot|cold|hot on cold|at room temperature), (soft|crunchy), on (a white|an empty|a cold|the house) plate$/);
      expect(v.lineage.tools.length).toBeGreaterThan(0);
    }
  });

  test("results speak in chart words only: a plain title, how to read it, plain tags and a plain balance note", () => {
    const kitchen = /\b(salty|acid|bitter|fatty|umami|plate|spherif\w*|foam\w*|tweezers|squeeze|knife|spoon|hot|cold|crunchy|sauces?|dish|cook\w*|menu|kitchen|recipe)\b/i;
    for (const [spec, rows] of [[byRegion, regions], [byMonth, months]] as const) {
      for (const v of createVariants(spec, rows, { count: 10 })) {
        expect(v.title.startsWith(`${spec.title} as `)).toBe(true);
        expect(v.explain.length).toBeGreaterThan(20);
        for (const text of [v.title, v.explain, v.balance.note, ...plainTags(v)]) expect([text, kitchen.test(text)]).toEqual([text, false]);
      }
    }
  });

  test("plain tags name the marks, colors and card", () => {
    const [v] = createVariants(byRegion, regions, { methods: ["minimalism"], temperature: 1, texture: 1, seed: 2 });
    expect(plainTags(v as Variant).some((tag) => ["warm colors", "one standout color"].includes(tag))).toBe(true);
    expect(plainTags(v as Variant)).toContain("sharp marks");
  });

  test("variants are plain JSON, seed included, ready to be saved as a collection", () => {
    const menu = createVariants(byMonth, months, { seed: 3 });
    expect(JSON.parse(JSON.stringify(menu))).toEqual(menu);
    expect(menu.every((v) => v.seed === 3)).toBe(true);
  });
});

describe("novelty, meaning and ranking", () => {
  test("another family of view is newer than a tweak of the same one", () => {
    const tweak = noveltyOf({ ...byRegion, view: { ...byRegion.view, mark: "lollipop" } }, byRegion);
    const leap = noveltyOf({ ...byRegion, view: { type: "waffle", label: "region", value: "revenue" } }, byRegion);
    expect(leap).toBeGreaterThan(tweak);
    expect(noveltyOf(byRegion, byRegion)).toBe(0);
  });

  test("a balanced plate with depth means more than a flat one", () => {
    const deep = meaningOf({ salty: 0.4, acid: 0.3, bitter: 0.35, fatty: 0.3, umami: 0.7 }, { ok: true, note: "" });
    const flat = meaningOf({ salty: 0.1, acid: 0.1, bitter: 0.1, fatty: 0.1, umami: 0.1 }, { ok: false, note: "" });
    expect(deep).toBeGreaterThan(flat);
  });

  test("rankVariants sorts by novelty, meaning or both, highest first, without touching the input", () => {
    const menu = createVariants(byRegion, regions, { count: 8 });
    const before = menu.map((v) => v.menu);
    const novel = rankVariants(menu, "novelty");
    const meaningful = rankVariants(menu, "meaning");
    const both = rankVariants(menu);
    expect(novel.every((v, i) => i === 0 || v.novelty <= (novel[i - 1] as Variant).novelty)).toBe(true);
    expect(meaningful.every((v, i) => i === 0 || v.meaning <= (meaningful[i - 1] as Variant).meaning)).toBe(true);
    expect(both.every((v, i) => i === 0 || v.novelty + v.meaning <= (both[i - 1] as Variant).novelty + (both[i - 1] as Variant).meaning + 1e-9)).toBe(true);
    expect(menu.map((v) => v.menu)).toEqual(before);
  });
});

describe("every widget in the kitchen", () => {
  const widgets = readdirSync("widgets")
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join("widgets", name), "utf8")) as WidgetSpec);
  const rowsOf = new Map<string, Row[]>();
  beforeAll(async () => {
    const fetch = createLocalFetch("public");
    for (const spec of widgets) rowsOf.set(spec.id as string, await runPipeline(spec, { fetch }));
  });

  test("cooks a menu for most dishes, and every variant is valid, new, colorblind safe and balanced", () => {
    let cooked = 0;
    for (const spec of widgets) {
      const rows = rowsOf.get(spec.id as string) ?? [];
      for (const seed of [1, 2]) {
        const menu = createVariants(spec, rows, { seed, count: 6 });
        if (menu.length) cooked += 1;
        const shapes = new Set<string>([shape(spec)]);
        for (const v of menu) {
          const errors = validateSpec(v.spec, rows).filter((issue) => issue.level === "error");
          expect([spec.id, v.menu, errors]).toEqual([spec.id, v.menu, []]);
          expect(hasErrors(validateSpec(v.spec, rows))).toBe(false);
          expect(shapes.has(shape(v.spec))).toBe(false);
          shapes.add(shape(v.spec));
          expect(v.balance.ok).toBe(true);
          if (Array.isArray(v.spec.style?.palette) && v.spec.style.palette.length > 1) {
            expect(checkPalette(v.spec.style.palette, { mode: "light" }).checks.find((c) => c.name === "cvd")?.state).not.toBe("fail");
          }
        }
      }
    }
    expect(cooked / (widgets.length * 2)).toBeGreaterThan(0.8);
  });
});

describe("honest forms", () => {
  /** Every variant the kitchen can make from a spec, across many seeds and every temperature and texture. */
  const everything = (spec: WidgetSpec, rows: Row[]) => {
    const out: Variant[] = [];
    for (let seed = 1; seed <= 12; seed++) for (const temperature of [-1, 0, 1]) for (const texture of [-1, 0, 1]) out.push(...createVariants(spec, rows, { count: 8, seed, temperature, texture }));
    return out;
  };
  const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"];

  test("a dial stacks numbers only when the original stacked them as parts of one whole", () => {
    const mixed = months.map((month, i) => ({ month, revenue: 800 + i * 40, cost: 600 + i * 20, newCustomers: 30 + i }));
    const line: WidgetSpec = { title: "Revenue and cost", data: { type: "inline", rows: mixed }, view: { type: "line", x: "month", y: ["revenue", "cost"] } };
    const dials = everything(line, mixed).filter((v) => v.spec.view?.type === "rose");
    expect(dials.length).toBeGreaterThan(0);
    expect(dials.every((v) => [v.spec.view?.y].flat().length === 1)).toBe(true);
    const parts = months.map((month, i) => ({ month, core: 500 + i * 10, plus: 300 + i * 5 }));
    const stacked: WidgetSpec = { title: "Revenue mix", data: { type: "inline", rows: parts }, view: { type: "area", x: "month", y: ["core", "plus"], stacked: true } };
    const stackedDials = everything(stacked, parts).filter((v) => v.spec.view?.type === "rose");
    expect(stackedDials.some((v) => [v.spec.view?.y].flat().length === 2)).toBe(true);
  });

  test("a slope compares the earliest period with the latest, not the first two columns", () => {
    const wide = ["North", "South", "East", "West"].map((region, r) => Object.fromEntries([["region", region], ...months.slice(3, 9).map((m, i) => [m, 40 + r * 5 + i * (r + 1)])]));
    const table: WidgetSpec = { title: "Revenue by region and month", data: { type: "inline", rows: wide }, view: { type: "table" } };
    const slopes = everything(table, wide).filter((v) => v.spec.view?.type === "slope");
    expect(slopes.length).toBeGreaterThan(0);
    expect(slopes.every((v) => v.spec.view?.from === "2026-04" && v.spec.view?.to === "2026-09")).toBe(true);
  });

  test("a dot swarm says what each dot is", () => {
    const accounts = Array.from({ length: 12 }, (_, i) => ({ account: `Account ${i}`, segment: ["A", "B", "C"][i % 3], growth: (i % 7) / 10 - 0.1 }));
    const scatter: WidgetSpec = { title: "Accounts", data: { type: "inline", rows: accounts }, view: { type: "table" } };
    const swarms = everything(scatter, accounts).filter((v) => v.spec.view?.type === "beeswarm");
    expect(swarms.length).toBeGreaterThan(0);
    expect(swarms.every((v) => v.spec.view?.label === "account" && v.title.includes("each dot is one account"))).toBe(true);
  });
});
