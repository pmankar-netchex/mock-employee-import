"use client";

import { useMemo, useState } from "react";
import {
  NETCHEX_FIELDS,
  FIELD_GROUPS,
  groupForOrder,
  type FieldGroup,
} from "@/lib/netchex-spec";
import type { NetchexRecord, ValidationIssue } from "@/lib/types";

type GroupTab = "All" | FieldGroup;

type RowFilter = "all" | "errors" | "warnings" | "ready";

export function PreviewTable({
  records,
  issues,
}: {
  records: NetchexRecord[];
  issues: ValidationIssue[];
}) {
  const [group, setGroup] = useState<GroupTab>("All");
  const [rowFilter, setRowFilter] = useState<RowFilter>("all");

  const issueIndex = useMemo(() => {
    const map = new Map<string, ValidationIssue>();
    for (const i of issues) map.set(`${i.rowIndex}:${i.fieldKey}`, i);
    return map;
  }, [issues]);

  const rowSeverity = useMemo(() => {
    const out = new Array<"ready" | "warnings" | "errors">(records.length).fill(
      "ready",
    );
    for (const i of issues) {
      if (i.severity === "error") out[i.rowIndex] = "errors";
      else if (i.severity === "warning" && out[i.rowIndex] !== "errors")
        out[i.rowIndex] = "warnings";
    }
    return out;
  }, [issues, records.length]);

  const visibleFields = useMemo(() => {
    if (group === "All") return NETCHEX_FIELDS;
    return NETCHEX_FIELDS.filter((f) => groupForOrder(f.order) === group);
  }, [group]);

  const visibleRows = useMemo(() => {
    const out: { rec: NetchexRecord; originalIndex: number }[] = [];
    for (let i = 0; i < records.length; i++) {
      const sev = rowSeverity[i];
      if (rowFilter === "errors" && sev !== "errors") continue;
      if (rowFilter === "warnings" && sev !== "warnings") continue;
      if (rowFilter === "ready" && sev !== "ready") continue;
      out.push({ rec: records[i], originalIndex: i });
    }
    return out;
  }, [records, rowSeverity, rowFilter]);

  if (records.length === 0) return null;

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Preview · {visibleRows.length}/{records.length} rows ·{" "}
          {visibleFields.length}/{NETCHEX_FIELDS.length} columns
        </div>
        <div className="flex items-center gap-2">
          <select
            value={rowFilter}
            onChange={(e) => setRowFilter(e.target.value as RowFilter)}
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-xs"
          >
            <option value="all">All rows</option>
            <option value="errors">Errors only</option>
            <option value="warnings">Warnings only</option>
            <option value="ready">Ready only</option>
          </select>
        </div>
      </div>

      <div className="px-5 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1 overflow-x-auto bg-zinc-50 dark:bg-zinc-950">
        <GroupChip
          active={group === "All"}
          onClick={() => setGroup("All")}
        >
          All
        </GroupChip>
        {FIELD_GROUPS.map((g) => (
          <GroupChip
            key={g}
            active={group === g}
            onClick={() => setGroup(g)}
          >
            {g}
          </GroupChip>
        ))}
      </div>

      <div className="overflow-auto max-h-[600px]">
        <table className="text-xs border-collapse">
          <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800 z-10">
            <tr>
              <th className="px-2 py-2 text-left font-medium text-zinc-500 sticky left-0 bg-zinc-100 dark:bg-zinc-800">
                #
              </th>
              {visibleFields.map((f) => (
                <th
                  key={f.key}
                  className="px-2 py-2 text-left font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap border-l border-zinc-200 dark:border-zinc-700"
                  title={f.description}
                >
                  {f.label || <span className="text-zinc-400">(blank)</span>}
                  {f.required === "required" && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ rec, originalIndex }) => (
              <tr
                key={originalIndex}
                className="border-t border-zinc-100 dark:border-zinc-800"
              >
                <td className="px-2 py-1 text-zinc-400 sticky left-0 bg-white dark:bg-zinc-900">
                  {originalIndex + 1}
                </td>
                {visibleFields.map((f) => {
                  const issue = issueIndex.get(`${originalIndex}:${f.key}`);
                  const cls = issue
                    ? issue.severity === "error"
                      ? "bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-200"
                      : "bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200"
                    : "";
                  return (
                    <td
                      key={f.key}
                      className={`px-2 py-1 whitespace-nowrap border-l border-zinc-100 dark:border-zinc-800 ${cls}`}
                      title={issue?.message}
                    >
                      {rec[f.key] || (
                        <span className="text-zinc-300 dark:text-zinc-700">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td
                  colSpan={visibleFields.length + 1}
                  className="px-4 py-6 text-center text-sm text-zinc-500"
                >
                  No rows match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GroupChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded px-2.5 py-1 text-xs ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}
