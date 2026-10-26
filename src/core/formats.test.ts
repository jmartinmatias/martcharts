// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { formatNode, formatValue, humanize } from "./display.ts";
import { registerFormat } from "./registry.ts";

const en = "en-US";

describe("number format", () => {
  test("groups thousands", () => {
    expect(formatValue(1234.5, "number", en)).toBe("1,234.5");
  });

  test("decimals fixes the number of decimal places", () => {
    expect(formatValue(1234.5, { type: "number", decimals: 2 }, en)).toBe("1,234.50");
  });

  test("compact shortens large numbers", () => {
    expect(formatValue(1_234_567, { type: "number", compact: true }, en)).toBe("1.2M");
  });

  test("follows the locale", () => {
    expect(formatValue(1234.5, "number", "de-DE")).toBe("1.234,5");
  });

  test("reads numbers stored as text", () => {
    expect(formatValue("1234", "number", en)).toBe("1,234");
  });
});

describe("currency format", () => {
  test("shows the currency symbol with two decimals", () => {
    expect(formatValue(1234.5, { type: "currency", currency: "EUR" }, en)).toBe("€1,234.50");
  });

  test("defaults to USD", () => {
    expect(formatValue(3, "currency", en)).toBe("$3.00");
  });

  test("compact shortens large amounts", () => {
    expect(formatValue(4_200_000, { type: "currency", currency: "USD", compact: true }, en)).toBe("$4.2M");
  });
});

describe("percent format", () => {
  test("treats the value as a ratio", () => {
    expect(formatValue(0.256, "percent", en)).toBe("26%");
  });

  test("decimals adds precision", () => {
    expect(formatValue(0.256, { type: "percent", decimals: 1 }, en)).toBe("25.6%");
  });
});

describe("date format", () => {
  test("medium by default, without shifting date-only values across time zones", () => {
    expect(formatValue("2026-03-05", "date", en)).toBe("Mar 5, 2026");
  });

  test("style month shows month and year", () => {
    expect(formatValue("2026-03-05", { type: "date", style: "month" }, en)).toBe("Mar 2026");
  });

  test("style day shows month and day, short enough for a weekly axis", () => {
    expect(formatValue("2026-03-05", { type: "date", style: "day" }, en)).toBe("Mar 5");
  });

  test("a value that is not a date comes back as text", () => {
    expect(formatValue("soon", "date", en)).toBe("soon");
  });
});

describe("text format", () => {
  test("turns anything into text", () => {
    expect(formatValue(42, "text", en)).toBe("42");
  });
});

describe("badge format", () => {
  test("as plain text it is just the value", () => {
    expect(formatValue("Complete", { type: "badge", tones: { Complete: "positive" } }, en)).toBe("Complete");
  });
});

describe("spark format", () => {
  test("as plain text it shows where the trend starts and ends", () => {
    expect(formatValue([3, 5, 4, 6], "spark", en)).toBe("3 → 6");
  });

  test("anything that is not a list stays as it is", () => {
    expect(formatValue("n/a", "spark", en)).toBe("n/a");
  });
});

describe("bar format", () => {
  test("as plain text it shows the number in its own inner format", () => {
    expect(formatValue(1200, { type: "bar", format: { type: "currency", currency: "EUR", decimals: 0 } }, en)).toBe("€1,200");
    expect(formatValue(1234.5, "bar", en)).toBe("1.2K");
  });
});

describe("compact with decimals", () => {
  test("the decimals asked for win over the compact default of one", () => {
    const money = (decimals: number) => ({ type: "currency", currency: "EUR", compact: true, decimals });
    expect([formatValue(188500, money(0), en), formatValue(188500, money(2), en), formatValue(188500, { type: "number", compact: true, decimals: 0 }, en)]).toEqual(["€189K", "€188.50K", "189K"]);
  });
});

