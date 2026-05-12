"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWorkflow } from "@/context/WorkflowContext";
import { PreviewTable } from "@/components/PreviewTable";
import { EmptyState } from "@/components/EmptyState";
import { transform } from "@/lib/transform";
import { recordsToCsv } from "@/lib/csv-export";

export default function PreviewPage() {
  const router = useRouter();
  const { state, setCellOverride, clearCellOverride } = useWorkflow();
  const parsed = state.parsed;

  const result = useMemo(() => {
    if (!parsed) return null;
    return transform({
      rows: parsed.rows,
      columnMapping: state.columnMapping,
      valueMapping: state.valueMapping,
      cellOverrides: state.cellOverrides,
    });
  }, [parsed, state.columnMapping, state.valueMapping, state.cellOverrides]);

  if (!parsed) {
    return (
      <EmptyState
        title="Upload a client file to start mapping"
        description="The Preview step renders the fully-transformed Netchex import alongside any validation warnings, then lets you download the final CSV."
        actionLabel="Go to upload"
        onAction={() => router.push("/upload")}
      />
    );
  }

  const records = result?.records ?? [];
  const issues = result?.issues ?? [];
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const readyCount = records.length - new Set(
    issues.filter((i) => i.severity === "error").map((i) => i.rowIndex),
  ).size;

  function handleDownload() {
    if (!records.length) return;
    const csv = recordsToCsv(records);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base = parsed!.fileName.replace(/\.[^.]+$/, "") || "netchex-import";
    a.download = `${base}.netchex.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-6 text-sm">
          <Stat label="Rows" value={String(records.length)} />
          <Stat label="Ready" value={String(readyCount)} valueClass="text-emerald-600" />
          <Stat
            label="With errors"
            value={String(errorCount)}
            valueClass={errorCount ? "text-red-600" : "text-zinc-500"}
          />
          <Stat
            label="Warnings"
            value={String(warningCount)}
            valueClass={warningCount ? "text-amber-600" : "text-zinc-500"}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/values")}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            ← Back to values
          </button>
          <button
            onClick={handleDownload}
            disabled={records.length === 0}
            className="rounded-md bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            Download Netchex CSV
          </button>
        </div>
      </section>

      <PreviewTable
        records={records}
        issues={issues}
        overrides={state.cellOverrides}
        onSetOverride={setCellOverride}
        onClearOverride={clearCellOverride}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-sm font-medium ${valueClass || "text-zinc-900 dark:text-zinc-100"}`}>
        {value}
      </div>
    </div>
  );
}
