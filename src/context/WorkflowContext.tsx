"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { suggestMapping } from "@/lib/suggest-mapping";
import type {
  CellOverrides,
  ColumnMapping,
  ColumnMappingEntry,
  ValueMapping,
} from "@/lib/types";

export type ParsedFile = {
  kind: "csv" | "xlsx";
  fileName: string;
  sheets: { name: string; rowCount: number }[];
  selectedSheet: string;
  headerRowIndex: number;
  headers: string[];
  rows: Record<string, unknown>[];
};

type WorkflowState = {
  parsed: ParsedFile | null;
  columnMapping: ColumnMapping;
  valueMapping: ValueMapping;
  cellOverrides: CellOverrides;
};

type WorkflowContextValue = {
  state: WorkflowState;
  setParsed: (p: ParsedFile) => void;
  updateMapping: (fieldKey: string, entry: ColumnMappingEntry) => void;
  setValue: (fieldKey: string, clientValue: string, netchexValue: string) => void;
  setValuesForField: (fieldKey: string, mapping: Record<string, string>) => void;
  setCellOverride: (rowIndex: number, fieldKey: string, value: string) => void;
  clearCellOverride: (rowIndex: number, fieldKey: string) => void;
  reset: () => void;
};

const Ctx = createContext<WorkflowContextValue | null>(null);

const initialState: WorkflowState = {
  parsed: null,
  columnMapping: {},
  valueMapping: {},
  cellOverrides: {},
};

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkflowState>(initialState);

  const setParsed = useCallback((parsed: ParsedFile) => {
    const { autoMapping } = suggestMapping(parsed.headers);
    setState({
      parsed,
      columnMapping: autoMapping,
      valueMapping: {},
      cellOverrides: {},
    });
  }, []);

  const updateMapping = useCallback(
    (fieldKey: string, entry: ColumnMappingEntry) => {
      setState((prev) => {
        // When the source column changes for a field, its accumulated
        // valueMapping is no longer relevant. Clear it so the values step
        // re-prefills against fresh distinct values.
        const prevEntry = prev.columnMapping[fieldKey];
        const sameSource =
          prevEntry?.source === entry.source &&
          (entry.source !== "column" ||
            (prevEntry?.source === "column" &&
              prevEntry.column === entry.column));
        const nextValueMapping = sameSource
          ? prev.valueMapping
          : { ...prev.valueMapping, [fieldKey]: {} };
        return {
          ...prev,
          columnMapping: { ...prev.columnMapping, [fieldKey]: entry },
          valueMapping: nextValueMapping,
        };
      });
    },
    [],
  );

  const setValue = useCallback(
    (fieldKey: string, clientValue: string, netchexValue: string) => {
      setState((prev) => ({
        ...prev,
        valueMapping: {
          ...prev.valueMapping,
          [fieldKey]: {
            ...(prev.valueMapping[fieldKey] ?? {}),
            [clientValue]: netchexValue,
          },
        },
      }));
    },
    [],
  );

  const setValuesForField = useCallback(
    (fieldKey: string, mapping: Record<string, string>) => {
      setState((prev) => ({
        ...prev,
        valueMapping: { ...prev.valueMapping, [fieldKey]: mapping },
      }));
    },
    [],
  );

  const setCellOverride = useCallback(
    (rowIndex: number, fieldKey: string, value: string) => {
      setState((prev) => {
        const rowOverrides = { ...(prev.cellOverrides[rowIndex] ?? {}) };
        rowOverrides[fieldKey] = value;
        return {
          ...prev,
          cellOverrides: { ...prev.cellOverrides, [rowIndex]: rowOverrides },
        };
      });
    },
    [],
  );

  const clearCellOverride = useCallback(
    (rowIndex: number, fieldKey: string) => {
      setState((prev) => {
        const rowOverrides = { ...(prev.cellOverrides[rowIndex] ?? {}) };
        delete rowOverrides[fieldKey];
        const nextOverrides = { ...prev.cellOverrides };
        if (Object.keys(rowOverrides).length === 0) delete nextOverrides[rowIndex];
        else nextOverrides[rowIndex] = rowOverrides;
        return { ...prev, cellOverrides: nextOverrides };
      });
    },
    [],
  );

  const reset = useCallback(() => setState(initialState), []);

  const value = useMemo(
    () => ({
      state,
      setParsed,
      updateMapping,
      setValue,
      setValuesForField,
      setCellOverride,
      clearCellOverride,
      reset,
    }),
    [
      state,
      setParsed,
      updateMapping,
      setValue,
      setValuesForField,
      setCellOverride,
      clearCellOverride,
      reset,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkflow() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkflow must be used within WorkflowProvider");
  return v;
}
