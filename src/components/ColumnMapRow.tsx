"use client";

import { useMemo, useState, useEffect } from "react";
import type { NetchexField } from "@/lib/netchex-spec";
import type { ColumnMapping, ColumnMappingEntry } from "@/lib/types";
import { getPool } from "@/lib/dynamic-pools";
import { Combobox, type ComboboxOption } from "./Combobox";

type Mode = "column" | "constant" | "unmapped";

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
    } else {
      onChange({ source: "constant", value: "" });
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

  // Constant-mode input shape derives from the field metadata: pool combobox
  // when a Netchex pool is attached, enum combobox when allowedValues exist,
  // else free text.
  const constantInput = useMemo(() => {
    if (field.dynamicPools && field.dynamicPools.length > 0) {
      const opts: ComboboxOption[] = [];
      for (const id of field.dynamicPools) {
        const pool = getPool(id);
        if (!pool) continue;
        for (const o of pool.options) {
          opts.push({
            value: o.code,
            label: o.label ?? o.code,
            group: pool.label,
            hint: o.description,
          });
        }
      }
      return { kind: "combobox" as const, options: opts, placeholder: "— pick from Netchex —" };
    }
    if (field.allowedValues && field.allowedValues.length > 0) {
      return {
        kind: "combobox" as const,
        options: field.allowedValues.map((v) => ({ value: v })),
        placeholder: "— pick allowed value —",
      };
    }
    return { kind: "freeText" as const };
  }, [field.dynamicPools, field.allowedValues]);

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
        {field.dynamicPools && field.dynamicPools.length > 0 && (
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
            Netchex pool: {field.dynamicPools
              .map((id) => getPool(id)?.label ?? id)
              .join(", ")}
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
            {constantInput.kind === "combobox" ? (
              <Combobox
                value={constantValue}
                options={constantInput.options}
                placeholder={constantInput.placeholder}
                emptyText="No options."
                onChange={(v) =>
                  onChange({ source: "constant", value: v })
                }
                onClear={() => onChange({ source: "constant", value: "" })}
              />
            ) : (
              <input
                type="text"
                value={constantValue}
                onChange={(e) =>
                  onChange({ source: "constant", value: e.target.value })
                }
                placeholder="Value applied to every row"
                className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-sm"
              />
            )}
            {constantValue && (
              <div className="mt-1.5 text-[11px] text-zinc-500">
                applied to all {totalRows} row{totalRows === 1 ? "" : "s"}
              </div>
            )}
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
