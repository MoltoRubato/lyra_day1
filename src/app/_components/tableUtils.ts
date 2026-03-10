// src/app/_components/tableUtils.ts
import type { Row, Cell, Column } from "@prisma/client";

export type RowWithCells = Row & { cells: Cell[] };

export function getCellValue(row: RowWithCells, columnId: string): string {
  return row.cells.find((c) => c.columnId === columnId)?.value ?? "";
}

// ── Field type metadata ───────────────────────────────────────────────────────
// Each ColumnType maps to a label, icon, and input category used by the UI.

export type FieldCategory = "text" | "number" | "boolean" | "date" | "select";

export const FIELD_TYPES: Record<string, { label: string; icon: string; category: FieldCategory }> = {
  TEXT:          { label: "Text",           icon: "T",  category: "text"    },
  NUMBER:        { label: "Number",         icon: "#",  category: "number"  },
  CHECKBOX:      { label: "Checkbox",       icon: "☑",  category: "boolean" },
  SINGLE_SELECT: { label: "Single select",  icon: "◉",  category: "select"  },
  MULTI_SELECT:  { label: "Multi select",   icon: "◈",  category: "select"  },
  DATE:          { label: "Date",           icon: "📅", category: "date"    },
  PHONE:         { label: "Phone",          icon: "📞", category: "text"    },
  EMAIL:         { label: "Email",          icon: "@",  category: "text"    },
  URL:           { label: "URL",            icon: "🔗", category: "text"    },
  CURRENCY:      { label: "Currency",       icon: "$",  category: "number"  },
  PERCENT:       { label: "Percent",        icon: "%",  category: "number"  },
  DURATION:      { label: "Duration",       icon: "⏱", category: "text"    },
  RATING:        { label: "Rating",         icon: "★",  category: "number"  },
  ATTACHMENT:    { label: "Attachment",     icon: "📎", category: "text"    },
};

export const FIELD_TYPE_GROUPS = [
  { label: "Text & links",  types: ["TEXT", "EMAIL", "URL", "PHONE", "ATTACHMENT", "DURATION"] },
  { label: "Numbers",       types: ["NUMBER", "CURRENCY", "PERCENT", "RATING"] },
  { label: "Date & time",   types: ["DATE"] },
  { label: "Choice",        types: ["SINGLE_SELECT", "MULTI_SELECT", "CHECKBOX"] },
];

/** Format a stored string value for display based on column type */
export function formatCellValue(value: string, type: string): string {
  if (!value) return "";
  switch (type) {
    case "CURRENCY": return value.startsWith("$") ? value : `$${value}`;
    case "PERCENT":  return value.endsWith("%") ? value : `${value}%`;
    case "CHECKBOX": return value === "true" ? "✓" : "";
    case "RATING":   return "★".repeat(Math.min(Math.max(parseInt(value) || 0, 0), 5));
    default:         return value;
  }
}

/** Input type attribute for HTML inputs */
export function inputTypeForField(colType: string): string {
  switch (colType) {
    case "NUMBER": case "CURRENCY": case "PERCENT": case "RATING": return "number";
    case "DATE":   return "date";
    case "EMAIL":  return "email";
    case "URL":    return "url";
    case "PHONE":  return "tel";
    default:       return "text";
  }
}

// ── Sorting ───────────────────────────────────────────────────────────────────

export function sortRows(
  rows: RowWithCells[],
  sort: { columnId: string; dir: "asc" | "desc" } | null,
  columns: Column[]
): RowWithCells[] {
  if (!sort) return rows;
  const col = columns.find((c) => c.id === sort.columnId);
  if (!col) return rows;
  const isNumeric = ["NUMBER", "CURRENCY", "PERCENT", "RATING"].includes(col.type);
  return [...rows].sort((a, b) => {
    const av = getCellValue(a, sort.columnId);
    const bv = getCellValue(b, sort.columnId);
    const dir = sort.dir === "asc" ? 1 : -1;
    if (isNumeric) return dir * ((parseFloat(av) || 0) - (parseFloat(bv) || 0));
    return dir * av.localeCompare(bv);
  });
}

// ── Grouping ──────────────────────────────────────────────────────────────────

export type GroupedRows = { value: string; rows: RowWithCells[] }[];

export function groupRows(rows: RowWithCells[], groupColId: string | null): GroupedRows {
  if (!groupColId) return [{ value: "", rows }];
  const map = new Map<string, RowWithCells[]>();
  for (const row of rows) {
    const key = getCellValue(row, groupColId) || "—";
    const bucket = map.get(key) ?? [];
    bucket.push(row);
    map.set(key, bucket);
  }
  return Array.from(map.entries()).map(([value, rows]) => ({ value, rows }));
}

// ── Kanban helpers ────────────────────────────────────────────────────────────

export function resolveGroupColumn(columns: Column[], groupByColumnId?: string | null): Column | undefined {
  if (groupByColumnId) return columns.find((c) => c.id === groupByColumnId);
  return (
    columns.find((c) => c.name.toLowerCase() === "status") ??
    columns.find((c) => ["TEXT", "SINGLE_SELECT"].includes(c.type))
  );
}

export function resolveNameColumn(columns: Column[]): Column | undefined {
  return columns.find((c) => c.name.toLowerCase() === "name") ?? columns[0];
}