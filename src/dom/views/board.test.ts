// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { explainChart } from "../../core/explain.ts";
import { questionOf } from "../../core/question.ts";
import { recommendCharts } from "../../core/recommend.ts";
import type { Row, WidgetSpec } from "../../core/types.ts";
import { validateSpec } from "../../core/validate.ts";
import { createWidget } from "../widget.ts";
import "./index.ts";

let target: HTMLElement;
beforeEach(() => {
  document.body.innerHTML = "";
  target = document.createElement("div");
  document.body.append(target);
});

async function draw(spec: Omit<WidgetSpec, "data"> & { rows: Row[] }) {
  const { rows, ...rest } = spec;
  await createWidget(target, { locale: "en-US", data: { type: "inline", rows }, ...rest } as WidgetSpec).ready;
  expect(target.querySelector(".fft-widget")?.getAttribute("data-state")).toBe("ready");
}

const all = (selector: string) => [...target.querySelectorAll(selector)];
const texts = (selector: string) => all(selector).map((node) => node.textContent);
const press = (node: Element, key: string) => node.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

const rules = [
  { name: "DORA", status: "Applies", topic: "Resilience", impact: 5, issuer: "Commission" },
  { name: "MiCA", status: "Applies", topic: "Markets", impact: 4, issuer: "Commission" },
  { name: "PSD3", status: "Adopted", topic: "Payments", impact: 4, issuer: "Commission" },
  { name: "FiDA", status: "Consultation", topic: "Data", impact: 4, issuer: "Commission" },
  { name: "SFDR 2", status: "Proposal", topic: "ESG", impact: 4, issuer: "Commission" },
  { name: "UK SDR", status: "Applies", topic: "ESG", impact: 3, issuer: "FCA" },
];
const view: WidgetSpec["view"] = { type: "board", label: "name", stage: "status", group: "topic", value: "impact", detail: "issuer" };

