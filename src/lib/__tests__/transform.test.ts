import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";
import { parseExcel } from "../parse-excel";
import { suggestMapping } from "../suggest-mapping";
import { transform } from "../transform";
import { recordsToCsv } from "../csv-export";
import { NETCHEX_FIELDS } from "../netchex-spec";

const FIXTURES = join(__dirname, "fixtures");

describe("end-to-end Phase 1 pipeline (Poythress)", () => {
  const buf = readFileSync(join(FIXTURES, "poythress-commercial-original.xlsx"));
  const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

  it("auto-picks the Data sheet", () => {
    const { selected, sheets } = parseExcel(arrayBuf);
    expect(selected).toBe("Data");
    expect(sheets.map((s) => s.name)).toContain("Header");
  });

  it("parses 14 employee rows", () => {
    const { result } = parseExcel(arrayBuf);
    expect(result.rows.length).toBe(14);
  });

  it("auto-maps at least the core required fields", () => {
    const { result } = parseExcel(arrayBuf);
    const { autoMapping } = suggestMapping(result.headers);
    // Spot-check important fields auto-map
    const mustMap = [
      "firstName",
      "lastName",
      "birthDate",
      "sex",
      "ssn",
      "city",
      "state",
      "zipCode",
      "streetAddress1",
    ];
    for (const k of mustMap) {
      expect(autoMapping[k]?.source, `${k} should auto-map`).toBe("column");
    }
  });

  it("produces a CSV with 68 columns and header row", () => {
    const { result } = parseExcel(arrayBuf);
    const { autoMapping } = suggestMapping(result.headers);
    const { records } = transform({ rows: result.rows, columnMapping: autoMapping });
    expect(records.length).toBe(14);
    const csv = recordsToCsv(records);
    const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: true });
    // header + 14 rows
    expect(parsed.data.length).toBe(15);
    const headerCols = parsed.data[0];
    expect(headerCols.length).toBe(NETCHEX_FIELDS.length); // 68
    // Spacer header is empty string at index 47
    expect(headerCols[47]).toBe("");
    // Account Type preserves trailing tab
    expect(headerCols[53]).toBe("Account Type\t");
  });

  it("formats dates as MM/DD/YYYY", () => {
    const { result } = parseExcel(arrayBuf);
    const { autoMapping } = suggestMapping(result.headers);
    const { records } = transform({ rows: result.rows, columnMapping: autoMapping });
    // Agostoni's birth date in the source is 2001-04-28
    const agostoni = records.find((r) => r.lastName?.toLowerCase() === "agostoni");
    expect(agostoni?.birthDate).toBe("04/28/2001");
  });

  it("preserves SSN format", () => {
    const { result } = parseExcel(arrayBuf);
    const { autoMapping } = suggestMapping(result.headers);
    const { records } = transform({ rows: result.rows, columnMapping: autoMapping });
    const agostoni = records.find((r) => r.lastName?.toLowerCase() === "agostoni");
    expect(agostoni?.ssn).toBe("171-80-3102");
  });
});
