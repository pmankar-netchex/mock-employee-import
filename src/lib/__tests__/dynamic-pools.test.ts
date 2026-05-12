import { describe, it, expect } from "vitest";
import { transform } from "../transform";
import { DYNAMIC_POOLS, getPool, getPoolOption } from "../dynamic-pools";
import { newHireFields, NETCHEX_FIELDS } from "../netchex-spec";
import type { ColumnMapping } from "../types";

describe("dynamic pools", () => {
  it("exposes payroll-group-codes and workers-comp-codes", () => {
    expect(getPool("payroll-group-codes")?.options.length).toBeGreaterThan(0);
    expect(getPool("workers-comp-codes")?.options.length).toBeGreaterThan(0);
  });

  it("payrollGroupCode field declares payroll-group-codes pool", () => {
    const f = NETCHEX_FIELDS.find((x) => x.key === "payrollGroupCode");
    expect(f?.dynamicPools).toContain("payroll-group-codes");
  });

  it("jobCode field declares workers-comp-codes pool", () => {
    const f = NETCHEX_FIELDS.find((x) => x.key === "jobCode");
    expect(f?.dynamicPools).toContain("workers-comp-codes");
  });

  it("can look up an option by code", () => {
    const opt = getPoolOption("payroll-group-codes", "BiWklyHrly");
    expect(opt?.label).toBe("Bi-Weekly Hourly");
  });
});

describe("Constant value picks from a Netchex pool", () => {
  it("applies the constant pool value to every row", () => {
    const mapping: ColumnMapping = {
      firstName: { source: "column", column: "FN" },
      lastName: { source: "column", column: "LN" },
      payrollGroupCode: { source: "constant", value: "BiWklyHrly" },
    };
    const { records } = transform({
      rows: [
        { FN: "Alice", LN: "Smith" },
        { FN: "Bob", LN: "Jones" },
      ],
      columnMapping: mapping,
    });
    expect(records[0].payrollGroupCode).toBe("BiWklyHrly");
    expect(records[1].payrollGroupCode).toBe("BiWklyHrly");
  });
});

describe("cell overrides win over computed values", () => {
  it("applies an override to a single row", () => {
    const mapping: ColumnMapping = {
      firstName: { source: "column", column: "FN" },
      lastName: { source: "column", column: "LN" },
    };
    const { records } = transform({
      rows: [
        { FN: "Alice", LN: "Smith" },
        { FN: "Bob", LN: "Jones" },
      ],
      columnMapping: mapping,
      cellOverrides: { 1: { firstName: "Robert" } },
    });
    expect(records[0].firstName).toBe("Alice");
    expect(records[1].firstName).toBe("Robert");
  });

  it("overrides bypass formatters (user input is authoritative)", () => {
    const mapping: ColumnMapping = {
      ssn: { source: "column", column: "S" },
    };
    const { records } = transform({
      rows: [{ S: "123456789" }],
      columnMapping: mapping,
      cellOverrides: { 0: { ssn: "999-99-9999" } },
    });
    expect(records[0].ssn).toBe("999-99-9999");
  });
});

describe("direct deposit fields are excluded from the new-hire flow", () => {
  it("newHireFields() does not include any directDeposit fields", () => {
    const keys = newHireFields().map((f) => f.key);
    expect(keys).not.toContain("ddOrder");
    expect(keys).not.toContain("ddRoutingNumber");
    expect(keys).not.toContain("ddAccountType");
  });

  it("all 9 DD fields stay in NETCHEX_FIELDS so the CSV keeps 68 columns", () => {
    const ddKeys = NETCHEX_FIELDS.filter(
      (f) => f.category === "directDeposit",
    ).map((f) => f.key);
    expect(ddKeys.length).toBe(9);
  });
});
