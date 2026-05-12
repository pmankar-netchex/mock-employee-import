import { NETCHEX_FIELDS } from "./netchex-spec";
import { distinctValuesForField } from "./distinct-values";
import type { ColumnMapping, ValueMapping } from "./types";

export type StepStatus = "locked" | "todo" | "inProgress" | "complete";

export type StepProgress = {
  status: StepStatus;
  hint: string; // short status line, e.g. "12/67 mapped"
};

const REAL_FIELDS = NETCHEX_FIELDS.filter((f) => !f.isSpacer);

export function computeProgress(input: {
  hasParsed: boolean;
  fileName?: string;
  rowCount?: number;
  columnMapping: ColumnMapping;
  valueMapping: ValueMapping;
  rows?: Record<string, unknown>[];
}): {
  upload: StepProgress;
  columns: StepProgress;
  values: StepProgress;
  preview: StepProgress;
} {
  if (!input.hasParsed) {
    return {
      upload: { status: "inProgress", hint: "" },
      columns: { status: "locked", hint: "" },
      values: { status: "locked", hint: "" },
      preview: { status: "locked", hint: "" },
    };
  }

  // Upload
  const upload: StepProgress = {
    status: "complete",
    hint: input.fileName
      ? `${input.fileName} · ${input.rowCount ?? 0} rows`
      : "Loaded",
  };

  // Columns
  const totalFields = REAL_FIELDS.length;
  const requiredFields = REAL_FIELDS.filter((f) => f.required === "required");
  const mappedFields = REAL_FIELDS.filter((f) => {
    const e = input.columnMapping[f.key];
    return e && e.source !== "unmapped";
  }).length;
  const requiredMissing = requiredFields.filter((f) => {
    const e = input.columnMapping[f.key];
    return !e || e.source === "unmapped";
  }).length;
  const columns: StepProgress = {
    status:
      requiredMissing === 0 && mappedFields > 0
        ? "complete"
        : mappedFields > 0
          ? "inProgress"
          : "todo",
    hint:
      requiredMissing > 0
        ? `${mappedFields}/${totalFields} mapped · ${requiredMissing} required missing`
        : `${mappedFields}/${totalFields} mapped`,
  };

  // Values — only count fields with enum constraints + column mappings.
  const rows = input.rows ?? [];
  let totalDistinct = 0;
  let mappedDistinct = 0;
  for (const f of REAL_FIELDS) {
    const e = input.columnMapping[f.key];
    if (!e || e.source !== "column") continue;
    const hasEnum = !!f.allowedValues && f.allowedValues.length > 0;
    if (!hasEnum) continue;
    const distinct = distinctValuesForField(rows, input.columnMapping, f.key);
    totalDistinct += distinct.length;
    const m = input.valueMapping[f.key] ?? {};
    mappedDistinct += distinct.filter((d) => !!m[d.value]).length;
  }
  const values: StepProgress = {
    status:
      totalDistinct === 0
        ? "complete"
        : mappedDistinct === totalDistinct
          ? "complete"
          : mappedDistinct > 0
            ? "inProgress"
            : "todo",
    hint:
      totalDistinct === 0
        ? "Nothing to translate"
        : `${mappedDistinct}/${totalDistinct} values mapped`,
  };

  // Preview
  const preview: StepProgress = {
    status: requiredMissing === 0 ? "complete" : "todo",
    hint:
      requiredMissing === 0
        ? "Ready to download"
        : `Resolve ${requiredMissing} required field${requiredMissing === 1 ? "" : "s"}`,
  };

  return { upload, columns, values, preview };
}