describe("negative numbers", () => {
  test("print a true minus sign, as wide as the plus it pairs with and read as minus", () => {
    expect([formatValue(-84000, { type: "currency", currency: "EUR", compact: true }, en), formatValue(-12, undefined, en), formatValue(-0.05, "percent", en)]).toEqual(["\u2212€84K", "\u221212", "\u22125%"]);
  });

  test("a delta cell, drawn as its own element in a table, signs with the true minus too", () => {
    const cell = formatNode(-0.068, "delta", en, new DOMParser().parseFromString("<p></p>", "text/html"));
    expect(cell.textContent).toBe("\u25BC\u22126.8%");
  });

  test("dates, ranges and text keep their hyphens", () => {
    expect([formatValue("2026-09-15", undefined, en), formatValue("10-12", undefined, en), formatValue("-", undefined, en)]).toEqual(["2026-09-15", "10-12", "-"]);
  });
});

describe("delta format", () => {
  test("as plain text it is a signed change, a percent by default", () => {
    expect([formatValue(0.124, "delta", en), formatValue(-0.05, "delta", en), formatValue(0, "delta", en)]).toEqual(["+12.4%", "\u22125.0%", "0.0%"]);
  });

  test("an inner format changes the kind of number, still signed", () => {
    expect(formatValue(1200, { type: "delta", format: { type: "currency", currency: "EUR", decimals: 0 } }, en)).toBe("+€1,200");
  });
});

describe("heat format", () => {
  test("as plain text it is the number in its inner format", () => {
    expect(formatValue(1200, { type: "heat", format: { type: "currency", currency: "EUR", decimals: 0 } }, en)).toBe("€1,200");
  });
});

describe("formatValue", () => {
  test("missing values become empty text in every format", () => {
    for (const format of ["number", "currency", "percent", "date", "text"]) {
      expect([formatValue(null, format, en), formatValue(undefined, format, en), formatValue(Number.NaN, format, en)]).toEqual(["", "", ""]);
    }
  });

  test("without a format, numbers get number formatting and text stays as is", () => {
    expect(formatValue(1234.5, undefined, en)).toBe("1,234.5");
    expect(formatValue("North", undefined, en)).toBe("North");
  });

  test("an unknown format throws and names the ones that exist", () => {
    expect(() => formatValue(1, "roman", en)).toThrow(/^Unknown format "roman"\. Available: .*\bcurrency\b.*\bpercent\b.*\.$/);
  });

  test("a registered custom format can be used", () => {
    registerFormat({
      type: "test-stars",
      description: "Stars",
      options: {},
      format: (value) => "*".repeat(Number(value)),
    });
    expect(formatValue(3, "test-stars", en)).toBe("***");
  });
});

describe("humanize", () => {
  test.each([
    ["region", "Region"],
    ["unitPrice", "Unit price"],
    ["revenue_eur", "Revenue eur"],
    ["open-tickets", "Open tickets"],
    ["KPI", "KPI"],
    // Sales abbreviations keep their capitals, so a sentence never says "kpi".
    ["kpi", "KPI"],
    ["nps_score", "NPS score"],
    ["arr", "ARR"],
  ])("%s becomes %s", (input, expected) => {
    expect(humanize(input)).toBe(expected);
  });
});

test("a quarter reads as the reader says it: a key such as 2026-Q4 in any date style, and any date in the quarter style", async () => {
  const { formatValue } = await import("./display.ts");
  expect([
    formatValue("2026-Q4", { type: "date" }, "en-US"),
    formatValue("2026Q1", { type: "date", style: "month" }, "en-US"),
    formatValue("2026-Q4", { type: "date" }, "fr-FR"),
    formatValue("2026-10-05", { type: "date", style: "quarter" }, "en-US"),
    formatValue("2026-03-31", { type: "date", style: "quarter" }, "de-DE"),
  ]).toEqual(["Q4 2026", "Q1 2026", "T4 2026", "Q4 2026", "Q1 2026"]);
});
