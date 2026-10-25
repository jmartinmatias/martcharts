import { describe, expect, test } from "vitest";
import { applyRag, isRagValue, ragCounts, ragFromValue, ragOf, ragScore, ragShape, ragShapePath, ragStepProblems, ragTrend, ragWord, RAG_SHAPES, RAG_WORDS, worstOf } from "./rag.ts";
import { getBlock } from "./registry.ts";
import { runPipeline } from "./pipeline.ts";
import { explainChart } from "./explain.ts";
import { questionOf } from "./question.ts";
import { recommendCharts } from "./recommend.ts";
import { chartGuide } from "./guide.ts";
import { hasErrors, validateSpec } from "./validate.ts";
import type { Row, WidgetSpec } from "./types.ts";

describe("ragOf", () => {
  test("reads letters, colors and words in any case; anything else is no data", () => {
    expect(["R", "a", " green ", "Red", "AMBER", "yellow", "grey", "Gray", "On track", "at-risk", "Off Track", "n/a"].map(ragOf)).toEqual(["R", "A", "G", "R", "A", "A", "N", "N", "G", "A", "R", "N"]);
    expect([undefined, null, "", 3, "blue", true].map(ragOf)).toEqual(["N", "N", "N", "N", "N", "N"]);
    expect([isRagValue("green"), isRagValue("N"), isRagValue(""), isRagValue("blue"), isRagValue(null)]).toEqual([true, true, false, false, false]);
  });
});

describe("ragFromValue", () => {
  test("more is better by default: green at or past green, amber at or past amber, red below", () => {
    const t = { green: 40, amber: 20 };
    expect([45, 40, 39.9, 20, 19, null, "30", "x"].map((v) => ragFromValue(v, t))).toEqual(["G", "G", "A", "A", "R", "N", "A", "N"]);
  });
  test("goodWhen down mirrors it: green at or under green", () => {
    const t = { green: 30, amber: 60, goodWhen: "down" as const };
    expect([10, 30, 31, 60, 61].map((v) => ragFromValue(v, t))).toEqual(["G", "G", "A", "A", "R"]);
  });
});

describe("worstOf, ragScore and ragTrend", () => {
  test("the worst status wins and no data is ignored, unless there is nothing else", () => {
    expect([worstOf(["G", "A", "G"]), worstOf(["G", "red", "A"]), worstOf(["N", "G"]), worstOf(["N", ""]), worstOf([])]).toEqual(["A", "R", "G", "N", "N"]);
  });
  test("scores G 2, A 1, R 0, and no data has none", () => {
    expect((["G", "A", "R", "N"] as const).map(ragScore)).toEqual([2, 1, 0, null]);
  });
  test("improved, worse or same; a move to or from no data is same", () => {
    expect([ragTrend("A", "G"), ragTrend("R", "A"), ragTrend("G", "R"), ragTrend("G", "G"), ragTrend("N", "R"), ragTrend("A", undefined)]).toEqual(["improved", "improved", "worse", "same", "same", "same"]);
  });
  test("counts each status and the total with data", () => {
    expect(ragCounts(["R", "A", "A", "G", "", "green"])).toEqual({ R: 1, A: 2, G: 2, N: 1, total: 5 });
  });
});

describe("words and shapes", () => {
  test("every status has its own words and its own shape, so it never rests on color", () => {
    expect(RAG_WORDS).toEqual({ G: "On track", A: "At risk", R: "Off track", N: "No data" });
    expect(new Set(Object.values(RAG_SHAPES)).size).toBe(4);
    expect(new Set((["circle", "triangle", "square", "ring", "diamond"] as const).map((s) => ragShapePath(s))).size).toBe(5);
  });
  test("a spec can set its own words and shapes, and anything unknown falls back", () => {
    expect([ragWord("G", { G: "Healthy" }), ragWord("A", { G: "Healthy" }), ragWord("R", null)]).toEqual(["Healthy", "At risk", "Off track"]);
    expect([ragShape("G", { G: "diamond" }), ragShape("A", { A: "blob" })]).toEqual(["diamond", "triangle"]);
  });
});

