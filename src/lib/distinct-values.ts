import type { ColumnMapping } from "./types";

export type DistinctValue = { value: string; count: number };

// For the given Netchex field key, scan rows for distinct non-empty values in
// the mapped source column. Returns values sorted by descending count then
// alphabetically. If the field is not mapped to a column (constant/unmapped),
// returns an empty list.
export function distinctValuesForField(
  rows: Record<string, unknown>[],
  columnMapping: ColumnMapping,
  fieldKey: string,
): DistinctValue[] {
  const entry = columnMapping[fieldKey];
  if (!entry || entry.source !== "column") return [];
  const col = entry.column;
  const counts = new Map<string, number>();
  for (const row of rows) {
    const v = row[col];
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => (b.count - a.count) || a.value.localeCompare(b.value));
}
