"use client";

import { useMemo, useState, useEffect } from "react";
import type { NetchexField } from "@/lib/netchex-spec";
import type { ColumnMapping, ColumnMappingEntry } from "@/lib/types";
import { getPool } from "@/lib/dynamic-pools";
import { Combobox, type ComboboxOption } from "./Combobox";

type Mode = "column" | "constant" | "dynamic" | "unmapped";

export function ColumnMapRow({
  field,
  entry,
  clientHeaders,
  rankedColumns,
  sampleValues,
  totalRows,
  onChange,
}: {
  field: NetchexField;
  entry: ColumnMapping[string] | undefined;
  clientHeaders: string[];
  rankedColumns: { column: string; score: number }[];
  sampleValues: Map<string, string[]>;
  totalRows: number;
  onChange: (next: ColumnMappingEntry) => void;
}) {
  const initialMode: Mode = entry?.source ?? "unmapped";
  const [mode, setMode] = useState<Mode>(initialMode);
  useEffect(() => {
    setMode((entry?.source ?? "unmapped") as Mode);
  }, [entry?.source]);

  const selectedColumn = entry?.source === "column" ? entry.column : "";
  const constantValue = entry?.source === "constant" ? entry.value : "";
  const dynamicPoolId = entry?.source === "dynamic" ? entry.pool : (field.dynamicPools?.[0] ?? "");
  const dynamicValue = entry?.source === "dynamic" ? entry.value : "";

  const hasDynamic = !!field.dynamicPools && field.dynamicPools.length > 0;

  const samples = useMemo(() => {
    if (mode !== "column" || !selectedColumn) return [];
    return sampleValues.get(selectedColumn)?.slice(0, 4) ?? [];
  }, [mode, selectedColumn, sampleValues]);

  function handleModeChange(next: Mode) {
    setMode(next);
    if (next === "unmapped") {
      onChange({ source: "unmapped" });
    } else if (next === "column") {
      const top = rankedColumns.find((r) => !!r.column);
      onChange({ source: "column", column: top?.column ?? clientHeaders[0] ?? "" });
    } else if (next === "constant") {
      onChange({ source: "constant", value: "" });
    } else if (next === "dynamic") {
      const firstPool = field.dynamicPools?.[0] ?? "";
      onChange({ source: "dynamic", pool: firstPool, value: "" });
    }
  }

  const columnOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [];
    const seenInSuggested = new Set<string>();
    const topRanked = rankedColumns.slice(0, 6);
    for (const r of topRanked) {
      seenInSuggested.add(r.column);
      opts.push({
        value: r.column,
        group: "Suggested",
        hint: `${Math.round((1 - r.score) * 100)}%`,
      });
    }
    for (const h of clientHeaders) {
      if (seenInSuggested.has(h)) continue;
      opts.push({ value: h, group: "All columns" });
    }
    return opts;
  }, [clientHeaders, rankedColumns]);

  const dynamicPool = useMemo(() => getPool(dynamicPoolId), [dynamicPoolId]);
  const dynamicOptions = useMemo<ComboboxOption[]>(() => {
    if (!dynamicPool) return [];
    return dynamicPool.options.map((o) => ({
      value: o.code,
      label: o.label ?? o.code,
      hint: o.description,
    }));
  }, [dynamicPool]);

  const requirementBadge = field.required === "required"
    ? <span className="rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-1.5 py-0.5 text-[10px] font-medium">REQUIRED</span>
    : field.required === "conditional"
      ? <span title={field.conditionalRule} className="rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-1.5 py-0.5 text-[10px] font-medium">CONDITIONAL</span>
      : null;

  return (
    <div
      className="grid grid-cols-[280px_140px_minmax(0,1fr)] gap-3 items-start py-3 border-b border-zinc-100 dark:border-zinc-800"
      data-field-key={field.key}
    >
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
            {field.label || <em className="text-zinc-400">(spacer)</em>}
          </span>
          {requirementBadge}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">{field.description}</div>
        {field.allowedValues && field.allowedValues.length < 12 && (
          <div className="text-[11px] text-zinc-400 mt-1">
            allowed: {field.allowedValues.join(", ")}
          </div>
        )}
        {hasDynamic && (
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
            Dynamic: {field.dynamicPools!.join(", ")}
          </div>
        )}
      </div>

      <select
        value={mode}
        onChange={(e) => handleModeChange(e.target.value as Mode)}
        className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-xs"
      >
        <option value="column">From column</option>
        <option value="constant">Constant value</option>
        {hasDynamic && <option value="dynamic">Dynamic value</option>}
        <option value="unmapped">Leave blank</option>
      </select>

      <div className="min-w-0">
        {mode === "column" && (
          <>
            <Combobox
              value={selectedColumn}
              options={columnOptions}
              placeholder="Pick a source column…"
              emptyText="No matching columns."
              onChange={(v) =>
                onChange({ source: "column", column: v })
              }
            />
            {samples.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase tracking-wide text-zinc-400">
                  Samples
                </span>
                {samples.map((s, i) => (
                  <span
                    key={i}
                    className="rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.5 text-[11px] font-mono"
                    title={s}
                  >
                    {s.length > 28 ? s.slice(0, 28) + "…" : s}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
        {mode === "constant" && (
          <>
            <input
              type="text"
              value={constantValue}
              onChange={(e) =>
                onChange({ source: "constant", value: e.target.value })
              }
              placeholder="Value applied to every row"
              className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-sm"
            />
            {constantValue && (
              <div className="mt-1.5 text-[11px] text-zinc-500">
                applied to all {totalRows} row{totalRows === 1 ? "" : "s"}
              </div>
            )}
          </>
        )}
        {mode === "dynamic" && (
          <>
            {field.dynamicPools && field.dynamicPools.length > 1 && (
              <select
                value={dynamicPoolId}
                onChange={(e) =>
                  onChange({
                    source: "dynamic",
                    pool: e.target.value,
                    value: "",
                  })
                }
                className="mb-2 w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-xs"
              >
                {field.dynamicPools.map((p) => {
                  const pool = getPool(p);
                  return (
                    <option key={p} value={p}>
                      {pool?.label ?? p}
                    </option>
                  );
                })}
              </select>
            )}
            <Combobox
              value={dynamicValue}
              options={dynamicOptions}
              placeholder={`Pick from ${dynamicPool?.label ?? "pool"}…`}
              emptyText="No options in this pool."
              onChange={(v) =>
                onChange({ source: "dynamic", pool: dynamicPoolId, value: v })
              }
            />
            <div className="mt-1.5 text-[11px] text-zinc-500">
              {dynamicValue
                ? `applied to all ${totalRows} row${totalRows === 1 ? "" : "s"}`
                : `from ${dynamicPool?.label ?? "Netchex pool"}`}
            </div>
          </>
        )}
        {mode === "unmapped" && (
          <p className="text-xs text-zinc-400 italic">
            Field will be blank in the output CSV.
          </p>
        )}
      </div>
    </div>
  );
}
