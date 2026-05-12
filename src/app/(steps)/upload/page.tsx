"use client";

import { useRouter } from "next/navigation";
import { useState, type DragEvent } from "react";
import { useWorkflow, type ParsedFile } from "@/context/WorkflowContext";
import { Combobox } from "@/components/Combobox";
import { parseFileInBrowser } from "@/lib/client-parse";

const ACCEPTED_EXT = [".xlsx", ".xls", ".csv"];

function isAcceptedFile(name: string) {
  const lower = name.toLowerCase();
  return ACCEPTED_EXT.some((e) => lower.endsWith(e));
}

export default function UploadPage() {
  const router = useRouter();
  const { setParsed, state } = useWorkflow();
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  async function parseFile(file: File, sheet?: string) {
    if (!isAcceptedFile(file.name)) {
      setError(`Unsupported file type. Use ${ACCEPTED_EXT.join(", ")}.`);
      return;
    }
    setParsing(true);
    setError(null);
    setLastFile(file);
    try {
      const result = await parseFileInBrowser(file, sheet);
      const parsed: ParsedFile = {
        kind: result.kind,
        fileName: file.name,
        sheets: result.sheets,
        selectedSheet: result.selectedSheet,
        headerRowIndex: result.headerRowIndex,
        headers: result.headers,
        rows: result.rows,
      };
      setParsed(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) parseFile(f);
  }

  function onDragOver(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(true);
  }

  function onDragLeave(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(false);
  }

  const parsed = state.parsed;
  const canContinue = !!parsed && parsed.rows.length > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Upload a client employee file
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Excel (.xlsx, .xls) or CSV. We&apos;ll detect the right sheet and
          headers automatically — you can override below if we get it wrong.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <label
          htmlFor="file-input"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`block cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors
            ${
              dragActive
                ? "border-zinc-500 bg-zinc-100 dark:border-zinc-400 dark:bg-zinc-800"
                : "border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 hover:border-zinc-400 dark:hover:border-zinc-600"
            }`}
        >
          <div className="mx-auto w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
          </div>
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {dragActive ? "Release to upload" : "Drop a file here, or click to browse"}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            .xlsx · .xls · .csv
          </div>
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) parseFile(f);
            }}
          />
        </label>

        {parsing && (
          <p className="mt-3 text-sm text-zinc-500">Parsing…</p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      {parsed && (
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3 text-sm">
            <Stat label="File" value={parsed.fileName} />
            <Stat label="Sheet" value={parsed.selectedSheet} />
            <Stat label="Header row" value={`row ${parsed.headerRowIndex + 1}`} />
            <Stat label="Columns" value={String(parsed.headers.length)} />
            <Stat label="Data rows" value={String(parsed.rows.length)} />
          </div>

          {parsed.kind === "xlsx" && parsed.sheets.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Sheet
              </label>
              <Combobox
                value={parsed.selectedSheet}
                options={parsed.sheets.map((s) => ({
                  value: s.name,
                  hint: `${s.rowCount} rows`,
                }))}
                onChange={(v) => {
                  if (lastFile) parseFile(lastFile, v);
                }}
                className="max-w-sm"
              />
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Headers detected ({parsed.headers.length})
            </h3>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-auto rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-2">
              {parsed.headers.map((h, i) => (
                <span
                  key={i}
                  className="rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 px-2 py-1 text-xs"
                  title={h}
                >
                  {h}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              First row preview
            </h3>
            <div className="overflow-auto rounded border border-zinc-200 dark:border-zinc-800 max-h-48">
              <table className="text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                  <tr>
                    {parsed.headers.map((h, i) => (
                      <th
                        key={i}
                        className="px-2 py-1.5 text-left text-zinc-600 dark:text-zinc-300 whitespace-nowrap border-r border-zinc-200 dark:border-zinc-700"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 1).map((r, ri) => (
                    <tr key={ri}>
                      {parsed.headers.map((h, ci) => (
                        <td
                          key={ci}
                          className="px-2 py-1.5 whitespace-nowrap border-r border-t border-zinc-100 dark:border-zinc-800 font-mono"
                        >
                          {r[h] == null
                            ? <span className="text-zinc-300 dark:text-zinc-700">—</span>
                            : String(r[h])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              disabled={!canContinue}
              onClick={() => router.push("/columns")}
              className="rounded-md bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50"
            >
              Continue to column mapping →
            </button>
          </div>
        </section>
      )}
    </div>
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
