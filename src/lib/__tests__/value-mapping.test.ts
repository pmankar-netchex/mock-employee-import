import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseExcel } from "../parse-excel";
import { suggestMapping } from "../suggest-mapping";
import { distinctValuesForField } from "../distinct-values";
import { autoResolveValue } from "../value-synonyms";
import { transform } from "../transform";
import type { ValueMapping } from "../types";
import { lookupStateCode } from "../state-abbreviations";

const FIXTURES = join(__dirname, "fixtures");

describe("value mapping synonyms", () => {
  it("resolves Sex Male/Female", () => {
    expect(autoResolveValue("sex", "Male")).toBe("M");
    expect(autoResolveValue("sex", "Female")).toBe("F");
    expect(autoResolveValue("sex", "M")).toBe("M");
    expect(autoResolveValue("sex", "male")).toBe("M");
  });
  it("resolves Marital W-4 phrases", () => {
    expect(autoResolveValue("federalMaritalStatus", "Married Filing Jointly"))
      .toBe("M");
    expect(
      autoResolveValue(
        "federalMaritalStatus",
        "Single or Married Filing Separately",
      ),
    ).toBe("S");
  });
  it("resolves Employee Status", () => {
    expect(autoResolveValue("employeeStatus", "Full Time")).toBe("RFT");
    expect(autoResolveValue("employeeStatus", "Part-Time")).toBe("RPT");
  });
  it("resolves state full names to 2-letter", () => {
    expect(lookupStateCode("Pennsylvania")).toBe("PA");
    expect(lookupStateCode("north carolina")).toBe("NC");
    expect(lookupStateCode("DC")).toBe("DC");
    expect(lookupStateCode("xx")).toBe("XX"); // 2-letter pass-through
  });
  it("resolves Y/N variants", () => {
    expect(autoResolveValue("form2020W4", "Yes")).toBe("Y");
    expect(autoResolveValue("form2020W4", "no")).toBe("N");
    expect(autoResolveValue("form2020W4", "true")).toBe("Y");
  });
});

describe("value mapping applied through transform (Poythress)", () => {
  const buf = readFileSync(join(FIXTURES, "poythress-commercial-original.xlsx"));
  const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  it("translates Pennsylvania -> PA and Male -> M", () => {
    const { result } = parseExcel(arrayBuf);
    const { autoMapping } = suggestMapping(result.headers);

    // Build a value mapping using auto-resolved synonyms.
    const valueMapping: ValueMapping = {};
    for (const k of ["sex", "state"] as const) {
      const distinct = distinctValuesForField(result.rows, autoMapping, k);
      const m: Record<string, string> = {};
      for (const d of distinct) {
        const v = autoResolveValue(k, d.value);
        if (v) m[d.value] = v;
      }
      valueMapping[k] = m;
    }

    const { records } = transform({
      rows: result.rows,
      columnMapping: autoMapping,
      valueMapping,
    });
    const agostoni = records.find(
      (r) => r.lastName?.toLowerCase() === "agostoni",
    );
    expect(agostoni?.sex).toBe("M");
    expect(agostoni?.state).toBe("PA");
    const dickerson = records.find(
      (r) => r.lastName?.toLowerCase() === "dickerson",
    );
    expect(dickerson?.sex).toBe("F");
    expect(dickerson?.state).toBe("NC");
  });

  it("distinct-values scans correctly", () => {
    const { result } = parseExcel(arrayBuf);
    const { autoMapping } = suggestMapping(result.headers);
    const sex = distinctValuesForField(result.rows, autoMapping, "sex");
    const states = distinctValuesForField(result.rows, autoMapping, "state");
    // Poythress has Male, Female, "Not Specified" possibly
    const sexValues = new Set(sex.map((s) => s.value));
    expect(sexValues.has("Male")).toBe(true);
    expect(sexValues.has("Female")).toBe(true);
    expect(states.length).toBeGreaterThanOrEqual(1);
    const stateValues = new Set(states.map((s) => s.value));
    expect(stateValues.has("North Carolina")).toBe(true);
  });
});