describe("the rag transform", () => {
  const rows: Row[] = [
    { client: "Aldana", nps: 45, daysSinceContact: 94 },
    { client: "Brivio", nps: 25, daysSinceContact: 20 },
    { client: "Keller", nps: null, daysSinceContact: 45 },
  ];
  const step = { type: "rag", rules: [{ field: "nps", green: 40, amber: 20 }, { field: "daysSinceContact", as: "contact", green: 30, amber: 60, goodWhen: "down" }], overall: "status" };

  test("writes a status per rule, named <field>Rag unless as says otherwise, and the worst as overall", () => {
    const out = getBlock("transform", "rag").apply(rows, step);
    expect(out.map((r) => [r.client, r.npsRag, r.contact, r.status])).toEqual([
      ["Aldana", "G", "R", "R"],
      ["Brivio", "A", "G", "A"],
      ["Keller", "N", "A", "A"],
    ]);
    expect(rows[0]).not.toHaveProperty("npsRag");
    expect(applyRag(rows, { type: "rag", rules: [{ field: "nps", green: 40, amber: 20 }] })[0]).toEqual({ ...rows[0], npsRag: "G" });
  });

  test("runs in a pipeline, and validation names what is wrong with a rule", async () => {
    const spec: WidgetSpec = { data: { type: "inline", rows }, transform: [step], view: { type: "table" } };
    expect((await runPipeline(spec)).map((r) => r.status)).toEqual(["R", "A", "A"]);
    expect(hasErrors(validateSpec(spec))).toBe(false);
    expect(ragStepProblems({ rules: [] })).toEqual(['rules needs at least one { "field", "green", "amber" }.']);
    expect(ragStepProblems({ rules: [{ field: "nps", green: 20, amber: 40 }] })).toEqual(["rules[0]: amber must sit below green, since more is better."]);
    expect(ragStepProblems({ rules: [{ field: "days", green: 60, amber: 30, goodWhen: "down" }] })).toEqual(["rules[0]: amber must sit above green, since less is better."]);
    expect(ragStepProblems({ rules: [{ green: "x", amber: 2, goodWhen: "sideways" }] })).toEqual(["rules[0] needs a field.", "rules[0].green must be a number.", "rules[0].goodWhen must be up or down."]);
    const bad: WidgetSpec = { data: { type: "inline", rows }, transform: [{ type: "rag", rules: [{ field: "nps", green: 20, amber: 40 }] }], view: { type: "table" } };
    expect(hasErrors(validateSpec(bad))).toBe(true);
  });

  test("the reading guide says where the statuses come from", () => {
    const spec: WidgetSpec = { data: { type: "inline", rows }, transform: [step], view: { type: "table" } };
    expect(explainChart(spec)).toContain("Each status comes from a rule: NPS is on track at 40 or more, at risk from 20; days since contact is on track at 30 or less, at risk up to 60.");
  });
});

describe("kpi and kpis rag thresholds", () => {
  test("validate like a rule, worded for the option", () => {
    const kpi = (rag: unknown): WidgetSpec => ({ data: { type: "inline", rows: [{ nps: 40 }] }, view: { type: "kpi", value: "nps", rag } as WidgetSpec["view"] });
    expect(hasErrors(validateSpec(kpi({ green: 40, amber: 20 })))).toBe(false);
    expect(validateSpec(kpi({ green: 20, amber: 40 })).map((i) => i.message)).toContain("rag: amber must sit below green, since more is better.");
    expect(validateSpec(kpi("high")).map((i) => i.message)).toContain("Must be an object.");
    const kpis: WidgetSpec = { data: { type: "inline", rows: [{ nps: 40 }] }, view: { type: "kpis", items: [{ value: "nps", rag: { green: "x", amber: 1 } }] } };
    expect(validateSpec(kpis).map((i) => i.message)).toContain("items[0].rag.green must be a number.");
  });
});

