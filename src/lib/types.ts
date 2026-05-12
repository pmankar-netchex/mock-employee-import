import type { NetchexFieldKey } from "./netchex-spec";

export type ColumnMappingEntry =
  | { source: "column"; column: string }
  | { source: "constant"; value: string }
  | { source: "unmapped" };

export type ColumnMapping = Record<string, ColumnMappingEntry>;

// For constrained Netchex fields: map raw client value -> Netchex value.
export type ValueMapping = Record<string, Record<string, string>>;

export type NetchexRecord = Record<NetchexFieldKey, string>;

export type ValidationIssue = {
  rowIndex: number;
  fieldKey: NetchexFieldKey;
  severity: "warning" | "error";
  message: string;
};

export type TransformResult = {
  records: NetchexRecord[];
  issues: ValidationIssue[];
};
