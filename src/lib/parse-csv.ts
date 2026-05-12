import Papa from "papaparse";
import type { ParsedSheet } from "./parse-excel";

export function parseCsv(text: string): ParsedSheet {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });
  const headers = result.meta.fields ?? [];
  const rows = result.data.filter((r) =>
    Object.values(r).some((v) => v != null && String(v).trim() !== ""),
  );
  return {
    name: "csv",
    rowCount: rows.length,
    headerRowIndex: 0,
    headers,
    rows,
  };
}
