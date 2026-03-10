// src/app/_components/tableUtils.ts
// Shared helpers used by both GridView and KanbanView

import type { Row, Cell, Column } from "@prisma/client";

export type RowWithCells = Row & { cells: Cell[] };

/** Get the string value of a cell by columnId, falling back to "" */
export function getCellValue(row: RowWithCells, columnId: string): string {
  return row.cells.find((c) => c.columnId === columnId)?.value ?? "";
}

/** Sort rows by a column's cell value (TEXT = localeCompare, NUMBER = numeric) */
export function sortRows(
  rows: RowWithCells[],
  sort: { columnId: string; dir: "asc" | "desc" } | null,
  columns: Column[]
): RowWithCells[] {
  if (!sort) return rows;
  const col = columns.find((c) => c.id === sort.columnId);
  if (!col) return rows;
  return [...rows].sort((a, b) => {
    const av = getCellValue(a, sort.columnId);
    const bv = getCellValue(b, sort.columnId);
    const dir = sort.dir === "asc" ? 1 : -1;
    if (col.type === "NUMBER") {
      return dir * ((parseFloat(av) || 0) - (parseFloat(bv) || 0));
    }
    return dir * av.localeCompare(bv);
  });
}

/** Pick a column to use as the Kanban group field.
 *  Priority: explicit override → column named "status" → first TEXT column */
export function resolveGroupColumn(
  columns: Column[],
  groupByColumnId?: string | null
): Column | undefined {
  if (groupByColumnId) return columns.find((c) => c.id === groupByColumnId);
  return (
    columns.find((c) => c.name.toLowerCase() === "status" && c.type === "TEXT") ??
    columns.find((c) => c.type === "TEXT")
  );
}

/** Pick the "Name" column for card titles (prefers a column literally named "name") */
export function resolveNameColumn(columns: Column[]): Column | undefined {
  return columns.find((c) => c.name.toLowerCase() === "name") ?? columns[0];
}