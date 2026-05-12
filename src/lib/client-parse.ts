// Browser-side parsing entrypoint. xlsx and papaparse both run in the browser,
// so file ingestion happens directly without a server round-trip. Same shape
// as the (removed) /api/parse response.

import { parseExcel, parseExcelSheet } from "./parse-excel";
import { parseCsv } from "./parse-csv";

export type ClientParseResult = {
  kind: "csv" | "xlsx";
  sheets: { name: string; rowCount: number }[];
  selectedSheet: string;
  headerRowIndex: number;
  headers: string[];
  rows: Record<string, unknown>[];
};

const MAX_BYTES = 25 * 1024 * 1024;

export async function parseFileInBrowser(
  file: File,
  sheet?: string,
): Promise<ClientParseResult> {
  if (file.size === 0) throw new Error("Uploaded file is empty.");
  if (file.size > MAX_BYTES) {
    throw new Error(`File exceeds size limit (${MAX_BYTES} bytes).`);
  }

  const name = file.name.toLowerCase();
  const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");
  const isCsv = name.endsWith(".csv");

  if (!isExcel && !isCsv) {
    throw new Error("Only .xlsx, .xls, and .csv files are supported.");
  }

  if (isCsv) {
    const text = await file.text();
    const parsed = parseCsv(text);
    return {
      kind: "csv",
      sheets: [{ name: "csv", rowCount: parsed.rowCount }],
      selectedSheet: "csv",
      headerRowIndex: 0,
      headers: parsed.headers,
      rows: parsed.rows,
    };
  }

  const buffer = await file.arrayBuffer();
  if (sheet) {
    const parsed = parseExcelSheet(buffer, sheet);
    return {
      kind: "xlsx",
      sheets: [{ name: parsed.name, rowCount: parsed.rowCount }],
      selectedSheet: parsed.name,
      headerRowIndex: parsed.headerRowIndex,
      headers: parsed.headers,
      rows: parsed.rows,
    };
  }
  const { sheets, selected, result } = parseExcel(buffer);
  return {
    kind: "xlsx",
    sheets,
    selectedSheet: selected,
    headerRowIndex: result.headerRowIndex,
    headers: result.headers,
    rows: result.rows,
  };
}
