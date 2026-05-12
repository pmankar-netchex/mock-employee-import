"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useWorkflow } from "@/context/WorkflowContext";
import {
  computeProgress,
  type StepProgress,
  type StepStatus,
} from "@/lib/workflow-progress";

type StepDef = {
  href: string;
  label: string;
  short: string;
};

const STEPS: StepDef[] = [
  { href: "/upload", label: "Upload", short: "Upload your client file" },
  { href: "/columns", label: "Columns", short: "Map columns to fields" },
  { href: "/values", label: "Values", short: "Translate enum values" },
  { href: "/preview", label: "Preview", short: "Review & download" },
];

export function Stepper() {
  const pathname = usePathname();
  const { state, reset } = useWorkflow();
  const hasParsed = !!state.parsed;

  const progress = useMemo(
    () =>
      computeProgress({
        hasParsed,
        fileName: state.parsed?.fileName,
        rowCount: state.parsed?.rows.length,
        rows: state.parsed?.rows,
        columnMapping: state.columnMapping,
        valueMapping: state.valueMapping,
      }),
    [
      hasParsed,
      state.parsed?.fileName,
      state.parsed?.rows,
      state.columnMapping,
      state.valueMapping,
    ],
  );

  const byHref: Record<string, StepProgress> = {
    "/upload": progress.upload,
    "/columns": progress.columns,
    "/values": progress.values,
    "/preview": progress.preview,
  };

  return (
    <aside
      className="shrink-0 w-60 border-r border-zinc-200 dark:border-zinc-800
                 bg-white dark:bg-zinc-900 flex flex-col"
    >
      <div className="px-5 py-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="text-xs uppercase tracking-wider text-zinc-400">
          Netchex
        </div>
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mt-0.5">
          New Hire Import
        </div>
      </div>

      <ol className="flex-1 px-3 py-4 space-y-1">
        {STEPS.map((s, idx) => {
          const active = pathname?.startsWith(s.href);
          const p = byHref[s.href];
          const locked = p.status === "locked";

          const inner = (
            <div
              className={`flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors ${
                active
                  ? "bg-zinc-100 dark:bg-zinc-800"
                  : locked
                    ? "opacity-50"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <StatusDot status={p.status} index={idx + 1} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-medium ${
                      active
                        ? "text-zinc-900 dark:text-zinc-50"
                        : "text-zinc-700 dark:text-zinc-200"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                <div
                  className={`text-[11px] mt-0.5 ${
                    p.status === "complete"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : p.status === "inProgress"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-zinc-500 dark:text-zinc-400"
                  } truncate`}
                  title={p.hint || s.short}
                >
                  {p.hint || s.short}
                </div>
              </div>
            </div>
          );

          return (
            <li key={s.href}>
              {locked ? (
                <div aria-disabled className="cursor-not-allowed">
                  {inner}
                </div>
              ) : (
                <Link href={s.href} className="block">
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {hasParsed && (
        <div className="px-3 py-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={reset}
            className="w-full text-left text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 px-3 py-1.5 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            ↺ Start over
          </button>
        </div>
      )}
    </aside>
  );
}

function StatusDot({
  status,
  index,
}: {
  status: StepStatus;
  index: number;
}) {
  if (status === "complete") {
    return (
      <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
        ✓
      </div>
    );
  }
  if (status === "inProgress") {
    return (
      <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px] font-medium">
        {index}
      </div>
    );
  }
  if (status === "locked") {
    return (
      <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 flex items-center justify-center text-[10px]">
        {index}
      </div>
    );
  }
  return (
    <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-300 flex items-center justify-center text-[10px] font-medium">
      {index}
    </div>
  );
}
