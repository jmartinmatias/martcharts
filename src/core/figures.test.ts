import { describe, expect, test } from "vitest";
import { figureRuns } from "./figures.ts";

const figures = (s: string) => figureRuns(s).filter((r) => r.figure).map((r) => r.text);

describe("figureRuns", () => {
  test("amounts, shares and counts are figures; dates and years are words", () => {
    expect(figures("Revenue went from €820K in Oct 2025 to €1.3M in Sep 2026.")).toEqual(["€820K", "€1.3M"]);
    expect(figures("Orders went from 144 on Apr 1, 2026 to 222 on Sep 30, 2026.")).toEqual(["144", "222"]);
    expect(figures("7-day average went from 106 to 158 in Q3, over 24h.")).toEqual(["106", "158"]);
    expect(figures("5 of 20 equally likely outcomes reach the plan, about a 25% chance.")).toEqual(["5", "20", "25%"]);
    expect(figures("Le CA passe de 820 k€ le 7 avr. 2026 à 1\u202f284\u202f000 € ; +3 pts au T3.")).toEqual(["820", "1\u202f284\u202f000 €", "+3 pts"]);
  });

  test("joined back, the runs are the sentence unchanged", () => {
    const sentence = "East is the tallest, with €2,000, 34% of the total.";
    expect(figureRuns(sentence).map((r) => r.text).join("")).toBe(sentence);
  });
});
