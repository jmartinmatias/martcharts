import { describe, expect, test } from "vitest";
import { recommendCharts } from "./recommend.ts";
import type { Row } from "./types.ts";

const types = (rows: Row[]) => recommendCharts(rows, { limit: 8 }).map((pick) => pick.type);
const top = (rows: Row[]) => recommendCharts(rows)[0]?.type;

describe("the five views that used to be missing from recommendations", () => {
  test("list: a few records with a name and a second line, nothing to measure, read best as a list", () => {
    const people = [
      { name: "Aurora Logistics", country: "Luxembourg" },
      { name: "Beacon Health", country: "Germany" },
      { name: "Cobalt Foods", country: "France" },
      { name: "Delta Retail", country: "Belgium" },
    ];
    expect(top(people)).toBe("list");
    // With one category and a number, it is a ranking: the bars keep the top spot and no list is offered.
    const ranking = [{ name: "Aurora", revenue: 214 }, { name: "Beacon", revenue: 196 }, { name: "Cobalt", revenue: 88 }];
    expect(top(ranking)).not.toBe("list");
    expect(types(ranking)).not.toContain("list");
    // A long table of records is a table's job, not a list's.
    expect(types(Array.from({ length: 30 }, (_, i) => ({ name: `Client ${i}`, country: "LU" })))).not.toContain("list");
  });

  test("waffle: shares that add up to 100 in a handful of parts, ahead of the donut", () => {
    const mix = [{ channel: "Branch", share: 46 }, { channel: "Online", share: 38 }, { channel: "Partner", share: 16 }];
    const picks = types(mix);
    expect(picks).toContain("waffle");
    expect(picks.indexOf("waffle")).toBeLessThan(picks.indexOf("donut"));
    // Amounts that are not shares of one whole: no squares to count.
    expect(types([{ channel: "Branch", revenue: 460 }, { channel: "Online", revenue: 380 }, { channel: "Partner", revenue: 90 }])).not.toContain("waffle");
  });

  test("likert: answer counts on one ordered scale, one row per question, at the top", () => {
    const survey = [
      { question: "I know my goals", disagree: 12, neutral: 30, agree: 58 },
      { question: "I get feedback", disagree: 25, neutral: 35, agree: 40 },
      { question: "I would recommend us", disagree: 8, neutral: 22, agree: 70 },
    ];
    expect(top(survey)).toBe("likert");
    // Three measures with ordinary names are not answers on a scale.
    expect(types([{ region: "North", revenue: 1, cost: 2, margin: 3 }, { region: "South", revenue: 4, cost: 5, margin: 6 }])).not.toContain("likert");
  });

  test("rose: a full cycle of hours, weekdays or months is offered as a dial", () => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, "0")}:00`, visits: 100 + ((h * 37) % 90) }));
    expect(types(hours)).toContain("rose");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, i) => ({ month, orders: 40 + i }));
    expect(types(months)).toContain("rose");
    // A dozen ordinary categories do not wrap round: no dial.
    expect(types(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map((team, i) => ({ team, orders: i })))).not.toContain("rose");
    // A cycle that is not complete is not offered either.
    expect(types(hours.slice(0, 20))).not.toContain("rose");
  });

  test("locator: named places on a basemap with nothing to measure; with a measure it steps aside for the shaded map", () => {
    const offices = [
      { office: "Luxembourg HQ", country: "LU" },
      { office: "Paris", country: "FR" },
      { office: "Frankfurt", country: "DE" },
      { office: "Milan", country: "IT" },
    ];
    expect(top(offices)).toBe("locator");
    const measured = offices.map((row, i) => ({ ...row, revenue: 100 + i * 20 }));
    const picks = types(measured);
    expect(picks).toContain("choropleth");
    expect(picks.indexOf("choropleth")).toBeLessThan(picks.indexOf("locator") === -1 ? Infinity : picks.indexOf("locator"));
    // Places that sit on no basemap get no map.
    expect(types([{ office: "A", city: "Lux" }, { office: "B", city: "Par" }, { office: "C", city: "Fra" }])).not.toContain("locator");
  });

  test("every pick is a complete view: the new rules fill every required option", () => {
    const cases: Row[][] = [
      [{ name: "A", country: "Luxembourg" }, { name: "B", country: "France" }],
      [{ channel: "Branch", share: 60 }, { channel: "Online", share: 40 }],
      [{ question: "Q1", disagree: 1, neutral: 2, agree: 3 }, { question: "Q2", disagree: 3, neutral: 2, agree: 1 }],
      [{ office: "HQ", country: "LU" }, { office: "Paris", country: "FR" }, { office: "Milan", country: "IT" }],
    ];
    for (const rows of cases) {
      const pick = recommendCharts(rows)[0];
      expect(pick?.view.type).toBe(pick?.type);
      expect(pick?.why).toMatch(/\.$/);
    }
  });
});