describe("board view (a status board)", () => {
  test("one column per stage in order of first appearance, headed by its name and count, one card per row", async () => {
    await draw({ rows: rules, view });
    expect(texts(".fft-board-stage")).toEqual(["Applies", "Adopted", "Consultation", "Proposal"]);
    expect(texts(".fft-board-count")).toEqual(["3", "1", "1", "1"]);
    expect(all(".fft-board-card")).toHaveLength(6);
    expect(texts(".fft-board-column:first-child .fft-board-name")).toEqual(["DORA", "MiCA", "UK SDR"]);
    expect(texts(".fft-board-column:first-child .fft-board-value")).toEqual(["5", "4", "3"]);
    expect(texts(".fft-board-column:first-child .fft-board-detail")).toEqual(["Commission", "Commission", "FCA"]);
  });

  test("stages fixes the column order, shows listed stages with nothing in them, and gathers unlisted ones under Other", async () => {
    await draw({ rows: rules, view: { ...view, stages: ["Proposal", "Consultation", "Adopted", "In force", "Applies"] } });
    expect(texts(".fft-board-stage")).toEqual(["Proposal", "Consultation", "Adopted", "In force", "Applies"]);
    expect(texts(".fft-board-count")).toEqual(["1", "1", "1", "0", "3"]);
    target.replaceChildren();
    await draw({ rows: rules, view: { ...view, stages: ["Proposal", "Applies"] } });
    expect(texts(".fft-board-stage")).toEqual(["Proposal", "Applies", "Other"]);
    expect(texts(".fft-board-count")).toEqual(["1", "3", "2"]);
  });

  test("the group colors a dot on each card and keys a legend; without a group there is neither", async () => {
    await draw({ rows: rules, view });
    expect(texts(".fft-legend li")).toEqual(["Resilience", "Markets", "Payments", "Data", "ESG"]);
    const dots = all(".fft-board-dot") as HTMLElement[];
    expect(dots).toHaveLength(6);
    expect(dots[0]?.style.background).toBe("var(--fft-series-1)");
    expect(dots[5]?.style.background).toBe("var(--fft-series-5)");
    target.replaceChildren();
    await draw({ rows: rules, view: { type: "board", label: "name", stage: "status" } });
    expect([all(".fft-legend").length, all(".fft-board-dot").length, all(".fft-board-value").length]).toEqual([0, 0, 0]);
  });

  test("past the limit a column folds its cards into a + n more line that opens them in place", async () => {
    await draw({ rows: rules, view: { ...view, limit: 2 } });
    const column = all(".fft-board-column")[0] as HTMLElement;
    const hidden = () => [...column.querySelectorAll<HTMLElement>(".fft-board-card")].filter((c) => c.hidden).length;
    const more = column.querySelector(".fft-board-more") as HTMLButtonElement;
    expect([hidden(), more.textContent, more.getAttribute("aria-expanded")]).toEqual([1, "+ 1 more", "false"]);
    more.click();
    expect([hidden(), more.textContent, more.getAttribute("aria-expanded")]).toEqual([0, "Show fewer", "true"]);
    more.click();
    expect(hidden()).toBe(1);
    expect(all(".fft-board-column")[1]?.querySelector(".fft-board-more")).toBeNull();
  });

  test("each card is a keyboard stop with a tooltip naming every field, and Enter picks its row", async () => {
    await draw({ rows: rules, view });
    const cards = all(".fft-board-card");
    expect(cards.map((c) => c.getAttribute("tabindex"))).toEqual(["0", "-1", "-1", "-1", "-1", "-1"]);
    expect(cards[0]?.getAttribute("aria-label")).toBe("DORA: Status Applies, Topic Resilience, Impact 5, Issuer Commission");
    cards[1]?.dispatchEvent(new Event("focus"));
    expect([...texts(".fft-tooltip-title"), ...texts(".fft-tooltip-row")]).toEqual(["MiCA", "AppliesStatus", "MarketsTopic", "4Impact", "CommissionIssuer"]);
    expect(target.querySelector(".fft-board")?.hasAttribute("data-active")).toBe(true);
    const picked: Row[] = [];
    target.addEventListener("fft-select", (event) => picked.push((event as CustomEvent).detail.row));
    press(cards[1] as Element, "Enter");
    expect(picked).toEqual([rules[1]]);
  });

  test("a table behind the board lists every row with the fields drawn", async () => {
    await draw({ rows: rules, view });
    expect(texts(".fft-sr-only th")).toEqual(["Name", "Status", "Topic", "Impact", "Issuer"]);
    expect(all(".fft-sr-only tbody tr")).toHaveLength(6);
  });

  test("the fade cue marks more columns waiting to the right only while the board overflows", async () => {
    await draw({ rows: rules, view });
    const scroller = target.querySelector(".fft-board-scroll") as HTMLElement;
    expect(scroller.hasAttribute("data-more")).toBe(false);
    Object.defineProperties(scroller, { scrollWidth: { value: 900, configurable: true }, clientWidth: { value: 300, configurable: true } });
    scroller.dispatchEvent(new Event("scroll"));
    expect(scroller.hasAttribute("data-more")).toBe(true);
  });

  test("validation: stages must be names, limit a whole number; too many stages or groups warn", () => {
    const spec = (v: Record<string, unknown>): WidgetSpec => ({ data: { type: "inline", rows: rules }, view: { ...view, ...v } });
    const messages = (v: Record<string, unknown>) => validateSpec(spec(v), rules).map((i) => `${i.level}:${i.path} ${i.message}`);
    expect(messages({ stages: "Applies" }).join(" ")).toMatch(/error:view\.stages Must be a list/);
    expect(messages({ stages: [] }).join(" ")).toMatch(/stages must be a list of stage names/);
    expect(messages({ limit: 0 }).join(" ")).toMatch(/limit must be a whole number/);
    expect(messages({})).toEqual([]);
    const many = Array.from({ length: 9 }, (_, i) => ({ name: `R${i}`, status: `Stage ${i}` }));
    expect(validateSpec({ data: { type: "inline", rows: many }, view: { type: "board", label: "name", stage: "status" } }, many).map((i) => i.message).join(" ")).toMatch(/9 stages make a wide board/);
  });

  test("the question, the guide and the recommendation know the board", () => {
    const spec: WidgetSpec = { data: { type: "inline", rows: rules }, view };
    expect(questionOf(spec, rules).text).toBe("Where is each entry right now, and how many are at each status?");
    expect(questionOf(spec, rules).kind).toBe("detail");
    const guide = explainChart(spec, rules);
    expect(guide).toMatch(/Each column is one status, with how many entries are in it; each card is one entry\./);
    expect(guide).toMatch(/The dot on a card tells its topic/);
    expect(guide).toMatch(/Here, 3 of 6 entries sit in Applies, and DORA has the highest impact, 5\./);
    const pick = recommendCharts(rules, { limit: 10 }).find((p) => p.type === "board");
    expect(pick?.view).toEqual({ type: "board", label: "name", stage: "status", group: "topic", value: "impact" });
  });
});
