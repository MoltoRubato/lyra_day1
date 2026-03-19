// src/app/_components/tableUtils.ts
import type { Row, Cell, Column } from "@prisma/client";

export type RowWithCells = Row & { cells: Cell[] };
type ColumnLike = Pick<Column, "id" | "name" | "type">;

export function getCellValue(row: RowWithCells, columnId: string): string {
  return row.cells.find((c) => c.columnId === columnId)?.value ?? "";
}

// ── Field type metadata ───────────────────────────────────────────────────────

export type FieldCategory = "text" | "number" | "boolean" | "date" | "select";

export const FIELD_TYPES: Record<string, { label: string; icon: string; category: FieldCategory }> = {
  TEXT:          { label: "Single line text", icon: "T",  category: "text"    },
  LONG_TEXT:     { label: "Long text",      icon: "P",  category: "text"    },
  USER:          { label: "User",           icon: "U",  category: "text"    },
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
  { label: "Text & links",  types: ["TEXT", "LONG_TEXT", "USER", "EMAIL", "URL", "PHONE", "ATTACHMENT", "DURATION"] },
  { label: "Numbers",       types: ["NUMBER", "CURRENCY", "PERCENT", "RATING"] },
  { label: "Date & time",   types: ["DATE"] },
  { label: "Choice",        types: ["SINGLE_SELECT", "MULTI_SELECT", "CHECKBOX"] },
];

/** Format a stored string value for display based on column type */
export function formatCellValue(value: string, type: string): string {
  if (!value) return "";
  switch (type) {
    case "CURRENCY": return value.startsWith("$") ? value : `$${value}`;
    case "PERCENT":  return value.endsWith("%")   ? value : `${value}%`;
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
    case "USER":   return "text";
    default:       return "text";
  }
}

// ── View config types ─────────────────────────────────────────────────────────

export type FilterOp =
  | "contains" | "does_not_contain"
  | "equals"   | "not_equals"
  | "is_empty" | "is_not_empty"
  | "gt" | "gte" | "lt" | "lte";

export type FilterCondition = {
  id: string;
  columnId: string;
  op: FilterOp;
  value: string;
};

export type SortRule = {
  id: string;
  columnId: string;
  dir: "asc" | "desc";
};

export type GroupRule = {
  id: string;
  columnId: string;
  dir: "asc" | "desc";
};

export type RowHeight = "short" | "medium" | "tall" | "extra-tall";

export const ROW_HEIGHT_PX: Record<RowHeight, number> = {
  short:       30,
  medium:      40,
  tall:        64,
  "extra-tall": 96,
};

// ── Filter operators metadata ─────────────────────────────────────────────────

export const FILTER_OPS: Record<FilterOp, { label: string; needsValue: boolean }> = {
  contains:         { label: "contains",         needsValue: true  },
  does_not_contain: { label: "does not contain", needsValue: true  },
  equals:           { label: "equals",           needsValue: true  },
  not_equals:       { label: "not equals",       needsValue: true  },
  is_empty:         { label: "is empty",         needsValue: false },
  is_not_empty:     { label: "is not empty",     needsValue: false },
  gt:               { label: ">",                needsValue: true  },
  gte:              { label: ">=",               needsValue: true  },
  lt:               { label: "<",                needsValue: true  },
  lte:              { label: "<=",               needsValue: true  },
};

// ── Filtering ─────────────────────────────────────────────────────────────────

export function applyFilters(
  rows: RowWithCells[],
  filters: FilterCondition[],
): RowWithCells[] {
  if (!filters.length) return rows;
  return rows.filter((row) =>
    filters.every((f) => {
      const v  = getCellValue(row, f.columnId).toLowerCase().trim();
      const fv = f.value.toLowerCase().trim();
      switch (f.op) {
        case "contains":         return v.includes(fv);
        case "does_not_contain": return !v.includes(fv);
        case "equals":           return v === fv;
        case "not_equals":       return v !== fv;
        case "is_empty":         return !v;
        case "is_not_empty":     return !!v;
        case "gt":               return parseFloat(v) >  parseFloat(fv);
        case "gte":              return parseFloat(v) >= parseFloat(fv);
        case "lt":               return parseFloat(v) <  parseFloat(fv);
        case "lte":              return parseFloat(v) <= parseFloat(fv);
        default:                 return true;
      }
    }),
  );
}

// ── Sorting (multi-field) ─────────────────────────────────────────────────────

