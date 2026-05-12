import Papa from "papaparse";
import { NETCHEX_FIELDS, type NetchexFieldKey } from "./netchex-spec";
import type { NetchexRecord } from "./types";

export function recordsToCsv(records: NetchexRecord[]): string {
  const headers = NETCHEX_FIELDS.map((f) => f.label);
  const rows = records.map((rec) =>
    NETCHEX_FIELDS.map((f) => rec[f.key as NetchexFieldKey] ?? ""),
  );
  return Papa.unparse(
    { fields: headers, data: rows },
    { quotes: false, newline: "\r\n" },
  );
}
