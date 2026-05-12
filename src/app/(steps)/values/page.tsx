"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useWorkflow } from "@/context/WorkflowContext";
import {
  NETCHEX_FIELDS,
  type NetchexField,
  type NetchexFieldKey,
} from "@/lib/netchex-spec";
import { distinctValuesForField } from "@/lib/distinct-values";
import { autoResolveValue } from "@/lib/value-synonyms";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import { EmptyState } from "@/components/EmptyState";

const UNCONSTRAINED_CODE_FIELDS: readonly NetchexFieldKey[] = [
  "division",
  "businessUnit",
  "department",
  "location",
  "jobCode",
  "payrollGroupCode",
  "position",
  "payrollSchedule",
  "cityMinWage",
];

export default function ValuesPage() {
  const router = useRouter();
  const { state, setValuesForField, setValue } = useWorkflow();
  const parsed = state.parsed;

  const fieldGroups = useMemo(() => {
    if (!parsed) return [] as Array<{
      field: NetchexField;
      kind: "enum" | "freeText";
      distinct: ReturnType<typeof distinctValuesForField>;
    }>;
    const out: Array<{
      field: NetchexField;
      kind: "enum" | "freeText";
      distinct: ReturnType<typeof distinctValuesForField>;
    }> = [];
    for (const f of NETCHEX_FIELDS) {
      if (f.isSpacer) continue;
      const entry = state.columnMapping[f.key];
      if (!entry || entry.source !== "column") continue;
      const distinct = distinctValuesForField(
        parsed.rows,
        state.columnMapping,
        f.key,
      );
      if (distinct.length === 0) continue;
      const isEnum =
        !!f.allowedValues && f.allowedValues.length > 0;
      const isFreeText = UNCONSTRAINED_CODE_FIELDS.includes(
        f.key as NetchexFieldKey,
      );
      if (!isEnum && !isFreeText) continue;
      out.push({
        field: f,
        kind: isEnum ? "enum" : "freeText",
        distinct,
      });
    }
    return out;
  }, [parsed, state.columnMapping]);

  // Pre-fill on first arrival.
  useEffect(() => {
    if (!parsed) return;
    for (const { field, kind, distinct } of fieldGroups) {
      const current = state.valueMapping[field.key] ?? {};
      if (kind !== "enum") continue;
      const next: Record<string, string> = { ...current };
      let changed = false;
      for (const { value } of distinct) {
        if (next[value] != null) continue;
        const resolved = autoResolveValue(
          field.key as NetchexFieldKey,
          value,
        );
        if (resolved != null) {
          next[value] = resolved;
          changed = true;
        }
      }
      if (changed) setValuesForField(field.key, next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldGroups]);

  function autoResolveAll() {
    for (const { field, kind, distinct } of fieldGroups) {
      if (kind !== "enum") continue;
      const current = state.valueMapping[field.key] ?? {};
      const next = { ...current };
      let changed = false;
      for (const { value } of distinct) {
        if (next[value]) continue;
        const r = autoResolveValue(field.key as NetchexFieldKey, value);
        if (r) {
          next[value] = r;
          changed = true;
        }
      }
      if (changed) setValuesForField(field.key, next);
    }
  }

  if (!parsed) {
    return (
      <EmptyState
        title="Upload a client file to start mapping"
        description="The Values step translates client text (e.g. Male, Pennsylvania, Full Time) into Netchex's canonical codes (M, PA, RFT)."
        actionLabel="Go to upload"
        onAction={() => router.push("/upload")}
      />
    );
  }

  const stats = (() => {
    let totalGroups = fieldGroups.length;
    let groupsComplete = 0;
    let totalDistinct = 0;
    let mapped = 0;
    for (const g of fieldGroups) {
      totalDistinct += g.distinct.length;
      const m = state.valueMapping[g.field.key] ?? {};
      const groupMapped = g.distinct.filter((d) => !!m[d.value]).length;
      mapped += groupMapped;
      if (groupMapped === g.distinct.length) groupsComplete++;
    }
    return { totalGroups, groupsComplete, totalDistinct, mapped };
  })();

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-6 text-sm">
          <Stat
            label="Fields needing values"
            value={`${stats.groupsComplete} / ${stats.totalGroups}`}
          />
          <Stat
            label="Distinct values mapped"
            value={`${stats.mapped} / ${stats.totalDistinct}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={autoResolveAll}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Auto-resolve all
          </button>
          <button
            onClick={() => router.push("/columns")}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            ← Back to columns
          </button>
          <button
            onClick={() => router.push("/preview")}
            className="rounded-md bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200"
          >
            Continue to preview →
          </button>
        </div>
      </section>

      {fieldGroups.length === 0 ? (
        <EmptyState
          title="No values need translating"
          description="Either none of your mapped columns target enum-constrained fields, or every distinct value is already a valid Netchex value."
          actionLabel="Continue to preview"
          onAction={() => router.push("/preview")}
        />
      ) : (
        fieldGroups.map(({ field, kind, distinct }) => (
          <FieldGroup
            key={field.key}
            field={field}
            kind={kind}
            distinct={distinct}
            mapping={state.valueMapping[field.key] ?? {}}
            onChange={(clientValue, netchexValue) =>
              setValue(field.key, clientValue, netchexValue)
            }
          />
        ))
      )}
    </div>
  );
}

function FieldGroup({
  field,
  kind,
  distinct,
  mapping,
  onChange,
}: {
  field: NetchexField;
  kind: "enum" | "freeText";
  distinct: { value: string; count: number }[];
  mapping: Record<string, string>;
  onChange: (clientValue: string, netchexValue: string) => void;
}) {
  const mappedCount = distinct.filter((d) => !!mapping[d.value]).length;
  const allMapped = mappedCount === distinct.length;

  const enumOptions = useMemo<ComboboxOption[]>(() => {
    if (!field.allowedValues) return [];
    return field.allowedValues.map((v) => ({ value: v }));
  }, [field.allowedValues]);

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {field.label}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">{field.description}</p>
          {kind === "enum" && field.allowedValues && field.allowedValues.length < 12 && (
            <p className="text-[11px] text-zinc-400 mt-1">
              Allowed: {field.allowedValues.join(", ")}
            </p>
          )}
        </div>
        <span
          className={`text-xs rounded px-2 py-0.5 ${
            allMapped
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          }`}
        >
          {mappedCount} / {distinct.length} mapped
        </span>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {distinct.map(({ value, count }) => {
          const mappedTo = mapping[value] ?? "";
          const isUnmapped = !mappedTo;
          return (
            <div
              key={value}
              className="grid grid-cols-[minmax(0,1fr)_auto_minmax(220px,360px)] gap-3 items-center py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`font-mono text-sm break-all ${
                    isUnmapped
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {value}
                </span>
                <span className="text-[11px] text-zinc-400 shrink-0">
                  ×{count}
                </span>
              </div>
              <span className="text-zinc-400 text-sm">→</span>
              {kind === "enum" ? (
                <Combobox
                  value={mappedTo}
                  options={enumOptions}
                  placeholder="— pick value —"
                  emptyText="No options."
                  onChange={(v) => onChange(value, v)}
                  onClear={() => onChange(value, "")}
                />
              ) : (
                <input
                  type="text"
                  value={mappedTo}
                  onChange={(e) => onChange(value, e.target.value)}
                  placeholder="Enter Netchex code"
                  className={`rounded border bg-white dark:bg-zinc-950 px-2 py-1 text-sm w-full ${
                    mappedTo
                      ? "border-zinc-300 dark:border-zinc-700"
                      : "border-amber-300 dark:border-amber-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {value}
      </div>
    </div>
  );
}
