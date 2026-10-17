import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import { createLocalFetch } from "../mcp/store.ts";
import { checkPalette, oklch } from "./color.ts";
import { runPipeline } from "./pipeline.ts";
import { AUDIENCES, balanceOf, createVariants, fillsOf, huePalette, meaningOf, MOVES, noveltyOf, plainTags, PRINCIPLES, profileData, qualitiesOf, QUALITIES, rankVariants } from "./taller.ts";
import type { Look, Move, Variant } from "./taller.ts";
import type { Row, WidgetSpec } from "./types.ts";
import { hasErrors, validateSpec } from "./validate.ts";

/** Regions: one category, three measures, one of them a target. */
const regions: Row[] = [
  { region: "North", revenue: 278000, cost: 190000, target: 270000 },
  { region: "South", revenue: 204000, cost: 150000, target: 230000 },
  { region: "East", revenue: 338000, cost: 240000, target: 360000 },
  { region: "West", revenue: 205000, cost: 140000, target: 220000 },
  { region: "Central", revenue: 259000, cost: 170000, target: 250000 },
];
const byRegion: WidgetSpec = { id: "revenue-by-region", title: "Revenue by region", data: { type: "inline", rows: regions }, view: { type: "bar", x: "region", y: "revenue" } };

/** Months: time and three measures. */
const months: Row[] = Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, "0")}`, web: 100 + i * 9, app: 80 + ((i * 7) % 30), store: 60 + i * 2 }));
const byMonth: WidgetSpec = { id: "channels", title: "Orders by channel", data: { type: "inline", rows: months }, view: { type: "line", x: "month", y: ["web", "app", "store"] } };

/** The shape of a spec, as "crear es no copiar" judges it. */
const shape = (spec: WidgetSpec) => JSON.stringify({ view: { ...spec.view }, facet: spec.facet ?? null, headline: Boolean(spec.headline), steps: spec.transform?.length ?? 0, fields: spec.fields ?? null });

/** Cooking words. The Taller abstracts elBulli's method and applies it to sales; it never translates the kitchen word for word. */
const KITCHEN = /\b(salty|acid|bitter|fatty|umami|plat(e|es|ed|ing)|spherif\w*|foam\w*|tweezers|squeeze|knife|spoon|ladle|crunchy|sauces?|dish(es)?|cook\w*|menu|kitchen|recipes?|chef|tastes?|ingredients?|pantry|biber\w*|emulsion|infus\w*|garnish|hot|cold|temperature|texture|bite)\b/i;

describe("the method, abstracted", () => {
  test("seven sales moves, each with what it does to a sales question and the creative principle it comes from", () => {
    expect(Object.keys(MOVES)).toEqual(["decompose", "reframe", "distill", "contrast", "reveal", "combine", "reform"]);
    for (const move of Object.values(MOVES)) expect([move.label.length > 3, move.does.length > 20, move.principle.length > 5]).toEqual([true, true, true]);
  });

  test("the principles sit one level above the kitchen: each names a creative principle and how the Taller applies it to sales data", () => {
    expect(PRINCIPLES.length).toBeGreaterThanOrEqual(6);
    expect(PRINCIPLES.every((p) => p.principle.length > 5 && p.sales.length > 30)).toBe(true);
    expect(PRINCIPLES.map((p) => p.principle)).toEqual(expect.arrayContaining(["Know what exists", "Keep the essence, change the form", "Judge twice: is it new, is it good"]));
  });

  test("audiences are moments of sales work, and each leans on the moves that serve it", () => {
    expect(Object.keys(AUDIENCES)).toEqual(["rep", "manager", "leadership"]);
    for (const audience of Object.values(AUDIENCES)) expect(audience.moves.length > 1 && audience.moves.every((m) => m in MOVES) && audience.moment.length > 20).toBe(true);
  });

  test("no cooking word anywhere: not in the moves, principles, audiences or results, nor in the engine's own source", () => {
    const words = [...Object.values(MOVES).flatMap((m) => [m.label, m.does, m.principle]), ...PRINCIPLES.flatMap((p) => [p.principle, p.sales]), ...Object.values(AUDIENCES).flatMap((a) => [a.label, a.moment])];
    for (const [spec, rows] of [[byRegion, regions], [byMonth, months]] as const) {
      for (const v of createVariants(spec, rows, { count: 10 })) {
        const { spec: _spec, ...rest } = v;
        words.push(JSON.stringify(rest), ...plainTags(v));
      }
    }
    expect(words.filter((w) => KITCHEN.test(w))).toEqual([]);
    const source = readFileSync("src/core/taller.ts", "utf8") + readFileSync("src/core/taller-explain.ts", "utf8");
    expect(source.match(new RegExp(KITCHEN.source, "gi")) ?? []).toEqual([]);
  });
});

describe("profileData", () => {
  test("reads the fields by kind, the chart's own fields first, and keeps the target apart", () => {
    const data = profileData(byRegion, regions);
    expect([data.measures, data.categories, data.times, data.target, data.rows, data.view]).toEqual([["revenue", "cost"], ["region"], [], "target", 5, "bar"]);
  });

  test("dates are time, and days are told from months", () => {
    expect([profileData(byMonth, months).times, profileData(byMonth, months).daily]).toEqual([["month"], false]);
  });
});

describe("qualities and balance", () => {
  const rows = regions;
  test("a headline adds emphasis, a target line adds insight and honesty, lollipops carry less detail than bars, a stream surprises", () => {
    const bars = qualitiesOf({ ...byRegion }, rows);
    const headlined = qualitiesOf({ ...byRegion, headline: { value: "revenue" } }, rows);
    const target = qualitiesOf({ ...byRegion, view: { ...byRegion.view, lines: "target" } }, rows);
    const lollipop = qualitiesOf({ ...byRegion, view: { ...byRegion.view, mark: "lollipop" } }, rows);
    const stream = qualitiesOf({ ...byMonth, view: { type: "area", x: "month", y: ["web", "app", "store"], stacked: "stream" } }, months);
    expect(headlined.emphasis).toBeGreaterThan(bars.emphasis);
    expect([target.insight > bars.insight, target.honesty > bars.honesty]).toEqual([true, true]);
    expect(lollipop.detail).toBeLessThan(bars.detail);
    expect(stream.surprise).toBeGreaterThan(qualitiesOf(byMonth, months).surprise);
  });

  test("every quality stays between 0 and 1", () => {
    const loaded = qualitiesOf({ ...byRegion, headline: { value: "revenue", compare: "previous" }, view: { ...byRegion.view, highlight: "East", lines: "target", reference: [{ value: 1 }] } }, rows);
    expect(Object.values(loaded).every((v) => v >= 0 && v <= 1)).toBe(true);
  });

  test("a wash and a band are two filled layers", () => {
    expect(fillsOf({ ...byMonth, view: { type: "area", x: "month", y: "web", band: { low: "app", high: "web" } } })).toBe(2);
  });

  test("balance: two filled layers, one quality shouting, or nothing to learn is turned away; a good chart says what leads", () => {
    const even = { emphasis: 0.4, surprise: 0.3, honesty: 0.2, detail: 0.35, insight: 0.45 };
    expect(balanceOf(even, 2)).toEqual({ ok: false, note: "too much detail: two filled layers" });
    expect(balanceOf({ ...even, emphasis: 1, insight: 0.3, detail: 0.2 })).toEqual({ ok: false, note: "too much emphasis: everything shouts" });
    expect(balanceOf({ emphasis: 0.1, surprise: 0.1, honesty: 0.1, detail: 0.2, insight: 0.1 }).ok).toBe(false);
    expect(balanceOf(even)).toEqual({ ok: true, note: "balanced: mostly insight and emphasis" });
  });

  test("the five qualities, in reading order", () => {
    expect(QUALITIES).toEqual(["emphasis", "surprise", "honesty", "detail", "insight"]);
  });
});

describe("hue palettes", () => {
  test("warm palettes leave alert red alone: oranges, golds and pinks only, so a warm chart never reads as bad news", () => {
    for (const size of [1, 2, 3, 4]) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const warm = huePalette("warm", size, seed) ?? [];
        expect([size, seed, warm.filter((c) => oklch(c)[2] < 38)]).toEqual([size, seed, []]);
      }
    }
  });

  test("every color a hue palette offers reaches 3:1 on a light card, as EN 301 549 asks of chart marks", () => {
    for (const kind of ["warm", "cool"] as const) {
      for (const size of [1, 2, 3]) {
        for (const seed of [1, 2, 3]) {
          const palette = huePalette(kind, size, seed);
          if (palette) expect([kind, size, seed, checkPalette(palette, { mode: "light" }).checks.find((c) => c.name === "contrast")?.state]).toEqual([kind, size, seed, "pass"]);
        }
      }
    }
    expect([huePalette("warm", 2), huePalette("cool", 3)].every(Boolean)).toBe(true);
  });

  test("bold on many series is one warm standout against grey, since many warm colors cannot stay apart for colorblind readers", () => {
    const bold = createVariants(byMonth, months, { color: 1, count: 8 }).filter((v) => ["line", "area"].includes(String(v.spec.view?.type)) && [v.spec.view?.y].flat().length > 1);
    expect(bold.length).toBeGreaterThan(0);
    expect(bold.every((v) => v.lineage.color !== "warm")).toBe(true);
    expect(bold.filter((v) => v.lineage.color === "standout").length / bold.length).toBeGreaterThan(0.5);
  });

  test("a standout item is never painted alert red", () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      for (const v of createVariants(byRegion, regions, { color: 1, seed, count: 8 }).filter((v) => v.lineage.color === "standout")) {
        expect((v.spec.style?.palette as string[]).filter((c) => oklch(c)[2] < 38)).toEqual([]);
      }
    }
  });

  test("warm is oranges, golds and pinks, cool is greens, blues and purples, and both pass the colorblind check", () => {
    const warm = huePalette("warm", 2) ?? [];
    const cool = huePalette("cool", 4) ?? [];
    expect([warm.length, cool.length]).toEqual([2, 4]);
    expect(warm.every((c) => oklch(c)[2] < 95 || oklch(c)[2] >= 330)).toBe(true);
    expect(cool.every((c) => oklch(c)[2] >= 150 && oklch(c)[2] < 300)).toBe(true);
    for (const palette of [warm, cool]) expect(checkPalette(palette, { mode: "light" }).checks.find((c) => c.name === "cvd")?.state).not.toBe("fail");
  });
});

describe("createVariants", () => {
  test("each move makes at least one version where the data allows it", () => {
    const makes = (spec: WidgetSpec, rows: Row[], move: Move) => [1, 2, 3, 4].some((seed) => createVariants(spec, rows, { moves: [move], seed }).length > 0);
    for (const move of Object.keys(MOVES) as Move[]) expect([move, makes(byRegion, regions, move) || makes(byMonth, months, move)]).toEqual([move, true]);
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

  test("a move filter keeps to that move", () => {
    const distilled = createVariants(byRegion, regions, { moves: ["distill"], count: 6 });
    expect(distilled.length).toBeGreaterThan(0);
    expect(distilled.every((v) => v.move === "distill" && v.lineage.move === "distill")).toBe(true);
  });

  test("crear es no copiar: never the original's shape, never two of the same", () => {
    for (const [spec, rows] of [[byRegion, regions], [byMonth, months]] as const) {
      const versions = createVariants(spec, rows, { count: 8 });
      const shapes = versions.map((v) => shape(v.spec));
      expect(shapes).not.toContain(shape(spec));
      expect(new Set(shapes).size).toBe(shapes.length);
    }
  });

  test("never a near copy: a version in the original's own view brings a new form or two new elements", () => {
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

  test("taking extras away is not creating: a version in the original's own view needs a new form or two new elements", () => {
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

  test("the numbers are kept: same data, and every field a version uses is one the original had", () => {
    const fields = new Set(Object.keys(regions[0] ?? {}));
    for (const v of createVariants(byRegion, regions, { count: 10 })) {
      expect(v.spec.data).toEqual(byRegion.data);
      const used = Object.values(v.spec.view ?? {}).flatMap((value) => (Array.isArray(value) ? value : [value])).filter((value): value is string => typeof value === "string" && /^[a-z]+$/.test(value));
      expect(used.filter((f) => !fields.has(f) && !["bar", "hbar", "lollipop", "smooth", "step", "table", "donut", "waffle", "treemap", "pareto", "list", "variance", "bullet", "dumbbell", "slope", "radar", "line", "area", "scatter", "histogram", "beeswarm", "boxplot", "linear", "percent", "stream"].includes(f))).toEqual([]);
    }
  });

  test("the same chart and seed give the same versions; another seed gives others", () => {
    const once = createVariants(byRegion, regions, { seed: 7 });
    expect(createVariants(byRegion, regions, { seed: 7 })).toEqual(once);
    const look = (vs: Variant[]) => vs.map((v) => JSON.stringify([v.spec.view, v.spec.style]));
    expect(look(createVariants(byRegion, regions, { seed: 8 }))).not.toEqual(look(once));
  });

  test("steering: bold leans warm or one standout, calm leans cool or standard, sharp leans sharp, smooth leans smooth", () => {
    const share = (versions: Variant[], test: (v: Variant) => boolean) => versions.filter(test).length / Math.max(1, versions.length);
    const bold = createVariants(byMonth, months, { color: 1, count: 8 });
    const calm = createVariants(byMonth, months, { color: -1, count: 8 });
    expect(share(bold, (v) => v.lineage.color === "warm" || v.lineage.color === "standout")).toBeGreaterThan(0.5);
    expect(share(calm, (v) => v.lineage.color === "cool" || v.lineage.color === "standard")).toBeGreaterThan(0.5);
    expect(share(createVariants(byRegion, regions, { marks: 1, count: 8 }), (v) => v.lineage.marks === "sharp")).toBeGreaterThan(0.5);
    expect(share(createVariants(byMonth, months, { marks: -1, count: 8 }), (v) => v.lineage.marks === "smooth")).toBeGreaterThan(0.5);
  });

  test("an audience leans on the moves that serve its moment", () => {
    for (const [audience, { moves }] of Object.entries(AUDIENCES) as [keyof typeof AUDIENCES, { moves: Move[] }][]) {
      const versions = [1, 2, 3].flatMap((seed) => createVariants(byRegion, regions, { audience, seed, count: 6 }));
      expect([audience, versions.filter((v) => moves.includes(v.move)).length / versions.length >= 0.6]).toEqual([audience, true]);
    }
  });

  test("every version arrives balanced, with its move, the sales question it answers and a plain lineage", () => {
    for (const v of createVariants(byRegion, regions, { count: 8 })) {
      expect(v.balance.ok).toBe(true);
      expect(v.question).toMatch(/^[A-Z].+\?$/);
      expect(Object.keys(v.lineage).sort()).toEqual(["color", "form", "look", "marks", "move", "question"]);
      expect(v.lineage.move).toBe(v.move);
    }
  });

  test("the essence is kept: every version asks about the original's own numbers", () => {
    for (const v of createVariants(byRegion, regions, { count: 12 })) expect([v.question, /revenue|cost|target/.test(v.question)]).toEqual([v.question, true]);
  });

  test("results read in chart words: a plain title and how to read it", () => {
    for (const [spec, rows] of [[byRegion, regions], [byMonth, months]] as const) {
      for (const v of createVariants(spec, rows, { count: 10 })) {
        expect(v.title.startsWith(`${spec.title} as `)).toBe(true);
        expect(v.explain.length).toBeGreaterThan(20);
      }
    }
  });

  test("plain tags name the move, the marks, the colors and the card", () => {
    const [v] = createVariants(byRegion, regions, { moves: ["distill"], color: 1, marks: 1, seed: 2 });
    const tags = plainTags(v as Variant);
    expect(tags[0]).toBe("distill");
    expect(tags.some((tag) => ["warm colors", "one standout color"].includes(tag))).toBe(true);
    expect(tags).toContain("sharp marks");
  });

  test("variants are plain JSON, seed included, ready to be saved as a collection", () => {
    const versions = createVariants(byMonth, months, { seed: 3 });
    expect(JSON.parse(JSON.stringify(versions))).toEqual(versions);
    expect(versions.every((v) => v.seed === 3)).toBe(true);
  });
});

describe("novelty, meaning and ranking", () => {
  test("another family of view is newer than a tweak of the same one", () => {
    const tweak = noveltyOf({ ...byRegion, view: { ...byRegion.view, mark: "lollipop" } }, byRegion);
    const leap = noveltyOf({ ...byRegion, view: { type: "waffle", label: "region", value: "revenue" } }, byRegion);
    expect(leap).toBeGreaterThan(tweak);
    expect(noveltyOf(byRegion, byRegion)).toBe(0);
  });

  test("a balanced chart with insight means more than a flat one", () => {
    const deep = meaningOf({ emphasis: 0.4, surprise: 0.3, honesty: 0.35, detail: 0.3, insight: 0.7 }, { ok: true, note: "" });
    const flat = meaningOf({ emphasis: 0.1, surprise: 0.1, honesty: 0.1, detail: 0.1, insight: 0.1 }, { ok: false, note: "" });
    expect(deep).toBeGreaterThan(flat);
  });

  test("rankVariants sorts by novelty, meaning or both, highest first, without touching the input", () => {
    const versions = createVariants(byRegion, regions, { count: 8 });
    const before = versions.map((v) => v.title);
    const novel = rankVariants(versions, "novelty");
    const meaningful = rankVariants(versions, "meaning");
    const both = rankVariants(versions);
    expect(novel.every((v, i) => i === 0 || v.novelty <= (novel[i - 1] as Variant).novelty)).toBe(true);
    expect(meaningful.every((v, i) => i === 0 || v.meaning <= (meaningful[i - 1] as Variant).meaning)).toBe(true);
    expect(both.every((v, i) => i === 0 || v.novelty + v.meaning <= (both[i - 1] as Variant).novelty + (both[i - 1] as Variant).meaning + 1e-9)).toBe(true);
    expect(versions.map((v) => v.title)).toEqual(before);
  });
});

describe("every stored widget", () => {
  const widgets = readdirSync("widgets")
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join("widgets", name), "utf8")) as WidgetSpec);
  const rowsOf = new Map<string, Row[]>();
  beforeAll(async () => {
    const fetch = createLocalFetch("public");
    for (const spec of widgets) rowsOf.set(spec.id as string, await runPipeline(spec, { fetch }));
  });

  test("makes versions of most widgets, and every version is valid, new, colorblind safe and balanced", () => {
    let made = 0;
    for (const spec of widgets) {
      const rows = rowsOf.get(spec.id as string) ?? [];
      for (const seed of [1, 2]) {
        const versions = createVariants(spec, rows, { seed, count: 6 });
        if (versions.length) made += 1;
        const shapes = new Set<string>([shape(spec)]);
        for (const v of versions) {
          const errors = validateSpec(v.spec, rows).filter((issue) => issue.level === "error");
          expect([spec.id, v.title, errors]).toEqual([spec.id, v.title, []]);
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
    expect(made / (widgets.length * 2)).toBeGreaterThan(0.8);
  });
});

describe("honest forms", () => {
  /** Every version the Taller can make from a spec, across many seeds, colors and marks. */
  const everything = (spec: WidgetSpec, rows: Row[]) => {
    const out: Variant[] = [];
    for (let seed = 1; seed <= 12; seed++) for (const color of [-1, 0, 1]) for (const marks of [-1, 0, 1]) out.push(...createVariants(spec, rows, { count: 8, seed, color, marks }));
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

  test("a number that does not add up, a median, an average, a rate or a percent, is never sliced into shares, stacked or summed", () => {
    const teams = ["Technical", "Data", "SMB", "Partners", "Billing", "Security", "Onboarding", "Enterprise"];
    const byTeam = (field: string, label: string, format?: { type: string }) => {
      const rows = teams.map((team, i) => ({ team, [field]: 95 - i * 10 }));
      const spec: WidgetSpec = { title: label, data: { type: "inline", rows }, fields: { [field]: { label, ...(format ? { format } : {}) } }, view: { type: "bar", x: "team", y: field } };
      return [spec, rows] as const;
    };
    const rates = months.map((month, i) => ({ month, online: 0.2 + i / 100, store: 0.3 - i / 100, phone: 0.1 + i / 200 }));
    const overTime: WidgetSpec = { title: "Win rate by channel", data: { type: "inline", rows: rates }, fields: { online: { format: { type: "percent" } }, store: { format: { type: "percent" } }, phone: { format: { type: "percent" } } }, view: { type: "line", x: "month", y: ["online", "store", "phone"] } };
    const WHOLE = ["donut", "waffle", "treemap", "pareto", "sunburst", "icicle", "marimekko"];
    const sliced = (v: Variant) => WHOLE.includes(String(v.spec.view?.type)) || Boolean(v.spec.view?.stacked) || (v.spec.headline as { agg?: unknown } | undefined)?.agg === "sum";
    for (const [spec, rows] of [byTeam("minutes", "Median minutes"), byTeam("deal", "Average deal"), byTeam("won", "Won", { type: "percent" }), [overTime, rates] as const]) {
      const versions = everything(spec, rows);
      expect([spec.title, versions.length > 0, versions.filter(sliced).map((v) => v.title)]).toEqual([spec.title, true, []]);
      expect(profileData(spec, rows).whole).toBe(false);
    }
    // Prices, durations, and rows that are each a different KPI do not add up either.
    const one = (rows: Row[], fields: WidgetSpec["fields"] = {}) => profileData({ data: { type: "inline", rows }, fields, view: { type: "table" } }, rows).whole;
    expect([
      one([{ day: "2026-09-01", open: 10, high: 12, low: 9, close: 11 }]),
      one([{ deal: "A", days: 30 }], { days: { label: "Days to close" } }),
      one([{ team: "A", response_time: 30 }]),
      one([{ kpi: "Revenue", actual: 1200 }, { kpi: "Churn", actual: 3 }]),
      one([{ deal: "A", value: 30 }], { value: { label: "Deal value" } }),
    ]).toEqual([false, false, false, false, true]);
    // Amounts still add up, so they still get their shares.
    const [revenue, rows] = byTeam("revenue", "Revenue");
    expect([profileData(revenue, rows).whole, everything(revenue, rows).some(sliced)]).toEqual([true, true]);
  });

  test("a scorecard's rows are different KPIs: versions read each against its own target, never on one shared axis", async () => {
    const kpis = [
      { kpi: "Revenue", actual: 1284000, target: 1300000 },
      { kpi: "New customers", actual: 66, target: 60 },
      { kpi: "Gross margin (%)", actual: 33, target: 30 },
      { kpi: "Net promoter score", actual: 42, target: 50 },
    ];
    const card: WidgetSpec = { title: "Q3 scorecard", data: { type: "inline", rows: kpis }, view: { type: "bullet", label: "kpi", value: "actual", target: "target" } };
    const versions = everything(card, kpis);
    expect([...new Set(versions.map((v) => v.spec.view?.type))].sort()).toEqual(["bar", "variance"]);
    // The gap as a share of each KPI's own target, never euros next to points.
    expect(versions.filter((v) => v.spec.view?.type === "variance").every((v) => v.spec.view?.percent === true)).toBe(true);
    // How much of its own target each KPI reached, against a dashed 100% target line.
    const reached = versions.find((v) => v.spec.view?.type === "bar") as Variant;
    expect([reached.spec.view?.reference, reached.question]).toEqual([[{ value: 1, label: "Target" }], "Which KPIs meet the target?"]);
    const rows = await runPipeline(reached.spec);
    expect(rows.map((row) => Math.round((row[String(reached.spec.view?.y)] as number) * 100))).toEqual([99, 110, 110, 84]);
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

describe("one unit per axis", () => {
  test("measures share an axis, a sum or a scale only when they share a unit: euros with euros, never with counts or rates", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, "0")}`, revenue: 800000 + i * 40000, cost: 600000 + i * 20000, newCustomers: 40 + i, churn: 0.03 + i / 1000, target: 850000 + i * 30000 }));
    const spec: WidgetSpec = {
      id: "revenue-vs-target",
      title: "Revenue against target",
      data: { type: "inline", rows },
      fields: { revenue: { format: { type: "currency", currency: "EUR" } }, cost: { format: { type: "currency", currency: "EUR" } }, target: { format: { type: "currency", currency: "EUR" } } },
      view: { type: "bar", x: "month", y: "revenue", lines: "target" },
    };
    const shared = new Set(["line", "area", "horizon", "radar", "dumbbell", "slope", "rose"]);
    const mixed: string[] = [];
    for (let seed = 1; seed <= 8; seed++) {
      for (const v of createVariants(spec, rows, { seed, count: 12 })) {
        const view = v.spec.view ?? {};
        if (!shared.has(String(view.type))) continue;
        const fields = [view.y, view.from, view.to].flat().filter((f): f is string => typeof f === "string");
        if (fields.some((f) => !["revenue", "cost"].includes(f))) mixed.push(`${view.type}: ${fields.join(", ")}`);
      }
    }
    expect(mixed).toEqual([]);
  });

  test("a chart that asks about its target keeps the target in some versions, month by month too", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, "0")}`, revenue: 800 + i * 40, target: 850 + i * 30 }));
    const spec: WidgetSpec = { id: "revenue-vs-target", title: "Revenue against target", data: { type: "inline", rows }, view: { type: "bar", x: "month", y: "revenue", lines: "target" } };
    const versions = [1, 2, 3, 4].flatMap((seed) => createVariants(spec, rows, { seed, count: 8 }));
    const keep = versions.filter((v) => v.lineage.question === "target");
    expect(new Set(keep.map((v) => String(v.spec.view?.type))).size).toBeGreaterThanOrEqual(2);
    expect(keep.every((v) => JSON.stringify(v.spec.view).includes('"target"'))).toBe(true);
    expect(createVariants(spec, rows, { moves: ["reframe"], count: 6 }).some((v) => v.spec.view?.type === "variance")).toBe(true);
  });

  test("a big number or a row of numbers keeps the target the chart is about", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, "0")}`, revenue: 800 + i * 40, cost: 600 + i * 10, target: 850 + i * 30 }));
    const spec: WidgetSpec = { id: "revenue-vs-target", title: "Revenue against target", data: { type: "inline", rows }, view: { type: "bar", x: "month", y: "revenue", lines: "target" } };
    const versions = [1, 2, 3, 4, 5, 6].flatMap((seed) => createVariants(spec, rows, { seed, moves: ["distill"], count: 8 }));
    const big = versions.filter((v) => v.spec.view?.type === "kpi");
    const tiles = versions.filter((v) => v.spec.view?.type === "kpis");
    expect([big.length > 0, big.every((v) => v.spec.view?.target === "target" && v.question === "Is revenue on target?")]).toEqual([true, true]);
    expect(tiles.every((v) => (v.spec.view?.items as { value: string; target?: string }[]).find((item) => item.value === "revenue")?.target === "target")).toBe(true);
    // Over time, the tiles read the latest period, not the first one.
    expect([tiles.length > 0, tiles.every((v) => v.spec.view?.series === true)]).toEqual([true, true]);
  });

  test("over time, each dot is one period: a month, not a row or an item", () => {
    const dots = [1, 2, 3, 4, 5, 6].flatMap((seed) => createVariants(byMonth, months, { seed, count: 12 })).filter((v) => ["scatter", "beeswarm"].includes(String(v.spec.view?.type)));
    expect(dots.length).toBeGreaterThan(0);
    expect(dots.map((v) => v.title.split(": ").at(-1))).toEqual(dots.map(() => "each dot is one month"));
  });

  test("unformatted measures of very different sizes are not put on one axis either", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, "0")}`, orders: 4000 + i * 90, returns: 120 + i, rate: 0.03 }));
    const spec: WidgetSpec = { id: "orders", title: "Orders", data: { type: "inline", rows }, view: { type: "line", x: "month", y: "orders" } };
    const lines = [1, 2, 3, 4, 5].flatMap((seed) => createVariants(spec, rows, { seed, count: 12 })).filter((v) => ["line", "area", "horizon"].includes(String(v.spec.view?.type)));
    expect(lines.every((v) => ![v.spec.view?.y].flat().includes("rate"))).toBe(true);
  });
});

describe("plain tags", () => {
  test("a card tag names the look, true in light and dark themes alike", () => {
    const tagsFor = (look: Look) => plainTags({ lineage: { move: "distill", question: "rank", form: "lollipops", color: "standard", marks: "smooth", look }, spec: byRegion });
    const cards = (["paper", "airy", "glass", "default"] as const).map((look) => tagsFor(look).find((t) => /card|layout/.test(t)));
    expect(cards).toEqual(["paper card", "open layout, no card", "glass card", "standard card"]);
    expect(cards.some((t) => /light|dark/.test(t ?? ""))).toBe(false);
  });
});

