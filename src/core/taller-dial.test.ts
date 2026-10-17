import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import { createLocalFetch } from "../mcp/store.ts";
import { runPipeline } from "./pipeline.ts";
import { createVariants, profileData } from "./taller.ts";
import type { Variant } from "./taller.ts";
import type { Row, WidgetSpec } from "./types.ts";

/**
 * Every version the two moves that make a dial (reveal, reform) can give, across seeds, colors and marks. With room
 * for every form those moves know, a dial that fits the data always shows up.
 */
const everything = (spec: WidgetSpec, rows: Row[]) => {
  const out: Variant[] = [];
  for (let seed = 1; seed <= 4; seed++) for (const color of [-1, 0, 1]) for (const marks of [-1, 0, 1]) out.push(...createVariants(spec, rows, { count: 24, seed, color, marks, moves: ["reveal", "reform"] }));
  return out;
};
const dials = (versions: Variant[]) => versions.filter((v) => v.spec.view?.type === "rose");
/** The titles of the dials among some versions, each once. */
const dialTitles = (versions: Variant[]) => [...new Set(dials(versions).map((v) => v.title))];

/** Bars of one number per label: the plainest chart a dial could be made from. */
const bars = (field: string, labels: string[]) => {
  const rows: Row[] = labels.map((label, i) => ({ [field]: label, orders: 120 + ((i * 37) % 90) }));
  const spec: WidgetSpec = { title: `Orders by ${field}`, data: { type: "inline", rows }, view: { type: "bar", x: field, y: "orders" } };
  return [spec, rows] as const;
};
const month = (start: number, i: number) => `${Math.floor((start + i) / 12)}-${String(((start + i) % 12) + 1).padStart(2, "0")}`;
/** A line of one number per month, from a month key such as 2025-10. */
const monthly = (count: number, from = "2026-01") => {
  const [year, first] = from.split("-").map(Number) as [number, number];
  const rows: Row[] = Array.from({ length: count }, (_, i) => ({ month: month(year * 12 + first - 1, i), revenue: 800 + i * 40 }));
  const spec: WidgetSpec = { title: "Revenue", data: { type: "inline", rows }, view: { type: "line", x: "month", y: "revenue" } };
  return [spec, rows] as const;
};

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

describe("a clock dial is only for labels that come round again", () => {
  test("teams and regions never get a dial: they do not come round again", () => {
    const teams = bars("team", ["Technical", "Data", "SMB", "Partners", "Billing", "Security", "Onboarding", "Enterprise"]);
    const regions = bars("region", ["North", "South", "East", "West", "Central", "Coast", "Mountain", "Islands", "Capital", "Border"]);
    for (const [spec, rows] of [teams, regions]) {
      const versions = everything(spec, rows);
      expect([spec.title, versions.length > 0, dialTitles(versions)]).toEqual([spec.title, true, []]);
    }
  });

  test("hours of the day, weekdays and the months of one year can be a dial, round their own labels", () => {
    const cycles = [
      bars("hour", HOURS),
      bars("hour", ["9", "10", "11", "12", "13", "14", "15", "16", "17", "18"]),
      bars("day", WEEKDAYS),
      bars("weekday", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
      bars("month", MONTHS),
      bars("month", MONTHS.map((m) => m.slice(0, 3))),
      monthly(12),
      // Twelve months running across the new year are still one year: each month comes once.
      monthly(12, "2025-10"),
    ];
    for (const [spec, rows] of cycles) {
      const label = String(spec.view?.x);
      const found = dials(everything(spec, rows));
      expect([rows[0]?.[label], found.length > 0, found.every((v) => v.spec.view?.label === label)]).toEqual([rows[0]?.[label], true, true]);
    }
  });

  test("a dated series longer than one cycle is not a dial: 18 months, two weeks of days, 92 days", () => {
    const days = (count: number) => {
      const rows: Row[] = Array.from({ length: count }, (_, i) => ({ day: new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10), orders: 40 + ((i * 13) % 25) }));
      const spec: WidgetSpec = { title: "Orders", data: { type: "inline", rows }, view: { type: "line", x: "day", y: "orders" } };
      return [spec, rows] as const;
    };
    for (const [spec, rows] of [monthly(18, "2025-01"), days(14), days(92)]) {
      const versions = everything(spec, rows);
      expect([rows.length, versions.length > 0, dialTitles(versions)]).toEqual([rows.length, true, []]);
    }
  });

  test("numbers are hours only in a field named for hours; quarters and seasons read as cycles too", () => {
    const cycles = (field: string, labels: string[]) => profileData(...bars(field, labels)).cycles;
    const keys = (count: number) => monthly(count)[1].map((row) => String(row.month));
    const numbers = ["1", "2", "3", "4", "5", "6", "7", "8"];
    expect([cycles("hour", numbers), cycles("store", numbers), cycles("rank", numbers)]).toEqual([["hour"], [], []]);
    expect([cycles("quarter", ["Q1", "Q2", "Q3", "Q4"]), cycles("season", ["Spring", "Summer", "Autumn", "Winter"])]).toEqual([["quarter"], ["season"]]);
    // Names that only start like a weekday or a month are not one: Sunbelt, Marketing, Monterey.
    expect(cycles("region", ["Sunbelt", "Marketing", "Monterey", "Junction", "Saturn", "Decatur"])).toEqual([]);
    expect([cycles("day", WEEKDAYS), cycles("month", keys(12)), cycles("month", keys(13))]).toEqual([["day"], ["month"], []]);
  });
});

describe("the stored widgets", () => {
  const read = (name: string) => JSON.parse(readFileSync(join("widgets", `${name}.json`), "utf8")) as WidgetSpec;
  const rowsOf = new Map<string, Row[]>();
  const LOSE = ["response-time-by-team", "ticket-causes", "customer-treemap", "deal-histogram", "feature-adoption", "opex-variance", "product-compare", "launch-plan", "cash-forecast", "revenue-forecast"];
  const KEEP = ["monthly-revenue", "revenue-vs-target", "product-mix-trend"];
  beforeAll(async () => {
    const fetch = createLocalFetch("public");
    for (const name of [...LOSE, ...KEEP, "visits-by-hour"]) rowsOf.set(name, await runPipeline(read(name), { fetch }));
  });

  test("teams, causes, customers, deals, features, departments, attributes, tasks and the 18-month forecasts lose their dial", () => {
    for (const name of LOSE) expect([name, dials(everything(read(name), rowsOf.get(name) ?? [])).length]).toEqual([name, 0]);
  });

  test("twelve months of one year and the six months of a half year keep theirs", () => {
    for (const name of KEEP) expect([name, dials(everything(read(name), rowsOf.get(name) ?? [])).length > 0]).toEqual([name, true]);
  });

  test("visits by hour is read as the hours of one day: drawn as bars, its rows get their dial back", () => {
    const [spec, rows] = [read("visits-by-hour"), rowsOf.get("visits-by-hour") ?? []];
    expect(profileData(spec, rows).cycles).toEqual(["hour"]);
    const found = dials(everything({ ...spec, view: { type: "bar", x: "hour", y: "Desktop" } }, rows));
    expect([found.length > 0, found.every((v) => v.spec.view?.label === "hour")]).toEqual([true, true]);
  });
});
