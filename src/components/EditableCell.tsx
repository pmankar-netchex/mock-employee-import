"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NetchexField } from "@/lib/netchex-spec";
import { getPool } from "@/lib/dynamic-pools";
import { Combobox, type ComboboxOption } from "./Combobox";

// Preview cell that opens an inline editor on click. Pool/enum fields get a
// Combobox; everything else gets a text input. Commits via onCommit; Escape
// reverts. Overridden cells get a visual marker drawn by the parent.

export function EditableCell({
  field,
  value,
  overridden,
  issueMessage,
  severity,
  onCommit,
  onClear,
}: {
  field: NetchexField;
  value: string;
  overridden: boolean;
  issueMessage?: string;
  severity?: "warning" | "error";
  onCommit: (next: string) => void;
  onClear: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editing) setDraft(value);
  }, [editing, value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [editing]);

  const options = useMemo<ComboboxOption[] | null>(() => {
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
      return opts;
    }
    if (field.allowedValues && field.allowedValues.length > 0) {
      return field.allowedValues.map((v) => ({ value: v }));
    }
    return null;
  }, [field.dynamicPools, field.allowedValues]);

  const bg =
    severity === "error"
      ? "bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-200"
      : severity === "warning"
        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200"
        : "";

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title={issueMessage ?? `Click to edit · ${field.description}`}
        className={`w-full text-left px-2 py-1 whitespace-nowrap border-l border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${bg} ${overridden ? "ring-1 ring-inset ring-emerald-400/60 dark:ring-emerald-500/40" : ""}`}
      >
        {value ? (
          <span className="inline-flex items-center gap-1">
            {overridden && (
              <span className="text-emerald-600 dark:text-emerald-400" aria-label="overridden">●</span>
            )}
            {value}
          </span>
        ) : (
          <span className="text-zinc-300 dark:text-zinc-700">—</span>
        )}
      </button>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="border-l border-zinc-100 dark:border-zinc-800 px-1.5 py-0.5 min-w-[180px] bg-white dark:bg-zinc-900"
      onKeyDown={(e) => {
        if (e.key === "Escape") setEditing(false);
      }}
    >
      {options ? (
        <Combobox
          value={draft}
          options={options}
          placeholder="— pick value —"
          emptyText="No options."
          onChange={(v) => {
            setDraft(v);
            onCommit(v);
            setEditing(false);
          }}
          onClear={() => {
            onClear();
            setEditing(false);
          }}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== value) onCommit(draft);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (draft !== value) onCommit(draft);
              setEditing(false);
            }
          }}
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-xs font-mono"
        />
      )}
      {overridden && (
        <button
          onClick={() => {
            onClear();
            setEditing(false);
          }}
          className="mt-1 w-full text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline text-left"
        >
          Revert to computed value
        </button>
      )}
    </div>
  );
}
