"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkflow } from "@/context/WorkflowContext";
import { ColumnMapRow } from "@/components/ColumnMapRow";
import { EmptyState } from "@/components/EmptyState";
import {
  NETCHEX_FIELDS,
  FIELD_GROUPS,
  groupForOrder,
  type FieldGroup,
} from "@/lib/netchex-spec";
import { suggestMapping, type FieldSuggestion } from "@/lib/suggest-mapping";
import type { ColumnMapping } from "@/lib/types";

type FilterMode = "all" | "required" | "unmapped";

export default function ColumnsPage() {
  const router = useRouter();
  const { state, updateMapping, reset } = useWorkflow();
  const parsed = state.parsed;
  const [filter, setFilter] = useState<FilterMode>("all");
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => {
    if (!parsed) return new Map<string, FieldSuggestion>();
    const { suggestions } = suggestMapping(parsed.headers);
    return new Map(suggestions.map((s) => [s.key, s]));
  }, [parsed]);

  const sampleValues = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!parsed) return map;
    for (const h of parsed.headers) {
      const seen: string[] = [];
      const set = new Set<string>();
      for (const row of parsed.rows) {
        const v = row[h];
        if (v == null || v === "") continue;
        const s = String(v);
        if (!set.has(s)) {
          set.add(s);
          seen.push(s);
          if (seen.length >= 5) break;
        }
      }
      map.set(h, seen);
    }
    return map;
  }, [parsed]);

  if (!parsed) {
    return (
      <EmptyState
        title="Upload a client file to start mapping"
        description="Once a file is loaded, this step lets you choose which source column feeds each Netchex field, or set a constant value applied to every row."
        actionLabel="Go to upload"
        onAction={() => router.push("/upload")}
      />
    );
  }

  const fields = NETCHEX_FIELDS.filter((f) => !f.isSpacer);
  const mappedCount = fields.filter(
    (f) =>
      state.columnMapping[f.key]?.source &&
      state.columnMapping[f.key]?.source !== "unmapped",
  ).length;
  const requiredMissing = fields.filter(
    (f) =>
      f.required === "required" &&
      (!state.columnMapping[f.key] ||
        state.columnMapping[f.key].source === "unmapped"),
  );

  const visible = fields.filter((f) => {
    if (
      query &&
      !f.label.toLowerCase().includes(query.toLowerCase()) &&
      !f.key.toLowerCase().includes(query.toLowerCase())
    )
      return false;
    if (filter === "required" && f.required !== "required") return false;
    if (filter === "unmapped") {
      const e = state.columnMapping[f.key];
      if (e && e.source !== "unmapped") return false;
    }
    return true;
  });

  // Per-group counts
  const groupStats = FIELD_GROUPS.map((g) => {
    const groupFields = fields.filter((f) => groupForOrder(f.order) === g);
    const mapped = groupFields.filter(
      (f) => state.columnMapping[f.key]?.source === "column" ||
        state.columnMapping[f.key]?.source === "constant",
    ).length;
    return {
      group: g,
      total: groupFields.length,
      mapped,
      complete: mapped === groupFields.length,
    };
  });

  function scrollToGroup(group: FieldGroup) {
    const first = fields.find((f) => groupForOrder(f.order) === group);
    if (!first) return;
    document
      .querySelector(`[data-field-key="${first.key}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetToSuggestions() {
    if (!confirm("Reset all column mappings to the auto-suggested values?"))
      return;
    const { autoMapping } = suggestMapping(parsed!.headers);
    for (const f of fields) {
      updateMapping(f.key, autoMapping[f.key] ?? { source: "unmapped" });
    }
  }

  function clearAll() {
    if (!confirm("Mark every Netchex field as unmapped?")) return;
    for (const f of fields) {
      updateMapping(f.key, { source: "unmapped" });
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <div className="text-xs text-zinc-500">Mapped</div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              {mappedCount} / {fields.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Required missing</div>
            <div className="font-medium">
              {requiredMissing.length > 0 ? (
                <span className="text-red-600">{requiredMissing.length}</span>
              ) : (
                <span className="text-emerald-600">0</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetToSuggestions}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Reset to suggestions
          </button>
          <button
            onClick={clearAll}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Clear all
          </button>
          <button
            onClick={() => router.push("/values")}
            className="rounded-md bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200"
          >
            Continue to value mapping →
          </button>
        </div>
      </section>

      <div className="grid grid-cols-[1fr_220px] gap-5 items-start">
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Map Netchex fields to your columns
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="search"
                placeholder="Filter fields…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm w-48"
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterMode)}
                className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm"
              >
                <option value="all">All fields</option>
                <option value="required">Required only</option>
                <option value="unmapped">Unmapped only</option>
              </select>
            </div>
          </div>

          <div>
            {visible.map((field) => {
              const sugg = suggestions.get(field.key);
              return (
                <ColumnMapRow
                  key={field.key}
                  field={field}
                  entry={state.columnMapping[field.key]}
                  clientHeaders={parsed.headers}
                  rankedColumns={sugg?.ranked ?? []}
                  sampleValues={sampleValues}
                  totalRows={parsed.rows.length}
                  onChange={(entry) => updateMapping(field.key, entry)}
                />
              );
            })}
            {visible.length === 0 && (
              <p className="text-sm text-zinc-500 py-6 text-center">
                No fields match this filter.
              </p>
            )}
          </div>
        </section>

        <aside className="sticky top-6">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
              Field groups
            </div>
            <ul className="space-y-0.5">
              {groupStats.map((s) => (
                <li key={s.group}>
                  <button
                    onClick={() => scrollToGroup(s.group)}
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <span
                      className={`truncate ${s.complete ? "text-zinc-500" : "text-zinc-800 dark:text-zinc-200"}`}
                    >
                      {s.group}
                    </span>
                    <span
                      className={`shrink-0 tabular-nums ${
                        s.complete
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-500"
                      }`}
                    >
                      {s.mapped}/{s.total}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
