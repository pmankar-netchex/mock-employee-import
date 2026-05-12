import { describe, it, expect } from "vitest";
import { transform } from "../transform";
import type { ColumnMapping } from "../types";

describe("name splitting", () => {
  const mapping: ColumnMapping = {
    firstName: { source: "column", column: "Full" },
    lastName: { source: "column", column: "Full" },
  };

  it('splits "Last, First Middle" comma form', () => {
    const { records } = transform({
      rows: [{ Full: "Doe, John P" }],
      columnMapping: mapping,
    });
    expect(records[0].firstName).toBe("John");
    expect(records[0].middleName).toBe("P");
    expect(records[0].lastName).toBe("Doe");
  });

  it('splits "First Middle Last" whitespace form', () => {
    const { records } = transform({
      rows: [{ Full: "Mary Jane Watson" }],
      columnMapping: mapping,
    });
    expect(records[0].firstName).toBe("Mary");
    expect(records[0].middleName).toBe("Jane");
    expect(records[0].lastName).toBe("Watson");
  });

  it('handles "First Last"', () => {
    const { records } = transform({
      rows: [{ Full: "Juan Rivera" }],
      columnMapping: mapping,
    });
    expect(records[0].firstName).toBe("Juan");
    expect(records[0].middleName).toBe("");
    expect(records[0].lastName).toBe("Rivera");
  });

  it("keeps suffix on Last Name (no Suffix field in spec)", () => {
    const { records } = transform({
      rows: [{ Full: "Harry L Polk Jr" }],
      columnMapping: mapping,
    });
    expect(records[0].firstName).toBe("Harry");
    expect(records[0].lastName).toBe("Jr");
    expect(records[0].middleName).toBe("L Polk");
  });

  it("does not split when first/last mapped to different columns", () => {
    const { records } = transform({
      rows: [{ FN: "Mary Jane", LN: "Watson" }],
      columnMapping: {
        firstName: { source: "column", column: "FN" },
        lastName: { source: "column", column: "LN" },
      },
    });
    expect(records[0].firstName).toBe("Mary Jane");
    expect(records[0].lastName).toBe("Watson");
  });
});

describe("conditional-required validation", () => {
  it("flags missing Personal Email when PCM=E", () => {
    const { issues } = transform({
      rows: [
        {
          PCM: "E",
        },
      ],
      columnMapping: {
        primaryContactMethod: { source: "column", column: "PCM" },
      },
    });
    const missing = issues.find(
      (i) => i.fieldKey === "personalEmail" && i.severity === "error",
    );
    expect(missing).toBeTruthy();
  });

  it("flags missing cell phone fields when PCM=P", () => {
    const { issues } = transform({
      rows: [
        {
          PCM: "P",
        },
      ],
      columnMapping: {
        primaryContactMethod: { source: "column", column: "PCM" },
      },
    });
    expect(
      issues.some(
        (i) => i.fieldKey === "cellPhoneAreaCode" && i.severity === "error",
      ),
    ).toBe(true);
    expect(
      issues.some(
        (i) => i.fieldKey === "cellPhoneNumber" && i.severity === "error",
      ),
    ).toBe(true);
  });

  it("flags missing State Min Wage when Classification=TIP", () => {
    const { issues } = transform({
      rows: [{ C: "TIP" }],
      columnMapping: {
        classification: { source: "column", column: "C" },
      },
    });
    expect(
      issues.some(
        (i) => i.fieldKey === "stateMinWage" && i.severity === "error",
      ),
    ).toBe(true);
  });

  it("flags missing DD fields when partial DD data is present", () => {
    const { issues } = transform({
      rows: [{ Routing: "123456789" }],
      columnMapping: {
        ddRoutingNumber: { source: "column", column: "Routing" },
      },
    });
    // Routing is filled but Account Number, Order, etc. are not
    expect(
      issues.some(
        (i) => i.fieldKey === "ddAccountNumber" && i.severity === "error",
      ),
    ).toBe(true);
    expect(
      issues.some((i) => i.fieldKey === "ddOrder" && i.severity === "error"),
    ).toBe(true);
  });

  it("requires Partial Amount + Type when Deposit amount=Partial", () => {
    const { issues } = transform({
      rows: [
        {
          O: "1",
          R: "123456789",
          A: "111",
          T: "Checking",
          D: "01/01/2026",
          S: "Deposit",
          DA: "Partial",
        },
      ],
      columnMapping: {
        ddOrder: { source: "column", column: "O" },
        ddRoutingNumber: { source: "column", column: "R" },
        ddAccountNumber: { source: "column", column: "A" },
        ddAccountType: { source: "column", column: "T" },
        ddEffectiveDate: { source: "column", column: "D" },
        ddStatus: { source: "column", column: "S" },
        ddDepositAmount: { source: "column", column: "DA" },
      },
    });
    expect(
      issues.some(
        (i) => i.fieldKey === "ddPartialAmount" && i.severity === "error",
      ),
    ).toBe(true);
    expect(
      issues.some(
        (i) => i.fieldKey === "ddPartialAmountType" && i.severity === "error",
      ),
    ).toBe(true);
  });
});
