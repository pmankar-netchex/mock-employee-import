import * as XLSX from "xlsx";

export type ParsedSheet = {
  name: string;
  rowCount: number; // data rows after header
  headerRowIndex: number; // 0-based row index of detected header
  headers: string[];
  rows: Record<string, unknown>[];
};

export type ParsedWorkbook = {
  sheets: { name: string; rowCount: number }[];
  selectedSheet: string;
  headerRowIndex: number;
  headers: string[];
  rows: Record<string, unknown>[];
};

// Heuristic: pick the row where a majority of cells are non-empty strings
// and unique — that's the header row. Search the first 20 rows of the sheet.
function detectHeaderRow(grid: unknown[][]): number {
  const limit = Math.min(grid.length, 20);
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < limit; i++) {
    const row = grid[i] ?? [];
    const cells = row.map((c) => (c == null ? "" : String(c).trim()));
    const nonEmpty = cells.filter((c) => c !== "");
    if (nonEmpty.length < 3) continue;
    const distinct = new Set(nonEmpty).size;
    const stringy = nonEmpty.filter((c) => isNaN(Number(c))).length;
    // weight: more non-empty cells, mostly strings, all distinct
    const score =
      nonEmpty.length * 2 + stringy + (distinct === nonEmpty.length ? 5 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function normalizeCell(v: unknown): unknown {
  // xlsx with cellDates returns Date objects that may be shifted by
  // timezone math (off by seconds in non-US zones). Normalize to a
  // calendar-date ISO string so downstream consumers don't have to do
  // the same rounding.
  if (v instanceof Date) {
    const localMs = v.getTime() - v.getTimezoneOffset() * 60000;
    const dayMs = 86400000;
    const rounded = new Date(Math.round(localMs / dayMs) * dayMs);
    const yyyy = rounded.getUTCFullYear();
    const mm = String(rounded.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(rounded.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return v;
}

function sheetToRows(ws: XLSX.WorkSheet): {
  headerRowIndex: number;
  headers: string[];
  rows: Record<string, unknown>[];
} {
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });
  if (grid.length === 0) {
    return { headerRowIndex: 0, headers: [], rows: [] };
  }
  const headerRowIndex = detectHeaderRow(grid);
  const headerRow = grid[headerRowIndex] ?? [];
  const headers = headerRow.map((c, i) =>
    c == null || String(c).trim() === "" ? `Column ${i + 1}` : String(c).trim(),
  );
  const rows: Record<string, unknown>[] = [];
  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    // skip rows that are entirely blank
    if (row.every((c) => c == null || String(c).trim() === "")) continue;
    const obj: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = normalizeCell(row[c] ?? null);
    }
    rows.push(obj);
  }
  return { headerRowIndex, headers, rows };
}

export function parseExcel(buffer: ArrayBuffer): {
  sheets: { name: string; rowCount: number }[];
  selected: string;
  result: ParsedSheet;
} {
  // cellDates so date cells come through as JS Date objects, not Excel serials
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetSummaries: { name: string; rowCount: number; ws: XLSX.WorkSheet }[] =
    wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name];
      const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        defval: null,
        blankrows: false,
      });
      const headerRowIndex =
        grid.length > 0 ? detectHeaderRow(grid as unknown[][]) : 0;
      const rowCount = Math.max(0, grid.length - headerRowIndex - 1);
      return { name, rowCount, ws };
    });

  // Pick the sheet with the most data rows; ties broken by widest header.
  const selected = [...sheetSummaries].sort((a, b) => {
    if (b.rowCount !== a.rowCount) return b.rowCount - a.rowCount;
    return 0;
  })[0];

  const parsed = sheetToRows(selected.ws);

  return {
    sheets: sheetSummaries.map((s) => ({ name: s.name, rowCount: s.rowCount })),
    selected: selected.name,
    result: {
      name: selected.name,
      rowCount: parsed.rows.length,
      headerRowIndex: parsed.headerRowIndex,
      headers: parsed.headers,
      rows: parsed.rows,
    },
  };
}

export function parseExcelSheet(
  buffer: ArrayBuffer,
  sheetName: string,
): ParsedSheet {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet not found: ${sheetName}`);
  const parsed = sheetToRows(ws);
  return {
    name: sheetName,
    rowCount: parsed.rows.length,
    headerRowIndex: parsed.headerRowIndex,
    headers: parsed.headers,
    rows: parsed.rows,
  };
}
