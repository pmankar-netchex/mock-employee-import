import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatSsn,
  formatZip,
  formatMoney,
  splitPhone,
} from "../formatters";

describe("formatDate", () => {
  it("parses MM/DD/YYYY", () => {
    expect(formatDate("04/28/2001")).toBe("04/28/2001");
  });
  it("parses M/D/YY (20xx pivot)", () => {
    expect(formatDate("4/8/24")).toBe("04/08/2024");
  });
  it("parses ISO YYYY-MM-DD", () => {
    expect(formatDate("2001-04-28")).toBe("04/28/2001");
  });
  it("formats Date objects", () => {
    expect(formatDate(new Date(Date.UTC(2001, 3, 28)))).toBe("04/28/2001");
  });
  it("formats Excel serials", () => {
    // 36892 = 1/1/2001 in Excel
    expect(formatDate(36892)).toBe("01/01/2001");
  });
  it("returns null for nonsense", () => {
    expect(formatDate("hello")).toBe(null);
    expect(formatDate("")).toBe(null);
    expect(formatDate(null)).toBe(null);
  });
});

describe("formatSsn", () => {
  it("formats 9 raw digits", () => {
    expect(formatSsn("123456789")).toBe("123-45-6789");
  });
  it("preserves already-formatted SSN", () => {
    expect(formatSsn("171-80-3102")).toBe("171-80-3102");
  });
  it("rejects wrong length", () => {
    expect(formatSsn("12345")).toBe(null);
  });
});

describe("formatZip", () => {
  it("formats 5-digit", () => {
    expect(formatZip("15601")).toBe("15601");
  });
  it("formats 9-digit", () => {
    expect(formatZip("156011234")).toBe("15601-1234");
  });
  it("preserves XXXXX-XXXX", () => {
    expect(formatZip("15601-1234")).toBe("15601-1234");
  });
});

describe("splitPhone", () => {
  it("splits 10-digit formatted phone", () => {
    expect(splitPhone("919-337-3952")).toEqual({
      areaCode: "919",
      number: "337-3952",
    });
  });
  it("splits 10 raw digits", () => {
    expect(splitPhone("9193373952")).toEqual({
      areaCode: "919",
      number: "337-3952",
    });
  });
  it("returns null for 7-digit", () => {
    expect(splitPhone("337-3952")).toBe(null);
  });
});

describe("formatMoney", () => {
  it("strips $ and commas", () => {
    expect(formatMoney("$1,234.56")).toBe("1234.56");
  });
  it("preserves integers", () => {
    expect(formatMoney("55000")).toBe("55000");
  });
  it("preserves decimals", () => {
    expect(formatMoney("97913.92")).toBe("97913.92");
  });
});