describe("the RAG views in the plain-words layers", () => {
  const board: WidgetSpec = {
    data: {
      type: "inline",
      rows: [
        { client: "Aldana", success: "G", growth: "A", coverage: "R", coverageLast: "A" },
        { client: "Brivio", success: "G", growth: "G", coverage: "G", coverageLast: "G" },
        { client: "Keller", success: "R", growth: "R", coverage: "A", coverageLast: "A" },
      ],
    },
    view: { type: "ragboard", label: "client", dimensions: ["success", "growth", "coverage"], previous: { coverage: "coverageLast" } },
  };
  const trend: WidgetSpec = {
    data: {
      type: "inline",
      rows: [
        { client: "Aldana", month: "2026-08", status: "G" },
        { client: "Aldana", month: "2026-09", status: "A" },
        { client: "Aldana", month: "2026-10", status: "R" },
        { client: "Brivio", month: "2026-08", status: "R" },
        { client: "Brivio", month: "2026-09", status: "A" },
        { client: "Brivio", month: "2026-10", status: "A" },
      ],
    },
    view: { type: "ragtrend", label: "client", period: "month", status: "status" },
  };
  const rowsOf = (spec: WidgetSpec) => spec.data.rows as Row[];

  test("explain: what each shape means, then the standout", () => {
    expect(explainChart(board, rowsOf(board))).toBe(
      "Each row is one client, each column one of success, growth and coverage. A circle is on track, a triangle at risk, a square off track; the worst rows come first. Overall, first, is each row's worst status. An arrow means better or worse than last period. Here, 2 of 3 clients are off track on at least one count; Keller is off track on 2 of 3.",
    );
    expect(explainChart(trend, rowsOf(trend))).toBe(
      "Each row is one client, read left to right month by month. A filled circle is on track, a triangle at risk and a square off track; a thin upright line marks where the status changed. The pill at the end is where it stands now, and the rows in the worst state come first. Here, 1 of 2 clients got worse over the period and 1 got better; Aldana went from on track to off track.",
    );
  });

  test("question, recommendation and guide", () => {
    expect(questionOf(board, rowsOf(board)).text).toBe("Which clients are off track, on what, and which need action first?");
    expect(questionOf(trend, rowsOf(trend)).text).toBe("Whose status got worse, when, and why?");
    expect(recommendCharts(rowsOf(board))[0]?.view).toEqual({ type: "ragboard", label: "client", dimensions: ["success", "growth", "coverage"], previous: { coverage: "coverageLast" } });
    expect(recommendCharts(rowsOf(trend)).find((pick) => pick.type === "ragtrend")?.view).toEqual({ type: "ragtrend", label: "client", period: "month", status: "status" });
    expect([chartGuide("ragboard")?.purposes.target, chartGuide("ragtrend")?.purposes.change]).toEqual([3, 3]);
  });

  test("explain counts the ambers when nothing is off track, and says so when everything is on track", () => {
    const amber: WidgetSpec = { ...board, data: { type: "inline", rows: [{ client: "A", success: "G", growth: "A", coverage: "G" }, { client: "B", success: "G", growth: "G", coverage: "G" }] } };
    expect(explainChart(amber, rowsOf(amber))).toMatch(/Here, 1 of 2 clients is at risk\.$/);
    const green: WidgetSpec = { ...board, data: { type: "inline", rows: [{ client: "B", success: "G", growth: "G", coverage: "G" }] } };
    expect(explainChart(green, rowsOf(green))).toMatch(/Here, every client is on track on every count\.$/);
  });

  test("validation warns about values that are not statuses", () => {
    const odd: WidgetSpec = { ...board, data: { type: "inline", rows: [{ client: "X", success: "blue", growth: "G", coverage: "G" }] } };
    const warning = validateSpec(odd, rowsOf(odd)).find((i) => i.level === "warning")?.message;
    expect(warning).toContain('1 value in "success" is not a status (blue)');
    expect(validateSpec({ ...board, view: { ...board.view, previous: { coverage: 3 } } }).map((i) => i.message)).toContain('previous must map each dimension field to its previous-period field, such as { "health": "healthLast" }.');
  });
});
