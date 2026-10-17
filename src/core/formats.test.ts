import { describe, expect, test } from "vitest";
import { formatValue, humanize } from "./display.ts";
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

describe("delta format", () => {
  test("as plain text it is a signed change, a percent by default", () => {
    expect([formatValue(0.124, "delta", en), formatValue(-0.05, "delta", en), formatValue(0, "delta", en)]).toEqual(["+12.4%", "-5.0%", "0.0%"]);
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
  ])("%s becomes %s", (input, expected) => {
    expect(humanize(input)).toBe(expected);
  });
});