export function applySorts(
  rows: RowWithCells[],
  sorts: SortRule[],
  columns: ColumnLike[],
): RowWithCells[] {
  if (!sorts.length) return rows;
  const colMap = new Map(columns.map((c) => [c.id, c]));
  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const col = colMap.get(sort.columnId);
      if (!col) continue;
      const av    = getCellValue(a, sort.columnId);
      const bv    = getCellValue(b, sort.columnId);
      const isNum = ["NUMBER", "CURRENCY", "PERCENT", "RATING"].includes(col.type);
      const cmp   = isNum
        ? (parseFloat(av) || 0) - (parseFloat(bv) || 0)
        : av.localeCompare(bv);
      if (cmp !== 0) return sort.dir === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

/** Legacy single-sort helper — kept for backward compat */
export function sortRows(
  rows: RowWithCells[],
  sort: { columnId: string; dir: "asc" | "desc" } | null,
  columns: ColumnLike[],
): RowWithCells[] {
  if (!sort) return rows;
  return applySorts(rows, [{ id: "legacy", ...sort }], columns);
}

// ── Grouping (multi-level nested) ─────────────────────────────────────────────

export type GroupNode = {
  key:       string;           // unique React key
  value:     string;           // display label
  columnId:  string;
  depth:     number;           // -1 = ungrouped root (no header)
  rows:      RowWithCells[];   // leaf rows (only set at deepest level)
  subgroups: GroupNode[];
};

function buildGroupTree(
  items: RowWithCells[],
  rules: GroupRule[],
  depth: number,
  parentKey: string,
): GroupNode[] {
  const rule = rules[depth]!;
  const map  = new Map<string, RowWithCells[]>();
  for (const row of items) {
    const val = getCellValue(row, rule.columnId) || "—";
    if (!map.has(val)) map.set(val, []);
    map.get(val)!.push(row);
  }
  const sorted = [...map.entries()].sort(([a], [b]) =>
    rule.dir === "asc" ? a.localeCompare(b) : b.localeCompare(a),
  );
  const isLeaf = depth === rules.length - 1;
  return sorted.map(([value, groupRows]) => {
    const key = `${parentKey}::${value}`;
    return {
      key,
      value,
      columnId: rule.columnId,
      depth,
      rows:      isLeaf ? groupRows : [],
      subgroups: isLeaf ? [] : buildGroupTree(groupRows, rules, depth + 1, key),
    };
  });
}

export function applyGroups(
  rows: RowWithCells[],
  groups: GroupRule[],
): GroupNode[] {
  if (!groups.length) {
    return [{ key: "__all__", value: "", columnId: "", depth: -1, rows, subgroups: [] }];
  }
  return buildGroupTree(rows, groups, 0, "root");
}

/** Flatten a GroupNode tree into a flat renderable list */
export type FlatItem =
  | { kind: "group"; node: GroupNode; totalRows: number }
  | { kind: "row";   row: RowWithCells };

function totalRowsIn(node: GroupNode): number {
  if (node.subgroups.length) return node.subgroups.reduce((s, n) => s + totalRowsIn(n), 0);
  return node.rows.length;
}

export function flattenGroupTree(nodes: GroupNode[]): FlatItem[] {
  const result: FlatItem[] = [];
  for (const node of nodes) {
    // depth >= 0 means it's a real group that needs a header row
    if (node.depth >= 0) {
      result.push({ kind: "group", node, totalRows: totalRowsIn(node) });
    }
    if (node.subgroups.length) {
      result.push(...flattenGroupTree(node.subgroups));
    } else {
      for (const row of node.rows) {
        result.push({ kind: "row", row });
      }
    }
  }
  return result;
}

// ── Legacy groupRows (kept for KanbanView) ────────────────────────────────────

export type GroupedRows = { value: string; rows: RowWithCells[] }[];

export function groupRows(rows: RowWithCells[], groupColId: string | null): GroupedRows {
  if (!groupColId) return [{ value: "", rows }];
  const map = new Map<string, RowWithCells[]>();
  for (const row of rows) {
    const key = getCellValue(row, groupColId) || "—";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return Array.from(map.entries()).map(([value, rows]) => ({ value, rows }));
}

// ── Kanban helpers ────────────────────────────────────────────────────────────

export function resolveGroupColumn(
  columns: ColumnLike[],
  groupByColumnId?: string | null,
): ColumnLike | undefined {
  if (groupByColumnId) return columns.find((c) => c.id === groupByColumnId);
  return (
    columns.find((c) => c.name.toLowerCase() === "status") ??
    columns.find((c) => ["TEXT", "LONG_TEXT", "USER", "SINGLE_SELECT"].includes(c.type))
  );
}

export function resolveNameColumn(columns: ColumnLike[]): ColumnLike | undefined {
  return columns.find((c) => c.name.toLowerCase() === "name") ?? columns[0];
}
